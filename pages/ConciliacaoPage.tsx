
import React, { useState, useRef, useEffect } from 'react';
import { 
    CreditCard, UploadCloud, Loader2, CheckCircle2, AlertTriangle, 
    FileText, X, Search, ArrowRightLeft, User, Send
} from 'lucide-react';
import { appStore } from '../services/store';
import { analyzeInvoice } from '../services/geminiService';
import { Expense, SystemUser, UserRole } from '../types';

interface InvoiceItem {
    date: string;
    description: string;
    amount: number;
    matchId?: string; // ID of the matched system expense
    status?: 'MATCHED' | 'MISSING_RECEIPT' | 'MISSING_IN_SYSTEM';
}

const ConciliacaoPage: React.FC = () => {
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
    const [systemExpenses, setSystemExpenses] = useState<Expense[]>([]);
    const [period, setPeriod] = useState<string>('');
    const [totalInvoice, setTotalInvoice] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // User Selection
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');

    // Workflow State
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // Load Users who might have corporate cards (Sales & Managers)
        const allUsers = appStore.getUsers().filter(u => u.role === UserRole.FIELD_SALES || u.role === UserRole.INSIDE_SALES || u.role === UserRole.GESTOR);
        setUsers(allUsers);
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setInvoiceFile(e.target.files[0]);
        }
    };

    const handleProcessInvoice = async () => {
        if (!invoiceFile || !selectedUserId) {
            alert("Selecione o usuário responsável pelo cartão e faça o upload da fatura.");
            return;
        }
        setIsAnalyzing(true);

        try {
            // Convert file to base64
            const reader = new FileReader();
            reader.readAsDataURL(invoiceFile);
            reader.onload = async () => {
                const base64 = (reader.result as string).split(',')[1];
                
                // Call Gemini Service
                const result = await analyzeInvoice(base64);
                
                if (result && result.items) {
                    setInvoiceItems(result.items);
                    setTotalInvoice(result.totalAmount || 0);
                    setPeriod(result.period || '');
                    
                    // Fetch System Expenses for Selected User (Corporate Card Only)
                    // Fetch ALL expenses to avoid date filter issues initially, then filter locally
                    const selectedUser = users.find(u => u.id === selectedUserId);
                    const userName = selectedUser ? selectedUser.name : '';

                    const userExpenses = appStore.getExpenses().filter(e => 
                        e.paymentMethod === 'CORPORATE_CARD' && 
                        e.requesterName === userName
                    );
                    
                    setSystemExpenses(userExpenses);
                    
                    performMatching(result.items, userExpenses);
                } else {
                    alert("Não foi possível ler a fatura. Tente uma imagem mais clara.");
                }
                setIsAnalyzing(false);
            };
        } catch (error) {
            console.error("Processing error", error);
            alert("Erro ao processar arquivo.");
            setIsAnalyzing(false);
        }
    };

    const performMatching = (invItems: InvoiceItem[], sysExpenses: Expense[]) => {
        const updatedItems = invItems.map(item => {
            // Simple match logic: Same Amount + Date close (+- 1 day)
            const match = sysExpenses.find(exp => {
                const amountMatch = Math.abs(exp.amount - item.amount) < 0.05;
                // Simplified date matching
                const dateMatch = exp.date === item.date; 
                return amountMatch && dateMatch;
            });

            if (match) {
                return { ...item, matchId: match.id, status: 'MATCHED' as const };
            } else {
                return { ...item, status: 'MISSING_RECEIPT' as const };
            }
        });
        setInvoiceItems(updatedItems);
    };

    const handleSendForApproval = () => {
        const missingCount = invoiceItems.filter(i => i.status !== 'MATCHED').length;
        
        if (missingCount > 0) {
            if (!confirm(`Existem ${missingCount} itens sem comprovante/match no sistema. Deseja enviar mesmo assim? (Serão marcados como pendência)`)) {
                return;
            }
        }

        setIsSubmitting(true);
        
        // Simulate submitting report
        setTimeout(() => {
            const selectedUser = users.find(u => u.id === selectedUserId);
            
            // Create a report containing matched items
            const matchedIds = invoiceItems
                .filter(i => i.status === 'MATCHED' && i.matchId)
                .map(i => i.matchId!);
            
            if (matchedIds.length > 0) {
                appStore.submitExpenseReport(selectedUser?.name || 'Unknown', {
                    expenseIds: matchedIds,
                    logIds: []
                });
            }

            alert("Conciliação finalizada e enviada para aprovação (Gestor > Financeiro).");
            setIsSubmitting(false);
            // Reset
            setInvoiceItems([]);
            setInvoiceFile(null);
            setTotalInvoice(0);
        }, 1500);
    };

    const handleRequestReceipt = (item: InvoiceItem) => {
        alert(`Solicitação de comprovante enviada para o usuário referente a: ${item.description} - R$ ${item.amount}`);
        // In a real app, this would trigger a notification
    };

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case 'MATCHED': return <span className="flex items-center gap-1 text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded"><CheckCircle2 size={12}/> Conciliado</span>;
            case 'MISSING_RECEIPT': return <span className="flex items-center gap-1 text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded animate-pulse"><AlertTriangle size={12}/> Sem Comprovante</span>;
            default: return null;
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <CreditCard className="w-8 h-8 text-brand-primary" />
                        Conciliação de Cartão
                    </h1>
                    <p className="text-brand-gray-600 mt-1">Validação automática de faturas corporativas vs despesas lançadas.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* SETTINGS / UPLOAD AREA */}
                <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-200 p-6 h-fit">
                    <h3 className="font-bold text-brand-gray-900 mb-6 flex items-center gap-2">
                        <UploadCloud className="w-5 h-5 text-blue-600" /> Dados da Fatura
                    </h3>
                    
                    {/* User Selector */}
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-2">Portador do Cartão</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray-400" />
                            <select 
                                value={selectedUserId} 
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-brand-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white appearance-none"
                            >
                                <option value="">Selecione o usuário...</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div 
                        className={`border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center transition-colors cursor-pointer mb-6 relative overflow-hidden ${!selectedUserId ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200' : 'border-brand-gray-300 bg-brand-gray-50 hover:bg-brand-gray-100'}`}
                        onClick={() => selectedUserId && fileInputRef.current?.click()}
                    >
                        {invoiceFile ? (
                            <div className="text-center p-4">
                                <FileText className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                                <p className="text-sm font-bold text-gray-700 truncate max-w-[200px]">{invoiceFile.name}</p>
                                <p className="text-xs text-gray-500">{(invoiceFile.size / 1024).toFixed(0)} KB</p>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setInvoiceFile(null); }}
                                    className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <div className="text-center text-gray-400">
                                <UploadCloud className="w-12 h-12 mx-auto mb-2" />
                                <p className="text-sm font-bold">Clique para upload</p>
                                <p className="text-xs">PDF ou Imagem da Fatura</p>
                            </div>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} disabled={!selectedUserId} />
                    </div>

                    <button 
                        onClick={handleProcessInvoice}
                        disabled={!invoiceFile || !selectedUserId || isAnalyzing}
                        className="w-full bg-brand-gray-900 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin"/> : <ArrowRightLeft className="w-4 h-4"/>}
                        {isAnalyzing ? 'Processando IA...' : 'Conciliar Fatura'}
                    </button>
                </div>

                {/* RESULTS AREA */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-brand-gray-200 overflow-hidden min-h-[500px] flex flex-col">
                    <div className="p-6 border-b border-brand-gray-100 bg-brand-gray-50 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-brand-gray-900">Resultado da Conciliação</h3>
                            {period && <p className="text-xs text-brand-gray-500">Período Detectado: {period}</p>}
                        </div>
                        {totalInvoice > 0 && (
                            <div className="text-right">
                                <p className="text-xs font-bold text-gray-400 uppercase">Total Fatura</p>
                                <p className="text-xl font-bold text-brand-gray-900">R$ {totalInvoice.toFixed(2)}</p>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {invoiceItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-12 text-gray-400">
                                <Search className="w-12 h-12 mb-3 opacity-20" />
                                <p>Selecione um usuário e envie a fatura para iniciar.</p>
                            </div>
                        ) : (
                            <>
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-white text-gray-500 border-b border-gray-100 font-bold text-xs uppercase sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-6 py-3">Data</th>
                                            <th className="px-6 py-3">Descrição (Fatura)</th>
                                            <th className="px-6 py-3 text-right">Valor</th>
                                            <th className="px-6 py-3 text-center">Status Sistema</th>
                                            <th className="px-6 py-3 text-right">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {invoiceItems.map((item, idx) => (
                                            <tr key={idx} className={`hover:bg-brand-gray-50 transition-colors ${item.status === 'MISSING_RECEIPT' ? 'bg-red-50/30' : ''}`}>
                                                <td className="px-6 py-4 text-gray-600 font-mono text-xs">{item.date}</td>
                                                <td className="px-6 py-4 font-bold text-gray-800">{item.description}</td>
                                                <td className="px-6 py-4 text-right font-mono font-bold">R$ {item.amount.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    {getStatusBadge(item.status)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {item.status === 'MISSING_RECEIPT' && (
                                                        <button 
                                                            onClick={() => handleRequestReceipt(item)}
                                                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 border border-blue-200 bg-white px-2 py-1 rounded shadow-sm hover:bg-blue-50 transition-colors"
                                                        >
                                                            Solicitar
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        )}
                    </div>

                    {invoiceItems.length > 0 && (
                        <div className="p-4 border-t border-brand-gray-200 bg-white flex justify-end">
                            <button 
                                onClick={handleSendForApproval}
                                disabled={isSubmitting}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                Enviar para Aprovação
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConciliacaoPage;
