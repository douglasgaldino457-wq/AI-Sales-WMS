
import React, { useState, useRef, useEffect } from 'react';
import { UserRole } from '../types';
import { 
    CheckCircle2, User, Phone, Mail, DollarSign, Calculator, 
    Smartphone, CreditCard, Download, Printer, Share2, Zap, Calendar, AlertCircle,
    Table, List, PieChart, LayoutList, Send, AlertTriangle, ArrowRight, X, Loader2, Star, ShieldCheck, Rocket, Lock,
    Award, ThumbsUp, FileText, UploadCloud, Image as ImageIcon, Search, Briefcase, FileInput, Trash2, Sparkles, Image, Percent, Info
} from 'lucide-react';
import { PagmotorsLogo } from '../components/Logo';
import { CurrencyInput } from '../components/CurrencyInput';
import { appStore } from '../services/store';
import { extractRatesFromEvidence } from '../services/geminiService';
import { ManualDemand, RateRangesConfig, TpvRange } from '../types';

interface PricingPageProps {
  role: UserRole | null;
}

const ACQUIRERS = [
    'Getnet', 'Cielo', 'Rede', 'Stone', 'Pinpag', 'PagSeguro', 
    'Banco Rendimento', 'Listo', 'PagVeloz', 'PicPay', 'Ton', 'InfinitePay', 'Outra'
];

// Generate labels for FULL plan
const FULL_LABELS = [
    'Débito', '1x', '2x', '3x', '4x', '5x', '6x', '7x', '8x', '9x', '10x', '11x', '12x', '13x', '14x', '15x', '16x', '17x', '18x'
];

// --- BRAND ICONS (Card Style) ---
interface BrandCardProps {
    width?: string;
    children: React.ReactNode;
}

const BrandCard: React.FC<BrandCardProps> = ({ children, width = "w-12" }) => (
    <div className={`${width} h-8 bg-white border border-gray-200 rounded shadow-sm flex items-center justify-center p-1 shrink-0 overflow-hidden`}>
        {children}
    </div>
);

const BrandIcons = () => (
    <div className="flex flex-col items-center gap-3">
        <p className="text-[10px] font-bold text-brand-gray-500 uppercase tracking-widest text-center border-b border-gray-100 pb-1 w-full max-w-[200px]">
            Aceite as principais bandeiras
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 px-4 max-w-sm">
            {/* VISA */}
            <BrandCard>
               <svg viewBox="0 0 36 12" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.633 0.185547L9.93262 9.24355H7.43262L4.54297 2.12855C4.38281 1.52855 3.75 0.999547 2.85 0.999547H0.150391V1.42855C0.150391 1.42855 2.13398 1.84155 4.18398 3.09955L5.78398 10.9995H8.38398L12.984 0.185547H13.633ZM21.9326 6.38555C21.9426 4.09955 18.6836 3.97055 18.6926 2.87055C18.6926 2.52855 19.0176 2.17055 19.8926 2.09955C20.3336 2.05655 21.5336 2.02855 22.9336 2.68555L23.4086 0.542547C22.7586 0.313547 21.9176 0.0855469 20.8926 0.0855469C18.2926 0.0855469 16.4426 1.45655 16.4426 3.52855C16.4426 5.04255 17.7926 5.88555 18.7926 6.37055C19.8176 6.87055 20.1676 7.18555 20.1676 7.68555C20.1676 8.45655 19.2676 8.79955 18.3926 8.79955C17.0676 8.79955 16.2926 8.44255 15.6926 8.17055L14.9926 10.3995C15.6676 10.7135 16.9176 10.9995 18.2426 11.0135C20.9926 11.0135 22.8176 9.65655 22.8426 7.51355L22.8336 7.42855C22.8176 7.02855 22.6836 6.67055 21.9326 6.38555ZM29.2336 8.52855L29.9836 4.91355C29.9836 4.91355 30.6336 1.78555 30.7336 1.39955C30.7926 1.15655 30.8256 0.985547 30.8336 0.913547C30.8426 0.770547 30.8256 0.599547 30.8086 0.499547C30.7926 0.385547 30.75 0.285547 30.6836 0.185547H28.4836C27.9336 0.185547 27.4836 0.499547 27.2836 1.01355L23.2836 10.9995H25.9836L26.5336 8.52855H29.2336ZM32.7836 10.9995H35.2336L33.7336 0.185547H31.4336L32.7836 10.9995Z" fill="#1A1F71"/>
                  <path d="M7.42969 0.185547L4.54004 7.25655L4.17304 5.37055L2.83004 0.999547H0.140625L0.130859 1.42855C0.130859 1.42855 2.11404 1.84155 4.16404 3.09955L7.42969 0.185547Z" fill="#1A1F71"/>
               </svg>
            </BrandCard>

            {/* MASTERCARD */}
            <BrandCard>
                <svg viewBox="0 0 36 22" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2.00098" y="0.618652" width="32" height="20.762" fill="#252525" rx="2"/>
                    <circle cx="12.6676" cy="11" r="7.33333" fill="#EB001B"/>
                    <circle cx="23.3343" cy="11" r="7.33333" fill="#F79E1B"/>
                    <path d="M18 15.6327C19.722 14.5933 20.8713 12.7247 20.8713 10.602C20.8713 8.47933 19.722 6.61066 18 5.57129C16.278 6.61066 15.1287 8.47933 15.1287 10.602C15.1287 12.7247 16.278 14.5933 18 15.6327Z" fill="#FF5F00"/>
                    <rect x="2.00098" y="0.618652" width="32" height="20.762" rx="2" fill="none"/>
                </svg>
            </BrandCard>

            {/* ELO */}
            <BrandCard>
                <svg viewBox="0 0 32 32" className="w-full h-full p-1" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="16" cy="16" r="14" fill="#000000"/>
                    <path d="M22.5 12.5C22.5 14.3 21.6 15.9 20.2 16.9L24.5 21.2L22.8 22.9L18.5 18.6C17.5 19.3 16.3 19.7 15 19.7C11 19.7 7.8 16.5 7.8 12.5H11.8C11.8 14.3 13.2 15.7 15 15.7C16.8 15.7 18.2 14.3 18.2 12.5H22.5Z" fill="#FFCB05"/>
                    <path d="M15 5.30005C11 5.30005 7.8 8.50005 7.8 12.5H11.8C11.8 10.7 13.2 9.30005 15 9.30005H22.5C22.5 7.10005 19.1 5.30005 15 5.30005Z" fill="#E53935"/>
                    <path d="M20.2 16.9L18.5 18.6C17.5 19.3 16.3 19.7 15 19.7C11 19.7 7.8 16.5 7.8 12.5H3.5C3.5 18.8 8.7 24 15 24C17.9 24 20.5 22.9 22.5 21.1L24.5 21.2L20.2 16.9Z" fill="#2196F3"/>
                </svg>
            </BrandCard>

            {/* AMEX */}
            <BrandCard>
                <svg viewBox="0 0 36 22" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="36" height="22" rx="2" fill="#006FCF"/>
                    <path d="M22.86 11.23L21.41 8.28003H20.3L19.5 10.77H17.2L15.93 7.87003L14.73 10.77H11.97L9.93002 6.64003H7.43002L9.33002 10.37L7.68002 13.59H9.72002L12.35 11.28L14.88 15.11H17.78L20.12 9.47003H20.17L21.57 15.11H27.53L29.23 8.32003H26.58L25.83 11.33H23.53L22.86 11.23ZM14.93 11.28L15.42 12.35H14.43L14.93 11.28ZM16.27 11.53L16.7 12.51L16.89 12.08L16.27 11.53ZM24.63 11.23H25.33L25.68 9.87003L24.63 11.23Z" fill="white"/>
                    <path d="M12.98 9.28003L12.63 8.43003H13.23L12.98 9.28003Z" fill="white"/>
                </svg>
            </BrandCard>

            {/* HIPERCARD */}
            <BrandCard>
                <svg viewBox="0 0 36 22" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="1" width="32" height="20" rx="2" fill="#B71C1C"/>
                    <path d="M7 6H12V9H16V6H21V16H16V13H12V16H7V6Z" fill="#FFEB3B"/>
                    <path d="M23 6H29V16H23V6Z" fill="#FFEB3B"/>
                </svg>
            </BrandCard>
        </div>
    </div>
);

