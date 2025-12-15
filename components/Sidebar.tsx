
import React, { useState, useEffect } from 'react';
import { UserRole, Page } from '../types';
import { useAppStore } from '../services/useAppStore';
import { appStore } from '../services/store'; 
import { 
  LayoutDashboard, 
  Calendar, 
  Map, 
  Users, 
  Settings, 
  LogOut,
  Briefcase,
  MapPinned,
  Menu,
  BadgePercent,
  FilePlus,
  X,
  ChevronRight,
  Target,
  ClipboardCheck,
  HelpCircle,
  TrendingUp,
  Percent,
  Truck,
  Activity,
  FileCheck,
  Inbox,
  Key,
  CheckCircle2,
  ClipboardList,
  Package,
  ShieldCheck,
  FileText,
  LifeBuoy,
  UserCog,
  ListTodo,
  Bell,
  User,
  Receipt,
  Terminal,
  ScanLine,
  Star,
  PieChart,
  DollarSign,
  Box
} from 'lucide-react';
import { Logo } from './Logo';

const Sidebar: React.FC = () => {
  const { userRole, currentUser, currentPage, navigate, logout, isOffline } = useAppStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const checkNotifs = () => {
        const notifs = appStore.getNotifications().filter(n => !n.read);
        setUnreadCount(notifs.length);
    };
    checkNotifs(); // Initial check
    const interval = setInterval(checkNotifs, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, []);
  
  if (!userRole) return null;

  const getMenuItems = () => {
    let items: {icon: any, label: string, page: Page}[] = [];

    switch (userRole) {
      case UserRole.INSIDE_SALES:
        items = [
          { icon: LayoutDashboard, label: 'Dashboard', page: Page.DASHBOARD },
          { icon: Calendar, label: 'Agendamentos', page: Page.AGENDAMENTOS },
          { icon: Activity, label: 'Painel de Leads', page: Page.PAINEL_LEADS },
          { icon: BadgePercent, label: 'Simulador Pricing', page: Page.PRICING },
          { icon: FilePlus, label: 'Cadastro', page: Page.CADASTRO },
          { icon: ListTodo, label: 'Minhas Solicitações', page: Page.PEDIDOS_RASTREIO },
          { icon: Users, label: 'Base de Clientes', page: Page.BASE_CLIENTES },
        ];
        break;
      case UserRole.FIELD_SALES:
        items = [
          { icon: LayoutDashboard, label: 'Dashboard', page: Page.DASHBOARD },
          { icon: Calendar, label: 'Minha Agenda', page: Page.AGENDAMENTOS },
          { icon: Map, label: 'Rota', page: Page.ROTAS },
          { icon: Activity, label: 'Painel de Leads', page: Page.PAINEL_LEADS },
          { icon: BadgePercent, label: 'Simulador Pricing', page: Page.PRICING },
          { icon: FilePlus, label: 'Cadastro', page: Page.CADASTRO },
          { icon: ListTodo, label: 'Minhas Solicitações', page: Page.PEDIDOS_RASTREIO },
          { icon: Receipt, label: 'Despesas & Reembolso', page: Page.DESPESAS },
          { icon: Users, label: 'Base de Clientes', page: Page.BASE_CLIENTES },
        ];
        break;
      case UserRole.GESTOR:
        items = [
          { icon: LayoutDashboard, label: 'Dashboard Geral', page: Page.DASHBOARD_GERAL },
          { icon: Users, label: 'Base de Clientes', page: Page.BASE_CLIENTES },
          { icon: Activity, label: 'Painel de Leads', page: Page.PAINEL_LEADS },
          { icon: MapPinned, label: 'Mapa de Gestão', page: Page.MAPA_GESTAO },
          { icon: BadgePercent, label: 'Simulador Pricing', page: Page.PRICING },
          { icon: FilePlus, label: 'Cadastro', page: Page.CADASTRO },
          { icon: ListTodo, label: 'Minhas Solicitações', page: Page.PEDIDOS_RASTREIO },
          { icon: Receipt, label: 'Despesas & Reembolso', page: Page.DESPESAS },
          { icon: Settings, label: 'Configuração', page: Page.CONFIGURACAO },
          { icon: UserCog, label: 'Usuários', page: Page.USUARIOS },
        ];
        break;
      case UserRole.PRICING_MANAGER:
        items = [
          { icon: LayoutDashboard, label: 'Dashboard Pricing', page: Page.PRICING_DASHBOARD },
          { icon: TrendingUp, label: 'Mesa de Negociação', page: Page.MESA_NEGOCIACAO },
          { icon: Percent, label: 'Config. Taxas', page: Page.CONFIG_TAXAS },
        ];
        break;
      case UserRole.LOGISTICA:
        items = [
          { icon: LayoutDashboard, label: 'Dashboard Logística', page: Page.LOGISTICA_DASHBOARD },
          { icon: Box, label: 'Estoque Global', page: Page.LOGISTICA_ESTOQUE },
          { icon: Terminal, label: 'Fila GSurf / Ativações', page: Page.LOGISTICA_ATIVACOES },
          { icon: LifeBuoy, label: 'Gestão de Suporte', page: Page.LOGISTICA_SUPORTE },
        ];
        break;
      case UserRole.ADMIN:
        items = [
          { icon: LayoutDashboard, label: 'Centro de Comando', page: Page.DASHBOARD },
          { icon: ShieldCheck, label: 'Validações & Demandas', page: Page.ADMIN_DEMANDS },
          { icon: UserCog, label: 'Gestão de Usuários', page: Page.USUARIOS },
        ];
        break;
      case UserRole.FINANCEIRO:
        items = [
          { icon: LayoutDashboard, label: 'Dash Financeiro', page: Page.DASHBOARD_GERAL },
          { icon: Receipt, label: 'Aprovação de Despesas', page: Page.DESPESAS },
          { icon: DollarSign, label: 'Custos & Pricing', page: Page.CONFIG_TAXAS },
          { icon: UserCog, label: 'Usuários', page: Page.USUARIOS },
        ];
        break;
      case UserRole.QUALIDADE:
        items = [
          { icon: Star, label: 'Monitoria de Qualidade', page: Page.DASHBOARD_GERAL },
          { icon: ClipboardCheck, label: 'Auditoria de Visitas', page: Page.AGENDAMENTOS },
          { icon: Users, label: 'Base de Clientes', page: Page.BASE_CLIENTES },
          { icon: LifeBuoy, label: 'Tickets de Suporte', page: Page.LOGISTICA_SUPORTE },
          { icon: UserCog, label: 'Usuários', page: Page.USUARIOS },
        ];
        break;
    }

    // Renamed to Help & Reports
    items.push({ icon: HelpCircle, label: 'Ajuda & Relatórios', page: Page.AJUDA });
    return items;
  };

  const getBottomNavItems = () => {
    switch (userRole) {
      case UserRole.FIELD_SALES:
        return [
          { icon: Calendar, label: 'Agenda', page: Page.AGENDAMENTOS },
          { icon: Map, label: 'Rota', page: Page.ROTAS },
          { icon: LayoutDashboard, label: 'Dash', page: Page.DASHBOARD, isCentral: true }, 
          { icon: Receipt, label: 'Despesas', page: Page.DESPESAS },
        ];
      case UserRole.INSIDE_SALES:
        return [
          { icon: Calendar, label: 'Agenda', page: Page.AGENDAMENTOS },
          { icon: Users, label: 'Base', page: Page.BASE_CLIENTES },
          { icon: LayoutDashboard, label: 'Dash', page: Page.DASHBOARD, isCentral: true }, 
          { icon: Activity, label: 'Leads', page: Page.PAINEL_LEADS },
          { icon: ListTodo, label: 'Solicit.', page: Page.PEDIDOS_RASTREIO },
        ];
      case UserRole.GESTOR:
        return [
          { icon: MapPinned, label: 'Mapa', page: Page.MAPA_GESTAO },
          { icon: Users, label: 'Base', page: Page.BASE_CLIENTES },
          { icon: LayoutDashboard, label: 'Dash', page: Page.DASHBOARD_GERAL, isCentral: true }, 
          { icon: Receipt, label: 'Despesas', page: Page.DESPESAS },
          { icon: ListTodo, label: 'Solicit.', page: Page.PEDIDOS_RASTREIO },
        ];
      case UserRole.PRICING_MANAGER:
        return [
          { icon: TrendingUp, label: 'Mesa', page: Page.MESA_NEGOCIACAO },
          { icon: Percent, label: 'Config', page: Page.CONFIG_TAXAS },
          { icon: LayoutDashboard, label: 'Dash', page: Page.PRICING_DASHBOARD, isCentral: true }, 
        ];
      case UserRole.LOGISTICA:
        return [
          { icon: Box, label: 'Estoque', page: Page.LOGISTICA_ESTOQUE },
          { icon: Terminal, label: 'GSurf', page: Page.LOGISTICA_ATIVACOES },
          { icon: LayoutDashboard, label: 'Dash', page: Page.LOGISTICA_DASHBOARD, isCentral: true },
          { icon: LifeBuoy, label: 'Suporte', page: Page.LOGISTICA_SUPORTE },
        ];
      case UserRole.ADMIN:
        return [
          { icon: ShieldCheck, label: 'Validação', page: Page.ADMIN_DEMANDS },
          { icon: LayoutDashboard, label: 'Dash', page: Page.DASHBOARD, isCentral: true }, 
          { icon: UserCog, label: 'Usuários', page: Page.USUARIOS },
        ];
      case UserRole.FINANCEIRO:
        return [
          { icon: Receipt, label: 'Despesas', page: Page.DESPESAS },
          { icon: LayoutDashboard, label: 'Dash', page: Page.DASHBOARD_GERAL, isCentral: true },
          { icon: DollarSign, label: 'Custos', page: Page.CONFIG_TAXAS },
        ];
      case UserRole.QUALIDADE:
        return [
          { icon: ClipboardCheck, label: 'Auditoria', page: Page.AGENDAMENTOS },
          { icon: Star, label: 'Monitoria', page: Page.DASHBOARD_GERAL, isCentral: true },
          { icon: LifeBuoy, label: 'Suporte', page: Page.LOGISTICA_SUPORTE },
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();
  const bottomItems = getBottomNavItems();

  const handleMobileNavigate = (page: Page) => {
    navigate(page);
    setIsMobileMenuOpen(false);
  };

  const handleProfileClick = () => {
      navigate(Page.PERFIL);
      setIsMobileMenuOpen(false);
  };

  // Shared Menu Content (Drawer)
  const MenuContent = () => (
    <div className="flex flex-col h-full bg-brand-gray-900 text-white relative overflow-hidden">
        {/* Abstract Tech Background Shape */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        <div className="p-6 relative shrink-0 z-10">
          <div className="mb-6 flex justify-center">
             <Logo className="scale-[0.85] origin-center" />
          </div>
          
          {/* User Info Badge - Glassy & Clickable */}
          <button 
            onClick={handleProfileClick}
            className="w-full flex items-center p-3 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 relative hover:bg-white/10 transition-colors group text-left cursor-pointer"
            title="Editar Meu Perfil"
          >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-primary to-brand-dark flex items-center justify-center text-white font-bold text-sm shadow-glow group-hover:scale-105 transition-transform relative">
                  {userRole.charAt(0)}
                  {/* UNREAD BADGE ON PROFILE */}
                  {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-brand-gray-900"></span>
                  )}
              </div>
              <div className="ml-3 overflow-hidden flex-1">
                  <p className="text-xs font-bold text-gray-200 truncate">{currentUser?.name || userRole}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full shadow-[0_0_5px_rgba(74,222,128,0.5)] ${isOffline ? 'bg-red-500' : 'bg-green-400'}`}></span>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{isOffline ? 'Offline' : 'Conectado'}</p>
                  </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
          </button>
        </div>

        <div className="flex-1 py-4 overflow-y-auto z-10">
          <div className="px-6 mb-3 flex justify-between items-center">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                  Navegação
              </span>
              {unreadCount > 0 && (
                  <span className="text-[9px] bg-red-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                      <Bell size={10} className="fill-current" /> {unreadCount}
                  </span>
              )}
          </div>
          <nav className="space-y-1 px-3">
            {menuItems.map((item) => {
              const isActive = currentPage === item.page;
              // Highlight "Minhas Solicitações" if there are notifications and it's not active
              const hasAlert = (item.label.includes('Solicitações') || item.label.includes('Suporte')) && unreadCount > 0;

              return (
                <button
                  key={item.label}
                  onClick={() => handleMobileNavigate(item.page)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-300 group relative overflow-hidden
                    ${isActive 
                      ? 'bg-gradient-to-r from-brand-primary/20 to-transparent text-white border-l-2 border-brand-primary' 
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <div className="flex items-center">
                    <item.icon className={`mr-3 h-5 w-5 transition-transform duration-300 ${isActive ? 'text-brand-primary scale-110' : hasAlert ? 'text-white animate-bounce-short' : 'group-hover:text-brand-light'}`} />
                    {item.label}
                  </div>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-brand-primary shadow-glow"></div>}
                  {hasAlert && !isActive && (
                      <div className="bg-red-500 text-white text-[9px] font-bold px-1.5 rounded-full">
                          {unreadCount}
                      </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
        
        {/* Footer Area with Logout */}
        <div className="p-4 border-t border-white/5 bg-black/20 z-10 flex flex-col gap-3">
            <button 
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all text-xs font-bold uppercase tracking-wide group"
            >
                <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" />
                Sair do Sistema
            </button>
            <p className="text-[10px] text-gray-600 font-mono text-center">Build v1.8.0 • 2025</p>
        </div>
    </div>
  );

  return (
    <>
      {/* --- DESKTOP SIDEBAR (Static) --- */}
      <div className="hidden md:flex w-72 glass-panel h-screen flex-col shadow-2xl fixed left-0 top-0 z-50 border-r border-white/5">
         <MenuContent />
      </div>

      {/* --- MOBILE TOP HEADER (Dark Theme for White Logo) --- */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-brand-gray-900/95 backdrop-blur-lg z-40 px-5 py-3 shadow-md border-b border-white/10 flex justify-between items-center h-16 transition-all">
         {/* Left: Menu Toggle */}
         <div className="relative">
            <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2.5 text-gray-400 hover:text-white bg-white/5 rounded-xl active:scale-95 transition-all border border-white/10"
            >
                <Menu size={22} strokeWidth={2.5} />
            </button>
            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
            )}
         </div>

         {/* Center: Logo (Now White) */}
         <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Logo className="scale-[0.8] origin-center" />
         </div>
         
         {/* Right: Quick Logout */}
         <button 
            onClick={logout}
            className="p-2.5 text-gray-400 hover:text-red-400 transition-colors bg-white/5 rounded-xl border border-white/10"
            title="Sair"
         >
            <LogOut size={22} strokeWidth={2.5} />
         </button>
      </div>

      {/* --- MOBILE BOTTOM NAV (Fixed Full Width Bar) --- */}
      {bottomItems.length > 0 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
            <div className="bg-brand-gray-900 border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] flex justify-between items-end h-[4.5rem] px-4 pb-2 relative">
                {bottomItems.map((item, idx) => {
                    const isActive = currentPage === item.page;
                    const isCentral = (item as any).isCentral;
                    const widthClass = bottomItems.length >= 5 ? 'w-1/5' : bottomItems.length === 3 ? 'w-1/3' : bottomItems.length === 2 ? 'w-1/2' : 'w-1/4';
                    
                    // Highlight "Solicit." if unread
                    const hasAlert = item.label.includes('Solicit.') && unreadCount > 0;

                    // CENTRAL BUTTON RENDER (Floating effect above bar)
                    if (isCentral) {
                        return (
                            <div key={item.label} className={`relative -top-5 flex flex-col items-center justify-start ${widthClass} h-full pointer-events-none`}>
                                <button
                                    onClick={() => navigate(item.page)}
                                    className={`
                                        pointer-events-auto
                                        w-14 h-14 rounded-full flex items-center justify-center shadow-glow transition-all duration-300
                                        ${isActive 
                                            ? 'bg-brand-primary text-white scale-110 border-4 border-brand-gray-100' 
                                            : 'bg-brand-gray-800 text-gray-400 border-4 border-brand-gray-900 hover:bg-brand-primary hover:text-white hover:border-gray-100'}
                                    `}
                                >
                                    <item.icon className="h-6 w-6 stroke-[2.5px]" />
                                </button>
                            </div>
                        );
                    }

                    // STANDARD BUTTON RENDER
                    return (
                        <button
                            key={item.label}
                            onClick={() => navigate(item.page)}
                            className={`relative flex flex-col items-center justify-center ${widthClass} h-full group pb-2`}
                        >
                            {hasAlert && !isActive && (
                                <span className="absolute top-1 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-brand-gray-900 z-10"></span>
                            )}
                            <div className={`
                                p-1.5 rounded-xl transition-all duration-300 mb-0.5
                                ${isActive ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 group-hover:text-gray-300'}
                            `}>
                                <item.icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                            </div>
                            <span className={`text-[10px] font-medium tracking-wide transition-colors ${isActive ? 'text-white' : 'text-gray-600'}`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
      )}

      {/* --- MOBILE SIDEBAR DRAWER (Overlay) --- */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
           {/* Backdrop */}
           <div 
             className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
             onClick={() => setIsMobileMenuOpen(false)}
           ></div>
           
           {/* Drawer */}
           <div className="absolute left-0 top-0 bottom-0 w-[85%] max-w-xs bg-brand-gray-900 shadow-2xl animate-slide-in-left border-r border-white/10">
              <div className="absolute top-4 right-4 z-20">
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 text-gray-400 hover:text-white bg-white/10 rounded-full backdrop-blur-md"
                  >
                    <X size={18} />
                  </button>
              </div>
              <MenuContent />
           </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
