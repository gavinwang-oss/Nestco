"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminEmail } from "@/lib/admin";

// Anyone can visit these
const PUBLIC_PATHS = ["/", "/activate", "/auth/callback", "/tos", "/login", "/dev-login"];

// Any authenticated user (i.e. a lister who came through magic link) can visit these
const LISTER_PATHS = ["/my-listings"];

// Everything else (/browse, /inbox, /requests, /saved, /create, /profile) requires admin

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isListerPath = LISTER_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isAdmin = isAdminEmail(user?.email);

  useEffect(() => {
    if (loading) return;
    if (isPublic) return;
    if (isListerPath) {
      if (!user) router.replace("/");
      return;
    }
    // Admin-only route
    if (!isAdmin) router.replace("/");
  }, [loading, user, pathname, isPublic, isListerPath, isAdmin, router]);

  // Public routes — always render immediately
  if (isPublic) return <>{children}</>;

  // While auth is still loading, show nothing to avoid flashing protected content
  if (loading) return null;

  // Lister-accessible routes
  if (isListerPath) return user ? <>{children}</> : null;

  // Admin-only routes
  return isAdmin ? <>{children}</> : null;
}
