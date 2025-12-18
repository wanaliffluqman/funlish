"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function DashboardLoading() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 20;
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[60vh] animate-fadeIn">
      <div className="text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl p-6 shadow-lg">
            <Image
              src="/Pictures/funlish-logo.svg"
              alt="Funlish Logo"
              width={80}
              height={80}
              className="w-16 h-16 sm:w-20 sm:h-20 animate-pulse"
            />
          </div>
        </div>

        {/* Loading Spinner */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-purple-600 rounded-full animate-spin animation-delay-150"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-indigo-600 font-bold text-sm">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-xs mx-auto mb-4">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <p className="text-gray-600 text-sm font-medium animate-pulse">
          Loading dashboard...
        </p>
      </div>
    </div>
  );
}
