import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { storage } from "./storage";
import { insertAlertSchema, insertMissionSchema, insertPcMessageSchema, insertWaypointSchema, VEHICLE_TYPES } from "@shared/schema";
import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Store connected sockets by vehicle ID
const connectedClients = new Map<string, Socket>();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initialize Socket.IO
  const io = new SocketIOServer(httpServer, {
    path: "/ws",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Initialize default vehicles if not exist
  await initializeVehicles();

  // WebSocket connection handling
  io.on("connection", (socket: Socket) => {
    console.log("Client connected:", socket.id);
    let vehicleId: string | null = null;

    // Handle vehicle join
    socket.on("join", async (data: { vehicleId: string }) => {
      vehicleId = data.vehicleId;
      connectedClients.set(vehicleId, socket);
      
      try {
        // Update vehicle connection status and create connection log
        if (vehicleId !== "PC") {
          await storage.updateVehicleConnection(vehicleId, true);
          
          // Log connection for debriefing
          const vehicle = await storage.getVehicle(vehicleId);
          if (vehicle) {
            await storage.createConnectionLog({
              vehicleId,
              eventType: "CONNECTED",
              latitude: vehicle.latitude ?? 0,
              longitude: vehicle.longitude ?? 0,
            });
          }
        }

        // Send initial data
        const vehicles = await storage.getVehicles();
        const alerts = await storage.getAlerts();
        const messages = await storage.getMessages();
        const mission = await storage.getCurrentMission();

        socket.emit("vehicles:sync", vehicles);
        socket.emit("alerts:sync", alerts);
        socket.emit("messages:sync", messages);
        
        // Send current route if mission exists
        if (mission) {
          const route = await calculateRoute(
            mission.startPointLat,
            mission.startPointLng,
            mission.extractionPointLat,
            mission.extractionPointLng
          );
          socket.emit("route:updated", route);
        }

        // Notify all clients of updated vehicle status
        io.emit("vehicles:sync", vehicles);
        
        console.log(`Vehicle ${vehicleId} joined`);
      } catch (error) {
        console.error(`Failed to handle join for ${vehicleId}:`, error);
      }
    });

    // Handle position updates
    socket.on("position:update", async (data: { 
      vehicleId: string; 
      latitude: number; 
      longitude: number;
      heading?: number;
      speed?: number;
    }) => {
      // Validate that latitude and longitude are valid numbers
      if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number' ||
          isNaN(data.latitude) || isNaN(data.longitude)) {
        console.warn(`Invalid position data for vehicle ${data.vehicleId}`);
        return;
      }
      
      const vehicle = await storage.updateVehiclePosition(
        data.vehicleId, 
        data.latitude, 
        data.longitude,
        data.heading,
        data.speed
      );
      if (vehicle) {
        io.emit("vehicle:updated", vehicle);
      }
    });

    // Handle stealth mode toggle
    socket.on("stealth:toggle", async (data: { vehicleId: string; isStealthMode: boolean }) => {
      const vehicle = await storage.updateVehicleStealthMode(data.vehicleId, data.isStealthMode);
      if (vehicle) {
        io.emit("vehicle:updated", vehicle);
      }
    });

    // Handle alert creation
    socket.on("alert:create", async (data: {
      type: string;
      latitude: number;
      longitude: number;
      description?: string;
      imageUrl?: string;
      sourceVehicleId?: string;
    }) => {
      try {
        // If image is provided, analyze with AI
        let aiAnalysis: string | undefined;
        if (data.imageUrl && data.imageUrl.startsWith("data:image")) {
          try {
            const base64Data = data.imageUrl.split(",")[1];
            const response = await openai.chat.completions.create({
              model: "gpt-5",
              messages: [
                {
                  role: "system",
                  content: `Tu es un analyste de renseignement militaire. Analyse les images tactiques et classifie les menaces.
Catégories de menaces:
- VEHICULE_SUSPECT: Véhicule non identifié, technique armé, véhicule abandonné
- OBSTACLE: Barrage routier, débris, terrain impraticable
- ZONE_DANGEREUSE: Zone de combat active, embuscade potentielle
- IED_POTENTIEL: Engin explosif improvisé, objet suspect sur la route
- PERSONNEL_HOSTILE: Combattants armés, checkpoint non-allié
- CIVIL: Présence civile, trafic normal
Réponds en JSON valide.`,
                },
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: `Analyse cette image tactique et réponds en JSON:
{
  "category": "VEHICULE_SUSPECT|OBSTACLE|ZONE_DANGEREUSE|IED_POTENTIEL|PERSONNEL_HOSTILE|CIVIL",
  "threatLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "description": "description courte en français",
  "confidence": 0.0-1.0,
  "recommendation": "action recommandée"
}`,
                    },
                    {
                      type: "image_url",
                      image_url: { url: data.imageUrl },
                    },
                  ],
                },
              ],
              response_format: { type: "json_object" },
              max_completion_tokens: 300,
            });
            aiAnalysis = response.choices[0].message.content ?? undefined;
          } catch (error) {
            console.error("AI analysis failed:", error);
          }
        }

        const alert = await storage.createAlert({
          type: data.type as any,
          latitude: data.latitude,
          longitude: data.longitude,
          description: data.description,
          imageUrl: data.imageUrl,
          sourceVehicleId: data.sourceVehicleId,
          aiAnalysis,
          status: "PENDING",
        });
        
        io.emit("alert:created", alert);
        console.log("Alert created:", alert.id);
      } catch (error) {
        console.error("Failed to create alert:", error);
      }
    });

    // Handle alert validation (PC only)
    socket.on("alert:validate", async (data: { alertId: string; validatedBy: string }) => {
      const alert = await storage.updateAlertStatus(data.alertId, "VALIDATED", data.validatedBy);
      if (alert) {
        io.emit("alert:updated", alert);
      }
    });

    // Handle alert dismissal (PC only)
    socket.on("alert:dismiss", async (data: { alertId: string; validatedBy: string }) => {
      const alert = await storage.updateAlertStatus(data.alertId, "DISMISSED", data.validatedBy);
      if (alert) {
        io.emit("alert:updated", alert);
      }
    });

    // Handle PC message sending
    socket.on("message:send", async (data: { content: string; targetVehicleId: string | null }) => {
      const message = await storage.createMessage({
        content: data.content,
        targetVehicleId: data.targetVehicleId,
      });
      
      // Send to specific vehicle or broadcast
      if (data.targetVehicleId) {
        const targetSocket = connectedClients.get(data.targetVehicleId);
        if (targetSocket) {
          targetSocket.emit("message:received", message);
        }
      } else {
        io.emit("message:received", message);
      }
    });

    // Handle message read
    socket.on("message:read", async (data: { messageId: string }) => {
      await storage.markMessageAsRead(data.messageId);
    });

    // Handle route recalculation request
    socket.on("route:recalculate", async (data?: { reason?: string; vehicleId?: string; latitude?: number; longitude?: number }) => {
      const mission = await storage.getCurrentMission();
      if (mission) {
        const route = await calculateRoute(
          mission.startPointLat,
          mission.startPointLng,
          mission.extractionPointLat,
          mission.extractionPointLng
        );
        
        // Record the route change for debriefing
        // Use vehicleId from data if provided, otherwise fall back to socket's vehicleId
        const triggeredBy = data?.vehicleId ?? vehicleId ?? null;
        try {
          await storage.createRouteChange({
            missionId: mission.id,
            reason: data?.reason ?? "Recalcul automatique",
            triggeredByVehicleId: triggeredBy,
            justification: null,
            previousRoute: null,
            newRoute: JSON.stringify(route),
          });
        } catch (error) {
          console.error("Failed to record route change:", error);
        }
        
        // Notify clients of route change (for cache invalidation)
        io.emit("route:updated", route);
        io.emit("route-change:created");
      }
    });

    // Handle disconnection
    socket.on("disconnect", async () => {
      console.log("Client disconnecting:", socket.id, "vehicleId:", vehicleId);
      
      if (vehicleId) {
        // Remove from connected clients map
        connectedClients.delete(vehicleId);
        
        // Update vehicle connection status and log for all vehicles (not just non-PC)
        if (vehicleId !== "PC") {
          try {
            // Update vehicle connection status
            await storage.updateVehicleConnection(vehicleId, false);
            
            // Log disconnection for debriefing
            const vehicle = await storage.getVehicle(vehicleId);
            if (vehicle) {
              await storage.createConnectionLog({
                vehicleId,
                eventType: "DISCONNECTED",
                latitude: vehicle.latitude ?? 0,
                longitude: vehicle.longitude ?? 0,
              });
            }
          } catch (error) {
            console.error(`Failed to update vehicle ${vehicleId} on disconnect:`, error);
          }
        }

        // Notify all clients of updated vehicle status
        try {
          const vehicles = await storage.getVehicles();
          io.emit("vehicles:sync", vehicles);
        } catch (error) {
          console.error("Failed to sync vehicles on disconnect:", error);
        }
        
        console.log(`Vehicle ${vehicleId} disconnected`);
      }
    });
  });

  // REST API Routes

  // Get current mission
  app.get("/api/mission/current", async (req, res) => {
    try {
      let mission = await storage.getCurrentMission();
      
      // Create default mission if none exists
      if (!mission) {
        mission = await storage.createMission({
          name: "Extraction Convoi Alpha",
          status: "BRIEFING",
          startPointLat: 17.4,
          startPointLng: -4.2,
          extractionPointLat: 17.8,
          extractionPointLng: -3.5,
          briefingContent: `MISSION: Extraction Convoi Alpha
          
OBJECTIF: Acheminer le convoi logistique composé de 4 véhicules PPLOG vers le point d'extraction où un A400M Atlas attend pour l'évacuation.

DISPOSITIF:
- 4 véhicules PPLOG (convoi principal)
- 1 VBL de reconnaissance (en avant du convoi)
- 1 A400M Atlas (surveillance aérienne et extraction)
- 1 PC (coordination et supervision)

ITINÉRAIRE: Zone Alpha → Zone Bravo → Zone Charlie (extraction)

MENACES IDENTIFIÉES:
- Présence ennemie signalée dans le secteur
- Risque IED sur axes principaux
- Trafic civil potentiel

CONSIGNES:
- Maintenir une distance de sécurité entre véhicules
- Signaler toute menace immédiatement
- Le véhicule RECO reste en avant du convoi
- En cas de contact, regroupement sur position défensive`,
        });
      }
      
      res.json(mission);
    } catch (error) {
      console.error("Failed to get mission:", error);
      res.status(500).json({ error: "Failed to get mission" });
    }
  });

  // Start mission
  app.post("/api/mission/start", async (req, res) => {
    try {
      const mission = await storage.getCurrentMission();
      if (mission) {
        const updated = await storage.updateMission(mission.id, {
          status: "IN_PROGRESS",
          startedAt: new Date(),
        });
        res.json(updated);
      } else {
        res.status(404).json({ error: "No mission found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to start mission" });
    }
  });

  // Complete mission
  app.post("/api/mission/complete", async (req, res) => {
    try {
      const mission = await storage.getCurrentMission();
      if (mission) {
        // Generate debriefing with AI
        const alerts = await storage.getAlerts();
        const connectionLogs = await storage.getConnectionLogs();
        
        let debriefingContent = "Débriefing en cours de génération...";
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-5",
            messages: [
              {
                role: "system",
                content: "Tu es un officier de liaison rédigeant un compte-rendu de mission militaire tactique. Sois concis et professionnel.",
              },
              {
                role: "user",
                content: `Génère un débriefing de mission en français basé sur ces données:
                - Mission: ${mission.name}
                - Nombre d'alertes: ${alerts.length}
                - Alertes validées: ${alerts.filter(a => a.status === "VALIDATED").length}
                - Pertes de connexion: ${connectionLogs.filter(l => l.eventType === "DISCONNECTED").length}
                
                Résume la mission en 3-4 paragraphes: déroulement, incidents notables, et recommandations.`,
              },
            ],
            max_completion_tokens: 500,
          });
          debriefingContent = response.choices[0].message.content ?? debriefingContent;
        } catch (error) {
          console.error("Failed to generate debriefing:", error);
        }

        const updated = await storage.updateMission(mission.id, {
          status: "COMPLETED",
          completedAt: new Date(),
          debriefingContent,
        });
        res.json(updated);
      } else {
        res.status(404).json({ error: "No mission found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to complete mission" });
    }
  });

  // Analyze image with AI
  app.post("/api/analyze-image", async (req, res) => {
    try {
      const { image } = req.body;
      
      if (!image) {
        return res.status(400).json({ error: "Image required" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `Tu es un analyste de renseignement militaire. Analyse les images tactiques et classifie les menaces.
Catégories de menaces:
- VEHICULE_SUSPECT: Véhicule non identifié, technique armé, véhicule abandonné
- OBSTACLE: Barrage routier, débris, terrain impraticable
- ZONE_DANGEREUSE: Zone de combat active, embuscade potentielle
- IED_POTENTIEL: Engin explosif improvisé, objet suspect sur la route
- PERSONNEL_HOSTILE: Combattants armés, checkpoint non-allié
- CIVIL: Présence civile, trafic normal
Réponds en JSON valide.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyse cette image tactique et réponds en JSON:
{
  "category": "VEHICULE_SUSPECT|OBSTACLE|ZONE_DANGEREUSE|IED_POTENTIEL|PERSONNEL_HOSTILE|CIVIL",
  "threatLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "description": "description courte en français",
  "confidence": 0.0-1.0,
  "recommendation": "action recommandée"
}`,
              },
              {
                type: "image_url",
                image_url: { url: image },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 300,
      });

      const analysis = JSON.parse(response.choices[0].message.content ?? "{}");
      res.json(analysis);
    } catch (error) {
      console.error("Image analysis failed:", error);
      res.status(500).json({ 
        description: "Analyse non disponible",
        threatLevel: "low",
        recommendations: ["Transmettez l'image au PC pour analyse manuelle"],
      });
    }
  });

  // Get vehicles
  app.get("/api/vehicles", async (req, res) => {
    try {
      const vehicles = await storage.getVehicles();
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ error: "Failed to get vehicles" });
    }
  });

  // Get alerts
  app.get("/api/alerts", async (req, res) => {
    try {
      const alerts = await storage.getAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to get alerts" });
    }
  });

  // Calculate route using GraphHopper
  app.post("/api/route/calculate", async (req, res) => {
    try {
      const { startLat, startLng, endLat, endLng } = req.body;
      const route = await calculateRoute(startLat, startLng, endLat, endLng);
      res.json({ route });
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate route" });
    }
  });

  // Generate briefing
  app.post("/api/mission/generate-briefing", async (req, res) => {
    try {
      const mission = await storage.getCurrentMission();
      if (!mission) {
        return res.status(404).json({ error: "No mission found" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "Tu es un officier préparant un briefing de mission tactique. Sois précis et professionnel.",
          },
          {
            role: "user",
            content: `Génère un briefing de mission en français pour l'opération "${mission.name}".
            Point de départ: ${mission.startPointLat}, ${mission.startPointLng}
            Point d'extraction: ${mission.extractionPointLat}, ${mission.extractionPointLng}
            
            Inclus: objectif, dispositif, itinéraire prévu, menaces identifiées, et consignes.`,
          },
        ],
        max_completion_tokens: 600,
      });

      const briefingContent = response.choices[0].message.content;
      const updated = await storage.updateMission(mission.id, { briefingContent });
      res.json(updated);
    } catch (error) {
      console.error("Failed to generate briefing:", error);
      res.status(500).json({ error: "Failed to generate briefing" });
    }
  });

  // ===== WAYPOINTS API =====
  
  // Get waypoints for current mission
  app.get("/api/waypoints", async (req, res) => {
    try {
      const mission = await storage.getCurrentMission();
      const waypoints = await storage.getWaypoints(mission?.id);
      res.json(waypoints);
    } catch (error) {
      res.status(500).json({ error: "Failed to get waypoints" });
    }
  });

  // Create a new waypoint
  app.post("/api/waypoints", async (req, res) => {
    try {
      const mission = await storage.getCurrentMission();
      
      // Validate with Zod schema
      const parsed = insertWaypointSchema.safeParse({
        ...req.body,
        missionId: mission?.id,
      });
      
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid waypoint data", details: parsed.error.flatten() });
      }
      
      // Auto-increment orderIndex if not provided
      const existingWaypoints = await storage.getWaypoints(mission?.id);
      const orderIndex = parsed.data.orderIndex ?? existingWaypoints.length;
      
      const waypoint = await storage.createWaypoint({
        ...parsed.data,
        orderIndex,
      });
      
      // Notify all clients via WebSocket
      io.emit("waypoint:created", waypoint);
      res.json(waypoint);
    } catch (error) {
      console.error("Failed to create waypoint:", error);
      res.status(500).json({ error: "Failed to create waypoint" });
    }
  });

  // Update a waypoint
  app.patch("/api/waypoints/:id", async (req, res) => {
    try {
      // Partial validation - only validate fields that are provided
      const updates = req.body;
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No update data provided" });
      }
      
      const waypoint = await storage.updateWaypoint(req.params.id, updates);
      if (waypoint) {
        io.emit("waypoint:updated", waypoint);
        res.json(waypoint);
      } else {
        res.status(404).json({ error: "Waypoint not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update waypoint" });
    }
  });

  // Delete a waypoint
  app.delete("/api/waypoints/:id", async (req, res) => {
    try {
      await storage.deleteWaypoint(req.params.id);
      io.emit("waypoint:deleted", { id: req.params.id });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete waypoint" });
    }
  });

  // ===== ROUTE CHANGES API =====
  
  // Get route change history
  app.get("/api/route-changes", async (req, res) => {
    try {
      const mission = await storage.getCurrentMission();
      const changes = await storage.getRouteChanges(mission?.id);
      res.json(changes);
    } catch (error) {
      res.status(500).json({ error: "Failed to get route changes" });
    }
  });

  // ===== CONNECTION LOGS API =====
  
  // Get connection logs (for debriefing)
  app.get("/api/connection-logs", async (req, res) => {
    try {
      const logs = await storage.getConnectionLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to get connection logs" });
    }
  });

  // ===== POSITION HISTORY API (for replay) =====
  
  // Get position history for replay
  app.get("/api/position-history/:missionId", async (req, res) => {
    try {
      const history = await storage.getPositionHistory(req.params.missionId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to get position history" });
    }
  });

  return httpServer;
}

