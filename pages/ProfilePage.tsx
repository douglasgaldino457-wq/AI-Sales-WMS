
import React, { useState, useEffect } from 'react';
import { 
    User, Mail, Phone, Lock, Car, Save, Shield, Eye, EyeOff, CheckCircle2, 
    AlertCircle, Briefcase, Camera, Truck, Sparkles, Loader2, Bell, Check, Trash2, ArrowRight
} from 'lucide-react';
import { useAppStore } from '../services/useAppStore';
import { appStore } from '../services/store';
import { SystemUser, Vehicle, UserRole, AppNotification, Page } from '../types';
import { identifyVehicleByPlate } from '../services/geminiService';

const ProfilePage: React.FC = () => {
    const { currentUser, login, navigate } = useAppStore();
    const [activeTab, setActiveTab] = useState<'INFO' | 'NOTIFICATIONS'>('INFO');
    const [userData, setUserData] = useState<SystemUser | null>(null);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    
    // --- PROFILE STATES ---
    const [vehicleForm, setVehicleForm] = useState<Partial<Vehicle>>({
        plate: '', make: '', model: '', year: '', color: ''
    });
    const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
    const [showPassword, setShowPassword] = useState(false);
    
    // Feedback State
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loadingVehicle, setLoadingVehicle] = useState(false);

    useEffect(() => {
        if (currentUser) {
            setUserData(currentUser);
            if (currentUser.vehicle) {
                setVehicleForm(currentUser.vehicle);
            }
        }
        // Load Notifications
        setNotifications(appStore.getNotifications());
    }, [currentUser]);

    const handleVehicleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setVehicleForm(prev => ({
            ...prev,
            [name]: name === 'plate' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '') : value
        }));
    };

    const handleAutoFillVehicle = async () => {
        if (!vehicleForm.plate || vehicleForm.plate.length < 7) {
            setErrorMsg("Digite uma placa válida para buscar (7 dígitos).");
            return;
        }
        setErrorMsg(null);
        setLoadingVehicle(true);
        try {
            const info = await identifyVehicleByPlate(vehicleForm.plate);
            if (info) {
                setVehicleForm(prev => ({
                    ...prev,
                    make: info.make,
                    model: info.model,
                    year: info.year,
                    color: info.color
                }));
                setSuccessMsg("Dados do veículo identificados com sucesso!");
                setTimeout(() => setSuccessMsg(null), 3000);
            } else {
                setErrorMsg("Veículo não identificado na base.");
            }
        } catch (error) {
            console.error(error);
            setErrorMsg("Erro ao conectar com serviço de identificação.");
        } finally {
            setLoadingVehicle(false);
        }
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        if (!userData) return;

        if (passwordData.new || passwordData.confirm) {
            if (passwordData.new !== passwordData.confirm) {
                setErrorMsg("A nova senha e a confirmação não conferem.");
                return;
            }
            if (passwordData.new.length < 6) {
                setErrorMsg("A nova senha deve ter pelo menos 6 caracteres.");
                return;
            }
        }

        const canEditVehicle = userData.role === UserRole.FIELD_SALES || userData.role === UserRole.GESTOR;
        let updatedVehicle: Vehicle | undefined = userData.vehicle;
        
        if (canEditVehicle) {
            if (vehicleForm.plate || vehicleForm.model) {
                if (!vehicleForm.plate || !vehicleForm.model || !vehicleForm.make) {
                    setErrorMsg("Para cadastrar o veículo, preencha Placa, Marca e Modelo.");
                    return;
                }
                updatedVehicle = vehicleForm as Vehicle;
            }
        }

        const updatedUser: SystemUser = {
            ...userData,
            vehicle: updatedVehicle,
            password: passwordData.new || userData.password
        };

        appStore.updateUser(updatedUser);
        login(updatedUser); 

        setSuccessMsg("Perfil atualizado com sucesso!");
        setPasswordData({ current: '', new: '', confirm: '' });
        
        setTimeout(() => setSuccessMsg(null), 4000);
    };

    // --- NOTIFICATION HANDLERS ---
    const handleReadNotification = (id: string) => {
        appStore.markNotificationAsRead(id);
        setNotifications(appStore.getNotifications());
    };

    const handleClearAll = () => {
        appStore.clearNotifications();
        setNotifications([]);
    };

    const handleMarkAllRead = () => {
        appStore.markAllNotificationsAsRead();
        setNotifications(appStore.getNotifications());
    };

    const handleNotificationClick = (n: AppNotification) => {
        handleReadNotification(n.id);
        if(n.targetId) {
            navigate(Page.PEDIDOS_RASTREIO, n.targetId);
        }
    };

    if (!userData) return null;

    const showVehicleConfig = userData.role === UserRole.FIELD_SALES || userData.role === UserRole.GESTOR;
    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-fade-in">
            <header className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                        <User className="w-8 h-8 text-brand-primary" />
                        Meu Perfil
                    </h1>
                    <p className="text-brand-gray-600 mt-1">Gerencie suas informações e alertas.</p>
                </div>
                
                {/* Tabs */}
                <div className="flex bg-brand-gray-200 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('INFO')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'INFO' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                    >
                        Dados & Acesso
                    </button>
                    <button 
                        onClick={() => setActiveTab('NOTIFICATIONS')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'NOTIFICATIONS' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-900'}`}
                    >
                        Notificações
                        {unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
                    </button>
                </div>
            </header>

            {successMsg && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2 animate-fade-in-down shadow-sm">
                    <CheckCircle2 size={20} /> {successMsg}
                </div>
            )}

            {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 animate-fade-in-down shadow-sm">
                    <AlertCircle size={20} /> {errorMsg}
                </div>
            )}

            {activeTab === 'INFO' && (
                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT COLUMN: Personal Info & Security */}
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* PERSONAL INFO CARD */}
                        <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-brand-gray-100 bg-brand-gray-50/50 flex items-center gap-3">
                                <div className="w-10 h-10 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary">
                                    <Briefcase size={20} />
                                </div>
                                <h3 className="font-bold text-brand-gray-900">Informações Profissionais</h3>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Nome Completo</label>
                                    <div className="flex items-center gap-2 p-3 bg-brand-gray-50 rounded-lg border border-brand-gray-200 text-brand-gray-700">
                                        <User size={16} className="text-brand-gray-400" />
                                        {userData.name}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Cargo / Função</label>
                                    <div className="flex items-center gap-2 p-3 bg-brand-gray-50 rounded-lg border border-brand-gray-200 text-brand-gray-700">
                                        <Briefcase size={16} className="text-brand-gray-400" />
                                        {userData.role}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">E-mail Corporativo</label>
                                    <div className="flex items-center gap-2 p-3 bg-brand-gray-50 rounded-lg border border-brand-gray-200 text-brand-gray-700">
                                        <Mail size={16} className="text-brand-gray-400" />
                                        {userData.email}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">WhatsApp</label>
                                    <div className="flex items-center gap-2 p-3 bg-brand-gray-50 rounded-lg border border-brand-gray-200 text-brand-gray-700">
                                        <Phone size={16} className="text-brand-gray-400" />
                                        {userData.whatsapp}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECURITY CARD */}
                        <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-brand-gray-100 bg-brand-gray-50/50 flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                                    <Lock size={20} />
                                </div>
                                <h3 className="font-bold text-brand-gray-900">Segurança e Acesso</h3>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Senha Atual</label>
                                    <input 
                                        type="password"
                                        name="current"
                                        placeholder="••••••••"
                                        value={passwordData.current}
                                        onChange={handlePasswordChange}
                                        className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="relative">
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Nova Senha</label>
                                        <input 
                                            type={showPassword ? "text" : "password"}
                                            name="new"
                                            placeholder="Mínimo 6 caracteres"
                                            value={passwordData.new}
                                            onChange={handlePasswordChange}
                                            className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none transition-all"
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-[26px] text-gray-400 hover:text-brand-primary"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Confirmar Nova Senha</label>
                                        <input 
                                            type="password"
                                            name="confirm"
                                            placeholder="Repita a nova senha"
                                            value={passwordData.confirm}
                                            onChange={handlePasswordChange}
                                            className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Vehicle & Actions */}
                    <div className="space-y-8">
                        {showVehicleConfig && (
                            <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 overflow-hidden h-fit animate-fade-in relative">
                                <div className="p-6 border-b border-brand-gray-100 bg-brand-gray-50/50 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                        <Car size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-brand-gray-900">Meu Veículo</h3>
                                        <p className="text-[10px] text-brand-gray-500">Usado para cálculo de reembolso.</p>
                                    </div>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2 text-xs text-blue-800 mb-2">
                                        <Truck size={14} className="mt-0.5 shrink-0" />
                                        <p>Mantenha os dados atualizados para garantir a precisão nos relatórios de rota e quilometragem.</p>
                                    </div>
                                    <div className="relative">
                                        <label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Placa</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text"
                                                name="plate"
                                                maxLength={7}
                                                placeholder="ABC1D23"
                                                value={vehicleForm.plate}
                                                onChange={handleVehicleChange}
                                                className="flex-1 border border-brand-gray-300 rounded-lg px-3 py-2 text-lg font-mono font-bold uppercase tracking-widest text-center focus:ring-1 focus:ring-brand-primary outline-none"
                                            />
                                            <button 
                                                type="button"
                                                onClick={handleAutoFillVehicle}
                                                disabled={loadingVehicle || !vehicleForm.plate || vehicleForm.plate.length < 7}
                                                className="bg-brand-gray-900 text-white px-3 rounded-lg hover:bg-black disabled:opacity-50 transition-colors flex items-center justify-center gap-1 shadow-sm"
                                                title="Buscar dados do veículo (IA)"
                                            >
                                                {loadingVehicle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                                <span className="text-xs font-bold">Autopreencher</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Marca</label><input type="text" name="make" value={vehicleForm.make} onChange={handleVehicleChange} className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm outline-none" /></div>
                                        <div><label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Modelo</label><input type="text" name="model" value={vehicleForm.model} onChange={handleVehicleChange} className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm outline-none" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Ano</label><input type="text" name="year" value={vehicleForm.year} onChange={(e) => setVehicleForm({...vehicleForm, year: e.target.value})} className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm outline-none" /></div>
                                        <div><label className="block text-xs font-bold text-brand-gray-500 uppercase mb-1">Cor</label><input type="text" name="color" value={vehicleForm.color} onChange={handleVehicleChange} className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm outline-none" /></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <button type="submit" className="w-full bg-brand-gray-900 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 text-lg transform active:scale-95">
                            <Save className="w-5 h-5" /> Salvar Alterações
                        </button>
                    </div>
                </form>
            )}

            {activeTab === 'NOTIFICATIONS' && (
                <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 overflow-hidden min-h-[400px] flex flex-col">
                    <div className="p-6 border-b border-brand-gray-100 bg-brand-gray-50/50 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-brand-gray-900 flex items-center gap-2"><Bell className="w-5 h-5 text-brand-primary" /> Central de Notificações</h3>
                            <p className="text-xs text-brand-gray-500">Alertas de aprovação e logística.</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleMarkAllRead} className="text-xs font-bold text-brand-gray-600 hover:text-brand-primary bg-white border border-brand-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                                <Check size={14} /> Marcar todas lidas
                            </button>
                            <button onClick={handleClearAll} className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                                <Trash2 size={14} /> Limpar
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-12 text-brand-gray-400">
                                <Bell className="w-12 h-12 mb-3 opacity-20" />
                                <p>Nenhuma notificação encontrada.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-brand-gray-100">
                                {notifications.map(notif => (
                                    <div 
                                        key={notif.id} 
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`p-5 flex gap-4 cursor-pointer transition-colors hover:bg-brand-gray-50 group relative ${notif.read ? 'opacity-70' : 'bg-blue-50/30'}`}
                                    >
                                        <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${notif.read ? 'bg-transparent' : 'bg-blue-500'}`}></div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className={`text-sm font-bold ${notif.read ? 'text-brand-gray-700' : 'text-brand-gray-900'}`}>{notif.title}</h4>
                                                <span className="text-[10px] text-brand-gray-400 whitespace-nowrap ml-2">
                                                    {new Date(notif.date).toLocaleDateString()} {new Date(notif.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                </span>
                                            </div>
                                            <p className="text-xs text-brand-gray-600 leading-relaxed">{notif.message}</p>
                                        </div>
                                        {notif.targetId && (
                                            <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ArrowRight className="w-4 h-4 text-brand-primary" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;
