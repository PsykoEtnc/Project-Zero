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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Plus, Trash2, Edit, Navigation } from "lucide-react";

interface WaypointManagerProps {
  onSelectWaypoint?: (waypoint: Waypoint) => void;
  selectedWaypoint?: Waypoint | null;
  clickedPosition?: { lat: number; lng: number } | null;
  onClearClickedPosition?: () => void;
}

export function WaypointManager({
  onSelectWaypoint,
  selectedWaypoint,
  clickedPosition,
  onClearClickedPosition,
}: WaypointManagerProps) {
  const { currentRole, isPC } = useRole();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWaypoint, setEditingWaypoint] = useState<Waypoint | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "CHECKPOINT" as WaypointType,
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
    if (clickedPosition && isPC) {
      openCreateDialog();
    }
  }, [clickedPosition]);

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
      type: "CHECKPOINT",
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
        code: `WP${String(waypoints.length + 1).padStart(2, "0")}`,
      }));
    }
    setEditingWaypoint(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (waypoint: Waypoint) => {
    setFormData({
      name: waypoint.name,
      code: waypoint.code,
      type: (waypoint.type as WaypointType) ?? "CHECKPOINT",
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
    if (editingWaypoint) {
      updateWaypointMutation.mutate({ id: editingWaypoint.id, data: formData });
    } else {
      createWaypointMutation.mutate(formData);
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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <Navigation className="w-4 h-4" />
            Waypoints
          </CardTitle>
          {isPC && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openCreateDialog} data-testid="button-add-waypoint">
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingWaypoint ? "Modifier le waypoint" : "Nouveau waypoint"}
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
                        placeholder="WP01"
                        required
                        data-testid="input-waypoint-code"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value as WaypointType })}
                      >
                        <SelectTrigger data-testid="select-waypoint-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(WAYPOINT_TYPES).map(([key, value]) => (
                            <SelectItem key={key} value={key}>
                              {value.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Point de contrôle Alpha"
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
              <p className="text-sm">Aucun waypoint défini</p>
              {isPC && (
                <p className="text-xs mt-1">
                  Cliquez sur la carte pour ajouter un point
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
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${getTypeColor(waypoint.type ?? "CHECKPOINT")}`}>
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
