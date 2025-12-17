import { useRole } from "@/contexts/RoleContext";
import { VEHICLE_TYPES, type VehicleType } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, Plane, Radio, Shield } from "lucide-react";

const roleIcons: Record<VehicleType, typeof Truck> = {
  CONVOY_1: Truck,
  CONVOY_2: Truck,
  CONVOY_3: Truck,
  CONVOY_4: Truck,
  RECO: Shield,
  A400M: Plane,
  PC: Radio,
};

const roleDescriptions: Record<VehicleType, string> = {
  CONVOY_1: "Véhicule PPLOG du convoi",
  CONVOY_2: "Véhicule PPLOG du convoi",
  CONVOY_3: "Véhicule PPLOG du convoi",
  CONVOY_4: "Véhicule PPLOG du convoi",
  RECO: "Véhicule de reconnaissance avancée",
  A400M: "Aéronef de surveillance",
  PC: "Poste de Commandement - Vue globale",
};

export function RoleSelector() {
  const { setCurrentRole } = useRole();

  const handleRoleSelect = (role: VehicleType) => {
    setCurrentRole(role);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground uppercase mb-2" data-testid="text-app-title">
            ACTING
          </h1>
          <p className="text-muted-foreground text-lg">
            Assistant de Convoi Tactique Intelligent Nouvelle Génération
          </p>
        </div>

        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-lg font-semibold uppercase tracking-wide">
              Sélectionnez votre poste
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.keys(VEHICLE_TYPES) as VehicleType[]).map((role) => {
                const Icon = roleIcons[role];
                const vehicleInfo = VEHICLE_TYPES[role];
                const description = roleDescriptions[role];
                const isPC = role === "PC";
                const isAircraft = role === "A400M";

                return (
                  <Button
                    key={role}
                    variant={isPC ? "default" : "outline"}
                    className={`h-auto p-4 flex flex-col items-center gap-3 ${
                      isPC ? "col-span-1 sm:col-span-2 lg:col-span-1" : ""
                    } ${isAircraft ? "border-chart-2" : ""}`}
                    onClick={() => handleRoleSelect(role)}
                    data-testid={`button-role-${role.toLowerCase()}`}
                  >
                    <Icon className="w-8 h-8" />
                    <div className="text-center">
                      <div className="font-semibold text-sm">
                        {vehicleInfo.name}
                      </div>
                      <div className="text-xs opacity-70 mt-1">
                        {description}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>

            <div className="mt-6 p-4 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground text-center">
                Terminal pré-configuré - Aucune authentification requise
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
