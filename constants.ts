
import { Task, Message, Member, Group } from './types';

// --- 管理員配置中心 ---
export const ADMIN_CONFIG = {
  SUPER_ADMIN_IDS: [
    'm1', // 預設測試 ID
    'YOUR_REAL_LINE_USER_ID_HERE'
  ], 
};

export const isUserAdmin = (id: string) => ADMIN_CONFIG.SUPER_ADMIN_IDS.includes(id);

const getRelativeDate = (daysOffset: number, hours: number = 9, minutes: number = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  return `${y}/${m}/${d} ${hh}:${mm}`;
};

export const MOCK_GROUPS: Group[] = [
  { id: 'g1', name: '設計研發中心', avatar: 'https://picsum.photos/seed/design/100' },
  { id: 'g2', name: '行銷推廣小組', avatar: 'https://picsum.photos/seed/marketing/100' }
];

export const MOCK_MEMBERS: Member[] = [
  { 
    id: 'm1', 
    name: '王大同 (Admin)', 
    avatar: 'https://picsum.photos/seed/admin/200', 
    status: 'ACTIVE', 
    productivity: 95, 
    avgDuration: '1h 15m', 
    completedTasks: 78, 
    isBotLinked: true, 
    groupIds: ['g1', 'g2'], 
    role: isUserAdmin('m1') ? 'ADMIN' : 'MEMBER'
  },
  { 
    id: 'm2', 
    name: 'Sarah Jenkins', 
    avatar: 'https://picsum.photos/seed/sarah/200', 
    status: 'ACTIVE', 
    productivity: 80, 
    avgDuration: '2h 05m', 
    completedTasks: 56, 
    isBotLinked: true, 
    groupIds: ['g1'], 
    role: isUserAdmin('m2') ? 'ADMIN' : 'MEMBER'
  },
  { 
    id: 'm3', 
    name: 'Alex Kim', 
    avatar: 'https://picsum.photos/seed/alexk/200', 
    status: 'ACTIVE', 
    productivity: 65, 
    avgDuration: '3h 40m', 
    completedTasks: 42, 
    isBotLinked: true, 
    groupIds: ['g1'], 
    role: 'MEMBER' 
  },
  { 
    id: 'm4', 
    name: 'Jordan Lee', 
    avatar: 'https://picsum.photos/seed/jordan/200', 
    status: 'ACTIVE', 
    productivity: 50, 
    avgDuration: '2h 15m', 
    completedTasks: 31, 
    isBotLinked: true, 
    groupIds: ['g2'], 
    role: 'MEMBER' 
  },
  { 
    id: 'm5', 
    name: 'Casey Wang', 
    avatar: 'https://picsum.photos/seed/casey/200', 
    status: 'WAITING', 
    productivity: 40, 
    avgDuration: '1h 50m', 
    completedTasks: 22, 
    isBotLinked: false, 
    groupIds: ['g2'], 
    role: 'MEMBER' 
  }
];

