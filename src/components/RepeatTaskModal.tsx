import React, { useState } from 'react';
import {
  X,
  Repeat,
  Calendar,
  Clock,
  Check,
  Package,
  Sparkles,
  ArrowRight,
  RotateCw,
  Users
} from 'lucide-react';
import { Task, RepeatTaskOptions, RecurrenceFrequency } from '../types';
import { getTodayISO, addDays, formatReadableDate, getDiffInDays } from '../utils/dateUtils';
import { getAllTaskAssignees } from '../utils/deliverableUtils';

interface RepeatTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onConfirmRepeat: (sourceTask: Task, options: RepeatTaskOptions) => void;
}

export const RepeatTaskModal: React.FC<RepeatTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  onConfirmRepeat
}) => {
  if (!isOpen || !task) return null;

  const today = getTodayISO();

  // Calculate default next date (+7 days from original deadline or from today)
  const baseDate = task.deadlineDate >= today ? task.deadlineDate : today;
  const defaultNextDeadline = addDays(baseDate, 7);

  const [newTitle, setNewTitle] = useState(`${task.title} (Novo Ciclo)`);
  const [newDeadlineDate, setNewDeadlineDate] = useState(defaultNextDeadline);
  const [newDeadlineTime, setNewDeadlineTime] = useState(task.deadlineTime || '18:00');
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency>(task.recurrence || 'none');
  const [resetDeliverables, setResetDeliverables] = useState(true);

  // Sync state whenever task changes or modal opens
  React.useEffect(() => {
    if (task && isOpen) {
      const currentBase = task.deadlineDate >= today ? task.deadlineDate : today;
      setNewTitle(`${task.title} (Novo Ciclo)`);
      setNewDeadlineDate(addDays(currentBase, 7));
      setNewDeadlineTime(task.deadlineTime || '18:00');
      setRecurrence(task.recurrence || 'none');
      setResetDeliverables(true);
    }
  }, [task?.id, isOpen]);

  // Quick preset handlers
  const handleSetPresetDays = (days: number, frequency: RecurrenceFrequency = 'none') => {
    const calculated = addDays(today, days);
    setNewDeadlineDate(calculated);
    setRecurrence(frequency);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeadlineDate) return;

    onConfirmRepeat(task, {
      newTitle: newTitle.trim() || task.title,
      newDeadlineDate,
      newDeadlineTime,
      newStartDate: today,
      recurrence,
      resetDeliverablesStatus: resetDeliverables
    });

    onClose();
  };

  const allAssignees = getAllTaskAssignees(task);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#EDE4DA] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#231815]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EDE4DA] flex items-center justify-between bg-[#FAF7F2]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#6A3102]/10 text-[#6A3102] flex items-center justify-center">
              <RotateCw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-[#231815]">
                Repetir Demanda
              </h2>
              <span className="text-xs text-[#73645B]">
                Duplique e recalcule o cronograma para um novo período
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#73645B] hover:text-[#231815] hover:bg-[#EDE4DA] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Source Task Summary Card */}
          <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#EDE4DA] space-y-1.5 text-xs">
            <span className="text-[10px] font-bold text-[#8C7A70] uppercase tracking-wider block">
              Demanda de Origem:
            </span>
            <div className="flex items-center justify-between gap-2">
              <strong className="text-sm text-[#231815] truncate font-bold">
                {task.client}: {task.title}
              </strong>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EDE4DA] text-[#4A3B32] shrink-0 font-medium">
                {task.specialty || task.type}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-[#73645B] flex-wrap pt-1 border-t border-[#EDE4DA]/60">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-[#8C7A70]" />
                <span>{allAssignees.join(', ')}</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Package className="w-3 h-3 text-[#8C7A70]" />
                <span>{task.deliverables?.length || 0} entregável(is)</span>
              </span>
              <span>·</span>
              <span>Prazo anterior: {formatReadableDate(task.deadlineDate, false)}</span>
            </div>
          </div>

          {/* New Title */}
          <div>
            <label className="block text-xs font-medium text-[#5C4D44] mb-1">
              Nome da Nova Demanda
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6A3102] bg-white text-[#231815]"
            />
          </div>

          {/* Quick Date Presets */}
          <div>
            <label className="block text-xs font-medium text-[#5C4D44] mb-1.5">
              Escolha Rápida do Próximo Prazo
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSetPresetDays(7, 'weekly')}
                className="px-2.5 py-2 text-xs font-medium rounded-lg border border-[#EDE4DA] bg-white hover:border-[#6A3102] hover:bg-[#FAF7F2] text-[#231815] transition-all text-center cursor-pointer shadow-2xs"
              >
                <span className="block font-bold text-[#6A3102]">+ 7 Dias</span>
                <span className="text-[10px] text-[#8C7A70]">Próxima semana</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetPresetDays(15, 'biweekly')}
                className="px-2.5 py-2 text-xs font-medium rounded-lg border border-[#EDE4DA] bg-white hover:border-[#6A3102] hover:bg-[#FAF7F2] text-[#231815] transition-all text-center cursor-pointer shadow-2xs"
              >
                <span className="block font-bold text-[#6A3102]">+ 15 Dias</span>
                <span className="text-[10px] text-[#8C7A70]">Quinzenal</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetPresetDays(30, 'monthly')}
                className="px-2.5 py-2 text-xs font-medium rounded-lg border border-[#EDE4DA] bg-white hover:border-[#6A3102] hover:bg-[#FAF7F2] text-[#231815] transition-all text-center cursor-pointer shadow-2xs"
              >
                <span className="block font-bold text-[#6A3102]">+ 30 Dias</span>
                <span className="text-[10px] text-[#8C7A70]">Próximo mês</span>
              </button>
            </div>
          </div>

          {/* New Deadline Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                Nova Data de Entrega <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={newDeadlineDate}
                onChange={(e) => setNewDeadlineDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#6A3102]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                Novo Horário Limite
              </label>
              <input
                type="time"
                value={newDeadlineTime}
                onChange={(e) => setNewDeadlineTime(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#6A3102]"
              />
            </div>
          </div>

          {/* Recurrence Frequency */}
          <div>
            <label className="block text-xs font-medium text-[#5C4D44] mb-1">
              Frequência de Repetição Programada
            </label>
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as RecurrenceFrequency)}
              className="w-full px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#6A3102]"
            >
              <option value="none">Apenas desta vez (Sem repetição periódica)</option>
              <option value="weekly">Semanal (Repetir toda semana)</option>
              <option value="biweekly">Quinzenal (A cada 15 dias)</option>
              <option value="monthly">Mensal (Todo mês)</option>
            </select>
          </div>

          {/* Reset Deliverables Checkbox */}
          <div className="p-3 rounded-xl border border-[#EDE4DA] bg-[#FAF7F2] space-y-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-[#231815]">
              <input
                type="checkbox"
                checked={resetDeliverables}
                onChange={(e) => setResetDeliverables(e.target.checked)}
                className="w-4 h-4 rounded text-[#6A3102] focus:ring-[#6A3102]"
              />
              <span>Reiniciar status dos entregáveis como "A Fazer"</span>
            </label>
            <p className="text-[11px] text-[#73645B] pl-6">
              Todos os {task.deliverables?.length || 0} entregáveis e sub-etapas serão criados zerados no novo período com o cronograma inteligente recalculado.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-[#EDE4DA]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-[#73645B] hover:text-[#231815] cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#6A3102] hover:bg-[#542601] text-white flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Repetir e Agendar Demanda</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
