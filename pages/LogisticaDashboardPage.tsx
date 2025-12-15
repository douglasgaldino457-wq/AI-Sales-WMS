
import React, { useState, useEffect } from 'react';
import { 
    BarChart2, TrendingUp, AlertTriangle, Package, Activity, Smartphone, Server
} from 'lucide-react';
import { appStore } from '../services/store';
import { PosDevice, SupportTicket } from '../types';
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend 
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
    
    // 1. Efficiency Data
    const activePosCount = inventory.filter(p => p.status === 'Active').length;
    const inactivePosCount = inventory.filter(p => p.status === 'Active').length * 0.15; 
    const efficiencyData = [
        { name: 'Em Uso (Transacionando)', value: Math.floor(activePosCount - inactivePosCount), color: '#10B981' },
        { name: 'Sem Uso (>30 dias)', value: Math.floor(inactivePosCount), color: '#F59E0B' },
    ];

    // 2. Stock Data (KPIs only now)
    const stockStatus = {
        InStock: inventory.filter(p => p.status === 'InStock').length,
        WithField: inventory.filter(p => p.status === 'WithField').length,
        Active: inventory.filter(p => p.status === 'Active').length,
        Defective: inventory.filter(p => p.status === 'Defective').length,
        Triage: inventory.filter(p => p.status === 'Triage').length,
    };

    const openTickets = tickets.filter(t => t.status !== 'RESOLVED').length;
    const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED').length;

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            <header className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <Activity className="w-8 h-8 text-brand-primary" />
                        Logística & Ativos
                    </h1>
                    <p className="text-brand-gray-600 mt-1">Gestão de estoque, eficiência da base e movimentações.</p>
                </div>
            </header>

            {/* --- DASHBOARD (KPIs + Charts) --- */}
            <div className="space-y-6 animate-fade-in">
                
                {/* KPI ROW */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-brand-gray-100 shadow-sm">
                        <p className="text-xs font-bold text-gray-400 uppercase">Total Ativos (POS)</p>
                        <p className="text-2xl font-bold text-brand-gray-900 mt-1">{inventory.length}</p>
                        <div className="mt-2 text-xs text-green-600 flex items-center gap-1 font-bold">
                            <TrendingUp size={12} /> +12% vs mês anterior
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-brand-gray-100 shadow-sm">
                        <p className="text-xs font-bold text-gray-400 uppercase">Base Instalada</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{stockStatus.Active}</p>
                        <div className="mt-2 w-full bg-blue-100 rounded-full h-1.5">
                            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${(stockStatus.Active / inventory.length) * 100}%` }}></div>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-brand-gray-100 shadow-sm">
                        <p className="text-xs font-bold text-gray-400 uppercase">Índice de Defeito</p>
                        <p className="text-2xl font-bold text-red-600 mt-1">{((stockStatus.Defective / inventory.length) * 100).toFixed(1)}%</p>
                        <div className="mt-2 text-xs text-red-600 font-bold">
                            {stockStatus.Defective} máquinas paradas
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-brand-gray-100 shadow-sm">
                        <p className="text-xs font-bold text-gray-400 uppercase">Suporte Logística</p>
                        <div className="flex gap-4 mt-1">
                            <div>
                                <span className="text-xl font-bold text-orange-600">{openTickets}</span>
                                <span className="text-[10px] text-gray-500 block uppercase">Abertos</span>
                            </div>
                            <div className="w-px h-8 bg-gray-200"></div>
                            <div>
                                <span className="text-xl font-bold text-green-600">{resolvedTickets}</span>
                                <span className="text-[10px] text-gray-500 block uppercase">Resolvidos</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CHARTS ROW */}
                <div className="grid grid-cols-1 gap-6">
                    {/* EFFICIENCY CHART */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-brand-gray-100 flex flex-col h-[400px]">
                        <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Smartphone className="w-5 h-5 text-brand-primary" /> Eficiência da Base Instalada
                        </h3>
                        <div className="h-[300px] w-full min-w-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={efficiencyData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={110}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {efficiencyData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="middle" align="right" layout="vertical" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-2 p-3 bg-orange-50 border border-orange-100 rounded-lg text-xs text-orange-800 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>
                                <strong>Atenção:</strong> {efficiencyData[1].value} terminais instalados não transacionam há mais de 30 dias. 
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogisticaDashboardPage;
