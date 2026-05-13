import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  X, Clock, CheckCircle, XCircle, Search,
  RefreshCw, Package, Eye, AlertTriangle, Zap
} from "lucide-react";
import { COLORS } from "../../utils/colors";
import { acceptVendorOrder, getVendorOrders, rejectVendorOrder } from "../../services/vendor.service";
import type { VendorOrder } from "../../types/vendor";
import LoadingState from "../../components/ui/LoadingState";
import VendorMetricCard from "../../components/ui/VendorMetricCard";

const STATUS_MAP: Record<string, string> = {
  assigned_vendor: "pending",
  vendor_accepted: "accepted",
  in_production: "production",
  qc_pending: "qc",
  ready_for_pickup: "ready",
  out_for_delivery: "delivery",
  delivered: "delivered",
  cancelled: "cancelled",
};

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  pending:   { color: COLORS.warning,  bg: COLORS.warningBg,  border: COLORS.warningBorder },
  accepted:  { color: COLORS.info,     bg: COLORS.infoBg,     border: COLORS.infoBorder },
  production:{ color: "#8b5cf6",       bg: "#f5f3ff",         border: "#ddd6fe" },
  qc:        { color: "#f59e0b",       bg: "#fffbeb",         border: "#fde68a" },
  ready:     { color: COLORS.success,  bg: COLORS.successBg,  border: COLORS.successBorder },
  delivery:  { color: COLORS.primary,  bg: `${COLORS.primary}18`, border: `${COLORS.primary}40` },
  delivered: { color: COLORS.success,  bg: COLORS.successBg,  border: COLORS.successBorder },
  cancelled: { color: COLORS.error,    bg: COLORS.errorBg,    border: COLORS.errorBorder },
};

