
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Image as ImageIcon, Loader2, Bot, User, LifeBuoy, AlertCircle, Paperclip } from 'lucide-react';
import { SupportTicket, SupportMessage } from '../types';
import { appStore } from '../services/store';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { runWithRetry } from '../services/geminiService';

interface SupportChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientName: string;
    clientId: string;
    currentUser: string;
    currentRole: string;
}

export const SupportChatModal: React.FC<SupportChatModalProps> = ({ 
    isOpen, onClose, clientName, clientId, currentUser, currentRole 
}) => {
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [ticketId, setTicketId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial Setup & Polling
    useEffect(() => {
        if (isOpen) {
            // Check if there is already an open ticket for this client to resume chat
            // (Simplification: For now, we create a new one or find the last open one)
            const existingTickets = appStore.getSupportTickets().filter(t => t.clientId === clientId && t.status !== 'RESOLVED');
            
            let currentTicketId = '';

            if (existingTickets.length > 0) {
                // Resume existing
                const ticket = existingTickets[existingTickets.length - 1]; // Last one
                setTicketId(ticket.id);
                currentTicketId = ticket.id;
                setMessages(ticket.messages);
            } else {
                // Create New
                const newTicketId = `TKT-${Math.floor(Math.random() * 10000)}`;
                setTicketId(newTicketId);
                currentTicketId = newTicketId;
                
                const initialMsg: SupportMessage = {
                    id: 'init',
                    sender: 'support',
                    text: `Olá, ${currentUser}. Sou o assistente virtual da Logística. Como posso ajudar com a maquininha do cliente ${clientName}?`,
                    timestamp: new Date().toISOString()
                };

                const ticket: SupportTicket = {
                    id: newTicketId,
                    clientId,
                    clientName,
                    requesterName: currentUser,
                    requesterRole: currentRole,
                    status: 'OPEN',
                    priority: 'MEDIUM',
                    category: 'Outros',
                    createdAt: new Date().toISOString(),
                    messages: [initialMsg]
                };
                appStore.addSupportTicket(ticket);
                setMessages([initialMsg]);
            }

            // Start Polling for new messages (simulating real-time)
            const interval = setInterval(() => {
                const updatedTicket = appStore.getSupportTickets().find(t => t.id === currentTicketId);
                if (updatedTicket) {
                    setMessages(updatedTicket.messages);
                }
            }, 2000);

            return () => clearInterval(interval);
        }
    }, [isOpen, clientId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleSendMessage = async (text?: string, imageFile?: File) => {
        if ((!text && !imageFile) || !ticketId) return;

        let imageUrl: string | undefined = undefined;
        let cleanBase64 = '';

        if (imageFile) {
            try {
                imageUrl = await convertFileToBase64(imageFile);
                cleanBase64 = imageUrl.split(',')[1];
            } catch (e) {
                console.error("Error converting image", e);
                return;
            }
        }

        const userMsg: SupportMessage = {
            id: Date.now().toString(),
            sender: 'user',
            text: text || (imageFile ? 'Imagem enviada.' : ''),
            timestamp: new Date().toISOString(),
            imageUrl: imageUrl
        };

        // Optimistic UI Update
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsSending(true);

        // PERSIST USER MESSAGE TO STORE
        appStore.addMessageToTicket(ticketId, userMsg);

        // --- AI LOGIC (Only runs if no human operator has replied recently? For now, always runs as 'First Line') ---
        try {
            // Check if last message was from support (human), if so, maybe skip AI? 
            // For this demo, AI always tries to help unless disabled.
            
            // 1. Prepare Prompt
            let prompt = `
                Você é um especialista em suporte técnico de maquininhas de cartão (POS).
                Contexto: O usuário ${currentRole} está relatando um problema na oficina ${clientName}.
                
                Base de Conhecimento (Exemplos):
                ${appStore.getKnowledgeBase().map(kb => `- Se o erro for "${kb.errorPattern}", a solução é: ${kb.solution}`).join('\n')}
                
                Instrução:
                Analise a mensagem ou imagem do usuário.
                Se identificar um erro conhecido na base, forneça a solução passo a passo.
                Se não souber, peça mais detalhes ou diga que encaminhará para um humano.
                Se for uma imagem, descreva o erro que vê na tela da maquininha e sugira a solução.
                Se o usuário enviou apenas uma imagem sem texto, analise a imagem.
            `;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            let responseText = '';

            if (imageFile) {
                // Fix: Updated model to 'gemini-3-flash-preview' for multimodal task
                const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: {
                        parts: [
                            { inlineData: { mimeType: imageFile.type, data: cleanBase64 } },
                            { text: prompt + " \n\n[Analise a imagem anexada e identifique o erro na tela da maquininha]" }
                        ]
                    }
                }));
                responseText = response.text || "Não consegui analisar a imagem.";
            } else {
                // Fix: Updated model to 'gemini-3-flash-preview' for chat task
                const chat = ai.chats.create({
                    model: 'gemini-3-flash-preview',
                    config: { systemInstruction: prompt },
                    history: messages.slice(1).map(m => ({ // Skip initial greeting
                        role: m.sender === 'user' ? 'user' : 'model',
                        parts: [{ text: m.text }]
                    }))
                });
                const result = await runWithRetry<GenerateContentResponse>(() => chat.sendMessage({ message: text || '' }));
                responseText = result.text || "Poderia reformular?";
            }

            const aiMsg: SupportMessage = {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: responseText,
                timestamp: new Date().toISOString()
            };
            
            // PERSIST AI MESSAGE TO STORE
            appStore.addMessageToTicket(ticketId, aiMsg);
            setMessages(prev => [...prev, aiMsg]); // Update local too just in case poll is slow

        } catch (error) {
            console.error("AI Support Error", error);
            // Don't show error to user, just let them wait for human or retry
        } finally {
            setIsSending(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleSendMessage(undefined, e.target.files[0]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col h-[600px]">
                {/* Header */}
                <div className="bg-brand-gray-900 p-4 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-full">
                            <LifeBuoy className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">Suporte Logística</h3>
                            <p className="text-xs text-brand-gray-400">
                                {ticketId ? `Ticket #${ticketId}` : 'Atendimento Inteligente'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-brand-gray-400 hover:text-white"><X size={20}/></button>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm text-sm relative ${
                                msg.sender === 'user' 
                                    ? 'bg-brand-primary text-white rounded-tr-none' 
                                    : msg.sender === 'ai'
                                    ? 'bg-purple-100 text-purple-900 border border-purple-200 rounded-tl-none'
                                    : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                            }`}>
                                {msg.sender === 'ai' && <Bot className="w-3 h-3 absolute -top-1.5 -left-1.5 bg-purple-600 text-white rounded-full p-0.5" />}
                                {msg.sender === 'support' && <User className="w-3 h-3 absolute -top-1.5 -left-1.5 bg-blue-600 text-white rounded-full p-0.5" />}
                                
                                {msg.imageUrl && (
                                    <img src={msg.imageUrl} alt="Anexo" className="w-full h-32 object-cover rounded-lg mb-2 border border-white/20" />
                                )}
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                <span className={`text-[9px] block text-right mt-1 ${msg.sender === 'user' ? 'text-white/60' : 'text-gray-400'}`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                        </div>
                    ))}
                    {isSending && (
                        <div className="flex justify-start">
                            <div className="bg-gray-200 rounded-2xl p-3 flex gap-1">
                                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-75"></div>
                                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-150"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 bg-white border-t border-gray-200 flex gap-2 items-end">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-400 hover:text-brand-primary hover:bg-gray-100 rounded-lg transition-colors"
                        title="Enviar Foto do Erro"
                    >
                        <Paperclip size={20} />
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                    </button>
                    <div className="flex-1 relative">
                        <textarea 
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            onKeyDown={e => {
                                if(e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(inputText);
                                }
                            }}
                            placeholder="Descreva o problema..."
                            className="w-full border border-gray-300 rounded-xl pl-3 pr-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none resize-none h-10 max-h-24"
                        />
                    </div>
                    <button 
                        onClick={handleSendMessage(inputText)}
                        disabled={!inputText.trim() && !isSending}
                        className="p-2 bg-brand-primary text-white rounded-lg hover:bg-brand-dark disabled:opacity-50 transition-colors"
                    >
                        {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    </button>
                </div>
            </div>
        </div>
    );
};
