
import React, { useState, useEffect } from 'react';
import { 
    Key, Search, Terminal, MapPin, CheckCircle2, Loader2, Copy, Scan, ClipboardList, X,
    RefreshCw, User, Phone, Mail, FileText, Hash, Building2, AlertTriangle, ArrowRight, Truck, Package, Briefcase
} from 'lucide-react';
import { appStore } from '../services/store';
import { LogisticsTask, PosDevice } from '../types';

const LogisticaAtivacoesPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'ACTIVATIONS' | 'MAINTENANCE'>('ACTIVATIONS');
    const [tasks, setTasks] = useState<LogisticsTask[]>([]);
    const [inventory, setInventory] = useState<PosDevice[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTask, setSelectedTask] = useState<LogisticsTask | null>(null);
    
    // GSurf Modal Inputs
    const [assignSerial, setAssignSerial] = useState('');
    const [assignRc, setAssignRc] = useState('');
    const [assignOtp, setAssignOtp] = useState('');
    
    // Helper state for dropdown selection
    const [selectedStockId, setSelectedStockId] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = () => {
        const allTasks = appStore.getLogisticsTasks();
        setTasks(allTasks);
        setInventory(appStore.getPosInventory());
    };

    // Filter Logic
    const filteredTasks = tasks.filter(t => {
        const matchesSearch = t.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.internalId && t.internalId.includes(searchTerm)) ||
            (t.documentNumber && t.documentNumber.includes(searchTerm));
        
        if (!matchesSearch) return false;

        if (activeTab === 'ACTIVATIONS') {
            // New Clients (From Admin Approval)
            return (t.type === 'FIELD_ACTIVATION' || t.type === 'POS_SHIPMENT') && !t.status.includes('COMPLETED');
        } else {
            // Maintenance (Exchanges/Deactivations)
            return (t.type === 'POS_EXCHANGE' || t.type === 'POS_RETRIEVAL') && !t.status.includes('COMPLETED');
        }
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const handleGsurfComplete = () => {
        if (!selectedTask) return;
        
        // Validation for Activation/Exchange
        if (selectedTask.type !== 'POS_RETRIEVAL' && (!assignSerial || !assignRc || !assignOtp)) {
            alert("Preencha Serial, RC e o OTP gerado no Gsurf.");
            return;
        }

        setIsSubmitting(true);
        setTimeout(() => {
            // Call Store Action to complete task and notify Sales
            appStore.completeGsurfActivation(
                selectedTask.id, 
                assignOtp, 
                { serial: assignSerial, rc: assignRc }
            );
            
            setIsSubmitting(false);
            setSelectedTask(null);
            setAssignSerial('');
            setAssignRc('');
            setAssignOtp('');
            setSelectedStockId('');
            refreshData();
            
            alert(selectedTask.type === 'POS_EXCHANGE' 
                ? "Troca atualizada no GSurf! OTP enviado para o consultor. Backoffice notificado." 
                : "Ativação concluída! OTP enviado para o consultor.");
        }, 1000);
    };

    const handleStockSelect = (val: string) => {
        setSelectedStockId(val);
        const device = inventory.find(i => i.serialNumber === val);
        if (device) {
            setAssignSerial(device.serialNumber);
            setAssignRc(device.rcNumber);
        } else {
            setAssignSerial('');
            setAssignRc('');
        }
    };

    const copyToClipboard = (text: string | undefined) => {
        if (text) navigator.clipboard.writeText(text);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <Key className="w-8 h-8 text-brand-primary" />
                        Logística GSurf
                    </h1>
                    <p className="text-brand-gray-600 mt-1">Esteira de ativação e manutenção de parque.</p>
                </div>
                <div className="flex bg-brand-gray-200 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('ACTIVATIONS')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'ACTIVATIONS' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                    >
                        <Terminal size={16} /> Novas Ativações
                    </button>
                    <button 
                        onClick={() => setActiveTab('MAINTENANCE')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'MAINTENANCE' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                    >
                        <RefreshCw size={16} /> Trocas & Manutenção
                    </button>
                </div>
            </header>

            <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden min-h-[500px]">
                {/* Toolbar */}
                <div className="p-4 border-b border-brand-gray-100 bg-brand-gray-50 flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-10">
                    <div className="relative w-full md:w-96">
                        <input 
                            type="text" 
                            placeholder="Buscar por EC, CNPJ, ID..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 text-sm border border-brand-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all shadow-sm"
                        />
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                </div>
                
                {/* List */}
                <div className="divide-y divide-brand-gray-100">
                    {filteredTasks.length === 0 ? (
                        <div className="p-16 text-center text-gray-400 flex flex-col items-center">
                            <Package className="w-12 h-12 mb-3 opacity-20" />
                            <p>Nenhuma tarefa pendente nesta fila.</p>
                        </div>
                    ) : (
                        filteredTasks.map(task => {
                            const isExchange = task.type === 'POS_EXCHANGE';
                            const isRetrieval = task.type === 'POS_RETRIEVAL';
                            
                            return (
                                <div key={task.id} className={`p-6 hover:bg-brand-gray-50 transition-colors border-l-4 ${isExchange ? 'border-l-orange-500' : isRetrieval ? 'border-l-red-500' : 'border-l-green-500'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                            {isExchange ? (
                                                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 border border-orange-200">
                                                    <RefreshCw className="w-3 h-3" /> Troca
                                                </span>
                                            ) : isRetrieval ? (
                                                <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 border border-red-200">
                                                    <X className="w-3 h-3" /> Desativação
                                                </span>
                                            ) : (
                                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 border border-green-200">
                                                    <CheckCircle2 className="w-3 h-3" /> Nova Ativação
                                                </span>
                                            )}
                                            {task.internalId && (
                                                <span className="font-mono text-[10px] bg-brand-gray-900 text-white px-2 py-1 rounded">
                                                    EC: {task.internalId}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <button 
                                            onClick={() => setSelectedTask(task)}
                                            className="bg-brand-primary text-white hover:bg-brand-dark px-4 py-2 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-2"
                                        >
                                            <Terminal className="w-4 h-4" />
                                            Acessar GSurf
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                                        <div>
                                            <p className="text-[10px] font-bold text-brand-gray-500 uppercase mb-1">Cliente</p>
                                            <p className="font-bold text-brand-gray-900">{task.clientName}</p>
                                            <p className="font-mono text-xs text-brand-gray-600">{task.documentNumber || 'CNPJ não informado'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-brand-gray-500 uppercase mb-1">Endereço</p>
                                            <p className="text-brand-gray-800 text-xs">{task.address}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-brand-gray-500 uppercase mb-1">Solicitante</p>
                                            <p className="text-brand-gray-800 flex items-center gap-1"><User size={12}/> {task.requesterName}</p>
                                            <p className="text-xs text-brand-gray-500">{new Date(task.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    
                                    {(isExchange || isRetrieval) && (
                                        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-100 rounded text-xs text-yellow-800">
                                            <strong>Detalhe:</strong> {task.details}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* GSURF ACTION MODAL */}
            {selectedTask && (
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-brand-gray-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Terminal className="w-5 h-5"/> Ação no Portal GSurf
                            </h3>
                            <button onClick={() => setSelectedTask(null)} className="text-gray-400 hover:text-white"><X size={20}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            <div className="flex flex-col md:flex-row gap-6">
                                
                                {/* LEFT: SOURCE DATA (READ ONLY FROM SALES/ADMIN) */}
                                <div className="flex-[3] space-y-4">
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-sm">
                                        <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-4 border-b border-blue-200 pb-2">
                                            <ClipboardList className="w-4 h-4" /> Dados Cadastrais (Copiar para GSurf)
                                        </h4>
                                        <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                                            <div className="group">
                                                <label className="text-[10px] text-blue-600 font-bold uppercase mb-1 block">CNPJ</label>
                                                <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded border border-blue-100">
                                                    <span className="font-mono font-bold text-gray-800 text-sm select-all">{selectedTask.documentNumber || 'N/A'}</span>
                                                    <button onClick={() => copyToClipboard(selectedTask.documentNumber)} className="text-blue-400 hover:text-blue-600 ml-auto"><Copy size={14}/></button>
                                                </div>
                                            </div>
                                            <div className="group">
                                                <label className="text-[10px] text-blue-600 font-bold uppercase mb-1 block">ID Interno (EC)</label>
                                                <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded border border-blue-100">
                                                    <span className="font-mono font-bold text-gray-800 text-sm select-all">{selectedTask.internalId || 'Pendente'}</span>
                                                    <button onClick={() => copyToClipboard(selectedTask.internalId)} className="text-blue-400 hover:text-blue-600 ml-auto"><Copy size={14}/></button>
                                                </div>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[10px] text-blue-600 font-bold uppercase mb-1 block">Razão Social</label>
                                                <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded border border-blue-100">
                                                    <span className="text-gray-800 text-sm select-all truncate">{selectedTask.legalName || selectedTask.clientName}</span>
                                                    <button onClick={() => copyToClipboard(selectedTask.legalName || selectedTask.clientName)} className="text-blue-400 hover:text-blue-600 ml-auto"><Copy size={14}/></button>
                                                </div>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[10px] text-blue-600 font-bold uppercase mb-1 block">Endereço Completo</label>
                                                <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded border border-blue-100">
                                                    <span className="text-gray-800 text-xs select-all">{selectedTask.address}</span>
                                                    <button onClick={() => copyToClipboard(selectedTask.address)} className="text-blue-400 hover:text-blue-600 ml-auto"><Copy size={14}/></button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-blue-600 font-bold uppercase mb-1 block">Nome Contato</label>
                                                <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded border border-blue-100">
                                                    <span className="text-gray-800 text-sm select-all">{selectedTask.responsibleName}</span>
                                                    <button onClick={() => copyToClipboard(selectedTask.responsibleName)} className="text-blue-400 hover:text-blue-600 ml-auto"><Copy size={14}/></button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-blue-600 font-bold uppercase mb-1 block">Whatsapp / Telefone</label>
                                                <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded border border-blue-100">
                                                    <span className="text-gray-800 text-sm select-all">{selectedTask.contactPhone}</span>
                                                    <button onClick={() => copyToClipboard(selectedTask.contactPhone)} className="text-blue-400 hover:text-blue-600 ml-auto"><Copy size={14}/></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* POS PRE-ALLOCATED IF EXISTS */}
                                    {selectedTask.posData?.serialNumber && (
                                        <div className="bg-gray-100 p-4 rounded-lg border border-gray-200">
                                            <span className="text-xs font-bold text-gray-500 uppercase block mb-2">POS Vinculada (Sugerida)</span>
                                            <div className="flex gap-4 font-mono text-sm text-gray-800">
                                                <span>SN: {selectedTask.posData.serialNumber}</span>
                                                <span>RC: {selectedTask.posData.rcNumber}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT: INPUTS FOR COMPLETION (LOGISTICS) */}
                                <div className="flex-[2] bg-white p-6 rounded-xl shadow-md border border-gray-200 flex flex-col">
                                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-6 uppercase border-b pb-2">
                                        <Hash className="w-4 h-4 text-brand-primary" /> 
                                        Registro de Saída
                                    </h4>
                                    
                                    {selectedTask.type === 'POS_RETRIEVAL' ? (
                                        <div className="space-y-4">
                                            <p className="text-sm text-gray-600">Confirme a desvinculação da máquina no GSurf e o retorno ao estoque.</p>
                                            <button 
                                                onClick={handleGsurfComplete}
                                                disabled={isSubmitting}
                                                className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4" />}
                                                Confirmar Desativação
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-5">
                                            {/* STOCK SELECTOR FOR AUTOFILL */}
                                            <div>
                                                <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Selecionar do Estoque Disponível</label>
                                                <select
                                                    className="w-full border border-blue-200 bg-blue-50 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none font-medium"
                                                    value={selectedStockId}
                                                    onChange={e => handleStockSelect(e.target.value)}
                                                >
                                                    <option value="">-- Selecionar POS --</option>
                                                    {inventory.filter(i => i.status === 'InStock' || i.status === 'WithField').map(i => (
                                                        <option key={i.serialNumber} value={i.serialNumber}>
                                                            {i.model} - {i.serialNumber} ({i.status === 'InStock' ? 'Estoque' : 'Campo'})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Serial Number (S/N)</label>
                                                <input 
                                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none font-mono uppercase"
                                                    placeholder="Digite o S/N..."
                                                    value={assignSerial}
                                                    onChange={e => setAssignSerial(e.target.value.toUpperCase())}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">RC (Patrimônio)</label>
                                                <input 
                                                    className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none font-mono uppercase"
                                                    placeholder="Digite o RC..."
                                                    value={assignRc}
                                                    onChange={e => setAssignRc(e.target.value.toUpperCase())}
                                                />
                                            </div>
                                            
                                            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 mt-4">
                                                <label className="block text-xs font-bold text-purple-700 uppercase mb-2 text-center">Código de Ativação (OTP)</label>
                                                <input 
                                                    className="w-full border-2 border-purple-200 rounded-lg px-4 py-3 text-2xl text-center font-bold tracking-widest text-purple-900 focus:ring-2 focus:ring-purple-500 outline-none uppercase bg-white"
                                                    placeholder="000-000"
                                                    maxLength={10}
                                                    value={assignOtp}
                                                    onChange={e => setAssignOtp(e.target.value.toUpperCase())}
                                                />
                                                <p className="text-[10px] text-purple-600/70 text-center mt-2">
                                                    Este código será enviado automaticamente para o consultor.
                                                </p>
                                            </div>

                                            <button 
                                                onClick={handleGsurfComplete}
                                                disabled={isSubmitting || !assignSerial || !assignRc || !assignOtp}
                                                className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold hover:bg-brand-dark transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                                            >
                                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4" />}
                                                Salvar & Enviar OTP
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LogisticaAtivacoesPage;
