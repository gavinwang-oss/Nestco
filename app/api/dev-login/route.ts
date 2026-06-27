import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Hardcoded list of accounts that can be accessed via /dev-login.
// Never include real user accounts here.
const DEV_EMAILS = ["developer@nestco.edu", "gavin_wang@berkeley.edu"];

// Generates a magic link for a test account without sending an email.
// Only works locally (NODE_ENV === 'development') for whitelisted dev emails.
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { email } = await req.json();

  if (!email || !DEV_EMAILS.includes(email.toLowerCase())) {
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
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/`,
    },
  });

  if (error || !data.properties?.action_link) {
    return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 500 });
  }

  return NextResponse.json({ link: data.properties.action_link });
}
