import React, { useState } from 'react';
import { X, RefreshCw, AlertTriangle, CheckCircle, Calendar, Clock } from 'lucide-react';
import { Task, UserSettings } from '../types';
import { rescheduleTask } from '../utils/scheduler';
import { formatReadableDate, getTodayISO } from '../utils/dateUtils';
import { STAGE_TYPE_CONFIG } from '../utils/statusConfig';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  existingTasks: Task[];
  settings: UserSettings;
  onApplyReschedule: (updatedTask: Task) => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  task,
  existingTasks,
  settings,
  onApplyReschedule
}) => {
  if (!isOpen || !task) return null;

  const rescheduleResult = rescheduleTask(task, existingTasks, settings);
  const { updatedTask, isFeasible, riskExplanation } = rescheduleResult;

  // Find the first newly scheduled pending stage
  const nextStage = updatedTask.stages.find((s) => !s.completed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl border border-[#EDE4DA] w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#231815]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE4DA] bg-[#FAF7F2]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#6A3102]/10 text-[#6A3102] flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-[#231815]">
                Replanejamento Inteligente
              </h2>
              <p className="text-xs text-[#73645B]">
                Reorganização automática de etapas com cálculo de viabilidade de prazo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#73645B] hover:text-[#231815] p-1.5 rounded-lg hover:bg-[#EDE4DA]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Missed / Postponed Notice */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
              Status da Demanda
            </span>
            <p className="text-sm font-bold text-[#231815] mt-0.5">
              {task.title} <span className="text-stone-500 font-normal">({task.client})</span>
            </p>
            <p className="text-xs text-stone-600 mt-1">
              "Esta tarefa ou etapa programada não foi realizada no horário previsto."
            </p>
          </div>

          {/* New Suggestion Callout */}
          {nextStage && (
            <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#EDE4DA] flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-[#6A3102] uppercase tracking-wider block">
                  Novo Planejamento Sugerido
                </span>
                <p className="text-base font-bold text-[#231815] mt-1">
                  {nextStage.title}: {formatReadableDate(nextStage.date)} às {nextStage.startTime}
                </p>
                <p className="text-xs text-[#73645B] mt-0.5">
                  Próximo slot livre de produção encontrado sem conflitos de agenda.
                </p>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-[#6A3102] text-white text-xs font-mono font-semibold shrink-0">
                {nextStage.startTime} - {nextStage.endTime}
              </div>
            </div>
          )}

          {/* Feasibility / Risk Callout */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              !isFeasible || updatedTask.riskLevel === 'critical'
                ? 'bg-red-50 border-red-200 text-red-900'
                : updatedTask.riskLevel === 'high'
                ? 'bg-orange-50 border-orange-200 text-orange-900'
                : updatedTask.riskLevel === 'medium'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            {!isFeasible || updatedTask.riskLevel === 'critical' ? (
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">
                {isFeasible ? 'Prazo Final Viável' : 'Risco de Atraso Crítico'}
              </p>
              <p className="text-xs mt-1 leading-relaxed">
                {riskExplanation}
              </p>
            </div>
          </div>

          {/* Stages comparison preview */}
          <div>
            <h4 className="text-xs font-bold text-[#5C4D44] uppercase tracking-wider mb-2">
              Novo Cronograma Reorganizado
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {updatedTask.stages.map((st, i) => {
                const cfg = STAGE_TYPE_CONFIG[st.type];
                return (
                  <div
                    key={`reschedule-stage-${updatedTask.id}-${st.id || st.type}-${st.startTime}-${i}`}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                      st.completed
                        ? 'bg-stone-50 border-stone-200 text-stone-400 line-through'
                        : 'bg-white border-[#EDE4DA] text-[#231815]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                      <span className="font-semibold">{st.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded ${cfg.badgeBg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[#73645B]">
                      <span>{formatReadableDate(st.date, false)}</span>
                      <span>·</span>
                      <span>{st.startTime}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#EDE4DA] bg-[#FAF7F2]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#5C4D44] hover:text-[#231815]"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onApplyReschedule(updatedTask);
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold bg-[#6A3102] hover:bg-[#542601] text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Aplicar Novo Planejamento</span>
          </button>
        </div>
      </div>
    </div>
  );
};
