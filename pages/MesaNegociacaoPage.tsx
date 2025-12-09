
import React, { useState, useEffect } from 'react';
import { ManualDemand, PricingRequestData } from '../types';
import { appStore } from '../services/store';
import { 
    CheckCircle2, X, Search, Filter, AlertTriangle, FileText, ChevronRight, 
    Calculator, DollarSign, ArrowRight, User
} from 'lucide-react';

const MesaNegociacaoPage: React.FC = () => {
    const [requests, setRequests] = useState<ManualDemand[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<ManualDemand | null>(null);
    const [filterStatus, setFilterStatus] = useState('Pendente'); // Default filter
    
    // Calculator State
    const [calcState, setCalcState] = useState({
        spread: 0.65, // Standard Spread
        baseCost: 0.40, // Simulated internal cost
    });

    useEffect(() => {
        // Filter only pricing related demands
        const pricingDemands = appStore.getDemands().filter(d => 
            (d.type.includes('Negociação') || d.type.includes('Taxa')) && d.pricingData
        );
        setRequests(pricingDemands);
    }, []);

    const filteredRequests = requests.filter(r => {
        if (filterStatus === 'Todos') return true;
        if (filterStatus === 'Pendente') return r.status === 'Pendente' || r.status === 'Em Análise';
        return r.status === filterStatus;
    });

    const handleApprove = () => {
        if (!selectedRequest || !selectedRequest.pricingData) return;
        
        // Update the request
        const updatedRequest: ManualDemand = {
            ...selectedRequest,
            status: 'Aprovado Pricing',
            result: 'Taxas aprovadas conforme análise de Pricing.',
            pricingData: {
                ...selectedRequest.pricingData,
                financials: {
                    spread: calcState.spread,
                    mcf2: (selectedRequest.pricingData.proposedRates.debit * 1000) * (calcState.spread/100) // Mock Calc
                },
                approvedRates: selectedRequest.pricingData.proposedRates // Approve the proposed
            }
        };

        appStore.updateDemand(updatedRequest);
        
        // Refresh local state
        const updatedList = requests.map(r => r.id === updatedRequest.id ? updatedRequest : r);
        setRequests(updatedList);
        setSelectedRequest(null);
    };

    const handleReject = () => {
        if (!selectedRequest) return;
        const updatedRequest: ManualDemand = {
            ...selectedRequest,
            status: 'Rejeitado',
            result: 'Taxas reprovadas. Margem insuficiente.'
        };
        appStore.updateDemand(updatedRequest);
        const updatedList = requests.map(r => r.id === updatedRequest.id ? updatedRequest : r);
        setRequests(updatedList);
        setSelectedRequest(null);
    };

    return (
        <div className="flex h-[calc(100vh-2rem)] gap-6">
            {/* LEFT: LIST */}
            <div className="w-1/3 flex flex-col bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden">
                <div className="p-4 border-b border-brand-gray-100 bg-brand-gray-50/50">
                    <h2 className="font-bold text-brand-gray-900 text-lg mb-2">Solicitações</h2>
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
                                    <span className="text-[10px] bg-brand-gray-200 text-brand-gray-600 px-1.5 py-0.5 rounded font-mono">{req.id}</span>
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
                                <p className="text-brand-gray-400 text-sm mt-1">{selectedRequest.description}</p>
                            </div>
                            <div className="text-right">
                                <span className="block text-sm opacity-60">Solicitante</span>
                                <span className="font-bold">{selectedRequest.requester}</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            
                            {/* Comparison Table */}
                            <div className="grid grid-cols-2 gap-8">
                                {/* Competitor */}
                                <div className="bg-red-50 p-5 rounded-xl border border-red-100">
                                    <h3 className="text-red-800 font-bold text-sm uppercase mb-4 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        Taxas Concorrência
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center border-b border-red-200 pb-2">
                                            <span className="text-sm text-red-700">Débito</span>
                                            <span className="font-bold text-red-900">{selectedRequest.pricingData?.competitorRates.debit.toFixed(2)}%</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-red-200 pb-2">
                                            <span className="text-sm text-red-700">Crédito 1x</span>
                                            <span className="font-bold text-red-900">{selectedRequest.pricingData?.competitorRates.credit1x.toFixed(2)}%</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-red-700">Crédito 12x</span>
                                            <span className="font-bold text-red-900">{selectedRequest.pricingData?.competitorRates.credit12x.toFixed(2)}%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Proposed */}
                                <div className="bg-green-50 p-5 rounded-xl border border-green-100">
                                    <h3 className="text-green-800 font-bold text-sm uppercase mb-4 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Proposta Solicitada
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center border-b border-green-200 pb-2">
                                            <span className="text-sm text-green-700">Débito</span>
                                            <span className="font-bold text-green-900">{selectedRequest.pricingData?.proposedRates.debit.toFixed(2)}%</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-green-200 pb-2">
                                            <span className="text-sm text-green-700">Crédito 1x</span>
                                            <span className="font-bold text-green-900">{selectedRequest.pricingData?.proposedRates.credit1x.toFixed(2)}%</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-green-700">Crédito 12x</span>
                                            <span className="font-bold text-green-900">{selectedRequest.pricingData?.proposedRates.credit12x.toFixed(2)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Calculator / Analysis */}
                            <div className="bg-brand-gray-50 p-6 rounded-xl border border-brand-gray-200">
                                <h3 className="font-bold text-brand-gray-900 text-sm uppercase mb-4 flex items-center gap-2">
                                    <Calculator className="w-4 h-4" />
                                    Análise de Margem (Interna)
                                </h3>
                                
                                <div className="flex items-end gap-6">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Custo Base (Débito)</label>
                                        <input 
                                            type="number" 
                                            disabled 
                                            value={calcState.baseCost} 
                                            className="w-full bg-brand-gray-200 border border-brand-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-gray-500" 
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Spread Padrão (%)</label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={calcState.spread} 
                                            onChange={(e) => setCalcState({...calcState, spread: parseFloat(e.target.value)})}
                                            className="w-full bg-white border border-brand-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-brand-gray-900 focus:ring-1 focus:ring-brand-primary outline-none" 
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Taxa Mínima Calculada</label>
                                        <div className="w-full bg-brand-gray-900 text-white rounded-lg px-3 py-2 text-sm font-mono font-bold">
                                            {(calcState.baseCost + calcState.spread).toFixed(2)}%
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-brand-gray-500 mt-2">
                                    * A taxa proposta de <span className="font-bold text-brand-gray-900">{selectedRequest.pricingData?.proposedRates.debit.toFixed(2)}%</span> está 
                                    {selectedRequest.pricingData && selectedRequest.pricingData.proposedRates.debit >= (calcState.baseCost + calcState.spread) 
                                        ? <span className="text-green-600 font-bold ml-1">DENTRO</span> 
                                        : <span className="text-red-600 font-bold ml-1">ABAIXO</span>
                                    } da margem mínima.
                                </p>
                            </div>

                        </div>

                        {/* Actions Footer */}
                        {selectedRequest.status !== 'Aprovado Pricing' && selectedRequest.status !== 'Rejeitado' && (
                            <div className="p-6 border-t border-brand-gray-200 bg-brand-gray-50 flex justify-end gap-3">
                                <button onClick={handleReject} className="px-6 py-3 border border-red-200 text-red-700 font-bold rounded-xl hover:bg-red-50 transition-colors">
                                    Rejeitar Proposta
                                </button>
                                <button onClick={handleApprove} className="px-8 py-3 bg-brand-primary text-white font-bold rounded-xl shadow-lg hover:bg-brand-dark transition-all transform hover:-translate-y-1">
                                    Aprovar Taxas
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-brand-gray-400">
                        <FileText className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">Selecione uma solicitação para analisar</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MesaNegociacaoPage;
