
import React, { useState, useEffect, useRef } from 'react';
import { 
    FileCheck, Search, Filter, AlertCircle, CheckCircle2, X, 
    FileText, User, Calendar, ExternalLink, ArrowRight, Loader2,
    Building2, MapPin, Phone, Mail, Clock, DollarSign, CreditCard,
    Camera, Image as ImageIcon, Briefcase, Plus, Trash2, Smartphone, Save, UploadCloud, ShieldCheck
} from 'lucide-react';
import { appStore } from '../services/store';
import { RegistrationRequest, UserRole, RegistrationStatus, BankAccount, ManualDemand, PosDevice } from '../types';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import { PagmotorsLogo } from '../components/Logo';
import { analyzeDocument } from '../services/geminiService';

interface CadastroPageProps {
    role?: UserRole | null;
}

const ESTABLISHMENT_TYPES = [
    'Funilaria e Pintura', 
    'Centro Automotivo', 
    'Mecânica/Elétrica', 
    'Estética/Lavagem', 
    'Som e Acessórios', 
    'Revenda', 
    'Revenda Motos'
];

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

const CadastroPage: React.FC<CadastroPageProps> = ({ role }) => {
    const isAdmin = role === UserRole.ADMIN;
    
    // VIEW STATE: Sales starts on FORM, Admin starts on LIST
    const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('FORM');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- LIST VIEW STATE (Admin & Sales Tracking) ---
    const [requests, setRequests] = useState<RegistrationRequest[]>([]);
    const [statusFilter, setStatusFilter] = useState<RegistrationStatus | 'ALL'>('PENDING_ANALYSIS');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedReq, setSelectedReq] = useState<RegistrationRequest | null>(null);
    const [isApproving, setIsApproving] = useState(false);

    // --- FORM VIEW STATE (New Registration) ---
    const [clientIdSearch, setClientIdSearch] = useState('');
    const [pricingRequests, setPricingRequests] = useState<ManualDemand[]>([]);
    const [myInventory, setMyInventory] = useState<PosDevice[]>([]);
    
    // File Upload State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeUploadDoc, setActiveUploadDoc] = useState<'IDENTITY' | 'ADDRESS' | 'BANK_PROOF' | null>(null);
    const [analyzingDoc, setAnalyzingDoc] = useState<string | null>(null);
    
    // Form Data
    const [formData, setFormData] = useState<Partial<RegistrationRequest>>({
        contactPhones: [''],
        openingHours: { weekdays: { start: '08:00', end: '18:00' } },
        bankAccount: { 
            isThirdParty: false, 
            accountType: 'Corrente', 
            holderType: 'PJ',
            bankCode: '', agency: '', accountNumber: '', holderName: '' 
        },
        docs: { contract: false, idCard: false, addressProof: false, bankProof: false },
        planType: 'Full'
    });

    // Mock AI States
    const [cnpjLoading, setCnpjLoading] = useState(false);
    const [posAiValidating, setPosAiValidating] = useState(false);

    useEffect(() => {
        // Set default view based on role only on mount
        if (isAdmin) setViewMode('LIST');
        
        setRequests(appStore.getRegistrationRequests());
        // Load Pricing Requests for Linkage
        const myDemands = appStore.getDemands().filter(d => 
            d.status === 'Aprovado Pricing' || d.status === 'Concluído'
        );
        setPricingRequests(myDemands);

        // Load Inventory (Mock filtering by current user for Field Sales)
        // In real app, filter by actual logged in user ID
        const stock = appStore.getPosInventory().filter(p => 
            p.status === 'WithField' // Assuming user has stock
        );
        setMyInventory(stock);

    }, [isApproving, isSubmitting, isAdmin]); // Refresh when approved or submitted

    // --- LIST VIEW LOGIC ---
    const filteredRequests = requests.filter(req => {
        const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
        const matchesSearch = 
            req.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            req.documentNumber.includes(searchTerm) ||
            req.id.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const handleApprove = async () => {
        if (!selectedReq) return;
        setIsApproving(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        appStore.approveRegistration(selectedReq);
        setIsApproving(false);
        setSelectedReq(null);
        alert(`Cadastro aprovado! Enviado para a esteira de Logística.`);
    };

    const handleReject = () => {
        if (!selectedReq) return;
        const reason = prompt("Motivo da rejeição / pendência:");
        if (reason) {
            const updated: RegistrationRequest = { ...selectedReq, status: 'MISSING_DOCS', notes: reason };
            appStore.updateRegistrationRequest(updated);
            setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
            setSelectedReq(null);
        }
    };

    // --- FORM VIEW LOGIC ---

    const handleCnpjSearch = async () => {
        if (!formData.documentNumber || formData.documentNumber.length < 14) {
            alert("Digite um CNPJ válido.");
            return;
        }
        setCnpjLoading(true);
        setTimeout(() => {
            // Mock Receita Federal Data
            setFormData(prev => ({
                ...prev,
                razaoSocial: 'AUTO CENTER EXEMPLO LTDA',
                clientName: 'AUTO CENTER EXEMPLO', // Nome Fantasia
                address: 'AVENIDA PAULISTA, 1000 - BELA VISTA - SAO PAULO - SP',
                cnae: '45.20-0-01 - Serviços de manutenção e reparação mecânica de veículos automotores',
                inscricaoEstadual: '123.456.789.111',
                email: 'contato@autocenterexemplo.com.br'
            }));
            setCnpjLoading(false);
        }, 1500);
    };

    const handlePreFillFromBase = () => {
        const client = appStore.getClients().find(c => c.id === clientIdSearch || c.cnpj === clientIdSearch);
        if (client) {
            setFormData(prev => ({
                ...prev,
                clientName: client.nomeEc,
                documentNumber: client.cnpj || prev.documentNumber, // Assume ClientBase might have CNPJ
                address: client.endereco,
                responsibleName: client.responsavel,
                contactPhones: [client.contato],
                email: 'cliente@exemplo.com.br' // Mock if missing
            }));
            alert("Dados importados da Base de Clientes!");
        } else {
            alert("Cliente não encontrado na base.");
        }
    };

    const handlePosSelection = (serial: string) => {
        const pos = myInventory.find(p => p.serialNumber === serial);
        if (pos) {
            setFormData(prev => ({
                ...prev,
                posData: { serialNumber: pos.serialNumber, rcNumber: pos.rcNumber }
            }));
            // Simulate AI Validation of POS Photo
            setPosAiValidating(true);
            setTimeout(() => setPosAiValidating(false), 2000);
        }
    };

    const handlePricingLink = (demandId: string) => {
        const demand = pricingRequests.find(d => d.id === demandId);
        if (demand) {
            setFormData(prev => ({
                ...prev,
                pricingDemandId: demand.id,
                clientName: demand.clientName, // Auto-sync name
                // Could verify if plan matches demand type etc.
            }));
        }
    };

    // --- DOCUMENT UPLOAD & AI ANALYSIS ---
    const triggerUpload = (docType: 'IDENTITY' | 'ADDRESS' | 'BANK_PROOF') => {
        setActiveUploadDoc(docType);
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Reset
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !activeUploadDoc) return;
        
        const file = e.target.files[0];
        setAnalyzingDoc(activeUploadDoc);

        // Convert to Base64
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result as string;
            // Remove prefix "data:image/jpeg;base64,"
            const base64Data = base64String.split(',')[1];

            try {
                // Call Gemini Service
                const extractedData = await analyzeDocument(base64Data, activeUploadDoc);
                
                if (extractedData) {
                    setFormData(prev => {
                        let updated = { ...prev };
                        let updatedDocs = { ...prev.docs };

                        if (activeUploadDoc === 'IDENTITY') {
                            if (extractedData.name) updated.responsibleName = extractedData.name;
                            updatedDocs.idCard = true;
                        } else if (activeUploadDoc === 'ADDRESS') {
                            if (extractedData.fullAddress) updated.address = extractedData.fullAddress;
                            updatedDocs.addressProof = true;
                        } else if (activeUploadDoc === 'BANK_PROOF') {
                            updated.bankAccount = {
                                ...prev.bankAccount!,
                                holderName: extractedData.holder || prev.bankAccount?.holderName,
                                agency: extractedData.agency || prev.bankAccount?.agency,
                                accountNumber: extractedData.account || prev.bankAccount?.accountNumber,
                                bankCode: prev.bankAccount?.bankCode // AI might not map code perfectly, leave as is or basic mapping
                            };
                            updatedDocs.bankProof = true;
                        }
                        
                        return { ...updated, docs: updatedDocs as any };
                    });
                    alert("Documento validado com IA! Dados extraídos e preenchidos.");
                } else {
                    alert("Não foi possível extrair dados legíveis deste documento. Verifique a imagem.");
                }
            } catch (err) {
                console.error(err);
                alert("Erro ao analisar documento. Tente novamente.");
            } finally {
                setAnalyzingDoc(null);
                setActiveUploadDoc(null);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSubmitRegistration = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const newRequest: RegistrationRequest = {
            id: `REG-${Math.floor(Math.random() * 10000)}`,
            ...formData as RegistrationRequest,
            requesterName: 'Usuário Atual', // Mock
            requesterRole: role === UserRole.INSIDE_SALES ? 'Inside Sales' : 'Field Sales',
            dateSubmitted: new Date().toISOString(),
            status: 'PENDING_ANALYSIS',
            // Ensure docs state is carried over
            docs: formData.docs || { contract: false, idCard: false, addressProof: false, bankProof: false } 
        };

        // Simulate API
        setTimeout(() => {
            appStore.addRegistrationRequest(newRequest);
            setIsSubmitting(false);
            setViewMode('LIST');
            setFormData({}); // Reset
            alert("Cadastro enviado com sucesso para o time Administrativo!");
        }, 1500);
    };

    // --- COMPONENT: SALES LAYOUT (Form + My Envios Tab) ---
    if (!isAdmin) {
        return (
            <div className="max-w-5xl mx-auto space-y-6 pb-20">
                {/* Header & Tabs */}
                <header>
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-brand-gray-900">Credenciamento</h1>
                            <p className="text-brand-gray-600 text-sm">Cadastre novos estabelecimentos ou acompanhe o status.</p>
                        </div>
                        <div className="hidden sm:block opacity-90">
                            <PagmotorsLogo className="scale-90 text-brand-gray-900" />
                        </div>
                    </div>

                    <div className="flex space-x-1 bg-brand-gray-200 p-1 rounded-xl w-fit">
                        <button 
                            onClick={() => setViewMode('FORM')}
                            className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'FORM' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-800'}`}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Novo Cadastro
                        </button>
                        <button 
                            onClick={() => setViewMode('LIST')}
                            className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'LIST' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-800'}`}
                        >
                            <FileCheck className="w-4 h-4 mr-2" />
                            Meus Envios
                        </button>
                    </div>
                </header>

                {/* --- TAB CONTENT: FORM --- */}
                {viewMode === 'FORM' && (
                    <>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleFileChange}
                        />
                        
                        <form onSubmit={handleSubmitRegistration} className="space-y-8 animate-fade-in">
                            {/* 1. Identification */}
                            <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-gray-100">
                                <h3 className="font-bold text-brand-gray-900 text-lg mb-4 flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-brand-primary" /> Identificação do EC
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 bg-brand-gray-50 p-4 rounded-lg">
                                    <div className="md:col-span-2 relative">
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Buscar na Base (ID ou CNPJ)</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                className="flex-1 border border-brand-gray-300 rounded-lg px-3 py-2 text-sm"
                                                placeholder="Se já visitou, busque aqui..."
                                                value={clientIdSearch}
                                                onChange={e => setClientIdSearch(e.target.value)}
                                            />
                                            <button type="button" onClick={handlePreFillFromBase} className="bg-brand-gray-900 text-white px-4 py-2 rounded-lg text-xs font-bold">Carregar</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="relative">
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">CNPJ *</label>
                                        <div className="flex gap-2">
                                            <input 
                                                required
                                                type="text" 
                                                className="flex-1 border border-brand-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-primary"
                                                value={formData.documentNumber || ''}
                                                onChange={e => setFormData({...formData, documentNumber: e.target.value})}
                                                placeholder="00.000.000/0000-00"
                                            />
                                            <button 
                                                type="button" 
                                                onClick={handleCnpjSearch}
                                                disabled={cnpjLoading}
                                                className="bg-brand-primary/10 text-brand-primary px-3 py-2 rounded-lg text-xs font-bold hover:bg-brand-primary/20 transition-colors flex items-center"
                                            >
                                                {cnpjLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Inscrição Estadual</label>
                                        <input className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50" readOnly value={formData.inscricaoEstadual || ''} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Razão Social</label>
                                        <input className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50" readOnly value={formData.razaoSocial || ''} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Nome Fantasia *</label>
                                        <input 
                                            className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:border-brand-primary outline-none" 
                                            value={formData.clientName || ''} 
                                            onChange={e => setFormData({...formData, clientName: e.target.value})}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">CNAE Principal</label>
                                        <input className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50" readOnly value={formData.cnae || ''} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Tipo de Estabelecimento *</label>
                                        <div className="flex flex-wrap gap-2">
                                            {ESTABLISHMENT_TYPES.map(type => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => setFormData({...formData, establishmentType: type})}
                                                    className={`px-3 py-1.5 rounded-full text-xs border transition-all
                                                        ${formData.establishmentType === type 
                                                            ? 'bg-brand-primary text-white border-brand-primary shadow-sm' 
                                                            : 'bg-white text-brand-gray-600 border-brand-gray-200 hover:border-brand-gray-400'}
                                                    `}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* 2. Contact & Address */}
                            <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-gray-100">
                                <h3 className="font-bold text-brand-gray-900 text-lg mb-4 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-brand-primary" /> Contato e Localização
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Nome do Responsável *</label>
                                        <input 
                                            required
                                            className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:border-brand-primary outline-none" 
                                            value={formData.responsibleName || ''} 
                                            onChange={e => setFormData({...formData, responsibleName: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">E-mail Principal *</label>
                                        <input 
                                            type="email"
                                            required
                                            className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:border-brand-primary outline-none" 
                                            value={formData.email || ''} 
                                            onChange={e => setFormData({...formData, email: e.target.value})}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Telefones (WhatsApp) *</label>
                                        {formData.contactPhones?.map((phone, idx) => (
                                            <div key={idx} className="flex gap-2 mb-2">
                                                <input 
                                                    className="flex-1 border border-brand-gray-300 rounded-lg px-3 py-2 text-sm"
                                                    value={phone}
                                                    onChange={e => {
                                                        const newPhones = [...(formData.contactPhones || [])];
                                                        newPhones[idx] = e.target.value;
                                                        setFormData({...formData, contactPhones: newPhones});
                                                    }}
                                                    placeholder="(00) 00000-0000"
                                                />
                                                {idx > 0 && (
                                                    <button type="button" onClick={() => {
                                                        const newPhones = formData.contactPhones?.filter((_, i) => i !== idx);
                                                        setFormData({...formData, contactPhones: newPhones});
                                                    }} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                                                )}
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => setFormData({...formData, contactPhones: [...(formData.contactPhones||[]), '']})} className="text-xs text-brand-primary font-bold flex items-center gap-1">
                                            <Plus className="w-3 h-3" /> Adicionar outro
                                        </button>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Endereço Completo (Busca Automática) *</label>
                                        <AddressAutocomplete 
                                            value={formData.address || ''}
                                            onChange={(val) => setFormData({...formData, address: val})}
                                            required
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* 3. Operational */}
                            <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-gray-100">
                                <h3 className="font-bold text-brand-gray-900 text-lg mb-4 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-brand-primary" /> Operacional
                                </h3>
                                <div className="flex gap-6 flex-wrap">
                                    <div>
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Seg a Sex</label>
                                        <div className="flex items-center gap-2">
                                            <input type="time" className="border rounded px-2 py-1 text-sm" value={formData.openingHours?.weekdays.start} onChange={e => setFormData({...formData, openingHours: {...formData.openingHours!, weekdays: {...formData.openingHours!.weekdays, start: e.target.value}}})} />
                                            <span>até</span>
                                            <input type="time" className="border rounded px-2 py-1 text-sm" value={formData.openingHours?.weekdays.end} onChange={e => setFormData({...formData, openingHours: {...formData.openingHours!, weekdays: {...formData.openingHours!.weekdays, end: e.target.value}}})} />
                                        </div>
                                    </div>
                                    <div className="flex items-end pb-1">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" className="w-4 h-4 text-brand-primary" onChange={(e) => {
                                                if (e.target.checked) setFormData({...formData, openingHours: {...formData.openingHours!, saturday: { start: '08:00', end: '12:00' }}});
                                                else {
                                                    const { saturday, ...rest } = formData.openingHours!;
                                                    setFormData({...formData, openingHours: rest as any});
                                                }
                                            }} />
                                            <span className="text-sm font-medium text-brand-gray-700">Abre aos Sábados?</span>
                                        </label>
                                    </div>
                                    {formData.openingHours?.saturday && (
                                        <div>
                                            <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Sábado</label>
                                            <div className="flex items-center gap-2">
                                                <input type="time" className="border rounded px-2 py-1 text-sm" value={formData.openingHours.saturday.start} onChange={e => setFormData({...formData, openingHours: {...formData.openingHours!, saturday: {...formData.openingHours!.saturday!, start: e.target.value}}})} />
                                                <span>até</span>
                                                <input type="time" className="border rounded px-2 py-1 text-sm" value={formData.openingHours.saturday.end} onChange={e => setFormData({...formData, openingHours: {...formData.openingHours!, saturday: {...formData.openingHours!.saturday!, end: e.target.value}}})} />
                                            </div>
                                        </div>
                                    )}
                                    <div className="ml-auto">
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Volume Mensal (Veículos)</label>
                                        <input type="number" className="border border-brand-gray-300 rounded px-3 py-1.5 text-sm w-32" value={formData.monthlyVolume} onChange={e => setFormData({...formData, monthlyVolume: Number(e.target.value)})} />
                                    </div>
                                </div>
                            </section>

                            {/* 4. Product & Pricing */}
                            <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-gray-100">
                                <h3 className="font-bold text-brand-gray-900 text-lg mb-4 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-brand-primary" /> Produto e Taxas
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-2">Vincular Negociação Aprovada</label>
                                        <select 
                                            className="w-full border border-brand-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none bg-white"
                                            onChange={(e) => handlePricingLink(e.target.value)}
                                            value={formData.pricingDemandId || ''}
                                        >
                                            <option value="">Selecione a negociação...</option>
                                            {pricingRequests.map(d => (
                                                <option key={d.id} value={d.id}>{d.clientName} - {new Date(d.date).toLocaleDateString()}</option>
                                            ))}
                                        </select>
                                        {formData.pricingDemandId && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Taxas vinculadas com sucesso.</p>}
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-2">Plano de Recebimento</label>
                                        <div className="flex bg-brand-gray-100 p-1 rounded-lg">
                                            <button 
                                                type="button"
                                                onClick={() => setFormData({...formData, planType: 'Full'})}
                                                className={`flex-1 py-1.5 text-sm font-bold rounded transition-colors ${formData.planType === 'Full' ? 'bg-white text-brand-primary shadow' : 'text-brand-gray-500'}`}
                                            >Full</button>
                                            <button 
                                                type="button"
                                                onClick={() => setFormData({...formData, planType: 'Simples'})}
                                                className={`flex-1 py-1.5 text-sm font-bold rounded transition-colors ${formData.planType === 'Simples' ? 'bg-white text-brand-primary shadow' : 'text-brand-gray-500'}`}
                                            >Simples</button>
                                        </div>
                                    </div>
                                </div>

                                {/* POS SELECTION */}
                                <div className="bg-brand-gray-50 p-4 rounded-xl border border-brand-gray-200">
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-2">Máquina POS (Estoque do Consultor)</label>
                                    <div className="flex gap-4 items-end">
                                        <select 
                                            className="flex-1 border border-brand-gray-300 rounded-lg px-3 py-2 text-sm outline-none bg-white"
                                            onChange={(e) => handlePosSelection(e.target.value)}
                                            value={formData.posData?.serialNumber || ''}
                                        >
                                            <option value="">Selecionar equipamento...</option>
                                            {myInventory.map(pos => (
                                                <option key={pos.serialNumber} value={pos.serialNumber}>{pos.model} - SN: {pos.serialNumber}</option>
                                            ))}
                                        </select>
                                        <button type="button" className="px-4 py-2 bg-brand-gray-900 text-white rounded-lg text-xs font-bold flex items-center gap-2">
                                            <Camera className="w-4 h-4" /> Foto da POS (IA)
                                        </button>
                                    </div>
                                    {posAiValidating && <p className="text-xs text-brand-primary mt-2 animate-pulse font-bold">IA Analisando foto da POS...</p>}
                                    {formData.posData?.serialNumber && !posAiValidating && (
                                        <div className="mt-2 text-xs flex gap-4 text-brand-gray-600 font-mono">
                                            <span>SN: {formData.posData.serialNumber}</span>
                                            <span>RC: {formData.posData.rcNumber}</span>
                                            <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Validado</span>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* 5. Banking */}
                            <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-gray-100">
                                <h3 className="font-bold text-brand-gray-900 text-lg mb-4 flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-brand-primary" /> Dados Bancários
                                </h3>
                                
                                {/* Auto-fill from Receipt using AI */}
                                <div 
                                    onClick={() => triggerUpload('BANK_PROOF')}
                                    className={`mb-6 p-4 border-2 border-dashed border-brand-gray-200 rounded-xl text-center cursor-pointer hover:border-brand-primary hover:bg-brand-gray-50 transition-colors ${analyzingDoc === 'BANK_PROOF' ? 'animate-pulse bg-brand-primary/5 border-brand-primary' : ''}`}
                                >
                                    <div className="flex flex-col items-center">
                                        {analyzingDoc === 'BANK_PROOF' ? <Loader2 className="w-8 h-8 text-brand-primary animate-spin mb-2" /> : <Camera className="w-8 h-8 text-brand-gray-400 mb-2" />}
                                        <span className="text-sm font-bold text-brand-gray-700">{analyzingDoc === 'BANK_PROOF' ? 'Extraindo dados com IA...' : 'Ler Comprovante Bancário com IA'}</span>
                                        <span className="text-xs text-brand-gray-400">Preenchimento automático dos dados</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Banco</label>
                                        <select className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm bg-white" 
                                            value={formData.bankAccount?.bankCode} 
                                            onChange={e => setFormData({...formData, bankAccount: {...formData.bankAccount!, bankCode: e.target.value}})}
                                        >
                                            <option value="">Selecione...</option>
                                            {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Agência</label>
                                        <input type="text" className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm" value={formData.bankAccount?.agency} onChange={e => setFormData({...formData, bankAccount: {...formData.bankAccount!, agency: e.target.value}})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Conta</label>
                                        <input type="text" className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm" value={formData.bankAccount?.accountNumber} onChange={e => setFormData({...formData, bankAccount: {...formData.bankAccount!, accountNumber: e.target.value}})} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Nome do Favorecido</label>
                                        <input type="text" className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm" value={formData.bankAccount?.holderName} onChange={e => setFormData({...formData, bankAccount: {...formData.bankAccount!, holderName: e.target.value}})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Tipo de Conta</label>
                                        <div className="flex gap-2 text-sm mt-1">
                                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="accType" checked={formData.bankAccount?.accountType === 'Corrente'} onChange={() => setFormData({...formData, bankAccount: {...formData.bankAccount!, accountType: 'Corrente'}})} /> Corrente</label>
                                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="accType" checked={formData.bankAccount?.accountType === 'Poupança'} onChange={() => setFormData({...formData, bankAccount: {...formData.bankAccount!, accountType: 'Poupança'}})} /> Poupança</label>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                                    <label className="flex items-center gap-2 cursor-pointer font-bold text-yellow-900">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-brand-primary"
                                            checked={formData.bankAccount?.isThirdParty}
                                            onChange={(e) => setFormData({...formData, bankAccount: {...formData.bankAccount!, isThirdParty: e.target.checked}})}
                                        />
                                        Conta de Terceiros?
                                    </label>
                                    {formData.bankAccount?.isThirdParty && (
                                        <div className="mt-3 text-xs text-yellow-800 ml-6">
                                            <p className="mb-2">⚠️ Necessário anexar:</p>
                                            <ul className="list-disc pl-4 space-y-1">
                                                <li>Termo de aceite assinado pelo titular da conta.</li>
                                                <li>Documento (RG/CNH) do titular da conta.</li>
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* 6. Documentation & Photos */}
                            <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-gray-100">
                                <h3 className="font-bold text-brand-gray-900 text-lg mb-4 flex items-center gap-2">
                                    <ImageIcon className="w-5 h-5 text-brand-primary" /> Fotos e Documentos (Validação IA)
                                </h3>
                                
                                {/* Placeholder for standard photos */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                    {['Fachada', 'Interior 1', 'Interior 2', 'Equipe/Recepção'].map(label => (
                                        <div key={label} className="aspect-square bg-brand-gray-50 border-2 border-dashed border-brand-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-brand-gray-100 transition-colors">
                                            <Camera className="w-8 h-8 text-brand-gray-400 mb-2" />
                                            <span className="text-xs font-bold text-brand-gray-500">{label}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Smart Document Uploads */}
                                <div className="space-y-3">
                                    <div className={`p-3 border rounded-lg flex justify-between items-center ${formData.docs?.idCard ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                                        <span className="text-sm font-medium flex items-center gap-2">
                                            CNH ou RG do Responsável
                                            {analyzingDoc === 'IDENTITY' && <span className="text-xs text-brand-primary flex items-center"><Loader2 className="w-3 h-3 animate-spin mr-1"/> IA Lendo...</span>}
                                            {formData.docs?.idCard && <span className="text-xs text-green-600 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1"/> Validado</span>}
                                        </span>
                                        <button type="button" onClick={() => triggerUpload('IDENTITY')} className="text-xs font-bold text-brand-primary border border-brand-primary px-3 py-1 rounded hover:bg-brand-primary hover:text-white transition-colors flex items-center gap-1">
                                            <UploadCloud className="w-3 h-3" /> Upload & Analisar
                                        </button>
                                    </div>
                                    
                                    <div className={`p-3 border rounded-lg flex justify-between items-center ${formData.docs?.addressProof ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                                        <span className="text-sm font-medium flex items-center gap-2">
                                            Comprovante de Endereço
                                            {analyzingDoc === 'ADDRESS' && <span className="text-xs text-brand-primary flex items-center"><Loader2 className="w-3 h-3 animate-spin mr-1"/> IA Lendo...</span>}
                                            {formData.docs?.addressProof && <span className="text-xs text-green-600 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1"/> Validado</span>}
                                        </span>
                                        <button type="button" onClick={() => triggerUpload('ADDRESS')} className="text-xs font-bold text-brand-primary border border-brand-primary px-3 py-1 rounded hover:bg-brand-primary hover:text-white transition-colors flex items-center gap-1">
                                            <UploadCloud className="w-3 h-3" /> Upload & Analisar
                                        </button>
                                    </div>

                                    <div className={`p-3 border rounded-lg flex justify-between items-center ${formData.docs?.contract ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                                        <span className="text-sm font-medium">Contrato Social / MEI</span>
                                        <button type="button" onClick={() => setFormData(prev => ({...prev, docs: {...prev.docs!, contract: true}}))} className="text-xs font-bold text-brand-primary border border-brand-primary px-3 py-1 rounded hover:bg-brand-primary hover:text-white transition-colors">
                                            {formData.docs?.contract ? 'Reenviar' : 'Upload Manual'}
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {/* Submit Bar */}
                            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-brand-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-50 md:pl-80 flex justify-end gap-4">
                                <button 
                                    type="button"
                                    onClick={() => setViewMode('LIST')}
                                    className="px-6 py-3 rounded-xl font-bold text-brand-gray-600 hover:bg-brand-gray-100 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-8 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-dark transition-all shadow-lg flex items-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Enviar para Análise
                                </button>
                            </div>
                        </form>
                    </>
                )}

                {/* --- TAB CONTENT: LIST --- */}
                {viewMode === 'LIST' && (
                    <div className="w-full flex flex-col bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden animate-fade-in">
                        <div className="p-4 border-b border-brand-gray-100 bg-brand-gray-50/50">
                            <div className="flex justify-between items-center mb-3">
                                <h2 className="font-bold text-brand-gray-900 text-lg flex items-center gap-2">
                                    <FileCheck className="w-5 h-5 text-brand-primary" />
                                    {isAdmin ? 'Fila de Validação' : 'Meus Envios'}
                                </h2>
                            </div>
                            
                            <div className="relative mb-3">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar cliente..." 
                                    className="w-full pl-9 pr-4 py-2 border border-brand-gray-300 rounded-lg text-sm focus:border-brand-primary outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {['PENDING_ANALYSIS', 'MISSING_DOCS', 'APPROVED', 'ALL'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status as any)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border
                                            ${statusFilter === status 
                                                ? 'bg-brand-gray-900 text-white border-brand-gray-900' 
                                                : 'bg-white text-brand-gray-600 border-brand-gray-200 hover:bg-brand-gray-50'}
                                        `}
                                    >
                                        {status === 'PENDING_ANALYSIS' ? 'Pendentes' : status === 'MISSING_DOCS' ? 'Pendência' : status === 'APPROVED' ? 'Aprovados' : 'Todos'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto divide-y divide-brand-gray-100 max-h-[500px]">
                            {filteredRequests.length === 0 ? (
                                <div className="p-8 text-center text-brand-gray-400 text-xs">
                                    {isAdmin ? 'Nenhum cadastro aguardando validação.' : 'Você ainda não enviou nenhum cadastro.'}
                                </div>
                            ) : (
                                filteredRequests.map(req => (
                                    <div 
                                        key={req.id}
                                        onClick={() => isAdmin && setSelectedReq(req)}
                                        className={`p-4 transition-colors border-l-4 ${isAdmin ? 'cursor-pointer hover:bg-brand-gray-50' : ''} 
                                            ${selectedReq?.id === req.id ? 'bg-brand-gray-50 border-l-brand-primary' : 'border-l-transparent'}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-brand-gray-900 text-sm truncate max-w-[150px]">{req.clientName}</span>
                                            <span className="text-[10px] bg-brand-gray-100 text-brand-gray-500 px-1.5 py-0.5 rounded font-mono">{req.id}</span>
                                        </div>
                                        <div className="text-xs text-brand-gray-500 mb-2">{req.documentNumber}</div>
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className="flex items-center gap-1 text-brand-gray-400">
                                                <User className="w-3 h-3" /> {req.requesterName}
                                            </span>
                                            {req.status === 'PENDING_ANALYSIS' && <span className="text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded font-bold">Aguardando Validação</span>}
                                            {req.status === 'APPROVED' && <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded font-bold">Aprovado</span>}
                                            {req.status === 'MISSING_DOCS' && <span className="text-red-600 bg-red-100 px-2 py-0.5 rounded font-bold">Pendência</span>}
                                        </div>
                                        {req.status === 'APPROVED' && (
                                            <div className="mt-2 pt-2 border-t border-brand-gray-100 text-[10px] text-blue-600 font-bold flex items-center gap-1">
                                                <ArrowRight className="w-3 h-3" />
                                                Logística: {req.otp ? `OTP Gerado (${req.otp})` : 'Aguardando Gsurf'}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // --- ADMIN LIST VIEW (DEFAULT) ---
    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-6">
            
            {/* LEFT: LIST (For Admin) */}
            <div className="w-full md:w-1/3 flex flex-col bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden">
                <div className="p-4 border-b border-brand-gray-100 bg-brand-gray-50/50">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="font-bold text-brand-gray-900 text-lg flex items-center gap-2">
                            <FileCheck className="w-5 h-5 text-brand-primary" />
                            Fila de Análise
                        </h2>
                    </div>
                    
                    <div className="relative mb-3">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar cliente..." 
                            className="w-full pl-9 pr-4 py-2 border border-brand-gray-300 rounded-lg text-sm focus:border-brand-primary outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {['PENDING_ANALYSIS', 'MISSING_DOCS', 'APPROVED', 'ALL'].map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status as any)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border
                                    ${statusFilter === status 
                                        ? 'bg-brand-gray-900 text-white border-brand-gray-900' 
                                        : 'bg-white text-brand-gray-600 border-brand-gray-200 hover:bg-brand-gray-50'}
                                `}
                            >
                                {status === 'PENDING_ANALYSIS' ? 'Pendentes' : status === 'MISSING_DOCS' ? 'Pendência' : status === 'APPROVED' ? 'Aprovados' : 'Todos'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-brand-gray-100">
                    {filteredRequests.length === 0 ? (
                        <div className="p-8 text-center text-brand-gray-400 text-xs">
                            Nenhuma solicitação aguardando validação.
                        </div>
                    ) : (
                        filteredRequests.map(req => (
                            <div 
                                key={req.id}
                                onClick={() => isAdmin && setSelectedReq(req)}
                                className={`p-4 cursor-pointer hover:bg-brand-gray-50 transition-colors border-l-4
                                    ${selectedReq?.id === req.id ? 'bg-brand-gray-50 border-l-brand-primary' : 'border-l-transparent'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-brand-gray-900 text-sm truncate max-w-[150px]">{req.clientName}</span>
                                    <span className="text-[10px] bg-brand-gray-100 text-brand-gray-500 px-1.5 py-0.5 rounded font-mono">{req.id}</span>
                                </div>
                                <div className="text-xs text-brand-gray-500 mb-2">{req.documentNumber}</div>
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="flex items-center gap-1 text-brand-gray-400">
                                        <User className="w-3 h-3" /> {req.requesterName}
                                    </span>
                                    {req.status === 'PENDING_ANALYSIS' && <span className="text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded font-bold">Aguardando Validação</span>}
                                    {req.status === 'APPROVED' && <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded font-bold">Aprovado</span>}
                                    {req.status === 'MISSING_DOCS' && <span className="text-red-600 bg-red-100 px-2 py-0.5 rounded font-bold">Pendência</span>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT: WORKSPACE (Admin Only) */}
            <div className="flex-1 bg-white rounded-xl shadow-lg border border-brand-gray-200 flex flex-col overflow-hidden relative">
                {selectedReq ? (
                <>
                    {/* Header */}
                    <div className="bg-brand-gray-900 text-white p-6 shrink-0 flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-xl font-bold">{selectedReq.clientName}</h2>
                                <span className="bg-brand-primary text-xs px-2 py-0.5 rounded font-bold">Mesa de Validação</span>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-brand-gray-300">
                                <span className="bg-white/10 px-2 py-1 rounded font-mono">{selectedReq.documentNumber}</span>
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> Enviado: {new Date(selectedReq.dateSubmitted).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-xs opacity-60 uppercase block">Solicitante ({selectedReq.requesterRole})</span>
                            <span className="font-bold text-sm">{selectedReq.requesterName}</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-6">
                        {/* Detailed Data View for Admin */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="p-3 bg-brand-gray-50 rounded border">
                                <p className="text-xs text-brand-gray-500 font-bold">Plano</p>
                                <p>{selectedReq.planType}</p>
                            </div>
                            <div className="p-3 bg-brand-gray-50 rounded border">
                                <p className="text-xs text-brand-gray-500 font-bold">POS Serial</p>
                                <p className="font-mono">{selectedReq.posData?.serialNumber || 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-brand-gray-50 rounded border col-span-2">
                                <p className="text-xs text-brand-gray-500 font-bold">Banco</p>
                                <p>{selectedReq.bankAccount?.bankCode} - Ag: {selectedReq.bankAccount?.agency} CC: {selectedReq.bankAccount?.accountNumber}</p>
                                {selectedReq.bankAccount?.isThirdParty && <p className="text-xs text-red-500 font-bold mt-1">⚠️ Conta de Terceiros</p>}
                            </div>
                        </div>

                        {/* Checklist Section */}
                        <div className="mb-8">
                            <h3 className="font-bold text-brand-gray-900 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-brand-primary" />
                                Validação de Documentos
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* ... Docs Checklist ... */}
                                <div className="p-4 rounded-xl border flex items-center justify-between cursor-pointer bg-green-50 border-green-200 text-green-800 shadow-sm transition-transform hover:scale-[1.02]">
                                    <span className="font-medium text-sm">Contrato Social / MEI</span>
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                </div>
                                <div className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-transform hover:scale-[1.02] ${selectedReq.docs.idCard ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-brand-gray-200'}`}>
                                    <span className="font-medium text-sm">RG/CNH</span>
                                    {selectedReq.docs.idCard ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <div className="w-5 h-5 rounded-full border-2 border-brand-gray-300"></div>}
                                </div>
                                <div className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-transform hover:scale-[1.02] ${selectedReq.docs.addressProof ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-brand-gray-200'}`}>
                                    <span className="font-medium text-sm">Compr. Endereço</span>
                                    {selectedReq.docs.addressProof ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <div className="w-5 h-5 rounded-full border-2 border-brand-gray-300"></div>}
                                </div>
                                <div className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-transform hover:scale-[1.02] ${selectedReq.docs.bankProof ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-brand-gray-200'}`}>
                                    <span className="font-medium text-sm">Compr. Bancário</span>
                                    {selectedReq.docs.bankProof ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <div className="w-5 h-5 rounded-full border-2 border-brand-gray-300"></div>}
                                </div>
                                {selectedReq.bankAccount?.isThirdParty && (
                                    <div className="p-4 rounded-xl border flex items-center justify-between cursor-pointer bg-yellow-50 border-yellow-200 text-yellow-800 transition-transform hover:scale-[1.02]">
                                        <span className="font-medium text-sm">Termo de Terceiro</span>
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedReq.notes && (
                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-yellow-800 text-sm mb-6">
                                <span className="font-bold block mb-1">Observações / Pendências:</span>
                                {selectedReq.notes}
                            </div>
                        )}
                    </div>

                    {/* Actions Footer */}
                    {selectedReq.status !== 'APPROVED' && (
                        <div className="p-6 bg-brand-gray-50 border-t border-brand-gray-200 flex justify-end gap-3">
                            <button 
                                onClick={handleReject}
                                className="px-6 py-3 border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center gap-2"
                            >
                                <AlertCircle className="w-4 h-4" />
                                Reportar Pendência
                            </button>
                            <button 
                                onClick={handleApprove}
                                disabled={isApproving}
                                className="px-8 py-3 bg-brand-primary text-white font-bold rounded-xl shadow-lg hover:bg-brand-dark transition-all transform hover:-translate-y-1 flex items-center gap-2 disabled:opacity-50"
                            >
                                {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Validar e Enviar para Logística
                            </button>
                        </div>
                    )}
                </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-brand-gray-400">
                        <FileText className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">Selecione um cadastro para validar</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CadastroPage;
