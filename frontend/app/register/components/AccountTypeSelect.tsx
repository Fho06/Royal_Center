import { AccountType } from "../hook/useRegisterForm";

type Props = {
  accountType: AccountType;
  setAccountType: (v: AccountType) => void;
  setRifDigits: (v: string) => void;
  setRifError: (v: string) => void;
};

export function AccountTypeSelect({
  accountType,
  setAccountType,
  setRifDigits,
  setRifError,
}: Props) {
  return (
    <select
      className="inside-card w-full rounded p-2"
      value={accountType}
      onChange={(e) => {
        setAccountType(e.target.value as AccountType);
        setRifDigits("");
        setRifError("");
      }}
    >
      <option value="natural">Natural</option>
      <option value="extranjero">Extranjero</option>
      <option value="juridico">Jurídico</option>
      <option value="rif_persona_natural">RIF Persona Natural</option>
      <option value="rif_v">RIF-V</option>
      <option value="rif_e">RIF-E</option>
      <option value="gobierno">Gobierno</option>
      <option value="pasaporte">Pasaporte</option>
    </select>
  );
}
