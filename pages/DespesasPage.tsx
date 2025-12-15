
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    Receipt, Map, Camera, FileText, UploadCloud, CheckCircle2, 
    AlertCircle, Plus, Trash2, Fuel, Utensils, Car, Home, 
    MoreHorizontal, Printer, Download, ScanLine, X, Loader2, Filter, Calendar as CalendarIcon, Search
} from 'lucide-react';
import { appStore } from '../services/store';
import { analyzeReceipt } from '../services/geminiService';
import { Expense, ExpenseCategory, TripLog } from '../types';
import { GpsTracker } from '../components/GpsTracker';
import { CurrencyInput } from '../components/CurrencyInput';
import { PagmotorsLogo } from '../components/Logo';

const CATEGORIES: ExpenseCategory[] = ['Combustível', 'Estacionamento', 'Pedágio', 'Uber/Táxi', 'Hospedagem', 'Alimentação', 'Outros'];

const DespesasPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'RECEIPTS' | 'TRACKER'>('RECEIPTS');
    const [expenses, setExpenses] = useState<Expense[]>([]);
    
    // Filters State
    const [filterCategory, setFilterCategory] = useState<string>('TODOS');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // Receipt Reader State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [expenseForm, setExpenseForm] = useState<Partial<Expense>>({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        category: 'Outros',
        establishment: ''
    });
    
    // Report PDF State
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        refreshExpenses();
        // Set default date filter to current month
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        setDateRange({ start: firstDay, end: lastDay });
    }, []);

    const refreshExpenses = () => {
        setExpenses(appStore.getExpenses().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
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

    // Calculate Totals based on FILTERED data
    const totalPending = filteredExpenses.filter(e => e.status === 'PENDING').reduce((acc, e) => acc + e.amount, 0);
    const totalApproved = filteredExpenses.filter(e => e.status === 'APPROVED').reduce((acc, e) => acc + e.amount, 0);

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
            // Remove data:image/jpeg;base64, prefix
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

        const newExpense: Expense = {
            id: Date.now().toString(),
            date: expenseForm.date!,
            amount: expenseForm.amount!,
            category: expenseForm.category as ExpenseCategory,
            establishment: expenseForm.establishment!,
            imageUrl: previewImage || undefined,
            status: 'PENDING',
            requesterName: 'Eu',
            fuelDetails: expenseForm.fuelDetails,
            notes: expenseForm.notes
        };

        appStore.addExpense(newExpense);
        refreshExpenses();
        
        // Reset
        setExpenseForm({
            date: new Date().toISOString().split('T')[0],
            amount: 0,
            category: 'Outros',
            establishment: ''
        });
        setPreviewImage(null);
        if(fileInputRef.current) fileInputRef.current.value = '';
        alert("Despesa salva com sucesso!");
    };

    // --- PDF GENERATION FIX ---
    const generateKmReport = async () => {
        setIsGeneratingPdf(true);
        
        setTimeout(async () => {
            // Safely access global libraries loaded via index.html
            // @ts-ignore
            const html2canvas = window.html2canvas;
            // @ts-ignore
            const jspdf = window.jspdf?.jsPDF || window.jsPDF; // Try both UMD locations

            if (html2canvas && jspdf && reportRef.current) {
                try {
                    const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff' });
                    const imgData = canvas.toDataURL('image/png');
                    
                    const pdf = new jspdf('p', 'mm', 'a4');
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();
                    const imgWidth = pdfWidth;
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;
                    
                    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                    pdf.save(`Relatorio_KM_${new Date().toISOString().split('T')[0]}.pdf`);
                } catch (e) {
                    console.error("PDF Gen Error", e);
                    alert("Erro ao gerar PDF. Verifique se as bibliotecas foram carregadas.");
                }
            } else {
                console.error("Missing Libraries:", { html2canvas: !!html2canvas, jspdf: !!jspdf });
                alert("Erro: Bibliotecas de PDF não carregadas. Recarregue a página.");
            }
            setIsGeneratingPdf(false);
        }, 1000);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20 relative">
            <header className="flex flex-col md:flex-row justify-between items-end gap-4 no-print">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <Receipt className="w-8 h-8 text-brand-primary" />
                        Despesas & Reembolso
                    </h1>
                    <p className="text-brand-gray-600 mt-1">Gestão de custos de viagem e roteiro.</p>
                </div>
                
                <div className="flex bg-brand-gray-200 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('RECEIPTS')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'RECEIPTS' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                    >
                        <ScanLine size={16} /> Comprovantes
                    </button>
                    <button 
                        onClick={() => setActiveTab('TRACKER')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'TRACKER' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                    >
                        <Map size={16} /> Roteiro & KM
                    </button>
                </div>
            </header>

            {activeTab === 'RECEIPTS' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                    
                    {/* LEFT: FORM & READER */}
                    <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 overflow-hidden h-fit sticky top-20">
                        <div className="p-6 bg-brand-gray-900 text-white flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2"><Camera className="w-5 h-5"/> Novo Comprovante</h3>
                        </div>
                        
                        <div className="p-6 space-y-5">
                            {/* Upload Area */}
                            <div 
                                className="border-2 border-dashed border-brand-gray-300 rounded-xl h-48 flex flex-col items-center justify-center bg-brand-gray-50 hover:bg-brand-gray-100 transition-colors cursor-pointer relative overflow-hidden group"
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
                                        <UploadCloud className="w-10 h-10 text-brand-gray-400 mb-2 group-hover:scale-110 transition-transform" />
                                        <p className="text-xs text-brand-gray-500 font-bold">Clique para fotografar ou enviar</p>
                                    </>
                                )}
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                            </div>

                            {previewImage && (
                                <button 
                                    onClick={handleAnalyze} 
                                    disabled={isAnalyzing}
                                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-70"
                                >
                                    {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin"/> : <ScanLine className="w-4 h-4"/>}
                                    {isAnalyzing ? "Lendo com IA..." : "Extrair Dados (IA)"}
                                </button>
                            )}

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

                                {expenseForm.category === 'Combustível' && (
                                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 space-y-3">
                                        <p className="text-xs font-bold text-orange-700 flex items-center gap-1"><Fuel size={12}/> Detalhes Combustível</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-orange-600 mb-1">Tipo</label>
                                                <select 
                                                    className="w-full border border-orange-200 rounded p-1.5 text-xs bg-white outline-none"
                                                    value={expenseForm.fuelDetails?.fuelType || 'Gasolina'}
                                                    onChange={e => setExpenseForm({
                                                        ...expenseForm, 
                                                        fuelDetails: { 
                                                            liters: expenseForm.fuelDetails?.liters || 0, 
                                                            pricePerLiter: expenseForm.fuelDetails?.pricePerLiter || 0, 
                                                            fuelType: e.target.value as any 
                                                        }
                                                    })}
                                                >
                                                    <option value="Gasolina">Gasolina</option>
                                                    <option value="Etanol">Etanol</option>
                                                    <option value="Diesel">Diesel</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-orange-600 mb-1">Litros</label>
                                                <input 
                                                    type="number" step="0.1"
                                                    className="w-full border border-orange-200 rounded p-1.5 text-xs outline-none"
                                                    value={expenseForm.fuelDetails?.liters || ''}
                                                    onChange={e => setExpenseForm({
                                                        ...expenseForm, 
                                                        fuelDetails: { ...expenseForm.fuelDetails!, liters: parseFloat(e.target.value) }
                                                    })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <button 
                                    onClick={handleSaveExpense}
                                    className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold shadow-lg hover:bg-brand-dark transition-colors flex items-center justify-center gap-2 mt-4"
                                >
                                    <CheckCircle2 size={18} /> Salvar Despesa
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: LIST & REPORT */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Filters Bar */}
                        <div className="bg-white p-4 rounded-xl border border-brand-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <div className="p-2 bg-brand-gray-100 rounded-lg text-brand-gray-500">
                                    <Filter size={16} />
                                </div>
                                <select 
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                    className="border border-brand-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary w-full md:w-48"
                                >
                                    <option value="TODOS">Todas Categorias</option>
                                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <div className="flex items-center gap-2 border border-brand-gray-300 rounded-lg px-3 py-2 bg-white w-full">
                                    <CalendarIcon size={14} className="text-brand-gray-400" />
                                    <input 
                                        type="date" 
                                        className="text-xs outline-none text-brand-gray-600 font-medium bg-transparent"
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                                    />
                                    <span className="text-gray-300">-</span>
                                    <input 
                                        type="date" 
                                        className="text-xs outline-none text-brand-gray-600 font-medium bg-transparent"
                                        value={dateRange.end}
                                        onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Stats - Dynamic based on Filters */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-brand-gray-200 shadow-sm">
                                <div className="flex justify-between items-start">
                                    <p className="text-xs font-bold text-gray-400 uppercase">A Reembolsar (Pendente)</p>
                                    {filterCategory !== 'TODOS' && <span className="text-[9px] bg-brand-gray-100 px-1.5 rounded text-brand-gray-500">{filterCategory}</span>}
                                </div>
                                <p className="text-2xl font-bold text-brand-gray-900 mt-1">R$ {totalPending.toFixed(2)}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-brand-gray-200 shadow-sm">
                                <div className="flex justify-between items-start">
                                    <p className="text-xs font-bold text-gray-400 uppercase">Já Reembolsado</p>
                                    {filterCategory !== 'TODOS' && <span className="text-[9px] bg-brand-gray-100 px-1.5 rounded text-brand-gray-500">{filterCategory}</span>}
                                </div>
                                <p className="text-2xl font-bold text-green-600 mt-1">R$ {totalApproved.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* List */}
                        <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden flex flex-col min-h-[400px]">
                            <div className="p-4 border-b border-brand-gray-100 bg-brand-gray-50 font-bold text-sm text-gray-700 flex justify-between items-center">
                                <span>Histórico de Despesas ({filteredExpenses.length})</span>
                                <button className="text-brand-primary text-xs flex items-center gap-1 hover:underline font-bold">
                                    <Download size={14}/> Exportar Excel
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto divide-y divide-brand-gray-50 max-h-[500px]">
                                {filteredExpenses.length === 0 ? (
                                    <div className="p-10 text-center text-gray-400 flex flex-col items-center">
                                        <Search className="w-10 h-10 mb-2 opacity-20"/>
                                        <p>Nenhuma despesa encontrada com os filtros atuais.</p>
                                    </div>
                                ) : (
                                    filteredExpenses.map(exp => (
                                        <div key={exp.id} className="p-4 hover:bg-brand-gray-50 transition-colors flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2.5 rounded-full ${
                                                    exp.category === 'Combustível' ? 'bg-orange-100 text-orange-600' :
                                                    exp.category === 'Alimentação' ? 'bg-red-100 text-red-600' :
                                                    exp.category === 'Hospedagem' ? 'bg-blue-100 text-blue-600' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {exp.category === 'Combustível' ? <Fuel size={18}/> : 
                                                     exp.category === 'Alimentação' ? <Utensils size={18}/> :
                                                     exp.category === 'Hospedagem' ? <Home size={18}/> : <FileText size={18}/>}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-brand-gray-900 text-sm">{exp.establishment}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(exp.date).toLocaleDateString()} • {exp.category}
                                                        {exp.fuelDetails && ` (${exp.fuelDetails.liters}L)`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-brand-gray-900">R$ {exp.amount.toFixed(2)}</p>
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                                    exp.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                    exp.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {exp.status === 'PENDING' ? 'Em Análise' : exp.status === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'TRACKER' && (
                <div className="space-y-6 animate-fade-in">
                    <GpsTracker onExportReport={generateKmReport} />
                    
                    {/* HIDDEN REPORT TEMPLATE FOR PDF GENERATION */}
                    <div className="fixed left-[-9999px] top-0 pointer-events-none">
                        <div ref={reportRef} className="w-[210mm] min-h-[297mm] bg-white p-12 flex flex-col relative text-brand-gray-900 font-sans">
                            {/* Report Header */}
                            <div className="flex justify-between items-center border-b-2 border-brand-primary pb-6 mb-8">
                                <div className="scale-75 origin-left text-brand-primary"><PagmotorsLogo /></div>
                                <div className="text-right">
                                    <h2 className="text-3xl font-bold uppercase tracking-wider text-brand-gray-900">Relatório de KM</h2>
                                    <p className="text-sm text-gray-500 mt-1">Reembolso de Deslocamento</p>
                                </div>
                            </div>

                            {/* User Info */}
                            <div className="bg-gray-100 p-6 rounded-xl mb-8 grid grid-cols-2 gap-6 text-sm">
                                <div><span className="font-bold uppercase text-gray-500 text-xs block mb-1">Consultor</span>Eu (Consultor)</div>
                                <div><span className="font-bold uppercase text-gray-500 text-xs block mb-1">Data de Emissão</span>{new Date().toLocaleDateString()}</div>
                                <div><span className="font-bold uppercase text-gray-500 text-xs block mb-1">Veículo</span>{appStore.getMyVehicle()?.plate || 'Não Cadastrado'}</div>
                                <div><span className="font-bold uppercase text-gray-500 text-xs block mb-1">Valor do KM</span>R$ 0,58</div>
                            </div>

                            {/* Placeholder for Map Image in PDF */}
                            <div className="border-2 border-dashed border-gray-300 rounded-xl h-72 bg-gray-50 flex flex-col items-center justify-center mb-8 relative overflow-hidden text-gray-400">
                                <Map size={64} className="mb-2 opacity-50" />
                                <p className="text-sm font-bold uppercase">Mapa do Percurso</p>
                                <p className="text-xs">(Visualização do trajeto GPS capturado no app)</p>
                            </div>

                            {/* Summary Table */}
                            <table className="w-full text-sm text-left border-collapse mb-12">
                                <thead>
                                    <tr className="bg-brand-gray-900 text-white uppercase text-xs">
                                        <th className="p-3 rounded-tl-lg">Data</th>
                                        <th className="p-3">Início / Fim</th>
                                        <th className="p-3 text-right">KM Percorrido</th>
                                        <th className="p-3 text-right rounded-tr-lg">Valor (R$)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {appStore.getTripLogs().slice(0, 5).map((log, i) => (
                                        <tr key={i} className="border-b border-gray-200">
                                            <td className="p-4">{new Date(log.date).toLocaleDateString()}</td>
                                            <td className="p-4">
                                                {new Date(log.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {new Date(log.endTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                            </td>
                                            <td className="p-4 text-right font-bold text-gray-800">{log.distanceKm} km</td>
                                            <td className="p-4 text-right font-bold text-green-700">R$ {log.valueEarned.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Signatures */}
                            <div className="mt-auto grid grid-cols-2 gap-16 pt-10">
                                <div className="border-t border-gray-400 pt-3 text-center">
                                    <p className="text-sm font-bold uppercase text-gray-800">Assinatura do Consultor</p>
                                    <p className="text-xs text-gray-500 mt-1">Certificado Digital App</p>
                                </div>
                                <div className="border-t border-gray-400 pt-3 text-center">
                                    <p className="text-sm font-bold uppercase text-gray-800">Validação Gestor</p>
                                </div>
                            </div>
                            
                            <div className="text-center text-[10px] text-gray-400 mt-8 uppercase tracking-widest">
                                Documento gerado automaticamente pelo Sistema Pagmotors
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DespesasPage;
