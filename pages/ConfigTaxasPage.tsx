
import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Save, TrendingUp, AlertCircle, PieChart, CheckCircle2, Tag, DollarSign, Clock, Briefcase, BarChart3 } from 'lucide-react';
import { CostStructure, RateRangesConfig } from '../types';
import { appStore } from '../services/store';
import { useAppStore } from '../services/useAppStore';
import { PagmotorsLogo } from '../components/Logo';

// --- TYPES ---
interface FinancialTerms {
    debit: number;
    credit1x: number;
    credit2to6: number;
    credit7to12: number;
    credit13to18: number;
}

// Perfis de Concentração
const CONCENTRATION_PROFILES = {
    'OFICINA': {
        debit: 35,
        credit1x: 25,
        credit2to6: 25,
        credit7to12: 10,
        credit13to18: 5
    },
    'REVENDA': {
        debit: 10,
        credit1x: 10,
        credit2to6: 30,
        credit7to12: 35,
        credit13to18: 15
    }
};

// Médias de TPV por Faixa (Para Simulação Automática)
const RANGE_AVERAGES: Record<number, number> = {
    0: 5000,    // Balcão (Padrão) - Base baixa
    1: 7500,    // 5k - 10k -> Média 7.5k
    2: 15000,   // 10k - 20k -> Média 15k
    3: 35000,   // 20k - 50k -> Média 35k
    4: 75000,   // 50k - 100k -> Média 75k
    5: 125000,  // 100k - 150k -> Média 125k
    6: 200000   // +150k -> Estimativa base 200k
};

// Helper for safe number parsing
const safeFloat = (value: string) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
};

// --- ISOLATED COMPONENTS ---

interface ConfigInputProps {
    label: string;
    value: number;
    onChange: (val: number) => void;
    suffix?: string;
    step?: number;
}

const ConfigInput = React.memo(({ label, value, onChange, suffix = "%", step = 0.01 }: ConfigInputProps) => (
    <div className="bg-white border border-brand-gray-200 rounded-lg p-2 shadow-sm hover:shadow-md transition-all group relative flex flex-col justify-center h-full">
        <label className="block text-[10px] font-bold text-brand-gray-500 uppercase tracking-wide mb-0.5 truncate group-hover:text-brand-primary transition-colors" title={label}>
            {label}
        </label>
        <div className="relative">
            <input 
                type="number" step={step}
                value={value}
                onChange={(e) => onChange(safeFloat(e.target.value))}
                onFocus={(e) => e.target.select()}
                className="w-full text-right text-sm font-mono font-bold text-brand-gray-900 bg-transparent outline-none p-0 pr-5 focus:text-brand-primary transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0.00"
            />
            <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">{suffix}</span>
        </div>
    </div>
));

// UPDATED LOGIC: 
// - Full Plan: Installments calculate exact average term ((N+1)/2).
// - Simples Plan: No Funding Cost.
const calculateMetrics = (
    rate: number, 
    installmentKey: number | 'debit' | '1x' | '2x-6x' | '7x-12x' | '13x-18x', 
    costs: CostStructure, 
    terms: FinancialTerms,
    planType: 'Full' | 'Simples'
) => {
    let interchange = 0;
    let avgTerm = 0;

    if (installmentKey === 'debit') {
        interchange = costs.debitCost;
        avgTerm = terms.debit;
    } else if (installmentKey === '1x') {
        interchange = costs.creditSightCost;
        avgTerm = terms.credit1x;
    } else if (installmentKey === '2x-6x') {
        interchange = costs.installment2to6Cost;
        avgTerm = terms.credit2to6;
    } else if (installmentKey === '7x-12x') {
        interchange = costs.installment7to12Cost;
        avgTerm = terms.credit7to12;
    } else if (installmentKey === '13x-18x') {
        interchange = costs.installment13to18Cost;
        avgTerm = terms.credit13to18;
    } else if (typeof installmentKey === 'number') {
        // Full Plan Granular Logic
        // 1. Interchange lookup based on bucket
        if (installmentKey <= 6) {
            interchange = costs.installment2to6Cost;
        } else if (installmentKey <= 12) {
            interchange = costs.installment7to12Cost;
        } else {
            interchange = costs.installment13to18Cost;
        }

        // 2. Average Term Calculation: Specific for each installment (N+1)/2
        // This overrides the grouped terms for improved accuracy in Full Table
        avgTerm = (installmentKey + 1) / 2;
    }

    // Funding applies only to Full. Simples uses fixed MDR logic (Interchange + Fixed).
    const fundingCost = planType === 'Full' ? (avgTerm * costs.anticipationCost) : 0;
    
    const totalCost = interchange + fundingCost + costs.fixedCostPerTx;
    
    const spread = rate - totalCost;
    const tax = rate * (costs.taxRate / 100);
    const mcf2 = spread - tax;

    return { totalCost, spread, mcf2, fundingCost, avgTerm };
};

