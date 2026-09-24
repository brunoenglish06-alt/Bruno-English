import React, { useState } from 'react';
import {
  X,
  Settings,
  ShieldCheck,
  Clock,
  Download,
  Upload,
  RotateCcw,
  Check,
  FileText,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { User } from 'firebase/auth';
import { UserSettings, SafetyMarginOption, AuditLogEntry } from '../types';
import {
  saveSettings,
  exportBackupData,
  importBackupData,
  resetToDemoData,
  loadAuditLog
} from '../utils/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onDataReset: () => void;
  user?: User | null;
  accessToken?: string | null;
  onSignInGoogle?: () => Promise<void>;
  onSignOutGoogle?: () => Promise<void>;
  onOpenGoogleCalendarModal?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onDataReset,
  user,
  accessToken,
  onSignInGoogle,
  onSignOutGoogle,
  onOpenGoogleCalendarModal
}) => {
  if (!isOpen) return null;

  const [localSettings, setLocalSettings] = useState<UserSettings>({ ...settings });
  const [activeTab, setActiveTab] = useState<'schedule' | 'integrations' | 'backup' | 'audit'>('schedule');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const auditLogs = loadAuditLog();

  const handleSave = () => {
    saveSettings(localSettings);
    onUpdateSettings(localSettings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleExport = () => {
    const jsonStr = exportBackupData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `organizador_producao_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importBackupData(content);
        if (ok) {
          onDataReset();
          onClose();
        } else {
          alert('Arquivo de backup inválido.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemo = () => {
    if (confirm('Deseja realmente limpar todas as demandas cadastradas? O painel ficará zerado para você iniciar suas próprias produções.')) {
      resetToDemoData();
      onDataReset();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs text-[#231815]">
      <div className="bg-white rounded-xl shadow-xl border border-[#EDE4DA] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE4DA] bg-[#FAF7F2]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#6A3102]/10 text-[#6A3102] flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-[#231815]">Configurações</h2>
              <p className="text-xs text-[#73645B]">
                Margem de segurança, horários de trabalho e persistência
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#73645B] hover:text-[#231815] p-1.5 rounded-lg hover:bg-[#EDE4DA]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab headers */}
        <div className="flex border-b border-[#EDE4DA] px-6 bg-white">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`py-3 text-xs font-semibold uppercase tracking-wider border-b-2 mr-6 transition-colors ${
              activeTab === 'schedule'
                ? 'border-[#6A3102] text-[#6A3102]'
                : 'border-transparent text-[#73645B] hover:text-[#231815]'
            }`}
          >
            Planejamento & Expediente
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`py-3 text-xs font-semibold uppercase tracking-wider border-b-2 mr-6 transition-colors flex items-center gap-1.5 ${
              activeTab === 'integrations'
                ? 'border-[#6A3102] text-[#6A3102]'
                : 'border-transparent text-[#73645B] hover:text-[#231815]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Google Agenda</span>
            {accessToken && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`py-3 text-xs font-semibold uppercase tracking-wider border-b-2 mr-6 transition-colors ${
              activeTab === 'backup'
                ? 'border-[#6A3102] text-[#6A3102]'
                : 'border-transparent text-[#73645B] hover:text-[#231815]'
            }`}
          >
            Backup & Dados
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'audit'
                ? 'border-[#6A3102] text-[#6A3102]'
                : 'border-transparent text-[#73645B] hover:text-[#231815]'
            }`}
          >
            Histórico de Alterações
          </button>
        </div>

        {/* Tab content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              {/* Margem de Segurança Padrão */}
              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#EDE4DA]">
                <label className="text-xs font-bold text-[#6A3102] uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>MARGEM DE SEGURANÇA PADRÃO</span>
                </label>
                <p className="text-xs text-[#73645B] mb-3">
                  Tenta sempre concluir o material antes do prazo final para evitar concentração no último dia.
                </p>

                <select
                  value={localSettings.defaultSafetyMargin}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      defaultSafetyMargin: e.target.value as SafetyMarginOption
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg bg-white font-medium"
                >
                  <option value="none">Sem margem (Entrega direta no prazo final)</option>
                  <option value="1_day">1 dia de folga antes do prazo (Recomendado)</option>
                  <option value="2_days">2 dias de folga (Para projetos complexos)</option>
                  <option value="3_days">3 dias de folga</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>

              {/* Working Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                    Início do Expediente
                  </label>
                  <input
                    type="number"
                    min="6"
                    max="12"
                    value={localSettings.workStartHour}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, workStartHour: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg font-mono bg-white"
                  />
                  <span className="text-[10px] text-[#8C7A70]">{localSettings.workStartHour}:00h</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                    Fim do Expediente
                  </label>
                  <input
                    type="number"
                    min="14"
                    max="22"
                    value={localSettings.workEndHour}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, workEndHour: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg font-mono bg-white"
                  />
                  <span className="text-[10px] text-[#8C7A70]">{localSettings.workEndHour}:00h</span>
                </div>
              </div>

              {/* Lunch Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                    Início do Almoço
                  </label>
                  <input
                    type="number"
                    min="11"
                    max="14"
                    value={localSettings.lunchStartHour}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        lunchStartHour: Number(e.target.value)
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                    Fim do Almoço
                  </label>
                  <input
                    type="number"
                    min="12"
                    max="15"
                    value={localSettings.lunchEndHour}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, lunchEndHour: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg font-mono bg-white"
                  />
                </div>
              </div>

              {/* Max daily production capacity */}
              <div>
                <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                  Capacidade Máxima Diária de Foco Criativo (horas)
                </label>
                <input
                  type="number"
                  min="2"
                  max="10"
                  step="0.5"
                  value={localSettings.maxDailyProductionHours}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      maxDailyProductionHours: Number(e.target.value)
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg font-mono bg-white"
                />
                <span className="text-[11px] text-[#8C7A70] block mt-1">
                  Se um dia ultrapassar esse valor, o sistema alerta conflito de carga e espalha as etapas.
                </span>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-[#EDE4DA] bg-[#FAF7F2]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#6A3102]" />
                    <h4 className="text-sm font-bold text-[#231815]">Google Calendar</h4>
                  </div>
                  {accessToken ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Conectado
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
                      Não conectado
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#73645B] leading-relaxed mb-4">
                  Sincronize automaticamente os blocos de produção, prazos de entrega e janelas de aprovação com o seu Google Agenda principal.
                </p>

                {user && accessToken ? (
                  <div className="bg-white p-3.5 rounded-xl border border-[#EDE4DA] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || 'Usuário'}
                          className="w-9 h-9 rounded-full border border-emerald-400"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                          {(user.displayName || user.email || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="text-xs font-bold text-[#231815] block">
                          {user.displayName || 'Usuário Conectado'}
                        </span>
                        <span className="text-[11px] font-mono text-[#8C7A70] block">
                          {user.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {onOpenGoogleCalendarModal && (
                        <button
                          type="button"
                          onClick={onOpenGoogleCalendarModal}
                          className="px-3 py-1.5 bg-[#6A3102] hover:bg-[#522501] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Painel de Sincronização
                        </button>
                      )}
                      {onSignOutGoogle && (
                        <button
                          type="button"
                          onClick={onSignOutGoogle}
                          className="px-3 py-1.5 border border-stone-300 hover:bg-stone-50 text-stone-600 hover:text-red-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Desconectar
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    {onSignInGoogle && (
                      <button
                        type="button"
                        onClick={onSignInGoogle}
                        className="inline-flex items-center gap-2.5 px-4 py-2 bg-white border border-stone-300 rounded-xl font-semibold text-xs text-stone-700 hover:bg-stone-50 hover:shadow-xs transition-all cursor-pointer shadow-2xs"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        </svg>
                        <span>Conectar Conta Google</span>
                      </button>
                    )}
                  </div>
                )}

                <div className="border-t border-[#EDE4DA] pt-3 text-[11px] text-[#8C7A70] space-y-1">
                  <p>• Escopo concedido: <code>https://www.googleapis.com/auth/calendar.events</code></p>
                  <p>• Etapas sincronizadas possuem identificador e lembretes aos 15 minutos de antecedência.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-[#EDE4DA] bg-[#FAF7F2]">
                <h4 className="text-xs font-bold text-[#6A3102] uppercase tracking-wider mb-1">
                  Exportar e Salvar Backup
                </h4>
                <p className="text-xs text-[#73645B] mb-3">
                  Gere um arquivo JSON com todas as demandas, histórico, etapas e configurações.
                </p>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-white border border-[#EDE4DA] text-xs font-semibold text-[#231815] rounded-lg hover:bg-[#F5EFE6] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Backup Completo (JSON)</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-[#EDE4DA] bg-white">
                <h4 className="text-xs font-bold text-[#231815] uppercase tracking-wider mb-1">
                  Restaurar / Importar Backup
                </h4>
                <p className="text-xs text-[#73645B] mb-3">
                  Carregue um arquivo JSON previamente salvo neste computador.
                </p>
                <label className="px-4 py-2 bg-[#FAF7F2] border border-[#EDE4DA] text-xs font-semibold text-[#231815] rounded-lg hover:bg-[#EDE4DA] transition-colors inline-flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Selecionar Arquivo JSON</span>
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>
              </div>

              <div className="p-4 rounded-xl border border-red-200 bg-red-50/50">
                <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider mb-1">
                  Zerar Base de Demandas
                </h4>
                <p className="text-xs text-red-700 mb-3">
                  Exclui todas as demandas cadastradas e deixa o painel completamente limpo para nova produção.
                </p>
                <button
                  onClick={handleResetDemo}
                  className="px-4 py-2 bg-white border border-red-300 text-xs font-semibold text-red-700 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar Todas as Demandas</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#5C4D44] uppercase tracking-wider">
                Auditoria e Histórico de Ações
              </h4>
              {auditLogs.length === 0 ? (
                <p className="text-xs text-[#8C7A70]">Nenhum registro de log no momento.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg border border-[#EDE4DA] bg-white text-xs"
                    >
                      <div className="flex items-center justify-between text-[#8C7A70] text-[10px]">
                        <span className="font-bold text-[#6A3102] uppercase">{log.action}</span>
                        <span className="font-mono">{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                      </div>
                      <p className="text-[#231815] mt-1">{log.details}</p>
                      {log.taskTitle && (
                        <span className="text-[10px] text-[#8C7A70] block mt-0.5">
                          Demanda: {log.taskTitle}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#EDE4DA] bg-[#FAF7F2]">
          {saveSuccess ? (
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              Configurações salvas com sucesso!
            </span>
          ) : (
            <span className="text-xs text-[#8C7A70]">Persistência local ativa</span>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#5C4D44] hover:text-[#231815]"
            >
              Fechar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold bg-[#6A3102] hover:bg-[#542601] text-white rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
