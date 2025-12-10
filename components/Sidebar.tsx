
import React, { useState } from 'react';
import { UserRole, Page } from '../types';
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
  FileCheck
} from 'lucide-react';
import { Logo } from './Logo';

interface SidebarProps {
  role: UserRole;
  activePage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ role, activePage, onNavigate, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // 1. Main Sidebar Menu Items (Drawer/Desktop) - REORDERED
  const getMenuItems = () => {
    let items: {icon: any, label: string, page: Page}[] = [];

    switch (role) {
      case UserRole.INSIDE_SALES:
        items = [
          { icon: LayoutDashboard, label: 'Dashboard', page: Page.DASHBOARD },
          { icon: Calendar, label: 'Agendamentos', page: Page.AGENDAMENTOS },
          { icon: Activity, label: 'Painel de Leads', page: Page.PAINEL_LEADS },
          { icon: BadgePercent, label: 'Pricing & Pedidos', page: Page.PRICING },
          { icon: FilePlus, label: 'Cadastro', page: Page.CADASTRO },
          { icon: Users, label: 'Base de Clientes', page: Page.BASE_CLIENTES },
        ];
        break;
      case UserRole.FIELD_SALES:
        items = [
          { icon: LayoutDashboard, label: 'Dashboard', page: Page.DASHBOARD },
          { icon: Calendar, label: 'Minha Agenda', page: Page.AGENDAMENTOS },
          { icon: Map, label: 'Rota', page: Page.ROTAS },
          { icon: Activity, label: 'Painel de Leads', page: Page.PAINEL_LEADS },
          { icon: BadgePercent, label: 'Pricing & Pedidos', page: Page.PRICING },
          { icon: FilePlus, label: 'Cadastro', page: Page.CADASTRO },
          { icon: Users, label: 'Base de Clientes', page: Page.BASE_CLIENTES },
        ];
        break;
      case UserRole.GESTOR:
        items = [
          { icon: LayoutDashboard, label: 'Dashboard Geral', page: Page.DASHBOARD_GERAL },
          { icon: Users, label: 'Base de Clientes', page: Page.BASE_CLIENTES },
          { icon: Activity, label: 'Painel de Leads', page: Page.PAINEL_LEADS },
          { icon: MapPinned, label: 'Mapa de Gestão', page: Page.MAPA_GESTAO },
          { icon: BadgePercent, label: 'Pricing & Pedidos', page: Page.PRICING },
          { icon: FilePlus, label: 'Cadastro', page: Page.CADASTRO },
          { icon: Settings, label: 'Configuração', page: Page.CONFIGURACAO },
        ];
        break;
      case UserRole.ESTRATEGIA:
        items = [
          { icon: LayoutDashboard, label: 'Dashboard Geral', page: Page.DASHBOARD_GERAL },
          { icon: Target, label: 'Metas & KPI', page: Page.METAS },
          { icon: Activity, label: 'Painel de Leads', page: Page.PAINEL_LEADS },
          { icon: Users, label: 'Base de Clientes', page: Page.BASE_CLIENTES },
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
          { icon: LayoutDashboard, label: 'Painel Logístico', page: Page.LOGISTICA_DASHBOARD },
          { icon: Users, label: 'Base de Clientes', page: Page.BASE_CLIENTES },
        ];
        break;
      case UserRole.ADMIN:
        items = [
          { icon: FileCheck, label: 'Painel de Cadastro', page: Page.CADASTRO },
          { icon: Users, label: 'Base de Clientes', page: Page.BASE_CLIENTES },
        ];
        break;
    }

    // Add Help to all profiles at the end
    items.push({ icon: HelpCircle, label: 'Ajuda & IA', page: Page.AJUDA });
    return items;
  };

