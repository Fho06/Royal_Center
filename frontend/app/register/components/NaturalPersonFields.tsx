import { Gender } from "../hook/useRegisterForm";

type Props = {
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  gender: Gender;
  setGender: (v: Gender) => void;
};

export function NaturalPersonFields({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  gender,
  setGender,
}: Props) {
  return (
    <>
      <input
        type="text"
        placeholder="Nombre"
        className="w-full inside-card p-2"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        required
      />

      <input
        type="text"
        placeholder="Apellido"
        className="w-full inside-card p-2"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        required
      />

      <select
        className="w-full inside-card p-2"
        value={gender}
        onChange={(e) =>
          setGender(e.target.value as Gender)
        }
      >
        <option value="masculino">Masculino</option>
        <option value="femenino">Femenino</option>
      </select>
    </>
  );
}
