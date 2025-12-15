
import React, { useState, useEffect } from 'react';
import { appStore } from '../services/store';
import { AppNotification } from '../types';
import { Bell, X, CheckCircle2, Key } from 'lucide-react';
import { useAppStore } from '../services/useAppStore';
import { Page } from '../types';

export const NotificationToast: React.FC = () => {
    const { navigate } = useAppStore();
    const [currentNotification, setCurrentNotification] = useState<AppNotification | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Poll for unread notifications that haven't been shown yet in this session context (simplified)
        // Ideally we would track "shown" state separately, but here we just pick the latest unread
        const interval = setInterval(() => {
            const notifs = appStore.getNotifications();
            const latest = notifs[0]; // Get the most recent

            if (latest && !latest.read && (!currentNotification || latest.id !== currentNotification.id)) {
                // Only show if created in last 10 seconds to avoid spamming old unreads on reload
                const now = new Date().getTime();
                const notifTime = new Date(latest.date).getTime();
                if (now - notifTime < 10000) { 
                    setCurrentNotification(latest);
                    setIsVisible(true);
                    
                    // Auto dismiss after 5s
                    setTimeout(() => {
                        setIsVisible(false);
                    }, 5000);
                }
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [currentNotification]);

    const handleClick = () => {
        if (!currentNotification) return;
        
        // Mark as read
        appStore.markNotificationAsRead(currentNotification.id);
        setIsVisible(false);

        // Navigate based on type
        if (currentNotification.targetId) {
            navigate(Page.PEDIDOS_RASTREIO, currentNotification.targetId);
        } else {
            navigate(Page.PERFIL); // Fallback
        }
    };

    const handleDismiss = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentNotification) {
            appStore.markNotificationAsRead(currentNotification.id);
        }
        setIsVisible(false);
    };

    if (!currentNotification) return null;

    const getIcon = () => {
        switch (currentNotification.type) {
            case 'RATE_APPROVED': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'OTP_ISSUED': return <Key className="w-5 h-5 text-purple-500" />;
            default: return <Bell className="w-5 h-5 text-blue-500" />;
        }
    };

    return (
        <div 
            className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[2000] w-[90%] max-w-sm bg-white rounded-2xl shadow-2xl border border-brand-gray-200 p-4 transition-all duration-500 ease-in-out cursor-pointer ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'}`}
            onClick={handleClick}
        >
            <div className="flex items-start gap-3">
                <div className="bg-brand-gray-50 p-2 rounded-full shrink-0">
                    {getIcon()}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-brand-gray-900 text-sm">{currentNotification.title}</h4>
                    <p className="text-xs text-brand-gray-500 mt-0.5 line-clamp-2">{currentNotification.message}</p>
                    <span className="text-[10px] text-brand-gray-400 mt-1 block">Agora</span>
                </div>
                <button 
                    onClick={handleDismiss}
                    className="text-brand-gray-400 hover:text-brand-gray-600 p-1"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};
