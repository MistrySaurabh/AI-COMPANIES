interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export default function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Show</span>
        <select
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="border border-gray-300 rounded px-2 py-1"
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span>entries</span>
        <span className="ml-4">
          Showing {total === 0 ? 0 : start}–{end} of {total}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="px-2 py-1 text-sm rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
        >
          «
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="px-2 py-1 text-sm rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
        >
          ‹
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dot-${i}`} className="px-2 py-1 text-sm text-gray-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`px-3 py-1 text-sm rounded border ${
                p === page
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-gray-300 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages || totalPages === 0}
          className="px-2 py-1 text-sm rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
        >
          ›
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages || totalPages === 0}
          className="px-2 py-1 text-sm rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
        >
          »
        </button>
      </div>
    </div>
  );
}
