
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Package, Truck, Search, MapPin, Clock, CheckCircle2, 
    ClipboardList, AlertTriangle, ExternalLink, Calendar,
    ListTodo, Briefcase, Plus, Terminal, RefreshCw, CreditCard, BadgePercent, UserCog, MoreHorizontal, X, FileText, Building2, Key, ShieldCheck, ChevronRight, Hourglass, Box, Zap, Download, MessageCircle, AlertCircle, Save, UploadCloud, Eye, Smartphone,
    Send, Info, Paperclip, FileCheck, FileInput, Network, Sparkles, Loader2, CalendarRange
} from 'lucide-react';
import { appStore } from '../services/store';
import { LogisticsTask, ManualDemand, DemandActionType, ClientBaseRow, UserRole, PosDevice, MaterialRequestData, RegistrationRequest, BankAccount } from '../types';
import { useAppStore } from '../services/useAppStore'; 
import { analyzeDocument } from '../services/geminiService';

interface PedidosRastreioPageProps {
    targetDemandId?: string;
}

const BANKS = [
    '001 - Banco do Brasil',
    '237 - Bradesco',
    '341 - Itaú Unibanco',
    '033 - Santander',
    '104 - Caixa Econômica',
    '260 - Nu Pagamentos (Nubank)',
    '077 - Banco Inter',
    '290 - PagSeguro',
    '336 - C6 Bank'
];

