import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { listing_id, lister_id, renter_id, listing_title, listing_address } = await req.json() as {
      listing_id: number;
      lister_id: string;
      renter_id: string;
      listing_title?: string | null;
      listing_address?: string | null;
    };

    if (!listing_id || !lister_id || !renter_id) {
      return NextResponse.json({ error: "Missing fields." }, { status: 400 });
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Look up both users' emails
    const [{ data: { user: lister } }, { data: { user: renter } }] = await Promise.all([
      serviceClient.auth.admin.getUserById(lister_id),
      serviceClient.auth.admin.getUserById(renter_id),
    ]);

    const listingLabel = listing_title ?? listing_address ?? `Listing #${listing_id}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.nestco.ai";

    const emailHtml = (role: "lister" | "renter") => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #ffffff;">
        <table cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
          <tr>
            <td style="width: 32px; height: 32px; background: #000; border-radius: 8px; text-align: center; vertical-align: middle;">
              <span style="color: white; font-size: 14px; font-weight: 700; line-height: 32px;">N</span>
            </td>
            <td style="padding-left: 10px; font-size: 17px; font-weight: 600; color: #111; vertical-align: middle;">nestco</td>
          </tr>
        </table>

        <div style="font-size: 28px; margin-bottom: 16px;">🎉</div>
        <h1 style="font-size: 22px; font-weight: 700; color: #0f0f0f; margin: 0 0 8px;">You matched!</h1>
        <p style="font-size: 15px; color: #555; margin: 0 0 28px; line-height: 1.5;">
          ${role === "lister"
            ? `A renter is mutually interested in <strong>${listingLabel}</strong>. Head to your inbox to connect.`
            : `You and the lister of <strong>${listingLabel}</strong> have both expressed interest. Head to your inbox to connect.`
          }
        </p>

        <a href="${appUrl}/inbox" style="display: inline-block; background: #000; color: #fff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 100px;">
          Go to inbox →
        </a>

        <p style="font-size: 12px; color: #aaa; margin-top: 40px; line-height: 1.6;">
          <a href="${appUrl}" style="color: #aaa;">nestco.ai</a>
        </p>
      </div>
    `;

    const emails = [];
    if (lister?.email) {
      emails.push(fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Nestco <noreply@nestco.ai>",
          to: lister.email,
          subject: "You matched on Nestco! 🎉",
          html: emailHtml("lister"),
        }),
      }));
    }
    if (renter?.email) {
      emails.push(fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Nestco <noreply@nestco.ai>",
          to: renter.email,
          subject: "You matched on Nestco! 🎉",
          html: emailHtml("renter"),
        }),
      }));
    }

    await Promise.all(emails);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to send notification." }, { status: 500 });
  }
}
