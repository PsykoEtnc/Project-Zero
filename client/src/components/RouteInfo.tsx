import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRole } from "@/contexts/RoleContext";
import { Route, MapPin, Clock, AlertTriangle, RefreshCw, Navigation } from "lucide-react";

interface RouteInfoProps {
  distanceKm: number;
  etaMinutes: number;
  waypoints?: { name: string; distanceKm: number; passed: boolean }[];
  isOffRoute?: boolean;
  isRecalculating?: boolean;
  onRecalculate?: () => void;
  onChangeRoute?: () => void;
  className?: string;
}

export function RouteInfo({
  distanceKm,
  etaMinutes,
  waypoints = [],
  isOffRoute = false,
  isRecalculating = false,
  onRecalculate,
  onChangeRoute,
  className = "",
}: RouteInfoProps) {
  const { isPC } = useRole();

  const formatEta = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins} min`;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
            <Route className="w-4 h-4" />
            Itinéraire
          </CardTitle>
          {isOffRoute && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Hors route
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Distance and ETA */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-muted rounded-md text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Navigation className="w-3 h-3" />
              <span className="text-xs">Distance</span>
            </div>
            {isRecalculating ? (
              <Skeleton className="h-6 w-16 mx-auto" />
            ) : (
              <p className="font-semibold text-lg">{distanceKm.toFixed(1)} km</p>
            )}
          </div>
          <div className="p-3 bg-muted rounded-md text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Clock className="w-3 h-3" />
              <span className="text-xs">Arrivée estimée</span>
            </div>
            {isRecalculating ? (
              <Skeleton className="h-6 w-16 mx-auto" />
            ) : (
              <p className="font-semibold text-lg">{formatEta(etaMinutes)}</p>
            )}
          </div>
        </div>

        {/* Waypoints */}
        {waypoints.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              Points de passage
            </p>
            <div className="space-y-2">
              {waypoints.map((wp, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2 rounded-md text-sm ${
                    wp.passed
                      ? "bg-green-500/10 text-green-700 dark:text-green-400"
                      : "bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className={`w-3 h-3 ${wp.passed ? "text-green-500" : "text-muted-foreground"}`} />
                    <span className={wp.passed ? "line-through opacity-70" : "font-medium"}>
                      {wp.name}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {wp.distanceKm.toFixed(1)} km
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Off-route warning */}
        {isOffRoute && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Déviation détectée</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Le convoi s'est écarté de l'itinéraire prévu
            </p>
          </div>
        )}

        {/* Actions */}
        {isPC && (
          <div className="flex gap-2">
            {onRecalculate && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRecalculate}
                disabled={isRecalculating}
                className="flex-1"
                data-testid="button-recalculate-route"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRecalculating ? "animate-spin" : ""}`} />
                Recalculer
              </Button>
            )}
            {onChangeRoute && (
              <Button
                size="sm"
                variant="default"
                onClick={onChangeRoute}
                disabled={isRecalculating}
                className="flex-1"
                data-testid="button-change-route"
              >
                <Route className="w-4 h-4 mr-2" />
                Modifier
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RouteInfo;
