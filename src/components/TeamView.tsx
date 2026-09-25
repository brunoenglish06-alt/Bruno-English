import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
  Plus,
  Trash2,
  Edit2,
  Mail,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  ArrowRight,
  X
} from 'lucide-react';
import { Task, WorkGroup, WorkGroupMember } from '../types';
import { formatReadableDate, getTodayISO, getDiffInDays } from '../utils/dateUtils';
import { getSpecialties, addCustomSpecialty } from '../data/categoriesData';
import { TASK_STATUS_CONFIG, PRIORITY_CONFIG } from '../utils/statusConfig';

interface TeamViewProps {
  tasks: Task[];
  workgroups: WorkGroup[];
  activeGroupId: string;
  onSelectGroup: (groupId: string) => void;
  onCreateGroup: (name: string, description: string) => Promise<void>;
  onUpdateGroup?: (groupId: string, name: string, description: string) => Promise<void>;
  onDeleteGroup?: (groupId: string, deleteAssociatedTasks?: boolean) => Promise<void>;
  onAddMember: (groupId: string, member: WorkGroupMember) => Promise<void>;
  onUpdateMember?: (groupId: string, member: WorkGroupMember) => Promise<void>;
  onRemoveMember: (groupId: string, memberId: string) => Promise<void>;
  onSelectTask: (task: Task) => void;
  onFilterByMember: (memberName: string) => void;
  onOpenNewTask: () => void;
}

