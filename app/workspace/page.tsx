"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────

type Task = {
  id: number;
  title: string;
  assigned_to: string | null;
  created_by: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
};

type TeamMember = {
  id: string;
  email: string;
  name: string | null;
};

// ── Helpers ────────────────────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function displayName(member: TeamMember): string {
  return member.name || member.email.split("@")[0];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Task Item ──────────────────────────────────────────────────────────

function TaskItem({
  task,
  team,
  currentUserId,
  onToggle,
  onDelete,
  onAssign,
}: {
  task: Task;
  team: TeamMember[];
  currentUserId: string;
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
  onAssign: (id: number, userId: string | null) => void;
}) {
  const [showAssign, setShowAssign] = useState(false);
  const creator = team.find((m) => m.id === task.created_by);
  const assignee = task.assigned_to
    ? team.find((m) => m.id === task.assigned_to)
    : null;
  const isSuggested =
    task.assigned_to && task.created_by !== task.assigned_to;

  return (
    <div
      className={`group flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors ${
        task.completed ? "opacity-60" : ""
      }`}
    >
      <button
        onClick={() => onToggle(task.id, !task.completed)}
        className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          task.completed
            ? "bg-green-500 border-green-500 text-white"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        {task.completed && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${
            task.completed
              ? "line-through text-gray-400"
              : "text-gray-900"
          }`}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {isSuggested && task.assigned_to === currentUserId && (
            <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-600 rounded">
              Suggested by {creator ? displayName(creator) : "someone"}
            </span>
          )}
          {isSuggested && task.created_by === currentUserId && assignee && (
            <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-purple-50 text-purple-600 rounded">
              Suggested to {displayName(assignee)}
            </span>
          )}
          {assignee && !isSuggested && (
            <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded">
              {displayName(assignee)}
            </span>
          )}
          <span className="text-[10px] text-gray-400">
            {timeAgo(task.created_at)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="relative">
          <button
            onClick={() => setShowAssign(!showAssign)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Assign / suggest to someone"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </button>
          {showAssign && (
            <div className="absolute right-0 top-8 z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-48">
              <button
                onClick={() => { onAssign(task.id, null); setShowAssign(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 text-gray-600"
              >
                Company-wide (unassign)
              </button>
              {team.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { onAssign(task.id, m.id); setShowAssign(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${
                    task.assigned_to === m.id ? "text-blue-600 font-medium" : "text-gray-700"
                  }`}
                >
                  {displayName(m)} {m.id === currentUserId ? "(you)" : ""}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => onDelete(task.id)}
          className="p-1 text-gray-400 hover:text-red-500 rounded"
          title="Delete task"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Add Task Input ─────────────────────────────────────────────────────

function AddTaskInput({
  placeholder,
  assignedTo,
  onAdd,
}: {
  placeholder: string;
  assignedTo: string | null;
  onAdd: (title: string, assignedTo: string | null) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [adding, setAdding] = useState(false);

  const handleSubmit = async () => {
    if (!value.trim() || adding) return;
    setAdding(true);
    await onAdd(value.trim(), assignedTo);
    setValue("");
    setAdding(false);
  };

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
        disabled={adding}
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || adding}
        className="text-xs font-medium text-gray-500 hover:text-gray-900 disabled:opacity-30 px-2 py-1"
      >
        {adding ? "Adding..." : "Add"}
      </button>
    </div>
  );
}

// ── Suggest Task Modal ─────────────────────────────────────────────────

