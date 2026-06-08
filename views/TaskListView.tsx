
import React, { useState, useMemo, KeyboardEvent } from 'react';
import { ViewState, Task, Member, Group } from '../types';
import BottomNavBar from '../components/BottomNavBar';

interface TaskListViewProps {
  onNavigate: (view: ViewState) => void;
  onSelectTask: (taskId: string) => void;
  members: Member[];
  tasks: Task[];
  onCreateTask: (payload: {
    title: string;
    description?: string;
    priority: Task['priority'];
    dueDate: string;
    assignee: string;
    assigneeId?: string | null;
    assigneeName?: string;
    assigneeSourceKey?: string | null;
    ticketNo?: string;
    ticketUrl?: string;
    tags?: string[];
    notes?: string;
    color?: string;
  }) => Promise<Task>;
  onRefreshTasks: () => Promise<void>;
  isLoadingTasks: boolean;
  currentUser: Member;
  activeGroup: Group;
  allGroups: Group[];
  onSwitchGroup: (groupId: string) => void;
}

const PRESET_COLORS = ['#17cfcf', '#10B981', '#F59E0B', '#E78278', '#8B5CF6', '#3B82F6', '#EC4899', '#64748B'];
const dateQuickFilters = [
  { value: 'TODAY', label: '今日到期' },
  { value: 'OVERDUE', label: '已逾期' },
  { value: 'NO_DUE_DATE', label: '無截止日期' },
] as const;

type StatusFilter = 'ALL' | 'OPEN' | 'COMPLETED' | 'IN_PROGRESS' | 'OVERDUE';
type PriorityFilter = 'ALL' | Task['priority'];
type DateFilter = 'ALL' | 'TODAY' | 'OVERDUE' | 'NO_DUE_DATE';

const parseLocalDate = (value?: string): Date | null => {
  const dateValue = value?.trim();
  if (!dateValue) return null;

  const datePart = dateValue.split(' ')[0].split('T')[0];
  const hyphenParts = datePart.split('-');
  if (hyphenParts.length === 3) {
    const [year, month, day] = hyphenParts.map(Number);
    if (Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day)) {
      return new Date(year, month - 1, day);
    }
  }

  const slashParts = datePart.split('/');
  if (slashParts.length === 3) {
    const [year, month, day] = slashParts.map(Number);
    if (Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day)) {
      return new Date(year, month - 1, day);
    }
  }

  return null;
};

const isToday = (value?: string): boolean => {
  const date = parseLocalDate(value);
  if (!date) return false;

  const today = new Date();
  return date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
};

const isOverdue = (value?: string, status?: Task['status']): boolean => {
  if (status === 'COMPLETED') return false;
  if (status === 'OVERDUE') return true;

  const date = parseLocalDate(value);
  if (!date) return false;

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return date.getTime() < todayStart.getTime();
};

const hasNoDueDate = (value?: string): boolean => !value?.trim();

const formatAssigneeName = (assignee?: string | null) => {
  const name = typeof assignee === 'string' ? assignee.trim() : '';
  return name || '未指派';
};

const getAssigneeSourceKey = (memberId?: string | null) => {
  return typeof memberId === 'string' && memberId.startsWith('user_')
    ? memberId
    : null;
};

const getDueDateBadge = (task: Task) => {
  const baseClass = 'inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase';
  const displayDate = task.dueDate?.split(' ')[0] || '';

  if (task.status === 'COMPLETED') {
    return {
      label: displayDate || '已完成',
      className: `${baseClass} bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400`
    };
  }

  if (task.status === 'OVERDUE' || isOverdue(task.dueDate, task.status)) {
    return {
      label: '已逾期',
      className: `${baseClass} bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300`
    };
  }

  if (isToday(task.dueDate)) {
    return {
      label: '今日到期',
      className: `${baseClass} bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300`
    };
  }

  if (hasNoDueDate(task.dueDate)) {
    return {
      label: '無截止日期',
      className: `${baseClass} bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500`
    };
  }

  return {
    label: displayDate,
    className: `${baseClass} bg-white/60 text-zinc-500 dark:bg-black/20 dark:text-zinc-400`
  };
};

