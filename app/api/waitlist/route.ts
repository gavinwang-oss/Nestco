import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type WaitlistBody = {
  email?: unknown;
  waitlist_id?: unknown;
  intent?: unknown;
  listing_type?: unknown;
  location?: unknown;
  price?: unknown;
  available_from?: unknown;
  available_to?: unknown;
  description?: unknown;
  furnished?: unknown;
  utilities_included?: unknown;
  pets?: unknown;
  parking?: unknown;
  gender_preference?: unknown;
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

function cleanBool(value: unknown): boolean {
  return value === true || value === "true";
}

function cleanInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
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
    let body: WaitlistBody;
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const fd = await req.formData();
      body = Object.fromEntries(
        [...fd.keys()].filter((k) => k !== "photos").map((k) => [k, fd.get(k)])
      ) as WaitlistBody;
      (body as Record<string, unknown>)._photoFiles = fd.getAll("photos").filter((v) => v instanceof File && v.size > 0) as File[];
    } else {
      body = (await req.json()) as WaitlistBody;
    }
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

    // If intent is "list", also save to pending_listings and send magic link
    const intent = cleanString(body.intent, 20);
    if (intent === "list") {
      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const listingType = cleanString(body.listing_type, 80);
      const address = cleanString(body.location, 200);
      const price = cleanInt(body.price);
      const availableFrom = cleanString(body.available_from, 30) || null;
      const availableTo = cleanString(body.available_to, 30) || null;
      const description = cleanString(body.description, 1_000);
      const furnished = cleanBool(body.furnished);
      const utilitiesIncluded = cleanBool(body.utilities_included);
      const pets = cleanBool(body.pets);
      const parking = cleanBool(body.parking);
      const genderPreference = cleanString(body.gender_preference, 20) ?? "any";

      // Upload photos if provided
      const photoFiles = ((body as Record<string, unknown>)._photoFiles as File[]) ?? [];
      const photoUrls: string[] = [];
      for (const file of photoFiles.slice(0, 10)) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `pending/${crypto.randomUUID()}.${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const { error: uploadError } = await serviceClient.storage
          .from("listing-photos")
          .upload(path, buffer, { contentType: file.type, upsert: false });
        if (!uploadError) {
          const { data: urlData } = serviceClient.storage.from("listing-photos").getPublicUrl(path);
          photoUrls.push(urlData.publicUrl);
        }
      }

      const { error: plError } = await serviceClient
        .from("pending_listings")
        .insert([{
          email,
          listing_type: listingType,
          address,
          price,
          available_from: availableFrom,
          available_to: availableTo,
          description,
          furnished,
          utilities_included: utilitiesIncluded,
          pets,
          parking,
          gender_preference: genderPreference,
          photos: photoUrls.length > 0 ? photoUrls : null,
          status: "pending",
        }]);

      if (plError) {
        console.error("Failed to insert pending_listing:", plError.message);
        // Non-fatal — don't block the response
      }

      // Send magic link via anon client
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: appUrl + "/auth/callback?next=/activate",
          shouldCreateUser: true,
        },
      });

      if (otpError) {
        console.error("Failed to send magic link:", otpError.message);
        // Non-fatal — waitlist entry is already saved
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
