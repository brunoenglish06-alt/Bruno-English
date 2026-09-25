import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import { getApps, initializeApp, getApp } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';
import { Task, WorkGroup } from '../types';
import { auth } from './firebaseAuth';
import { loadTasks, saveTasks } from '../utils/storage';

// CRITICAL: Connect to the provisioned Cloud Firestore database ID from firebase-applet-config.json
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  updateSyncStatus('error', errInfo.error);
}

function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

const STORAGE_KEY_WORKGROUPS = 'oip_workgroups_v1';
const STORAGE_KEY_ACTIVE_GROUP_ID = 'oip_active_group_id_v1';
const STORAGE_KEY_DELETED_WORKGROUPS = 'oip_deleted_workgroups_v1';
const STORAGE_KEY_DELETED_TASKS = 'oip_deleted_tasks_v1';
const STORAGE_KEY_MEMBER_NAME = 'oip_active_member_name_v1';
const SESSION_KEY_CLIENT_ID = 'oip_client_session_id_v1';

// Unique session ID for this browser tab/computer
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

export type SyncConnectionStatus = 'synced' | 'syncing' | 'offline' | 'error';

export interface PresenceInfo {
  onlineCount: number;
  onlineMembers: Array<{
    clientId: string;
    memberName: string;
    memberEmail?: string;
    groupId?: string;
    lastSeen: number;
  }>;
  isConnected: boolean;
  syncStatus: SyncConnectionStatus;
  syncErrorMessage?: string | null;
  lastSyncedAt: string | null;
}

export interface RealtimeActivityEvent {
  id: string;
  type: string;
  actorId: string;
  actorName: string;
  groupId?: string;
  summary: string;
  timestamp: string;
}

// ============================================================================
// AUTHORIZATION & GROUP PERMISSIONS (Requirement 6)
// ============================================================================

export function isUserAuthorizedForGroup(
  group: WorkGroup | undefined | null,
  userEmail?: string | null,
  memberName?: string | null,
  userUid?: string | null
): boolean {
  if (!group) return false;
  const members = Array.isArray(group.members) ? group.members : [];

  const normEmail = (userEmail || '').trim().toLowerCase();
  const normName = (memberName || '').trim().toLowerCase();

  if (userUid && group.adminId === userUid) return true;

  return members.some((m) => {
    const mEmail = (m.email || '').trim().toLowerCase();
    const mName = (m.name || '').trim().toLowerCase();
    if (normEmail && mEmail && normEmail === mEmail) return true;
    if (normName && mName && normName === mName) return true;
    return false;
  });
}

export function getUserRoleInGroup(
  group: WorkGroup | undefined | null,
  userEmail?: string | null,
  memberName?: string | null,
  userUid?: string | null
): 'admin' | 'member' | 'unauthorized' {
  if (!group) return 'unauthorized';
  const members = Array.isArray(group.members) ? group.members : [];
  const normEmail = (userEmail || '').trim().toLowerCase();
  const normName = (memberName || '').trim().toLowerCase();

  if (userUid && group.adminId === userUid) return 'admin';

  const matched = members.find((m) => {
    const mEmail = (m.email || '').trim().toLowerCase();
    const mName = (m.name || '').trim().toLowerCase();
    return (normEmail && mEmail === normEmail) || (normName && mName === normName);
  });

  if (!matched) return 'unauthorized';
  return matched.role === 'admin' ? 'admin' : 'member';
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
    publishPresenceToFirestore().catch(() => {});
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

// Validate connection to Firestore server per skill instructions
export async function testFirestoreConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    updateSyncStatus('offline', 'Sem conexão com a internet.');
    return false;
  }
  try {
    await getDocFromServer(doc(db, 'system', 'connection_probe'));
    if (pendingWritesCount === 0) {
      updateSyncStatus('synced', null);
    }
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      updateSyncStatus('offline', 'Cliente sem conexão com o servidor Cloud Firestore.');
      return false;
    }
    handleFirestoreError(error, OperationType.GET, 'system/connection_probe');
    return false;
  }
}

