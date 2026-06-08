
import React, { useState, useEffect } from 'react';
import { ViewState, Task, SubTask, TaskHistoryEntry, Member } from '../types';

interface TaskExecutionViewProps {
  taskId: string | null;
  tasks: Task[];
  members: Member[];
  onNavigate: (view: ViewState) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<Task>;
  onCompleteTask: (taskId: string) => Promise<Task>;
  onDeleteTask: (taskId: string) => Promise<void>;
}

const PRESET_COLORS = ['#17cfcf', '#10B981', '#F59E0B', '#E78278', '#8B5CF6', '#3B82F6', '#EC4899', '#64748B'];

const formatAssigneeName = (assignee?: string | null) => {
  const name = typeof assignee === 'string' ? assignee.trim() : '';
  return name || '未指派';
};

const getAssigneeSourceKey = (memberId?: string | null) => {
  return typeof memberId === 'string' && memberId.startsWith('user_')
    ? memberId
    : null;
};

const TaskExecutionView: React.FC<TaskExecutionViewProps> = ({ taskId, tasks, members, onNavigate, onUpdateTask, onCompleteTask, onDeleteTask }) => {
  const task = taskId ? tasks.find(t => t.id === taskId) : undefined;
  const assigneeName = task ? formatAssigneeName(task.assigneeName || task.assignee) : '';
  
  // 計算累積工時秒數 (將 actualHours 轉回秒數)
  const initialSeconds = Math.round((task?.actualHours || 0) * 3600);
  const [seconds, setSeconds] = useState(initialSeconds); 
  const [showCompleteSuccess, setShowCompleteSuccess] = useState(false);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [activeSubTaskPicker, setActiveSubTaskPicker] = useState<string | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [draftSubTasks, setDraftSubTasks] = useState<SubTask[] | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTicketNo, setEditTicketNo] = useState('');
  const [editTicketUrl, setEditTicketUrl] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [editPriority, setEditPriority] = useState<Task['priority']>('MEDIUM');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');
  const [editColor, setEditColor] = useState('#17cfcf');
  const [isSavingTaskEdit, setIsSavingTaskEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const isTaskRunning = task?.status === 'IN_PROGRESS';

  // 每當 actualHours 改變（如在其他地方被更新），同步秒數
  useEffect(() => {
    setSeconds(Math.round((task?.actualHours || 0) * 3600));
  }, [task?.actualHours]);

  useEffect(() => {
    let interval: any = null;
    if (isTaskRunning) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTaskRunning]);

  if (!task) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[#f8fafb] px-8 text-center dark:bg-background-dark">
        <div className="mb-6 flex size-20 items-center justify-center rounded-[28px] bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600">
          <span className="material-symbols-outlined text-4xl">assignment_late</span>
        </div>
        <h2 className="text-xl font-black text-zinc-900 dark:text-white">找不到這筆任務</h2>
        <p className="mt-3 max-w-[280px] text-sm font-bold leading-relaxed text-zinc-400">
          這筆任務可能已被刪除、尚未載入，或不在目前任務範圍內。
        </p>
        <button
          onClick={() => onNavigate('TASK_LIST')}
          className="mt-8 h-14 rounded-2xl bg-primary px-8 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-primary/20 active:scale-95 transition-all"
        >
          返回任務列表
        </button>
      </div>
    );
  }

  const addHistoryEntry = (action: string) => {
    const entry: TaskHistoryEntry = {
      timestamp: new Date().toLocaleString(),
      user: '王大同 (您)',
      action: action
    };
    return [...(task.history || []), entry];
  };

  const updateTask = async (updates: Partial<Task>, actionName: string) => {
    try {
      return await onUpdateTask(task.id, updates);
    } catch (err) {
      console.error(`${actionName} failed`, err);
      return null;
    }
  };

  const getSubTaskAssigneeName = (subTask: SubTask) => {
    const name = subTask.assigneeName?.trim();
    if (name) return name;

    const member = members.find(m => m.id === subTask.assigneeId);
    return member?.name || '未指派';
  };

  const toggleTimer = async () => {
    if (task.status === 'COMPLETED') return;

    if (!isTaskRunning) {
      // 啟動計時
      await updateTask({
        status: 'IN_PROGRESS',
        history: addHistoryEntry('🚀 啟動計時')
      }, 'Start timer');
    } else {
      // 暫停計時
      await updateTask({
        status: 'PENDING',
        actualHours: seconds / 3600,
        history: addHistoryEntry('⏸ 暫停計時')
      }, 'Pause timer');
    }
  };

  const handleCompleteTask = async () => {
    if (task.status === 'COMPLETED') return;

    try {
      await onCompleteTask(task.id);
      setShowCompleteSuccess(true);
      setTimeout(() => onNavigate('TASK_LIST'), 1500);
    } catch (err) {
      console.error('Complete task failed', err);
    }
  };

  const handleDeleteTask = async () => {
    if (isDeletingTask) return;

    setIsDeletingTask(true);

    try {
      await onDeleteTask(task.id);
    } catch (err) {
      console.error('Delete task failed', err);
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleReopenTask = async () => {
    await updateTask({
      status: 'PENDING',
      history: addHistoryEntry('🔓 重新啟動任務')
    }, 'Reopen task');
  };

  const handleUpdateColor = async (color: string) => {
    await updateTask({ 
      color,
      history: addHistoryEntry(`🎨 變更任務顏色為 ${color}`)
    }, 'Update task color');
  };

  const openEditModal = () => {
    setEditTitle(task.title || '');
    setEditTicketNo(task.ticketNo || '');
    setEditTicketUrl(task.ticketUrl || '');
    setEditDescription(task.description || '');
    setEditNotes(task.notes || '');
    setEditDueDate(task.dueDate || '');
    setEditAssignee(task.assigneeName || task.assignee || members[0]?.name || '');
    setEditPriority(task.priority || 'MEDIUM');
    setEditTags(task.tags || []);
    setEditTagInput('');
    setEditColor(task.color || '#17cfcf');
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleEditTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      const newTags = editTagInput
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);
      if (newTags.length > 0) {
        setEditTags(prev => Array.from(new Set([...prev, ...newTags])));
      }
      setEditTagInput('');
    } else if (e.key === 'Backspace' && !editTagInput && editTags.length > 0) {
      setEditTags(prev => prev.slice(0, -1));
    }
  };

  const removeEditTag = (tagToRemove: string) => {
    setEditTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleSaveTaskEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = editTitle.trim();
    if (!title) {
      setEditError('請輸入任務標題。');
      return;
    }

    const pendingTags = editTagInput
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
    const tags = Array.from(new Set([...editTags, ...pendingTags]));
    const selectedMember = members.find(member => member.name === editAssignee);

    setIsSavingTaskEdit(true);
    setEditError(null);

    const updatedTask = await updateTask({
      title,
      ticketNo: editTicketNo.trim(),
      ticketUrl: editTicketUrl.trim(),
      description: editDescription,
      notes: editNotes,
      dueDate: editDueDate,
      assignee: editAssignee,
      assigneeName: editAssignee,
      assigneeId: selectedMember?.id || task.assigneeId || null,
      assigneeSourceKey: selectedMember
        ? getAssigneeSourceKey(selectedMember.id)
        : task.assigneeSourceKey || null,
      priority: editPriority,
      tags,
      color: editColor,
      history: addHistoryEntry('✏️ 更新了任務內容')
    }, 'Update task details');

    setIsSavingTaskEdit(false);

    if (updatedTask) {
      setIsEditModalOpen(false);
      setEditTagInput('');
    } else {
      setEditError('任務更新失敗，請稍後再試。');
    }
  };

  const handleToggleSubTask = async (subTaskId: string) => {
    const subTask = task.subTasks?.find(st => st.id === subTaskId);
    const updatedSubTasks = (task.subTasks || []).map(st => 
      st.id === subTaskId ? { ...st, isCompleted: !st.isCompleted } : st
    );
    await updateTask({ 
      subTasks: updatedSubTasks,
      history: addHistoryEntry(`${subTask?.isCompleted ? '↩️ 重設' : '🔘 完成'} 子任務: ${subTask?.title}`)
    }, 'Toggle subtask');
  };

  const handleUpdateSubTaskAssignee = async (subTaskId: string, assigneeId: string) => {
    const subTask = task.subTasks?.find(st => st.id === subTaskId);
    const member = members.find(m => m.id === assigneeId);
    const updatedSubTasks = (task.subTasks || []).map(st => 
      st.id === subTaskId ? {
        ...st,
        assigneeId,
        assigneeName: member?.name || '',
        assigneeSourceKey: getAssigneeSourceKey(member?.id)
      } : st
    );
    const updatedTask = await updateTask({ 
      subTasks: updatedSubTasks,
      history: addHistoryEntry(`👤 指派子任務 [${subTask?.title}] 給 ${member?.name || subTask?.assigneeName || '未指派'}`)
    }, 'Update subtask assignee');
    if (updatedTask) {
      setActiveSubTaskPicker(null);
    }
  };

  const handleAddSubTask = async () => {
    if (!newSubTaskTitle.trim()) return;
    const taskAssigneeName = (task.assigneeName || task.assignee || '').trim();
    const primaryAssignee = members.find(m => m.name === taskAssigneeName);
    const selectedMember = primaryAssignee || members[0];
    const defaultAssigneeId = selectedMember?.id;
    const newSub: SubTask = {
      id: Date.now().toString(),
      title: newSubTaskTitle.trim(),
      isCompleted: false,
      assigneeId: defaultAssigneeId,
      assigneeName: selectedMember?.name || '',
      assigneeSourceKey: getAssigneeSourceKey(selectedMember?.id)
    };
    const updatedTask = await updateTask({ 
      subTasks: [...(task.subTasks || []), newSub],
      history: addHistoryEntry(`➕ 新增子任務: ${newSub.title}`)
    }, 'Add subtask');
    if (updatedTask) {
      setNewSubTaskTitle('');
    }
  };

  const handleDeleteSubTask = async (subTaskId: string) => {
    const subTask = task.subTasks?.find(st => st.id === subTaskId);
    const updatedSubTasks = (task.subTasks || []).filter(st => st.id !== subTaskId);
    await updateTask({ 
      subTasks: updatedSubTasks,
      history: addHistoryEntry(`🗑️ 移除子任務: ${subTask?.title}`)
    }, 'Delete subtask');
  };

  const onDragStart = (index: number) => {
    setDraggedItemIndex(index);
    setDraftSubTasks([...(task.subTasks || [])]);
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    const items = [...(draftSubTasks || task.subTasks || [])];
    const draggedItem = items[draggedItemIndex];
    if (!draggedItem) return;
    items.splice(draggedItemIndex, 1);
    items.splice(index, 0, draggedItem);
    setDraggedItemIndex(index);
    setDraftSubTasks(items);
  };

  const onDragEnd = async () => {
    const originalSubTasks = task.subTasks || [];
    const hasOrderChanged = Boolean(draftSubTasks) && draftSubTasks.some((subTask, index) => subTask.id !== originalSubTasks[index]?.id);

    try {
      if (draftSubTasks && hasOrderChanged) {
        await updateTask({
          subTasks: draftSubTasks,
          history: addHistoryEntry('↕️ 重新排列了子任務順序')
        }, 'Finish reordering subtasks');
      }
    } finally {
      setDraggedItemIndex(null);
      setDraftSubTasks(null);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return {
      hrs: hrs.toString().padStart(2, '0'),
      mins: mins.toString().padStart(2, '0'),
      secs: secs.toString().padStart(2, '0')
    };
  };

  const time = formatTime(seconds);
  const subtasks = draftSubTasks ?? task.subTasks ?? [];
  const completedSubTasks = subtasks.filter(st => st.isCompleted).length;
  const totalSubTasks = subtasks.length;
  const progressPercent = totalSubTasks > 0 ? (completedSubTasks / totalSubTasks) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-[#f8fafb] dark:bg-background-dark overflow-hidden relative font-jakarta">
      {showCompleteSuccess && (
        <div className="absolute inset-0 z-[100] bg-[#06C755] flex flex-col items-center justify-center animate-in fade-in duration-500">
           <div className="size-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl animate-in zoom-in duration-500 delay-100">
             <span className="material-symbols-outlined text-[#06C755] text-6xl fill-icon">check_circle</span>
           </div>
           <h3 className="text-2xl font-black text-white">任務已完成</h3>
           <p className="text-white/80 text-sm mt-2 font-bold tracking-widest uppercase">任務狀態已更新</p>
        </div>
      )}

      <div className="sticky top-0 z-50 flex items-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-5 justify-between border-b border-gray-100 dark:border-zinc-800">
        <button onClick={() => onNavigate('TASK_LIST')} className="text-[#111818] dark:text-white flex size-10 shrink-0 items-center justify-center cursor-pointer active:scale-90 transition-all">
          <span className="material-symbols-outlined font-bold">arrow_back</span>
        </button>
        <div className="flex flex-col items-center flex-1 mx-4 min-w-0">
          <div className="flex gap-2">
            <span className="text-[8px] font-black text-zinc-400">ID: {task.id}</span>
            <span className="text-[8px] font-black text-blue-500">{task.ticketNo || '無工單'}</span>
          </div>
          <h2 className="text-[#111818] dark:text-white text-base font-black leading-tight truncate w-full text-center">{task.title}</h2>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={openEditModal} className="size-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-300 flex items-center justify-center active:scale-90 transition-all">
            <span className="material-symbols-outlined text-base">edit</span>
          </button>
          <div
            className="size-4 rounded-full shadow-sm ring-2 ring-white dark:ring-zinc-800"
            style={{ backgroundColor: task.color || '#17cfcf' }}
          />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto pb-48 hide-scrollbar px-6 pt-6 space-y-6">
        {/* Timer Section */}
        <div className={`bg-white dark:bg-zinc-900 rounded-[40px] p-8 shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col items-center ${task.status === 'COMPLETED' ? 'opacity-50 grayscale' : ''}`}>
          <p className="text-gray-400 text-[11px] font-black uppercase tracking-widest mb-6">目前累積耗時</p>
          <div className="flex gap-4 items-center">
            <TimerDigit value={time.hrs} label="小時" />
            <span className="text-2xl font-black text-primary mb-6">:</span>
            <TimerDigit value={time.mins} label="分鐘" />
            <span className="text-2xl font-black text-primary mb-6">:</span>
            <TimerDigit value={time.secs} label="秒" isActive={isTaskRunning} />
          </div>
          <div className="mt-8 flex gap-3 w-full">
            <button 
              onClick={toggleTimer}
              disabled={task.status === 'COMPLETED'}
              className={`flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 font-black text-sm transition-all active:scale-95 ${isTaskRunning ? 'bg-amber-100 text-amber-600' : 'bg-primary text-white shadow-lg shadow-primary/20'}`}
            >
              <span className="material-symbols-outlined">{isTaskRunning ? 'pause_circle' : 'play_circle'}</span>
              {isTaskRunning ? '暫停計時' : '啟動計時'}
            </button>
          </div>
        </div>

        {/* Task Core Info & Tags */}
        <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-zinc-800 space-y-5">
           <div className="flex items-center justify-between">
              <h3 className="text-sm font-black dark:text-white uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">info</span>
                任務詳情
              </h3>
              <div className="flex flex-wrap gap-1 justify-end max-w-[150px]">
                 {task.tags && task.tags.length > 0 ? task.tags.map(tag => (
                   <span key={tag} className="text-[9px] font-black px-2 py-0.5 bg-primary/5 text-primary border border-primary/10 rounded uppercase">#{tag}</span>
                 )) : <span className="text-[9px] text-zinc-300 italic">無類型標籤</span>}
              </div>
           </div>
           <div className="space-y-4">
             {task.description ? (
               <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-2">任務描述</p>
                  <p className="text-sm text-gray-600 dark:text-zinc-300 leading-relaxed font-medium">{task.description}</p>
               </div>
             ) : null}

             {task.notes ? (
               <div className="bg-amber-50/30 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100/50 dark:border-amber-900/20">
                  <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest mb-2">處理備註</p>
                  <p className="text-sm text-amber-700/80 dark:text-amber-200/60 leading-relaxed font-medium italic">{task.notes}</p>
               </div>
             ) : null}

             {task.ticketUrl && (
               <a href={task.ticketUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-2xl group transition-all active:scale-95">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">link</span>
                    <span className="text-xs font-bold text-primary truncate max-w-[200px]">開啟外部連結</span>
                  </div>
                  <span className="material-symbols-outlined text-primary text-sm group-hover:translate-x-1 transition-transform">open_in_new</span>
               </a>
             )}
           </div>
        </div>

        {/* Color Palette */}
        <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-zinc-800 space-y-4">
           <h3 className="text-sm font-black dark:text-white uppercase tracking-widest flex items-center gap-2">
             <span className="material-symbols-outlined text-lg">palette</span>
             標識顏色
           </h3>
           <div className="flex flex-wrap gap-3">
             {PRESET_COLORS.map(color => (
               <button 
                key={color}
                onClick={() => handleUpdateColor(color)}
                className={`size-8 rounded-full transition-all ring-offset-2 dark:ring-offset-zinc-900 ${task.color === color ? 'ring-2 ring-primary scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                style={{ backgroundColor: color }}
               />
             ))}
           </div>
        </div>

        {/* Subtasks Progress */}
        <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-zinc-800 space-y-5">
           <div className="flex items-center justify-between">
              <h3 className="text-sm font-black dark:text-white uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">checklist</span>
                子任務進度
              </h3>
              <span className="text-[10px] font-black text-gray-400">
                {completedSubTasks} / {totalSubTasks}
              </span>
           </div>
           <div className="w-full h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
             <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }} />
           </div>
           <div className="space-y-4">
             {subtasks.map((st, index) => {
               const assignee = members.find(m => m.id === st.assigneeId);
               const subTaskAssigneeName = getSubTaskAssigneeName(st);
               return (
                 <div 
                   key={st.id} 
                   draggable 
                   onDragStart={() => onDragStart(index)}
                   onDragOver={(e) => onDragOver(e, index)}
                   onDragEnd={onDragEnd}
                   className={`flex items-center gap-3 group transition-all duration-200 ${draggedItemIndex === index ? 'opacity-30' : ''}`}
                 >
                   <div className="cursor-grab active:cursor-grabbing text-zinc-300 hover:text-primary transition-colors">
                     <span className="material-symbols-outlined text-base">drag_indicator</span>
                   </div>
                   <button onClick={() => handleToggleSubTask(st.id)} className={`size-6 rounded-lg flex items-center justify-center transition-all border-2 shrink-0 ${st.isCompleted ? 'bg-primary border-primary text-white' : 'border-gray-200 dark:border-zinc-700'}`}>
                     {st.isCompleted && <span className="material-symbols-outlined text-sm font-black">check</span>}
                   </button>
                   <span className={`text-sm flex-1 font-medium truncate ${st.isCompleted ? 'text-gray-400 line-through' : 'dark:text-white'}`}>{st.title}</span>
                   <div className="relative">
                     <button
                      onClick={() => setActiveSubTaskPicker(activeSubTaskPicker === st.id ? null : st.id)}
                      className="size-7 rounded-full overflow-hidden border-2 border-zinc-100 dark:border-zinc-800 transition-all"
                      title={`指派：${subTaskAssigneeName}`}
                      aria-label={`指派：${subTaskAssigneeName}`}
                     >
                       {assignee ? <img src={assignee.avatar} className="size-full object-cover" alt="" /> : <div className="size-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"><span className="material-symbols-outlined text-xs text-zinc-400">person_add</span></div>}
                     </button>
                     {activeSubTaskPicker === st.id && (
                       <div className="absolute right-0 bottom-full mb-2 z-[60] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-800 p-2 w-48">
                         <div className="max-h-40 overflow-y-auto hide-scrollbar space-y-1">
                           {members.map(m => (
                             <button key={m.id} onClick={() => handleUpdateSubTaskAssignee(st.id, m.id)} className={`w-full flex items-center gap-2 p-1.5 rounded-xl ${st.assigneeId === m.id ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50 dark:hover:bg-zinc-800'}`}>
                               <img src={m.avatar} className="size-6 rounded-full" alt="" />
                               <span className="text-[10px] font-bold truncate">{m.name}</span>
                             </button>
                           ))}
                         </div>
                       </div>
                     )}
                   </div>
                   <button onClick={() => handleDeleteSubTask(st.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"><span className="material-symbols-outlined text-sm">delete</span></button>
                 </div>
               );
             })}
             <div className="flex gap-2 pt-2">
               <input type="text" placeholder="新增子任務..." className="flex-1 bg-gray-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-2 text-xs font-bold dark:text-white focus:ring-1 focus:ring-primary/30" value={newSubTaskTitle} onChange={(e) => setNewSubTaskTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSubTask()} />
               <button onClick={handleAddSubTask} className="size-8 bg-primary/10 text-primary rounded-xl flex items-center justify-center active:scale-90 transition-all"><span className="material-symbols-outlined text-sm font-black">add</span></button>
             </div>
           </div>
        </div>

        {/* History Log */}
        <div className="bg-white dark:bg-zinc-900 rounded-[32px] overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-sm transition-all duration-300">
           <button onClick={() => setIsHistoryExpanded(!isHistoryExpanded)} className="w-full flex items-center justify-between p-6">
              <h3 className="text-sm font-black dark:text-white uppercase tracking-widest flex items-center gap-2"><span className="material-symbols-outlined text-lg">history</span>任務異動歷程</h3>
              <span className={`material-symbols-outlined text-zinc-300 transition-transform duration-300 ${isHistoryExpanded ? 'rotate-180' : ''}`}>keyboard_arrow_down</span>
           </button>
           <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isHistoryExpanded ? 'max-h-[500px] border-t border-gray-50 dark:border-zinc-800' : 'max-h-0'}`}>
              <div className="p-6 space-y-6">
                 {task.history && task.history.length > 0 ? (
                   <div className="relative pl-6 space-y-6 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100 dark:before:bg-zinc-800">
                     {[...task.history].reverse().map((entry, idx) => (
                       <div key={idx} className="relative">
                          <div className="absolute -left-[29px] top-1 size-3 bg-white dark:bg-zinc-900 border-2 border-primary rounded-full z-10" />
                          <div className="space-y-1">
                             <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black text-primary uppercase tracking-wider">{entry.user}</p>
                                <p className="text-[9px] text-gray-400 font-medium">{entry.timestamp}</p>
                             </div>
                             <p className="text-xs font-bold dark:text-white leading-relaxed">{entry.action}</p>
                          </div>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="py-4 text-center text-xs text-gray-400 font-medium">目前尚無異動紀錄</div>
                 )}
              </div>
           </div>
        </div>

        {/* Footer Info */}
        <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center justify-between mb-24">
            <div className="flex items-center gap-3">
                <img className="size-11 rounded-full border-2 border-primary/20" src={`https://picsum.photos/seed/${assigneeName}/100`} alt="" />
                <div>
                  <p className="text-sm font-black dark:text-white">{assigneeName}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">負責人</p>
                </div>
            </div>
            <div className="text-right">
              <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase ${
                task.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'
              }`}>{task.status}</span>
            </div>
        </div>
      </main>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-end justify-center px-4 pt-8 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="w-full max-w-[430px] max-h-[92vh] bg-white dark:bg-zinc-900 rounded-t-[40px] shadow-2xl border border-white/20 overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="shrink-0 p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-white italic">編輯任務</h3>
                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">更新後會同步至 Firestore</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} disabled={isSavingTaskEdit} className="size-8 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 active:scale-90 disabled:opacity-50">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 hide-scrollbar">
              <form onSubmit={handleSaveTaskEdit} className="space-y-6 pb-8">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1.5 ml-1">任務標題 *</p>
                    <input required type="text" className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-4 text-sm font-bold dark:text-white focus:ring-2 focus:ring-primary/20" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1.5 ml-1">工單編號</p>
                      <input type="text" className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl py-3 px-4 text-xs font-bold dark:text-white focus:ring-2 focus:ring-primary/20" value={editTicketNo} onChange={(e) => setEditTicketNo(e.target.value)} />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1.5 ml-1">截止日期</p>
                      <input type="date" className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl py-3 px-4 text-xs font-bold dark:text-white focus:ring-2 focus:ring-primary/20" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1.5 ml-1">外部 URL</p>
                    <input type="url" className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl py-3 px-4 text-xs font-bold dark:text-white focus:ring-2 focus:ring-primary/20" value={editTicketUrl} onChange={(e) => setEditTicketUrl(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1.5 ml-1">任務描述</p>
                    <textarea rows={3} className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl py-3 px-4 text-xs font-bold dark:text-white focus:ring-2 focus:ring-primary/20 resize-none" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1.5 ml-1">處理備註</p>
                    <textarea rows={3} className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl py-3 px-4 text-xs font-bold dark:text-white focus:ring-2 focus:ring-primary/20 resize-none" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1.5 ml-1">指派執行者</p>
                    <select className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl py-3 px-4 text-xs font-bold dark:text-white focus:ring-2 focus:ring-primary/20" value={editAssignee} onChange={(e) => setEditAssignee(e.target.value)}>
                      {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                      {members.every(m => m.name !== editAssignee) && editAssignee && <option value={editAssignee}>{editAssignee}</option>}
                    </select>
                    <p className="mt-1.5 text-[9px] font-bold leading-relaxed text-zinc-400">
                      目前指派對象為文字欄位 / 測試成員清單，正式成員系統尚未啟用。
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1.5 ml-1">優先權</p>
                    <div className="flex bg-zinc-50 dark:bg-zinc-800 p-1 rounded-2xl gap-1">
                      {(['LOW', 'MEDIUM', 'HIGH'] as Task['priority'][]).map(p => (
                        <button key={p} type="button" onClick={() => setEditPriority(p)} className={`flex-1 py-1.5 rounded-xl text-[8px] font-black transition-all ${editPriority === p ? (p === 'HIGH' ? 'bg-red-500 text-white' : p === 'MEDIUM' ? 'bg-amber-500 text-white' : 'bg-primary text-white') : 'text-zinc-400'}`}>
                          {p === 'HIGH' ? '高' : p === 'MEDIUM' ? '中' : '低'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1.5 ml-1">標籤</p>
                    <div className="bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl p-2 flex flex-wrap gap-2 items-center min-h-[46px] focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      {editTags.map(tag => (
                        <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-lg text-[10px] font-black uppercase">
                          {tag}
                          <button type="button" onClick={() => removeEditTag(tag)} className="hover:text-primary-green transition-colors">
                            <span className="material-symbols-outlined text-[12px] font-bold">close</span>
                          </button>
                        </span>
                      ))}
                      <input type="text" placeholder={editTags.length === 0 ? "前台, 後台, 訂單 (按 Enter 建立)" : ""} className="flex-1 bg-transparent border-none focus:ring-0 text-[11px] font-bold dark:text-white p-1 min-w-[120px]" value={editTagInput} onChange={(e) => setEditTagInput(e.target.value)} onKeyDown={handleEditTagInputKeyDown} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1.5 ml-1">識別色彩</p>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map(color => (
                        <button key={color} type="button" onClick={() => setEditColor(color)} className={`size-8 rounded-lg transition-all ring-offset-2 dark:ring-offset-zinc-900 shadow-sm ${editColor === color ? 'ring-2 ring-primary scale-110' : 'hover:scale-105 opacity-70'}`} style={{ backgroundColor: color }} />
                      ))}
                      <label className="size-8 rounded-lg transition-all ring-offset-2 dark:ring-offset-zinc-900 flex items-center justify-center cursor-pointer border-2 border-dashed border-gray-300 dark:border-zinc-700 opacity-70">
                        <span className="material-symbols-outlined text-[14px] text-gray-400">colorize</span>
                        <input type="color" className="sr-only" value={editColor} onChange={(e) => setEditColor(e.target.value)} />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-4 sticky bottom-0 bg-white dark:bg-zinc-900 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                  {editError && (
                    <p className="text-xs font-bold text-red-500 mb-3">{editError}</p>
                  )}
                  <button type="submit" disabled={isSavingTaskEdit} className="w-full h-14 bg-primary text-white rounded-[24px] font-black text-sm uppercase shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-60 disabled:active:scale-100">
                    {isSavingTaskEdit ? '儲存中...' : '儲存任務'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-t border-gray-100 dark:border-zinc-800 p-6 flex gap-4">
        {task.status === 'COMPLETED' ? (
          <button onClick={handleReopenTask} className="flex-1 h-16 bg-zinc-100 dark:bg-zinc-800 text-gray-600 dark:text-white rounded-[24px] font-black text-sm uppercase flex items-center justify-center gap-2 active:scale-95 transition-all"><span className="material-symbols-outlined">undo</span>重新啟動任務</button>
        ) : (
          <button onClick={handleCompleteTask} className="flex-1 h-16 bg-[#06C755] text-white rounded-[24px] font-black text-sm uppercase shadow-xl shadow-[#06C755]/20 flex items-center justify-center gap-2 active:scale-95 transition-all"><span className="material-symbols-outlined">task_alt</span>標記完成並結案</button>
        )}
        <button onClick={handleDeleteTask} disabled={isDeletingTask} className="size-16 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-[24px] flex items-center justify-center active:scale-90 transition-all disabled:opacity-60 disabled:active:scale-100"><span className="material-symbols-outlined">delete</span></button>
      </div>
    </div>
  );
};

const TimerDigit: React.FC<{ value: string; label: string; isActive?: boolean }> = ({ value, label, isActive }) => (
  <div className="flex flex-col items-center gap-2">
    <div className={`h-16 w-20 rounded-2xl flex items-center justify-center shadow-inner transition-colors ${isActive ? 'bg-primary/10' : 'bg-gray-50 dark:bg-zinc-800'}`}>
      <p className={`text-3xl font-black tracking-tight ${isActive ? 'text-primary animate-pulse' : 'dark:text-white'}`}>{value}</p>
    </div>
    <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest">{label}</p>
  </div>
);

export default TaskExecutionView;
