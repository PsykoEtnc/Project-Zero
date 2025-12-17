import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useRole } from "@/contexts/RoleContext";
import { VEHICLE_TYPES, type VehicleType } from "@shared/schema";
import { Send, Radio, Users, Loader2 } from "lucide-react";

interface PCMessageSenderProps {
  onSendMessage: (content: string, targetVehicleId: string | null) => Promise<void>;
  className?: string;
}

export function PCMessageSender({ onSendMessage, className = "" }: PCMessageSenderProps) {
  const { isPC } = useRole();
  const [message, setMessage] = useState("");
  const [targetVehicle, setTargetVehicle] = useState<string>("all");
  const [isSending, setIsSending] = useState(false);

  if (!isPC) {
    return null;
  }

  const handleSend = async () => {
    if (!message.trim()) return;
    
    setIsSending(true);
    try {
      await onSendMessage(message.trim(), targetVehicle === "all" ? null : targetVehicle);
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const vehicleOptions = Object.entries(VEHICLE_TYPES)
    .filter(([key]) => key !== "PC")
    .map(([key, value]) => ({ id: key, name: value.name }));

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
          <Radio className="w-4 h-4" />
          Message aux unités
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Target selector */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wide block mb-1.5">
            Destinataire
          </label>
          <Select value={targetVehicle} onValueChange={setTargetVehicle}>
            <SelectTrigger data-testid="select-target-vehicle">
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Toutes les unités
                </div>
              </SelectItem>
              {vehicleOptions.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Message input */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wide block mb-1.5">
            Message
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Entrez votre message..."
            className="min-h-[80px] resize-none"
            data-testid="input-message"
          />
        </div>

        {/* Send button */}
        <Button
          className="w-full"
          onClick={handleSend}
          disabled={!message.trim() || isSending}
          data-testid="button-send-message"
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Envoi...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Envoyer
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Les messages apparaîtront sur les terminaux des unités sélectionnées
        </p>
      </CardContent>
    </Card>
  );
}

export default PCMessageSender;
