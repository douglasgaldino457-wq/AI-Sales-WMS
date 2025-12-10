
import React, { useState, useRef } from 'react';
import { UserRole } from '../types';
import { 
    CheckCircle2, User, Phone, Mail, DollarSign, Calculator, 
    Smartphone, CreditCard, Download, Printer, Share2, Zap, Calendar, AlertCircle,
    Table, List, PieChart, LayoutList, Send, AlertTriangle, ArrowRight, X, Loader2, Star, ShieldCheck, Rocket, Lock,
    Award, ThumbsUp, FileText, UploadCloud, Image as ImageIcon, Search, Briefcase, FileInput, Trash2, Sparkles, Image
} from 'lucide-react';
import { PagmotorsLogo } from '../components/Logo';
import { appStore } from '../services/store';
import ResultadosPage from './ResultadosPage';
import { extractRatesFromEvidence } from '../services/geminiService';

interface PricingPageProps {
  role: UserRole | null;
}

// Updated Ranges based on user input
const TPV_RANGES = [
    { id: 0, label: 'Full Balcão' },
    { id: 1, label: 'Full (5-10k)' },
    { id: 2, label: 'Full (10-20k)' },
    { id: 3, label: 'Full (20-50k)' },
    { id: 4, label: 'Full (50-100k)' },
    { id: 5, label: 'Full (100-150k)' },
    { id: 6, label: 'Full (+150k)' },
];

const ACQUIRERS = [
    'Getnet', 'Cielo', 'Rede', 'Stone', 'Pinpag', 'PagSeguro', 
    'Banco Rendimento', 'Listo', 'PagVeloz', 'PicPay', 'Ton', 'InfinitePay', 'Outra'
];

// Exact Rates Database for FULL Plan
const RATES_DB: Record<number, { debit: number, credit1x: number, installments: number[] }> = {
    0: { // Full Balcão
        debit: 2.06, credit1x: 6.74,
        installments: [8.10, 10.65, 12.04, 13.44, 14.06, 14.51, 15.78, 17.08, 18.36, 19.65, 20.94, 22.43, 23.94, 25.46, 26.99, 28.53, 30.07]
    },
    1: { // Full (5-10k)
        debit: 2.01, credit1x: 5.08,
        installments: [6.39, 8.52, 9.80, 11.07, 11.72, 12.22, 13.39, 14.58, 15.77, 16.96, 18.14, 19.51, 20.92, 22.34, 23.79, 25.25, 26.61]
    },
    2: { // Full (10-20k)
        debit: 1.95, credit1x: 4.38,
        installments: [5.42, 7.37, 8.83, 10.10, 10.75, 11.25, 13.12, 14.57, 15.63, 16.69, 17.74, 18.84, 19.96, 21.92, 23.08, 24.27, 26.28]
    },
    3: { // Full (20-50k)
        debit: 1.81, credit1x: 3.73,
        installments: [4.78, 6.07, 7.29, 8.75, 9.80, 10.85, 12.72, 13.77, 14.83, 16.69, 17.74, 18.84, 19.96, 21.11, 22.27, 24.27, 25.47]
    },
    4: { // Full (50-100k)
        debit: 1.26, credit1x: 3.17,
        installments: [4.62, 5.83, 7.05, 8.26, 9.39, 10.85, 12.31, 13.36, 14.83, 15.88, 16.93, 18.43, 19.55, 21.11, 22.27, 23.87, 24.66]
    },
    5: { // Full (100-150k)
        debit: 1.16, credit1x: 3.09,
        installments: [4.53, 5.75, 6.97, 8.18, 9.31, 10.77, 12.23, 13.28, 14.75, 15.80, 16.85, 18.35, 19.47, 21.03, 22.19, 23.79, 24.58]
    },
    6: { // Full (+150k)
        debit: 1.06, credit1x: 3.01,
        installments: [4.45, 5.67, 6.89, 8.10, 9.23, 10.69, 12.15, 13.20, 14.67, 15.72, 16.77, 18.27, 19.39, 20.95, 22.11, 23.70, 24.50]
    }
};

// Exact Rates Database for SIMPLES Plan
const SIMPLES_RATES_DB: Record<number, { debit: number, credit1x: number, credit2x6x: number, credit7x12x: number, credit13x18x: number }> = {
    0: { debit: 2.00, credit1x: 2.95, credit2x6x: 3.65, credit7x12x: 4.10, credit13x18x: 4.40 }, // Balcão
    1: { debit: 2.00, credit1x: 2.85, credit2x6x: 3.55, credit7x12x: 4.00, credit13x18x: 4.20 }, // 5-10k
    2: { debit: 1.81, credit1x: 2.65, credit2x6x: 3.35, credit7x12x: 3.80, credit13x18x: 4.10 }, // 10-20k
    3: { debit: 1.61, credit1x: 2.45, credit2x6x: 3.15, credit7x12x: 3.60, credit13x18x: 3.80 }, // 20-50k
    4: { debit: 1.26, credit1x: 2.15, credit2x6x: 2.85, credit7x12x: 3.30, credit13x18x: 3.50 }, // 50-100k
    5: { debit: 1.16, credit1x: 2.05, credit2x6x: 2.75, credit7x12x: 3.20, credit13x18x: 3.40 }, // 100-150k
    6: { debit: 1.06, credit1x: 1.95, credit2x6x: 2.65, credit7x12x: 3.10, credit13x18x: 3.30 }, // +150k
};

