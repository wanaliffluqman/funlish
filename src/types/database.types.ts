export type UserRole =
  | "admin"
  | "chairperson"
  | "protocol"
  | "registration_coordinator"
  | "committee";

export type Department =
  | "administrator"
  | "pr_communication"
  | "protocol_ceremonial"
  | "fnb"
  | "sponsorship_finance"
  | "logistics_operations"
  | "technical_it_support"
  | "evaluation_research_documentation"
  | "health_safety_welfare"
  | "executive"
  | "program_activities";

export type UserStatus = "active" | "inactive";

export type AttendanceStatus = "attend" | "absent";

export interface Database {
  public: {
    Tables: {
      // Committee members who login to the system
      users: {
        Row: {
          id: number;
          username: string;
          password: string;
          name: string;
          department: Department;
          role: UserRole;
          status: UserStatus;
          session_token: string | null;
          session_updated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          username: string;
          password: string;
          name: string;
          department?: Department;
          role?: UserRole;
          status?: UserStatus;
          session_token?: string | null;
          session_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          username?: string;
          password?: string;
          name?: string;
          department?: Department;
          role?: UserRole;
          status?: UserStatus;
          session_token?: string | null;
          session_updated_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      // Groups for participant team assignment (Team A, B, C...)
      groups: {
        Row: {
          id: number;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      // Event participants assigned to groups
      participants: {
        Row: {
          id: number;
          name: string;
          group_id: number | null;
          registered_at: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          group_id?: number | null;
          registered_at?: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          group_id?: number | null;
          registered_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "participants_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          }
        ];
      };
      // Committee members master list
      committee_members: {
        Row: {
          id: number;
          name: string;
          department: Department;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          department: Department;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          department?: Department;
        };
        Relationships: [];
      };
      // Attendance table - tracks attendance status per date (synced with committee_members)
      attendance: {
        Row: {
          id: number;
          committee_member_id: number;
          attendance_date: string;
          status: AttendanceStatus;
          photo_url: string | null;
          latitude: number | null;
          longitude: number | null;
          accuracy: number | null;
          address: string | null;
          check_in_time: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          committee_member_id: number;
          attendance_date?: string;
          status?: AttendanceStatus;
          photo_url?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          accuracy?: number | null;
          address?: string | null;
          check_in_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          committee_member_id?: number;
          attendance_date?: string;
          status?: AttendanceStatus;
          photo_url?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          accuracy?: number | null;
          address?: string | null;
          check_in_time?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_committee_member_id_fkey";
            columns: ["committee_member_id"];
            isOneToOne: false;
            referencedRelation: "committee_members";
            referencedColumns: ["id"];
          }
        ];
      };
      // Site settings table - stores maintenance mode and other settings
      site_settings: {
        Row: {
          id: number;
          setting_key: string;
          setting_value: string;
          updated_by: number | null;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          setting_key: string;
          setting_value: string;
          updated_by?: number | null;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          setting_key?: string;
          setting_value?: string;
          updated_by?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Helper types for easier usage
export type User = Database["public"]["Tables"]["users"]["Row"];
export type Group = Database["public"]["Tables"]["groups"]["Row"];
export type Participant = Database["public"]["Tables"]["participants"]["Row"];
export type CommitteeMember =
  Database["public"]["Tables"]["committee_members"]["Row"];
export type Attendance = Database["public"]["Tables"]["attendance"]["Row"];
export type SiteSetting = Database["public"]["Tables"]["site_settings"]["Row"];

export type InsertUser = Database["public"]["Tables"]["users"]["Insert"];
export type InsertGroup = Database["public"]["Tables"]["groups"]["Insert"];
export type InsertParticipant =
  Database["public"]["Tables"]["participants"]["Insert"];
export type InsertAttendance =
  Database["public"]["Tables"]["attendance"]["Insert"];
export type InsertSiteSetting =
  Database["public"]["Tables"]["site_settings"]["Insert"];
