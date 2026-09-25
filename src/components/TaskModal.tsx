import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Calendar,
  Clock,
  User,
  AlertCircle,
  Check,
  ChevronRight,
  ShieldCheck,
  ArrowRight,
  Info,
  FolderKanban,
  Users,
  Layers,
  ListTodo,
  Plus,
  Trash2,
  Sliders,
  Bookmark,
  Edit2,
  ChevronUp,
  ChevronDown,
  Package,
  Wrench
} from 'lucide-react';
import {
  Task,
  TaskType,
  Priority,
  TaskStatus,
  SafetyMarginOption,
  TaskStage,
  UserSettings,
  SubTask,
  WorkGroup,
  Deliverable
} from '../types';
import { getTodayISO, addDays, formatHours, formatReadableDate } from '../utils/dateUtils';
import { generateProductionPlan, PlanProposal } from '../utils/scheduler';
import { STAGE_TYPE_CONFIG, TASK_STATUS_CONFIG, PRIORITY_CONFIG } from '../utils/statusConfig';
import { RichTextEditor } from './RichTextEditor';
import {
  getCategories,
  getSpecialties,
  WORKFLOW_PRESETS,
  saveCustomSpecialty,
  findSpecialty
} from '../data/categoriesData';
import { loadCachedWorkgroups, getActiveGroupId } from '../services/firestoreService';
import {
  calculateDeliverablesProgress,
  DELIVERABLE_PRESETS,
  DeliverablePreset
} from '../utils/deliverableUtils';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (task: Task) => void;
  existingTasks: Task[];
  settings: UserSettings;
  taskToEdit?: Task | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSaveTask,
  existingTasks,
  settings,
  taskToEdit
}) => {
  const today = getTodayISO();

  // Active form section: 1. info, 2. deliverables, 3. planning, 4. team
  const [formSection, setFormSection] = useState<'info' | 'deliverables' | 'planning' | 'team'>('info');

  // Workgroups & Categories
  const [workgroups, setWorkgroups] = useState<WorkGroup[]>(() => loadCachedWorkgroups());
  const activeGroupId = getActiveGroupId();
  const categories = getCategories();
  const specialties = getSpecialties();

  // 1. INFORMAÇÕES DA DEMANDA
  const [title, setTitle] = useState(taskToEdit?.title || '');
  const [client, setClient] = useState(taskToEdit?.client || '');
  const [project, setProject] = useState(taskToEdit?.project || '');
  const [groupId, setGroupId] = useState(taskToEdit?.groupId || activeGroupId);
  const [category, setCategory] = useState(taskToEdit?.category || 'design');
  const [specialty, setSpecialty] = useState(taskToEdit?.specialty || 'Designer de Feed');
  const [customSpecialtyInput, setCustomSpecialtyInput] = useState('');
  const [isAddingCustomSpec, setIsAddingCustomSpec] = useState(false);
  const [description, setDescription] = useState(taskToEdit?.description || '');

  // 2. ENTREGÁVEIS DA DEMANDA (MÚLTIPLOS TIPOS DE TRABALHO)
  const [deliverables, setDeliverables] = useState<Deliverable[]>(taskToEdit?.deliverables || []);
  const [isEditingDeliverable, setIsEditingDeliverable] = useState(false);
  const [editingDeliverableId, setEditingDeliverableId] = useState<string | null>(null);

  // Form states for adding/editing single deliverable
  const [delivTitle, setDelivTitle] = useState('');
  const [delivCategory, setDelivCategory] = useState('design');
  const [delivSpecialty, setDelivSpecialty] = useState('Designer de Carrossel');
  const [delivDescription, setDelivDescription] = useState('');
  const [delivAssignee, setDelivAssignee] = useState('Bruno');
  const [delivDeadlineDate, setDelivDeadlineDate] = useState(taskToEdit?.deadlineDate || addDays(today, 4));
  const [delivDeadlineTime, setDelivDeadlineTime] = useState('18:00');
  const [delivHours, setDelivHours] = useState(2);
  const [delivAdjHours, setDelivAdjHours] = useState(0.5);
  const [delivPriority, setDelivPriority] = useState<Priority>('normal');
  const [delivStatus, setDelivStatus] = useState<TaskStatus>('todo');

  // 3. PLANEJAMENTO
  const [startDate, setStartDate] = useState(taskToEdit?.startDate || today);
  const [deadlineDate, setDeadlineDate] = useState(taskToEdit?.deadlineDate || addDays(today, 4));
  const [deadlineTime, setDeadlineTime] = useState(taskToEdit?.deadlineTime || '18:00');
  const [requiresApproval, setRequiresApproval] = useState(taskToEdit?.requiresApproval ?? true);
  const [approvalDeadlineDate, setApprovalDeadlineDate] = useState(
    taskToEdit?.approvalDeadlineDate || addDays(today, 2)
  );
  const [approvalDeadlineTime, setApprovalDeadlineTime] = useState(
    taskToEdit?.approvalDeadlineTime || '12:00'
  );
  const [estimatedProductionHours, setEstimatedProductionHours] = useState(
    taskToEdit?.estimatedProductionHours || 2
  );
  const [estimatedAdjustmentHours, setEstimatedAdjustmentHours] = useState(
    taskToEdit?.estimatedAdjustmentHours || 1
  );
  const [safetyMargin, setSafetyMargin] = useState<SafetyMarginOption>(
    taskToEdit?.safetyMargin || settings.defaultSafetyMargin
  );
  const [customSafetyMarginHours, setCustomSafetyMarginHours] = useState(
    taskToEdit?.customSafetyMarginHours || 24
  );

  // 4. RESPONSABILIDADE & SUBTAREFAS
  const [assignee, setAssignee] = useState(taskToEdit?.assignee || 'Bruno');
  const [collaborators, setCollaborators] = useState<string[]>(taskToEdit?.collaborators || []);
  const [newCollabInput, setNewCollabInput] = useState('');
  const [priority, setPriority] = useState<Priority>(taskToEdit?.priority || 'normal');
  const [status, setStatus] = useState<TaskStatus>(taskToEdit?.status || 'todo');
  const [subtasks, setSubtasks] = useState<SubTask[]>(taskToEdit?.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskSpecialty, setNewSubtaskSpecialty] = useState('');

  // Plan proposal preview state
  const [planProposal, setPlanProposal] = useState<PlanProposal | null>(
    taskToEdit
      ? {
          stages: taskToEdit.stages,
          riskLevel: taskToEdit.riskLevel,
          riskExplanation: taskToEdit.riskExplanation || '',
          recommendedStartDate: taskToEdit.stages[0]?.date || today,
          recommendedStartTime: taskToEdit.stages[0]?.startTime || '09:00',
          canMeetDeadline: true,
          conflictsFound: 0
        }
      : null
  );

  const [activeStep, setActiveStep] = useState<'form' | 'preview'>('form');

  // Reset form whenever modal opens or taskToEdit changes
  useEffect(() => {
    if (isOpen) {
      setWorkgroups(loadCachedWorkgroups());
      if (taskToEdit) {
        setTitle(taskToEdit.title || '');
        setClient(taskToEdit.client || '');
        setProject(taskToEdit.project || '');
        setGroupId(taskToEdit.groupId || activeGroupId);
        setCategory(taskToEdit.category || 'design');
        setSpecialty(taskToEdit.specialty || 'Designer de Feed');
        setDescription(taskToEdit.description || '');
        setDeliverables(taskToEdit.deliverables || []);
        setStartDate(taskToEdit.startDate || today);
        setDeadlineDate(taskToEdit.deadlineDate || addDays(today, 4));
        setDeadlineTime(taskToEdit.deadlineTime || '18:00');
        setRequiresApproval(taskToEdit.requiresApproval ?? true);
        setApprovalDeadlineDate(taskToEdit.approvalDeadlineDate || addDays(today, 2));
        setApprovalDeadlineTime(taskToEdit.approvalDeadlineTime || '12:00');
        setEstimatedProductionHours(taskToEdit.estimatedProductionHours || 2);
        setEstimatedAdjustmentHours(taskToEdit.estimatedAdjustmentHours || 1);
        setPriority(taskToEdit.priority || 'normal');
        setAssignee(taskToEdit.assignee || 'Bruno');
        setCollaborators(taskToEdit.collaborators || []);
        setStatus(taskToEdit.status || 'todo');
        setSubtasks(taskToEdit.subtasks || []);
        setSafetyMargin(taskToEdit.safetyMargin || settings.defaultSafetyMargin);
        setCustomSafetyMarginHours(taskToEdit.customSafetyMarginHours || 24);
        setPlanProposal({
          stages: taskToEdit.stages,
          riskLevel: taskToEdit.riskLevel,
          riskExplanation: taskToEdit.riskExplanation || '',
          recommendedStartDate: taskToEdit.stages[0]?.date || today,
          recommendedStartTime: taskToEdit.stages[0]?.startTime || '09:00',
          canMeetDeadline: true,
          conflictsFound: 0
        });
      } else {
        // Completely reset all fields for a brand new task
        setTitle('');
        setClient('');
        setProject('');
        setGroupId(activeGroupId);
        setCategory('design');
        setSpecialty('Designer de Feed');
        setDescription('');
        setDeliverables([]);
        setStartDate(today);
        setDeadlineDate(addDays(today, 4));
        setDeadlineTime('18:00');
        setRequiresApproval(true);
        setApprovalDeadlineDate(addDays(today, 2));
        setApprovalDeadlineTime('12:00');
        setEstimatedProductionHours(2);
        setEstimatedAdjustmentHours(1);
        setPriority('normal');
        setAssignee('Bruno');
        setCollaborators([]);
        setStatus('todo');
        setSubtasks([]);
        setSafetyMargin(settings.defaultSafetyMargin);
        setCustomSafetyMarginHours(24);
        setPlanProposal(null);
      }
      setIsEditingDeliverable(false);
      setEditingDeliverableId(null);
      setFormSection('info');
      setActiveStep('form');
    }
  }, [isOpen, taskToEdit, settings.defaultSafetyMargin, activeGroupId]);

  if (!isOpen) return null;

  // Selected workgroup members for assignment
  const currentGroup = workgroups.find((g) => g.id === groupId) || workgroups[0];
  const groupMembers = currentGroup?.members || [];

  // Filter specialties based on selected category
  const filteredSpecialties = specialties.filter((s) => s.category === category);

  // Deliverables handlers
  const handleOpenAddDeliverable = () => {
    setEditingDeliverableId(null);
    setDelivTitle('');
    setDelivCategory(category);
    const spec = specialties.find((s) => s.category === category);
    setDelivSpecialty(spec ? spec.name : 'Designer de Carrossel');
    setDelivDescription('');
    setDelivAssignee(assignee || (groupMembers[0]?.name || 'Bruno'));
    setDelivDeadlineDate(deadlineDate);
    setDelivDeadlineTime(deadlineTime);
    setDelivHours(2);
    setDelivAdjHours(0.5);
    setDelivPriority('normal');
    setDelivStatus('todo');
    setIsEditingDeliverable(true);
  };

  const handleEditDeliverable = (deliv: Deliverable) => {
    setEditingDeliverableId(deliv.id);
    setDelivTitle(deliv.title);
    setDelivCategory(deliv.category || 'design');
    setDelivSpecialty(deliv.specialty);
    setDelivDescription(deliv.description || '');
    setDelivAssignee(deliv.assignee);
    setDelivDeadlineDate(deliv.deadlineDate || deadlineDate);
    setDelivDeadlineTime(deliv.deadlineTime || deadlineTime);
    setDelivHours(deliv.estimatedHours || 2);
    setDelivAdjHours(deliv.estimatedAdjustmentHours || 0.5);
    setDelivPriority(deliv.priority || 'normal');
    setDelivStatus(deliv.status || 'todo');
    setIsEditingDeliverable(true);
  };

  const handleSaveDeliverable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!delivTitle.trim()) return;

    let updatedList: Deliverable[];

    if (editingDeliverableId) {
      updatedList = deliverables.map((d) =>
        d.id === editingDeliverableId
          ? {
              ...d,
              title: delivTitle.trim(),
              category: delivCategory,
              specialty: delivSpecialty,
              description: delivDescription.trim(),
              assignee: delivAssignee.trim() || assignee,
              deadlineDate: delivDeadlineDate,
              deadlineTime: delivDeadlineTime,
              estimatedHours: Number(delivHours),
              estimatedAdjustmentHours: Number(delivAdjHours),
              priority: delivPriority,
              status: delivStatus
            }
          : d
      );
    } else {
      const newDeliv: Deliverable = {
        id: 'deliv-' + Date.now(),
        title: delivTitle.trim(),
        category: delivCategory,
        specialty: delivSpecialty,
        description: delivDescription.trim(),
        assignee: delivAssignee.trim() || assignee,
        deadlineDate: delivDeadlineDate || deadlineDate,
        deadlineTime: delivDeadlineTime || deadlineTime,
        estimatedHours: Number(delivHours) || 1,
        estimatedAdjustmentHours: Number(delivAdjHours) || 0.5,
        priority: delivPriority,
        status: delivStatus,
        completed: false
      };
      updatedList = [...deliverables, newDeliv];
    }

    setDeliverables(updatedList);
    setIsEditingDeliverable(false);
    setEditingDeliverableId(null);

    // Auto-sum total hours if multiple deliverables
    const totalProdHours = updatedList.reduce((acc, d) => acc + (d.estimatedHours || 0), 0);
    const totalAdjHours = updatedList.reduce((acc, d) => acc + (d.estimatedAdjustmentHours || 0), 0);
    if (totalProdHours > 0) {
      setEstimatedProductionHours(totalProdHours);
    }
    if (totalAdjHours > 0) {
      setEstimatedAdjustmentHours(totalAdjHours);
    }

    // Auto collect all distinct assignees into collaborators
    const distinctAssignees = Array.from(new Set(updatedList.map((d) => d.assignee).filter(Boolean)));
    const newCollabs = distinctAssignees.filter((a) => a !== assignee && !collaborators.includes(a));
    if (newCollabs.length > 0) {
      setCollaborators([...collaborators, ...newCollabs]);
    }
  };

  const handleRemoveDeliverable = (id: string) => {
    const updated = deliverables.filter((d) => d.id !== id);
    setDeliverables(updated);
    if (updated.length > 0) {
      const totalProdHours = updated.reduce((acc, d) => acc + (d.estimatedHours || 0), 0);
      setEstimatedProductionHours(totalProdHours);
    }
  };

  const handleMoveDeliverable = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === deliverables.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...deliverables];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setDeliverables(updated);
  };

  // Quick preset loader for deliverables
  const handleLoadDeliverablesPreset = (preset: DeliverablePreset) => {
    const generated: Deliverable[] = preset.items.map((item, i) => ({
      id: 'deliv-' + Date.now() + '-' + i,
      title: item.title,
      specialty: item.specialty,
      category: item.category,
      description: item.description,
      assignee: assignee || 'Bruno',
      deadlineDate: deadlineDate,
      deadlineTime: deadlineTime,
      estimatedHours: item.estimatedHours,
      estimatedAdjustmentHours: item.estimatedAdjustmentHours || 0.5,
      priority: 'normal',
      status: 'todo',
      completed: false
    }));

    const combined = [...deliverables, ...generated];
    setDeliverables(combined);

    if (!title) {
      setTitle(preset.name);
    }

    const totalProdHours = combined.reduce((acc, d) => acc + (d.estimatedHours || 0), 0);
    setEstimatedProductionHours(totalProdHours);
  };

  // Subtask handlers
  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const item: SubTask = {
      id: 'sub-' + Date.now(),
      title: newSubtaskTitle.trim(),
      specialty: newSubtaskSpecialty || specialty,
      assignee: assignee,
      completed: false
    };
    setSubtasks([...subtasks, item]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter((s) => s.id !== id));
  };

  const handleSaveCustomSpecialty = () => {
    if (!customSpecialtyInput.trim()) return;
    const name = customSpecialtyInput.trim();
    saveCustomSpecialty({
      id: 'custom_' + Date.now(),
      name,
      category,
      isCustom: true
    });
    setSpecialty(name);
    setCustomSpecialtyInput('');
    setIsAddingCustomSpec(false);
  };

  const handlePlanTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !client.trim()) {
      setFormSection('info');
      return;
    }

    // Map category to TaskType for scheduler compatibility
    const taskTypeMapped: TaskType =
      category === 'video'
        ? 'video'
        : category === 'social_media'
        ? 'social_media'
        : category === 'other'
        ? 'other'
        : 'design';

    const draft: Partial<Task> = {
      id: taskToEdit?.id || 'task-' + Date.now(),
      title: title.trim(),
      client: client.trim(),
      project: project.trim() || undefined,
      groupId,
      type: taskTypeMapped,
      category,
      specialty,
      collaborators,
      description: description.trim(),
      startDate,
      deadlineDate,
      deadlineTime,
      requiresApproval,
      approvalDeadlineDate: requiresApproval ? approvalDeadlineDate : undefined,
      approvalDeadlineTime: requiresApproval ? approvalDeadlineTime : undefined,
      estimatedProductionHours: Number(estimatedProductionHours),
      estimatedAdjustmentHours: Number(estimatedAdjustmentHours),
      priority,
      assignee: assignee.trim(),
      status,
      safetyMargin,
      customSafetyMarginHours: safetyMargin === 'custom' ? Number(customSafetyMarginHours) : undefined,
      deliverables,
      subtasks
    };

    const calculatedPlan = generateProductionPlan(draft, existingTasks, settings);
    setPlanProposal(calculatedPlan);
    setActiveStep('preview');
  };

  const handleStageChange = (index: number, field: keyof TaskStage, value: any) => {
    if (!planProposal) return;
    const updatedStages = [...planProposal.stages];
    updatedStages[index] = {
      ...updatedStages[index],
      [field]: value
    };
    setPlanProposal({
      ...planProposal,
      stages: updatedStages
    });
  };

  const handleConfirmSave = () => {
    if (!title.trim() || !client.trim() || !planProposal) return;

    const taskTypeMapped: TaskType =
      category === 'video'
        ? 'video'
        : category === 'social_media'
        ? 'social_media'
        : category === 'other'
        ? 'other'
        : 'design';

    const finalTask: Task = {
      id: taskToEdit?.id || 'task-' + Date.now(),
      title: title.trim(),
      client: client.trim(),
      project: project.trim() || undefined,
      groupId,
      type: taskTypeMapped,
      category,
      specialty,
      collaborators,
      description: description.trim(),
      startDate,
      deadlineDate,
      deadlineTime,
      requiresApproval,
      approvalDeadlineDate: requiresApproval ? approvalDeadlineDate : undefined,
      approvalDeadlineTime: requiresApproval ? approvalDeadlineTime : undefined,
      estimatedProductionHours: Number(estimatedProductionHours),
      estimatedAdjustmentHours: Number(estimatedAdjustmentHours),
      priority,
      assignee: assignee.trim(),
      status,
      safetyMargin,
      customSafetyMarginHours: safetyMargin === 'custom' ? Number(customSafetyMarginHours) : undefined,
      stages: planProposal.stages,
      deliverables,
      subtasks,
      riskLevel: planProposal.riskLevel,
      riskExplanation: planProposal.riskExplanation,
      createdAt: taskToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveTask(finalTask);
    onClose();
  };

  const delivMetrics = calculateDeliverablesProgress(deliverables);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#EDE4DA] w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EDE4DA] flex items-center justify-between bg-[#FAF7F2]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#6A3102]/10 text-[#6A3102] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-[#231815]">
                {taskToEdit ? 'Editar Demanda' : 'Nova Demanda Criativa'}
              </h2>
              <span className="text-xs text-[#73645B]">
                {taskToEdit
                  ? 'Atualize entregáveis, prazos ou membros da equipe'
                  : 'Cadastre múltiplos tipos de trabalho com cronograma inteligente preventivo'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#73645B] hover:text-[#231815] hover:bg-[#EDE4DA] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Tabs Navigation */}
        <div className="px-6 border-b border-[#EDE4DA] bg-white flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex gap-6">
            <button
              type="button"
              onClick={() => setActiveStep('form')}
              className={`py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeStep === 'form'
                  ? 'border-[#6A3102] text-[#6A3102]'
                  : 'border-transparent text-[#73645B] hover:text-[#231815]'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-[#6A3102]/15 text-[#6A3102] text-[10px] flex items-center justify-center font-mono font-bold">
                1
              </span>
              <span>1. Configurar Demanda</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                if (planProposal) setActiveStep('preview');
                else handlePlanTask(e as any);
              }}
              className={`py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeStep === 'preview'
                  ? 'border-[#6A3102] text-[#6A3102]'
                  : 'border-transparent text-[#73645B] hover:text-[#231815]'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-[#6A3102]/15 text-[#6A3102] text-[10px] flex items-center justify-center font-mono font-bold">
                2
              </span>
              <span>2. Cronograma Preventivo</span>
            </button>
          </div>

          {activeStep === 'form' && (
            <div className="hidden sm:flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-lg border border-[#EDE4DA] text-xs">
              <button
                type="button"
                onClick={() => setFormSection('info')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  formSection === 'info' ? 'bg-[#6A3102] text-white' : 'text-[#73645B] hover:text-[#231815]'
                }`}
              >
                Informações
              </button>
              <button
                type="button"
                onClick={() => setFormSection('deliverables')}
                className={`px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1 ${
                  formSection === 'deliverables' ? 'bg-[#6A3102] text-white' : 'text-[#73645B] hover:text-[#231815]'
                }`}
              >
                <span>Entregáveis</span>
                {deliverables.length > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1 rounded-full ${
                      formSection === 'deliverables' ? 'bg-white/25 text-white' : 'bg-[#6A3102]/15 text-[#6A3102]'
                    }`}
                  >
                    {deliverables.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setFormSection('planning')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  formSection === 'planning' ? 'bg-[#6A3102] text-white' : 'text-[#73645B] hover:text-[#231815]'
                }`}
              >
                Planejamento
              </button>
              <button
                type="button"
                onClick={() => setFormSection('team')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  formSection === 'team' ? 'bg-[#6A3102] text-white' : 'text-[#73645B] hover:text-[#231815]'
                }`}
              >
                Equipe
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 text-[#231815]">
          {activeStep === 'form' ? (
            <form id="task-form" onSubmit={handlePlanTask} className="space-y-6">
              {/* SECTION 1: INFORMAÇÕES DA DEMANDA */}
              {formSection === 'info' && (
                <div className="space-y-5 animate-in fade-in duration-100">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#EDE4DA]">
                    <FolderKanban className="w-4 h-4 text-[#6A3102]" />
                    <h3 className="text-xs font-bold text-[#5C4D44] uppercase tracking-wider">
                      Informações da Demanda
                    </h3>
                  </div>

                  {/* Nome & Cliente */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                        Nome da demanda principal <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Matata Store / Campanha de Outubro"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6A3102] bg-white text-[#231815]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                        Cliente <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Matata Store / Café Raiz"
                        value={client}
                        onChange={(e) => setClient(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6A3102] bg-white text-[#231815]"
                      />
                    </div>
                  </div>

                  {/* Projeto & Grupo de Trabalho */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                        Projeto / Campanha (opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Conteúdo Outubro / Black Friday"
                        value={project}
                        onChange={(e) => setProject(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6A3102] bg-white text-[#231815]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                        Grupo de Trabalho
                      </label>
                      <select
                        value={groupId}
                        onChange={(e) => setGroupId(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg focus:outline-none bg-white text-[#231815]"
                      >
                        {workgroups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name} ({g.members.length} integrantes)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Categoria & Especialidade Geral */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                        Categoria Principal
                      </label>
                      <select
                        value={category}
                        onChange={(e) => {
                          const newCat = e.target.value;
                          setCategory(newCat);
                          const firstSpec = specialties.find((s) => s.category === newCat);
                          if (firstSpec) setSpecialty(firstSpec.name);
                        }}
                        className="w-full px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg focus:outline-none bg-white text-[#231815]"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-[#5C4D44]">
                          Especialidade / Foco Principal
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsAddingCustomSpec(!isAddingCustomSpec)}
                          className="text-[11px] text-[#6A3102] hover:underline"
                        >
                          + Personalizada
                        </button>
                      </div>

                      {isAddingCustomSpec ? (
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Nome da especialidade..."
                            value={customSpecialtyInput}
                            onChange={(e) => setCustomSpecialtyInput(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 text-xs border border-[#EDE4DA] rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={handleSaveCustomSpecialty}
                            className="px-2.5 py-1.5 text-xs bg-[#6A3102] text-white rounded-lg font-semibold"
                          >
                            Salvar
                          </button>
                        </div>
                      ) : (
                        <select
                          value={specialty}
                          onChange={(e) => setSpecialty(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg focus:outline-none bg-white text-[#231815]"
                        >
                          {filteredSpecialties.map((s) => (
                            <option key={s.id} value={s.name}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Rich Text Editor for Description */}
                  <RichTextEditor
                    value={description}
                    onChange={setDescription}
                    label="Descrição e Briefing da Demanda"
                    placeholder="Detalhe os objetivos, links de referência, tom de voz e diretrizes da campanha..."
                    minHeight="140px"
                  />

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setFormSection('deliverables')}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#FAF7F2] border border-[#EDE4DA] hover:bg-[#EDE4DA] text-[#231815] flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Avançar para Entregáveis da Demanda</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION 2: ENTREGÁVEIS DA DEMANDA (NOVA FUNCIONALIDADE SOLICITADA) */}
              {formSection === 'deliverables' && (
                <div className="space-y-5 animate-in fade-in duration-100">
                  <div className="flex items-center justify-between pb-2 border-b border-[#EDE4DA]">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#6A3102]" />
                      <div>
                        <h3 className="text-xs font-bold text-[#5C4D44] uppercase tracking-wider">
                          Entregáveis da Demanda ({deliverables.length})
                        </h3>
                        <span className="text-[11px] text-[#73645B]">
                          Adicione múltiplos tipos de trabalho (Carrossel, Story, Reels...) na mesma demanda
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenAddDeliverable}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-[#6A3102] hover:bg-[#542601] text-white rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ ADICIONAR TIPO DE TRABALHO</span>
                    </button>
                  </div>

                  {/* Quick Action Presets & Pills */}
                  <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EDE4DA] space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                      <span className="text-[11px] font-bold text-[#5C4D44] uppercase tracking-wider flex items-center gap-1">
                        <Bookmark className="w-3 h-3 text-[#6A3102]" />
                        Adição Rápida:
                      </span>

                      {/* Dropdown de Templates */}
                      <select
                        onChange={(e) => {
                          const preset = DELIVERABLE_PRESETS.find((p) => p.id === e.target.value);
                          if (preset) {
                            handleLoadDeliverablesPreset(preset);
                            e.target.value = '';
                          }
                        }}
                        className="text-xs font-semibold bg-white border border-[#EDE4DA] rounded-lg px-2.5 py-1 text-[#6A3102] focus:outline-none"
                      >
                        <option value="">Carregar Pacote Pronto...</option>
                        {DELIVERABLE_PRESETS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quick item chips */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[#EDE4DA]/60">
                      {[
                        { title: 'Carrossel', specialty: 'Designer de Carrossel', cat: 'design', hours: 2 },
                        { title: 'Story', specialty: 'Designer de Stories', cat: 'design', hours: 1 },
                        { title: 'Reels', specialty: 'Editor de Reels', cat: 'video', hours: 2 },
                        { title: 'Feed Post', specialty: 'Designer de Feed', cat: 'design', hours: 1.5 },
                        { title: 'Banner', specialty: 'Designer de Banner', cat: 'design', hours: 1.5 },
                        { title: 'Capas de Reels', specialty: 'Designer de Reels Cover', cat: 'design', hours: 1 },
                        { title: 'Copywriting', specialty: 'Copywriter', cat: 'social_media', hours: 1 }
                      ].map((item) => (
                        <button
                          key={item.title}
                          type="button"
                          onClick={() => {
                            const newDeliv: Deliverable = {
                              id: 'deliv-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
                              title: item.title,
                              specialty: item.specialty,
                              category: item.cat,
                              assignee: assignee || 'Bruno',
                              deadlineDate: deadlineDate,
                              deadlineTime: deadlineTime,
                              estimatedHours: item.hours,
                              estimatedAdjustmentHours: 0.5,
                              priority: 'normal',
                              status: 'todo',
                              completed: false
                            };
                            const updated = [...deliverables, newDeliv];
                            setDeliverables(updated);
                            setEstimatedProductionHours(updated.reduce((acc, d) => acc + (d.estimatedHours || 0), 0));
                          }}
                          className="px-2 py-0.5 text-[11px] rounded-full bg-white border border-[#EDE4DA] hover:border-[#6A3102] text-[#4A3B32] hover:text-[#6A3102] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>+ {item.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Inline Form to Add / Edit Deliverable */}
                  {isEditingDeliverable && (
                    <div className="p-4 rounded-xl border-2 border-[#6A3102]/30 bg-white space-y-4 shadow-sm animate-in fade-in duration-150">
                      <div className="flex items-center justify-between border-b border-[#EDE4DA] pb-2">
                        <span className="text-xs font-bold text-[#6A3102] flex items-center gap-1.5 uppercase tracking-wider">
                          <Package className="w-3.5 h-3.5" />
                          {editingDeliverableId ? 'Editar Entregável' : 'Novo Tipo de Trabalho'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingDeliverable(false);
                            setEditingDeliverableId(null);
                          }}
                          className="text-[#8C7A70] hover:text-[#231815] text-xs"
                        >
                          Cancelar
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-[#5C4D44] mb-1">
                            Nome do Entregável <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Carrossel, Story, Edição de Reels..."
                            value={delivTitle}
                            onChange={(e) => setDelivTitle(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-[#EDE4DA] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6A3102] bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-[#5C4D44] mb-1">
                            Especialidade / Função Necessária
                          </label>
                          <select
                            value={delivSpecialty}
                            onChange={(e) => setDelivSpecialty(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-[#EDE4DA] rounded-lg focus:outline-none bg-white"
                          >
                            {specialties.map((s) => (
                              <option key={s.id} value={s.name}>
                                {s.name} ({s.category})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-[#5C4D44] mb-1">
                            Responsável por este entregável
                          </label>
                          <input
                            type="text"
                            list="deliv-members-list"
                            placeholder="Nome do integrante"
                            value={delivAssignee}
                            onChange={(e) => setDelivAssignee(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                          />
                          <datalist id="deliv-members-list">
                            {groupMembers.map((m) => (
                              <option key={m.id} value={m.name}>
                                {m.name} ({m.specialty})
                              </option>
                            ))}
                          </datalist>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-[#5C4D44] mb-1">
                            Prazo individual
                          </label>
                          <input
                            type="date"
                            value={delivDeadlineDate}
                            onChange={(e) => setDelivDeadlineDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-[#5C4D44] mb-1">
                            Horário limite
                          </label>
                          <input
                            type="time"
                            value={delivDeadlineTime}
                            onChange={(e) => setDelivDeadlineTime(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-[#5C4D44] mb-1">
                            Tempo estimado (horas)
                          </label>
                          <input
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={delivHours}
                            onChange={(e) => setDelivHours(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-[#5C4D44] mb-1">
                            Tempo revisão (horas)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={delivAdjHours}
                            onChange={(e) => setDelivAdjHours(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-[#5C4D44] mb-1">
                            Prioridade
                          </label>
                          <select
                            value={delivPriority}
                            onChange={(e) => setDelivPriority(e.target.value as Priority)}
                            className="w-full px-2.5 py-1.5 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                          >
                            <option value="low">Baixa</option>
                            <option value="normal">Normal</option>
                            <option value="high">Alta</option>
                            <option value="urgent">Urgente</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-[#5C4D44] mb-1">
                            Status inicial
                          </label>
                          <select
                            value={delivStatus}
                            onChange={(e) => setDelivStatus(e.target.value as TaskStatus)}
                            className="w-full px-2.5 py-1.5 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                          >
                            <option value="todo">A Fazer</option>
                            <option value="in_production">Em Produção</option>
                            <option value="in_review">Em Revisão</option>
                            <option value="awaiting_approval">Aguardando Aprovação</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-[#5C4D44] mb-1">
                          Descrição específica deste entregável (opcional)
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Formato 1080x1350 com gancho forte na capa e CTA no final"
                          value={delivDescription}
                          onChange={(e) => setDelivDescription(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-[#EDE4DA]">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingDeliverable(false);
                            setEditingDeliverableId(null);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg text-[#73645B] hover:text-[#231815]"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveDeliverable}
                          className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#6A3102] hover:bg-[#542601] text-white flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{editingDeliverableId ? 'Atualizar Entregável' : 'Salvar Entregável'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* List of Added Deliverables */}
                  {deliverables.length === 0 ? (
                    <div className="p-8 text-center bg-[#FAF7F2]/60 rounded-xl border border-dashed border-[#EDE4DA] space-y-2">
                      <Layers className="w-8 h-8 text-[#8C7A70] mx-auto" />
                      <h4 className="text-xs font-bold text-[#231815]">Nenhum entregável adicionado</h4>
                      <p className="text-xs text-[#73645B] max-w-md mx-auto">
                        Adicione os tipos de trabalho desta demanda (como Carrossel, Stories e Reels) para planejar prazos e responsáveis individuais.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenAddDeliverable}
                        className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#6A3102] text-white inline-flex items-center gap-1.5 cursor-pointer mt-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Primeiro Entregável</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="divide-y divide-[#EDE4DA] border border-[#EDE4DA] rounded-xl bg-white overflow-hidden shadow-2xs">
                        {deliverables.map((deliv, idx) => {
                          const statusCfg = TASK_STATUS_CONFIG[deliv.status] || TASK_STATUS_CONFIG.todo;
                          const priorityCfg = PRIORITY_CONFIG[deliv.priority || 'normal'];

                          return (
                            <div
                              key={deliv.id || idx}
                              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-[#FAF7F2]/50 transition-colors"
                            >
                              <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                                <span className="font-mono text-[#8C7A70] text-[11px] font-bold shrink-0 mt-0.5 sm:mt-0">
                                  {idx + 1}.
                                </span>

                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-sm text-[#231815]">{deliv.title}</span>
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#EDE4DA] text-[#4A3B32]">
                                      {deliv.specialty}
                                    </span>
                                    <span
                                      className={`text-[10px] px-2 py-0.5 rounded font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                                    >
                                      {statusCfg.label}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3 text-[11px] text-[#73645B] flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3 text-[#8C7A70]" />
                                      <strong>{deliv.assignee}</strong>
                                    </span>
                                    <span>·</span>
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-[#8C7A70]" />
                                      Prazo: {formatReadableDate(deliv.deadlineDate, false)} {deliv.deadlineTime}
                                    </span>
                                    <span>·</span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-[#8C7A70]" />
                                      {deliv.estimatedHours}h produção
                                    </span>
                                  </div>

                                  {deliv.description && (
                                    <p className="text-[11px] text-[#8C7A70] italic truncate">
                                      {deliv.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Actions for deliverable */}
                              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleMoveDeliverable(idx, 'up')}
                                  disabled={idx === 0}
                                  title="Subir"
                                  className="p-1 text-[#8C7A70] hover:text-[#231815] disabled:opacity-30 rounded"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveDeliverable(idx, 'down')}
                                  disabled={idx === deliverables.length - 1}
                                  title="Descer"
                                  className="p-1 text-[#8C7A70] hover:text-[#231815] disabled:opacity-30 rounded"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditDeliverable(deliv)}
                                  title="Editar"
                                  className="p-1.5 text-[#6A3102] hover:bg-[#EDE4DA] rounded transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDeliverable(deliv.id)}
                                  title="Excluir"
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Summary Banner */}
                      <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EDE4DA] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div>
                          <strong className="text-[#231815] block">
                            Resumo dos Entregáveis: {delivMetrics.summaryText}
                          </strong>
                          <span className="text-[11px] text-[#73645B]">
                            Carga horária total somada: {estimatedProductionHours}h produção + {estimatedAdjustmentHours}h ajustes
                          </span>
                        </div>

                        <div className="text-[11px] font-mono text-[#6A3102] font-semibold bg-white px-2.5 py-1 rounded-lg border border-[#EDE4DA]">
                          {deliverables.length} tipo(s) de trabalho
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setFormSection('info')}
                      className="px-3.5 py-2 text-xs font-semibold rounded-lg text-[#73645B] hover:text-[#231815]"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormSection('planning')}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#FAF7F2] border border-[#EDE4DA] hover:bg-[#EDE4DA] text-[#231815] flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Avançar para Planejamento & Prazos</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION 3: PLANEJAMENTO */}
              {formSection === 'planning' && (
                <div className="space-y-5 animate-in fade-in duration-100">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#EDE4DA]">
                    <Calendar className="w-4 h-4 text-[#6A3102]" />
                    <h3 className="text-xs font-bold text-[#5C4D44] uppercase tracking-wider">
                      Planejamento Geral & Prazos
                    </h3>
                  </div>

                  {/* Prazos Finais */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                        Data final de entrega da demanda
                      </label>
                      <input
                        type="date"
                        required
                        value={deadlineDate}
                        onChange={(e) => setDeadlineDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                        Horário limite de entrega
                      </label>
                      <input
                        type="time"
                        value={deadlineTime}
                        onChange={(e) => setDeadlineTime(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  {/* Estimativa de Horas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-[#5C4D44]">
                          Tempo total de produção (horas)
                        </label>
                        {deliverables.length > 0 && (
                          <span className="text-[10px] text-[#6A3102] font-semibold">
                            (Somado dos entregáveis)
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={estimatedProductionHours}
                        onChange={(e) => setEstimatedProductionHours(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                      />
                      <span className="text-[10px] text-[#8C7A70] mt-0.5 block">
                        Ex: 2 para 2 horas líquidas de criação
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                        Tempo de revisão / ajustes (horas)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={estimatedAdjustmentHours}
                        onChange={(e) => setEstimatedAdjustmentHours(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  {/* Necessita de aprovação? */}
                  <div className="p-4 rounded-xl border border-[#EDE4DA] bg-[#FAF7F2] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#231815] block">
                          Necessita de aprovação do cliente/gestor?
                        </span>
                        <span className="text-[11px] text-[#73645B]">
                          Reserva tempo para envio, análise e retorno com folga de segurança preventiva.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={requiresApproval}
                        onChange={(e) => setRequiresApproval(e.target.checked)}
                        className="w-5 h-5 rounded text-[#6A3102] focus:ring-[#6A3102] cursor-pointer"
                      />
                    </div>

                    {requiresApproval && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#EDE4DA]">
                        <div>
                          <label className="block text-[11px] font-medium text-[#5C4D44] mb-1">
                            Data limite para aprovação
                          </label>
                          <input
                            type="date"
                            value={approvalDeadlineDate}
                            onChange={(e) => setApprovalDeadlineDate(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-[#EDE4DA] rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[#5C4D44] mb-1">
                            Horário de aprovação
                          </label>
                          <input
                            type="time"
                            value={approvalDeadlineTime}
                            onChange={(e) => setApprovalDeadlineTime(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-[#EDE4DA] rounded bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Margem de Segurança */}
                  <div>
                    <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                      Margem de segurança preventiva
                    </label>
                    <select
                      value={safetyMargin}
                      onChange={(e) => setSafetyMargin(e.target.value as SafetyMarginOption)}
                      className="w-full px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                    >
                      <option value="none">Sem margem (finalização no mesmo dia)</option>
                      <option value="1_day">1 dia de antecedência preventiva</option>
                      <option value="2_days">2 dias de antecedência (Recomendado)</option>
                      <option value="3_days">3 dias de antecedência (Carga alta)</option>
                      <option value="custom">Margem personalizada em horas</option>
                    </select>
                  </div>

                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setFormSection('deliverables')}
                      className="px-3.5 py-2 text-xs font-semibold rounded-lg text-[#73645B] hover:text-[#231815]"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormSection('team')}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#FAF7F2] border border-[#EDE4DA] hover:bg-[#EDE4DA] text-[#231815] flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Avançar para Equipe & Subtarefas</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION 4: RESPONSABILIDADE & SUBTAREFAS */}
              {formSection === 'team' && (
                <div className="space-y-5 animate-in fade-in duration-100">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#EDE4DA]">
                    <Users className="w-4 h-4 text-[#6A3102]" />
                    <h3 className="text-xs font-bold text-[#5C4D44] uppercase tracking-wider">
                      Responsabilidade & Equipe
                    </h3>
                  </div>

                  {/* Responsável principal & Prioridade */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                        Responsável principal da demanda
                      </label>
                      <input
                        type="text"
                        list="group-members-list"
                        value={assignee}
                        onChange={(e) => setAssignee(e.target.value)}
                        placeholder="Nome do responsável"
                        className="w-full px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                      />
                      <datalist id="group-members-list">
                        {groupMembers.map((m) => (
                          <option key={m.id} value={m.name}>
                            {m.name} ({m.specialty})
                          </option>
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                        Prioridade Geral
                      </label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as Priority)}
                        className="w-full px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                      >
                        <option value="low">Baixa</option>
                        <option value="normal">Normal</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                        Status inicial
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as TaskStatus)}
                        className="w-full px-3 py-2 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                      >
                        <option value="todo">A Fazer</option>
                        <option value="in_production">Em Produção</option>
                        <option value="in_review">Em Revisão</option>
                        <option value="awaiting_approval">Aguardando Aprovação</option>
                      </select>
                    </div>
                  </div>

                  {/* Subtarefas complementares */}
                  <div className="p-4 rounded-xl border border-[#EDE4DA] bg-[#FAF7F2] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#231815] block">
                          Checklist de Apoio / Subtarefas Complementares
                        </span>
                        <span className="text-[11px] text-[#73645B]">
                          Pequenas etapas de verificação além dos entregáveis principais
                        </span>
                      </div>
                    </div>

                    {/* Add subtask row */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nome da verificação (ex: Checar ortografia, conferir marca d'água...)"
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs border border-[#EDE4DA] rounded-lg bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddSubtask}
                        className="px-3 py-1.5 text-xs bg-[#6A3102] text-white rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar</span>
                      </button>
                    </div>

                    {/* Subtasks list */}
                    {subtasks.length > 0 && (
                      <div className="divide-y divide-[#EDE4DA] border border-[#EDE4DA] rounded-lg bg-white overflow-hidden">
                        {subtasks.map((st, i) => (
                          <div
                            key={st.id || i}
                            className="p-2.5 flex items-center justify-between text-xs hover:bg-[#FAF7F2]"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[#8C7A70] text-[10px]">{i + 1}.</span>
                              <span className="font-medium text-[#231815]">{st.title}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveSubtask(st.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setFormSection('planning')}
                      className="px-3.5 py-2 text-xs font-semibold rounded-lg text-[#73645B] hover:text-[#231815]"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-[#6A3102] hover:bg-[#542601] text-white flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Calcular Cronograma Inteligente</span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          ) : (
            /* STEP 2: PREVIEW & CONFIRM */
            <div className="space-y-5">
              {planProposal && (
                <>
                  <div
                    className={`p-4 rounded-xl border flex items-start gap-3 ${
                      planProposal.riskLevel === 'critical'
                        ? 'bg-red-50 border-red-200 text-red-900'
                        : planProposal.riskLevel === 'high'
                        ? 'bg-orange-50 border-orange-200 text-orange-900'
                        : planProposal.riskLevel === 'medium'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        Diagnóstico Preventivo: {planProposal.riskLevel.toUpperCase()}
                      </h4>
                      <p className="text-xs mt-1 leading-relaxed">{planProposal.riskExplanation}</p>
                    </div>
                  </div>

                  {/* Scheduled stages editable list */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#5C4D44] uppercase tracking-wider">
                        Etapas Calculadas ({planProposal.stages.length})
                      </span>
                      <span className="text-[11px] text-[#8C7A70]">
                        Você pode ajustar os horários antes de confirmar
                      </span>
                    </div>

                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {planProposal.stages.map((stage, idx) => {
                        const cfg = STAGE_TYPE_CONFIG[stage.type] || {
                          label: stage.title,
                          badgeBg: 'bg-stone-100',
                          text: 'text-stone-700'
                        };
                        return (
                          <div
                            key={stage.id || idx}
                            className="p-3 rounded-xl border border-[#EDE4DA] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs"
                          >
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#231815]">{stage.title}</span>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded font-medium ${cfg.badgeBg} ${cfg.text}`}
                                >
                                  {cfg.label}
                                </span>
                                {stage.assignee && (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#FAF7F2] text-[#6A3102] font-semibold border border-[#EDE4DA]">
                                    {stage.assignee}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#73645B] truncate">{stage.notes}</p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <input
                                type="date"
                                value={stage.date}
                                onChange={(e) => handleStageChange(idx, 'date', e.target.value)}
                                className="px-2 py-1 border border-[#EDE4DA] rounded text-xs bg-[#FAF7F2]"
                              />
                              <input
                                type="time"
                                value={stage.startTime}
                                onChange={(e) => handleStageChange(idx, 'startTime', e.target.value)}
                                className="px-2 py-1 border border-[#EDE4DA] rounded text-xs bg-[#FAF7F2]"
                              />
                              <span>até</span>
                              <input
                                type="time"
                                value={stage.endTime}
                                onChange={(e) => handleStageChange(idx, 'endTime', e.target.value)}
                                className="px-2 py-1 border border-[#EDE4DA] rounded text-xs bg-[#FAF7F2]"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#EDE4DA] bg-[#FAF7F2] text-xs">
          {activeStep === 'preview' ? (
            <>
              <button
                type="button"
                onClick={() => setActiveStep('form')}
                className="px-3.5 py-2 text-xs font-semibold text-[#73645B] hover:text-[#231815] rounded-lg"
              >
                Voltar e Ajustar
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#6A3102] hover:bg-[#542601] rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar & Salvar Demanda</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs text-[#73645B] hover:text-[#231815]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="task-form"
                className="px-5 py-2 text-xs font-semibold text-white bg-[#6A3102] hover:bg-[#542601] rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>Avançar para o Cronograma</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
