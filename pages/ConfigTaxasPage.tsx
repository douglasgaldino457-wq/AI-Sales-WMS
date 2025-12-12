
import React, { useState, useEffect } from 'react';
import { Settings, Save, Calculator, RefreshCw, TrendingUp, AlertCircle, DollarSign, Layers, PieChart, ArrowRight, CheckCircle2 } from 'lucide-react';
import { CurrencyInput } from '../components/CurrencyInput'; // Added Import

interface CostStructure {
    debitCost: number;
    creditSightCost: number;
    // Granular Installment Costs
    installment2to6Cost: number;
    installment7to12Cost: number;
    installment13to18Cost: number;
    anticipationCost: number; // Custo CDI/Funding a.m.
    taxRate: number; // Impostos (PIS/COFINS/ISS)
    fixedCostPerTx: number; // Custo fixo por transação
}

// Data structures for FULL Model (Individual Installments)
interface FullRow {
    id: string; // 'debit', '1x', '2x'...
    label: string;
    mix: number;
    concRate: number;
    propRate: number;
    termMonths: number; // Prazo médio de recebimento (para cálculo de custo)
}

interface FullSimulationData {
    tpv: number;
    rows: FullRow[];
}

// Data structures for SIMPLES Model
interface SimplesBucket {
    rate: number;
    concentration: number;
    avgTerm: number;
}

interface SimplesSimulationData {
    buckets: {
        debit: SimplesBucket;
        credit1x: SimplesBucket;
        credit2to6: SimplesBucket;
        credit7to12: SimplesBucket;
        credit13to18: SimplesBucket;
    };
    anticipationRate: number; 
}

// Helper for safe number parsing
const safeFloat = (value: string) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
};

const ConfigTaxasPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'FULL' | 'SIMPLES'>('FULL');
    const [successMsg, setSuccessMsg] = useState<string|null>(null);

    // --- CUSTOS GERAIS ---
    const [costs, setCosts] = useState<CostStructure>({
        debitCost: 0.50,
        creditSightCost: 1.80,
        installment2to6Cost: 2.20,
        installment7to12Cost: 2.40,
        installment13to18Cost: 2.60,
        anticipationCost: 0.90,
        taxRate: 11.25,
        fixedCostPerTx: 0.15
    });

    // --- HELPER TO GENERATE INITIAL FULL ROWS ---
    const generateInitialFullRows = (): FullRow[] => {
        const rows: FullRow[] = [];
        // Debit
        rows.push({ id: 'debit', label: 'Débito', mix: 20, concRate: 0.90, propRate: 0.99, termMonths: 0 });
        // Sight
        rows.push({ id: '1x', label: '1x', mix: 30, concRate: 2.90, propRate: 3.49, termMonths: 1 });
        // Installments 2x to 18x
        for (let i = 2; i <= 18; i++) {
            // Mock realistic curve
            const curve = 3.5 + (i * 0.8);
            rows.push({
                id: `${i}x`,
                label: `${i}x`,
                mix: i <= 12 ? 4 : 0.5, // Distribute mix mock
                concRate: parseFloat((curve - 0.5).toFixed(2)),
                propRate: parseFloat(curve.toFixed(2)),
                termMonths: (i + 1) / 2 // Average term approximation
            });
        }
        return rows;
    };

    // --- ESTADO MODELO FULL ---
    const [fullSim, setFullSim] = useState<FullSimulationData>({
        tpv: 50000,
        rows: generateInitialFullRows()
    });

    // --- ESTADO MODELO SIMPLES ---
    const [simplesSim, setSimplesSim] = useState<SimplesSimulationData>({
        anticipationRate: 2.99,
        buckets: {
            debit: { rate: 0.90, concentration: 10, avgTerm: 0 },
            credit1x: { rate: 2.90, concentration: 20, avgTerm: 1 },
            credit2to6: { rate: 3.50, concentration: 40, avgTerm: 4 },
            credit7to12: { rate: 4.50, concentration: 20, avgTerm: 9.5 },
            credit13to18: { rate: 5.90, concentration: 10, avgTerm: 15.5 },
        }
    });

    const [fullMetrics, setFullMetrics] = useState<any>({
        competitor: { takeRateVal: 0, takeRatePct: 0, mcf2Val: 0, mcf2Pct: 0, spread: 0 },
        pagmotors: { takeRateVal: 0, takeRatePct: 0, mcf2Val: 0, mcf2Pct: 0, spread: 0 }
    });

    const handleSaveCosts = () => {
        // Here we would typically save to backend
        setSuccessMsg("Custos de Interchange atualizados!");
        setTimeout(() => setSuccessMsg(null), 3000);
    };

    // --- CÁLCULO MODELO FULL (Linha a Linha) ---
    useEffect(() => {
        const calculateMetrics = (isCompetitor: boolean) => {
            const { tpv, rows } = fullSim;
            
            let totalRevenue = 0;
            let totalDirectCost = 0;

            rows.forEach(row => {
                const rate = isCompetitor ? row.concRate : row.propRate;
                const volume = tpv * (row.mix / 100);
                
                // Revenue
                totalRevenue += volume * (rate / 100);

                // Cost Calculation
                let interchange = 0;
                if (row.id === 'debit') interchange = costs.debitCost;
                else if (row.id === '1x') interchange = costs.creditSightCost;
                else {
                    const installmentNum = parseInt(row.id.replace('x', ''));
                    if (installmentNum <= 6) interchange = costs.installment2to6Cost;
                    else if (installmentNum <= 12) interchange = costs.installment7to12Cost;
                    else interchange = costs.installment13to18Cost;
                }

                const funding = costs.anticipationCost * row.termMonths;
                const mdrCostRate = interchange + funding;
                
                totalDirectCost += volume * (mdrCostRate / 100);
            });

            const takeRatePct = tpv > 0 ? (totalRevenue / tpv) * 100 : 0;
            const taxes = totalRevenue * (costs.taxRate / 100);
            const mcf2Val = totalRevenue - totalDirectCost - taxes;
            const mcf2Pct = tpv > 0 ? (mcf2Val / tpv) * 100 : 0;
            
            // Spread = AvgRate - AvgCost (simplificado)
            const avgCost = tpv > 0 ? (totalDirectCost / tpv) * 100 : 0;
            const spread = takeRatePct - avgCost;

            return { takeRateVal: totalRevenue, takeRatePct, mcf2Val, mcf2Pct, spread };
        };

        setFullMetrics({
            competitor: calculateMetrics(true),
            pagmotors: calculateMetrics(false)
        });
    }, [costs, fullSim]);

    // --- CÁLCULO TOTAIS SIMPLES ---
    const simplesTotals = React.useMemo(() => {
        let totalConc = 0;
        let weightedSpread = 0;
        let weightedMCF2 = 0;

        (Object.keys(simplesSim.buckets) as Array<keyof typeof simplesSim.buckets>).forEach(key => {
            const bucket = simplesSim.buckets[key];
            const weight = bucket.concentration / 100;
            totalConc += bucket.concentration;

            let interchange = 0;
            if (key === 'debit') interchange = costs.debitCost;
            else if (key === 'credit1x') interchange = costs.creditSightCost;
            else if (key === 'credit2to6') interchange = costs.installment2to6Cost;
            else if (key === 'credit7to12') interchange = costs.installment7to12Cost;
            else if (key === 'credit13to18') interchange = costs.installment13to18Cost;

            const funding = costs.anticipationCost * bucket.avgTerm;
            const totalCost = interchange + funding;
            const spread = bucket.rate - totalCost;

            const taxes = bucket.rate * (costs.taxRate / 100);
            const mcf2 = bucket.rate - totalCost - taxes;

            weightedSpread += spread * weight;
            weightedMCF2 += mcf2 * weight;
        });

        return {
            totalConc,
            totalWeightedSpread: weightedSpread,
            mcf2: weightedMCF2
        };
    }, [simplesSim, costs]);

    // --- COMPONENT: SimplesRow ---
    const SimplesRow = ({ label, bucketKey }: { label: string, bucketKey: keyof typeof simplesSim.buckets }) => {
        const bucket = simplesSim.buckets[bucketKey];
        
        let interchange = 0;
        if (bucketKey === 'debit') interchange = costs.debitCost;
        else if (bucketKey === 'credit1x') interchange = costs.creditSightCost;
        else if (bucketKey === 'credit2to6') interchange = costs.installment2to6Cost;
        else if (bucketKey === 'credit7to12') interchange = costs.installment7to12Cost;
        else if (bucketKey === 'credit13to18') interchange = costs.installment13to18Cost;

        const funding = costs.anticipationCost * bucket.avgTerm;
        const totalCost = interchange + funding;
        
        const spread = bucket.rate - totalCost;
        
        const updateBucket = (field: keyof SimplesBucket, val: number) => {
            setSimplesSim(prev => ({
                ...prev,
                buckets: {
                    ...prev.buckets,
                    [bucketKey]: { ...prev.buckets[bucketKey], [field]: val }
                }
            }));
        };

        return (
            <tr className="hover:bg-brand-gray-50 border-b border-brand-gray-100 last:border-0 transition-colors">
                <td className="px-4 py-3 text-sm font-bold text-brand-gray-700">{label}</td>
                <td className="px-4 py-2 text-center">
                    <div className="relative inline-block w-20">
                        <input 
                            type="number" step="0.01"
                            className="w-full text-center border border-transparent hover:border-blue-200 rounded py-1.5 text-sm font-bold text-blue-700 bg-transparent hover:bg-blue-50 focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            value={bucket.rate}
                            onChange={(e) => updateBucket('rate', safeFloat(e.target.value))}
                        />
                        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-blue-300 pointer-events-none">%</span>
                    </div>
                </td>
                <td className="px-4 py-2 text-center">
                    <div className="relative inline-block w-16">
                        <input 
                            type="number" step="1"
                            className="w-full text-center border border-transparent hover:border-yellow-200 rounded py-1.5 text-sm font-medium text-yellow-800 bg-transparent hover:bg-yellow-50 focus:bg-yellow-50 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                            value={bucket.concentration}
                            onChange={(e) => updateBucket('concentration', safeFloat(e.target.value))}
                        />
                        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-yellow-400 pointer-events-none">%</span>
                    </div>
                </td>
                <td className="px-4 py-3 text-right text-xs text-gray-500 font-mono">
                    {totalCost.toFixed(2)}%
                </td>
                <td className={`px-4 py-3 text-right text-sm font-mono font-bold ${spread < 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {spread.toFixed(2)}%
                </td>
            </tr>
        );
    };

    // --- REUSABLE CARD INPUT COMPONENT ---
    const ConfigCard = ({ label, value, onChange }: { label: string, value: number, onChange: (val: number) => void }) => (
        <div className="bg-white border border-brand-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-all group">
            <label className="block text-[10px] font-bold text-brand-gray-500 uppercase tracking-wide mb-1.5 truncate group-hover:text-brand-primary transition-colors" title={label}>
                {label}
            </label>
            <div className="flex items-center justify-center">
                <input 
                    type="number" step="0.01"
                    value={value}
                    onChange={(e) => onChange(safeFloat(e.target.value))}
                    className="w-full text-center text-xl font-bold text-brand-gray-900 bg-transparent outline-none p-0 focus:text-brand-primary transition-colors"
                />
            </div>
        </div>
    );

    // --- HANDLERS ---
    const updateRow = (index: number, field: keyof FullRow, value: number) => {
        const newRows = [...fullSim.rows];
        newRows[index] = { ...newRows[index], [field]: value };
        setFullSim({ ...fullSim, rows: newRows });
    };

    const formatPct = (val: number) => val.toFixed(2).replace('.', ',') + '%';

    // Total Mix Check
    const totalMix = fullSim.rows.reduce((acc, row) => acc + row.mix, 0);

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 relative">
            {/* Success Toast */}
            {successMsg && (
                <div className="fixed top-4 right-4 z-50 animate-fade-in-down">
                    <div className="bg-brand-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
                        <CheckCircle2 className="text-green-400 w-5 h-5" />
                        <span className="font-medium">{successMsg}</span>
                    </div>
                </div>
            )}

            <header className="flex flex-col md:flex-row justify-between items-end gap-4 no-print">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <Settings className="w-6 h-6 text-brand-primary" />
                        Configuração de Taxas
                    </h1>
                    <p className="text-brand-gray-600 mt-1 text-sm">Definição de custos base e simulação de modelos comerciais.</p>
                </div>
                <div className="flex bg-brand-gray-200 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('FULL')}
                        className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'FULL' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                    >
                        <Layers className="w-4 h-4 mr-2" />
                        Modelo Full
                    </button>
                    <button 
                        onClick={() => setActiveTab('SIMPLES')}
                        className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'SIMPLES' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                    >
                        <PieChart className="w-4 h-4 mr-2" />
                        Modelo Simples
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* LEFT: Configuração de Custos (Comum) - Coluna Estreita */}
                <div className="lg:col-span-3 space-y-6 no-print">
                    <div className="bg-brand-gray-50 rounded-xl shadow-inner border border-brand-gray-200 p-5">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-brand-gray-900 flex items-center gap-2 text-sm uppercase tracking-wide">
                                <TrendingUp className="w-4 h-4 text-brand-primary" />
                                Custos Interchange
                            </h3>
                            <button 
                                onClick={handleSaveCosts}
                                className="text-brand-primary hover:bg-brand-primary/10 p-1.5 rounded transition-colors active:scale-90" 
                                title="Salvar Custos"
                            >
                                <Save className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            <ConfigCard 
                                label="Interchange Débito (%)" 
                                value={costs.debitCost} 
                                onChange={(val) => setCosts({...costs, debitCost: val})} 
                            />
                            
                            <ConfigCard 
                                label="Interchange Crédito 1x (%)" 
                                value={costs.creditSightCost} 
                                onChange={(val) => setCosts({...costs, creditSightCost: val})} 
                            />
                            
                            <div className="pt-2">
                                <label className="block text-xs font-bold text-brand-gray-700 mb-2 pl-1">Interchange Parcelado (%)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <ConfigCard label="2x-6x" value={costs.installment2to6Cost} onChange={(val) => setCosts({...costs, installment2to6Cost: val})} />
                                    <ConfigCard label="7x-12x" value={costs.installment7to12Cost} onChange={(val) => setCosts({...costs, installment7to12Cost: val})} />
                                    <ConfigCard label="13x-18x" value={costs.installment13to18Cost} onChange={(val) => setCosts({...costs, installment13to18Cost: val})} />
                                </div>
                            </div>

                            <div className="border-t border-brand-gray-200 my-4"></div>

                            <div className="grid grid-cols-2 gap-2">
                                <ConfigCard label="Funding (a.m.)" value={costs.anticipationCost} onChange={(val) => setCosts({...costs, anticipationCost: val})} />
                                <ConfigCard label="Impostos" value={costs.taxRate} onChange={(val) => setCosts({...costs, taxRate: val})} />
                            </div>
                        </div>
                    </div>

                    {/* Results Summary Mini */}
                    <div className="bg-brand-gray-900 text-white rounded-xl p-5 shadow-lg">
                        <h4 className="text-xs font-bold uppercase text-brand-gray-400 mb-4">Resultado Pagmotors</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                <span className="text-sm">Take Rate</span>
                                <span className="font-bold text-lg">{formatPct(fullMetrics.pagmotors.takeRatePct)}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                <span className="text-sm">Spread</span>
                                <span className="font-bold text-lg text-yellow-400">{formatPct(fullMetrics.pagmotors.spread)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm">MCF2</span>
                                <span className="font-bold text-lg text-green-400">{formatPct(fullMetrics.pagmotors.mcf2Pct)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Simulator Area */}
                <div className="lg:col-span-9 space-y-6">
                    
                    {/* --- MODELO FULL SIMULATOR --- */}
                    {activeTab === 'FULL' && (
                        <div className="bg-white rounded-xl shadow-md border border-brand-gray-200 overflow-hidden animate-fade-in flex flex-col h-full">
                            {/* Header */}
                            <div className="bg-brand-gray-50 p-4 border-b border-brand-gray-200 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <h3 className="font-bold text-brand-gray-900 flex items-center gap-2">
                                        <Calculator className="w-5 h-5 text-brand-primary" />
                                        Simulador Full (Individual)
                                    </h3>
                                    <div className="h-6 w-px bg-brand-gray-300"></div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-brand-gray-500 uppercase">TPV Simulado:</span>
                                        <div className="relative w-32">
                                            <CurrencyInput
                                                value={fullSim.tpv} 
                                                onChange={val => setFullSim({...fullSim, tpv: val})} 
                                                className="w-full border border-brand-gray-300 rounded py-1 text-xs font-bold focus:border-brand-primary outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className={`text-xs font-bold px-3 py-1 rounded-full ${Math.abs(totalMix - 100) < 0.1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        Mix Total: {totalMix.toFixed(1)}%
                                    </div>
                                    <button onClick={() => setFullSim({...fullSim, rows: generateInitialFullRows()})} className="text-xs text-brand-gray-500 hover:text-brand-primary flex items-center gap-1">
                                        <RefreshCw className="w-3 h-3" /> Resetar
                                    </button>
                                </div>
                            </div>

                            {/* SPLIT VIEW: Market Data vs Proposal */}
                            <div className="flex flex-1 divide-x divide-brand-gray-200">
                                
                                {/* LEFT QUADRANT: Market Data (Mix & Competitor) */}
                                <div className="w-1/2 p-4 bg-gray-50/50">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                        <Layers className="w-4 h-4" />
                                        Cenário de Mercado
                                    </h4>
                                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                                        <table className="w-full text-xs">
                                            <thead className="bg-gray-100 text-gray-600 font-bold border-b border-gray-200">
                                                <tr>
                                                    <th className="px-3 py-2 text-left w-16">Parc.</th>
                                                    <th className="px-3 py-2 text-center">Mix (%)</th>
                                                    <th className="px-3 py-2 text-center text-gray-700">Taxa Conc. (%)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {fullSim.rows.map((row, idx) => (
                                                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-3 py-2 font-bold text-gray-700">{row.label}</td>
                                                        <td className="px-3 py-1">
                                                            <input 
                                                                type="number" step="0.1"
                                                                className="w-full text-center bg-transparent hover:bg-yellow-50 focus:bg-yellow-50 border border-transparent hover:border-yellow-200 rounded py-1 font-medium text-yellow-800 focus:ring-1 focus:ring-yellow-400 outline-none transition-all"
                                                                value={row.mix}
                                                                onChange={(e) => updateRow(idx, 'mix', safeFloat(e.target.value))}
                                                            />
                                                        </td>
                                                        <td className="px-3 py-1">
                                                            <input 
                                                                type="number" step="0.01"
                                                                className="w-full text-center border border-transparent hover:border-gray-200 rounded py-1 text-gray-600 focus:border-gray-400 bg-transparent hover:bg-gray-50 focus:bg-white outline-none transition-all"
                                                                value={row.concRate}
                                                                onChange={(e) => updateRow(idx, 'concRate', safeFloat(e.target.value))}
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* RIGHT QUADRANT: Proposal (Pagmotors) */}
                                <div className="w-1/2 p-4 bg-white">
                                    <h4 className="text-xs font-bold text-brand-primary uppercase mb-3 flex items-center gap-2">
                                        <ArrowRight className="w-4 h-4" />
                                        Proposta Pagmotors
                                    </h4>
                                    <div className="border border-brand-primary/20 rounded-lg overflow-hidden bg-white shadow-sm">
                                        <table className="w-full text-xs">
                                            <thead className="bg-brand-primary/5 text-brand-primary font-bold border-b border-brand-primary/10">
                                                <tr>
                                                    <th className="px-3 py-2 text-left w-16">Parc.</th>
                                                    <th className="px-3 py-2 text-center">Taxa Prop. (%)</th>
                                                    <th className="px-3 py-2 text-right">Spread Est.</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-brand-gray-100">
                                                {fullSim.rows.map((row, idx) => {
                                                    // Calculate estimated cost for this row to show spread preview
                                                    let interchange = 0;
                                                    if (row.id === 'debit') interchange = costs.debitCost;
                                                    else if (row.id === '1x') interchange = costs.creditSightCost;
                                                    else {
                                                        const inst = parseInt(row.id.replace('x',''));
                                                        if (inst <= 6) interchange = costs.installment2to6Cost;
                                                        else if (inst <= 12) interchange = costs.installment7to12Cost;
                                                        else interchange = costs.installment13to18Cost;
                                                    }

                                                    let cost = interchange + (costs.anticipationCost * row.termMonths);
                                                    let spread = row.propRate - cost;
                                                    
                                                    return (
                                                        <tr key={row.id} className="hover:bg-brand-gray-50 transition-colors">
                                                            <td className="px-3 py-2 font-bold text-brand-gray-800">{row.label}</td>
                                                            <td className="px-3 py-1">
                                                                <input 
                                                                    type="number" step="0.01"
                                                                    className="w-full text-center border border-transparent hover:border-brand-primary/30 rounded py-1 font-bold text-brand-primary bg-transparent hover:bg-brand-primary/5 focus:bg-white focus:ring-1 focus:ring-brand-primary outline-none transition-all"
                                                                    value={row.propRate}
                                                                    onChange={(e) => updateRow(idx, 'propRate', safeFloat(e.target.value))}
                                                                />
                                                            </td>
                                                            <td className={`px-3 py-2 text-right font-mono font-medium ${spread < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                                {spread.toFixed(2)}%
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}

                    {/* --- MODELO SIMPLES SIMULATOR --- */}
                    {activeTab === 'SIMPLES' && (
                        <div className="bg-white rounded-xl shadow-md border border-brand-gray-200 overflow-hidden animate-fade-in h-full flex flex-col">
                            {/* Existing Simples Content */}
                            <div className="bg-blue-600 p-4 border-b border-blue-700 flex justify-between items-center text-white">
                                <h3 className="font-bold flex items-center gap-2">
                                    <PieChart className="w-5 h-5 text-white" />
                                    Simulador Modelo Simples (Agenda)
                                </h3>
                                <button onClick={() => setSimplesSim({...simplesSim, anticipationRate: 2.99})} className="text-xs text-blue-200 hover:text-white flex items-center gap-1">
                                    <RefreshCw className="w-3 h-3" /> Resetar
                                </button>
                            </div>

                            <div className="p-6">
                                {/* Header / Legend */}
                                <div className="flex gap-4 mb-4 items-center bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-blue-800 uppercase tracking-wide mb-1">Tx de Antecipação (Cobrada)</label>
                                        <input 
                                            type="number" step="0.01" 
                                            className="w-32 bg-white border border-blue-300 rounded px-2 py-1 text-sm font-bold text-blue-900 outline-none focus:ring-1 focus:ring-blue-500"
                                            value={simplesSim.anticipationRate}
                                            onChange={(e) => setSimplesSim({...simplesSim, anticipationRate: safeFloat(e.target.value)})}
                                        />
                                        <span className="text-xs ml-1 text-blue-600">% a.m.</span>
                                    </div>
                                    <div className="text-xs text-gray-500 italic max-w-xs text-right">
                                        * No Simples, o MDR inclui o custo da antecipação ponderada pelo prazo.
                                    </div>
                                </div>

                                {/* TABLE STRUCTURE from Image */}
                                <div className="overflow-x-auto border border-brand-gray-200 rounded-lg shadow-sm">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-brand-gray-100 text-xs text-gray-500 uppercase font-bold border-b border-brand-gray-200">
                                                <th className="px-4 py-3 bg-blue-100 text-blue-800 border-b border-blue-200 w-1/5">Simples (Agenda)</th>
                                                <th className="px-4 py-3 bg-blue-50 text-blue-700 border-b border-blue-200 text-center w-1/5">Taxa (%)</th>
                                                <th className="px-4 py-3 bg-yellow-100 text-yellow-800 border-b border-yellow-200 text-center w-1/5">Concentração</th>
                                                <th className="px-4 py-3 border-b border-brand-gray-200 text-right w-1/5">Custo MDR</th>
                                                <th className="px-4 py-3 border-b border-brand-gray-200 text-right w-1/5">Spread Pond.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white">
                                            <SimplesRow label="Débito" bucketKey="debit" />
                                            <SimplesRow label="Crédito 1x" bucketKey="credit1x" />
                                            <SimplesRow label="2x - 6x" bucketKey="credit2to6" />
                                            <SimplesRow label="7x - 12x" bucketKey="credit7to12" />
                                            <SimplesRow label="13x - 18x" bucketKey="credit13to18" />
                                        </tbody>
                                        {/* FOOTER TOTALS */}
                                        <tfoot className="bg-brand-gray-50 border-t border-brand-gray-200">
                                            <tr>
                                                <td className="px-4 py-3 text-xs font-bold text-gray-900 uppercase">Totais</td>
                                                <td className="px-4 py-3"></td>
                                                <td className={`px-4 py-3 text-center text-xs font-bold ${Math.abs(simplesTotals.totalConc - 100) > 0.1 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {simplesTotals.totalConc.toFixed(0)}%
                                                    {Math.abs(simplesTotals.totalConc - 100) > 0.1 && <AlertCircle className="inline w-3 h-3 ml-1" />}
                                                </td>
                                                <td className="px-4 py-3 text-right text-xs text-gray-400 font-mono">
                                                    -
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm font-bold text-brand-primary font-mono bg-white border-l border-brand-gray-200">
                                                    {simplesTotals.totalWeightedSpread.toFixed(2)}%
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {/* Validation Footer / Alerts */}
                                <div className="mt-4 flex justify-between items-center bg-brand-gray-50 p-3 rounded-lg border border-brand-gray-200">
                                    <div className="flex gap-4 text-xs">
                                        <div className={`font-bold ${simplesTotals.mcf2 < 0.10 ? 'text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded' : 'text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded'}`}>
                                            MCF2 Estimado: {simplesTotals.mcf2.toFixed(2)}%
                                            {simplesTotals.mcf2 < 0.10 && <span className="ml-1 text-[9px] uppercase">(Mínima = 0,10%)</span>}
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-gray-400 italic">
                                        * Spread não pode ser negativo individualmente.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default ConfigTaxasPage;
