"use client";

import SideNav from "@/components/SideNav";
import { useAuth } from "@/context/AuthContext";
import { AttendanceProvider } from "@/context/AttendanceContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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
