
import React, { useState, useEffect } from 'react';
import { appStore } from '../services/store';
import { SystemUser, UserRole } from '../types';
import { 
    Settings, Plus, Trash2, CheckCircle2, X, Users, LayoutList, 
    UserPlus, Search, Filter, Phone, Mail, ArrowUpDown, Power, Edit2, UserCheck, UserX, Briefcase, Map, Target 
} from 'lucide-react';

// --- TYPES ---
type ConfigTab = 'INSIDE' | 'FIELD' | 'USERS';
type SortField = 'name' | 'role' | 'active';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'inactive';

const ConfiguracaoPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ConfigTab>('FIELD'); // Default to Field
  const [notification, setNotification] = useState<string | null>(null);

  // --- CONFIG LISTS STATE ---
  const [visitReasons, setVisitReasons] = useState<string[]>([]);
  const [leadOrigins, setLeadOrigins] = useState<string[]>([]);
  const [withdrawalReasons, setWithdrawalReasons] = useState<string[]>([]);
  const [swapReasons, setSwapReasons] = useState<string[]>([]);

  // --- USERS STATE ---
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [managers, setManagers] = useState<SystemUser[]>([]);
  
  // Filtering & Sorting State (Users)
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'Todos' | UserRole>('Todos');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Modal & Form State (Users)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<SystemUser>>({
    name: '',
    role: UserRole.FIELD_SALES,
    email: '',
    whatsapp: '',
    managerName: ''
  });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setVisitReasons(appStore.getVisitReasons());
    setLeadOrigins(appStore.getLeadOrigins());
    setWithdrawalReasons(appStore.getWithdrawalReasons());
    setSwapReasons(appStore.getSwapReasons());
    
    const allUsers = appStore.getUsers();
    setUsers([...allUsers]);
    setManagers(allUsers.filter(u => u.role === UserRole.GESTOR));
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // --- USERS HANDLERS ---
  const handleSortUsers = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleToggleUserStatus = (id: string) => {
    appStore.toggleUserStatus(id);
    refreshData();
    showNotification('Status do usuário alterado.');
  };

  const handleOpenUserModal = (user?: SystemUser) => {
    if (user) {
      setEditingUser(user);
      setUserFormData({ ...user });
    } else {
      setEditingUser(null);
      setUserFormData({
        name: '',
        role: UserRole.FIELD_SALES,
        email: '',
        whatsapp: '',
        active: true,
        managerName: ''
      });
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      appStore.updateUser({ ...editingUser, ...userFormData } as SystemUser);
      showNotification('Usuário atualizado com sucesso!');
    } else {
      const newUser: SystemUser = {
        id: Math.random().toString(36).substr(2, 9),
        active: true,
        ...(userFormData as any)
      };
      appStore.addUser(newUser);
      showNotification('Usuário criado com sucesso!');
    }
    refreshData();
    setIsUserModalOpen(false);
  };

  // Filter & Sort Logic (Users)
  const processedUsers = users
    .filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'Todos' || u.role === roleFilter;
      const matchesStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? u.active :
        !u.active;

      return matchesSearch && matchesRole && matchesStatus;
    })
    .sort((a, b) => {
      const fieldA = a[sortField];
      const fieldB = b[sortField];
      
      let comparison = 0;
      if (typeof fieldA === 'string' && typeof fieldB === 'string') {
        comparison = fieldA.localeCompare(fieldB);
      } else if (typeof fieldA === 'boolean' && typeof fieldB === 'boolean') {
         comparison = (fieldA === fieldB) ? 0 : fieldA ? -1 : 1;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const activeUserCount = users.filter(u => u.active).length;
  const inactiveUserCount = users.filter(u => !u.active).length;

  // --- REUSABLE COMPONENT: CONFIG LIST ---
  const ConfigListSection = ({ 
      title, 
      description, 
      items, 
      onAdd, 
      onRemove,
      icon: Icon,
      placeholder = "Novo item..."
  }: { 
      title: string, 
      description: string, 
      items: string[], 
      onAdd: (val: string) => void, 
      onRemove: (val: string) => void,
      icon: React.ElementType,
      placeholder?: string
  }) => {
      const [newItem, setNewItem] = useState('');

      const handleAdd = (e: React.FormEvent) => {
          e.preventDefault();
          if (newItem.trim()) {
              onAdd(newItem.trim());
              setNewItem('');
              showNotification('Item adicionado!');
          }
      };

      return (
          <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden flex flex-col h-full">
              <div className="p-5 border-b border-brand-gray-100 bg-brand-gray-50/50">
                  <div className="flex items-center gap-2 mb-1 text-brand-gray-900">
                      <Icon className="w-5 h-5 text-brand-primary" />
                      <h3 className="font-bold">{title}</h3>
                  </div>
                  <p className="text-xs text-brand-gray-500">{description}</p>
              </div>
              
              <div className="p-5 flex-1 flex flex-col gap-4">
                  <form onSubmit={handleAdd} className="flex gap-2">
                      <input 
                          type="text" 
                          value={newItem}
                          onChange={(e) => setNewItem(e.target.value)}
                          placeholder={placeholder}
                          className="flex-1 border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                      />
                      <button 
                          type="submit"
                          disabled={!newItem.trim()}
                          className="bg-brand-gray-900 text-white p-2 rounded-lg hover:bg-black disabled:opacity-50 transition-colors"
                      >
                          <Plus className="w-4 h-4" />
                      </button>
                  </form>

                  <div className="flex-1 overflow-y-auto max-h-[250px] space-y-2 pr-1 custom-scrollbar">
                      {items.length === 0 ? (
                          <p className="text-sm text-brand-gray-400 italic text-center py-4">Nenhum item configurado.</p>
                      ) : (
                          items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-brand-gray-50 px-3 py-2 rounded-lg border border-brand-gray-100 group hover:border-brand-gray-300 transition-colors">
                                  <span className="text-sm text-brand-gray-700 font-medium">{item}</span>
                                  <button 
                                      onClick={() => { onRemove(item); showNotification('Item removido!'); }}
                                      className="text-brand-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-6 relative">
      {/* Success Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in-down">
          <div className="bg-brand-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <CheckCircle2 className="text-brand-light w-5 h-5" />
            <span className="font-medium">{notification}</span>
            <button onClick={() => setNotification(null)} className="ml-2 text-brand-gray-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <header>
        <h1 className="text-2xl font-bold text-brand-gray-900">Configuração</h1>
        <p className="text-brand-gray-700">Parâmetros operacionais e gerenciamento de acessos</p>
      </header>

      {/* Main Tabs */}
      <div className="flex space-x-1 bg-brand-gray-200 p-1 rounded-xl w-fit">
          <button 
              onClick={() => setActiveTab('FIELD')}
              className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'FIELD' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-800'}`}
          >
              <Map className="w-4 h-4 mr-2" />
              Field Sales
          </button>
          <button 
              onClick={() => setActiveTab('INSIDE')}
              className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'INSIDE' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-800'}`}
          >
              <Phone className="w-4 h-4 mr-2" />
              Inside Sales
          </button>
          <button 
              onClick={() => setActiveTab('USERS')}
              className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'USERS' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-800'}`}
          >
              <Users className="w-4 h-4 mr-2" />
              Usuários
          </button>
      </div>

      {/* --- CONTENT: FIELD SALES CONFIG --- */}
      {activeTab === 'FIELD' && (
          <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-6">
              <ConfigListSection 
                  title="Motivos de Retirada"
                  description="Opções disponíveis no relatório de retirada de máquina."
                  items={withdrawalReasons}
                  onAdd={(val) => { appStore.addWithdrawalReason(val); refreshData(); }}
                  onRemove={(val) => { appStore.removeWithdrawalReason(val); refreshData(); }}
                  icon={X}
                  placeholder="Ex: Baixo Faturamento"
              />
              <ConfigListSection 
                  title="Motivos de Troca"
                  description="Opções disponíveis no relatório de troca de equipamento."
                  items={swapReasons}
                  onAdd={(val) => { appStore.addSwapReason(val); refreshData(); }}
                  onRemove={(val) => { appStore.removeSwapReason(val); refreshData(); }}
                  icon={LayoutList}
                  placeholder="Ex: Defeito na Bateria"
              />
          </div>
      )}

      {/* --- CONTENT: INSIDE SALES CONFIG --- */}
      {activeTab === 'INSIDE' && (
          <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-6">
              <ConfigListSection 
                  title="Motivos de Visita"
                  description="Opções ao agendar visitas para gestão de carteira."
                  items={visitReasons}
                  onAdd={(val) => { appStore.addVisitReason(val); refreshData(); }}
                  onRemove={(val) => { appStore.removeVisitReason(val); refreshData(); }}
                  icon={Briefcase}
                  placeholder="Ex: Treinamento"
              />
              <ConfigListSection 
                  title="Origens de Lead"
                  description="Fontes de novos negócios selecionáveis no agendamento."
                  items={leadOrigins}
                  onAdd={(val) => { appStore.addLeadOrigin(val); refreshData(); }}
                  onRemove={(val) => { appStore.removeLeadOrigin(val); refreshData(); }}
                  icon={Target}
                  placeholder="Ex: Instagram Ads"
              />
          </div>
      )}

      {/* --- CONTENT: USERS MANAGEMENT (Existing logic) --- */}
      {activeTab === 'USERS' && (
         <div className="animate-fade-in space-y-6">
            
            {/* Stats & Actions */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex gap-4">
                    <button 
                        onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all shadow-sm min-w-[140px]
                            ${statusFilter === 'active' 
                                ? 'bg-green-50 border-green-200 ring-1 ring-green-500' 
                                : 'bg-white border-brand-gray-100 hover:border-brand-gray-300'
                            }`}
                    >
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                            <UserCheck size={20} />
                        </div>
                        <div className="text-left">
                            <p className="text-xs font-bold text-brand-gray-400 uppercase tracking-wider">Ativos</p>
                            <p className="text-xl font-bold text-brand-gray-900">{activeUserCount}</p>
                        </div>
                    </button>

                    <button 
                        onClick={() => setStatusFilter(statusFilter === 'inactive' ? 'all' : 'inactive')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all shadow-sm min-w-[140px]
                            ${statusFilter === 'inactive' 
                                ? 'bg-red-50 border-red-200 ring-1 ring-red-500' 
                                : 'bg-white border-brand-gray-100 hover:border-brand-gray-300'
                            }`}
                    >
                        <div className="w-10 h-10 rounded-full bg-brand-gray-100 flex items-center justify-center text-brand-gray-500">
                            <UserX size={20} />
                        </div>
                        <div className="text-left">
                            <p className="text-xs font-bold text-brand-gray-400 uppercase tracking-wider">Inativos</p>
                            <p className="text-xl font-bold text-brand-gray-900">{inactiveUserCount}</p>
                        </div>
                    </button>
                </div>
                
                <button 
                    onClick={() => handleOpenUserModal()}
                    className="bg-brand-primary hover:bg-brand-dark text-white px-4 py-3 rounded-lg shadow transition-colors flex items-center text-sm font-bold"
                >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Novo Usuário
                </button>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-brand-gray-100 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-gray-400" />
                <input 
                    type="text" 
                    placeholder="Buscar pelo nome do consultor..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-brand-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all"
                />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter className="w-4 h-4 text-brand-gray-500" />
                <span className="text-sm font-medium text-brand-gray-700 whitespace-nowrap">Filtrar por Time:</span>
                <select 
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                    className="border border-brand-gray-300 rounded-lg text-sm px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
                >
                    <option value="Todos">Todos</option>
                    {Object.values(UserRole).map(role => (
                    <option key={role} value={role}>{role}</option>
                    ))}
                </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-brand-gray-50 text-brand-gray-700 font-bold border-b border-brand-gray-200">
                    <tr>
                        <th className="px-6 py-4 cursor-pointer hover:bg-brand-gray-100 transition-colors group" onClick={() => handleSortUsers('name')}>
                        <div className="flex items-center gap-2">
                            Consultor
                            <ArrowUpDown className="w-3 h-3 text-brand-gray-400 group-hover:text-brand-primary" />
                        </div>
                        </th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-brand-gray-100 transition-colors group" onClick={() => handleSortUsers('role')}>
                        <div className="flex items-center gap-2">
                            Time
                            <ArrowUpDown className="w-3 h-3 text-brand-gray-400 group-hover:text-brand-primary" />
                        </div>
                        </th>
                        <th className="px-6 py-4">Contato</th>
                        <th className="px-6 py-4">Gestor Responsável</th>
                        <th className="px-6 py-4 text-center cursor-pointer hover:bg-brand-gray-100" onClick={() => handleSortUsers('active')}>Status</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-gray-100">
                    {processedUsers.map((user) => (
                        <tr key={user.id} className={`hover:bg-brand-gray-50 transition-colors ${!user.active ? 'opacity-50 bg-brand-gray-50' : ''}`}>
                        <td className="px-6 py-4 font-bold text-brand-gray-900">
                            {user.name}
                        </td>
                        <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border
                            ${user.role === UserRole.GESTOR ? 'bg-purple-100 text-purple-800 border-purple-200' : ''}
                            ${user.role === UserRole.FIELD_SALES ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}
                            ${user.role === UserRole.INSIDE_SALES ? 'bg-orange-100 text-orange-800 border-orange-200' : ''}
                            ${user.role === UserRole.PRICING ? 'bg-green-100 text-green-800 border-green-200' : ''}
                            `}>
                            {user.role}
                            </span>
                        </td>
                        <td className="px-6 py-4">
                            <div className="space-y-1">
                                <div className="flex items-center text-brand-gray-700">
                                <Mail className="w-3 h-3 mr-2 text-brand-gray-400" />
                                {user.email}
                                </div>
                                <div className="flex items-center text-brand-gray-700">
                                <Phone className="w-3 h-3 mr-2 text-brand-gray-400" />
                                {user.whatsapp}
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-brand-gray-700">
                            {user.managerName || <span className="text-brand-gray-400 text-xs italic">Não atribuído</span>}
                        </td>
                        <td className="px-6 py-4 text-center">
                            {user.active ? (
                                <span className="inline-block w-2.5 h-2.5 bg-green-500 rounded-full shadow-sm" title="Ativo"></span>
                            ) : (
                                <span className="inline-block w-2.5 h-2.5 bg-brand-gray-400 rounded-full shadow-sm" title="Inativo"></span>
                            )}
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                                <button 
                                onClick={() => handleOpenUserModal(user)}
                                className="p-2 text-brand-gray-500 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors"
                                title="Editar"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                onClick={() => handleToggleUserStatus(user.id)}
                                className={`p-2 rounded-lg transition-colors ${user.active ? 'text-brand-gray-500 hover:text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                                title={user.active ? 'Inativar' : 'Ativar'}
                                >
                                    <Power className="w-4 h-4" />
                                </button>
                            </div>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                
                {processedUsers.length === 0 && (
                    <div className="p-10 text-center text-brand-gray-500">
                        Nenhum usuário encontrado com os filtros selecionados.
                    </div>
                )}
                </div>
            </div>

            {/* User Modal */}
            {isUserModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="bg-brand-gray-900 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-white font-bold text-lg">
                                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                            </h3>
                            <button onClick={() => setIsUserModalOpen(false)} className="text-brand-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-brand-gray-700 mb-1">Nome Completo</label>
                                <input 
                                    required
                                    type="text" 
                                    value={userFormData.name}
                                    onChange={e => setUserFormData({...userFormData, name: e.target.value})}
                                    className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-brand-gray-700 mb-1">Time (Perfil)</label>
                                <select 
                                    required
                                    value={userFormData.role}
                                    onChange={e => setUserFormData({...userFormData, role: e.target.value as UserRole})}
                                    className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none bg-white"
                                >
                                    {Object.values(UserRole).map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* Gestor Responsável Dropdown */}
                            <div>
                                <label className="block text-sm font-bold text-brand-gray-700 mb-1">Gestor Responsável</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-brand-gray-400" />
                                    <select 
                                        value={userFormData.managerName || ''}
                                        onChange={e => setUserFormData({...userFormData, managerName: e.target.value})}
                                        className="w-full pl-9 border border-brand-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none bg-white appearance-none"
                                    >
                                        <option value="">Selecione um gestor...</option>
                                        {managers.map(manager => (
                                            <option key={manager.id} value={manager.name}>{manager.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-brand-gray-700 mb-1">E-mail</label>
                                    <input 
                                        required
                                        type="email" 
                                        value={userFormData.email}
                                        onChange={e => setUserFormData({...userFormData, email: e.target.value})}
                                        className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-brand-gray-700 mb-1">WhatsApp</label>
                                    <input 
                                        required
                                        type="tel" 
                                        value={userFormData.whatsapp}
                                        onChange={e => setUserFormData({...userFormData, whatsapp: e.target.value})}
                                        className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3 justify-end">
                                <button 
                                    type="button" 
                                    onClick={() => setIsUserModalOpen(false)}
                                    className="px-4 py-2 border border-brand-gray-300 text-brand-gray-700 rounded-lg hover:bg-brand-gray-50 font-medium"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-6 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-dark shadow-md font-bold"
                                >
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
         </div>
      )}

    </div>
  );
};

export default ConfiguracaoPage;
