import { useState, useEffect, useCallback } from "react";
import { useRole } from "@/contexts/RoleContext";
import { TacticalMap } from "@/components/TacticalMap";
import { TopBar } from "@/components/TopBar";
import { AlertPanel } from "@/components/AlertPanel";
import { VehicleStatus } from "@/components/VehicleStatus";
import { RouteInfo } from "@/components/RouteInfo";
import { QuickAlertCreator } from "@/components/QuickAlertCreator";
import { CameraAnalysis, type AnalysisResult } from "@/components/CameraAnalysis";
import { PCMessageSender } from "@/components/PCMessageSender";
import { MessageNotification } from "@/components/MessageNotification";
import { BriefingView } from "@/components/BriefingView";
import { DebriefingView } from "@/components/DebriefingView";
import { WaypointManager } from "@/components/WaypointManager";
import { AzimuthNavigation } from "@/components/AzimuthNavigation";
import { MissionReplay } from "@/components/MissionReplay";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AlertType, Mission, Waypoint, RouteChange, ConnectionLog } from "@shared/schema";
import { Map as MapIcon, AlertTriangle, FileText, Radio, Users, Navigation, Play } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function Dashboard() {
  const { currentRole, isPC, canSeeFullMap, setCurrentRole } = useRole();
  const { toast } = useToast();
  const [isStealthMode, setIsStealthMode] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedWaypoint, setSelectedWaypoint] = useState<Waypoint | null>(null);
  const [activeTab, setActiveTab] = useState("map");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [replayPositions, setReplayPositions] = useState<Map<string, { lat: number; lng: number; heading: number }>>(new Map());
  const [clickedPosition, setClickedPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isPlacingWaypoint, setIsPlacingWaypoint] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : false
  );

  // WebSocket connection
  const {
    isConnected,
    vehicles,
    alerts,
    messages,
    route,
    updatePosition,
    toggleStealthMode,
    createAlert,
    validateAlert,
    dismissAlert,
    sendPcMessage,
    markMessageAsRead,
    recalculateRoute,
  } = useWebSocket(currentRole);

  // Geolocation
  const { latitude, longitude, heading, speed, hasGPS, gpsLostDuration, simulatePosition } = useGeolocation({
    updateInterval: 3000,
    onPositionChange: useCallback((lat: number, lng: number, h: number, s: number) => {
      // Only send valid coordinates
      if (!isStealthMode && currentRole && currentRole !== "PC" && 
          Number.isFinite(lat) && Number.isFinite(lng)) {
        updatePosition(lat, lng, h, s);
      }
    }, [isStealthMode, currentRole, updatePosition]),
  });
  
  // Auto-simulate position in development when no GPS is available
  useEffect(() => {
    if (!hasGPS && currentRole && currentRole !== "PC") {
      // Find the current vehicle and use its initial position for simulation
      const currentVehicle = vehicles.find(v => v.id === currentRole);
      if (currentVehicle && currentVehicle.latitude && currentVehicle.longitude) {
        // Small random movement for demo purposes
        const jitter = () => (Math.random() - 0.5) * 0.001; // ~100m jitter
        const interval = setInterval(() => {
          if (!isStealthMode) {
            const newLat = currentVehicle.latitude + jitter();
            const newLng = currentVehicle.longitude + jitter();
            simulatePosition(newLat, newLng, Math.random() * 360, Math.random() * 30);
          }
        }, 5000);
        return () => clearInterval(interval);
      }
    }
  }, [hasGPS, currentRole, vehicles, isStealthMode, simulatePosition]);

  // Fetch mission data
  const { data: mission, isLoading: missionLoading } = useQuery<Mission>({
    queryKey: ["/api/mission/current"],
  });

  // Fetch danger zones (stored as waypoints)
  const { data: waypoints = [] } = useQuery<Waypoint[]>({
    queryKey: ["/api/waypoints"],
  });

  // Fetch route changes (for debriefing)
  const { data: routeChanges = [] } = useQuery<RouteChange[]>({
    queryKey: ["/api/route-changes"],
    enabled: isPC,
  });

  // Fetch connection logs (for debriefing)
  const { data: connectionLogs = [] } = useQuery<ConnectionLog[]>({
    queryKey: ["/api/connection-logs"],
    enabled: isPC,
  });

  // Track viewport changes to render the appropriate layout and avoid Leaflet sizing issues
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleChange = (event: MediaQueryListEvent) => setIsLargeScreen(event.matches);

    setIsLargeScreen(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Handle stealth mode toggle
  const handleToggleStealth = () => {
    const newStealthMode = !isStealthMode;
    setIsStealthMode(newStealthMode);
    toggleStealthMode(newStealthMode);
    toast({
      title: newStealthMode ? "Mode furtif activé" : "Mode furtif désactivé",
      description: newStealthMode 
        ? "Votre position n'est plus diffusée" 
        : "Votre position est à nouveau visible",
    });
  };

  // Handle emergency wipe
  const handleEmergencyWipe = () => {
    // Clear local storage
    localStorage.clear();
    // Reset role
    setCurrentRole(null as any);
    toast({
      title: "Effacement d'urgence",
      description: "Toutes les données locales ont été supprimées",
      variant: "destructive",
    });
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("acting_current_role");
    setCurrentRole(null as any);
  };

  // Handle alert creation
  const handleCreateAlert = async (type: AlertType, imageBase64?: string) => {
    if (latitude && longitude) {
      createAlert(type, latitude, longitude, undefined, imageBase64);
      toast({
        title: "Alerte envoyée",
        description: "Le PC a été notifié de votre signalement",
      });
    } else {
      toast({
        title: "Erreur",
        description: "Position GPS requise pour créer une alerte",
        variant: "destructive",
      });
    }
  };

  // Handle image analysis
  const handleAnalyzeImage = async (imageBase64: string): Promise<AnalysisResult> => {
    try {
      const response = await apiRequest("POST", "/api/analyze-image", { image: imageBase64 });
      const result = await response.json();
      return result as AnalysisResult;
    } catch (error) {
      throw error;
    }
  };

  // Handle sending analysis to PC
  const handleSendToPC = async (imageBase64: string, analysis: AnalysisResult) => {
    if (latitude && longitude) {
      createAlert("OTHER", latitude, longitude, analysis.description, imageBase64);
    }
  };

  // Handle PC message sending
  const handleSendMessage = async (content: string, targetVehicleId: string | null) => {
    sendPcMessage(content, targetVehicleId);
    toast({
      title: "Message envoyé",
      description: targetVehicleId ? `Message envoyé à ${targetVehicleId}` : "Message diffusé à toutes les unités",
    });
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (!isPC && !isPlacingWaypoint) return;

    setClickedPosition({ lat, lng });
    setIsPlacingWaypoint(false);
  };

  const handleStartWaypointPlacement = () => {
    setIsPlacingWaypoint(true);
    setClickedPosition(null);

    if (!isLargeScreen) {
      setActiveTab("map");
    }
  };

  // Calculate pending alerts count
  const pendingAlertsCount = alerts.filter(a => a.status === "PENDING").length;

  // Calculate route info
  const routeDistanceKm = 45.2; // TODO: Calculate from actual route
  const routeEtaMinutes = 65; // TODO: Calculate from actual route

  // Extraction point (demo)
  const extractionPoint = mission ? {
    lat: mission.extractionPointLat,
    lng: mission.extractionPointLng,
  } : { lat: 17.8, lng: -3.5 };

  // Demo zones
  const zones = [
    { id: "1", name: "Zone de départ", code: "ALPHA", centerLat: 17.4, centerLng: -4.2, radiusKm: 5 },
    { id: "2", name: "Zone intermédiaire", code: "BRAVO", centerLat: 17.6, centerLng: -3.8, radiusKm: 5 },
    { id: "3", name: "Zone d'extraction", code: "CHARLIE", centerLat: 17.8, centerLng: -3.5, radiusKm: 5 },
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      <TopBar
        isConnected={isConnected}
        hasGPS={hasGPS}
        isStealthMode={isStealthMode}
        onToggleStealth={handleToggleStealth}
        onEmergencyWipe={handleEmergencyWipe}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onLogout={handleLogout}
        pendingAlertsCount={pendingAlertsCount}
      />

      {/* Message notifications */}
      <MessageNotification messages={messages} onMarkAsRead={markMessageAsRead} />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar - PC view only */}
        {isPC && (
          <aside className="hidden lg:flex flex-col w-80 border-r border-border bg-sidebar overflow-hidden">
            <Tabs defaultValue="ops" className="flex-1 flex flex-col">
              <div className="p-3 border-b border-sidebar-border">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="ops" data-testid="tab-desktop-ops">
                    <Navigation className="w-4 h-4 mr-1" />
                    Ops
                  </TabsTrigger>
                  <TabsTrigger value="debrief" data-testid="tab-desktop-debrief">
                    <Radio className="w-4 h-4 mr-1" />
                    Débrief
                  </TabsTrigger>
                  <TabsTrigger 
                    value="replay" 
                    data-testid="tab-desktop-replay"
                    onClick={() => setIsReplayMode(true)}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Replay
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="ops" className="flex-1 overflow-auto p-4 space-y-4 m-0">
                <VehicleStatus
                  vehicles={vehicles}
                  selectedVehicleId={selectedVehicleId}
                  onSelectVehicle={setSelectedVehicleId}
                />
                
                <RouteInfo
                  distanceKm={routeDistanceKm}
                  etaMinutes={routeEtaMinutes}
                  isOffRoute={false}
                  onRecalculate={recalculateRoute}
                />

                <PCMessageSender onSendMessage={handleSendMessage} />
                
                <BriefingView mission={mission ?? null} isLoading={missionLoading} />
              </TabsContent>
              
              <TabsContent value="debrief" className="flex-1 overflow-auto p-4 m-0">
                <DebriefingView
                  mission={mission ?? null}
                  alerts={alerts}
                  connectionLogs={connectionLogs}
                  routeChanges={routeChanges}
                  isLoading={missionLoading}
                />
              </TabsContent>
              <TabsContent value="replay" className="flex-1 overflow-auto p-4 m-0">
                {mission && mission.status === "COMPLETED" ? (
                  <MissionReplay
                    mission={mission}
                    alerts={alerts}
                    onPositionUpdate={(positions) => setReplayPositions(positions)}
                    onClose={() => {
                      setIsReplayMode(false);
                      setReplayPositions(new Map());
                    }}
                  />
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Le replay n'est disponible que pour les missions terminées</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </aside>
        )}

        {/* Main content area */}
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Map and tabs for mobile */}
          {!isLargeScreen && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="mx-4 mt-2 grid" style={{ gridTemplateColumns: isPC ? 'repeat(6, 1fr)' : 'repeat(4, 1fr)' }}>
                  <TabsTrigger value="map" data-testid="tab-map">
                    <MapIcon className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="alerts" data-testid="tab-alerts">
                    <AlertTriangle className="w-4 h-4" />
                    {pendingAlertsCount > 0 && (
                      <span className="ml-1 text-xs">{pendingAlertsCount}</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="status" data-testid="tab-status">
                    <Users className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="danger-zones" data-testid="tab-waypoints">
                    <Navigation className="w-4 h-4" />
                  </TabsTrigger>
                  {isPC && (
                    <>
                      <TabsTrigger value="mission" data-testid="tab-mission">
                        <FileText className="w-4 h-4" />
                      </TabsTrigger>
                      <TabsTrigger
                        value="replay"
                        data-testid="tab-replay"
                        onClick={() => setIsReplayMode(true)}
                      >
                        <Play className="w-4 h-4" />
                      </TabsTrigger>
                    </>
                  )}
                </TabsList>

                <TabsContent value="map" className="flex-1 m-0 p-0">
                  <TacticalMap
                    vehicles={vehicles}
                    alerts={alerts}
                    zones={zones}
                    waypoints={waypoints}
                    route={route}
                    extractionPoint={extractionPoint}
                    selectedVehicleId={selectedVehicleId}
                    onWaypointClick={setSelectedWaypoint}
                    onMapClick={handleMapClick}
                    onStartWaypointPlacement={handleStartWaypointPlacement}
                    clickedPosition={clickedPosition}
                    isPlacingWaypoint={isPlacingWaypoint}
                    replayPositions={isReplayMode ? replayPositions : undefined}
                    className="w-full h-full"
                  />
                </TabsContent>

                <TabsContent value="alerts" className="flex-1 m-0 p-4 overflow-auto">
                  <AlertPanel
                    alerts={alerts}
                    onValidateAlert={validateAlert}
                    onDismissAlert={dismissAlert}
                    className="h-full"
                  />
                </TabsContent>

                <TabsContent value="status" className="flex-1 m-0 p-4 overflow-auto">
                  <div className="space-y-4">
                    <VehicleStatus
                      vehicles={vehicles}
                      selectedVehicleId={selectedVehicleId}
                      onSelectVehicle={setSelectedVehicleId}
                    />
                    {isPC && <PCMessageSender onSendMessage={handleSendMessage} />}
                  </div>
                </TabsContent>

                <TabsContent value="danger-zones" className="flex-1 m-0 p-4 overflow-auto">
                  {isPC ? (
                    <WaypointManager
                      onSelectWaypoint={(wp) => setSelectedWaypoint(wp)}
                      selectedWaypoint={selectedWaypoint}
                      clickedPosition={clickedPosition}
                      enableMapPlacement={isPC || isPlacingWaypoint}
                      onClearClickedPosition={() => setClickedPosition(null)}
                    />
                  ) : (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm">Zones de danger</h3>
                      {waypoints.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucune zone de danger définie</p>
                      ) : (
                        <div className="space-y-2">
                          {waypoints.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)).map((wp, idx) => (
                            <div
                              key={wp.id}
                              className="flex items-center gap-3 p-3 rounded-md bg-muted/50"
                              onClick={() => setSelectedWaypoint(wp)}
                            >
                              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                                {(wp.orderIndex ?? idx) + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{wp.code} - {wp.name}</p>
                                {wp.description && (
                                  <p className="text-xs text-muted-foreground truncate">{wp.description}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="sr-only">
                        <WaypointManager
                          onSelectWaypoint={(wp) => setSelectedWaypoint(wp)}
                          selectedWaypoint={selectedWaypoint}
                          clickedPosition={clickedPosition}
                          enableMapPlacement={isPlacingWaypoint}
                          onClearClickedPosition={() => setClickedPosition(null)}
                        />
                      </div>
                    </div>
                  )}
                </TabsContent>

                {isPC && (
                  <>
                    <TabsContent value="mission" className="flex-1 m-0 p-4 overflow-auto">
                      <div className="space-y-4">
                        <BriefingView mission={mission ?? null} isLoading={missionLoading} />
                        <DebriefingView
                          mission={mission ?? null}
                          alerts={alerts}
                          connectionLogs={connectionLogs}
                          routeChanges={routeChanges}
                          isLoading={missionLoading}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="replay" className="flex-1 m-0 p-4 overflow-auto">
                      {mission && mission.status === "COMPLETED" ? (
                        <MissionReplay
                          mission={mission}
                          alerts={alerts}
                          onPositionUpdate={(positions) => setReplayPositions(positions)}
                          onClose={() => {
                            setIsReplayMode(false);
                            setReplayPositions(new Map());
                          }}
                        />
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>Le replay n'est disponible que pour les missions terminées</p>
                        </div>
                      )}
                    </TabsContent>
                  </>
                )}
              </Tabs>
            </div>
          )}

          {/* Desktop layout */}
          {isLargeScreen && (
            <div className="flex flex-1 overflow-hidden">
              {/* Map */}
              <div className="flex-1 relative">
                <TacticalMap
                  vehicles={vehicles}
                  alerts={alerts}
                  zones={zones}
                  waypoints={waypoints}
                  route={route}
                  extractionPoint={extractionPoint}
                  selectedVehicleId={selectedVehicleId}
                  onWaypointClick={setSelectedWaypoint}
                  onMapClick={handleMapClick}
                  onStartWaypointPlacement={handleStartWaypointPlacement}
                  clickedPosition={clickedPosition}
                  isPlacingWaypoint={isPlacingWaypoint}
                  replayPositions={isReplayMode ? replayPositions : undefined}
                  className="w-full h-full"
                />
              </div>

              {/* Right panel - Alerts and Waypoints (PC only) */}
              {isPC && (
                <aside className="w-80 border-l border-border bg-sidebar overflow-hidden flex flex-col">
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-hidden">
                      <AlertPanel
                        alerts={alerts}
                        onValidateAlert={validateAlert}
                        onDismissAlert={dismissAlert}
                        className="h-full border-0 rounded-none"
                      />
                    </div>
                    <div className="h-80 border-t border-border overflow-hidden">
                      <WaypointManager
                        onSelectWaypoint={(wp) => setSelectedWaypoint(wp)}
                        selectedWaypoint={selectedWaypoint}
                        clickedPosition={clickedPosition}
                        enableMapPlacement={isPC || isPlacingWaypoint}
                        onClearClickedPosition={() => setClickedPosition(null)}
                      />
                    </div>
                  </div>
                </aside>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Floating action buttons for non-PC users */}
      {!isPC && (
        <>
          <QuickAlertCreator onCreateAlert={handleCreateAlert} />
          <CameraAnalysis onAnalyze={handleAnalyzeImage} onSendToPC={handleSendToPC} />
          
          {/* Azimuth navigation - shows when GPS is lost for 30+ seconds */}
          <div className="fixed bottom-24 left-4 right-4 z-40 lg:left-auto lg:right-4 lg:w-80">
            <AzimuthNavigation
              currentLat={latitude}
              currentLng={longitude}
              lastKnownLat={latitude}
              lastKnownLng={longitude}
              lastKnownHeading={heading}
              waypoints={waypoints}
              gpsLostDuration={gpsLostDuration}
              hasGPS={hasGPS}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;