const ColorPicker: React.FC<{ selectedColor: string; onColorSelect: (color: string) => void }> = ({ selectedColor, onColorSelect }) => {
  const isPreset = PRESET_COLORS.includes(selectedColor);

  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map(color => (
        <button 
          key={color}
          type="button"
          onClick={() => onColorSelect(color)}
          className={`size-8 rounded-lg transition-all ring-offset-2 dark:ring-offset-zinc-900 shadow-sm ${selectedColor === color ? 'ring-2 ring-primary scale-110' : 'hover:scale-105 opacity-70'}`}
          style={{ backgroundColor: color }}
        />
      ))}
      <label 
        className={`size-8 rounded-lg transition-all ring-offset-2 dark:ring-offset-zinc-900 flex items-center justify-center cursor-pointer border-2 border-dashed shadow-sm ${!isPreset ? 'ring-2 ring-primary scale-110 border-transparent' : 'border-gray-300 dark:border-zinc-700 opacity-70'}`}
        style={!isPreset ? { backgroundColor: selectedColor } : {}}
      >
        <span className="material-symbols-outlined text-[14px]" style={!isPreset ? { mixBlendMode: 'difference', color: 'white' } : { color: '#9ca3af' }}>
          colorize
        </span>
        <input 
          type="color" 
          className="sr-only" 
          value={selectedColor} 
          onChange={(e) => onColorSelect(e.target.value)} 
        />
      </label>
    </div>
  );
};

