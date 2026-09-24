import React from 'react';
import {
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  ThumbsUp,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { Task, TaskStatus } from '../types';
import { formatHours, formatReadableDate, getTodayISO, getDiffInDays } from '../utils/dateUtils';
import { STAGE_TYPE_CONFIG } from '../utils/statusConfig';

interface ApprovalsViewProps {
  tasks: Task[];
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onSelectTask: (task: Task) => void;
  onOpenReschedule: (task: Task) => void;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({
  tasks,
  onUpdateStatus,
  onSelectTask,
  onOpenReschedule
}) => {
  const today = getTodayISO();

  // Tasks requiring approval (deduplicated by task.id)
  const approvalTasks = React.useMemo(() => {
    const list = tasks.filter((t) => t.requiresApproval);
    const seen = new Set<string>();
    return list.filter((t) => {
      if (!t?.id || seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [tasks]);

  const awaitingApproval = approvalTasks.filter(
    (t) => t.status === 'awaiting_approval' || t.status === 'sent_for_approval'
  );
  const inAdjustments = approvalTasks.filter((t) => t.status === 'in_adjustments');
  const approvedReady = approvalTasks.filter(
    (t) => t.status === 'approved' || t.status === 'finalized'
  );

  return (
    <div className="space-y-6 text-[#231815]">
      {/* Overview Banner */}
      <div className="bg-[#FAF7F2] p-6 rounded-2xl border border-[#EDE4DA] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[#6A3102] tracking-wider uppercase flex items-center gap-1.5 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Fluxo Independente de Aprovação</span>
          </span>
          <h1 className="text-2xl font-bold font-display text-[#231815]">
            Controle & Validação de Demandas
          </h1>
          <p className="text-xs text-[#73645B] mt-0.5">
            Garantia de margem para ajustes antes da entrega final ao cliente
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-white border border-[#EDE4DA] text-center">
            <span className="text-[11px] text-[#8C7A70] block">Aguardando Cliente</span>
            <span className="text-lg font-bold font-mono text-amber-700">
              {awaitingApproval.length}
            </span>
          </div>

          <div className="px-4 py-2 rounded-xl bg-white border border-[#EDE4DA] text-center">
            <span className="text-[11px] text-[#8C7A70] block">Em Ajustes</span>
            <span className="text-lg font-bold font-mono text-orange-700">
              {inAdjustments.length}
            </span>
          </div>

          <div className="px-4 py-2 rounded-xl bg-white border border-[#EDE4DA] text-center">
            <span className="text-[11px] text-[#8C7A70] block">Aprovadas</span>
            <span className="text-lg font-bold font-mono text-emerald-700">
              {approvedReady.length}
            </span>
          </div>
        </div>
      </div>

      {/* Workflow Diagram Banner */}
      <div className="p-4 rounded-xl bg-white border border-[#EDE4DA] shadow-xs">
        <span className="text-[11px] font-bold text-[#8C7A70] uppercase tracking-wider block mb-2">
          Fluxo de Ciclo de Vida:
        </span>
        <div className="flex items-center gap-2 overflow-x-auto text-xs py-1">
          <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-semibold shrink-0">
            1. Produção
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-[#A89C94] shrink-0" />
          <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-semibold shrink-0">
            2. Revisão Interna
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-[#A89C94] shrink-0" />
          <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 font-semibold shrink-0">
            3. Envio p/ Aprovação
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-[#A89C94] shrink-0" />
          <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 font-bold shrink-0">
            4. Aguardando Cliente
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-[#A89C94] shrink-0" />
          <span className="px-2.5 py-1 rounded-md bg-orange-50 text-orange-800 font-semibold shrink-0">
            5. Ajustes
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-[#A89C94] shrink-0" />
          <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold shrink-0">
            6. Finalização & Entrega
          </span>
        </div>
      </div>

      {/* Main Section: Aguardando Retorno */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-[#5C4D44] uppercase tracking-wider flex items-center justify-between">
          <span>Demandas Aguardando Retorno do Cliente</span>
          <span className="text-xs font-mono text-[#8C7A70] font-normal">
            Tempo reservado para ajustes: ativo
          </span>
        </h2>

        {awaitingApproval.length === 0 ? (
          <div className="p-8 rounded-xl bg-white border border-[#EDE4DA] text-center text-xs text-[#8C7A70]">
            Nenhuma demanda aguardando aprovação no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {awaitingApproval.map((task) => {
              const daysToDeadline = getDiffInDays(today, task.deadlineDate);

              return (
                <div
                  key={task.id}
                  className="bg-white rounded-xl border border-amber-200/80 p-5 shadow-xs hover:border-amber-400 transition-all space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#8C7A70] uppercase">
                          {task.client}
                        </span>
                        <span className="text-[#8C7A70]">·</span>
                        <span className="text-xs text-[#73645B] capitalize">{task.type}</span>
                      </div>
                      <h3
                        onClick={() => onSelectTask(task)}
                        className="text-base font-bold text-[#231815] hover:text-[#6A3102] transition-colors cursor-pointer mt-0.5"
                      >
                        {task.title}
                      </h3>
                    </div>

                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 shrink-0">
                      Aguardando
                    </span>
                  </div>

                  {/* Deadline and adjustment reservation */}
                  <div className="p-3 rounded-lg bg-[#FAF7F2] border border-[#EDE4DA] space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#73645B]">Prazo Final de Entrega:</span>
                      <strong className="font-mono text-[#231815]">
                        {formatReadableDate(task.deadlineDate, false)} ({daysToDeadline} dias)
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#73645B]">Tempo Reservado para Ajustes:</span>
                      <strong className="font-mono text-orange-700">
                        {formatHours(task.estimatedAdjustmentHours)}
                      </strong>
                    </div>
                  </div>

                  {/* Client response buttons */}
                  <div className="pt-2 border-t border-[#EDE4DA] flex items-center justify-between gap-2">
                    <button
                      onClick={() => onOpenReschedule(task)}
                      className="text-xs text-[#73645B] hover:text-[#231815] flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Replanejar</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onUpdateStatus(task.id, 'in_adjustments')}
                        className="px-3 py-1.5 rounded-lg border border-orange-200 bg-orange-50 text-orange-800 text-xs font-semibold hover:bg-orange-100 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>Pediu Ajustes</span>
                      </button>

                      <button
                        onClick={() => onUpdateStatus(task.id, 'approved')}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>Aprovado!</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section: Em Ajustes */}
      {inAdjustments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-[#5C4D44] uppercase tracking-wider">
            Demandas em Etapa de Ajustes
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inAdjustments.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-xl border border-orange-200 p-5 shadow-xs space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-[#8C7A70] uppercase">
                      {task.client}
                    </span>
                    <h3
                      onClick={() => onSelectTask(task)}
                      className="text-base font-bold text-[#231815] hover:text-[#6A3102] transition-colors cursor-pointer"
                    >
                      {task.title}
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-800">
                    Em Ajustes
                  </span>
                </div>

                <p className="text-xs text-[#73645B]">
                  Ajustes conforme retorno do cliente ({formatHours(task.estimatedAdjustmentHours)}).
                  Após concluir, envie para conferência final ou nova validação.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EDE4DA]">
                  <button
                    onClick={() => onUpdateStatus(task.id, 'sent_for_approval')}
                    className="px-3 py-1.5 rounded-lg border border-[#EDE4DA] text-xs font-semibold text-[#5C4D44] hover:bg-[#FAF7F2] cursor-pointer"
                  >
                    Reenviar para Aprovação
                  </button>
                  <button
                    onClick={() => onUpdateStatus(task.id, 'finalized')}
                    className="px-3 py-1.5 rounded-lg bg-[#6A3102] text-white text-xs font-semibold hover:bg-[#542601] cursor-pointer"
                  >
                    Ajustes Feitos (Finalizar)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
