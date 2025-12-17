import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";
import type { PcMessage } from "@shared/schema";
import { Radio, X, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface MessageNotificationProps {
  messages: PcMessage[];
  onMarkAsRead: (messageId: string) => void;
}

export function MessageNotification({ messages, onMarkAsRead }: MessageNotificationProps) {
  const { isPC, currentRole } = useRole();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // PC doesn't receive messages, only sends them
  if (isPC) {
    return null;
  }

  // Filter messages for this vehicle
  const myMessages = messages.filter(m => {
    // Broadcast messages (targetVehicleId is null)
    if (!m.targetVehicleId) return true;
    // Messages specifically for this vehicle
    return m.targetVehicleId === currentRole;
  }).filter(m => !m.readAt && !dismissedIds.has(m.id));

  if (myMessages.length === 0) {
    return null;
  }

  const handleDismiss = (messageId: string) => {
    setDismissedIds(prev => new Set([...prev, messageId]));
    onMarkAsRead(messageId);
  };

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 space-y-2">
      {myMessages.slice(0, 3).map((message) => (
        <Card 
          key={message.id} 
          className="border-primary/50 bg-primary/5 shadow-lg animate-in slide-in-from-top duration-300"
          data-testid={`notification-message-${message.id}`}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Radio className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase text-primary">
                    Message du PC
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {message.createdAt && formatDistanceToNow(new Date(message.createdAt), { 
                      addSuffix: true, 
                      locale: fr 
                    })}
                  </span>
                </div>
                <p className="text-sm font-medium">{message.content}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="flex-shrink-0"
                onClick={() => handleDismiss(message.id)}
                data-testid={`button-dismiss-message-${message.id}`}
              >
                <Check className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default MessageNotification;
