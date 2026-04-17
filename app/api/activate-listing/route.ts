import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

function parsePendingPhotos(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((url): url is string => typeof url === "string");
  }
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((url): url is string => typeof url === "string")
      : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Validate token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user || !user.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Look up the most recent pending listing for this email
    const email = user.email.toLowerCase();

    const { data: pending, error: fetchError } = await serviceClient
      .from("pending_listings")
      .select("*")
      .eq("email", email)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !pending) {
      return NextResponse.json({ error: "No pending listing found." }, { status: 404 });
    }

    const parsedPhotos = parsePendingPhotos(pending.photos);
    console.log("[activate] pending.photos raw:", pending.photos);
    console.log("[activate] parsedPhotos:", parsedPhotos);

    // Insert into listings table
    const { data: newListing, error: insertError } = await serviceClient
      .from("listings")
      .insert([{
        user_id: user.id,
        title: pending.title ?? null,
        type: pending.listing_type,
        address: pending.address,
        price: pending.price,
        available_from: pending.available_from,
        available_to: pending.available_to,
        description: pending.description,
        furnished: pending.furnished ?? false,
        utilities_included: pending.utilities_included ?? false,
        pets: pending.pets ?? false,
        parking: pending.parking ?? false,
        gender_preference: pending.gender_preference ?? "any",
        num_roommates: 0,
        smokers: false,
        photos: parsedPhotos.length > 0 ? parsedPhotos : null,
      }])
      .select("id")
      .single();

    if (insertError || !newListing) {
      console.error("Failed to insert listing:", insertError?.message);
      return NextResponse.json({ error: "Failed to create listing." }, { status: 500 });
    }

    // Mark pending listing as activated
    const { error: updateError } = await serviceClient
      .from("pending_listings")
      .update({ status: "activated" })
      .eq("id", pending.id);

    if (updateError) {
      console.error("Failed to update pending_listing status:", updateError.message);
      // Non-fatal — listing is already created
    }

    return NextResponse.json({ success: true, listing_id: newListing.id }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
