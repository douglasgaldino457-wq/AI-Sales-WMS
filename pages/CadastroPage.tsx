
import React, { useState, useEffect } from 'react';
import { 
    FilePlus, MapPin, User, Phone, Save, Briefcase, Map, 
    CheckCircle2, ArrowRight, Building2, Store, MapPinned
} from 'lucide-react';
import { appStore } from '../services/store';
import { UserRole, SystemUser } from '../types';
import { predictRegion } from '../services/regionModel';
import { AddressAutocomplete, AddressResult } from '../components/AddressAutocomplete';

const CadastroPage: React.FC = () => {
  // Form State
  const [formData, setFormData] = useState({
    nomeEc: '',
    tipoSic: 'Mecânica Geral',
    endereco: '',
    bairro: '',
    cidade: 'São Paulo',
    uf: 'SP',
    regiaoAgrupada: '', // Added field
    responsavel: '',
    contato: '',
    fieldSales: '',
    insideSales: '',
    status: 'Lead', // Default to Lead
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fieldUsers, setFieldUsers] = useState<SystemUser[]>([]);
  const [insideUsers, setInsideUsers] = useState<SystemUser[]>([]);
  const [generatedId, setGeneratedId] = useState('');

  // Initial Load
  useEffect(() => {
    const users = appStore.getUsers();
    setFieldUsers(users.filter(u => u.role === UserRole.FIELD_SALES && u.active));
    setInsideUsers(users.filter(u => u.role === UserRole.INSIDE_SALES && u.active));
    generateNewId();
  }, []);

  // Auto-predict Region Effect
  useEffect(() => {
    const timer = setTimeout(async () => {
        if (formData.bairro.length > 2 && formData.cidade && formData.uf) {
            try {
                const result = await predictRegion(formData.bairro, formData.cidade, formData.uf);
                if (result.region && result.region !== 'Região Não Identificada') {
                    setFormData(prev => ({ ...prev, regiaoAgrupada: result.region }));
                }
            } catch (e) {
                console.error("Erro ao prever região:", e);
            }
        }
    }, 800); // 800ms debounce to avoid rapid API calls (if AI is used)

    return () => clearTimeout(timer);
  }, [formData.bairro, formData.cidade, formData.uf]);

  const generateNewId = () => {
    const id = `CAD-${Math.floor(Math.random() * 10000)}`;
    setGeneratedId(id);
  };

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressSelect = (result: AddressResult) => {
      setFormData(prev => ({
          ...prev,
          endereco: result.street,
          bairro: result.neighborhood,
          cidade: result.city,
          uf: result.state
      }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Use existing Region or Predict if empty
      let finalRegion = formData.regiaoAgrupada;
      if (!finalRegion) {
          const regionResult = await predictRegion(formData.bairro, formData.cidade, formData.uf);
          finalRegion = regionResult.region;
      }
      
      // 2. Create Client Object
      const newClient = {
        id: generatedId,
        nomeEc: formData.nomeEc,
        tipoSic: formData.tipoSic,
        endereco: `${formData.endereco}, ${formData.bairro} - ${formData.cidade}/${formData.uf}`,
        responsavel: formData.responsavel,
        contato: formData.contato,
        regiaoAgrupada: finalRegion,
        fieldSales: formData.fieldSales || 'A definir',
        insideSales: formData.insideSales || 'A definir',
        status: formData.status as 'Active' | 'Lead',
        leadMetadata: formData.status === 'Lead' ? {
           outcome: 'Em Aberto',
           lastInteractionDate: new Date().toISOString()
        } : undefined
      };

      // 3. Save to Store
      appStore.addClient(newClient);

      // 4. Success Feedback
      setLoading(false);
      setSuccess(true);
      
      // Reset after delay
      setTimeout(() => {
        setSuccess(false);
        setFormData({
            nomeEc: '',
            tipoSic: 'Mecânica Geral',
            endereco: '',
            bairro: '',
            cidade: 'São Paulo',
            uf: 'SP',
            regiaoAgrupada: '',
            responsavel: '',
            contato: '',
            fieldSales: '',
            insideSales: '',
            status: 'Lead',
        });
        generateNewId();
      }, 3000);

    } catch (error) {
      console.error(error);
      setLoading(false);
      alert('Erro ao salvar cadastro. Tente novamente.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
       <header>
          <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
             <FilePlus className="w-8 h-8 text-brand-primary" />
             Cadastro de Cliente / Lead
          </h1>
          <p className="text-brand-gray-700 mt-1">Registre novos estabelecimentos manualmente na base.</p>
       </header>

       {success ? (
         <div className="bg-green-50 border border-green-200 rounded-2xl p-12 text-center animate-fade-in flex flex-col items-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 shadow-sm">
                <CheckCircle2 size={48} />
            </div>
            <h2 className="text-2xl font-bold text-green-900 mb-2">Cadastro Realizado!</h2>
            <p className="text-green-700 mb-8">
                O cliente <strong>{formData.nomeEc}</strong> foi adicionado à base com sucesso.<br/>
                ID gerado: <span className="font-mono font-bold">{generatedId}</span>
            </p>
            <button 
                onClick={() => setSuccess(false)}
                className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg"
            >
                Cadastrar Novo
            </button>
         </div>
       ) : (
         <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg border border-brand-gray-100 overflow-hidden animate-fade-in">
            {/* Form Header */}
            <div className="bg-brand-gray-900 px-8 py-6 border-b border-brand-gray-800 flex justify-between items-center">
                <div>
                   <h3 className="text-white font-bold text-lg">Dados Cadastrais</h3>
                   <p className="text-brand-gray-400 text-sm">Preencha todos os campos obrigatórios (*)</p>
                </div>
                <div className="bg-white/10 px-3 py-1 rounded border border-white/20 text-brand-gray-300 font-mono text-sm">
                    ID: {generatedId}
                </div>
            </div>

            <div className="p-8 space-y-8">
                {/* Section 1: Basic Info */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-brand-gray-400 uppercase tracking-wider flex items-center gap-2 border-b border-brand-gray-100 pb-2">
                        <Store className="w-4 h-4" />
                        Informações do Estabelecimento
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-brand-gray-700 mb-1">Nome do EC (Razão/Fantasia) *</label>
                            <input 
                                required
                                name="nomeEc"
                                value={formData.nomeEc}
                                onChange={handleInputChange}
                                type="text" 
                                placeholder="Ex: Auto Center Silva"
                                className="w-full border border-brand-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-brand-gray-700 mb-1">Segmento / Tipo SIC</label>
                            <select 
                                name="tipoSic"
                                value={formData.tipoSic}
                                onChange={handleInputChange}
                                className="w-full border border-brand-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none bg-white"
                            >
                                <option value="Mecânica Geral">Mecânica Geral</option>
                                <option value="Centro Automotivo">Centro Automotivo</option>
                                <option value="Funilaria e Pintura">Funilaria e Pintura</option>
                                <option value="Borracharia">Borracharia</option>
                                <option value="Auto Elétrica">Auto Elétrica</option>
                                <option value="Lava Rápido">Lava Rápido</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-brand-gray-700 mb-1">Responsável *</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-brand-gray-400" />
                                <input 
                                    required
                                    name="responsavel"
                                    value={formData.responsavel}
                                    onChange={handleInputChange}
                                    type="text" 
                                    className="w-full pl-9 border border-brand-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-brand-gray-700 mb-1">Telefone / WhatsApp *</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-brand-gray-400" />
                                <input 
                                    required
                                    name="contato"
                                    value={formData.contato}
                                    onChange={handleInputChange}
                                    type="tel" 
                                    placeholder="(11) 99999-9999"
                                    className="w-full pl-9 border border-brand-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-brand-gray-700 mb-1">Status na Base</label>
                            <div className="flex bg-brand-gray-100 p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setFormData(p => ({...p, status: 'Lead'}))}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${formData.status === 'Lead' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-500'}`}
                                >
                                    Lead (Novo)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData(p => ({...p, status: 'Active'}))}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${formData.status === 'Active' ? 'bg-white text-green-600 shadow-sm' : 'text-brand-gray-500'}`}
                                >
                                    Carteira (Ativo)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 2: Address */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-brand-gray-400 uppercase tracking-wider flex items-center gap-2 border-b border-brand-gray-100 pb-2">
                        <MapPin className="w-4 h-4" />
                        Endereço e Localização
                    </h4>
                    
                    <div>
                        <label className="block text-sm font-bold text-brand-gray-700 mb-1">Logradouro (Busca Automática) *</label>
                        <AddressAutocomplete 
                            value={formData.endereco}
                            onChange={(val) => setFormData(p => ({...p, endereco: val}))}
                            onSelect={handleAddressSelect}
                            placeholder="Digite rua, número, bairro..."
                            required
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-brand-gray-700 mb-1">Bairro *</label>
                            <input 
                                required
                                name="bairro"
                                value={formData.bairro}
                                onChange={handleInputChange}
                                type="text" 
                                className="w-full border border-brand-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-brand-gray-700 mb-1">Cidade *</label>
                            <input 
                                required
                                name="cidade"
                                value={formData.cidade}
                                onChange={handleInputChange}
                                type="text" 
                                className="w-full border border-brand-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-brand-gray-700 mb-1">UF *</label>
                            <input 
                                required
                                name="uf"
                                value={formData.uf}
                                onChange={handleInputChange}
                                maxLength={2}
                                type="text" 
                                className="w-full border border-brand-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none uppercase"
                            />
                        </div>
                    </div>

                    {/* NEW FIELD: REGION */}
                    <div>
                        <label className="block text-sm font-bold text-brand-gray-700 mb-1 flex items-center gap-2">
                            Região Agrupada (Automático)
                            <MapPinned className="w-4 h-4 text-brand-primary" />
                        </label>
                        <input 
                            name="regiaoAgrupada"
                            value={formData.regiaoAgrupada}
                            onChange={handleInputChange}
                            type="text" 
                            className="w-full border border-brand-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none bg-brand-gray-50 text-brand-gray-900 font-medium"
                            placeholder="Aguardando endereço..."
                        />
                        <p className="text-xs text-brand-gray-500 italic mt-1">
                            * Preenchida automaticamente com base no bairro e cidade. Você pode alterar se necessário.
                        </p>
                    </div>
                </div>

                {/* Section 3: Allocation */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-brand-gray-400 uppercase tracking-wider flex items-center gap-2 border-b border-brand-gray-100 pb-2">
                        <Briefcase className="w-4 h-4" />
                        Alocação de Carteira
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-brand-gray-700 mb-1">Field Sales Responsável</label>
                            <select 
                                name="fieldSales"
                                value={formData.fieldSales}
                                onChange={handleInputChange}
                                className="w-full border border-brand-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none bg-white"
                            >
                                <option value="">A definir</option>
                                {fieldUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-brand-gray-700 mb-1">Inside Sales Responsável</label>
                            <select 
                                name="insideSales"
                                value={formData.insideSales}
                                onChange={handleInputChange}
                                className="w-full border border-brand-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none bg-white"
                            >
                                <option value="">A definir</option>
                                {insideUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

            </div>

            {/* Actions */}
            <div className="p-6 bg-brand-gray-50 border-t border-brand-gray-100 flex justify-end gap-4">
                <button 
                    type="button"
                    onClick={() => setFormData({
                        nomeEc: '', tipoSic: 'Mecânica Geral', endereco: '', bairro: '', cidade: 'São Paulo', uf: 'SP', regiaoAgrupada: '', responsavel: '', contato: '', fieldSales: '', insideSales: '', status: 'Lead'
                    })}
                    className="px-6 py-3 text-brand-gray-600 font-bold text-sm hover:bg-brand-gray-100 rounded-xl transition-colors"
                >
                    Limpar
                </button>
                <button 
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-dark transition-all shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50"
                >
                    {loading ? (
                        <>Processando...</>
                    ) : (
                        <>
                           <Save className="w-4 h-4" />
                           Salvar Cadastro
                        </>
                    )}
                </button>
            </div>
         </form>
       )}
    </div>
  );
};

export default CadastroPage;