// Initialize default vehicles with valid Mali coordinates (staging area)
async function initializeVehicles() {
  const vehicleData = [
    { id: "CONVOY_1", type: "CONVOY_1", name: "Véhicule 1", latitude: 17.4200, longitude: -4.1800, heading: 0, speed: 0, isConnected: false, isStealthMode: false },
    { id: "CONVOY_2", type: "CONVOY_2", name: "Véhicule 2", latitude: 17.4150, longitude: -4.1850, heading: 0, speed: 0, isConnected: false, isStealthMode: false },
    { id: "CONVOY_3", type: "CONVOY_3", name: "Véhicule 3", latitude: 17.4100, longitude: -4.1900, heading: 0, speed: 0, isConnected: false, isStealthMode: false },
    { id: "CONVOY_4", type: "CONVOY_4", name: "Véhicule 4", latitude: 17.4050, longitude: -4.1950, heading: 0, speed: 0, isConnected: false, isStealthMode: false },
    { id: "RECO", type: "RECO", name: "VBL Reconnaissance", latitude: 17.4500, longitude: -4.1500, heading: 0, speed: 0, isConnected: false, isStealthMode: false },
    { id: "A400M", type: "A400M", name: "A400M Atlas", latitude: 17.6000, longitude: -3.8000, heading: 270, speed: 0, isConnected: false, isStealthMode: false },
  ];

  for (const vehicle of vehicleData) {
    await storage.upsertVehicle(vehicle as any);
  }
}

// Calculate route using GraphHopper API
async function calculateRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<[number, number][]> {
  try {
    const apiKey = process.env.GRAPHHOPPER_API_KEY;
    if (!apiKey) {
      console.warn("GRAPHHOPPER_API_KEY not set, returning direct route");
      return [[startLat, startLng], [endLat, endLng]];
    }

    const url = `https://graphhopper.com/api/1/route?point=${startLat},${startLng}&point=${endLat},${endLng}&vehicle=car&key=${apiKey}&points_encoded=false`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.paths && data.paths[0] && data.paths[0].points) {
      const coordinates = data.paths[0].points.coordinates;
      // GraphHopper returns [lng, lat], we need [lat, lng]
      return coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
    }

    return [[startLat, startLng], [endLat, endLng]];
  } catch (error) {
    console.error("Failed to calculate route:", error);
    return [[startLat, startLng], [endLat, endLng]];
  }
}
