import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useRole } from "@/contexts/RoleContext";
import type { Waypoint, WaypointType } from "@shared/schema";
import { WAYPOINT_TYPES } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, MapPin, Plus, Trash2, Edit } from "lucide-react";

interface WaypointManagerProps {
  onSelectWaypoint?: (waypoint: Waypoint) => void;
  selectedWaypoint?: Waypoint | null;
  clickedPosition?: { lat: number; lng: number } | null;
  onClearClickedPosition?: () => void;
  enableMapPlacement?: boolean;
}

export function WaypointManager({
  onSelectWaypoint,
  selectedWaypoint,
  clickedPosition,
  onClearClickedPosition,
  enableMapPlacement = false,
}: WaypointManagerProps) {
  const { currentRole, isPC } = useRole();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWaypoint, setEditingWaypoint] = useState<Waypoint | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "DANGER_ZONE" as WaypointType,
    latitude: 0,
    longitude: 0,
    orderIndex: 0,
    description: "",
  });

  const { data: waypoints = [] } = useQuery<Waypoint[]>({
    queryKey: ["/api/waypoints"],
  });

  // Auto-open dialog when map is clicked
  useEffect(() => {
    if (clickedPosition && (enableMapPlacement || isPC)) {
      openCreateDialog();
    }
  }, [clickedPosition, enableMapPlacement, isPC]);

  const createWaypointMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/waypoints", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/waypoints"] });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const updateWaypointMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return await apiRequest("PATCH", `/api/waypoints/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/waypoints"] });
      setIsDialogOpen(false);
      setEditingWaypoint(null);
      resetForm();
    },
  });

  const deleteWaypointMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/waypoints/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/waypoints"] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      type: "DANGER_ZONE",
      latitude: 0,
      longitude: 0,
      orderIndex: waypoints.length,
      description: "",
    });
  };

  const openCreateDialog = () => {
    resetForm();
    if (clickedPosition) {
      setFormData(prev => ({
        ...prev,
        latitude: clickedPosition.lat,
        longitude: clickedPosition.lng,
        orderIndex: waypoints.length,
        code: `DZ${String(waypoints.length + 1).padStart(2, "0")}`,
      }));
    }
    setEditingWaypoint(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (waypoint: Waypoint) => {
    setFormData({
      name: waypoint.name,
      code: waypoint.code,
      type: "DANGER_ZONE",
      latitude: waypoint.latitude,
      longitude: waypoint.longitude,
      orderIndex: waypoint.orderIndex ?? 0,
      description: waypoint.description ?? "",
    });
    setEditingWaypoint(waypoint);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, type: "DANGER_ZONE" as WaypointType };
    if (editingWaypoint) {
      updateWaypointMutation.mutate({ id: editingWaypoint.id, data: payload });
    } else {
      createWaypointMutation.mutate(payload);
    }
    onClearClickedPosition?.();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "CHECKPOINT": return "bg-blue-500";
      case "RALLY_POINT": return "bg-purple-500";
      case "EXTRACTION": return "bg-green-500";
      case "REFUEL": return "bg-amber-500";
      case "REST_AREA": return "bg-cyan-500";
      case "DANGER_ZONE": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const canManageWaypoints = isPC || enableMapPlacement;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-4 h-4" />
            Zones de danger
          </CardTitle>
          {canManageWaypoints && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openCreateDialog} data-testid="button-add-waypoint">
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter une zone
                </Button>
              </DialogTrigger>
              <DialogContent className="z-[9999]">
                <DialogHeader>
                  <DialogTitle>
                    {editingWaypoint ? "Modifier la zone" : "Nouvelle zone de danger"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">Code</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="DZ01"
                        required
                        data-testid="input-waypoint-code"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <div className="flex items-center gap-2 rounded-md border px-3 py-2 bg-muted/30">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium">Zone de danger (10 m)</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Zone à sécuriser"
                      required
                      data-testid="input-waypoint-name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="0.0001"
                        value={formData.latitude}
                        onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                        required
                        data-testid="input-waypoint-latitude"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="0.0001"
                        value={formData.longitude}
                        onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                        required
                        data-testid="input-waypoint-longitude"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optionnel)</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Notes additionnelles..."
                      data-testid="input-waypoint-description"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      disabled={createWaypointMutation.isPending || updateWaypointMutation.isPending}
                      data-testid="button-save-waypoint"
                    >
                      {editingWaypoint ? "Modifier" : "Créer"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          {waypoints.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune zone de danger définie</p>
              {canManageWaypoints && (
                <p className="text-xs mt-1">
                  Cliquez sur la carte pour ajouter une zone à sécuriser
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {waypoints.map((waypoint, index) => (
                <div
                  key={waypoint.id}
                  className={`p-3 rounded-md border cursor-pointer transition-colors hover-elevate ${
                    selectedWaypoint?.id === waypoint.id
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                  onClick={() => onSelectWaypoint?.(waypoint)}
                  data-testid={`waypoint-item-${waypoint.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${getTypeColor(waypoint.type ?? "DANGER_ZONE")}`}>
                        {(waypoint.orderIndex ?? index) + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{waypoint.code}</p>
                        <p className="text-xs text-muted-foreground truncate">{waypoint.name}</p>
                      </div>
                    </div>
                    
                    {isPC && (
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(waypoint);
                          }}
                          data-testid={`button-edit-waypoint-${waypoint.id}`}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteWaypointMutation.mutate(waypoint.id);
                          }}
                          disabled={deleteWaypointMutation.isPending}
                          data-testid={`button-delete-waypoint-${waypoint.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {WAYPOINT_TYPES[waypoint.type as keyof typeof WAYPOINT_TYPES]?.name ?? "Point"}
                    </Badge>
                    {waypoint.description && (
                      <span className="text-xs text-muted-foreground truncate">
                        {waypoint.description}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default WaypointManager;
