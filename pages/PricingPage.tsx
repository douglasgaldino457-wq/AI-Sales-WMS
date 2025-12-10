
import React, { useState, useRef } from 'react';
import { UserRole } from '../types';
import { 
    CheckCircle2, User, Phone, Mail, DollarSign, Calculator, 
    Smartphone, CreditCard, Download, Printer, Share2, Zap, Calendar, AlertCircle,
    Table, List, PieChart, LayoutList, Send, AlertTriangle, ArrowRight, X, Loader2, Star, ShieldCheck, Rocket, Lock,
    Award, ThumbsUp, FileText, UploadCloud, Image as ImageIcon, Search, Briefcase, FileInput, Trash2, Sparkles
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
                { icon: Zap, text: "Pagamento D+0", sub: "Receba tudo no mesmo dia" },
                { icon: Rocket, text: "Prioridade Leads", sub: "Mais fluxo da Webmotors" },
                { icon: ShieldCheck, text: "Taxa Garantida", sub: "Sem surpresas na fatura" },
                { icon: Award, text: "Suporte VIP", sub: "Atendimento exclusivo" },
            ];
        } else {
             return [
                { icon: Calendar, text: "Pagamento Agenda", sub: "Receba conforme a parcela" },
                { icon: Rocket, text: "Prioridade Leads", sub: "Mais fluxo da Webmotors" },
                { icon: ShieldCheck, text: "Taxa Garantida", sub: "Sem surpresas na fatura" },
                { icon: ThumbsUp, text: "Antecipação Flex", sub: "Disponível a 3.95% a.m" }
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

    const handleDownloadPDF = async () => {
        if (!printRef.current) return;
        setIsGeneratingPdf(true);

        try {
            // @ts-ignore
            const html2canvas = window.html2canvas;
            // @ts-ignore
            const { jsPDF } = window.jspdf;

            if (!html2canvas || !jsPDF) {
                alert("Bibliotecas de PDF não carregadas. Tente recarregar a página.");
                return