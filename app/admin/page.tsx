"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────

type Counts = {
  totalListings: number;
  activeListings: number;
  expiredListings: number;
  totalMessages: number;
  messagesThisWeek: number;
  totalMatches: number;
  mutualMatches: number;
  totalRequests: number;
  activeRequests: number;
  waitlistSize: number;
  totalUsers: number;
  pendingListings: number;
};

type DayCount = { date: string; count: number };

type TimeSeries = {
  listings: DayCount[];
  messages: DayCount[];
  waitlist: DayCount[];
  matches: DayCount[];
};

type Listing = {
  id: number;
  user_id: string;
  user_email: string | null;
  title: string | null;
  type: string;
  address: string;
  price: number;
  available_from: string;
  available_to: string | null;
  created_at: string;
  photos: string[] | null;
  gender_preference: string;
  furnished: boolean;
  pets: boolean;
  parking: boolean;
  utilities_included: boolean;
};

type Tab = "overview" | "listings";

// ── Helpers ────────────────────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ── Stat Card ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Mini Chart ─────────────────────────────────────────────────────────

function MiniChart({
  title,
  data,
  color,
}: {
  title: string;
  data: DayCount[];
  color: string;
}) {
  const chartData = data.map((d) => ({ ...d, label: formatDate(d.date) }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm font-medium text-gray-700 mb-3">{title}</p>
      {chartData.length === 0 ? (
        <p className="text-xs text-gray-400">No data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#999" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#999" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={color}
              fill={color}
              fillOpacity={0.1}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────────

function OverviewTab({
  counts,
  timeSeries,
}: {
  counts: Counts;
  timeSeries: TimeSeries;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard label="Users" value={counts.totalUsers} />
        <StatCard label="Waitlist" value={counts.waitlistSize} />
        <StatCard
          label="Listings"
          value={counts.activeListings}
          sub={`${counts.expiredListings} expired, ${counts.pendingListings} pending`}
        />
        <StatCard
          label="Messages"
          value={counts.totalMessages}
          sub={`${counts.messagesThisWeek} this week`}
        />
        <StatCard
          label="Matches"
          value={counts.mutualMatches}
          sub={`${counts.totalMatches} total records`}
        />
        <StatCard
          label="Requests"
          value={counts.activeRequests}
          sub={`${counts.totalRequests} total`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MiniChart
          title="Waitlist signups (30d)"
          data={timeSeries.waitlist}
          color="#6366f1"
        />
        <MiniChart
          title="Listings created (30d)"
          data={timeSeries.listings}
          color="#10b981"
        />
        <MiniChart
          title="Messages sent (30d)"
          data={timeSeries.messages}
          color="#3b82f6"
        />
        <MiniChart
          title="Mutual matches (30d)"
          data={timeSeries.matches}
          color="#f59e0b"
        />
      </div>
    </div>
  );
}

// ── Listings Tab ──────────────────────────────────────────────────────

function ListingsTab({
  listings,
  onDelete,
  deleting,
}: {
  listings: Listing[];
  onDelete: (id: number) => void;
  deleting: number | null;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [search, setSearch] = useState("");

  const filtered = listings.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.address.toLowerCase().includes(q) ||
      (l.title ?? "").toLowerCase().includes(q) ||
      (l.user_email ?? "").toLowerCase().includes(q) ||
      l.type.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search listings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5"
        />
        <span className="text-xs text-gray-400">{filtered.length} listings</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">Listing</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const expired = l.available_to && l.available_to < today;
                return (
                  <tr
                    key={l.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {l.title ?? l.address}
                      </div>
                      {l.title && (
                        <div className="text-xs text-gray-400">{l.address}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{l.type}</td>
                    <td className="px-4 py-3 text-gray-600">${l.price}/mo</td>
                    <td className="px-4 py-3">
                      <div className="text-gray-600 text-xs">
                        {l.user_email ?? l.user_id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {expired ? (
                        <span className="inline-block px-2 py-0.5 text-xs font-medium bg-red-50 text-red-600 rounded-full">
                          Expired
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-50 text-green-600 rounded-full">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(l.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onDelete(l.id)}
                        disabled={deleting === l.id}
                        className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                      >
                        {deleting === l.id ? "Removing..." : "Remove"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No listings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [counts, setCounts] = useState<Counts | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeries | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchStats = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch("/api/admin/stats", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    setCounts(data.counts);
    setTimeSeries(data.timeSeries);
  }, []);

  const fetchListings = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch("/api/admin/listings", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    setListings(data.listings);
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    setLoading(true);
    Promise.all([fetchStats(), fetchListings()]).finally(() => setLoading(false));
  }, [authLoading, user, fetchStats, fetchListings]);

  const handleDelete = async (listingId: number) => {
    if (!confirm("Remove this listing? This cannot be undone.")) return;
    setDeleting(listingId);
    const token = await getToken();
    if (!token) return;
    const res = await fetch("/api/admin/listings", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listingId }),
    });
    if (res.ok) {
      setListings((prev) => prev.filter((l) => l.id !== listingId));
    }
    setDeleting(null);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "listings", label: "Listings" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Internal workboard and analytics
            </p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              Promise.all([fetchStats(), fetchListings()]).finally(() =>
                setLoading(false)
              );
            }}
            className="text-xs font-medium text-gray-500 hover:text-gray-900 px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === t.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        ) : tab === "overview" && counts && timeSeries ? (
          <OverviewTab counts={counts} timeSeries={timeSeries} />
        ) : tab === "listings" ? (
          <ListingsTab
            listings={listings}
            onDelete={handleDelete}
            deleting={deleting}
          />
        ) : null}
      </div>
    </div>
  );
}