// HELPER: Retrieve rates based on plan and range
const getRangeRates = (plan: 'Full' | 'Simples', rangeId: number) => {
    if (plan === 'Full') {
        const rates = RATES_DB[rangeId] || RATES_DB[0];
        const rows = [
            { label: 'Débito', rate: rates.debit, highlight: true },
            { label: 'Crédito à vista (1x)', rate: rates.credit1x, highlight: true }
        ];
        
        rates.installments.forEach((rate, idx) => {
            rows.push({
                label: `Crédito ${idx + 2}x`,
                rate: rate,
                highlight: false
            });
        });
        return rows;
    } else {
        const rates = SIMPLES_RATES_DB[rangeId] || SIMPLES_RATES_DB[0];
        return [
            { label: 'Débito', rate: rates.debit, highlight: true },
            { label: 'Crédito 1x', rate: rates.credit1x, highlight: true },
            { label: 'Crédito 2x - 6x', rate: rates.credit2x6x, highlight: false },
            { label: 'Crédito 7x - 12x', rate: rates.credit7x12x, highlight: false },
            { label: 'Crédito 13x - 18x', rate: rates.credit13x18x, highlight: false },
        ];
    }
};

// --- BRAND ICONS (Card Style) ---
interface BrandCardProps {
    width?: string;
    children: React.ReactNode;
}

const BrandCard: React.FC<BrandCardProps> = ({ children, width = "w-10" }) => (
    <div className={`${width} h-7 bg-white border border-gray-200 rounded shadow-sm flex items-center justify-center p-0.5 shrink-0`}>
        {children}
    </div>
);

