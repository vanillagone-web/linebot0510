
export type ViewState = 'LOGIN' | 'CHAT' | 'TASK_LIST' | 'EXECUTION' | 'DASHBOARD' | 'CALENDAR' | 'STATS' | 'SETTINGS' | 'HELP';

export interface Group {
  id: string;
  name: string;
  avatar: string;
}

export interface TaskHistoryEntry {
  timestamp: string;
  user: string;
  action: string;
}

export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
  assigneeId?: string; // New: Assignee for the specific subtask
}

export interface Task {
  id: string;
  groupId: string; 
  ticketNo?: string;
  title: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate: string; 
  assignee: string;
  department: string;
  snoozeCount?: number;
  snoozeReason?: string;
  estimatedHours?: number;
  actualHours?: number;
  recurrence?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  history?: TaskHistoryEntry[];
  color?: string;
  reminders: string[]; 
  addedToCalendar?: boolean;
  ticketUrl?: string;
  notes?: string;
  tags?: string[];
  subTasks?: SubTask[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  id: string;
  name: string;
  avatar: string;
  status: 'ACTIVE' | 'WAITING' | 'OFFLINE';
  productivity: number;
  avgDuration: string;
  completedTasks: number;
  isBotLinked: boolean; 
  groupIds: string[];  
  role: 'ADMIN' | 'MEMBER';
}

export interface Message {
  id: string;
  sender: string;
  avatar: string;
  text?: string;
  time: string;
  isBot: boolean;
  cardType?: 'TASK_SUMMARY' | 'TASK_ALERT' | 'COMPLETION_CONFIRM' | 'WEEKLY_REPORT' | 'TASK_REMINDER';
  cardData?: any;
}
