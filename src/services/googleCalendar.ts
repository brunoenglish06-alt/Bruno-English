import { Task, TaskStage, GoogleCalendarEvent } from '../types';

const BASE_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

// Map stage types to Google Calendar event color IDs:
// 1: Lavender, 2: Sage, 3: Grape, 4: Flamingo, 5: Banana (Yellow), 6: Tangerine (Orange), 7: Peacock (Cyan), 8: Graphite, 9: Blueberry (Blue), 10: Basil (Green), 11: Tomato (Red)
const STAGE_COLOR_MAP: Record<string, string> = {
  production: '9', // Blueberry / Azul
  review: '7', // Peacock / Ciano
  send_approval: '5', // Banana / Amarelo
  awaiting_approval: '5', // Banana / Amarelo
  adjustments: '6', // Tangerine / Laranja
  finalization: '2', // Sage / Verde suave
  delivery: '10' // Basil / Verde destaque
};

// Helper to get local ISO string with offset
function toLocalISOString(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  const dt = new Date(year, month - 1, day, hour, minute, 0);
  return dt.toISOString();
}

export async function listCalendarEvents(
  accessToken: string,
  timeMin?: string,
  timeMax?: string
): Promise<GoogleCalendarEvent[]> {
  try {
    const params = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '100'
    });

    if (timeMin) params.append('timeMin', timeMin);
    if (timeMax) params.append('timeMax', timeMax);

    const res = await fetch(`${BASE_URL}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Erro ${res.status} ao consultar eventos.`);
    }

    const data = await res.json();
    return (data.items || []).map((item: any) => ({
      id: item.id,
      summary: item.summary || '(Sem título)',
      description: item.description,
      location: item.location,
      htmlLink: item.htmlLink,
      start: item.start || {},
      end: item.end || {},
      colorId: item.colorId
    }));
  } catch (err) {
    console.error('Erro ao listar eventos do Google Calendar:', err);
    throw err;
  }
}

export async function createCalendarEvent(
  accessToken: string,
  eventData: {
    summary: string;
    description: string;
    start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string };
    colorId?: string;
  }
): Promise<{ id: string; htmlLink?: string }> {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';

  const payload = {
    ...eventData,
    start: {
      ...eventData.start,
      timeZone
    },
    end: {
      ...eventData.end,
      timeZone
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 15 },
        { method: 'popup', minutes: 60 }
      ]
    }
  };

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro ao criar evento (${res.status})`);
  }

  const result = await res.json();
  return { id: result.id, htmlLink: result.htmlLink };
}

export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  eventData: {
    summary: string;
    description: string;
    start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string };
    colorId?: string;
  }
): Promise<{ id: string; htmlLink?: string }> {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';

  const payload = {
    ...eventData,
    start: {
      ...eventData.start,
      timeZone
    },
    end: {
      ...eventData.end,
      timeZone
    }
  };

  const res = await fetch(`${BASE_URL}/${eventId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro ao atualizar evento (${res.status})`);
  }

  const result = await res.json();
  return { id: result.id, htmlLink: result.htmlLink };
}

export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/${eventId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok && res.status !== 404) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro ao remover evento (${res.status})`);
  }

  return true;
}

// Build standard event summary and description for a stage
export function buildStageEventPayload(task: Task, stage: TaskStage) {
  const summary = `[OIP] ${task.client} • ${stage.title}`;
  const description = [
    `📌 DEMANDA: ${task.title}`,
    `👤 CLIENTE: ${task.client}`,
    `🏷️ TIPO: ${task.type}`,
    `⚡ PRIORIDADE: ${task.priority.toUpperCase()}`,
    `🚀 ETAPA: ${stage.title} (${stage.durationMinutes} min)`,
    `🎯 PRAZO FINAL DA DEMANDA: ${task.deadlineDate} às ${task.deadlineTime}`,
    stage.notes ? `📝 NOTAS DA ETAPA: ${stage.notes}` : '',
    task.description ? `📋 BRIEFING: ${task.description}` : '',
    '\n---\nAgendado automaticamente pelo Organizador Inteligente de Produção'
  ]
    .filter(Boolean)
    .join('\n');

  return {
    summary,
    description,
    start: { dateTime: toLocalISOString(stage.date, stage.startTime) },
    end: { dateTime: toLocalISOString(stage.date, stage.endTime) },
    colorId: STAGE_COLOR_MAP[stage.type] || '9'
  };
}

// Sync a single task's stages to Google Calendar
export async function syncTaskToGoogleCalendar(
  task: Task,
  accessToken: string
): Promise<{ updatedTask: Task; syncedStagesCount: number }> {
  const now = new Date().toISOString();
  let count = 0;

  const updatedStages = [...task.stages];

  for (let i = 0; i < updatedStages.length; i++) {
    const stage = updatedStages[i];
    const payload = buildStageEventPayload(task, stage);

    try {
      if (stage.googleCalendarEventId) {
        // Try updating existing
        try {
          await updateCalendarEvent(accessToken, stage.googleCalendarEventId, payload);
          updatedStages[i] = {
            ...stage,
            googleCalendarSyncedAt: now
          };
          count++;
          continue;
        } catch {
          // If update failed (e.g. event deleted on Google Calendar), recreate it
        }
      }

      // Create new event
      const created = await createCalendarEvent(accessToken, payload);
      updatedStages[i] = {
        ...stage,
        googleCalendarEventId: created.id,
        googleCalendarSyncedAt: now
      };
      count++;
    } catch (stageErr) {
      console.error(`Falha ao sincronizar etapa ${stage.title}:`, stageErr);
    }
  }

  const updatedTask: Task = {
    ...task,
    stages: updatedStages,
    googleCalendarSyncedAt: now
  };

  return { updatedTask, syncedStagesCount: count };
}

// Delete all Google Calendar events associated with a task
export async function deleteTaskEventsFromGoogleCalendar(
  task: Task,
  accessToken: string
): Promise<Task> {
  const updatedStages = [...task.stages];

  for (let i = 0; i < updatedStages.length; i++) {
    const stage = updatedStages[i];
    if (stage.googleCalendarEventId) {
      try {
        await deleteCalendarEvent(accessToken, stage.googleCalendarEventId);
      } catch (err) {
        console.warn(`Erro ao excluir evento ${stage.googleCalendarEventId}:`, err);
      }
      updatedStages[i] = {
        ...stage,
        googleCalendarEventId: undefined,
        googleCalendarSyncedAt: undefined
      };
    }
  }

  return {
    ...task,
    stages: updatedStages,
    googleCalendarEventId: undefined,
    googleCalendarSyncedAt: undefined
  };
}
