"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
  timestamp?: string;
}

export interface AttendanceRecord {
  id: string;
  name: string;
  role: string;
  status: "attend" | "absent" | "pending";
  photoUrl?: string;
  timestamp?: string;
  location?: LocationData;
}

interface AttendanceContextType {
  members: AttendanceRecord[];
  setMembers: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  updateMember: (id: string, updates: Partial<AttendanceRecord>) => void;
  stats: {
    total: number;
    attend: number;
    absent: number;
    pending: number;
  };
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(
  undefined
);

// Initial sample data - shared between attendance and report pages
const initialMembers: AttendanceRecord[] = [
  { id: "1", name: "Ahmad Haziq", role: "Event Director", status: "pending" },
  {
    id: "2",
    name: "Siti Nurhaliza",
    role: "Technical Lead",
    status: "pending",
  },
  {
    id: "3",
    name: "Lee Wei Ming",
    role: "Logistics Manager",
    status: "pending",
  },
  { id: "4", name: "Priya Sharma", role: "Finance Manager", status: "pending" },
  {
    id: "5",
    name: "Muhammad Aiman",
    role: "Marketing Lead",
    status: "pending",
  },
  {
    id: "6",
    name: "Jessica Tan",
    role: "Registration Coordinator",
    status: "pending",
  },
];

export function AttendanceProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<AttendanceRecord[]>(initialMembers);

  const updateMember = (id: string, updates: Partial<AttendanceRecord>) => {
    setMembers((prev) =>
      prev.map((member) =>
        member.id === id ? { ...member, ...updates } : member
      )
    );
  };

  const stats = {
    total: members.length,
    attend: members.filter((m) => m.status === "attend").length,
    absent: members.filter((m) => m.status === "absent").length,
    pending: members.filter((m) => m.status === "pending").length,
  };

  return (
    <AttendanceContext.Provider
      value={{
        members,
        setMembers,
        updateMember,
        stats,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const context = useContext(AttendanceContext);
  if (context === undefined) {
    throw new Error("useAttendance must be used within an AttendanceProvider");
  }
  return context;
}
