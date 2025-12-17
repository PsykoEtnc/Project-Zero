import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useRole } from "@/contexts/RoleContext";
import { Camera, Upload, Send, X, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

interface AnalysisResult {
  description: string;
  threatLevel: "low" | "medium" | "high";
  recommendations: string[];
}

interface CameraAnalysisProps {
  onAnalyze: (imageBase64: string) => Promise<AnalysisResult>;
  onSendToPC?: (imageBase64: string, analysis: AnalysisResult) => void;
  className?: string;
}

export function CameraAnalysis({
  onAnalyze,
  onSendToPC,
  className = "",
}: CameraAnalysisProps) {
  const { isPC } = useRole();
  const [isOpen, setIsOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          setCapturedImage(base64);
          setAnalysisResult(null);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleAnalyze = async () => {
    if (!capturedImage) return;
    
    setIsAnalyzing(true);
    try {
      const result = await onAnalyze(capturedImage);
      setAnalysisResult(result);
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendToPC = async () => {
    if (!capturedImage || !analysisResult || !onSendToPC) return;
    
    setIsSending(true);
    try {
      await onSendToPC(capturedImage, analysisResult);
      setIsOpen(false);
      setCapturedImage(null);
      setAnalysisResult(null);
    } catch (error) {
      console.error("Send failed:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setCapturedImage(null);
    setAnalysisResult(null);
  };

  const threatColors = {
    low: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
    medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
    high: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  };

  const threatLabels = {
    low: "Faible",
    medium: "Moyen",
    high: "Élevé",
  };

  // PC doesn't use camera, only receives analyzed images
  if (isPC) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          variant="outline"
          className="fixed bottom-6 right-24 rounded-full w-14 h-14 shadow-lg z-50"
          data-testid="button-open-camera"
        >
          <Camera className="w-6 h-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 uppercase text-sm tracking-wide">
            <Camera className="w-5 h-5" />
            Analyse d'image IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Image capture area */}
          {!capturedImage ? (
            <div 
              className="border-2 border-dashed border-muted-foreground/30 rounded-md p-8 text-center cursor-pointer hover-elevate"
              onClick={handleCapture}
              data-testid="button-capture-image"
            >
              <Camera className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Appuyez pour capturer une image
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ou glissez une image ici
              </p>
            </div>
          ) : (
            <div className="relative">
              <img 
                src={capturedImage} 
                alt="Capture" 
                className="w-full rounded-md"
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2"
                onClick={() => {
                  setCapturedImage(null);
                  setAnalysisResult(null);
                }}
                data-testid="button-remove-image"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Analyze button */}
          {capturedImage && !analysisResult && (
            <Button
              className="w-full"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              data-testid="button-analyze-image"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Analyser l'image
                </>
              )}
            </Button>
          )}

          {/* Analysis result */}
          {analysisResult && (
            <div className="space-y-3">
              <Card className={`border ${threatColors[analysisResult.threatLevel]}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Résultat de l'analyse</CardTitle>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${threatColors[analysisResult.threatLevel]}`}>
                      Menace: {threatLabels[analysisResult.threatLevel]}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm">{analysisResult.description}</p>
                  </div>

                  {analysisResult.recommendations.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                        Recommandations
                      </p>
                      <ul className="space-y-1">
                        {analysisResult.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-3 h-3 mt-1 flex-shrink-0 text-muted-foreground" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Send to PC */}
              {onSendToPC && (
                <Button
                  className="w-full"
                  onClick={handleSendToPC}
                  disabled={isSending}
                  data-testid="button-send-to-pc"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Transmettre au PC
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="p-3 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground">
              L'IA analysera l'image pour détecter les menaces potentielles (véhicules suspects, obstacles, zones dangereuses). Le résultat sera transmis au PC pour validation.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CameraAnalysis;
