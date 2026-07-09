"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import OnboardingTooltip from "@/components/OnboardingTooltip";
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

type Message = { role: "user" | "ai"; content: string; listings?: Listing[]; suggestedListing?: Listing };

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
  onToggleSave,
  onMessage,
}: {
  listing: Listing;
  displayedListings: Listing[];
  savedIds: Set<number>;
  matchScores: Record<number, number>;
  photoIndex: number;
  setPhotoIndex: (i: number) => void;
  onBack: () => void;
  onNavigate: (dir: "next" | "prev") => void;
  onToggleSave: (l: Listing) => void;
  onMessage: () => void;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setLightboxOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxOpen]);

  const isSaved = savedIds.has(listing.id);
  const score = matchScores[listing.id];

  return (
    <div className="absolute inset-0 overflow-y-auto p-6">
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

      {/* Card */}
      <div className="relative bg-white rounded-3xl border border-black/[0.06] overflow-hidden shadow-sm">
        {/* Lightbox */}
        {lightboxOpen && listing.photos?.length > 0 && (
          <div
            className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            <img
              src={listing.photos[photoIndex]}
              alt={listing.address}
              className="max-h-screen max-w-screen object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {listing.photos.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setPhotoIndex(photoIndex === 0 ? listing.photos.length - 1 : photoIndex - 1); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7L9 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setPhotoIndex(photoIndex === listing.photos.length - 1 ? 0 : photoIndex + 1); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                  {listing.photos.map((_, i) => (
                    <button key={i} onClick={(e) => { e.stopPropagation(); setPhotoIndex(i); }}
                      className={`w-2 h-2 rounded-full transition-all cursor-pointer ${i === photoIndex ? "bg-white" : "bg-white/40"}`}
                    />
                  ))}
                </div>
              </>
            )}
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="white" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
          </div>
        )}

        {/* Photo */}
        <div className={`relative aspect-[16/9] ${listing.photos?.length > 0 ? "" : `bg-gradient-to-br ${GRADIENTS[listing.id % GRADIENTS.length]}`}`}>
          {listing.photos?.length > 0 && (
            <img
              src={listing.photos[photoIndex]}
              alt={listing.address}
              className="w-full h-full object-cover cursor-zoom-in"
              onClick={() => setLightboxOpen(true)}
            />
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
          </div>
        </div>
      </div>

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
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
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

        if (data.rankedIds) applyRankedIds(data.rankedIds, listings, numericScores);
        setMessages([
          userMessage,
          { role: "ai", content: data.content || `Found ${listings.length} listing${listings.length !== 1 ? "s" : ""}. Click any to learn more.`, suggestedListing: suggested ?? undefined },
        ]);
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
    router.push(`/?listing=${listing.id}`, { scroll: false });
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
          content: `You're viewing **${listing.address}** — $${listing.price.toLocaleString()}/mo, ${listing.type}, ${genderLabel}. Want to know anything else, or ready to message the lister?`,
        },
      ]);
    }, 700);
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

        if (data.rankedIds) applyRankedIds(data.rankedIds, listings, numericScores);
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: data.content || "Sorry, I couldn't get a response.", suggestedListing: suggested ?? undefined },
        ]);
      })
      .catch(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: "Something went wrong. Please try again." },
        ]);
      });
  };

  const navigateToListing = (dir: "next" | "prev") => {
    if (!selectedListing) return;
    const idx = displayedListings.findIndex((l) => l.id === selectedListing.id);
    if (dir === "next") {
      const next = displayedListings[idx + 1];
      if (next) handleSelectListing(next, true);
      else router.push("/", { scroll: false });
    } else {
      const prev = displayedListings[idx - 1];
      if (prev) handleSelectListing(prev, true);
    }
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
      style={{ backgroundColor: "#F4F2EC" }}
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
              sm:w-[340px] sm:flex-shrink-0 sm:border-r sm:border-black/[0.06] sm:flex sm:flex-col sm:bg-white/60 sm:backdrop-blur-sm sm:static sm:z-auto
              fixed inset-0 z-30 flex flex-col bg-white/95 backdrop-blur-md border-r border-black/[0.06]
              transition-transform duration-300 ease-in-out
              ${mobileChatOpen ? "translate-y-0" : "translate-y-full sm:translate-y-0"}
            `}>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => (
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
              <div className="flex-1 overflow-hidden relative">
              <AnimatePresence mode="wait">
                {selectedListing ? (
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
                      onBack={() => router.push("/", { scroll: false })}
                      onNavigate={navigateToListing}
                      onToggleSave={toggleSave}
                      onMessage={() => setShowMessageModal(true)}
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
                          <span className="text-gray-500"> — so listers can learn a bit about you</span>
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
                              href={`/?listing=${listing.id}`}
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
                                {listing.user_id === user?.id ? (
                                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-semibold text-gray-700">
                                    Your listing
                                  </div>
                                ) : (
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
                                )}
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
