"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";

const STEPS = ["Basics", "The place", "Roommates", "Details"];

type Form = {
  title: string;
  type: string;
  address: string;
  price: string;
  utilities_included: boolean;
  available_from: string;
  available_to: string;
  furnished: boolean;
  parking: boolean;
  pets: boolean;
  smokers: boolean;
  dwinelle_distance: string;
  gender_preference: string;
  num_roommates: string;
  roommate_genders: string;
  roommate_age_min: string;
  roommate_age_max: string;
  description: string;
  photos: File[];
};

const DEFAULT_FORM: Form = {
  title: "",
  type: "",
  address: "",
  price: "",
  utilities_included: false,
  available_from: "",
  available_to: "",
  furnished: false,
  parking: false,
  pets: false,
  smokers: false,
  dwinelle_distance: "",
  gender_preference: "any",
  num_roommates: "",
  roommate_genders: "",
  roommate_age_min: "",
  roommate_age_max: "",
  description: "",
  photos: [],
};

function YesNo({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex gap-2">
      {([true, false] as boolean[]).map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className={`px-5 py-2 rounded-full text-sm font-medium border transition-all cursor-pointer ${
            value === v
              ? "bg-black text-white border-black"
              : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
          }`}
        >
          {v ? "Yes" : "No"}
        </button>
      ))}
    </div>
  );
}

