import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/requireAdmin";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type DayCount = { date: string; count: number };

function countByDay(rows: { created_at: string }[] | null): DayCount[] {
  if (!rows) return [];
  const map = new Map<string, number>();
  for (const row of rows) {
    const day = row.created_at.slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const [
    listingsResult,
    messagesResult,
    matchesResult,
    requestsResult,
    waitlistResult,
    profilesResult,
    pendingResult,
    recentListings,
    recentMessages,
    recentWaitlist,
    recentMatches,
  ] = await Promise.all([
    supabase.from("listings").select("id, created_at, available_to", { count: "exact" }),
    supabase.from("messages").select("id", { count: "exact" }),
    supabase.from("matches").select("id, matched_at", { count: "exact" }),
    supabase.from("requests").select("id, is_active", { count: "exact" }),
    supabase.from("Waitlist").select("id", { count: "exact" }),
    supabase.from("profiles").select("user_id", { count: "exact" }),
    supabase.from("pending_listings").select("id, status", { count: "exact" }),
    supabase.from("listings").select("created_at").gte("created_at", thirtyDaysAgo),
    supabase.from("messages").select("created_at").gte("created_at", thirtyDaysAgo),
    supabase.from("Waitlist").select("created_at").gte("created_at", thirtyDaysAgo),
    supabase.from("matches").select("matched_at").not("matched_at", "is", null).gte("matched_at", thirtyDaysAgo),
  ]);

  const listings = listingsResult.data ?? [];
  const activeListings = listings.filter(
    (l) => !l.available_to || l.available_to >= today
  ).length;
  const expiredListings = listings.filter(
    (l) => l.available_to && l.available_to < today
  ).length;

  const mutualMatches = (matchesResult.data ?? []).filter((m) => m.matched_at).length;

  const requests = requestsResult.data ?? [];
  const activeRequests = requests.filter((r) => r.is_active).length;

  const pending = pendingResult.data ?? [];
  const pendingCount = pending.filter((p) => p.status === "pending").length;

  // Messages this week
  const messagesThisWeek = (recentMessages.data ?? []).filter(
    (m) => m.created_at.slice(0, 10) >= sevenDaysAgo
  ).length;

  return NextResponse.json({
    counts: {
      totalListings: listingsResult.count ?? 0,
      activeListings,
      expiredListings,
      totalMessages: messagesResult.count ?? 0,
      messagesThisWeek,
      totalMatches: matchesResult.count ?? 0,
      mutualMatches,
      totalRequests: requestsResult.count ?? 0,
      activeRequests,
      waitlistSize: waitlistResult.count ?? 0,
      totalUsers: profilesResult.count ?? 0,
      pendingListings: pendingCount,
    },
    timeSeries: {
      listings: countByDay(recentListings.data as { created_at: string }[] | null),
      messages: countByDay(recentMessages.data as { created_at: string }[] | null),
      waitlist: countByDay(recentWaitlist.data as { created_at: string }[] | null),
      matches: countByDay(
        (recentMatches.data ?? []).map((m) => ({ created_at: m.matched_at })) as { created_at: string }[]
      ),
    },
  });
}
