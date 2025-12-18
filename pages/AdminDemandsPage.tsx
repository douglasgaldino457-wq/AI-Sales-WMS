
import React, { useState, useEffect } from 'react';
import { 
    CheckCircle2, X, Search, FileText, User, Calendar, Clock, 
    ChevronRight, Eye, ShieldCheck, Filter, Send, Download, AlertCircle, Loader2,
    Building2, FileCheck, RefreshCw, Trash2, CreditCard, BadgePercent, LayoutList,
    Image as ImageIcon, MessageSquare, ShieldAlert, UserCheck
} from 'lucide-react';
import { appStore } from '../services/store';
import { RegistrationRequest, ManualDemand, RegistrationStatus, LogisticsTask } from '../types';
import { FichaCadastralView, DocViewerModal } from './CadastroPage'; 

type FeedItemType = 'REGISTRATION' | 'DEMAND';

interface FeedItem {
    type: FeedItemType;
    sortDate: string;
    data: RegistrationRequest | ManualDemand;
}

const AdminDemandsPage: React.FC = () => {
    const [filterType, setFilterType] = useState<'ALL' | 'REGISTRATION' | 'DEMAND'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
    const [selectedReg, setSelectedReg] = useState<RegistrationRequest | null>(null);
    const [viewDemand, setViewDemand] = useState<ManualDemand | null>(null);
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

        const combined = [...regsMapped, ...demandsMapped].sort((a, b) => 
            new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime()
        );

        setFeedItems(combined);
    };

    const filteredItems = feedItems.filter(item => {
        if (filterType !== 'ALL' && item.type !== filterType) return false;
        const term = searchTerm.toLowerCase();
        const clientName = item.type === 'REGISTRATION' 
            ? (item.data as RegistrationRequest).clientName 
            : (item.data as ManualDemand).clientName;
        const id = item.data.id;
        const subType = item.type === 'DEMAND' ? (item.data as ManualDemand).type : 'Cadastro';
        return clientName.toLowerCase().includes(term) || id.toLowerCase().includes(term) || subType.toLowerCase().includes(term);
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
                approvalData: { date: new Date().toISOString(), approvedBy: 'Admin User' }
            };
            appStore.approveRegistration(updatedReg);
            const logisticsTask: LogisticsTask = {
                id: `LOG-${Date.now()}`,
                type: 'FIELD_ACTIVATION',
                status: 'PENDING_SHIPMENT',
                clientName: selectedReg.clientName,
                internalId: internalId,
                documentNumber: selectedReg.documentNumber,
                address: selectedReg.address,
                contactPhone: selectedReg.contactPhones?.[0] || '',
                email: selectedReg.email,
                requesterName: selectedReg.requesterName,
                requesterRole: selectedReg.requesterRole,
                date: new Date().toISOString(),
                details: `Ativação de Novo Cliente (EC: ${internalId}). Plano: ${selectedReg.planType}.`,
                allocatedPosList: selectedReg.requestedEquipments
            };
            appStore.addLogisticsTask(logisticsTask);
            setIsProcessing(false);
            setSelectedReg(null);
            setInternalId('');
            refreshData();
            alert(`Cadastro ID ${internalId} aprovado!`);
        }, 1500);
    };

    const handleCompleteDemand = (demand: ManualDemand) => {
        if(confirm("Confirmar execução e conclusão desta demanda?")) {
            const updated: ManualDemand = { 
                ...demand, 
                status: 'Concluído', 
                adminStatus: 'Finalizado ADM',
                result: (demand.result || '') + ' [Admin] Processo Finalizado.' 
            };
            appStore.updateDemand(updated);
            refreshData();
            if(viewDemand?.id === demand.id) setViewDemand(null);
        }
    };

    const getDemandIcon = (type: string) => {
        if (type.includes('Taxa')) return <BadgePercent className="w-5 h-5 text-green-600"/>;
        if (type.includes('Bancária')) return <CreditCard className="w-5 h-5 text-blue-600"/>;
        if (type.includes('Troca')) return <RefreshCw className="w-5 h-5 text-orange-600"/>;
        return <FileText className="w-5 h-5 text-gray-600"/>;
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
                <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-brand-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none" />
                </div>
            </header>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <button onClick={() => setFilterType('ALL')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterType === 'ALL' ? 'bg-brand-gray-900 text-white shadow-md' : 'bg-white text-brand-gray-600 border border-brand-gray-200 hover:bg-brand-gray-100'}`}><LayoutList size={16} /> Todos ({feedItems.length})</button>
                <button onClick={() => setFilterType('REGISTRATION')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterType === 'REGISTRATION' ? 'bg-brand-primary text-white shadow-md' : 'bg-white text-brand-gray-600 border border-brand-gray-200 hover:bg-brand-gray-100'}`}><User size={16} /> Cadastros</button>
                <button onClick={() => setFilterType('DEMAND')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterType === 'DEMAND' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-brand-gray-600 border border-brand-gray-200 hover:bg-brand-gray-100'}`}><FileText size={16} /> Demandas</button>
            </div>

            <div className="space-y-4">
                {filteredItems.map((item) => {
                    const req = item.data as RegistrationRequest;
                    const demand = item.data as ManualDemand;
                    const isReg = item.type === 'REGISTRATION';
                    
                    return (
                        <div key={item.data.id} onClick={() => !isReg && setViewDemand(demand)} className={`bg-white rounded-xl shadow-sm border border-y-brand-gray-200 border-r-brand-gray-200 p-5 hover:shadow-md transition-all flex flex-col md:flex-row gap-4 items-start md:items-center border-l-4 ${isReg ? 'border-l-brand-primary' : 'border-l-blue-500 cursor-pointer group'}`}>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1">
                                        {isReg ? <User size={12} /> : getDemandIcon(demand.type)} {isReg ? 'Novo Cadastro' : demand.type}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-mono">{new Date(item.sortDate).toLocaleDateString()}</span>
                                </div>
                                <h3 className="font-bold text-lg text-brand-gray-900 group-hover:text-brand-primary transition-colors">{isReg ? req.clientName : demand.clientName}</h3>
                                <p className="text-xs text-brand-gray-500 mt-1 line-clamp-1">{isReg ? req.address : demand.description}</p>
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                                <button onClick={(e) => { e.stopPropagation(); isReg ? setSelectedReg(req) : setViewDemand(demand); }} className="flex-1 md:flex-none px-6 py-2.5 bg-brand-gray-900 text-white rounded-lg font-bold text-xs hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-sm">
                                    <Eye size={14} /> Analisar
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* DEMAND DETAIL MODAL - UPDATED WITH BANK INFO */}
            {viewDemand && (
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-brand-gray-900 px-6 py-4 flex justify-between items-center text-white">
                            <div>
                                <h3 className="font-bold text-lg flex items-center gap-2">{getDemandIcon(viewDemand.type)} {viewDemand.type}</h3>
                                <p className="text-xs text-brand-gray-400 mt-0.5 font-mono">Solicitação #{viewDemand.id}</p>
                            </div>
                            <button onClick={() => setViewDemand(null)} className="text-brand-gray-400 hover:text-white"><X size={20}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-brand-gray-50">
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-brand-gray-200 mb-6">
                                <h4 className="text-xl font-bold text-brand-gray-900 mb-4">{viewDemand.clientName}</h4>
                                
                                {/* DADOS BANCÁRIOS ESTRUTURADOS PARA ADMIN */}
                                {viewDemand.type.includes('Bancária') && (
                                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                                        <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                                            <h5 className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-1"><CreditCard size={12}/> Novos Dados Bancários</h5>
                                            {viewDemand.description?.includes('Terceiro: SIM') && (
                                                <span className="bg-red-100 text-red-700 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                                    <ShieldAlert size={10}/> CONTA DE TERCEIRO
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><p className="text-[9px] font-bold text-blue-400 uppercase">Banco</p><p className="text-sm font-bold text-brand-gray-900">{viewDemand.description?.match(/Banco\s*([^\s,]+)/)?.[1] || 'Ver Obs.'}</p></div>
                                            <div><p className="text-[9px] font-bold text-blue-400 uppercase">Agência / Conta</p><p className="text-sm font-bold text-brand-gray-900">{viewDemand.description?.match(/Ag\s*([^,]+)/)?.[1]} / {viewDemand.description?.match(/CC\s*([^.]+)/)?.[1]}</p></div>
                                            <div className="col-span-2"><p className="text-[9px] font-bold text-blue-400 uppercase">Titular</p><p className="text-sm font-bold text-brand-gray-900">{viewDemand.description?.match(/Titular:\s*([^.]+)/)?.[1]}</p></div>
                                        </div>
                                    </div>
                                )}

                                <div className="p-4 bg-brand-gray-50 rounded-lg border border-brand-gray-100 text-sm text-brand-gray-700">
                                    <p className="font-bold text-[10px] uppercase text-brand-gray-400 mb-1">Descrição do Consultor</p>
                                    <p className="whitespace-pre-wrap">{viewDemand.description}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-white border-t flex justify-end gap-3">
                            <button onClick={() => setViewDemand(null)} className="px-4 py-2 border rounded-lg text-sm font-bold text-gray-600">Fechar</button>
                            <button onClick={() => handleCompleteDemand(viewDemand)} className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-bold shadow hover:bg-green-700">Concluir no Sistema</button>
                        </div>
                    </div>
                </div>
            )}

            {/* REGISTRATION MODAL - KEEPING EXISTING BUT ENSURING CLEAN UI */}
            {selectedReg && (
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-brand-gray-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
                            <h3 className="font-bold text-lg flex items-center gap-2"><ShieldCheck size={20} /> Validação de Credenciamento</h3>
                            <button onClick={() => setSelectedReg(null)} className="text-brand-gray-400 hover:text-white"><X size={20}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
                            <FichaCadastralView data={selectedReg} onViewDoc={setViewDocType} />
                        </div>
                        <div className="p-6 bg-white border-t border-brand-gray-200 flex flex-col md:flex-row gap-6 items-end justify-between">
                            <div className="w-full md:w-1/2">
                                <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-2">Código EC Gerado (SIC)</label>
                                <input type="text" value={internalId} onChange={e => setInternalId(e.target.value)} placeholder="Obrigatório para aprovação..." className="w-full border-2 border-brand-gray-300 rounded-xl px-4 py-3 text-lg font-mono font-bold text-brand-gray-900 focus:border-brand-primary outline-none" />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setSelectedReg(null)} className="px-6 py-3 border border-brand-gray-300 rounded-xl font-bold text-sm">Devolver</button>
                                <button onClick={handleApproveRegistration} disabled={!internalId || isProcessing} className="px-8 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                                    {isProcessing ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle2 size={18}/>} Aprovar & Enviar Logística
                                </button>
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