interface FullModelRowProps {
    label: string;
    type: 'debit' | '1x' | 'installment';
    idx?: number;
    rateRanges: RateRangesConfig;
    setRateRanges: React.Dispatch<React.SetStateAction<RateRangesConfig>>;
    selectedRangeId: number;
    costs: CostStructure;
    terms: FinancialTerms;
    concentration: number;
}

const FullModelRow = React.memo(({ label, type, idx, rateRanges, setRateRanges, selectedRangeId, costs, terms, concentration }: FullModelRowProps) => {
    const range = rateRanges.full[selectedRangeId];
    if (!range) return null;

    let currentRate = 0;
    if (type === 'debit') currentRate = range.debit;
    else if (type === '1x') currentRate = range.credit1x;
    else if (idx !== undefined) currentRate = range.installments[idx];

    const installmentKey = (type === 'installment' && idx !== undefined) 
        ? (idx + 2) 
        : (type === 'debit' ? 'debit' : '1x');

    const { totalCost, spread, mcf2, avgTerm } = calculateMetrics(currentRate, installmentKey, costs, terms, 'Full');

    const handleRateChange = (newRate: number) => {
        setRateRanges(prev => {
            const updated = { ...prev };
            updated.full = { ...updated.full };
            updated.full[selectedRangeId] = { ...updated.full[selectedRangeId] };
            if (updated.full[selectedRangeId].installments) {
                 updated.full[selectedRangeId].installments = [...updated.full[selectedRangeId].installments];
            }

            const targetRange = updated.full[selectedRangeId];
            
            if (type === 'debit') targetRange.debit = newRate;
            else if (type === '1x') targetRange.credit1x = newRate;
            else if (idx !== undefined) targetRange.installments[idx] = newRate;
            
            return updated;
        });
    };

    const handleSpreadChange = (newSpread: number) => {
        const newRate = parseFloat((totalCost + newSpread).toFixed(2));
        handleRateChange(newRate);
    };

    return (
        <tr className="hover:bg-brand-gray-50 border-b border-brand-gray-100 last:border-0 transition-colors group h-8">
            <td className="px-4 py-0 text-xs font-bold text-gray-700 whitespace-nowrap">{label}</td>
            <td className="px-2 py-0 text-center"><span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{concentration.toFixed(0)}%</span></td>
            {/* Added Average Term Column for Full Plan */}
            <td className="px-2 py-0 text-center"><span className="text-[10px] font-mono text-gray-400">{avgTerm > 0 ? `${avgTerm.toFixed(1)}m` : '-'}</span></td>
            <td className="px-2 py-0 text-center"><span className="text-[11px] font-mono text-gray-500" title={`Custo Total: ${totalCost.toFixed(3)}%`}>{totalCost.toFixed(2)}%</span></td>
            <td className="px-2 py-0 text-center">
                <div className="relative inline-block w-20">
                    <input type="number" step="0.01" className="w-full text-center text-xs font-bold text-green-700 bg-green-50/50 border border-transparent focus:bg-white focus:border-brand-primary/20 hover:border-green-200 rounded px-1 py-0.5 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={spread.toFixed(2)} onChange={(e) => handleSpreadChange(safeFloat(e.target.value))} onFocus={(e) => e.target.select()} />
                </div>
            </td>
            <td className="px-2 py-0 text-center">
                <div className="relative inline-block w-20">
                    <input type="number" step="0.01" className="w-full text-center text-xs font-extrabold text-brand-primary bg-brand-primary/5 border border-transparent focus:bg-white focus:border-brand-primary/20 hover:border-brand-primary/20 rounded px-1 py-0.5 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={currentRate} onChange={(e) => handleRateChange(safeFloat(e.target.value))} onFocus={(e) => e.target.select()} />
                </div>
            </td>
            <td className="px-4 py-0 text-center"><span className={`text-[11px] font-mono font-bold ${mcf2 < 0.1 ? 'text-red-500' : 'text-blue-600'}`}>{mcf2.toFixed(2)}%</span></td>
        </tr>
    );
});

