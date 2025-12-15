
import React, { useState } from 'react';
import { 
    HelpCircle, BookOpen, FileText, BadgePercent, Map, Users, Settings, MapPinned,
    CheckCircle2, Download, Table, ExternalLink, Bot, AlertCircle, Loader2, LifeBuoy,
    MessageSquare, Sparkles, ChevronRight, ArrowRight
} from 'lucide-react';
import { UserRole } from '../types';
import { appStore } from '../services/store';
import { useAppStore } from '../services/useAppStore';

interface HelpPageProps {
    role: UserRole;
}

interface Tutorial {
    title: string;
    desc: string;
    icon: any;
    colorClass: string;
}

const HelpPage: React.FC<HelpPageProps> = ({ role }) => {
    const { currentUser, setAiOpen } = useAppStore(); 
    const [ticketSent, setTicketSent] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // --- Role-Based Tutorials Configuration ---
    const getTutorials = (): Tutorial[] => {
        switch (role) {
            case UserRole.FIELD_SALES:
                return [
                    { title: "Minha Rota Diária", desc: "Aprenda a otimizar sua rota e usar o GPS integrado.", icon: Map, colorClass: "text-blue-600 bg-blue-100" },
                    { title: "Check-in e Relatórios", desc: "Como registrar visitas e preencher o relatório final.", icon: FileText, colorClass: "text-orange-600 bg-orange-100" },
                    { title: "Simulador de Taxas", desc: "Use o Pricing para simular taxas e comparar.", icon: BadgePercent, colorClass: "text-green-600 bg-green-100" }
                ];
            case UserRole.INSIDE_SALES:
                return [
                    { title: "Agendar Visitas", desc: "Criando demandas para o time de rua.", icon: BookOpen, colorClass: "text-purple-600 bg-purple-100" },
                    { title: "Gestão de Carteira", desc: "Filtrando e acionando clientes da base.", icon: Users, colorClass: "text-blue-600 bg-blue-100" },
                    { title: "Cadastro de Leads", desc: "Inserindo novos clientes manualmente.", icon: FileText, colorClass: "text-orange-600 bg-orange-100" }
                ];
            case UserRole.GESTOR:
                return [
                    { title: "Importação de Base", desc: "Como carregar planilhas de clientes.", icon: FileText, colorClass: "text-green-600 bg-green-100" },
                    { title: "Mapa de Gestão", desc: "Analisando territórios e conflitos.", icon: MapPinned, colorClass: "text-red-600 bg-red-100" },
                    { title: "Gestão de Usuários", desc: "Adicionando e editando a equipe.", icon: Settings, colorClass: "text-gray-600 bg-gray-100" }
                ];
            default:
                return [
                    { title: "Visão Geral", desc: "Entendendo os módulos do sistema.", icon: HelpCircle, colorClass: "text-brand-primary bg-brand-light/10" }
                ];
        }
    };

    const tutorials = getTutorials();

    const handleOpenTicket = () => {
        setTicketSent(true);
        // Simulate API call
        setTimeout(() => {
            alert("✅ Chamado #9023 aberto com sucesso!\n\nA equipe de TI entrará em contato via e-mail em até 24h.");
            setTicketSent(false);
        }, 1000);
    };

    // --- REPORT GENERATION LOGIC ---
    const generateExcelReport = () => {
        setIsExporting(true);
        const XLSX = (window as any).XLSX;

        if (!XLSX) {
            alert("Erro: Biblioteca de Excel não carregada. Tente recarregar a página.");
            setIsExporting(false);
            return;
        }

        setTimeout(() => {
            try {
                const wb = XLSX.utils.book_new();
                let hasData = false;
                const userName = currentUser?.name || '';

                // --- 1. RELATÓRIO DE CLIENTES/CARTEIRA ---
                if ([UserRole.FIELD_SALES, UserRole.INSIDE_SALES, UserRole.GESTOR, UserRole.ADMIN].includes(role)) {
                    let clients = appStore.getClients();
                    
                    // Filter Logic
                    let filteredClients = clients;
                    if (role === UserRole.FIELD_SALES) {
                        filteredClients = clients.filter(c => c.fieldSales === userName);
                    } else if (role === UserRole.INSIDE_SALES) {
                        filteredClients = clients.filter(c => c.insideSales === userName);
                    }

                    // Fallback for demo
                    if (filteredClients.length === 0 && clients.length > 0) {
                        console.warn("Filtro vazio. Exportando base completa (Demo).");
                        filteredClients = clients; 
                    }

                    if (filteredClients.length > 0) {
                        const clientSheetData = filteredClients.map(c => ({
                            "ID Cliente": c.id,
                            "Nome Fantasia": c.nomeEc,
                            "Endereço": c.endereco,
                            "Contato": c.contato,
                            "Responsável": c.responsavel,
                            "Status": c.status || 'Ativo',
                            "Field Sales": c.fieldSales,
                            "Inside Sales": c.insideSales,
                            "Região": c.regiaoAgrupada
                        }));
                        const wsClients = XLSX.utils.json_to_sheet(clientSheetData);
                        XLSX.utils.book_append_sheet(wb, wsClients, "Carteira de Clientes");
                        hasData = true;
                    }
                }

                // --- 2. RELATÓRIO DE VISITAS/AGENDA ---
                if ([UserRole.FIELD_SALES, UserRole.INSIDE_SALES, UserRole.GESTOR].includes(role)) {
                    const appointments = appStore.getAppointments();
                    if (appointments.length > 0) {
                        const apptSheetData = appointments.map(a => ({
                            "Data Visita": a.date,
                            "Período": a.period,
                            "Cliente": a.clientName,
                            "Endereço": a.address,
                            "Status": a.status,
                            "Resultado": a.visitReport?.outcome || a.visitReport?.walletAction || 'Pendente',
                            "Responsável Field": a.fieldSalesName
                        }));
                        const wsAppt = XLSX.utils.json_to_sheet(apptSheetData);
                        XLSX.utils.book_append_sheet(wb, wsAppt, "Relatório de Visitas");
                        hasData = true;
                    }
                }

                if (hasData) {
                    const fileName = `Relatorio_Car10_${role.replace(' ','_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
                    XLSX.writeFile(wb, fileName);
                } else {
                    alert("Não há dados disponíveis para exportação no momento.");
                }

            } catch (error) {
                console.error("Erro na exportação Excel:", error);
                alert("Ocorreu um erro ao gerar o arquivo. Tente novamente.");
            } finally {
                setIsExporting(false);
            }
        }, 800);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in">
            
            {/* HERO SECTION - AI HIGHLIGHT */}
            <div className="relative bg-brand-gray-900 rounded-3xl p-8 md:p-12 overflow-hidden shadow-2xl text-white group">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-brand-primary/30 transition-colors duration-500"></div>
                <div className="relative z-10 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-wider mb-4 backdrop-blur-sm">
                        <Sparkles className="w-3 h-3 text-yellow-400" /> Central de Inteligência
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                        Olá, {currentUser?.name.split(' ')[0]}. <br/>
                        Como posso te ajudar hoje?
                    </h1>
                    <p className="text-gray-300 text-base md:text-lg mb-8 max-w-xl leading-relaxed">
                        Acesse relatórios detalhados, tire dúvidas instantâneas com nossa IA ou abra chamados para a equipe de TI.
                    </p>
                    
                    <button 
                        onClick={() => setAiOpen(true)}
                        className="group bg-white text-brand-gray-900 px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-brand-gray-100 transition-all flex items-center gap-3 transform hover:-translate-y-1"
                    >
                        <Bot className="w-6 h-6 text-brand-primary" />
                        <span>Falar com Assistente IA</span>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>

            {/* ACTION GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. AI ASSISTANT CARD (Alternative Entry) */}
                <div 
                    onClick={() => setAiOpen(true)}
                    className="bg-white p-6 rounded-2xl border border-brand-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <MessageSquare size={100} />
                    </div>
                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Bot className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-brand-gray-900 mb-2">Dúvidas Gerais</h3>
                    <p className="text-sm text-brand-gray-500 leading-relaxed mb-6 h-10">
                        Pergunte sobre processos, taxas, e funcionalidades do sistema em tempo real.
                    </p>
                    <div className="text-purple-600 text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                        Iniciar Chat <ArrowRight className="w-4 h-4" />
                    </div>
                </div>

                {/* 2. REPORTS CARD */}
                <div className="bg-white p-6 rounded-2xl border border-brand-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Table size={100} />
                    </div>
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Download className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-brand-gray-900 mb-2">Relatórios em Excel</h3>
                    <p className="text-sm text-brand-gray-500 leading-relaxed mb-6 h-10">
                        Baixe planilhas completas com dados da sua carteira, visitas e status.
                    </p>
                    <button 
                        onClick={(e) => { e.stopPropagation(); generateExcelReport(); }}
                        disabled={isExporting}
                        className="mt-auto w-full bg-brand-gray-50 hover:bg-brand-gray-100 text-brand-gray-900 py-3 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 border border-brand-gray-200"
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Table className="w-4 h-4"/>}
                        {isExporting ? 'Gerando...' : 'Baixar Planilha'}
                    </button>
                </div>

                {/* 3. SUPPORT CARD */}
                <div className="bg-white p-6 rounded-2xl border border-brand-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <LifeBuoy size={100} />
                    </div>
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-brand-gray-900 mb-2">Suporte Técnico</h3>
                    <p className="text-sm text-brand-gray-500 leading-relaxed mb-6 h-10">
                        Encontrou um erro ou precisa de acesso? Abra um chamado para a TI.
                    </p>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenTicket(); }}
                        disabled={ticketSent}
                        className="mt-auto w-full bg-brand-gray-50 hover:bg-brand-gray-100 text-brand-gray-900 py-3 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 border border-brand-gray-200"
                    >
                        {ticketSent ? <CheckCircle2 className="w-4 h-4 text-green-600"/> : <LifeBuoy className="w-4 h-4"/>}
                        {ticketSent ? 'Chamado Enviado!' : 'Abrir Chamado'}
                    </button>
                </div>
            </div>

            {/* TUTORIALS SECTION */}
            <div className="pt-8 border-t border-brand-gray-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-brand-gray-900">Tutoriais & Guias Rápidos</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tutorials.map((t, idx) => {
                        const Icon = t.icon;
                        return (
                            <div 
                                key={idx}
                                onClick={() => setAiOpen(true)}
                                className="flex items-start gap-4 p-4 rounded-xl bg-white border border-brand-gray-100 hover:border-brand-primary/30 hover:shadow-sm cursor-pointer transition-all group"
                            >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${t.colorClass}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-brand-gray-900 text-sm group-hover:text-brand-primary transition-colors">{t.title}</h4>
                                    <p className="text-xs text-brand-gray-500 mt-1 line-clamp-2">{t.desc}</p>
                                </div>
                                <ExternalLink className="w-3 h-3 text-brand-gray-300 ml-auto group-hover:text-brand-primary transition-colors" />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default HelpPage;