export default function JobQueuePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [rejectingOrder, setRejectingOrder] = useState<VendorOrder | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    const urlSearch = searchParams.get("search");
    if (urlSearch) setSearchTerm(urlSearch);
  }, [searchParams]);

  // API 1: GET /api/vendor/orders/assigned
  const loadOrders = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getVendorOrders();
      setOrders(res.data.orders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadOrders(); }, []);

  // Auto-refresh every 30s — picks up status changes (delivered, cancelled, etc.)
  useEffect(() => {
    const interval = window.setInterval(() => { void loadOrders(); }, 30000);
    return () => window.clearInterval(interval);
  }, []);

  const stats = useMemo(() => ({
    pending:    orders.filter(o => o.status === "assigned_vendor").length,
    accepted:   orders.filter(o => o.status === "vendor_accepted").length,
    production: orders.filter(o => ["in_production", "qc_pending"].includes(o.status)).length,
    ready:      orders.filter(o => ["ready_for_pickup", "out_for_delivery"].includes(o.status)).length,
    delivered:  orders.filter(o => o.status === "delivered").length,
    total:      orders.length,
  }), [orders]);

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (filter !== "all") {
      list = list.filter(o => STATUS_MAP[o.status] === filter);
    }
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      list = list.filter(o =>
        (o.orderNumber || o._id).toLowerCase().includes(s) ||
        o.items?.some(i => i.productName?.toLowerCase().includes(s))
      );
    }
    // Sort by creation date - newest first
    return list.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [orders, filter, searchTerm]);

  // API 3: POST /api/vendor/orders/:id/accept
  const handleAccept = async (order: VendorOrder) => {
    try {
      setSubmitting(order._id);
      const res = await acceptVendorOrder(order._id);
      setOrders(cur => cur.map(o => o._id === order._id ? res.data : o));
      navigate(`/orders/${order._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept order");
    } finally {
      setSubmitting(null);
    }
  };

  // API 4: POST /api/vendor/orders/:id/reject
  const handleReject = async () => {
    if (!rejectingOrder || !rejectReason.trim()) return;
    try {
      setSubmitting(rejectingOrder._id);
      const res = await rejectVendorOrder(rejectingOrder._id, rejectReason.trim());
      setOrders(cur => cur.map(o => o._id === rejectingOrder._id ? res.data : o));
      setRejectingOrder(null);
      setRejectReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject order");
    } finally {
      setSubmitting(null);
    }
  };

  const FILTERS = ["all", "pending", "accepted", "production", "qc", "ready", "delivery", "delivered"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">Job Queue</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage incoming orders</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void loadOrders()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <span className="text-sm text-gray-500 font-semibold">{filteredOrders.length} orders</span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border px-4 py-3 text-sm flex items-center gap-2"
          style={{ backgroundColor: COLORS.errorBg, borderColor: COLORS.errorBorder, color: COLORS.error }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <VendorMetricCard index={0} label="Pending" value={String(stats.pending)} accent={COLORS.warning} accentBg={COLORS.warningBg} icon={Clock} />
        <VendorMetricCard index={1} label="Accepted" value={String(stats.accepted)} accent={COLORS.info} accentBg={COLORS.infoBg} icon={CheckCircle} />
        <VendorMetricCard index={2} label="In Production" value={String(stats.production)} accent="#8b5cf6" accentBg="#f5f3ff" icon={Zap} />
        <VendorMetricCard index={3} label="Ready / Out" value={String(stats.ready)} accent={COLORS.success} accentBg={COLORS.successBg} icon={Package} />
        <VendorMetricCard index={4} label="Delivered" value={String(stats.delivered)} accent={COLORS.primary} accentBg={`${COLORS.primary}18`} icon={CheckCircle} />
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by order ID or item..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
        </div>
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition"
              style={filter === f ? { backgroundColor: COLORS.primary, color: "#fff" } : { color: "#6b7280" }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {loading ? <LoadingState message="Loading job queue" /> : (
        <div className="card-list space-y-3 pr-1">
          {filteredOrders.map(order => {
            const normalizedStatus = STATUS_MAP[order.status] || "pending";
            const sc = STATUS_STYLE[normalizedStatus] || STATUS_STYLE.pending;
            const primaryItem = order.items?.[0];
            const isPending = order.status === "assigned_vendor";
            const isProcessing = submitting === order._id;

            return (
              <div key={order._id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-gray-900 font-mono">
                        {order.orderNumber || `#${order._id.slice(-8).toUpperCase()}`}
                      </p>
                      {isPending && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold animate-pulse"
                          style={{ backgroundColor: COLORS.warningBg, color: COLORS.warning }}>
                          Action Required
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {primaryItem?.productName || "Order item"} • Qty {primaryItem?.quantity || 0}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="rounded-full border px-2.5 py-1 text-xs font-bold uppercase"
                      style={{ backgroundColor: sc.bg, color: sc.color, borderColor: sc.border }}>
                      {normalizedStatus}
                    </span>
                    <p className="text-sm font-black text-gray-900">₹{order.total || 0}</p>
                  </div>
                </div>

                {/* Timeline preview */}
                {order.timeline && order.timeline.length > 0 && (
                  <div className="mb-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-xs text-gray-400 font-semibold">
                      Last update: {order.timeline[order.timeline.length - 1]?.status?.replace(/_/g, " ")}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/orders/${order._id}`)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:border-gray-900 transition">
                    <Eye size={14} /> View
                  </button>

                  {isPending && (
                    <>
                      <button onClick={() => setRejectingOrder(order)} disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition disabled:opacity-50"
                        style={{ backgroundColor: COLORS.errorBg, color: COLORS.error }}>
                        <XCircle size={14} /> Reject
                      </button>
                      <button onClick={() => void handleAccept(order)} disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-white transition disabled:opacity-50"
                        style={{ backgroundColor: COLORS.success }}>
                        <CheckCircle size={14} />
                        {isProcessing ? "Processing..." : "Accept Order"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {!filteredOrders.length && !loading && (
            <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
              <Package size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-semibold">
                {orders.length === 0 ? "No orders assigned yet." : "No orders match your filter."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal — API 4 */}
      {rejectingOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl my-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Reject Order</h3>
              <button onClick={() => { setRejectingOrder(null); setRejectReason(""); }}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="p-3 rounded-xl border mb-4"
              style={{ backgroundColor: COLORS.errorBg, borderColor: COLORS.errorBorder }}>
              <p className="text-xs font-bold" style={{ color: COLORS.error }}>
                Order: {rejectingOrder.orderNumber || `#${rejectingOrder._id.slice(-8).toUpperCase()}`}
              </p>
            </div>
            <div className="mb-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Select Reason *</label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {["Capacity full","Machine unavailable","Material shortage","Staff unavailable","Outside service area","Other"].map(r => (
                  <button key={r} type="button" onClick={() => setRejectReason(r)}
                    className="px-3 py-2 rounded-xl border text-xs font-semibold text-left transition"
                    style={{
                      backgroundColor: rejectReason === r ? `${COLORS.error}12` : "white",
                      borderColor: rejectReason === r ? COLORS.error : "#e5e7eb",
                      color: rejectReason === r ? COLORS.error : "#6b7280",
                    }}>
                    {r}
                  </button>
                ))}
              </div>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="Or type a custom reason..."
                className="w-full h-20 rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-900 transition resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setRejectingOrder(null); setRejectReason(""); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={() => void handleReject()}
                disabled={!rejectReason.trim() || submitting === rejectingOrder._id}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
                style={{ backgroundColor: COLORS.error }}>
                {submitting === rejectingOrder._id ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
