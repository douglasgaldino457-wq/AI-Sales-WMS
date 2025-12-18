
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    Upload, CheckCircle2, Search, X, User, MapPin, Phone, 
    ClipboardList, LayoutList, Target, LifeBuoy, Settings, 
    BadgePercent, RefreshCw, Network, ArrowRight, Server, 
    FileCheck, Database, Eye, FileSpreadsheet, DollarSign, 
    Building2, CreditCard, Sparkles, Filter, MoreHorizontal, TrendingUp, Mail,
    Calendar, History, Clock, MessageSquare, AlertCircle, Plus, Loader2, Package, Check,
    ChevronRight, PlusCircle, Headphones
} from 'lucide-react';
import { UserRole, ClientBaseRow, ClientNote, Page, Appointment, VisitOutcome, VisitPeriod } from '../types';
import { appStore } from '../services/store';
import { useAppStore } from '../services/useAppStore'; 
import { SupportChatModal } from '../components/SupportChatModal';
import { PagmotorsLogo, Logo } from '../components/Logo';

interface BaseClientesPageProps {
  role: UserRole;
}

// --- UNIFIED CLIENT MODAL (FICHA COMPLETA + PAGMOTORS) ---
const UnifiedClientModal: React.FC<{ 
    client: ClientBaseRow; 
    onClose: () => void;
    onAddNote: (note: string) => void;
    historyItems: any[];
    refCode?: string;
}> = ({ client, onClose, onAddNote, historyItems, refCode }) => {
    const { navigate, currentUser, userRole } = useAppStore();
    const [newNote, setNewNote] = useState('');
    const [showSupportChat, setShowSupportChat] = useState(false);
    const [rateTab, setRateTab] = useState<'Full' | 'Simples'>('Full');

    const hasPagmotors = !!client.hasPagmotors;
    const isLead = client.status === 'Lead';

    // Determinar faixa de TPV (ou Balcão por padrão)
    const tpvRangeId = client.leadMetadata?.revenuePotential 
        ? client.leadMetadata.revenuePotential > 150000 ? 6 : 0 // Lógica simplificada de match de faixa
        : 0;

    const rateConfig = appStore.getRateRangesConfig();
    
    const getRatesForDisplay = () => {
        if (rateTab === 'Full') {
            const data = rateConfig.full[tpvRangeId] || rateConfig.full[0];
            const rows = [
                { label: 'Débito', value: data.debit },
                { label: 'Crédito 1x', value: data.credit1x }
            ];
            data.installments.forEach((val: number, idx: number) => {
                rows.push({ label: `Crédito ${idx + 2}x`, value: val });
            });
            return rows;
        } else {
            const data = rateConfig.simples[tpvRangeId] || rateConfig.simples[0];
            return [
                { label: 'Débito', value: data.debit },
                { label: 'Crédito 1x', value: data.credit1x },
                { label: 'Crédito 2x-6x', value: data.credit2x6x },
                { label: 'Crédito 7x-12x', value: data.credit7x12x },
                { label: 'Crédito 13x-18x', value: data.credit13x18x }
            ];
        }
    };

    const currentRates = getRatesForDisplay();

    return (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden relative max-h-[95vh] flex flex-col border border-white/20">
                
                <div className="bg-brand-gray-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className={`${!hasPagmotors ? 'grayscale opacity-30' : 'drop-shadow-glow'} transition-all duration-700`}>
                            <PagmotorsLogo variant="brand-white" className="scale-90" />
                        </div>
                        <div className="w-px h-8 bg-white/10 mx-1"></div>
                        <div>
                            <h2 className="text-lg font-bold leading-tight">{client.nomeEc}</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="bg-white/10 px-2 py-0.5 rounded text-[9px] text-brand-gray-300 font-mono">
                                    {isLead ? `REF: ${refCode || 'NOVO'}` : `ID: ${client.id}`}
                                </span>
                                {hasPagmotors && (
                                    <span className="flex items-center gap-1 text-[8px] font-bold text-green-400 uppercase tracking-wider bg-green-400/10 px-2 py-0.5 rounded-full">
                                        <Check size={8}/> Ativo
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2 mr-4 pr-4 border-r border-white/10">
                            <button onClick={() => navigate(Page.PEDIDOS_RASTREIO, client.id)} className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary hover:bg-brand-dark rounded-lg text-[11px] font-bold transition-all"><PlusCircle size={14}/> Nova Solicitação</button>
                            <button onClick={() => setShowSupportChat(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[11px] font-bold transition-all border border-white/10"><Headphones size={14}/> Suporte</button>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-white p-2 hover:bg-white/5 rounded-full transition-colors"><X size={24}/></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-brand-gray-50/30">
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-5 space-y-6">
                            <div className="bg-white p-6 rounded-2xl border border-brand-gray-100 shadow-sm">
                                <h4 className="text-xs font-bold text-brand-gray-400 uppercase mb-5 flex items-center gap-2"><Building2 className="w-4 h-4 text-brand-primary" /> Ficha Cadastral & Bancária</h4>
                                <div className="space-y-5 text-sm">
                                    <div><span className="block text-[10px] text-brand-gray-400 font-bold uppercase mb-1">Razão Social / Nome EC</span><span className="text-brand-gray-900 font-bold text-base">{client.nomeEc}</span></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><span className="block text-[10px] text-brand-gray-400 font-bold uppercase mb-1">CNPJ</span><span className="text-brand-gray-900 font-mono font-medium">{client.cnpj || '---'}</span></div>
                                        <div><span className="block text-[10px] text-brand-gray-400 font-bold uppercase mb-1">Field Sales</span><span className="text-brand-primary font-bold">{client.fieldSales}</span></div>
                                    </div>
                                    <div className="pt-4 border-t border-brand-gray-50">
                                        <span className="block text-[10px] text-brand-gray-400 font-bold uppercase mb-3 flex items-center gap-2"><CreditCard size={12} className="text-brand-primary"/> Domicílio Bancário</span>
                                        <div className="grid grid-cols-3 gap-4 bg-brand-gray-50 p-3 rounded-xl border border-brand-gray-100">
                                            <div><p className="text-gray-400 font-bold uppercase text-[9px]">Banco</p><p className="font-bold text-brand-gray-800 text-[11px] truncate">{client.historicalBank?.bank || '341 - Itaú'}</p></div>
                                            <div><p className="text-gray-400 font-bold uppercase text-[9px]">Agência</p><p className="font-bold text-brand-gray-800 text-[11px]">{client.historicalBank?.agency || '0001'}</p></div>
                                            <div><p className="text-gray-400 font-bold uppercase text-[9px]">Conta</p><p className="font-bold text-brand-gray-800 text-[11px] font-mono">{client.historicalBank?.account || '00000-0'}</p></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-7 flex flex-col h-full min-h-0">
                            <div className="bg-white rounded-2xl border border-brand-gray-100 shadow-sm flex-1 flex flex-col overflow-hidden">
                                <div className="p-4 bg-brand-gray-50 border-b border-brand-gray-100 flex justify-between items-center">
                                    <h4 className="text-xs font-extrabold uppercase flex items-center gap-2 text-brand-gray-700"><DollarSign className="w-4 h-4 text-brand-primary" /> Taxas Pagmotors (Ref: {appStore.TPV_RANGES[tpvRangeId].label})</h4>
                                    <div className="flex bg-brand-gray-200 p-0.5 rounded-lg">
                                        <button onClick={() => setRateTab('Full')} className={`px-4 py-1 text-[10px] font-black uppercase rounded-md transition-all ${rateTab === 'Full' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-500'}`}>Full</button>
                                        <button onClick={() => setRateTab('Simples')} className={`px-4 py-1 text-[10px] font-black uppercase rounded-md transition-all ${rateTab === 'Simples' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-500'}`}>Simples</button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto">
                                    <table className="w-full text-[11px] border-collapse">
                                        <thead className="sticky top-0 bg-brand-gray-900 text-white z-10">
                                            <tr>
                                                <th className="px-4 py-2 text-left border-b border-white/10 uppercase">Modalidade</th>
                                                <th className="px-4 py-2 text-right border-b border-white/10 uppercase">Taxa %</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-brand-gray-100">
                                            {currentRates.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-brand-gray-50 transition-colors">
                                                    <td className="px-4 py-2.5 font-bold text-brand-gray-700">{row.label}</td>
                                                    <td className="px-4 py-2.5 text-right font-mono font-black text-brand-primary">{row.value.toFixed(2)}%</td>
                                                </tr>
                                            ))}
                                            {rateTab === 'Simples' && (
                                                <tr className="bg-brand-primary/5">
                                                    <td className="px-4 py-2.5 font-black text-brand-primary uppercase">Tx Antecipação</td>
                                                    <td className="px-4 py-2.5 text-right font-black text-brand-gray-900">3.95% a.m</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-white border-t border-brand-gray-100 shrink-0 flex gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
                    <div className="flex-1 relative">
                        <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray-400" />
                        <input type="text" className="w-full border border-brand-gray-300 rounded-xl pl-10 pr-3 py-3 text-sm outline-none bg-brand-gray-50/50 focus:bg-white focus:ring-2 focus:ring-brand-primary/10 transition-all" placeholder="Adicionar nota rápida na ficha..." value={newNote} onChange={(e) => setNewNote(e.target.value)} />
                    </div>
                    <button onClick={() => { if(newNote.trim()) { onAddNote(newNote); setNewNote(''); } }} className="bg-brand-gray-900 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-black transition-colors shadow-lg">Salvar Nota</button>
                </div>
            </div>
            <SupportChatModal isOpen={showSupportChat} onClose={() => setShowSupportChat(false)} clientName={client.nomeEc} clientId={client.id} currentUser={currentUser?.name || 'Consultor'} currentRole={userRole || 'Usuário'} />
        </div>
    );
};

// --- PÁGINA PRINCIPAL ---
const BaseClientesPage: React.FC<BaseClientesPageProps> = ({ role }) => {
  const { navigate, currentUser } = useAppStore(); 
  const [data, setData] = useState<ClientBaseRow[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeTab, setActiveTab] = useState<'CARTEIRA' | 'LEADS'>('CARTEIRA');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientBaseRow | null>(null);
  const [historyItems, setHistoryItems] = useState<any[]>([]);

  const isPortfolioMode = role === UserRole.FIELD_SALES || role === UserRole.INSIDE_SALES;

  useEffect(() => { loadData(); }, [role, currentUser]);

  const loadData = () => {
      const allClients = appStore.getClients();
      const allAppts = appStore.getAppointments();
      setAppointments(allAppts);
      if (isPortfolioMode && currentUser) {
          const filtered = allClients.filter(c => {
              if (role === UserRole.FIELD_SALES) return c.fieldSales === currentUser.name;
              if (role === UserRole.INSIDE_SALES) return c.insideSales === currentUser.name;
              return false;
          });
          setData(filtered);
      } else { setData(allClients); }
  };

  const filteredData = useMemo(() => {
      const searchLower = searchTerm.toLowerCase();
      return data.filter(client => {
          if (activeTab === 'CARTEIRA') { return client.status !== 'Lead'; }
          else {
              const clientAppts = appointments.filter(a => a.clientId === client.id && a.status === 'Completed');
              const isLead = client.status === 'Lead';
              const outcome = client.leadMetadata?.outcome;
              return isLead || (outcome && outcome !== 'Convertido');
          }
      }).filter(client => {
          const relatedAppt = appointments.find(a => a.clientId === client.id);
          return client.nomeEc.toLowerCase().includes(searchLower) || client.cnpj?.toLowerCase().includes(searchLower) || (relatedAppt && relatedAppt.id.toLowerCase().includes(searchLower));
      });
  }, [data, activeTab, searchTerm, appointments]);

  const handleOpenFicha = (client: ClientBaseRow) => {
    setSelectedClient(client);
    const clientAppts = appStore.getAppointments().filter(a => a.clientId === client.id);
    const notes = appStore.getClientNotes(client.id);
    const combined = [...clientAppts.map(a => ({ type: 'appointment', data: a, date: a.date || '9999-99-99' })), ...notes.map(n => ({ type: 'note', data: n, date: n.date }))].sort((a, b) => b.date.localeCompare(a.date));
    setHistoryItems(combined);
  };

  const handleAddNote = (content: string) => {
    if (!selectedClient) return;
    const author = currentUser ? currentUser.name : 'Sistema';
    const newNote: ClientNote = { id: Math.random().toString(36).substr(2, 9), clientId: selectedClient.id, authorName: author, date: new Date().toISOString(), content: content };
    appStore.addClientNote(newNote);
    handleOpenFicha(selectedClient);
  };

  return (
    <div className="space-y-6 relative pb-20">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div><h1 className="text-2xl font-bold text-brand-gray-900 tracking-tight">{isPortfolioMode ? "Gestão de Carteira" : "Base de Clientes"}</h1><p className="text-brand-gray-700 text-sm">Seus clientes e oportunidades Car10/Pagmotors</p></div>
      </header>
      
      <div className="flex space-x-1 bg-brand-gray-200 p-1 rounded-xl w-fit">
          <button onClick={() => setActiveTab('CARTEIRA')} className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'CARTEIRA' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-800'}`}><LayoutList className="w-4 h-4 mr-2" /> Carteira Ativa</button>
          <button onClick={() => setActiveTab('LEADS')} className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'LEADS' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-800'}`}><Target className="w-4 h-4 mr-2" /> Pipeline de Oportunidades</button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-brand-gray-100">
         <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gray-400" /><input type="text" placeholder={activeTab === 'CARTEIRA' ? "Pesquisar por nome do EC, CNPJ ou ID..." : "Pesquisar por nome, CNPJ ou Cód. Agendamento..."} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-brand-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all" /></div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-brand-gray-50 text-brand-gray-500 font-bold border-b border-brand-gray-200 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">{activeTab === 'CARTEIRA' ? 'ID / CNPJ' : 'Ref / CNPJ'}</th>
                <th className="px-6 py-4">Nome do EC</th>
                <th className="px-6 py-4">Região</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-gray-50">
                {filteredData.length === 0 ? (<tr><td colSpan={4} className="p-20 text-center text-gray-400">Nenhum registro encontrado.</td></tr>) : filteredData.map((row) => {
                    const relatedAppt = appointments.find(a => a.clientId === row.id);
                    return (
                        <tr key={row.id} className="hover:bg-brand-gray-50 transition-colors group">
                          <td className="px-6 py-4"><span className="font-mono text-[10px] text-brand-gray-400 block mb-0.5">{activeTab === 'CARTEIRA' ? row.id : (relatedAppt?.id || 'NOVO')}</span><span className="font-mono text-[11px] text-brand-gray-600">{row.cnpj || '---'}</span></td>
                          <td className="px-6 py-4"><div className="flex items-center gap-2">{row.hasPagmotors && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-glow animate-pulse"></div>}<span className="font-bold text-brand-gray-900">{row.nomeEc}</span></div></td>
                          <td className="px-6 py-4 text-brand-gray-600 text-xs font-medium">{row.regiaoAgrupada}</td>
                          <td className="px-6 py-4"><div className="flex items-center justify-center"><button onClick={() => handleOpenFicha(row)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-gray-900 text-white hover:bg-black rounded-xl transition-all text-xs font-bold shadow-sm"><ClipboardList className="w-4 h-4" />Abrir Ficha</button></div></td>
                        </tr>
                    );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedClient && (
          <UnifiedClientModal 
            client={selectedClient} 
            onClose={() => setSelectedClient(null)} 
            onAddNote={handleAddNote}
            historyItems={historyItems}
            refCode={appointments.find(a => a.clientId === selectedClient.id)?.id}
          />
      )}
    </div>
  );
};

export default BaseClientesPage;
