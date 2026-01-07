type Props = {
  phone: string;
  setPhone: (v: string) => void;
  phoneError: string;
};

export function PhoneInput({
  phone,
  setPhone,
  phoneError,
}: Props) {
  return (
    <div>
      <div className="flex">
        <span className="flex items-center rounded-l-md bg-[var(--reg-accent-soft)] px-3 elevation-md">
          +58
        </span>
        <input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          className="w-full inside-card !rounded-r-md !rounded-l-none p-2"
          placeholder="4121234567"
          value={phone}
          onChange={(e) =>
            setPhone(
              e.target.value.replace(/\D/g, "").slice(0, 10)
            )
          }
          required
        />
      </div>

      {phoneError && (
        <p className="text-red-600 text-xs mt-1">
          {phoneError}
        </p>
      )}
    </div>
  );
}
