"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

/**
 * Team Assignment Rules:
 * - Default number of groups: 8
 * - Maximum participants per group: 5
 * - Participants are randomly assigned during registration
 *
 * Behavior:
 * - If total participants > 40, new groups are created automatically
 *   without changing existing assignments
 * - If total participants < 40, groups may have fewer than 5 members
 *   and admins may manually adjust group assignments if needed
 *
 * Notes:
 * - Existing participants are never reshuffled automatically
 * - This design ensures balanced, fair, and stable group seating
 */

interface Participant {
  id: number;
  name: string;
  registeredAt: string;
}

interface Team {
  id: number;
  name: string;
  members: Participant[];
}

const MAX_MEMBERS_PER_TEAM = 5;
const DEFAULT_TEAMS = 8;

export default function TeamsPage() {
  const { user, canEdit } = useAuth();
  const canEditTeams = canEdit("teams");

  const [teams, setTeams] = useState<Team[]>([]);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [selectedParticipant, setSelectedParticipant] = useState<{
    participant: Participant;
    fromTeamId: number;
  } | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedDestinationTeam, setSelectedDestinationTeam] = useState<
    number | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newParticipantName, setNewParticipantName] = useState("");
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState<{
    participantName: string;
    teamName: string;
  } | null>(null);
  const [isMovingParticipant, setIsMovingParticipant] = useState(false);
  const [moveResult, setMoveResult] = useState<{
    participantName: string;
    fromTeamName: string;
    toTeamName: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [deleteParticipantConfirm, setDeleteParticipantConfirm] = useState<{
    participant: Participant;
    teamId: number;
  } | null>(null);
  const [deleteTeamConfirm, setDeleteTeamConfirm] = useState<Team | null>(null);
  const [isDeletingParticipant, setIsDeletingParticipant] = useState(false);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);

  // Fetch teams and participants from Supabase
  const fetchTeamsAndParticipants = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setError(null);

      // Fetch all groups
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("*")
        .order("id", { ascending: true });

      if (groupsError) throw groupsError;

      // Fetch all participants with their group assignments
      const { data: participantsData, error: participantsError } =
        await supabase
          .from("participants")
          .select("*")
          .order("registered_at", { ascending: true });

      if (participantsError) throw participantsError;

      // Build teams structure
      const teamsMap: Team[] = (groupsData || []).map((group) => ({
        id: group.id,
        name: group.name,
        members: [],
      }));

      // Assign participants to their teams
      (participantsData || []).forEach((participant) => {
        if (participant.group_id) {
          const team = teamsMap.find((t) => t.id === participant.group_id);
          if (team) {
            team.members.push({
              id: participant.id,
              name: participant.name,
              registeredAt: participant.registered_at.split("T")[0],
            });
          }
        }
      });

      setTeams(teamsMap);
      setTotalParticipants(participantsData?.length || 0);
      if (showLoading) setError(null);
    } catch (err) {
      // Only log and show errors on initial load, not on background refresh
      if (showLoading) {
        console.error("Error fetching data:", err);
        setError("Failed to load teams and participants");
      }
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  // Initialize data on mount and auto-refresh every 2 seconds
  useEffect(() => {
    fetchTeamsAndParticipants(true);

    // Auto-refresh every 2 seconds for real-time updates
    const refreshInterval = setInterval(() => {
      fetchTeamsAndParticipants(false);
    }, 2000);

    return () => clearInterval(refreshInterval);
  }, [fetchTeamsAndParticipants]);

  const handleMoveParticipant = (
    participant: Participant,
    fromTeamId: number
  ) => {
    setSelectedParticipant({ participant, fromTeamId });
    setShowMoveModal(true);
    setOpenDropdownId(null);
  };

  const handleDeleteParticipant = async () => {
    if (!deleteParticipantConfirm || isDeletingParticipant) return;

    setIsDeletingParticipant(true);

    try {
      const { error } = await supabase
        .from("participants")
        .delete()
        .eq("id", deleteParticipantConfirm.participant.id);

      if (error) throw error;

      // Update local state
      setTeams((prevTeams) =>
        prevTeams.map((team) =>
          team.id === deleteParticipantConfirm.teamId
            ? {
                ...team,
                members: team.members.filter(
                  (m) => m.id !== deleteParticipantConfirm.participant.id
                ),
              }
            : team
        )
      );

      setTotalParticipants((prev) => prev - 1);
    } catch (err) {
      console.error("Error deleting participant:", err);
      setError("Failed to delete participant");
    } finally {
      setDeleteParticipantConfirm(null);
      setIsDeletingParticipant(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!deleteTeamConfirm || isDeletingTeam) return;

    setIsDeletingTeam(true);

    try {
      // First, delete all participants in this team
      const { error: participantsError } = await supabase
        .from("participants")
        .delete()
        .eq("group_id", deleteTeamConfirm.id);

      if (participantsError) throw participantsError;

      // Then delete the team/group
      const { error: groupError } = await supabase
        .from("groups")
        .delete()
        .eq("id", deleteTeamConfirm.id);

      if (groupError) throw groupError;

      // Update local state
      const deletedMembersCount = deleteTeamConfirm.members.length;
      setTeams((prevTeams) =>
        prevTeams.filter((team) => team.id !== deleteTeamConfirm.id)
      );
      setTotalParticipants((prev) => prev - deletedMembersCount);
    } catch (err) {
      console.error("Error deleting team:", err);
      setError("Failed to delete team");
    } finally {
      setDeleteTeamConfirm(null);
      setIsDeletingTeam(false);
    }
  };

  const confirmMove = async (toTeamId: number) => {
    if (!selectedParticipant || isMovingParticipant) return;

    setIsMovingParticipant(true);

    // Get team names before the move
    const fromTeam = teams.find((t) => t.id === selectedParticipant.fromTeamId);
    const toTeam = teams.find((t) => t.id === toTeamId);
    const participantName = selectedParticipant.participant.name;

    try {
      // Update participant's group_id in Supabase
      const { error } = await supabase
        .from("participants")
        .update({ group_id: toTeamId })
        .eq("id", selectedParticipant.participant.id);

      if (error) throw error;

      // Update local state
      setTeams((prevTeams) =>
        prevTeams.map((team) => {
          // Remove from source team
          if (team.id === selectedParticipant.fromTeamId) {
            return {
              ...team,
              members: team.members.filter(
                (m) => m.id !== selectedParticipant.participant.id
              ),
            };
          }
          // Add to destination team
          if (team.id === toTeamId) {
            return {
              ...team,
              members: [...team.members, selectedParticipant.participant],
            };
          }
          return team;
        })
      );

      // Show move result modal
      setMoveResult({
        participantName,
        fromTeamName: fromTeam?.name || "",
        toTeamName: toTeam?.name || "",
      });
    } catch (err) {
      console.error("Error moving participant:", err);
      setError("Failed to move participant");
    } finally {
      setShowMoveModal(false);
      setSelectedParticipant(null);
      setSelectedDestinationTeam(null);
      setIsMovingParticipant(false);
    }
  };

  const handleAddTeam = async () => {
    try {
      const newTeamName = `Team ${teams.length + 1}`;

      // Insert new group into Supabase
      const { data, error } = await supabase
        .from("groups")
        .insert({ name: newTeamName })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setTeams([
        ...teams,
        {
          id: data.id,
          name: data.name,
          members: [],
        },
      ]);
    } catch (err) {
      console.error("Error adding team:", err);
      setError("Failed to add team");
    }
  };

  const handleAddParticipant = async () => {
    const name = newParticipantName.trim();
    if (!name || isAddingParticipant) return;

    setIsAddingParticipant(true);

    try {
      // Find available teams (not full)
      const availableTeams = teams.filter(
        (team) => team.members.length < MAX_MEMBERS_PER_TEAM
      );

      let assignedTeamId: number;
      let assignedTeamName: string;

      if (availableTeams.length === 0) {
        // Need to create a new team first
        const newTeamName = `Team ${teams.length + 1}`;

        const { data: newGroupData, error: groupError } = await supabase
          .from("groups")
          .insert({ name: newTeamName })
          .select()
          .single();

        if (groupError) throw groupError;

        assignedTeamId = newGroupData.id;
        assignedTeamName = newGroupData.name;

        // Add new team to local state
        const newTeam: Team = {
          id: newGroupData.id,
          name: newGroupData.name,
          members: [],
        };
        setTeams((prev) => [...prev, newTeam]);
      } else {
        // Randomly select a team from available teams
        const randomTeam =
          availableTeams[Math.floor(Math.random() * availableTeams.length)];
        assignedTeamId = randomTeam.id;
        assignedTeamName = randomTeam.name;
      }

      // Insert participant into Supabase
      console.log("Registering participant with user ID:", user?.id);
      const { data: participantData, error: participantError } = await supabase
        .from("participants")
        .insert({
          name: name,
          group_id: assignedTeamId,
          registered_by: user?.id || null,
        })
        .select()
        .single();

      console.log("Participant registered:", participantData);

      if (participantError) throw participantError;

      const newParticipant: Participant = {
        id: participantData.id,
        name: participantData.name,
        registeredAt: participantData.registered_at.split("T")[0],
      };

      // Update local state - add participant to the assigned team
      setTeams((prevTeams) =>
        prevTeams.map((team) =>
          team.id === assignedTeamId
            ? { ...team, members: [...team.members, newParticipant] }
            : team
        )
      );

      setTotalParticipants((prev) => prev + 1);
      setNewParticipantName("");

      // Show assignment result modal
      setAssignmentResult({
        participantName: name,
        teamName: assignedTeamName,
      });
    } catch (err) {
      console.error("Error adding participant:", err);
      setError("Failed to add participant");
    } finally {
      setIsAddingParticipant(false);
    }
  };

  const filteredTeams = teams.filter(
    (team) =>
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.members.some((member) =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const teamStats = {
    totalTeams: teams.length,
    totalParticipants,
    averagePerTeam:
      teams.length > 0 ? (totalParticipants / teams.length).toFixed(1) : "0",
    fullTeams: teams.filter((t) => t.members.length === MAX_MEMBERS_PER_TEAM)
      .length,
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-indigo-600 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-gray-600">Loading teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-red-600 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* View Only Banner */}
      {!canEditTeams && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <svg
            className="w-5 h-5 text-yellow-600 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">View Only Mode:</span> You can view
            team assignments but cannot make changes.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Registration & Team Assignment
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          {canEditTeams
            ? "Manage team assignments and group seating"
            : "View team assignments and group seating"}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600">Total Teams</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">
                {teamStats.totalTeams}
              </p>
            </div>
            <div className="bg-indigo-100 p-2 md:p-3 rounded-lg">
              <svg
                className="w-5 h-5 md:w-6 md:h-6 text-indigo-600"
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
        </div>

        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600">
                Total Participants
              </p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">
                {teamStats.totalParticipants}
              </p>
            </div>
            <div className="bg-green-100 p-2 md:p-3 rounded-lg">
              <svg
                className="w-5 h-5 md:w-6 md:h-6 text-green-600"
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
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average per Team</p>
              <p className="text-2xl font-bold text-gray-900">
                {teamStats.averagePerTeam}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <svg
                className="w-6 h-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Full Teams</p>
              <p className="text-2xl font-bold text-gray-900">
                {teamStats.fullTeams}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
        <div className="flex items-start">
          <svg
            className="w-4 h-4 md:w-5 md:h-5 text-blue-600 mt-0.5 mr-2 md:mr-3 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-xs md:text-sm text-blue-800">
            <p className="font-semibold mb-1">Team Assignment Rules:</p>
            <ul className="list-disc list-inside space-y-0.5 md:space-y-1">
              <li>Maximum {MAX_MEMBERS_PER_TEAM} participants per team</li>
              <li>Participants are randomly assigned during registration</li>
              <li>
                New teams are created automatically when total participants
                exceed {DEFAULT_TEAMS * MAX_MEMBERS_PER_TEAM}
              </li>
              <li>Existing participants are never reshuffled automatically</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-lg shadow p-3 md:p-4 mb-4 md:mb-6">
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="flex-1 w-full">
            <div className="relative">
              <input
                type="text"
                placeholder="Search teams or participants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-600 text-gray-900"
              />
              <svg
                className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Add Participant Form */}
          {canEditTeams && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Enter participant name..."
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isAddingParticipant) {
                      handleAddParticipant();
                    }
                  }}
                  disabled={isAddingParticipant}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder:text-gray-600 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              <button
                onClick={handleAddParticipant}
                disabled={isAddingParticipant || !newParticipantName.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:bg-green-400 disabled:cursor-not-allowed min-w-[140px]"
              >
                {isAddingParticipant ? (
                  <>
                    <svg
                      className="w-4 h-4 md:w-5 md:h-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span className="hidden sm:inline">Assigning...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 md:w-5 md:h-5"
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
                    <span className="hidden sm:inline">Add Participant</span>
                    <span className="sm:hidden">Add</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        {filteredTeams.map((team) => (
          <div
            key={team.id}
            className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
          >
            {/* Team Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 md:p-4">
              <div className="flex items-center justify-between text-white">
                <h3 className="text-base md:text-lg font-bold">{team.name}</h3>
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 backdrop-blur-sm px-2 md:px-3 py-1 rounded-full">
                    <span className="text-xs md:text-sm font-semibold">
                      {team.members.length}/{MAX_MEMBERS_PER_TEAM}
                    </span>
                  </div>
                  {canEditTeams && (
                    <button
                      onClick={() => setDeleteTeamConfirm(team)}
                      className="group/delete p-1.5 md:p-2 bg-white/10 hover:bg-red-500 border border-white/20 hover:border-red-500 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg"
                      title="Delete team"
                    >
                      <svg
                        className="w-4 h-4 opacity-70 group-hover/delete:opacity-100 transition-opacity"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Team Members */}
            <div className="p-3 md:p-4">
              {team.members.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <svg
                    className="w-12 h-12 mx-auto mb-2 opacity-50"
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
                  <p className="text-sm">No members yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {team.members.map((member, index) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate">
                            {member.name}
                          </p>
                        </div>
                      </div>
                      {canEditTeams && (
                        <div className="relative ml-2 flex-shrink-0">
                          <button
                            onClick={() =>
                              setOpenDropdownId(
                                openDropdownId === member.id ? null : member.id
                              )
                            }
                            className="p-2 text-gray-900 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all"
                            title="Actions"
                          >
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
                                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                              />
                            </svg>
                          </button>
                          {openDropdownId === member.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setOpenDropdownId(null)}
                              />
                              <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                <button
                                  onClick={() =>
                                    handleMoveParticipant(member, team.id)
                                  }
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2"
                                >
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
                                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                    />
                                  </svg>
                                  Move
                                </button>
                                <button
                                  onClick={() => {
                                    setDeleteParticipantConfirm({
                                      participant: member,
                                      teamId: team.id,
                                    });
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
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
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Capacity Indicator */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Capacity</span>
                  <span
                    className={`font-semibold ${
                      team.members.length === MAX_MEMBERS_PER_TEAM
                        ? "text-red-600"
                        : team.members.length >= MAX_MEMBERS_PER_TEAM - 1
                        ? "text-yellow-600"
                        : "text-green-600"
                    }`}
                  >
                    {team.members.length === MAX_MEMBERS_PER_TEAM
                      ? "Full"
                      : `${
                          MAX_MEMBERS_PER_TEAM - team.members.length
                        } spots left`}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      team.members.length === MAX_MEMBERS_PER_TEAM
                        ? "bg-red-500"
                        : team.members.length >= MAX_MEMBERS_PER_TEAM - 1
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{
                      width: `${
                        (team.members.length / MAX_MEMBERS_PER_TEAM) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Move Participant Modal */}
      {showMoveModal && selectedParticipant && (
        <div className="fixed inset-0 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                Move {selectedParticipant.participant.name}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Select a destination team (manual moves can exceed team
                capacity)
              </p>
            </div>

            <div className="p-6 space-y-3">
              {teams
                .filter((team) => team.id !== selectedParticipant.fromTeamId)
                .map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedDestinationTeam(team.id)}
                    className={`w-full p-4 border-2 rounded-lg transition-all text-left group ${
                      selectedDestinationTeam === team.id
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-indigo-500 hover:bg-indigo-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p
                          className={`font-semibold ${
                            selectedDestinationTeam === team.id
                              ? "text-indigo-600"
                              : "text-gray-900 group-hover:text-indigo-600"
                          }`}
                        >
                          {team.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {team.members.length} members
                          {team.members.length >= MAX_MEMBERS_PER_TEAM && (
                            <span className="text-orange-600 ml-1">(Full)</span>
                          )}
                        </p>
                      </div>
                      {selectedDestinationTeam === team.id ? (
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
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-6 h-6 text-gray-400 group-hover:text-indigo-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
              <button
                onClick={() => {
                  setShowMoveModal(false);
                  setSelectedParticipant(null);
                  setSelectedDestinationTeam(null);
                }}
                disabled={isMovingParticipant}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedDestinationTeam) {
                    confirmMove(selectedDestinationTeam);
                  }
                }}
                disabled={!selectedDestinationTeam || isMovingParticipant}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  selectedDestinationTeam && !isMovingParticipant
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {isMovingParticipant ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Moving...
                  </>
                ) : (
                  "Confirm Move"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Participant Result Modal */}
      {moveResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 md:p-8 text-center">
            {/* Success Icon */}
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            </div>

            {/* Title */}
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
              Move Successful!
            </h2>

            {/* Message */}
            <p className="text-gray-600 mb-4">
              <span className="font-semibold text-gray-900">
                {moveResult.participantName}
              </span>{" "}
              has been moved to a new team:
            </p>

            {/* Team Change Display */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="bg-gray-100 px-4 py-3 rounded-xl text-center">
                <p className="text-xs text-gray-500">From</p>
                <p className="font-semibold text-gray-700">
                  {moveResult.fromTeamName}
                </p>
              </div>
              <svg
                className="w-6 h-6 text-indigo-500 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-3 rounded-xl text-center">
                <p className="text-xs opacity-90">To</p>
                <p className="font-semibold">{moveResult.toTeamName}</p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setMoveResult(null)}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* Team Assignment Result Modal */}
      {assignmentResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 md:p-8 text-center">
            {/* Success Icon */}
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            {/* Title */}
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
              Registration Successful!
            </h2>

            {/* Message */}
            <p className="text-gray-600 mb-4">
              <span className="font-semibold text-gray-900">
                {assignmentResult.participantName}
              </span>{" "}
              has been registered and assigned to:
            </p>

            {/* Team Badge */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-4 rounded-xl mb-6">
              <p className="text-sm opacity-90">Assigned Team</p>
              <p className="text-2xl font-bold">{assignmentResult.teamName}</p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setAssignmentResult(null)}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* Delete Participant Confirmation Modal */}
      {deleteParticipantConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 md:p-8 text-center">
            {/* Warning Icon */}
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600"
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
            </div>

            {/* Title */}
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
              Delete Participant?
            </h2>

            {/* Message */}
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-900">
                {deleteParticipantConfirm.participant.name}
              </span>
              ? This action cannot be undone.
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteParticipantConfirm(null)}
                disabled={isDeletingParticipant}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteParticipant}
                disabled={isDeletingParticipant}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center justify-center gap-2 disabled:bg-red-400 disabled:cursor-not-allowed"
              >
                {isDeletingParticipant ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Yes, Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Team Confirmation Modal */}
      {deleteTeamConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 md:p-8 text-center">
            {/* Warning Icon */}
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600"
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
            </div>

            {/* Title */}
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
              Delete Team?
            </h2>

            {/* Message */}
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-900">
                {deleteTeamConfirm.name}
              </span>
              ?
            </p>
            {deleteTeamConfirm.members.length > 0 && (
              <p className="text-red-600 text-sm mb-6">
                ⚠️ This will also delete {deleteTeamConfirm.members.length}{" "}
                participant{deleteTeamConfirm.members.length > 1 ? "s" : ""} in
                this team!
              </p>
            )}
            {deleteTeamConfirm.members.length === 0 && (
              <p className="text-gray-500 text-sm mb-6">
                This team has no members.
              </p>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTeamConfirm(null)}
                disabled={isDeletingTeam}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTeam}
                disabled={isDeletingTeam}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center justify-center gap-2 disabled:bg-red-400 disabled:cursor-not-allowed"
              >
                {isDeletingTeam ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Yes, Delete Team"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
