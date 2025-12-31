export type Profile = {
  phone: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  gender: string | null;
  dob_day: number | null;
  dob_month: string | null;
  dob_year: number | null;
};

export type Address = {
  address_id: number;
  label: string | null;
  address_1: string;
  address_2: string | null;
  country: string;
  state: string;
  city: string;
  municipio: string;
  is_default: boolean;
};
