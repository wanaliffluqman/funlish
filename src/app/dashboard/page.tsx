"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface Activity {
  id: string;
  type: "registration" | "attendance" | "team";
  message: string;
  time: string;
  timestamp: Date;
  markedBy?: string;
}

interface Stats {
  totalParticipants: number;
  totalTeams: number;
  committeePresent: number;
  committeeTotal: number;
  attendanceRate: number;
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

export default function DashboardPage() {
  const { user, canEdit } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalParticipants: 0,
    totalTeams: 0,
    committeePresent: 0,
    committeeTotal: 0,
    attendanceRate: 0,
  });
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchDashboardData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      // Fetch participants count
      const { count: participantsCount } = await supabase
        .from("participants")
        .select("*", { count: "exact", head: true });

      // Fetch teams count
      const { count: teamsCount } = await supabase
        .from("groups")
        .select("*", { count: "exact", head: true });

      // Fetch committee members count
      const { count: committeeTotal } = await supabase
        .from("committee_members")
        .select("*", { count: "exact", head: true });

      // Fetch today's attendance
      const today = new Date().toISOString().split("T")[0];
      const { data: todayAttendance } = await supabase
        .from("attendance")
        .select("*")
        .eq("attendance_date", today)
        .eq("status", "attend");

      const committeePresent = todayAttendance?.length || 0;
      const attendanceRate = committeeTotal
        ? Math.round((committeePresent / committeeTotal) * 100)
        : 0;

      setStats({
        totalParticipants: participantsCount || 0,
        totalTeams: teamsCount || 0,
        committeePresent,
        committeeTotal: committeeTotal || 0,
        attendanceRate,
      });

      // Fetch recent activities
      const activities: Activity[] = [];

      // Get recent participant registrations (with team info if assigned)
      const { data: recentParticipants } = await supabase
        .from("participants")
        .select(
          `
          id, 
          name, 
          created_at,
          registered_by,
          groups (name)
        `
        )
        .order("created_at", { ascending: false })
        .limit(5) as { data: { id: number; name: string; created_at: string; registered_by: number | null; groups: { name: string } | null }[] | null };

      if (recentParticipants) {
        for (const p of recentParticipants) {
          const timestamp = new Date(p.created_at);
          const groupName = (p.groups as { name: string } | null)?.name;
          
          // Fetch user who registered
          let registeredByName: string | undefined;
          if (p.registered_by) {
            const { data: regUser } = await supabase
              .from("users")
              .select("name")
              .eq("id", p.registered_by)
              .single();
            registeredByName = regUser?.name;
          }

          const message = groupName
            ? `New participant registered: ${p.name} (${groupName})`
            : `New participant registered: ${p.name}`;
          activities.push({
            id: `reg-${p.id}`,
            type: "registration",
            message,
            time: getRelativeTime(timestamp),
            timestamp,
            markedBy: registeredByName,
          });
        }
      }

      // Get recent attendance records
      const { data: recentAttendance } = await supabase
        .from("attendance")
        .select(
          `
            id,
            status,
            created_at,
            marked_by,
            committee_members (name)
          `
        )
        .eq("status", "attend")
        .order("created_at", { ascending: false })
        .limit(5) as { data: { id: number; status: string; created_at: string; marked_by: number | null; committee_members: { name: string } | null }[] | null };

      if (recentAttendance) {
        for (const a of recentAttendance) {
          const timestamp = new Date(a.created_at);
          const memberName =
            (a.committee_members as { name: string } | null)?.name || "Unknown";
          
          // Fetch user who marked attendance
          let markedByName: string | undefined;
          if (a.marked_by) {
            const { data: markedUser } = await supabase
              .from("users")
              .select("name")
              .eq("id", a.marked_by)
              .single();
            markedByName = markedUser?.name;
          }

          activities.push({
            id: `att-${a.id}`,
            type: "attendance",
            message: `${memberName} marked as present`,
            time: getRelativeTime(timestamp),
            timestamp,
            markedBy: markedByName,
          });
        }
      }

      // Sort all activities by timestamp and take the most recent 8
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setRecentActivities(activities.slice(0, 8));
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(true);

    // Auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchDashboardData(false);
    }, 30000);

    // Update relative times every minute
    const timeUpdateInterval = setInterval(() => {
      setRecentActivities((prev) =>
        prev.map((activity) => ({
          ...activity,
          time: getRelativeTime(activity.timestamp),
        }))
      );
    }, 60000);

    // Set up real-time subscriptions for live updates
    const participantsSubscription = supabase
      .channel("participants-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "participants" },
        async (payload) => {
          const newParticipant = payload.new as {
            id: number;
            name: string;
            group_id: number | null;
            created_at: string;
            registered_by: number | null;
          };
          const timestamp = new Date(newParticipant.created_at);

          // Fetch the group name if assigned
          let groupName = null;
          if (newParticipant.group_id) {
            const { data: group } = await supabase
              .from("groups")
              .select("name")
              .eq("id", newParticipant.group_id)
              .single();
            groupName = group?.name;
          }

          // Fetch the user who registered the participant
          let registeredByName: string | undefined;
          if (newParticipant.registered_by) {
            const { data: registeredByUser } = await supabase
              .from("users")
              .select("name")
              .eq("id", newParticipant.registered_by)
              .single();
            registeredByName = registeredByUser?.name;
          }

          const message = groupName
            ? `New participant registered: ${newParticipant.name} (${groupName})`
            : `New participant registered: ${newParticipant.name}`;

          setRecentActivities((prev) => [
            {
              id: `reg-${newParticipant.id}-${Date.now()}`,
              type: "registration",
              message,
              time: getRelativeTime(timestamp),
              timestamp,
              markedBy: registeredByName,
            },
            ...prev.slice(0, 7),
          ]);
          setStats((prev) => ({
            ...prev,
            totalParticipants: prev.totalParticipants + 1,
          }));
        }
      )
      .subscribe();

    const attendanceSubscription = supabase
      .channel("attendance-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "attendance" },
        async (payload) => {
          const newAttendance = payload.new as {
            id: number;
            committee_member_id: number;
            status: string;
            created_at: string;
            marked_by: number | null;
          };
          if (newAttendance.status === "attend") {
            // Fetch the committee member name
            const { data: member } = await supabase
              .from("committee_members")
              .select("name")
              .eq("id", newAttendance.committee_member_id)
              .single();

            // Fetch the user who marked the attendance
            let markedByName: string | undefined;
            if (newAttendance.marked_by) {
              const { data: markedByUser } = await supabase
                .from("users")
                .select("name")
                .eq("id", newAttendance.marked_by)
                .single();
              markedByName = markedByUser?.name;
            }

            const timestamp = new Date(newAttendance.created_at);
            setRecentActivities((prev) => [
              {
                id: `att-${newAttendance.id}-${Date.now()}`,
                type: "attendance",
                message: `${member?.name || "Someone"} marked as present`,
                time: getRelativeTime(timestamp),
                timestamp,
                markedBy: markedByName,
              },
              ...prev.slice(0, 7),
            ]);
            setStats((prev) => ({
              ...prev,
              committeePresent: prev.committeePresent + 1,
              attendanceRate: prev.committeeTotal
                ? Math.round(
                    ((prev.committeePresent + 1) / prev.committeeTotal) * 100
                  )
                : 0,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(refreshInterval);
      clearInterval(timeUpdateInterval);
      supabase.removeChannel(participantsSubscription);
      supabase.removeChannel(attendanceSubscription);
    };
  }, [fetchDashboardData]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Dashboard
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Overview of your event management system
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
            <button
              onClick={() => fetchDashboardData(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
              title="Refresh data"
            >
              <svg
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 md:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 md:w-6 md:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
          </div>
          <p className="text-3xl md:text-4xl font-bold mb-1 md:mb-2">
            {loading ? "..." : stats.totalParticipants}
          </p>
          <p className="text-sm md:text-base text-indigo-100">
            Total Participants
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 md:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 md:w-6 md:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
          <p className="text-3xl md:text-4xl font-bold mb-1 md:mb-2">
            {loading ? "..." : stats.totalTeams}
          </p>
          <p className="text-sm md:text-base text-purple-100">Active Teams</p>
        </div>

        <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl p-4 md:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 md:w-6 md:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <p className="text-3xl md:text-4xl font-bold mb-1 md:mb-2">
            {loading
              ? "..."
              : `${stats.committeePresent}/${stats.committeeTotal}`}
          </p>
          <p className="text-sm md:text-base text-pink-100">Committee Attend</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 md:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 md:w-6 md:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
          </div>
          <p className="text-3xl md:text-4xl font-bold mb-1 md:mb-2">
            {loading ? "..." : `${stats.attendanceRate}%`}
          </p>
          <p className="text-sm md:text-base text-green-100">Attendance Rate</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Activities */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Recent Activities
              </h2>
              {loading && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
              )}
            </div>
          </div>
          <div className="p-6 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 p-4 animate-pulse"
                  >
                    <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p>No recent activities yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        activity.type === "registration"
                          ? "bg-indigo-100"
                          : activity.type === "attendance"
                          ? "bg-green-100"
                          : "bg-purple-100"
                      }`}
                    >
                      {activity.type === "registration" ? (
                        <svg
                          className="w-5 h-5 text-indigo-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                          />
                        </svg>
                      ) : activity.type === "attendance" ? (
                        <svg
                          className="w-5 h-5 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5 text-purple-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium">
                        {activity.message}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{activity.time}</span>
                        {activity.markedBy && (
                          <>
                            <span>•</span>
                            <span>by {activity.markedBy}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
            <p className="text-sm text-gray-500 mt-1">
              Fast access to common tasks
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Mark Attendance */}
              <Link
                href="/dashboard/attendance"
                className="p-4 sm:p-6 border-2 border-green-200 rounded-xl hover:bg-green-50 hover:border-green-300 transition-all text-center group"
              >
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-green-200 transition-colors">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="font-semibold text-gray-900 text-sm sm:text-base">
                  Mark Attendance
                </p>
                <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                  Check in committee members
                </p>
              </Link>

              {/* Manage Teams */}
              <Link
                href="/dashboard/teams"
                className="p-4 sm:p-6 border-2 border-purple-200 rounded-xl hover:bg-purple-50 hover:border-purple-300 transition-all text-center group"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-200 transition-colors">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <p className="font-semibold text-gray-900 text-sm sm:text-base">
                  Manage Teams
                </p>
                <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                  View & organize groups
                </p>
              </Link>

              {/* View Reports */}
              <Link
                href="/dashboard/report"
                className="p-4 sm:p-6 border-2 border-indigo-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all text-center group"
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-indigo-200 transition-colors">
                  <svg
                    className="w-6 h-6 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <p className="font-semibold text-gray-900 text-sm sm:text-base">
                  View Reports
                </p>
                <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                  Attendance analytics
                </p>
              </Link>

              {/* My Profile */}
              <Link
                href="/dashboard/profile"
                className="p-4 sm:p-6 border-2 border-pink-200 rounded-xl hover:bg-pink-50 hover:border-pink-300 transition-all text-center group"
              >
                <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-pink-200 transition-colors">
                  <svg
                    className="w-6 h-6 text-pink-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <p className="font-semibold text-gray-900 text-sm sm:text-base">
                  My Profile
                </p>
                <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                  Account settings
                </p>
              </Link>
            </div>

            {/* Admin Quick Actions */}
            {canEdit("userManagement") && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-amber-500"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                  </svg>
                  Admin Actions
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Manage Users */}
                  <Link
                    href="/dashboard/admin/users"
                    className="p-4 border-2 border-amber-200 rounded-xl hover:bg-amber-50 hover:border-amber-300 transition-all text-center group"
                  >
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-amber-200 transition-colors">
                      <svg
                        className="w-5 h-5 text-amber-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">
                      Manage Users
                    </p>
                  </Link>

                  {/* Register Participant */}
                  <Link
                    href="/dashboard/teams"
                    className="p-4 border-2 border-teal-200 rounded-xl hover:bg-teal-50 hover:border-teal-300 transition-all text-center group"
                  >
                    <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-teal-200 transition-colors">
                      <svg
                        className="w-5 h-5 text-teal-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                        />
                      </svg>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">
                      Add Participant
                    </p>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
