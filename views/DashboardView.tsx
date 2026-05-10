
import React from 'react';
import { ViewState, Member, Group, Task } from '../types';
import BottomNavBar from '../components/BottomNavBar';

interface DashboardViewProps {
  onNavigate: (view: ViewState) => void;
  onSelectTask: (taskId: string) => void;
  members: Member[];
  tasks: Task[];
  currentUser: Member;
  activeGroup: Group;
  onAddMember: (member: Member) => void;
  onDeleteMember: (memberId: string) => void;
  onSwitchUser: (member: Member) => void;
  onUpdateMember: (memberId: string, updates: Partial<Member>) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ 
  onNavigate, 
  onSelectTask, 
  members, 
  tasks,
  currentUser, 
  activeGroup, 
  onUpdateMember 
}) => {
  const isAdmin = currentUser.role === 'ADMIN';

  const toggleRole = (member: Member) => {
    if (!isAdmin || member.id === currentUser.id) return;
    const newRole = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    onUpdateMember(member.id, { role: newRole });
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafb] dark:bg-zinc-950 font-jakarta">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 px-6 py-5 shrink-0 shadow-sm">
        <h1 className="text-xl font-black text-zinc-900 dark:text-white leading-tight">群組成員管理</h1>
        <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mt-1">{activeGroup.name}</p>
      </div>

      <main className="flex-1 overflow-y-auto px-6 pb-40 hide-scrollbar">
        <div className="mt-8 mb-6 flex items-center justify-between">
          <h3 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
            群組內連動成員 ({members.length})
          </h3>
          {isAdmin && (
            <span className="text-[9px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase">
              您具備管理權限
            </span>
          )}
        </div>
        
        <div className="space-y-4">
          {members.map(member => {
            // Admin 特有功能：尋找成員正在處理的任務
            const activeTask = isAdmin ? tasks.find(t => t.assignee === member.name && t.status === 'IN_PROGRESS') : null;

            return (
              <div key={member.id} className="bg-white dark:bg-zinc-900 p-5 rounded-[32px] flex flex-col gap-4 border border-gray-50 dark:border-zinc-800 shadow-sm transition-all group">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                          <img src={member.avatar} className="size-14 rounded-2xl shadow-sm border-2 border-white dark:border-zinc-800" alt="" />
                          <div className={`absolute -bottom-1 -right-1 size-6 border-2 border-white dark:border-zinc-900 rounded-full flex items-center justify-center ${member.status === 'ACTIVE' ? 'bg-[#06C755]' : 'bg-gray-400'}`}>
                            <span className="material-symbols-outlined text-[12px] text-white fill-icon">smart_toy</span>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-zinc-900 dark:text-white">{member.name}</h4>
                          <div className="flex items-center gap-2 mt-1.5">
                            <button 
                              onClick={() => toggleRole(member)}
                              disabled={!isAdmin || member.id === currentUser.id}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${
                                member.role === 'ADMIN' 
                                  ? 'bg-primary text-white shadow-md shadow-primary/20' 
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
                              } ${isAdmin && member.id !== currentUser.id ? 'active:scale-95 cursor-pointer hover:ring-2 hover:ring-primary/30' : 'cursor-default'}`}
                            >
                              {member.role === 'ADMIN' && <span className="material-symbols-outlined text-[11px] fill-icon">crown</span>}
                              {member.role === 'ADMIN' ? 'Admin' : 'Member'}
                              {isAdmin && member.id !== currentUser.id && (
                                <span className="material-symbols-outlined text-[10px] ml-0.5 opacity-50">sync_alt</span>
                              )}
                            </button>
                          </div>
                        </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-black text-primary">{member.productivity}%</p>
                      <p className="text-[8px] text-zinc-400 dark:text-zinc-600 font-black uppercase tracking-widest">完成率</p>
                    </div>
                 </div>

                 {/* Admin Only: 成員目前任務 */}
                 {isAdmin && (
                   <div className="pt-3 border-t border-gray-50 dark:border-zinc-800">
                     {activeTask ? (
                       <div 
                         onClick={() => onSelectTask(activeTask.id)}
                         className="flex items-center gap-2 bg-primary/5 dark:bg-primary/10 p-2.5 rounded-2xl border border-primary/10 cursor-pointer active:scale-95 transition-all"
                       >
                         <div className="size-2 bg-primary rounded-full animate-pulse shrink-0" />
                         <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest shrink-0">正在處理：</p>
                         <p className="text-[11px] font-bold text-primary truncate flex-1">{activeTask.title}</p>
                         <span className="material-symbols-outlined text-primary text-sm">arrow_forward</span>
                       </div>
                     ) : (
                       <div className="flex items-center gap-2 px-1">
                         <div className="size-2 bg-gray-200 dark:bg-zinc-800 rounded-full shrink-0" />
                         <p className="text-[10px] font-bold text-gray-400 italic">目前無進行中的任務</p>
                       </div>
                     )}
                   </div>
                 )}
              </div>
            );
          })}
          
          {members.length === 0 && (
            <div className="text-center py-20 bg-white dark:bg-zinc-900/50 rounded-[40px] border-2 border-dashed border-gray-100 dark:border-zinc-800">
              <span className="material-symbols-outlined text-zinc-200 dark:text-zinc-800 text-6xl">person_off</span>
              <p className="text-xs text-zinc-400 font-bold uppercase mt-4">此群組尚未有成員連動機器人</p>
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="mt-10 bg-zinc-900 dark:bg-zinc-800 rounded-[40px] p-8 shadow-xl">
            <h4 className="text-xs font-black uppercase mb-4 text-primary tracking-[0.2em] flex items-center gap-2">
              <span className="material-symbols-outlined text-base">security</span>
              管理員操作指南
            </h4>
            <ul className="space-y-3 text-[11px] text-zinc-400 font-medium">
              <li className="flex gap-2">
                <span className="text-primary-green">●</span> 管理員專屬：您可以即時查看成員「進行中」的任務內容。
              </li>
              <li className="flex gap-2">
                <span className="text-primary-green">●</span> 點擊成員的任務標籤可直接跳轉至該任務詳情。
              </li>
              <li className="flex gap-2">
                <span className="text-primary-green">●</span> 成員角色切換：點擊角色標籤即可更新權限。
              </li>
            </ul>
          </div>
        )}

        <div className="mt-8 p-8 bg-primary/5 border-2 border-dashed border-primary/20 rounded-[40px] text-center mb-10">
           <h4 className="text-sm font-black text-zinc-900 dark:text-white mb-2">成員如何加入？</h4>
           <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
             成員需在 LINE 群組中點擊機器人提供的「個人中心」連結，完成官方帳號登入連動後，才會自動同步至此清單。
           </p>
        </div>
      </main>

      <BottomNavBar currentView="DASHBOARD" onNavigate={onNavigate} />
    </div>
  );
};

export default DashboardView;
