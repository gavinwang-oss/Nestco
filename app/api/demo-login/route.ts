import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const DEMO_EMAIL = "demo@nestco.ai";
const DEMO_PASSWORD = "nestco-demo-2025";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (
    email?.toLowerCase() !== DEMO_EMAIL ||
    password !== DEMO_PASSWORD
  ) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: DEMO_EMAIL,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/browse`,
    },
  });

  if (error || !data.properties?.action_link) {
    return NextResponse.json({ error: error?.message ?? "Failed to generate link" }, { status: 500 });
  }

  return NextResponse.json({ link: data.properties.action_link });
}
