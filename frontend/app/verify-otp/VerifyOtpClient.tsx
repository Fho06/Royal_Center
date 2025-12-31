"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VerifyOtpClient() {
  const router = useRouter();

  useEffect(() => {
    // OTP skipped for now
    router.replace("/set-passcode");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-gray-500">
        Verifying phone number…
      </p>
    </div>
  );
}
