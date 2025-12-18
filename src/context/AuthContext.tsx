"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";

export type UserRole =
  | "admin"
  | "chairperson"
  | "protocol"
  | "registration_coordinator"
  | "committee";

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
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

// Mock users for demonstration - replace with real API later
const MOCK_USERS = [
  {
    id: "1",
    username: "admin",
    password: "admin123",
    name: "Super Admin",
    email: "admin@funlish.com",
    role: "admin" as UserRole,
  },
  {
    id: "2",
    username: "chairperson",
    password: "chair123",
    name: "Ahmad Chairperson",
    email: "chairperson@funlish.com",
    role: "chairperson" as UserRole,
  },
  {
    id: "3",
    username: "protocol",
    password: "protocol123",
    name: "Siti Protocol",
    email: "protocol@funlish.com",
    role: "protocol" as UserRole,
  },
  {
    id: "4",
    username: "regcoord",
    password: "regcoord123",
    name: "Lee Registration",
    email: "registration@funlish.com",
    role: "registration_coordinator" as UserRole,
  },
  {
    id: "5",
    username: "committee",
    password: "committee123",
    name: "Priya Committee",
    email: "committee@funlish.com",
    role: "committee" as UserRole,
  },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("funlish_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const foundUser = MOCK_USERS.find(
      (u) => u.username === username && u.password === password
    );

    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem("funlish_user", JSON.stringify(userWithoutPassword));
      return true;
    }

    return false;
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
