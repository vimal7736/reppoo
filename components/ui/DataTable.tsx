import { useState, useRef, useEffect, type ReactNode, useMemo } from "react";
import { Spinner }    from "./Spinner";
import { EmptyState } from "./EmptyState";
import { ChevronUp, ChevronDown, ChevronsUpDown, SlidersHorizontal, Check, ChevronLeft, ChevronRight } from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  SortingState,
  VisibilityState,
  ColumnSizingState
} from "@tanstack/react-table";

export interface ColumnDef<T> {
  key:       string;
  header:    string;
  align?:    "left" | "right" | "center";
  render:    (row: T) => ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  tableId?:       string; // For persisting preferences
  columns:        ColumnDef<T>[];
  data:           T[];
  rowKey:         (row: T) => string;
  loading?:       boolean;
  loadingLabel?:  string;
  emptyIcon?:     ReactNode;
  emptyTitle?:    string;
  emptyMessage?:  string;
  emptyCtaLabel?: string;
  emptyCtaHref?:  string;
  footer?:        ReactNode;
  mobileRender?:  (row: T) => ReactNode;
  toolbarLeft?:   ReactNode;
  fullHeight?:    boolean;

  /* ── Pagination ── */
  page?: number;
  totalPages?: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;

  /* ── External Sorting ── */
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;

  /* ── External Visibility ── */
  visibleColumns?: string[];
  onColumnVisibilityChange?: (visibleKeys: string[]) => void;

  /* ── Row Click ── */
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  tableId,
  columns,
  data,
  rowKey,
  loading       = false,
  loadingLabel  = "Loading...",
  emptyIcon,
  emptyTitle    = "No Records Found",
  emptyMessage  = "No data available.",
  emptyCtaLabel,
  emptyCtaHref,
  footer,
  mobileRender,
  toolbarLeft,
  fullHeight,
  
  page,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  
  sortKey,
  sortDir,
  onSort,

