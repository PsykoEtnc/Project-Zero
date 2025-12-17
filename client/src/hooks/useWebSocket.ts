import { useEffect, useState, useCallback } from "react";
import { socket } from "@/lib/socket";
import type { Vehicle, Alert, PcMessage } from "@shared/schema";

interface WebSocketState {
  isConnected: boolean;
  vehicles: Vehicle[];
  alerts: Alert[];
  messages: PcMessage[];
  route: [number, number][] | null;
}

export function useWebSocket(currentRole: string | null) {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    vehicles: [],
    alerts: [],
    messages: [],
    route: null,
  });

  // Update position
  const updatePosition = useCallback((latitude: number, longitude: number, heading: number = 0, speed: number = 0) => {
    if (currentRole && currentRole !== "PC") {
      socket.emit("position:update", {
        vehicleId: currentRole,
        latitude,
        longitude,
        heading,
        speed,
      });
    }
  }, [currentRole]);

  // Toggle stealth mode
  const toggleStealthMode = useCallback((isStealthMode: boolean) => {
    if (currentRole && currentRole !== "PC") {
      socket.emit("stealth:toggle", {
        vehicleId: currentRole,
        isStealthMode,
      });
    }
  }, [currentRole]);

  // Create alert
  const createAlert = useCallback((type: string, latitude: number, longitude: number, description?: string, imageBase64?: string) => {
    socket.emit("alert:create", {
      type,
      latitude,
      longitude,
      description,
      imageUrl: imageBase64,
      sourceVehicleId: currentRole,
    });
  }, [currentRole]);

  // Validate alert (PC only)
  const validateAlert = useCallback((alertId: string) => {
    socket.emit("alert:validate", { alertId, validatedBy: currentRole });
  }, [currentRole]);

  // Dismiss alert (PC only)
  const dismissAlert = useCallback((alertId: string) => {
    socket.emit("alert:dismiss", { alertId, validatedBy: currentRole });
  }, [currentRole]);

  // Send PC message
  const sendPcMessage = useCallback((content: string, targetVehicleId: string | null) => {
    socket.emit("message:send", { content, targetVehicleId });
  }, []);

  // Mark message as read
  const markMessageAsRead = useCallback((messageId: string) => {
    socket.emit("message:read", { messageId });
  }, []);

  // Request route recalculation
  const recalculateRoute = useCallback(() => {
    socket.emit("route:recalculate");
  }, []);

  useEffect(() => {
    // Connection events
    socket.on("connect", () => {
      setState(prev => ({ ...prev, isConnected: true }));
      if (currentRole) {
        socket.emit("join", { vehicleId: currentRole });
      }
    });

    socket.on("disconnect", () => {
      setState(prev => ({ ...prev, isConnected: false }));
    });

    // Data sync events
    socket.on("vehicles:sync", (vehicles: Vehicle[]) => {
      setState(prev => ({ ...prev, vehicles }));
    });

    socket.on("vehicle:updated", (vehicle: Vehicle) => {
      setState(prev => ({
        ...prev,
        vehicles: prev.vehicles.map(v => v.id === vehicle.id ? vehicle : v),
      }));
    });

    socket.on("alerts:sync", (alerts: Alert[]) => {
      setState(prev => ({ ...prev, alerts }));
    });

    socket.on("alert:created", (alert: Alert) => {
      setState(prev => ({
        ...prev,
        alerts: [...prev.alerts, alert],
      }));
    });

    socket.on("alert:updated", (alert: Alert) => {
      setState(prev => ({
        ...prev,
        alerts: prev.alerts.map(a => a.id === alert.id ? alert : a),
      }));
    });

    socket.on("messages:sync", (messages: PcMessage[]) => {
      setState(prev => ({ ...prev, messages }));
    });

    socket.on("message:received", (message: PcMessage) => {
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, message],
      }));
    });

    socket.on("route:updated", (route: [number, number][]) => {
      setState(prev => ({ ...prev, route }));
    });

    // Connect if not already connected
    if (!socket.connected) {
      socket.connect();
    } else if (currentRole) {
      socket.emit("join", { vehicleId: currentRole });
    }

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("vehicles:sync");
      socket.off("vehicle:updated");
      socket.off("alerts:sync");
      socket.off("alert:created");
      socket.off("alert:updated");
      socket.off("messages:sync");
      socket.off("message:received");
      socket.off("route:updated");
    };
  }, [currentRole]);

  return {
    ...state,
    updatePosition,
    toggleStealthMode,
    createAlert,
    validateAlert,
    dismissAlert,
    sendPcMessage,
    markMessageAsRead,
    recalculateRoute,
  };
}

export default useWebSocket;
