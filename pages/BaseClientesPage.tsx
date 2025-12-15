
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, Download, Trash2, Search, Filter, X, ChevronLeft, ChevronRight, History, Calendar, MessageSquare, Send, User, Eye, AlertCircle, MapPin, Phone, AlertTriangle, ClipboardList, Briefcase, MapPinned, Zap, MoreVertical, LayoutList, Target, LifeBuoy, Settings, BadgePercent, RefreshCw, Terminal, Database, ArrowRightLeft, FileCheck, Server, ArrowDownCircle, Network, ArrowRight } from 'lucide-react';
import { UserRole, ClientBaseRow, ClientNote, Page } from '../types';
import { appStore } from '../services/store';
import { useAppStore } from '../services/useAppStore'; // Hook for navigation and user
import { predictRegion } from '../services/regionModel';
import { SupportChatModal } from '../components/SupportChatModal';

interface BaseClientesPageProps {
  role: UserRole;
}

interface ValidationError {
  row: number;
  column: string;
  message: string;
  solution: string;
}

const BaseClientesPage: React.FC<BaseClientesPageProps> = ({ role }) => {
  // Allow Strategy profile to have the same view/permissions as Gestor
  const isGestor = role === UserRole.GESTOR || role === UserRole.ADMIN;
  const { navigate, currentUser } = useAppStore(); // Get Current User
  
  const [data, setData] = useState<ClientBaseRow[]>([]);
  const [activeTab, setActiveTab] = useState<'CARTEIRA' | 'LEADS'>('CARTEIRA');

  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  
  // Upload & Progress State
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<ClientBaseRow[]>([]);

  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  
  // Data Flow Modal State
  const [showDataFlow, setShowDataFlow] = useState(false);

  // Validation State
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('Todos');
  const [consultantFilter, setConsultantFilter] = useState('Todos');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modals State
  const [selectedClient, setSelectedClient] = useState<ClientBaseRow | null>(null); // Unified Modal
  const [showRegionTool, setShowRegionTool] = useState(false); // New Tool Modal
  const [showSupportChat, setShowSupportChat] = useState(false); // New Support Chat Modal
  
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [newObservation, setNewObservation] = useState('');
  const [lastVisitInfo, setLastVisitInfo] = useState<{date: string, visitor: string} | null>(null);

  // Region Tool State
  const [toolInput, setToolInput] = useState({ bairro: '', cidade: 'São Paulo', uf: 'SP' });
  const [toolResult, setToolResult] = useState<{ region: string; method: string; confidence: string } | null>(null);
  const [toolLoading, setToolLoading] = useState(false);

  useEffect(() => {
    const allClients = appStore.getClients();
    
    // Filter by Current User if not Gestor/Admin
    if (isGestor) {
        setData(allClients);
    } else if (currentUser) {
        const filtered = allClients.filter(client => {
            if (role === UserRole.FIELD_SALES) return client.fieldSales === currentUser.name;
            if (role === UserRole.INSIDE_SALES) return client.insideSales === currentUser.name;
            return false;
        });
        setData(filtered);
    }
  }, [isGestor, currentUser, role]);

  // Derived Lists for Filters
  const uniqueRegions = useMemo(() => Array.from(new Set(data.map(c => c.regiaoAgrupada).filter(Boolean))), [data]);
  const uniqueFieldSales = useMemo(() => Array.from(new Set(data.map(c => c.fieldSales).filter(Boolean))), [data]);

  // Filtering Logic
  const filteredData = useMemo(() => {
    return data.filter(client => {
      // Tab Filter
      if (activeTab === 'CARTEIRA' && client.status === 'Lead') return false;
      if (activeTab === 'LEADS' && client.status !== 'Lead') return false;

      const searchLower = searchTerm.toLowerCase();
      // Search by ID or Name
      const matchesSearch = 
        client.nomeEc.toLowerCase().includes(searchLower) || 
        client.id.toLowerCase().includes(searchLower);
      
      const matchesRegion = regionFilter === 'Todos' || client.regiaoAgrupada === regionFilter;
      const matchesConsultant = consultantFilter === 'Todos' || client.fieldSales === consultantFilter;

      return matchesSearch && matchesRegion && matchesConsultant;
    });
  }, [data, searchTerm, regionFilter, consultantFilter, activeTab]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, regionFilter, consultantFilter, activeTab]);

  // --- FILE HANDLING & PROGRESS LOGIC ---
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    if (isGestor && e.dataTransfer.files.length > 0) handleFileProcess(e.dataTransfer.files[0]);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFileProcess(e.target.files[0]);
  };

  const handleFileProcess = (file: File) => {
      setFileName(file.name);
      setIsLoading(true);
      setUploadProgress(0);

      // Simulate Progress
      const interval = setInterval(() => {
          setUploadProgress(prev => {
              if (prev >= 100) {
                  clearInterval(interval);
                  return 100;
              }
              // Non-linear progress simulation
              const increment = Math.random() * 15 + 5; 
              return Math.min(prev + increment, 100);
          });
      }, 300);

      // Finish simulation
      setTimeout(() => {
          clearInterval(interval);
          setUploadProgress(100);
          
          // Generate MOCK PREVIEW DATA based on "upload"
          const mockImported: ClientBaseRow[] = Array.from({length: 5}, (_, i) => ({
              id: `IMP-${Math.floor(Math.random() * 9000)}`,
              nomeEc: `Nova Oficina Importada ${i+1}`,
              tipoSic: 'Mecânica',
              endereco: 'Rua Nova Importação, 123 - São Paulo',
              responsavel: 'Gerente Importado',
              contato: '11 99999-9999',
              regiaoAgrupada: 'Zona Sul SP',
              fieldSales: 'Cleiton Freitas',
              insideSales: 'Cauana Sousa',
              status: 'Active'
          }));
          
          setPreviewData(mockImported);
          setIsLoading(false);
          setShowPreview(true); // Open Preview Modal
          
          // Reset file input
          if (fileInputRef.current) fileInputRef.current.value = '';
      }, 2500); // 2.5s total time
  };

  const handleConfirmImport = () => {
      // Merge preview data into real data
      const newData = [...previewData, ...data];
      appStore.setClients(newData);
      setData(newData);
      
      setShowPreview(false);
      setPreviewData([]);
      setFileName(null);
      setUploadProgress(0);
      setShowSuccessBanner(true);
      
      setTimeout(() => setShowSuccessBanner(false), 4000);
  };

  const handleCancelImport = () => {
      setShowPreview(false);
      setPreviewData([]);
      setFileName(null);
      setUploadProgress(0);
  };

  // --- SHORTCUT NAVIGATION LOGIC ---
  const handleNavigateToPricing = () => {
      if(!selectedClient) return;
      sessionStorage.setItem('temp_pricing_context', JSON.stringify({
          clientName: selectedClient.nomeEc,
          document: selectedClient.id, 
          potential: selectedClient.leadMetadata?.revenuePotential || ''
      }));
      navigate(Page.PRICING);
  };

  const handleNavigateToLogistics = () => {
      if(!selectedClient) return;
      sessionStorage.setItem('temp_service_context', JSON.stringify({
          clientName: selectedClient.nomeEc,
          id: selectedClient.id
      }));
      navigate(Page.PEDIDOS_RASTREIO);
  };

  const handleDataFlow = () => {
      setShowDataFlow(true);
  };

  // --- History/Unified Modal Logic ---
  const handleOpenClientFile = (client: ClientBaseRow) => {
    setSelectedClient(client);
    fetchHistory(client.id);
  };

  const fetchHistory = (clientId: string) => {
    const appointments = appStore.getAppointments().filter(a => a.clientId === clientId);
    const notes = appStore.getClientNotes(clientId);

    const completedVisits = appointments.filter(a => a.status === 'Completed').sort((a, b) => {
       return (b.date || '').localeCompare(a.date || '');
    });

    if (completedVisits.length > 0) {
        const last = completedVisits[0];
        setLastVisitInfo({
            date: last.date || 'Data N/D',
            visitor: last.fieldSalesName
        });
    } else {
        setLastVisitInfo(null);
    }

    const combined = [
        ...appointments.map(a => ({ type: 'appointment', data: a, date: a.date || '9999-99-99' })),
        ...notes.map(n => ({ type: 'note', data: n, date: n.date }))
    ].sort((a, b) => b.date.localeCompare(a.date));

    setHistoryItems(combined);
  };

  const handleSaveObservation = () => {
    if (!selectedClient || !newObservation.trim()) return;
    const author = currentUser ? currentUser.name : (role === UserRole.INSIDE_SALES ? 'Inside Sales' : 'Gestão');
    
    const newNote: ClientNote = {
        id: Math.random().toString(36).substr(2, 9),
        clientId: selectedClient.id,
        authorName: author,
        date: new Date().toISOString(),
        content: newObservation
    };
    appStore.addClientNote(newNote);
    setNewObservation('');
    fetchHistory(selectedClient.id); 
  };

  // Pagination Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 relative">
      {/* Hidden File Input */}
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".xlsx, .xls, .csv" />

      {/* Success Banner */}
      {showSuccessBanner && (
          <div className="fixed top-4 right-4 bg-green-900 text-white px-6 py-4 rounded-xl shadow-2xl z-[100] animate-fade-in flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
              <div>
                  <h4 className="font-bold text-sm">Importação Concluída</h4>
                  <p className="text-xs text-green-200">Sua base de clientes foi atualizada com sucesso.</p>
              </div>
              <button onClick={() => setShowSuccessBanner(false)} className="ml-4 text-green-400 hover:text-white"><X size={18}/></button>
          </div>
      )}

      {/* UPLOAD PROGRESS MODAL (Blocking) */}
      {isLoading && (
          <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center">
                  <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                      <Upload className="w-8 h-8 text-brand-primary animate-bounce" />
                      <div className="absolute inset-0 border-4 border-brand-primary/30 rounded-full animate-spin border-t-brand-primary"></div>
                  </div>
                  <h3 className="font-bold text-xl text-brand-gray-900 mb-2">Processando Arquivo</h3>
                  <p className="text-sm text-brand-gray-500 mb-6">{fileName}</p>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2 overflow-hidden">
                      <div 
                          className="bg-brand-primary h-2.5 rounded-full transition-all duration-300 ease-out" 
                          style={{ width: `${uploadProgress}%` }}
                      ></div>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-brand-gray-400">
                      <span>Carregando...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                  </div>
              </div>
          </div>
      )}

      {/* DATA FLOW MODAL (Visual Status) */}
      {showDataFlow && (
          <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-brand-gray-900 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-brand-gray-800">
                  <div className="p-8 relative">
                      <div className="flex justify-between items-center mb-8">
                          <div>
                              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                  <Network className="w-8 h-8 text-brand-primary" />
                                  Data Flow Integration
                              </h2>
                              <p className="text-brand-gray-400 text-sm mt-1">Status do pipeline de dados (ETL)</p>
                          </div>
                          <button onClick={() => setShowDataFlow(false)} className="text-brand-gray-500 hover:text-white transition-colors bg-white/5 p-2 rounded-full">
                              <X size={24} />
                          </button>
                      </div>

                      {/* Visual Flow Diagram */}
                      <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative px-4 py-8">
                          
                          {/* Step 1: Source */}
                          <div className="flex flex-col items-center z-10">
                              <div className="w-20 h-20 bg-blue-900/50 rounded-2xl border border-blue-500/30 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                                  <Database className="w-10 h-10 text-blue-400" />
                              </div>
                              <span className="text-sm font-bold text-blue-300">ERP Legado</span>
                              <span className="text-xs text-brand-gray-500 mt-1">Oracle DB</span>
                          </div>

                          {/* Connector 1 */}
                          <div className="flex-1 h-1 bg-brand-gray-800 relative w-full md:w-auto">
                              <div className="absolute top-1/2 left-0 w-full h-full -translate-y-1/2 bg-gradient-to-r from-blue-900 via-brand-primary to-purple-900 opacity-50 animate-pulse"></div>
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-gray-900 px-2">
                                  <ArrowRight className="w-5 h-5 text-brand-gray-600" />
                              </div>
                          </div>

                          {/* Step 2: Processing */}
                          <div className="flex flex-col items-center z-10">
                              <div className="w-20 h-20 bg-brand-primary/20 rounded-full border-2 border-brand-primary flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(243,18,60,0.4)] animate-pulse">
                                  <RefreshCw className="w-10 h-10 text-brand-primary animate-spin-slow" />
                              </div>
                              <span className="text-sm font-bold text-white">ETL Processor</span>
                              <span className="text-xs text-green-400 mt-1 flex items-center gap-1"><CheckCircle2 size={10}/> Running</span>
                          </div>

                          {/* Connector 2 */}
                          <div className="flex-1 h-1 bg-brand-gray-800 relative w-full md:w-auto">
                              <div className="absolute top-1/2 left-0 w-full h-full -translate-y-1/2 bg-gradient-to-r from-brand-primary via-purple-900 to-green-900 opacity-50 animate-pulse delay-75"></div>
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-gray-900 px-2">
                                  <ArrowRight className="w-5 h-5 text-brand-gray-600" />
                              </div>
                          </div>

                          {/* Step 3: Destination */}
                          <div className="flex flex-col items-center z-10">
                              <div className="w-20 h-20 bg-green-900/50 rounded-2xl border border-green-500/30 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                                  <Server className="w-10 h-10 text-green-400" />
                              </div>
                              <span className="text-sm font-bold text-green-300">Data Lake</span>
                              <span className="text-xs text-brand-gray-500 mt-1">Updated 2m ago</span>
                          </div>
                      </div>

                      {/* Stats Footer */}
                      <div className="mt-8 grid grid-cols-3 gap-4 border-t border-brand-gray-800 pt-6">
                          <div className="text-center">
                              <p className="text-brand-gray-500 text-xs uppercase font-bold tracking-wider">Registros Processados</p>
                              <p className="text-2xl font-bold text-white mt-1">145.289</p>
                          </div>
                          <div className="text-center border-l border-brand-gray-800">
                              <p className="text-brand-gray-500 text-xs uppercase font-bold tracking-wider">Latência Média</p>
                              <p className="text-2xl font-bold text-white mt-1">120ms</p>
                          </div>
                          <div className="text-center border-l border-brand-gray-800">
                              <p className="text-brand-gray-500 text-xs uppercase font-bold tracking-wider">Erros (24h)</p>
                              <p className="text-2xl font-bold text-green-500 mt-1">0</p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* PREVIEW MODAL */}
      {showPreview && (
          <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-brand-gray-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
                      <div className="flex items-center gap-3">
                          <FileCheck className="w-6 h-6 text-green-400" />
                          <div>
                              <h3 className="font-bold text-lg">Pré-visualização da Importação</h3>
                              <p className="text-xs text-brand-gray-400">Verifique os dados antes de confirmar.</p>
                          </div>
                      </div>
                      <button onClick={handleCancelImport} className="text-brand-gray-400 hover:text-white"><X size={20}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-auto bg-brand-gray-50 p-6">
                      <div className="bg-white rounded-xl border border-brand-gray-200 overflow-hidden shadow-sm">
                          <table className="w-full text-sm text-left">
                              <thead className="bg-brand-gray-100 text-brand-gray-600 font-bold border-b border-brand-gray-200 text-xs uppercase tracking-wider">
                                  <tr>
                                      <th className="px-6 py-3">Nome EC</th>
                                      <th className="px-6 py-3">Endereço</th>
                                      <th className="px-6 py-3">Responsável</th>
                                      <th className="px-6 py-3">Região</th>
                                      <th className="px-6 py-3">Status</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-brand-gray-100">
                                  {previewData.map((row, idx) => (
                                      <tr key={idx} className="hover:bg-brand-gray-50">
                                          <td className="px-6 py-3 font-bold text-brand-gray-900">{row.nomeEc}</td>
                                          <td className="px-6 py-3 text-brand-gray-600">{row.endereco}</td>
                                          <td className="px-6 py-3 text-brand-gray-600">{row.responsavel}</td>
                                          <td className="px-6 py-3 text-brand-gray-600">{row.regiaoAgrupada}</td>
                                          <td className="px-6 py-3">
                                              <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded font-bold uppercase border border-green-200">Novo</span>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                      <p className="text-xs text-brand-gray-500 mt-4 text-center">
                          Mostrando {previewData.length} registros identificados no arquivo <strong>{fileName}</strong>.
                      </p>
                  </div>

                  <div className="p-4 bg-white border-t border-brand-gray-200 flex justify-end gap-3 shrink-0">
                      <button 
                          onClick={handleCancelImport}
                          className="px-4 py-2 border border-brand-gray-300 text-brand-gray-600 font-bold rounded-lg hover:bg-brand-gray-50 transition-colors"
                      >
                          Cancelar
                      </button>
                      <button 
                          onClick={handleConfirmImport}
                          className="px-6 py-2 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-dark transition-colors shadow-lg flex items-center gap-2"
                      >
                          <CheckCircle2 className="w-4 h-4" /> Confirmar Importação
                      </button>
                  </div>
              </div>
          </div>
      )}

      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-gray-900">Base de Clientes</h1>
          <p className="text-brand-gray-700">
            {isGestor ? "Importação e saneamento da carteira" : "Consulta de base e histórico"}
          </p>
        </div>
        
        {/* Buttons (Import/Actions) */}
        <div className="flex gap-2">
            {isGestor && (
                <>
                    <button 
                        onClick={handleDataFlow}
                        className="flex items-center bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 transition-colors shadow-sm text-sm"
                        title="Ver Data Flow"
                    >
                        <Database className="w-4 h-4 mr-2" /> Data Flow
                    </button>
                    
                    {activeTab === 'CARTEIRA' && (
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center bg-brand-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-brand-dark transition-colors shadow-sm text-sm"
                        >
                            <Upload className="w-4 h-4 mr-2" /> Atualizar Base
                        </button>
                    )}
                </>
            )}
        </div>
      </header>
      
      {/* TABS */}
      <div className="flex space-x-1 bg-brand-gray-200 p-1 rounded-xl w-fit">
          <button onClick={() => setActiveTab('CARTEIRA')} className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'CARTEIRA' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-800'}`}>
              <LayoutList className="w-4 h-4 mr-2" /> Carteira Ativa
          </button>
          <button onClick={() => setActiveTab('LEADS')} className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'LEADS' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-800'}`}>
              <Target className="w-4 h-4 mr-2" /> Leads
          </button>
      </div>

      {/* Data Table */}
      {(data.length > 0 || activeTab === 'LEADS') && !isLoading && (
        <div className="space-y-4">
          
          {/* Filters Bar (Simulated) */}
          <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-brand-gray-100">
             <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray-400" />
                <input type="text" placeholder="Buscar por Nome ou ID..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-brand-gray-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-brand-primary" />
             </div>
             {/* ... Other filters ... */}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden">
            {/* DESKTOP TABLE View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-brand-gray-500 font-bold border-b border-brand-gray-200 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Nome do EC</th>
                    <th className="px-6 py-4">Região</th>
                    <th className="px-6 py-4">Consultor</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-gray-50">
                  {paginatedData.map((row) => (
                    <tr key={row.id} className="hover:bg-brand-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-brand-gray-900">{row.nomeEc}</td>
                      <td className="px-6 py-4 text-brand-gray-600">{row.regiaoAgrupada}</td>
                      <td className="px-6 py-4 text-brand-gray-600">{row.fieldSales}</td>
                      <td className="px-6 py-4 text-center">
                          <button onClick={() => handleOpenClientFile(row)} className="inline-flex items-center gap-2 px-3 py-1.5 text-brand-gray-600 hover:text-brand-primary hover:bg-brand-primary/5 rounded-lg transition-colors text-xs font-bold border border-transparent hover:border-brand-primary/20">
                              <ClipboardList className="w-4 h-4" /> Ficha
                          </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* UNIFIED CLIENT FILE MODAL */}
      {selectedClient && (
         <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Modal Header */}
                <div className="bg-brand-gray-900 p-6 flex justify-between items-start text-white shrink-0">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            {selectedClient.nomeEc}
                            {selectedClient.status === 'Lead' && <span className="bg-brand-light text-[10px] px-2 py-0.5 rounded text-white uppercase font-bold">Lead</span>}
                        </h2>
                        <div className="flex gap-2 mt-2">
                            <span className="bg-white/10 px-2 py-0.5 rounded text-xs text-brand-gray-300 font-mono flex items-center">
                                ID: {selectedClient.id}
                            </span>
                            <button onClick={() => setShowSupportChat(true)} className="bg-white/10 hover:bg-white/20 px-3 py-0.5 rounded text-xs font-bold text-white flex items-center gap-1 transition-colors border border-white/10">
                                <LifeBuoy className="w-3 h-3" /> Suporte Logística
                            </button>
                        </div>
                    </div>
                    <button onClick={() => setSelectedClient(null)} className="text-brand-gray-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                {/* --- CONTEXTUAL SHORTCUTS (NEW FLUIDITY FEATURE) --- */}
                <div className="bg-brand-primary/5 border-b border-brand-primary/10 p-3 flex gap-3 overflow-x-auto shrink-0">
                    <button 
                        onClick={handleNavigateToPricing}
                        className="flex-1 bg-white border border-brand-gray-200 text-brand-gray-700 hover:border-brand-primary hover:text-brand-primary px-4 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 group"
                    >
                        <div className="bg-brand-primary/10 text-brand-primary p-1.5 rounded-md group-hover:bg-brand-primary group-hover:text-white transition-colors">
                            <BadgePercent className="w-4 h-4" />
                        </div>
                        Iniciar Cotação de Taxas
                    </button>
                    
                    <button 
                        onClick={handleNavigateToLogistics}
                        className="flex-1 bg-white border border-brand-gray-200 text-brand-gray-700 hover:border-blue-500 hover:text-blue-600 px-4 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 group"
                    >
                        <div className="bg-blue-50 text-blue-600 p-1.5 rounded-md group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <RefreshCw className="w-4 h-4" />
                        </div>
                        Solicitar Troca / Serviço
                    </button>
                </div>

                {/* Details Body */}
                <div className="bg-white border-b border-brand-gray-200 p-6 shrink-0 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                         <div>
                            <label className="text-[10px] font-bold text-brand-gray-400 uppercase tracking-wider block mb-1">Endereço</label>
                            <div className="flex items-start text-sm text-brand-gray-800">
                                <MapPin className="w-4 h-4 mr-2 text-brand-primary shrink-0 mt-0.5" />
                                {selectedClient.endereco}
                            </div>
                         </div>
                         <div>
                            <label className="text-[10px] font-bold text-brand-gray-400 uppercase tracking-wider block mb-1">Contato</label>
                            <a href={`https://wa.me/55${selectedClient.contato.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-brand-gray-800 hover:text-green-600 transition-colors group cursor-pointer">
                                <Phone className="w-4 h-4 mr-2 text-brand-gray-400 group-hover:text-green-500" />
                                <span className="group-hover:underline">{selectedClient.contato}</span>
                            </a>
                         </div>
                    </div>
                    {/* ... other details ... */}
                </div>

                {/* Timeline */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white min-h-[200px]">
                    {historyItems.map((item, index) => (
                        <div key={index} className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${item.data.authorName === 'SISTEMA' ? 'bg-purple-100 text-purple-600' : 'bg-brand-gray-100 text-brand-gray-500'}`}>
                                    {item.data.authorName === 'SISTEMA' ? <Settings size={14} /> : <User size={14} />}
                                </div>
                                {index !== historyItems.length - 1 && <div className="w-0.5 bg-brand-gray-100 h-full -mb-4"></div>}
                            </div>
                            <div className="flex-1 pb-4">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-brand-gray-400">{new Date(item.date).toLocaleDateString()}</span>
                                </div>
                                <div className="rounded-lg p-3 border border-brand-gray-100 bg-brand-gray-50">
                                    <p className="font-bold text-sm mb-1 text-brand-gray-900">{item.type === 'appointment' ? 'Visita' : item.data.authorName}</p>
                                    <p className="text-sm text-brand-gray-700 whitespace-pre-line">{item.type === 'appointment' ? item.data.fieldObservation : item.data.content}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Add Observation Form */}
                <div className="p-4 bg-brand-gray-50 border-t border-brand-gray-200 shrink-0">
                    <div className="flex gap-2">
                        <textarea 
                            value={newObservation}
                            onChange={(e) => setNewObservation(e.target.value)}
                            placeholder="Registre aqui o contato realizado..."
                            className="flex-1 border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none resize-none h-14"
                        />
                        <button onClick={handleSaveObservation} disabled={!newObservation.trim()} className="bg-brand-gray-900 text-white px-4 rounded-lg hover:bg-brand-dark disabled:opacity-50 flex flex-col items-center justify-center transition-colors">
                            <Send className="w-4 h-4 mb-1" /> <span className="text-xs font-bold">Salvar</span>
                        </button>
                    </div>
                </div>

            </div>
         </div>
      )}

      {selectedClient && <SupportChatModal isOpen={showSupportChat} onClose={() => setShowSupportChat(false)} clientName={selectedClient.nomeEc} clientId={selectedClient.id} currentUser={currentUser?.name || role} currentRole={role} />}
    </div>
  );
};

export default BaseClientesPage;
