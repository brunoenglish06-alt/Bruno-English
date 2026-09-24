import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { User } from 'firebase/auth';
import { Task, UserSettings, TaskStatus, RiskLevel } from './types';
import {
  loadTasks,
  saveTasks,
  loadSettings,
  saveSettings,
  addAuditLog,
  deduplicateTasks
} from './utils/storage';
import { getTodayISO, getDiffInDays } from './utils/dateUtils';
import { initAuth, googleSignIn, logout, getCurrentUser } from './services/firebaseAuth';
import { syncTaskToGoogleCalendar, deleteTaskEventsFromGoogleCalendar } from './services/googleCalendar';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { TodayPlanner } from './components/TodayPlanner';
import { CalendarView } from './components/CalendarView';
import { ApprovalsView } from './components/ApprovalsView';
import { ProductionAssistant } from './components/ProductionAssistant';
import { TaskModal } from './components/TaskModal';
import { TaskDetailModal } from './components/TaskDetailModal';
import { RescheduleModal } from './components/RescheduleModal';
import { SettingsModal } from './components/SettingsModal';
import { GoogleCalendarModal } from './components/GoogleCalendarModal';
import { GoogleCalendarConfirmModal } from './components/GoogleCalendarConfirmModal';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings());
  const [currentTab, setCurrentTab] = useState<
    'dashboard' | 'today' | 'calendar' | 'approvals' | 'assistant'
  >('dashboard');

  // Google Calendar & Auth state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isGoogleCalendarModalOpen, setIsGoogleCalendarModalOpen] = useState(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);

  // Destructive Confirmation Modal state
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionLabel?: string;
    itemCount?: number;
    itemsList?: string[];
    isDestructive?: boolean;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: async () => {}
  });

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [rescheduleTaskTarget, setRescheduleTaskTarget] = useState<Task | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        const current = getCurrentUser();
        if (current) {
          setGoogleUser(current);
        } else {
          setGoogleUser(null);
          setGoogleToken(null);
        }
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Google Sign In handler
  const handleGoogleSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        addAuditLog(
          'Google Calendar',
          `Conta conectada com sucesso (${res.user.email}).`
        );
      }
    } catch (err: any) {
      console.error('Falha no login Google:', err);
    }
  };

  // Google Sign Out handler
  const handleGoogleSignOut = async () => {
    try {
      await logout();
      setGoogleUser(null);
      setGoogleToken(null);
      addAuditLog('Google Calendar', 'Conta Google desconectada.');
    } catch (err) {
      console.error('Falha ao desconectar conta Google:', err);
    }
  };

  // Sync single task to Google Calendar
  const handleSyncSingleTaskToGoogle = async (task: Task) => {
    let token = googleToken;
    if (!token) {
      // Prompt user to connect first
      const res = await googleSignIn();
      if (!res) return;
      token = res.accessToken;
      setGoogleUser(res.user);
      setGoogleToken(res.accessToken);
    }

    setIsSyncingCalendar(true);
    try {
      const { updatedTask, syncedStagesCount } = await syncTaskToGoogleCalendar(task, token);
      const cleanList = deduplicateTasks(tasks);
      const idx = cleanList.findIndex((t) => t.id === updatedTask.id);
      let updated: Task[];
      if (idx >= 0) {
        updated = [...cleanList];
        updated[idx] = updatedTask;
      } else {
        updated = [updatedTask, ...cleanList];
      }
      setTasks(deduplicateTasks(updated));
      setSelectedTask(updatedTask);
      addAuditLog(
        'Google Calendar',
        `${syncedStagesCount} etapa(s) da demanda "${task.title}" sincronizadas na agenda Google.`,
        task.id,
        task.title
      );
    } catch (err: any) {
      console.error('Erro ao sincronizar com Google Calendar:', err);
      alert(err?.message || 'Falha ao sincronizar com o Google Calendar.');
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  // Sync tasks to local storage whenever tasks state updates
  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  // Overall risk calculation across all active tasks
  const overallRisk: RiskLevel = useMemo(() => {
    const activeTasks = tasks.filter((t) => t.status !== 'delivered' && t.status !== 'finalized');
    if (activeTasks.some((t) => t.riskLevel === 'critical')) return 'critical';
    if (activeTasks.some((t) => t.riskLevel === 'high')) return 'high';
    if (activeTasks.some((t) => t.riskLevel === 'medium')) return 'medium';
    return 'low';
  }, [tasks]);

  // Counts for navigation badges
  const today = getTodayISO();
  const todayTasksCount = useMemo(() => {
    return tasks.filter((t) =>
      t.stages.some((s) => s.date === today && !s.completed)
    ).length;
  }, [tasks, today]);

  const pendingApprovalsCount = useMemo(() => {
    return tasks.filter(
      (t) => t.status === 'awaiting_approval' || t.status === 'sent_for_approval'
    ).length;
  }, [tasks]);

  // Confetti celebration helper
  const triggerDeliveryCelebration = () => {
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#6a3102', '#b45309', '#16a34a', '#f59e0b']
      });
    } catch {
      // ignore
    }
  };

  // Handler: Save or Update Task
  const handleSaveTask = (newTask: Task) => {
    const cleanList = deduplicateTasks(tasks);
    const existingIndex = cleanList.findIndex((t) => t.id === newTask.id);
    let updated: Task[];

    if (existingIndex >= 0) {
      updated = [...cleanList];
      updated[existingIndex] = newTask;
      addAuditLog('Edição', `Demanda "${newTask.title}" atualizada.`, newTask.id, newTask.title);
    } else {
      updated = [newTask, ...cleanList];
      addAuditLog('Criação', `Nova demanda "${newTask.title}" planejada.`, newTask.id, newTask.title);
    }

    const uniqueUpdated = deduplicateTasks(updated);
    setTasks(uniqueUpdated);
    if (selectedTask?.id === newTask.id) {
      setSelectedTask(newTask);
    }
  };

  // Handler: Delete Task
  const handleDeleteTask = (taskId: string) => {
    const cleanList = deduplicateTasks(tasks);
    const target = cleanList.find((t) => t.id === taskId);
    if (confirm(`Deseja realmente excluir a demanda "${target?.title || ''}"?`)) {
      const updated = deduplicateTasks(cleanList.filter((t) => t.id !== taskId));
      setTasks(updated);
      setSelectedTask(null);
      addAuditLog('Exclusão', `Demanda "${target?.title}" removida.`, taskId, target?.title);
    }
  };

  // Handler: Update status
  const handleUpdateStatus = (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;

        const isNowDelivered = newStatus === 'delivered' || newStatus === 'finalized';
        if (isNowDelivered) {
          triggerDeliveryCelebration();
        }

        const updated: Task = {
          ...t,
          status: newStatus,
          deliveredAt: isNowDelivered ? new Date().toISOString() : t.deliveredAt,
          updatedAt: new Date().toISOString()
        };

        // If delivered, mark all stages completed
        if (isNowDelivered) {
          updated.stages = updated.stages.map((s) => ({ ...s, completed: true }));
        }

        addAuditLog(
          'Mudança de Status',
          `Status alterado para "${newStatus}".`,
          t.id,
          t.title
        );

        if (selectedTask?.id === taskId) {
          setSelectedTask(updated);
        }

        return updated;
      })
    );
  };

  // Handler: Toggle individual stage completed
  const handleToggleStageCompleted = (taskId: string, stageId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;

        const updatedStages = task.stages.map((s) =>
          s.id === stageId ? { ...s, completed: !s.completed } : s
        );

        // Check if all stages are now completed
        const allDone = updatedStages.every((s) => s.completed);
        let newStatus = task.status;
        if (allDone && task.status !== 'delivered') {
          newStatus = 'finalized';
          triggerDeliveryCelebration();
        }

        const updatedTask = {
          ...task,
          stages: updatedStages,
          status: newStatus,
          updatedAt: new Date().toISOString()
        };

        if (selectedTask?.id === taskId) {
          setSelectedTask(updatedTask);
        }

        return updatedTask;
      })
    );
  };

  // Handler: Apply reschedule
  const handleApplyReschedule = (updatedTask: Task) => {
    setTasks((prev) => deduplicateTasks(prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))));
    addAuditLog(
      'Replanejamento',
      `Demanda "${updatedTask.title}" replanejada automaticamente.`,
      updatedTask.id,
      updatedTask.title
    );
    if (selectedTask?.id === updatedTask.id) {
      setSelectedTask(updatedTask);
    }
  };

  // Handler: Reload data on reset
  const handleDataReset = () => {
    setTasks(deduplicateTasks(loadTasks()));
    setSettings(loadSettings());
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col selection:bg-[#6A3102]/15 selection:text-[#6A3102]">
      {/* Navigation Header */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenNewTask={() => {
          setTaskToEdit(null);
          setIsTaskModalOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenGoogleCalendar={() => setIsGoogleCalendarModalOpen(true)}
        isGoogleConnected={!!googleToken}
        overallRisk={overallRisk}
        pendingApprovalsCount={pendingApprovalsCount}
        todayTasksCount={todayTasksCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <Dashboard
            tasks={tasks}
            settings={settings}
            overallRisk={overallRisk}
            onSelectTask={(task) => setSelectedTask(task)}
            onOpenNewTask={() => {
              setTaskToEdit(null);
              setIsTaskModalOpen(true);
            }}
            onOpenReschedule={(task) => setRescheduleTaskTarget(task)}
            onUpdateStatus={handleUpdateStatus}
            onToggleStageCompleted={handleToggleStageCompleted}
            onNavigateToToday={() => setCurrentTab('today')}
            onNavigateToApprovals={() => setCurrentTab('approvals')}
          />
        )}

        {currentTab === 'today' && (
          <TodayPlanner
            tasks={tasks}
            settings={settings}
            onToggleStageCompleted={handleToggleStageCompleted}
            onOpenReschedule={(task) => setRescheduleTaskTarget(task)}
            onSelectTask={(task) => setSelectedTask(task)}
            onOpenGoogleCalendar={() => setIsGoogleCalendarModalOpen(true)}
            isGoogleConnected={!!googleToken}
          />
        )}

        {currentTab === 'calendar' && (
          <CalendarView
            tasks={tasks}
            onSelectTask={(task) => setSelectedTask(task)}
            onOpenGoogleCalendar={() => setIsGoogleCalendarModalOpen(true)}
            isGoogleConnected={!!googleToken}
          />
        )}

        {currentTab === 'approvals' && (
          <ApprovalsView
            tasks={tasks}
            onUpdateStatus={handleUpdateStatus}
            onSelectTask={(task) => setSelectedTask(task)}
            onOpenReschedule={(task) => setRescheduleTaskTarget(task)}
          />
        )}

        {currentTab === 'assistant' && (
          <ProductionAssistant
            tasks={tasks}
            settings={settings}
            overallRisk={overallRisk}
            onSelectTask={(task) => setSelectedTask(task)}
            onOpenNewTask={() => {
              setTaskToEdit(null);
              setIsTaskModalOpen(true);
            }}
          />
        )}
      </main>

      {/* Task Creation & Planning Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        onSaveTask={handleSaveTask}
        existingTasks={tasks}
        settings={settings}
        taskToEdit={taskToEdit}
      />

      {/* Task Details / Stage Timeline Modal */}
      <TaskDetailModal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        onToggleStageCompleted={handleToggleStageCompleted}
        onUpdateStatus={handleUpdateStatus}
        onOpenEdit={(task) => {
          setSelectedTask(null);
          setTaskToEdit(task);
          setIsTaskModalOpen(true);
        }}
        onOpenReschedule={(task) => {
          setSelectedTask(null);
          setRescheduleTaskTarget(task);
        }}
        onDeleteTask={handleDeleteTask}
        onSyncGoogleCalendar={handleSyncSingleTaskToGoogle}
        isGoogleConnected={!!googleToken}
        isSyncingCalendar={isSyncingCalendar}
      />

      {/* Rescheduling Modal */}
      <RescheduleModal
        isOpen={!!rescheduleTaskTarget}
        onClose={() => setRescheduleTaskTarget(null)}
        task={rescheduleTaskTarget}
        existingTasks={tasks}
        settings={settings}
        onApplyReschedule={handleApplyReschedule}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        onDataReset={handleDataReset}
        user={googleUser}
        accessToken={googleToken}
        onSignInGoogle={handleGoogleSignIn}
        onSignOutGoogle={handleGoogleSignOut}
        onOpenGoogleCalendarModal={() => setIsGoogleCalendarModalOpen(true)}
      />

      {/* Google Calendar Management & Sync Hub Modal */}
      <GoogleCalendarModal
        isOpen={isGoogleCalendarModalOpen}
        onClose={() => setIsGoogleCalendarModalOpen(false)}
        user={googleUser}
        accessToken={googleToken}
        onSignIn={handleGoogleSignIn}
        onSignOut={handleGoogleSignOut}
        tasks={tasks}
        onTasksUpdated={(updated) => setTasks(deduplicateTasks(updated))}
      />

      {/* Mandatory confirmation modal for workspace actions */}
      <GoogleCalendarConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        description={confirmModalState.description}
        actionLabel={confirmModalState.actionLabel}
        itemCount={confirmModalState.itemCount}
        itemsList={confirmModalState.itemsList}
        isDestructive={confirmModalState.isDestructive}
      />
    </div>
  );
}
