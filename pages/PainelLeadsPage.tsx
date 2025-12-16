
import React, { useState, useEffect, useRef } from 'react';
import { 
    Activity, Search, Car, Wrench, Shield, AlertCircle, Map as MapIcon, List, 
    TrendingUp, MousePointerClick, DollarSign, MapPin, CheckCircle2, X, Clock,
    BarChart2, PieChart as PieIcon, ArrowLeft, Trophy
} from 'lucide-react';
import { appStore } from '../services/store';
import { ClientBaseRow, LeadServiceItem, LeadStats } from '../types';
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
    AreaChart, Area, CartesianGrid, PieChart, Pie, Legend 
} from 'recharts';

// --- MOCK DATA FOR PORTFOLIO OVERVIEW ---
const MOCK_PORTFOLIO_DATA = {
    monthlyTrend: [
        { month: 'Mai', leads: 420, revenue: 18500 },
        { month: 'Jun', leads: 480, revenue: 22400 },
        { month: 'Jul', leads: 510, revenue: 25800 },
        { month: 'Ago', leads: 490, revenue: 24100 },
        { month: 'Set', leads: 560, revenue: 29500 },
        { month: 'Out', leads: 620, revenue: 34200 },
    ],
    serviceDistribution: [
        { name: 'Sinistro (SIN)', value: 45, color: '#F59E0B' },
        { name: 'Guincho (SIR)', value: 30, color: '#3B82F6' },
        { name: 'Manutenção (CAM)', value: 25, color: '#EC4899' },
    ],
    topPerformers: [
        { name: 'Auto Center Paulista', conversion: 82, revenue: 12500 },
        { name: 'Mecânica do Alemão', conversion: 78, revenue: 9800 },
        { name: 'Oficina Premium', conversion: 75, revenue: 8900 },
        { name: 'Centro Automotivo ZS', conversion: 71, revenue: 7500 },
        { name: 'Fast Repair', conversion: 68, revenue: 6200 },
    ]
};

