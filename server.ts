import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '.data');
const DB_FILE = path.join(DATA_DIR, 'realtime-db.json');

interface RealtimeActivity {
  id: string;
  type: string;
  actorId: string;
  actorName: string;
  summary: string;
  timestamp: string;
}

interface RealtimeDatabase {
  version: number;
  updatedAt: string;
  workgroups: Record<string, any>;
  tasks: Record<string, any>;
  deletedGroupIds: string[];
  deletedTaskIds: string[];
  recentEvents: RealtimeActivity[];
}

const DEFAULT_INITIAL_GROUP = {
  id: 'group-design-team',
  name: 'Equipe de Design',
  description: 'Grupo principal de criação, social media e produção audiovisual',
  adminId: 'member-bruno',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  members: [
    {
      id: 'member-bruno',
      name: 'Bruno',
      email: 'bruno.english06@gmail.com',
      role: 'admin',
      specialty: 'Designer de Feed',
      avatarUrl: ''
    },
    {
      id: 'member-ana',
      name: 'Ana',
      email: 'ana.socialmedia@creative.com',
      role: 'member',
      specialty: 'Social Media',
      avatarUrl: ''
    },
    {
      id: 'member-carlos',
      name: 'Carlos',
      email: 'carlos.video@creative.com',
      role: 'member',
      specialty: 'Editor de Vídeo',
      avatarUrl: ''
    }
  ]
};

function loadDatabase(): RealtimeDatabase {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        version: typeof parsed.version === 'number' ? parsed.version : 1,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
        workgroups: parsed.workgroups && typeof parsed.workgroups === 'object' ? parsed.workgroups : {},
        tasks: parsed.tasks && typeof parsed.tasks === 'object' ? parsed.tasks : {},
        deletedGroupIds: Array.isArray(parsed.deletedGroupIds) ? parsed.deletedGroupIds : [],
        deletedTaskIds: Array.isArray(parsed.deletedTaskIds) ? parsed.deletedTaskIds : [],
        recentEvents: Array.isArray(parsed.recentEvents) ? parsed.recentEvents : []
      };
    }
  } catch (err) {
    console.error('Failed to read realtime-db.json, initializing fresh state:', err);
  }

  const initial: RealtimeDatabase = {
    version: 1,
    updatedAt: new Date().toISOString(),
    workgroups: {
      [DEFAULT_INITIAL_GROUP.id]: DEFAULT_INITIAL_GROUP
    },
    tasks: {},
    deletedGroupIds: [],
    deletedTaskIds: [],
    recentEvents: []
  };
  saveDatabase(initial);
  return initial;
}

function saveDatabase(state: RealtimeDatabase): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    console.error('Failed to persist realtime-db.json:', err);
  }
}

const dbState: RealtimeDatabase = loadDatabase();

interface ClientSession {
  clientId: string;
  memberName: string;
  lastSeen: number;
  sseResponses: Set<express.Response>;
}

const sessions = new Map<string, ClientSession>();

function touchSession(clientId: string, memberName?: string): void {
  if (!clientId) return;
  const now = Date.now();
  const existing = sessions.get(clientId);
  if (existing) {
    existing.lastSeen = now;
    if (memberName && memberName.trim()) {
      existing.memberName = memberName.trim();
    }
  } else {
    sessions.set(clientId, {
      clientId,
      memberName: memberName?.trim() || 'Integrante',
      lastSeen: now,
      sseResponses: new Set()
    });
  }
}

function getPresenceSummary() {
  const now = Date.now();
  const activeMembers: Array<{ clientId: string; memberName: string; lastSeen: number }> = [];

  for (const [id, session] of sessions.entries()) {
    const hasOpenStream = session.sseResponses.size > 0;
    const isRecentlyActive = now - session.lastSeen < 15000;
    if (hasOpenStream || isRecentlyActive) {
      activeMembers.push({
        clientId: session.clientId,
        memberName: session.memberName,
        lastSeen: session.lastSeen
      });
    } else if (now - session.lastSeen > 60000) {
      sessions.delete(id);
    }
  }

  return {
    onlineCount: Math.max(1, activeMembers.length),
    onlineMembers: activeMembers
  };
}

function getPublicState() {
  const deletedGroupsSet = new Set(dbState.deletedGroupIds);
  const deletedTasksSet = new Set(dbState.deletedTaskIds);

  const workgroupsList = Object.values(dbState.workgroups).filter(
    (g: any) => g && g.id && !deletedGroupsSet.has(g.id)
  );
  const tasksList = Object.values(dbState.tasks).filter(
    (t: any) => t && t.id && !deletedTasksSet.has(t.id)
  );

  return {
    version: dbState.version,
    updatedAt: dbState.updatedAt,
    workgroups: workgroupsList,
    tasks: tasksList,
    deletedGroupIds: dbState.deletedGroupIds,
    deletedTaskIds: dbState.deletedTaskIds,
    recentEvents: dbState.recentEvents.slice(0, 20)
  };
}

