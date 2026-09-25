import { CategoryDefinition, SpecialtyDefinition } from '../types';

export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'design',
    name: 'Design',
    iconName: 'Palette',
    badgeBg: 'bg-purple-50 border-purple-200',
    badgeText: 'text-purple-700'
  },
  {
    id: 'video',
    name: 'Vídeo',
    iconName: 'Video',
    badgeBg: 'bg-rose-50 border-rose-200',
    badgeText: 'text-rose-700'
  },
  {
    id: 'social_media',
    name: 'Social Media',
    iconName: 'Share2',
    badgeBg: 'bg-sky-50 border-sky-200',
    badgeText: 'text-sky-700'
  },
  {
    id: 'other',
    name: 'Outras Categorias',
    iconName: 'Layers',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-700'
  }
];

export const DEFAULT_SPECIALTIES: SpecialtyDefinition[] = [
  // DESIGN
  { id: 'des_feed', name: 'Designer de Feed', category: 'design', iconName: 'LayoutGrid', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'des_carrossel', name: 'Designer de Carrossel', category: 'design', iconName: 'GalleryHorizontal', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'des_stories', name: 'Designer de Stories', category: 'design', iconName: 'Smartphone', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'des_poster', name: 'Designer de Poster', category: 'design', iconName: 'FileText', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'des_heels', name: 'Designer de Heels', category: 'design', iconName: 'Sparkles', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'des_reels_cover', name: 'Designer de Reels Cover (capas)', category: 'design', iconName: 'Image', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'des_banner', name: 'Designer de Banner', category: 'design', iconName: 'Flag', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'des_thumb', name: 'Designer de Thumbnail', category: 'design', iconName: 'Tv', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'des_apresentacao', name: 'Designer de Apresentação', category: 'design', iconName: 'Presentation', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'des_id_visual', name: 'Designer de Identidade Visual', category: 'design', iconName: 'Compass', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'des_anuncios', name: 'Designer de Anúncios', category: 'design', iconName: 'Megaphone', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'des_criativos', name: 'Designer de Criativos', category: 'design', iconName: 'Lightbulb', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'des_impresso', name: 'Designer de Material Impresso', category: 'design', iconName: 'Printer', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'des_outro', name: 'Design — Outro', category: 'design', iconName: 'MoreHorizontal', badgeColor: 'bg-stone-50 text-stone-700 border-stone-200' },

  // VÍDEO
  { id: 'vid_reels', name: 'Editor de Reels', category: 'video', iconName: 'Clapperboard', badgeColor: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'vid_shorts', name: 'Editor de Shorts', category: 'video', iconName: 'Smartphone', badgeColor: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'vid_editor', name: 'Editor de Vídeo', category: 'video', iconName: 'Film', badgeColor: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'vid_motion', name: 'Motion Designer', category: 'video', iconName: 'Activity', badgeColor: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'vid_legendas', name: 'Editor de Legendas', category: 'video', iconName: 'Subtitles', badgeColor: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'vid_audio', name: 'Tratamento de Áudio', category: 'video', iconName: 'Headphones', badgeColor: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'vid_cor', name: 'Correção de Cor', category: 'video', iconName: 'Sliders', badgeColor: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'vid_outro', name: 'Vídeo — Outro', category: 'video', iconName: 'MoreHorizontal', badgeColor: 'bg-stone-50 text-stone-700 border-stone-200' },

  // SOCIAL MEDIA
  { id: 'sm_planejamento', name: 'Planejamento de Conteúdo', category: 'social_media', iconName: 'CalendarRange', badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'sm_copy', name: 'Copywriter', category: 'social_media', iconName: 'PenTool', badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'sm_legendas', name: 'Legendas', category: 'social_media', iconName: 'AlignLeft', badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'sm_publicacao', name: 'Publicação', category: 'social_media', iconName: 'Send', badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'sm_calendario', name: 'Calendário Editorial', category: 'social_media', iconName: 'CalendarCheck', badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'sm_revisao', name: 'Revisão de Conteúdo', category: 'social_media', iconName: 'CheckCheck', badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'sm_outro', name: 'Social Media — Outro', category: 'social_media', iconName: 'MoreHorizontal', badgeColor: 'bg-stone-50 text-stone-700 border-stone-200' },

  // OUTRAS CATEGORIAS
  { id: 'out_foto', name: 'Fotografia', category: 'other', iconName: 'Camera', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'out_revisao', name: 'Revisão', category: 'other', iconName: 'Search', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'out_aprovacao', name: 'Aprovação', category: 'other', iconName: 'CheckCircle', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'out_entrega', name: 'Entrega', category: 'other', iconName: 'PackageCheck', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'out_outro', name: 'Outro', category: 'other', iconName: 'PlusCircle', badgeColor: 'bg-stone-50 text-stone-700 border-stone-200' }
];

