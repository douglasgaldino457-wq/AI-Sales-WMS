
import React, { useState, useEffect } from 'react';
import { 
    ClipboardCheck, 
    Clock, 
    CheckCircle2, 
    AlertTriangle, 
    Search, 
    Filter, 
    FileText, 
    ArrowRight,
    Briefcase,
    Calendar,
    ChevronDown,
    Plus,
    X,
    Save
} from 'lucide-react';
import { appStore } from '../services/store';
import { ManualDemand } from '../types';

const ResultadosPage: React.FC = () => {
    const [demands, setDemands] = useState<ManualDemand[]>([]);
    const [filterStatus, setFilterStatus] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [demandTypes, setDemandTypes] = useState<string[]>([]);
    const [newDemand, setNewDemand] = useState<Partial<ManualDemand>>({
        clientName: '',
        type: 'Venda Taxa Full', // Default to Full as requested
        description: '',
    });

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = () => {
        setDemands(appStore.getDemands());
        setDemandTypes(appStore.getDemandTypes());
    };

    const filteredDemands = demands.filter(d => {
        const matchesSearch = d.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || d.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'Todos' || d.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Concluído': return 'bg-green-100 text-green-700 border-green-200';
            case 'Em Análise': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Pendente': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'Rejeitado': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Concluído': return <CheckCircle2 className="w-4 h-4" />;
            case 'Em Análise': return <Clock className="w-4 h-4" />;
            case 'Pendente': return <Clock className="w-4 h-4" />;
            case 'Rejeitado': return <AlertTriangle className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    const handleCreateDemand = (e: React.FormEvent) => {
        e.preventDefault();
        if(!newDemand.clientName || !newDemand.type) return;

        const demand: ManualDemand = {
            id: `DEM-${Math.floor(1000 + Math.random() * 9000)}`,
            clientName: newDemand.clientName,
            type: newDemand.type,
            date: new Date().toISOString(),
            status: 'Pendente',
            description: newDemand.description,
            requester: 'Eu' // Should be current user, simplifying for now
        };

        appStore.addDemand(demand);
        refreshData();
        setIsModalOpen(false);
        setNewDemand({ clientName: '', type: 'Venda Taxa Full', description: '' });
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <ClipboardCheck className="w-8 h-8 text-brand-primary" />
                        Resultados & Demandas
                    </h1>
                    <p className="text-brand-gray-600 mt-1">Acompanhamento de solicitações manuais e operacionais.</p>
                </div>
                
                <div className="flex gap-2">
                    <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-brand-gray-100 flex flex-col items-center min-w-[100px]">
                        <span className="text-[10px] text-brand-gray-400 font-bold uppercase">Total</span>
                        <span className="text-xl font-bold text-brand-gray-900">{demands.length}</span>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-brand-gray-100 flex flex-col items-center min-w-[100px]">
                        <span className="text-[10px] text-green-600 font-bold uppercase">Resolvidas</span>
                        <span className="text-xl font-bold text-green-600">{demands.filter(d => d.status === 'Concluído').length}</span>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-brand-gray-100 flex flex-col items-center min-w-[100px]">
                        <span className="text-[10px] text-orange-500 font-bold uppercase">Pendentes</span>
                        <span className="text-xl font-bold text-orange-500">{demands.filter(d => d.status === 'Pendente' || d.status === 'Em Análise').length}</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden animate-fade-in">
                {/* Filter Toolbar */}
                <div className="p-4 border-b border-brand-gray-100 bg-brand-gray-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-80">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar por ID, Cliente ou Tipo..." 
                            className="w-full pl-10 pr-4 py-2 border border-brand-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                        {['Todos', 'Concluído', 'Pendente', 'Em Análise', 'Rejeitado'].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all border
                                    ${filterStatus === status 
                                        ? 'bg-brand-gray-900 text-white border-brand-gray-900 shadow-md' 
                                        : 'bg-white text-brand-gray-600 border-brand-gray-200 hover:bg-brand-gray-50'}
                                `}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List of Results */}
                <div className="divide-y divide-brand-gray-100">
                    {filteredDemands.length === 0 ? (
                        <div className="p-12 text-center text-brand-gray-400 flex flex-col items-center">
                            <FileText className="w-12 h-12 mb-3 opacity-20" />
                            <p>Nenhuma demanda encontrada para os filtros selecionados.</p>
                        </div>
                    ) : (
                        filteredDemands.map(demand => (
                            <div key={demand.id} className="p-5 hover:bg-brand-gray-50 transition-all group">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-full shrink-0 ${
                                            demand.type.includes('Taxa') || demand.type.includes('Financeiro') 
                                                ? 'bg-green-50 text-green-600' 
                                                : 'bg-blue-50 text-blue-600'
                                        }`}>
                                            {demand.type.includes('Taxa') ? <Briefcase className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono text-[10px] text-brand-gray-400 bg-brand-gray-100 px-1.5 py-0.5 rounded">
                                                    {demand.id}
                                                </span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1 border ${getStatusColor(demand.status)}`}>
                                                    {getStatusIcon(demand.status)}
                                                    {demand.status}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-brand-gray-900 text-base mb-0.5">{demand.type}</h3>
                                            <p className="text-sm text-brand-gray-600 font-medium">{demand.clientName}</p>
                                            
                                            {demand.description && (
                                                <p className="text-xs text-brand-gray-500 mt-1 italic">"{demand.description}"</p>
                                            )}

                                            {demand.result && (
                                                <div className="mt-2 bg-white border border-brand-gray-200 p-2 rounded-lg text-xs text-brand-gray-700 flex items-start gap-2 shadow-sm">
                                                    <span className="font-bold shrink-0">Resultado:</span>
                                                    {demand.result}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-row md:flex-col justify-between items-end gap-2 text-right">
                                        <div className="flex items-center gap-1 text-xs text-brand-gray-400">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(demand.date).toLocaleDateString('pt-BR')}
                                        </div>
                                        <div className="text-xs text-brand-gray-500">
                                            Solicitante: <span className="font-bold text-brand-gray-700">{demand.requester}</span>
                                        </div>
                                        <button className="mt-2 px-3 py-1.5 text-xs font-bold text-brand-primary hover:bg-brand-primary/5 rounded-lg border border-transparent hover:border-brand-primary/20 transition-all flex items-center gap-1">
                                            Ver Detalhes <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
            
            {/* Action Bar */}
            <div className="flex justify-end">
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-brand-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-colors shadow-lg flex items-center gap-2 transform hover:-translate-y-1"
                >
                    <Plus className="w-4 h-4" />
                    Nova Solicitação Manual
                </button>
            </div>

            {/* CREATE MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="bg-brand-gray-900 px-6 py-4 flex justify-between items-center text-white">
                            <h3 className="font-bold text-lg">Nova Demanda</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-brand-gray-400 hover:text-white"><X size={20}/></button>
                        </div>
                        
                        <form onSubmit={handleCreateDemand} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-brand-gray-700 mb-1">Cliente / EC *</label>
                                <input 
                                    required
                                    className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                                    placeholder="Nome do estabelecimento"
                                    value={newDemand.clientName}
                                    onChange={e => setNewDemand({...newDemand, clientName: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-brand-gray-700 mb-1">Tipo de Demanda *</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-brand-gray-400" />
                                    <select 
                                        required
                                        className="w-full border border-brand-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-brand-primary outline-none bg-white appearance-none"
                                        value={newDemand.type}
                                        onChange={e => setNewDemand({...newDemand, type: e.target.value})}
                                    >
                                        {/* Priority Options First */}
                                        <optgroup label="Produtos Principais">
                                            <option value="Venda Taxa Full">⭐ Venda Taxa Full (Antecipado)</option>
                                            <option value="Venda Taxa Simples">⭐ Venda Taxa Simples</option>
                                        </optgroup>
                                        <optgroup label="Outras Solicitações">
                                            {demandTypes.filter(t => t !== 'Venda Taxa Full' && t !== 'Venda Taxa Simples').map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-brand-gray-400 pointer-events-none" />
                                </div>
                                <p className="text-xs text-brand-gray-500 mt-1">Selecione o produto ou serviço a ser solicitado.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-brand-gray-700 mb-1">Descrição / Observações</label>
                                <textarea 
                                    className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none resize-none h-24"
                                    placeholder="Detalhe a solicitação..."
                                    value={newDemand.description}
                                    onChange={e => setNewDemand({...newDemand, description: e.target.value})}
                                />
                            </div>

                            <button 
                                type="submit" 
                                className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold mt-4 hover:bg-brand-dark transition-colors flex items-center justify-center gap-2 shadow-md"
                            >
                                <Save className="w-4 h-4" />
                                Criar Solicitação
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResultadosPage;
