"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

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

function Pill({ label }: { label: string }) {
  return (
    <span className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600 font-medium">
      {label}
    </span>
  );
}

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setListing(data as Listing);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ backgroundImage: `url('/sb1.png')`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ backgroundImage: `url('/sb1.png')`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">Listing not found.</p>
        </div>
      </div>
    );
  }

  const genderLabel =
    listing.gender_preference === "female"
      ? "Female only"
      : listing.gender_preference === "male"
      ? "Male only"
      : "Any gender";

  const availFrom = new Date(listing.available_from).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const availTo = listing.available_to
    ? new Date(listing.available_to).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const hasPhotos = listing.photos?.length > 0;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: `url('/sb1.png')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Navbar />

      <div className="max-w-3xl mx-auto w-full px-6 py-10">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-6 cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M9 11L5 7L9 3"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to listings
        </button>

        <div className="bg-white rounded-3xl border border-black/[0.06] overflow-hidden shadow-sm">
          {/* Photo area */}
          <div className="relative h-72 bg-gradient-to-br from-amber-100 to-orange-200">
            {hasPhotos && (
              <>
                <img
                  src={listing.photos[photoIndex]}
                  alt={listing.address}
                  className="w-full h-full object-cover"
                />
                {listing.photos.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setPhotoIndex((prev) =>
                          prev === 0 ? listing.photos.length - 1 : prev - 1
                        )
                      }
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors cursor-pointer"
                    >
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <path d="M9 11L5 7L9 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      onClick={() =>
                        setPhotoIndex((prev) =>
                          prev === listing.photos.length - 1 ? 0 : prev + 1
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors cursor-pointer"
                    >
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <path d="M5 3L9 7L5 11" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {listing.photos.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setPhotoIndex(i)}
                          className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                            i === photoIndex ? "bg-white" : "bg-white/50"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
            <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/70 backdrop-blur-sm rounded-full text-white text-xs font-medium capitalize">
              {listing.type}
            </div>
            {hasPhotos && (
              <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/70 backdrop-blur-sm rounded-full text-white text-xs">
                {photoIndex + 1} / {listing.photos.length}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-7">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h1 className="text-xl font-bold text-gray-950 mb-0.5">{listing.address}</h1>
                <p className="text-sm text-gray-400">
                  Available {availFrom}{availTo ? ` – ${availTo}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-950">
                  ${listing.price.toLocaleString()}
                  <span className="text-sm font-normal text-gray-400">/mo</span>
                </p>
                {listing.utilities_included && (
                  <p className="text-xs text-gray-400 mt-0.5">Utilities included</p>
                )}
              </div>
            </div>

            {/* Pills */}
            <div className="flex flex-wrap gap-2 mb-6">
              <Pill label={genderLabel} />
              {listing.furnished && <Pill label="Furnished" />}
              {listing.parking && <Pill label="Parking" />}
              {listing.pets && <Pill label="Pets OK" />}
              {listing.smokers && <Pill label="Smokers OK" />}
              {listing.utilities_included && <Pill label="Utilities included" />}
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6 text-sm">
              <div>
                <p className="text-gray-400 text-xs mb-0.5">Roommates</p>
                <p className="text-gray-900 font-medium">{listing.num_roommates}</p>
              </div>
              {(listing.roommate_age_min || listing.roommate_age_max) && (
                <div>
                  <p className="text-gray-400 text-xs mb-0.5">Existing roommates&apos; ages</p>
                  <p className="text-gray-900 font-medium">
                    {listing.roommate_age_min ?? "—"} – {listing.roommate_age_max ?? "—"}
                  </p>
                </div>
              )}
              {listing.dwinelle_distance != null && (
                <div>
                  <p className="text-gray-400 text-xs mb-0.5">Distance to Dwinelle</p>
                  <p className="text-gray-900 font-medium">{listing.dwinelle_distance} min walk</p>
                </div>
              )}
            </div>

            {/* Description */}
            {listing.description && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Description</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {listing.description}
                </p>
              </div>
            )}

            {/* Contact button */}
            <div className="mt-8 pt-6 border-t border-black/[0.06]">
              <button className="w-full py-3 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors cursor-pointer">
                Request to view
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
