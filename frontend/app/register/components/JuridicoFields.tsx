type Props = {
  companyName: string;
  setCompanyName: (v: string) => void;
};

export function JuridicoFields({
  companyName,
  setCompanyName,
}: Props) {
  return (
    <input
      type="text"
      placeholder="Nombre de la empresa"
      className="w-full inside-card p-2"
      value={companyName}
      onChange={(e) =>
        setCompanyName(e.target.value)
      }
      required
    />
  );
}
