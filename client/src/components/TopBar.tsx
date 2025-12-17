import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useRole } from "@/contexts/RoleContext";
import { VEHICLE_TYPES } from "@shared/schema";
import { Menu, Wifi, WifiOff, Satellite, SatelliteDish, EyeOff, Eye, Trash2, AlertTriangle, LogOut } from "lucide-react";

interface TopBarProps {
  isConnected: boolean;
  hasGPS: boolean;
  isStealthMode: boolean;
  onToggleStealth: () => void;
  onEmergencyWipe: () => void;
  onToggleSidebar?: () => void;
  onLogout: () => void;
  pendingAlertsCount?: number;
}

export function TopBar({
  isConnected,
  hasGPS,
  isStealthMode,
  onToggleStealth,
  onEmergencyWipe,
  onToggleSidebar,
  onLogout,
  pendingAlertsCount = 0,
}: TopBarProps) {
  const { currentRole, vehicleName, isPC } = useRole();
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [wipeStep, setWipeStep] = useState(1);

  const handleWipeClick = () => {
    setShowWipeConfirm(true);
    setWipeStep(1);
  };

  const handleConfirmWipe = () => {
    if (wipeStep === 1) {
      setWipeStep(2);
    } else {
      onEmergencyWipe();
      setShowWipeConfirm(false);
      setWipeStep(1);
    }
  };

  return (
    <>
      <header className="h-12 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-3 gap-2 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          {onToggleSidebar && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onToggleSidebar}
              className="lg:hidden"
              data-testid="button-toggle-sidebar"
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}

          <Badge 
            variant="outline" 
            className={`font-semibold text-xs ${
              isPC ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400" :
              currentRole === "RECO" ? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400" :
              currentRole === "A400M" ? "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-400" :
              "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400"
            }`}
            data-testid="badge-current-role"
          >
            {vehicleName}
          </Badge>

          {pendingAlertsCount > 0 && (
            <Badge variant="destructive" className="text-xs animate-pulse" data-testid="badge-pending-alerts">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {pendingAlertsCount}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Connection status */}
          <div className="flex items-center gap-1.5">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            {hasGPS ? (
              <SatelliteDish className="w-4 h-4 text-green-500" />
            ) : (
              <Satellite className="w-4 h-4 text-red-500" />
            )}
          </div>

          {/* Stealth mode toggle (not for PC) */}
          {!isPC && (
            <Button
              size="icon"
              variant={isStealthMode ? "default" : "ghost"}
              onClick={onToggleStealth}
              className={isStealthMode ? "bg-yellow-500 hover:bg-yellow-600" : ""}
              data-testid="button-toggle-stealth"
            >
              {isStealthMode ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </Button>
          )}

          {/* Emergency wipe button */}
          <Button
            size="icon"
            variant="destructive"
            onClick={handleWipeClick}
            data-testid="button-emergency-wipe"
          >
            <Trash2 className="w-4 h-4" />
          </Button>

          {/* Logout */}
          <Button
            size="icon"
            variant="ghost"
            onClick={onLogout}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Stealth mode warning banner */}
      {isStealthMode && (
        <div className="bg-yellow-500 text-yellow-950 text-center py-1 px-2 text-xs font-medium flex items-center justify-center gap-2">
          <EyeOff className="w-3 h-3" />
          Mode furtif actif - Position non diffusée
        </div>
      )}

      {/* Emergency wipe confirmation dialog */}
      <Dialog open={showWipeConfirm} onOpenChange={setShowWipeConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Effacement d'urgence
            </DialogTitle>
            <DialogDescription>
              {wipeStep === 1 ? (
                "Cette action supprimera toutes les données de mission de cet appareil. Cette action est irréversible."
              ) : (
                <span className="text-destructive font-semibold">
                  CONFIRMATION FINALE : Appuyez à nouveau pour effacer définitivement toutes les données.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowWipeConfirm(false);
                setWipeStep(1);
              }}
              data-testid="button-cancel-wipe"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmWipe}
              data-testid="button-confirm-wipe"
            >
              {wipeStep === 1 ? "Confirmer" : "EFFACER MAINTENANT"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TopBar;