// Local cache helpers (used only as fast initial hydration; Cloud Firestore is the source of truth)
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
// CLOUD FIRESTORE REAL-TIME ENGINE (onSnapshot)
// ============================================================================

const workgroupListeners = new Set<(groups: WorkGroup[]) => void>();
const taskListeners = new Set<(tasks: Task[]) => void>();
const presenceListeners = new Set<(presence: PresenceInfo) => void>();
const activityListeners = new Set<(event: RealtimeActivityEvent) => void>();

let isEngineStarted = false;
let tombstonesLoaded = false;
let initialGroupsMigrated = false;
let initialTasksMigrated = false;
let pendingWritesCount = 0;
let broadcastChannel: BroadcastChannel | null = null;
let seenEventIds = new Set<string>();
let isFirstTombstoneSnapshot = true;

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
  syncStatus: 'syncing',
  syncErrorMessage: null,
  lastSyncedAt: null
};

function updateSyncStatus(status: SyncConnectionStatus, errorMsg?: string | null) {
  currentPresence = {
    ...currentPresence,
    isConnected: status === 'synced' || status === 'syncing',
    syncStatus: status,
    syncErrorMessage: errorMsg ?? (status === 'error' ? currentPresence.syncErrorMessage : null),
    lastSyncedAt: status === 'synced' ? new Date().toISOString() : currentPresence.lastSyncedAt
  };
  notifyPresenceListeners(currentPresence);
}

function beginWriteOperation() {
  pendingWritesCount += 1;
  updateSyncStatus('syncing', null);
}

function endWriteOperation(succeeded: boolean, errorMsg?: string) {
  pendingWritesCount = Math.max(0, pendingWritesCount - 1);
  if (!succeeded) {
    updateSyncStatus('error', errorMsg || 'Erro ao sincronizar dados com o banco online.');
  } else if (pendingWritesCount === 0) {
    updateSyncStatus('synced', null);
  }
}

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

