"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
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
  roommate_age_min: number | null;
  roommate_age_max: number | null;
  description: string;
  photos: string[];
  created_at: string;
};

type SavedListingRow = {
  listings: Listing | null;
};

const GRADIENTS = [
  "from-amber-100 to-orange-200",
  "from-blue-100 to-indigo-200",
  "from-pink-100 to-rose-200",
  "from-green-100 to-emerald-200",
  "from-violet-100 to-purple-200",
  "from-sky-100 to-cyan-200",
];

const BG = {
  backgroundColor: "#f5f4f0",
  backgroundImage: `linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)`,
  backgroundSize: "42px 42px",
};

export default function Saved() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [fetching, setFetching] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelected, setCompareSelected] = useState<number[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/browse"); return; }

    supabase
      .from("saved_listings")
      .select("listing_id, listings(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          const rows = data as unknown as SavedListingRow[];
          const parsed = rows
            .map((r: SavedListingRow) => r.listings)
            .filter(Boolean) as Listing[];
          setListings(parsed);
        }
        setFetching(false);
      });
  }, [user, loading, router]);

  const handleUnsave = async (listing: Listing) => {
    setListings((prev) => prev.filter((l) => l.id !== listing.id));
    await supabase
      .from("saved_listings")
      .delete()
      .eq("user_id", user!.id)
      .eq("listing_id", listing.id);
  };

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex flex-col" style={BG}>
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={BG}>
      <Navbar />

      <div className="max-w-4xl mx-auto w-full px-4 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-950 tracking-tight">Saved listings</h1>
            <p className="text-sm text-gray-400 mt-1">
              {listings.length === 0
                ? "No saved listings yet"
                : compareMode
                ? `${compareSelected.length}/2 selected`
                : `${listings.length} saved listing${listings.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex gap-2">
            {listings.length >= 2 && (
              compareMode ? (
                <>
                  <button
                    onClick={() => { setCompareMode(false); setCompareSelected([]); }}
                    className="px-4 py-2.5 min-h-[44px] text-sm font-semibold rounded-full border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={compareSelected.length !== 2}
                    onClick={() => router.push(`/browse?compare=${compareSelected.join(",")}`)}
                    className="px-4 py-2.5 min-h-[44px] bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Compare
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setCompareMode(true)}
                  className="px-4 py-2.5 min-h-[44px] text-sm font-semibold rounded-full border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Compare
                </button>
              )
            )}
            {!compareMode && (
              <button
                onClick={() => router.push("/browse")}
                className="px-4 py-2.5 min-h-[44px] bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Find more
              </button>
            )}
          </div>
        </div>

        {listings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-12 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 14 14" fill="none">
                <path d="M2 2.5C2 1.95 2.45 1.5 3 1.5H11C11.55 1.5 12 1.95 12 2.5V12.5L7 10L2 12.5V2.5Z"
                  stroke="#9ca3af" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              You haven&apos;t saved any listings yet.<br />Swipe right or click the bookmark icon on any listing.
            </p>
            <button
              onClick={() => router.push("/browse")}
              className="px-5 py-2.5 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Browse listings
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {listings.map((listing) => {
              const gradient = GRADIENTS[listing.id % GRADIENTS.length];
              const hasPhoto = listing.photos && listing.photos.length > 0;
              const availDate = new Date(listing.available_from).toLocaleDateString("en-US", {
                month: "short", day: "numeric",
              });
              const genderLabel =
                listing.gender_preference === "female" ? "Female only"
                : listing.gender_preference === "male" ? "Male only"
                : "Any gender";

              const isSelected = compareSelected.includes(listing.id);
              const selectionDisabled = compareMode && !isSelected && compareSelected.length === 2;

              return (
                <div
                  key={listing.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden group transition-all ${
                    compareMode
                      ? isSelected
                        ? "border-black ring-2 ring-black"
                        : selectionDisabled
                        ? "border-black/[0.06] opacity-40"
                        : "border-black/[0.06] cursor-pointer"
                      : "border-black/[0.06]"
                  }`}
                  onClick={compareMode ? () => {
                    if (selectionDisabled) return;
                    setCompareSelected((prev) =>
                      isSelected ? prev.filter((id) => id !== listing.id) : [...prev, listing.id]
                    );
                  } : undefined}
                >
                  {/* Photo */}
                  <div
                    className={`relative h-40 ${compareMode ? "" : "cursor-pointer"} ${hasPhoto ? "" : `bg-gradient-to-br ${gradient}`}`}
                    onClick={compareMode ? undefined : () => router.push(`/browse?listing=${listing.id}`)}
                  >
                    {hasPhoto && (
                      <img src={listing.photos[0]} alt={listing.address} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-black/70 backdrop-blur-sm rounded-full text-white text-[10px] font-medium capitalize">
                      {listing.type}
                    </div>
                    {listing.available_to && (
                      <div className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-black/70 backdrop-blur-sm rounded-full text-white text-[10px]">
                        Until {new Date(listing.available_to).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    )}
                    {compareMode && isSelected && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3.5 3.5 5.5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => router.push(`/browse?listing=${listing.id}`)}
                      >
                        <h3 className="font-semibold text-gray-900 text-sm leading-tight">{listing.title ?? listing.address}</h3>
                        {listing.title && <p className="text-[10px] text-gray-400">{listing.address}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">Avail. {availDate}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 flex-shrink-0">
                        ${listing.price.toLocaleString()}
                        <span className="text-xs font-normal text-gray-400">/mo</span>
                      </p>
                    </div>

                    <div className="flex gap-1.5 flex-wrap mb-3">
                      <span className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px] text-gray-500">{genderLabel}</span>
                      {listing.furnished && <span className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px] text-gray-500">Furnished</span>}
                      {listing.utilities_included && <span className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px] text-gray-500">Utils incl.</span>}
                      {listing.parking && <span className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px] text-gray-500">Parking</span>}
                    </div>

                    {!compareMode && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/browse?listing=${listing.id}`)}
                          className="flex-1 py-2 bg-black text-white text-xs font-semibold rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
                        >
                          View listing
                        </button>
                        <button
                          onClick={() => handleUnsave(listing)}
                          className="px-3 py-2 border border-black/[0.08] text-xs text-gray-500 rounded-full hover:border-red-200 hover:text-red-500 transition-colors cursor-pointer"
                          title="Remove from saved"
                        >
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                            <path d="M2 2.5C2 1.95 2.45 1.5 3 1.5H11C11.55 1.5 12 1.95 12 2.5V12.5L7 10L2 12.5V2.5Z"
                              stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
