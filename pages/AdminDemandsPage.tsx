
import React, { useState, useEffect } from 'react';
import { 
    CheckCircle2, X, Search, FileText, User, Calendar, Clock, 
    ChevronRight, Eye, ShieldCheck, Filter, Send, Download, AlertCircle, Loader2,
    Building2, FileCheck, RefreshCw, Trash2
} from 'lucide-react';
import { appStore } from '../services/store';
import { RegistrationRequest, ManualDemand, RegistrationStatus } from '../types';
import { FichaCadastralView, DocViewerModal } from './CadastroPage'; 

const AdminDemandsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'CADASTROS' | 'DEMANDAS'>('CADASTROS');
    const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
    const [demands, setDemands] = useState<ManualDemand[]>([]);
    const [selectedReg, setSelectedReg] = useState<RegistrationRequest | null>(null);
    
    // Approval Logic
    const [internalId, setInternalId] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [viewDocType, setViewDocType] = useState<string | null>(null);

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = () => {
        const allRegs = appStore.getRegistrationRequests();
        setRegistrations(allRegs.filter(r => r.status === 'PENDING_ANALYSIS'));

        const allDemands = appStore.getDemands();
        // Show demands that are pending OR are pending admin validation (e.g., after logistics exchange)
        setDemands(allDemands.filter(d => 
            d.status === 'Pendente' || 
            d.status === 'Em Análise' || 
            d.adminStatus === 'Pendente ADM'
        ));
    };

    const handleApproveRegistration = () => {
        if (!internalId.trim()) {
            alert("Por favor, preencha o ID Interno / Código EC para aprovar.");
            return;
        }
        if (!selectedReg) return;

        setIsProcessing(true);
        setTimeout(() => {
            const updatedReg: RegistrationRequest = {
                ...selectedReg,
                status: 'APPROVED',
                finalClientId: internalId,
                approvalData: {
                    date: new Date().toISOString(),
                    approvedBy: 'Admin User'
                }
            };
            appStore.approveRegistration(updatedReg);
            setIsProcessing(false);
            setSelectedReg(null);
            setInternalId('');
            refreshData();
            alert(`Cadastro aprovado! Cliente ID ${internalId} registrado e enviado para Logística.`);
        }, 1500);
    };

    const handleRejectRegistration = () => {
        if (!selectedReg) return;
        const reason = prompt("Motivo da devolução:");
        if (!reason) return;

        setIsProcessing(true);
        setTimeout(() => {
            const updatedReg: RegistrationRequest = {
                ...selectedReg,
                status: 'MISSING_DOCS',
                notes: reason
            };
            appStore.updateRegistrationRequest(updatedReg);
            setIsProcessing(false);
            setSelectedReg(null);
            refreshData();
        }, 1000);
    };

    const handleCompleteDemand = (demand: ManualDemand) => {
        const confirmMsg = demand.adminStatus === 'Pendente ADM' 
            ? "Logística já realizou a troca. Confirmar atualização cadastral/faturamento?"
            : "Confirmar conclusão desta demanda?";

        if(confirm(confirmMsg)) {
            const updated: ManualDemand = { 
                ...demand, 
                status: 'Concluído', 
                adminStatus: 'Finalizado ADM',
                result: (demand.result || '') + ' [Admin] Processo Finalizado.' 
            };
            appStore.updateDemand(updated);
            refreshData();
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            <header className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <ShieldCheck className="w-8 h-8 text-brand-primary" />
                        Backoffice
                    </h1>
                    <p className="text-brand-gray-600 mt-1">Validação de cadastros e demandas operacionais.</p>
                </div>
                
                <div className="flex bg-brand-gray-200 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('CADASTROS')}
                        className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'CADASTROS' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                    >
                        Novos Cadastros ({registrations.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('DEMANDAS')}
                        className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'DEMANDAS' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                    >
                        Manutenção / Trocas ({demands.length})
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 min-h-[500px] p-6 bg-brand-gray-50/50">
                
                {/* TAB: CADASTROS */}
                {activeTab === 'CADASTROS' && (
                    <>
                        {registrations.length === 0 ? (
                            <div className="p-12 text-center text-brand-gray-400 flex flex-col items-center">
                                <CheckCircle2 className="w-16 h-16 mb-4 text-green-100" />
                                <p className="text-lg font-medium text-gray-500">Nenhum cadastro aguardando validação.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {registrations.map(reg => (
                                    <div key={reg.id} className="bg-white rounded-xl shadow-sm border border-brand-gray-200 hover:shadow-md transition-all flex flex-col overflow-hidden">
                                        <div className="p-4 border-b border-brand-gray-100 flex justify-between items-start bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-blue-100 text-blue-700 p-2 rounded-lg">
                                                    <Building2 className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Solicitante</span>
                                                    <span className="text-xs font-bold text-gray-700">{reg.requesterName}</span>
                                                </div>
                                            </div>
                                            <span className="text-[10px] bg-brand-gray-200 text-gray-600 px-2 py-1 rounded font-mono">{new Date(reg.dateSubmitted).toLocaleDateString()}</span>
                                        </div>
                                        <div className="p-5 flex-1">
                                            <h3 className="font-bold text-brand-gray-900 text-lg mb-1 truncate" title={reg.clientName}>{reg.clientName}</h3>
                                            <p className="text-xs text-brand-gray-500 font-mono mb-4">{reg.documentNumber}</p>
                                            <div className="flex gap-2 mb-2">
                                                <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${reg.planType === 'Full' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    Plano {reg.planType}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-4 border-t border-brand-gray-100 bg-gray-50/50">
                                            <button 
                                                onClick={() => setSelectedReg(reg)}
                                                className="w-full py-2.5 bg-brand-gray-900 text-white rounded-lg font-bold text-xs hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                <FileCheck className="w-4 h-4" />
                                                Validar Cadastro
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* TAB: OUTRAS DEMANDAS */}
                {activeTab === 'DEMANDAS' && (
                    <div className="bg-white rounded-xl border border-brand-gray-200 overflow-hidden">
                        <div className="divide-y divide-brand-gray-100">
                            {demands.length === 0 ? (
                                <div className="p-12 text-center text-brand-gray-400">
                                    <p>Nenhuma demanda pendente.</p>
                                </div>
                            ) : (
                                demands.map(demand => {
                                    const isLogisticsDone = demand.otp && demand.status === 'Concluído' && demand.adminStatus === 'Pendente ADM';
                                    
                                    return (
                                        <div key={demand.id} className="p-6 hover:bg-brand-gray-50 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${demand.type.includes('Troca') ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                                                        {demand.type.includes('Troca') ? <RefreshCw size={18} /> : <FileText size={18} />}
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-bold text-brand-primary uppercase tracking-wider mb-1 block">{demand.type}</span>
                                                        <h3 className="font-bold text-brand-gray-900 text-lg">{demand.clientName}</h3>
                                                    </div>
                                                </div>
                                                
                                                {isLogisticsDone ? (
                                                    <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full border border-green-200 flex items-center gap-1">
                                                        <CheckCircle2 size={12}/> Logística OK
                                                    </span>
                                                ) : (
                                                    <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full">{demand.status}</span>
                                                )}
                                            </div>
                                            
                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 my-4 text-sm text-brand-gray-700">
                                                <p>{demand.description}</p>
                                                {demand.result && (
                                                    <p className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                                                        <strong>Histórico:</strong> {demand.result}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <div className="text-xs text-brand-gray-400">
                                                    Solicitante: <span className="font-bold text-brand-gray-600">{demand.requester}</span> • {new Date(demand.date).toLocaleDateString()}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button className="text-red-600 hover:text-red-800 text-sm font-bold px-3 py-2 border border-transparent hover:bg-red-50 rounded">
                                                        Rejeitar
                                                    </button>
                                                    <button 
                                                        onClick={() => handleCompleteDemand(demand)}
                                                        className={`px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 text-white transition-colors
                                                            ${isLogisticsDone ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-400 hover:bg-gray-500'}`}
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" /> 
                                                        {isLogisticsDone ? 'Validar Contrato & Finalizar' : 'Concluir'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* VALIDATION MODAL */}
            {selectedReg && (
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-brand-gray-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5" /> Validação de Cadastro
                            </h3>
                            <button onClick={() => setSelectedReg(null)} className="text-brand-gray-400 hover:text-white"><X size={20}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
                            <FichaCadastralView data={selectedReg} onViewDoc={setViewDocType} />
                        </div>

                        <div className="p-6 bg-white border-t border-brand-gray-200 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-10">
                            <div className="flex flex-col md:flex-row gap-6 items-end justify-between">
                                <div className="w-full md:w-1/2">
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-2">
                                        ID Interno / Código EC (Obrigatório)
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            value={internalId}
                                            onChange={e => setInternalId(e.target.value)}
                                            placeholder="Ex: 99887766"
                                            className="w-full border-2 border-brand-gray-300 rounded-xl px-4 py-3 text-lg font-mono font-bold text-brand-gray-900 focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
                                        />
                                        {!internalId && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 animate-pulse"><AlertCircle className="w-5 h-5" /></div>}
                                    </div>
                                    <p className="text-xs text-brand-gray-400 mt-2">
                                        Preencha com o código gerado no sistema legado para vincular.
                                    </p>
                                </div>

                                <div className="flex gap-3 w-full md:w-auto">
                                    <button 
                                        onClick={handleRejectRegistration}
                                        disabled={isProcessing}
                                        className="px-6 py-3 border border-red-200 text-red-700 font-bold rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                                    >
                                        Devolver
                                    </button>
                                    <button 
                                        onClick={handleApproveRegistration}
                                        disabled={!internalId || isProcessing}
                                        className="px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
                                    >
                                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                        Aprovar & Enviar p/ Logística
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <DocViewerModal isOpen={!!viewDocType} onClose={() => setViewDocType(null)} docType={viewDocType} />
        </div>
    );
};

export default AdminDemandsPage;
