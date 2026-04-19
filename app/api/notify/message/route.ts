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

    const { recipient_id, listing_id, listing_title, listing_address } = await req.json() as {
      recipient_id: string;
      listing_id: number;
      listing_title?: string | null;
      listing_address?: string | null;
    };

    if (!recipient_id || !listing_id) {
      return NextResponse.json({ error: "Missing fields." }, { status: 400 });
    }

    // Don't notify yourself
    if (recipient_id === user.id) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Look up recipient email
    const { data: { user: recipient } } = await serviceClient.auth.admin.getUserById(recipient_id);
    if (!recipient?.email) return NextResponse.json({ ok: true }, { status: 200 });

    const listingLabel = listing_title ?? listing_address ?? `Listing #${listing_id}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.nestco.ai";

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Nestco <noreply@nestco.ai>",
        to: recipient.email,
        subject: "You have a new message on Nestco",
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

            <h1 style="font-size: 22px; font-weight: 700; color: #0f0f0f; margin: 0 0 8px;">New message</h1>
            <p style="font-size: 15px; color: #555; margin: 0 0 28px; line-height: 1.5;">
              Someone sent you a message about <strong>${listingLabel}</strong>.
            </p>

            <a href="${appUrl}/inbox" style="display: inline-block; background: #000; color: #fff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 100px;">
              View message →
            </a>

            <p style="font-size: 12px; color: #aaa; margin-top: 40px; line-height: 1.6;">
              You're receiving this because you have a listing on Nestco.<br>
              <a href="${appUrl}" style="color: #aaa;">nestco.ai</a>
            </p>
          </div>
        `,
      }),
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to send notification." }, { status: 500 });
  }
}
