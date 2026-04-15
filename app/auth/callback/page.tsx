"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.push("/browse");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

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
    </div>
  );
}
