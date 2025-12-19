"use client";

import { useState } from "react";
import { useAuth, getRoleDisplayName } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import type { Department } from "@/types/database.types";

// Helper function to format department name for display
function getDepartmentDisplayName(department: Department): string {
  const displayNames: Record<Department, string> = {
    administrator: "Administrator",
    pr_communication: "PR & Communication",
    protocol_ceremonial: "Protocol & Ceremonial",
    fnb: "Food & Beverage",
    sponsorship_finance: "Sponsorship & Finance",
    logistics_operations: "Logistics & Operations",
    technical_it_support: "Technical & IT Support",
    evaluation_research_documentation: "Evaluation, Research & Documentation",
    health_safety_welfare: "Health, Safety & Welfare",
    executive: "Executive",
    program_activities: "Program & Activities",
  };
  return displayNames[department] || department;
}

export default function ProfilePage() {
  const { user } = useAuth();

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setMessage({
        type: "error",
        text: "All fields are required",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({
        type: "error",
        text: "New passwords do not match",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({
        type: "error",
        text: "New password must be at least 6 characters",
      });
      return;
    }

    if (!user) {
      setMessage({
        type: "error",
        text: "User not authenticated",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      // First, verify the current password
      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("password")
        .eq("id", user.id)
        .single();

      if (fetchError || !userData) {
        setMessage({
          type: "error",
          text: "Failed to verify current password",
        });
        return;
      }

      const isValidPassword = await bcrypt.compare(
        passwordForm.currentPassword,
        userData.password
      );

      if (!isValidPassword) {
        setMessage({
          type: "error",
          text: "Current password is incorrect",
        });
        return;
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(passwordForm.newPassword, 10);

      // Update password in database
      const { error: updateError } = await supabase
        .from("users")
        .update({ password: hashedPassword })
        .eq("id", user.id);

      if (updateError) {
        setMessage({
          type: "error",
          text: "Failed to update password",
        });
        return;
      }

      setMessage({
        type: "success",
        text: "Password changed successfully!",
      });

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (err) {
      console.error("Password change error:", err);
      setMessage({
        type: "error",
        text: "An error occurred while changing password",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) {
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
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your account information and security
        </p>
      </div>

      {/* Profile Information Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {user.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Username</p>
                <p className="text-gray-900 font-medium">{user.username}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Department</p>
                <p className="text-gray-900 font-medium">
                  {getDepartmentDisplayName(user.department)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Role</p>
                <span className="inline-block bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-sm font-medium">
                  {getRoleDisplayName(user.role)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Change Password
        </h3>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <input
              type="password"
              name="currentPassword"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
              disabled={isChangingPassword}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter your current password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              name="newPassword"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              disabled={isChangingPassword}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter your new password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange}
              disabled={isChangingPassword}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Confirm your new password"
            />
          </div>

          <button
            type="submit"
            disabled={isChangingPassword}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors mt-6 disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isChangingPassword ? (
              <>
                <svg
                  className="w-5 h-5 animate-spin"
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
                Changing Password...
              </>
            ) : (
              "Change Password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
