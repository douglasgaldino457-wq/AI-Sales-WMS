
import React, { useState } from 'react';
import { UserRole } from '../types';
import { 
    CheckCircle2, User, Phone, Mail, DollarSign, Calculator, 
    Smartphone, CreditCard, Download, Printer, Share2, Zap, Calendar, AlertCircle,
    Table, List, PieChart, LayoutList, Send, AlertTriangle, ArrowRight, X
} from 'lucide-react';
import { Logo } from '../components/Logo';
import ResultadosPage from './ResultadosPage';
import ConfigTaxasPage from './ConfigTaxasPage';
import { appStore } from '../services/store';

interface PricingPageProps {
  role: UserRole | null;
}

// Defined Ranges with Discount Factors (Mock Logic)
const TPV_RANGES = [
    { id: 0, label: 'Até R$ 20.000,00', discount: 0 },
    { id: 1, label: 'R$ 20k a R$ 50k', discount: 0.10 },
    { id: 2, label: 'R$ 50k a R$ 100k', discount: 0.18 },
    { id: 3, label: 'R$ 100k a R$ 250k', discount: 0.25 },
    { id: 4, label: 'Acima de R$ 250k', discount: 0.35 },
];

// --- PROPOSAL GENERATOR COMPONENT (TABELA RANGE) ---
const ProposalGenerator: React.FC<{ role: UserRole | null }> = ({ role }) => {
    // State
    const [rangeClientName, setRangeClientName] = useState('');
    const [selectedRangeId, setSelectedRangeId] = useState<number>(1); // Default to 20k-50k
    const [rangePlan, setRangePlan] = useState<'Full' | 'Simples'>('Full');
    const [imgError, setImgError] = useState(false);

    // Approval Modal State
    const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
    const [realTpv, setRealTpv] = useState<string>('');
    const [justification, setJustification] = useState('');

    const selectedRange = TPV_RANGES.find(r => r.id === selectedRangeId) || TPV_RANGES[0];

    // --- LOGIC: BENEFITS ---
    const getBenefitsList = (plan: string) => {
        if (plan === 'Full') {
            return [
                "Pagamento no mesmo dia (4 grades de repasses)",
                "Prioridade em oportunidades de novos leads Webmotors Serviços",
                "Taxa única para todas as bandeiras",
                "Suporte humanizado",
                "Parcelamento em até 18x"
            ];
        } else {
             return [
                "Pagamentos na Agenda, conforme parcela",
                "Prioridade em oportunidades de novos leads Webmotors Serviços",
                "Taxa única para todas as bandeiras",
                "Suporte humanizado",
                "Solicitação de antecipação, paga no mesmo dia*"
            ];
        }
    };

    // --- LOGIC: RATES TABLE ---
    const getRangeRates = (plan: string, rangeDiscount: number) => {
        const discount = rangeDiscount;
        
        if (plan === 'Full') {
             // FULL: Granular Display (Parcela a Parcela)
             const rows = [
                 { label: 'DÉBITO', rate: 0.99 - discount },
                 { label: 'CRÉDITO 1X', rate: 2.89 - discount },
             ];
             
             // Generate 2x to 18x
             for(let i=2; i<=18; i++) {
                 // Mock Curve: Base + (Installment * Factor) - Discount
                 const rate = 3.5 + (i * 0.75) - discount; 
                 rows.push({ label: `${i}x`, rate: parseFloat(rate.toFixed(2)) });
             }
             return rows;

        } else {
             // SIMPLES: Grouped Display (Buckets)
             return [
                 { label: 'DÉBITO', rate: 1.19 - discount },
                 { label: 'CRÉDITO 1X', rate: 3.19 - discount },
                 { label: '2X - 6X', rate: 9.90 - discount * 2 },
                 { label: '7X - 12X', rate: 12.90 - discount * 2 },
                 { label: '13X - 18X', rate: 16.90 - discount * 2 },
             ];
        }
    };

    const handleSendApproval = () => {
        if (!realTpv || !rangeClientName) {
            alert("Preencha o Nome do Cliente e o Volume Real.");
            return;
        }

        // Logic to create manual demand
        const demand = {
            id: `APR-${Math.floor(Math.random() * 10000)}`,
            clientName: rangeClientName,
            type: 'Aprovação de Exceção (Range)',
            date: new Date().toISOString(),
            status: 'Em Análise' as const, // Cast to literal type
            requester: role === UserRole.FIELD_SALES ? 'Cleiton Freitas' : 'Usuário Atual',
            description: `Solicitação de enquadramento na faixa "${selectedRange.label}" com volume real de R$ ${realTpv}. Justificativa: ${justification}`,
            pricingData: {
                competitorRates: { debit: 0, credit1x: 0, credit12x: 0 }, // Mock empty
                proposedRates: { debit: 0, credit1x: 0, credit12x: 0 }, // Would contain the rates from selectedRange
                context: {
                    potentialRevenue: parseFloat(realTpv.replace(/\D/g,'')) / 100, // Parsing currency string
                    minAgreed: 0
                }
            }
        };

        appStore.addDemand(demand);
        setIsApprovalModalOpen(false);
        alert("Solicitação enviada para a Mesa de Negociação! Acompanhe em 'Minhas Solicitações'.");
        setRealTpv('');
        setJustification('');
    };

    return (
        <div className="animate-fade-in relative">
            <header className="flex flex-col md:flex-row justify-between items-end gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-brand-gray-900 tracking-tight">Gerador de Proposta</h2>
                    <p className="text-brand-gray-600 text-sm mt-1">Selecione a faixa de faturamento para gerar as condições comerciais.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 bg-white border border-brand-gray-200 text-brand-gray-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-brand-gray-50 transition-colors shadow-sm">
                        <Printer size={16} /> Imprimir
                    </button>
                    <button className="flex items-center gap-2 bg-brand-gray-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-black transition-colors shadow-lg">
                        <Download size={16} /> Baixar PDF
                    </button>
                </div>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                 {/* LEFT COLUMN: CONTROLS (4 Cols) */}
                 <div className="lg:col-span-4 space-y-6">
                     <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-gray-100">
                          <h3 className="font-bold text-lg text-brand-gray-900 mb-6 flex items-center gap-2">
                               <Calculator className="w-5 h-5 text-brand-primary" />
                               Configuração
                          </h3>
                          
                          <div className="space-y-5">
                               <div>
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Nome do Cliente</label>
                                    <input 
                                        type="text" 
                                        className="w-full border border-brand-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                                        placeholder="Ex: Oficina do João"
                                        value={rangeClientName}
                                        onChange={(e) => setRangeClientName(e.target.value)}
                                    />
                               </div>
                               
                               <div>
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Faixa de TPV (Tabela Range)</label>
                                    <div className="relative">
                                         <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray-400" />
                                         <select 
                                              className="w-full pl-10 border border-brand-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none font-bold text-brand-gray-800 bg-white appearance-none"
                                              value={selectedRangeId}
                                              onChange={(e) => setSelectedRangeId(Number(e.target.value))}
                                         >
                                            {TPV_RANGES.map(range => (
                                                <option key={range.id} value={range.id}>{range.label}</option>
                                            ))}
                                         </select>
                                    </div>
                                    <p className="text-[10px] text-brand-gray-400 mt-1 ml-1">
                                        * Selecione a faixa para aplicar o desconto automático.
                                    </p>
                               </div>

                               <div>
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-2">Modelo de Taxas</label>
                                    <div className="grid grid-cols-2 gap-2">
                                         <button 
                                            onClick={() => setRangePlan('Full')}
                                            className={`py-3 px-2 text-xs font-bold rounded-xl transition-all border-2 flex flex-col items-center justify-center gap-1
                                                ${rangePlan === 'Full' 
                                                    ? 'bg-green-50 border-green-500 text-green-700 shadow-sm' 
                                                    : 'bg-white border-transparent text-gray-500 hover:bg-gray-50'}`}
                                         >
                                            <Zap size={18} className={rangePlan === 'Full' ? 'fill-current' : ''} />
                                            FULL (D+1)
                                         </button>
                                         <button 
                                            onClick={() => setRangePlan('Simples')}
                                            className={`py-3 px-2 text-xs font-bold rounded-xl transition-all border-2 flex flex-col items-center justify-center gap-1
                                                ${rangePlan === 'Simples' 
                                                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' 
                                                    : 'bg-white border-transparent text-gray-500 hover:bg-gray-50'}`}
                                         >
                                            <Calendar size={18} className={rangePlan === 'Simples' ? 'fill-current' : ''} />
                                            SIMPLES (Agenda)
                                         </button>
                                    </div>
                               </div>
                          </div>

                          <div className="mt-8 pt-6 border-t border-brand-gray-100">
                               <button 
                                    onClick={() => setIsApprovalModalOpen(true)}
                                    className="w-full py-3 bg-brand-gray-50 text-brand-gray-700 border border-brand-gray-200 rounded-xl font-bold text-xs hover:bg-brand-gray-100 hover:text-brand-primary transition-colors flex items-center justify-center gap-2 group"
                               >
                                    <AlertTriangle className="w-4 h-4 text-yellow-500 group-hover:text-brand-primary transition-colors" />
                                    Solicitação de Aprovação
                               </button>
                               <p className="text-[10px] text-center text-brand-gray-400 mt-2 leading-tight">
                                   Use quando o EC faturar <strong>menos</strong> que a faixa selecionada, mas necessitar das taxas daquele range.
                               </p>
                          </div>
                     </div>
                 </div>

                 {/* RIGHT COLUMN: PREVIEW (8 Cols) */}
                 <div className="lg:col-span-8 flex justify-center bg-gray-100 rounded-2xl p-4 md:p-8 overflow-hidden shadow-inner border border-gray-200">
                      
                      {/* --- PROPOSAL DOCUMENT --- */}
                      <div className="bg-white w-full max-w-[600px] shadow-2xl relative flex flex-col min-h-[800px] transform transition-transform hover:scale-[1.01] duration-500 origin-top">
                            
                            {/* HEADER - BRANDING */}
                            <div className="bg-[#1A1B1E] h-28 flex items-center justify-between px-8 relative overflow-hidden shrink-0">
                                {/* Logo Wrapper */}
                                <div className="relative z-10 text-white transform scale-90 origin-left">
                                    <Logo className="text-white" />
                                </div>
                                
                                <div className="relative z-10 text-right">
                                    <h2 className="text-xl font-bold uppercase tracking-widest text-white">Proposta Comercial</h2>
                                    <p className="text-xs text-gray-400 font-medium tracking-wide mt-1">Soluções de Pagamento</p>
                                </div>

                                {/* Abstract Decor */}
                                <div className="absolute -right-10 -top-20 w-64 h-64 bg-brand-primary rounded-full opacity-10 blur-3xl"></div>
                            </div>

                            {/* HERO SECTION - IMAGE & INTRO */}
                            <div className="p-8 pb-4 relative">
                                <div className="flex flex-col md:flex-row items-center gap-6">
                                    <div className="flex-1 space-y-2">
                                        <span className="inline-block px-3 py-1 rounded-full bg-brand-light/10 text-brand-primary text-[10px] font-bold uppercase tracking-wider border border-brand-light/20">
                                            Plano Selecionado
                                        </span>
                                        <h1 className="text-3xl font-bold text-brand-gray-900 leading-tight">
                                            {rangePlan === 'Full' ? 'Plano Full' : 'Plano Simples'}
                                        </h1>
                                        <p className="text-sm text-brand-gray-500 leading-relaxed">
                                            Prepare-se para acelerar suas vendas com a tecnologia e segurança da Pagmotors. Confira as condições exclusivas para <strong className="text-brand-gray-900 uppercase">{rangeClientName || 'sua empresa'}</strong>.
                                        </p>
                                    </div>
                                    <div className="w-40 h-40 relative flex-shrink-0 flex items-center justify-center">
                                        {/* 3D Payment Terminal Image Simulation - PUBLIC RELIABLE URLs */}
                                        {imgError ? (
                                            <div className="w-full h-full bg-brand-gray-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-brand-gray-200">
                                                <CreditCard className="w-16 h-16 text-brand-primary/50" />
                                            </div>
                                        ) : (
                                            <>
                                                <img 
                                                    src="https://cdn3d.iconscout.com/3d/free/thumb/free-payment-terminal-3877926-3229665.png?f=webp"
                                                    alt="Pagmotors Terminal"
                                                    className="w-full h-full object-contain drop-shadow-2xl transform rotate-[-10deg] hover:rotate-0 transition-transform duration-500"
                                                    onError={() => setImgError(true)}
                                                />
                                                {/* Floating Coins Effect */}
                                                <img 
                                                    src="https://cdn3d.iconscout.com/3d/free/thumb/free-coin-3877925-3229664.png?f=webp"
                                                    className="absolute -top-2 -right-4 w-12 h-12 animate-bounce-slow drop-shadow-lg"
                                                    alt="Coin"
                                                    onError={(e) => e.currentTarget.style.display = 'none'}
                                                />
                                                <img 
                                                    src="https://cdn3d.iconscout.com/3d/free/thumb/free-coin-3877925-3229664.png?f=webp"
                                                    className="absolute bottom-2 -left-2 w-8 h-8 animate-bounce-slow delay-700 drop-shadow-lg"
                                                    alt="Coin"
                                                    onError={(e) => e.currentTarget.style.display = 'none'}
                                                />
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* BENEFITS GRID */}
                            <div className="px-8 py-2">
                                <div className="bg-brand-gray-50 rounded-2xl p-6 border border-brand-gray-100">
                                    <h3 className="text-xs font-bold text-brand-gray-400 uppercase tracking-widest mb-4">
                                        Vantagens Exclusivas
                                    </h3>
                                    <ul className="grid grid-cols-1 gap-3">
                                        {getBenefitsList(rangePlan).map((benefit, idx) => (
                                            <li key={idx} className="flex items-start text-sm text-brand-gray-700 font-medium">
                                                <div className="bg-green-100 text-green-600 rounded-full p-0.5 mr-3 mt-0.5 shrink-0">
                                                    <CheckCircle2 className="w-3 h-3" strokeWidth={4} />
                                                </div>
                                                <span className="leading-snug">{benefit}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* RATES TABLE */}
                            <div className="p-8 pt-4 flex-1 flex flex-col">
                                <div className="mb-4 flex items-end justify-between">
                                    <h3 className="text-lg font-bold text-brand-gray-900">Condições Comerciais</h3>
                                    <div className="text-right">
                                        <span className="text-[10px] text-brand-gray-400 font-bold uppercase block">Enquadramento</span>
                                        <span className="text-xs font-mono font-bold text-brand-gray-700 bg-brand-gray-100 px-2 py-0.5 rounded">
                                            {selectedRange.label}
                                        </span>
                                    </div>
                                </div>

                                <div className="border border-brand-gray-200 rounded-xl overflow-hidden shadow-sm flex-1">
                                    {/* Table Header */}
                                    <div className="bg-brand-gray-900 flex text-white text-xs font-bold uppercase tracking-wider">
                                        <div className="w-1/2 py-3 px-6 border-r border-white/10">Modalidade / Parcela</div>
                                        <div className="w-1/2 py-3 px-6 text-right">Taxa (%)</div>
                                    </div>
                                    
                                    {/* Table Body */}
                                    <div className="divide-y divide-brand-gray-100 bg-white">
                                        {getRangeRates(rangePlan, selectedRange.discount).map((row, idx) => (
                                            <div key={idx} className="flex items-center text-sm group hover:bg-brand-gray-50 transition-colors">
                                                {/* Left Column: Red Accent Line + Text */}
                                                <div className="w-1/2 py-2.5 px-6 font-bold text-brand-gray-700 border-r border-brand-gray-100 relative overflow-hidden">
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    {row.label}
                                                </div>
                                                {/* Right Column: Value */}
                                                <div className="w-1/2 py-2.5 px-6 text-right font-mono font-bold text-brand-gray-900">
                                                    {row.rate.toFixed(2)}%
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Disclaimer for Simples */}
                                {rangePlan === 'Simples' && (
                                    <div className="mt-4 text-[10px] text-brand-gray-500 bg-brand-gray-50 p-3 rounded-lg border border-brand-gray-200">
                                        <p className="flex items-center gap-1">
                                            <span className="font-bold text-brand-primary">*</span>
                                            Solicitação de antecipação deve ser realizada até as 15:00 horas para pagamento no mesmo dia.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* FOOTER - CONSULTANT */}
                            <div className="mt-auto bg-white border-t border-brand-gray-200 p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-brand-gray-100 rounded-full border-2 border-white shadow-md flex items-center justify-center text-brand-gray-400">
                                        <User className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-brand-gray-400 font-bold uppercase tracking-wider">Consultor Responsável</p>
                                        <p className="text-sm font-bold text-brand-gray-900">Cleiton Freitas</p>
                                        <div className="flex items-center gap-3 text-xs text-brand-gray-600 mt-0.5">
                                            <span className="flex items-center gap-1"><Phone size={12}/> (11) 98940-7547</span>
                                            <span className="flex items-center gap-1"><Mail size={12}/> cleiton.freitas@car10.com.br</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <img src="https://logodownload.org/wp-content/uploads/2019/08/webmotors-logo-2.png" alt="Webmotors" className="h-6 opacity-50 grayscale hover:grayscale-0 transition-all" />
                                </div>
                            </div>
                            
                            {/* Legal Strip */}
                            <div className="bg-brand-gray-900 text-white/30 text-[8px] p-2 text-center uppercase tracking-[0.2em]">
                                Documento Confidencial • Webmotors Serviços Financeiros
                            </div>
                      </div>
                 </div>
            </div>

            {/* --- APPROVAL REQUEST MODAL --- */}
            {isApprovalModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-brand-gray-900 px-6 py-4 flex justify-between items-center text-white">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                                Solicitação de Exceção
                            </h3>
                            <button onClick={() => setIsApprovalModalOpen(false)} className="text-brand-gray-400 hover:text-white"><X size={20}/></button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-brand-gray-600 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                                Você selecionou a faixa <strong>{selectedRange.label}</strong>, mas o cliente não atinge esse faturamento? Preencha o volume real para análise da mesa.
                            </p>

                            <div>
                                <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Volume Real (R$)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray-400" />
                                    <input 
                                        type="text" 
                                        className="w-full pl-10 border border-brand-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none font-bold text-brand-gray-800"
                                        placeholder="0,00"
                                        value={realTpv}
                                        onChange={(e) => setRealTpv(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Justificativa</label>
                                <textarea 
                                    className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none resize-none h-24"
                                    placeholder="Por que devemos aprovar essa exceção?"
                                    value={justification}
                                    onChange={(e) => setJustification(e.target.value)}
                                />
                            </div>

                            <button 
                                onClick={handleSendApproval}
                                className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold mt-2 hover:bg-brand-dark transition-colors flex items-center justify-center gap-2 shadow-md"
                            >
                                <Send className="w-4 h-4" />
                                Enviar para Mesa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- MAIN PRICING PAGE (WITH TABS) ---
const PricingPage: React.FC<PricingPageProps> = ({ role }) => {
    const [activeTab, setActiveTab] = useState<'RANGE' | 'SIMULATOR' | 'REQUESTS'>('RANGE');

    return (
        <div className="bg-[#F8F9FC] min-h-screen">
            {/* Header Tabs */}
            <div className="sticky top-0 z-30 bg-white border-b border-brand-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    <div className="flex gap-8 overflow-x-auto">
                        <button 
                            onClick={() => setActiveTab('RANGE')}
                            className={`flex items-center gap-2 py-4 border-b-2 transition-all text-sm font-bold whitespace-nowrap
                                ${activeTab === 'RANGE' 
                                    ? 'border-brand-primary text-brand-primary' 
                                    : 'border-transparent text-brand-gray-500 hover:text-brand-gray-800'
                                }`}
                        >
                            <Table size={18} />
                            Tabela Range
                        </button>
                        <button 
                            onClick={() => setActiveTab('SIMULATOR')}
                            className={`flex items-center gap-2 py-4 border-b-2 transition-all text-sm font-bold whitespace-nowrap
                                ${activeTab === 'SIMULATOR' 
                                    ? 'border-brand-primary text-brand-primary' 
                                    : 'border-transparent text-brand-gray-500 hover:text-brand-gray-800'
                                }`}
                        >
                            <Calculator size={18} />
                            Simulador de Taxas
                        </button>
                        <button 
                            onClick={() => setActiveTab('REQUESTS')}
                            className={`flex items-center gap-2 py-4 border-b-2 transition-all text-sm font-bold whitespace-nowrap
                                ${activeTab === 'REQUESTS' 
                                    ? 'border-brand-primary text-brand-primary' 
                                    : 'border-transparent text-brand-gray-500 hover:text-brand-gray-800'
                                }`}
                        >
                            <List size={18} />
                            Minhas Solicitações
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto p-4 md:p-8">
                {activeTab === 'RANGE' && <ProposalGenerator role={role} />}
                {activeTab === 'SIMULATOR' && (
                    <div className="animate-fade-in">
                        <ConfigTaxasPage />
                    </div>
                )}
                {activeTab === 'REQUESTS' && (
                    <div className="animate-fade-in">
                        <ResultadosPage currentUser={role === UserRole.GESTOR ? 'Gestor' : 'Eu'} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default PricingPage;
