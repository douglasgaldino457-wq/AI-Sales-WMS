
import React, { useState, useEffect } from 'react';
import { 
    Key, Search, Terminal, MapPin, CheckCircle2, Loader2, Copy, Scan, ClipboardList, X,
    RefreshCw, User, Phone, Mail, FileText, Hash, Building2, AlertTriangle, ArrowRight
} from 'lucide-react';
import { appStore } from '../services/store';
import { LogisticsTask, PosDevice } from '../types';

const LogisticaAtivacoesPage: React.FC = () => {
    const [tasks, setTasks] = useState<LogisticsTask[]>([]);
    const [inventory, setInventory] = useState<PosDevice[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTask, setSelectedTask] = useState<LogisticsTask | null>(null);
    
    // Modal Inputs
    const [assignSerial, setAssignSerial] = useState('');
    const [assignRc, setAssignRc] = useState('');
    const [assignOtp, setAssignOtp] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = () => {
        const allTasks = appStore.getLogisticsTasks();
        // Filter for Activations AND Exchanges
        setTasks(allTasks.filter(t => t.type === 'FIELD_ACTIVATION' || t.type === 'POS_EXCHANGE'));
        setInventory(appStore.getPosInventory());
    };

    const filteredTasks = tasks.filter(t => 
        t.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.internalId && t.internalId.includes(searchTerm)) ||
        (t.documentNumber && t.documentNumber.includes(searchTerm))
    ).sort((a,b) => {
        if (a.status.includes('READY') && !b.status.includes('READY')) return -1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    const handleAssignPos = () => {
        if (!selectedTask) return;
        
        // For Exchanges, user might just confirm without changing S/N if it's just a config update, 
        // but typically exchange implies new device.
        if (!assignSerial || !assignRc || !assignOtp) {
            alert("Preencha Serial, RC e o OTP gerado no Gsurf.");
            return;
        }

        setIsSubmitting(true);
        setTimeout(() => {
            let nextStatus = 'COMPLETED' as any;
            
            // Workflow: If Exchange, send to Admin after Logic checks (as per prompt)
            if (selectedTask.type === 'POS_EXCHANGE') {
                nextStatus = 'SENT_TO_ADMIN'; // Custom status logic
            }

            const updatedTask: LogisticsTask = {
                ...selectedTask,
                status: nextStatus,
                otp: assignOtp,
                posData: { serialNumber: assignSerial, rcNumber: assignRc, model: 'P2 Smart' }
            };
            appStore.updateLogisticsTask(updatedTask);
            
            // Update Inventory logic would go here
            
            setIsSubmitting(false);
            setSelectedTask(null);
            setAssignSerial('');
            setAssignRc('');
            setAssignOtp('');
            refreshData();
            
            if (selectedTask.type === 'POS_EXCHANGE') {
                alert("Troca aprovada! Enviado para o time Administrativo atualizar o cadastro.");
            } else {
                alert("Ativação registrada com sucesso!");
            }
        }, 1000);
    };

    const copyToClipboard = (text: string | undefined) => {
        if (text) navigator.clipboard.writeText(text);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            <header>
                <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                    <Key className="w-8 h-8 text-brand-primary" />
                    Ativações & Trocas
                </h1>
                <p className="text-brand-gray-600 mt-1">Gestão de terminais: Novas ativações e solicitações de troca.</p>
            </header>

            <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden min-h-[500px]">
                {/* Toolbar */}
                <div className="p-4 border-b border-brand-gray-100 bg-brand-gray-50 flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-10">
                    <div className="relative w-full md:w-96">
                        <input 
                            type="text" 
                            placeholder="Buscar por EC, CNPJ, ID ou RC..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 text-sm border border-brand-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all shadow-sm"
                        />
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    
                    <div className="flex gap-2">
                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-brand-gray-500 bg-white px-2 py-1 rounded border">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div> Nova Ativação
                        </span>
                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-brand-gray-500 bg-white px-2 py-1 rounded border">
                            <div className="w-2 h-2 rounded-full bg-orange-500"></div> Troca de POS
                        </span>
                    </div>
                </div>
                
                {/* List */}
                <div className="divide-y divide-brand-gray-100">
                    {filteredTasks.length === 0 ? (
                        <div className="p-16 text-center text-gray-400 flex flex-col items-center">
                            <Terminal className="w-12 h-12 mb-3 opacity-20" />
                            <p>Nenhuma tarefa encontrada na fila.</p>
                        </div>
                    ) : (
                        filteredTasks.map(task => {
                            const isExchange = task.type === 'POS_EXCHANGE';
                            const statusColor = task.status === 'COMPLETED' ? 'text-green-600 bg-green-50 border-green-200' : 'text-purple-600 bg-purple-50 border-purple-200';
                            
                            return (
                                <div key={task.id} className={`p-6 hover:bg-brand-gray-50 transition-colors border-l-4 ${isExchange ? 'border-l-orange-500' : 'border-l-green-500'}`}>
                                    {/* Header Badge Row */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                            {isExchange ? (
                                                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 border border-orange-200">
                                                    <RefreshCw className="w-3 h-3" /> Troca de POS
                                                </span>
                                            ) : (
                                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 border border-green-200">
                                                    <CheckCircle2 className="w-3 h-3" /> Nova Ativação
                                                </span>
                                            )}
                                            <span className="font-mono text-[10px] bg-brand-gray-900 text-white px-2 py-1 rounded">
                                                ID: {task.internalId || 'N/A'}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase ${statusColor}`}>
                                                {task.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        
                                        {task.status !== 'COMPLETED' && task.status !== 'SENT_TO_ADMIN' && (
                                            <button 
                                                onClick={() => setSelectedTask(task)}
                                                className="bg-brand-primary text-white hover:bg-brand-dark px-4 py-2 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-2"
                                            >
                                                <Terminal className="w-4 h-4" />
                                                {isExchange ? 'Processar Troca' : 'Vincular & Ativar'}
                                            </button>
                                        )}
                                        {(task.status === 'COMPLETED' || task.status === 'SENT_TO_ADMIN') && (
                                            <div className="text-right">
                                                <span className="block text-[10px] font-bold text-gray-400 uppercase">OTP</span>
                                                <span className="font-mono font-bold text-lg text-brand-gray-800 tracking-widest">{task.otp}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-8 text-sm">
                                        
                                        {/* Row 1: Company Info */}
                                        <div className="col-span-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Building2 className="w-4 h-4 text-brand-gray-400" />
                                                <span className="text-[10px] font-bold text-brand-gray-500 uppercase">Razão Social / CNPJ</span>
                                            </div>
                                            <p className="font-bold text-brand-gray-900">{task.legalName || task.clientName}</p>
                                            <p className="font-mono text-xs text-brand-gray-600">{task.documentNumber}</p>
                                        </div>

                                        <div className="col-span-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <MapPin className="w-4 h-4 text-brand-gray-400" />
                                                <span className="text-[10px] font-bold text-brand-gray-500 uppercase">Endereço</span>
                                            </div>
                                            <p className="text-brand-gray-800 break-words">{task.address}</p>
                                        </div>

                                        {/* Row 2: Equipment & Contact */}
                                        <div className="bg-brand-gray-100 p-2 rounded-lg border border-brand-gray-200">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Hash className="w-4 h-4 text-brand-gray-500" />
                                                <span className="text-[10px] font-bold text-brand-gray-500 uppercase">Equipamento</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-mono"><span className="font-bold">RC:</span> {task.posData?.rcNumber || '---'}</span>
                                                <span className="text-xs font-mono"><span className="font-bold">S/N:</span> {task.posData?.serialNumber || '---'}</span>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <User className="w-4 h-4 text-brand-gray-400" />
                                                <span className="text-[10px] font-bold text-brand-gray-500 uppercase">Responsável</span>
                                            </div>
                                            <p className="text-brand-gray-800 font-medium">{task.responsibleName}</p>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Phone className="w-4 h-4 text-brand-gray-400" />
                                                <span className="text-[10px] font-bold text-brand-gray-500 uppercase">Telefone</span>
                                            </div>
                                            <p className="text-brand-gray-800">{task.contactPhone}</p>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Mail className="w-4 h-4 text-brand-gray-400" />
                                                <span className="text-[10px] font-bold text-brand-gray-500 uppercase">E-mail</span>
                                            </div>
                                            <p className="text-brand-gray-800 truncate" title={task.email}>{task.email || 'Não informado'}</p>
                                        </div>
                                    </div>
                                    
                                    {isExchange && (
                                        <div className="mt-4 p-2 bg-orange-50 border border-orange-100 rounded text-xs text-orange-800 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" />
                                            <strong>Motivo da Troca:</strong> {task.details}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ACTION MODAL */}
            {selectedTask && (
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-brand-gray-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
                            <h3 className="font-bold text-lg flex items-center gap-2"><Scan className="w-5 h-5"/> {selectedTask.type === 'POS_EXCHANGE' ? 'Troca de Terminal' : 'Ativação de Terminal'}</h3>
                            <button onClick={() => setSelectedTask(null)} className="text-gray-400 hover:text-white"><X size={20}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* LEFT: DATA FOR GSURF */}
                                <div className="flex-1 space-y-4">
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                        <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-3">
                                            <ClipboardList className="w-4 h-4" /> Dados para Portal Gsurf
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="group relative">
                                                    <label className="text-[10px] text-blue-600 font-bold uppercase">ID Interno</label>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-bold text-gray-800 text-sm">{selectedTask.internalId || 'N/A'}</span>
                                                        <button onClick={() => copyToClipboard(selectedTask.internalId)} className="text-blue-400 hover:text-blue-600"><Copy size={12}/></button>
                                                    </div>
                                                </div>
                                                <div className="group relative">
                                                    <label className="text-[10px] text-blue-600 font-bold uppercase">CNPJ</label>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-bold text-gray-800 text-sm">{selectedTask.documentNumber}</span>
                                                        <button onClick={() => copyToClipboard(selectedTask.documentNumber)} className="text-blue-400 hover:text-blue-600"><Copy size={12}/></button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-blue-600 font-bold uppercase">Razão Social</label>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-800 text-sm break-words">{selectedTask.legalName || selectedTask.clientName}</span>
                                                    <button onClick={() => copyToClipboard(selectedTask.legalName || selectedTask.clientName)} className="text-blue-400 hover:text-blue-600 shrink-0"><Copy size={12}/></button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] text-blue-600 font-bold uppercase">Responsável</label>
                                                    <span className="block text-gray-800 text-sm">{selectedTask.responsibleName}</span>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-blue-600 font-bold uppercase">Contato</label>
                                                    <span className="block text-gray-800 text-sm">{selectedTask.contactPhone}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-blue-600 font-bold uppercase">E-mail</label>
                                                <span className="block text-gray-800 text-sm">{selectedTask.email || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {selectedTask.type === 'POS_EXCHANGE' && (
                                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                                            <h4 className="text-xs font-bold text-orange-800 uppercase mb-2">Equipamento a Recolher</h4>
                                            <p className="text-sm">SN: <strong>{selectedTask.posData?.serialNumber}</strong></p>
                                            <p className="text-xs text-orange-700 mt-1">Confirme o recolhimento antes de liberar a nova máquina.</p>
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT: INPUTS FOR POS & OTP */}
                                <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4 uppercase">
                                            <Terminal className="w-4 h-4 text-brand-primary" /> 
                                            {selectedTask.type === 'POS_EXCHANGE' ? 'Novo Equipamento' : 'Equipamento'}
                                        </h4>
                                        
                                        <div className="space-y-5">
                                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Identificação da POS (Estoque)</label>
                                                <div className="grid grid-cols-1 gap-3">
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">S/N</span>
                                                        <input 
                                                            className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none font-mono uppercase"
                                                            placeholder="Serial Number"
                                                            value={assignSerial}
                                                            onChange={e => setAssignSerial(e.target.value.toUpperCase())}
                                                        />
                                                    </div>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">RC</span>
                                                        <input 
                                                            className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none font-mono uppercase"
                                                            placeholder="Patrimônio (RC)"
                                                            value={assignRc}
                                                            onChange={e => setAssignRc(e.target.value.toUpperCase())}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                                                <label className="block text-xs font-bold text-purple-700 uppercase mb-2">Código de Ativação (Gsurf)</label>
                                                <div className="relative">
                                                    <input 
                                                        className="w-full border-2 border-purple-200 rounded-lg px-4 py-3 text-lg text-center font-bold tracking-widest text-purple-900 focus:ring-2 focus:ring-purple-500 outline-none uppercase"
                                                        placeholder="000-000"
                                                        maxLength={10}
                                                        value={assignOtp}
                                                        onChange={e => setAssignOtp(e.target.value.toUpperCase())}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <button 
                                            onClick={handleAssignPos}
                                            disabled={isSubmitting || !assignSerial || !assignRc || !assignOtp}
                                            className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold hover:bg-brand-dark transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4" />}
                                            {selectedTask.type === 'POS_EXCHANGE' ? 'Aprovar Troca & Gerar OTP' : 'Confirmar & Salvar OTP'}
                                        </button>
                                        
                                        {selectedTask.type === 'POS_EXCHANGE' && (
                                            <p className="text-[10px] text-center text-gray-500 mt-2">
                                                Ao aprovar, a solicitação será encaminhada para o time <strong className="text-gray-700">Administrativo</strong> atualizar o cadastro.
                                            </p>
                                        )}
                                    </div>
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
