
import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, MessageSquare, Sparkles, Maximize2, Minimize2, ChevronDown, Trash2, Paperclip, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { runWithRetry } from '../services/geminiService';
import { useAppStore } from '../services/useAppStore';
import { appStore } from '../services/store';
import { BUSINESS_GLOSSARY, BUSINESS_RULES, FAQ_ANSWERS, getContextForRole } from '../services/knowledgeBase';

interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
    attachment?: {
        type: 'image' | 'pdf';
        previewUrl?: string; // For images
        name: string;
    };
}

export const AIAssistant: React.FC = () => {
    const { userRole, currentUser, isAiOpen, toggleAi, setAiOpen } = useAppStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // File State
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial greeting when opened
    useEffect(() => {
        if (isAiOpen) {
            // Ensure we only greet once
            if (messages.length === 0 && currentUser) {
                 setMessages([{
                    id: 'init',
                    role: 'model',
                    text: `Olá, ${currentUser.name.split(' ')[0]}! Sou o assistente inteligente do App. Posso ajudar com regras de negócio, status de pedidos ou analisar documentos e imagens.`,
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
        setAttachedFile(null);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAttachedFile(e.target.files[0]);
        }
    };

    const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    // Remove data URL prefix (e.g., "data:image/png;base64,")
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                } else {
                    reject(new Error("Failed to convert file"));
                }
            };
            reader.onerror = error => reject(error);
        });
    };

    // --- CONTEXT BUILDER FUNCTION ---
    const buildSystemPrompt = () => {
        // 1. Get Live Data from Store
        const demands = appStore.getDemands();
        const pendingDemands = demands.filter(d => d.status === 'Pendente' || d.status === 'Em Análise').length;
        const myPendingDemands = demands.filter(d => d.requester === currentUser?.name && (d.status === 'Pendente' || d.status === 'Em Análise')).length;
        
        const notifications = appStore.getNotifications().filter(n => !n.read).length;
        
        // 2. Build the Prompt
        return `
            ATUAÇÃO:
            Você é o assistente oficial de suporte e operações da "Pagmotors" (Webmotors Serviços Automotivos).
            Seu objetivo é ajudar o colaborador a ser mais eficiente, tirando dúvidas sobre processos, sistemas (SIC) e status de demandas.

            PERFIL DO USUÁRIO:
            Nome: ${currentUser?.name}
            Cargo: ${userRole}
            Contexto da Função: ${getContextForRole(userRole)}

            ESTADO ATUAL DO SISTEMA (EM TEMPO REAL):
            - Notificações não lidas do usuário: ${notifications}
            - Demandas pendentes (Geral): ${pendingDemands}
            - Demandas criadas pelo usuário (Pendentes): ${myPendingDemands}
            
            BASE DE CONHECIMENTO (REGRAS & DEFINIÇÕES):
            ${BUSINESS_GLOSSARY}

            REGRAS DE NEGÓCIO IMPORTANTES:
            ${BUSINESS_RULES}

            PERGUNTAS FREQUENTES (FAQ):
            ${FAQ_ANSWERS}

            DIRETRIZES DE RESPOSTA:
            1. Seja profissional, curto e direto.
            2. Se o usuário enviar uma IMAGEM ou PDF, analise o conteúdo visualmente e extraia informações relevantes.
            3. Se o usuário perguntar "O que tenho pendente?", use os dados de 'ESTADO ATUAL DO SISTEMA'.
            4. Sempre responda em Português do Brasil.
        `;
    };

    const handleSendMessage = async () => {
        if (!inputText.trim() && !attachedFile) return;
        
        const userText = inputText;
        const currentFile = attachedFile;
        
        // Reset Inputs
        setInputText('');
        setAttachedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        
        // Create User Message for UI
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: userText,
            timestamp: new Date(),
            attachment: currentFile ? {
                type: currentFile.type.includes('pdf') ? 'pdf' : 'image',
                name: currentFile.name,
                previewUrl: currentFile.type.includes('image') ? URL.createObjectURL(currentFile) : undefined
            } : undefined
        };
        
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
             const apiKey = process.env.API_KEY;
             const ai = new GoogleGenAI({ apiKey: apiKey! });
             
             const systemPrompt = buildSystemPrompt();
             
             // Prepare Contents
             let contents: any = { role: 'user', parts: [] };
             
             if (currentFile) {
                 const base64Data = await convertFileToBase64(currentFile);
                 contents.parts.push({
                     inlineData: {
                         mimeType: currentFile.type,
                         data: base64Data
                     }
                 });
             }
             
             if (userText) {
                 contents.parts.push({ text: userText });
             } else if (currentFile) {
                 contents.parts.push({ text: "Analise este arquivo anexado." });
             }

             // We construct simple history for context
             const textHistory = messages.filter(m => !m.attachment).map(m => ({ 
                 role: m.role, 
                 parts: [{ text: m.text }] 
             }));

             // Fix: Updated model to 'gemini-3-flash-preview' for text/multimodal task
             const result = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
                 model: 'gemini-3-flash-preview',
                 config: { systemInstruction: systemPrompt },
                 contents: [...textHistory, contents]
             }));
             
             const modelMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: result.text || "Arquivo recebido, mas não consegui analisar.",
                timestamp: new Date()
             };
             setMessages(prev => [...prev, modelMsg]);
        } catch (error) {
            console.error(error);
            const errorMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: "Erro ao processar. Verifique se o arquivo é válido (Imagem ou PDF) e tente novamente.",
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
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Conectado
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
                                    {/* ATTACHMENT DISPLAY */}
                                    {msg.attachment && (
                                        <div className="mb-2 bg-black/10 rounded-lg overflow-hidden">
                                            {msg.attachment.type === 'image' && msg.attachment.previewUrl ? (
                                                <img src={msg.attachment.previewUrl} alt="Anexo" className="max-w-full h-auto max-h-40 object-cover" />
                                            ) : (
                                                <div className="flex items-center gap-2 p-3 text-xs font-bold">
                                                    <FileText size={16} /> {msg.attachment.name}
                                                </div>
                                            )}
                                        </div>
                                    )}

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
                    <div className="p-3 bg-white border-t border-brand-gray-100 relative">
                        {/* ATTACHMENT PREVIEW */}
                        {attachedFile && (
                            <div className="absolute bottom-full left-0 right-0 bg-gray-50 border-t border-gray-200 p-2 flex items-center justify-between text-xs px-4 animate-slide-in-left">
                                <div className="flex items-center gap-2 text-brand-gray-700 truncate">
                                    {attachedFile.type.includes('image') ? <ImageIcon size={14} className="text-purple-500"/> : <FileText size={14} className="text-red-500"/>}
                                    <span className="truncate max-w-[200px] font-medium">{attachedFile.name}</span>
                                </div>
                                <button onClick={() => setAttachedFile(null)} className="text-gray-400 hover:text-red-500"><X size={14}/></button>
                            </div>
                        )}

                        <div className="relative flex items-end bg-brand-gray-50 border border-brand-gray-200 rounded-xl px-2 py-2 focus-within:ring-2 focus-within:ring-brand-primary/20 focus-within:border-brand-primary transition-all gap-2">
                            {/* Paperclip Button */}
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-gray-400 hover:text-brand-primary hover:bg-gray-200 rounded-lg transition-colors"
                                title="Anexar Imagem ou PDF"
                            >
                                <Paperclip size={20} />
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*,application/pdf"
                                    onChange={handleFileSelect}
                                />
                            </button>

                            <textarea 
                                className="flex-1 bg-transparent border-none p-2 text-sm focus:ring-0 text-gray-800 placeholder:text-gray-400 resize-none max-h-24 scrollbar-hide"
                                placeholder="Digite sua dúvida..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isLoading}
                                rows={1}
                                style={{ minHeight: '40px' }}
                            />
                            
                            <button 
                                onClick={() => handleSendMessage()}
                                disabled={(!inputText.trim() && !attachedFile) || isLoading}
                                className="p-2 bg-brand-primary text-white rounded-lg hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm mb-0.5"
                            >
                                {isLoading ? <Loader2 size={5} h-5 animate-spin/> : <Send size={5} h-5 />}
                            </button>
                        </div>
                        <p className="text-[9px] text-center text-gray-400 mt-2">
                            Aceita Imagens e PDF. Para Word/PPT, salve como PDF antes.
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
