
import React, { useState } from 'react';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLineLogin = () => {
    setIsLoading(true);
    // 模擬 LINE 授權流程
    setTimeout(() => {
      onLoginSuccess();
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-[#f6f8f8] dark:bg-[#101f22] items-center justify-center p-8 text-center">
      <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-700">
        <div className="size-24 bg-primary/20 rounded-[32px] flex items-center justify-center mb-8 shadow-xl shadow-primary/10">
          <span className="material-symbols-outlined text-primary text-5xl">rocket_launch</span>
        </div>
        <h1 className="text-3xl font-black text-[#111818] dark:text-white mb-4 tracking-tight">TaskBot Pro</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-[240px]">
          最強大的團隊協作工具，<br/>即時掌握進度與耗時分析。
        </p>
      </div>

      <div className="w-full space-y-4 pb-12 animate-in slide-in-from-bottom duration-700 delay-300">
        <button 
          onClick={handleLineLogin}
          disabled={isLoading}
          className="w-full bg-[#06C755] hover:bg-[#05b34c] text-white h-16 rounded-[20px] font-black flex items-center justify-center gap-3 shadow-lg shadow-[#06C755]/20 active:scale-95 transition-all"
        >
          {isLoading ? (
            <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <div className="size-8 bg-white rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[#06C755] text-lg fill-icon">chat</span>
              </div>
              <span className="text-base">使用 LINE 帳號登入</span>
            </>
          )}
        </button>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          登入即代表同意 服務條款 與 隱私政策
        </p>
      </div>
    </div>
  );
};

export default LoginView;