  // 2. Bottom Navigation Items (Mobile Quick Access)
  // Ensure Dashboard is CENTRAL (Odd number of items preferred: 3 or 5)
  const getBottomNavItems = () => {
    switch (role) {
      case UserRole.FIELD_SALES:
        return [
          { icon: Calendar, label: 'Agenda', page: Page.AGENDAMENTOS },
          { icon: Map, label: 'Rota', page: Page.ROTAS },
          { icon: LayoutDashboard, label: 'Dash', page: Page.DASHBOARD, isCentral: true }, // Central
          { icon: Activity, label: 'Leads', page: Page.PAINEL_LEADS },
          { icon: BadgePercent, label: 'Pricing', page: Page.PRICING },
        ];
      case UserRole.INSIDE_SALES:
        return [
          { icon: Calendar, label: 'Agenda', page: Page.AGENDAMENTOS },
          { icon: Users, label: 'Base', page: Page.BASE_CLIENTES },
          { icon: LayoutDashboard, label: 'Dash', page: Page.DASHBOARD, isCentral: true }, // Central
          { icon: Activity, label: 'Leads', page: Page.PAINEL_LEADS },
          { icon: BadgePercent, label: 'Pricing', page: Page.PRICING },
        ];
      case UserRole.GESTOR:
        return [
          { icon: MapPinned, label: 'Mapa', page: Page.MAPA_GESTAO },
          { icon: Users, label: 'Base', page: Page.BASE_CLIENTES },
          { icon: LayoutDashboard, label: 'Dash', page: Page.DASHBOARD_GERAL, isCentral: true }, // Central
          { icon: Activity, label: 'Leads', page: Page.PAINEL_LEADS },
          { icon: BadgePercent, label: 'Pricing', page: Page.PRICING },
        ];
      case UserRole.ESTRATEGIA:
        return [
          { icon: Target, label: 'Metas', page: Page.METAS },
          { icon: Activity, label: 'Leads', page: Page.PAINEL_LEADS },
          { icon: LayoutDashboard, label: 'Dash', page: Page.DASHBOARD_GERAL, isCentral: true }, // Central (3 items)
        ];
      case UserRole.PRICING_MANAGER:
        return [
          { icon: TrendingUp, label: 'Mesa', page: Page.MESA_NEGOCIACAO },
          { icon: Percent, label: 'Config', page: Page.CONFIG_TAXAS },
          { icon: LayoutDashboard, label: 'Dash', page: Page.PRICING_DASHBOARD, isCentral: true }, // Central (3 items)
        ];
      case UserRole.LOGISTICA:
        return [
          { icon: Users, label: 'Base', page: Page.BASE_CLIENTES },
          { icon: LayoutDashboard, label: 'Dash', page: Page.LOGISTICA_DASHBOARD, isCentral: true },
        ];
      case UserRole.ADMIN:
        return [
          { icon: Users, label: 'Base', page: Page.BASE_CLIENTES },
          { icon: FileCheck, label: 'Cadastro', page: Page.CADASTRO, isCentral: true },
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();
  const bottomItems = getBottomNavItems();

  const handleMobileNavigate = (page: Page) => {
    onNavigate(page);
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
          
          {/* User Info Badge - Glassy */}
          <div className="flex items-center p-3 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-primary to-brand-dark flex items-center justify-center text-white font-bold text-sm shadow-glow">
                  {role.charAt(0)}
              </div>
              <div className="ml-3 overflow-hidden">
                  <p className="text-xs font-bold text-gray-200 truncate">{role}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_5px_rgba(74,222,128,0.5)]"></span>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Conectado</p>
                  </div>
              </div>
          </div>
        </div>

        <div className="flex-1 py-4 overflow-y-auto z-10">
          <div className="px-6 mb-3">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                  Navegação
              </span>
          </div>
          <nav className="space-y-1 px-3">
            {menuItems.map((item) => {
              const isActive = activePage === item.page;
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
                    <item.icon className={`mr-3 h-5 w-5 transition-transform duration-300 ${isActive ? 'text-brand-primary scale-110' : 'group-hover:text-brand-light'}`} />
                    {item.label}
                  </div>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-brand-primary shadow-glow"></div>}
                </button>
              );
            })}
          </nav>
        </div>
        
        {/* Footer Area */}
        <div className="p-4 border-t border-white/5 bg-black/20 text-center z-10">
            <p className="text-[10px] text-gray-600 font-mono">Build v1.4.0 • 2025</p>
        </div>
    </div>
  );

  return (
    <>
      {/* --- DESKTOP SIDEBAR (Static) --- */}
      <div className="hidden md:flex w-72 glass-panel h-screen flex-col shadow-2xl fixed left-0 top-0 z-50 border-r border-white/5">
         <MenuContent />
      </div>

      {/* --- DESKTOP TOP RIGHT LOGOUT (Positioned Absolute - Non-sticky) --- */}
      <div className="hidden md:flex absolute top-6 right-8 z-[60] items-center gap-3 animate-fade-in">
         {/* Badge removed as requested */}
         <button 
            onClick={onLogout}
            className="bg-white text-gray-400 hover:text-brand-primary hover:bg-red-50 p-2.5 rounded-2xl shadow-sm border border-white transition-all hover:scale-110 group relative"
            title="Sair do Sistema"
         >
            <LogOut size={18} strokeWidth={2.5} />
         </button>
      </div>

      {/* --- MOBILE TOP HEADER (Dark Theme for White Logo) --- */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-brand-gray-900/95 backdrop-blur-lg z-40 px-5 py-3 shadow-md border-b border-white/10 flex justify-between items-center h-16 transition-all">
         {/* Left: Menu Toggle */}
         <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2.5 text-gray-400 hover:text-white bg-white/5 rounded-xl active:scale-95 transition-all border border-white/10"
         >
            <Menu size={22} strokeWidth={2.5} />
         </button>

         {/* Center: Logo (Now White) */}
         <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Logo className="scale-[0.8] origin-center" />
         </div>
         
         {/* Right: Quick Logout */}
         <button 
            onClick={onLogout}
            className="p-2.5 text-gray-400 hover:text-red-400 transition-colors bg-white/5 rounded-xl border border-white/10"
            title="Sair"
         >
            <LogOut size={22} strokeWidth={2.5} />
         </button>
      </div>

      {/* --- MOBILE BOTTOM NAV (Fixed Full Width Bar) --- */}
      {bottomItems.length > 0 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
            {/* 
                Use solid background to prevent transparency issues.
            */}
            <div className="bg-brand-gray-900 border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] flex justify-between items-end h-[4.5rem] px-4 pb-2 relative">
                {bottomItems.map((item, idx) => {
                    const isActive = activePage === item.page;
                    const isCentral = (item as any).isCentral;
                    // Adjusted width logic for dynamic item count
                    const widthClass = bottomItems.length >= 5 ? 'w-1/5' : bottomItems.length === 3 ? 'w-1/3' : bottomItems.length === 2 ? 'w-1/2' : 'w-1/4';

                    // CENTRAL BUTTON RENDER (Floating effect above bar)
                    if (isCentral) {
                        return (
                            <div key={item.label} className={`relative -top-5 flex flex-col items-center justify-start ${widthClass} h-full pointer-events-none`}>
                                <button
                                    onClick={() => onNavigate(item.page)}
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
                            onClick={() => onNavigate(item.page)}
                            className={`relative flex flex-col items-center justify-center ${widthClass} h-full group pb-2`}
                        >
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