const PortfolioOverview: React.FC = () => {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* KPI ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-brand-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-brand-gray-400 uppercase tracking-wider">Leads Totais (Mês)</p>
                        <p className="text-3xl font-bold text-brand-gray-900 mt-1">620</p>
                        <span className="text-xs text-green-600 font-bold flex items-center mt-1">
                            <TrendingUp size={12} className="mr-1"/> +12% vs mês anterior
                        </span>
                    </div>
                    <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-xl">
                        <MousePointerClick size={24} />
                    </div>
                </div>
                
                <div className="bg-white p-5 rounded-2xl border border-brand-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-brand-gray-400 uppercase tracking-wider">Receita Gerada</p>
                        <p className="text-3xl font-bold text-brand-gray-900 mt-1">R$ 34.2k</p>
                        <span className="text-xs text-green-600 font-bold flex items-center mt-1">
                            <TrendingUp size={12} className="mr-1"/> +15% vs mês anterior
                        </span>
                    </div>
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                        <DollarSign size={24} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-brand-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-brand-gray-400 uppercase tracking-wider">Conversão Média</p>
                        <p className="text-3xl font-bold text-brand-gray-900 mt-1">68.5%</p>
                        <span className="text-xs text-brand-gray-400 font-medium mt-1">
                            Média da carteira
                        </span>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Activity size={24} />
                    </div>
                </div>
            </div>

            {/* CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trend Chart */}
                <div className="bg-white p-6 rounded-2xl border border-brand-gray-100 shadow-sm lg:col-span-2 flex flex-col h-[350px]">
                    <h3 className="font-bold text-brand-gray-900 mb-6 flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-brand-primary" /> Tendência de Receita & Leads
                    </h3>
                    <div className="h-[250px] w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={MOCK_PORTFOLIO_DATA.monthlyTrend}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F3123C" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#F3123C" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7280'}} />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7280'}} tickFormatter={(val) => `R$${val/1000}k`} />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7280'}} />
                                <Tooltip 
                                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                                    labelStyle={{fontWeight: 'bold', color: '#111827'}}
                                />
                                <Legend />
                                <Area yAxisId="left" type="monotone" dataKey="revenue" name="Receita (R$)" stroke="#10B981" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                                <Area yAxisId="right" type="monotone" dataKey="leads" name="Leads (Qtd)" stroke="#F3123C" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Distribution Chart */}
                <div className="bg-white p-6 rounded-2xl border border-brand-gray-100 shadow-sm flex flex-col h-[350px]">
                    <h3 className="font-bold text-brand-gray-900 mb-2 flex items-center gap-2">
                        <PieIcon className="w-5 h-5 text-brand-primary" /> Mix de Serviços
                    </h3>
                    <div className="h-[250px] w-full min-w-0 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={MOCK_PORTFOLIO_DATA.serviceDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {MOCK_PORTFOLIO_DATA.serviceDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center -mt-4">
                            <span className="text-3xl font-bold text-brand-gray-900">100%</span>
                            <span className="block text-[10px] text-brand-gray-400 uppercase">Distribuição</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ranking Table */}
            <div className="bg-white rounded-2xl border border-brand-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-brand-gray-100 bg-brand-gray-50 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <h3 className="font-bold text-brand-gray-900">Top Oficinas (Performance)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-brand-gray-500 uppercase bg-white border-b border-brand-gray-100">
                            <tr>
                                <th className="px-6 py-3">Ranking</th>
                                <th className="px-6 py-3">Estabelecimento</th>
                                <th className="px-6 py-3 text-center">Taxa Conversão</th>
                                <th className="px-6 py-3 text-right">Receita (Mês)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-gray-50">
                            {MOCK_PORTFOLIO_DATA.topPerformers.map((item, idx) => (
                                <tr key={idx} className="hover:bg-brand-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                            idx === 0 ? 'bg-yellow-100 text-yellow-700' : 
                                            idx === 1 ? 'bg-gray-100 text-gray-700' : 
                                            idx === 2 ? 'bg-orange-50 text-orange-700' : 'text-gray-500'
                                        }`}>
                                            {idx + 1}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-brand-gray-900">{item.name}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-block px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-bold">
                                            {item.conversion}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-brand-gray-700">
                                        R$ {item.revenue.toLocaleString('pt-BR')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const PainelLeadsPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState<ClientBaseRow | null>(null);
    const [services, setServices] = useState<LeadServiceItem[]>([]);
    const [stats, setStats] = useState<LeadStats | null>(null);
    const [viewMode, setViewMode] = useState<'STATS' | 'MAP'>('STATS');
    const [nearbyClients, setNearbyClients] = useState<ClientBaseRow[]>([]);

    const [allClients, setAllClients] = useState<ClientBaseRow[]>([]);
    const [suggestions, setSuggestions] = useState<ClientBaseRow[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);

    useEffect(() => {
        setAllClients(appStore.getClients());
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchTerm(val);
        if (val.length > 1) {
            const matched = allClients.filter(c => 
                c.nomeEc.toLowerCase().includes(val.toLowerCase()) || 
                c.id.includes(val)
            ).slice(0, 5);
            setSuggestions(matched);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    const handleSelectClient = (client: ClientBaseRow) => {
        setSelectedClient(client);
        setSearchTerm(client.nomeEc);
        setShowSuggestions(false);
        
        const clientServices = appStore.getLeadServices(client.id);
        setServices(clientServices);

        const totalValue = clientServices.reduce((acc, s) => acc + s.value, 0);
        const breakdown = {
            SIN: clientServices.filter(s => s.flow === 'SIN').length,
            SIR: clientServices.filter(s => s.flow === 'SIR').length,
            CAM: clientServices.filter(s => s.flow === 'CAM').length,
        };
        
        setStats({
            totalServices: clientServices.length,
            totalValue,
            audienceReach: Math.floor(Math.random() * 5000) + 500,
            breakdown
        });

        if (client.latitude && client.longitude) {
            const nearby = allClients.filter(c => 
                c.id !== client.id && 
                c.latitude && c.longitude &&
                Math.abs(c.latitude - client.latitude!) < 0.02 &&
                Math.abs(c.longitude - client.longitude!) < 0.02
            );
            setNearbyClients(nearby);
        }
    };

    const handleClearSelection = () => {
        setSelectedClient(null);
        setSearchTerm('');
        setStats(null);
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Init Map with safety checks
    useEffect(() => {
        if (viewMode === 'MAP' && selectedClient && selectedClient.latitude && selectedClient.longitude) {
            const timer = setTimeout(() => {
                initMap();
            }, 100);
            return () => clearTimeout(timer);
        }
        // Cleanup when switching away from MAP mode
        if (viewMode !== 'MAP' && mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }
    }, [viewMode, selectedClient]);

    const initMap = () => {
        const L = (window as any).L;
        if (!L || !selectedClient?.latitude || !mapContainerRef.current) return;

        const container = mapContainerRef.current as any;
        if (container._leaflet_id) {
            container._leaflet_id = null; // Force clear identifier
        }

        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }

        const map = L.map(mapContainerRef.current).setView([selectedClient.latitude, selectedClient.longitude], 14);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap',
            maxZoom: 19
        }).addTo(map);

        const mainIcon = L.divIcon({
            className: 'main-pin',
            html: `<div class="w-8 h-8 bg-brand-primary rounded-full border-4 border-white shadow-xl flex items-center justify-center text-white relative z-50">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                   </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        L.marker([selectedClient.latitude, selectedClient.longitude], { icon: mainIcon })
         .addTo(map)
         .bindPopup(`<b>${selectedClient.nomeEc}</b><br/>Cliente Selecionado`).openPopup();

        nearbyClients.forEach(c => {
            if (c.latitude && c.longitude) {
                const isPartner = c.hasPagmotors;
                const colorClass = isPartner ? 'bg-green-500' : 'bg-gray-400';
                const zIndex = isPartner ? 40 : 10;
                
                const icon = L.divIcon({
                    className: 'nearby-pin',
                    html: `<div class="w-4 h-4 ${colorClass} rounded-full border-2 border-white shadow-md"></div>`,
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                });

                L.marker([c.latitude, c.longitude], { icon, zIndexOffset: zIndex })
                 .addTo(map)
                 .bindPopup(`
                    <div class="text-xs">
                        <b>${c.nomeEc}</b><br/>
                        ${isPartner ? '<span class="text-green-600 font-bold">★ Parceiro Pagmotors</span>' : '<span class="text-gray-500">Sem Pagmotors</span>'}
                    </div>
                 `);
            }
        });

        mapRef.current = map;
    };

    const chartData = stats ? [
        { name: 'Sinistro (SIN)', value: stats.breakdown.SIN, color: '#F59E0B' },
        { name: 'Guincho (SIR)', value: stats.breakdown.SIR, color: '#3B82F6' },
        { name: 'Leads (CAM)', value: stats.breakdown.CAM, color: '#EC4899' },
    ] : [];

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <Activity className="w-8 h-8 text-brand-primary" />
                        Painel de Leads
                    </h1>
                    <p className="text-brand-gray-600 mt-1">Inteligência de serviços e tráfego por estabelecimento.</p>
                </div>
            </header>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-gray-100 relative z-50">
                <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-2">Buscar Oficina / EC</label>
                <div className="relative" ref={searchRef}>
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gray-400" />
                    <input 
                        type="text" 
                        className="w-full pl-12 pr-4 py-3 border border-brand-gray-300 rounded-xl text-brand-gray-900 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all shadow-inner"
                        placeholder="Digite o Nome da Oficina ou ID para ver detalhes..."
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-brand-gray-200 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
                            {suggestions.map(client => (
                                <div 
                                    key={client.id}
                                    onClick={() => handleSelectClient(client)}
                                    className="px-4 py-3 hover:bg-brand-gray-50 cursor-pointer border-b border-brand-gray-50 last:border-0 transition-colors flex justify-between items-center"
                                >
                                    <div>
                                        <p className="font-bold text-brand-gray-900">{client.nomeEc}</p>
                                        <p className="text-xs text-brand-gray-500">{client.endereco}</p>
                                    </div>
                                    <span className="text-[10px] bg-brand-gray-100 text-brand-gray-600 px-2 py-1 rounded font-mono">
                                        ID: {client.id}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {selectedClient && stats ? (
                <div className="animate-fade-in space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-brand-gray-900 text-white p-6 rounded-2xl shadow-lg">
                        <div>
                            <div className="flex items-center gap-3">
                                <button onClick={handleClearSelection} className="p-1 bg-white/10 rounded hover:bg-white/20 transition-colors">
                                    <ArrowLeft size={16} />
                                </button>
                                <h2 className="text-xl font-bold">{selectedClient.nomeEc}</h2>
                            </div>
                            <p className="text-sm text-brand-gray-400 mt-1 flex items-center gap-2 pl-9">
                                <MapPin className="w-4 h-4" /> {selectedClient.endereco}
                            </p>
                        </div>
                        <div className="mt-4 md:mt-0 flex gap-3">
                            <button 
                                onClick={() => setViewMode('STATS')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${viewMode === 'STATS' ? 'bg-white text-brand-gray-900' : 'bg-white/10 hover:bg-white/20'}`}
                            >
                                <List className="w-4 h-4" /> Resumo
                            </button>
                            <button 
                                onClick={() => setViewMode('MAP')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${viewMode === 'MAP' ? 'bg-white text-brand-gray-900' : 'bg-white/10 hover:bg-white/20'}`}
                            >
                                <MapIcon className="w-4 h-4" /> Mapa de Oportunidade
                            </button>
                        </div>
                    </div>

                    {viewMode === 'STATS' ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white p-5 rounded-2xl border border-brand-gray-100 shadow-sm flex items-center gap-4">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                        <Wrench className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-brand-gray-400 uppercase tracking-wider">Total Serviços</p>
                                        <p className="text-2xl font-bold text-brand-gray-900">{stats.totalServices}</p>
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-brand-gray-100 shadow-sm flex items-center gap-4">
                                    <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                                        <DollarSign className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-brand-gray-400 uppercase tracking-wider">Valor Gerado</p>
                                        <p className="text-2xl font-bold text-brand-gray-900">R$ {stats.totalValue.toLocaleString('pt-BR')}</p>
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-brand-gray-100 shadow-sm flex items-center gap-4">
                                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                                        <MousePointerClick className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-brand-gray-400 uppercase tracking-wider">Audiência (Buscas)</p>
                                        <p className="text-2xl font-bold text-brand-gray-900">{stats.audienceReach.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-2xl border border-brand-gray-100 shadow-sm lg:col-span-1 flex flex-col h-[400px]">
                                    <h3 className="font-bold text-brand-gray-900 mb-4 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-brand-primary" /> Distribuição por Fluxo
                                    </h3>
                                    <div className="h-[250px] w-full min-w-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 30 }}>
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10, fill: '#666'}} axisLine={false} tickLine={false} />
                                                <Tooltip cursor={{fill: 'transparent'}} />
                                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                                    {chartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl border border-brand-gray-100 shadow-sm lg:col-span-2 overflow-hidden flex flex-col">
                                    <div className="p-4 border-b border-brand-gray-100 bg-brand-gray-50 flex justify-between items-center">
                                        <h3 className="font-bold text-brand-gray-900">Histórico de Serviços</h3>
                                        <span className="text-xs text-brand-gray-500">Últimos 60 dias</span>
                                    </div>
                                    <div className="overflow-x-auto flex-1">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-brand-gray-500 uppercase bg-white border-b border-brand-gray-100">
                                                <tr>
                                                    <th className="px-6 py-3">Data</th>
                                                    <th className="px-6 py-3">Fluxo</th>
                                                    <th className="px-6 py-3">Serviço</th>
                                                    <th className="px-6 py-3">Placa</th>
                                                    <th className="px-6 py-3">Status</th>
                                                    <th className="px-6 py-3 text-right">Valor</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-brand-gray-50">
                                                {services.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="px-6 py-8 text-center text-brand-gray-400">
                                                            Nenhum serviço registrado neste período.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    services.map(s => (
                                                        <tr key={s.id} className="hover:bg-brand-gray-50 transition-colors">
                                                            <td className="px-6 py-3 font-mono text-xs text-brand-gray-600">
                                                                {new Date(s.date).toLocaleDateString()}
                                                            </td>
                                                            <td className="px-6 py-3">
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase
                                                                    ${s.flow === 'SIN' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                                                                      s.flow === 'SIR' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                                                                      'bg-pink-50 text-pink-700 border-pink-100'}
                                                                `}>
                                                                    {s.flow}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-3 font-medium text-brand-gray-800">{s.serviceType}</td>
                                                            <td className="px-6 py-3 font-mono text-xs font-bold bg-brand-gray-100 rounded text-center w-fit px-2 py-1 text-brand-gray-700">
                                                                {s.licensePlate}
                                                            </td>
                                                            <td className="px-6 py-3">
                                                                {s.status === 'Realizado' ? (
                                                                    <span className="flex items-center text-green-600 text-xs font-bold gap-1"><CheckCircle2 size={12}/> Realizado</span>
                                                                ) : s.status === 'Agendado' ? (
                                                                    <span className="flex items-center text-blue-600 text-xs font-bold gap-1"><Clock size={12}/> Agendado</span>
                                                                ) : (
                                                                    <span className="flex items-center text-red-500 text-xs font-bold gap-1"><X size={12}/> Cancelado</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-3 text-right font-bold text-brand-gray-900">
                                                                R$ {s.value.toFixed(2)}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-lg border border-brand-gray-200 overflow-hidden h-[500px] relative flex flex-col md:flex-row">
                            <div ref={mapContainerRef} className="flex-1 h-full bg-brand-gray-100 z-0"></div>
                            
                            <div className="w-full md:w-64 bg-white border-l border-brand-gray-200 p-4 overflow-y-auto z-10">
                                <h4 className="font-bold text-sm mb-4 text-brand-gray-900">Oficinas na Região</h4>
                                <div className="space-y-3">
                                    <div className="p-3 bg-brand-primary/5 border border-brand-primary/20 rounded-lg">
                                        <div className="flex items-start gap-2">
                                            <div className="w-3 h-3 bg-brand-primary rounded-full mt-1 shrink-0"></div>
                                            <div>
                                                <p className="text-xs font-bold text-brand-primary">{selectedClient.nomeEc}</p>
                                                <p className="text-[10px] text-brand-gray-500">Selecionada</p>
                                            </div>
                                        </div>
                                    </div>

                                    {nearbyClients.length === 0 ? (
                                        <p className="text-xs text-brand-gray-400 italic">Nenhuma outra oficina detectada num raio de 2km.</p>
                                    ) : (
                                        nearbyClients.map(nc => (
                                            <div key={nc.id} className="p-3 border border-brand-gray-100 rounded-lg hover:bg-brand-gray-50 transition-colors">
                                                <div className="flex items-start gap-2">
                                                    <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${nc.hasPagmotors ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                                    <div>
                                                        <p className="text-xs font-bold text-brand-gray-800">{nc.nomeEc}</p>
                                                        {nc.hasPagmotors ? (
                                                            <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                                                                ★ Parceiro Pagmotors
                                                            </span>
                                                        ) : (
                                                            <p className="text-[10px] text-brand-gray-400">Sem produto ativo</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <PortfolioOverview />
            )}
        </div>
    );
};

export default PainelLeadsPage;
