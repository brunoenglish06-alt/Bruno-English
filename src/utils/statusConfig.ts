import { TaskStatus, Priority, TaskType, StageType, RiskLevel } from '../types';

export const TASK_STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  todo: {
    label: 'A fazer',
    bg: 'bg-stone-100',
    text: 'text-stone-700',
    border: 'border-stone-200'
  },
  in_production: {
    label: 'Em produção',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200'
  },
  in_review: {
    label: 'Em revisão',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200'
  },
  sent_for_approval: {
    label: 'Enviado p/ aprovação',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200'
  },
  awaiting_approval: {
    label: 'Aguardando aprovação',
    bg: 'bg-amber-100',
    text: 'text-amber-900',
    border: 'border-amber-300'
  },
  in_adjustments: {
    label: 'Em ajustes',
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200'
  },
  approved: {
    label: 'Aprovado',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200'
  },
  finalized: {
    label: 'Finalizado',
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-300'
  },
  delivered: {
    label: 'Entregue',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200'
  }
};

export const STAGE_TYPE_CONFIG: Record<
  StageType,
  { label: string; color: string; badgeBg: string; text: string; dot: string }
> = {
  production: {
    label: 'Produção',
    color: '#2563EB',
    badgeBg: 'bg-blue-500/10',
    text: 'text-blue-700',
    dot: 'bg-blue-600'
  },
  review: {
    label: 'Revisão Interna',
    color: '#4F46E5',
    badgeBg: 'bg-indigo-500/10',
    text: 'text-indigo-700',
    dot: 'bg-indigo-600'
  },
  send_approval: {
    label: 'Envio p/ Aprovação',
    color: '#D97706',
    badgeBg: 'bg-amber-500/15',
    text: 'text-amber-800',
    dot: 'bg-amber-600'
  },
  awaiting_approval: {
    label: 'Aguardando Aprovação',
    color: '#B45309',
    badgeBg: 'bg-amber-500/20',
    text: 'text-amber-900',
    dot: 'bg-amber-700'
  },
  adjustments: {
    label: 'Ajustes de Feedback',
    color: '#EA580C',
    badgeBg: 'bg-orange-500/15',
    text: 'text-orange-800',
    dot: 'bg-orange-600'
  },
  finalization: {
    label: 'Conferência e Finalização',
    color: '#16A34A',
    badgeBg: 'bg-emerald-500/15',
    text: 'text-emerald-800',
    dot: 'bg-emerald-600'
  },
  delivery: {
    label: 'Entrega Final',
    color: '#15803D',
    badgeBg: 'bg-emerald-600/20',
    text: 'text-emerald-900',
    dot: 'bg-emerald-700'
  }
};

export const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; color: string; dot: string }
> = {
  low: { label: 'Baixa', color: 'text-stone-500', dot: 'bg-stone-400' },
  normal: { label: 'Normal', color: 'text-[#6A3102]', dot: 'bg-[#6A3102]' },
  high: { label: 'Alta', color: 'text-amber-700', dot: 'bg-amber-600' },
  urgent: { label: 'Urgente', color: 'text-red-700', dot: 'bg-red-600' }
};

export const TASK_TYPE_CONFIG: Record<
  TaskType,
  { label: string; iconName: string }
> = {
  design: { label: 'Design', iconName: 'Palette' },
  video: { label: 'Vídeo', iconName: 'Video' },
  photo: { label: 'Fotografia', iconName: 'Camera' },
  social_media: { label: 'Social Media', iconName: 'Share2' },
  publishing: { label: 'Publicação', iconName: 'Send' },
  other: { label: 'Outro', iconName: 'Layers' }
};

export const RISK_LEVEL_CONFIG: Record<
  RiskLevel,
  { label: string; bg: string; text: string; border: string; barWidth: string }
> = {
  low: {
    label: 'Baixo',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    barWidth: 'w-1/4'
  },
  medium: {
    label: 'Médio',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    barWidth: 'w-2/4'
  },
  high: {
    label: 'Alto',
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-300',
    barWidth: 'w-3/4'
  },
  critical: {
    label: 'Crítico',
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-300',
    barWidth: 'w-full'
  }
};
