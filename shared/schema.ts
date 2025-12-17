import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const vehicleTypeEnum = pgEnum('vehicle_type', ['CONVOY_1', 'CONVOY_2', 'CONVOY_3', 'CONVOY_4', 'RECO', 'A400M', 'PC']);
export const alertTypeEnum = pgEnum('alert_type', ['OBSTACLE', 'HOSTILE', 'IED_SUSPECT', 'BREAKDOWN', 'CIVILIAN_TRAFFIC', 'OTHER']);
export const alertStatusEnum = pgEnum('alert_status', ['PENDING', 'VALIDATED', 'DISMISSED']);
export const missionStatusEnum = pgEnum('mission_status', ['BRIEFING', 'IN_PROGRESS', 'COMPLETED', 'ABORTED']);

// Vehicles table - represents each unit in the convoy
export const vehicles = pgTable("vehicles", {
  id: varchar("id", { length: 50 }).primaryKey(),
  type: vehicleTypeEnum("type").notNull(),
  name: text("name").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  heading: real("heading").default(0),
  speed: real("speed").default(0),
  isStealthMode: boolean("is_stealth_mode").default(false),
  isConnected: boolean("is_connected").default(true),
  lastUpdate: timestamp("last_update").defaultNow(),
});

// Alerts table - threat and obstacle reports
export const alerts = pgTable("alerts", {
  id: varchar("id", { length: 50 }).primaryKey().default(sql`gen_random_uuid()`),
  type: alertTypeEnum("type").notNull(),
  status: alertStatusEnum("status").default('PENDING'),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  description: text("description"),
  sourceVehicleId: varchar("source_vehicle_id", { length: 50 }).references(() => vehicles.id),
  imageUrl: text("image_url"),
  aiAnalysis: text("ai_analysis"),
  createdAt: timestamp("created_at").defaultNow(),
  validatedAt: timestamp("validated_at"),
  validatedBy: varchar("validated_by", { length: 50 }),
});

