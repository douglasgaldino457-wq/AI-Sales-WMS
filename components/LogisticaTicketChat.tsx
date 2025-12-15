
import React, { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, X, User, LifeBuoy, Bot, Paperclip } from 'lucide-react';
import { SupportTicket, SupportMessage } from '../types';
import { appStore } from '../services/store';

interface LogisticaTicketChatProps {
    ticket: SupportTicket;
    onClose: () => void;
}

export const LogisticaTicketChat: React.FC<LogisticaTicketChatProps> = ({ ticket, onClose }) => {
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Load initial messages
        setMessages(ticket.messages || []);
        
        // Poll for new messages every 3s (simulating real-time)
        const interval = setInterval(() => {
            const updatedTicket = appStore.getSupportTickets().find(t => t.id === ticket.id);
            if (updatedTicket) {
                setMessages(updatedTicket.messages);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [ticket.id]);

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

    const handleSendMessage = async (text?: string, file?: File) => {
        if (!text && !file) return;

        let imageUrl: string | undefined = undefined;
        if (file) {
            try {
                imageUrl = await convertFileToBase64(file);
            } catch (e) {
                console.error("Image upload failed", e);
            }
        }

        const newMessage: SupportMessage = {
            id: Date.now().toString(),
            sender: 'support', // Logistics operator is 'support'
            text: text || '',
            timestamp: new Date().toISOString(),
            imageUrl: imageUrl
        };

        // Update Store
        appStore.addMessageToTicket(ticket.id, newMessage);
        
        // Update Local State immediately
        setMessages(prev => [...prev, newMessage]);
        setInputText('');
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleSendMessage('Imagem enviada.', e.target.files[0]);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[600px]">
                
                {/* Header */}
                <div className="bg-brand-gray-900 p-4 flex justify-between items-center text-white shrink-0">
                    <div>
                        <h3 className="font-bold text-sm flex items-center gap-2">
                            <LifeBuoy className="w-4 h-4" /> Chamado #{ticket.id}
                        </h3>
                        <p className="text-xs text-brand-gray-400 mt-0.5">
                            {ticket.clientName} • {ticket.requesterName}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-brand-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 bg-brand-gray-50 space-y-4">
                    {messages.length === 0 ? (
                        <div className="text-center text-gray-400 text-sm py-10">
                            Nenhuma mensagem trocada ainda.
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.sender === 'support';
                            const isAI = msg.sender === 'ai';
                            
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm text-sm relative ${
                                        isMe 
                                            ? 'bg-blue-600 text-white rounded-tr-none' 
                                            : isAI 
                                            ? 'bg-purple-100 text-purple-900 border border-purple-200 rounded-tl-none'
                                            : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                                    }`}>
                                        {/* Sender Icon/Name */}
                                        {!isMe && (
                                            <div className="flex items-center gap-1 mb-1 opacity-70 text-[10px] font-bold uppercase tracking-wider">
                                                {isAI ? <Bot size={10}/> : <User size={10}/>}
                                                {isAI ? 'IA Automática' : ticket.requesterName.split(' ')[0]}
                                            </div>
                                        )}

                                        {msg.imageUrl && (
                                            <div className="mb-2">
                                                <img 
                                                    src={msg.imageUrl} 
                                                    alt="Anexo" 
                                                    className="rounded-lg max-h-48 object-cover border border-white/20 w-full" 
                                                />
                                            </div>
                                        )}
                                        
                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                        
                                        <span className={`block text-[9px] mt-1 opacity-60 text-right ${isMe ? 'text-white' : 'text-gray-500'}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 bg-white border-t border-brand-gray-200 flex gap-2 items-end">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-brand-gray-400 hover:text-brand-primary hover:bg-brand-gray-50 rounded-lg transition-colors"
                        title="Anexar Imagem"
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
                            placeholder="Digite sua resposta..."
                            className="w-full border border-brand-gray-300 rounded-xl pl-3 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none h-10 max-h-24 scrollbar-hide"
                        />
                    </div>
                    
                    <button 
                        onClick={() => handleSendMessage(inputText)}
                        disabled={!inputText.trim()}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};
