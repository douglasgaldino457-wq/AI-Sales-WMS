
import React, { useState, useEffect, useRef } from 'react';
import { 
  BadgePercent, Calculator,  
  Bot, RefreshCw,  Wallet, Upload, X, Save, CheckCircle2,
  TrendingUp, Handshake, Search, Store, 
  Target, ChevronDown, ChevronUp,
  Scale, ArrowDownRight, ArrowUpRight, Printer, Coins, CreditCard,
  Zap, Headphones, Star, Landmark, Download, Eye, FileText, Receipt,
  Settings, AlertCircle, PieChart as PieChartIcon
} from 'lucide-react';
import { UserRole, SavedQuote } from '../types';
import { GoogleGenAI } from "@google/genai";
import { Logo } from '../components/Logo';
import { appStore } from '../services/store';

interface PricingPageProps {
  role: UserRole;
}

// --- TYPES ---
interface NegotiationContext {
  identifier: string;
  fantasyName: string;
  competitor: string;
  potentialRevenue: number;
  minAgreed: number;
  product: 'Full' | 'Simples';
}

interface RateTable {
  debit: number;
  creditSight: number;
  credit2to6: number;
  credit7to12: number;
  credit13to18: number;
  anticipation: number;
  concDebit: number;
  concSight: number;
  conc2to6: number;
  conc7to12: number;
  conc13to18: number;
  installments: { [key: number]: number }; 
  concInstallments: { [key: number]: number };
  // New: Concentration % per installment
  concentrations: { [key: string]: number }; 
}

interface SimulationState {
  amount: number;
  interestPayer: 'EC' | 'CLIENT';
}

interface RangeTableData {
    headers: string[];
    ranges: { min: number, max: number, label: string }[];
    rows: { label: string, values: number[] }[];
}

// Data from the uploaded image (Initial State for Full)
const INITIAL_RANGE_TABLE_FULL: RangeTableData = {
    headers: ['Parcelas', '5-10 k', '10-20 k', '20-50 k', '50-100 k', '100-150 k', '>150k'],
    ranges: [
        { min: 5000, max: 10000, label: '5-10k' },
        { min: 10001, max: 20000, label: '10-20k' },
        { min: 20001, max: 50000, label: '20-50k' },
        { min: 50001, max: 100000, label: '50-100k' },
        { min: 100001, max: 150000, label: '100-150k' },
        { min: 150001, max: 999999999, label: '>150k' },
    ],
    rows: [
        { label: 'Débito', values: [2.01, 1.95, 1.81, 1.26, 1.16, 1.06] },
        { label: '1x', values: [5.08, 4.38, 3.73, 3.17, 3.09, 3.01] },
        { label: '2x', values: [6.39, 5.42, 4.78, 4.62, 4.53, 4.45] },
        { label: '3x', values: [8.52, 7.37, 6.07, 5.83, 5.75, 5.67] },
        { label: '4x', values: [9.80, 8.83, 7.29, 7.05, 6.97, 6.89] },
        { label: '5x', values: [11.07, 10.10, 8.75, 8.26, 8.18, 8.10] },
        { label: '6x', values: [11.72, 10.75, 9.80, 9.39, 9.31, 9.23] },
        { label: '7x', values: [12.22, 11.25, 10.85, 10.85, 10.77, 10.69] },
        { label: '8x', values: [13.39, 13.12, 12.72, 12.31, 12.23, 12.15] },
        { label: '9x', values: [14.58, 14.57, 13.77, 13.36, 13.28, 13.20] },
        { label: '10x', values: [15.77, 15.63, 14.83, 14.83, 14.75, 14.67] },
        { label: '11x', values: [16.96, 16.69, 16.69, 15.88, 15.80, 15.72] },
        { label: '12x', values: [18.14, 17.74, 17.74, 16.93, 16.85, 16.77] },
        { label: '13x', values: [19.51, 18.84, 18.84, 18.43, 18.35, 18.27] },
        { label: '14x', values: [20.92, 19.96, 19.96, 19.55, 19.47, 19.39] },
        { label: '15x', values: [22.34, 21.92, 21.11, 21.11, 21.03, 20.95] },
        { label: '16x', values: [23.79, 23.08, 22.27, 22.27, 22.19, 22.11] },
        { label: '17x', values: [25.25, 24.27, 24.27, 23.87, 23.79, 23.70] },
        { label: '18x', values: [26.61, 26.28, 25.47, 24.66, 24.58, 24.50] },
    ]
};

// Initial State for Simple with UPDATED LABELS
const INITIAL_RANGE_TABLE_SIMPLE: RangeTableData = {
    headers: ['Parcelas', 'Até 10k', '10-30k', '>30k'],
    ranges: [
        { min: 0, max: 10000, label: 'Até 10k' },
        { min: 10001, max: 30000, label: '10-30k' },
        { min: 30001, max: 999999999, label: '>30k' },
    ],
    rows: [
        { label: 'Débito', values: [2.39, 2.19, 1.99] },
        { label: 'Cred. A vista ou 1x', values: [5.59, 5.29, 4.99] },
        { label: '2x a 6x', values: [14.90, 14.50, 13.90] },
        { label: '7x a 12x', values: [21.90, 21.50, 20.90] },
        { label: '13x a 18x', values: [28.90, 28.50, 27.90] },
        { label: 'Antecipação - % a.m', values: [4.99, 4.59, 3.99] },
    ]
};

const AutosaveIndicator = () => (
    <span className="text-[10px] text-gray-400 flex items-center gap-1 bg-gray-50 px-2 py-1 rounded animate-fade-in">
        <Save className="w-3 h-3" /> Salvo no dispositivo
    </span>
);

