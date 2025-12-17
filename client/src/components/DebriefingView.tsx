import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Mission, Alert, ConnectionLog, RouteChange } from "@shared/schema";
import { FileText, MapPin, AlertTriangle, WifiOff, Clock, Route, Download, RefreshCw, GitBranch } from "lucide-react";
import { format, formatDuration, intervalToDuration } from "date-fns";
import { fr } from "date-fns/locale";

interface DebriefingViewProps {
  mission: Mission | null;
  alerts: Alert[];
  connectionLogs: ConnectionLog[];
  routeChanges?: RouteChange[];
  totalDistanceKm?: number;
  isLoading?: boolean;
  onGenerateDebrief?: () => void;
  onExportPdf?: () => void;
  className?: string;
}

export function DebriefingView({
  mission,
  alerts,
  connectionLogs,
  routeChanges = [],
  totalDistanceKm = 0,
  isLoading,
  onGenerateDebrief,
  onExportPdf,
  className = "",
}: DebriefingViewProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!mission || mission.status !== "COMPLETED") {
    return (
      <Card className={className}>
        <CardContent className="py-16 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            {mission ? "La mission n'est pas encore terminée" : "Aucune mission à débriefer"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const validatedAlerts = alerts.filter(a => a.status === "VALIDATED");
  const dismissedAlerts = alerts.filter(a => a.status === "DISMISSED");
  const disconnectionEvents = connectionLogs.filter(l => l.eventType === "DISCONNECTED");

  const missionDuration = mission.startedAt && mission.completedAt
    ? intervalToDuration({
        start: new Date(mission.startedAt),
        end: new Date(mission.completedAt),
      })
    : null;

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg font-semibold uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Débriefing
          </CardTitle>
          <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
            Mission terminée
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[calc(100vh-280px)] pr-4">
          <div className="space-y-6">
            {/* Statistics */}
            <div>
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                Statistiques de mission
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={<Clock className="w-5 h-5" />}
                  label="Durée"
                  value={missionDuration 
                    ? formatDuration(missionDuration, { locale: fr, format: ['hours', 'minutes'] })
                    : "N/A"
                  }
                  color="blue"
                />
                <StatCard
                  icon={<Route className="w-5 h-5" />}
                  label="Distance"
                  value={`${totalDistanceKm.toFixed(1)} km`}
                  color="green"
                />
                <StatCard
                  icon={<AlertTriangle className="w-5 h-5" />}
                  label="Alertes validées"
                  value={validatedAlerts.length.toString()}
                  color="red"
                />
                <StatCard
                  icon={<WifiOff className="w-5 h-5" />}
                  label="Pertes connexion"
                  value={disconnectionEvents.length.toString()}
                  color="yellow"
                />
                <StatCard
                  icon={<GitBranch className="w-5 h-5" />}
                  label="Changements itin."
                  value={routeChanges.length.toString()}
                  color="blue"
                />
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                Chronologie des événements
              </h3>
              <div className="relative pl-6 border-l-2 border-border space-y-4">
                {mission.startedAt && (
                  <TimelineEvent
                    time={format(new Date(mission.startedAt), "HH:mm", { locale: fr })}
                    title="Départ mission"
                    type="start"
                  />
                )}
                {validatedAlerts.map((alert, idx) => (
                  <TimelineEvent
                    key={alert.id}
                    time={alert.createdAt ? format(new Date(alert.createdAt), "HH:mm", { locale: fr }) : ""}
                    title={`Alerte: ${alert.type}`}
                    description={alert.description ?? undefined}
                    type="alert"
                  />
                ))}
                {disconnectionEvents.map((log, idx) => (
                  <TimelineEvent
                    key={log.id}
                    time={log.timestamp ? format(new Date(log.timestamp), "HH:mm", { locale: fr }) : ""}
                    title={`Perte connexion: ${log.vehicleId}`}
                    type="disconnect"
                  />
                ))}
                {routeChanges.map((change) => (
                  <TimelineEvent
                    key={change.id}
                    time={change.createdAt ? format(new Date(change.createdAt), "HH:mm", { locale: fr }) : ""}
                    title={`Changement itinéraire`}
                    description={`${change.triggeredByVehicleId ?? "PC"}: ${change.reason}`}
                    type="route"
                  />
                ))}
                {mission.completedAt && (
                  <TimelineEvent
                    time={format(new Date(mission.completedAt), "HH:mm", { locale: fr })}
                    title="Fin mission - Extraction réussie"
                    type="end"
                  />
                )}
              </div>
            </div>

            {/* AI Generated Summary */}
            {mission.debriefingContent && (
              <div>
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                  Synthèse IA
                </h3>
                <div className="p-4 bg-card border border-card-border rounded-md">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {mission.debriefingContent.split('\n').map((paragraph, idx) => (
                      <p key={idx} className="text-sm leading-relaxed mb-2">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Connection loss zones */}
            {disconnectionEvents.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                  Zones de perte de connexion
                </h3>
                <div className="space-y-2">
                  {disconnectionEvents.map((log) => (
                    <div key={log.id} className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                      <div className="flex items-center gap-2 text-sm">
                        <WifiOff className="w-4 h-4 text-yellow-600" />
                        <span className="font-medium">{log.vehicleId}</span>
                      </div>
                      {log.latitude && log.longitude && (
                        <p className="text-xs text-muted-foreground font-mono mt-1">
                          Position: {log.latitude.toFixed(6)}, {log.longitude.toFixed(6)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Route change history */}
            {routeChanges.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                  Historique des changements d'itinéraire
                </h3>
                <div className="space-y-2">
                  {routeChanges.map((change) => (
                    <div key={change.id} className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">{change.triggeredByVehicleId ?? "PC"}</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                          {change.createdAt ? format(new Date(change.createdAt), "HH:mm", { locale: fr }) : ""}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{change.reason}</p>
                      {change.justification && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {change.justification}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-2 mt-6 pt-4 border-t border-border">
          {onGenerateDebrief && (
            <Button
              variant="outline"
              onClick={onGenerateDebrief}
              className="flex-1"
              data-testid="button-generate-debrief"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Régénérer
            </Button>
          )}
          {onExportPdf && (
            <Button
              onClick={onExportPdf}
              className="flex-1"
              data-testid="button-export-pdf"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter PDF
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "blue" | "green" | "red" | "yellow";
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-600",
    green: "bg-green-500/10 text-green-600",
    red: "bg-red-500/10 text-red-600",
    yellow: "bg-yellow-500/10 text-yellow-600",
  };

  return (
    <div className={`p-4 rounded-md ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

interface TimelineEventProps {
  time: string;
  title: string;
  description?: string;
  type: "start" | "end" | "alert" | "disconnect" | "route";
}

function TimelineEvent({ time, title, description, type }: TimelineEventProps) {
  const dotColors = {
    start: "bg-green-500",
    end: "bg-green-500",
    alert: "bg-red-500",
    disconnect: "bg-yellow-500",
    route: "bg-blue-500",
  };

  return (
    <div className="relative">
      <div className={`absolute -left-[25px] top-1 w-3 h-3 rounded-full ${dotColors[type]}`} />
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono">{time}</span>
          <span className="font-medium text-sm">{title}</span>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}

export default DebriefingView;