// NEW: Simples Model Row Component
interface SimplesModelRowProps {
    label: string;
    type: 'debit' | '1x' | '2x-6x' | '7x-12x' | '13x-18x';
    rateRanges: RateRangesConfig;
    setRateRanges: React.Dispatch<React.SetStateAction<RateRangesConfig>>;
    selectedRangeId: number;
    costs: CostStructure;
    terms: FinancialTerms;
    concentration: number;
}

const SimplesModelRow = React.memo(({ label, type, rateRanges, setRateRanges, selectedRangeId, costs, terms, concentration }: SimplesModelRowProps) => {
    const range = rateRanges.simples[selectedRangeId];
    if (!range) return null;

    let currentRate = 0;
    if (type === 'debit') currentRate = range.debit;
    else if (type === '1x') currentRate = range.credit1x;
    else if (type === '2x-6x') currentRate = range.credit2x6x;
    else if (type === '7x-12x') currentRate = range.credit7x12x;
    else if (type === '13x-18x') currentRate = range.credit13x18x;

    // Pass 'Simples' explicitly to exclude funding cost
    const { totalCost, spread, mcf2 } = calculateMetrics(currentRate, type, costs, terms, 'Simples');

    const handleRateChange = (newRate: number) => {
        setRateRanges(prev => {
            const updated = { ...prev };
            updated.simples = { ...updated.simples };
            updated.simples[selectedRangeId] = { ...updated.simples[selectedRangeId] };
            
            const targetRange = updated.simples[selectedRangeId];
            if (type === 'debit') targetRange.debit = newRate;
            else if (type === '1x') targetRange.credit1x = newRate;
            else if (type === '2x-6x') targetRange.credit2x6x = newRate;
            else if (type === '7x-12x') targetRange.credit7x12x = newRate;
            else if (type === '13x-18x') targetRange.credit13x18x = newRate;
            
            return updated;
        });
    };

    const handleSpreadChange = (newSpread: number) => {
        const newRate = parseFloat((totalCost + newSpread).toFixed(2));
        handleRateChange(newRate);
    };

    return (
        <tr className="hover:bg-brand-gray-50 border-b border-brand-gray-100 last:border-0 transition-colors group h-8">
            <td className="px-4 py-0 text-xs font-bold text-gray-700 whitespace-nowrap">{label}</td>
            <td className="px-2 py-0 text-center"><span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{concentration.toFixed(0)}%</span></td>
            <td className="px-2 py-0 text-center"><span className="text-[11px] font-mono text-gray-500" title={`Custo Total (Sem Funding): ${totalCost.toFixed(3)}%`}>{totalCost.toFixed(2)}%</span></td>
            <td className="px-2 py-0 text-center">
                <div className="relative inline-block w-20">
                    <input type="number" step="0.01" className="w-full text-center text-xs font-bold text-green-700 bg-green-50/50 border border-transparent focus:bg-white focus:border-brand-primary/20 hover:border-green-200 rounded px-1 py-0.5 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={spread.toFixed(2)} onChange={(e) => handleSpreadChange(safeFloat(e.target.value))} onFocus={(e) => e.target.select()} />
                </div>
            </td>
            <td className="px-2 py-0 text-center">
                <div className="relative inline-block w-20">
                    <input type="number" step="0.01" className="w-full text-center text-xs font-extrabold text-brand-primary bg-brand-primary/5 border border-transparent focus:bg-white focus:border-brand-primary/20 hover:border-brand-primary/20 rounded px-1 py-0.5 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={currentRate} onChange={(e) => handleRateChange(safeFloat(e.target.value))} onFocus={(e) => e.target.select()} />
                </div>
            </td>
            <td className="px-4 py-0 text-center"><span className={`text-[11px] font-mono font-bold ${mcf2 < 0.1 ? 'text-red-500' : 'text-blue-600'}`}>{mcf2.toFixed(2)}%</span></td>
        </tr>
    );
});

// --- MAIN COMPONENT ---

