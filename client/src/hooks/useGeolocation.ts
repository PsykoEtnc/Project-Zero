import { useState, useEffect, useCallback } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  hasGPS: boolean;
  error: string | null;
  lastUpdateTime: number | null;
  gpsLostDuration: number; // seconds since last GPS update
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  updateInterval?: number;
  onPositionChange?: (lat: number, lng: number, heading: number, speed: number) => void;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const { 
    enableHighAccuracy = true, 
    updateInterval = 3000,
    onPositionChange,
  } = options;

  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    heading: null,
    speed: null,
    hasGPS: false,
    error: null,
    lastUpdateTime: null,
    gpsLostDuration: 0,
  });

  const updatePosition = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude, accuracy, heading, speed } = position.coords;
    
    setState({
      latitude,
      longitude,
      accuracy,
      heading: heading ?? 0,
      speed: speed ? speed * 3.6 : 0, // Convert m/s to km/h
      hasGPS: true,
      error: null,
      lastUpdateTime: Date.now(),
      gpsLostDuration: 0,
    });

    if (onPositionChange) {
      onPositionChange(
        latitude, 
        longitude, 
        heading ?? 0, 
        speed ? speed * 3.6 : 0
      );
    }
  }, [onPositionChange]);

  const handleError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = "Erreur GPS inconnue";
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = "Accès GPS refusé";
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = "Position GPS indisponible";
        break;
      case error.TIMEOUT:
        errorMessage = "Délai GPS dépassé";
        break;
    }

    setState(prev => ({
      ...prev,
      hasGPS: false,
      error: errorMessage,
    }));
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        hasGPS: false,
        error: "Géolocalisation non supportée",
      }));
      return;
    }

    // Get initial position
    navigator.geolocation.getCurrentPosition(updatePosition, handleError, {
      enableHighAccuracy,
      timeout: 10000,
      maximumAge: 0,
    });

    // Watch position changes
    const watchId = navigator.geolocation.watchPosition(updatePosition, handleError, {
      enableHighAccuracy,
      timeout: 10000,
      maximumAge: updateInterval,
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [enableHighAccuracy, updateInterval, updatePosition, handleError]);

  // Track GPS lost duration
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        if (prev.lastUpdateTime && !prev.hasGPS) {
          const duration = Math.floor((Date.now() - prev.lastUpdateTime) / 1000);
          return { ...prev, gpsLostDuration: duration };
        }
        if (!prev.hasGPS && !prev.lastUpdateTime) {
          return { ...prev, gpsLostDuration: prev.gpsLostDuration + 1 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Simulate position for development/demo
  const simulatePosition = useCallback((lat: number, lng: number, heading: number = 0, speed: number = 0) => {
    setState({
      latitude: lat,
      longitude: lng,
      accuracy: 10,
      heading,
      speed,
      hasGPS: true,
      error: null,
      lastUpdateTime: Date.now(),
      gpsLostDuration: 0,
    });

    if (onPositionChange) {
      onPositionChange(lat, lng, heading, speed);
    }
  }, [onPositionChange]);

  return {
    ...state,
    simulatePosition,
  };
}

export default useGeolocation;
