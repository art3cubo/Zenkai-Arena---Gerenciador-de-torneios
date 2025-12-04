import { Match, Player } from "../types";

// NOTE: AI features have been disabled. These are stub functions to prevent build errors.

export const generateTournamentName = async (): Promise<string> => {
  return "Torneio Sem Nome";
};

export const generateMatchCommentary = async (): Promise<string> => {
  return "Partida concluída.";
};

export const askRuleJudge = async () => {
  return "O Juiz IA está desativado nesta versão.";
};

export const suggestPlayerPairings = async (): Promise<string> => {
   return "[]";
}