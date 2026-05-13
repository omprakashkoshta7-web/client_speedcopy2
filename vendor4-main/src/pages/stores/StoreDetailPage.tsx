import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Save, Store, MapPin, Phone, Mail,
  Clock, Package, ToggleLeft, CheckCircle, XCircle,
  Edit2, X, RefreshCw, Zap, TrendingUp, Trash2, AlertTriangle
} from "lucide-react";
import { COLORS } from "../../utils/colors";
import {
  getVendorStore,
  updateVendorStore,
  updateVendorStoreAvailability,
  updateVendorStoreCapacity,
  updateVendorStoreStatus,
  getStoreCapabilities,
  deleteVendorStore,
} from "../../services/vendor.service";
import type { VendorStore } from "../../types/vendor";
import LoadingState from "../../components/ui/LoadingState";

function Field({ label, value, onChange, disabled, icon: Icon, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  disabled?: boolean; icon?: React.ComponentType<{ size?: number; className?: string }>;
  type?: string; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">{label}</span>
      <div className="relative">
        {Icon && <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />}
        <input type={type} placeholder={placeholder}
          className={`w-full rounded-xl border py-2.5 text-sm outline-none transition ${Icon ? "pl-10 pr-4" : "px-4"} ${
            disabled ? "bg-gray-50 text-gray-500 border-gray-100 cursor-not-allowed"
              : "bg-white border-gray-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
          }`}
          value={value} onChange={e => onChange(e.target.value)} disabled={disabled} />
      </div>
    </label>
  );
}