const BrandIcons = () => (
    <div className="flex flex-col items-center gap-3">
        <p className="text-[10px] font-bold text-brand-gray-500 uppercase tracking-widest text-center border-b border-gray-100 pb-1 w-full max-w-[200px]">
            Aceite as principais bandeiras
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 px-4 max-w-sm">
            {/* Visa */}
            <BrandCard>
                <svg viewBox="0 0 36 12" fill="none" className="h-3 w-auto"><path d="M13.23 0.222229L9.10202 11.2346H11.5161L12.338 8.87786H15.6531L16.0371 11.2346H18.238L15.932 0.222229H13.23ZM13.882 4.41727L15.1111 7.94079H12.673L13.882 4.41727Z" fill="#1434CB"/><path d="M22.866 0.222229H20.732V11.2346H22.866V0.222229Z" fill="#1434CB"/><path d="M7.74797 0.222229H5.32297L3.13697 8.35559L2.83697 6.63463C2.65697 5.92212 2.50297 5.57211 2.18397 5.37837C1.65897 5.06085 0.887969 4.77334 0.260969 4.61834L0.359969 4.19208H4.27797C4.83297 4.19208 5.32697 4.60334 5.45297 5.34211L6.44997 11.2184L9.93297 0.222229H7.74797Z" fill="#1434CB"/><path d="M29.6219 4.30979C28.8719 3.92853 27.7949 3.61977 26.4719 3.61977C24.3629 3.61977 22.8719 4.79204 22.8719 7.34833C22.8719 9.20839 24.4979 10.2447 25.6889 10.8647C26.9039 11.4985 27.3119 11.906 27.3119 12.4935C27.3119 13.3935 26.2379 13.8698 25.1789 13.8698C24.0329 13.8698 23.3699 13.5285 22.8449 13.2673L22.1699 15.3348C22.9229 15.7161 24.3179 16.0974 25.4369 16.0974C27.7729 16.0974 29.3249 14.8911 29.3249 12.2872C29.3249 10.5972 27.9149 9.47092 26.6009 8.80465C25.3259 8.12213 24.9149 7.63836 24.9149 7.07082C24.9149 6.26205 25.7579 5.83329 26.6219 5.83329C27.5759 5.83329 28.2719 6.0708 28.7069 6.27705L29.6219 4.30979Z" transform="translate(0 -2)" fill="#1434CB"/></svg>
            </BrandCard>

            {/* Mastercard */}
            <BrandCard>
                <svg viewBox="0 0 32 20" fill="none" className="h-4 w-auto"><rect width="32" height="20" fill="none"/><path d="M12.554 10C12.554 12.9333 13.82 15.5333 15.8867 17.3333C14.2867 18.4667 12.3533 19.2 10.22 19.2C5.15333 19.2 1.02 15.0667 1.02 10C1.02 4.93333 5.15333 0.8 10.22 0.8C12.3533 0.8 14.2867 1.46667 15.8867 2.6C13.82 4.4 12.554 7 12.554 10Z" fill="#EB001B"/><path d="M31.02 10C31.02 15.0667 26.8867 19.2 21.82 19.2C19.7533 19.2 17.82 18.5333 16.22 17.4C18.22 15.6667 19.4867 13 19.4867 10C19.4867 7.06667 18.22 4.46667 16.22 2.66667C17.82 1.53333 19.7533 0.8 21.82 0.8C26.8867 0.8 31.02 4.93333 31.02 10Z" fill="#F79E1B"/></svg>
            </BrandCard>

            {/* Elo */}
            <BrandCard>
                <svg viewBox="0 0 32 32" fill="none" className="h-4 w-auto"><path d="M16 32C7.16344 32 0 24.8366 0 16C0 7.16344 7.16344 0 16 0C24.8366 0 32 7.16344 32 16C32 24.8366 24.8366 32 16 32Z" fill="#000000"/><path d="M12.33 12.83C12.33 12.83 17.61 8.95 21.35 12.58C22.28 13.48 22.61 14.83 22.18 16.05C21.75 17.27 20.73 18.24 19.49 18.66C14.53 20.34 9.17 17.66 9.17 17.66C9.17 17.66 14.45 23.32 20.65 21.22C23.75 20.17 25.85 17.17 25.85 13.87C25.85 9.71 22.48 6.34 18.32 6.34C14.16 6.34 10.79 9.71 10.79 13.87C10.79 15.63 11.39 17.25 12.41 18.54L12.33 12.83Z" fill="#F40000"/><path d="M17.1 19.35C19.78 18.44 21.32 15.7 20.41 13.02C20.09 12.07 19.45 11.28 18.63 10.73C17.03 9.66 14.92 9.94 13.58 11.23C13.58 11.23 8.3 15.11 4.56 11.48C3.63 10.58 3.3 9.23 3.73 8.01C4.16 6.79 5.18 5.82 6.42 5.4C11.38 3.72 16.74 6.4 16.74 6.4C16.74 6.4 11.46 0.74 5.26 2.84C2.16 3.89 0.06 6.89 0.06 10.19C0.06 14.35 3.43 17.72 7.59 17.72C11.75 17.72 15.12 14.35 15.12 10.19C15.12 8.43 14.52 6.81 13.5 5.52L13.58 11.23C13.58 11.23 14.42 20.26 17.1 19.35Z" fill="#FFCF00" transform="rotate(-180 12.955 12.06)"/><path d="M10.73 21.43L21.27 21.43L21.27 24.57L10.73 24.57L10.73 21.43Z" fill="#00A4E0"/></svg>
            </BrandCard>

            {/* Amex */}
            <BrandCard>
                <svg viewBox="0 0 32 32" fill="none" className="h-4 w-auto"><rect width="32" height="32" rx="4" fill="#006FCF"/><path d="M18.8 9.5H16.2L15.3 11.5H13.8L12.9 9.5H10.3L7.7 16.5H10.5L11.1 14.8H14.9L15.5 16.5H18.2L20.2 11L22.2 16.5H25L22.4 9.5H23.5L24.8 13.5L26.1 9.5H27.5L24.5 18H23L21.5 13.8L20 18H18.5L21.5 9.5H18.8ZM12.1 12H14.1L13.1 9.5L12.1 12Z" fill="white"/><path d="M10.2 18H4V22H10.2C11.3 22 12.2 21.1 12.2 20C12.2 18.9 11.3 18 10.2 18ZM6.5 20.8H5.2V19.2H6.5C7 19.2 7.3 19.6 7.3 20C7.3 20.4 7 20.8 6.5 20.8Z" fill="white"/><path d="M19 18H13.8V22H19V20.8H15V20.5H18V19.5H15V19.2H19V18Z" fill="white"/><path d="M27.5 18H22.3V22H27.5V20.8H23.5V20.5H26.5V19.5H23.5V19.2H27.5V18Z" fill="white"/></svg>
            </BrandCard>

            {/* Hipercard */}
            <BrandCard>
                <svg viewBox="0 0 32 16" fill="none" className="h-4 w-auto"><path d="M0 2C0 0.895431 0.895431 0 2 0H16V16H2C0.895431 16 0 15.1046 0 14V2Z" fill="#BD1C18"/><path d="M16 0H30C31.1046 0 32 0.895431 32 2V14C32 15.1046 31.1046 16 30 16H16V0Z" fill="#FDF320"/><path d="M8 3H11V13H8V3Z" fill="white"/><path d="M21 3H24V13H21V3Z" fill="#BD1C18"/><path d="M5 6H27V10H5V6Z" fill="#BD1C18" mask="url(#mask0)"/><path d="M5 6H27V10H5V6Z" fill="white" fillOpacity="0.5"/></svg>
            </BrandCard>

            {/* Hiper */}
            <BrandCard>
                <span className="text-[9px] font-bold text-orange-600">Hiper</span>
            </BrandCard>

            {/* Sorocred */}
            <BrandCard>
                <span className="text-[8px] font-bold text-gray-600 leading-none text-center">SORO<br/>CRED</span>
            </BrandCard>

            {/* Diners */}
            <BrandCard>
                <span className="text-[8px] font-bold text-blue-800">Diners</span>
            </BrandCard>

            {/* Credz */}
            <BrandCard>
                <span className="text-[8px] font-bold text-red-600">CREDZ</span>
            </BrandCard>

            {/* Banescard */}
            <BrandCard>
                <span className="text-[8px] font-bold text-blue-500">Banescard</span>
            </BrandCard>

            {/* JCB */}
            <BrandCard>
                <span className="text-[8px] font-bold text-green-700">JCB</span>
            </BrandCard>
        </div>
    </div>
);

