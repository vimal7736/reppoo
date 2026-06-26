interface PaginationProps {
  page:       number;
  totalPages: number;
  total:      number;
  pageSize:   number;
  onPrev:     () => void;
  onNext:     () => void;
  onPage:     (p: number) => void;
}

function buildPageItems(page: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (page >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const items: Array<number | "ellipsis"> = [];
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const previous = sorted[i - 1];
    if (previous && current - previous > 1) {
      items.push("ellipsis");
    }
    items.push(current);
  }

  return items;
}

export function Pagination({ page, totalPages, total, pageSize, onPrev, onNext, onPage }: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);
  const pageItems = buildPageItems(page, totalPages);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-8 py-4 sm:py-6 bg-bg-inset/10 border-t border-border-subtle/50">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
        Displaying{" "}
        <span className="text-text-primary">{start}–{end}</span> of{" "}
        <span className="text-text-primary">{total}</span> records
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page === 1}
          onClick={onPrev}
          className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl text-text-muted hover:bg-white hover:text-text-primary disabled:opacity-30 transition-all"
        >
          Prev
        </button>

        <div className="flex items-center gap-1 bg-bg-inset/30 p-1 rounded-xl">
          {pageItems.map((item, index) => {
            if (item === "ellipsis") {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="w-9 h-9 flex items-center justify-center text-[10px] font-black text-text-muted"
                >
                  ...
                </span>
              );
            }

            const active = page === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => onPage(item)}
                className={`w-9 h-9 text-[10px] rounded-lg font-black transition-all ${
                  active ? "bg-white text-gt-green-600 shadow-sm" : "text-text-muted hover:text-text-primary"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={page === totalPages}
          onClick={onNext}
          className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl text-text-muted hover:bg-white hover:text-text-primary disabled:opacity-30 transition-all"
        >
          Next
        </button>
      </div>
    </div>
  );
}