async function publishTombstonesAndActivity(eventSummary?: string, eventType?: string): Promise<void> {
  const path = 'system/tombstones';
  try {
    const deletedGroupIds = Array.from(getDeletedGroupIds());
    const deletedTaskIds = Array.from(getDeletedTaskIds());
    const now = new Date().toISOString();

    const payload: Record<string, any> = {
      deletedGroupIds,
      deletedTaskIds,
      updatedAt: now
    };

    if (eventSummary) {
      const eventObj: RealtimeActivityEvent = {
        id: 'evt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        type: eventType || 'update',
        actorId: CLIENT_ID,
        actorName: getCurrentMemberName(),
        groupId: getActiveGroupId(),
        summary: eventSummary,
        timestamp: now
      };
      seenEventIds.add(eventObj.id);
      payload.lastEvent = eventObj;
    }

    await setDoc(doc(db, 'system', 'tombstones'), sanitizeForFirestore(payload), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

async function publishPresenceToFirestore(): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  const path = `presence/${CLIENT_ID}`;
  try {
    await setDoc(
      doc(db, 'presence', CLIENT_ID),
      sanitizeForFirestore({
        clientId: CLIENT_ID,
        memberName: getCurrentMemberName(),
        memberEmail: auth.currentUser?.email || '',
        groupId: getActiveGroupId(),
        lastSeen: Date.now(),
        updatedAt: new Date().toISOString()
      }),
      { merge: true }
    );
  } catch {
    // Non-critical presence heartbeat
  }
}

function startFirestoreRealtimeEngine() {
  if (isEngineStarted || typeof window === 'undefined') return;
  isEngineStarted = true;

  // Monitor browser online/offline state
  window.addEventListener('online', () => {
    updateSyncStatus('syncing', null);
    testFirestoreConnection();
    publishPresenceToFirestore();
  });
  window.addEventListener('offline', () => {
    updateSyncStatus('offline', 'Sem conexão com a internet.');
  });

  // Same-browser cross-tab BroadcastChannel for 0ms local tab updates
  try {
    if ('BroadcastChannel' in window) {
      broadcastChannel = new BroadcastChannel('oip_firestore_realtime_v3');
      broadcastChannel.onmessage = (ev) => {
        const msg = ev.data;
        if (!msg || msg.senderClientId === CLIENT_ID) return;
        notifyWorkgroupListeners(loadCachedWorkgroups());
        notifyTaskListeners(loadTasks());
      };
    }
  } catch {
    // Ignore if BroadcastChannel is unavailable
  }

  // 1. Subscribe to /system/tombstones (deleted IDs & live cross-computer activity notifications)
  const tombstonesRef = doc(db, 'system', 'tombstones');
  onSnapshot(
    tombstonesRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data.deletedGroupIds)) {
          const merged = new Set([...getDeletedGroupIds(), ...data.deletedGroupIds]);
          setDeletedGroupIds(Array.from(merged));
        }
        if (Array.isArray(data.deletedTaskIds)) {
          const merged = new Set([...getDeletedTaskIds(), ...data.deletedTaskIds]);
          setDeletedTaskIds(Array.from(merged));
        }
        if (data.lastEvent) {
          if (isFirstTombstoneSnapshot) {
            seenEventIds.add(data.lastEvent.id);
          } else {
            notifyActivityListeners(data.lastEvent as RealtimeActivityEvent);
          }
        }
      }
      isFirstTombstoneSnapshot = false;
      tombstonesLoaded = true;
    },
    (error) => {
      tombstonesLoaded = true;
      handleFirestoreError(error, OperationType.GET, 'system/tombstones');
    }
  );

  // 2. Real-time onSnapshot listener for /workgroups
  const workgroupsCol = collection(db, 'workgroups');
  onSnapshot(
    workgroupsCol,
    { includeMetadataChanges: true },
    (snapshot) => {
      const deletedGroups = getDeletedGroupIds();
      const serverGroupsMap = new Map<string, WorkGroup>();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as WorkGroup;
        if (data && data.id && !deletedGroups.has(data.id)) {
          serverGroupsMap.set(data.id, {
            ...data,
            members: Array.isArray(data.members) ? data.members : []
          });
        }
      });

      // On first snapshot, migrate any local workgroups that aren't in Firestore yet (and aren't deleted)
      if (!initialGroupsMigrated && tombstonesLoaded) {
        initialGroupsMigrated = true;
        const localGroups = loadCachedWorkgroups();
        for (const lg of localGroups) {
          if (deletedGroups.has(lg.id)) continue;
          const sg = serverGroupsMap.get(lg.id);
          if (!sg) {
            serverGroupsMap.set(lg.id, lg);
            setDoc(doc(db, 'workgroups', lg.id), sanitizeForFirestore(lg), { merge: true }).catch(
              (err) => handleFirestoreError(err, OperationType.WRITE, `workgroups/${lg.id}`)
            );
          } else {
            const localTime = lg.updatedAt ? new Date(lg.updatedAt).getTime() : 0;
            const serverTime = sg.updatedAt ? new Date(sg.updatedAt).getTime() : 0;
            if (localTime > serverTime) {
              serverGroupsMap.set(lg.id, lg);
              setDoc(doc(db, 'workgroups', lg.id), sanitizeForFirestore(lg), { merge: true }).catch(
                (err) => handleFirestoreError(err, OperationType.WRITE, `workgroups/${lg.id}`)
              );
            }
          }
        }
      }

      const groupsList = Array.from(serverGroupsMap.values());
      saveCachedWorkgroups(groupsList);
      notifyWorkgroupListeners(groupsList);

      if (snapshot.metadata.hasPendingWrites || pendingWritesCount > 0) {
        updateSyncStatus('syncing', null);
      } else if (!snapshot.metadata.fromCache || navigator.onLine) {
        updateSyncStatus('synced', null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'workgroups');
    }
  );

  // 3. Real-time onSnapshot listener for /tasks
  const tasksCol = collection(db, 'tasks');
  onSnapshot(
    tasksCol,
    { includeMetadataChanges: true },
    (snapshot) => {
      const deletedTasks = getDeletedTaskIds();
      const serverTasksMap = new Map<string, Task>();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Task;
        if (data && data.id && !deletedTasks.has(data.id)) {
          serverTasksMap.set(data.id, data);
        }
      });

      // On first snapshot, migrate any existing local tasks to Firestore without losing user data
      if (!initialTasksMigrated && tombstonesLoaded) {
        initialTasksMigrated = true;
        const localTasks = loadTasks();
        for (const lt of localTasks) {
          if (!lt || !lt.id || deletedTasks.has(lt.id)) continue;
          const st = serverTasksMap.get(lt.id);
          if (!st) {
            serverTasksMap.set(lt.id, lt);
            setDoc(doc(db, 'tasks', lt.id), sanitizeForFirestore(lt), { merge: true }).catch(
              (err) => handleFirestoreError(err, OperationType.WRITE, `tasks/${lt.id}`)
            );
          } else {
            const localTime = lt.updatedAt ? new Date(lt.updatedAt).getTime() : 0;
            const serverTime = st.updatedAt ? new Date(st.updatedAt).getTime() : 0;
            if (localTime > serverTime) {
              serverTasksMap.set(lt.id, lt);
              setDoc(doc(db, 'tasks', lt.id), sanitizeForFirestore(lt), { merge: true }).catch(
                (err) => handleFirestoreError(err, OperationType.WRITE, `tasks/${lt.id}`)
              );
            }
          }
        }
      }

      const tasksList = Array.from(serverTasksMap.values());
      saveTasks(tasksList);
      notifyTaskListeners(tasksList);

      if (snapshot.metadata.hasPendingWrites || pendingWritesCount > 0) {
        updateSyncStatus('syncing', null);
      } else if (!snapshot.metadata.fromCache || navigator.onLine) {
        updateSyncStatus('synced', null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tasks');
    }
  );

  // 4. Real-time onSnapshot listener for /presence across all connected computers
  publishPresenceToFirestore();
  setInterval(() => {
    publishPresenceToFirestore();
  }, 20000);

  const presenceCol = collection(db, 'presence');
  onSnapshot(
    presenceCol,
    (snapshot) => {
      const now = Date.now();
      const activeMembers: Array<{
        clientId: string;
        memberName: string;
        memberEmail?: string;
        groupId?: string;
        lastSeen: number;
      }> = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.clientId && typeof data.lastSeen === 'number') {
          // Consider active if seen within the last 60 seconds
          if (now - data.lastSeen < 65000 || data.clientId === CLIENT_ID) {
            activeMembers.push({
              clientId: data.clientId,
              memberName: data.memberName || 'Integrante',
              memberEmail: data.memberEmail || '',
              groupId: data.groupId || '',
              lastSeen: data.lastSeen
            });
          }
        }
      });

      if (!activeMembers.some((m) => m.clientId === CLIENT_ID)) {
        activeMembers.push({
          clientId: CLIENT_ID,
          memberName: getCurrentMemberName(),
          memberEmail: auth.currentUser?.email || '',
          groupId: getActiveGroupId(),
          lastSeen: now
        });
      }

      notifyPresenceListeners({
        ...currentPresence,
        onlineCount: Math.max(1, activeMembers.length),
        onlineMembers: activeMembers
      });
    },
    () => {
      // Ignore non-critical presence read errors
    }
  );
}

