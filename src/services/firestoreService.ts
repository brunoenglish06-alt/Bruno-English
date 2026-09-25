import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDocFromServer,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { getApps, initializeApp, getApp } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';
import { Task, WorkGroup, WorkGroupMember } from '../types';

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

const STORAGE_KEY_WORKGROUPS = 'oip_workgroups_v1';
const STORAGE_KEY_ACTIVE_GROUP_ID = 'oip_active_group_id_v1';

// Default initial workgroup matching user's exact specification
export const DEFAULT_INITIAL_GROUP: WorkGroup = {
  id: 'group-design-team',
  name: 'Equipe de Design',
  description: 'Grupo principal de criação, social media e produção audiovisual',
  adminId: 'member-bruno',
  createdAt: new Date().toISOString(),
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
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.warn('Firestore offline, using local cache seamlessly.');
    }
    return false;
  }
}

// Local cache helpers
export function loadCachedWorkgroups(): WorkGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WORKGROUPS);
    if (!raw) {
      saveCachedWorkgroups([DEFAULT_INITIAL_GROUP]);
      return [DEFAULT_INITIAL_GROUP];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [DEFAULT_INITIAL_GROUP];
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

// Real-time listener for Workgroups
export function subscribeWorkgroups(onUpdate: (groups: WorkGroup[]) => void) {
  try {
    const colRef = collection(db, 'workgroups');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: WorkGroup[] = [];
          snapshot.forEach((d) => {
            const data = d.data() as WorkGroup;
            if (data && data.id) {
              list.push(data);
            }
          });
          if (list.length > 0) {
            saveCachedWorkgroups(list);
            onUpdate(list);
            return;
          }
        }
        // If collection empty in firestore, initialize default group
        saveWorkgroupToFirestore(DEFAULT_INITIAL_GROUP).catch(() => {});
        onUpdate(loadCachedWorkgroups());
      },
      (error) => {
        console.warn('Firestore snapshot error for workgroups, fallback to cache:', error);
        onUpdate(loadCachedWorkgroups());
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to workgroups, using local cache:', err);
    onUpdate(loadCachedWorkgroups());
    return () => {};
  }
}

// Save or Update Workgroup
export async function saveWorkgroupToFirestore(group: WorkGroup): Promise<void> {
  // Update local cache immediately for zero latency
  const current = loadCachedWorkgroups();
  const index = current.findIndex((g) => g.id === group.id);
  let updated: WorkGroup[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = group;
  } else {
    updated = [...current, group];
  }
  saveCachedWorkgroups(updated);

  try {
    const docRef = doc(db, 'workgroups', group.id);
    await setDoc(docRef, group, { merge: true });
  } catch (err) {
    console.warn('Could not save workgroup to Firestore (cached locally):', err);
  }
}

// Delete Workgroup
export async function deleteWorkgroupFromFirestore(groupId: string): Promise<void> {
  const current = loadCachedWorkgroups().filter((g) => g.id !== groupId);
  saveCachedWorkgroups(current);
  try {
    const docRef = doc(db, 'workgroups', groupId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Could not delete workgroup from Firestore:', err);
  }
}

// Real-time listener for tasks
export function subscribeTasks(
  groupId: string | null,
  onUpdate: (tasks: Task[]) => void
) {
  try {
    const colRef = collection(db, 'tasks');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const list: Task[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as Task;
          if (item && item.id) {
            // If groupId specified, filter by group or include legacy tasks
            if (!groupId || !item.groupId || item.groupId === groupId) {
              list.push(item);
            }
          }
        });
        onUpdate(list);
      },
      (error) => {
        console.warn('Firestore snapshot error for tasks, keeping current state:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to tasks:', err);
    return () => {};
  }
}

// Save or Update single task in Firestore
export async function syncTaskToFirestore(task: Task): Promise<void> {
  try {
    const docRef = doc(db, 'tasks', task.id);
    await setDoc(docRef, task, { merge: true });
  } catch (err) {
    console.warn('Failed to sync task to Firestore:', err);
  }
}

// Delete task from Firestore
export async function deleteTaskFromFirestore(taskId: string): Promise<void> {
  try {
    const docRef = doc(db, 'tasks', taskId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Failed to delete task from Firestore:', err);
  }
}
