import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public: returns the number of active listings so the logged-out landing page
// can prompt visitors to sign up ("view N+ listings"). Exposes only a count.
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ count: 0 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const today = new Date().toISOString().slice(0, 10);
  const { count } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .or(`available_to.is.null,available_to.gte.${today}`);

  return NextResponse.json({ count: count ?? 0 });
}
