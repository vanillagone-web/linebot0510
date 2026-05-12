
import React, { useState, useEffect } from 'react';
import { ViewState, Task, SubTask, TaskHistoryEntry, Member } from '../types';

interface TaskExecutionViewProps {
  taskId: string | null;
  tasks: Task[];
  members: Member[];
  onNavigate: (view: ViewState) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onCompleteTask: (taskId: string) => Promise<Task>;
  onDeleteTask: (taskId: string) => Promise<void>;
}

const PRESET_COLORS = ['#17cfcf', '#10B981', '#F59E0B', '#E78278', '#8B5CF6', '#3B82F6', '#EC4899', '#64748B'];

const TaskExecutionView: React.FC<TaskExecutionViewProps> = ({ taskId, tasks, members, onNavigate, onUpdateTask, onCompleteTask, onDeleteTask }) => {
  const task = tasks.find(t => t.id === taskId) || tasks[0];
  
  // 計算累積工時秒數 (將 actualHours 轉回秒數)
  const initialSeconds = Math.round((task.actualHours || 0) * 3600);
  const [seconds, setSeconds] = useState(initialSeconds); 
  const [showCompleteSuccess, setShowCompleteSuccess] = useState(false);
  const [showAutoPauseHint, setShowAutoPauseHint] = useState(false);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [activeSubTaskPicker, setActiveSubTaskPicker] = useState<string | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  const isTaskRunning = task.status === 'IN_PROGRESS';

  // 每當 actualHours 改變（如在其他地方被更新），同步秒數
  useEffect(() => {
    setSeconds(Math.round((task.actualHours || 0) * 3600));
  }, [task.actualHours]);

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

  const addHistoryEntry = (action: string) => {
    const entry: TaskHistoryEntry = {
      timestamp: new Date().toLocaleString(),
      user: '王大同 (您)',
      action: action
    };
    return [...(task.history || []), entry];
  };

  const toggleTimer = () => {
    if (task.status === 'COMPLETED') return;

    if (!isTaskRunning) {
      // 啟動計時
      // 檢查是否會有其他任務被自動暫停
      const otherActiveTasks = tasks.filter(t => t.id !== task.id && t.assignee === task.assignee && t.status === 'IN_PROGRESS');
      if (otherActiveTasks.length > 0) {
        setShowAutoPauseHint(true);
        setTimeout(() => setShowAutoPauseHint(false), 3000);
      }

      onUpdateTask(task.id, {
        status: 'IN_PROGRESS',
        history: addHistoryEntry('🚀 啟動計時')
      });
    } else {
      // 暫停計時
      onUpdateTask(task.id, {
        status: 'PENDING',
        actualHours: seconds / 3600,
        history: addHistoryEntry('⏸ 暫停計時')
      });
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

  const handleReopenTask = () => {
    onUpdateTask(task.id, {
      status: 'PENDING',
      history: addHistoryEntry('🔓 重新啟動任務')
    });
  };

  const handleUpdateColor = (color: string) => {
    onUpdateTask(task.id, { 
      color,
      history: addHistoryEntry(`🎨 變更任務顏色為 ${color}`)
    });
  };

  const handleToggleSubTask = (subTaskId: string) => {
    const subTask = task.subTasks?.find(st => st.id === subTaskId);
    const updatedSubTasks = (task.subTasks || []).map(st => 
      st.id === subTaskId ? { ...st, isCompleted: !st.isCompleted } : st
    );
    onUpdateTask(task.id, { 
      subTasks: updatedSubTasks,
      history: addHistoryEntry(`${subTask?.isCompleted ? '↩️ 重設' : '🔘 完成'} 子任務: ${subTask?.title}`)
    });
  };

  const handleUpdateSubTaskAssignee = (subTaskId: string, assigneeId: string) => {
    const subTask = task.subTasks?.find(st => st.id === subTaskId);
    const member = members.find(m => m.id === assigneeId);
    const updatedSubTasks = (task.subTasks || []).map(st => 
      st.id === subTaskId ? { ...st, assigneeId } : st
    );
    onUpdateTask(task.id, { 
      subTasks: updatedSubTasks,
      history: addHistoryEntry(`👤 指派子任務 [${subTask?.title}] 給 ${member?.name}`)
    });
    setActiveSubTaskPicker(null);
  };

  const handleAddSubTask = () => {
    if (!newSubTaskTitle.trim()) return;
    const primaryAssignee = members.find(m => m.name === task.assignee);
    const defaultAssigneeId = primaryAssignee?.id || members[0]?.id;
    const newSub: SubTask = {
      id: Date.now().toString(),
      title: newSubTaskTitle.trim(),
      isCompleted: false,
      assigneeId: defaultAssigneeId
    };
    onUpdateTask(task.id, { 
      subTasks: [...(task.subTasks || []), newSub],
      history: addHistoryEntry(`➕ 新增子任務: ${newSub.title}`)
    });
    setNewSubTaskTitle('');
  };

  const handleDeleteSubTask = (subTaskId: string) => {
    const subTask = task.subTasks?.find(st => st.id === subTaskId);
    const updatedSubTasks = (task.subTasks || []).filter(st => st.id !== subTaskId);
    onUpdateTask(task.id, { 
      subTasks: updatedSubTasks,
      history: addHistoryEntry(`🗑️ 移除子任務: ${subTask?.title}`)
    });
  };

  const onDragStart = (index: number) => setDraggedItemIndex(index);
  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    const items = [...(task.subTasks || [])];
    const draggedItem = items[draggedItemIndex];
    items.splice(draggedItemIndex, 1);
    items.splice(index, 0, draggedItem);
    setDraggedItemIndex(index);
    onUpdateTask(task.id, { subTasks: items });
  };
  const onDragEnd = () => {
    setDraggedItemIndex(null);
    onUpdateTask(task.id, { history: addHistoryEntry('↕️ 重新排列了子任務順序') });
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
  const subtasks = task.subTasks || [];
  const completedSubTasks = subtasks.filter(st => st.isCompleted).length;
  const totalSubTasks = subtasks.length;
  const progressPercent = totalSubTasks > 0 ? (completedSubTasks / totalSubTasks) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-[#f8fafb] dark:bg-background-dark overflow-hidden relative font-jakarta">
      {/* 自動暫停提示 Toast */}
      {showAutoPauseHint && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[110] animate-in fade-in slide-in-from-top-4 w-[85%]">
           <div className="bg-zinc-900 text-white px-6 py-4 rounded-3xl text-[11px] font-black shadow-2xl flex items-center gap-3 border border-primary/30">
             <span className="material-symbols-outlined text-amber-500 animate-bounce">warning</span>
             偵測到其他進行中任務，已為您自動暫停以確保工時準確。
           </div>
        </div>
      )}

      {showCompleteSuccess && (
        <div className="absolute inset-0 z-[100] bg-[#06C755] flex flex-col items-center justify-center animate-in fade-in duration-500">
           <div className="size-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl animate-in zoom-in duration-500 delay-100">
             <span className="material-symbols-outlined text-[#06C755] text-6xl fill-icon">check_circle</span>
           </div>
           <h3 className="text-2xl font-black text-white">任務已完美結案！</h3>
           <p className="text-white/80 text-sm mt-2 font-bold tracking-widest uppercase">系統同步通知已發出</p>
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
        <div 
          className="size-4 rounded-full shadow-sm ring-2 ring-white dark:ring-zinc-800" 
          style={{ backgroundColor: task.color || '#17cfcf' }} 
        />
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
                     <button onClick={() => setActiveSubTaskPicker(activeSubTaskPicker === st.id ? null : st.id)} className="size-7 rounded-full overflow-hidden border-2 border-zinc-100 dark:border-zinc-800 transition-all">
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
                <img className="size-11 rounded-full border-2 border-primary/20" src={`https://picsum.photos/seed/${task.assignee}/100`} alt="" />
                <div>
                  <p className="text-sm font-black dark:text-white">{task.assignee}</p>
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
