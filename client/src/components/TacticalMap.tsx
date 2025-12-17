import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { useRole } from "@/contexts/RoleContext";
import type { Vehicle, Alert, Zone, Waypoint } from "@shared/schema";
import { VEHICLE_TYPES, ALERT_TYPES, WAYPOINT_TYPES } from "@shared/schema";
import { AlertTriangle, Target, Construction, Car, Users, Info, Bomb } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Fix for default Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom vehicle icons using SVG
const createVehicleIcon = (type: string, isSelected: boolean = false, isStealthMode: boolean = false) => {
  let color = "#2563eb"; // Blue for convoy
  let shape = "convoy";
  
  if (type === "RECO") {
    color = "#16a34a"; // Green for reco
    shape = "reco";
  } else if (type === "A400M") {
    color = "#7c3aed"; // Purple for aircraft
    shape = "aircraft";
  } else if (type === "PC") {
    color = "#dc2626"; // Red for PC
    shape = "hq";
  }
  
  if (isStealthMode) {
    color = "#6b7280"; // Gray for stealth
  }

  const size = isSelected ? 40 : 32;
  const strokeWidth = isSelected ? 3 : 2;

  let svgPath = "";
  if (shape === "aircraft") {
    svgPath = `<path d="M12 2L8 8V14L2 18V20L8 18V22L6 24V26L12 24L18 26V24L16 22V18L22 20V18L16 14V8L12 2Z" fill="${color}" stroke="#fff" stroke-width="${strokeWidth}"/>`;
  } else if (shape === "reco") {
    svgPath = `<rect x="4" y="8" width="16" height="12" rx="2" fill="${color}" stroke="#fff" stroke-width="${strokeWidth}"/><circle cx="8" cy="22" r="3" fill="#333" stroke="#fff"/><circle cx="16" cy="22" r="3" fill="#333" stroke="#fff"/><path d="M8 6L12 2L16 6" stroke="${color}" stroke-width="2" fill="none"/>`;
  } else if (shape === "hq") {
    svgPath = `<rect x="4" y="4" width="16" height="20" fill="${color}" stroke="#fff" stroke-width="${strokeWidth}"/><path d="M4 10H20M12 4V24" stroke="#fff" stroke-width="2"/>`;
  } else {
    svgPath = `<rect x="2" y="10" width="20" height="10" rx="2" fill="${color}" stroke="#fff" stroke-width="${strokeWidth}"/><rect x="4" y="6" width="6" height="6" fill="${color}" stroke="#fff"/><circle cx="6" cy="22" r="3" fill="#333" stroke="#fff"/><circle cx="18" cy="22" r="3" fill="#333" stroke="#fff"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">${svgPath}</svg>`;
  
  return L.divIcon({
    html: svg,
    className: "vehicle-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Alert icons
const createAlertIcon = (type: string, status: string) => {
  let color = "#f59e0b"; // Yellow for pending
  if (status === "VALIDATED") color = "#dc2626"; // Red for validated
  if (status === "DISMISSED") color = "#6b7280"; // Gray for dismissed
  
  const size = 28;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
    <path d="M12 2L2 22H22L12 2Z" fill="${color}" stroke="#fff" stroke-width="2"/>
    <text x="12" y="18" text-anchor="middle" fill="#fff" font-size="10" font-weight="bold">!</text>
  </svg>`;
  
  return L.divIcon({
    html: svg,
    className: "alert-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
};

// Extraction point icon
const createExtractionIcon = () => {
  const size = 40;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="#22c55e" stroke="#fff" stroke-width="2"/>
    <path d="M12 6L12 18M6 12L18 12" stroke="#fff" stroke-width="3"/>
  </svg>`;
  
  return L.divIcon({
    html: svg,
    className: "extraction-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Waypoint icons
const createWaypointIcon = (type: string, orderIndex: number) => {
  let color = "#3b82f6"; // Blue default
  
  switch (type) {
    case "CHECKPOINT": color = "#2563eb"; break;
    case "RALLY_POINT": color = "#7c3aed"; break;
    case "EXTRACTION": color = "#22c55e"; break;
    case "REFUEL": color = "#f59e0b"; break;
    case "REST_AREA": color = "#06b6d4"; break;
    case "DANGER_ZONE": color = "#dc2626"; break;
    case "CUSTOM": color = "#6b7280"; break;
  }
  
  const size = 32;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}" stroke="#fff" stroke-width="2"/>
    <circle cx="12" cy="9" r="3" fill="#fff"/>
    <text x="12" y="12" text-anchor="middle" fill="${color}" font-size="6" font-weight="bold">${orderIndex + 1}</text>
  </svg>`;
  
  return L.divIcon({
    html: svg,
    className: "waypoint-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
};

interface MapControllerProps {
  vehicles: Vehicle[];
  currentVehicleId: string | null;
  canSeeFullMap: boolean;
}

function MapController({ vehicles, currentVehicleId, canSeeFullMap }: MapControllerProps) {
  const map = useMap();
  const { currentRole } = useRole();

  useEffect(() => {
    if (!canSeeFullMap && currentVehicleId) {
      const currentVehicle = vehicles.find(v => v.id === currentVehicleId);
      if (currentVehicle) {
        map.setView([currentVehicle.latitude, currentVehicle.longitude], 16);
        map.setMaxZoom(17);
        map.setMinZoom(15);
      }
    } else {
      map.setMinZoom(8);
      map.setMaxZoom(18);
    }
  }, [canSeeFullMap, currentVehicleId, vehicles, map]);

  return null;
}

interface TacticalMapProps {
  vehicles: Vehicle[];
  alerts: Alert[];
  zones: Zone[];
  waypoints?: Waypoint[];
  route: [number, number][] | null;
  extractionPoint: { lat: number; lng: number } | null;
  onMapClick?: (lat: number, lng: number) => void;
  onWaypointClick?: (waypoint: Waypoint) => void;
  selectedVehicleId?: string | null;
  className?: string;
}

export function TacticalMap({
  vehicles,
  alerts,
  zones,
  waypoints = [],
  route,
  extractionPoint,
  onMapClick,
  onWaypointClick,
  selectedVehicleId,
  className = "",
}: TacticalMapProps) {
  const { currentRole, canSeeFullMap } = useRole();
  const mapRef = useRef<L.Map | null>(null);

  // Default center: Mali region (for the tactical scenario)
  const defaultCenter: [number, number] = [17.5707, -3.9962];
  const defaultZoom = canSeeFullMap ? 10 : 16;

  const currentVehicleId = currentRole && currentRole !== "PC" ? currentRole : null;
  const currentVehicle = vehicles.find(v => v.type === currentRole);

  // Filter visibility based on role
  const visibleVehicles = vehicles.filter(v => {
    if (canSeeFullMap) return true;
    if (!currentVehicle) return true;
    
    // Calculate distance - vehicles only see 300m radius
    const distance = calculateDistance(
      currentVehicle.latitude,
      currentVehicle.longitude,
      v.latitude,
      v.longitude
    );
    return distance <= 0.3; // 300 meters in km
  });

  const visibleAlerts = alerts.filter(a => {
    if (canSeeFullMap) return true;
    if (!currentVehicle) return true;
    
    const distance = calculateDistance(
      currentVehicle.latitude,
      currentVehicle.longitude,
      a.latitude,
      a.longitude
    );
    return distance <= 0.3;
  });

  return (
    <div className={`relative ${className}`} data-testid="map-container">
      <MapContainer
        center={currentVehicle ? [currentVehicle.latitude, currentVehicle.longitude] : defaultCenter}
        zoom={defaultZoom}
        className="w-full h-full"
        ref={mapRef}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />

        <MapController 
          vehicles={vehicles} 
          currentVehicleId={currentVehicleId}
          canSeeFullMap={canSeeFullMap}
        />

        {/* Range circle for vehicles (300m visibility) */}
        {!canSeeFullMap && currentVehicle && (
          <Circle
            center={[currentVehicle.latitude, currentVehicle.longitude]}
            radius={300}
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.1,
              weight: 2,
              dashArray: "5, 5",
            }}
          />
        )}

        {/* Route polyline */}
        {route && route.length > 1 && (
          <Polyline
            positions={route}
            pathOptions={{
              color: "#2563eb",
              weight: 4,
              opacity: 0.8,
              dashArray: "10, 10",
            }}
          />
        )}

        {/* Extraction point */}
        {extractionPoint && (
          <Marker
            position={[extractionPoint.lat, extractionPoint.lng]}
            icon={createExtractionIcon()}
          >
            <Popup>
              <div className="text-center p-2">
                <strong className="text-green-600">Point d'extraction</strong>
                <p className="text-sm text-muted-foreground">A400M - Zone sécurisée</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Zone overlays */}
        {zones.map((zone) => (
          <Circle
            key={zone.id}
            center={[zone.centerLat, zone.centerLng]}
            radius={zone.radiusKm * 1000}
            pathOptions={{
              color: "#6b7280",
              fillColor: "#6b7280",
              fillOpacity: 0.05,
              weight: 1,
            }}
          >
            <Popup>
              <div className="text-center">
                <strong>Zone {zone.code}</strong>
                <p className="text-sm">{zone.name}</p>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Waypoints */}
        {waypoints.map((waypoint, index) => (
          <Marker
            key={waypoint.id}
            position={[waypoint.latitude, waypoint.longitude]}
            icon={createWaypointIcon(waypoint.type ?? "CHECKPOINT", waypoint.orderIndex ?? index)}
            eventHandlers={{
              click: () => onWaypointClick?.(waypoint),
            }}
          >
            <Popup>
              <div className="p-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    {(waypoint.orderIndex ?? index) + 1}
                  </span>
                  <strong className="text-sm">{waypoint.code} - {waypoint.name}</strong>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {WAYPOINT_TYPES[waypoint.type as keyof typeof WAYPOINT_TYPES]?.name ?? "Point"}
                </p>
                {waypoint.description && (
                  <p className="text-xs mt-1">{waypoint.description}</p>
                )}
                {waypoint.estimatedArrival && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ETA: {new Date(waypoint.estimatedArrival).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Vehicles */}
        {visibleVehicles.map((vehicle) => (
          <Marker
            key={vehicle.id}
            position={[vehicle.latitude, vehicle.longitude]}
            icon={createVehicleIcon(
              vehicle.type,
              vehicle.id === selectedVehicleId,
              vehicle.isStealthMode ?? false
            )}
          >
            <Popup>
              <div className="p-2">
                <strong className="block text-sm">{VEHICLE_TYPES[vehicle.type as keyof typeof VEHICLE_TYPES]?.name}</strong>
                <div className="text-xs text-muted-foreground mt-1 space-y-1">
                  <p>Position: {vehicle.latitude.toFixed(4)}, {vehicle.longitude.toFixed(4)}</p>
                  {vehicle.speed !== null && <p>Vitesse: {vehicle.speed?.toFixed(0)} km/h</p>}
                  <p className={vehicle.isConnected ? "text-green-600" : "text-red-600"}>
                    {vehicle.isConnected ? "Connecté" : "Déconnecté"}
                  </p>
                  {vehicle.isStealthMode && (
                    <p className="text-yellow-600 font-medium">Mode furtif actif</p>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Alerts */}
        {visibleAlerts.map((alert) => (
          <Marker
            key={alert.id}
            position={[alert.latitude, alert.longitude]}
            icon={createAlertIcon(alert.type, alert.status ?? "PENDING")}
          >
            <Popup>
              <div className="p-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <strong className="text-sm">
                    {ALERT_TYPES[alert.type as keyof typeof ALERT_TYPES]?.name}
                  </strong>
                </div>
                {alert.description && (
                  <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                )}
                <p className="text-xs mt-1">
                  Statut: <span className={
                    alert.status === "VALIDATED" ? "text-red-600" :
                    alert.status === "DISMISSED" ? "text-gray-500" :
                    "text-yellow-600"
                  }>
                    {alert.status === "VALIDATED" ? "Validé" :
                     alert.status === "DISMISSED" ? "Rejeté" : "En attente"}
                  </span>
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map attribution overlay */}
      <div className="absolute bottom-2 right-2 bg-background/80 px-2 py-1 rounded text-xs text-muted-foreground">
        OpenStreetMap
      </div>
    </div>
  );
}

// Haversine formula to calculate distance between two points in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export default TacticalMap;
