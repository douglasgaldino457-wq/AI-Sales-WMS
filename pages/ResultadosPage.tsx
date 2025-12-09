
import React, { useState, useEffect } from 'react';
import { 
    ClipboardCheck, Clock, CheckCircle2, AlertTriangle, Search, FileText, ArrowRight,
    Briefcase, Calendar, ChevronDown, Plus, X, Save, Share2, MessageCircle, FileInput,
    Download, ChevronUp, User
} from 'lucide-react';
import { appStore } from '../services/store';
import { ManualDemand } from '../types';
import { Page } from '../types';

const ResultadosPage: React.FC<{ currentUser?: string }> = ({ currentUser = 'Eu' }) => {
    const [demands, setDemands] = useState<ManualDemand[]>([]);
    const [filterStatus, setFilterStatus] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedDemandId, setExpandedDemandId] = useState<string | null>(null);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [demandTypes, setDemandTypes] = useState<string[]>([]);
    const [newDemand, setNewDemand] = useState<Partial<ManualDemand>>({
        clientName: '',
        type: '', 
        description: '',
    });

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = () => {
        // Sort by date desc
        const sorted = appStore.getDemands().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setDemands(sorted);
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
            case 'Aprovado Pricing': return 'bg-purple-100 text-purple-700 border-purple-200';
            default: return 'bg-gray-100 text-gray-700';
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
            requester: currentUser
        };

        appStore.addDemand(demand);
        refreshData();
        setIsModalOpen(false);
        setNewDemand({ clientName: '', type: '', description: '' });
    };

    // --- Action Handlers for Approved Deals ---
    const handleGeneratePDF = (demand: ManualDemand) => {
        alert(`Gerando PDF da proposta para ${demand.clientName}... (Simulado)`);
    };

    const handleWhatsAppShare = (demand: ManualDemand) => {
        const approved = demand.pricingData?.approvedRates;
        const msg = `Olá! Tenho ótimas notícias. A diretoria aprovou condições especiais para a *${demand.clientName}*! 🎉\n\n` +
                    `✅ *Débito:* ${approved?.debit.toFixed(2)}%\n` +
                    `✅ *Crédito 1x:* ${approved?.credit1x.toFixed(2)}%\n` +
                    `✅ *Crédito 12x:* ${approved?.credit12x.toFixed(2)}%\n\n` +
                    `Podemos seguir com o fechamento?`;
        
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleMoveToCadastro = (demand: ManualDemand) => {
        if (confirm(`O cliente aceitou a proposta?\n\nIsso irá concluir a demanda e iniciar o cadastro.`)) {
            const updated: ManualDemand = {
                ...demand,
                status: 'Concluído',
                result: 'Cliente aceitou proposta. Enviado para cadastro.'
            };
            appStore.updateDemand(updated);
            refreshData();
            // Simulate navigation
            alert("Redirecionando para Módulo de Cadastro (Em Construção)...");
        }
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <ClipboardCheck className="w-8 h-8 text-brand-primary" />
                        Minhas Solicitações
                    </h1>
                    <p className="text-brand-gray-600 mt-1">Acompanhe o status das suas negociações e demandas.</p>
                </div>
                
                <div className="flex gap-2">
                    <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-brand-gray-100 flex flex-col items-center min-w-[90px]">
                        <span className="text-[10px] text-brand-gray-400 font-bold uppercase">Total</span>
                        <span className="text-xl font-bold text-brand-gray-900">{demands.length}</span>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-brand-gray-100 flex flex-col items-center min-w-[90px]">
                        <span className="text-[10px] text-purple-600 font-bold uppercase">Aprovadas</span>
                        <span className="text-xl font-bold text-purple-600">{demands.filter(d => d.status === 'Aprovado Pricing').length}</span>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-brand-gray-100 flex flex-col items-center min-w-[90px]">
                        <span className="text-[10px] text-green-600 font-bold uppercase">Fechadas</span>
                        <span className="text-xl font-bold text-green-600">{demands.filter(d => d.status === 'Concluído').length}</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden animate-fade-in min-h-[500px] flex flex-col">
                {/* Filter Toolbar */}
                <div className="p-4 border-b border-brand-gray-100 bg-brand-gray-50/50 flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-10 backdrop-blur-sm">
                    <div className="relative w-full md:w-80">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar demanda..." 
                            className="w-full pl-10 pr-4 py-2 border border-brand-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                        {['Todos', 'Aprovado Pricing', 'Pendente', 'Concluído'].map(status => (
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
                <div className="flex-1 bg-brand-gray-50/30">
                    {filteredDemands.length === 0 ? (
                        <div className="p-12 text-center text-brand-gray-400 flex flex-col items-center mt-10">
                            <FileText className="w-12 h-12 mb-3 opacity-20" />
                            <p>Nenhuma demanda encontrada.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-brand-gray-100">
                            {filteredDemands.map(demand => {
                                const isPricingApproved = demand.status === 'Aprovado Pricing';
                                const isExpanded = expandedDemandId === demand.id;

                                return (
                                    <div key={demand.id} className={`transition-all bg-white ${isPricingApproved ? 'border-l-4 border-l-purple-500' : ''}`}>
                                        {/* Header Row */}
                                        <div 
                                            onClick={() => setExpandedDemandId(isExpanded ? null : demand.id)}
                                            className="p-5 cursor-pointer hover:bg-brand-gray-50 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center"
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={`p-3 rounded-full shrink-0 ${
                                                    demand.type.includes('Taxa') ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                                                }`}>
                                                    {demand.type.includes('Taxa') ? <Briefcase className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-mono text-[10px] text-brand-gray-400 bg-brand-gray-100 px-1.5 py-0.5 rounded">
                                                            {demand.id}
                                                        </span>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1 border ${getStatusColor(demand.status)}`}>
                                                            {demand.status}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-bold text-brand-gray-900 text-base">{demand.clientName}</h3>
                                                    <p className="text-xs text-brand-gray-500 mt-0.5">{demand.type}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 text-right w-full md:w-auto justify-between md:justify-end">
                                                <div className="text-xs text-brand-gray-500">
                                                    <div className="flex items-center gap-1 justify-end"><Calendar className="w-3 h-3" /> {new Date(demand.date).toLocaleDateString()}</div>
                                                    {demand.result && <div className="text-green-600 font-bold mt-1 text-[10px] max-w-[150px] truncate">{demand.result}</div>}
                                                </div>
                                                <button className="text-brand-gray-400 hover:text-brand-primary transition-colors">
                                                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded Details / Action Panel */}
                                        {isExpanded && (
                                            <div className="px-5 pb-5 pt-0 animate-fade-in">
                                                <div className="pl-16">
                                                    <div className="bg-brand-gray-50 p-4 rounded-xl border border-brand-gray-100 text-sm text-brand-gray-700 mb-4">
                                                        <p className="font-bold text-xs uppercase text-brand-gray-400 mb-1">Descrição</p>
                                                        <p>{demand.description || 'Sem descrição.'}</p>
                                                    </div>

                                                    {/* SPECIAL UI FOR APPROVED PRICING */}
                                                    {isPricingApproved && demand.pricingData?.approvedRates && (
                                                        <div className="bg-purple-50 border border-purple-100 rounded-xl p-5 mb-4 relative overflow-hidden">
                                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                                <Briefcase size={80} className="text-purple-600" />
                                                            </div>
                                                            
                                                            <h4 className="font-bold text-purple-900 text-lg mb-4 flex items-center gap-2">
                                                                <CheckCircle2 className="w-5 h-5 text-purple-600" />
                                                                Proposta Aprovada
                                                            </h4>

                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 relative z-10">
                                                                <div className="bg-white p-3 rounded-lg shadow-sm border border-purple-100 text-center">
                                                                    <span className="block text-xs text-purple-600 font-bold uppercase">Débito</span>
                                                                    <span className="block text-xl font-bold text-brand-gray-900">{demand.pricingData.approvedRates.debit.toFixed(2)}%</span>
                                                                </div>
                                                                <div className="bg-white p-3 rounded-lg shadow-sm border border-purple-100 text-center">
                                                                    <span className="block text-xs text-purple-600 font-bold uppercase">Crédito 1x</span>
                                                                    <span className="block text-xl font-bold text-brand-gray-900">{demand.pricingData.approvedRates.credit1x.toFixed(2)}%</span>
                                                                </div>
                                                                <div className="bg-white p-3 rounded-lg shadow-sm border border-purple-100 text-center">
                                                                    <span className="block text-xs text-purple-600 font-bold uppercase">Crédito 12x</span>
                                                                    <span className="block text-xl font-bold text-brand-gray-900">{demand.pricingData.approvedRates.credit12x.toFixed(2)}%</span>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                                                                <button 
                                                                    onClick={() => handleGeneratePDF(demand)}
                                                                    className="flex-1 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                                                                >
                                                                    <Download className="w-4 h-4" /> Baixar PDF
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleWhatsAppShare(demand)}
                                                                    className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                                                                >
                                                                    <MessageCircle className="w-4 h-4" /> Enviar WhatsApp
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleMoveToCadastro(demand)}
                                                                    className="flex-[1.5] bg-brand-gray-900 hover:bg-black text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg"
                                                                >
                                                                    <User className="w-4 h-4" /> Cliente Aceitou (Cadastro)
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
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
                                        <option value="">Selecione o tipo...</option>
                                        {demandTypes.filter(t => !t.includes('Taxa')).map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-brand-gray-400 pointer-events-none" />
                                </div>
                                <p className="text-xs text-brand-gray-500 mt-1">
                                    Para <strong>Negociação de Taxas</strong>, utilize o módulo de Pricing.
                                </p>
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
