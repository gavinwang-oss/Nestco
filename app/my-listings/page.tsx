"use client";
import { useState, useEffect, useRef } from "react";
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

const LISTING_TYPES = ["Private Room", "Shared Room", "Entire Studio", "Entire 1BR", "Entire 2BR"];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PillToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-1.5">
      <button type="button" onClick={() => onChange(false)}
        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${!value ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
        No
      </button>
      <button type="button" onClick={() => onChange(true)}
        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${value ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
        Yes
      </button>
    </div>
  );
}

function EditModal({ listing, onClose, onSave }: {
  listing: Listing;
  onClose: () => void;
  onSave: (updated: Listing) => void;
}) {
  const [type, setType] = useState(listing.type);
  const [address, setAddress] = useState(listing.address);
  const [price, setPrice] = useState(String(listing.price));
  const [availableFrom, setAvailableFrom] = useState(listing.available_from ?? "");
  const [availableTo, setAvailableTo] = useState(listing.available_to ?? "");
  const [description, setDescription] = useState(listing.description ?? "");
  const [furnished, setFurnished] = useState(listing.furnished);
  const [utilitiesIncluded, setUtilitiesIncluded] = useState(listing.utilities_included);
  const [pets, setPets] = useState(listing.pets);
  const [parking, setParking] = useState(listing.parking);
  const [genderPreference, setGenderPreference] = useState(listing.gender_preference ?? "any");
  const [photos, setPhotos] = useState<string[]>(listing.photos ?? []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingPhoto(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files).slice(0, 10 - photos.length)) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${listing.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("listing-photos").upload(path, file, { contentType: file.type, upsert: false });
      if (!error) {
        const { data } = supabase.storage.from("listing-photos").getPublicUrl(path);
        newUrls.push(data.publicUrl);
      }
    }
    setPhotos((prev) => [...prev, ...newUrls]);
    setUploadingPhoto(false);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    const updates = {
      type,
      address,
      price: Number(price),
      available_from: availableFrom || listing.available_from,
      available_to: availableTo || null,
      description,
      furnished,
      utilities_included: utilitiesIncluded,
      pets,
      parking,
      gender_preference: genderPreference,
      photos,
    };
    const { error } = await supabase.from("listings").update(updates).eq("id", listing.id);
    setSaving(false);
    if (!error) {
      setSaved(true);
      onSave({ ...listing, ...updates });
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-black/[0.06]">
          <h2 className="text-lg font-bold text-gray-950">Edit listing</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.5 1.5l11 11M12.5 1.5l-11 11" stroke="#374151" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          {/* Photos */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Photos</label>
            {photos.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-2">
                {photos.map((url, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center cursor-pointer">
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="flex items-center justify-center w-full h-12 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 cursor-pointer hover:border-gray-400 transition-colors">
              <span className="text-xs text-gray-400">{uploadingPhoto ? "Uploading..." : "+ Add photos"}</span>
              <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handlePhotoUpload(e.target.files)} />
            </label>
          </div>

          {/* Type */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Type</label>
            <div className="flex gap-2 flex-wrap">
              {LISTING_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${type === t ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Address</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black/10" />
          </div>

          {/* Price */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Monthly rent ($)</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black/10" />
          </div>

          {/* Dates */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Available from</label>
              <input type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black/10" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Available until</label>
              <input type="date" value={availableTo} onChange={(e) => setAvailableTo(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black/10" />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-4 flex-wrap">
            <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">Furnished</label><PillToggle value={furnished} onChange={setFurnished} /></div>
            <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">Utilities included</label><PillToggle value={utilitiesIncluded} onChange={setUtilitiesIncluded} /></div>
            <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">Pets ok</label><PillToggle value={pets} onChange={setPets} /></div>
            <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">Parking</label><PillToggle value={parking} onChange={setParking} /></div>
          </div>

          {/* Gender preference */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Gender preference</label>
            <div className="flex gap-2">
              {[{ label: "Any", value: "any" }, { label: "Female only", value: "female" }, { label: "Male only", value: "male" }].map((opt) => (
                <button key={opt.value} type="button" onClick={() => setGenderPreference(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${genderPreference === opt.value ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black/10 resize-none" />
          </div>

          {/* Save */}
          <button onClick={handleSave} disabled={saving}
            className={`w-full py-3 rounded-full text-sm font-semibold transition-all cursor-pointer ${saved ? "bg-green-600 text-white" : "bg-black text-white hover:bg-gray-800"} disabled:opacity-60`}>
            {saved ? "Saved!" : saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyListings() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [fetching, setFetching] = useState(true);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);

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
    if (editingListing?.id === listing.id) setEditingListing(null);
    await supabase.from("listings").delete().eq("id", listing.id).eq("user_id", user!.id);
  };

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f5f4f0", backgroundImage: `linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)`, backgroundSize: "42px 42px" }}>
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f5f4f0", backgroundImage: `linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)`, backgroundSize: "42px 42px" }}>
      <Navbar />

      {editingListing && (
        <EditModal
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onSave={(updated) => setListings((prev) => prev.map((l) => l.id === updated.id ? updated : l))}
        />
      )}

      <div className="max-w-3xl mx-auto w-full px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-950 tracking-tight">My listings</h1>
            <p className="text-sm text-gray-400 mt-1">
              {listings.length === 0 ? "No listings yet" : `${listings.length} listing${listings.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Link href="/create" className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors">
            List a new place
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-12 text-center">
            <p className="text-gray-400 text-sm mb-4">You haven&apos;t listed any places yet.</p>
            <Link href="/create" className="px-5 py-2.5 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors">
              List a place
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {listings.map((listing, i) => {
              const gradient = GRADIENTS[i % GRADIENTS.length];
              const hasPhoto = listing.photos && listing.photos.length > 0;
              return (
                <div key={listing.id} className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden flex">
                  <button onClick={() => setEditingListing(listing)} className="w-36 flex-shrink-0 cursor-pointer">
                    {hasPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={listing.photos[0]} alt={listing.address} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${gradient} min-h-[120px]`} />
                    )}
                  </button>

                  <div className="flex-1 p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <button onClick={() => setEditingListing(listing)} className="text-left hover:underline cursor-pointer">
                          <p className="text-sm font-semibold text-gray-900 leading-snug">{listing.address}</p>
                          <p className="text-xs text-gray-400 mt-0.5 capitalize">{listing.type}</p>
                        </button>
                        <span className="text-sm font-bold text-gray-900 flex-shrink-0">${listing.price.toLocaleString()}/mo</span>
                      </div>
                      <div className="flex gap-3 mt-3 text-xs text-gray-500">
                        <span>Available {formatDate(listing.available_from)}</span>
                        {listing.utilities_included && <span className="text-green-600">Utilities included</span>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-gray-300">Listed {formatDate(listing.created_at)}</span>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingListing(listing)}
                          className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors cursor-pointer">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(listing)}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition-colors cursor-pointer">
                          Delete
                        </button>
                      </div>
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
