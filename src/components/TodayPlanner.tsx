import React from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Check,
  Flame
} from 'lucide-react';
import { Task, TaskStage, UserSettings } from '../types';
import {
  getTodayISO,
  formatHours,
  getDayOfWeekName,
  formatFullDate,
  timeToMinutes
} from '../utils/dateUtils';
import { STAGE_TYPE_CONFIG } from '../utils/statusConfig';

interface TodayPlannerProps {
  tasks: Task[];
  settings: UserSettings;
  onToggleStageCompleted: (taskId: string, stageId: string) => void;
  onOpenReschedule: (task: Task) => void;
  onSelectTask: (task: Task) => void;
  onOpenGoogleCalendar?: () => void;
  isGoogleConnected?: boolean;
}

interface TodayItem {
  stage: TaskStage;
  task: Task;
}

export const TodayPlanner: React.FC<TodayPlannerProps> = ({
  tasks,
  settings,
  onToggleStageCompleted,
  onOpenReschedule,
  onSelectTask,
  onOpenGoogleCalendar,
  isGoogleConnected = false
}) => {
  const today = getTodayISO();
  const dayName = getDayOfWeekName(today).toUpperCase();

  // Deduplicate tasks by task.id
  const uniqueTasks = React.useMemo(() => {
    const seen = new Set<string>();
    return tasks.filter((t) => {
      if (!t?.id || seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [tasks]);

  // Find all stages that fall on today
  const todayItems: TodayItem[] = [];
  for (const task of uniqueTasks) {
    if (task.status === 'delivered') continue;
    for (const stage of task.stages) {
      if (stage.date === today) {
        todayItems.push({ stage, task });
      }
    }
  }

  // Sort by start time
  todayItems.sort((a, b) => timeToMinutes(a.stage.startTime) - timeToMinutes(b.stage.startTime));

  // Compute total planned hours today
  const totalMinutes = todayItems.reduce((acc, item) => acc + item.stage.durationMinutes, 0);
  const totalHours = totalMinutes / 60;
  const completedCount = todayItems.filter((i) => i.stage.completed).length;

  // Find dynamic ATENÇÃO notices
  const warnings: { text: string; task: Task }[] = [];
  for (const task of tasks) {
    if (task.status === 'delivered' || task.status === 'finalized') continue;

    // Check if task needs approval soon
    if (task.requiresApproval && task.status === 'awaiting_approval') {
      warnings.push({
        text: `A demanda "${task.title}" (${task.client}) precisa ser aprovada até amanhã para conseguir cumprir o prazo de entrega em ${task.deadlineDate}.`,
        task
      });
    } else if (task.riskLevel === 'high' || task.riskLevel === 'critical') {
      warnings.push({
        text: task.riskExplanation || `Atenção: "${task.title}" possui risco elevado de atraso. Inicie hoje!`,
        task
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#FAF7F2] p-6 rounded-2xl border border-[#EDE4DA] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[#6A3102] tracking-wider uppercase flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span>O que preciso fazer hoje?</span>
          </span>
          <h1 className="text-2xl font-bold font-display text-[#231815]">
            HOJE — {dayName}
          </h1>
          <p className="text-xs text-[#73645B] mt-0.5">
            {formatFullDate(today)} · {todayItems.length} etapa{todayItems.length !== 1 ? 's' : ''} programada{todayItems.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-xl bg-white border border-[#EDE4DA] text-right">
            <span className="text-[11px] text-[#8C7A70] block">Carga do Dia</span>
            <span className="text-base font-bold font-mono text-[#231815]">
              {formatHours(totalHours)}{' '}
              <span className="text-xs font-normal text-[#8C7A70]">/ {settings.maxDailyProductionHours}h max</span>
            </span>
          </div>

          <div className="px-4 py-2.5 rounded-xl bg-white border border-[#EDE4DA] text-right">
            <span className="text-[11px] text-[#8C7A70] block">Progresso</span>
            <span className="text-base font-bold font-mono text-[#6A3102]">
              {completedCount}/{todayItems.length}
            </span>
          </div>

          {onOpenGoogleCalendar && (
            <button
              onClick={onOpenGoogleCalendar}
              title="Sincronizar etapas com o Google Agenda"
              className={`p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                isGoogleConnected
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-white border-[#EDE4DA] text-[#6A3102] hover:bg-[#FAF7F2]'
              }`}
            >
              <Calendar className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Box de ATENÇÃO */}
      {warnings.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-1 flex items-center gap-1.5">
                <span>ATENÇÃO PREVENTIVA</span>
                <span className="text-[10px] font-normal text-amber-800">· Não deixe para última hora</span>
              </h3>
              <div className="space-y-1.5">
                {warnings.map((w, idx) => (
                  <div
                    key={`warn-${w.task.id}-${idx}`}
                    className="text-xs leading-relaxed flex items-start justify-between gap-2"
                  >
                    <span>• {w.text}</span>
                    <button
                      onClick={() => onSelectTask(w.task)}
                      className="text-[11px] font-semibold text-amber-900 underline shrink-0 hover:text-amber-700 cursor-pointer"
                    >
                      Ver demanda
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hourly Schedule Timeline */}
      <div className="bg-white rounded-2xl border border-[#EDE4DA] p-6 shadow-xs">
        <h2 className="text-sm font-bold text-[#5C4D44] uppercase tracking-wider mb-4 flex items-center justify-between">
          <span>Cronograma Horário de Produção</span>
          <span className="text-xs font-mono text-[#8C7A70] font-normal">
            Horário comercial: {settings.workStartHour}:00 às {settings.workEndHour}:00
          </span>
        </h2>

        {todayItems.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 rounded-full bg-[#FAF7F2] border border-[#EDE4DA] flex items-center justify-center mx-auto text-[#6A3102] mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#231815]">Nenhuma produção pendente para hoje</h3>
            <p className="text-xs text-[#73645B] max-w-md mx-auto mt-1">
              Sua agenda está livre hoje! As demandas seguintes estão com margem preservada ou aguardando aprovação dos clientes.
            </p>
          </div>
        ) : (
          <div className="space-y-3 relative before:absolute before:left-14 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#EDE4DA]">
            {todayItems.map(({ stage, task }, idx) => {
              const cfg = STAGE_TYPE_CONFIG[stage.type];
              return (
                <div
                  key={`today-stage-${task.id}-${stage.id || stage.type}-${stage.startTime}-${idx}`}
                  className={`relative flex items-start gap-4 p-4 rounded-xl border transition-all ${
                    stage.completed
                      ? 'bg-[#FAF7F2] border-[#EDE4DA] opacity-80'
                      : 'bg-white border-[#EDE4DA] hover:border-[#6A3102]/30 shadow-xs'
                  }`}
                >
                  {/* Time label column */}
                  <div className="w-20 shrink-0 text-right pr-2">
                    <span className="text-xs font-bold font-mono text-[#231815] block">
                      {stage.startTime}
                    </span>
                    <span className="text-[10px] font-mono text-[#8C7A70]">
                      até {stage.endTime}
                    </span>
                  </div>

                  {/* Dot on line */}
                  <div
                    className="w-3 h-3 rounded-full mt-1 shrink-0 z-10 ring-4 ring-white"
                    style={{ backgroundColor: cfg.color }}
                  />

                  {/* Main content card */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#8C7A70] uppercase">
                          {task.client}
                        </span>
                        <span className="text-[#8C7A70]">·</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${cfg.badgeBg} ${cfg.text}`}
                        >
                          {cfg.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onOpenReschedule(task)}
                          title="Não consegui fazer hoje? Replanejar"
                          className="px-2 py-1 text-[11px] text-[#73645B] hover:text-[#231815] hover:bg-[#FAF7F2] rounded border border-[#EDE4DA] flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Não consegui fazer</span>
                        </button>

                        <button
                          onClick={() => onToggleStageCompleted(task.id, stage.id)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                            stage.completed
                              ? 'bg-[#16A34A] text-white hover:bg-[#15803D]'
                              : 'bg-[#FAF7F2] border border-[#EDE4DA] text-[#231815] hover:bg-[#EDE4DA]'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{stage.completed ? 'Concluído' : 'Marcar Feito'}</span>
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectTask(task)}
                      className="text-left font-bold text-sm text-[#231815] hover:text-[#6A3102] transition-colors block"
                    >
                      {stage.title}
                    </button>

                    {stage.notes && (
                      <p className="text-xs text-[#73645B] mt-0.5">{stage.notes}</p>
                    )}

                    <div className="mt-2 flex items-center gap-3 text-[11px] text-[#8C7A70]">
                      <span>Duração: {formatHours(stage.durationMinutes / 60)}</span>
                      <span>·</span>
                      <span>
                        Entrega da demanda:{' '}
                        <strong className="text-[#231815]">{task.deadlineDate}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
