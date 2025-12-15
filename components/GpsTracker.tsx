
import React, { useState, useEffect, useRef } from 'react';
import { 
    PlayCircle, PauseCircle, StopCircle, CarFront, FileText, Download, Loader2, Sparkles, MapPin, Navigation, Calendar, Gauge, Clock, DollarSign
} from 'lucide-react';
import { identifyVehicleByPlate } from '../services/geminiService';
import { appStore } from '../services/store';
import { Vehicle, TripLog } from '../types';

interface GpsTrackerProps {
    onExportReport?: () => void;
}

export const GpsTracker: React.FC<GpsTrackerProps> = ({ onExportReport }) => {
  const [myVehicle, setMyVehicle] = useState<Vehicle | null>(null);
  const [vehicleForm, setVehicleForm] = useState({ plate: '' });
  const [loadingVehicle, setLoadingVehicle] = useState(false);
  
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [totalDistance, setTotalDistance] = useState(0); // in km
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [currentSpeed, setCurrentSpeed] = useState(0); // in km/h
  const [tripLogs, setTripLogs] = useState<TripLog[]>([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  // Refs
  const mapTrackerRef = useRef<any>(null);
  const trackerMarkerRef = useRef<any>(null);
  const trackerPolylineRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{lat: number, lng: number, timestamp: number} | null>(null);

  // Constants
  const PAY_RATE = 0.58; // R$/km
  const SPEED_THRESHOLD = 5; // km/h (minimum to count distance)

  useEffect(() => {
    const vehicle = appStore.getMyVehicle();
    if (vehicle) setMyVehicle(vehicle);
    setTripLogs(appStore.getTripLogs());

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => console.error("GPS Error", err),
            { enableHighAccuracy: true }
        );
    }

    return () => {
        stopTracking();
        // Force cleanup on unmount
        if (mapTrackerRef.current) {
            mapTrackerRef.current.remove();
            mapTrackerRef.current = null;
        }
    };
  }, []);

  // Map Initialization with Safety Check
  useEffect(() => {
      const initMap = () => {
          const L = (window as any).L;
          const container = document.getElementById('leaflet-map-tracker');
          
          if (!L || !container) return;

          // CRITICAL FIX: Manually clear Leaflet ID to prevent "Map container is already initialized" error
          // @ts-ignore
          if (container._leaflet_id) {
            // @ts-ignore
            container._leaflet_id = null;
          }
          
          // Cleanup existing instance ref just in case
          if (mapTrackerRef.current) {
              mapTrackerRef.current.remove();
              mapTrackerRef.current = null;
          }

          const map = L.map('leaflet-map-tracker', {
              zoomControl: false,
              attributionControl: false
          }).setView(userLocation ? [userLocation.lat, userLocation.lng] : [-23.5505, -46.6333], 15);
          
          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
              attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
          }).addTo(map);
          
          L.control.zoom({ position: 'bottomright' }).addTo(map);

          mapTrackerRef.current = map;

          const carIcon = L.divIcon({
              className: 'car-marker',
              html: `<div style="background-color: #F3123C; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); color: white;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M14 10l-2-3h2l2 3h-2z"/></svg>
                     </div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16]
          });
          
          const startPos = userLocation ? [userLocation.lat, userLocation.lng] : map.getCenter();
          trackerMarkerRef.current = L.marker(startPos, { icon: carIcon }).addTo(map);
          trackerPolylineRef.current = L.polyline([], { color: '#F3123C', weight: 5, opacity: 0.8 }).addTo(map);
      };

      // Delay slightly to ensure DOM is ready
      const timer = setTimeout(initMap, 500);
      return () => clearTimeout(timer);
  }, [userLocation]);

  const startTracking = () => {
      if (!myVehicle) {
          alert("Por favor, cadastre seu veículo antes de iniciar.");
          return;
      }
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

          // Filter noise: Moving faster than 5km/h OR significant jump
          if (effectiveSpeed >= SPEED_THRESHOLD || distKm > 0.05) { 
              setTotalDistance(prev => prev + distKm);
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

      if (isTracking && totalDistance > 0 && myVehicle) {
          const log: TripLog = {
              id: Date.now().toString(),
              date: new Date().toISOString(),
              startTime: startTime?.toISOString() || new Date().toISOString(),
              endTime: new Date().toISOString(),
              distanceKm: parseFloat(totalDistance.toFixed(2)),
              valueEarned: parseFloat((totalDistance * PAY_RATE).toFixed(2)),
              vehiclePlate: myVehicle.plate,
              status: 'COMPLETED'
          };
          appStore.addTripLog(log);
          setTripLogs(prev => [log, ...prev]);
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

  const handleIdentifyVehicle = async () => {
      if (!vehicleForm.plate || vehicleForm.plate.length < 7) {
          alert("Placa inválida.");
          return;
      }
      setLoadingVehicle(true);
      const data = await identifyVehicleByPlate(vehicleForm.plate);
      setLoadingVehicle(false);
      
      if (data) {
          setMyVehicle(data);
          appStore.setMyVehicle(data);
      } else {
          // Fallback manual entry
          const manual = { ...vehicleForm, make: 'Manual', model: 'Entry', year: '2024', color: 'White' } as Vehicle;
          setMyVehicle(manual);
          appStore.setMyVehicle(manual);
      }
  };

  const formatTime = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  };

  return (
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)] min-h-[500px]">
          {/* LEFT: CONTROLS & INFO */}
          <div className="w-full lg:w-96 flex flex-col gap-4 overflow-y-auto pr-2">
              
              {/* Vehicle Card */}
              <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 p-5">
                  <h3 className="font-bold text-brand-gray-900 flex items-center gap-2 mb-4 text-sm">
                      <CarFront className="w-4 h-4 text-brand-primary" /> MEU VEÍCULO
                  </h3>
                  {myVehicle ? (
                      <div className="bg-brand-gray-50 p-4 rounded-lg border border-brand-gray-200 group">
                          <div className="flex justify-between items-start">
                              <div>
                                  <p className="font-bold text-brand-gray-900 text-base">{myVehicle.make} {myVehicle.model}</p>
                                  <p className="text-xs text-brand-gray-600 mt-0.5">{myVehicle.year} • {myVehicle.color}</p>
                              </div>
                              <div className="bg-white border-2 border-brand-gray-900 rounded px-2 py-1 shadow-sm">
                                  <span className="font-mono font-bold text-brand-gray-900 tracking-wider text-sm">{myVehicle.plate}</span>
                              </div>
                          </div>
                          <button onClick={() => setMyVehicle(null)} className="mt-3 text-[10px] text-brand-primary font-bold hover:underline opacity-0 group-hover:opacity-100 transition-opacity">Trocar Veículo</button>
                      </div>
                  ) : (
                      <div className="space-y-3">
                          <div className="flex gap-2">
                              <input 
                                className="flex-1 border border-brand-gray-300 rounded-lg px-3 py-2 uppercase font-mono font-bold focus:ring-2 focus:ring-brand-primary/20 outline-none text-sm"
                                placeholder="PLACA"
                                value={vehicleForm.plate}
                                onChange={e => setVehicleForm({plate: e.target.value.toUpperCase()})}
                                maxLength={7}
                              />
                              <button 
                                onClick={handleIdentifyVehicle}
                                disabled={loadingVehicle}
                                className="bg-brand-gray-900 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50 hover:bg-black transition-colors"
                              >
                                  {loadingVehicle ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                                  Buscar
                              </button>
                          </div>
                      </div>
                  )}
              </div>

              {/* ACTIVE SESSION DASHBOARD */}
              <div className="bg-brand-gray-900 text-white rounded-xl shadow-lg p-6 relative overflow-hidden flex flex-col gap-6">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                  
                  <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${isTracking && !isPaused ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                              {isTracking ? (isPaused ? 'Pausado' : 'Em Rota') : 'Aguardando'}
                          </span>
                      </div>
                      {isTracking && (
                          <span className="text-xs font-mono text-gray-300">{startTime?.toLocaleTimeString().slice(0,5)}</span>
                      )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 relative z-10">
                      <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm border border-white/5">
                          <p className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1"><MapPin size={10}/> Distância</p>
                          <p className="text-xl font-mono font-bold text-white tracking-tight">{totalDistance.toFixed(2)} <span className="text-xs font-sans text-gray-400">km</span></p>
                      </div>
                      <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm border border-white/5">
                          <p className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1"><DollarSign size={10}/> Reembolso</p>
                          <p className="text-xl font-mono font-bold text-green-400 tracking-tight">R$ {(totalDistance * PAY_RATE).toFixed(2)}</p>
                      </div>
                      <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm border border-white/5">
                          <p className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1"><Clock size={10}/> Tempo</p>
                          <p className="text-lg font-mono font-bold text-white">{formatTime(elapsedTime)}</p>
                      </div>
                      <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm border border-white/5">
                          <p className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1"><Gauge size={10}/> Velocidade</p>
                          <p className="text-lg font-mono font-bold text-white">{currentSpeed.toFixed(0)} <span className="text-[10px] text-gray-400">km/h</span></p>
                      </div>
                  </div>

                  <div className="flex gap-2 relative z-10 pt-2">
                      {!isTracking ? (
                          <button onClick={startTracking} className="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg text-sm">
                              <PlayCircle size={16} /> Iniciar Rota
                          </button>
                      ) : (
                          <>
                              <button onClick={pauseTracking} className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm ${isPaused ? 'bg-yellow-500 text-black hover:bg-yellow-400' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                                  {isPaused ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
                                  {isPaused ? 'Retomar' : 'Pausar'}
                              </button>
                              <button onClick={stopTracking} className="flex-1 bg-red-600 hover:bg-red-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg text-sm">
                                  <StopCircle size={16} /> Encerrar
                              </button>
                          </>
                      )}
                  </div>
              </div>

              {/* HISTORY LIST */}
              <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 flex-1 overflow-hidden flex flex-col min-h-[150px]">
                  <div className="p-4 border-b border-brand-gray-100 flex justify-between items-center bg-brand-gray-50">
                      <h3 className="font-bold text-xs text-brand-gray-700 flex items-center gap-2"><FileText size={14}/> Histórico Recente</h3>
                      {onExportReport && (
                          <button onClick={onExportReport} className="text-[10px] text-brand-primary font-bold hover:underline flex items-center gap-1 bg-white border border-brand-gray-200 px-2 py-1 rounded shadow-sm">
                              <Download size={10}/> PDF
                          </button>
                      )}
                  </div>
                  <div className="overflow-y-auto flex-1">
                      {tripLogs.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                              <Navigation size={24} className="mb-2 opacity-20" />
                              <p className="text-xs">Nenhum percurso gravado.</p>
                          </div>
                      ) : (
                          tripLogs.map(log => (
                              <div key={log.id} className="p-3 border-b border-brand-gray-50 flex justify-between items-center hover:bg-brand-gray-50 transition-colors">
                                  <div>
                                      <div className="flex items-center gap-2">
                                          <Calendar size={10} className="text-gray-400"/>
                                          <p className="font-bold text-xs text-brand-gray-800">{new Date(log.date).toLocaleDateString()}</p>
                                      </div>
                                      <p className="text-[10px] text-brand-gray-500 pl-4 mt-0.5">
                                          {new Date(log.startTime).toLocaleTimeString().slice(0,5)} - {new Date(log.endTime).toLocaleTimeString().slice(0,5)}
                                      </p>
                                  </div>
                                  <div className="text-right">
                                      <p className="font-bold text-xs text-brand-gray-900">{log.distanceKm} km</p>
                                      <p className="font-bold text-xs text-green-600">R$ {log.valueEarned.toFixed(2)}</p>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>

          {/* RIGHT: MAP */}
          <div className="flex-1 bg-brand-gray-200 rounded-xl shadow-inner border border-brand-gray-300 relative overflow-hidden h-full min-h-[400px]">
              <div id="leaflet-map-tracker" className="w-full h-full z-0"></div>
              
              {/* Overlay Status */}
              <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur p-2.5 rounded-xl shadow-lg border border-white/50 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${userLocation ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                  <span className="text-xs font-bold text-brand-gray-700">
                      {userLocation ? 'GPS Ativo' : 'Buscando sinal...'}
                  </span>
              </div>
          </div>
      </div>
  );
};
