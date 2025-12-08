import React, { useState, useEffect, useRef } from 'react';
import { 
  BadgePercent, Hammer, Calculator, Bot, RefreshCw, CheckCircle2, 
  Wallet, Upload, FileText, Image as ImageIcon, X, PieChart, Save, Search, Building2, Globe, ArrowRight
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
    concDebit: 40,
    concSight: 20,
    conc2to6: 20,
    conc7to12: 10,
    conc13to18: 10,
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
  
  // Auto-Calculate Full Rates from Simple Inputs
  useEffect(() => {
      if (analysisMode === 'SIMULATION') return; // Don't auto-calc if in simulation mode (AI does it)
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

  const handlePercentageChange = (value: string, key: string, isInstallment = false) => {
      const raw = value.replace(/\D/g, '');
      const num = raw ? Math.min(100, parseInt(raw, 10) / 100) : 0;
      
      if (isInstallment) {
          const idx = parseInt(key);
          setRates(prev => ({
              ...prev,
              concInstallments: { ...prev.concInstallments, [idx]: num }
          }));
      } else {
          setRates(prev => ({ ...prev, [key]: num }));
      }
  };

  const formatPercent = (val: number) => {
      if (val === undefined || val === null) return '';
      return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getTotalConcentration = () => {
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
            // MODE: REVERSE ENGINEERING (Simulation Evidence)
            promptText = `
              Você é um especialista em Pricing e Matemática Financeira.
              Tarefa: Analisar a imagem de um simulador de maquininha (ex: Stone, Cielo, Infinity, Ton).
              
              CONTEXTO:
              O usuário informou que o VALOR BASE da transação original é: R$ ${simulation.amount}.
              
              OBJETIVO:
              1. Identifique as linhas de parcelamento na imagem (1x até 12x, 18x ou 21x).
              2. Para cada linha, extraia o "Valor Total a Pagar" ou "Valor da Parcela".
              3. REVERSE ENGINEERING: Calcule a TAXA IMPLÍCITA aplicada usando a fórmula:
                 - Se a imagem mostra "Valor Total": Taxa % = ((Valor Total / ${simulation.amount}) - 1) * 100.
                 - Se a imagem mostra "Valor Líquido": Taxa % = (1 - (Valor Líquido / ${simulation.amount})) * 100.
              
              RETORNO JSON OBRIGATÓRIO (Exemplo):
              {
                "installments": {
                    "1": 4.50,
                    "2": 5.10,
                    "12": 14.50
                }
              }
              Retorne APENAS o JSON válido.
            `;
        } else {
            // MODE: RATE TABLE EXTRACTION
            promptText = `
              Extraia a tabela de taxas da imagem.
              Retorne JSON: { "debit": number, "creditSight": number, "installments": { "2": number, ... "18": number } }
              Se estiver em formato "Fator", converta para Taxa (100 - Fator).
              Se estiver em faixas (ex: 2x-6x), repita o valor para cada parcela do intervalo.
            `;
        }

        // Use runWithRetry to handle 429 errors
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
                // Auto switch to Client Interest view as it's typical for simulators
                setSimulation(prev => ({...prev, interestPayer: 'CLIENT'}));
            } else {
                const { installments, ...baseRates } = parsed;
                setRates(prev => ({ ...prev, ...baseRates, installments: { ...prev.installments, ...installments } }));
            }
        }

    } catch (error) {
        console.error("Erro na análise IA:", error);
        alert("Não foi possível ler a evidência. Tente novamente ou verifique a imagem.");
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
          // Juros Lojista (Discount)
          const cost = amount * decimalRate;
          const net = amount - cost;
          return { label: type === 'Debit' ? 'Débito' : `${type}x`, rate, value: net, detail: cost };
      } else {
          // Juros Cliente (Surcharge)
          // Formula: Charged = Amount / (1 - rate)
          const charged = amount / (1 - decimalRate);
          const diff = charged - amount;
          return { label: type === 'Debit' ? 'Débito' : `${type}x`, rate, value: charged, detail: diff };
      }
  };

  return (
    <div className="flex flex-col space-y-8 max-w-6xl mx-auto pb-20">
      
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
                Pricing & Negociação
            </h1>
            <p className="text-brand-gray-500 mt-1">
                Simulador de taxas e análise de concorrência com IA.
            </p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* --- LEFT COLUMN: CONTEXT, SELECTOR & AI --- */}
          <div className="lg:col-span-1 space-y-6">
              
              {/* Context Form */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-brand-gray-100">
                  <h3 className="font-bold text-brand-gray-900 mb-4 flex items-center gap-2 text-sm uppercase">
                      <Wallet className="w-4 h-4 text-brand-primary" />
                      Contexto do Cliente
                  </h3>
                  
                  <div className="space-y-4">
                      {/* CNPJ / Search */}
                      <div className="relative" ref={searchRef}>
                          <label className="block text-xs font-bold text-brand-gray-500 mb-1">Buscar Cliente (CNPJ / ID / Nome)</label>
                          <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-brand-gray-400" />
                              <input 
                                  type="text" 
                                  className="w-full pl-10 border border-brand-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-primary transition-all focus:ring-1 focus:ring-brand-primary/20"
                                  placeholder="Digite para buscar..."
                                  value={context.identifier}
                                  onChange={handleSearchChange}
                              />
                          </div>
                          {/* Search Suggestions Dropdown */}
                          {showSuggestions && suggestions.length > 0 && (
                              <div className="absolute top-full left-0 right-0 bg-white border border-brand-gray-200 rounded-lg shadow-xl z-20 mt-1 max-h-48 overflow-y-auto animate-fade-in">
                                  {suggestions.map(c => (
                                      <div 
                                        key={c.id} 
                                        onClick={() => selectClient(c)}
                                        className="px-4 py-2 hover:bg-brand-gray-50 cursor-pointer border-b border-brand-gray-50 last:border-0"
                                      >
                                          <p className="text-sm font-bold text-brand-gray-800">{c.nomeEc}</p>
                                          <div className="flex justify-between items-center">
                                              <p className="text-xs text-brand-gray-500">ID: {c.id}</p>
                                              {c.leadMetadata?.revenuePotential && <span className="text-[10px] text-green-600 font-bold">R$ {c.leadMetadata.revenuePotential}</span>}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                          
                          {/* External Search Mock Button */}
                          <div className="flex justify-end mt-1">
                              <button 
                                onClick={handleReceitaSearch}
                                disabled={isSearchingReceita}
                                className="text-[10px] text-brand-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                              >
                                  {isSearchingReceita ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Globe className="w-3 h-3" />}
                                  Buscar na Receita Federal
                              </button>
                          </div>
                      </div>

                      {/* Display Name if selected */}
                      {context.clientName && (
                          <div className="bg-brand-gray-50 p-3 rounded-lg border border-brand-gray-200 flex items-center gap-2 animate-fade-in">
                              <Building2 className="w-5 h-5 text-brand-gray-400" />
                              <span className="text-sm font-bold text-brand-gray-800 truncate">{context.clientName}</span>
                          </div>
                      )}

                      {/* Financial Context */}
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                              <label className="block text-xs font-bold text-brand-gray-500 mb-1">Potencial (R$)</label>
                              <div className="relative">
                                  <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-brand-gray-400 text-xs">R$</span>
                                  <input 
                                      type="text" 
                                      className="w-full border border-brand-gray-300 rounded-lg pl-7 pr-2 py-2 text-sm outline-none focus:border-brand-primary"
                                      value={formatCurrencyValue(context.potentialRevenue)}
                                      onChange={e => handleCurrencyChange(e, 'potentialRevenue')}
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-brand-gray-500 mb-1">Mínimo Acordado</label>
                              <div className="relative">
                                  <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-brand-gray-400 text-xs">R$</span>
                                  <input 
                                      type="text" 
                                      className="w-full border border-brand-gray-300 rounded-lg pl-7 pr-2 py-2 text-sm outline-none focus:border-brand-primary"
                                      value={formatCurrencyValue(context.minAgreed)}
                                      onChange={e => handleCurrencyChange(e, 'minAgreed')}
                                  />
                              </div>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-brand-gray-500 mb-1">Adquirente Concorrente</label>
                          <select 
                              className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm outline-none bg-white"
                              value={context.competitor}
                              onChange={e => setContext({...context, competitor: e.target.value})}
                          >
                              <option value="">Selecione...</option>
                              <option value="Stone">Stone</option>
                              <option value="Cielo">Cielo</option>
                              <option value="Rede">Rede</option>
                              <option value="PagSeguro">PagSeguro</option>
                              <option value="Getnet">Getnet</option>
                              <option value="SafraPay">SafraPay</option>
                              <option value="Outro">Outro</option>
                          </select>
                      </div>
                  </div>
              </div>

              {/* MODE SELECTOR & AI READER */}
              <div className="bg-gradient-to-br from-brand-gray-900 to-brand-gray-800 p-5 rounded-xl shadow-lg text-white">
                  
                  {/* MAIN SELECTOR */}
                  <div className="mb-6">
                      <label className="block text-xs font-bold text-brand-gray-400 uppercase mb-2 tracking-wider">
                          Selecione o Tipo de Evidência
                      </label>
                      <div className="flex bg-black/30 p-1 rounded-xl">
                          <button 
                              onClick={() => setAnalysisMode('RATE_TABLE')}
                              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2
                                ${analysisMode === 'RATE_TABLE' ? 'bg-brand-primary text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}
                              `}
                          >
                              <FileText className="w-4 h-4" />
                              Taxas (Tabela)
                          </button>
                          <button 
                              onClick={() => setAnalysisMode('SIMULATION')}
                              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2
                                ${analysisMode === 'SIMULATION' ? 'bg-brand-primary text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}
                              `}
                          >
                              <Calculator className="w-4 h-4" />
                              Simulação (Valor)
                          </button>
                      </div>
                  </div>

                  {/* AI Upload Area */}
                  <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-sm flex items-center gap-2">
                          <Bot className="w-4 h-4 text-brand-light" />
                          Leitor Inteligente IA
                      </h3>
                      {isAnalyzing && <RefreshCw className="w-4 h-4 animate-spin text-brand-gray-400" />}
                  </div>
                  
                  <div className="mb-4">
                      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple accept="image/*,application/pdf" />
                      <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full bg-white/10 border border-dashed border-white/30 rounded-lg p-4 flex flex-col items-center justify-center hover:bg-white/20 transition-colors text-center"
                      >
                          <Upload className="w-6 h-6 text-brand-gray-400 mb-1" />
                          <span className="text-xs text-gray-300">
                              {analysisMode === 'RATE_TABLE' 
                                ? 'Anexar Foto da Tabela' 
                                : 'Anexar Print do Simulador'}
                          </span>
                      </button>
                      {evidenceFiles.length > 0 && <div className="mt-2 text-xs text-brand-primary text-center">{evidenceFiles.length} arquivo(s) selecionado(s)</div>}
                  </div>

                  <button 
                      onClick={handleAnalyzeEvidence}
                      disabled={isAnalyzing || evidenceFiles.length === 0}
                      className="w-full bg-brand-primary hover:bg-brand-dark text-white py-2 rounded-lg font-bold text-xs shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      {isAnalyzing ? 'Processando Evidência...' : 'Extrair Dados com IA'}
                  </button>
              </div>
          </div>

          {/* --- RIGHT COLUMN: DYNAMIC VIEW BASED ON SELECTOR --- */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-brand-gray-100 flex flex-col overflow-hidden">
              
              {/* Header based on Mode */}
              <div className="p-4 border-b border-brand-gray-100 flex flex-col sm:flex-row items-center justify-between bg-brand-gray-50 gap-3">
                  <h3 className="font-bold text-brand-gray-900 flex items-center gap-2">
                      {analysisMode === 'RATE_TABLE' ? <Hammer className="w-5 h-5 text-brand-primary"/> : <Calculator className="w-5 h-5 text-brand-primary"/>}
                      {analysisMode === 'RATE_TABLE' ? 'Definição de Taxas (Input)' : 'Simulador por Valor (Reverso)'}
                  </h3>
                  <div className="flex bg-white rounded-lg border border-brand-gray-200 p-0.5">
                      <button 
                          onClick={() => setContext({...context, product: 'Full'})}
                          className={`px-3 py-1 text-xs font-bold rounded transition-colors ${context.product === 'Full' ? 'bg-green-100 text-green-700' : 'text-brand-gray-500'}`}
                      >Full</button>
                      <button 
                          onClick={() => setContext({...context, product: 'Simples'})}
                          className={`px-3 py-1 text-xs font-bold rounded transition-colors ${context.product === 'Simples' ? 'bg-blue-100 text-blue-700' : 'text-brand-gray-500'}`}
                      >Simples</button>
                  </div>
              </div>

              <div className="p-6 flex-1 bg-brand-gray-50/30">
                  
                  {/* VIEW A: RATE TABLE INPUT */}
                  {analysisMode === 'RATE_TABLE' && (
                      <div className="animate-fade-in space-y-4">
                          <div className={`p-3 rounded-lg border flex items-center justify-between shadow-sm transition-colors ${isConcValid ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                              <div className="flex items-center gap-2 text-sm font-bold">
                                  <PieChart className="w-4 h-4" />
                                  Concentração Total
                              </div>
                              <span className="font-mono text-lg font-bold">{totalConc?.toFixed(2) || '0.00'}%</span>
                          </div>

                          {context.product === 'Simples' ? (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  {[
                                    { label: 'Débito', key: 'debit', concKey: 'concDebit' },
                                    { label: 'Crédito 1x', key: 'creditSight', concKey: 'concSight' },
                                    { label: '2x-6x', key: 'credit2to6', concKey: 'conc2to6' },
                                    { label: '7x-12x', key: 'credit7to12', concKey: 'conc7to12' },
                                    { label: '13x-18x', key: 'credit13to18', concKey: 'conc13to18' },
                                    { label: 'Antecipação', key: 'anticipation', highlight: true }
                                  ].map((field) => (
                                      <div key={field.key} className={`bg-white p-3 rounded-lg border ${field.highlight ? 'border-yellow-300 ring-2 ring-yellow-100' : 'border-brand-gray-200'}`}>
                                          <label className="block text-[10px] font-bold uppercase mb-1 text-brand-gray-500">{field.label}</label>
                                          <div className="relative mb-2">
                                              <input 
                                                  type="number" step="0.01"
                                                  className="w-full text-sm font-bold text-brand-gray-900 outline-none"
                                                  value={(rates as any)[field.key] ?? ''}
                                                  onChange={e => setRates({...rates, [field.key]: parseFloat(e.target.value)})}
                                                  placeholder="0.00"
                                              />
                                              <span className="absolute right-0 top-0 text-xs text-brand-gray-400">%</span>
                                          </div>
                                          {field.concKey && (
                                              <div className="relative border-t border-brand-gray-100 pt-2">
                                                  <label className="block text-[9px] text-brand-gray-400 uppercase">Conc.</label>
                                                  <div className="flex items-center">
                                                      <input 
                                                          type="text"
                                                          className="w-full text-xs font-medium text-brand-gray-700 outline-none"
                                                          value={formatPercent((rates as any)[field.concKey])}
                                                          onChange={e => handlePercentageChange(e.target.value, field.concKey!)}
                                                          placeholder="0,00"
                                                      />
                                                      <span className="text-[10px] text-brand-gray-400">%</span>
                                                  </div>
                                              </div>
                                          )}
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="bg-white rounded-xl border border-brand-gray-200 overflow-hidden shadow-sm">
                                  <div className="overflow-x-auto">
                                      <table className="w-full text-sm text-left">
                                          <thead className="bg-green-50 text-green-800 font-bold uppercase text-xs border-b border-green-100">
                                              <tr>
                                                  <th className="px-6 py-3">Parcela</th>
                                                  <th className="px-6 py-3 text-right">Taxa (%)</th>
                                                  <th className="px-6 py-3 text-right">Conc. (%)</th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-brand-gray-50">
                                              <tr className="hover:bg-brand-gray-50">
                                                  <td className="px-6 py-2 font-medium">Débito</td>
                                                  <td className="px-6 py-2 text-right"><input type="number" className="w-20 text-right font-bold outline-none" value={rates.debit ?? ''} onChange={e => setRates({...rates, debit: parseFloat(e.target.value)})} /> %</td>
                                                  <td className="px-6 py-2 text-right"><input type="text" className="w-20 text-right outline-none text-blue-600 font-bold" value={formatPercent(rates.concDebit)} onChange={e => handlePercentageChange(e.target.value, 'concDebit')} /> %</td>
                                              </tr>
                                              <tr className="hover:bg-brand-gray-50">
                                                  <td className="px-6 py-2 font-medium">1x</td>
                                                  <td className="px-6 py-2 text-right"><input type="number" className="w-20 text-right font-bold outline-none" value={rates.creditSight ?? ''} onChange={e => setRates({...rates, creditSight: parseFloat(e.target.value)})} /> %</td>
                                                  <td className="px-6 py-2 text-right"><input type="text" className="w-20 text-right outline-none text-blue-600 font-bold" value={formatPercent(rates.concSight)} onChange={e => handlePercentageChange(e.target.value, 'concSight')} /> %</td>
                                              </tr>
                                              {Array.from({length: 17}, (_, i) => i + 2).map(i => (
                                                  <tr key={i} className="hover:bg-brand-gray-50">
                                                      <td className="px-6 py-2 font-medium">{i}x</td>
                                                      <td className="px-6 py-2 text-right"><input type="number" step="0.01" className="w-20 text-right font-bold outline-none" value={rates.installments[i]?.toFixed(2) ?? ''} onChange={e => setRates(p => ({...p, installments: {...p.installments, [i]: parseFloat(e.target.value)}}))} /> %</td>
                                                      <td className="px-6 py-2 text-right"><input type="text" className="w-20 text-right outline-none text-blue-600 font-bold" value={formatPercent(rates.concInstallments[i] || 0)} onChange={e => handlePercentageChange(e.target.value, i.toString(), true)} /> %</td>
                                                  </tr>
                                              ))}
                                          </tbody>
                                      </table>
                                  </div>
                              </div>
                          )}
                      </div>
                  )}

                  {/* VIEW B: SIMULATION (REVERSE ENGINEERING) */}
                  {analysisMode === 'SIMULATION' && (
                      <div className="animate-fade-in flex flex-col h-full space-y-4">
                          
                          {/* Configuration Bar */}
                          <div className="bg-white p-4 rounded-xl border border-brand-gray-200 flex flex-col md:flex-row gap-4 items-center sticky top-0 z-10 shadow-sm">
                              <div className="flex-1 w-full">
                                  <label className="block text-xs font-bold text-brand-primary uppercase mb-1 flex items-center gap-1">
                                      Valor da Venda (Base)
                                      <span className="bg-brand-primary text-white text-[9px] px-1.5 rounded-full">Obrigatório p/ IA</span>
                                  </label>
                                  <div className="relative">
                                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-gray-400 font-bold">R$</span>
                                      <input 
                                          type="number"
                                          className="w-full pl-10 border-2 border-brand-primary/20 rounded-lg py-2.5 text-lg font-bold text-brand-gray-900 outline-none focus:border-brand-primary transition-colors bg-brand-primary/5"
                                          value={simulation.amount}
                                          onChange={e => setSimulation({...simulation, amount: parseFloat(e.target.value)})}
                                      />
                                  </div>
                              </div>
                              
                              <div className="w-full md:w-auto">
                                  <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Modo de Cálculo</label>
                                  <div className="flex bg-brand-gray-100 p-1 rounded-lg">
                                      <button 
                                          onClick={() => setSimulation({...simulation, interestPayer: 'EC'})}
                                          className={`px-4 py-2 text-xs font-bold rounded transition-all ${simulation.interestPayer === 'EC' ? 'bg-white text-brand-gray-900 shadow-sm' : 'text-brand-gray-500'}`}
                                      >
                                          Lojista (Líquido)
                                      </button>
                                      <button 
                                          onClick={() => setSimulation({...simulation, interestPayer: 'CLIENT'})}
                                          className={`px-4 py-2 text-xs font-bold rounded transition-all ${simulation.interestPayer === 'CLIENT' ? 'bg-white text-brand-gray-900 shadow-sm' : 'text-brand-gray-500'}`}
                                      >
                                          Cliente (Repasse)
                                      </button>
                                  </div>
                              </div>
                          </div>

                          {/* Simulation Result Table */}
                          <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden flex-1">
                              <div className="overflow-x-auto">
                                  <table className="w-full text-sm text-left">
                                      <thead className="bg-brand-gray-900 text-white font-bold uppercase text-xs">
                                          <tr>
                                              <th className="px-6 py-4">Parcela</th>
                                              <th className="px-6 py-4 text-center">Taxa (%)</th>
                                              <th className="px-6 py-4 text-right">
                                                  {simulation.interestPayer === 'EC' ? 'Líquido a Receber' : 'Valor a Cobrar'}
                                              </th>
                                              <th className="px-6 py-4 text-right">
                                                  {simulation.interestPayer === 'EC' ? 'Desconto (Custo)' : 'Acréscimo'}
                                              </th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-brand-gray-100 font-medium text-brand-gray-700">
                                          {['Debit', 1, ...Array.from({length: 17}, (_, i) => i + 2)].map((item) => {
                                              const rowData = calculateRow(item as any);
                                              return (
                                                  <tr key={item} className="hover:bg-brand-gray-50 transition-colors">
                                                      <td className="px-6 py-3 font-bold text-brand-gray-900">
                                                          {rowData.label}
                                                      </td>
                                                      <td className="px-6 py-3 text-center">
                                                          <span className="bg-brand-gray-100 text-brand-gray-600 px-2 py-1 rounded text-xs font-bold">
                                                              {rowData.rate?.toFixed(2) ?? '0.00'}%
                                                          </span>
                                                      </td>
                                                      <td className="px-6 py-3 text-right font-mono text-brand-gray-900 font-bold">
                                                          {(rowData.value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                      </td>
                                                      <td className="px-6 py-3 text-right font-mono text-xs">
                                                          <span className={simulation.interestPayer === 'EC' ? 'text-red-600' : 'text-blue-600'}>
                                                              {simulation.interestPayer === 'EC' ? '-' : '+'} 
                                                              {(rowData.detail ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                          </span>
                                                      </td>
                                                  </tr>
                                              );
                                          })}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      </div>
                  )}

                  {/* ACTION: CREATE DEMAND */}
                  <div className="flex justify-end pt-4">
                      <button 
                          onClick={handleCreateDemand}
                          className="bg-brand-primary text-white hover:bg-brand-dark px-6 py-3 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 group"
                      >
                          <Save className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                          Formalizar Proposta
                      </button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default PricingPage;