import { useEffect, useState } from "react";
import {
  Store, Users, TrendingUp, Package,
  RefreshCw, AlertTriangle,
  BarChart2, Activity
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from "recharts";
import LoadingState from "../../components/ui/LoadingState";
import { COLORS } from "../../utils/colors";
import { getVendorPerformance } from "../../services/vendor.service";
import VendorMetricCard from "../../components/ui/VendorMetricCard";

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // API: GET /api/vendor/analytics/performance
  // Returns: { totalStores, activeStores, totalStaff, capacitySnapshot }
  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getVendorPerformance();
      setData(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  if (loading) return <LoadingState message="Loading analytics" />;

  const totalStores: number = data?.totalStores || 0;
  const activeStores: number = data?.activeStores || 0;
  const inactiveStores = totalStores - activeStores;
  const totalStaff: number = data?.totalStaff || 0;
  const capacitySnapshot: any[] = data?.capacitySnapshot || [];

  // Build chart data from capacity snapshot
  const capacityChartData = capacitySnapshot.map((store: any) => ({
    name: store.name?.length > 12 ? store.name.slice(0, 12) + "…" : (store.name || "Store"),
    maxOrders: store.capacity?.maxOrdersPerDay || 0,
    currentLoad: store.capacity?.currentLoad || 0,
    available: store.isAvailable ? 1 : 0,
  }));

  const totalCapacity = capacitySnapshot.reduce((s: number, st: any) => s + (st.capacity?.maxOrdersPerDay || 0), 0);
  const totalLoad = capacitySnapshot.reduce((s: number, st: any) => s + (st.capacity?.currentLoad || 0), 0);
  const overallUtilization = totalCapacity > 0 ? Math.round((totalLoad / totalCapacity) * 100) : 0;
  const availableStores = capacitySnapshot.filter((s: any) => s.isAvailable).length;

  const utilizationColor = overallUtilization >= 90 ? COLORS.error : overallUtilization >= 70 ? COLORS.warning : COLORS.success;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Performance metrics and insights</p>
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

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <VendorMetricCard index={0} label="Total Stores" value={String(totalStores)} accent={COLORS.primary} accentBg={`${COLORS.primary}18`} note={`${activeStores} active`} icon={Store} />
        <VendorMetricCard index={1} label="Active Staff" value={String(totalStaff)} accent={COLORS.info} accentBg={COLORS.infoBg} note="Currently active" icon={Users} />
        <VendorMetricCard index={2} label="Total Capacity" value={`${totalCapacity}/day`} accent={COLORS.warning} accentBg={COLORS.warningBg} note={`${totalLoad} current load`} icon={Package} />
        <VendorMetricCard index={3} label="Utilization" value={`${overallUtilization}%`} accent={utilizationColor} accentBg={`${utilizationColor}18`} note="Across all stores" icon={TrendingUp} />
      </div>

      {/* Store Status Overview */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Active vs Inactive */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Store size={16} style={{ color: COLORS.primary }} />
            <h3 className="text-base font-bold text-gray-900">Store Status</h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-600 font-semibold">Active</span>
                <span className="font-black" style={{ color: COLORS.success }}>{activeStores}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div className="h-2.5 rounded-full" style={{ width: totalStores > 0 ? `${(activeStores / totalStores) * 100}%` : "0%", backgroundColor: COLORS.success }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-600 font-semibold">Inactive</span>
                <span className="font-black" style={{ color: COLORS.error }}>{inactiveStores}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div className="h-2.5 rounded-full" style={{ width: totalStores > 0 ? `${(inactiveStores / totalStores) * 100}%` : "0%", backgroundColor: COLORS.error }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-600 font-semibold">Available Now</span>
                <span className="font-black" style={{ color: COLORS.info }}>{availableStores}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div className="h-2.5 rounded-full" style={{ width: totalStores > 0 ? `${(availableStores / totalStores) * 100}%` : "0%", backgroundColor: COLORS.info }} />
              </div>
            </div>
          </div>
        </div>

        {/* Capacity Overview */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} style={{ color: COLORS.warning }} />
            <h3 className="text-base font-bold text-gray-900">Capacity Overview</h3>
          </div>
          <div className="text-center mb-4">
            <p className="text-4xl font-black" style={{ color: utilizationColor }}>{overallUtilization}%</p>
            <p className="text-xs text-gray-500 mt-1">Overall Utilization</p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 mb-4">
            <div className="h-3 rounded-full transition-all" style={{ width: `${overallUtilization}%`, backgroundColor: utilizationColor }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-center">
              <p className="text-xs text-gray-500 mb-1">Total Capacity</p>
              <p className="text-lg font-black text-gray-900">{totalCapacity}</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-center">
              <p className="text-xs text-gray-500 mb-1">Current Load</p>
              <p className="text-lg font-black text-gray-900">{totalLoad}</p>
            </div>
          </div>
        </div>

        {/* Staff Overview */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} style={{ color: COLORS.info }} />
            <h3 className="text-base font-bold text-gray-900">Team Overview</h3>
          </div>
          <div className="text-center mb-4">
            <p className="text-4xl font-black" style={{ color: COLORS.info }}>{totalStaff}</p>
            <p className="text-xs text-gray-500 mt-1">Active Staff Members</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
              <span className="text-sm text-gray-600">Stores per Staff</span>
              <span className="text-sm font-black text-gray-900">
                {totalStaff > 0 ? (totalStores / totalStaff).toFixed(1) : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
              <span className="text-sm text-gray-600">Capacity per Staff</span>
              <span className="text-sm font-black text-gray-900">
                {totalStaff > 0 ? Math.round(totalCapacity / totalStaff) : "—"}/day
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Capacity Chart — from capacitySnapshot */}
      {capacityChartData.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={16} style={{ color: COLORS.primary }} />
            <h3 className="text-base font-bold text-gray-900">Store Capacity vs Load</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={capacityChartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
              <Tooltip formatter={(v: any) => v} />
              <Bar dataKey="maxOrders" name="maxOrders" fill={`${COLORS.primary}40`} radius={[6, 6, 0, 0]} />
              <Bar dataKey="currentLoad" name="currentLoad" radius={[6, 6, 0, 0]}>
                {capacityChartData.map((entry: any, i: number) => {
                  const pct = entry.maxOrders > 0 ? (entry.currentLoad / entry.maxOrders) * 100 : 0;
                  const color = pct >= 90 ? COLORS.error : pct >= 70 ? COLORS.warning : COLORS.success;
                  return <Cell key={i} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 justify-center mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: `${COLORS.primary}40` }} />
              <span className="text-xs text-gray-500">Max Capacity</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.success }} />
              <span className="text-xs text-gray-500">Current Load</span>
            </div>
          </div>
        </div>
      )}

      {/* Store Capacity Table */}
      {capacitySnapshot.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-4">Store Capacity Details</h3>
          <div className="space-y-3">
            {capacitySnapshot.map((store: any, i: number) => {
              const max = store.capacity?.maxOrdersPerDay || 0;
              const load = store.capacity?.currentLoad || 0;
              const pct = max > 0 ? Math.min(100, Math.round((load / max) * 100)) : 0;
              const barColor = pct >= 90 ? COLORS.error : pct >= 70 ? COLORS.warning : COLORS.success;
              const isAvailable = store.isAvailable;

              return (
                <div key={i} className="p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: isAvailable ? `${COLORS.success}18` : "#f1f5f9" }}>
                        <Store size={14} style={{ color: isAvailable ? COLORS.success : "#94a3b8" }} />
                      </div>
                      <p className="text-sm font-bold text-gray-900">{store.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: isAvailable ? COLORS.successBg : COLORS.errorBg,
                          color: isAvailable ? COLORS.success : COLORS.error,
                        }}>
                        {isAvailable ? "Available" : "Unavailable"}
                      </span>
                      {store.availabilityReason && !isAvailable && (
                        <span className="text-xs text-gray-400">{store.availabilityReason}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>Load: <span className="font-bold text-gray-700">{load}</span> / {max} orders</span>
                    <span className="font-bold" style={{ color: barColor }}>{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {capacitySnapshot.length === 0 && !loading && (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <BarChart2 size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-semibold">No store data available</p>
          <p className="text-xs text-gray-400 mt-1">Create stores to see analytics</p>
        </div>
      )}
    </div>
  );
}
