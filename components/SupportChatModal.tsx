
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Image as ImageIcon, Loader2, Bot, User, LifeBuoy, AlertCircle } from 'lucide-react';
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

    // Initial Greeting
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                id: 'init',
                sender: 'support',
                text: `Olá, ${currentUser}. Sou o assistente virtual da Logística. Como posso ajudar com a maquininha do cliente ${clientName}?`,
                timestamp: new Date().toISOString()
            }]);
            
            // Create a ticket session implicitly or explicitly
            const newTicketId = `TKT-${Math.floor(Math.random() * 10000)}`;
            setTicketId(newTicketId);
            
            // Register ticket in store
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
                messages: []
            };
            appStore.addSupportTicket(ticket);
        }
    }, [isOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (text?: string, imageFile?: File) => {
        if ((!text && !imageFile) || !ticketId) return;

        const userMsg: SupportMessage = {
            id: Date.now().toString(),
            sender: 'user',
            text: text || (imageFile ? 'Enviei uma imagem do erro.' : ''),
            timestamp: new Date().toISOString(),
            imageUrl: imageFile ? URL.createObjectURL(imageFile) : undefined
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsSending(true);

        // --- AI LOGIC ---
        try {
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
            `;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let responseText = '';

            if (imageFile) {
                // Image Analysis
                const reader = new FileReader();
                const base64Promise = new Promise<string>((resolve) => {
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(imageFile);
                });
                const base64Data = await base64Promise;
                const cleanBase64 = base64Data.split(',')[1];

                const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: {
                        parts: [
                            { inlineData: { mimeType: imageFile.type, data: cleanBase64 } },
                            { text: prompt + " \n\n[Analise a imagem anexada]" }
                        ]
                    }
                }));
                responseText = response.text || "Não consegui analisar a imagem.";

            } else {
                // Text Analysis
                const chat = ai.chats.create({
                    model: 'gemini-2.5-flash',
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
            setMessages(prev => [...prev, aiMsg]);

            // Update Ticket in Store
            // In a real app, we would append messages properly
            
        } catch (error) {
            console.error("AI Support Error", error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                sender: 'support',
                text: "Estou com dificuldade de conexão. Um analista humano assumirá em breve.",
                timestamp: new Date().toISOString()
            }]);
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
                            <p className="text-xs text-brand-gray-400">Atendimento Inteligente</p>
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
                                {msg.imageUrl && (
                                    <img src={msg.imageUrl} alt="Upload" className="w-full h-32 object-cover rounded-lg mb-2" />
                                )}
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                <span className="text-[9px] opacity-60 block text-right mt-1">
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
                        <ImageIcon size={20} />
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
                        onClick={() => handleSendMessage(inputText)}
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
