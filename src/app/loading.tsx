"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function Loading() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 15;
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden animate-fadeIn">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/videos/funlish-video.mp4" type="video/mp4" />
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      {/* Content */}
      <div className="relative z-10 text-center px-4">
        {/* Logo */}
        <div className="flex justify-center mb-8 animate-pulse">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20">
            <Image
              src="/Pictures/funlish-logo.svg"
              alt="Funlish Logo"
              width={120}
              height={120}
              className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40"
            />
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-2xl">
          Funlish
        </h1>

        <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-12 drop-shadow-lg font-light">
          Event Management System
        </p>

        {/* Loading Spinner */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-b-indigo-400 rounded-full animate-spin animation-delay-150"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-xs mx-auto mb-4">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <p className="text-white/90 text-sm sm:text-base font-medium animate-pulse">
          Loading your experience...
        </p>
      </div>
    </div>
  );
}
