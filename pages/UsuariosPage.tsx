
import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Filter, Phone, Mail, ArrowUpDown, Power, Edit2, X, CheckCircle2, UserCheck, UserX, Briefcase, ChevronRight, Lock } from 'lucide-react';
import { UserRole, SystemUser } from '../types';
import { appStore } from '../services/store';
import { useAppStore } from '../services/useAppStore';

type SortField = 'name' | 'role' | 'active';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'inactive';

const UsuariosPage: React.FC = () => {
  const { userRole } = useAppStore(); // Get current logged-in role
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [managers, setManagers] = useState<SystemUser[]>([]);
  
  // Filtering State
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'Todos' | UserRole>('Todos');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Sorting State
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [formData, setFormData] = useState<Partial<SystemUser>>({
    name: '',
    role: UserRole.FIELD_SALES,
    email: '',
    whatsapp: '',
    managerName: ''
  });
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    refreshUsers();
  }, [userRole]);

  // --- FILTERING LOGIC PER PROFILE ---
  const filterVisibleUsers = (allUsers: SystemUser[], myRole: UserRole | null): SystemUser[] => {
      if (!myRole) return [];
      
      // GESTOR and ESTRATEGIA see everyone
      if (myRole === UserRole.GESTOR || myRole === UserRole.ESTRATEGIA) return allUsers;

      // Others shouldn't see this page, but as fallback:
      return [];
  };

  const refreshUsers = () => {
    const allUsers = appStore.getUsers();
    // Apply permission filter
    const visibleUsers = filterVisibleUsers(allUsers, userRole);
    setUsers(visibleUsers);
    setManagers(allUsers.filter(u => u.role === UserRole.GESTOR));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleToggleStatus = (id: string) => {
    // Permission check
    if (userRole !== UserRole.ESTRATEGIA && userRole !== UserRole.GESTOR) {
        alert("Apenas Gestores e Estratégia podem alterar status.");
        return;
    }
    appStore.toggleUserStatus(id);
    refreshUsers();
  };

  const handleOpenModal = (user?: SystemUser) => {
    // Permission check for creating/editing
    if (userRole !== UserRole.ESTRATEGIA && userRole !== UserRole.GESTOR) {
        alert("Apenas Gestores e Estratégia podem editar usuários.");
        return;
    }

    if (user) {
      setEditingUser(user);
      setFormData({ ...user });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        role: UserRole.FIELD_SALES,
        email: '',
        whatsapp: '',
        active: true,
        managerName: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      // Update
      appStore.updateUser({ ...editingUser, ...formData } as SystemUser);
      setSuccessMsg('Usuário atualizado com sucesso!');
    } else {
      // Create
      const newUser: SystemUser = {
        id: Math.random().toString(36).substr(2, 9),
        active: true,
        ...(formData as any)
      };
      appStore.addUser(newUser);
      setSuccessMsg('Usuário criado com sucesso!');
    }
    refreshUsers();
    setIsModalOpen(false);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Filter & Sort Logic (Local State)
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

  const activeCount = users.filter(u => u.active).length;
  const inactiveCount = users.filter(u => !u.active).length;
  const canEdit = userRole === UserRole.ESTRATEGIA || userRole === UserRole.GESTOR;

  return (
    <div className="space-y-6 relative pb-20">
      
      {/* Success Toast */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in-down">
          <div className="bg-brand-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <CheckCircle2 className="text-brand-light w-5 h-5" />
            <span className="font-medium">{successMsg}</span>
          </div>
        </div>
      )}

      {/* Header with Stats Cards */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-gray-900">Usuários</h1>
            <p className="text-brand-gray-700">Visualização de equipe ({userRole})</p>
          </div>
          
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
                      <p className="text-xl font-bold text-brand-gray-900">{activeCount}</p>
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
                      <p className="text-xl font-bold text-brand-gray-900">{inactiveCount}</p>
                  </div>
              </button>
          </div>
      </div>

      {canEdit && (
          <div className="flex justify-end">
            <button 
                onClick={() => handleOpenModal()}
                className="bg-brand-primary hover:bg-brand-dark text-white px-4 py-2 rounded-lg shadow transition-colors flex items-center text-sm font-medium"
            >
                <UserPlus className="w-4 h-4 mr-2" />
                Novo Usuário
            </button>
          </div>
      )}

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
                <th className="px-6 py-4 cursor-pointer hover:bg-brand-gray-100 transition-colors group" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-2">
                    Consultor
                    <ArrowUpDown className="w-3 h-3 text-brand-gray-400 group-hover:text-brand-primary" />
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-brand-gray-100 transition-colors group" onClick={() => handleSort('role')}>
                  <div className="flex items-center gap-2">
                    Time
                    <ArrowUpDown className="w-3 h-3 text-brand-gray-400 group-hover:text-brand-primary" />
                  </div>
                </th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4">Gestor Responsável</th>
                <th className="px-6 py-4 text-center cursor-pointer hover:bg-brand-gray-100" onClick={() => handleSort('active')}>Status</th>
                {canEdit && <th className="px-6 py-4 text-right">Ações</th>}
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
                      ${user.role === UserRole.LOGISTICA ? 'bg-amber-100 text-amber-800 border-amber-200' : ''}
                      ${user.role === UserRole.ADMIN ? 'bg-gray-100 text-gray-800 border-gray-200' : ''}
                      ${user.role === UserRole.FINANCEIRO ? 'bg-green-100 text-green-800 border-green-200' : ''}
                      ${user.role === UserRole.ESTRATEGIA ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : ''}
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
                      {user.managerName ? (
                          <div className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded w-fit">
                              <Briefcase size={12} className="text-gray-500"/> {user.managerName}
                          </div>
                      ) : <span className="text-brand-gray-400 text-xs italic">Não atribuído</span>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {user.active ? (
                        <span className="inline-block w-2.5 h-2.5 bg-green-500 rounded-full shadow-sm" title="Ativo"></span>
                    ) : (
                        <span className="inline-block w-2.5 h-2.5 bg-brand-gray-400 rounded-full shadow-sm" title="Inativo"></span>
                    )}
                  </td>
                  {canEdit && (
                      <td className="px-6 py-4">
                         <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleOpenModal(user)}
                              className="p-2 text-brand-gray-500 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors"
                              title="Editar"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleToggleStatus(user.id)}
                              className={`p-2 rounded-lg transition-colors ${user.active ? 'text-brand-gray-500 hover:text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                              title={user.active ? 'Inativar' : 'Ativar'}
                            >
                                <Power className="w-4 h-4" />
                            </button>
                         </div>
                      </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          
          {processedUsers.length === 0 && (
              <div className="p-10 text-center text-brand-gray-500 bg-brand-gray-50/50">
                  <Lock className="w-8 h-8 mx-auto mb-2 text-brand-gray-300" />
                  <p>Nenhum usuário encontrado para o seu nível de acesso.</p>
              </div>
          )}
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && canEdit && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
               <div className="bg-brand-gray-900 px-6 py-4 flex justify-between items-center">
                  <h3 className="text-white font-bold text-lg">
                    {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-brand-gray-400 hover:text-white transition-colors">
                     <X className="w-5 h-5" />
                  </button>
               </div>
               
               <form onSubmit={handleSaveUser} className="p-6 space-y-4">
                  <div>
                      <label className="block text-sm font-bold text-brand-gray-700 mb-1">Nome Completo</label>
                      <input 
                        required
                        type="text" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none"
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-brand-gray-700 mb-1">Time (Perfil)</label>
                      <select 
                        required
                        value={formData.role}
                        onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
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
                            value={formData.managerName || ''}
                            onChange={e => setFormData({...formData, managerName: e.target.value})}
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
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-brand-gray-700 mb-1">WhatsApp</label>
                          <input 
                            required
                            type="tel" 
                            value={formData.whatsapp}
                            onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                            className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none"
                          />
                      </div>
                  </div>

                  <div className="pt-4 flex gap-3 justify-end">
                      <button 
                        type="button" 
                        onClick={() => setIsModalOpen(false)}
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
  );
};

export default UsuariosPage;
