"use client";

import Image from "next/image";

export function ContactFAB({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Contacto"
      className="
        fixed bottom-5 right-5
        w-10 h-10
        rounded-full
        bg-[var(--navbar-accent-soft)]
        elevation-md
        z-50
        flex items-center justify-center
      "
    >
      <Image
        src="/support.png"
        alt="Soporte"
        width={20}
        height={20}
        priority
      />
    </button>
  );
}
