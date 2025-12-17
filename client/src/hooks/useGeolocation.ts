import { useState, useEffect, useCallback } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  hasGPS: boolean;
  error: string | null;
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
