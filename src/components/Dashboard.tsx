import React, { useState, useMemo } from 'react';
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
  Sparkles,
  User,
  Users,
  FolderKanban,
  Flame,
  CheckSquare,
  AlertCircle,
  Package,
  Layers,
  RotateCw
} from 'lucide-react';
import { Task, TaskStatus, Priority, RiskLevel, UserSettings, WorkGroup, Deliverable } from '../types';
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
  RISK_LEVEL_CONFIG
} from '../utils/statusConfig';
import { findSpecialty, getCategories } from '../data/categoriesData';
import { loadCachedWorkgroups, getActiveGroupId } from '../services/firestoreService';
import { calculateDeliverablesProgress, getAllTaskAssignees } from '../utils/deliverableUtils';

interface DashboardProps {
  tasks: Task[];
  settings: UserSettings;
  overallRisk: RiskLevel;
  workgroups?: WorkGroup[];
  activeGroupId?: string;
  onSelectTask: (task: Task) => void;
  onOpenNewTask: () => void;
  onOpenReschedule: (task: Task) => void;
  onRepeatTask?: (task: Task) => void;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onToggleStageCompleted: (taskId: string, stageId: string) => void;
  onUpdateTaskDeliverables?: (taskId: string, deliverables: Deliverable[]) => void;
  onNavigateToToday: () => void;
  onNavigateToApprovals: () => void;
  onNavigateToTeam?: () => void;
  initialMemberFilter?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  tasks,
  settings,
  overallRisk,
  workgroups: propWorkgroups,
  activeGroupId: propActiveGroupId,
  onSelectTask,
  onOpenNewTask,
  onOpenReschedule,
  onRepeatTask,
  onUpdateStatus,
  onToggleStageCompleted,
  onUpdateTaskDeliverables,
  onNavigateToToday,
  onNavigateToApprovals,
  onNavigateToTeam,
  initialMemberFilter = 'all'
}) => {
  const today = getTodayISO();
  const workgroups = propWorkgroups !== undefined ? propWorkgroups : loadCachedWorkgroups();
  const activeGroupId = propActiveGroupId || getActiveGroupId();
  const activeGroup = workgroups.find((g) => g.id === activeGroupId) || workgroups[0];

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTabFilter, setActiveTabFilter] = useState<
    'all' | 'in_production' | 'awaiting_approval' | 'overdue' | 'completed'
  >('all');
  const [memberFilter, setMemberFilter] = useState<string>(initialMemberFilter);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // View mode: 'demands' (demandas principais) vs 'deliverables' (entregáveis individuais)
  const [viewMode, setViewMode] = useState<'demands' | 'deliverables'>('demands');

  // KPI Calculations
  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'delivered' && t.status !== 'finalized'),
    [tasks]
  );
  const completedTasks = useMemo(
    () => tasks.filter((t) => t.status === 'delivered' || t.status === 'finalized'),
    [tasks]
  );

  // 1. Tarefas de hoje (Tarefas com etapas marcadas para hoje OU com prazo hoje)
  const todayTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.status === 'delivered' || t.status === 'finalized') return false;
      const hasStageToday = t.stages.some((s) => s.date === today && !s.completed);
      const isDueToday = t.deadlineDate === today;
      const hasDeliverableToday = t.deliverables?.some(
        (d) => d.deadlineDate === today && !d.completed && d.status !== 'delivered' && d.status !== 'finalized'
      );
      return hasStageToday || isDueToday || hasDeliverableToday;
    });
  }, [tasks, today]);

  // 2. Demandas em produção
  const inProductionTasks = useMemo(
    () => activeTasks.filter((t) => t.status === 'in_production' || t.status === 'in_review' || t.status === 'in_adjustments'),
    [activeTasks]
  );

  // 3. Demandas aguardando aprovação
  const awaitingApprovalTasks = useMemo(
    () => activeTasks.filter((t) => t.status === 'awaiting_approval' || t.status === 'sent_for_approval'),
    [activeTasks]
  );

  // 4. Próximos prazos (próximos 3 dias)
  const upcomingDeadlinesTasks = useMemo(() => {
    return activeTasks.filter((t) => {
      const diff = getDiffInDays(today, t.deadlineDate);
      return diff >= 0 && diff <= 3;
    });
  }, [activeTasks, today]);

  // 5. Tarefas atrasadas
  const overdueTasks = useMemo(() => {
    return activeTasks.filter((t) => getDiffInDays(today, t.deadlineDate) < 0);
  }, [activeTasks, today]);

  // Next crucial task
  const nextCrucial = useMemo(() => {
    const sorted = [...activeTasks].sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate));
    return sorted[0];
  }, [activeTasks]);

  // Filtered task list
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Tab filter
      if (activeTabFilter === 'in_production') {
        if (task.status !== 'in_production' && task.status !== 'in_review' && task.status !== 'in_adjustments')
          return false;
      } else if (activeTabFilter === 'awaiting_approval') {
        if (task.status !== 'awaiting_approval' && task.status !== 'sent_for_approval') return false;
      } else if (activeTabFilter === 'overdue') {
        const isOverdue = getDiffInDays(today, task.deadlineDate) < 0 && task.status !== 'delivered' && task.status !== 'finalized';
        if (!isOverdue) return false;
      } else if (activeTabFilter === 'completed') {
        if (task.status !== 'delivered' && task.status !== 'finalized') return false;
      }

      // Member filter (Checks main assignee, collaborator or any deliverable assignee)
      if (memberFilter !== 'all') {
        const qMember = memberFilter.toLowerCase();
        const matchesMain = task.assignee.toLowerCase().includes(qMember);
        const matchesCollab = task.collaborators?.some((c) => c.toLowerCase().includes(qMember));
        const matchesDeliv = task.deliverables?.some((d) => d.assignee.toLowerCase().includes(qMember));
        if (!matchesMain && !matchesCollab && !matchesDeliv) return false;
      }

      // Category filter
      if (categoryFilter !== 'all') {
        if (task.category !== categoryFilter && task.type !== categoryFilter) return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesClient = task.client.toLowerCase().includes(q);
        const matchesProject = task.project?.toLowerCase().includes(q);
        const matchesSpecialty = task.specialty?.toLowerCase().includes(q);
        const matchesAssignee = task.assignee.toLowerCase().includes(q);
        const matchesDeliverable = task.deliverables?.some(
          (d) =>
            d.title.toLowerCase().includes(q) ||
            d.specialty.toLowerCase().includes(q) ||
            d.assignee.toLowerCase().includes(q)
        );
        if (!matchesTitle && !matchesClient && !matchesProject && !matchesSpecialty && !matchesAssignee && !matchesDeliverable) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, activeTabFilter, memberFilter, categoryFilter, priorityFilter, searchTerm, today]);

  // Flattened deliverables for individual deliverable view
  const individualDeliverables = useMemo(() => {
    const list: Array<{ deliverable: Deliverable; parentTask: Task }> = [];
    for (const t of filteredTasks) {
      if (t.deliverables && t.deliverables.length > 0) {
        for (const d of t.deliverables) {
          // If member filter is active, only show deliverable for that member
          if (memberFilter !== 'all') {
            if (!d.assignee.toLowerCase().includes(memberFilter.toLowerCase())) continue;
          }
          list.push({ deliverable: d, parentTask: t });
        }
      }
    }
    return list;
  }, [filteredTasks, memberFilter]);

  // Total deliverables across all tasks
  const totalDeliverablesCount = useMemo(() => {
    return tasks.reduce((acc, t) => acc + (t.deliverables?.length || 0), 0);
  }, [tasks]);

  // Helper to extract next action from stages or deliverables
  const getNextAction = (task: Task) => {
    const uncompleted = task.stages.find((s) => !s.completed);
    if (!uncompleted) {
      return task.status === 'delivered' || task.status === 'finalized'
        ? 'Demanda concluída'
        : 'Revisão final / Pronta para entrega';
    }
    return `${uncompleted.title} (${uncompleted.startTime || '09:00'})`;
  };

  // Toggle deliverable completed from dashboard
  const handleToggleDeliverable = (parentTask: Task, delivId: string) => {
    if (!parentTask.deliverables || !onUpdateTaskDeliverables) return;
    const updated = parentTask.deliverables.map((d) => {
      if (d.id !== delivId) return d;
      const isDone = !d.completed;
      return {
        ...d,
        completed: isDone,
        status: isDone ? ('finalized' as TaskStatus) : ('todo' as TaskStatus)
      };
    });
    onUpdateTaskDeliverables(parentTask.id, updated);
  };

  const categories = getCategories();

  return (
    <div className="space-y-6 text-[#231815]">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-[#231815] tracking-tight">
            Dashboard de Produção
          </h1>
          <p className="text-xs text-[#73645B] mt-0.5">
            Visão clara do que fazer hoje, prazos, entregáveis e responsabilidades da equipe
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onNavigateToTeam && (
            <button
              onClick={onNavigateToTeam}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-[#EDE4DA] hover:bg-[#FAF7F2] text-[#231815] shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-[#6A3102]" />
              <span>Ver Equipe ({activeGroup?.members.length || 1})</span>
            </button>
          )}

          <button
            onClick={onOpenNewTask}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#6A3102] hover:bg-[#542601] text-white shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Demanda</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary Metrics Cards (Requested: Resumo do Dashboard) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Tarefas de Hoje */}
        <div
          onClick={onNavigateToToday}
          className="bg-white p-4 rounded-xl border border-[#EDE4DA] hover:border-[#6A3102]/50 transition-all cursor-pointer shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-[#8C7A70] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Minha Produção Hoje</span>
            <div className="w-6 h-6 rounded-md bg-[#6A3102]/10 text-[#6A3102] flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-[#231815]">{todayTasks.length}</span>
            <span className="text-[11px] text-[#73645B] block mt-0.5">demanda(s) ativas hoje</span>
          </div>
        </div>

        {/* Card 2: Em Produção */}
        <div
          onClick={() => setActiveTabFilter('in_production')}
          className="bg-white p-4 rounded-xl border border-[#EDE4DA] hover:border-[#6A3102]/50 transition-all cursor-pointer shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-[#8C7A70] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Em Produção</span>
            <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-800 flex items-center justify-center">
              <Play className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-[#231815]">
              {inProductionTasks.length}
            </span>
            <span className="text-[11px] text-[#73645B] block mt-0.5">em criação ou revisão</span>
          </div>
        </div>

        {/* Card 3: Aguardando Aprovação */}
        <div
          onClick={onNavigateToApprovals}
          className="bg-white p-4 rounded-xl border border-[#EDE4DA] hover:border-[#6A3102]/50 transition-all cursor-pointer shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-[#8C7A70] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Aguardando Aprovação</span>
            <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-900 flex items-center justify-center">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-amber-900">
              {awaitingApprovalTasks.length}
            </span>
            <span className="text-[11px] text-[#73645B] block mt-0.5">com clientes ou gestor</span>
          </div>
        </div>

        {/* Card 4: Próximos Prazos */}
        <div
          onClick={() => setActiveTabFilter('all')}
          className="bg-white p-4 rounded-xl border border-[#EDE4DA] hover:border-[#6A3102]/50 transition-all cursor-pointer shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-[#8C7A70] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Próximos Prazos</span>
            <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-900 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-[#231815]">
              {upcomingDeadlinesTasks.length}
            </span>
            <span className="text-[11px] text-[#73645B] block mt-0.5">vencem nos próx. 3 dias</span>
          </div>
        </div>

        {/* Card 5: Tarefas Atrasadas */}
        <div
          onClick={() => setActiveTabFilter('overdue')}
          className={`bg-white p-4 rounded-xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between ${
            overdueTasks.length > 0 ? 'border-red-300 bg-red-50/20' : 'border-[#EDE4DA]'
          }`}
        >
          <div className="flex items-center justify-between text-[#8C7A70] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-700">
              Tarefas Atrasadas
            </span>
            <div className="w-6 h-6 rounded-md bg-red-100 text-red-800 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span
              className={`text-2xl font-bold font-mono ${
                overdueTasks.length > 0 ? 'text-red-700' : 'text-[#231815]'
              }`}
            >
              {overdueTasks.length}
            </span>
            <span className="text-[11px] text-[#73645B] block mt-0.5">
              {overdueTasks.length > 0 ? 'necessitam replanejamento' : 'nenhum atraso!'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. ÁREA DESTAQUE: "MINHA PRODUÇÃO DE HOJE" (Requested in prompt) */}
      <div className="bg-white rounded-2xl border border-[#EDE4DA] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EDE4DA] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#6A3102]/10 text-[#6A3102] flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#231815]">
                MINHA PRODUÇÃO DE HOJE
              </h2>
              <span className="text-xs text-[#73645B]">
                {formatReadableDate(today, true)} · {todayTasks.length} demanda(s) em foco
              </span>
            </div>
          </div>

          <button
            onClick={onNavigateToToday}
            className="text-xs font-semibold text-[#6A3102] hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>Abrir Cronograma do Dia</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todayTasks.length === 0 ? (
          <div className="p-8 text-center bg-[#FAF7F2]/60 rounded-xl border border-dashed border-[#EDE4DA]">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <h3 className="text-xs font-bold text-[#231815]">Pauta de hoje em dia!</h3>
            <p className="text-xs text-[#73645B] mt-0.5 max-w-sm mx-auto">
              Nenhuma etapa urgente agendada para hoje. Você pode adiantar demandas futuras ou cadastrar novos trabalhos.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {todayTasks.map((task) => {
              const priorityCfg = PRIORITY_CONFIG[task.priority];
              const urgency = getUrgencyBadge(task.deadlineDate, task.status);
              const nextActionText = getNextAction(task);
              const todayStage = task.stages.find((s) => s.date === today && !s.completed);
              const allAssignees = getAllTaskAssignees(task);

              return (
                <div
                  key={`today-${task.id}`}
                  className="p-4 rounded-xl border border-[#EDE4DA] bg-[#FAF7F2]/40 hover:bg-[#FAF7F2] hover:border-[#6A3102]/40 transition-all flex flex-col justify-between space-y-3 shadow-2xs"
                >
                  <div>
                    {/* Top: Client/Project & Priority */}
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-[#8C7A70] uppercase truncate">
                        {task.client} {task.project ? `(${task.project})` : ''}
                      </span>
                      <span className={`text-[10px] font-semibold ${priorityCfg.color} flex items-center gap-1`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot}`} />
                        {priorityCfg.label}
                      </span>
                    </div>

                    {/* Task Title */}
                    <h3
                      onClick={() => onSelectTask(task)}
                      className="font-bold text-sm text-[#231815] hover:text-[#6A3102] transition-colors cursor-pointer line-clamp-1"
                    >
                      {task.title}
                    </h3>

                    {/* Specialty & Schedule badge */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#EDE4DA] text-[#4A3B32]">
                        {task.specialty || task.type}
                      </span>
                      {todayStage && (
                        <span className="text-[10px] font-mono text-[#6A3102] font-semibold flex items-center gap-1 bg-[#6A3102]/10 px-2 py-0.5 rounded">
                          <Clock className="w-2.5 h-2.5" />
                          {todayStage.startTime} - {todayStage.endTime}
                        </span>
                      )}
                    </div>

                    {/* Entregáveis chips if any */}
                    {task.deliverables && task.deliverables.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {task.deliverables.map((d) => (
                          <span
                            key={d.id}
                            className={`text-[9px] px-1.5 py-0.5 rounded font-medium border ${
                              d.completed || d.status === 'delivered' || d.status === 'finalized'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 line-through'
                                : 'bg-white text-[#6A3102] border-[#EDE4DA]'
                            }`}
                          >
                            {d.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Highlighted Next Action (Requested: Próxima Ação) */}
                  <div className="p-2.5 rounded-lg bg-white border border-[#EDE4DA] text-xs space-y-1">
                    <span className="text-[10px] font-bold text-[#8C7A70] uppercase tracking-wider block">
                      Próxima Ação:
                    </span>
                    <div className="flex items-center gap-2 text-[#231815] font-semibold text-xs">
                      <Play className="w-3 h-3 text-[#6A3102] shrink-0 fill-[#6A3102]" />
                      <span className="truncate">{nextActionText}</span>
                    </div>
                  </div>

                  {/* Bottom: Assignee, Status & Action button */}
                  <div className="pt-2 border-t border-[#EDE4DA]/70 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-[#5C4D44] truncate">
                      <User className="w-3.5 h-3.5 text-[#8C7A70]" />
                      <span className="font-medium truncate">{allAssignees.join(', ')}</span>
                    </div>

                    <button
                      onClick={() => onSelectTask(task)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#6A3102] hover:bg-white rounded-lg border border-[#EDE4DA] flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Detalhes</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Filter & Search Controls */}
      <div className="bg-white p-4 rounded-xl border border-[#EDE4DA] space-y-3 shadow-xs">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'Todas as Demandas', count: tasks.length },
            { id: 'in_production', label: 'Em Produção', count: inProductionTasks.length },
            { id: 'awaiting_approval', label: 'Aguardando Aprovação', count: awaitingApprovalTasks.length },
            { id: 'overdue', label: 'Atrasadas', count: overdueTasks.length },
            { id: 'completed', label: 'Concluídas', count: completedTasks.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTabFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTabFilter === tab.id
                  ? 'bg-[#6A3102] text-white shadow-2xs font-semibold'
                  : 'bg-[#FAF7F2] text-[#73645B] hover:text-[#231815] hover:bg-[#EDE4DA]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTabFilter === tab.id ? 'bg-white/20 text-white' : 'bg-[#EDE4DA] text-[#4A3B32]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Secondary filters: Search, Member, Category, Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-[#EDE4DA] text-xs">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C7A70]" />
            <input
              type="text"
              placeholder="Buscar demanda, cliente, entregável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-[#EDE4DA] rounded-lg bg-[#FAF7F2] text-[#231815] placeholder-[#8C7A70] focus:outline-none focus:ring-1 focus:ring-[#6A3102]"
            />
          </div>

          {/* Filter by Member */}
          <select
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            className="border border-[#EDE4DA] rounded-lg px-2.5 py-2 bg-[#FAF7F2] text-[#231815] font-medium"
          >
            <option value="all">Todos os Integrantes da Equipe</option>
            {activeGroup?.members.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name} ({m.specialty})
              </option>
            ))}
          </select>

          {/* Filter by Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-[#EDE4DA] rounded-lg px-2.5 py-2 bg-[#FAF7F2] text-[#231815] font-medium"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Filter by Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="border border-[#EDE4DA] rounded-lg px-2.5 py-2 bg-[#FAF7F2] text-[#231815] font-medium"
          >
            <option value="all">Todas as Prioridades</option>
            <option value="urgent">Urgente</option>
            <option value="high">Alta</option>
            <option value="normal">Normal</option>
            <option value="low">Baixa</option>
          </select>
        </div>
      </div>

      {/* 5. Main Demands Grid or Individual Deliverables Grid with Mode Toggle */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-1 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#5C4D44] uppercase tracking-wider">
              {viewMode === 'demands'
                ? `Demandas Principais (${filteredTasks.length})`
                : `Entregáveis Individuais (${individualDeliverables.length})`}
            </span>
            <span className="text-[11px] text-[#8C7A70] hidden sm:inline">
              · {viewMode === 'demands' ? 'Visão consolidada com chips de entregáveis' : 'Cada trabalho em card individual'}
            </span>
          </div>

          {/* View mode toggle: Demandas Principais vs Entregáveis Individuais */}
          <div className="flex items-center bg-[#FAF7F2] p-0.5 rounded-lg border border-[#EDE4DA] text-xs self-start sm:self-auto">
            <button
              onClick={() => setViewMode('demands')}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'demands'
                  ? 'bg-[#6A3102] text-white shadow-2xs'
                  : 'text-[#73645B] hover:text-[#231815]'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>Demandas Principais</span>
            </button>
            <button
              onClick={() => setViewMode('deliverables')}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'deliverables'
                  ? 'bg-[#6A3102] text-white shadow-2xs'
                  : 'text-[#73645B] hover:text-[#231815]'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Entregáveis Individuais</span>
            </button>
          </div>
        </div>

        {/* View Mode: DEMANDAS PRINCIPAIS */}
        {viewMode === 'demands' && (
          <>
            {filteredTasks.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-[#EDE4DA] text-center shadow-xs">
                {tasks.length === 0 ? (
                  <div className="max-w-md mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-[#6A3102]/10 text-[#6A3102] flex items-center justify-center mx-auto">
                      <Plus className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-[#231815]">Nenhuma demanda cadastrada</h3>
                    <p className="text-xs text-[#73645B] leading-relaxed">
                      Cadastre sua primeira demanda com múltiplos tipos de trabalho (como Carrossel, Story e Reels) para calcular automaticamente o cronograma inteligente!
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={onOpenNewTask}
                        className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#6A3102] hover:bg-[#542601] text-white shadow-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Cadastrar Demanda com Entregáveis</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#8C7A70]">Nenhuma demanda encontrada com os filtros selecionados.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTasks.map((task) => {
                  const statusCfg = TASK_STATUS_CONFIG[task.status] || TASK_STATUS_CONFIG.todo;
                  const priorityCfg = PRIORITY_CONFIG[task.priority];
                  const urgency = getUrgencyBadge(task.deadlineDate, task.status);
                  const completedStages = task.stages.filter((s) => s.completed).length;
                  const nextAction = getNextAction(task);
                  const delivSummary = calculateDeliverablesProgress(task.deliverables);
                  const allAssignees = getAllTaskAssignees(task);

                  return (
                    <div
                      key={task.id}
                      className="bg-white rounded-2xl border border-[#EDE4DA] hover:border-[#6A3102]/40 transition-all p-5 shadow-xs flex flex-col justify-between space-y-3.5 group"
                    >
                      {/* Top: Client/Project & Priority */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-bold text-[#8C7A70] uppercase truncate">
                            {task.client} {task.project ? `(${task.project})` : ''}
                          </span>
                          <span className={`text-[11px] font-semibold ${priorityCfg.color} flex items-center gap-1 shrink-0`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot}`} />
                            {priorityCfg.label}
                          </span>
                        </div>

                        {/* Task Title */}
                        <h3
                          onClick={() => onSelectTask(task)}
                          className="font-bold text-sm text-[#231815] group-hover:text-[#6A3102] transition-colors cursor-pointer line-clamp-2 leading-snug"
                        >
                          {task.title}
                        </h3>

                        {/* Specialty & Equipe & Recurrence */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#EDE4DA] text-[#4A3B32]">
                            {task.specialty || task.type}
                          </span>
                          <div className="flex items-center gap-1 text-[11px] text-[#73645B]">
                            <Users className="w-3 h-3 text-[#8C7A70]" />
                            <span className="truncate">{allAssignees.join(', ')}</span>
                          </div>
                          {task.recurrence && task.recurrence !== 'none' && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#6A3102]/10 text-[#6A3102] flex items-center gap-1 border border-[#6A3102]/20">
                              <RotateCw className="w-2.5 h-2.5" />
                              <span>
                                {task.recurrence === 'weekly'
                                  ? 'Semanal'
                                  : task.recurrence === 'biweekly'
                                  ? 'Quinzenal'
                                  : 'Mensal'}
                              </span>
                            </span>
                          )}
                          {task.repeatedFromTaskId && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                              Ciclo Replicado
                            </span>
                          )}
                        </div>

                        {/* Entregáveis Chips (Requested in prompt: [Carrossel] [Story] [Reels]) */}
                        {task.deliverables && task.deliverables.length > 0 && (
                          <div className="pt-2.5 mt-2 border-t border-[#EDE4DA]/60 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] text-[#8C7A70] uppercase tracking-wider font-bold">
                              <span>Entregáveis ({task.deliverables.length})</span>
                              <span className="text-[#6A3102] font-semibold">
                                {delivSummary.completed}/{delivSummary.total} concluídos
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              {task.deliverables.map((d) => {
                                const isDone = d.completed || d.status === 'delivered' || d.status === 'finalized';
                                return (
                                  <span
                                    key={d.id}
                                    className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${
                                      isDone
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 line-through'
                                        : 'bg-[#FAF7F2] border-[#EDE4DA] text-[#231815]'
                                    }`}
                                  >
                                    {d.title}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Summary & Next Action */}
                      <div className="space-y-2 pt-2 border-t border-[#EDE4DA]/60 text-xs">
                        {/* Next Action Box */}
                        <div className="p-2.5 rounded-lg bg-[#FAF7F2] border border-[#EDE4DA]/80">
                          <span className="text-[10px] font-bold text-[#8C7A70] uppercase tracking-wider block">
                            Próxima Ação:
                          </span>
                          <span className="font-semibold text-xs text-[#231815] block truncate mt-0.5">
                            {nextAction}
                          </span>
                        </div>

                        {/* Prazo & Status */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[#8C7A70]">Prazo Final:</span>
                          <span
                            className={`font-mono font-bold ${
                              urgency.variant === 'overdue'
                                ? 'text-red-700'
                                : urgency.variant === 'today'
                                ? 'text-amber-800'
                                : 'text-[#231815]'
                            }`}
                          >
                            {formatReadableDate(task.deadlineDate, false)} {task.deadlineTime}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-0.5">
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

                        {/* Progress Bar (Entregáveis ou Etapas) */}
                        <div className="pt-1">
                          <div className="flex justify-between text-[10px] font-mono text-[#8C7A70] mb-1">
                            <span>
                              {task.deliverables?.length ? 'Progresso dos entregáveis' : 'Progresso das etapas'}
                            </span>
                            <span>
                              {task.deliverables?.length
                                ? `${delivSummary.completed}/${delivSummary.total} (${delivSummary.progressPercent}%)`
                                : `${completedStages}/${task.stages.length}`}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#EDE4DA] overflow-hidden">
                            <div
                              className="h-full bg-[#6A3102] transition-all rounded-full"
                              style={{
                                width: `${task.deliverables?.length ? delivSummary.progressPercent : task.stages.length ? Math.round((completedStages / task.stages.length) * 100) : 0}%`
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Actions Row */}
                      <div className="pt-2 border-t border-[#EDE4DA] flex items-center justify-between gap-1.5 text-xs">
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => onOpenReschedule(task)}
                            title="Replanejar cronograma"
                            className="text-[#73645B] hover:text-[#6A3102] flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Replanejar</span>
                          </button>

                          {onRepeatTask && (
                            <button
                              onClick={() => onRepeatTask(task)}
                              title="Repetir demanda (novo ciclo com cronograma inteligente)"
                              className="text-[#73645B] hover:text-[#6A3102] flex items-center gap-1 transition-colors cursor-pointer font-medium"
                            >
                              <RotateCw className="w-3.5 h-3.5 text-[#6A3102]" />
                              <span>Repetir</span>
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => onSelectTask(task)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-[#6A3102] hover:bg-[#FAF7F2] rounded-lg border border-[#EDE4DA] flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Demanda</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* View Mode: ENTREGÁVEIS INDIVIDUAIS (Requested: permitir filtrar ou visualizar entregáveis individualmente) */}
        {viewMode === 'deliverables' && (
          <>
            {individualDeliverables.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-[#EDE4DA] text-center shadow-xs space-y-2">
                <Package className="w-8 h-8 text-[#8C7A70] mx-auto" />
                <h3 className="text-sm font-bold text-[#231815]">Nenhum entregável individual encontrado</h3>
                <p className="text-xs text-[#73645B]">
                  Cadastre tipos de trabalho nas demandas para visualizar cada entrega de forma separada nesta aba.
                </p>
                <button
                  onClick={onOpenNewTask}
                  className="px-4 py-2 text-xs font-semibold bg-[#6A3102] text-white rounded-lg inline-flex items-center gap-1 mt-2 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar Demanda com Entregáveis</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {individualDeliverables.map(({ deliverable: d, parentTask }) => {
                  const dStatus = TASK_STATUS_CONFIG[d.status] || TASK_STATUS_CONFIG.todo;
                  const isDone = d.completed || d.status === 'delivered' || d.status === 'finalized';
                  const urgency = getUrgencyBadge(d.deadlineDate, d.status);

                  return (
                    <div
                      key={`indiv-${d.id}`}
                      className={`p-4 rounded-xl border bg-white shadow-xs flex flex-col justify-between space-y-3 transition-all hover:border-[#6A3102]/50 ${
                        isDone ? 'opacity-75 bg-[#FAF7F2]/40' : ''
                      }`}
                    >
                      <div>
                        {/* Parent Demand Link */}
                        <div className="flex items-center justify-between gap-2 text-xs mb-1">
                          <span
                            onClick={() => onSelectTask(parentTask)}
                            className="font-bold text-[#8C7A70] uppercase truncate hover:text-[#6A3102] cursor-pointer"
                          >
                            {parentTask.client} › {parentTask.title}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
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

                        {/* Deliverable Title */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleDeliverable(parentTask, d.id)}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                              isDone
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-[#C8B8A6] hover:border-[#6A3102] bg-white'
                            }`}
                          >
                            {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                          <h3
                            onClick={() => onSelectTask(parentTask)}
                            className={`font-bold text-sm text-[#231815] hover:text-[#6A3102] cursor-pointer truncate ${
                              isDone ? 'line-through text-[#8C7A70]' : ''
                            }`}
                          >
                            {d.title}
                          </h3>
                        </div>

                        {/* Specialty Badge & Assignee */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#EDE4DA] text-[#4A3B32]">
                            {d.specialty}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-[#73645B]">
                            <User className="w-3 h-3 text-[#8C7A70]" />
                            <strong className="text-[#231815]">{d.assignee}</strong>
                          </span>
                        </div>

                        {d.description && (
                          <p className="text-[11px] text-[#8C7A70] italic mt-2 line-clamp-2">
                            {d.description}
                          </p>
                        )}
                      </div>

                      {/* Bottom Info: Prazo, Horas, Status */}
                      <div className="pt-2 border-t border-[#EDE4DA]/70 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-[#8C7A70] block">Prazo Individual:</span>
                          <span className="font-mono font-bold text-[#231815]">
                            {formatReadableDate(d.deadlineDate, false)} {d.deadlineTime || ''} ({d.estimatedHours}h)
                          </span>
                        </div>

                        <button
                          onClick={() => onSelectTask(parentTask)}
                          className="px-2.5 py-1 text-xs font-semibold text-[#6A3102] hover:bg-[#FAF7F2] rounded-lg border border-[#EDE4DA] flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Ver</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
