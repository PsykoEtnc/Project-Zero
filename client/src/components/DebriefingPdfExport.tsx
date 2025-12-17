import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2 } from "lucide-react";
import type { Mission, Alert, ConnectionLog, RouteChange } from "@shared/schema";
import { ALERT_TYPES, VEHICLE_TYPES } from "@shared/schema";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[œ]/g, 'oe')
    .replace(/[Œ]/g, 'OE')
    .replace(/[æ]/g, 'ae')
    .replace(/[Æ]/g, 'AE')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[^\x00-\x7F]/g, '');
}

interface DebriefingPdfExportProps {
  mission: Mission | null;
  alerts: Alert[];
  connectionLogs: ConnectionLog[];
  routeChanges: RouteChange[];
  className?: string;
}

export function DebriefingPdfExport({
  mission,
  alerts,
  connectionLogs,
  routeChanges,
  className = "",
}: DebriefingPdfExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = async () => {
    if (!mission) return;
    
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;
      const lineHeight = 7;
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;

      const addHeader = (text: string, size: number = 14) => {
        doc.setFontSize(size);
        doc.setFont("helvetica", "bold");
        doc.text(normalizeText(text), margin, yPosition);
        yPosition += lineHeight + 2;
      };

      const addText = (text: string, size: number = 10) => {
        doc.setFontSize(size);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(normalizeText(text), contentWidth);
        doc.text(lines, margin, yPosition);
        yPosition += lines.length * (lineHeight - 1);
      };

      const addLine = () => {
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 5;
      };

      const checkPageBreak = (neededSpace: number = 30) => {
        if (yPosition > doc.internal.pageSize.getHeight() - neededSpace) {
          doc.addPage();
          yPosition = 20;
        }
      };

      doc.setFillColor(30, 64, 50);
      doc.rect(0, 0, pageWidth, 45, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text(normalizeText("COMPTE-RENDU DE MISSION"), margin, 20);
      
      doc.setFontSize(14);
      doc.text(normalizeText(`Mission: ${mission.name}`), margin, 32);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const dateStr = mission.completedAt 
        ? format(new Date(mission.completedAt), "dd MMMM yyyy - HH:mm", { locale: fr })
        : format(new Date(), "dd MMMM yyyy - HH:mm", { locale: fr });
      doc.text(normalizeText(`Date: ${dateStr}`), margin, 40);

      doc.setTextColor(0, 0, 0);
      yPosition = 55;

      addHeader("SYNTHESE DE MISSION", 14);
      addLine();
      
      const validatedAlerts = alerts.filter(a => a.status === "VALIDATED").length;
      const dismissedAlerts = alerts.filter(a => a.status === "DISMISSED").length;
      const disconnections = connectionLogs.filter(l => l.eventType === "DISCONNECTED").length;
      
      addText(`Total alertes: ${alerts.length} (${validatedAlerts} validees, ${dismissedAlerts} rejetees)`);
      addText(`Changements d'itineraire: ${routeChanges.length}`);
      addText(`Deconnexions: ${disconnections}`);
      yPosition += 5;

      if (mission.debriefingContent) {
        checkPageBreak(50);
        addHeader("ANALYSE IA", 12);
        addLine();
        addText(mission.debriefingContent);
        yPosition += 10;
      }

      checkPageBreak(50);
      addHeader("CHRONOLOGIE DES ALERTES", 14);
      addLine();

      if (alerts.length === 0) {
        addText("Aucune alerte enregistree durant cette mission.");
      } else {
        const sortedAlerts = [...alerts].sort((a, b) => 
          new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
        );

        sortedAlerts.forEach((alert, index) => {
          checkPageBreak(25);
          
          const alertType = ALERT_TYPES[alert.type as keyof typeof ALERT_TYPES];
          const sourceVehicle = alert.sourceVehicleId 
            ? VEHICLE_TYPES[alert.sourceVehicleId as keyof typeof VEHICLE_TYPES]
            : null;
          const time = alert.createdAt 
            ? format(new Date(alert.createdAt), "HH:mm:ss", { locale: fr })
            : "N/A";
          const status = alert.status === "VALIDATED" ? "[VALIDE]" : 
                        alert.status === "DISMISSED" ? "[REJETE]" : "[EN ATTENTE]";

          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.text(normalizeText(`${time} - ${alertType?.name || alert.type} ${status}`), margin, yPosition);
          yPosition += lineHeight - 1;
          
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          if (sourceVehicle) {
            doc.text(normalizeText(`Source: ${sourceVehicle.name}`), margin + 5, yPosition);
            yPosition += lineHeight - 2;
          }
          if (alert.description) {
            const desc = doc.splitTextToSize(normalizeText(`Description: ${alert.description}`), contentWidth - 10);
            doc.text(desc, margin + 5, yPosition);
            yPosition += desc.length * (lineHeight - 2);
          }
          const latStr = alert.latitude != null ? alert.latitude.toFixed(4) : "N/A";
          const lngStr = alert.longitude != null ? alert.longitude.toFixed(4) : "N/A";
          doc.text(`Position: ${latStr}, ${lngStr}`, margin + 5, yPosition);
          yPosition += lineHeight;
        });
      }

      if (routeChanges.length > 0) {
        checkPageBreak(50);
        yPosition += 5;
        addHeader("CHANGEMENTS D'ITINERAIRE", 14);
        addLine();

        routeChanges.forEach((change) => {
          checkPageBreak(20);
          
          const time = change.createdAt 
            ? format(new Date(change.createdAt), "HH:mm:ss", { locale: fr })
            : "N/A";
          const triggeredBy = change.triggeredByVehicleId 
            ? VEHICLE_TYPES[change.triggeredByVehicleId as keyof typeof VEHICLE_TYPES]?.name || change.triggeredByVehicleId
            : "Systeme";

          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.text(normalizeText(`${time} - Recalcul par ${triggeredBy}`), margin, yPosition);
          yPosition += lineHeight - 1;
          
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          if (change.reason) {
            const reason = doc.splitTextToSize(normalizeText(`Raison: ${change.reason}`), contentWidth - 10);
            doc.text(reason, margin + 5, yPosition);
            yPosition += reason.length * (lineHeight - 2);
          }
          yPosition += 3;
        });
      }

      if (connectionLogs.length > 0) {
        checkPageBreak(50);
        yPosition += 5;
        addHeader("JOURNAL DES CONNEXIONS", 14);
        addLine();

        const sortedLogs = [...connectionLogs].sort((a, b) => 
          new Date(a.timestamp ?? 0).getTime() - new Date(b.timestamp ?? 0).getTime()
        );

        sortedLogs.forEach((log) => {
          checkPageBreak(15);
          
          const time = log.timestamp 
            ? format(new Date(log.timestamp), "HH:mm:ss", { locale: fr })
            : "N/A";
          const vehicle = log.vehicleId 
            ? VEHICLE_TYPES[log.vehicleId as keyof typeof VEHICLE_TYPES]?.name || log.vehicleId
            : "Inconnu";
          const event = log.eventType === "CONNECTED" ? "CONNECTE" : "DECONNECTE";

          doc.setFontSize(9);
          doc.text(normalizeText(`${time} - ${vehicle}: ${event}`), margin, yPosition);
          if (log.latitude != null && log.longitude != null) {
            doc.text(` (${log.latitude.toFixed(4)}, ${log.longitude.toFixed(4)})`, margin + 80, yPosition);
          }
          yPosition += lineHeight - 1;
        });
      }

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `ACTING - Page ${i}/${pageCount} - Document genere le ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      const normalizedMissionName = normalizeText(mission.name).replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
      const fileName = `debriefing_${normalizedMissionName}_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!mission || mission.status !== "COMPLETED") {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={generatePdf}
      disabled={isGenerating}
      className={className}
      data-testid="button-export-pdf"
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Generation...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          Exporter PDF
        </>
      )}
    </Button>
  );
}

export default DebriefingPdfExport;
