"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  useAttendance,
  type MemberAttendance,
  type LocationData,
  DEPARTMENT_DISPLAY_NAMES,
} from "@/context/AttendanceContext";
import type { Department } from "@/types/database.types";

// Helper function to get current date in Malaysia timezone (UTC+8)
function getMalaysiaDateString(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
  });
}

// Use MemberAttendance from context
type CommitteeMember = MemberAttendance;

export default function AttendancePage() {
  const { user, canEdit } = useAuth();
  const canEditAttendance = canEdit("attendance");

  // Use shared attendance context
  const {
    members,
    markAttendance,
    stats,
    isLoading,
    error,
    refreshMembers,
    selectedDate,
    setSelectedDate,
  } = useAttendance();

  // Location state - auto-detect on page load
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(
    null
  );
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [selectedMember, setSelectedMember] = useState<CommitteeMember | null>(
    null
  );
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      DEPARTMENT_DISPLAY_NAMES[member.department]
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || member.status === statusFilter;
    const matchesDepartment =
      departmentFilter === "all" || member.department === departmentFilter;
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const startCamera = async (facing: "user" | "environment" = facingMode) => {
    try {
      // Stop any existing stream first
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      // Try with ideal constraints first
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch (err) {
        // Fallback to basic constraints if ideal fails
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
        });
      }

      setStream(mediaStream);
      setFacingMode(facing);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCapturing(true);
    } catch (error: any) {
      console.error("Error accessing camera:", error);

      let errorMessage = "Unable to access camera. ";
      if (error.name === "NotReadableError") {
        errorMessage +=
          "Camera is already in use by another application or tab. Please close other applications using the camera and try again.";
      } else if (error.name === "NotAllowedError") {
        errorMessage +=
          "Camera permission denied. Please allow camera access in your browser settings.";
      } else if (error.name === "NotFoundError") {
        errorMessage += "No camera found on this device.";
      } else {
        errorMessage +=
          error.message || "Please check your camera and permissions.";
      }

      alert(errorMessage);
      setSelectedMember(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const photoData = canvas.toDataURL("image/jpeg");
        setCapturedPhoto(photoData);
        // Stop camera after capturing for smooth transition
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      }
    }
  };

  const retakePhoto = async () => {
    setCapturedPhoto(null);
    // Restart camera for retake
    await startCamera();
  };

  const switchCamera = async () => {
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    await startCamera(newFacingMode);
  };

  const confirmAttendance = async () => {
    if (selectedMember) {
      try {
        // Mark attendance with location data and user who marked it
        await markAttendance(
          selectedMember.member_id,
          "attend",
          capturedPhoto || undefined,
          currentLocation
            ? {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                accuracy: currentLocation.accuracy,
                address: currentLocation.address,
              }
            : undefined,
          user?.id
        );
        console.log(
          "Attendance confirmed for:",
          selectedMember.name,
          "at location:",
          currentLocation,
          "by user:",
          user?.name
        );
      } catch (err) {
        console.error("Error confirming attendance:", err);
        alert("Failed to confirm attendance. Please try again.");
      }
    }
    stopCamera();
    setSelectedMember(null);
    setCapturedPhoto(null);
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  };

  const viewAttendanceDetails = (member: CommitteeMember) => {
    setSelectedMember(member);
    setCapturedPhoto(member.photo_url || null);
    setViewMode(true);
  };

  const closeModal = () => {
    stopCamera();
    setSelectedMember(null);
    setCapturedPhoto(null);
    setViewMode(false);
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Auto-detect location on page load
  useEffect(() => {
    const getLocation = () => {
      if (!navigator.geolocation) {
        setLocationError("Geolocation is not supported by your browser");
        setIsLoadingLocation(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;

          // Try to get address from coordinates (reverse geocoding)
          let address = "Location detected";
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            if (data.display_name) {
              // Get a shorter address
              const parts = data.display_name.split(", ");
              address = parts.slice(0, 3).join(", ");
            }
          } catch (error) {
            console.log("Could not fetch address, using coordinates");
          }

          setCurrentLocation({
            latitude,
            longitude,
            accuracy: Math.round(accuracy),
            address,
            timestamp: new Date().toISOString(),
          });
          setIsLoadingLocation(false);
        },
        (error) => {
          let errorMessage = "Unable to get location";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage =
                "Location permission denied. Please enable location access.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information unavailable";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out";
              break;
          }
          setLocationError(errorMessage);
          setIsLoadingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000, // Cache location for 30 seconds
        }
      );
    };

    getLocation();

    // Update location every 30 seconds
    const locationInterval = setInterval(getLocation, 30000);

    return () => clearInterval(locationInterval);
  }, []);

  return (
    <div className="space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
      {/* View Only Banner */}
      {!canEditAttendance && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
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
            attendance records but cannot make changes.
          </p>
        </div>
      )}

      {/* Location Status Banner */}
      <div
        className={`mb-4 rounded-xl p-3 sm:p-4 border ${
          isLoadingLocation
            ? "bg-blue-50 border-blue-200"
            : currentLocation
            ? "bg-green-50 border-green-200"
            : "bg-red-50 border-red-200"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          {isLoadingLocation ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-blue-800">
                    Detecting location...
                  </p>
                  <p className="text-[10px] sm:text-xs text-blue-600">
                    Please wait while we get your GPS coordinates
                  </p>
                </div>
              </div>
            </>
          ) : currentLocation ? (
            <>
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-green-800 flex flex-wrap items-center gap-1 sm:gap-2">
                    <span>📍 Location Active</span>
                    <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-green-200 text-green-800">
                      ± {currentLocation.accuracy}m accuracy
                    </span>
                  </p>
                  <p className="text-[10px] sm:text-xs text-green-700 truncate">
                    {currentLocation.address}
                  </p>
                  <p className="text-[10px] sm:text-xs text-green-600 mt-0.5 truncate">
                    Lat: {currentLocation.latitude.toFixed(6)}, Lng:{" "}
                    {currentLocation.longitude.toFixed(6)}
                  </p>
                </div>
              </div>
              <a
                href={`https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-green-600 text-white text-[10px] sm:text-xs font-medium rounded-lg hover:bg-green-700 transition-colors flex-shrink-0 text-center w-full sm:w-auto"
              >
                View Map
              </a>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-red-800">
                    Location Unavailable
                  </p>
                  <p className="text-[10px] sm:text-xs text-red-600 truncate">
                    {locationError}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsLoadingLocation(true);
                  setLocationError(null);
                  window.location.reload();
                }}
                className="px-3 py-1.5 bg-red-600 text-white text-[10px] sm:text-xs font-medium rounded-lg hover:bg-red-700 transition-colors flex-shrink-0 w-full sm:w-auto text-center"
              >
                Retry
              </button>
            </>
          )}
        </div>
      </div>

      {/* Header with Date Selector */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
              Committee Attendance
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-gray-600">
              {canEditAttendance
                ? "Manage and verify committee member attendance with photo verification"
                : "View committee member attendance records"}
            </p>
          </div>
          {/* Date Selector */}
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-2 shadow-sm">
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={getMalaysiaDateString()}
              className="border-none focus:outline-none focus:ring-0 text-sm font-medium text-gray-900 bg-transparent cursor-pointer"
            />
          </div>
        </div>
        {/* Show selected date info */}
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">Showing attendance for:</span>
          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg font-semibold">
            {new Date(selectedDate).toLocaleDateString("en-MY", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
          {selectedDate === getMalaysiaDateString() && (
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
              Today
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-6 md:mb-8 overflow-hidden">
        <div className="bg-white rounded-xl p-3 sm:p-4 md:p-6 shadow-sm border border-gray-100 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mb-1 truncate">
                Total Members
              </p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                {stats.total}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-indigo-600"
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

        <div className="bg-white rounded-xl p-3 sm:p-4 md:p-6 shadow-sm border border-gray-100 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mb-1">
                Attend
              </p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600">
                {stats.attend}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-600"
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

        <div className="bg-white rounded-xl p-3 sm:p-4 md:p-6 shadow-sm border border-gray-100 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mb-1">
                Absent
              </p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600">
                {stats.absent}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="flex-1 w-full">
          <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1">
            Search
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or department..."
            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
          />
        </div>
        <div className="w-full sm:w-auto sm:min-w-[180px]">
          <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1">
            Department
          </label>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
          >
            <option value="all" className="text-gray-900">
              All Departments
            </option>
            {(Object.keys(DEPARTMENT_DISPLAY_NAMES) as Department[]).map(
              (dept) => (
                <option key={dept} value={dept} className="text-gray-900">
                  {DEPARTMENT_DISPLAY_NAMES[dept]}
                </option>
              )
            )}
          </select>
        </div>
        <div className="w-full sm:w-auto sm:min-w-[120px]">
          <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
          >
            <option value="all" className="text-gray-900">
              All Status
            </option>
            <option value="attend" className="text-gray-900">
              Attend
            </option>
            <option value="absent" className="text-gray-900">
              Absent
            </option>
          </select>
        </div>
      </div>

      {/* Members List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 md:p-6 border-b border-gray-100">
          <h2 className="text-lg md:text-xl font-bold text-gray-900">
            Committee Members
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {filteredMembers.length === 0 ? (
            <div className="p-4 text-gray-500 text-center">
              No members found.
            </div>
          ) : (
            filteredMembers.map((member) => (
              <div
                key={member.member_id}
                className="p-4 md:p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-base md:text-lg flex-shrink-0">
                      {member.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm md:text-base truncate">
                        {member.name}
                      </h3>
                      <p className="text-xs md:text-sm text-gray-600 truncate">
                        {DEPARTMENT_DISPLAY_NAMES[member.department]}
                      </p>
                      {/* Show location indicator for attended members */}
                      {member.status === "attend" && member.latitude && (
                        <p className="text-xs text-green-600 truncate flex items-center gap-1 mt-0.5">
                          <svg
                            className="w-3 h-3 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                          </svg>
                          <span className="truncate">
                            {member.address ||
                              `${member.latitude.toFixed(
                                4
                              )}, ${member.longitude?.toFixed(4)}`}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap">
                    <span
                      className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-medium text-xs md:text-sm flex-shrink-0 ${
                        member.status === "attend"
                          ? "bg-green-100 text-green-700"
                          : member.status === "absent"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {member.status === "absent"
                        ? "Absent"
                        : member.status.charAt(0).toUpperCase() +
                          member.status.slice(1)}
                    </span>
                    {member.status === "attend" && (
                      <button
                        onClick={() => viewAttendanceDetails(member)}
                        className="bg-gray-600 text-white px-4 py-2 md:px-6 rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center gap-2 text-xs md:text-sm flex-1 sm:flex-initial justify-center"
                      >
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
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        <span className="hidden sm:inline">View Details</span>
                        <span className="sm:hidden">View</span>
                      </button>
                    )}
                    {member.status === "absent" && canEditAttendance && (
                      <button
                        onClick={() => {
                          setSelectedMember(member);
                          setViewMode(false);
                          startCamera();
                        }}
                        className="bg-indigo-600 text-white px-4 py-2 md:px-6 rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2 text-xs md:text-sm flex-1 sm:flex-initial justify-center"
                      >
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
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span className="hidden sm:inline">Mark Attend</span>
                        <span className="sm:hidden">Mark</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Photo Capture Modal - Full screen on mobile for easier half-body photo */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black md:bg-black/50 flex items-center justify-center md:p-4 z-50">
          <div className="bg-white md:rounded-2xl w-full h-[100dvh] md:h-auto md:max-w-2xl md:max-h-[95vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between p-4 md:p-6 lg:p-8 pb-2 md:pb-4 flex-shrink-0">
              <div className="flex-1 min-w-0 pr-2">
                <h2 className="text-lg md:text-2xl font-bold text-gray-900 truncate">
                  {viewMode ? "Attendance Details" : "Photo Verification"}
                </h2>
                <p className="text-sm md:text-base text-gray-600 truncate">
                  {selectedMember.name} -{" "}
                  {DEPARTMENT_DISPLAY_NAMES[selectedMember.department]}
                </p>
                {viewMode && selectedMember.check_in_time && (
                  <p className="text-xs md:text-sm text-gray-500 mt-1">
                    Attended:{" "}
                    {new Date(selectedMember.check_in_time).toLocaleString(
                      "en-MY",
                      { timeZone: "Asia/Kuala_Lumpur" }
                    )}
                  </p>
                )}
                {/* Show current location when marking attendance */}
                {!viewMode && currentLocation && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
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
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="truncate">{currentLocation.address}</span>
                  </div>
                )}
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <svg
                  className="w-6 h-6"
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

            {/* Camera view - fills available space on mobile for half-body photos */}
            <div className="flex-1 mx-4 md:mx-6 lg:mx-8 bg-gray-900 rounded-xl overflow-hidden mb-4 md:mb-6 relative md:flex-none md:aspect-video">
              {!capturedPhoto ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover ${
                      facingMode === "user" ? "scale-x-[-1]" : ""
                    }`}
                  />
                  {/* Switch Camera Button - visible on mobile */}
                  {!viewMode && (
                    <button
                      onClick={switchCamera}
                      className="absolute top-3 right-3 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm"
                      title={
                        facingMode === "user"
                          ? "Switch to back camera"
                          : "Switch to front camera"
                      }
                    >
                      <svg
                        className="w-6 h-6"
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
                    </button>
                  )}
                </>
              ) : (
                <img
                  src={capturedPhoto}
                  alt="Captured"
                  className={`w-full h-full object-cover ${
                    facingMode === "user" ? "scale-x-[-1]" : ""
                  }`}
                />
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Location Details for View Mode */}
            {viewMode && selectedMember.latitude && (
              <div className="mx-4 md:mx-6 lg:mx-8 mb-4 md:mb-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
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
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-green-800 mb-1">
                      Check-in Location
                    </h4>
                    <p className="text-sm text-green-700 truncate">
                      {selectedMember.address || "Location recorded"}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-green-600">
                      <span>Lat: {selectedMember.latitude.toFixed(6)}</span>
                      <span>Lng: {selectedMember.longitude?.toFixed(6)}</span>
                      <span>Accuracy: ± {selectedMember.accuracy}m</span>
                    </div>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${selectedMember.latitude},${selectedMember.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors flex-shrink-0"
                  >
                    View Map
                  </a>
                </div>
              </div>
            )}

            <div className="flex gap-4 p-4 md:p-6 lg:p-8 pt-4 mt-auto flex-shrink-0 bg-white">
              {viewMode ? (
                <button
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-all"
                >
                  Close
                </button>
              ) : !capturedPhoto ? (
                <>
                  <button
                    onClick={closeModal}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={capturePhoto}
                    className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
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
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                    </svg>
                    Capture Photo
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={retakePhoto}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                  >
                    Retake
                  </button>
                  <button
                    onClick={confirmAttendance}
                    className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-all flex items-center justify-center gap-2"
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Confirm Attendance
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
