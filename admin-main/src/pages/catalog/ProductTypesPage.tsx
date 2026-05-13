import { useState } from "react";
import { Plus, Edit2, Trash2, X, CheckCircle, Layers, RefreshCw, AlertTriangle, ToggleLeft, ToggleRight } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getProductTypes, createProductType, updateProductType, deleteProductType } from "../../api/admin";

const CS = { border: "1px solid rgba(197,206,255,0.52)", boxShadow: "0 12px 30px rgba(15,23,42,0.08)" };

type PTForm = { name: string; slug: string; description: string; icon: string; isActive: boolean };
const emptyForm: PTForm = { name: "", slug: "", description: "", icon: "🎁", isActive: true };

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}

export default function ProductTypesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PTForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "success" as "success" | "error" });

  const { data, loading, refetch } = useAsync(() => getProductTypes({ limit: 100 }), {}, []);

  const rows: any[] = Array.isArray((data as any)?.productTypes)
    ? (data as any).productTypes
    : Array.isArray(data)
    ? (data as any[])
    : [];

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(t => ({ ...t, msg: "" })), 3000);
  };

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setFormError("");
    setSaved(false);
    setShowForm(true);
  };

  const openEdit = (pt: any) => {
    setEditId(pt._id || pt.id);
    setForm({
      name: pt.name || "",
      slug: pt.slug || "",
      description: pt.description || "",
      icon: pt.icon || "🎁",
      isActive: pt.isActive !== false,
    });
    setFormError("");
    setSaved(false);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError("Name is required."); return; }
    if (!form.slug.trim()) { setFormError("Slug is required."); return; }
    setSaving(true);
    setFormError("");
    try {
      if (editId) {
        await updateProductType(editId, { name: form.name, slug: form.slug, description: form.description, icon: form.icon, isActive: form.isActive });
        showToast("Product type updated.");
      } else {
        await createProductType({ name: form.name, slug: form.slug, description: form.description, icon: form.icon, isActive: form.isActive });
        showToast("Product type created.");
      }
      setSaved(true);
      setTimeout(() => { setShowForm(false); setSaved(false); refetch(); }, 1000);
    } catch (err: any) {
      setFormError(err?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await deleteProductType(id);
      showToast("Product type deleted.");
      setDeleteId(null);
      refetch();
    } catch (err: any) {
      showToast(err?.message || "Failed to delete.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggle = async (pt: any) => {
    try {
      await updateProductType(pt._id || pt.id, { isActive: !pt.isActive });
      showToast(`${pt.name} ${!pt.isActive ? "activated" : "deactivated"}.`);
      refetch();
    } catch (err: any) {
      showToast(err?.message || "Failed to update.", "error");
    }
  };

  return (
    <div className="space-y-5">
      {toast.msg && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${toast.type === "success" ? "bg-emerald-600" : "bg-red-500"}`}>
          {toast.type === "success" ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-4">
        {[
          { label: "Total Types", value: rows.length, dark: true },
          { label: "Active", value: rows.filter(r => r.isActive !== false).length, color: "#10b981" },
          { label: "Inactive", value: rows.filter(r => r.isActive === false).length, color: "#94a3b8" },
        ].map((s, i) => (
          <div key={s.label} className="rounded-xl p-5 flex-1"
            style={i === 0
              ? { background: "linear-gradient(135deg,#1e293b,#0f172a)", boxShadow: "0 12px 28px rgba(15,23,42,0.3)", position: "relative", overflow: "hidden" }
              : { ...CS, backgroundColor: "#fff" }}>
            {i === 0 && <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px,rgba(255,255,255,0.4) 1px,transparent 0)", backgroundSize: "14px 14px" }} />}
            <p className={`relative text-2xl font-black ${i === 0 ? "text-white" : ""}`} style={i !== 0 ? { color: s.color } : {}}>{s.value}</p>
            <p className={`relative text-xs font-semibold mt-1 ${i === 0 ? "text-white/70" : "text-gray-500"}`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl overflow-hidden" style={CS}>
        <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(197,206,255,0.3)", backgroundColor: "rgba(248,249,255,0.78)" }}>
          <p className="text-sm font-bold text-gray-900">Product Types</p>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold hover:border-gray-900 transition">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-bold rounded-xl" style={{ backgroundColor: "#334155" }}>
              <Plus size={12} /> New Type
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(197,206,255,0.3)", backgroundColor: "rgba(248,249,255,0.5)" }}>
                {["Icon", "Name", "Slug", "Description", "Status", ""].map((h, idx) => (
                  <th key={h} className={`text-xs font-bold text-gray-400 uppercase tracking-wide px-4 py-3 ${idx === 5 ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? rows.map((pt: any, i: number) => (
                <tr key={pt._id || pt.id} className="hover:bg-gray-50 transition" style={{ borderBottom: i < rows.length - 1 ? "1px solid rgba(197,206,255,0.2)" : "none" }}>
                  <td className="px-4 py-3 text-xl text-center">{pt.icon || "🎁"}</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">{pt.name}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{pt.slug}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate">{pt.description || "—"}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggle(pt)} className="flex items-center gap-1.5 text-xs font-semibold">
                      {pt.isActive !== false
                        ? <><ToggleRight size={18} className="text-emerald-500" /><span className="text-emerald-600">Active</span></>
                        : <><ToggleLeft size={18} className="text-gray-400" /><span className="text-gray-400">Inactive</span></>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(pt)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition"><Edit2 size={13} /></button>
                      <button onClick={() => setDeleteId(pt._id || pt.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="px-4 py-16 text-center text-sm text-gray-400">
                  {loading ? "Loading..." : 'No product types yet. Click "+ New Type" to create one.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-indigo-500" />
                <h2 className="text-base font-bold text-gray-900">{editId ? "Edit Product Type" : "New Product Type"}</h2>
              </div>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400" /></button>
            </div>

            {saved ? (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-green-50 border border-green-100">
                <CheckCircle size={16} className="text-green-600" />
                <p className="text-sm font-bold text-green-800">Saved successfully.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-[64px_1fr] gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Icon</label>
                    <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                      className="w-full px-2 py-2.5 rounded-xl border border-gray-200 text-xl text-center focus:outline-none focus:border-gray-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Name *</label>
                    <input value={form.name} placeholder="e.g. Gifting"
                      onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: editId ? f.slug : slugify(e.target.value) }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Slug *</label>
                  <input value={form.slug} placeholder="e.g. gifting"
                    onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:border-gray-900 transition" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
                  <textarea value={form.description} placeholder="Optional description"
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition resize-none" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
                  <span className="text-sm font-semibold text-gray-700">Active</span>
                  <button onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}>
                    {form.isActive ? <ToggleRight size={26} className="text-emerald-500" /> : <ToggleLeft size={26} className="text-gray-400" />}
                  </button>
                </div>

                {formError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                    <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                    <p className="text-xs font-semibold text-red-600">{formError}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl transition disabled:opacity-50" style={{ backgroundColor: "#334155" }}>
                    {saving ? "Saving..." : editId ? "Update" : "Create"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-red-50"><Trash2 size={20} className="text-red-500" /></div>
              <div>
                <h2 className="font-bold text-gray-900">Delete Product Type</h2>
                <p className="text-xs text-gray-500">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">All variants and templates linked to this type may be affected.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} disabled={deleting} className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl bg-red-500 hover:bg-red-600 transition disabled:opacity-50">
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