// Mission table - single mission data
export const missions = pgTable("missions", {
  id: varchar("id", { length: 50 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  status: missionStatusEnum("status").default('BRIEFING'),
  startPointLat: real("start_point_lat").notNull(),
  startPointLng: real("start_point_lng").notNull(),
  extractionPointLat: real("extraction_point_lat").notNull(),
  extractionPointLng: real("extraction_point_lng").notNull(),
  briefingContent: text("briefing_content"),
  debriefingContent: text("debriefing_content"),
  routeGeojson: text("route_geojson"),
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

// Connection logs - for debriefing analysis
export const connectionLogs = pgTable("connection_logs", {
  id: varchar("id", { length: 50 }).primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id", { length: 50 }).references(() => vehicles.id),
  eventType: text("event_type").notNull(), // 'DISCONNECTED' | 'RECONNECTED'
  latitude: real("latitude"),
  longitude: real("longitude"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Map zones - named sectors for quick reference
export const zones = pgTable("zones", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(), // e.g., "ALPHA", "BRAVO"
  centerLat: real("center_lat").notNull(),
  centerLng: real("center_lng").notNull(),
  radiusKm: real("radius_km").notNull(),
});

// PC Messages - one-way messages from PC to vehicles
export const pcMessages = pgTable("pc_messages", {
  id: varchar("id", { length: 50 }).primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  targetVehicleId: varchar("target_vehicle_id", { length: 50 }), // null = broadcast to all
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at"),
});

// Waypoints - predefined points on the route
export const waypointTypeEnum = pgEnum('waypoint_type', ['CHECKPOINT', 'RALLY_POINT', 'EXTRACTION', 'REFUEL', 'REST_AREA', 'DANGER_ZONE', 'CUSTOM']);

export const waypoints = pgTable("waypoints", {
  id: varchar("id", { length: 50 }).primaryKey().default(sql`gen_random_uuid()`),
  missionId: varchar("mission_id", { length: 50 }).references(() => missions.id),
  name: text("name").notNull(),
  code: text("code").notNull(), // e.g., "WP01", "ALPHA"
  type: waypointTypeEnum("type").default('CHECKPOINT'),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  orderIndex: integer("order_index").default(0),
  description: text("description"),
  estimatedArrival: timestamp("estimated_arrival"),
  actualArrival: timestamp("actual_arrival"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Route changes - history of route modifications
export const routeChanges = pgTable("route_changes", {
  id: varchar("id", { length: 50 }).primaryKey().default(sql`gen_random_uuid()`),
  missionId: varchar("mission_id", { length: 50 }).references(() => missions.id),
  reason: text("reason").notNull(), // 'ALERT', 'MANUAL', 'DEVIATION'
  justification: text("justification"),
  previousRoute: text("previous_route"), // GeoJSON
  newRoute: text("new_route"), // GeoJSON
  triggeredByAlertId: varchar("triggered_by_alert_id", { length: 50 }),
  triggeredByVehicleId: varchar("triggered_by_vehicle_id", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Position history - for mission replay
export const positionHistory = pgTable("position_history", {
  id: varchar("id", { length: 50 }).primaryKey().default(sql`gen_random_uuid()`),
  missionId: varchar("mission_id", { length: 50 }).references(() => missions.id),
  vehicleId: varchar("vehicle_id", { length: 50 }).references(() => vehicles.id),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  heading: real("heading").default(0),
  speed: real("speed").default(0),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Relations
export const vehiclesRelations = relations(vehicles, ({ many }) => ({
  alerts: many(alerts),
  connectionLogs: many(connectionLogs),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  sourceVehicle: one(vehicles, {
    fields: [alerts.sourceVehicleId],
    references: [vehicles.id],
  }),
}));

export const connectionLogsRelations = relations(connectionLogs, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [connectionLogs.vehicleId],
    references: [vehicles.id],
  }),
}));

// Insert schemas
export const insertVehicleSchema = createInsertSchema(vehicles).omit({ lastUpdate: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, createdAt: true, validatedAt: true });
export const insertMissionSchema = createInsertSchema(missions).omit({ id: true, createdAt: true, startedAt: true, completedAt: true });
export const insertConnectionLogSchema = createInsertSchema(connectionLogs).omit({ id: true, timestamp: true });
export const insertZoneSchema = createInsertSchema(zones);
export const insertPcMessageSchema = createInsertSchema(pcMessages).omit({ id: true, createdAt: true, readAt: true });
export const insertWaypointSchema = createInsertSchema(waypoints).omit({ id: true, createdAt: true, actualArrival: true });
export const insertRouteChangeSchema = createInsertSchema(routeChanges).omit({ id: true, createdAt: true });
export const insertPositionHistorySchema = createInsertSchema(positionHistory).omit({ id: true, timestamp: true });

// Types
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export type Mission = typeof missions.$inferSelect;
export type InsertMission = z.infer<typeof insertMissionSchema>;

export type ConnectionLog = typeof connectionLogs.$inferSelect;
export type InsertConnectionLog = z.infer<typeof insertConnectionLogSchema>;

export type Zone = typeof zones.$inferSelect;
export type InsertZone = z.infer<typeof insertZoneSchema>;

export type PcMessage = typeof pcMessages.$inferSelect;
export type InsertPcMessage = z.infer<typeof insertPcMessageSchema>;

export type Waypoint = typeof waypoints.$inferSelect;
export type InsertWaypoint = z.infer<typeof insertWaypointSchema>;

export type RouteChange = typeof routeChanges.$inferSelect;
export type InsertRouteChange = z.infer<typeof insertRouteChangeSchema>;

export type PositionHistory = typeof positionHistory.$inferSelect;
export type InsertPositionHistory = z.infer<typeof insertPositionHistorySchema>;

export const WAYPOINT_TYPES = {
  CHECKPOINT: { id: 'CHECKPOINT', name: 'Point de contrôle', icon: 'flag' },
  RALLY_POINT: { id: 'RALLY_POINT', name: 'Point de ralliement', icon: 'users' },
  EXTRACTION: { id: 'EXTRACTION', name: 'Point d\'extraction', icon: 'plane' },
  REFUEL: { id: 'REFUEL', name: 'Ravitaillement', icon: 'fuel' },
  REST_AREA: { id: 'REST_AREA', name: 'Zone de repos', icon: 'tent' },
  DANGER_ZONE: { id: 'DANGER_ZONE', name: 'Zone dangereuse', icon: 'alert-triangle' },
  CUSTOM: { id: 'CUSTOM', name: 'Personnalisé', icon: 'map-pin' },
} as const;

export type WaypointType = keyof typeof WAYPOINT_TYPES;

// Vehicle type constants for frontend
export const VEHICLE_TYPES = {
  CONVOY_1: { id: 'CONVOY_1', name: 'Véhicule 1', icon: 'convoy' },
  CONVOY_2: { id: 'CONVOY_2', name: 'Véhicule 2', icon: 'convoy' },
  CONVOY_3: { id: 'CONVOY_3', name: 'Véhicule 3', icon: 'convoy' },
  CONVOY_4: { id: 'CONVOY_4', name: 'Véhicule 4', icon: 'convoy' },
  RECO: { id: 'RECO', name: 'VBL Reconnaissance', icon: 'reco' },
  A400M: { id: 'A400M', name: 'A400M Atlas', icon: 'aircraft' },
  PC: { id: 'PC', name: 'Poste de Commandement', icon: 'hq' },
} as const;

export const ALERT_TYPES = {
  OBSTACLE: { id: 'OBSTACLE', name: 'Obstacle', icon: 'construction' },
  HOSTILE: { id: 'HOSTILE', name: 'Hostile', icon: 'warning' },
  IED_SUSPECT: { id: 'IED_SUSPECT', name: 'IED Suspect', icon: 'bomb' },
  BREAKDOWN: { id: 'BREAKDOWN', name: 'Panne véhicule', icon: 'car' },
  CIVILIAN_TRAFFIC: { id: 'CIVILIAN_TRAFFIC', name: 'Trafic civil', icon: 'traffic' },
  OTHER: { id: 'OTHER', name: 'Autre', icon: 'info' },
} as const;

export type VehicleType = keyof typeof VEHICLE_TYPES;
export type AlertType = keyof typeof ALERT_TYPES;