const PedidosRastreioPage: React.FC<PedidosRastreioPageProps> = ({ targetDemandId }) => {
    const { userRole, currentUser, navigate } = useAppStore();
    const [activeTab, setActiveTab] = useState<'HISTORICO' | 'MEUS_ATIVOS'>('HISTORICO'); 
    
    const [tasks, setTasks] = useState<LogisticsTask[]>([]);
    const [demands, setDemands] = useState<ManualDemand[]>([]);
    const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
    const [myAssets, setMyAssets] = useState<PosDevice[]>([]);
    
    const [searchTerm, setSearchTerm] = useState('');
    
    // --- FILTROS DE DATA ---
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(firstDayOfMonth);
    const [endDate, setEndDate] = useState(today);

    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
    
    const [selectedActionType, setSelectedActionType] = useState<DemandActionType | null>(null);
    const [newRequestData, setNewRequestData] = useState({ clientName: '', description: '', clientId: '', address: '' });
    
    const [selectedOldPos, setSelectedOldPos] = useState('');
    const [selectedReason, setSelectedReason] = useState('');
    
    const [materialForm, setMaterialForm] = useState<MaterialRequestData>({ posQuantity: 5, coils: false, chargers: false, gifts: false });
    const [issueForm, setIssueForm] = useState({ serial: '', type: 'Defeito', desc: '' });

    // --- ESTADOS DE ALTERAÇÃO BANCÁRIA ---
    const [bankForm, setBankForm] = useState<BankAccount>({
        bankCode: '', agency: '', accountNumber: '', holderName: '', holderType: 'PJ', accountType: 'Corrente', isThirdParty: false, proofFile: null
    });
    const [thirdPartyDocs, setThirdPartyDocs] = useState<{ termFile: File | null, idFile: File | null }>({ termFile: null, idFile: null });
    const [isAnalyzingBank, setIsAnalyzingBank] = useState(false);
    const bankProofRef = useRef<HTMLInputElement>(null);
    const thirdTermRef = useRef<HTMLInputElement>(null);
    const thirdIdRef = useRef<HTMLInputElement>(null);

    const [allClients, setAllClients] = useState<ClientBaseRow[]>([]);
    const [suggestions, setSuggestions] = useState<ClientBaseRow[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [clientActivePos, setClientActivePos] = useState<PosDevice[]>([]);
    
    const searchWrapperRef = useRef<HTMLDivElement>(null);
    const isInsideSales = userRole === UserRole.INSIDE_SALES;

    const selectClient = (client: ClientBaseRow) => {
        setNewRequestData({
            clientName: client.nomeEc,
            clientId: client.id,
            address: client.endereco,
            description: ''
        });
        setShowSuggestions(false);
        
        const posInEC = appStore.getPosInventory().filter(p => 
            p.currentHolder === client.nomeEc || p.currentHolder === client.id || p.status === 'Active' && client.id === p.currentHolder
        );
        setClientActivePos(posInEC);
        if (posInEC.length > 0) {
            setSelectedOldPos(posInEC[0].serialNumber);
        } else {
            setSelectedOldPos('');
        }
    };

    const handleOpenActionModal = (forceType?: DemandActionType) => {
        setIsActionModalOpen(true);
        setSelectedActionType(forceType || null);
        setNewRequestData({ clientName: '', description: '', clientId: '', address: '' });
        setClientActivePos([]);
        setSelectedOldPos('');
        setSelectedReason('');
        setBankForm({
            bankCode: '', agency: '', accountNumber: '', holderName: '', holderType: 'PJ', accountType: 'Corrente', isThirdParty: false, proofFile: null
        });
        setThirdPartyDocs({ termFile: null, idFile: null });
    };

    useEffect(() => {
        refreshData();
        const clients = appStore.getClients();
        setAllClients(clients);
        
        if (targetDemandId) {
            const targetClient = clients.find(c => c.id === targetDemandId);
            if (targetClient) {
                handleOpenActionModal();
                selectClient(targetClient);
            } else {
                setSearchTerm(targetDemandId);
            }
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [targetDemandId]);

    const refreshData = () => {
        const myName = currentUser?.name || 'User';
        setTasks(appStore.getLogisticsTasks().filter(t => t.requesterName === myName));
        setDemands(appStore.getDemands().filter(d => d.requester === myName));
        setRegistrations(appStore.getRegistrationRequests().filter(r => r.requesterName === myName));
        const assets = appStore.getPosInventory().filter(p => p.currentHolder === myName);
        setMyAssets(assets);
    };

    const filteredHistory = useMemo(() => {
        const combined = [...tasks, ...demands, ...registrations].map(item => ({
            ...item,
            displayDate: (item as any).date || (item as any).dateSubmitted
        }));

        return combined.filter(item => {
            const matchesSearch = item.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                (item as any).id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (item as any).type?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const itemDate = item.displayDate?.split('T')[0];
            const matchesDate = (!startDate || itemDate >= startDate) && (!endDate || itemDate <= endDate);

            return matchesSearch && matchesDate;
        }).sort((a, b) => new Date(b.displayDate).getTime() - new Date(a.displayDate).getTime());
    }, [tasks, demands, registrations, searchTerm, startDate, endDate]);

    const getStatusInfo = (item: any) => {
        const status = (item.status || '').toUpperCase();
        const adminStatus = (item.adminStatus || '').toUpperCase();

        if (status === 'CONCLUÍDO' || status === 'COMPLETED' || adminStatus === 'FINALIZADO ADM') {
            return { label: 'Concluído', color: 'text-green-600', bg: 'bg-green-100', step: 4 };
        }

        if (status === 'PENDING_SHIPMENT' || status === 'SHIPPED' || status === 'READY_FOR_GSURF' || adminStatus === 'AGUARDANDO LOGÍSTICA') {
            return { label: 'Em Logística', color: 'text-orange-600', bg: 'bg-orange-100', step: 3 };
        }

        if (status === 'APROVADO PRICING' || status === 'APPROVED' || adminStatus === 'EM PROCESSAMENTO') {
            return { label: 'Aprovado', color: 'text-blue-600', bg: 'bg-blue-100', step: 2 };
        }

        return { label: 'Pendente', color: 'text-gray-500', bg: 'bg-gray-100', step: 1 };
    };

    const handleClientSearch = (val: string) => {
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

    const handleBankProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setBankForm(prev => ({ ...prev, proofFile: file }));
            setIsAnalyzingBank(true);
            
            try {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = async () => {
                    const base64 = (reader.result as string).split(',')[1];
                    const result = await analyzeDocument(base64, 'BANK_PROOF');
                    
                    if (result) {
                        setBankForm(prev => ({
                            ...prev,
                            bankCode: result.bank || prev.bankCode,
                            agency: result.agency || prev.agency,
                            accountNumber: result.accountNumber || prev.accountNumber,
                            holderName: result.holderName || prev.holderName
                        }));
                    }
                    setIsAnalyzingBank(false);
                };
            } catch (err) {
                console.error("Erro na leitura bancária", err);
                setIsAnalyzingBank(false);
            }
        }
    };

    const handleCreateDemand = () => {
        if (!newRequestData.clientName) {
            alert("Selecione um cliente.");
            return;
        }

        if (selectedActionType === 'Alteração Bancária') {
            if (!bankForm.bankCode || !bankForm.accountNumber || !bankForm.proofFile) {
                alert("Dados bancários incompletos ou comprovante ausente.");
                return;
            }
            if (bankForm.isThirdParty && (!thirdPartyDocs.termFile || !thirdPartyDocs.idFile)) {
                alert("Para conta de terceiros, o termo assinado e o documento do titular são obrigatórios.");
                return;
            }
        }

        if ((selectedActionType === 'Troca de POS' || selectedActionType === 'Desativação de POS') && !selectedOldPos) {
            alert("Este cliente não possui POS vinculada para realizar esta ação.");
            return;
        }

        if (selectedActionType === 'Solicitação de Material') {
            appStore.requestMaterials(currentUser?.name || 'Consultor', materialForm);
        } else if (selectedActionType === 'Troca de POS' || selectedActionType === 'Desativação de POS') {
             const isSwap = selectedActionType === 'Troca de POS';
             const task: LogisticsTask = {
                id: `LOG-${Date.now()}`,
                type: isSwap ? 'POS_EXCHANGE' : 'POS_RETRIEVAL',
                status: 'PENDING_SHIPMENT',
                clientName: newRequestData.clientName,
                address: newRequestData.address,
                requesterName: currentUser?.name || 'Consultor',
                requesterRole: userRole || 'Inside Sales',
                date: new Date().toISOString(),
                details: `${selectedActionType}: ${selectedReason}. POS Origem: ${selectedOldPos}. Obs: ${newRequestData.description}`,
                posData: { serialNumber: selectedOldPos, rcNumber: '', model: '' }
             };
             appStore.addLogisticsTask(task);
        } else {
            let desc = newRequestData.description;
            if (selectedActionType === 'Alteração Bancária') {
                desc = `Alteração Bancária: Banco ${bankForm.bankCode}, Ag ${bankForm.agency}, CC ${bankForm.accountNumber}. Titular: ${bankForm.holderName}. Terceiro: ${bankForm.isThirdParty ? 'SIM' : 'NÃO'}. \nObs: ${desc}`;
            }

            const demand: ManualDemand = {
                id: `DEM-${Date.now()}`,
                clientName: newRequestData.clientName,
                type: selectedActionType || 'Geral',
                date: new Date().toISOString(),
                status: 'Pendente',
                requester: currentUser?.name || 'Consultor',
                description: desc
            };
            appStore.addDemand(demand);
        }
        setIsActionModalOpen(false);
        refreshData();
        alert("Solicitação enviada com sucesso!");
    };

    const handleReportIssue = () => {
        if (!issueForm.serial) return;
        appStore.reportPosIssue(issueForm.serial, issueForm.type, issueForm.desc, currentUser?.name || 'Consultor');
        setIsIssueModalOpen(false);
        refreshData();
        alert("Problema reportado para triagem.");
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-20">
            <header className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <ListTodo className="w-8 h-8 text-brand-primary" />
                        Central de Solicitações
                    </h1>
                    <p className="text-brand-gray-600 mt-1">Acompanhamento e gestão de demandas comerciais.</p>
                </div>
                
                <div className="flex flex-col md:flex-row items-end md:items-center gap-3">
                    <button 
                        onClick={() => handleOpenActionModal()}
                        className="bg-brand-primary text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-brand-dark transition-all flex items-center justify-center gap-2 transform active:scale-95"
                    >
                        <Plus size={18} /> Nova Solicitação
                    </button>

                    <div className="flex bg-brand-gray-200 p-1 rounded-xl shadow-inner">
                        <button onClick={() => setActiveTab('HISTORICO')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'HISTORICO' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600'}`}>Histórico</button>
                        {!isInsideSales && (
                            <button onClick={() => setActiveTab('MEUS_ATIVOS')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'MEUS_ATIVOS' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600'}`}>Meus Ativos</button>
                        )}
                    </div>
                </div>
            </header>

            {activeTab === 'HISTORICO' ? (
                <div className="space-y-4 animate-fade-in">
                    {/* BARRA DE FILTROS LIMPA */}
                    <div className="bg-white p-4 rounded-2xl border border-brand-gray-100 shadow-sm flex flex-col lg:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full">
                            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Pesquisar no histórico..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-2.5 bg-brand-gray-50/50 border border-brand-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all"
                            />
                        </div>
                        
                        <div className="flex items-center gap-3 bg-brand-gray-50 p-1.5 rounded-xl border border-brand-gray-200 w-full lg:w-auto">
                            <div className="flex items-center gap-2 px-3">
                                <CalendarRange size={16} className="text-brand-gray-400" />
                                <div className="flex items-center gap-1.5">
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none text-xs font-bold text-brand-gray-700 outline-none cursor-pointer" />
                                    <span className="text-gray-300">até</span>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none text-xs font-bold text-brand-gray-700 outline-none cursor-pointer" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {filteredHistory.length === 0 ? (
                            <div className="p-24 text-center text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
                                <Hourglass className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p className="font-medium text-sm">Nenhum registro encontrado no período selecionado.</p>
                                <button onClick={() => { setStartDate(''); setEndDate(today); setSearchTerm(''); }} className="mt-4 text-brand-primary text-xs font-bold hover:underline uppercase tracking-widest">Limpar Filtros</button>
                            </div>
                        ) : (
                            filteredHistory.map((item: any) => {
                                const status = getStatusInfo(item);
                                const itemType = item.type || 'Credenciamento';
                                return (
                                    <div key={item.id} className="bg-white p-5 rounded-2xl border border-brand-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-4 items-center justify-between group">
                                        <div className="flex items-center gap-5 flex-1">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${status.bg} ${status.color}`}>
                                                {itemType.includes('POS') ? <Truck size={28} /> : itemType.includes('Material') ? <Box size={28}/> : itemType.includes('Bancária') ? <CreditCard size={28}/> : <FileText size={28}/>}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-brand-gray-900 text-base">{item.clientName || 'Solicitação Geral'}</h3>
                                                    <span className="text-[10px] font-mono bg-brand-gray-50 px-1.5 py-0.5 rounded text-brand-gray-400">#{item.id}</span>
                                                </div>
                                                <p className="text-xs text-brand-gray-500 font-medium">{itemType}</p>
                                                
                                                <div className="flex items-center gap-1.5 mt-3">
                                                    {[1,2,3,4].map(s => (
                                                        <div key={s} className={`h-1.5 w-8 rounded-full transition-all duration-500 ${status.step >= s ? status.bg.replace('100', '500') : 'bg-brand-gray-100'}`}></div>
                                                    ))}
                                                    <span className={`ml-2 text-[10px] font-bold uppercase tracking-wider ${status.color}`}>{status.label}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase border ${status.bg} ${status.color} border-current/20`}>
                                                {status.label}
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter flex items-center gap-1">
                                                <Calendar size={10}/> {new Date(item.displayDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {myAssets.length === 0 ? (
                            <div className="md:col-span-3 p-12 text-center text-gray-400 bg-white rounded-3xl border border-brand-gray-100">
                                <Smartphone className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>Nenhum equipamento vinculado.</p>
                            </div>
                        ) : (
                            myAssets.map(pos => (
                                <div key={pos.serialNumber} className="bg-white p-6 rounded-3xl border border-brand-gray-100 shadow-sm relative overflow-hidden group hover:border-brand-primary/20 transition-all">
                                    <div className={`absolute top-0 left-0 w-full h-1.5 ${pos.status === 'Active' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">{pos.model}</p>
                                            <h3 className="text-xl font-bold text-brand-gray-900 font-mono tracking-tight">{pos.serialNumber}</h3>
                                        </div>
                                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase border ${pos.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                            {pos.status === 'Active' ? 'Instalado' : 'Estoque'}
                                        </span>
                                    </div>
                                    <div className="space-y-2 mb-6 bg-brand-gray-50 p-3 rounded-2xl border border-brand-gray-100">
                                        <div className="flex items-center justify-between text-[11px] text-brand-gray-600">
                                            <span className="font-bold text-brand-gray-400 uppercase">Patrimônio RC</span>
                                            <span className="font-mono font-bold">{pos.rcNumber}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-brand-gray-600">
                                            <span className="font-bold text-brand-gray-400 uppercase">Vínculo</span>
                                            <span className="font-bold">{new Date(pos.lastUpdated).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => { setIssueForm({...issueForm, serial: pos.serialNumber}); setIsIssueModalOpen(true); }}
                                        className="w-full bg-white text-brand-gray-600 py-3 rounded-xl text-xs font-bold hover:bg-red-50 hover:text-red-600 transition-all border border-brand-gray-200 flex items-center justify-center gap-2"
                                    >
                                        <AlertTriangle size={14} /> Reportar Defeito
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {isActionModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden">
                        <div className="bg-brand-gray-900 px-6 py-5 flex justify-between items-center text-white">
                            <h3 className="font-bold text-lg">Nova Solicitação</h3>
                            <button onClick={() => setIsActionModalOpen(false)} className="text-brand-gray-400 hover:text-white p-2 hover:bg-white/5 rounded-full"><X size={20}/></button>
                        </div>
                        <div className="p-6">
                            {!selectedActionType ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {[
                                        { label: 'Troca de POS', icon: RefreshCw, type: 'Troca de POS', color: 'text-orange-600' },
                                        { label: 'Desativação de POS', icon: X, type: 'Desativação de POS', color: 'text-red-600' },
                                        { label: 'Alteração Bancária', icon: CreditCard, type: 'Alteração Bancária', color: 'text-blue-600' },
                                        { label: 'Gestão de Rede', icon: Network, type: 'Gestão de Rede', color: 'text-gray-400', disabled: true },
                                        { label: 'Solicitação de Material', icon: Box, type: 'Solicitação de Material', color: 'text-purple-600' }
                                    ].filter(btn => !(isInsideSales && btn.type === 'Solicitação de Material')).map(btn => (
                                        <button 
                                            key={btn.label} 
                                            disabled={btn.disabled}
                                            onClick={() => setSelectedActionType(btn.type as any)}
                                            className={`flex items-center gap-4 p-4 border rounded-2xl transition-all text-left group ${btn.disabled ? 'bg-brand-gray-50 border-gray-200 opacity-50 grayscale cursor-not-allowed' : 'bg-brand-gray-50 border-brand-gray-200 hover:bg-white hover:border-brand-primary hover:shadow-md'}`}
                                        >
                                            <div className={`p-3 bg-white rounded-xl border border-gray-100 group-hover:scale-110 transition-transform ${btn.color}`}><btn.icon size={22} /></div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-brand-gray-900 text-sm">{btn.label}</span>
                                                {btn.disabled && <span className="text-[9px] font-bold text-brand-gray-400 uppercase">Em desenvolvimento</span>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-5 animate-fade-in">
                                    <button onClick={() => setSelectedActionType(null)} className="text-xs font-bold text-brand-primary flex items-center gap-1 hover:underline mb-2"><ChevronRight size={14} className="rotate-180"/> Voltar para Opções</button>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            {/* PESQUISA DE CLIENTE */}
                                            <div className="relative" ref={searchWrapperRef}>
                                                <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1 tracking-widest">Estabelecimento / EC Selecionado *</label>
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                    <input 
                                                        className="w-full border border-gray-300 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all" 
                                                        placeholder="Nome ou ID do cliente..." 
                                                        value={newRequestData.clientName} 
                                                        onChange={e => handleClientSearch(e.target.value)}
                                                    />
                                                </div>
                                                {showSuggestions && suggestions.length > 0 && (
                                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-[110] max-h-48 overflow-y-auto">
                                                        {suggestions.map(c => (
                                                            <button key={c.id} onClick={() => selectClient(c)} className="w-full text-left p-3 hover:bg-brand-gray-50 border-b last:border-0">
                                                                <p className="text-xs font-bold text-brand-gray-900">{c.nomeEc}</p>
                                                                <p className="text-[10px] text-brand-gray-500">ID: {c.id} • {c.endereco}</p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* ALTERAÇÃO BANCÁRIA */}
                                            {selectedActionType === 'Alteração Bancária' ? (
                                                <div className="space-y-4 animate-fade-in">
                                                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                                        <h4 className="text-[10px] font-black text-blue-600 uppercase mb-3 flex items-center gap-1"><Sparkles size={12}/> Digitalização de Comprovante</h4>
                                                        <div 
                                                            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-white ${bankForm.proofFile ? 'border-green-300 bg-green-50' : 'border-blue-200 bg-blue-50/50'}`}
                                                            onClick={() => bankProofRef.current?.click()}
                                                        >
                                                            {isAnalyzingBank ? (
                                                                <div className="flex flex-col items-center"><Loader2 size={24} className="animate-spin text-brand-primary mb-2"/><p className="text-[10px] font-bold text-brand-primary animate-pulse uppercase">IA Lendo Comprovante...</p></div>
                                                            ) : bankForm.proofFile ? (
                                                                <div className="flex flex-col items-center"><CheckCircle2 size={24} className="text-green-500 mb-1"/><p className="text-[10px] font-bold text-green-700">{bankForm.proofFile.name}</p></div>
                                                            ) : (
                                                                <><UploadCloud size={24} className="text-blue-400 mb-2"/><p className="text-[10px] font-bold text-blue-600 text-center uppercase leading-tight">Anexar Print da Conta / Comprovante</p></>
                                                            )}
                                                            <input type="file" className="hidden" ref={bankProofRef} onChange={handleBankProofUpload} accept="image/*,application/pdf" />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="col-span-2">
                                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Banco</label>
                                                            <select className="w-full border rounded-xl p-2.5 text-xs bg-white" value={bankForm.bankCode} onChange={e => setBankForm({...bankForm, bankCode: e.target.value})}>
                                                                <option value="">Selecione...</option>
                                                                {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                                                            </select>
                                                        </div>
                                                        <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Agência</label><input className="w-full border rounded-xl p-2.5 text-sm" value={bankForm.agency} onChange={e => setBankForm({...bankForm, agency: e.target.value})} /></div>
                                                        <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Conta</label><input className="w-full border rounded-xl p-2.5 text-sm" value={bankForm.accountNumber} onChange={e => setBankForm({...bankForm, accountNumber: e.target.value})} /></div>
                                                        <div className="col-span-2"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nome do Titular</label><input className="w-full border rounded-xl p-2.5 text-sm font-bold" value={bankForm.holderName} onChange={e => setBankForm({...bankForm, holderName: e.target.value})} /></div>
                                                    </div>
                                                </div>
                                            ) : (selectedActionType === 'Troca de POS' || selectedActionType === 'Desativação de POS') && (
                                                <>
                                                    <div>
                                                        <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1 tracking-widest">Escolher POS Atual (Retirar) *</label>
                                                        {clientActivePos.length > 0 ? (
                                                            <select className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-mono" value={selectedOldPos} onChange={e => setSelectedOldPos(e.target.value)}>
                                                                <option value="">Selecione a POS...</option>
                                                                {clientActivePos.map(p => (
                                                                    <option key={p.serialNumber} value={p.serialNumber}>{p.serialNumber} ({p.model})</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-2 text-[10px] font-bold">
                                                                <AlertCircle size={14}/> EC sem máquinas ativas identificadas
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1 tracking-widest">Motivo *</label>
                                                        <select className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-white font-bold" value={selectedReason} onChange={e => setSelectedReason(e.target.value)}>
                                                            <option value="">Selecione...</option>
                                                            {selectedActionType === 'Troca de POS' ? (
                                                                appStore.getSwapReasons().map(r => <option key={r} value={r}>{r}</option>)
                                                            ) : (
                                                                appStore.getWithdrawalReasons().map(r => <option key={r} value={r}>{r}</option>)
                                                            )}
                                                        </select>
                                                    </div>
                                                </>
                                            )}

                                            <div>
                                                <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1 tracking-widest">Observações Adicionais</label>
                                                <textarea className="w-full border border-gray-300 rounded-xl p-2.5 text-xs h-20 resize-none outline-none focus:ring-2 focus:ring-brand-primary/20" placeholder="Informações extras para a logística..." value={newRequestData.description} onChange={e => setNewRequestData({...newRequestData, description: e.target.value})} />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {/* TERCEIROS - CONTA BANCÁRIA */}
                                            {selectedActionType === 'Alteração Bancária' && (
                                                <div className="bg-purple-50 p-5 rounded-2xl border border-purple-200">
                                                    <label className="flex items-center gap-3 cursor-pointer mb-4">
                                                        <input type="checkbox" className="w-5 h-5 rounded text-purple-600 border-purple-300" checked={bankForm.isThirdParty} onChange={e => setBankForm({...bankForm, isThirdParty: e.target.checked})} />
                                                        <span className="text-xs font-bold text-purple-900">Esta conta pertence a um Terceiro?</span>
                                                    </label>

                                                    {bankForm.isThirdParty && (
                                                        <div className="space-y-3 animate-fade-in">
                                                            <div 
                                                                className={`p-3 rounded-xl border border-dashed text-[10px] font-bold flex items-center justify-between transition-colors cursor-pointer ${thirdPartyDocs.termFile ? 'bg-white border-green-300 text-green-700' : 'bg-white border-purple-300 text-purple-700 hover:bg-purple-100'}`}
                                                                onClick={() => thirdTermRef.current?.click()}
                                                            >
                                                                <span className="flex items-center gap-2">{thirdPartyDocs.termFile ? <CheckCircle2 size={12}/> : <Paperclip size={12}/>} Termo de Terceiro Assinado</span>
                                                                <input type="file" className="hidden" ref={thirdTermRef} onChange={e => setThirdPartyDocs({...thirdPartyDocs, termFile: e.target.files?.[0] || null})} />
                                                            </div>
                                                            <div 
                                                                className={`p-3 rounded-xl border border-dashed text-[10px] font-bold flex items-center justify-between transition-colors cursor-pointer ${thirdPartyDocs.idFile ? 'bg-white border-green-300 text-green-700' : 'bg-white border-purple-300 text-purple-700 hover:bg-purple-100'}`}
                                                                onClick={() => thirdIdRef.current?.click()}
                                                            >
                                                                <span className="flex items-center gap-2">{thirdPartyDocs.idFile ? <CheckCircle2 size={12}/> : <FileCheck size={12}/>} Doc (RG/CNH) do Titular</span>
                                                                <input type="file" className="hidden" ref={thirdIdRef} onChange={e => setThirdPartyDocs({...thirdPartyDocs, idFile: e.target.files?.[0] || null})} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* PLACEHOLDERS LOGÍSTICA */}
                                            {(selectedActionType === 'Troca de POS' || selectedActionType === 'Desativação de POS') && (
                                                <div className="bg-brand-gray-50 p-5 rounded-2xl border border-brand-gray-200 h-fit">
                                                    <h4 className="text-[10px] font-black text-brand-gray-400 uppercase mb-4 tracking-tighter flex items-center gap-1">
                                                        <Truck size={12}/> Fluxo de Atendimento (Logística)
                                                    </h4>
                                                    
                                                    <div className="space-y-4">
                                                        {selectedActionType === 'Troca de POS' && (
                                                            <div className="opacity-50">
                                                                <label className="block text-[9px] font-bold text-brand-gray-400 uppercase mb-1">Nova POS Enviada</label>
                                                                <div className="bg-white border border-dashed border-gray-300 p-2 rounded-lg text-[10px] text-gray-400 flex items-center justify-between">
                                                                    Aguardando Logística... <Info size={10}/>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="opacity-50">
                                                            <label className="block text-[9px] font-bold text-brand-gray-400 uppercase mb-1">Via de Envio (Correios/Loggi/etc)</label>
                                                            <div className="bg-white border border-dashed border-gray-300 p-2 rounded-lg text-[10px] text-gray-400">
                                                                ---
                                                            </div>
                                                        </div>

                                                        <div className="opacity-50">
                                                            <label className="block text-[9px] font-bold text-brand-gray-400 uppercase mb-1">
                                                                {selectedActionType === 'Troca de POS' ? 'Código de Rastreio' : 'Cód. Logística Reversa'}
                                                            </label>
                                                            <div className="bg-white border border-dashed border-gray-300 p-2 rounded-lg text-[10px] text-gray-400 font-mono">
                                                                A PREENCHER PELA TI/LOG
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button onClick={handleCreateDemand} className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-brand-dark transition-all flex items-center justify-center gap-2 active:scale-95">
                                        <Send size={18} /> Confirmar Solicitação
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isIssueModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-sm overflow-hidden">
                        <div className="bg-red-600 px-6 py-4 flex justify-between items-center text-white">
                            <h3 className="font-bold">Reportar Problema</h3>
                            <button onClick={() => setIsIssueModalOpen(false)} className="text-red-200 hover:text-white"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">S/N do Equipamento</label>
                                <input className="w-full border border-brand-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 font-mono" readOnly value={issueForm.serial} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tipo de Problema</label>
                                <select className="w-full border border-brand-gray-300 rounded-lg p-2.5 text-sm bg-white" value={issueForm.type} onChange={e => setIssueForm({...issueForm, type: e.target.value})}>
                                    <option value="Defeito">Defeito de Hardware</option>
                                    <option value="Conectividade">Problema de Sinal / Wifi</option>
                                    <option value="Bateria">Bateria Viciada</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Descrição detalhada</label>
                                <textarea className="w-full border border-brand-gray-300 rounded-lg p-2.5 text-sm h-24 resize-none" placeholder="Explique o que ocorre..." value={issueForm.desc} onChange={e => setIssueForm({...issueForm, desc: e.target.value})} />
                            </div>
                            <button onClick={handleReportIssue} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-red-700 transition-colors">
                                Enviar para Triagem
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PedidosRastreioPage;
