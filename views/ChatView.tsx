
import React, { useState, useRef, useEffect } from 'react';
import { ViewState, Message, Task, Member } from '../types';
import { MOCK_CHAT } from '../constants';

interface ChatViewProps {
  onNavigate: (view: ViewState) => void;
  onSelectTask: (taskId: string) => void;
  tasks: Task[];
  members?: Member[];
}

const ChatView: React.FC<ChatViewProps> = ({ onNavigate, onSelectTask, tasks, members = [] }) => {
  const [messages, setMessages] = useState<Message[]>(MOCK_CHAT);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const generateAIResponse = async (userPrompt: string) => {
    setIsTyping(true);
    try {
      const botMessage: Message = {
        id: `msg-ai-${Date.now()}`,
        sender: '任務小助手',
        avatar: 'https://picsum.photos/seed/bot/200',
        text: 'AI 助手目前暫未啟用，請稍後再試。',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isBot: true,
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: '王大同',
      avatar: 'https://picsum.photos/seed/admin/200',
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isBot: false,
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInput = inputText;
    setInputText('');
    generateAIResponse(currentInput);
  };

  const handleSummonTopTasks = () => {
    const priorityWeight = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    const filteredTasks = [...tasks]
      .filter(t => t.status !== 'COMPLETED')
      .sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority])
      .slice(0, 10);

    const newMessage: Message = {
      id: `msg-summon-${Date.now()}`,
      sender: '任務小助手',
      avatar: 'https://picsum.photos/seed/bot/200',
      text: filteredTasks.length > 0 
        ? `好的，已為您撈取目前優先權最高的 ${filteredTasks.length} 項未完成任務：`
        : '目前沒有任何未完成的任務喔！真棒！',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isBot: true,
      cardType: 'TASK_SUMMARY',
      cardData: { taskList: filteredTasks }
    };
    setMessages(prev => [...prev, newMessage]);
  };

  return (
    <div className="flex flex-col h-full line-bg dark:bg-background-dark">
      {/* Header */}
      <div className="flex items-center bg-white dark:bg-zinc-900 p-4 pb-2 justify-between border-b border-gray-100 dark:border-zinc-800 shrink-0">
        <div onClick={() => onNavigate('TASK_LIST')} className="text-[#111813] dark:text-white flex size-10 shrink-0 items-center cursor-pointer">
          <span className="material-symbols-outlined">arrow_back_ios</span>
        </div>
        <div className="flex-1 flex flex-col items-center">
          <h2 className="text-[#111813] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">智慧助手對話</h2>
          <span className="text-xs text-gray-500">AI 助理已連線</span>
        </div>
        <div className="flex w-10 items-center justify-end">
          <button className="flex size-10 items-center justify-center rounded-lg bg-transparent text-[#111813] dark:text-white">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 hide-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 items-start animate-in fade-in slide-in-from-bottom-2 ${!msg.isBot ? 'flex-row-reverse' : ''}`}>
            <div 
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 shrink-0 border border-white/20"
              style={{ backgroundImage: `url(${msg.avatar})` }}
            />
            <div className={`flex flex-col gap-1 max-w-[85%] ${!msg.isBot ? 'items-end' : 'items-start'}`}>
              <p className="text-white text-[10px] font-bold mx-1 opacity-80">{msg.sender}</p>
              
              <div className={`flex items-end gap-2 ${!msg.isBot ? 'flex-row-reverse' : ''}`}>
                <div className={`${msg.isBot ? 'bg-white dark:bg-gray-800' : 'bg-[#06C755] text-white'} p-3 rounded-2xl shadow-sm`}>
                  <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
                <p className="text-white/60 text-[9px] whitespace-nowrap mb-1">{msg.time}</p>
              </div>

              {msg.cardType === 'TASK_SUMMARY' && msg.cardData?.taskList && (
                <div className="mt-2 overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 w-full max-w-[280px] animate-in zoom-in">
                  <div className="bg-primary p-3">
                    <div className="flex items-center gap-2 text-white">
                      <span className="material-symbols-outlined text-sm">format_list_numbered</span>
                      <p className="text-xs font-black">優先處理清單</p>
                    </div>
                  </div>
                  <div className="p-1 space-y-1">
                    {msg.cardData.taskList.map((task: Task, index: number) => (
                      <div key={task.id} onClick={() => onSelectTask(task.id)} className="flex items-center gap-x-2 p-2 hover:bg-gray-50 dark:hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer">
                        <div className="size-5 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-[9px] font-black text-gray-500">{index + 1}</div>
                        <p className="text-xs font-bold truncate flex-1">{task.title}</p>
                        <span className="material-symbols-outlined text-gray-300 text-xs">chevron_right</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-2 items-start animate-pulse">
            <div className="size-10 rounded-full bg-white/20 flex items-center justify-center text-white"><span className="material-symbols-outlined text-sm">smart_toy</span></div>
            <div className="bg-white/10 p-3 rounded-2xl"><div className="flex gap-1"><div className="size-1.5 bg-white rounded-full animate-bounce"></div><div className="size-1.5 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></div><div className="size-1.5 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></div></div></div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Bar & Quick Actions */}
      <div className="bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 shrink-0">
        <div className="flex gap-2 p-2 overflow-x-auto no-scrollbar bg-gray-50/50 dark:bg-zinc-800/50">
           <button onClick={handleSummonTopTasks} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-700 rounded-full border border-gray-200 dark:border-zinc-600 shadow-sm text-[9px] font-black text-primary whitespace-nowrap active:scale-95 transition-transform">📋 叫出未完成任務</button>
           <button onClick={() => generateAIResponse("請幫我總結目前的任務進度與瓶頸")} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-700 rounded-full border border-gray-200 dark:border-zinc-600 shadow-sm text-[9px] font-black text-amber-500 whitespace-nowrap active:scale-95 transition-transform">📊 AI 智慧總結</button>
        </div>

        <form onSubmit={handleSendMessage} className="px-3 py-2 pb-8 flex items-center gap-3">
          <span className="material-symbols-outlined text-gray-400">add</span>
          <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center px-4 py-2">
            <input 
              className="bg-transparent border-none focus:ring-0 text-sm w-full dark:text-white placeholder-gray-400" 
              placeholder="詢問 AI 任務狀況..." 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button type="submit" className="material-symbols-outlined text-primary-green text-xl">send</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatView;
