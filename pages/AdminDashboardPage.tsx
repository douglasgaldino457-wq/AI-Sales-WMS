
import React, { useState, useEffect } from 'react';
import { 
    Clock, CheckCircle2, AlertTriangle, FileText, BarChart2, PieChart, Users
} from 'lucide-react';
import { appStore } from '../services/store';
import { ManualDemand, RegistrationRequest } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart as RechartsPie, Pie } from 'recharts';

const AdminDashboardPage: React.FC = () => {
    const [stats, setStats] = useState({
        totalRequests: 0,
        pending: 0,
        approved: 0,
        avgSla: 0,
        byType: [] as {name: string, value: number}[],
        byTeam: [] as {name: string, value: number}[]
    });

    useEffect(() => {
        const demands = appStore.getDemands();
        const registrations = appStore.getRegistrationRequests();
        
        // Combine data for general stats
        const allRequests = [
            ...demands.map(d => ({ 
                type: d.type, 
                status: d.status, 
                date: d.date, 
                requester: d.requester,
                isReg: false
            })),
            ...registrations.map(r => ({
                type: 'Cadastro Novo',
                status: r.status,
                date: r.dateSubmitted,
                requester: r.requesterRole, // Using role as requester grouping for charts
                isReg: true
            }))
        ];

        const total = allRequests.length;
        const pending = allRequests.filter(r => r.status.includes('Pendente') || r.status.includes('PENDING') || r.status.includes('Em Análise')).length;
        const approved = allRequests.filter(r => r.status.includes('Concluído') || r.status.includes('APPROVED')).length;

        // SLA Calculation (Mock logic: if approved, diff between now and creation. Real app would have 'approvedAt')
        // Here we simulate an average SLA of ~24h for approved items
        const avgSla = approved > 0 ? 2.4 : 0; 

        // Type Breakdown
        const typeCounts: Record<string, number> = {};
        allRequests.forEach(r => {
            const t = r.type || 'Outros';
            typeCounts[t] = (typeCounts[t] || 0) + 1;
        });
        const byType = Object.keys(typeCounts).map(k => ({ name: k, value: typeCounts[k] }));

        // Team Breakdown (Simplified)
        const teamCounts: Record<string, number> = {};
        allRequests.forEach(r => {
            const role = r.requester.toLowerCase().includes('field') || r.requester.toLowerCase().includes('freitas') ? 'Field Sales' : 'Inside Sales';
            teamCounts[role] = (teamCounts[role] || 0) + 1;
        });
        const byTeam = Object.keys(teamCounts).map(k => ({ name: k, value: teamCounts[k] }));

        setStats({
            totalRequests: total,
            pending,
            approved,
            avgSla,
            byType,
            byTeam
        });
    }, []);

    const COLORS = ['#F3123C', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <header>
                <h1 className="text-2xl font-bold text-brand-gray-900">Dashboard Gestão Administrativa</h1>
                <p className="text-brand-gray-600">Visão geral da operação de Backoffice e indicadores.</p>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-5 rounded-xl border border-brand-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-brand-gray-400 uppercase tracking-wider">Total Demandas</p>
                        <p className="text-2xl font-bold text-brand-gray-900 mt-1">{stats.totalRequests}</p>
                    </div>
                    <div className="p-3 rounded-full bg-brand-gray-100 text-brand-gray-600"><FileText className="w-6 h-6" /></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-brand-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-brand-gray-400 uppercase tracking-wider">Pendentes</p>
                        <p className="text-2xl font-bold text-orange-600 mt-1">{stats.pending}</p>
                    </div>
                    <div className="p-3 rounded-full bg-orange-100 text-orange-600"><AlertTriangle className="w-6 h-6" /></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-brand-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-brand-gray-400 uppercase tracking-wider">Concluídas</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">{stats.approved}</p>
                    </div>
                    <div className="p-3 rounded-full bg-green-100 text-green-600"><CheckCircle2 className="w-6 h-6" /></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-brand-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-brand-gray-400 uppercase tracking-wider">SLA Médio</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{stats.avgSla}h</p>
                    </div>
                    <div className="p-3 rounded-full bg-blue-100 text-blue-600"><Clock className="w-6 h-6" /></div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Volume by Type */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-gray-100 h-[400px] flex flex-col">
                    <h3 className="font-bold text-brand-gray-900 mb-6 flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-brand-primary" /> Volume por Tipo
                    </h3>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.byType} layout="vertical" margin={{ left: 20, right: 30 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11, fill: '#666'}} />
                                <Tooltip cursor={{fill: 'transparent'}} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                    {stats.byType.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Requests by Team */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-gray-100 h-[400px] flex flex-col">
                    <h3 className="font-bold text-brand-gray-900 mb-6 flex items-center gap-2">
                        <Users className="w-5 h-5 text-brand-primary" /> Solicitações por Time
                    </h3>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsPie width={400} height={400}>
                                <Pie
                                    data={stats.byTeam}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.byTeam.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </RechartsPie>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-4">
                        {stats.byTeam.map((entry, index) => (
                            <div key={entry.name} className="flex items-center gap-2 text-sm text-brand-gray-600">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                {entry.name}: <strong>{entry.value}</strong>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardPage;