// ============================================================================
// PUBLIC SUBSCRIPTION & MUTATION API
// ============================================================================

export function subscribeWorkgroups(onUpdate: (groups: WorkGroup[]) => void) {
  startFirestoreRealtimeEngine();
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
  startFirestoreRealtimeEngine();
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
  startFirestoreRealtimeEngine();
  presenceListeners.add(onUpdate);
  onUpdate(currentPresence);

  return () => {
    presenceListeners.delete(onUpdate);
  };
}

export function subscribeRealtimeActivity(onEvent: (event: RealtimeActivityEvent) => void) {
  startFirestoreRealtimeEngine();
  activityListeners.add(onEvent);

  return () => {
    activityListeners.delete(onEvent);
  };
}

export async function forceRealtimeSyncNow(): Promise<void> {
  updateSyncStatus('syncing', null);
  await testFirestoreConnection();
  await publishPresenceToFirestore();
}

// Save or Update Workgroup in Cloud Firestore
export async function saveWorkgroupToFirestore(
  group: WorkGroup,
  summary?: string
): Promise<void> {
  const path = `workgroups/${group.id}`;
  unmarkGroupDeleted(group.id);
  const actor = getCurrentMemberName();
  const groupWithTime: WorkGroup = {
    ...group,
    updatedAt: new Date().toISOString(),
    updatedBy: actor,
    members: Array.isArray(group.members) ? group.members : []
  };

  // Optimistic local cache update
  const current = loadCachedWorkgroups();
  const index = current.findIndex((g) => g.id === groupWithTime.id);
  const updated =
    index >= 0
      ? current.map((g, i) => (i === index ? groupWithTime : g))
      : [...current, groupWithTime];
  saveCachedWorkgroups(updated);
  notifyWorkgroupListeners(updated);
  broadcastChannel?.postMessage({ senderClientId: CLIENT_ID });

  beginWriteOperation();
  try {
    const docRef = doc(db, 'workgroups', groupWithTime.id);
    await setDoc(docRef, sanitizeForFirestore(groupWithTime), { merge: true });
    await publishTombstonesAndActivity(
      summary || `${actor} atualizou o grupo "${groupWithTime.name}"`,
      'workgroup:upsert'
    );
    endWriteOperation(true);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    endWriteOperation(false, error instanceof Error ? error.message : String(error));
  }
}

