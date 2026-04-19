"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal, { AuthTab } from "@/components/AuthModal";
import { isAdminEmail } from "@/lib/admin";

export default function Navbar() {
  const { user, loading, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>("login");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = isAdminEmail(user?.email);
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
        onClick={() => setMobileMenuOpen(false)}
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

  // Mobile icon-only nav link
  const mobileNavLink = (href: string, icon: React.ReactNode, label: string) => {
    const active = pathname === href || (href !== "/browse" && pathname.startsWith(href));
    return (
      <Link
        href={href}
        title={label}
        className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all min-w-[44px] min-h-[44px] justify-center ${
          active
            ? "text-gray-900"
            : "text-gray-400"
        }`}
      >
        {icon}
        <span className="text-[9px] font-medium">{label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Desktop navbar */}
      <nav className="hidden sm:flex h-13 border-b border-black/[0.06] bg-white/80 backdrop-blur-md items-center px-5 justify-between flex-shrink-0 sticky top-0 z-40">
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
                {isAdmin && navLink("/browse", "Browse")}
                {isAdmin && navLink("/requests", "Requests")}
                {navLink("/my-listings", "My listings")}
                {isAdmin && navLink("/saved", "Saved")}
                {isAdmin && navLink("/inbox", "Inbox")}

                {/* Divider */}
                <div className="w-px h-4 bg-black/[0.08] mx-2" />

                {/* Avatar → Profile (admin only) */}
                {isAdmin && (
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
                )}

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
                <a
                  href="mailto:support@nestco.ai"
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-700 rounded-lg hover:bg-black/[0.04] transition-all"
                >
                  Support
                </a>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Mobile top bar */}
      <nav className="sm:hidden h-13 border-b border-black/[0.06] bg-white/90 backdrop-blur-md flex items-center px-4 justify-between flex-shrink-0 sticky top-0 z-40">
        <Link href="/browse" className="flex items-center gap-2 cursor-pointer">
          <div className="w-7 h-7 bg-black rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-bold">N</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-gray-900">nestco</span>
        </Link>

        {!loading && (
          <div className="flex items-center gap-1">
            {user ? (
              <>
                {isAdmin && (
                  <Link
                    href="/profile"
                    title="Profile"
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                      pathname === "/profile"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {initials}
                  </Link>
                )}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/[0.04] transition-colors cursor-pointer"
                  aria-label="Menu"
                >
                  {mobileMenuOpen ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 2l12 12M14 2L2 14" stroke="#374151" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4h12M2 8h12M2 12h12" stroke="#374151" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  )}
                </button>
              </>
            ) : (
              <a
                href="mailto:support@nestco.ai"
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-700 rounded-lg hover:bg-black/[0.04] transition-all"
              >
                Support
              </a>
            )}
          </div>
        )}
      </nav>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && user && (
        <div className="sm:hidden fixed top-[52px] left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-black/[0.06] shadow-lg">
          <div className="px-4 py-3 flex flex-col gap-1">
            {isAdmin && (
              <>
                <Link href="/browse" onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${pathname === "/browse" ? "bg-black/[0.06] text-gray-900" : "text-gray-600 hover:bg-black/[0.04]"}`}>
                  Browse
                </Link>
                <Link href="/requests" onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${pathname === "/requests" ? "bg-black/[0.06] text-gray-900" : "text-gray-600 hover:bg-black/[0.04]"}`}>
                  Requests
                </Link>
                <Link href="/saved" onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${pathname === "/saved" ? "bg-black/[0.06] text-gray-900" : "text-gray-600 hover:bg-black/[0.04]"}`}>
                  Saved
                </Link>
                <Link href="/inbox" onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${pathname === "/inbox" ? "bg-black/[0.06] text-gray-900" : "text-gray-600 hover:bg-black/[0.04]"}`}>
                  Inbox
                </Link>
                <Link href="/profile" onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${pathname === "/profile" ? "bg-black/[0.06] text-gray-900" : "text-gray-600 hover:bg-black/[0.04]"}`}>
                  Profile
                </Link>
              </>
            )}
            <Link href="/my-listings" onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${pathname === "/my-listings" ? "bg-black/[0.06] text-gray-900" : "text-gray-600 hover:bg-black/[0.04]"}`}>
              My listings
            </Link>
            <div className="border-t border-black/[0.06] my-1" />
            <button
              onClick={() => { signOut(); setMobileMenuOpen(false); }}
              className="px-3 py-2.5 text-left rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        defaultTab={authTab}
      />
    </>
  );
}
