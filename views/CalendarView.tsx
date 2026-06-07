
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ViewState, Task } from '../types';
import BottomNavBar from '../components/BottomNavBar';

interface CalendarViewProps {
  onNavigate: (view: ViewState) => void;
  onSelectTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => Promise<Task>;
  tasks: Task[];
  initialDate?: Date;
}

const parseTaskDueDate = (dueDate: string | undefined, fallbackYear: number): Date | null => {
  const value = dueDate?.trim();
  if (!value) return null;

  const today = new Date();
  if (value.includes('今天') || value.includes('小時內')) {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }
  if (value.includes('昨天')) {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  }

  const datePart = value.split(' ')[0].split('T')[0];
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
  if (slashParts.length === 2) {
    const [month, day] = slashParts.map(Number);
    if (Number.isInteger(month) && Number.isInteger(day)) {
      return new Date(fallbackYear, month - 1, day);
    }
  }

  return null;
};

const getTaskAssigneeName = (task: Task) => {
  const name = task.assigneeName || task.assignee || '';
  return name.trim() || '未指派';
};

const CalendarView: React.FC<CalendarViewProps> = ({ onNavigate, onSelectTask, onCompleteTask, tasks, initialDate }) => {
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const agendaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialDate) {
      setCurrentDate(initialDate);
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const days = [];
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, month: month - 1, year: year, currentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, month: month, year: year, currentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, month: month + 1, year: year, currentMonth: false });
    }
    return days;
  }, [currentDate]);

  const getTasksForDay = (day: number, month: number, year: number) => {
    const results: { task: Task }[] = [];
    tasks.forEach(t => {
      const tDate = parseTaskDueDate(t.dueDate, year);

      if (tDate && tDate.getDate() === day && tDate.getMonth() === month && tDate.getFullYear() === year) {
        results.push({ task: t });
      }
    });
    return results;
  };

  const dayData = getTasksForDay(selectedDate.getDate(), selectedDate.getMonth(), selectedDate.getFullYear());

  const handleDateClick = (d: any) => {
    if (!d.currentMonth) return;
    const newDate = new Date(d.year, d.month, d.day);
    setSelectedDate(newDate);
    setTimeout(() => {
      agendaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const isSelected = (d: any) => 
    d.day === selectedDate.getDate() && d.month === selectedDate.getMonth() && d.year === selectedDate.getFullYear();

  const isToday = (d: any) => {
    const today = new Date();
    return d.day === today.getDate() && d.month === today.getMonth() && d.year === today.getFullYear();
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafb] dark:bg-zinc-950 font-jakarta">
      <header className="bg-white dark:bg-zinc-900 px-6 py-5 flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 sticky top-0 z-10 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="size-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
            <span className="material-symbols-outlined font-black">calendar_month</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">任務日曆</h1>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">Timeline View</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar scroll-smooth">
        <section className="bg-white dark:bg-zinc-900 p-6 pb-8 rounded-b-[48px] shadow-sm mb-4 border-b border-gray-50 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="size-12 flex items-center justify-center text-zinc-400 bg-zinc-50 dark:bg-zinc-800 rounded-2xl active:scale-90 transition-all">
              <span className="material-symbols-outlined font-black">chevron_left</span>
            </button>
            <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">
              {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
            </h2>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="size-12 flex items-center justify-center text-zinc-400 bg-zinc-50 dark:bg-zinc-800 rounded-2xl active:scale-90 transition-all">
              <span className="material-symbols-outlined font-black">chevron_right</span>
            </button>
          </div>
          <div className="grid grid-cols-7 gap-y-3">
            {['日', '一', '二', '三', '四', '五', '六'].map(w => (
              <div key={w} className="text-center text-[10px] font-black text-zinc-300 dark:text-zinc-600 uppercase mb-2">{w}</div>
            ))}
            {calendarData.map((d, i) => {
              const dayTasks = getTasksForDay(d.day, d.month, d.year);
              return (
                <button key={i} onClick={() => handleDateClick(d)} className={`h-16 flex flex-col items-center justify-start rounded-2xl transition-all relative ${isSelected(d) ? 'bg-primary/5' : ''}`}>
                  <div className={`size-10 flex items-center justify-center rounded-2xl font-black text-sm transition-all mb-1 ${isSelected(d) ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110' : isToday(d) ? 'text-primary bg-primary/10 ring-2 ring-primary/20' : !d.currentMonth ? 'text-zinc-200 dark:text-zinc-800' : 'text-zinc-600 dark:text-zinc-300'}`}>
                    {d.day}
                  </div>
                  <div className="flex gap-0.5 justify-center flex-wrap max-w-[80%] absolute bottom-2">
                    {dayTasks.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="size-1.5 rounded-full" style={{ backgroundColor: item.task.color || '#17cfcf' }} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section ref={agendaRef} className="px-6 pb-44 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between py-8">
            <h3 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">
              {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日 任務詳情
            </h3>
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full shadow-sm">
              {dayData.length} 項
            </span>
          </div>
          {dayData.length > 0 ? (
            <div className="space-y-4">
              {dayData.map((item, idx) => {
                const taskBaseColor = item.task.color || '#17cfcf';
                return (
                  <div 
                    key={idx} 
                    className={`rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-zinc-800 transition-all hover:shadow-md ${item.task.status === 'COMPLETED' ? 'opacity-60 grayscale' : ''}`}
                    style={{ 
                      borderLeft: `6px solid ${taskBaseColor}`,
                      backgroundColor: `${taskBaseColor}12`
                    }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0 pr-4" onClick={() => onSelectTask(item.task.id)}>
                        <h4 className="font-black text-zinc-900 dark:text-white text-base truncate cursor-pointer hover:text-primary transition-colors">{item.task.title}</h4>
                        <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: taskBaseColor }}>
                          @{getTaskAssigneeName(item.task)} • {item.task.priority}
                        </p>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${item.task.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-white/80 dark:bg-black/20 text-zinc-600'}`}>
                        {item.task.status}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => onSelectTask(item.task.id)} className="flex-1 h-11 bg-white/60 dark:bg-white/5 rounded-xl flex items-center justify-center gap-2 text-zinc-500 dark:text-zinc-300 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-sm">
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        查看詳情
                      </button>
                      {item.task.status !== 'COMPLETED' && (
                        <button onClick={(e) => { e.stopPropagation(); onCompleteTask(item.task.id); }} className="flex-1 h-11 bg-white dark:bg-white/10 text-primary rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-sm">
                          <span className="material-symbols-outlined text-sm">task_alt</span>
                          快速完成
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-[48px] p-12 border border-gray-50 dark:border-zinc-800 shadow-sm flex flex-col items-center text-center">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/5 to-transparent" />
              <div className="size-24 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-6 relative shadow-inner">
                 <span className="material-symbols-outlined text-4xl animate-pulse font-black">event_available</span>
              </div>
              <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-2 tracking-tight italic">今日無截止任務</h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium leading-relaxed mb-8 max-w-[220px]">太棒了！這天目前很清爽。</p>
              <button onClick={() => onNavigate('TASK_LIST')} className="h-14 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-8 rounded-2xl font-black text-[10px] shadow-xl active:scale-95 transition-all flex items-center gap-2 uppercase tracking-widest">前往任務清單<span className="material-symbols-outlined text-base">arrow_forward</span></button>
            </div>
          )}
        </section>
      </main>
      <BottomNavBar currentView="CALENDAR" onNavigate={onNavigate} />
    </div>
  );
};

export default CalendarView;