// Delete Workgroup from Cloud Firestore
export async function deleteWorkgroupFromFirestore(
  groupId: string,
  deleteAssociatedTasks: boolean = false,
  nextGroupId: string = ''
): Promise<void> {
  const path = `workgroups/${groupId}`;
  const actor = getCurrentMemberName();
  const targetGroup = loadCachedWorkgroups().find((g) => g.id === groupId);
  markGroupDeleted(groupId);

  const current = loadCachedWorkgroups().filter((g) => g.id !== groupId);
  saveCachedWorkgroups(current);
  notifyWorkgroupListeners(current);
  broadcastChannel?.postMessage({ senderClientId: CLIENT_ID });

  beginWriteOperation();
  try {
    await publishTombstonesAndActivity(
      `${actor} apagou o grupo "${targetGroup?.name || groupId}"`,
      'workgroup:delete'
    );
    await deleteDoc(doc(db, 'workgroups', groupId));

    // Handle tasks associated with the deleted group
    const allTasks = loadTasks();
    for (const t of allTasks) {
      if (t.groupId === groupId) {
        if (deleteAssociatedTasks) {
          markTaskDeleted(t.id);
          await deleteDoc(doc(db, 'tasks', t.id));
        } else {
          const reassigned: Task = {
            ...t,
            groupId: nextGroupId || undefined,
            updatedAt: new Date().toISOString(),
            updatedBy: actor
          };
          await setDoc(doc(db, 'tasks', t.id), sanitizeForFirestore(reassigned), { merge: true });
        }
      }
    }
    if (deleteAssociatedTasks) {
      await publishTombstonesAndActivity();
    }
    endWriteOperation(true);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    endWriteOperation(false, error instanceof Error ? error.message : String(error));
  }
}

