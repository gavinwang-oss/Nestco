import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type WaitlistBody = {
  email?: unknown;
  waitlist_id?: unknown;
  intent?: unknown;
  listing_type?: unknown;
  listing_title?: unknown;
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
      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      let waitlistId: string | number | null = null;
      let isNewEntry = false;

      const { data, error } = await serviceClient
        .from("Waitlist")
        .insert([{ email }])
        .select("id")
        .single();

      if (error) {
        if (error.code === "23505") {
          // Email already exists — look up existing ID so the lister form can still proceed
          const { data: existing } = await serviceClient
            .from("Waitlist")
            .select("id")
            .eq("email", email)
            .single();
          waitlistId = existing?.id ?? null;
          // Already registered user — don't re-send confirmation email
        } else {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      } else {
        waitlistId = data?.id ?? null;
        isNewEntry = true;
      }

      if (isNewEntry) {
        // Send confirmation email — ignore errors so they never break the response
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.nestco.ai";
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Nestco <noreply@nestco.ai>",
              to: email,
              subject: "You're on the Nestco waitlist 🎉",
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #ffffff;">
                  <table cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                    <tr>
                      <td style="width: 32px; height: 32px; background: #000; border-radius: 8px; text-align: center; vertical-align: middle;">
                        <span style="color: white; font-size: 14px; font-weight: 700; line-height: 32px;">N</span>
                      </td>
                      <td style="padding-left: 10px; font-size: 17px; font-weight: 600; color: #111; vertical-align: middle;">nestco</td>
                    </tr>
                  </table>

                  <h1 style="font-size: 22px; font-weight: 700; color: #0f0f0f; margin: 0 0 8px;">You're on the list!</h1>
                  <p style="font-size: 15px; color: #555; margin: 0 0 24px; line-height: 1.6;">
                    Thanks for joining Nestco — the student sublet marketplace built for UC Berkeley.
                    We're launching soon and you'll be among the first to get access.
                  </p>
                  <p style="font-size: 15px; color: #555; margin: 0 0 28px; line-height: 1.6;">
                    In the meantime, if you have a place to sublet, reply to this email or visit the site to list it now.
                  </p>

                  <a href="${appUrl}" style="display: inline-block; background: #000; color: #fff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 100px;">
                    Visit Nestco →
                  </a>

                  <p style="font-size: 12px; color: #aaa; margin-top: 40px; line-height: 1.6;">
                    Questions? Reply to this email or reach us at <a href="mailto:support@nestco.ai" style="color: #aaa;">support@nestco.ai</a><br>
                    <a href="${appUrl}" style="color: #aaa;">nestco.ai</a>
                  </p>
                </div>
              `,
            }),
          });
        } catch { /* ignore */ }
      }

      return NextResponse.json({ success: true, waitlist_id: waitlistId }, { status: 200 });
    }

    if (typeof body.waitlist_id !== "number" && typeof body.waitlist_id !== "string") {
      return NextResponse.json({ error: "Missing waitlist confirmation." }, { status: 400 });
    }

    const waitlistId = String(body.waitlist_id);

    // Use service client to bypass RLS (Waitlist table only allows anon INSERT)
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await serviceClient
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
      const listingType = cleanString(body.listing_type, 80);
      const listingTitle = cleanString(body.listing_title, 120);
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
          title: listingTitle,
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
          photos: photoUrls.length > 0 ? JSON.stringify(photoUrls) : null,
          status: "pending",
        }]);

      if (plError) {
        console.error("Failed to insert pending_listing:", plError.message);
        return NextResponse.json({ error: "Failed to save your listing details." }, { status: 500 });
      }

      // Generate magic link via admin API (no Supabase-sent email) then send custom email via Resend
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.nestco.ai";
      const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: appUrl + "/auth/callback?next=/activate" },
      });

      if (linkError) {
        console.error("Failed to generate magic link:", linkError.message);
        return NextResponse.json({
          error: "Your listing was saved but we couldn't send the email. Please try again shortly.",
        }, { status: 500 });
      }

      const magicLink = linkData.properties?.action_link ?? "";

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Nestco <noreply@nestco.ai>",
          to: email,
          subject: "Publish your listing on Nestco",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #ffffff;">
              <table cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <td style="width: 32px; height: 32px; background: #000; border-radius: 8px; text-align: center; vertical-align: middle;">
                    <span style="color: white; font-size: 14px; font-weight: 700; line-height: 32px;">N</span>
                  </td>
                  <td style="padding-left: 10px; font-size: 17px; font-weight: 600; color: #111; vertical-align: middle;">nestco</td>
                </tr>
              </table>

              <h1 style="font-size: 22px; font-weight: 700; color: #0f0f0f; margin: 0 0 8px;">Your listing is ready to publish</h1>
              <p style="font-size: 15px; color: #555; margin: 0 0 24px; line-height: 1.6;">
                We've got your listing details. Click the button below to publish it on Nestco and start getting matched with renters.
              </p>
              <p style="font-size: 13px; color: #888; margin: 0 0 28px;">This link expires in 24 hours.</p>

              <a href="${magicLink}" style="display: inline-block; background: #000; color: #fff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 100px;">
                Publish my listing →
              </a>

              <p style="font-size: 12px; color: #aaa; margin-top: 40px; line-height: 1.6;">
                Questions? Reply to this email or reach us at <a href="mailto:support@nestco.ai" style="color: #aaa;">support@nestco.ai</a><br>
                <a href="${appUrl}" style="color: #aaa;">nestco.ai</a>
              </p>
            </div>
          `,
        }),
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
