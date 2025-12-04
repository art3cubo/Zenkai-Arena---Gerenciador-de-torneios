import { GoogleGenAI, Type } from "@google/genai";
import { Match, Player } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// System instruction for the "Judge" persona
const JUDGE_SYSTEM_INSTRUCTION = `
Você é um Juiz Especialista e Narrador de torneios de jogos de cartas (TCG/CCG).
O usuário criou um jogo de cartas próprio.
Suas funções:
1. Responder dúvidas sobre regras (baseado no contexto que o usuário fornecer).
2. Gerar narrativas emocionantes sobre as partidas.
3. Sugerir nomes criativos para torneios.
Mantenha um tom profissional, mas entusiasta, estilo "Mestre de RPG" ou "Comentarista de E-sports".
Se não souber uma regra específica do jogo customizado, pergunte ao usuário como funciona antes de julgar.
`;

export const generateTournamentName = async (theme: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Gere um nome épico para um torneio de cartas com o tema: "${theme}". Retorne apenas o nome, sem aspas.`,
      config: {
        systemInstruction: "Seja criativo, curto e impactante.",
      }
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating name:", error);
    return "Torneio Sem Nome";
  }
};

export const generateMatchCommentary = async (
  match: Match,
  p1: Player,
  p2: Player,
  gameContext: string
): Promise<string> => {
  try {
    const prompt = `
      Escreva um comentário curto (max 2 frases) sobre o resultado desta partida.
      Jogo: ${gameContext || "Jogo de Cartas Customizado"}
      Jogador 1: ${p1.name} (Score: ${match.score1})
      Jogador 2: ${p2.name} (Score: ${match.score2})
      Vencedor: ${match.winnerId === p1.id ? p1.name : p2.name}
      Use linguagem de e-sports ou fantasia.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: JUDGE_SYSTEM_INSTRUCTION,
      }
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating commentary:", error);
    return "Uma partida intensa aconteceu!";
  }
};

export const askRuleJudge = async (
  history: {role: 'user' | 'model', text: string}[],
  question: string,
  rulesSummary: string
) => {
  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `${JUDGE_SYSTEM_INSTRUCTION}. 
        O resumo das regras do jogo atual é: "${rulesSummary || 'Regras padrão de batalha de cartas'}"`,
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const response = await chat.sendMessage({ message: question });
    return response.text;
  } catch (error) {
    console.error("Error asking judge:", error);
    return "Desculpe, estou tendo dificuldades para consultar o livro de regras estelares agora.";
  }
};

export const suggestPlayerPairings = async (players: Player[]): Promise<string> => {
   // This is a creative helper, not actual logic execution, meant to give advice
   try {
     const playerNames = players.map(p => p.name).join(", ");
     const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Tenho estes jogadores: ${playerNames}. Sugira 3 matchups interessantes baseados apenas nos nomes (invente rivalidades fictícias).`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        p1: { type: Type.STRING },
                        p2: { type: Type.STRING },
                        reason: { type: Type.STRING }
                    }
                }
            }
        }
     });
     return response.text;
   } catch (e) {
       return "[]";
   }
}
