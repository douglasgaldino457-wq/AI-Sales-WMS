
import React, { useState, useEffect, useRef } from 'react';
import { 
    PlayCircle, PauseCircle, StopCircle, CarFront, Map as MapIcon, Navigation, DollarSign, BellRing, Gauge, Layers, GaugeCircle, Clock, MapPin
} from 'lucide-react';
import { appStore } from '../services/store';
import { Vehicle, TripLog, Page } from '../types';
import { useAppStore } from '../services/useAppStore';

interface GpsTrackerProps {
    onExportReport?: () => void;
}

export const GpsTracker: React.FC<GpsTrackerProps> = ({ onExportReport }) => {
  const { navigate } = useAppStore();
  const [myVehicle, setMyVehicle] = useState<Vehicle | null>(null);
  
  // View Mode: MAP vs PANEL (Cockpit)
  const [viewMode, setViewMode] = useState<'MAP' | 'PANEL'>('MAP');

  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [totalDistance, setTotalDistance] = useState(0); // in km
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [currentSpeed, setCurrentSpeed] = useState(0); // in km/h
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [kmRate, setKmRate] = useState(0.58);

  // Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapTrackerRef = useRef<any>(null);
  const trackerMarkerRef = useRef<any>(null);
  const trackerPolylineRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{lat: number, lng: number, timestamp: number} | null>(null);
  const lastNotificationRef = useRef<number>(0);

  // Constants
  const SPEED_THRESHOLD = 5; 

  useEffect(() => {
    const vehicle = appStore.getMyVehicle();
    if (vehicle) setMyVehicle(vehicle);
    
    const financeConfig = appStore.getFinanceConfig();
    if (financeConfig) {
        setKmRate(financeConfig.kmRate);
    }

    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => console.error("GPS Error", err),
            { enableHighAccuracy: true }
        );
    }

    return () => {
        stopTracking();
    };
  }, []);

  // Map Initialization & Cleanup
  useEffect(() => {
      // Use CSS hiding instead of unmounting to keep map instance alive during toggle
      // but we need to init it once
      const L = (window as any).L;
      if (!L || !mapContainerRef.current) return;

      if (mapTrackerRef.current) return; // Already initialized

      const container = mapContainerRef.current as any;
      if (container._leaflet_id) container._leaflet_id = null;

      const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false
      }).setView(userLocation ? [userLocation.lat, userLocation.lng] : [-23.5505, -46.6333], 16);
      
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; CARTO'
      }).addTo(map);
      
      mapTrackerRef.current = map;

      const carIcon = L.divIcon({
          className: 'car-marker',
          html: `<div style="background-color: #F3123C; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); color: white;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M14 10l-2-3h2l2 3h-2z"/></svg>
                 </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
      });
      
      const startPos = userLocation ? [userLocation.lat, userLocation.lng] : map.getCenter();
      trackerMarkerRef.current = L.marker(startPos, { icon: carIcon }).addTo(map);
      trackerPolylineRef.current = L.polyline([], { color: '#F3123C', weight: 5, opacity: 0.8 }).addTo(map);

  }, [userLocation]); // Init once when location available

  const sendNotification = (dist: number, value: number) => {
      if ("Notification" in window && Notification.permission === "granted" && !document.hasFocus()) {
          const now = Date.now();
          if (now - lastNotificationRef.current > 60000) { 
              try {
                  new Notification("Rota em Andamento", {
                      body: `${dist.toFixed(2)} km percorridos - R$ ${value.toFixed(2)}`,
                      icon: '/vite.svg',
                      tag: 'gps-tracker'
                  });
                  lastNotificationRef.current = now;
              } catch (e) { console.error(e); }
          }
      }
  };

  const startTracking = () => {
      setIsTracking(true);
      setIsPaused(false);
      setStartTime(new Date());
      setTotalDistance(0);
      setElapsedTime(0);
      // Auto-switch to Panel mode for better visibility when starting
      setViewMode('PANEL'); 
      lastPositionRef.current = null;

      if (trackerPolylineRef.current) trackerPolylineRef.current.setLatLngs([]);

      timerRef.current = window.setInterval(() => {
          if (!isPaused) setElapsedTime(prev => prev + 1);
      }, 1000);

      if (navigator.geolocation) {
          watchIdRef.current = navigator.geolocation.watchPosition(
              handlePositionUpdate,
              (err) => console.error("Tracking Error", err),
              { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
          );
      }

      if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Rota Iniciada", { body: "O monitoramento de GPS está ativo." });
      }
  };

  const handlePositionUpdate = (position: GeolocationPosition) => {
      if (isPaused) return;

      const { latitude, longitude, speed } = position.coords;
      const speedKmh = (speed || 0) * 3.6;
      setCurrentSpeed(speedKmh);

      const currentPos = { lat: latitude, lng: longitude, timestamp: position.timestamp };

      // Update Map if active
      if (mapTrackerRef.current && trackerMarkerRef.current) {
          trackerMarkerRef.current.setLatLng([latitude, longitude]);
          if(viewMode === 'MAP') mapTrackerRef.current.panTo([latitude, longitude]);
      }

      if (lastPositionRef.current) {
          const distKm = calculateDistance(
              lastPositionRef.current.lat, lastPositionRef.current.lng,
              latitude, longitude
          );
          
          let effectiveSpeed = speedKmh;
          if (speed === null) {
              const timeDiff = (currentPos.timestamp - lastPositionRef.current.timestamp) / 1000;
              if (timeDiff > 0) effectiveSpeed = (distKm * 1000 / timeDiff) * 3.6;
          }

          if (effectiveSpeed >= SPEED_THRESHOLD || distKm > 0.05) { 
              setTotalDistance(prev => {
                  const newDist = prev + distKm;
                  sendNotification(newDist, newDist * kmRate);
                  return newDist;
              });
              if (trackerPolylineRef.current) {
                  trackerPolylineRef.current.addLatLng([latitude, longitude]);
              }
          }
      }

      lastPositionRef.current = currentPos;
  };

  const pauseTracking = () => setIsPaused(!isPaused);

  const stopTracking = () => {
      if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
      }
      if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
      }

      if (isTracking && totalDistance > 0) {
          const log: TripLog = {
              id: Date.now().toString(),
              date: new Date().toISOString(),
              startTime: startTime?.toISOString() || new Date().toISOString(),
              endTime: new Date().toISOString(),
              distanceKm: parseFloat(totalDistance.toFixed(2)),
              valueEarned: parseFloat((totalDistance * kmRate).toFixed(2)),
              vehiclePlate: myVehicle?.plate || 'Não Vinculado',
              status: 'OPEN'
          };
          appStore.addTripLog(log);
          alert("Rota salva! Acesse a aba Relatórios para vincular.");
      }

      setIsTracking(false);
      setIsPaused(false);
      setTotalDistance(0);
      setElapsedTime(0);
      setStartTime(null);
      setCurrentSpeed(0);
      setViewMode('MAP'); // Reset view on stop
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; 
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
  };

  const formatTime = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  };

  return (
      <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-7rem)] overflow-hidden relative bg-brand-gray-900 rounded-2xl shadow-2xl">
          
          {/* MAP LAYER (Always rendered to keep tracking, hidden via CSS if PANEL mode) */}
          <div className={`absolute inset-0 z-0 transition-opacity duration-500 ${viewMode === 'MAP' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
              <div ref={mapContainerRef} className="w-full h-full bg-brand-gray-200"></div>
          </div>

          {/* PANEL LAYER (COCKPIT) */}
          {viewMode === 'PANEL' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-br from-brand-gray-900 to-black text-white p-6 animate-fade-in">
                  {/* Abstract Background */}
                  <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                  
                  <div className="text-center mb-12 relative z-10 w-full">
                      <div className="inline-flex items-center gap-2 bg-brand-gray-800/50 px-4 py-1.5 rounded-full border border-brand-gray-700 mb-6">
                          <DollarSign size={14} className="text-green-400" />
                          <span className="text-xs font-bold uppercase tracking-wider text-brand-gray-300">Valor Acumulado</span>
                      </div>
                      <h2 className="text-7xl md:text-9xl font-mono font-bold text-green-400 tracking-tighter drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]">
                          R$ {(totalDistance * kmRate).toFixed(2)}
                      </h2>
                  </div>

                  <div className="grid grid-cols-2 gap-8 w-full max-w-lg relative z-10">
                      <div className="bg-brand-gray-800/40 p-6 rounded-2xl border border-brand-gray-700/50 backdrop-blur-sm flex flex-col items-center">
                          <div className="mb-2 p-2 bg-brand-primary/20 rounded-full text-brand-primary">
                              <MapPin size={24} />
                          </div>
                          <p className="text-brand-gray-400 font-bold uppercase tracking-wider text-xs mb-1">Distância</p>
                          <p className="text-4xl font-mono font-bold">{totalDistance.toFixed(2)} <span className="text-sm text-gray-500 font-sans">km</span></p>
                      </div>
                      <div className="bg-brand-gray-800/40 p-6 rounded-2xl border border-brand-gray-700/50 backdrop-blur-sm flex flex-col items-center">
                          <div className="mb-2 p-2 bg-blue-500/20 rounded-full text-blue-500">
                              <Clock size={24} />
                          </div>
                          <p className="text-brand-gray-400 font-bold uppercase tracking-wider text-xs mb-1">Tempo</p>
                          <p className="text-4xl font-mono font-bold">{formatTime(elapsedTime)}</p>
                      </div>
                  </div>

                  {/* Speedometer Mock */}
                  <div className="mt-12 text-center relative z-10 opacity-70">
                      <div className="flex items-end justify-center gap-1">
                          <span className="text-6xl font-mono font-bold text-white">{currentSpeed.toFixed(0)}</span>
                          <span className="text-sm font-bold text-brand-gray-400 mb-2">km/h</span>
                      </div>
                  </div>
              </div>
          )}

          {/* TOP CONTROLS */}
          <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start pointer-events-none">
              {/* Vehicle Badge */}
              <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-white/50 p-2 flex items-center gap-3 pointer-events-auto">
                  <div className="p-1.5 bg-brand-gray-100 rounded-lg text-brand-gray-600">
                      <CarFront className="w-4 h-4" />
                  </div>
                  <div>
                      {myVehicle ? (
                          <div className="leading-tight">
                            <p className="font-bold text-brand-gray-900 text-xs">{myVehicle.model}</p>
                            <p className="text-[10px] text-brand-gray-500 font-mono">{myVehicle.plate}</p>
                          </div>
                      ) : (
                          <button onClick={() => navigate(Page.PERFIL)} className="text-[10px] text-brand-primary font-bold hover:underline text-left">
                             <span className="block text-gray-500">Sem veículo padrão</span>
                             Vincular Veículo
                          </button>
                      )}
                  </div>
              </div>

              {/* View Toggle */}
              <div className="flex bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-white/50 p-1 pointer-events-auto">
                  <button 
                    onClick={() => setViewMode('MAP')}
                    className={`p-2 rounded-lg transition-all flex items-center gap-2 ${viewMode === 'MAP' ? 'bg-brand-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    title="Ver Mapa"
                  >
                      <MapIcon size={18} />
                      <span className="text-xs font-bold hidden md:block">Mapa</span>
                  </button>
                  <button 
                    onClick={() => setViewMode('PANEL')}
                    className={`p-2 rounded-lg transition-all flex items-center gap-2 ${viewMode === 'PANEL' ? 'bg-brand-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    title="Modo Painel"
                  >
                      <GaugeCircle size={18} />
                      <span className="text-xs font-bold hidden md:block">Painel</span>
                  </button>
              </div>
          </div>

          {/* BOTTOM CONTROLS (Floating Island) */}
          <div className="absolute bottom-8 left-4 right-4 z-20 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[400px]">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-2 rounded-2xl shadow-2xl flex gap-3">
                  {!isTracking ? (
                      <button 
                        onClick={startTracking} 
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg"
                      >
                          <PlayCircle size={24} /> Iniciar Rota
                      </button>
                  ) : (
                      <>
                          <button 
                            onClick={pauseTracking} 
                            className={`flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg ${isPaused ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-white'}`}
                          >
                              {isPaused ? <PlayCircle size={24} /> : <PauseCircle size={24} />}
                              {isPaused ? 'Retomar' : 'Pausar'}
                          </button>
                          <button 
                            onClick={stopTracking} 
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg"
                          >
                              <StopCircle size={24} /> Finalizar
                          </button>
                      </>
                  )}
              </div>
          </div>
      </div>
  );
};
