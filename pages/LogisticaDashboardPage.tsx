
import React, { useState, useEffect } from 'react';
import { 
    Truck, BarChart2, TrendingUp, AlertTriangle, CheckCircle2, 
    Calendar, Users, Map, Package, Activity, Smartphone, Search
} from 'lucide-react';
import { appStore } from '../services/store';
import { PosDevice, SupportTicket } from '../types';
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend 
} from 'recharts';
import { InventoryModal } from '../components/InventoryModal';

const LogisticaDashboardPage: React.FC = () => {
    // State
    const [inventory, setInventory] = useState<PosDevice[]>([]);
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    
    // Filters
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [selectedConsultant, setSelectedConsultant] = useState('Todos');
    const [selectedRegion, setSelectedRegion] = useState('Todas');

    // Modal State
    const [selectedDevice, setSelectedDevice] = useState<PosDevice | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setInventory(appStore.getPosInventory());
        // Mock loading tickets
        setTickets(appStore.getSupportTickets()); 
        
        // Default dates
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        setDateRange({ 
            start: firstDay.toISOString().split('T')[0], 
            end: today.toISOString().split('T')[0] 
        });
    }, []);

    // --- AGGREGATION LOGIC ---
    
    // 1. Efficiency: Active vs Inactive (Simulated from Inventory)
    // In a real app, this would come from transaction logs. Here we mock it based on POS status.
    const activePosCount = inventory.filter(p => p.status === 'Active').length;
    const inactivePosCount = inventory.filter(p => p.status === 'Active').length * 0.15; // Mock 15% inactivity
    const efficiencyData = [
        { name: 'Em Uso (Transacionando)', value: Math.floor(activePosCount - inactivePosCount), color: '#10B981' },
        { name: 'Sem Uso (>30 dias)', value: Math.floor(inactivePosCount), color: '#F59E0B' },
    ];

    // 2. Stock Breakdown
    const stockStatus = {
        InStock: inventory.filter(p => p.status === 'InStock').length,
        WithField: inventory.filter(p => p.status === 'WithField').length,
        Active: inventory.filter(p => p.status === 'Active').length,
        Defective: inventory.filter(p => p.status === 'Defective').length,
        Triage: inventory.filter(p => p.status === 'Triage').length,
    };

    const stockChartData = [
        { name: 'Estoque Central', value: stockStatus.InStock, color: '#6366F1' },
        { name: 'Em Campo (Cons.)', value: stockStatus.WithField, color: '#3B82F6' },
        { name: 'Instalado (EC)', value: stockStatus.Active, color: '#10B981' },
        { name: 'Defeito/Troca', value: stockStatus.Defective, color: '#EF4444' },
        { name: 'Triagem', value: stockStatus.Triage, color: '#F59E0B' },
    ];

    // 3. Problem Identification (Tickets)
    const openTickets = tickets.filter(t => t.status !== 'RESOLVED').length;
    const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED').length;

    // Search Logic
    const handleSearch = () => {
        if (!searchTerm) return;
        const device = inventory.find(p => 
            p.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.rcNumber.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (device) {
            setSelectedDevice(device);
        } else {
            alert("Dispositivo não encontrado.");
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            <header className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <Activity className="w-8 h-8 text-brand-primary" />
                        Dashboard Logística & Eficiência
                    </h1>
                    <p className="text-brand-gray-600 mt-1">Monitoramento de ativos, estoque e saúde da base instalada.</p>
                </div>
                
                {/* Search & Filters */}
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Buscar Serial ou RC..." 
                            className="pl-9 pr-3 py-2 text-xs border border-brand-gray-300 rounded-lg focus:ring-1 focus:ring-brand-primary outline-none w-full md:w-48"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400 cursor-pointer" onClick={handleSearch} />
                    </div>

                    <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl border border-brand-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 px-2">
                            <Calendar className="w-4 h-4 text-brand-gray-400" />
                            <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="text-xs font-bold outline-none" />
                            <span className="text-gray-300">-</span>
                            <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="text-xs font-bold outline-none" />
                        </div>
                        <div className="w-px h-6 bg-brand-gray-200"></div>
                        <div className="flex items-center gap-2 px-2">
                            <Users className="w-4 h-4 text-brand-gray-400" />
                            <select className="text-xs font-bold outline-none bg-transparent" value={selectedConsultant} onChange={e => setSelectedConsultant(e.target.value)}>
                                <option value="Todos">Todos Consultores</option>
                                <option value="Cleiton Freitas">Cleiton Freitas</option>
                                <option value="Samuel de Paula">Samuel de Paula</option>
                            </select>
                        </div>
                    </div>
                </div>
            </header>

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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. STOCK BREAKDOWN */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-brand-gray-100 flex flex-col h-[400px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Package className="w-5 h-5 text-brand-primary" /> Distribuição de Estoque
                        </h3>
                        <span className="text-[10px] text-gray-400 italic">Clique na barra para detalhes</span>
                    </div>
                    {/* FIX: Set Explicit Height for ResponsiveContainer Parent */}
                    <div style={{ width: '100%', height: '300px', minWidth: '0' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stockChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{fill: 'transparent'}} />
                                <Bar 
                                    dataKey="value" 
                                    radius={[0, 4, 4, 0]} 
                                    barSize={30}
                                    onClick={(data) => {
                                        // Mock: when clicking a bar, open first item of that type
                                        // In real app, this would filter a list
                                        const typeMap: Record<string, string> = {
                                            'Estoque Central': 'InStock',
                                            'Em Campo (Cons.)': 'WithField',
                                            'Instalado (EC)': 'Active',
                                            'Defeito/Troca': 'Defective',
                                            'Triagem': 'Triage'
                                        };
                                        const status = typeMap[data.name];
                                        const sample = inventory.find(p => p.status === status);
                                        if (sample) setSelectedDevice(sample);
                                    }}
                                    className="cursor-pointer hover:opacity-80"
                                >
                                    {stockChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. EFFICIENCY (USE vs NO USE) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-brand-gray-100 flex flex-col h-[400px]">
                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-brand-primary" /> Eficiência da Base Instalada
                    </h3>
                    {/* FIX: Set Explicit Height for ResponsiveContainer Parent */}
                    <div style={{ width: '100%', height: '300px', minWidth: '0' }}>
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
                            Recomendada ação de <i>Retirada</i> ou <i>Engajamento</i>.
                        </span>
                    </div>
                </div>
            </div>

            {/* Inventory Details Modal */}
            <InventoryModal 
                isOpen={!!selectedDevice} 
                onClose={() => setSelectedDevice(null)} 
                device={selectedDevice} 
            />
        </div>
    );
};

export default LogisticaDashboardPage;
