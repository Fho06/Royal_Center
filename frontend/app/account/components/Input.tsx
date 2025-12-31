"use client";

type InputProps = {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
};

export function Input({
  label,
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
}: InputProps) {
  return (
    <div>
      <div className="text-sm font-semibold mb-1">
        {label}
      </div>
      <input
        value={String(value)}   // ✅ always string
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded px-3 py-2 border ${
          error
            ? "border-red-500 placeholder-red-400"
            : "border-gray-300"
        } ${disabled ? "bg-gray-100 text-gray-500" : ""}`}
      />
    </div>
  );
}
