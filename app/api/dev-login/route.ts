import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";

// Generates a magic link for a user without sending an email.
// Only works for admin emails — never exposes links for arbitrary users.
export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email || !isAdminEmail(email)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Missing env" }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/browse`,
    },
  });

  if (error || !data.properties?.action_link) {
    return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 500 });
  }

  return NextResponse.json({ link: data.properties.action_link });
}
