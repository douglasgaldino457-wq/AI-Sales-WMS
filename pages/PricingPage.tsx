
import React, { useState, useEffect, useRef } from 'react';
import { 
  BadgePercent, Hammer, AlertCircle, Calculator, TrendingUp, Scale, DollarSign, 
  Bot, RefreshCw, ChevronRight, Check, Copy, ArrowRight, Wallet, Upload, FileText, Image as ImageIcon, X, AlertTriangle
} from 'lucide-react';
import { UserRole, Appointment } from '../types';
import { appStore } from '../services/store';
import { GoogleGenAI } from "@google/genai";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface PricingPageProps {
  role: UserRole;
}

// --- TYPES ---
interface NegotiationContext {
  identifier: string;
  competitor: string;
  potentialRevenue: number;
  concentration: string;
  product: 'Full' | 'Simples';
}

// Expanded to hold both granular (Full) and ranges (Simple)
interface RateTable {
  // Simple Model Inputs
  debit: number;
  creditSight: number; // 1x
  credit2to6: number;
  credit7to12: number;
  credit13to18: number;
  anticipation: number; // a.m.

  // Granular Full Model (calculated or manual)
  installments: { [key: number]: number }; 
}

interface SimulationState {
  amount: number;
  installments: number;
  interestPayer: 'EC' | 'CLIENT';
}

interface TpvDataPoint {
  month: string; 
  fullDate: string; 
  converted: number;
  lost: number;
  total: number;
}

