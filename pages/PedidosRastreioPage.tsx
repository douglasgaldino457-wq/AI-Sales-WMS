
import React, { useState, useEffect, useRef } from 'react';
import { 
    Package, Truck, Search, MapPin, Clock, CheckCircle2, 
    ClipboardList, AlertTriangle, ExternalLink, Calendar,
    ListTodo, Briefcase, Plus, Terminal, RefreshCw, CreditCard, BadgePercent, UserCog, MoreHorizontal, X, FileText, Building2, Key, ShieldCheck, ChevronRight, Hourglass, Box, Zap, Download, MessageCircle, AlertCircle, Save, UploadCloud, Eye
} from 'lucide-react';
import { appStore } from '../services/store';
import { LogisticsTask, ManualDemand, DemandActionType, ClientBaseRow, UserRole, PosDevice, MaterialRequestData, RegistrationRequest, BankAccount } from '../types';
import { useAppStore } from '../services/useAppStore'; 
import { Page } from '../types';

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
    const [activeTab, setActiveTab] = useState<'SOLICITACOES' | 'MEUS_ATIVOS'>('SOLICITACOES'); 
    
    // Data State
    const [tasks, setTasks] = useState<LogisticsTask[]>([]);
    const [demands, setDemands] = useState<ManualDemand[]>([]);
    const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
    const [myAssets, setMyAssets] = useState<PosDevice[]>([]);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modals
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
    
    // New Request State
    const [selectedActionType, setSelectedActionType] = useState<DemandActionType | null>(null);
    const [newRequestData, setNewRequestData] = useState({ clientName: '', description: '', id: '', address: '' });
    
    // Specific Forms State
    const [selectedOldPos, setSelectedOldPos] = useState('');
    const [selectedNewPos, setSelectedNewPos] = useState('');
    const [selectedReason, setSelectedReason] = useState('');
    const [bankData, setBankData] = useState<BankAccount>({
        bankCode: '', agency: '', accountNumber: '', holderName: '', holderType: 'PJ', accountType: 'Corrente', isThirdParty: false, proofFile: null
    });
    
    // Dropdown Data
    const [myStockList, setMyStockList] = useState<PosDevice[]>([]);
    const [clientPosList, setClientPosList] = useState<PosDevice[]>([]);
    const [swapReasons, setSwapReasons] = useState<string[]>([]);
    const [withdrawalReasons, setWithdrawalReasons] = useState<string[]>([]);

    // Material Form
    const [materialForm, setMaterialForm] = useState<MaterialRequestData>({ posQuantity: 5, coils: false, chargers: false, gifts: false });
    
    // Issue Form
    const [issueForm, setIssueForm] = useState({ serial: '', type: 'Defeito', desc: '' });

    // Client Autocomplete
    const [allClients, setAllClients] = useState<ClientBaseRow[]>([]);
    const [suggestions, setSuggestions] = useState<ClientBaseRow[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchWrapperRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isField = userRole === UserRole.FIELD_SALES;
    const isInside = userRole === UserRole.INSIDE_SALES;

    useEffect(() => {
        refreshData();
        setAllClients(appStore.getClients());
        setSwapReasons(appStore.getSwapReasons());
        setWithdrawalReasons(appStore.getWithdrawalReasons());
        
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

    const refreshData = () => {
        const myName = currentUser?.name || 'User';
        
        setTasks(appStore.getLogisticsTasks().filter(t => t.requesterName === myName));
        setDemands(appStore.getDemands().filter(d => d.requester === myName).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setRegistrations(appStore.getRegistrationRequests().filter(r => r.requesterName === myName).sort((a,b) => new Date(b.dateSubmitted).getTime() - new Date(a.dateSubmitted).getTime()));
        
        const assets = appStore.getPosInventory().filter(p => p.currentHolder === myName && p.status === 'WithField');
        setMyAssets(assets);
        setMyStockList(assets); // Available for install
    };

    // --- RENDER HELPERS ---

    const getStatusStep = (status: string, adminStatus?: string, otp?: string) => {
        if (status === 'Aprovado Pricing') return { label: 'Aprovado (Pricing)', color: 'text-purple-600', step: 2 };
        if (status === 'APPROVED') return { label: 'Aprovado Admin', color: 'text-blue-600', step: 2 };
        if (adminStatus === 'Aguardando Logística') return { label: 'Em Logística (GSurf)', color: 'text-orange-500', step: 2 }; // NEW STEP
        if (adminStatus === 'Pendente ADM') return { label: 'Aguardando Backoffice', color: 'text-blue-600', step: 3 }; // Adjusted step
        if (otp) return { label: 'Pronto (OTP Gerado)', color: 'text-green-600', step: 4 };
        if (status === 'Concluído' || status === 'Finalizado ADM') return { label: 'Finalizado', color: 'text-green-700', step: 4 };
        if (status === 'Rejeitado') return { label: 'Devolvido/Rejeitado', color: 'text-red-600', step: 0 };
        return { label: 'Pendente Análise', color: 'text-gray-500', step: 1 };
    };

    const PipelineStatus = ({ step }: { step: number }) => (
        <div className="flex items-center gap-1 mt-2">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className={`h-1.5 w-6 rounded-full ${step >= i ? (step === 4 ? 'bg-green-500' : 'bg-brand-primary') : 'bg-gray-200'}`}></div>
            ))}
        </div>
    );

    // --- ACTIONS HANDLERS ---

    const handleOpenActionModal = () => {
        setIsActionModalOpen(true);
        setSelectedActionType(null);
        setNewRequestData({ clientName: '', description: '', id: '', address: '' });
        setMaterialForm({ posQuantity: 5, coils: false, chargers: false, gifts: false }); 
        setSelectedOldPos('');
        setSelectedNewPos('');
        setSelectedReason('');
        setBankData({ bankCode: '', agency: '', accountNumber: '', holderName: '', holderType: 'PJ', accountType: 'Corrente', isThirdParty: false, proofFile: null });
    };

    const handleCreateDemand = () => {
        // Special Handler for Material Request
        if (selectedActionType === 'Solicitação de Material') {
            handleRequestMaterial();
            return;
        }

        if (!selectedActionType || !newRequestData.clientName) {
            alert("Preencha o cliente.");
            return;
        }

        let details = newRequestData.description;
        
        // --- ROUTING LOGIC: LOGISTICS FIRST VS BACKOFFICE DIRECT ---
        let initialStatus: any = 'Pendente';
        let initialAdminStatus: any = 'Pendente ADM'; // Default to Backoffice
        let createLogisticsTask = false;
        let logisticsType: any = null;

        if (selectedActionType === 'Troca de POS') {
            if (!selectedOldPos || !selectedNewPos || !selectedReason) {
                alert("Preencha: POS a Retirar, POS a Instalar e Motivo.");
                return;
            }
            details = `TROCA: Retirar POS ${selectedOldPos}. Instalar POS ${selectedNewPos}. Motivo: ${selectedReason}. ${details}`;
            
            // Route to Logistics First
            initialStatus = 'Em Análise';
            initialAdminStatus = 'Aguardando Logística';
            createLogisticsTask = true;
            logisticsType = 'POS_EXCHANGE';

        } else if (selectedActionType === 'Desativação de POS') {
            if (!selectedOldPos || !selectedReason) {
                alert("Preencha: POS a Retirar e Motivo.");
                return;
            }
            details = `DESATIVAÇÃO: Retirar POS ${selectedOldPos}. Motivo: ${selectedReason}. ${details}`;
            
            // Route to Logistics First
            initialStatus = 'Em Análise';
            initialAdminStatus = 'Aguardando Logística';
            createLogisticsTask = true;
            logisticsType = 'POS_RETRIEVAL';

        } else if (selectedActionType === 'Alteração Bancária') {
            if (!bankData.bankCode || !bankData.accountNumber || !bankData.proofFile) {
                alert("Dados bancários e comprovante são obrigatórios.");
                return;
            }
            details = `ALTERAÇÃO BANCÁRIA: Banco ${bankData.bankCode}, Ag ${bankData.agency}, CC ${bankData.accountNumber}, Titular ${bankData.holderName}.`;
            // Route Direct to Backoffice (Default)
        }

        const demandId = `REQ-${Math.floor(Math.random() * 10000)}`;
        const demand: ManualDemand = {
            id: demandId,
            type: selectedActionType,
            clientName: newRequestData.clientName,
            date: new Date().toISOString(),
            status: initialStatus,
            requester: currentUser?.name || 'User',
            description: details,
            adminStatus: initialAdminStatus
        };

        appStore.addDemand(demand);

        // CREATE LOGISTICS TASK IF NEEDED
        if (createLogisticsTask) {
            const task: LogisticsTask = {
                id: `LOG-${Math.floor(Math.random() * 10000)}`,
                type: logisticsType,
                status: 'PENDING_SHIPMENT',
                clientName: newRequestData.clientName,
                internalId: demandId, // Link to Demand
                requesterName: currentUser?.name || 'User',
                requesterRole: userRole || 'Consultor',
                date: new Date().toISOString(),
                details: details,
                address: newRequestData.address || 'Endereço do Cliente', // Fallback
                posData: selectedOldPos ? { serialNumber: selectedOldPos, rcNumber: '', model: '' } : undefined
            };
            appStore.addLogisticsTask(task);
        }

        refreshData();
        setIsActionModalOpen(false);
        alert("Solicitação criada! Acompanhe o status no painel.");
    };

    const handleRequestMaterial = () => {
        appStore.requestMaterials(currentUser?.name || 'User', materialForm);
        refreshData();
        setIsActionModalOpen(false);
        alert("Pedido de material enviado para Logística!");
    };

    const handleReportIssue = () => {
        if (!issueForm.serial || !issueForm.desc) return;
        appStore.reportPosIssue(issueForm.serial, issueForm.type, issueForm.desc, currentUser?.name || 'User');
        refreshData();
        setIsIssueModalOpen(false);
        alert("Problema reportado! A Logística receberá o alerta.");
    };

    const handleClientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setNewRequestData({ ...newRequestData, clientName: val });
        if (val.length > 1) {
            const matches = allClients.filter(c => c.nomeEc.toLowerCase().includes(val.toLowerCase())).slice(0, 5);
            setSuggestions(matches);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    const selectClient = (client: ClientBaseRow) => {
        setNewRequestData({ 
            ...newRequestData, 
            clientName: client.nomeEc, 
            id: client.id, 
            address: client.endereco 
        });
        setBankData({...bankData, holderName: client.nomeEc}); // Default holder
        setShowSuggestions(false);
        
        // Mock loading Client POS Inventory (In a real app, fetch from Store linked to Client ID)
        // For demo, we just simulate random POSs attached to client or find in global inventory if marked active
        const clientPos = appStore.getPosInventory().filter(p => p.status === 'Active'); 
        // Fallback mock if none found
        if (clientPos.length === 0) {
             setClientPosList([
                 { serialNumber: 'SN-MOCK-1', rcNumber: 'RC-001', model: 'P2 Smart', status: 'Active', currentHolder: client.nomeEc, lastUpdated: new Date().toISOString() }
             ]);
        } else {
            setClientPosList(clientPos.slice(0,2)); // Pick some active ones
        }
    };

    const handleBankFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setBankData({...bankData, proofFile: e.target.files[0]});
        }
    };

    // --- RENDER CONTENT ---

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            <header className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <ListTodo className="w-8 h-8 text-brand-primary" />
                        Central de Solicitações
                    </h1>
                    <p className="text-brand-gray-600 mt-1">Acompanhamento de demandas e gestão de ativos.</p>
                </div>
                
                <div className="flex bg-brand-gray-200 p-1 rounded-xl">
                    <button onClick={() => setActiveTab('SOLICITACOES')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'SOLICITACOES' ? 'bg-white text-brand-primary shadow-sm' : 'text-gray-600'}`}>Solicitações</button>
                    {isField && <button onClick={() => setActiveTab('MEUS_ATIVOS')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'MEUS_ATIVOS' ? 'bg-white text-brand-primary shadow-sm' : 'text-gray-600'}`}>Meus Ativos</button>}
                </div>
            </header>

            {/* TAB: SOLICITAÇÕES (MAIN HUB) */}
            {activeTab === 'SOLICITACOES' && (
                <div className="space-y-6">
                    {/* Action Bar */}
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-brand-gray-200 shadow-sm">
                        <div className="relative w-full md:w-96">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" placeholder="Buscar solicitação..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-brand-gray-300 rounded-lg text-sm outline-none focus:border-brand-primary"
                            />
                        </div>
                        <button onClick={handleOpenActionModal} className="bg-brand-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-black transition-colors shadow-lg">
                            <Plus className="w-4 h-4" /> Nova Solicitação
                        </button>
                    </div>

                    {/* Unified List */}
                    <div className="grid grid-cols-1 gap-4">
                        {/* 1. Registrations (Cadastros) */}
                        {registrations.map(reg => {
                            const stepInfo = getStatusStep(reg.status);
                            return (
                                <div key={reg.id} className="bg-white p-5 rounded-xl border border-brand-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><UserCog className="w-6 h-6"/></div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-brand-gray-900">{reg.clientName}</span>
                                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Cadastro</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-brand-gray-500">
                                            <span>ID: {reg.id}</span>
                                            <span>{new Date(reg.dateSubmitted).toLocaleDateString()}</span>
                                        </div>
                                        <PipelineStatus step={stepInfo.step} />
                                        <p className={`text-xs font-bold mt-1 ${stepInfo.color}`}>{stepInfo.label}</p>
                                    </div>
                                </div>
                            );
                        })}

                        {/* 2. Logistics Tasks (Including Material Requests) */}
                        {tasks.map(task => {
                            // Filter out tasks that are linked to demands we already show below to avoid duplication?
                            // For simplicity, we show 'Material Requests' and standalone tasks here.
                            // Linked tasks (Exchanges) are visualized within the Demand card logic below.
                            if (task.internalId && task.internalId.startsWith('REQ-')) return null; 

                            const isMaterial = task.type === 'MATERIAL_REQUEST';
                            const stepInfo = getStatusStep(task.status === 'PENDING_SHIPMENT' ? 'Pendente' : 'Concluído', undefined, task.otp);
                            
                            return (
                                <div key={task.id} className="bg-white p-5 rounded-xl border border-brand-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center">
                                    <div className={`p-3 rounded-lg ${isMaterial ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-600'}`}>
                                        {isMaterial ? <Package className="w-6 h-6"/> : <Truck className="w-6 h-6"/>}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-brand-gray-900">{isMaterial ? 'Solicitação de Material' : task.clientName}</span>
                                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Logística</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-brand-gray-500">
                                            <span>ID: {task.id}</span>
                                            <span>{new Date(task.date).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-xs text-brand-gray-600 mt-1 line-clamp-1">{task.details}</p>
                                        <div className="mt-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${task.status === 'PENDING_SHIPMENT' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                                {task.status === 'PENDING_SHIPMENT' ? 'Aguardando Envio' : 'Enviado / Concluído'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* 3. Demands (Pricing, Trocas, etc) */}
                        {demands.map(dem => {
                            const isPricing = dem.type.includes('Taxa') || dem.type.includes('Negociação');
                            const isApproved = dem.status === 'Aprovado Pricing';
                            const stepInfo = getStatusStep(dem.status, dem.adminStatus, dem.otp);
                            
                            return (
                                <div key={dem.id} className="bg-white p-5 rounded-xl border border-brand-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center relative overflow-hidden">
                                    {dem.otp && <div className="absolute right-0 top-0 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">OTP DISPONÍVEL</div>}
                                    
                                    <div className={`p-3 rounded-lg ${isPricing ? 'bg-purple-50 text-purple-600' : 'bg-orange-50 text-orange-600'}`}>
                                        {isPricing ? <BadgePercent className="w-6 h-6"/> : <RefreshCw className="w-6 h-6"/>}
                                    </div>
                                    
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-brand-gray-900">{dem.clientName}</span>
                                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{dem.type}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-brand-gray-500">
                                            <span>ID: {dem.id}</span>
                                            <span>{new Date(dem.date).toLocaleDateString()}</span>
                                        </div>
                                        
                                        {!isPricing && (
                                            <>
                                                <PipelineStatus step={stepInfo.step} />
                                                <div className="flex justify-between items-center mt-1">
                                                    <p className={`text-xs font-bold ${stepInfo.color}`}>{stepInfo.label}</p>
                                                    {dem.otp && (
                                                        <span className="font-mono font-bold text-lg text-brand-gray-900 bg-gray-100 px-2 rounded border border-gray-300 select-all">
                                                            OTP: {dem.otp}
                                                        </span>
                                                    )}
                                                </div>
                                            </>
                                        )}

                                        {/* Pricing Actions */}
                                        {isPricing && isApproved && (
                                            <div className="mt-3 flex gap-2">
                                                <button className="text-[10px] font-bold bg-green-100 text-green-700 px-3 py-1.5 rounded flex items-center gap-1 hover:bg-green-200 transition-colors">
                                                    <Download size={12}/> Baixar Proposta
                                                </button>
                                                <button className="text-[10px] font-bold bg-[#25D366] text-white px-3 py-1.5 rounded flex items-center gap-1 hover:bg-[#128C7E] transition-colors">
                                                    <MessageCircle size={12}/> Enviar WhatsApp
                                                </button>
                                                <button 
                                                    className="text-[10px] font-bold bg-brand-primary text-white px-3 py-1.5 rounded flex items-center gap-1 hover:bg-brand-dark transition-colors ml-auto"
                                                    title="Enviar para Backoffice efetivar"
                                                    onClick={() => alert("Solicitação de alteração cadastral enviada ao Backoffice!")}
                                                >
                                                    <ShieldCheck size={12}/> Efetivar Alteração (Backoffice)
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAB: MEUS ATIVOS (POS) */}
            {activeTab === 'MEUS_ATIVOS' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                    {myAssets.length === 0 ? (
                        <div className="col-span-full p-16 text-center text-gray-400 bg-white rounded-xl border border-gray-200">
                            <Box className="w-12 h-12 mb-3 opacity-20 mx-auto"/>
                            <p>Você não possui equipamentos vinculados.</p>
                        </div>
                    ) : (
                        myAssets.map(asset => (
                            <div key={asset.serialNumber} className="bg-white p-5 rounded-xl border border-brand-gray-200 shadow-sm relative group">
                                <div className="absolute top-4 right-4">
                                    <div className={`w-3 h-3 rounded-full ${asset.status === 'Defective' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                </div>
                                <div className="mb-4">
                                    <h4 className="font-bold text-brand-gray-900">{asset.model}</h4>
                                    <p className="font-mono text-xs text-brand-gray-500">S/N: {asset.serialNumber}</p>
                                    <p className="font-mono text-xs text-brand-gray-500">RC: {asset.rcNumber}</p>
                                </div>
                                <button 
                                    onClick={() => { setIssueForm({...issueForm, serial: asset.serialNumber}); setIsIssueModalOpen(true); }}
                                    className="w-full bg-red-50 text-red-600 hover:bg-red-100 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-red-100"
                                >
                                    <AlertTriangle size={14}/> Reportar Problema
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* MODAL: NOVA SOLICITAÇÃO (Dynamic Types) */}
            {isActionModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-brand-gray-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
                            <h3 className="font-bold text-lg">Nova Solicitação</h3>
                            <button onClick={() => setIsActionModalOpen(false)} className="text-brand-gray-400 hover:text-white"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto">
                            {!selectedActionType ? (
                                <div className="grid grid-cols-1 gap-2">
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Selecione o Tipo:</p>
                                    {[
                                        'Troca de POS', 'Desativação de POS', 'Alteração Bancária', 
                                        'Alteração Cadastral', 
                                        // Include Material Request for Field Sales
                                        ...(isField ? ['Solicitação de Material'] : []),
                                        // Inside Sales Specifics
                                        ...(isInside ? ['Envio de POS (Novo Cliente)', 'Retirada de POS (Logística)'] : [])
                                    ].map((type) => (
                                        <button 
                                            key={type}
                                            onClick={() => setSelectedActionType(type as DemandActionType)}
                                            className="p-3 border border-brand-gray-200 rounded-lg hover:border-brand-primary hover:bg-brand-primary/5 transition-all text-left text-sm font-bold text-brand-gray-700 flex justify-between items-center group"
                                        >
                                            <div className="flex items-center gap-2">
                                                {type === 'Solicitação de Material' ? <Package className="w-4 h-4 text-green-600" /> : null}
                                                {type}
                                            </div>
                                            <ChevronRight size={16} className="text-gray-300 group-hover:text-brand-primary" />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="flex items-center gap-2 text-sm text-brand-gray-500 mb-2 cursor-pointer" onClick={() => setSelectedActionType(null)}>
                                        <ChevronRight className="rotate-180" size={14} /> Voltar
                                    </div>
                                    
                                    {selectedActionType === 'Solicitação de Material' ? (
                                        // --- MATERIAL FORM ---
                                        <div className="space-y-4">
                                            <div className="p-3 bg-green-50 border border-green-100 rounded-lg mb-2 text-xs text-green-800">
                                                Solicitação de kit de ativação para estoque do consultor.
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Quantidade de Máquinas (Min 5)</label>
                                                <input 
                                                    type="number" min={5} value={materialForm.posQuantity} 
                                                    onChange={e => setMaterialForm({...materialForm, posQuantity: parseInt(e.target.value)})}
                                                    className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-green-500"
                                                />
                                            </div>
                                            <div className="space-y-3 bg-brand-gray-50 p-4 rounded-lg border border-brand-gray-200">
                                                <p className="text-xs font-bold text-gray-500 uppercase">Itens Adicionais</p>
                                                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                                    <input type="checkbox" className="rounded text-green-600 focus:ring-green-500" checked={materialForm.coils} onChange={e => setMaterialForm({...materialForm, coils: e.target.checked})} /> 
                                                    Caixa de Bobinas
                                                </label>
                                                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                                    <input type="checkbox" className="rounded text-green-600 focus:ring-green-500" checked={materialForm.chargers} onChange={e => setMaterialForm({...materialForm, chargers: e.target.checked})} /> 
                                                    Carregadores Extras
                                                </label>
                                                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                                    <input type="checkbox" className="rounded text-green-600 focus:ring-green-500" checked={materialForm.gifts} onChange={e => setMaterialForm({...materialForm, gifts: e.target.checked})} /> 
                                                    Kit Brindes (Adesivos, Canetas)
                                                </label>
                                            </div>
                                            <button onClick={handleCreateDemand} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg mt-2">
                                                Enviar Pedido de Material
                                            </button>
                                        </div>
                                    ) : (
                                        // --- GENERIC DEMAND FORM WITH SPECIFIC FIELDS ---
                                        <>
                                            <div ref={searchWrapperRef} className="relative">
                                                <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Nome do Cliente *</label>
                                                <input 
                                                    className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                                                    value={newRequestData.clientName}
                                                    onChange={handleClientNameChange}
                                                    placeholder="Buscar Cliente..."
                                                />
                                                {showSuggestions && suggestions.length > 0 && (
                                                    <div className="absolute z-50 w-full bg-white border border-brand-gray-200 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto">
                                                        {suggestions.map(client => (
                                                            <div 
                                                                key={client.id}
                                                                className="px-4 py-2 hover:bg-brand-gray-50 cursor-pointer border-b border-brand-gray-50 last:border-0 flex justify-between items-center"
                                                                onClick={() => selectClient(client)}
                                                            >
                                                                <div><p className="text-sm font-bold text-brand-gray-800">{client.nomeEc}</p></div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* --- TROCA DE POS FIELDS --- */}
                                            {selectedActionType === 'Troca de POS' && (
                                                <div className="space-y-3 bg-brand-gray-50 p-4 rounded-xl border border-brand-gray-100">
                                                    <div>
                                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">POS a Retirar *</label>
                                                        <select className="w-full border rounded p-2 text-sm" value={selectedOldPos} onChange={e => setSelectedOldPos(e.target.value)}>
                                                            <option value="">Selecione...</option>
                                                            {clientPosList.map(pos => (
                                                                <option key={pos.serialNumber} value={pos.serialNumber}>{pos.model} - {pos.serialNumber}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-blue-600 uppercase mb-1">POS do seu Estoque *</label>
                                                        <select className="w-full border border-blue-200 rounded p-2 text-sm bg-blue-50" value={selectedNewPos} onChange={e => setSelectedNewPos(e.target.value)}>
                                                            <option value="">Selecione para Vincular...</option>
                                                            {myStockList.map(pos => (
                                                                <option key={pos.serialNumber} value={pos.serialNumber}>{pos.model} - {pos.serialNumber}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Motivo da Troca *</label>
                                                        <select className="w-full border rounded p-2 text-sm" value={selectedReason} onChange={e => setSelectedReason(e.target.value)}>
                                                            <option value="">Selecione...</option>
                                                            {swapReasons.map(r => <option key={r} value={r}>{r}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            )}

                                            {/* --- DESATIVAÇÃO FIELDS --- */}
                                            {selectedActionType === 'Desativação de POS' && (
                                                <div className="space-y-3 bg-red-50 p-4 rounded-xl border border-red-100">
                                                    <div>
                                                        <label className="block text-xs font-bold text-red-700 uppercase mb-1">POS a Retirar *</label>
                                                        <select className="w-full border rounded p-2 text-sm" value={selectedOldPos} onChange={e => setSelectedOldPos(e.target.value)}>
                                                            <option value="">Selecione...</option>
                                                            {clientPosList.map(pos => (
                                                                <option key={pos.serialNumber} value={pos.serialNumber}>{pos.model} - {pos.serialNumber}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-red-700 uppercase mb-1">Motivo da Devolução *</label>
                                                        <select className="w-full border rounded p-2 text-sm" value={selectedReason} onChange={e => setSelectedReason(e.target.value)}>
                                                            <option value="">Selecione...</option>
                                                            {withdrawalReasons.map(r => <option key={r} value={r}>{r}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            )}

                                            {/* --- ALTERAÇÃO BANCÁRIA FIELDS --- */}
                                            {selectedActionType === 'Alteração Bancária' && (
                                                <div className="bg-brand-gray-50 p-4 rounded-xl border border-dashed border-brand-gray-300 space-y-3">
                                                    <h4 className="text-xs font-bold text-brand-gray-500 uppercase mb-2">Novos Dados Bancários</h4>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="col-span-2">
                                                            <select className="w-full border rounded p-2 text-sm" value={bankData.bankCode} onChange={e => setBankData({...bankData, bankCode: e.target.value})}>
                                                                <option value="">Banco...</option>
                                                                {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                                                            </select>
                                                        </div>
                                                        <input className="w-full border rounded p-2 text-sm" placeholder="Agência" value={bankData.agency} onChange={e => setBankData({...bankData, agency: e.target.value})} />
                                                        <input className="w-full border rounded p-2 text-sm" placeholder="Conta" value={bankData.accountNumber} onChange={e => setBankData({...bankData, accountNumber: e.target.value})} />
                                                        <input className="w-full border rounded p-2 text-sm col-span-2" placeholder="Titular" value={bankData.holderName} onChange={e => setBankData({...bankData, holderName: e.target.value})} />
                                                        <select className="w-full border rounded p-2 text-sm" value={bankData.accountType} onChange={e => setBankData({...bankData, accountType: e.target.value as any})}>
                                                            <option value="Corrente">Corrente</option>
                                                            <option value="Poupança">Poupança</option>
                                                        </select>
                                                    </div>
                                                    <label className="cursor-pointer bg-white border border-brand-gray-300 text-brand-gray-600 px-3 py-1.5 rounded text-xs font-bold hover:bg-brand-gray-100 flex items-center justify-center gap-2">
                                                        <UploadCloud size={14} /> Anexar Comprovante
                                                        <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleBankFileChange} />
                                                    </label>
                                                    {bankData.proofFile && <span className="text-xs text-green-600 flex items-center gap-1 justify-center"><CheckCircle2 size={12}/> {bankData.proofFile.name}</span>}
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Descrição / Observações</label>
                                                <textarea 
                                                    className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none h-24 resize-none"
                                                    value={newRequestData.description}
                                                    onChange={e => setNewRequestData({...newRequestData, description: e.target.value})}
                                                    placeholder="Detalhes adicionais..."
                                                />
                                            </div>
                                            <button onClick={handleCreateDemand} className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold hover:bg-brand-dark transition-colors shadow-lg">
                                                Criar Solicitação
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: REPORT ISSUE */}
            {isIssueModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-red-600 px-6 py-4 text-white"><h3 className="font-bold">Reportar Problema POS</h3></div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm font-bold text-gray-700">Serial: {issueForm.serial}</p>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Problema</label>
                                <select className="w-full border rounded p-2" value={issueForm.type} onChange={e => setIssueForm({...issueForm, type: e.target.value})}>
                                    <option value="Defeito">Defeito Técnico</option>
                                    <option value="Sem Carregador">Falta Carregador</option>
                                    <option value="Conectividade">Chip/Sinal</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>
                            <textarea 
                                className="w-full border rounded p-2 h-20 text-sm" 
                                placeholder="Detalhes..." 
                                value={issueForm.desc} 
                                onChange={e => setIssueForm({...issueForm, desc: e.target.value})}
                            />
                            <button onClick={handleReportIssue} className="w-full bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700">Reportar para Logística</button>
                            <button onClick={() => setIsIssueModalOpen(false)} className="w-full text-gray-500 py-2 text-sm hover:underline">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PedidosRastreioPage;
