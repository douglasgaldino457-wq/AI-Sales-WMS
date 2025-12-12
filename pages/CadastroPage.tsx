
import React, { useState, useEffect, useRef } from 'react';
import { 
    FileCheck, Search, Filter, AlertCircle, CheckCircle2, X, 
    FileText, User, Calendar, ExternalLink, ArrowRight, Loader2,
    Building2, MapPin, Phone, Mail, Clock, DollarSign, CreditCard,
    Camera, Image as ImageIcon, Briefcase, Plus, Trash2, Smartphone, Save, UploadCloud, ShieldCheck,
    PieChart as PieChartIcon, BarChart3, ChevronDown, Eye, Send, AlertTriangle, BadgePercent, Key, Copy, LayoutDashboard, Inbox, History, FileSearch, Car, FileInput,
    Store
} from 'lucide-react';
import { 
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area
} from 'recharts';
import { appStore } from '../services/store';
import { RegistrationRequest, UserRole, RegistrationStatus, BankAccount, ManualDemand, PosDevice, PosRequestItem } from '../types';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import { PagmotorsLogo } from '../components/Logo';
import { analyzeDocument } from '../services/geminiService';

interface CadastroPageProps {
    role?: UserRole | null;
}

const BANKS = [
    '001 - Banco do Brasil',
    '237 - Bradesco',
    '341 - Itaú Unibanco',
    '033 - Santander',
    '104 - Caixa Econômica',
    '260 - Nu Pagamentos (Nubank)',
    '077 - Banco Inter',
    '290 - PagSeguro',
    '336 - C6 Bank'
];

const POS_MODELS = ['P2 Smart', 'MP35', 'X990', 'L300'];