export default function Create() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(DEFAULT_FORM);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/browse");
    }
  }, [user, loading, router]);

  const set = <K extends keyof Form>(field: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors([]);
  };

  const validate = (): string[] => {
    const errs: string[] = [];
    if (step === 0) {
      if (!form.type) errs.push("Please select a type.");
      if (!form.address.trim()) errs.push("Please enter an address.");
      if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0)
        errs.push("Please enter a valid price.");
      if (!form.available_from) errs.push("Please set an available from date.");
    }
    if (step === 3) {
      if (!form.description.trim()) errs.push("Please write a description.");
    }
    return errs;
  };

  const next = () => {
    const errs = validate();
    if (errs.length) {
      setErrors(errs);
      return;
    }
    setStep((s) => s + 1);
    setErrors([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const back = () => {
    setStep((s) => s - 1);
    setErrors([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      set("photos", Array.from(e.target.files));
    }
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (errs.length) {
      setErrors(errs);
      return;
    }
    if (!user) return;

    setSubmitting(true);

    // Upload photos
    const { toJpegBlob } = await import("@/lib/imageUtils");
    const photoUrls: string[] = [];
    for (const photo of form.photos) {
      const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.jpg`;
      const jpeg = await toJpegBlob(photo);
      const { error: uploadError } = await supabase.storage
        .from("listing-photos")
        .upload(path, jpeg, { contentType: "image/jpeg" });
      if (uploadError) {
        console.error("Photo upload failed:", uploadError.message);
        setErrors([`Photo upload failed: ${uploadError.message}`]);
        setSubmitting(false);
        return;
      }
      const { data } = supabase.storage
        .from("listing-photos")
        .getPublicUrl(path);
      photoUrls.push(data.publicUrl);
    }

    const { data: insertedRows, error } = await supabase
      .from("listings")
      .insert([
        {
          user_id: user.id,
          title: form.title.trim() || null,
          type: form.type,
          address: form.address,
          price: Number(form.price),
          utilities_included: form.utilities_included,
          available_from: form.available_from,
          available_to: form.available_to || null,
          furnished: form.furnished,
          parking: form.parking,
          pets: form.pets,
          smokers: form.smokers,
          dwinelle_distance: form.dwinelle_distance
            ? Number(form.dwinelle_distance)
            : null,
          gender_preference: form.gender_preference,
          num_roommates: form.num_roommates ? Number(form.num_roommates) : 0,
          roommate_genders: form.roommate_genders || null,
          roommate_age_min: form.roommate_age_min
            ? Number(form.roommate_age_min)
            : null,
          roommate_age_max: form.roommate_age_max
            ? Number(form.roommate_age_max)
            : null,
          description: form.description,
          photos: photoUrls,
        },
      ])
      .select("id")
      .single();

    setSubmitting(false);
    if (!error && insertedRows) {
      // Check against open requests in background
      setToast("Checking your listing against open requests...");
      supabase.auth.getSession().then(({ data: { session } }) => {
        fetch("/api/match-requests", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ listingId: insertedRows.id }),
        })
        .then((r) => r.json())
        .then((data) => {
          const count = data.matched ?? 0;
          if (count > 0) {
            setToast(`Notified ${count} ${count === 1 ? "person" : "people"} whose criteria match your listing!`);
          } else {
            setToast(null);
          }
          setTimeout(() => {
            router.push("/my-listings");
          }, count > 0 ? 3000 : 0);
        })
        .catch(() => {
          router.push("/my-listings");
        });
      });
    } else if (error) {
      setErrors([error.message]);
    }
  };

  if (loading || !user) return null;

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: `url('/sb1.png')`,
    backgroundSize: "cover",
    backgroundPosition: "center", backgroundAttachment: "fixed",
      }}
    >
      <Navbar />

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-gray-950 text-white text-sm font-medium rounded-full shadow-lg flex items-center gap-2 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
          {toast}
        </div>
      )}

      <div className="flex-1 flex items-start justify-center px-4 sm:px-6 py-6 sm:py-12">
        <div className="w-full max-w-xl">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-950 mb-1">
              List your place
            </h1>
            <p className="text-sm text-gray-400">
              Step {step + 1} of {STEPS.length} — {STEPS[step]}
            </p>
            {/* Progress bar */}
            <div className="mt-4 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-black rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-black/[0.06] shadow-sm p-5 sm:p-8">
            {/* ── Step 1: Basics ── */}
            {step === 0 && (
              <div className="flex flex-col gap-6">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-2">
                    Type <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {["Private Room", "Shared Room", "Entire Studio", "Entire 1BR", "Entire 2BR"].map(
                      (t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => set("type", t)}
                          className={`px-4 py-2 rounded-full text-sm font-medium border transition-all cursor-pointer ${
                            form.type === t
                              ? "bg-black text-white border-black"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                          }`}
                        >
                          {t}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">
                    Listing title
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    placeholder="e.g. Cozy furnished single near Southside"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">
                    Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder="e.g. 2847 Telegraph Ave, Berkeley, CA"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>

                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-500 block mb-1.5">
                      Monthly rent ($) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => set("price", e.target.value)}
                      onKeyDown={(e) => ["e","E","+","-"].includes(e.key) && e.preventDefault()}
                      placeholder="e.g. 1200"
                      min={0}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-black/10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1.5">
                      Utilities included?
                    </label>
                    <YesNo
                      value={form.utilities_included}
                      onChange={(v) => set("utilities_included", v)}
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-500 block mb-1.5">
                      Available from <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.available_from}
                      onChange={(e) => set("available_from", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black/10"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-500 block mb-1.5">
                      Available to
                    </label>
                    <input
                      type="date"
                      value={form.available_to}
                      onChange={(e) => set("available_to", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black/10"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: The place ── */}
            {step === 1 && (
              <div className="flex flex-col gap-6">
                {(
                  [
                    { label: "Furnished?", field: "furnished" },
                    { label: "Parking available?", field: "parking" },
                    { label: "Pets allowed?", field: "pets" },
                    { label: "Smokers allowed?", field: "smokers" },
                  ] as { label: string; field: keyof Form }[]
                ).map(({ label, field }) => (
                  <div key={field} className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      {label}
                    </label>
                    <YesNo
                      value={form[field] as boolean}
                      onChange={(v) => set(field, v as Form[typeof field])}
                    />
                  </div>
                ))}

                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">
                    Walking distance from Dwinelle Hall (minutes)
                  </label>
                  <input
                    type="number"
                    value={form.dwinelle_distance}
                    onChange={(e) => set("dwinelle_distance", e.target.value)}
                    placeholder="e.g. 10"
                    min={1}
                    max={60}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-black/10"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    Your best estimate — check Google Maps if unsure.
                  </p>
                </div>
              </div>
            )}

            {/* ── Step 3: Roommates ── */}
            {step === 2 && (
              <div className="flex flex-col gap-6">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-2">
                    Gender preference
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { label: "Any", value: "any" },
                      { label: "Female only", value: "female" },
                      { label: "Male only", value: "male" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => set("gender_preference", opt.value)}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-all cursor-pointer ${
                          form.gender_preference === opt.value
                            ? "bg-black text-white border-black"
                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">
                    Number of existing roommates (not including you)
                  </label>
                  <input
                    type="number"
                    value={form.num_roommates}
                    onChange={(e) => set("num_roommates", e.target.value)}
                    placeholder="e.g. 2"
                    min={0}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>

                {Number(form.num_roommates) > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-2">
                      Existing roommates&apos; genders
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { label: "All male", value: "all male" },
                        { label: "All female", value: "all female" },
                        { label: "Mixed", value: "mixed" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => set("roommate_genders", opt.value)}
                          className={`px-4 py-2 rounded-full text-sm font-medium border transition-all cursor-pointer ${
                            form.roommate_genders === opt.value
                              ? "bg-black text-white border-black"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">
                    Existing roommates&apos; age range
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={form.roommate_age_min}
                      onChange={(e) => set("roommate_age_min", e.target.value)}
                      placeholder="Min"
                      min={18}
                      max={99}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-black/10"
                    />
                    <span className="text-gray-400 text-sm flex-shrink-0">to</span>
                    <input
                      type="number"
                      value={form.roommate_age_max}
                      onChange={(e) => set("roommate_age_max", e.target.value)}
                      placeholder="Max"
                      min={18}
                      max={99}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-black/10"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 4: Description + Photos ── */}
            {step === 3 && (
              <div className="flex flex-col gap-6">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">
                    Description <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="Tell potential renters about your place — the vibe, what's nearby, house rules, what you're looking for in a roommate..."
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-black/10 resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">
                    Photos
                  </label>
                  <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 cursor-pointer hover:border-gray-400 transition-colors">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      className="mb-2"
                    >
                      <path
                        d="M3 13l4-4 3 3 3-4 4 5H3z"
                        stroke="#9ca3af"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="6.5"
                        cy="6.5"
                        r="1.5"
                        stroke="#9ca3af"
                        strokeWidth="1.5"
                      />
                      <rect
                        x="1.5"
                        y="1.5"
                        width="17"
                        height="17"
                        rx="2.5"
                        stroke="#9ca3af"
                        strokeWidth="1.5"
                      />
                    </svg>
                    <span className="text-xs text-gray-400">
                      {form.photos.length > 0
                        ? `${form.photos.length} photo${form.photos.length > 1 ? "s" : ""} selected`
                        : "Click to upload photos"}
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotos}
                    />
                  </label>
                  {form.photos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {form.photos.map((f, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-gray-100 rounded-lg text-xs text-gray-600 truncate max-w-[160px]"
                        >
                          {f.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Errors */}
            {errors.length > 0 && (
              <div className="mt-5 space-y-1">
                {errors.map((e, i) => (
                  <p key={i} className="text-red-500 text-xs">
                    {e}
                  </p>
                ))}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-gray-100">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={back}
                  className="px-5 py-2.5 min-h-[44px] border border-gray-200 text-sm font-medium text-gray-600 rounded-full hover:border-gray-400 transition-all cursor-pointer"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={next}
                  className="px-6 py-2.5 min-h-[44px] bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-all cursor-pointer"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2.5 min-h-[44px] bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-all cursor-pointer disabled:opacity-60"
                >
                  {submitting ? "Publishing..." : "Publish listing"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
