
import React, { useEffect, useState } from 'react';
import { Timer, AlertTriangle, Play, CheckCircle, Clock } from 'lucide-react';
import { Button } from './Button';

interface RoundTimerProps {
  startTime: number | null;
  durationSeconds: number; // usually 45 * 60
  isFinished: boolean; // All matches completed
  isIgnored: boolean; // Timer is bypassed
  onStart: () => void;
  className?: string;
}

export const RoundTimer: React.FC<RoundTimerProps> = ({ startTime, durationSeconds, isFinished, isIgnored, onStart, className = '' }) => {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [isOvertime, setIsOvertime] = useState(false);

  useEffect(() => {
    // If we have a start time, and it's NOT finished and NOT ignored, calculate time
    if (startTime && !isFinished && !isIgnored) {
        const interval = setInterval(() => {
          const now = Date.now();
          const elapsedSeconds = Math.floor((now - startTime) / 1000);
          const remaining = durationSeconds - elapsedSeconds;

          if (remaining <= 0) {
            setTimeLeft(0);
            setIsOvertime(true);
          } else {
            setTimeLeft(remaining);
            setIsOvertime(false);
          }
        }, 1000);
        return () => clearInterval(interval);
    } 
  }, [startTime, durationSeconds, isFinished, isIgnored]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const durationMinutes = Math.floor(durationSeconds / 60);

  if (isIgnored) {
      return (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-300 ${className}`}>
            <Clock className="w-5 h-5" />
            <span className="font-bold">Tempo Livre</span>
        </div>
      );
  }

  if (isFinished) {
      return (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-green-500/30 bg-green-500/10 text-green-300 ${className}`}>
            <CheckCircle className="w-5 h-5" />
            <span className="font-bold">Rodada Finalizada</span>
        </div>
      );
  }

  if (!startTime) {
    return (
      <Button 
        onClick={onStart} 
        className="bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30"
        title="Iniciar Tempo da Rodada"
      >
        <Play className="w-4 h-4 mr-2" />
        Iniciar Tempo ({durationMinutes}min)
      </Button>
    );
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border shadow-lg transition-colors ${
      isOvertime 
        ? 'bg-red-500/20 border-red-500 text-red-200 animate-pulse' 
        : 'bg-slate-800 border-slate-700 text-slate-200'
    } ${className}`}>
      {isOvertime ? <AlertTriangle className="w-5 h-5" /> : <Timer className="w-5 h-5 text-indigo-400" />}
      
      <div className="flex flex-col leading-none">
        <span className="text-2xl font-mono font-bold tracking-wider">
          {isOvertime ? "00:00" : formatTime(timeLeft)}
        </span>
        {isOvertime && (
          <span className="text-[10px] uppercase font-bold text-red-400">Tempo Esgotado</span>
        )}
      </div>
    </div>
  );
};