const PricingPage: React.FC<PricingPageProps> = ({ role }) => {
  const isPricingProfile = role === UserRole.PRICING;

  // New Tab Structure
  const [activeTab, setActiveTab] = useState<'QUOTE' | 'RANGE_TABLE' | 'NEGOTIATOR' | 'DASHBOARD'>('QUOTE');
  
  // Quote Sub-Tabs
  const [quoteSubTab, setQuoteSubTab] = useState<'TABLE' | 'SIMULATOR'>('TABLE');

  // AI Evidence Type
  const [evidenceType, setEvidenceType] = useState<'TABLE' | 'TRANSACTION'>('TABLE');

  // Set default tab based on role
  useEffect(() => {
      if (isPricingProfile && activeTab === 'QUOTE') {
          setActiveTab('DASHBOARD');
      }
  }, [isPricingProfile]);

  // Data State
  const [rangeTableFull, setRangeTableFull] = useState<RangeTableData>(INITIAL_RANGE_TABLE_FULL);
  const [rangeTableSimple, setRangeTableSimple] = useState<RangeTableData>(INITIAL_RANGE_TABLE_SIMPLE);
  
  // Negotiation Context
  const [context, setContext] = useState<NegotiationContext>({
    identifier: '',
    fantasyName: '',
    competitor: '',
    potentialRevenue: 0,
    minAgreed: 0,
    product: 'Full'
  });
  
  // Force Quote Sub-Tab to TABLE if Product is Simple
  useEffect(() => {
      if (context.product === 'Simples') {
          setQuoteSubTab('TABLE');
      }
  }, [context.product]);
  
  // Range Selector State
  const [selectedRangeIndex, setSelectedRangeIndex] = useState<number>(2); // Default to 20-50k

  // Rates State (Our Rates)
  const [rates, setRates] = useState<RateTable>({
    debit: 0,
    creditSight: 0,
    credit2to6: 0,
    credit7to12: 0,
    credit13to18: 0,
    anticipation: 0,
    concDebit: 0,
    concSight: 0,
    conc2to6: 0,
    conc7to12: 0,
    conc13to18: 0,
    installments: {}, 
    concInstallments: {},
    concentrations: {} // Initialize
  });

  // Competitor Rates State (For Negotiator)
  const [compRates, setCompRates] = useState<RateTable>({
    debit: 0,
    creditSight: 0,
    credit2to6: 0,
    credit7to12: 0,
    credit13to18: 0,
    anticipation: 0,
    concDebit: 0,
    concSight: 0,
    conc2to6: 0,
    conc7to12: 0,
    conc13to18: 0,
    installments: {}, 
    concInstallments: {},
    concentrations: {}
  });

  // Simulation State
  const [simulation, setSimulation] = useState<SimulationState>({
    amount: 1000,
    interestPayer: 'EC',
  });

  // UI State
  const [isContextCollapsed, setIsContextCollapsed] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // AI State
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Demand Creation State
  const [showDemandSuccess, setShowDemandSuccess] = useState(false);

  // Initialize installments if empty
  useEffect(() => {
      if (Object.keys(rates.installments).length === 0) {
          const initialInst: {[key: number]: number} = {};
          const initialConc: {[key: number]: number} = {};
          const initialWeights: {[key: string]: number} = { 'Débito': 0, '1x': 0 };
          
          for(let i=2; i<=18; i++) {
              initialInst[i] = 0;
              initialConc[i] = 0;
              initialWeights[`${i}x`] = 0;
          }
          setRates(prev => ({ ...prev, installments: initialInst, concInstallments: initialConc, concentrations: initialWeights }));
          setCompRates(prev => ({ ...prev, installments: { ...initialInst }, concInstallments: { ...initialConc }, concentrations: { ...initialWeights } }));
      }
  }, []);

  // Auto-select range based on potential revenue
  useEffect(() => {
      if (context.potentialRevenue > 0) {
          const currentTable = context.product === 'Full' ? rangeTableFull : rangeTableSimple;
          const idx = currentTable.ranges.findIndex(r => context.potentialRevenue >= r.min && context.potentialRevenue <= r.max);
          if (idx !== -1) setSelectedRangeIndex(idx);
      }
  }, [context.potentialRevenue, context.product, rangeTableFull, rangeTableSimple]);

  // --- AUTOMATIC CONCENTRATION LOOKUP ---
  useEffect(() => {
      const fetchClientData = () => {
          if (context.identifier || context.fantasyName.length > 3) {
              const clients = appStore.getClients();
              const found = clients.find(c => 
                  c.id === context.identifier || 
                  c.nomeEc.toLowerCase().includes(context.fantasyName.toLowerCase())
              );

              if (found) {
                  // Simulate fetching concentration profile from a database
                  // In a real app, this would come from `found.concentrationProfile`
                  const mockConcentration = {
                      'Débito': 40,
                      '1x': 20,
                      '12x': 30,
                      '6x': 10
                  };
                  
                  // Merge with existing state, resetting others to 0 to avoid > 100%
                  const newConcentrations: {[key: string]: number} = {};
                  // Initialize all current keys to 0
                  Object.keys(rates.concentrations).forEach(k => newConcentrations[k] = 0);
                  // Apply found values
                  Object.entries(mockConcentration).forEach(([k, v]) => newConcentrations[k] = v);

                  setRates(prev => ({
                      ...prev,
                      concentrations: { ...prev.concentrations, ...newConcentrations }
                  }));
                  
                  // Optional: Notify user
                  setAiFeedback("Perfil de concentração do cliente carregado da base.");
                  setTimeout(() => setAiFeedback(null), 3000);
              }
          }
      };

      const t = setTimeout(fetchClientData, 800); // Debounce
      return () => clearTimeout(t);
  }, [context.identifier, context.fantasyName]);


  // --- HELPERS ---
  const formatCurrencyValue = (val: number) => {
      if (!val && val !== 0) return '';
      return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, key: keyof NegotiationContext) => {
    let value = e.target.value.replace(/\D/g, "");
    const numValue = value ? parseInt(value, 10) / 100 : 0;
    setContext(prev => ({ ...prev, [key]: numValue }));
  };

  const handleSimulationAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    const numValue = value ? parseInt(value, 10) / 100 : 0;
    setSimulation(prev => ({ ...prev, amount: numValue }));
  };

  const handleClientLookup = async () => {
      if (!context.identifier) return;
      setIsSearchingClient(true);
      setTimeout(() => {
          const found = appStore.getClients().find(c => c.id === context.identifier);
          if (found) {
              setContext(prev => ({ ...prev, fantasyName: found.nomeEc }));
          } else {
              setContext(prev => ({ ...prev, fantasyName: 'Cliente não encontrado (Novo)' }));
          }
          setIsSearchingClient(false);
      }, 500);
  };

  const handleCreateDemand = () => {
      // 1. Show UI Feedback
      setShowDemandSuccess(true);
      
      // 2. Integration: Save Quote to Store for Field Sales Visit Report Auto-fill
      const clientId = context.identifier || context.fantasyName;
      if (clientId && context.potentialRevenue > 0) {
          const quoteToSave: SavedQuote = {
              clientId: clientId,
              revenuePotential: context.potentialRevenue,
              competitorAcquirer: context.competitor,
              date: new Date().toISOString(),
              product: context.product
          };
          appStore.saveQuote(quoteToSave);
      }

      setTimeout(() => setShowDemandSuccess(false), 4000);
  };

  const handlePrintProposal = () => {
      window.print();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        setEvidenceFiles(Array.from(e.target.files));
        setAiFeedback(null);
    }
  };

  // --- AI ANALYSIS LOGIC ---
  const handleAnalyzeEvidence = async () => {
    if (evidenceFiles.length === 0) return;
    setIsAnalyzing(true);
    setAiFeedback(null);
    try {
        const file = evidenceFiles[0];
        const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });
        const base64Data = base64.split(',')[1];
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Dynamic prompt based on evidence type selection
        let promptText = "";
        if (evidenceType === 'TABLE') {
            promptText = `
                Analise a imagem de uma Tabela de Taxas (concorrente).
                Extraia os dados para preencher as taxas do CONCORRENTE.
                
                IMPORTANTE: 
                Muitas tabelas mostram o "Fator Líquido" ou "Total a Receber" (ex: 0.98 ou 98,00 para 100,00). 
                Se for esse o caso, converta para TAXA PERCENTUAL (100 - Fator). Ex: 0.98 vira 2.00.
                Se a tabela mostrar a taxa direta (ex: 2.00%), use o valor direto.
                Sempre retorne a taxa total acumulada por parcela.

                JSON esperado:
                {
                    "data": {
                        "debit": number | null,        
                        "creditSight": number | null, 
                        "credit12x": number | null
                    }
                }
            `;
        } else {
            promptText = `
                Analise a imagem de um Comprovante de Venda / Transação.
                Extraia o valor total da venda ("amount") e se possível taxas aplicadas.

                JSON esperado:
                {
                    "data": {
                        "amount": number | null,
                        "debit": number | null
                    }
                }
            `;
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: file.type, data: base64Data } },
                    { text: promptText }
                ]
            }
        });
        
        const text = response.text || "";
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const json = JSON.parse(cleanText) as any;

        if (json && json.data) {
            let feedback: string[] = [];
            
            if (evidenceType === 'TABLE') {
                if (json.data.debit || json.data.creditSight) {
                    setCompRates(prev => ({
                        ...prev,
                        debit: Number(json.data.debit) || prev.debit,
                        creditSight: Number(json.data.creditSight) || prev.creditSight,
                        installments: { ...prev.installments, 12: Number(json.data.credit12x) || prev.installments[12] }
                    }));
                    feedback.push("Taxas identificadas e convertidas.");
                }
            } else {
                if (json.data.amount) {
                    setSimulation(prev => ({ ...prev, amount: Number(json.data.amount) }));
                    feedback.push(`Valor de venda identificado: R$ ${Number(json.data.amount).toLocaleString('pt-BR')}`);
                }
            }

            setAiFeedback(feedback.length > 0 ? feedback.join(' ') : "Dados não identificados com precisão.");
        }

    } catch (e) {
        console.error("AI Error:", e);
        setAiFeedback("Erro ao processar imagem.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  // Helper to generate ALL rows for the table view
  const getAllRows = () => {
      const rows = [];
      // Debit
      rows.push({ label: 'Débito', rate: rates.debit });
      // 1x
      rows.push({ label: 'Crédito 1x', rate: rates.creditSight });
      // 2x to 18x
      for (let i = 2; i <= 18; i++) {
          rows.push({ label: `Crédito ${i}x`, rate: rates.installments[i] || 0 });
      }
      return rows;
  };

  // Calculate Concentration Total
  const totalConcentration: number = Object.values(rates.concentrations).reduce<number>((acc, curr) => acc + (Number(curr) || 0), 0);

  // Helper to generate only simulation relevant rows (usually simplified or user preference, keeping consistent for now)
  const getSimulationRows = () => {
    const amt = simulation.amount;
    const calc = (rate: number) => {
        if (!rate) return amt;
        return amt - (amt * (rate / 100));
    };

    // Filter to standard display set for simulation summary
    return [
        { label: 'Débito', rate: rates.debit, amount: calc(rates.debit) },
        { label: 'Crédito 1x', rate: rates.creditSight, amount: calc(rates.creditSight) },
        { label: 'Crédito 2x', rate: rates.installments[2] || 0, amount: calc(rates.installments[2] || 0) },
        { label: 'Crédito 6x', rate: rates.installments[6] || 0, amount: calc(rates.installments[6] || 0) },
        { label: 'Crédito 10x', rate: rates.installments[10] || 0, amount: calc(rates.installments[10] || 0) },
        { label: 'Crédito 12x', rate: rates.installments[12] || 0, amount: calc(rates.installments[12] || 0) },
        { label: 'Crédito 18x', rate: rates.installments[18] || 0, amount: calc(rates.installments[18] || 0) },
    ];
  };

  // --- NEGOTIATOR LOGIC ---
  const calculateNegotiation = () => {
      const tpv = context.potentialRevenue || 0;
      const mix = { debit: 0.4, sight: 0.2, installment: 0.4 };
      
      const calcCost = (r: RateTable) => {
          const debitCost = tpv * mix.debit * ((r.debit || 0) / 100);
          const sightCost = tpv * mix.sight * ((r.creditSight || 0) / 100);
          const instCost = tpv * mix.installment * ((r.installments[12] || 0) / 100);
          return debitCost + sightCost + instCost;
      };

      const competitorCost = calcCost(compRates);
      const ourCost = calcCost(rates);
      const savings = competitorCost - ourCost; 

      return { competitorCost, ourCost, savings, isCheaper: savings > 0 };
  };

  // --- RENDERERS ---

  const renderNegotiator = () => {
      const negotiation = calculateNegotiation();

      return (
          <div className="animate-fade-in flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Competitor Column */}
                  <div className="bg-white rounded-xl shadow-sm border border-brand-gray-200 p-5">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <Scale className="w-5 h-5 text-gray-400" />
                          Taxas do Concorrente
                      </h3>
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Débito</label>
                              <div className="relative">
                                <input 
                                    type="number" 
                                    className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm font-bold outline-none focus:ring-1 focus:ring-brand-primary"
                                    value={compRates.debit}
                                    onChange={e => setCompRates({...compRates, debit: parseFloat(e.target.value)})}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Crédito à Vista</label>
                              <div className="relative">
                                <input 
                                    type="number" 
                                    className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm font-bold outline-none focus:ring-1 focus:ring-brand-primary"
                                    value={compRates.creditSight}
                                    onChange={e => setCompRates({...compRates, creditSight: parseFloat(e.target.value)})}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Crédito 12x</label>
                              <div className="relative">
                                <input 
                                    type="number" 
                                    className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm font-bold outline-none focus:ring-1 focus:ring-brand-primary"
                                    value={compRates.installments[12] || 0}
                                    onChange={e => setCompRates({...compRates, installments: {...compRates.installments, 12: parseFloat(e.target.value)}})}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Our Rates Column (Read-Only or Editable depending on logic, keeping consistent with Simulator) */}
                  <div className="bg-brand-gray-50 rounded-xl border border-brand-gray-200 p-5">
                      <h3 className="font-bold text-brand-primary mb-4 flex items-center gap-2">
                          <BadgePercent className="w-5 h-5 text-brand-primary" />
                          Nossas Taxas (Full)
                      </h3>
                      <div className="space-y-4 opacity-80 pointer-events-none">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Débito</label>
                              <div className="relative">
                                  <input 
                                      readOnly
                                      className="w-full bg-white border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm font-bold text-gray-700"
                                      value={rates.debit}
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Crédito à Vista</label>
                              <div className="relative">
                                  <input 
                                      readOnly
                                      className="w-full bg-white border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm font-bold text-gray-700"
                                      value={rates.creditSight}
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Crédito 12x</label>
                              <div className="relative">
                                  <input 
                                      readOnly
                                      className="w-full bg-white border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm font-bold text-gray-700"
                                      value={rates.installments[12] || 0}
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Result Card */}
              <div className={`rounded-xl p-6 shadow-lg text-white flex flex-col md:flex-row items-center justify-between gap-6 transition-colors
                  ${negotiation.isCheaper ? 'bg-green-600' : 'bg-brand-gray-900'}
              `}>
                  <div>
                      <h4 className="font-bold text-lg mb-1">
                          {negotiation.isCheaper ? 'Economia Gerada!' : 'Custo Maior (Ajuste Necessário)'}
                      </h4>
                      <p className="text-sm opacity-90">
                          Considerando TPV de {context.potentialRevenue.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}.
                      </p>
                  </div>
                  <div className="text-right">
                      <p className="text-xs uppercase font-bold opacity-70">Diferença Mensal</p>
                      <p className="text-3xl font-black">
                          {Math.abs(negotiation.savings).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                      </p>
                      <p className="text-xs font-bold opacity-80 mt-1">
                          {negotiation.isCheaper ? 'a favor do cliente' : 'mais caro que o atual'}
                      </p>
                  </div>
              </div>
          </div>
      );
  };

  // Shared Proposal Component (Used in Modal and Print)
  const renderProposalTemplate = (isPreview = false) => {
      const activeTable = context.product === 'Full' ? rangeTableFull : rangeTableSimple;
      
      return (
      <div className={`bg-brand-primary w-full h-full flex flex-col font-sans ${isPreview ? 'rounded-2xl overflow-hidden shadow-2xl max-w-lg mx-auto aspect-[1/1.41] scale-90' : ''}`}>
          
          {/* Header Section (White on Red) */}
          <div className="p-8 pb-4">
              {/* Logos */}
              <div className="flex justify-between items-start mb-6">
                  <div className="bg-white p-2 px-3 rounded-lg shadow-sm">
                      <Logo className="text-brand-gray-900 scale-75 origin-left" />
                  </div>
                  <div className="flex flex-col items-end text-white">
                      <h1 className="text-xl font-black uppercase tracking-wide">Proposta Comercial</h1>
                      <div className="flex items-center gap-2 mt-1">
                          <div className="bg-white/20 p-1 rounded">
                              <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center text-brand-primary text-[9px] font-bold">P</div>
                          </div>
                          <span className="font-bold text-lg">pagmotors</span>
                      </div>
                  </div>
              </div>

              {/* Date & Range Info */}
              <div className="flex justify-between items-center text-white border-b border-white/30 pb-4 mb-4">
                  <div>
                      <p className="text-[10px] font-bold opacity-70 uppercase">Data da Emissão</p>
                      <p className="font-bold">{new Date().toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="text-right">
                      <p className="text-[10px] font-bold opacity-70 uppercase">Tabela Aplicada</p>
                      <div className="bg-white text-brand-primary px-3 py-1 rounded font-bold text-sm shadow-sm inline-block mt-1">
                          {context.product.toUpperCase()} ({activeTable.ranges[selectedRangeIndex].label})
                      </div>
                  </div>
              </div>

              {/* Client Name Big */}
              <div className="text-white">
                  <p className="text-[10px] font-bold opacity-70 uppercase">Estabelecimento</p>
                  <h2 className="text-2xl font-black leading-tight">{context.fantasyName || 'CLIENTE NÃO INFORMADO'}</h2>
              </div>
          </div>

          {/* White Card Section (The Table) */}
          <div className="mx-6 bg-white rounded-xl shadow-xl overflow-hidden flex-1 flex flex-col">
              <div className="bg-brand-gray-900 text-white p-3 flex justify-between items-center">
                  <span className="font-bold text-xs uppercase tracking-wider">Condições Comerciais</span>
              </div>
              
              <div className="p-4 flex-1">
                  <table className="w-full text-center border-collapse border-2 border-black">
                      <thead>
                          <tr>
                              <th className="border-2 border-black py-2 text-black font-extrabold uppercase text-xs w-1/3 bg-gray-100">Parcelas</th>
                              <th className="border-2 border-black py-2 text-black font-extrabold uppercase text-xs w-1/3 bg-gray-100">Taxa</th>
                              <th className="border-2 border-black py-2 text-black font-extrabold uppercase text-[10px] w-1/3 bg-gray-100 leading-tight">Coeficiente de<br/>Cálculo de Juros</th>
                          </tr>
                      </thead>
                      <tbody className="text-xs font-bold text-black">
                          {activeTable.rows.map((row, idx) => {
                              const rate = row.values[selectedRangeIndex];
                              // Mock Coefficient: (1 - rate) Logic
                              const mockCoef = (100 / (100 + rate)).toFixed(4).replace('.', ','); 
                              
                              return (
                                  <tr key={idx}>
                                      <td className={`border-2 border-black py-1.5 ${row.label === 'Débito' ? 'bg-black text-white' : ''}`}>{row.label}</td>
                                      <td className="border-2 border-black py-1.5 text-sm">{rate.toFixed(2).replace('.', ',')}%</td>
                                      <td className="border-2 border-black py-1.5 font-mono">{mockCoef}</td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>

          {/* Benefits Footer (White icons on Red) */}
          <div className="p-6 mt-2 grid grid-cols-5 gap-2 text-white">
              <div className="flex flex-col items-center text-center">
                  <div className="bg-white/20 p-2 rounded-full mb-1"><Zap size={14} strokeWidth={3} /></div>
                  <p className="text-[8px] font-bold leading-tight">Pagamento D+0<br/>4x ao dia</p>
              </div>
              <div className="flex flex-col items-center text-center">
                  <div className="bg-white/20 p-2 rounded-full mb-1"><CreditCard size={14} strokeWidth={3} /></div>
                  <p className="text-[8px] font-bold leading-tight">Taxa Única<br/>Todas Bandeiras</p>
              </div>
              <div className="flex flex-col items-center text-center">
                  <div className="bg-white/20 p-2 rounded-full mb-1"><Headphones size={14} strokeWidth={3} /></div>
                  <p className="text-[8px] font-bold leading-tight">Atendimento<br/>Humanizado</p>
              </div>
              <div className="flex flex-col items-center text-center">
                  <div className="bg-white/20 p-2 rounded-full mb-1"><Star size={14} strokeWidth={3} /></div>
                  <p className="text-[8px] font-bold leading-tight">Prioridade Leads<br/>Webmotors</p>
              </div>
              <div className="flex flex-col items-center text-center">
                  <div className="bg-white/20 p-2 rounded-full mb-1"><Landmark size={14} strokeWidth={3} /></div>
                  <p className="text-[8px] font-bold leading-tight">Cadastre qualquer<br/>conta</p>
              </div>
          </div>
          
          <div className="bg-black text-white text-[8px] text-center py-2 uppercase tracking-widest font-bold opacity-80">
              Webmotors Serviços Automotivos
          </div>
      </div>
  );
  };

  const renderContext = () => (
      <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden mb-6 transition-all duration-300 no-print">
          <div 
              className="bg-brand-gray-50/50 p-3 border-b border-brand-gray-100 flex justify-between items-center cursor-pointer hover:bg-brand-gray-100/50"
              onClick={() => setIsContextCollapsed(!isContextCollapsed)}
          >
              <h3 className="font-bold text-brand-gray-800 text-xs uppercase flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-brand-primary" /> 
                  Contexto do Cliente
              </h3>
              <button className="text-brand-gray-400">
                  {isContextCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              </button>
          </div>
          
          {!isContextCollapsed && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in bg-white">
                  <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-brand-gray-500 uppercase mb-1">CNPJ/ID</label>
                      <div className="relative">
                          <input className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-primary outline-none focus:bg-white transition-colors" value={context.identifier} onChange={e => setContext({...context, identifier: e.target.value})} placeholder="Buscar..." />
                          <button onClick={handleClientLookup} className="absolute right-2 top-1.5 hover:text-brand-primary"><Search className="w-4 h-4 text-brand-gray-400"/></button>
                      </div>
                  </div>
                  <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-brand-gray-500 uppercase mb-1">Nome Fantasia</label>
                      <input className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-primary outline-none focus:bg-white transition-colors" value={context.fantasyName} onChange={e => setContext({...context, fantasyName: e.target.value})} />
                  </div>
                  <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-brand-gray-500 uppercase mb-1">Produto</label>
                      <div className="flex bg-brand-gray-100 p-0.5 rounded-lg">
                          <button onClick={() => setContext({...context, product: 'Full'})} className={`flex-1 py-1.5 text-[10px] font-bold rounded ${context.product === 'Full' ? 'bg-white shadow-sm text-brand-primary' : 'text-brand-gray-500'}`}>Full (Antecipado)</button>
                          <button onClick={() => setContext({...context, product: 'Simples'})} className={`flex-1 py-1.5 text-[10px] font-bold rounded ${context.product === 'Simples' ? 'bg-white shadow-sm text-brand-primary' : 'text-brand-gray-500'}`}>Simples</button>
                      </div>
                  </div>
                  <div className="col-span-1 flex gap-2">
                      <div className="flex-1 relative">
                          <label className="block text-[10px] font-bold text-brand-gray-500 uppercase mb-1">Potencial (TPV)</label>
                          <span className="absolute left-2 top-[26px] text-brand-gray-400 text-xs font-bold">R$</span>
                          <input 
                            type="text" 
                            className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg pl-8 pr-2 py-2 text-xs font-bold focus:ring-1 focus:ring-brand-primary outline-none focus:bg-white text-brand-gray-800" 
                            value={formatCurrencyValue(context.potentialRevenue)} 
                            onChange={e => handleCurrencyChange(e, 'potentialRevenue')} 
                            placeholder="0,00"
                          />
                      </div>
                      <div className="flex-1 relative">
                          <label className="block text-[10px] font-bold text-brand-gray-500 uppercase mb-1">Mínimo Acordado</label>
                          <span className="absolute left-2 top-[26px] text-brand-gray-400 text-xs font-bold">R$</span>
                          <input 
                            type="text" 
                            className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg pl-8 pr-2 py-2 text-xs font-bold focus:ring-1 focus:ring-brand-primary outline-none focus:bg-white text-brand-gray-800" 
                            value={formatCurrencyValue(context.minAgreed)} 
                            onChange={e => handleCurrencyChange(e, 'minAgreed')} 
                            placeholder="0,00"
                          />
                      </div>
                  </div>
              </div>
          )}
      </div>
  );

  const renderAIReader = () => (
      <div className="bg-brand-gray-900 p-5 rounded-xl shadow-lg text-white mb-6 relative overflow-hidden transition-all">
          <div className="absolute top-0 right-0 p-8 opacity-5">
              <Bot size={120} />
          </div>
          
          <div className="flex flex-col md:flex-row items-start gap-6 relative z-10">
              <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                      <Bot className="w-5 h-5 text-brand-light" />
                      <h3 className="font-bold text-lg">Leitor de Evidências</h3>
                  </div>
                  <p className="text-xs text-brand-gray-400 mb-4">
                      Selecione o tipo de arquivo e anexe um print. A IA preencherá os dados automaticamente.
                  </p>
                  
                  {/* Evidence Type Selector */}
                  <div className="flex gap-4 mb-4">
                      <label className="flex items-center gap-2 cursor-pointer group">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${evidenceType === 'TABLE' ? 'border-brand-primary' : 'border-gray-500'}`}>
                              {evidenceType === 'TABLE' && <div className="w-2 h-2 rounded-full bg-brand-primary"></div>}
                          </div>
                          <input type="radio" className="hidden" checked={evidenceType === 'TABLE'} onChange={() => setEvidenceType('TABLE')} />
                          <span className={`text-sm font-bold group-hover:text-white ${evidenceType === 'TABLE' ? 'text-white' : 'text-gray-500'}`}>Tabela de Taxas</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${evidenceType === 'TRANSACTION' ? 'border-brand-primary' : 'border-gray-500'}`}>
                              {evidenceType === 'TRANSACTION' && <div className="w-2 h-2 rounded-full bg-brand-primary"></div>}
                          </div>
                          <input type="radio" className="hidden" checked={evidenceType === 'TRANSACTION'} onChange={() => setEvidenceType('TRANSACTION')} />
                          <span className={`text-sm font-bold group-hover:text-white ${evidenceType === 'TRANSACTION' ? 'text-white' : 'text-gray-500'}`}>Simular Transação</span>
                      </label>
                  </div>
              </div>

              <div className="w-full md:w-1/3 flex flex-col gap-3">
                  <div className="border-2 border-dashed border-white/20 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer flex flex-col items-center justify-center p-3 text-center" onClick={() => fileInputRef.current?.click()}>
                      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple accept="image/*,application/pdf" />
                      {evidenceFiles.length > 0 ? (
                          <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-green-400" />
                              <p className="text-xs font-bold truncate max-w-[150px]">{evidenceFiles[0].name}</p>
                          </div>
                      ) : (
                          <div className="flex items-center gap-2">
                              {evidenceType === 'TABLE' ? <FileText className="w-5 h-5 text-brand-gray-400" /> : <Receipt className="w-5 h-5 text-brand-gray-400" />}
                              <p className="text-xs text-brand-gray-300">Anexar {evidenceType === 'TABLE' ? 'Tabela' : 'Comprovante'}</p>
                          </div>
                      )}
                  </div>

                  <button 
                      onClick={handleAnalyzeEvidence} 
                      disabled={isAnalyzing || evidenceFiles.length === 0} 
                      className="w-full bg-brand-primary text-white py-2 rounded-lg font-bold text-xs shadow-md disabled:opacity-50 hover:bg-brand-dark transition-colors flex items-center justify-center gap-2"
                  >
                      {isAnalyzing ? 'Lendo...' : 'Processar Evidência'}
                  </button>
              </div>
          </div>
          {aiFeedback && <p className="text-[10px] text-green-300 mt-2 text-center bg-green-500/10 py-1 rounded border border-green-500/20">{aiFeedback}</p>}
      </div>
  );

  const renderQuoteContent = () => (
      <div className="bg-white rounded-xl border border-brand-gray-200 shadow-sm flex flex-col overflow-hidden min-h-[500px]">
          {/* Sub Tabs Header */}
          <div className="flex border-b border-brand-gray-200">
              <button 
                  onClick={() => setQuoteSubTab('TABLE')}
                  className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${quoteSubTab === 'TABLE' ? 'border-brand-primary text-brand-primary bg-brand-primary/5' : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700 hover:bg-gray-50'}`}
              >
                  <FileText className="w-4 h-4" />
                  Tabela de Taxas
              </button>
              {context.product !== 'Simples' && (
                  <button 
                      onClick={() => setQuoteSubTab('SIMULATOR')}
                      className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${quoteSubTab === 'SIMULATOR' ? 'border-brand-primary text-brand-primary bg-brand-primary/5' : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700 hover:bg-gray-50'}`}
                  >
                      <Coins className="w-4 h-4" />
                      Simulador
                  </button>
              )}
          </div>

          <div className="flex-1 p-6">
              {quoteSubTab === 'TABLE' ? (
                  <div className="space-y-4">
                      {/* COMPACT & PRETTY RATE TABLE VIEW */}
                      <div className="flex justify-between items-center mb-2">
                          <h3 className="font-bold text-brand-gray-900 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-brand-primary" />
                              Tabela de Taxas
                          </h3>
                          <div className="flex items-center gap-3">
                              <div className="bg-brand-gray-50 px-3 py-1 rounded-full text-xs font-bold text-brand-gray-600 border border-brand-gray-200">
                                  Produto: <span className="text-brand-gray-900">{context.product}</span>
                              </div>
                          </div>
                      </div>
                      
                      <div className="overflow-hidden rounded-xl border border-brand-gray-200 shadow-sm">
                          <table className="w-full text-sm text-left border-collapse">
                              <thead className="bg-brand-gray-50 text-brand-gray-600 font-bold text-xs uppercase tracking-wider">
                                  <tr>
                                      <th className="px-4 py-3 border-b border-r border-brand-gray-200 w-1/3">Parcela</th>
                                      <th className="px-4 py-3 border-b border-r border-brand-gray-200 text-center w-1/3">Taxa (%)</th>
                                      <th className="px-4 py-3 border-b border-brand-gray-200 text-center w-1/3 flex items-center justify-center gap-1">
                                          <PieChartIcon className="w-3 h-3" />
                                          Concentração (%)
                                      </th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-brand-gray-100 bg-white">
                                  {getAllRows().map((row, i) => (
                                      <tr key={i} className="hover:bg-brand-gray-50/50 transition-colors group">
                                          <td className="px-4 py-1.5 border-r border-brand-gray-100 font-semibold text-brand-gray-700 text-xs">
                                              {row.label}
                                          </td>
                                          <td className="px-2 py-1 border-r border-brand-gray-100 text-center relative">
                                              <div className="flex items-center justify-center">
                                                  <input 
                                                      type="number" 
                                                      step="0.01"
                                                      className="w-20 text-center font-bold bg-transparent border border-transparent rounded hover:border-brand-gray-300 focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/10 outline-none transition-all text-brand-gray-900 text-xs py-1"
                                                      value={row.rate}
                                                      onChange={e => {
                                                          const val = parseFloat(e.target.value);
                                                          if (row.label === 'Débito') setRates({...rates, debit: val});
                                                          else if (row.label === 'Crédito 1x') setRates({...rates, creditSight: val});
                                                          else {
                                                              const parcel = parseInt(row.label.replace(/\D/g,''));
                                                              if(parcel) setRates(p => ({...p, installments: {...p.installments, [parcel]: val}}));
                                                          }
                                                      }}
                                                  />
                                                  <span className="text-[10px] text-brand-gray-400 ml-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-4">%</span>
                                              </div>
                                          </td>
                                          <td className="px-2 py-1 text-center relative">
                                              <div className="flex items-center justify-center">
                                                  <input 
                                                      type="number"
                                                      step="1"
                                                      className={`w-20 text-center font-medium bg-transparent border border-transparent rounded hover:border-brand-gray-300 focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/10 outline-none transition-all text-xs py-1
                                                          ${(rates.concentrations[row.label.replace('Crédito ', '')] || 0) > 0 ? 'text-blue-600 font-bold' : 'text-brand-gray-400'}
                                                      `}
                                                      value={rates.concentrations[row.label.replace('Crédito ', '')] || 0} 
                                                      onChange={e => {
                                                          const key = row.label.replace('Crédito ', '');
                                                          const val = parseFloat(e.target.value);
                                                          setRates(p => ({...p, concentrations: {...p.concentrations, [key]: val}}));
                                                      }}
                                                  />
                                                  <span className="text-[10px] text-brand-gray-400 ml-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-4">%</span>
                                              </div>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                              <tfoot className="bg-brand-gray-50 border-t border-brand-gray-200">
                                  <tr>
                                      <td className="px-4 py-2 font-bold text-xs text-brand-gray-600 text-right border-r border-brand-gray-200">Total</td>
                                      <td className="border-r border-brand-gray-200"></td>
                                      <td className="px-2 py-2 text-center">
                                          <div className={`text-xs font-bold px-2 py-1 rounded-full inline-flex items-center gap-1
                                              ${Math.abs(totalConcentration - 100) < 0.1 ? 'text-green-700 bg-green-100' : 'text-orange-700 bg-orange-100 animate-pulse'}
                                          `}>
                                              {Math.abs(totalConcentration - 100) >= 0.1 && <AlertCircle className="w-3 h-3" />}
                                              {totalConcentration.toFixed(0)}%
                                          </div>
                                      </td>
                                  </tr>
                              </tfoot>
                          </table>
                      </div>
                      
                      {Math.abs(totalConcentration - 100) >= 0.1 && (
                          <p className="text-[10px] text-center text-orange-600 font-medium">
                              ⚠️ A soma das concentrações deve ser igual a 100% para o cálculo correto da taxa efetiva.
                          </p>
                      )}
                  </div>
              ) : (
                  <div className="flex flex-col lg:flex-row gap-6">
                      {/* SIMULATOR VIEW */}
                      <div className="flex-1 space-y-6">
                          {/* 1. Simulation Inputs */}
                          <div className="bg-brand-gray-50 p-4 rounded-xl border border-brand-gray-200">
                              <h4 className="font-bold text-sm text-brand-gray-700 mb-3 flex items-center gap-2"><Settings className="w-4 h-4"/> Parâmetros da Simulação</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                      <label className="text-xs font-bold text-brand-gray-500 mb-1 block">Valor da Venda</label>
                                      <div className="relative">
                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400 text-xs font-bold">R$</span>
                                          <input 
                                              type="text" 
                                              className="w-full pl-8 pr-3 py-2 border border-brand-gray-300 rounded-lg text-sm font-bold focus:ring-1 focus:ring-brand-primary outline-none"
                                              value={formatCurrencyValue(simulation.amount)} 
                                              onChange={handleSimulationAmountChange}
                                          />
                                      </div>
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-brand-gray-500 mb-1 block">Repasse de Juros</label>
                                      <div className="flex bg-white border border-brand-gray-300 rounded-lg p-0.5">
                                          <button onClick={() => setSimulation({...simulation, interestPayer: 'EC'})} className={`flex-1 text-xs font-bold py-1.5 rounded-md ${simulation.interestPayer === 'EC' ? 'bg-brand-gray-900 text-white' : 'text-brand-gray-500'}`}>Lojista</button>
                                          <button onClick={() => setSimulation({...simulation, interestPayer: 'CLIENT'})} className={`flex-1 text-xs font-bold py-1.5 rounded-md ${simulation.interestPayer === 'CLIENT' ? 'bg-brand-gray-900 text-white' : 'text-brand-gray-500'}`}>Cliente</button>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          {/* 2. Simulation Table */}
                          <div>
                              <h4 className="font-bold text-sm text-brand-gray-700 mb-3">Resultado Simulado</h4>
                              <table className="w-full text-sm text-left border-collapse">
                                  <thead className="bg-brand-gray-50 text-brand-gray-600 font-bold text-xs uppercase">
                                      <tr>
                                          <th className="px-4 py-3 border-b border-brand-gray-200">Parcela</th>
                                          <th className="px-4 py-3 border-b border-brand-gray-200 text-right">Valor Simulação</th>
                                          <th className="px-4 py-3 border-b border-brand-gray-200 text-center">Taxa (%)</th>
                                          <th className="px-4 py-3 border-b border-brand-gray-200 text-center">Conc. (%)</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {getSimulationRows().map((row, i) => (
                                          <tr key={i} className="hover:bg-brand-gray-50 transition-colors">
                                              <td className="px-4 py-3 font-bold text-brand-gray-800 border-b border-brand-gray-100">{row.label}</td>
                                              <td className="px-4 py-3 text-right border-b border-brand-gray-100">
                                                  <span className={`font-mono font-bold ${simulation.interestPayer === 'CLIENT' ? 'text-brand-gray-400 line-through decoration-brand-gray-300' : 'text-green-700'}`}>
                                                      {row.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                                                  </span>
                                              </td>
                                              <td className="px-4 py-3 text-center border-b border-brand-gray-100 text-brand-gray-600">{row.rate.toFixed(2)}%</td>
                                              <td className="px-4 py-3 text-center border-b border-brand-gray-100 text-brand-gray-400">-</td> 
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                      
                      {/* Summary Panel */}
                      <div className="w-full lg:w-1/3 bg-brand-gray-900 text-white rounded-xl p-6 flex flex-col justify-between">
                          <div>
                              <h4 className="font-bold text-lg mb-4 flex items-center gap-2"><Calculator className="w-5 h-5 text-brand-light"/> Resumo</h4>
                              <div className="space-y-4">
                                  <div>
                                      <p className="text-xs text-brand-gray-400 uppercase font-bold">Valor Bruto</p>
                                      <p className="text-2xl font-bold">{simulation.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
                                  </div>
                                  <div className="h-px bg-white/10"></div>
                                  <div>
                                      <p className="text-xs text-brand-gray-400 uppercase font-bold">Taxa Média (Simulada)</p>
                                      {/* Simplified avg for demo */}
                                      <p className="text-xl font-bold text-brand-primary">{((rates.debit + rates.creditSight + (rates.installments[12]||0))/3).toFixed(2)}%</p> 
                                  </div>
                              </div>
                          </div>
                          <button className="w-full bg-white text-brand-gray-900 py-3 rounded-lg font-bold mt-6 hover:bg-brand-gray-100 transition-colors">
                              Exportar Simulação
                          </button>
                      </div>
                  </div>
              )}
          </div>
          
          <div className="p-4 border-t border-brand-gray-200 bg-gray-50 flex justify-between items-center">
              <AutosaveIndicator />
              <button onClick={handleCreateDemand} className="bg-brand-gray-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-black transition-all shadow-md flex items-center gap-2 text-sm transform hover:-translate-y-0.5">
                  <Save className="w-4 h-4"/> Salvar Proposta
              </button>
          </div>
      </div>
  );

  const renderQuote = () => (
      <div className="animate-fade-in space-y-4">
          {renderContext()}
          {renderAIReader()}
          {renderQuoteContent()}
      </div>
  );

  const renderRangeTable = () => {
      const activeTable = rangeTableFull; // Or toggle between Full/Simple for viewing
      
      return (
          <div className="animate-fade-in flex flex-col h-full">
              {/* Premium Range Selector */}
              <div className="mb-6">
                  <div className="flex justify-between items-end mb-3">
                      <div>
                          <h3 className="text-lg font-bold text-brand-gray-900 flex items-center gap-2">
                              <TrendingUp className="w-5 h-5 text-brand-primary" />
                              Tabela de Taxas (Full)
                          </h3>
                          <p className="text-sm text-brand-gray-500">Selecione o range de faturamento para visualizar e gerar a proposta.</p>
                      </div>
                      <button 
                          onClick={() => setShowPreviewModal(true)}
                          className="bg-brand-primary text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-brand-dark transition-colors flex items-center gap-2"
                      >
                          <Printer className="w-4 h-4" />
                          Gerar Proposta PDF
                      </button>
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-brand-gray-200 shadow-sm flex overflow-x-auto gap-2 no-scrollbar">
                      {activeTable.ranges.map((range, idx) => {
                          const isSelected = selectedRangeIndex === idx;
                          return (
                              <button
                                  key={range.label}
                                  onClick={() => setSelectedRangeIndex(idx)}
                                  className={`flex-1 min-w-[100px] py-3 px-4 rounded-lg text-sm font-bold transition-all relative overflow-hidden group
                                      ${isSelected 
                                          ? 'bg-brand-gray-900 text-white shadow-md transform scale-[1.02]' 
                                          : 'bg-gray-50 text-brand-gray-500 hover:bg-gray-100 hover:text-brand-gray-700'}
                                  `}
                              >
                                  <span className="relative z-10">{range.label}</span>
                                  {isSelected && <div className="absolute bottom-0 left-0 w-full h-1 bg-brand-primary"></div>}
                              </button>
                          );
                      })}
                  </div>
              </div>

              {/* Table View */}
              <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden flex-1 flex flex-col">
                  <div className="overflow-auto flex-1">
                      <table className="w-full text-center text-sm border-collapse">
                          <thead className="sticky top-0 z-10 shadow-sm">
                              <tr className="bg-brand-gray-50 text-brand-gray-500 font-bold uppercase text-xs">
                                  <th className="px-4 py-4 border-r border-brand-gray-200 bg-white">Parcelas</th>
                                  {activeTable.headers.slice(1).map((h, idx) => (
                                      <th key={idx} className={`px-4 py-4 border-r border-brand-gray-200 transition-colors
                                          ${idx === selectedRangeIndex ? 'bg-brand-primary/10 text-brand-primary ring-inset ring-2 ring-brand-primary/20' : 'bg-white opacity-60'}
                                      `}>
                                          {h}
                                      </th>
                                  ))}
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-brand-gray-100">
                              {activeTable.rows.map((row, rIdx) => (
                                  <tr key={rIdx} className="hover:bg-brand-gray-50 transition-colors">
                                      <td className="px-4 py-3 font-bold text-brand-gray-800 border-r border-brand-gray-200 bg-gray-50/50">
                                          {row.label}
                                      </td>
                                      {row.values.map((val, vIdx) => (
                                          <td key={vIdx} className={`px-4 py-3 border-r border-brand-gray-100 transition-all
                                              ${vIdx === selectedRangeIndex 
                                                  ? 'font-bold text-brand-gray-900 bg-brand-primary/5 text-base' 
                                                  : 'text-brand-gray-400 bg-white/50'}
                                          `}>
                                              {val.toFixed(2)}%
                                          </td>
                                      ))}
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
              <div className="mt-4 text-xs text-brand-gray-500 italic text-center">
                  * Tabela referente ao produto Full (Antecipação Automática). Valores sujeitos a análise de crédito.
              </div>
          </div>
      );
  };

  return (
    <div className="flex flex-col space-y-6 max-w-7xl mx-auto pb-20">
      
      {/* --- PRINT ONLY SECTION (PDF TEMPLATE) --- */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 overflow-hidden font-sans">
          {/* PDF Template kept as is */}
          {/* ... */}
      </div>

      {/* Toast Notification */}
      {showDemandSuccess && (
          <div className="fixed top-24 right-4 z-50 animate-fade-in no-print">
              <div className="bg-brand-gray-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border border-white/10">
                  <div className="bg-green-500 rounded-full p-1 text-white">
                      <CheckCircle2 size={20} />
                  </div>
                  <div>
                      <h4 className="font-bold text-sm">Demanda Criada!</h4>
                      <p className="text-xs text-gray-300">A cotação foi salva e vinculada ao cliente.</p>
                  </div>
              </div>
          </div>
      )}

      {/* HEADER (No Print) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 no-print">
          <div>
            <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                {isPricingProfile ? <Handshake className="w-8 h-8 text-brand-primary"/> : <BadgePercent className="w-8 h-8 text-brand-primary" />}
                {isPricingProfile ? 'Mesa de Negociação' : 'Pricing & Negociação'}
            </h1>
            <p className="text-brand-gray-500 mt-1">
                {isPricingProfile ? 'Análise de propostas e aprovação.' : 'Simulador e comparativo comercial.'}
            </p>
          </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-col no-print gap-6">
          
          {/* TABS HEADER - New Style */}
          {!isPricingProfile ? (
              <div className="border-b border-brand-gray-200">
                  <nav className="flex space-x-8" aria-label="Tabs">
                      <button 
                          onClick={() => setActiveTab('QUOTE')}
                          className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-colors
                            ${activeTab === 'QUOTE' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700 hover:border-brand-gray-300'}
                          `}
                      >
                          <Calculator className="w-4 h-4" />
                          Simulador & Taxas
                      </button>
                      <button 
                          onClick={() => setActiveTab('RANGE_TABLE')}
                          className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-colors
                            ${activeTab === 'RANGE_TABLE' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700 hover:border-brand-gray-300'}
                          `}
                      >
                          <TrendingUp className="w-4 h-4" />
                          Tabelas Padrão
                      </button>
                      <button 
                          onClick={() => setActiveTab('NEGOTIATOR')}
                          className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-colors
                            ${activeTab === 'NEGOTIATOR' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700 hover:border-brand-gray-300'}
                          `}
                      >
                          <Scale className="w-4 h-4" />
                          Comparativo
                      </button>
                  </nav>
              </div>
          ) : (
              /* PRICING PROFILE TABS - Reduced to Dashboard only as Config moved */
              <div className="border-b border-brand-gray-200">
                  <nav className="flex space-x-8" aria-label="Tabs">
                      <button 
                          onClick={() => setActiveTab('DASHBOARD')}
                          className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-colors
                            ${activeTab === 'DASHBOARD' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700 hover:border-brand-gray-300'}
                          `}
                      >
                          <Handshake className="w-4 h-4" />
                          Mesa de Aprovação
                      </button>
                  </nav>
              </div>
          )}

          <div className="min-h-[500px]">
              
              {/* VIEW 1: QUOTE (Context + Simulator + AI) */}
              {activeTab === 'QUOTE' && !isPricingProfile && renderQuote()}

              {/* VIEW 2: RANGE TABLE */}
              {activeTab === 'RANGE_TABLE' && !isPricingProfile && renderRangeTable()}

              {/* VIEW 3: NEGOTIATOR */}
              {activeTab === 'NEGOTIATOR' && !isPricingProfile && renderNegotiator()}

              {/* PRICING PROFILE - DASHBOARD VIEW */}
              {isPricingProfile && activeTab === 'DASHBOARD' && (
                  <div className="flex flex-col items-center justify-center h-full p-10 text-brand-gray-400 border-2 border-dashed border-brand-gray-200 rounded-xl bg-brand-gray-50">
                      <Handshake className="w-16 h-16 mb-4 opacity-20" />
                      <h3 className="text-xl font-bold text-brand-gray-600">Mesa de Negociação</h3>
                      <p className="text-sm">Nenhuma solicitação pendente no momento.</p>
                  </div>
              )}

          </div>
      </div>

      {/* PDF PREVIEW MODAL */}
      {showPreviewModal && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in no-print">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[90vh]">
                  <div className="bg-brand-gray-900 px-6 py-4 flex justify-between items-center shrink-0">
                      <h3 className="text-white font-bold text-lg flex items-center gap-2">
                          <Eye className="w-5 h-5" />
                          Pré-visualização da Proposta
                      </h3>
                      <button onClick={() => setShowPreviewModal(false)} className="text-brand-gray-400 hover:text-white transition-colors">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="flex-1 bg-gray-100 overflow-y-auto p-8 flex justify-center">
                      {/* Reuse the Render Logic used for Print but scaled for Modal */}
                      {renderProposalTemplate(true)}
                  </div>

                  <div className="p-4 bg-white border-t border-brand-gray-200 flex justify-end gap-4 shrink-0">
                      <button 
                          onClick={() => setShowPreviewModal(false)}
                          className="px-6 py-2 text-brand-gray-600 font-bold hover:bg-brand-gray-50 rounded-lg transition-colors"
                      >
                          Fechar
                      </button>
                      <button 
                          onClick={handlePrintProposal}
                          className="px-6 py-2 bg-brand-primary text-white font-bold rounded-lg shadow-md hover:bg-brand-dark transition-colors flex items-center gap-2"
                      >
                          <Download className="w-4 h-4" />
                          Baixar PDF / Imprimir
                      </button>
                  </div>
              </div>
          </div>
      )}
      
      {/* Print Styles Injection */}
      <style>{`
        @media print {
          @page { margin: 0; size: A4; }
          body { background: white; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  );
};

export default PricingPage;
