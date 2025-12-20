export type Item = {
  id: string;
  name: string;
  price: number;
  stock: number;
  unit: string;
  active: boolean;
  category_id: number;
  parent_id: number | null;
  category_name: string;
};