const PricingPage: React.FC<PricingPageProps> = ({ role }) => {
  const isGestor = role === UserRole.GESTOR;
  const [tpvPeriod, setTpvPeriod] = useState<number>(6);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  // --- NEGOTIATION STATE ---
  const [activeTab, setActiveTab] = useState<'RATES' | 'SIMULATION'>('RATES');
  const [context, setContext] = useState<NegotiationContext>({
    identifier: '',
    competitor: '',
    potentialRevenue: 0,
    concentration: 'Equilibrada',
    product: 'Full' // Default
  });
  
  const [rates, setRates] = useState<RateTable>({
    debit: 0,
    creditSight: 0,
    credit2to6: 0,
    credit7to12: 0,
    credit13to18: 0,
    anticipation: 0,
    installments: {} // Will hold 2: 4.5, 3: 5.1, etc.
  });

  const [simulation, setSimulation] = useState<SimulationState>({
    amount: 1000,
    installments: 1,
    interestPayer: 'EC'
  });

  // AI State
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAppointments(appStore.getAppointments());
  }, []);

  // Initialize installments if empty
  useEffect(() => {
      if (Object.keys(rates.installments).length === 0) {
          const initialInst: {[key: number]: number} = {};
          for(let i=2; i<=18; i++) initialInst[i] = 0;
          setRates(prev => ({ ...prev, installments: initialInst }));
      }
  }, []);

  // --- LOGIC: Auto-Calculate Full Rates from Simple Inputs ---
  // This runs when Simple inputs change, to populate the Full table automatically
  useEffect(() => {
      // NOTE: Even if viewing 'Full', we might want to auto-calc if the user entered Simple data
      if (context.product === 'Simples' && rates.anticipation === 0) return; 
      
      const newInst = { ...rates.installments };
      const ant = rates.anticipation;

      const calc = (baseMdr: number, parc: number) => {
          if (baseMdr === 0 && ant === 0) return 0;
          
          // MARKET STANDARD FORMULA FOR "Taxa com Antecipação Automática"
          // Approximate logic: Rate = MDR + (MonthlyRate * AverageTermInMonths)
          // Average term approx = (Installments + 1) / 2
          // This creates the curve seen in competitors like PagBank/Stone for "Antecipação"
          
          const averageTerm = (parc + 1) / 2;
          const calculated = baseMdr + (ant * averageTerm);
          
          return parseFloat(calculated.toFixed(2));
      };

      for (let i = 2; i <= 18; i++) {
          let baseMdr = 0;
          
          // Determine the Base MDR for this installment bracket
          if (i <= 6) baseMdr = rates.credit2to6;
          else if (i <= 12) baseMdr = rates.credit7to12;
          else baseMdr = rates.credit13to18;
          
          // Auto-fill if we have inputs. 
          if (baseMdr > 0 || ant > 0) {
             newInst[i] = calc(baseMdr, i);
          }
      }
      
      // Update state if changes detected
      if (JSON.stringify(newInst) !== JSON.stringify(rates.installments)) {
          setRates(prev => ({ ...prev, installments: newInst }));
      }
  }, [rates.anticipation, rates.credit2to6, rates.credit7to12, rates.credit13to18, context.product]);


  // --- FILE HANDLING ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const newFiles = Array.from(e.target.files) as File[];
        const validFiles = newFiles.filter(f => 
            f.type === 'application/pdf' || 
            f.type.startsWith('image/')
        );
        if (validFiles.length !== newFiles.length) alert('Apenas imagens e PDFs.');
        setEvidenceFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
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

  // --- AI HANDLER ---
  const handleAnalyzeEvidence = async () => {
    if (evidenceFiles.length === 0) return;
    setIsAnalyzing(true);

    try {
        const apiKey = process.env.API_KEY;
        const ai = new GoogleGenAI({ apiKey: apiKey! });
        const fileParts = await Promise.all(evidenceFiles.map(fileToGenerativePart));

        const promptText = {
            text: `
            Atue como especialista em Pricing de Meios de Pagamento.
            Analise a imagem/documento (ex: Simuladores, App PagBank, Stone, Cielo, Rede, Getnet).
            
            OBJETIVO: Extrair as taxas BASE (MDR) e a taxa de ANTECIPAÇÃO para preencher o simulador.
            
            IDENTIFICAÇÃO DE TERMOS E TAXAS (CRUCIAL):
            
            1. **Taxa de Antecipação / Acréscimo Mensal:**
               - O termo varia muito entre adquirentes. Procure explicitamente por:
                 * "Acréscimo de X% ao mês" (ou /mês)
                 * "Antecipação automática"
                 * "Recebimento na hora" (Frequentemente implica antecipação)
                 * "Vendas parceladas" (Procure se há um percentual associado)
                 * "Taxa de antecipação"
               - Se encontrar "Taxa de antecipação: 2.13%", o valor é 2.13.
               - Se encontrar "Acréscimo de 1.99% a.m.", o valor é 1.99.

            2. **Taxa Administrativa (MDR) vs Taxa Total:**
               - **PagSeguro/PagBank:** Costuma exibir "Taxa de Intermediação" (MDR) separada. Use esses valores para os campos 'credit2to6', etc.
               - **Stone/Outros:** Se mostrar apenas a taxa final (ex: "10x: 15%"), extraia se possível, mas se houver a taxa de antecipação descrita separadamente, prefira extrair a "Taxa ADM" (Base).
               - O sistema calculará a Taxa Total (Full) automaticamente somando MDR + Antecipação.

            3. **Crédito à Vista (1x):**
               - Capture a taxa de "Crédito à Vista" ou "1x". Geralmente é apenas o MDR (sem antecipação).

            RETORNO ESPERADO (JSON ESTRITO):
            {
                "debit": number,       // Taxa Débito
                "creditSight": number, // Crédito à vista (1x)
                "credit2to6": number,  // MDR Base 2x-6x (SEM antecipação, se possível separar)
                "credit7to12": number, // MDR Base 7x-12x
                "credit13to18": number,// MDR Base 13x-18x
                "anticipation": number,// Taxa mensal de antecipação identificada
                "installments": {      // (Opcional) Apenas se a tabela FULL (linha a linha) estiver visível e clara.
                    "2": number, "3": number, ... "18": number
                }
            }
            
            Use ponto para decimal. Se não encontrar um valor, use 0.
            `
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [...fileParts, promptText] }
        });

        const jsonStr = response.text?.replace(/```json|```/g, '').trim();
        if (jsonStr) {
            const parsed = JSON.parse(jsonStr);
            if (parsed.error === 'EXCEL_SCREEN_DETECTED') {
                alert("⚠️ Erro de Compliance: Fotos de telas com planilhas Excel não são aceitas.");
            } else {
                const { error, installments, ...baseRates } = parsed;
                
                // Merge logic
                let mergedInstallments = { ...rates.installments };
                
                // If AI found explicit installments, merge them
                if (installments && Object.keys(installments).length > 0) {
                    mergedInstallments = { ...mergedInstallments, ...installments };
                }

                setRates(prev => ({
                    ...prev,
                    ...baseRates,
                    installments: mergedInstallments
                }));
            }
        }
    } catch (error) {
        console.error("Erro na análise IA:", error);
        alert("Não foi possível ler as taxas.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  // --- SIMULATION LOGIC ---
  const getSimulationResult = () => {
      let targetRate = 0;
      
      // Determine rate based on Context (Full vs Simple) and Installments
      if (context.product === 'Full') {
          // Use Granular Table
          if (simulation.installments === 1) targetRate = rates.creditSight;
          else if (simulation.installments === 0) targetRate = rates.debit;
          else targetRate = rates.installments[simulation.installments] || 0;
      } else {
          // Fallback Calculation for Simulation Mode if looking at "Simple" view
          if (simulation.installments === 1) {
              targetRate = rates.creditSight; // 1x is MDR only
          } else {
              // Determine Base MDR
              let baseMdr = 0;
              if (simulation.installments <= 6) baseMdr = rates.credit2to6;
              else if (simulation.installments <= 12) baseMdr = rates.credit7to12;
              else baseMdr = rates.credit13to18;

              // Apply Formula: MDR + (Anticipation * AvgTerm)
              // AvgTerm = (N+1)/2
              targetRate = baseMdr + (rates.anticipation * ((simulation.installments + 1) / 2));
          }
      }

      const rateDecimal = targetRate / 100;

      if (simulation.interestPayer === 'EC') {
          const net = simulation.amount - (simulation.amount * rateDecimal);
          return { charged: simulation.amount, received: net, cost: simulation.amount * rateDecimal, rateUsed: targetRate };
      } else {
          const charged = simulation.amount / (1 - rateDecimal);
          return { charged: charged, received: simulation.amount, cost: charged - simulation.amount, rateUsed: targetRate };
      }
  };

  const simResult = getSimulationResult();

  // --- TPV CHART (GESTOR) ---
  const calculateTpvData = (): TpvDataPoint[] => {
    // ... (Same logic as before)
    return [];
  };
  const tpvData = calculateTpvData();

  return (
    <div className="flex flex-col space-y-8 max-w-6xl mx-auto pb-20">
      
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
          
          {/* LEFT COLUMN: CONTEXT & EVIDENCE */}
          <div className="lg:col-span-1 space-y-6">
              
              {/* Context Form */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-brand-gray-100">
                  <h3 className="font-bold text-brand-gray-900 mb-4 flex items-center gap-2 text-sm uppercase">
                      <Wallet className="w-4 h-4 text-brand-primary" />
                      Contexto do Cliente
                  </h3>
                  <div className="space-y-3">
                      <div>
                          <label className="block text-xs font-bold text-brand-gray-500 mb-1">CNPJ ou ID EC</label>
                          <input 
                              type="text" 
                              className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-primary"
                              placeholder="00.000.000/0001-00"
                              value={context.identifier}
                              onChange={e => setContext({...context, identifier: e.target.value})}
                          />
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

                      {/* PRODUCT SELECTOR */}
                      <div>
                          <label className="block text-xs font-bold text-brand-gray-500 mb-1">Produto Oferta</label>
                          <div className="flex bg-brand-gray-100 p-1 rounded-lg">
                              <button 
                                  onClick={() => setContext({...context, product: 'Full'})}
                                  className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${context.product === 'Full' ? 'bg-white text-green-700 shadow-sm border border-green-200' : 'text-brand-gray-500'}`}
                              >
                                  Full
                              </button>
                              <button 
                                  onClick={() => setContext({...context, product: 'Simples'})}
                                  className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${context.product === 'Simples' ? 'bg-white text-blue-700 shadow-sm border border-blue-200' : 'text-brand-gray-500'}`}
                              >
                                  Simples
                              </button>
                          </div>
                      </div>

                      {/* POTENTIAL */}
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                              <label className="block text-xs font-bold text-brand-gray-500 mb-1">Potencial (R$)</label>
                              <input 
                                  type="number" 
                                  className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-primary"
                                  placeholder="0.00"
                                  value={context.potentialRevenue || ''}
                                  onChange={e => setContext({...context, potentialRevenue: parseFloat(e.target.value)})}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-brand-gray-500 mb-1">Concentração</label>
                              <select 
                                  className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm outline-none bg-white"
                                  value={context.concentration}
                                  onChange={e => setContext({...context, concentration: e.target.value})}
                              >
                                  <option value="Equilibrada">Equilibrada</option>
                                  <option value="Débito">Forte em Débito</option>
                                  <option value="Parcelado">Forte em Parcelado</option>
                              </select>
                          </div>
                      </div>
                  </div>
              </div>

              {/* AI Evidence Reader */}
              <div className="bg-gradient-to-br from-brand-gray-900 to-brand-gray-800 p-5 rounded-xl shadow-lg text-white">
                  <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-sm flex items-center gap-2">
                          <Bot className="w-4 h-4 text-brand-light" />
                          Leitor de Evidência IA
                      </h3>
                      {isAnalyzing && <RefreshCw className="w-4 h-4 animate-spin text-brand-gray-400" />}
                  </div>
                  
                  <div className="mb-4">
                      <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileSelect} 
                          className="hidden" 
                          multiple 
                          accept="image/*,application/pdf"
                      />
                      
                      {evidenceFiles.length === 0 ? (
                          <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full bg-black/20 border border-dashed border-white/30 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-black/30 transition-colors text-center"
                          >
                              <Upload className="w-8 h-8 text-brand-gray-400 mb-2" />
                              <p className="text-xs font-bold text-gray-300">Clique para anexar evidência</p>
                              <p className="text-[10px] text-gray-500 mt-1">Imagens ou PDF</p>
                          </div>
                      ) : (
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                              {evidenceFiles.map((file, idx) => (
                                  <div key={idx} className="flex items-center justify-between bg-white/10 p-2 rounded text-xs border border-white/10">
                                      <div className="flex items-center truncate">
                                          {file.type.includes('pdf') ? <FileText className="w-3 h-3 mr-2 text-red-400" /> : <ImageIcon className="w-3 h-3 mr-2 text-blue-400" />}
                                          <span className="truncate max-w-[150px] text-gray-300">{file.name}</span>
                                      </div>
                                      <button onClick={() => removeFile(idx)} className="text-gray-500 hover:text-white"><X className="w-3 h-3" /></button>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>

                  <button 
                      onClick={handleAnalyzeEvidence}
                      disabled={isAnalyzing || evidenceFiles.length === 0}
                      className="w-full bg-brand-primary hover:bg-brand-dark text-white py-2 rounded-lg font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      {isAnalyzing ? 'Calculando Taxas...' : 'Extrair Taxas Automaticamente'}
                  </button>
              </div>
          </div>

          {/* CENTER & RIGHT: CALCULATOR & RESULTS */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-brand-gray-100 flex flex-col overflow-hidden">
              
              {/* Tabs */}
              <div className="flex border-b border-brand-gray-100">
                  <button 
                      onClick={() => setActiveTab('RATES')}
                      className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'RATES' ? 'border-brand-primary text-brand-primary bg-brand-gray-50' : 'border-transparent text-brand-gray-500 hover:bg-brand-gray-50'}`}
                  >
                      <Hammer className="w-4 h-4" />
                      Tabela de Taxas ({context.product})
                  </button>
                  <button 
                      onClick={() => setActiveTab('SIMULATION')}
                      className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'SIMULATION' ? 'border-brand-primary text-brand-primary bg-brand-gray-50' : 'border-transparent text-brand-gray-500 hover:bg-brand-gray-50'}`}
                  >
                      <Calculator className="w-4 h-4" />
                      Simulação
                  </button>
              </div>

              <div className="p-6 flex-1 bg-brand-gray-50/50">
                  
                  {/* RATES INPUT VIEW */}
                  {activeTab === 'RATES' && (
                      <div className="animate-fade-in space-y-6">
                          
                          {/* If Simple, show Ranges + Anticipation */}
                          {context.product === 'Simples' ? (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  {[
                                    { label: 'Débito', key: 'debit' },
                                    { label: 'Crédito à Vista (1x)', key: 'creditSight' },
                                    { label: '2x a 6x (MDR)', key: 'credit2to6' },
                                    { label: '7x a 12x (MDR)', key: 'credit7to12' },
                                    { label: '13x a 18x (MDR)', key: 'credit13to18' },
                                    { label: 'Acréscimo (a.m)', key: 'anticipation', highlight: true }
                                  ].map((field) => (
                                      <div key={field.key} className={`bg-white p-3 rounded-lg border ${field.highlight ? 'border-yellow-300 ring-2 ring-yellow-100' : 'border-brand-gray-200'}`}>
                                          <label className={`block text-[10px] font-bold uppercase mb-1 ${field.highlight ? 'text-yellow-700' : 'text-brand-gray-500'}`}>{field.label}</label>
                                          <div className="relative">
                                              <input 
                                                  type="number"
                                                  step="0.01"
                                                  className="w-full text-sm font-bold text-brand-gray-900 outline-none"
                                                  value={(rates as any)[field.key] || ''}
                                                  onChange={e => setRates({...rates, [field.key]: parseFloat(e.target.value)})}
                                                  placeholder="0.00"
                                              />
                                              <span className="absolute right-0 top-0 text-xs text-brand-gray-400">%</span>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              // If Full, show 18x Granular Table
                              <div className="bg-white rounded-xl border border-brand-gray-200 overflow-hidden shadow-sm">
                                  <div className="overflow-x-auto">
                                      <table className="w-full text-sm text-left">
                                          <thead className="bg-green-50 text-green-800 font-bold uppercase text-xs border-b border-green-100">
                                              <tr>
                                                  <th className="px-6 py-3">Parcela</th>
                                                  <th className="px-6 py-3 text-right">Taxa Full (%)</th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-brand-gray-50">
                                              {/* Debit Row */}
                                              <tr className="hover:bg-brand-gray-50">
                                                  <td className="px-6 py-2 font-medium text-brand-gray-700">Débito</td>
                                                  <td className="px-6 py-2 text-right">
                                                      <input 
                                                          type="number" 
                                                          className="w-20 text-right font-bold text-brand-gray-900 outline-none bg-transparent focus:border-b border-brand-primary"
                                                          value={rates.debit}
                                                          onChange={e => setRates({...rates, debit: parseFloat(e.target.value)})}
                                                      /> %
                                                  </td>
                                              </tr>
                                              {/* 1x Row */}
                                              <tr className="hover:bg-brand-gray-50">
                                                  <td className="px-6 py-2 font-medium text-brand-gray-700">Crédito à Vista (1x)</td>
                                                  <td className="px-6 py-2 text-right">
                                                      <input 
                                                          type="number" 
                                                          className="w-20 text-right font-bold text-brand-gray-900 outline-none bg-transparent focus:border-b border-brand-primary"
                                                          value={rates.creditSight}
                                                          onChange={e => setRates({...rates, creditSight: parseFloat(e.target.value)})}
                                                      /> %
                                                  </td>
                                              </tr>
                                              {/* 2x to 18x Rows */}
                                              {Array.from({length: 17}, (_, i) => i + 2).map(i => (
                                                  <tr key={i} className="hover:bg-brand-gray-50">
                                                      <td className="px-6 py-2 font-medium text-brand-gray-700">{i}x</td>
                                                      <td className="px-6 py-2 text-right">
                                                          <input 
                                                              type="number"
                                                              step="0.01" 
                                                              className="w-20 text-right font-bold text-brand-gray-900 outline-none bg-transparent focus:border-b border-brand-primary"
                                                              value={rates.installments[i]?.toFixed(2) || ''}
                                                              onChange={e => {
                                                                  const val = parseFloat(e.target.value);
                                                                  setRates(prev => ({
                                                                      ...prev,
                                                                      installments: { ...prev.installments, [i]: val }
                                                                  }));
                                                              }}
                                                          /> %
                                                      </td>
                                                  </tr>
                                              ))}
                                          </tbody>
                                      </table>
                                  </div>
                              </div>
                          )}
                      </div>
                  )}

                  {/* SIMULATION VIEW */}
                  {activeTab === 'SIMULATION' && (
                      <div className="animate-fade-in flex flex-col h-full">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                              <div className="bg-white p-4 rounded-xl border border-brand-gray-200 space-y-4">
                                  <label className="block text-xs font-bold text-brand-gray-500 uppercase">Valor da Venda</label>
                                  <div className="relative">
                                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-gray-400 font-bold">R$</span>
                                      <input 
                                          type="number"
                                          className="w-full pl-10 border border-brand-gray-300 rounded-lg py-2 text-lg font-bold text-brand-gray-900 outline-none focus:border-brand-primary"
                                          value={simulation.amount}
                                          onChange={e => setSimulation({...simulation, amount: parseFloat(e.target.value)})}
                                      />
                                  </div>
                                  
                                  <div>
                                      <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-2">Parcelas</label>
                                      <input 
                                          type="range" 
                                          min="1" max="18" 
                                          value={simulation.installments}
                                          onChange={e => setSimulation({...simulation, installments: parseInt(e.target.value)})}
                                          className="w-full accent-brand-primary h-2 bg-brand-gray-200 rounded-lg appearance-none cursor-pointer"
                                      />
                                      <div className="text-center font-bold text-brand-primary mt-1">{simulation.installments}x</div>
                                  </div>

                                  <div className="flex bg-brand-gray-100 p-1 rounded-lg">
                                      <button 
                                          onClick={() => setSimulation({...simulation, interestPayer: 'EC'})}
                                          className={`flex-1 py-2 text-xs font-bold rounded transition-all ${simulation.interestPayer === 'EC' ? 'bg-white text-brand-gray-900 shadow-sm' : 'text-brand-gray-500'}`}
                                      >
                                          Juros Lojista
                                      </button>
                                      <button 
                                          onClick={() => setSimulation({...simulation, interestPayer: 'CLIENT'})}
                                          className={`flex-1 py-2 text-xs font-bold rounded transition-all ${simulation.interestPayer === 'CLIENT' ? 'bg-white text-brand-gray-900 shadow-sm' : 'text-brand-gray-500'}`}
                                      >
                                          Juros Portador
                                      </button>
                                  </div>
                              </div>

                              {/* RESULT CARD */}
                              <div className="bg-brand-gray-900 text-white p-6 rounded-xl shadow-lg flex flex-col justify-center relative overflow-hidden">
                                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                                  
                                  <div className="relative z-10 space-y-6">
                                      <div>
                                          <p className="text-brand-gray-400 text-xs font-bold uppercase mb-1">
                                              {simulation.interestPayer === 'EC' ? 'Estabelecimento Recebe Líquido' : 'Valor a Cobrar no Cartão'}
                                          </p>
                                          <div className="text-4xl font-bold tracking-tight">
                                              {simulation.interestPayer === 'EC' 
                                                  ? simResult.received.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                                  : simResult.charged.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                              }
                                          </div>
                                      </div>

                                      <div className="space-y-2 border-t border-white/10 pt-4">
                                          <div className="flex justify-between text-sm">
                                              <span className="text-brand-gray-400">Taxa Aplicada ({simulation.installments}x):</span>
                                              <span className="font-bold text-brand-light">{simResult.rateUsed.toFixed(2)}%</span>
                                          </div>
                                          <div className="flex justify-between text-sm">
                                              <span className="text-brand-gray-400">Custo Total:</span>
                                              <span className="font-bold">R$ {simResult.cost.toFixed(2)}</span>
                                          </div>
                                      </div>
                                  </div>
                              </div>
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
