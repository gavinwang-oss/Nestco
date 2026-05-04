"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

type Status = "loading" | "creating" | "success" | "error" | "no_listing";

export default function ActivatePage() {
  const [status, setStatus] = useState<Status>("loading");
  const activatedRef = useRef(false);

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const activate = async (accessToken: string) => {
      if (activatedRef.current) return;
      activatedRef.current = true;
      setStatus("creating");
      try {
        const res = await fetch("/api/activate-listing", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (res.ok) {
          setStatus("success");
        } else if (res.status === 404) {
          setStatus("no_listing");
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    };

    // Listen for auth state changes (handles magic link redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.access_token) {
        activate(session.access_token);
      }
    });

    // Also check if already signed in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        activate(session.access_token);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{
        backgroundImage: `url('/sb1.png')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
      }}
    >
      <div className="w-full max-w-md bg-white rounded-3xl border border-black/[0.06] shadow-sm p-10 text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold tracking-tight">N</span>
          </div>
          <span className="text-xl font-semibold tracking-tight text-gray-900">nestco</span>
        </div>

        {(status === "loading" || status === "creating") && (
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-10 h-10 rounded-full border-2 border-black/10 border-t-black"
              style={{ animation: "spin 0.8s linear infinite" }}
            />
            <p className="text-sm text-gray-500">
              {status === "loading" ? "Activating your listing..." : "Publishing your listing..."}
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3.5 9L7.5 13L14.5 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-950 mb-1">Your listing is live!</h2>
              <p className="text-sm text-gray-400">Welcome to Nestco. You can manage your listing and add photos from your dashboard.</p>
            </div>
            <div className="flex flex-col gap-2.5 w-full mt-2">
              <Link
                href="/my-listings"
                className="w-full py-3 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-all text-center"
              >
                View my listing
              </Link>
              <Link
                href="/browse"
                className="w-full py-3 bg-white text-gray-700 text-sm font-semibold rounded-full border border-gray-200 hover:border-gray-400 transition-all text-center"
              >
                Browse listings
              </Link>
            </div>
          </div>
        )}

        {status === "no_listing" && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8.5" stroke="#9ca3af" strokeWidth="1.5" />
                <path d="M10 6v5" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="10" cy="14" r="0.75" fill="#9ca3af" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-950 mb-1">No pending listing found</h2>
              <p className="text-sm text-gray-400">It looks like there&apos;s no listing waiting to be published. Try filling out the form again.</p>
            </div>
            <Link
              href="/"
              className="w-full py-3 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-all text-center mt-1"
            >
              Back to home
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8.5" stroke="#f87171" strokeWidth="1.5" />
                <path d="M7 7l6 6M13 7l-6 6" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-950 mb-1">Something went wrong</h2>
              <p className="text-sm text-gray-400">We couldn&apos;t activate your listing. Please try again.</p>
            </div>
            <Link
              href="/"
              className="w-full py-3 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-all text-center mt-1"
            >
              Back to home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
