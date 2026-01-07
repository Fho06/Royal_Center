type Props = {
  rifPrefix: string;
  rifDigits: string;
  setRifDigits: (v: string) => void;
  rifError: string;
};

export function RifInput({
  rifPrefix,
  rifDigits,
  setRifDigits,
  rifError,
}: Props) {
  return (
    <>
      <div className="flex">
        {rifPrefix && (
          <span className="flex items-center rounded-l-md bg-[var(--reg-accent-soft)] px-3 elevation-md">
            {rifPrefix}
          </span>
        )}
        <input
          type="text"
          inputMode="numeric"
          maxLength={8}
          className={`w-full inside-card p-2 ${
            rifPrefix ? "!rounded-l-none" : ""
          }`}
          placeholder="12345678"
          value={rifDigits}
          onChange={(e) =>
            setRifDigits(
              e.target.value.replace(/\D/g, "").slice(0, 8)
            )
          }
          required
        />
      </div>

      {rifError && (
        <p className="text-red-600 text-xs mt-1">
          {rifError}
        </p>
      )}
    </>
  );
}
