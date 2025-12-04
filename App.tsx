
import React, { useState, useEffect } from 'react';
import { Player, Tournament, Match, MatchStatus, TournamentPhase } from './types';
import { Input } from './components/Input';
import { Button } from './components/Button';
import { BracketView } from './components/BracketView';
import { MatchModal } from './components/MatchModal';
import { Leaderboard } from './components/Leaderboard';
import { RoundTimer } from './components/RoundTimer';
import { 
  Layout, ChevronRight, PlayCircle, Swords, 
  Users, Dna, Menu, X, Play, Share2, Eye, EyeOff, SkipForward, ToggleLeft, ToggleRight, RefreshCcw, Grid, Shuffle, LogOut
} from 'lucide-react';

// --- LOGIC HELPERS ---

// Vivid Palettes
const PRIMARY_COLORS = [
  "#3576bc", // Blue
  "#d7181f", // Red
  "#17b14b", // Green
  "#ffca01", // Yellow
  "#923e99", // Purple
  "#744c3e", // Brown
  "#56c4c7", // Cyan/Teal
  "#ff8400", // Orange (Updated)
  "#8780bd", // Lavender
  "#2e2f62"  // Dark Blue (Added to make 10)
];

const SECONDARY_COLORS = [
  "#ffffff", // White (1-10)
  "#000000", // Black (Swapped order)
  "#808080"  // Grey (Swapped order)
];

// Safe ID generator
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Reusable Player Badge Style Generator
export const getPlayerBadgeStyle = (colors: string[]) => {
    const primary = colors[0] || '#64748b';
    const secondary = colors[1] || '#ffffff';
    
    // Linear gradient with a hard stop to create the "slice" effect
    return { 
        background: `linear-gradient(115deg, ${primary} 85%, ${secondary} 85.1%)`,
        color: '#ffffff', // Always white text for flat design
        textShadow: '0px 1px 2px rgba(0,0,0,0.6)' 
    };
};

const calculateStandings = (players: Player[], matches: Match[]): Player[] => {
  const updatedPlayers = players.map(p => {
      let wins = 0;
      let losses = 0;
      let matchPoints = 0;
      let tournamentPoints = 0;
      const opponents: string[] = [];
      let hasReceivedBye = false;
      const history: ('W' | 'L' | 'D' | 'B')[] = [];

      const playerMatches = matches
        .filter(m => (m.player1Id === p.id || m.player2Id === p.id) && m.status === MatchStatus.COMPLETED)
        .sort((a, b) => a.round - b.round);

      playerMatches.forEach(m => {
          if (m.isElimination) return;

          const penalty = (m.finishedOvertime && !m.isBye) ? 1 : 0;
          let isWin = false;
          let isBye = false;

          if (m.player1Id === p.id) {
              matchPoints += m.score1;
              if (m.winnerId === p.id) {
                  wins++;
                  tournamentPoints += (m.score1 + 2);
                  isWin = true;
              } else {
                  losses++;
                  tournamentPoints += m.score1;
              }
              tournamentPoints -= penalty;
              if (m.player2Id) opponents.push(m.player2Id);
              if (m.isBye) {
                  hasReceivedBye = true;
                  isBye = true;
              }
          } else if (m.player2Id === p.id) {
              matchPoints += m.score2;
              if (m.winnerId === p.id) {
                  wins++;
                  tournamentPoints += (m.score2 + 2);
                  isWin = true;
              } else {
                  losses++;
                  tournamentPoints += m.score2;
              }
              tournamentPoints -= penalty;
              if (m.player1Id) opponents.push(m.player1Id);
          }

          if (isBye) history.push('B');
          else if (isWin) history.push('W');
          else history.push('L');
      });

      return { ...p, wins, losses, matchPoints, tournamentPoints, opponents, hasReceivedBye, history };
  });

  const playersWithDesafio = updatedPlayers.map(p => {
      const desafio = matches.reduce((acc, m) => {
          if (m.status !== MatchStatus.COMPLETED || m.isElimination) return acc;
          
          let victorId: string | null = null;
          let opponentId: string | null = null;

          if (m.player1Id === p.id && m.player2Id) {
             opponentId = m.player2Id;
             victorId = m.winnerId;
          } else if (m.player2Id === p.id && m.player1Id) {
             opponentId = m.player1Id;
             victorId = m.winnerId;
          }

          if (opponentId && victorId && victorId === opponentId) {
              const opponent = updatedPlayers.find(op => op.id === opponentId);
              return acc + (opponent ? opponent.tournamentPoints : 0);
          }

          return acc;
      }, 0);

      return { ...p, desafio };
  });

  return playersWithDesafio.sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins;
      if (a.tournamentPoints !== b.tournamentPoints) return b.tournamentPoints - a.tournamentPoints;
      
      const matchBetween = matches.find(m => 
          !m.isElimination &&
          ((m.player1Id === a.id && m.player2Id === b.id) || 
          (m.player1Id === b.id && m.player2Id === a.id))
      );
      if (matchBetween && matchBetween.winnerId) {
          if (matchBetween.winnerId === a.id) return -1;
          if (matchBetween.winnerId === b.id) return 1;
      }

      if (a.desafio !== b.desafio) return b.desafio - a.desafio;
      return a.registrationOrder - b.registrationOrder;
  });
};

function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// --- APP COMPONENT ---