const TaskListView: React.FC<TaskListViewProps> = ({ onNavigate, onSelectTask, members, tasks, onCreateTask, onRefreshTasks, isLoadingTasks, currentUser, activeGroup, allGroups, onSwitchGroup }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [tagFilter, setTagFilter] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGroupSwitcherOpen, setIsGroupSwitcherOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // 初始表單狀態
  const initialFormState = {
    title: '',
    ticketNo: '',
    ticketUrl: '',
    tags: [] as string[],
    description: '',
    notes: '',
    assigneeId: currentUser.id,
    color: PRESET_COLORS[0],
    priority: 'MEDIUM' as Task['priority'],
    dueDate: new Date().toISOString().split('T')[0]
  };

  const [newTask, setNewTask] = useState(initialFormState);

  const availableTags = useMemo<string[]>(() => {
    return Array.from(
      new Set<string>(
        tasks
          .flatMap(task => task.tags || [])
          .map(tag => tag.trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return tasks.filter(task => {
      const matchesSearch = !keyword || [
        task.title,
        task.description,
        task.ticketNo,
        task.assigneeName,
        task.assignee,
        task.notes,
        ...(task.tags || [])
      ].some(value => value?.toLowerCase().includes(keyword));

      const matchesStatus = statusFilter === 'ALL' ||
        (statusFilter === 'OPEN' && task.status !== 'COMPLETED') ||
        (statusFilter === 'COMPLETED' && task.status === 'COMPLETED') ||
        (statusFilter === 'IN_PROGRESS' && task.status === 'IN_PROGRESS') ||
        (statusFilter === 'OVERDUE' && isOverdue(task.dueDate, task.status));

      const matchesPriority = priorityFilter === 'ALL' || task.priority === priorityFilter;

      const matchesDate = dateFilter === 'ALL' ||
        (dateFilter === 'TODAY' && isToday(task.dueDate)) ||
        (dateFilter === 'OVERDUE' && isOverdue(task.dueDate, task.status)) ||
        (dateFilter === 'NO_DUE_DATE' && hasNoDueDate(task.dueDate));

      const matchesTag = tagFilter === 'ALL' || (task.tags || []).includes(tagFilter);

      return matchesSearch && matchesStatus && matchesPriority && matchesDate && matchesTag;
    });
  }, [tasks, searchTerm, statusFilter, priorityFilter, dateFilter, tagFilter]);

  const activeFilterCount = [
    Boolean(searchTerm.trim()),
    statusFilter !== 'ALL',
    priorityFilter !== 'ALL',
    dateFilter !== 'ALL',
    tagFilter !== 'ALL'
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setDateFilter('ALL');
    setTagFilter('ALL');
  };

  // 處理標籤新增 (Enter)
  const handleTagInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = tagInput.trim();
      if (val) {
        setNewTask(prev => {
          if (prev.tags.includes(val)) return prev;
          return { ...prev, tags: [...prev.tags, val] };
        });
      }
      setTagInput('');
    } else if (e.key === 'Backspace' && !tagInput && newTask.tags.length > 0) {
      const newTags = [...newTask.tags];
      newTags.pop();
      setNewTask(prev => ({ ...prev, tags: newTags }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewTask(prev => ({ 
      ...prev, 
      tags: prev.tags.filter(t => t !== tagToRemove) 
    }));
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    
    const assignedMember = members.find(m => m.id === newTask.assigneeId) || currentUser;
    const pendingTags = tagInput
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
    const tags = Array.from(new Set([...newTask.tags, ...pendingTags]));

    setIsCreatingTask(true);
    setCreateError(null);

    try {
      await onCreateTask({
        title: newTask.title.trim(),
        description: newTask.description,
        priority: newTask.priority,
        dueDate: newTask.dueDate,
        assignee: assignedMember.name,
        assigneeId: assignedMember.id,
        assigneeName: assignedMember.name,
        assigneeSourceKey: getAssigneeSourceKey(assignedMember.id),
        ticketNo: newTask.ticketNo,
        ticketUrl: newTask.ticketUrl,
        tags,
        notes: newTask.notes,
        color: newTask.color
      });

      setIsCreateModalOpen(false);
      setNewTask(initialFormState);
      setTagInput('');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : '任務建立失敗');
    } finally {
      setIsCreatingTask(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafb] dark:bg-zinc-950 font-jakarta">
      {/* Group Header & Switcher */}
      <nav className="sticky top-0 z-40 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 px-4 py-3 flex items-center justify-between shadow-sm">
        <button 
          onClick={() => setIsGroupSwitcherOpen(!isGroupSwitcherOpen)}
          className="flex items-center gap-3 active:scale-95 transition-all"
        >
           <img src={activeGroup.avatar} className="size-9 rounded-xl shadow-inner" alt="" />
           <div className="text-left">
             <div className="flex items-center gap-1">
               <h2 className="text-sm font-black dark:text-white leading-tight">{activeGroup.name}</h2>
               <span className="material-symbols-outlined text-xs text-gray-400">expand_more</span>
             </div>
             <p className="text-[9px] text-primary font-black uppercase tracking-widest">測試群組 / 任務範圍</p>
           </div>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshTasks}
            disabled={isLoadingTasks}
            className="size-10 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-300 rounded-full flex items-center justify-center shadow-sm border border-zinc-100 dark:border-zinc-700 active:scale-90 transition-transform disabled:opacity-50 disabled:active:scale-100"
          >
            <span className={`material-symbols-outlined ${isLoadingTasks ? 'animate-spin' : ''}`}>refresh</span>
          </button>
          <button onClick={() => setIsCreateModalOpen(true)} className="size-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>
      </nav>

      {/* Group Switcher Dropdown */}
      {isGroupSwitcherOpen && (
        <div className="absolute top-16 left-4 z-50 w-56 bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-zinc-800 p-2 animate-in zoom-in duration-200">
          {allGroups.map(g => (
            <button 
              key={g.id} 
              onClick={() => { onSwitchGroup(g.id); setIsGroupSwitcherOpen(false); }}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${activeGroup.id === g.id ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-500'}`}
            >
              <img src={g.avatar} className="size-8 rounded-lg" alt="" />
              <span className="text-xs font-black">{g.name}</span>
            </button>
          ))}
        </div>
      )}

      <main className="flex-1 overflow-y-auto pb-[calc(8rem+env(safe-area-inset-bottom))] px-4 pt-4 hide-scrollbar">
        <div className="mb-6 space-y-4">
           <div className="relative">
             <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
             <input 
               type="text" 
               placeholder="搜尋任務或工單..." 
               className="w-full bg-white dark:bg-zinc-900 border-none rounded-2xl py-3.5 pl-12 pr-4 shadow-sm text-sm focus:ring-2 focus:ring-primary/20 transition-all dark:text-white"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
           <div className="grid grid-cols-2 gap-2">
             <select
               className="bg-white dark:bg-zinc-900 border-none rounded-2xl py-2.5 px-3 shadow-sm text-[11px] font-black text-zinc-500 dark:text-zinc-300 focus:ring-2 focus:ring-primary/20"
               value={statusFilter}
               onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
             >
               <option value="ALL">狀態：全部</option>
               <option value="OPEN">狀態：未完成</option>
               <option value="COMPLETED">狀態：已完成</option>
               <option value="IN_PROGRESS">狀態：進行中</option>
               <option value="OVERDUE">狀態：逾期</option>
             </select>
             <select
               className="bg-white dark:bg-zinc-900 border-none rounded-2xl py-2.5 px-3 shadow-sm text-[11px] font-black text-zinc-500 dark:text-zinc-300 focus:ring-2 focus:ring-primary/20"
               value={priorityFilter}
               onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
             >
               <option value="ALL">優先級：全部</option>
               <option value="HIGH">優先級：HIGH</option>
               <option value="MEDIUM">優先級：MEDIUM</option>
               <option value="LOW">優先級：LOW</option>
             </select>
             <select
               className="bg-white dark:bg-zinc-900 border-none rounded-2xl py-2.5 px-3 shadow-sm text-[11px] font-black text-zinc-500 dark:text-zinc-300 focus:ring-2 focus:ring-primary/20"
               value={dateFilter}
               onChange={(e) => setDateFilter(e.target.value as DateFilter)}
             >
               <option value="ALL">日期：全部</option>
               <option value="TODAY">日期：今日到期</option>
               <option value="OVERDUE">日期：已逾期</option>
               <option value="NO_DUE_DATE">日期：無截止日期</option>
             </select>
             <select
               className="bg-white dark:bg-zinc-900 border-none rounded-2xl py-2.5 px-3 shadow-sm text-[11px] font-black text-zinc-500 dark:text-zinc-300 focus:ring-2 focus:ring-primary/20"
               value={tagFilter}
               onChange={(e) => setTagFilter(e.target.value)}
             >
               <option value="ALL">標籤：全部標籤</option>
               {availableTags.map(tag => (
                 <option key={tag} value={tag}>標籤：{tag}</option>
               ))}
             </select>
             <button
               type="button"
               onClick={resetFilters}
               className="col-span-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl py-2.5 px-3 shadow-sm text-[11px] font-black active:scale-95 transition-all"
             >
               重置篩選
             </button>
           </div>
           <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
             {dateQuickFilters.map(filter => {
               const isActive = dateFilter === filter.value;
               const activeClass = filter.value === 'TODAY'
                 ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                 : filter.value === 'OVERDUE'
                   ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
                   : 'bg-zinc-200 text-zinc-600 border-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-600';

               return (
                 <button
                   key={filter.value}
                   type="button"
                   onClick={() => setDateFilter(filter.value)}
                   className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold border transition-all active:scale-95 ${
                     isActive
                       ? activeClass
                       : 'bg-white dark:bg-zinc-900 text-zinc-400 border-zinc-100 dark:border-zinc-800'
                   }`}
                 >
                   {filter.label}
                 </button>
               );
             })}
           </div>
           <div className="min-h-5">
             {activeFilterCount > 0 ? (
               <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                 已套用 {activeFilterCount} 個篩選
               </p>
             ) : (
               <p className="text-[10px] font-bold text-zinc-300 dark:text-zinc-700">
                 未套用篩選
               </p>
             )}
           </div>
        </div>

        <div className="space-y-4">
          {filteredTasks.length > 0 ? filteredTasks.map((task) => {
            const subTaskTotal = task.subTasks?.length || 0;
            const subTaskDone = task.subTasks?.filter(st => st.isCompleted).length || 0;
            const progress = subTaskTotal > 0 ? (subTaskDone / subTaskTotal) * 100 : 0;
            const taskBaseColor = task.color || '#17cfcf';
            const dueDateBadge = getDueDateBadge(task);

            return (
              <div 
                key={task.id} 
                onClick={() => onSelectTask(task.id)}
                className="p-4 rounded-[28px] shadow-sm border border-gray-100 dark:border-zinc-800/50 flex flex-col gap-3 relative overflow-hidden transition-all active:scale-[0.98] cursor-pointer" 
                style={{ 
                  borderLeft: `6px solid ${taskBaseColor}`,
                  backgroundColor: `${taskBaseColor}12` // 約 7% 透明度的背景色
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-blue-500 uppercase">{task.ticketNo || '無工單'}</span>
                        <span className="text-[8px] font-bold text-zinc-400">ID: {task.id}</span>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                          task.priority === 'HIGH' ? 'bg-red-500 text-white' : 
                          task.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-500' : 'bg-gray-100 text-gray-500'
                        }`}>{task.priority}</span>
                      </div>
                      {task.status === 'COMPLETED' && <span className="material-symbols-outlined text-green-500 text-sm fill-icon">check_circle</span>}
                    </div>
                    <p className={`text-[#111818] dark:text-white font-bold truncate text-sm ${task.status === 'COMPLETED' ? 'line-through opacity-50' : ''}`}>{task.title}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[9px] font-black uppercase" style={{ color: taskBaseColor }}>@{formatAssigneeName(task.assigneeName || task.assignee)}</span>
                      {task.tags && task.tags.length > 0 && (
                        <>
                          <span className="size-1 bg-zinc-300 dark:bg-zinc-600 rounded-full" />
                          <span className="text-[9px] text-zinc-500 font-bold uppercase truncate max-w-[80px]">{task.tags[0]}</span>
                        </>
                      )}
                      <span className="size-1 bg-zinc-300 dark:bg-zinc-600 rounded-full" />
                      <span className={dueDateBadge.className}>{dueDateBadge.label}</span>
                    </div>
                  </div>
                  <div className="size-9 rounded-2xl bg-white/60 dark:bg-black/20 flex items-center justify-center text-primary-green transition-all self-center shadow-sm">
                    <span className="material-symbols-outlined text-xl font-black" style={{ color: taskBaseColor }}>chevron_right</span>
                  </div>
                </div>

                {subTaskTotal > 0 && (
                  <div className="mt-1">
                    <div className="flex items-center justify-between mb-1.5 px-0.5">
                      <p className="text-[8px] font-black text-gray-500 dark:text-zinc-400 uppercase tracking-widest">
                        子任務進度 ({subTaskDone}/{subTaskTotal})
                      </p>
                      <p className="text-[8px] font-black" style={{ color: taskBaseColor }}>{Math.round(progress)}%</p>
                    </div>
                    <div className="w-full h-1 bg-white/50 dark:bg-zinc-800 rounded-full overflow-hidden border border-black/5 dark:border-white/5">
                      <div 
                        className="h-full transition-all duration-500 ease-out" 
                        style={{ width: `${progress}%`, backgroundColor: taskBaseColor }} 
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-gray-200 dark:text-zinc-800 text-6xl">cloud_off</span>
              <p className="text-xs text-gray-400 font-bold mt-4 uppercase">此群組目前沒有任務</p>
            </div>
          )}
        </div>
      </main>

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] animate-in fade-in duration-300">
          <div className="w-full max-w-[420px] bg-white dark:bg-zinc-900 rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500 max-h-[95vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">add_task</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white italic">建立新任務</h3>
                  <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">系統將自動產生流水 ID</p>
                </div>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="size-8 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 active:scale-90">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 hide-scrollbar">
              <form onSubmit={handleCreateTask} className="space-y-6 pb-8">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1.5 ml-1">任務標題 *</p>
                    <input autoFocus required type="text" placeholder="例如：設計雙11活動Banner" className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-4 text-sm font-bold dark:text-white focus:ring-2 focus:ring-primary/20" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1.5 ml-1">工單編號</p>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300 text-sm">confirmation_number</span>
                      <input type="text" placeholder="請手動輸入工單號碼" className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl py-3 pl-10 pr-4 text-xs font-bold dark:text-white focus:ring-2 focus:ring-primary/20" value={newTask.ticketNo} onChange={(e) => setNewTask({ ...newTask, ticketNo: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-zinc-50/50 dark:bg-zinc-800/30 rounded-[32px] space-y-4 border border-zinc-100 dark:border-zinc-800">
                  <div>
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1.5 ml-1">外部 URL</p>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300 text-sm">link</span>
                      <input type="url" placeholder="https://jira.com/..." className="w-full bg-white dark:bg-zinc-800 border-none rounded-xl py-2.5 pl-10 pr-4 text-[11px] font-bold dark:text-white focus:ring-2 focus:ring-primary/20" value={newTask.ticketUrl} onChange={(e) => setNewTask({ ...newTask, ticketUrl: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1.5 ml-1">標籤</p>
                    <div className="bg-white dark:bg-zinc-800 border-none rounded-xl p-2 flex flex-wrap gap-2 items-center min-h-[46px] focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      {newTask.tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-lg text-[10px] font-black uppercase animate-in zoom-in duration-200">
                          {tag}
                          <button type="button" onClick={() => removeTag(tag)} className="hover:text-primary-green transition-colors">
                            <span className="material-symbols-outlined text-[12px] font-bold">close</span>
                          </button>
                        </span>
                      ))}
                      <input type="text" placeholder={newTask.tags.length === 0 ? "前台, 後台, 訂單 (按 Enter 建立)" : ""} className="flex-1 bg-transparent border-none focus:ring-0 text-[11px] font-bold dark:text-white p-1 min-w-[120px]" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagInputKeyDown} />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1.5 ml-1">任務描述</p>
                    <textarea rows={2} placeholder="描述任務內容與目標..." className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl py-3 px-4 text-xs font-bold dark:text-white focus:ring-2 focus:ring-primary/20 resize-none" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1.5 ml-1">處理備註</p>
                    <textarea rows={2} placeholder="補充特定注意事項或處理細節..." className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl py-3 px-4 text-xs font-bold dark:text-white focus:ring-2 focus:ring-primary/20 resize-none" value={newTask.notes} onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1.5 ml-1">截止日期</p>
                    <input type="date" className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl py-3 px-4 text-xs font-bold dark:text-white focus:ring-2 focus:ring-primary/20" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1.5 ml-1">指派執行者</p>
                    <select className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl py-3 px-4 text-xs font-bold dark:text-white focus:ring-2 focus:ring-primary/20" value={newTask.assigneeId} onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value })}>
                      {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <p className="mt-1.5 text-[9px] font-bold leading-relaxed text-zinc-400">
                      目前指派對象來自本機測試成員清單，尚未連動正式成員系統。
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1.5 ml-1">優先權</p>
                    <div className="flex bg-zinc-50 dark:bg-zinc-800 p-1 rounded-2xl gap-1">
                      {(['LOW', 'MEDIUM', 'HIGH'] as Task['priority'][]).map(p => (
                        <button key={p} type="button" onClick={() => setNewTask({ ...newTask, priority: p })} className={`flex-1 py-1.5 rounded-xl text-[8px] font-black transition-all ${newTask.priority === p ? (p === 'HIGH' ? 'bg-red-500 text-white' : p === 'MEDIUM' ? 'bg-amber-500 text-white' : 'bg-primary text-white') : 'text-zinc-400'}`}>
                          {p === 'HIGH' ? '高' : p === 'MEDIUM' ? '中' : '低'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pl-2">
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1.5 ml-1">識別色彩</p>
                    <ColorPicker selectedColor={newTask.color} onColorSelect={(color) => setNewTask({ ...newTask, color })} />
                  </div>
                </div>
                <div className="pt-4 sticky bottom-0 bg-white dark:bg-zinc-900 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                  {createError && (
                    <p className="text-xs font-bold text-red-500 mb-3">{createError}</p>
                  )}
                  <button 
                    type="submit" 
                    disabled={isCreatingTask}
                    className="w-full h-14 bg-primary text-white rounded-[24px] font-black text-sm uppercase shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-60 disabled:active:scale-100"
                  >
                    {isCreatingTask ? '建立中...' : '確認建立任務'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      <BottomNavBar currentView="TASK_LIST" onNavigate={onNavigate} />
    </div>
  );
};

export default TaskListView;
