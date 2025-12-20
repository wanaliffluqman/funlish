"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const success = await login(formData.username, formData.password);

    if (success) {
      router.push("/dashboard");
    } else {
      setError("Invalid username or password");
    }

    setIsLoading(false);
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/videos/funlish-video.mp4" type="video/mp4" />
        {/* Fallback gradient if video doesn't load */}
      </video>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Login Form */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
          {/* Logo */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex items-center justify-center mb-3 sm:mb-4">
              <img
                src="/Pictures/funlish-logo.svg"
                alt="Funlish Logo"
                className="h-16 sm:h-20 md:h-24 w-auto"
              />
            </div>
            <p className="text-gray-600 text-sm sm:text-base">
              Sign in to access your event management dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Username Field */}
            <div>
              <label
                htmlFor="username"
                className="block text-xs sm:text-sm font-semibold text-gray-800 mb-2"
              >
                Username
              </label>
              <input
                type="text"
                id="username"
                required
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="w-full px-4 py-3 bg-white border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-gray-900"
                placeholder="Enter your username"
              />
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs sm:text-sm font-semibold text-gray-800 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none pr-12 text-gray-900"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
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

            {/* Remember Me & Forgot Password */}
            {/*
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-gray-600">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            */}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>

      {/* Copyright Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center z-20">
        <p className="text-white text-xs sm:text-sm opacity-80">
          © {currentYear} Aliff Luqman. All rights reserved.
        </p>
      </div>
    </div>
  );
}
