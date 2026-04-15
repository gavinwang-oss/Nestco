import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type WaitlistBody = {
  email?: unknown;
  waitlist_id?: unknown;
  intent?: unknown;
  listing_type?: unknown;
  location?: unknown;
  price?: unknown;
  available_from?: unknown;
  description?: unknown;
};

function cleanString(value: unknown, maxLength = 500): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function cleanEmail(value: unknown): string | null {
  const email = cleanString(value, 320)?.toLowerCase() ?? null;
  if (!email || !email.endsWith(".edu")) return null;
  return email;
}

function hasDetails(body: WaitlistBody): boolean {
  return Boolean(
    body.intent ||
      body.listing_type ||
      body.location ||
      body.price ||
      body.available_from ||
      body.description
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as WaitlistBody;
    const email = cleanEmail(body.email);

    if (!email) {
      return NextResponse.json({ error: "A .edu email is required." }, { status: 400 });
    }

    if (!hasDetails(body)) {
      const { data, error } = await supabase
        .from("Waitlist")
        .insert([{ email }])
        .select("id")
        .single();

      if (error) {
        if (error.code === "23505") {
          return NextResponse.json({ error: "This email is already on the waitlist." }, { status: 409 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, waitlist_id: data?.id }, { status: 200 });
    }

    if (typeof body.waitlist_id !== "number" && typeof body.waitlist_id !== "string") {
      return NextResponse.json({ error: "Missing waitlist confirmation." }, { status: 400 });
    }

    const waitlistId = String(body.waitlist_id);
    const { data, error } = await supabase
      .from("Waitlist")
      .update({
        intent: cleanString(body.intent, 20),
        listing_type: cleanString(body.listing_type, 80),
        location: cleanString(body.location, 200),
        price: cleanString(body.price, 20),
        available_from: cleanString(body.available_from, 30),
        description: cleanString(body.description, 1_000),
      })
      .eq("id", waitlistId)
      .eq("email", email)
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Waitlist entry not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
