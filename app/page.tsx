"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The homepage is the browse page. Unauthenticated visitors are sent to
// /login by RouteGuard; authenticated visitors land on /browse.
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/browse");
  }, [router]);

  return null;
}
