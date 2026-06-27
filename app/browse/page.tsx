"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// /browse is now an alias for the homepage. Redirect to / while preserving any
// query string (e.g. ?listing=123) so old links, bookmarks, and emails work.
function BrowseRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(qs ? `/?${qs}` : "/");
  }, [router, searchParams]);

  return null;
}

export default function BrowsePage() {
  return (
    <Suspense fallback={null}>
      <BrowseRedirect />
    </Suspense>
  );
}
