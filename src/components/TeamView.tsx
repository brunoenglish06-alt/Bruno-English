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
import { getSpecialties } from '../data/categoriesData';
import { TASK_STATUS_CONFIG, PRIORITY_CONFIG } from '../utils/statusConfig';

interface TeamViewProps {
  tasks: Task[];
  workgroups: WorkGroup[];
  activeGroupId: string;
  onSelectGroup: (groupId: string) => void;
  onCreateGroup: (name: string, description: string) => Promise<void>;
  onAddMember: (groupId: string, member: WorkGroupMember) => Promise<void>;
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
  onAddMember,
  onRemoveMember,
  onSelectTask,
  onFilterByMember,
  onOpenNewTask
}) => {
  const today = getTodayISO();
  const specialties = getSpecialties();

  // Modals state
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  // Form states: Create Group
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  // Form states: Add Member
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberSpecialty, setMemberSpecialty] = useState('Designer de Feed');
  const [memberRole, setMemberRole] = useState<'admin' | 'member'>('member');

  // Expanded member tasks
  const [expandedMembers, setExpandedMembers] = useState<Record<string, boolean>>({});

  const activeGroup = workgroups.find((g) => g.id === activeGroupId) || workgroups[0];

  const toggleMemberExpand = (memberId: string) => {
    setExpandedMembers((prev) => ({
      ...prev,
      [memberId]: !prev[memberId]
    }));
  };

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    await onCreateGroup(newGroupName.trim(), newGroupDesc.trim());
    setNewGroupName('');
    setNewGroupDesc('');
    setIsCreateGroupOpen(false);
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim() || !activeGroup) return;
    const newMember: WorkGroupMember = {
      id: 'member-' + Date.now(),
      name: memberName.trim(),
      email: memberEmail.trim() || `${memberName.trim().toLowerCase()}@agencia.com`,
      role: memberRole,
      specialty: memberSpecialty
    };
    await onAddMember(activeGroup.id, newMember);
    setMemberName('');
    setMemberEmail('');
    setIsAddMemberOpen(false);
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

          <button
            onClick={() => setIsCreateGroupOpen(true)}
            className="px-3 py-2 text-xs font-semibold rounded-lg border border-[#EDE4DA] bg-white hover:bg-[#FAF7F2] text-[#231815] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#6A3102]" />
            <span className="hidden sm:inline">Criar Grupo</span>
          </button>

          <button
            onClick={() => setIsAddMemberOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#6A3102] hover:bg-[#542601] text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Convidar Integrante</span>
          </button>
        </div>
      </div>

      {/* 2. Group Summary Card */}
      {activeGroup && (
        <div className="p-5 rounded-2xl bg-white border border-[#EDE4DA] shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#8C7A70] uppercase tracking-wider">
                  Grupo Ativo:
                </span>
                <span className="text-sm font-bold text-[#231815]">{activeGroup.name}</span>
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
            // Real metrics calculation per member: checks main assignee or any deliverable assignee
            const memberTasks = tasks.filter(
              (t) =>
                t.assignee.toLowerCase().includes(member.name.toLowerCase()) ||
                member.name.toLowerCase().includes(t.assignee.toLowerCase()) ||
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

                    {activeGroup.members.length > 1 && member.role !== 'admin' && (
                      <button
                        onClick={() => onRemoveMember(activeGroup.id, member.id)}
                        title="Remover integrante do grupo"
                        className="text-[#8C7A70] hover:text-red-600 p-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
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
        </div>
      </div>

      {/* Modal: Create WorkGroup */}
      {isCreateGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-[#EDE4DA] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EDE4DA] pb-3">
              <h3 className="font-bold text-base text-[#231815]">Criar Novo Grupo de Trabalho</h3>
              <button onClick={() => setIsCreateGroupOpen(false)} className="text-[#8C7A70] hover:text-[#231815]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateGroupSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-medium text-[#5C4D44] mb-1">Nome do Grupo</label>
                <input
                  type="text"
                  required
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
                  onClick={() => setIsCreateGroupOpen(false)}
                  className="px-3.5 py-2 text-xs text-[#73645B]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#6A3102] text-white hover:bg-[#542601]"
                >
                  Criar Grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Member */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-[#EDE4DA] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EDE4DA] pb-3">
              <h3 className="font-bold text-base text-[#231815]">Convidar Integrante para o Grupo</h3>
              <button onClick={() => setIsAddMemberOpen(false)} className="text-[#8C7A70] hover:text-[#231815]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddMemberSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-medium text-[#5C4D44] mb-1">Nome do Integrante</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos, Ana, Letícia..."
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EDE4DA] rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C4D44] mb-1">E-mail</label>
                <input
                  type="email"
                  placeholder="integrante@criativo.com"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EDE4DA] rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C4D44] mb-1">Especialidade Principal</label>
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
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="px-3.5 py-2 text-xs text-[#73645B]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#6A3102] text-white hover:bg-[#542601]"
                >
                  Adicionar Integrante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
