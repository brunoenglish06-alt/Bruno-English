export type TaskType =
  | 'design'
  | 'video'
  | 'photo'
  | 'social_media'
  | 'publishing'
  | 'other';

export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export type TaskStatus =
  | 'todo' // A fazer
  | 'in_production' // Em produção
  | 'in_review' // Em revisão
  | 'sent_for_approval' // Enviado para aprovação
  | 'awaiting_approval' // Aguardando aprovação
  | 'in_adjustments' // Em ajustes
  | 'approved' // Aprovado
  | 'finalized' // Finalizado
  | 'delivered'; // Entregue

export type SafetyMarginOption =
  | 'none'
  | '1_day'
  | '2_days'
  | '3_days'
  | 'custom';

export type StageType =
  | 'production'
  | 'review'
  | 'send_approval'
  | 'awaiting_approval'
  | 'adjustments'
  | 'finalization'
  | 'delivery';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface TaskStage {
  id: string;
  taskId: string;
  deliverableId?: string;
  deliverableTitle?: string;
  assignee?: string;
  type: StageType;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  completed: boolean;
  notes?: string;
  googleCalendarEventId?: string;
  googleCalendarSyncedAt?: string;
}

export interface Deliverable {
  id: string;
  taskId?: string;
  title: string; // Ex: 'Carrossel', 'Story', 'Reels', 'Banner'
  category?: string; // 'design', 'video', 'social_media', 'other'
  specialty: string; // Ex: 'Designer de Carrossel', 'Designer de Stories', 'Editor de Reels'
  description?: string;
  assignee: string; // Responsável
  priority?: Priority;
  status: TaskStatus;
  deadlineDate: string; // YYYY-MM-DD
  deadlineTime?: string; // HH:mm
  estimatedHours: number; // Tempo de produção (horas)
  estimatedAdjustmentHours?: number; // Tempo de revisão/ajustes (horas)
  completed?: boolean;
  order?: number;
}

export interface SubTask {
  id: string;
  title: string;
  specialty?: string;
  assignee?: string;
  completed: boolean;
  dueDate?: string;
  notes?: string;
}

export interface TaskFile {
  id: string;
  name: string;
  url: string;
  type?: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface TaskComment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface TaskHistoryEntry {
  id: string;
  timestamp: string;
  author: string;
  action: string;
  details?: string;
}

export interface Task {
  id: string;
  title: string;
  client: string;
  project?: string;
  groupId?: string;
  type: TaskType;
  category?: string; // e.g. 'design', 'video', 'social_media', 'other'
  specialty?: string; // e.g. 'Designer de Feed', 'Editor de Reels', etc.
  collaborators?: string[];
  description: string;
  startDate: string; // YYYY-MM-DD
  deadlineDate: string; // YYYY-MM-DD
  deadlineTime: string; // HH:mm
  requiresApproval: boolean;
  approvalDeadlineDate?: string; // YYYY-MM-DD
  approvalDeadlineTime?: string; // HH:mm
  estimatedProductionHours: number;
  estimatedAdjustmentHours: number;
  priority: Priority;
  assignee: string;
  status: TaskStatus;
  safetyMargin: SafetyMarginOption;
  customSafetyMarginHours?: number;
  stages: TaskStage[];
  deliverables?: Deliverable[];
  subtasks?: SubTask[];
  files?: TaskFile[];
  comments?: TaskComment[];
  history?: TaskHistoryEntry[];
  riskLevel: RiskLevel;
  riskExplanation?: string;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
  notes?: string;
  googleCalendarEventId?: string;
  googleCalendarSyncedAt?: string;
}

export interface WorkGroupMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  specialty: string;
  avatarUrl?: string;
}

export interface WorkGroup {
  id: string;
  name: string;
  description?: string;
  adminId: string;
  createdAt: string;
  members: WorkGroupMember[];
}

export interface SpecialtyDefinition {
  id: string;
  name: string;
  category: string;
  iconName?: string;
  badgeColor?: string;
  isCustom?: boolean;
}

export interface CategoryDefinition {
  id: string;
  name: string;
  iconName: string;
  badgeBg: string;
  badgeText: string;
  isCustom?: boolean;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  colorId?: string;
}

export interface UserSettings {
  workDays: number[]; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  workStartHour: number; // e.g. 9
  workEndHour: number; // e.g. 18
  lunchStartHour: number; // e.g. 12
  lunchEndHour: number; // e.g. 13
  defaultSafetyMargin: SafetyMarginOption;
  customSafetyMarginDays: number;
  maxDailyProductionHours: number; // e.g. 6.5
  clientReviewTurnaroundHours: number; // default client review expectation (e.g. 24h)
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  taskId?: string;
  taskTitle?: string;
  action: string;
  details: string;
}

export interface AssistantQuestion {
  id: string;
  question: string;
  category: 'today' | 'risk' | 'deadlines' | 'approval' | 'priorities';
}
