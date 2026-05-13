import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Store, MapPin, Phone, Mail, Clock, Package } from "lucide-react";
import { COLORS } from "../../utils/colors";
import { createVendorStore } from "../../services/vendor.service";
import type { CreateStorePayload } from "../../types/vendor";

const FLOWS = ["printing", "gifting", "shopping"] as const;

function Field({ label, value, onChange, icon: Icon, type = "text", placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </span>
      <div className="relative">
        {Icon && <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />}
        <input type={type} placeholder={placeholder} required={required}
          className={`w-full rounded-xl border border-gray-200 py-2.5 text-sm outline-none transition bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-100 ${Icon ? "pl-10 pr-4" : "px-4"}`}
          value={value} onChange={e => onChange(e.target.value)} />
      </div>
    </label>
  );
}

export default function CreateStorePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", line1: "", city: "", state: "", pincode: "",
    phone: "", email: "", workingHours: "9:00 AM - 9:00 PM",
    maxOrdersPerDay: "50", dailyLimit: "50", maxConcurrentOrders: "10",
    internalCode: "", lat: "", lng: "",
    flows: ["printing"] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof typeof form) => (v: string) => setForm(c => ({ ...c, [key]: v }));

  const toggleFlow = (flow: string) => {
    setForm(c => ({
      ...c,
      flows: c.flows.includes(flow) ? c.flows.filter(f => f !== flow) : [...c.flows, flow],
    }));
  };

  // API 1: POST /api/vendor/stores
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.line1 || !form.city || !form.state || !form.pincode) {
      setError("Please fill all required fields");
      return;
    }
    if (form.flows.length === 0) {
      setError("Select at least one supported flow");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload: CreateStorePayload = {
        name: form.name,
        ...(form.internalCode && { internalCode: form.internalCode }),
        address: {
          line1: form.line1,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
        },
        ...(form.phone && { phone: form.phone }),
        ...(form.email && { email: form.email }),
        workingHours: form.workingHours,
        supportedFlows: form.flows,
        capacity: {
          maxOrdersPerDay: Number(form.maxOrdersPerDay) || 50,
          dailyLimit: Number(form.dailyLimit) || 50,
          maxConcurrentOrders: Number(form.maxConcurrentOrders) || 10,
          currentLoad: 0,
        },
        ...(form.lat && form.lng && {
          location: { lat: Number(form.lat), lng: Number(form.lng) },
        }),
      };
      const res = await createVendorStore(payload);
      navigate(`/stores/${res.data._id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create store");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">Create Store</h1>
          <p className="text-sm text-gray-500 mt-0.5">Add a new store location</p>
        </div>
        <button onClick={() => navigate("/stores")}
          className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition">
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      {error && (
        <div className="rounded-xl border px-4 py-3 text-sm"
          style={{ backgroundColor: COLORS.errorBg, borderColor: COLORS.errorBorder, color: COLORS.error }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
              <Store size={17} className="text-slate-600" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Basic Information</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Store Name" value={form.name} onChange={set("name")} icon={Store} placeholder="e.g. SpeedCopy Andheri" required />
            <Field label="Internal Code" value={form.internalCode} onChange={set("internalCode")} placeholder="e.g. CP-001" />
            <Field label="Working Hours" value={form.workingHours} onChange={set("workingHours")} icon={Clock} placeholder="9:00 AM - 9:00 PM" />
            <Field label="Phone" value={form.phone} onChange={set("phone")} icon={Phone} placeholder="+91 XXXXX XXXXX" />
            <Field label="Email" value={form.email} onChange={set("email")} icon={Mail} type="email" placeholder="store@business.com" />
            <Field label="Max Orders / Day" value={form.maxOrdersPerDay} onChange={set("maxOrdersPerDay")} icon={Package} type="number" placeholder="50" />
            <Field label="Daily Limit" value={form.dailyLimit} onChange={set("dailyLimit")} icon={Package} type="number" placeholder="50" />
            <Field label="Max Concurrent Orders" value={form.maxConcurrentOrders} onChange={set("maxConcurrentOrders")} type="number" placeholder="10" />
          </div>
        </div>

        {/* Address */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
              <MapPin size={17} className="text-slate-600" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Address</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="Address Line 1" value={form.line1} onChange={set("line1")} icon={MapPin} placeholder="Street, Building, Area" required />
            </div>
            <Field label="City" value={form.city} onChange={set("city")} placeholder="Mumbai" required />
            <Field label="State" value={form.state} onChange={set("state")} placeholder="Maharashtra" required />
            <Field label="Pincode" value={form.pincode} onChange={set("pincode")} placeholder="400001" required />
            <div />
            <Field label="Latitude (optional)" value={form.lat} onChange={set("lat")} type="number" placeholder="19.0760" />
            <Field label="Longitude (optional)" value={form.lng} onChange={set("lng")} type="number" placeholder="72.8777" />
          </div>
        </div>

        {/* Supported Flows */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-1">Supported Flows</h2>
          <p className="text-xs text-gray-500 mb-4">Select which order types this store can handle</p>
          <div className="flex flex-wrap gap-3">
            {FLOWS.map(flow => {
              const active = form.flows.includes(flow);
              return (
                <button type="button" key={flow} onClick={() => toggleFlow(flow)}
                  className="rounded-xl border px-5 py-3 text-sm font-bold capitalize transition"
                  style={{
                    backgroundColor: active ? COLORS.infoBg : "white",
                    color: active ? COLORS.info : "#6b7280",
                    borderColor: active ? COLORS.infoBorder : "#e5e7eb",
                  }}>
                  {flow}
                </button>
              );
            })}
          </div>
          {form.flows.length === 0 && (
            <p className="text-xs text-red-500 mt-2">Select at least one flow</p>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate("/stores")}
            className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
            style={{ backgroundColor: COLORS.primary }}>
            <Save size={14} />
            {saving ? "Creating..." : "Create Store"}
          </button>
        </div>
      </form>
    </div>
  );
}
