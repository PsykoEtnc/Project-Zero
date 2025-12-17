import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRole } from "@/contexts/RoleContext";
import type { Alert } from "@shared/schema";
import { ALERT_TYPES, VEHICLE_TYPES } from "@shared/schema";
import { AlertTriangle, Check, X, Clock, MapPin, Camera } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface AlertPanelProps {
  alerts: Alert[];
  onValidateAlert?: (alertId: string) => void;
  onDismissAlert?: (alertId: string) => void;
  className?: string;
}

export function AlertPanel({ 
  alerts, 
  onValidateAlert, 
  onDismissAlert,
  className = "" 
}: AlertPanelProps) {
  const { isPC } = useRole();
  const [filter, setFilter] = useState<"all" | "pending" | "validated">("all");

  const filteredAlerts = alerts.filter(alert => {
    if (filter === "pending") return alert.status === "PENDING";
    if (filter === "validated") return alert.status === "VALIDATED";
    return true;
  }).sort((a, b) => {
    // Pending first, then by date
    if (a.status === "PENDING" && b.status !== "PENDING") return -1;
    if (b.status === "PENDING" && a.status !== "PENDING") return 1;
    return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
  });

  const pendingCount = alerts.filter(a => a.status === "PENDING").length;

  return (
    <Card className={`flex flex-col ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Alertes
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {pendingCount}
              </Badge>
            )}
          </CardTitle>
        </div>

        {isPC && (
          <div className="flex gap-1 mt-2">
            <Button
              size="sm"
              variant={filter === "all" ? "default" : "ghost"}
              onClick={() => setFilter("all")}
              className="text-xs"
              data-testid="button-filter-all"
            >
              Toutes
            </Button>
            <Button
              size="sm"
              variant={filter === "pending" ? "default" : "ghost"}
              onClick={() => setFilter("pending")}
              className="text-xs"
              data-testid="button-filter-pending"
            >
              En attente
            </Button>
            <Button
              size="sm"
              variant={filter === "validated" ? "default" : "ghost"}
              onClick={() => setFilter("validated")}
              className="text-xs"
              data-testid="button-filter-validated"
            >
              Validées
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune alerte</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  isPC={isPC}
                  onValidate={onValidateAlert}
                  onDismiss={onDismissAlert}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface AlertCardProps {
  alert: Alert;
  isPC: boolean;
  onValidate?: (alertId: string) => void;
  onDismiss?: (alertId: string) => void;
}

function AlertCard({ alert, isPC, onValidate, onDismiss }: AlertCardProps) {
  const alertType = ALERT_TYPES[alert.type as keyof typeof ALERT_TYPES];
  const sourceVehicle = alert.sourceVehicleId 
    ? VEHICLE_TYPES[alert.sourceVehicleId as keyof typeof VEHICLE_TYPES]
    : null;

  const statusColors = {
    PENDING: "bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400",
    VALIDATED: "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400",
    DISMISSED: "bg-gray-500/10 border-gray-500/30 text-gray-500",
  };

  const isPending = alert.status === "PENDING";

  return (
    <div 
      className={`p-3 rounded-md border ${statusColors[alert.status as keyof typeof statusColors] || statusColors.PENDING}`}
      data-testid={`alert-card-${alert.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium text-sm">{alertType?.name || alert.type}</span>
        </div>
        <Badge 
          variant="outline" 
          className={`text-xs ${isPending ? "animate-pulse" : ""}`}
        >
          {isPending && <Clock className="w-3 h-3 mr-1" />}
          {alert.status === "PENDING" ? "En attente" : 
           alert.status === "VALIDATED" ? "Validé" : "Rejeté"}
        </Badge>
      </div>

      {alert.description && (
        <p className="text-xs mt-2 opacity-80">{alert.description}</p>
      )}

      <div className="flex items-center gap-3 mt-2 text-xs opacity-70">
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span>{alert.latitude.toFixed(3)}, {alert.longitude.toFixed(3)}</span>
        </div>
        {sourceVehicle && (
          <span className="font-medium">{sourceVehicle.name}</span>
        )}
      </div>

      {alert.imageUrl && (
        <div className="flex items-center gap-1 mt-1 text-xs">
          <Camera className="w-3 h-3" />
          <span>Photo jointe</span>
        </div>
      )}

      {alert.aiAnalysis && (
        <div className="mt-2 p-2 bg-background/50 rounded text-xs">
          <span className="font-medium">Analyse IA: </span>
          {alert.aiAnalysis}
        </div>
      )}

      {alert.createdAt && (
        <p className="text-xs mt-2 opacity-50">
          {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true, locale: fr })}
        </p>
      )}

      {isPC && isPending && (
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            variant="default"
            className="flex-1 text-xs"
            onClick={() => onValidate?.(alert.id)}
            data-testid={`button-validate-${alert.id}`}
          >
            <Check className="w-3 h-3 mr-1" />
            Valider
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
            onClick={() => onDismiss?.(alert.id)}
            data-testid={`button-dismiss-${alert.id}`}
          >
            <X className="w-3 h-3 mr-1" />
            Rejeter
          </Button>
        </div>
      )}
    </div>
  );
}

export default AlertPanel;
