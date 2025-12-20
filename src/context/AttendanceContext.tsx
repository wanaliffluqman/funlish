"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { uploadAttendancePhoto, isBase64Image } from "@/lib/storage";
import type { Department } from "@/types/database.types";

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
  timestamp?: string;
}

// Committee Member from database
export interface CommitteeMember {
  id: number;
  name: string;
  department: Department;
  created_at: string;
}

// Attendance Record from database (only exists when marked)
export interface AttendanceRecord {
  id: number;
  committee_member_id: number;
  attendance_date: string;
  status: "attend" | "absent";
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  address: string | null;
  check_in_time: string | null;
  created_at: string;
  updated_at: string;
}

// Combined view for UI - member with their attendance status for selected date
export interface MemberAttendance {
  member_id: number;
  name: string;
  department: Department;
  // Attendance data (null if no record exists for this date)
  attendance_id: number | null;
  attendance_date: string;
  status: "attend" | "absent"; // not_marked = no record yet
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  address: string | null;
  check_in_time: string | null;
}

// Department display names
export const DEPARTMENT_DISPLAY_NAMES: Record<Department, string> = {
  administrator: "Administrator",
  pr_communication: "PR & Communication",
  protocol_ceremonial: "Protocol & Ceremonial",
  fnb: "F&B",
  sponsorship_finance: "Sponsorship & Finance",
  logistics_operations: "Logistics & Operations",
  technical_it_support: "Technical & IT Support",
  evaluation_research_documentation: "Evaluation, Research & Documentation",
  health_safety_welfare: "Health, Safety & Welfare",
  executive: "Executive",
  program_activities: "Program & Activities",
};

interface AttendanceContextType {
  members: MemberAttendance[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  markAttendance: (
    memberId: number,
    status: "attend" | "absent",
    photoUrl?: string,
    location?: LocationData
  ) => Promise<void>;
  refreshMembers: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  stats: {
    total: number;
    attend: number;
    absent: number;
  };
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(
  undefined
);

// Helper function to get current date in Malaysia timezone (UTC+8)
function getMalaysiaDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
}

export function AttendanceProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<MemberAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track selected date (default to today in Malaysia timezone)
  const [selectedDate, setSelectedDate] = useState<string>(
    getMalaysiaDateString()
  );

  // Fetch all committee members and their attendance for selected date
  const fetchMembers = async (date?: string, showLoading = true) => {
    const targetDate = date || selectedDate;

    try {
      if (showLoading) {
        setIsLoading(true);
        setError(null);
      }

      // Get all committee members
      const { data: committeeMembers, error: membersError } = await supabase
        .from("committee_members")
        .select("*")
        .order("id", { ascending: true });

      if (membersError) throw membersError;

      // Get attendance records for this date
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from("attendance")
        .select("*")
        .eq("attendance_date", targetDate);

      if (attendanceError) throw attendanceError;

      // Create a map of attendance by committee_member_id
      const attendanceMap = new Map<number, AttendanceRecord>();
      (attendanceRecords || []).forEach((record: AttendanceRecord) => {
        attendanceMap.set(record.committee_member_id, record);
      });

      // Combine committee members with their attendance
      const combined: MemberAttendance[] = (committeeMembers || []).map(
        (member: CommitteeMember) => {
          const attendance = attendanceMap.get(member.id);
          return {
            member_id: member.id,
            name: member.name,
            department: member.department,
            attendance_id: attendance?.id || null,
            attendance_date: targetDate,
            status: attendance ? attendance.status : "absent",
            photo_url: attendance?.photo_url || null,
            latitude: attendance?.latitude || null,
            longitude: attendance?.longitude || null,
            accuracy: attendance?.accuracy || null,
            address: attendance?.address || null,
            check_in_time: attendance?.check_in_time || null,
          };
        }
      );

      setMembers(combined);
    } catch (err) {
      // Only log and show errors on initial load, not on background refresh
      if (showLoading) {
        console.error("Error fetching members:", err);
        setError("Failed to load members");
      }
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // Load members when date changes and auto-refresh every 2 seconds
  useEffect(() => {
    fetchMembers(selectedDate, true);

    // Auto-refresh every 2 seconds for real-time updates
    const refreshInterval = setInterval(() => {
      fetchMembers(selectedDate, false);
    }, 2000);

    return () => clearInterval(refreshInterval);
  }, [selectedDate]);

  // Mark attendance for a member (INSERT or UPDATE)
  const markAttendance = async (
    memberId: number,
    status: "attend" | "absent",
    photoUrl?: string,
    location?: LocationData
  ) => {
    try {
      // Find the member
      const member = members.find((m) => m.member_id === memberId);
      if (!member) throw new Error("Member not found");

      // Handle photo upload if base64
      let finalPhotoUrl = photoUrl || null;
      if (photoUrl && isBase64Image(photoUrl)) {
        finalPhotoUrl = await uploadAttendancePhoto(
          photoUrl,
          memberId.toString(),
          selectedDate
        );
      }

      // Prepare attendance data
      const attendanceData = {
        committee_member_id: memberId,
        attendance_date: selectedDate,
        status,
        photo_url: finalPhotoUrl,
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        accuracy: location?.accuracy || null,
        address: location?.address || null,
        check_in_time: status === "attend" ? new Date().toISOString() : null,
      };

      if (member.attendance_id) {
        // UPDATE existing record
        const { error: updateError } = await supabase
          .from("attendance")
          .update(attendanceData)
          .eq("id", member.attendance_id);

        if (updateError) throw updateError;

        // Update local state
        setMembers((prev) =>
          prev.map((m) =>
            m.member_id === memberId
              ? {
                  ...m,
                  status,
                  photo_url: finalPhotoUrl,
                  latitude: location?.latitude || null,
                  longitude: location?.longitude || null,
                  accuracy: location?.accuracy || null,
                  address: location?.address || null,
                  check_in_time:
                    status === "attend" ? new Date().toISOString() : null,
                }
              : m
          )
        );
      } else {
        // INSERT new record
        const { data: newRecord, error: insertError } = await supabase
          .from("attendance")
          .insert(attendanceData)
          .select()
          .single();

        if (insertError) throw insertError;

        // Update local state with the new attendance_id
        setMembers((prev) =>
          prev.map((m) =>
            m.member_id === memberId
              ? {
                  ...m,
                  attendance_id: newRecord.id,
                  status,
                  photo_url: finalPhotoUrl,
                  latitude: location?.latitude || null,
                  longitude: location?.longitude || null,
                  accuracy: location?.accuracy || null,
                  address: location?.address || null,
                  check_in_time:
                    status === "attend" ? new Date().toISOString() : null,
                }
              : m
          )
        );
      }
    } catch (err) {
      console.error("Error marking attendance:", err);
      throw err;
    }
  };

  const refreshMembers = async () => {
    await fetchMembers(selectedDate);
  };

  // Handle date change
  const handleSetSelectedDate = (date: string) => {
    setSelectedDate(date);
  };

  const stats = {
    total: members.length,
    attend: members.filter((m) => m.status === "attend").length,
    absent: members.filter((m) => m.status === "absent").length,
  };

  return (
    <AttendanceContext.Provider
      value={{
        members,
        selectedDate,
        setSelectedDate: handleSetSelectedDate,
        markAttendance,
        refreshMembers,
        isLoading,
        error,
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
