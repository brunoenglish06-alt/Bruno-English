import { Deliverable, Task, TaskStatus, RepeatTaskOptions, UserSettings } from '../types';
import { generateProductionPlan } from './scheduler';
import { getTodayISO, addDays, getDiffInDays } from './dateUtils';

export interface DeliverablesSummary {
  total: number;
  completed: number;
  inProduction: number;
  awaitingApproval: number;
  todo: number;
  progressPercent: number;
  summaryText: string;
  allCompleted: boolean;
}

/**
 * Calculates progress and status metrics for deliverables of a task
 */
export function calculateDeliverablesProgress(
  deliverables?: Deliverable[]
): DeliverablesSummary {
  if (!deliverables || deliverables.length === 0) {
    return {
      total: 0,
      completed: 0,
      inProduction: 0,
      awaitingApproval: 0,
      todo: 0,
      progressPercent: 0,
      summaryText: '0 entregáveis',
      allCompleted: false
    };
  }

  const total = deliverables.length;
  let completed = 0;
  let inProduction = 0;
  let awaitingApproval = 0;
  let todo = 0;

  for (const d of deliverables) {
    if (d.completed || d.status === 'delivered' || d.status === 'finalized' || d.status === 'approved') {
      completed++;
    } else if (d.status === 'in_production' || d.status === 'in_review' || d.status === 'in_adjustments') {
      inProduction++;
    } else if (d.status === 'awaiting_approval' || d.status === 'sent_for_approval') {
      awaitingApproval++;
    } else {
      todo++;
    }
  }

  const progressPercent = Math.round((completed / total) * 100);
  const allCompleted = completed === total && total > 0;

  let summaryParts: string[] = [];
  if (completed > 0) summaryParts.push(`${completed} concluído${completed > 1 ? 's' : ''}`);
  if (inProduction > 0) summaryParts.push(`${inProduction} em produção`);
  if (awaitingApproval > 0) summaryParts.push(`${awaitingApproval} em aprovação`);
  if (todo > 0) summaryParts.push(`${todo} a fazer`);

  return {
    total,
    completed,
    inProduction,
    awaitingApproval,
    todo,
    progressPercent,
    summaryText: summaryParts.join(' · ') || `${total} entregáveis`,
    allCompleted
  };
}

/**
 * Returns all unique assignees involved in a task (main assignee + deliverable assignees + collaborators)
 */
export function getAllTaskAssignees(task: Task): string[] {
  const set = new Set<string>();
  if (task.assignee?.trim()) set.add(task.assignee.trim());
  if (task.deliverables) {
    for (const d of task.deliverables) {
      if (d.assignee?.trim()) set.add(d.assignee.trim());
    }
  }
  if (task.collaborators) {
    for (const c of task.collaborators) {
      if (c?.trim()) set.add(c.trim());
    }
  }
  return Array.from(set);
}

/**
 * Check if a task has pending mandatory deliverables
 */
export function hasPendingDeliverables(task: Task): boolean {
  if (!task.deliverables || task.deliverables.length === 0) return false;
  return task.deliverables.some(
    (d) => !d.completed && d.status !== 'delivered' && d.status !== 'finalized' && d.status !== 'approved'
  );
}

/**
 * Deliverables presets to quickly populate multi-work demands
 */
export interface DeliverablePreset {
  id: string;
  name: string;
  description: string;
  items: Array<{
    title: string;
    specialty: string;
    category: string;
    estimatedHours: number;
    estimatedAdjustmentHours?: number;
    description?: string;
  }>;
}

