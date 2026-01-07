type Props = {
  registering: boolean;
};

export function SubmitButton({ registering }: Props) {
  return (
    <button
      type="submit"
      disabled={registering}
      className="w-full rounded-lg bg-[var(--reg-accent)] elevation-md p-2 text-white font-bold"
    >
      Continuar
    </button>
  );
}
