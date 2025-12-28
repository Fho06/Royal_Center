import { Category } from "../types";

type Props = {
  search: string;
  setSearch: (v: string) => void;
  inStockOnly: boolean;
  setInStockOnly: (v: boolean) => void;
  categories: Category[];
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  selectedSubcategory: string;
  setSelectedSubcategory: (v: string) => void;
};

export function Filters(props: Props) {
  const main = props.categories.filter(c => c.level === 1);
  const subs =
    props.selectedCategory === "all"
      ? []
      : props.categories.filter(
          c => c.level === 2 && c.parent_id === Number(props.selectedCategory)
        );

  return (
    <>
      <input
        value={props.search}
        onChange={e => props.setSearch(e.target.value)}
        placeholder="Search products…"
        className="w-full rounded border px-4 py-2"
      />

      <div className="flex gap-3">
        <select
          value={props.selectedCategory}
          onChange={e => {
            props.setSelectedCategory(e.target.value);
            props.setSelectedSubcategory("all");
            props.setSearch("");
          }}
          className="rounded border px-3 py-2"
        >
          <option value="all">All categories</option>
          {main.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {subs.length > 0 && (
          <select
            value={props.selectedSubcategory}
            onChange={e => {
              props.setSelectedSubcategory(e.target.value);
              props.setSearch("");
            }}
            className="rounded border px-3 py-2"
          >
            <option value="all">All subcategories</option>
            {subs.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={props.inStockOnly}
          onChange={e => props.setInStockOnly(e.target.checked)}
        />
        In stock only
      </label>
    </>
  );
}
