"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

export default function Header() {
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Fermer les menus si on clique en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fermer le menu mobile quand on clique sur un lien
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const userName = session?.user?.name || session?.user?.email || "Utilisateur";
  const displayName = session?.user?.name || session?.user?.email?.split("@")[0] || "Utilisateur";

  return (
    <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur sticky top-0 z-50">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-lg sm:text-xl font-semibold tracking-tight">
            Secret Santa
          </span>
          <span className="hidden sm:inline rounded-full bg-pink-500/20 px-2 text-xs text-pink-300">
            multi-tirages
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4 text-sm">
          {session?.user ? (
            <>
              <Link href="/draw-sessions" className="hover:text-pink-300">
                Accueil
              </Link>
              {session.user && (session.user as any).isAdmin && (
                <Link href="/admin" className="hover:text-pink-300">
                  Admin
                </Link>
              )}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 hover:text-pink-300"
                >
                  <span className="max-w-[150px] truncate">{displayName}</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md border border-slate-700 bg-slate-900 shadow-lg">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-slate-200 hover:bg-slate-800 hover:text-pink-300"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Profil
                    </Link>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        signOut({ callbackUrl: "/login" });
                      }}
                      className="block w-full px-4 py-2 text-left text-slate-200 hover:bg-slate-800 hover:text-pink-300"
                    >
                      Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-pink-300">
                Se connecter
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-pink-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-pink-400"
              >
                S&apos;inscrire
              </Link>
            </>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <div className="md:hidden relative" ref={mobileMenuRef}>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-pink-300"
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-md border border-slate-700 bg-slate-900 shadow-lg">
              {session?.user ? (
                <>
                  <Link
                    href="/draw-sessions"
                    className="block px-4 py-3 text-slate-200 hover:bg-slate-800 hover:text-pink-300 border-b border-slate-800"
                    onClick={closeMobileMenu}
                  >
                    Accueil
                  </Link>
                  {session.user && (session.user as any).isAdmin && (
                    <Link
                      href="/admin"
                      className="block px-4 py-3 text-slate-200 hover:bg-slate-800 hover:text-pink-300 border-b border-slate-800"
                      onClick={closeMobileMenu}
                    >
                      Admin
                    </Link>
                  )}
                  <div className="px-4 py-3 border-b border-slate-800">
                    <p className="text-xs text-slate-400 mb-2">Connecté en tant que</p>
                    <p className="text-sm font-medium text-slate-200 truncate">{userName}</p>
                  </div>
                  <Link
                    href="/profile"
                    className="block px-4 py-3 text-slate-200 hover:bg-slate-800 hover:text-pink-300"
                    onClick={closeMobileMenu}
                  >
                    Profil
                  </Link>
                  <button
                    onClick={() => {
                      closeMobileMenu();
                      signOut({ callbackUrl: "/login" });
                    }}
                    className="block w-full px-4 py-3 text-left text-slate-200 hover:bg-slate-800 hover:text-pink-300"
                  >
                    Se déconnecter
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block px-4 py-3 text-slate-200 hover:bg-slate-800 hover:text-pink-300 border-b border-slate-800"
                    onClick={closeMobileMenu}
                  >
                    Se connecter
                  </Link>
                  <Link
                    href="/register"
                    className="block px-4 py-3 text-slate-200 hover:bg-slate-800 hover:text-pink-300"
                    onClick={closeMobileMenu}
                  >
                    S&apos;inscrire
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

