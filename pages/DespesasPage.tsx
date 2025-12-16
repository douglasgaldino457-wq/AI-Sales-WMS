
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    Receipt, Map, Camera, FileText, UploadCloud, CheckCircle2, 
    AlertCircle, Plus, Trash2, Fuel, Utensils, Car, Home, 
    MoreHorizontal, Printer, Download, ScanLine, X, Loader2, Filter, Calendar as CalendarIcon, Search, Check, XCircle, CreditCard, DollarSign, Wallet, FileCheck, Route, Link
} from 'lucide-react';
import { appStore } from '../services/store';
import { analyzeReceipt } from '../services/geminiService';
import { Expense, ExpenseCategory, TripLog, UserRole, ExpenseReport } from '../types';
import { GpsTracker } from '../components/GpsTracker';
import { CurrencyInput } from '../components/CurrencyInput';
import { PagmotorsLogo } from '../components/Logo';
import { useAppStore } from '../services/useAppStore';

const CATEGORIES: ExpenseCategory[] = ['Combustível', 'Estacionamento', 'Pedágio', 'Uber/Táxi', 'Hospedagem', 'Alimentação', 'Outros'];

const DespesasPage: React.FC = () => {
    const { userRole, currentUser } = useAppStore();
    const [activeTab, setActiveTab] = useState<'RECEIPTS' | 'TRACKER' | 'REPORTS'>('RECEIPTS');
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [tripLogs, setTripLogs] = useState<TripLog[]>([]);
    const [reports, setReports] = useState<ExpenseReport[]>([]);
    
    // Filters State
    const [filterCategory, setFilterCategory] = useState<string>('TODOS');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // Receipt Reader State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
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
    
    const isGestor = userRole === UserRole.GESTOR || userRole === UserRole.ADMIN;
    const isFinanceiro = userRole === UserRole.FINANCEIRO || userRole === UserRole.ADMIN;
    const isConsultant = userRole === UserRole.FIELD_SALES || userRole === UserRole.INSIDE_SALES;

    useEffect(() => {
        refreshData();
        // Default current month
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
            // Filter by Self
            setExpenses(allExpenses.filter(e => e.requesterName === currentUser?.name).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setTripLogs(allLogs.filter(l => l.vehiclePlate === currentUser?.vehicle?.plate).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setReports(allReports.filter(r => r.requesterName === currentUser?.name).sort((a,b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()));
        } else {
            // Approvers see everything
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

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    setPreviewImage(ev.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleClearImage = () => {
        setPreviewImage(null);
        if(fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleAnalyze = async () => {
        if (!previewImage) return;
        setIsAnalyzing(true);
        try {
            const base64 = previewImage.split(',')[1];
            const result = await analyzeReceipt(base64);
            
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
            setIsAnalyzing(false);
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
        alert("Despesa salva com sucesso!");
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

    const handleFinalizeReportFinanceiro = (reportId: string) => {
        if (confirm("Aprovar pagamento final e gerar token?")) {
            appStore.finalizeReportByFinance(reportId, currentUser?.name || 'Financeiro');
            refreshData();
        }
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
            case 'REJECTED': return <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold">Rejeitado</span>;
            default: return null;
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20 relative">
            <header className="flex flex-col md:flex-row justify-between items-end gap-4 no-print">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <Receipt className="w-8 h-8 text-brand-primary" />
                        Despesas & Reembolso
                    </h1>
                    <p className="text-brand-gray-600 mt-1">Gestão de custos, rotas e fluxo de aprovação.</p>
                </div>
                
                <div className="flex bg-brand-gray-200 p-1 rounded-xl overflow-x-auto">
                    <button 
                        onClick={() => setActiveTab('RECEIPTS')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'RECEIPTS' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                    >
                        <ScanLine size={16} /> Lançamentos
                    </button>
                    <button 
                        onClick={() => setActiveTab('TRACKER')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'TRACKER' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                    >
                        <Map size={16} /> KM / Rota
                    </button>
                    <button 
                        onClick={() => setActiveTab('REPORTS')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'REPORTS' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                    >
                        <FileCheck size={16} /> Relatórios ({reports.filter(r => r.status.includes('SUBMITTED') || r.status.includes('APPROVED_GESTOR')).length})
                    </button>
                </div>
            </header>

            {/* --- TAB: RECEIPTS (EXPENSE ENTRY) --- */}
            {activeTab === 'RECEIPTS' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                    
                    {/* LEFT: FORM */}
                    <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 overflow-hidden h-fit sticky top-20">
                        <div className="p-6 bg-brand-gray-900 text-white flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2"><Camera className="w-5 h-5"/> Novo Comprovante</h3>
                        </div>
                        
                        <div className="p-6 space-y-5">
                            {/* Upload Area */}
                            <div 
                                className="border-2 border-dashed border-brand-gray-300 rounded-xl h-40 flex flex-col items-center justify-center bg-brand-gray-50 hover:bg-brand-gray-100 transition-colors cursor-pointer relative overflow-hidden group"
                                onClick={() => !previewImage && fileInputRef.current?.click()}
                            >
                                {previewImage ? (
                                    <div className="relative w-full h-full">
                                        <img src={previewImage} alt="Preview" className="w-full h-full object-contain p-2" />
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleClearImage(); }}
                                            className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <UploadCloud className="w-8 h-8 text-brand-gray-400 mb-2 group-hover:scale-110 transition-transform" />
                                        <p className="text-xs text-brand-gray-500 font-bold">Foto do Recibo</p>
                                    </>
                                )}
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                            </div>

                            {previewImage && (
                                <button 
                                    onClick={handleAnalyze} 
                                    disabled={isAnalyzing}
                                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-70"
                                >
                                    {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin"/> : <ScanLine className="w-3 h-3"/>}
                                    {isAnalyzing ? "Lendo..." : "Extrair Dados (IA)"}
                                </button>
                            )}

                            {/* Payment Method Switch */}
                            <div className="flex bg-brand-gray-100 p-1 rounded-lg">
                                <button 
                                    onClick={() => setExpenseForm({...expenseForm, paymentMethod: 'OWN_MONEY', reimbursable: true})}
                                    className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all ${expenseForm.paymentMethod === 'OWN_MONEY' ? 'bg-white text-brand-primary shadow-sm' : 'text-gray-500'}`}
                                >
                                    <Wallet size={14} /> Reembolso
                                </button>
                                <button 
                                    onClick={() => setExpenseForm({...expenseForm, paymentMethod: 'CORPORATE_CARD', reimbursable: false})}
                                    className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all ${expenseForm.paymentMethod === 'CORPORATE_CARD' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    <CreditCard size={14} /> Corporativo
                                </button>
                            </div>

                            {/* Form Fields */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
                                    <select 
                                        className="w-full border border-brand-gray-300 rounded-lg p-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                                        value={expenseForm.category}
                                        onChange={e => setExpenseForm({...expenseForm, category: e.target.value as ExpenseCategory})}
                                    >
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data</label>
                                        <input 
                                            type="date" 
                                            className="w-full border border-brand-gray-300 rounded-lg p-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                                            value={expenseForm.date}
                                            onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor (R$)</label>
                                        <CurrencyInput 
                                            className="w-full border border-brand-gray-300 rounded-lg p-2 text-sm font-bold text-gray-900 focus:ring-1 focus:ring-brand-primary outline-none"
                                            value={expenseForm.amount}
                                            onChange={val => setExpenseForm({...expenseForm, amount: val})}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estabelecimento</label>
                                    <input 
                                        className="w-full border border-brand-gray-300 rounded-lg p-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                                        value={expenseForm.establishment}
                                        onChange={e => setExpenseForm({...expenseForm, establishment: e.target.value})}
                                        placeholder="Nome do local"
                                    />
                                </div>

                                <button 
                                    onClick={handleSaveExpense}
                                    className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold shadow-lg hover:bg-brand-dark transition-colors flex items-center justify-center gap-2 mt-4"
                                >
                                    <CheckCircle2 size={18} /> Lançar Despesa
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: LIST */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Filters Bar */}
                        <div className="bg-white p-4 rounded-xl border border-brand-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <Filter size={16} className="text-gray-400" />
                                <select 
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                    className="border border-brand-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none w-full md:w-48"
                                >
                                    <option value="TODOS">Todas Categorias</option>
                                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-2 border border-brand-gray-300 rounded-lg px-3 py-2 bg-white w-full md:w-auto">
                                <CalendarIcon size={14} className="text-brand-gray-400" />
                                <input type="date" className="text-xs outline-none text-brand-gray-600 bg-transparent" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
                                <span className="text-gray-300">-</span>
                                <input type="date" className="text-xs outline-none text-brand-gray-600 bg-transparent" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
                            </div>
                        </div>

                        {/* List */}
                        <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden flex flex-col min-h-[400px]">
                            <div className="p-4 border-b border-brand-gray-100 bg-brand-gray-50 font-bold text-sm text-gray-700 flex justify-between items-center">
                                <span>Histórico de Lançamentos</span>
                                {isConsultant && expenses.some(e => e.status === 'OPEN') && (
                                    <span className="text-xs text-brand-primary bg-brand-primary/10 px-2 py-1 rounded font-bold">
                                        Itens pendentes de envio na aba Relatórios
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto divide-y divide-brand-gray-50 max-h-[600px]">
                                {filteredExpenses.length === 0 ? (
                                    <div className="p-10 text-center text-gray-400 flex flex-col items-center">
                                        <Search className="w-10 h-10 mb-2 opacity-20"/>
                                        <p>Nenhuma despesa encontrada.</p>
                                    </div>
                                ) : (
                                    filteredExpenses.map(exp => (
                                        <div key={exp.id} className="p-4 hover:bg-brand-gray-50 transition-colors flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2.5 rounded-full ${
                                                    exp.category === 'Combustível' ? 'bg-orange-100 text-orange-600' :
                                                    exp.category === 'Alimentação' ? 'bg-red-100 text-red-600' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {exp.category === 'Combustível' ? <Fuel size={18}/> : 
                                                     exp.category === 'Alimentação' ? <Utensils size={18}/> : <FileText size={18}/>}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-brand-gray-900 text-sm">{exp.establishment}</p>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <span>{new Date(exp.date).toLocaleDateString()}</span>
                                                        <span>•</span>
                                                        <span className={exp.paymentMethod === 'CORPORATE_CARD' ? 'text-purple-600 font-bold' : 'text-green-600 font-bold'}>
                                                            {exp.paymentMethod === 'CORPORATE_CARD' ? 'Corporativo' : 'Reembolso'}
                                                        </span>
                                                        <span>•</span>
                                                        {getStatusBadge(exp.status)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-brand-gray-900">R$ {exp.amount.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: TRACKER --- */}
            {activeTab === 'TRACKER' && (
                <div className="space-y-6 animate-fade-in">
                    <GpsTracker />
                </div>
            )}

            {/* --- TAB: REPORTS (CONSOLIDATION) --- */}
            {activeTab === 'REPORTS' && (
                <div className="space-y-6 animate-fade-in">
                    
                    {/* CONSULTANT VIEW: CREATE & VIEW STATUS */}
                    {isConsultant && (
                        <>
                            {/* PENDING ITEMS SECTION (LINK AREA) */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-gray-200">
                                <h3 className="text-lg font-bold text-brand-gray-900 mb-4 flex items-center gap-2">
                                    <Link className="w-5 h-5 text-brand-primary" /> Itens Disponíveis para Relatório
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    {/* PENDING KM LOGS */}
                                    <div className="bg-brand-gray-50 rounded-xl p-4 border border-brand-gray-100">
                                        <h4 className="text-sm font-bold text-brand-gray-700 mb-3 flex items-center justify-between">
                                            <span>Rotas Realizadas (Pendentes)</span>
                                            <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-xs">{tripLogs.filter(l => l.status === 'OPEN').length}</span>
                                        </h4>
                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                            {tripLogs.filter(l => l.status === 'OPEN').length === 0 ? (
                                                <p className="text-xs text-gray-400 italic">Nenhuma rota pendente.</p>
                                            ) : (
                                                tripLogs.filter(l => l.status === 'OPEN').map(log => (
                                                    <div key={log.id} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-gray-100">
                                                        <span>{new Date(log.date).toLocaleDateString()}</span>
                                                        <span className="font-bold">{log.distanceKm} km</span>
                                                        <span className="text-green-600 font-bold">R$ {log.valueEarned.toFixed(2)}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* PENDING EXPENSES */}
                                    <div className="bg-brand-gray-50 rounded-xl p-4 border border-brand-gray-100">
                                        <h4 className="text-sm font-bold text-brand-gray-700 mb-3 flex items-center justify-between">
                                            <span>Despesas Lançadas (Pendentes)</span>
                                            <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-xs">{expenses.filter(e => e.status === 'OPEN').length}</span>
                                        </h4>
                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                            {expenses.filter(e => e.status === 'OPEN').length === 0 ? (
                                                <p className="text-xs text-gray-400 italic">Nenhuma despesa pendente.</p>
                                            ) : (
                                                expenses.filter(e => e.status === 'OPEN').map(exp => (
                                                    <div key={exp.id} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-gray-100">
                                                        <span className="truncate max-w-[100px]">{exp.establishment}</span>
                                                        <span>{exp.category}</span>
                                                        <span className="font-bold">R$ {exp.amount.toFixed(2)}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-brand-gray-900 text-white p-4 rounded-xl shadow-lg">
                                    <div className="flex gap-4 text-sm">
                                        <div>
                                            <span className="block text-[10px] uppercase font-bold text-gray-400">Total a Reembolsar</span>
                                            <span className="font-bold text-xl text-green-400">
                                                R$ {(
                                                    expenses.filter(e => e.status === 'OPEN' && e.reimbursable).reduce((a,b) => a+b.amount,0) +
                                                    tripLogs.filter(l => l.status === 'OPEN').reduce((a,b) => a+b.valueEarned,0)
                                                ).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleCreateReport}
                                        className="w-full md:w-auto bg-brand-primary hover:bg-brand-dark text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <FileCheck size={20} /> Vincular e Gerar Relatório
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* REPORT LIST (SHARED VIEW) */}
                    <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-brand-gray-100 bg-brand-gray-50 font-bold text-brand-gray-900">
                            {isConsultant ? 'Meus Relatórios Enviados' : 'Relatórios para Aprovação'}
                        </div>
                        <div className="divide-y divide-brand-gray-100">
                            {reports.length === 0 ? (
                                <div className="p-12 text-center text-gray-400">Nenhum relatório encontrado.</div>
                            ) : (
                                reports.map(report => {
                                    // APPROVAL ACTIONS VISIBILITY
                                    const showGestorActions = isGestor && report.status === 'SUBMITTED_GESTOR';
                                    const showFinanceActions = isFinanceiro && report.status === 'APPROVED_GESTOR';

                                    return (
                                        <div key={report.id} className="p-6 hover:bg-brand-gray-50 transition-colors">
                                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-bold">{report.id}</span>
                                                        {getStatusBadge(report.status)}
                                                        <span className="text-xs text-gray-500">{new Date(report.createdDate).toLocaleDateString()}</span>
                                                    </div>
                                                    <h3 className="font-bold text-lg text-brand-gray-900">Relatório {report.period} - {report.requesterName}</h3>
                                                </div>
                                                
                                                <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
                                                    <div className="text-right">
                                                        <p className="text-[10px] text-gray-500 uppercase font-bold">Total Geral</p>
                                                        <p className="font-bold text-brand-gray-900">R$ {report.totalAmount.toFixed(2)}</p>
                                                    </div>
                                                    <div className="w-px h-8 bg-gray-300"></div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] text-green-600 uppercase font-bold">Reembolso</p>
                                                        <p className="font-bold text-green-700 text-lg">R$ {report.totalReimbursable.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Report Body / Details Summary */}
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                                                <span className="bg-gray-100 px-2 py-1 rounded">{report.itemCount} itens inclusos</span>
                                            </div>

                                            {/* APPROVAL ACTIONS */}
                                            {(showGestorActions || showFinanceActions) && (
                                                <div className="flex gap-3 pt-4 border-t border-gray-100 mt-2">
                                                    {showGestorActions && (
                                                        <>
                                                            <button 
                                                                onClick={() => handleRejectReportGestor(report.id)}
                                                                className="px-4 py-2 border border-red-200 text-red-600 font-bold rounded-lg text-xs hover:bg-red-50"
                                                            >
                                                                Rejeitar / Devolver
                                                            </button>
                                                            <button 
                                                                onClick={() => handleApproveReportGestor(report.id)}
                                                                className="px-6 py-2 bg-brand-primary text-white font-bold rounded-lg text-xs hover:bg-brand-dark shadow-md"
                                                            >
                                                                Aprovar (Gestor)
                                                            </button>
                                                        </>
                                                    )}
                                                    {showFinanceActions && (
                                                        <button 
                                                            onClick={() => handleFinalizeReportFinanceiro(report.id)}
                                                            className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg text-xs hover:bg-green-700 shadow-md flex items-center gap-2 w-full md:w-auto justify-center"
                                                        >
                                                            <DollarSign size={16} /> Aprovar Pagamento Final
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {/* VALIDATION TOKEN DISPLAY */}
                                            {report.validationToken && (
                                                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-green-800">
                                                        <CheckCircle2 size={16} />
                                                        <span className="text-xs font-bold">Relatório Pago e Finalizado</span>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[9px] text-green-600 uppercase font-bold">Token de Validação</span>
                                                        <span className="font-mono text-sm font-bold text-green-900 tracking-widest">{report.validationToken}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DespesasPage;
