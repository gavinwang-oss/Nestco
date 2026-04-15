"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type Listing = {
  id: number;
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

const GRADIENTS = [
  "from-amber-100 to-orange-200",
  "from-blue-100 to-indigo-200",
  "from-pink-100 to-rose-200",
  "from-green-100 to-emerald-200",
  "from-violet-100 to-purple-200",
  "from-sky-100 to-cyan-200",
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MyListings() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/browse");
      return;
    }

    supabase
      .from("listings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setListings(data as Listing[]);
        setFetching(false);
      });
  }, [user, loading, router]);

  const handleDelete = async (listing: Listing) => {
    if (!window.confirm(`Delete the listing at ${listing.address}? This cannot be undone.`)) return;
    setListings((prev) => prev.filter((l) => l.id !== listing.id));
    await supabase
      .from("listings")
      .delete()
      .eq("id", listing.id)
      .eq("user_id", user!.id);
  };

  if (loading || fetching) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{
          backgroundColor: "#f5f4f0",
          backgroundImage: `linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)`,
          backgroundSize: "42px 42px",
        }}
      >
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: "#f5f4f0",
        backgroundImage: `linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)`,
        backgroundSize: "42px 42px",
      }}
    >
      <Navbar />

      <div className="max-w-3xl mx-auto w-full px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-950 tracking-tight">My listings</h1>
            <p className="text-sm text-gray-400 mt-1">
              {listings.length === 0
                ? "No listings yet"
                : `${listings.length} listing${listings.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Link
            href="/create"
            className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors"
          >
            List a new place
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-12 text-center">
            <p className="text-gray-400 text-sm mb-4">You haven&apos;t listed any places yet.</p>
            <Link
              href="/create"
              className="px-5 py-2.5 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors"
            >
              List a place
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {listings.map((listing, i) => {
              const gradient = GRADIENTS[i % GRADIENTS.length];
              const hasPhoto = listing.photos && listing.photos.length > 0;
              return (
                <div
                  key={listing.id}
                  className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden flex"
                >
                  <div className="w-36 flex-shrink-0">
                    {hasPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={listing.photos[0]}
                        alt={listing.address}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${gradient} min-h-[120px]`} />
                    )}
                  </div>

                  <div className="flex-1 p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 leading-snug">
                            {listing.address}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 capitalize">
                            {listing.type}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-gray-900 flex-shrink-0">
                          ${listing.price.toLocaleString()}/mo
                        </span>
                      </div>

                      <div className="flex gap-3 mt-3 text-xs text-gray-500">
                        <span>Available {formatDate(listing.available_from)}</span>
                        {listing.utilities_included && (
                          <span className="text-green-600">Utilities included</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-gray-300">
                        Listed {formatDate(listing.created_at)}
                      </span>
                      <button
                        onClick={() => handleDelete(listing)}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
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
