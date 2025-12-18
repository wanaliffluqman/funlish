export type UserRole =
  | "admin"
  | "chairperson"
  | "protocol"
  | "registration_coordinator"
  | "committee";

export type Department =
  | "leadership"
  | "logistics"
  | "media"
  | "registration"
  | "protocol"
  | "technical";

export type UserStatus = "active" | "inactive";

export type AttendanceStatus = "attend" | "absent" | "pending";

export interface Database {
  public: {
    Tables: {
      // Committee members who login to the system
      users: {
        Row: {
          id: string;
          username: string;
          password: string;
          name: string;
          department: Department;
          role: UserRole;
          status: UserStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          password: string;
          name: string;
          department?: Department;
          role?: UserRole;
          status?: UserStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          password?: string;
          name?: string;
          department?: Department;
          role?: UserRole;
          status?: UserStatus;
          updated_at?: string;
        };
      };
      // Groups for participant team assignment (Team A, B, C...)
      groups: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
        };
      };
      // Event participants assigned to groups
      participants: {
        Row: {
          id: string;
          name: string;
          group_id: string | null;
          registered_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          group_id?: string | null;
          registered_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          group_id?: string | null;
          registered_at?: string;
        };
      };
      // Committee attendance records
      attendance: {
        Row: {
          id: string;
          user_id: string;
          status: AttendanceStatus;
          photo_url: string | null;
          latitude: number | null;
          longitude: number | null;
          accuracy: number | null;
          address: string | null;
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: AttendanceStatus;
          photo_url?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          accuracy?: number | null;
          address?: string | null;
          timestamp?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: AttendanceStatus;
          photo_url?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          accuracy?: number | null;
          address?: string | null;
          timestamp?: string;
        };
      };
    };
  };
}

// Helper types for easier usage
export type User = Database["public"]["Tables"]["users"]["Row"];
export type Group = Database["public"]["Tables"]["groups"]["Row"];
export type Participant = Database["public"]["Tables"]["participants"]["Row"];
export type Attendance = Database["public"]["Tables"]["attendance"]["Row"];

export type InsertUser = Database["public"]["Tables"]["users"]["Insert"];
export type InsertGroup = Database["public"]["Tables"]["groups"]["Insert"];
export type InsertParticipant =
  Database["public"]["Tables"]["participants"]["Insert"];
export type InsertAttendance =
  Database["public"]["Tables"]["attendance"]["Insert"];
