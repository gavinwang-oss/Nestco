"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import Navbar from "@/components/Navbar";
import OnboardingTooltip from "@/components/OnboardingTooltip";
import SwipeTutorial from "@/components/SwipeTutorial";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type Listing = {
  id: number;
  title: string | null;
  type: string;
  address: string;
  price: number;
  utilities_included: boolean;
  available_from: string;
  available_to: string | null;
  furnished: boolean;
  parking: boolean;
  pets: boolean;
  smokers: boolean;
  dwinelle_distance: number | null;
  gender_preference: string;
  num_roommates: number;
  roommate_genders: string | null;
  roommate_age_min: number | null;
  roommate_age_max: number | null;
  description: string;
  photos: string[];
  created_at: string;
  user_id: string;
};

const GRADIENTS = [
  "from-amber-100 to-orange-200",
  "from-blue-100 to-indigo-200",
  "from-pink-100 to-rose-200",
  "from-green-100 to-emerald-200",
  "from-violet-100 to-purple-200",
  "from-sky-100 to-cyan-200",
];

const EXAMPLE_PROMPTS = [
  "Private room near campus under $1,200",
  "Female roommates only, furnished",
  "Studio available June 1st",
  "Room near BART under $1,000",
];

type Message = { role: "user" | "ai"; content: string; listings?: Listing[]; suggestedListing?: Listing; compareButton?: boolean; requestsLink?: boolean; draftContent?: string; draftListingId?: number; draftSent?: boolean };

type Profile = { name: string; age: string; major: string; year_in_school: string; race: string; gender: string; bio: string; avatar_url: string; include_demographics: boolean };

function ProfileModal({ onSave, onClose }: { onSave: (p: Profile) => void; onClose: () => void }) {
  const [form, setForm] = useState<Profile>({ name: "", age: "", major: "", year_in_school: "", race: "", gender: "", bio: "", avatar_url: "", include_demographics: true });
  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));
  const { name, age, major, year_in_school, gender } = form;
  const complete = [name, age, major, year_in_school, gender].every((v) => v.trim());
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white sm:rounded-3xl rounded-t-3xl border border-black/[0.06] shadow-xl p-6 sm:p-7 w-full sm:max-w-sm max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer text-lg">✕</button>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Complete your profile</h2>
        <p className="text-xs text-gray-400 mb-5">Used to personalize your intro message to listers.</p>
        <div className="space-y-3">
          <div>
            <input placeholder="Full name" value={form.name} onChange={set("name")} className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-black/10" />
            <p className="text-[10px] text-gray-400 mt-1 ml-1">🔒 Only shared with listers after you match</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Age" type="number" value={form.age} onChange={set("age")} className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-black/10" />
            <select value={form.year_in_school} onChange={set("year_in_school")} className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-black/10 text-gray-700">
              <option value="">Year</option>
              <option>1st year</option><option>2nd year</option><option>3rd year</option><option>4th year</option><option>Graduate</option>
            </select>
          </div>
          <input placeholder="Major" value={form.major} onChange={set("major")} className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-black/10" />
          <select value={form.gender} onChange={set("gender")} className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-black/10 text-gray-700">
            <option value="">Gender</option>
            <option>Male</option><option>Female</option><option>Non-binary</option><option>Prefer not to say</option>
          </select>
          <textarea
            placeholder="Brief intro — your vibe, hobbies, living habits..."
            value={form.bio}
            onChange={set("bio")}
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-black/10 resize-none"
          />
        </div>
        <button
          onClick={() => complete && onSave(form)}
          disabled={!complete}
          className="mt-5 w-full py-2.5 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-all cursor-pointer disabled:opacity-40"
        >
          Save profile
        </button>
      </div>
    </div>
  );
}

function formatType(type: string): string {
  const map: Record<string, string> = {
    "1BR": "Entire 1BR", "2BR": "Entire 2BR",
    "Studio": "Entire Studio", "studio": "Entire Studio",
    "Full apartment": "Full Apartment",
  };
  return map[type] ?? type;
}

function Pill({ label }: { label: string }) {
  return (
    <span className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600 font-medium">
      {label}
    </span>
  );
}

