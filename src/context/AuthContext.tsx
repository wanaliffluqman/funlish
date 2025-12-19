"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import type { Department } from "@/types/database.types";

export type UserRole =
  | "admin"
  | "chairperson"
  | "protocol"
  | "registration_coordinator"
  | "committee";

interface User {
  id: number;
  username: string;
  name: string;
  department: Department;
  role: UserRole;
  sessionToken?: string;
}

// Generate a unique session token
function generateSessionToken(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}-${randomPart2}`;
}

// Permission types for pages
export type Permission = "full" | "view" | "none";

interface Permissions {
  dashboard: Permission;
  attendance: Permission;
  teams: Permission;
  profile: Permission;
  userManagement: Permission;
}

// Role-based permissions configuration
const ROLE_PERMISSIONS: Record<UserRole, Permissions> = {
  admin: {
    dashboard: "full",
    attendance: "full",
    teams: "full",
    profile: "full",
    userManagement: "full",
  },
  chairperson: {
    dashboard: "full",
    attendance: "full",
    teams: "full",
    profile: "full",
    userManagement: "none",
  },
  protocol: {
    dashboard: "full",
    attendance: "full",
    teams: "full",
    profile: "full",
    userManagement: "none",
  },
  registration_coordinator: {
    dashboard: "full",
    attendance: "view",
    teams: "full",
    profile: "full",
    userManagement: "none",
  },
  committee: {
    dashboard: "full",
    attendance: "view",
    teams: "view",
    profile: "full",
    userManagement: "none",
  },
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  permissions: Permissions | null;
  canEdit: (page: keyof Permissions) => boolean;
  canView: (page: keyof Permissions) => boolean;
  sessionInvalidated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session validation interval (check every 10 seconds)
const SESSION_CHECK_INTERVAL = 10000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionInvalidated, setSessionInvalidated] = useState(false);
  const sessionCheckRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Validate session against database
  const validateSession = useCallback(async (userId: number, sessionToken: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("session_token, status")
        .eq("id", userId)
        .single();

      if (error || !data) {
        return false;
      }

      // Check if user is still active and session token matches
      if (data.status !== "active" || data.session_token !== sessionToken) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }, []);

  // Handle session invalidation (logout due to another login)
  const handleSessionInvalidated = useCallback(() => {
    setSessionInvalidated(true);
    setUser(null);
    localStorage.removeItem("funlish_user");
    
    // Clear the interval
    if (sessionCheckRef.current) {
      clearInterval(sessionCheckRef.current);
      sessionCheckRef.current = null;
    }
  }, []);

  // Start session validation polling
  const startSessionValidation = useCallback((userId: number, sessionToken: string) => {
    // Clear any existing interval
    if (sessionCheckRef.current) {
      clearInterval(sessionCheckRef.current);
    }

    // Set up periodic session validation
    sessionCheckRef.current = setInterval(async () => {
      const isValid = await validateSession(userId, sessionToken);
      if (!isValid) {
        handleSessionInvalidated();
      }
    }, SESSION_CHECK_INTERVAL);
  }, [validateSession, handleSessionInvalidated]);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      const storedUser = localStorage.getItem("funlish_user");
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser) as User;
          
          // Validate the session token
          if (parsedUser.sessionToken) {
            const isValid = await validateSession(parsedUser.id, parsedUser.sessionToken);
            if (isValid) {
              setUser(parsedUser);
              startSessionValidation(parsedUser.id, parsedUser.sessionToken);
            } else {
              // Session is invalid, clear storage
              localStorage.removeItem("funlish_user");
              setSessionInvalidated(true);
            }
          } else {
            // Old session without token, need to re-login
            localStorage.removeItem("funlish_user");
          }
        } catch {
          localStorage.removeItem("funlish_user");
        }
      }
      setIsLoading(false);
    };

    checkExistingSession();

    // Cleanup on unmount
    return () => {
      if (sessionCheckRef.current) {
        clearInterval(sessionCheckRef.current);
      }
    };
  }, [validateSession, startSessionValidation]);

  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    try {
      // Reset session invalidated state
      setSessionInvalidated(false);

      // Query Supabase for user with matching username
      const { data, error } = await supabase
        .from("users")
        .select("id, username, password, name, department, role, status")
        .eq("username", username)
        .eq("status", "active")
        .single();

      if (error || !data) {
        console.error("Login error:", error?.message || "User not found");
        return false;
      }

      // Verify password using bcrypt
      const isValidPassword = await bcrypt.compare(password, data.password);
      if (!isValidPassword) {
        console.error("Login error: Invalid password");
        return false;
      }

      // Generate new session token (this invalidates any previous session)
      const newSessionToken = generateSessionToken();

      // Update session token in database
      const { error: updateError } = await supabase
        .from("users")
        .update({
          session_token: newSessionToken,
          session_updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);

      if (updateError) {
        console.error("Failed to update session token:", updateError);
        return false;
      }

      // Create user object without password but with session token
      const loggedInUser: User = {
        id: data.id,
        username: data.username,
        name: data.name,
        department: data.department,
        role: data.role as UserRole,
        sessionToken: newSessionToken,
      };

      setUser(loggedInUser);
      localStorage.setItem("funlish_user", JSON.stringify(loggedInUser));
      
      // Start session validation
      startSessionValidation(data.id, newSessionToken);
      
      return true;
    } catch (err) {
      console.error("Login error:", err);
      return false;
    }
  };

  const logout = async () => {
    // Clear session token in database
    if (user?.id) {
      try {
        await supabase
          .from("users")
          .update({
            session_token: null,
            session_updated_at: null,
          })
          .eq("id", user.id);
      } catch (err) {
        console.error("Error clearing session:", err);
      }
    }

    // Clear interval
    if (sessionCheckRef.current) {
      clearInterval(sessionCheckRef.current);
      sessionCheckRef.current = null;
    }

    setUser(null);
    setSessionInvalidated(false);
    localStorage.removeItem("funlish_user");
    router.push("/login");
  };

  const isAdmin = user?.role === "admin";
  const permissions = user ? ROLE_PERMISSIONS[user.role] : null;

  const canEdit = (page: keyof Permissions): boolean => {
    if (!permissions) return false;
    return permissions[page] === "full";
  };

  const canView = (page: keyof Permissions): boolean => {
    if (!permissions) return false;
    return permissions[page] === "full" || permissions[page] === "view";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAdmin,
        permissions,
        canEdit,
        canView,
        sessionInvalidated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Helper function to get role display name
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    admin: "Admin",
    chairperson: "Chairperson",
    protocol: "Protocol",
    registration_coordinator: "Registration Coordinator",
    committee: "Committee",
  };
  return displayNames[role];
}
