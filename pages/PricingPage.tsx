
import React, { useState, useEffect, useRef } from 'react';
import { 
  BadgePercent, Calculator,  
  Bot, RefreshCw,  Wallet, Upload, X, Save, CheckCircle2,
  TrendingUp, Handshake, Search, Store, 
  Target, ChevronDown, ChevronUp,
  Scale, ArrowDownRight, ArrowUpRight, Printer, Coins, CreditCard,
  Zap, Headphones, Star, Landmark, Download, Eye, FileText, Receipt,
  Settings, AlertCircle, PieChart as PieChartIcon, Send, FileCheck, Sparkles
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

// Initial State for Simple
const INITIAL_RANGE_TABLE_SIMPLE: RangeTableData = {
    headers: ['Parcelas', 'Até 10k', '10-30k', '>30k'],
    ranges: [
        { min: 0, max: 10000, label: 'Até 10k' },
        { min: 10001, max: 30000, label: '10-30k' },
        { min: 30001, max: 999999999, label: '>30k' },
    ],
    rows: [
        { label: 'Débito', values: [2.00, 1.81, 1.61, 1.26, 1.16, 1.06] },
        { label: '1x', values: [2.85, 2.65, 2.45, 2.15, 2.05, 1.95] },
        { label: '2 e 6x', values: [3.55, 3.35, 3.15, 2.85, 2.75, 2.65] },
        { label: '7 a 12x', values: [3.55, 3.35, 3.15, 2.85, 2.75, 2.65] },
        { label: '13x a 18x', values: [4.00, 3.80, 3.60, 3.30, 3.20, 3.10] },
    ]
};

const AutosaveIndicator = () => (
    <span className="text-[10px] text-brand-gray-400 flex items-center gap-1 bg-white/50 px-2 py-1 rounded-full border border-brand-gray-100 animate-fade-in">
        <Save className="w-3 h-3" /> Salvo auto.
    </span>
);

const PricingPage: React.FC<PricingPageProps> = ({ role }) => {
  const isPricingProfile = role === UserRole.PRICING;

  // Tabs
  const [activeTab, setActiveTab] = useState<'QUOTE' | 'RANGE_TABLE' | 'NEGOTIATOR' | 'DASHBOARD'>('QUOTE');
  const [evidenceType, setEvidenceType] = useState<'TABLE' | 'TRANSACTION'>('TABLE');

  // Data
  const [rangeTableFull, setRangeTableFull] = useState<RangeTableData>(INITIAL_RANGE_TABLE_FULL);
  const [rangeTableSimple, setRangeTableSimple] = useState<RangeTableData>(INITIAL_RANGE_TABLE_SIMPLE);
  const [rangeViewProduct, setRangeViewProduct] = useState<'Full' | 'Simples'>('Full');

  // Context & State
  const [context, setContext] = useState<NegotiationContext>({
    identifier: '', fantasyName: '', competitor: '', potentialRevenue: 0, minAgreed: 0, product: 'Full'
  });
  const [selectedRangeIndex, setSelectedRangeIndex] = useState<number>(2); 
  const [rates, setRates] = useState<RateTable>({
    debit: 0, creditSight: 0, credit2to6: 0, credit7to12: 0, credit13to18: 0, anticipation: 0,
    concDebit: 0, concSight: 0, conc2to6: 0, conc7to12: 0, conc13to18: 0,
    installments: {}, concInstallments: {}, concentrations: {}
  });
  const [compRates, setCompRates] = useState<RateTable>({
    debit: 0, creditSight: 0, credit2to6: 0, credit7to12: 0, credit13to18: 0, anticipation: 0,
    concDebit: 0, concSight: 0, conc2to6: 0, conc7to12: 0, conc13to18: 0,
    installments: {}, concInstallments: {}, concentrations: {}
  });
  const [simulation, setSimulation] = useState<SimulationState>({ amount: 1000, interestPayer: 'EC' });

  // UI
  const [isContextCollapsed, setIsContextCollapsed] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [showDemandSuccess, setShowDemandSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initializers & Effects
  useEffect(() => {
      if (isPricingProfile && activeTab === 'QUOTE') setActiveTab('DASHBOARD');
  }, [isPricingProfile]);

  useEffect(() => {
      if (Object.keys(rates.installments).length === 0) {
          const initialInst: {[key: number]: number} = {};
          const initialConc: {[key: number]: number} = {};
          const initialWeights: {[key: string]: number} = { 'Débito': 0, '1x': 0 };
          for(let i=2; i<=18; i++) {
              initialInst[i] = 0; initialConc[i] = 0; initialWeights[`${i}x`] = 0;
          }
          setRates(prev => ({ ...prev, installments: initialInst, concInstallments: initialConc, concentrations: initialWeights }));
          setCompRates(prev => ({ ...prev, installments: { ...initialInst }, concInstallments: { ...initialConc }, concentrations: { ...initialWeights } }));
      }
  }, []);

  useEffect(() => {
      if (context.potentialRevenue > 0) {
          const currentTable = context.product === 'Full' ? rangeTableFull : rangeTableSimple;
          const idx = currentTable.ranges.findIndex(r => context.potentialRevenue >= r.min && context.potentialRevenue <= r.max);
          if (idx !== -1) setSelectedRangeIndex(idx);
      }
  }, [context.potentialRevenue, context.product, rangeTableFull, rangeTableSimple]);

  // --- HELPERS & HANDLERS ---
  const formatCurrencyValue = (val: number) => val ? val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
  
  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, key: keyof NegotiationContext) => {
    let value = e.target.value.replace(/\D/g, "");
    setContext(prev => ({ ...prev, [key]: value ? parseInt(value, 10) / 100 : 0 }));
  };

  const handleSimulationAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    const numValue = value ? parseInt(value, 10) / 100 : 0;
    setSimulation(prev => ({ ...prev, amount: numValue }));
  };

  const handlePrintProposal = () => {
      window.print();
  };

  const handleClientLookup = async () => {
      if (!context.identifier) return;
      setIsSearchingClient(true);
      setTimeout(() => {
          const found = appStore.getClients().find(c => c.id === context.identifier);
          setContext(prev => ({ ...prev, fantasyName: found ? found.nomeEc : 'Cliente não encontrado (Novo)' }));
          setIsSearchingClient(false);
      }, 500);
  };

  const handleCreateDemand = () => {
      setShowDemandSuccess(true);
      if (context.identifier || context.fantasyName) {
          appStore.saveQuote({
              clientId: context.identifier || context.fantasyName,
              revenuePotential: context.potentialRevenue,
              competitorAcquirer: context.competitor,
              date: new Date().toISOString(),
              product: context.product
          });
      }
      setTimeout(() => setShowDemandSuccess(false), 4000);
  };

  const handleSendToPricing = () => {
      if (!context.fantasyName || !context.potentialRevenue) return alert("Preencha Nome e TPV.");
      alert(`✅ Enviado para Mesa!\n\nCliente: ${context.fantasyName}\nStatus: Em Análise`);
  };

  const handleAnalyzeEvidence = async () => {
    if (evidenceFiles.length === 0) return;
    setIsAnalyzing(true); setAiFeedback(null);
    try {
        const file = evidenceFiles[0];
        const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const promptText = evidenceType === 'TABLE' 
            ? `Analise esta Tabela de Taxas do concorrente ${context.competitor}. Extraia taxas para: debit, creditSight, credit12x. Retorne JSON: { "data": { "debit": number, "creditSight": number, "credit12x": number } }`
            : `Analise este comprovante. Extraia valor total ("amount"). Retorne JSON: { "data": { "amount": number } }`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ inlineData: { mimeType: file.type, data: base64.split(',')[1] } }, { text: promptText }] }
        });
        
        const json = JSON.parse(response.text.replace(/```json|```/g, '').trim());
        if (json?.data) {
            if (evidenceType === 'TABLE') {
                setRates(prev => ({
                    ...prev,
                    debit: Number(json.data.debit) || prev.debit,
                    creditSight: Number(json.data.creditSight) || prev.creditSight,
                    installments: { ...prev.installments, 12: Number(json.data.credit12x) || prev.installments[12] }
                }));
                setAiFeedback("Taxas extraídas e aplicadas.");
            } else {
                setSimulation(prev => ({ ...prev, amount: Number(json.data.amount) }));
                setAiFeedback(`Valor identificado: R$ ${Number(json.data.amount).toLocaleString('pt-BR')}`);
            }
        }
    } catch (e) { setAiFeedback("Erro ao processar."); } 
    finally { setIsAnalyzing(false); }
  };

  const getAllRows = () => {
      const rows = [
          { label: 'Débito', rate: rates.debit },
          { label: 'Crédito 1x', rate: rates.creditSight }
      ];
      for (let i = 2; i <= 18; i++) rows.push({ label: `Crédito ${i}x`, rate: rates.installments[i] || 0 });
      return rows;
  };

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

  // --- RENDERERS ---

  const renderContext = () => (
      <div className={`bg-white rounded-2xl shadow-sm border border-brand-gray-200 overflow-hidden transition-all duration-300 no-print ${isContextCollapsed ? 'h-16' : ''}`}>
          <div 
              className="bg-gradient-to-r from-brand-gray-50 to-white p-4 border-b border-brand-gray-100 flex justify-between items-center cursor-pointer hover:bg-brand-gray-50"
              onClick={() => setIsContextCollapsed(!isContextCollapsed)}
          >
              <div className="flex items-center gap-3">
                  <div className="bg-brand-primary/10 p-2 rounded-lg text-brand-primary">
                      <Wallet size={18} />
                  </div>
                  <div>
                      <h3 className="font-bold text-brand-gray-900 text-sm">Contexto da Negociação</h3>
                      {!isContextCollapsed && <p className="text-xs text-brand-gray-500">Dados fundamentais para a precificação</p>}
                  </div>
              </div>
              <button className="text-brand-gray-400 hover:text-brand-primary transition-colors">
                  {isContextCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
              </button>
          </div>
          
          <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 animate-fade-in">
              <div className="col-span-1">
                  <label className="text-xs font-bold text-brand-gray-500 uppercase tracking-wide mb-1.5 block">Cliente (CNPJ/ID)</label>
                  <div className="relative group">
                      <input 
                          className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all" 
                          value={context.identifier} 
                          onChange={e => setContext({...context, identifier: e.target.value})} 
                          placeholder="Buscar ID..." 
                      />
                      <button onClick={handleClientLookup} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray-400 group-hover:text-brand-primary transition-colors">
                          <Search size={16} />
                      </button>
                  </div>
              </div>
              
              <div className="col-span-1">
                  <label className="text-xs font-bold text-brand-gray-500 uppercase tracking-wide mb-1.5 block">Nome Fantasia</label>
                  <input className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all" value={context.fantasyName} onChange={e => setContext({...context, fantasyName: e.target.value})} />
              </div>

              <div className="col-span-1">
                  <label className="text-xs font-bold text-brand-gray-500 uppercase tracking-wide mb-1.5 block">Adquirente Atual</label>
                  <div className="relative">
                      <select 
                          className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none appearance-none cursor-pointer"
                          value={context.competitor}
                          onChange={e => setContext({...context, competitor: e.target.value})}
                      >
                          <option value="">Selecione...</option>
                          {['Stone', 'Cielo', 'Rede', 'PagSeguro', 'Getnet', 'SafraPay', 'Outros'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray-400 pointer-events-none" size={16} />
                  </div>
              </div>

              <div className="col-span-1 grid grid-cols-2 gap-3">
                  <div>
                      <label className="text-xs font-bold text-brand-gray-500 uppercase tracking-wide mb-1.5 block">TPV (R$)</label>
                      <input 
                        type="text" 
                        className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-brand-gray-800 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none" 
                        value={formatCurrencyValue(context.potentialRevenue)} 
                        onChange={e => handleCurrencyChange(e, 'potentialRevenue')} 
                        placeholder="0,00"
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-brand-gray-500 uppercase tracking-wide mb-1.5 block">Produto</label>
                      <select 
                          className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-xl px-2 py-2.5 text-sm font-bold focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none"
                          value={context.product}
                          onChange={e => setContext({...context, product: e.target.value as any})}
                      >
                          <option value="Full">Full</option>
                          <option value="Simples">Simples</option>
                      </select>
                  </div>
              </div>
          </div>
      </div>
  );

  const renderAIReader = () => (
      <div className="relative overflow-hidden rounded-2xl bg-brand-gray-900 shadow-xl border border-white/10 text-white p-6 mb-6 group">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-1/3 -translate-y-1/3 group-hover:scale-110 transition-transform duration-700">
              <Bot size={200} />
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-brand-primary via-purple-500 to-blue-500"></div>

          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 relative z-10">
              <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                      <div className="bg-white/10 p-2 rounded-lg backdrop-blur-md border border-white/10">
                          <Sparkles className="w-5 h-5 text-brand-light animate-pulse" />
                      </div>
                      <h3 className="font-bold text-xl tracking-tight">Leitura Inteligente</h3>
                  </div>
                  <p className="text-sm text-brand-gray-300 leading-relaxed max-w-lg">
                      Otimize seu tempo. Carregue uma foto da tabela ou comprovante do concorrente e nossa IA preencherá os dados automaticamente.
                  </p>
                  
                  <div className="flex gap-4 mt-6">
                      <label className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${evidenceType === 'TABLE' ? 'border-brand-primary' : 'border-gray-500'}`}>
                              {evidenceType === 'TABLE' && <div className="w-2 h-2 rounded-full bg-brand-primary"></div>}
                          </div>
                          <input type="radio" className="hidden" checked={evidenceType === 'TABLE'} onChange={() => setEvidenceType('TABLE')} />
                          <span className={`text-sm font-medium ${evidenceType === 'TABLE' ? 'text-white' : 'text-gray-400'}`}>Tabela de Taxas</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${evidenceType === 'TRANSACTION' ? 'border-brand-primary' : 'border-gray-500'}`}>
                              {evidenceType === 'TRANSACTION' && <div className="w-2 h-2 rounded-full bg-brand-primary"></div>}
                          </div>
                          <input type="radio" className="hidden" checked={evidenceType === 'TRANSACTION'} onChange={() => setEvidenceType('TRANSACTION')} />
                          <span className={`text-sm font-medium ${evidenceType === 'TRANSACTION' ? 'text-white' : 'text-gray-400'}`}>Simular Venda</span>
                      </label>
                  </div>
              </div>

              <div className="w-full md:w-auto flex flex-col gap-3 min-w-[280px]">
                  <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-white/20 rounded-xl bg-white/5 hover:bg-white/10 hover:border-brand-primary/50 transition-all cursor-pointer flex flex-col items-center justify-center py-6 px-4 text-center group/upload"
                  >
                      <input type="file" ref={fileInputRef} onChange={(e) => { if(e.target.files?.length) { setEvidenceFiles(Array.from(e.target.files)); setAiFeedback(null); } }} className="hidden" accept="image/*,application/pdf" />
                      {evidenceFiles.length > 0 ? (
                          <div className="flex items-center gap-2 text-green-400">
                              <CheckCircle2 className="w-6 h-6" />
                              <p className="text-sm font-bold truncate max-w-[180px]">{evidenceFiles[0].name}</p>
                          </div>
                      ) : (
                          <>
                              <Upload className="w-8 h-8 text-brand-gray-400 mb-2 group-hover/upload:text-white transition-colors" />
                              <p className="text-sm font-bold text-white">Clique para carregar</p>
                              <p className="text-xs text-brand-gray-400">JPG, PNG ou PDF</p>
                          </>
                      )}
                  </div>

                  <button 
                      onClick={handleAnalyzeEvidence} 
                      disabled={isAnalyzing || evidenceFiles.length === 0} 
                      className="w-full bg-brand-primary hover:bg-brand-dark text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                      {isAnalyzing ? <RefreshCw className="animate-spin w-4 h-4"/> : <Bot className="w-4 h-4"/>}
                      {isAnalyzing ? 'Processando...' : 'Extrair Dados'}
                  </button>
                  
                  {aiFeedback && (
                      <div className="bg-green-500/10 border border-green-500/20 text-green-300 text-xs p-2 rounded-lg text-center animate-fade-in">
                          {aiFeedback}
                      </div>
                  )}
              </div>
          </div>
      </div>
  );

  const renderQuoteContent = () => (
      <div className="bg-white rounded-2xl border border-brand-gray-200 shadow-sm flex flex-col overflow-hidden min-h-[600px]">
          {/* Header - No Tabs */}
          <div className="p-6 border-b border-brand-gray-100 bg-brand-gray-50/50 flex items-center justify-between">
              <h3 className="font-bold text-brand-gray-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-brand-primary" />
                  Simulador de Taxas
              </h3>
              <div className="bg-white px-3 py-1 rounded-full text-xs font-bold border border-brand-gray-200 shadow-sm">
                  Produto: {context.product}
              </div>
          </div>

          <div className="p-4 md:p-8 bg-white flex-1">
              <div className="flex flex-col lg:flex-row gap-8 h-full">
                  {/* SIMULATOR INPUTS */}
                  <div className="flex-1 space-y-6">
                      <div className="bg-brand-gray-50 p-6 rounded-2xl border border-brand-gray-100">
                          <h4 className="font-bold text-brand-gray-900 flex items-center gap-2 mb-4">
                              <Settings size={18} className="text-brand-primary" /> Parâmetros da Venda
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                              <div>
                                  <label className="text-xs font-bold text-brand-gray-500 uppercase tracking-wide mb-2 block">Valor da Venda</label>
                                  <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400 font-bold">R$</span>
                                      <input 
                                          type="text" 
                                          className="w-full pl-9 pr-4 py-3 border border-brand-gray-200 rounded-xl font-bold text-brand-gray-900 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all bg-white shadow-sm"
                                          value={formatCurrencyValue(simulation.amount)} 
                                          onChange={handleSimulationAmountChange}
                                      />
                                  </div>
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-brand-gray-500 uppercase tracking-wide mb-2 block">Repasse de Juros</label>
                                  <div className="flex bg-white p-1 rounded-xl border border-brand-gray-200 shadow-sm h-[46px]">
                                      <button onClick={() => setSimulation({...simulation, interestPayer: 'EC'})} className={`flex-1 rounded-lg text-xs font-bold transition-all ${simulation.interestPayer === 'EC' ? 'bg-brand-gray-900 text-white shadow' : 'text-brand-gray-500 hover:text-brand-gray-900'}`}>Lojista</button>
                                      <button onClick={() => setSimulation({...simulation, interestPayer: 'CLIENT'})} className={`flex-1 rounded-lg text-xs font-bold transition-all ${simulation.interestPayer === 'CLIENT' ? 'bg-brand-gray-900 text-white shadow' : 'text-brand-gray-500 hover:text-brand-gray-900'}`}>Cliente</button>
                                  </div>
                              </div>
                          </div>

                          <div className="border-t border-brand-gray-200 my-4"></div>

                          <h4 className="font-bold text-brand-gray-900 flex items-center gap-2 mb-4">
                              <BadgePercent size={18} className="text-brand-primary" /> Taxas Aplicadas
                          </h4>
                          <div className="grid grid-cols-3 gap-4">
                              <div>
                                  <label className="text-[10px] font-bold text-brand-gray-500 uppercase tracking-wide mb-1 block">Débito</label>
                                  <div className="relative">
                                      <input 
                                          type="number" 
                                          className="w-full pr-6 pl-3 py-2 border border-brand-gray-200 rounded-lg text-sm font-bold focus:ring-1 focus:ring-brand-primary outline-none"
                                          value={rates.debit}
                                          onChange={e => setRates({...rates, debit: parseFloat(e.target.value)})}
                                      />
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-gray-400 text-xs">%</span>
                                  </div>
                              </div>
                              <div>
                                  <label className="text-[10px] font-bold text-brand-gray-500 uppercase tracking-wide mb-1 block">Crédito 1x</label>
                                  <div className="relative">
                                      <input 
                                          type="number" 
                                          className="w-full pr-6 pl-3 py-2 border border-brand-gray-200 rounded-lg text-sm font-bold focus:ring-1 focus:ring-brand-primary outline-none"
                                          value={rates.creditSight}
                                          onChange={e => setRates({...rates, creditSight: parseFloat(e.target.value)})}
                                      />
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-gray-400 text-xs">%</span>
                                  </div>
                              </div>
                              <div>
                                  <label className="text-[10px] font-bold text-brand-gray-500 uppercase tracking-wide mb-1 block">Crédito 12x</label>
                                  <div className="relative">
                                      <input 
                                          type="number" 
                                          className="w-full pr-6 pl-3 py-2 border border-brand-gray-200 rounded-lg text-sm font-bold focus:ring-1 focus:ring-brand-primary outline-none"
                                          value={rates.installments[12] || 0}
                                          onChange={e => setRates(p => ({...p, installments: {...p.installments, 12: parseFloat(e.target.value)}}))}
                                      />
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-gray-400 text-xs">%</span>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* SIMULATION RESULTS */}
                      <div className="bg-white rounded-2xl border border-brand-gray-200 overflow-hidden shadow-sm">
                          <div className="bg-brand-gray-50/50 p-4 border-b border-brand-gray-100 flex justify-between items-center">
                              <h4 className="font-bold text-brand-gray-900 text-sm">Resultado Simulado</h4>
                              <span className="text-xs text-brand-gray-500">Baseado nas taxas configuradas</span>
                          </div>
                          <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left min-w-[300px]">
                                  <thead className="text-xs text-brand-gray-400 uppercase bg-white border-b border-brand-gray-100">
                                      <tr>
                                          <th className="px-5 py-3 font-bold">Parcela</th>
                                          <th className="px-5 py-3 font-bold text-right">Valor Líquido</th>
                                          <th className="px-5 py-3 font-bold text-center">Taxa (%)</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-brand-gray-50">
                                      {getSimulationRows().map((row, i) => (
                                          <tr key={i} className="hover:bg-brand-gray-50/50 transition-colors">
                                              <td className="px-5 py-3 font-bold text-brand-gray-700">{row.label}</td>
                                              <td className="px-5 py-3 text-right">
                                                  <span className={`font-mono font-bold ${simulation.interestPayer === 'CLIENT' ? 'text-brand-gray-400 line-through decoration-2' : 'text-green-600'}`}>
                                                      {row.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                                                  </span>
                                              </td>
                                              <td className="px-5 py-3 text-center text-brand-gray-600">{row.rate.toFixed(2)}%</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </div>

                  {/* SUMMARY SIDEBAR */}
                  <div className="w-full lg:w-80 shrink-0">
                      <div className="bg-gradient-to-br from-brand-gray-900 to-brand-gray-800 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                          
                          <h4 className="font-bold text-lg mb-6 flex items-center gap-2 relative z-10">
                              <Calculator className="w-5 h-5 text-brand-primary" /> Resumo
                          </h4>
                          
                          <div className="space-y-6 relative z-10">
                              <div>
                                  <p className="text-xs text-brand-gray-400 uppercase font-bold tracking-wider mb-1">Valor Bruto</p>
                                  <p className="text-3xl font-bold tracking-tight">{simulation.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
                              </div>
                              <div className="h-px bg-white/10"></div>
                              <div>
                                  <p className="text-xs text-brand-gray-400 uppercase font-bold tracking-wider mb-1">Taxa Média Ponderada</p>
                                  <div className="flex items-baseline gap-2">
                                      <p className="text-2xl font-bold text-brand-primary">{((rates.debit * 0.4 + rates.creditSight * 0.2 + (rates.installments[12]||0) * 0.4)).toFixed(2)}%</p>
                                      <span className="text-xs text-brand-gray-400">(Estimada)</span>
                                  </div>
                              </div>
                          </div>

                          <button className="w-full bg-white text-brand-gray-900 py-3.5 rounded-xl font-bold mt-8 hover:bg-brand-gray-100 transition-colors shadow-lg flex items-center justify-center gap-2">
                              <Upload size={18} />
                              Exportar Simulação
                          </button>
                      </div>
                  </div>
              </div>
          </div>

          <div className="p-4 border-t border-brand-gray-200 bg-brand-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4 w-full sm:w-auto justify-center sm:justify-start">
                  <AutosaveIndicator />
                  <button onClick={handleCreateDemand} className="bg-white border border-brand-gray-300 text-brand-gray-700 px-4 py-2.5 rounded-xl font-bold hover:bg-brand-gray-100 transition-all shadow-sm flex items-center gap-2 text-sm">
                      <Save className="w-4 h-4"/> Salvar Rascunho
                  </button>
              </div>
              <button onClick={handleSendToPricing} className="w-full sm:w-auto bg-brand-gray-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm transform hover:-translate-y-0.5">
                  <FileCheck className="w-4 h-4 text-green-400"/> Enviar para Análise
              </button>
          </div>
      </div>
  );

  const renderQuote = () => (
      <div className="animate-fade-in space-y-6">
          {renderContext()}
          {renderAIReader()}
          {renderQuoteContent()}
      </div>
  );

  const renderNegotiator = () => {
      // Simple mock logic for negotiator visualization
      const savings = 150.00;
      const isCheaper = true;

      return (
          <div className="animate-fade-in flex flex-col gap-6">
              <div className="flex gap-6 flex-col lg:flex-row">
                  {/* Competitor Card */}
                  <div className="flex-1 bg-white rounded-2xl shadow-sm border border-brand-gray-200 p-6 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-brand-gray-300"></div>
                      <h3 className="font-bold text-lg text-brand-gray-900 mb-6 flex items-center gap-2">
                          <Scale className="w-5 h-5 text-brand-gray-400" />
                          Concorrente ({context.competitor || 'Atual'})
                      </h3>
                      <div className="space-y-4">
                          {/* Inputs with floating style */}
                          {['Débito', 'Crédito à Vista', 'Crédito 12x'].map((label, i) => (
                              <div key={label} className="flex justify-between items-center bg-brand-gray-50 p-3 rounded-xl border border-brand-gray-100">
                                  <span className="text-sm font-bold text-brand-gray-600">{label}</span>
                                  <div className="relative w-24">
                                      <input 
                                          type="number" 
                                          className="w-full bg-white border border-brand-gray-300 rounded-lg py-1.5 px-2 text-right font-bold text-brand-gray-900 focus:ring-1 focus:ring-brand-primary outline-none text-sm"
                                          placeholder="0.00"
                                      />
                                      <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xs text-brand-gray-400 pointer-events-none">%</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* Our Rates Card */}
                  <div className="flex-1 bg-white rounded-2xl shadow-lg border border-brand-primary/20 p-6 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary"></div>
                      <h3 className="font-bold text-lg text-brand-primary mb-6 flex items-center gap-2">
                          <BadgePercent className="w-5 h-5" />
                          Pagmotors (Full)
                      </h3>
                      <div className="space-y-4 opacity-90 pointer-events-none">
                          {/* Read Only Inputs */}
                          {[
                              { l: 'Débito', v: rates.debit }, 
                              { l: 'Crédito à Vista', v: rates.creditSight }, 
                              { l: 'Crédito 12x', v: rates.installments[12] }
                          ].map((item) => (
                              <div key={item.l} className="flex justify-between items-center bg-brand-primary/5 p-3 rounded-xl border border-brand-primary/10">
                                  <span className="text-sm font-bold text-brand-gray-700">{item.l}</span>
                                  <span className="font-mono font-bold text-brand-primary">{item.v?.toFixed(2)}%</span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>

              {/* Outcome Banner */}
              <div className={`rounded-2xl p-8 shadow-xl text-white flex flex-col md:flex-row items-center justify-between gap-6 transition-all transform hover:scale-[1.01]
                  ${isCheaper ? 'bg-gradient-to-r from-green-600 to-green-500' : 'bg-brand-gray-900'}
              `}>
                  <div>
                      <h4 className="font-bold text-2xl mb-2 flex items-center gap-2">
                          {isCheaper ? <CheckCircle2 className="w-8 h-8"/> : <AlertCircle className="w-8 h-8"/>}
                          {isCheaper ? 'Proposta Competitiva!' : 'Ajuste Necessário'}
                      </h4>
                      <p className="text-white/90 text-sm font-medium max-w-md">
                          Com base no TPV informado, nossa proposta gera economia mensal para o cliente.
                      </p>
                  </div>
                  <div className="text-right bg-black/10 p-4 rounded-xl backdrop-blur-sm border border-white/10 w-full md:w-auto">
                      <p className="text-xs uppercase font-bold opacity-80 mb-1">Economia Estimada</p>
                      <p className="text-4xl font-black tracking-tight">
                          R$ {savings.toFixed(2)}
                          <span className="text-sm font-medium opacity-60 ml-1">/mês</span>
                      </p>
                  </div>
              </div>
          </div>
      );
  };

  // Keep Range Table View as provided but styled
  const renderRangeTable = () => {
      // Reuse logic from previous, wrap in styled components
      return (
          <div className="animate-fade-in flex flex-col gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-200 p-8 flex flex-col items-center justify-center text-center">
                  <div className="bg-brand-gray-50 p-4 rounded-full mb-4">
                      <TrendingUp className="w-10 h-10 text-brand-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-brand-gray-900 mb-2">Tabelas de Taxas Padrão</h3>
                  <p className="text-brand-gray-500 max-w-md mb-6">Consulte as taxas baseadas no volume transacionado (TPV) para os produtos Full e Simples.</p>
                  
                  <div className="flex gap-4 flex-col sm:flex-row w-full sm:w-auto">
                      <button className="px-6 py-3 bg-brand-gray-900 text-white rounded-xl font-bold shadow hover:bg-black transition-colors w-full sm:w-auto">
                          Visualizar Tabela Full
                      </button>
                      <button className="px-6 py-3 bg-white border border-brand-gray-200 text-brand-gray-700 rounded-xl font-bold hover:bg-brand-gray-50 transition-colors w-full sm:w-auto">
                          Visualizar Tabela Simples
                      </button>
                  </div>
              </div>
          </div>
      );
  };

  // --- PDF TEMPLATE (Hidden) ---
  const renderProposalTemplate = (isPreview = false) => {
      const activeTable = context.product === 'Full' ? rangeTableFull : rangeTableSimple;
      return (
      <div className={`bg-brand-primary w-full h-full flex flex-col font-sans ${isPreview ? 'rounded-2xl overflow-hidden shadow-2xl max-w-lg mx-auto aspect-[1/1.41] scale-90' : ''}`}>
          <div className="p-8 pb-4">
              <div className="flex justify-between items-start mb-6">
                  <div className="bg-white p-2 px-3 rounded-lg shadow-sm">
                      {/* Logo for RED background */}
                      <Logo type="standard" className="scale-75 origin-left" /> 
                  </div>
                  <div className="flex flex-col items-end text-white">
                      <h1 className="text-xl font-black uppercase tracking-wide">Proposta Comercial</h1>
                      <div className="flex items-center gap-2 mt-1">
                          <span className="font-bold text-lg">pagmotors</span>
                      </div>
                  </div>
              </div>
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
              <div className="text-white">
                  <p className="text-[10px] font-bold opacity-70 uppercase">Estabelecimento</p>
                  <h2 className="text-2xl font-black leading-tight">{context.fantasyName || 'CLIENTE NÃO INFORMADO'}</h2>
              </div>
          </div>
          <div className="mx-6 bg-white rounded-xl shadow-xl overflow-hidden flex-1 flex flex-col">
              <div className="bg-brand-gray-900 text-white p-3 flex justify-between items-center">
                  <span className="font-bold text-xs uppercase tracking-wider">Condições Comerciais</span>
              </div>
              <div className="p-4 flex-1">
                  <table className="w-full text-center border-collapse border-2 border-black">
                      <thead><tr><th className="border-2 border-black py-2 text-black font-extrabold uppercase text-xs w-1/2 bg-gray-100">Parcelas</th><th className="border-2 border-black py-2 text-black font-extrabold uppercase text-xs w-1/2 bg-gray-100">Taxa</th></tr></thead>
                      <tbody className="text-xs font-bold text-black">
                          {activeTable.rows.map((row, idx) => {
                              const rate = row.values[selectedRangeIndex];
                              return (
                                  <tr key={idx}>
                                      <td className={`border-2 border-black py-1.5 ${row.label === 'Débito' ? 'bg-black text-white' : ''}`}>{row.label}</td>
                                      <td className="border-2 border-black py-1.5 text-sm">{rate.toFixed(2).replace('.', ',')}%</td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
          <div className="p-6 mt-2 grid grid-cols-5 gap-2 text-white">
              {/* Icons Footer */}
              <div className="flex flex-col items-center text-center"><div className="bg-white/20 p-2 rounded-full mb-1"><Zap size={14} strokeWidth={3} /></div><p className="text-[8px] font-bold leading-tight">Pagamento D+0</p></div>
              <div className="flex flex-col items-center text-center"><div className="bg-white/20 p-2 rounded-full mb-1"><CreditCard size={14} strokeWidth={3} /></div><p className="text-[8px] font-bold leading-tight">Taxa Única</p></div>
              <div className="flex flex-col items-center text-center"><div className="bg-white/20 p-2 rounded-full mb-1"><Headphones size={14} strokeWidth={3} /></div><p className="text-[8px] font-bold leading-tight">Suporte</p></div>
              <div className="flex flex-col items-center text-center"><div className="bg-white/20 p-2 rounded-full mb-1"><Star size={14} strokeWidth={3} /></div><p className="text-[8px] font-bold leading-tight">Prioridade Leads</p></div>
              <div className="flex flex-col items-center text-center"><div className="bg-white/20 p-2 rounded-full mb-1"><Landmark size={14} strokeWidth={3} /></div><p className="text-[8px] font-bold leading-tight">Multi-Domicílio</p></div>
          </div>
          <div className="bg-black text-white text-[8px] text-center py-2 uppercase tracking-widest font-bold opacity-80">
              Webmotors Serviços Automotivos
          </div>
      </div>
      );
  };

  return (
    <div className="flex flex-col space-y-6 max-w-7xl mx-auto pb-20">
      
      {/* --- PRINT ONLY SECTION --- */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 overflow-hidden font-sans">
          {renderProposalTemplate()}
      </div>

      {/* Toast Notification */}
      {showDemandSuccess && (
          <div className="fixed top-24 right-4 z-50 animate-fade-in no-print">
              <div className="bg-brand-gray-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border border-white/10">
                  <div className="bg-green-500 rounded-full p-1 text-white"><CheckCircle2 size={20} /></div>
                  <div><h4 className="font-bold text-sm">Demanda Criada!</h4><p className="text-xs text-gray-300">A cotação foi salva e vinculada ao cliente.</p></div>
              </div>
          </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 no-print">
          <div>
            <h1 className="text-3xl font-bold text-brand-gray-900 flex items-center gap-3">
                {isPricingProfile ? <Handshake className="w-8 h-8 text-brand-primary"/> : <BadgePercent className="w-8 h-8 text-brand-primary" />}
                {isPricingProfile ? 'Mesa de Negociação' : 'Pricing & Negociação'}
            </h1>
            <p className="text-brand-gray-500 mt-1 font-medium">
                {isPricingProfile ? 'Análise de propostas e aprovação.' : 'Simulador avançado e comparativo comercial.'}
            </p>
          </div>
          {/* Logo on Light Background -> Standard */}
          <div className="hidden md:block opacity-80 grayscale hover:grayscale-0 transition-all">
              <Logo type="standard" className="scale-75 origin-right" />
          </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-col no-print gap-8">
          
          {/* MODERN PILL TABS */}
          {!isPricingProfile && (
              <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-brand-gray-200 flex flex-col sm:flex-row w-full md:w-auto">
                  {[
                      { id: 'QUOTE', icon: Calculator, label: 'Cotação & Simulador' },
                      { id: 'NEGOTIATOR', icon: Scale, label: 'Comparativo' },
                      { id: 'RANGE_TABLE', icon: TrendingUp, label: 'Tabelas Padrão' },
                  ].map((tab) => (
                      <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300
                              ${activeTab === tab.id 
                                  ? 'bg-brand-gray-900 text-white shadow-lg transform scale-[1.02]' 
                                  : 'text-brand-gray-500 hover:bg-brand-gray-50 hover:text-brand-gray-900'}
                          `}
                      >
                          <tab.icon size={18} />
                          {tab.label}
                      </button>
                  ))}
              </div>
          )}

          <div className="min-h-[500px]">
              {activeTab === 'QUOTE' && !isPricingProfile && renderQuote()}
              {activeTab === 'RANGE_TABLE' && !isPricingProfile && renderRangeTable()}
              {activeTab === 'NEGOTIATOR' && !isPricingProfile && renderNegotiator()}
              
              {isPricingProfile && activeTab === 'DASHBOARD' && (
                  <div className="flex flex-col items-center justify-center h-[400px] bg-white rounded-3xl border border-dashed border-brand-gray-200">
                      <Handshake className="w-16 h-16 mb-4 text-brand-gray-200" />
                      <h3 className="text-xl font-bold text-brand-gray-400">Mesa de Aprovação</h3>
                      <p className="text-sm text-brand-gray-400">Selecione uma solicitação no menu lateral.</p>
                  </div>
              )}
          </div>
      </div>

      {/* PDF PREVIEW MODAL */}
      {showPreviewModal && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in no-print">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[90vh] border border-white/10">
                  <div className="bg-brand-gray-900 px-8 py-5 flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-3">
                          <Eye className="w-5 h-5 text-white" />
                          <h3 className="text-white font-bold text-lg">Pré-visualização</h3>
                      </div>
                      <button onClick={() => setShowPreviewModal(false)} className="text-brand-gray-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="flex-1 bg-brand-gray-100 overflow-y-auto p-8 flex justify-center">
                      {renderProposalTemplate(true)}
                  </div>

                  <div className="p-5 bg-white border-t border-brand-gray-200 flex justify-end gap-4 shrink-0">
                      <button 
                          onClick={() => setShowPreviewModal(false)}
                          className="px-6 py-2.5 text-brand-gray-600 font-bold hover:bg-brand-gray-50 rounded-xl transition-colors"
                      >
                          Voltar
                      </button>
                      <button 
                          onClick={handlePrintProposal}
                          className="px-8 py-2.5 bg-brand-primary text-white font-bold rounded-xl shadow-lg shadow-brand-primary/30 hover:bg-brand-dark transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                      >
                          <Download className="w-4 h-4" />
                          Baixar PDF
                      </button>
                  </div>
              </div>
          </div>
      )}
      
      {/* Styles */}
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
