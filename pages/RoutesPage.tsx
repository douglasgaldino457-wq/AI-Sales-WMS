
import React, { useState, useEffect, useRef } from 'react';
import { appStore } from '../services/store';
import { Appointment } from '../types';
import { optimizeRoute } from '../services/geminiService';
import { 
    Map as MapIcon, Navigation, CheckSquare, Square, 
    Calendar, MapPin, Loader2, ListOrdered, Sparkles, User, ArrowRight
} from 'lucide-react';

const RoutesPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<Appointment[] | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  // Map References
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    // 1. Load User's Pending Appointments
    const all = appStore.getAppointmentsByFieldSales('Cleiton Freitas');
    const pending = all.filter(a => a.status === 'Scheduled');
    setAppointments(pending);

    // 2. Get User Current Location (For Starting Point)
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            (err) => {
                console.error("Location error:", err);
                // Fallback to São Paulo default if denied
                setUserLocation({ lat: -23.5505, lng: -46.6333 });
            },
            { enableHighAccuracy: true }
        );
    }
  }, []);

  // Initialize Map - ONCE
  useEffect(() => {
      if (!mapRef.current) return;
      
      const L = (window as any).L;
      if (!L) return;

      // Safe check for existing instance on DOM element to prevent reuse error
      const container = mapRef.current as any;
      if (container._leaflet_id) {
          container._leaflet_id = null; // Force clear identifier
      }

      if (mapInstance.current) {
          mapInstance.current.remove();
          mapInstance.current = null;
      }

      const startCoords = userLocation ? [userLocation.lat, userLocation.lng] : [-23.5505, -46.6333];
      
      const map = L.map(mapRef.current).setView(startCoords, 12);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; CARTO'
      }).addTo(map);
      
      mapInstance.current = map;

      // Robust Cleanup
      return () => {
          if (mapInstance.current) {
              mapInstance.current.remove();
              mapInstance.current = null;
          }
      };
  }, []); // Run once on mount (or re-run if Strict Mode)

  // Update Map Layers/View when data changes
  useEffect(() => {
      if (!mapInstance.current) return;
      const L = (window as any).L;
      const map = mapInstance.current;

      // Update View Center if Location Found
      if (userLocation) {
          // Only pan if we haven't set a route yet to avoid jumping
          if (!optimizedRoute) {
              map.setView([userLocation.lat, userLocation.lng], 13);
          }
      }

      // Clear existing layers (Markers/Polylines)
      map.eachLayer((layer: any) => {
          if (layer instanceof L.Marker || layer instanceof L.Polyline) {
              map.removeLayer(layer);
          }
      });

      const points: [number, number][] = [];
      const clients = appStore.getClients();

      // 1. Add Start Point (User Location)
      if (userLocation) {
          points.push([userLocation.lat, userLocation.lng]);
          
          const startIcon = L.divIcon({
              className: 'start-icon',
              html: `<div style="background-color: #10B981; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16]
          });

          L.marker([userLocation.lat, userLocation.lng], { icon: startIcon })
            .addTo(map)
            .bindPopup(`<b>Você está aqui</b><br/>Ponto de Partida`);
      }

      // 2. Add Destinations
      if (optimizedRoute) {
          optimizedRoute.forEach((appt, index) => {
              const client = clients.find(c => c.id === appt.clientId);
              const lat = client?.latitude || (userLocation ? userLocation.lat + (Math.random() * 0.05) : -23.5505);
              const lng = client?.longitude || (userLocation ? userLocation.lng + (Math.random() * 0.05) : -46.6333);
              
              points.push([lat, lng]);

              const icon = L.divIcon({
                  className: 'custom-div-icon',
                  html: `<div style="background-color: #F3123C; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${index + 1}</div>`,
                  iconSize: [24, 24],
                  iconAnchor: [12, 12]
              });

              L.marker([lat, lng], { icon })
                .addTo(map)
                .bindPopup(`<b>${index + 1}. ${appt.clientName}</b><br/>${appt.address}`);
          });

          // 3. Draw Path
          if (points.length > 1) {
              const polyline = L.polyline(points, { color: '#3B82F6', weight: 4, opacity: 0.8, dashArray: '10, 10' }).addTo(map);
              map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
          }
      }

  }, [optimizedRoute, userLocation]); // Dependencies for updates

  const toggleSelection = (id: string) => {
      setSelectedIds(prev => 
          prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
  };

  const handleSelectAll = () => {
      if (selectedIds.length === appointments.length) {
          setSelectedIds([]);
      } else {
          setSelectedIds(appointments.map(a => a.id));
      }
  };

  const handleOptimize = async () => {
      if (selectedIds.length < 2) {
          alert("Selecione pelo menos 2 visitas para criar uma rota.");
          return;
      }

      setIsOptimizing(true);
      
      const selectedVisits = appointments.filter(a => selectedIds.includes(a.id));
      
      try {
          const startContext = userLocation 
            ? `Latitude: ${userLocation.lat}, Longitude: ${userLocation.lng}`
            : 'Sede da Empresa (Centro SP)';

          const orderedIds = await optimizeRoute(selectedVisits, startContext);
          
          const optimized: Appointment[] = [];
          orderedIds.forEach((id: string) => {
              const visit = selectedVisits.find(v => v.id === id);
              if (visit) optimized.push(visit);
          });
          
          selectedVisits.forEach(v => {
              if (!optimized.find(o => o.id === v.id)) optimized.push(v);
          });
          
          setOptimizedRoute(optimized);
      } catch (error) {
          console.error("Erro na otimização", error);
          setOptimizedRoute(selectedVisits); 
      } finally {
          setIsOptimizing(false);
      }
  };

  const handleStartNavigation = () => {
      if (!userLocation || !optimizedRoute || optimizedRoute.length === 0) {
          alert("É necessário ter sua localização e uma rota definida.");
          return;
      }

      const clients = appStore.getClients();
      const origin = `${userLocation.lat},${userLocation.lng}`;

      const getDestinationParam = (appt: Appointment) => {
          const client = clients.find(c => c.id === appt.clientId);
          if (client?.latitude && client?.longitude) {
              return `${client.latitude},${client.longitude}`;
          }
          return encodeURIComponent(appt.address);
      };

      const lastStop = optimizedRoute[optimizedRoute.length - 1];
      const destination = getDestinationParam(lastStop);

      let waypoints = '';
      if (optimizedRoute.length > 1) {
          const intermediate = optimizedRoute.slice(0, optimizedRoute.length - 1);
          waypoints = intermediate.map(appt => getDestinationParam(appt)).join('|');
      }

      let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
      if (waypoints) {
          url += `&waypoints=${waypoints}`;
      }

      window.open(url, '_blank');
  };

  const handleClearRoute = () => {
      setOptimizedRoute(null);
      setSelectedIds([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] gap-4">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                  <Navigation size={28} className="text-brand-primary" /> 
                  Roteirização Inteligente
              </h1>
              <p className="text-brand-gray-500 text-sm mt-1 flex items-center gap-2">
                  {userLocation ? (
                      <span className="text-green-600 font-bold flex items-center gap-1"><User size={12}/> Geolocalização Ativa</span>
                  ) : (
                      <span className="text-orange-500 font-bold flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> Obtendo localização...</span>
                  )}
                  | Selecione as visitas para otimizar o trajeto.
              </p>
          </div>
          
          {optimizedRoute && (
              <div className="flex gap-3">
                  <button 
                      onClick={handleClearRoute}
                      className="px-4 py-2 border border-brand-gray-300 text-brand-gray-600 rounded-xl font-bold text-sm hover:bg-brand-gray-50 transition-colors"
                  >
                      Nova Rota
                  </button>
                  <button 
                      onClick={handleStartNavigation}
                      className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 shadow-lg flex items-center gap-2 animate-pulse transition-transform hover:scale-105"
                  >
                      <Navigation size={16} /> Iniciar Rota no Maps
                  </button>
              </div>
          )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">
         
         {/* LEFT COLUMN: SELECTION OR LIST */}
         <div className="w-full lg:w-1/3 flex flex-col bg-white rounded-2xl shadow-lg border border-brand-gray-100 overflow-hidden relative z-10">
             
             {!optimizedRoute ? (
                 <>
                    <div className="p-4 bg-brand-gray-50 border-b border-brand-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-brand-gray-800 flex items-center gap-2">
                            <Calendar size={18} className="text-brand-primary"/> 
                            Disponíveis ({appointments.length})
                        </h3>
                        <button 
                            onClick={handleSelectAll}
                            className="text-xs font-bold text-brand-primary hover:underline"
                        >
                            {selectedIds.length === appointments.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-brand-gray-50/30">
                        {appointments.length === 0 ? (
                            <div className="p-10 text-center text-gray-400">
                                <p>Nenhuma visita agendada.</p>
                            </div>
                        ) : (
                            appointments.map(appt => {
                                const isSelected = selectedIds.includes(appt.id);
                                return (
                                    <div 
                                        key={appt.id}
                                        onClick={() => toggleSelection(appt.id)}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 group
                                            ${isSelected 
                                                ? 'bg-white border-brand-primary shadow-md' 
                                                : 'bg-white border-transparent hover:border-brand-gray-200 shadow-sm'}
                                        `}
                                    >
                                        <div className={`mt-1 transition-colors ${isSelected ? 'text-brand-primary' : 'text-gray-300 group-hover:text-gray-400'}`}>
                                            {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                        </div>
                                        <div>
                                            <h4 className={`font-bold text-sm ${isSelected ? 'text-brand-gray-900' : 'text-gray-600'}`}>{appt.clientName}</h4>
                                            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                                <MapPin size={10}/> {appt.address}
                                            </p>
                                            <div className="mt-2 flex gap-2">
                                                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold uppercase">{appt.period}</span>
                                                {appt.isWallet && <span className="text-[10px] bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded font-bold uppercase border border-yellow-100">Carteira</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="p-4 bg-white border-t border-brand-gray-100">
                        <button 
                            onClick={handleOptimize}
                            disabled={selectedIds.length < 2 || isOptimizing}
                            className="w-full bg-brand-primary text-white py-4 rounded-xl font-bold shadow-lg hover:bg-brand-dark transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                        >
                            {isOptimizing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                            {isOptimizing ? 'Calculando Rota...' : `Otimizar Rota (${selectedIds.length})`}
                        </button>
                    </div>
                 </>
             ) : (
                 <>
                    <div className="p-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                        <h3 className="font-bold text-blue-900 flex items-center gap-2">
                            <ListOrdered size={18}/> 
                            Sequência Otimizada
                        </h3>
                        <span className="text-xs font-bold bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                            {optimizedRoute.length} paradas
                        </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-0 relative">
                        <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-brand-gray-200 z-0"></div>

                        <div className="relative z-10 flex gap-4 mb-6 group opacity-70">
                            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0 border-2 border-white ring-2 ring-green-500/10">
                                <User size={14} />
                            </div>
                            <div className="flex-1 bg-gray-50 p-2 rounded-lg border border-gray-200 flex items-center">
                                <span className="text-xs font-bold text-gray-500 uppercase">Ponto de Partida (Sua Localização)</span>
                            </div>
                        </div>

                        {optimizedRoute.map((appt, idx) => (
                            <div key={appt.id} className="relative z-10 flex gap-4 mb-6 last:mb-0 group">
                                <div className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0 border-2 border-white ring-2 ring-brand-primary/10">
                                    {idx + 1}
                                </div>
                                <div className="flex-1 bg-white p-3 rounded-lg border border-brand-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-sm text-brand-gray-900">{appt.clientName}</h4>
                                        <span className="text-[10px] font-bold text-gray-400">{appt.period}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 truncate">{appt.address}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                 </>
             )}
         </div>

         {/* RIGHT COLUMN: MAP */}
         <div className="flex-1 bg-brand-gray-200 rounded-2xl shadow-inner border border-brand-gray-300 relative overflow-hidden group">
             <div ref={mapRef} className="w-full h-full z-0"></div>
             
             <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-3 rounded-xl shadow-lg border border-white/50 z-[400] text-xs max-w-xs">
                 <p className="font-bold text-brand-gray-900 mb-1 flex items-center gap-1">
                     <MapIcon size={12} className="text-brand-primary"/> Trajeto Inteligente
                 </p>
                 <p className="text-gray-500 leading-tight">
                     Otimizado pela IA Google Gemini com base na sua localização atual.
                 </p>
             </div>
         </div>

      </div>
    </div>
  );
};

export default RoutesPage;
