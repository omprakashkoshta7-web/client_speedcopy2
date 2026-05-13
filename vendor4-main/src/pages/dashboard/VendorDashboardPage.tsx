import { useEffect, useState } from "react";
import { Briefcase, Wallet, TrendingUp, Users, RefreshCw, AlertTriangle, Store, Package, Clock, ArrowRight, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import VendorMetricCard from "../../components/ui/VendorMetricCard";
import LoadingState from "../../components/ui/LoadingState";
import { 
  getVendorWalletSummary, 
  getVendorStaff, 
  getVendorPerformanceScore,
  getVendorOrders,
  getVendorStores,
  getVendorWalletStoreWise
} from "../../services/vendor.service";
import { COLORS } from "../../utils/colors";
import type { VendorOrder, VendorStore } from "../../types/vendor";

const VendorDashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState({
    jobsClosed: 0,
    totalJobs: 0,
    netPayout: 0,
    slaScore: 0,
    activeStaff: 0,
  });
  const [recentOrders, setRecentOrders] = useState<VendorOrder[]>([]);
  const [stores, setStores] = useState<VendorStore[]>([]);
  const [storeEarnings, setStoreEarnings] = useState<any[]>([]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const results = await Promise.allSettled([
        getVendorWalletSummary(),
        getVendorStaff(),
        getVendorPerformanceScore(),
        getVendorOrders(),
        getVendorStores(),
        getVendorWalletStoreWise(),
      ]);

      const financeResponse = results[0].status === "fulfilled" ? results[0].value : null;
      const staffResponse = results[1].status === "fulfilled" ? results[1].value : null;
      const scoreResponse = results[2].status === "fulfilled" ? results[2].value : null;
      const ordersResponse = results[3].status === "fulfilled" ? results[3].value : null;
      const storesResponse = results[4].status === "fulfilled" ? results[4].value : null;
      const storeEarningsResponse = results[5].status === "fulfilled" ? results[5].value : null;

      // Active staff count
      let activeStaffCount = 0;
      if (staffResponse?.success && Array.isArray(staffResponse.data)) {
        activeStaffCount = staffResponse.data.filter((s: { isActive: boolean }) => s.isActive).length;
      }

      // Jobs from orders
      let jobsClosed = 0;
      let totalJobs = 0;
      let orders: VendorOrder[] = [];
      if (ordersResponse?.success && ordersResponse.data) {
        orders = ordersResponse.data.orders || [];
        totalJobs = orders.length;
        jobsClosed = orders.filter((o: { status: string }) =>
          o.status === "delivered" || o.status === "cancelled"
        ).length;
        setRecentOrders(orders.slice(0, 5));
      }

      // Finance — balance / availableForWithdrawal
      let netPayout = 0;
      if (financeResponse?.success && financeResponse.data) {
        const d = financeResponse.data;
        netPayout = d.availableForWithdrawal || d.balance || 0;
      }

      // Score — completionRate or overallScore
      let slaScore = 0;
      if (scoreResponse?.success && scoreResponse.data) {
        const d = scoreResponse.data;
        slaScore = Math.round(d.completionRate || d.overallScore || 0);
      }

      if (storesResponse?.success && Array.isArray(storesResponse.data)) {
        setStores(storesResponse.data);
      }
      if (storeEarningsResponse?.success && Array.isArray(storeEarningsResponse.data)) {
        setStoreEarnings(storeEarningsResponse.data);
      }

      setMetrics({ jobsClosed, totalJobs, netPayout, slaScore, activeStaff: activeStaffCount });

      const allFailed = results.every(r => r.status === "rejected");
      if (allFailed) {
        setError("Unable to load dashboard data. Please check your connection and try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboardData();
  }, []);

  if (loading) {
    return <LoadingState message="Loading dashboard" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of your vendor operations</p>
        </div>
        <button 
          onClick={() => void loadDashboardData()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold"
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border px-4 py-3 text-sm flex items-center gap-2"
          style={{ backgroundColor: COLORS.errorBg, borderColor: COLORS.errorBorder, color: COLORS.error }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Metrics Grid */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <VendorMetricCard
          index={0}
          label="Jobs Closed"
          value={String(metrics.jobsClosed)}
          accent={COLORS.success}
          accentBg={COLORS.successBg}
          note={`${metrics.totalJobs} total jobs`}
          icon={Briefcase}
        />
        <VendorMetricCard
          index={1}
          label="Net Payout"
          value={`₹${metrics.netPayout.toLocaleString()}`}
          accent={COLORS.primary}
          accentBg={`${COLORS.primary}18`}
          note="Available for withdrawal"
          icon={Wallet}
        />
        <VendorMetricCard
          index={2}
          label="SLA Score"
          value={`${metrics.slaScore}%`}
          accent={COLORS.success}
          accentBg={COLORS.successBg}
          note="Completion rate"
          icon={TrendingUp}
        />
        <VendorMetricCard
          index={3}
          label="Active Staff"
          value={String(metrics.activeStaff)}
          accent={COLORS.info}
          accentBg={COLORS.infoBg}
          note="On current roster"
          icon={Users}
        />
      </section>

      {/* Two Column Layout for Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders Table */}
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col" style={{ maxHeight: '500px' }}>
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-gray-700" />
              <h2 className="text-base font-bold text-gray-900">Recent Orders</h2>
            </div>
            <button
              onClick={() => navigate("/orders")}
              className="text-sm font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="overflow-y-auto overflow-x-auto flex-1">
            {recentOrders.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                <Package size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No orders yet</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentOrders.map((order) => (
                    <tr
                      key={order._id}
                      onClick={() => navigate(`/orders/${order._id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition"
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {order.orderNumber || order._id.slice(-8)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(order.createdAt || "").toLocaleDateString("en-IN")}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
                          style={{
                            backgroundColor: getStatusColor(order.status).bg,
                            color: getStatusColor(order.status).text,
                          }}
                        >
                          {getStatusIcon(order.status)}
                          {formatStatus(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-sm font-bold text-gray-900">
                          ₹{(order.total || 0).toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Store Performance Table */}
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col" style={{ maxHeight: '500px' }}>
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Store size={18} className="text-gray-700" />
              <h2 className="text-base font-bold text-gray-900">Store Performance</h2>
            </div>
            <button
              onClick={() => navigate("/stores")}
              className="text-sm font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="overflow-y-auto overflow-x-auto flex-1">
            {stores.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                <Store size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No stores configured</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Store
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Earnings
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stores.map((store) => {
                    const earnings = storeEarnings.find((e) => e._id === store._id);
                    return (
                      <tr
                        key={store._id}
                        onClick={() => navigate(`/stores/${store._id}`)}
                        className="hover:bg-gray-50 cursor-pointer transition"
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {store.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {store.address.city}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
                            style={{
                              backgroundColor: store.isActive && store.isAvailable
                                ? COLORS.successBg
                                : COLORS.errorBg,
                              color: store.isActive && store.isAvailable
                                ? COLORS.success
                                : COLORS.error,
                            }}
                          >
                            {store.isActive && store.isAvailable ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-sm font-bold text-gray-900">
                            ₹{(earnings?.earnings || 0).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {earnings?.orderCount || 0} orders
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {/* Quick Actions */}
      <section className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={() => navigate("/orders")}
            className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-gray-900 hover:shadow-sm transition text-left"
          >
            <div className="p-2 rounded-lg" style={{ backgroundColor: COLORS.infoBg }}>
              <Package size={18} style={{ color: COLORS.info }} />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">View Orders</div>
              <div className="text-xs text-gray-500">Manage job queue</div>
            </div>
          </button>

          <button
            onClick={() => navigate("/earnings")}
            className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-gray-900 hover:shadow-sm transition text-left"
          >
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${COLORS.primary}18` }}>
              <Wallet size={18} style={{ color: COLORS.primary }} />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">Earnings</div>
              <div className="text-xs text-gray-500">View financials</div>
            </div>
          </button>

          <button
            onClick={() => navigate("/stores")}
            className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-gray-900 hover:shadow-sm transition text-left"
          >
            <div className="p-2 rounded-lg" style={{ backgroundColor: COLORS.successBg }}>
              <Store size={18} style={{ color: COLORS.success }} />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">Stores</div>
              <div className="text-xs text-gray-500">Manage locations</div>
            </div>
          </button>

          <button
            onClick={() => navigate("/staff")}
            className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-gray-900 hover:shadow-sm transition text-left"
          >
            <div className="p-2 rounded-lg" style={{ backgroundColor: COLORS.warningBg }}>
              <Users size={18} style={{ color: COLORS.warning }} />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">Staff</div>
              <div className="text-xs text-gray-500">Team management</div>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
};

// Helper functions
const getStatusColor = (status: string) => {
  const statusMap: Record<string, { bg: string; text: string }> = {
    delivered: { bg: COLORS.successBg, text: COLORS.success },
    cancelled: { bg: COLORS.errorBg, text: COLORS.error },
    in_production: { bg: COLORS.infoBg, text: COLORS.info },
    qc_pending: { bg: COLORS.warningBg, text: COLORS.warning },
    ready_for_pickup: { bg: COLORS.successBg, text: COLORS.success },
    vendor_accepted: { bg: COLORS.infoBg, text: COLORS.info },
    assigned_vendor: { bg: COLORS.warningBg, text: COLORS.warning },
  };
  return statusMap[status] || { bg: "#f3f4f6", text: "#6b7280" };
};

const getStatusIcon = (status: string) => {
  if (status === "delivered") return <CheckCircle size={12} />;
  if (status === "cancelled") return <XCircle size={12} />;
  if (status === "in_production") return <Package size={12} />;
  return <Clock size={12} />;
};

const formatStatus = (status: string) => {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default VendorDashboardPage;
