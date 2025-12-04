
import React, { useState } from 'react';
import { Match, Player, MatchStatus } from '../types';
import { Button } from './Button';
import { X, Trophy, AlertCircle, Clock, Lock, RefreshCw, Plus, Minus } from 'lucide-react';
import { getPlayerBadgeStyle } from '../App';

interface MatchModalProps {
  match: Match;
  players: Player[];
  isOvertime: boolean;
  readOnly?: boolean; 
  timerStarted: boolean;
  ignoreTimer: boolean;
  onClose: () => void;
  onUpdate: (updatedMatch: Match) => void;
}

export const MatchModal: React.FC<MatchModalProps> = ({ 
    match, players, isOvertime, readOnly = false, timerStarted, ignoreTimer, onClose, onUpdate 
}) => {
  const [score1, setScore1] = useState(match.score1);
  const [score2, setScore2] = useState(match.score2);
  const [isGenerating, setIsGenerating] = useState(false);

  const p1 = players.find(p => p.id === match.player1Id);
  const p2 = players.find(p => p.id === match.player2Id);

  const isValidScore = (s1: number, s2: number) => {
    if (s1 > 3 || s2 > 3) return false;
    return true;
  };

  const handleFinish = async () => {
    if (readOnly) return;
    if (!p1 || !p2 && !match.isBye) return;

    let winnerId: string | null = null;
    if (score1 > score2) winnerId = p1!.id;
    else if (score2 > score1) winnerId = p2!.id;
    else {
        return; 
    }

    setIsGenerating(true);
    
    const tempMatch = { ...match, score1, score2, winnerId, status: MatchStatus.COMPLETED };
    
    onUpdate({
      ...tempMatch,
    });
    
    setIsGenerating(false);
    onClose();
  };

  // Helper for colors
  const PlayerHeaderBadge: React.FC<{ player: Player }> = ({ player }) => {
      const badgeStyle = getPlayerBadgeStyle(player.colors);

      return (
          <div 
             className="px-4 py-2 rounded-lg font-bold text-lg text-center leading-tight shadow-md min-w-[120px]"
             style={badgeStyle}
          >
              {player.name}
          </div>
      );
  };

  const ScoreControl = ({ score, setScore, disabled }: { score: number, setScore: (s: number) => void, disabled: boolean }) => (
      <div className="flex items-center gap-2">
          <button
              onClick={() => setScore(Math.max(0, score - 1))}
              disabled={disabled || score <= 0}
              className="w-12 h-12 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-full text-slate-200 disabled:opacity-30 transition-colors"
          >
              <Minus className="w-6 h-6" />
          </button>
          <div 
              className={`w-16 h-16 flex items-center justify-center bg-slate-800 border-2 border-slate-700 rounded-xl text-3xl font-bold text-white transition-all`}
          >
              {score}
          </div>
          <button
              onClick={() => setScore(Math.min(3, score + 1))}
              disabled={disabled || score >= 3}
              className="w-12 h-12 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 rounded-full text-white disabled:opacity-30 transition-colors"
          >
              <Plus className="w-6 h-6" />
          </button>
      </div>
  );

  if (!p1 && !match.isBye) return null;

  if (match.isBye) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
             <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center max-w-sm w-full">
                 <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                 <h2 className="text-xl font-bold text-white mb-2">Vitória Automática (Bye)</h2>
                 <p className="text-slate-400 mb-6">{p1?.name} recebe vitória automática nesta rodada.</p>
                 <Button onClick={onClose} variant="secondary" className="w-full">Fechar</Button>
             </div>
        </div>
      )
  }

  if (!p2) return null;

  const isInputBlocked = !timerStarted && !ignoreTimer && !readOnly;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className={`bg-slate-900 border rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden transition-colors ${isOvertime ? 'border-red-500/50' : 'border-slate-700'}`}>
        
        <div className="p-6 text-center border-b border-slate-800 bg-slate-900 relative">
          <h2 className="text-xl font-bold text-slate-100">Resultado da Partida</h2>
          <p className="text-slate-400 text-sm mt-1">
            {match.isElimination ? 'Mata-Mata' : 'Fase Suíça'} - Rodada {match.round}
          </p>
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          
          {isOvertime && (
             <div className="absolute top-0 left-0 right-0 bg-red-600/90 text-white text-[10px] font-bold uppercase tracking-widest py-1">
                 Tempo Esgotado - Penalidade Aplicada
             </div>
          )}
        </div>

        <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative">
          {(readOnly || isInputBlocked) && (
              <div className={`absolute inset-0 bg-black/50 z-20 flex items-center justify-center rounded-lg backdrop-blur-sm`}>
                  {isInputBlocked ? (
                      <div className="text-center p-4">
                          <Clock className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                          <p className="text-white font-bold">Inicie o Tempo</p>
                          <p className="text-xs text-slate-300">O cronômetro precisa estar rodando para registrar resultados.</p>
                      </div>
                  ) : (
                      <div className="hidden" /> 
                  )}
              </div>
          )}

          {/* Player 1 */}
          <div className="flex flex-col items-center gap-4 flex-1">
            <PlayerHeaderBadge player={p1!} />
            <ScoreControl score={score1} setScore={setScore1} disabled={readOnly || isInputBlocked} />
             {isOvertime && <span className="text-xs text-red-400 font-mono">-1 pt</span>}
          </div>

          <div className="text-slate-500 font-bold text-xl opacity-50">VS</div>

          {/* Player 2 */}
          <div className="flex flex-col items-center gap-4 flex-1">
             <PlayerHeaderBadge player={p2!} />
             <ScoreControl score={score2} setScore={setScore2} disabled={readOnly || isInputBlocked} />
            {isOvertime && <span className="text-xs text-red-400 font-mono">-1 pt</span>}
          </div>

        </div>

        <div className="px-6 pb-2 text-center space-y-2">
            <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Partidas vão até 3 pontos. Vencedor ganha +2pts bônus.
            </p>
            {isOvertime && (
                 <p className="text-xs text-red-400 flex items-center justify-center gap-1 font-semibold bg-red-900/10 py-1 rounded">
                    <Clock className="w-3 h-3" />
                    Tempo Esgotado: Ambos recebem -1 ponto na classificação.
                </p>
            )}
        </div>

        <div className="p-6 bg-slate-800/50 flex flex-col gap-3">
          {readOnly ? (
              <div className="flex items-center justify-center gap-2 text-slate-400 bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm">Apenas o organizador pode registrar resultados.</span>
              </div>
          ) : isInputBlocked ? (
               <Button onClick={onClose} variant="ghost" className="w-full">
                  Fechar
              </Button>
          ) : (
            <>
                <div className="text-center text-sm text-red-400 h-4">
                    {!isValidScore(score1, score2) ? "Pontuação máxima recomendada é 3." : (score1 === score2 ? "Defina um vencedor para continuar." : "")}
                </div>
                <Button 
                    onClick={handleFinish} 
                    disabled={score1 === score2 || isGenerating}
                    isLoading={isGenerating}
                    className="w-full py-3 text-lg"
                    variant={isOvertime ? 'danger' : 'primary'}
                >
                    {match.status === MatchStatus.COMPLETED ? (
                        <>
                            <RefreshCw className="w-5 h-5" />
                            Atualizar Resultado
                        </>
                    ) : (
                        <>
                            <Trophy className="w-5 h-5" />
                            {isOvertime ? 'Finalizar com Penalidade' : 'Finalizar Partida'}
                        </>
                    )}
                </Button>
            </>
          )}
          {!isInputBlocked && !readOnly && (
            <Button variant="ghost" onClick={onClose} className="w-full">
                Cancelar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};