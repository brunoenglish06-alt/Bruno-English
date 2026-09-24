import React, { useState } from 'react';
import {
  Clock,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  Play,
  ArrowRight,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Check,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Task, TaskStatus, Priority, RiskLevel, UserSettings } from '../types';
import {
  getTodayISO,
  formatReadableDate,
  getDiffInDays,
  formatHours,
  getUrgencyBadge
} from '../utils/dateUtils';
import {
  TASK_STATUS_CONFIG,
  PRIORITY_CONFIG,
  RISK_LEVEL_CONFIG,
  TASK_TYPE_CONFIG
} from '../utils/statusConfig';

interface DashboardProps {
  tasks: Task[];
  settings: UserSettings;
  overallRisk: RiskLevel;
  onSelectTask: (task: Task) => void;
  onOpenNewTask: () => void;
  onOpenReschedule: (task: Task) => void;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onToggleStageCompleted: (taskId: string, stageId: string) => void;
  onNavigateToToday: () => void;
  onNavigateToApprovals: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  tasks,
  settings,
  overallRisk,
  onSelectTask,
  onOpenNewTask,
  onOpenReschedule,
  onUpdateStatus,
  onToggleStageCompleted,
  onNavigateToToday,
  onNavigateToApprovals
}) => {
  const today = getTodayISO();

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // KPI calculations
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'delivered' || t.status === 'finalized');
  const activeTasks = tasks.filter((t) => t.status !== 'delivered' && t.status !== 'finalized');

  // Tasks for today (stages scheduled for today)
  const tasksForToday = tasks.filter((t) =>
    t.stages.some((s) => s.date === today && !s.completed)
  );

  // Overdue tasks
  const overdueTasks = activeTasks.filter((t) => getDiffInDays(today, t.deadlineDate) < 0);

  // In production
  const inProductionTasks = activeTasks.filter(
    (t) => t.status === 'in_production' || t.status === 'in_review'
  );

  // Awaiting approval
  const awaitingApprovalTasks = activeTasks.filter(
    (t) => t.status === 'awaiting_approval' || t.status === 'sent_for_approval'
  );

  // Near deadlines (next 3 days)
  const nearDeadlineTasks = activeTasks.filter((t) => {
    const diff = getDiffInDays(today, t.deadlineDate);
    return diff >= 0 && diff <= 3;
  });

  // On-time completion rate
  const onTimeDelivered = completedTasks.filter((t) => {
    if (!t.deliveredAt) return true;
    const deliveredDay = t.deliveredAt.split('T')[0];
    return deliveredDay <= t.deadlineDate;
  }).length;
  const onTimeRate = completedTasks.length > 0
    ? Math.round((onTimeDelivered / completedTasks.length) * 100)
    : 100;

  // Next crucial deadline
  const sortedUpcoming = [...activeTasks].sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate));
  const nextCrucial = sortedUpcoming[0];

  // Global Risk Assessment text
  const riskConfig = RISK_LEVEL_CONFIG[overallRisk];
  const riskDiagnoses = {
    low: 'Carga balanceada. Prazos seguros e margens de produção preservadas.',
    medium: 'Atenção aos prazos da semana. Mantenha os inícios recomendados para não consumir as folgas.',
    high: 'Risco de atraso detectado em demandas prioritárias! Inicie a produção hoje.',
    critical: 'Alerta crítico: tarefas atrasadas ou sobreposição severa de entregas. Replanejamento emergencial necessário.'
  };

  // Filtered task list (deduplicated by task.id)
  const filteredTasks = React.useMemo(() => {
    const list = tasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.client.toLowerCase().includes(q) ||
          t.type.toLowerCase().includes(q)
        );
      }
      return true;
    });

    const seen = new Set<string>();
    const unique: Task[] = [];
    for (const item of list) {
      if (item && item.id && !seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
    return unique;
  }, [tasks, statusFilter, priorityFilter, searchTerm]);

  return (
    <div className="space-y-6 text-[#231815]">
      {/* 1. Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#231815] tracking-tight">
            Painel de Produção Criativa
          </h1>
          <p className="text-xs text-[#73645B] mt-0.5">
            Planejamento regressivo e controle preventivo de entregas para designers e criadores.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onNavigateToToday}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#EDE4DA] bg-white hover:bg-[#FAF7F2] text-[#231815] shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-[#6A3102]" />
            <span>Ver Foco de Hoje</span>
          </button>

          <button
            onClick={onOpenNewTask}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#6A3102] hover:bg-[#542601] text-white shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Demanda</span>
          </button>
        </div>
      </div>

      {/* 2. Primary Risk Gauge Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#EDE4DA] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#8C7A70] uppercase tracking-wider">
                Termômetro de Risco do Cronograma:
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${riskConfig.bg} ${riskConfig.text} border ${riskConfig.border}`}
              >
                {riskConfig.label.toUpperCase()}
              </span>
            </div>
            <p className="text-sm font-semibold text-[#231815] max-w-2xl leading-relaxed">
              {tasks.length === 0
                ? 'Pronto para iniciar. Cadastre sua primeira demanda para calcular o cronograma inteligente e a margem de segurança.'
                : riskDiagnoses[overallRisk]}
            </p>
          </div>

          <div className="w-full md:w-64 space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono text-[#8C7A70]">
              <span>Segurança</span>
              <span>Crítico</span>
            </div>
            <div className="h-2.5 w-full bg-[#EAE2D8] rounded-full overflow-hidden flex">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  overallRisk === 'low'
                    ? 'w-1/4 bg-emerald-500'
                    : overallRisk === 'medium'
                    ? 'w-2/4 bg-amber-500'
                    : overallRisk === 'high'
                    ? 'w-3/4 bg-orange-500'
                    : 'w-full bg-red-600 animate-pulse'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Metrics Grid (Requested items) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Tarefas Hoje */}
        <div
          onClick={onNavigateToToday}
          className="p-3.5 rounded-xl bg-white border border-[#EDE4DA] hover:border-[#6A3102] transition-colors cursor-pointer shadow-xs"
        >
          <span className="text-[11px] font-medium text-[#8C7A70] block truncate">
            Tarefas p/ Hoje
          </span>
          <span className="text-xl font-bold font-mono text-[#6A3102] block mt-0.5">
            {tasksForToday.length}
          </span>
          <span className="text-[10px] text-[#8C7A70] flex items-center gap-1 mt-1">
            <span>Ver agenda</span>
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>

        {/* Tarefas Atrasadas */}
        <div
          className={`p-3.5 rounded-xl border transition-colors shadow-xs ${
            overdueTasks.length > 0
              ? 'bg-red-50/70 border-red-200 text-red-900'
              : 'bg-white border-[#EDE4DA]'
          }`}
        >
          <span className="text-[11px] font-medium text-[#8C7A70] block truncate">
            Atrasadas
          </span>
          <span
            className={`text-xl font-bold font-mono block mt-0.5 ${
              overdueTasks.length > 0 ? 'text-red-700' : 'text-[#231815]'
            }`}
          >
            {overdueTasks.length}
          </span>
          <span className="text-[10px] text-[#8C7A70] block mt-1">
            {overdueTasks.length > 0 ? 'Ação imediata' : 'Nenhuma atrasada'}
          </span>
        </div>

        {/* Próximos Prazos */}
        <div className="p-3.5 rounded-xl bg-white border border-[#EDE4DA] shadow-xs">
          <span className="text-[11px] font-medium text-[#8C7A70] block truncate">
            Prazos em 3d
          </span>
          <span className="text-xl font-bold font-mono text-[#231815] block mt-0.5">
            {nearDeadlineTasks.length}
          </span>
          <span className="text-[10px] text-[#8C7A70] block mt-1">Próximos dias</span>
        </div>

        {/* Aguardando Aprovação */}
        <div
          onClick={onNavigateToApprovals}
          className="p-3.5 rounded-xl bg-white border border-[#EDE4DA] hover:border-amber-400 transition-colors cursor-pointer shadow-xs"
        >
          <span className="text-[11px] font-medium text-[#8C7A70] block truncate">
            Em Aprovação
          </span>
          <span className="text-xl font-bold font-mono text-amber-700 block mt-0.5">
            {awaitingApprovalTasks.length}
          </span>
          <span className="text-[10px] text-[#8C7A70] flex items-center gap-1 mt-1">
            <span>Com clientes</span>
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>

        {/* Em Produção */}
        <div className="p-3.5 rounded-xl bg-white border border-[#EDE4DA] shadow-xs">
          <span className="text-[11px] font-medium text-[#8C7A70] block truncate">
            Em Produção
          </span>
          <span className="text-xl font-bold font-mono text-blue-700 block mt-0.5">
            {inProductionTasks.length}
          </span>
          <span className="text-[10px] text-[#8C7A70] block mt-1">Na esteira</span>
        </div>

        {/* Concluídas */}
        <div className="p-3.5 rounded-xl bg-white border border-[#EDE4DA] shadow-xs">
          <span className="text-[11px] font-medium text-[#8C7A70] block truncate">
            Concluídas
          </span>
          <span className="text-xl font-bold font-mono text-emerald-700 block mt-0.5">
            {completedTasks.length}
          </span>
          <span className="text-[10px] text-[#8C7A70] block mt-1">Entregues</span>
        </div>

        {/* % no Prazo */}
        <div className="p-3.5 rounded-xl bg-white border border-[#EDE4DA] shadow-xs">
          <span className="text-[11px] font-medium text-[#8C7A70] block truncate">
            % no Prazo
          </span>
          <span className="text-xl font-bold font-mono text-emerald-800 block mt-0.5">
            {onTimeRate}%
          </span>
          <span className="text-[10px] text-[#8C7A70] block mt-1">Pontualidade</span>
        </div>

        {/* Próximo Prazo Importante */}
        <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#EDE4DA] shadow-xs">
          <span className="text-[11px] font-medium text-[#8C7A70] block truncate">
            Próx. Entrega
          </span>
          <span className="text-xs font-bold font-mono text-[#231815] block mt-0.5 truncate">
            {nextCrucial ? nextCrucial.client : '—'}
          </span>
          <span className="text-[10px] font-mono text-[#6A3102] block mt-1">
            {nextCrucial ? formatReadableDate(nextCrucial.deadlineDate, false) : 'Livre'}
          </span>
        </div>
      </div>

      {/* 4. Filter & Search Controls */}
      <div className="bg-white p-4 rounded-xl border border-[#EDE4DA] flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#8C7A70] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por cliente, título ou formato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-[#EDE4DA] rounded-lg bg-[#FAF7F2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#6A3102] text-[#231815]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-[#EDE4DA] rounded-lg px-2.5 py-2 bg-[#FAF7F2] text-[#231815] font-medium"
          >
            <option value="all">Todos os Status</option>
            {Object.entries(TASK_STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="border border-[#EDE4DA] rounded-lg px-2.5 py-2 bg-[#FAF7F2] text-[#231815] font-medium"
          >
            <option value="all">Todas Prioridades</option>
            <option value="urgent">Urgente</option>
            <option value="high">Alta</option>
            <option value="normal">Normal</option>
            <option value="low">Baixa</option>
          </select>
        </div>
      </div>

      {/* 5. Main Task Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-[#5C4D44] uppercase tracking-wider">
            Todas as Demandas Cadastradas ({filteredTasks.length})
          </span>
          <span className="text-[11px] text-[#8C7A70]">
            Clique no card para abrir o cronograma detalhado
          </span>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-[#EDE4DA] text-center">
            {tasks.length === 0 ? (
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 rounded-xl bg-[#6A3102]/10 text-[#6A3102] flex items-center justify-center mx-auto">
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#231815]">Nenhuma demanda cadastrada</h3>
                <p className="text-xs text-[#73645B] leading-relaxed">
                  O seu painel está limpo e pronto para produção! Cadastre uma nova demanda para o sistema calcular automaticamente a linha do tempo, etapas de criação e margens de entrega.
                </p>
                <div className="pt-2">
                  <button
                    onClick={onOpenNewTask}
                    className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#6A3102] hover:bg-[#542601] text-white shadow-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Cadastrar Primeira Demanda</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#8C7A70]">Nenhuma demanda encontrada com estes filtros.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map((task) => {
              const statusCfg = TASK_STATUS_CONFIG[task.status];
              const priorityCfg = PRIORITY_CONFIG[task.priority];
              const urgency = getUrgencyBadge(task.deadlineDate, task.status);
              const completedStages = task.stages.filter((s) => s.completed).length;

              return (
                <div
                  key={task.id}
                  className="bg-white rounded-xl border border-[#EDE4DA] hover:border-[#6A3102]/40 transition-all p-4 shadow-xs flex flex-col justify-between space-y-3"
                >
                  {/* Top line: Client and Priority */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-[#8C7A70] uppercase truncate">
                        {task.client}
                      </span>
                      <span
                        className={`text-[11px] font-semibold ${priorityCfg.color} flex items-center gap-1 shrink-0`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot}`} />
                        {priorityCfg.label}
                      </span>
                    </div>

                    {/* Task Title */}
                    <h3
                      onClick={() => onSelectTask(task)}
                      className="font-bold text-sm text-[#231815] hover:text-[#6A3102] transition-colors cursor-pointer line-clamp-2"
                    >
                      {task.title}
                    </h3>
                  </div>

                  {/* Badges & Meta info */}
                  <div className="space-y-2 pt-1 border-t border-[#EDE4DA]/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#8C7A70]">Prazo Final:</span>
                      <span
                        className={`font-mono font-bold ${
                          urgency.variant === 'overdue'
                            ? 'text-red-700'
                            : urgency.variant === 'today'
                            ? 'text-orange-700'
                            : 'text-[#231815]'
                        }`}
                      >
                        {formatReadableDate(task.deadlineDate, false)} {task.deadlineTime}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#8C7A70]">Carga Estimada:</span>
                      <span className="font-mono text-[#5C4D44]">
                        {formatHours(task.estimatedProductionHours)} prod. + {formatHours(task.estimatedAdjustmentHours)} aj.
                      </span>
                    </div>

                    {/* Status & Urgency */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                      >
                        {statusCfg.label}
                      </span>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          urgency.variant === 'overdue'
                            ? 'bg-red-100 text-red-800'
                            : urgency.variant === 'today'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {urgency.label}
                      </span>
                    </div>

                    {/* Progress indicator */}
                    <div className="pt-1">
                      <div className="flex justify-between text-[10px] font-mono text-[#8C7A70] mb-1">
                        <span>Etapas</span>
                        <span>
                          {completedStages}/{task.stages.length} concluídas
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#EDE4DA] overflow-hidden">
                        <div
                          className="h-full bg-[#6A3102] transition-all"
                          style={{
                            width: `${(completedStages / (task.stages.length || 1)) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="pt-2 border-t border-[#EDE4DA] flex items-center justify-between gap-2 text-xs">
                    <button
                      onClick={() => onOpenReschedule(task)}
                      title="Replanejar se atrasar"
                      className="text-[#73645B] hover:text-[#6A3102] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Replanejar</span>
                    </button>

                    <button
                      onClick={() => onSelectTask(task)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#6A3102] hover:bg-[#FAF7F2] rounded-lg border border-[#EDE4DA] flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver Cronograma</span>
                    </button>
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
