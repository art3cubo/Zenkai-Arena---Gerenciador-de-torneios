
export enum MatchStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export enum TournamentPhase {
  REGISTRATION = 'REGISTRATION',
  SWISS = 'SWISS',
  ELIMINATION = 'ELIMINATION',
  FINISHED = 'FINISHED'
}

export interface Player {
  id: string;
  name: string;
  deckName?: string;
  registrationOrder: number;
  colors: string[]; // Changed from single string to array of hex strings
  groupId?: string; // Group ID (A, B, C...) for Group Phase
  
  // Stats
  wins: number;
  losses: number;
  draws: number;
  
  // Scoring
  matchPoints: number; // Points scored inside matches
  tournamentPoints: number; // (matchPoints) + (wins * 2)
  
  // Tiebreakers
  desafio: number; // Sum of tournamentPoints of opponents who defeated this player
  
  // Meta
  opponents: string[]; // IDs of players faced
  history: ('W' | 'L' | 'D' | 'B')[]; // Win, Loss, Draw, Bye - Ordered by round
  hasReceivedBye: boolean;
}

export interface Match {
  id: string;
  round: number;
  isElimination: boolean; // True if part of the final bracket
  
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  
  score1: number;
  score2: number;
  
  status: MatchStatus;
  nextMatchId: string | null; // For elimination bracket (Winner goes here)
  loserNextMatchId?: string | null; // For elimination bracket (Loser goes here - e.g. 3rd place)
  
  isBye: boolean; // If true, player1 wins automatically
  commentary?: string;
  finishedOvertime?: boolean; // True if finished after round timer expired
}

export interface Tournament {
  id: string;
  name: string;
  phase: TournamentPhase;
  
  currentRound: number;
  totalSwissRounds: number;
  topCutSize: number; // 2, 4, or 8
  activeGroups?: string[]; // List of active group IDs (e.g. ['A', 'B'])
  
  // Timer Logic
  roundStartTime: number | null; // Timestamp when round started
  roundDurationSeconds: number; // Default 45 * 60
  ignoreTimer: boolean; // If true, matches can be edited without timer and no overtime penalty
  
  players: Player[];
  matches: Match[];
  rulesSummary?: string;
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}