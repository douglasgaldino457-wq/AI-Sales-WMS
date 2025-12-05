
import { GoogleGenAI } from "@google/genai";

// --- 1. Reference Database (Mock) ---
interface RegionRule {
  uf: string;
  city: string;
  region: string;
  neighborhoods: string[];
}

const REFERENCE_DB: RegionRule[] = [
  {
    uf: 'SP',
    city: 'SÃO PAULO',
    region: 'Zona Sul SP',
    neighborhoods: ['MOEMA', 'VILA MARIANA', 'ITAIM BIBI', 'SAUDE', 'JABAQUARA', 'SANTO AMARO', 'BROOKLIN', 'CAMPO BELO', 'VILA OLIMPIA', 'MORUMBI']
  },
  {
    uf: 'SP',
    city: 'SÃO PAULO',
    region: 'Zona Norte SP',
    neighborhoods: ['SANTANA', 'TUCURUVI', 'CASA VERDE', 'VILA GUILHERME', 'JAÇANÃ', 'MANDAQUI', 'FREGUESIA DO O']
  },
  {
    uf: 'SP',
    city: 'SÃO PAULO',
    region: 'Zona Leste SP',
    neighborhoods: ['MOOCA', 'TATUAPÉ', 'ITAKERA', 'PENHA', 'VILA PRUDENTE', 'BELÉM', 'CARRÃO', 'ARICANDUVA']
  },
  {
    uf: 'SP',
    city: 'SÃO PAULO',
    region: 'Zona Oeste SP',
    neighborhoods: ['LAPA', 'PINHEIROS', 'PERDIZES', 'VILA MADALENA', 'BUTANTÃ', 'JAGUARÉ', 'BARRA FUNDA']
  },
  {
    uf: 'SP',
    city: 'SÃO PAULO',
    region: 'Centro SP',
    neighborhoods: ['SÉ', 'REPÚBLICA', 'BELA VISTA', 'CONSOLAÇÃO', 'SANTA CECÍLIA', 'BOM RETIRO', 'LIBERDADE']
  },
  {
    uf: 'RJ',
    city: 'RIO DE JANEIRO',
    region: 'Zona Oeste RJ',
    neighborhoods: ['BARRA DA TIJUCA', 'RECREIO', 'JACAREPAGUÁ', 'CAMPO GRANDE', 'BANGU']
  },
  {
    uf: 'RJ',
    city: 'RIO DE JANEIRO',
    region: 'Zona Sul RJ',
    neighborhoods: ['COPACABANA', 'IPANEMA', 'LEBLON', 'BOTAFOGO', 'FLAMENGO', 'LARANJEIRAS']
  },
  {
    uf: 'RJ',
    city: 'RIO DE JANEIRO',
    region: 'Zona Norte RJ',
    neighborhoods: ['TIJUCA', 'MEIER', 'MADUREIRA', 'PENHA', 'ILHA DO GOVERNADOR']
  },
  {
    uf: 'RJ',
    city: 'RIO DE JANEIRO',
    region: 'Centro RJ',
    neighborhoods: ['CENTRO', 'LAPA', 'GLORIA', 'SANTO CRISTO']
  }
];

// --- 2. Helper Functions ---

const normalize = (text: string): string => {
  return text
    .toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .trim();
};

