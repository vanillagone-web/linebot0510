
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
        {/* Current Stable Features */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined font-black">verified</span>
            <h3 className="text-xs font-black uppercase tracking-widest">目前正式可用</h3>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 border border-gray-100 dark:border-zinc-800 shadow-sm">
            <ul className="grid grid-cols-1 gap-3 text-xs text-zinc-500 dark:text-zinc-400 font-bold leading-relaxed">
              <li>任務列表、搜尋與狀態 / 優先級 / 日期 / 標籤篩選。</li>
              <li>新增、編輯、完成、刪除任務，並同步保存到 Firestore。</li>
              <li>到期提示、日曆檢視與 Excel 匯出。</li>
              <li>LIFF 個人任務會與 LINE Bot 個人任務共用同一份資料。</li>
              <li>LINE Bot 支援說明、新增、查看、完成與刪除任務基本指令。</li>
            </ul>
          </div>
        </section>

        {/* Section 1: Core Logic */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined font-black">timer</span>
            <h3 className="text-xs font-black uppercase tracking-widest">任務計時狀態</h3>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 border border-gray-100 dark:border-zinc-800 shadow-sm space-y-4">
             <div className="flex gap-4">
                <div className="size-8 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-sm font-black">looks_one</span>
                </div>
                <div>
                   <h4 className="text-sm font-black dark:text-white mb-1">計時器可記錄目前任務</h4>
                   <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                     任務詳情頁可更新任務狀態與實際工時，適合用來記錄個人進度。
                   </p>
                </div>
             </div>
             <div className="flex gap-4">
                <div className="size-8 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-sm font-black">sync_alt</span>
                </div>
                <div>
                   <h4 className="text-sm font-black dark:text-white mb-1">自動暫停其他任務：規劃中</h4>
                   <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                     目前不會自動暫停其他進行中任務。若需要單一任務專注規則，後續會另行實作與測試。
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
                   Dashboard 成員管理：測試中
                </h4>
                <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                   Dashboard 目前已從主導覽隱藏，成員與權限資料仍屬測試資料。角色切換不會保存，也不會影響正式權限。
                </p>
             </div>
             
             <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 border border-gray-100 dark:border-zinc-800 shadow-sm">
                <h4 className="text-sm font-black dark:text-white mb-2 flex items-center gap-2">
                   <span className="material-symbols-outlined text-primary text-sm">cloud_sync</span>
                   Google Sheets 同步：暫未啟用
                </h4>
                <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
                   目前保留 Excel 匯出作為正式可用功能；Google Sheets 同步入口已暫時隱藏，尚未接上正式後端同步流程。
                </p>
             </div>
          </div>
        </section>

        {/* Section 3: Smart Assistant */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined font-black">smart_toy</span>
            <h3 className="text-xs font-black uppercase tracking-widest">AI 智慧助手：暫未啟用</h3>
          </div>
          <div className="bg-primary/5 rounded-[40px] p-8 border-2 border-dashed border-primary/20 space-y-6">
             <div className="space-y-2">
                <p className="text-[11px] font-black text-primary uppercase">目前狀態</p>
                <p className="text-sm font-bold dark:text-white">AI 助手目前不會呼叫 Gemini / AI API。</p>
                <p className="text-xs text-zinc-400 leading-relaxed">Chat 頁僅保留暫停提示與本地任務摘要，避免前端暴露 AI key 或產生不可控費用。</p>
             </div>
             <div className="space-y-2">
                <p className="text-[11px] font-black text-primary uppercase">未來規劃</p>
                <p className="text-sm font-bold dark:text-white">若恢復 AI 功能，應改走後端 proxy。</p>
                <p className="text-xs text-zinc-400 leading-relaxed">正式方案需包含權限檢查、rate limit、費用控制與後端金鑰保護。</p>
             </div>
          </div>
        </section>

        {/* Planned Features */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined font-black">pending_actions</span>
            <h3 className="text-xs font-black uppercase tracking-widest">暫未啟用 / 規劃中</h3>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 border border-gray-100 dark:border-zinc-800 shadow-sm">
            <ul className="space-y-3 text-xs text-zinc-500 dark:text-zinc-400 font-bold leading-relaxed">
              <li>AI 智慧助手：暫未啟用，目前不呼叫 Gemini / AI API。</li>
              <li>Google Sheets 同步：暫未啟用，目前僅保留 Excel 匯出。</li>
              <li>Dashboard 成員管理與權限角色：測試中，資料不會保存。</li>
              <li>任務指派：目前保存為文字欄位，指派選單仍使用測試成員清單；正式成員、角色與權限系統規劃中。</li>
              <li>自動提醒 / push reminder：規劃中，尚未接排程或推播。</li>
              <li>自動暫停其他進行中任務：規劃中，目前不會自動處理。</li>
            </ul>
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
                   目前系統不會自動暫停其他任務。如果未來啟用單一任務專注規則，會在正式版本紀錄中明確標示。
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
