import { useEffect, useState } from "react";
import {
  Award, Target, TrendingUp, TrendingDown, RefreshCw,
  AlertTriangle, CheckCircle, XCircle, Info, BarChart2,
  ShoppingBag, Store, Calendar,
} from "lucide-react";
import LoadingState from "../../components/ui/LoadingState";
import {
  CartesianGrid, Line, LineChart,
  PolarAngleAxis, PolarGrid, Radar, RadarChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
  AreaChart, Area,
} from "recharts";
import { COLORS } from "../../utils/colors";
import {
  getVendorPerformanceScore,
  getVendorDetailedScore,
  getVendorRejectionsHistory,
  getVendorOrderClosure,
  getVendorStores,
} from "../../services/vendor.service";
import type {
  VendorPerformanceScore,
  VendorDetailedScore,
  VendorOrderClosure,
} from "../../types/vendor";
import VendorMetricCard from "../../components/ui/VendorMetricCard";

type ClosurePeriod = "daily" | "weekly" | "monthly";

export default function VendorScorePage() {
  // API 1: /vendor/scoring/performance-score
  const [perfScore, setPerfScore] = useState<VendorPerformanceScore | null>(null);
  // API 2: /vendor/orders/score
  const [detailedScore, setDetailedScore] = useState<VendorDetailedScore | null>(null);
  // API 3: /vendor/scoring/rejections/history
  const [rejections, setRejections] = useState<any[]>([]);
  // API 4: /vendor/orders/closure
  const [closure, setClosure] = useState<VendorOrderClosure | null>(null);
  const [closurePeriod, setClosurePeriod] = useState<ClosurePeriod>("daily");
  const [closureDate, setClosureDate] = useState(new Date().toISOString().slice(0, 10));
  const [storeMap, setStoreMap] = useState<Map<string, string>>(new Map());

  const [loading, setLoading] = useState(true);
  const [closureLoading, setClosureLoading] = useState(false);
  const [error, setError] = useState("");

  const loadAll = async () => {
    try {
      setLoading(true);
      setError("");
      const [p1, p2, p3, p4, p5] = await Promise.allSettled([
        getVendorPerformanceScore(),
        getVendorDetailedScore(),
        getVendorRejectionsHistory(),
        getVendorOrderClosure(closurePeriod, closureDate),
        getVendorStores(),
      ]);
      if (p1.status === "fulfilled") setPerfScore(p1.value.data);
      if (p2.status === "fulfilled") setDetailedScore(p2.value.data);
      if (p3.status === "fulfilled") setRejections(Array.isArray(p3.value.data) ? p3.value.data : []);
      if (p4.status === "fulfilled") setClosure(p4.value.data);
      if (p5.status === "fulfilled") {
        setStoreMap(new Map((p5.value.data || []).map((s: any) => [s._id, s.name])));
      }
      const allFailed = [p1, p2, p3].every(r => r.status === "rejected");
      if (allFailed) {
        const err = (p1 as PromiseRejectedResult).reason;
        setError(err instanceof Error ? err.message : "Failed to load score data");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadClosure = async () => {
    try {
      setClosureLoading(true);
      const res = await getVendorOrderClosure(closurePeriod, closureDate);
      setClosure(res.data);
    } catch (err) {
      console.error("Closure load error:", err);
    } finally {
      setClosureLoading(false);
    }
  };

  useEffect(() => { void loadAll(); }, []);
  useEffect(() => { void loadClosure(); }, [closurePeriod, closureDate]);

  if (loading) return <LoadingState message="Loading performance score" />;

  // Prefer detailed score, fallback to perf score
  const overallScore = detailedScore?.overallScore ?? perfScore?.overallScore ?? 0;
  const acceptanceRate = detailedScore?.acceptanceRate ?? perfScore?.acceptanceRate ?? 0;
  const slaCompliance = detailedScore?.slaCompliance ?? 0;
  const completionRate = perfScore?.completionRate ?? 0;
  const routingPriority = detailedScore?.routingPriority ?? (overallScore >= 90 ? "High" : overallScore >= 70 ? "Medium" : "Low");
  const totals = detailedScore?.totals;

  const scoreColor = overallScore >= 90 ? COLORS.success : overallScore >= 70 ? COLORS.warning : COLORS.error;
  const scoreBg = overallScore >= 90 ? COLORS.successBg : overallScore >= 70 ? COLORS.warningBg : COLORS.errorBg;
  const priorityColor = routingPriority === "High" ? COLORS.success : routingPriority === "Medium" ? COLORS.warning : COLORS.error;

  // Radar data — prefer API 2, fallback to computed
  const radarData = detailedScore?.radarData ?? [
    { metric: "Acceptance", score: acceptanceRate, target: 95 },
    { metric: "Completion", score: completionRate, target: 98 },
    { metric: "Overall", score: overallScore, target: 90 },
  ];

  // Trend data — from API 2
  const trendData = detailedScore?.scoreTrend ?? [];

  // Metrics — from API 2, fallback computed
  const metrics = detailedScore?.metrics ?? [
    { label: "Acceptance Rate", value: `${acceptanceRate}%`, target: "95%", num: acceptanceRate, status: acceptanceRate >= 95 ? "good" : "needs_attention", desc: "Percentage of assigned orders accepted" },
    { label: "Completion Rate", value: `${completionRate}%`, target: "98%", num: completionRate, status: completionRate >= 98 ? "good" : "needs_attention", desc: "Percentage of accepted orders completed" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">Vendor Score</h1>
          <p className="text-sm text-gray-500 mt-0.5">Performance metrics and order closure</p>
        </div>
        <button onClick={() => void loadAll()}
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

      {/* ── API 1 + 2: Score Cards ── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <VendorMetricCard index={0} label="Overall Score" value={`${overallScore}/100`} accent={scoreColor} accentBg={scoreBg} note="Weighted performance" icon={Award} />
        <VendorMetricCard index={1} label="Routing Priority" value={routingPriority} accent={priorityColor} accentBg={`${priorityColor}18`} note="Order assignment priority" icon={Target} />
        <VendorMetricCard index={2} label="Acceptance Rate" value={`${acceptanceRate}%`} accent={COLORS.info} accentBg={COLORS.infoBg} note={totals ? `${totals.accepted}/${totals.total} orders` : "Orders accepted"} icon={TrendingUp} />
        <VendorMetricCard index={3} label="SLA Compliance" value={`${slaCompliance || completionRate}%`} accent={COLORS.primary} accentBg={`${COLORS.primary}18`} note="Completed within 24hrs" icon={BarChart2} />
      </div>

      {/* Score Banner */}
      <div className="rounded-2xl border p-5 shadow-sm"
        style={{ backgroundColor: scoreBg, borderColor: scoreColor + "40" }}>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-xl flex-shrink-0"
            style={{ backgroundColor: scoreColor }}>
            {overallScore}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-black" style={{ color: scoreColor }}>
              {overallScore >= 90 ? "Excellent Performance" : overallScore >= 70 ? "Good Performance" : "Needs Improvement"}
            </p>
            <p className="text-sm mt-0.5" style={{ color: scoreColor }}>
              {overallScore >= 90
                ? "Top-rated vendor. Keep maintaining high acceptance and SLA compliance."
                : overallScore >= 70
                ? "Good performance. Focus on SLA compliance to reach top tier."
                : "Score needs improvement. Accept more orders and complete them within 24hrs."}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-semibold mb-1" style={{ color: scoreColor }}>Routing Priority</p>
            <span className="text-sm font-black px-3 py-1.5 rounded-xl text-white"
              style={{ backgroundColor: priorityColor }}>
              {routingPriority}
            </span>
          </div>
        </div>
        {/* Totals row */}
        {totals && (
          <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t" style={{ borderColor: scoreColor + "30" }}>
            {[
              { label: "Total Orders", val: totals.total },
              { label: "Accepted", val: totals.accepted },
              { label: "Rejected", val: totals.rejected },
              { label: "Completed", val: totals.completed },
            ].map(item => (
              <div key={item.label} className="text-center">
                <p className="text-xl font-black" style={{ color: scoreColor }}>{item.val}</p>
                <p className="text-xs mt-0.5" style={{ color: scoreColor }}>{item.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Radar Chart — API 2 radarData */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-1">Performance Radar</h3>
          <p className="text-xs text-gray-500 mb-4">Score vs target benchmarks</p>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#f1f5f9" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <Radar name="Your Score" dataKey="score" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.2} strokeWidth={2.5} />
              <Radar name="Target" dataKey="target" stroke="#d1d5db" fill="transparent" strokeWidth={1.5} strokeDasharray="4 2" />
              <Tooltip formatter={(v: any) => `${v}%`} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 justify-center mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.primary }} />
              <span className="text-xs text-gray-500">Your Score</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-gray-300" />
              <span className="text-xs text-gray-500">Target</span>
            </div>
          </div>
        </div>

        {/* Score Trend — API 2 scoreTrend */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-1">Score Trend</h3>
          <p className="text-xs text-gray-500 mb-4">Last 6 weeks performance</p>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={v => `${v}`} />
                <Tooltip formatter={(v: any) => [`${v}`, "Score"]} />
                <Line type="monotone" dataKey="score" stroke={COLORS.primary} strokeWidth={3} dot={{ fill: COLORS.primary, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              No trend data available
            </div>
          )}
        </div>
      </div>

      {/* ── API 2: Metrics Grid ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {metrics.map((m: any) => {
          const isGood = m.status === "good";
          return (
            <div key={m.label} className="rounded-2xl border-2 bg-white p-5 shadow-sm"
              style={{ borderColor: isGood ? COLORS.successBorder : COLORS.warningBorder }}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="font-bold text-gray-900">{m.label}</h3>
                <span className="rounded-full border px-2.5 py-1 text-xs font-bold uppercase"
                  style={{
                    backgroundColor: isGood ? COLORS.successBg : COLORS.warningBg,
                    color: isGood ? COLORS.success : COLORS.warning,
                    borderColor: isGood ? COLORS.successBorder : COLORS.warningBorder,
                  }}>
                  {isGood ? "On Track" : "Needs Attention"}
                </span>
              </div>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-3xl font-black text-gray-900">{m.value}</span>
                <span className="text-sm text-gray-500 mb-1">Target: {m.target}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 mb-3">
                <div className="h-2.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, m.num)}%`, backgroundColor: isGood ? COLORS.success : COLORS.warning }} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">{m.desc}</p>
                {isGood
                  ? <CheckCircle size={16} style={{ color: COLORS.success }} />
                  : <AlertTriangle size={16} style={{ color: COLORS.warning }} />
                }
              </div>
            </div>
          );
        })}
      </div>

      {/* ── API 4: Order Closure ── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <Calendar size={16} style={{ color: COLORS.primary }} />
            <h3 className="text-base font-bold text-gray-900">Order Closure</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={closureDate} onChange={e => setClosureDate(e.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold bg-white focus:outline-none focus:border-gray-900 transition" />
            <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
              {(["daily", "weekly", "monthly"] as ClosurePeriod[]).map(p => (
                <button key={p} onClick={() => setClosurePeriod(p)}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition"
                  style={closurePeriod === p ? { backgroundColor: COLORS.primary, color: "#fff" } : { color: "#6b7280" }}>
                  {p}
                </button>
              ))}
            </div>
            {closureLoading && <RefreshCw size={14} className="animate-spin text-gray-400" />}
          </div>
        </div>

        {closure ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
              {[
                { label: "Total Jobs", val: closure.summary.totalJobs, color: COLORS.primary },
                { label: "Completed", val: closure.summary.completedJobs, color: COLORS.success },
                { label: "Delivered", val: closure.summary.deliveredJobs, color: COLORS.info },
                { label: "Total Earnings", val: `₹${closure.summary.totalEarnings.toLocaleString()}`, color: COLORS.warning },
                { label: "Avg Order Value", val: `₹${closure.summary.avgOrderValue.toLocaleString()}`, color: COLORS.accent },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-center">
                  <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                  <p className="text-lg font-black" style={{ color: item.color }}>{item.val}</p>
                </div>
              ))}
            </div>

            {/* Earnings Chart */}
            {closure.chartData.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Earnings Chart</p>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={closure.chartData}>
                    <defs>
                      <linearGradient id="closureGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={v => `₹${v}`} />
                    <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, "Earnings"]} />
                    <Area type="monotone" dataKey="earnings" stroke={COLORS.primary} fill="url(#closureGrad)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Store Breakdown + Jobs */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Store Breakdown */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Store size={12} /> Store Breakdown
                </p>
                <div className="space-y-2">
                  {closure.storeBreakdown.length > 0 ? closure.storeBreakdown.map(s => (
                    <div key={s.storeId} className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {storeMap.get(s.storeId) || (s.storeId === "unassigned" ? "Unassigned" : `Store ${s.storeId.slice(-6)}`)}
                        </p>
                        <p className="text-sm font-black text-gray-900 flex-shrink-0">₹{s.earnings.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>{s.jobs} jobs</span>
                        <span>{s.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${s.percentage}%`, backgroundColor: COLORS.primary }} />
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-400 text-center py-4">No store data</p>
                  )}
                </div>
              </div>

              {/* Recent Jobs */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ShoppingBag size={12} /> Recent Jobs
                </p>
                <div className="space-y-2">
                  {closure.jobs.length > 0 ? closure.jobs.map(job => (
                    <div key={job.id} className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold font-mono text-gray-900 truncate">{job.id}</p>
                          <p className="text-xs text-gray-500 truncate">{job.type || "—"}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
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
                    </div>
                  )) : (
                    <p className="text-sm text-gray-400 text-center py-4">No jobs in this period</p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="py-10 text-center text-gray-400 text-sm">
            No closure data for selected period
          </div>
        )}
      </div>

      {/* ── API 3: Rejection History ── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${COLORS.error}18` }}>
            <TrendingDown size={17} style={{ color: COLORS.error }} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-gray-900">Rejection History</h3>
            <p className="text-xs text-gray-500">Orders rejected by your team — affects acceptance rate</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Info size={12} /> Permanently logged
          </div>
        </div>

        {/* API 2 rejection history (structured) */}
        {detailedScore?.rejectionHistory && detailedScore.rejectionHistory.length > 0 ? (
          <div className="space-y-3">
            {detailedScore.rejectionHistory.map((r, i) => (
              <div key={r.id || i} className="rounded-xl border p-4"
                style={{ backgroundColor: COLORS.errorBg, borderColor: COLORS.errorBorder }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold font-mono" style={{ color: COLORS.error }}>{r.id}</p>
                    <p className="text-xs mt-1" style={{ color: COLORS.error }}>{r.reason}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs" style={{ color: COLORS.error }}>{r.date}</p>
                    <div className="flex items-center gap-1 mt-1 justify-end">
                      <XCircle size={12} style={{ color: COLORS.error }} />
                      <span className="text-xs font-bold" style={{ color: COLORS.error }}>Rejected</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : rejections.length > 0 ? (
          /* API 3 fallback — raw order documents */
          <div className="space-y-3">
            {rejections.map((order: any, i: number) => {
              const rejectionNote = order.timeline?.find((t: any) =>
                /rejected by vendor/i.test(t.note || "")
              );
              return (
                <div key={order._id || i} className="rounded-xl border p-4"
                  style={{ backgroundColor: COLORS.errorBg, borderColor: COLORS.errorBorder }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold font-mono" style={{ color: COLORS.error }}>
                        {order.orderNumber || `#${String(order._id).slice(-8).toUpperCase()}`}
                      </p>
                      <p className="text-xs mt-1" style={{ color: COLORS.error }}>
                        {rejectionNote?.note || "Rejected by vendor"}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs" style={{ color: COLORS.error }}>
                        {order.updatedAt ? new Date(order.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </p>
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        <XCircle size={12} style={{ color: COLORS.error }} />
                        <span className="text-xs font-bold" style={{ color: COLORS.error }}>Rejected</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center">
            <CheckCircle size={36} className="mx-auto mb-3" style={{ color: COLORS.success }} />
            <p className="text-sm font-semibold text-gray-600">No rejections recorded</p>
            <p className="text-xs text-gray-400 mt-1">Zero rejections means maximum routing priority.</p>
          </div>
        )}
      </div>
    </div>
  );
}
