import { useEffect, useState } from "react";
import {
  Download, RefreshCw, AlertTriangle, Briefcase,
  DollarSign, TrendingUp, ShoppingCart, Store, ShoppingBag,
} from "lucide-react";
import LoadingState from "../../components/ui/LoadingState";
import { COLORS } from "../../utils/colors";
import {
  getVendorClosureDaily,
  getVendorClosureWeekly,
  getVendorClosureMonthly,
  getVendorOrderClosure,
  getVendorStores,
} from "../../services/vendor.service";
import type { VendorClosure, VendorOrderClosure } from "../../types/vendor";
import VendorMetricCard from "../../components/ui/VendorMetricCard";
import {
  AreaChart, Area, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

type Period = "daily" | "weekly" | "monthly";

export default function ClosurePage() {
  const [period, setPeriod] = useState<Period>("daily");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  // APIs 4/5/6: vendor-service closure
  const [closure, setClosure] = useState<VendorClosure | null>(null);
  // API 7: order-service closure
  const [orderClosure, setOrderClosure] = useState<VendorOrderClosure | null>(null);
  // store names
  const [storeMap, setStoreMap] = useState<Map<string, string>>(new Map());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadClosure = async () => {
    try {
      setLoading(true);
      setError("");

      const [p1, p2, p3] = await Promise.allSettled([
        // API 4/5/6 — vendor-service closure
        period === "weekly"
          ? getVendorClosureWeekly(selectedDate)
          : period === "monthly"
          ? getVendorClosureMonthly(selectedDate)
          : getVendorClosureDaily(selectedDate),
        // API 7 — order-service closure (richer data)
        getVendorOrderClosure(period, selectedDate),
        // store names
        getVendorStores(),
      ]);

      if (p1.status === "fulfilled") setClosure(p1.value.data);
      else setError(p1.reason instanceof Error ? p1.reason.message : "Failed to load closure");

      if (p2.status === "fulfilled") setOrderClosure(p2.value.data);

      if (p3.status === "fulfilled") {
        setStoreMap(new Map((p3.value.data || []).map((s: any) => [s._id, s.name])));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadClosure(); }, [period, selectedDate]);

  // API 4/5/6 derived
  const avgOrderValue = closure && closure.count > 0
    ? Math.round(closure.earnings / closure.count)
    : 0;

  const exportReport = () => {
    if (!closure) return;
    const rows = [
      ["Period", "From", "To", "Net Earnings", "Orders", "Gross Sales", "Discount", "Avg Order Value"].join(","),
      [
        closure.period,
        closure.from ? new Date(closure.from).toLocaleDateString() : "",
        closure.to   ? new Date(closure.to).toLocaleDateString()   : "",
        closure.earnings,
        closure.count,
        closure.grossSales ?? "",
        closure.discount ?? "",
        avgOrderValue,
      ].join(","),
    ];
    if (orderClosure) {
      rows.push("");
      rows.push(["Order Service Summary", "", "", "", "", "", "", ""].join(","));
      rows.push(["Total Jobs", "Completed", "Delivered", "Total Earnings", "Avg Order Value", "", "", ""].join(","));
      rows.push([
        orderClosure.summary.totalJobs,
        orderClosure.summary.completedJobs,
        orderClosure.summary.deliveredJobs,
        orderClosure.summary.totalEarnings,
        orderClosure.summary.avgOrderValue,
        "", "", "",
      ].join(","));
    }
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `closure-${period}-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">Closure Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Daily, weekly, and monthly earning closures</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold bg-white focus:outline-none focus:border-gray-900 transition" />
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
            {(["daily", "weekly", "monthly"] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className="rounded-lg px-4 py-2 text-sm font-semibold capitalize transition"
                style={period === p ? { backgroundColor: COLORS.primary, color: "#fff" } : { color: "#6b7280" }}>
                {p}
              </button>
            ))}
          </div>
          <button onClick={() => void loadClosure()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <button onClick={exportReport}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-900 transition">
          <Download size={15} /> Export
        </button>
      </div>

      {error && (
        <div className="rounded-xl border px-4 py-3 text-sm flex items-center gap-2"
          style={{ backgroundColor: COLORS.errorBg, borderColor: COLORS.errorBorder, color: COLORS.error }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {loading ? <LoadingState message="Loading closure data" /> : (
        <>
          {/* ── APIs 4/5/6: Vendor-service Closure Metrics ── */}
          {closure && (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <VendorMetricCard index={0} label="Total Orders"
                  value={String(closure.count)}
                  accent={COLORS.warning} accentBg={COLORS.warningBg}
                  note={`${period} period`} icon={Briefcase} />
                <VendorMetricCard index={1} label="Net Earnings"
                  value={`₹${closure.earnings.toLocaleString()}`}
                  accent={COLORS.success} accentBg={COLORS.successBg}
                  note="SUM(vendorPayout)" icon={DollarSign} />
                <VendorMetricCard index={2} label="Gross Sales"
                  value={`₹${(closure.grossSales ?? 0).toLocaleString()}`}
                  accent={COLORS.info} accentBg={COLORS.infoBg}
                  note="SUM(order.total)" icon={ShoppingCart} />
                <VendorMetricCard index={3} label="Avg Order Value"
                  value={`₹${avgOrderValue.toLocaleString()}`}
                  accent={COLORS.primary} accentBg={`${COLORS.primary}18`}
                  note="Per order" icon={TrendingUp} />
              </div>

              {/* Closure Summary Card */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  {period.charAt(0).toUpperCase() + period.slice(1)} Closure Summary
                </h3>
                {closure.from && closure.to && (
                  <p className="text-xs text-gray-400 mb-4">
                    {new Date(closure.from).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {" — "}
                    {new Date(closure.to).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-center">
                    <p className="text-xs text-gray-500 mb-1">Orders Closed</p>
                    <p className="text-2xl font-black text-gray-900">{closure.count}</p>
                  </div>
                  <div className="p-4 rounded-xl text-center"
                    style={{ backgroundColor: COLORS.successBg, border: `1px solid ${COLORS.successBorder}` }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: COLORS.success }}>Net Earnings</p>
                    <p className="text-2xl font-black" style={{ color: COLORS.success }}>₹{closure.earnings.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-center">
                    <p className="text-xs text-gray-500 mb-1">Gross Sales</p>
                    <p className="text-2xl font-black text-gray-900">₹{(closure.grossSales ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-center">
                    <p className="text-xs text-gray-500 mb-1">Discount</p>
                    <p className="text-2xl font-black text-gray-900">₹{(closure.discount ?? 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── API 7: Order-service Closure (richer data) ── */}
          {orderClosure && (
            <>
              {/* Order-service Summary */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h3 className="text-base font-bold text-gray-900 mb-4">Order Analytics</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
                  {[
                    { label: "Total Jobs", val: orderClosure.summary.totalJobs, color: COLORS.primary },
                    { label: "Completed", val: orderClosure.summary.completedJobs, color: COLORS.success },
                    { label: "Delivered", val: orderClosure.summary.deliveredJobs, color: COLORS.info },
                    { label: "Gross Revenue", val: `₹${orderClosure.summary.totalEarnings.toLocaleString()}`, color: COLORS.warning },
                    { label: "Avg Order", val: `₹${orderClosure.summary.avgOrderValue.toLocaleString()}`, color: COLORS.accent },
                  ].map(item => (
                    <div key={item.label} className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-center">
                      <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                      <p className="text-lg font-black" style={{ color: item.color }}>{item.val}</p>
                    </div>
                  ))}
                </div>

                {/* Earnings Chart */}
                {orderClosure.chartData.length > 0 && (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={orderClosure.chartData}>
                      <defs>
                        <linearGradient id="closureAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={v => `₹${v}`} />
                      <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, "Earnings"]} />
                      <Area type="monotone" dataKey="earnings" stroke={COLORS.primary} fill="url(#closureAreaGrad)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Store Breakdown + Recent Jobs */}
              <div className="grid gap-5 lg:grid-cols-2">
                {/* Store Breakdown */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Store size={15} className="text-gray-400" />
                    <h3 className="text-base font-bold text-gray-900">Store Breakdown</h3>
                  </div>
                  {orderClosure.storeBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {orderClosure.storeBreakdown.map(s => (
                        <div key={s.storeId} className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-sm font-bold text-gray-900 truncate">
                              {storeMap.get(s.storeId) || (s.storeId === "unassigned" ? "Unassigned" : `Store ${s.storeId.slice(-6)}`)}
                            </p>
                            <p className="text-sm font-black text-gray-900 flex-shrink-0">₹{s.earnings.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                            <span>{s.jobs} jobs</span>
                            <span>{s.percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: `${s.percentage}%`, backgroundColor: COLORS.primary }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-6">No store data</p>
                  )}
                </div>

                {/* Recent Jobs */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <ShoppingBag size={15} className="text-gray-400" />
                    <h3 className="text-base font-bold text-gray-900">Recent Jobs</h3>
                  </div>
                  {orderClosure.jobs.length > 0 ? (
                    <div className="space-y-2">
                      {orderClosure.jobs.map(job => (
                        <div key={job.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                          <div className="min-w-0">
                            <p className="text-xs font-bold font-mono text-gray-900 truncate">{job.id}</p>
                            <p className="text-xs text-gray-500 truncate">
                              {job.type || "—"} · {storeMap.get(job.storeId) || job.storeId?.slice(-6) || "—"}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-3">
                            <p className="text-sm font-black text-gray-900">₹{job.amount.toLocaleString()}</p>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: job.status === "delivered" ? COLORS.successBg : COLORS.infoBg,
                                color: job.status === "delivered" ? COLORS.success : COLORS.info,
                              }}>
                              {job.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-6">No jobs in this period</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Empty state */}
          {!closure && !orderClosure && (
            <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
              <TrendingUp size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-semibold">No closure data for selected period</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
