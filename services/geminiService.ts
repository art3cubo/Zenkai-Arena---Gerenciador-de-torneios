import { Match, Player } from "../types";

// NOTE: AI features have been disabled. These are stub functions to prevent build errors.

export const generateTournamentName = async (theme: string): Promise<string> => {
  return "Torneio Sem Nome";
};

export const generateMatchCommentary = async (
  match: Match,
  p1: Player,
  p2: Player,
  gameContext: string
): Promise<string> => {
  return "Partida concluída.";
};

export const askRuleJudge = async (
  history: {role: 'user' | 'model', text: string}[],
  question: string,
  rulesSummary: string
) => {
  return "O Juiz IA está desativado nesta versão.";
};

export const suggestPlayerPairings = async (players: Player[]): Promise<string> => {
   return "[]";
}