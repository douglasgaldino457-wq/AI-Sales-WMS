
import React, { useState, useEffect } from 'react';
import { 
    BarChart2, Target, TrendingUp, 
    Lightbulb, Activity, Loader2,
    Calendar, Info, Users, Briefcase, Save, Lock
} from 'lucide-react';
import { useAppStore } from '../services/useAppStore';
import { getStrategyAnalysis } from '../services/geminiService';
import { appStore } from '../services/store';
import { CurrencyInput } from '../components/CurrencyInput';
import { 
    BarChart, Bar, XAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { UserRole, SalesGoal, SystemUser } from '../types';

const EstrategiaPage: React.FC = () => {
    const { currentUser } = useAppStore();
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'METAS'>('DASHBOARD');
    
    // State for Targets (Simple Dashboard View)
    const [fieldTarget, setFieldTarget] = useState(150);
    const [insideTarget, setInsideTarget] = useState(80);
    const [currentField, setCurrentField] = useState(0);
    const [currentInside, setCurrentInside] = useState(0);
    
    // --- NEW: DETAILED GOALS STATE ---
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    
    // Goals Selection State
    const [targetType, setTargetType] = useState<'FIELD' | 'INSIDE'>('FIELD');
    const [targetUser, setTargetUser] = useState<string>('TEAM'); // 'TEAM' or Specific User ID
    
    // Loaded Users for Dropdown
    const [availableUsers, setAvailableUsers] = useState<SystemUser[]>([]);

    const [currentGoal, setCurrentGoal] = useState<SalesGoal>({
        id: '',
        month: selectedMonth,
        userId: '',
        userRole: UserRole.FIELD_SALES,
        tpv: 0,
        reactivation: 0,
        newSales: 0,
        efficiency: 0,
        visits: 0,
        appointments: 0,
        updatedAt: ''
    });
    // --------------------------------

    // AI & Projections
    const [aiAnalysis, setAiAnalysis] = useState<string>('');
    const [isLoadingAi, setIsLoadingAi] = useState(false);

    // Mock Date Logic
    const today = new Date();
    const totalDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysPassed = today.getDate();

    useEffect(() => {
        // Calculate current numbers from store
        const appts = appStore.getAppointments();
        const fieldConversions = appts.filter(a => a.visitReport?.outcome === 'Convertido' && !a.insideSalesName).length;
        const insideConversions = appts.filter(a => a.visitReport?.outcome === 'Convertido' && a.insideSalesName).length;
        
        // Mocking some numbers if store is empty for demo purposes
        setCurrentField(fieldConversions || 45); 
        setCurrentInside(insideConversions || 32);
        
        refreshUsers();
    }, []);

    // Refresh Users based on selected Type
    useEffect(() => {
        refreshUsers();
        // Reset selection to Team when switching type
        setTargetUser('TEAM');
    }, [targetType]);

    // Load Goal when User, Month or Type changes
    useEffect(() => {
        loadGoalData();
    }, [targetUser, targetType, selectedMonth]);

    const refreshUsers = () => {
        const allUsers = appStore.getUsers();
        const filtered = allUsers.filter(u => {
            if (targetType === 'FIELD') return u.role === UserRole.FIELD_SALES;
            return u.role === UserRole.INSIDE_SALES;
        });
        setAvailableUsers(filtered);
    };

    const loadGoalData = () => {
        if (targetUser === 'TEAM') {
            // Load Aggregated Team Goal (Read Only Sum)
            const teamGoal = appStore.getTeamGoal(targetType === 'FIELD' ? 'FIELD' : 'INSIDE', selectedMonth);
            setCurrentGoal(teamGoal);
        } else {
            // Load Individual Goal
            const individualGoal = appStore.getSalesGoal(targetUser, selectedMonth);
            
            if (individualGoal) {
                setCurrentGoal(individualGoal);
            } else {
                // Initialize empty goal for user
                setCurrentGoal({
                    id: `${selectedMonth}-${targetUser}`,
                    month: selectedMonth,
                    userId: targetUser,
                    userRole: targetType === 'FIELD' ? UserRole.FIELD_SALES : UserRole.INSIDE_SALES,
                    tpv: 0,
                    reactivation: 0,
                    newSales: 0,
                    efficiency: 0,
                    visits: 0,
                    appointments: 0,
                    updatedAt: new Date().toISOString()
                });
            }
        }
    };

    const handleGenerateAnalysis = async () => {
        setIsLoadingAi(true);
        const totalCurrent = currentField + currentInside;
        const totalTarget = fieldTarget + insideTarget;
        
        const analysis = await getStrategyAnalysis(totalCurrent, totalTarget, daysPassed, totalDays);
        setAiAnalysis(analysis);
        setIsLoadingAi(false);
    };

    const handleSaveGoal = () => {
        if (targetUser === 'TEAM') return; // Cannot save aggregate directly
        
        appStore.setSalesGoal({
            ...currentGoal,
            updatedAt: new Date().toISOString()
        });
        alert(`Meta salva para o consultor!`);
    };

    // Chart Data
    const data = [
        { name: 'Field Sales', Atual: currentField, Meta: fieldTarget },
        { name: 'Inside Sales', Atual: currentInside, Meta: insideTarget },
    ];

    // Helper Component for Rule Tooltips
    const RuleTip = ({ text }: { text: string }) => (
        <div className="group relative inline-block ml-1">
            <Info className="w-3 h-3 text-brand-gray-400 cursor-help" />
            <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-brand-gray-900 text-white text-[10px] p-2 rounded-lg shadow-xl z-50 leading-relaxed">
                {text}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-brand-gray-900"></div>
            </div>
        </div>
    );

    const isReadOnly = targetUser === 'TEAM';

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-fade-in">
            <header className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <BarChart2 className="w-8 h-8 text-brand-primary" />
                        Planejamento Estratégico
                    </h1>
                    <p className="text-brand-gray-600 mt-1">Definição de metas e inteligência de mercado.</p>
                </div>
                
                {/* TABS */}
                <div className="flex bg-brand-gray-200 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('DASHBOARD')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'DASHBOARD' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                    >
                        <Activity className="w-4 h-4" /> Dashboard
                    </button>
                    <button 
                        onClick={() => setActiveTab('METAS')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'METAS' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                    >
                        <Target className="w-4 h-4" /> Cadastrar Metas
                    </button>
                </div>
            </header>

            {/* === TAB: DASHBOARD === */}
            {activeTab === 'DASHBOARD' && (
                <div className="space-y-8 animate-fade-in">
                    {/* TOP ROW: TARGETS & AI */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* 1. SALES TARGETS (Editable) */}
                        <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 p-6 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-brand-gray-900 flex items-center gap-2">
                                    <Target className="w-5 h-5 text-brand-primary" /> Metas do Mês
                                </h3>
                                <span className="text-xs text-brand-gray-400 bg-brand-gray-50 px-2 py-1 rounded">
                                    {daysPassed}/{totalDays} dias corridos
                                </span>
                            </div>
                            
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-bold text-gray-700">Field Sales</span>
                                        <input 
                                            type="number" 
                                            value={fieldTarget} 
                                            onChange={(e) => setFieldTarget(Number(e.target.value))}
                                            className="w-16 text-right font-bold border-b border-gray-300 focus:border-brand-primary outline-none text-brand-primary"
                                        />
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                        <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${Math.min((currentField/fieldTarget)*100, 100)}%` }}></div>
                                    </div>
                                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                                        <span>Atual: {currentField}</span>
                                        <span>{((currentField/fieldTarget)*100).toFixed(0)}%</span>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-bold text-gray-700">Inside Sales</span>
                                        <input 
                                            type="number" 
                                            value={insideTarget} 
                                            onChange={(e) => setInsideTarget(Number(e.target.value))}
                                            className="w-16 text-right font-bold border-b border-gray-300 focus:border-brand-primary outline-none text-brand-primary"
                                        />
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                        <div className="bg-purple-600 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${Math.min((currentInside/insideTarget)*100, 100)}%` }}></div>
                                    </div>
                                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                                        <span>Atual: {currentInside}</span>
                                        <span>{((currentInside/insideTarget)*100).toFixed(0)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. AI PROJECTION */}
                        <div className="lg:col-span-2 bg-gradient-to-br from-brand-gray-900 to-brand-gray-800 text-white rounded-2xl shadow-lg p-6 relative overflow-hidden flex flex-col">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                            
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <Lightbulb className="w-5 h-5 text-yellow-400" /> Inteligência de Projeção
                                </h3>
                                <button 
                                    onClick={handleGenerateAnalysis}
                                    disabled={isLoadingAi}
                                    className="bg-white/10 hover:bg-white/20 text-xs font-bold px-3 py-1.5 rounded transition-colors flex items-center gap-2"
                                >
                                    {isLoadingAi ? <Loader2 size={12} className="animate-spin" /> : <Activity size={12} />}
                                    {isLoadingAi ? 'Processando...' : 'Atualizar Análise'}
                                </button>
                            </div>

                            <div className="flex-1 relative z-10 flex gap-6">
                                <div className="flex-1 min-w-[200px]">
                                    {aiAnalysis ? (
                                        <div className="prose prose-invert prose-sm text-sm leading-relaxed text-gray-300">
                                            <p className="whitespace-pre-line">{aiAnalysis}</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                            <p className="text-sm">Clique em atualizar para gerar insights.</p>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Mini Projection Chart */}
                                <div className="w-48 h-32 hidden md:block min-h-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data}>
                                            <XAxis dataKey="name" hide />
                                            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff'}} />
                                            <Bar dataKey="Atual" fill="#10B981" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="Meta" fill="#374151" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* === TAB: CADASTRO DE METAS (DETAILED) === */}
            {activeTab === 'METAS' && (
                <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 overflow-hidden animate-fade-in">
                    
                    {/* Header Controls */}
                    <div className="p-6 border-b border-brand-gray-100 bg-brand-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary"><Target className="w-5 h-5" /></div>
                            <div>
                                <h2 className="text-lg font-bold text-brand-gray-900">Configuração de Metas</h2>
                                <p className="text-xs text-brand-gray-500">Definição individual por consultor.</p>
                            </div>
                        </div>
                        
                        <div className="flex gap-4">
                            {/* Month Selector */}
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-brand-gray-500 uppercase">Vigência:</label>
                                <input 
                                    type="month" 
                                    value={selectedMonth} 
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="border border-brand-gray-300 rounded-lg px-3 py-1.5 text-sm font-bold text-brand-gray-800 outline-none focus:ring-1 focus:ring-brand-primary bg-white cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Context Selectors */}
                    <div className="px-6 py-4 bg-white border-b border-brand-gray-100 flex flex-col md:flex-row gap-4 items-center">
                        <div className="w-full md:w-1/3">
                            <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Time (Contexto)</label>
                            <div className="flex bg-brand-gray-100 p-1 rounded-lg">
                                <button 
                                    onClick={() => setTargetType('FIELD')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${targetType === 'FIELD' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    Field Sales
                                </button>
                                <button 
                                    onClick={() => setTargetType('INSIDE')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${targetType === 'INSIDE' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    Inside Sales
                                </button>
                            </div>
                        </div>

                        <div className="w-full md:w-1/3">
                            <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1 flex items-center gap-2">
                                Selecionar Alvo
                                {isReadOnly && <span className="bg-brand-gray-200 text-brand-gray-600 text-[9px] px-1.5 rounded flex items-center"><Lock size={8} className="mr-1"/> Somatória</span>}
                            </label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray-400" />
                                <select 
                                    value={targetUser}
                                    onChange={(e) => setTargetUser(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-brand-gray-300 rounded-lg text-sm bg-white outline-none focus:border-brand-primary font-medium"
                                >
                                    <option value="TEAM">Equipe Completa (Somatória)</option>
                                    <option disabled>──────────</option>
                                    {availableUsers.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 grid grid-cols-1 gap-8">
                        
                        {/* FORM */}
                        <div className={`space-y-6 ${isReadOnly ? 'opacity-90' : ''}`}>
                            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-brand-gray-100">
                                {targetType === 'FIELD' ? <Briefcase className="w-5 h-5 text-blue-600" /> : <Users className="w-5 h-5 text-purple-600" />}
                                <h3 className="font-bold text-brand-gray-900">
                                    {isReadOnly ? `Metas do Time ${targetType}` : `Metas Individuais`}
                                </h3>
                                {isReadOnly && <span className="text-xs bg-brand-gray-100 px-2 py-0.5 rounded text-gray-500 font-normal ml-2">Visualização Agregada</span>}
                            </div>

                            <div className="space-y-4 max-w-3xl">
                                <div className="bg-brand-gray-50 p-4 rounded-xl border border-brand-gray-100">
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1 flex items-center">
                                        TPV Geral (R$) <RuleTip text="Oficinas + Revendas. Não considerar transações canceladas ou Chargebacks." />
                                    </label>
                                    <CurrencyInput 
                                        className="w-full bg-white border border-brand-gray-300 rounded-lg px-3 py-2.5 text-sm font-bold outline-none disabled:bg-gray-100"
                                        placeholder="R$ 0,00"
                                        value={currentGoal.tpv}
                                        disabled={isReadOnly}
                                        onChange={(val) => setCurrentGoal({...currentGoal, tpv: val})}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1 flex items-center">
                                            Novos (Conv.) <RuleTip text="Contabiliza após processar R$500 no mês vigente." />
                                        </label>
                                        <input 
                                            type="number" 
                                            className="w-full border border-brand-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none disabled:bg-gray-100"
                                            value={currentGoal.newSales} 
                                            disabled={isReadOnly}
                                            onChange={e => setCurrentGoal({...currentGoal, newSales: Number(e.target.value)})} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1 flex items-center">
                                            Reativação <RuleTip text="EC com mais de 60 dias sem uso." />
                                        </label>
                                        <input 
                                            type="number" 
                                            className="w-full border border-brand-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none disabled:bg-gray-100" 
                                            value={currentGoal.reactivation} 
                                            disabled={isReadOnly}
                                            onChange={e => setCurrentGoal({...currentGoal, reactivation: Number(e.target.value)})} 
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1 flex items-center">
                                            {targetType === 'FIELD' ? 'Visitas' : 'Agendamentos'} <RuleTip text={targetType === 'FIELD' ? "Visitas realizadas e validadas." : "Agendamentos convertidos para visita."} />
                                        </label>
                                        <input 
                                            type="number" 
                                            className="w-full border border-brand-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none disabled:bg-gray-100" 
                                            value={targetType === 'FIELD' ? currentGoal.visits : currentGoal.appointments} 
                                            disabled={isReadOnly}
                                            onChange={e => targetType === 'FIELD' ? setCurrentGoal({...currentGoal, visits: Number(e.target.value)}) : setCurrentGoal({...currentGoal, appointments: Number(e.target.value)})} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1 flex items-center">
                                            Eficiência (%) {isReadOnly && <span className="text-[9px] ml-1 opacity-70">(Média)</span>} <RuleTip text="Clientes Reparação ≥ R$500 mês / Total Reparação Ativos (D-1)." />
                                        </label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                className="w-full border border-brand-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none pr-8 disabled:bg-gray-100" 
                                                value={currentGoal.efficiency} 
                                                disabled={isReadOnly}
                                                onChange={e => setCurrentGoal({...currentGoal, efficiency: Number(e.target.value)})} 
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {!isReadOnly && (
                        <div className="p-6 bg-brand-gray-50 border-t border-brand-gray-200 flex justify-end">
                            <button 
                                onClick={handleSaveGoal}
                                className="bg-brand-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-brand-dark transition-all flex items-center gap-2"
                            >
                                <Save className="w-5 h-5" /> Salvar Meta Individual
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default EstrategiaPage;
