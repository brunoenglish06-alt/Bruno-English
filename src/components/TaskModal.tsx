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
  Info
} from 'lucide-react';
import {
  Task,
  TaskType,
  Priority,
  TaskStatus,
  SafetyMarginOption,
  TaskStage,
  UserSettings
} from '../types';
import { getTodayISO, addDays, formatHours, formatReadableDate } from '../utils/dateUtils';
import { generateProductionPlan, PlanProposal } from '../utils/scheduler';
import { STAGE_TYPE_CONFIG } from '../utils/statusConfig';

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

  // Form states
  const [title, setTitle] = useState(taskToEdit?.title || '');
  const [client, setClient] = useState(taskToEdit?.client || '');
  const [type, setType] = useState<TaskType>(taskToEdit?.type || 'design');
  const [description, setDescription] = useState(taskToEdit?.description || '');
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
  const [priority, setPriority] = useState<Priority>(taskToEdit?.priority || 'normal');
  const [assignee, setAssignee] = useState(taskToEdit?.assignee || 'Bruno Designer');
  const [status, setStatus] = useState<TaskStatus>(taskToEdit?.status || 'todo');
  const [safetyMargin, setSafetyMargin] = useState<SafetyMarginOption>(
    taskToEdit?.safetyMargin || settings.defaultSafetyMargin
  );
  const [customSafetyMarginHours, setCustomSafetyMarginHours] = useState(
    taskToEdit?.customSafetyMarginHours || 24
  );

  // Plan proposal preview state
  const [planProposal, setPlanProposal] = useState<PlanProposal | null>(
    taskToEdit ? {
      stages: taskToEdit.stages,
      riskLevel: taskToEdit.riskLevel,
      riskExplanation: taskToEdit.riskExplanation || '',
      recommendedStartDate: taskToEdit.stages[0]?.date || today,
      recommendedStartTime: taskToEdit.stages[0]?.startTime || '09:00',
      canMeetDeadline: true,
      conflictsFound: 0
    } : null
  );

  const [activeStep, setActiveStep] = useState<'form' | 'preview'>('form');

  // Reset form whenever modal opens or taskToEdit changes
  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        setTitle(taskToEdit.title || '');
        setClient(taskToEdit.client || '');
        setType(taskToEdit.type || 'design');
        setDescription(taskToEdit.description || '');
        setStartDate(taskToEdit.startDate || today);
        setDeadlineDate(taskToEdit.deadlineDate || addDays(today, 4));
        setDeadlineTime(taskToEdit.deadlineTime || '18:00');
        setRequiresApproval(taskToEdit.requiresApproval ?? true);
        setApprovalDeadlineDate(taskToEdit.approvalDeadlineDate || addDays(today, 2));
        setApprovalDeadlineTime(taskToEdit.approvalDeadlineTime || '12:00');
        setEstimatedProductionHours(taskToEdit.estimatedProductionHours || 2);
        setEstimatedAdjustmentHours(taskToEdit.estimatedAdjustmentHours || 1);
        setPriority(taskToEdit.priority || 'normal');
        setAssignee(taskToEdit.assignee || 'Bruno Designer');
        setStatus(taskToEdit.status || 'todo');
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
        setType('design');
        setDescription('');
        setStartDate(today);
        setDeadlineDate(addDays(today, 4));
        setDeadlineTime('18:00');
        setRequiresApproval(true);
        setApprovalDeadlineDate(addDays(today, 2));
        setApprovalDeadlineTime('12:00');
        setEstimatedProductionHours(2);
        setEstimatedAdjustmentHours(1);
        setPriority('normal');
        setAssignee('Bruno Designer');
        setStatus('todo');
        setSafetyMargin(settings.defaultSafetyMargin);
        setCustomSafetyMarginHours(24);
        setPlanProposal(null);
      }
      setActiveStep('form');
    }
  }, [isOpen, taskToEdit, settings.defaultSafetyMargin]);

  if (!isOpen) return null;

  const handlePlanTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !client.trim()) return;

    const draft: Partial<Task> = {
      id: taskToEdit?.id || 'task-' + Date.now(),
      title,
      client,
      type,
      description,
      startDate,
      deadlineDate,
      deadlineTime,
      requiresApproval,
      approvalDeadlineDate: requiresApproval ? approvalDeadlineDate : undefined,
      approvalDeadlineTime: requiresApproval ? approvalDeadlineTime : undefined,
      estimatedProductionHours: Number(estimatedProductionHours),
      estimatedAdjustmentHours: Number(estimatedAdjustmentHours),
      priority,
      assignee,
      status,
      safetyMargin,
      customSafetyMarginHours: safetyMargin === 'custom' ? Number(customSafetyMarginHours) : undefined
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

    const finalTask: Task = {
      id: taskToEdit?.id || 'task-' + Date.now(),
      title: title.trim(),
      client: client.trim(),
      type,
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
      riskLevel: planProposal.riskLevel,
      riskExplanation: planProposal.riskExplanation,
      createdAt: taskToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveTask(finalTask);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-[#EDE4DA] w-full max-w-3xl max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE4DA] bg-[#FAF7F2]">
          <div>
            <h2 className="text-lg font-bold text-[#231815] font-display">
              {taskToEdit ? 'Editar Demanda Criativa' : 'Cadastrar Nova Demanda'}
            </h2>
            <p className="text-xs text-[#73645B] mt-0.5">
              O sistema calculará as etapas de trás para frente para evitar sobrecargas de última hora.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#73645B] hover:text-[#231815] p-1.5 rounded-lg hover:bg-[#EDE4DA] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper tabs */}
        <div className="flex border-b border-[#EDE4DA] px-6 bg-white">
          <button
            type="button"
            onClick={() => setActiveStep('form')}
            className={`py-3 text-xs font-semibold uppercase tracking-wider border-b-2 mr-6 transition-colors flex items-center gap-1.5 ${
              activeStep === 'form'
                ? 'border-[#6A3102] text-[#6A3102]'
                : 'border-transparent text-[#73645B] hover:text-[#231815]'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-[#6A3102]/15 text-[#6A3102] text-[10px] flex items-center justify-center font-mono font-bold">
              1
            </span>
            <span>1. Informações da Demanda</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              if (planProposal) setActiveStep('preview');
              else handlePlanTask(e as any);
            }}
            className={`py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 ${
              activeStep === 'preview'
                ? 'border-[#6A3102] text-[#6A3102]'
                : 'border-transparent text-[#73645B] hover:text-[#231815]'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-[#6A3102]/15 text-[#6A3102] text-[10px] flex items-center justify-center font-mono font-bold">
              2
            </span>
            <span>2. Cronograma & Planejamento Inteligente</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 text-[#231815]">
          {activeStep === 'form' ? (
            <form id="task-form" onSubmit={handlePlanTask} className="space-y-5">
              {/* Row 1: Title & Client */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                    Nome da tarefa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Identidade Visual / Edição de Vídeo"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#EDE4DA] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6A3102] focus:border-[#6A3102] bg-white placeholder:text-[#A89C94]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                    Cliente ou Projeto <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Nome da Marca ou Cliente"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#EDE4DA] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6A3102] focus:border-[#6A3102] bg-white placeholder:text-[#A89C94]"
                  />
                </div>
              </div>

              {/* Row 2: Type & Priority & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                    Tipo de Tarefa
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as TaskType)}
                    className="w-full px-3 py-2 text-sm border border-[#EDE4DA] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6A3102] focus:border-[#6A3102] bg-white"
                  >
                    <option value="design">Design</option>
                    <option value="video">Vídeo</option>
                    <option value="social_media">Social Media</option>
                    <option value="photo">Fotografia</option>
                    <option value="publishing">Publicação</option>
                    <option value="other">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                    Prioridade
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full px-3 py-2 text-sm border border-[#EDE4DA] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6A3102] focus:border-[#6A3102] bg-white font-medium"
                  >
                    <option value="low">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente (Prioridade máxima)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                    Status Inicial
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 text-sm border border-[#EDE4DA] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6A3102] focus:border-[#6A3102] bg-white"
                  >
                    <option value="todo">A fazer</option>
                    <option value="in_production">Em produção</option>
                    <option value="in_review">Em revisão</option>
                    <option value="sent_for_approval">Enviado para aprovação</option>
                    <option value="awaiting_approval">Aguardando aprovação</option>
                    <option value="in_adjustments">Em ajustes</option>
                    <option value="approved">Aprovado</option>
                    <option value="finalized">Finalizado</option>
                    <option value="delivered">Entregue</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Prazo final de entrega & Início */}
              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#EDE4DA]">
                <h3 className="text-xs font-bold text-[#6A3102] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Prazos & Tempo de Produção</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                      Data de Início Desejada
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#EDE4DA] rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                      Prazo Final de Entrega <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={deadlineDate}
                      onChange={(e) => setDeadlineDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#EDE4DA] rounded-lg bg-white font-medium text-[#231815]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                      Horário Limite da Entrega
                    </label>
                    <input
                      type="time"
                      value={deadlineTime}
                      onChange={(e) => setDeadlineTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#EDE4DA] rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                      Tempo Estimado para Produção (horas)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0.25"
                        step="0.25"
                        value={estimatedProductionHours}
                        onChange={(e) => setEstimatedProductionHours(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-[#EDE4DA] rounded-lg bg-white font-mono"
                      />
                      <span className="text-xs text-[#73645B] whitespace-nowrap">
                        = {formatHours(estimatedProductionHours)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                      Tempo Estimado para Ajustes (horas)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0.25"
                        step="0.25"
                        value={estimatedAdjustmentHours}
                        onChange={(e) => setEstimatedAdjustmentHours(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-[#EDE4DA] rounded-lg bg-white font-mono"
                      />
                      <span className="text-xs text-[#73645B] whitespace-nowrap">
                        = {formatHours(estimatedAdjustmentHours)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 4: Approval requirement toggle */}
              <div className="p-4 rounded-xl border border-[#EDE4DA] bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-[#231815] block cursor-pointer">
                      Precisa de aprovação antes da entrega?
                    </label>
                    <p className="text-xs text-[#73645B] mt-0.5">
                      O sistema criará obrigatoriamente a etapa de aprovação e tempo de ajustes antes do prazo final.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRequiresApproval(!requiresApproval)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      requiresApproval ? 'bg-[#6A3102]' : 'bg-[#D6CBC1]'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        requiresApproval ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {requiresApproval && (
                  <div className="mt-4 pt-3 border-t border-[#EDE4DA] grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                        Data Limite para Aprovação do Cliente
                      </label>
                      <input
                        type="date"
                        value={approvalDeadlineDate}
                        onChange={(e) => setApprovalDeadlineDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-[#EDE4DA] rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                        Horário de Retorno Esperado
                      </label>
                      <input
                        type="time"
                        value={approvalDeadlineTime}
                        onChange={(e) => setApprovalDeadlineTime(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-[#EDE4DA] rounded-lg bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Row 5: Margem de Segurança & Responsável */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                    Margem de Segurança
                  </label>
                  <select
                    value={safetyMargin}
                    onChange={(e) => setSafetyMargin(e.target.value as SafetyMarginOption)}
                    className="w-full px-3 py-2 text-sm border border-[#EDE4DA] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6A3102] focus:border-[#6A3102] bg-white"
                  >
                    <option value="1_day">1 dia de folga antes do prazo (Recomendado)</option>
                    <option value="2_days">2 dias de folga (Alta segurança)</option>
                    <option value="3_days">3 dias de folga</option>
                    <option value="none">Sem margem (Entrega direta no dia)</option>
                    <option value="custom">Personalizado (horas)</option>
                  </select>

                  {safetyMargin === 'custom' && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        value={customSafetyMarginHours}
                        onChange={(e) => setCustomSafetyMarginHours(Number(e.target.value))}
                        className="w-24 px-2 py-1 text-sm border border-[#EDE4DA] rounded-md font-mono"
                      />
                      <span className="text-xs text-[#73645B]">horas de folga</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                    Responsável
                  </label>
                  <input
                    type="text"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    placeholder="Nome do designer ou editor"
                    className="w-full px-3 py-2 text-sm border border-[#EDE4DA] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6A3102] focus:border-[#6A3102] bg-white"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-[#5C4D44] mb-1">
                  Descrição / Orientações do Briefing
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instruções de formato, proporções (16:9 / 9:16), arquivos de apoio..."
                  className="w-full px-3 py-2 text-sm border border-[#EDE4DA] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6A3102] focus:border-[#6A3102] bg-white placeholder:text-[#A89C94]"
                />
              </div>

              {/* Main Planning Action Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-[#6A3102] hover:bg-[#542601] text-white font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm cursor-pointer group"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
                  <span>PLANEJAR MINHA TAREFA</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </button>
                <p className="text-center text-[11px] text-[#8C7A70] mt-2">
                  O algoritmo calculará os melhores dias e horários livres, preservando folgas antes do prazo final.
                </p>
              </div>
            </form>
          ) : (
            /* Step 2: Intelligent Proposal Review */
            <div className="space-y-5">
              {/* Proposal Header & Risk Alert */}
              <div
                className={`p-4 rounded-xl border ${
                  planProposal?.riskLevel === 'critical'
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : planProposal?.riskLevel === 'high'
                    ? 'bg-orange-50 border-orange-200 text-orange-900'
                    : planProposal?.riskLevel === 'medium'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">
                        Diagnóstico de Planejamento:{' '}
                        {planProposal?.riskLevel === 'low'
                          ? 'Cronograma Seguro'
                          : planProposal?.riskLevel === 'medium'
                          ? 'Atenção ao Início'
                          : planProposal?.riskLevel === 'high'
                          ? 'Risco de Atraso Alto'
                          : 'Risco Crítico'}
                      </span>
                    </div>
                    <p className="text-xs mt-1 leading-relaxed opacity-95">
                      {planProposal?.riskExplanation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary Banner */}
              <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#EDE4DA] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[#8C7A70] block">Demanda</span>
                  <span className="font-bold text-[#231815] text-sm">{title}</span>
                  <span className="text-[#8C7A70] ml-2">({client})</span>
                </div>
                <div>
                  <span className="text-[#8C7A70] block">Início Recomendado</span>
                  <span className="font-semibold text-[#6A3102] font-mono">
                    {formatReadableDate(planProposal?.recommendedStartDate || today)} às{' '}
                    {planProposal?.recommendedStartTime}
                  </span>
                </div>
                <div>
                  <span className="text-[#8C7A70] block">Entrega Final</span>
                  <span className="font-semibold text-[#231815] font-mono">
                    {formatReadableDate(deadlineDate)} até {deadlineTime}
                  </span>
                </div>
              </div>

              {/* Step Timeline */}
              <div>
                <h3 className="text-xs font-bold text-[#5C4D44] uppercase tracking-wider mb-3">
                  Cronograma de Produção Calculado de Trás para Frente
                </h3>

                <div className="space-y-3">
                  {planProposal?.stages.map((stage, idx) => {
                    const cfg = STAGE_TYPE_CONFIG[stage.type];
                    return (
                      <div
                        key={`proposal-stage-${stage.id || stage.type}-${stage.startTime}-${idx}`}
                        className="flex items-start gap-3 p-3.5 rounded-xl border border-[#EDE4DA] bg-white hover:border-[#D6CBC1] transition-all"
                      >
                        <div
                          className="w-3 h-3 rounded-full mt-1.5 shrink-0"
                          style={{ backgroundColor: cfg.color }}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-[#231815]">
                              {stage.title}
                            </span>
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded font-medium ${cfg.badgeBg} ${cfg.text}`}
                            >
                              {cfg.label}
                            </span>
                          </div>

                          <p className="text-xs text-[#73645B] mt-0.5">{stage.notes}</p>

                          {/* Editable time/date inputs */}
                          <div className="mt-2.5 flex items-center gap-3 flex-wrap text-xs text-[#5C4D44]">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-[#8C7A70]" />
                              <input
                                type="date"
                                value={stage.date}
                                onChange={(e) => handleStageChange(idx, 'date', e.target.value)}
                                className="px-2 py-1 text-xs border border-[#EDE4DA] rounded bg-[#FAF7F2] font-mono"
                              />
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#8C7A70]" />
                              <input
                                type="time"
                                value={stage.startTime}
                                onChange={(e) => handleStageChange(idx, 'startTime', e.target.value)}
                                className="px-2 py-1 text-xs border border-[#EDE4DA] rounded bg-[#FAF7F2] font-mono"
                              />
                              <span>até</span>
                              <input
                                type="time"
                                value={stage.endTime}
                                onChange={(e) => handleStageChange(idx, 'endTime', e.target.value)}
                                className="px-2 py-1 text-xs border border-[#EDE4DA] rounded bg-[#FAF7F2] font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-[#EDE4DA]">
                <button
                  type="button"
                  onClick={() => setActiveStep('form')}
                  className="px-4 py-2 text-xs font-semibold text-[#5C4D44] hover:text-[#231815] transition-colors"
                >
                  Voltar e Ajustar Dados
                </button>

                <button
                  type="button"
                  onClick={handleConfirmSave}
                  className="px-5 py-2.5 bg-[#6A3102] hover:bg-[#542601] text-white font-semibold rounded-lg text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Aceitar e Salvar Planejamento</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
