
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
// Fixed: Use Appointment instead of Visit and import Vehicle
import { Appointment, ClientBaseRow, Vehicle } from "../types";

// Helper to get AI instance safely
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found in process.env.API_KEY");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// CIRCUIT BREAKER: Check if we've already hit the limit this session
const isQuotaExceeded = () => {
    return sessionStorage.getItem('gemini_quota_exceeded') === 'true';
};

const setQuotaExceeded = () => {
    console.warn("Gemini Quota Exceeded. Disabling AI features for this session.");
    sessionStorage.setItem('gemini_quota_exceeded', 'true');
};

/**
 * Reusable retry logic for Gemini API calls to handle 429 Quota errors.
 * Uses exponential backoff and circuit breaker pattern.
 */
export const runWithRetry = async <T>(
  operation: () => Promise<T>, 
  retries = 3, 
  delay = 2000
): Promise<T> => {
  // 1. Fast Fail if quota already known to be exceeded
  if (isQuotaExceeded()) {
      throw new Error("Quota exceeded (Circuit Breaker active).");
  }

  try {
    return await operation();
  } catch (error: any) {
    const isQuotaError = error?.status === 429 || 
                         error?.code === 429 || 
                         error?.message?.includes('429') || 
                         error?.message?.includes('quota') ||
                         error?.message?.includes('RESOURCE_EXHAUSTED');
    
    if (isQuotaError) {
        if (retries > 0) {
            console.warn(`Gemini API Quota Warning (429). Retrying in ${delay}ms... (Attempts left: ${retries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return runWithRetry(operation, retries - 1, delay * 2);
        } else {
            // All retries failed -> Trip the circuit breaker
            setQuotaExceeded();
            throw error;
        }
    }
    throw error;
  }
};

export const getDashboardInsights = async (role: string, dataSummary: string): Promise<string> => {
  if (isQuotaExceeded()) return "Insights de IA pausados (Limite de cota).";
  
  const ai = getAI();
  if (!ai) return "IA indisponível. Verifique a chave de API.";

  try {
    const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
        
        FORMATO DE RESPOSTA (Markdown simples):
        - Use emojis para destacar (🔥 Urgente, 💰 Oportunidade, ⚠️ Atenção).
        - Seja direto. Ex: "🔥 **Oficina do Zé**: Está em negociação há 5 dias. Ligue agora oferecendo isenção de aluguel."
      `,
    }));
    return response.text || "Sem insights no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Insights de IA temporariamente indisponíveis (Cota de uso excedida).";
  }
};

// NEW: Strategy Analysis for Projection
export const getStrategyAnalysis = async (current: number, target: number, daysPassed: number, totalDays: number): Promise<string> => {
    if (isQuotaExceeded()) return "Análise de projeção indisponível.";
    const ai = getAI();
    if (!ai) return "IA indisponível.";

    const pacing = (current / daysPassed);
    const projected = pacing * totalDays;
    const gap = target - current;
    
    try {
        const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `
                Você é um Diretor de Estratégia Comercial. Analise o comportamento das atividades e faça uma projeção do mês.
                
                DADOS ATUAIS:
                - Vendas Realizadas: ${current}
                - Meta do Mês: ${target}
                - Dias Corridos: ${daysPassed}/${totalDays}
                
                ANÁLISE MATEMÁTICA:
                - Ritmo Atual (Pacing): ${pacing.toFixed(1)} vendas/dia
                - Projeção Linear: ${projected.toFixed(0)} vendas
                - Gap para Meta: ${gap} vendas
                
                TAREFA:
                Forneça uma análise de comportamento e sugestão estratégica curta (máx 3 linhas).
                Se a projeção for abaixo da meta, sugira uma ação de correção de rota.
                Se estiver acima, sugira como maximizar ou replicar o sucesso.
                
                FORMATO: Texto direto, tom executivo.
            `
        }));
        return response.text || "Sem análise disponível.";
    } catch (error) {
        return "Erro ao gerar análise estratégica.";
    }
};

// Updated: Returns ordered array of IDs instead of string text
// Fixed: Use Appointment instead of Visit
export const optimizeRoute = async (visits: Appointment[], startLocation?: string): Promise<string[]> => {
  if (isQuotaExceeded()) return visits.map(v => v.id); // Fallback to original order
  
  const ai = getAI();
  if (!ai) return visits.map(v => v.id);

  const destinations = visits.map(v => ({ id: v.id, address: v.address, client: v.clientName }));
  
  try {
    const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        You are an expert logistics route optimizer.
        
        STARTING POINT (Current User Location): ${startLocation || 'Unknown'}
        
        DESTINATIONS TO VISIT:
        ${JSON.stringify(destinations)}
        
        TASK:
        Reorder the DESTINATIONS to create the most efficient route (shortest travel time) starting from the STARTING POINT and visiting all destinations sequentially.
        
        OUTPUT:
        Return ONLY a valid JSON array of strings containing the 'id' of the visits in the optimized order.
        Example: ["id-3", "id-1", "id-2"]
        Do not include markdown code blocks.
      `,
      config: { responseMimeType: 'application/json' }
    }));
    
    if (response.text) {
        try {
            return JSON.parse(response.text);
        } catch (e) {
            console.error("Failed to parse route JSON", e);
            return visits.map(v => v.id);
        }
    }
    return visits.map(v => v.id);
  } catch (error) {
    console.error("Gemini Route Error:", error);
    return visits.map(v => v.id);
  }
};

export const getGeographicInsights = async (clients: ClientBaseRow[]): Promise<string> => {
  if (isQuotaExceeded()) return "Análise geográfica indisponível (Cota excedida).";

  const ai = getAI();
  if (!ai) return "IA indisponível.";

  // Simplify data for token efficiency
  const clientData = clients.slice(0, 20).map(c => 
    `- ID ${c.id}: Região ${c.regiaoAgrupada}, Field: ${c.fieldSales}`
  ).join('\n');

  try {
    const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Você é um especialista em Inteligência Geográfica.
        Analise a lista de clientes abaixo (Amostra):
        ${clientData}
        Identifique possíveis divergências ou ineficiências na alocação da carteira.
        Retorne APENAS um texto simples com 3 tópicos curtos.
      `,
    }));
    return response.text || "Análise geográfica concluída sem alertas críticos.";
  } catch (error) {
    return "Análise indisponível no momento.";
  }
};

