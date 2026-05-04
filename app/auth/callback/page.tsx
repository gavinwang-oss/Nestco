"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = searchParams.get("next") ?? "/browse";
    const code = searchParams.get("code");

    // Handle PKCE code exchange flow
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) router.replace(next);
      });
      return;
    }

    // For magic link (hash) flow: Supabase processes the hash on client init and
    // fires SIGNED_IN immediately — often before useEffect registers the listener.
    // So we listen AND check getSession() in parallel to avoid getting stuck.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.replace(next);
      }
    });

    // Fallback: session may already exist if the SIGNED_IN event fired before
    // the listener above was registered.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(next);
    });

    return () => subscription.unsubscribe();
  }, [router, searchParams]);

  return null;
}

export default function AuthCallback() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundImage: `url('/sb1.png')`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 bg-black rounded-md flex items-center justify-center">
          <span className="text-white text-xs font-bold">N</span>
        </div>
        <p className="text-sm text-gray-500">Verifying your email...</p>
      </div>
      <Suspense>
        <AuthCallbackInner />
      </Suspense>
    </div>
  );
}
