
import React from 'react';
import { X, Server, Calendar, User, Activity, Hash, Clock } from 'lucide-react';
import { PosDevice } from '../types';

interface InventoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    device: PosDevice | null;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({ isOpen, onClose, device }) => {
    if (!isOpen || !device) return null;

    // Sort history descending by date
    const history = device.history ? [...device.history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="bg-brand-gray-900 p-6 text-white shrink-0 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                device.status === 'Active' ? 'bg-green-500 text-white' :
                                device.status === 'InStock' ? 'bg-blue-500 text-white' :
                                'bg-brand-gray-600 text-gray-300'
                            }`}>
                                {device.status}
                            </span>
                            <span className="text-gray-400 text-xs font-mono">{device.model}</span>
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Server className="w-6 h-6 text-brand-primary" />
                            {device.serialNumber}
                        </h2>
                        <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                            <Hash className="w-3 h-3" /> RC: {device.rcNumber}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-brand-gray-50">
                    
                    {/* Current Status Card */}
                    <div className="bg-white p-5 rounded-xl border border-brand-gray-200 shadow-sm mb-6">
                        <h3 className="text-sm font-bold text-gray-900 uppercase mb-4 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-brand-primary" /> Status Atual
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="block text-xs font-bold text-gray-400 uppercase mb-1">Portador Atual</span>
                                <div className="flex items-center gap-2 text-gray-800 font-medium">
                                    <User className="w-4 h-4 text-gray-400" />
                                    {device.currentHolder}
                                </div>
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-gray-400 uppercase mb-1">Última Atualização</span>
                                <div className="flex items-center gap-2 text-gray-800 font-medium">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    {new Date(device.lastUpdated).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline History */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase mb-4 flex items-center gap-2 pl-1">
                            <Calendar className="w-4 h-4 text-brand-primary" /> Histórico de Movimentação
                        </h3>
                        
                        <div className="relative border-l-2 border-brand-gray-200 ml-3 space-y-6 pb-2">
                            {history.length === 0 ? (
                                <div className="pl-6 text-sm text-gray-400 italic">Nenhum histórico registrado.</div>
                            ) : (
                                history.map((item, idx) => (
                                    <div key={idx} className="relative pl-6">
                                        {/* Timeline Dot */}
                                        <div className={`absolute -left-[9px] top-4 w-4 h-4 rounded-full border-2 border-white shadow-sm ${idx === 0 ? 'bg-brand-primary' : 'bg-brand-gray-400'}`}></div>
                                        
                                        <div className="bg-white p-4 rounded-lg border border-brand-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                                                    item.status === 'Active' ? 'bg-green-100 text-green-700 border-green-200' :
                                                    item.status === 'WithField' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                    'bg-gray-100 text-gray-600 border-gray-200'
                                                }`}>
                                                    {item.status}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                            </div>
                                            
                                            <p className="text-xs text-gray-800 font-medium mb-3">{item.description}</p>
                                            
                                            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                                <User size={12} className="text-brand-gray-400" />
                                                <span className="text-xs text-gray-600">
                                                    Responsável: <strong className="text-gray-800">{item.holder}</strong>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
