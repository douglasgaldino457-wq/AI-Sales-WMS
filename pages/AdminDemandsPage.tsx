
import React, { useState, useEffect } from 'react';
import { 
    CheckCircle2, X, Search, FileText, User, Calendar, Clock, 
    ChevronRight, Eye, ShieldCheck, Filter, Send, Download, AlertCircle, Loader2,
    Building2, FileCheck, RefreshCw, Trash2, CreditCard, BadgePercent, LayoutList,
    Image as ImageIcon, MessageSquare
} from 'lucide-react';
import { appStore } from '../services/store';
import { RegistrationRequest, ManualDemand, RegistrationStatus } from '../types';
import { FichaCadastralView, DocViewerModal } from './CadastroPage'; 

type FeedItemType = 'REGISTRATION' | 'DEMAND';

interface FeedItem {
    type: FeedItemType;
    sortDate: string;
    data: RegistrationRequest | ManualDemand;
}

const AdminDemandsPage: React.FC = () => {
    // Consolidated View State
    const [filterType, setFilterType] = useState<'ALL' | 'REGISTRATION' | 'DEMAND'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Data State
    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
    
    // Modal & Action State
    const [selectedReg, setSelectedReg] = useState<RegistrationRequest | null>(null);
    const [viewDemand, setViewDemand] = useState<ManualDemand | null>(null); // NEW: State for viewing demand details
    const [internalId, setInternalId] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [viewDocType, setViewDocType] = useState<string | null>(null);

    useEffect(() => {
        refreshData();
        const interval = setInterval(refreshData, 5000);
        return () => clearInterval(interval);
    }, []);

    const refreshData = () => {
        const allRegs = appStore.getRegistrationRequests().filter(r => r.status === 'PENDING_ANALYSIS');
        const allDemands = appStore.getDemands().filter(d => 
            d.status === 'Pendente' || 
            d.status === 'Em Análise' || 
            d.adminStatus === 'Pendente ADM'
        );

        // Normalize and Merge
        const regsMapped: FeedItem[] = allRegs.map(r => ({
            type: 'REGISTRATION',
            sortDate: r.dateSubmitted,
            data: r
        }));

        const demandsMapped: FeedItem[] = allDemands.map(d => ({
            type: 'DEMAND',
            sortDate: d.date,
            data: d
        }));

        // Combine and Sort by Date (Newest First)
        const combined = [...regsMapped, ...demandsMapped].sort((a, b) => 
            new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime()
        );

        setFeedItems(combined);
    };

    // Filter Logic
    const filteredItems = feedItems.filter(item => {
        // Type Filter
        if (filterType !== 'ALL' && item.type !== filterType) return false;

        // Search Filter
        const term = searchTerm.toLowerCase();
        const clientName = item.type === 'REGISTRATION' 
            ? (item.data as RegistrationRequest).clientName 
            : (item.data as ManualDemand).clientName;
        
        const id = item.data.id;
        const subType = item.type === 'DEMAND' ? (item.data as ManualDemand).type : 'Cadastro';

        return clientName.toLowerCase().includes(term) || 
               id.toLowerCase().includes(term) || 
               subType.toLowerCase().includes(term);
    });

    const handleApproveRegistration = () => {
        if (!internalId.trim()) {
            alert("Obrigatório: Preencha o ID Interno (Código EC) gerado no sistema legado.");
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
            alert(`Cadastro ID ${internalId} aprovado! Enviado para fila de ativação GSurf (Logística).`);
        }, 1500);
    };

    const handleRejectRegistration = () => {
        if (!selectedReg) return;
        const reason = prompt("Motivo da devolução (Pendência):");
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
            ? "Logística já realizou a troca física/sistêmica. Confirmar atualização final no ERP/Faturamento?"
            : "Confirmar execução e conclusão desta demanda?";

        if(confirm(confirmMsg)) {
            const updated: ManualDemand = { 
                ...demand, 
                status: 'Concluído', 
                adminStatus: 'Finalizado ADM',
                result: (demand.result || '') + ' [Admin] Processo Finalizado.' 
            };
            appStore.updateDemand(updated);
            refreshData();
            if(viewDemand?.id === demand.id) setViewDemand(null); // Close modal if open
        }
    };

    const handleRejectDemand = (demand: ManualDemand) => {
        const reason = prompt("Motivo da rejeição:");
        if(!reason) return;

        const updated: ManualDemand = {
            ...demand,
            status: 'Rejeitado',
            result: `Rejeitado por Admin: ${reason}`
        };
        appStore.updateDemand(updated);
        refreshData();
        if(viewDemand?.id === demand.id) setViewDemand(null);
    };

    const getDemandIcon = (type: string) => {
        if (type.includes('Taxa')) return <BadgePercent className="w-5 h-5 text-green-600"/>;
        if (type.includes('Bancária')) return <CreditCard className="w-5 h-5 text-blue-600"/>;
        if (type.includes('Troca')) return <RefreshCw className="w-5 h-5 text-orange-600"/>;
        return <FileText className="w-5 h-5 text-gray-600"/>;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Pendente ADM': return <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded border border-purple-200 animate-pulse">Aguardando Finalização</span>;
            case 'Pendente': return <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1 rounded border border-orange-200">Pendente</span>;
            case 'Em Análise': return <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded border border-blue-200">Em Análise</span>;
            default: return null;
        }
    };

    // --- SUB-COMPONENTS FOR LIST ITEMS ---

    const RegistrationItem = ({ req }: { req: RegistrationRequest }) => (
        <div className="bg-white rounded-xl shadow-sm border border-l-4 border-l-brand-primary border-y-brand-gray-200 border-r-brand-gray-200 p-5 hover:shadow-md transition-all flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <span className="bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1">
                        <User size={12} /> Novo Cadastro
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">{new Date(req.dateSubmitted).toLocaleDateString()}</span>
                </div>
                <h3 className="font-bold text-lg text-brand-gray-900">{req.clientName}</h3>
                <div className="flex items-center gap-4 mt-1 text-xs text-brand-gray-600">
                    <span className="font-mono bg-gray-100 px-1 rounded">{req.documentNumber}</span>
                    <span className="flex items-center gap-1"><Building2 size={12}/> Plano {req.planType}</span>
                    <span className="text-gray-400">Solicitante: {req.requesterName}</span>
                </div>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                <button 
                    onClick={() => setSelectedReg(req)}
                    className="flex-1 md:flex-none px-6 py-2.5 bg-brand-gray-900 text-white rounded-lg font-bold text-xs hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                    <FileCheck className="w-4 h-4" />
                    Validar & Aprovar
                </button>
            </div>
        </div>
    );

    const DemandItem = ({ demand }: { demand: ManualDemand }) => {
        const isLogisticsDone = demand.adminStatus === 'Pendente ADM';
        const hasEvidence = !!demand.pricingData?.evidenceUrl;

        return (
            <div 
                onClick={() => setViewDemand(demand)}
                className={`bg-white rounded-xl shadow-sm border border-y-brand-gray-200 border-r-brand-gray-200 p-5 hover:shadow-md transition-all flex flex-col md:flex-row gap-4 items-start md:items-center cursor-pointer group ${isLogisticsDone ? 'border-l-4 border-l-purple-500' : 'border-l-4 border-l-gray-300'}`}
            >
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1">
                            {getDemandIcon(demand.type)} {demand.type}
                        </span>
                        {getStatusBadge(demand.adminStatus || demand.status)}
                        <span className="text-[10px] text-gray-400 font-mono">{new Date(demand.date).toLocaleDateString()}</span>
                        {hasEvidence && (
                            <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <ImageIcon size={10} /> Evidência
                            </span>
                        )}
                    </div>
                    <h3 className="font-bold text-lg text-brand-gray-900 group-hover:text-brand-primary transition-colors">{demand.clientName}</h3>
                    <p className="text-xs text-brand-gray-500 mt-1 line-clamp-1">{demand.description}</p>
                    {demand.result && isLogisticsDone && (
                        <p className="text-xs text-purple-700 bg-purple-50 p-1.5 rounded mt-2 border border-purple-100 inline-block">
                            <strong>Logística:</strong> {demand.result}
                        </p>
                    )}
                </div>

                <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleRejectDemand(demand); }}
                        className="px-4 py-2 border border-red-100 text-red-600 font-bold rounded-lg text-xs hover:bg-red-50 transition-colors"
                    >
                        Rejeitar
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleCompleteDemand(demand); }}
                        className={`px-6 py-2.5 rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-2 text-white transition-colors flex-1 md:flex-none
                            ${isLogisticsDone ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-500 hover:bg-gray-600'}`}
                    >
                        <CheckCircle2 className="w-4 h-4" /> 
                        {isLogisticsDone ? 'Finalizar Faturamento' : 'Concluir'}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            <header className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <ShieldCheck className="w-8 h-8 text-brand-primary" />
                        Backoffice
                    </h1>
                    <p className="text-brand-gray-600 mt-1">Validação cadastral e gestão unificada de demandas.</p>
                </div>
                
                {/* GLOBAL SEARCH */}
                <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar por cliente, ID, CNPJ..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-brand-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none shadow-sm"
                    />
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <div className="bg-brand-gray-50/50 min-h-[500px] flex flex-col">
                
                {/* UNIFIED FILTER BAR */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    <button 
                        onClick={() => setFilterType('ALL')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${filterType === 'ALL' ? 'bg-brand-gray-900 text-white shadow-md' : 'bg-white text-brand-gray-600 border border-brand-gray-200 hover:bg-brand-gray-100'}`}
                    >
                        <LayoutList size={16} /> Todos ({feedItems.length})
                    </button>
                    <button 
                        onClick={() => setFilterType('REGISTRATION')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${filterType === 'REGISTRATION' ? 'bg-brand-primary text-white shadow-md' : 'bg-white text-brand-gray-600 border border-brand-gray-200 hover:bg-brand-gray-100'}`}
                    >
                        <User size={16} /> Cadastros
                    </button>
                    <button 
                        onClick={() => setFilterType('DEMAND')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${filterType === 'DEMAND' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-brand-gray-600 border border-brand-gray-200 hover:bg-brand-gray-100'}`}
                    >
                        <FileText size={16} /> Demandas
                    </button>
                </div>

                {/* FEED LIST */}
                <div className="space-y-4">
                    {filteredItems.length === 0 ? (
                        <div className="p-16 text-center text-brand-gray-400 bg-white rounded-xl border border-brand-gray-100 border-dashed">
                            <CheckCircle2 className="w-12 h-12 mb-3 opacity-20 mx-auto" />
                            <p className="text-lg font-medium">Nenhuma pendência encontrada.</p>
                            <p className="text-xs">Filtro atual: {filterType === 'ALL' ? 'Todos' : filterType}</p>
                        </div>
                    ) : (
                        filteredItems.map((item, idx) => (
                            <React.Fragment key={item.data.id}>
                                {item.type === 'REGISTRATION' ? (
                                    <RegistrationItem req={item.data as RegistrationRequest} />
                                ) : (
                                    <DemandItem demand={item.data as ManualDemand} />
                                )}
                            </React.Fragment>
                        ))
                    )}
                </div>
            </div>

            {/* DEMAND DETAIL MODAL (WITH EVIDENCE) */}
            {viewDemand && (
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-brand-gray-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
                            <div>
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    {getDemandIcon(viewDemand.type)} Detalhes da Solicitação
                                </h3>
                                <p className="text-xs text-brand-gray-400 mt-0.5 font-mono">{viewDemand.id}</p>
                            </div>
                            <button onClick={() => setViewDemand(null)} className="text-brand-gray-400 hover:text-white"><X size={20}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 bg-brand-gray-50">
                            
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-brand-gray-200 mb-6">
                                <h4 className="text-xl font-bold text-brand-gray-900 mb-1">{viewDemand.clientName}</h4>
                                <div className="flex items-center gap-3 text-sm text-brand-gray-500 mb-4">
                                    <span className="flex items-center gap-1"><User size={14}/> {viewDemand.requester}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(viewDemand.date).toLocaleString()}</span>
                                </div>
                                <div className="p-4 bg-brand-gray-50 rounded-lg border border-brand-gray-100 text-sm text-brand-gray-700 whitespace-pre-wrap">
                                    {viewDemand.description}
                                </div>
                            </div>

                            {/* EVIDENCE SECTION */}
                            {viewDemand.pricingData?.evidenceUrl && (
                                <div className="bg-white p-5 rounded-xl shadow-sm border border-brand-gray-200 mb-6">
                                    <h4 className="text-sm font-bold text-brand-gray-900 uppercase flex items-center gap-2 mb-4 border-b border-brand-gray-100 pb-2">
                                        <ImageIcon className="w-4 h-4 text-blue-600" /> Evidência Anexada
                                    </h4>
                                    <div className="rounded-lg overflow-hidden border border-brand-gray-200 bg-brand-gray-100 flex justify-center">
                                        <img 
                                            src={viewDemand.pricingData.evidenceUrl} 
                                            alt="Evidência" 
                                            className="max-h-96 max-w-full object-contain"
                                        />
                                    </div>
                                    <div className="mt-3 text-center">
                                        <a 
                                            href={viewDemand.pricingData.evidenceUrl} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1"
                                        >
                                            <Download size={12} /> Baixar / Abrir Original
                                        </a>
                                    </div>
                                </div>
                            )}

                            {viewDemand.changeLog && viewDemand.changeLog.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-brand-gray-400 uppercase">Histórico</h4>
                                    {viewDemand.changeLog.map((log, idx) => (
                                        <div key={idx} className="text-xs bg-white p-2 rounded border border-brand-gray-200 flex justify-between">
                                            <span className="text-brand-gray-700"><strong>{log.user}:</strong> {log.action}</span>
                                            <span className="text-brand-gray-400">{new Date(log.date).toLocaleDateString()}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-white border-t border-brand-gray-200 shrink-0 flex justify-end gap-3">
                            <button 
                                onClick={() => handleRejectDemand(viewDemand)}
                                className="px-4 py-2 border border-red-200 text-red-700 font-bold rounded-lg text-sm hover:bg-red-50"
                            >
                                Rejeitar
                            </button>
                            <button 
                                onClick={() => handleCompleteDemand(viewDemand)}
                                className="px-6 py-2 bg-brand-gray-900 text-white font-bold rounded-lg text-sm hover:bg-black shadow-md flex items-center gap-2"
                            >
                                <CheckCircle2 size={16} /> Concluir Demanda
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* VALIDATION MODAL (GENERATE ID) - REUSED */}
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
                                        Ao aprovar, o cadastro será enviado automaticamente para a <strong>Fila de Logística</strong> para geração do OTP GSurf.
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