function SuggestTaskModal({
  team,
  currentUserId,
  onSuggest,
  onClose,
}: {
  team: TeamMember[];
  currentUserId: string;
  onSuggest: (title: string, assignedTo: string) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [targetUser, setTargetUser] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const others = team.filter((m) => m.id !== currentUserId);

  const handleSubmit = async () => {
    if (!title.trim() || !targetUser || submitting) return;
    setSubmitting(true);
    await onSuggest(title.trim(), targetUser);
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-xl border border-gray-200 shadow-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Suggest a task</h3>
        <input
          type="text"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 mb-3"
          autoFocus
        />
        <select
          value={targetUser}
          onChange={(e) => setTargetUser(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 mb-4 text-gray-700"
        >
          <option value="">Assign to...</option>
          {others.map((m) => (
            <option key={m.id} value={m.id}>
              {displayName(m)}
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !targetUser || submitting}
            className="px-4 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-40"
          >
            {submitting ? "Suggesting..." : "Suggest"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Task List Section ──────────────────────────────────────────────────

function TaskSection({
  title,
  tasks,
  team,
  currentUserId,
  addPlaceholder,
  addAssignedTo,
  onToggle,
  onDelete,
  onAssign,
  onAdd,
  showCompleted,
}: {
  title: string;
  tasks: Task[];
  team: TeamMember[];
  currentUserId: string;
  addPlaceholder: string;
  addAssignedTo: string | null;
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
  onAssign: (id: number, userId: string | null) => void;
  onAdd: (title: string, assignedTo: string | null) => Promise<void>;
  showCompleted: boolean;
}) {
  const visible = showCompleted ? tasks : tasks.filter((t) => !t.completed);
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <span className="text-[10px] text-gray-400">
          {completedCount}/{totalCount} done
        </span>
      </div>
      {visible.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-gray-400">
          No tasks yet
        </div>
      ) : (
        visible.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            team={team}
            currentUserId={currentUserId}
            onToggle={onToggle}
            onDelete={onDelete}
            onAssign={onAssign}
          />
        ))
      )}
      <AddTaskInput
        placeholder={addPlaceholder}
        assignedTo={addAssignedTo}
        onAdd={onAdd}
      />
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuggest, setShowSuggest] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const fetchTasks = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch("/api/admin/tasks", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    setTasks(data.tasks);
  }, []);

  const fetchTeam = useCallback(async () => {
    // Fetch admin emails from the same env var the server uses
    const token = await getToken();
    if (!token) return;
    // We'll get team info from profiles + auth — for now use the stats endpoint
    // to get all users, but we really just need admin users.
    // Simplification: fetch all profiles and filter to those who have tasks or are admin
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name");
    const { data: authData } = await supabase.auth.getUser(token);
    const currentEmail = authData?.user?.email;

    // Build team from profiles that have user data
    if (profiles) {
      // Also get emails from auth — we can only get the current user's email client-side
      // For team display, we'll use profile names and fall back to user_id
      const members: TeamMember[] = profiles
        .filter((p) => p.name)
        .map((p) => ({
          id: p.user_id,
          email: "",
          name: p.name,
        }));

      // Ensure current user is in the list
      if (authData?.user && !members.find((m) => m.id === authData.user!.id)) {
        members.unshift({
          id: authData.user.id,
          email: currentEmail ?? "",
          name: null,
        });
      }

      // Put current user's email on their record
      const me = members.find((m) => m.id === authData?.user?.id);
      if (me && currentEmail) me.email = currentEmail;

      setTeam(members);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    setLoading(true);
    Promise.all([fetchTasks(), fetchTeam()]).finally(() => setLoading(false));
  }, [authLoading, user, fetchTasks, fetchTeam]);

  const addTask = async (title: string, assignedTo: string | null) => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch("/api/admin/tasks", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, assigned_to: assignedTo }),
    });
    if (res.ok) {
      const { task } = await res.json();
      setTasks((prev) => [task, ...prev]);
    }
  };

  const toggleTask = async (id: number, completed: boolean) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null }
          : t
      )
    );
    const token = await getToken();
    if (!token) return;
    await fetch("/api/admin/tasks", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, completed }),
    });
  };

  const deleteTask = async (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    const token = await getToken();
    if (!token) return;
    await fetch("/api/admin/tasks", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });
  };

  const assignTask = async (id: number, userId: string | null) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, assigned_to: userId } : t))
    );
    const token = await getToken();
    if (!token) return;
    await fetch("/api/admin/tasks", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, assigned_to: userId }),
    });
  };

  const suggestTask = async (title: string, assignedTo: string) => {
    await addTask(title, assignedTo);
  };

  // Separate tasks
  const companyTasks = tasks.filter((t) => !t.assigned_to);
  const myTasks = tasks.filter((t) => t.assigned_to === user?.id);
  const otherMembers = team.filter((m) => m.id !== user?.id);

  // Page-level tabs
  const pages = [
    { label: "Admin Dashboard", href: "/admin" },
    { label: "Workspace", href: "/workspace" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Workspace</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Team tasks and collaboration
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={`text-xs font-medium px-3 py-1.5 border rounded-lg transition-colors ${
                showCompleted
                  ? "border-gray-300 text-gray-700 bg-white"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {showCompleted ? "Hide completed" : "Show completed"}
            </button>
            <button
              onClick={() => setShowSuggest(true)}
              className="text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 px-3 py-1.5 rounded-lg transition-colors"
            >
              Suggest task
            </button>
          </div>
        </div>

        {/* Page-level tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
          {pages.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                p.href === "/workspace"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Company-wide tasks */}
            <TaskSection
              title="Company"
              tasks={companyTasks}
              team={team}
              currentUserId={user?.id ?? ""}
              addPlaceholder="Add a company task..."
              addAssignedTo={null}
              onToggle={toggleTask}
              onDelete={deleteTask}
              onAssign={assignTask}
              onAdd={addTask}
              showCompleted={showCompleted}
            />

            {/* My tasks */}
            <TaskSection
              title="My tasks"
              tasks={myTasks}
              team={team}
              currentUserId={user?.id ?? ""}
              addPlaceholder="Add a personal task..."
              addAssignedTo={user?.id ?? null}
              onToggle={toggleTask}
              onDelete={deleteTask}
              onAssign={assignTask}
              onAdd={addTask}
              showCompleted={showCompleted}
            />

            {/* Other team members */}
            {otherMembers.map((member) => {
              const memberTasks = tasks.filter(
                (t) => t.assigned_to === member.id
              );
              if (memberTasks.length === 0 && !showCompleted) return null;
              return (
                <TaskSection
                  key={member.id}
                  title={`${displayName(member)}'s tasks`}
                  tasks={memberTasks}
                  team={team}
                  currentUserId={user?.id ?? ""}
                  addPlaceholder={`Suggest a task to ${displayName(member)}...`}
                  addAssignedTo={member.id}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                  onAssign={assignTask}
                  onAdd={addTask}
                  showCompleted={showCompleted}
                />
              );
            })}
          </div>
        )}
      </div>

      {showSuggest && user && (
        <SuggestTaskModal
          team={team}
          currentUserId={user.id}
          onSuggest={suggestTask}
          onClose={() => setShowSuggest(false)}
        />
      )}
    </div>
  );
}
