
import React, { useState, useEffect } from 'react';
import { 
    Search, Download, Filter, ChevronRight, User, Plus, Trash2, Save, X, Box
} from 'lucide-react';
import { appStore } from '../services/store';
import { PosDevice } from '../types';
import { InventoryModal } from '../components/InventoryModal';

const LogisticaEstoquePage: React.FC = () => {
    const [inventory, setInventory] = useState<PosDevice[]>([]);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('TODOS');

    // Modals
    const [selectedDevice, setSelectedDevice] = useState<PosDevice | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    
    // Form for Add/Edit
    const [newDevice, setNewDevice] = useState<Partial<PosDevice>>({
        model: 'P2 Smart',
        status: 'InStock',
        currentHolder: 'Logística Central'
    });

    useEffect(() => {
        setInventory(appStore.getPosInventory());
    }, []);

    const refreshData = () => {
        setInventory(appStore.getPosInventory());
    };

    // Filter Inventory List
    const filteredInventory = inventory.filter(item => {
        const matchesSearch = 
            item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
            item.rcNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.currentHolder.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'TODOS' || item.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Active': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold uppercase border border-green-200">Instalado</span>;
            case 'InStock': return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-bold uppercase border border-purple-200">Em Estoque</span>;
            case 'WithField': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold uppercase border border-blue-200">Com Consultor</span>;
            case 'Defective': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold uppercase border border-red-200">Defeito</span>;
            default: return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-[10px] font-bold uppercase border border-gray-200">{status}</span>;
        }
    };

    const handleDelete = (e: React.MouseEvent, serial: string) => {
        e.stopPropagation();
        if (confirm(`Tem certeza que deseja excluir o equipamento S/N: ${serial}?`)) {
            appStore.removePosDevice(serial);
            refreshData();
        }
    };

    const handleAdd = () => {
        if (!newDevice.serialNumber || !newDevice.rcNumber) {
            alert("Preencha Serial e RC.");
            return;
        }
        
        const device: PosDevice = {
            serialNumber: newDevice.serialNumber,
            rcNumber: newDevice.rcNumber,
            model: newDevice.model || 'P2 Smart',
            status: newDevice.status as any,
            currentHolder: newDevice.currentHolder || 'Logística Central',
            lastUpdated: new Date().toISOString(),
            history: []
        };

        appStore.addPosDevice(device);
        refreshData();
        setIsAddModalOpen(false);
        setNewDevice({ model: 'P2 Smart', status: 'InStock', currentHolder: 'Logística Central' });
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            <header className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <Box className="w-8 h-8 text-brand-primary" />
                        Estoque Global
                    </h1>
                    <p className="text-brand-gray-600 mt-1">Gestão de inventário e movimentação de equipamentos.</p>
                </div>
                
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-brand-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-black transition-all flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Novo Equipamento
                </button>
            </header>

            <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden flex flex-col animate-fade-in min-h-[600px]">
                
                {/* Toolbar */}
                <div className="p-5 border-b border-brand-gray-100 bg-brand-gray-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex gap-4 items-center w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Buscar Serial, RC ou Responsável..." 
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-brand-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-brand-gray-400" />
                            <select 
                                className="border border-brand-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-brand-primary"
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                            >
                                <option value="TODOS">Todos Status</option>
                                <option value="Active">Instalado</option>
                                <option value="InStock">Estoque Central</option>
                                <option value="WithField">Com Consultor</option>
                                <option value="Defective">Defeito</option>
                            </select>
                        </div>
                    </div>

                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-brand-gray-200 text-brand-gray-700 rounded-lg text-sm font-bold hover:bg-brand-gray-50 transition-colors shadow-sm">
                        <Download className="w-4 h-4" /> Exportar CSV
                    </button>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-brand-gray-50 text-brand-gray-500 uppercase font-bold text-xs sticky top-0 z-10 border-b border-brand-gray-200">
                            <tr>
                                <th className="px-6 py-4">Serial Number</th>
                                <th className="px-6 py-4">Modelo</th>
                                <th className="px-6 py-4">Patrimônio (RC)</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Portador Atual</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-gray-100">
                            {filteredInventory.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-brand-gray-400">
                                        Nenhum item encontrado no estoque.
                                    </td>
                                </tr>
                            ) : (
                                filteredInventory.map((item) => (
                                    <tr 
                                        key={item.serialNumber} 
                                        onClick={() => setSelectedDevice(item)}
                                        className="hover:bg-brand-gray-50 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4 font-mono font-bold text-brand-gray-900">
                                            {item.serialNumber}
                                        </td>
                                        <td className="px-6 py-4 text-brand-gray-700">
                                            {item.model}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-brand-gray-600">
                                            {item.rcNumber}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(item.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <User className="w-3 h-3 text-brand-gray-400" />
                                                <span className="font-medium text-brand-gray-800">{item.currentHolder}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={(e) => handleDelete(e, item.serialNumber)} className="p-2 text-brand-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                                    <Trash2 size={16} />
                                                </button>
                                                <button className="p-2 text-brand-gray-300 group-hover:text-brand-primary">
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                <div className="p-4 border-t border-brand-gray-100 bg-brand-gray-50 text-xs text-brand-gray-500 flex justify-between items-center">
                    <span>Mostrando {filteredInventory.length} de {inventory.length} itens</span>
                    <div className="flex gap-2">
                        <span className="font-bold">Legenda:</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Instalado</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Com Consultor</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Estoque</span>
                    </div>
                </div>
            </div>

            {/* Inventory Details Modal */}
            <InventoryModal 
                isOpen={!!selectedDevice} 
                onClose={() => setSelectedDevice(null)} 
                device={selectedDevice} 
            />

            {/* Add Device Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="bg-brand-gray-900 px-6 py-4 flex justify-between items-center text-white">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Plus className="w-5 h-5"/> Novo Equipamento
                            </h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Modelo</label>
                                <select 
                                    className="w-full border rounded-lg p-2 text-sm"
                                    value={newDevice.model}
                                    onChange={e => setNewDevice({...newDevice, model: e.target.value})}
                                >
                                    <option value="P2 Smart">P2 Smart</option>
                                    <option value="MP35">MP35</option>
                                    <option value="X990">X990</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Serial Number</label>
                                    <input 
                                        className="w-full border rounded-lg p-2 text-sm uppercase"
                                        value={newDevice.serialNumber || ''}
                                        onChange={e => setNewDevice({...newDevice, serialNumber: e.target.value.toUpperCase()})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">RC (Patrimônio)</label>
                                    <input 
                                        className="w-full border rounded-lg p-2 text-sm uppercase"
                                        value={newDevice.rcNumber || ''}
                                        onChange={e => setNewDevice({...newDevice, rcNumber: e.target.value.toUpperCase()})}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Status Inicial</label>
                                <select 
                                    className="w-full border rounded-lg p-2 text-sm"
                                    value={newDevice.status}
                                    onChange={e => setNewDevice({...newDevice, status: e.target.value as any})}
                                >
                                    <option value="InStock">Em Estoque</option>
                                    <option value="WithField">Com Consultor</option>
                                    <option value="Triage">Triagem</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Portador Atual</label>
                                <input 
                                    className="w-full border rounded-lg p-2 text-sm"
                                    value={newDevice.currentHolder || ''}
                                    onChange={e => setNewDevice({...newDevice, currentHolder: e.target.value})}
                                />
                            </div>
                            <button onClick={handleAdd} className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold mt-4 hover:bg-brand-dark flex items-center justify-center gap-2">
                                <Save className="w-4 h-4" /> Salvar Cadastro
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LogisticaEstoquePage;
