import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { VehicleType } from "@shared/schema";
import { VEHICLE_TYPES } from "@shared/schema";

interface RoleContextType {
  currentRole: VehicleType | null;
  setCurrentRole: (role: VehicleType) => void;
  isPC: boolean;
  isAircraft: boolean;
  canSeeFullMap: boolean;
  vehicleName: string;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

const ROLE_STORAGE_KEY = "acting_current_role";

export function RoleProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRoleState] = useState<VehicleType | null>(() => {
    const stored = localStorage.getItem(ROLE_STORAGE_KEY);
    return stored ? (stored as VehicleType) : null;
  });

  useEffect(() => {
    if (currentRole) {
      localStorage.setItem(ROLE_STORAGE_KEY, currentRole);
    }
  }, [currentRole]);

  const setCurrentRole = (role: VehicleType) => {
    setCurrentRoleState(role);
  };

  const isPC = currentRole === "PC";
  const isAircraft = currentRole === "A400M";
  const canSeeFullMap = isPC || isAircraft;
  const vehicleName = currentRole ? VEHICLE_TYPES[currentRole].name : "";

  return (
    <RoleContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        isPC,
        isAircraft,
        canSeeFullMap,
        vehicleName,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
