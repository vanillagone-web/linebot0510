
import React from 'react';
import { ViewState } from '../types';
import BottomNavBar from '../components/BottomNavBar';

interface HelpViewProps {
  onNavigate: (view: ViewState) => void;
}

const HelpView: React.FC<HelpViewProps> = ({ onNavigate }) => {
  return (
    <div className="flex flex-col h-full bg-[#f8fafb] dark:bg-zinc-950 font-jakarta">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800 px-6 py-5 shrink-0 flex items-center gap-4 shadow-sm">
        <button 
          onClick={() => onNavigate('SETTINGS')} 
          className="size-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center active:scale-90 transition-all text-zinc-600 dark:text-zinc-300"
        >
          <span className="material-symbols-outlined font-black text-xl">arrow_back</span>
        </button>
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">使用幫助與教學</h2>
          <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-0.5">User Manual v2.5</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-8 space-y-10 hide-scrollbar pb-40">
        {/* Section 1: Core Logic */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined font-black">timer</span>
            <h3 className="text-xs font-black uppercase tracking-widest">任務計時核心邏輯</h3>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 border border-gray-100 dark:border-zinc-800 shadow-sm space-y-4">
             <div className="flex gap-4">
                <div className="size-8 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-sm font-black">looks_one</span>
                </div>
                <div>
                   <h4 className="text-sm font-black dark:text-white mb-1">單一任務專注原則</h4>
                   <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                     為了確保工時統計的精確性，系統限制成員同一時間<span className="text-primary font-bold font-black">只能處理一個</span>任務。
                   </p>
                </div>
             </div>
             <div className="flex gap-4">
                <div className="size-8 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-sm font-black">sync_alt</span>
                </div>
                <div>
                   <h4 className="text-sm font-black dark:text-white mb-1">自動暫停機制</h4>
                   <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                     當您在執行畫面點擊「啟動計時」時，系統會自動將您原本正在處理的其他任務設為「暫停」，並記錄在異動歷程中。
                   </p>
                </div>
             </div>
          </div>
        </section>

        {/* Section 2: Management */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined font-black">security</span>
            <h3 className="text-xs font-black uppercase tracking-widest">管理員功能指南</h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
             <div className="bg-zinc-900 rounded-[32px] p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-16 translate-x-16" />
                <h4 className="text-sm font-black text-white mb-2 flex items-center gap-2">
                   <span className="material-symbols-outlined text-primary text-sm">visibility</span>
                   成員即時監控
                </h4>
                <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                   管理員在「成員管理 (Dashboard)」頁面中，可以即時看到每位成員目前「正在處理中」的任務名稱。點擊任務標籤可快速切換至該任務執行介面。
                </p>
             </div>
             
             <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 border border-gray-100 dark:border-zinc-800 shadow-sm">
                <h4 className="text-sm font-black dark:text-white mb-2 flex items-center gap-2">
                   <span className="material-symbols-outlined text-primary text-sm">cloud_sync</span>
                   Google Sheets 同步
                </h4>
                <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
                   在數據中心 (Stats) 內，管理員可將當前任務列表一鍵同步至 Google Sheets。系統會自動根據任務 ID 進行去重與更新。
                </p>
             </div>
          </div>
        </section>

        {/* Section 3: Smart Assistant */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined font-black">smart_toy</span>
            <h3 className="text-xs font-black uppercase tracking-widest">AI 智慧助手應用</h3>
          </div>
          <div className="bg-primary/5 rounded-[40px] p-8 border-2 border-dashed border-primary/20 space-y-6">
             <div className="space-y-2">
                <p className="text-[11px] font-black text-primary uppercase">問法範例一</p>
                <p className="text-sm font-bold dark:text-white">「誰目前身上任務最重？」</p>
                <p className="text-xs text-zinc-400 leading-relaxed">AI 會分析成員剩餘任務量並給予建議。</p>
             </div>
             <div className="space-y-2">
                <p className="text-[11px] font-black text-primary uppercase">問法範例二</p>
                <p className="text-sm font-bold dark:text-white">「幫我總結目前的任務進度與瓶頸」</p>
                <p className="text-xs text-zinc-400 leading-relaxed">AI 會快速彙整所有狀態，並標記過期或高優先權任務。</p>
             </div>
          </div>
        </section>

        {/* Action Button to return */}
        <section className="py-4">
           <button 
             onClick={() => onNavigate('TASK_LIST')}
             className="w-full h-16 bg-primary text-white rounded-[24px] font-black text-sm uppercase shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
           >
             <span className="material-symbols-outlined">rocket_launch</span>
             看完教學，立即開始工作
           </button>
        </section>

        {/* FAQ Section */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1 text-center">常見問題 FAQ</h3>
          <div className="space-y-3">
             <details className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden group">
                <summary className="p-4 text-xs font-black dark:text-white cursor-pointer flex items-center justify-between outline-none">
                   Q: 為什麼我的任務自動暫停了？
                   <span className="material-symbols-outlined text-sm group-open:rotate-180 transition-transform">expand_more</span>
                </summary>
                <div className="px-4 pb-4 text-xs text-zinc-500 leading-relaxed">
                   因為您在同一時間開啟了另一個任務。系統預設成員只能處理一個任務，以防止工時重複計算。
                </div>
             </details>
             <details className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden group">
                <summary className="p-4 text-xs font-black dark:text-white cursor-pointer flex items-center justify-between outline-none">
                   Q: 我可以手動更改任務 ID 嗎？
                   <span className="material-symbols-outlined text-sm group-open:rotate-180 transition-transform">expand_more</span>
                </summary>
                <div className="px-4 pb-4 text-xs text-zinc-500 leading-relaxed">
                   不行。系統使用自動分配的流水 ID 作為唯一的同步關鍵字。不過您可以自由編輯「工單編號」。
                </div>
             </details>
          </div>
        </section>
      </main>

      {/* 底部導航列，確保隨時可返回 */}
      <BottomNavBar currentView="SETTINGS" onNavigate={onNavigate} />
    </div>
  );
};

export default HelpView;
