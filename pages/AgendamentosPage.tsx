
import React, { useState, useEffect, useRef } from 'react';
import { UserRole, Appointment, LeadOrigin, VisitPeriod, ClientBaseRow, VisitReport, VisitOutcome, WalletAction, WithdrawalReason, SwapReason } from '../types';
import { appStore } from '../services/store';
import { MOCK_USERS } from '../constants';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import { CurrencyInput } from '../components/CurrencyInput'; // Added Import
import { 
  Calendar, Clock, MapPin, User, MessageCircle, CheckCircle2, Save, 
  ArrowRight, Search, ChevronLeft, Pencil, FileText, Briefcase, Map, Layout,
  Timer, PenSquare, X, AlertTriangle, Route, Plus, Eye, DollarSign, BarChart2, Check, CalendarDays, History, Loader2
} from 'lucide-react';

interface AgendamentosPageProps {
  role: UserRole;
}

const ORIGINS: LeadOrigin[] = ['SIR', 'SIN', 'CAM', 'Indicação', 'Prospecção'];
const PERIODS: VisitPeriod[] = ['Manhã', 'Tarde', 'Horário Comercial'];

const AgendamentosPage: React.FC<AgendamentosPageProps> = ({ role }) => {
  const isInside = role === UserRole.INSIDE_SALES;

  if (isInside) {
    return <InsideSalesView />;
  } else {
    // specific logic to find the "current user" name for demo
    const fieldSalesName = "Cleiton Freitas"; 
    return <FieldSalesView currentUser={fieldSalesName} />;
  }
};

