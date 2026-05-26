import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/requireAdmin";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const { data, error } = await supabase
    .from("listings")
    .select("id, user_id, title, type, address, price, available_from, available_to, created_at, photos, gender_preference, furnished, pets, parking, utilities_included")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch listings" }, { status: 500 });
  }

  // Look up emails for all unique user_ids
  const userIds = [...new Set((data ?? []).map((l) => l.user_id))];
  const emailMap = new Map<string, string>();

  await Promise.all(
    userIds.map(async (uid) => {
      const { data: { user } } = await supabase.auth.admin.getUserById(uid);
      if (user?.email) emailMap.set(uid, user.email);
    })
  );

  const listings = (data ?? []).map((l) => ({
    ...l,
    user_email: emailMap.get(l.user_id) ?? null,
  }));

  return NextResponse.json({ listings });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const { listingId } = await req.json();
  if (!listingId) {
    return NextResponse.json({ error: "listingId is required" }, { status: 400 });
  }

  const { error } = await supabase.from("listings").delete().eq("id", listingId);

  if (error) {
    return NextResponse.json({ error: "Failed to delete listing" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
