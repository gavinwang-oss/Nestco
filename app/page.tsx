"use client";

import { useState, useRef, useEffect } from "react";

function ListingCard({
  title,
  price,
  type,
  location,
  gradient,
}: {
  title: string;
  price: string;
  type: string;
  location: string;
  gradient: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-4 w-52 border border-black/[0.06]">
      <div className={`w-full h-24 ${gradient} rounded-xl mb-3`} />
      <p className="text-xs text-gray-400 mb-1">
        {type} · {location}
      </p>
      <p className="font-semibold text-gray-900 text-sm leading-tight">{title}</p>
      <p className="text-sm font-bold text-gray-900 mt-1.5">
        {price}
        <span className="font-normal text-gray-400">/mo</span>
      </p>
    </div>
  );
}

function SearchCard() {
  return (
    <div className="bg-white rounded-2xl shadow-md p-4 w-60 border border-black/[0.06]">
      <div className="flex items-center gap-1.5 mb-3">
        <div className="w-2 h-2 rounded-full bg-black" />
        <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">AI Search</p>
      </div>
      <p className="text-sm text-gray-600 italic leading-relaxed">
        &ldquo;Single room near campus under $1,400, female roommates only&rdquo;
      </p>
      <div className="mt-3 flex gap-2 flex-wrap">
        <div className="h-5 w-14 bg-stone-100 rounded-full" />
        <div className="h-5 w-20 bg-stone-100 rounded-full" />
        <div className="h-5 w-12 bg-stone-100 rounded-full" />
      </div>
    </div>
  );
}

