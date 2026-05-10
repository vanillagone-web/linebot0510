
import React, { useState } from 'react';
import { ViewState, Member, Task } from './types';
import { MOCK_MEMBERS, MOCK_TASKS, MOCK_GROUPS, isUserAdmin } from './constants';
import LoginView from './views/LoginView';
import ChatView from './views/ChatView';
import TaskListView from './views/TaskListView';
import DashboardView from './views/DashboardView';
import CalendarView from './views/CalendarView';
import StatsView from './views/StatsView';
import SettingsView from './views/SettingsView';
import TaskExecutionView from './views/TaskExecutionView';
import HelpView from './views/HelpView';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('LOGIN');
  const [activeGroupId, setActiveGroupId] = useState<string>(MOCK_GROUPS[0].id);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>(MOCK_MEMBERS);
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [currentUser, setCurrentUser] = useState<Member>(MOCK_MEMBERS[0]);

  const activeGroup = MOCK_GROUPS.find(g => g.id === activeGroupId) || MOCK_GROUPS[0];
  const groupMembers = members.filter(m => m.groupIds.includes(activeGroupId) && m.isBotLinked);
  const groupTasks = tasks.filter(t => t.groupId === activeGroupId);

  const navigateToExecution = (taskId: string) => {
    setSelectedTaskId(taskId);
    setCurrentView('EXECUTION');
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => {
      const now = new Date().toLocaleString();
      const targetTaskBefore = prev.find(t => t.id === taskId);
      if (!targetTaskBefore) return prev;

      let updatedTasks = prev.map(t => 
        t.id === taskId ? { ...t, ...updates, updatedAt: now } : t
      );

      if (updates.status === 'IN_PROGRESS') {
        const assignee = targetTaskBefore.assignee;
        updatedTasks = updatedTasks.map(t => {
          if (t.id !== taskId && t.assignee === assignee && t.status === 'IN_PROGRESS') {
            return { 
              ...t, 
              status: 'PENDING', 
              updatedAt: now,
              history: [
                ...(t.history || []), 
                { timestamp: now, user: '系統自動', action: '⚠️ 因開啟新任務，此任務已自動暫停' }
              ]
            };
          }
          return t;
        });
      }

      return updatedTasks;
    });
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setCurrentView('TASK_LIST');
  };

  const handleSwitchGroup = (groupId: string) => {
    setActiveGroupId(groupId);
    setCurrentView('TASK_LIST');
  };

  const handleSwitchUser = (member: Member) => {
    const calibratedUser: Member = {
      ...member,
      role: isUserAdmin(member.id) ? 'ADMIN' : 'MEMBER'
    };
    setCurrentUser(calibratedUser);
    setMembers(prev => prev.map(m => m.id === member.id ? calibratedUser : m));
  };

  const handleUpdateMember = (memberId: string, updates: Partial<Member>) => {
    setMembers(prev => prev.map(m => 
      m.id === memberId ? { ...m, ...updates } : m
    ));
    if (currentUser.id === memberId) {
      setCurrentUser(prev => ({ ...prev, ...updates }));
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'LOGIN':
        return <LoginView onLoginSuccess={() => setCurrentView('TASK_LIST')} />;
      case 'CHAT':
        return (
          <ChatView 
            onNavigate={setCurrentView} 
            onSelectTask={navigateToExecution} 
            tasks={groupTasks} 
            members={groupMembers}
          />
        );
      case 'TASK_LIST':
        return (
          <TaskListView 
            onNavigate={setCurrentView} 
            onSelectTask={navigateToExecution} 
            members={groupMembers}
            tasks={groupTasks}
            setTasks={setTasks}
            currentUser={currentUser}
            activeGroup={activeGroup}
            allGroups={MOCK_GROUPS}
            onSwitchGroup={handleSwitchGroup}
          />
        );
      case 'CALENDAR': 
        return (
          <CalendarView 
            onNavigate={setCurrentView} 
            onSelectTask={navigateToExecution} 
            onUpdateTask={handleUpdateTask}
            tasks={groupTasks} 
          />
        );
      case 'EXECUTION':
        return (
          <TaskExecutionView 
            taskId={selectedTaskId} 
            tasks={tasks}
            members={members}
            onNavigate={setCurrentView} 
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        );
      case 'DASHBOARD':
        return (
          <DashboardView 
            onNavigate={setCurrentView} 
            onSelectTask={navigateToExecution} 
            members={groupMembers}
            tasks={groupTasks}
            currentUser={currentUser}
            activeGroup={activeGroup}
            onAddMember={(m) => setMembers(prev => [...prev, m])}
            onDeleteMember={(id) => setMembers(prev => prev.filter(m => m.id !== id))}
            onSwitchUser={handleSwitchUser}
            onUpdateMember={handleUpdateMember}
          />
        );
      case 'STATS':
        return (
          <StatsView 
            onNavigate={setCurrentView} 
            tasks={groupTasks} 
            currentUser={currentUser} 
          />
        );
      case 'HELP':
        return <HelpView onNavigate={setCurrentView} />;
      case 'SETTINGS':
        return <SettingsView onNavigate={setCurrentView} members={members} currentUser={currentUser} onSwitchUser={handleSwitchUser} />;
      default:
        return <LoginView onLoginSuccess={() => setCurrentView('TASK_LIST')} />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex justify-center transition-colors duration-500">
      <div className="relative w-full max-w-[430px] h-screen bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden flex flex-col">
        {renderView()}
      </div>
    </div>
  );
};

export default App;