export const WORKFLOW_PRESETS: {
  id: string;
  name: string;
  description: string;
  category: string;
  subtasks: { title: string; specialty: string }[];
}[] = [
  {
    id: 'campanha_instagram',
    name: 'Campanha de Instagram',
    description: 'Fluxo completo: artes do feed, stories, capa de reels, legendas e revisão',
    category: 'design',
    subtasks: [
      { title: 'Criar as artes do feed', specialty: 'Designer de Feed' },
      { title: 'Adaptar para formato stories', specialty: 'Designer de Stories' },
      { title: 'Criar capa chamativa de reels', specialty: 'Designer de Reels Cover (capas)' },
      { title: 'Preparar textos e legendas estratégicas', specialty: 'Copywriter' },
      { title: 'Verificar e revisar todo o material', specialty: 'Revisão de Conteúdo' }
    ]
  },
  {
    id: 'edicao_reels',
    name: 'Reels / Shorts Completo',
    description: 'Corte de vídeo, animação motion, legendas dinâmicas e capa',
    category: 'video',
    subtasks: [
      { title: 'Corte e edição dinâmica do vídeo', specialty: 'Editor de Reels' },
      { title: 'Inserir efeitos sonoros e tratar áudio', specialty: 'Tratamento de Áudio' },
      { title: 'Legendas estilizadas e dinâmicas', specialty: 'Editor de Legendas' },
      { title: 'Criação da capa do Reels', specialty: 'Designer de Reels Cover (capas)' },
      { title: 'Revisão final de sincronia e qualidade', specialty: 'Revisão' }
    ]
  },
  {
    id: 'carrossel_autoridade',
    name: 'Carrossel de Conteúdo',
    description: 'Roteiro copy, diagramação de lâminas e revisão ortográfica',
    category: 'design',
    subtasks: [
      { title: 'Elaboração do roteiro e ganchos (slides)', specialty: 'Copywriter' },
      { title: 'Design e diagramação dos slides', specialty: 'Designer de Carrossel' },
      { title: 'Criação da capa e slide final (CTA)', specialty: 'Designer de Feed' },
      { title: 'Revisão de texto e alinhamento da marca', specialty: 'Revisão de Conteúdo' }
    ]
  }
];

const STORAGE_KEY_CUSTOM_SPECIALTIES = 'oip_custom_specialties_v1';
const STORAGE_KEY_CUSTOM_CATEGORIES = 'oip_custom_categories_v1';

export function getCategories(): CategoryDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_CATEGORIES);
    const custom: CategoryDefinition[] = raw ? JSON.parse(raw) : [];
    return [...DEFAULT_CATEGORIES, ...custom];
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export function saveCustomCategory(cat: CategoryDefinition): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_CATEGORIES);
    const custom: CategoryDefinition[] = raw ? JSON.parse(raw) : [];
    const updated = [...custom.filter((c) => c.id !== cat.id), { ...cat, isCustom: true }];
    localStorage.setItem(STORAGE_KEY_CUSTOM_CATEGORIES, JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving custom category', err);
  }
}

export function getSpecialties(): SpecialtyDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_SPECIALTIES);
    const custom: SpecialtyDefinition[] = raw ? JSON.parse(raw) : [];
    return [...DEFAULT_SPECIALTIES, ...custom];
  } catch {
    return DEFAULT_SPECIALTIES;
  }
}

export function saveCustomSpecialty(spec: SpecialtyDefinition): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_SPECIALTIES);
    const custom: SpecialtyDefinition[] = raw ? JSON.parse(raw) : [];
    const updated = [...custom.filter((s) => s.id !== spec.id), { ...spec, isCustom: true }];
    localStorage.setItem(STORAGE_KEY_CUSTOM_SPECIALTIES, JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving custom specialty', err);
  }
}

export function addCustomSpecialty(name: string, category: string = 'other'): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  saveCustomSpecialty({
    id: 'custom_' + Date.now(),
    name: trimmed,
    category,
    isCustom: true
  });
}

export function findSpecialty(nameOrId?: string): SpecialtyDefinition | undefined {
  if (!nameOrId) return undefined;
  const list = getSpecialties();
  return list.find((s) => s.id === nameOrId || s.name.toLowerCase() === nameOrId.toLowerCase());
}
