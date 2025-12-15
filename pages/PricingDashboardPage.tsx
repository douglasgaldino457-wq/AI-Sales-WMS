
import React, { useState, useEffect, useMemo } from 'react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { ManualDemand } from '../types';
import { appStore } from '../services/store';
import { CheckCircle2, Clock, AlertTriangle, TrendingUp, Calendar, Filter, Users, Layers, CreditCard } from 'lucide-react';

// Types for filters
type ProductType = 'Full' | 'Simples';

const PricingDashboardPage: React.FC = () => {
    const [demands, setDemands] = useState<ManualDemand[]>([]);
    const [filteredDemands, setFilteredDemands] = useState<ManualDemand[]>([]);
    
    // Global Dashboard Filters
    const [competitorFilter, setCompetitorFilter] = useState('Todos');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [teamFilter, setTeamFilter] = useState('Todos');

    // Chart Specific Filters
    const [chartProduct, setChartProduct] = useState<ProductType>('Full');

    useEffect(() => {
        const allDemands = appStore.getDemands().filter(d => d.type.includes('Negociação') || d.type.includes('Taxa'));
        setDemands(allDemands);
        setFilteredDemands(allDemands);
        
        // Set default date range (last 30 days)
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 30);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    }, []);

    // Apply Global Filters to KPIs
    useEffect(() => {
        let result = demands;

        // Date Filter
        result = result.filter(d => {
            const dDate = d.date.split('T')[0];
            return dDate >= startDate && dDate <= endDate;
        });

        if (teamFilter !== 'Todos') {
             result = result.filter(d => d.requester.includes(teamFilter) || teamFilter === 'Todos');
        }

        setFilteredDemands(result);
    }, [startDate, endDate, teamFilter, demands]);

    // Dynamic Chart Data Generator - RATE CURVE (Installments on X Axis)
    const chartData = useMemo(() => {
        const isSimples = chartProduct === 'Simples';
        
        // Base Rates Setup
        const baseDebit = 0.99;
        const baseSight = 2.89;
        const concDebit = 1.29;
        const concSight = 3.29;

        if (isSimples) {
            // VIEW: SIMPLES (Buckets)
            return [
                { name: 'Débito', Concorrencia: concDebit, Aprovado: 1.49 }, // Higher base for Simples
                { name: '1x', Concorrencia: concSight, Aprovado: 3.49 },
                { name: '2x-6x', Concorrencia: 9.50, Aprovado: 7.90 },
                { name: '7x-12x', Concorrencia: 13.50, Aprovado: 10.90 },
                { name: '13x-18x', Concorrencia: 19.50, Aprovado: 16.90 },
            ];
        } else {
            // VIEW: FULL (Granular 2x to 18x)
            const data = [
                { name: 'Débito', Concorrencia: concDebit, Aprovado: baseDebit },
                { name: '1x', Concorrencia: concSight, Aprovado: baseSight },
            ];

            // Generate 2x to 18x linear curve simulation
            for (let i = 2; i <= 18; i++) {
                // Simulation: Competitor implies ~1.5% per installment, Approved implies ~1.3%
                const concRate = concSight + (i * 1.5);
                const apprvRate = baseSight + (i * 1.3);
                
                data.push({
                    name: `${i}x`,
                    Concorrencia: parseFloat(concRate.toFixed(2)),
                    Aprovado: parseFloat(apprvRate.toFixed(2))
                });
            }
            return data;
        }
    }, [chartProduct]);

    const approvedCount = filteredDemands.filter(d => d.status === 'Aprovado Pricing' || d.status === 'Concluído').length;
    const pendingCount = filteredDemands.filter(d => d.status === 'Em Análise' || d.status === 'Pendente').length;
    const openCount = filteredDemands.filter(d => d.status === 'Pendente').length;

    const KpiCard = ({ title, value, icon: Icon, color }: any) => (
        <div className="bg-white p-5 rounded-xl border border-brand-gray-100 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-bold text-brand-gray-400 uppercase tracking-wider">{title}</p>
                <p className="text-2xl font-bold text-brand-gray-900 mt-1">{value}</p>
            </div>
            <div className={`p-3 rounded-full ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
    );

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <header className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-brand-gray-900 tracking-tight">Dashboard de Pricing</h1>
                    <p className="text-brand-gray-600 mt-1">Gestão de margens e aprovações.</p>
                </div>
                
                {/* Global Filters */}
                <div className="flex flex-wrap gap-3 bg-white p-2 rounded-xl border border-brand-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 px-2">
                        <Calendar className="w-4 h-4 text-brand-gray-400" />
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)}
                            className="text-xs border-none outline-none text-brand-gray-600 font-bold bg-transparent"
                        />
                        <span className="text-brand-gray-300">-</span>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)}
                            className="text-xs border-none outline-none text-brand-gray-600 font-bold bg-transparent"
                        />
                    </div>
                    <div className="w-px h-6 bg-brand-gray-200"></div>
                    <div className="flex items-center gap-2 px-2">
                        <Users className="w-4 h-4 text-brand-gray-400" />
                        <select 
                            className="text-xs font-bold text-brand-gray-600 bg-transparent outline-none"
                            value={teamFilter}
                            onChange={(e) => setTeamFilter(e.target.value)}
                        >
                            <option value="Todos">Todos os Times</option>
                            <option value="Inside">Inside Sales</option>
                            <option value="Field">Field Sales</option>
                        </select>
                    </div>
                </div>
            </header>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard title="Aprovados" value={approvedCount} icon={CheckCircle2} color="bg-green-100 text-green-600" />
                <KpiCard title="Em Análise" value={pendingCount} icon={Clock} color="bg-blue-100 text-blue-600" />
                <KpiCard title="Pendentes" value={openCount} icon={AlertTriangle} color="bg-orange-100 text-orange-600" />
            </div>

            {/* Chart Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-brand-gray-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                            <h3 className="font-bold text-brand-gray-900 text-lg flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-brand-primary" />
                                Curva de Taxas (Rate Curve)
                            </h3>
                            <p className="text-xs text-brand-gray-500 mt-1">Comparativo de taxas por modalidade/parcela.</p>
                        </div>
                        
                        {/* Chart Filters */}
                        <div className="flex flex-wrap gap-2">
                            {/* Product Filter */}
                            <div className="relative">
                                <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                                    <Layers className="w-3 h-3 text-brand-gray-400" />
                                </div>
                                <select 
                                    className="bg-brand-gray-50 border border-brand-gray-200 text-xs font-bold rounded-lg py-2 pl-7 pr-3 outline-none focus:ring-1 focus:ring-brand-primary appearance-none"
                                    value={chartProduct}
                                    onChange={(e) => setChartProduct(e.target.value as ProductType)}
                                >
                                    <option value="Full">Full (Todas Parc.)</option>
                                    <option value="Simples">Simples (Agrupado)</option>
                                </select>
                            </div>

                            {/* Competitor Filter */}
                            <div className="relative">
                                <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                                    <Filter className="w-3 h-3 text-brand-gray-400" />
                                </div>
                                <select 
                                    className="bg-brand-gray-50 border border-brand-gray-200 text-xs font-bold rounded-lg py-2 pl-7 pr-3 outline-none focus:ring-1 focus:ring-brand-primary appearance-none"
                                    value={competitorFilter}
                                    onChange={(e) => setCompetitorFilter(e.target.value)}
                                >
                                    <option value="Todos">Todas Adq.</option>
                                    <option value="Stone">Stone</option>
                                    <option value="Cielo">Cielo</option>
                                    <option value="PagSeguro">PagSeguro</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div style={{ width: '100%', height: '300px', position: 'relative', minWidth: '0' }}>
                        <div className="absolute top-0 right-0 bg-white/80 px-2 py-1 text-[10px] font-bold text-brand-gray-400 border border-brand-gray-100 rounded z-10 pointer-events-none">
                            Visualização: {chartProduct === 'Full' ? 'Parcela a Parcela' : 'Buckets Agrupados'}
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ left: -10 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 10}} dy={10} interval={chartProduct === 'Full' ? 1 : 0} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} unit="%" domain={[0, 'auto']} />
                                <Tooltip 
                                    formatter={(value: number) => [`${value}%`, 'Taxa']}
                                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} 
                                    itemStyle={{fontSize: '12px', fontWeight: 'bold'}}
                                />
                                <Legend wrapperStyle={{paddingTop: '20px'}} />
                                <Line type="monotone" dataKey="Concorrencia" stroke="#6B7280" strokeWidth={3} dot={{r: 4}} name="Média Concorrência" />
                                <Line type="monotone" dataKey="Aprovado" stroke="#F3123C" strokeWidth={3} dot={{r: 4}} name="Nossa Aprovação" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Mini Stats or Recent Activity */}
                <div className="bg-brand-gray-900 text-white p-6 rounded-2xl shadow-lg flex flex-col">
                    <h3 className="font-bold text-lg mb-4">Volume por Time</h3>
                    <div className="flex-1 flex flex-col justify-center space-y-6">
                        <div>
                            <div className="flex justify-between text-sm mb-1 text-gray-300">
                                <span>Field Sales</span>
                                <span>65%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div className="bg-brand-primary h-2 rounded-full" style={{ width: '65%' }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1 text-gray-300">
                                <span>Inside Sales</span>
                                <span>30%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1 text-gray-300">
                                <span>Gestão Comercial</span>
                                <span>5%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '5%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PricingDashboardPage;
