
import React, { useState, useEffect } from 'react';
import { UserRole, Page } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import RoutesPage from './pages/RoutesPage';
import BaseClientesPage from './pages/BaseClientesPage';
import AgendamentosPage from './pages/AgendamentosPage';
import ConfiguracaoPage from './pages/ConfiguracaoPage';
import MapaGestaoPage from './pages/MapaGestaoPage';
import PricingPage from './pages/PricingPage';
import ConfigTaxasPage from './pages/ConfigTaxasPage';
import CadastroPage from './pages/CadastroPage';
import HelpPage from './pages/HelpPage';
import { Logo } from './components/Logo';
import { User, CheckCircle2, ArrowRight, Target, HardHat, RefreshCw, BadgePercent } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);
  
  // Login Background State
  const [bgImage, setBgImage] = useState<string | null>(localStorage.getItem('app_bg_image'));
  const [generatingBg, setGeneratingBg] = useState(false);

  const handleLogin = (role: UserRole) => {
    setCurrentUserRole(role);
    if (role === UserRole.INSIDE_SALES) setCurrentPage(Page.DASHBOARD);
    else if (role === UserRole.FIELD_SALES) setCurrentPage(Page.DASHBOARD);
    else if (role === UserRole.ESTRATEGIA) setCurrentPage(Page.METAS);
    else if (role === UserRole.PRICING) setCurrentPage(Page.PRICING);
    else setCurrentPage(Page.DASHBOARD_GERAL);
  };

  const handleLogout = () => {
    setCurrentUserRole(null);
  };

  const generateBackground = async (force = false) => {
    if (bgImage && !force) return;
    
    setGeneratingBg(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: 'Wide angle view of a futuristic automotive workshop interior. Ideally positioned in the center is a modern silver hatchback car with the hood open. A sleek, high-tech red robotic arm is interacting with the engine. A professional red tool chest is visible. The environment is clean, with bright studio lighting, polished concrete floor, and depth of field blurring the background equipment. Photorealistic, 8k resolution, cinematic.',
        });
        
        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64String = part.inlineData.data;
                    const url = `data:image/png;base64,${base64String}`;
                    setBgImage(url);
                    localStorage.setItem('app_bg_image', url);
                    break;
                }
            }
        }
    } catch (e) {
        console.error("Failed to generate background", e);
    } finally {
        setGeneratingBg(false);
    }
  };

  useEffect(() => {
    if (!currentUserRole && !bgImage) {
        generateBackground();
    }
  }, [currentUserRole, bgImage]);

  // Modern Login Screen
  if (!currentUserRole) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden transition-all duration-1000 ease-in-out bg-brand-gray-900"
        style={{
            backgroundImage: bgImage ? `url(${bgImage})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        }}
      >
        {/* Dynamic Overlay - Darker for better text contrast since card is gone */}
        <div className={`absolute inset-0 transition-opacity duration-1000 ${bgImage ? 'bg-black/50 backdrop-blur-[4px]' : 'bg-brand-gray-900'}`}></div>

        {/* Fallback Effects if no image */}
        {!bgImage && (
            <>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
            </>
        )}

        {/* Refresh BG Button - Floating Top Right */}
        <button 
            onClick={() => generateBackground(true)}
            disabled={generatingBg}
            className={`absolute top-6 right-6 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/20 z-20 ${generatingBg ? 'animate-spin' : ''}`}
            title="Gerar novo fundo com IA"
        >
            <RefreshCw size={18} />
        </button>

        {/* Content Wrapper - No Card Background */}
        <div className="max-w-md w-full relative z-10 flex flex-col items-center">
          
          <div className="flex flex-col items-center mb-10">
            <div className="scale-125 mb-6 drop-shadow-2xl">
                 {/* Updated to use 'white' type for dark background */}
                 <Logo type="white" />
            </div>
            <h2 className="text-3xl font-bold text-center text-white drop-shadow-md">Bem-vindo</h2>
            <p className="text-center text-white/80 text-sm mt-2 font-medium tracking-wide drop-shadow-sm">Portal Integrado de Vendas & Gestão</p>
            {generatingBg && <span className="text-[10px] text-brand-light mt-3 animate-pulse font-bold bg-black/30 px-3 py-1 rounded-full border border-white/10">Criando ambiente tecnológico...</span>}
          </div>

          <div className="space-y-4 w-full">
            {[UserRole.INSIDE_SALES, UserRole.FIELD_SALES, UserRole.GESTOR, UserRole.ESTRATEGIA, UserRole.PRICING].map((role) => (
              <button
                key={role}
                onClick={() => handleLogin(role)}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md hover:bg-brand-primary hover:border-brand-primary hover:shadow-glow hover:scale-105 transition-all group duration-300"
              >
                <div className="flex items-center relative z-10">
                  <div className={`text-white p-2 rounded-xl mr-4 bg-white/10 group-hover:bg-white group-hover:text-brand-primary transition-colors shadow-sm`}>
                    {role === UserRole.ESTRATEGIA ? <Target size={20} strokeWidth={2.5} /> : 
                     role === UserRole.PRICING ? <BadgePercent size={20} strokeWidth={2.5} /> :
                     <User size={20} strokeWidth={2.5} />}
                  </div>
                  <span className="font-bold text-base text-white tracking-wide">{role}</span>
                </div>
                <div className="bg-white/10 rounded-full p-1 group-hover:bg-white/20 transition-colors">
                    <ArrowRight className="text-white/70 group-hover:text-white transform group-hover:translate-x-1 transition-all" size={18} />
                </div>
              </button>
            ))}
          </div>
          
          <p className="mt-12 text-center text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">
            © 2025 COMERCIAL CAR10
          </p>
        </div>
      </div>
    );
  }

  // Main App Layout
  return (
    <div className="min-h-screen font-sans text-brand-gray-900 relative bg-[#F8F9FC]">
      <Sidebar 
        role={currentUserRole} 
        activePage={currentPage} 
        onNavigate={setCurrentPage} 
        onLogout={handleLogout}
      />
      
      <main className="md:ml-72 min-h-screen p-4 pt-20 pb-32 md:p-10 md:pt-10 transition-all overflow-x-hidden">
        {/* Dynamic Content */}
        {(currentPage === Page.DASHBOARD || currentPage === Page.DASHBOARD_GERAL) && (
            <Dashboard role={currentUserRole} />
        )}
        
        {(currentPage === Page.ROTAS) && (
            <RoutesPage />
        )}
        
        {(currentPage === Page.BASE_CLIENTES) && (
            <BaseClientesPage role={currentUserRole} />
        )}

        {(currentPage === Page.AGENDAMENTOS) && (
            <AgendamentosPage role={currentUserRole} />
        )}

        {(currentPage === Page.CONFIGURACAO) && (
            <ConfiguracaoPage />
        )}

        {(currentPage === Page.MAPA_GESTAO) && (
            <MapaGestaoPage />
        )}

        {(currentPage === Page.PRICING) && (
            <PricingPage role={currentUserRole} />
        )}

        {(currentPage === Page.CONFIG_TAXAS) && (
            <ConfigTaxasPage />
        )}

        {(currentPage === Page.CADASTRO) && (
            <CadastroPage />
        )}

        {(currentPage === Page.AJUDA) && (
            <HelpPage role={currentUserRole} />
        )}

        {(currentPage === Page.METAS) && (
           <div className="flex flex-col items-center justify-center h-[70vh] text-gray-400 animate-fade-in">
              <div className="bg-white p-8 md:p-12 rounded-3xl text-center max-w-lg shadow-xl border border-brand-gray-100 relative overflow-hidden mx-4">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-gray-200 via-brand-primary to-brand-gray-200"></div>
                <div className="w-24 h-24 bg-brand-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Target className="text-brand-primary animate-pulse" size={48} />
                </div>
                <h2 className="text-2xl font-bold mb-3 text-brand-gray-900">Módulo de Estratégia</h2>
                <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-6 border border-yellow-200">
                    Em Construção
                </span>
                <p className="text-brand-gray-600 mb-6 leading-relaxed text-sm md:text-base">
                    Estamos desenvolvendo a interface para input e gestão de metas da equipe.
                </p>
              </div>
           </div>
        )}
        
        {/* Fallback */}
        {(currentPage === Page.VISITAS) && (
           <div className="flex flex-col items-center justify-center h-[70vh] text-gray-400">
              <div className="tech-card p-12 rounded-3xl text-center max-w-lg">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <User className="text-gray-300" size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-gray-900">Em Breve</h2>
                <p>O módulo de <strong>{currentPage}</strong> está sendo desenhado pela nossa equipe de produto.</p>
              </div>
           </div>
        )}
      </main>
    </div>
  );
};

export default App;
