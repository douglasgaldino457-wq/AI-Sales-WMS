import React, { useState, useEffect, useRef } from 'react';
import { 
  BadgePercent, Hammer, Calculator, Bot, RefreshCw, CheckCircle2, 
  Wallet, Upload, FileText, Image as ImageIcon, X, PieChart, Save, Search, Building2, Globe, ArrowRight, Zap, Hourglass
} from 'lucide-react';
import { UserRole, ClientBaseRow, ManualDemand } from '../types';
import { appStore } from '../services/store';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { runWithRetry } from '../services/geminiService';

interface PricingPageProps {
  role: UserRole;
}

// --- TYPES ---
type AnalysisMode = 'RATE_TABLE' | 'SIMULATION';

interface NegotiationContext {
  identifier: string; // CNPJ or ID
  clientName: string;
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
}

interface SimulationState {
  amount: number;
  installments: number;
  interestPayer: 'EC' | 'CLIENT';
}

const PricingPage: React.FC<PricingPageProps> = ({ role }) => {
  // --- STATE ---
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('RATE_TABLE');
  
  const [context, setContext] = useState<NegotiationContext>({
    identifier: '',
    clientName: '',
    competitor: '',
    potentialRevenue: 0,
    minAgreed: 0,
    product: 'Full'
  });
  
  const [rates, setRates] = useState<RateTable>({
    debit: 0,
    creditSight: 0,
    credit2to6: 0,
    credit7to12: 0,
    credit13to18: 0,
    anticipation: 0,
    concDebit: 1.20, 
    concSight: 3.10,
    conc2to6: 8.50,
    conc7to12: 11.50,
    conc13to18: 18.00,
    installments: {}, 
    concInstallments: {}
  });

  const [simulation, setSimulation] = useState<SimulationState>({
    amount: 1000,
    installments: 1,
    interestPayer: 'EC'
  });

  // Client Search State
  const [suggestions, setSuggestions] = useState<ClientBaseRow[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [isSearchingReceita, setIsSearchingReceita] = useState(false);

  // AI State
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDemandSuccess, setShowDemandSuccess] = useState(false);

  // Initialize installments
  useEffect(() => {
      if (Object.keys(rates.installments).length === 0) {
          const initialInst: {[key: number]: number} = {};
          const initialConc: {[key: number]: number} = {};
          for(let i=2; i<=18; i++) {
              initialInst[i] = 0;
              initialConc[i] = 0;
          }
          setRates(prev => ({ ...prev, installments: initialInst, concInstallments: initialConc }));
      }
  }, []);

  // Force RATE_TABLE mode when switching to Simples
  useEffect(() => {
      if (context.product === 'Simples') {
          setAnalysisMode('RATE_TABLE');
      }
  }, [context.product]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- CLIENT SEARCH LOGIC ---
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setContext(prev => ({ ...prev, identifier: val }));
      
      if (val.length > 2) {
          const clients = appStore.getClients();
          const matches = clients.filter(c => 
              c.nomeEc.toLowerCase().includes(val.toLowerCase()) || 
              c.id.includes(val)
          ).slice(0, 5);
          setSuggestions(matches);
          setShowSuggestions(true);
      } else {
          setShowSuggestions(false);
      }
  };

  const selectClient = (client: ClientBaseRow) => {
      setContext(prev => ({
          ...prev,
          identifier: client.id,
          clientName: client.nomeEc,
          competitor: client.leadMetadata?.competitorAcquirer || '',
          potentialRevenue: client.leadMetadata?.revenuePotential || 0
      }));
      setShowSuggestions(false);
  };

  const handleReceitaSearch = () => {
      if (!context.identifier) return;
      setIsSearchingReceita(true);
      // Mock API call
      setTimeout(() => {
          setIsSearchingReceita(false);
          if (!context.clientName) {
              setContext(prev => ({ 
                  ...prev, 
                  clientName: "Estabelecimento Encontrado Ltda",
                  potentialRevenue: 25000 
              }));
          }
      }, 1500);
  };

  // --- CALCULATIONS ---
  
  // Auto-Calculate Full Rates from Simple Inputs (Legacy Logic, kept for safety)
  useEffect(() => {
      if (analysisMode === 'SIMULATION') return; 
      if (context.product === 'Simples' && !rates.anticipation) return; 
      
      const newInst = { ...rates.installments };
      const ant = rates.anticipation || 0;

      const calc = (baseMdr: number, parc: number) => {
          if (!baseMdr && !ant) return 0;
          const averageTerm = (parc + 1) / 2;
          const calculated = (baseMdr || 0) + (ant * averageTerm);
          return parseFloat(calculated.toFixed(2));
      };

      for (let i = 2; i <= 18; i++) {
          let baseMdr = 0;
          if (i <= 6) baseMdr = rates.credit2to6;
          else if (i <= 12) baseMdr = rates.credit7to12;
          else baseMdr = rates.credit13to18;
          
          if ((baseMdr > 0 || ant > 0)) {
             newInst[i] = calc(baseMdr, i);
          }
      }
      
      if (JSON.stringify(newInst) !== JSON.stringify(rates.installments)) {
          setRates(prev => ({ ...prev, installments: newInst }));
      }
  }, [rates.anticipation, rates.credit2to6, rates.credit7to12, rates.credit13to18, context.product, analysisMode]);

  // Format Helpers
  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'potentialRevenue' | 'minAgreed') => {
      const rawValue = e.target.value.replace(/\D/g, ''); 
      const numValue = rawValue ? parseInt(rawValue, 10) / 100 : 0;
      setContext(prev => ({ ...prev, [field]: numValue }));
  };

  const formatCurrencyValue = (val: number) => {
      if (!val) return '';
      return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Helper: Format number to "00,00 %"
  const formatPercent = (val: number) => {
      if (val === undefined || val === null) return '';
      return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %';
  };

  // Helper: Parse "123" -> 1.23
  const parsePercent = (val: string) => {
      const raw = val.replace(/\D/g, '');
      return raw ? Math.min(100, parseInt(raw, 10) / 100) : 0;
  };

  const getTotalConcentration = () => {
      if (context.product === 'Simples') return 100; // Mock 100 for Simple view simplicity
      const granularSum = (Object.values(rates.concInstallments || {}) as number[]).reduce((acc, curr) => acc + (curr || 0), 0);
      return ((rates.concDebit || 0) + (rates.concSight || 0) + granularSum);
  };

  const totalConc = getTotalConcentration();
  const isConcValid = Math.abs(totalConc - 100) < 0.1;

  const handleCreateDemand = () => {
      if (!context.identifier) {
          alert("Identifique o cliente para criar uma demanda.");
          return;
      }

      // Create Demand for Negotiation Desk with ACTUAL data
      const newDemand: ManualDemand = {
          id: `NEG-${Math.floor(Math.random() * 10000)}`,
          type: 'Negociação de Taxas',
          clientId: context.identifier,
          clientName: context.clientName,
          date: new Date().toISOString(),
          status: 'Pendente',
          requester: 'Eu (Consultor)', // Mock requester
          description: `Solicitação de taxas ${context.product} para cliente com potencial de R$ ${context.potentialRevenue.toLocaleString('pt-BR')}.`,
          pricingData: {
              competitorRates: {
                  debit: rates.concDebit || 0,
                  credit1x: rates.concSight || 0,
                  credit12x: rates.concInstallments[12] || rates.conc7to12 || 0
              },
              proposedRates: {
                  debit: rates.debit || 0,
                  credit1x: rates.creditSight || 0,
                  credit12x: rates.installments[12] || rates.credit7to12 || 0
              },
              financials: {
                  spread: 0, // To be calculated by Pricing Desk
                  mcf2: 0
              },
              context: {
                  potentialRevenue: context.potentialRevenue,
                  minAgreed: context.minAgreed
              },
              evidenceUrl: evidenceFiles.length > 0 ? 'simulated_evidence.jpg' : undefined
          }
      };

      appStore.addDemand(newDemand);

      setShowDemandSuccess(true);
      setTimeout(() => setShowDemandSuccess(false), 4000);
  };

  // --- AI EVIDENCE LOGIC ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const newFiles = Array.from(e.target.files) as File[];
        setEvidenceFiles(prev => [...prev, ...newFiles]);
    }
  };

  const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
          if (typeof reader.result === 'string') resolve(reader.result.split(',')[1]);
          else resolve('');
      };
      reader.readAsDataURL(file);
    });
    return { inlineData: { data: await base64EncodedDataPromise, mimeType: file.type } };
  };

  const handleAnalyzeEvidence = async () => {
    if (evidenceFiles.length === 0) return;
    
    // Check Requirement for Simulation
    if (analysisMode === 'SIMULATION' && (!simulation.amount || simulation.amount <= 0)) {
        alert("Para simulação por valor, informe o 'Valor da Venda' primeiro.");
        return;
    }

    setIsAnalyzing(true);
    try {
        const apiKey = process.env.API_KEY;
        const ai = new GoogleGenAI({ apiKey: apiKey! });
        const fileParts = await Promise.all(evidenceFiles.map(fileToGenerativePart));
        
        let promptText = "";

        if (analysisMode === 'SIMULATION') {
            promptText = `
              Você é um especialista em Pricing e Matemática Financeira.
              Tarefa: Analisar a imagem de um simulador de maquininha.
              VALOR BASE: R$ ${simulation.amount}.
              OBJETIVO: Identifique parcelas e calcule a taxa implícita.
              RETORNO JSON OBRIGATÓRIO: { "installments": { "1": number, "2": number, "12": number } }
            `;
        } else {
            promptText = `
              Extraia a tabela de taxas da imagem.
              Retorne JSON: { "debit": number, "creditSight": number, "installments": { "2": number, ... "18": number } }
            `;
        }

        const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [...fileParts, { text: promptText }] }
        }));

        let jsonStr = response.text || "";
        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '');
        const firstOpen = jsonStr.indexOf('{');
        const lastClose = jsonStr.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose !== -1) jsonStr = jsonStr.substring(firstOpen, lastClose + 1);

        const parsed = JSON.parse(jsonStr);
        
        if (parsed) {
            if (analysisMode === 'SIMULATION' && parsed.installments) {
                setRates(prev => ({
                    ...prev,
                    installments: { ...prev.installments, ...parsed.installments }
                }));
                setSimulation(prev => ({...prev, interestPayer: 'CLIENT'}));
            } else {
                const { installments, ...baseRates } = parsed;
                setRates(prev => ({ ...prev, ...baseRates, installments: { ...prev.installments, ...installments } }));
            }
        }

    } catch (error) {
        console.error("Erro na análise IA:", error);
        alert("Não foi possível ler a evidência. Tente novamente.");
    } finally {
        setIsAnalyzing(false);
        setEvidenceFiles([]);
    }
  };

  const calculateRow = (type: 'Debit' | number) => {
      let rate = 0;
      if (type === 'Debit') rate = rates.debit ?? 0;
      else if (type === 1) rate = rates.creditSight ?? 0;
      else rate = (rates.installments && rates.installments[type as number]) ?? 0;

      const decimalRate = rate / 100;
      const amount = simulation.amount || 0;

      if (simulation.interestPayer === 'EC') {
          const cost = amount * decimalRate;
          const net = amount - cost;
          return { label: type === 'Debit' ? 'Débito' : `${type}x`, rate, value: net, detail: cost };
      } else {
          const charged = amount / (1 - decimalRate);
          const diff = charged - amount;
          return { label: type === 'Debit' ? 'Débito' : `${type}x`, rate, value: charged, detail: diff };
      }
  };

  // Helper to render compact inputs with Mask "00,00 %"
  const RateInput = ({ value, onChange, placeholder, isCompetitor = false }: any) => (
      <input 
          type="text"
          inputMode="numeric" 
          className={`w-full text-center font-bold rounded px-1 py-1.5 text-xs outline-none transition-all border
              ${isCompetitor 
                  ? 'text-blue-600 bg-blue-50/50 border-transparent focus:border-blue-300 placeholder-blue-300' 
                  : 'text-gray-800 bg-gray-50 focus:bg-white border-transparent focus:border-brand-primary placeholder-gray-300'
              }`}
          value={value !== undefined ? formatPercent(value) : ''}
          onChange={(e) => onChange(parsePercent(e.target.value))}
          placeholder={placeholder || "0,00 %"}
      />
  );

  // Helper for Card inputs in Simples view
  const CardInput = ({ label, value, onChange, placeholder, isCompetitor = false }: any) => (
      <div>
          <label className={`text-[10px] block mb-1 ${isCompetitor ? 'text-blue-500 font-bold' : 'text-gray-400 font-bold'}`}>
              {label}
          </label>
          <input 
              type="text"
              inputMode="numeric" 
              className={`w-full text-center font-bold rounded px-2 py-2 text-sm outline-none border focus:ring-1 transition-all
                  ${isCompetitor 
                      ? 'bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-400 placeholder-blue-300' 
                      : 'bg-white text-gray-800 border-gray-200 focus:ring-brand-primary placeholder-gray-300'}`}
              value={value !== undefined ? formatPercent(value) : ''}
              onChange={(e) => onChange(parsePercent(e.target.value))}
              placeholder={placeholder || "0,00 %"}
          />
      </div>
  );

  return (
    <div className="flex flex-col space-y-6 max-w-6xl mx-auto pb-24">
      
      {/* Toast Notification */}
      {showDemandSuccess && (
          <div className="fixed top-24 right-4 z-50 animate-fade-in">
              <div className="bg-brand-gray-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border border-white/10">
                  <div className="bg-green-500 rounded-full p-1 text-white">
                      <CheckCircle2 size={20} />
                  </div>
                  <div>
                      <h4 className="font-bold text-sm">Demanda Criada!</h4>
                      <p className="text-xs text-gray-300">A proposta foi enviada para análise.</p>
                  </div>
              </div>
          </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                <BadgePercent className="w-8 h-8 text-brand-primary" />
                Pricing
            </h1>
            <p className="text-brand-gray-500 mt-1">
                Definição de taxas e análise.
            </p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* --- LEFT COLUMN: CONTEXT --- */}
          <div className="lg:col-span-1 space-y-4">
              
              {/* Context Form */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-brand-gray-100">
                  <h3 className="font-bold text-brand-gray-900 mb-3 flex items-center gap-2 text-xs uppercase tracking-wide">
                      <Wallet className="w-4 h-4 text-brand-primary" />
                      Dados do Cliente
                  </h3>
                  
                  <div className="space-y-3">
                      <div className="relative" ref={searchRef}>
                          <label className="block text-[10px] font-bold text-brand-gray-500 mb-1">Buscar (CNPJ/ID)</label>
                          <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-brand-gray-400" />
                              <input 
                                  type="text" 
                                  className="w-full pl-8 border border-brand-gray-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-brand-primary transition-all"
                                  placeholder="Digite para buscar..."
                                  value={context.identifier}
                                  onChange={handleSearchChange}
                              />
                          </div>
                          {showSuggestions && suggestions.length > 0 && (
                              <div className="absolute top-full left-0 right-0 bg-white border border-brand-gray-200 rounded-lg shadow-xl z-20 mt-1 max-h-48 overflow-y-auto animate-fade-in">
                                  {suggestions.map(c => (
                                      <div key={c.id} onClick={() => selectClient(c)} className="px-4 py-2 hover:bg-brand-gray-50 cursor-pointer border-b border-brand-gray-50 last:border-0">
                                          <p className="text-xs font-bold text-brand-gray-800">{c.nomeEc}</p>
                                          <p className="text-[10px] text-brand-gray-500">ID: {c.id}</p>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>

                      {context.clientName && (
                          <div className="bg-brand-gray-50 p-2 rounded-lg border border-brand-gray-200 flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-brand-gray-400" />
                              <span className="text-xs font-bold text-brand-gray-800 truncate">{context.clientName}</span>
                          </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                          <div>
                              <label className="block text-[10px] font-bold text-brand-gray-500 mb-1">Potencial (R$)</label>
                              <input type="text" className="w-full border border-brand-gray-300 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-brand-primary" value={formatCurrencyValue(context.potentialRevenue)} onChange={e => handleCurrencyChange(e, 'potentialRevenue')} />
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-brand-gray-500 mb-1">Mínimo</label>
                              <input type="text" className="w-full border border-brand-gray-300 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-brand-primary" value={formatCurrencyValue(context.minAgreed)} onChange={e => handleCurrencyChange(e, 'minAgreed')} />
                          </div>
                      </div>

                      <div>
                          <label className="block text-[10px] font-bold text-brand-gray-500 mb-1">Modelo</label>
                          <div className="flex bg-brand-gray-100 p-1 rounded-lg">
                              <button onClick={() => setContext({...context, product: 'Full'})} className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${context.product === 'Full' ? 'bg-white text-green-700 shadow-sm' : 'text-brand-gray-500'}`}>Full</button>
                              <button onClick={() => setContext({...context, product: 'Simples'})} className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${context.product === 'Simples' ? 'bg-white text-blue-700 shadow-sm' : 'text-brand-gray-500'}`}>Simples</button>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Mode Selector */}
              <div className="bg-brand-gray-900 p-4 rounded-xl shadow-lg text-white">
                  <div className="flex bg-black/30 p-1 rounded-lg mb-4">
                      <button onClick={() => setAnalysisMode('RATE_TABLE')} className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all flex items-center justify-center gap-2 ${analysisMode === 'RATE_TABLE' ? 'bg-brand-primary text-white' : 'text-gray-400 hover:text-white'}`}><FileText className="w-3 h-3" /> Tabela</button>
                      {/* Hide Simulation button if Simples is selected */}
                      {context.product === 'Full' && (
                          <button onClick={() => setAnalysisMode('SIMULATION')} className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all flex items-center justify-center gap-2 ${analysisMode === 'SIMULATION' ? 'bg-brand-primary text-white' : 'text-gray-400 hover:text-white'}`}><Calculator className="w-3 h-3" /> Simular</button>
                      )}
                  </div>

                  <div className="mb-2">
                      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple accept="image/*,application/pdf" />
                      <button onClick={() => fileInputRef.current?.click()} className="w-full bg-white/10 border border-dashed border-white/30 rounded-lg p-3 flex flex-col items-center justify-center hover:bg-white/20 transition-colors text-center">
                          <Upload className="w-4 h-4 text-brand-gray-400 mb-1" />
                          <span className="text-[10px] text-gray-300">{analysisMode === 'RATE_TABLE' ? 'Foto da Tabela' : 'Print Simulador'}</span>
                      </button>
                      {evidenceFiles.length > 0 && <div className="mt-2 text-[10px] text-brand-primary text-center">{evidenceFiles.length} arquivo(s)</div>}
                  </div>

                  <button onClick={handleAnalyzeEvidence} disabled={isAnalyzing || evidenceFiles.length === 0} className="w-full bg-brand-primary hover:bg-brand-dark text-white py-2 rounded-lg font-bold text-xs shadow-md transition-all disabled:opacity-50">
                      {isAnalyzing ? 'Lendo...' : 'Extrair com IA'}
                  </button>
              </div>
          </div>

          {/* --- RIGHT COLUMN: TABLE --- */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-brand-gray-100 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-brand-gray-100 flex justify-between items-center bg-brand-gray-50">
                  <h3 className="font-bold text-brand-gray-900 flex items-center gap-2 text-sm">
                      {analysisMode === 'RATE_TABLE' ? <Hammer className="w-4 h-4 text-brand-primary"/> : <Calculator className="w-4 h-4 text-brand-primary"/>}
                      {analysisMode === 'RATE_TABLE' ? 'Definição de Taxas' : 'Simulação Financeira'}
                  </h3>
                  {analysisMode === 'RATE_TABLE' && context.product === 'Full' && (
                      <div className={`px-2 py-1 rounded border flex items-center gap-2 text-xs font-bold ${isConcValid ? 'bg-green-100 border-green-200 text-green-700' : 'bg-red-100 border-red-200 text-red-700'}`}>
                          <PieChart className="w-3 h-3" /> Conc: {totalConc?.toFixed(2)}%
                      </div>
                  )}
              </div>

              <div className="p-4 overflow-y-auto">
                  {analysisMode === 'RATE_TABLE' && (
                      <div className="space-y-6">
                          
                          {context.product === 'Simples' ? (
                              // --- CARD VIEW FOR SIMPLES ---
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                  {/* Card 1: Débito */}
                                  <div className="bg-brand-gray-50 p-3 rounded-xl border border-brand-gray-200 hover:border-brand-primary/50 transition-colors">
                                      <div className="text-xs font-bold text-gray-600 uppercase mb-3 border-b border-gray-200 pb-1">Débito</div>
                                      <div className="space-y-3">
                                          <CardInput label="Proposta" value={rates.debit} onChange={(val: number) => setRates({...rates, debit: val})} />
                                          <CardInput label="Concorrência" value={rates.concDebit} onChange={(val: number) => setRates({...rates, concDebit: val})} isCompetitor />
                                      </div>
                                  </div>

                                  {/* Card 2: 1x / Crédito à Vista */}
                                  <div className="bg-brand-gray-50 p-3 rounded-xl border border-brand-gray-200 hover:border-brand-primary/50 transition-colors">
                                      <div className="text-xs font-bold text-gray-600 uppercase mb-3 border-b border-gray-200 pb-1">1x (À Vista)</div>
                                      <div className="space-y-3">
                                          <CardInput label="Proposta" value={rates.creditSight} onChange={(val: number) => setRates({...rates, creditSight: val})} />
                                          <CardInput label="Concorrência" value={rates.concSight} onChange={(val: number) => setRates({...rates, concSight: val})} isCompetitor />
                                      </div>
                                  </div>

                                  {/* Card 3: 2x a 6x */}
                                  <div className="bg-brand-gray-50 p-3 rounded-xl border border-brand-gray-200 hover:border-brand-primary/50 transition-colors">
                                      <div className="text-xs font-bold text-gray-600 uppercase mb-3 border-b border-gray-200 pb-1">2x a 6x</div>
                                      <div className="space-y-3">
                                          <CardInput label="Proposta" value={rates.credit2to6} onChange={(val: number) => setRates({...rates, credit2to6: val})} />
                                          <CardInput label="Concorrência" value={rates.conc2to6} onChange={(val: number) => setRates({...rates, conc2to6: val})} isCompetitor />
                                      </div>
                                  </div>

                                  {/* Card 4: 7x a 12x */}
                                  <div className="bg-brand-gray-50 p-3 rounded-xl border border-brand-gray-200 hover:border-brand-primary/50 transition-colors">
                                      <div className="text-xs font-bold text-gray-600 uppercase mb-3 border-b border-gray-200 pb-1">7x a 12x</div>
                                      <div className="space-y-3">
                                          <CardInput label="Proposta" value={rates.credit7to12} onChange={(val: number) => setRates({...rates, credit7to12: val})} />
                                          <CardInput label="Concorrência" value={rates.conc7to12} onChange={(val: number) => setRates({...rates, conc7to12: val})} isCompetitor />
                                      </div>
                                  </div>

                                  {/* Card 5: 13x a 18x */}
                                  <div className="bg-brand-gray-50 p-3 rounded-xl border border-brand-gray-200 hover:border-brand-primary/50 transition-colors">
                                      <div className="text-xs font-bold text-gray-600 uppercase mb-3 border-b border-gray-200 pb-1">13x a 18x</div>
                                      <div className="space-y-3">
                                          <CardInput label="Proposta" value={rates.credit13to18} onChange={(val: number) => setRates({...rates, credit13to18: val})} />
                                          <CardInput label="Concorrência" value={rates.conc13to18} onChange={(val: number) => setRates({...rates, conc13to18: val})} isCompetitor />
                                      </div>
                                  </div>
                              </div>
                          ) : (
                              // --- TABLE VIEW FOR FULL ---
                              <div className="overflow-x-auto rounded-lg border border-brand-gray-200">
                                  <table className="w-full text-xs text-left table-fixed min-w-[300px]">
                                      <thead className="bg-brand-gray-100 text-brand-gray-600 font-bold uppercase tracking-wider">
                                          <tr>
                                              <th className="px-2 py-2 text-center w-[25%]">Parcela</th>
                                              <th className="px-2 py-2 text-center w-[37.5%]">Proposta (%)</th>
                                              <th className="px-2 py-2 text-center w-[37.5%]">Conc. (%)</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-brand-gray-100 bg-white">
                                          <tr>
                                              <td className="px-2 py-1.5 text-center font-bold text-brand-gray-700">Débito</td>
                                              <td className="px-2 py-1.5"><RateInput value={rates.debit} onChange={(val: number) => setRates({...rates, debit: val})} placeholder="0,00 %" /></td>
                                              <td className="px-2 py-1.5"><RateInput value={rates.concDebit} onChange={(val: number) => setRates({...rates, concDebit: val})} placeholder="0,00 %" isCompetitor /></td>
                                          </tr>
                                          <tr>
                                              <td className="px-2 py-1.5 text-center font-bold text-brand-gray-700">1x</td>
                                              <td className="px-2 py-1.5"><RateInput value={rates.creditSight} onChange={(val: number) => setRates({...rates, creditSight: val})} placeholder="0,00 %" /></td>
                                              <td className="px-2 py-1.5"><RateInput value={rates.concSight} onChange={(val: number) => setRates({...rates, concSight: val})} placeholder="0,00 %" isCompetitor /></td>
                                          </tr>
                                          {/* Installments */}
                                          {Object.keys(rates.installments).map((key) => {
                                              const i = parseInt(key);
                                              return (
                                                  <tr key={i} className="hover:bg-gray-50">
                                                      <td className="px-2 py-1 text-center font-medium text-gray-600">{i}x</td>
                                                      <td className="px-2 py-1"><RateInput value={rates.installments[i]} onChange={(val: number) => setRates({...rates, installments: {...rates.installments, [i]: val}})} /></td>
                                                      <td className="px-2 py-1"><RateInput value={rates.concInstallments[i]} onChange={(val: number) => setRates({...rates, concInstallments: {...rates.concInstallments, [i]: val}})} isCompetitor /></td>
                                                  </tr>
                                              );
                                          })}
                                      </tbody>
                                  </table>
                              </div>
                          )}
                          
                          <button onClick={handleCreateDemand} className="w-full bg-brand-gray-900 text-white py-3 rounded-xl font-bold shadow hover:bg-black transition-colors flex items-center justify-center gap-2 text-sm">
                              <Save className="w-4 h-4" /> Formalizar Proposta
                          </button>
                      </div>
                  )}

                  {analysisMode === 'SIMULATION' && context.product === 'Full' && (
                      <div className="space-y-4">
                          {/* Simulation inputs and table */}
                          <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Valor Venda</label>
                                  <input type="number" className="w-full border rounded p-2 text-sm" value={simulation.amount} onChange={e => setSimulation({...simulation, amount: parseFloat(e.target.value)})} />
                              </div>
                              <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Juros</label>
                                  <div className="flex bg-gray-100 rounded p-1">
                                      <button onClick={() => setSimulation({...simulation, interestPayer: 'EC'})} className={`flex-1 text-xs py-1 rounded ${simulation.interestPayer === 'EC' ? 'bg-white shadow' : ''}`}>Lojista</button>
                                      <button onClick={() => setSimulation({...simulation, interestPayer: 'CLIENT'})} className={`flex-1 text-xs py-1 rounded ${simulation.interestPayer === 'CLIENT' ? 'bg-white shadow' : ''}`}>Cliente</button>
                                  </div>
                              </div>
                          </div>
                          
                          <div className="rounded-lg border border-gray-200 overflow-hidden">
                              <table className="w-full text-xs text-left">
                                  <thead className="bg-gray-50 font-bold text-gray-600">
                                      <tr>
                                          <th className="px-4 py-2">Parc.</th>
                                          <th className="px-4 py-2 text-right">Taxa</th>
                                          <th className="px-4 py-2 text-right">Valor Final</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                      {['Debit', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18].map((rowType: any) => {
                                          const row = calculateRow(rowType);
                                          return (
                                              <tr key={rowType}>
                                                  <td className="px-4 py-2 font-bold">{row.label}</td>
                                                  <td className="px-4 py-2 text-right">{row.rate.toFixed(2)}%</td>
                                                  <td className="px-4 py-2 text-right font-mono font-bold text-brand-primary">
                                                      {row.value.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                                                  </td>
                                              </tr>
                                          )
                                      })}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default PricingPage;
