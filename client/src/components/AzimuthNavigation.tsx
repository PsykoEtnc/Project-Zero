import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Compass, Navigation, AlertTriangle, Target } from "lucide-react";
import type { Waypoint } from "@shared/schema";

interface AzimuthNavigationProps {
  currentLat: number | null;
  currentLng: number | null;
  lastKnownLat: number | null;
  lastKnownLng: number | null;
  lastKnownHeading: number | null;
  waypoints: Waypoint[];
  gpsLostDuration: number;
  hasGPS: boolean;
  className?: string;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δλ = toRadians(lng2 - lng1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return (toDegrees(θ) + 360) % 360;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lng2 - lng1);

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function formatBearing(bearing: number): string {
  const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const index = Math.round(bearing / 45) % 8;
  return `${Math.round(bearing)}° ${cardinals[index]}`;
}

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

export function AzimuthNavigation({
  currentLat,
  currentLng,
  lastKnownLat,
  lastKnownLng,
  lastKnownHeading,
  waypoints,
  gpsLostDuration,
  hasGPS,
  className = "",
}: AzimuthNavigationProps) {
  const nextWaypoint = useMemo(() => {
    if (waypoints.length === 0) return null;
    const sorted = [...waypoints].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    return sorted[0];
  }, [waypoints]);

  const navigation = useMemo(() => {
    const lat = currentLat ?? lastKnownLat;
    const lng = currentLng ?? lastKnownLng;

    if (lat === null || lng === null || !nextWaypoint) {
      return null;
    }

    const bearing = calculateBearing(lat, lng, nextWaypoint.latitude, nextWaypoint.longitude);
    const distance = calculateDistance(lat, lng, nextWaypoint.latitude, nextWaypoint.longitude);
    const relativeBearing = lastKnownHeading !== null 
      ? (bearing - lastKnownHeading + 360) % 360 
      : bearing;

    return {
      bearing,
      relativeBearing,
      distance,
      waypoint: nextWaypoint,
    };
  }, [currentLat, currentLng, lastKnownLat, lastKnownLng, lastKnownHeading, nextWaypoint]);

  const showEmergencyMode = !hasGPS && gpsLostDuration >= 30;

  // Only render in emergency mode (GPS lost for 30+ seconds)
  if (!showEmergencyMode) {
    return null;
  }

  return (
    <Card className={`${className} ${showEmergencyMode ? "border-destructive/50 bg-destructive/5" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
            <Compass className="w-4 h-4" />
            Navigation Azimut
          </CardTitle>
          {showEmergencyMode && (
            <Badge variant="destructive" className="animate-pulse text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              GPS PERDU {gpsLostDuration}s
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!navigation ? (
          <div className="text-center py-4 text-muted-foreground">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucun waypoint défini</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-muted-foreground/30"
                  />
                  <text x="50" y="12" textAnchor="middle" className="fill-current text-xs font-bold">N</text>
                  <text x="88" y="54" textAnchor="middle" className="fill-current text-xs font-bold">E</text>
                  <text x="50" y="96" textAnchor="middle" className="fill-current text-xs font-bold">S</text>
                  <text x="12" y="54" textAnchor="middle" className="fill-current text-xs font-bold">O</text>
                  
                  <g transform={`rotate(${navigation.bearing}, 50, 50)`}>
                    <polygon
                      points="50,15 45,35 55,35"
                      className="fill-destructive"
                    />
                    <line
                      x1="50"
                      y1="50"
                      x2="50"
                      y2="20"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-destructive"
                    />
                  </g>
                  
                  {lastKnownHeading !== null && (
                    <g transform={`rotate(${lastKnownHeading}, 50, 50)`}>
                      <polygon
                        points="50,25 47,40 53,40"
                        className="fill-primary/60"
                      />
                    </g>
                  )}
                  
                  <circle cx="50" cy="50" r="3" className="fill-primary" />
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-md bg-muted/50">
                <div className="text-2xl font-mono font-bold text-primary">
                  {formatBearing(navigation.bearing)}
                </div>
                <div className="text-xs text-muted-foreground uppercase">Cap absolu</div>
              </div>
              <div className="p-3 rounded-md bg-muted/50">
                <div className="text-2xl font-mono font-bold text-primary">
                  {formatDistance(navigation.distance)}
                </div>
                <div className="text-xs text-muted-foreground uppercase">Distance</div>
              </div>
            </div>

            <div className="p-2 rounded-md bg-muted/30 text-center">
              <div className="flex items-center justify-center gap-2 text-sm">
                <Navigation className="w-4 h-4 text-primary" />
                <span className="font-medium">{navigation.waypoint.name}</span>
                <Badge variant="outline" className="text-xs">{navigation.waypoint.code}</Badge>
              </div>
            </div>

            {showEmergencyMode && (
              <div className="p-2 rounded-md bg-destructive/10 border border-destructive/30 text-xs text-center">
                <p className="font-medium text-destructive">Mode navigation de secours</p>
                <p className="text-muted-foreground mt-1">
                  Dernière position connue utilisée. Maintenez le cap {formatBearing(navigation.bearing)} sur {formatDistance(navigation.distance)}.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default AzimuthNavigation;
