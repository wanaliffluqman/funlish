"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("funlish_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("funlish_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    try {
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

      // Create user object without password
      const loggedInUser: User = {
        id: data.id,
        username: data.username,
        name: data.name,
        department: data.department,
        role: data.role as UserRole,
      };

      setUser(loggedInUser);
      localStorage.setItem("funlish_user", JSON.stringify(loggedInUser));
      return true;
    } catch (err) {
      console.error("Login error:", err);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
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
