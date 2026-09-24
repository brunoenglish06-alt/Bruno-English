import { Task, UserSettings, AuditLogEntry } from '../types';
import { DEFAULT_USER_SETTINGS } from './scheduler';
import { DEMO_TASK_IDS } from '../data/initialTasks';

const STORAGE_KEY_TASKS = 'oip_tasks_v1';
const STORAGE_KEY_SETTINGS = 'oip_settings_v1';
const STORAGE_KEY_AUDIT = 'oip_audit_log_v1';

export function deduplicateTasks(tasks: Task[]): Task[] {
  if (!Array.isArray(tasks)) return [];
  const map = new Map<string, Task>();
  for (const t of tasks) {
    if (t && t.id) {
      map.set(t.id, t);
    }
  }
  return Array.from(map.values());
}

export function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TASKS);
    if (!raw) {
      saveTasks([]);
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Remove any leftover demo/mock tasks
      const cleaned = parsed.filter(
        (t) => t && t.id && !DEMO_TASK_IDS.has(t.id)
      );
      const unique = deduplicateTasks(cleaned);
      // Auto-heal if demo tasks or duplicates existed in storage
      if (unique.length !== parsed.length) {
        saveTasks(unique);
      }
      return unique;
    }
    saveTasks([]);
    return [];
  } catch (err) {
    console.error('Error loading tasks from localStorage', err);
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  try {
    const unique = deduplicateTasks(tasks);
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(unique));
  } catch (err) {
    console.error('Error saving tasks to localStorage', err);
  }
}

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return DEFAULT_USER_SETTINGS;
    return { ...DEFAULT_USER_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_USER_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving settings to localStorage', err);
  }
}

export function loadAuditLog(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUDIT);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addAuditLog(action: string, details: string, taskId?: string, taskTitle?: string): void {
  try {
    const entries = loadAuditLog();
    const newEntry: AuditLogEntry = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      action,
      details,
      taskId,
      taskTitle
    };
    const updated = [newEntry, ...entries].slice(0, 100); // keep last 100 logs
    localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(updated));
  } catch (err) {
    console.error('Error adding audit log', err);
  }
}

export function exportBackupData(): string {
  const data = {
    app: 'Organizador Inteligente de Produção',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    tasks: loadTasks(),
    settings: loadSettings(),
    auditLog: loadAuditLog()
  };
  return JSON.stringify(data, null, 2);
}

export function importBackupData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data && Array.isArray(data.tasks)) {
      saveTasks(data.tasks);
      if (data.settings) saveSettings(data.settings);
      if (Array.isArray(data.auditLog)) {
        localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(data.auditLog));
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error('Invalid backup JSON', err);
    return false;
  }
}

export function clearAllTasks(): Task[] {
  saveTasks([]);
  addAuditLog('Limpeza Geral', 'Todas as demandas foram removidas.');
  return [];
}

export function resetToDemoData(): Task[] {
  saveTasks([]);
  saveSettings(DEFAULT_USER_SETTINGS);
  addAuditLog('Limpeza Geral', 'Base de demandas zerada para produção.');
  return [];
}
