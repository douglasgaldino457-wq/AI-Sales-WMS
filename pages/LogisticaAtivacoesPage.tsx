
import React, { useState, useEffect } from 'react';
import { 
    Key, Search, Terminal, MapPin, CheckCircle2, Loader2, Copy, Scan, ClipboardList, X,
    RefreshCw, User, Phone, Mail, FileText, Hash, Building2, AlertTriangle, ArrowRight, Truck, Package, Briefcase, LayoutList, Link
} from 'lucide-react';
import { appStore } from '../services/store';
import { LogisticsTask, PosDevice } from '../types';

const LogisticaAtivacoesPage: React.FC = () => {
    const [filterType, setFilterType] = useState<'ALL' | 'ACTIVATION' | 'MAINTENANCE'>('ALL');
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

    // NEW: Auto-fill logic when a task is selected
    useEffect(() => {
        if (selectedTask?.posData?.serialNumber) {
            // If task has linked POS, pre-fill inputs
            setAssignSerial(selectedTask.posData.serialNumber);
            setAssignRc(selectedTask.posData.rcNumber || '');
            
            // Check if it matches an item in current inventory to set dropdown
            const inStockItem = inventory.find(i => i.serialNumber === selectedTask.posData?.serialNumber);
            if (inStockItem) {
                setSelectedStockId(inStockItem.serialNumber);
            } else {
                setSelectedStockId(''); // Linked but maybe not in main stock list (e.g. distinct status)
            }
        } else {
            // Reset if no linked POS
            setAssignSerial('');
            setAssignRc('');
            setSelectedStockId('');
        }
    }, [selectedTask, inventory]);

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

        const isCompleted = t.status.includes('COMPLETED');
        if (isCompleted) return false; // Show only pending tasks in this queue

        const isActivation = t.type === 'FIELD_ACTIVATION' || t.type === 'POS_SHIPMENT';
        const isMaintenance = t.type === 'POS_EXCHANGE' || t.type === 'POS_RETRIEVAL';

        if (filterType === 'ACTIVATION') return isActivation;
        if (filterType === 'MAINTENANCE') return isMaintenance;

        return true; // ALL
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const handleGsurfComplete = () => {
        if (!selectedTask) return;
        
        // Validation for Activation/Exchange
        if (selectedTask.type !== 'POS_RETRIEVAL' && (!assignSerial || !assignRc || !assignOtp)) {
            alert("Obrigatório preencher Serial, RC e o Código OTP gerado no Gsurf.");
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
                ? "Troca atualizada! Nova POS ativada e antiga movida para o estoque do consultor." 
                : "Ativação concluída! OTP enviado para o consultor.");
        }, 1500);
    };

    const handleStockSelect = (val: string) => {
        setSelectedStockId(val);
        const device = inventory.find(i => i.serialNumber === val);
        if (device) {
            setAssignSerial(device.serialNumber);
            setAssignRc(device.rcNumber);
        } else {
            // Only clear if user selected empty option, don't auto-clear if they are typing manually
            if (val === "") {
                setAssignSerial('');
                setAssignRc('');
            }
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
                        Esteira GSurf
                    </h1>
                    <p className="text-brand-gray-600 mt-1">Ativação sistêmica, geração de OTP e manutenção.</p>
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

                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                        <button 
                            onClick={() => setFilterType('ALL')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterType === 'ALL' ? 'bg-brand-gray-900 text-white shadow-md' : 'bg-white text-brand-gray-600 border border-brand-gray-200 hover:bg-brand-gray-100'}`}
                        >
                            <LayoutList size={14} /> Todos
                        </button>
                        <button 
                            onClick={() => setFilterType('ACTIVATION')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterType === 'ACTIVATION' ? 'bg-green-600 text-white shadow-md' : 'bg-white text-brand-gray-600 border border-brand-gray-200 hover:bg-brand-gray-100'}`}
                        >
                            <Terminal size={14} /> Ativações
                        </button>
                        <button 
                            onClick={() => setFilterType('MAINTENANCE')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterType === 'MAINTENANCE' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-brand-gray-600 border border-brand-gray-200 hover:bg-brand-gray-100'}`}
                        >
                            <RefreshCw size={14} /> Manutenção
                        </button>
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
                                                    <RefreshCw className="w-3 h-3" /> Troca de Máquina
                                                </span>
                                            ) : isRetrieval ? (
                                                <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 border border-red-200">
                                                    <X className="w-3 h-3" /> Desativação
                                                </span>
                                            ) : (
                                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 border border-green-200">
                                                    <CheckCircle2 className="w-3 h-3" /> Nova Ativação (ID Gerado)
                                                </span>
                                            )}
                                            {task.internalId && (
                                                <span className="font-mono text-[10px] bg-brand-gray-900 text-white px-2 py-1 rounded border border-gray-700">
                                                    EC: {task.internalId}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <button 
                                            onClick={() => setSelectedTask(task)}
                                            className="bg-brand-primary text-white hover:bg-brand-dark px-4 py-2 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-2"
                                        >
                                            <Terminal className="w-4 h-4" />
                                            Processar no GSurf
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                                        <div>
                                            <p className="text-[10px] font-bold text-brand-gray-500 uppercase mb-1">Cliente</p>
                                            <p className="font-bold text-brand-gray-900">{task.clientName}</p>
                                            <p className="font-mono text-xs text-brand-gray-600">{task.documentNumber || 'CNPJ não informado'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-brand-gray-500 uppercase mb-1">Localização</p>
                                            <p className="text-brand-gray-800 text-xs truncate max-w-[200px]">{task.address}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-brand-gray-500 uppercase mb-1">Solicitante</p>
                                            <p className="text-brand-gray-800 flex items-center gap-1"><User size={12}/> {task.requesterName}</p>
                                            <p className="text-xs text-brand-gray-500">{new Date(task.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    
                                    {(isExchange || isRetrieval) && (
                                        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-100 rounded text-xs text-yellow-800">
                                            <strong>Detalhe da Solicitação:</strong> {task.details}
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
                                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                            <span className="text-xs font-bold text-green-700 uppercase flex items-center gap-1 mb-2">
                                                <Link size={12} /> POS Vinculada na Solicitação
                                            </span>
                                            <div className="flex gap-4 font-mono text-sm text-green-900 bg-white p-2 rounded border border-green-100">
                                                <span>SN: {selectedTask.posData.serialNumber}</span>
                                                <span>RC: {selectedTask.posData.rcNumber}</span>
                                            </div>
                                            <p className="text-[10px] text-green-600 mt-1">
                                                * Os campos de ativação foram preenchidos automaticamente.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT: INPUTS FOR COMPLETION (LOGISTICS) */}
                                <div className="flex-[2] bg-white p-6 rounded-xl shadow-md border border-gray-200 flex flex-col">
                                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-6 uppercase border-b pb-2">
                                        <Hash className="w-4 h-4 text-brand-primary" /> 
                                        Registro de Saída (Estoque)
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
                                                    * Obrigatório. Este código será enviado para o consultor.
                                                </p>
                                            </div>

                                            {selectedTask.type === 'POS_EXCHANGE' && (
                                                <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg text-xs text-orange-800 flex items-start gap-2">
                                                    <RefreshCw className="w-4 h-4 shrink-0 mt-0.5" />
                                                    <p>Ao confirmar, a máquina <strong>antiga</strong> será movida automaticamente para o estoque do consultor <strong>{selectedTask.requesterName}</strong>.</p>
                                                </div>
                                            )}

                                            <button 
                                                onClick={handleGsurfComplete}
                                                disabled={isSubmitting || !assignSerial || !assignRc || !assignOtp}
                                                className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold hover:bg-brand-dark transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                                            >
                                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4" />}
                                                Confirmar & Enviar OTP
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
