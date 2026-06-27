import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/requireAdmin";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — fetch all workspace members
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const { data: members, error } = await supabaseAdmin
    .from("workspace_members")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ members: members ?? [] });
}

// POST — add a workspace member (by name, no auth account needed)
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const { name } = body as { name: string };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data: member, error } = await supabaseAdmin
    .from("workspace_members")
    .insert({ name: name.trim(), added_by: auth.user.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ member });
}

// DELETE — remove a workspace member
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const { id } = body as { id: number };

  if (!id) {
    return NextResponse.json({ error: "Member ID is required" }, { status: 400 });
  }

  // Also unassign any tasks assigned to this member
  await supabaseAdmin
    .from("workspace_tasks")
    .update({ assigned_to_member: null })
    .eq("assigned_to_member", id);

  const { error } = await supabaseAdmin
    .from("workspace_members")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
