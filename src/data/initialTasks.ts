import { Task } from '../types';

export const DEMO_TASK_IDS = new Set<string>([
  'task-reels-best-english',
  'task-branding-cafe-raiz',
  'task-social-carrossel',
  'task-photos-bistro'
]);

export function getInitialDemoTasks(): Task[] {
  return [];
}
