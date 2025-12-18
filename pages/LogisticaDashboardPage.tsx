
import React, { useState, useEffect } from 'react';
import { 
    TrendingUp, AlertTriangle, Activity, Smartphone, 
    ArrowRight, Box, Truck, UserCheck, RefreshCw, AlertCircle, CheckCircle2,
    CalendarClock, PieChart as PieIcon, BarChart3
} from 'lucide-react';
import { appStore } from '../services/store';
import { PosDevice, SupportTicket } from '../types';
import { 
    PieChart, Pie, Tooltip, ResponsiveContainer, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';

const LogisticaDashboardPage: React.FC = () => {
    const [inventory, setInventory] = useState<PosDevice[]>([]);
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    
    useEffect(() => {
        setInventory(appStore.getPosInventory());
        setTickets(appStore.getSupportTickets()); 
    }, []);

    const journey = {
        stock: inventory.filter(p => p.status === 'InStock').length,
        field: inventory.filter(p => p.status === 'WithField').length,
        active: inventory.filter(p => p.status === 'Active').length,
        reverse: inventory.filter(p => p.status === 'Defective' || p.status === 'Triage').length,
    };

    const efficiencyData = [
        { name: 'Em Uso', value: Math.floor(journey.active * 0.88), color: '#10B981' },
        { name: 'Sem Uso (>30d)', value: Math.ceil(journey.active * 0.12), color: '#F59E0B' },
    ];

    // --- MOCK DATA PARA MOTIVOS DE MANUTENÇÃO (REVERSA) ---
    const maintenanceReasonsData = [
        { reason: 'Defeito Técnico', trocas: 12, desat: 2, total: 14 },
        { reason: 'Faturamento Baixo', trocas: 1, desat: 8, total: 9 },
        { reason: 'Upgrade Modelo', trocas: 15, desat: 0, total: 15 },
        { reason: 'Fechamento EC', trocas: 0, desat: 5, total: 5 },
        { reason: 'Concorrência', trocas: 2, desat: 7, total: 9 },
    ].sort((a,b) => b.total - a.total);

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-20">
            <header className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <Activity className="w-8 h-8 text-brand-primary" />
                        Logística & Jornada
                    </h1>
                    <p className="text-brand-gray-600 mt-1">Monitoramento do ciclo de vida dos ativos e reversas.</p>
                </div>
            </header>

            {/* JORNADA DO ATIVO */}
            <section className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 overflow-hidden">
                <div className="p-6 border-b border-brand-gray-50 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-brand-gray-900 flex items-center gap-2"><RefreshCw className="w-5 h-5 text-brand-primary" /> Jornada do Equipamento</h3>
                </div>
                <div className="p-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative">
                        <div className="hidden md:block absolute top-1/2 left-10 right-10 h-1 bg-gray-100 -z-0 -translate-y-1/2"></div>
                        <div className="relative z-10 flex flex-col items-center bg-white p-4 rounded-xl border border-blue-100 shadow-sm min-w-[160px]">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-2"><Box className="w-6 h-6" /></div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Estoque Central</p>
                            <p className="text-3xl font-bold text-brand-gray-900">{journey.stock}</p>
                        </div>
                        <div className="relative z-10 flex flex-col items-center bg-white p-4 rounded-xl border border-purple-100 shadow-sm min-w-[160px]">
                            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mb-2"><Truck className="w-6 h-6" /></div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Em Field / Rota</p>
                            <p className="text-3xl font-bold text-brand-gray-900">{journey.field}</p>
                        </div>
                        <div className="relative z-10 flex flex-col items-center bg-white p-4 rounded-xl border border-green-100 shadow-sm min-w-[160px]">
                            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-2"><UserCheck className="w-6 h-6" /></div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Instalado</p>
                            <p className="text-3xl font-bold text-brand-gray-900">{journey.active}</p>
                        </div>
                        <div className="relative z-10 flex flex-col items-center bg-white p-4 rounded-xl border border-red-100 shadow-sm min-w-[160px]">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-2"><RefreshCw className="w-6 h-6" /></div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Triagem / Reversa</p>
                            <p className="text-3xl font-bold text-brand-gray-900">{journey.reverse}</p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* NOVO: ANALISE DE MOTIVOS DE TROCAS E DESATIVACOES */}
                <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 overflow-hidden flex flex-col h-[450px]">
                    <div className="p-5 border-b border-brand-gray-50 flex items-center justify-between">
                        <h3 className="font-bold text-brand-gray-900 flex items-center gap-2"><BarChart3 size={18} className="text-orange-500" /> Análise de Manutenção (Mensal)</h3>
                    </div>
                    <div className="flex-1 p-6 w-full min-w-0 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={maintenanceReasonsData} layout="vertical" margin={{ left: 40, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="reason" type="category" tick={{fontSize: 10, fill: '#666', fontWeight: 'bold'}} axisLine={false} tickLine={false} width={100} />
                                <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                                <Legend wrapperStyle={{paddingTop: '20px', fontSize: '10px'}} />
                                <Bar dataKey="trocas" name="Trocas" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} barSize={20} />
                                <Bar dataKey="desat" name="Desativações" stackId="a" fill="#F3123C" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="p-4 bg-orange-50 border-t border-orange-100">
                        <p className="text-[10px] text-orange-700 font-bold flex items-center gap-1 uppercase"><AlertCircle size={12}/> Insight: <strong>Upgrade de Modelo</strong> é a maior causa de movimentação este mês.</p>
                    </div>
                </div>

                {/* EFICIÊNCIA DA BASE */}
                <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 overflow-hidden flex flex-col h-[450px]">
                    <div className="p-5 border-b border-brand-gray-50 flex items-center justify-between">
                        <h3 className="font-bold text-brand-gray-900 flex items-center gap-2"><Smartphone size={18} className="text-brand-primary" /> Eficiência de Terminais</h3>
                    </div>
                    <div className="flex-1 p-6 flex items-center justify-center relative min-h-0">
                        <div className="h-64 w-64 relative min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={efficiencyData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {efficiencyData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center -mt-2">
                                <span className="text-3xl font-bold text-brand-gray-900">{journey.active}</span>
                                <span className="block text-[10px] text-gray-400 uppercase font-black">Base Instalada</span>
                            </div>
                        </div>
                        <div className="ml-8 space-y-4">
                            {efficiencyData.map((item) => (
                                <div key={item.name} className="flex flex-col">
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: item.color}}></div>
                                        {item.name}
                                    </div>
                                    <div className="text-lg font-bold text-brand-gray-900 pl-4">{item.value} <span className="text-[10px] text-gray-400 font-normal">Equip.</span></div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-4 bg-brand-gray-50 border-t border-brand-gray-100">
                        <p className="text-[10px] text-brand-gray-500 leading-tight">Taxa de ociosidade está em <strong>12%</strong>. Recomendamos ação de recolhimento para terminais sem transações há mais de 30 dias.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogisticaDashboardPage;
