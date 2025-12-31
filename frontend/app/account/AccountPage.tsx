"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { Profile, Address } from "./types";
import { ProfileSection } from "./components/ProfileSection";
import { AddressesSection } from "./components/AddressesSection";

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      const [p, a] = await Promise.all([
        apiRequest("/profile"),
        apiRequest("/addresses"),
      ]);
      setProfile(p.profile);
      setAddresses(a.addresses);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="p-6">Cargando cuenta…</div>;
  if (!profile) return null;

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">
      <ProfileSection
        profile={profile}
        setProfile={setProfile}
      />

      <AddressesSection
        addresses={addresses}
        reload={load}
      />

      {error && <p className="text-red-600">{error}</p>}
    </main>
  );
}
