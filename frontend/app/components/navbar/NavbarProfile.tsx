"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";

export function NavbarProfile() {
  const { logout } = useAuth();

  const [open, setOpen] = useState(false);
  const timer = useRef<NodeJS.Timeout | null>(null);

  function openProfile() {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  }

  function closeProfile() {
    timer.current = setTimeout(() => setOpen(false), 150);
  }

  return (
    <div
      className="relative"
      onMouseEnter={openProfile}
      onMouseLeave={closeProfile}
    >
      {/* TRIGGER */}
      <button className="hover:underline">
        Perfil
      </button>

      {/* DROPDOWN */}
      {open && (
        <div className="navbar-dropdown absolute right-0 mt-2 w-48 bg-white rounded-xl elevation-xl">
          <Link
            href="/account"
            className="block px-4 py-2 hover:bg-black/5"
          >
            Cuenta de Perfil
          </Link>

          <Link
            href="/orders"
            className="block px-4 py-2 hover:bg-black/5"
          >
            Ordenes
          </Link>

          <button
            onClick={logout}
            className="w-full text-left px-4 py-2 hover:bg-black/5"
          >
            Salir de Sesión
          </button>
        </div>
      )}
    </div>
  );
}
