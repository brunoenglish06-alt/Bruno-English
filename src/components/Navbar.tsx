import React from 'react';
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
  FolderKanban
} from 'lucide-react';
import { RiskLevel, WorkGroup } from '../types';

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
  teamMembersCount = 3
}) => {
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
            {/* Real-time sync badge */}
            <div
              title="Sincronização em tempo real ativa: alterações de qualquer pessoa da equipe aparecem instantaneamente para todos."
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Online em Tempo Real</span>
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
