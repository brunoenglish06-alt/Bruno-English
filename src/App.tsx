import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { User } from 'firebase/auth';
import { Task, UserSettings, TaskStatus, RiskLevel, WorkGroup, WorkGroupMember, SubTask, Deliverable, RepeatTaskOptions } from './types';
import {
  loadTasks,
  saveTasks,
  loadSettings,
  saveSettings,
  addAuditLog,
  deduplicateTasks
} from './utils/storage';
import { getTodayISO, getDiffInDays } from './utils/dateUtils';
import { calculateDeliverablesProgress, createRepeatedTask } from './utils/deliverableUtils';
import { initAuth, googleSignIn, logout, getCurrentUser } from './services/firebaseAuth';
import { syncTaskToGoogleCalendar, deleteTaskEventsFromGoogleCalendar } from './services/googleCalendar';
import {
  subscribeWorkgroups,
  saveWorkgroupToFirestore,
  deleteWorkgroupFromFirestore,
  subscribeTasks,
  syncTaskToFirestore,
  syncBatchTasksToFirestore,
  deleteTaskFromFirestore,
  clearAllTasksFromServer,
  getActiveGroupId,
  setActiveGroupId,
  loadCachedWorkgroups,
  saveCachedWorkgroups,
  testFirestoreConnection,
  getCurrentMemberName,
  setCurrentMemberName,
  subscribePresence,
  subscribeRealtimeActivity,
  forceRealtimeSyncNow,
  isUserAuthorizedForGroup,
  getUserRoleInGroup,
  PresenceInfo,
  RealtimeActivityEvent
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
import { RepeatTaskModal } from './components/RepeatTaskModal';
import { SettingsModal } from './components/SettingsModal';
import { GoogleCalendarModal } from './components/GoogleCalendarModal';
import { GoogleCalendarConfirmModal } from './components/GoogleCalendarConfirmModal';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings());
  const [currentTab, setCurrentTab] = useState<
    'dashboard' | 'today' | 'calendar' | 'approvals' | 'team' | 'assistant'
  >('dashboard');

  // Workgroups & Real-time Presence state
  const [workgroups, setWorkgroups] = useState<WorkGroup[]>(() => loadCachedWorkgroups());
  const [activeGroupId, setActiveGroupIdState] = useState<string>(() => getActiveGroupId());
  const [dashboardMemberFilter, setDashboardMemberFilter] = useState<string>('all');
  const [currentMemberName, setCurrentMemberNameState] = useState<string>(() => getCurrentMemberName());
  const [presence, setPresence] = useState<PresenceInfo>({
    onlineCount: 1,
    onlineMembers: [],
    isConnected: true,
    syncStatus: 'syncing',
    syncErrorMessage: null,
    lastSyncedAt: null
  });
  const [liveToast, setLiveToast] = useState<RealtimeActivityEvent | null>(null);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);

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
  const [repeatTaskTarget, setRepeatTaskTarget] = useState<Task | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Real-time multi-user subscriptions (Workgroups, Tasks, Presence, Live Activity)
  useEffect(() => {
    testFirestoreConnection();

    const unsubGroups = subscribeWorkgroups((groups) => {
      if (Array.isArray(groups)) {
        setWorkgroups(groups);
      }
    });

    const unsubTasks = subscribeTasks((serverTasks) => {
      if (Array.isArray(serverTasks)) {
        const clean = deduplicateTasks(serverTasks);
        setTasks(clean);

        // Instantly update open task detail modal if another member modified or deleted it in real time
        setSelectedTask((current) => {
          if (!current) return null;
          const fresh = clean.find((t) => t.id === current.id);
          return fresh || null;
        });

        setRescheduleTaskTarget((current) => {
          if (!current) return null;
          const fresh = clean.find((t) => t.id === current.id);
          return fresh || null;
        });
      }
    });

    const unsubPresence = subscribePresence((info) => {
      setPresence(info);
    });

    const unsubActivity = subscribeRealtimeActivity((event) => {
      setLiveToast(event);
      addAuditLog('Sincronização Online', event.summary);
    });

    return () => {
      if (typeof unsubGroups === 'function') unsubGroups();
      if (typeof unsubTasks === 'function') unsubTasks();
      if (typeof unsubPresence === 'function') unsubPresence();
      if (typeof unsubActivity === 'function') unsubActivity();
    };
  }, []);

  // Auto-hide live activity toast after 4.5s
  useEffect(() => {
    if (!liveToast) return;
    const timer = setTimeout(() => {
      setLiveToast((prev) => (prev?.id === liveToast.id ? null : prev));
    }, 4500);
    return () => clearTimeout(timer);
  }, [liveToast]);

  // Keep activeGroupId valid if active group was deleted by another user
  useEffect(() => {
    if (workgroups.length > 0 && !workgroups.some((g) => g.id === activeGroupId)) {
      const fallbackId = workgroups[0].id;
      setActiveGroupIdState(fallbackId);
      setActiveGroupId(fallbackId);
    }
  }, [workgroups, activeGroupId]);

  const handleChangeMemberName = (name: string) => {
    setCurrentMemberNameState(name);
    setCurrentMemberName(name);
  };

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

  // Active group & Authorization (Requirement 6)
  const activeGroup = useMemo(() => {
    return workgroups.find((g) => g.id === activeGroupId) || workgroups[0];
  }, [workgroups, activeGroupId]);

  const isAuthorizedInActiveGroup = useMemo(() => {
    if (!activeGroup) return true;
    return isUserAuthorizedForGroup(
      activeGroup,
      googleUser?.email,
      currentMemberName,
      googleUser?.uid
    );
  }, [activeGroup, googleUser, currentMemberName]);

  const currentUserRole = useMemo(() => {
    return getUserRoleInGroup(
      activeGroup,
      googleUser?.email,
      currentMemberName,
      googleUser?.uid
    );
  }, [activeGroup, googleUser, currentMemberName]);

  // Scoped tasks for the active group (only accessible if user is authorized in the group)
  const visibleGroupTasks = useMemo(() => {
    if (!isAuthorizedInActiveGroup) return [];
    if (!activeGroup) return tasks;
    return tasks.filter(
      (t) => !t.groupId || t.groupId === activeGroup.id
    );
  }, [tasks, activeGroup, isAuthorizedInActiveGroup]);

  // Handler: Change active group
  const handleSelectGroup = (groupId: string) => {
    setActiveGroupIdState(groupId);
    setActiveGroupId(groupId);
  };

  // Handler: Create WorkGroup
  const handleCreateGroup = async (name: string, description: string) => {
    const now = new Date().toISOString();
    const newGroup: WorkGroup = {
      id: 'group-' + Date.now(),
      name,
      description,
      adminId: googleUser?.uid || 'user-admin',
      createdAt: now,
      updatedAt: now,
      members: [
        {
          id: 'member-' + Date.now(),
          name: googleUser?.displayName || 'Bruno',
          email: googleUser?.email || 'bruno.english06@gmail.com',
          role: 'admin',
          specialty: 'Gestão Criativa'
        }
      ]
    };
    setWorkgroups((prev) => [...prev, newGroup]);
    setActiveGroupIdState(newGroup.id);
    setActiveGroupId(newGroup.id);
    saveWorkgroupToFirestore(newGroup).catch(() => {});
    addAuditLog('Grupo de Trabalho', `Novo grupo "${name}" criado.`);
  };

  // Handler: Update WorkGroup (Name & Description)
  const handleUpdateGroup = async (groupId: string, name: string, description: string) => {
    setWorkgroups((prev) => {
      const target = prev.find((g) => g.id === groupId);
      if (!target) return prev;
      const updatedGroup: WorkGroup = {
        ...target,
        name: name.trim() || target.name,
        description: description.trim(),
        updatedAt: new Date().toISOString()
      };
      saveWorkgroupToFirestore(updatedGroup).catch(() => {});
      return prev.map((g) => (g.id === groupId ? updatedGroup : g));
    });
    addAuditLog('Grupo de Trabalho', `Grupo "${name}" atualizado.`);
  };

  // Handler: Delete WorkGroup
  const handleDeleteGroup = async (groupId: string, deleteAssociatedTasks: boolean = false) => {
    const targetGroup = workgroups.find((g) => g.id === groupId);
    const remainingGroups = workgroups.filter((g) => g.id !== groupId);
    const nextGroupId = remainingGroups[0]?.id || '';

    setWorkgroups(remainingGroups);
    if (activeGroupId === groupId) {
      setActiveGroupIdState(nextGroupId);
      setActiveGroupId(nextGroupId);
    }

    deleteWorkgroupFromFirestore(groupId, deleteAssociatedTasks, nextGroupId).catch(() => {});

    if (deleteAssociatedTasks) {
      setTasks((prev) => {
        const remainingTasks = prev.filter((t) => t.groupId !== groupId);
        saveTasks(remainingTasks);
        return remainingTasks;
      });
    } else {
      // Reassign tasks from the deleted group so no demands are lost
      setTasks((prev) => {
        let changed = false;
        const updated = prev.map((t) => {
          if (t.groupId === groupId) {
            changed = true;
            return {
              ...t,
              groupId: nextGroupId || undefined,
              updatedAt: new Date().toISOString()
            };
          }
          return t;
        });
        if (changed) saveTasks(updated);
        return updated;
      });
    }

    addAuditLog(
      'Grupo de Trabalho',
      `Grupo "${targetGroup?.name || groupId}" excluído.`
    );
  };

  // Handler: Add Member to WorkGroup
  const handleAddMember = async (groupId: string, member: WorkGroupMember) => {
    setWorkgroups((prev) => {
      const targetGroup = prev.find((g) => g.id === groupId) || prev[0];
      if (!targetGroup) return prev;
      // Avoid duplicate by exact name (case-insensitive)
      const exists = targetGroup.members.some(
        (m) => m.name.trim().toLowerCase() === member.name.trim().toLowerCase()
      );
      const updatedMembers = exists
        ? targetGroup.members.map((m) =>
            m.name.trim().toLowerCase() === member.name.trim().toLowerCase()
              ? { ...m, ...member, id: m.id }
              : m
          )
        : [...targetGroup.members, member];

      const updatedGroup: WorkGroup = {
        ...targetGroup,
        updatedAt: new Date().toISOString(),
        members: updatedMembers
      };
      saveWorkgroupToFirestore(updatedGroup).catch(() => {});
      return prev.map((g) => (g.id === targetGroup.id ? updatedGroup : g));
    });
    addAuditLog('Equipe', `Integrante "${member.name}" (${member.specialty}) adicionado ao grupo.`);
  };

  // Handler: Update Member in WorkGroup
  const handleUpdateMember = async (groupId: string, updatedMember: WorkGroupMember) => {
    setWorkgroups((prev) => {
      const targetGroup = prev.find((g) => g.id === groupId) || prev[0];
      if (!targetGroup) return prev;
      const updatedGroup: WorkGroup = {
        ...targetGroup,
        updatedAt: new Date().toISOString(),
        members: targetGroup.members.map((m) => (m.id === updatedMember.id ? updatedMember : m))
      };
      saveWorkgroupToFirestore(updatedGroup).catch(() => {});
      return prev.map((g) => (g.id === targetGroup.id ? updatedGroup : g));
    });
    addAuditLog('Equipe', `Dados de "${updatedMember.name}" atualizados.`);
  };

  // Handler: Remove Member from WorkGroup
  const handleRemoveMember = async (groupId: string, memberId: string) => {
    setWorkgroups((prev) => {
      const targetGroup = prev.find((g) => g.id === groupId) || prev[0];
      if (!targetGroup) return prev;
      const updatedGroup: WorkGroup = {
        ...targetGroup,
        updatedAt: new Date().toISOString(),
        members: targetGroup.members.filter((m) => m.id !== memberId)
      };
      saveWorkgroupToFirestore(updatedGroup).catch(() => {});
      return prev.map((g) => (g.id === targetGroup.id ? updatedGroup : g));
    });
    addAuditLog('Equipe', 'Integrante removido do grupo.');
  };

  // Handler: Update Task Team (Assignee & Collaborators)
  const handleUpdateTaskTeam = (taskId: string, assignee: string, collaborators: string[]) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const updatedTask: Task = {
          ...task,
          assignee,
          collaborators,
          updatedAt: new Date().toISOString()
        };
        syncTaskToFirestore(updatedTask).catch(() => {});
        if (selectedTask?.id === taskId) {
          setSelectedTask(updatedTask);
        }
        return updatedTask;
      })
    );
    addAuditLog('Equipe da Demanda', `Equipe da demanda atualizada (${[assignee, ...collaborators].filter(Boolean).join(', ')}).`, taskId);
  };

  // Handler: Filter in Dashboard by Member
  const handleFilterByMember = (memberName: string) => {
    setDashboardMemberFilter(memberName);
    setCurrentTab('dashboard');
  };

  // Handler: Save or Update Task (with Concurrent Edit Conflict Detection & Merge - Requirement 7)
  const handleSaveTask = (newTask: Task) => {
    if (!isAuthorizedInActiveGroup) return;
    const cleanList = deduplicateTasks(tasks);
    const existingIndex = cleanList.findIndex((t) => t.id === newTask.id);
    let finalTaskToSave: Task = {
      ...newTask,
      groupId: newTask.groupId || activeGroup?.id
    };
    let updated: Task[];

    if (existingIndex >= 0) {
      const currentInState = cleanList[existingIndex];
      // Check if another user updated this task while the modal was open
      if (
        currentInState.updatedBy &&
        currentInState.updatedBy !== currentMemberName &&
        currentInState.updatedAt > (taskToEdit?.updatedAt || '')
      ) {
        // Merge comments and subtasks added by the other user so nothing is overwritten silently
        const mergedCommentsMap = new Map<string, any>();
        for (const c of currentInState.comments || []) mergedCommentsMap.set(c.id, c);
        for (const c of newTask.comments || []) mergedCommentsMap.set(c.id, c);

        const mergedSubtasksMap = new Map<string, SubTask>();
        for (const s of currentInState.subtasks || []) mergedSubtasksMap.set(s.id, s);
        for (const s of newTask.subtasks || []) mergedSubtasksMap.set(s.id, s);

        finalTaskToSave = {
          ...finalTaskToSave,
          comments: Array.from(mergedCommentsMap.values()),
          subtasks: Array.from(mergedSubtasksMap.values()),
          history: currentInState.history || []
        };
        setConflictNotice(
          `Conflito de edição prevenido: ${currentInState.updatedBy} também alterou "${newTask.title}" recentemente. Comentários, subtarefas e histórico foram mesclados sem perda de dados.`
        );
        setTimeout(() => setConflictNotice(null), 7000);
      }

      updated = [...cleanList];
      updated[existingIndex] = finalTaskToSave;
      addAuditLog('Edição', `Demanda "${finalTaskToSave.title}" atualizada.`, finalTaskToSave.id, finalTaskToSave.title);
    } else {
      updated = [finalTaskToSave, ...cleanList];
      addAuditLog('Criação', `Nova demanda "${finalTaskToSave.title}" planejada.`, finalTaskToSave.id, finalTaskToSave.title);
    }

    const uniqueUpdated = deduplicateTasks(updated);
    setTasks(uniqueUpdated);
    syncTaskToFirestore(
      finalTaskToSave,
      existingIndex >= 0
        ? `${currentMemberName} editou a demanda "${finalTaskToSave.title}"`
        : `${currentMemberName} criou a demanda "${finalTaskToSave.title}"`
    ).catch(() => {});

    if (selectedTask?.id === finalTaskToSave.id) {
      setSelectedTask(finalTaskToSave);
    }
  };

  // Handler: Delete Task
  const handleDeleteTask = (taskId: string) => {
    const cleanList = deduplicateTasks(tasks);
    const target = cleanList.find((t) => t.id === taskId);
    const updated = deduplicateTasks(cleanList.filter((t) => t.id !== taskId));
    setTasks(updated);
    setSelectedTask(null);
    deleteTaskFromFirestore(taskId, target?.title).catch(() => {});
    addAuditLog('Exclusão', `Demanda "${target?.title}" removida.`, taskId, target?.title);
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
        const authorName = googleUser?.displayName || currentMemberName || 'Bruno';
        const newComment = {
          id: 'comment-' + Date.now(),
          author: authorName,
          content: commentText,
          createdAt: new Date().toISOString()
        };
        const updated = {
          ...task,
          comments: [...(task.comments || []), newComment],
          updatedAt: new Date().toISOString()
        };
        syncTaskToFirestore(
          updated,
          `${authorName} comentou na demanda "${task.title}"`
        ).catch(() => {});
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

  // Handler: Open Repeat Task Modal
  const handleOpenRepeatTask = (task: Task) => {
    setRepeatTaskTarget(task);
  };

  // Handler: Confirm Repeat Task
  const handleConfirmRepeat = (sourceTask: Task, options: RepeatTaskOptions) => {
    const newTask = createRepeatedTask(sourceTask, options, tasks, settings);
    handleSaveTask(newTask);
    addAuditLog(
      'Repetição de Demanda',
      `Demanda "${sourceTask.title}" repetida para novo ciclo (prazo: ${options.newDeadlineDate}).`,
      newTask.id,
      newTask.title
    );
    setRepeatTaskTarget(null);
    setSelectedTask(newTask);
  };

  // Handler: Reload data on reset
  const handleDataReset = () => {
    const freshTasks = deduplicateTasks(loadTasks());
    setTasks(freshTasks);
    setSettings(loadSettings());
    if (freshTasks.length === 0) {
      clearAllTasksFromServer().catch(() => {});
    } else {
      syncBatchTasksToFirestore(freshTasks).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col selection:bg-[#6A3102]/15 selection:text-[#6A3102]">
      {/* Live Real-Time Multi-User Toast Notification */}
      {liveToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-[#231815] text-white px-4 py-3 rounded-xl shadow-2xl border border-[#6A3102]/40 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div className="text-xs leading-snug">
            <span className="font-bold text-emerald-400 block text-[10px] uppercase tracking-wider">
              Atualização em Tempo Real
            </span>
            <span>{liveToast.summary}</span>
          </div>
        </div>
      )}

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
        teamMembers={activeGroup?.members || []}
        currentMemberName={currentMemberName}
        onChangeMemberName={handleChangeMemberName}
        presence={presence}
        onForceSync={forceRealtimeSyncNow}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {conflictNotice && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium flex items-center justify-between shadow-xs">
            <span>{conflictNotice}</span>
            <button
              type="button"
              onClick={() => setConflictNotice(null)}
              className="ml-3 text-amber-800 font-bold hover:underline cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        {!isAuthorizedInActiveGroup && activeGroup ? (
          <div className="my-12 max-w-lg mx-auto bg-white rounded-2xl border border-red-200 shadow-lg p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto font-bold text-lg">
              !
            </div>
            <h2 className="text-lg font-bold font-display text-[#231815]">
              Acesso Restrito ao Grupo "{activeGroup.name}"
            </h2>
            <p className="text-xs text-[#73645B] leading-relaxed">
              O perfil atual (<strong>{currentMemberName}</strong>) não possui autorização para visualizar ou editar as demandas compartilhadas deste grupo de trabalho. Apenas integrantes cadastrados no grupo têm permissão de acesso.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              {activeGroup.members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleChangeMemberName(m.name)}
                  className="px-3.5 py-2 rounded-lg bg-[#6A3102] hover:bg-[#542601] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Entrar como {m.name} ({m.role === 'admin' ? 'Admin' : 'Membro'})
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
        {currentTab === 'dashboard' && (
          <Dashboard
            tasks={visibleGroupTasks}
            settings={settings}
            overallRisk={overallRisk}
            workgroups={workgroups}
            activeGroupId={activeGroupId}
            onSelectTask={(task) => setSelectedTask(task)}
            onOpenNewTask={() => {
              setTaskToEdit(null);
              setIsTaskModalOpen(true);
            }}
            onOpenReschedule={(task) => setRescheduleTaskTarget(task)}
            onRepeatTask={handleOpenRepeatTask}
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
            tasks={visibleGroupTasks}
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
            tasks={visibleGroupTasks}
            onSelectTask={(task) => setSelectedTask(task)}
            onOpenGoogleCalendar={() => setIsGoogleCalendarModalOpen(true)}
            isGoogleConnected={!!googleToken}
          />
        )}

        {currentTab === 'approvals' && (
          <ApprovalsView
            tasks={visibleGroupTasks}
            onUpdateStatus={handleUpdateStatus}
            onSelectTask={(task) => setSelectedTask(task)}
            onOpenReschedule={(task) => setRescheduleTaskTarget(task)}
          />
        )}

        {/* ÁREA DE EQUIPE (Requirement 5) */}
        {currentTab === 'team' && (
          <TeamView
            tasks={visibleGroupTasks}
            workgroups={workgroups}
            activeGroupId={activeGroupId}
            onSelectGroup={handleSelectGroup}
            onCreateGroup={handleCreateGroup}
            onUpdateGroup={handleUpdateGroup}
            onDeleteGroup={handleDeleteGroup}
            onAddMember={handleAddMember}
            onUpdateMember={handleUpdateMember}
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
            tasks={visibleGroupTasks}
            settings={settings}
            overallRisk={overallRisk}
            onSelectTask={(task) => setSelectedTask(task)}
            onOpenNewTask={() => {
              setTaskToEdit(null);
              setIsTaskModalOpen(true);
            }}
          />
        )}
          </>
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
        workgroups={workgroups}
        activeGroupId={activeGroupId}
        onAddMember={handleAddMember}
      />

      {/* Task Details / Stage Timeline Modal */}
      <TaskDetailModal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        workgroups={workgroups}
        activeGroupId={activeGroupId}
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
        onRepeatTask={handleOpenRepeatTask}
        onSyncGoogleCalendar={handleSyncSingleTaskToGoogle}
        onUpdateTaskDeliverables={handleUpdateTaskDeliverables}
        onUpdateTaskSubtasks={handleUpdateTaskSubtasks}
        onUpdateTaskTeam={handleUpdateTaskTeam}
        onAddMember={handleAddMember}
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

      {/* Repeat Task Modal */}
      <RepeatTaskModal
        isOpen={!!repeatTaskTarget}
        onClose={() => setRepeatTaskTarget(null)}
        task={repeatTaskTarget}
        onConfirmRepeat={handleConfirmRepeat}
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
        onTasksUpdated={(updated) => {
          const clean = deduplicateTasks(updated);
          setTasks(clean);
          syncBatchTasksToFirestore(clean).catch(() => {});
        }}
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
