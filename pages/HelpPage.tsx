
import React, { useState, useRef, useEffect } from 'react';
import { 
    HelpCircle, BookOpen, Send, Bot, User, MessageSquare, 
    ChevronRight, Sparkles, Youtube, FileText, BadgePercent, Map, Users, Settings, MapPinned
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { UserRole } from '../types';

interface HelpPageProps {
    role: UserRole;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
}

interface Tutorial {
    title: string;
    desc: string;
    icon: any;
    colorClass: string;
    query: string; // The prompt to send to AI
}

const HelpPage: React.FC<HelpPageProps> = ({ role }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            role: 'model',
            text: `Olá, ${role}! Sou o assistente virtual do AISales. Selecione um dos tutoriais ao lado ou digite sua dúvida sobre o sistema.`,
            timestamp: new Date()
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // --- Role-Based Tutorials Configuration ---
    const getTutorials = (): Tutorial[] => {
        switch (role) {
            case UserRole.FIELD_SALES:
                return [
                    {
                        title: "Minha Rota Diária",
                        desc: "Como otimizar a rota e usar o GPS.",
                        icon: Map,
                        colorClass: "bg-blue-100 text-blue-600",
                        query: "Explique passo a passo como uso a funcionalidade de Rotas e Otimização no perfil Field Sales."
                    },
                    {
                        title: "Check-in e Relatórios",
                        desc: "Registrando visitas e feedback.",
                        icon: FileText,
                        colorClass: "bg-orange-100 text-orange-600",
                        query: "Como faço check-in em uma visita e preencho o relatório final no app?"
                    },
                    {
                        title: "Simulador de Taxas",
                        desc: "Calculando antecipação e comparando.",
                        icon: BadgePercent,
                        colorClass: "bg-green-100 text-green-600",
                        query: "Como uso o Pricing para simular taxas e comparar com concorrentes como a Stone?"
                    }
                ];
            case UserRole.INSIDE_SALES:
                return [
                    {
                        title: "Agendar Visitas",
                        desc: "Criando demandas para o time de rua.",
                        icon: BookOpen,
                        colorClass: "bg-purple-100 text-purple-600",
                        query: "Como faço para criar um novo agendamento de visita para um consultor Field?"
                    },
                    {
                        title: "Gestão de Carteira",
                        desc: "Filtrando e acionando clientes.",
                        icon: Users,
                        colorClass: "bg-blue-100 text-blue-600",
                        query: "Como filtro e visualizo os clientes da minha carteira na página de Agendamentos?"
                    },
                    {
                        title: "Cadastro de Leads",
                        desc: "Inserindo novos clientes manualmente.",
                        icon: FileText,
                        colorClass: "bg-orange-100 text-orange-600",
                        query: "Qual o processo para cadastrar um novo Lead manualmente no sistema?"
                    }
                ];
            case UserRole.GESTOR:
                return [
                    {
                        title: "Importação de Base",
                        desc: "Como carregar planilhas de clientes.",
                        icon: FileText,
                        colorClass: "bg-green-100 text-green-600",
                        query: "Explique como funciona a importação de planilhas Excel na página Base de Clientes para o Gestor."
                    },
                    {
                        title: "Mapa de Gestão",
                        desc: "Analisando territórios e conflitos.",
                        icon: MapPinned,
                        colorClass: "bg-red-100 text-red-600",
                        query: "Como uso o Mapa de Gestão para ver a distribuição dos meus consultores e gerar insights?"
                    },
                    {
                        title: "Gestão de Usuários",
                        desc: "Adicionando e editando a equipe.",
                        icon: Settings,
                        colorClass: "bg-gray-100 text-gray-600",
                        query: "Como adiciono, edito ou inativo usuários no módulo de Configuração?"
                    }
                ];
            default:
                return [
                    {
                        title: "Visão Geral",
                        desc: "Entendendo os módulos do sistema.",
                        icon: HelpCircle,
                        colorClass: "bg-brand-light/10 text-brand-primary",
                        query: "Faça um resumo geral de todos os módulos disponíveis no sistema AISales."
                    }
                ];
        }
    };

    const tutorials = getTutorials();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (textOverride?: string) => {
        const textToSend = textOverride || inputText;
        if (!textToSend.trim()) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: textToSend,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        if (!textOverride) setInputText('');
        setIsLoading(true);

        try {
            const apiKey = process.env.API_KEY;
            const ai = new GoogleGenAI({ apiKey: apiKey! });
            
            const systemPrompt = `
                Você é o assistente oficial de suporte do aplicativo "AISales WMS" (Webmotors Serviços Automotivos).
                
                PERFIL DO USUÁRIO ATUAL: ${role}
                
                FUNCIONALIDADES DO APP:
                1. Dashboard: KPIs e metas.
                2. Agendamentos (Agenda):
                   - Inside: Cria visitas, gere carteira.
                   - Field: Visualiza agenda, faz check-in, preenche relatórios.
                3. Rotas (Apenas Field): Otimização de visitas no mapa.
                4. Pricing: Simulador de taxas (MDR + Antecipação). Comparação com concorrentes.
                5. Cadastro: Formulário manual de Leads/Clientes.
                6. Base de Clientes: Lista geral. Gestor pode importar Excel.
                7. Mapa de Gestão (Gestor): Visão global de territórios.
                8. Configuração (Gestor): Cadastrar usuários, editar motivos de visita.
                
                SEU TOM DE VOZ:
                Didático, amigável e direto. Use emojis para separar tópicos.
                Foque na ação prática ("Clique em X", "Vá para Y").
            `;

            const chat = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: systemPrompt,
                },
                history: messages.map(m => ({
                    role: m.role,
                    parts: [{ text: m.text }]
                }))
            });

            const result = await chat.sendMessage({ message: userMsg.text });
            
            const modelMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: result.text || "Desculpe, não consegui processar sua dúvida.",
                timestamp: new Date()
            };

            setMessages(prev => [...prev, modelMsg]);

        } catch (error) {
            console.error("Erro no chat:", error);
            const errorMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: "Estou enfrentando uma instabilidade momentânea. Tente novamente em alguns segundos.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleTutorialClick = (tutorial: Tutorial) => {
        handleSendMessage(tutorial.query);
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-6">
            
            {/* LEFT: Tutorials & FAQ */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <HelpCircle className="w-8 h-8 text-brand-primary" />
                        Ajuda & Suporte
                    </h1>
                    <p className="text-brand-gray-600 mt-1 text-sm">Tutoriais para o perfil <strong>{role}</strong>.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                    {tutorials.map((t, idx) => {
                        const Icon = t.icon;
                        return (
                            <div 
                                key={idx}
                                onClick={() => handleTutorialClick(t)}
                                className="bg-white p-4 rounded-xl border border-brand-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-95"
                            >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${t.colorClass}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-brand-gray-900 text-sm mb-1 group-hover:text-brand-primary transition-colors">{t.title}</h3>
                                <p className="text-xs text-brand-gray-500 leading-relaxed">{t.desc}</p>
                                <div className="mt-3 flex items-center text-[10px] font-bold text-brand-gray-400 uppercase tracking-wide group-hover:text-brand-primary">
                                    Ver Tutorial <ChevronRight className="w-3 h-3 ml-1" />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="bg-brand-gray-900 rounded-xl p-5 text-white relative overflow-hidden mt-auto">
                    <div className="relative z-10">
                        <h3 className="font-bold text-lg mb-2">Precisa de suporte humano?</h3>
                        <p className="text-xs text-gray-400 mb-4">Se o assistente virtual não resolver, abra um chamado para TI.</p>
                        <button className="bg-white text-brand-gray-900 px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors">
                            Abrir Chamado
                        </button>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary rounded-full blur-3xl opacity-20 transform translate-x-10 -translate-y-10"></div>
                </div>
            </div>

            {/* RIGHT: AI Chat Interface */}
            <div className="flex-1 bg-white rounded-2xl shadow-lg border border-brand-gray-200 flex flex-col overflow-hidden relative">
                {/* Chat Header */}
                <div className="bg-brand-gray-50 border-b border-brand-gray-100 p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-brand-dark flex items-center justify-center text-white shadow-lg">
                            <Bot className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-brand-gray-900 text-sm">Assistente IA</h3>
                            <p className="text-xs text-brand-gray-500 flex items-center">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                                Online • Gemini 2.5 Flash
                            </p>
                        </div>
                    </div>
                    <div className="bg-brand-light/10 text-brand-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        BETA
                    </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/50 relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
                    
                    {messages.map((msg) => (
                        <div 
                            key={msg.id} 
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-sm leading-relaxed relative whitespace-pre-wrap
                                ${msg.role === 'user' 
                                    ? 'bg-brand-primary text-white rounded-tr-none' 
                                    : 'bg-brand-gray-100 text-brand-gray-800 rounded-tl-none border border-brand-gray-200'}
                            `}>
                                {msg.role === 'model' && (
                                    <Sparkles className="w-3 h-3 text-brand-primary absolute -top-1.5 -left-1.5 bg-white rounded-full" />
                                )}
                                {msg.text}
                                <span className={`block text-[9px] mt-2 opacity-60 text-right
                                    ${msg.role === 'user' ? 'text-white' : 'text-brand-gray-500'}
                                `}>
                                    {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-brand-gray-50 rounded-2xl rounded-tl-none p-4 border border-brand-gray-100 flex items-center gap-2">
                                <div className="w-2 h-2 bg-brand-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-brand-gray-400 rounded-full animate-bounce delay-75"></div>
                                <div className="w-2 h-2 bg-brand-gray-400 rounded-full animate-bounce delay-150"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-4 bg-white border-t border-brand-gray-100">
                    <div className="relative flex items-center">
                        <input 
                            type="text" 
                            className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-xl pl-4 pr-12 py-3.5 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all shadow-inner"
                            placeholder="Digite sua dúvida sobre o sistema..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                        />
                        <button 
                            onClick={() => handleSendMessage()}
                            disabled={!inputText.trim() || isLoading}
                            className="absolute right-2 p-2 bg-brand-primary text-white rounded-lg hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-[10px] text-center text-brand-gray-400 mt-2">
                        A IA pode cometer erros. Verifique informações críticas com seu gestor.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default HelpPage;
