
import React, { useEffect, useState } from 'react';
import { UserRole, Page, SystemUser } from './types';
import { useAppStore } from './services/useAppStore';
import { appStore } from '../services/store'; 
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import RoutesPage from './pages/RoutesPage';
import BaseClientesPage from './pages/BaseClientesPage';
import AgendamentosPage from './pages/AgendamentosPage';
import ConfiguracaoPage from './pages/ConfiguracaoPage';
import MapaGestaoPage from './pages/MapaGestaoPage';
import PricingPage from './pages/PricingPage';
import CadastroPage from './pages/CadastroPage';
import HelpPage from './pages/HelpPage'; 
import PricingDashboardPage from './pages/PricingDashboardPage';
import MesaNegociacaoPage from './pages/MesaNegociacaoPage';
import ConfigTaxasPage from './pages/ConfigTaxasPage';
import PainelLeadsPage from './pages/PainelLeadsPage';
import LogisticaDashboardPage from './pages/LogisticaDashboardPage';
import LogisticaEstoquePage from './pages/LogisticaEstoquePage';
import LogisticaAtivacoesPage from './pages/LogisticaAtivacoesPage';
import LogisticaSuportePage from './pages/LogisticaSuportePage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminDemandsPage from './pages/AdminDemandsPage';
import UsuariosPage from './pages/UsuariosPage';
import PedidosRastreioPage from './pages/PedidosRastreioPage';
import ProfilePage from './pages/ProfilePage';
import DespesasPage from './pages/DespesasPage';
import { Logo } from './components/Logo';
import { AIAssistant } from './components/AIAssistant';
import { NotificationToast } from './components/NotificationToast';
import { User, ArrowRight, RefreshCw, TrendingUp, Truck, ShieldCheck, Mail, Lock, KeyRound, WifiOff, ChevronRight, DollarSign, Star } from 'lucide-react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { runWithRetry } from './services/geminiService';
import { MOCK_USERS } from './constants';

