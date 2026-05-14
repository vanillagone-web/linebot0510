
import React, { useEffect, useState } from 'react';
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

type CreateTaskPayload = {
  title: string;
  description?: string;
  priority: Task['priority'];
  dueDate: string;
  assignee: string;
};

type LineAuthUser = {
  lineUserId: string;
  displayName: string;
  pictureUrl: string;
};

type LineAuthScope = {
  sourceType: string;
  sourceId: string;
  sourceKey: string;
  createdBy: string;
};

declare global {
  interface Window {
    liff?: {
      init: (config: { liffId: string }) => Promise<void>;
      isLoggedIn: () => boolean;
      login: () => void;
      getIDToken: () => string | null;
    };
  }
}

const WEB_ACCESS_CODE_STORAGE_KEY = 'line_todo_web_access_code';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('LOGIN');
  const [activeGroupId, setActiveGroupId] = useState<string>(MOCK_GROUPS[0].id);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>(MOCK_MEMBERS);
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [webAccessCode, setWebAccessCode] = useState(() => localStorage.getItem(WEB_ACCESS_CODE_STORAGE_KEY) || '');
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [accessCodeError, setAccessCodeError] = useState<string | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(() => Boolean(localStorage.getItem(WEB_ACCESS_CODE_STORAGE_KEY)));
  const [taskError, setTaskError] = useState<string | null>(null);
  const [isInitializingLiff, setIsInitializingLiff] = useState(false);
  const [lineAuthUser, setLineAuthUser] = useState<LineAuthUser | null>(null);
  const [lineAuthScope, setLineAuthScope] = useState<LineAuthScope | null>(null);
  const [lineAuthError, setLineAuthError] = useState<string | null>(null);
  const [lineIdToken, setLineIdToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<Member>(MOCK_MEMBERS[0]);

  const activeGroup = MOCK_GROUPS.find(g => g.id === activeGroupId) || MOCK_GROUPS[0];
  const groupMembers = members.filter(m => m.groupIds.includes(activeGroupId) && m.isBotLinked);
  const groupTasks = tasks.filter(t => t.groupId === activeGroupId || t.groupId === 'web_default');
  const taskModeText = lineIdToken ? '任務模式：LINE 個人任務' : '任務模式：Access Code 管理任務';

  const handleAccessDenied = (message = '未授權，請輸入正確的 access code。') => {
    localStorage.removeItem(WEB_ACCESS_CODE_STORAGE_KEY);
    setWebAccessCode('');
    setAccessCodeError(message);
    setTaskError(null);
  };

  function getTaskApiHeaders(hasJson = false): Record<string, string> {
    const headers: Record<string, string> = {};

    if (hasJson) {
      headers['Content-Type'] = 'application/json';
    }

    if (lineIdToken) {
      headers.Authorization = `Bearer ${lineIdToken}`;
    } else if (webAccessCode) {
      headers['X-Web-Access-Code'] = webAccessCode;
    }

    return headers;
  }

  useEffect(() => {
    let isMounted = true;

    const initializeLiff = async () => {
      const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
      const liffId = viteEnv?.VITE_LIFF_ID;

      if (!liffId) {
        setLineAuthError('VITE_LIFF_ID is not configured');
        return;
      }

      if (!window.liff) {
        setLineAuthError('LIFF SDK 尚未載入');
        return;
      }

      setIsInitializingLiff(true);
      setLineAuthError(null);

      try {
        await window.liff.init({ liffId });

        if (!window.liff.isLoggedIn()) {
          window.liff.login();
          return;
        }

        const idToken = window.liff.getIDToken();

        if (!idToken) {
          throw new Error('無法取得 LINE idToken');
        }

        const response = await fetch('/api/auth/line', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ idToken })
        });
        const data = await response.json();

        if (!response.ok || data.ok !== true) {
          throw new Error(data.error || 'LINE 登入驗證失敗');
        }

        if (isMounted) {
          setLineIdToken(idToken);
          setLineAuthUser(data.user);
          setLineAuthScope(data.scope);
        }
      } catch (err) {
        if (isMounted) {
          setLineAuthError(err instanceof Error ? err.message : 'LINE 登入驗證失敗');
        }
      } finally {
        if (isMounted) {
          setIsInitializingLiff(false);
        }
      }
    };

    initializeLiff();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!lineIdToken && !webAccessCode) {
      setIsLoadingTasks(false);
      return;
    }

    let isMounted = true;

    const loadTasks = async () => {
      setIsLoadingTasks(true);
      setTaskError(null);
      setAccessCodeError(null);

      try {
        const response = await fetch('/api/tasks', {
          headers: getTaskApiHeaders()
        });
        const data = await response.json();

        if (!response.ok || data.ok !== true) {
          if (response.status === 401) {
            handleAccessDenied(data.error);
            return;
          }

          throw new Error(data.error || '任務讀取失敗');
        }

        if (isMounted) {
          setTasks(data.tasks);
        }
      } catch (err) {
        if (isMounted) {
          setTaskError(err instanceof Error ? err.message : '任務讀取失敗');
        }
      } finally {
        if (isMounted) {
          setIsLoadingTasks(false);
        }
      }
    };

    loadTasks();

    return () => {
      isMounted = false;
    };
  }, [lineIdToken, webAccessCode]);

  const handleAccessCodeSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const code = accessCodeInput.trim();

    if (!code) {
      setAccessCodeError('請輸入 access code。');
      return;
    }

    localStorage.setItem(WEB_ACCESS_CODE_STORAGE_KEY, code);
    setWebAccessCode(code);
    setAccessCodeInput('');
    setAccessCodeError(null);
    setTaskError(null);
  };

  const navigateToExecution = (taskId: string) => {
    setSelectedTaskId(taskId);
    setCurrentView('EXECUTION');
  };

  const handleUpdateTask = async (
    taskId: string,
    updates: Partial<Task>
  ): Promise<Task> => {
    setTaskError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: getTaskApiHeaders(true),
        body: JSON.stringify(updates)
      });
      const data = await response.json();

      if (!response.ok || data.ok !== true) {
        if (response.status === 401) {
          handleAccessDenied(data.error);
        }

        throw new Error(data.error || '任務更新失敗');
      }

      setTasks(prev => prev.map(task => task.id === taskId ? data.task : task));
      return data.task as Task;
    } catch (err) {
      const message = err instanceof Error ? err.message : '任務更新失敗';
      setTaskError(message);
      throw err;
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setTaskError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: getTaskApiHeaders()
      });
      const data = await response.json();

      if (!response.ok || data.ok !== true) {
        if (response.status === 401) {
          handleAccessDenied(data.error);
        }

        throw new Error(data.error || '任務刪除失敗');
      }

      setTasks(prev => prev.filter(task => task.id !== taskId));
      setCurrentView('TASK_LIST');
    } catch (err) {
      const message = err instanceof Error ? err.message : '任務刪除失敗';
      setTaskError(message);
      throw err;
    }
  };

  const handleCreateTask = async (payload: CreateTaskPayload) => {
    setTaskError(null);

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: getTaskApiHeaders(true),
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok || data.ok !== true) {
        if (response.status === 401) {
          handleAccessDenied(data.error);
        }

        throw new Error(data.error || '任務建立失敗');
      }

      setTasks(prev => [data.task, ...prev]);
      return data.task as Task;
    } catch (err) {
      const message = err instanceof Error ? err.message : '任務建立失敗';
      setTaskError(message);
      throw err;
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    setTaskError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'PATCH',
        headers: getTaskApiHeaders()
      });
      const data = await response.json();

      if (!response.ok || data.ok !== true) {
        if (response.status === 401) {
          handleAccessDenied(data.error);
        }

        throw new Error(data.error || '任務完成失敗');
      }

      setTasks(prev => prev.map(task => task.id === taskId ? data.task : task));
      return data.task as Task;
    } catch (err) {
      const message = err instanceof Error ? err.message : '任務完成失敗';
      setTaskError(message);
      throw err;
    }
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
            onCreateTask={handleCreateTask}
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
            onCompleteTask={handleCompleteTask}
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
            onCompleteTask={handleCompleteTask}
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

  const lineAuthStatus = (
    <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-[10px] font-bold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400">
      {lineAuthUser ? (
        <div className="flex items-center gap-2">
          {lineAuthUser.pictureUrl && (
            <img src={lineAuthUser.pictureUrl} alt="" className="size-7 rounded-full object-cover" />
          )}
          <div className="min-w-0">
            <p className="truncate text-zinc-700 dark:text-zinc-200">LINE：{lineAuthUser.displayName || lineAuthUser.lineUserId}</p>
            <p className="truncate text-zinc-400">{lineAuthScope?.sourceKey || `user_${lineAuthUser.lineUserId}`}</p>
          </div>
        </div>
      ) : (
        <p>{isInitializingLiff ? '正在初始化 LINE 身份...' : lineAuthError || 'LINE 身份尚未驗證'}</p>
      )}
      <p className="mt-1 truncate text-[9px] font-black uppercase tracking-wider text-primary">{taskModeText}</p>
    </div>
  );

  if (!lineIdToken && !webAccessCode) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center px-6 transition-colors duration-500">
        <form onSubmit={handleAccessCodeSubmit} className="w-full max-w-[360px] rounded-[32px] bg-white dark:bg-zinc-900 p-8 shadow-2xl border border-zinc-100 dark:border-zinc-800 space-y-5">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Access Code</p>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white">請輸入存取碼</h1>
            <p className="text-xs font-bold leading-relaxed text-zinc-400">此任務管理介面目前僅開放測試使用。</p>
          </div>
          {lineAuthStatus}
          <input
            type="password"
            value={accessCodeInput}
            onChange={(event) => setAccessCodeInput(event.target.value)}
            placeholder="Access code"
            className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
          />
          {accessCodeError && (
            <p className="text-xs font-bold text-red-500">{accessCodeError}</p>
          )}
          <button type="submit" className="h-12 w-full rounded-2xl bg-primary text-sm font-black text-white shadow-lg shadow-primary/20 active:scale-95 transition-all">
            進入任務管理
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex justify-center transition-colors duration-500">
      <div className="relative w-full max-w-[430px] h-screen bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden flex flex-col">
        {(isLoadingTasks || taskError) && (
          <div className="absolute top-3 left-3 right-3 z-[120] rounded-2xl bg-zinc-900/90 px-4 py-3 text-xs font-bold text-white shadow-lg">
            {isLoadingTasks ? '正在讀取任務資料...' : taskError}
          </div>
        )}
        <div className={`absolute left-3 right-3 z-[110] ${isLoadingTasks || taskError ? 'top-16' : 'top-3'}`}>
          {lineAuthStatus}
        </div>
        {renderView()}
      </div>
    </div>
  );
};

export default App;
