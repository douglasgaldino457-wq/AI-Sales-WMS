
import React, { useState, useEffect, useMemo } from 'react';
import { UserRole, Appointment, SystemUser, Page, ExpenseReport, Expense } from '../types';
import { 
  PieChart, Pie, Cell, Legend, Tooltip, TooltipProps, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import { getDashboardInsights } from '../services/geminiService';
import { appStore } from '../services/store';
import { useAppStore } from '../services/useAppStore'; 
import { 
    Sparkles, TrendingUp, CalendarCheck, CheckCircle2, Clock, 
    Briefcase, UserPlus, FileText, MapPin, Layout, Search, Filter, ArrowUpDown,
    ChevronLeft, ChevronRight, Check, Calendar, Users, Target, Phone, X, Eye, ArrowRight,
    BarChart2, Lightbulb, AlertTriangle, DollarSign, CreditCard, Wallet, FileCheck,
    PieChart as PieIcon,
    ShieldCheck,
    Truck,
    Package,
    Activity
} from 'lucide-react';

interface DashboardProps {
  role: UserRole;
  onNavigate?: (page: Page) => void;
}

const COLORS = ['#F3123C', '#2E2D37', '#FF3A64', '#696977', '#AEAEBA'];
const FINANCE_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#6B7280'];

type SortConfig = { key: keyof Appointment | 'clientName'; direction: 'asc' | 'desc' };

// Gestor Types
type TeamView = 'ALL' | 'FIELD' | 'INSIDE';

interface ConsultantStats {
  name: string;
  totalAppointments: number;
  completed: number;
  converted: number;
  conversionRate: number;
  pending: number;
  type: UserRole;
}

const Dashboard: React.FC<DashboardProps> = ({ role, onNavigate }) => {
  const { currentUser, navigate } = useAppStore(); // Get Current User Name and navigation
  
  const [insight, setInsight] = useState<string>('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [isInsightModalOpen, setIsInsightModalOpen] = useState(false);
  const [planExecuted, setPlanExecuted] = useState(false);
  
  // Real-time data state
  const [appointments, setAppointments] = useState(appStore.getAppointments());
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]); // Dynamic Users
  
  // Financeiro Data State
  const [expenseReports, setExpenseReports] = useState<ExpenseReport[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // --- GESTOR STATE ---
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'YYYY-MM' or 'all'
  const [teamView, setTeamView] = useState<TeamView>('ALL');
  
  // SLA / Journey Data (Gestor)
  const [journeyStats, setJourneyStats] = useState({
      commercialPending: 0,
      pricingPending: 0,
      backofficePending: 0,
      logisticsPending: 0
  });
  
  // Filter States for Inside Sales (Legacy Logic preserved)
  const [cardFilter, setCardFilter] = useState<'ALL' | 'COMPLETED' | 'SCHEDULED' | 'CONVERTED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Field Sales Specific State
  const [detailedMetricView, setDetailedMetricView] = useState<'ALL' | 'COMPLETED' | 'SCHEDULED' | 'CONVERTED' | null>('ALL');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    // Refresh data on mount
    setAppointments(appStore.getAppointments());
    setSystemUsers(appStore.getUsers());
    
    // Finance Data
    setExpenseReports(appStore.getExpenseReports());
    setExpenses(appStore.getExpenses());

    // Journey Data Calculation (For Gestor)
    if (role === UserRole.GESTOR || role === UserRole.ADMIN) {
        const allDemands = appStore.getDemands();
        const allRegs = appStore.getRegistrationRequests();
        const allLogistics = appStore.getLogisticsTasks();

        setJourneyStats({
            // Commercial: Drafts + Pendente (not picked by pricing yet)
            commercialPending: allDemands.filter(d => d.status === 'Pendente').length,
            // Pricing: Em Análise and Type is Negotiation/Rate
            pricingPending: allDemands.filter(d => d.status === 'Em Análise' && (d.type.includes('Taxa') || d.type.includes('Negociação'))).length,
            // Backoffice: Registration PENDING_ANALYSIS or Demand 'Pendente ADM'
            backofficePending: allRegs.filter(r => r.status === 'PENDING_ANALYSIS').length + allDemands.filter(d => d.adminStatus === 'Pendente ADM').length,
            // Logistics: Pending Shipment
            logisticsPending: allLogistics.filter(l => l.status === 'PENDING_SHIPMENT').length
        });
    }
  }, [role]);

  // ... (Data processing logic remains identical to preserve functionality)
  const getAvailableMonths = () => {
     const months = new Set<string>();
     appointments.forEach(a => {
        if (a.date) {
           months.add(a.date.substring(0, 7)); 
        }
     });
     return Array.from(months).sort().reverse();
  };

  const getFilteredAppointmentsForGestor = () => {
     let filtered = appointments;
     if (selectedMonth !== 'all') {
        filtered = filtered.filter(a => a.date && a.date.startsWith(selectedMonth));
     }
     return filtered;
  };

  const calculateConsultantStats = (): ConsultantStats[] => {
      const filteredData = getFilteredAppointmentsForGestor();
      
      const usersToAnalyze = systemUsers.filter(u => {
          if (teamView === 'FIELD') return u.role === UserRole.FIELD_SALES;
          if (teamView === 'INSIDE') return u.role === UserRole.INSIDE_SALES;
          return u.role === UserRole.FIELD_SALES || u.role === UserRole.INSIDE_SALES;
      });

      return usersToAnalyze.map(user => {
          let userAppts: Appointment[] = [];
          if (user.role === UserRole.FIELD_SALES) {
             userAppts = filteredData.filter(a => a.fieldSalesName === user.name);
          } else if (user.role === UserRole.INSIDE_SALES) {
             userAppts = filteredData.filter(a => a.insideSalesName === user.name);
          }

          const total = userAppts.length;
          const completed = userAppts.filter(a => a.status === 'Completed').length;
          const converted = userAppts.filter(a => a.visitReport?.outcome === 'Convertido').length;
          const pending = userAppts.filter(a => a.status === 'Scheduled').length;
          const conversionRate = total > 0 ? (converted / total) * 100 : 0;

          return {
              name: user.name,
              type: user.role,
              totalAppointments: total,
              completed,
              converted,
              conversionRate,
              pending
          };
      }).sort((a, b) => b.converted - a.converted); 
  };

  useEffect(() => {
    const fetchInsight = async () => {
      setLoadingAI(true);
      let summary = '';
      
      if (role === UserRole.FINANCEIRO) {
          const pendingValue = expenseReports.filter(r => r.status === 'APPROVED_GESTOR').reduce((acc, r) => acc + r.totalReimbursable, 0);
          const topCategory = expenses.reduce((acc, curr) => {
              acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
              return acc;
          }, {} as Record<string, number>);
          const topCatName = Object.keys(topCategory).sort((a,b) => topCategory[b] - topCategory[a])[0];
          
          summary = `Financeiro: Valor Pendente Aprovação: R$${pendingValue.toFixed(2)}. Maior categoria de gasto: ${topCatName}. Sugira otimizações de fluxo de caixa.`;
      
      } else if (role === UserRole.GESTOR) {
         const stats = calculateConsultantStats();
         const totalConv = stats.reduce((acc, s) => acc + s.converted, 0);
         const lowPerformers = stats.filter(s => s.totalAppointments > 5 && s.conversionRate < 10).map(s => `${s.name}`).join(', ');
         summary = `Total Conversões: ${totalConv}. Topo: ${stats.slice(0,2).map(s => s.name).join(', ')}. Atenção: ${lowPerformers}.`;
      } else {
         const myName = currentUser?.name || (role === UserRole.FIELD_SALES ? 'Cleiton Freitas' : 'Cauana Sousa');
         const myAppts = appointments.filter(a => role === UserRole.FIELD_SALES ? a.fieldSalesName === myName : a.insideSalesName === myName);
         const inNegotiation = myAppts.filter(a => a.visitReport?.outcome === 'Em negociação');
         const today = new Date().toISOString().split('T')[0];
         const overdue = myAppts.filter(a => a.status === 'Scheduled' && a.date && a.date <= today);
         summary = `Negociações: ${inNegotiation.length}. Atrasados: ${overdue.length}.`;
      }
      
      const result = await getDashboardInsights(role, summary);
      setInsight(result);
      setLoadingAI(false);
    };
    
    // Trigger condition
    if ((role === UserRole.FINANCEIRO && expenses.length > 0) || (role !== UserRole.FINANCEIRO && appointments.length > 0)) {
        fetchInsight();
    }
  }, [role, appointments, selectedMonth, teamView, systemUsers, currentUser, expenses, expenseReports]);

  const handleExecutePlan = () => {
      setPlanExecuted(true);
      setTimeout(() => {
          alert("Plano tático adicionado à sua agenda e lembretes!");
          setIsInsightModalOpen(false);
          setPlanExecuted(false);
      }, 1500);
  };

  // --- VISUAL COMPONENTS ---

  const InsightBanner = () => (
      <div 
        onClick={() => setIsInsightModalOpen(true)}
        className="w-full bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-1 shadow-lg cursor-pointer hover:shadow-glow transition-all mb-8 group border border-white/5"
      >
         <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-brand-primary" />
                    </div>
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-light opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-primary"></span>
                    </span>
                </div>
                <div>
                    <h3 className="text-white font-bold text-sm tracking-wide uppercase flex items-center gap-2">
                        AI Financial Analyst
                        <span className="bg-brand-primary text-[9px] px-1.5 py-0.5 rounded text-white font-bold">BETA</span>
                    </h3>
                    <p className="text-gray-400 text-xs mt-0.5 group-hover:text-gray-200 transition-colors">
                        {loadingAI ? 'Processando dados financeiros...' : 'Análise de custos e fluxo de caixa disponível.'}
                    </p>
                </div>
            </div>
            <div className="bg-white/10 p-2 rounded-full group-hover:bg-white/20 transition-colors">
                <ChevronRight className="w-5 h-5 text-white" />
            </div>
         </div>
      </div>
  );

  const InsightModal = () => (
     isInsightModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] border border-white/20">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 text-white shrink-0 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                 <div className="flex justify-between items-start relative z-10">
                     <div className="flex items-center gap-4">
                        <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/10">
                           <Lightbulb className="w-6 h-6 text-yellow-400" />
                        </div>
                        <div>
                           <h3 className="font-bold text-xl tracking-tight">Insights Financeiros IA</h3>
                           <p className="text-gray-400 text-sm">Análise em tempo real</p>
                        </div>
                     </div>
                     <button onClick={() => setIsInsightModalOpen(false)} className="text-white/60 hover:text-white transition-colors bg-white/5 p-2 rounded-full">
                        <X size={20} />
                     </button>
                 </div>
              </div>
              
              <div className="p-8 overflow-y-auto bg-gray-50 flex-1">
                  {loadingAI ? (
                     <div className="space-y-4">
                        <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                     </div>
                  ) : (
                     <div className="prose prose-sm max-w-none text-gray-700">
                        <div className="space-y-4 whitespace-pre-line leading-relaxed font-medium">
                            {insight}
                        </div>
                     </div>
                  )}
              </div>
              
              <div className="p-6 bg-white border-t border-gray-100 flex justify-end">
                  <button 
                     onClick={handleExecutePlan}
                     disabled={loadingAI || planExecuted}
                     className="px-8 py-3 bg-brand-gray-900 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                  >
                     {planExecuted ? <CheckCircle2 className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                     {planExecuted ? 'Ação Registrada!' : 'Executar Ação'}
                  </button>
              </div>
           </div>
        </div>
     )
  );

  const KpiCard = ({ title, value, subtext, icon: Icon, colorClass, onClick, active }: any) => (
    <div 
        onClick={onClick}
        className={`bg-white p-4 rounded-xl cursor-pointer transition-all duration-200 border shadow-sm hover:shadow-md relative overflow-hidden group
            ${active ? 'border-brand-primary/50 ring-1 ring-brand-primary/20 scale-[1.02]' : 'border-gray-100 hover:border-gray-200'}
        `}
    >
        <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg shrink-0 ${colorClass} bg-opacity-10 flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${colorClass.replace('bg-', 'text-')}`} strokeWidth={2.5} />
            </div>
            
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">{title}</p>
                <div className="flex items-baseline gap-1.5">
                    <h3 className="text-xl font-bold text-gray-900 leading-none">{value}</h3>
                    {subtext && <p className="text-[10px] text-gray-500 font-medium truncate opacity-80">{subtext}</p>}
                </div>
            </div>
            
            {active && <div className="w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0 animate-pulse self-center"></div>}
        </div>
    </div>
  );

  // --- JOURNEY STAGE CARD (GESTOR) ---
  const JourneyStage = ({ title, count, sla, icon: Icon, colorClass, isLast }: any) => (
      <div className="flex items-center flex-1">
          <div className="relative flex-1 bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center group hover:border-brand-primary/30 transition-all">
              <div className={`p-2 rounded-lg ${colorClass.bg} ${colorClass.text} mb-2`}>
                  <Icon size={20} />
              </div>
              <h4 className="text-xs font-bold text-gray-500 uppercase">{title}</h4>
              <div className="mt-1">
                  <span className={`text-2xl font-bold ${count > 5 ? 'text-red-500' : 'text-gray-900'}`}>{count}</span>
                  <span className="text-[10px] text-gray-400 block">Itens</span>
              </div>
              <div className="mt-2 text-[10px] font-mono bg-gray-50 px-2 py-0.5 rounded text-gray-500">
                  ~{sla}
              </div>
              
              {/* Traffic Light */}
              <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${count > 5 ? 'bg-red-500 animate-pulse' : count > 2 ? 'bg-yellow-400' : 'bg-green-500'}`}></div>
          </div>
          {!isLast && (
              <div className="px-2 text-gray-300">
                  <ArrowRight size={20} />
              </div>
          )}
      </div>
  );

  // --- FINANCEIRO DASHBOARD ---
  if (role === UserRole.FINANCEIRO) {
      // 1. Calculate KPIs
      const pendingApprovalReports = expenseReports.filter(r => r.status === 'APPROVED_GESTOR');
      const pendingPaymentValue = pendingApprovalReports.reduce((acc, r) => acc + r.totalReimbursable, 0);
      const paidThisMonth = expenseReports
          .filter(r => r.status === 'APPROVED_FINANCEIRO' && new Date(r.createdDate).getMonth() === new Date().getMonth())
          .reduce((acc, r) => acc + r.totalReimbursable, 0);
      
      // 2. Expenses Category Data for Chart
      const categoryData = expenses.reduce((acc, curr) => {
          const cat = curr.category;
          acc[cat] = (acc[cat] || 0) + curr.amount;
          return acc;
      }, {} as Record<string, number>);
      
      const pieData = Object.keys(categoryData).map((key, idx) => ({
          name: key,
          value: categoryData[key],
          color: FINANCE_COLORS[idx % FINANCE_COLORS.length]
      })).sort((a,b) => b.value - a.value);

      // 3. Monthly Trend (Mocked + Real mix)
      const trendData = [
          { name: 'Jan', valor: 4500 }, { name: 'Fev', valor: 5200 }, { name: 'Mar', valor: 4800 },
          { name: 'Abr', valor: 6100 }, { name: 'Mai', valor: 5900 }, { name: 'Jun', valor: paidThisMonth + pendingPaymentValue }
      ];

      return (
          <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
              <InsightBanner />
              <InsightModal />

              <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                  <div>
                      <h1 className="text-3xl font-bold text-brand-gray-900 tracking-tight">Financeiro</h1>
                      <p className="text-brand-gray-600 mt-1">Gestão de reembolsos, conciliação e custos operacionais.</p>
                  </div>
                  <div className="flex gap-3">
                      <button onClick={() => navigate(Page.CONCILIACAO)} className="px-4 py-2.5 bg-white border border-brand-gray-200 text-brand-gray-700 rounded-xl text-sm font-bold shadow-sm hover:bg-brand-gray-50 flex items-center gap-2 transition-colors">
                          <CreditCard size={16} /> Conciliação
                      </button>
                      <button onClick={() => navigate(Page.DESPESAS)} className="px-4 py-2.5 bg-brand-primary text-white rounded-xl text-sm font-bold shadow-lg hover:bg-brand-dark flex items-center gap-2 transition-colors">
                          <FileCheck size={16} /> Aprovar Relatórios
                      </button>
                  </div>
              </div>

              {/* KPIs Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <KpiCard 
                      title="Aguardando Aprovação" 
                      value={pendingApprovalReports.length} 
                      subtext={`${pendingApprovalReports.length > 0 ? 'Ação necessária' : 'Tudo em dia'}`} 
                      icon={AlertTriangle} 
                      colorClass="bg-orange-100 text-orange-600" 
                  />
                  <KpiCard 
                      title="Total a Pagar (Pend.)" 
                      value={`R$ ${pendingPaymentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                      icon={DollarSign} 
                      colorClass="bg-blue-100 text-blue-600" 
                  />
                  <KpiCard 
                      title="Pago no Mês" 
                      value={`R$ ${paidThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                      icon={CheckCircle2} 
                      colorClass="bg-green-100 text-green-600" 
                  />
                  <KpiCard 
                      title="Custo Médio/Km" 
                      value="R$ 0,58" 
                      subtext="Baseado na frota" 
                      icon={Briefcase} 
                      colorClass="bg-brand-gray-100 text-brand-gray-600" 
                  />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* CHART: Expenses Breakdown */}
                  <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-brand-gray-100 flex flex-col h-[400px]">
                      <h3 className="font-bold text-brand-gray-900 mb-4 flex items-center gap-2">
                          <PieIcon size={18} className="text-brand-primary"/> Breakdown de Custos
                      </h3>
                      <div className="flex-1 w-full min-w-0 min-h-0 relative">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie
                                      data={pieData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={60}
                                      outerRadius={80}
                                      paddingAngle={5}
                                      dataKey="value"
                                  >
                                      {pieData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color} />
                                      ))}
                                  </Pie>
                                  <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString()}`} />
                                  <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{fontSize: '10px'}} />
                              </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center -mt-6">
                              <span className="block text-2xl font-bold text-brand-gray-900">
                                  {pieData.length}
                              </span>
                              <span className="block text-[10px] text-gray-400 uppercase">Categorias</span>
                          </div>
                      </div>
                  </div>

                  {/* CHART: Trend */}
                  <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-brand-gray-100 flex flex-col h-[400px]">
                      <h3 className="font-bold text-brand-gray-900 mb-4 flex items-center gap-2">
                          <TrendingUp size={18} className="text-green-600"/> Evolução de Custos (Semestre)
                      </h3>
                      <div className="flex-1 w-full min-w-0 min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                  <defs>
                                      <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                      </linearGradient>
                                  </defs>
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} tickFormatter={(val) => `R$${val/1000}k`} />
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                  <Tooltip 
                                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                                      formatter={(value: number) => [`R$ ${value.toLocaleString()}`, 'Total']}
                                  />
                                  <Area type="monotone" dataKey="valor" stroke="#3B82F6" fillOpacity={1} fill="url(#colorValor)" strokeWidth={3} />
                              </AreaChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              </div>

              {/* PENDING APPROVAL LIST */}
              <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-brand-gray-100 bg-brand-gray-50 flex justify-between items-center">
                      <h3 className="font-bold text-brand-gray-900 flex items-center gap-2">
                          <FileCheck size={18} className="text-orange-500" /> Relatórios Aguardando Aprovação Financeira
                      </h3>
                      <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">
                          {pendingApprovalReports.length} Pendentes
                      </span>
                  </div>
                  <div className="divide-y divide-brand-gray-100">
                      {pendingApprovalReports.length === 0 ? (
                          <div className="p-12 text-center text-gray-400">
                              <CheckCircle2 size={40} className="mx-auto mb-3 text-green-200" />
                              <p>Tudo certo! Nenhum relatório pendente de aprovação.</p>
                          </div>
                      ) : (
                          pendingApprovalReports.map(report => (
                              <div key={report.id} className="p-5 hover:bg-brand-gray-50 transition-colors flex flex-col md:flex-row items-center justify-between gap-4">
                                  <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-xs">
                                          {report.requesterName.charAt(0)}
                                      </div>
                                      <div>
                                          <h4 className="font-bold text-brand-gray-900">{report.requesterName}</h4>
                                          <p className="text-xs text-brand-gray-500 flex items-center gap-2">
                                              <span>ID: {report.id}</span>
                                              <span>•</span>
                                              <span>{report.period}</span>
                                              <span>•</span>
                                              <span className="text-orange-600 font-bold">Aprovado por Gestor</span>
                                          </p>
                                      </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                                      <div className="text-right">
                                          <p className="text-[10px] font-bold text-brand-gray-400 uppercase">Reembolso</p>
                                          <p className="text-lg font-bold text-brand-gray-900">R$ {report.totalReimbursable.toFixed(2)}</p>
                                      </div>
                                      <button 
                                          onClick={() => navigate(Page.DESPESAS)}
                                          className="px-4 py-2 border border-brand-gray-200 text-brand-gray-600 font-bold rounded-lg text-xs hover:bg-brand-gray-100 hover:text-brand-primary transition-colors flex items-center gap-2"
                                      >
                                          Revisar <ArrowRight size={14} />
                                      </button>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      );
  }

  // --- FIELD SALES VIEW ---
  if (role === UserRole.FIELD_SALES) {
      // Use logged in user name
      const myName = currentUser?.name || 'Consultor';
      const todayStr = new Date().toISOString().split('T')[0];
      
      const todaysAppointments = appointments.filter(appt => appt.date === todayStr && appt.fieldSalesName === myName);
      
      const total = todaysAppointments.length;
      const completed = todaysAppointments.filter(a => a.status === 'Completed').length;
      const pending = todaysAppointments.filter(a => a.status === 'Scheduled').length;
      const converted = todaysAppointments.filter(a => a.visitReport?.outcome === 'Convertido').length;

      // Filter displayed list based on selection
      const displayedAppointments = todaysAppointments.filter(a => {
          if (detailedMetricView === 'COMPLETED') return a.status === 'Completed';
          if (detailedMetricView === 'SCHEDULED') return a.status === 'Scheduled';
          if (detailedMetricView === 'CONVERTED') return a.visitReport?.outcome === 'Convertido';
          return true; // 'ALL'
      });

      return (
          <div className="max-w-7xl mx-auto">
            <InsightBanner />
            <InsightModal />
            
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Olá, {myName.split(' ')[0]}</h1>
                <p className="text-gray-500 mt-1">Aqui está o resumo da sua operação hoje.</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                <KpiCard title="Total Agenda" value={total} subtext="Visitas totais" icon={Calendar} colorClass="bg-blue-500 text-blue-600" onClick={() => setDetailedMetricView('ALL')} active={detailedMetricView === 'ALL'} />
                <KpiCard title="Realizados" value={completed} subtext="Check-ins feitos" icon={CheckCircle2} colorClass="bg-green-500 text-green-600" onClick={() => setDetailedMetricView('COMPLETED')} active={detailedMetricView === 'COMPLETED'} />
                <KpiCard title="Pendentes" value={pending} subtext="A realizar" icon={Clock} colorClass="bg-orange-500 text-orange-600" onClick={() => setDetailedMetricView('SCHEDULED')} active={detailedMetricView === 'SCHEDULED'} />
                <KpiCard title="Novos Negócios" value={converted} subtext="Conversões" icon={Sparkles} colorClass="bg-brand-primary text-brand-primary" onClick={() => setDetailedMetricView('CONVERTED')} active={detailedMetricView === 'CONVERTED'} />
            </div>

            {/* Today's Schedule - Tech Look */}
            <div className="tech-card rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                        <div className="w-1 h-6 bg-brand-primary rounded-full"></div>
                        Agenda de Hoje
                        {detailedMetricView !== 'ALL' && (
                            <span className="text-xs font-normal text-gray-500 ml-2 bg-gray-200 px-2 py-0.5 rounded-full">
                                Filtro: {detailedMetricView === 'COMPLETED' ? 'Realizados' : detailedMetricView === 'SCHEDULED' ? 'Pendentes' : 'Conversões'}
                            </span>
                        )}
                    </h3>
                    <span className="text-xs font-bold bg-white border border-gray-200 text-gray-700 px-3 py-1 rounded-full shadow-sm">
                        {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                </div>
                <div className="divide-y divide-gray-50">
                    {displayedAppointments.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                            <div className="bg-gray-50 p-4 rounded-full mb-3"><Calendar className="w-8 h-8 opacity-20" /></div>
                            <p>Nenhum item encontrado para este filtro.</p>
                        </div>
                    ) : (
                        displayedAppointments.map(appt => {
                            let typeInfo = { label: 'Novo', color: 'bg-brand-light/10 text-brand-primary border-brand-light/20' };
                            if (appt.isWallet) typeInfo = { label: 'Gestão', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
                            else if (appt.leadOrigins.includes('Prospecção')) typeInfo = { label: 'Prospecção', color: 'bg-blue-100 text-blue-800 border-blue-200' };

                            return (
                                <div key={appt.id} onClick={() => setSelectedAppointment(appt)} className="p-5 hover:bg-gray-50 transition-colors cursor-pointer group flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl ${appt.status === 'Completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                            {appt.status === 'Completed' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 group-hover:text-brand-primary transition-colors">{appt.clientName}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${typeInfo.color}`}>{typeInfo.label}</span>
                                                <span className="text-xs text-gray-500 flex items-center"><MapPin className="w-3 h-3 mr-1" /> {appt.address}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-brand-primary transition-colors" />
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
            {/* Modal Logic kept consistent */}
             {selectedAppointment && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
                        <button onClick={() => setSelectedAppointment(null)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={18}/></button>
                        <h3 className="text-xl font-bold mb-1">{selectedAppointment.clientName}</h3>
                        <p className="text-gray-500 text-sm mb-6 flex items-center gap-1"><MapPin size={14}/> {selectedAppointment.address}</p>
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-gray-400 text-xs block uppercase font-bold">Contato</span>{selectedAppointment.responsible}</div>
                                <div><span className="text-gray-400 text-xs block uppercase font-bold">Telefone</span>{selectedAppointment.whatsapp}</div>
                            </div>
                        </div>
                         {selectedAppointment.visitReport && (
                            <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-green-800 text-sm">
                                <p className="font-bold mb-1 flex items-center gap-2"><CheckCircle2 size={16}/> Relatório</p>
                                <p>{selectedAppointment.visitReport.outcome || selectedAppointment.visitReport.walletAction}</p>
                            </div>
                         )}
                    </div>
                </div>
            )}
          </div>
      );
  }

  // --- INSIDE SALES VIEW ---
  if (role === UserRole.INSIDE_SALES) {
      // Use logged in user name
      const myName = currentUser?.name || 'Inside Sales';
      
      const myAppointments = appointments.filter(a => a.insideSalesName === myName);
      
      const totalAppointments = myAppointments.length;
      const completedVisits = myAppointments.filter(a => a.status === 'Completed').length;
      const pendingVisits = myAppointments.filter(a => a.status === 'Scheduled').length;
      
      const filteredList = myAppointments.filter(a => {
         if (cardFilter === 'COMPLETED' && a.status !== 'Completed') return false;
         if (cardFilter === 'SCHEDULED' && a.status !== 'Scheduled') return false;
         return true;
      });

      return (
        <div className="max-w-7xl mx-auto">
            <InsightBanner />
            <InsightModal />
            
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Inside Sales: {myName.split(' ')[0]}</h1>
                    <p className="text-gray-500 mt-1">Gestão de carteira e agendamentos.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
                <KpiCard title="Meus Agendamentos" value={totalAppointments} icon={Calendar} colorClass="bg-brand-gray-900 text-white" onClick={() => setCardFilter('ALL')} active={cardFilter === 'ALL'} />
                <KpiCard title="Realizadas (Field)" value={completedVisits} icon={CheckCircle2} colorClass="bg-green-500 text-green-600" onClick={() => setCardFilter('COMPLETED')} active={cardFilter === 'COMPLETED'} />
                <KpiCard title="Pendentes" value={pendingVisits} icon={Clock} colorClass="bg-orange-500 text-orange-600" onClick={() => setCardFilter('SCHEDULED')} active={cardFilter === 'SCHEDULED'} />
            </div>

            <div className="tech-card rounded-2xl overflow-hidden min-h-[400px]">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between md:items-center gap-4 bg-gray-50/30">
                     <h3 className="font-bold text-lg text-gray-900">Listagem de Visitas</h3>
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" placeholder="Buscar..." className="pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none w-full md:w-64" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                     </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-50 font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4">Consultor Field</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4 text-right">Data</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredList.slice(0, 10).map(appt => (
                                <tr key={appt.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${appt.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {appt.status === 'Completed' ? 'Realizada' : 'Pendente'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-gray-900">{appt.clientName}</td>
                                    <td className="px-6 py-4 text-gray-600 flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">{appt.fieldSalesName.charAt(0)}</div>{appt.fieldSalesName}</td>
                                    <td className="px-6 py-4">
                                         {appt.isWallet ? <span className="text-yellow-600 font-bold text-xs uppercase">Carteira</span> : <span className="text-brand-primary font-bold text-xs uppercase">Novo</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-gray-500">{appt.date ? new Date(appt.date).toLocaleDateString() : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      );
  }

  // --- GESTOR VIEW (DEFAULT & GESTOR) ---
  const filteredGestorData = getFilteredAppointmentsForGestor();
  const consultantStats = calculateConsultantStats();
  const totalGestor = filteredGestorData.length;
  const convertedGestor = filteredGestorData.filter(a => a.visitReport?.outcome === 'Convertido').length;

  return (
     <div className="max-w-7xl mx-auto space-y-8">
        <InsightBanner />
        <InsightModal />

        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Visão Geral</h1>
                <p className="text-gray-500 mt-1">Monitoramento de performance da equipe.</p>
            </div>
            <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                <button onClick={() => setTeamView('ALL')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${teamView === 'ALL' ? 'bg-brand-gray-900 text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}>Geral</button>
                <button onClick={() => setTeamView('FIELD')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${teamView === 'FIELD' ? 'bg-brand-gray-900 text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}>Field</button>
                <button onClick={() => setTeamView('INSIDE')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${teamView === 'INSIDE' ? 'bg-brand-gray-900 text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}>Inside</button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
             <KpiCard title="Volume Total" value={totalGestor} icon={Briefcase} colorClass="bg-brand-gray-800 text-white" />
             <KpiCard title="Conversões" value={convertedGestor} icon={Sparkles} colorClass="bg-purple-500 text-purple-600" />
             <KpiCard title="Taxa Média" value={`${totalGestor > 0 ? ((convertedGestor/totalGestor)*100).toFixed(1) : 0}%`} icon={TrendingUp} colorClass="bg-green-500 text-green-600" />
             <KpiCard title="Carteira Ativa" value={142} icon={Users} colorClass="bg-blue-500 text-blue-600" />
        </div>

        {/* --- NEW: JORNADA OPERACIONAL (SLA FLOW) --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 overflow-hidden">
            <div className="p-6 border-b border-brand-gray-100 bg-brand-gray-50/50">
                <h3 className="font-bold text-lg text-brand-gray-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-brand-primary" /> Jornada Operacional & SLA
                </h3>
            </div>
            
            <div className="p-8 overflow-x-auto">
                <div className="flex items-center gap-4 min-w-[800px]">
                    <JourneyStage 
                        title="Comercial (Entrada)" 
                        count={journeyStats.commercialPending} 
                        sla="4h Médio" 
                        icon={Users} 
                        colorClass={{ bg: 'bg-brand-gray-100', text: 'text-brand-gray-600' }} 
                    />
                    <JourneyStage 
                        title="Pricing (Análise)" 
                        count={journeyStats.pricingPending} 
                        sla="2h Médio" 
                        icon={DollarSign} 
                        colorClass={{ bg: 'bg-purple-100', text: 'text-purple-600' }} 
                    />
                    <JourneyStage 
                        title="Backoffice (Validação)" 
                        count={journeyStats.backofficePending} 
                        sla="24h Médio" 
                        icon={ShieldCheck} 
                        colorClass={{ bg: 'bg-blue-100', text: 'text-blue-600' }} 
                    />
                    <JourneyStage 
                        title="Logística (Ativação)" 
                        count={journeyStats.logisticsPending} 
                        sla="48h Médio" 
                        icon={Truck} 
                        colorClass={{ bg: 'bg-orange-100', text: 'text-orange-600' }} 
                        isLast={true}
                    />
                </div>
            </div>

            {/* Quick List of Stalled Items */}
            {(journeyStats.pricingPending > 0 || journeyStats.backofficePending > 0) && (
                <div className="bg-red-50 border-t border-red-100 p-4">
                    <p className="text-xs font-bold text-red-800 flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4" /> Atenção: Itens Críticos na Fila
                    </p>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                        {appStore.getDemands().filter(d => d.status === 'Em Análise').slice(0, 5).map(d => (
                            <div key={d.id} className="min-w-[200px] bg-white p-3 rounded-lg border border-red-200 shadow-sm text-xs">
                                <span className="font-bold text-gray-800 block truncate">{d.clientName}</span>
                                <span className="text-gray-500 block">Pricing - {new Date(d.date).toLocaleDateString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 tech-card rounded-2xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="font-bold text-lg text-gray-900">Ranking de Performance</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-50 font-bold">
                            <tr>
                                <th className="px-6 py-4">Consultor</th>
                                <th className="px-6 py-4 text-center">Visitas</th>
                                <th className="px-6 py-4 text-center">Conversões</th>
                                <th className="px-6 py-4 text-right">Eficiência</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {consultantStats.map((stat, idx) => (
                                <tr key={stat.name} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3">
                                        <span className="text-xs font-mono text-gray-300 w-4">{idx + 1}</span>
                                        {stat.name}
                                    </td>
                                    <td className="px-6 py-4 text-center text-gray-600">{stat.totalAppointments}</td>
                                    <td className="px-6 py-4 text-center font-bold text-green-600">{stat.converted}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-brand-primary" style={{width: `${stat.conversionRate}%`}}></div>
                                            </div>
                                            <span className="text-xs font-bold">{stat.conversionRate.toFixed(0)}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="tech-card rounded-2xl p-6 flex flex-col justify-center items-center text-center">
                 <div style={{ width: 192, height: 192, minHeight: 192, position: 'relative', minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={[
                                    { name: 'Convertido', value: convertedGestor },
                                    { name: 'Em Aberto', value: totalGestor - convertedGestor }
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                <Cell fill="#10B981" />
                                <Cell fill="#F3F4F6" />
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                         <span className="text-2xl font-bold text-gray-900">{totalGestor}</span>
                         <span className="block text-xs text-gray-400 uppercase">Total</span>
                    </div>
                 </div>
                 <div className="mt-4 flex gap-4 text-xs">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div>Convertidos</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-200"></div>Em Aberto</div>
                 </div>
            </div>
        </div>
     </div>
  );
};

export default Dashboard;
