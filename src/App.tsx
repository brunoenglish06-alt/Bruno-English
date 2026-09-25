import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { User } from 'firebase/auth';
import { Task, UserSettings, TaskStatus, RiskLevel, WorkGroup, WorkGroupMember, SubTask, Deliverable } from './types';
import {
  loadTasks,
  saveTasks,
  loadSettings,
  saveSettings,
  addAuditLog,
  deduplicateTasks
} from './utils/storage';
import { getTodayISO, getDiffInDays } from './utils/dateUtils';
import { calculateDeliverablesProgress } from './utils/deliverableUtils';
import { initAuth, googleSignIn, logout, getCurrentUser } from './services/firebaseAuth';
import { syncTaskToGoogleCalendar, deleteTaskEventsFromGoogleCalendar } from './services/googleCalendar';
import {
  subscribeWorkgroups,
  saveWorkgroupToFirestore,
  deleteWorkgroupFromFirestore,
  subscribeTasks,
  syncTaskToFirestore,
  deleteTaskFromFirestore,
  getActiveGroupId,
  setActiveGroupId,
  loadCachedWorkgroups,
  testFirestoreConnection
} from './services/firestoreService';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { TodayPlanner } from './components/TodayPlanner';
import { CalendarView } from './components/CalendarView';
import { ApprovalsView } from './components/ApprovalsView';
import { TeamView } from './components/TeamView';
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
    'dashboard' | 'today' | 'calendar' | 'approvals' | 'team' | 'assistant'
  >('dashboard');

  // Workgroups state
  const [workgroups, setWorkgroups] = useState<WorkGroup[]>(() => loadCachedWorkgroups());
  const [activeGroupId, setActiveGroupIdState] = useState<string>(() => getActiveGroupId());
  const [dashboardMemberFilter, setDashboardMemberFilter] = useState<string>('all');

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

  // Real-time Firestore subscriptions for Workgroups and Tasks
  useEffect(() => {
    testFirestoreConnection();

    const unsubGroups = subscribeWorkgroups((groups) => {
      if (groups && groups.length > 0) {
        setWorkgroups(groups);
      }
    });

    const unsubTasks = subscribeTasks(activeGroupId, (serverTasks) => {
      if (serverTasks && serverTasks.length > 0) {
        setTasks((prev) => {
          // Merge server tasks with local tasks by ID
          const map = new Map<string, Task>();
          for (const t of prev) {
            if (t && t.id) map.set(t.id, t);
          }
          for (const st of serverTasks) {
            if (st && st.id) map.set(st.id, st);
          }
          const merged = Array.from(map.values());
          saveTasks(merged);
          return merged;
        });
      }
    });

    return () => {
      if (typeof unsubGroups === 'function') unsubGroups();
      if (typeof unsubTasks === 'function') unsubTasks();
    };
  }, [activeGroupId]);

  // Keep localStorage tasks in sync
  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

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
      const unique = deduplicateTasks(updated);
      setTasks(unique);
      setSelectedTask(updatedTask);
      syncTaskToFirestore(updatedTask).catch(() => {});
      addAuditLog(
        'Google Calendar',
        `${syncedStagesCount} etapa(s) da demanda "${task.title}" sincronizadas na agenda Google.`,
        task.id,
        task.title
      );
    } catch (err: any) {
      console.error('Erro na sincronização:', err);
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  // Trigger celebration on task completion
  const triggerDeliveryCelebration = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  // Calculate Overall Risk Level
  const overallRisk = useMemo<RiskLevel>(() => {
    const today = getTodayISO();
    const activeTasks = tasks.filter((t) => t.status !== 'delivered' && t.status !== 'finalized');
    if (activeTasks.length === 0) return 'low';

    const hasOverdue = activeTasks.some((t) => getDiffInDays(today, t.deadlineDate) < 0);
    if (hasOverdue) return 'critical';

    const hasCritical = activeTasks.some((t) => t.riskLevel === 'critical');
    if (hasCritical) return 'critical';

    const hasHigh = activeTasks.some((t) => t.riskLevel === 'high');
    if (hasHigh) return 'high';

    const hasMedium = activeTasks.some((t) => t.riskLevel === 'medium');
    if (hasMedium) return 'medium';

    return 'low';
  }, [tasks]);

  // Counts for Badges
  const todayTasksCount = useMemo(() => {
    const today = getTodayISO();
    return tasks.filter((t) => {
      if (t.status === 'delivered' || t.status === 'finalized') return false;
      return t.stages.some((s) => s.date === today && !s.completed) || t.deadlineDate === today;
    }).length;
  }, [tasks]);

  const pendingApprovalsCount = useMemo(() => {
    return tasks.filter(
      (t) => t.status === 'awaiting_approval' || t.status === 'sent_for_approval'
    ).length;
  }, [tasks]);

  // Active group
  const activeGroup = useMemo(() => {
    return workgroups.find((g) => g.id === activeGroupId) || workgroups[0];
  }, [workgroups, activeGroupId]);

  // Handler: Change active group
  const handleSelectGroup = (groupId: string) => {
    setActiveGroupIdState(groupId);
    setActiveGroupId(groupId);
  };

  // Handler: Create WorkGroup
  const handleCreateGroup = async (name: string, description: string) => {
    const newGroup: WorkGroup = {
      id: 'group-' + Date.now(),
      name,
      description,
      adminId: googleUser?.uid || 'user-admin',
      createdAt: new Date().toISOString(),
      members: [
        {
          id: 'member-' + Date.now(),
          name: googleUser?.displayName || 'Administrador',
          email: googleUser?.email || 'admin@equipe.com',
          role: 'admin',
          specialty: 'Gestão Criativa'
        }
      ]
    };
    await saveWorkgroupToFirestore(newGroup);
    setWorkgroups((prev) => [...prev, newGroup]);
    setActiveGroupIdState(newGroup.id);
    setActiveGroupId(newGroup.id);
    addAuditLog('Grupo de Trabalho', `Novo grupo "${name}" criado.`);
  };

  // Handler: Add Member to WorkGroup
  const handleAddMember = async (groupId: string, member: WorkGroupMember) => {
    const targetGroup = workgroups.find((g) => g.id === groupId);
    if (!targetGroup) return;
    const updatedGroup: WorkGroup = {
      ...targetGroup,
      members: [...targetGroup.members, member]
    };
    await saveWorkgroupToFirestore(updatedGroup);
    setWorkgroups((prev) => prev.map((g) => (g.id === groupId ? updatedGroup : g)));
    addAuditLog('Equipe', `Integrante "${member.name}" (${member.specialty}) adicionado ao grupo.`);
  };

  // Handler: Remove Member from WorkGroup
  const handleRemoveMember = async (groupId: string, memberId: string) => {
    const targetGroup = workgroups.find((g) => g.id === groupId);
    if (!targetGroup) return;
    const updatedGroup: WorkGroup = {
      ...targetGroup,
      members: targetGroup.members.filter((m) => m.id !== memberId)
    };
    await saveWorkgroupToFirestore(updatedGroup);
    setWorkgroups((prev) => prev.map((g) => (g.id === groupId ? updatedGroup : g)));
    addAuditLog('Equipe', 'Integrante removido do grupo.');
  };

  // Handler: Filter in Dashboard by Member
  const handleFilterByMember = (memberName: string) => {
    setDashboardMemberFilter(memberName);
    setCurrentTab('dashboard');
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
    syncTaskToFirestore(newTask).catch(() => {});

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
      deleteTaskFromFirestore(taskId).catch(() => {});
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

        if (isNowDelivered) {
          updated.stages = updated.stages.map((s) => ({ ...s, completed: true }));
        }

        syncTaskToFirestore(updated).catch(() => {});

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

        syncTaskToFirestore(updatedTask).catch(() => {});

        if (selectedTask?.id === taskId) {
          setSelectedTask(updatedTask);
        }

        return updatedTask;
      })
    );
  };

  // Handler: Update deliverables
  const handleUpdateTaskDeliverables = (taskId: string, deliverables: Deliverable[]) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;

        const summary = calculateDeliverablesProgress(deliverables);
        let newStatus = task.status;

        // If all deliverables are completed, advance task to finalized (unless already delivered)
        if (summary.allCompleted && task.status !== 'delivered') {
          newStatus = 'finalized';
          triggerDeliveryCelebration();
        } else if (summary.inProduction > 0 && task.status === 'todo') {
          newStatus = 'in_production';
        } else if (summary.awaitingApproval > 0 && (task.status === 'in_production' || task.status === 'in_review')) {
          newStatus = 'awaiting_approval';
        }

        const updated: Task = {
          ...task,
          deliverables,
          status: newStatus,
          updatedAt: new Date().toISOString()
        };

        syncTaskToFirestore(updated).catch(() => {});
        if (selectedTask?.id === taskId) {
          setSelectedTask(updated);
        }
        addAuditLog(
          'Entregáveis',
          `Entregáveis da demanda "${task.title}" atualizados (${summary.summaryText}).`,
          task.id,
          task.title
        );
        return updated;
      })
    );
  };

  // Handler: Update subtasks
  const handleUpdateTaskSubtasks = (taskId: string, subtasks: SubTask[]) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const updated = {
          ...task,
          subtasks,
          updatedAt: new Date().toISOString()
        };
        syncTaskToFirestore(updated).catch(() => {});
        if (selectedTask?.id === taskId) {
          setSelectedTask(updated);
        }
        return updated;
      })
    );
  };

  // Handler: Add comment
  const handleAddComment = (taskId: string, commentText: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const newComment = {
          id: 'comment-' + Date.now(),
          author: googleUser?.displayName || 'Bruno Designer',
          content: commentText,
          createdAt: new Date().toISOString()
        };
        const updated = {
          ...task,
          comments: [...(task.comments || []), newComment],
          updatedAt: new Date().toISOString()
        };
        syncTaskToFirestore(updated).catch(() => {});
        if (selectedTask?.id === taskId) {
          setSelectedTask(updated);
        }
        return updated;
      })
    );
  };

  // Handler: Apply reschedule
  const handleApplyReschedule = (updatedTask: Task) => {
    setTasks((prev) => deduplicateTasks(prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))));
    syncTaskToFirestore(updatedTask).catch(() => {});
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
        activeGroupName={activeGroup?.name}
        teamMembersCount={activeGroup?.members.length}
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
            onUpdateTaskDeliverables={handleUpdateTaskDeliverables}
            onNavigateToToday={() => setCurrentTab('today')}
            onNavigateToApprovals={() => setCurrentTab('approvals')}
            onNavigateToTeam={() => setCurrentTab('team')}
            initialMemberFilter={dashboardMemberFilter}
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

        {/* ÁREA DE EQUIPE (Requirement 5) */}
        {currentTab === 'team' && (
          <TeamView
            tasks={tasks}
            workgroups={workgroups}
            activeGroupId={activeGroupId}
            onSelectGroup={handleSelectGroup}
            onCreateGroup={handleCreateGroup}
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
            onSelectTask={(task) => setSelectedTask(task)}
            onFilterByMember={handleFilterByMember}
            onOpenNewTask={() => {
              setTaskToEdit(null);
              setIsTaskModalOpen(true);
            }}
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
        onUpdateTaskDeliverables={handleUpdateTaskDeliverables}
        onUpdateTaskSubtasks={handleUpdateTaskSubtasks}
        onAddComment={handleAddComment}
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
