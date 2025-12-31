import { Suspense } from "react";
import PasscodeClient from "./PasscodeClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <PasscodeClient />
    </Suspense>
  );
}
