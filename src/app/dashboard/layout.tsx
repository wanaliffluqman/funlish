"use client";

import SideNav from "@/components/SideNav";
import { useAuth } from "@/context/AuthContext";
import { AttendanceProvider } from "@/context/AttendanceContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, sessionInvalidated, logout } = useAuth();
  const router = useRouter();
  const [showSessionModal, setShowSessionModal] = useState(false);

  // Handle session invalidation
  useEffect(() => {
    if (sessionInvalidated) {
      setShowSessionModal(true);
    }
  }, [sessionInvalidated]);

  useEffect(() => {
    if (!isLoading && !user && !sessionInvalidated) {
      router.push("/login");
    }
  }, [user, isLoading, router, sessionInvalidated]);

  const handleSessionModalClose = () => {
    setShowSessionModal(false);
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Show session expired modal
  if (showSessionModal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8 text-center">
          {/* Warning Icon */}
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-orange-600"
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
            Session Ended
          </h2>

          {/* Message */}
          <p className="text-gray-600 mb-6">
            Your session has been ended because your account was logged in from another device or browser.
          </p>

          {/* Info Box */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0"
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
              <div className="text-sm text-orange-800">
                <p className="font-semibold mb-1">Security Notice</p>
                <p>Only one active session is allowed per account. If this wasn&apos;t you, please change your password immediately.</p>
              </div>
            </div>
          </div>

          {/* Button */}
          <button
            onClick={handleSessionModalClose}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AttendanceProvider>
      <div className="flex min-h-screen bg-gray-50">
        <SideNav userRole={user.role} />
        <main className="flex-1 ml-0 md:ml-64 transition-all duration-300 overflow-x-hidden">
          <div className="p-2 sm:p-4 md:p-6 lg:p-8 max-w-full">{children}</div>
        </main>
      </div>
    </AttendanceProvider>
  );
}
