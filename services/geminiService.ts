import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Visit, ClientBaseRow } from "../types";

// Helper to get AI instance safely
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found in process.env.API_KEY");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Reusable retry logic for Gemini API calls to handle 429 Quota errors.
 * Uses exponential backoff.
 */
export const runWithRetry = async <T>(
  operation: () => Promise<T>, 
  retries = 3, 
  delay = 2000
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    const isQuotaError = error?.status === 429 || 
                         error?.code === 429 || 
                         error?.message?.includes('429') || 
                         error?.message?.includes('quota') ||
                         error?.message?.includes('RESOURCE_EXHAUSTED');
    
    if (retries > 0 && isQuotaError) {
      console.warn(`Gemini API Quota Exceeded (429). Retrying in ${delay}ms... (Attempts left: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      // Exponential backoff: double the delay
      return runWithRetry(operation, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const getDashboardInsights = async (role: string, dataSummary: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "IA indisponível. Verifique a chave de API.";

  try {
    const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        Atue como um estrategista de vendas sênior da 'Pagmotors' (Webmotors Serviços Automotivos).
        
        CONTEXTO DO NEGÓCIO:
        - Produto: Maquininha de cartão e serviços financeiros para Oficinas/Lojas de Carros.
        - Foco: Aumentar TPV (Volume Transacionado) e Conversão de Novos Clientes.
        
        PERFIL DO USUÁRIO: ${role}
        
        DADOS OPERACIONAIS DO MOMENTO:
        ${dataSummary}
        
        TAREFA:
        Gere um "Plano de Ação Tático" com no máximo 4 pontos cruciais.
        
        DIRETRIZES ESPECÍFICAS POR PERFIL:
        
        1. SE FOR "FIELD SALES" OU "INSIDE SALES":
           - Identifique clientes específicos citados nos dados (ex: "Oficina X está em negociação").
           - Priorize follow-ups atrasados ou negociações paradas ("Em negociação").
           - Sugira ações para carteira inativa (Risco de Churn).
        
        2. SE FOR "GESTOR":
           - Identifique nominalmente qual consultor precisa de ajuda (baixa conversão ou muitas visitas sem sucesso).
           - Aponte gargalos no funil (ex: "Muitas visitas, pouca conversão").
           - Sugira uma ação de liderança imediata.

        FORMATO DE RESPOSTA (Markdown simples):
        - Use emojis para destacar (🔥 Urgente, 💰 Oportunidade, ⚠️ Atenção).
        - Seja direto. Ex: "🔥 **Oficina do Zé**: Está em negociação há 5 dias. Ligue agora oferecendo isenção de aluguel."
        - Não faça introduções longas. Vá direto aos pontos.
      `,
    }));
    return response.text || "Sem insights no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Não foi possível gerar insights agora.";
  }
};

export const optimizeRoute = async (visits: Visit[], startLocation?: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "AI service unavailable.";

  const addresses = visits.map(v => `${v.clientName} (${v.address})`).join(', ');
  const startContext = startLocation ? `O ponto de partida OBRIGATÓRIO é a localização atual do consultor em: ${startLocation}.` : "Assuma que começamos no centro da cidade.";

  try {
    const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        Você é um assistente de logística inteligente. Organize a seguinte lista de visitas na melhor ordem lógica de rota para economizar tempo e combustível.
        
        ${startContext}
        
        Lista de Visitas a organizar: ${addresses}

        Retorne APENAS a lista ordenada numerada, começando pela visita mais próxima do ponto de partida e seguindo a sequência lógica. Adicione uma breve justificativa de trânsito simulada para a escolha da primeira parada.
      `,
    }));
    return response.text || "Não foi possível otimizar a rota.";
  } catch (error) {
    console.error("Gemini Route Error:", error);
    return "Erro ao calcular rota.";
  }
};

export const getGeographicInsights = async (clients: ClientBaseRow[]): Promise<string> => {
  const ai = getAI();
  if (!ai) return "IA indisponível.";

  // Simplify data for token efficiency
  const clientData = clients.slice(0, 30).map(c => 
    `- ID ${c.id} (${c.nomeEc}): Região ${c.regiaoAgrupada}, Field: ${c.fieldSales}`
  ).join('\n');

  try {
    const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        Você é um especialista em Inteligência Geográfica e Gestão de Territórios Comerciais.
        Analise a lista de clientes abaixo (Amostra):
        
        ${clientData}

        TAREFA:
        Identifique possíveis divergências ou ineficiências na alocação da carteira (ex: Consultor X atendendo região que não é a principal dele, ou regiões misturadas).
        
        FORMATO DE RESPOSTA (JSON):
        Retorne APENAS um texto simples (não markdown, não json) com 3 tópicos curtos de alerta/sugestão.
        Exemplo de formato:
        "⚠️ O EC X está fora da região do consultor Y. Sugestão: realocar para Z."
        "📍 Concentração alta na Zona Sul para Consultor A."
      `,
    }));
    return response.text || "Análise geográfica concluída sem alertas críticos.";
  } catch (error) {
    console.error("Gemini Geo Error:", error);
    return "Erro ao analisar o território.";
  }
};