export type Item = {
  id: string;
  name: string;
  price_usd: number;
  available_stock: number;
  category_id: number;
};

export type Category = {
  id: number;
  name: string;
  level: number;
  parent_id: number | null;
};
