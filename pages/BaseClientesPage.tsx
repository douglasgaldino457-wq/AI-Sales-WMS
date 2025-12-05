
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, Download, Trash2, Search, Filter, X, ChevronLeft, ChevronRight, History, Calendar, MessageSquare, Send, User, Eye, AlertCircle, MapPin, Phone, AlertTriangle, ClipboardList, Briefcase, MapPinned, Zap, MoreVertical, LayoutList, Target } from 'lucide-react';
import { UserRole, ClientBaseRow, ClientNote } from '../types';
import { appStore } from '../services/store';
import { predictRegion } from '../services/regionModel';

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
  const isGestor = role === UserRole.GESTOR || role === UserRole.ESTRATEGIA;
  const [data, setData] = useState<ClientBaseRow[]>([]);
  const [activeTab, setActiveTab] = useState<'CARTEIRA' | 'LEADS'>('CARTEIRA');

  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importConfirmed, setImportConfirmed] = useState(!isGestor); 
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  
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
  
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [newObservation, setNewObservation] = useState('');
  const [lastVisitInfo, setLastVisitInfo] = useState<{date: string, visitor: string} | null>(null);

  // Region Tool State
  const [toolInput, setToolInput] = useState({ bairro: '', cidade: 'São Paulo', uf: 'SP' });
  const [toolResult, setToolResult] = useState<{ region: string; method: string; confidence: string } | null>(null);
  const [toolLoading, setToolLoading] = useState(false);

  useEffect(() => {
    const storedClients = appStore.getClients();
    setData(storedClients);
  }, [isGestor]);

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isGestor) {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileProcess(files[0]);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleFileProcess = (file: File) => {
    setValidationErrors([]); 
    
    if (!file.name.match(/\.(xlsx|csv|xls)$/)) {
      alert("Por favor, selecione um arquivo Excel (.xlsx) ou CSV.");
      return;
    }

    setFileName(file.name);
    setIsLoading(true);
    setShowSuccessBanner(false);

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        // Access XLSX from global scope (loaded via script tag in index.html)
        const XLSX = (window as any).XLSX;
        
        if (!XLSX) {
           throw new Error("Biblioteca de processamento não carregada. Verifique sua conexão.");
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (rawData.length === 0) {
           alert("O arquivo parece estar vazio.");
           setIsLoading(false);
           return;
        }

        const errors: ValidationError[] = [];
        
        // Process rows (using Promise.all for potential async operations like AI Region Prediction)
        const processedDataPromise = rawData.map(async (row: any, index: number) => {
           // Helper to find key case-insensitively or by common aliases
           const getValue = (keys: string[]) => {
              for (const k of keys) {
                 if (row[k] !== undefined) return row[k];
                 // Try lowercase match & trim
                 const foundKey = Object.keys(row).find(rk => rk.trim().toLowerCase() === k.trim().toLowerCase());
                 if (foundKey) return row[foundKey];
              }
              return null;
           };

           // Mapping Logic with expanded aliases
           const id = getValue(['id', 'código', 'codigo', 'id cliente']) || `IMP-${Math.floor(Math.random() * 10000)}`;
           const nomeEc = getValue(['nome', 'cliente', 'nome do ec', 'razão social', 'razao social', 'estabelecimento']) || 'Sem Nome';
           const tipoSic = getValue(['tipo', 'classificação', 'tipo sic', 'segmento', 'categoria']) || 'Mecânica Geral';
           const endereco = getValue(['endereço', 'endereco', 'logradouro', 'rua']) || 'Endereço não informado';
           const responsavel = getValue(['responsável', 'responsavel', 'contato', 'gestor']) || 'Gerente';
           const contato = getValue(['telefone', 'celular', 'whatsapp', 'tel', 'fone']) || '';
           
           const fieldSales = getValue(['field', 'field sales', 'consultor', 'executivo']) || 'A definir';
           const insideSales = getValue(['inside', 'inside sales', 'vendedor', 'sdr']) || 'A definir';
           const status = getValue(['status']) === 'Lead' ? 'Lead' : 'Active';

           // Region Logic: Explicit -> Inference
           // UPDATED: Added 'reg. agrupada' and variations to ensure it catches the specific column name
           let regiaoAgrupada = getValue([
               'reg. agrupada', 'reg agrupada', 'reg.agrupada', 
               'regiao agrupada', 'região agrupada',
               'região', 'regiao', 'zona', 'regional', 'territorio'
           ]);
           
           // Extra fields for inference
           const bairro = getValue(['bairro', 'neighborhood', 'bairo']) || '';
           const cidade = getValue(['cidade', 'city', 'município', 'municipio']) || 'São Paulo';
           const uf = getValue(['uf', 'estado', 'state']) || 'SP';

           // If Region is missing, try to infer using the regionModel service
           if (!regiaoAgrupada || regiaoAgrupada === 'A definir' || String(regiaoAgrupada).trim() === '') {
               if (bairro) {
                   try {
                       const prediction = await predictRegion(String(bairro), String(cidade), String(uf));
                       regiaoAgrupada = prediction.region;
                   } catch (e) {
                       regiaoAgrupada = 'A definir';
                   }
               } else {
                   regiaoAgrupada = 'A definir';
               }
           }

           // Validation
           const rowNum = index + 2; // +1 for header, +1 for 0-index
           if (nomeEc === 'Sem Nome') {
              errors.push({
                 row: rowNum, column: 'Nome do EC', message: 'Nome não identificado.', solution: 'Verifique se a coluna se chama "Nome", "Cliente" ou "Razão Social".'
              });
           }

           return {
              id: String(id),
              nomeEc: String(nomeEc),
              tipoSic: String(tipoSic),
              endereco: String(endereco),
              responsavel: String(responsavel),
              contato: String(contato),
              regiaoAgrupada: String(regiaoAgrupada),
              fieldSales: String(fieldSales),
              insideSales: String(insideSales),
              status: status,
              // Try to parse coords if available
              latitude: row['lat'] || row['latitude'] ? Number(row['lat'] || row['latitude']) : undefined,
              longitude: row['lng'] || row['longitude'] || row['long'] ? Number(row['lng'] || row['longitude'] || row['long']) : undefined,
           };
        });

        const processedData = await Promise.all(processedDataPromise);

        if (errors.length > 0) {
           setValidationErrors(errors);
           setFileName(null);
        } else {
           setData(processedData);
           setImportConfirmed(false);
           setCurrentPage(1);
        }

      } catch (error) {
        console.error("Erro ao processar arquivo:", error);
        alert("Erro ao ler o arquivo. Certifique-se que é um Excel válido.");
      } finally {
        setIsLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleClear = () => {
    setData([]);
    setFileName(null);
    setImportConfirmed(false);
    setShowSuccessBanner(false);
    setValidationErrors([]);
    appStore.setClients([]); 
    if (fileInputRef.current) fileInputRef.current.value = '';
    setCurrentPage(1);
  };

  const handleConfirmImport = () => {
    appStore.setClients(data);
    setImportConfirmed(true);
    setShowSuccessBanner(true);
    setTimeout(() => setShowSuccessBanner(false), 5000);
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
    const currentUser = role === UserRole.INSIDE_SALES ? 'Inside Sales' : role === UserRole.ESTRATEGIA ? 'Estratégia' : 'Gestor';
    const newNote: ClientNote = {
        id: Math.random().toString(36).substr(2, 9),
        clientId: selectedClient.id,
        authorName: currentUser,
        date: new Date().toISOString(),
        content: newObservation
    };
    appStore.addClientNote(newNote);
    setNewObservation('');
    fetchHistory(selectedClient.id); 
  };

  const handleTestRegion = async () => {
      setToolLoading(true);
      const result = await predictRegion(toolInput.bairro, toolInput.cidade, toolInput.uf);
      setToolResult(result);
      setToolLoading(false);
  };

  // Pagination Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 relative">
      {/* Hidden File Input - Always Available */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
        className="hidden"
      />

      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-gray-900">Base de Clientes</h1>
          <p className="text-brand-gray-700">
            {isGestor 
              ? "Importação e saneamento da carteira de clientes"
              : "Consulta de base, filtros regionais e histórico"
            }
          </p>
        </div>
        
        <div className="flex gap-2">
            {isGestor && (
              <button 
                onClick={() => setShowRegionTool(true)}
                className="flex items-center bg-white text-brand-gray-700 border border-brand-gray-200 px-4 py-2 rounded-lg font-bold hover:bg-brand-gray-50 transition-colors shadow-sm text-sm"
              >
                <MapPinned className="w-4 h-4 mr-2 text-brand-primary" />
                Testar IA de Regiões
              </button>
            )}

            {isGestor && activeTab === 'CARTEIRA' && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center bg-brand-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-brand-dark transition-colors shadow-sm text-sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                Atualizar Base (Excel)
              </button>
            )}

            {isGestor && data.length > 0 && !importConfirmed && activeTab === 'CARTEIRA' && (
              <button 
                onClick={handleClear}
                className="text-brand-gray-500 hover:text-red-600 px-4 py-2 text-sm font-medium flex items-center transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Descartar
              </button>
            )}
        </div>
      </header>
      
      {/* TABS */}
      <div className="flex space-x-1 bg-brand-gray-200 p-1 rounded-xl w-fit">
          <button 
              onClick={() => setActiveTab('CARTEIRA')}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'CARTEIRA' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-800'}`}
          >
              <LayoutList className="w-4 h-4 mr-2" />
              Carteira Ativa
          </button>
          <button 
              onClick={() => setActiveTab('LEADS')}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'LEADS' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-600 hover:text-brand-gray-800'}`}
          >
              <Target className="w-4 h-4 mr-2" />
              Novos Negócios (Leads)
          </button>
      </div>

      {/* Success Banner */}
      {showSuccessBanner && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
            <div className="p-1 bg-green-100 rounded-full text-green-600 mt-0.5">
                <CheckCircle2 size={18} />
            </div>
            <div className="flex-1">
                <h3 className="font-bold text-green-900 text-sm">Base importada com sucesso!</h3>
                <p className="text-green-700 text-sm mt-1">
                    {data.length} clientes foram processados e distribuídos para as carteiras de Field e Inside Sales.
                </p>
            </div>
            <button onClick={() => setShowSuccessBanner(false)} className="text-green-600 hover:text-green-800">
                <X size={18} />
            </button>
        </div>
      )}

      {/* Validation Errors Banner */}
      {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 animate-fade-in">
              <div className="flex items-start gap-3">
                  <div className="p-1 bg-red-100 rounded-full text-red-600 mt-0.5">
                      <AlertTriangle size={18} />
                  </div>
                  <div className="flex-1">
                      <h3 className="font-bold text-red-900 text-sm">Falha na validação do arquivo</h3>
                      <p className="text-red-700 text-sm mt-1 mb-2">Encontramos os seguintes problemas que impedem a importação:</p>
                      <ul className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                          {validationErrors.map((err, idx) => (
                              <li key={idx} className="bg-white p-2 rounded border border-red-100 text-xs">
                                  <span className="font-bold text-red-800">Linha {err.row}, Coluna "{err.column}":</span> 
                                  <span className="text-red-600 ml-1">{err.message}</span>
                                  <div className="text-brand-gray-500 mt-1 pl-2 border-l-2 border-brand-gray-200">
                                      💡 Dica: {err.solution}
                                  </div>
                              </li>
                          ))}
                      </ul>
                  </div>
                  <button onClick={() => { setValidationErrors([]); setFileName(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-red-600 hover:text-red-800">
                      <X size={18} />
                  </button>
              </div>
          </div>
      )}

      {/* Upload/Loading Area (Only for Carteira Tab & Gestor) */}
      {isGestor && activeTab === 'CARTEIRA' && (data.length === 0 || isLoading) && (
        <div 
          className={`
            border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200
            flex flex-col items-center justify-center min-h-[400px] bg-white relative overflow-hidden group
            ${isDragOver ? 'border-brand-primary bg-brand-light/5' : 'border-brand-gray-300 hover:border-brand-primary/50'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
           {isLoading ? (
            <div className="flex flex-col items-center z-10 animate-fade-in">
              <div className="w-16 h-16 border-4 border-brand-gray-200 border-t-brand-primary rounded-full animate-spin mb-4"></div>
              <h3 className="text-lg font-bold text-brand-gray-900">Processando Arquivo...</h3>
              <p className="text-brand-gray-500 text-sm">Lendo dados, mapeando colunas e validando registros.</p>
            </div>
          ) : (
             <>
              <div className="bg-brand-gray-50 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
                <Upload className="w-12 h-12 text-brand-primary" />
              </div>
              <h3 className="text-xl font-bold text-brand-gray-900 mb-2">Importar Nova Base</h3>
              <p className="text-brand-gray-500 mb-8 max-w-md mx-auto text-sm leading-relaxed">
                Carregue a planilha atualizada para distribuir a carteira.<br/>
                Formatos aceitos: <strong>.xlsx</strong> ou <strong>.csv</strong>
              </p>
              <div className="flex gap-4 mb-10 flex-wrap justify-center">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-8 py-3 bg-brand-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors shadow-lg hover:shadow-xl flex items-center transform hover:-translate-y-0.5"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Selecionar Arquivo
                </button>
                <button className="px-6 py-3 bg-white text-brand-gray-700 border border-brand-gray-200 rounded-xl font-bold hover:bg-brand-gray-50 transition-colors flex items-center">
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Modelo
                </button>
              </div>
              <div className="text-xs text-brand-gray-400 bg-brand-gray-50 px-4 py-2 rounded-lg border border-brand-gray-100">
                 <p><strong>Dica:</strong> O sistema aceita colunas como "Nome", "Cliente", "Endereço", "Consultor", "Field", etc.</p>
              </div>
             </>
          )}
        </div>
      )}

      {/* Data Table */}
      {(data.length > 0 || activeTab === 'LEADS') && !isLoading && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-brand-gray-100 flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-gray-400" />
                  <input 
                      type="text" 
                      placeholder="Buscar por ID ou Nome do EC..." 
                      className="w-full pl-10 pr-4 py-2 border border-brand-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
              <div className="flex flex-wrap gap-4">
                  <div className="relative w-full sm:w-auto">
                      <span className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold text-brand-gray-500">Região</span>
                      <select
                          className="w-full sm:w-48 pl-3 pr-8 py-2 border border-brand-gray-300 rounded-lg text-sm bg-white appearance-none focus:ring-1 focus:ring-brand-primary outline-none text-brand-gray-700"
                          value={regionFilter}
                          onChange={(e) => setRegionFilter(e.target.value)}
                      >
                          <option value="Todos">Todas</option>
                          {uniqueRegions.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <Filter className="w-3 h-3 absolute right-3 top-1/2 transform -translate-y-1/2 text-brand-gray-400" />
                  </div>

                  <div className="relative w-full sm:w-auto">
                      <span className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold text-brand-gray-500">Field Sales</span>
                      <select
                          className="w-full sm:w-48 pl-3 pr-8 py-2 border border-brand-gray-300 rounded-lg text-sm bg-white appearance-none focus:ring-1 focus:ring-brand-primary outline-none text-brand-gray-700"
                          value={consultantFilter}
                          onChange={(e) => setConsultantFilter(e.target.value)}
                      >
                          <option value="Todos">Todos</option>
                          {uniqueFieldSales.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <Filter className="w-3 h-3 absolute right-3 top-1/2 transform -translate-y-1/2 text-brand-gray-400" />
                  </div>
              </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-brand-gray-100 bg-brand-gray-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                {activeTab === 'LEADS' ? (
                    <>
                        <div className="bg-purple-100 text-purple-700 p-1 rounded-full"><Target className="w-4 h-4" /></div>
                        <span className="font-bold text-brand-gray-900">Novos Negócios / Leads</span>
                    </>
                ) : (
                    <>
                        <div className="bg-green-100 text-green-700 p-1 rounded-full"><CheckCircle2 className="w-4 h-4" /></div>
                        <span className="font-bold text-brand-gray-900">Carteira Ativa</span>
                    </>
                )}
                
                <span className="bg-brand-gray-200 text-brand-gray-700 text-xs px-2 py-0.5 rounded-full font-bold ml-2">
                  Total: {filteredData.length}
                </span>
              </div>
            </div>
            
            {/* DESKTOP TABLE View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-brand-gray-500 font-bold border-b border-brand-gray-200 text-xs uppercase tracking-wider">
                  <tr>
                    {activeTab === 'LEADS' ? (
                        <>
                            <th className="px-6 py-4">Nome do EC</th>
                            <th className="px-6 py-4">Status da Negociação</th>
                            <th className="px-6 py-4">Potencial (R$)</th>
                            <th className="px-6 py-4">Concorrente</th>
                            <th className="px-6 py-4">Consultor</th>
                            <th className="px-6 py-4 text-center">Ações</th>
                        </>
                    ) : (
                        <>
                            <th className="px-6 py-4">ID</th>
                            <th className="px-6 py-4">Nome do EC</th>
                            <th className="px-6 py-4">Tipo SIC</th>
                            <th className="px-6 py-4">Reg. Agrupada</th>
                            <th className="px-6 py-4">Field Sales</th>
                            <th className="px-6 py-4">Inside Sales</th>
                            <th className="px-6 py-4 text-center">Ações</th>
                        </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-gray-50">
                  {paginatedData.map((row) => (
                    <tr key={row.id} className="hover:bg-brand-gray-50 transition-colors">
                      {activeTab === 'LEADS' ? (
                          <>
                             <td className="px-6 py-4 font-medium text-brand-gray-900">{row.nomeEc}</td>
                             <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase
                                    ${row.leadMetadata?.outcome === 'Convertido' ? 'bg-green-100 text-green-700' : 'bg-brand-light/10 text-brand-primary'}
                                `}>
                                    {row.leadMetadata?.outcome || 'Em Aberto'}
                                </span>
                             </td>
                             <td className="px-6 py-4 text-brand-gray-700 font-mono">
                                {row.leadMetadata?.revenuePotential 
                                    ? `R$ ${row.leadMetadata.revenuePotential.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` 
                                    : '-'}
                             </td>
                             <td className="px-6 py-4 text-brand-gray-600">{row.leadMetadata?.competitorAcquirer || '-'}</td>
                             <td className="px-6 py-4 text-brand-gray-600">{row.fieldSales}</td>
                          </>
                      ) : (
                          <>
                            <td className="px-6 py-4 font-mono font-bold text-brand-gray-400">{row.id}</td>
                            <td className="px-6 py-4 font-medium text-brand-gray-900">{row.nomeEc}</td>
                            <td className="px-6 py-4">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-brand-gray-100 text-brand-gray-600 uppercase">
                                {row.tipoSic}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-brand-gray-600">{row.regiaoAgrupada}</td>
                            <td className="px-6 py-4 text-brand-gray-600">{row.fieldSales}</td>
                            <td className="px-6 py-4 text-brand-gray-600">{row.insideSales}</td>
                          </>
                      )}
                      
                      <td className="px-6 py-4 text-center">
                          <button 
                              onClick={() => handleOpenClientFile(row)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 text-brand-gray-600 hover:text-brand-primary hover:bg-brand-primary/5 rounded-lg transition-colors text-xs font-bold border border-transparent hover:border-brand-primary/20"
                              title="Ver Ficha Completa (Detalhes e Histórico)"
                          >
                              <ClipboardList className="w-4 h-4" />
                              Ficha
                          </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARD View */}
            <div className="md:hidden divide-y divide-brand-gray-100">
               {paginatedData.map((row) => (
                   <div key={row.id} className="p-4 bg-white flex flex-col gap-3">
                       <div className="flex justify-between items-start">
                           <div>
                               <div className="flex items-center gap-2 mb-1">
                                   <span className="text-[10px] font-mono bg-brand-gray-100 text-brand-gray-600 px-1.5 py-0.5 rounded">#{row.id}</span>
                                   <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase">{row.tipoSic}</span>
                               </div>
                               <h3 className="font-bold text-brand-gray-900">{row.nomeEc}</h3>
                           </div>
                           <button 
                              onClick={() => handleOpenClientFile(row)}
                              className="p-2 text-brand-gray-500 hover:text-brand-primary"
                          >
                              <ClipboardList className="w-5 h-5" />
                          </button>
                       </div>
                       
                       {activeTab === 'LEADS' && row.leadMetadata && (
                           <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                               <div className="bg-green-50 p-2 rounded">
                                   <span className="block text-green-700 font-bold">Potencial</span>
                                   <span className="block font-mono">R$ {row.leadMetadata.revenuePotential || 0}</span>
                               </div>
                               <div className="bg-purple-50 p-2 rounded">
                                   <span className="block text-purple-700 font-bold">Concorrente</span>
                                   <span className="block">{row.leadMetadata.competitorAcquirer || '-'}</span>
                               </div>
                           </div>
                       )}

                       <div className="text-sm text-brand-gray-600 flex items-start gap-2">
                           <MapPin className="w-4 h-4 text-brand-gray-400 shrink-0 mt-0.5" />
                           <span className="line-clamp-2">{row.endereco}</span>
                       </div>

                       <div className="grid grid-cols-2 gap-2 text-xs text-brand-gray-600 bg-brand-gray-50 p-2 rounded-lg">
                           <div>
                               <span className="block text-[10px] text-brand-gray-400 uppercase">Região</span>
                               <span className="font-semibold">{row.regiaoAgrupada}</span>
                           </div>
                           <div>
                               <span className="block text-[10px] text-brand-gray-400 uppercase">Consultor</span>
                               <span className="font-semibold">{row.fieldSales}</span>
                           </div>
                       </div>
                   </div>
               ))}
            </div>

            {filteredData.length === 0 && (
                <div className="p-10 text-center text-brand-gray-400">
                    Nenhum cliente encontrado com os filtros atuais.
                </div>
            )}


            {/* Pagination Footer */}
            {filteredData.length > 0 && (
              <div className="bg-white border-t border-brand-gray-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                      <div className="text-xs text-brand-gray-500">
                          Mostrando <span className="font-bold">{((currentPage - 1) * itemsPerPage) + 1}</span> a <span className="font-bold">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> de <span className="font-bold">{filteredData.length}</span>
                      </div>
                      <select 
                          value={itemsPerPage}
                          onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                          className="bg-brand-gray-50 border border-brand-gray-200 text-brand-gray-700 text-xs rounded-lg p-1.5 outline-none focus:ring-1 focus:ring-brand-primary hidden sm:block"
                      >
                          <option value={10}>10 linhas</option>
                          <option value={20}>20 linhas</option>
                          <option value={50}>50 linhas</option>
                      </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                      <button 
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="p-1.5 rounded-lg border border-brand-gray-200 text-brand-gray-600 hover:bg-brand-gray-50 disabled:opacity-50"
                      >
                          <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-bold text-brand-gray-700 px-2">Página {currentPage}</span>
                      <button 
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="p-1.5 rounded-lg border border-brand-gray-200 text-brand-gray-600 hover:bg-brand-gray-50 disabled:opacity-50"
                      >
                          <ChevronRight className="w-4 h-4" />
                      </button>
                  </div>
              </div>
            )}
            
            {/* Footer Actions for Gestor */}
            {isGestor && activeTab === 'CARTEIRA' && !importConfirmed && data.length > 0 && (
              <div className="p-4 border-t border-brand-gray-100 bg-yellow-50 flex justify-between items-center">
                <div className="text-xs text-yellow-800 font-medium flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Revise os dados antes de confirmar.
                </div>
                <button 
                  onClick={handleConfirmImport}
                  className="px-6 py-2 bg-brand-primary text-white rounded-lg shadow-sm hover:bg-brand-dark transition-colors font-bold text-sm flex items-center"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar e Vincular
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* UNIFIED CLIENT FILE MODAL - Same Logic, just updated for Leads */}
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
                        <div className="flex items-center gap-2 mt-1">
                           <span className="bg-white/10 px-2 py-0.5 rounded text-xs text-brand-gray-300 font-mono">
                              ID: {selectedClient.id}
                           </span>
                           <span className="text-brand-gray-400 text-sm flex items-center">
                              <User className="w-3 h-3 mr-1" />
                              {selectedClient.responsavel}
                           </span>
                        </div>
                    </div>
                    <button onClick={() => setSelectedClient(null)} className="text-brand-gray-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                {/* Registration Details */}
                <div className="bg-white border-b border-brand-gray-200 p-6 shrink-0 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto md:overflow-visible max-h-[40vh] md:max-h-none">
                    {/* ... (Standard details) ... */}
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
                            <a 
                               href={`https://wa.me/55${selectedClient.contato.replace(/\D/g, '')}`}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="flex items-center text-sm text-brand-gray-800 hover:text-green-600 transition-colors group cursor-pointer"
                               title="Iniciar conversa no WhatsApp"
                            >
                                <Phone className="w-4 h-4 mr-2 text-brand-gray-400 group-hover:text-green-500" />
                                <span className="group-hover:underline">{selectedClient.contato}</span>
                            </a>
                         </div>
                    </div>
                    <div className="space-y-3">
                         {/* Lead Specific Data if applicable */}
                         {selectedClient.status === 'Lead' && selectedClient.leadMetadata ? (
                             <div className="bg-brand-gray-50 p-3 rounded-lg text-xs space-y-2 border border-brand-gray-200">
                                 <div className="flex justify-between">
                                     <span className="text-brand-gray-500 font-bold">Potencial:</span>
                                     <span>R$ {selectedClient.leadMetadata.revenuePotential || 0}</span>
                                 </div>
                                 <div className="flex justify-between">
                                     <span className="text-brand-gray-500 font-bold">Concorrente:</span>
                                     <span>{selectedClient.leadMetadata.competitorAcquirer || '-'}</span>
                                 </div>
                                 <div className="flex justify-between">
                                     <span className="text-brand-gray-500 font-bold">Status:</span>
                                     <span className="font-bold text-brand-primary">{selectedClient.leadMetadata.outcome}</span>
                                 </div>
                             </div>
                         ) : (
                             <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-brand-gray-400 uppercase tracking-wider block mb-1">Classificação</label>
                                        <span className="inline-block bg-brand-gray-100 text-brand-gray-700 px-2 py-1 rounded text-xs font-bold uppercase">
                                            {selectedClient.tipoSic}
                                        </span>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-brand-gray-400 uppercase tracking-wider block mb-1">Região</label>
                                        <span className="text-sm font-bold text-brand-gray-800">{selectedClient.regiaoAgrupada}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-brand-gray-400 uppercase tracking-wider block mb-1">Equipe Responsável</label>
                                    <div className="flex items-center gap-4 text-xs">
                                        <div className="flex items-center text-brand-gray-700">
                                            <Briefcase className="w-3 h-3 mr-1 text-blue-500" />
                                            Field: <strong>{selectedClient.fieldSales}</strong>
                                        </div>
                                        <div className="flex items-center text-brand-gray-700">
                                            <Phone className="w-3 h-3 mr-1 text-orange-500" />
                                            Inside: <strong>{selectedClient.insideSales}</strong>
                                        </div>
                                    </div>
                                </div>
                             </>
                         )}
                    </div>
                </div>

                {/* Timeline - Reusing existing component logic */}
                <div className="bg-brand-gray-50 px-6 py-2 border-b border-brand-gray-200 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-brand-gray-400" />
                        <span className="text-xs font-bold text-brand-gray-600 uppercase tracking-wide">Linha do Tempo</span>
                    </div>
                    {/* ... (Last Visit info) ... */}
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white min-h-[200px]">
                    {/* ... (History Items Map same as before) ... */}
                    {historyItems.length === 0 ? (
                        <div className="text-center py-10 text-brand-gray-400">
                            <p className="text-sm italic">Nenhum histórico de visitas ou observações registrado.</p>
                        </div>
                    ) : (
                        historyItems.map((item, index) => (
                            <div key={index} className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${item.type === 'appointment' ? 'bg-brand-primary' : 'bg-blue-500'}`}></div>
                                    <div className="w-px h-full bg-brand-gray-100 flex-1 my-1"></div>
                                </div>
                                <div className="flex-1 pb-4">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="text-xs font-bold text-brand-gray-500">
                                            {item.type === 'appointment' 
                                                ? new Date(item.data.date).toLocaleDateString('pt-BR') 
                                                : new Date(item.data.date).toLocaleDateString('pt-BR') + ' ' + new Date(item.data.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})
                                            }
                                        </p>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase
                                            ${item.type === 'appointment' ? 'bg-brand-light/10 text-brand-primary' : 'bg-blue-50 text-blue-600'}
                                        `}>
                                            {item.type === 'appointment' ? 'Visita' : 'Tratativa'}
                                        </span>
                                    </div>

                                    {item.type === 'appointment' ? (
                                        <div className="bg-brand-gray-50 rounded-lg p-3 border border-brand-gray-100">
                                            <p className="font-bold text-brand-gray-900 text-sm mb-1">
                                                {item.data.status === 'Completed' ? 'Visita Realizada' : 'Agendamento'}
                                                <span className="font-normal text-brand-gray-600"> por {item.data.fieldSalesName}</span>
                                            </p>
                                            
                                            {item.data.isWallet ? (
                                                <p className="text-xs text-brand-gray-600 mb-2">Motivo: {item.data.visitReason}</p>
                                            ) : (
                                                <p className="text-xs text-brand-gray-600 mb-2">Origem: {item.data.leadOrigins?.join(', ') || '-'}</p>
                                            )}
                                            
                                            {/* Field Sales Observation */}
                                            {item.data.status === 'Completed' && (
                                                <div className="text-xs text-brand-gray-700 italic border-l-2 border-brand-primary pl-2 mt-2">
                                                    "{item.data.fieldObservation || 'Sem observações do consultor.'}"
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                                            <p className="font-bold text-brand-gray-900 text-sm mb-1">
                                                {item.data.authorName}
                                            </p>
                                            <p className="text-sm text-brand-gray-700 whitespace-pre-line">
                                                {item.data.content}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Add Observation Form */}
                <div className="p-4 bg-brand-gray-50 border-t border-brand-gray-200 shrink-0">
                    <label className="block text-xs font-bold text-brand-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                        <MessageSquare className="w-3 h-3" />
                        Nova Tratativa
                    </label>
                    <div className="flex gap-2">
                        <textarea 
                            value={newObservation}
                            onChange={(e) => setNewObservation(e.target.value)}
                            placeholder="Registre aqui o contato realizado..."
                            className="flex-1 border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none resize-none h-14"
                        />
                        <button 
                            onClick={handleSaveObservation}
                            disabled={!newObservation.trim()}
                            className="bg-brand-gray-900 text-white px-4 rounded-lg hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center transition-colors"
                        >
                            <Send className="w-4 h-4 mb-1" />
                            <span className="text-xs font-bold">Salvar</span>
                        </button>
                    </div>
                </div>

            </div>
         </div>
      )}

      {/* REGION TOOL MODAL (Keep as is) */}
      {showRegionTool && (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           {/* ... Region Tool Content from previous file ... */}
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
              <div className="bg-brand-gray-900 px-6 py-4 flex justify-between items-center shrink-0">
                 <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    <MapPinned className="w-5 h-5 text-brand-primary" />
                    Testar Classificação de Região
                 </h3>
                 <button onClick={() => setShowRegionTool(false)} className="text-brand-gray-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                 </button>
              </div>

              <div className="p-6 space-y-4">
                  {/* ... Inputs ... */}
                  <p className="text-sm text-brand-gray-600 mb-2">
                    Simule a lógica de inferência de regiões.
                  </p>
                  <div>
                     <label className="block text-xs font-bold text-brand-gray-500 uppercase tracking-wide mb-1">Bairro *</label>
                     <input type="text" value={toolInput.bairro} onChange={(e) => setToolInput({...toolInput, bairro: e.target.value})} className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-brand-primary outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div><label className="block text-xs font-bold text-brand-gray-500 uppercase tracking-wide mb-1">Cidade *</label><input type="text" value={toolInput.cidade} onChange={(e) => setToolInput({...toolInput, cidade: e.target.value})} className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-brand-primary outline-none" /></div>
                     <div><label className="block text-xs font-bold text-brand-gray-500 uppercase tracking-wide mb-1">UF *</label><input type="text" value={toolInput.uf} onChange={(e) => setToolInput({...toolInput, uf: e.target.value})} className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-brand-primary outline-none" /></div>
                  </div>
                  <button onClick={handleTestRegion} disabled={toolLoading || !toolInput.bairro} className="w-full bg-brand-primary text-white py-2 rounded-lg font-bold hover:bg-brand-dark transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
                     {toolLoading ? 'Processando...' : 'Identificar Região'}
                  </button>
                  {toolResult && (
                     <div className="mt-4 bg-brand-gray-50 rounded-xl p-4 border border-brand-gray-200">
                        <p className="text-xl font-bold text-brand-gray-900 mb-1">{toolResult.region}</p>
                        <p className="text-xs text-brand-gray-500 italic">Via {toolResult.method}</p>
                     </div>
                  )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default BaseClientesPage;
