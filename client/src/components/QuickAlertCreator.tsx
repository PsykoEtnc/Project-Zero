import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useRole } from "@/contexts/RoleContext";
import { ALERT_TYPES, type AlertType } from "@shared/schema";
import { AlertTriangle, Construction, Target, Bomb, Car, Users, Info, Plus, Camera } from "lucide-react";

const alertIcons: Record<AlertType, typeof AlertTriangle> = {
  OBSTACLE: Construction,
  HOSTILE: Target,
  IED_SUSPECT: Bomb,
  BREAKDOWN: Car,
  CIVILIAN_TRAFFIC: Users,
  OTHER: Info,
};

interface QuickAlertCreatorProps {
  onCreateAlert: (type: AlertType, imageBase64?: string) => void;
  isLoading?: boolean;
}

export function QuickAlertCreator({ onCreateAlert, isLoading }: QuickAlertCreatorProps) {
  const { currentRole, isPC } = useRole();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<AlertType | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const handleAlertSelect = (type: AlertType) => {
    setSelectedType(type);
  };

  const handleSubmit = () => {
    if (selectedType) {
      onCreateAlert(selectedType, capturedImage ?? undefined);
      setIsOpen(false);
      setSelectedType(null);
      setCapturedImage(null);
    }
  };

  const handleCapture = () => {
    // In real implementation, this would open camera
    // For now, we'll use a file input
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setCapturedImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  // PC cannot create alerts, only validate them
  if (isPC) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg z-50"
          data-testid="button-create-alert"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 uppercase text-sm tracking-wide">
            <AlertTriangle className="w-5 h-5" />
            Signalement rapide
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {(Object.keys(ALERT_TYPES) as AlertType[]).map((type) => {
            const Icon = alertIcons[type];
            const alertInfo = ALERT_TYPES[type];
            const isSelected = selectedType === type;

            return (
              <Button
                key={type}
                variant={isSelected ? "default" : "outline"}
                className={`h-20 flex flex-col items-center gap-2 ${isSelected ? "ring-2 ring-primary" : ""}`}
                onClick={() => handleAlertSelect(type)}
                data-testid={`button-alert-type-${type.toLowerCase()}`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{alertInfo.name}</span>
              </Button>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-muted rounded-md">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Photo (optionnel)</span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCapture}
              data-testid="button-capture-photo"
            >
              <Camera className="w-4 h-4 mr-2" />
              {capturedImage ? "Modifier" : "Capturer"}
            </Button>
          </div>
          {capturedImage && (
            <div className="mt-2">
              <img 
                src={capturedImage} 
                alt="Capture" 
                className="w-full h-32 object-cover rounded"
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setIsOpen(false);
              setSelectedType(null);
              setCapturedImage(null);
            }}
            data-testid="button-cancel-alert"
          >
            Annuler
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={!selectedType || isLoading}
            data-testid="button-submit-alert"
          >
            {isLoading ? "Envoi..." : "Signaler"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          L'alerte sera transmise au PC pour validation
        </p>
      </DialogContent>
    </Dialog>
  );
}

export default QuickAlertCreator;
