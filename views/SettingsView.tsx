
import React, { useState } from 'react';
import { ViewState, Member } from '../types';
import BottomNavBar from '../components/BottomNavBar';

interface SettingsViewProps {
  onNavigate: (view: ViewState) => void;
  members: Member[];
  currentUser: Member;
  onSwitchUser: (member: Member) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onNavigate, members, currentUser, onSwitchUser }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(currentUser.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafb] dark:bg-background-dark font-jakarta">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 px-6 py-5 shrink-0 shadow-sm">
        <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight text-center">個人與偏好設定</h2>
      </div>

      <main className="flex-1 overflow-y-auto px-6 space-y-8 py-6 pb-40 hide-scrollbar">
        {/* Profile Card */}
        <section className="bg-white dark:bg-zinc-900 rounded-[40px] p-8 shadow-sm border border-gray-50 dark:border-zinc-800 flex flex-col items-center">
           <div className="relative mb-4">
              <img src={currentUser.avatar} className="size-24 rounded-full border-4 border-primary/10 p-1 shadow-md bg-white" alt="" />
              <div className="absolute -bottom-1 -right-1 size-8 bg-primary text-white rounded-full flex items-center justify-center border-4 border-white dark:border-zinc-900 shadow-lg">
                <span className="material-symbols-outlined text-sm">edit</span>
              </div>
           </div>
           <h3 className="text-xl font-black text-zinc-900 dark:text-white">{currentUser.name}</h3>
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">
             {currentUser.role === 'ADMIN' ? '👑 系統管理員' : '團隊成員'}
           </p>

           <div className="mt-8 w-full space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase text-center tracking-widest">系統識別 ID (Admin 配置用)</p>
              <div 
                onClick={handleCopyId}
                className="w-full p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-between cursor-pointer border-2 border-transparent active:border-primary hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-gray-400 group-hover:text-primary transition-colors">fingerprint</span>
                  <p className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">
                    {currentUser.id}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {copied && <span className="text-[9px] font-black text-primary uppercase animate-in fade-in slide-in-from-right-2">已複製</span>}
                  <span className={`material-symbols-outlined text-sm ${copied ? 'text-primary' : 'text-zinc-300'}`}>
                    {copied ? 'check_circle' : 'content_copy'}
                  </span>
                </div>
              </div>
           </div>
        </section>

        {/* LINE Developer Settings (Admin Only) */}
        {currentUser.role === 'ADMIN' && (
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase text-primary tracking-widest ml-1">LINE 開發者設定 (管理員)</h3>
            <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 shadow-sm border-2 border-primary/20">
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Webhook URL</p>
                  <div 
                    onClick={() => {
                      const url = `${window.location.origin}/webhook`;
                      navigator.clipboard.writeText(url);
                      alert('Webhook URL 已複製！');
                    }}
                    className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-dashed border-primary/30 cursor-pointer hover:bg-primary/5 transition-colors group"
                  >
                    <p className="text-[10px] font-mono break-all text-zinc-600 dark:text-zinc-400 group-hover:text-primary">
                      {window.location.origin}/webhook
                    </p>
                  </div>
                </div>
                
                <a 
                  href="https://developers.line.biz/console/" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  前往 LINE Console
                </a>
              </div>
            </div>
          </section>
        )}

        {/* 身分切換 (開發/測試用) */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">快速切換測試身分</h3>
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-4 shadow-sm border border-gray-50 dark:border-zinc-800 overflow-x-auto no-scrollbar flex gap-4">
            {members.map(m => (
              <button 
                key={m.id}
                onClick={() => onSwitchUser(m)}
                className={`flex items-center gap-3 shrink-0 p-3 rounded-2xl border-2 transition-all ${m.id === currentUser.id ? 'bg-primary/5 border-primary' : 'border-transparent bg-zinc-50 dark:bg-zinc-800'}`}
              >
                <img src={m.avatar} className="size-10 rounded-full bg-white shadow-sm" alt="" />
                <div className="text-left">
                  <p className="text-xs font-black text-zinc-900 dark:text-white">{m.name.split(' ')[0]}</p>
                  <p className="text-[8px] text-gray-400 font-bold uppercase">{m.role}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* 系統設定清單 */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">應用程式設定</h3>
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] overflow-hidden border border-gray-50 dark:border-zinc-800">
            <SettingItem icon="notifications" label="推播通知管理" />
            <SettingItem icon="palette" label="外觀樣式切換" />
            <SettingItem icon="lock" label="LINE 連動與隱私" />
            <button 
              onClick={() => onNavigate('HELP')}
              className="w-full flex items-center justify-between p-5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-gray-400">help</span>
                <span className="text-sm font-bold text-zinc-900 dark:text-white">使用幫助與教學</span>
              </div>
              <span className="material-symbols-outlined text-zinc-300 text-sm">chevron_right</span>
            </button>
          </div>
        </section>

        <button 
          onClick={() => onNavigate('LOGIN')}
          className="w-full h-16 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-[24px] font-black text-sm uppercase flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined">logout</span>
          登出系統
        </button>
      </main>

      <BottomNavBar currentView="SETTINGS" onNavigate={onNavigate} />
    </div>
  );
};

const SettingItem: React.FC<{ icon: string; label: string; border?: boolean }> = ({ icon, label, border = true }) => (
  <button className={`w-full flex items-center justify-between p-5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${border ? 'border-b border-gray-50 dark:border-zinc-800' : ''}`}>
    <div className="flex items-center gap-4">
      <span className="material-symbols-outlined text-gray-400">{icon}</span>
      <span className="text-sm font-bold text-zinc-900 dark:text-white">{label}</span>
    </div>
    <span className="material-symbols-outlined text-zinc-300 text-sm">chevron_right</span>
  </button>
);

export default SettingsView;
