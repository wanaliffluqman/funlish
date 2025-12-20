"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface MaintenanceGuardProps {
  children: ReactNode;
}

export default function MaintenanceGuard({ children }: MaintenanceGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading: authLoading } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  // Determine if user is admin
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const checkMaintenance = async () => {
      // Skip check for maintenance pages and login page
      if (
        pathname === "/maintenance" ||
        pathname === "/maintenance/admin" ||
        pathname === "/login" ||
        pathname === "/register"
      ) {
        setIsChecking(false);
        setHasChecked(true);
        return;
      }

      // Wait for auth to finish loading
      if (authLoading) {
        return;
      }

      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("setting_value")
          .eq("setting_key", "maintenance_mode")
          .single();

        if (error) {
          // Table might not exist yet - fail gracefully
          if (error.code === "PGRST116" || error.code === "42P01") {
            // No rows found or table doesn't exist - maintenance is off
            setIsMaintenanceMode(false);
          } else {
            console.error(
              "Error checking maintenance mode:",
              error.message || error.code
            );
          }
          setIsChecking(false);
          setHasChecked(true);
          return;
        }

        const maintenanceEnabled = data?.setting_value === "true";
        setIsMaintenanceMode(maintenanceEnabled);

        // If maintenance mode is on and user is not admin, redirect
        if (maintenanceEnabled) {
          // Check if user exists and is admin
          const userIsAdmin = user && user.role === "admin";

          if (!userIsAdmin) {
            router.push("/maintenance");
            return;
          }
        }
      } catch (err) {
        console.error(
          "Error checking maintenance:",
          err instanceof Error ? err.message : String(err)
        );
      } finally {
        setIsChecking(false);
        setHasChecked(true);
      }
    };

    checkMaintenance();

    // Set up periodic check only after initial check
    let interval: NodeJS.Timeout | null = null;
    if (hasChecked) {
      interval = setInterval(checkMaintenance, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pathname, authLoading, user, router, hasChecked]);

  // Show loading while auth is loading or while doing initial maintenance check
  if (authLoading || (isChecking && !hasChecked)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // If maintenance mode is on but user is admin, show a banner
  if (isMaintenanceMode && isAdmin) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white py-2 px-4 text-center text-sm font-medium shadow-lg">
          <span className="inline-flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Maintenance mode is active. Regular users cannot access the site.
            <a
              href="/maintenance/admin"
              className="underline hover:no-underline ml-2"
            >
              Manage →
            </a>
          </span>
        </div>
        <div className="pt-10">{children}</div>
      </>
    );
  }

  return <>{children}</>;
}