// --- PRICING PAGE COMPONENT (TABELA RANGE) ---
const PricingPage: React.FC<PricingPageProps> = ({ role }) => {
    // Tab State
    const [activeTab, setActiveTab] = useState<'RANGE' | 'QUOTE'>('RANGE');

    // State for Proposal Generator
    const [rangeClientName, setRangeClientName] = useState('');
    const [selectedRangeId, setSelectedRangeId] = useState<number>(0); 
    const [rangePlan, setRangePlan] = useState<'Full' | 'Simples'>('Full');
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    
    // --- LOAD DYNAMIC RATES ---
    const [rateRanges, setRateRanges] = useState<RateRangesConfig>(appStore.getRateRangesConfig());
    const [tpvRanges] = useState<TpvRange[]>(appStore.TPV_RANGES);

    // Refresh rates when component mounts (in case they changed in Config)
    useEffect(() => {
        setRateRanges(appStore.getRateRangesConfig());
    }, [activeTab]);

    // Quote Form State - Updated types for numeric fields
    const [quoteForm, setQuoteForm] = useState({
        document: '',
        tradeName: '',
        tpvPotential: '' as string | number, // Changed to allow number
        minAgreed: '' as string | number, // Changed to allow number
        acquirer: 'Getnet',
        type: 'Oficina' as 'Oficina' | 'Revenda',
        plan: 'Full' as 'Full' | 'Simples',
        evidenceMode: 'RATE' as 'RATE' | 'SIMULATION',
        simulationValue: '' as string | number // Changed to allow number
    });
    
    // --- FLUID NAVIGATION CHECK ---
    useEffect(() => {
        const storedContext = sessionStorage.getItem('temp_pricing_context');
        if (storedContext) {
            try {
                const data = JSON.parse(storedContext);
                setActiveTab('QUOTE'); // Switch to Quote tab
                setQuoteForm(prev => ({
                    ...prev,
                    tradeName: data.clientName || '',
                    document: data.document || '',
                    tpvPotential: data.potential || ''
                }));
                // Clear after consuming
                sessionStorage.removeItem('temp_pricing_context');
            } catch(e) {
                console.error("Error parsing context", e);
            }
        }
    }, []);

    const [mixValues, setMixValues] = useState<Record<string, string>>({});
    const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
    const [aiProcessing, setAiProcessing] = useState(false);
    const [analysisSuccess, setAnalysisSuccess] = useState(false);
    const [extractedRates, setExtractedRates] = useState<any>(null);
    const fileInputRefQuote = useRef<HTMLInputElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Approval Modal State
    const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
    const [realTpv, setRealTpv] = useState<number | string>(''); // Changed to allow number
    const [justification, setJustification] = useState('');

    const selectedRange = tpvRanges.find(r => r.id === selectedRangeId) || tpvRanges[0];
    const printRef = useRef<HTMLDivElement>(null);

    // HELPER: Retrieve rates based on plan and range (DYNAMIC)
    const getRangeRates = (plan: 'Full' | 'Simples', rangeId: number) => {
        if (plan === 'Full') {
            const rates = rateRanges.full[rangeId] || rateRanges.full[0];
            const rows = [
                { label: 'Débito', rate: rates?.debit || 0, highlight: true },
                { label: 'Crédito à vista (1x)', rate: rates?.credit1x || 0, highlight: true }
            ];
            
            if (rates?.installments) {
                rates.installments.forEach((rate, idx) => {
                    rows.push({
                        label: `Crédito ${idx + 2}x`,
                        rate: rate,
                        highlight: false
                    });
                });
            }
            return { rows, lastUpdated: rates?.lastUpdated };
        } else {
            const rates = rateRanges.simples[rangeId] || rateRanges.simples[0];
            return {
                rows: [
                    { label: 'Débito', rate: rates?.debit || 0, highlight: true },
                    { label: 'Crédito 1x', rate: rates?.credit1x || 0, highlight: true },
                    { label: 'Crédito 2x - 6x', rate: rates?.credit2x6x || 0, highlight: false },
                    { label: 'Crédito 7x - 12x', rate: rates?.credit7x12x || 0, highlight: false },
                    { label: 'Crédito 13x - 18x', rate: rates?.credit13x18x || 0, highlight: false },
                ],
                lastUpdated: rates?.lastUpdated
            };
        }
    };

    useEffect(() => {
        setMixValues({});
        if (quoteForm.plan === 'Simples') {
            setQuoteForm(prev => ({ ...prev, evidenceMode: 'RATE' }));
        }
    }, [quoteForm.plan]);

    // ... (Keep existing handlers intact: handleMixChange, handleClientSearch, etc.) ...
    // Note: Re-implementing them briefly to ensure file consistency
    const handleMixChange = (key: string, value: string) => {
        let clean = value.replace(/[^\d,]/g, '');
        const parts = clean.split(',');
        if (parts.length > 2) clean = parts[0] + ',' + parts[1];
        if (parts[1] && parts[1].length > 1) clean = parts[0] + ',' + parts[1].substring(0, 1);
        setMixValues(prev => ({ ...prev, [key]: clean }));
    };

    const totalMix = Object.values(mixValues).reduce((acc: number, val: string) => acc + (parseFloat(val.replace(',', '.') || '0')), 0);

    const handleClientSearch = (val: string) => {
        const foundClient = appStore.getClients().find(c => c.id.toLowerCase() === val.toLowerCase() || c.cnpj?.replace(/\D/g, '') === val.replace(/\D/g, ''));
        if (foundClient) {
            setQuoteForm(prev => ({ ...prev, tradeName: foundClient.nomeEc, document: foundClient.cnpj || prev.document, tpvPotential: foundClient.leadMetadata?.revenuePotential || '' }));
        }
        setQuoteForm(prev => ({ ...prev, document: val }));
    };

    const getBenefitsList = (plan: string) => {
        if (plan === 'Full') {
            return [
                { icon: Zap, text: "Pagamento D+0", sub: "Receba o valor total das vendas no mesmo dia." },
                { icon: Rocket, text: "Prioridade Leads", sub: "Mais fluxo da Webmotors direcionado para você." },
                { icon: ShieldCheck, text: "Taxa Padrão", sub: "Taxa única para todas as bandeiras de cartão" },
                { icon: Award, text: "Suporte VIP", sub: "Atendimento exclusivo e dedicado para seu negócio." },
            ];
        } else {
             return [
                { icon: Calendar, text: "Pagamento Agenda", sub: "Fluxo de caixa programado conforme parcelamento." },
                { icon: Rocket, text: "Prioridade Leads", sub: "Mais fluxo da Webmotors direcionado para você." },
                { icon: ShieldCheck, text: "Taxa Padrão", sub: "Taxa única para todas as bandeiras de cartão" },
                { icon: ThumbsUp, text: "Antecipação Flex", sub: "Disponível a 3.95% a.m quando precisar." }
            ];
        }
    };

    const handleSendApproval = () => {
        if (!realTpv || !rangeClientName) { alert("Preencha o Nome do Cliente e o Volume Real."); return; }
        setIsSubmitting(true);
        setTimeout(() => {
            const demand: ManualDemand = {
                id: `APR-${Math.floor(Math.random() * 10000)}`,
                clientName: rangeClientName,
                type: 'Aprovação de Exceção (Range)',
                date: new Date().toISOString(),
                status: 'Em Análise',
                requester: role === UserRole.FIELD_SALES ? 'Cleiton Freitas' : 'Usuário Atual',
                description: `Solicitação de enquadramento na faixa "${selectedRange.label}" com volume real de R$ ${Number(realTpv).toLocaleString('pt-BR')}. Justificativa: ${justification}`,
                pricingData: { competitorRates: { debit: 0, credit1x: 0, credit12x: 0 }, proposedRates: { debit: 0, credit1x: 0, credit12x: 0 }, context: { potentialRevenue: Number(realTpv), minAgreed: 0 } }
            };
            appStore.addDemand(demand);
            setIsApprovalModalOpen(false);
            alert("Solicitação enviada para a Mesa de Negociação! Acompanhe em 'Minhas Solicitações'.");
            setRealTpv(''); setJustification(''); setIsSubmitting(false);
        }, 1000);
    };

    const handleDownloadImage = async () => {
        if (!printRef.current) return;
        setIsGeneratingPdf(true);
        try {
            // @ts-ignore
            const html2canvas = window.html2canvas;
            if (!html2canvas) { alert("Bibliotecas de Imagem não carregadas."); return; }
            const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', width: 794, height: 1123, windowWidth: 1200 });
            const link = document.createElement('a');
            link.download = `Proposta_${rangeClientName || 'Pagmotors'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) { console.error(error); alert("Erro ao gerar imagem."); } finally { setIsGeneratingPdf(false); }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) setEvidenceFiles(prev => [...prev, ...Array.from(e.target.files || [])]); };
    const handleRemoveFile = (index: number) => { setEvidenceFiles(prev => prev.filter((_, i) => i !== index)); };

    const handleAnalyzeEvidence = async () => {
        if (evidenceFiles.length === 0) { alert("Anexe pelo menos uma imagem."); return; }
        setAiProcessing(true); setAnalysisSuccess(false);
        try {
            const base64Promises = evidenceFiles.map(file => new Promise<string>((resolve, reject) => {
                const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result as string); reader.onerror = error => reject(error);
            }));
            const base64Files = await Promise.all(base64Promises);
            const cleanBase64 = base64Files.map(s => s.split(',')[1]);
            const simValue = quoteForm.evidenceMode === 'SIMULATION' ? Number(quoteForm.simulationValue) : undefined;
            const result = await extractRatesFromEvidence(cleanBase64, quoteForm.plan, simValue);
            if (result) { setExtractedRates(result); setAnalysisSuccess(true); } else { alert("Não foi possível extrair as taxas."); }
        } catch (error) { console.error(error); alert("Erro ao processar evidências."); } finally { setAiProcessing(false); }
    };

    const handleSubmitQuote = () => {
        if (!quoteForm.tradeName) { alert("Preencha os dados do cliente."); return; }
        setIsSubmitting(true);
        setTimeout(() => {
            const safeRates = (extractedRates as any) || {};
            const demand: ManualDemand = {
                id: `COT-${Math.floor(Math.random() * 10000)}`,
                clientName: quoteForm.tradeName,
                type: 'Negociação de Taxas',
                date: new Date().toISOString(),
                status: 'Em Análise',
                requester: role === UserRole.FIELD_SALES ? 'Cleiton Freitas' : 'Usuário Atual',
                description: `Solicitação via Cotação. Adquirente: ${quoteForm.acquirer}. Plano: ${quoteForm.plan}.`,
                pricingData: { competitorRates: { debit: Number(safeRates.debit) || 0, credit1x: Number(safeRates.credit1x) || 0, credit12x: Number(safeRates.credit12x) || 0 }, proposedRates: { debit: 0, credit1x: 0, credit12x: 0 }, context: { potentialRevenue: Number(quoteForm.tpvPotential) || 0, minAgreed: Number(quoteForm.minAgreed) || 0 }, evidenceUrl: 'https://via.placeholder.com/300' }
            };
            appStore.addDemand(demand);
            alert("Cotação enviada para análise! Acompanhe em 'Minhas Solicitações'.");
            setQuoteForm({ ...quoteForm, tradeName: '', document: '' });
            setExtractedRates(null); setEvidenceFiles([]); setIsSubmitting(false);
        }, 1000);
    };

    const { rows: rates, lastUpdated } = getRangeRates(rangePlan, selectedRange.id);

    // UX Helper to handle auto-focus on select
    const handleFocusSelect = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-end gap-4 no-print">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900">Simulador de Pricing</h1>
                    <p className="text-brand-gray-600 text-sm">Geração de propostas e simulações comerciais.</p>
                </div>
                <div className="flex bg-brand-gray-200 p-1 rounded-xl overflow-x-auto">
                    <button onClick={() => setActiveTab('RANGE')} className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'RANGE' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}><Calculator className="w-4 h-4 mr-2" /> Taxa Range</button>
                    <button onClick={() => setActiveTab('QUOTE')} className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'QUOTE' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}><Briefcase className="w-4 h-4 mr-2" /> Cotação de Taxas</button>
                </div>
            </header>

            {activeTab === 'QUOTE' && (
                <div className="animate-fade-in bg-white rounded-2xl shadow-sm border border-brand-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-brand-gray-100 bg-brand-gray-50/50 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-brand-gray-900 flex items-center gap-2">
                            <Briefcase className="w-6 h-6 text-brand-primary" /> Nova Cotação Personalizada
                        </h2>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                        <div className="p-6 space-y-6 border-r border-brand-gray-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Buscar Cliente</label>
                                    <div className="flex gap-2">
                                        <input type="text" className="flex-1 border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none" value={quoteForm.document} onChange={e => handleClientSearch(e.target.value)} placeholder="CNPJ ou ID..." autoFocus />
                                        <button className="bg-brand-gray-100 text-brand-gray-600 px-3 rounded-lg"><Search className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Nome Fantasia *</label>
                                    <input type="text" className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm outline-none" value={quoteForm.tradeName} onChange={e => setQuoteForm({...quoteForm, tradeName: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Potencial TPV</label>
                                    <CurrencyInput className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="R$ 0,00" value={quoteForm.tpvPotential} onChange={val => setQuoteForm({...quoteForm, tpvPotential: val})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Mínimo Acordado</label>
                                    <CurrencyInput className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="R$ 0,00" value={quoteForm.minAgreed} onChange={val => setQuoteForm({...quoteForm, minAgreed: val})} />
                                </div>
                            </div>
                            <div className="pt-4 border-t border-brand-gray-100 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Adquirente</label>
                                    <select className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm bg-white" value={quoteForm.acquirer} onChange={e => setQuoteForm({...quoteForm, acquirer: e.target.value})}>
                                        {ACQUIRERS.map(acq => <option key={acq} value={acq}>{acq}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-2">Plano Alvo</label>
                                    <div className="flex bg-brand-gray-100 p-1 rounded-lg">
                                        <button onClick={() => setQuoteForm({...quoteForm, plan: 'Full'})} className={`flex-1 text-xs py-1.5 rounded font-bold transition-all ${quoteForm.plan === 'Full' ? 'bg-white shadow text-green-600' : 'text-brand-gray-500'}`}>FULL</button>
                                        <button onClick={() => setQuoteForm({...quoteForm, plan: 'Simples'})} className={`flex-1 text-xs py-1.5 rounded font-bold transition-all ${quoteForm.plan === 'Simples' ? 'bg-white shadow text-blue-600' : 'text-brand-gray-500'}`}>SIMPLES</button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase">Tipo de Leitura IA</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="evidenceMode" checked={quoteForm.evidenceMode === 'RATE'} onChange={() => setQuoteForm({...quoteForm, evidenceMode: 'RATE'})} className="text-brand-primary focus:ring-brand-primary" />
                                            <span className="text-sm text-brand-gray-700">Taxa Explícita</span>
                                        </label>
                                        <label className={`flex items-center gap-2 cursor-pointer ${quoteForm.plan === 'Simples' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            <input type="radio" name="evidenceMode" checked={quoteForm.evidenceMode === 'SIMULATION'} onChange={() => { if (quoteForm.plan !== 'Simples') setQuoteForm({...quoteForm, evidenceMode: 'SIMULATION'}); }} disabled={quoteForm.plan === 'Simples'} className="text-brand-primary focus:ring-brand-primary" />
                                            <span className="text-sm text-brand-gray-700">Simulação de Venda</span>
                                        </label>
                                    </div>
                                    {quoteForm.plan === 'Simples' && <p className="text-[10px] text-orange-600 flex items-center gap-1 bg-orange-50 p-1.5 rounded border border-orange-100"><Info className="w-3 h-3" /> Simulação disponível apenas no plano Full.</p>}
                                </div>
                                {quoteForm.evidenceMode === 'SIMULATION' && (
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                        <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Valor da Simulação (R$)</label>
                                        <CurrencyInput className="w-full border border-blue-200 rounded px-2 py-1 text-sm outline-none" placeholder="R$ 100,00" value={quoteForm.simulationValue} onChange={val => setQuoteForm({...quoteForm, simulationValue: val})} />
                                        <p className="text-[10px] text-blue-600 mt-1">Informe o valor total da venda usada na simulação para cálculo reverso.</p>
                                    </div>
                                )}
                                <div className="border-2 border-dashed border-brand-gray-300 rounded-xl p-4 flex flex-col items-center justify-center bg-brand-gray-50 cursor-pointer" onClick={() => fileInputRefQuote.current?.click()}>
                                    <UploadCloud className="w-6 h-6 text-brand-gray-400 mb-1" />
                                    <p className="text-xs text-brand-gray-600 font-bold">Anexar Evidências (IA)</p>
                                    <input type="file" multiple className="hidden" ref={fileInputRefQuote} onChange={handleFileUpload} accept="image/*,.pdf" />
                                </div>
                                {evidenceFiles.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            {evidenceFiles.map((file, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-white border border-brand-gray-200 p-2 rounded-lg text-xs">
                                                    <span className="truncate max-w-[180px] text-brand-gray-700 font-medium">{file.name}</span>
                                                    <button onClick={() => handleRemoveFile(idx)} className="text-brand-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                        </div>
                                        <button onClick={handleAnalyzeEvidence} disabled={aiProcessing} className="w-full bg-brand-gray-900 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors">
                                            {aiProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                            {aiProcessing ? 'IA Analisando...' : 'Extrair Taxas'}
                                        </button>
                                        {analysisSuccess && <div className="flex items-center justify-center gap-2 text-green-600 text-xs font-bold bg-green-50 p-2 rounded border border-green-100 animate-fade-in"><CheckCircle2 className="w-4 h-4" /> Com sucesso</div>}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-6 bg-brand-gray-50 flex flex-col h-full">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-brand-gray-900 flex items-center gap-2"><Table className="w-5 h-5 text-brand-primary" /> Tabela de Taxas</h3>
                                {extractedRates && <span className="bg-black text-white px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 uppercase tracking-wide"><Sparkles className="w-3 h-3" /> Dados via IA</span>}
                            </div>
                            <div className="flex-1 bg-white rounded-xl border border-brand-gray-200 overflow-hidden shadow-sm flex flex-col">
                                <div className="overflow-y-auto flex-1">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-brand-gray-100 text-brand-gray-600 font-bold text-xs uppercase sticky top-0 z-10">
                                            <tr>
                                                <th className="px-4 py-2">Modalidade</th>
                                                <th className="px-4 py-2 text-center w-24">Atual (IA)</th>
                                                <th className="px-4 py-2 text-center w-24 bg-yellow-50 text-yellow-800">Mix (%)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-brand-gray-100">
                                            {quoteForm.plan === 'Full' ? (
                                                FULL_LABELS.map(label => {
                                                    const key = label === 'Débito' ? 'debit' : label === '1x' ? 'credit1x' : `credit${label}`;
                                                    const rates: any = extractedRates;
                                                    const valFromRates = rates ? rates[key] : null;
                                                    let extractedVal: number | undefined;
                                                    if (valFromRates !== null && valFromRates !== undefined && valFromRates !== '') {
                                                        const n = Number(valFromRates); if (!isNaN(n)) extractedVal = n;
                                                    }
                                                    const isValid = extractedVal !== undefined;
                                                    const isMissing = !!rates && !isValid;
                                                    const displayValue = isValid && typeof extractedVal === 'number' ? (extractedVal as number).toFixed(2) : (isMissing ? 'N/A' : '');
                                                    return (
                                                        <tr key={label}>
                                                            <td className="px-4 py-2 font-bold text-brand-gray-700 text-xs">{label}</td>
                                                            <td className="px-4 py-2 text-center">
                                                                <input onFocus={handleFocusSelect} className={`w-full text-center text-xs border rounded py-1 outline-none transition-all ${isValid ? 'bg-green-50 border-green-200 text-green-700 font-bold' : isMissing ? 'bg-red-50 border-red-200 text-red-600 font-bold ring-1 ring-red-100' : 'bg-gray-50 border-gray-200 text-gray-400'}`} value={displayValue} placeholder={isMissing ? 'N/A' : '-'} readOnly />
                                                            </td>
                                                            <td className="px-4 py-2 text-center bg-yellow-50/50">
                                                                <div className="relative">
                                                                    <input onFocus={handleFocusSelect} className="w-full text-center text-xs border border-yellow-300 rounded py-1 focus:border-yellow-500 outline-none bg-white font-medium" placeholder="00,0%" value={mixValues[label] || ''} onChange={(e) => handleMixChange(label, e.target.value)} maxLength={5} />
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                ['Débito', '1x', '2x - 6x', '7x - 12x', '13x - 18x'].map(label => {
                                                    let val: number | undefined;
                                                    const rates: any = extractedRates;
                                                    if(rates) {
                                                        let rawVal: any = null;
                                                        if(label === 'Débito') rawVal = rates.debit;
                                                        else if(label === '1x') rawVal = rates.credit1x;
                                                        else if(label.includes('6x')) rawVal = rates.credit6x || rates.credit2x6x;
                                                        else if(label.includes('12x')) rawVal = rates.credit12x || rates.credit7x12x;
                                                        else if(label.includes('18x')) rawVal = rates.credit18x || rates.credit13x18x;
                                                        if (rawVal !== null && rawVal !== undefined && rawVal !== '') { const n = Number(rawVal); if (!isNaN(n)) val = n; }
                                                    }
                                                    const isValid = val !== undefined;
                                                    const isMissing = !!rates && !isValid;
                                                    const displayValue = isValid && typeof val === 'number' ? (val as number).toFixed(2) : (isMissing ? 'N/A' : '');
                                                    return (
                                                        <tr key={label}>
                                                            <td className="px-4 py-2 font-bold text-brand-gray-700 text-xs">{label}</td>
                                                            <td className="px-4 py-2 text-center">
                                                                <input onFocus={handleFocusSelect} className={`w-full text-center text-xs border rounded py-1 outline-none transition-all ${isValid ? 'bg-green-50 border-green-200 text-green-700 font-bold' : isMissing ? 'bg-red-50 border-red-200 text-red-600 font-bold ring-1 ring-red-100' : 'bg-gray-50 border-gray-200 text-gray-400'}`} value={displayValue} placeholder={isMissing ? 'N/A' : '-'} readOnly />
                                                            </td>
                                                            <td className="px-4 py-2 text-center bg-yellow-50/50">
                                                                <input onFocus={handleFocusSelect} className="w-full text-center text-xs border border-yellow-300 rounded py-1 focus:border-yellow-500 outline-none bg-white font-medium" placeholder="00,0%" value={mixValues[label] || ''} onChange={(e) => handleMixChange(label, e.target.value)} maxLength={5} />
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                        <tfoot className="bg-brand-gray-50 border-t border-brand-gray-200 sticky bottom-0">
                                            <tr>
                                                <td className="px-4 py-2 font-bold text-xs text-brand-gray-800 text-right" colSpan={2}>Total Concentração:</td>
                                                <td className={`px-4 py-2 text-center font-bold text-xs ${Math.abs((totalMix as number) - 100) < 0.1 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>{(totalMix as number).toFixed(1)}%</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                            <button onClick={handleSubmitQuote} disabled={isSubmitting} className="w-full bg-brand-primary hover:bg-brand-dark text-white py-3 rounded-xl font-bold mt-4 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4" />}
                                {isSubmitting ? 'Enviando...' : 'Enviar Cotação'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'RANGE' && (
                <div className="animate-fade-in relative">
                    <div className="flex flex-col md:flex-row justify-end items-end gap-4 mb-6 no-print">
                        {/* UPDATE ALERT */}
                        {lastUpdated && new Date(lastUpdated).getMonth() === new Date().getMonth() && (
                            <div className="mr-auto bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm animate-pulse">
                                <Sparkles className="w-4 h-4 text-green-600" />
                                Tabela atualizada recentemente ({new Date(lastUpdated).toLocaleDateString('pt-BR')}).
                            </div>
                        )}

                        <div className="flex justify-end gap-2">
                            <button onClick={() => window.print()} className="flex items-center gap-2 bg-white border border-brand-gray-200 text-brand-gray-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-brand-gray-50 transition-colors shadow-sm"><Printer size={16} /> Imprimir</button>
                            <button onClick={handleDownloadImage} disabled={isGeneratingPdf} className="flex items-center gap-2 bg-brand-gray-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-black transition-colors shadow-lg disabled:opacity-70"><ImageIcon size={16} /> {isGeneratingPdf ? 'Gerando...' : 'Baixar Imagem'}</button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-4 space-y-6 no-print order-1">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-gray-100 sticky top-4">
                                <h3 className="font-bold text-lg text-brand-gray-900 mb-6 flex items-center gap-2"><Calculator className="w-5 h-5 text-brand-primary" /> Configuração</h3>
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Nome do Cliente</label>
                                        <input type="text" className="w-full border border-brand-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none" placeholder="Ex: Oficina do João" value={rangeClientName} onChange={(e) => setRangeClientName(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Faixa de TPV</label>
                                        <select className="w-full border border-brand-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none font-bold text-brand-gray-800 bg-white" value={selectedRangeId} onChange={(e) => setSelectedRangeId(Number(e.target.value))}>
                                            {appStore.TPV_RANGES.map(range => <option key={range.id} value={range.id}>{range.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-2">Modelo</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={() => setRangePlan('Full')} className={`py-3 px-2 text-xs font-bold rounded-xl border-2 flex flex-col items-center justify-center gap-1 ${rangePlan === 'Full' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-transparent text-gray-500'}`}><Zap size={18} /> FULL</button>
                                            <button onClick={() => setRangePlan('Simples')} className={`py-3 px-2 text-xs font-bold rounded-xl border-2 flex flex-col items-center justify-center gap-1 ${rangePlan === 'Simples' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-transparent text-gray-500'}`}><Calendar size={18} /> SIMPLES</button>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8 pt-6 border-t border-brand-gray-100">
                                    <button onClick={() => setIsApprovalModalOpen(true)} className="w-full py-3 bg-brand-gray-50 text-brand-gray-700 border border-brand-gray-200 rounded-xl font-bold text-xs hover:bg-brand-gray-100 flex items-center justify-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500" /> Solicitação de Aprovação</button>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-8 flex justify-center items-start bg-gray-100/50 p-2 md:p-4 rounded-3xl border border-gray-200 order-2">
                            <div ref={printRef} className="bg-white shadow-2xl relative flex flex-col shrink-0 origin-top transform scale-[0.42] md:scale-[0.7] xl:scale-[0.8] 2xl:scale-100 transition-transform duration-500 print:transform-none print:shadow-none" style={{ width: '210mm', minHeight: '297mm', height: '297mm' }}>
                                <div className="bg-gradient-to-r from-brand-primary to-brand-dark h-32 flex items-center justify-between px-12 relative overflow-hidden shrink-0">
                                    <div className="relative z-10 text-white transform scale-110 origin-left"><PagmotorsLogo variant="white" /></div>
                                    <div className="relative z-10 text-right text-white"><h2 className="text-2xl font-bold uppercase tracking-widest">Proposta Comercial</h2><p className="text-sm font-medium tracking-wide mt-1 opacity-80">Soluções de Pagamento</p></div>
                                </div>
                                <div className="flex-1 px-12 py-8 flex flex-col gap-6">
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-6 gap-6">
                                        <div className="text-left flex-1">
                                            <div className="inline-block px-4 py-1.5 rounded-full bg-brand-light/10 text-brand-primary text-xs font-bold uppercase tracking-wider border border-brand-light/20 mb-3">Plano {rangePlan}</div>
                                            <h1 className="text-4xl font-bold text-brand-gray-900 leading-tight mb-2">{rangeClientName || 'Sua Empresa'}</h1>
                                            <p className="text-brand-gray-500 text-sm leading-relaxed max-w-lg">Condições exclusivas para acelerar o crescimento do seu negócio.</p>
                                        </div>
                                        {/* Last Updated Badge on Proposal */}
                                        {lastUpdated && (
                                            <div className="text-right">
                                                <span className="block text-[9px] font-bold text-gray-400 uppercase">Vigência</span>
                                                <span className="block text-xs font-bold text-gray-800">{new Date(lastUpdated).toLocaleDateString('pt-BR', {month:'long', year:'numeric'})}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-row gap-8 mt-2 items-start h-full">
                                        <div className="w-5/12 flex flex-col gap-4">
                                            {getBenefitsList(rangePlan).map((benefit, idx) => (
                                                <div key={idx} className="bg-brand-gray-50 rounded-2xl p-5 border border-brand-gray-100 shadow-sm flex flex-col items-start gap-3">
                                                    <div className="bg-white p-3 rounded-xl text-brand-primary shadow-sm shrink-0"><benefit.icon className="w-8 h-8" strokeWidth={2} /></div>
                                                    <div><p className="text-base font-bold text-brand-gray-900 leading-tight mb-1">{benefit.text}</p><p className="text-xs text-brand-gray-500 leading-relaxed">{benefit.sub}</p></div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="w-7/12 flex flex-col">
                                            <div className="mb-4 flex items-center justify-between px-1"><h3 className="text-base font-bold text-brand-gray-900 border-l-4 border-brand-primary pl-3">Taxas Aprovadas</h3><span className="text-[10px] font-bold text-brand-gray-500 bg-gray-100 px-2 py-1 rounded uppercase tracking-wide">{rangePlan === 'Simples' ? selectedRange.label.replace('Full', 'Simples') : selectedRange.label}</span></div>
                                            <div className="border border-brand-gray-200 rounded-xl overflow-hidden shadow-sm">
                                                <div className="bg-brand-gray-900 flex text-white text-xs font-bold uppercase tracking-wider py-3"><div className="w-2/3 px-5">Modalidade</div><div className="w-1/3 px-5 text-right">Taxa</div></div>
                                                <div className="bg-white divide-y divide-brand-gray-100">
                                                    {rates.map((row, idx) => (
                                                        <div key={idx} className={`flex items-center justify-between px-5 py-2 ${row.highlight ? 'bg-brand-primary/5' : idx % 2 === 0 ? 'bg-white' : 'bg-brand-gray-50/50'}`}>
                                                            <div className={`text-xs ${row.highlight ? 'font-bold text-brand-primary' : 'font-medium text-brand-gray-700'}`}>{row.label}</div>
                                                            <div className={`text-sm font-mono font-bold ${row.highlight ? 'text-brand-primary' : 'text-brand-gray-900'}`}>{row.rate.toFixed(2)}%</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border-t border-gray-100 pt-6 mt-auto"><BrandIcons /></div>
                                </div>
                                <div className="bg-white px-12 py-8 flex items-center justify-between shrink-0 mt-auto">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 bg-brand-gray-50 rounded-full border border-gray-100 flex items-center justify-center text-brand-primary"><User className="w-8 h-8" strokeWidth={1.5} /></div>
                                        <div><p className="text-xs text-brand-gray-400 font-bold uppercase tracking-wider mb-1">Consultor</p><p className="text-xl font-bold text-brand-gray-900 leading-none">Cleiton Freitas</p><div className="flex flex-col gap-1 text-sm text-brand-gray-600 mt-2"><span className="flex items-center gap-2"><Phone size={14} className="text-brand-primary"/> (11) 98940-7547</span></div></div>
                                    </div>
                                </div>
                                <div className="bg-black text-white/60 text-[10px] p-3 text-center font-medium tracking-wide">CAR10 TECNOLOGIA E INFORMAÇÃO S/A</div>
                            </div>
                        </div>
                    </div>

                    {isApprovalModalOpen && (
                        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in no-print">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                                <div className="bg-brand-gray-900 px-6 py-4 flex justify-between items-center text-white">
                                    <h3 className="font-bold text-lg flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-yellow-400" /> Solicitação de Exceção</h3>
                                    <button onClick={() => setIsApprovalModalOpen(false)} className="text-brand-gray-400 hover:text-white"><X size={20}/></button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <p className="text-sm text-brand-gray-600 bg-yellow-50 p-3 rounded-lg border border-yellow-100">Você selecionou a faixa <strong>{selectedRange.label}</strong>. Preencha o volume real para análise.</p>
                                    <div><label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Volume Real (R$)</label><CurrencyInput className="w-full border border-brand-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none" placeholder="R$ 0,00" value={realTpv} onChange={(val) => setRealTpv(val)} /></div>
                                    <div><label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Justificativa</label><textarea className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm outline-none resize-none h-24" placeholder="Motivo..." value={justification} onChange={(e) => setJustification(e.target.value)} /></div>
                                    <button onClick={handleSendApproval} disabled={isSubmitting} className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold mt-2 hover:bg-brand-dark flex items-center justify-center gap-2 disabled:opacity-50">
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4" />}
                                        {isSubmitting ? 'Enviando...' : 'Enviar para Mesa'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PricingPage;