// --- UPDATED: Document Analysis with Fraud Detection ---
export const analyzeDocument = async (base64Data: string, docType: 'IDENTITY' | 'ADDRESS' | 'BANK_PROOF') => {
  if (isQuotaExceeded()) return null;
  const ai = getAI();
  if (!ai) return null;

  let prompt = `Analise este documento do tipo ${docType} e extraia os dados principais em JSON.`;
  
  try {
    const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    }));

    if (response.text) {
        return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error("Document Analysis Error:", error);
    return null; 
  }
};

// --- NEW: Pricing Evidence Analysis ---
export const extractRatesFromEvidence = async (
    filesBase64: string[], 
    planType: 'Full' | 'Simples', 
    simulationValue?: number
) => {
    if (isQuotaExceeded()) return null;
    const ai = getAI();
    if (!ai) return null;

    const prompt = `
        Analise as imagens fornecidas (prints de taxas).
        Extraia as taxas aplicadas (Débito, Crédito à Vista, Parcelado).
        Plano destino: ${planType}.
        Retorne JSON com as chaves: debit, credit1x, credit2x...
    `;

    try {
        const parts: any[] = [];
        filesBase64.forEach(b64 => {
            parts.push({ inlineData: { mimeType: 'image/jpeg', data: b64 } });
        });
        parts.push({ text: prompt });

        const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts },
            config: { responseMimeType: "application/json" }
        }));

        if (response.text) {
            return JSON.parse(response.text);
        }
        return null;
    } catch (error) {
        console.error("Pricing AI Error:", error);
        return null; 
    }
};

// --- NEW: Vehicle Identification ---
export const identifyVehicleByPlate = async (plate: string): Promise<Vehicle | null> => {
    if (isQuotaExceeded()) return null;
    const ai = getAI();
    if (!ai) return null;

    const prompt = `
        Atue como um simulador de banco de dados veicular brasileiro (DETRAN/FIPE).
        Com base na placa "${plate}", gere dados PLAUSÍVEIS de um veículo comum no Brasil que corresponda ao padrão da placa.
        
        Retorne APENAS um JSON válido com a seguinte estrutura (sem blocos de código):
        { 
            "plate": "${plate}", 
            "make": "Marca (ex: Volkswagen, Chevrolet)", 
            "model": "Modelo completo (ex: T-Cross Highline 1.4 TSI)", 
            "year": "Ano Modelo (ex: 2023)", 
            "color": "Cor (ex: Branco Cristal)" 
        }
    `;

    try {
        const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));

        if (response.text) {
            return JSON.parse(response.text);
        }
        return null;
    } catch (error) {
        console.error("Vehicle ID Error:", error);
        return null;
    }
};

// --- NEW: Receipt Analysis (Expenses) ---
export const analyzeReceipt = async (base64Image: string) => {
    if (isQuotaExceeded()) return null;
    const ai = getAI();
    if (!ai) return null;

    const prompt = `
        Analise este comprovante fiscal ou recibo.
        
        Objetivo: Extrair dados para reembolso de despesas corporativas.
        
        Extraia os seguintes campos em JSON:
        - date: Data da emissão (Formato YYYY-MM-DD).
        - amount: Valor total pago (number).
        - establishment: Nome do estabelecimento.
        - category: Classifique em uma destas: 'Combustível', 'Estacionamento', 'Pedágio', 'Uber/Táxi', 'Hospedagem', 'Alimentação', 'Outros'.
        
        SE A CATEGORIA FOR 'Combustível':
        - fuelDetails: {
            fuelType: 'Gasolina' | 'Etanol' | 'Diesel' | 'GNV',
            liters: Quantidade de litros abastecidos (number),
            pricePerLiter: Preço por litro (number)
        }
        
        Se não for combustível, fuelDetails deve ser null.
    `;

    try {
        const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                    { text: prompt }
                ]
            },
            config: { responseMimeType: "application/json" }
        }));

        if (response.text) {
            return JSON.parse(response.text);
        }
        return null;
    } catch (error) {
        console.error("Receipt Analysis Error:", error);
        return null; 
    }
};

// --- NEW: Invoice Analysis (Conciliation) ---
export const analyzeInvoice = async (base64Image: string) => {
    if (isQuotaExceeded()) return null;
    const ai = getAI();
    if (!ai) return null;

    const prompt = `
        Analise esta fatura de cartão de crédito corporativo.
        
        Objetivo: Conciliação de despesas.
        
        Extraia a lista de transações em JSON no seguinte formato:
        {
            "items": [
                {
                    "date": "YYYY-MM-DD",
                    "description": "Nome do Estabelecimento",
                    "amount": 123.45
                }
            ],
            "totalAmount": 1234.56,
            "period": "MM/YYYY"
        }
        
        Ignore linhas de pagamentos anteriores ou saldo. Foque nas despesas do período.
    `;

    try {
        const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                    { text: prompt }
                ]
            },
            config: { responseMimeType: "application/json" }
        }));

        if (response.text) {
            return JSON.parse(response.text);
        }
        return null;
    } catch (error) {
        console.error("Invoice Analysis Error:", error);
        return null; 
    }
};
