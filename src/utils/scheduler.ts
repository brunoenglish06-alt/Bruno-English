import {
  Task,
  TaskStage,
  UserSettings,
  RiskLevel,
  SafetyMarginOption,
  StageType
} from '../types';
import {
  parseDate,
  formatDateISO,
  getTodayISO,
  addDays,
  subtractWorkingDays,
  addWorkingDays,
  isWorkingDay,
  timeToMinutes,
  minutesToTime,
  getDiffInDays
} from './dateUtils';

export interface PlanProposal {
  stages: TaskStage[];
  riskLevel: RiskLevel;
  riskExplanation: string;
  recommendedStartDate: string;
  recommendedStartTime: string;
  canMeetDeadline: boolean;
  conflictsFound: number;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  workDays: [1, 2, 3, 4, 5], // Mon to Fri
  workStartHour: 9,
  workEndHour: 18,
  lunchStartHour: 12,
  lunchEndHour: 13,
  defaultSafetyMargin: '1_day',
  customSafetyMarginDays: 1,
  maxDailyProductionHours: 6.5,
  clientReviewTurnaroundHours: 24
};

/**
 * Calculates safety margin in days based on setting
 */
export function getMarginDays(margin: SafetyMarginOption, customDays: number = 1): number {
  switch (margin) {
    case 'none':
      return 0;
    case '1_day':
      return 1;
    case '2_days':
      return 2;
    case '3_days':
      return 3;
    case 'custom':
      return Math.max(0, customDays);
    default:
      return 1;
  }
}

/**
 * Given all existing tasks, find total occupied minutes on a specific day
 */
export function getDayOccupiedMinutes(
  dateStr: string,
  existingTasks: Task[],
  excludeTaskId?: string
): { start: number; end: number; title: string }[] {
  const intervals: { start: number; end: number; title: string }[] = [];

  for (const task of existingTasks) {
    if (task.id === excludeTaskId || task.status === 'delivered') continue;
    for (const stage of task.stages) {
      if (stage.date === dateStr && !stage.completed) {
        intervals.push({
          start: timeToMinutes(stage.startTime),
          end: timeToMinutes(stage.endTime),
          title: `${task.client}: ${stage.title}`
        });
      }
    }
  }

  return intervals.sort((a, b) => a.start - b.start);
}

/**
 * Finds available time slot on a specific day
 */
export function findFreeSlotOnDay(
  dateStr: string,
  durationMinutes: number,
  settings: UserSettings,
  existingTasks: Task[],
  preferredStartMinutes?: number,
  excludeTaskId?: string
): { startTime: string; endTime: string } | null {
  const workStart = settings.workStartHour * 60;
  const workEnd = settings.workEndHour * 60;
  const lunchStart = settings.lunchStartHour * 60;
  const lunchEnd = settings.lunchEndHour * 60;

  // Work blocks: morning and afternoon
  const morningAvailable = { start: workStart, end: lunchStart };
  const afternoonAvailable = { start: lunchEnd, end: workEnd };

  const occupied = getDayOccupiedMinutes(dateStr, existingTasks, excludeTaskId);

  // Helper to test if a sub-range [s, e] is free
  const isFree = (s: number, e: number): boolean => {
    // Cannot overlap with lunch
    if (s < lunchEnd && e > lunchStart) return false;
    // Must be within work hours
    if (s < workStart || e > workEnd) return false;
    // Must not overlap any occupied slot
    for (const occ of occupied) {
      if (Math.max(s, occ.start) < Math.min(e, occ.end)) {
        return false;
      }
    }
    return true;
  };

  // 1. Try preferred time if given
  if (preferredStartMinutes !== undefined) {
    const candidateEnd = preferredStartMinutes + durationMinutes;
    if (isFree(preferredStartMinutes, candidateEnd)) {
      return {
        startTime: minutesToTime(preferredStartMinutes),
        endTime: minutesToTime(candidateEnd)
      };
    }
  }

  // 2. Try slots in morning block
  for (let t = morningAvailable.start; t + durationMinutes <= morningAvailable.end; t += 30) {
    if (isFree(t, t + durationMinutes)) {
      return {
        startTime: minutesToTime(t),
        endTime: minutesToTime(t + durationMinutes)
      };
    }
  }

  // 3. Try slots in afternoon block
  for (let t = afternoonAvailable.start; t + durationMinutes <= afternoonAvailable.end; t += 30) {
    if (isFree(t, t + durationMinutes)) {
      return {
        startTime: minutesToTime(t),
        endTime: minutesToTime(t + durationMinutes)
      };
    }
  }

  return null;
}

