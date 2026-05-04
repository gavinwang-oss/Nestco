"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type Request = {
  id: number;
  user_id: string;
  user_email: string;
  description: string;
  max_price: number | null;
  room_types: string[] | null;
  gender_preference: string | null;
  furnished: boolean | null;
  utilities_included: boolean | null;
  available_from: string | null;
  max_walk_minutes: number | null;
  pets: boolean | null;
  created_at: string;
  expires_at: string;
  is_active: boolean;
};

const ROOM_TYPES = ["Studio", "Private Room", "Shared Room", "1BR", "2BR"];

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function RequestCard({
  req,
  isOwner,
  onRemove,
}: {
  req: Request;
  isOwner: boolean;
  onRemove: (id: number) => void;
}) {
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    const { error } = await supabase
      .from("requests")
      .update({ is_active: false })
      .eq("id", req.id);
    if (!error) {
      onRemove(req.id);
    } else {
      setRemoving(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25 }}
      className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-6 flex flex-col gap-4"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 mb-1">{relativeTime(req.created_at)}</p>
          <p className="text-sm text-gray-900 leading-relaxed">{req.description}</p>
        </div>
        {isOwner && (
          <button
            onClick={handleRemove}
            disabled={removing}
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-full hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer disabled:opacity-50"
          >
            {removing ? "Removing..." : "Remove"}
          </button>
        )}
      </div>

      {/* Criteria pills */}
      <div className="flex flex-wrap gap-2">
        {req.max_price && (
          <span className="px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-700 font-medium">
            Up to ${req.max_price.toLocaleString()}/mo
          </span>
        )}
        {req.room_types && req.room_types.length > 0 && (
          <span className="px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-700 font-medium">
            {req.room_types.join(", ")}
          </span>
        )}
        {req.gender_preference && req.gender_preference !== "Any" && (
          <span className="px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-700 font-medium">
            {req.gender_preference}
          </span>
        )}
        {req.furnished && (
          <span className="px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-700 font-medium">
            Furnished
          </span>
        )}
        {req.utilities_included && (
          <span className="px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-700 font-medium">
            Utilities incl.
          </span>
        )}
        {req.available_from && (
          <span className="px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-700 font-medium">
            Available {formatDate(req.available_from)}
          </span>
        )}
        {req.max_walk_minutes && (
          <span className="px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-700 font-medium">
            {req.max_walk_minutes} min walk max
          </span>
        )}
        {req.pets && (
          <span className="px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-700 font-medium">
            Pets needed
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-50">
        <p className="text-[11px] text-gray-400">
          Expires {formatDate(req.expires_at)}
        </p>
        {isOwner && (
          <p className="text-[11px] text-gray-400 truncate max-w-[160px]">
            {req.user_email}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function RequestFormModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [description, setDescription] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [roomTypes, setRoomTypes] = useState<string[]>([]);
  const [genderPreference, setGenderPreference] = useState("Any");
  const [furnished, setFurnished] = useState(false);
  const [utilitiesIncluded, setUtilitiesIncluded] = useState(false);
  const [availableFrom, setAvailableFrom] = useState("");
  const [maxWalkMinutes, setMaxWalkMinutes] = useState("");
  const [pets, setPets] = useState(false);

  const toggleRoomType = (type: string) => {
    setRoomTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!description.trim()) {
      setError("Please describe what you're looking for.");
      return;
    }

    setSubmitting(true);
    setError("");

    const { error: insertError } = await supabase.from("requests").insert([
      {
        user_id: user.id,
        user_email: user.email,
        description: description.trim(),
        max_price: maxPrice ? Number(maxPrice) : null,
        room_types: roomTypes.length > 0 ? roomTypes : null,
        gender_preference: genderPreference !== "Any" ? genderPreference : null,
        furnished: furnished || null,
        utilities_included: utilitiesIncluded || null,
        available_from: availableFrom || null,
        max_walk_minutes: maxWalkMinutes ? Number(maxWalkMinutes) : null,
        pets: pets || null,
      },
    ]);

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
    } else {
      onSuccess();
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="w-full max-w-lg bg-white sm:rounded-3xl rounded-t-3xl border border-black/[0.06] shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-950">Post a request</h2>
            <p className="text-xs text-gray-400 mt-0.5">We&apos;ll email you when a match is listed</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer text-gray-400 hover:text-gray-700"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex flex-col gap-4 sm:gap-5 max-h-[75vh] overflow-y-auto">
          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">
              What are you looking for? <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your ideal sublet — location, vibe, must-haves, move-in date, budget..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-black/10 resize-none"
            />
          </div>

          {/* Max price */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">
              Max monthly rent ($)
            </label>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="e.g. 1500"
              min={0}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          {/* Room types */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-2">
              Room types (select all that work)
            </label>
            <div className="flex flex-wrap gap-2">
              {ROOM_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleRoomType(type)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                    roomTypes.includes(type)
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Gender preference */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">
              Gender preference
            </label>
            <select
              value={genderPreference}
              onChange={(e) => setGenderPreference(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black/10"
            >
              <option value="Any">Any</option>
              <option value="Male only">Male only</option>
              <option value="Female only">Female only</option>
            </select>
          </div>

          {/* Checkboxes */}
          <div className="flex flex-col gap-3">
            {[
              { label: "Must be furnished", value: furnished, setter: setFurnished },
              { label: "Utilities must be included", value: utilitiesIncluded, setter: setUtilitiesIncluded },
              { label: "Pets required (I have a pet)", value: pets, setter: setPets },
            ].map(({ label, value, setter }) => (
              <label key={label} className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setter(!value)}
                  className={`w-4.5 h-4.5 w-[18px] h-[18px] rounded border transition-all flex items-center justify-center cursor-pointer ${
                    value ? "bg-black border-black" : "border-gray-300 bg-white"
                  }`}
                >
                  {value && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>

          {/* Available from */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">
              Available from (earliest move-in)
            </label>
            <input
              type="date"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          {/* Max walk */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">
              Max walk to campus (minutes)
            </label>
            <input
              type="number"
              value={maxWalkMinutes}
              onChange={(e) => setMaxWalkMinutes(e.target.value)}
              placeholder="e.g. 15"
              min={1}
              max={60}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-all cursor-pointer disabled:opacity-60"
          >
            {submitting ? "Posting..." : "Post request"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function RequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("requests")
      .select("*")
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRequests(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleRemove = (id: number) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSuccess = () => {
    fetchRequests();
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundImage: `url('/sb1.png')`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}
    >
      <Navbar />

      <div className="flex-1 px-4 sm:px-6 py-6 sm:py-10 max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 sm:mb-8 gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-950 mb-1">
              Open requests{" "}
              {!loading && (
                <span className="text-lg font-normal text-gray-400">
                  ({requests.length})
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500">
              Listers: browse what students are looking for and reach out directly.
            </p>
          </div>

          {user ? (
            <button
              onClick={() => setShowModal(true)}
              className="flex-shrink-0 px-4 sm:px-5 py-2.5 min-h-[44px] bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-all cursor-pointer"
            >
              <span className="hidden sm:inline">Post a request</span>
              <span className="sm:hidden">+ Post</span>
            </button>
          ) : (
            <Link
              href="/browse"
              className="flex-shrink-0 px-4 sm:px-5 py-2.5 min-h-[44px] flex items-center bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-all"
            >
              Sign in
            </Link>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-black/[0.06] p-6 animate-pulse h-40"
              />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">📋</p>
            <p className="text-gray-500 text-sm">No open requests yet.</p>
            {user && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 px-5 py-2.5 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-all cursor-pointer"
              >
                Be the first to post
              </button>
            )}
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence>
              {requests.map((req) => (
                <RequestCard
                  key={req.id}
                  req={req}
                  isOwner={user?.id === req.user_id}
                  onRemove={handleRemove}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <RequestFormModal
            onClose={() => setShowModal(false)}
            onSuccess={handleSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
