
import React, { useRef, useState } from 'react';
import { Player } from '../types';
import { Trophy, Skull, Flame, Star, ShieldAlert, Camera, Grid, Crown, Zap } from 'lucide-react';
import { toPng } from 'html-to-image';
import { getPlayerBadgeStyle } from '../App';

interface LeaderboardProps {
  players: Player[];
  totalSwissRounds?: number;
  className?: string;
  groups?: string[];
  qualificationMap?: Record<string, 'gold' | 'silver'>;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ players, totalSwissRounds = 4, className = '', groups, qualificationMap }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
      setExpandedPlayerId(expandedPlayerId === id ? null : id);
  };

  const getStreak = (history: string[]) => {
      let streak = 0;
      for (let i = history.length - 1; i >= 0; i--) {
          if (history[i] === 'W' || history[i] === 'B') streak++;
          else break;
      }
      return streak;
  };

  const downloadImage = async () => {
      if (ref.current === null) return;

      try {
        const node = ref.current;
        const dataUrl = await toPng(node, { 
            cacheBust: true, 
            backgroundColor: '#0f172a',
            width: node.scrollWidth,
            height: node.scrollHeight,
            style: {
                overflow: 'visible',
                height: 'auto',
                maxHeight: 'none',
            }
        });
        
        const link = document.createElement('a');
        link.download = 'classificacao-torneio.png';
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Error generating image', err);
        alert('Erro ao gerar imagem. Tente novamente.');
      }
  };

  const renderTable = (playerList: Player[], title?: string) => (
      <div className="space-y-1.5 mb-6">
          {title && (
              <div className="px-2 py-1 flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <Grid className="w-3 h-3" /> {title}
              </div>
          )}
          {playerList.map((player, index) => {
              const streak = getStreak(player.history);
              const isTop3 = !groups && index < 3; // Only standard top 3 if no groups
              const isExpanded = expandedPlayerId === player.id;
              const badgeStyle = getPlayerBadgeStyle(player.colors);
              
              const qualStatus = qualificationMap ? qualificationMap[player.id] : undefined;
              
              let containerClass = "bg-transparent border-slate-800 hover:bg-slate-800/30";
              if (isTop3) containerClass = "bg-slate-800/80 border-slate-700 shadow-sm";
              if (qualStatus === 'gold') containerClass = "bg-yellow-900/10 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.1)]";
              if (qualStatus === 'silver') containerClass = "bg-blue-900/10 border-blue-400/30";
              // Removed the dimmed opacity rule to ensure visibility

              return (
                <div 
                    key={player.id} 
                    onClick={() => toggleExpand(player.id)}
                    className={`
                    relative rounded-lg border flex flex-col transition-all duration-200 cursor-pointer
                    ${containerClass}
                    ${isExpanded ? 'ring-1 ring-indigo-500/50' : ''}
                    `}
                >
                    {/* Main Row */}
                    <div className="flex items-center gap-2 p-2">
                        {/* Rank */}
                        <div className="relative">
                            <span className={`
                                flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold shrink-0
                                ${!groups && index === 0 ? 'bg-yellow-500 text-black' : 
                                !groups && index === 1 ? 'bg-slate-400 text-black' :
                                !groups && index === 2 ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-400'}
                                ${qualStatus === 'gold' ? 'bg-yellow-500 text-black' : ''}
                                ${qualStatus === 'silver' ? 'bg-blue-400 text-black' : ''}
                            `}>
                                {index + 1}
                            </span>
                            {qualStatus === 'gold' && (
                                <div className="absolute -top-2 -left-1">
                                    <Crown className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                </div>
                            )}
                        </div>

                        {/* Name Badge */}
                        <div 
                            className="flex-1 px-2 py-0.5 rounded text-sm font-bold truncate shadow-sm relative overflow-hidden"
                            style={badgeStyle}
                        >
                            {player.name}
                            {qualStatus === 'gold' && <div className="absolute inset-0 bg-yellow-400/20 mix-blend-overlay"></div>}
                        </div>

                        {/* Score Info */}
                        <div className="flex items-center gap-3 text-xs shrink-0">
                             {/* Stars with Placeholders */}
                             <div className="flex items-center gap-1">
                                {Array.from({ length: totalSwissRounds }).map((_, idx) => {
                                    const result = player.history[idx];
                                    if (!result) {
                                        // Placeholder Star
                                        return <Star key={idx} className="w-3.5 h-3.5 fill-slate-800 text-slate-700" />;
                                    }
                                    return (
                                        <Star 
                                            key={idx}
                                            className={`w-3.5 h-3.5 ${
                                                result === 'W' || result === 'B' 
                                                ? 'fill-yellow-500 text-yellow-500' 
                                                : 'fill-red-500 text-red-500 opacity-60'
                                            }`} 
                                        />
                                    );
                                })}
                            </div>

                             <div className="flex items-baseline gap-0.5 font-bold text-slate-300 w-8 justify-end">
                                 {player.tournamentPoints} <span className="text-[9px] text-slate-500 font-normal">pts</span>
                             </div>
                        </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                        <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 bg-slate-950/30 p-2 border-t border-slate-800/50 animate-fade-in">
                            <div className="flex flex-col items-center border-r border-slate-800">
                                <span className="text-slate-500">Desafio (Buchholz)</span>
                                <span className="text-purple-400 font-bold flex items-center gap-1">
                                    <ShieldAlert className="w-3 h-3" /> {player.desafio}
                                </span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-slate-500">Derrotas</span>
                                <span className="text-red-400 font-bold flex items-center gap-1">
                                    <Skull className="w-3 h-3" /> {player.losses}
                                </span>
                            </div>
                            {streak >= 2 && (
                                 <div className="col-span-2 flex justify-center mt-1">
                                     <span className="flex items-center gap-1 text-orange-400 font-bold bg-orange-950/30 px-2 py-0.5 rounded-full">
                                         <Flame className="w-3 h-3 fill-orange-500 animate-pulse" /> {streak} vitórias seguidas
                                     </span>
                                 </div>
                            )}
                            {qualStatus && (
                                <div className="col-span-2 flex justify-center mt-1">
                                     <span className={`flex items-center gap-1 font-bold px-2 py-0.5 rounded-full ${qualStatus === 'gold' ? 'text-yellow-400 bg-yellow-900/40' : 'text-blue-300 bg-blue-900/40'}`}>
                                         {qualStatus === 'gold' ? '🏆 Classificado (Líder)' : '⚡ Classificado (Wildcard)'}
                                     </span>
                                 </div>
                            )}
                        </div>
                    )}
                </div>
              );
          })}
      </div>
  );

  return (
    <div className={`bg-slate-900 border-l border-slate-800 flex flex-col h-full ${className}`}>
      <div className="p-3 border-b border-slate-800 bg-slate-900 sticky top-0 z-10 flex items-center justify-between">
        <h2 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
            <Trophy className="w-4 h-4 text-yellow-500" />
            Classificação
        </h2>
        <button 
            onClick={downloadImage}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition-colors"
            title="Baixar imagem"
        >
            <Camera className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2" ref={ref}>
        {players.length === 0 && (
            <div className="text-slate-500 text-center text-xs p-4">Nenhum jogador.</div>
        )}
        
        {!groups ? (
            renderTable(players)
        ) : (
            groups.map(groupId => {
                const groupPlayers = players.filter(p => p.groupId === groupId);
                return (
                    <div key={groupId}>
                        {renderTable(groupPlayers, `Grupo ${groupId}`)}
                    </div>
                )
            })
        )}
      </div>
    </div>
  );
};