/**
 * Intelligent Backward Production Planner
 * Calculates the exact workflow stages based on deadline, margin, approval requirement and existing schedule.
 */
export function generateProductionPlan(
  taskDraft: Partial<Task>,
  existingTasks: Task[] = [],
  settings: UserSettings = DEFAULT_USER_SETTINGS
): PlanProposal {
  const today = getTodayISO();
  const deadlineDate = taskDraft.deadlineDate || addDays(today, 5);
  const deadlineTime = taskDraft.deadlineTime || '18:00';
  const productionHours = Math.max(0.5, taskDraft.estimatedProductionHours || 2);
  const adjustmentHours = Math.max(0.5, taskDraft.estimatedAdjustmentHours || 1);
  const requiresApproval = taskDraft.requiresApproval ?? true;
  const safetyMargin = taskDraft.safetyMargin || settings.defaultSafetyMargin;
  const customMarginDays = taskDraft.customSafetyMarginHours
    ? taskDraft.customSafetyMarginHours / 24
    : settings.customSafetyMarginDays;
  const marginDays = getMarginDays(safetyMargin, customMarginDays);

  const stages: TaskStage[] = [];
  const taskId = taskDraft.id || 'draft-task';

  // 1. ENTREGA FINAL
  stages.push({
    id: `${taskId}-delivery`,
    taskId,
    type: 'delivery',
    title: 'Entrega Final',
    date: deadlineDate,
    startTime: deadlineTime,
    endTime: minutesToTime(timeToMinutes(deadlineTime) + 15),
    durationMinutes: 15,
    completed: false,
    notes: 'Envio dos arquivos finais e encerramento da demanda.'
  });

  // 2. Target Ready Date (taking margin into account)
  // We strive to have the material fully ready BEFORE the delivery date!
  let readyTargetDate = deadlineDate;
  if (marginDays > 0) {
    readyTargetDate = subtractWorkingDays(deadlineDate, marginDays, settings.workDays);
    // If margin pushes it into the past, cap to today or minimum feasible
    if (readyTargetDate < today) {
      readyTargetDate = today;
    }
  }

  // Final check stage (Conferência / Finalização): on readyTargetDate
  const finalCheckDuration = 30; // 30 min
  const finalCheckSlot = findFreeSlotOnDay(
    readyTargetDate,
    finalCheckDuration,
    settings,
    existingTasks,
    10 * 60, // Preferred 10:00
    taskId
  ) || {
    startTime: '10:00',
    endTime: '10:30'
  };

  stages.push({
    id: `${taskId}-finalization`,
    taskId,
    type: 'finalization',
    title: 'Conferência e Finalização',
    date: readyTargetDate,
    startTime: finalCheckSlot.startTime,
    endTime: finalCheckSlot.endTime,
    durationMinutes: finalCheckDuration,
    completed: false,
    notes: 'Verificação técnica de formatos, links, áudio/cores e exportação final.'
  });

  if (requiresApproval) {
    // 3. AJUSTES (Realizar ajustes conforme feedback)
    // Needs to happen after client feedback, but before finalization
    let adjustmentDate = readyTargetDate;
    // If possible, place adjustments on the day before finalization or morning of readyTargetDate
    const candidateAdjDate = subtractWorkingDays(readyTargetDate, 1, settings.workDays);
    if (candidateAdjDate >= today) {
      adjustmentDate = candidateAdjDate;
    }

    const adjMinutes = Math.round(adjustmentHours * 60);
    const adjSlot = findFreeSlotOnDay(
      adjustmentDate,
      adjMinutes,
      settings,
      existingTasks,
      14 * 60, // Preferred 14:00
      taskId
    ) || {
      startTime: '14:00',
      endTime: minutesToTime(14 * 60 + adjMinutes)
    };

    stages.push({
      id: `${taskId}-adjustments`,
      taskId,
      type: 'adjustments',
      title: 'Ajustes conforme Feedback',
      date: adjustmentDate,
      startTime: adjSlot.startTime,
      endTime: adjSlot.endTime,
      durationMinutes: adjMinutes,
      completed: false,
      notes: `Reserva preventiva de ${adjustmentHours}h para correções do cliente.`
    });

    // 4. AGUARDANDO APROVAÇÃO (Janela de análise do cliente)
    // Placed before adjustments
    let approvalDate = taskDraft.approvalDeadlineDate;
    if (!approvalDate) {
      // Typically 1-2 working days before adjustments
      approvalDate = subtractWorkingDays(adjustmentDate, 1, settings.workDays);
      if (approvalDate < today) {
        approvalDate = today;
      }
    }

    stages.push({
      id: `${taskId}-awaiting-approval`,
      taskId,
      type: 'awaiting_approval',
      title: 'Aguardando Retorno do Cliente',
      date: approvalDate,
      startTime: '10:00',
      endTime: '18:00',
      durationMinutes: 480,
      completed: false,
      notes: 'Janela dedicada para o cliente validar o material.'
    });

    // 5. ENVIO PARA APROVAÇÃO
    // Same day early morning or day before
    const sendSlot = findFreeSlotOnDay(
      approvalDate,
      30,
      settings,
      existingTasks,
      9 * 60 + 30, // 09:30
      taskId
    ) || {
      startTime: '09:30',
      endTime: '10:00'
    };

    stages.push({
      id: `${taskId}-send-approval`,
      taskId,
      type: 'send_approval',
      title: 'Enviar para Aprovação',
      date: approvalDate,
      startTime: sendSlot.startTime,
      endTime: sendSlot.endTime,
      durationMinutes: 30,
      completed: false,
      notes: 'Apresentar prévia com link ou anexo ao cliente.'
    });

    // 6. REVISÃO INTERNA
    let reviewDate = subtractWorkingDays(approvalDate, 1, settings.workDays);
    if (reviewDate < today) reviewDate = today;

    const reviewSlot = findFreeSlotOnDay(
      reviewDate,
      30,
      settings,
      existingTasks,
      16 * 60, // 16:00
      taskId
    ) || {
      startTime: '16:00',
      endTime: '16:30'
    };

    stages.push({
      id: `${taskId}-review`,
      taskId,
      type: 'review',
      title: 'Revisão Interna de Qualidade',
      date: reviewDate,
      startTime: reviewSlot.startTime,
      endTime: reviewSlot.endTime,
      durationMinutes: 30,
      completed: false,
      notes: 'Checagem de erros de digitação, grid, alinhamento e cortes.'
    });

    // 7. PRODUÇÃO PRINCIPAL
    // Placed before internal review
    let productionDate = subtractWorkingDays(reviewDate, 1, settings.workDays);
    if (productionDate < today) productionDate = today;

    const prodMinutes = Math.round(productionHours * 60);
    const prodSlot = findFreeSlotOnDay(
      productionDate,
      prodMinutes,
      settings,
      existingTasks,
      14 * 60, // 14:00
      taskId
    ) || {
      startTime: '14:00',
      endTime: minutesToTime(14 * 60 + prodMinutes)
    };

    stages.push({
      id: `${taskId}-production`,
      taskId,
      type: 'production',
      title: `Produzir ${taskDraft.title || 'Demanda'}`,
      date: productionDate,
      startTime: prodSlot.startTime,
      endTime: prodSlot.endTime,
      durationMinutes: prodMinutes,
      completed: false,
      notes: `Foco total na criação (${productionHours}h estimadas).`
    });
  } else {
    // Sem necessidade de aprovação externa
    // Revisão interna 1 dia antes da entrega
    let reviewDate = subtractWorkingDays(readyTargetDate, 1, settings.workDays);
    if (reviewDate < today) reviewDate = today;

    const reviewSlot = findFreeSlotOnDay(
      reviewDate,
      30,
      settings,
      existingTasks,
      16 * 60,
      taskId
    ) || {
      startTime: '16:00',
      endTime: '16:30'
    };

    stages.push({
      id: `${taskId}-review`,
      taskId,
      type: 'review',
      title: 'Revisão Interna',
      date: reviewDate,
      startTime: reviewSlot.startTime,
      endTime: reviewSlot.endTime,
      durationMinutes: 30,
      completed: false,
      notes: 'Revisão técnica antes da finalização.'
    });

    // Produção
    let productionDate = subtractWorkingDays(reviewDate, 1, settings.workDays);
    if (productionDate < today) productionDate = today;

    const prodMinutes = Math.round(productionHours * 60);
    const prodSlot = findFreeSlotOnDay(
      productionDate,
      prodMinutes,
      settings,
      existingTasks,
      14 * 60,
      taskId
    ) || {
      startTime: '14:00',
      endTime: minutesToTime(14 * 60 + prodMinutes)
    };

    stages.push({
      id: `${taskId}-production`,
      taskId,
      type: 'production',
      title: `Produzir ${taskDraft.title || 'Demanda'}`,
      date: productionDate,
      startTime: prodSlot.startTime,
      endTime: prodSlot.endTime,
      durationMinutes: prodMinutes,
      completed: false,
      notes: `Execução da demanda (${productionHours}h).`
    });
  }

  // Sort stages chronologically (Date + Start Time)
  stages.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  // Calculate Risk Level & Explanation
  const firstStage = stages[0];
  const daysUntilDeadline = getDiffInDays(today, deadlineDate);
  const totalRequiredHours = productionHours + (requiresApproval ? adjustmentHours : 0) + 1; // +1h for reviews

  let riskLevel: RiskLevel = 'low';
  let riskExplanation = 'Cronograma seguro com margem de folga preservada.';
  let canMeetDeadline = true;

  if (daysUntilDeadline < 0) {
    riskLevel = 'critical';
    riskExplanation = 'O prazo final já expirou! Ação emergencial necessária.';
    canMeetDeadline = false;
  } else if (firstStage && firstStage.date < today) {
    riskLevel = 'critical';
    riskExplanation = `Para cumprir o prazo com aprovação, a produção precisaria ter iniciado em ${firstStage.date}. Replanejamento urgente necessário.`;
    canMeetDeadline = false;
  } else if (firstStage && firstStage.date === today) {
    if (daysUntilDeadline <= 1) {
      riskLevel = 'high';
      riskExplanation = 'Esta tarefa possui risco de atraso alto. É obrigatório iniciar hoje para cumprir o prazo.';
    } else {
      riskLevel = 'medium';
      riskExplanation = 'Início recomendado para hoje para manter a margem de segurança intacta.';
    }
  } else if (daysUntilDeadline <= 2 && totalRequiredHours > 4) {
    riskLevel = 'high';
    riskExplanation = `Prazo apertado (${daysUntilDeadline} dias) para uma demanda de ${totalRequiredHours}h de produção e ajustes.`;
  }

  // Check if target production day has other heavy tasks
  let conflictsFound = 0;
  for (const s of stages) {
    const occ = getDayOccupiedMinutes(s.date, existingTasks, taskId);
    const dayTotalMin = occ.reduce((acc, cur) => acc + (cur.end - cur.start), 0);
    if (dayTotalMin / 60 > settings.maxDailyProductionHours) {
      conflictsFound++;
      if (riskLevel === 'low') {
        riskLevel = 'medium';
        riskExplanation = `Atenção: sua agenda no dia ${s.date} já possui alta carga de trabalho (${(dayTotalMin / 60).toFixed(1)}h programadas).`;
      }
    }
  }

  return {
    stages,
    riskLevel,
    riskExplanation,
    recommendedStartDate: firstStage ? firstStage.date : today,
    recommendedStartTime: firstStage ? firstStage.startTime : '09:00',
    canMeetDeadline,
    conflictsFound
  };
}