function NotificationCard() {
  return (
    <div className="bg-white rounded-2xl shadow-md p-4 w-56 border border-black/[0.06]">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7L5.5 10L11.5 4" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-900">Request matched!</p>
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
            A listing matching your request just went live.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [waitlistId, setWaitlistId] = useState<string | number | null>(null);

  // Step 2 state
  const [intent, setIntent] = useState<"find" | "list" | null>(null);
  const [listingType, setListingType] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [detailsSubmitted, setDetailsSubmitted] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [typeError, setTypeError] = useState(false);

  const step2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (emailSubmitted && step2Ref.current) {
      setTimeout(() => {
        step2Ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [emailSubmitted]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    if (!email.endsWith(".edu")) {
      setEmailError("A .edu email is required to join.");
      return;
    }
    setEmailLoading(true);
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setEmailLoading(false);
    if (!res.ok) {
      setEmailError(data.error ?? "Something went wrong.");
      return;
    }
    setWaitlistId(data.waitlist_id ?? null);
    setEmailSubmitted(true);
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listingType) {
      setTypeError(true);
      return;
    }
    setDetailsLoading(true);
    await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        waitlist_id: waitlistId,
        intent,
        listing_type: listingType,
        location,
        price,
        available_from: availableFrom,
        description,
      }),
    });
    setDetailsLoading(false);
    setDetailsSubmitted(true);
  };

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "#f5f4f0",
        backgroundImage: `linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)`,
        backgroundSize: "42px 42px",
      }}
    >
      {/* Hero section */}
      <div className="relative min-h-screen overflow-hidden flex items-center justify-center">

        {/* Floating cards — desktop only */}
        <div className="hidden lg:block">
          <div className="absolute top-[12%] left-[5%]" style={{ transform: "rotate(-7deg)" }}>
            <div style={{ animation: "floatY 6s ease-in-out infinite" }}>
              <ListingCard title="Bright Studio near Campanile" price="$1,200" type="Studio" location="Downtown Berkeley" gradient="bg-gradient-to-br from-amber-100 to-orange-200" />
            </div>
          </div>
          <div className="absolute top-[60%] left-[4%]" style={{ transform: "rotate(5deg)" }}>
            <div style={{ animation: "floatY 6s ease-in-out 2s infinite" }}>
              <ListingCard title="Private Room in 3BR Apt" price="$1,050" type="1 Room" location="Telegraph Ave" gradient="bg-gradient-to-br from-blue-100 to-indigo-200" />
            </div>
          </div>
          <div className="absolute top-[10%] right-[5%]" style={{ transform: "rotate(6deg)" }}>
            <div style={{ animation: "floatY 6s ease-in-out 1s infinite" }}>
              <SearchCard />
            </div>
          </div>
          <div className="absolute top-[52%] right-[4%]" style={{ transform: "rotate(-5deg)" }}>
            <div style={{ animation: "floatY 6s ease-in-out 3s infinite" }}>
              <ListingCard title="Sunny Room, Female Only" price="$980" type="1 Room" location="Northside" gradient="bg-gradient-to-br from-pink-100 to-rose-200" />
            </div>
          </div>
          <div className="absolute bottom-[10%] right-[8%]" style={{ transform: "rotate(3deg)" }}>
            <div style={{ animation: "floatY 6s ease-in-out 4s infinite" }}>
              <NotificationCard />
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg w-full">
          <div className="mb-10 flex items-center gap-2.5">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold tracking-tight">N</span>
            </div>
            <span className="text-xl font-semibold tracking-tight text-gray-900">nestco</span>
          </div>

          <h1 className="text-5xl sm:text-[3.75rem] font-bold tracking-tight text-gray-950 leading-[1.08] mb-5">
            Student subletting,<br />actually good.
          </h1>

          <p className="text-gray-500 text-lg leading-relaxed mb-1.5 max-w-sm">
            Find or list sublets at UC Berkeley — verified by .edu, powered by AI.
          </p>
          <p className="text-gray-400 text-sm mb-8">Launching soon. Join the waitlist.</p>

          {!emailSubmitted ? (
            <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                placeholder="your@university.edu"
                required
                className="flex-1 px-5 py-3 rounded-full border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-black/10 shadow-sm"
              />
              <button
                type="submit"
                disabled={emailLoading}
                className="px-6 py-3 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 active:scale-95 transition-all whitespace-nowrap shadow-sm cursor-pointer disabled:opacity-60"
              >
                {emailLoading ? "Joining..." : "Join Waitlist"}
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 px-6 py-3 bg-black text-white text-sm font-semibold rounded-full shadow-sm">
              <span>You&apos;re on the list</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}

          {emailError && <p className="text-red-500 text-xs mt-2">{emailError}</p>}
          <p className="text-gray-400 text-xs mt-4">.edu email required · UC Berkeley only for now</p>
        </div>
      </div>

      {/* Step 2 — optional details */}
      {emailSubmitted && (
        <div
          ref={step2Ref}
          className="flex justify-center px-6 pb-24 pt-4"
        >
          <div className="w-full max-w-md bg-white rounded-3xl border border-black/[0.06] shadow-sm p-8">
            {!detailsSubmitted ? (
              <>
                <p className="text-xs text-gray-400 font-medium tracking-wide uppercase mb-1">One more thing</p>
                <h2 className="text-xl font-bold text-gray-950 mb-1">Are you looking to find or list?</h2>
                <p className="text-sm text-gray-400 mb-6">Optional — takes 30 seconds and helps us prepare for launch.</p>

                {/* Intent toggle */}
                <div className="flex gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => setIntent("find")}
                    className={`flex-1 py-2.5 rounded-full text-sm font-medium border transition-all cursor-pointer ${
                      intent === "find"
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    Find a place
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntent("list")}
                    className={`flex-1 py-2.5 rounded-full text-sm font-medium border transition-all cursor-pointer ${
                      intent === "list"
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    List my place
                  </button>
                </div>

                {intent === "find" && (
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-4">Got it — we&apos;ll notify you the moment we launch with available listings.</p>
                    <button
                      onClick={async () => {
                        await fetch("/api/waitlist", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email, waitlist_id: waitlistId, intent: "find" }),
                        });
                        setDetailsSubmitted(true);
                      }}
                      className="px-6 py-2.5 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-all cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                )}

                {intent === "list" && (
                  <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-4">
                    <p className="text-sm text-gray-500 -mt-2">
                      Share your listing details and we&apos;ll publish it automatically on launch day. All fields are optional.
                    </p>

                    {/* Type */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                        Type <span className="text-red-400">*</span>
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {["Full apartment", "Private room", "Shared room"].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => { setListingType(t); setTypeError(false); }}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                              listingType === t
                                ? "bg-black text-white border-black"
                                : typeError
                                ? "bg-white text-gray-600 border-red-300 hover:border-red-400"
                                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      {typeError && <p className="text-red-400 text-xs mt-1.5">Please select a type to continue.</p>}
                    </div>

                    {/* Location */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">Location / Address</label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Telegraph Ave, Berkeley"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-black/10"
                      />
                    </div>

                    {/* Price */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">Monthly rent ($)</label>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="e.g. 1200"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-black/10"
                      />
                    </div>

                    {/* Available from */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">Available from</label>
                      <input
                        type="date"
                        value={availableFrom}
                        onChange={(e) => setAvailableFrom(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black/10"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">Description</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tell potential renters about your place — amenities, vibe, roommate preferences, etc."
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-black/10 resize-none"
                      />
                    </div>

                    {/* Photos */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">Photos</label>
                      <label className="flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 cursor-pointer hover:border-gray-400 transition-colors">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mb-1.5">
                          <path d="M3 13l4-4 3 3 3-4 4 5H3z" stroke="#9ca3af" strokeWidth="1.5" strokeLinejoin="round" />
                          <circle cx="6.5" cy="6.5" r="1.5" stroke="#9ca3af" strokeWidth="1.5" />
                          <rect x="1.5" y="1.5" width="17" height="17" rx="2.5" stroke="#9ca3af" strokeWidth="1.5" />
                        </svg>
                        <span className="text-xs text-gray-400">
                          {photos && photos.length > 0 ? `${photos.length} photo${photos.length > 1 ? "s" : ""} selected` : "Click to upload photos"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => setPhotos(e.target.files)}
                        />
                      </label>
                    </div>

                    <div className="flex gap-3 mt-1">
                      <button
                        type="submit"
                        disabled={detailsLoading}
                        className="flex-1 py-2.5 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-all cursor-pointer disabled:opacity-60"
                      >
                        {detailsLoading ? "Submitting..." : "Submit listing details"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailsSubmitted(true)}
                        className="px-4 py-2.5 text-gray-400 text-sm rounded-full hover:text-gray-600 transition-all cursor-pointer"
                      >
                        Skip
                      </button>
                    </div>
                  </form>
                )}

                {intent === null && (
                  <button
                    type="button"
                    onClick={() => setDetailsSubmitted(true)}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    Skip for now
                  </button>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8L6.5 11.5L13 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-950 mb-1">All set!</h3>
                <p className="text-sm text-gray-400">We&apos;ll be in touch when Nestco launches at Berkeley.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
