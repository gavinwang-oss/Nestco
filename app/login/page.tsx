"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.endsWith(".edu")) {
      setError("A .edu email is required.");
      return;
    }
    setLoading(true);
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: appUrl + "/auth/callback?next=/my-listings",
          shouldCreateUser: false,
        },
      });
      if (otpError) {
        const isRateLimit = otpError.message.toLowerCase().includes("rate") || otpError.status === 429;
        setError(isRateLimit ? "Too many attempts. Please wait a few minutes and try again." : otpError.message);
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6"
      style={{
        backgroundColor: "#f5f4f0",
        backgroundImage: `linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)`,
        backgroundSize: "42px 42px",
      }}
    >
      <div className="w-full max-w-sm bg-white rounded-3xl border border-black/[0.06] shadow-sm p-8">
        {!sent ? (
          <>
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold tracking-tight">N</span>
              </div>
              <span className="text-xl font-semibold tracking-tight text-gray-900">nestco</span>
            </div>

            <h1 className="text-2xl font-bold text-gray-950 mb-1">Sign in</h1>
            <p className="text-sm text-gray-400 mb-6">We&apos;ll send a magic link to your .edu email.</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="your@university.edu"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-black/10"
              />
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-all cursor-pointer disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send magic link"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8L6.5 11.5L13 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-950 mb-1">Check your email</h2>
            <p className="text-sm text-gray-400">We sent a sign-in link to <span className="text-gray-700 font-medium">{email}</span>.</p>
          </div>
        )}
      </div>
    </div>
  );
}