export const MOCK_TASKS: Task[] = [
  // --- 本週任務 ---
  {
    id: '1001',
    groupId: 'g1',
    ticketNo: 'TKT-8821',
    title: '網站審計報告',
    description: '年度安全性與效能審查。',
    status: 'OVERDUE',
    priority: 'HIGH',
    dueDate: getRelativeDate(0, 18, 0),
    assignee: 'Sarah Jenkins',
    department: '研發部',
    tags: ['前台', '安全性'],
    color: '#E78278',
    createdAt: getRelativeDate(-2, 10, 0),
    updatedAt: getRelativeDate(-1, 14, 30),
    createdBy: '王大同 (Admin)',
    reminders: [],
    subTasks: [{ id: 's1', title: '掃描漏洞', isCompleted: true }, { id: 's2', title: '撰寫報告', isCompleted: false }]
  },
  {
    id: '1002',
    groupId: 'g1',
    ticketNo: 'TKT-8822',
    title: '使用者登入 API 優化',
    status: 'COMPLETED',
    priority: 'MEDIUM',
    dueDate: getRelativeDate(-1, 12, 0),
    assignee: 'Alex Kim',
    department: '研發部',
    tags: ['後台', 'API'],
    color: '#17cfcf',
    estimatedHours: 4,
    actualHours: 3.5,
    createdAt: getRelativeDate(-3, 0),
    updatedAt: getRelativeDate(-1, 16, 0),
    createdBy: '王大同 (Admin)',
    reminders: [],
    subTasks: [{ id: 's3', title: '快取機制', isCompleted: true }]
  },
  {
    id: '1003',
    groupId: 'g1',
    ticketNo: 'TKT-8823',
    title: '首頁 RWD 修正',
    status: 'IN_PROGRESS',
    priority: 'LOW',
    dueDate: getRelativeDate(2, 18, 0),
    assignee: 'Sarah Jenkins',
    department: '設計部',
    tags: ['前台', 'UI設計'],
    color: '#8B5CF6',
    createdAt: getRelativeDate(-1, 11, 0),
    updatedAt: getRelativeDate(0, 9, 30),
    createdBy: 'Sarah Jenkins',
    reminders: [],
  },
  // --- 上週任務 (用於測試週報趨勢) ---
  {
    id: '1004',
    groupId: 'g1',
    ticketNo: 'TKT-8710',
    title: '訂單系統壓力測試',
    status: 'COMPLETED',
    priority: 'HIGH',
    dueDate: getRelativeDate(-8, 17, 0),
    assignee: 'Alex Kim',
    department: '研發部',
    tags: ['後台', '訂單', '效能'],
    color: '#F59E0B',
    estimatedHours: 8,
    actualHours: 10,
    createdAt: getRelativeDate(-12, 10, 0),
    updatedAt: getRelativeDate(-8, 18, 0),
    createdBy: '王大同 (Admin)',
    reminders: [],
  },
  {
    id: '1005',
    groupId: 'g1',
    ticketNo: 'TKT-8711',
    title: '商品分類資料夾重整',
    status: 'COMPLETED',
    priority: 'LOW',
    dueDate: getRelativeDate(-10, 17, 0),
    assignee: 'Sarah Jenkins',
    department: '研發部',
    tags: ['後台', '資料庫'],
    color: '#10B981',
    estimatedHours: 2,
    actualHours: 1.5,
    createdAt: getRelativeDate(-11, 9, 0),
    updatedAt: getRelativeDate(-10, 11, 0),
    createdBy: '王大同 (Admin)',
    reminders: [],
  },
  // --- 前二週任務 ---
  {
    id: '1006',
    groupId: 'g1',
    ticketNo: 'TKT-8601',
    title: '支付模組對接 - LINE Pay',
    status: 'COMPLETED',
    priority: 'HIGH',
    dueDate: getRelativeDate(-18, 17, 0),
    assignee: 'Alex Kim',
    department: '研發部',
    tags: ['後台', 'API', '訂單'],
    color: '#3B82F6',
    estimatedHours: 12,
    actualHours: 15,
    createdAt: getRelativeDate(-22, 10, 0),
    updatedAt: getRelativeDate(-18, 18, 0),
    createdBy: '王大同 (Admin)',
    reminders: [],
  },
  {
    id: '1007',
    groupId: 'g1',
    ticketNo: 'TKT-8602',
    title: '後台權限管理開發',
    status: 'COMPLETED',
    priority: 'MEDIUM',
    dueDate: getRelativeDate(-20, 17, 0),
    assignee: 'Sarah Jenkins',
    department: '研發部',
    tags: ['後台', '權限'],
    color: '#EC4899',
    estimatedHours: 6,
    actualHours: 7,
    createdAt: getRelativeDate(-25, 9, 0),
    updatedAt: getRelativeDate(-20, 15, 0),
    createdBy: '王大同 (Admin)',
    reminders: [],
  },
  // --- 行銷群組 (g2) 數據 ---
  {
    id: '2001',
    groupId: 'g2',
    ticketNo: 'MKT-001',
    title: '雙 11 活動主視覺設計',
    status: 'PENDING',
    priority: 'HIGH',
    dueDate: getRelativeDate(5, 23, 59),
    assignee: 'Jordan Lee',
    department: '行銷部',
    tags: ['設計', '雙11'],
    color: '#E78278',
    createdAt: getRelativeDate(-1, 10, 0),
    updatedAt: getRelativeDate(-1, 10, 0),
    createdBy: '王大同 (Admin)',
    reminders: [],
  },
  {
    id: '2002',
    groupId: 'g2',
    ticketNo: 'MKT-002',
    title: 'FB 廣告投放文案',
    status: 'COMPLETED',
    priority: 'MEDIUM',
    dueDate: getRelativeDate(-2, 12, 0),
    assignee: 'Casey Wang',
    department: '行銷部',
    tags: ['社群', '文案'],
    color: '#10B981',
    estimatedHours: 3,
    actualHours: 2,
    createdAt: getRelativeDate(-4, 9, 0),
    updatedAt: getRelativeDate(-2, 11, 0),
    createdBy: 'Jordan Lee',
    reminders: [],
  },
  {
    id: '2003',
    groupId: 'g2',
    ticketNo: 'MKT-003',
    title: 'KOL 合作邀約名單',
    status: 'PENDING',
    priority: 'MEDIUM',
    dueDate: getRelativeDate(3, 18, 0),
    assignee: 'Jordan Lee',
    department: '行銷部',
    tags: ['社群', '公關'],
    color: '#8B5CF6',
    createdAt: getRelativeDate(0, 14, 0),
    updatedAt: getRelativeDate(0, 14, 0),
    createdBy: 'Jordan Lee',
    reminders: [],
  }
];

export const MOCK_CHAT: Message[] = [
  { id: 'msg1', sender: '王大同', avatar: 'https://picsum.photos/seed/admin/200', text: '系統已成功同步群組資料！', time: '下午 2:25', isBot: false },
  { id: 'msg2', sender: '任務小助手', avatar: 'https://picsum.photos/seed/bot/200', text: '您好！我是您的 AI 助理。您可以詢問我關於「任務進度」或「效能分析」的問題。', time: '下午 2:26', isBot: true },
];
