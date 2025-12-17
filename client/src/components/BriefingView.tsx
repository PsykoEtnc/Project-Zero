import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Mission } from "@shared/schema";
import { FileText, MapPin, Target, Users, Clock, Play, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface BriefingViewProps {
  mission: Mission | null;
  isLoading?: boolean;
  onStartMission?: () => void;
  onRefreshBriefing?: () => void;
  className?: string;
}

export function BriefingView({
  mission,
  isLoading,
  onStartMission,
  onRefreshBriefing,
  className = "",
}: BriefingViewProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!mission) {
    return (
      <Card className={className}>
        <CardContent className="py-16 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Aucune mission active</p>
        </CardContent>
      </Card>
    );
  }

  const statusColors = {
    BRIEFING: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    IN_PROGRESS: "bg-green-500/10 text-green-700 dark:text-green-400",
    COMPLETED: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
    ABORTED: "bg-red-500/10 text-red-700 dark:text-red-400",
  };

  const statusLabels = {
    BRIEFING: "Briefing",
    IN_PROGRESS: "En cours",
    COMPLETED: "Terminée",
    ABORTED: "Annulée",
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg font-semibold uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Briefing de mission
          </CardTitle>
          <Badge className={statusColors[mission.status as keyof typeof statusColors] || statusColors.BRIEFING}>
            {statusLabels[mission.status as keyof typeof statusLabels] || mission.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[calc(100vh-280px)] pr-4">
          <div className="space-y-6">
            {/* Mission info */}
            <div>
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
                Informations générales
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Mission:</span>
                  <span>{mission.name}</span>
                </div>
                {mission.createdAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Date:</span>
                    <span>{format(new Date(mission.createdAt), "PPPp", { locale: fr })}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Coordinates */}
            <div>
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
                Points de passage
              </h3>
              <div className="space-y-2">
                <div className="p-3 bg-muted rounded-md">
                  <div className="flex items-center gap-2 text-sm mb-1">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">Point de départ</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {mission.startPointLat.toFixed(6)}, {mission.startPointLng.toFixed(6)}
                  </p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-md border border-green-500/20">
                  <div className="flex items-center gap-2 text-sm mb-1">
                    <MapPin className="w-4 h-4 text-green-500" />
                    <span className="font-medium text-green-700 dark:text-green-400">Point d'extraction (A400M)</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {mission.extractionPointLat.toFixed(6)}, {mission.extractionPointLng.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>

            {/* Briefing content */}
            {mission.briefingContent && (
              <div>
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
                  Contenu du briefing
                </h3>
                <div className="p-4 bg-card border border-card-border rounded-md">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {mission.briefingContent.split('\n').map((paragraph, idx) => (
                      <p key={idx} className="text-sm leading-relaxed mb-2">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Units */}
            <div>
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
                Unités engagées
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-blue-500/10 rounded text-center">
                  <span className="text-xs text-muted-foreground">Convoi</span>
                  <p className="font-semibold text-blue-600">4 véhicules</p>
                </div>
                <div className="p-2 bg-green-500/10 rounded text-center">
                  <span className="text-xs text-muted-foreground">Reconnaissance</span>
                  <p className="font-semibold text-green-600">1 VBL</p>
                </div>
                <div className="p-2 bg-purple-500/10 rounded text-center">
                  <span className="text-xs text-muted-foreground">Aérien</span>
                  <p className="font-semibold text-purple-600">1 A400M</p>
                </div>
                <div className="p-2 bg-red-500/10 rounded text-center">
                  <span className="text-xs text-muted-foreground">Commandement</span>
                  <p className="font-semibold text-red-600">1 PC</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-2 mt-6 pt-4 border-t border-border">
          {onRefreshBriefing && (
            <Button
              variant="outline"
              onClick={onRefreshBriefing}
              className="flex-1"
              data-testid="button-refresh-briefing"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          )}
          {onStartMission && mission.status === "BRIEFING" && (
            <Button
              onClick={onStartMission}
              className="flex-1"
              data-testid="button-start-mission"
            >
              <Play className="w-4 h-4 mr-2" />
              Démarrer la mission
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default BriefingView;
