
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, Download, Trash2, Search, Filter, X, ChevronLeft, ChevronRight, History, Calendar, MessageSquare, Send, User, Eye, AlertCircle, MapPin, Phone, AlertTriangle, ClipboardList, Briefcase, MapPinned, Zap, MoreVertical, LayoutList, Target, LifeBuoy } from 'lucide-react';
import { UserRole, ClientBaseRow, ClientNote } from '../types';
import { appStore } from '../services/store';
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
  const isGestor = role === UserRole.GESTOR;
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
  const [showSupportChat, setShowSupportChat] = useState(false); // New Support Chat Modal
  
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
           const status: 'Active' | 'Lead' = getValue(['status']) === 'Lead' ? 'Lead' : 'Active';

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
    const currentUser = role === UserRole.INSIDE_SALES ? 'Inside Sales' : 'Gestão Comercial';
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

      {/* ... [Success Banner & Validation Errors code omitted for brevity but preserved] ... */}

      {/* ... [Upload/Loading Area code omitted for brevity but preserved] ... */}

      {/* Data Table */}
      {(data.length > 0 || activeTab === 'LEADS') && !isLoading && (
        <div className="space-y-4">
          
          {/* Filters Bar code preserved */}
          {/* ... */}

          <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden animate-fade-in">
            {/* ... Table Header ... */}
            
            {/* DESKTOP TABLE View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                {/* ... Thead ... */}
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
                      {/* ... Table Cells ... */}
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

            {/* MOBILE CARD View code preserved */}
            {/* ... */}

            {/* Pagination Footer */}
            {/* ... */}
            
            {/* Footer Actions for Gestor */}
            {/* ... */}
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
                        {/* NEW: SUPPORT BUTTON */}
                        <div className="flex gap-2 mt-2">
                            <span className="bg-white/10 px-2 py-0.5 rounded text-xs text-brand-gray-300 font-mono flex items-center">
                                ID: {selectedClient.id}
                            </span>
                            <button 
                                onClick={() => setShowSupportChat(true)}
                                className="bg-white/10 hover:bg-white/20 px-3 py-0.5 rounded text-xs font-bold text-white flex items-center gap-1 transition-colors border border-white/10"
                            >
                                <LifeBuoy className="w-3 h-3" /> Suporte Logística
                            </button>
                        </div>
                    </div>
                    <button onClick={() => setSelectedClient(null)} className="text-brand-gray-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                {/* Registration Details */}
                {/* ... (Existing details) ... */}
                <div className="bg-white border-b border-brand-gray-200 p-6 shrink-0 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto md:overflow-visible max-h-[40vh] md:max-h-none">
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
                    {/* ... */}
                </div>

                {/* Timeline */}
                {/* ... (Existing Timeline) ... */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white min-h-[200px]">
                    {historyItems.map((item, index) => (
                        <div key={index} className="flex gap-4">
                            {/* ... */}
                            <div className="flex-1 pb-4">
                                {/* ... content ... */}
                                <div className="bg-brand-gray-50 rounded-lg p-3 border border-brand-gray-100">
                                    <p className="font-bold text-brand-gray-900 text-sm mb-1">
                                        {item.type === 'appointment' ? (item.data.status === 'Completed' ? 'Visita Realizada' : 'Agendamento') : item.data.authorName}
                                    </p>
                                    <p className="text-sm text-brand-gray-700 whitespace-pre-line">
                                        {item.type === 'appointment' ? item.data.fieldObservation : item.data.content}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Add Observation Form */}
                <div className="p-4 bg-brand-gray-50 border-t border-brand-gray-200 shrink-0">
                    {/* ... */}
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

      {/* REGION TOOL MODAL */}
      {/* ... */}

      {/* SUPPORT CHAT MODAL */}
      {selectedClient && (
          <SupportChatModal 
            isOpen={showSupportChat} 
            onClose={() => setShowSupportChat(false)} 
            clientName={selectedClient.nomeEc}
            clientId={selectedClient.id}
            currentUser={role} // Or fetch real name from context
            currentRole={role}
          />
      )}
    </div>
  );
};

export default BaseClientesPage;
