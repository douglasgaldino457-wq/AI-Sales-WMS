
import React, { useState, useEffect, useMemo } from 'react';
import { ManualDemand } from '../types';
import { appStore } from '../services/store';
import { 
    CheckCircle2, X, Search, Filter, AlertTriangle, FileText, ChevronRight, 
    Calculator, DollarSign, ArrowRight, User, Eye, Image as ImageIcon, Edit3, Download, Layers, PieChart,
    Lock, Unlock, Save, RotateCcw, Loader2
} from 'lucide-react';

const MesaNegociacaoPage: React.FC = () => {
    const [requests, setRequests] = useState<ManualDemand[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<ManualDemand | null>(null);
    const [filterStatus, setFilterStatus] = useState('Pendente'); 
    const [showEvidence, setShowEvidence] = useState(false);
    
    // Edit Mode State for Approved Requests
    const [isEditing, setIsEditing] = useState(false);
    const [processingAction, setProcessingAction] = useState<'approve' | 'reject' | 'save' | null>(null);

    // Calculator & Context State
    const [calcState, setCalcState] = useState({
        spread: 0.85, // Spread Alvo padrão mais agressivo para cálculo automático
        baseCostDebit: 0.40,
        baseCostCredit: 1.80, // Custo base crédito a vista
        baseCostInstallment: 2.20, // Custo base parcelado médio
        taxRate: 11.25, // Impostos
        autoAdjusted: false
    });

    // Simples Plan Logic
    const [anticipationRate, setAnticipationRate] = useState(2.99); // Taxa de antecipação (apenas Simples)

    // Helper to determine plan type
    const getPlanType = (req: ManualDemand): 'Full' | 'Simples' => {
        if (req.description?.toLowerCase().includes('simples')) return 'Simples';
        return 'Full'; 
    };

    const planType = selectedRequest ? getPlanType(selectedRequest) : 'Full';

    // Editable Approved Rates (Counter-Proposal State)
    const [finalRates, setFinalRates] = useState<Record<string, number>>({});
    
    // Concentration Mix State (Percentage per row)
    const [mixValues, setMixValues] = useState<Record<string, number>>({});

    useEffect(() => {
        const pricingDemands = appStore.getDemands().filter(d => 
            (d.type.includes('Negociação') || d.type.includes('Taxa')) && d.pricingData
        );
        setRequests(pricingDemands);
    }, []);

    // --- STEP 1: INITIALIZE SPREAD & MIX BASED ON REQUEST CONTEXT ---
    useEffect(() => {
        if (selectedRequest && selectedRequest.pricingData) {
            const context = selectedRequest.pricingData.context;
            
            // Adjust Target Spread based on Volume (TPV) automatically when loading request
            let targetSpread = 0.85;
            if (context) {
                if (context.potentialRevenue > 80000) targetSpread = 0.60;
                else if (context.potentialRevenue > 40000) targetSpread = 0.75;
            }
            setCalcState(prev => ({ ...prev, spread: targetSpread }));
            
            // Reset Edit Mode when switching requests
            setIsEditing(false);
        }
    }, [selectedRequest]);

    // --- STEP 2: REACTIVE RATES & MIX CALCULATION (Listens to Spread Changes) ---
    useEffect(() => {
        if (selectedRequest) {
            // Check if it's already approved to load existing approved rates instead of calculating
            const isApproved = selectedRequest.status === 'Aprovado Pricing' || selectedRequest.status === 'Concluído';
            
            const suggestion: Record<string, number> = {};
            const initialMix: Record<string, number> = {};
            const currentPlan = getPlanType(selectedRequest);
            const targetSpread = calcState.spread;

            // Define keys based on plan
            let keys: string[] = [];
            if (currentPlan === 'Full') {
                keys = ['debit', '1x', ...Array.from({length: 11}, (_, i) => `${i+2}x`)];
            } else {
                keys = ['debit', '1x', '2x-6x', '7x-12x', '13x-18x'];
            }

            if (isApproved && selectedRequest.pricingData?.approvedRates) {
                // LOAD EXISTING APPROVED RATES
                const approved = selectedRequest.pricingData.approvedRates;
                
                // Map back logic (Simplified for demo)
                keys.forEach(key => {
                    if (key === 'debit') suggestion[key] = approved.debit;
                    else if (key === '1x') suggestion[key] = approved.credit1x;
                    else if (key.includes('12x') || key === '7x-12x') suggestion[key] = approved.credit12x;
                    else if (currentPlan === 'Full') {
                         // Interpolate for full view from stored endpoints
                         const i = parseInt(key.replace('x',''));
                         const start = approved.credit1x;
                         const end = approved.credit12x;
                         suggestion[key] = start + ((end - start) / 11) * (i - 1);
                    } else {
                        // Bucket logic estimate
                        if(key === '2x-6x') suggestion[key] = approved.credit1x + 2.5; 
                        if(key === '13x-18x') suggestion[key] = approved.credit12x + 3.0; 
                    }
                });

            } else {
                // CALCULATE NEW SUGGESTION (Pending Status)
                if (currentPlan === 'Full') {
                    suggestion['debit'] = calcState.baseCostDebit + targetSpread;
                    initialMix['debit'] = 40; 
                    suggestion['1x'] = calcState.baseCostCredit + targetSpread;
                    initialMix['1x'] = 30; 
                    
                    const installmentShare = 30 / 11;
                    for (let i = 2; i <= 12; i++) {
                        const estimatedCost = calcState.baseCostInstallment + (i * 0.6);
                        suggestion[`${i}x`] = estimatedCost + targetSpread;
                        initialMix[`${i}x`] = parseFloat(installmentShare.toFixed(2));
                    }
                } else {
                    suggestion['debit'] = calcState.baseCostDebit + targetSpread;
                    initialMix['debit'] = 40;
                    suggestion['1x'] = calcState.baseCostCredit + targetSpread; 
                    initialMix['1x'] = 30;
                    suggestion['2x-6x'] = 3.50 + targetSpread; 
                    initialMix['2x-6x'] = 15;
                    suggestion['7x-12x'] = 4.50 + targetSpread;
                    initialMix['7x-12x'] = 10;
                    suggestion['13x-18x'] = 5.50 + targetSpread;
                    initialMix['13x-18x'] = 5;
                    setAnticipationRate(2.99);
                }
            }

            // Round to 2 decimals
            Object.keys(suggestion).forEach(key => {
                suggestion[key] = Math.round(suggestion[key] * 100) / 100;
            });

            setFinalRates(suggestion);
            
            // Only set mix if it's empty
            if (Object.keys(mixValues).length === 0) {
                setMixValues(initialMix);
            }
        }
    }, [calcState.spread, selectedRequest, planType]); 

    const filteredRequests = requests.filter(r => {
        if (filterStatus === 'Todos') return true;
        if (filterStatus === 'Pendente') return r.status === 'Pendente' || r.status === 'Em Análise';
        return r.status === filterStatus;
    });

    // --- FINANCIAL COMPARISON CALCULATIONS ---
    const comparisonData = useMemo(() => {
        if (!selectedRequest || !selectedRequest.pricingData) return null;

        const tpv = selectedRequest.pricingData.context?.potentialRevenue || 50000;
        const concRatesObj = selectedRequest.pricingData.competitorRates;
        
        const getCompetitorRate = (key: string) => {
            if (key === 'debit') return concRatesObj.debit;
            if (key === '1x') return concRatesObj.credit1x;
            if (planType === 'Simples') {
                if (key === '2x-6x') return concRatesObj.credit1x + 2.5;
                if (key === '7x-12x') return concRatesObj.credit12x;
                if (key === '13x-18x') return concRatesObj.credit12x + 4;
            } else {
                const installmentNum = parseInt(key.replace('x', ''));
                if (!isNaN(installmentNum)) {
                    const start = concRatesObj.credit1x;
                    const end = concRatesObj.credit12x;
                    return start + ((end - start) / 11) * (installmentNum - 1);
                }
            }
            return 0;
        };

        let concWeightedAvg = 0;
        let pagWeightedAvg = 0;
        let totalMix = 0;

        Object.keys(finalRates).forEach(key => {
            const weight = (mixValues[key] || 0) / 100;
            totalMix += weight;
            pagWeightedAvg += (finalRates[key] || 0) * weight;
            const concRate = getCompetitorRate(key);
            concWeightedAvg += concRate * weight;
        });

        if (totalMix > 0) {
            concWeightedAvg = concWeightedAvg / totalMix;
            pagWeightedAvg = pagWeightedAvg / totalMix;
        }

        const concTakeRateVal = tpv * (concWeightedAvg / 100);
        const concSpread = 0.80; 
        const concCostVal = concTakeRateVal - (tpv * (concSpread / 100)); 
        const concMcf2Val = concTakeRateVal - concCostVal - (concTakeRateVal * (11.25/100)); 
        const concMcf2Pct = (concMcf2Val / tpv) * 100;

        const pagTakeRateVal = tpv * (pagWeightedAvg / 100);
        let pagWeightedCost = 0;
        Object.keys(finalRates).forEach(key => {
            const weight = (mixValues[key] || 0) / 100;
            let cost = 0;
            if (key === 'debit') cost = calcState.baseCostDebit;
            else if (key === '1x') cost = calcState.baseCostCredit;
            else cost = calcState.baseCostInstallment;
            pagWeightedCost += cost * weight;
        });
        if (totalMix > 0) pagWeightedCost = pagWeightedCost / totalMix;

        const pagCostVal = tpv * (pagWeightedCost / 100);
        const pagSpreadVal = pagTakeRateVal - pagCostVal;
        const pagSpreadPct = (pagSpreadVal / tpv) * 100;
        const pagMcf2Val = pagSpreadVal - (pagTakeRateVal * (calcState.taxRate/100));
        const pagMcf2Pct = (pagMcf2Val / tpv) * 100;

        return {
            conc: { takeRateVal: concTakeRateVal, takeRatePct: concWeightedAvg, mcf2Val: concMcf2Val, mcf2Pct: concMcf2Pct, spread: concSpread },
            pag: { takeRateVal: pagTakeRateVal, takeRatePct: pagWeightedAvg, mcf2Val: pagMcf2Val, mcf2Pct: pagMcf2Pct, spread: pagSpreadPct }
        };
    }, [selectedRequest, finalRates, mixValues, planType, calcState]);


    const handleApprove = () => {
        if (!selectedRequest) return;
        setProcessingAction('approve');
        
        setTimeout(() => {
            const updatedRequest: ManualDemand = {
                ...selectedRequest,
                status: 'Aprovado Pricing',
                result: 'Proposta aprovada com base na análise de margem e spread alvo.',
                pricingData: {
                    ...selectedRequest.pricingData!,
                    approvedRates: {
                        debit: finalRates['debit'],
                        credit1x: finalRates['1x'],
                        credit12x: finalRates['12x'] || finalRates['13x-18x'] || 0
                    }
                }
            };

            appStore.updateDemand(updatedRequest);
            
            const updatedList = requests.map(r => r.id === updatedRequest.id ? updatedRequest : r);
            setRequests(updatedList);
            setSelectedRequest(updatedRequest); // Update selection to show new state
            setProcessingAction(null);
        }, 1000);
    };

    const handleReject = () => {
        if (!selectedRequest) return;
        setProcessingAction('reject');
        
        setTimeout(() => {
            const updatedRequest: ManualDemand = {
                ...selectedRequest,
                status: 'Rejeitado',
                result: 'Taxas reprovadas. Margem insuficiente.'
            };
            appStore.updateDemand(updatedRequest);
            const updatedList = requests.map(r => r.id === updatedRequest.id ? updatedRequest : r);
            setRequests(updatedList);
            setSelectedRequest(null);
            setProcessingAction(null);
        }, 1000);
    };

    const handleSaveEdit = () => {
        if (!selectedRequest) return;
        setProcessingAction('save');
        
        setTimeout(() => {
            const now = new Date();
            const logEntry = `\n[Edição: Usuário Atual em ${now.toLocaleDateString()} ${now.toLocaleTimeString()}]`;
            
            const updatedRequest: ManualDemand = {
                ...selectedRequest,
                result: (selectedRequest.result || '') + logEntry,
                pricingData: {
                    ...selectedRequest.pricingData!,
                    approvedRates: {
                        debit: finalRates['debit'],
                        credit1x: finalRates['1x'],
                        credit12x: finalRates['12x'] || finalRates['13x-18x'] || 0
                    }
                }
            };
            
            appStore.updateDemand(updatedRequest);
            const updatedList = requests.map(r => r.id === updatedRequest.id ? updatedRequest : r);
            setRequests(updatedList);
            setSelectedRequest(updatedRequest);
            setIsEditing(false);
            setProcessingAction(null);
        }, 800);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        // Trigger a re-effect to reload original rates
        if (selectedRequest) setSelectedRequest({...selectedRequest});
    };

    const isLocked = selectedRequest && (selectedRequest.status === 'Aprovado Pricing' || selectedRequest.status === 'Concluído');
    const canEdit = !isLocked || isEditing;

    return (
        <div className="flex h-[calc(100vh-2rem)] gap-6">
            {/* LEFT: LIST */}
            <div className="w-1/3 flex flex-col bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden">
                <div className="p-4 border-b border-brand-gray-100 bg-brand-gray-50/50">
                    <h2 className="font-bold text-brand-gray-900 text-lg mb-2">Mesa de Negociação</h2>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {['Pendente', 'Aprovado Pricing', 'Rejeitado', 'Todos'].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border
                                    ${filterStatus === status 
                                        ? 'bg-brand-gray-900 text-white border-brand-gray-900' 
                                        : 'bg-white text-brand-gray-600 border-brand-gray-200 hover:bg-brand-gray-50'}
                                `}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto divide-y divide-brand-gray-100">
                    {filteredRequests.length === 0 ? (
                        <div className="p-8 text-center text-brand-gray-400 text-sm">Nenhuma solicitação encontrada.</div>
                    ) : (
                        filteredRequests.map(req => (
                            <div 
                                key={req.id}
                                onClick={() => setSelectedRequest(req)}
                                className={`p-4 cursor-pointer hover:bg-brand-gray-50 transition-colors border-l-4
                                    ${selectedRequest?.id === req.id ? 'bg-brand-gray-50 border-l-brand-primary' : 'border-l-transparent'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-brand-gray-900 text-sm">{req.clientName}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${getPlanType(req) === 'Full' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{getPlanType(req)}</span>
                                </div>
                                <div className="text-xs text-brand-gray-500 mb-2 truncate">{req.description}</div>
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="flex items-center gap-1 text-brand-gray-400">
                                        <User className="w-3 h-3" /> {req.requester}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full font-bold
                                        ${req.status.includes('Aprovado') ? 'bg-green-100 text-green-700' : 
                                          req.status === 'Rejeitado' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}
                                    `}>
                                        {req.status}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT: WORKSPACE */}
            <div className="flex-1 bg-white rounded-xl shadow-lg border border-brand-gray-200 flex flex-col overflow-hidden relative">
                {selectedRequest ? (
                    <>
                        <div className="bg-brand-gray-900 text-white p-6 shrink-0 flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold">{selectedRequest.clientName}</h2>
                                <p className="text-brand-gray-400 text-sm mt-1 max-w-md">Solicitação via Cotação. Adquirente: Stone. Plano: {planType}.</p>
                                {selectedRequest.pricingData?.context && (
                                    <div className="flex gap-4 mt-2 text-xs">
                                        <div className="bg-brand-gray-800 px-3 py-1 rounded border border-brand-gray-700">
                                            Potencial: <span className="font-bold text-white">R$ {selectedRequest.pricingData.context.potentialRevenue.toLocaleString('pt-BR')}</span>
                                        </div>
                                        <div className="bg-brand-gray-800 px-3 py-1 rounded border border-brand-gray-700">
                                            Mínimo: <span className="font-bold text-white">R$ {selectedRequest.pricingData.context.minAgreed.toLocaleString('pt-BR')}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="text-right">
                                <span className="block text-sm opacity-60">Solicitante</span>
                                <span className="font-bold text-lg">{selectedRequest.requester}</span>
                                <button 
                                    onClick={() => setShowEvidence(true)}
                                    className="mt-2 bg-brand-primary hover:bg-brand-dark px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-colors ml-auto shadow-sm"
                                >
                                    <ImageIcon className="w-3 h-3" /> Ver Evidência
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            
                            {/* RATES GRID */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* CARD 1: COMPETITOR (Read Only + Mix Display) */}
                                <div className="bg-red-50 rounded-xl border border-red-100 overflow-hidden flex flex-col">
                                    <div className="p-4 border-b border-red-100 flex items-center gap-2 text-red-800">
                                        <AlertTriangle className="w-4 h-4" />
                                        <h3 className="font-bold text-sm uppercase">Concorrência (Base Cálculo)</h3>
                                    </div>
                                    <div className="p-4 flex-1">
                                        {/* Header Row */}
                                        <div className="grid grid-cols-12 gap-2 text-xs font-bold text-red-800 border-b border-red-200 pb-2 mb-2">
                                            <div className="col-span-5">Modalidade</div>
                                            <div className="col-span-3 text-center">Mix (%)</div>
                                            <div className="col-span-4 text-right">Taxa</div>
                                        </div>

                                        <div className="space-y-2">
                                            {/* Dynamic Rows based on keys in finalRates to ensure alignment */}
                                            {Object.keys(finalRates).map(key => {
                                                let rate = 0;
                                                
                                                // Calculate logic for display ONLY
                                                const concRatesObj = selectedRequest.pricingData!.competitorRates;
                                                if (key === 'debit') rate = concRatesObj.debit;
                                                else if (key === '1x') rate = concRatesObj.credit1x;
                                                else if (planType === 'Simples') {
                                                    if (key === '2x-6x') rate = concRatesObj.credit1x + 2.5;
                                                    else if (key === '7x-12x') rate = concRatesObj.credit12x;
                                                    else if (key === '13x-18x') rate = concRatesObj.credit12x + 4;
                                                } else {
                                                    const i = parseInt(key.replace('x',''));
                                                    const start = concRatesObj.credit1x;
                                                    const end = concRatesObj.credit12x;
                                                    rate = start + ((end - start) / 11) * (i - 1);
                                                }

                                                return (
                                                    <div key={key} className="grid grid-cols-12 gap-2 items-center text-sm border-b border-red-100 pb-1 last:border-0">
                                                        <div className="col-span-5 text-red-700 capitalize text-xs font-medium truncate">
                                                            {key === '1x' ? 'Crédito 1x' : key.includes('x') ? `Crédito ${key}` : key}
                                                        </div>
                                                        {/* MIX INPUT MOVED HERE */}
                                                        <div className="col-span-3 flex justify-center">
                                                            <input 
                                                                disabled={!canEdit}
                                                                type="number" step="0.1"
                                                                value={mixValues[key] || 0}
                                                                onChange={(e) => setMixValues({...mixValues, [key]: parseFloat(e.target.value)})}
                                                                className={`w-12 text-center text-xs font-medium text-red-800 border border-red-200 rounded px-1 py-0.5 focus:ring-1 focus:ring-red-500 outline-none ${!canEdit ? 'bg-transparent border-transparent' : 'bg-white'}`}
                                                            />
                                                        </div>
                                                        <div className="col-span-4 text-right font-bold text-red-900">
                                                            {rate.toFixed(2)}%
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* CARD 2: APPROVED / COUNTER-OFFER (Rate Only) */}
                                <div className={`bg-green-50 rounded-xl border-2 overflow-hidden shadow-md flex flex-col relative transition-all ${isEditing ? 'border-brand-primary ring-1 ring-brand-primary' : 'border-green-200'}`}>
                                    <div className={`absolute top-0 right-0 text-[9px] px-2 py-1 rounded-bl-lg font-bold uppercase tracking-wide z-10 flex items-center gap-1 ${isLocked && !isEditing ? 'bg-gray-200 text-gray-600' : 'bg-green-200 text-green-800'}`}>
                                        {isLocked && !isEditing ? <Lock size={10} /> : null} Área de Decisão
                                    </div>
                                    
                                    <div className="p-4 border-b border-green-200 bg-green-100/50 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-green-800">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <h3 className="font-bold text-sm uppercase">Aprovado / Contra-Proposta</h3>
                                        </div>
                                        
                                        {/* Edit Controls for Approved Requests */}
                                        {isLocked && !isEditing && (
                                            <button 
                                                onClick={() => setIsEditing(true)}
                                                className="flex items-center gap-1 text-[10px] font-bold bg-white border border-green-300 text-green-700 px-2 py-1 rounded hover:bg-green-50 transition-colors"
                                            >
                                                <Edit3 size={12} /> Editar
                                            </button>
                                        )}
                                        {isLocked && isEditing && (
                                            <div className="flex gap-1">
                                                <button onClick={handleCancelEdit} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Cancelar"><RotateCcw size={14}/></button>
                                                <button onClick={handleSaveEdit} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Salvar"><Save size={14}/></button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className={`p-4 flex-1 transition-colors ${isLocked && !isEditing ? 'bg-gray-50 opacity-90' : 'bg-white'}`}>
                                        {/* Simples Extra Field */}
                                        {planType === 'Simples' && (
                                            <div className="mb-4 bg-green-50 p-2 rounded border border-green-200 flex justify-between items-center">
                                                <span className="text-xs font-bold text-green-800 uppercase">Taxa Antecipação</span>
                                                <div className="flex items-center gap-1">
                                                    <input 
                                                        disabled={!canEdit}
                                                        type="number" step="0.01" value={anticipationRate} onChange={e => setAnticipationRate(parseFloat(e.target.value))}
                                                        className={`w-16 text-right font-bold text-green-900 border border-green-300 rounded px-1 py-0.5 outline-none text-xs ${!canEdit ? 'bg-transparent border-transparent' : 'bg-white'}`}
                                                    />
                                                    <span className="text-xs text-green-800">% a.m.</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Header Row - UPDATED: No Mix Column */}
                                        <div className="grid grid-cols-12 gap-2 text-xs font-bold text-green-800 border-b border-green-200 pb-2 mb-2">
                                            <div className="col-span-8">Modalidade</div>
                                            <div className="col-span-4 text-right">Taxa Final</div>
                                        </div>

                                        <div className="space-y-2">
                                            {Object.keys(finalRates).map(key => (
                                                <div key={key} className="grid grid-cols-12 gap-2 items-center border-b border-green-100 pb-1 last:border-0">
                                                    <div className="col-span-8 text-green-700 font-medium capitalize text-xs truncate">
                                                        {key === '1x' ? 'Crédito 1x' : key.includes('x') ? `Crédito ${key}` : key}
                                                    </div>
                                                    
                                                    {/* RATE INPUT */}
                                                    <div className="col-span-4 flex items-center justify-end gap-1">
                                                        <input 
                                                            disabled={!canEdit}
                                                            type="number" step="0.01"
                                                            value={finalRates[key]}
                                                            onChange={(e) => setFinalRates({...finalRates, [key]: parseFloat(e.target.value)})}
                                                            className={`w-14 text-right font-bold text-green-900 border border-green-200 rounded px-1 py-0.5 focus:ring-2 focus:ring-green-500 outline-none transition-colors text-xs ${!canEdit ? 'bg-transparent border-transparent cursor-default' : 'bg-green-50'}`}
                                                        />
                                                        <span className="text-[10px] text-green-800">%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {(!isLocked || isEditing) && (
                                            <p className="text-[10px] text-green-600 mt-4 flex items-center gap-1 bg-green-50 p-2 rounded">
                                                <Edit3 className="w-3 h-3" />
                                                {isEditing ? 'Modo de Edição Ativo. Salve as alterações.' : 'Defina as taxas finais aprovadas.'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* MARGIN ANALYSIS SIMULATOR */}
                            <div className="bg-brand-gray-50 p-6 rounded-xl border border-brand-gray-200">
                                <h3 className="font-bold text-brand-gray-900 text-sm uppercase mb-4 flex items-center gap-2">
                                    <Calculator className="w-4 h-4" />
                                    Análise de Margem (Simulada)
                                </h3>
                                <div className="flex flex-wrap items-end gap-6">
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Custo Base (Débito)</label>
                                        <input type="number" disabled value={calcState.baseCostDebit} className="w-full bg-brand-gray-200 border border-brand-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-gray-500" />
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Spread Alvo (%)</label>
                                        <input 
                                            type="number" 
                                            step="0.01" 
                                            disabled={!canEdit}
                                            value={calcState.spread} 
                                            onChange={(e) => setCalcState({...calcState, spread: parseFloat(e.target.value)})} 
                                            className="w-full border rounded-lg px-3 py-2 text-sm font-mono font-bold outline-none focus:ring-1 focus:ring-brand-primary bg-white text-brand-gray-900 border-brand-gray-300 transition-colors disabled:bg-gray-100 disabled:text-gray-500" 
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Piso Sugerido</label>
                                        <div className="w-full bg-brand-gray-900 text-white rounded-lg px-3 py-2 text-sm font-mono font-bold">
                                            {(calcState.baseCostDebit + calcState.spread).toFixed(2)}%
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-brand-gray-500 mt-2">
                                    * A taxa APROVADA de <span className="font-bold text-brand-gray-900">{finalRates['debit']?.toFixed(2)}%</span> está 
                                    {finalRates['debit'] >= (calcState.baseCostDebit + calcState.spread) 
                                        ? <span className="text-green-600 font-bold ml-1"> DENTRO</span> 
                                        : <span className="text-red-600 font-bold ml-1"> ABAIXO</span>
                                    } da margem alvo.
                                </p>
                            </div>

                            {/* COMPARATIVE FINANCIAL TABLE */}
                            {comparisonData && (
                                <div className="border border-brand-gray-200 rounded-xl overflow-hidden shadow-sm">
                                    {/* Competitor Header */}
                                    <div className="bg-gray-400 p-2 text-white font-bold text-center uppercase text-xs tracking-wider">
                                        Proposta Concorrente
                                    </div>
                                    <div className="bg-gray-100 p-4 grid grid-cols-4 gap-4 text-center divide-x divide-gray-300">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase">Take Rate $</p>
                                            <p className="text-lg font-bold text-gray-700">R$ {comparisonData.conc.takeRateVal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase">Take Rate %</p>
                                            <p className="text-lg font-bold text-gray-700">{comparisonData.conc.takeRatePct.toFixed(2)}%</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase">MCF2 $</p>
                                            <p className="text-lg font-bold text-gray-700">R$ {comparisonData.conc.mcf2Val.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase">Spread</p>
                                            <p className="text-lg font-bold text-gray-700">{comparisonData.conc.spread.toFixed(2)}%</p>
                                        </div>
                                    </div>

                                    {/* Pagmotors Header */}
                                    <div className="bg-brand-primary p-2 text-white font-bold text-center uppercase text-xs tracking-wider">
                                        Proposta Pagmotors
                                    </div>
                                    <div className="bg-brand-primary/5 p-4 grid grid-cols-4 gap-4 text-center divide-x divide-brand-primary/20">
                                        <div>
                                            <p className="text-[10px] font-bold text-brand-primary/70 uppercase">Take Rate $</p>
                                            <p className="text-lg font-bold text-brand-primary">R$ {comparisonData.pag.takeRateVal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-brand-primary/70 uppercase">Take Rate %</p>
                                            <p className="text-lg font-bold text-brand-primary">{comparisonData.pag.takeRatePct.toFixed(2)}%</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-brand-primary/70 uppercase">MCF2 $</p>
                                            <p className="text-lg font-bold text-brand-primary">R$ {comparisonData.pag.mcf2Val.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-brand-primary/70 uppercase">Spread</p>
                                            <p className="text-lg font-bold text-brand-primary">{comparisonData.pag.spread.toFixed(2)}%</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Actions Footer */}
                        {(selectedRequest.status === 'Pendente' || selectedRequest.status === 'Em Análise') && (
                            <div className="p-6 border-t border-brand-gray-200 bg-brand-gray-50 flex justify-end gap-3">
                                <button onClick={handleReject} disabled={processingAction === 'reject'} className="px-6 py-3 border border-red-200 text-red-700 font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center gap-2 disabled:opacity-50">
                                    {processingAction === 'reject' ? <Loader2 className="w-4 h-4 animate-spin"/> : null}
                                    Rejeitar
                                </button>
                                <button onClick={handleApprove} disabled={processingAction === 'approve'} className="px-8 py-3 bg-brand-primary text-white font-bold rounded-xl shadow-lg hover:bg-brand-dark transition-all transform hover:-translate-y-1 flex items-center gap-2 disabled:opacity-50">
                                    {processingAction === 'approve' ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4" />}
                                    Aprovar Condições
                                </button>
                            </div>
                        )}
                        {isEditing && (
                            <div className="p-6 border-t border-brand-gray-200 bg-brand-gray-50 flex justify-between items-center animate-fade-in">
                                <span className="text-xs font-bold text-orange-600 flex items-center gap-1">
                                    <AlertTriangle size={14} /> Modo de Edição Ativo
                                </span>
                                <div className="flex gap-2">
                                    <button onClick={handleCancelEdit} className="px-4 py-2 border border-brand-gray-300 text-brand-gray-600 font-bold rounded-lg hover:bg-white">
                                        Cancelar
                                    </button>
                                    <button onClick={handleSaveEdit} disabled={processingAction === 'save'} className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow flex items-center gap-2 disabled:opacity-50">
                                        {processingAction === 'save' ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save size={16} />}
                                        Salvar Alterações
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-brand-gray-400">
                        <FileText className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">Selecione uma solicitação para analisar</p>
                    </div>
                )}

                {/* Evidence Modal */}
                {showEvidence && selectedRequest?.pricingData?.evidenceUrl && (
                    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 animate-fade-in">
                        <div className="bg-white rounded-xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl relative">
                            <div className="p-4 bg-brand-gray-900 flex justify-between items-center text-white shrink-0">
                                <h3 className="font-bold flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4" /> Evidência Anexada
                                </h3>
                                <button onClick={() => setShowEvidence(false)} className="hover:text-red-400 transition-colors"><X size={20} /></button>
                            </div>
                            <div className="flex-1 bg-brand-gray-900 flex items-center justify-center p-1 overflow-hidden relative group">
                                <img 
                                    src={selectedRequest.pricingData.evidenceUrl} 
                                    alt="Evidência" 
                                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                                />
                            </div>
                            <div className="p-3 bg-brand-gray-800 text-center">
                                <a 
                                    href={selectedRequest.pricingData.evidenceUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-xs text-brand-gray-400 hover:text-white flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Download className="w-3 h-3" /> Abrir original em nova aba
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MesaNegociacaoPage;
