"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface MaintenanceContextType {
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  isLoading: boolean;
  toggleMaintenanceMode: () => Promise<boolean>;
  updateMaintenanceMessage: (message: string) => Promise<boolean>;
  refreshMaintenanceStatus: () => Promise<void>;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(
  undefined
);

// Check maintenance status every 30 seconds
const MAINTENANCE_CHECK_INTERVAL = 30000;

export function MaintenanceProvider({ children }: { children: ReactNode }) {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    "We are currently performing scheduled maintenance. Please check back soon."
  );
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAdmin } = useAuth();

  // Fetch maintenance status from database
  const fetchMaintenanceStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["maintenance_mode", "maintenance_message"]);

      if (error) {
        console.error("Error fetching maintenance status:", error);
        return;
      }

      if (data) {
        data.forEach((setting) => {
          if (setting.setting_key === "maintenance_mode") {
            setIsMaintenanceMode(setting.setting_value === "true");
          } else if (setting.setting_key === "maintenance_message") {
            setMaintenanceMessage(setting.setting_value);
          }
        });
      }
    } catch (err) {
      console.error("Error fetching maintenance status:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh maintenance status
  const refreshMaintenanceStatus = useCallback(async () => {
    await fetchMaintenanceStatus();
  }, [fetchMaintenanceStatus]);

  // Toggle maintenance mode (admin only)
  const toggleMaintenanceMode = useCallback(async (): Promise<boolean> => {
    if (!isAdmin || !user) {
      console.error("Only admins can toggle maintenance mode");
      return false;
    }

    try {
      const newValue = !isMaintenanceMode;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("site_settings") as any)
        .update({
          setting_value: newValue.toString(),
          updated_by: user.id,
        })
        .eq("setting_key", "maintenance_mode");

      if (error) {
        console.error("Error toggling maintenance mode:", error);
        return false;
      }

      setIsMaintenanceMode(newValue);
      return true;
    } catch (err) {
      console.error("Error toggling maintenance mode:", err);
      return false;
    }
  }, [isAdmin, user, isMaintenanceMode]);

  // Update maintenance message (admin only)
  const updateMaintenanceMessage = useCallback(
    async (message: string): Promise<boolean> => {
      if (!isAdmin || !user) {
        console.error("Only admins can update maintenance message");
        return false;
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("site_settings") as any)
          .update({
            setting_value: message,
            updated_by: user.id,
          })
          .eq("setting_key", "maintenance_message");

        if (error) {
          console.error("Error updating maintenance message:", error);
          return false;
        }

        setMaintenanceMessage(message);
        return true;
      } catch (err) {
        console.error("Error updating maintenance message:", err);
        return false;
      }
    },
    [isAdmin, user]
  );

  // Initial fetch and periodic check
  useEffect(() => {
    fetchMaintenanceStatus();

    // Set up periodic check
    const interval = setInterval(
      fetchMaintenanceStatus,
      MAINTENANCE_CHECK_INTERVAL
    );

    return () => clearInterval(interval);
  }, [fetchMaintenanceStatus]);

  return (
    <MaintenanceContext.Provider
      value={{
        isMaintenanceMode,
        maintenanceMessage,
        isLoading,
        toggleMaintenanceMode,
        updateMaintenanceMessage,
        refreshMaintenanceStatus,
      }}
    >
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenance() {
  const context = useContext(MaintenanceContext);
  if (context === undefined) {
    throw new Error("useMaintenance must be used within a MaintenanceProvider");
  }
  return context;
}
