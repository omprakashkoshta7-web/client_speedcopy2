import { useEffect, useMemo, useState } from "react";
import LoadingState from "../../components/ui/LoadingState";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis, BarChart, Bar, Cell,
} from "recharts";
import { COLORS } from "../../utils/colors";
import {
  getVendorWalletSummary,
  getVendorWalletStoreWise,
  getVendorWalletDeductions,
  getVendorStores,
  getVendorFinanceServiceSummary,
  getVendorOrderClosure,
} from "../../services/vendor.service";
import type {
  VendorWalletSummary,
  VendorStoreWiseEarnings,
  VendorDeduction,
  VendorFinanceSummaryResponse,
  VendorOrderClosure,
} from "../../types/vendor";
import VendorMetricCard from "../../components/ui/VendorMetricCard";
import {
  Clock, DollarSign, TrendingUp, CreditCard,
  RefreshCw, Store, AlertTriangle, Percent, ShoppingBag,
} from "lucide-react";

export default function EarningsPage() {
  // API 1: wallet summary
  const [wallet, setWallet] = useState<VendorWalletSummary | null>(null);
  // API 2: store-wise
  const [storeWise, setStoreWise] = useState<VendorStoreWiseEarnings[]>([]);
  // API 3: deductions
  const [deductions, setDeductions] = useState<VendorDeduction[]>([]);
  // API 7: order closure (daily by default for chart)
  const [orderClosure, setOrderClosure] = useState<VendorOrderClosure | null>(null);
  // API 8: finance summary
  const [financeSummary, setFinanceSummary] = useState<VendorFinanceSummaryResponse | null>(null);
  // store name map
  const [stores, setStores] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [p1, p2, p3, p4, p5, p6] = await Promise.allSettled([
        getVendorWalletSummary(),           // API 1
        getVendorWalletStoreWise(),         // API 2
        getVendorWalletDeductions(),        // API 3
        getVendorStores(),                  // store names
        getVendorFinanceServiceSummary(),   // API 8
        getVendorOrderClosure("weekly"),    // API 7 — weekly chart
      ]);

      if (p1.status === "fulfilled") setWallet(p1.value.data);
      if (p2.status === "fulfilled") setStoreWise(Array.isArray(p2.value.data) ? p2.value.data : []);
      if (p3.status === "fulfilled") setDeductions(p3.value.data?.deductions || []);
      if (p4.status === "fulfilled") setStores(p4.value.data || []);
      if (p5.status === "fulfilled") setFinanceSummary(p5.value.data);
      if (p6.status === "fulfilled") setOrderClosure(p6.value.data);

      const allFailed = [p1, p2, p3].every(r => r.status === "rejected");
      if (allFailed) {
        const err = (p1 as PromiseRejectedResult).reason;
        setError(err instanceof Error ? err.message : "Failed to load earnings");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load earnings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const storeNameMap = useMemo(() =>
    new Map(stores.map(s => [s._id, s.name])), [stores]);

  // API 2: store-wise chart data
  const storeChartData = useMemo(() =>
    storeWise.map(s => ({
      name: storeNameMap.get(s._id) || (s._id === "unassigned" ? "Unassigned" : `Store ${s._id?.slice(-5)}`),
      earnings: s.earnings || 0,
      orders: s.orderCount || 0,
    })), [storeWise, storeNameMap]);

  const totalEarnings = storeWise.reduce((sum, s) => sum + (s.earnings || 0), 0);
  const totalOrders   = storeWise.reduce((sum, s) => sum + (s.orderCount || 0), 0);
  const totalDeducted = deductions.reduce((sum, d) => sum + (d.amount || 0), 0);

  if (loading) return <LoadingState message="Loading earnings" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">Earnings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Revenue, wallet balance and store performance</p>
        </div>
        <button onClick={() => void loadData()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {error && (
        <div className="rounded-xl border px-4 py-3 text-sm flex items-center gap-2"
          style={{ backgroundColor: COLORS.errorBg, borderColor: COLORS.errorBorder, color: COLORS.error }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* ── API 1: Wallet Summary Cards ── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <VendorMetricCard index={0} label="Total Balance"
          value={`₹${(wallet?.balance || 0).toLocaleString()}`}
          accent={COLORS.primary} accentBg={`${COLORS.primary}18`}
          note="Sum of all delivered orders" icon={DollarSign} />
        <VendorMetricCard index={1} label="Pending Settlement"
          value={`₹${(wallet?.pendingSettlement || 0).toLocaleString()}`}
          accent={COLORS.warning} accentBg={COLORS.warningBg}
          note="20% hold" icon={Clock} />
        <VendorMetricCard index={2} label="Available"
          value={`₹${(wallet?.availableForWithdrawal || 0).toLocaleString()}`}
          accent={COLORS.success} accentBg={COLORS.successBg}
          note="80% ready to withdraw" icon={TrendingUp} />
        <VendorMetricCard index={3} label="Total Orders"
          value={String(totalOrders)}
          accent={COLORS.info} accentBg={COLORS.infoBg}
          note="Delivered across all stores" icon={Store} />
      </div>

      {/* ── API 1: Wallet Balance Detail ── */}
      {wallet && (
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Total Balance", val: wallet.balance, note: "SUM(vendorPayout) all delivered", color: COLORS.primary },
            { label: "Pending Settlement", val: wallet.pendingSettlement, note: "balance × 20% hold", color: COLORS.warning },
            { label: "Available for Withdrawal", val: wallet.availableForWithdrawal, note: "balance × 80%", color: COLORS.success },
          ].map(item => (
            <div key={item.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: item.color }}>{item.label}</p>
              <p className="text-2xl font-black text-gray-900">₹{item.val.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">{item.note}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── API 8: Finance Summary ── */}
      {financeSummary && (
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Pending Payout", val: `₹${financeSummary.pendingPayout.toLocaleString()}`, color: COLORS.warning, icon: Clock },
            { label: "Total Paid Out", val: `₹${financeSummary.totalPaid.toLocaleString()}`, color: COLORS.success, icon: DollarSign },
            { label: "Total Payouts", val: String(financeSummary.totalPayouts), color: COLORS.info, icon: ShoppingBag },
            { label: "Platform Fee", val: `${financeSummary.platformFeePercent}%`, color: COLORS.error, icon: Percent },
          ].map((item, i) => (
            <VendorMetricCard key={item.label} index={i} label={item.label}
              value={item.val} accent={item.color} accentBg={`${item.color}18`}
              note="Finance service" icon={item.icon} />
          ))}
        </div>
      )}

      {/* ── API 7: Weekly Earnings Chart (order-service) ── */}
      {orderClosure && orderClosure.chartData.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Weekly Earnings Trend</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {orderClosure.summary.totalJobs} total jobs · {orderClosure.summary.completedJobs} completed · ₹{orderClosure.summary.totalEarnings.toLocaleString()} gross
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Avg Order</p>
              <p className="text-sm font-black text-gray-900">₹{orderClosure.summary.avgOrderValue.toLocaleString()}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={orderClosure.chartData}>
              <defs>
                <linearGradient id="weeklyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={v => `₹${v}`} />
              <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, "Earnings"]} />
              <Area type="monotone" dataKey="earnings" stroke={COLORS.primary} fill="url(#weeklyGrad)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── API 2: Store-wise Chart + Table ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Bar chart */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-1">Store-wise Earnings</h3>
          <p className="text-xs text-gray-500 mb-4">SUM(vendorPayout) per store — delivered orders</p>
          {storeChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={storeChartData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, "Earnings"]} />
                <Bar dataKey="earnings" radius={[6, 6, 0, 0]}>
                  {storeChartData.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? COLORS.primary : COLORS.info} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex flex-col items-center justify-center text-center gap-2">
              <p className="text-sm font-semibold text-gray-500">No delivered orders yet</p>
              <p className="text-xs text-gray-400">Earnings appear once orders are delivered</p>
            </div>
          )}
        </div>

        {/* Store breakdown table */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-4">Store Breakdown</h3>
          <div className="space-y-3">
            {storeWise.length > 0 ? (
              <>
                {storeWise.map(s => {
                  const pct = totalEarnings > 0 ? Math.round((s.earnings / totalEarnings) * 100) : 0;
                  return (
                    <div key={s._id} className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {storeNameMap.get(s._id) || (s._id === "unassigned" ? "Unassigned" : `Store ${s._id?.slice(-6)}`)}
                        </p>
                        <p className="text-sm font-black text-gray-900 flex-shrink-0">₹{(s.earnings || 0).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                        <span>{s.orderCount || 0} orders</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS.primary }} />
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-300 bg-gray-100">
                  <p className="text-sm font-bold text-gray-700">Total</p>
                  <p className="text-sm font-black text-gray-900">₹{totalEarnings.toLocaleString()}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">No delivered orders yet — earnings appear once orders are delivered</p>
            )}
          </div>
        </div>
      </div>

      {/* ── API 3: Deductions + API 7: Recent Jobs ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Deductions */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-4">Platform Deductions</h3>
          {deductions.length > 0 ? (
            <div className="space-y-3">
              {deductions.map((d, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-900 capitalize">
                        {d.type?.replace(/_/g, " ") || "Platform Fee"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{d.orderCount} delivered orders</p>
                    </div>
                    <p className="text-lg font-black" style={{ color: COLORS.error }}>
                      -₹{(d.amount || 0).toLocaleString()}
                    </p>
                  </div>
                  {/* Net vs Gross */}
                  {wallet && (
                    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <p className="text-gray-400">Gross</p>
                        <p className="font-bold text-gray-700">₹{(wallet.balance + totalDeducted).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Fee</p>
                        <p className="font-bold" style={{ color: COLORS.error }}>₹{totalDeducted.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Net</p>
                        <p className="font-bold" style={{ color: COLORS.success }}>₹{wallet.balance.toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CreditCard size={32} className="text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No deductions recorded</p>
              <p className="text-xs text-gray-400 mt-1">Platform fees will appear here</p>
            </div>
          )}
        </div>

        {/* API 7: Recent Jobs */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-4">Recent Completed Jobs</h3>
          {orderClosure?.jobs && orderClosure.jobs.length > 0 ? (
            <div className="space-y-2">
              {orderClosure.jobs.map(job => (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="min-w-0">
                    <p className="text-xs font-bold font-mono text-gray-900 truncate">{job.id}</p>
                    <p className="text-xs text-gray-500 truncate">{job.type || "—"} · {storeNameMap.get(job.storeId) || job.storeId?.slice(-6) || "—"}</p>
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
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ShoppingBag size={32} className="text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No recent jobs</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