const ConfigTaxasPage: React.FC = () => {
    const { currentUser } = useAppStore();
    const [activeTab, setActiveTab] = useState<'COSTS' | 'RANGES'>('RANGES');
    const [successMsg, setSuccessMsg] = useState<string|null>(null);
    
    // Configs
    const [costs, setCosts] = useState<CostStructure>(appStore.getCostConfig());
    const [rateRanges, setRateRanges] = useState<RateRangesConfig>(appStore.getRateRangesConfig());
    
    // Ranges State
    const [selectedRangeId, setSelectedRangeId] = useState<number>(0);
    const [selectedRangePlan, setSelectedRangePlan] = useState<'Full' | 'Simples'>('Full');
    const [selectedSegment, setSelectedSegment] = useState<'OFICINA' | 'REVENDA'>('OFICINA');
    
    // Automatic TPV logic based on Range
    const [simulationTpv, setSimulationTpv] = useState<number>(RANGE_AVERAGES[0]);

    // Update Simulation TPV when Range changes
    useEffect(() => {
        setSimulationTpv(RANGE_AVERAGES[selectedRangeId] || 5000);
    }, [selectedRangeId]);

    // New: Financial Terms State
    const [financialTerms, setFinancialTerms] = useState<FinancialTerms>({
        debit: 0,
        credit1x: 1,
        credit2to6: 4, // Average
        credit7to12: 9.5, // Average
        credit13to18: 15.5 // Average
    });

    useEffect(() => {
        setCosts(appStore.getCostConfig());
        setRateRanges(appStore.getRateRangesConfig());
    }, []);

    const handleSaveCosts = () => {
        const updatedCosts: CostStructure = {
            ...costs,
            lastUpdated: new Date().toISOString(),
            updatedBy: currentUser?.name || 'Sistema'
        };
        setCosts(updatedCosts);
        appStore.setCostConfig(updatedCosts);
        setSuccessMsg("Custos e Prazos atualizados com sucesso!");
        setTimeout(() => setSuccessMsg(null), 3000);
    };

    const handleSaveRanges = () => {
        const now = new Date().toISOString();
        const userName = currentUser?.name || 'Sistema';
        const updatedConfig = { ...rateRanges };
        
        if (selectedRangePlan === 'Full') {
            if (updatedConfig.full[selectedRangeId]) {
                updatedConfig.full[selectedRangeId] = {
                    ...updatedConfig.full[selectedRangeId],
                    lastUpdated: now,
                    updatedBy: userName
                };
            }
        } else {
            if (updatedConfig.simples[selectedRangeId]) {
                updatedConfig.simples[selectedRangeId] = {
                    ...updatedConfig.simples[selectedRangeId],
                    lastUpdated: now,
                    updatedBy: userName
                };
            }
        }

        appStore.setRateRangesConfig(updatedConfig);
        setRateRanges(updatedConfig);
        setSuccessMsg("Tabela de Taxas salva!");
        setTimeout(() => setSuccessMsg(null), 3000);
    };

    // --- WEIGHTED TOTALS CALCULATION (RANGES TAB) ---
    const rangesTotals = useMemo(() => {
        const profile = CONCENTRATION_PROFILES[selectedSegment];
        
        if (selectedRangePlan === 'Full') {
            const range = rateRanges.full[selectedRangeId];
            if (!range) return { spread: 0, mcf2: 0, mcf2Reais: 0 };

            let totalSpread = 0, totalMcf2 = 0, totalWeight = 0;

            const process = (rate: number, type: 'debit' | '1x' | number) => {
                let weight = 0;
                if (type === 'debit') weight = profile.debit;
                else if (type === '1x') weight = profile.credit1x;
                else if (type <= 6) weight = profile.credit2to6 / 5;
                else if (type <= 12) weight = profile.credit7to12 / 6;
                else weight = profile.credit13to18 / 6;

                const { spread, mcf2 } = calculateMetrics(rate, type, costs, financialTerms, 'Full');
                totalSpread += spread * (weight / 100);
                totalMcf2 += mcf2 * (weight / 100);
                totalWeight += weight;
            };

            process(range.debit, 'debit');
            process(range.credit1x, '1x');
            range.installments.forEach((rate, i) => process(rate, i + 2));

            return { spread: totalSpread, mcf2: totalMcf2, mcf2Reais: simulationTpv * (totalMcf2 / 100) };
        } else {
            // SIMPLES CALCULATION
            const range = rateRanges.simples[selectedRangeId];
            if (!range) return { spread: 0, mcf2: 0, mcf2Reais: 0 };

            let totalSpread = 0, totalMcf2 = 0;
            
            const process = (rate: number, type: 'debit' | '1x' | '2x-6x' | '7x-12x' | '13x-18x', weight: number) => {
                const { spread, mcf2 } = calculateMetrics(rate, type, costs, financialTerms, 'Simples');
                totalSpread += spread * (weight / 100);
                totalMcf2 += mcf2 * (weight / 100);
            };

            process(range.debit, 'debit', profile.debit);
            process(range.credit1x, '1x', profile.credit1x);
            process(range.credit2x6x, '2x-6x', profile.credit2to6);
            process(range.credit7x12x, '7x-12x', profile.credit7to12);
            process(range.credit13x18x, '13x-18x', profile.credit13to18);

            return { spread: totalSpread, mcf2: totalMcf2, mcf2Reais: simulationTpv * (totalMcf2 / 100) };
        }

    }, [rateRanges, selectedRangeId, selectedRangePlan, selectedSegment, costs, financialTerms, simulationTpv]);

    // Helper to get concentration per row for display
    const getConcentration = (type: string | number) => {
        const p = CONCENTRATION_PROFILES[selectedSegment];
        if (type === 'debit') return p.debit;
        if (type === '1x') return p.credit1x;
        if (type === '2x-6x') return p.credit2to6;
        if (type === '7x-12x') return p.credit7to12;
        if (type === '13x-18x') return p.credit13to18;
        if (typeof type === 'number') {
            if (type <= 6) return p.credit2to6 / 5;
            if (type <= 12) return p.credit7to12 / 6;
            return p.credit13to18 / 6;
        }
        return 0;
    };

    // Helper for audit info display in Ranges
    const getRangeAuditInfo = () => {
        if (selectedRangePlan === 'Full') {
            const range = rateRanges.full[selectedRangeId];
            return range ? { date: range.lastUpdated, user: range.updatedBy } : null;
        } else {
            const range = rateRanges.simples[selectedRangeId];
            return range ? { date: range.lastUpdated, user: range.updatedBy } : null;
        }
    };
    const rangeAudit = getRangeAuditInfo();

    return (
        <div className="max-w-7xl mx-auto space-y-4 pb-20 relative h-full flex flex-col">
            {successMsg && (
                <div className="fixed top-4 right-4 z-50 animate-fade-in-down">
                    <div className="bg-brand-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
                        <CheckCircle2 className="text-green-400 w-5 h-5" />
                        <span className="font-medium">{successMsg}</span>
                    </div>
                </div>
            )}

            <header className="flex flex-col md:flex-row justify-between items-end gap-2 no-print shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-brand-primary" />
                        Configuração de Taxas
                    </h1>
                </div>
                <div className="flex bg-brand-gray-200 p-1 rounded-xl overflow-x-auto">
                    <button 
                        onClick={() => setActiveTab('COSTS')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'COSTS' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                    >
                        <DollarSign className="w-4 h-4" />
                        Custos
                    </button>
                    <button 
                        onClick={() => setActiveTab('RANGES')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'RANGES' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                    >
                        <Tag className="w-4 h-4" />
                        Ranges
                    </button>
                </div>
            </header>

            {/* --- TAB: CUSTOS INTERCHANGE --- */}
            {activeTab === 'COSTS' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in flex-1 overflow-y-auto">
                    {/* Column 1: Base Costs */}
                    <div className="bg-white rounded-xl shadow-sm border border-brand-gray-200 p-5 h-fit">
                        <h3 className="font-bold text-sm text-brand-gray-900 flex items-center gap-2 mb-4">
                            <TrendingUp className="w-4 h-4 text-brand-primary" />
                            Custos Base & Interchange
                        </h3>
                        
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <ConfigInput label="Interchange Débito" value={costs.debitCost} onChange={(val) => setCosts({...costs, debitCost: val})} />
                                <ConfigInput label="Interchange Crédito 1x" value={costs.creditSightCost} onChange={(val) => setCosts({...costs, creditSightCost: val})} />
                            </div>
                            
                            <div className="bg-brand-gray-50 p-3 rounded-lg border border-brand-gray-100">
                                <label className="block text-[10px] font-bold text-brand-gray-700 mb-2 pl-1">Interchange Parcelado (Médio)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <ConfigInput label="2x-6x" value={costs.installment2to6Cost} onChange={(val) => setCosts({...costs, installment2to6Cost: val})} />
                                    <ConfigInput label="7x-12x" value={costs.installment7to12Cost} onChange={(val) => setCosts({...costs, installment7to12Cost: val})} />
                                    <ConfigInput label="13x-18x" value={costs.installment13to18Cost} onChange={(val) => setCosts({...costs, installment13to18Cost: val})} />
                                </div>
                            </div>

                            <div className="border-t border-brand-gray-100 pt-3 grid grid-cols-2 gap-3">
                                <ConfigInput label="Custo Funding (a.m.)" value={costs.anticipationCost} onChange={(val) => setCosts({...costs, anticipationCost: val})} />
                                <ConfigInput label="Impostos Totais" value={costs.taxRate} onChange={(val) => setCosts({...costs, taxRate: val})} />
                                <ConfigInput label="Custo Fixo (R$/Tx)" value={costs.fixedCostPerTx} onChange={(val) => setCosts({...costs, fixedCostPerTx: val})} suffix="" step={0.01} />
                            </div>
                        </div>

                        {/* Audit Footer in Card */}
                        <div className="mt-4 pt-3 border-t border-brand-gray-100 flex justify-between items-center text-[9px] text-gray-400">
                            <span>Configuração Global</span>
                            {costs.lastUpdated && (
                                <span className="flex items-center gap-1">
                                    <Clock size={10} />
                                    Atualizado em {new Date(costs.lastUpdated).toLocaleDateString()} às {new Date(costs.lastUpdated).toLocaleTimeString()} por <strong className="text-gray-600">{costs.updatedBy}</strong>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Column 2: Financial Terms & Summary */}
                    <div className="space-y-4">
                        <div className="bg-white rounded-xl shadow-sm border border-brand-gray-200 p-5">
                            <h3 className="font-bold text-sm text-brand-gray-900 flex items-center gap-2 mb-4">
                                <Clock className="w-4 h-4 text-blue-600" />
                                Prazo Médio Financeiro (Meses)
                            </h3>
                            <p className="text-[10px] text-brand-gray-500 mb-3">Utilizado para calcular o custo de funding proporcional por parcela (somente tabela Simples ou agrupados).</p>
                            
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-1">
                                    <ConfigInput label="Débito (D+0)" value={financialTerms.debit} onChange={(val) => setFinancialTerms({...financialTerms, debit: val})} suffix="m" step={0.1} />
                                </div>
                                <div className="col-span-1">
                                    <ConfigInput label="Crédito 1x" value={financialTerms.credit1x} onChange={(val) => setFinancialTerms({...financialTerms, credit1x: val})} suffix="m" step={0.1} />
                                </div>
                                <div className="col-span-1"></div>
                                <ConfigInput label="2x-6x (Médio)" value={financialTerms.credit2to6} onChange={(val) => setFinancialTerms({...financialTerms, credit2to6: val})} suffix="m" step={0.1} />
                                <ConfigInput label="7x-12x (Médio)" value={financialTerms.credit7to12} onChange={(val) => setFinancialTerms({...financialTerms, credit7to12: val})} suffix="m" step={0.1} />
                                <ConfigInput label="13x-18x (Médio)" value={financialTerms.credit13to18} onChange={(val) => setFinancialTerms({...financialTerms, credit13to18: val})} suffix="m" step={0.1} />
                            </div>
                        </div>

                        <div className="bg-brand-gray-900 text-white rounded-xl p-5 shadow-lg flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-sm">Salvar Configurações</h4>
                                <p className="text-brand-gray-400 text-[10px]">Atualiza todos os simuladores.</p>
                            </div>
                            <button onClick={handleSaveCosts} className="bg-brand-primary hover:bg-brand-dark px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-md transition-all">
                                <Save className="w-4 h-4" /> Salvar Custos
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: RANGES TAXAS (ADJUSTED - COMPACT) --- */}
            {activeTab === 'RANGES' && (
                <div className="bg-white rounded-xl shadow-md border border-brand-gray-200 overflow-hidden animate-fade-in flex flex-col flex-1 h-full min-h-0">
                    {/* Header Controls */}
                    <div className="bg-gray-50 p-3 border-b border-gray-200 flex flex-col lg:flex-row justify-between items-center gap-3 shrink-0">
                        <div className="flex gap-4 items-center w-full lg:w-auto">
                            {/* Logo Pagmotors Added Here */}
                            <div className="pr-4 border-r border-gray-200 hidden md:block">
                                <PagmotorsLogo variant="default" className="scale-75 origin-left" />
                            </div>

                            <div className="flex bg-white rounded-lg border border-brand-gray-300 p-0.5 shadow-sm">
                                <button 
                                    onClick={() => setSelectedRangePlan('Full')}
                                    className={`px-3 py-1 text-xs font-bold rounded transition-all ${selectedRangePlan === 'Full' ? 'bg-green-100 text-green-700' : 'text-gray-500'}`}
                                >
                                    Full
                                </button>
                                <button 
                                    onClick={() => setSelectedRangePlan('Simples')}
                                    className={`px-3 py-1 text-xs font-bold rounded transition-all ${selectedRangePlan === 'Simples' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
                                >
                                    Simples
                                </button>
                            </div>

                            <select 
                                value={selectedRangeId}
                                onChange={(e) => setSelectedRangeId(Number(e.target.value))}
                                className="border border-brand-gray-300 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 bg-white outline-none focus:ring-1 focus:ring-brand-primary h-7"
                            >
                                {appStore.TPV_RANGES.map(range => <option key={range.id} value={range.id}>{range.label}</option>)}
                            </select>
                        </div>

                        {/* Segment Selector & Actions */}
                        <div className="flex gap-3 items-center w-full lg:w-auto justify-between lg:justify-end">
                            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-gray-200 h-7">
                                <Briefcase className="w-3 h-3 text-brand-gray-400" />
                                <select 
                                    value={selectedSegment}
                                    onChange={(e) => setSelectedSegment(e.target.value as any)}
                                    className="text-[10px] font-bold text-gray-700 bg-transparent outline-none uppercase"
                                >
                                    <option value="OFICINA">Perfil Oficina</option>
                                    <option value="REVENDA">Perfil Revenda</option>
                                </select>
                            </div>

                            <button onClick={handleSaveRanges} className="bg-brand-gray-900 hover:bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all h-7">
                                <Save className="w-3 h-3" /> Salvar
                            </button>
                        </div>
                    </div>

                    {/* Table Content - Flex 1 to fill space, auto overflow, NO VISIBLE SCROLLBAR */}
                    <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] flex justify-center bg-gray-50/50">
                        <div className="w-full max-w-5xl bg-white border-x border-gray-100 shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white sticky top-0 z-10 shadow-sm text-xs font-bold text-gray-500 uppercase border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 bg-gray-50/50 text-left">Modalidade</th>
                                        <th className="px-2 py-3 text-center bg-gray-50/50">Conc.(%)</th>
                                        {/* Added Prazo Column for Full */}
                                        {selectedRangePlan === 'Full' && <th className="px-2 py-3 text-center bg-gray-50/50">Prazo (m)</th>}
                                        <th className="px-2 py-3 text-center bg-gray-50/50">Custo Total</th>
                                        <th className="px-2 py-3 text-center text-green-600 bg-gray-50/50">Spread</th>
                                        <th className="px-2 py-3 text-center text-brand-primary bg-gray-50/50">Taxa Final</th>
                                        <th className="px-4 py-3 text-center bg-gray-50/50">MCF2</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-gray-100 bg-white">
                                    {selectedRangePlan === 'Full' ? (
                                        <>
                                            <FullModelRow 
                                                label="Débito" type="debit" 
                                                rateRanges={rateRanges} setRateRanges={setRateRanges} selectedRangeId={selectedRangeId} 
                                                costs={costs} terms={financialTerms} concentration={getConcentration('debit')}
                                            />
                                            <FullModelRow 
                                                label="Crédito 1x" type="1x" 
                                                rateRanges={rateRanges} setRateRanges={setRateRanges} selectedRangeId={selectedRangeId} 
                                                costs={costs} terms={financialTerms} concentration={getConcentration('1x')}
                                            />
                                            {Array.from({length: 17}).map((_, idx) => (
                                                <FullModelRow 
                                                    key={idx} label={`Crédito ${idx + 2}x`} type="installment" idx={idx} 
                                                    rateRanges={rateRanges} setRateRanges={setRateRanges} selectedRangeId={selectedRangeId} 
                                                    costs={costs} terms={financialTerms} concentration={getConcentration(idx + 2)}
                                                />
                                            ))}
                                        </>
                                    ) : (
                                        <>
                                            <SimplesModelRow 
                                                label="Débito" type="debit" 
                                                rateRanges={rateRanges} setRateRanges={setRateRanges} selectedRangeId={selectedRangeId} 
                                                costs={costs} terms={financialTerms} concentration={getConcentration('debit')}
                                            />
                                            <SimplesModelRow 
                                                label="Crédito 1x" type="1x" 
                                                rateRanges={rateRanges} setRateRanges={setRateRanges} selectedRangeId={selectedRangeId} 
                                                costs={costs} terms={financialTerms} concentration={getConcentration('1x')}
                                            />
                                            <SimplesModelRow 
                                                label="Crédito 2x - 6x" type="2x-6x" 
                                                rateRanges={rateRanges} setRateRanges={setRateRanges} selectedRangeId={selectedRangeId} 
                                                costs={costs} terms={financialTerms} concentration={getConcentration('2x-6x')}
                                            />
                                            <SimplesModelRow 
                                                label="Crédito 7x - 12x" type="7x-12x" 
                                                rateRanges={rateRanges} setRateRanges={setRateRanges} selectedRangeId={selectedRangeId} 
                                                costs={costs} terms={financialTerms} concentration={getConcentration('7x-12x')}
                                            />
                                            <SimplesModelRow 
                                                label="Crédito 13x - 18x" type="13x-18x" 
                                                rateRanges={rateRanges} setRateRanges={setRateRanges} selectedRangeId={selectedRangeId} 
                                                costs={costs} terms={financialTerms} concentration={getConcentration('13x-18x')}
                                            />
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary Footer - Compact */}
                    <div className="bg-brand-gray-50 border-t border-brand-gray-200 p-2 shrink-0">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                            <div className="flex items-center gap-2 md:col-span-2">
                                <div className="p-1 px-2 bg-white rounded border border-gray-200 shadow-sm flex items-center gap-2">
                                    <label className="block text-[9px] font-bold text-gray-400 uppercase">Simulação TPV</label>
                                    <input 
                                        type="number" 
                                        value={simulationTpv} 
                                        onChange={e => setSimulationTpv(Number(e.target.value))}
                                        className="w-20 font-bold text-gray-800 outline-none text-xs bg-transparent text-right"
                                    />
                                    <span className="text-[9px] text-gray-400">R$</span>
                                </div>
                                <div className="text-[9px] text-gray-400 hidden lg:block">
                                    Baseado no perfil <strong>{selectedSegment}</strong>.
                                </div>
                            </div>

                            <div className="bg-white px-3 py-1 rounded border border-gray-200 shadow-sm flex items-center justify-between">
                                <span className="text-[9px] font-bold text-gray-400 uppercase">Spread Médio</span>
                                <span className="text-sm font-bold text-green-600">{rangesTotals.spread.toFixed(2)}%</span>
                            </div>

                            <div className="bg-brand-primary text-white px-3 py-1 rounded shadow-sm flex items-center justify-between relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-1 opacity-10"><BarChart3 size={24}/></div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold uppercase opacity-80">MCF2 (R$)</span>
                                    <span className="text-[9px] opacity-70">{rangesTotals.mcf2.toFixed(2)}%</span>
                                </div>
                                <span className="text-sm font-bold">R$ {rangesTotals.mcf2Reais.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                            </div>
                        </div>

                        {/* Audit Info Footer */}
                        <div className="mt-1 pt-1 border-t border-gray-200 text-[9px] text-gray-400 flex justify-end">
                            {rangeAudit ? (
                                <span className="flex items-center gap-1">
                                    <Clock size={8} />
                                    Ult. alt.: {new Date(rangeAudit.date || '').toLocaleDateString()} {new Date(rangeAudit.date || '').toLocaleTimeString()} por <strong className="text-gray-600">{rangeAudit.user || 'Sistema'}</strong>
                                </span>
                            ) : (
                                <span>Sem histórico recente.</span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConfigTaxasPage;
