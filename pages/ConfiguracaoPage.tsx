
import React, { useState, useEffect, useRef } from 'react';
import { appStore } from '../services/store';
import { UserRole, IntegrationConfig } from '../types';
import { 
    Plus, Trash2, CheckCircle2, X, Users, LayoutList, 
    Phone, Briefcase, Map, Target, AlertCircle,
    Database, Link, RefreshCw, Server, FileSpreadsheet, UploadCloud, Activity, Save
} from 'lucide-react';
import { useAppStore } from '../services/useAppStore';

// --- TYPES ---
type ConfigTab = 'INSIDE' | 'FIELD' | 'INTEGRATIONS';

const ConfiguracaoPage: React.FC = () => {
  const { userRole } = useAppStore();
  const [activeTab, setActiveTab] = useState<ConfigTab>(userRole === UserRole.ESTRATEGIA ? 'INTEGRATIONS' : 'FIELD');
  const [notification, setNotification] = useState<string | null>(null);

  // --- CONFIG LISTS STATE ---
  const [visitReasons, setVisitReasons] = useState<string[]>([]);
  const [leadOrigins, setLeadOrigins] = useState<string[]>([]);
  const [withdrawalReasons, setWithdrawalReasons] = useState<string[]>([]);
  const [swapReasons, setSwapReasons] = useState<string[]>([]);

  // --- INTEGRATION STATE ---
  const [integration, setIntegration] = useState<IntegrationConfig>({
      sicBaseUrl: '',
      active: false,
      syncInterval: 60
  });

  // --- DATA & BI STATE (Migrated) ---
  const [powerBiUrl, setPowerBiUrl] = useState('');
  const [showPowerBi, setShowPowerBi] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setVisitReasons(appStore.getVisitReasons());
    setLeadOrigins(appStore.getLeadOrigins());
    setWithdrawalReasons(appStore.getWithdrawalReasons());
    setSwapReasons(appStore.getSwapReasons());
    
    // Load integration settings
    const integConfig = appStore.getIntegrationConfig();
    if(integConfig) setIntegration(integConfig);
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSaveIntegration = () => {
      appStore.setIntegrationConfig(integration);
      showNotification('Configuração de integração salva!');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setUploadedFileName(file.name);
          
          try {
              const data = await file.arrayBuffer();
              // @ts-ignore
              const workbook = window.XLSX.read(data);
              const worksheet = workbook.Sheets[workbook.SheetNames[0]];
              // @ts-ignore
              const jsonData = window.XLSX.utils.sheet_to_json(worksheet);
              
              // Map to ClientBaseRow - Robust mapping based on common Excel columns
              const mappedClients: any[] = jsonData.map((row: any, index: number) => ({
                  id: row['ID'] || row['id'] || `IMP-${Date.now()}-${index}`,
                  nomeEc: row['Nome'] || row['Cliente'] || row['Nome Fantasia'] || 'Sem Nome',
                  tipoSic: row['Tipo'] || row['Segmento'] || 'Oficina',
                  endereco: row['Endereço'] || row['Endereco'] || 'Endereço não informado',
                  responsavel: row['Responsável'] || row['Responsavel'] || row['Contato'] || 'Gerente',
                  contato: row['Telefone'] || row['Celular'] || row['Whatsapp'] || '',
                  regiaoAgrupada: row['Região'] || row['Regiao'] || row['Zona'] || 'Geral',
                  fieldSales: row['Consultor'] || row['Field'] || 'A definir',
                  insideSales: row['Inside'] || 'A definir',
                  status: 'Active',
                  cnpj: row['CNPJ'] || row['Documento'] || '',
                  // Try to parse lat/lng if available
                  latitude: row['Latitude'] ? parseFloat(row['Latitude']) : undefined,
                  longitude: row['Longitude'] ? parseFloat(row['Longitude']) : undefined,
              }));

              if (mappedClients.length > 0) {
                  // Merge with existing or Replace? For now, we update store
                  const currentClients = appStore.getClients();
                  // Simple logic: append new ones or update if ID matches?
                  // For demo/simplicity, we just append non-duplicates or refresh list.
                  // Let's replace the MOCK data with uploaded + heroes if it's a "fresh" load context,
                  // but safer to append new ones.
                  
                  const newClients = [...currentClients, ...mappedClients];
                  appStore.setClients(newClients);
                  
                  showNotification(`${mappedClients.length} clientes importados com sucesso!`);
              } else {
                  showNotification("O arquivo parece vazio ou fora do formato.");
              }

          } catch (error) {
              console.error(error);
              showNotification("Erro ao processar arquivo Excel. Verifique o formato.");
          }
      }
  };

  const handleSavePowerBi = () => {
      if(powerBiUrl) {
          setShowPowerBi(true);
          showNotification("URL do Power BI atualizada!");
      }
  };

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

  const showOperationalTabs = userRole !== UserRole.ESTRATEGIA;

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
        <p className="text-brand-gray-700">Parâmetros operacionais e integrações</p>
      </header>

      {/* Main Tabs */}
      <div className="flex space-x-1 bg-brand-gray-200 p-1 rounded-xl w-fit overflow-x-auto max-w-full">
          {showOperationalTabs && (
              <>
                <button 
                    onClick={() => setActiveTab('FIELD')}
                    className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'FIELD' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-800'}`}
                >
                    <Map className="w-4 h-4 mr-2" />
                    Field Sales
                </button>
                <button 
                    onClick={() => setActiveTab('INSIDE')}
                    className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'INSIDE' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-800'}`}
                >
                    <Phone className="w-4 h-4 mr-2" />
                    Inside Sales
                </button>
              </>
          )}
          <button 
              onClick={() => setActiveTab('INTEGRATIONS')}
              className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'INTEGRATIONS' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-800'}`}
          >
              <Database className="w-4 h-4 mr-2" />
              Integrações
          </button>
      </div>

      {/* --- CONTENT: FIELD SALES CONFIG --- */}
      {activeTab === 'FIELD' && showOperationalTabs && (
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
      {activeTab === 'INSIDE' && showOperationalTabs && (
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

      {/* --- CONTENT: INTEGRATIONS CONFIG --- */}
      {activeTab === 'INTEGRATIONS' && (
          <div className="animate-fade-in space-y-8 max-w-4xl mx-auto">
              
              {/* SECTION 1: SIC LEGACY INTEGRATION */}
              <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-brand-gray-100 bg-brand-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                              <Server className="w-6 h-6" />
                          </div>
                          <div>
                              <h3 className="font-bold text-lg text-brand-gray-900">Integração SIC (Legado)</h3>
                              <p className="text-xs text-brand-gray-500">Conexão via Middleware / API Gateway</p>
                          </div>
                      </div>
                      
                      {/* Active Toggle */}
                      <label className="flex items-center cursor-pointer">
                          <div className="relative">
                              <input type="checkbox" className="sr-only" checked={integration.active} onChange={e => setIntegration({...integration, active: e.target.checked})} />
                              <div className={`block w-10 h-6 rounded-full transition-colors ${integration.active ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                              <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${integration.active ? 'transform translate-x-4' : ''}`}></div>
                          </div>
                          <div className="ml-3 text-sm font-medium text-gray-700">{integration.active ? 'Ativo' : 'Inativo'}</div>
                      </label>
                  </div>

                  <div className="p-6 space-y-6">
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3 text-sm text-blue-800">
                          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                          <p>
                              A integração permite sincronizar TPV, Cadastros e Leads do sistema <strong>SIC</strong> em tempo real.
                              Certifique-se de que o middleware de conexão está rodando e acessível.
                          </p>
                      </div>

                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">API Base URL (Middleware)</label>
                              <div className="relative">
                                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                  <input 
                                      type="text" 
                                      className="w-full pl-10 pr-4 py-2.5 border border-brand-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                                      placeholder="https://api-bridge.car10.net/v1"
                                      value={integration.sicBaseUrl}
                                      onChange={e => setIntegration({...integration, sicBaseUrl: e.target.value})}
                                  />
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1 ml-1">URL pública ou interna do serviço de integração com o SIC.</p>
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Chave de Autenticação (Opcional)</label>
                              <div className="relative">
                                  <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                  <input 
                                      type="password" 
                                      className="w-full pl-10 pr-4 py-2.5 border border-brand-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                                      placeholder="Bearer Token ou API Key..."
                                      value={integration.sicApiKey || ''}
                                      onChange={e => setIntegration({...integration, sicApiKey: e.target.value})}
                                  />
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Intervalo de Sync (Min)</label>
                                  <div className="relative">
                                      <RefreshCw className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                      <input 
                                          type="number" min={5}
                                          className="w-full pl-10 pr-4 py-2.5 border border-brand-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                                          value={integration.syncInterval}
                                          onChange={e => setIntegration({...integration, syncInterval: Number(e.target.value)})}
                                      />
                                  </div>
                              </div>
                              <div className="flex items-end">
                                  <button onClick={handleSaveIntegration} className="w-full bg-brand-primary text-white py-2.5 rounded-lg font-bold shadow-md hover:bg-brand-dark transition-all flex items-center justify-center gap-2">
                                      <CheckCircle2 className="w-4 h-4" /> Salvar Configuração
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="bg-gray-50 p-4 border-t border-gray-200 text-xs text-center text-gray-500">
                      Última Sincronização: {integration.lastSync ? new Date(integration.lastSync).toLocaleString() : 'Nunca'}
                  </div>
              </div>

              {/* SECTION 2: DADOS & BI (Imported from Estrategia) */}
              <div className="flex items-center gap-2 mb-4 mt-8">
                  <Database className="w-6 h-6 text-brand-gray-400" />
                  <h2 className="text-xl font-bold text-brand-gray-800">Dados & BI</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* EXCEL UPLOAD */}
                  <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 p-6">
                      <h3 className="font-bold text-brand-gray-900 mb-4 flex items-center gap-2">
                          <FileSpreadsheet className="w-5 h-5 text-green-600" /> Importar Dados Externos
                      </h3>
                      <div 
                          className="border-2 border-dashed border-brand-gray-300 rounded-xl p-8 flex flex-col items-center justify-center bg-brand-gray-50 hover:bg-brand-gray-100 transition-colors cursor-pointer group"
                          onClick={() => fileInputRef.current?.click()}
                      >
                          <UploadCloud className="w-10 h-10 text-brand-gray-400 mb-3 group-hover:scale-110 transition-transform" />
                          <p className="text-sm font-bold text-brand-gray-700">Upload Base Excel (.xlsx)</p>
                          <p className="text-xs text-brand-gray-400 mt-1">Arraste ou clique para selecionar</p>
                          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.csv" onChange={handleFileUpload} />
                      </div>
                      {uploadedFileName && (
                          <div className="mt-3 flex items-center justify-between bg-green-50 px-3 py-2 rounded-lg border border-green-100">
                              <span className="text-xs font-bold text-green-700 flex items-center gap-2">
                                  <CheckCircle2 size={14} /> {uploadedFileName}
                              </span>
                              <span className="text-xs text-green-600">Processado</span>
                          </div>
                      )}
                  </div>

                  {/* POWER BI LINK */}
                  <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-100 p-6">
                      <h3 className="font-bold text-brand-gray-900 mb-4 flex items-center gap-2">
                          <Activity className="w-5 h-5 text-yellow-600" /> Power BI Integrado
                      </h3>
                      <div className="flex gap-2 mb-4">
                          <input 
                              type="text" 
                              placeholder="Cole o link de incorporação..." 
                              value={powerBiUrl}
                              onChange={(e) => setPowerBiUrl(e.target.value)}
                              className="flex-1 border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-500/20 outline-none"
                          />
                          <button 
                              onClick={handleSavePowerBi}
                              className="bg-brand-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition-colors"
                          >
                              <Save size={16} />
                          </button>
                      </div>
                      
                      <div className="bg-brand-gray-100 rounded-xl h-40 flex items-center justify-center border border-brand-gray-200 overflow-hidden">
                          {showPowerBi ? (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-white">
                                  <p className="text-sm font-bold text-brand-gray-900 mb-2">Relatório Vinculado</p>
                                  <a href={powerBiUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                      Abrir Dashboard Externo <Link size={12} />
                                  </a>
                              </div>
                          ) : (
                              <p className="text-xs text-brand-gray-400">Nenhum relatório vinculado.</p>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ConfiguracaoPage;
