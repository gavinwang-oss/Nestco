"use client";

import { useState } from "react";
import useSWR from "swr";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────

type Task = {
  id: number;
  title: string;
  assigned_to_member: number | null;
  created_by: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
};

type Member = {
  id: number;
  name: string;
  added_by: string;
  created_at: string;
};

// ── Helpers ────────────────────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function authedFetch(url: string) {
  const token = await getToken();
  if (!token) throw new Error("No token");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Fetch failed");
  return res.json();
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
  members,
  onToggle,
  onDelete,
  onAssign,
}: {
  task: Task;
  members: Member[];
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
  onAssign: (id: number, memberId: number | null) => void;
}) {
  const [showAssign, setShowAssign] = useState(false);
  const assignee = task.assigned_to_member
    ? members.find((m) => m.id === task.assigned_to_member)
    : null;

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
            task.completed ? "line-through text-gray-400" : "text-gray-900"
          }`}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {assignee && (
            <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded">
              {assignee.name}
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
            title="Assign to someone"
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
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { onAssign(task.id, m.id); setShowAssign(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${
                    task.assigned_to_member === m.id ? "text-blue-600 font-medium" : "text-gray-700"
                  }`}
                >
                  {m.name}
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
  assignedToMember,
  onAdd,
}: {
  placeholder: string;
  assignedToMember: number | null;
  onAdd: (title: string, assignedToMember: number | null) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [adding, setAdding] = useState(false);

  const handleSubmit = async () => {
    if (!value.trim() || adding) return;
    setAdding(true);
    await onAdd(value.trim(), assignedToMember);
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

// ── Task List Section ──────────────────────────────────────────────────

function TaskSection({
  title,
  tasks,
  members,
  addPlaceholder,
  addAssignedToMember,
  onToggle,
  onDelete,
  onAssign,
  onAdd,
  showCompleted,
  onRemoveMember,
}: {
  title: string;
  tasks: Task[];
  members: Member[];
  addPlaceholder: string;
  addAssignedToMember: number | null;
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
  onAssign: (id: number, memberId: number | null) => void;
  onAdd: (title: string, assignedToMember: number | null) => Promise<void>;
  showCompleted: boolean;
  onRemoveMember?: () => void;
}) {
  const visible = showCompleted ? tasks : tasks.filter((t) => !t.completed);
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">
            {completedCount}/{totalCount} done
          </span>
          {onRemoveMember && (
            <button
              onClick={onRemoveMember}
              className="text-[10px] text-red-400 hover:text-red-600 font-medium"
              title="Remove this person"
            >
              Remove
            </button>
          )}
        </div>
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
            members={members}
            onToggle={onToggle}
            onDelete={onDelete}
            onAssign={onAssign}
          />
        ))
      )}
      <AddTaskInput
        placeholder={addPlaceholder}
        assignedToMember={addAssignedToMember}
        onAdd={onAdd}
      />
    </div>
  );
}

// ── Add Member Modal ───────────────────────────────────────────────────

