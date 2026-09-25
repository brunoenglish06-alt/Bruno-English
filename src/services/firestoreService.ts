import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocFromServer
} from 'firebase/firestore';
import { getApps, initializeApp, getApp } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';
import { Task, WorkGroup } from '../types';
import { loadTasks, saveTasks } from '../utils/storage';

// Initialize Firebase App singleton (secondary cloud backup)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

const STORAGE_KEY_WORKGROUPS = 'oip_workgroups_v1';
const STORAGE_KEY_ACTIVE_GROUP_ID = 'oip_active_group_id_v1';
const STORAGE_KEY_DELETED_WORKGROUPS = 'oip_deleted_workgroups_v1';
const STORAGE_KEY_DELETED_TASKS = 'oip_deleted_tasks_v1';
const STORAGE_KEY_MEMBER_NAME = 'oip_active_member_name_v1';
const SESSION_KEY_CLIENT_ID = 'oip_client_session_id_v1';

// Unique session ID for this browser tab/window
export const CLIENT_ID: string = (() => {
  try {
    let existing = sessionStorage.getItem(SESSION_KEY_CLIENT_ID);
    if (!existing) {
      existing = 'client-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
      sessionStorage.setItem(SESSION_KEY_CLIENT_ID, existing);
    }
    return existing;
  } catch {
    return 'client-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
  }
})();

export interface PresenceInfo {
  onlineCount: number;
  onlineMembers: Array<{
    clientId: string;
    memberName: string;
    lastSeen: number;
  }>;
  isConnected: boolean;
  lastSyncedAt: string | null;
}

export interface RealtimeActivityEvent {
  id: string;
  type: string;
  actorId: string;
  actorName: string;
  summary: string;
  timestamp: string;
}

export function getCurrentMemberName(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_MEMBER_NAME) || 'Bruno';
  } catch {
    return 'Bruno';
  }
}

export function setCurrentMemberName(name: string): void {
  try {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem(STORAGE_KEY_MEMBER_NAME, trimmed);
    sendRealtimeMutation('presence:update', { memberName: trimmed }).catch(() => {});
  } catch (e) {
    console.error('Error setting member name', e);
  }
}

export function getDeletedGroupIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED_WORKGROUPS);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function setDeletedGroupIds(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_DELETED_WORKGROUPS, JSON.stringify(Array.from(new Set(ids))));
  } catch (e) {
    console.error('Error saving deleted group IDs', e);
  }
}

export function markGroupDeleted(groupId: string): void {
  const deleted = getDeletedGroupIds();
  deleted.add(groupId);
  setDeletedGroupIds(Array.from(deleted));
}

export function unmarkGroupDeleted(groupId: string): void {
  const deleted = getDeletedGroupIds();
  if (deleted.has(groupId)) {
    deleted.delete(groupId);
    setDeletedGroupIds(Array.from(deleted));
  }
}

export function getDeletedTaskIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED_TASKS);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function setDeletedTaskIds(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_DELETED_TASKS, JSON.stringify(Array.from(new Set(ids))));
  } catch (e) {
    console.error('Error saving deleted task IDs', e);
  }
}

export function markTaskDeleted(taskId: string): void {
  const deleted = getDeletedTaskIds();
  deleted.add(taskId);
  setDeletedTaskIds(Array.from(deleted));
}

export function unmarkTaskDeleted(taskId: string): void {
  const deleted = getDeletedTaskIds();
  if (deleted.has(taskId)) {
    deleted.delete(taskId);
    setDeletedTaskIds(Array.from(deleted));
  }
}

// Default initial workgroup matching user's exact specification
export const DEFAULT_INITIAL_GROUP: WorkGroup = {
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

// Test firestore connection per skill instructions
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'system', 'connection_probe'));
    return true;
  } catch {
    return false;
  }
}

