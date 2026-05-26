import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/requireAdmin";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — fetch all tasks
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const { data: tasks, error } = await supabaseAdmin
    .from("workspace_tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: tasks ?? [] });
}

// POST — create a task
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const { title, assigned_to } = body as {
    title: string;
    assigned_to: string | null;
  };

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const { data: task, error } = await supabaseAdmin
    .from("workspace_tasks")
    .insert({
      title: title.trim(),
      assigned_to: assigned_to || null,
      created_by: auth.user.id,
      completed: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ task });
}

// PATCH — toggle completed or update task
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const { id, completed, assigned_to } = body as {
    id: number;
    completed?: boolean;
    assigned_to?: string | null;
  };

  if (!id) {
    return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof completed === "boolean") {
    updates.completed = completed;
    updates.completed_at = completed ? new Date().toISOString() : null;
  }
  if (assigned_to !== undefined) {
    updates.assigned_to = assigned_to || null;
  }

  const { data: task, error } = await supabaseAdmin
    .from("workspace_tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ task });
}

// DELETE — remove a task
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const { id } = body as { id: number };

  if (!id) {
    return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("workspace_tasks")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