function AddMemberModal({
  onAdd,
  onClose,
}: {
  onAdd: (name: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    await onAdd(name.trim());
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-xl border border-gray-200 shadow-xl p-6 w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Add a team member</h3>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 mb-4"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || submitting}
            className="px-4 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-40"
          >
            {submitting ? "Adding..." : "Add member"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Suggest Task Modal ─────────────────────────────────────────────────

function SuggestTaskModal({
  members,
  onSuggest,
  onClose,
}: {
  members: Member[];
  onSuggest: (title: string, memberId: number) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [targetMember, setTargetMember] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !targetMember || submitting) return;
    setSubmitting(true);
    await onSuggest(title.trim(), Number(targetMember));
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
          value={targetMember}
          onChange={(e) => setTargetMember(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 mb-4 text-gray-700"
        >
          <option value="">Assign to...</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
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
            disabled={!title.trim() || !targetMember || submitting}
            className="px-4 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-40"
          >
            {submitting ? "Suggesting..." : "Suggest"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const { user, loading: authLoading } = useAuth();
  const [showSuggest, setShowSuggest] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const shouldFetch = !authLoading && !!user;

  const { data: tasksData, mutate: mutateTasks, isLoading: tasksLoading } = useSWR(
    shouldFetch ? "/api/admin/tasks" : null,
    authedFetch,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  const { data: membersData, mutate: mutateMembers, isLoading: membersLoading } = useSWR(
    shouldFetch ? "/api/admin/workspace-members" : null,
    authedFetch,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const tasks: Task[] = tasksData?.tasks ?? [];
  const members: Member[] = membersData?.members ?? [];
  const loading = tasksLoading || membersLoading;

  // ── Task actions ───────────────────────────────────────────────────

  const addTask = async (title: string, assignedToMember: number | null) => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch("/api/admin/tasks", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, assigned_to_member: assignedToMember }),
    });
    if (res.ok) {
      const { task } = await res.json();
      mutateTasks(
        (prev: { tasks: Task[] } | undefined) =>
          prev ? { tasks: [task, ...prev.tasks] } : { tasks: [task] },
        false
      );
    }
  };

  const toggleTask = async (id: number, completed: boolean) => {
    mutateTasks(
      (prev: { tasks: Task[] } | undefined) =>
        prev
          ? {
              tasks: prev.tasks.map((t) =>
                t.id === id
                  ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null }
                  : t
              ),
            }
          : prev,
      false
    );
    const token = await getToken();
    if (!token) return;
    await fetch("/api/admin/tasks", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id, completed }),
    });
  };

  const deleteTask = async (id: number) => {
    mutateTasks(
      (prev: { tasks: Task[] } | undefined) =>
        prev ? { tasks: prev.tasks.filter((t) => t.id !== id) } : prev,
      false
    );
    const token = await getToken();
    if (!token) return;
    await fetch("/api/admin/tasks", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  };

  const assignTask = async (id: number, memberId: number | null) => {
    mutateTasks(
      (prev: { tasks: Task[] } | undefined) =>
        prev
          ? { tasks: prev.tasks.map((t) => (t.id === id ? { ...t, assigned_to_member: memberId } : t)) }
          : prev,
      false
    );
    const token = await getToken();
    if (!token) return;
    await fetch("/api/admin/tasks", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id, assigned_to_member: memberId }),
    });
  };

  // ── Member actions ─────────────────────────────────────────────────

  const addMember = async (name: string) => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch("/api/admin/workspace-members", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const { member } = await res.json();
      mutateMembers(
        (prev: { members: Member[] } | undefined) =>
          prev ? { members: [...prev.members, member] } : { members: [member] },
        false
      );
    }
  };

  const removeMember = async (memberId: number, memberName: string) => {
    if (!confirm(`Remove ${memberName}? Their tasks will be unassigned.`)) return;
    // Optimistic: remove member + unassign their tasks
    mutateMembers(
      (prev: { members: Member[] } | undefined) =>
        prev ? { members: prev.members.filter((m) => m.id !== memberId) } : prev,
      false
    );
    mutateTasks(
      (prev: { tasks: Task[] } | undefined) =>
        prev
          ? {
              tasks: prev.tasks.map((t) =>
                t.assigned_to_member === memberId ? { ...t, assigned_to_member: null } : t
              ),
            }
          : prev,
      false
    );
    const token = await getToken();
    if (!token) return;
    await fetch("/api/admin/workspace-members", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id: memberId }),
    });
  };

  // ── Derived data ───────────────────────────────────────────────────

  const companyTasks = tasks.filter((t) => !t.assigned_to_member);

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
              onClick={() => setShowAddMember(true)}
              className="text-xs font-medium px-3 py-1.5 border border-gray-200 text-gray-500 hover:border-gray-300 rounded-lg transition-colors"
            >
              Add person
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
              members={members}
              addPlaceholder="Add a company task..."
              addAssignedToMember={null}
              onToggle={toggleTask}
              onDelete={deleteTask}
              onAssign={assignTask}
              onAdd={addTask}
              showCompleted={showCompleted}
            />

            {/* Per-member task sections */}
            {members.map((member) => {
              const memberTasks = tasks.filter(
                (t) => t.assigned_to_member === member.id
              );
              return (
                <TaskSection
                  key={member.id}
                  title={`${member.name}'s tasks`}
                  tasks={memberTasks}
                  members={members}
                  addPlaceholder={`Add a task for ${member.name}...`}
                  addAssignedToMember={member.id}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                  onAssign={assignTask}
                  onAdd={addTask}
                  showCompleted={showCompleted}
                  onRemoveMember={() => removeMember(member.id, member.name)}
                />
              );
            })}

            {members.length === 0 && (
              <div className="text-center py-8 text-sm text-gray-400">
                No team members yet. Click &quot;Add person&quot; to get started.
              </div>
            )}
          </div>
        )}
      </div>

      {showAddMember && (
        <AddMemberModal
          onAdd={addMember}
          onClose={() => setShowAddMember(false)}
        />
      )}

      {showSuggest && (
        <SuggestTaskModal
          members={members}
          onSuggest={(title, memberId) => addTask(title, memberId)}
          onClose={() => setShowSuggest(false)}
        />
      )}
    </div>
  );
}
