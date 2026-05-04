"use client";

import { useState } from "react";

const DEV_EMAILS = [
  "developer@nestco.edu",
  "gavin_wang@berkeley.edu",
];

// This page is intentionally local-only. In production the API returns 404.
export default function DevLoginPage() {
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  const [loading, setLoading] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function getLink(email: string) {
    setLoading(email);
    setLink(null);
    setError(null);
    try {
      const res = await fetch("/api/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setLink(data.link);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundImage: `url('/sb1.png')`, backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="bg-white rounded-2xl shadow-sm border border-black/[0.06] p-8 w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-7 h-7 bg-black rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-bold">N</span>
          </div>
          <span className="text-base font-semibold text-gray-900">Dev login</span>
        </div>

        <p className="text-sm text-gray-500 mb-5">
          Generate a magic link for a test account. Admin-only.
        </p>

        <div className="flex flex-col gap-2">
          {DEV_EMAILS.map((email) => (
            <button
              key={email}
              onClick={() => getLink(email)}
              disabled={loading === email}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-black/[0.05] hover:bg-black/[0.09] text-gray-800 transition-colors disabled:opacity-50 text-left"
            >
              {loading === email ? "Generating…" : email}
            </button>
          ))}
        </div>

        {link && (
          <a
            href={link}
            className="mt-5 block w-full text-center px-4 py-3 rounded-xl text-sm font-semibold bg-black text-white hover:bg-gray-800 transition-colors"
          >
            Log in now →
          </a>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
}
