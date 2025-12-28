type Props = {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
};

export function Pagination({
  currentPage,
  totalPages,
  onPrev,
  onNext,
}: Props) {
  if (totalPages <= 1) return null;

  const isFirst = currentPage <= 1;
  const isLast = currentPage >= totalPages;

  return (
    <div className="flex justify-center items-center gap-4">
      <button
        disabled={isFirst}
        onClick={onPrev}
        className="px-3 py-2 border rounded disabled:opacity-40"
      >
        Previous
      </button>

      <span className="text-sm">
        Page {currentPage} of {totalPages}
      </span>

      <button
        disabled={isLast}
        onClick={onNext}
        className="px-3 py-2 border rounded disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
