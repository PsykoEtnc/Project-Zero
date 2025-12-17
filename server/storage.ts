import { 
  vehicles, alerts, missions, connectionLogs, zones, pcMessages,
  type Vehicle, type InsertVehicle,
  type Alert, type InsertAlert,
  type Mission, type InsertMission,
  type ConnectionLog, type InsertConnectionLog,
  type Zone, type InsertZone,
  type PcMessage, type InsertPcMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Vehicles
  getVehicles(): Promise<Vehicle[]>;
  getVehicle(id: string): Promise<Vehicle | undefined>;
  upsertVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehiclePosition(id: string, lat: number, lng: number, heading?: number, speed?: number): Promise<Vehicle | undefined>;
  updateVehicleStealthMode(id: string, isStealthMode: boolean): Promise<Vehicle | undefined>;
  updateVehicleConnection(id: string, isConnected: boolean): Promise<Vehicle | undefined>;

  // Alerts
  getAlerts(): Promise<Alert[]>;
  getAlert(id: string): Promise<Alert | undefined>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlertStatus(id: string, status: string, validatedBy?: string): Promise<Alert | undefined>;

  // Missions
  getCurrentMission(): Promise<Mission | undefined>;
  createMission(mission: InsertMission): Promise<Mission>;
  updateMission(id: string, updates: Partial<Mission>): Promise<Mission | undefined>;

  // Connection logs
  getConnectionLogs(): Promise<ConnectionLog[]>;
  createConnectionLog(log: InsertConnectionLog): Promise<ConnectionLog>;

  // Zones
  getZones(): Promise<Zone[]>;
  createZone(zone: InsertZone): Promise<Zone>;

  // PC Messages
  getMessages(): Promise<PcMessage[]>;
  createMessage(message: InsertPcMessage): Promise<PcMessage>;
  markMessageAsRead(id: string): Promise<PcMessage | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Vehicles
  async getVehicles(): Promise<Vehicle[]> {
    return await db.select().from(vehicles);
  }

  async getVehicle(id: string): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle || undefined;
  }

  async upsertVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const existing = await this.getVehicle(vehicle.id);
    if (existing) {
      const [updated] = await db
        .update(vehicles)
        .set({ ...vehicle, lastUpdate: new Date() })
        .where(eq(vehicles.id, vehicle.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(vehicles).values(vehicle).returning();
    return created;
  }

  async updateVehiclePosition(id: string, lat: number, lng: number, heading?: number, speed?: number): Promise<Vehicle | undefined> {
    // Validate coordinates
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.warn(`Invalid position for vehicle ${id}: lat=${lat}, lng=${lng}`);
      return undefined;
    }
    
    // Clamp heading to 0-360 and speed to non-negative
    const safeHeading = Number.isFinite(heading) ? Math.max(0, Math.min(360, heading ?? 0)) : 0;
    const safeSpeed = Number.isFinite(speed) ? Math.max(0, speed ?? 0) : 0;
    
    const [updated] = await db
      .update(vehicles)
      .set({ 
        latitude: lat, 
        longitude: lng, 
        heading: safeHeading,
        speed: safeSpeed,
        lastUpdate: new Date(),
      })
      .where(eq(vehicles.id, id))
      .returning();
    return updated || undefined;
  }

  async updateVehicleStealthMode(id: string, isStealthMode: boolean): Promise<Vehicle | undefined> {
    const [updated] = await db
      .update(vehicles)
      .set({ isStealthMode, lastUpdate: new Date() })
      .where(eq(vehicles.id, id))
      .returning();
    return updated || undefined;
  }

  async updateVehicleConnection(id: string, isConnected: boolean): Promise<Vehicle | undefined> {
    const [updated] = await db
      .update(vehicles)
      .set({ isConnected, lastUpdate: new Date() })
      .where(eq(vehicles.id, id))
      .returning();
    return updated || undefined;
  }

  // Alerts
  async getAlerts(): Promise<Alert[]> {
    return await db.select().from(alerts).orderBy(desc(alerts.createdAt));
  }

  async getAlert(id: string): Promise<Alert | undefined> {
    const [alert] = await db.select().from(alerts).where(eq(alerts.id, id));
    return alert || undefined;
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [created] = await db.insert(alerts).values({
      ...alert,
      id: randomUUID(),
    }).returning();
    return created;
  }

  async updateAlertStatus(id: string, status: string, validatedBy?: string): Promise<Alert | undefined> {
    const [updated] = await db
      .update(alerts)
      .set({ 
        status: status as any, 
        validatedBy,
        validatedAt: status !== 'PENDING' ? new Date() : null,
      })
      .where(eq(alerts.id, id))
      .returning();
    return updated || undefined;
  }

  // Missions
  async getCurrentMission(): Promise<Mission | undefined> {
    const [mission] = await db
      .select()
      .from(missions)
      .orderBy(desc(missions.createdAt))
      .limit(1);
    return mission || undefined;
  }

  async createMission(mission: InsertMission): Promise<Mission> {
    const [created] = await db.insert(missions).values({
      ...mission,
      id: randomUUID(),
    }).returning();
    return created;
  }

  async updateMission(id: string, updates: Partial<Mission>): Promise<Mission | undefined> {
    const [updated] = await db
      .update(missions)
      .set(updates)
      .where(eq(missions.id, id))
      .returning();
    return updated || undefined;
  }

  // Connection logs
  async getConnectionLogs(): Promise<ConnectionLog[]> {
    return await db.select().from(connectionLogs).orderBy(desc(connectionLogs.timestamp));
  }

  async createConnectionLog(log: InsertConnectionLog): Promise<ConnectionLog> {
    const [created] = await db.insert(connectionLogs).values({
      ...log,
      id: randomUUID(),
    }).returning();
    return created;
  }

  // Zones
  async getZones(): Promise<Zone[]> {
    return await db.select().from(zones);
  }

  async createZone(zone: InsertZone): Promise<Zone> {
    const [created] = await db.insert(zones).values(zone).returning();
    return created;
  }

  // PC Messages
  async getMessages(): Promise<PcMessage[]> {
    return await db.select().from(pcMessages).orderBy(desc(pcMessages.createdAt));
  }

  async createMessage(message: InsertPcMessage): Promise<PcMessage> {
    const [created] = await db.insert(pcMessages).values({
      ...message,
      id: randomUUID(),
    }).returning();
    return created;
  }

  async markMessageAsRead(id: string): Promise<PcMessage | undefined> {
    const [updated] = await db
      .update(pcMessages)
      .set({ readAt: new Date() })
      .where(eq(pcMessages.id, id))
      .returning();
    return updated || undefined;
  }
}

export const storage = new DatabaseStorage();