// Levenshtein Distance for Fuzzy Matching
const levenshteinDistance = (a: string, b: string): number => {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

// --- 3. Main Model Function ---

export const predictRegion = async (
  bairro: string, 
  cidade: string, 
  uf: string
): Promise<{ region: string; method: 'EXACT' | 'FUZZY' | 'AI' | 'FALLBACK'; confidence: string }> => {
  
  // A. Input Validation & Fallback Logic
  if (!bairro && !cidade) return { region: 'Região Não Identificada', method: 'FALLBACK', confidence: 'Low' };

  const nBairro = normalize(bairro || '');
  const nCidade = normalize(cidade || '');
  const nUf = normalize(uf || '');

  // Filter Rules by UF and City (if available)
  const candidateRules = REFERENCE_DB.filter(r => 
    (!nUf || r.uf === nUf) && 
    (!nCidade || normalize(r.city) === nCidade)
  );

  // B. Exact Match
  for (const rule of candidateRules) {
    if (rule.neighborhoods.includes(nBairro)) {
      return { region: rule.region, method: 'EXACT', confidence: 'High' };
    }
  }

  // C. Fuzzy Match (Similarity)
  // Allow up to 2 character edits/typos
  let bestFuzzyMatch: { region: string; distance: number } | null = null;
  
  for (const rule of candidateRules) {
    for (const nb of rule.neighborhoods) {
      const distance = levenshteinDistance(nBairro, nb);
      // Threshold: Match if distance is small relative to string length (approx 20% error allowed)
      const allowedErrors = Math.max(2, Math.floor(nb.length * 0.3));
      
      if (distance <= allowedErrors) {
        if (!bestFuzzyMatch || distance < bestFuzzyMatch.distance) {
          bestFuzzyMatch = { region: rule.region, distance };
        }
      }
    }
  }

  if (bestFuzzyMatch) {
    return { region: bestFuzzyMatch.region, method: 'FUZZY', confidence: 'Medium' };
  }

  // D. Semantic Match (AI Fallback)
  // If local logic fails, we ask the LLM to infer based on geography
  const ai = getAI();
  if (ai) {
    try {
      const prompt = `
        Atue como um gerente de inteligência comercial focado em logística de Field Sales no Brasil.
        Sua missão é classificar o endereço abaixo em uma MACRO REGIÃO COMERCIAL (Região Agrupada).
        
        DADOS DE ENTRADA:
        Bairro: "${bairro}"
        Cidade: "${cidade}"
        UF: "${uf}"

        DIRETRIZES DE NOMENCLATURA (PADRÃO RIGOROSO):
        1. SÃO PAULO (Capital):
           - "Zona Norte SP", "Zona Sul SP", "Zona Leste SP", "Zona Oeste SP", "Centro SP".
        2. RIO DE JANEIRO (Capital):
           - "Zona Norte RJ", "Zona Sul RJ", "Zona Oeste RJ", "Centro RJ".
        3. CIDADES DA GRANDE SÃO PAULO (ex: Guarulhos, Osasco, ABC):
           - "Grande SP [Nome da Cidade/Região]" (ex: "Grande SP Guarulhos", "Grande SP ABC") ou apenas "Grande SP".
        4. OUTRAS CAPITAIS:
           - "Grande [Nome da Capital]" (ex: "Grande Curitiba", "Grande BH") ou divida em Zonas se for uma capital muito grande e o bairro for central.
        5. INTERIOR/LITORAL:
           - Use "Regional [Nome da Cidade Principal]" ou "Litoral [UF]" (ex: "Litoral SP", "Regional Campinas").

        OBJETIVO:
        Agrupar em áreas de atuação para consultores de vendas. Evite criar micro-regiões (bairros isolados).
        Sempre que possível, agrupe em uma Zona ou Região Metropolitana.
        Se o bairro for desconhecido ou ambíguo, baseie-se fortemente na Cidade e UF.

        SAÍDA:
        Retorne APENAS o nome da região, sem explicações, sem pontos finais.
        Exemplo: "Zona Sul SP"
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      let aiRegion = response.text?.trim() || "Região Não Identificada";
      aiRegion = aiRegion.replace(/\.$/, ''); // Remove trailing dot
      
      return { region: aiRegion, method: 'AI', confidence: 'High (Inferred)' };

    } catch (error) {
      console.error("AI Region Prediction Failed", error);
    }
  }

  return { region: 'Região Não Identificada', method: 'FALLBACK', confidence: 'None' };
};
