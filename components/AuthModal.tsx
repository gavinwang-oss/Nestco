"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export type AuthTab = "login" | "signup";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: AuthTab;
};

export default function AuthModal({ isOpen, onClose, defaultTab = "login" }: Props) {
  const [tab, setTab] = useState<AuthTab>(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    setTab(defaultTab);
    setEmail("");
    setPassword("");
    setError("");
    setSuccess(false);
  }, [isOpen, defaultTab]);

  // Auto-close when user verifies email in another tab
  useEffect(() => {
    if (!success) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        onCloseRef.current();
      }
    });
    return () => subscription.unsubscribe();
  }, [success]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.endsWith(".edu")) {
      setError("A .edu email is required.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    if (tab === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("Incorrect email or password.");
      } else {
        onClose();
      }
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl border border-black/[0.06] shadow-xl p-8 w-full max-w-sm mx-4">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors cursor-pointer text-lg leading-none"
        >
          ✕
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-7 h-7 bg-black rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-bold">N</span>
          </div>
          <span className="text-base font-semibold tracking-tight text-gray-900">nestco</span>
        </div>

        {success ? (
          <div className="text-center py-2">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 8L6.5 11.5L13 5"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="text-base font-bold text-gray-950 mb-2">Check your email</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              We sent a confirmation link to{" "}
              <span className="text-gray-700 font-medium">{email}</span>. Click it to activate
              your account.
            </p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-full mb-6">
              {(["login", "signup"] as AuthTab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTab(t);
                    setError("");
                  }}
                  className={`flex-1 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                    tab === t
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t === "login" ? "Log in" : "Sign up"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">
                  {tab === "signup" ? "University email (.edu)" : "Email"}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="you@university.edu"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-black/10"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-black/10"
                />
              </div>

              {error && <p className="text-red-500 text-xs">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-all cursor-pointer disabled:opacity-60 mt-1"
              >
                {loading ? "Please wait..." : tab === "login" ? "Log in" : "Create account"}
              </button>
            </form>

            {tab === "signup" && (
              <p className="text-xs text-gray-400 text-center mt-4">
                .edu email required · UC Berkeley only for now
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
