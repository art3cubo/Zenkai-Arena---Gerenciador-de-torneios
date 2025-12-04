import React from 'react';

interface AIJudgeProps {
  rulesSummary: string;
  className?: string;
}

export const AIJudge: React.FC<AIJudgeProps> = ({ className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 bg-slate-900 border-l border-slate-800 h-full text-slate-500 ${className}`}>
      <p>Juiz IA Desativado</p>
    </div>
  );
};