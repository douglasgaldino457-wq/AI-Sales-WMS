
import React, { useState, useEffect, useMemo } from 'react';
import { appStore } from '../services/store';
import { ClientBaseRow, UserRole } from '../types';
import { getGeographicInsights } from '../services/geminiService';
import { Map, Filter, Search, Sparkles, MapPin, AlertTriangle, User } from 'lucide-react';

// Colors for consultants to visualize territories
const CONSULTANT_COLORS = [
  '#F3123C', // Brand Primary
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
];

const MapaGestaoPage: React.FC = () => {
  const [clients, setClients] = useState<ClientBaseRow[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientBaseRow[]>([]);
  
  // Filters
  const [selectedType, setSelectedType] = useState<'FIELD' | 'INSIDE'>('FIELD');
  const [selectedConsultant, setSelectedConsultant] = useState<string>('Todos');
  const [consultantList, setConsultantList] = useState<string[]>([]);

  // AI State
  const [insights, setInsights] = useState<string[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  
  // Map Tooltip State
  const [hoveredClient, setHoveredClient] = useState<ClientBaseRow | null>(null);

  useEffect(() => {
    const data = appStore.getClients();
    setClients(data);

    // Extract unique consultants based on type
    const fieldSales = Array.from(new Set(data.map(c => c.fieldSales))).filter(Boolean);
    const insideSales = Array.from(new Set(data.map(c => c.insideSales))).filter(Boolean);
    
    setConsultantList(selectedType === 'FIELD' ? fieldSales : insideSales);
    setFilteredClients(data);
  }, [selectedType]);

  useEffect(() => {
    let result = clients;

    if (selectedConsultant !== 'Todos') {
      if (selectedType === 'FIELD') {
        result = result.filter(c => c.fieldSales === selectedConsultant);
      } else {
        result = result.filter(c => c.insideSales === selectedConsultant);
      }
    }
    setFilteredClients(result);
  }, [selectedConsultant, clients, selectedType]);

  const handleGenerateInsights = async () => {
    setLoadingAI(true);
    const result = await getGeographicInsights(filteredClients);
    // Split by new lines or standard list markers and filter empty
    const lines = result.split('\n').filter(l => l.trim().length > 5);
    setInsights(lines);
    setLoadingAI(false);
  };

  // Assign color to consultant
  const getConsultantColor = (name: string) => {
    const index = consultantList.indexOf(name);
    return CONSULTANT_COLORS[index % CONSULTANT_COLORS.length] || '#696977';
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-6">
      {/* Sidebar Controls */}
      <div className="w-1/3 flex flex-col gap-6 overflow-y-auto pr-2">
        <header>
          <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
            <Map className="w-6 h-6 text-brand-primary" />
            Mapa de Gestão
          </h1>
          <p className="text-brand-gray-700 text-sm">Visualização de territórios e carteira.</p>
        </header>

        {/* Filters Panel */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-brand-gray-100 space-y-4">
          <h3 className="font-bold text-brand-gray-900 text-sm uppercase tracking-wide flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filtros de Visualização
          </h3>
          
          <div className="space-y-3">
             <div>
                <label className="block text-xs font-bold text-brand-gray-500 mb-1">Tipo de Atuação</label>
                <div className="flex bg-brand-gray-100 p-1 rounded-lg">
                   <button 
                     onClick={() => { setSelectedType('FIELD'); setSelectedConsultant('Todos'); }}
                     className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${selectedType === 'FIELD' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-500 hover:text-brand-gray-900'}`}
                   >
                     Field Sales
                   </button>
                   <button 
                     onClick={() => { setSelectedType('INSIDE'); setSelectedConsultant('Todos'); }}
                     className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${selectedType === 'INSIDE' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-500 hover:text-brand-gray-900'}`}
                   >
                     Inside Sales
                   </button>
                </div>
             </div>

             <div>
                <label className="block text-xs font-bold text-brand-gray-500 mb-1">Consultor</label>
                <select 
                  className="w-full border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                  value={selectedConsultant}
                  onChange={(e) => setSelectedConsultant(e.target.value)}
                >
                  <option value="Todos">Todos os Consultores</option>
                  {consultantList.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
             </div>
          </div>

          <div className="pt-2">
             <div className="flex flex-wrap gap-2">
                {consultantList.map(c => (
                  <div key={c} className="flex items-center text-[10px] bg-brand-gray-50 px-2 py-1 rounded border border-brand-gray-200">
                     <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: getConsultantColor(c) }}></div>
                     {c}
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* AI Insights Panel */}
        <div className="bg-gradient-to-br from-brand-gray-900 to-brand-gray-800 p-5 rounded-xl shadow-lg text-white flex-1 flex flex-col">
           <div className="flex items-center gap-2 mb-4">
              <div className="bg-white/10 p-2 rounded-lg">
                 <Sparkles className="w-5 h-5 text-brand-light" />
              </div>
              <div>
                 <h3 className="font-bold text-lg">Inteligência Geográfica</h3>
                 <p className="text-xs text-brand-gray-400">Análise de divergências de rota</p>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto mb-4 bg-black/20 rounded-lg p-4">
              {loadingAI ? (
                  <div className="flex flex-col items-center justify-center h-full text-brand-gray-400 space-y-3">
                     <div className="w-8 h-8 border-2 border-brand-gray-600 border-t-brand-light rounded-full animate-spin"></div>
                     <p className="text-xs">Analisando coordenadas...</p>
                  </div>
              ) : insights.length > 0 ? (
                  <ul className="space-y-3">
                     {insights.map((insight, idx) => (
                        <li key={idx} className="text-xs leading-relaxed bg-white/5 p-2 rounded border-l-2 border-brand-primary">
                           {insight}
                        </li>
                     ))}
                  </ul>
              ) : (
                  <div className="flex flex-col items-center justify-center h-full text-brand-gray-500 text-center">
                     <MapPin className="w-8 h-8 mb-2 opacity-30" />
                     <p className="text-xs px-4">Clique abaixo para buscar oportunidades de realocação ou erros de região.</p>
                  </div>
              )}
           </div>

           <button 
             onClick={handleGenerateInsights}
             disabled={loadingAI}
             className="w-full bg-brand-primary hover:bg-brand-dark text-white py-3 rounded-lg font-bold text-sm shadow-md transition-all flex items-center justify-center disabled:opacity-50"
           >
              {loadingAI ? 'Processando...' : 'Gerar Insights com IA'}
           </button>
        </div>
      </div>

      {/* Interactive Map Visualizer */}
      <div className="flex-1 bg-brand-gray-200 rounded-2xl border-4 border-white shadow-xl relative overflow-hidden group">
         {/* Map Background (Simulated Dark Mode Vector Map) */}
         <div className="absolute inset-0 bg-[#242f3e] opacity-90">
            {/* Simulated Roads/Grid */}
            <svg className="w-full h-full" width="100%" height="100%">
               <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                     <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#3d4959" strokeWidth="1"/>
                  </pattern>
               </defs>
               <rect width="100%" height="100%" fill="url(#grid)" />
               {/* Decorative "Major Roads" */}
               <path d="M 0 50 Q 200 300 400 200 T 800 350" fill="none" stroke="#4a5b6e" strokeWidth="3" />
               <path d="M 100 0 Q 150 400 300 600" fill="none" stroke="#4a5b6e" strokeWidth="3" />
            </svg>
         </div>
         
         {/* Markers Layer */}
         <div className="absolute inset-0 p-10">
            {filteredClients.map((client) => {
               // Normalize Coordinates to % for CSS positioning within the container
               // Base: -23.5505 (Lat), -46.6333 (Lng). Spread approx 0.15 deg.
               const latBase = -23.5505;
               const lngBase = -46.6333;
               const range = 0.20; // Zoom level simulation

               const yPercent = 50 + ((client.latitude! - latBase) / range) * 100;
               const xPercent = 50 + ((client.longitude! - lngBase) / range) * 100;

               // Clamp to view
               if (yPercent < 0 || yPercent > 100 || xPercent < 0 || xPercent > 100) return null;

               const consultantName = selectedType === 'FIELD' ? client.fieldSales : client.insideSales;
               const color = getConsultantColor(consultantName);

               return (
                  <div 
                    key={client.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-150 z-10"
                    style={{ top: `${yPercent}%`, left: `${xPercent}%` }}
                    onMouseEnter={() => setHoveredClient(client)}
                    onMouseLeave={() => setHoveredClient(null)}
                  >
                     <div className="relative group">
                        <div 
                           className="w-3 h-3 rounded-full border border-white shadow-sm"
                           style={{ backgroundColor: color }}
                        ></div>
                        {/* Pulse effect for outliers (Simulated) */}
                        {client.regiaoAgrupada === 'Zona Norte' && consultantName.includes('Samuel') && (
                           <span className="absolute -inset-1 rounded-full animate-ping opacity-75 bg-red-500"></span>
                        )}
                     </div>
                  </div>
               );
            })}
         </div>

         {/* Hover Tooltip */}
         {hoveredClient && (
            <div className="absolute top-4 right-4 bg-white p-4 rounded-xl shadow-2xl z-20 w-64 animate-fade-in border border-brand-gray-100">
               <h4 className="font-bold text-brand-gray-900 mb-1">{hoveredClient.nomeEc}</h4>
               <p className="text-xs text-brand-gray-500 mb-2 flex items-center">
                  <MapPin className="w-3 h-3 mr-1" /> {hoveredClient.endereco}
               </p>
               <div className="space-y-1 bg-brand-gray-50 p-2 rounded border border-brand-gray-100">
                  <div className="flex justify-between text-xs">
                     <span className="text-brand-gray-500">Região:</span>
                     <span className="font-bold text-brand-gray-800">{hoveredClient.regiaoAgrupada}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                     <span className="text-brand-gray-500">Field:</span>
                     <span className="font-bold text-brand-gray-800">{hoveredClient.fieldSales}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                     <span className="text-brand-gray-500">Inside:</span>
                     <span className="font-bold text-brand-gray-800">{hoveredClient.insideSales}</span>
                  </div>
               </div>
            </div>
         )}
         
         {/* Map Controls UI */}
         <div className="absolute bottom-6 right-6 flex flex-col gap-2">
            <button className="bg-white p-2 rounded-lg shadow text-brand-gray-700 hover:bg-brand-gray-50 font-bold text-xl">+</button>
            <button className="bg-white p-2 rounded-lg shadow text-brand-gray-700 hover:bg-brand-gray-50 font-bold text-xl">-</button>
         </div>
      </div>
    </div>
  );
};

export default MapaGestaoPage;
