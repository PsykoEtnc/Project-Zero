import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  FastForward, 
  Clock,
  MapPin,
  AlertTriangle
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Alert, Mission, PositionHistory } from "@shared/schema";
import { VEHICLE_TYPES } from "@shared/schema";

interface MissionReplayProps {
  mission: Mission;
  alerts: Alert[];
  onPositionUpdate: (positions: Map<string, { lat: number; lng: number; heading: number }>) => void;
  onClose: () => void;
}

export function MissionReplay({ mission, alerts, onPositionUpdate, onClose }: MissionReplayProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const { data: positionHistory = [], isLoading } = useQuery<PositionHistory[]>({
    queryKey: ['/api/position-history', mission.id],
  });

  const timeRange = useMemo(() => {
    if (positionHistory.length === 0) return { start: 0, end: 0 };
    
    const timestamps = positionHistory
      .map(p => p.timestamp ? new Date(p.timestamp).getTime() : 0)
      .filter(t => t > 0);
    
    if (timestamps.length === 0) return { start: 0, end: 0 };
    
    return {
      start: Math.min(...timestamps),
      end: Math.max(...timestamps),
    };
  }, [positionHistory]);

  const duration = timeRange.end - timeRange.start;

  const getPositionsAtTime = useCallback((targetTime: number) => {
    const positions = new Map<string, { lat: number; lng: number; heading: number }>();
    const absoluteTime = timeRange.start + targetTime;

    const vehicleIds = Array.from(new Set(positionHistory.map(p => p.vehicleId).filter((v): v is string => v !== null)));

    for (const vehicleId of vehicleIds) {
      if (!vehicleId) continue;
      
      const vehiclePositions = positionHistory
        .filter(p => p.vehicleId === vehicleId && p.timestamp)
        .sort((a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime());

      let closest = vehiclePositions[0];
      for (const pos of vehiclePositions) {
        const posTime = new Date(pos.timestamp!).getTime();
        if (posTime <= absoluteTime) {
          closest = pos;
        } else {
          break;
        }
      }

      if (closest) {
        positions.set(vehicleId, {
          lat: closest.latitude,
          lng: closest.longitude,
          heading: closest.heading ?? 0,
        });
      }
    }

    return positions;
  }, [positionHistory, timeRange.start]);

  const getAlertsAtTime = useCallback((targetTime: number) => {
    const absoluteTime = timeRange.start + targetTime;
    
    return alerts.filter(alert => {
      if (!alert.createdAt) return false;
      const alertTime = new Date(alert.createdAt).getTime();
      return alertTime <= absoluteTime;
    });
  }, [alerts, timeRange.start]);

  useEffect(() => {
    const positions = getPositionsAtTime(currentTime);
    onPositionUpdate(positions);
  }, [currentTime, getPositionsAtTime, onPositionUpdate]);

  useEffect(() => {
    if (!isPlaying || duration === 0) return;

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const next = prev + (100 * playbackSpeed);
        if (next >= duration) {
          setIsPlaying(false);
          return duration;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, duration, playbackSpeed]);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h${minutes.toString().padStart(2, '0')}m${seconds.toString().padStart(2, '0')}s`;
    }
    return `${minutes}m${seconds.toString().padStart(2, '0')}s`;
  };

  const formatAbsoluteTime = (ms: number) => {
    const date = new Date(timeRange.start + ms);
    return format(date, "HH:mm:ss", { locale: fr });
  };

  const visibleAlerts = getAlertsAtTime(currentTime);

  if (isLoading) {
    return (
      <Card className="bg-card/95 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 animate-spin" />
            Chargement de l'historique...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (positionHistory.length === 0) {
    return (
      <Card className="bg-card/95 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Replay Mission
            </span>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-replay">
              Fermer
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground text-sm">
            Aucun historique de positions disponible pour cette mission.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/95 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Replay Mission
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {positionHistory.length} positions
            </Badge>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-replay">
              Fermer
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setCurrentTime(0)}
            data-testid="button-replay-start"
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          
          <Button 
            variant="default" 
            size="icon"
            onClick={() => setIsPlaying(!isPlaying)}
            data-testid="button-replay-toggle"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setCurrentTime(duration)}
            data-testid="button-replay-end"
          >
            <SkipForward className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-1 ml-2">
            <FastForward className="w-3 h-3 text-muted-foreground" />
            <select 
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="bg-transparent text-xs border-none focus:ring-0"
              data-testid="select-playback-speed"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={5}>5x</option>
              <option value={10}>10x</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 1}
            step={1000}
            onValueChange={([value]) => setCurrentTime(value)}
            className="cursor-pointer"
            data-testid="slider-replay-timeline"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatAbsoluteTime(0)}</span>
            <span className="font-mono">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>
            <span>{formatAbsoluteTime(duration)}</span>
          </div>
        </div>

        {visibleAlerts.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Alertes actives ({visibleAlerts.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {visibleAlerts.slice(-5).map(alert => (
                <Badge 
                  key={alert.id} 
                  variant="outline" 
                  className="text-xs"
                >
                  <MapPin className="w-2 h-2 mr-1" />
                  {alert.type}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
