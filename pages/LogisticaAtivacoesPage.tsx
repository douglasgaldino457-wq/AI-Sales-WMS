
import React, { useState, useEffect } from 'react';
import { 
    Key, Search, Terminal, MapPin, CheckCircle2, Loader2, Copy, Scan, ClipboardList, X,
    RefreshCw, User, Phone, Mail, FileText, Hash, Building2, AlertTriangle, ArrowRight, Truck, Package, Briefcase, LayoutList, Link, ArrowDownCircle
} from 'lucide-react';
import { appStore } from '../services/store';
import { LogisticsTask, PosDevice } from '../types';

const LogisticaAtivacoesPage: React.FC = () => {
    const [filterType, setFilterType] = useState<'ALL' | 'ACTIVATION' | 'MAINTENANCE'>('ALL');
    const [tasks, setTasks] = useState<LogisticsTask[]>([]);
    const [inventory, setInventory] = useState<PosDevice[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTask, setSelectedTask] = useState<LogisticsTask | null>(null);
    
    const [assignSerial, setAssignSerial] = useState('');
    const [assignRc, setAssignRc] = useState('');
    const [assignOtp, setAssignOtp] = useState('');
    const [selectedStockId, setSelectedStockId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        refreshData();
    }, []);

    useEffect(() => {
        if (selectedTask?.posData?.serialNumber) {
            setAssignSerial(selectedTask.posData.serialNumber);
            setAssignRc(selectedTask.posData.rcNumber || '');
            const inStockItem = inventory.find(i => i.serialNumber === selectedTask.posData?.serialNumber);
            if (inStockItem) setSelectedStockId(inStockItem.serialNumber);
        } else {
            setAssignSerial(''); setAssignRc(''); setSelectedStockId('');
        }
    }, [selectedTask, inventory]);

    const refreshData = () => {
        setTasks(appStore.getLogisticsTasks());
        setInventory(appStore.getPosInventory());
    };

    const filteredTasks = tasks.filter(t => {
        const matchesSearch = t.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || t.id.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;
        if (t.status.includes('COMPLETED')) return false;
        if (filterType === 'ACTIVATION') return t.type === 'FIELD_ACTIVATION' || t.type === 'POS_SHIPMENT';
        if (filterType === 'MAINTENANCE') return t.type === 'POS_EXCHANGE' || t.type === 'POS_RETRIEVAL';
        return true;
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const handleGsurfComplete = () => {
        if (!selectedTask) return;
        if (selectedTask.type !== 'POS_RETRIEVAL' && (!assignSerial || !assignRc || !assignOtp)) {
            alert("Obrigatório preencher Serial, RC e OTP.");
            return;
        }
        setIsSubmitting(true);
        setTimeout(() => {
            appStore.completeGsurfActivation(selectedTask.id, assignOtp, { serial: assignSerial, rc: assignRc });
            setIsSubmitting(false);
            setSelectedTask(null);
            refreshData();
            alert("Ação concluída com sucesso!");
        }, 1500);
    };

    const handleStockSelect = (val: string) => {
        setSelectedStockId(val);
        const device = inventory.find(i => i.serialNumber === val);
        if (device) { setAssignSerial(device.serialNumber); setAssignRc(device.rcNumber); }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            <header>
                <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2"><Key className="w-8 h-8 text-brand-primary" /> Esteira GSurf & Manutenção</h1>
                <p className="text-brand-gray-600 mt-1">Ativação sistêmica e controle de reversas.</p>
            </header>

            <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden min-h-[500px]">
                <div className="p-4 border-b bg-brand-gray-50 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-96">
                        <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-3 py-2.5 text-sm border border-brand-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary/20 outline-none" />
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setFilterType('ALL')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterType === 'ALL' ? 'bg-brand-gray-900 text-white' : 'bg-white text-brand-gray-600 border'}`}>Todos</button>
                        <button onClick={() => setFilterType('ACTIVATION')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterType === 'ACTIVATION' ? 'bg-green-600 text-white' : 'bg-white text-brand-gray-600 border'}`}>Ativações</button>
                        <button onClick={() => setFilterType('MAINTENANCE')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterType === 'MAINTENANCE' ? 'bg-orange-500 text-white' : 'bg-white text-brand-gray-600 border'}`}>Manutenção</button>
                    </div>
                </div>
                
                <div className="divide-y divide-brand-gray-100">
                    {filteredTasks.length === 0 ? (
                        <div className="p-16 text-center text-gray-400"><Package className="w-12 h-12 mb-3 opacity-20 mx-auto" /><p>Nenhuma tarefa pendente.</p></div>
                    ) : (
                        filteredTasks.map(task => {
                            const isMaintenance = task.type === 'POS_EXCHANGE' || task.type === 'POS_RETRIEVAL';
                            return (
                                <div key={task.id} className={`p-6 hover:bg-brand-gray-50 transition-colors border-l-4 ${task.type === 'POS_RETRIEVAL' ? 'border-l-red-500' : isMaintenance ? 'border-l-orange-500' : 'border-l-green-500'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 border ${isMaintenance ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                                                {isMaintenance ? <RefreshCw size={12}/> : <CheckCircle2 size={12}/>} {task.type === 'POS_EXCHANGE' ? 'Troca de Máquina' : task.type === 'POS_RETRIEVAL' ? 'Desativação' : 'Novo Cadastro'}
                                            </span>
                                            {isMaintenance && (
                                                <span className="bg-red-50 text-red-600 px-2 py-1 rounded text-[10px] font-black uppercase flex items-center gap-1 border border-red-100">
                                                    <ArrowDownCircle size={10}/> Recolher Serial: {task.posData?.serialNumber || 'N/D'}
                                                </span>
                                            )}
                                        </div>
                                        <button onClick={() => setSelectedTask(task)} className="bg-brand-primary text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md flex items-center gap-2"><Terminal size={14} /> Processar no GSurf</button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                                        <div><p className="text-[10px] font-bold text-brand-gray-400 uppercase">Cliente</p><p className="font-bold text-brand-gray-900">{task.clientName}</p><p className="font-mono text-xs text-brand-gray-500">{task.documentNumber || 'CNPJ Pendente'}</p></div>
                                        <div><p className="text-[10px] font-bold text-brand-gray-400 uppercase">Motivo / Detalhes</p><p className="text-brand-gray-800 text-xs font-medium italic">"{task.details}"</p></div>
                                        <div><p className="text-[10px] font-bold text-brand-gray-400 uppercase">Solicitante</p><p className="text-brand-gray-800 font-bold">{task.requesterName}</p><p className="text-[10px] text-brand-gray-400 uppercase">{task.requesterRole}</p></div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {selectedTask && (
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-brand-gray-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
                            <h3 className="font-bold text-lg flex items-center gap-2"><Terminal size={20}/> Ativação sistêmica no GSurf</h3>
                            <button onClick={() => setSelectedTask(null)} className="text-gray-400 hover:text-white"><X size={20}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 flex flex-col md:flex-row gap-6">
                            <div className="flex-[3] bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
                                <h4 className="text-sm font-bold text-blue-800 uppercase tracking-wider flex items-center gap-2 border-b border-blue-200 pb-2"><ClipboardList size={16}/> Conferência de Dados</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-2 rounded border border-blue-100"><p className="text-[9px] font-bold text-blue-400 uppercase">ID EC (SIC)</p><p className="text-sm font-mono font-bold">{selectedTask.internalId || 'Pendente'}</p></div>
                                    <div className="bg-white p-2 rounded border border-blue-100"><p className="text-[9px] font-bold text-blue-400 uppercase">CNPJ</p><p className="text-sm font-mono font-bold">{selectedTask.documentNumber || 'N/A'}</p></div>
                                    <div className="col-span-2 bg-white p-2 rounded border border-blue-100"><p className="text-[9px] font-bold text-blue-400 uppercase">Razão Social</p><p className="text-sm font-bold truncate">{selectedTask.clientName}</p></div>
                                </div>
                                {selectedTask.type === 'POS_EXCHANGE' && (
                                    <div className="bg-orange-100 p-3 rounded-lg border border-orange-200 text-orange-800">
                                        <p className="text-xs font-bold flex items-center gap-2"><AlertTriangle size={14}/> ATENÇÃO: TROCA DE MÁQUINA</p>
                                        <p className="text-[10px] mt-1">Desvincular do Gsurf o S/N: <strong>{selectedTask.posData?.serialNumber}</strong> antes de ativar a nova.</p>
                                    </div>
                                )}
                            </div>
                            <div className="flex-[2] bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                                <h4 className="text-sm font-bold text-gray-900 uppercase">Registro de Ativação</h4>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Selecionar do Estoque</label>
                                    <select className="w-full border bg-gray-50 rounded-lg p-2 text-sm" value={selectedStockId} onChange={e => handleStockSelect(e.target.value)}>
                                        <option value="">Selecione...</option>
                                        {inventory.filter(i => i.status !== 'Active').map(i => <option key={i.serialNumber} value={i.serialNumber}>{i.serialNumber} ({i.model})</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <input className="w-full border rounded-lg p-2 text-sm font-mono" placeholder="S/N" value={assignSerial} onChange={e => setAssignSerial(e.target.value.toUpperCase())} />
                                    <input className="w-full border rounded-lg p-2 text-sm font-mono" placeholder="RC" value={assignRc} onChange={e => setAssignRc(e.target.value.toUpperCase())} />
                                </div>
                                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                                    <label className="block text-center text-[10px] font-black text-purple-700 uppercase mb-2">Código OTP GSurf</label>
                                    <input className="w-full text-center text-2xl font-mono font-bold tracking-[0.3em] border-2 border-purple-300 rounded-lg py-2 focus:border-purple-600 outline-none" placeholder="000-000" maxLength={8} value={assignOtp} onChange={e => setAssignOtp(e.target.value.toUpperCase())} />
                                </div>
                                <button onClick={handleGsurfComplete} disabled={isSubmitting} className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold hover:bg-brand-dark flex items-center justify-center gap-2 shadow-lg transition-all transform active:scale-95 disabled:opacity-50">
                                    {isSubmitting ? <Loader2 size={20} className="animate-spin"/> : <CheckCircle2 size={20}/>} Confirmar e Enviar OTP
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LogisticaAtivacoesPage;
