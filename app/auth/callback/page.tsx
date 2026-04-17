"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = searchParams.get("next") ?? "/browse";

    // Check if already signed in (e.g. hash token already processed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push(next);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.push(next);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, searchParams]);

  return null;
}

export default function AuthCallback() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#f5f4f0" }}
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