export default function StoreDetailPage() {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const [store, setStore] = useState<VendorStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [capabilities, setCapabilities] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: "", workingHours: "", phone: "", email: "",
    maxOrdersPerDay: "0", currentLoad: "0", dailyLimit: "0", maxConcurrentOrders: "10",
    lat: "", lng: "",
  });

  // API 2: GET /api/vendor/stores/:id
  const loadStore = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getVendorStore(id);
      setStore(res.data);
      setForm({
        name: res.data.name,
        workingHours: res.data.workingHours || "",
        phone: res.data.phone || "",
        email: res.data.email || "",
        maxOrdersPerDay: String(res.data.capacity?.maxOrdersPerDay || 0),
        currentLoad: String(res.data.capacity?.currentLoad || 0),
        dailyLimit: String(res.data.capacity?.dailyLimit || res.data.capacity?.maxOrdersPerDay || 0),
        maxConcurrentOrders: String(res.data.capacity?.maxConcurrentOrders || 10),
        lat: res.data.location?.lat != null ? String(res.data.location.lat) : "",
        lng: res.data.location?.lng != null ? String(res.data.location.lng) : "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load store");
    } finally {
      setLoading(false);
    }
  };

  // API 7: GET /api/vendor/stores/:id/capabilities
  const loadCapabilities = async () => {
    try {
      const res = await getStoreCapabilities(id);
      setCapabilities(res.data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    void loadStore();
    void loadCapabilities();
  }, [id]);

  const addressLine = useMemo(() => {
    if (!store?.address) return "";
    return [store.address.line1, store.address.city, store.address.state, store.address.pincode].filter(Boolean).join(", ");
  }, [store]);

  // API 3: PUT /api/vendor/stores/:id + API 6: PUT /api/vendor/stores/:id/capacity
  const handleSave = async () => {
    if (!store) return;
    try {
      setSaving(true);
      setError("");
      const [storeRes, capRes] = await Promise.all([
        updateVendorStore(store._id, {
          name: form.name,
          workingHours: form.workingHours,
          phone: form.phone,
          email: form.email,
        }),
        updateVendorStoreCapacity(store._id, {
          maxOrdersPerDay: Number(form.maxOrdersPerDay) || 0,
          currentLoad: Number(form.currentLoad) || 0,
          dailyLimit: Number(form.dailyLimit) || Number(form.maxOrdersPerDay) || 0,
          maxConcurrentOrders: Number(form.maxConcurrentOrders) || 10,
        }),
      ]);
      setStore({ ...storeRes.data, capacity: capRes.data.capacity });
      setEditMode(false);
      setMessage("Store updated successfully");
      setTimeout(() => setMessage(""), 3000);
      void loadCapabilities();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save store");
    } finally {
      setSaving(false);
    }
  };

  // API 5: PATCH /api/vendor/stores/:id/availability
  const toggleAvailability = async () => {
    if (!store) return;
    try {
      const res = await updateVendorStoreAvailability(store._id, !store.isAvailable);
      setStore(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update availability");
    }
  };

  // API 4: PATCH /api/vendor/stores/:id/status
  const toggleStatus = async () => {
    if (!store) return;
    try {
      const res = await updateVendorStoreStatus(store._id, !store.isActive);
      setStore(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  // DELETE /api/vendor/stores/:id
  const handleDelete = async () => {
    if (!store) return;
    try {
      setDeleting(true);
      setError("");
      await deleteVendorStore(store._id);
      navigate("/stores");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete store");
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingState message="Loading store details" />;

  const isOnline = store?.isActive && store?.isAvailable;
  const load = store?.capacity?.currentLoad || 0;
  const max = store?.capacity?.maxOrdersPerDay || 0;
  const utilPct = max > 0 ? Math.min(100, Math.round((load / max) * 100)) : 0;
  const utilColor = utilPct >= 90 ? COLORS.error : utilPct >= 70 ? COLORS.warning : COLORS.success;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">Store Details</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage store information</p>
        </div>
        <button onClick={() => navigate("/stores")}
          className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition">
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-xl border px-4 py-3 text-sm flex items-center gap-2"
          style={{ backgroundColor: COLORS.errorBg, borderColor: COLORS.errorBorder, color: COLORS.error }}>
          <XCircle size={14} /> {error}
        </div>
      )}
      {message && (
        <div className="rounded-xl border px-4 py-3 text-sm flex items-center gap-2"
          style={{ backgroundColor: COLORS.successBg, borderColor: COLORS.successBorder, color: COLORS.success }}>
          <CheckCircle size={14} /> {message}
        </div>
      )}

      {/* Store Header Card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: isOnline ? `${COLORS.success}18` : "#f1f5f9" }}>
              <Store size={22} style={{ color: isOnline ? COLORS.success : "#94a3b8" }} />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">{store?.name}</h1>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin size={12} /> {addressLine || "No address set"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void loadStore()}
              className="p-2 rounded-xl border border-gray-200 hover:border-gray-900 transition">
              <RefreshCw size={14} className="text-gray-500" />
            </button>
            {editMode ? (
              <>
                <button onClick={() => { setEditMode(false); void loadStore(); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                  <X size={14} /> Cancel
                </button>
                <button onClick={() => void handleSave()} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
                  style={{ backgroundColor: COLORS.primary }}>
                  <Save size={14} /> {saving ? "Saving..." : "Save"}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition"
                  style={{ backgroundColor: COLORS.errorBg, color: COLORS.error, border: `1px solid ${COLORS.errorBorder}` }}>
                  <Trash2 size={14} /> Delete
                </button>
                <button onClick={() => setEditMode(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition"
                  style={{ backgroundColor: COLORS.primary }}>
                  <Edit2 size={14} /> Edit
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status + Quick Actions */}
        <div className="flex flex-wrap items-center gap-3 mb-5 p-4 rounded-xl bg-gray-50 border border-gray-200">
          <span className="rounded-full border px-3 py-1 text-xs font-bold uppercase"
            style={{
              backgroundColor: isOnline ? COLORS.successBg : COLORS.errorBg,
              color: isOnline ? COLORS.success : COLORS.error,
              borderColor: isOnline ? COLORS.successBorder : COLORS.errorBorder,
            }}>
            {isOnline ? "Online" : "Offline"}
          </span>
          <span className="text-xs text-gray-400">|</span>
          {/* API 4: toggle active */}
          <button onClick={() => void toggleStatus()}
            className="text-xs font-bold px-3 py-1.5 rounded-lg transition"
            style={{
              backgroundColor: store?.isActive ? COLORS.errorBg : COLORS.successBg,
              color: store?.isActive ? COLORS.error : COLORS.success,
            }}>
            {store?.isActive ? "Deactivate Store" : "Activate Store"}
          </button>
          {/* API 5: toggle availability */}
          <button onClick={() => void toggleAvailability()}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white transition"
            style={{ backgroundColor: isOnline ? COLORS.warning : COLORS.success }}>
            <ToggleLeft size={13} />
            {isOnline ? "Go Offline" : "Go Online"}
          </button>
        </div>

        {/* Utilization */}
        <div className="mb-5">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-500 font-semibold">Capacity Utilization</span>
            <span className="font-bold" style={{ color: utilColor }}>{load} / {max} orders ({utilPct}%)</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div className="h-2.5 rounded-full transition-all" style={{ width: `${utilPct}%`, backgroundColor: utilColor }} />
          </div>
        </div>

        {/* Supported Flows */}
        <div className="flex flex-wrap gap-2">
          {(store?.supportedFlows || []).map(flow => (
            <span key={flow} className="rounded-full border px-3 py-1 text-xs font-semibold capitalize"
              style={{ backgroundColor: COLORS.infoBg, color: COLORS.info, borderColor: COLORS.infoBorder }}>
              {flow}
            </span>
          ))}
        </div>
      </div>

      {/* Edit Form — API 3 + API 6 */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 mb-4">Store Details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Store Name" value={form.name} onChange={v => setForm(c => ({ ...c, name: v }))} disabled={!editMode} icon={Store} placeholder="Store name" />
          <Field label="Working Hours" value={form.workingHours} onChange={v => setForm(c => ({ ...c, workingHours: v }))} disabled={!editMode} icon={Clock} placeholder="9:00 AM - 9:00 PM" />
          <Field label="Phone" value={form.phone} onChange={v => setForm(c => ({ ...c, phone: v }))} disabled={!editMode} icon={Phone} placeholder="+91 XXXXX XXXXX" />
          <Field label="Email" value={form.email} onChange={v => setForm(c => ({ ...c, email: v }))} disabled={!editMode} icon={Mail} type="email" placeholder="store@business.com" />
          <Field label="Max Orders / Day" value={form.maxOrdersPerDay} onChange={v => setForm(c => ({ ...c, maxOrdersPerDay: v }))} disabled={!editMode} icon={Package} type="number" placeholder="50" />
          <Field label="Daily Limit" value={form.dailyLimit} onChange={v => setForm(c => ({ ...c, dailyLimit: v }))} disabled={!editMode} icon={Package} type="number" placeholder="50" />
          <Field label="Max Concurrent Orders" value={form.maxConcurrentOrders} onChange={v => setForm(c => ({ ...c, maxConcurrentOrders: v }))} disabled={!editMode} type="number" placeholder="10" />
          <Field label="Current Load" value={form.currentLoad} onChange={v => setForm(c => ({ ...c, currentLoad: v }))} disabled={!editMode} icon={TrendingUp} type="number" placeholder="0" />
        </div>
        {editMode && (
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={() => { setEditMode(false); void loadStore(); }}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
              Cancel
            </button>
            <button onClick={() => void handleSave()} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
              style={{ backgroundColor: COLORS.primary }}>
              <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      {/* Capabilities — API 7 */}
      {capabilities && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} style={{ color: COLORS.warning }} />
            <h2 className="text-base font-bold text-gray-900">Store Capabilities</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-center">
              <p className="text-xs text-gray-500 mb-1">Max Orders/Day</p>
              <p className="text-2xl font-black text-gray-900">{capabilities.maxOrdersPerDay || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-center">
              <p className="text-xs text-gray-500 mb-1">Current Load</p>
              <p className="text-2xl font-black text-gray-900">{capabilities.currentLoad || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Supported Flows</p>
              <div className="flex flex-wrap gap-1">
                {(capabilities.supportedFlows || []).map((f: string) => (
                  <span key={f} className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize"
                    style={{ backgroundColor: COLORS.infoBg, color: COLORS.info }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
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
              Are you sure you want to delete <span className="font-bold text-gray-900">"{store?.name}"</span>?
              All store data will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} disabled={deleting}
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

