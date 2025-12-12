
import React, { useState, useEffect } from 'react';
import { 
    LifeBuoy, Search, MessageSquare, BookOpen, Plus, Save, Trash2, 
    CheckCircle2, Clock, User
} from 'lucide-react';
import { appStore } from '../services/store';
import { SupportTicket, KnowledgeBaseItem } from '../types';

const LogisticaSuportePage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'TICKETS' | 'KB'>('TICKETS');
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [kbItems, setKbItems] = useState<KnowledgeBaseItem[]>([]);
    
    // KB Form
    const [newKb, setNewKb] = useState({ errorPattern: '', solution: '', keywords: '' });

    useEffect(() => {
        setTickets(appStore.getSupportTickets());
        setKbItems(appStore.getKnowledgeBase());
    }, []);

    const handleAddKb = () => {
        if (!newKb.errorPattern || !newKb.solution) return;
        const item: KnowledgeBaseItem = {
            id: Math.random().toString(),
            errorPattern: newKb.errorPattern,
            solution: newKb.solution,
            keywords: newKb.keywords.split(',').map(k => k.trim())
        };
        appStore.addKbItem(item);
        setKbItems([...kbItems, item]);
        setNewKb({ errorPattern: '', solution: '', keywords: '' });
        alert("Adicionado à base de conhecimento da IA!");
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <LifeBuoy className="w-8 h-8 text-brand-primary" />
                        Gestão de Suporte & IA
                    </h1>
                    <p className="text-brand-gray-600 mt-1">Gerencie chamados e treine a IA para resoluções automáticas.</p>
                </div>
                <div className="flex bg-brand-gray-200 p-1 rounded-xl">
                    <button onClick={() => setActiveTab('TICKETS')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'TICKETS' ? 'bg-white text-brand-primary shadow' : 'text-gray-600'}`}>Chamados</button>
                    <button onClick={() => setActiveTab('KB')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'KB' ? 'bg-white text-brand-primary shadow' : 'text-gray-600'}`}>Base de Conhecimento (IA)</button>
                </div>
            </header>

            {activeTab === 'TICKETS' && (
                <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden">
                    <div className="p-4 bg-brand-gray-50 border-b border-brand-gray-100 font-bold text-sm text-gray-700">
                        Fila de Atendimento
                    </div>
                    <div className="divide-y divide-brand-gray-100">
                        {tickets.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">Nenhum chamado aberto.</div>
                        ) : (
                            tickets.map(ticket => (
                                <div key={ticket.id} className="p-4 hover:bg-brand-gray-50 flex justify-between items-center">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-mono text-xs bg-gray-100 px-2 rounded text-gray-600">{ticket.id}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${ticket.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{ticket.status}</span>
                                        </div>
                                        <h4 className="font-bold text-gray-900">{ticket.clientName}</h4>
                                        <p className="text-xs text-gray-500">Solicitante: {ticket.requesterName} ({ticket.requesterRole})</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                                        <button className="mt-2 text-xs bg-brand-primary text-white px-3 py-1 rounded hover:bg-brand-dark">Ver Chat</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'KB' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* List */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden">
                        <div className="p-4 bg-brand-gray-50 border-b border-brand-gray-100 font-bold text-sm text-gray-700 flex items-center gap-2">
                            <BookOpen className="w-4 h-4"/> Padrões Cadastrados
                        </div>
                        <div className="divide-y divide-brand-gray-100">
                            {kbItems.map(item => (
                                <div key={item.id} className="p-4 hover:bg-brand-gray-50">
                                    <h4 className="font-bold text-brand-primary text-sm mb-1">{item.errorPattern}</h4>
                                    <p className="text-xs text-gray-600 mb-2">{item.solution}</p>
                                    <div className="flex gap-2">
                                        {item.keywords.map(k => (
                                            <span key={k} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded">#{k}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Form */}
                    <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 p-6 h-fit">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Plus className="w-4 h-4"/> Nova Solução</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Padrão de Erro</label>
                                <input className="w-full border rounded p-2 text-sm" placeholder="Ex: Erro 05 - Não Autorizada" value={newKb.errorPattern} onChange={e => setNewKb({...newKb, errorPattern: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Solução (Passo a Passo)</label>
                                <textarea className="w-full border rounded p-2 text-sm h-24" placeholder="Descreva como resolver..." value={newKb.solution} onChange={e => setNewKb({...newKb, solution: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Palavras-chave (IA)</label>
                                <input className="w-full border rounded p-2 text-sm" placeholder="erro, cartão, negada..." value={newKb.keywords} onChange={e => setNewKb({...newKb, keywords: e.target.value})} />
                            </div>
                            <button onClick={handleAddKb} className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 flex items-center justify-center gap-2">
                                <Save className="w-4 h-4"/> Salvar na IA
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LogisticaSuportePage;
