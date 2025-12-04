
import React from 'react';
import { Match, Player, MatchStatus, TournamentPhase } from '../types';
import { Trophy, Swords, ShieldAlert, CheckCircle, Crown, Medal } from 'lucide-react';
import { getPlayerBadgeStyle } from '../App';

interface BracketViewProps {
  matches: Match[];
  players: Player[];
  currentRound: number;
  phase: TournamentPhase;
  onMatchClick: (match: Match) => void;
}

export const BracketView: React.FC<BracketViewProps> = ({ matches, players, currentRound, phase, onMatchClick }) => {
  const getPlayerInfo = (id: string | null) => players.find(p => p.id === id);

  const PlayerNameBadge: React.FC<{ playerId: string | null }> = ({ playerId }) => {
      const p = players.find(player => player.id === playerId);
      if (!playerId || !p) {
          return <span className="text-slate-500 italic text-sm">A Definir</span>;
      }
      
      const badgeStyle = getPlayerBadgeStyle(p.colors);

      return (
          <div 
            className="px-3 py-1 rounded-md font-bold text-sm shadow-sm truncate max-w-[140px] md:max-w-[160px]"
            style={badgeStyle}
          >
              {p.name}
          </div>
      );
  };

  // --- SWISS VIEW (List Style) ---
  if (phase === TournamentPhase.SWISS || phase === TournamentPhase.REGISTRATION) {
      const roundsToShow = (Array.from(new Set(matches.filter(m => !m.isElimination).map(m => m.round))) as number[]).sort((a,b) => b-a);
      
      return (
          <div className="max-w-4xl mx-auto space-y-8 pb-10">
              {roundsToShow.map(round => {
                  const roundMatches = matches.filter(m => m.round === round && !m.isElimination);
                  const isRoundComplete = roundMatches.every(m => m.status === MatchStatus.COMPLETED);
                  const isCurrent = round === currentRound;
                  
                  return (
                      <div key={round} className={`space-y-4 ${isCurrent ? '' : 'opacity-80'}`}>
                          <h3 className="text-xl font-bold text-slate-200 border-l-4 border-indigo-500 pl-3 flex items-center justify-between">
                              Rodada {round}
                              {isRoundComplete ? (
                                  <span className="text-xs bg-green-600 text-white px-2 py-1 rounded flex items-center gap-1 shadow-lg shadow-green-900/50 animate-fade-in">
                                      <CheckCircle className="w-3 h-3" /> Concluída
                                  </span>
                              ) : (
                                  isCurrent && <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded animate-pulse">Em Andamento</span>
                              )}
                          </h3>
                          <div className="grid md:grid-cols-2 gap-4">
                              {roundMatches.map(match => {
                                  const p1 = players.find(p => p.id === match.player1Id);
                                  const groupLabel = p1?.groupId ? `Gr ${p1.groupId}` : null;

                                  return (
                                  <div 
                                    key={match.id}
                                    onClick={() => onMatchClick(match)}
                                    className={`
                                      relative bg-slate-800 border rounded-xl p-4 cursor-pointer transition-all hover:border-indigo-400 group overflow-hidden
                                      ${match.status === MatchStatus.COMPLETED ? 'border-slate-700' : 'border-indigo-500/30 shadow-indigo-500/10 shadow-lg'}
                                    `}
                                  >
                                      {groupLabel && (
                                          <div className="absolute top-0 left-0 bg-slate-700 text-slate-300 text-[9px] px-2 py-0.5 rounded-br-lg font-mono">
                                              {groupLabel}
                                          </div>
                                      )}
                                      
                                      {match.isBye ? (
                                          <div className="flex items-center justify-center gap-3 text-slate-400 italic py-2">
                                              <ShieldAlert className="w-5 h-5" />
                                              <PlayerNameBadge playerId={match.player1Id} />
                                              <span>recebeu Bye</span>
                                          </div>
                                      ) : (
                                          <div className="flex justify-between items-center gap-3">
                                              {/* Player 1 */}
                                              <div className={`flex-1 flex flex-col items-end gap-1 ${match.winnerId === match.player1Id ? 'opacity-100' : 'opacity-90'}`}>
                                                  <PlayerNameBadge playerId={match.player1Id} />
                                                  <div className="text-[10px] text-slate-500 font-mono">
                                                      {getPlayerInfo(match.player1Id)?.tournamentPoints}pts
                                                  </div>
                                              </div>
                                              
                                              {/* Score */}
                                              <div className="flex flex-col items-center bg-slate-900 px-3 py-1 rounded-lg border border-slate-700 shrink-0">
                                                  <div className={`text-xl font-mono font-bold tracking-widest ${match.status === MatchStatus.COMPLETED ? 'text-white' : 'text-slate-400'}`}>
                                                      {match.score1} - {match.score2}
                                                  </div>
                                                  {match.status !== MatchStatus.COMPLETED && (
                                                      <span className="text-[10px] text-indigo-400 uppercase font-bold">VS</span>
                                                  )}
                                              </div>

                                              {/* Player 2 */}
                                              <div className={`flex-1 flex flex-col items-start gap-1 ${match.winnerId === match.player2Id ? 'opacity-100' : 'opacity-90'}`}>
                                                  <PlayerNameBadge playerId={match.player2Id} />
                                                  <div className="text-[10px] text-slate-500 font-mono">
                                                      {getPlayerInfo(match.player2Id)?.tournamentPoints}pts
                                                  </div>
                                              </div>
                                          </div>
                                      )}
                                      
                                      {match.status === MatchStatus.COMPLETED && (
                                          <div className="absolute top-2 right-2">
                                              <Trophy className="w-3 h-3 text-yellow-500 opacity-50" />
                                          </div>
                                      )}
                                  </div>
                                  );
                              })}
                          </div>
                      </div>
                  )
              })}
              {roundsToShow.length === 0 && (
                  <div className="text-center text-slate-500 py-10">
                      O torneio ainda não começou.
                  </div>
              )}
          </div>
      )
  }

  // --- ELIMINATION VIEW (Tree Style) ---
  const eliminationMatches = matches.filter(m => m.isElimination);
  const mainTreeMatches = eliminationMatches.filter(m => m.id !== "THIRD_PLACE_MATCH");
  const thirdPlaceMatch = eliminationMatches.find(m => m.id === "THIRD_PLACE_MATCH");
  const rounds = (Array.from(new Set(mainTreeMatches.map(m => m.round))) as number[]).sort((a,b) => a-b);
  const finalMatch = mainTreeMatches.find(m => m.round === Math.max(...rounds));
  const championId = finalMatch?.status === MatchStatus.COMPLETED ? finalMatch.winnerId : null;
  const champion = championId ? players.find(p => p.id === championId) : null;

  return (
    <div className="flex flex-col items-center">
        <div className="flex overflow-x-auto pb-8 pt-4 gap-8 md:gap-20 px-4 justify-center w-full">
        {rounds.map((round, idx) => {
            const roundMatches = mainTreeMatches.filter(m => m.round === round).sort((a,b) => parseInt(a.id) - parseInt(b.id));
            const isFinal = idx === rounds.length - 1;
            const roundName = isFinal ? "Grande Final" : (rounds.length - idx === 2 ? "Semifinais" : "Quartas de Final");

            return (
            <div key={round} className="flex flex-col justify-center min-w-[260px] relative">
                <h4 className="text-center font-bold text-indigo-400 uppercase tracking-widest text-sm mb-6 bg-slate-900/80 py-2 rounded-full border border-slate-800">
                    {roundName}
                </h4>
                
                <div className="flex flex-col justify-around flex-grow gap-8">
                {roundMatches.map((match, matchIdx) => {
                    const isWinner1 = match.winnerId === match.player1Id && match.status === MatchStatus.COMPLETED;
                    const isWinner2 = match.winnerId === match.player2Id && match.status === MatchStatus.COMPLETED;

                    return (
                        <div 
                        key={match.id}
                        onClick={() => onMatchClick(match)}
                        className={`
                            relative bg-slate-900 border rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-105 shadow-xl group z-10
                            ${match.status === MatchStatus.COMPLETED ? 'border-indigo-500/50' : 'border-slate-700 hover:border-indigo-400'}
                        `}
                        >
                            {!isFinal && (
                                <>
                                    <div className="absolute top-1/2 -right-10 md:-right-20 w-10 md:w-20 h-0.5 bg-slate-700 -z-10"></div>
                                    <div className={`
                                        absolute w-0.5 bg-slate-700 -right-10 md:-right-20 -z-10
                                        ${matchIdx % 2 === 0 ? 'top-1/2 h-[calc(50%+2rem)] rounded-tr-lg border-t-2 border-r-2 border-slate-700 border-l-0 border-b-0' : 'bottom-1/2 h-[calc(50%+2rem)] rounded-br-lg border-b-2 border-r-2 border-slate-700 border-l-0 border-t-0'}
                                    `}></div>
                                </>
                            )}
                            
                            <div className="flex flex-col divide-y divide-slate-800">
                                <div className={`px-4 py-3 flex justify-between items-center gap-3 transition-colors ${isWinner1 ? 'bg-yellow-500/10' : ''}`}>
                                    <PlayerNameBadge playerId={match.player1Id} />
                                    <span className={`font-mono font-bold px-2 py-0.5 rounded text-sm ${isWinner1 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-800 text-slate-500'}`}>
                                        {match.player1Id ? match.score1 : '-'}
                                    </span>
                                </div>

                                <div className={`px-4 py-3 flex justify-between items-center gap-3 transition-colors ${isWinner2 ? 'bg-yellow-500/10' : ''}`}>
                                     <PlayerNameBadge playerId={match.player2Id} />
                                    <span className={`font-mono font-bold px-2 py-0.5 rounded text-sm ${isWinner2 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-800 text-slate-500'}`}>
                                        {match.player2Id ? match.score2 : '-'}
                                    </span>
                                </div>
                            </div>

                            <div className="absolute top-0 right-0 p-1">
                                {match.status === MatchStatus.COMPLETED ? (
                                <Trophy className="w-3 h-3 text-yellow-500" />
                                ) : match.status === MatchStatus.IN_PROGRESS ? (
                                <Swords className="w-3 h-3 text-red-400 animate-pulse" />
                                ) : null}
                            </div>
                        </div>
                    );
                })}
                {isFinal && thirdPlaceMatch && (
                     <div className="mt-12 relative flex flex-col items-center">
                         <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-bold">Disputa de 3º Lugar</div>
                         <div 
                            key={thirdPlaceMatch.id}
                            onClick={() => onMatchClick(thirdPlaceMatch)}
                            className={`
                                w-full
                                relative bg-slate-900 border rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-105 shadow-xl group z-10
                                ${thirdPlaceMatch.status === MatchStatus.COMPLETED ? 'border-orange-700/50' : 'border-slate-700 hover:border-orange-500/50'}
                            `}
                        >
                             <div className="flex flex-col divide-y divide-slate-800">
                                <div className={`px-4 py-3 flex justify-between items-center gap-3 transition-colors ${thirdPlaceMatch.winnerId === thirdPlaceMatch.player1Id && thirdPlaceMatch.status === MatchStatus.COMPLETED ? 'bg-orange-900/10' : ''}`}>
                                    <PlayerNameBadge playerId={thirdPlaceMatch.player1Id} />
                                    <span className="font-mono font-bold px-2 py-0.5 rounded text-sm bg-slate-800 text-slate-500">
                                        {thirdPlaceMatch.player1Id ? thirdPlaceMatch.score1 : '-'}
                                    </span>
                                </div>
                                <div className={`px-4 py-3 flex justify-between items-center gap-3 transition-colors ${thirdPlaceMatch.winnerId === thirdPlaceMatch.player2Id && thirdPlaceMatch.status === MatchStatus.COMPLETED ? 'bg-orange-900/10' : ''}`}>
                                     <PlayerNameBadge playerId={thirdPlaceMatch.player2Id} />
                                    <span className="font-mono font-bold px-2 py-0.5 rounded text-sm bg-slate-800 text-slate-500">
                                        {thirdPlaceMatch.player2Id ? thirdPlaceMatch.score2 : '-'}
                                    </span>
                                </div>
                            </div>
                            <div className="absolute top-0 right-0 p-1">
                                <Medal className="w-3 h-3 text-orange-600" />
                            </div>
                        </div>
                     </div>
                )}
                </div>
            </div>
            );
        })}
        </div>
        
        {champion && (
            <div className="mt-8 animate-bounce-in">
                <div className="bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 p-[1px] rounded-2xl shadow-[0_0_50px_rgba(234,179,8,0.3)]">
                    <div className="bg-slate-900 rounded-2xl px-12 py-8 flex flex-col items-center text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-yellow-500/5 animate-pulse"></div>
                        <Crown className="w-16 h-16 text-yellow-400 mb-4 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]" />
                        <h2 className="text-sm font-bold text-yellow-600 uppercase tracking-widest mb-1">Grande Campeão</h2>
                        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">
                            {champion.name}
                        </h1>
                        <p className="text-slate-400 mt-4 text-sm">Parabéns pela vitória no torneio!</p>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};