// --- COMPONENT: FICHA CADASTRAL VIEW (READ ONLY OR PREVIEW) ---
export const FichaCadastralView: React.FC<{ data: Partial<RegistrationRequest>, onViewDoc: (docType: string) => void }> = ({ data, onViewDoc }) => {
    return (
        <div className="bg-white border border-brand-gray-200 rounded-xl overflow-hidden shadow-sm">
            {/* Header Ficha */}
            <div className="bg-brand-gray-100 p-4 border-b border-brand-gray-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-brand-gray-600" />
                    <h3 className="font-bold text-brand-gray-800 uppercase tracking-wide text-sm">Ficha Cadastral</h3>
                </div>
                <div className="text-xs text-brand-gray-500 font-mono">
                    ID: {data.id || 'NOVO'}
                </div>
            </div>

            <div className="p-6 space-y-8">
                {/* 1. DADOS DO ESTABELECIMENTO */}
                <div>
                    <h4 className="text-xs font-bold text-brand-primary uppercase border-b border-brand-gray-100 pb-2 mb-4 flex items-center gap-2">
                        <Building2 className="w-4 h-4" /> Dados do Estabelecimento
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="col-span-2 md:col-span-1">
                            <span className="block text-[10px] text-brand-gray-400 font-bold uppercase">CNPJ</span>
                            <span className="font-mono text-brand-gray-900 bg-brand-gray-50 px-2 py-1 rounded block mt-1">{data.documentNumber}</span>
                        </div>
                        <div className="col-span-2 md:col-span-3">
                            <span className="block text-[10px] text-brand-gray-400 font-bold uppercase">Razão Social</span>
                            <span className="text-brand-gray-900 block mt-1">{data.razaoSocial || data.clientName}</span>
                        </div>
                        
                        {/* New Fields in View */}
                        <div className="col-span-2 md:col-span-1">
                            <span className="block text-[10px] text-brand-gray-400 font-bold uppercase">Inscrição Estadual</span>
                            <span className="text-brand-gray-900 block mt-1 font-mono">{data.inscricaoEstadual || 'Isento'}</span>
                        </div>
                        <div className="col-span-2 md:col-span-3">
                            <span className="block text-[10px] text-brand-gray-400 font-bold uppercase">CNAE Principal</span>
                            <span className="text-brand-gray-900 block mt-1">{data.cnae || '-'}</span>
                        </div>

                        <div className="col-span-2">
                            <span className="block text-[10px] text-brand-gray-400 font-bold uppercase">Nome Fantasia</span>
                            <span className="text-brand-gray-900 font-bold block mt-1">{data.clientName}</span>
                        </div>
                        <div className="col-span-2">
                            <span className="block text-[10px] text-brand-gray-400 font-bold uppercase">Volume de Veículos/Mês</span>
                            <span className="text-brand-gray-900 block mt-1 flex items-center gap-1"><Car size={14}/> {data.monthlyVehicleVolume || '-'}</span>
                        </div>
                    </div>
                </div>

                {/* 2. LOCALIZAÇÃO E CONTATO */}
                <div>
                    <h4 className="text-xs font-bold text-brand-primary uppercase border-b border-brand-gray-100 pb-2 mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Localização e Contato
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="col-span-4">
                            <span className="block text-[10px] text-brand-gray-400 font-bold uppercase">Endereço Completo</span>
                            <span className="text-brand-gray-900 block mt-1">{data.address}</span>
                        </div>
                        <div className="col-span-2">
                            <span className="block text-[10px] text-brand-gray-400 font-bold uppercase">Responsável Legal</span>
                            <span className="text-brand-gray-900 font-bold block mt-1">{data.responsibleName}</span>
                        </div>
                        <div className="col-span-2">
                            <span className="block text-[10px] text-brand-gray-400 font-bold uppercase">Horário de Funcionamento</span>
                            <div className="text-brand-gray-900 mt-1 text-xs">
                                <div>Seg-Sex: {data.openingHours?.weekdays?.start} - {data.openingHours?.weekdays?.end}</div>
                                {data.openingHours?.saturday?.start && <div>Sáb: {data.openingHours?.saturday?.start} - {data.openingHours?.saturday?.end}</div>}
                            </div>
                        </div>
                        <div className="col-span-2">
                            <span className="block text-[10px] text-brand-gray-400 font-bold uppercase">Telefones</span>
                            <div className="flex flex-col mt-1">
                                {data.contactPhones?.map((phone, idx) => <span key={idx} className="text-brand-gray-900">{phone}</span>)}
                            </div>
                        </div>
                        <div className="col-span-2">
                            <span className="block text-[10px] text-brand-gray-400 font-bold uppercase">E-mails</span>
                            <div className="flex flex-col mt-1">
                                <span className="text-brand-gray-900 truncate" title={data.email}>{data.email}</span>
                                {data.contactEmails?.map((em, idx) => <span key={idx} className="text-brand-gray-900 truncate" title={em}>{em}</span>)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. DADOS BANCÁRIOS */}
                <div>
                    <h4 className="text-xs font-bold text-brand-primary uppercase border-b border-brand-gray-100 pb-2 mb-4 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" /> Domicílios Bancários ({data.bankAccounts?.length || 0})
                    </h4>
                    <div className="space-y-3">
                        {data.bankAccounts?.map((acc, idx) => (
                            <div key={idx} className="bg-brand-gray-50 p-4 rounded-lg border border-brand-gray-200">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-brand-primary uppercase">Conta {idx + 1}</span>
                                    {acc.proofFile ? (
                                        <button onClick={() => onViewDoc('Comprovante Bancário')} className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-green-200 transition-colors">
                                            <Eye size={10}/> Ver Comprovante
                                        </button>
                                    ) : (
                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Sem anexo</span>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <span className="block text-[10px] text-brand-gray-400 font-bold uppercase">Banco</span>
                                        <span className="text-brand-gray-900 font-bold block mt-1">{acc.bankCode}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] text-brand-gray-400 font-bold uppercase">Ag/Conta</span>
                                        <span className="text-brand-gray-900 block mt-1">{acc.agency} / {acc.accountNumber}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] text-brand-gray-400 font-bold uppercase">Tipo</span>
                                        <span className="text-brand-gray-900 block mt-1">{acc.accountType} ({acc.holderType})</span>
                                    </div>
                                    <div className="col-span-4">
                                        <span className="block text-[10px] text-brand-gray-400 font-bold uppercase">Titular</span>
                                        <span className="text-brand-gray-900 block mt-1">{acc.holderName}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. DADOS COMERCIAIS & PRODUTO */}
                <div>
                    <h4 className="text-xs font-bold text-brand-primary uppercase border-b border-brand-gray-100 pb-2 mb-4 flex items-center gap-2">
                        <Briefcase className="w-4 h-4" /> Produto e Taxas
                    </h4>
                    <div className="grid grid-cols-1 gap-4 text-sm">
                        <div className="flex gap-6 items-center bg-brand-gray-50 p-3 rounded-lg border border-brand-gray-100">
                            <div>
                                <span className="block text-[10px] text-brand-gray-400 font-bold uppercase">Plano Selecionado</span>
                                <span className={`inline-block mt-1 px-3 py-1 rounded text-xs font-bold uppercase ${data.planType === 'Full' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {data.planType}
                                </span>
                            </div>
                            <div className="flex-1">
                                <span className="block text-[10px] text-brand-gray-400 font-bold uppercase mb-1">Condição Comercial</span>
                                {data.pricingDemandId ? (
                                    <div className="bg-purple-50 text-purple-800 text-xs px-3 py-1 rounded border border-purple-200 flex items-center gap-2 w-fit">
                                        <BadgePercent className="w-3 h-3" />
                                        <span>Taxas da Negociação <strong>#{data.pricingDemandId}</strong></span>
                                    </div>
                                ) : (
                                    <span className="text-brand-gray-500 text-xs italic">Taxas padrão do plano aplicadas.</span>
                                )}
                            </div>
                        </div>
                        
                        <div>
                            <span className="block text-[10px] text-brand-gray-400 font-bold uppercase mb-2">Equipamentos Solicitados</span>
                            {data.requestedEquipments && data.requestedEquipments.length > 0 ? (
                                <div className="space-y-2">
                                    {data.requestedEquipments.map((item, idx) => {
                                        const linkedAccount = data.bankAccounts && data.bankAccounts[item.linkedAccountIndex || 0];
                                        return (
                                            <div key={idx} className="bg-white border border-brand-gray-200 p-3 rounded text-xs shadow-sm">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`p-1.5 rounded text-white font-bold ${item.type === 'STOCK' ? 'bg-blue-600' : 'bg-brand-gray-600'}`}>
                                                            {item.type === 'STOCK' ? 'EST' : 'LOG'}
                                                        </div>
                                                        <span className="font-bold text-brand-gray-800 text-sm">{item.model}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        {item.type === 'STOCK' ? (
                                                            <div className="flex flex-col items-end">
                                                                <span className="font-mono text-blue-700 font-bold">S/N: {item.serialNumber}</span>
                                                                <span className="font-mono text-gray-500">RC: {item.rcNumber}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-brand-gray-500 italic">Solicitar envio</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="border-t border-brand-gray-100 pt-2 mt-1 flex items-center gap-2 text-brand-gray-600">
                                                    <CreditCard size={12}/> 
                                                    <span>Domicílio: <strong>{linkedAccount ? `${linkedAccount.bankCode} (Ag ${linkedAccount.agency})` : 'Não vinculado'}</strong></span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-brand-gray-400 italic">Nenhum equipamento selecionado.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* 5. DOCUMENTAÇÃO E FOTOS */}
                <div>
                    <h4 className="text-xs font-bold text-brand-primary uppercase border-b border-brand-gray-100 pb-2 mb-4 flex items-center gap-2">
                        <Camera className="w-4 h-4" /> Documentação e Fotos
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Static Doc List for View */}
                        <div className={`flex items-center justify-between p-3 rounded-lg border text-xs font-bold ${data.docs?.idCard ? 'bg-white border-green-200 text-green-800 shadow-sm' : 'bg-brand-gray-50 border-brand-gray-200 text-brand-gray-400'}`}>
                            <span className="flex items-center gap-2">
                                {data.docs?.idCard ? <CheckCircle2 className="w-4 h-4 text-green-600"/> : <X className="w-4 h-4"/>}
                                Doc. Identidade
                            </span>
                            {data.docs?.idCard && <button onClick={() => onViewDoc('Doc. Identidade')} className="text-blue-600 hover:underline flex items-center"><Eye size={12}/> Ver</button>}
                        </div>

                        <div className={`flex items-center justify-between p-3 rounded-lg border text-xs font-bold ${data.docs?.addressProof ? 'bg-white border-green-200 text-green-800 shadow-sm' : 'bg-brand-gray-50 border-brand-gray-200 text-brand-gray-400'}`}>
                            <span className="flex items-center gap-2">
                                {data.docs?.addressProof ? <CheckCircle2 className="w-4 h-4 text-green-600"/> : <X className="w-4 h-4"/>}
                                Comp. Endereço
                            </span>
                            {data.docs?.addressProof && <button onClick={() => onViewDoc('Comp. Endereço')} className="text-blue-600 hover:underline flex items-center"><Eye size={12}/> Ver</button>}
                        </div>

                        {/* New Photos View */}
                        <div className={`flex items-center justify-between p-3 rounded-lg border text-xs font-bold ${data.docs?.facade ? 'bg-white border-green-200 text-green-800 shadow-sm' : 'bg-brand-gray-50 border-brand-gray-200 text-brand-gray-400'}`}>
                            <span className="flex items-center gap-2">
                                {data.docs?.facade ? <CheckCircle2 className="w-4 h-4 text-green-600"/> : <X className="w-4 h-4"/>}
                                Fachada
                            </span>
                            {data.docs?.facade && <button onClick={() => onViewDoc('Fachada')} className="text-blue-600 hover:underline flex items-center"><Eye size={12}/> Ver</button>}
                        </div>

                        <div className={`flex items-center justify-between p-3 rounded-lg border text-xs font-bold ${(data.docs?.interiorFiles?.length || 0) >= 3 ? 'bg-white border-green-200 text-green-800 shadow-sm' : 'bg-brand-gray-50 border-brand-gray-200 text-brand-gray-400'}`}>
                            <span className="flex items-center gap-2">
                                {(data.docs?.interiorFiles?.length || 0) >= 3 ? <CheckCircle2 className="w-4 h-4 text-green-600"/> : <X className="w-4 h-4"/>}
                                Interior ({(data.docs?.interiorFiles?.length || 0)}/3)
                            </span>
                            {(data.docs?.interiorFiles?.length || 0) > 0 && <button onClick={() => onViewDoc('Fotos Internas')} className="text-blue-600 hover:underline flex items-center"><Eye size={12}/> Ver</button>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ... (Rest of modal components unchanged) ...
// --- PREVIEW MODAL COMPONENT ---
const PreviewModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isSubmitting: boolean;
    data: Partial<RegistrationRequest>;
    onViewDoc: (type: string) => void;
}> = ({ isOpen, onClose, onConfirm, isSubmitting, data, onViewDoc }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-brand-gray-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
                    <h3 className="font-bold text-lg flex items-center gap-2"><FileCheck className="w-5 h-5" /> Revisão de Cadastro</h3>
                    <button onClick={onClose} className="text-brand-gray-400 hover:text-white"><X size={20}/></button>
                </div>
                <div className="p-0 overflow-y-auto flex-1 bg-gray-50">
                    <div className="p-6">
                        <FichaCadastralView data={data} onViewDoc={onViewDoc} />
                    </div>
                </div>
                <div className="p-4 border-t border-brand-gray-200 bg-white flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-4 py-2 border border-brand-gray-300 text-brand-gray-600 font-bold rounded-lg hover:bg-brand-gray-50">Voltar e Editar</button>
                    <button onClick={onConfirm} disabled={isSubmitting} className="px-6 py-2 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-dark flex items-center gap-2 shadow-lg">
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>} Confirmar Envio
                    </button>
                </div>
            </div>
        </div>
    );
};

// ... (DocViewerModal and RatesModal unchanged) ...
export const DocViewerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    docType: string | null;
}> = ({ isOpen, onClose, docType }) => {
    if (!isOpen || !docType) return null;
    return (
        <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="bg-brand-gray-900 px-4 py-3 flex justify-between items-center text-white">
                    <h3 className="font-bold text-sm flex items-center gap-2"><ImageIcon className="w-4 h-4" /> {docType}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18}/></button>
                </div>
                <div className="p-10 flex flex-col items-center justify-center bg-gray-100 min-h-[300px]">
                    <div className="w-24 h-32 bg-white border border-gray-300 shadow-sm flex items-center justify-center mb-4">
                        <FileText className="w-10 h-10 text-gray-300" />
                    </div>
                    <p className="text-gray-500 text-sm font-medium">Visualização Simulada</p>
                    <p className="text-xs text-gray-400 text-center mt-1 max-w-xs">
                        Este é um mockup. No ambiente real, a imagem do documento "{docType}" seria renderizada aqui.
                    </p>
                </div>
                <div className="p-3 border-t border-gray-200 bg-white flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-brand-gray-100 text-brand-gray-700 font-bold rounded text-xs hover:bg-brand-gray-200">Fechar</button>
                </div>
            </div>
        </div>
    );
};

const RatesModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    demand?: ManualDemand;
}> = ({ isOpen, onClose, demand }) => {
    if (!isOpen || !demand || !demand.pricingData) return null;
    const rates = demand.pricingData.approvedRates || demand.pricingData.proposedRates;
    
    return (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="bg-purple-600 px-6 py-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2"><BadgePercent className="w-5 h-5" /> Taxas Negociadas</h3>
                    <button onClick={onClose} className="text-purple-200 hover:text-white"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 text-center">
                        <p className="text-purple-800 font-bold text-lg mb-1">{demand.clientName}</p>
                        <p className="text-purple-600 text-xs uppercase">Demanda #{demand.id}</p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 border rounded-lg bg-gray-50">
                            <span className="block text-xs font-bold text-gray-500 uppercase">Débito</span>
                            <span className="block text-xl font-bold text-gray-900">{rates.debit.toFixed(2)}%</span>
                        </div>
                        <div className="text-center p-3 border rounded-lg bg-gray-50">
                            <span className="block text-xs font-bold text-gray-500 uppercase">Crédito 1x</span>
                            <span className="block text-xl font-bold text-gray-900">{rates.credit1x.toFixed(2)}%</span>
                        </div>
                        <div className="text-center p-3 border rounded-lg bg-gray-50">
                            <span className="block text-xs font-bold text-gray-500 uppercase">Crédito 12x</span>
                            <span className="block text-xl font-bold text-gray-900">{rates.credit12x.toFixed(2)}%</span>
                        </div>
                    </div>
                    
                    <button onClick={onClose} className="w-full py-3 bg-gray-100 text-brand-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

const CadastroPage: React.FC<CadastroPageProps> = ({ role }) => {
    // VIEW STATE
    const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('FORM');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
    const [showErrors, setShowErrors] = useState(false);
    
    // Doc Viewer State
    const [viewDocType, setViewDocType] = useState<string | null>(null);

    // --- FORM VIEW STATE ---
    const [pricingRequests, setPricingRequests] = useState<ManualDemand[]>([]);
    const [myInventory, setMyInventory] = useState<PosDevice[]>([]);
    
    // UI Helpers
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bankProofRef = useRef<HTMLInputElement>(null);
    const [activeUploadDoc, setActiveUploadDoc] = useState<'IDENTITY' | 'ADDRESS' | 'FACADE' | 'INTERIOR' | null>(null);
    const [analyzingDoc, setAnalyzingDoc] = useState<string | null>(null);
    
    // Mock Loaders
    const [cnpjLoading, setCnpjLoading] = useState(false);

    // Initial Form State
    const [formData, setFormData] = useState<Partial<RegistrationRequest>>({
        contactPhones: [''],
        contactEmails: [],
        openingHours: { weekdays: { start: '08:00', end: '18:00' }, saturday: { start: '', end: '' } },
        bankAccounts: [], // Array of BankAccount
        docs: { idCard: false, addressProof: false, contract: false }, // Contract legacy key handling
        planType: 'Full',
        requestedEquipments: []
    });

    // Temporary states for complex adds
    const [newEquip, setNewEquip] = useState<{type: 'STOCK' | 'REQUEST', model: string, serial: string, rc: string, accountIndex: number}>({
        type: 'REQUEST', model: 'P2 Smart', serial: '', rc: '', accountIndex: 0
    });

    const [newBank, setNewBank] = useState<BankAccount>({
        tempId: Math.random().toString(),
        bankCode: '', agency: '', accountNumber: '', holderName: '', holderType: 'PJ', accountType: 'Corrente', isThirdParty: false,
        proofFile: null
    });

    useEffect(() => {
        const myDemands = appStore.getDemands().filter(d => d.status === 'Aprovado Pricing' || d.status === 'Concluído');
        setPricingRequests(myDemands);
        const stock = appStore.getPosInventory().filter(p => p.status === 'WithField');
        setMyInventory(stock);
    }, [isSubmitting]);

    const selectedPricingDemand = pricingRequests.find(d => d.id === formData.pricingDemandId);

    // --- FORM HANDLERS ---

    const handleAddPhone = () => {
        setFormData(prev => ({...prev, contactPhones: [...(prev.contactPhones || []), '']}));
    };

    const handlePhoneChange = (index: number, value: string) => {
        const newPhones = [...(formData.contactPhones || [])];
        newPhones[index] = value;
        setFormData(prev => ({...prev, contactPhones: newPhones}));
    };

    const handleAddEmail = () => {
        setFormData(prev => ({...prev, contactEmails: [...(prev.contactEmails || []), '']}));
    };

    const handleEmailChange = (index: number, value: string) => {
        const newEmails = [...(formData.contactEmails || [])];
        newEmails[index] = value;
        setFormData(prev => ({...prev, contactEmails: newEmails}));
    };

    // --- BANK ACCOUNT MANAGEMENT ---
    const handleAddBank = () => {
        if (!newBank.bankCode || !newBank.accountNumber || !newBank.proofFile) {
            alert("Preencha os dados bancários e anexe o comprovante.");
            return;
        }
        setFormData(prev => ({
            ...prev,
            bankAccounts: [...(prev.bankAccounts || []), { ...newBank, tempId: Math.random().toString() }]
        }));
        // Reset
        setNewBank({
            tempId: Math.random().toString(),
            bankCode: '', agency: '', accountNumber: '', holderName: formData.razaoSocial || '', holderType: 'PJ', accountType: 'Corrente', isThirdParty: false, proofFile: null
        });
    };

    const handleRemoveBank = (index: number) => {
        setFormData(prev => ({
            ...prev,
            bankAccounts: prev.bankAccounts?.filter((_, i) => i !== index)
        }));
    };

    const handleBankProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setNewBank(prev => ({ ...prev, proofFile: file }));
            
            // Simulating AI Analysis for Bank Proof
            setAnalyzingDoc('BANK_PROOF');
            setTimeout(() => {
                // Mock extracting data
                setNewBank(prev => ({
                    ...prev,
                    agency: '1234',
                    accountNumber: '56789-0',
                    holderName: formData.razaoSocial || 'TITULAR IA DETECTADO',
                    bankCode: '341 - Itaú Unibanco'
                }));
                setAnalyzingDoc(null);
            }, 1500);
        }
    };

    // --- EQUIPMENT MANAGEMENT ---
    const handleAddEquipment = () => {
        if (formData.bankAccounts?.length === 0) {
            alert("Adicione pelo menos uma conta bancária antes de vincular máquinas.");
            return;
        }

        const item: PosRequestItem = {
            id: Math.random().toString(36).substr(2, 9),
            type: newEquip.type,
            model: newEquip.model,
            serialNumber: newEquip.type === 'STOCK' ? newEquip.serial : undefined,
            rcNumber: newEquip.type === 'STOCK' ? newEquip.rc : undefined,
            linkedAccountIndex: newEquip.accountIndex
        };
        
        if (newEquip.type === 'STOCK' && (!newEquip.serial || !newEquip.rc)) {
            alert("Para estoque próprio, Serial e RC são obrigatórios.");
            return;
        }

        setFormData(prev => ({
            ...prev,
            requestedEquipments: [...(prev.requestedEquipments || []), item]
        }));
        setNewEquip({ type: 'REQUEST', model: 'P2 Smart', serial: '', rc: '', accountIndex: 0 });
    };

    const handleRemoveEquipment = (id: string) => {
        setFormData(prev => ({
            ...prev,
            requestedEquipments: prev.requestedEquipments?.filter(i => i.id !== id)
        }));
    };

    const handlePricingLink = (demandId: string) => {
        if (!demandId) {
            setFormData(prev => ({ ...prev, pricingDemandId: undefined }));
            return;
        }
        setFormData(prev => ({ ...prev, pricingDemandId: demandId }));
        
        // Auto-fill client name if empty
        const demand = pricingRequests.find(d => d.id === demandId);
        if (demand && !formData.clientName) {
             setFormData(prev => ({ ...prev, clientName: demand.clientName }));
        }
    };

    // --- STYLES & VALIDATION ---
    const getFieldClass = (value: any, validator?: (v: any) => boolean) => {
        const isFilled = value && value.toString().trim() !== '';
        const isValid = validator ? (isFilled && validator(value)) : isFilled;
        return showErrors && !isValid 
            ? "border-red-500 focus:border-red-500 bg-red-50 text-red-900 placeholder-red-300" 
            : "border-brand-gray-300 focus:border-brand-primary bg-white";
    };

    const getLabelClass = (value: any) => {
        const isValid = value && value.toString().trim() !== '';
        return showErrors && !isValid ? "text-red-600 font-extrabold" : "text-brand-gray-500 font-bold";
    };

    // --- ACTIONS ---
    const handleCnpjSearch = async () => {
        if (!formData.documentNumber || formData.documentNumber.length < 14) { alert("CNPJ inválido."); return; }
        setCnpjLoading(true);
        setTimeout(() => {
            setFormData(prev => ({
                ...prev,
                razaoSocial: 'AUTO CENTER EXEMPLO LTDA',
                clientName: 'AUTO CENTER EXEMPLO',
                address: 'AVENIDA PAULISTA, 1000 - BELA VISTA - SAO PAULO - SP',
                cnae: '45.20-0-01 - Serviços de manutenção e reparação mecânica de veículos automotores',
                inscricaoEstadual: '123.456.789.111',
                email: 'contato@autocenterexemplo.com.br'
            }));
            setCnpjLoading(false);
        }, 1000);
    };

    const triggerUpload = (docType: 'IDENTITY' | 'ADDRESS' | 'FACADE' | 'INTERIOR') => {
        setActiveUploadDoc(docType);
        if (fileInputRef.current) { 
            // Allow multiple only for Interior
            if (docType === 'INTERIOR') {
                fileInputRef.current.setAttribute('multiple', 'true');
            } else {
                fileInputRef.current.removeAttribute('multiple');
            }
            fileInputRef.current.value = ''; 
            fileInputRef.current.click(); 
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !activeUploadDoc) return;
        
        const files = Array.from(e.target.files);
        setAnalyzingDoc(activeUploadDoc);
        
        setTimeout(() => { // Mock upload
            setFormData(prev => {
                const docs = { ...prev.docs };
                if (activeUploadDoc === 'IDENTITY') { docs.idCard = true; docs.idCardFile = files[0]; }
                if (activeUploadDoc === 'ADDRESS') { docs.addressProof = true; docs.addressProofFile = files[0]; }
                
                // NEW: FACADE & INTERIOR
                if (activeUploadDoc === 'FACADE') { 
                    docs.facade = true; 
                    docs.facadeFile = files[0]; 
                }
                if (activeUploadDoc === 'INTERIOR') { 
                    // Append new files to existing array or create new
                    const currentFiles = docs.interiorFiles || [];
                    docs.interiorFiles = [...currentFiles, ...files];
                }

                return { ...prev, docs };
            });
            setAnalyzingDoc(null);
            setActiveUploadDoc(null);
        }, 1500);
    };

    const handleReview = (e: React.FormEvent) => {
        e.preventDefault();
        const required = [
            formData.documentNumber, formData.clientName, formData.responsibleName, formData.email, 
            formData.address
        ];
        const hasEmpty = required.some(f => !f || f.toString().trim() === '');
        const hasEquip = formData.requestedEquipments && formData.requestedEquipments.length > 0;
        const hasBank = formData.bankAccounts && formData.bankAccounts.length > 0;
        
        // Updated Doc Validation
        const hasDocs = formData.docs?.idCard && formData.docs?.addressProof;
        const hasFacade = !!formData.docs?.facade;
        const hasInterior = (formData.docs?.interiorFiles?.length || 0) >= 3;
        
        if (hasEmpty || !hasEquip || !hasBank || !hasDocs || !hasFacade || !hasInterior) {
            setShowErrors(true);
            let msg = "Verifique: Campos obrigatórios.";
            if(!hasEquip) msg += "\n- Pelo menos 1 equipamento.";
            if(!hasBank) msg += "\n- Pelo menos 1 conta bancária.";
            if(!hasDocs) msg += "\n- Docs básicos (RG/CNH + Comp. Endereço).";
            if(!hasFacade) msg += "\n- Foto da Fachada.";
            if(!hasInterior) msg += "\n- Mínimo 3 Fotos Internas.";
            
            alert(msg);
            return;
        }
        setShowErrors(false);
        setIsPreviewOpen(true);
    };

    const handleConfirmSubmit = () => {
        setIsSubmitting(true);
        const newRequest: RegistrationRequest = {
            id: `REG-${Math.floor(Math.random() * 10000)}`,
            ...formData as RegistrationRequest,
            requesterName: 'Usuário Atual',
            requesterRole: role === UserRole.INSIDE_SALES ? 'Inside Sales' : 'Field Sales',
            dateSubmitted: new Date().toISOString(),
            status: 'PENDING_ANALYSIS',
            docs: formData.docs || {}
        };
        setTimeout(() => {
            appStore.addRegistrationRequest(newRequest);
            setIsSubmitting(false);
            setIsPreviewOpen(false);
            setViewMode('LIST');
            // Reset
            setFormData({ 
                contactPhones: [''], openingHours: { weekdays: { start: '08:00', end: '18:00' } }, 
                bankAccounts: [], 
                docs: { idCard: false, addressProof: false, contract: false }, planType: 'Full', requestedEquipments: [] 
            }); 
            alert("Cadastro enviado com sucesso!");
        }, 1000);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <header className="flex justify-between items-center mb-6">
                <div><h1 className="text-2xl font-bold text-brand-gray-900">Credenciamento</h1><p className="text-brand-gray-600 text-sm">Novo estabelecimento ou acompanhamento.</p></div>
                <div className="flex space-x-1 bg-brand-gray-200 p-1 rounded-xl">
                    <button onClick={() => setViewMode('FORM')} className={`px-4 py-2 rounded-lg text-sm font-bold ${viewMode === 'FORM' ? 'bg-white shadow text-brand-primary' : 'text-brand-gray-600'}`}>Novo</button>
                    <button onClick={() => setViewMode('LIST')} className={`px-4 py-2 rounded-lg text-sm font-bold ${viewMode === 'LIST' ? 'bg-white shadow text-brand-primary' : 'text-brand-gray-600'}`}>Histórico</button>
                </div>
            </header>

            {viewMode === 'FORM' && (
                <>
                    {/* Hidden Inputs for General Docs */}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                    
                    <form onSubmit={handleReview} className="space-y-8 animate-fade-in">
                        {showErrors && <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-red-700 text-sm font-bold">Verifique os campos obrigatórios e documentos anexados.</div>}
                        
                        {/* 1. Identification */}
                        <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-gray-100">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Building2 className="w-5 h-5 text-brand-primary" /> Identificação</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="relative">
                                    <label className={`block text-xs uppercase mb-1 ${getLabelClass(formData.documentNumber)}`}>CNPJ *</label>
                                    <div className="flex gap-2">
                                        <input required className={`flex-1 rounded-lg px-3 py-2 text-sm border ${getFieldClass(formData.documentNumber)}`} value={formData.documentNumber || ''} onChange={e => setFormData({...formData, documentNumber: e.target.value})} />
                                        <button type="button" onClick={handleCnpjSearch} className="bg-brand-primary/10 text-brand-primary px-3 py-2 rounded-lg hover:bg-brand-primary/20">{cnpjLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4"/>}</button>
                                    </div>
                                </div>
                                <div><label className={`block text-xs uppercase mb-1 ${getLabelClass(formData.clientName)}`}>Nome Fantasia *</label><input className={`w-full rounded-lg px-3 py-2 text-sm border ${getFieldClass(formData.clientName)}`} value={formData.clientName || ''} onChange={e => setFormData({...formData, clientName: e.target.value})} /></div>
                            </div>
                        </section>

                        {/* 2. Complementary & Operational */}
                        <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-gray-100">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-brand-primary" /> Dados Complementares & Operacional</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Razão Social</label><input className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm" value={formData.razaoSocial || ''} onChange={e => setFormData({...formData, razaoSocial: e.target.value})} /></div>
                                
                                {/* NEW INPUTS for Inscrição and CNAE */}
                                <div><label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Inscrição Estadual</label><input className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm" value={formData.inscricaoEstadual || ''} onChange={e => setFormData({...formData, inscricaoEstadual: e.target.value})} placeholder="Ex: 123.456.789.111" /></div>
                                
                                <div><label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">CNAE Principal</label><input className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm" value={formData.cnae || ''} onChange={e => setFormData({...formData, cnae: e.target.value})} placeholder="Ex: 45.20-0-01" /></div>

                                <div><label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Volume Veículos/Mês</label><input type="number" className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm" value={formData.monthlyVehicleVolume || ''} onChange={e => setFormData({...formData, monthlyVehicleVolume: Number(e.target.value)})} placeholder="Ex: 50" /></div>
                            </div>
                        </section>

                        {/* 3. Contact & Location */}
                        <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-gray-100">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-brand-primary" /> Contato e Localização</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className={`block text-xs uppercase mb-1 ${getLabelClass(formData.responsibleName)}`}>Responsável *</label><input className={`w-full rounded-lg px-3 py-2 text-sm border ${getFieldClass(formData.responsibleName)}`} value={formData.responsibleName || ''} onChange={e => setFormData({...formData, responsibleName: e.target.value})} /></div>
                                    <div><label className={`block text-xs uppercase mb-1 ${getLabelClass(formData.address)}`}>Endereço *</label><AddressAutocomplete value={formData.address || ''} onChange={val => setFormData({...formData, address: val})} className={getFieldClass(formData.address).replace('bg-white', '')} /></div>
                                </div>
                                {/* Multiple Contacts */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Telefones</label>
                                        {formData.contactPhones?.map((phone, idx) => (
                                            <input key={idx} className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm mb-2" value={phone} onChange={e => handlePhoneChange(idx, e.target.value)} placeholder="(00) 00000-0000" />
                                        ))}
                                        <button type="button" onClick={handleAddPhone} className="text-xs text-brand-primary font-bold">+ Adicionar Telefone</button>
                                    </div>
                                    <div>
                                        <label className={`block text-xs uppercase mb-1 ${getLabelClass(formData.email)}`}>E-mail Principal *</label>
                                        <input className={`w-full rounded-lg px-3 py-2 text-sm border ${getFieldClass(formData.email)}`} value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                                        {formData.contactEmails?.map((email, idx) => (
                                            <input key={idx} className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm mt-2" value={email} onChange={e => handleEmailChange(idx, e.target.value)} placeholder="E-mail adicional" />
                                        ))}
                                        <button type="button" onClick={handleAddEmail} className="text-xs text-brand-primary font-bold mt-2">+ Adicionar E-mail</button>
                                    </div>
                                </div>
                                {/* Opening Hours */}
                                <div className="bg-brand-gray-50 p-4 rounded-lg border border-brand-gray-200">
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-2">Horário de Funcionamento</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-xs text-gray-500 block mb-1">Segunda a Sexta</span>
                                            <div className="flex gap-2">
                                                <input type="time" className="w-full border rounded px-2 py-1 text-sm" value={formData.openingHours?.weekdays.start} onChange={e => setFormData({...formData, openingHours: {...formData.openingHours!, weekdays: {...formData.openingHours!.weekdays, start: e.target.value}}})} />
                                                <input type="time" className="w-full border rounded px-2 py-1 text-sm" value={formData.openingHours?.weekdays.end} onChange={e => setFormData({...formData, openingHours: {...formData.openingHours!, weekdays: {...formData.openingHours!.weekdays, end: e.target.value}}})} />
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500 block mb-1">Sábado (Opcional)</span>
                                            <div className="flex gap-2">
                                                <input type="time" className="w-full border rounded px-2 py-1 text-sm" value={formData.openingHours?.saturday?.start} onChange={e => setFormData({...formData, openingHours: {...formData.openingHours!, saturday: {...formData.openingHours!.saturday!, start: e.target.value}}})} />
                                                <input type="time" className="w-full border rounded px-2 py-1 text-sm" value={formData.openingHours?.saturday?.end} onChange={e => setFormData({...formData, openingHours: {...formData.openingHours!, saturday: {...formData.openingHours!.saturday!, end: e.target.value}}})} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 4. BANK ACCOUNTS MANAGEMENT (Moved before equipment) */}
                        <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-gray-100">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-brand-primary" /> Gestão de Domicílios Bancários</h3>
                            
                            {/* List Added Accounts */}
                            {formData.bankAccounts && formData.bankAccounts.length > 0 && (
                                <div className="space-y-3 mb-6">
                                    {formData.bankAccounts.map((acc, idx) => (
                                        <div key={idx} className="bg-brand-gray-50 p-3 rounded-lg border border-brand-gray-200 flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-sm text-brand-gray-800">{acc.bankCode} - {acc.holderName}</p>
                                                <p className="text-xs text-brand-gray-500">Ag: {acc.agency} | CC: {acc.accountNumber}</p>
                                                {acc.proofFile ? (
                                                    <span className="text-[10px] text-green-600 flex items-center gap-1 mt-1"><CheckCircle2 size={10}/> Comprovante Anexado</span>
                                                ) : (
                                                    <span className="text-[10px] text-red-500 flex items-center gap-1 mt-1"><AlertCircle size={10}/> Sem comprovante</span>
                                                )}
                                            </div>
                                            <button type="button" onClick={() => handleRemoveBank(idx)} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={16}/></button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add New Account Form */}
                            <div className="bg-brand-gray-50 p-4 rounded-xl border border-dashed border-brand-gray-300">
                                <h4 className="text-xs font-bold text-brand-gray-500 uppercase mb-3">Adicionar Nova Conta</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                    <div className="col-span-2">
                                        <select className="w-full border rounded p-2 text-sm" value={newBank.bankCode} onChange={e => setNewBank({...newBank, bankCode: e.target.value})}>
                                            <option value="">Selecione o Banco...</option>
                                            {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                    </div>
                                    <input className="w-full border rounded p-2 text-sm" placeholder="Agência" value={newBank.agency} onChange={e => setNewBank({...newBank, agency: e.target.value})} />
                                    <input className="w-full border rounded p-2 text-sm" placeholder="Conta" value={newBank.accountNumber} onChange={e => setNewBank({...newBank, accountNumber: e.target.value})} />
                                    <input className="w-full border rounded p-2 text-sm col-span-2" placeholder="Titular" value={newBank.holderName || formData.razaoSocial || ''} onChange={e => setNewBank({...newBank, holderName: e.target.value})} />
                                    <select className="w-full border rounded p-2 text-sm" value={newBank.accountType} onChange={e => setNewBank({...newBank, accountType: e.target.value as any})}>
                                        <option value="Corrente">Corrente</option>
                                        <option value="Poupança">Poupança</option>
                                    </select>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <label className="cursor-pointer bg-white border border-brand-gray-300 text-brand-gray-600 px-3 py-1.5 rounded text-xs font-bold hover:bg-brand-gray-100 flex items-center gap-2">
                                            <UploadCloud size={14} /> Anexar Comprovante
                                            <input type="file" className="hidden" accept="image/*,.pdf" ref={bankProofRef} onChange={handleBankProofUpload} />
                                        </label>
                                        {newBank.proofFile && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 size={12}/> {newBank.proofFile.name}</span>}
                                        {analyzingDoc === 'BANK_PROOF' && <span className="text-xs text-brand-primary animate-pulse">IA Analisando...</span>}
                                    </div>
                                    <button type="button" onClick={handleAddBank} className="bg-brand-gray-900 text-white px-4 py-2 rounded text-xs font-bold hover:bg-black">+ Incluir Conta</button>
                                </div>
                            </div>
                        </section>

                        {/* 5. Commercial & Equipment (Updated) */}
                        <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-gray-100">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Briefcase className="w-5 h-5 text-brand-primary" /> Comercial & Equipamentos</h3>
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-2">Plano</label>
                                        <div className="flex bg-brand-gray-100 p-1 rounded-lg">
                                            <button type="button" onClick={() => setFormData({...formData, planType: 'Full'})} className={`flex-1 py-2 text-sm font-bold rounded ${formData.planType === 'Full' ? 'bg-white text-green-700 shadow' : 'text-gray-500'}`}>FULL</button>
                                            <button type="button" onClick={() => setFormData({...formData, planType: 'Simples'})} className={`flex-1 py-2 text-sm font-bold rounded ${formData.planType === 'Simples' ? 'bg-white text-blue-700 shadow' : 'text-gray-500'}`}>SIMPLES</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Vincular Negociação</label>
                                        <select className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.pricingDemandId || ''} onChange={e => handlePricingLink(e.target.value)}>
                                            <option value="">Sem negociação</option>
                                            {pricingRequests.map(req => <option key={req.id} value={req.id}>#{req.id} - {req.clientName}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* MULTI POS SECTION */}
                                <div className="bg-brand-gray-50 p-4 rounded-xl border border-brand-gray-200">
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-3">Lista de Equipamentos</label>
                                    {formData.requestedEquipments && formData.requestedEquipments.length > 0 && (
                                        <div className="space-y-2 mb-4">
                                            {formData.requestedEquipments.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-brand-gray-200 shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`text-[10px] font-bold px-2 py-1 rounded text-white ${item.type === 'STOCK' ? 'bg-blue-600' : 'bg-brand-gray-600'}`}>
                                                            {item.type === 'STOCK' ? 'MEU ESTOQUE' : 'SOLICITAR ENVIO'}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-brand-gray-800">{item.model}</p>
                                                            {item.serialNumber && (
                                                                <p className="text-[10px] font-mono text-brand-gray-500">
                                                                    SN: {item.serialNumber} | RC: {item.rcNumber}
                                                                </p>
                                                            )}
                                                            <p className="text-[10px] text-brand-gray-400 mt-0.5">
                                                                Conta Vinculada: {formData.bankAccounts?.[item.linkedAccountIndex || 0]?.bankCode || 'N/A'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button type="button" onClick={() => handleRemoveEquipment(item.id)} className="text-brand-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    
                                    {/* Add Equipment Form */}
                                    <div className="bg-white p-3 rounded-lg border border-brand-gray-200 border-dashed space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Origem</label>
                                                <select className="w-full border rounded text-sm py-1.5" value={newEquip.type} onChange={e => setNewEquip({...newEquip, type: e.target.value as any, serial: '', rc: ''})}>
                                                    <option value="REQUEST">Solicitar à Logística</option>
                                                    <option value="STOCK">Meu Estoque (Pronta-Entrega)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Modelo</label>
                                                <select className="w-full border rounded text-sm py-1.5" value={newEquip.model} onChange={e => setNewEquip({...newEquip, model: e.target.value})}>
                                                    {POS_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        
                                        {/* GROUPED: RC, SN and Model (Model above) */}
                                        {newEquip.type === 'STOCK' && (
                                            <div className="grid grid-cols-2 gap-3 bg-blue-50 p-2 rounded border border-blue-100">
                                                <div>
                                                    <label className="block text-[10px] uppercase font-bold text-blue-700 mb-1">Serial Number</label>
                                                    <select className="w-full border rounded text-sm py-1.5 font-mono" value={newEquip.serial} onChange={e => {
                                                        const selectedPos = myInventory.find(p => p.serialNumber === e.target.value);
                                                        setNewEquip({...newEquip, serial: e.target.value, rc: selectedPos?.rcNumber || '', model: selectedPos?.model || newEquip.model });
                                                    }}>
                                                        <option value="">Selecione...</option>
                                                        {myInventory.map(pos => <option key={pos.serialNumber} value={pos.serialNumber}>{pos.serialNumber}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] uppercase font-bold text-blue-700 mb-1">RC Number</label>
                                                    <input className="w-full border rounded text-sm py-1.5 font-mono bg-gray-100 text-gray-500" readOnly value={newEquip.rc} placeholder="RC000000" />
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Vincular Conta Bancária *</label>
                                            <select className="w-full border rounded text-sm py-1.5" value={newEquip.accountIndex} onChange={e => setNewEquip({...newEquip, accountIndex: Number(e.target.value)})}>
                                                {formData.bankAccounts && formData.bankAccounts.length > 0 ? (
                                                    formData.bankAccounts.map((acc, idx) => (
                                                        <option key={idx} value={idx}>Conta {idx+1}: {acc.bankCode} - {acc.accountNumber}</option>
                                                    ))
                                                ) : (
                                                    <option value="">Nenhuma conta cadastrada</option>
                                                )}
                                            </select>
                                        </div>

                                        <button type="button" onClick={handleAddEquipment} className="w-full bg-brand-gray-900 text-white text-xs font-bold py-2 rounded hover:bg-black transition-colors">
                                            + Adicionar POS
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 6. GENERAL DOCUMENTATION (Contract, ID, etc) */}
                        <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-gray-100">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FileCheck className="w-5 h-5 text-brand-primary" /> Documentação Geral</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Contract - REMOVED AS PER REQUEST */}
                                
                                {/* Identity */}
                                <div className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-colors cursor-pointer hover:bg-brand-gray-50 ${formData.docs?.idCard ? 'border-green-300 bg-green-50' : 'border-brand-gray-300'}`} onClick={() => triggerUpload('IDENTITY')}>
                                    {formData.docs?.idCard ? <CheckCircle2 className="w-8 h-8 text-green-500 mb-2"/> : <User className="w-8 h-8 text-brand-gray-400 mb-2"/>}
                                    <span className="text-xs font-bold text-brand-gray-600">Doc. Identidade (RG/CNH)</span>
                                    {analyzingDoc === 'IDENTITY' && <span className="text-[10px] text-brand-primary animate-pulse mt-1">Analisando...</span>}
                                </div>
                                {/* Address */}
                                <div className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-colors cursor-pointer hover:bg-brand-gray-50 ${formData.docs?.addressProof ? 'border-green-300 bg-green-50' : 'border-brand-gray-300'}`} onClick={() => triggerUpload('ADDRESS')}>
                                    {formData.docs?.addressProof ? <CheckCircle2 className="w-8 h-8 text-green-500 mb-2"/> : <MapPin className="w-8 h-8 text-brand-gray-400 mb-2"/>}
                                    <span className="text-xs font-bold text-brand-gray-600">Comprovante de Endereço</span>
                                    {analyzingDoc === 'ADDRESS' && <span className="text-[10px] text-brand-primary animate-pulse mt-1">Analisando...</span>}
                                </div>
                                {/* FACADE PHOTO */}
                                <div className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-colors cursor-pointer hover:bg-brand-gray-50 ${formData.docs?.facade ? 'border-green-300 bg-green-50' : 'border-brand-gray-300'}`} onClick={() => triggerUpload('FACADE')}>
                                    {formData.docs?.facade ? <CheckCircle2 className="w-8 h-8 text-green-500 mb-2"/> : <Store className="w-8 h-8 text-brand-gray-400 mb-2"/>}
                                    <span className="text-xs font-bold text-brand-gray-600">Foto da Fachada</span>
                                </div>
                                {/* INTERIOR PHOTOS */}
                                <div className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-colors cursor-pointer hover:bg-brand-gray-50 ${(formData.docs?.interiorFiles?.length || 0) >= 3 ? 'border-green-300 bg-green-50' : 'border-brand-gray-300'}`} onClick={() => triggerUpload('INTERIOR')}>
                                    {(formData.docs?.interiorFiles?.length || 0) >= 3 ? <CheckCircle2 className="w-8 h-8 text-green-500 mb-2"/> : <Camera className="w-8 h-8 text-brand-gray-400 mb-2"/>}
                                    <span className="text-xs font-bold text-brand-gray-600">Fotos Internas (Min 3)</span>
                                    {(formData.docs?.interiorFiles?.length || 0) > 0 && <span className="text-[10px] bg-brand-gray-200 px-2 rounded mt-1">{formData.docs?.interiorFiles?.length} enviadas</span>}
                                </div>
                            </div>
                        </section>

                        <div className="flex justify-end pt-4">
                            <button type="submit" className="bg-brand-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-brand-dark transition-all flex items-center gap-2"><Eye className="w-5 h-5" /> Revisar Cadastro</button>
                        </div>
                    </form>
                </>
            )}

            {/* List View */}
            {viewMode === 'LIST' && (
                <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden p-6 text-center text-gray-500">
                    <p>Histórico de envios simplificado.</p>
                </div>
            )}

            <PreviewModal 
                isOpen={isPreviewOpen} 
                onClose={() => setIsPreviewOpen(false)} 
                onConfirm={handleConfirmSubmit} 
                isSubmitting={isSubmitting} 
                data={formData} 
                onViewDoc={(type) => setViewDocType(type)}
            />
            <RatesModal 
                isOpen={isRatesModalOpen} 
                onClose={() => setIsRatesModalOpen(false)} 
                demand={selectedPricingDemand} 
            />
            <DocViewerModal isOpen={!!viewDocType} onClose={() => setViewDocType(null)} docType={viewDocType} />
        </div>
    );
};

export default CadastroPage;