export const DELIVERABLE_PRESETS: DeliverablePreset[] = [
  {
    id: 'campaign-instagram',
    name: 'Campanha de Conteúdo (Carrossel + Story + Reels)',
    description: 'Pacote padrão para campanhas de Instagram com formatos combinados',
    items: [
      {
        title: 'Carrossel Educativo',
        specialty: 'Designer de Carrossel',
        category: 'design',
        estimatedHours: 2,
        estimatedAdjustmentHours: 0.5,
        description: 'Estruturação do roteiro em slides (1080x1350) com gancho e CTA'
      },
      {
        title: 'Stories Promocionais',
        specialty: 'Designer de Stories',
        category: 'design',
        estimatedHours: 1,
        estimatedAdjustmentHours: 0.5,
        description: 'Sequência de 3 a 5 stories verticais interativos com enquetes/links'
      },
      {
        title: 'Edição de Reels',
        specialty: 'Editor de Reels',
        category: 'video',
        estimatedHours: 2,
        estimatedAdjustmentHours: 1,
        description: 'Cortes dinâmicos, transições, legendas estilizadas e trilha em alta'
      }
    ]
  },
  {
    id: 'launch-digital',
    name: 'Lançamento Digital / Promoção',
    description: 'Kit para lançamentos: Key Visual, Stories, Anúncios de Tráfego e Capas',
    items: [
      {
        title: 'Key Visual & Anúncios de Tráfego',
        specialty: 'Designer de Anúncios',
        category: 'design',
        estimatedHours: 2.5,
        estimatedAdjustmentHours: 1,
        description: 'Artes de alta conversão para Meta Ads e Google Ads'
      },
      {
        title: 'Stories de Aquecimento e Vendas',
        specialty: 'Designer de Stories',
        category: 'design',
        estimatedHours: 1.5,
        estimatedAdjustmentHours: 0.5,
        description: 'Sequência para contagem regressiva e abertura de carrinho'
      },
      {
        title: 'Edição de Vídeos Curtos (Shorts/Reels)',
        specialty: 'Editor de Shorts',
        category: 'video',
        estimatedHours: 2,
        estimatedAdjustmentHours: 0.5,
        description: 'Pílulas em vídeo com depoimentos e demonstração do produto'
      },
      {
        title: 'Copy & Legendas',
        specialty: 'Copywriter',
        category: 'social_media',
        estimatedHours: 1,
        estimatedAdjustmentHours: 0.5,
        description: 'Textos persuasivos com gatilhos mentais para as publicações'
      }
    ]
  },
  {
    id: 'video-package',
    name: 'Pacote Audiovisual Completo',
    description: 'Edição de vídeo, vinheta em motion, correção de cor e legendas',
    items: [
      {
        title: 'Edição do Vídeo Principal',
        specialty: 'Editor de Vídeo',
        category: 'video',
        estimatedHours: 3,
        estimatedAdjustmentHours: 1,
        description: 'Montagem completa, corte de silêncios e narrativa fluida'
      },
      {
        title: 'Motion Design & Vinheta',
        specialty: 'Motion Designer',
        category: 'video',
        estimatedHours: 2,
        estimatedAdjustmentHours: 0.5,
        description: 'Lettering animado, selos e elementos visuais de marca'
      },
      {
        title: 'Legendas Estilizadas & Áudio',
        specialty: 'Editor de Legendas',
        category: 'video',
        estimatedHours: 1,
        estimatedAdjustmentHours: 0.5,
        description: 'Sincronização de legendas dinâmicas e equalização sonora'
      }
    ]
  },
  {
    id: 'social-media-weekly',
    name: 'Grade Semanal de Social Media',
    description: 'Planejamento, artes de feed, stories e agendamento',
    items: [
      {
        title: 'Planejamento & Roteiros',
        specialty: 'Planejamento de Conteúdo',
        category: 'social_media',
        estimatedHours: 1.5,
        estimatedAdjustmentHours: 0.5,
        description: 'Definição de temas, datas e objetivos estratégicos da semana'
      },
      {
        title: 'Artes Estáticas e Carrosséis de Feed',
        specialty: 'Designer de Feed',
        category: 'design',
        estimatedHours: 3,
        estimatedAdjustmentHours: 1,
        description: 'Criação dos posts da semana para o feed do cliente'
      },
      {
        title: 'Revisão de Conteúdo e Ortografia',
        specialty: 'Revisão de Conteúdo',
        category: 'social_media',
        estimatedHours: 1,
        estimatedAdjustmentHours: 0.5,
        description: 'Checagem rigorosa de texto, tom de voz e coerência da marca'
      }
    ]
  }
];

/**
 * Creates a duplicate/repeat instance of an existing task for a new deadline cycle,
 * recalculating intelligent production stages and resetting deliverables.
 */
