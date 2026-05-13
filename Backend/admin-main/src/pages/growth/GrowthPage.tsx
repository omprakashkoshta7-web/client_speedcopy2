import { useState, useEffect } from "react";
import {
  TrendingUp, Gift, Plus, Download, RefreshCw, Edit2, Trash2,
  ToggleLeft, ToggleRight, X, AlertTriangle, CheckCircle,
  Search, BarChart2
} from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import {
  getCoupons, createCoupon, updateCoupon, deleteCoupon,
  getCouponUsage
} from "../../api/admin";

const CS = { border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(15,23,42,0.06)" };

const FLOW_OPTIONS = [
  { value: "shopping", label: "Shopping" },
  { value: "gifting", label: "Gifting" },
  { value: "printing", label: "Printing" },
];

const emptyForm = {
  code: "",
  discountType: "percentage" as "percentage" | "fixed",
  discountValue: "",
  maxDiscount: "",
  usageLimit: "",
  perUserLimit: "",
  minOrderValue: "",
  applicableFlows: [] as string[],
  description: "",
  expiresAt: "",
  isActive: true,
};

export default function GrowthPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [usageModalId, setUsageModalId] = useState<string | null>(null);
  const [usageData, setUsageData] = useState<any>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  const { data: couponsData, loading: couponsLoading, refetch: refetchCoupons } =
    useAsync(() => getCoupons({ limit: 100 }), {}, []);

  const backendCoupons: any[] = (couponsData as any)?.coupons ?? [];

  const coupons = backendCoupons.map((c: any) => {
    const used = c.usedCount ?? 0;
    const limit = c.usageLimit ?? 0;
    const limitReached = limit > 0 && used >= limit;
    const effectiveActive = c.isActive && !limitReached;
    const remaining = limit > 0 ? Math.max(0, limit - used) : null;
    const usagePct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
    return { ...c, effectiveActive, limitReached, remaining, usagePct };
  });

  const totalCoupons = coupons.length;
  const activeCouponsCount = coupons.filter((c: any) => c.effectiveActive).length;
  const totalUsed = coupons.reduce((sum: number, c: any) => sum + (c.usedCount || 0), 0);
  const limitReachedCount = coupons.filter((c: any) => c.limitReached).length;
  const hasNearLimit = coupons.some((c: any) => c.usagePct >= 80);

  useEffect(() => {
    const ms = hasNearLimit ? 15000 : 30000;
    const interval = setInterval(() => { refetchCoupons(); }, ms);
    return () => clearInterval(interval);
  }, [hasNearLimit, refetchCoupons]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (c: any) => {
    setEditingId(c._id || c.id);
    setForm({
      code: c.code || "",
      discountType: c.discountType || "percentage",
      discountValue: String(c.discountValue || ""),
      maxDiscount: String(c.maxDiscount || ""),
      usageLimit: String(c.usageLimit || ""),
      perUserLimit: String(c.perUserLimit || ""),
      minOrderValue: String(c.minOrderValue || ""),
      applicableFlows: Array.isArray(c.applicableFlows) ? c.applicableFlows : [],
      description: c.description || "",
      expiresAt: c.expiresAt ? c.expiresAt.split("T")[0] : "",
      isActive: c.isActive ?? true,
    });
    setFormError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  };

  const handleSave = async () => {
    if (!form.code.trim()) { setFormError("Coupon code is required."); return; }
    if (!form.discountValue || isNaN(Number(form.discountValue)) || Number(form.discountValue) <= 0) {
      setFormError("Enter a valid discount value."); return;
    }
    if (form.discountType === "percentage" && Number(form.discountValue) > 100) {
      setFormError("Percentage discount cannot exceed 100."); return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload: any = {
        code: form.code.toUpperCase().trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        isActive: form.isActive,
      };
      if (form.maxDiscount) payload.maxDiscount = Number(form.maxDiscount);
      if (form.usageLimit) payload.usageLimit = Number(form.usageLimit);
      if (form.perUserLimit) payload.perUserLimit = Number(form.perUserLimit);
      if (form.minOrderValue) payload.minOrderValue = Number(form.minOrderValue);
      if (form.applicableFlows.length > 0) payload.applicableFlows = form.applicableFlows;
      if (form.description) payload.description = form.description;
      if (form.expiresAt) payload.expiresAt = new Date(form.expiresAt).toISOString();

      if (editingId) {
        await updateCoupon(editingId, payload);
        showToast("Coupon updated successfully.");
      } else {
        await createCoupon(payload);
        showToast("Coupon created successfully.");
      }
      closeModal();
      refetchCoupons();
    } catch (err: any) {
      setFormError(err?.message || "Failed to save coupon.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c: any) => {
    try {
      await updateCoupon(c._id || c.id, { isActive: !c.isActive });
      showToast(`Coupon ${!c.isActive ? "activated" : "deactivated"}.`);
      refetchCoupons();
    } catch (err: any) {
      showToast(err?.message || "Failed to update coupon.", "error");
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await deleteCoupon(id);
      showToast("Coupon deleted.");
      setDeleteConfirmId(null);
      refetchCoupons();
    } catch (err: any) {
      showToast(err?.message || "Failed to delete coupon.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const openUsage = async (c: any) => {
    setUsageModalId(c._id || c.id);
    setUsageData(null);
    setUsageLoading(true);
    try {
      const res: any = await getCouponUsage(c._id || c.id);
      setUsageData(res);
    } catch {
      setUsageData(null);
    } finally {
      setUsageLoading(false);
    }
  };

  const filteredCoupons = coupons.filter((c: any) => {
    const matchSearch = !search ||
      c.code?.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase());
    const matchActive =
      filterActive === "all" ||
      (filterActive === "active" ? c.effectiveActive : !c.effectiveActive);
    return matchSearch && matchActive;
  });

  const exportCoupons = () => {
    const rows = [
      ["Code","Type","Value","Max Discount","Min Order","Usage Limit","Used","Per User","Flows","Expiry","Status"],
      ...coupons.map((c: any) => [
        c.code || "",
        c.discountType || "",
        c.discountValue || 0,
        c.maxDiscount || "",
        c.minOrderValue || 0,
        c.usageLimit || "∞",
        c.usedCount || 0,
        c.perUserLimit || "∞",
        (c.applicableFlows || []).join("|") || "all",
        c.expiresAt ? c.expiresAt.split("T")[0] : "never",
        c.effectiveActive ? "Active" : c.limitReached ? "Limit Reached" : "Inactive",
      ]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coupons-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">

      {/* Toast */}
      {toastMsg && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${toastType === "success" ? "bg-emerald-600" : "bg-red-500"}`}>
          {toastType === "success" ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          {toastMsg}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Coupons",  value: totalCoupons.toString(),       change: "All",      icon: TrendingUp, color: "#334155", bg: "#f1f5f9", dark: true  },
          { label: "Active Coupons", value: activeCouponsCount.toString(),  change: "Running",  icon: Gift,       color: "#10b981", bg: "#f0fdf4", dark: false },
          { label: "Total Used",     value: totalUsed.toString(),           change: "Redeemed", icon: TrendingUp, color: "#6366f1", bg: "#eef2ff", dark: false },
          { label: "Limit Reached",  value: limitReachedCount.toString(),   change: "Auto-Off", icon: Gift,       color: "#ef4444", bg: "#fef2f2", dark: false },
        ].map((card) => (
          <div key={card.label} className="rounded-xl p-3.5"
            style={card.dark
              ? { background: "linear-gradient(135deg,#1e293b,#0f172a)", boxShadow: "0 12px 28px rgba(15,23,42,0.3)", position: "relative", overflow: "hidden" }
              : { border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(15,23,42,0.06)", backgroundColor: "#fff" }}>
            {card.dark && <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px,rgba(255,255,255,0.4) 1px,transparent 0)", backgroundSize: "14px 14px" }} />}
            <div className="relative flex items-start justify-between mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: card.dark ? "rgba(255,255,255,0.15)" : card.bg }}>
                <card.icon size={15} style={{ color: card.dark ? "#fff" : card.color }} />
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: card.dark ? "rgba(255,255,255,0.15)" : card.bg, color: card.dark ? "#fff" : card.color }}>
                {card.change}
              </span>
            </div>
            <p className={`relative text-xl font-black ${card.dark ? "text-white" : "text-gray-900"}`}>{card.value}</p>
            <p className={`relative text-xs mt-0.5 ${card.dark ? "text-white/60" : "text-gray-400"}`}>{card.label}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl overflow-hidden" style={CS}>

        {/* Toolbar */}
        <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-2"
          style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: "#fafbfc" }}>
          <p className="text-sm font-bold text-gray-900">Coupon Management</p>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search code..."
                className="pl-7 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none w-36" />
            </div>
            <div className="flex rounded-xl overflow-hidden border border-gray-200">
              {(["all", "active", "inactive"] as const).map(f => (
                <button key={f} onClick={() => setFilterActive(f)}
                  className="px-2.5 py-1.5 text-xs font-semibold capitalize transition"
                  style={{ backgroundColor: filterActive === f ? "#334155" : "#fff", color: filterActive === f ? "#fff" : "#64748b" }}>
                  {f}
                </button>
              ))}
            </div>
            <button onClick={exportCoupons} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 hover:border-gray-900 transition text-xs font-semibold">
              <Download size={12} /> Export
            </button>
            <button onClick={() => refetchCoupons()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 hover:border-gray-900 transition text-xs font-semibold">
              <RefreshCw size={12} className={couponsLoading ? "animate-spin" : ""} />
              {couponsLoading ? "Refreshing..." : "Refresh"}
            </button>
            <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-bold rounded-lg" style={{ backgroundColor: "#334155" }}>
              <Plus size={12} /> New Coupon
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                {["Code", "Discount", "Max Discount", "Flows", "Usage", "Per User", "Expiry", "Status", ""].map(h => (
                  <th key={h} className="text-left text-xs font-bold text-gray-400 uppercase tracking-wide px-4 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCoupons.length > 0 ? filteredCoupons.map((c: any, i: number) => {
                const barColor = c.usagePct >= 100 ? "#ef4444" : c.usagePct >= 80 ? "#f59e0b" : "#10b981";
                const flows: string[] = Array.isArray(c.applicableFlows) ? c.applicableFlows : [];
                return (
                  <tr key={c._id || c.code} className="hover:bg-gray-50 transition"
                    style={{ borderBottom: i < filteredCoupons.length - 1 ? "1px solid #f8fafc" : "none" }}>
                    <td className="px-4 py-2.5">
                      <p className="text-sm font-black text-gray-900 font-mono">{c.code}</p>
                      {c.description && <p className="text-[10px] text-gray-400 mt-0.5 max-w-[120px] truncate">{c.description}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-sm font-bold text-gray-900">
                      {c.discountValue}{c.discountType === "percentage" ? "%" : "₹"} off
                      {c.minOrderValue > 0 && <span className="block text-[10px] text-gray-400 font-normal">min ₹{c.minOrderValue}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {c.maxDiscount ? `₹${c.maxDiscount}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {flows.length > 0
                        ? <div className="flex flex-wrap gap-1">
                            {flows.map(f => (
                              <span key={f} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 capitalize">{f}</span>
                            ))}
                          </div>
                        : <span className="text-[10px] text-gray-300">All</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 rounded-full bg-gray-100 w-16 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${c.usagePct}%`, backgroundColor: barColor }} />
                        </div>
                        <span className="text-xs text-gray-500">{c.usedCount ?? 0}/{c.usageLimit || "∞"}</span>
                      </div>
                      {c.remaining !== null && c.remaining <= 10 && (
                        <span className="text-[10px] font-semibold" style={{ color: barColor }}>
                          {c.remaining === 0 ? "Limit reached" : `${c.remaining} left`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {c.perUserLimit ? `${c.perUserLimit}x` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {c.expiresAt
                        ? <span className={new Date(c.expiresAt) < new Date() ? "text-red-500 font-semibold" : "text-gray-500"}>
                            {new Date(c.expiresAt).toLocaleDateString()}
                          </span>
                        : <span className="text-gray-300">Never</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {c.limitReached
                        ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500">Limit Reached</span>
                        : <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: c.effectiveActive ? "#f0fdf4" : "#f1f5f9", color: c.effectiveActive ? "#10b981" : "#94a3b8" }}>
                            {c.effectiveActive ? "Active" : "Inactive"}
                          </span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleToggleActive(c)} className="p-1.5 rounded-lg hover:bg-gray-100 transition" title={c.isActive ? "Deactivate" : "Activate"}>
                          {c.isActive ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} className="text-gray-400" />}
                        </button>
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-blue-50 transition" title="Edit">
                          <Edit2 size={14} className="text-blue-500" />
                        </button>
                        <button onClick={() => openUsage(c)} className="p-1.5 rounded-lg hover:bg-indigo-50 transition" title="Usage stats">
                          <BarChart2 size={14} className="text-indigo-400" />
                        </button>
                        <button onClick={() => setDeleteConfirmId(c._id || c.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition" title="Delete">
                          <Trash2 size={14} className="text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-400">
                    {couponsLoading ? "Loading..." : search ? "No coupons match your search." : "No coupons yet. Click \"+ New Coupon\" to create one."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create / Edit Modal ─────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? "Edit Coupon" : "New Coupon"}</h2>
              <button onClick={closeModal}><X size={18} className="text-gray-400" /></button>
            </div>

            <div className="space-y-4">
              {/* Code */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Coupon Code *</label>
                <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SAVE20"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono font-bold focus:outline-none focus:border-gray-900 transition" />
              </div>

              {/* Type + Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Discount Type *</label>
                  <select value={form.discountType} onChange={e => setForm(p => ({ ...p, discountType: e.target.value as "percentage" | "fixed" }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                    Value * {form.discountType === "percentage" ? "(%)" : "(₹)"}
                  </label>
                  <input type="number" min="0" value={form.discountValue}
                    onChange={e => setForm(p => ({ ...p, discountValue: e.target.value }))}
                    placeholder={form.discountType === "percentage" ? "20" : "100"}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
                </div>
              </div>

              {/* Max Discount + Min Order */}
              <div className="grid grid-cols-2 gap-3">
                {form.discountType === "percentage" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Max Discount (₹)</label>
                    <input type="number" min="0" value={form.maxDiscount}
                      onChange={e => setForm(p => ({ ...p, maxDiscount: e.target.value }))}
                      placeholder="e.g. 200 cap"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Min Order Value (₹)</label>
                  <input type="number" min="0" value={form.minOrderValue}
                    onChange={e => setForm(p => ({ ...p, minOrderValue: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
                </div>
              </div>

              {/* Usage Limit + Per User */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Total Uses Limit</label>
                  <input type="number" min="0" value={form.usageLimit}
                    onChange={e => setForm(p => ({ ...p, usageLimit: e.target.value }))}
                    placeholder="Unlimited"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Per User Limit</label>
                  <input type="number" min="0" value={form.perUserLimit}
                    onChange={e => setForm(p => ({ ...p, perUserLimit: e.target.value }))}
                    placeholder="Unlimited"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
                </div>
              </div>

              {/* Applicable Flows */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Applicable Flows <span className="font-normal text-gray-400">(empty = all)</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {FLOW_OPTIONS.map(f => {
                    const checked = form.applicableFlows.includes(f.value);
                    return (
                      <button key={f.value} type="button"
                        onClick={() => setForm(p => ({
                          ...p,
                          applicableFlows: checked
                            ? p.applicableFlows.filter(x => x !== f.value)
                            : [...p.applicableFlows, f.value],
                        }))}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition"
                        style={{
                          backgroundColor: checked ? "#334155" : "#fff",
                          color: checked ? "#fff" : "#64748b",
                          borderColor: checked ? "#334155" : "#e2e8f0",
                        }}>
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expiry + Description */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Expiry Date</label>
                  <input type="date" value={form.expiresAt}
                    onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
                  <input value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Optional note"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
                <span className="text-sm font-semibold text-gray-700">Active</span>
                <button onClick={() => setForm(p => ({ ...p, isActive: !p.isActive }))}>
                  {form.isActive
                    ? <ToggleRight size={26} className="text-emerald-500" />
                    : <ToggleLeft size={26} className="text-gray-400" />}
                </button>
              </div>
            </div>

            {formError && (
              <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                <p className="text-xs font-semibold text-red-600">{formError}</p>
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl transition disabled:opacity-50"
                style={{ backgroundColor: "#334155" }}>
                {saving ? "Saving..." : editingId ? "Update Coupon" : "Create Coupon"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Usage Stats Modal ────────────────────────────────────────────── */}
      {usageModalId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 size={16} className="text-indigo-500" />
                <h2 className="font-bold text-gray-900">Usage Stats</h2>
              </div>
              <button onClick={() => { setUsageModalId(null); setUsageData(null); }}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            {usageLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw size={18} className="animate-spin text-gray-400" />
              </div>
            ) : usageData ? (
              <div className="space-y-2">
                {[
                  { label: "Total Uses",           value: usageData.totalUses ?? usageData.usedCount ?? 0 },
                  { label: "Unique Users",          value: usageData.uniqueUsers ?? "—" },
                  { label: "Total Discount Given",  value: usageData.totalDiscountGiven != null ? `₹${usageData.totalDiscountGiven}` : "—" },
                  { label: "Usage Limit",           value: usageData.usageLimit ?? "Unlimited" },
                  { label: "Remaining",             value: usageData.remaining ?? "—" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-500">{row.label}</span>
                    <span className="text-sm font-bold text-gray-900">{String(row.value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">No usage data available.</p>
            )}
            <button onClick={() => { setUsageModalId(null); setUsageData(null); }}
              className="w-full mt-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ───────────────────────────────────────────────── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-red-50"><Trash2 size={20} className="text-red-500" /></div>
              <div>
                <h2 className="font-bold text-gray-900">Delete Coupon</h2>
                <p className="text-xs text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Delete coupon{" "}
              <span className="font-bold font-mono">
                {coupons.find((c: any) => (c._id || c.id) === deleteConfirmId)?.code}
              </span>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirmId)} disabled={deleting}
                className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl bg-red-500 hover:bg-red-600 transition disabled:opacity-50">
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
