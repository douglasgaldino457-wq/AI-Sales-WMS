
import React, { useState, useEffect, useMemo } from 'react';
import { ManualDemand, HistoryLog } from '../types';
import { appStore } from '../services/store';
import { useAppStore } from '../services/useAppStore';
import { 
    CheckCircle2, X, Search, Filter, AlertTriangle, FileText, ChevronRight, 
    Calculator, DollarSign, ArrowRight, User, Eye, Image as ImageIcon, Edit3, Download, Layers, PieChart,
    Lock, Unlock, Save, RotateCcw, Loader2, Hash, Calendar, Briefcase, History, Equal, ShieldCheck, ShieldAlert
} from 'lucide-react';
import { PagmotorsLogo } from '../components/Logo';

const REJECTION_REASONS = [
    'Evidência incorreta',
    'Anexos incompletos',
    'Erro no cálculo de margem',
    'Reenviar dados',
    'Outros'
];

const MesaNegociacaoPage: React.FC = () => {
    const { currentUser } = useAppStore();
    const [requests, setRequests] = useState<ManualDemand[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<ManualDemand | null>(null);
    const [filterStatus, setFilterStatus] = useState('Pendente'); 
    const [showEvidence, setShowEvidence] = useState(false);
    
    // Edit Mode State for Approved Requests
    const [isEditing, setIsEditing] = useState(false);
    const [processingAction, setProcessingAction] = useState<'approve' | 'reject' | 'save' | null>(null);

    // Rejection Modal State
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState<string>('');
    const [customRejectionReason, setCustomRejectionReason] = useState<string>('');

    // Calculator & Context State
    const [calcState, setCalcState] = useState({
        targetType: 'SPREAD' as 'SPREAD' | 'MCF2', // Default Spread
        targetValue: 0.85, // Default Spread Target (Alçada 1 start)
        taxRate: 11.25, 
        autoAdjusted: false
    });

    // Simples Plan Logic
    const [anticipationRate, setAnticipationRate] = useState(3.95); 

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
        
        // --- LOAD CONFIG COSTS ---
        const config = appStore.getCostConfig();
        setCalcState(prev => ({
            ...prev,
            taxRate: config.taxRate
        }));
    }, []);

    // --- STEP 1: INITIALIZE SPREAD & MIX BASED ON REQUEST CONTEXT ---
    useEffect(() => {
        if (selectedRequest && selectedRequest.pricingData) {
            const context = selectedRequest.pricingData.context;
            
            // Adjust Target Spread based on Volume (TPV) automatically when loading request
            let target = 0.85;
            if (context) {
                if (context.potentialRevenue > 80000) target = 0.65; // High volume gets better rates (Alçada 1 limit)
                else if (context.potentialRevenue > 40000) target = 0.75;
            }
            setCalcState(prev => ({ ...prev, targetValue: target, targetType: 'SPREAD' }));
            
            // CRITICAL: Clear Mix when switching requests to force recalculation in Step 2
            setMixValues({});
            
            // Reset Edit Mode when switching requests
            setIsEditing(false);
            setIsRejectModalOpen(false);
            setRejectionReason('');
            setCustomRejectionReason('');
        }
    }, [selectedRequest]);

    // --- STEP 2: INTELLIGENT RATE SUGGESTION (MATCHING OR MARGIN BASE) ---
    useEffect(() => {
        if (selectedRequest) {
            // Check if it's already approved to load existing approved rates instead of calculating
            const useSavedData = (selectedRequest.status === 'Aprovado Pricing' || selectedRequest.status === 'Concluído') && !isEditing;
            
            const suggestion: Record<string, number> = {};
            const initialMix: Record<string, number> = {};
            const currentPlan = getPlanType(selectedRequest);
            const targetSpread = calcState.targetValue; // This drives the calculation
            
            const costs = appStore.getCostConfig(); 
            const concRates = selectedRequest.pricingData?.competitorRates || { debit: 0, credit1x: 0, credit12x: 0 };

            // --- CORE LOGIC: MARGIN ANALYSIS ---
            // 1st Level (Spread >= 0.65): Try to match competitor. If Competitor is too low, Floor at Cost + Spread.
            // 2nd Level (Spread < 0.65): Use strictly Cost + Spread (Aggressive).
            
            const calculateRate = (cost: number, compRate: number) => {
                const floorRate = cost + targetSpread;
                
                if (targetSpread >= 0.65) {
                    // Alçada 1: We want to match competitor if possible (it gives us MORE spread than target)
                    // If Competitor Rate is HIGHER than our Floor, we match it (Resulting Spread > Target)
                    // If Competitor Rate is LOWER than our Floor, we stick to Floor (Resulting Spread = Target)
                    return Math.max(compRate, floorRate);
                } else {
                    // Alçada 2: User explicitly lowered spread below 0.65.
                    // We calculate strictly based on the aggressive target spread.
                    return floorRate;
                }
            };

            // Helper to get cost per installment
            const getInstallmentCost = (i: number) => {
                let interchange = 0;
                if (i <= 6) interchange = costs.installment2to6Cost;
                else if (i <= 12) interchange = costs.installment7to12Cost;
                else interchange = costs.installment13to18Cost;
                
                // Full Plan includes Funding Cost (Anticipation)
                // Simples Plan only includes Interchange (MDR)
                const avgTerm = (i + 1) / 2;
                const funding = currentPlan === 'Full' ? (costs.anticipationCost * avgTerm) : 0;
                
                return interchange + funding + costs.fixedCostPerTx;
            };

            // Define keys based on plan
            let keys: string[] = [];
            if (currentPlan === 'Full') {
                keys = ['debit', '1x', ...Array.from({length: 11}, (_, i) => `${i+2}x`)];
            } else {
                keys = ['debit', '1x', '2x-6x', '7x-12x', '13x-18x'];
            }

            if (useSavedData && selectedRequest.pricingData?.approvedRates) {
                // LOAD EXISTING APPROVED RATES (READ ONLY MODE)
                const approved = selectedRequest.pricingData.approvedRates;
                keys.forEach(key => {
                    if (key === 'debit') suggestion[key] = approved.debit;
                    else if (key === '1x') suggestion[key] = approved.credit1x;
                    else if (key.includes('12x') || key === '7x-12x') suggestion[key] = approved.credit12x;
                    else if (currentPlan === 'Full') {
                         const i = parseInt(key.replace('x',''));
                         const start = approved.credit1x;
                         const end = approved.credit12x;
                         suggestion[key] = start + ((end - start) / 11) * (i - 1);
                    } else {
                        if(key === '2x-6x') suggestion[key] = approved.credit1x + 2.5; 
                        if(key === '13x-18x') suggestion[key] = approved.credit12x + 3.0; 
                    }
                });

            } else {
                // CALCULATE NEW SUGGESTION BASED ON TARGET SPREAD
                const debitCost = costs.debitCost + costs.fixedCostPerTx;
                const credit1xCost = costs.creditSightCost + (currentPlan === 'Full' ? costs.anticipationCost : 0) + costs.fixedCostPerTx;

                suggestion['debit'] = calculateRate(debitCost, concRates.debit);
                initialMix['debit'] = 40; 
                
                suggestion['1x'] = calculateRate(credit1xCost, concRates.credit1x);
                initialMix['1x'] = 30; 

                if (currentPlan === 'Full') {
                    // Linear interpolation for competitor 12x
                    const slope = (concRates.credit12x - concRates.credit1x) / 11;
                    const installmentShare = 30 / 11;

                    for (let i = 2; i <= 12; i++) {
                        const totalCost = getInstallmentCost(i);
                        const estimatedConc = concRates.credit1x + (slope * (i - 1));
                        
                        suggestion[`${i}x`] = calculateRate(totalCost, estimatedConc);
                        initialMix[`${i}x`] = parseFloat(installmentShare.toFixed(2));
                    }
                } else {
                    // SIMPLES (MDR only)
                    // Costs:
                    const cost2to6 = costs.installment2to6Cost + costs.fixedCostPerTx;
                    const cost7to12 = costs.installment7to12Cost + costs.fixedCostPerTx;
                    const cost13to18 = costs.installment13to18Cost + costs.fixedCostPerTx;

                    suggestion['2x-6x'] = calculateRate(cost2to6, concRates.credit1x + 2.5);
                    initialMix['2x-6x'] = 15;
                    
                    suggestion['7x-12x'] = calculateRate(cost7to12, concRates.credit12x);
                    initialMix['7x-12x'] = 10;
                    
                    suggestion['13x-18x'] = calculateRate(cost13to18, concRates.credit12x + 3.0);
                    initialMix['13x-18x'] = 5;
                    
                    setAnticipationRate(3.95);
                }
            }

            // Round to 2 decimals
            Object.keys(suggestion).forEach(key => {
                suggestion[key] = Math.round(suggestion[key] * 100) / 100;
            });

            // If NOT in manual editing mode (or if just initializing), update rates
            // If in editing mode, we do NOT overwrite manual changes with auto-calc unless target spread changes drastically (handled by deps)
            setFinalRates(prev => {
                // If initializing or target changed significantly, overwrite.
                // For simplicity in this logic: We overwrite if not editing or if target changed.
                // The dependency array handles the trigger.
                return suggestion; 
            });
            
            // Ensure Mix is initialized and matches the current plan keys
            // This fixes issues when switching between Full/Simples requests
            const currentKeys = Object.keys(suggestion);
            const mixKeys = Object.keys(mixValues);
            const isMixMismatch = mixKeys.length === 0 || !currentKeys.every(k => mixKeys.includes(k));

            if (isMixMismatch) {
                setMixValues(initialMix);
            }

        }
    }, [calcState.targetValue, selectedRequest, planType, isEditing]); 

    const filteredRequests = requests.filter(r => {
        if (filterStatus === 'Todos') return true;
        if (filterStatus === 'Pendente') return r.status === 'Pendente' || r.status === 'Em Análise';
        return r.status === filterStatus;
    });

    const clientDetails = useMemo(() => {
        if (!selectedRequest) return null;
        return appStore.getClients().find(c => c.nomeEc === selectedRequest.clientName);
    }, [selectedRequest]);

    const displayId = clientDetails ? clientDetails.id : selectedRequest?.id;

    const competitorName = useMemo(() => {
        if (!selectedRequest || !selectedRequest.description) return 'Geral';
        const match = selectedRequest.description.match(/Adquirente:\s*([^.]+)/);
        return match ? match[1].trim() : 'Mercado';
    }, [selectedRequest]);

    // --- WEIGHTED FINANCIAL CALCULATION ---
    const comparisonData = useMemo(() => {
        if (!selectedRequest || !selectedRequest.pricingData) return null;

        const tpv = selectedRequest.pricingData.context?.potentialRevenue || 50000;
        const costs = appStore.getCostConfig();
        
        let pagWeightedAvg = 0;
        let concWeightedAvg = 0; // Real Competitor Weighted Avg
        let totalMix = 0;
        let weightedCost = 0;

        Object.keys(finalRates).forEach(key => {
            const weight = (mixValues[key] || 0) / 100;
            totalMix += weight;
            pagWeightedAvg += (finalRates[key] || 0) * weight;
            
            // --- Calculate Competitor Weighted Average ---
            let concRate = 0;
            const concRatesObj = selectedRequest.pricingData!.competitorRates;
            
            if (key === 'debit') concRate = concRatesObj.debit;
            else if (key === '1x') concRate = concRatesObj.credit1x;
            else if (planType === 'Simples') {
                if (key === '2x-6x') concRate = concRatesObj.credit1x + 2.5;
                else if (key === '7x-12x') concRate = concRatesObj.credit12x;
                else if (key === '13x-18x') concRate = concRatesObj.credit12x + 4; // Estimation
            } else {
                // Full Plan: Interpolate 12x
                const i = parseInt(key.replace('x',''));
                const start = concRatesObj.credit1x;
                const end = concRatesObj.credit12x;
                concRate = start + ((end - start) / 11) * (i - 1);
            }
            concWeightedAvg += concRate * weight;
            // --------------------------------------------------

            let itemCost = 0;
            if (planType === 'Full') {
                if (key === 'debit') itemCost = costs.debitCost;
                else if (key === '1x') itemCost = costs.creditSightCost + costs.anticipationCost;
                else {
                    const i = parseInt(key.replace('x',''));
                    let interchange = 0;
                    if (i <= 6) interchange = costs.installment2to6Cost;
                    else if (i <= 12) interchange = costs.installment7to12Cost;
                    else interchange = costs.installment13to18Cost;
                    itemCost = interchange + (costs.anticipationCost * ((i+1)/2));
                }
            } else {
                if (key === 'debit') itemCost = costs.debitCost;
                else if (key === '1x') itemCost = costs.creditSightCost;
                else if (key === '2x-6x') itemCost = costs.installment2to6Cost;
                else if (key === '7x-12x') itemCost = costs.installment7to12Cost;
                else if (key === '13x-18x') itemCost = costs.installment13to18Cost;
            }
            weightedCost += itemCost * weight;
        });

        // Normalize if mix doesn't add up to 100% (prevent division by zero or skew)
        if (totalMix > 0) {
            pagWeightedAvg = pagWeightedAvg / totalMix;
            concWeightedAvg = concWeightedAvg / totalMix;
            weightedCost = weightedCost / totalMix;
        }

        // Pagmotors Metrics
        const pagTakeRateVal = tpv * (pagWeightedAvg / 100);
        const pagCostVal = tpv * (weightedCost / 100);
        const pagSpreadVal = pagTakeRateVal - pagCostVal;
        const pagSpreadPct = (pagSpreadVal / tpv) * 100;
        const pagMcf2Val = pagSpreadVal - (pagTakeRateVal * (calcState.taxRate/100));
        
        // Competitor Metrics (Calculated against OUR costs for margin comparison)
        const concTakeRateVal = tpv * (concWeightedAvg / 100);
        const concSpreadVal = concTakeRateVal - pagCostVal; 
        const concSpreadPct = (concSpreadVal / tpv) * 100;
        const concMcf2Val = concSpreadVal - (concTakeRateVal * (calcState.taxRate/100));

        return {
            conc: { 
                takeRateVal: concTakeRateVal, 
                takeRatePct: concWeightedAvg, 
                spread: concSpreadPct, 
                mcf2Val: concMcf2Val,
                weightedCost: weightedCost
            },
            pag: { 
                takeRateVal: pagTakeRateVal, 
                takeRatePct: pagWeightedAvg, 
                mcf2Val: pagMcf2Val, 
                spread: pagSpreadPct, 
                weightedCost: weightedCost 
            }
        };
    }, [selectedRequest, finalRates, mixValues, planType, calcState]);


    const handleApprove = () => {
        if (!selectedRequest) return;
        setProcessingAction('approve');
        
        setTimeout(() => {
            const now = new Date();
            const approver = currentUser?.name || 'Mesa de Negociação';
            
            // Log History
            const historyEntry: HistoryLog = {
                date: now.toISOString(),
                user: approver,
                action: 'Aprovação',
                details: `Taxas aprovadas. Spread Pond: ${comparisonData?.pag.spread.toFixed(2)}%`
            };

            const existingLog = selectedRequest.changeLog || [];

            const updatedRequest: ManualDemand = {
                ...selectedRequest,
                status: 'Aprovado Pricing',
                result: 'Proposta aprovada com base na análise de margem e spread alvo.',
                changeLog: [...existingLog, historyEntry],
                pricingData: {
                    ...selectedRequest.pricingData!,
                    approvedRates: {
                        debit: finalRates['debit'],
                        credit1x: finalRates['1x'],
                        credit12x: finalRates['12x'] || finalRates['13x-18x'] || 0
                    },
                    approvalMetadata: {
                        approvedBy: approver,
                        approvedAt: now.toISOString()
                    }
                }
            };

            appStore.updateDemand(updatedRequest);
            
            const updatedList = requests.map(r => r.id === updatedRequest.id ? updatedRequest : r);
            setRequests(updatedList);
            setSelectedRequest(updatedRequest); 
            setProcessingAction(null);
        }, 1000);
    };

    const handleOpenRejectModal = () => {
        setIsRejectModalOpen(true);
    };

    const confirmReject = () => {
        if (!selectedRequest) return;
        if (!rejectionReason) {
            alert('Por favor, selecione um motivo.');
            return;
        }
        
        const finalReason = rejectionReason === 'Outros' ? customRejectionReason : rejectionReason;
        if (!finalReason) {
            alert('Por favor, descreva o motivo.');
            return;
        }

        setProcessingAction('reject');
        setTimeout(() => {
            const updatedRequest: ManualDemand = {
                ...selectedRequest,
                status: 'Rejeitado',
                result: `Reprovado: ${finalReason}`
            };
            appStore.updateDemand(updatedRequest);
            const updatedList = requests.map(r => r.id === updatedRequest.id ? updatedRequest : r);
            setRequests(updatedList);
            setSelectedRequest(null);
            setProcessingAction(null);
            setIsRejectModalOpen(false);
            setRejectionReason('');
            setCustomRejectionReason('');
        }, 1000);
    };

    const handleSaveEdit = () => {
        if (!selectedRequest) return;
        setProcessingAction('save');
        
        setTimeout(() => {
            const now = new Date();
            const user = currentUser?.name || 'Pricing';
            
            // Log History
            const historyEntry: HistoryLog = {
                date: now.toISOString(),
                user: user,
                action: 'Edição de Taxas',
                details: `Revisão de condições após aprovação.`
            };
            const existingLog = selectedRequest.changeLog || [];

            const updatedRequest: ManualDemand = {
                ...selectedRequest,
                changeLog: [...existingLog, historyEntry],
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
        if (selectedRequest) setSelectedRequest({...selectedRequest});
    };

    const isLocked = selectedRequest && (selectedRequest.status === 'Aprovado Pricing' || selectedRequest.status === 'Concluído');
    const canEdit = !isLocked || isEditing;

    const handleFocusSelect = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

    return (
        <div className="flex h-[calc(100vh-2rem)] gap-6">
            {/* LEFT: LIST */}
            <div className="w-1/3 flex flex-col bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden">
                <div className="p-4 border-b border-brand-gray-100 bg-white">
                    <h2 className="font-bold text-brand-gray-900 text-xl mb-4 px-1">Mesa de Negociação</h2>
                    {/* FILTER BAR - REDESIGNED */}
                    <div className="flex p-1 bg-brand-gray-100 rounded-xl w-full overflow-hidden">
                        {[
                            { label: 'Pendente', value: 'Pendente' },
                            { label: 'Aprovados', value: 'Aprovado Pricing' },
                            { label: 'Rejeitados', value: 'Rejeitado' },
                            { label: 'Todos', value: 'Todos' }
                        ].map((tab) => {
                            const isActive = filterStatus === tab.value;
                            return (
                                <button
                                    key={tab.value}
                                    onClick={() => setFilterStatus(tab.value)}
                                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200
                                        ${isActive 
                                            ? 'bg-white text-brand-gray-900 shadow-sm ring-1 ring-black/5' 
                                            : 'text-brand-gray-500 hover:text-brand-gray-700 hover:bg-brand-gray-200/50'}
                                    `}
                                >
                                    {tab.label}
                                </button>
                            )
                        })}
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
                        {/* REDESIGNED HEADER */}
                        <div className="bg-brand-gray-900 text-white p-6 shrink-0 relative overflow-hidden">
                            {/* Decorative Logo */}
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <PagmotorsLogo variant="default" className="scale-150" />
                            </div>

                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-2xl font-bold">{selectedRequest.clientName}</h2>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${selectedRequest.status.includes('Aprovado') ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-white/10 border-white/20 text-gray-300'}`}>
                                            {selectedRequest.status}
                                        </span>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 font-mono mb-4">
                                        <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded">
                                            <Hash size={12} /> ID: {displayId}
                                        </span>
                                        <span className="w-px h-3 bg-gray-600"></span>
                                        <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded">
                                            <FileText size={12} /> CNPJ: {clientDetails?.cnpj || 'Não identificado'}
                                        </span>
                                        <span className="w-px h-3 bg-gray-600"></span>
                                        <span className="flex items-center gap-1.5">
                                            <Briefcase size={12} /> Plano: {planType}
                                        </span>
                                        <span className="w-px h-3 bg-gray-600"></span>
                                        <span className="flex items-center gap-1.5">
                                            <Calendar size={12} /> {new Date(selectedRequest.date).toLocaleDateString()}
                                        </span>
                                    </div>

                                    {selectedRequest.pricingData?.context && (
                                        <div className="flex gap-3 text-xs">
                                            <div className="bg-brand-gray-800 px-3 py-1.5 rounded border border-brand-gray-700 flex flex-col">
                                                <span className="text-[9px] text-gray-500 uppercase font-bold">Potencial</span>
                                                <span className="font-bold text-white">R$ {selectedRequest.pricingData.context.potentialRevenue.toLocaleString('pt-BR')}</span>
                                            </div>
                                            <div className="bg-brand-gray-800 px-3 py-1.5 rounded border border-brand-gray-700 flex flex-col">
                                                <span className="text-[9px] text-gray-500 uppercase font-bold">Mínimo Acordado</span>
                                                <span className="font-bold text-white">R$ {selectedRequest.pricingData.context.minAgreed.toLocaleString('pt-BR')}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col items-end gap-3 min-w-[200px]">
                                     <PagmotorsLogo variant="default" className="scale-75 origin-right" />
                                     <div className="text-right">
                                        <span className="block text-[10px] uppercase font-bold text-gray-500">Solicitante</span>
                                        <span className="text-sm font-bold flex items-center justify-end gap-1">
                                            <User size={12}/> {selectedRequest.requester}
                                        </span>
                                     </div>
                                     <button 
                                        onClick={() => setShowEvidence(true)}
                                        className="bg-brand-primary hover:bg-brand-dark text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm w-full justify-center"
                                    >
                                        <ImageIcon className="w-3 h-3" /> Ver Evidência
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* WORKSPACE CONTENT - SCROLLBAR HIDDEN */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                            
                            {/* RATES GRID */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* CARD 1: COMPETITOR (Read Only + Mix Display) */}
                                <div className="bg-red-50 rounded-xl border border-red-100 overflow-hidden flex flex-col">
                                    <div className="p-4 border-b border-red-100 flex items-center justify-between text-red-800">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" />
                                            <h3 className="font-bold text-sm uppercase">Concorrência</h3>
                                        </div>
                                        <span className="bg-white/60 px-2 py-1 rounded text-xs font-extrabold border border-red-200 shadow-sm">
                                            {competitorName}
                                        </span>
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
                                                        <div className="col-span-3 flex justify-center relative">
                                                            <input 
                                                                disabled={!canEdit}
                                                                type="number" step="0.1"
                                                                value={mixValues[key] || 0}
                                                                onFocus={handleFocusSelect}
                                                                onChange={(e) => setMixValues({...mixValues, [key]: parseFloat(e.target.value)})}
                                                                className={`w-16 text-center text-xs font-medium text-red-800 border-b border-red-200 py-0.5 focus:border-red-500 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${!canEdit ? 'bg-transparent border-transparent' : 'bg-transparent'}`}
                                                            />
                                                            {canEdit && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-red-300 pointer-events-none">%</span>}
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
                                                <div className="flex items-center gap-1 relative">
                                                    <input 
                                                        disabled={!canEdit}
                                                        type="number" step="0.01" value={anticipationRate} onChange={e => setAnticipationRate(parseFloat(e.target.value))}
                                                        onFocus={handleFocusSelect}
                                                        className={`w-20 text-right font-bold text-green-900 border-b border-green-300 py-0.5 outline-none text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${!canEdit ? 'bg-transparent border-transparent' : 'bg-transparent'}`}
                                                    />
                                                    <span className="text-xs text-green-800 ml-1">% a.m.</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Header Row - UPDATED: No Mix Column */}
                                        <div className="grid grid-cols-12 gap-2 text-xs font-bold text-green-800 border-b border-green-200 pb-2 mb-2">
                                            <div className="col-span-8">Modalidade</div>
                                            <div className="col-span-4 text-right">Taxa Final</div>
                                        </div>

                                        <div className="space-y-2">
                                            {Object.keys(finalRates).map(key => {
                                                // Check for Matching Rates with Competitor
                                                let competitorRate = 0;
                                                const concRatesObj = selectedRequest.pricingData!.competitorRates;
                                                if (key === 'debit') competitorRate = concRatesObj.debit;
                                                else if (key === '1x') competitorRate = concRatesObj.credit1x;
                                                else if (planType === 'Simples') {
                                                    if (key === '2x-6x') competitorRate = concRatesObj.credit1x + 2.5;
                                                    else if (key === '7x-12x') competitorRate = concRatesObj.credit12x;
                                                    else if (key === '13x-18x') competitorRate = concRatesObj.credit12x + 4;
                                                } else {
                                                    const i = parseInt(key.replace('x',''));
                                                    const start = concRatesObj.credit1x;
                                                    const end = concRatesObj.credit12x;
                                                    competitorRate = start + ((end - start) / 11) * (i - 1);
                                                }
                                                
                                                const rateValue = finalRates[key] ?? 0;
                                                const isMatch = Math.abs(rateValue - competitorRate) < 0.01;

                                                return (
                                                    <div key={key} className="grid grid-cols-12 gap-2 items-center border-b border-green-100 pb-1 last:border-0">
                                                        <div className="col-span-8 text-green-700 font-medium capitalize text-xs truncate">
                                                            {key === '1x' ? 'Crédito 1x' : key.includes('x') ? `Crédito ${key}` : key}
                                                        </div>
                                                        
                                                        {/* RATE INPUT */}
                                                        <div className="col-span-4 flex items-center justify-end gap-1 relative">
                                                            {/* Matching Badge */}
                                                            {isMatch && (
                                                                <span className="absolute right-24 text-[8px] bg-blue-100 text-blue-700 px-1.5 rounded-full border border-blue-200 flex items-center gap-0.5 whitespace-nowrap">
                                                                    <Equal size={8} /> Igualado
                                                                </span>
                                                            )}
                                                            
                                                            <input 
                                                                disabled={!canEdit}
                                                                type={canEdit ? "number" : "text"}
                                                                step="0.01"
                                                                value={canEdit ? rateValue : rateValue.toFixed(2).replace('.', ',')}
                                                                onFocus={handleFocusSelect}
                                                                onChange={(e) => setFinalRates({...finalRates, [key]: parseFloat(e.target.value) || 0})}
                                                                className={`w-20 text-right font-bold text-green-900 border-b border-green-200 py-0.5 pr-7 focus:border-green-500 outline-none transition-colors text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${!canEdit ? 'bg-transparent border-transparent cursor-default' : 'bg-transparent'}`}
                                                            />
                                                            <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-green-800 pointer-events-none">%</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
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

                            {/* MARGIN ANALYSIS SIMULATOR - WEIGHTED */}
                            <div className="bg-brand-gray-50 p-6 rounded-xl border border-brand-gray-200">
                                <h3 className="font-bold text-brand-gray-900 text-sm uppercase mb-4 flex items-center gap-2 justify-between">
                                    <span className="flex items-center gap-2"><Calculator className="w-4 h-4" /> Análise de Margem (Ponderada)</span>
                                </h3>
                                
                                <div className="flex flex-wrap items-end gap-6">
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Custo Médio Pond.</label>
                                        <input type="text" disabled value={`${comparisonData?.pag.weightedCost.toFixed(2)}%`} className="w-full bg-brand-gray-200 border border-brand-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-gray-500" />
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">
                                            Spread Alvo (%)
                                        </label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                disabled={!canEdit}
                                                value={calcState.targetValue} 
                                                onFocus={handleFocusSelect}
                                                onChange={(e) => setCalcState({...calcState, targetValue: parseFloat(e.target.value)})} 
                                                className="w-full border rounded-lg pl-3 pr-8 py-2 text-sm font-mono font-bold outline-none focus:ring-1 focus:ring-brand-primary bg-white text-brand-gray-900 border-brand-gray-300 transition-colors disabled:bg-gray-100 disabled:text-gray-500" 
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">
                                                %
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Resultado (Spread)</label>
                                        <div className={`w-full text-white rounded-lg px-3 py-2 text-sm font-mono font-bold flex items-center justify-between ${
                                            (comparisonData?.pag.spread || 0) >= calcState.targetValue ? 'bg-green-600' : 'bg-red-500'
                                        }`}>
                                            <span>{comparisonData?.pag.spread.toFixed(2)}%</span>
                                            <span className="text-[10px] opacity-80 uppercase">Real</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Approval Level Indicator based on Target Spread */}
                                <div className="mt-3">
                                    {calcState.targetValue >= 0.65 ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200 uppercase tracking-wide">
                                            <ShieldCheck size={12} /> Alçada 1 (Automática)
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200 uppercase tracking-wide">
                                            <ShieldAlert size={12} /> Alçada 2 (Gerência)
                                        </span>
                                    )}
                                </div>
                                
                                {selectedRequest.changeLog && selectedRequest.changeLog.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-brand-gray-200">
                                        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-brand-gray-500 uppercase">
                                            <History className="w-3 h-3" /> Histórico de Alterações
                                        </div>
                                        <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                                            {selectedRequest.changeLog.slice().reverse().map((log, idx) => (
                                                <div key={idx} className="text-[10px] text-brand-gray-600 flex justify-between bg-white px-2 py-1 rounded border border-brand-gray-100">
                                                    <span><strong>{log.user}:</strong> {log.action}</span>
                                                    <span className="text-brand-gray-400">{new Date(log.date).toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* COMPARATIVE FINANCIAL TABLE */}
                            {comparisonData && (
                                <div className="border border-brand-gray-200 rounded-xl overflow-hidden shadow-sm">
                                    {/* Competitor Header */}
                                    <div className="bg-gray-400 p-2 text-white font-bold text-center uppercase text-xs tracking-wider">
                                        Proposta Concorrente
                                    </div>
                                    {/* UPDATED TO MATCH PAGMOTORS COLUMNS */}
                                    <div className="bg-gray-100 p-4 grid grid-cols-4 gap-4 text-center divide-x divide-gray-300">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase">Take Rate %</p>
                                            <p className="text-lg font-bold text-gray-700">{comparisonData.conc.takeRatePct.toFixed(2)}%</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase">Spread</p>
                                            <p className="text-lg font-bold text-gray-700">{comparisonData.conc.spread.toFixed(2)}%</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase">MCF2 (R$)</p>
                                            <p className="text-lg font-bold text-gray-700">R$ {comparisonData.conc.mcf2Val.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase">Take Rate (R$)</p>
                                            <p className="text-lg font-bold text-gray-700">R$ {comparisonData.conc.takeRateVal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                                        </div>
                                    </div>

                                    {/* Pagmotors Header */}
                                    <div className="bg-brand-primary p-2 text-white font-bold text-center uppercase text-xs tracking-wider">
                                        Proposta Pagmotors (Ponderada)
                                    </div>
                                    <div className="bg-brand-primary/5 p-4 grid grid-cols-4 gap-4 text-center divide-x divide-brand-primary/20">
                                        <div>
                                            <p className="text-[10px] font-bold text-brand-primary/70 uppercase">Take Rate %</p>
                                            <p className="text-lg font-bold text-brand-primary">{comparisonData.pag.takeRatePct.toFixed(2)}%</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-brand-primary/70 uppercase">Spread</p>
                                            <p className="text-lg font-bold text-brand-primary">{comparisonData.pag.spread.toFixed(2)}%</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-brand-primary/70 uppercase">MCF2 (R$)</p>
                                            <p className="text-lg font-bold text-brand-primary">R$ {comparisonData.pag.mcf2Val.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-brand-primary/70 uppercase">Take Rate (R$)</p>
                                            <p className="text-lg font-bold text-brand-primary">R$ {comparisonData.pag.takeRateVal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Actions Footer */}
                        {(selectedRequest.status === 'Pendente' || selectedRequest.status === 'Em Análise') && (
                            <div className="p-6 border-t border-brand-gray-200 bg-brand-gray-50 flex justify-end gap-3">
                                <button onClick={handleOpenRejectModal} disabled={processingAction === 'reject'} className="px-6 py-3 border border-red-200 text-red-700 font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center gap-2 disabled:opacity-50">
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

                {/* Rejection Reason Modal */}
                {isRejectModalOpen && (
                    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                            <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
                                <h3 className="text-red-800 font-bold text-lg flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" /> Motivo da Rejeição
                                </h3>
                                <button onClick={() => setIsRejectModalOpen(false)} className="text-red-400 hover:text-red-700 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="space-y-2">
                                    {REJECTION_REASONS.map((reason) => (
                                        <label key={reason} className="flex items-center gap-3 p-3 rounded-lg border border-brand-gray-200 cursor-pointer hover:bg-brand-gray-50 transition-colors">
                                            <input 
                                                type="radio" 
                                                name="rejectionReason" 
                                                value={reason} 
                                                checked={rejectionReason === reason} 
                                                onChange={() => setRejectionReason(reason)}
                                                className="w-4 h-4 text-red-600 focus:ring-red-500"
                                            />
                                            <span className="text-sm font-medium text-brand-gray-700">{reason}</span>
                                        </label>
                                    ))}
                                </div>

                                {rejectionReason === 'Outros' && (
                                    <textarea 
                                        className="w-full border border-brand-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none resize-none"
                                        placeholder="Descreva o motivo da rejeição..."
                                        rows={3}
                                        value={customRejectionReason}
                                        onChange={(e) => setCustomRejectionReason(e.target.value)}
                                        autoFocus
                                    />
                                )}

                                <div className="pt-2 flex justify-end gap-3">
                                    <button 
                                        onClick={() => setIsRejectModalOpen(false)}
                                        className="px-4 py-2 text-sm font-bold text-brand-gray-600 hover:bg-brand-gray-100 rounded-lg"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={confirmReject}
                                        className="px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 shadow-md transition-colors"
                                    >
                                        Confirmar Rejeição
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MesaNegociacaoPage;
