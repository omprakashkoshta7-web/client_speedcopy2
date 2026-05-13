import { useEffect, useMemo, useState } from "react";
import {
  Download, FileText, RefreshCw, AlertTriangle,
  Clock, DollarSign, TrendingUp, Calendar, CheckCircle,
  XCircle, Percent,
} from "lucide-react";
import LoadingState from "../../components/ui/LoadingState";
import { COLORS } from "../../utils/colors";
import {
  getVendorPayoutsSchedule,
  getVendorPayoutHistory,
  getVendorWalletSummary,
} from "../../services/vendor.service";
import type {
  VendorPayoutRecord,
  VendorPayoutSchedule,
  VendorWalletSummary,
} from "../../types/vendor";
import VendorMetricCard from "../../components/ui/VendorMetricCard";

// spec: status values — pending | processing | transferred | failed
const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  transferred: { color: COLORS.success, bg: COLORS.successBg, border: COLORS.successBorder },
  paid:        { color: COLORS.success, bg: COLORS.successBg, border: COLORS.successBorder }, // alias
  processing:  { color: COLORS.info,    bg: COLORS.infoBg,    border: COLORS.infoBorder },
  pending:     { color: COLORS.warning, bg: COLORS.warningBg, border: COLORS.warningBorder },
  scheduled:   { color: COLORS.info,    bg: COLORS.infoBg,    border: COLORS.infoBorder },
  failed:      { color: COLORS.error,   bg: COLORS.errorBg,   border: COLORS.errorBorder },
};

type FilterStatus = "all" | "pending" | "processing" | "transferred" | "failed";