// Local cache helpers
export function loadCachedWorkgroups(): WorkGroup[] {
  try {
    const deletedIds = getDeletedGroupIds();
    const raw = localStorage.getItem(STORAGE_KEY_WORKGROUPS);
    if (raw === null) {
      if (deletedIds.has(DEFAULT_INITIAL_GROUP.id)) {
        return [];
      }
      saveCachedWorkgroups([DEFAULT_INITIAL_GROUP]);
      return [DEFAULT_INITIAL_GROUP];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((g: WorkGroup) => g && g.id && !deletedIds.has(g.id))
        .map((g: WorkGroup) => ({
          ...g,
          members: Array.isArray(g?.members) ? g.members : []
        }));
    }
    return deletedIds.has(DEFAULT_INITIAL_GROUP.id) ? [] : [DEFAULT_INITIAL_GROUP];
  } catch {
    return [DEFAULT_INITIAL_GROUP];
  }
}

export function saveCachedWorkgroups(groups: WorkGroup[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_WORKGROUPS, JSON.stringify(groups));
  } catch (e) {
    console.error('Error saving cached workgroups', e);
  }
}

export function getActiveGroupId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_GROUP_ID) || DEFAULT_INITIAL_GROUP.id;
  } catch {
    return DEFAULT_INITIAL_GROUP.id;
  }
}

export function setActiveGroupId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_GROUP_ID, id);
  } catch (e) {
    console.error('Error setting active group ID', e);
  }
}

// ============================================================================
// REAL-TIME MULTI-USER ENGINE (SSE + Fast Delta Poll + BroadcastChannel)
// ============================================================================

const workgroupListeners = new Set<(groups: WorkGroup[]) => void>();
const taskListeners = new Set<(tasks: Task[]) => void>();
const presenceListeners = new Set<(presence: PresenceInfo) => void>();
const activityListeners = new Set<(event: RealtimeActivityEvent) => void>();

let currentServerVersion = 0;
let isEngineStarted = false;
let eventSourceInstance: EventSource | null = null;
let broadcastChannel: BroadcastChannel | null = null;
let seenEventIds = new Set<string>();

let currentPresence: PresenceInfo = {
  onlineCount: 1,
  onlineMembers: [
    {
      clientId: CLIENT_ID,
      memberName: getCurrentMemberName(),
      lastSeen: Date.now()
    }
  ],
  isConnected: true,
  lastSyncedAt: new Date().toISOString()
};

function notifyWorkgroupListeners(groups: WorkGroup[]) {
  for (const listener of workgroupListeners) {
    try {
      listener(groups);
    } catch (e) {
      console.error('Error in workgroup listener:', e);
    }
  }
}

function notifyTaskListeners(tasks: Task[]) {
  for (const listener of taskListeners) {
    try {
      listener(tasks);
    } catch (e) {
      console.error('Error in task listener:', e);
    }
  }
}

function notifyPresenceListeners(presence: PresenceInfo) {
  currentPresence = presence;
  for (const listener of presenceListeners) {
    try {
      listener(presence);
    } catch (e) {
      console.error('Error in presence listener:', e);
    }
  }
}

function notifyActivityListeners(event: RealtimeActivityEvent) {
  if (!event || !event.id || seenEventIds.has(event.id)) return;
  seenEventIds.add(event.id);
  if (seenEventIds.size > 100) {
    const arr = Array.from(seenEventIds);
    seenEventIds = new Set(arr.slice(arr.length - 50));
  }
  // Only notify UI toast if the action was triggered by another tab/user
  if (event.actorId && event.actorId !== CLIENT_ID) {
    for (const listener of activityListeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('Error in activity listener:', e);
      }
    }
  }
}

