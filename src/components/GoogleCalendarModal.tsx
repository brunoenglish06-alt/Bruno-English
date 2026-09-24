import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  RefreshCw,
  LogOut,
  ExternalLink,
  X,
  Clock,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Task, GoogleCalendarEvent } from '../types';
import {
  listCalendarEvents,
  syncTaskToGoogleCalendar
} from '../services/googleCalendar';
import { GoogleCalendarConfirmModal } from './GoogleCalendarConfirmModal';

interface GoogleCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  accessToken: string | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  tasks: Task[];
  onTasksUpdated: (updatedTasks: Task[]) => void;
}

export const GoogleCalendarModal: React.FC<GoogleCalendarModalProps> = ({
  isOpen,
  onClose,
  user,
  accessToken,
  onSignIn,
  onSignOut,
  tasks,
  onTasksUpdated
}) => {
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Confirmation modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    description: string;
    actionLabel: string;
    isDestructive: boolean;
    itemCount?: number;
    itemsList?: string[];
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Load upcoming calendar events when open and authenticated
  useEffect(() => {
    if (isOpen && accessToken) {
      loadUpcomingEvents();
    }
  }, [isOpen, accessToken]);

  const loadUpcomingEvents = async () => {
    if (!accessToken) return;
    setLoadingEvents(true);
    setErrorMessage(null);
    try {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const data = await listCalendarEvents(
        accessToken,
        now.toISOString(),
        nextWeek.toISOString()
      );
      setEvents(data);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao carregar eventos da agenda Google.');
    } finally {
      setLoadingEvents(false);
    }
  };

  // Sync all active tasks to Google Calendar
  const handleSyncAllTasks = () => {
    if (!accessToken) return;

    const activeTasks = tasks.filter((t) => t.status !== 'delivered');
    const totalStages = activeTasks.reduce((acc, t) => acc + t.stages.length, 0);

    setConfirmConfig({
      title: 'Sincronizar Demandas com Google Agenda',
      description:
        'O sistema irá agendar as etapas de produção, prazos e janelas de aprovação diretamente no seu calendário principal do Google Agenda.',
      itemCount: totalStages,
      itemsList: activeTasks.map(
        (t) => `${t.client} - ${t.title} (${t.stages.length} etapas)`
      ),
      actionLabel: 'Sincronizar Agora',
      isDestructive: false,
      onConfirm: async () => {
        setSyncingAll(true);
        setErrorMessage(null);
        try {
          const updatedList = [...tasks];
          let totalSynced = 0;

          for (let i = 0; i < updatedList.length; i++) {
            const t = updatedList[i];
            if (t.status === 'delivered') continue;
            const { updatedTask, syncedStagesCount } = await syncTaskToGoogleCalendar(
              t,
              accessToken
            );
            updatedList[i] = updatedTask;
            totalSynced += syncedStagesCount;
          }

          onTasksUpdated(updatedList);
          setSyncMessage(`Sucesso! ${totalSynced} etapa(s) sincronizada(s) no Google Calendar.`);
          await loadUpcomingEvents();
          setTimeout(() => setSyncMessage(null), 5000);
        } catch (err: any) {
          setErrorMessage(err?.message || 'Ocorreu um erro durante a sincronização.');
        } finally {
          setSyncingAll(false);
          setConfirmModalOpen(false);
        }
      }
    });

    setConfirmModalOpen(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-[#EDE4DA] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[#EDE4DA] flex items-center justify-between bg-[#FAF7F2]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#EDE4DA] shadow-xs flex items-center justify-center text-[#6A3102]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#231815] flex items-center gap-2">
                Integração Google Agenda
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#6A3102]/10 text-[#6A3102]">
                  Workspace
                </span>
              </h2>
              <p className="text-xs text-[#8C7A70]">
                Sincronize etapas de produção, revisões e entregas diretamente no seu calendário
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#EDE4DA]/60 text-stone-400 hover:text-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Status Bar */}
          {user && accessToken ? (
            <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Usuário'}
                    className="w-10 h-10 rounded-full border-2 border-emerald-400"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-900">
                      Conectado com o Google
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 font-mono">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onSignOut}
                  className="px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-red-600 hover:bg-white rounded-lg border border-transparent hover:border-red-200 transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Desconectar
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 text-center space-y-4">
              <div className="max-w-md mx-auto">
                <h3 className="text-sm font-bold text-amber-900 mb-1">
                  Conecte sua conta Google para sincronizar
                </h3>
                <p className="text-xs text-amber-800 leading-relaxed mb-4">
                  Permita que o Organizador de Produção reserve blocos de trabalho, revisões e entregas na sua agenda, evitando conflitos de horários.
                </p>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="inline-flex items-center gap-3 px-5 py-2.5 bg-white border border-stone-300 rounded-xl font-semibold text-xs text-stone-700 hover:bg-stone-50 hover:shadow-md transition-all shadow-xs mx-auto cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>Conectar com o Google</span>
                </button>
              </div>
            </div>
          )}

          {/* Feedback messages */}
          {syncMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Cards */}
          {accessToken && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-[#EDE4DA] bg-[#FAF7F2] space-y-3">
                <div className="flex items-center gap-2 text-[#6A3102]">
                  <Sparkles className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Sincronização em Lote
                  </h4>
                </div>
                <p className="text-xs text-[#8C7A70] leading-relaxed">
                  Exporta todas as etapas de produção, revisões e janelas de aprovação das suas demandas ativas para a sua agenda Google.
                </p>
                <button
                  type="button"
                  onClick={handleSyncAllTasks}
                  disabled={syncingAll}
                  className="w-full py-2.5 px-4 bg-[#6A3102] hover:bg-[#522501] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
                  <span>{syncingAll ? 'Sincronizando...' : 'Sincronizar Todas as Demandas'}</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-[#EDE4DA] bg-white space-y-3">
                <div className="flex items-center justify-between text-[#231815]">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#8C7A70]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      Sua Agenda Google
                    </h4>
                  </div>
                  <a
                    href="https://calendar.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-[#6A3102] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Abrir Google Calendar</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-[#8C7A70] leading-relaxed">
                  Visualize compromissos e etapas agendadas para os próximos 7 dias em tempo real.
                </p>
                <button
                  type="button"
                  onClick={loadUpcomingEvents}
                  disabled={loadingEvents}
                  className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingEvents ? 'animate-spin' : ''}`} />
                  <span>{loadingEvents ? 'Atualizando...' : 'Recarregar Eventos'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Upcoming Google Calendar Events List */}
          {accessToken && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C7A70]">
                  Próximos Eventos no Google Calendar ({events.length})
                </h4>
                {events.length > 0 && (
                  <span className="text-[10px] text-stone-400">Próximos 7 dias</span>
                )}
              </div>

              {loadingEvents ? (
                <div className="p-8 text-center text-xs text-stone-400">
                  <div className="w-6 h-6 border-2 border-[#6A3102] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Buscando eventos da sua agenda...
                </div>
              ) : events.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-500">
                  Nenhum evento encontrado nos próximos 7 dias.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {events.map((ev) => {
                    const startRaw = ev.start.dateTime || ev.start.date || '';
                    const isOIP = ev.summary.startsWith('[OIP]');
                    const dateFormatted = startRaw
                      ? new Date(startRaw).toLocaleDateString('pt-BR', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                          hour: ev.start.dateTime ? '2-digit' : undefined,
                          minute: ev.start.dateTime ? '2-digit' : undefined
                        })
                      : 'Sem data';

                    return (
                      <div
                        key={ev.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                          isOIP
                            ? 'bg-[#FAF7F2] border-[#EDE4DA]'
                            : 'bg-white border-stone-200'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {isOIP && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#6A3102] text-white">
                                OIP
                              </span>
                            )}
                            <span className="font-semibold text-stone-800 truncate">
                              {ev.summary}
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                            <span>📅 {dateFormatted}</span>
                            {ev.location && <span>📍 {ev.location}</span>}
                          </div>
                        </div>
                        {ev.htmlLink && (
                          <a
                            href={ev.htmlLink}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-stone-400 hover:text-[#6A3102] hover:bg-white rounded-lg transition-colors"
                            title="Ver evento no Google Calendar"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#EDE4DA] bg-stone-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Mandatory confirmation modal for workspace actions */}
      {confirmConfig && (
        <GoogleCalendarConfirmModal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          description={confirmConfig.description}
          itemCount={confirmConfig.itemCount}
          itemsList={confirmConfig.itemsList}
          actionLabel={confirmConfig.actionLabel}
          isDestructive={confirmConfig.isDestructive}
          isLoading={syncingAll}
        />
      )}
    </div>
  );
};