/* --- INSIDE SALES COMPONENT --- */
const InsideSalesView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Novos' | 'Carteira'>('Novos');
  const [isWalletScheduleMode, setIsWalletScheduleMode] = useState(false);
  const [previewId, setPreviewId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<Appointment>>({
    leadOrigins: [],
    period: 'Horário Comercial',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [walletClients, setWalletClients] = useState<ClientBaseRow[]>([]);
  const [visitReasons, setVisitReasons] = useState<string[]>([]);

  useEffect(() => {
    setWalletClients(appStore.getClients());
    setVisitReasons(appStore.getVisitReasons());
  }, [activeTab]); 

  useEffect(() => {
    if (!previewId) {
        setPreviewId(appStore.generateId());
    }
  }, []);

  const fieldSalesList = MOCK_USERS.filter(u => u.role === UserRole.FIELD_SALES);

  const handleOriginToggle = (origin: LeadOrigin) => {
    const current = formData.leadOrigins || [];
    const updated = current.includes(origin)
      ? current.filter(o => o !== origin)
      : [...current, origin];
    setFormData({ ...formData, leadOrigins: updated });
  };

  const generateWhatsAppMessage = (appt: Appointment, consultantPhone: string) => {
    const phone = appt.whatsapp.replace(/\D/g, '');
    let msg = '';

    if (appt.isWallet) {
        msg = `Olá ${appt.responsible} da *${appt.clientName}*! 👋\n\n` +
              `Aqui é da *Webmotors Serviços Automotivos*.\n\n` +
              `Recebemos uma solicitação aqui para te dar um suporte referente a:\n` +
              `⚠️ *${appt.visitReason}*\n\n` +
              `Já alinhei com nosso consultor responsável pela sua região para te visitar e resolver isso:\n` +
              `👤 *${appt.fieldSalesName}*\n` +
              `📱 ${consultantPhone}\n\n` +
              `Ele vai te chamar em breve para combinar o melhor horário. Tamo junto! 👊`;
    } else {
        const dateStr = appt.date ? new Date(appt.date).toLocaleDateString('pt-BR') : 'A definir';
        const originsText = appt.leadOrigins.join(' / ');
        
        msg = `Fala ${appt.responsible} da *${appt.clientName}*, tudo joia? 🔧\n\n` +
              `Aqui é da *Webmotors Serviços Automotivos*.\n\n` +
              `Estamos entrando em contato pois temos demandas do fluxo *Car10* (${originsText}) e queremos fortalecer essa parceria para aumentar seu fluxo.\n\n` +
              `📅 *Agendamento Confirmado:*\n` +
              `🗓 Data: ${dateStr}\n` +
              `⏰ Período: ${appt.period}\n\n` +
              `Quem fará a visita é o nosso consultor:\n` +
              `👤 *${appt.fieldSalesName}*\n` +
              `📱 ${consultantPhone}\n\n` +
              `Qualquer dúvida, é só chamar aqui. Um abraço!`;
    }

    return `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clientName || !formData.fieldSalesName || !formData.whatsapp) {
      alert("Por favor, preencha os campos obrigatórios (Nome, Whatsapp, Consultor).");
      return;
    }
    
    if (isWalletScheduleMode && !formData.visitReason) {
       alert("Por favor, selecione o Motivo da Visita.");
       return;
    }

    if (!isWalletScheduleMode && !formData.date) {
        alert("Por favor, selecione a Data Prevista.");
        return;
    }

    setIsSaving(true);

    // Simulate API delay
    setTimeout(() => {
        const newAppointment: Appointment = {
          id: previewId,
          leadOrigins: formData.leadOrigins || [],
          clientId: formData.clientId || Math.floor(Math.random() * 1000).toString(),
          clientName: formData.clientName,
          responsible: formData.responsible || '',
          whatsapp: formData.whatsapp,
          address: formData.address || '',
          observation: formData.observation || '',
          fieldSalesName: formData.fieldSalesName,
          date: formData.date,
          period: formData.period as VisitPeriod,
          status: 'Scheduled',
          isWallet: isWalletScheduleMode,
          visitReason: formData.visitReason
        };

        appStore.addAppointment(newAppointment);

        const consultant = MOCK_USERS.find(u => u.name === newAppointment.fieldSalesName);
        const consultantPhone = consultant ? consultant.whatsapp : "";

        const link = generateWhatsAppMessage(newAppointment, consultantPhone);
        setGeneratedLink(link);
        setIsSaving(false);
    }, 1000);
  };

  const handleScheduleFromWallet = (client: ClientBaseRow) => {
    setIsWalletScheduleMode(true);
    setPreviewId(appStore.generateId()); 
    setFormData({
      clientId: client.id,
      clientName: client.nomeEc,
      responsible: client.responsavel,
      whatsapp: client.contato,
      address: client.endereco,
      fieldSalesName: client.fieldSales,
      leadOrigins: [],
      date: undefined,
      period: undefined,
      visitReason: ''
    });
    setGeneratedLink(null);
  };

  const resetForm = () => {
    setPreviewId(appStore.generateId()); 
    setFormData({
      leadOrigins: [],
      period: 'Horário Comercial',
      date: new Date().toISOString().split('T')[0]
    });
    setGeneratedLink(null);
    setIsWalletScheduleMode(false);
  };

  const renderForm = () => (
    <div className="bg-white rounded-xl shadow-lg border border-brand-gray-100 overflow-hidden animate-fade-in max-w-4xl mx-auto">
        <div className="bg-brand-gray-900 text-white p-6 flex justify-between items-center relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5 transform rotate-12 scale-150">
                <Calendar size={180} />
             </div>

             <div className="z-10 relative">
                 {isWalletScheduleMode && (
                    <button 
                        onClick={() => setIsWalletScheduleMode(false)}
                        className="mb-3 flex items-center text-xs text-brand-gray-400 hover:text-white transition-colors uppercase tracking-wider font-bold"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Voltar para Carteira
                    </button>
                 )}
                 <h2 className="text-2xl font-bold flex items-center gap-2">
                    {isWalletScheduleMode ? 'Agendamento de Carteira' : 'Novo Agendamento'}
                 </h2>
                 <p className="text-brand-gray-400 text-sm mt-1">
                    Preencha os dados abaixo para registrar a demanda e notificar o Field Sales.
                 </p>
             </div>
             
             <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20 z-10 text-center min-w-[100px] hidden sm:block">
                <span className="block text-[10px] text-brand-gray-300 uppercase font-bold tracking-widest mb-1">Código</span>
                <span className="block text-xl font-mono font-bold text-white tracking-widest">{previewId}</span>
             </div>
        </div>
        
        {generatedLink ? (
             <div className="p-16 flex flex-col items-center justify-center text-center bg-green-50/30 min-h-[500px]">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 shadow-sm border-4 border-white animate-bounce-short">
                    <CheckCircle2 size={56} />
                </div>
                <h3 className="text-3xl font-bold text-brand-gray-900 mb-3">Sucesso!</h3>
                <p className="text-brand-gray-600 max-w-md mb-8 text-lg">
                    Os dados foram <strong className="text-green-700">salvos com sucesso</strong> no sistema. <br/>
                    O consultor Field Sales já consegue visualizar este agendamento.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                    <a 
                        href={generatedLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 px-6 py-4 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl font-bold flex items-center justify-center shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
                    >
                        <MessageCircle className="w-5 h-5 mr-2" />
                        Notificar via WhatsApp
                    </a>
                    <button 
                        onClick={resetForm}
                        className="flex-1 px-6 py-4 bg-white border border-brand-gray-300 text-brand-gray-700 rounded-xl font-medium hover:bg-brand-gray-50 transition-colors"
                    >
                        Novo Agendamento
                    </button>
                </div>
             </div>
        ) : (
            <form onSubmit={handleSubmit} className="p-4 md:p-8 bg-white">
                <div className="flex flex-col lg:flex-row gap-10">
                    <div className="flex-1 space-y-6">
                        <div className="flex items-center gap-3 pb-3 border-b border-brand-gray-100 mb-2">
                            <div className="bg-brand-light/10 p-2 rounded-lg text-brand-primary">
                                <User className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-brand-gray-900 text-lg">Dados do Cliente</h3>
                        </div>
                        <div className="space-y-5">
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase tracking-wide mb-2">ID Cliente</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all font-mono text-brand-gray-600"
                                        value={formData.clientId || ''}
                                        readOnly={isWalletScheduleMode}
                                        onChange={e => setFormData({...formData, clientId: e.target.value})}
                                        placeholder="ID"
                                    />
                                </div>
                                <div className="md:col-span-2 relative">
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase tracking-wide mb-2">Whatsapp *</label>
                                    <input 
                                        type="tel" 
                                        required
                                        placeholder="11999999999"
                                        className="w-full bg-white border border-brand-gray-300 rounded-lg pl-3 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all shadow-sm"
                                        value={formData.whatsapp || ''}
                                        onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                                    />
                                </div>
                             </div>
                            <div>
                                <label className="block text-xs font-bold text-brand-gray-500 uppercase tracking-wide mb-2">Nome da Oficina (EC) *</label>
                                <input 
                                    type="text" 
                                    required
                                    className={`w-full border border-brand-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all shadow-sm ${isWalletScheduleMode ? 'bg-brand-gray-50 text-brand-gray-600' : 'bg-white'}`}
                                    readOnly={isWalletScheduleMode}
                                    value={formData.clientName || ''}
                                    onChange={e => setFormData({...formData, clientName: e.target.value})}
                                />
                            </div>
                            <div className="relative">
                                <label className="block text-xs font-bold text-brand-gray-500 uppercase tracking-wide mb-2">Nome do Responsável</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-white border border-brand-gray-300 rounded-lg pl-3 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all shadow-sm"
                                    value={formData.responsible || ''}
                                    onChange={e => setFormData({...formData, responsible: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="hidden lg:block w-px bg-brand-gray-100"></div>
                    <div className="flex-1 space-y-6">
                         <div className="flex items-center gap-3 pb-3 border-b border-brand-gray-100 mb-2">
                            <div className="bg-brand-primary/10 p-2 rounded-lg text-brand-primary">
                                <Briefcase className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-brand-gray-900 text-lg">Detalhes da Visita</h3>
                        </div>
                        <div className="space-y-5">
                            <div className="relative">
                                <label className="block text-xs font-bold text-brand-gray-500 uppercase tracking-wide mb-2">Endereço Completo</label>
                                <AddressAutocomplete
                                    value={formData.address || ''}
                                    onChange={(val) => setFormData({...formData, address: val})}
                                    placeholder="Digite para buscar..."
                                />
                            </div>
                            {!isWalletScheduleMode ? (
                                <div>
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase tracking-wide mb-2">Origem do Lead</label>
                                    <div className="flex flex-wrap gap-2">
                                        {ORIGINS.map(origin => (
                                        <button
                                            key={origin}
                                            type="button"
                                            onClick={() => handleOriginToggle(origin)}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all
                                            ${formData.leadOrigins?.includes(origin)
                                                ? 'bg-brand-primary text-white border-brand-primary shadow-md transform scale-105'
                                                : 'bg-white text-brand-gray-600 border-brand-gray-200 hover:bg-brand-gray-50'
                                            }`}
                                        >
                                            {origin}
                                        </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-yellow-50 p-5 rounded-xl border border-yellow-200 shadow-sm">
                                    <label className="block text-xs font-bold text-yellow-800 uppercase tracking-wide mb-2">Motivo da Visita *</label>
                                    <select
                                        required
                                        className="w-full border-yellow-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500 bg-white text-brand-gray-800 text-sm py-2.5 shadow-sm"
                                        value={formData.visitReason || ''}
                                        onChange={e => setFormData({...formData, visitReason: e.target.value})}
                                    >
                                        <option value="">Selecione o motivo...</option>
                                        {visitReasons.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase tracking-wide mb-2">Data Prevista *</label>
                                    <input 
                                        type="date"
                                        required
                                        className="w-full bg-white border border-brand-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all shadow-sm"
                                        value={formData.date || ''}
                                        onChange={e => setFormData({...formData, date: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase tracking-wide mb-2">Período</label>
                                    <select
                                        className="w-full bg-white border border-brand-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all shadow-sm"
                                        value={formData.period || ''}
                                        onChange={e => setFormData({...formData, period: e.target.value as VisitPeriod})}
                                    >
                                        {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-brand-gray-500 uppercase tracking-wide mb-2">Consultor Field Sales *</label>
                                <select
                                    required
                                    className={`w-full border border-brand-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all shadow-sm appearance-none ${isWalletScheduleMode ? 'bg-brand-gray-50 text-brand-gray-600' : 'bg-white'}`}
                                    disabled={isWalletScheduleMode}
                                    value={formData.fieldSalesName || ''}
                                    onChange={e => setFormData({...formData, fieldSalesName: e.target.value})}
                                >
                                    <option value="">Selecione o consultor...</option>
                                    {fieldSalesList.map(u => <option key={u.email} value={u.name}>{u.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-8">
                    <label className="block text-xs font-bold text-brand-gray-500 uppercase tracking-wide mb-2">Observações Adicionais</label>
                    <textarea 
                        rows={3}
                        className="w-full bg-white border border-brand-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all resize-none shadow-sm"
                        value={formData.observation || ''}
                        onChange={e => setFormData({...formData, observation: e.target.value})}
                    />
                </div>
                <div className="mt-8 pt-6 border-t border-brand-gray-100 flex justify-end gap-4">
                    <button type="button" onClick={resetForm} className="px-6 py-3 rounded-lg text-brand-gray-600 font-bold hover:bg-brand-gray-100 transition-colors text-sm">Limpar</button>
                    <button type="submit" disabled={isSaving} className="px-8 py-3 bg-brand-primary text-white rounded-lg font-bold hover:bg-brand-dark transition-all shadow-lg hover:shadow-xl flex items-center text-sm transform hover:-translate-y-0.5 disabled:opacity-50">
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2" />}
                        {isSaving ? 'Salvando...' : 'Salvar Agendamento'}
                    </button>
                </div>
            </form>
        )}
    </div>
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-gray-900 tracking-tight">Agendamentos</h1>
          <p className="text-brand-gray-600 mt-1">Central de marcação de visitas e gestão de carteira</p>
        </div>
        
        {/* Modern Pill Tabs */}
        <div className="bg-brand-gray-100 p-1.5 rounded-xl flex">
          <button
            className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                activeTab === 'Novos' 
                ? 'bg-white text-brand-primary shadow-sm' 
                : 'text-brand-gray-500 hover:text-brand-gray-800'
            }`}
            onClick={() => { setActiveTab('Novos'); setIsWalletScheduleMode(false); }}
          >
            Novos Clientes
          </button>
          <button
            className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                activeTab === 'Carteira' 
                ? 'bg-white text-brand-primary shadow-sm' 
                : 'text-brand-gray-500 hover:text-brand-gray-800'
            }`}
            onClick={() => { setActiveTab('Carteira'); setIsWalletScheduleMode(false); }}
          >
            Gestão de Carteira
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      {activeTab === 'Novos' && renderForm()}

      {activeTab === 'Carteira' && (
        <>
            {isWalletScheduleMode ? renderForm() : (
                <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden animate-fade-in">
                    <div className="p-6 border-b border-brand-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-brand-gray-50/30">
                        <div>
                            <h3 className="font-bold text-lg text-brand-gray-900">Minha Carteira</h3>
                            <p className="text-sm text-brand-gray-500">Clientes atribuídos a você</p>
                        </div>
                        <div className="relative w-full md:w-auto group">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-gray-400 group-hover:text-brand-primary transition-colors" />
                            <input 
                            type="text" 
                            placeholder="Buscar por nome, endereço..." 
                            className="pl-10 pr-4 py-2.5 border border-brand-gray-300 rounded-lg text-sm w-full md:w-80 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                            />
                        </div>
                    </div>

                    {walletClients.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="w-20 h-20 bg-brand-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-gray-400">
                                <Layout size={32} />
                            </div>
                            <h4 className="text-xl font-bold text-brand-gray-900 mb-2">Carteira Vazia</h4>
                            <p className="text-brand-gray-500 max-w-sm mx-auto">
                                Nenhum cliente vinculado. Solicite ao Gestor a importação da base para o seu perfil.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                            <thead className="bg-brand-gray-50 text-brand-gray-600 font-bold border-b border-brand-gray-200 uppercase tracking-wider text-xs">
                                <tr>
                                <th className="px-6 py-4">Nome do EC</th>
                                <th className="px-6 py-4">Localização</th>
                                <th className="px-6 py-4">Responsável</th>
                                <th className="px-6 py-4">Field Sales</th>
                                <th className="px-6 py-4 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-gray-100">
                                {walletClients.map((client) => (
                                <tr key={client.id} className="hover:bg-brand-gray-50 transition-colors group">
                                    <td className="px-6 py-4 font-bold text-brand-gray-900">{client.nomeEc}</td>
                                    <td className="px-6 py-4 text-brand-gray-600 flex items-center gap-2">
                                        <Map className="w-4 h-4 text-brand-gray-400" />
                                        <span className="truncate max-w-[200px]">{client.endereco}</span>
                                    </td>
                                    <td className="px-6 py-4 text-brand-gray-600">{client.responsavel}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-brand-gray-100 text-brand-gray-700">
                                            {client.fieldSales}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => handleScheduleFromWallet(client)}
                                        className="text-brand-primary bg-white border border-brand-primary hover:bg-brand-primary hover:text-white px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center ml-auto shadow-sm"
                                    >
                                        Agendar Visita
                                        <ArrowRight className="w-3 h-3 ml-1.5" />
                                    </button>
                                    </td>
                                </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </>
      )}
    </div>
  );
};

/* --- FIELD SALES COMPONENT --- */

const FieldSalesView: React.FC<{ currentUser: string }> = ({ currentUser }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refresh, setRefresh] = useState(0);
  
  // Filters: Default to TODAY
  const todayStr = new Date().toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'NEW' | 'WALLET'>('ALL');

  // New Visit Modal State
  const [isNewVisitModalOpen, setIsNewVisitModalOpen] = useState(false);
  const [newVisitMode, setNewVisitMode] = useState<'CLIENT_ID' | 'PROSPECTION'>('CLIENT_ID');
  const [newVisitData, setNewVisitData] = useState<Partial<Appointment>>({
    leadOrigins: ['Prospecção'],
    status: 'Scheduled',
    date: new Date().toISOString().split('T')[0]
  });
  
  // Predictive Search State
  const [searchId, setSearchId] = useState('');
  const [clientBase, setClientBase] = useState<ClientBaseRow[]>([]);
  const [suggestions, setSuggestions] = useState<ClientBaseRow[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Visit Report State & Details Modal
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [viewDetailsAppt, setViewDetailsAppt] = useState<Appointment | null>(null);
  const [reportData, setReportData] = useState<VisitReport>({});
  
  // Loading State for Actions
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Refs for click outside
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAppointments(appStore.getAppointmentsByFieldSales(currentUser));
    setClientBase(appStore.getClients()); // Load clients for search
  }, [currentUser, refresh]);

  // Click outside listener for suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtering Logic
  const filteredAppointments = appointments.filter(appt => {
     if (!appt.date) return false;
     // Date Filter
     const matchesDate = appt.date >= startDate && appt.date <= endDate;
     // Type Filter
     const matchesType = typeFilter === 'ALL' ? true : typeFilter === 'WALLET' ? appt.isWallet : !appt.isWallet;
     
     return matchesDate && matchesType;
  });

  const handleCheckIn = (id: string) => {
    setLoadingAction(`checkin-${id}`);
    setTimeout(() => {
        appStore.checkInAppointment(id);
        setRefresh(prev => prev + 1); // Refresh UI to show "Preencher Relatório"
        setLoadingAction(null);
    }, 800);
  };
  
  const handleToggleRoute = (id: string) => {
    appStore.toggleRouteStatus(id);
    setRefresh(prev => prev + 1);
  };

  const handleOpenReport = (appt: Appointment) => {
    setSelectedAppt(appt);
    setReportData({
        outcome: undefined,
        walletAction: undefined,
        withdrawalReason: undefined,
        swapReason: undefined,
        observation: '',
        revenuePotential: undefined,
        competitorAcquirer: '',
        hadRateQuote: false
    });
  };

  const handleSaveReport = () => {
    if (selectedAppt) {
        setLoadingAction('report');
        setTimeout(() => {
            appStore.submitVisitReport(selectedAppt.id, reportData);
            setSelectedAppt(null);
            setRefresh(prev => prev + 1);
            setLoadingAction(null);
        }, 1000);
    }
  };

  // --- SEARCH & SELECTION LOGIC ---
  
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setSearchId(val);
      
      if (val.length > 0) {
          const matches = clientBase.filter(c => 
              c.id.toLowerCase().includes(val.toLowerCase()) || 
              c.nomeEc.toLowerCase().includes(val.toLowerCase())
          ).slice(0, 5); // Top 5 results
          
          setSuggestions(matches);
          setShowSuggestions(true);
      } else {
          setShowSuggestions(false);
      }
  };

  const selectClient = (client: ClientBaseRow) => {
      setNewVisitData({
          ...newVisitData,
          clientId: client.id,
          clientName: client.nomeEc,
          address: client.endereco,
          responsible: client.responsavel,
          whatsapp: client.contato,
          fieldSalesName: currentUser
      });
      setSearchId(client.id); // Or keep typed text? Usually better to show selection ID or clear.
      setShowSuggestions(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          if (suggestions.length > 0) {
              selectClient(suggestions[0]);
          } else {
              // Fallback: try exact match if suggestions empty but text exists
              const exact = clientBase.find(c => c.id === searchId);
              if (exact) {
                  selectClient(exact);
              } else {
                 alert('Cliente não encontrado.');
              }
          }
      }
  };

  const handleSearchButtonClick = () => {
      if (suggestions.length > 0) {
          selectClient(suggestions[0]);
      } else {
          const exact = clientBase.find(c => c.id === searchId);
          if (exact) {
              selectClient(exact);
          } else {
             alert('Cliente não encontrado.');
          }
      }
  };

  const handleCreateVisit = () => {
      if (!newVisitData.clientName) {
          alert('Preencha o nome do cliente.');
          return;
      }
      setLoadingAction('create');
      
      setTimeout(() => {
          const newAppt: Appointment = {
              id: appStore.generateId(),
              clientId: newVisitData.clientId || 'MANUAL-' + Math.floor(Math.random()*1000),
              clientName: newVisitData.clientName!,
              responsible: newVisitData.responsible || '',
              whatsapp: newVisitData.whatsapp || '',
              address: newVisitData.address || '',
              observation: newVisitData.observation || 'Visita criada manualmente pelo consultor.',
              fieldSalesName: currentUser,
              status: 'Scheduled',
              leadOrigins: newVisitMode === 'PROSPECTION' ? ['Prospecção'] : ['Indicação'],
              isWallet: newVisitMode === 'CLIENT_ID',
              date: new Date().toISOString().split('T')[0],
              period: 'Horário Comercial'
          };

          appStore.addAppointment(newAppt);
          
          // AUTO CHECK-IN & REPORT OPEN LOGIC FOR PROSPECTION
          if (newVisitMode === 'PROSPECTION') {
              appStore.checkInAppointment(newAppt.id);
              
              setReportData({
                outcome: undefined,
                walletAction: undefined,
                withdrawalReason: undefined,
                swapReason: undefined,
                observation: '',
                revenuePotential: undefined,
                competitorAcquirer: '',
                hadRateQuote: false
              });
              
              setSelectedAppt(newAppt);
          }

          setRefresh(prev => prev + 1);
          setIsNewVisitModalOpen(false);
          setLoadingAction(null);
          
          // Reset form
          setNewVisitData({
              leadOrigins: ['Prospecção'],
              status: 'Scheduled',
              date: new Date().toISOString().split('T')[0]
          });
          setSearchId('');
      }, 1000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto relative">
       {/* Responsive Header for Field Sales */}
       <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-brand-gray-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-gray-900 tracking-tight">Minha Agenda</h1>
          <p className="text-brand-gray-600 mt-1 text-sm">Visitas agendadas e prospecções</p>
        </div>
        
        <div className="flex flex-col w-full md:w-auto gap-3">
             
             {/* Date Picker Row */}
             <div className="flex items-center gap-2 bg-white border border-brand-gray-300 rounded-lg p-1 w-full md:w-auto">
                 <div className="relative group flex-1">
                     <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-[10px] font-bold text-brand-gray-400">DE</span>
                     <input 
                        type="date" 
                        value={startDate} 
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 text-sm bg-transparent outline-none text-brand-gray-700 font-medium cursor-pointer"
                     />
                 </div>
                 <div className="w-px h-6 bg-brand-gray-200"></div>
                 <div className="relative group flex-1">
                     <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-[10px] font-bold text-brand-gray-400">ATÉ</span>
                     <input 
                        type="date" 
                        value={endDate} 
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 text-sm bg-transparent outline-none text-brand-gray-700 font-medium cursor-pointer"
                     />
                 </div>
             </div>
             
             {/* Filter & Button Row */}
             <div className="flex gap-2">
                <select 
                    className="flex-1 bg-white border border-brand-gray-300 text-brand-gray-700 text-sm rounded-lg p-2.5 focus:ring-1 focus:ring-brand-primary outline-none"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                >
                    <option value="ALL">Todos</option>
                    <option value="WALLET">Carteira</option>
                    <option value="NEW">Novos</option>
                </select>

                <button 
                    onClick={() => setIsNewVisitModalOpen(true)}
                    className="flex-1 bg-brand-primary text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-brand-dark transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                >
                    <Plus className="w-4 h-4" />
                    Nova
                </button>
             </div>
        </div>
      </header>

      {filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 p-16 text-center">
          <div className="w-16 h-16 bg-brand-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
             <Calendar className="w-8 h-8 text-brand-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-brand-gray-900">Nenhuma visita encontrada</h3>
          <p className="text-brand-gray-500 mt-1 text-sm">Ajuste os filtros ou adicione uma nova visita.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appt) => {
            const isCheckedIn = !!appt.visitReport?.checkInTime;
            const isCompleted = appt.status === 'Completed';
            
            // Format check-in time if exists
            const checkInTime = appt.visitReport?.checkInTime 
                ? new Date(appt.visitReport.checkInTime).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})
                : null;

            return (
            <div key={appt.id} className="bg-white rounded-xl shadow-sm border border-brand-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-all">
               <div className="flex flex-col sm:flex-row">
                   {/* Compact Left Indicator */}
                   <div className={`h-2 sm:h-auto sm:w-2 ${appt.isWallet ? 'bg-yellow-400' : 'bg-brand-primary'}`}></div>
                   
                   <div className="p-4 flex-1 flex flex-col gap-3">
                        {/* Header: Time & Name */}
                        <div className="flex justify-between items-start">
                             <div>
                                 <div className="flex items-center gap-2 mb-1">
                                     <span className="text-xs font-bold text-brand-gray-500 flex items-center gap-1">
                                        <CalendarDays className="w-3 h-3" />
                                        {appt.date ? new Date(appt.date).toLocaleDateString('pt-BR') : ''}
                                        <span className="mx-1 text-gray-300">|</span>
                                        <Clock className="w-3 h-3" />
                                        {appt.period}
                                     </span>
                                     {appt.isWallet ? (
                                        <span className="text-[10px] font-bold bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded border border-yellow-200 uppercase">
                                            Gestão
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold bg-brand-light/10 text-brand-primary px-1.5 py-0.5 rounded border border-brand-light/20 uppercase">
                                            Novo
                                        </span>
                                    )}
                                 </div>
                                 <h3 className="text-lg font-bold text-brand-gray-900 leading-tight">{appt.clientName}</h3>
                             </div>
                             
                             <div className="flex flex-col items-end gap-1">
                                 {isCompleted && (
                                     <span className="bg-green-100 text-green-700 p-1.5 rounded-full" title="Visita Concluída">
                                         <CheckCircle2 size={16} />
                                     </span>
                                 )}
                                 {checkInTime && (
                                     <span className="text-[10px] font-mono bg-brand-gray-100 text-brand-gray-600 px-2 py-0.5 rounded border border-brand-gray-200 flex items-center gap-1">
                                         <History className="w-3 h-3" />
                                         Check-in: {checkInTime}
                                     </span>
                                 )}
                             </div>
                        </div>

                        {/* Address One-Liner */}
                        <div className="flex items-center text-sm text-brand-gray-600">
                            <MapPin className="w-4 h-4 mr-1 text-brand-gray-400 shrink-0" />
                            <span className="truncate">{appt.address}</span>
                        </div>

                        {/* Actions Row (Compact) */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-brand-gray-100 mt-1">
                            
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleToggleRoute(appt.id)}
                                    className={`p-2 rounded-lg transition-colors border
                                        ${appt.inRoute 
                                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                            : 'bg-white text-brand-gray-500 border-brand-gray-200 hover:bg-brand-gray-50'
                                        }`}
                                    title={appt.inRoute ? 'Remover da Rota' : 'Incluir na Rota'}
                                >
                                    <Route className="w-4 h-4" />
                                </button>
                                
                                <button 
                                    onClick={() => setViewDetailsAppt(appt)}
                                    className="px-3 py-2 bg-white border border-brand-gray-200 text-brand-gray-700 rounded-lg text-xs font-bold hover:bg-brand-gray-50 flex items-center gap-1"
                                >
                                    <Eye className="w-3 h-3" />
                                    Ver Detalhes
                                </button>
                            </div>

                            {!isCompleted && (
                                <div>
                                    {!isCheckedIn ? (
                                        <button 
                                            onClick={() => handleCheckIn(appt.id)}
                                            disabled={loadingAction === `checkin-${appt.id}`}
                                            className="px-4 py-2 bg-brand-gray-900 text-white rounded-lg text-xs font-bold hover:bg-brand-dark shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                                        >
                                            {loadingAction === `checkin-${appt.id}` ? <Loader2 className="w-3 h-3 animate-spin"/> : <MapPin className="w-3 h-3" />}
                                            {loadingAction === `checkin-${appt.id}` ? 'Registrando...' : 'Fazer Check-in'}
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleOpenReport(appt)}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 shadow-sm flex items-center gap-1.5 animate-pulse"
                                        >
                                            <PenSquare className="w-3 h-3" />
                                            Preencher Relatório
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                   </div>
               </div>
            </div>
            );
          })}
        </div>
      )}

      {/* MODAL: NEW VISIT (Fixed) */}
      {isNewVisitModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                    <div className="bg-brand-gray-900 px-6 py-4 flex justify-between items-center">
                        <h3 className="text-white font-bold text-lg">Nova Visita / Prospecção</h3>
                        <button onClick={() => setIsNewVisitModalOpen(false)} className="text-brand-gray-400 hover:text-white"><X size={20}/></button>
                    </div>
                    <div className="p-6 space-y-4">
                        {/* Tabs for Mode */}
                        <div className="flex bg-brand-gray-100 p-1 rounded-lg mb-4">
                            <button 
                                onClick={() => setNewVisitMode('PROSPECTION')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${newVisitMode === 'PROSPECTION' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-500'}`}
                            >
                                Prospecção (Novo)
                            </button>
                            <button 
                                onClick={() => setNewVisitMode('CLIENT_ID')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${newVisitMode === 'CLIENT_ID' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-500'}`}
                            >
                                Cliente Base (ID)
                            </button>
                        </div>

                        {newVisitMode === 'CLIENT_ID' && (
                            <div className="relative mb-4" ref={searchWrapperRef}>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input 
                                            type="text" 
                                            placeholder="Busque por ID ou Nome..." 
                                            value={searchId}
                                            onChange={handleSearchInput}
                                            onKeyDown={handleSearchKeyDown}
                                            className="w-full border border-brand-gray-300 rounded-lg pl-3 pr-10 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                                        />
                                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-brand-gray-400 w-4 h-4 pointer-events-none" />
                                    </div>
                                    <button 
                                        onClick={handleSearchButtonClick}
                                        className="bg-brand-gray-100 text-brand-gray-600 px-3 py-2 rounded-lg text-sm font-bold hover:bg-brand-gray-200"
                                    >
                                        Buscar
                                    </button>
                                </div>
                                
                                {/* Dropdown for Suggestions */}
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-brand-gray-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                                        <ul>
                                            {suggestions.map((client) => (
                                                <li 
                                                    key={client.id}
                                                    onClick={() => selectClient(client)}
                                                    className="px-4 py-2 hover:bg-brand-gray-50 cursor-pointer border-b border-brand-gray-50 last:border-0"
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm font-bold text-brand-gray-900">{client.nomeEc}</span>
                                                        <span className="text-xs font-mono bg-brand-gray-100 px-1.5 rounded text-brand-gray-600">{client.id}</span>
                                                    </div>
                                                    <p className="text-xs text-brand-gray-500 truncate">{client.endereco}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-brand-gray-500 uppercase">Nome do Estabelecimento *</label>
                                <input 
                                    className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-1 focus:ring-brand-primary outline-none"
                                    value={newVisitData.clientName || ''}
                                    onChange={e => setNewVisitData({...newVisitData, clientName: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-brand-gray-500 uppercase">Endereço *</label>
                                <AddressAutocomplete 
                                    value={newVisitData.address || ''}
                                    onChange={(val) => setNewVisitData({...newVisitData, address: val})}
                                    placeholder="Busque o endereço..."
                                    className="mt-1"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-brand-gray-500 uppercase">Responsável</label>
                                    <input 
                                        className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-1 focus:ring-brand-primary outline-none"
                                        value={newVisitData.responsible || ''}
                                        onChange={e => setNewVisitData({...newVisitData, responsible: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-brand-gray-500 uppercase">Whatsapp</label>
                                    <input 
                                        className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-1 focus:ring-brand-primary outline-none"
                                        value={newVisitData.whatsapp || ''}
                                        onChange={e => setNewVisitData({...newVisitData, whatsapp: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleCreateVisit}
                            disabled={loadingAction === 'create'}
                            className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold mt-4 hover:bg-brand-dark transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loadingAction === 'create' ? <Loader2 className="w-4 h-4 animate-spin"/> : null}
                            Confirmar Visita
                        </button>
                    </div>
                </div>
            </div>
      )}

      {/* MODAL: REPORT FORM */}
      {selectedAppt && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
               <div className="bg-brand-primary px-6 py-4 flex justify-between items-center text-white shrink-0">
                   <h3 className="font-bold text-lg flex items-center gap-2">
                       <FileText className="w-5 h-5" />
                       Relatório de Visita
                   </h3>
                   <button onClick={() => setSelectedAppt(null)} className="text-white/80 hover:text-white"><X size={20}/></button>
               </div>
               
               <div className="p-6 overflow-y-auto">
                   <div className="mb-6">
                       <p className="text-xs font-bold text-brand-gray-400 uppercase">Cliente</p>
                       <p className="font-bold text-brand-gray-900 text-lg">{selectedAppt.clientName}</p>
                   </div>

                   {/* DYNAMIC FORM BASED ON VISIT TYPE */}
                   {!selectedAppt.isWallet ? (
                       // NEW BUSINESS FLOW
                       <div className="space-y-4">
                           <div>
                               <label className="block text-sm font-bold text-brand-gray-700 mb-2">Resultado da Visita *</label>
                               <select 
                                   className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                                   value={reportData.outcome || ''}
                                   onChange={e => setReportData({...reportData, outcome: e.target.value as VisitOutcome})}
                               >
                                   <option value="">Selecione...</option>
                                   <option value="Convertido">Convertido (Venda Realizada)</option>
                                   <option value="Em negociação">Em negociação</option>
                                   <option value="Sem interesse">Sem interesse</option>
                                   <option value="Fidelidade com adquirente">Fidelidade com adquirente</option>
                                   <option value="Taxas altas">Taxas altas</option>
                               </select>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-brand-gray-700 mb-2">Potencial (R$)</label>
                                    <CurrencyInput 
                                        className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                                        placeholder="R$ 0,00"
                                        value={reportData.revenuePotential}
                                        onChange={val => setReportData({...reportData, revenuePotential: val})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-brand-gray-700 mb-2">Concorrente</label>
                                    <input 
                                        className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                                        placeholder="Ex: Stone"
                                        value={reportData.competitorAcquirer || ''}
                                        onChange={e => setReportData({...reportData, competitorAcquirer: e.target.value})}
                                    />
                                </div>
                           </div>
                       </div>
                   ) : (
                       // WALLET FLOW
                       <div className="space-y-4">
                           <div>
                               <label className="block text-sm font-bold text-brand-gray-700 mb-2">Ação Realizada *</label>
                               <select 
                                   className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                                   value={reportData.walletAction || ''}
                                   onChange={e => setReportData({...reportData, walletAction: e.target.value as WalletAction})}
                               >
                                   <option value="">Selecione...</option>
                                   <option value="Retirada de POS">Retirada de POS</option>
                                   <option value="Troca de POS">Troca de POS</option>
                                   <option value="Suporte pós-venda">Suporte pós-venda</option>
                                   <option value="Engajamento sem uso">Engajamento sem uso</option>
                                   <option value="Negociação de taxas">Negociação de taxas</option>
                               </select>
                           </div>
                           
                           {/* Conditional fields based on Action */}
                           {reportData.walletAction === 'Retirada de POS' && (
                               <div>
                                   <label className="block text-sm font-bold text-brand-gray-700 mb-2">Motivo Retirada *</label>
                                   <select 
                                       className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                                       value={reportData.withdrawalReason || ''}
                                       onChange={e => setReportData({...reportData, withdrawalReason: e.target.value})}
                                   >
                                       <option value="">Selecione...</option>
                                       {appStore.getWithdrawalReasons().map(r => <option key={r} value={r}>{r}</option>)}
                                   </select>
                               </div>
                           )}

                           {reportData.walletAction === 'Troca de POS' && (
                               <div>
                                   <label className="block text-sm font-bold text-brand-gray-700 mb-2">Motivo Troca *</label>
                                   <select 
                                       className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                                       value={reportData.swapReason || ''}
                                       onChange={e => setReportData({...reportData, swapReason: e.target.value})}
                                   >
                                       <option value="">Selecione...</option>
                                       {appStore.getSwapReasons().map(r => <option key={r} value={r}>{r}</option>)}
                                   </select>
                               </div>
                           )}
                       </div>
                   )}

                   <div className="mt-4">
                       <label className="block text-sm font-bold text-brand-gray-700 mb-2">Observações / Detalhes</label>
                       <textarea 
                           className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none resize-none h-24"
                           placeholder="Descreva o que foi conversado ou feito..."
                           value={reportData.observation || ''}
                           onChange={e => setReportData({...reportData, observation: e.target.value})}
                       />
                   </div>
               </div>

               <div className="p-4 border-t border-brand-gray-200 bg-brand-gray-50 flex justify-end">
                   <button 
                       onClick={handleSaveReport}
                       disabled={loadingAction === 'report'}
                       className="px-6 py-2 bg-brand-primary text-white rounded-lg font-bold hover:bg-brand-dark transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50"
                   >
                       {loadingAction === 'report' ? <Loader2 className="w-4 h-4 animate-spin"/> : null}
                       Concluir Visita
                   </button>
               </div>
           </div>
        </div>
      )}

      {/* MODAL: VIEW DETAILS (Read Only) */}
      {viewDetailsAppt && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
                  <button onClick={() => setViewDetailsAppt(null)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={18}/></button>
                  <h3 className="text-xl font-bold mb-1">{viewDetailsAppt.clientName}</h3>
                  <p className="text-gray-500 text-sm mb-6 flex items-center gap-1"><MapPin size={14}/> {viewDetailsAppt.address}</p>
                  
                  <div className="space-y-4">
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Dados de Contato</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                              <div><span className="text-gray-500 block text-xs">Responsável</span>{viewDetailsAppt.responsible}</div>
                              <div><span className="text-gray-500 block text-xs">Telefone</span>{viewDetailsAppt.whatsapp}</div>
                          </div>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Sobre o Agendamento</h4>
                          <p className="text-sm text-gray-800 mb-2">
                              <span className="font-bold">Origem:</span> {viewDetailsAppt.isWallet ? 'Carteira (Gestão)' : 'Novo Negócio'}
                          </p>
                          {viewDetailsAppt.leadOrigins.length > 0 && (
                              <p className="text-sm text-gray-800 mb-2"><span className="font-bold">Fonte:</span> {viewDetailsAppt.leadOrigins.join(', ')}</p>
                          )}
                          <p className="text-sm text-gray-600 italic">"{viewDetailsAppt.observation}"</p>
                      </div>

                      {viewDetailsAppt.visitReport && (
                          <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-green-800 text-sm">
                              <p className="font-bold mb-1 flex items-center gap-2"><CheckCircle2 size={16}/> Visita Concluída</p>
                              <p>Resultado: <strong>{viewDetailsAppt.visitReport.outcome || viewDetailsAppt.visitReport.walletAction}</strong></p>
                              {viewDetailsAppt.fieldObservation && (
                                  <p className="mt-2 italic text-green-700">"{viewDetailsAppt.fieldObservation}"</p>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AgendamentosPage;
