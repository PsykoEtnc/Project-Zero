import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Vehicle } from "@shared/schema";
import { VEHICLE_TYPES } from "@shared/schema";
import { Truck, Plane, Radio, Shield, Wifi, WifiOff, EyeOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const vehicleIcons: Record<string, typeof Truck> = {
  CONVOY_1: Truck,
  CONVOY_2: Truck,
  CONVOY_3: Truck,
  CONVOY_4: Truck,
  RECO: Shield,
  A400M: Plane,
  PC: Radio,
};

interface VehicleStatusProps {
  vehicles: Vehicle[];
  onSelectVehicle?: (vehicleId: string) => void;
  selectedVehicleId?: string | null;
  className?: string;
}

export function VehicleStatus({ 
  vehicles, 
  onSelectVehicle,
  selectedVehicleId,
  className = "" 
}: VehicleStatusProps) {
  const sortedVehicles = [...vehicles].sort((a, b) => {
    const order = ['RECO', 'CONVOY_1', 'CONVOY_2', 'CONVOY_3', 'CONVOY_4', 'A400M', 'PC'];
    return order.indexOf(a.type) - order.indexOf(b.type);
  });

  const connectedCount = vehicles.filter(v => v.isConnected).length;

  return (
    <Card className={`flex flex-col ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide">
            Unités
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            <Wifi className="w-3 h-3 mr-1" />
            {connectedCount}/{vehicles.length}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          <div className="space-y-2">
            {sortedVehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                isSelected={vehicle.id === selectedVehicleId}
                onSelect={onSelectVehicle}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface VehicleCardProps {
  vehicle: Vehicle;
  isSelected: boolean;
  onSelect?: (vehicleId: string) => void;
}

function VehicleCard({ vehicle, isSelected, onSelect }: VehicleCardProps) {
  const vehicleInfo = VEHICLE_TYPES[vehicle.type as keyof typeof VEHICLE_TYPES];
  const Icon = vehicleIcons[vehicle.type] || Truck;

  return (
    <div
      className={`p-3 rounded-md border cursor-pointer transition-colors hover-elevate ${
        isSelected 
          ? "border-primary bg-primary/5" 
          : "border-border bg-card"
      }`}
      onClick={() => onSelect?.(vehicle.id)}
      data-testid={`vehicle-card-${vehicle.id}`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-md ${
          vehicle.type === "RECO" ? "bg-green-500/10 text-green-600" :
          vehicle.type === "A400M" ? "bg-purple-500/10 text-purple-600" :
          vehicle.type === "PC" ? "bg-red-500/10 text-red-600" :
          "bg-blue-500/10 text-blue-600"
        }`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{vehicleInfo?.name || vehicle.name}</span>
            {vehicle.isStealthMode && (
              <EyeOff className="w-3 h-3 text-yellow-500" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {vehicle.isConnected ? (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <Wifi className="w-3 h-3" />
                En ligne
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-red-500">
                <WifiOff className="w-3 h-3" />
                Hors ligne
              </span>
            )}
            {vehicle.speed !== null && vehicle.speed !== undefined && vehicle.speed > 0 && (
              <span className="text-xs text-muted-foreground">
                {vehicle.speed.toFixed(0)} km/h
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-muted-foreground">
            {vehicle.lastUpdate && formatDistanceToNow(new Date(vehicle.lastUpdate), { 
              addSuffix: true, 
              locale: fr 
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VehicleStatus;