const App: React.FC = () => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  
  const [newPlayerName, setNewPlayerName] = useState('');
  const [gameTheme, setGameTheme] = useState('');
  
  // Configs
  const [roundDurationMinutes, setRoundDurationMinutes] = useState(45);
  const [useTimer, setUseTimer] = useState(false);
  const [customRounds, setCustomRounds] = useState(4);
  const [customTopCut, setCustomTopCut] = useState(2); // 2, 4, 8
  const [enableGroups, setEnableGroups] = useState(false);
  
  // Group Logic
  const [groupCountRange, setGroupCountRange] = useState({ min: 1, max: 1 });
  const [selectedGroupCount, setSelectedGroupCount] = useState(1);
  
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<'none' | 'leaderboard'>('none');
  const [isAdmin, setIsAdmin] = useState(true);

  // Automatically adjust rounds & top cut default based on player count
  useEffect(() => {
    if (!tournament) {
        // Round Logic
        if (players.length <= 11) setCustomRounds(4);
        else if (players.length <= 21) setCustomRounds(5);
        else setCustomRounds(6);

        // Top Cut Logic
        if (players.length >= 17) setCustomTopCut(8);
        else if (players.length >= 7) setCustomTopCut(4);
        else setCustomTopCut(2);

        // Group Range Update
        if (enableGroups && players.length >= 6) {
             const minG = Math.ceil(players.length / 5);
             const maxG = Math.floor(players.length / 3);
             
             if (maxG >= minG) {
                 setGroupCountRange({ min: minG, max: maxG });
                 // Reset selection if out of bounds
                 if (selectedGroupCount < minG || selectedGroupCount > maxG) {
                     setSelectedGroupCount(minG);
                 }
             } else {
                 setGroupCountRange({ min: 0, max: 0 }); // Invalid
             }
        } else {
             setGroupCountRange({ min: 1, max: 1 });
             setSelectedGroupCount(1);
        }
    }
  }, [players.length, tournament, enableGroups]);

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    if (players.length >= 30) {
        alert("Máximo de 30 jogadores atingido.");
        return;
    }
    
    // Strict Unique Color Logic
    let assignedColors: string[] | null = null;

    for (const sec of SECONDARY_COLORS) {
        for (const prim of PRIMARY_COLORS) {
            const isTaken = players.some(p => p.colors[0] === prim && p.colors[1] === sec);
            if (!isTaken) {
                assignedColors = [prim, sec];
                break;
            }
        }
        if (assignedColors) break;
    }

    if (!assignedColors) {
        // Fallback (shouldn't happen with limit 30)
        assignedColors = [PRIMARY_COLORS[0], SECONDARY_COLORS[0]];
    }

    const newPlayer: Player = {
      id: generateId(),
      name: newPlayerName,
      wins: 0,
      losses: 0,
      draws: 0,
      matchPoints: 0,
      tournamentPoints: 0,
      desafio: 0,
      opponents: [],
      hasReceivedBye: false,
      history: [],
      registrationOrder: players.length + 1,
      colors: assignedColors
    };
    
    setPlayers([...players, newPlayer]);
    setNewPlayerName('');
  };

  const removePlayer = (id: string) => {
      const remaining = players.filter(p => p.id !== id);
      setPlayers(remaining);
  };

  const cyclePlayerPrimaryColor = (playerId: string) => {
      setPlayers(prevPlayers => {
          const target = prevPlayers.find(p => p.id === playerId);
          if (!target) return prevPlayers;

          const currentSecondary = target.colors[1];
          const currentPrimary = target.colors[0];
          
          const takenPrimaries = prevPlayers
            .filter(p => p.id !== playerId && p.colors[1] === currentSecondary)
            .map(p => p.colors[0]);

          const startIdx = PRIMARY_COLORS.indexOf(currentPrimary);
          let foundPrimary: string | null = null;

          for (let i = 1; i < PRIMARY_COLORS.length; i++) {
              const nextIdx = (startIdx + i) % PRIMARY_COLORS.length;
              const candidate = PRIMARY_COLORS[nextIdx];
              if (!takenPrimaries.includes(candidate)) {
                  foundPrimary = candidate;
                  break;
              }
          }

          if (foundPrimary) {
              return prevPlayers.map(p => 
                  p.id === playerId ? { ...p, colors: [foundPrimary!, currentSecondary] } : p
              );
          } else {
              return prevPlayers;
          }
      });
  };

  const reshuffleAllColors = () => {
    // Generate all possible unique combinations
    let allCombinations: string[][] = [];
    SECONDARY_COLORS.forEach(sec => {
        PRIMARY_COLORS.forEach(prim => {
            allCombinations.push([prim, sec]);
        });
    });

    const shuffledCombos = shuffleArray(allCombinations);

    setPlayers(prevPlayers => prevPlayers.map((p, idx) => ({
        ...p,
        colors: shuffledCombos[idx % shuffledCombos.length]
    })));
  };

  const startTournament = () => {
    if (players.length < 4) {
      alert("Mínimo de 4 jogadores necessário!");
      return;
    }

    if (enableGroups && groupCountRange.max === 0) {
        alert("Número de jogadores incompatível com a fase de grupos (Min 3 por grupo).");
        return;
    }

    let finalPlayers = [...players];
    let activeGroups: string[] | undefined = undefined;

    // Reshuffle logic for 11+ players
    if (finalPlayers.length > 10) {
        // Collect all possible combinations
        const allCombinations: string[][] = [];
        SECONDARY_COLORS.forEach(sec => {
            PRIMARY_COLORS.forEach(prim => {
                allCombinations.push([prim, sec]);
            });
        });
        
        // Shuffle combinations and assign
        const shuffledCombos = shuffleArray(allCombinations);
        finalPlayers = finalPlayers.map((p, i) => ({
            ...p,
            colors: shuffledCombos[i % shuffledCombos.length]
        }));
    }

    if (enableGroups) {
        const validGroups = selectedGroupCount;
        const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, validGroups);
        activeGroups = groupNames;
        
        // Optimize balance: Calculate minimal difference split
        // e.g. 10 players, 2 groups -> 5,5
        const shuffled = shuffleArray(finalPlayers);
        
        // Distribute round-robin style
        shuffled.forEach((p, idx) => {
            const groupIndex = idx % validGroups;
            p.groupId = groupNames[groupIndex];
        });
        
        finalPlayers = shuffled;
        
        alert(`Jogadores divididos em ${validGroups} grupos.`);
    }

    const newTournament: Tournament = {
        id: generateId(),
        name: gameTheme || 'Liga Zenkai',
        phase: TournamentPhase.SWISS,
        currentRound: 0,
        totalSwissRounds: customRounds,
        topCutSize: customTopCut,
        activeGroups: activeGroups,
        players: finalPlayers,
        matches: [],
        createdAt: new Date().toISOString(),
        roundStartTime: null,
        roundDurationSeconds: roundDurationMinutes * 60,
        ignoreTimer: !useTimer
    };
    
    // Generate Round 1
    let round1Matches: Match[] = [];
    if (activeGroups) {
        activeGroups.forEach(groupId => {
            const groupPlayers = finalPlayers.filter(p => p.groupId === groupId);
            const matches = generateSwissPairings(groupPlayers, [], 1);
            round1Matches = [...round1Matches, ...matches];
        });
    } else {
        round1Matches = generateSwissPairings(finalPlayers, [], 1);
    }
    
    newTournament.matches = round1Matches;
    newTournament.currentRound = 1;

    setTournament(newTournament);
  };

  const startTimer = () => {
      if (!tournament || !isAdmin) return;
      setTournament({
          ...tournament,
          roundStartTime: Date.now(),
          ignoreTimer: false
      });
  };

  const resetTimer = () => {
      if (!tournament || !isAdmin) return;
      setTournament({
          ...tournament,
          roundStartTime: null,
          ignoreTimer: !useTimer
      });
  };

  const enableFreeTime = () => {
      if (!tournament || !isAdmin) return;
      setTournament({
          ...tournament,
          ignoreTimer: true,
          roundStartTime: null
      });
  };

  const generateSwissPairings = (currentPlayers: Player[], existingMatches: Match[], roundNumber: number): Match[] => {
      let activePlayers = [...currentPlayers];
      const newMatches: Match[] = [];
      let matchCount = existingMatches.length;

      if (roundNumber === 1) {
          activePlayers = shuffleArray(activePlayers);
      }
      
      // Handle Bye
      if (activePlayers.length % 2 !== 0) {
          let byeIndex = activePlayers.length - 1;
          if (roundNumber > 1) {
             for (let i = activePlayers.length - 1; i >= 0; i--) {
                 if (!activePlayers[i].hasReceivedBye) {
                     byeIndex = i;
                     break;
                 }
             }
          }
          const byePlayer = activePlayers[byeIndex];
          activePlayers.splice(byeIndex, 1);
          
          matchCount++;
          newMatches.push({
              id: `R${roundNumber}-BYE-${generateId()}`,
              round: roundNumber,
              isElimination: false,
              player1Id: byePlayer.id,
              player2Id: null,
              winnerId: byePlayer.id,
              score1: 0,
              score2: 0,
              status: MatchStatus.COMPLETED,
              nextMatchId: null,
              isBye: true,
              finishedOvertime: false
          });
      }

      while (activePlayers.length > 0) {
          const p1 = activePlayers.shift()!;
          let opponentIndex = -1;
          
          // STRICT PAIRING LOGIC
          for (let i = 0; i < activePlayers.length; i++) {
              if (!p1.opponents.includes(activePlayers[i].id)) {
                  opponentIndex = i;
                  break;
              }
          }

          if (opponentIndex === -1) {
               opponentIndex = 0; 
          }

          const p2 = activePlayers[opponentIndex];
          activePlayers.splice(opponentIndex, 1);

          matchCount++;
          newMatches.push({
              id: `R${roundNumber}-${matchCount}-${generateId()}`,
              round: roundNumber,
              isElimination: false,
              player1Id: p1.id,
              player2Id: p2.id,
              winnerId: null,
              score1: 0,
              score2: 0,
              status: MatchStatus.PENDING,
              nextMatchId: null,
              isBye: false
          });
      }
      return newMatches;
  };

  const handleNextSwissRound = () => {
      if (!tournament || !isAdmin) return;

      const currentRoundMatches = tournament.matches.filter(m => m.round === tournament.currentRound);
      const incomplete = currentRoundMatches.filter(m => m.status !== MatchStatus.COMPLETED);
      
      if (incomplete.length > 0) {
          alert(`Ainda existem ${incomplete.length} partidas pendentes na rodada atual.`);
          return;
      }

      const sortedPlayers = calculateStandings(tournament.players, tournament.matches);
      
      if (tournament.currentRound >= tournament.totalSwissRounds) {
          alert("Fase Suíça/Grupos Finalizada! Iniciando a Fase Eliminatória.");
          const topCutTournament = generateEliminationBracket({...tournament, players: sortedPlayers});
          setTournament(topCutTournament);
      } else {
          const nextRound = tournament.currentRound + 1;
          let newMatches: Match[] = [];

          if (tournament.activeGroups) {
              tournament.activeGroups.forEach(groupId => {
                  const groupPlayers = sortedPlayers.filter(p => p.groupId === groupId);
                  const grMatches = generateSwissPairings(groupPlayers, tournament.matches, nextRound);
                  newMatches = [...newMatches, ...grMatches];
              });
          } else {
              newMatches = generateSwissPairings(sortedPlayers, tournament.matches, nextRound);
          }
          
          alert(`Iniciando a Rodada ${nextRound}!`);
          setTournament(prev => prev ? ({
              ...prev,
              players: sortedPlayers,
              currentRound: nextRound,
              matches: [...prev.matches, ...newMatches],
              roundStartTime: null,
              ignoreTimer: !useTimer
          }) : null);
      }
  };

  const generateEliminationBracket = (currentTournament: Tournament): Tournament => {
      const sortedPlayers = calculateStandings(currentTournament.players, currentTournament.matches);
      let qualifiedPlayers: Player[] = [];
      const totalPlayers = sortedPlayers.length;

      // TOP CUT CALCULATION (Use stored config or fallback)
      let topCutSize = currentTournament.topCutSize || 4;

      if (currentTournament.activeGroups) {
          const groups = currentTournament.activeGroups;
          const winners: Player[] = [];
          const runnerUps: Player[] = [];
          const others: Player[] = [];

          groups.forEach(gId => {
              const groupPlayers = sortedPlayers.filter(p => p.groupId === gId);
              if (groupPlayers.length > 0) winners.push(groupPlayers[0]);
              if (groupPlayers.length > 1) runnerUps.push(groupPlayers[1]);
              if (groupPlayers.length > 2) others.push(...groupPlayers.slice(2));
          });

          // Sort runnerUps globally
          runnerUps.sort((a,b) => {
              if (a.tournamentPoints !== b.tournamentPoints) return b.tournamentPoints - a.tournamentPoints;
              if (a.wins !== b.wins) return b.wins - a.wins;
              return b.desafio - a.desafio;
          });

          qualifiedPlayers = [...winners];
          
          const slotsNeeded = topCutSize - qualifiedPlayers.length;
          if (slotsNeeded > 0) {
              qualifiedPlayers = [...qualifiedPlayers, ...runnerUps.slice(0, slotsNeeded)];
          }
          
          const remainingSlots = topCutSize - qualifiedPlayers.length;
          if (remainingSlots > 0) {
              const remainingRunnerUps = runnerUps.slice(slotsNeeded);
              const remainingPool = [...remainingRunnerUps, ...others].sort((a,b) => b.tournamentPoints - a.tournamentPoints);
              qualifiedPlayers = [...qualifiedPlayers, ...remainingPool.slice(0, remainingSlots)];
          }

          qualifiedPlayers.sort((a,b) => b.tournamentPoints - a.tournamentPoints);

      } else {
          qualifiedPlayers = sortedPlayers.slice(0, topCutSize);
      }

      qualifiedPlayers = qualifiedPlayers.slice(0, topCutSize);

      const newMatches: Match[] = [];
      let matchIdCounter = 1000;

      const createMatch = (round: number, p1Id: string | null, p2Id: string | null, nextId: string | null): Match => ({
          id: (matchIdCounter++).toString(),
          round: round,
          isElimination: true,
          player1Id: p1Id,
          player2Id: p2Id,
          winnerId: null,
          score1: 0,
          score2: 0,
          status: MatchStatus.PENDING,
          nextMatchId: nextId,
          loserNextMatchId: null,
          isBye: false
      });
      
      const finalMatch = createMatch(3, null, null, null);
      newMatches.push(finalMatch);

      const thirdPlaceMatch = createMatch(3, null, null, null);
      thirdPlaceMatch.id = "THIRD_PLACE_MATCH";
      newMatches.push(thirdPlaceMatch);

      if (topCutSize === 2) {
          finalMatch.player1Id = qualifiedPlayers[0].id;
          finalMatch.player2Id = qualifiedPlayers[1].id;
          newMatches.pop(); 
      } else if (topCutSize === 4) {
          const semi1 = createMatch(2, qualifiedPlayers[0].id, qualifiedPlayers[3].id, finalMatch.id);
          semi1.loserNextMatchId = thirdPlaceMatch.id;
          
          const semi2 = createMatch(2, qualifiedPlayers[1].id, qualifiedPlayers[2].id, finalMatch.id);
          semi2.loserNextMatchId = thirdPlaceMatch.id;
          
          newMatches.push(semi1, semi2);
      } else if (topCutSize === 8) {
          const semi1 = createMatch(2, null, null, finalMatch.id);
          semi1.loserNextMatchId = thirdPlaceMatch.id;

          const semi2 = createMatch(2, null, null, finalMatch.id);
          semi2.loserNextMatchId = thirdPlaceMatch.id;

          newMatches.push(semi1, semi2);
          
          newMatches.push(createMatch(1, qualifiedPlayers[0].id, qualifiedPlayers[7].id, semi1.id));
          newMatches.push(createMatch(1, qualifiedPlayers[3].id, qualifiedPlayers[4].id, semi1.id));
          newMatches.push(createMatch(1, qualifiedPlayers[1].id, qualifiedPlayers[6].id, semi2.id));
          newMatches.push(createMatch(1, qualifiedPlayers[2].id, qualifiedPlayers[5].id, semi2.id));
      }

      return {
          ...currentTournament,
          phase: TournamentPhase.ELIMINATION,
          players: sortedPlayers,
          matches: [...currentTournament.matches, ...newMatches],
          roundStartTime: null,
          ignoreTimer: !useTimer
      };
  };

  const handleMatchUpdate = (updatedMatch: Match) => {
    if (!tournament || !isAdmin) return;

    let isOvertime = false;
    
    if (tournament.ignoreTimer) {
        isOvertime = false;
    } else if (tournament.roundStartTime && !updatedMatch.isBye) {
        const elapsed = Date.now() - tournament.roundStartTime;
        if (elapsed > tournament.roundDurationSeconds * 1000) {
            isOvertime = true;
        }
    }
    
    if (updatedMatch.isBye) isOvertime = false;
    if (updatedMatch.isElimination) isOvertime = false;

    const matchToSave = { ...updatedMatch, finishedOvertime: isOvertime };

    const newMatches = tournament.matches.map(m => m.id === matchToSave.id ? matchToSave : m);
    
    if (matchToSave.isElimination && matchToSave.winnerId && matchToSave.status === MatchStatus.COMPLETED) {
       if (matchToSave.nextMatchId) {
            const nextMatchIndex = newMatches.findIndex(m => m.id === matchToSave.nextMatchId);
            if (nextMatchIndex !== -1) {
                const nextMatch = newMatches[nextMatchIndex];
                const isP1Empty = !nextMatch.player1Id;
                newMatches[nextMatchIndex] = {
                    ...nextMatch,
                    player1Id: isP1Empty ? matchToSave.winnerId : nextMatch.player1Id,
                    player2Id: !isP1Empty && !nextMatch.player2Id ? matchToSave.winnerId : nextMatch.player2Id
                };
            }
       }

       if (matchToSave.loserNextMatchId) {
           const loserId = matchToSave.player1Id === matchToSave.winnerId ? matchToSave.player2Id : matchToSave.player1Id;
           if (loserId) {
               const loserMatchIndex = newMatches.findIndex(m => m.id === matchToSave.loserNextMatchId);
               if (loserMatchIndex !== -1) {
                   const loserMatch = newMatches[loserMatchIndex];
                   const isP1Empty = !loserMatch.player1Id;
                   newMatches[loserMatchIndex] = {
                       ...loserMatch,
                       player1Id: isP1Empty ? loserId : loserMatch.player1Id,
                       player2Id: !isP1Empty && !loserMatch.player2Id ? loserId : loserMatch.player2Id
                   };
               }
           }
       }
    }
    const updatedPlayers = calculateStandings(tournament.players, newMatches);
    setTournament({ ...tournament, matches: newMatches, players: updatedPlayers });
  };

  const endTournament = () => {
    // Ensures a clean reset to the registration screen
    setTournament(null);
  };

  const shareTournament = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Link do torneio copiado para a área de transferência!");
  };

  // --- PROJECTION HELPER FOR LEADERBOARD ---
  const getProjectedQualification = () => {
      if (!tournament || tournament.phase === TournamentPhase.ELIMINATION || !tournament.activeGroups) return {};

      // Requirement: Don't highlight before first round is finished
      const currentRoundMatches = tournament.matches.filter(m => m.round === tournament.currentRound);
      const isRoundComplete = currentRoundMatches.every(m => m.status === MatchStatus.COMPLETED);
      
      if (tournament.currentRound === 1 && !isRoundComplete) {
          return {};
      }

      const sortedPlayers = calculateStandings(tournament.players, tournament.matches);
      // Use config from tournament
      const topCutSize = tournament.topCutSize || 4;

      const qualificationMap: Record<string, 'gold' | 'silver'> = {};
      const winners: Player[] = [];
      const candidatesForWildcard: Player[] = [];

      tournament.activeGroups.forEach(gId => {
          const groupPlayers = sortedPlayers.filter(p => p.groupId === gId);
          if (groupPlayers.length > 0) {
              winners.push(groupPlayers[0]);
              qualificationMap[groupPlayers[0].id] = 'gold'; 
          }
          if (groupPlayers.length > 1) {
              candidatesForWildcard.push(...groupPlayers.slice(1));
          }
      });

      candidatesForWildcard.sort((a,b) => {
          if (a.tournamentPoints !== b.tournamentPoints) return b.tournamentPoints - a.tournamentPoints;
          if (a.wins !== b.wins) return b.wins - a.wins;
          return b.desafio - a.desafio;
      });

      const slotsTaken = winners.length;
      const slotsAvailable = topCutSize - slotsTaken;
      
      if (slotsAvailable > 0) {
          const wildcards = candidatesForWildcard.slice(0, slotsAvailable);
          wildcards.forEach(p => {
              qualificationMap[p.id] = 'silver';
          });
      }

      return qualificationMap;
  };

  const isCurrentRoundOvertime = tournament?.roundStartTime ? 
     (Date.now() - tournament.roundStartTime > tournament.roundDurationSeconds * 1000) : false;

  let allMatchesFinished = false;
  let eliminationStageLabel = "";
  
  if (tournament?.phase === TournamentPhase.SWISS) {
      const currentRoundMatches = tournament.matches.filter(m => m.round === tournament.currentRound);
      allMatchesFinished = currentRoundMatches.every(m => m.status === MatchStatus.COMPLETED);
  } else if (tournament?.phase === TournamentPhase.ELIMINATION) {
      const elimMatches = tournament.matches.filter(m => m.isElimination);
      const rounds = (Array.from(new Set(elimMatches.map(m => m.round))) as number[]).sort((a,b) => a-b);
      
      let activeRound = rounds[rounds.length - 1]; 
      
      for (const r of rounds) {
          const roundMatches = elimMatches.filter(m => m.round === r);
          const isComplete = roundMatches.every(m => m.status === MatchStatus.COMPLETED);
          if (!isComplete) {
              activeRound = r;
              break;
          }
      }
      
      if (activeRound === 1) eliminationStageLabel = "Quartas de Final";
      else if (activeRound === 2) eliminationStageLabel = "Semifinais";
      else if (activeRound === 3) eliminationStageLabel = "Finais";

      const currentStageMatches = elimMatches.filter(m => m.round === activeRound);
      allMatchesFinished = currentStageMatches.every(m => m.status === MatchStatus.COMPLETED);
      
      const isTournamentTotallyOver = elimMatches.every(m => m.status === MatchStatus.COMPLETED);
      if (isTournamentTotallyOver) {
          allMatchesFinished = true;
          eliminationStageLabel = "Torneio Encerrado";
      }
  }

  const isPhaseWithTimer = tournament?.phase === TournamentPhase.SWISS || tournament?.phase === TournamentPhase.ELIMINATION;

  const projectedQualification = getProjectedQualification();

  if (!tournament) {
      return (
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 lg:p-8">
              <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
                  
                  <div className="space-y-8 animate-fade-in-up">
                      <div className="w-full flex justify-center mb-6">
                          <img 
                            src="https://i.imgur.com/m7F3chB.png" 
                            alt="Zenkai Arena Logo" 
                            className="h-32 md:h-40 object-contain mx-auto"
                          />
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
                          <div className="flex items-center gap-2 text-indigo-400 border-b border-slate-800 pb-2">
                              <Layout className="w-5 h-5" />
                              <h2 className="font-bold text-lg">Configurações Gerais</h2>
                          </div>
                          
                          <div className="space-y-4">
                              <Input 
                                  label="Nome do Torneio"
                                  placeholder="Ex: Liga Zenkai" 
                                  value={gameTheme}
                                  onChange={(e) => setGameTheme(e.target.value)}
                              />

                              <div className="flex flex-col gap-2">
                                  <label className="text-sm font-medium text-slate-300">Formato</label>
                                  <div className="flex flex-wrap gap-4">
                                      {/* Round Count */}
                                      <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                                          <span className="text-sm text-slate-400 px-2">Rodadas:</span>
                                          <button onClick={() => setCustomRounds(Math.max(3, customRounds - 1))} className="p-1 hover:bg-slate-800 rounded text-white">-</button>
                                          <span className="font-bold text-white w-6 text-center">{customRounds}</span>
                                          <button onClick={() => setCustomRounds(Math.min(7, customRounds + 1))} className="p-1 hover:bg-slate-800 rounded text-white">+</button>
                                      </div>

                                      {/* Groups Toggle */}
                                      <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setEnableGroups(!enableGroups)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors border ${enableGroups ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                        >
                                            <Grid className="w-4 h-4" />
                                            {enableGroups ? 'Fase de Grupos Ativa' : 'Fase de Grupos'}
                                        </button>

                                        {/* Group Count - Only show if active and valid range */}
                                        {enableGroups && groupCountRange.max > 0 && (
                                            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800 ml-2 animate-fade-in">
                                                <span className="text-xs text-slate-500 pl-1">Qtd:</span>
                                                <button 
                                                    onClick={() => setSelectedGroupCount(Math.max(groupCountRange.min, selectedGroupCount - 1))} 
                                                    className="w-5 h-5 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded text-white text-xs disabled:opacity-50"
                                                    disabled={selectedGroupCount <= groupCountRange.min}
                                                >
                                                    -
                                                </button>
                                                <span className="font-bold text-white text-sm w-4 text-center">{selectedGroupCount}</span>
                                                <button 
                                                    onClick={() => setSelectedGroupCount(Math.min(groupCountRange.max, selectedGroupCount + 1))} 
                                                    className="w-5 h-5 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded text-white text-xs disabled:opacity-50"
                                                    disabled={selectedGroupCount >= groupCountRange.max}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        )}
                                      </div>
                                  </div>
                              </div>

                              <div className="flex flex-col gap-2">
                                  <label className="text-sm font-medium text-slate-300">Fase Eliminatória</label>
                                  <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800 w-fit">
                                      <button 
                                          onClick={() => setCustomTopCut(2)} 
                                          className={`px-3 py-1 rounded text-sm ${customTopCut === 2 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                                      >
                                          Final (Top 2)
                                      </button>
                                      <button 
                                          onClick={() => setCustomTopCut(4)} 
                                          className={`px-3 py-1 rounded text-sm ${customTopCut === 4 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                                      >
                                          Top 4
                                      </button>
                                      <button 
                                          onClick={() => setCustomTopCut(8)} 
                                          disabled={players.length < 12}
                                          className={`px-3 py-1 rounded text-sm ${customTopCut === 8 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'} disabled:opacity-30 disabled:cursor-not-allowed`}
                                          title={players.length < 12 ? "Mínimo de 12 jogadores para Top 8" : ""}
                                      >
                                          Top 8
                                      </button>
                                  </div>
                              </div>

                              <div className="flex flex-col gap-2">
                                  <label className="text-sm font-medium text-slate-300">Controle de Tempo</label>
                                  <div className="flex items-center gap-4 bg-slate-950 p-3 rounded-lg border border-slate-800">
                                      <button 
                                        onClick={() => setUseTimer(!useTimer)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${useTimer ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                                      >
                                          {useTimer ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                                          {useTimer ? 'Ativar Cronômetro' : 'Tempo Livre (Sem Timer)'}
                                      </button>
                                      
                                      {useTimer && (
                                          <div className="flex items-center gap-2">
                                              <input 
                                                  type="number"
                                                  min="1"
                                                  value={roundDurationMinutes}
                                                  onChange={(e) => setRoundDurationMinutes(parseInt(e.target.value) || 45)}
                                                  className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-center"
                                              />
                                              <span className="text-xs text-slate-500">min/rodada</span>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
                          <div className="flex items-center gap-2 text-purple-400 border-b border-slate-800 pb-2 mb-4">
                              <Dna className="w-5 h-5" />
                              <h2 className="font-bold text-lg">Resumo</h2>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                                  <span className="block text-slate-500 mb-1">Fase Inicial</span>
                                  <span className="text-2xl font-bold text-white">
                                      {enableGroups ? `Grupos (${selectedGroupCount})` : 'Suíço'} ({customRounds} Rds)
                                  </span>
                              </div>
                              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                                  <span className="block text-slate-500 mb-1">Mata-Mata</span>
                                  <span className="text-2xl font-bold text-white">
                                      {customTopCut === 8 ? 'Top 8' : customTopCut === 4 ? 'Top 4' : 'Final (Top 2)'}
                                  </span>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="flex flex-col h-full space-y-4">
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex-1 flex-col min-h-[500px]">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                              <div className="flex items-center gap-2 text-green-400">
                                  <Users className="w-5 h-5" />
                                  <h2 className="font-bold text-lg">Inscrição de Jogadores</h2>
                              </div>
                              <div className="flex items-center gap-2">
                                  <Button 
                                      onClick={reshuffleAllColors}
                                      variant="ghost"
                                      className="px-2 py-1 h-8 text-xs text-slate-400 hover:text-white"
                                      title="Misturar todas as cores"
                                  >
                                      <Shuffle className="w-4 h-4 mr-1" /> Misturar Cores
                                  </Button>
                                  <span className="bg-slate-800 px-3 py-1 rounded-full text-xs font-mono text-slate-300">
                                      {players.length}/30
                                  </span>
                              </div>
                          </div>

                          <div className="flex gap-2 mb-6">
                              <Input 
                                  placeholder="Nome do Jogador" 
                                  value={newPlayerName}
                                  onChange={(e) => setNewPlayerName(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                              />
                              <Button onClick={addPlayer} disabled={players.length >= 30}>+</Button>
                          </div>

                          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                              {players.length === 0 && (
                                  <div className="flex flex-col items-center justify-center h-40 text-slate-600 border-2 border-dashed border-slate-800 rounded-xl">
                                      <Users className="w-8 h-8 mb-2 opacity-50" />
                                      <p>Nenhum jogador inscrito</p>
                                  </div>
                              )}
                              {players.map((p, idx) => {
                                  const badgeStyle = getPlayerBadgeStyle(p.colors);
                                  return (
                                    <div key={p.id} className="group flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-indigo-500/50 transition-all">
                                        <div className="flex items-center gap-3 w-full">
                                            <span className="w-6 h-6 flex items-center justify-center bg-slate-700 rounded text-xs text-slate-300 font-mono shrink-0">
                                                {idx + 1}
                                            </span>
                                            <div 
                                                className="px-3 py-1 rounded-md font-bold text-sm shadow-md flex-1 truncate cursor-pointer hover:opacity-80 transition-opacity"
                                                style={badgeStyle}
                                                onClick={() => cyclePlayerPrimaryColor(p.id)}
                                                title="Clique para trocar cor principal (apenas se disponível)"
                                            >
                                                {p.name}
                                                <RefreshCcw className="w-3 h-3 inline-block ml-2 opacity-70" />
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => removePlayer(p.id)}
                                            className="text-slate-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                  );
                              })}
                          </div>

                          <div className="pt-6 mt-4 border-t border-slate-800">
                              <Button 
                                  onClick={startTournament} 
                                  className={`w-full py-4 text-lg shadow-xl ${players.length >= 4 ? 'shadow-indigo-500/20' : ''}`} 
                                  disabled={players.length < 4}
                              >
                                  <PlayCircle className="w-5 h-5" />
                                  Iniciar Torneio
                              </Button>
                              {players.length < 4 && (
                                  <p className="text-center text-xs text-red-400 mt-2">
                                      Adicione pelo menos mais {4 - players.length} jogadores.
                                  </p>
                              )}
                          </div>
                      </div>
                  </div>

              </div>
          </div>
      );
  }

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden text-slate-200 font-sans">
        
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 lg:px-6 shrink-0 z-30 shadow-lg">
            <div className="flex items-center gap-4">
                <div className="lg:hidden">
                    <Button variant="ghost" onClick={() => setMobileMenuOpen(mobileMenuOpen === 'leaderboard' ? 'none' : 'leaderboard')}>
                        <Menu className="w-5 h-5" />
                    </Button>
                </div>
                <div>
                    <h1 className="font-bold text-slate-100 text-lg truncate max-w-[150px] lg:max-w-xs">
                        {tournament.name}
                    </h1>
                    <div className="flex items-center gap-2 text-xs font-mono">
                        <span className={`w-2 h-2 rounded-full ${tournament.phase === TournamentPhase.FINISHED ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></span>
                        {tournament.phase === TournamentPhase.SWISS ? (tournament.activeGroups ? 'FASE DE GRUPOS' : 'FASE SUÍÇA') : tournament.phase === TournamentPhase.ELIMINATION ? 'MATA-MATA' : 'FINALIZADO'}
                    </div>
                </div>
            </div>

            {isPhaseWithTimer && (
                <div className="absolute left-1/2 transform -translate-x-1/2 hidden md:flex items-center gap-2">
                    {!tournament.roundStartTime && !tournament.ignoreTimer && !allMatchesFinished && isAdmin ? (
                         <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
                              <Button onClick={startTimer} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500">
                                   <Play className="w-3 h-3 mr-1" /> 
                                   {tournament.phase === TournamentPhase.ELIMINATION ? `Iniciar Tempo (${eliminationStageLabel})` : 'Iniciar Tempo'}
                              </Button>
                              <Button onClick={enableFreeTime} variant="ghost" className="h-8 text-xs text-slate-400 hover:text-white">
                                   Pular (Tempo Livre)
                              </Button>
                         </div>
                    ) : (
                        <RoundTimer 
                            startTime={tournament.roundStartTime} 
                            durationSeconds={tournament.roundDurationSeconds}
                            isFinished={allMatchesFinished}
                            isIgnored={tournament.ignoreTimer}
                            onStart={startTimer}
                        />
                    )}
                </div>
            )}

            <div className="flex items-center gap-3">
                <Button onClick={shareTournament} variant="ghost" title="Copiar Link" className="text-indigo-400">
                    <Share2 className="w-5 h-5" />
                </Button>

                {isPhaseWithTimer && !tournament.roundStartTime && !tournament.ignoreTimer && !allMatchesFinished && isAdmin && (
                     <div className="md:hidden flex gap-2">
                        <Button onClick={startTimer} className="bg-indigo-600/20 text-indigo-300">
                             <Play className="w-4 h-4" />
                        </Button>
                         <Button onClick={enableFreeTime} variant="ghost" className="px-2">
                             <SkipForward className="w-4 h-4" />
                        </Button>
                     </div>
                )}
                 {isPhaseWithTimer && (tournament.roundStartTime || tournament.ignoreTimer || allMatchesFinished) && (
                     <div className="md:hidden flex items-center gap-1">
                        <RoundTimer 
                            startTime={tournament.roundStartTime} 
                            durationSeconds={tournament.roundDurationSeconds}
                            isFinished={allMatchesFinished}
                            isIgnored={tournament.ignoreTimer}
                            onStart={startTimer}
                            className="text-xs px-2 py-1"
                        />
                     </div>
                )}

                {tournament.phase === TournamentPhase.SWISS && isAdmin && (
                    <Button 
                        onClick={handleNextSwissRound} 
                        className={`hidden lg:flex text-sm py-1.5 h-9 ${!allMatchesFinished ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                    >
                        {tournament.currentRound < tournament.totalSwissRounds ? (
                            <>Próxima Rodada <ChevronRight className="w-4 h-4 ml-1" /></>
                        ) : (
                            <>Gerar Finais <Swords className="w-4 h-4 ml-1" /></>
                        )}
                    </Button>
                )}

                {tournament.phase === TournamentPhase.ELIMINATION && isAdmin && !eliminationStageLabel.includes("Encerrado") && (
                    <Button
                        onClick={resetTimer}
                        disabled={!allMatchesFinished} 
                        className={`hidden lg:flex text-sm py-1.5 h-9 ${!allMatchesFinished ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 animate-pulse'}`}
                    >
                        {allMatchesFinished ? `Avançar Próxima Fase` : `Aguardando ${eliminationStageLabel}`}
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                )}

                {tournament.phase === TournamentPhase.ELIMINATION && isAdmin && eliminationStageLabel.includes("Encerrado") && (
                    <Button
                        onClick={endTournament}
                        className="hidden lg:flex text-sm py-1.5 h-9 bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20"
                    >
                        Encerrar Torneio <LogOut className="w-4 h-4 ml-1" />
                    </Button>
                )}
            </div>
        </header>

        <div className="flex-1 flex overflow-hidden relative">
            <aside className={`
                absolute lg:relative top-0 left-0 w-96 h-full bg-slate-900 border-r border-slate-800 z-20 transition-transform duration-300
                ${mobileMenuOpen === 'leaderboard' ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <Leaderboard 
                    players={tournament.players} 
                    totalSwissRounds={tournament.totalSwissRounds} 
                    className="h-full" 
                    groups={tournament.activeGroups}
                    qualificationMap={projectedQualification}
                />
                <button 
                    onClick={() => setMobileMenuOpen('none')}
                    className="lg:hidden absolute top-4 right-4 p-2 bg-slate-800 rounded-full text-slate-400"
                >
                    <X className="w-4 h-4" />
                </button>
            </aside>

            <main className="flex-1 overflow-hidden flex flex-col relative bg-slate-950/50">
                <div className="lg:hidden bg-slate-900/50 p-2 text-center text-xs border-b border-slate-800/50 text-slate-400">
                    {tournament.phase === TournamentPhase.SWISS 
                      ? `${tournament.activeGroups ? 'Grupos' : 'Rodada'} ${tournament.currentRound} de ${tournament.totalSwissRounds}`
                      : `${eliminationStageLabel}`
                    }
                    {isAdmin && allMatchesFinished && (
                        <button 
                            onClick={
                                tournament.phase === TournamentPhase.SWISS ? handleNextSwissRound : 
                                eliminationStageLabel.includes("Encerrado") ? endTournament : resetTimer
                            } 
                            className={`ml-2 font-bold underline ${eliminationStageLabel.includes("Encerrado") ? 'text-red-400' : 'text-indigo-400'}`}
                        >
                             {eliminationStageLabel.includes("Encerrado") ? 'Encerrar' : 'Avançar >'}
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth">
                    <BracketView 
                        matches={tournament.matches}
                        players={tournament.players}
                        currentRound={tournament.currentRound}
                        phase={tournament.phase}
                        onMatchClick={(m) => {
                             setSelectedMatch(m);
                        }}
                    />
                </div>
                
                <div className="p-2 border-t border-slate-800 bg-slate-900 flex justify-end text-xs">
                    <button 
                        onClick={() => setIsAdmin(!isAdmin)} 
                        className={`flex items-center gap-2 px-3 py-1 rounded-full ${isAdmin ? 'bg-indigo-900/20 text-indigo-400' : 'bg-green-900/20 text-green-400'}`}
                    >
                        {isAdmin ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {isAdmin ? 'Modo Admin' : 'Simular Espectador'}
                    </button>
                </div>
            </main>

            {mobileMenuOpen !== 'none' && (
                <div 
                    className="fixed inset-0 bg-black/50 z-10 lg:hidden backdrop-blur-sm"
                    onClick={() => setMobileMenuOpen('none')}
                />
            )}
        </div>

        {selectedMatch && (
            <MatchModal 
                match={selectedMatch}
                players={tournament.players}
                isOvertime={isCurrentRoundOvertime && !selectedMatch.isBye && !selectedMatch.isElimination && !tournament.ignoreTimer}
                readOnly={!isAdmin || (selectedMatch.isBye && !isAdmin)}
                timerStarted={!!tournament.roundStartTime}
                ignoreTimer={tournament.ignoreTimer}
                onClose={() => setSelectedMatch(null)}
                onUpdate={handleMatchUpdate}
            />
        )}
    </div>
  );
};

export default App;
