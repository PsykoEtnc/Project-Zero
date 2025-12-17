import { useState, useEffect, useCallback } from "react";
import { useRole } from "@/contexts/RoleContext";
import { TacticalMap } from "@/components/TacticalMap";
import { TopBar } from "@/components/TopBar";
import { AlertPanel } from "@/components/AlertPanel";
import { VehicleStatus } from "@/components/VehicleStatus";
import { RouteInfo } from "@/components/RouteInfo";
import { QuickAlertCreator } from "@/components/QuickAlertCreator";
import { CameraAnalysis } from "@/components/CameraAnalysis";
import { PCMessageSender } from "@/components/PCMessageSender";
import { MessageNotification } from "@/components/MessageNotification";
import { BriefingView } from "@/components/BriefingView";
import { DebriefingView } from "@/components/DebriefingView";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AlertType, Mission } from "@shared/schema";
import { Map, AlertTriangle, FileText, Radio, Users } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function Dashboard() {
  const { currentRole, isPC, canSeeFullMap, setCurrentRole } = useRole();
  const { toast } = useToast();
  const [isStealthMode, setIsStealthMode] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("map");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
  const { latitude, longitude, heading, speed, hasGPS, simulatePosition } = useGeolocation({
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
  const handleAnalyzeImage = async (imageBase64: string) => {
    try {
      const response = await apiRequest("POST", "/api/analyze-image", { image: imageBase64 });
      return response;
    } catch (error) {
      throw error;
    }
  };

  // Handle sending analysis to PC
  const handleSendToPC = async (imageBase64: string, analysis: any) => {
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
          <aside className="hidden lg:flex flex-col w-72 border-r border-border bg-sidebar overflow-hidden">
            <div className="p-4 border-b border-sidebar-border">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-sidebar-foreground">
                Poste de Commandement
              </h2>
            </div>
            
            <div className="flex-1 overflow-auto p-4 space-y-4">
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
            </div>
          </aside>
        )}

        {/* Main content area */}
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Map and tabs for mobile */}
          <div className="flex-1 flex flex-col overflow-hidden lg:hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="mx-4 mt-2 grid grid-cols-4">
                <TabsTrigger value="map" data-testid="tab-map">
                  <Map className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="alerts" data-testid="tab-alerts">
                  <AlertTriangle className="w-4 h-4" />
                  {pendingAlertsCount > 0 && (
                    <span className="ml-1 text-xs">{pendingAlertsCount}</span>
                  )}
                </TabsTrigger>
                {isPC && (
                  <>
                    <TabsTrigger value="units" data-testid="tab-units">
                      <Users className="w-4 h-4" />
                    </TabsTrigger>
                    <TabsTrigger value="mission" data-testid="tab-mission">
                      <FileText className="w-4 h-4" />
                    </TabsTrigger>
                  </>
                )}
              </TabsList>

              <TabsContent value="map" className="flex-1 m-0 p-0">
                <TacticalMap
                  vehicles={vehicles}
                  alerts={alerts}
                  zones={zones}
                  route={route}
                  extractionPoint={extractionPoint}
                  selectedVehicleId={selectedVehicleId}
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

              {isPC && (
                <>
                  <TabsContent value="units" className="flex-1 m-0 p-4 overflow-auto">
                    <div className="space-y-4">
                      <VehicleStatus
                        vehicles={vehicles}
                        selectedVehicleId={selectedVehicleId}
                        onSelectVehicle={setSelectedVehicleId}
                      />
                      <PCMessageSender onSendMessage={handleSendMessage} />
                    </div>
                  </TabsContent>

                  <TabsContent value="mission" className="flex-1 m-0 p-4 overflow-auto">
                    <BriefingView mission={mission ?? null} isLoading={missionLoading} />
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>

          {/* Desktop layout */}
          <div className="hidden lg:flex flex-1 overflow-hidden">
            {/* Map */}
            <div className="flex-1 relative">
              <TacticalMap
                vehicles={vehicles}
                alerts={alerts}
                zones={zones}
                route={route}
                extractionPoint={extractionPoint}
                selectedVehicleId={selectedVehicleId}
                className="w-full h-full"
              />
            </div>

            {/* Right panel - Alerts (PC only) */}
            {isPC && (
              <aside className="w-80 border-l border-border bg-sidebar overflow-hidden flex flex-col">
                <AlertPanel
                  alerts={alerts}
                  onValidateAlert={validateAlert}
                  onDismissAlert={dismissAlert}
                  className="flex-1 border-0 rounded-none"
                />
              </aside>
            )}
          </div>
        </main>
      </div>

      {/* Floating action buttons for non-PC users */}
      {!isPC && (
        <>
          <QuickAlertCreator onCreateAlert={handleCreateAlert} />
          <CameraAnalysis onAnalyze={handleAnalyzeImage} onSendToPC={handleSendToPC} />
        </>
      )}
    </div>
  );
}

export default Dashboard;
