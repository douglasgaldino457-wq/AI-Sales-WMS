
import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, MessageSquare, Sparkles, Maximize2, Minimize2, ChevronDown, Trash2 } from 'lucide-react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { runWithRetry } from '../services/geminiService';
import { useAppStore } from '../services/useAppStore';

interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
}

export const AIAssistant: React.FC = () => {
    const { userRole, currentUser, isAiOpen, toggleAi, setAiOpen } = useAppStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial greeting when opened
    useEffect(() => {
        if (isAiOpen) {
            // Ensure we only greet once
            if (messages.length === 0 && currentUser) {
                 setMessages([{
                    id: 'init',
                    role: 'model',
                    text: `Olá, ${currentUser.name.split(' ')[0]}! Sou o assistente inteligente do AISales. Como posso te ajudar hoje?`,
                    timestamp: new Date()
                }]);
            }
            // Auto focus
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        }
    }, [isAiOpen, currentUser]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isAiOpen) scrollToBottom();
    }, [messages, isAiOpen]);

    const handleClearChat = () => {
        setMessages([{
            id: Date.now().toString(),
            role: 'model',
            text: `Histórico limpo. Como posso ajudar agora?`,
            timestamp: new Date()
        }]);
    };

    const handleSendMessage = async () => {
        if (!inputText.trim()) return;
        
        const userText = inputText;
        setInputText('');
        
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: userText,
            timestamp: new Date()
        };
        
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
             const apiKey = process.env.API_KEY;
             const ai = new GoogleGenAI({ apiKey: apiKey! });
             
             const systemPrompt = `
                Você é o assistente oficial de suporte do aplicativo "AISales WMS" (Webmotors Serviços Automotivos).
                
                PERFIL DO USUÁRIO ATUAL: ${userRole}
                NOME: ${currentUser?.name}
                
                FUNCIONALIDADES DO APP:
                1. Dashboard: KPIs e metas.
                2. Agendamentos (Agenda): Gestão de visitas e carteira.
                3. Rotas: Otimização logística.
                4. Pricing: Simulador de taxas e margem.
                5. Cadastro: Novo credenciamento.
                6. Logística: Gestão de POS e Ativações.
                
                SEU TOM DE VOZ:
                Profissional, curto e direto. Use emojis moderadamente.
             `;
             
             const chat = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: { systemInstruction: systemPrompt },
                history: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }))
             });
             
             const result = await runWithRetry<GenerateContentResponse>(() => chat.sendMessage({ message: userText }));
             
             const modelMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: result.text || "Desculpe, não entendi.",
                timestamp: new Date()
             };
             setMessages(prev => [...prev, modelMsg]);
        } catch (error) {
            console.error(error);
            const errorMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: "Estou enfrentando uma instabilidade momentânea. Tente novamente em instantes.",
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

    if (!userRole) return null; 

    return (
        <>
            {/* TRIGGER BUTTON - FIXED BOTTOM RIGHT */}
            <div className="fixed z-[10000] bottom-24 md:bottom-6 right-6">
                <button 
                    onClick={toggleAi}
                    className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 border-4 border-white group
                        ${isAiOpen ? 'bg-brand-gray-900 rotate-90' : 'bg-brand-primary hover:shadow-glow'}
                    `}
                    title="Assistente IA"
                >
                    {isAiOpen ? <X className="w-6 h-6 text-white" /> : <Bot className="w-8 h-8 text-white group-hover:animate-pulse" />}
                    
                    {!isAiOpen && (
                        <span className="absolute top-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
                    )}
                </button>
            </div>

            {/* CHAT WINDOW POPUP - FIXED RELATIVE TO VIEWPORT */}
            {isAiOpen && (
                <div className={`fixed shadow-2xl rounded-2xl border border-brand-gray-200 flex flex-col transition-all duration-300 overflow-hidden font-sans bg-white
                    ${isExpanded 
                        ? 'inset-4 md:inset-10 z-[10001]' 
                        : 'bottom-40 md:bottom-24 right-6 w-[90vw] md:w-[380px] h-[550px] max-h-[60vh] md:max-h-[75vh] z-[10001]'
                    } animate-slide-in-right origin-bottom-right
                `}>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-brand-gray-900 to-brand-gray-800 p-4 flex justify-between items-center text-white shrink-0 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                        
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 shadow-inner">
                                <Sparkles className="w-5 h-5 text-brand-primary" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm tracking-wide">Assistente IA</h3>
                                <p className="text-[10px] text-gray-300 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 relative z-10">
                            <button onClick={handleClearChat} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors" title="Limpar Conversa">
                                <Trash2 size={16} />
                            </button>
                            <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors hidden md:block">
                                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                            </button>
                            <button onClick={() => setAiOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors md:hidden">
                                <ChevronDown size={20} />
                            </button>
                        </div>
                    </div>
                    
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 bg-brand-gray-50 space-y-4 scroll-smooth">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm text-sm leading-relaxed whitespace-pre-wrap relative
                                    ${msg.role === 'user' 
                                        ? 'bg-brand-primary text-white rounded-tr-none' 
                                        : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'}
                                `}>
                                    {msg.text}
                                    <span className={`block text-[9px] mt-1 text-right opacity-60 ${msg.role === 'user' ? 'text-white' : 'text-gray-400'}`}>
                                        {msg.timestamp.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none p-3 shadow-sm flex items-center gap-1.5 w-fit">
                                    <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce delay-75"></div>
                                    <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce delay-150"></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white border-t border-brand-gray-100">
                        <div className="relative flex items-center bg-brand-gray-50 border border-brand-gray-200 rounded-xl px-2 py-1 focus-within:ring-2 focus-within:ring-brand-primary/20 focus-within:border-brand-primary transition-all">
                            <input 
                                type="text" 
                                className="w-full bg-transparent border-none py-2.5 pl-2 pr-10 text-sm focus:ring-0 text-gray-800 placeholder:text-gray-400"
                                placeholder="Digite sua dúvida..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isLoading}
                                autoFocus
                            />
                            <button 
                                onClick={handleSendMessage}
                                disabled={!inputText.trim() || isLoading}
                                className="absolute right-2 p-1.5 bg-brand-primary text-white rounded-lg hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-[9px] text-center text-gray-400 mt-2">
                            IA treinada no contexto do seu perfil ({userRole}).
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
