
import React, { useState, useEffect } from 'react';
import { Truck, Package, RotateCw, CheckCircle2, Search, Filter, AlertTriangle, Key, ArrowRight, User, Terminal, FileCheck } from 'lucide-react';
import { appStore } from '../services/store';
import { PosDevice, LogisticsTask, LogisticsTaskStatus } from '../types';

// Tabs for the Dashboard
type LogisticaTab = 'ACTIVATION' | 'REQUESTS' | 'INVENTORY';

const LogisticaDashboardPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<LogisticaTab>('ACTIVATION');
    const [inventory, setInventory] = useState<PosDevice[]>([]);
    const [tasks, setTasks] = useState<LogisticsTask[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [refresh, setRefresh] = useState(0);

    // Modal State for Gsurf/OTP
    const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<LogisticsTask | null>(null);
    const [otpInput, setOtpInput] = useState('');

    useEffect(() => {
        setInventory(appStore.getPosInventory());
        setTasks(appStore.getLogisticsTasks());
    }, [refresh]);

    // --- ACTIONS ---

    const handleOpenGsurfModal = (task: LogisticsTask) => {
        setSelectedTask(task);
        setOtpInput('');
        setIsOtpModalOpen(true);
    };

    const handleGenerateOtp = () => {
        if (!selectedTask || !otpInput) return;
        
        const updated: LogisticsTask = {
            ...selectedTask,
            status: 'WAITING_OTP',
            otp: otpInput
        };
        appStore.updateLogisticsTask(updated);
        
        // Also update Inventory to Active if needed, or wait for Field to confirm?
        // Let's assume Generating OTP reserves it.
        if (selectedTask.posData) {
            appStore.updatePosStatus(selectedTask.posData.serialNumber, 'Active', selectedTask.clientName);
        }

        setIsOtpModalOpen(false);
        setRefresh(r => r + 1);
        alert(`OTP gerado! O consultor ${selectedTask.requesterName} já pode ativar a máquina.`);
    };

    // --- RENDERERS ---

    // 1. ACTIVATION PIPELINE (Kanban-ish)
    const renderActivationPipeline = () => {
        const fieldTasks = tasks.filter(t => t.type === 'FIELD_ACTIVATION');
        const readyGsurf = fieldTasks.filter(t => t.status === 'READY_FOR_GSURF');
        const waitingOtp = fieldTasks.filter(t => t.status === 'WAITING_OTP' || t.status === 'COMPLETED');

        const TaskCard = ({ task, actionLabel, onAction, color }: any) => (
            <div className="bg-white p-4 rounded-xl border border-brand-gray-100 shadow-sm mb-3 relative overflow-hidden group">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${color}`}></div>
                <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-brand-gray-900 text-sm">{task.clientName}</h4>
                    <span className="text-[10px] bg-brand-gray-100 text-brand-gray-500 px-1.5 py-0.5 rounded font-mono">{task.id}</span>
                </div>
                <div className="text-xs text-brand-gray-500 mb-2 flex items-center gap-1">
                    <User className="w-3 h-3" /> {task.requesterName}
                </div>
                {task.posData && (
                    <div className="bg-brand-gray-50 p-2 rounded text-[10px] text-brand-gray-600 mb-3 font-mono border border-brand-gray-200">
                        RC: {task.posData.rcNumber} <br/> SN: {task.posData.serialNumber}
                    </div>
                )}
                {onAction && (
                    <button 
                        onClick={() => onAction(task)}
                        className="w-full py-2 rounded-lg text-xs font-bold bg-brand-gray-900 text-white hover:bg-black transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                        {actionLabel} <ArrowRight className="w-3 h-3" />
                    </button>
                )}
                {task.otp && (
                    <div className="bg-green-50 text-green-800 p-2 rounded text-center font-bold text-xs border border-green-200">
                        OTP: {task.otp}
                    </div>
                )}
            </div>
        );

        return (
            <div className="flex flex-col lg:flex-row gap-6 h-full overflow-x-auto pb-4">
                
                {/* Column 1: Gsurf Registration (Coming from Admin Approval) */}
                <div className="flex-1 min-w-[300px] bg-blue-50/50 rounded-xl p-4 border border-blue-100 flex flex-col">
                    <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-blue-600" />
                        Portal Gsurf (Aprovados)
                        <span className="bg-white px-2 py-0.5 rounded-full text-xs shadow-sm border border-blue-100">{readyGsurf.length}</span>
                    </h3>
                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                        {readyGsurf.map(task => (
                            <TaskCard 
                                key={task.id} 
                                task={task} 
                                color="bg-blue-500"
                                actionLabel="Registrar e Gerar OTP"
                                onAction={handleOpenGsurfModal}
                            />
                        ))}
                        {readyGsurf.length === 0 && <p className="text-xs text-blue-300 text-center mt-10">Aguardando cadastros aprovados pelo Admin.</p>}
                    </div>
                </div>

                {/* Column 2: Completed / OTP Sent */}
                <div className="flex-1 min-w-[300px] bg-green-50/50 rounded-xl p-4 border border-green-100 flex flex-col">
                    <h3 className="font-bold text-green-900 mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        Ativação Liberada (Field)
                        <span className="bg-white px-2 py-0.5 rounded-full text-xs shadow-sm border border-green-100">{waitingOtp.length}</span>
                    </h3>
                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                        {waitingOtp.map(task => (
                            <TaskCard 
                                key={task.id} 
                                task={task} 
                                color="bg-green-500"
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // 2. REQUESTS LIST (Inside Sales)
    const renderRequestsList = () => {
        const requests = tasks.filter(t => t.type === 'INSIDE_REQUEST');
        
        return (
            <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-brand-gray-50 text-brand-gray-500 font-bold border-b border-brand-gray-200">
                        <tr>
                            <th className="px-6 py-4">ID</th>
                            <th className="px-6 py-4">Cliente</th>
                            <th className="px-6 py-4">Solicitante</th>
                            <th className="px-6 py-4">Detalhes</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-gray-50">
                        {requests.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-8 text-brand-gray-400">Nenhuma solicitação pendente.</td></tr>
                        ) : (
                            requests.map(req => (
                                <tr key={req.id} className="hover:bg-brand-gray-50">
                                    <td className="px-6 py-4 font-mono text-xs">{req.id}</td>
                                    <td className="px-6 py-4 font-bold text-brand-gray-900">{req.clientName}</td>
                                    <td className="px-6 py-4 text-brand-gray-600">{req.requesterName}</td>
                                    <td className="px-6 py-4 text-brand-gray-600 max-w-xs truncate" title={req.details}>{req.details}</td>
                                    <td className="px-6 py-4">
                                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-bold">
                                            {req.status === 'PENDING_SHIPMENT' ? 'Aprovado (Envio)' : req.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-brand-primary font-bold text-xs hover:underline">Processar Envio</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    // 3. INVENTORY TABLE
    const renderInventory = () => {
        const filteredInv = inventory.filter(i => 
            i.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.currentHolder.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className="space-y-4">
                <div className="flex gap-4 mb-4">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar por Serial ou Portador..." 
                            className="w-full pl-10 pr-4 py-2 border border-brand-gray-300 rounded-lg text-sm outline-none focus:border-brand-primary"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-brand-gray-50 text-brand-gray-500 font-bold border-b border-brand-gray-200">
                            <tr>
                                <th className="px-6 py-4">Serial (SN)</th>
                                <th className="px-6 py-4">RC Number</th>
                                <th className="px-6 py-4">Modelo</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Localização Atual</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-gray-50">
                            {filteredInv.slice(0, 20).map((item, idx) => (
                                <tr key={idx} className="hover:bg-brand-gray-50">
                                    <td className="px-6 py-4 font-mono font-bold">{item.serialNumber}</td>
                                    <td className="px-6 py-4 font-mono">{item.rcNumber}</td>
                                    <td className="px-6 py-4">{item.model}</td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-bold px-2 py-1 rounded border
                                            ${item.status === 'Active' ? 'bg-green-100 text-green-700 border-green-200' : 
                                              item.status === 'WithField' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                              'bg-gray-100 text-gray-700 border-gray-200'}
                                        `}>
                                            {item.status === 'WithField' ? 'Com Consultor' : item.status === 'Active' ? 'Ativo no EC' : 'Em Estoque'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-brand-gray-800">
                                        {item.currentHolder}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 h-[calc(100vh-6rem)] flex flex-col">
            <header className="flex flex-col md:flex-row justify-between items-end gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <Truck className="w-8 h-8 text-brand-primary" />
                        Centro de Logística
                    </h1>
                    <p className="text-brand-gray-600 mt-1">Gestão de estoque POS e esteira de ativação.</p>
                </div>
                
                {/* Tabs */}
                <div className="flex bg-brand-gray-200 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('ACTIVATION')}
                        className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'ACTIVATION' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                    >
                        <RotateCw className="w-4 h-4 mr-2" />
                        Ativações (Field)
                    </button>
                    <button 
                        onClick={() => setActiveTab('REQUESTS')}
                        className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'REQUESTS' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                    >
                        <Package className="w-4 h-4 mr-2" />
                        Solicitações (Inside)
                    </button>
                    <button 
                        onClick={() => setActiveTab('INVENTORY')}
                        className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'INVENTORY' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Estoque Global
                    </button>
                </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'ACTIVATION' && renderActivationPipeline()}
                {activeTab === 'REQUESTS' && renderRequestsList()}
                {activeTab === 'INVENTORY' && renderInventory()}
            </div>

            {/* OTP Generation Modal */}
            {isOtpModalOpen && selectedTask && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Key className="w-5 h-5" /> Registro Gsurf
                            </h3>
                            <button onClick={() => setIsOtpModalOpen(false)} className="text-blue-200 hover:text-white">✕</button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-4">
                                Cadastre o EC <strong>{selectedTask.clientName}</strong> no portal Gsurf e insira o código de ativação (OTP) gerado abaixo.
                            </p>
                            
                            <div className="bg-brand-gray-50 p-3 rounded-lg mb-4 border border-brand-gray-200 text-xs font-mono space-y-1">
                                <div><span className="font-bold text-gray-500">POS:</span> {selectedTask.posData?.model}</div>
                                <div><span className="font-bold text-gray-500">Serial:</span> {selectedTask.posData?.serialNumber}</div>
                                <div><span className="font-bold text-gray-500">RC:</span> {selectedTask.posData?.rcNumber}</div>
                            </div>

                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Código OTP (Gsurf)</label>
                            <input 
                                type="text" 
                                placeholder="Ex: 123456"
                                className="w-full text-center text-2xl font-bold tracking-widest border border-gray-300 rounded-lg py-2 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                                value={otpInput}
                                onChange={e => setOtpInput(e.target.value)}
                                maxLength={8}
                            />

                            <button 
                                onClick={handleGenerateOtp}
                                disabled={!otpInput}
                                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirmar e Liberar para Field
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LogisticaDashboardPage;