function applyServerState(
  serverState: {
    version?: number;
    workgroups?: WorkGroup[];
    tasks?: Task[];
    deletedGroupIds?: string[];
    deletedTaskIds?: string[];
    recentEvents?: RealtimeActivityEvent[];
  },
  presence?: {
    onlineCount: number;
    onlineMembers: Array<{ clientId: string; memberName: string; lastSeen: number }>;
  },
  incomingEvent?: RealtimeActivityEvent | null
) {
  if (!serverState) return;

  if (typeof serverState.version === 'number') {
    currentServerVersion = serverState.version;
  }

  if (Array.isArray(serverState.deletedGroupIds)) {
    setDeletedGroupIds(serverState.deletedGroupIds);
  }

  if (Array.isArray(serverState.deletedTaskIds)) {
    setDeletedTaskIds(serverState.deletedTaskIds);
  }

  const deletedGroups = getDeletedGroupIds();
  const deletedTasks = getDeletedTaskIds();

  if (Array.isArray(serverState.workgroups)) {
    const cleanGroups = serverState.workgroups
      .filter((g) => g && g.id && !deletedGroups.has(g.id))
      .map((g) => ({
        ...g,
        members: Array.isArray(g.members) ? g.members : []
      }));
    saveCachedWorkgroups(cleanGroups);
    notifyWorkgroupListeners(cleanGroups);
  }

  if (Array.isArray(serverState.tasks)) {
    const cleanTasks = serverState.tasks.filter((t) => t && t.id && !deletedTasks.has(t.id));
    saveTasks(cleanTasks);
    notifyTaskListeners(cleanTasks);
  }

  if (incomingEvent) {
    notifyActivityListeners(incomingEvent);
  } else if (Array.isArray(serverState.recentEvents) && serverState.recentEvents.length > 0) {
    // Mark initial events as seen on first boot so we don't toast old history
    for (const ev of serverState.recentEvents) {
      if (ev && ev.id) seenEventIds.add(ev.id);
    }
  }

  notifyPresenceListeners({
    onlineCount: presence?.onlineCount || currentPresence.onlineCount || 1,
    onlineMembers: presence?.onlineMembers || currentPresence.onlineMembers,
    isConnected: true,
    lastSyncedAt: new Date().toISOString()
  });
}

async function sendRealtimeMutation(action: string, payload: Record<string, any>): Promise<void> {
  // Broadcast immediately to other open tabs on the same browser (0ms latency)
  try {
    broadcastChannel?.postMessage({
      type: 'local_mutation',
      action,
      payload,
      senderClientId: CLIENT_ID,
      actorName: getCurrentMemberName(),
      timestamp: new Date().toISOString()
    });
  } catch {
    // Ignore BroadcastChannel errors
  }

  try {
    const response = await fetch('/api/realtime/mutate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action,
        payload,
        clientId: CLIENT_ID,
        actorName: getCurrentMemberName()
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.state) {
        applyServerState(data.state, data.presence, null);
      }
    }
  } catch (err) {
    console.warn('Realtime server mutation fallback to local cache:', err);
  }
}

export async function forceRealtimeSyncNow(): Promise<void> {
  try {
    const res = await fetch(
      `/api/realtime/state?clientId=${encodeURIComponent(CLIENT_ID)}&memberName=${encodeURIComponent(
        getCurrentMemberName()
      )}&sinceVersion=0`,
      { cache: 'no-store' }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.state) {
        applyServerState(data.state, data.presence, null);
      }
    }
  } catch (err) {
    console.warn('Manual sync check failed:', err);
  }
}

function connectSSEStream() {
  try {
    if (eventSourceInstance) {
      eventSourceInstance.close();
      eventSourceInstance = null;
    }

    const url = `/api/realtime/stream?clientId=${encodeURIComponent(
      CLIENT_ID
    )}&memberName=${encodeURIComponent(getCurrentMemberName())}`;
    const es = new EventSource(url);
    eventSourceInstance = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data) return;

        if (data.type === 'init' || data.type === 'state:sync') {
          if (data.state) {
            applyServerState(data.state, data.presence, data.event || null);
          }
        } else if (data.type === 'presence:update' && data.presence) {
          notifyPresenceListeners({
            ...currentPresence,
            onlineCount: data.presence.onlineCount,
            onlineMembers: data.presence.onlineMembers,
            isConnected: true
          });
        }
      } catch (e) {
        console.warn('Failed to parse SSE message:', e);
      }
    };

    es.onerror = () => {
      notifyPresenceListeners({
        ...currentPresence,
        isConnected: false
      });
    };
  } catch (e) {
    console.warn('SSE connection error:', e);
  }
}