export const TeamView: React.FC<TeamViewProps> = ({
  tasks,
  workgroups,
  activeGroupId,
  onSelectGroup,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onAddMember,
  onUpdateMember,
  onRemoveMember,
  onSelectTask,
  onFilterByMember,
  onOpenNewTask
}) => {
  const today = getTodayISO();
  const [specialties, setSpecialties] = useState(() => getSpecialties());

  // Modals state
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupToDeleteId, setGroupToDeleteId] = useState<string | null>(null);
  const [deleteGroupTasks, setDeleteGroupTasks] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Form states: Create / Edit Group
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  // Form states: Add / Edit Member
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberSpecialty, setMemberSpecialty] = useState('Designer de Feed');
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [isCustomSpecialty, setIsCustomSpecialty] = useState(false);
  const [memberRole, setMemberRole] = useState<'admin' | 'member'>('member');

  // Expanded member tasks
  const [expandedMembers, setExpandedMembers] = useState<Record<string, boolean>>({});

  const activeGroup = workgroups.find((g) => g.id === activeGroupId) || workgroups[0];

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const toggleMemberExpand = (memberId: string) => {
    setExpandedMembers((prev) => ({
      ...prev,
      [memberId]: !prev[memberId]
    }));
  };

  const handleOpenAddMember = () => {
    setEditingMemberId(null);
    setMemberName('');
    setMemberEmail('');
    setMemberSpecialty('Designer de Feed');
    setCustomSpecialty('');
    setIsCustomSpecialty(false);
    setMemberRole('member');
    setIsAddMemberOpen(true);
  };

  const handleOpenEditMember = (member: WorkGroupMember) => {
    setEditingMemberId(member.id);
    setMemberName(member.name);
    setMemberEmail(member.email);
    setMemberSpecialty(member.specialty);
    setCustomSpecialty('');
    setIsCustomSpecialty(false);
    setMemberRole(member.role);
    setIsAddMemberOpen(true);
  };

  const handleOpenCreateGroup = () => {
    setEditingGroupId(null);
    setNewGroupName('');
    setNewGroupDesc('');
    setIsCreateGroupOpen(true);
  };

  const handleOpenEditGroup = (group: WorkGroup) => {
    setEditingGroupId(group.id);
    setNewGroupName(group.name);
    setNewGroupDesc(group.description || '');
    setIsCreateGroupOpen(true);
  };

  const handleOpenDeleteGroup = (groupId: string) => {
    setGroupToDeleteId(groupId);
    setDeleteGroupTasks(false);
  };

  const handleConfirmDeleteGroup = () => {
    if (!groupToDeleteId || !onDeleteGroup) return;
    const target = workgroups.find((g) => g.id === groupToDeleteId);
    const deletedName = target?.name || 'Grupo';
    onDeleteGroup(groupToDeleteId, deleteGroupTasks).catch(() => {});
    setGroupToDeleteId(null);
    setDeleteGroupTasks(false);
    showFeedback(`Grupo "${deletedName}" apagado com sucesso!`);
  };

  const handleCreateGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newGroupName.trim();
    if (!trimmedName) return;
    if (editingGroupId && onUpdateGroup) {
      onUpdateGroup(editingGroupId, trimmedName, newGroupDesc.trim()).catch(() => {});
      setEditingGroupId(null);
      setNewGroupName('');
      setNewGroupDesc('');
      setIsCreateGroupOpen(false);
      showFeedback(`Grupo "${trimmedName}" atualizado!`);
      return;
    }
    setNewGroupName('');
    setNewGroupDesc('');
    setIsCreateGroupOpen(false);
    onCreateGroup(trimmedName, newGroupDesc.trim()).catch(() => {});
    showFeedback(`Grupo "${trimmedName}" criado com sucesso!`);
  };

  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = memberName.trim();
    if (!trimmedName || !activeGroup) return;

    let finalSpecialty = memberSpecialty;
    if (isCustomSpecialty && customSpecialty.trim()) {
      finalSpecialty = customSpecialty.trim();
      addCustomSpecialty(finalSpecialty, 'other');
      setSpecialties(getSpecialties());
    }

    if (editingMemberId && onUpdateMember) {
      const updatedMember: WorkGroupMember = {
        id: editingMemberId,
        name: trimmedName,
        email: memberEmail.trim() || `${trimmedName.toLowerCase().replace(/\s+/g, '.')}@equipe.com`,
        role: memberRole,
        specialty: finalSpecialty
      };
      setIsAddMemberOpen(false);
      setEditingMemberId(null);
      setMemberName('');
      setMemberEmail('');
      onUpdateMember(activeGroup.id, updatedMember).catch(() => {});
      showFeedback(`Integrante "${trimmedName}" atualizado!`);
      return;
    }

    const newMember: WorkGroupMember = {
      id: 'member-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: trimmedName,
      email: memberEmail.trim() || `${trimmedName.toLowerCase().replace(/\s+/g, '.')}@equipe.com`,
      role: memberRole,
      specialty: finalSpecialty
    };

    setIsAddMemberOpen(false);
    setEditingMemberId(null);
    setMemberName('');
    setMemberEmail('');
    onAddMember(activeGroup.id, newMember).catch(() => {});
    showFeedback(`Integrante "${trimmedName}" (${finalSpecialty}) adicionado à equipe!`);
  };

  return (
    <div className="space-y-6 text-[#231815]">
      {/* 1. Header & Group Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-display text-[#231815] tracking-tight">
              Equipe & Colaboração
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Sincronizado Online
            </span>
          </div>
          <p className="text-xs text-[#73645B] mt-0.5">
            Grupos de trabalho, integrantes por especialidade e visão em tempo real de quem está fazendo o quê.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Workgroup selector */}
          {workgroups.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white border border-[#EDE4DA] rounded-lg px-2.5 py-1.5 shadow-2xs">
              <FolderKanban className="w-3.5 h-3.5 text-[#6A3102]" />
              <select
                value={activeGroup?.id || ''}
                onChange={(e) => onSelectGroup(e.target.value)}
                className="text-xs font-semibold text-[#231815] bg-transparent focus:outline-none cursor-pointer"
              >
                {workgroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleOpenCreateGroup}
            className="px-3 py-2 text-xs font-semibold rounded-lg border border-[#EDE4DA] bg-white hover:bg-[#FAF7F2] text-[#231815] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#6A3102]" />
            <span>Criar Grupo</span>
          </button>

          {activeGroup && onDeleteGroup && (
            <button
              onClick={() => handleOpenDeleteGroup(activeGroup.id)}
              title="Apagar grupo de trabalho"
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-red-200 bg-red-50/70 hover:bg-red-100 text-red-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Apagar Grupo</span>
            </button>
          )}

          {activeGroup && (
            <button
              onClick={handleOpenAddMember}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#6A3102] hover:bg-[#542601] text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Adicionar Integrante</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Group Summary Card & All Workgroups Bar */}
      {workgroups.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white border border-[#EDE4DA] shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#6A3102]/10 text-[#6A3102] flex items-center justify-center mx-auto">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#231815]">Nenhum grupo de trabalho ativo</h3>
            <p className="text-xs text-[#73645B] mt-1 max-w-md mx-auto">
              Todos os grupos foram apagados. Crie um novo grupo de trabalho para organizar os integrantes e demandas da sua equipe.
            </p>
          </div>
          <button
            onClick={handleOpenCreateGroup}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#6A3102] hover:bg-[#542601] text-white inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Novo Grupo de Trabalho</span>
          </button>
        </div>
      ) : (
        activeGroup && (
          <div className="p-5 rounded-2xl bg-white border border-[#EDE4DA] shadow-xs space-y-4">
            {/* Quick Group Switcher & Delete Bar */}
            <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-[#EDE4DA]/80">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-[#8C7A70] uppercase tracking-wider mr-1">
                  Grupos ({workgroups.length}):
                </span>
                {workgroups.map((grp) => {
                  const isCurrent = grp.id === activeGroup.id;
                  return (
                    <div
                      key={grp.id}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        isCurrent
                          ? 'bg-[#6A3102] text-white border-[#6A3102] shadow-2xs'
                          : 'bg-[#FAF7F2] text-[#231815] border-[#EDE4DA] hover:border-[#6A3102]/40'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectGroup(grp.id)}
                        className="cursor-pointer flex items-center gap-1.5"
                      >
                        <FolderKanban className="w-3 h-3 opacity-80" />
                        <span>{grp.name}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            isCurrent ? 'bg-white/20 text-white' : 'bg-[#EDE4DA] text-[#5C4D44]'
                          }`}
                        >
                          {grp.members.length}
                        </span>
                      </button>
                      {onDeleteGroup && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDeleteGroup(grp.id);
                          }}
                          title={`Apagar grupo "${grp.name}"`}
                          className={`p-0.5 rounded transition-colors cursor-pointer ${
                            isCurrent
                              ? 'text-white/80 hover:text-white hover:bg-white/20'
                              : 'text-[#8C7A70] hover:text-red-600 hover:bg-red-50'
                          }`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[#8C7A70] uppercase tracking-wider">
                    Grupo Ativo:
                  </span>
                  <span className="text-sm font-bold text-[#231815]">{activeGroup.name}</span>
                  <button
                    type="button"
                    onClick={() => handleOpenEditGroup(activeGroup)}
                    title="Editar nome e descrição do grupo"
                    className="text-[11px] font-semibold text-[#6A3102] hover:underline inline-flex items-center gap-1 ml-1 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Editar</span>
                  </button>
                  {onDeleteGroup && (
                    <button
                      type="button"
                      onClick={() => handleOpenDeleteGroup(activeGroup.id)}
                      title="Apagar este grupo"
                      className="text-[11px] font-semibold text-red-600 hover:text-red-800 hover:underline inline-flex items-center gap-1 ml-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Apagar Grupo</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-[#73645B] mt-1 max-w-xl">
                  {activeGroup.description || 'Equipe multidisciplinar para atendimento e produção de conteúdos.'}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="text-center px-3 py-1.5 bg-[#FAF7F2] rounded-lg border border-[#EDE4DA]">
                  <span className="text-[10px] text-[#8C7A70] block">Integrantes</span>
                  <strong className="text-sm font-mono text-[#6A3102]">{activeGroup.members.length}</strong>
                </div>
                <div className="text-center px-3 py-1.5 bg-[#FAF7F2] rounded-lg border border-[#EDE4DA]">
                  <span className="text-[10px] text-[#8C7A70] block">Demandas Ativas</span>
                  <strong className="text-sm font-mono text-[#231815]">
                    {tasks.filter((t) => t.status !== 'delivered' && t.status !== 'finalized').length}
                  </strong>
                </div>
                <div className="text-center px-3 py-1.5 bg-[#FAF7F2] rounded-lg border border-[#EDE4DA]">
                  <span className="text-[10px] text-[#8C7A70] block">Concluídas</span>
                  <strong className="text-sm font-mono text-emerald-700">
                    {tasks.filter((t) => t.status === 'delivered' || t.status === 'finalized').length}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* 3. SECTION: QUEM ESTÁ FAZENDO O QUÊ? (Requested explicitly) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-bold text-[#5C4D44] uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-[#6A3102]" />
              <span>QUEM ESTÁ FAZENDO O QUÊ?</span>
            </h2>
            <span className="text-[11px] text-[#8C7A70]">
              Status de produção individual e próximos prazos calculados a partir dos dados reais
            </span>
          </div>

          <button
            onClick={onOpenNewTask}
            className="text-xs font-semibold text-[#6A3102] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Atribuir Demanda</span>
          </button>
        </div>

        {/* Members Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeGroup?.members.map((member) => {
            // Real metrics calculation per member: checks main assignee, collaborators, or any deliverable assignee
            const memberTasks = tasks.filter(
              (t) =>
                t.assignee.toLowerCase().includes(member.name.toLowerCase()) ||
                member.name.toLowerCase().includes(t.assignee.toLowerCase()) ||
                (t.collaborators &&
                  t.collaborators.some((c) =>
                    c.toLowerCase().includes(member.name.toLowerCase())
                  )) ||
                (t.deliverables &&
                  t.deliverables.some((d) =>
                    d.assignee.toLowerCase().includes(member.name.toLowerCase())
                  ))
            );

            // Member-specific deliverables
            const memberDeliverables = tasks.flatMap(
              (t) =>
                (t.deliverables || [])
                  .filter((d) => d.assignee.toLowerCase().includes(member.name.toLowerCase()))
                  .map((d) => ({ ...d, parentTaskTitle: t.title, parentClient: t.client }))
            );

            const inProduction = memberTasks.filter(
              (t) => t.status === 'in_production' || t.status === 'in_review' || t.status === 'in_adjustments'
            );
            const awaitingApproval = memberTasks.filter(
              (t) => t.status === 'awaiting_approval' || t.status === 'sent_for_approval'
            );
            const pendingTodo = memberTasks.filter((t) => t.status === 'todo');
            const completed = memberTasks.filter(
              (t) => t.status === 'delivered' || t.status === 'finalized'
            );

            // Active tasks (not delivered)
            const activeList = memberTasks.filter(
              (t) => t.status !== 'delivered' && t.status !== 'finalized'
            );

            // Next deadline for this member
            const sortedDeadlines = [...activeList].sort((a, b) =>
              a.deadlineDate.localeCompare(b.deadlineDate)
            );
            const nextDeadlineTask = sortedDeadlines[0];

            const isExpanded = !!expandedMembers[member.id];

            return (
              <div
                key={member.id}
                className="bg-white rounded-2xl border border-[#EDE4DA] hover:border-[#6A3102]/40 transition-all p-5 shadow-xs flex flex-col justify-between space-y-4"
              >
                {/* Member Profile Row */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-xl bg-[#6A3102]/10 text-[#6A3102] border border-[#6A3102]/20 font-bold flex items-center justify-center text-sm shadow-2xs">
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <strong className="text-sm font-bold text-[#231815]">
                            {member.name}
                          </strong>
                          {member.role === 'admin' && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 rounded font-semibold flex items-center gap-0.5">
                              <Shield className="w-2.5 h-2.5" />
                              Admin
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-medium text-[#6A3102] block mt-0.5">
                          {member.specialty}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditMember(member)}
                        title="Editar integrante"
                        className="text-[#8C7A70] hover:text-[#6A3102] p-1 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {activeGroup.members.length > 1 && (
                        <button
                          onClick={() => {
                            onRemoveMember(activeGroup.id, member.id);
                            showFeedback(`Integrante "${member.name}" removido da equipe.`);
                          }}
                          title="Remover integrante do grupo"
                          className="text-[#8C7A70] hover:text-red-600 p-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Real Status Badge (Ex: Bruno — Designer de Feed — 3 demandas em andamento) */}
                  <div className="mt-3.5 p-3 rounded-xl bg-[#FAF7F2] border border-[#EDE4DA] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#8C7A70] font-medium">Status de Produção:</span>
                      <span className="font-bold text-[#231815]">
                        {inProduction.length > 0
                          ? `${inProduction.length} em produção`
                          : awaitingApproval.length > 0
                          ? `${awaitingApproval.length} aguardando aprovação`
                          : pendingTodo.length > 0
                          ? `${pendingTodo.length} na fila`
                          : 'Carga livre'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 pt-1 border-t border-[#EDE4DA]/60 text-center font-mono text-[11px]">
                      <div>
                        <span className="text-[10px] text-[#8C7A70] block font-sans">Produção</span>
                        <strong className="text-blue-700">{inProduction.length}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#8C7A70] block font-sans">Aprovação</span>
                        <strong className="text-amber-700">{awaitingApproval.length}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#8C7A70] block font-sans">Entregues</span>
                        <strong className="text-emerald-700">{completed.length}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Next Deadline */}
                  <div className="mt-3 flex items-center justify-between text-xs px-1">
                    <span className="text-[#8C7A70]">Próximo Prazo:</span>
                    {nextDeadlineTask ? (
                      <span className="font-mono text-[#231815] font-semibold truncate max-w-[170px]">
                        {formatReadableDate(nextDeadlineTask.deadlineDate, false)} ({nextDeadlineTask.client})
                      </span>
                    ) : (
                      <span className="text-[#8C7A70] italic">Sem prazos imediatos</span>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-2 border-t border-[#EDE4DA] flex items-center justify-between gap-2 text-xs">
                  <button
                    onClick={() => toggleMemberExpand(member.id)}
                    className="text-[#73645B] hover:text-[#231815] font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isExpanded ? 'Recolher tarefas' : `Ver demandas (${activeList.length})`}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => onFilterByMember(member.name)}
                    className="px-2.5 py-1 text-xs font-semibold text-[#6A3102] hover:bg-[#FAF7F2] rounded-lg border border-[#EDE4DA] flex items-center gap-1 cursor-pointer"
                  >
                    <span>Filtrar no Painel</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Expanded Member Tasks List */}
                {isExpanded && (
                  <div className="pt-2 border-t border-[#EDE4DA]/80 space-y-1.5 animate-in fade-in duration-100">
                    <span className="text-[10px] font-bold text-[#8C7A70] uppercase tracking-wider block">
                      Demandas Ativas ({activeList.length})
                    </span>
                    {activeList.length === 0 ? (
                      <p className="text-[11px] text-[#8C7A70] italic">
                        Nenhuma demanda atribuída a {member.name} no momento.
                      </p>
                    ) : (
                      activeList.map((t) => {
                        const statusCfg = TASK_STATUS_CONFIG[t.status];
                        const memberDelivsInTask = (t.deliverables || []).filter((d) =>
                          d.assignee.toLowerCase().includes(member.name.toLowerCase())
                        );

                        return (
                          <div
                            key={t.id}
                            onClick={() => onSelectTask(t)}
                            className="p-2.5 rounded-lg bg-[#FAF7F2] hover:bg-[#EDE4DA]/60 border border-[#EDE4DA]/80 cursor-pointer flex flex-col gap-1 text-xs transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-[#231815] truncate flex-1">
                                {t.title}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-medium border shrink-0 ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                              >
                                {statusCfg.label}
                              </span>
                            </div>

                            <span className="text-[10px] text-[#8C7A70]">
                              {t.client} · Prazo {formatReadableDate(t.deadlineDate, false)}
                            </span>

                            {memberDelivsInTask.length > 0 && (
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                <span className="text-[9px] text-[#8C7A70]">Entregáveis:</span>
                                {memberDelivsInTask.map((d) => (
                                  <span
                                    key={d.id}
                                    className="text-[9px] px-1.5 py-0.2 rounded bg-white border border-[#EDE4DA] text-[#6A3102] font-semibold"
                                  >
                                    {d.title} ({d.specialty})
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Card to quickly add a new member */}
          <button
            type="button"
            onClick={handleOpenAddMember}
            className="bg-[#FAF7F2]/70 hover:bg-[#FAF7F2] rounded-2xl border-2 border-dashed border-[#DDD0C3] hover:border-[#6A3102]/60 transition-all p-6 flex flex-col items-center justify-center text-center gap-2.5 min-h-[220px] cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-xl bg-[#6A3102]/10 group-hover:bg-[#6A3102] text-[#6A3102] group-hover:text-white transition-colors flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-sm font-bold text-[#231815] group-hover:text-[#6A3102] block">
                + Acrescentar Integrante à Equipe
              </strong>
              <span className="text-xs text-[#73645B] block mt-0.5 max-w-[220px]">
                Adicione designers, editores de vídeo, social media ou gestores ao grupo ativo
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Modal: Create / Edit WorkGroup */}
      {isCreateGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-[#EDE4DA] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EDE4DA] pb-3">
              <h3 className="font-bold text-base text-[#231815]">
                {editingGroupId ? 'Editar Grupo de Trabalho' : 'Criar Novo Grupo de Trabalho'}
              </h3>
              <button
                onClick={() => {
                  setIsCreateGroupOpen(false);
                  setEditingGroupId(null);
                }}
                className="text-[#8C7A70] hover:text-[#231815] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateGroupSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-medium text-[#5C4D44] mb-1">Nome do Grupo <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ex: Equipe de Vídeo & Motion / Agência Alpha"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EDE4DA] rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C4D44] mb-1">Descrição</label>
                <textarea
                  rows={3}
                  placeholder="Descreva o propósito ou clientes atendidos por esta equipe..."
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EDE4DA] rounded-lg bg-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateGroupOpen(false);
                    setEditingGroupId(null);
                  }}
                  className="px-3.5 py-2 text-xs text-[#73645B] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#6A3102] text-white hover:bg-[#542601] cursor-pointer"
                >
                  {editingGroupId ? 'Salvar Alterações' : 'Criar Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete WorkGroup */}
      {groupToDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-[#EDE4DA] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EDE4DA] pb-3">
              <div className="flex items-center gap-2 text-red-700">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-bold text-base">Apagar Grupo de Trabalho</h3>
              </div>
              <button
                onClick={() => setGroupToDeleteId(null)}
                className="text-[#8C7A70] hover:text-[#231815] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#5C4D44]">
              <div>
                <label className="block text-xs font-semibold text-[#231815] mb-1.5">
                  Selecione o grupo que deseja apagar:
                </label>
                <select
                  value={groupToDeleteId}
                  onChange={(e) => setGroupToDeleteId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EDE4DA] rounded-lg bg-[#FAF7F2] font-semibold text-[#231815]"
                >
                  {workgroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.members.length} integrante{g.members.length === 1 ? '' : 's'})
                    </option>
                  ))}
                </select>
              </div>

              {(() => {
                const targetGrp = workgroups.find((g) => g.id === groupToDeleteId);
                if (!targetGrp) return null;
                return (
                  <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-200 space-y-1.5">
                    <p className="font-semibold text-red-900">
                      Tem certeza que deseja apagar o grupo "{targetGrp.name}"?
                    </p>
                    <p className="text-[11px] text-red-800">
                      Este grupo possui <strong>{targetGrp.members.length}</strong> integrante(s) cadastrado(s)
                      {targetGrp.members.length > 0
                        ? ` (${targetGrp.members.map((m) => m.name).join(', ')})`
                        : ''}.
                    </p>
                  </div>
                );
              })()}

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FAF7F2] border border-[#EDE4DA] cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteGroupTasks}
                  onChange={(e) => setDeleteGroupTasks(e.target.checked)}
                  className="mt-0.5 rounded border-[#EDE4DA] text-red-600 focus:ring-red-500"
                />
                <div>
                  <span className="font-semibold text-[#231815] block">
                    Apagar também as demandas vinculadas a este grupo
                  </span>
                  <span className="text-[11px] text-[#73645B] block mt-0.5">
                    Se desmarcado, todas as demandas serão preservadas e transferidas para o próximo grupo ativo.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#EDE4DA]">
              <button
                type="button"
                onClick={() => setGroupToDeleteId(null)}
                className="px-3.5 py-2 text-xs font-medium text-[#73645B] hover:text-[#231815] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteGroup}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Apagar Grupo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Member */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-[#EDE4DA] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EDE4DA] pb-3">
              <h3 className="font-bold text-base text-[#231815]">
                {editingMemberId ? 'Editar Integrante da Equipe' : 'Acrescentar Integrante à Equipe'}
              </h3>
              <button
                onClick={() => {
                  setIsAddMemberOpen(false);
                  setEditingMemberId(null);
                }}
                className="text-[#8C7A70] hover:text-[#231815] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddMemberSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                  Nome do Integrante <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ex: Carlos, Ana, Letícia, Lucas..."
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EDE4DA] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#6A3102]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C4D44] mb-1">E-mail (opcional)</label>
                <input
                  type="email"
                  placeholder="integrante@criativo.com"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EDE4DA] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#6A3102]"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-[#5C4D44]">Especialidade Principal</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomSpecialty(!isCustomSpecialty)}
                    className="text-[11px] text-[#6A3102] hover:underline font-medium cursor-pointer"
                  >
                    {isCustomSpecialty ? 'Selecionar da lista' : '+ Personalizada'}
                  </button>
                </div>
                {isCustomSpecialty ? (
                  <input
                    type="text"
                    required
                    placeholder="Digite a especialidade (ex: Diretor de Arte, Gestor de Tráfego...)"
                    value={customSpecialty}
                    onChange={(e) => setCustomSpecialty(e.target.value)}
                    className="w-full px-3 py-2 border border-[#EDE4DA] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#6A3102]"
                  />
                ) : (
                  <select
                    value={memberSpecialty}
                    onChange={(e) => setMemberSpecialty(e.target.value)}
                    className="w-full px-3 py-2 border border-[#EDE4DA] rounded-lg bg-white"
                  >
                    {specialties.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C4D44] mb-1">Papel no Grupo</label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as 'admin' | 'member')}
                  className="w-full px-3 py-2 border border-[#EDE4DA] rounded-lg bg-white"
                >
                  <option value="member">Membro (Produção & Visualização)</option>
                  <option value="admin">Administrador (Gestão de membros e demandas)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#EDE4DA]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddMemberOpen(false);
                    setEditingMemberId(null);
                  }}
                  className="px-3.5 py-2 text-xs text-[#73645B] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#6A3102] text-white hover:bg-[#542601] cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingMemberId ? 'Salvar Alterações' : 'Adicionar Integrante'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
