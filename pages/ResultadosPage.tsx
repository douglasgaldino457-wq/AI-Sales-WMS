import React, { useState, useEffect, useRef } from 'react';
import { 
    ClipboardCheck, Clock, CheckCircle2, AlertTriangle, Search, FileText, ArrowRight,
    Briefcase, Calendar, ChevronDown, Plus, X, Save, Share2, MessageCircle, FileInput,
    Download, ChevronUp, User, Laptop2, Terminal, Table, Percent, Building2, Printer, Eye
} from 'lucide-react';
import { appStore } from '../services/store';
import { ManualDemand, RegistrationRequest, ClientBaseRow } from '../types';
import { Page } from '../types';
import { PagmotorsLogo } from '../components/Logo';

// --- NEW COMPONENT: PROPOSAL PREVIEW MODAL (Similar to PricingPage Range) ---
const ProposalPreviewModal: React.FC<{ demand: ManualDemand; onClose: () => void }> = ({ demand, onClose }) => {
    const printRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    if (!demand.pricingData?.approvedRates) return null;
    const rates = demand.pricingData.approvedRates;
    const plan = demand.description?.toLowerCase().includes('simples') ? 'Simples' : 'Full';

    const generateImage = async () => {
        if (!printRef.current) return;
        setIsGenerating(true);
        try {
            // @ts-ignore
            const html2canvas = window.html2canvas;
            if (!html2canvas) { alert("Libs não carregadas."); return; }
            const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', width: 794, height: 1123, windowWidth: 1200 });
            const link = document.createElement('a');
            link.download = `Proposta_Aprovada_${demand.clientName}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch(e) { console.error(e); alert("Erro ao gerar."); }
        finally { setIsGenerating(false); }
    };

    const sendWhatsApp = () => {
        const text = `Olá! Segue a proposta aprovada para *${demand.clientName}*:\n\n` +
            `✅ *Débito:* ${rates.debit.toFixed(2)}%\n` +
            `✅ *Crédito 1x:* ${rates.credit1x.toFixed(2)}%\n` +
            `✅ *Crédito 12x:* ${rates.credit12x.toFixed(2)}%\n\n` +
            `Qualquer dúvida estou à disposição!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col relative max-h-[90vh]">
                <div className="bg-brand-gray-900 px-6 py-4 flex justify-between items-center text-white shrink-0 rounded-t-2xl">
                    <h3 className="font-bold text-lg flex items-center gap-2"><FileText className="w-5 h-5"/> Proposta Aprovada</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto bg-gray-100 p-6 flex justify-center">
                    {/* VISUAL PROPOSAL TEMPLATE */}
                    <div ref={printRef} className="bg-white shadow-lg w-[210mm] min-h-[297mm] flex flex-col relative scale-[0.6] md:scale-[0.7] origin-top transform-gpu">
                        <div className="bg-gradient-to-r from-brand-primary to-brand-dark h-32 flex items-center justify-between px-12">
                            <div className="scale-110"><PagmotorsLogo variant="white" /></div>
                            <div className="text-right text-white">
                                <h2 className="text-2xl font-bold uppercase tracking-widest">Proposta Comercial</h2>
                                <p className="text-sm opacity-80">Condições Especiais Aprovadas</p>
                            </div>
                        </div>
                        <div className="p-12 flex-1 flex flex-col gap-8">
                            <div>
                                <div className="inline-block px-4 py-1 rounded-full bg-green-100 text-green-800 font-bold text-xs uppercase mb-2">Plano {plan}</div>
                                <h1 className="text-4xl font-bold text-gray-900">{demand.clientName}</h1>
                                <p className="text-gray-500 mt-2">Proposta válida por 5 dias.</p>
                            </div>

                            <div className="border rounded-xl overflow-hidden">
                                <div className="bg-brand-gray-900 text-white font-bold text-xs uppercase p-4 flex justify-between">
                                    <span>Modalidade</span><span>Taxa Final</span>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    <div className="p-4 flex justify-between font-bold text-sm bg-gray-50">
                                        <span>Débito</span><span>{rates.debit.toFixed(2)}%</span>
                                    </div>
                                    <div className="p-4 flex justify-between font-bold text-sm">
                                        <span>Crédito à Vista (1x)</span><span>{rates.credit1x.toFixed(2)}%</span>
                                    </div>
                                    {plan === 'Full' && Array.from({length: 11}).map((_, i) => {
                                        const steps = 11;
                                        const stepVal = (rates.credit12x - rates.credit1x) / steps;
                                        const val = rates.credit1x + (stepVal * (i+1));
                                        return (
                                            <div key={i} className="p-4 flex justify-between text-sm">
                                                <span>Crédito {i+2}x</span><span>{val.toFixed(2)}%</span>
                                            </div>
                                        );
                                    })}
                                    {plan === 'Simples' && (
                                        <>
                                            <div className="p-4 flex justify-between text-sm"><span>Crédito 2x - 6x</span><span>{(rates.credit1x + 1.5).toFixed(2)}%</span></div>
                                            <div className="p-4 flex justify-between text-sm"><span>Crédito 7x - 12x</span><span>{rates.credit12x.toFixed(2)}%</span></div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-100 p-6 text-center text-xs text-gray-500 font-bold uppercase tracking-wider">
                            CAR10 TECNOLOGIA E INFORMAÇÃO S/A
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-white rounded-b-2xl flex justify-end gap-3">
                    <button onClick={sendWhatsApp} className="px-6 py-2 bg-[#25D366] text-white font-bold rounded-lg hover:bg-[#128C7E] flex items-center gap-2 shadow-sm">
                        <MessageCircle size={18} /> Enviar WhatsApp
                    </button>
                    <button onClick={generateImage} disabled={isGenerating} className="px-6 py-2 bg-brand-gray-900 text-white font-bold rounded-lg hover:bg-black flex items-center gap-2 shadow-sm disabled:opacity-50">
                        <Download size={18} /> {isGenerating ? 'Gerando...' : 'Baixar Imagem'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ResultadosPage: React.FC<{ currentUser?: string }> = ({ currentUser = 'Eu' }) => {
    const [demands, setDemands] = useState<ManualDemand[]>([]);
    const [filterStatus, setFilterStatus] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedDemandId, setExpandedDemandId] = useState<string | null>(null);
    
    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProposalDemand, setSelectedProposalDemand] = useState<ManualDemand | null>(null); // For Preview Modal
    
    const [demandTypes, setDemandTypes] = useState<string[]>([]);
    const [newDemand, setNewDemand] = useState<Partial<ManualDemand>>({
        clientName: '',
        type: '', 
        description: '',
    });

    // Client Autocomplete State
    const [allClients, setAllClients] = useState<ClientBaseRow[]>([]);
    const [suggestions, setSuggestions] = useState<ClientBaseRow[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchWrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        refreshData();
        setAllClients(appStore.getClients()); // Load clients for search

        // Close suggestions on click outside
        const handleClickOutside = (event: MouseEvent) => {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
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

    const handleConcludeAction = (demand: ManualDemand) => {
        const actionType = demand.type.includes('Taxa') ? 'Cadastro de Taxas' : demand.type;
        
        if (confirm(`Confirmar execução de "${actionType}" no sistema SIC?\n\nEssa ação será registrada no histórico do cliente.`)) {
            let details = 'Demanda concluída.';
            
            if (demand.pricingData?.approvedRates) {
                const r = demand.pricingData.approvedRates;
                details = `Taxas cadastradas no SIC: Débito ${r.debit}%, 1x ${r.credit1x}%, 12x ${r.credit12x}%.`;
            } else {
                details = demand.description || 'Solicitação processada com sucesso.';
            }

            appStore.concludeDemand(demand.id, details, currentUser);
            refreshData();
            alert("Sucesso! Demanda concluída e registrada no histórico do cliente.");
        }
    };

    const handleClientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setNewDemand({...newDemand, clientName: val});
        
        if (val.length > 1) {
            const matches = allClients.filter(c => 
                c.nomeEc.toLowerCase().includes(val.toLowerCase()) || 
                c.id.toLowerCase().includes(val.toLowerCase())
            ).slice(0, 5);
            setSuggestions(matches);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    const selectClient = (client: ClientBaseRow) => {
        setNewDemand({
            ...newDemand, 
            clientName: client.nomeEc
        });
        setShowSuggestions(false);
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
                                            className="p-5 cursor-pointer hover:bg-brand-gray-50 transition-colors flex flex-col md:flex-row gap-4 justify-between items-start md:items-center"
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
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h4 className="font-bold text-purple-900 text-lg flex items-center gap-2">
                                                                    <Terminal className="w-5 h-5 text-purple-600" />
                                                                    Execução de Cadastro (SIC)
                                                                </h4>
                                                                
                                                                {/* NEW: VIEW PROPOSAL BUTTON */}
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); setSelectedProposalDemand(demand); }}
                                                                    className="bg-white hover:bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1.5 rounded border border-purple-200 flex items-center gap-2 shadow-sm transition-colors"
                                                                >
                                                                    <Eye className="w-4 h-4" /> Ver Proposta Aprovada
                                                                </button>
                                                            </div>

                                                            {/* Approval Metadata */}
                                                            {demand.pricingData.approvalMetadata && (
                                                                <div className="text-[10px] text-purple-800 mb-3 bg-purple-100/50 p-2 rounded border border-purple-200 inline-block">
                                                                    Aprovado por: <strong>{demand.pricingData.approvalMetadata.approvedBy}</strong> em {new Date(demand.pricingData.approvalMetadata.approvedAt).toLocaleString()}
                                                                </div>
                                                            )}

                                                            <div className="flex flex-col sm:flex-row gap-3">
                                                                {/* MAIN ACTION: CONCLUDE AND LOG HISTORY */}
                                                                <button 
                                                                    onClick={() => handleConcludeAction(demand)}
                                                                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg transform hover:-translate-y-0.5"
                                                                >
                                                                    <CheckCircle2 className="w-5 h-5" /> 
                                                                    Confirmar Cadastro no SIC
                                                                </button>
                                                            </div>
                                                            <p className="text-[10px] text-purple-700/70 mt-3 text-center">
                                                                * Ao confirmar, a alteração será registrada automaticamente no histórico do cliente.
                                                            </p>
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
                            <div className="relative" ref={searchWrapperRef}>
                                <label className="block text-sm font-bold text-brand-gray-700 mb-1">Cliente / EC *</label>
                                <div className="relative">
                                    <input 
                                        required
                                        className="w-full border border-brand-gray-300 rounded-lg pl-3 pr-10 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                                        placeholder="Nome do estabelecimento"
                                        value={newDemand.clientName}
                                        onChange={handleClientNameChange}
                                        onFocus={() => {
                                            if (newDemand.clientName && newDemand.clientName.length > 1) setShowSuggestions(true);
                                        }}
                                    />
                                    {showSuggestions && (
                                        <div className="absolute z-50 w-full bg-white border border-brand-gray-200 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto">
                                            {suggestions.length > 0 ? (
                                                suggestions.map(client => (
                                                    <div 
                                                        key={client.id}
                                                        className="px-4 py-2 hover:bg-brand-gray-50 cursor-pointer border-b border-brand-gray-50 last:border-0 flex justify-between items-center"
                                                        onClick={() => selectClient(client)}
                                                    >
                                                        <div>
                                                            <p className="text-sm font-bold text-brand-gray-800">{client.nomeEc}</p>
                                                            <p className="text-xs text-brand-gray-500">{client.endereco}</p>
                                                        </div>
                                                        <span className="text-[10px] bg-brand-gray-100 text-brand-gray-600 px-1.5 py-0.5 rounded font-mono">
                                                            ID: {client.id}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-4 py-3 text-xs text-gray-500 text-center">Nenhum cliente encontrado</div>
                                            )}
                                        </div>
                                    )}
                                </div>
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

            {/* APPROVED PROPOSAL MODAL */}
            {selectedProposalDemand && (
                <ProposalPreviewModal 
                    demand={selectedProposalDemand} 
                    onClose={() => setSelectedProposalDemand(null)} 
                />
            )}
        </div>
    );
};

export default ResultadosPage;