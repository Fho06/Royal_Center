type Props = {
  termsAccepted: boolean;
  setTermsAccepted: (v: boolean) => void;
};

export function TermsCheckbox({
  termsAccepted,
  setTermsAccepted,
}: Props) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={termsAccepted}
        onChange={(e) =>
          setTermsAccepted(e.target.checked)
        }
        required
      />
      Acepto los Términos y Condiciones
    </label>
  );
}
