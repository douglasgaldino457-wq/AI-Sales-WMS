
import React, { useState, useEffect } from 'react';
import { 
    Clock, CheckCircle2, AlertTriangle, FileText, BarChart2, PieChart, Users, 
    ArrowRight, Activity, Truck, ShieldCheck, UserPlus, Package, ChevronRight,
    AlertCircle, Search, ExternalLink, RefreshCw
} from 'lucide-react';
import { appStore } from '../services/store';
import { useAppStore } from '../services/useAppStore';
import { Page } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart as RechartsPie, Pie } from 'recharts';

const AdminDashboardPage: React.FC = () => {
    const { navigate } = useAppStore();
    
    // Stats State
    const [stats, setStats] = useState({
        pendingRegistrations: 0,
        pendingDemands: 0,
        logisticsPending: 0,
        activeUsers: 0,
        totalQueue: 0,
        avgSla: 0
    });

    // Unified Task Queue (Registrations + Demands)
    const [urgentTasks, setUrgentTasks] = useState<any[]>([]);
    
    // Funnel Data
    const [funnelData, setFunnelData] = useState<any[]>([]);

    useEffect(() => {
        refreshDashboard();
        // Auto-refresh periodically
        const interval = setInterval(refreshDashboard, 10000);
        return () => clearInterval(interval);
    }, []);

    const refreshDashboard = () => {
        const demands = appStore.getDemands();
        const registrations = appStore.getRegistrationRequests();
        const logistics = appStore.getLogisticsTasks();
        const users = appStore.getUsers();

        // 1. Calculate Core KPIs
        const pendingRegs = registrations.filter(r => r.status === 'PENDING_ANALYSIS');
        const pendingDems = demands.filter(d => d.status === 'Pendente' || d.status === 'Em Análise');
        const pendingLogs = logistics.filter(l => l.status.includes('PENDING') || l.status === 'READY_FOR_GSURF');
        
        // 2. Build Urgent Task Queue (Unified List)
        // Map Registrations
        const regTasks = pendingRegs.map(r => ({
            id: r.id,
            type: 'Cadastro',
            title: r.clientName,
            subtitle: `Plano ${r.planType}`,
            date: r.dateSubmitted,
            slaHours: getHoursDiff(r.dateSubmitted),
            priority: 'HIGH',
            actionLink: Page.ADMIN_DEMANDS,
            source: 'REG'
        }));

        // Map Demands
        const demTasks = pendingDems.map(d => ({
            id: d.id,
            type: d.type,
            title: d.clientName,
            subtitle: d.requester,
            date: d.date,
            slaHours: getHoursDiff(d.date),
            priority: getHoursDiff(d.date) > 24 ? 'HIGH' : 'MEDIUM',
            actionLink: Page.ADMIN_DEMANDS,
            source: 'DEM'
        }));

        // Sort by Age (Oldest first) & Take Top 5
        const queue = [...regTasks, ...demTasks].sort((a, b) => b.slaHours - a.slaHours).slice(0, 6);

        // 3. Operational Funnel Logic
        const totalStarted = registrations.length;
        const totalApproved = registrations.filter(r => r.status === 'APPROVED').length;
        const totalLogistics = logistics.length;
        const totalActive = logistics.filter(l => l.status === 'COMPLETED').length;

        setFunnelData([
            { name: 'Solicitados', value: totalStarted, fill: '#6B7280' }, // Gray
            { name: 'Aprovados Adm', value: totalApproved, fill: '#3B82F6' }, // Blue
            { name: 'Em Logística', value: totalLogistics, fill: '#F59E0B' }, // Orange
            { name: 'Ativos (Fim)', value: totalActive, fill: '#10B981' }, // Green
        ]);

        setStats({
            pendingRegistrations: pendingRegs.length,
            pendingDemands: pendingDems.length,
            logisticsPending: pendingLogs.length,
            activeUsers: users.filter(u => u.active).length,
            totalQueue: pendingRegs.length + pendingDems.length + pendingLogs.length,
            avgSla: 2.4 // Mocked SLA
        });

        setUrgentTasks(queue);
    };

    const getHoursDiff = (dateStr: string) => {
        const diff = new Date().getTime() - new Date(dateStr).getTime();
        return Math.floor(diff / (1000 * 60 * 60));
    };

    const handleNavigate = (page: Page) => {
        navigate(page);
    };

    // --- RENDER HELPERS ---
    const KpiCard = ({ title, value, icon: Icon, colorClass, linkPage, subtext }: any) => (
        <div 
            onClick={() => linkPage && handleNavigate(linkPage)}
            className={`bg-white p-5 rounded-2xl border border-brand-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden`}
        >
            <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity ${colorClass.text}`}>
                <Icon size={80} />
            </div>
            
            <div className="flex justify-between items-start relative z-10">
                <div>
                    <p className="text-xs font-bold text-brand-gray-400 uppercase tracking-wider mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-brand-gray-900">{value}</h3>
                    {subtext && <p className={`text-xs mt-2 font-medium ${colorClass.text}`}>{subtext}</p>}
                </div>
                <div className={`p-3 rounded-xl ${colorClass.bg} ${colorClass.text}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            
            {linkPage && (
                <div className="mt-4 pt-3 border-t border-brand-gray-50 flex items-center text-xs font-bold text-brand-gray-400 group-hover:text-brand-primary transition-colors">
                    Ver detalhes <ArrowRight className="w-3 h-3 ml-1" />
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
            <header className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <Activity className="w-8 h-8 text-brand-primary" />
                        Centro de Comando
                    </h1>
                    <p className="text-brand-gray-600 mt-1">Visão unificada de Backoffice, Logística e Cadastros.</p>
                </div>
                
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-brand-gray-200 text-xs font-bold text-brand-gray-500 shadow-sm">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Sistema Operacional
                </div>
            </header>

            {/* TOP KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KpiCard 
                    title="Validações Pendentes" 
                    value={stats.pendingRegistrations} 
                    icon={ShieldCheck} 
                    colorClass={{ bg: 'bg-blue-100', text: 'text-blue-600' }}
                    linkPage={Page.ADMIN_DEMANDS}
                    subtext="Novos Cadastros"
                />
                <KpiCard 
                    title="Solicitações Gerais" 
                    value={stats.pendingDemands} 
                    icon={FileText} 
                    colorClass={{ bg: 'bg-orange-100', text: 'text-orange-600' }}
                    linkPage={Page.ADMIN_DEMANDS}
                    subtext="Alterações / Backoffice"
                />
                <KpiCard 
                    title="Fila Logística" 
                    value={stats.logisticsPending} 
                    icon={Truck} 
                    colorClass={{ bg: 'bg-purple-100', text: 'text-purple-600' }}
                    linkPage={Page.LOGISTICA_ATIVACOES}
                    subtext="Envios & Ativações"
                />
                <KpiCard 
                    title="Time Ativo" 
                    value={stats.activeUsers} 
                    icon={Users} 
                    colorClass={{ bg: 'bg-brand-gray-100', text: 'text-brand-gray-600' }}
                    linkPage={Page.USUARIOS}
                    subtext="Consultores & Gestores"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* LEFT: URGENT TASK QUEUE */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Operational Funnel */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-gray-100">
                        <h3 className="font-bold text-brand-gray-900 mb-6 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-brand-primary" />
                            Esteira Operacional (Conversão)
                        </h3>
                        <div className="grid grid-cols-4 gap-4">
                            {funnelData.map((step, idx) => (
                                <div key={idx} className="relative group">
                                    <div className="text-center p-4 rounded-xl bg-brand-gray-50 border border-brand-gray-100 group-hover:border-brand-gray-300 transition-all">
                                        <p className="text-xs font-bold text-brand-gray-400 uppercase tracking-wider mb-1">{step.name}</p>
                                        <p className="text-2xl font-bold text-brand-gray-900" style={{ color: step.fill }}>{step.value}</p>
                                    </div>
                                    {idx < 3 && (
                                        <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 z-10 hidden md:block text-brand-gray-300">
                                            <ChevronRight size={24} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Task Feed */}
                    <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 overflow-hidden flex flex-col min-h-[400px]">
                        <div className="p-5 border-b border-brand-gray-100 bg-brand-gray-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-brand-gray-900 flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                    Fila de Prioridade (SLA)
                                </h3>
                                <p className="text-xs text-brand-gray-500 mt-0.5">Itens mais antigos ou críticos aguardando ação.</p>
                            </div>
                            <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold">
                                {stats.totalQueue} Pendentes
                            </span>
                        </div>

                        <div className="divide-y divide-brand-gray-100 flex-1 overflow-y-auto">
                            {urgentTasks.length === 0 ? (
                                <div className="p-12 text-center text-brand-gray-400 flex flex-col items-center justify-center h-full">
                                    <CheckCircle2 className="w-12 h-12 mb-3 text-green-200" />
                                    <p>Tudo em dia! Nenhuma pendência crítica.</p>
                                </div>
                            ) : (
                                urgentTasks.map((task) => (
                                    <div key={task.id} className="p-4 hover:bg-brand-gray-50 transition-colors flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                                                task.source === 'REG' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                            }`}>
                                                {task.source}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-brand-gray-900">{task.title}</h4>
                                                <div className="flex items-center gap-2 text-xs text-brand-gray-500">
                                                    <span>{task.type}</span>
                                                    <span className="w-1 h-1 bg-brand-gray-300 rounded-full"></span>
                                                    <span>{task.subtitle}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <div className={`text-xs font-bold flex items-center gap-1 ${task.slaHours > 24 ? 'text-red-500' : 'text-yellow-600'}`}>
                                                    <Clock size={12} />
                                                    {task.slaHours}h fila
                                                </div>
                                                <span className="text-[10px] text-brand-gray-400">{new Date(task.date).toLocaleDateString()}</span>
                                            </div>
                                            <button 
                                                onClick={() => handleNavigate(task.actionLink)}
                                                className="px-4 py-2 bg-white border border-brand-gray-200 text-brand-gray-700 rounded-lg text-xs font-bold hover:bg-brand-gray-50 hover:text-brand-primary hover:border-brand-primary transition-all shadow-sm flex items-center gap-2"
                                            >
                                                Resolver <ExternalLink size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-3 bg-brand-gray-50 border-t border-brand-gray-100 text-center">
                            <button onClick={() => handleNavigate(Page.ADMIN_DEMANDS)} className="text-xs font-bold text-brand-primary hover:underline">
                                Ver todas as pendências
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT: QUICK ACTIONS & INFO */}
                <div className="space-y-6">
                    
                    {/* Quick Actions */}
                    <div className="bg-brand-gray-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <h3 className="font-bold text-lg mb-4 relative z-10">Acesso Rápido</h3>
                        <div className="space-y-3 relative z-10">
                            <button 
                                onClick={() => handleNavigate(Page.USUARIOS)}
                                className="w-full bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl p-3 flex items-center gap-3 transition-colors text-left group"
                            >
                                <div className="p-2 bg-brand-primary rounded-lg group-hover:scale-110 transition-transform">
                                    <UserPlus size={16} />
                                </div>
                                <div>
                                    <span className="block text-sm font-bold">Novo Usuário</span>
                                    <span className="block text-[10px] text-gray-400">Criar acesso para equipe</span>
                                </div>
                            </button>

                            <button 
                                onClick={() => handleNavigate(Page.PEDIDOS_RASTREIO)}
                                className="w-full bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl p-3 flex items-center gap-3 transition-colors text-left group"
                            >
                                <div className="p-2 bg-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                                    <RefreshCw size={16} />
                                </div>
                                <div>
                                    <span className="block text-sm font-bold">Solicitação Avulsa</span>
                                    <span className="block text-[10px] text-gray-400">Criar demanda administrativa</span>
                                </div>
                            </button>

                            <button 
                                onClick={() => handleNavigate(Page.LOGISTICA_DASHBOARD)}
                                className="w-full bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl p-3 flex items-center gap-3 transition-colors text-left group"
                            >
                                <div className="p-2 bg-purple-600 rounded-lg group-hover:scale-110 transition-transform">
                                    <Package size={16} />
                                </div>
                                <div>
                                    <span className="block text-sm font-bold">Consultar Estoque</span>
                                    <span className="block text-[10px] text-gray-400">Verificar disponibilidade POS</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* System Status Mini */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-brand-gray-100">
                        <h3 className="font-bold text-brand-gray-900 text-sm uppercase tracking-wide mb-4">Integridade do Sistema</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-brand-gray-600 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> API Portal Gsurf</span>
                                <span className="text-xs font-bold text-green-600">Online</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-brand-gray-600 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Base de Endereços</span>
                                <span className="text-xs font-bold text-green-600">Atualizado</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-brand-gray-600 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Sincronização Mobile</span>
                                <span className="text-xs font-bold text-green-600">100%</span>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-brand-gray-100">
                            <p className="text-[10px] text-brand-gray-400 text-center">
                                Último backup: Hoje às 03:00 AM
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AdminDashboardPage;
