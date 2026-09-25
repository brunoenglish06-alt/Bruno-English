import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  CheckCircle2,
  Sparkles,
  Settings,
  Plus,
  Calendar,
  Users,
  RefreshCw,
  UserCheck,
  ChevronDown
} from 'lucide-react';
import { RiskLevel, WorkGroupMember } from '../types';
import { PresenceInfo } from '../services/firestoreService';

interface NavbarProps {
  currentTab: 'dashboard' | 'today' | 'calendar' | 'approvals' | 'team' | 'assistant';
  onTabChange: (tab: 'dashboard' | 'today' | 'calendar' | 'approvals' | 'team' | 'assistant') => void;
  onOpenNewTask: () => void;
  onOpenSettings: () => void;
  onOpenGoogleCalendar: () => void;
  isGoogleConnected: boolean;
  overallRisk: RiskLevel;
  pendingApprovalsCount: number;
  todayTasksCount: number;
  activeGroupName?: string;
  teamMembersCount?: number;
  teamMembers?: WorkGroupMember[];
  currentMemberName?: string;
  onChangeMemberName?: (name: string) => void;
  presence?: PresenceInfo;
  onForceSync?: () => Promise<void>;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onOpenNewTask,
  onOpenSettings,
  onOpenGoogleCalendar,
  isGoogleConnected,
  overallRisk,
  pendingApprovalsCount,
  todayTasksCount,
  activeGroupName = 'Equipe de Design',
  teamMembersCount = 3,
  teamMembers = [],
  currentMemberName = 'Bruno',
  onChangeMemberName,
  presence,
  onForceSync
}) => {
  const [isOnlineMenuOpen, setIsOnlineMenuOpen] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOnlineMenuOpen(false);
      }
    };
    if (isOnlineMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOnlineMenuOpen]);

  const handleManualSync = async () => {
    if (!onForceSync) return;
    setIsSyncingNow(true);
    try {
      await onForceSync();
    } finally {
      setTimeout(() => setIsSyncingNow(false), 400);
    }
  };

  const onlineCount = presence?.onlineCount || 1;
  const syncStatus = presence?.syncStatus || 'synced';

  const syncBadgeConfig =
    syncStatus === 'syncing'
      ? {
          label: 'Sincronizando...',
          bg: 'bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-800',
          dot: 'bg-amber-500',
          ping: true
        }
      : syncStatus === 'offline'
      ? {
          label: 'Sem conexão',
          bg: 'bg-stone-100 hover:bg-stone-200/80 border-stone-300 text-stone-700',
          dot: 'bg-stone-500',
          ping: false
        }
      : syncStatus === 'error'
      ? {
          label: 'Erro ao sincronizar',
          bg: 'bg-red-50 hover:bg-red-100/80 border-red-200 text-red-800',
          dot: 'bg-red-500',
          ping: false
        }
      : {
          label: 'Sincronizado',
          bg: 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-800',
          dot: 'bg-emerald-500',
          ping: true
        };
  return (
    <header className="sticky top-0 z-30 bg-[#FFFFFF] border-b border-[#EDE4DA] shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onTabChange('dashboard')}
              className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-[#6A3102] flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:bg-[#542601] transition-colors">
                P
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-[#231815] block leading-none font-display">
                  Organizador Inteligente
                </span>
                <span className="text-[11px] font-medium text-[#8C7A70] tracking-wide block mt-0.5">
                  Planejador Preventivo de Produção
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'dashboard'
                  ? 'bg-[#F5EFE6] text-[#6A3102] font-semibold'
                  : 'text-[#5C4D44] hover:text-[#231815] hover:bg-[#FAF7F2]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Painel</span>
            </button>

            <button
              onClick={() => onTabChange('today')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'today'
                  ? 'bg-[#F5EFE6] text-[#6A3102] font-semibold'
                  : 'text-[#5C4D44] hover:text-[#231815] hover:bg-[#FAF7F2]'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Hoje</span>
              {todayTasksCount > 0 && (
                <span className="ml-0.5 text-xs px-1.5 py-0.2 bg-[#6A3102]/10 text-[#6A3102] rounded-full font-mono tabular-nums font-semibold">
                  {todayTasksCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onTabChange('calendar')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'calendar'
                  ? 'bg-[#F5EFE6] text-[#6A3102] font-semibold'
                  : 'text-[#5C4D44] hover:text-[#231815] hover:bg-[#FAF7F2]'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Agenda</span>
            </button>

            <button
              onClick={() => onTabChange('approvals')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'approvals'
                  ? 'bg-[#F5EFE6] text-[#6A3102] font-semibold'
                  : 'text-[#5C4D44] hover:text-[#231815] hover:bg-[#FAF7F2]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Aprovações</span>
              {pendingApprovalsCount > 0 && (
                <span className="ml-0.5 text-xs px-1.5 py-0.2 bg-[#D97706]/15 text-[#B45309] rounded-full font-mono tabular-nums font-semibold">
                  {pendingApprovalsCount}
                </span>
              )}
            </button>

            {/* Nova Seção EQUIPE (Requested in requirement 5) */}
            <button
              onClick={() => onTabChange('team')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'team'
                  ? 'bg-[#F5EFE6] text-[#6A3102] font-semibold'
                  : 'text-[#5C4D44] hover:text-[#231815] hover:bg-[#FAF7F2]'
              }`}
            >
              <Users className="w-4 h-4 text-[#6A3102]" />
              <span>Equipe</span>
              {teamMembersCount > 0 && (
                <span className="ml-0.5 text-[11px] px-1.5 py-0.2 bg-[#EDE4DA] text-[#5C4D44] rounded-full font-mono">
                  {teamMembersCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onTabChange('assistant')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'assistant'
                  ? 'bg-[#F5EFE6] text-[#6A3102] font-semibold'
                  : 'text-[#5C4D44] hover:text-[#231815] hover:bg-[#FAF7F2]'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#B45309]" />
              <span>Assistente</span>
              {overallRisk === 'critical' || overallRisk === 'high' ? (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              ) : null}
            </button>
          </nav>

          {/* Zone 3: Actions */}
          <div className="flex items-center gap-2.5">
            {/* Real-time sync badge & Member Identity selector */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsOnlineMenuOpen((prev) => !prev)}
                title={`Status do Banco Online (Cloud Firestore): ${syncBadgeConfig.label} • Clique para gerenciar perfil ou reconectar`}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${syncBadgeConfig.bg}`}
              >
                {syncStatus === 'syncing' ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-700" />
                ) : (
                  <span className="relative flex h-2 w-2">
                    {syncBadgeConfig.ping && (
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${syncBadgeConfig.dot}`}
                      ></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${syncBadgeConfig.dot}`}></span>
                  </span>
                )}
                <span>{syncBadgeConfig.label}</span>
                <span className="hidden sm:inline opacity-70 font-normal">•</span>
                <span className="hidden sm:inline max-w-[95px] truncate">{currentMemberName}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>

              {isOnlineMenuOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white border border-[#EDE4DA] shadow-xl p-3.5 z-50 text-xs text-[#231815] space-y-3 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between border-b border-[#EDE4DA] pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${syncBadgeConfig.dot}`}></span>
                      <div>
                        <p className="font-bold text-[#231815]">
                          Cloud Firestore: {syncBadgeConfig.label}
                        </p>
                        <p className="text-[11px] text-[#73645B]">
                          {onlineCount}{' '}
                          {onlineCount === 1
                            ? 'computador/sessão online no grupo'
                            : 'computadores/sessões online no grupo'}
                        </p>
                      </div>
                    </div>
                    {onForceSync && (
                      <button
                        type="button"
                        onClick={handleManualSync}
                        title="Verificar conexão com o banco online"
                        className="p-1.5 rounded-lg border border-[#EDE4DA] hover:bg-[#FAF7F2] text-[#6A3102] cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                  </div>

                  {presence?.syncErrorMessage && (
                    <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-800 text-[11px]">
                      {presence.syncErrorMessage}
                    </div>
                  )}

                  {/* Select active team member identity for this browser */}
                  {onChangeMemberName && (
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-[#5C4D44] uppercase tracking-wider">
                        Integrante Ativo neste Computador:
                      </label>
                      <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto pr-0.5">
                        {(teamMembers.length > 0
                          ? teamMembers
                          : [
                              { id: 'member-bruno', name: 'Bruno', specialty: 'Designer de Feed', email: 'bruno.english06@gmail.com', role: 'admin' as const },
                              { id: 'member-ana', name: 'Ana', specialty: 'Social Media', email: 'ana.socialmedia@creative.com', role: 'member' as const },
                              { id: 'member-carlos', name: 'Carlos', specialty: 'Editor de Vídeo', email: 'carlos.video@creative.com', role: 'member' as const }
                            ]
                        ).map((m) => {
                          const isSelected = m.name.toLowerCase() === currentMemberName.toLowerCase();
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                onChangeMemberName(m.name);
                                setIsOnlineMenuOpen(false);
                              }}
                              className={`w-full px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-[#6A3102]/10 text-[#6A3102] font-bold border border-[#6A3102]/25'
                                  : 'hover:bg-[#FAF7F2] text-[#231815] border border-transparent'
                              }`}
                            >
                              <div className="truncate">
                                <span className="block truncate">
                                  {m.name}{' '}
                                  <span className="text-[10px] font-normal text-[#8C7A70]">
                                    ({m.role === 'admin' ? 'Admin' : 'Membro'})
                                  </span>
                                </span>
                                <span className="text-[10px] text-[#8C7A70] font-normal block truncate">
                                  {m.specialty}
                                </span>
                              </div>
                              {isSelected && <UserCheck className="w-3.5 h-3.5 text-[#6A3102] shrink-0" />}
                            </button>
                          );
                        })}

                        {/* Option to test unauthorized visitor access (Requirement 6 / Test 6) */}
                        <button
                          type="button"
                          onClick={() => {
                            onChangeMemberName('Visitante Sem Permissão');
                            setIsOnlineMenuOpen(false);
                          }}
                          className={`w-full px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between transition-colors cursor-pointer border-t border-[#EDE4DA] mt-1 pt-2 ${
                            currentMemberName === 'Visitante Sem Permissão'
                              ? 'bg-red-50 text-red-800 font-bold border border-red-200'
                              : 'hover:bg-red-50/50 text-[#73645B]'
                          }`}
                        >
                          <div className="truncate">
                            <span className="block truncate text-[11px]">
                              Visitante Sem Permissão (Teste de Segurança)
                            </span>
                            <span className="text-[10px] text-[#8C7A70] font-normal block truncate">
                              Simular usuário não autorizado no grupo
                            </span>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Online sessions list */}
                  {presence && presence.onlineMembers.length > 0 && (
                    <div className="pt-2 border-t border-[#EDE4DA] space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C7A70] block">
                        Conectados em Tempo Real:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {presence.onlineMembers.map((om) => (
                          <span
                            key={om.clientId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {om.memberName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={onOpenGoogleCalendar}
              title={
                isGoogleConnected
                  ? 'Google Agenda Conectado • Clique para sincronizar'
                  : 'Conectar ao Google Agenda'
              }
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                isGoogleConnected
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-white border-[#EDE4DA] text-[#5C4D44] hover:border-[#6A3102]/30 hover:bg-[#FAF7F2]'
              }`}
            >
              <Calendar className={`w-3.5 h-3.5 ${isGoogleConnected ? 'text-emerald-600' : 'text-[#6A3102]'}`} />
              <span className="hidden sm:inline">Google Agenda</span>
              {isGoogleConnected ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              ) : null}
            </button>

            <button
              onClick={onOpenSettings}
              title="Configurações e Margem de Segurança"
              className="p-2 text-[#73645B] hover:text-[#231815] hover:bg-[#FAF7F2] rounded-lg transition-colors border border-transparent hover:border-[#EDE4DA] cursor-pointer"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              onClick={onOpenNewTask}
              className="px-3.5 py-2 text-sm font-medium text-white bg-[#6A3102] hover:bg-[#542601] active:bg-[#3D1A00] rounded-lg transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Demanda</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation row */}
      <div className="md:hidden flex items-center justify-around border-t border-[#EDE4DA] px-2 py-1.5 bg-[#FAF7F2] overflow-x-auto">
        <button
          onClick={() => onTabChange('dashboard')}
          className={`px-2 py-1 text-xs font-medium rounded ${
            currentTab === 'dashboard' ? 'text-[#6A3102] font-bold' : 'text-[#73645B]'
          }`}
        >
          Painel
        </button>
        <button
          onClick={() => onTabChange('today')}
          className={`px-2 py-1 text-xs font-medium rounded ${
            currentTab === 'today' ? 'text-[#6A3102] font-bold' : 'text-[#73645B]'
          }`}
        >
          Hoje ({todayTasksCount})
        </button>
        <button
          onClick={() => onTabChange('calendar')}
          className={`px-2 py-1 text-xs font-medium rounded ${
            currentTab === 'calendar' ? 'text-[#6A3102] font-bold' : 'text-[#73645B]'
          }`}
        >
          Agenda
        </button>
        <button
          onClick={() => onTabChange('approvals')}
          className={`px-2 py-1 text-xs font-medium rounded ${
            currentTab === 'approvals' ? 'text-[#6A3102] font-bold' : 'text-[#73645B]'
          }`}
        >
          Aprovações ({pendingApprovalsCount})
        </button>
        <button
          onClick={() => onTabChange('team')}
          className={`px-2 py-1 text-xs font-medium rounded ${
            currentTab === 'team' ? 'text-[#6A3102] font-bold' : 'text-[#73645B]'
          }`}
        >
          Equipe
        </button>
        <button
          onClick={() => onTabChange('assistant')}
          className={`px-2 py-1 text-xs font-medium rounded ${
            currentTab === 'assistant' ? 'text-[#6A3102] font-bold' : 'text-[#73645B]'
          }`}
        >
          Assistente
        </button>
      </div>
    </header>
  );
};