function recordActivity(
  type: string,
  actorId: string,
  actorName: string,
  summary: string
): RealtimeActivity {
  const event: RealtimeActivity = {
    id: 'evt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    type,
    actorId: actorId || 'unknown',
    actorName: actorName || 'Integrante da Equipe',
    summary,
    timestamp: new Date().toISOString()
  };
  dbState.recentEvents = [event, ...dbState.recentEvents].slice(0, 25);
  return event;
}

function broadcastSSE(payload: Record<string, any>): void {
  const serialized = `data: ${JSON.stringify(payload)}\n\n`;
  for (const session of sessions.values()) {
    for (const res of session.sseResponses) {
      try {
        res.write(serialized);
      } catch {
        session.sseResponses.delete(res);
      }
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // 1. Real-time Server-Sent Events (SSE) stream
  app.get('/api/realtime/stream', (req, res) => {
    const clientId = String(req.query.clientId || 'anon-' + Date.now());
    const memberName = String(req.query.memberName || 'Integrante');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    touchSession(clientId, memberName);
    const session = sessions.get(clientId)!;
    session.sseResponses.add(res);

    // Send initial authoritative state immediately on connect
    const initPayload = {
      type: 'init',
      state: getPublicState(),
      presence: getPresenceSummary()
    };
    res.write(`data: ${JSON.stringify(initPayload)}\n\n`);

    // Notify everyone of updated online count/presence
    broadcastSSE({
      type: 'presence:update',
      presence: getPresenceSummary()
    });

    req.on('close', () => {
      const current = sessions.get(clientId);
      if (current) {
        current.sseResponses.delete(res);
      }
      broadcastSSE({
        type: 'presence:update',
        presence: getPresenceSummary()
      });
    });
  });

  // 2. Fast state & delta polling endpoint (fallback & initial sync)
  app.get('/api/realtime/state', (req, res) => {
    const clientId = String(req.query.clientId || '');
    const memberName = req.query.memberName ? String(req.query.memberName) : undefined;
    const sinceVersion = Number(req.query.sinceVersion || 0);

    if (clientId) {
      touchSession(clientId, memberName);
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    if (sinceVersion > 0 && sinceVersion === dbState.version) {
      res.json({
        hasChanges: false,
        version: dbState.version,
        presence: getPresenceSummary()
      });
      return;
    }

    res.json({
      hasChanges: true,
      state: getPublicState(),
      presence: getPresenceSummary()
    });
  });

  // 3. Authoritative mutation endpoint
  app.post('/api/realtime/mutate', (req, res) => {
    const { action, payload = {}, clientId = '', actorName = 'Integrante' } = req.body || {};
    if (clientId) {
      touchSession(clientId, actorName);
    }

    const now = new Date().toISOString();
    let changed = false;
    let latestEvent: RealtimeActivity | null = null;

    const deletedGroupsSet = new Set(dbState.deletedGroupIds);
    const deletedTasksSet = new Set(dbState.deletedTaskIds);

    switch (action) {
      case 'client:handshake': {
        // Merge any non-deleted client workgroups or tasks that are newer or missing on server
        const clientGroups: any[] = Array.isArray(payload.workgroups) ? payload.workgroups : [];
        const clientTasks: any[] = Array.isArray(payload.tasks) ? payload.tasks : [];

        for (const cg of clientGroups) {
          if (!cg || !cg.id || deletedGroupsSet.has(cg.id)) continue;
          const sg = dbState.workgroups[cg.id];
          if (!sg) {
            dbState.workgroups[cg.id] = {
              ...cg,
              updatedAt: cg.updatedAt || cg.createdAt || now
            };
            changed = true;
          } else {
            const clientTime = cg.updatedAt ? new Date(cg.updatedAt).getTime() : 0;
            const serverTime = sg.updatedAt ? new Date(sg.updatedAt).getTime() : 0;
            if (clientTime > serverTime) {
              dbState.workgroups[cg.id] = cg;
              changed = true;
            }
          }
        }

        for (const ct of clientTasks) {
          if (!ct || !ct.id || deletedTasksSet.has(ct.id)) continue;
          const st = dbState.tasks[ct.id];
          if (!st) {
            dbState.tasks[ct.id] = {
              ...ct,
              updatedAt: ct.updatedAt || ct.createdAt || now
            };
            changed = true;
          } else {
            const clientTime = ct.updatedAt ? new Date(ct.updatedAt).getTime() : 0;
            const serverTime = st.updatedAt ? new Date(st.updatedAt).getTime() : 0;
            if (clientTime > serverTime) {
              dbState.tasks[ct.id] = ct;
              changed = true;
            }
          }
        }
        break;
      }

      case 'workgroup:upsert': {
        const group = payload.group;
        if (group && group.id) {
          dbState.deletedGroupIds = dbState.deletedGroupIds.filter((id) => id !== group.id);
          dbState.workgroups[group.id] = {
            ...group,
            updatedAt: group.updatedAt || now,
            members: Array.isArray(group.members) ? group.members : []
          };
          changed = true;
          latestEvent = recordActivity(
            'workgroup:upsert',
            clientId,
            actorName,
            payload.summary || `${actorName} atualizou o grupo "${group.name}"`
          );
        }
        break;
      }

      case 'workgroup:delete': {
        const groupId = payload.groupId;
        const deleteAssociatedTasks = Boolean(payload.deleteAssociatedTasks);
        const nextGroupId = payload.nextGroupId || '';

        if (groupId) {
          const targetName = dbState.workgroups[groupId]?.name || groupId;
          if (!deletedGroupsSet.has(groupId)) {
            dbState.deletedGroupIds.push(groupId);
          }
          delete dbState.workgroups[groupId];

          // Handle tasks belonging to this group
          for (const [tid, t] of Object.entries(dbState.tasks)) {
            if (t && t.groupId === groupId) {
              if (deleteAssociatedTasks) {
                if (!deletedTasksSet.has(tid)) {
                  dbState.deletedTaskIds.push(tid);
                }
                delete dbState.tasks[tid];
              } else {
                dbState.tasks[tid] = {
                  ...t,
                  groupId: nextGroupId || undefined,
                  updatedAt: now
                };
              }
            }
          }

          changed = true;
          latestEvent = recordActivity(
            'workgroup:delete',
            clientId,
            actorName,
            `${actorName} apagou o grupo "${targetName}"`
          );
        }
        break;
      }

      case 'task:upsert': {
        const task = payload.task;
        if (task && task.id) {
          const isNew = !dbState.tasks[task.id];
          dbState.deletedTaskIds = dbState.deletedTaskIds.filter((id) => id !== task.id);
          dbState.tasks[task.id] = {
            ...task,
            updatedAt: task.updatedAt || now
          };
          changed = true;
          latestEvent = recordActivity(
            'task:upsert',
            clientId,
            actorName,
            payload.summary ||
              (isNew
                ? `${actorName} criou a demanda "${task.title}"`
                : `${actorName} atualizou a demanda "${task.title}"`)
          );
        }
        break;
      }

      case 'task:batch_upsert': {
        const tasks: any[] = Array.isArray(payload.tasks) ? payload.tasks : [];
        for (const t of tasks) {
          if (t && t.id) {
            dbState.deletedTaskIds = dbState.deletedTaskIds.filter((id) => id !== t.id);
            dbState.tasks[t.id] = {
              ...t,
              updatedAt: t.updatedAt || now
            };
            changed = true;
          }
        }
        if (changed) {
          latestEvent = recordActivity(
            'task:batch_upsert',
            clientId,
            actorName,
            payload.summary || `${actorName} sincronizou ${tasks.length} demanda(s)`
          );
        }
        break;
      }

      case 'task:delete': {
        const taskId = payload.taskId;
        if (taskId) {
          const existingTitle = dbState.tasks[taskId]?.title || payload.taskTitle || taskId;
          if (!deletedTasksSet.has(taskId)) {
            dbState.deletedTaskIds.push(taskId);
          }
          delete dbState.tasks[taskId];
          changed = true;
          latestEvent = recordActivity(
            'task:delete',
            clientId,
            actorName,
            `${actorName} removeu a demanda "${existingTitle}"`
          );
        }
        break;
      }

      case 'tasks:clear': {
        for (const tid of Object.keys(dbState.tasks)) {
          if (!deletedTasksSet.has(tid)) {
            dbState.deletedTaskIds.push(tid);
          }
        }
        dbState.tasks = {};
        changed = true;
        latestEvent = recordActivity(
          'tasks:clear',
          clientId,
          actorName,
          `${actorName} limpou todas as demandas`
        );
        break;
      }

      case 'presence:update': {
        broadcastSSE({
          type: 'presence:update',
          presence: getPresenceSummary()
        });
        break;
      }
    }

    if (changed) {
      dbState.version += 1;
      dbState.updatedAt = now;
      saveDatabase(dbState);

      broadcastSSE({
        type: 'state:sync',
        senderClientId: clientId,
        event: latestEvent,
        state: getPublicState(),
        presence: getPresenceSummary()
      });
    }

    res.json({
      ok: true,
      state: getPublicState(),
      presence: getPresenceSummary()
    });
  });

  // Periodic keep-alive ping for SSE connections
  setInterval(() => {
    for (const session of sessions.values()) {
      for (const res of session.sseResponses) {
        try {
          res.write(`: keepalive ${Date.now()}\n\n`);
        } catch {
          session.sseResponses.delete(res);
        }
      }
    }
  }, 15000);

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