// Save or Update single task in Cloud Firestore
export async function syncTaskToFirestore(task: Task, summary?: string): Promise<void> {
  const path = `tasks/${task.id}`;
  unmarkTaskDeleted(task.id);
  const actor = getCurrentMemberName();
  const now = new Date().toISOString();

  const current = loadTasks();
  const existing = current.find((t) => t.id === task.id);
  const nextVersion = (existing?.version || task.version || 0) + 1;

  const historyEntry = {
    id: 'hist-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    timestamp: now,
    author: actor,
    action: summary || (existing ? 'Atualização da demanda' : 'Criação da demanda'),
    details: `Versão ${nextVersion} salva no Cloud Firestore`
  };

  const taskWithMeta: Task = {
    ...task,
    groupId: task.groupId || getActiveGroupId(),
    updatedAt: now,
    updatedBy: actor,
    updatedByEmail: auth.currentUser?.email || undefined,
    version: nextVersion,
    history: [historyEntry, ...(task.history || [])].slice(0, 50)
  };

  const idx = current.findIndex((t) => t.id === taskWithMeta.id);
  const updated =
    idx >= 0
      ? current.map((t, i) => (i === idx ? taskWithMeta : t))
      : [taskWithMeta, ...current];
  saveTasks(updated);
  notifyTaskListeners(updated);
  broadcastChannel?.postMessage({ senderClientId: CLIENT_ID });

  beginWriteOperation();
  try {
    const docRef = doc(db, 'tasks', taskWithMeta.id);
    await setDoc(docRef, sanitizeForFirestore(taskWithMeta), { merge: true });
    await publishTombstonesAndActivity(
      summary ||
        (existing
          ? `${actor} atualizou a demanda "${taskWithMeta.title}"`
          : `${actor} criou a demanda "${taskWithMeta.title}"`),
      'task:upsert'
    );
    endWriteOperation(true);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    endWriteOperation(false, error instanceof Error ? error.message : String(error));
  }
}

// Batch sync multiple tasks to Cloud Firestore
export async function syncBatchTasksToFirestore(tasks: Task[], summary?: string): Promise<void> {
  const actor = getCurrentMemberName();
  const now = new Date().toISOString();
  const stamped = tasks.map((t) => {
    unmarkTaskDeleted(t.id);
    return {
      ...t,
      groupId: t.groupId || getActiveGroupId(),
      updatedAt: now,
      updatedBy: actor,
      version: (t.version || 0) + 1
    };
  });
  saveTasks(stamped);
  notifyTaskListeners(stamped);
  broadcastChannel?.postMessage({ senderClientId: CLIENT_ID });

  beginWriteOperation();
  try {
    for (const t of stamped) {
      await setDoc(doc(db, 'tasks', t.id), sanitizeForFirestore(t), { merge: true });
    }
    await publishTombstonesAndActivity(
      summary || `${actor} sincronizou ${stamped.length} demanda(s)`,
      'task:batch_upsert'
    );
    endWriteOperation(true);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'tasks');
    endWriteOperation(false, error instanceof Error ? error.message : String(error));
  }
}

// Delete task from Cloud Firestore
export async function deleteTaskFromFirestore(
  taskId: string,
  taskTitle?: string
): Promise<void> {
  const path = `tasks/${taskId}`;
  const actor = getCurrentMemberName();
  markTaskDeleted(taskId);
  const current = loadTasks().filter((t) => t.id !== taskId);
  saveTasks(current);
  notifyTaskListeners(current);
  broadcastChannel?.postMessage({ senderClientId: CLIENT_ID });

  beginWriteOperation();
  try {
    await publishTombstonesAndActivity(
      `${actor} excluiu a demanda "${taskTitle || taskId}"`,
      'task:delete'
    );
    await deleteDoc(doc(db, 'tasks', taskId));
    endWriteOperation(true);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    endWriteOperation(false, error instanceof Error ? error.message : String(error));
  }
}

// Clear all tasks on Cloud Firestore
export async function clearAllTasksFromServer(): Promise<void> {
  const actor = getCurrentMemberName();
  const current = loadTasks();
  for (const t of current) {
    markTaskDeleted(t.id);
  }
  saveTasks([]);
  notifyTaskListeners([]);
  broadcastChannel?.postMessage({ senderClientId: CLIENT_ID });

  beginWriteOperation();
  try {
    await publishTombstonesAndActivity(
      `${actor} limpou todas as demandas do grupo`,
      'tasks:clear'
    );
    for (const t of current) {
      await deleteDoc(doc(db, 'tasks', t.id));
    }
    endWriteOperation(true);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'tasks');
    endWriteOperation(false, error instanceof Error ? error.message : String(error));
  }
}
