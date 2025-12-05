
import React, { useState, useEffect, useRef } from 'react';
import { optimizeRoute } from '../services/geminiService';
import { appStore } from '../services/store';
import { Appointment } from '../types';
import { 
    Navigation, Loader2, MoveUp, MoveDown, Map as MapIcon, 
    Flag, Clock, Car, Compass, Sparkles, MapPin, Locate, List, Crosshair
} from 'lucide-react';

// Extend Appointment type locally to include coordinates
interface RouteItem extends Appointment {
  lat?: number;
  lng?: number;
}

const RoutesPage: React.FC = () => {
  const [routeStops, setRouteStops] = useState<RouteItem[]>([]);
  const [optimizationResult, setOptimizationResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoveredStopId, setHoveredStopId] = useState<string | null>(null);
  
  // Geolocation State
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Mobile View State
  const [activeTab, setActiveTab] = useState<'LIST' | 'MAP'>('LIST');

  // Refs for Leaflet instance
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);

  useEffect(() => {
    // 1. Get Appointments in Route
    const appointments = appStore.getRouteAppointments('Cleiton Freitas'); // Mock User
    
    // 2. Get Client Base to merge coordinates
    const clients = appStore.getClients();

    // 3. Merge Data
    const enrichedStops = appointments.map(appt => {
        const client = clients.find(c => c.id === appt.clientId);
        return {
            ...appt,
            lat: client?.latitude,
            lng: client?.longitude
        };
    });

    setRouteStops(enrichedStops);

    // 4. Get User Location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setUserLocation({ lat: latitude, lng: longitude });
            },
            (error) => {
                console.error("Error getting location", error);
                setGeoError("GPS inacessível");
            },
            { enableHighAccuracy: true }
        );
    }
  }, []);

  // --- LEAFLET MAP INITIALIZATION & UPDATE ---
  useEffect(() => {
    // Force map update when switching tabs on mobile
    if (activeTab === 'MAP' || window.innerWidth >= 1024) {
        setTimeout(() => {
            if (mapRef.current) {
                mapRef.current.invalidateSize();
            }
            initMap();
        }, 100);
    }
  }, [activeTab, routeStops, userLocation]); // Re-run when userLocation updates

  const initMap = () => {
    const L = (window as any).L;
    if (!L) return;

    if (!mapRef.current) {
        const mapContainer = document.getElementById('leaflet-map');
        if (mapContainer) {
            // Default center SP
            const initialCenter = userLocation ? [userLocation.lat, userLocation.lng] : [-23.5505, -46.6333];
            const map = L.map('leaflet-map').setView(initialCenter, 13);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                subdomains: 'abcd',
                maxZoom: 19
            }).addTo(map);
            mapRef.current = map;
        }
    }

    if (mapRef.current) {
        const map = mapRef.current;
        
        // 1. Render User Location Marker
        if (userLocation) {
             if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);
             
             const pulseIcon = L.divIcon({
                className: 'user-location-pulse',
                html: `<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg relative">
                          <span class="absolute -inset-2 bg-blue-400 rounded-full opacity-30 animate-ping"></span>
                       </div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
             });

             userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: pulseIcon, zIndexOffset: 1000 })
                .addTo(map)
                .bindPopup('<div class="font-bold text-xs text-center">📍 Sua Localização Atual<br/>(Ponto de Partida)</div>');
        }

        // 2. Render Stops
        if (routeStops.length > 0) {
            markersRef.current.forEach(m => map.removeLayer(m));
            markersRef.current = [];
            if (polylineRef.current) map.removeLayer(polylineRef.current);

            const latLngs: any[] = [];
            
            // Add user location as start of line if available
            if (userLocation) latLngs.push([userLocation.lat, userLocation.lng]);

            routeStops.forEach((stop, index) => {
                if (stop.lat && stop.lng) {
                    const latLng = [stop.lat, stop.lng];
                    latLngs.push(latLng);

                    const isNext = index === 0;
                    const isCompleted = stop.status === 'Completed';
                    const colorClass = isCompleted ? 'bg-green-500 border-green-700' : isNext ? 'bg-brand-primary border-brand-dark' : 'bg-brand-gray-700 border-brand-gray-900';
                    
                    const customIcon = L.divIcon({
                        className: 'custom-div-icon',
                        html: `<div class="w-8 h-8 rounded-full border-2 text-white flex items-center justify-center font-bold text-xs shadow-lg transform transition-transform ${colorClass} ${hoveredStopId === stop.id ? 'scale-125 z-50' : ''}">${index + 1}</div>`,
                        iconSize: [32, 32],
                        iconAnchor: [16, 16]
                    });

                    const marker = L.marker(latLng, { icon: customIcon }).addTo(map)
                        .bindPopup(`
                            <div class="font-sans">
                                <h3 class="font-bold text-sm">${stop.clientName}</h3>
                                <p class="text-xs text-gray-500">${stop.address}</p>
                                <div class="mt-2 text-xs">
                                    <span class="font-bold">Status:</span> ${stop.status === 'Completed' ? '✅ Realizada' : '📅 Agendada'}
                                </div>
                            </div>
                        `);
                    
                    marker.on('mouseover', () => {
                        setHoveredStopId(stop.id);
                        marker.openPopup();
                    });
                    markersRef.current.push(marker);
                }
            });

            if (latLngs.length > 1) {
                polylineRef.current = L.polyline(latLngs, {
                    color: '#F3123C', weight: 4, opacity: 0.7, dashArray: '10, 10', lineCap: 'round'
                }).addTo(map);
                
                // Fit bounds to include user location and stops
                const bounds = L.latLngBounds(latLngs);
                map.fitBounds(bounds, { padding: [50, 50] });
            } else if (latLngs.length === 1) {
                map.setView(latLngs[0], 14);
            }
        }
    }
  };

  const handleOptimize = async () => {
    if (routeStops.length === 0) return;
    setLoading(true);
    
    const visitData = routeStops.map(a => ({
        id: a.id,
        clientName: a.clientName,
        date: a.date || 'Hoje',
        status: a.status,
        address: a.address
    }));
    
    // Pass User Location to AI as start point
    const startLocationStr = userLocation 
        ? `Coordenadas Lat: ${userLocation.lat}, Lng: ${userLocation.lng}` 
        : undefined;

    const result = await optimizeRoute(visitData, startLocationStr);
    setOptimizationResult(result);
    
    const sorted = [...routeStops].sort((a, b) => {
        if (a.status === 'Completed') return -1; 
        return (a.lat || 0) - (b.lat || 0); 
    });

    setTimeout(() => {
        setRouteStops(sorted);
        setLoading(false);
    }, 1500);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newStops = [...routeStops];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newStops.length) {
        [newStops[index], newStops[targetIndex]] = [newStops[targetIndex], newStops[index]];
        setRouteStops(newStops);
    }
  };

  const openExternalApp = (address: string, app: 'waze' | 'maps') => {
    const encoded = encodeURIComponent(address);
    const url = app === 'waze' 
        ? `https://waze.com/ul?q=${encoded}&navigate=yes`
        : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
    window.open(url, '_blank');
  };

  const handleCenterMap = () => {
      if (mapRef.current) {
          if (userLocation) {
              mapRef.current.setView([userLocation.lat, userLocation.lng], 14);
          } else if (routeStops.length > 0) {
              const latLngs = routeStops.filter(s => s.lat && s.lng).map(s => [s.lat, s.lng]);
              if (latLngs.length > 0) {
                 const bounds = (window as any).L.latLngBounds(latLngs);
                 mapRef.current.fitBounds(bounds, { padding: [50, 50] });
              }
          }
      }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] gap-4">
      {/* Header & Stats */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl shadow-sm border border-brand-gray-100 shrink-0">
        <div className="flex items-center justify-between w-full md:w-auto mb-3 md:mb-0">
            <div>
                <h1 className="text-xl font-bold text-brand-gray-900 flex items-center gap-2">
                    <Navigation className="w-6 h-6 text-brand-primary" />
                    Rotas Inteligentes
                </h1>
                <p className="text-brand-gray-500 text-xs mt-1 flex items-center gap-1">
                    {userLocation 
                        ? <span className="text-green-600 flex items-center"><Crosshair size={10} className="mr-1"/> GPS Ativo</span> 
                        : <span className="text-orange-500">Aguardando localização...</span>
                    }
                </p>
            </div>
            {/* Mobile Tab Toggle */}
            <div className="flex lg:hidden bg-brand-gray-100 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTab('LIST')}
                    className={`p-2 rounded-md ${activeTab === 'LIST' ? 'bg-white shadow text-brand-primary' : 'text-brand-gray-500'}`}
                >
                    <List size={20} />
                </button>
                <button 
                    onClick={() => setActiveTab('MAP')}
                    className={`p-2 rounded-md ${activeTab === 'MAP' ? 'bg-white shadow text-brand-primary' : 'text-brand-gray-500'}`}
                >
                    <MapIcon size={20} />
                </button>
            </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <div className="flex items-center gap-2 px-3 py-2 bg-brand-gray-50 rounded-lg border border-brand-gray-100 min-w-[100px]">
                <Flag className="w-4 h-4 text-brand-gray-400" />
                <div>
                    <p className="text-[9px] text-brand-gray-400 uppercase font-bold">Paradas</p>
                    <p className="text-sm font-bold text-brand-gray-900">{routeStops.length}</p>
                </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-brand-gray-50 rounded-lg border border-brand-gray-100 min-w-[100px]">
                <Car className="w-4 h-4 text-brand-gray-400" />
                <div>
                    <p className="text-[9px] text-brand-gray-400 uppercase font-bold">Km Est.</p>
                    <p className="text-sm font-bold text-brand-gray-900">{(routeStops.length * 3.5).toFixed(1)}</p>
                </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-brand-gray-50 rounded-lg border border-brand-gray-100 min-w-[100px]">
                <Clock className="w-4 h-4 text-brand-gray-400" />
                <div>
                    <p className="text-[9px] text-brand-gray-400 uppercase font-bold">Tempo</p>
                    <p className="text-sm font-bold text-brand-gray-900">{routeStops.length * 45}m</p>
                </div>
            </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden relative">
        
        {/* LEFT PANEL: TIMELINE LIST (Visible on Desktop OR Mobile List Tab) */}
        <div className={`w-full lg:w-1/3 flex flex-col bg-white rounded-xl shadow-lg border border-brand-gray-100 overflow-hidden z-20 
            ${activeTab === 'LIST' ? 'flex h-full' : 'hidden lg:flex'}
        `}>
            <div className="p-4 border-b border-brand-gray-100 bg-brand-gray-50/50 flex justify-between items-center">
                <h3 className="font-bold text-brand-gray-900 text-sm">Sequência de Visitas</h3>
                <button 
                    onClick={handleOptimize}
                    disabled={loading || routeStops.length < 2}
                    className="text-xs bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : <Compass className="w-3 h-3 mr-1"/>}
                    Otimizar
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-white pb-28 md:pb-2">
                {/* User Location Card in List */}
                {userLocation && (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md border-2 border-white">
                             <Crosshair size={14} className="animate-pulse" />
                         </div>
                         <div>
                             <h4 className="font-bold text-blue-900 text-xs">Sua Localização</h4>
                             <p className="text-[10px] text-blue-700">Ponto de partida da rota</p>
                         </div>
                    </div>
                )}

                {routeStops.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-brand-gray-400">
                        <MapIcon className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-sm">Rota vazia.</p>
                    </div>
                ) : (
                    routeStops.map((stop, index) => (
                        <div 
                            key={stop.id}
                            className={`relative flex items-start gap-3 p-3 rounded-xl border transition-all group cursor-pointer
                                ${hoveredStopId === stop.id ? 'bg-brand-gray-50 border-brand-primary shadow-md transform scale-[1.02]' : 'bg-white border-brand-gray-100 hover:border-brand-gray-300'}
                            `}
                            onClick={() => {
                                if (window.innerWidth < 1024) setActiveTab('MAP'); // Auto switch to map on mobile
                                if (mapRef.current && stop.lat && stop.lng) {
                                    setTimeout(() => mapRef.current.setView([stop.lat, stop.lng], 16), 300);
                                }
                            }}
                        >
                            {/* Number Badge */}
                            <div className="flex flex-col items-center gap-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm z-10 transition-colors
                                    ${stop.status === 'Completed' 
                                        ? 'bg-green-500 text-white' 
                                        : 'bg-brand-gray-900 text-white'}
                                `}>
                                    {index + 1}
                                </div>
                                {/* Sort Controls */}
                                <div className="flex flex-col lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => {e.stopPropagation(); moveItem(index, 'up')}} disabled={index === 0} className="p-0.5 hover:text-brand-primary disabled:opacity-0"><MoveUp size={12}/></button>
                                    <button onClick={(e) => {e.stopPropagation(); moveItem(index, 'down')}} disabled={index === routeStops.length - 1} className="p-0.5 hover:text-brand-primary disabled:opacity-0"><MoveDown size={12}/></button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-brand-gray-900 text-sm truncate">{stop.clientName}</h4>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold
                                        ${stop.isWallet ? 'bg-yellow-50 text-yellow-700 border-yellow-100' : 'bg-brand-light/10 text-brand-primary border-brand-light/20'}
                                    `}>
                                        {stop.isWallet ? 'Carteira' : 'Novo'}
                                    </span>
                                </div>
                                <p className="text-xs text-brand-gray-500 truncate mb-2">{stop.address}</p>
                                
                                <div className="flex gap-2">
                                    <button 
                                        onClick={(e) => {e.stopPropagation(); openExternalApp(stop.address, 'waze')}}
                                        className="flex-1 bg-blue-50 text-blue-600 border border-blue-100 py-1.5 rounded text-[10px] font-bold transition-colors"
                                    >
                                        Waze
                                    </button>
                                    <button 
                                        onClick={(e) => {e.stopPropagation(); openExternalApp(stop.address, 'maps')}}
                                        className="flex-1 bg-white text-brand-gray-600 border border-brand-gray-200 py-1.5 rounded text-[10px] font-bold transition-colors"
                                    >
                                        Google
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            {/* Optimization Result Text */}
            {optimizationResult && (
                <div className="p-3 bg-brand-gray-900 text-white text-xs border-t border-brand-gray-800 animate-fade-in">
                    <p className="font-bold mb-1 flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-brand-light" />
                        Sugestão IA
                    </p>
                    <p className="opacity-80 line-clamp-2 text-[10px]">
                        {optimizationResult}
                    </p>
                </div>
            )}
        </div>

        {/* RIGHT PANEL: INTERACTIVE MAP (Visible on Desktop OR Mobile Map Tab) */}
        <div className={`flex-1 bg-brand-gray-200 rounded-xl shadow-lg border border-brand-gray-300 relative overflow-hidden group 
            ${activeTab === 'MAP' ? 'flex h-full min-h-[50vh]' : 'hidden lg:flex'}
        `}>
             {/* Map Container */}
             <div id="leaflet-map" className="w-full h-full z-0"></div>

             {/* Floating Info Overlay */}
             <div className="absolute top-4 left-4 z-[400] bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-lg border border-brand-gray-200 max-w-xs pointer-events-none hidden md:block">
                <h3 className="font-bold text-brand-gray-900 text-sm flex items-center gap-2">
                    <MapIcon className="w-4 h-4 text-brand-primary" />
                    Rota Inteligente
                </h3>
                <p className="text-[10px] text-brand-gray-600 mt-1 leading-tight">
                    O traçado vermelho indica a sequência ideal a partir do ponto azul (sua localização).
                </p>
            </div>

            {/* Recenter Button */}
            <button 
                onClick={handleCenterMap}
                className="absolute top-4 right-4 z-[400] bg-white p-2 rounded-lg shadow-lg text-brand-gray-700 hover:text-brand-primary hover:bg-brand-gray-50 border border-brand-gray-200"
                title="Centralizar em Mim"
            >
                <Locate className="w-5 h-5" />
            </button>

            {/* Start Navigation Overlay (Bottom) */}
             <div className="absolute bottom-28 md:bottom-6 left-1/2 transform -translate-x-1/2 z-[400] w-full max-w-sm px-4 pointer-events-auto">
                <button 
                    onClick={() => {
                        const stopAddresses = routeStops.map(s => encodeURIComponent(s.address)).join('/');
                        let url = `https://www.google.com/maps/dir/${stopAddresses}`;
                        
                        if (userLocation) {
                            const origin = `${userLocation.lat},${userLocation.lng}`;
                            // Google Maps format: dir/origin/dest1/dest2/...
                            url = `https://www.google.com/maps/dir/${origin}/${stopAddresses}`;
                        }
                        
                        window.open(url, '_blank');
                    }}
                    disabled={routeStops.length === 0}
                    className="w-full bg-brand-primary hover:bg-brand-dark text-white py-3.5 rounded-2xl font-bold shadow-2xl flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 hover:scale-105 text-sm"
                >
                    <Navigation className="w-5 h-5" />
                    Navegar (Google Maps)
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default RoutesPage;
