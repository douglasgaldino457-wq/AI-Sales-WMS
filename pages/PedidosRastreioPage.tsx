
import React, { useState, useEffect, useRef } from 'react';
import { 
    Package, Truck, Search, MapPin, Clock, CheckCircle2, 
    ClipboardList, AlertTriangle, ExternalLink, Calendar,
    ListTodo, Briefcase, Plus, Terminal, RefreshCw, CreditCard, BadgePercent, UserCog, MoreHorizontal, X, FileText, Building2, Key, ShieldCheck, ChevronRight, Hourglass
} from 'lucide-react';
import { appStore } from '../services/store';
import { LogisticsTask, ManualDemand, DemandActionType, ClientBaseRow } from '../types';
import { useAppStore } from '../services/useAppStore'; 
import { Page } from '../types';

interface PedidosRastreioPageProps {
    targetDemandId?: string;
}

const SLA_CONFIG: Record<string, number> = {
    'Troca de POS': 24,
    'Desativação de POS': 72,
    'Alteração Bancária': 48,
    'Alteração de Taxas': 4, 
    'Negociação de Taxas': 4,
    'Alteração Cadastral': 48,
    'Outros': 24
};

const PedidosRastreioPage: React.FC<PedidosRastreioPageProps> = ({ targetDemandId }) => {
    const { navigate } = useAppStore();
    const [activeTab, setActiveTab] = useState<'TRACKING' | 'SERVICES'>('SERVICES'); 
    const [tasks, setTasks] = useState<LogisticsTask[]>([]);
    const [demands, setDemands] = useState<ManualDemand[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal States
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [selectedActionType, setSelectedActionType] = useState<DemandActionType | null>(null);
    const [newRequestData, setNewRequestData] = useState({ clientName: '', description: '', id: '' });
    
    const [selectedItem, setSelectedItem] = useState<ManualDemand | null>(null);

    // Client Autocomplete State
    const [allClients, setAllClients] = useState<ClientBaseRow[]>([]);
    const [suggestions, setSuggestions] = useState<ClientBaseRow[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchWrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        refreshData();
        setAllClients(appStore.getClients());
        
        const storedContext = sessionStorage.getItem('temp_service_context');
        if (storedContext) {
            try {
                const data = JSON.parse(storedContext);
                setIsActionModalOpen(true);
                setNewRequestData(prev => ({ ...prev, clientName: data.clientName }));
                sessionStorage.removeItem('temp_service_context');
            } catch(e) {
                console.error("Error parsing context", e);
            }
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (targetDemandId && demands.length > 0) {
            const target = demands.find(d => d.id === targetDemandId);
            if (target) {
                setSelectedItem(target);
                setActiveTab('SERVICES');
            }
        }
    }, [targetDemandId, demands]);

    const refreshData = () => {
        setTasks(appStore.getLogisticsTasks());
        setDemands(appStore.getDemands().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };

    const filteredTasks = tasks.filter(t => 
        t.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.trackingCode?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredDemands = demands.filter(d => 
        d.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenActionModal = () => {
        setIsActionModalOpen(true);
        setSelectedActionType(null);
        setNewRequestData({ clientName: '', description: '', id: '' });
    };

    const handleClientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setNewRequestData({ ...newRequestData, clientName: val });
        
        if (val.length > 1) {
            const matches = allClients.filter(c => 
                c.nomeEc.toLowerCase().includes(val.toLowerCase()) || 
                c.id.toLowerCase().includes(val.toLowerCase())
            ).slice(0, 5);
            setSuggestions(matches);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    const selectClient = (client: ClientBaseRow) => {
        setNewRequestData({
            ...newRequestData, 
            clientName: client.nomeEc
        });
        setShowSuggestions(false);
    };

    const handleSubmitRequest = () => {
        if (!selectedActionType || !newRequestData.clientName) {
            alert("Preencha os campos obrigatórios.");
            return;
        }

        const newDemand: ManualDemand = {
            id: `REQ-${Math.floor(Math.random() * 10000)}`,
            type: selectedActionType,
            actionCategory: selectedActionType,
            clientName: newRequestData.clientName,
            date: new Date().toISOString(),
            status: 'Pendente',
            adminStatus: 'Pendente ADM',
            requester: 'Usuário Atual',
            description: newRequestData.description || `Solicitação de ${selectedActionType}`
        };

        appStore.addDemand(newDemand);
        refreshData();
        setIsActionModalOpen(false);
        alert("Solicitação criada com sucesso!");
    };

    const getStatusBadge = (status: string, type: 'status' | 'admin' = 'status') => {
        if (type === 'admin') {
            switch (status) {
                case 'Finalizado ADM': return <span className="bg-green-50 text-green-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase border border-green-100 shadow-sm">{status}</span>;
                case 'Em Processamento': return <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase border border-blue-100 shadow-sm">{status}</span>;
                case 'Pendente ADM': return <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase border border-orange-100 shadow-sm">{status}</span>;
                default: return null;
            }
        }
        
        switch (status) {
            case 'Concluído': return <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border border-green-200 flex items-center gap-1.5 shadow-sm w-fit"><CheckCircle2 size={12}/> Concluído</span>;
            case 'Aprovado Pricing': return <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border border-purple-200 flex items-center gap-1.5 shadow-sm w-fit"><BadgePercent size={12}/> Aprovado</span>;
            case 'Em Análise': return <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border border-blue-200 flex items-center gap-1.5 shadow-sm w-fit"><Clock size={12}/> Em Análise</span>;
            case 'Pendente': return <span className="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border border-orange-200 flex items-center gap-1.5 shadow-sm w-fit"><Clock size={12}/> Pendente</span>;
            default: return <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase shadow-sm w-fit">{status}</span>;
        }
    };

    const SlaProgress = ({ date, type, status }: { date: string, type: string, status: string }) => {
        const isFinished = ['Concluído', 'Aprovado Pricing', 'Rejeitado', 'Finalizado ADM'].includes(status);
        const slaHours = SLA_CONFIG[type] || SLA_CONFIG['Outros'];
        const startTime = new Date(date).getTime();
        const now = new Date().getTime();
        
        if (isFinished) {
            return (
                <div className="w-full mt-1.5">
                    <div className="flex justify-between text-[9px] mb-0.5 text-green-700 font-bold">
                        <span>SLA Finalizado</span>
                        <CheckCircle2 size={10} />
                    </div>
                    <div className="w-full bg-green-100 rounded-full h-1.5">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                </div>
            );
        }

        const elapsedMs = now - startTime;
        const totalSlaMs = slaHours * 60 * 60 * 1000;
        const percent = Math.min((elapsedMs / totalSlaMs) * 100, 100);
        
        let color = 'bg-blue-500';
        let textColor = 'text-blue-600';
        if (percent > 60) { color = 'bg-orange-500'; textColor = 'text-orange-600'; }
        if (percent >= 90) { color = 'bg-red-500'; textColor = 'text-red-600'; }

        const remainingMs = totalSlaMs - elapsedMs;
        const remainingHrs = Math.ceil(remainingMs / (1000 * 60 * 60));
        const displayText = remainingMs > 0 ? `${remainingHrs}h restantes` : 'SLA Estourado';

        return (
            <div className="w-full mt-1.5 min-w-[100px]">
                <div className={`flex justify-between text-[9px] mb-0.5 font-bold ${textColor}`}>
                    <span className="flex items-center gap-1"><Hourglass size={8}/> {displayText}</span>
                    <span>{Math.round(percent)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-1.5 rounded-full transition-all duration-500 ${color}`} style={{ width: `${percent}%` }}></div>
                </div>
            </div>
        );
    };

    const getActionIcon = (type: string) => {
        if (type.includes('Desativação')) return <Terminal className="w-4 h-4 text-red-500" />;
        if (type.includes('Troca')) return <RefreshCw className="w-4 h-4 text-orange-500" />;
        if (type.includes('Bancária')) return <CreditCard className="w-4 h-4 text-blue-500" />;
        if (type.includes('Taxa')) return <BadgePercent className="w-4 h-4 text-green-500" />;
        if (type.includes('Cadastro')) return <UserCog className="w-4 h-4 text-purple-500" />;
        return <ClipboardList className="w-4 h-4 text-gray-500" />;
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-24 md:pb-20 relative">
            <header className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div className="w-full md:w-auto">
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <ListTodo className="w-8 h-8 text-brand-primary" />
                        Minhas Solicitações
                    </h1>
                    <p className="text-brand-gray-600 mt-1 text-sm">Central de serviços e acompanhamento.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <div className="bg-brand-gray-200 p-1 rounded-xl flex w-full sm:w-auto">
                        <button onClick={() => setActiveTab('SERVICES')} className={`flex-1 sm:flex-none flex items-center justify-center px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'SERVICES' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}><Briefcase className="w-4 h-4 mr-2" /> Serviços</button>
                        <button onClick={() => setActiveTab('TRACKING')} className={`flex-1 sm:flex-none flex items-center justify-center px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'TRACKING' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}><Truck className="w-4 h-4 mr-2" /> Envios</button>
                    </div>
                    <button onClick={handleOpenActionModal} className="bg-brand-gray-900 text-white hover:bg-black px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 w-full sm:w-auto transform active:scale-95">
                        <Plus className="w-4 h-4" /> Nova
                    </button>
                </div>
            </header>

            {activeTab === 'SERVICES' && (
                <>
                    <div className="hidden md:flex bg-white rounded-2xl shadow-sm border border-brand-gray-100 min-h-[500px] overflow-hidden flex-col animate-fade-in relative">
                        <div className="p-5 border-b border-brand-gray-100 bg-white flex gap-4 items-center sticky top-0 z-30">
                            <div className="relative w-96">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar por cliente, ID ou tipo..." 
                                    className="w-full pl-10 pr-4 py-2.5 bg-brand-gray-50 border border-brand-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all shadow-sm" 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)} 
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-brand-gray-500 uppercase bg-brand-gray-50/80 border-b border-brand-gray-100 sticky top-0 z-20 backdrop-blur-sm">
                                    <tr>
                                        <th className="px-6 py-4 font-bold tracking-wider">ID / Data</th>
                                        <th className="px-6 py-4 font-bold tracking-wider">Nome Fantasia</th>
                                        <th className="px-6 py-4 font-bold tracking-wider">Ação Solicitada</th>
                                        <th className="px-6 py-4 font-bold tracking-wider w-48">Status / SLA</th>
                                        <th className="px-6 py-4 text-right font-bold tracking-wider"></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {filteredDemands.length === 0 ? (
                                        <tr><td colSpan={6} className="px-6 py-16 text-center text-brand-gray-400 font-medium">Nenhuma solicitação encontrada.</td></tr>
                                    ) : (
                                        filteredDemands.map(demand => (
                                            <tr 
                                                key={demand.id} 
                                                onClick={() => setSelectedItem(demand)}
                                                className={`
                                                    group relative transition-all duration-300 ease-out cursor-pointer
                                                    ${selectedItem?.id === demand.id 
                                                        ? 'bg-brand-primary/5 shadow-[inset_4px_0_0_0_#F3123C] z-0' 
                                                        : 'bg-white hover:shadow-lg hover:-translate-y-0.5 hover:z-10 border-b border-brand-gray-50 last:border-0'
                                                    }
                                                `}
                                            >
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-mono text-[10px] text-brand-gray-500 bg-brand-gray-100 px-1.5 py-0.5 rounded w-fit">
                                                            {demand.id}
                                                        </span>
                                                        <span className="text-[10px] text-brand-gray-400">
                                                            {new Date(demand.date).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className={`font-bold text-sm block transition-colors ${selectedItem?.id === demand.id ? 'text-brand-primary' : 'text-brand-gray-900 group-hover:text-brand-primary'}`}>
                                                        {demand.clientName}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-2 text-brand-gray-700">
                                                        <div className="p-1.5 rounded-lg bg-brand-gray-50 border border-brand-gray-100">
                                                            {getActionIcon(demand.type)}
                                                        </div>
                                                        <span className="font-medium text-xs">{demand.type}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col items-start w-full">
                                                        {getStatusBadge(demand.status)}
                                                        <SlaProgress date={demand.date} type={demand.type} status={demand.status} />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <ChevronRight className={`w-5 h-5 transition-all duration-300 ${selectedItem?.id === demand.id ? 'text-brand-primary translate-x-1' : 'text-brand-gray-300 group-hover:text-brand-primary group-hover:translate-x-1'}`} />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* MOBILE LIST VIEW */}
                    <div className="md:hidden space-y-4">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Buscar..." 
                                className="w-full pl-10 pr-4 py-3 bg-white border border-brand-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none shadow-sm" 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                            />
                        </div>
                        
                        {filteredDemands.map(demand => (
                            <div 
                                key={demand.id} 
                                onClick={() => setSelectedItem(demand)}
                                className="bg-white p-4 rounded-xl border border-brand-gray-100 shadow-sm active:scale-[0.98] transition-all"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-brand-gray-50 text-brand-primary">
                                            {getActionIcon(demand.type)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-brand-gray-900 text-sm">{demand.clientName}</h3>
                                            <span className="text-[10px] text-brand-gray-400 font-mono">{demand.id}</span>
                                        </div>
                                    </div>
                                    {getStatusBadge(demand.status)}
                                </div>
                                <div className="mb-3">
                                    <SlaProgress date={demand.date} type={demand.type} status={demand.status} />
                                </div>
                                <div className="flex justify-between items-center text-xs text-brand-gray-500 pt-3 border-t border-brand-gray-50">
                                    <span>{new Date(demand.date).toLocaleDateString()}</span>
                                    <span>{demand.type}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {activeTab === 'TRACKING' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                    {filteredTasks.length === 0 ? (
                        <div className="col-span-full p-16 text-center text-brand-gray-400 flex flex-col items-center bg-white rounded-2xl border border-brand-gray-100">
                            <Truck className="w-12 h-12 mb-3 opacity-20" />
                            <p>Nenhum envio rastreável encontrado.</p>
                        </div>
                    ) : (
                        filteredTasks.map(task => (
                            <div key={task.id} className="bg-white rounded-2xl p-5 border border-brand-gray-100 shadow-sm hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase ${task.status === 'SHIPPED' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                        {task.status === 'SHIPPED' ? 'Em Trânsito' : 'Entregue'}
                                    </span>
                                </div>
                                
                                <h3 className="font-bold text-brand-gray-900 mb-1">{task.clientName}</h3>
                                <p className="text-xs text-brand-gray-500 mb-4">{task.address}</p>
                                
                                <div className="bg-brand-gray-50 rounded-xl p-3 mb-4 border border-brand-gray-100">
                                    <span className="block text-[10px] font-bold text-brand-gray-400 uppercase mb-1">Código de Rastreio</span>
                                    <div className="flex justify-between items-center">
                                        <span className="font-mono font-bold text-brand-gray-900 tracking-wider text-sm">{task.trackingCode || 'AGUARDANDO'}</span>
                                        {task.trackingCode && <ExternalLink className="w-3 h-3 text-brand-primary cursor-pointer hover:underline" />}
                                    </div>
                                </div>

                                <div className="flex justify-between items-center text-xs text-brand-gray-400 pt-2 border-t border-brand-gray-50">
                                    <span>Transp: {task.carrier || 'Loggi'}</span>
                                    <span>{new Date(task.date).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* DETAIL MODAL WITH OTP HIGHLIGHT */}
            {selectedItem && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex justify-end animate-fade-in" onClick={() => setSelectedItem(null)}>
                    <div 
                        className="w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto animate-slide-in-right"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 bg-brand-gray-900 text-white sticky top-0 z-10">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-xl font-bold leading-tight">{selectedItem.clientName}</h2>
                                <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-white"><X size={24}/></button>
                            </div>
                            <div className="flex gap-2">
                                {getStatusBadge(selectedItem.status)}
                                <span className="bg-white/10 text-white px-2 py-1 rounded-md text-[10px] font-bold uppercase font-mono">{selectedItem.id}</span>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <h3 className="text-xs font-bold text-brand-gray-400 uppercase mb-2">Detalhes da Solicitação</h3>
                                <div className="bg-brand-gray-50 p-4 rounded-xl border border-brand-gray-100 text-sm text-brand-gray-700 leading-relaxed">
                                    {selectedItem.description}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 border border-brand-gray-100 rounded-xl">
                                    <span className="block text-[10px] text-brand-gray-400 uppercase font-bold mb-1">Tipo</span>
                                    <span className="text-sm font-bold text-brand-gray-800">{selectedItem.type}</span>
                                </div>
                                <div className="p-3 border border-brand-gray-100 rounded-xl">
                                    <span className="block text-[10px] text-brand-gray-400 uppercase font-bold mb-1">Data</span>
                                    <span className="text-sm font-bold text-brand-gray-800">{new Date(selectedItem.date).toLocaleDateString()}</span>
                                </div>
                            </div>

                            {/* OTP HIGHLIGHT - SHOW ONLY IF EXISTS */}
                            {selectedItem.otp && (
                                <div className="p-5 bg-purple-50 border-2 border-purple-200 rounded-2xl shadow-sm text-center relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-2 opacity-10">
                                        <Key size={60} />
                                    </div>
                                    <span className="block text-xs font-bold text-purple-700 uppercase mb-2">Código de Ativação (OTP)</span>
                                    <div className="bg-white px-4 py-3 rounded-xl border border-purple-100 shadow-inner">
                                        <span className="text-3xl font-mono font-bold text-purple-900 tracking-widest">{selectedItem.otp}</span>
                                    </div>
                                    <p className="text-[10px] text-purple-600 mt-2">
                                        Use este código na maquininha para ativar ou trocar o equipamento.
                                    </p>
                                </div>
                            )}

                            {selectedItem.result && (
                                <div>
                                    <h3 className="text-xs font-bold text-brand-gray-400 uppercase mb-2">Resultado / Resolução</h3>
                                    <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-sm text-green-800">
                                        {selectedItem.result}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 border-t border-brand-gray-100 text-center">
                            <button className="text-brand-primary text-xs font-bold hover:underline">Reportar Problema</button>
                        </div>
                    </div>
                </div>
            )}

            {/* NEW REQUEST MODAL */}
            {isActionModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-brand-gray-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
                            <h3 className="font-bold text-lg">Nova Solicitação</h3>
                            <button onClick={() => setIsActionModalOpen(false)} className="text-brand-gray-400 hover:text-white"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto">
                            {!selectedActionType ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {['Troca de POS', 'Desativação de POS', 'Alteração Bancária', 'Alteração Cadastral', 'Outros'].map((type) => (
                                        <button 
                                            key={type}
                                            onClick={() => setSelectedActionType(type as DemandActionType)}
                                            className="p-4 border border-brand-gray-200 rounded-xl hover:border-brand-primary hover:bg-brand-primary/5 transition-all text-left flex flex-col gap-2 group"
                                        >
                                            <div className="text-brand-gray-400 group-hover:text-brand-primary">{getActionIcon(type)}</div>
                                            <span className="text-xs font-bold text-brand-gray-700 group-hover:text-brand-gray-900">{type}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="flex items-center gap-2 text-sm text-brand-gray-500 mb-2">
                                        <button onClick={() => setSelectedActionType(null)} className="hover:text-brand-primary font-bold">Tipos</button>
                                        <ChevronRight size={14} />
                                        <span className="font-bold text-brand-gray-900">{selectedActionType}</span>
                                    </div>
                                    <div ref={searchWrapperRef} className="relative">
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Nome do Cliente *</label>
                                        <input 
                                            className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                                            value={newRequestData.clientName}
                                            onChange={handleClientNameChange}
                                            placeholder="Ex: Oficina do Zé"
                                        />
                                        {showSuggestions && suggestions.length > 0 && (
                                            <div className="absolute z-50 w-full bg-white border border-brand-gray-200 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto">
                                                {suggestions.map(client => (
                                                    <div 
                                                        key={client.id}
                                                        className="px-4 py-2 hover:bg-brand-gray-50 cursor-pointer border-b border-brand-gray-50 last:border-0 flex justify-between items-center"
                                                        onClick={() => selectClient(client)}
                                                    >
                                                        <div>
                                                            <p className="text-sm font-bold text-brand-gray-800">{client.nomeEc}</p>
                                                            <p className="text-xs text-brand-gray-500">{client.endereco}</p>
                                                        </div>
                                                        <span className="text-[10px] bg-brand-gray-100 text-brand-gray-600 px-1.5 py-0.5 rounded font-mono">
                                                            ID: {client.id}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Detalhamento *</label>
                                        <textarea 
                                            className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none h-24 resize-none"
                                            value={newRequestData.description}
                                            onChange={e => setNewRequestData({...newRequestData, description: e.target.value})}
                                            placeholder={`Descreva o motivo da ${selectedActionType}...`}
                                        />
                                    </div>
                                    <button 
                                        onClick={handleSubmitRequest}
                                        className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold hover:bg-brand-dark transition-colors shadow-lg"
                                    >
                                        Enviar Solicitação
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PedidosRastreioPage;