/**
 * Reschedules a task when a stage wasn't completed on time
 * Automatically adjusts the next steps starting from today or next morning.
 */
export function rescheduleTask(
  task: Task,
  existingTasks: Task[],
  settings: UserSettings = DEFAULT_USER_SETTINGS
): {
  updatedTask: Task;
  previousSchedule: TaskStage[];
  riskExplanation: string;
  isFeasible: boolean;
} {
  const previousSchedule = [...task.stages];
  const today = getTodayISO();

  // Find uncompleted stages
  const pendingStages = task.stages.filter((s) => !s.completed);
  if (pendingStages.length === 0) {
    return {
      updatedTask: task,
      previousSchedule,
      riskExplanation: 'Todas as etapas já foram concluídas.',
      isFeasible: true
    };
  }

  // Regenerate plan considering the current moment
  const newPlan = generateProductionPlan(
    {
      ...task,
      startDate: today
    },
    existingTasks.filter((t) => t.id !== task.id),
    settings
  );

  // Preserve completed status for stages that were already done
  const completedIds = new Set(task.stages.filter((s) => s.completed).map((s) => s.type));
  const mergedStages = newPlan.stages.map((st) => ({
    ...st,
    completed: completedIds.has(st.type)
  }));

  const updatedTask: Task = {
    ...task,
    stages: mergedStages,
    riskLevel: newPlan.riskLevel,
    riskExplanation: newPlan.riskExplanation,
    updatedAt: new Date().toISOString()
  };

  return {
    updatedTask,
    previousSchedule,
    riskExplanation: newPlan.riskExplanation,
    isFeasible: newPlan.canMeetDeadline
  };
}
