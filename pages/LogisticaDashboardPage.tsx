
import React, { useState, useEffect } from 'react';
import { 
    TrendingUp, AlertTriangle, Activity, Smartphone, 
    ArrowRight, Box, Truck, UserCheck, RefreshCw, AlertCircle, CheckCircle2,
    CalendarClock
} from 'lucide-react';
import { appStore } from '../services/store';
import { PosDevice, SupportTicket } from '../types';
import { 
    PieChart, Pie, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const LogisticaDashboardPage: React.FC = () => {
    // State
    const [inventory, setInventory] = useState<PosDevice[]>([]);
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    
    useEffect(() => {
        setInventory(appStore.getPosInventory());
        setTickets(appStore.getSupportTickets()); 
    }, []);

    // --- LOGIC ---
    
    // 1. Journey Metrics
    const journey = {
        stock: inventory.filter(p => p.status === 'InStock').length,
        field: inventory.filter(p => p.status === 'WithField').length,
        active: inventory.filter(p => p.status === 'Active').length,
        reverse: inventory.filter(p => p.status === 'Defective' || p.status === 'Triage').length,
    };

    // 2. Efficiency Data
    const activePosCount = journey.active;
    const inactivePosCount = Math.floor(activePosCount * 0.12); // Mock 12% inactive
    const efficiencyData = [
        { name: 'Em Uso (Transacionando)', value: activePosCount - inactivePosCount, color: '#10B981' },
        { name: 'Sem Uso (>30 dias)', value: inactivePosCount, color: '#F59E0B' },
    ];

    // 3. Alerts Generation
    const alerts = [];
    if (journey.stock < 10) alerts.push({ level: 'HIGH', msg: 'Estoque Central Crítico (P2 Smart)', detail: `Apenas ${journey.stock} unidades disponíveis.` });
    if (journey.reverse > 5) alerts.push({ level: 'MED', msg: 'Fila de Triagem Acumulada', detail: `${journey.reverse} equipamentos aguardando análise.` });
    if (inactivePosCount > 5) alerts.push({ level: 'LOW', msg: 'Base Inativa Elevada', detail: `${inactivePosCount} máquinas sem transacionar.` });

    // 4. Ticket Stats
    const openTickets = tickets.filter(t => t.status !== 'RESOLVED').length;
    const slaBreached = tickets.filter(t => t.status !== 'RESOLVED' && new Date(t.createdAt).getTime() < Date.now() - 86400000).length; // Older than 24h

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-20">
            <header className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <Activity className="w-8 h-8 text-brand-primary" />
                        Logística & Jornada
                    </h1>
                    <p className="text-brand-gray-600 mt-1">Monitoramento do ciclo de vida dos ativos e alertas operacionais.</p>
                </div>
            </header>

            {/* --- JORNADA DO ATIVO (LIFECYCLE FLOW) --- */}
            <section className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 overflow-hidden">
                <div className="p-6 border-b border-brand-gray-100 bg-brand-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-brand-gray-900 flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-brand-primary" /> Jornada do Equipamento
                    </h3>
                    <span className="text-xs font-bold text-brand-gray-500 uppercase tracking-wider">Ciclo Completo</span>
                </div>
                
                <div className="p-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-1/2 left-10 right-10 h-1 bg-gray-100 -z-0 -translate-y-1/2"></div>

                        {/* Step 1: Stock */}
                        <div className="relative z-10 flex flex-col items-center bg-white p-4 rounded-xl border border-blue-100 shadow-sm min-w-[160px]">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-3 shadow-inner">
                                <Box className="w-6 h-6" />
                            </div>
                            <p className="text-xs font-bold text-brand-gray-400 uppercase">Estoque Central</p>
                            <p className="text-3xl font-bold text-brand-gray-900 mt-1">{journey.stock}</p>
                            <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded mt-2">Disponível</span>
                        </div>

                        <ArrowRight className="text-gray-300 w-6 h-6 hidden md:block" />

                        {/* Step 2: Transit/Field */}
                        <div className="relative z-10 flex flex-col items-center bg-white p-4 rounded-xl border border-purple-100 shadow-sm min-w-[160px]">
                            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mb-3 shadow-inner">
                                <Truck className="w-6 h-6" />
                            </div>
                            <p className="text-xs font-bold text-brand-gray-400 uppercase">Em Rota / Field</p>
                            <p className="text-3xl font-bold text-brand-gray-900 mt-1">{journey.field}</p>
                            <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded mt-2">Logística</span>
                        </div>

                        <ArrowRight className="text-gray-300 w-6 h-6 hidden md:block" />

                        {/* Step 3: Active */}
                        <div className="relative z-10 flex flex-col items-center bg-white p-4 rounded-xl border border-green-100 shadow-sm min-w-[160px]">
                            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-3 shadow-inner">
                                <UserCheck className="w-6 h-6" />
                            </div>
                            <p className="text-xs font-bold text-brand-gray-400 uppercase">Instalado (EC)</p>
                            <p className="text-3xl font-bold text-brand-gray-900 mt-1">{journey.active}</p>
                            <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded mt-2">Base Ativa</span>
                        </div>

                        <div className="hidden md:flex absolute top-1/2 right-40 w-24 h-24 border-t-2 border-r-2 border-gray-200 rounded-tr-3xl -z-10 transform -translate-y-1/2 rotate-45"></div>

                        {/* Step 4: Reverse */}
                        <div className="relative z-10 flex flex-col items-center bg-white p-4 rounded-xl border border-red-100 shadow-sm min-w-[160px]">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-3 shadow-inner">
                                <RefreshCw className="w-6 h-6" />
                            </div>
                            <p className="text-xs font-bold text-brand-gray-400 uppercase">Logística Reversa</p>
                            <p className="text-3xl font-bold text-brand-gray-900 mt-1">{journey.reverse}</p>
                            <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded mt-2">Triagem / Defeito</span>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* --- ALERTS & NOTIFICATIONS --- */}
                <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 overflow-hidden lg:col-span-1 flex flex-col">
                    <div className="p-5 border-b border-brand-gray-100 bg-white flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-orange-500" />
                        <h3 className="font-bold text-brand-gray-900">Painel de Alertas</h3>
                    </div>
                    <div className="flex-1 p-4 space-y-3 bg-brand-gray-50/50">
                        {alerts.length === 0 ? (
                            <div className="text-center py-8 text-brand-gray-400 text-sm">
                                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-200" />
                                Operação Saudável. Sem alertas.
                            </div>
                        ) : (
                            alerts.map((alert, idx) => (
                                <div key={idx} className={`p-4 rounded-xl border-l-4 shadow-sm bg-white ${
                                    alert.level === 'HIGH' ? 'border-l-red-500' : 
                                    alert.level === 'MED' ? 'border-l-orange-500' : 'border-l-blue-500'
                                }`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-sm text-brand-gray-800">{alert.msg}</h4>
                                        {alert.level === 'HIGH' && <AlertTriangle size={14} className="text-red-500 animate-pulse" />}
                                    </div>
                                    <p className="text-xs text-brand-gray-500">{alert.detail}</p>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-4 border-t border-brand-gray-100 bg-white">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-brand-gray-500">SLA Médio de Atendimento</span>
                            <span className="font-mono font-bold text-brand-gray-900">2.4 horas</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                    </div>
                </div>

                {/* --- EFFICIENCY CHART --- */}
                <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 overflow-hidden lg:col-span-2 flex flex-col">
                    <div className="p-5 border-b border-brand-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-brand-gray-900 flex items-center gap-2">
                            <Smartphone className="w-5 h-5 text-brand-primary" /> Eficiência da Base
                        </h3>
                        <div className="flex gap-2">
                            <div className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-bold border border-green-100">
                                {((activePosCount / (activePosCount + inactivePosCount || 1)) * 100).toFixed(0)}% Ativos
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 p-6 flex flex-col md:flex-row items-center gap-8">
                        <div className="h-64 w-64 relative shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={efficiencyData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {efficiencyData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                                <span className="text-2xl font-bold text-brand-gray-900">{journey.active}</span>
                                <span className="block text-[10px] text-brand-gray-400 uppercase">Total Base</span>
                            </div>
                        </div>

                        <div className="flex-1 space-y-6 w-full">
                            <div>
                                <h4 className="text-sm font-bold text-brand-gray-700 mb-3">Insights de Performance</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-xs">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <span className="flex-1 text-brand-gray-600">Terminais Transacionando (Últimos 30 dias)</span>
                                        <span className="font-bold text-brand-gray-900">{efficiencyData[0].value}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                        <span className="flex-1 text-brand-gray-600">Base Inativa (Sem tx > 30 dias)</span>
                                        <span className="font-bold text-brand-gray-900">{efficiencyData[1].value}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-brand-gray-50 p-4 rounded-xl border border-brand-gray-100 flex items-start gap-3">
                                <CalendarClock className="w-5 h-5 text-blue-500 shrink-0" />
                                <div>
                                    <p className="text-xs font-bold text-brand-gray-800">Ação Recomendada</p>
                                    <p className="text-[10px] text-brand-gray-500 mt-1 leading-relaxed">
                                        {efficiencyData[1].value} terminais estão ociosos. Recomendamos gerar uma lista de recolhimento para a equipe de Field Sales visando otimização de custos.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogisticaDashboardPage;
