
import React, { useState, useMemo } from 'react';
import { ViewState, Task, Member } from '../types';
import BottomNavBar from '../components/BottomNavBar';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import * as XLSX from 'xlsx';

interface StatsViewProps {
  onNavigate: (view: ViewState) => void;
  tasks: Task[];
  currentUser: Member;
}

const DEFAULT_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxBidXkZO-w8ci7Nc_y2ohDGZCXFZEu45Ors66cpCCQa6lfR8WHuHNdYx826AcST5Qk/exec";
const COLORS = ['#17cfcf', '#8B5CF6', '#F59E0B', '#10B981', '#E78278', '#3B82F6', '#EC4899'];

type TimeRange = 'WEEK' | 'MONTH' | 'ALL';

const getTaskAssigneeName = (task: Task) => {
  const name = task.assigneeName || task.assignee || '';
  return name.trim() || '未指派';
};

const StatsView: React.FC<StatsViewProps> = ({ onNavigate, tasks, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TIME_ANALYSIS' | 'SYNC_LOG'>('OVERVIEW');
  const [timeRange] = useState<TimeRange>('ALL');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<{time: string, msg: string, type: 'info' | 'success' | 'error'}[]>([]);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => localStorage.getItem('last_sheets_sync') || "尚未同步");

  const isAdmin = currentUser.role === 'ADMIN';

  // Filter tasks based on selected time range
  const filteredTasks = useMemo(() => {
    if (timeRange === 'ALL') return tasks;
    const now = new Date();
    const days = timeRange === 'WEEK' ? 7 : 30;
    const cutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    return tasks.filter(t => new Date(t.createdAt) >= cutoff);
  }, [tasks, timeRange]);

  // Calculate high-level summary statistics
  const summary = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(t => t.status === 'COMPLETED').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, rate };
  }, [filteredTasks]);

  // Aggregate tag data for the pie chart
  const tagData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTasks.forEach(t => {
      t.tags?.forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [filteredTasks]);

  // Prepare data for the comparison bar chart
  const chartData = useMemo(() => {
    return filteredTasks
      .filter(t => t.status === 'COMPLETED')
      .slice(-6)
      .map(t => ({
        name: t.title.substring(0, 4),
        estimated: t.estimatedHours ?? 0,
        actual: t.actualHours ?? 0,
      }));
  }, [filteredTasks]);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setSyncLogs(prev => [{ time, msg, type }, ...prev].slice(0, 30));
  };

  const handleExportExcel = () => {
    const exportData = tasks.map(t => ({ 
      '任務ID': t.id, 
      '工單編號': t.ticketNo || '', 
      '標題': t.title, 
      '負責人': getTaskAssigneeName(t), 
      '狀態': t.status, 
      '優先級': t.priority,
      '截止日期': t.dueDate,
      '工單URL': t.ticketUrl || '',
      '標籤': (t.tags || []).join(', '),
      '備註': t.notes || '',
      '預估工時': t.estimatedHours ?? 0,
      '實際工時': t.actualHours ?? 0,
      '建立時間': t.createdAt,
      '最後更新': t.updatedAt 
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");
    XLSX.writeFile(workbook, `TaskReport_${new Date().toISOString().split('T')[0]}.xlsx`);
    setExportMessage("✅ Excel 報表已導出");
    setTimeout(() => setExportMessage(null), 3000);
  };

  const handleSyncToGoogleSheets = async () => {
    if (!isAdmin || tasks.length === 0) return;
    setIsSyncing(true);
    setActiveTab('SYNC_LOG');
    addLog("--- 開始任務同步 (去重檢查模式) ---", "info");
    
    try {
      const syncPayload = tasks.map(t => {
        const cleanId = /^\d+$/.test(t.id) ? Number(t.id) : t.id;
        
        return {
          serial_id: cleanId,
          group_id: t.groupId,
          ticket_no: t.ticketNo || "", 
          title: t.title,
          assignee: getTaskAssigneeName(t),
          status: t.status,
          priority: t.priority,
          due_date: t.dueDate,
          est_hours: t.estimatedHours || 0,
          act_hours: t.actualHours || 0,
          updated_at: t.updatedAt
        };
      });

      addLog(`資料準備完成，共 ${syncPayload.length} 筆任務。`, "info");

      await fetch(DEFAULT_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify(syncPayload)
      });
      
      const now = new Date().toLocaleString();
      setLastSyncTime(now);
      localStorage.setItem('last_sheets_sync', now);
      
      addLog("✅ 同步請求已送達雲端。", "success");
    } catch (err) {
      addLog(`通訊異常: ${err instanceof Error ? err.message : 'Unknown error'}`, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafb] dark:bg-zinc-950 font-jakarta relative">
      {exportMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 w-[85%]">
           <div className="bg-zinc-900 text-white px-6 py-4 rounded-3xl text-[11px] font-black shadow-2xl flex items-center gap-3">
             <span className="material-symbols-outlined text-primary">analytics</span>
             {exportMessage}
           </div>
        </div>
      )}

      <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800 px-6 py-5 shrink-0 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight italic">數據分析中心</h2>
          <div className="flex gap-2">
            <button onClick={handleExportExcel} className="size-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-600 dark:text-zinc-400 active:scale-90 transition-transform">
              <span className="material-symbols-outlined font-black">table_view</span>
            </button>
          </div>
        </div>
        
        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl gap-1 mb-4">
          {(['OVERVIEW', 'TIME_ANALYSIS', 'SYNC_LOG'] as const).map((tab) => {
            if (tab === 'SYNC_LOG') return null;
            return (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 dark:text-zinc-500'}`}>
                {tab === 'OVERVIEW' ? '概覽' : tab === 'TIME_ANALYSIS' ? '效能' : '同步'}
              </button>
            );
          })}
        </div>
        {isAdmin && (
          <p className="text-[10px] font-bold text-zinc-400 leading-relaxed">
            Google Sheets 同步目前暫未啟用；本頁保留 Excel 匯出與現有任務統計。
          </p>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-40 hide-scrollbar">
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6 pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-[32px] border border-gray-100 dark:border-zinc-800 shadow-sm">
                <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1">任務總量</p>
                <p className="text-2xl font-black text-zinc-900 dark:text-white">{summary.total}</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-[32px] border border-gray-100 dark:border-zinc-800 shadow-sm">
                <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1">完成比例</p>
                <p className="text-2xl font-black text-primary">{summary.rate}%</p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-gray-100 dark:border-zinc-800 shadow-sm">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-6">標籤分布分析</h3>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tagData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {tagData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'TIME_ANALYSIS' && (
          <div className="space-y-6 pt-6">
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-gray-100 dark:border-zinc-800 shadow-sm">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-6">預估 vs 實際工時</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="estimated" name="預估" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" name="實際" fill="#17cfcf" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'SYNC_LOG' && (
          <div className="space-y-6 pt-6">
            <div className="bg-zinc-900 rounded-[40px] p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black text-primary uppercase tracking-widest">雲端同步狀態</h3>
                <span className="text-[9px] text-zinc-500 font-bold uppercase">{lastSyncTime}</span>
              </div>

              <button
                onClick={handleSyncToGoogleSheets}
                disabled={isSyncing}
                className={`w-full h-14 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-3 transition-all ${isSyncing ? 'bg-zinc-800 text-zinc-600' : 'bg-primary text-white shadow-lg shadow-primary/20 active:scale-95'}`}
              >
                {isSyncing ? (
                  <div className="size-4 border-2 border-zinc-600 border-t-primary rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-base">cloud_sync</span>
                )}
                {isSyncing ? '同步中...' : '立即同步至 Google Sheets'}
              </button>

              <div className="mt-8 space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {syncLogs.length > 0 ? syncLogs.map((log, i) => (
                  <div key={i} className="flex gap-3 text-[10px] font-medium leading-relaxed">
                    <span className="text-zinc-600 shrink-0">[{log.time}]</span>
                    <p className={log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-zinc-400'}>
                      {log.msg}
                    </p>
                  </div>
                )) : (
                  <div className="py-10 text-center">
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">目前尚無同步紀錄</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <BottomNavBar currentView="STATS" onNavigate={onNavigate} />
    </div>
  );
};

export default StatsView;