export default function PayoutsPage() {
  // API 3: Wallet Summary — /vendor/finance/wallet/summary
  const [wallet, setWallet] = useState<VendorWalletSummary | null>(null);
  // API 1: Payout Schedule — /vendor/finance/payouts/schedule
  const [schedule, setSchedule] = useState<VendorPayoutSchedule | null>(null);
  // API 2: Payout History — /vendor/finance/payouts/history (last 50)
  const [payouts, setPayouts] = useState<VendorPayoutRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [p1, p2, p3] = await Promise.allSettled([
        getVendorPayoutsSchedule(),   // API 1
        getVendorPayoutHistory(),     // API 2
        getVendorWalletSummary(),     // API 3
      ]);

      if (p1.status === "fulfilled") setSchedule(p1.value.data);
      if (p2.status === "fulfilled") setPayouts(p2.value.data?.payouts || []);
      if (p3.status === "fulfilled") setWallet(p3.value.data);

      const allFailed = [p1, p2, p3].every(r => r.status === "rejected");
      if (allFailed) {
        const err = (p1 as PromiseRejectedResult).reason;
        setError(err instanceof Error ? err.message : "Failed to load payouts");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const filteredPayouts = useMemo(() =>
    filter === "all" ? payouts : payouts.filter(p => p.status === filter),
    [filter, payouts]
  );

  // Stats from payouts list
  const stats = useMemo(() => ({
    totalTransferred: payouts
      .filter(p => p.status === "transferred")
      .reduce((s, p) => s + (p.amount ?? 0), 0),
    pending: payouts
      .filter(p => p.status === "pending")
      .reduce((s, p) => s + (p.amount ?? 0), 0),
    totalCount: payouts.length,
  }), [payouts]);

  const exportHistory = () => {
    const header = ["Date", "Gross", "Platform Fee", "Net", "Status", "Period Start", "Period End", "Transferred At", "Notes"].join(",");
    const rows = payouts.map(p => [
      p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "—",
      p.grossAmount ?? "",
      p.platformFee ?? "",
      p.amount ?? "",
      p.status,
      p.periodStart ? new Date(p.periodStart).toLocaleDateString("en-IN") : "—",
      p.periodEnd   ? new Date(p.periodEnd).toLocaleDateString("en-IN")   : "—",
      p.transferredAt ? new Date(p.transferredAt).toLocaleDateString("en-IN") : "—",
      `"${p.notes || ""}"`,
    ].join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payouts-history.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingState message="Loading payouts" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">Payouts</h1>
          <p className="text-sm text-gray-500 mt-0.5">Payout history, schedule and wallet balance</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void loadData()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={exportHistory}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-900 transition">
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border px-4 py-3 text-sm flex items-center gap-2"
          style={{ backgroundColor: COLORS.errorBg, borderColor: COLORS.errorBorder, color: COLORS.error }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* ── Metric Cards ── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <VendorMetricCard index={0} label="Total Transferred"
          value={`₹${stats.totalTransferred.toLocaleString()}`}
          accent={COLORS.success} accentBg={COLORS.successBg}
          note={`${stats.totalCount} total records`} icon={DollarSign} />
        <VendorMetricCard index={1} label="Pending Payout"
          value={`₹${stats.pending.toLocaleString()}`}
          accent={COLORS.warning} accentBg={COLORS.warningBg}
          note="Awaiting processing" icon={Clock} />
        <VendorMetricCard index={2} label="Available Balance"
          value={`₹${(wallet?.availableForWithdrawal || 0).toLocaleString()}`}
          accent={COLORS.info} accentBg={COLORS.infoBg}
          note="80% of total balance" icon={TrendingUp} />
        <VendorMetricCard index={3} label="Platform Fee"
          value="10%"
          accent={COLORS.primary} accentBg={`${COLORS.primary}18`}
          note="Per payout deduction" icon={Percent} />
      </div>

      {/* ── Wallet Balance — API 3 ── */}
      {wallet && (
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Total Balance", val: wallet.balance, color: COLORS.primary, note: "SUM(vendorPayout) — delivered orders" },
            { label: "Pending Settlement", val: wallet.pendingSettlement, color: COLORS.warning, note: "balance × 20% hold" },
            { label: "Available for Withdrawal", val: wallet.availableForWithdrawal, color: COLORS.success, note: "balance × 80%" },
          ].map(item => (
            <div key={item.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: item.color }}>{item.label}</p>
              <p className="text-2xl font-black text-gray-900">₹{item.val.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">{item.note}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Payout Schedule — API 1 ── */}
      {schedule && (
        <div className="rounded-2xl border bg-white p-5 shadow-sm"
          style={{ borderColor: COLORS.infoBorder, backgroundColor: COLORS.infoBg }}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: COLORS.info + "20" }}>
              <Calendar size={18} style={{ color: COLORS.info }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: COLORS.info }}>Next Payout Schedule</p>
              <p className="text-xs mt-0.5" style={{ color: COLORS.info }}>
                {schedule.nextPayoutDate
                  ? `Scheduled for ${new Date(schedule.nextPayoutDate).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`
                  : "No upcoming payout scheduled"}
              </p>
              {schedule.status && (
                <span className="inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full capitalize"
                  style={{ backgroundColor: COLORS.info + "20", color: COLORS.info }}>
                  {schedule.status}
                </span>
              )}
              {schedule.payoutId && (
                <p className="text-xs mt-1 font-mono" style={{ color: COLORS.info }}>
                  ID: {schedule.payoutId}
                </p>
              )}
            </div>
            {schedule.estimatedAmount > 0 && (
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-semibold" style={{ color: COLORS.info }}>Estimated</p>
                <p className="text-2xl font-black" style={{ color: COLORS.info }}>
                  ₹{schedule.estimatedAmount.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Payout History — API 2 ── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-base font-bold text-gray-900">Payout History</h3>
          {/* Status filter */}
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1 flex-wrap">
            {(["all", "pending", "processing", "transferred", "failed"] as FilterStatus[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition"
                style={filter === f ? { backgroundColor: COLORS.primary, color: "#fff" } : { color: "#6b7280" }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {filteredPayouts.length > 0 ? (
          <div className="space-y-3">
            {filteredPayouts.map(payout => {
              const sc = STATUS_STYLE[payout.status] || STATUS_STYLE.pending;
              return (
                <div key={payout.id} className="rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: sc.bg }}>
                        {payout.status === "transferred"
                          ? <CheckCircle size={16} style={{ color: sc.color }} />
                          : payout.status === "failed"
                          ? <XCircle size={16} style={{ color: sc.color }} />
                          : <Clock size={16} style={{ color: sc.color }} />}
                      </div>
                      <div>
                        {/* amount = netAmount — vendor ko milta hai */}
                        <p className="text-base font-black text-gray-900">₹{(payout.amount ?? 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {payout.createdAt
                            ? new Date(payout.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full border px-2.5 py-1 text-xs font-bold uppercase flex-shrink-0"
                      style={{ backgroundColor: sc.bg, color: sc.color, borderColor: sc.border }}>
                      {payout.status}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>Gross: <span className="font-semibold text-gray-700">₹{(payout.grossAmount ?? 0).toLocaleString()}</span></span>
                    <span>Fee: <span className="font-semibold text-gray-700">₹{(payout.platformFee ?? 0).toLocaleString()}</span></span>
                    <span>Net: <span className="font-semibold text-gray-700">₹{(payout.amount ?? 0).toLocaleString()}</span></span>
                    {payout.transferredAt && (
                      <span>Transferred: <span className="font-semibold text-gray-700">
                        {new Date(payout.transferredAt).toLocaleDateString("en-IN")}
                      </span></span>
                    )}
                    {payout.periodStart && payout.periodEnd && (
                      <span>Period: <span className="font-semibold text-gray-700">
                        {new Date(payout.periodStart).toLocaleDateString("en-IN")} — {new Date(payout.periodEnd).toLocaleDateString("en-IN")}
                      </span></span>
                    )}
                  </div>

                  {payout.notes && (
                    <div className="mt-2 px-3 py-2 rounded-lg bg-gray-50 text-xs text-gray-600">
                      {payout.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-gray-100">
              <FileText size={22} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-semibold">No payout records yet</p>
            <p className="text-xs text-gray-400 mt-1">
              {filter !== "all" ? `No ${filter} payouts` : "Payout records will appear here once processed by admin"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
