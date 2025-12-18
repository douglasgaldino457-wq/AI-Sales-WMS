
import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Save, TrendingUp, AlertCircle, PieChart, CheckCircle2, Tag, DollarSign, Clock, Briefcase, BarChart3, ShieldCheck, Percent, Calculator } from 'lucide-react';
import { CostStructure, RateRangesConfig, FinancialTerms } from '../types';
import { appStore } from '../services/store';
import { useAppStore } from '../services/useAppStore';
import { PagmotorsLogo } from '../components/Logo';

const CONCENTRATION_PROFILES = {
    'OFICINA': { debit: 35, credit1x: 25, credit2to6: 25, credit7to12: 10, credit13to18: 5 },
    'REVENDA': { debit: 10, credit1x: 10, credit2to6: 30, credit7to12: 35, credit13to18: 15 }
};

const RANGE_AVERAGES: Record<number, number> = {
    0: 5000, 1: 7500, 2: 15000, 3: 35000, 4: 75000, 5: 125000, 6: 200000
};

const safeFloat = (value: string) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
};

interface ConfigInputProps {
    label: string;
    value: number;
    onChange: (val: number) => void;
    suffix?: string;
    step?: number;
    icon?: React.ReactNode;
}

const ConfigInput = React.memo(({ label, value, onChange, suffix = "%", step = 0.01, icon }: ConfigInputProps) => (
    <div className="bg-white border border-brand-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-all group relative flex flex-col justify-center h-full">
        <label className="block text-[10px] font-black text-brand-gray-400 uppercase tracking-widest mb-1.5 truncate group-hover:text-brand-primary transition-colors" title={label}>
            {label}
        </label>
        <div className="relative flex items-center gap-2">
            {icon && <div className="text-brand-gray-300 group-focus-within:text-brand-primary transition-colors">{icon}</div>}
            <div className="relative flex-1">
                <input 
                    type="number" step={step}
                    value={value}
                    onChange={(e) => onChange(safeFloat(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full text-right text-base font-mono font-black text-brand-gray-900 bg-transparent outline-none p-0 pr-6 focus:text-brand-primary transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0.00"
                />
                <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-300 pointer-events-none">{suffix}</span>
            </div>
        </div>
    </div>
));

const calculateMetrics = (
    rate: number, 
    installmentKey: number | 'debit' | '1x' | '2x-6x' | '7x-12x' | '13x-18x', 
    costs: CostStructure, 
    terms: FinancialTerms | undefined,
    planType: 'Full' | 'Simples'
) => {
    let interchange = 0;
    let avgTerm = 0;
    const safeTerms = terms || { debit: 0, credit1x: 1, credit2to6: 4, credit7to12: 9.5, credit13to18: 15.5 };

    if (installmentKey === 'debit') { interchange = costs.debitCost; avgTerm = safeTerms.debit; }
    else if (installmentKey === '1x') { interchange = costs.creditSightCost; avgTerm = safeTerms.credit1x; }
    else if (installmentKey === '2x-6x') { interchange = costs.installment2to6Cost; avgTerm = safeTerms.credit2to6; }
    else if (installmentKey === '7x-12x') { interchange = costs.installment7to12Cost; avgTerm = safeTerms.credit7to12; }
    else if (installmentKey === '13x-18x') { interchange = costs.installment13to18Cost; avgTerm = safeTerms.credit13to18; }
    else if (typeof installmentKey === 'number') {
        if (installmentKey <= 6) interchange = costs.installment2to6Cost;
        else if (installmentKey <= 12) interchange = costs.installment7to12Cost;
        else interchange = costs.installment13to18Cost;
        avgTerm = (installmentKey + 1) / 2;
    }

    const fundingCost = planType === 'Full' ? (avgTerm * costs.anticipationCost) : 0;
    const totalCost = interchange + fundingCost + costs.fixedCostPerTx;
    const spread = rate - totalCost;
    const tax = rate * (costs.taxRate / 100);
    const mcf2 = spread - tax;

    return { totalCost, spread, mcf2, fundingCost, avgTerm };
};

const FullModelRow = React.memo(({ label, type, idx, rateRanges, setRateRanges, selectedRangeId, costs, concentration }: any) => {
    const range = rateRanges.full[selectedRangeId];
    if (!range) return null;

    let currentRate = 0;
    if (type === 'debit') currentRate = range.debit;
    else if (type === '1x') currentRate = range.credit1x;
    else if (idx !== undefined) currentRate = range.installments[idx];

    const installmentKey = (type === 'installment' && idx !== undefined) ? (idx + 2) : (type === 'debit' ? 'debit' : '1x');
    const { totalCost, spread, mcf2, avgTerm } = calculateMetrics(currentRate, installmentKey, costs, costs.financialTerms, 'Full');

    const handleRateChange = (newRate: number) => {
        setRateRanges((prev: any) => {
            const updated = { ...prev };
            updated.full = { ...updated.full };
            updated.full[selectedRangeId] = { ...updated.full[selectedRangeId] };
            if (updated.full[selectedRangeId].installments) { updated.full[selectedRangeId].installments = [...updated.full[selectedRangeId].installments]; }
            const targetRange = updated.full[selectedRangeId];
            if (type === 'debit') targetRange.debit = newRate;
            else if (type === '1x') targetRange.credit1x = newRate;
            else if (idx !== undefined) targetRange.installments[idx] = newRate;
            return updated;
        });
    };

    return (
        <tr className="hover:bg-brand-gray-50 border-b border-brand-gray-100 last:border-0 transition-colors h-8">
            <td className="px-4 py-0 text-xs font-bold text-gray-700 whitespace-nowrap">{label}</td>
            <td className="px-2 py-0 text-center"><span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{concentration.toFixed(0)}%</span></td>
            <td className="px-2 py-0 text-center"><span className="text-[10px] font-mono text-gray-400">{avgTerm > 0 ? `${avgTerm.toFixed(1)}m` : '-'}</span></td>
            <td className="px-2 py-0 text-center"><span className="text-[11px] font-mono text-gray-500">{totalCost.toFixed(2)}%</span></td>
            <td className="px-2 py-0 text-center"><span className="text-xs font-bold text-green-700">{spread.toFixed(2)}%</span></td>
            <td className="px-2 py-0 text-center">
                <input type="number" step="0.01" className="w-20 text-center text-xs font-extrabold text-brand-primary bg-brand-primary/5 border border-transparent hover:border-brand-primary/20 rounded py-0.5" value={currentRate} onChange={(e) => handleRateChange(safeFloat(e.target.value))} />
            </td>
            <td className="px-4 py-0 text-center"><span className={`text-[11px] font-mono font-bold ${mcf2 < 0.1 ? 'text-red-500' : 'text-blue-600'}`}>{mcf2.toFixed(2)}%</span></td>
        </tr>
    );
});

const SimplesModelRow = React.memo(({ label, type, rateRanges, setRateRanges, selectedRangeId, costs, concentration }: any) => {
    const range = rateRanges.simples[selectedRangeId];
    if (!range) return null;

    let currentRate = 0;
    if (type === 'debit') currentRate = range.debit;
    else if (type === '1x') currentRate = range.credit1x;
    else if (type === '2x-6x') currentRate = range.credit2x6x;
    else if (type === '7x-12x') currentRate = range.credit7x12x;
    else if (type === '13x-18x') currentRate = range.credit13x18x;

    const { totalCost, spread, mcf2 } = calculateMetrics(currentRate, type, costs, costs.financialTerms, 'Simples');

    const handleRateChange = (newRate: number) => {
        setRateRanges((prev: any) => {
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

    return (
        <tr className="hover:bg-brand-gray-50 border-b border-brand-gray-100 last:border-0 transition-colors h-8">
            <td className="px-4 py-0 text-xs font-bold text-gray-700 whitespace-nowrap">{label}</td>
            <td className="px-2 py-0 text-center"><span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{concentration.toFixed(0)}%</span></td>
            <td className="px-2 py-0 text-center"><span className="text-[11px] font-mono text-gray-500">{totalCost.toFixed(2)}%</span></td>
            <td className="px-2 py-0 text-center"><span className="text-xs font-bold text-green-700">{spread.toFixed(2)}%</span></td>
            <td className="px-2 py-0 text-center">
                <input type="number" step="0.01" className="w-20 text-center text-xs font-extrabold text-brand-primary bg-brand-primary/5 border border-transparent hover:border-brand-primary/20 rounded py-0.5" value={currentRate} onChange={(e) => handleRateChange(safeFloat(e.target.value))} />
            </td>
            <td className="px-4 py-0 text-center"><span className={`text-[11px] font-mono font-bold ${mcf2 < 0.1 ? 'text-red-500' : 'text-blue-600'}`}>{mcf2.toFixed(2)}%</span></td>
        </tr>
    );
});

const ConfigTaxasPage: React.FC = () => {
    const { currentUser } = useAppStore();
    const [activeTab, setActiveTab] = useState<'COSTS' | 'RANGES'>('COSTS');
    const [successMsg, setSuccessMsg] = useState<string|null>(null);
    
    // States for Config
    const [costs, setCosts] = useState<CostStructure>(appStore.getCostConfig());
    const [rateRanges, setRateRanges] = useState<RateRangesConfig>(appStore.getRateRangesConfig());
    
    // Range specific state
    const [selectedRangeId, setSelectedRangeId] = useState<number>(0);
    const [selectedRangePlan, setSelectedRangePlan] = useState<'Full' | 'Simples'>('Full');
    const [selectedSegment, setSelectedSegment] = useState<'OFICINA' | 'REVENDA'>('OFICINA');

    useEffect(() => { 
        setCosts(appStore.getCostConfig()); 
        setRateRanges(appStore.getRateRangesConfig()); 
    }, []);

    const handleSaveCosts = () => {
        appStore.setCostConfig(costs);
        setSuccessMsg("Configurações de Custos salvas!");
        setTimeout(() => setSuccessMsg(null), 3000);
    };

    const handleSaveRanges = () => {
        appStore.setRateRangesConfig(rateRanges);
        setSuccessMsg("Tabelas de Ranges salvas!");
        setTimeout(() => setSuccessMsg(null), 3000);
    };

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

    return (
        <div className="max-w-7xl mx-auto space-y-4 pb-20 relative h-full flex flex-col animate-fade-in">
            {successMsg && (
                <div className="fixed top-4 right-4 z-50 animate-fade-in-down">
                    <div className="bg-brand-gray-900 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-brand-primary/20">
                        <CheckCircle2 className="text-green-400 w-5 h-5" />
                        <span className="font-bold text-sm">{successMsg}</span>
                    </div>
                </div>
            )}

            <header className="flex flex-col md:flex-row justify-between items-end gap-2 no-print shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <Settings className="w-6 h-6 text-brand-primary" /> 
                        Configuração de Taxas
                    </h1>
                    <p className="text-xs text-brand-gray-500 mt-0.5">Definição de custos e ranges comerciais para Inside/Field Sales.</p>
                </div>
                <div className="flex bg-brand-gray-200 p-1 rounded-xl shadow-inner">
                    <button onClick={() => setActiveTab('COSTS')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'COSTS' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-800'}`}>
                        <DollarSign className="w-4 h-4" /> Custos
                    </button>
                    <button onClick={() => setActiveTab('RANGES')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'RANGES' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-800'}`}>
                        <Tag className="w-4 h-4" /> Ranges
                    </button>
                </div>
            </header>

            {/* === TAB: COSTS === */}
            {activeTab === 'COSTS' && (
                <div className="space-y-6 flex-1 overflow-y-auto pr-1">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* CARD: Interchange Cost */}
                        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-brand-gray-100 overflow-hidden">
                            <div className="p-5 border-b border-brand-gray-100 bg-brand-gray-50 flex items-center justify-between">
                                <h3 className="font-bold text-brand-gray-900 flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-blue-600" /> Interchange (Custo Operacional)
                                </h3>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <ConfigInput label="Débito" value={costs.debitCost} onChange={v => setCosts({...costs, debitCost: v})} />
                                <ConfigInput label="Crédito 1x" value={costs.creditSightCost} onChange={v => setCosts({...costs, creditSightCost: v})} />
                                <ConfigInput label="Crédito 2x - 6x" value={costs.installment2to6Cost} onChange={v => setCosts({...costs, installment2to6Cost: v})} />
                                <ConfigInput label="Crédito 7x - 12x" value={costs.installment7to12Cost} onChange={v => setCosts({...costs, installment7to12Cost: v})} />
                                <ConfigInput label="Crédito 13x - 18x" value={costs.installment13to18Cost} onChange={v => setCosts({...costs, installment13to18Cost: v})} />
                                <ConfigInput label="Custo Fixo/TX" value={costs.fixedCostPerTx} onChange={v => setCosts({...costs, fixedCostPerTx: v})} suffix="R$" />
                            </div>
                        </div>

                        {/* CARD: Funding & Tax */}
                        <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 overflow-hidden h-fit">
                            <div className="p-5 border-b border-brand-gray-100 bg-brand-gray-50">
                                <h3 className="font-bold text-brand-gray-900 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-green-600" /> Financeiro & Impostos
                                </h3>
                            </div>
                            <div className="p-6 space-y-4">
                                <ConfigInput label="Funding (D+0) / Mês" value={costs.anticipationCost} onChange={v => setCosts({...costs, anticipationCost: v})} suffix="% a.m." />
                                <ConfigInput label="ISS / PIS / COFINS" value={costs.taxRate} onChange={v => setCosts({...costs, taxRate: v})} />
                            </div>
                        </div>

                        {/* CARD: Financial Terms (Prazo Médio) */}
                        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-brand-gray-100 overflow-hidden">
                            <div className="p-5 border-b border-brand-gray-100 bg-brand-gray-50">
                                <h3 className="font-bold text-brand-gray-900 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-purple-600" /> Prazos Médios (Dias/Meses)
                                </h3>
                            </div>
                            <div className="p-6 grid grid-cols-2 md:grid-cols-5 gap-4">
                                <ConfigInput label="Débito" value={costs.financialTerms?.debit || 0} onChange={v => setCosts({...costs, financialTerms: {...costs.financialTerms!, debit: v}})} suffix="d" step={1} />
                                <ConfigInput label="Crédito 1x" value={costs.financialTerms?.credit1x || 1} onChange={v => setCosts({...costs, financialTerms: {...costs.financialTerms!, credit1x: v}})} suffix="m" step={0.5} />
                                <ConfigInput label="C. 2x - 6x" value={costs.financialTerms?.credit2to6 || 4} onChange={v => setCosts({...costs, financialTerms: {...costs.financialTerms!, credit2to6: v}})} suffix="m" step={0.5} />
                                <ConfigInput label="C. 7x - 12x" value={costs.financialTerms?.credit7to12 || 9.5} onChange={v => setCosts({...costs, financialTerms: {...costs.financialTerms!, credit7to12: v}})} suffix="m" step={0.5} />
                                <ConfigInput label="C. 13x - 18x" value={costs.financialTerms?.credit13to18 || 15.5} onChange={v => setCosts({...costs, financialTerms: {...costs.financialTerms!, credit13to18: v}})} suffix="m" step={0.5} />
                            </div>
                            <div className="p-4 bg-purple-50 text-[10px] text-purple-700 font-bold uppercase tracking-widest text-center border-t border-purple-100">
                                * Prazos usados para cálculo de Funding no Plano FULL.
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button 
                            onClick={handleSaveCosts}
                            className="bg-brand-gray-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-black transition-all transform active:scale-95 flex items-center gap-2"
                        >
                            <Save className="w-5 h-5" /> Salvar Configuração de Custos
                        </button>
                    </div>
                </div>
            )}

            {/* === TAB: RANGES === */}
            {activeTab === 'RANGES' && (
                <div className="bg-white rounded-2xl shadow-md border border-brand-gray-200 overflow-hidden animate-fade-in flex flex-col flex-1 h-full min-h-0">
                    <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center shrink-0">
                        <div className="flex flex-wrap gap-4 items-center">
                            <PagmotorsLogo variant="default" className="scale-75 origin-left" />
                            <div className="flex bg-white rounded-xl border p-0.5 shadow-inner">
                                <button onClick={() => setSelectedRangePlan('Full')} className={`px-5 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${selectedRangePlan === 'Full' ? 'bg-green-100 text-green-700 shadow-sm' : 'text-gray-400'}`}>Full</button>
                                <button onClick={() => setSelectedRangePlan('Simples')} className={`px-5 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${selectedRangePlan === 'Simples' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-400'}`}>Simples</button>
                            </div>
                            <div className="relative">
                                <select 
                                    value={selectedRangeId} 
                                    onChange={(e) => setSelectedRangeId(Number(e.target.value))} 
                                    className="border border-brand-gray-200 rounded-xl px-4 py-1.5 text-sm font-black text-brand-gray-800 bg-white outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all appearance-none pr-8"
                                >
                                    {appStore.TPV_RANGES.map(range => <option key={range.id} value={range.id}>{range.label}</option>)}
                                </select>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <ChevronDown size={14} className="rotate-0" />
                                </div>
                            </div>
                        </div>
                        <button onClick={handleSaveRanges} className="bg-brand-gray-900 text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg hover:bg-black transition-all transform active:scale-95"><Save size={16} /> Salvar Tabela</button>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-gray-50/30 p-6 custom-scrollbar">
                        <table className="w-full text-left border-separate border-spacing-0 bg-white rounded-2xl shadow-sm overflow-hidden border border-brand-gray-100">
                            <thead className="bg-brand-gray-900 text-white sticky top-0 z-10 text-[10px] font-black uppercase tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Modalidade</th>
                                    <th className="px-3 py-4 text-center">Mix(%)</th>
                                    {selectedRangePlan === 'Full' && <th className="px-3 py-4 text-center">Prazo(m)</th>}
                                    <th className="px-3 py-4 text-center">Custo Tot.</th>
                                    <th className="px-3 py-4 text-center">Spread</th>
                                    <th className="px-3 py-4 text-center">Taxa Final</th>
                                    <th className="px-6 py-4 text-center">MCF2</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-gray-50">
                                {selectedRangePlan === 'Full' ? (
                                    <>
                                        <FullModelRow label="Débito" type="debit" rateRanges={rateRanges} setRateRanges={setRateRanges} selectedRangeId={selectedRangeId} costs={costs} concentration={getConcentration('debit')} />
                                        <FullModelRow label="Crédito 1x" type="1x" rateRanges={rateRanges} setRateRanges={setRateRanges} selectedRangeId={selectedRangeId} costs={costs} concentration={getConcentration('1x')} />
                                        {Array.from({length: 17}).map((_, idx) => (
                                            <FullModelRow key={idx} label={`Crédito ${idx + 2}x`} type="installment" idx={idx} rateRanges={rateRanges} setRateRanges={setRateRanges} selectedRangeId={selectedRangeId} costs={costs} concentration={getConcentration(idx + 2)} />
                                        ))}
                                    </>
                                ) : (
                                    <>
                                        <SimplesModelRow label="Débito" type="debit" rateRanges={rateRanges} setRateRanges={setRateRanges} selectedRangeId={selectedRangeId} costs={costs} concentration={getConcentration('debit')} />
                                        <SimplesModelRow label="Crédito 1x" type="1x" rateRanges={rateRanges} setRateRanges={setRateRanges} selectedRangeId={selectedRangeId} costs={costs} concentration={getConcentration('1x')} />
                                        <SimplesModelRow label="Crédito 2x - 6x" type="2x-6x" rateRanges={rateRanges} setRateRanges={setRateRanges} selectedRangeId={selectedRangeId} costs={costs} concentration={getConcentration('2x-6x')} />
                                        <SimplesModelRow label="Crédito 7x - 12x" type="7x-12x" rateRanges={rateRanges} setRateRanges={setRateRanges} selectedRangeId={selectedRangeId} costs={costs} concentration={getConcentration('7x-12x')} />
                                        <SimplesModelRow label="Crédito 13x - 18x" type="13x-18x" rateRanges={rateRanges} setRateRanges={setRateRanges} selectedRangeId={selectedRangeId} costs={costs} concentration={getConcentration('13x-18x')} />
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

const ChevronDown = ({ className, size }: { className?: string, size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m6 9 6 6 6-6" />
    </svg>
);

export default ConfigTaxasPage;