function MessageModal({
  listing,
  onClose,
  userId,
  userEmail,
  defaultMessage,
}: {
  listing: Listing;
  onClose: () => void;
  userId: string | null;
  userEmail: string | null;
  defaultMessage?: string;
}) {
  const [message, setMessage] = useState(defaultMessage ?? "");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || !userId) return;
    setSending(true);
    await supabase.from("messages").insert({
      sender_id: userId,
      recipient_id: listing.user_id,
      listing_id: listing.id,
      content: message.trim(),
      sender_email: userEmail,
    });
    setSending(false);
    setSent(true);

    // Fire-and-forget email notification to lister
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) return;
      fetch("/api/notify/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          recipient_id: listing.user_id,
          listing_id: listing.id,
          listing_title: listing.title,
          listing_address: listing.address,
        }),
      }).catch(() => {});
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white sm:rounded-3xl rounded-t-3xl border border-black/[0.06] shadow-xl p-6 sm:p-7 w-full sm:max-w-md sm:mx-4 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors cursor-pointer text-lg"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 bg-black rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-bold">N</span>
          </div>
          <span className="text-base font-semibold tracking-tight text-gray-900">nestco</span>
        </div>

        {sent ? (
          <div className="text-center py-4">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8L6.5 11.5L13 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-gray-950 mb-1">Message sent!</h3>
            <p className="text-sm text-gray-400">The lister will be notified.</p>
          </div>
        ) : (
          <>
            <h3 className="text-base font-bold text-gray-950 mb-0.5">Message the lister</h3>
            <p className="text-xs text-gray-400 mb-4">{listing.address}</p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Hi! I saw your listing for ${listing.address} on Nestco and I'm interested. Is it still available?`}
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-black/10 resize-none mb-3"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || sending}
              className="w-full py-2.5 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-all cursor-pointer disabled:opacity-40"
            >
              {sending ? "Sending…" : "Send message"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ListingDetail({
  listing,
  displayedListings,
  savedIds,
  matchScores,
  photoIndex,
  setPhotoIndex,
  onBack,
  onNavigate,
  onUndoSkip,
  onToggleSave,
  onMessage,
  onDraftMessage,
}: {
  listing: Listing;
  displayedListings: Listing[];
  savedIds: Set<number>;
  matchScores: Record<number, number>;
  photoIndex: number;
  setPhotoIndex: (i: number) => void;
  onBack: () => void;
  onNavigate: (dir: "next" | "prev") => void;
  onUndoSkip: (() => void) | null;
  onToggleSave: (l: Listing) => void;
  onMessage: () => void;
  onDraftMessage: () => void;
}) {
  const dragX = useMotionValue(0);
  const rotate = useTransform(dragX, [-220, 0, 220], [-10, 0, 10]);
  const saveOpacity = useTransform(dragX, [30, 120], [0, 1]);
  const skipOpacity = useTransform(dragX, [-120, -30], [1, 0]);
  const handleDragEnd = async (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const THRESHOLD = 100;
    if (info.offset.x > THRESHOLD) {
      if (!savedIds.has(listing.id)) onToggleSave(listing);
      setTimeout(() => { onNavigate("next"); }, 600);
    } else if (info.offset.x < -THRESHOLD) {
      setTimeout(() => { onNavigate("next"); }, 300);
    } else {
      dragX.set(0);
    }
  };

  const isSaved = savedIds.has(listing.id);
  const score = matchScores[listing.id];

  return (
    <div className="absolute inset-0 overflow-y-auto p-6">
      <SwipeTutorial />

      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-5 cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        All listings
      </button>

      {/* Swipe hint + undo */}
      <div className="flex items-center justify-between mb-3">
        <div className="w-16" />
        <p className="text-[10px] text-gray-300 select-none">← skip &nbsp;·&nbsp; drag to save →</p>
        {onUndoSkip ? (
          <button
            onClick={onUndoSkip}
            className="w-16 text-[10px] text-gray-400 hover:text-gray-700 transition-colors cursor-pointer text-right"
          >
            ↩ undo
          </button>
        ) : (
          <div className="w-16" />
        )}
      </div>

      {/* Draggable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        style={{ rotate, x: dragX }}
        onDragEnd={handleDragEnd}
        className="relative bg-white rounded-3xl border border-black/[0.06] overflow-hidden shadow-sm cursor-grab active:cursor-grabbing select-none"
      >
        {/* Save overlay */}
        <motion.div
          style={{ opacity: saveOpacity }}
          className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl pointer-events-none"
          aria-hidden
        >
          <div className="bg-green-500/90 backdrop-blur-sm rounded-2xl px-6 py-3 flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 14 14" fill="none">
              <path d="M2 2.5C2 1.95 2.45 1.5 3 1.5H11C11.55 1.5 12 1.95 12 2.5V12.5L7 10L2 12.5V2.5Z" fill="white" stroke="white" strokeWidth="1.2"/>
            </svg>
            <span className="text-white font-bold text-lg">Saved!</span>
          </div>
        </motion.div>

        {/* Skip overlay */}
        <motion.div
          style={{ opacity: skipOpacity }}
          className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl pointer-events-none"
          aria-hidden
        >
          <div className="bg-gray-700/80 backdrop-blur-sm rounded-2xl px-6 py-3">
            <span className="text-white font-bold text-lg">Skip</span>
          </div>
        </motion.div>

        {/* Photo */}
        <div className={`relative aspect-[4/3] ${listing.photos?.length > 0 ? "" : `bg-gradient-to-br ${GRADIENTS[listing.id % GRADIENTS.length]}`}`}>
          {listing.photos?.length > 0 && (
            <img src={listing.photos[photoIndex]} alt={listing.address} className="w-full h-full object-cover" />
          )}
          <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/70 backdrop-blur-sm rounded-full text-white text-xs font-medium">
            {formatType(listing.type)}
          </div>
          {score !== undefined && (
            <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${
              score >= 80 ? "bg-green-500/90 text-white" : score >= 50 ? "bg-amber-400/90 text-white" : "bg-gray-500/80 text-white"
            }`}>
              {score}% match
            </div>
          )}
          {listing.photos?.length > 1 && (
            <>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setPhotoIndex(photoIndex === 0 ? listing.photos.length - 1 : photoIndex - 1); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors cursor-pointer"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7L9 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setPhotoIndex(photoIndex === listing.photos.length - 1 ? 0 : photoIndex + 1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors cursor-pointer"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {listing.photos.map((_, i) => (
                  <button key={i} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setPhotoIndex(i); }}
                    className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${i === photoIndex ? "bg-white" : "bg-white/50"}`}
                  />
                ))}
              </div>
              <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/70 backdrop-blur-sm rounded-full text-white text-xs">
                {photoIndex + 1} / {listing.photos.length}
              </div>
            </>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-lg font-bold text-gray-950 mb-0.5">{listing.title ?? listing.address}</h1>
              {listing.title && <p className="text-xs text-gray-500 mb-0.5">{listing.address}</p>}
              <p className="text-xs text-gray-400">
                Available {new Date(listing.available_from).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                {listing.available_to && ` – ${new Date(listing.available_to).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
              </p>
            </div>
            <div className="text-right flex-shrink-0 ml-4">
              <p className="text-xl font-bold text-gray-950">
                ${listing.price.toLocaleString()}
                <span className="text-sm font-normal text-gray-400">/mo</span>
              </p>
              {listing.utilities_included && <p className="text-[10px] text-gray-400">Utilities included</p>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            <Pill label={listing.gender_preference === "female" ? "Female only" : listing.gender_preference === "male" ? "Male only" : "Any gender"} />
            {listing.furnished && <Pill label="Furnished" />}
            {listing.parking && <Pill label="Parking" />}
            {listing.pets && <Pill label="Pets OK" />}
            {listing.smokers && <Pill label="Smokers OK" />}
            {listing.utilities_included && <Pill label="Utils incl." />}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-5 text-sm">
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Roommates</p>
              <p className="text-gray-900 font-medium">{listing.num_roommates}</p>
            </div>
            {listing.num_roommates > 0 && listing.roommate_genders && (
              <div>
                <p className="text-gray-400 text-xs mb-0.5">Roommate genders</p>
                <p className="text-gray-900 font-medium capitalize">{listing.roommate_genders}</p>
              </div>
            )}
            {(listing.roommate_age_min || listing.roommate_age_max) && (
              <div>
                <p className="text-gray-400 text-xs mb-0.5">Existing roommates&apos; ages</p>
                <p className="text-gray-900 font-medium">{listing.roommate_age_min ?? "—"} – {listing.roommate_age_max ?? "—"}</p>
              </div>
            )}
            {listing.dwinelle_distance != null && (
              <div>
                <p className="text-gray-400 text-xs mb-0.5">Distance to Dwinelle</p>
                <p className="text-gray-900 font-medium">{listing.dwinelle_distance} min walk</p>
              </div>
            )}
          </div>

          {listing.description && (
            <div className="mb-5">
              <p className="text-xs text-gray-400 mb-1.5">Description</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{listing.description}</p>
            </div>
          )}

          <div className="pt-4 border-t border-black/[0.06] flex gap-3">
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onMessage(); }}
              className="flex-1 py-2.5 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Message the lister
            </button>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onToggleSave(listing); }}
              className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all cursor-pointer flex-shrink-0 ${
                isSaved ? "bg-black border-black text-white" : "bg-white border-black/[0.08] text-gray-500 hover:border-gray-400"
              }`}
              title={isSaved ? "Unsave" : "Save listing"}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2.5C2 1.95 2.45 1.5 3 1.5H11C11.55 1.5 12 1.95 12 2.5V12.5L7 10L2 12.5V2.5Z"
                  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
                  fill={isSaved ? "currentColor" : "none"} />
              </svg>
            </button>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onDraftMessage(); }}
              className="px-4 py-2.5 border border-black/[0.08] text-sm font-medium text-gray-700 rounded-full hover:border-gray-400 transition-colors cursor-pointer bg-white"
            >
              Ask AI to draft
            </button>
          </div>
        </div>
      </motion.div>

      {/* Prev / Next arrows */}
      {displayedListings.length > 1 && (() => {
        const idx = displayedListings.findIndex(l => l.id === listing.id);
        return (
          <div className="flex justify-between mt-4">
            <button
              onClick={() => onNavigate("prev")}
              disabled={idx <= 0}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors cursor-pointer"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Previous
            </button>
            <span className="text-xs text-gray-300">{idx + 1} / {displayedListings.length}</span>
            <button
              onClick={() => onNavigate("next")}
              disabled={idx >= displayedListings.length - 1}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors cursor-pointer"
            >
              Next
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        );
      })()}
    </div>
  );
}

