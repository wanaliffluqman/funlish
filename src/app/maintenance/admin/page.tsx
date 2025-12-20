"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";

export default function MaintenanceAdminPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Login form
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Maintenance settings
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Check if already logged in as admin
  useEffect(() => {
    const checkAuth = () => {
      try {
        const storedUser = localStorage.getItem("funlish_user");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          if (user.role === "admin") {
            setIsAuthenticated(true);
            fetchMaintenanceSettings();
          }
        }
      } catch (err) {
        console.error("Error checking auth:", err);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  const fetchMaintenanceSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["maintenance_mode", "maintenance_message"]);

      if (error) {
        // Table might not exist yet
        if (error.code === "42P01") {
          console.warn(
            "site_settings table does not exist. Please run the migration SQL."
          );
        } else {
          console.error(
            "Error fetching settings:",
            error.message || error.code || JSON.stringify(error)
          );
        }
        return;
      }

      if (data && data.length > 0) {
        data.forEach((setting) => {
          if (setting.setting_key === "maintenance_mode") {
            setIsMaintenanceMode(setting.setting_value === "true");
          } else if (setting.setting_key === "maintenance_message") {
            setMaintenanceMessage(setting.setting_value);
          }
        });
      } else {
        console.warn(
          "No settings found. Please run the migration SQL to create the site_settings table."
        );
      }
    } catch (err) {
      console.error(
        "Error fetching settings:",
        err instanceof Error ? err.message : String(err)
      );
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Query for admin user
      const { data, error } = await supabase
        .from("users")
        .select("id, username, password, name, department, role, status")
        .eq("username", username.toLowerCase().trim())
        .eq("role", "admin")
        .eq("status", "active")
        .single();

      if (error || !data) {
        setError("Invalid credentials or not an admin account");
        setIsLoading(false);
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, data.password);
      if (!isValidPassword) {
        setError("Invalid credentials");
        setIsLoading(false);
        return;
      }

      // Generate session token
      const timestamp = Date.now().toString(36);
      const randomPart = Math.random().toString(36).substring(2, 15);
      const randomPart2 = Math.random().toString(36).substring(2, 15);
      const sessionToken = `${timestamp}-${randomPart}-${randomPart2}`;

      // Update session token in database
      await supabase
        .from("users")
        .update({
          session_token: sessionToken,
          session_updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);

      // Save user to localStorage (same format as AuthContext)
      const userSession = {
        id: data.id,
        username: data.username,
        name: data.name,
        department: data.department,
        role: data.role,
        sessionToken: sessionToken,
      };
      localStorage.setItem("funlish_user", JSON.stringify(userSession));

      // Admin authenticated
      setIsAuthenticated(true);
      await fetchMaintenanceSettings();
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMaintenance = async () => {
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const newValue = !isMaintenanceMode;

      const { error } = await supabase
        .from("site_settings")
        .update({ setting_value: newValue.toString() })
        .eq("setting_key", "maintenance_mode");

      if (error) {
        setError("Failed to update maintenance mode");
        return;
      }

      setIsMaintenanceMode(newValue);
      setSuccess(
        newValue
          ? "Maintenance mode enabled. All non-admin users will be redirected."
          : "Maintenance mode disabled. Site is now accessible to all users."
      );
    } catch (err) {
      console.error("Error toggling maintenance:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMessage = async () => {
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const { error } = await supabase
        .from("site_settings")
        .update({ setting_value: maintenanceMessage })
        .eq("setting_key", "maintenance_message");

      if (error) {
        setError("Failed to update maintenance message");
        return;
      }

      setSuccess("Maintenance message updated successfully");
    } catch (err) {
      console.error("Error saving message:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoToDashboard = () => {
    // Use window.location to force full page reload so AuthContext re-reads from localStorage
    window.location.href = "/dashboard";
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Login Form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50 p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <Image
                src="/Pictures/funlish-logo.svg"
                alt="Funlish Logo"
                width={60}
                height={60}
                className="w-15 h-15"
              />
            </div>

            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Admin Access Required
              </h1>
              <p className="text-gray-600">
                Login with admin credentials to manage maintenance mode
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Admin Username
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                  placeholder="Enter admin username"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
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
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
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
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Authenticating...
                  </>
                ) : (
                  <>
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
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    Login as Admin
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => router.push("/maintenance")}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Back to maintenance page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Maintenance Control Panel
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">Maintenance Control</h1>
                <p className="text-indigo-100">
                  Manage site maintenance mode settings
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Alerts */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                {success}
              </div>
            )}

            {/* Maintenance Mode Toggle */}
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Maintenance Mode
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    When enabled, all non-admin users will be redirected to the
                    maintenance page
                  </p>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isMaintenanceMode
                      ? "bg-orange-100 text-orange-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {isMaintenanceMode ? "Active" : "Inactive"}
                </div>
              </div>

              <button
                onClick={handleToggleMaintenance}
                disabled={isSaving}
                className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                  isMaintenanceMode
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-orange-600 hover:bg-orange-700 text-white"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSaving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : isMaintenanceMode ? (
                  <>
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
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Disable Maintenance Mode
                  </>
                ) : (
                  <>
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
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    Enable Maintenance Mode
                  </>
                )}
              </button>
            </div>

            {/* Maintenance Message */}
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Maintenance Message
              </h2>
              <textarea
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900 resize-none"
                placeholder="Enter the message to display during maintenance..."
              />
              <button
                onClick={handleSaveMessage}
                disabled={isSaving}
                className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
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
                    Save Message
                  </>
                )}
              </button>
            </div>

            {/* Go to Dashboard */}
            <button
              onClick={handleGoToDashboard}
              className="w-full py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
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
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Go to Dashboard
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex gap-3">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
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
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Important Note:</p>
              <p>
                When maintenance mode is enabled, only users with the{" "}
                <strong>Admin</strong> role can access the site. All other users
                will be redirected to the maintenance page. You can also access
                this control panel through the SideNav in the dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
