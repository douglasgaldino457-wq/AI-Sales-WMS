
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    Receipt, Map, Camera, FileText, UploadCloud, CheckCircle2, 
    Fuel, Utensils, ScanLine, X, Loader2, Filter, Calendar as CalendarIcon, Search, CreditCard, DollarSign, Wallet, FileCheck, Link, Send, Reply, ShieldCheck, Settings, Save, ArrowRight, Plus, MapPin, ChevronRight, Car, List, PlusCircle, Image as ImageIcon, MapPinned, Sparkles
} from 'lucide-react';
import { appStore } from '../services/store';
import { analyzeReceipt } from '../services/geminiService';
import { Expense, ExpenseCategory, TripLog, UserRole, ExpenseReport, ReimbursementPolicy } from '../types';
import { GpsTracker } from '../components/GpsTracker';
import { CurrencyInput } from '../components/CurrencyInput';
import { useAppStore } from '../services/useAppStore';

const CATEGORIES: ExpenseCategory[] = ['Combustível', 'Estacionamento', 'Pedágio', 'Uber/Táxi', 'Hospedagem', 'Alimentação', 'Outros'];

const DespesasPage: React.FC = () => {
    const { userRole, currentUser } = useAppStore();
    const [activeTab, setActiveTab] = useState<'RECEIPTS' | 'NEW' | 'TRACKER' | 'REPORTS' | 'POLICY'>('RECEIPTS');
    
    // Data State
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [tripLogs, setTripLogs] = useState<TripLog[]>([]);
    const [reports, setReports] = useState<ExpenseReport[]>([]);
    
    // Policy State
    const [policy, setPolicy] = useState<ReimbursementPolicy>({
        kmRate: 0.58,
        foodLimitPerDay: 80,
        hotelLimitPerNight: 250,
        corporateCardLimit: 5000
    });
    const policyFileRef = useRef<HTMLInputElement>(null);
    const [policyFile, setPolicyFile] = useState<File | null>(null);

    // Filters State
    const [filterCategory, setFilterCategory] = useState<string>('TODOS');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // Modals & Action State
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false); // Floating Menu
    const [isManualKmOpen, setIsManualKmOpen] = useState(false); // New Manual KM Modal

    // Receipt Reader State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [scanProgress, setScanProgress] = useState(0);
    const [scanStep, setScanStep] = useState('Processando...');
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Form State
    const [expenseForm, setExpenseForm] = useState<Partial<Expense>>({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        category: 'Outros',
        establishment: '',
        paymentMethod: 'OWN_MONEY', // Default
        reimbursable: true
    });

    // Manual KM Form State
    const [manualKmForm, setManualKmForm] = useState({
        distance: 0,
        date: new Date().toISOString().split('T')[0],
        origin: '',
        destination: ''
    });
    
    const isGestor = userRole === UserRole.GESTOR || userRole === UserRole.ADMIN;
    const isFinanceiro = userRole === UserRole.FINANCEIRO || userRole === UserRole.ADMIN;
    const isConsultant = userRole === UserRole.FIELD_SALES || userRole === UserRole.INSIDE_SALES;

    useEffect(() => {
        refreshData();
        const config = appStore.getFinanceConfig();
        if (config.policy) {
            setPolicy(config.policy);
        }

        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        setDateRange({ start: firstDay, end: lastDay });
    }, [userRole, currentUser, activeTab]);

    const refreshData = () => {
        const allExpenses = appStore.getExpenses();
        const allLogs = appStore.getTripLogs();
        const allReports = appStore.getExpenseReports();

        if (isConsultant) {
            setExpenses(allExpenses.filter(e => e.requesterName === currentUser?.name).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setTripLogs(allLogs.filter(l => l.vehiclePlate === currentUser?.vehicle?.plate).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setReports(allReports.filter(r => r.requesterName === currentUser?.name).sort((a,b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()));
        } else if (isFinanceiro) {
            setReports(allReports.filter(r => r.status === 'APPROVED_GESTOR' || r.status === 'APPROVED_FINANCEIRO').sort((a,b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()));
            setExpenses(allExpenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setTripLogs(allLogs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } else {
            setExpenses(allExpenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setTripLogs(allLogs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setReports(allReports.sort((a,b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()));
        }
    };

    // --- FILTER LOGIC ---
    const filteredExpenses = useMemo(() => {
        return expenses.filter(exp => {
            const matchesCategory = filterCategory === 'TODOS' || exp.category === filterCategory;
            const matchesStart = !dateRange.start || exp.date >= dateRange.start;
            const matchesEnd = !dateRange.end || exp.date <= dateRange.end;
            return matchesCategory && matchesStart && matchesEnd;
        });
    }, [expenses, filterCategory, dateRange]);

    // --- SUMMARY STATS FOR UI ---
    const expenseSummary = useMemo(() => {
        const summary: Record<string, number> = {};
        let total = 0;
        filteredExpenses.forEach(e => {
            summary[e.category] = (summary[e.category] || 0) + e.amount;
            total += e.amount;
        });
        // Add Trip Logs to summary if relevant
        const tripTotal = tripLogs.reduce((acc, curr) => acc + curr.valueEarned, 0);
        if (tripTotal > 0) {
            summary['KM / Rota'] = tripTotal;
            total += tripTotal;
        }
        
        // Sort by value descending
        const sortedCategories = Object.entries(summary).sort((a, b) => b[1] - a[1]);
        
        return { total, sortedCategories };
    }, [filteredExpenses, tripLogs]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    setPreviewImage(ev.target.result as string);
                    setActiveTab('NEW'); // Ensure we are on the tab
                    setIsActionMenuOpen(false);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyze = async () => {
        if (!previewImage) return;
        setIsAnalyzing(true);
        setScanProgress(0);
        setScanStep('Identificando documento...');

        // Progress Simulation
        const interval = setInterval(() => {
            setScanProgress(prev => {
                const next = prev + Math.random() * 20;
                if (next > 40 && next < 70) setScanStep('Lendo valores (OCR)...');
                if (next >= 70) setScanStep('Classificando despesa...');
                return next > 90 ? 90 : next;
            });
        }, 200);

        try {
            const base64 = previewImage.split(',')[1];
            
            // Artificial delay for UX
            await new Promise(r => setTimeout(r, 1500));
            
            const result = await analyzeReceipt(base64);
            
            clearInterval(interval);
            setScanProgress(100);
            setScanStep('Concluído!');
            
            if (result) {
                setExpenseForm(prev => ({
                    ...prev,
                    date: result.date || prev.date,
                    amount: result.amount || prev.amount,
                    establishment: result.establishment || prev.establishment,
                    category: (result.category as ExpenseCategory) || 'Outros',
                    fuelDetails: result.fuelDetails
                }));
            } else {
                alert("Não foi possível extrair dados automaticamente. Por favor, preencha manualmente.");
            }
        } catch (error) {
            alert("Erro ao processar imagem.");
        } finally {
            setTimeout(() => setIsAnalyzing(false), 500); // Delay closing to show 100%
        }
    };

    const handleSaveExpense = () => {
        if (!expenseForm.amount || !expenseForm.establishment) {
            alert("Preencha o valor e o estabelecimento.");
            return;
        }

        const isReimbursable = expenseForm.paymentMethod === 'OWN_MONEY';

        const newExpense: Expense = {
            id: Date.now().toString(),
            date: expenseForm.date!,
            amount: expenseForm.amount!,
            category: expenseForm.category as ExpenseCategory,
            establishment: expenseForm.establishment!,
            imageUrl: previewImage || undefined,
            status: 'OPEN', 
            requesterName: currentUser?.name || 'Consultor',
            paymentMethod: expenseForm.paymentMethod || 'OWN_MONEY',
            reimbursable: isReimbursable,
            fuelDetails: expenseForm.fuelDetails,
            notes: expenseForm.notes
        };

        appStore.addExpense(newExpense);
        refreshData();
        
        // Reset
        setExpenseForm({
            date: new Date().toISOString().split('T')[0],
            amount: 0,
            category: 'Outros',
            establishment: '',
            paymentMethod: 'OWN_MONEY',
            reimbursable: true
        });
        setPreviewImage(null);
        if(fileInputRef.current) fileInputRef.current.value = '';
        setActiveTab('RECEIPTS'); // Go back to list
        alert("Despesa salva com sucesso!");
    };

    const handleSaveManualKm = () => {
        if (!manualKmForm.distance || manualKmForm.distance <= 0) {
            alert("Insira uma distância válida.");
            return;
        }
        
        const log: TripLog = {
            id: `MAN-${Date.now()}`,
            date: manualKmForm.date,
            startTime: `${manualKmForm.date}T08:00:00`,
            endTime: `${manualKmForm.date}T09:00:00`,
            distanceKm: manualKmForm.distance,
            valueEarned: manualKmForm.distance * policy.kmRate,
            vehiclePlate: currentUser?.vehicle?.plate || 'Manual',
            status: 'OPEN'
        };
        
        appStore.addTripLog(log);
        refreshData();
        setIsManualKmOpen(false);
        setManualKmForm({ distance: 0, date: new Date().toISOString().split('T')[0], origin: '', destination: '' });
        alert("KM Manual lançado com sucesso!");
    };

    // --- REPORT SUBMISSION & APPROVAL LOGIC ---
    const handleCreateReport = () => {
        const openExpenses = expenses.filter(e => e.status === 'OPEN' || e.status === 'REJECTED');
        const openLogs = tripLogs.filter(l => l.status === 'OPEN' || l.status === 'REJECTED');

        if (openExpenses.length === 0 && openLogs.length === 0) {
            alert("Não há itens pendentes para enviar.");
            return;
        }

        if (confirm(`Confirmar Vínculo e Geração de Relatório com ${openExpenses.length} despesas e ${openLogs.length} rotas?`)) {
            appStore.submitExpenseReport(currentUser?.name || 'User', {
                expenseIds: openExpenses.map(e => e.id),
                logIds: openLogs.map(l => l.id)
            });
            refreshData();
            alert("Relatório Gerado e Enviado para o Gestor!");
        }
    };

    const handleApproveReportGestor = (reportId: string) => {
        if (confirm("Aprovar relatório e enviar para Financeiro?")) {
            appStore.processReportByManager(reportId, 'APPROVE', currentUser?.name || 'Gestor');
            refreshData();
        }
    };

    const handleRejectReportGestor = (reportId: string) => {
        if (confirm("Rejeitar relatório e devolver ao consultor para correção?")) {
            appStore.processReportByManager(reportId, 'REJECT', currentUser?.name || 'Gestor');
            refreshData();
        }
    };

    const handleRequestCorrection = (reportId: string) => {
        const reason = prompt("Por favor, descreva o motivo da pendência/correção:");
        if (!reason) return;
        appStore.processReportByManager(reportId, 'REJECT', currentUser?.name || 'Financeiro');
        alert("Relatório devolvido ao usuário com a observação.");
        refreshData();
    };

    const handleFinalizeReportFinanceiro = (reportId: string) => {
        if (confirm("Aprovar pagamento final e gerar token?")) {
            appStore.finalizeReportByFinance(reportId, currentUser?.name || 'Financeiro');
            refreshData();
        }
    };

    const handleSavePolicy = () => {
        const config = appStore.getFinanceConfig();
        const updatedPolicy = {
            ...policy,
            updatedAt: new Date().toISOString(),
            policyFileName: policyFile ? policyFile.name : config.policy?.policyFileName
        };
        appStore.setFinanceConfig({
            ...config,
            kmRate: policy.kmRate,
            policy: updatedPolicy
        });
        alert("Política de Reembolso atualizada!");
    };

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'OPEN': return <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold">Aberto</span>;
            case 'WAITING_MANAGER': 
            case 'SUBMITTED_GESTOR':
                return <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[10px] font-bold">Aguardando Gestor</span>;
            case 'WAITING_FINANCE': 
            case 'APPROVED_GESTOR':
                return <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold">Aguardando Financeiro</span>;
            case 'PAID': 
            case 'APPROVED_FINANCEIRO':
                return <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded text-[10px] font-bold">Pago / Finalizado</span>;
            case 'REJECTED': return <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold">Devolvido</span>;
            default: return null;
        }
    };

    // Category Icons Map
    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case 'Combustível': return <Fuel size={20} className="text-orange-500" />;
            case 'Alimentação': return <Utensils size={20} className="text-red-500" />;
            case 'KM / Rota': return <MapPin size={20} className="text-blue-500" />;
            case 'Hospedagem': return <Receipt size={20} className="text-indigo-500" />;
            default: return <FileText size={20} className="text-gray-500" />;
        }
    };

    // --- COMPONENTS ---

    // 1. Expense Summary Card (Visual Progress)
    const ExpenseSummaryCard = () => (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-gray-100 mb-6">
            <h3 className="text-sm font-bold text-brand-gray-900 mb-4 flex justify-between items-center">
                <span>Resumo por tipo de despesa</span>
                <span className="text-brand-gray-400 font-normal text-xs">{new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
            </h3>
            
            <div className="space-y-4">
                {expenseSummary.sortedCategories.slice(0, 3).map(([cat, value], idx) => {
                    // Calculate relative percentage for visual bar (relative to total)
                    const percent = (value / expenseSummary.total) * 100;
                    const colorClass = cat === 'Combustível' ? 'bg-orange-500' : cat === 'Alimentação' ? 'bg-red-500' : 'bg-blue-500';
                    
                    return (
                        <div key={idx}>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium text-gray-700">{cat}</span>
                                <span className="font-bold text-gray-900">R$ {value.toFixed(2)}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className={`${colorClass} h-2 rounded-full transition-all duration-500`} style={{ width: `${percent}%` }}></div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div className="mt-4 pt-4 border-t border-brand-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-500 font-bold uppercase">Total Geral</span>
                <span className="text-xl font-bold text-brand-gray-900">R$ {expenseSummary.total.toFixed(2)}</span>
            </div>
        </div>
    );

    // 2. Action Menu (FAB Style)
    const QuickActionMenu = () => (
        <div className="relative">
            {isActionMenuOpen && (
                <div className="absolute bottom-14 right-0 bg-white rounded-xl shadow-2xl border border-brand-gray-100 p-2 w-56 flex flex-col gap-1 animate-fade-in z-50 origin-bottom-right">
                    <button 
                        onClick={() => { setActiveTab('NEW'); setIsActionMenuOpen(false); fileInputRef.current?.click(); }}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-brand-gray-50 rounded-lg transition-colors text-left"
                    >
                        <ScanLine size={18} className="text-brand-primary"/> Digitalizar (IA)
                    </button>
                    <button 
                        onClick={() => { setActiveTab('NEW'); setIsActionMenuOpen(false); }}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-brand-gray-50 rounded-lg transition-colors text-left"
                    >
                        <FileText size={18} className="text-gray-500"/> Despesa Manual
                    </button>
                    <button 
                        onClick={() => { setIsManualKmOpen(true); setIsActionMenuOpen(false); }}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-brand-gray-50 rounded-lg transition-colors text-left"
                    >
                        <MapPinned size={18} className="text-purple-600"/> Lançar KM Manual
                    </button>
                    <button 
                        onClick={() => { setActiveTab('TRACKER'); setIsActionMenuOpen(false); }}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-brand-gray-50 rounded-lg transition-colors text-left"
                    >
                        <Map size={18} className="text-blue-500"/> Rastrear GPS
                    </button>
                </div>
            )}
            <button 
                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${isActionMenuOpen ? 'bg-gray-200 text-gray-600 rotate-45' : 'bg-brand-primary text-white hover:bg-brand-dark'}`}
            >
                <Plus size={24} />
            </button>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-24 relative">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-end gap-4 no-print">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <Wallet className="w-8 h-8 text-brand-primary" />
                        Despesas & Reembolso
                    </h1>
                    <p className="text-brand-gray-600 mt-1">Gestão de gastos e reembolsos.</p>
                </div>
                
                {/* Navigation Pills */}
                <div className="flex bg-brand-gray-200 p-1 rounded-xl overflow-x-auto">
                    {!isFinanceiro && (
                        <>
                            <button 
                                onClick={() => setActiveTab('RECEIPTS')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'RECEIPTS' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                            >
                                <List size={16} /> Extrato
                            </button>
                            <button 
                                onClick={() => setActiveTab('NEW')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'NEW' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                            >
                                <PlusCircle size={16} /> Nova Despesa
                            </button>
                            <button 
                                onClick={() => setActiveTab('TRACKER')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'TRACKER' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                            >
                                <Map size={16} /> GPS
                            </button>
                        </>
                    )}
                    <button 
                        onClick={() => setActiveTab('REPORTS')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'REPORTS' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                    >
                        <FileCheck size={16} /> Relatórios
                    </button>
                    {(isFinanceiro || isGestor) && (
                        <button 
                            onClick={() => setActiveTab('POLICY')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'POLICY' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                        >
                            <Settings size={16} /> Política
                        </button>
                    )}
                </div>
            </header>

            {/* TAB: NEW EXPENSE (Scanner & Form) */}
            {activeTab === 'NEW' && !isFinanceiro && (
                <div className="animate-fade-in max-w-xl mx-auto">
                    <div className="bg-white rounded-2xl shadow-lg border border-brand-gray-100 overflow-hidden relative">
                        <div className="bg-brand-gray-900 px-6 py-4 flex justify-between items-center text-white">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <ScanLine className="w-5 h-5"/> Inserir Comprovante
                            </h3>
                            <button onClick={() => setActiveTab('RECEIPTS')} className="text-brand-gray-400 hover:text-white"><X size={20}/></button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            {/* Upload Area */}
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`h-48 w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${previewImage ? 'border-brand-primary bg-brand-gray-50' : 'border-brand-gray-300 hover:bg-brand-gray-50'}`}
                            >
                                {previewImage ? (
                                    <>
                                        <img src={previewImage} alt="Receipt" className="w-full h-full object-contain opacity-50 group-hover:opacity-30 transition-opacity" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="bg-white/80 p-2 rounded-full shadow-lg backdrop-blur-sm">
                                                <Camera className="w-8 h-8 text-brand-primary" />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 bg-brand-gray-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                            <Camera className="w-8 h-8 text-brand-gray-400" />
                                        </div>
                                        <p className="text-sm font-bold text-brand-gray-600">Toque para digitalizar</p>
                                        <p className="text-xs text-brand-gray-400 mt-1">ou selecione da galeria</p>
                                    </>
                                )}
                            </div>

                            {/* AI Analysis Overlay (Progress Bar) */}
                            {isAnalyzing && (
                                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-xl p-4 border border-brand-gray-200 animate-fade-in">
                                    <Sparkles className="w-10 h-10 text-brand-primary mb-3 animate-pulse" />
                                    <p className="text-sm font-bold text-brand-gray-800 mb-4">{scanStep}</p>
                                    <div className="w-64 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-brand-primary to-purple-600 rounded-full transition-all duration-200 ease-out shadow-[0_0_10px_rgba(243,18,60,0.5)]"
                                            style={{ width: `${scanProgress}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-2 font-mono">{Math.round(scanProgress)}%</p>
                                </div>
                            )}

                            {/* AI Analysis Button */}
                            {previewImage && !isAnalyzing && (
                                <button 
                                    onClick={handleAnalyze} 
                                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <ScanLine size={18}/> Ler Dados com IA
                                </button>
                            )}

                            <div className="border-t border-brand-gray-100 pt-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
                                    <div className="relative">
                                        <select 
                                            className="w-full border border-brand-gray-300 rounded-lg p-3 text-sm outline-none appearance-none bg-white"
                                            value={expenseForm.category}
                                            onChange={e => setExpenseForm({...expenseForm, category: e.target.value as ExpenseCategory})}
                                        >
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data</label>
                                        <input 
                                            type="date" 
                                            className="w-full border border-brand-gray-300 rounded-lg p-3 text-sm outline-none"
                                            value={expenseForm.date}
                                            onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor (R$)</label>
                                        <CurrencyInput 
                                            className="w-full border border-brand-gray-300 rounded-lg p-3 text-sm font-bold text-gray-900 outline-none"
                                            value={expenseForm.amount}
                                            onChange={val => setExpenseForm({...expenseForm, amount: val})}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estabelecimento</label>
                                    <input 
                                        className="w-full border border-brand-gray-300 rounded-lg p-3 text-sm outline-none placeholder:text-gray-300"
                                        placeholder="Nome do local"
                                        value={expenseForm.establishment}
                                        onChange={e => setExpenseForm({...expenseForm, establishment: e.target.value})}
                                    />
                                </div>

                                <div className="flex gap-2 bg-brand-gray-50 p-1.5 rounded-xl">
                                    <button 
                                        onClick={() => setExpenseForm({...expenseForm, paymentMethod: 'OWN_MONEY', reimbursable: true})}
                                        className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${expenseForm.paymentMethod === 'OWN_MONEY' ? 'bg-white text-brand-primary shadow-sm border border-brand-gray-200' : 'text-brand-gray-500 hover:text-brand-gray-700'}`}
                                    >
                                        <Wallet size={14} /> Reembolso
                                    </button>
                                    <button 
                                        onClick={() => setExpenseForm({...expenseForm, paymentMethod: 'CORPORATE_CARD', reimbursable: false})}
                                        className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${expenseForm.paymentMethod === 'CORPORATE_CARD' ? 'bg-white text-purple-600 shadow-sm border border-brand-gray-200' : 'text-brand-gray-500 hover:text-brand-gray-700'}`}
                                    >
                                        <CreditCard size={14} /> Corporativo
                                    </button>
                                </div>

                                <button onClick={handleSaveExpense} className="w-full bg-brand-primary text-white py-4 rounded-xl font-bold shadow-lg hover:bg-brand-dark transition-colors flex items-center justify-center gap-2 mt-2">
                                    <CheckCircle2 size={20} /> Salvar Despesa
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* Hidden Input for File Upload */}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                </div>
            )}

            {/* TAB: RECEIPTS (Main View) */}
            {activeTab === 'RECEIPTS' && !isFinanceiro && (
                <div className="animate-fade-in">
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left: Summary & Filters */}
                        <div className="lg:col-span-1">
                            <ExpenseSummaryCard />
                            
                            {/* Filter Card */}
                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-gray-100">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><Filter size={12}/> Filtros</h4>
                                <div className="space-y-3">
                                    <select 
                                        value={filterCategory}
                                        onChange={(e) => setFilterCategory(e.target.value)}
                                        className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none"
                                    >
                                        <option value="TODOS">Todas Categorias</option>
                                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                    <div className="flex gap-2">
                                        <input type="date" className="w-full border border-brand-gray-300 rounded-lg px-2 py-2 text-xs" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
                                        <input type="date" className="w-full border border-brand-gray-300 rounded-lg px-2 py-2 text-xs" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Expenses Feed */}
                        <div className="lg:col-span-2 space-y-4">
                            {/* Combined List of Expenses + GPS Logs */}
                            {[...filteredExpenses, ...tripLogs].sort((a: any,b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item: any) => {
                                const isLog = 'distanceKm' in item;
                                return (
                                    <div key={item.id} className="bg-white rounded-xl p-4 border border-brand-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 relative group">
                                        {/* Icon Box */}
                                        <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                                            {isLog ? (
                                                <MapPin className="text-blue-500" />
                                            ) : item.imageUrl ? (
                                                <img src={item.imageUrl} alt="Recibo" className="w-full h-full object-cover rounded-xl" />
                                            ) : (
                                                getCategoryIcon(item.category)
                                            )}
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-brand-gray-900 truncate pr-2">
                                                    {isLog ? 'Percurso via GPS' : item.establishment}
                                                </h4>
                                                <span className="font-bold text-brand-gray-900 whitespace-nowrap">
                                                    R$ {isLog ? item.valueEarned.toFixed(2) : item.amount.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                                <span>{isLog ? 'Percurso • GPS' : item.category}</span>
                                                <span>•</span>
                                                <span>{new Date(item.date).toLocaleDateString()}</span>
                                                {!isLog && item.paymentMethod === 'CORPORATE_CARD' && (
                                                    <span className="text-purple-600 bg-purple-50 px-1.5 rounded font-bold ml-1">Corp</span>
                                                )}
                                            </div>
                                            {/* Status Badge */}
                                            <div className="mt-2">
                                                {getStatusBadge(item.status)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {filteredExpenses.length === 0 && tripLogs.length === 0 && (
                                <div className="text-center py-10 text-gray-400">
                                    <Receipt size={40} className="mx-auto mb-2 opacity-20" />
                                    <p>Nenhuma despesa encontrada.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Floating Action Button */}
                    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
                        <QuickActionMenu />
                    </div>
                </div>
            )}

            {/* TAB: TRACKER */}
            {activeTab === 'TRACKER' && !isFinanceiro && (
                <div className="animate-fade-in">
                    <GpsTracker />
                </div>
            )}

            {/* MANUAL KM MODAL */}
            {isManualKmOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="bg-brand-gray-900 px-6 py-4 flex justify-between items-center text-white">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <MapPinned className="w-5 h-5"/> Lançar KM
                            </h3>
                            <button onClick={() => setIsManualKmOpen(false)} className="text-brand-gray-400 hover:text-white"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-purple-50 p-3 rounded-lg text-xs text-purple-800 border border-purple-100">
                                Use esta opção apenas se esqueceu de ligar o GPS. O cálculo será baseado na taxa de <strong>R$ {policy.kmRate}/km</strong>.
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data da Viagem</label>
                                <input 
                                    type="date"
                                    className="w-full border border-brand-gray-300 rounded-lg p-2.5 text-sm"
                                    value={manualKmForm.date}
                                    onChange={e => setManualKmForm({...manualKmForm, date: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Distância Percorrida (KM)</label>
                                <div className="relative">
                                    <input 
                                        type="number"
                                        className="w-full border border-brand-gray-300 rounded-lg p-2.5 text-sm font-bold pr-12"
                                        placeholder="0"
                                        value={manualKmForm.distance || ''}
                                        onChange={e => setManualKmForm({...manualKmForm, distance: parseFloat(e.target.value)})}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">KM</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-2 text-sm">
                                <span className="text-gray-500">Valor Estimado:</span>
                                <span className="font-bold text-brand-primary text-lg">R$ {(manualKmForm.distance * policy.kmRate).toFixed(2)}</span>
                            </div>

                            <button onClick={handleSaveManualKm} className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-md mt-2">
                                Confirmar Lançamento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: REPORTS & POLICY (Keep existing Logic but wrap in container) */}
            {(activeTab === 'REPORTS' || activeTab === 'POLICY') && (
                <div className="animate-fade-in space-y-6">
                    {/* ... Existing Policy/Reports Code Block ... */}
                    {activeTab === 'POLICY' && (isFinanceiro || isGestor) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 p-6">
                                <h3 className="font-bold text-brand-gray-900 mb-6 flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-blue-600" /> Parâmetros de Reembolso
                                </h3>
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Valor do KM Rodado (R$)</label>
                                        <CurrencyInput 
                                            className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm font-bold"
                                            value={policy.kmRate}
                                            onChange={val => setPolicy({...policy, kmRate: val})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Limite Alimentação / Dia (R$)</label>
                                        <CurrencyInput 
                                            className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm font-bold"
                                            value={policy.foodLimitPerDay}
                                            onChange={val => setPolicy({...policy, foodLimitPerDay: val})}
                                        />
                                    </div>
                                </div>
                                <button onClick={handleSavePolicy} className="mt-6 w-full bg-brand-primary text-white py-3 rounded-xl font-bold shadow-lg hover:bg-brand-dark transition-colors flex items-center justify-center gap-2"><Save className="w-5 h-5" /> Salvar Configurações</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'REPORTS' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-brand-gray-100 bg-brand-gray-50 font-bold text-brand-gray-900 flex justify-between items-center">
                                <span>Relatórios de Despesas</span>
                                {isConsultant && expenses.some(e => e.status === 'OPEN') && (
                                    <button onClick={handleCreateReport} className="bg-brand-primary text-white px-4 py-2 rounded-lg text-xs font-bold shadow hover:bg-brand-dark transition-colors flex items-center gap-2">
                                        <FileCheck size={16}/> Gerar Novo Relatório
                                    </button>
                                )}
                            </div>
                            <div className="divide-y divide-brand-gray-100">
                                {reports.length === 0 ? (
                                    <div className="p-12 text-center text-gray-400">Nenhum relatório encontrado.</div>
                                ) : (
                                    reports.map(report => (
                                        <div key={report.id} className="p-6 hover:bg-brand-gray-50 transition-colors">
                                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-bold">{report.id}</span>
                                                        {getStatusBadge(report.status)}
                                                    </div>
                                                    <h3 className="font-bold text-lg text-brand-gray-900">Relatório {report.period} - {report.requesterName}</h3>
                                                    <p className="text-xs text-gray-500 mt-1">{new Date(report.createdDate).toLocaleDateString()} • {report.itemCount} itens</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] text-green-600 uppercase font-bold">Reembolso</p>
                                                    <p className="font-bold text-green-700 text-lg">R$ {report.totalReimbursable.toFixed(2)}</p>
                                                </div>
                                            </div>
                                            {/* Approval Buttons Logic (Gestor/Financeiro) */}
                                            <div className="flex gap-3 pt-4 mt-2 justify-end">
                                                {isGestor && report.status === 'SUBMITTED_GESTOR' && (
                                                    <>
                                                        <button onClick={() => handleRejectReportGestor(report.id)} className="px-4 py-2 border border-red-200 text-red-600 font-bold rounded-lg text-xs hover:bg-red-50">Devolver</button>
                                                        <button onClick={() => handleApproveReportGestor(report.id)} className="px-6 py-2 bg-brand-primary text-white font-bold rounded-lg text-xs hover:bg-brand-dark shadow-md">Aprovar</button>
                                                    </>
                                                )}
                                                {isFinanceiro && report.status === 'APPROVED_GESTOR' && (
                                                    <>
                                                        <button onClick={() => handleRequestCorrection(report.id)} className="px-4 py-2 border border-orange-200 text-orange-600 font-bold rounded-lg text-xs hover:bg-orange-50">Solicitar Correção</button>
                                                        <button onClick={() => handleFinalizeReportFinanceiro(report.id)} className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg text-xs hover:bg-green-700 shadow-md flex items-center gap-2"><DollarSign size={16}/> Pagar</button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DespesasPage;
