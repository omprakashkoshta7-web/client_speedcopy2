import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package, Plus, Store, ToggleLeft, TrendingUp,
  Search, RefreshCw, CheckCircle, XCircle, Zap, Trash2, AlertTriangle
} from "lucide-react";
import { COLORS } from "../../utils/colors";
import {
  getVendorStores,
  updateVendorStoreAvailability,
  updateVendorStoreStatus,
  getStoreCapabilities,
  deleteVendorStore,
} from "../../services/vendor.service";
import type { VendorStore } from "../../types/vendor";
import VendorMetricCard from "../../components/ui/VendorMetricCard";
import LoadingState from "../../components/ui/LoadingState";

export default function StoreListPage() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<VendorStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "offline">("all");
  const [busyId, setBusyId] = useState("");
  const [search, setSearch] = useState("");
  const [capabilitiesModal, setCapabilitiesModal] = useState<{ storeId: string; data: any } | null>(null);
  const [deleteModal, setDeleteModal] = useState<VendorStore | null>(null);
  const [deleting, setDeleting] = useState(false);

  // API 1: GET /api/vendor/stores
  const loadStores = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getVendorStores();
      setStores(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadStores(); }, []);

  const filteredStores = useMemo(() => {
    let list = stores;
    if (search) {
      list = list.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.address?.city?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (filter === "active") return list.filter(s => s.isActive && s.isAvailable);
    if (filter === "offline") return list.filter(s => !s.isAvailable || !s.isActive);
    return list;
  }, [filter, stores, search]);

  const stats = useMemo(() => ({
    total: stores.length,
    online: stores.filter(s => s.isActive && s.isAvailable).length,
    capacity: stores.reduce((sum, s) => sum + (s.capacity?.maxOrdersPerDay || 0), 0),
    load: stores.reduce((sum, s) => sum + (s.capacity?.currentLoad || 0), 0),
  }), [stores]);

  // API 5: PATCH /api/vendor/stores/:id/availability
  const toggleAvailability = async (store: VendorStore) => {
    try {
      setBusyId(store._id);
      const res = await updateVendorStoreAvailability(store._id, !store.isAvailable);
      setStores(cur => cur.map(s => s._id === store._id ? res.data : s));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update availability");
    } finally {
      setBusyId("");
    }
  };

  // API 4: PATCH /api/vendor/stores/:id/status
  const toggleStatus = async (store: VendorStore) => {
    try {
      setBusyId(`status-${store._id}`);
      const res = await updateVendorStoreStatus(store._id, !store.isActive);
      setStores(cur => cur.map(s => s._id === store._id ? res.data : s));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setBusyId("");
    }
  };

  // API 7: GET /api/vendor/stores/:id/capabilities
  const viewCapabilities = async (storeId: string) => {
    try {
      const res = await getStoreCapabilities(storeId);
      setCapabilitiesModal({ storeId, data: res.data });
    } catch {
      setError("Failed to load capabilities");
    }
  };

  // DELETE /api/vendor/stores/:id
  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      setDeleting(true);
      setError("");
      await deleteVendorStore(deleteModal._id);
      setStores(cur => cur.filter(s => s._id !== deleteModal._id));
      setDeleteModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete store");
      setDeleteModal(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">Stores</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your store locations</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void loadStores()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => navigate("/stores/new")}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition"
            style={{ backgroundColor: COLORS.primary }}>
            <Plus size={16} /> New Store
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border px-4 py-3 text-sm flex items-center gap-2"
          style={{ backgroundColor: COLORS.errorBg, borderColor: COLORS.errorBorder, color: COLORS.error }}>
          <XCircle size={14} /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <VendorMetricCard label="Total Stores" value={stats.total.toString()} accent={COLORS.primary} accentBg={`${COLORS.primary}18`} index={0} icon={Store} />
        <VendorMetricCard label="Online Stores" value={stats.online.toString()} accent={COLORS.success} accentBg={`${COLORS.success}18`} index={1} icon={CheckCircle} />
        <VendorMetricCard label="Total Capacity" value={`${stats.capacity}/day`} accent={COLORS.warning} accentBg={`${COLORS.warning}18`} index={2} icon={Package} />
        <VendorMetricCard label="Current Load" value={stats.load.toString()} accent={COLORS.info} accentBg={`${COLORS.info}18`} index={3} icon={TrendingUp} />
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search stores..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
        </div>
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
          {(["all", "active", "offline"] as const).map(v => (
            <button key={v} onClick={() => setFilter(v)}
              className="rounded-lg px-4 py-2 text-sm font-semibold capitalize transition"
              style={filter === v ? { backgroundColor: COLORS.primary, color: "#fff" } : { color: "#6b7280" }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Store Cards */}
      {loading ? <LoadingState message="Loading stores" /> : (
        <div className="card-list-lg grid gap-4 lg:grid-cols-2 pr-1">
          {filteredStores.map(store => {
            const isOnline = store.isActive && store.isAvailable;
            const load = store.capacity?.currentLoad || 0;
            const max = store.capacity?.maxOrdersPerDay || 0;
            const utilPct = max > 0 ? Math.min(100, Math.round((load / max) * 100)) : 0;
            const utilColor = utilPct >= 90 ? COLORS.error : utilPct >= 70 ? COLORS.warning : COLORS.success;

            return (
              <div key={store._id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition">
                {/* Store Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: isOnline ? `${COLORS.success}18` : "#f1f5f9" }}>
                      <Store size={18} style={{ color: isOnline ? COLORS.success : "#94a3b8" }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{store.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[store.address?.line1, store.address?.city, store.address?.state].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border px-2.5 py-1 text-xs font-bold uppercase flex-shrink-0"
                    style={{
                      backgroundColor: isOnline ? COLORS.successBg : COLORS.errorBg,
                      color: isOnline ? COLORS.success : COLORS.error,
                      borderColor: isOnline ? COLORS.successBorder : COLORS.errorBorder,
                    }}>
                    {isOnline ? "Online" : "Offline"}
                  </span>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-3 mb-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Load</p>
                    <p className="text-base font-black text-gray-900">{load}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Capacity</p>
                    <p className="text-base font-black text-gray-900">{max}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Hours</p>
                    <p className="text-xs font-semibold text-gray-700 truncate">{store.workingHours || "—"}</p>
                  </div>
                </div>

                {/* Utilization Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Utilization</span>
                    <span className="font-bold" style={{ color: utilColor }}>{utilPct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${utilPct}%`, backgroundColor: utilColor }} />
                  </div>
                </div>

                {/* Supported Flows */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {(store.supportedFlows || []).map(flow => (
                    <span key={flow} className="rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize"
                      style={{ backgroundColor: COLORS.infoBg, color: COLORS.info, borderColor: COLORS.infoBorder }}>
                      {flow}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/stores/${store._id}`)}
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:border-gray-900 transition">
                    Manage
                  </button>
                  {/* API 7: capabilities */}
                  <button onClick={() => void viewCapabilities(store._id)}
                    className="px-3 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition"
                    title="View Capabilities">
                    <Zap size={15} className="text-gray-500" />
                  </button>
                  {/* DELETE store */}
                  <button onClick={() => setDeleteModal(store)}
                    className="px-3 py-2 rounded-xl border transition"
                    style={{ backgroundColor: COLORS.errorBg, borderColor: COLORS.errorBorder, color: COLORS.error }}
                    title="Delete Store">
                    <Trash2 size={15} />
                  </button>
                  {/* API 4: toggle active status */}
                  <button onClick={() => void toggleStatus(store)}
                    disabled={busyId === `status-${store._id}`}
                    className="px-3 py-2 rounded-xl border transition text-xs font-bold disabled:opacity-50"
                    style={{
                      backgroundColor: store.isActive ? COLORS.errorBg : COLORS.successBg,
                      color: store.isActive ? COLORS.error : COLORS.success,
                      borderColor: store.isActive ? COLORS.errorBorder : COLORS.successBorder,
                    }}
                    title={store.isActive ? "Deactivate Store" : "Activate Store"}>
                    {store.isActive ? "Deactivate" : "Activate"}
                  </button>
                  {/* API 5: toggle availability */}
                  <button onClick={() => void toggleAvailability(store)}
                    disabled={busyId === store._id}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-white transition disabled:opacity-60"
                    style={{ backgroundColor: isOnline ? COLORS.warning : COLORS.success }}>
                    <ToggleLeft size={15} />
                    {busyId === store._id ? "..." : isOnline ? "Go Offline" : "Go Online"}
                  </button>
                </div>
              </div>
            );
          })}

          {!filteredStores.length && !loading && (
            <div className="col-span-2 rounded-2xl border border-gray-100 bg-white p-12 text-center">
              <Store size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-semibold">
                {stores.length === 0 ? "No stores yet. Create your first store." : "No stores match your filter."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Capabilities Modal — API 7 */}
      {capabilitiesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl my-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Store Capabilities</h3>
              <button onClick={() => setCapabilitiesModal(null)}>
                <XCircle size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Max Orders / Day</p>
                <p className="text-2xl font-black text-gray-900">{capabilitiesModal.data?.maxOrdersPerDay || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Current Load</p>
                <p className="text-2xl font-black text-gray-900">{capabilitiesModal.data?.currentLoad || 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Supported Flows</p>
                <div className="flex flex-wrap gap-2">
                  {(capabilitiesModal.data?.supportedFlows || []).map((f: string) => (
                    <span key={f} className="rounded-full border px-3 py-1 text-xs font-semibold capitalize"
                      style={{ backgroundColor: COLORS.infoBg, color: COLORS.info, borderColor: COLORS.infoBorder }}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setCapabilitiesModal(null)}
              className="w-full mt-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl my-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: COLORS.errorBg }}>
                <AlertTriangle size={18} style={{ color: COLORS.error }} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Delete Store</h3>
                <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Are you sure you want to delete <span className="font-bold text-gray-900">"{deleteModal.name}"</span>?
              All store data will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
                Cancel
              </button>
              <button onClick={() => void handleDelete()} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
                style={{ backgroundColor: COLORS.error }}>
                {deleting ? "Deleting..." : "Delete Store"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
