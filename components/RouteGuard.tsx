"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminEmail } from "@/lib/admin";

// Anyone can visit these (no login required)
const PUBLIC_PATHS = ["/login", "/dev-login", "/demo", "/tos", "/about", "/auth/callback"];

// Internal-only routes — restricted to admin emails
const ADMIN_PATHS = ["/admin", "/workspace"];

// Everything else (/ [browse], /inbox, /requests, /saved, /create, /profile,
// /my-listings, /listings) requires any authenticated user.

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isAdminPath = ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isAdmin = isAdminEmail(user?.email);

  useEffect(() => {
    if (loading) return;
    if (isPublic) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    // Authenticated but not admin → keep out of admin routes
    if (isAdminPath && !isAdmin) router.replace("/");
  }, [loading, user, pathname, isPublic, isAdminPath, isAdmin, router]);

  // Public routes — always render immediately
  if (isPublic) return <>{children}</>;

  // While auth is still loading, show nothing to avoid flashing protected content
  if (loading) return null;

  // Not logged in — protected content stays hidden until redirect lands
  if (!user) return null;

  // Admin-only routes
  if (isAdminPath) return isAdmin ? <>{children}</> : null;

  // Any authenticated user
  return <>{children}</>;
}
