
import React, { useState, useEffect } from 'react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { ManualDemand } from '../types';
import { appStore } from '../services/store';
import { CheckCircle2, Clock, AlertTriangle, TrendingUp, Calendar, Filter } from 'lucide-react';

// Mock data generation for the chart
const generateChartData = () => {
    return [
        { name: 'Sem 1', Concorrencia: 2.10, Aprovado: 1.85 },
        { name: 'Sem 2', Concorrencia: 1.95, Aprovado: 1.80 },
        { name: 'Sem 3', Concorrencia: 2.30, Aprovado: 1.90 },
        { name: 'Sem 4', Concorrencia: 2.05, Aprovado: 1.75 },
    ];
};

const PricingDashboardPage: React.FC = () => {
    const [demands, setDemands] = useState<ManualDemand[]>([]);
    const [chartData, setChartData] = useState(generateChartData());
    
    // Filters
    const [competitorFilter, setCompetitorFilter] = useState('Todos');

    useEffect(() => {
        const allDemands = appStore.getDemands().filter(d => d.type.includes('Negociação') || d.type.includes('Taxa'));
        setDemands(allDemands);
    }, []);

    const approvedCount = demands.filter(d => d.status === 'Aprovado Pricing' || d.status === 'Concluído').length;
    const pendingCount = demands.filter(d => d.status === 'Em Análise' || d.status === 'Pendente').length;
    const openCount = demands.filter(d => d.status === 'Pendente').length;

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
            <header>
                <h1 className="text-3xl font-bold text-brand-gray-900 tracking-tight">Dashboard de Pricing</h1>
                <p className="text-brand-gray-600 mt-1">Gestão de margens e aprovações.</p>
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
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-brand-gray-900 text-lg flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-brand-primary" />
                            Taxas: Concorrência vs. Aprovado (Débito)
                        </h3>
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-brand-gray-400" />
                            <select 
                                className="bg-brand-gray-50 border border-brand-gray-200 text-sm rounded-lg p-2 outline-none"
                                value={competitorFilter}
                                onChange={(e) => setCompetitorFilter(e.target.value)}
                            >
                                <option value="Todos">Todos</option>
                                <option value="Stone">Stone</option>
                                <option value="Cielo">Cielo</option>
                                <option value="PagSeguro">PagSeguro</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} unit="%" />
                                <Tooltip 
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
                                <span>Gestor</span>
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
