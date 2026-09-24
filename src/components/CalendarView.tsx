import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Filter,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Task, TaskStage, StageType } from '../types';
import {
  parseDate,
  formatDateISO,
  getTodayISO,
  addDays,
  formatReadableDate,
  getDayOfWeekName,
  getShortDayName,
  getDiffInDays,
  getUrgencyBadge
} from '../utils/dateUtils';
import { STAGE_TYPE_CONFIG, TASK_STATUS_CONFIG } from '../utils/statusConfig';

interface CalendarViewProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onOpenGoogleCalendar?: () => void;
  isGoogleConnected?: boolean;
}

type CalendarMode = 'day' | 'week' | 'month';

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  onSelectTask,
  onOpenGoogleCalendar,
  isGoogleConnected = false
}) => {
  const today = getTodayISO();
  const [currentDateStr, setCurrentDateStr] = useState<string>(today);
  const [mode, setMode] = useState<CalendarMode>('week');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');

  // Ensure unique tasks by id
  const uniqueTasks = React.useMemo(() => {
    const seen = new Set<string>();
    return tasks.filter((t) => {
      if (!t?.id || seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [tasks]);

  // Extract unique clients
  const clients = Array.from(new Set(uniqueTasks.map((t) => t.client)));

  // Navigation handlers
  const handlePrev = () => {
    if (mode === 'day') {
      setCurrentDateStr(addDays(currentDateStr, -1));
    } else if (mode === 'week') {
      setCurrentDateStr(addDays(currentDateStr, -7));
    } else {
      const d = parseDate(currentDateStr);
      d.setMonth(d.getMonth() - 1);
      setCurrentDateStr(formatDateISO(d));
    }
  };

  const handleNext = () => {
    if (mode === 'day') {
      setCurrentDateStr(addDays(currentDateStr, 1));
    } else if (mode === 'week') {
      setCurrentDateStr(addDays(currentDateStr, 7));
    } else {
      const d = parseDate(currentDateStr);
      d.setMonth(d.getMonth() + 1);
      setCurrentDateStr(formatDateISO(d));
    }
  };

  const handleToday = () => {
    setCurrentDateStr(today);
  };

  // Filter tasks
  const filteredTasks = uniqueTasks.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterClient !== 'all' && t.client !== filterClient) return false;
    return true;
  });

  // Collect all stages mapped by date
  const stagesByDate: Record<string, { stage: TaskStage; task: Task }[]> = {};
  for (const task of filteredTasks) {
    for (const stage of task.stages) {
      if (!stagesByDate[stage.date]) {
        stagesByDate[stage.date] = [];
      }
      stagesByDate[stage.date].push({ stage, task });
    }
  }

  // Helper to get day stages sorted by time
  const getStagesForDay = (dateStr: string) => {
    return (stagesByDate[dateStr] || []).sort((a, b) =>
      a.stage.startTime.localeCompare(b.stage.startTime)
    );
  };

  // Render Day View
  const renderDayView = () => {
    const dayStages = getStagesForDay(currentDateStr);
    const dayName = getDayOfWeekName(currentDateStr);
    const isToday = currentDateStr === today;

    return (
      <div className="bg-white rounded-xl border border-[#EDE4DA] p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#EDE4DA]">
          <div>
            <h3 className="text-lg font-bold text-[#231815] font-display">
              {dayName} · {formatReadableDate(currentDateStr, false)}
            </h3>
            {isToday && (
              <span className="text-xs font-semibold text-[#6A3102] bg-[#F5EFE6] px-2 py-0.5 rounded-full inline-block mt-1">
                Dia Atual
              </span>
            )}
          </div>
          <span className="text-xs font-mono text-[#8C7A70]">
            {dayStages.length} etapa{dayStages.length !== 1 ? 's' : ''} agendada{dayStages.length !== 1 ? 's' : ''}
          </span>
        </div>

        {dayStages.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#8C7A70]">
            Nenhuma atividade alocada para este dia.
          </div>
        ) : (
          <div className="space-y-3">
            {dayStages.map(({ stage, task }, idx) => {
              const cfg = STAGE_TYPE_CONFIG[stage.type];
              const urgency = getUrgencyBadge(task.deadlineDate, task.status);
              const isOverdue = urgency.variant === 'overdue';

              return (
                <div
                  key={`day-stage-${task.id}-${stage.id || stage.type}-${stage.startTime}-${idx}`}
                  onClick={() => onSelectTask(task)}
                  className="flex items-start gap-4 p-4 rounded-xl border border-[#EDE4DA] hover:border-[#6A3102]/40 transition-all cursor-pointer bg-[#FAF7F2]/60 hover:bg-[#FAF7F2]"
                >
                  <div className="w-16 shrink-0 text-right">
                    <span className="font-mono text-xs font-bold text-[#231815] block">
                      {stage.startTime}
                    </span>
                    <span className="font-mono text-[10px] text-[#8C7A70]">
                      {stage.endTime}
                    </span>
                  </div>

                  <div
                    className="w-3 h-3 rounded-full mt-1 shrink-0"
                    style={{ backgroundColor: isOverdue ? '#DC2626' : cfg.color }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-sm text-[#231815]">
                        {task.client}: {stage.title}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-medium ${cfg.badgeBg} ${cfg.text}`}
                        >
                          {cfg.label}
                        </span>
                        {isOverdue && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">
                            Em atraso
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-[#73645B] mt-0.5">{stage.notes}</p>
                    <div className="mt-2 text-[11px] text-[#8C7A70] flex items-center gap-3">
                      <span>Demanda: {task.title}</span>
                      <span>·</span>
                      <span>Prazo final: {task.deadlineDate} ({urgency.label})</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Render Week View
  const renderWeekView = () => {
    const centerDate = parseDate(currentDateStr);
    const dayOfWeek = centerDate.getDay(); // 0 = Sun
    // Adjust to start on Monday
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(centerDate);
    monday.setDate(monday.getDate() + distanceToMonday);

    const weekDays: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      weekDays.push(formatDateISO(d));
    }

    return (
      <div className="bg-white rounded-xl border border-[#EDE4DA] overflow-hidden shadow-xs">
        <div className="grid grid-cols-7 border-b border-[#EDE4DA] text-center bg-[#FAF7F2]">
          {weekDays.map((dStr) => {
            const isToday = dStr === today;
            const shortName = getShortDayName(dStr);
            const dateNum = dStr.split('-')[2];

            return (
              <div
                key={dStr}
                className={`py-3 px-1 border-r border-[#EDE4DA] last:border-r-0 ${
                  isToday ? 'bg-[#F5EFE6]' : ''
                }`}
              >
                <span className="text-[11px] font-bold text-[#8C7A70] block uppercase">
                  {shortName}
                </span>
                <span
                  className={`text-sm font-bold font-mono inline-flex items-center justify-center w-7 h-7 rounded-full mt-0.5 ${
                    isToday ? 'bg-[#6A3102] text-white' : 'text-[#231815]'
                  }`}
                >
                  {dateNum}
                </span>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-7 min-h-[420px] divide-x divide-[#EDE4DA]">
          {weekDays.map((dStr) => {
            const dayStages = getStagesForDay(dStr);
            const isToday = dStr === today;

            return (
              <div
                key={dStr}
                className={`p-1.5 space-y-1.5 min-h-[360px] ${
                  isToday ? 'bg-[#FDFBF7]' : 'bg-white'
                }`}
              >
                {dayStages.map(({ stage, task }, idx) => {
                  const cfg = STAGE_TYPE_CONFIG[stage.type];
                  const urgency = getUrgencyBadge(task.deadlineDate, task.status);
                  const isOverdue = urgency.variant === 'overdue';

                  return (
                    <div
                      key={`week-stage-${task.id}-${stage.id || stage.type}-${stage.startTime}-${idx}`}
                      onClick={() => onSelectTask(task)}
                      title={`${task.client} - ${stage.title} (${stage.startTime}-${stage.endTime})`}
                      className="p-2 rounded-lg border text-left cursor-pointer transition-all hover:shadow-sm text-xs leading-tight"
                      style={{
                        backgroundColor: isOverdue ? '#FEF2F2' : `${cfg.color}10`,
                        borderColor: isOverdue ? '#FCA5A5' : `${cfg.color}35`
                      }}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: isOverdue ? '#DC2626' : cfg.color }}
                        />
                        <span className="font-mono text-[10px] text-[#73645B] truncate">
                          {stage.startTime}
                        </span>
                      </div>

                      <div className="font-bold text-[#231815] truncate text-[11px]">
                        {task.client}
                      </div>
                      <div className="text-[10px] text-[#5C4D44] truncate">{stage.title}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Month View
  const renderMonthView = () => {
    const cur = parseDate(currentDateStr);
    const year = cur.getFullYear();
    const month = cur.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDay.getDay(); // 0 = Sun
    const leadingDays = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const calendarCells: { dateStr: string; isCurrentMonth: boolean }[] = [];

    // Leading days from previous month
    for (let i = leadingDays; i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      calendarCells.push({ dateStr: formatDateISO(d), isCurrentMonth: false });
    }

    // Days of current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(year, month, day);
      calendarCells.push({ dateStr: formatDateISO(d), isCurrentMonth: true });
    }

    // Trailing days to fill 35 or 42 cells
    const totalCells = calendarCells.length <= 35 ? 35 : 42;
    const remaining = totalCells - calendarCells.length;
    for (let day = 1; day <= remaining; day++) {
      const d = new Date(year, month + 1, day);
      calendarCells.push({ dateStr: formatDateISO(d), isCurrentMonth: false });
    }

    const weekHeader = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

    return (
      <div className="bg-white rounded-xl border border-[#EDE4DA] overflow-hidden shadow-xs">
        <div className="grid grid-cols-7 border-b border-[#EDE4DA] text-center bg-[#FAF7F2]">
          {weekHeader.map((d, i) => (
            <div key={i} className="py-2.5 text-xs font-bold text-[#8C7A70] uppercase">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 divide-x divide-y divide-[#EDE4DA]">
          {calendarCells.map(({ dateStr, isCurrentMonth }, cellIdx) => {
            const dayStages = getStagesForDay(dateStr);
            const isToday = dateStr === today;
            const dayNum = dateStr.split('-')[2];

            return (
              <div
                key={`month-cell-${dateStr}-${cellIdx}`}
                className={`p-1.5 min-h-[90px] ${
                  !isCurrentMonth
                    ? 'bg-stone-50/50 text-stone-400'
                    : isToday
                    ? 'bg-[#FDFBF7]'
                    : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[11px] font-mono font-bold inline-flex items-center justify-center w-5 h-5 rounded-full ${
                      isToday ? 'bg-[#6A3102] text-white' : 'text-[#5C4D44]'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {dayStages.length > 0 && (
                    <span className="text-[10px] text-[#8C7A70] font-mono">
                      {dayStages.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1 overflow-y-auto max-h-[70px]">
                  {dayStages.slice(0, 3).map(({ stage, task }, idx) => {
                    const cfg = STAGE_TYPE_CONFIG[stage.type];
                    return (
                      <div
                        key={`month-stage-${task.id}-${stage.id || stage.type}-${stage.startTime}-${idx}`}
                        onClick={() => onSelectTask(task)}
                        title={`${task.client}: ${stage.title}`}
                        className="truncate text-[10px] px-1 py-0.5 rounded cursor-pointer font-medium"
                        style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}
                      >
                        {task.client}: {stage.title}
                      </div>
                    );
                  })}
                  {dayStages.length > 3 && (
                    <span className="text-[9px] text-[#8C7A70] block font-mono">
                      +{dayStages.length - 3} mais
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Calendar Control Top Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#EDE4DA] flex flex-wrap items-center justify-between gap-4 shadow-xs">
        {/* Date Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-lg border border-[#EDE4DA] hover:bg-[#FAF7F2] text-[#5C4D44] cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#EDE4DA] hover:bg-[#FAF7F2] text-[#231815] cursor-pointer"
          >
            Hoje
          </button>

          <button
            onClick={handleNext}
            className="p-1.5 rounded-lg border border-[#EDE4DA] hover:bg-[#FAF7F2] text-[#5C4D44] cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-sm font-bold font-display text-[#231815] ml-2">
            {formatReadableDate(currentDateStr, false)}
          </span>
        </div>

        {/* Filters & Mode Segmented Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Client filter */}
          {clients.length > 0 && (
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="text-xs border border-[#EDE4DA] rounded-lg px-2.5 py-1.5 bg-[#FAF7F2] text-[#231815] font-medium"
            >
              <option value="all">Todos os Clientes</option>
              {clients.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          {/* Mode Switcher */}
          <div className="flex items-center bg-[#FAF7F2] p-0.5 rounded-lg border border-[#EDE4DA]">
            <button
              onClick={() => setMode('day')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                mode === 'day'
                  ? 'bg-white text-[#6A3102] font-semibold shadow-xs'
                  : 'text-[#73645B] hover:text-[#231815]'
              }`}
            >
              Dia
            </button>
            <button
              onClick={() => setMode('week')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                mode === 'week'
                  ? 'bg-white text-[#6A3102] font-semibold shadow-xs'
                  : 'text-[#73645B] hover:text-[#231815]'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setMode('month')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                mode === 'month'
                  ? 'bg-white text-[#6A3102] font-semibold shadow-xs'
                  : 'text-[#73645B] hover:text-[#231815]'
              }`}
            >
              Mês
            </button>
          </div>

          {onOpenGoogleCalendar && (
            <button
              onClick={onOpenGoogleCalendar}
              title="Sincronizar tarefas com o Google Agenda"
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isGoogleConnected
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-white border-[#EDE4DA] text-[#6A3102] hover:bg-[#FAF7F2]'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Google Agenda</span>
              {isGoogleConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
            </button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-[#73645B] px-1">
        <span className="font-semibold text-[#5C4D44]">Legenda das Cores:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
          <span>Azul = Produção</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
          <span>Amarelo = Aprovação</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" />
          <span>Laranja = Ajustes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
          <span>Verde = Finalizado / Entrega</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
          <span>Vermelho = Atrasado</span>
        </div>
      </div>

      {/* Dynamic View */}
      {mode === 'day' && renderDayView()}
      {mode === 'week' && renderWeekView()}
      {mode === 'month' && renderMonthView()}
    </div>
  );
};
