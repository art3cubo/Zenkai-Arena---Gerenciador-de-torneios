import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Gavel, Sparkles } from 'lucide-react';
import { askRuleJudge } from '../services/geminiService';
import { ChatMessage } from '../types';
import { Button } from './Button';

interface AIJudgeProps {
  rulesSummary: string;
  className?: string;
}

export const AIJudge: React.FC<AIJudgeProps> = ({ rulesSummary, className = '' }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Olá! Sou o Juiz da Arena. Registrou as regras? Posso tirar dúvidas ou narrar as partidas.', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Filter strictly for the API call to avoid huge context windows if chat gets long
    const apiHistory = messages.slice(-10).map(m => ({ role: m.role, text: m.text }));
    
    const responseText = await askRuleJudge(apiHistory, userMsg.text, rulesSummary);
    
    setMessages(prev => [...prev, { role: 'model', text: responseText, timestamp: Date.now() }]);
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`flex flex-col bg-slate-900 border-l border-slate-800 h-full ${className}`}>
      <div className="bg-slate-900 p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
            <div className="bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20">
            <Gavel className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
            <h3 className="font-bold text-slate-100 text-sm">Juiz IA</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Consultor de Regras</p>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth" ref={scrollRef}>
        {messages.length === 1 && !rulesSummary && (
             <div className="p-4 rounded-lg bg-yellow-900/10 border border-yellow-700/30 text-xs text-yellow-500 mb-4">
                 Dica: Adicione um resumo das regras na configuração do torneio para que eu possa ajudar melhor!
             </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
            }`}>
              {msg.role === 'model' && <Bot className="w-3 h-3 mb-1 inline-block mr-2 opacity-70" />}
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
           <div className="flex justify-start">
             <div className="bg-slate-800 rounded-2xl px-4 py-3 border border-slate-700 rounded-bl-none flex gap-2 items-center">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
                <span className="text-xs text-slate-400">Consultando regras...</span>
             </div>
           </div>
        )}
      </div>

      <div className="p-3 bg-slate-900 border-t border-slate-800">
        <div className="flex gap-2 relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte ao juiz..."
            className="flex-1 bg-slate-950 border border-slate-700 text-slate-100 rounded-lg pl-4 pr-10 py-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
          />
          <button 
            onClick={handleSend} 
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors disabled:opacity-0 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};