import React, { useState } from 'react';
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
  Check,
  Tag,
  Paperclip,
  MessageSquare,
  History,
  FileText,
  ListTodo,
  Layers,
  ChevronDown,
  ChevronUp,
  Plus,
  Send,
  ExternalLink,
  Sparkles,
  Package,
  Wrench,
  AlertCircle,
  RotateCw
} from 'lucide-react';
import {
  Task,
  TaskStage,
  TaskStatus,
  SubTask,
  TaskComment,
  TaskFile,
  Deliverable,
  Priority,
  WorkGroup,
  WorkGroupMember
} from '../types';
import { formatHours, formatReadableDate, getTodayISO, getUrgencyBadge } from '../utils/dateUtils';
import {
  TASK_STATUS_CONFIG,
  STAGE_TYPE_CONFIG,
  PRIORITY_CONFIG,
  RISK_LEVEL_CONFIG
} from '../utils/statusConfig';
import { FormattedDescription } from './FormattedDescription';
import { findSpecialty, getSpecialties } from '../data/categoriesData';
import { calculateDeliverablesProgress, getAllTaskAssignees } from '../utils/deliverableUtils';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  workgroups?: WorkGroup[];
  activeGroupId?: string;
  onToggleStageCompleted: (taskId: string, stageId: string) => void;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onOpenEdit: (task: Task) => void;
  onOpenReschedule: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onRepeatTask?: (task: Task) => void;
  onSyncGoogleCalendar?: (task: Task) => Promise<void>;
  onUpdateTaskDeliverables?: (taskId: string, deliverables: Deliverable[]) => void;
  onUpdateTaskSubtasks?: (taskId: string, subtasks: SubTask[]) => void;
  onUpdateTaskTeam?: (taskId: string, assignee: string, collaborators: string[]) => void;
  onAddMember?: (groupId: string, member: WorkGroupMember) => Promise<void>;
  onAddComment?: (taskId: string, commentText: string) => void;
  isGoogleConnected?: boolean;
  isSyncingCalendar?: boolean;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  workgroups = [],
  activeGroupId,
  onToggleStageCompleted,
  onUpdateStatus,
  onOpenEdit,
  onOpenReschedule,
  onDeleteTask,
  onRepeatTask,
  onSyncGoogleCalendar,
  onUpdateTaskDeliverables,
  onUpdateTaskSubtasks,
  onUpdateTaskTeam,
  onAddMember,
  onAddComment,
  isGoogleConnected = false,
  isSyncingCalendar = false
}) => {
  const [activeTab, setActiveTab] = useState<
    'resumo' | 'entregaveis' | 'descricao' | 'planejamento' | 'subtarefas' | 'arquivos' | 'comentarios' | 'historico'
  >('resumo');

  const specialties = getSpecialties();

  // Deliverables local state for inline add/edit
  const [isAddingDeliverable, setIsAddingDeliverable] = useState(false);
  const [editingDelivId, setEditingDelivId] = useState<string | null>(null);
  const [delivTitle, setDelivTitle] = useState('');
  const [delivSpecialty, setDelivSpecialty] = useState('Designer de Carrossel');
  const [delivCategory, setDelivCategory] = useState('design');
  const [delivAssignee, setDelivAssignee] = useState('');
  const [delivDeadline, setDelivDeadline] = useState('');
  const [delivDeadlineTime, setDelivDeadlineTime] = useState('18:00');
  const [delivHours, setDelivHours] = useState(2);
  const [delivDescription, setDelivDescription] = useState('');
  const [delivStatus, setDelivStatus] = useState<TaskStatus>('todo');

  // Subtask local additions
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskSpecialty, setNewSubtaskSpecialty] = useState('');

  // Comment local input
  const [commentInput, setCommentInput] = useState('');

  // New file input
  const [newFileName, setNewFileName] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');
  const [showAddFile, setShowAddFile] = useState(false);

  // Expanded stages toggle
  const [stagesExpanded, setStagesExpanded] = useState(false);

  // Inline team editor state
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [newTeamMemberName, setNewTeamMemberName] = useState('');
  const [newTeamMemberSpecialty, setNewTeamMemberSpecialty] = useState('Designer de Feed');

  if (!isOpen || !task) return null;

  const currentGroup =
    workgroups.find((g) => g.id === (task.groupId || activeGroupId)) || workgroups[0];
  const groupMembers = currentGroup?.members || [];

  const statusCfg = TASK_STATUS_CONFIG[task.status];
  const priorityCfg = PRIORITY_CONFIG[task.priority];
  const riskCfg = RISK_LEVEL_CONFIG[task.riskLevel];
  const urgency = getUrgencyBadge(task.deadlineDate, task.status);
  const specDef = findSpecialty(task.specialty);

  const completedStagesCount = task.stages.filter((s) => s.completed).length;
  const progressPercent = task.stages.length
    ? Math.round((completedStagesCount / task.stages.length) * 100)
    : 0;

  const deliverables = task.deliverables || [];
  const delivMetrics = calculateDeliverablesProgress(deliverables);
  const allAssignees = getAllTaskAssignees(task);

  // Deliverable actions
  const handleOpenAddDeliverable = () => {
    setEditingDelivId(null);
    setDelivTitle('');
    setDelivSpecialty('Designer de Carrossel');
    setDelivCategory('design');
    setDelivAssignee(task.assignee);
    setDelivDeadline(task.deadlineDate);
    setDelivDeadlineTime(task.deadlineTime || '18:00');
    setDelivHours(2);
    setDelivDescription('');
    setDelivStatus('todo');
    setIsAddingDeliverable(true);
  };

  const handleOpenEditDeliverable = (d: Deliverable) => {
    setEditingDelivId(d.id);
    setDelivTitle(d.title);
    setDelivSpecialty(d.specialty);
    setDelivCategory(d.category || 'design');
    setDelivAssignee(d.assignee);
    setDelivDeadline(d.deadlineDate || task.deadlineDate);
    setDelivDeadlineTime(d.deadlineTime || '18:00');
    setDelivHours(d.estimatedHours || 2);
    setDelivDescription(d.description || '');
    setDelivStatus(d.status || 'todo');
    setIsAddingDeliverable(true);
  };

  const handleSaveDeliverable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!delivTitle.trim()) return;

    let updated: Deliverable[];

    if (editingDelivId) {
      updated = deliverables.map((d) =>
        d.id === editingDelivId
          ? {
              ...d,
              title: delivTitle.trim(),
              specialty: delivSpecialty,
              category: delivCategory,
              assignee: delivAssignee.trim() || task.assignee,
              deadlineDate: delivDeadline,
              deadlineTime: delivDeadlineTime,
              estimatedHours: Number(delivHours) || 1,
              description: delivDescription.trim(),
              status: delivStatus,
              completed: delivStatus === 'delivered' || delivStatus === 'finalized' || delivStatus === 'approved'
            }
          : d
      );
    } else {
      const newD: Deliverable = {
        id: 'deliv-' + Date.now(),
        title: delivTitle.trim(),
        specialty: delivSpecialty,
        category: delivCategory,
        assignee: delivAssignee.trim() || task.assignee,
        deadlineDate: delivDeadline || task.deadlineDate,
        deadlineTime: delivDeadlineTime || '18:00',
        estimatedHours: Number(delivHours) || 1,
        description: delivDescription.trim(),
        status: delivStatus,
        completed: delivStatus === 'delivered' || delivStatus === 'finalized' || delivStatus === 'approved'
      };
      updated = [...deliverables, newD];
    }

    if (onUpdateTaskDeliverables) {
      onUpdateTaskDeliverables(task.id, updated);
    }
    setIsAddingDeliverable(false);
    setEditingDelivId(null);
  };

  const handleToggleDeliverableCompleted = (delivId: string) => {
    const updated = deliverables.map((d) => {
      if (d.id !== delivId) return d;
      const nextCompleted = !d.completed;
      const nextStatus: TaskStatus = nextCompleted ? 'finalized' : 'todo';
      return {
        ...d,
        completed: nextCompleted,
        status: nextStatus
      };
    });

    if (onUpdateTaskDeliverables) {
      onUpdateTaskDeliverables(task.id, updated);
    }
  };

  const handleUpdateDeliverableStatus = (delivId: string, newStatus: TaskStatus) => {
    const isDone = newStatus === 'delivered' || newStatus === 'finalized' || newStatus === 'approved';
    const updated = deliverables.map((d) =>
      d.id === delivId ? { ...d, status: newStatus, completed: isDone } : d
    );

    if (onUpdateTaskDeliverables) {
      onUpdateTaskDeliverables(task.id, updated);
    }
  };

  const handleDeleteDeliverable = (delivId: string) => {
    const updated = deliverables.filter((d) => d.id !== delivId);
    if (onUpdateTaskDeliverables) {
      onUpdateTaskDeliverables(task.id, updated);
    }
  };

  // Subtask toggle
  const handleToggleSubtask = (subId: string) => {
    const currentSubtasks = task.subtasks || [];
    const updated = currentSubtasks.map((s) =>
      s.id === subId ? { ...s, completed: !s.completed } : s
    );
    if (onUpdateTaskSubtasks) {
      onUpdateTaskSubtasks(task.id, updated);
    }
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    const currentSubtasks = task.subtasks || [];
    const newSub: SubTask = {
      id: 'sub-' + Date.now(),
      title: newSubtaskTitle.trim(),
      specialty: newSubtaskSpecialty || task.specialty || 'Geral',
      assignee: task.assignee,
      completed: false
    };
    const updated = [...currentSubtasks, newSub];
    if (onUpdateTaskSubtasks) {
      onUpdateTaskSubtasks(task.id, updated);
    }
    setNewSubtaskTitle('');
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    if (onAddComment) {
      onAddComment(task.id, commentInput.trim());
    }
    setCommentInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#EDE4DA] w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#231815]">
        {/* Top Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[#EDE4DA] bg-[#FAF7F2]">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              {/* Category, Specialty & Priority tags */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#8C7A70] uppercase tracking-wider">
                  {task.client}
                </span>
                {task.project && (
                  <>
                    <span className="text-[#8C7A70]">/</span>
                    <span className="text-xs font-semibold text-[#6A3102] bg-[#6A3102]/10 px-2 py-0.5 rounded">
                      {task.project}
                    </span>
                  </>
                )}
                <span className="text-[#8C7A70]">·</span>
                {task.specialty ? (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#EDE4DA] text-[#4A3B32] border border-[#DDD0C3]">
                    {task.specialty}
                  </span>
                ) : (
                  <span className="text-xs font-medium capitalize text-[#73645B]">{task.type}</span>
                )}
                <span className="text-[#8C7A70]">·</span>
                <span className={`text-xs font-semibold ${priorityCfg.color} flex items-center gap-1`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot}`} />
                  {priorityCfg.label}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold font-display text-[#231815] leading-snug">
                {task.title}
              </h2>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {onSyncGoogleCalendar && (
                <button
                  onClick={() => onSyncGoogleCalendar(task)}
                  disabled={isSyncingCalendar}
                  title="Sincronizar no Google Agenda"
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                    task.googleCalendarSyncedAt
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-white border-[#EDE4DA] text-[#6A3102] hover:bg-[#FAF7F2]'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-[#6A3102]" />
                  <span className="hidden sm:inline">
                    {isSyncingCalendar
                      ? 'Sincronizando...'
                      : task.googleCalendarSyncedAt
                      ? 'Sincronizado'
                      : 'Google Agenda'}
                  </span>
                </button>
              )}

              {onRepeatTask && (
                <button
                  onClick={() => onRepeatTask(task)}
                  title="Repetir demanda (novo ciclo)"
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[#EDE4DA] bg-white text-[#6A3102] hover:bg-[#FAF7F2] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <RotateCw className="w-3.5 h-3.5 text-[#6A3102]" />
                  <span className="hidden sm:inline">Repetir</span>
                </button>
              )}

              <button
                onClick={() => onOpenEdit(task)}
                title="Editar demanda completa"
                className="p-2 text-[#73645B] hover:text-[#231815] hover:bg-[#EDE4DA] rounded-lg transition-colors cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDeleteTask(task.id)}
                title="Excluir demanda"
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-[#73645B] hover:text-[#231815] hover:bg-[#EDE4DA] rounded-lg transition-colors cursor-pointer ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Status Bar */}
          <div className="mt-4 pt-3 border-t border-[#EDE4DA]/70 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#8C7A70] font-medium">Status da Demanda:</span>
              <select
                value={task.status}
                onChange={(e) => onUpdateStatus(task.id, e.target.value as TaskStatus)}
                className={`text-xs font-semibold border rounded-lg px-2.5 py-1 ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border} focus:outline-none`}
              >
                {Object.entries(TASK_STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k} className="bg-white text-[#231815]">
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 text-xs flex-wrap">
              <div className="flex items-center gap-1.5 text-[#5C4D44]">
                <User className="w-3.5 h-3.5 text-[#8C7A70]" />
                <span className="font-medium">Responsáveis:</span>
                <strong className="text-[#231815]">
                  {allAssignees.join(', ') || task.assignee}
                </strong>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[#8C7A70]">Prazo:</span>
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
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 mt-4 overflow-x-auto text-xs border-t border-[#EDE4DA]/60 pt-3">
            {[
              { id: 'resumo', label: 'Resumo', icon: Layers },
              {
                id: 'entregaveis',
                label: `Entregáveis (${deliverables.length})`,
                icon: Package,
                highlight: deliverables.length > 0
              },
              { id: 'descricao', label: 'Briefing & Descrição', icon: FileText },
              { id: 'planejamento', label: 'Planejamento', icon: Calendar },
              { id: 'subtarefas', label: `Subtarefas (${task.subtasks?.length || 0})`, icon: ListTodo },
              { id: 'arquivos', label: `Arquivos (${task.files?.length || 0})`, icon: Paperclip },
              { id: 'comentarios', label: `Comentários (${task.comments?.length || 0})`, icon: MessageSquare },
              { id: 'historico', label: 'Histórico', icon: History }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-[#6A3102] text-white font-semibold shadow-xs'
                      : 'text-[#73645B] hover:text-[#231815] hover:bg-[#EDE4DA]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white">
          {/* TAB 1: RESUMO */}
          {activeTab === 'resumo' && (
            <div className="space-y-6">
              {/* Deliverables summary widget if task has deliverables */}
              {deliverables.length > 0 && (
                <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#EDE4DA] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-[#6A3102]" />
                      <span className="font-bold text-[#5C4D44] uppercase tracking-wider text-[11px]">
                        Entregáveis da Demanda ({delivMetrics.summaryText})
                      </span>
                    </div>
                    <button
                      onClick={() => setActiveTab('entregaveis')}
                      className="text-xs text-[#6A3102] hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>Ver todos</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="w-full h-2 rounded-full bg-[#EAE2D8] overflow-hidden">
                    <div
                      className="h-full bg-[#6A3102] transition-all duration-300 rounded-full"
                      style={{ width: `${delivMetrics.progressPercent}%` }}
                    />
                  </div>

                  {/* Chips for deliverables */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {deliverables.map((d) => {
                      const dStatus = TASK_STATUS_CONFIG[d.status] || TASK_STATUS_CONFIG.todo;
                      const isDone = d.completed || d.status === 'delivered' || d.status === 'finalized';

                      return (
                        <div
                          key={d.id}
                          className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 transition-all ${
                            isDone
                              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                              : 'bg-white border-[#EDE4DA] text-[#231815]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleDeliverableCompleted(d.id)}
                            className={`w-4 h-4 rounded flex items-center justify-center border transition-colors cursor-pointer ${
                              isDone
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-[#C8B8A6] hover:border-[#6A3102] bg-white'
                            }`}
                          >
                            {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                          <strong className={isDone ? 'line-through text-emerald-800' : ''}>
                            {d.title}
                          </strong>
                          <span className="text-[10px] text-[#73645B]">({d.assignee})</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${dStatus.bg} ${dStatus.text}`}
                          >
                            {dStatus.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recorrência & Repetir Demanda Widget */}
              <div className="p-4 rounded-xl border border-[#EDE4DA] bg-[#FAF7F2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#6A3102]/10 text-[#6A3102] flex items-center justify-center shrink-0">
                    <RotateCw className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[#231815]">
                        Repetição da Demanda
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        task.recurrence && task.recurrence !== 'none'
                          ? 'bg-[#6A3102]/10 text-[#6A3102] font-semibold'
                          : 'bg-[#EDE4DA] text-[#73645B]'
                      }`}>
                        {task.recurrence === 'weekly'
                          ? '🔄 Recorrente: Semanal'
                          : task.recurrence === 'biweekly'
                          ? '🔄 Recorrente: Quinzenal'
                          : task.recurrence === 'monthly'
                          ? '🔄 Recorrente: Mensal'
                          : 'Demanda Única'}
                      </span>
                      {task.repeatedFromTaskId && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                          Novo Ciclo Replicado
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#73645B] mt-0.5">
                      Repita essa demanda para um novo período mantendo todos os entregáveis e recalculando automaticamente o cronograma sem sobreposições.
                    </p>
                  </div>
                </div>

                {onRepeatTask && (
                  <button
                    onClick={() => onRepeatTask(task)}
                    className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#6A3102] hover:bg-[#542601] text-white shadow-2xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Repetir Demanda Agora</span>
                  </button>
                )}
              </div>

              {/* Progress Overview Card for Stages */}
              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#EDE4DA]">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-[#5C4D44] uppercase tracking-wider text-[11px]">
                    Progresso das Etapas do Cronograma
                  </span>
                  <span className="font-mono text-[#6A3102] font-bold">
                    {completedStagesCount}/{task.stages.length} etapas ({progressPercent}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#EAE2D8] overflow-hidden">
                  <div
                    className="h-full bg-[#6A3102] transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Summary Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-[#EDE4DA] bg-white">
                  <span className="text-[11px] text-[#8C7A70] block font-medium">Cliente & Projeto</span>
                  <strong className="text-xs text-[#231815] block mt-1 truncate">
                    {task.client} {task.project ? `(${task.project})` : ''}
                  </strong>
                </div>

                <div className="p-3 rounded-xl border border-[#EDE4DA] bg-white">
                  <span className="text-[11px] text-[#8C7A70] block font-medium">Especialidade</span>
                  <strong className="text-xs text-[#231815] block mt-1 truncate">
                    {task.specialty || task.type}
                  </strong>
                </div>

                <div className="p-3 rounded-xl border border-[#EDE4DA] bg-white">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] text-[#8C7A70] block font-medium">Equipe</span>
                    {onUpdateTaskTeam && (
                      <button
                        type="button"
                        onClick={() => setIsEditingTeam(!isEditingTeam)}
                        className="text-[10px] font-semibold text-[#6A3102] hover:underline cursor-pointer"
                      >
                        {isEditingTeam ? 'Fechar' : '+ Acrescentar'}
                      </button>
                    )}
                  </div>
                  <strong className="text-xs text-[#231815] block mt-1 truncate">
                    {allAssignees.join(', ')}
                  </strong>
                </div>

                <div className="p-3 rounded-xl border border-[#EDE4DA] bg-white">
                  <span className="text-[11px] text-[#8C7A70] block font-medium">Risco Calculado</span>
                  <strong className={`text-xs block mt-1 ${riskCfg.text}`}>
                    {riskCfg.label}
                  </strong>
                </div>
              </div>

              {/* Inline Team Management Panel */}
              {isEditingTeam && onUpdateTaskTeam && (
                <div className="p-4 rounded-xl border border-[#6A3102]/30 bg-[#FAF7F2] space-y-3 animate-in fade-in duration-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#231815] block">
                        Gerenciar Equipe da Demanda
                      </span>
                      <span className="text-[11px] text-[#73645B]">
                        Clique nos integrantes do grupo ou adicione uma nova pessoa à equipe
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingTeam(false)}
                      className="text-[#8C7A70] hover:text-[#231815] p-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {groupMembers.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {groupMembers.map((m) => {
                        const isMain = task.assignee.trim().toLowerCase() === m.name.trim().toLowerCase();
                        const currentCollabs = task.collaborators || [];
                        const isCollab = currentCollabs.some(
                          (c) => c.trim().toLowerCase() === m.name.trim().toLowerCase()
                        );
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              if (isMain) return;
                              const nextCollabs = isCollab
                                ? currentCollabs.filter(
                                    (c) => c.trim().toLowerCase() !== m.name.trim().toLowerCase()
                                  )
                                : [...currentCollabs, m.name];
                              onUpdateTaskTeam(task.id, task.assignee, nextCollabs);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                              isMain
                                ? 'bg-[#6A3102] text-white border-[#6A3102]'
                                : isCollab
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold'
                                : 'bg-white text-[#5C4D44] border-[#EDE4DA] hover:border-[#6A3102]/50'
                            }`}
                          >
                            <User className="w-3 h-3" />
                            <span>{m.name}</span>
                            <span className="text-[10px] opacity-75">({m.specialty})</span>
                            {(isMain || isCollab) && <Check className="w-3 h-3" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-[#EDE4DA]">
                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        placeholder="Nome do novo integrante..."
                        value={newTeamMemberName}
                        onChange={(e) => setNewTeamMemberName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <select
                        value={newTeamMemberSpecialty}
                        onChange={(e) => setNewTeamMemberSpecialty(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                      >
                        {specialties.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = newTeamMemberName.trim();
                          if (!trimmed) return;
                          const currentCollabs = task.collaborators || [];
                          if (
                            !currentCollabs.some((c) => c.toLowerCase() === trimmed.toLowerCase()) &&
                            task.assignee.trim().toLowerCase() !== trimmed.toLowerCase()
                          ) {
                            onUpdateTaskTeam(task.id, task.assignee, [...currentCollabs, trimmed]);
                          }
                          const existsInGroup = groupMembers.some(
                            (m) => m.name.trim().toLowerCase() === trimmed.toLowerCase()
                          );
                          if (!existsInGroup && onAddMember && currentGroup) {
                            onAddMember(currentGroup.id, {
                              id: 'member-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                              name: trimmed,
                              email: `${trimmed.toLowerCase().replace(/\s+/g, '.')}@equipe.com`,
                              role: 'member',
                              specialty: newTeamMemberSpecialty
                            }).catch(() => {});
                          }
                          setNewTeamMemberName('');
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-[#6A3102] hover:bg-[#542601] text-white rounded-lg font-semibold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Acrescentar</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Briefing preview */}
              <div className="p-4 rounded-xl border border-[#EDE4DA] bg-[#FAF7F2]/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#5C4D44] uppercase tracking-wider">
                    Briefing / Descrição da Demanda
                  </span>
                  <button
                    onClick={() => setActiveTab('descricao')}
                    className="text-xs text-[#6A3102] hover:underline font-semibold"
                  >
                    Ver completa
                  </button>
                </div>
                <FormattedDescription
                  content={task.description}
                  className="max-h-28 overflow-y-auto pr-1"
                />
              </div>

              {/* Compact Timeline of Stages */}
              <div className="border border-[#EDE4DA] rounded-xl overflow-hidden bg-white">
                <div className="p-3.5 bg-[#FAF7F2] border-b border-[#EDE4DA] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#231815] block">
                      Linha do Tempo das Etapas ({task.stages.length})
                    </span>
                    <span className="text-[11px] text-[#8C7A70]">
                      Marque as etapas conforme for concluindo a produção
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenReschedule(task)}
                      className="text-xs text-[#6A3102] hover:text-[#542601] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Replanejar</span>
                    </button>
                    <button
                      onClick={() => setStagesExpanded(!stagesExpanded)}
                      className="p-1 text-[#73645B] hover:text-[#231815] rounded hover:bg-[#EDE4DA]"
                    >
                      {stagesExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className={`p-3 divide-y divide-[#EDE4DA]/60 space-y-2 ${stagesExpanded ? '' : 'max-h-64 overflow-y-auto'}`}>
                  {task.stages.map((stage, idx) => {
                    const cfg = STAGE_TYPE_CONFIG[stage.type] || {
                      label: stage.title,
                      badgeBg: 'bg-stone-100',
                      text: 'text-stone-700'
                    };
                    return (
                      <div
                        key={`stage-item-${stage.id || idx}`}
                        className={`pt-2 first:pt-0 flex items-start gap-3 transition-all ${
                          stage.completed ? 'opacity-65' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onToggleStageCompleted(task.id, stage.id)}
                          className={`w-5 h-5 rounded-md border mt-0.5 flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                            stage.completed
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-[#C8B8A6] hover:border-[#6A3102] bg-white'
                          }`}
                        >
                          {stage.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span
                              className={`text-xs font-semibold ${
                                stage.completed ? 'line-through text-[#8C7A70]' : 'text-[#231815]'
                              }`}
                            >
                              {stage.title}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cfg.badgeBg} ${cfg.text}`}>
                              {cfg.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] font-mono text-[#8C7A70] mt-0.5">
                            <span>{formatReadableDate(stage.date)}</span>
                            <span>·</span>
                            <span>{stage.startTime} – {stage.endTime}</span>
                            <span>·</span>
                            <span>{formatHours(stage.durationMinutes / 60)}</span>
                            {stage.assignee && (
                              <>
                                <span>·</span>
                                <span className="font-sans text-[#6A3102] font-semibold">{stage.assignee}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ENTREGÁVEIS (MÚLTIPLOS TIPOS DE TRABALHO) */}
          {activeTab === 'entregaveis' && (
            <div className="space-y-4">
              {/* Header with Metrics & Add Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#FAF7F2] border border-[#EDE4DA]">
                <div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#6A3102]" />
                    <h3 className="text-xs font-bold text-[#231815] uppercase tracking-wider">
                      Entregáveis Cadastrados ({deliverables.length})
                    </h3>
                  </div>
                  <p className="text-xs text-[#73645B] mt-0.5">
                    {delivMetrics.summaryText}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddDeliverable}
                  className="px-3.5 py-2 text-xs font-semibold bg-[#6A3102] hover:bg-[#542601] text-white rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Adicionar Entregável</span>
                </button>
              </div>

              {/* Inline Add / Edit Form */}
              {isAddingDeliverable && (
                <form
                  onSubmit={handleSaveDeliverable}
                  className="p-4 rounded-xl border-2 border-[#6A3102]/30 bg-white space-y-4 shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-[#EDE4DA] pb-2">
                    <span className="text-xs font-bold text-[#6A3102] uppercase tracking-wider">
                      {editingDelivId ? 'Editar Entregável' : 'Novo Tipo de Trabalho / Entregável'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingDeliverable(false)}
                      className="text-xs text-[#8C7A70] hover:text-[#231815]"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#5C4D44] mb-1">
                        Nome do Entregável <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Carrossel, Story, Reels, Poster..."
                        value={delivTitle}
                        onChange={(e) => setDelivTitle(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[#5C4D44] mb-1">
                        Especialidade / Função
                      </label>
                      <select
                        value={delivSpecialty}
                        onChange={(e) => setDelivSpecialty(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                      >
                        {specialties.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name} ({s.category})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#5C4D44] mb-1">
                        Responsável
                      </label>
                      <input
                        type="text"
                        placeholder="Nome do profissional"
                        value={delivAssignee}
                        onChange={(e) => setDelivAssignee(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[#5C4D44] mb-1">
                        Prazo individual
                      </label>
                      <input
                        type="date"
                        value={delivDeadline}
                        onChange={(e) => setDelivDeadline(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[#5C4D44] mb-1">
                        Tempo estimado (horas)
                      </label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={delivHours}
                        onChange={(e) => setDelivHours(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#5C4D44] mb-1">
                        Status do Entregável
                      </label>
                      <select
                        value={delivStatus}
                        onChange={(e) => setDelivStatus(e.target.value as TaskStatus)}
                        className="w-full px-2.5 py-1.5 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                      >
                        {Object.entries(TASK_STATUS_CONFIG).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[#5C4D44] mb-1">
                        Observações / Descrição específica
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Formato 9:16 vertical com 15 segundos"
                        value={delivDescription}
                        onChange={(e) => setDelivDescription(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#EDE4DA]">
                    <button
                      type="button"
                      onClick={() => setIsAddingDeliverable(false)}
                      className="px-3 py-1.5 text-xs text-[#73645B]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#6A3102] text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar Entregável</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Deliverables List */}
              {deliverables.length === 0 ? (
                <div className="p-8 text-center bg-[#FAF7F2]/60 rounded-xl border border-dashed border-[#EDE4DA] space-y-2">
                  <Package className="w-8 h-8 text-[#8C7A70] mx-auto" />
                  <h4 className="text-xs font-bold text-[#231815]">Nenhum entregável cadastrado</h4>
                  <p className="text-xs text-[#73645B] max-w-sm mx-auto">
                    Adicione múltiplos tipos de trabalho nesta mesma demanda para dividir a produção entre a equipe.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenAddDeliverable}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-[#6A3102] text-white rounded-lg inline-flex items-center gap-1 cursor-pointer mt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Primeiro Entregável</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#EDE4DA] border border-[#EDE4DA] rounded-xl bg-white overflow-hidden shadow-2xs">
                  {deliverables.map((d, idx) => {
                    const dStatus = TASK_STATUS_CONFIG[d.status] || TASK_STATUS_CONFIG.todo;
                    const isDone = d.completed || d.status === 'delivered' || d.status === 'finalized';

                    return (
                      <div
                        key={d.id || idx}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                          isDone ? 'bg-emerald-50/20' : 'hover:bg-[#FAF7F2]/40'
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                          {/* 1-click toggle complete checkbox */}
                          <button
                            type="button"
                            onClick={() => handleToggleDeliverableCompleted(d.id)}
                            title={isDone ? 'Marcar como pendente' : 'Marcar como concluído'}
                            className={`w-5 h-5 rounded-md border mt-0.5 sm:mt-0 flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                              isDone
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-[#C8B8A6] hover:border-[#6A3102] bg-white'
                            }`}
                          >
                            {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>

                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-bold text-sm ${isDone ? 'line-through text-[#8C7A70]' : 'text-[#231815]'}`}>
                                {d.title}
                              </span>
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#EDE4DA] text-[#4A3B32]">
                                {d.specialty}
                              </span>

                              {/* Quick status dropdown */}
                              <select
                                value={d.status}
                                onChange={(e) => handleUpdateDeliverableStatus(d.id, e.target.value as TaskStatus)}
                                className={`text-[10px] font-semibold border rounded px-1.5 py-0.5 ${dStatus.bg} ${dStatus.text} ${dStatus.border} focus:outline-none`}
                              >
                                {Object.entries(TASK_STATUS_CONFIG).map(([k, v]) => (
                                  <option key={k} value={k} className="bg-white text-[#231815]">
                                    {v.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-[#73645B] flex-wrap">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-[#8C7A70]" />
                                <strong>{d.assignee}</strong>
                              </span>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-[#8C7A70]" />
                                Prazo: {formatReadableDate(d.deadlineDate, false)} {d.deadlineTime || ''}
                              </span>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#8C7A70]" />
                                {d.estimatedHours}h
                              </span>
                            </div>

                            {d.description && (
                              <p className="text-[11px] text-[#8C7A70] italic">
                                {d.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditDeliverable(d)}
                            title="Editar entregável"
                            className="p-1.5 text-[#6A3102] hover:bg-[#EDE4DA] rounded transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDeliverable(d.id)}
                            title="Excluir entregável"
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BRIEFING / DESCRIÇÃO */}
          {activeTab === 'descricao' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-[#EDE4DA] bg-[#FAF7F2]/50">
                <h4 className="text-xs font-bold text-[#5C4D44] uppercase tracking-wider mb-3">
                  Briefing e Descrição Formatada
                </h4>
                <FormattedDescription content={task.description} />
              </div>
            </div>
          )}

          {/* TAB 4: PLANEJAMENTO */}
          {activeTab === 'planejamento' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-[#EDE4DA] bg-white space-y-3">
                  <h4 className="text-xs font-bold text-[#5C4D44] uppercase tracking-wider">
                    Prazos e Horários
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-[#EDE4DA]/60">
                      <span className="text-[#8C7A70]">Início da Produção:</span>
                      <strong className="font-mono text-[#231815]">{formatReadableDate(task.startDate)}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#EDE4DA]/60">
                      <span className="text-[#8C7A70]">Prazo Final:</span>
                      <strong className="font-mono text-[#231815]">
                        {formatReadableDate(task.deadlineDate, false)} {task.deadlineTime}
                      </strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#EDE4DA]/60">
                      <span className="text-[#8C7A70]">Margem de Segurança:</span>
                      <strong className="text-[#231815]">{task.safetyMargin.replace('_', ' ')}</strong>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[#8C7A70]">Necessita Aprovação?</span>
                      <strong className={task.requiresApproval ? 'text-amber-700' : 'text-[#73645B]'}>
                        {task.requiresApproval ? 'Sim (Cliente/Gestor)' : 'Não'}
                      </strong>
                    </div>
                    {task.requiresApproval && task.approvalDeadlineDate && (
                      <div className="flex justify-between py-1 border-t border-[#EDE4DA]/60">
                        <span className="text-[#8C7A70]">Prazo de Aprovação:</span>
                        <strong className="font-mono text-[#231815]">
                          {formatReadableDate(task.approvalDeadlineDate, false)} {task.approvalDeadlineTime || ''}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[#EDE4DA] bg-white space-y-3">
                  <h4 className="text-xs font-bold text-[#5C4D44] uppercase tracking-wider">
                    Estimativa de Horas
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-[#EDE4DA]/60">
                      <span className="text-[#8C7A70]">Produção Criativa:</span>
                      <strong className="font-mono text-[#231815]">
                        {formatHours(task.estimatedProductionHours)}
                      </strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#EDE4DA]/60">
                      <span className="text-[#8C7A70]">Revisão e Ajustes:</span>
                      <strong className="font-mono text-[#231815]">
                        {formatHours(task.estimatedAdjustmentHours)}
                      </strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#EDE4DA]/60">
                      <span className="text-[#8C7A70]">Carga Total Prevista:</span>
                      <strong className="font-mono text-[#6A3102] font-bold">
                        {formatHours(task.estimatedProductionHours + task.estimatedAdjustmentHours)}
                      </strong>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[#8C7A70]">Etapas Agendadas:</span>
                      <strong className="font-mono text-[#231815]">
                        {task.stages.length} blocos
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SUBTAREFAS COMPLEMENTARES */}
          {activeTab === 'subtarefas' && (
            <div className="space-y-4">
              {/* Add Subtask Form */}
              <form onSubmit={handleAddSubtask} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nome da subtarefa de apoio (ex: Conferir links, verificar exportação...)"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg bg-[#FAF7F2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#6A3102]"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#6A3102] text-white hover:bg-[#542601] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </form>

              {/* Subtasks List */}
              <div className="divide-y divide-[#EDE4DA] border border-[#EDE4DA] rounded-xl overflow-hidden bg-white">
                {(task.subtasks || []).length === 0 ? (
                  <p className="p-6 text-xs text-[#8C7A70] text-center">
                    Nenhuma subtarefa complementar.
                  </p>
                ) : (
                  (task.subtasks || []).map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-[#FAF7F2]"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={sub.completed}
                          onChange={() => handleToggleSubtask(sub.id)}
                          className="w-4 h-4 text-[#6A3102] rounded cursor-pointer"
                        />
                        <span className={`font-medium ${sub.completed ? 'line-through text-[#8C7A70]' : 'text-[#231815]'}`}>
                          {sub.title}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 6: ARQUIVOS */}
          {activeTab === 'arquivos' && (
            <div className="space-y-4">
              <div className="divide-y divide-[#EDE4DA] border border-[#EDE4DA] rounded-xl overflow-hidden bg-white">
                {(task.files || []).length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#8C7A70] space-y-1">
                    <Paperclip className="w-6 h-6 mx-auto text-[#8C7A70]" />
                    <p>Nenhum link ou anexo adicionado ainda.</p>
                  </div>
                ) : (
                  (task.files || []).map((file) => (
                    <div key={file.id} className="p-3 flex items-center justify-between text-xs hover:bg-[#FAF7F2]">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-3.5 h-3.5 text-[#6A3102]" />
                        <span className="font-semibold text-[#231815]">{file.name}</span>
                      </div>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#6A3102] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>Abrir Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 7: COMENTÁRIOS */}
          {activeTab === 'comentarios' && (
            <div className="space-y-4">
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {(task.comments || []).length === 0 ? (
                  <p className="text-xs text-[#8C7A70] text-center py-6">
                    Nenhum comentário registrado ainda. Envie uma nota para a equipe!
                  </p>
                ) : (
                  (task.comments || []).map((c) => (
                    <div key={c.id} className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EDE4DA] text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <strong className="text-[#6A3102]">{c.author}</strong>
                        <span className="text-[#8C7A70] font-mono">
                          {formatReadableDate(c.createdAt, false)}
                        </span>
                      </div>
                      <p className="text-[#231815] leading-relaxed">{c.content}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Escreva uma nota ou comentário para a equipe..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#6A3102] text-white hover:bg-[#542601] flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 8: HISTÓRICO */}
          {activeTab === 'historico' && (
            <div className="space-y-3">
              <div className="divide-y divide-[#EDE4DA] border border-[#EDE4DA] rounded-xl overflow-hidden bg-white text-xs">
                <div className="p-3 bg-[#FAF7F2]">
                  <strong className="text-[#231815] block">Criação da Demanda</strong>
                  <span className="text-[11px] text-[#73645B] font-mono">
                    {formatReadableDate(task.createdAt, true)}
                  </span>
                </div>
                {task.updatedAt && task.updatedAt !== task.createdAt && (
                  <div className="p-3">
                    <strong className="text-[#231815] block">Última Atualização</strong>
                    <span className="text-[11px] text-[#73645B] font-mono">
                      {formatReadableDate(task.updatedAt, true)}
                    </span>
                  </div>
                )}
                {task.deliveredAt && (
                  <div className="p-3 bg-emerald-50">
                    <strong className="text-emerald-900 block">Finalização / Entrega Realizada</strong>
                    <span className="text-[11px] text-emerald-800 font-mono">
                      {formatReadableDate(task.deliveredAt, true)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#EDE4DA] bg-[#FAF7F2] flex items-center justify-between text-xs">
          <span className="text-[#8C7A70]">
            ID Demanda: <span className="font-mono text-[11px]">{task.id}</span>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-[#EDE4DA] text-[#231815] hover:bg-[#FAF7F2] cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
