import { useEffect, useMemo, useState } from "react";
import {
  Building2, CreditCard, Mail, MapPin, Phone, Save,
  Edit2, X, CheckCircle, AlertTriangle, Globe, User,
  Shield, Star, RefreshCw
} from "lucide-react";
import LoadingState from "../../components/ui/LoadingState";
import { COLORS } from "../../utils/colors";
import { getVendorProfile, updateVendorProfile } from "../../services/vendor.service";
import type { VendorProfile } from "../../types/vendor";

// ─── Reusable Field ───────────────────────────────────────
function Field({
  label, value, onChange, disabled, icon: Icon, type = "text", placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  disabled?: boolean; icon?: React.ComponentType<{ size?: number; className?: string }>;
  type?: string; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">{label}</span>
      <div className="relative">
        {Icon && <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />}
        <input
          type={type}
          placeholder={placeholder}
          className={`w-full rounded-xl border py-2.5 text-sm outline-none transition ${
            Icon ? "pl-10 pr-4" : "px-4"
          } ${disabled
            ? "bg-gray-50 text-gray-500 border-gray-100 cursor-not-allowed"
            : "bg-white border-gray-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
          }`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      </div>
    </label>
  );
}

// ─── Section Card ─────────────────────────────────────────
function Section({
  title, icon: Icon, children,
}: {
  title: string; icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${COLORS.primary}18` }}>
          <Icon size={17} className="text-gray-600" />
        </div>
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────
function StatusBadge({ label, active, activeLabel, inactiveLabel }: {
  label: string; active: boolean; activeLabel?: string; inactiveLabel?: string;
}) {
  return (
    <div className="rounded-xl border p-4" style={{
      backgroundColor: active ? COLORS.successBg : COLORS.warningBg,
      borderColor: active ? COLORS.successBorder : COLORS.warningBorder,
    }}>
      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: active ? COLORS.success : COLORS.warning }}>{label}</p>
      <div className="flex items-center gap-2">
        {active
          ? <CheckCircle size={16} style={{ color: COLORS.success }} />
          : <AlertTriangle size={16} style={{ color: COLORS.warning }} />
        }
        <p className="text-sm font-bold" style={{ color: active ? COLORS.success : COLORS.warning }}>
          {active ? (activeLabel || "Active") : (inactiveLabel || "Inactive")}
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function OrgProfilePage() {
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [form, setForm] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // API 1: GET /api/vendor/org/profile
  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getVendorProfile();
      setProfile(res.data);
      setForm(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadProfile(); }, []);

  const addressLine = useMemo(() => {
    const a = form?.address;
    if (!a) return "";
    return [a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(", ");
  }, [form]);

  const updateAddress = (value: string) => {
    const parts = value.split(",").map((p) => p.trim());
    setForm((cur) => ({
      ...cur,
      address: {
        line1: parts[0] || "",
        line2: parts[1] || "",
        city: parts[2] || "",
        state: parts[3] || "",
        pincode: parts[4] || "",
      },
    }));
  };

  // API 2: PUT /api/vendor/org/profile
  const handleSave = async () => {
    if (!form) return;
    try {
      setSaving(true);
      setError("");
      const res = await updateVendorProfile(form);
      setProfile(res.data);
      setForm(res.data);
      setEditMode(false);
      setMessage("Profile updated successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(profile);
    setEditMode(false);
    setError("");
  };

  const set = (key: keyof VendorProfile) => (value: string) =>
    setForm((cur) => ({ ...cur, [key]: value }));

  const setBank = (key: string) => (value: string) =>
    setForm((cur) => ({ ...cur, bankDetails: { ...cur?.bankDetails, [key]: value } }));

  if (loading) return <LoadingState message="Loading organization profile" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg"
            style={{ backgroundColor: COLORS.primary }}>
            {(profile?.businessName || "V").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-black text-gray-900">{profile?.businessName || "Your Business"}</p>
            <p className="text-xs text-gray-500">{profile?.contactEmail || "No email set"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadProfile()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>

          {editMode ? (
            <>
              <button onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                <X size={14} /> Cancel
              </button>
              <button onClick={() => void handleSave()} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
                style={{ backgroundColor: COLORS.primary }}>
                <Save size={14} />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <button onClick={() => setEditMode(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition"
              style={{ backgroundColor: COLORS.primary }}>
              <Edit2 size={14} /> Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Edit mode banner */}
      {editMode && (
        <div className="p-3 rounded-xl border flex items-center gap-2"
          style={{ backgroundColor: COLORS.infoBg, borderColor: COLORS.infoBorder }}>
          <Edit2 size={14} style={{ color: COLORS.info }} />
          <p className="text-xs font-bold" style={{ color: COLORS.info }}>
            Edit mode active — make your changes and click Save Changes
          </p>
        </div>
      )}

      {/* Error / Success */}
      {error && (
        <div className="p-3 rounded-xl border flex items-center gap-2"
          style={{ backgroundColor: COLORS.errorBg, borderColor: COLORS.errorBorder }}>
          <AlertTriangle size={14} style={{ color: COLORS.error }} />
          <p className="text-sm font-semibold" style={{ color: COLORS.error }}>{error}</p>
        </div>
      )}
      {message && (
        <div className="p-3 rounded-xl border flex items-center gap-2"
          style={{ backgroundColor: COLORS.successBg, borderColor: COLORS.successBorder }}>
          <CheckCircle size={14} style={{ color: COLORS.success }} />
          <p className="text-sm font-semibold" style={{ color: COLORS.success }}>{message}</p>
        </div>
      )}

      {/* Account Status Row */}
      <div className="grid grid-cols-3 gap-4">
        <StatusBadge label="Approval Status" active={!!profile?.isApproved} activeLabel="Approved" inactiveLabel="Pending Approval" />
        <StatusBadge label="Account Status" active={!profile?.isSuspended} activeLabel="Active" inactiveLabel="Suspended" />
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Priority Score</p>
          <div className="flex items-center gap-2">
            <Star size={16} className="text-yellow-500" />
            <p className="text-sm font-bold text-gray-900">{profile?.priority ?? 0} / 10</p>
          </div>
        </div>
      </div>

      {/* Business Details — API 2 fields */}
      <Section title="Business Details" icon={Building2}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Business Name" value={form?.businessName || ""} onChange={set("businessName")} disabled={!editMode} icon={Building2} placeholder="Your business name" />
          <Field label="Business Type" value={form?.businessType || ""} onChange={set("businessType")} disabled={!editMode} placeholder="e.g. Printing, Gifting" />
          <Field label="Contact Name" value={form?.contactName || ""} onChange={set("contactName")} disabled={!editMode} icon={User} placeholder="Primary contact person" />
          <Field label="Website" value={form?.website || ""} onChange={set("website")} disabled={!editMode} icon={Globe} placeholder="https://yourwebsite.com" />
          <Field label="Contact Email" value={form?.contactEmail || ""} onChange={set("contactEmail")} disabled={!editMode} icon={Mail} type="email" placeholder="contact@business.com" />
          <Field label="Contact Phone" value={form?.contactPhone || ""} onChange={set("contactPhone")} disabled={!editMode} icon={Phone} placeholder="+91 XXXXX XXXXX" />
          <div className="md:col-span-2">
            <Field
              label="Full Address (line1, line2, city, state, pincode)"
              value={addressLine}
              onChange={updateAddress}
              disabled={!editMode}
              icon={MapPin}
              placeholder="Street, Area, City, State, Pincode"
            />
            {editMode && (
              <p className="text-xs text-gray-400 mt-1">Enter comma-separated: Line1, Line2, City, State, Pincode</p>
            )}
          </div>
        </div>
      </Section>

      {/* Compliance & Banking — API 2 fields */}
      <Section title="Compliance & Banking" icon={CreditCard}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Field label="GST Number" value={form?.gstNumber || ""} onChange={set("gstNumber")} disabled={!editMode} icon={Shield} placeholder="22AAAAA0000A1Z5" />
          </div>
          <div>
            <Field label="PAN Number" value={form?.panNumber || ""} onChange={set("panNumber")} disabled={!editMode} icon={Shield} placeholder="AAAAA0000A" />
          </div>

          <div className="md:col-span-2">
            <div className="h-px bg-gray-100 my-2" />
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Bank Account Details</p>
          </div>

          <Field label="Account Holder Name" value={form?.bankDetails?.accountName || ""} onChange={setBank("accountName")} disabled={!editMode} placeholder="Name as per bank records" />
          <Field label="Account Number" value={form?.bankDetails?.accountNumber || ""} onChange={setBank("accountNumber")} disabled={!editMode} placeholder="XXXX XXXX XXXX" />
          <Field label="IFSC Code" value={form?.bankDetails?.ifscCode || ""} onChange={setBank("ifscCode")} disabled={!editMode} placeholder="SBIN0001234" />
          <Field label="Bank Name" value={form?.bankDetails?.bankName || ""} onChange={setBank("bankName")} disabled={!editMode} placeholder="State Bank of India" />
        </div>

        {!editMode && profile?.bankDetails?.accountNumber && (
          <div className="mt-4 p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center gap-2">
            <CheckCircle size={14} style={{ color: COLORS.success }} />
            <p className="text-xs font-semibold text-gray-600">Bank account linked — payouts will be processed to this account</p>
          </div>
        )}
      </Section>

      {/* Save button at bottom when in edit mode */}
      {editMode && (
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={handleCancel}
            className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button onClick={() => void handleSave()} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
            style={{ backgroundColor: COLORS.primary }}>
            <Save size={14} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
