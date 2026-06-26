"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, Filter, Download, Eye, Trash2, AlertCircle, Zap, Flame, ChevronDown, Leaf, X, PoundSterling } from "lucide-react";

import { PageLayout }                from "@/components/ui/PageLayout";
import { StatCard }                  from "@/components/ui/StatCard";
import { BillTypeBadge }             from "@/components/ui/BillTypeBadge";
import { Pagination }                from "@/components/ui/Pagination";
import { Button }                    from "@/components/ui/Button";
import { Input }                     from "@/components/ui/Input";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { BILL_TYPE_FILTER_OPTIONS }  from "@/lib/carbon/constants";
import { formatCost, formatCarbonTonnes } from "@/lib/utils/format";
import { ConfirmationModal }          from "@/components/ui/ConfirmationModal";
import { BillViewModal }              from "@/components/ui/BillViewModal";
import { type Bill, type BillsApiResponse } from "@/types";

const PAGE_SIZE = 10;

export default function HistoryPage() {
  const [page,            setPage]           = useState(1);
  const [typeFilter,      setTypeFilter]     = useState("all");
  const [search,          setSearch]         = useState("");
  const [debouncedSearch, setDebouncedSearch]= useState("");
  const [data,            setData]           = useState<BillsApiResponse | null>(null);
  const [loading,         setLoading]        = useState(true);
  const [error,           setError]          = useState<string | null>(null);
  const [deletingId,      setDeletingId]     = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId]= useState<string | null>(null);
  const [viewingBill,     setViewingBill]    = useState<Bill | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchBills = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page:      String(page),
      page_size: String(PAGE_SIZE),
      type:      typeFilter,
      search:    debouncedSearch,
    });
    const res = await fetch(`/api/bills?${params}`);
    if (!res.ok) { setError("Failed to load bills"); setLoading(false); return; }
    setData(await res.json());
    setLoading(false);
  }, [page, typeFilter, debouncedSearch]);

  useEffect(() => { fetchBills(); }, [fetchBills]);
  useEffect(() => { setPage(1); }, [typeFilter, debouncedSearch]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/bills?id=${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) fetchBills();
    else setError("Failed to delete bill");
  }

  async function handleExportCsv() {
    const params = new URLSearchParams({ type: typeFilter, search: debouncedSearch, page_size: "1000" });
    const res    = await fetch(`/api/bills/export?${params}`);
    if (!res.ok) { setError("Export failed"); return; }
    const blob   = await res.blob();
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement("a");
    a.href       = url;
    a.download   = "greentrack-bills.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const bills      = data?.bills ?? [];
  const total      = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;
  const summary    = data?.summary;

  const columns: ColumnDef<Bill>[] = [
    {
      key: "type", header: "Status / Type",
      render: (bill) => <BillTypeBadge type={bill.bill_type} />,
    },
    {
      key: "date", header: "Audit Date",
      render: (bill) => <span className="text-[10px] font-black text-text-secondary">{bill.bill_date}</span>,
    },
    {
      key: "supplier", header: "Supplier",
      render: (bill) => <span className="text-[10px] font-bold text-text-muted">{bill.supplier ?? "—"}</span>,
    },
    {
      key: "usage", header: "Consumption", align: "right",
      render: (bill) => (
        <span className="text-[10px] font-black text-text-primary">
          {bill.usage_amount.toLocaleString("en-GB")} <span className="opacity-40 text-[9px]">{bill.usage_unit}</span>
        </span>
      ),
    },
    {
      key: "co2", header: "Carbon Impact", align: "right",
      render: (bill) => (
        <span className="text-[11px] font-black text-gt-green-700">
          {bill.co2_kg.toFixed(1)} <span className="text-[9px] opacity-40 uppercase">kg</span>
        </span>
      ),
    },
    {
      key: "cost", header: "Cost", align: "right",
      render: (bill) => <span className="text-[10px] font-black text-text-primary">{formatCost(bill.cost_gbp)}</span>,
    },
    {
      key: "actions", header: "Actions", align: "right",
      render: (bill) => (
        <div className="flex items-center justify-end gap-2 transition-opacity">
          {bill.pdf_url && (
            <button
              type="button"
              onClick={() => setViewingBill(bill)}
              className="w-7 h-7 rounded-lg shadow-sm flex items-center justify-center hover:bg-gt-green-500 hover:text-white transition-all hover:scale-110"
              style={{ background: "var(--bg-elevated)", color: "var(--text-primary)" }}
              title="View Record"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
          <Button
            variant="danger"
            size="sm"
            icon={deletingId === bill.id ? <Leaf className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            disabled={deletingId === bill.id}
            onClick={() => setConfirmDeleteId(bill.id)}
            title="Archive Record"
            className="w-7 h-7 p-0 rounded-lg min-h-0"
            style={{ background: "var(--bg-elevated)", color: "var(--text-primary)" }}
          >
            {""}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      icon={<Eye className="w-5 h-5" />}
      title="Bill History"
      subtitle={loading ? "Refreshing records…" : `Archiving ${total} verified utility records`}
      error={error}
      className="!pb-0"
      headerRight={
        <div id="tour-history-export" className="flex items-center gap-2">
          <button type="button" onClick={handleExportCsv} className="neu-raised hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:scale-95" style={{ color: "var(--brand-green-dark)" }}>
            <Download className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Export CSV</span>
          </button>
          <div className="neu-raised hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl" style={{ color: "var(--brand-green-dark)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-gt-green-500 animate-pulse-green inline-block" />
            <span className="text-xs font-bold uppercase tracking-widest">Live Sync</span>
          </div>
        </div>
      }
    >
      <div id="tour-history-stats" className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <StatCard label="Total Records"    value={total}                                          unit="Bills"  icon={<Eye className="w-4 h-4" />}           accent="green"  />
        <StatCard label="Carbon Footprint" value={formatCarbonTonnes(summary?.total_co2_kg ?? 0)} unit="tCO₂e" icon={<AlertCircle className="w-4 h-4" />}   accent="green" />
        <StatCard label="Aggregate Cost"   value={formatCost(summary?.total_cost_gbp)}            unit="GBP"   icon={<PoundSterling className="w-4 h-4" />}   accent="green"  />
      </div>

      {/* Filter Backdrop */}

      <DataTable<Bill>
        fullHeight
        toolbarLeft={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4 w-full">
            <div id="tour-history-search" className="flex-1">
              <Input
                icon={<Search className="w-4 h-4" />}
                placeholder="Search verified records by supplier or date..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="!py-0 !h-10 !rounded-xl !shadow-none !bg-transparent !border !border-black/20 focus:!border-black/40"
              />
            </div>
            <div id="tour-history-filters" className="flex items-center gap-1 p-1 h-10 rounded-xl overflow-x-auto shrink-0"
              style={{ background: "var(--neu-base)", boxShadow: "var(--shadow-inset-xs)", border: "var(--card-border)", scrollbarWidth: "none" } as React.CSSProperties}>
              {BILL_TYPE_FILTER_OPTIONS.map(({ key, label }) => (
                <button key={key} type="button" onClick={() => setTypeFilter(key)}
                  className="px-3 lg:px-4 h-full rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
                  style={typeFilter === key ? { background: "var(--bg-surface)", color: "var(--brand-orange)", boxShadow: "var(--shadow-raised)" } : { color: "var(--text-muted)" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        }
        columns={columns}
        data={bills}
        rowKey={(b) => b.id}
        loading={loading}
        loadingLabel="Syncing Data..."
        emptyIcon={<Search className="w-10 h-10" />}
        emptyTitle="No Records Found"
        emptyMessage="Your archive is empty. Try adjusting your filters or upload your first utility bill to start tracking."
        emptyCtaLabel="Upload First Bill"
        emptyCtaHref="/upload"
        mobileRender={(bill) => (
          <div className="p-4 space-y-4">
            {/* Header info */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                  {bill.bill_type === "electricity"
                    ? <Zap className="w-5 h-5 text-gt-green-500" />
                    : <Flame className="w-5 h-5 text-brand-orange" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <BillTypeBadge type={bill.bill_type} />
                  </div>
                  <p className="text-[10px] font-bold text-text-muted">{bill.bill_date}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {bill.pdf_url && (
                  <button
                    type="button"
                    onClick={() => setViewingBill(bill)}
                    className="w-9 h-9 rounded-xl bg-bg-elevated shadow-sm flex items-center justify-center text-text-primary hover:bg-gt-green-500 hover:text-white transition-all"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  disabled={deletingId === bill.id}
                  onClick={() => setConfirmDeleteId(bill.id)}
                  className="w-9 h-9 rounded-xl bg-bg-elevated shadow-sm flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all"
                >
                  {deletingId === bill.id ? (
                    <Leaf className="w-4 h-4 animate-spin text-gt-green-500" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Core Data */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-subtle/30">
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-text-muted/50">Supplier & Usage</p>
                <p className="text-[11px] font-bold text-text-primary leading-none truncate">{bill.supplier ?? "Unknown"}</p>
                <p className="text-[11px] font-black text-text-muted">
                  {bill.usage_amount.toLocaleString("en-GB")} <span className="text-[9px] opacity-40">{bill.usage_unit}</span>
                </p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-text-muted/50">Impact & Cost</p>
                <p className="text-sm font-black text-gt-green-700 leading-none">
                  {bill.co2_kg.toFixed(1)} <span className="text-[9px] opacity-40 uppercase">kgCO₂e</span>
                </p>
                <p className="text-[11px] font-bold text-text-primary">{formatCost(bill.cost_gbp)}</p>
              </div>
            </div>
          </div>
        )}
        tableId="history_bills"
        page={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      <ConfirmationModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        title="Delete this record?"
        message="This action cannot be undone. This record will be permanently removed from your organisation's carbon audit trail."
        confirmLabel="Delete Now"
        cancelLabel="Cancel"
        variant="danger"
      />

      <BillViewModal
        isOpen={!!viewingBill}
        onClose={() => setViewingBill(null)}
        pdfUrl={viewingBill?.pdf_url ? `/api/bills/view?path=${encodeURIComponent(viewingBill.pdf_url)}` : null}
        billDate={viewingBill?.bill_date}
        supplier={viewingBill?.supplier ?? undefined}
      />
    </PageLayout>
  );
}