const App: React.FC = () => {
  const { 
    userRole,
    currentUser, 
    currentPage, 
    targetDemandId, 
    bgImage, 
    isGeneratingBg, 
    login,
    logout, 
    navigate,
    setBgImage, 
    setGeneratingBg 
  } = useAppStore();

  const [loginStep, setLoginStep] = useState<'CREDENTIALS' | 'OTP'>('CREDENTIALS');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleTestLogin = (role: UserRole) => {
    const storeUsers = appStore.getUsers();
    let demoUser = storeUsers.find(u => u.role === role);
    
    if (!demoUser) {
        demoUser = MOCK_USERS.find(u => u.role === role);
    }

    if (!demoUser) {
        demoUser = {
            id: `999-${role}`,
            name: `Usuário ${role}`,
            role: role,
            email: `${role.toLowerCase().replace(' ', '.')}@car10.com.br`,
            whatsapp: '11999999999',
            active: true
        };
    }
    login(demoUser);
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError(null);
      if(!email || !password) { setLoginError("Preencha e-mail e senha."); return; }
      setIsProcessing(true);
      const storeUsers = appStore.getUsers();
      const validUser = storeUsers.find(u => u.email === email);
      setTimeout(() => {
          setIsProcessing(false);
          if (validUser) { setLoginStep('OTP'); } 
          else { setLoginError("Usuário não encontrado."); }
      }, 1000);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError(null);
      if(!otp) { setLoginError("Digite o código recebido."); return; }
      setIsProcessing(true);
      setTimeout(() => {
          setIsProcessing(false);
          const storeUsers = appStore.getUsers();
          const foundUser = storeUsers.find(u => u.email === email);
          if (foundUser) { login(foundUser); } 
          else { 
              const tempUser: SystemUser = {
                  id: 'temp-001',
                  name: email.split('@')[0],
                  role: UserRole.FIELD_SALES,
                  email: email,
                  whatsapp: '',
                  active: true
              };
              login(tempUser);
          }
      }, 1000);
  };

  const generateBackground = async (force = false) => {
    if (bgImage && !force) return;
    if (isOffline) return;
    if (sessionStorage.getItem('gemini_quota_exceeded') === 'true') return;
    setGeneratingBg(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: 'Wide angle view of a futuristic automotive workshop interior...',
        }));
        if (response.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
            const url = `data:image/png;base64,${response.candidates[0].content.parts[0].inlineData.data}`;
            setBgImage(url);
        }
    } catch (e) { console.error(e); } finally { setGeneratingBg(false); }
  };

  useEffect(() => { if (!userRole && !bgImage) generateBackground(); }, [userRole, bgImage]);

  if (!userRole) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row relative overflow-hidden transition-all duration-1000 ease-in-out bg-brand-gray-900" style={{ backgroundImage: bgImage ? `url(${bgImage})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className={`absolute inset-0 transition-opacity duration-1000 ${bgImage ? 'bg-black/60 backdrop-blur-[4px]' : 'bg-brand-gray-900'}`}></div>
        {isOffline && <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-xs font-bold text-center py-2 z-50"><WifiOff size={14} className="inline mr-2" /> Modo Offline.</div>}
        
        {/* LOGIN FORM */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 min-h-[500px]">
            <div className="max-w-md w-full flex flex-col items-center">
                <div className="flex flex-col items-center mb-8"><div className="scale-125 mb-6 drop-shadow-2xl"><Logo className="text-white" /></div><h2 className="text-3xl font-bold text-center text-white drop-shadow-md">Bem-vindo</h2><p className="text-center text-white/80 text-sm mt-2 font-medium tracking-wide drop-shadow-sm">Portal Integrado de Vendas & Gestão</p></div>
                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl w-full shadow-2xl">
                    {loginStep === 'CREDENTIALS' ? (
                        <form onSubmit={handleCredentialsSubmit} className="space-y-5 animate-fade-in">
                            <div><label className="block text-xs font-bold text-gray-300 uppercase mb-1">E-mail Corporativo</label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="email" required className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-brand-primary outline-none" placeholder="nome@empresa.com.br" value={email} onChange={e => setEmail(e.target.value)}/></div></div>
                            <div><label className="block text-xs font-bold text-gray-300 uppercase mb-1">Senha</label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="password" required className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-brand-primary outline-none" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}/></div></div>
                            {loginError && <p className="text-red-400 text-xs font-bold text-center bg-red-500/10 py-2 rounded">{loginError}</p>}
                            <button type="submit" disabled={isProcessing || isOffline} className="w-full bg-brand-primary hover:bg-brand-dark text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 group">{isProcessing ? 'Validando...' : 'Acessar Conta'}{!isProcessing && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}</button>
                        </form>
                    ) : (
                        <form onSubmit={handleOtpSubmit} className="space-y-6 animate-fade-in">
                            <div className="text-center"><div className="w-16 h-16 bg-brand-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-primary/30"><KeyRound className="w-8 h-8 text-brand-primary" /></div><h3 className="text-white font-bold text-lg">Verificação em Duas Etapas</h3><p className="text-gray-400 text-xs mt-2">Enviamos um código para seu WhatsApp/Email.</p></div>
                            <div className="relative"><input type="text" required maxLength={6} className="w-full bg-white/5 border border-white/10 rounded-xl py-4 text-center text-2xl font-mono tracking-[0.5em] text-white placeholder:text-gray-600 focus:ring-2 focus:ring-brand-primary outline-none" placeholder="000000" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,''))} autoFocus /></div>
                            {loginError && <p className="text-red-400 text-xs font-bold text-center bg-red-500/10 py-2 rounded">{loginError}</p>}
                            <button type="submit" disabled={isProcessing} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">{isProcessing ? 'Verificando...' : 'Confirmar Token'}{!isProcessing && <ShieldCheck size={18} />}</button>
                            <button type="button" onClick={() => setLoginStep('CREDENTIALS')} className="w-full text-gray-400 text-xs hover:text-white transition-colors">Voltar para Login</button>
                        </form>
                    )}
                </div>
            </div>
        </div>
        
        {/* DEV TOOLS SIDEBAR */}
        <div className="w-full md:w-80 bg-black/40 backdrop-blur-md border-t md:border-t-0 md:border-l border-white/10 p-6 flex flex-col justify-center gap-4 relative z-20 overflow-y-auto max-h-[40vh] md:max-h-full">
            <div className="mb-2"><h3 className="text-white text-xs font-bold uppercase tracking-widest opacity-50 mb-1">Ambiente de Teste</h3><p className="text-xs text-gray-400">Selecione um perfil para simular o acesso.</p></div>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
                {[
                    UserRole.INSIDE_SALES, 
                    UserRole.FIELD_SALES, 
                    UserRole.GESTOR, 
                    UserRole.PRICING_MANAGER, 
                    UserRole.LOGISTICA, 
                    UserRole.ADMIN,
                    UserRole.FINANCEIRO,
                    UserRole.QUALIDADE
                ].map((role) => (
                    <button key={role} onClick={() => handleTestLogin(role)} className="flex items-center p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 hover:border-brand-primary/50 transition-all group text-left">
                        <div className={`mr-3 p-2 rounded bg-black/20 text-white/70 group-hover:text-white group-hover:bg-brand-primary transition-colors`}>
                            {role === UserRole.LOGISTICA ? <Truck size={14} /> : 
                             role === UserRole.ADMIN ? <ShieldCheck size={14} /> : 
                             role === UserRole.FINANCEIRO ? <DollarSign size={14} /> :
                             role === UserRole.QUALIDADE ? <Star size={14} /> :
                             <User size={14} />}
                        </div>
                        <div className="flex-1 min-w-0"><span className="text-[10px] font-bold text-white/90 block group-hover:text-brand-primary transition-colors truncate">{role}</span></div>
                        <ChevronRight size={14} className="text-white/20 group-hover:text-white/60 ml-2 shrink-0" />
                    </button>
                ))}
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans text-brand-gray-900 relative bg-[#F8F9FC]">
      {isOffline && <div className="fixed top-4 right-4 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg z-[2000] flex items-center justify-center gap-2 animate-pulse"><WifiOff size={14} /> Offline</div>}
      <NotificationToast />
      <Sidebar />
      <AIAssistant />
      <main className={`md:ml-72 min-h-screen p-4 pb-32 md:p-10 md:pt-10 transition-all overflow-x-hidden ${isOffline ? 'pt-8' : 'pt-20'}`}>
        
        {/* === ADMIN ROUTES === */}
        {userRole === UserRole.ADMIN && (
            <>
                {currentPage === Page.DASHBOARD && <AdminDashboardPage />}
                {currentPage === Page.ADMIN_DEMANDS && <AdminDemandsPage />}
                {currentPage === Page.USUARIOS && <UsuariosPage />}
            </>
        )}

        {/* === LOGISTICS ROUTES === */}
        {userRole === UserRole.LOGISTICA && (
            <>
                {(currentPage === Page.LOGISTICA_DASHBOARD || currentPage === Page.DASHBOARD) && <LogisticaDashboardPage />}
                {currentPage === Page.LOGISTICA_ESTOQUE && <LogisticaEstoquePage />}
                {currentPage === Page.LOGISTICA_ATIVACOES && <LogisticaAtivacoesPage />}
                {currentPage === Page.LOGISTICA_SUPORTE && <LogisticaSuportePage />}
            </>
        )}

        {/* === SHARED / SALES ROUTES === */}
        {(userRole !== UserRole.LOGISTICA && userRole !== UserRole.ADMIN) && (
            <>
                {(currentPage === Page.DASHBOARD || currentPage === Page.DASHBOARD_GERAL) && <Dashboard role={userRole} />}
                {currentPage === Page.ROTAS && <RoutesPage />}
                {currentPage === Page.BASE_CLIENTES && <BaseClientesPage role={userRole} />}
                {currentPage === Page.AGENDAMENTOS && <AgendamentosPage role={userRole} />}
                {currentPage === Page.CONFIGURACAO && <ConfiguracaoPage />}
                {currentPage === Page.MAPA_GESTAO && <MapaGestaoPage />}
                {currentPage === Page.PRICING && <PricingPage role={userRole} />}
                {currentPage === Page.CADASTRO && <CadastroPage role={userRole} />}
                {currentPage === Page.PRICING_DASHBOARD && <PricingDashboardPage />}
                {currentPage === Page.MESA_NEGOCIACAO && <MesaNegociacaoPage />}
                {currentPage === Page.CONFIG_TAXAS && <ConfigTaxasPage />}
                {currentPage === Page.PAINEL_LEADS && <PainelLeadsPage />}
                {currentPage === Page.PEDIDOS_RASTREIO && <PedidosRastreioPage targetDemandId={targetDemandId} />}
                {currentPage === Page.DESPESAS && <DespesasPage />}
                
                {/* QUALITY & SUPPORT SPECIFIC (Accessible by QUALIDADE role) */}
                {userRole === UserRole.QUALIDADE && currentPage === Page.LOGISTICA_SUPORTE && <LogisticaSuportePage />}
                {/* FINANCEIRO & QUALIDADE User Management */}
                {(userRole === UserRole.FINANCEIRO || userRole === UserRole.QUALIDADE || userRole === UserRole.GESTOR) && currentPage === Page.USUARIOS && <UsuariosPage />}
            </>
        )}
        
        {currentPage === Page.PERFIL && <ProfilePage />}
        {currentPage === Page.AJUDA && <HelpPage role={userRole} />}
      </main>
    </div>
  );
};

export default App;
