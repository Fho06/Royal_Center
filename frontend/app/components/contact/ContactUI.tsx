"use client";

import { useState } from "react";
import { ContactFAB } from "./ContactFAB";
import { ContactModal } from "./ContactModal";

export default function ContactUI() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ContactFAB onClick={() => setOpen(true)} />
      {open && <ContactModal onClose={() => setOpen(false)} />}
    </>
  );
}