export function createRepeatedTask(
  sourceTask: Task,
  options: RepeatTaskOptions,
  existingTasks: Task[],
  settings: UserSettings
): Task {
  const newTaskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const today = getTodayISO();
  const newDeadlineDate = options.newDeadlineDate;
  const newDeadlineTime = options.newDeadlineTime || sourceTask.deadlineTime || '18:00';
  const newStartDate = options.newStartDate || today;

  // Clone deliverables and reset them for the new cycle
  let newDeliverables: Deliverable[] | undefined = undefined;
  if (sourceTask.deliverables && sourceTask.deliverables.length > 0) {
    newDeliverables = sourceTask.deliverables.map((d, index) => {
      const newDelivId = `deliv-${Date.now()}-${index}`;
      let newDelivDeadline = newDeadlineDate;
      // Maintain relative deadline offset if deliverable was due earlier than main task
      if (d.deadlineDate && d.deadlineDate !== sourceTask.deadlineDate) {
        const offset = getDiffInDays(d.deadlineDate, sourceTask.deadlineDate);
        newDelivDeadline = addDays(newDeadlineDate, -offset);
        if (newDelivDeadline < today) newDelivDeadline = today;
      }

      return {
        ...d,
        id: newDelivId,
        taskId: newTaskId,
        status: options.resetDeliverablesStatus !== false ? ('todo' as TaskStatus) : d.status,
        completed: options.resetDeliverablesStatus !== false ? false : d.completed,
        deadlineDate: newDelivDeadline,
        deadlineTime: d.deadlineTime || newDeadlineTime
      };
    });
  }

  // Clone subtasks and reset completion
  let newSubtasks = undefined;
  if (sourceTask.subtasks && sourceTask.subtasks.length > 0) {
    newSubtasks = sourceTask.subtasks.map((s, idx) => ({
      ...s,
      id: `sub-${Date.now()}-${idx}`,
      completed: false
    }));
  }

  // Adjust approval deadline if needed
  let newApprovalDeadlineDate = undefined;
  if (sourceTask.requiresApproval) {
    if (sourceTask.approvalDeadlineDate) {
      const approvalOffset = getDiffInDays(sourceTask.approvalDeadlineDate, sourceTask.deadlineDate);
      newApprovalDeadlineDate = addDays(newDeadlineDate, -Math.max(1, approvalOffset));
      if (newApprovalDeadlineDate < today) newApprovalDeadlineDate = today;
    } else {
      newApprovalDeadlineDate = addDays(newDeadlineDate, -1);
      if (newApprovalDeadlineDate < today) newApprovalDeadlineDate = today;
    }
  }

  const draft: Partial<Task> = {
    id: newTaskId,
    title: options.newTitle?.trim() || `${sourceTask.title} (Novo Ciclo)`,
    client: sourceTask.client,
    project: sourceTask.project,
    groupId: sourceTask.groupId,
    type: sourceTask.type,
    category: sourceTask.category,
    specialty: sourceTask.specialty,
    collaborators: sourceTask.collaborators ? [...sourceTask.collaborators] : [],
    description: sourceTask.description,
    startDate: newStartDate,
    deadlineDate: newDeadlineDate,
    deadlineTime: newDeadlineTime,
    requiresApproval: sourceTask.requiresApproval,
    approvalDeadlineDate: newApprovalDeadlineDate,
    approvalDeadlineTime: sourceTask.approvalDeadlineTime || '12:00',
    estimatedProductionHours: sourceTask.estimatedProductionHours,
    estimatedAdjustmentHours: sourceTask.estimatedAdjustmentHours,
    priority: sourceTask.priority,
    assignee: sourceTask.assignee,
    status: 'todo',
    safetyMargin: sourceTask.safetyMargin,
    customSafetyMarginHours: sourceTask.customSafetyMarginHours,
    recurrence: options.recurrence || sourceTask.recurrence || 'none',
    repeatedFromTaskId: sourceTask.id,
    deliverables: newDeliverables,
    subtasks: newSubtasks,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stages: []
  };

  // Generate intelligent production plan for the new deadline
  const plan = generateProductionPlan(draft, existingTasks, settings);
  draft.stages = plan.stages;
  draft.riskLevel = plan.riskLevel;
  draft.riskExplanation = plan.riskExplanation;

  return draft as Task;
}

