
import React from 'react';
import { ViewState } from '../types';

interface BottomNavBarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentView, onNavigate }) => {
  const tabs = [
    { id: 'TASK_LIST', label: '任務', icon: 'assignment_late' },
    { id: 'CALENDAR', label: '日曆', icon: 'calendar_month' },
    { id: 'STATS', label: '數據', icon: 'analytics' },
    { id: 'SETTINGS', label: '設定', icon: 'settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white/90 dark:bg-background-dark/90 ios-blur border-t border-gray-100 dark:border-gray-800 pb-8 pt-2 z-50">
      <div className="flex justify-around items-center px-2">
        {tabs.map((tab) => (
          <button 
            key={tab.id}
            onClick={() => onNavigate(tab.id as ViewState)}
            className={`flex flex-col items-center gap-1 transition-all duration-200 ${currentView === tab.id ? 'text-primary scale-110' : 'text-gray-400 hover:text-gray-500'}`}
          >
            <span className={`material-symbols-outlined text-2xl ${currentView === tab.id ? 'fill-icon' : ''}`}>
              {tab.icon}
            </span>
            <span className="text-[10px] font-bold">{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-black/10 dark:bg-white/10 rounded-full" />
    </nav>
  );
};

export default BottomNavBar;