// --- PRICING PAGE COMPONENT (TABELA RANGE) ---
const PricingPage: React.FC<PricingPageProps> = ({ role }) => {
    // Tab State
    const [activeTab, setActiveTab] = useState<'RANGE' | 'QUOTE' | 'REQUESTS'>('RANGE');

    // State for Proposal Generator
    const [rangeClientName, setRangeClientName] = useState('');
    const [selectedRangeId, setSelectedRangeId] = useState<number>(0); // Default to Balcão
    const [rangePlan, setRangePlan] = useState<'Full' | 'Simples'>('Full');
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // Quote Form State (New Tab)
    const [quoteForm, setQuoteForm] = useState({
        document: '',
        tradeName: '',
        tpvPotential: '',
        minAgreed: '',
        acquirer: 'Getnet',
        type: 'Oficina' as 'Oficina' | 'Revenda',
        plan: 'Full' as 'Full' | 'Simples',
        evidenceMode: 'RATE' as 'RATE' | 'SIMULATION', // Rate extraction or Reverse calc
        simulationValue: '' // Only if SIMULATION mode
    });
    const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
    const [aiProcessing, setAiProcessing] = useState(false);
    const [extractedRates, setExtractedRates] = useState<any>(null); // To store AI result
    const fileInputRefQuote = useRef<HTMLInputElement>(null);

    // Approval Modal State
    const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
    const [realTpv, setRealTpv] = useState<string>('');
    const [justification, setJustification] = useState('');

    const selectedRange = TPV_RANGES.find(r => r.id === selectedRangeId) || TPV_RANGES[0];
    const printRef = useRef<HTMLDivElement>(null);

    // --- LOGIC: BENEFITS ---
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
        if (!realTpv || !rangeClientName) {
            alert("Preencha o Nome do Cliente e o Volume Real.");
            return;
        }

        const demand = {
            id: `APR-${Math.floor(Math.random() * 10000)}`,
            clientName: rangeClientName,
            type: 'Aprovação de Exceção (Range)',
            date: new Date().toISOString(),
            status: 'Em Análise' as const, 
            requester: role === UserRole.FIELD_SALES ? 'Cleiton Freitas' : 'Usuário Atual',
            description: `Solicitação de enquadramento na faixa "${selectedRange.label}" com volume real de R$ ${realTpv}. Justificativa: ${justification}`,
            pricingData: {
                competitorRates: { debit: 0, credit1x: 0, credit12x: 0 }, 
                proposedRates: { debit: 0, credit1x: 0, credit12x: 0 }, 
                context: {
                    potentialRevenue: parseFloat(realTpv.replace(/\D/g,'')) / 100, 
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

    const handleDownloadImage = async () => {
        if (!printRef.current) return;
        setIsGeneratingPdf(true);

        try {
            // @ts-ignore
            const html2canvas = window.html2canvas;

            if (!html2canvas) {
                alert("Bibliotecas de Imagem não carregadas. Tente recarregar a página.");
                return;
            }

            const canvas = await html2canvas(printRef.current, {
                scale: 2, 
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                width: 794, // Force A4 width in px (approx at 96 DPI)
                height: 1123, // Force A4 height in px
                windowWidth: 1200
            });

            const imgData = canvas.toDataURL('image/png');
            
            const link = document.createElement('a');
            link.download = `Proposta_${rangeClientName || 'Pagmotors'}.png`;
            link.href = imgData;
            link.click();

        } catch (error) {
            console.error("Erro ao gerar Imagem:", error);
            alert("Houve um erro ao gerar a imagem.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // --- QUOTE LOGIC (NEW TAB) ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setEvidenceFiles(Array.from(e.target.files));
        }
    };

    const handleAnalyzeEvidence = async () => {
        if (evidenceFiles.length === 0) {
            alert("Anexe pelo menos uma imagem ou PDF.");
            return;
        }
        setAiProcessing(true);

        try {
            // Convert files to Base64
            const base64Promises = evidenceFiles.map(file => {
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = error => reject(error);
                });
            });

            const base64Files = await Promise.all(base64Promises);
            // Remove data:image... prefix for API
            const cleanBase64 = base64Files.map(s => s.split(',')[1]);

            // If simulation mode, pass the value
            const simValue = quoteForm.evidenceMode === 'SIMULATION' ? parseFloat(quoteForm.simulationValue.replace(/\D/g,''))/100 : undefined;

            const result = await extractRatesFromEvidence(cleanBase64, quoteForm.plan, simValue);
            
            if (result) {
                // Pre-fill extracted rates
                setExtractedRates(result);
            } else {
                alert("Não foi possível extrair as taxas. Tente uma imagem mais clara.");
            }

        } catch (error) {
            console.error(error);
            alert("Erro ao processar evidências com IA.");
        } finally {
            setAiProcessing(false);
        }
    };

    const handleSubmitQuote = () => {
        if (!quoteForm.tradeName || !quoteForm.document) {
            alert("Preencha os dados do cliente.");
            return;
        }
        
        // Mock Demand Creation
        const demand = {
            id: `COT-${Math.floor(Math.random() * 10000)}`,
            clientName: quoteForm.tradeName,
            type: 'Negociação de Taxas',
            date: new Date().toISOString(),
            status: 'Em Análise' as const, 
            requester: role === UserRole.FIELD_SALES ? 'Cleiton Freitas' : 'Usuário Atual',
            description: `Solicitação via Cotação de Taxas. Adquirente atual: ${quoteForm.acquirer}. Plano: ${quoteForm.plan}.`,
            pricingData: {
                // Map extracted/edited rates
                competitorRates: { 
                    debit: extractedRates?.debit || 0, 
                    credit1x: extractedRates?.credit1x || 0, 
                    credit12x: extractedRates?.credit12x || 0 
                }, 
                proposedRates: { debit: 0, credit1x: 0, credit12x: 0 }, // Placeholder for Mesa to fill
                context: {
                    potentialRevenue: parseFloat(quoteForm.tpvPotential.replace(/\D/g,'')) / 100, 
                    minAgreed: parseFloat(quoteForm.minAgreed.replace(/\D/g,'')) / 100
                },
                evidenceUrl: 'https://via.placeholder.com/300' // Mock for now
            }
        };

        appStore.addDemand(demand);
        setActiveTab('REQUESTS');
        setQuoteForm({ ...quoteForm, tradeName: '', document: '' });
        setExtractedRates(null);
        setEvidenceFiles([]);
    };

    const rates = getRangeRates(rangePlan, selectedRange.id);

    return (
        <div className="space-y-6">
            {/* TABS HEADER */}
            <header className="flex flex-col md:flex-row justify-between items-end gap-4 no-print">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900">Pricing & Propostas</h1>
                    <p className="text-brand-gray-600 text-sm">Geração de propostas e acompanhamento de negociações.</p>
                </div>
                <div className="flex bg-brand-gray-200 p-1 rounded-xl overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('RANGE')}
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'RANGE' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                    >
                        <Calculator className="w-4 h-4 mr-2" />
                        Taxa Range
                    </button>
                    <button
                        onClick={() => setActiveTab('QUOTE')}
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'QUOTE' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                    >
                        <Briefcase className="w-4 h-4 mr-2" />
                        Cotação de Taxas
                    </button>
                    <button
                        onClick={() => setActiveTab('REQUESTS')}
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'REQUESTS' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        Minhas Solicitações
                    </button>
                </div>
            </header>

            {/* TAB CONTENT: REQUESTS */}
            {activeTab === 'REQUESTS' && (
                <ResultadosPage currentUser={role === UserRole.FIELD_SALES ? 'Cleiton Freitas' : role === UserRole.INSIDE_SALES ? 'Cauana Sousa' : 'Usuário Atual'} />
            )}

            {/* TAB CONTENT: COTAÇÃO DE TAXAS (NEW) */}
            {activeTab === 'QUOTE' && (
                <div className="animate-fade-in bg-white rounded-2xl shadow-sm border border-brand-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-brand-gray-100 bg-brand-gray-50/50 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-brand-gray-900 flex items-center gap-2">
                            <Briefcase className="w-6 h-6 text-brand-primary" />
                            Nova Cotação Personalizada
                        </h2>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                        {/* LEFT: FORM INPUTS */}
                        <div className="p-6 space-y-6 border-r border-brand-gray-100">
                            {/* Client Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Buscar Cliente (CNPJ ou ID)</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            className="flex-1 border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                                            value={quoteForm.document}
                                            onChange={e => setQuoteForm({...quoteForm, document: e.target.value})}
                                            placeholder="00.000.000/0000-00"
                                        />
                                        <button className="bg-brand-gray-100 text-brand-gray-600 px-3 rounded-lg hover:bg-brand-gray-200">
                                            <Search className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Nome Fantasia *</label>
                                    <input 
                                        type="text" 
                                        className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                                        value={quoteForm.tradeName}
                                        onChange={e => setQuoteForm({...quoteForm, tradeName: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Potencial TPV (R$)</label>
                                    <input 
                                        type="text" 
                                        className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm"
                                        placeholder="0,00"
                                        value={quoteForm.tpvPotential}
                                        onChange={e => {
                                            const v = e.target.value.replace(/\D/g, "");
                                            const fmt = (parseInt(v || '0') / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                            setQuoteForm({...quoteForm, tpvPotential: fmt});
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Mínimo Acordado (R$)</label>
                                    <input 
                                        type="text" 
                                        className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm"
                                        placeholder="0,00"
                                        value={quoteForm.minAgreed}
                                        onChange={e => {
                                            const v = e.target.value.replace(/\D/g, "");
                                            const fmt = (parseInt(v || '0') / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                            setQuoteForm({...quoteForm, minAgreed: fmt});
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Segmentation */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-brand-gray-100">
                                <div>
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Adquirente Atual</label>
                                    <select 
                                        className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                                        value={quoteForm.acquirer}
                                        onChange={e => setQuoteForm({...quoteForm, acquirer: e.target.value})}
                                    >
                                        {ACQUIRERS.map(acq => <option key={acq} value={acq}>{acq}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Tipo de EC</label>
                                    <div className="flex bg-brand-gray-100 p-1 rounded-lg">
                                        <button 
                                            onClick={() => setQuoteForm({...quoteForm, type: 'Oficina'})}
                                            className={`flex-1 text-xs py-1.5 rounded font-bold transition-all ${quoteForm.type === 'Oficina' ? 'bg-white shadow text-brand-primary' : 'text-brand-gray-500'}`}
                                        >Oficina</button>
                                        <button 
                                            onClick={() => setQuoteForm({...quoteForm, type: 'Revenda'})}
                                            className={`flex-1 text-xs py-1.5 rounded font-bold transition-all ${quoteForm.type === 'Revenda' ? 'bg-white shadow text-brand-primary' : 'text-brand-gray-500'}`}
                                        >Revenda</button>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Modelo de Taxas (Alvo)</label>
                                    <div className="flex bg-brand-gray-100 p-1 rounded-lg">
                                        <button 
                                            onClick={() => setQuoteForm({...quoteForm, plan: 'Full'})}
                                            className={`flex-1 text-xs py-1.5 rounded font-bold transition-all ${quoteForm.plan === 'Full' ? 'bg-white shadow text-green-600' : 'text-brand-gray-500'}`}
                                        >FULL (D+0)</button>
                                        <button 
                                            onClick={() => setQuoteForm({...quoteForm, plan: 'Simples'})}
                                            className={`flex-1 text-xs py-1.5 rounded font-bold transition-all ${quoteForm.plan === 'Simples' ? 'bg-white shadow text-blue-600' : 'text-brand-gray-500'}`}
                                        >SIMPLES (Agenda)</button>
                                    </div>
                                </div>
                            </div>

                            {/* Evidence Upload */}
                            <div className="pt-4 border-t border-brand-gray-100">
                                <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-2">Anexar Evidências (IA)</label>
                                
                                <div className="flex gap-4 mb-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" name="evidenceMode" 
                                            checked={quoteForm.evidenceMode === 'RATE'}
                                            onChange={() => setQuoteForm({...quoteForm, evidenceMode: 'RATE'})}
                                            className="text-brand-primary focus:ring-brand-primary"
                                        />
                                        <span className="text-sm">Leitura por Taxa Explícita</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" name="evidenceMode" 
                                            checked={quoteForm.evidenceMode === 'SIMULATION'}
                                            onChange={() => setQuoteForm({...quoteForm, evidenceMode: 'SIMULATION'})}
                                            className="text-brand-primary focus:ring-brand-primary"
                                        />
                                        <span className="text-sm">Leitura por Simulação</span>
                                    </label>
                                </div>

                                {quoteForm.evidenceMode === 'SIMULATION' && (
                                    <div className="mb-3 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                        <label className="block text-xs font-bold text-yellow-800 mb-1">Valor Total da Venda Simulada (R$)</label>
                                        <input 
                                            type="text" 
                                            className="w-full border border-yellow-300 rounded px-2 py-1 text-sm"
                                            placeholder="Ex: 1.000,00"
                                            value={quoteForm.simulationValue}
                                            onChange={e => {
                                                const v = e.target.value.replace(/\D/g, "");
                                                const fmt = (parseInt(v || '0') / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                                setQuoteForm({...quoteForm, simulationValue: fmt});
                                            }}
                                        />
                                        <p className="text-[10px] text-yellow-700 mt-1">* A IA irá calcular a taxa reversa baseada neste valor e no líquido/parcela da imagem.</p>
                                    </div>
                                )}

                                <div className="border-2 border-dashed border-brand-gray-300 rounded-xl p-6 flex flex-col items-center justify-center bg-brand-gray-50 hover:bg-brand-gray-100 transition-colors cursor-pointer" onClick={() => fileInputRefQuote.current?.click()}>
                                    <UploadCloud className="w-8 h-8 text-brand-gray-400 mb-2" />
                                    <p className="text-sm text-brand-gray-600 font-medium">Clique para selecionar Imagens ou PDF</p>
                                    <p className="text-xs text-brand-gray-400">Suporta múltiplos arquivos</p>
                                    <input 
                                        type="file" 
                                        multiple 
                                        className="hidden" 
                                        ref={fileInputRefQuote} 
                                        onChange={handleFileUpload}
                                        accept="image/*,.pdf"
                                    />
                                </div>
                                {evidenceFiles.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {evidenceFiles.map((f, i) => (
                                            <div key={i} className="flex justify-between items-center text-xs bg-brand-gray-100 px-2 py-1 rounded">
                                                <span className="truncate max-w-[200px]">{f.name}</span>
                                                <button onClick={() => setEvidenceFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500"><Trash2 size={12} /></button>
                                            </div>
                                        ))}
                                        <button 
                                            type="button" 
                                            onClick={handleAnalyzeEvidence}
                                            disabled={aiProcessing}
                                            className="w-full mt-2 bg-brand-gray-900 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors"
                                        >
                                            {aiProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                            {aiProcessing ? 'IA Analisando...' : 'Extrair Taxas com IA'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: RATE TABLE RESULTS */}
                        <div className="p-6 bg-brand-gray-50 flex flex-col h-full">
                            <h3 className="font-bold text-brand-gray-900 mb-4 flex items-center gap-2">
                                <Table className="w-5 h-5 text-brand-primary" />
                                Tabela de Taxas (Alvo)
                            </h3>
                            
                            <div className="flex-1 bg-white rounded-xl border border-brand-gray-200 overflow-hidden shadow-sm flex flex-col">
                                <div className="overflow-y-auto flex-1">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-brand-gray-100 text-brand-gray-600 font-bold text-xs uppercase">
                                            <tr>
                                                <th className="px-4 py-2">Modalidade</th>
                                                <th className="px-4 py-2 text-center">Atual (IA)</th>
                                                <th className="px-4 py-2 text-center">Proposta</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-brand-gray-100">
                                            {/* Render rows based on Plan Type */}
                                            {quoteForm.plan === 'Full' ? (
                                                ['Débito', '1x', '2x', '3x', '4x', '5x', '6x', '7x', '8x', '9x', '10x', '11x', '12x', '18x'].map(label => {
                                                    // Map label to key for extractedRates
                                                    const key = label === 'Débito' ? 'debit' : label === '1x' ? 'credit1x' : `credit${label}`;
                                                    const extractedVal = extractedRates ? extractedRates[key] : null;
                                                    
                                                    return (
                                                        <tr key={label}>
                                                            <td className="px-4 py-2 font-bold text-brand-gray-700 text-xs">{label}</td>
                                                            <td className="px-4 py-2 text-center">
                                                                <input 
                                                                    className={`w-16 text-center text-xs border rounded py-1 ${extractedVal ? 'bg-green-50 border-green-200 text-green-700 font-bold' : 'bg-gray-50 border-gray-200'}`}
                                                                    value={extractedVal ? extractedVal.toFixed(2) : ''}
                                                                    placeholder="-"
                                                                    readOnly
                                                                />
                                                            </td>
                                                            <td className="px-4 py-2 text-center">
                                                                <input className="w-16 text-center text-xs border border-brand-gray-300 rounded py-1 focus:border-brand-primary outline-none" placeholder="0.00" />
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                ['Débito', '1x', '2x - 6x', '7x - 12x', '13x - 18x'].map(label => {
                                                    // Simple buckets mapping for demo
                                                    let val = null;
                                                    if(extractedRates) {
                                                        if(label === 'Débito') val = extractedRates.debit;
                                                        else if(label === '1x') val = extractedRates.credit1x;
                                                        else if(label.includes('6x')) val = extractedRates.credit6x; // Approximation
                                                    }
                                                    return (
                                                        <tr key={label}>
                                                            <td className="px-4 py-2 font-bold text-brand-gray-700 text-xs">{label}</td>
                                                            <td className="px-4 py-2 text-center">
                                                                <input 
                                                                    className={`w-16 text-center text-xs border rounded py-1 ${val ? 'bg-green-50 border-green-200 text-green-700 font-bold' : 'bg-gray-50 border-gray-200'}`}
                                                                    value={val ? val.toFixed(2) : ''}
                                                                    placeholder="-"
                                                                    readOnly
                                                                />
                                                            </td>
                                                            <td className="px-4 py-2 text-center">
                                                                <input className="w-16 text-center text-xs border border-brand-gray-300 rounded py-1 focus:border-brand-primary outline-none" placeholder="0.00" />
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {extractedRates?.notes && (
                                    <div className="p-3 bg-yellow-50 text-[10px] text-yellow-800 border-t border-yellow-100">
                                        <strong>Nota IA:</strong> {extractedRates.notes}
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={handleSubmitQuote}
                                className="w-full bg-brand-primary hover:bg-brand-dark text-white py-3 rounded-xl font-bold mt-4 shadow-lg transition-transform hover:-translate-y-1 flex items-center justify-center gap-2"
                            >
                                <Send className="w-4 h-4" /> Enviar Cotação para Mesa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: GENERATOR (Original Content - Taxa Range) */}
            {activeTab === 'RANGE' && (
                <div className="animate-fade-in relative">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-6 no-print">
                        {/* Subheader removed to avoid duplication, controls moved to main header or kept below */}
                        <div className="w-full flex justify-end gap-2">
                            <button onClick={() => window.print()} className="flex items-center gap-2 bg-white border border-brand-gray-200 text-brand-gray-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-brand-gray-50 transition-colors shadow-sm">
                                <Printer size={16} /> Imprimir
                            </button>
                            <button 
                                onClick={handleDownloadImage}
                                disabled={isGeneratingPdf}
                                className="flex items-center gap-2 bg-brand-gray-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-black transition-colors shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                                {isGeneratingPdf ? 'Gerando...' : 'Baixar Imagem'}
                            </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* LEFT COLUMN: CONTROLS */}
                        <div className="lg:col-span-4 space-y-6 no-print order-1 lg:order-1">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-gray-100 sticky top-4">
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
                                                * Selecione a faixa para aplicar as taxas pré-aprovadas.
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
                                                    FULL
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

                        {/* RIGHT COLUMN: PREVIEW AREA */}
                        <div className="lg:col-span-8 flex justify-center items-start overflow-hidden bg-gray-100/50 p-2 md:p-4 rounded-3xl border border-gray-200 order-2 lg:order-2">
                            
                            {/* --- A4 DOCUMENT CONTAINER --- */}
                            <div 
                                ref={printRef} 
                                className="bg-white shadow-2xl relative flex flex-col shrink-0 origin-top transform 
                                        scale-[0.42] xs:scale-[0.5] sm:scale-[0.6] md:scale-[0.7] lg:scale-[0.75] 2xl:scale-100 
                                        transition-transform duration-500 print:transform-none print:shadow-none"
                                style={{ width: '210mm', minHeight: '297mm', height: '297mm' }}
                            >
                                    
                                    {/* HEADER - BRANDING (RED) */}
                                    <div className="bg-gradient-to-r from-brand-primary to-brand-dark h-32 flex items-center justify-between px-12 relative overflow-hidden shrink-0">
                                        {/* Logo Wrapper */}
                                        <div className="relative z-10 text-white transform scale-110 origin-left">
                                            <PagmotorsLogo className="text-white" variant="white" />
                                        </div>
                                        
                                        <div className="relative z-10 text-right text-white">
                                            <h2 className="text-2xl font-bold uppercase tracking-widest">Proposta Comercial</h2>
                                            <p className="text-sm font-medium tracking-wide mt-1 opacity-80">Soluções de Pagamento</p>
                                        </div>

                                        <div className="absolute -right-10 -top-20 w-80 h-80 bg-white opacity-5 rounded-full blur-3xl"></div>
                                    </div>

                                    {/* MAIN CONTENT AREA */}
                                    <div className="flex-1 px-12 py-8 flex flex-col gap-6">
                                        
                                        {/* 1. Intro & Hero */}
                                        <div className="flex items-center justify-between border-b border-gray-100 pb-6 gap-6">
                                            <div className="text-left flex-1">
                                                <div className="inline-block px-4 py-1.5 rounded-full bg-brand-light/10 text-brand-primary text-xs font-bold uppercase tracking-wider border border-brand-light/20 mb-3">
                                                    Plano {rangePlan}
                                                </div>
                                                <h1 className="text-4xl font-bold text-brand-gray-900 leading-tight mb-2">
                                                    {rangeClientName || 'Sua Empresa'}
                                                </h1>
                                                <p className="text-brand-gray-500 text-sm leading-relaxed max-w-lg">
                                                    Condições exclusivas para acelerar o crescimento do seu negócio com a tecnologia Pagmotors.
                                                </p>
                                                <div className="mt-3 text-xs text-brand-gray-400 font-bold uppercase">
                                                    Data: {new Date().toLocaleDateString('pt-BR')}
                                                </div>
                                            </div>
                                            <div className="w-32 shrink-0">
                                                 <img 
                                                    src="https://cdn3d.iconscout.com/3d/premium/thumb/card-machine-5360096-4490060.png" 
                                                    alt="Maquininha" 
                                                    className="w-full h-auto object-contain"
                                                    crossOrigin="anonymous"
                                                 />
                                            </div>
                                        </div>

                                        {/* NEW LAYOUT: 2 Columns Side-by-Side */}
                                        <div className="flex flex-row gap-8 mt-2 items-start h-full">
                                            
                                            {/* LEFT COLUMN: BENEFITS (Larger Cards) */}
                                            <div className="w-5/12 flex flex-col gap-4">
                                                {getBenefitsList(rangePlan).map((benefit, idx) => (
                                                    <div key={idx} className="bg-brand-gray-50 rounded-2xl p-5 border border-brand-gray-100 shadow-sm flex flex-col items-start gap-3">
                                                        <div className="bg-white p-3 rounded-xl text-brand-primary shadow-sm border border-brand-gray-100 shrink-0">
                                                            <benefit.icon className="w-8 h-8" strokeWidth={2} />
                                                        </div>
                                                        <div>
                                                            <p className="text-base font-bold text-brand-gray-900 leading-tight mb-1">{benefit.text}</p>
                                                            <p className="text-xs text-brand-gray-500 leading-relaxed">{benefit.sub}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* RIGHT COLUMN: RATES TABLE (Compact) */}
                                            <div className="w-7/12 flex flex-col">
                                                <div className="mb-4 flex items-center justify-between px-1">
                                                    <h3 className="text-base font-bold text-brand-gray-900 border-l-4 border-brand-primary pl-3">
                                                        Taxas Aprovadas
                                                    </h3>
                                                    <span className="text-[10px] font-bold text-brand-gray-500 bg-gray-100 px-2 py-1 rounded uppercase tracking-wide">
                                                        {rangePlan === 'Simples' ? selectedRange.label.replace('Full', 'Simples') : selectedRange.label}
                                                    </span>
                                                </div>

                                                <div className="border border-brand-gray-200 rounded-xl overflow-hidden shadow-sm">
                                                    {/* Table Header */}
                                                    <div className="bg-brand-gray-900 flex text-white text-xs font-bold uppercase tracking-wider py-3">
                                                        <div className="w-2/3 px-5">Modalidade</div>
                                                        <div className="w-1/3 px-5 text-right">Taxa</div>
                                                    </div>
                                                    
                                                    {/* Table Body - Sequential */}
                                                    <div className="bg-white divide-y divide-brand-gray-100">
                                                        {rates.map((row, idx) => (
                                                            <div key={idx} className={`flex items-center justify-between px-5 py-2 ${row.highlight ? 'bg-brand-primary/5' : idx % 2 === 0 ? 'bg-white' : 'bg-brand-gray-50/50'}`}>
                                                                <div className={`text-xs ${row.highlight ? 'font-bold text-brand-primary' : 'font-medium text-brand-gray-700'}`}>
                                                                    {row.label}
                                                                </div>
                                                                <div className={`text-sm font-mono font-bold ${row.highlight ? 'text-brand-primary' : 'text-brand-gray-900'}`}>
                                                                    {row.rate.toFixed(2)}%
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Disclaimer for Simples */}
                                                {rangePlan === 'Simples' && (
                                                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-brand-gray-500 bg-white border border-dashed border-brand-gray-300 p-3 rounded-lg">
                                                        <AlertCircle className="w-4 h-4 text-brand-primary" />
                                                        <span>Taxa Antecipação: <strong>3.95% a.m.</strong></span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Brands - Centered and Spaced */}
                                        <div className="border-t border-gray-100 pt-6 mt-auto">
                                            <BrandIcons />
                                        </div>
                                    </div>

                                    {/* FOOTER */}
                                    <div className="bg-white px-12 py-8 flex items-center justify-between shrink-0 mt-auto">
                                        <div className="flex items-center gap-5">
                                            <div className="w-16 h-16 bg-brand-gray-50 rounded-full border border-gray-100 flex items-center justify-center text-brand-primary">
                                                <User className="w-8 h-8" strokeWidth={1.5} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-brand-gray-400 font-bold uppercase tracking-wider mb-1">Consultor Responsável</p>
                                                <p className="text-xl font-bold text-brand-gray-900 leading-none">Cleiton Freitas</p>
                                                <div className="flex flex-col gap-1 text-sm text-brand-gray-600 mt-2">
                                                    <span className="flex items-center gap-2"><Phone size={14} className="text-brand-primary"/> (11) 98940-7547</span>
                                                    <span className="flex items-center gap-2"><Mail size={14} className="text-brand-primary"/> cleiton.freitas@car10.com.br</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right opacity-80">
                                            <img src="https://logodownload.org/wp-content/uploads/2019/08/webmotors-logo-2.png" alt="Webmotors" className="h-8 grayscale" crossOrigin="anonymous" />
                                        </div>
                                    </div>
                                    
                                    {/* Legal Strip */}
                                    <div className="bg-black text-white/60 text-[10px] p-3 text-center font-medium tracking-wide">
                                        CAR10 TECNOLOGIA E INFORMAÇÃO S/A  - CNPJ: 20.273.297/0001-76
                                    </div>
                            </div>
                        </div>
                    </div>

                    {/* --- APPROVAL REQUEST MODAL --- */}
                    {isApprovalModalOpen && (
                        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in no-print">
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
            )}
        </div>
    );
};

export default PricingPage;
