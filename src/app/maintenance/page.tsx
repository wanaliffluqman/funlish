"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

export default function MaintenancePage() {
  const router = useRouter();
  const [message, setMessage] = useState(
    "We are currently performing scheduled maintenance. Please check back soon."
  );
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("setting_key, setting_value")
          .in("setting_key", ["maintenance_mode", "maintenance_message"]);

        if (error) {
          // If table doesn't exist, redirect to home
          if (error.code === "42P01" || error.code === "PGRST116") {
            router.push("/");
            return;
          }
          console.error(
            "Error checking maintenance status:",
            error.message || error.code
          );
          return;
        }

        let isMaintenanceOn = false;
        if (data && data.length > 0) {
          data.forEach((setting) => {
            if (setting.setting_key === "maintenance_mode") {
              isMaintenanceOn = setting.setting_value === "true";
            } else if (setting.setting_key === "maintenance_message") {
              setMessage(setting.setting_value);
            }
          });
        }

        // If maintenance is off, redirect to home
        if (!isMaintenanceOn) {
          router.push("/");
        }
      } catch (err) {
        console.error(
          "Error checking maintenance status:",
          err instanceof Error ? err.message : String(err)
        );
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkMaintenanceStatus();

    // Check every 30 seconds if maintenance is still on
    const interval = setInterval(checkMaintenanceStatus, 30000);
    return () => clearInterval(interval);
  }, [router]);

  if (isCheckingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
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
      <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm" />

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating circles */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-pink-500/20 rounded-full blur-xl animate-float" />
        <div className="absolute top-40 right-20 w-48 h-48 bg-indigo-500/20 rounded-full blur-xl animate-float-delayed" />
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-purple-500/20 rounded-full blur-xl animate-float-slow" />
        <div className="absolute bottom-20 right-1/3 w-24 h-24 bg-yellow-500/20 rounded-full blur-xl animate-float" />

        {/* Sparkles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full animate-sparkle" />
        <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-white rounded-full animate-sparkle-delayed" />
        <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-white rounded-full animate-sparkle-slow" />
        <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-white rounded-full animate-sparkle" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          {/* Logo with bounce animation */}
          <div className="mb-8 flex justify-center animate-bounce-slow">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-2xl">
              <Image
                src="/Pictures/funlish-logo.svg"
                alt="Funlish Logo"
                width={80}
                height={80}
                className="w-20 h-20 drop-shadow-lg"
              />
            </div>
          </div>

          {/* Animated Maintenance Icon */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              {/* Pulsing ring */}
              <div className="absolute inset-0 w-36 h-36 bg-orange-500/30 rounded-full animate-ping-slow" />
              <div className="absolute inset-2 w-32 h-32 bg-orange-500/20 rounded-full animate-ping-slower" />

              {/* Main icon container */}
              <div className="relative w-36 h-36 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center shadow-2xl shadow-orange-500/30 animate-wiggle">
                {/* Gear icon with rotation */}
                <svg
                  className="w-20 h-20 text-white animate-spin-slow drop-shadow-lg"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Title with gradient text */}
          <h1 className="text-4xl md:text-5xl font-bold mb-4 animate-fade-in-up">
            <span className="bg-gradient-to-r from-white via-pink-200 to-white bg-clip-text text-transparent drop-shadow-lg">
              We&apos;ll Be Right Back!
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-white/80 mb-6 animate-fade-in-up-delayed font-medium">
            🚀 Making things even more awesome! 🎉
          </p>

          {/* Message card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20 shadow-2xl animate-fade-in-up-slow">
            <p className="text-white/90 text-lg leading-relaxed">{message}</p>
          </div>

          {/* Fun status indicator */}
          <div className="flex flex-col items-center gap-4 animate-fade-in-up-slower">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
              </span>
              <span className="text-white font-medium">
                Our team is working on it
              </span>
              <span className="animate-bounce">👨‍💻</span>
            </div>

            {/* Fun emojis */}
            <div className="flex items-center gap-4 text-3xl">
              <span className="animate-bounce" style={{ animationDelay: "0s" }}>
                🔧
              </span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "0.1s" }}
              >
                ⚡
              </span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "0.2s" }}
              >
                ✨
              </span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "0.3s" }}
              >
                🎯
              </span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "0.4s" }}
              >
                🚀
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }
        @keyframes float-delayed {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-30px) rotate(-5deg);
          }
        }
        @keyframes float-slow {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-15px);
          }
        }
        @keyframes sparkle {
          0%,
          100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes sparkle-delayed {
          0%,
          100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
        @keyframes sparkle-slow {
          0%,
          100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 0.8;
            transform: scale(0.8);
          }
        }
        @keyframes ping-slow {
          0% {
            transform: scale(1);
            opacity: 0.5;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        @keyframes ping-slower {
          0% {
            transform: scale(1);
            opacity: 0.3;
          }
          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes wiggle {
          0%,
          100% {
            transform: rotate(-3deg);
          }
          50% {
            transform: rotate(3deg);
          }
        }
        @keyframes bounce-slow {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite;
        }
        .animate-sparkle {
          animation: sparkle 2s ease-in-out infinite;
        }
        .animate-sparkle-delayed {
          animation: sparkle-delayed 2.5s ease-in-out infinite 0.5s;
        }
        .animate-sparkle-slow {
          animation: sparkle-slow 3s ease-in-out infinite 1s;
        }
        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .animate-ping-slower {
          animation: ping-slower 2.5s cubic-bezier(0, 0, 0.2, 1) infinite 0.5s;
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        .animate-wiggle {
          animation: wiggle 2s ease-in-out infinite;
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
        .animate-fade-in-up-delayed {
          animation: fade-in-up 0.6s ease-out 0.2s forwards;
          opacity: 0;
        }
        .animate-fade-in-up-slow {
          animation: fade-in-up 0.6s ease-out 0.4s forwards;
          opacity: 0;
        }
        .animate-fade-in-up-slower {
          animation: fade-in-up 0.6s ease-out 0.6s forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