function ComparePicker({ listings, picks, onPick, onExit }: {
  listings: Listing[];
  picks: Listing[];
  onPick: (l: Listing) => void;
  onExit: () => void;
}) {
  return (
    <div className="absolute inset-0 overflow-y-auto bg-white">
      <div className="sticky top-0 z-10 bg-white border-b border-black/[0.06] px-5 py-3 flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-gray-900">Comparison mode</span>
          <span className="ml-2 text-xs text-gray-400">
            {picks.length === 0 ? "Select 2 listings to compare" : "Select 1 more"}
          </span>
        </div>
        <button onClick={onExit} className="text-xs text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">✕ Exit</button>
      </div>
      {listings.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-sm text-gray-400">No saved listings to compare.</div>
      ) : (
        <div className="p-4 grid grid-cols-2 gap-3">
          {listings.map((l) => {
            const isPicked = picks.some((p) => p.id === l.id);
            const pickNum = picks.findIndex((p) => p.id === l.id) + 1;
            const gradient = GRADIENTS[l.id % GRADIENTS.length];
            return (
              <button
                key={l.id}
                onClick={() => onPick(l)}
                className={`text-left rounded-2xl border-2 overflow-hidden transition-all cursor-pointer ${isPicked ? "border-black shadow-md scale-[1.02]" : "border-transparent hover:border-black/20"}`}
              >
                <div className={`h-24 relative ${l.photos?.[0] ? "" : `bg-gradient-to-br ${gradient}`}`}>
                  {l.photos?.[0] && <img src={l.photos[0]} alt={l.address} className="w-full h-full object-cover" />}
                  {isPicked && (
                    <div className="absolute top-2 left-2 w-5 h-5 bg-black rounded-full flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">{pickNum}</span>
                    </div>
                  )}
                </div>
                <div className="p-2.5 bg-white">
                  <p className="text-[10px] text-gray-400">{formatType(l.type)}</p>
                  <p className="text-xs font-semibold text-gray-900 truncate">{l.address}</p>
                  <p className="text-[10px] text-gray-500">${l.price.toLocaleString()}/mo</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ComparePanel({ listings, matchScores, savedIds, onToggleSave, onSelect, onClose, onSwipeLeft, compareQueue }: {
  listings: Listing[];
  matchScores: Record<number, number>;
  savedIds: Set<number>;
  onToggleSave: (l: Listing) => void;
  onSelect: (l: Listing) => void;
  onClose: () => void;
  onSwipeLeft: (listingId: number) => void;
  compareQueue: Listing[];
}) {
  const [photoIndexes, setPhotoIndexes] = useState<Record<number, number>>({});
  const getPhotoIndex = (id: number) => photoIndexes[id] ?? 0;
  const setPhotoIndex = (id: number, idx: number) =>
    setPhotoIndexes((prev) => ({ ...prev, [id]: idx }));
  const x0 = useMotionValue(0);
  const x1 = useMotionValue(0);
  const xs = [x0, x1];
  const bg0 = useTransform(x0, [-120, 0], ["rgba(239,68,68,0.12)", "rgba(255,255,255,0)"]);
  const bg1 = useTransform(x1, [-120, 0], ["rgba(239,68,68,0.12)", "rgba(255,255,255,0)"]);
  const bgs = [bg0, bg1];
  // Reset swipe positions whenever the listings change (e.g. after a swap)
  const firstListingId = listings[0]?.id;
  const secondListingId = listings[1]?.id;
  useEffect(() => { x0.set(0); x1.set(0); }, [x0, x1, firstListingId, secondListingId]);
  const rows: { label: string; getValue: (l: Listing) => string }[] = [
    { label: "Type", getValue: (l) => formatType(l.type) },
    { label: "Price", getValue: (l) => `$${l.price.toLocaleString()}/mo${l.utilities_included ? " (utils incl.)" : ""}` },
    { label: "Available", getValue: (l) => new Date(l.available_from).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + (l.available_to ? ` – ${new Date(l.available_to).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "") },
    { label: "Furnished", getValue: (l) => l.furnished ? "Yes" : "No" },
    { label: "Utilities", getValue: (l) => l.utilities_included ? "Included" : "Not included" },
    { label: "Gender pref.", getValue: (l) => l.gender_preference === "female" ? "Female only" : l.gender_preference === "male" ? "Male only" : "Any gender" },
    { label: "Roommates", getValue: (l) => l.num_roommates === 0 ? "None" : String(l.num_roommates) },
    { label: "Roommate genders", getValue: (l) => l.roommate_genders ? l.roommate_genders.charAt(0).toUpperCase() + l.roommate_genders.slice(1) : "—" },
    { label: "Roommate ages", getValue: (l) => (l.roommate_age_min && l.roommate_age_max) ? `${l.roommate_age_min}–${l.roommate_age_max}` : "—" },
    { label: "Distance", getValue: (l) => l.dwinelle_distance ? `${l.dwinelle_distance} min walk` : "—" },
    { label: "Parking", getValue: (l) => l.parking ? "Yes" : "No" },
    { label: "Pets", getValue: (l) => l.pets ? "Yes" : "No" },
    { label: "Smokers", getValue: (l) => l.smokers ? "Yes" : "No" },
  ];

  return (
    <div className="absolute inset-0 overflow-y-auto bg-white">
      <div className="sticky top-0 z-10 bg-white border-b border-black/[0.06] px-6 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">Comparing 2 listings</span>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
          ✕ Exit compare
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-black/[0.06]">
        {listings.map((l, i) => {
          const gradient = GRADIENTS[l.id % GRADIENTS.length];
          const score = matchScores[l.id];
          return (
            <div key={l.id} className="flex flex-col">
              {/* Swipe-to-skip zone */}
              <motion.div
                style={{ x: xs[i], background: bgs[i] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={{ left: 0.4, right: 0 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -80 || info.velocity.x < -400) {
                    onSwipeLeft(l.id);
                  }
                  // Let framer-motion spring back naturally for non-triggers;
                  // useEffect handles reset when listings swap
                }}
                className="cursor-grab active:cursor-grabbing px-4 py-2 border-b border-black/[0.04] flex items-center gap-2 select-none touch-none"
              >
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none" className="text-gray-300 flex-shrink-0">
                  <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-[10px] text-gray-400">
                  {compareQueue.length > 0 ? `Swipe left to swap · ${compareQueue.length} in queue` : "Swipe left to remove"}
                </span>
              </motion.div>
              <div className={`aspect-[4/3] relative group/photo ${l.photos?.length ? "" : `bg-gradient-to-br ${gradient}`}`}>
                {l.photos?.length ? (
                  <>
                    <img src={l.photos[getPhotoIndex(l.id)]} alt={l.address} className="w-full h-full object-cover" />
                    {l.photos.length > 1 && (
                      <>
                        <button
                          onClick={() => setPhotoIndex(l.id, Math.max(0, getPhotoIndex(l.id) - 1))}
                          disabled={getPhotoIndex(l.id) === 0}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity disabled:opacity-0 cursor-pointer"
                        >
                          <svg width="8" height="8" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7L9 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        <button
                          onClick={() => setPhotoIndex(l.id, Math.min(l.photos.length - 1, getPhotoIndex(l.id) + 1))}
                          disabled={getPhotoIndex(l.id) === l.photos.length - 1}
                          className="absolute right-8 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity disabled:opacity-0 cursor-pointer"
                        >
                          <svg width="8" height="8" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                          {l.photos.map((_, pi) => (
                            <div key={pi} className={`w-1 h-1 rounded-full transition-all ${pi === getPhotoIndex(l.id) ? "bg-white" : "bg-white/40"}`} />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : null}
                {score !== undefined && (
                  <div className={`absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-sm ${score >= 80 ? "bg-green-500/90 text-white" : score >= 50 ? "bg-amber-400/90 text-white" : "bg-gray-500/80 text-white"}`}>
                    {score}% match
                  </div>
                )}
                <button
                  onClick={() => onToggleSave(l)}
                  className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${savedIds.has(l.id) ? "bg-black" : "bg-black/40 backdrop-blur-sm"}`}
                >
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                    <path d="M2 2.5C2 1.95 2.45 1.5 3 1.5H11C11.55 1.5 12 1.95 12 2.5V12.5L7 10L2 12.5V2.5Z" fill={savedIds.has(l.id) ? "white" : "none"} stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              <div className="px-5 py-3 border-b border-black/[0.06]">
                <p className="text-[10px] text-gray-400 mb-0.5">{formatType(l.type)}</p>
                <p className="font-semibold text-gray-900 text-sm leading-tight">{l.title ?? l.address}</p>
                {l.title && <p className="text-[10px] text-gray-400 mt-0.5">{l.address}</p>}
                <button onClick={() => onSelect(l)} className="mt-2 text-[10px] text-black underline underline-offset-2 cursor-pointer">
                  View full listing →
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="divide-y divide-black/[0.04]">
        {rows.map(({ label, getValue }) => {
          const vals = listings.map(getValue);
          const same = vals[0] === vals[1];
          return (
            <div key={label} className="grid grid-cols-[100px_1fr_1fr] sm:grid-cols-[140px_1fr_1fr] items-center">
              <div className="px-5 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide border-r border-black/[0.06]">{label}</div>
              {listings.map((l, i) => (
                <div key={l.id} className={`px-5 py-3 text-xs font-medium border-r border-black/[0.04] last:border-r-0 ${!same ? "text-gray-900" : "text-gray-500"}`}>
                  {!same && i === 0 && <span className="mr-1">·</span>}
                  {getValue(l)}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BrowseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [matchScores, setMatchScores] = useState<Record<number, number>>({});
  const [displayedListings, setDisplayedListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageDraft, setMessageDraft] = useState<string | undefined>(undefined);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileBannerDismissed, setProfileBannerDismissed] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [lastDraft, setLastDraft] = useState<{ content: string; listingId: number } | null>(null);
  const [editingDraftKey, setEditingDraftKey] = useState<string | null>(null);
  const [editingDraftText, setEditingDraftText] = useState("");
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [compareListings, setCompareListings] = useState<Listing[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [compareQueue, setCompareQueue] = useState<Listing[]>([]);
  const [comparePicks, setComparePicks] = useState<Listing[]>([]);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const sessionTokenRef = useRef<string | null>(null);

  // Keep session token up to date for rate-limited API calls
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      sessionTokenRef.current = session?.access_token ?? null;
    });
  }, [user]);

  useEffect(() => {
    supabase
      .from("listings")
      .select("*")
      .or(`available_to.is.null,available_to.gte.${new Date().toISOString().slice(0, 10)}`)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setListings(data as Listing[]);
          setDisplayedListings(data as Listing[]);
        }
      });
  }, []);

  // Fetch user profile
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single()
      .then(({ data }) => {
        if (data) setUserProfile(data as Profile);
        setProfileLoaded(true);
      });
  }, [user]);

  // Fetch user's saved listings
  useEffect(() => {
    if (!user) return;
    supabase
      .from("saved_listings")
      .select("listing_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setSavedIds(new Set(data.map((r) => r.listing_id)));
      });
  }, [user]);

  const toggleSave = async (listing: Listing) => {
    if (!user) return;
    const isSaved = savedIds.has(listing.id);
    if (isSaved) {
      await supabase
        .from("saved_listings")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", listing.id);
      setSavedIds((prev) => { const s = new Set(prev); s.delete(listing.id); return s; });
    } else {
      await supabase
        .from("saved_listings")
        .insert({ user_id: user.id, listing_id: listing.id });
      setSavedIds((prev) => new Set(prev).add(listing.id));
    }
    return !isSaved;
  };

  const enterCompareMode = (savedListings: Listing[]) => {
    setCompareMode(true);
    setComparePicks([]);
    setSelectedListing(null);
    router.push("/browse", { scroll: false });
    // If exactly 2 listings, skip the picker and go straight to comparing
    if (savedListings.length === 2) {
      setCompareListings(savedListings);
      setCompareQueue([]);
    } else {
      setCompareListings([]);
      setCompareQueue(savedListings);
    }
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setCompareListings([]);
    setComparePicks([]);
    setCompareQueue([]);
  };

  const handleComparePick = (listing: Listing) => {
    if (comparePicks.some((p) => p.id === listing.id)) {
      setComparePicks((prev) => prev.filter((p) => p.id !== listing.id));
      return;
    }
    const newPicks = [...comparePicks, listing];
    if (newPicks.length === 2) {
      setCompareListings(newPicks);
      setCompareQueue((prev) => prev.filter((l) => !newPicks.some((p) => p.id === l.id)));
      setComparePicks([]);
    } else {
      setComparePicks(newPicks);
    }
  };

  const handleCompareSwipeLeft = (listingId: number) => {
    const next = compareQueue[0];
    const remaining = compareListings.filter((l) => l.id !== listingId);
    if (next) {
      setCompareListings([...remaining, next]);
      setCompareQueue((prev) => prev.slice(1));
    } else if (remaining.length === 1) {
      setComparePicks(remaining);
      setCompareListings([]);
    } else {
      exitCompareMode();
    }
  };


  // Sync selected listing from URL param
  useEffect(() => {
    const listingId = searchParams.get("listing");
    if (listingId && listings.length > 0) {
      const found = listings.find((l) => String(l.id) === listingId) ?? null;
      setSelectedListing(found);
      if (found) setHasSearched(true);
    } else if (!listingId) {
      setSelectedListing(null);
    }
  }, [searchParams, listings]);

  const applyRankedIds = (rankedIds: number[], allListings: Listing[], scores: Record<number, number> = {}) => {
    if (!rankedIds?.length) return;
    const idMap = new Map(allListings.map((l) => [l.id, l]));
    const ranked = rankedIds.map((id) => idMap.get(id)).filter(Boolean) as Listing[];
    const rest = allListings.filter((l) => !rankedIds.includes(l.id));
    const all = [...ranked, ...rest];
    // Sort by score descending if scores are available — don't trust Claude's ordering
    if (Object.keys(scores).length > 0) {
      all.sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
    }
    setDisplayedListings(all);
  };

  const handleInitialSearch = async (q: string) => {
    if (!q.trim()) return;
    setHasSearched(true);
    setIsTyping(true);
    // On mobile, open the chat panel to show AI response
    setMobileChatOpen(true);
    const userMessage = { role: "user" as const, content: q };
    setMessages([userMessage]);

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(sessionTokenRef.current ? { Authorization: `Bearer ${sessionTokenRef.current}` } : {}) },
      body: JSON.stringify({
        messages: [userMessage],
        listings,
        savedIds: Array.from(savedIds),
        selectedListing: null,
      }),
    })
      .then((r) => r.json())
      .then(async (data) => {
        setIsTyping(false);
        const numericScores: Record<number, number> = {};
        if (data.scores) {
          Object.entries(data.scores).forEach(([k, v]) => { numericScores[Number(k)] = v as number; });
          setMatchScores(numericScores);
        }
        const suggested = data.suggestedListingId ? listings.find((l) => l.id === data.suggestedListingId) ?? null : null;
        if (suggested) { handleSelectListing(suggested, true); }

        if (data.action) {
          // Fetch fresh saved IDs directly so first-message actions work before savedIds state loads
          let currentSavedIds = savedIds;
          if (user && savedIds.size === 0) {
            const { data: freshSaves } = await supabase.from("saved_listings").select("listing_id").eq("user_id", user.id);
            if (freshSaves) currentSavedIds = new Set(freshSaves.map((r: { listing_id: number }) => r.listing_id));
          }
          const savedListings = listings.filter((l) => currentSavedIds.has(l.id));
          setMessages([userMessage]);
          await executeAction(data.action, data.content || "", savedListings, data.compareIds);
        } else {
          if (data.rankedIds) applyRankedIds(data.rankedIds, listings, numericScores);
          setMessages([
            userMessage,
            { role: "ai", content: data.content || `Found ${listings.length} listing${listings.length !== 1 ? "s" : ""}. Click any to learn more.`, suggestedListing: suggested ?? undefined },
          ]);
        }
      })
      .catch(() => {
        setIsTyping(false);
        setMessages([
          userMessage,
          { role: "ai", content: `Found ${listings.length} listing${listings.length !== 1 ? "s" : ""}. Click any to learn more.` },
        ]);
      });
  };

  const handleSelectListing = (listing: Listing, silent = false) => {
    router.push(`/browse?listing=${listing.id}`, { scroll: false });
    setPhotoIndex(0);
    if (silent) return;
    setIsTyping(true);
    const genderLabel =
      listing.gender_preference === "female"
        ? "female-only"
        : listing.gender_preference === "male"
        ? "male-only"
        : "any gender";
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: `You're viewing **${listing.address}** — $${listing.price.toLocaleString()}/mo, ${listing.type}, ${genderLabel}. What do you think? I can help you draft a message to send to the lister if you're interested.`,
        },
      ]);
    }, 700);
  };

  const executeAction = async (action: string, aiContent: string, savedListings: Listing[], compareIds?: number[]) => {
    switch (action) {
      case "show_saved":
        if (savedListings.length === 0) {
          setMessages((prev) => [...prev, { role: "ai", content: "You haven't saved any listings yet. Swipe right on a listing or click the bookmark icon to save one." }]);
        } else {
          setDisplayedListings(savedListings);
          setSelectedListing(null);
          router.push("/browse", { scroll: false });
          setMessages((prev) => [...prev, { role: "ai", content: aiContent, compareButton: savedListings.length >= 2 }]);
        }
        break;
      case "save_current":
        if (selectedListing) await toggleSave(selectedListing);
        setMessages((prev) => [...prev, { role: "ai", content: aiContent }]);
        break;
      case "unsave_current":
        if (selectedListing) await toggleSave(selectedListing);
        setMessages((prev) => [...prev, { role: "ai", content: aiContent }]);
        break;
      case "filter_saved":
        if (savedListings.length === 0) {
          setMessages((prev) => [...prev, { role: "ai", content: "You haven't saved any listings yet — nothing to filter to." }]);
        } else {
          setDisplayedListings(savedListings);
          setSelectedListing(null);
          router.push("/browse", { scroll: false });
          setMessages((prev) => [...prev, { role: "ai", content: aiContent }]);
        }
        break;
      case "clear_saved":
        if (savedIds.size === 0) {
          setMessages((prev) => [...prev, { role: "ai", content: "You don't have any saved listings to clear." }]);
        } else {
          await Promise.all(
            Array.from(savedIds).map((id) =>
              supabase.from("saved_listings").delete().eq("user_id", user!.id).eq("listing_id", id)
            )
          );
          setSavedIds(new Set());
          setMessages((prev) => [...prev, { role: "ai", content: aiContent }]);
        }
        break;
      case "compare": {
        const toCompare = (compareIds ?? []).slice(0, 2).map((id) => listings.find((l) => l.id === id)).filter(Boolean) as Listing[];
        if (toCompare.length < 2) {
          setMessages((prev) => [...prev, { role: "ai", content: "I need two specific listings to compare. Try: \"compare 2540 Channing Way and 2134 Bowditch St\"." }]);
        } else {
          // If match scores exist, only queue listings that scored above 0 (relevant to current search)
          // Otherwise fall back to all displayed listings
          const hasScores = Object.keys(matchScores).length > 0;
          const relevantListings = hasScores
            ? displayedListings.filter((l) => (matchScores[l.id] ?? 0) > 0)
            : displayedListings;
          const queue = relevantListings.filter((l) => !toCompare.some((c) => c.id === l.id) && savedIds.has(l.id));
          setCompareListings(toCompare);
          setCompareMode(true);
          setCompareQueue(queue);
          router.push("/browse", { scroll: false });
          setMessages((prev) => [...prev, { role: "ai", content: aiContent }]);
        }
        break;
      }
      case "reset":
        setDisplayedListings(listings);
        exitCompareMode();
        setMatchScores({});
        setMessages((prev) => [...prev, { role: "ai", content: aiContent }]);
        break;
      case "send_draft":
        if (lastDraft && user) {
          const draftListing = listings.find((l) => l.id === lastDraft.listingId);
          await supabase.from("messages").insert({
            sender_id: user.id,
            recipient_id: draftListing?.user_id ?? null,
            listing_id: lastDraft.listingId,
            content: lastDraft.content,
            sender_email: user.email,
          });
          setLastDraft(null);
          setMessages((prev) => [...prev, { role: "ai", content: "Sent! The lister will see your message in their inbox." }]);
        } else {
          setMessages((prev) => [...prev, { role: "ai", content: "I don't have a draft ready to send. Click 'Ask AI to draft' on a listing first." }]);
        }
        break;
      case "create_request":
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: "No problem! You can post a request and we'll notify you when a matching listing is added.",
            requestsLink: true,
          },
        ]);
        break;
      default:
        setMessages((prev) => [...prev, { role: "ai", content: aiContent }]);
    }
  };

  const handleChatSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const newMsg = chatInput;
    setChatInput("");
    setIsTyping(true);
    setMessages((prev) => [...prev, { role: "user", content: newMsg }]);

    const allMessages = [...messages, { role: "user" as const, content: newMsg }];
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(sessionTokenRef.current ? { Authorization: `Bearer ${sessionTokenRef.current}` } : {}) },
      body: JSON.stringify({
        messages: allMessages,
        listings,
        savedIds: Array.from(savedIds),
        selectedListing,
      }),
    })
      .then((r) => r.json())
      .then(async (data) => {
        setIsTyping(false);
        const numericScores: Record<number, number> = {};
        if (data.scores) {
          Object.entries(data.scores).forEach(([k, v]) => { numericScores[Number(k)] = v as number; });
          setMatchScores(numericScores);
        }
        const suggested = data.suggestedListingId ? listings.find((l) => l.id === data.suggestedListingId) ?? null : null;
        if (suggested) { handleSelectListing(suggested, true); }

        if (data.action) {
          let currentSavedIds = savedIds;
          if (user && savedIds.size === 0) {
            const { data: freshSaves } = await supabase.from("saved_listings").select("listing_id").eq("user_id", user.id);
            if (freshSaves) currentSavedIds = new Set(freshSaves.map((r: { listing_id: number }) => r.listing_id));
          }
          const savedListings = listings.filter((l) => currentSavedIds.has(l.id));
          await executeAction(data.action, data.content || "", savedListings, data.compareIds);
        } else {
          if (data.rankedIds) applyRankedIds(data.rankedIds, listings, numericScores);
          if (data.draftContent) {
            const draftId = data.suggestedListingId ?? selectedListing?.id ?? null;
            if (draftId) setLastDraft({ content: data.draftContent, listingId: draftId });
          }
          setMessages((prev) => [
            ...prev,
            { role: "ai", content: data.content || "Sorry, I couldn't get a response.", suggestedListing: suggested ?? undefined, draftContent: data.draftContent ?? undefined, draftListingId: data.draftContent ? (data.suggestedListingId ?? selectedListing?.id) : undefined },
          ]);
        }
      })
      .catch(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: "Something went wrong. Please try again." },
        ]);
      });
  };

  const [skipHistory, setSkipHistory] = useState<Listing[]>([]);

  const navigateToListing = (dir: "next" | "prev") => {
    if (!selectedListing) return;
    const idx = displayedListings.findIndex((l) => l.id === selectedListing.id);
    if (dir === "next") {
      setSkipHistory((prev) => [...prev, selectedListing]);
      const next = displayedListings[idx + 1];
      if (next) handleSelectListing(next, true);
      else router.push("/browse", { scroll: false });
    } else {
      const prev = displayedListings[idx - 1];
      if (prev) handleSelectListing(prev, true);
    }
  };

  const handleUndoSkip = () => {
    if (skipHistory.length === 0) return;
    const prev = skipHistory[skipHistory.length - 1];
    setSkipHistory((h) => h.slice(0, -1));
    handleSelectListing(prev, true);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (hasSearched) {
      setTimeout(() => chatInputRef.current?.focus(), 400);
    }
  }, [hasSearched]);

  return (
    <div
      className="h-[100dvh] overflow-hidden flex flex-col"
      style={{
        backgroundColor: "#f5f4f0",
        backgroundImage: `linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)`,
        backgroundSize: "42px 42px",
      }}
    >
      <Navbar />
      <OnboardingTooltip />

      {showProfileModal && (
        <ProfileModal
          onClose={() => setShowProfileModal(false)}
          onSave={async (p) => {
            setUserProfile(p);
            setShowProfileModal(false);
            if (user) {
              await supabase.from("profiles").upsert({ user_id: user.id, ...p, updated_at: new Date().toISOString() });
            }
            // Trigger draft immediately after saving profile
            if (!selectedListing) return;
            const draftMsg = { role: "user" as const, content: "draft_now" };
            setMessages((prev) => [...prev, draftMsg]);
            setIsTyping(true);
            fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...(sessionTokenRef.current ? { Authorization: `Bearer ${sessionTokenRef.current}` } : {}) },
              body: JSON.stringify({ messages: [...messages, draftMsg], listings, savedIds: Array.from(savedIds), selectedListing, userProfile: p }),
            })
              .then((r) => r.json())
              .then((data) => {
                setIsTyping(false);
                if (data.draftContent) setLastDraft({ content: data.draftContent, listingId: data.suggestedListingId ?? selectedListing.id });
                setMessages((prev) => [...prev, { role: "ai", content: data.content || "Here's a draft:", draftContent: data.draftContent ?? undefined, draftListingId: data.draftContent ? (data.suggestedListingId ?? selectedListing.id) : undefined }]);
              })
              .catch(() => setIsTyping(false));
          }}
        />
      )}

      {showMessageModal && selectedListing && (
        <MessageModal
          listing={selectedListing}
          onClose={() => { setShowMessageModal(false); setMessageDraft(undefined); }}
          userId={user?.id ?? null}
          userEmail={user?.email ?? null}
          defaultMessage={messageDraft}
        />
      )}

      <AnimatePresence mode="wait">
        {!hasSearched ? (
          /* ── Initial centered view ── */
          <motion.div
            key="initial"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-16 sm:pb-24"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-gray-950 text-center mb-3 leading-[1.1]">
              What are you<br />looking for?
            </h1>
            <p className="text-gray-400 text-sm sm:text-base mb-6 sm:mb-8 text-center">
              Describe your ideal sublet and our AI will find the best matches.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleInitialSearch(query);
              }}
              className="w-full max-w-2xl"
            >
              <div className="relative bg-white rounded-2xl border border-black/[0.08] shadow-sm">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleInitialSearch(query);
                    }
                  }}
                  placeholder="e.g. Looking for a private room near campus under $1,400, female roommates only, available June..."
                  rows={3}
                  className="w-full px-5 pt-4 pb-12 text-sm text-gray-900 placeholder-gray-400 outline-none resize-none bg-transparent rounded-2xl"
                />
                <div className="absolute bottom-3 right-3">
                  <button
                    type="submit"
                    className="w-8 h-8 bg-black rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M7 11V3M7 3L3 7M7 3L11 7"
                        stroke="white"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap sm:flex-wrap gap-2 justify-center max-w-2xl overflow-x-auto">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleInitialSearch(prompt)}
                  className="px-3 py-1.5 bg-white border border-black/[0.08] rounded-full text-xs text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-all cursor-pointer shadow-sm"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          /* ── Split screen view ── */
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex relative"
            style={{ height: "calc(100dvh - 56px)" }}
          >
            {/* Left: Chat panel — hidden on mobile, shown as overlay when mobileChatOpen */}
            <div className={`
              sm:w-[38%] sm:flex-shrink-0 sm:border-r sm:border-black/[0.06] sm:flex sm:flex-col sm:bg-white/60 sm:backdrop-blur-sm sm:static sm:z-auto
              fixed inset-0 z-30 flex flex-col bg-white/95 backdrop-blur-md border-r border-black/[0.06]
              transition-transform duration-300 ease-in-out
              ${mobileChatOpen ? "translate-y-0" : "translate-y-full sm:translate-y-0"}
            `}>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.filter((msg) => msg.content !== "draft_now").map((msg, i) => (
                  <div
                    key={i}
                    className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "ai" && (
                      <div className="w-5 h-5 bg-black rounded-md flex items-center justify-center flex-shrink-0 mb-0.5 self-start mt-0.5">
                        <span className="text-white text-[8px] font-bold">N</span>
                      </div>
                    )}
                    <div className={`max-w-[85%] ${msg.role === "user" ? "" : "flex-1"}`}>
                      <div
                        className={`px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                          msg.role === "user"
                            ? "bg-black text-white rounded-br-sm inline-block"
                            : "bg-white border border-black/[0.06] text-gray-800 rounded-bl-sm shadow-sm"
                        }`}
                      >
                        {msg.content}
                      </div>
                      {msg.suggestedListing && (
                        <div className="mt-2">
                          <button
                            onClick={() => handleSelectListing(msg.suggestedListing!)}
                            className="w-full text-left bg-white border-2 border-black/10 rounded-xl p-2.5 hover:border-black/20 hover:shadow-sm transition-all cursor-pointer flex gap-2.5 items-center group"
                          >
                            <div className={`w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden ${msg.suggestedListing.photos?.[0] ? "" : `bg-gradient-to-br ${GRADIENTS[msg.suggestedListing.id % GRADIENTS.length]}`}`}>
                              {msg.suggestedListing.photos?.[0] && (
                                <img src={msg.suggestedListing.photos[0]} alt={msg.suggestedListing.address} className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] text-gray-400 capitalize">{msg.suggestedListing.type}</p>
                              <p className="text-xs font-semibold text-gray-900 truncate">{msg.suggestedListing.address}</p>
                              <p className="text-[10px] text-gray-500">${msg.suggestedListing.price.toLocaleString()}/mo</p>
                            </div>
                            <div className="flex-shrink-0 flex flex-col items-end gap-1">
                              {matchScores[msg.suggestedListing.id] !== undefined && (
                                <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                                  {matchScores[msg.suggestedListing.id]}%
                                </span>
                              )}
                              <span className="text-[10px] text-black font-medium group-hover:underline">View →</span>
                            </div>
                          </button>
                        </div>
                      )}
                      {msg.compareButton && (
                        <div className="mt-2">
                          <button
                            onClick={() => enterCompareMode(listings.filter((l) => savedIds.has(l.id)))}
                            className="flex items-center gap-2 px-3 py-2 bg-black text-white rounded-xl text-xs font-medium hover:bg-gray-800 transition-colors cursor-pointer"
                          >
                            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                              <rect x="1" y="1" width="5" height="12" rx="1" stroke="white" strokeWidth="1.4"/>
                              <rect x="8" y="1" width="5" height="12" rx="1" stroke="white" strokeWidth="1.4"/>
                            </svg>
                            Enter comparison mode
                          </button>
                        </div>
                      )}
                      {msg.draftContent && (
                        <div className="mt-3">
                          {editingDraftKey === msg.draftContent ? (
                            <textarea
                              autoFocus
                              value={editingDraftText}
                              onChange={(e) => setEditingDraftText(e.target.value)}
                              onBlur={() => {
                                const trimmed = editingDraftText.trim();
                                if (trimmed) {
                                  setMessages((prev) => prev.map((m) => m.draftContent === editingDraftKey ? { ...m, draftContent: trimmed } : m));
                                }
                                setEditingDraftKey(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  setEditingDraftKey(null);
                                }
                              }}
                              className="w-full bg-gray-50 border border-black/[0.12] rounded-xl p-3 mb-2 text-sm text-gray-700 leading-relaxed font-normal italic resize-none outline-none focus:border-black/30 transition-colors"
                              rows={4}
                            />
                          ) : (
                            <div
                              onDoubleClick={() => {
                                if (!msg.draftSent) {
                                  setEditingDraftKey(msg.draftContent!);
                                  setEditingDraftText(msg.draftContent!);
                                }
                              }}
                              title={msg.draftSent ? undefined : "Double-click to edit"}
                              className={`bg-gray-50 border border-black/[0.08] rounded-xl p-3 mb-2 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-normal italic ${!msg.draftSent ? "cursor-text hover:border-black/20 transition-colors" : ""}`}
                            >
                              {msg.draftContent}
                            </div>
                          )}
                          {msg.draftSent ? (
                            <div className="w-full py-2 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold rounded-xl text-center">
                              ✓ Sent
                            </div>
                          ) : (
                            <button
                              onClick={async () => {
                                if (!user || !msg.draftListingId) return;
                                const targetListing = listings.find((l) => l.id === msg.draftListingId);
                                await supabase.from("messages").insert({
                                  sender_id: user.id,
                                  recipient_id: targetListing?.user_id ?? null,
                                  listing_id: msg.draftListingId,
                                  content: msg.draftContent!,
                                  sender_email: user.email,
                                });
                                setMessages((prev) => prev.map((m) => m.draftContent === msg.draftContent ? { ...m, draftSent: true } : m));
                              }}
                              className="w-full py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-gray-800 transition-colors cursor-pointer"
                            >
                              Send this →
                            </button>
                          )}
                        </div>
                      )}
                      {msg.requestsLink && (
                        <div className="mt-2">
                          <a
                            href="/requests"
                            className="flex items-center gap-2 px-3 py-2 bg-black text-white rounded-xl text-xs font-medium hover:bg-gray-800 transition-colors cursor-pointer"
                          >
                            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                              <path d="M2 3h10M2 7h7M2 11h5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                            Post a request →
                          </a>
                        </div>
                      )}
                      {msg.listings && msg.listings.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {msg.listings.map((l) => (
                            <button
                              key={l.id}
                              onClick={() => handleSelectListing(l)}
                              className="w-full text-left bg-white border border-black/[0.06] rounded-xl p-2.5 hover:shadow-sm transition-shadow cursor-pointer flex gap-2.5 items-center"
                            >
                              <div className={`w-10 h-10 rounded-lg flex-shrink-0 ${l.photos?.[0] ? "" : `bg-gradient-to-br ${GRADIENTS[l.id % GRADIENTS.length]}`}`}>
                                {l.photos?.[0] && (
                                  <img src={l.photos[0]} alt={l.address} className="w-full h-full object-cover rounded-lg" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-900 truncate">{l.address}</p>
                                <p className="text-[10px] text-gray-400">${l.price.toLocaleString()}/mo · {formatType(l.type)}</p>
                              </div>
                              <svg className="ml-auto flex-shrink-0 text-gray-300" width="12" height="12" viewBox="0 0 14 14" fill="none">
                                <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex items-end gap-2">
                    <div className="w-5 h-5 bg-black rounded-md flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[8px] font-bold">N</span>
                    </div>
                    <div className="px-3 py-2.5 bg-white border border-black/[0.06] rounded-2xl rounded-bl-sm shadow-sm">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 bg-gray-300 rounded-full"
                            style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleChatSend} className="p-3 border-t border-black/[0.06]">
                <div className="relative bg-white rounded-xl border border-black/[0.08]">
                  <input
                    ref={chatInputRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask anything..."
                    className="w-full px-4 py-2.5 pr-10 text-xs text-gray-900 placeholder-gray-400 outline-none bg-transparent rounded-xl"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-black rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M7 11V3M7 3L3 7M7 3L11 7"
                        stroke="white"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </form>
              {/* Mobile close button */}
              <button
                onClick={() => setMobileChatOpen(false)}
                className="sm:hidden mx-3 mb-3 w-full py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back to listings
              </button>
            </div>

            {/* Mobile overlay backdrop */}
            {mobileChatOpen && (
              <div
                className="sm:hidden fixed inset-0 z-20 bg-black/20"
                onClick={() => setMobileChatOpen(false)}
              />
            )}

            {/* Right: Listings grid or Detail panel */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Saved listings bar */}
              {user && savedIds.size > 0 && (
                <div className="flex-shrink-0 border-b border-black/[0.06] bg-white/70 backdrop-blur-sm px-4 py-2 flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Saved</span>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {listings.filter((l) => savedIds.has(l.id)).map((l) => (
                      <button
                        key={l.id}
                        onClick={() => handleSelectListing(l, true)}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium transition-all cursor-pointer ${
                          selectedListing?.id === l.id
                            ? "bg-black text-white border-black"
                            : "bg-white text-gray-700 border-black/[0.1] hover:border-gray-400"
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 overflow-hidden ${l.photos?.[0] ? "" : `bg-gradient-to-br ${GRADIENTS[l.id % GRADIENTS.length]}`}`}>
                          {l.photos?.[0] && <img src={l.photos[0]} alt="" className="w-full h-full object-cover" />}
                        </div>
                        {l.title ? l.title.split(" ").slice(0, 3).join(" ") : l.address.split(" ").slice(0, 2).join(" ")}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-hidden relative">
              <AnimatePresence mode="wait">
                {compareMode && compareListings.length < 2 ? (
                  <motion.div
                    key="compare-picker"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute inset-0"
                  >
                    <ComparePicker
                      listings={listings.filter((l) => savedIds.has(l.id))}
                      picks={comparePicks}
                      onPick={handleComparePick}
                      onExit={exitCompareMode}
                    />
                  </motion.div>
                ) : compareListings.length === 2 ? (
                  <motion.div
                    key="compare"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute inset-0"
                  >
                    <ComparePanel
                      listings={compareListings}
                      matchScores={matchScores}
                      savedIds={savedIds}
                      onToggleSave={toggleSave}
                      onSelect={(l) => { exitCompareMode(); handleSelectListing(l, true); }}
                      onClose={exitCompareMode}
                      onSwipeLeft={handleCompareSwipeLeft}
                      compareQueue={compareQueue}
                    />
                  </motion.div>
                ) : selectedListing ? (
                  /* ── Detail panel ── */
                  <motion.div
                    key={`detail-${selectedListing.id}`}
                    initial={{ x: 48, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 48, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="absolute inset-0"
                  >
                    <ListingDetail
                      listing={selectedListing}
                      displayedListings={displayedListings}
                      savedIds={savedIds}
                      matchScores={matchScores}
                      photoIndex={photoIndex}
                      setPhotoIndex={setPhotoIndex}
                      onBack={() => router.push("/browse", { scroll: false })}
                      onNavigate={navigateToListing}
                      onUndoSkip={skipHistory.length > 0 ? handleUndoSkip : null}
                      onToggleSave={toggleSave}
                      onMessage={() => setShowMessageModal(true)}
                      onDraftMessage={() => {
                        if (!selectedListing) return;
                        const profileComplete = userProfile && ["name","age","major","year_in_school","gender"].every((k) => userProfile[k as keyof Profile]?.toString().trim());
                        if (!profileComplete) { setShowProfileModal(true); return; }
                        const draftMsg = { role: "user" as const, content: "draft_now" };
                        setMessages((prev) => [...prev, draftMsg]);
                        setIsTyping(true);
                        const allMessages = [...messages, draftMsg];
                        fetch("/api/chat", {
                          method: "POST",
                          headers: { "Content-Type": "application/json", ...(sessionTokenRef.current ? { Authorization: `Bearer ${sessionTokenRef.current}` } : {}) },
                          body: JSON.stringify({ messages: allMessages, listings, savedIds: Array.from(savedIds), selectedListing, userProfile }),
                        })
                          .then((r) => r.json())
                          .then((data) => {
                            setIsTyping(false);
                            if (data.draftContent) setLastDraft({ content: data.draftContent, listingId: data.suggestedListingId ?? selectedListing.id });
                            setMessages((prev) => [...prev, {
                              role: "ai",
                              content: data.content || "Here's a draft — feel free to edit before sending:",
                              draftContent: data.draftContent ?? undefined,
                              draftListingId: data.draftContent ? (data.suggestedListingId ?? selectedListing?.id) : undefined,
                            }]);
                          })
                          .catch(() => { setIsTyping(false); });
                      }}
                    />
                  </motion.div>
                ) : (
                  /* ── Grid panel ── */
                  <motion.div
                    key="grid"
                    initial={{ x: -24, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -24, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute inset-0 overflow-y-auto p-3 sm:p-6 pb-20 sm:pb-6"
                  >
                    {/* Profile completion banner */}
                    {profileLoaded && user && !profileBannerDismissed &&
                      (!userProfile ||
                        !userProfile.name?.trim() ||
                        !userProfile.age ||
                        !userProfile.major?.trim() ||
                        !userProfile.year_in_school?.trim() ||
                        !userProfile.gender?.trim()
                      ) && (
                      <div className="flex items-center justify-between gap-3 mb-4 px-4 py-3 bg-black/[0.04] rounded-2xl">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Complete your profile</span>
                          <span className="text-gray-500"> — AI-drafted intros will include your year and major</span>
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setShowProfileModal(true)}
                            className="text-sm font-semibold text-gray-900 hover:underline cursor-pointer"
                          >
                            Complete →
                          </button>
                          <button
                            onClick={() => setProfileBannerDismissed(true)}
                            className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors cursor-pointer"
                            aria-label="Dismiss"
                          >
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                              <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mb-5">
                      <p className="text-sm text-gray-500">
                        <span className="font-semibold text-gray-900">
                          {displayedListings.length} listing{displayedListings.length !== 1 ? "s" : ""}
                        </span>{" "}
                        found
                      </p>
                    </div>

                    {displayedListings.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm">
                        No listings yet — check back soon.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                        {displayedListings.map((listing, i) => {
                          const gradient = GRADIENTS[i % GRADIENTS.length];
                          const firstPhoto = listing.photos?.[0] ?? null;
                          const availDate = new Date(listing.available_from).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          });
                          const genderLabel =
                            listing.gender_preference === "female"
                              ? "Female only"
                              : listing.gender_preference === "male"
                              ? "Male only"
                              : "Any gender";

                          return (
                            <motion.a
                              key={listing.id}
                              href={`/browse?listing=${listing.id}`}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.07, duration: 0.3 }}
                              onClick={(e) => { e.preventDefault(); handleSelectListing(listing); }}
                              className="text-left bg-white rounded-2xl border border-black/[0.06] overflow-hidden hover:shadow-md transition-shadow cursor-pointer group block"
                            >
                              <div className={`h-32 relative ${firstPhoto ? "" : `bg-gradient-to-br ${gradient}`}`}>
                                {firstPhoto && (
                                  <img
                                    src={firstPhoto}
                                    alt={listing.address}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                                <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 rounded-full text-white text-[10px] font-medium backdrop-blur-sm">
                                  {listing.photos?.length ?? 0} photo{listing.photos?.length !== 1 ? "s" : ""}
                                </div>
                                {matchScores[listing.id] !== undefined && (
                                  <div className={`absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-sm ${
                                    matchScores[listing.id] >= 80
                                      ? "bg-green-500/90 text-white"
                                      : matchScores[listing.id] >= 50
                                      ? "bg-amber-400/90 text-white"
                                      : "bg-gray-500/80 text-white"
                                  }`}>
                                    {matchScores[listing.id]}% match
                                  </div>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleSave(listing); }}
                                  className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                    savedIds.has(listing.id)
                                      ? "bg-black opacity-100"
                                      : "bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100"
                                  }`}
                                  title={savedIds.has(listing.id) ? "Unsave" : "Save"}
                                >
                                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                                    <path d="M2 2.5C2 1.95 2.45 1.5 3 1.5H11C11.55 1.5 12 1.95 12 2.5V12.5L7 10L2 12.5V2.5Z"
                                      fill={savedIds.has(listing.id) ? "white" : "none"}
                                      stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </button>
                              </div>
                              <div className="p-3.5">
                                <p className="text-[10px] text-gray-400 mb-1">{formatType(listing.type)}</p>
                                <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-0.5 line-clamp-1">
                                  {listing.title ?? listing.address}
                                </h3>
                                {listing.title && (
                                  <p className="text-[10px] text-gray-400 mb-1.5 line-clamp-1">{listing.address}</p>
                                )}
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-bold text-gray-900">
                                    ${listing.price.toLocaleString()}
                                    <span className="text-xs font-normal text-gray-400">/mo</span>
                                  </p>
                                  <span className="text-[10px] text-gray-400">Avail. {availDate}</span>
                                </div>
                                <div className="mt-2 flex gap-1.5 flex-wrap">
                                  <span className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px] text-gray-500">
                                    {genderLabel}
                                  </span>
                                  {listing.furnished && (
                                    <span className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px] text-gray-500">
                                      Furnished
                                    </span>
                                  )}
                                  {listing.utilities_included && (
                                    <span className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px] text-gray-500">
                                      Utils incl.
                                    </span>
                                  )}
                                </div>
                              </div>
                            </motion.a>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            </div>

            {/* Mobile floating AI Search button */}
            {!mobileChatOpen && (
              <button
                onClick={() => setMobileChatOpen(true)}
                className="sm:hidden fixed bottom-6 right-4 z-20 flex items-center gap-2 px-4 py-3 bg-black text-white text-sm font-semibold rounded-full shadow-lg hover:bg-gray-800 active:scale-95 transition-all cursor-pointer"
              >
                <div className="w-4 h-4 rounded bg-white/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[8px] font-bold">N</span>
                </div>
                AI Search
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Browse() {
  return (
    <Suspense fallback={null}>
      <BrowseContent />
    </Suspense>
  );
}
