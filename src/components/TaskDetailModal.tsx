import React from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Edit2,
  Trash2,
  Share2,
  Check
} from 'lucide-react';
import { Task, TaskStage, TaskStatus } from '../types';
import { formatHours, formatReadableDate, getTodayISO, getUrgencyBadge } from '../utils/dateUtils';
import {
  TASK_STATUS_CONFIG,
  STAGE_TYPE_CONFIG,
  PRIORITY_CONFIG,
  RISK_LEVEL_CONFIG
} from '../utils/statusConfig';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onToggleStageCompleted: (taskId: string, stageId: string) => void;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onOpenEdit: (task: Task) => void;
  onOpenReschedule: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onSyncGoogleCalendar?: (task: Task) => Promise<void>;
  isGoogleConnected?: boolean;
  isSyncingCalendar?: boolean;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  onToggleStageCompleted,
  onUpdateStatus,
  onOpenEdit,
  onOpenReschedule,
  onDeleteTask,
  onSyncGoogleCalendar,
  isGoogleConnected = false,
  isSyncingCalendar = false
}) => {
  if (!isOpen || !task) return null;

  const statusCfg = TASK_STATUS_CONFIG[task.status];
  const priorityCfg = PRIORITY_CONFIG[task.priority];
  const riskCfg = RISK_LEVEL_CONFIG[task.riskLevel];
  const urgency = getUrgencyBadge(task.deadlineDate, task.status);

  const completedStagesCount = task.stages.filter((s) => s.completed).length;
  const progressPercent = task.stages.length
    ? Math.round((completedStagesCount / task.stages.length) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl border border-[#EDE4DA] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#231815]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-[#EDE4DA] bg-[#FAF7F2]">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-semibold text-[#8C7A70] uppercase tracking-wider">
                {task.client}
              </span>
              <span className="text-[#8C7A70]">·</span>
              <span className="text-xs font-medium text-[#73645B] capitalize">{task.type}</span>
              <span className="text-[#8C7A70]">·</span>
              <span className={`text-xs font-semibold ${priorityCfg.color} flex items-center gap-1`}>
                <span className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot}`} />
                {priorityCfg.label}
              </span>
            </div>
            <h2 className="text-lg font-bold font-display text-[#231815]">{task.title}</h2>
          </div>

          <div className="flex items-center gap-1.5">
            {onSyncGoogleCalendar && (
              <button
                onClick={() => onSyncGoogleCalendar(task)}
                disabled={isSyncingCalendar}
                title={
                  task.googleCalendarSyncedAt
                    ? `Sincronizado na Agenda em ${new Date(task.googleCalendarSyncedAt).toLocaleDateString('pt-BR')}. Clique para atualizar.`
                    : isGoogleConnected
                    ? 'Sincronizar etapas no Google Agenda'
                    : 'Conectar ao Google Agenda para sincronizar'
                }
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  task.googleCalendarSyncedAt
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                    : 'bg-white border-[#EDE4DA] text-[#6A3102] hover:bg-[#FAF7F2] hover:border-[#6A3102]/30'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {isSyncingCalendar
                    ? 'Sincronizando...'
                    : task.googleCalendarSyncedAt
                    ? 'Sincronizado'
                    : 'Sincronizar no Google'}
                </span>
              </button>
            )}

            <button
              onClick={() => onOpenEdit(task)}
              title="Editar demanda"
              className="p-1.5 text-[#73645B] hover:text-[#231815] hover:bg-[#EDE4DA] rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDeleteTask(task.id)}
              title="Excluir demanda"
              className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#73645B] hover:text-[#231815] hover:bg-[#EDE4DA] rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Status & Deadline overview row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-[#FAF7F2] border border-[#EDE4DA]">
              <span className="text-[11px] text-[#8C7A70] block">Status Atual</span>
              <select
                value={task.status}
                onChange={(e) => onUpdateStatus(task.id, e.target.value as TaskStatus)}
                className="mt-1 text-xs font-semibold bg-white border border-[#EDE4DA] rounded px-2 py-1 w-full"
              >
                {Object.entries(TASK_STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-lg bg-[#FAF7F2] border border-[#EDE4DA]">
              <span className="text-[11px] text-[#8C7A70] block">Prazo Final</span>
              <span className="text-xs font-bold text-[#231815] font-mono block mt-1">
                {formatReadableDate(task.deadlineDate, false)} {task.deadlineTime}
              </span>
              <span className="text-[10px] font-medium text-[#B45309]">{urgency.label}</span>
            </div>

            <div className="p-3 rounded-lg bg-[#FAF7F2] border border-[#EDE4DA]">
              <span className="text-[11px] text-[#8C7A70] block">Carga Estimada</span>
              <span className="text-xs font-bold text-[#231815] font-mono block mt-1">
                {formatHours(task.estimatedProductionHours)} prod.
              </span>
              <span className="text-[10px] text-[#73645B]">
                +{formatHours(task.estimatedAdjustmentHours)} ajustes
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#FAF7F2] border border-[#EDE4DA]">
              <span className="text-[11px] text-[#8C7A70] block">Risco de Atraso</span>
              <span className={`text-xs font-bold block mt-1 ${riskCfg.text}`}>
                {riskCfg.label}
              </span>
              <span className="text-[10px] text-[#73645B]">
                {task.safetyMargin.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div className="p-3 rounded-lg border border-[#EDE4DA] bg-white text-xs leading-relaxed text-[#5C4D44]">
              <span className="font-semibold text-[#231815] block mb-0.5">Briefing / Notas:</span>
              {task.description}
            </div>
          )}

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-[#5C4D44] uppercase tracking-wider text-[11px]">
                Progresso das Etapas de Produção
              </span>
              <span className="font-mono text-[#6A3102] font-semibold">
                {completedStagesCount}/{task.stages.length} concluídas ({progressPercent}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#EAE2D8] overflow-hidden">
              <div
                className="h-full bg-[#6A3102] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Stages list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#5C4D44] uppercase tracking-wider">
                Cronograma Detalhado
              </span>
              <button
                onClick={() => onOpenReschedule(task)}
                className="text-xs text-[#6A3102] hover:text-[#542601] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Replanejar Etapas</span>
              </button>
            </div>

            <div className="space-y-2">
              {task.stages.map((stage, idx) => {
                const cfg = STAGE_TYPE_CONFIG[stage.type];
                return (
                  <div
                    key={`detail-stage-${task.id}-${stage.id || stage.type}-${stage.startTime}-${idx}`}
                    onClick={() => onToggleStageCompleted(task.id, stage.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      stage.completed
                        ? 'bg-[#F9F7F4] border-[#EDE4DA] opacity-75'
                        : 'bg-white border-[#EDE4DA] hover:border-[#6A3102]/30 shadow-xs'
                    }`}
                  >
                    <button
                      type="button"
                      className={`w-5 h-5 rounded-md border mt-0.5 flex items-center justify-center transition-colors shrink-0 ${
                        stage.completed
                          ? 'bg-[#16A34A] border-[#16A34A] text-white'
                          : 'border-[#C8B8A6] hover:border-[#6A3102]'
                      }`}
                    >
                      {stage.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className={`text-xs font-bold ${
                            stage.completed ? 'line-through text-[#8C7A70]' : 'text-[#231815]'
                          }`}
                        >
                          {stage.title}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${cfg.badgeBg} ${cfg.text}`}
                        >
                          {cfg.label}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#73645B] mt-0.5">{stage.notes}</p>

                      <div className="mt-1 flex items-center gap-2 text-[11px] font-mono text-[#8C7A70]">
                        <span>{formatReadableDate(stage.date)}</span>
                        <span>·</span>
                        <span>
                          {stage.startTime} – {stage.endTime}
                        </span>
                        <span>·</span>
                        <span>{formatHours(stage.durationMinutes / 60)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#EDE4DA] bg-[#FAF7F2] text-xs">
          <span className="text-[#8C7A70]">
            Responsável: <strong className="text-[#231815]">{task.assignee}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#6A3102] hover:bg-[#542601] text-white font-semibold rounded-lg"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
