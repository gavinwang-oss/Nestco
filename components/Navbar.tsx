"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal, { AuthTab } from "@/components/AuthModal";

export default function Navbar() {
  const { user, loading, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>("login");
  const pathname = usePathname();

  const openAuth = (tab: AuthTab) => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  const initials = user?.email?.[0].toUpperCase() ?? "?";

  const navLink = (href: string, label: string) => {
    const active = pathname === href || (href !== "/browse" && pathname.startsWith(href));
    return (
      <Link
        href={href}
        className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
          active
            ? "text-gray-900 bg-black/[0.06] font-medium"
            : "text-gray-500 hover:text-gray-900 hover:bg-black/[0.04]"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      <nav className="h-13 border-b border-black/[0.06] bg-white/80 backdrop-blur-md flex items-center px-5 justify-between flex-shrink-0 sticky top-0 z-40">
        {/* Logo */}
        <Link href="/browse" className="flex items-center gap-2 cursor-pointer flex-shrink-0">
          <div className="w-7 h-7 bg-black rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-bold">N</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-gray-900">nestco</span>
        </Link>

        {!loading && (
          <div className="flex items-center gap-0.5">
            {user ? (
              <>
                {navLink("/browse", "Browse")}
                {navLink("/requests", "Requests")}
                {navLink("/my-listings", "My listings")}
                {navLink("/saved", "Saved")}
                {navLink("/inbox", "Inbox")}

                {/* Divider */}
                <div className="w-px h-4 bg-black/[0.08] mx-2" />

                {/* Avatar → Profile */}
                <Link
                  href="/profile"
                  title="Profile"
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                    pathname === "/profile"
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {initials}
                </Link>

                {/* Sign out */}
                <button
                  onClick={signOut}
                  className="ml-1 px-3 py-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors cursor-pointer rounded-lg hover:bg-black/[0.04]"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                {navLink("/requests", "Requests")}
                <div className="w-px h-4 bg-black/[0.08] mx-2" />
                <button
                  onClick={() => openAuth("login")}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-black/[0.04] rounded-lg transition-all cursor-pointer"
                >
                  Log in
                </button>
                <button
                  onClick={() => openAuth("signup")}
                  className="ml-1 px-4 py-1.5 bg-black text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        )}
      </nav>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        defaultTab={authTab}
      />
    </>
  );
}