  visibleColumns: externalVisibleColumns,
  onColumnVisibilityChange: externalOnColumnVisibilityChange,
  onRowClick,
}: DataTableProps<T>) {
  
  // -- PERSISTENCE LOGIC --
  const loadPref = <V,>(key: string, fallback: V): V => {
    if (typeof window !== "undefined" && tableId) {
      try {
        const saved = localStorage.getItem(`gt_table_${tableId}_${key}`);
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return fallback;
  };

  const savePref = (key: string, value: any) => {
    if (typeof window !== "undefined" && tableId) {
      localStorage.setItem(`gt_table_${tableId}_${key}`, JSON.stringify(value));
    }
  };

  // State
  const [sorting, setSorting] = useState<SortingState>(() => loadPref("sorting", []));
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => loadPref("visibility", {}));
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(() => loadPref("sizing", {}));
  
  // React-Table Pagination State (for client-side)
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: pageSize,
  });

  useEffect(() => { savePref("sorting", sorting); }, [sorting, tableId]);
  useEffect(() => { savePref("visibility", columnVisibility); }, [columnVisibility, tableId]);
  useEffect(() => { savePref("sizing", columnSizing); }, [columnSizing, tableId]);

  // -- COLUMNS MAP --
  const mappedColumns = useMemo(() => {
    return columns.map(c => ({
      id: c.key,
      accessorKey: c.key,
      header: c.header,
      cell: (info: any) => c.render(info.row.original),
      enableSorting: c.sortable ?? false,
      meta: { align: c.align },
    }));
  }, [columns]);

  const isServerPagination = page !== undefined && onPageChange !== undefined;
  const isServerSorting = onSort !== undefined;

  const table = useReactTable({
    data,
    columns: mappedColumns,
    getRowId: (row: any) => rowKey(row),
    state: {
      sorting: isServerSorting 
        ? (sortKey ? [{ id: sortKey, desc: sortDir === "desc" }] : []) 
        : sorting,
      columnVisibility: externalVisibleColumns 
        ? Object.fromEntries(columns.map(c => [c.key, externalVisibleColumns.includes(c.key)]))
        : columnVisibility,
      columnSizing,
      pagination: isServerPagination 
        ? { pageIndex: (page || 1) - 1, pageSize } 
        : pagination,
    },
    onSortingChange: (updater) => {
      if (isServerSorting) {
        if (typeof updater === "function") {
          const newSorting = updater(sortKey ? [{ id: sortKey, desc: sortDir === "desc" }] : []);
          if (newSorting.length > 0) onSort(newSorting[0].id);
        }
      } else {
        setSorting(updater);
      }
    },
    onColumnVisibilityChange: (updater) => {
      if (externalOnColumnVisibilityChange && externalVisibleColumns) {
        if (typeof updater === "function") {
          const newState = updater(Object.fromEntries(columns.map(c => [c.key, externalVisibleColumns.includes(c.key)])));
          externalOnColumnVisibilityChange(Object.keys(newState).filter(k => newState[k]));
        }
      } else {
        setColumnVisibility(updater);
      }
    },
    onColumnSizingChange: setColumnSizing,
    onPaginationChange: (updater) => {
      if (isServerPagination) {
        if (typeof updater === "function") {
          const newState = updater({ pageIndex: (page || 1) - 1, pageSize });
          onPageChange(newState.pageIndex + 1);
        }
      } else {
        setPagination(updater);
      }
    },
    columnResizeMode: "onChange",
    manualPagination: isServerPagination,
    pageCount: isServerPagination ? totalPages : undefined,
    manualSorting: isServerSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const alignClass = { left: "text-left", right: "text-right", center: "text-center" };
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setColumnMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const emptyBlock = (
    <EmptyState
      icon={emptyIcon ?? null}
      title={emptyTitle}
      description={emptyMessage}
      ctaLabel={emptyCtaLabel}
      ctaHref={emptyCtaHref}
    />
  );

  // Pagination Variables
  const currentTotalPages = isServerPagination ? (totalPages ?? 1) : table.getPageCount();
  const currentPage = isServerPagination ? (page || 1) : table.getState().pagination.pageIndex + 1;
  const currentTotal = isServerPagination ? (totalItems ?? 0) : table.getPrePaginationRowModel().rows.length;
  const currentStart = currentTotal === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const currentEnd = Math.min(currentPage * pageSize, currentTotal);

  return (
    <div className={`space-y-4 ${fullHeight ? "h-full flex flex-col" : ""}`}>
      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {toolbarLeft && (
          <div className="flex-1 w-full sm:w-auto flex items-center">
            {toolbarLeft}
          </div>
        )}
        <div className="flex justify-end relative w-full sm:w-auto sm:ml-auto" ref={menuRef}>
          <button
            onClick={() => setColumnMenuOpen(!columnMenuOpen)}
          className="flex items-center gap-2 px-4 h-10 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:bg-bg-inset active:scale-95"
          style={{ color: "var(--text-secondary)", border: "var(--card-border)", background: "var(--bg-surface)" }}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Columns
        </button>
        
        {columnMenuOpen && (
          <div className="absolute top-full right-0 mt-2 w-48 rounded-xl z-50 overflow-hidden shadow-2xl animate-scale-in"
            style={{ background: "var(--bg-surface)", border: "var(--card-border)" }}>
            <div className="p-2 border-b border-border-subtle bg-bg-inset/30">
              <span className="text-[9px] font-black uppercase tracking-widest text-text-muted px-2">Toggle Columns</span>
            </div>
            <div className="p-1 max-h-64 overflow-y-auto">
              {table.getAllLeafColumns().map(col => {
                return (
                  <button
                    key={col.id}
                    onClick={col.getToggleVisibilityHandler()}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors hover:bg-bg-inset text-left"
                    style={{ color: col.getIsVisible() ? "var(--text-primary)" : "var(--text-muted)" }}
                  >
                    {col.columnDef.header as string}
                    {col.getIsVisible() && <Check className="w-3.5 h-3.5 text-brand-green" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      </div>

      {/* ── Table Container ── */}
      <div className={`premium-card overflow-visible ${fullHeight ? "flex-1 flex flex-col min-h-0" : ""}`}>

        {/* ── Mobile card list ── */}
        {mobileRender && (
          <div className="lg:hidden divide-y divide-border-subtle/30">
            {loading && (
              <div className="py-20 text-center">
                <Spinner label={loadingLabel} />
              </div>
            )}
            {!loading && table.getRowModel().rows.length === 0 && emptyBlock}
            {!loading && table.getRowModel().rows.map((row) => (
              <div key={row.id}>{mobileRender(row.original)}</div>
            ))}
          </div>
        )}

        {/* ── Desktop table ── */}
        <div className={`overflow-x-auto ${mobileRender ? "hidden lg:block" : ""} flex-1`}>
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className="bg-bg-inset/20 border-b border-border-subtle">
                  {headerGroup.headers.map(header => {
                    const meta = header.column.columnDef.meta as any;
                    const align = (meta?.align ?? "left") as keyof typeof alignClass;
                    const isCustomSize = header.column.getSize() !== 150;
                    return (
                      <th
                        key={header.id}
                        style={isCustomSize ? { width: header.column.getSize() } : {}}
                        className={`relative px-6 first:px-8 last:px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-colors group ${alignClass[align]} ${header.column.getCanSort() ? "cursor-pointer hover:text-brand-green select-none" : "text-text-secondary"}`}
                      >
                        <div 
                          className={`flex items-center gap-1.5 ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"}`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className={`flex flex-col opacity-${header.column.getIsSorted() ? "100" : "0 group-hover:opacity-40"} transition-opacity`}>
                              {header.column.getIsSorted() === "asc" ? <ChevronUp className="w-3 h-3 text-brand-orange" /> :
                               header.column.getIsSorted() === "desc" ? <ChevronDown className="w-3 h-3 text-brand-orange" /> :
                               <ChevronsUpDown className="w-3 h-3" />}
                            </span>
                          )}
                        </div>
                        {/* Resizer */}
                        {header.column.getCanResize() && (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none hover:bg-brand-orange/50 active:bg-brand-orange ${
                              header.column.getIsResizing() ? "bg-brand-orange" : ""
                            }`}
                          />
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border-subtle/50">
              {loading && (
                <tr>
                  <td colSpan={table.getAllLeafColumns().length} className="py-20 text-center">
                    <Spinner label={loadingLabel} />
                  </td>
                </tr>
              )}

              {!loading && table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={table.getAllLeafColumns().length}>{emptyBlock}</td>
                </tr>
              )}

              {!loading && table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={`group hover:bg-gt-green-50/30 transition-all duration-300 ${onRowClick ? "cursor-pointer" : ""}`}
                >
                  {row.getVisibleCells().map(cell => {
                    const meta = cell.column.columnDef.meta as any;
                    const align = (meta?.align ?? "left") as keyof typeof alignClass;
                    return (
                      <td
                        key={cell.id}
                        className={`px-6 first:px-8 last:px-8 py-3.5 text-sm font-medium ${alignClass[align]}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Footer ── */}
        {footer && (
          <div className="px-6 py-4 border-t border-border-subtle bg-bg-inset/10">
            {footer}
          </div>
        )}

        {/* ── Integrated Pagination ── */}
        {currentTotal > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-8 py-4 sm:py-6 bg-bg-inset/10 border-t border-border-subtle/50">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
              Displaying{" "}
              <span className="text-text-primary">{currentStart}–{currentEnd}</span> of{" "}
              <span className="text-text-primary">{currentTotal}</span> records
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => isServerPagination && onPageChange ? onPageChange(currentPage - 1) : table.previousPage()}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl text-text-muted hover:bg-white hover:text-text-primary disabled:opacity-30 transition-all"
              >
                Prev
              </button>

              <div className="flex items-center gap-1 bg-bg-inset/30 p-1 rounded-xl">
                {Array.from({ length: Math.min(currentTotalPages, 5) }, (_, i) => {
                  let p = i + 1;
                  // Center the visible pages around the current page if many pages
                  if (currentTotalPages > 5) {
                    if (currentPage > 3 && currentPage < currentTotalPages - 1) {
                      p = currentPage - 2 + i;
                    } else if (currentPage >= currentTotalPages - 1) {
                      p = currentTotalPages - 4 + i;
                    }
                  }

                  const active = currentPage === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => isServerPagination && onPageChange ? onPageChange(p) : table.setPageIndex(p - 1)}
                      className={`w-9 h-9 text-[10px] rounded-lg font-black transition-all ${
                        active ? "bg-white text-gt-green-600 shadow-sm" : "text-text-muted hover:text-text-primary"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={currentPage === currentTotalPages}
                onClick={() => isServerPagination && onPageChange ? onPageChange(currentPage + 1) : table.nextPage()}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl text-text-muted hover:bg-white hover:text-text-primary disabled:opacity-30 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