function startRealtimeEngine() {
  if (isEngineStarted || typeof window === 'undefined') return;
  isEngineStarted = true;

  // 1. Setup BroadcastChannel for instant 0ms cross-tab sync
  try {
    if ('BroadcastChannel' in window) {
      broadcastChannel = new BroadcastChannel('oip_realtime_sync_v2');
      broadcastChannel.onmessage = (ev) => {
        const msg = ev.data;
        if (!msg || msg.senderClientId === CLIENT_ID) return;
        // Reload from shared localStorage and also trigger server delta check
        notifyWorkgroupListeners(loadCachedWorkgroups());
        notifyTaskListeners(loadTasks());
        forceRealtimeSyncNow().catch(() => {});
      };
    }
  } catch {
    // BroadcastChannel not supported in this browser environment
  }

  // 2. Listen to window 'storage' events (fires when another tab modifies localStorage)
  window.addEventListener('storage', (e) => {
    if (
      e.key === STORAGE_KEY_WORKGROUPS ||
      e.key === STORAGE_KEY_DELETED_WORKGROUPS
    ) {
      notifyWorkgroupListeners(loadCachedWorkgroups());
    }
    if (
      e.key === 'oip_tasks_v1' ||
      e.key === STORAGE_KEY_DELETED_TASKS
    ) {
      notifyTaskListeners(loadTasks());
    }
  });

  // 3. Initial handshake with server: send any local cached data so server merges non-deleted items
  const initialGroups = loadCachedWorkgroups();
  const initialTasks = loadTasks();
  sendRealtimeMutation('client:handshake', {
    workgroups: initialGroups,
    tasks: initialTasks
  }).finally(() => {
    // 4. Connect SSE stream for instant push updates
    connectSSEStream();
  });

  // 5. Fast delta polling every 1.5s as a rock-solid guarantee through any proxy/iframe
  setInterval(async () => {
    try {
      const res = await fetch(
        `/api/realtime/state?clientId=${encodeURIComponent(
          CLIENT_ID
        )}&memberName=${encodeURIComponent(
          getCurrentMemberName()
        )}&sinceVersion=${currentServerVersion}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.hasChanges && data.state) {
          const latestEvent =
            Array.isArray(data.state.recentEvents) && data.state.recentEvents.length > 0
              ? data.state.recentEvents[0]
              : null;
          applyServerState(data.state, data.presence, latestEvent);
        } else if (data.presence) {
          notifyPresenceListeners({
            ...currentPresence,
            onlineCount: data.presence.onlineCount,
            onlineMembers: data.presence.onlineMembers,
            isConnected: true,
            lastSyncedAt: new Date().toISOString()
          });
        }
      }
    } catch {
      // Offline or reconnecting
    }
  }, 1500);

  // 6. Sync immediately when user focuses tab or returns to page
  window.addEventListener('focus', () => {
    forceRealtimeSyncNow().catch(() => {});
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      forceRealtimeSyncNow().catch(() => {});
    }
  });
}

// ============================================================================
// PUBLIC SUBSCRIPTION & MUTATION API
// ============================================================================

export function subscribeWorkgroups(onUpdate: (groups: WorkGroup[]) => void) {
  startRealtimeEngine();
  workgroupListeners.add(onUpdate);
  onUpdate(loadCachedWorkgroups());

  return () => {
    workgroupListeners.delete(onUpdate);
  };
}

export function subscribeTasks(
  groupIdOrCallback: string | null | ((tasks: Task[]) => void),
  maybeCallback?: (tasks: Task[]) => void
) {
  startRealtimeEngine();
  const onUpdate =
    typeof groupIdOrCallback === 'function' ? groupIdOrCallback : maybeCallback!;

  if (typeof onUpdate !== 'function') {
    return () => {};
  }

  taskListeners.add(onUpdate);
  onUpdate(loadTasks());

  return () => {
    taskListeners.delete(onUpdate);
  };
}

export function subscribePresence(onUpdate: (presence: PresenceInfo) => void) {
  startRealtimeEngine();
  presenceListeners.add(onUpdate);
  onUpdate(currentPresence);

  return () => {
    presenceListeners.delete(onUpdate);
  };
}

export function subscribeRealtimeActivity(onEvent: (event: RealtimeActivityEvent) => void) {
  startRealtimeEngine();
  activityListeners.add(onEvent);

  return () => {
    activityListeners.delete(onEvent);
  };
}

// Save or Update Workgroup (instant local update + real-time server broadcast)
export async function saveWorkgroupToFirestore(
  group: WorkGroup,
  summary?: string
): Promise<void> {
  unmarkGroupDeleted(group.id);
  const groupWithTime: WorkGroup = {
    ...group,
    updatedAt: new Date().toISOString()
  };

  // Update local cache immediately for zero latency
  const current = loadCachedWorkgroups();
  const index = current.findIndex((g) => g.id === groupWithTime.id);
  let updated: WorkGroup[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = groupWithTime;
  } else {
    updated = [...current, groupWithTime];
  }
  saveCachedWorkgroups(updated);
  notifyWorkgroupListeners(updated);

  // Sync to real-time server
  await sendRealtimeMutation('workgroup:upsert', {
    group: groupWithTime,
    summary
  });

  // Secondary Firestore cloud backup (non-blocking)
  try {
    const docRef = doc(db, 'workgroups', groupWithTime.id);
    setDoc(docRef, sanitizeForFirestore(groupWithTime), { merge: true }).catch(() => {});
  } catch {
    // Ignore secondary backup errors
  }
}

// Delete Workgroup (instant local removal + real-time server broadcast)
export async function deleteWorkgroupFromFirestore(
  groupId: string,
  deleteAssociatedTasks: boolean = false,
  nextGroupId: string = ''
): Promise<void> {
  markGroupDeleted(groupId);
  const current = loadCachedWorkgroups().filter((g) => g.id !== groupId);
  saveCachedWorkgroups(current);
  notifyWorkgroupListeners(current);

  await sendRealtimeMutation('workgroup:delete', {
    groupId,
    deleteAssociatedTasks,
    nextGroupId
  });

  try {
    const docRef = doc(db, 'workgroups', groupId);
    deleteDoc(docRef).catch(() => {});
  } catch {
    // Ignore secondary backup errors
  }
}

// Save or Update single task (instant local update + real-time server broadcast)
export async function syncTaskToFirestore(task: Task, summary?: string): Promise<void> {
  unmarkTaskDeleted(task.id);
  const taskWithTime: Task = {
    ...task,
    updatedAt: new Date().toISOString()
  };

  const current = loadTasks();
  const idx = current.findIndex((t) => t.id === taskWithTime.id);
  let updated: Task[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = taskWithTime;
  } else {
    updated = [taskWithTime, ...current];
  }
  saveTasks(updated);
  notifyTaskListeners(updated);

  await sendRealtimeMutation('task:upsert', {
    task: taskWithTime,
    summary
  });

  try {
    const docRef = doc(db, 'tasks', taskWithTime.id);
    setDoc(docRef, sanitizeForFirestore(taskWithTime), { merge: true }).catch(() => {});
  } catch {
    // Ignore secondary backup errors
  }
}

// Batch sync multiple tasks
export async function syncBatchTasksToFirestore(tasks: Task[], summary?: string): Promise<void> {
  const now = new Date().toISOString();
  const stamped = tasks.map((t) => {
    unmarkTaskDeleted(t.id);
    return { ...t, updatedAt: t.updatedAt || now };
  });
  saveTasks(stamped);
  notifyTaskListeners(stamped);

  await sendRealtimeMutation('task:batch_upsert', {
    tasks: stamped,
    summary
  });
}

// Delete task (instant local removal + real-time server broadcast)
export async function deleteTaskFromFirestore(
  taskId: string,
  taskTitle?: string
): Promise<void> {
  markTaskDeleted(taskId);
  const current = loadTasks().filter((t) => t.id !== taskId);
  saveTasks(current);
  notifyTaskListeners(current);

  await sendRealtimeMutation('task:delete', {
    taskId,
    taskTitle
  });

  try {
    const docRef = doc(db, 'tasks', taskId);
    deleteDoc(docRef).catch(() => {});
  } catch {
    // Ignore secondary backup errors
  }
}

// Clear all tasks on server and clients
export async function clearAllTasksFromServer(): Promise<void> {
  const current = loadTasks();
  for (const t of current) {
    markTaskDeleted(t.id);
  }
  saveTasks([]);
  notifyTaskListeners([]);

  await sendRealtimeMutation('tasks:clear', {});
}
