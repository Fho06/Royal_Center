export async function checkPhoneUnique(phone: string) {
  const res = await fetch(`/api/auth/check-phone?phone=${phone}`);
  if (!res.ok) return false;
  const data = await res.json();
  return !data.exists;
}

export async function checkRifUnique(rif: string) {
  const res = await fetch(`/api/auth/check-rif?rif=${rif}`);
  if (!res.ok) return false;
  const data = await res.json();
  if (data.invalid) return false;
  return !data.exists;
}

export async function registerStart(payload: any) {
  const res = await fetch("/api/auth/register-start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      phone: `+58${payload.phone}`,
    }),
  });

  if (!res.ok) throw new Error("register failed");
}

export async function sendOtp(phone: string) {
  await fetch("/api/auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: `+58${phone}` }),
  });
}
