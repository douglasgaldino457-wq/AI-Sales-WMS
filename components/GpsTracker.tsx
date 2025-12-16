
import React, { useState, useEffect, useRef } from 'react';
import { 
    PlayCircle, PauseCircle, StopCircle, CarFront, MapPin, Navigation, DollarSign, BellRing
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
  
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [totalDistance, setTotalDistance] = useState(0); // in km
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [currentSpeed, setCurrentSpeed] = useState(0); // in km/h
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [kmRate, setKmRate] = useState(0.58);

  // Refs
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
        if (mapTrackerRef.current) {
            mapTrackerRef.current.remove();
            mapTrackerRef.current = null;
        }
    };
  }, []);

  // Map Initialization
  useEffect(() => {
      const initMap = () => {
          const L = (window as any).L;
          const container = document.getElementById('leaflet-map-tracker');
          
          if (!L || !container) return;

          // Robust Check for Existing Map
          // @ts-ignore
          if (container._leaflet_id) container._leaflet_id = null;
          
          if (mapTrackerRef.current) {
              mapTrackerRef.current.remove();
              mapTrackerRef.current = null;
          }

          const map = L.map('leaflet-map-tracker', {
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
      };

      const timer = setTimeout(initMap, 500);
      return () => clearTimeout(timer);
  }, [userLocation]);

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
      // Vehicle check removed: It is now optional for starting the route
      setIsTracking(true);
      setIsPaused(false);
      setStartTime(new Date());
      setTotalDistance(0);
      setElapsedTime(0);
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

      if (mapTrackerRef.current && trackerMarkerRef.current) {
          trackerMarkerRef.current.setLatLng([latitude, longitude]);
          mapTrackerRef.current.panTo([latitude, longitude]);
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

      // Allow saving even if myVehicle is null
      if (isTracking && totalDistance > 0) {
          const log: TripLog = {
              id: Date.now().toString(),
              date: new Date().toISOString(),
              startTime: startTime?.toISOString() || new Date().toISOString(),
              endTime: new Date().toISOString(),
              distanceKm: parseFloat(totalDistance.toFixed(2)),
              valueEarned: parseFloat((totalDistance * kmRate).toFixed(2)),
              vehiclePlate: myVehicle?.plate || 'Não Vinculado', // Fallback value
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
      <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-7rem)] overflow-hidden relative">
          
          {/* MAP CONTAINER (FULL HEIGHT) */}
          <div className="absolute inset-0 bg-brand-gray-200 z-0">
              <div id="leaflet-map-tracker" className="w-full h-full"></div>
          </div>

          {/* OVERLAY: VEHICLE INFO (TOP LEFT) */}
          <div className="absolute top-4 left-4 z-20">
              <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-white/50 p-2 flex items-center gap-3">
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
          </div>

          {/* OVERLAY: STATUS (TOP RIGHT) */}
          <div className="absolute top-4 right-4 z-20">
              <div className={`px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md border border-white/50 flex items-center gap-2 ${isTracking ? 'bg-brand-gray-900 text-white' : 'bg-white text-gray-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className="text-xs font-bold uppercase">{isTracking ? (isPaused ? 'Pausado' : 'Gravando') : 'Inativo'}</span>
              </div>
          </div>

          {/* BOTTOM SECTION: COMPACT CONTROLS (COCKPIT) */}
          <div className="absolute bottom-6 left-4 right-4 z-20 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[450px]">
              <div className="bg-brand-gray-900/95 backdrop-blur-xl text-white rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
                  
                  {/* METRICS BAR */}
                  <div className="grid grid-cols-3 divide-x divide-white/10 border-b border-white/10">
                      <div className="p-3 text-center">
                          <p className="text-[9px] text-gray-400 uppercase font-bold mb-0.5">Tempo</p>
                          <p className="text-lg font-mono font-bold leading-none">{formatTime(elapsedTime)}</p>
                      </div>
                      <div className="p-3 text-center">
                          <p className="text-[9px] text-gray-400 uppercase font-bold mb-0.5">Distância</p>
                          <p className="text-lg font-mono font-bold leading-none">{totalDistance.toFixed(2)} <span className="text-[10px]">km</span></p>
                      </div>
                      <div className="p-3 text-center">
                          <p className="text-[9px] text-gray-400 uppercase font-bold mb-0.5">Valor</p>
                          <p className="text-lg font-mono font-bold leading-none text-green-400">R$ {(totalDistance * kmRate).toFixed(2)}</p>
                      </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="p-3">
                      {!isTracking ? (
                          <button 
                            onClick={startTracking} 
                            className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg text-sm group"
                          >
                              <PlayCircle size={20} className="group-hover:scale-110 transition-transform" /> 
                              INICIAR ROTA
                          </button>
                      ) : (
                          <div className="flex gap-2">
                              <button onClick={pauseTracking} className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg text-sm ${isPaused ? 'bg-yellow-500 text-black hover:bg-yellow-400' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                                  {isPaused ? <PlayCircle size={18} /> : <PauseCircle size={18} />}
                                  {isPaused ? 'RETOMAR' : 'PAUSAR'}
                              </button>
                              <button onClick={stopTracking} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg text-sm">
                                  <StopCircle size={18} /> ENCERRAR
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>
  );
};
