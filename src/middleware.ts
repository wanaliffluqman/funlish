import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create a Supabase client for middleware
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files, api routes, and the maintenance page itself
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/Pictures") ||
    pathname.startsWith("/videos") ||
    pathname === "/maintenance" ||
    pathname === "/maintenance/admin" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Check if maintenance mode is enabled
    const { data, error } = await supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "maintenance_mode")
      .single();

    if (error) {
      // If there's an error (table doesn't exist yet), allow access
      console.error("Middleware error checking maintenance:", error);
      return NextResponse.next();
    }

    const isMaintenanceMode = data?.setting_value === "true";

    if (isMaintenanceMode) {
      // Check if user is admin by looking at the session in cookies/headers
      // Since we use localStorage for auth, we need to check differently
      // The client-side MaintenanceGuard will handle the actual redirection
      // But we can add a header to indicate maintenance mode
      const response = NextResponse.next();
      response.headers.set("X-Maintenance-Mode", "true");
      return response;
    }
  } catch (err) {
    console.error("Middleware error:", err);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
