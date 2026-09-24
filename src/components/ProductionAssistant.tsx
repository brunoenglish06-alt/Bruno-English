import React, { useState } from 'react';
import {
  Sparkles,
  HelpCircle,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Send,
  Bot,
  User,
  ArrowRight,
  Flame,
  ShieldCheck
} from 'lucide-react';
import { Task, UserSettings, RiskLevel } from '../types';
import {
  getTodayISO,
  formatReadableDate,
  getDiffInDays,
  formatHours,
  timeToMinutes
} from '../utils/dateUtils';
import { PRIORITY_CONFIG, STAGE_TYPE_CONFIG } from '../utils/statusConfig';

interface ProductionAssistantProps {
  tasks: Task[];
  settings: UserSettings;
  overallRisk: RiskLevel;
  onSelectTask: (task: Task) => void;
  onOpenNewTask: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedTasks?: Task[];
}

export const ProductionAssistant: React.FC<ProductionAssistantProps> = ({
  tasks,
  settings,
  overallRisk,
  onSelectTask,
  onOpenNewTask
}) => {
  const today = getTodayISO();

  // Preset Questions requested by the user
  const presetQuestions = [
    { id: 'today', label: 'Tenho algo para fazer hoje?' },
    { id: 'next', label: 'Qual é minha próxima tarefa?' },
    { id: 'near_deadline', label: 'O que está perto do prazo?' },
    { id: 'am_i_late', label: 'Estou atrasado?' },
    { id: 'start_now', label: 'Qual tarefa preciso começar agora para não atrasar?' },
    { id: 'pending_approval', label: 'Tenho alguma aprovação pendente?' },
    { id: 'next_delivery', label: 'Qual é a próxima entrega importante?' }
  ];

  // Helper to generate intelligent answers based on real dataset
  const generateIntelligentAnswer = (queryId: string, customQuery?: string): {
    text: string;
    suggestedTasks?: Task[];
  } => {
    const activeTasks = tasks.filter((t) => t.status !== 'delivered');
    const overdueTasks = activeTasks.filter((t) => getDiffInDays(today, t.deadlineDate) < 0);
    const todayStages = activeTasks.flatMap((t) =>
      t.stages.filter((s) => s.date === today && !s.completed).map((s) => ({ stage: s, task: t }))
    );
    todayStages.sort((a, b) => timeToMinutes(a.stage.startTime) - timeToMinutes(b.stage.startTime));

    const awaitingApproval = activeTasks.filter(
      (t) => t.status === 'awaiting_approval' || t.status === 'sent_for_approval'
    );

    // Sort active tasks by deadline
    const sortedByDeadline = [...activeTasks].sort((a, b) =>
      a.deadlineDate.localeCompare(b.deadlineDate)
    );

    // Helper to deduplicate tasks by id
    const uniqueTasks = (list: Task[]): Task[] => {
      const map = new Map<string, Task>();
      for (const t of list) {
        if (t && t.id) map.set(t.id, t);
      }
      return Array.from(map.values());
    };

    if (queryId === 'today') {
      if (todayStages.length === 0) {
        return {
          text: 'Boa notícia! Você não tem nenhuma etapa de produção pendente agendada para hoje. Todas as demandas estão com folga ou em aprovação com os clientes.',
          suggestedTasks: []
        };
      }
      const list = todayStages
        .map(
          (item) =>
            `• ${item.stage.startTime} – ${item.task.client}: ${item.stage.title} (${formatHours(
              item.stage.durationMinutes / 60
            )})`
        )
        .join('\n');
      return {
        text: `Você possui ${todayStages.length} etapa(s) agendada(s) para hoje:\n\n${list}\n\nDica do assistente: Foque em concluir a revisão ou envio de aprovação logo pela manhã para abrir a janela de retorno do cliente.`,
        suggestedTasks: uniqueTasks(todayStages.map((i) => i.task))
      };
    }

    if (queryId === 'next') {
      if (todayStages.length > 0) {
        const nextItem = todayStages[0];
        return {
          text: `Sua próxima atividade imediata é:\n\n🎯 "${nextItem.stage.title}" para o cliente ${nextItem.task.client}.\n⏰ Horário previsto: ${nextItem.stage.startTime} às ${nextItem.stage.endTime}.\nEtapa: ${STAGE_TYPE_CONFIG[nextItem.stage.type].label}.`,
          suggestedTasks: uniqueTasks([nextItem.task])
        };
      }
      if (sortedByDeadline.length > 0) {
        const next = sortedByDeadline[0];
        return {
          text: `Para hoje você não tem horários marcados. A próxima demanda em seu fluxo é "${next.title}" (${next.client}), com prazo final em ${formatReadableDate(next.deadlineDate)}.`,
          suggestedTasks: uniqueTasks([next])
        };
      }
      return {
        text: 'Não há tarefas ativas no momento. Que tal cadastrar uma nova demanda?',
        suggestedTasks: []
      };
    }

    if (queryId === 'near_deadline') {
      const near = activeTasks.filter((t) => {
        const diff = getDiffInDays(today, t.deadlineDate);
        return diff >= 0 && diff <= 3;
      });

      if (near.length === 0) {
        return {
          text: 'Nenhuma tarefa está com prazo crítico nos próximos 3 dias. Sua agenda está confortável com margem de segurança.',
          suggestedTasks: []
        };
      }

      const list = near
        .map(
          (t) =>
            `• ${t.client} — ${t.title}: entrega em ${formatReadableDate(t.deadlineDate, false)} às ${
              t.deadlineTime
            } (Faltam ${getDiffInDays(today, t.deadlineDate)} dia(s))`
        )
        .join('\n');
      return {
        text: `Temos ${near.length} demanda(s) com prazo próximo (em até 3 dias):\n\n${list}\n\nRecomendo verificar se os arquivos já foram encaminhados para aprovação.`,
        suggestedTasks: uniqueTasks(near)
      };
    }

    if (queryId === 'am_i_late') {
      if (overdueTasks.length > 0) {
        const list = overdueTasks
          .map(
            (t) =>
              `• ⚠️ ${t.client} — ${t.title}: o prazo venceu em ${formatReadableDate(
                t.deadlineDate,
                false
              )} (${Math.abs(getDiffInDays(today, t.deadlineDate))} dia(s) atrás)`
          )
          .join('\n');
        return {
          text: `Atenção: Existem ${overdueTasks.length} demanda(s) com prazo final vencido que precisam de ação imediata:\n\n${list}\n\nClique no botão de replanejar para ajustar novas datas com o cliente.`,
          suggestedTasks: uniqueTasks(overdueTasks)
        };
      }
      return {
        text: 'Não! Nenhuma demanda está com prazo final vencido. Todas estão dentro dos prazos planejados ou concluídas.',
        suggestedTasks: []
      };
    }

    if (queryId === 'start_now') {
      // Find highest urgency task that is not finished
      const urgentPending = [...activeTasks].sort((a, b) => {
        if (a.riskLevel === 'critical' || a.riskLevel === 'high') return -1;
        if (b.riskLevel === 'critical' || b.riskLevel === 'high') return 1;
        return a.deadlineDate.localeCompare(b.deadlineDate);
      });

      if (urgentPending.length > 0) {
        const top = urgentPending[0];
        return {
          text: `A tarefa que você deve começar AGORA é:\n\n🔥 "${top.title}" (${top.client})\n\nMotivo do planejador: ${
            top.riskExplanation ||
            'Possui o prazo mais apertado e necessita de produção antes da aprovação do cliente.'
          }\nPrazo final: ${formatReadableDate(top.deadlineDate)} às ${top.deadlineTime}.`,
          suggestedTasks: uniqueTasks([top])
        };
      }
      return {
        text: 'Você está em dia! Não há nenhuma tarefa urgente exigindo início imediato agora.',
        suggestedTasks: []
      };
    }

    if (queryId === 'pending_approval') {
      if (awaitingApproval.length === 0) {
        return {
          text: 'Você não tem nenhuma aprovação pendente no momento. Todos os clientes já responderam ou não há peças aguardando feedback.',
          suggestedTasks: []
        };
      }
      const list = awaitingApproval
        .map(
          (t) =>
            `• ${t.client} — ${t.title} (Prazo final de entrega: ${formatReadableDate(
              t.deadlineDate,
              false
            )})`
        )
        .join('\n');
      return {
        text: `Você tem ${awaitingApproval.length} demanda(s) aguardando retorno do cliente:\n\n${list}\n\nLembrete: O sistema já reservou tempo para possíveis ajustes assim que o cliente responder.`,
        suggestedTasks: uniqueTasks(awaitingApproval)
      };
    }

    if (queryId === 'next_delivery') {
      if (sortedByDeadline.length > 0) {
        const first = sortedByDeadline[0];
        const days = getDiffInDays(today, first.deadlineDate);
        return {
          text: `Sua próxima entrega de destaque é:\n\n📦 "${first.title}" para ${first.client}.\n📅 Data de Entrega: ${formatReadableDate(
            first.deadlineDate
          )} às ${first.deadlineTime} (${days === 0 ? 'HOJE' : `em ${days} dia(s)`}).\nStatus atual: ${
            first.status
          }.`,
          suggestedTasks: uniqueTasks([first])
        };
      }
      return {
        text: 'Nenhuma entrega agendada no momento.',
        suggestedTasks: []
      };
    }

    // Default general answer
    return {
      text: `Entendi sua dúvida sobre "${customQuery}". Como seu assistente de produção inteligente, analisei suas ${activeTasks.length} demandas ativas: seu nível geral de risco está ${overallRisk.toUpperCase()}. Posso te mostrar o que fazer hoje, recalcular etapas ou conferir aprovações pendentes.`,
      suggestedTasks: uniqueTasks(activeTasks.slice(0, 2))
    };
  };

  // Chat message history
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Olá! Eu sou seu Assistente de Produção. Analiso constantemente seus prazos, margens de segurança e capacidade da agenda para que você nunca deixe nada para a última hora. Como posso te ajudar agora?',
      timestamp: 'Agora'
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');

  const handleSelectPreset = (q: (typeof presetQuestions)[0]) => {
    const userMsg: ChatMessage = {
      id: 'u-' + Date.now(),
      sender: 'user',
      text: q.label,
      timestamp: 'Agora'
    };

    const response = generateIntelligentAnswer(q.id);

    const botMsg: ChatMessage = {
      id: 'b-' + Date.now(),
      sender: 'assistant',
      text: response.text,
      timestamp: 'Agora',
      suggestedTasks: response.suggestedTasks
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
  };

  const handleSendCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;

    const query = inputQuery.trim();
    setInputQuery('');

    const userMsg: ChatMessage = {
      id: 'u-' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: 'Agora'
    };

    // Match keywords or generate intelligent summary
    let matchedId = 'general';
    const lower = query.toLowerCase();
    if (lower.includes('hoje') || lower.includes('dia')) matchedId = 'today';
    else if (lower.includes('próxima') || lower.includes('proxima')) matchedId = 'next';
    else if (lower.includes('prazo') || lower.includes('perto')) matchedId = 'near_deadline';
    else if (lower.includes('atras') || lower.includes('atrasado')) matchedId = 'am_i_late';
    else if (lower.includes('começar') || lower.includes('comecar') || lower.includes('agora'))
      matchedId = 'start_now';
    else if (lower.includes('aprova') || lower.includes('cliente')) matchedId = 'pending_approval';
    else if (lower.includes('entrega')) matchedId = 'next_delivery';

    const response = generateIntelligentAnswer(matchedId, query);

    const botMsg: ChatMessage = {
      id: 'b-' + Date.now(),
      sender: 'assistant',
      text: response.text,
      timestamp: 'Agora',
      suggestedTasks: response.suggestedTasks
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
  };

  return (
    <div className="space-y-6 text-[#231815]">
      {/* Header Banner */}
      <div className="bg-[#FAF7F2] p-6 rounded-2xl border border-[#EDE4DA] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[#6A3102] tracking-wider uppercase flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-[#B45309]" />
            <span>Assistente de Produção</span>
          </span>
          <h1 className="text-2xl font-bold font-display text-[#231815]">
            Seu Copiloto Preventivo de Prazos
          </h1>
          <p className="text-xs text-[#73645B] mt-0.5">
            Diagnóstico proativo da sua carga criativa, aprovações de clientes e folgas de segurança
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNewTask}
            className="px-4 py-2 bg-[#6A3102] hover:bg-[#542601] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            + Planejar Nova Demanda
          </button>
        </div>
      </div>

      {/* Preset Quick Questions (Requested by user) */}
      <div className="space-y-2.5">
        <span className="text-xs font-bold text-[#5C4D44] uppercase tracking-wider block">
          Perguntas Frequentes do Criativo (1 Clique)
        </span>
        <div className="flex flex-wrap gap-2">
          {presetQuestions.map((q) => (
            <button
              key={q.id}
              onClick={() => handleSelectPreset(q)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#EDE4DA] hover:border-[#6A3102] hover:text-[#6A3102] hover:bg-[#FAF7F2] text-[#231815] transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#8C7A70]" />
              <span>"{q.label}"</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat / Interaction Area */}
      <div className="bg-white rounded-2xl border border-[#EDE4DA] flex flex-col h-[520px] overflow-hidden shadow-xs">
        {/* Messages list */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${
                m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  m.sender === 'user'
                    ? 'bg-[#231815] text-white'
                    : 'bg-[#6A3102] text-white shadow-xs'
                }`}
              >
                {m.sender === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4 text-amber-200" />
                )}
              </div>

              <div
                className={`max-w-xl rounded-2xl p-4 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-[#6A3102] text-white rounded-tr-xs'
                    : 'bg-[#FAF7F2] border border-[#EDE4DA] text-[#231815] rounded-tl-xs whitespace-pre-line'
                }`}
              >
                {m.text}

                {/* Suggested task cards if returned */}
                {m.suggestedTasks && m.suggestedTasks.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#EDE4DA]/80 space-y-2">
                    <span className="text-[10px] font-bold text-[#8C7A70] uppercase block">
                      Demandas Relacionadas:
                    </span>
                    {m.suggestedTasks.map((st, sIdx) => (
                      <div
                        key={`${m.id}-${st.id}-${sIdx}`}
                        onClick={() => onSelectTask(st)}
                        className="p-2.5 rounded-lg bg-white border border-[#EDE4DA] hover:border-[#6A3102] transition-colors cursor-pointer flex items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-bold text-[#231815] block">{st.title}</span>
                          <span className="text-[10px] text-[#73645B]">
                            {st.client} · Prazo: {formatReadableDate(st.deadlineDate, false)}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#6A3102] shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input box */}
        <form
          onSubmit={handleSendCustom}
          className="p-4 border-t border-[#EDE4DA] bg-[#FAF7F2] flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Pergunte ao assistente sobre prazos, etapas ou conflitos..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            className="flex-1 px-4 py-2.5 text-xs bg-white border border-[#EDE4DA] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#6A3102] focus:border-[#6A3102] placeholder:text-[#A89C94]"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-[#6A3102] hover:bg-[#542601] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Perguntar</span>
          </button>
        </form>
      </div>
    </div>
  );
};
