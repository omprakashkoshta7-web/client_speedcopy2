import { useEffect, useMemo, useState } from "react";
import {
  Plus, UserCheck, UserX, X, Users, CheckCircle,
  Shield, User, Search, RefreshCw, Edit2, Store,
  Mail, Phone, AlertTriangle, Lock
} from "lucide-react";
import LoadingState from "../../components/ui/LoadingState";
import { COLORS } from "../../utils/colors";
import {
  createVendorStaff,
  getVendorStaff,
  getVendorStores,
  updateVendorStaff,
  updateVendorStaffStatus,
  assignStaffStores,
} from "../../services/vendor.service";
import type { VendorStaff, VendorStore } from "../../types/vendor";
import VendorMetricCard from "../../components/ui/VendorMetricCard";

type StaffRole = "manager" | "operator" | "qc";

type FormState = {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: StaffRole;
  storeId: string;
};

const INITIAL_FORM: FormState = { name: "", email: "", password: "", phone: "", role: "operator", storeId: "" };

const ROLE_COLORS: Record<StaffRole, { color: string; bg: string; border: string }> = {
  manager: { color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
  operator: { color: COLORS.info, bg: COLORS.infoBg, border: COLORS.infoBorder },
  qc: { color: COLORS.warning, bg: COLORS.warningBg, border: COLORS.warningBorder },
};

export default function StaffListPage() {
  const [staff, setStaff] = useState<VendorStaff[]>([]);
  const [stores, setStores] = useState<VendorStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | StaffRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [assigningMember, setAssigningMember] = useState<VendorStaff | null>(null);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // API 1: GET /api/vendor/staff
  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [staffRes, storeRes] = await Promise.all([getVendorStaff(), getVendorStores()]);
      setStaff(staffRes.data);
      setStores(storeRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const stats = useMemo(() => ({
    total: staff.length,
    active: staff.filter(m => m.isActive).length,
    managers: staff.filter(m => m.role === "manager").length,
    operators: staff.filter(m => m.role === "operator").length,
  }), [staff]);

  const filteredStaff = useMemo(() => {
    return staff.filter(m => {
      const matchSearch = !search ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.email || "").toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "all" || m.role === roleFilter;
      const matchStatus = statusFilter === "all" ||
        (statusFilter === "active" ? m.isActive : !m.isActive);
      return matchSearch && matchRole && matchStatus;
    });
  }, [staff, search, roleFilter, statusFilter]);

  const getStoreName = (storeId?: string) =>
    stores.find(s => s._id === storeId)?.name || "Unassigned";

  // Open create modal
  const openCreate = () => {
    setEditingId("");
    setForm(INITIAL_FORM);
    setFormError("");
    setShowFormModal(true);
  };

  // Open edit modal
  const openEdit = (member: VendorStaff) => {
    setEditingId(member._id);
    setForm({
      name: member.name,
      email: member.email || "",
      password: "",           // password not editable via PUT
      phone: member.phone || "",
      role: member.role,
      storeId: member.storeId || "",
    });
    setFormError("");
    setShowFormModal(true);
  };

  // Open assign stores modal
  const openAssign = (member: VendorStaff) => {
    setAssigningMember(member);
    setSelectedStoreIds(member.storeId ? [member.storeId] : []);
    setShowAssignModal(true);
  };

  // API 2: POST /api/vendor/staff
  // API 3: PUT /api/vendor/staff/:id
  const handleSubmit = async () => {
    if (!form.name.trim()) { setFormError("Name is required"); return; }
    if (!editingId && !form.email.trim()) { setFormError("Email is required"); return; }
    if (!editingId && !form.password.trim()) { setFormError("Password is required"); return; }
    setSaving(true);
    setFormError("");
    try {
      if (editingId) {
        const res = await updateVendorStaff(editingId, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          storeId: form.storeId || undefined,
        });
        setStaff(cur => cur.map(m => m._id === editingId ? res.data : m));
      } else {
        const res = await createVendorStaff({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
          role: form.role,
          storeId: form.storeId || undefined,
        });
        setStaff(cur => [res.data, ...cur]);
      }
      setShowFormModal(false);
      setForm(INITIAL_FORM);
      setEditingId("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save staff");
    } finally {
      setSaving(false);
    }
  };

  // API 4: PATCH /api/vendor/staff/:id/status
  const toggleStatus = async (member: VendorStaff) => {
    try {
      const res = await updateVendorStaffStatus(member._id, !member.isActive);
      setStaff(cur => cur.map(m => m._id === member._id ? res.data : m));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  // API 5: PATCH /api/vendor/staff/:id/assign-stores
  const handleAssignStores = async () => {
    if (!assigningMember) return;
    setSaving(true);
    try {
      const res = await assignStaffStores(assigningMember._id, selectedStoreIds);
      setStaff(cur => cur.map(m => m._id === assigningMember._id ? res.data : m));
      setShowAssignModal(false);
      setAssigningMember(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign stores");
    } finally {
      setSaving(false);
    }
  };

  const toggleStoreSelection = (storeId: string) => {
    setSelectedStoreIds(cur =>
      cur.includes(storeId) ? cur.filter(id => id !== storeId) : [...cur, storeId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your team members</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void loadData()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition"
            style={{ backgroundColor: COLORS.primary }}>
            <Plus size={16} /> Add Staff
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border px-4 py-3 text-sm flex items-center gap-2"
          style={{ backgroundColor: COLORS.errorBg, borderColor: COLORS.errorBorder, color: COLORS.error }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <VendorMetricCard index={0} label="Total Staff" value={String(stats.total)} accent={COLORS.primary} accentBg={`${COLORS.primary}18`} icon={Users} />
        <VendorMetricCard index={1} label="Active" value={String(stats.active)} accent={COLORS.success} accentBg={`${COLORS.success}18`} icon={CheckCircle} />
        <VendorMetricCard index={2} label="Managers" value={String(stats.managers)} accent="#8b5cf6" accentBg="#f5f3ff" icon={Shield} />
        <VendorMetricCard index={3} label="Operators" value={String(stats.operators)} accent={COLORS.info} accentBg={COLORS.infoBg} icon={User} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
        </div>

        <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
          {(["all", "manager", "operator", "qc"] as const).map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className="rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition"
              style={roleFilter === r ? { backgroundColor: COLORS.primary, color: "#fff" } : { color: "#6b7280" }}>
              {r}
            </button>
          ))}
        </div>

        <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
          {(["all", "active", "inactive"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition"
              style={statusFilter === s ? { backgroundColor: COLORS.primary, color: "#fff" } : { color: "#6b7280" }}>
              {s}
            </button>
          ))}
        </div>

        <span className="text-xs text-gray-500 font-semibold ml-auto">
          {filteredStaff.length} member{filteredStaff.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Staff Grid */}
      {loading ? <LoadingState message="Loading staff members" /> : (
        <div className="card-list-lg grid gap-4 lg:grid-cols-2 pr-1">
          {filteredStaff.map(member => {
            const rc = ROLE_COLORS[member.role] || ROLE_COLORS.operator;
            const storeName = getStoreName(member.storeId);
            return (
              <div key={member._id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm"
                      style={{ backgroundColor: rc.color }}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{member.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {member.email && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail size={11} /> {member.email}
                          </p>
                        )}
                        {member.phone && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone size={11} /> {member.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full border px-2.5 py-1 text-xs font-bold uppercase flex-shrink-0"
                    style={{
                      backgroundColor: member.isActive ? COLORS.successBg : COLORS.errorBg,
                      color: member.isActive ? COLORS.success : COLORS.error,
                      borderColor: member.isActive ? COLORS.successBorder : COLORS.errorBorder,
                    }}>
                    {member.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="rounded-full border px-2.5 py-1 text-xs font-semibold capitalize"
                    style={{ backgroundColor: rc.bg, color: rc.color, borderColor: rc.border }}>
                    {member.role}
                  </span>
                  <span className="rounded-full border px-2.5 py-1 text-xs font-semibold flex items-center gap-1"
                    style={{ backgroundColor: COLORS.gray50, color: COLORS.gray700, borderColor: COLORS.gray200 }}>
                    <Store size={11} /> {storeName}
                  </span>
                  {member.createdAt && (
                    <span className="rounded-full border px-2.5 py-1 text-xs text-gray-400"
                      style={{ borderColor: COLORS.gray200 }}>
                      Joined {new Date(member.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {/* API 3: edit */}
                  <button onClick={() => openEdit(member)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:border-gray-900 transition">
                    <Edit2 size={13} /> Edit
                  </button>
                  {/* API 5: assign stores */}
                  <button onClick={() => openAssign(member)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition"
                    style={{ backgroundColor: COLORS.infoBg, color: COLORS.info, borderColor: COLORS.infoBorder }}>
                    <Store size={13} /> Assign Stores
                  </button>
                  {/* API 4: toggle status */}
                  <button onClick={() => void toggleStatus(member)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-white transition"
                    style={{ backgroundColor: member.isActive ? COLORS.warning : COLORS.success }}>
                    {member.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                    {member.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            );
          })}

          {!filteredStaff.length && !loading && (
            <div className="col-span-2 rounded-2xl border border-gray-100 bg-white p-12 text-center">
              <Users size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-semibold">
                {staff.length === 0 ? "No staff members yet. Add your first staff member." : "No staff match your filters."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal — API 2 + API 3 */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl my-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">{editingId ? "Edit Staff Member" : "Add Staff Member"}</h3>
              <button onClick={() => setShowFormModal(false)}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl border text-sm flex items-center gap-2"
                style={{ backgroundColor: COLORS.errorBg, borderColor: COLORS.errorBorder, color: COLORS.error }}>
                <AlertTriangle size={13} /> {formError}
              </div>
            )}

            <div className="space-y-4 mb-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Full Name *</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={form.name} onChange={e => setForm(c => ({ ...c, name: e.target.value }))}
                    placeholder="Enter full name"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Email {!editingId && "*"}</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" value={form.email} onChange={e => setForm(c => ({ ...c, email: e.target.value }))}
                    placeholder="staff@business.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
                </div>
              </div>

              {/* Password — only for create */}
              {!editingId && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Password *</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="password" value={form.password} onChange={e => setForm(c => ({ ...c, password: e.target.value }))}
                      placeholder="Set login password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
                  </div>
                </div>
              )}

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Phone</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={form.phone} onChange={e => setForm(c => ({ ...c, phone: e.target.value }))}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Role</label>
                <div className="flex gap-2">
                  {(["manager", "operator", "qc"] as StaffRole[]).map(r => {
                    const rc = ROLE_COLORS[r];
                    const active = form.role === r;
                    return (
                      <button key={r} type="button" onClick={() => setForm(c => ({ ...c, role: r }))}
                        className="flex-1 py-2.5 rounded-xl border text-sm font-bold capitalize transition"
                        style={{
                          backgroundColor: active ? rc.bg : "white",
                          color: active ? rc.color : "#6b7280",
                          borderColor: active ? rc.border : "#e5e7eb",
                        }}>
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Store Assignment */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Assign to Store</label>
                <div className="relative">
                  <Store size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select value={form.storeId} onChange={e => setForm(c => ({ ...c, storeId: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition appearance-none">
                    <option value="">Unassigned</option>
                    {stores.map(s => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowFormModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={() => void handleSubmit()} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
                style={{ backgroundColor: COLORS.primary }}>
                {saving ? "Saving..." : editingId ? "Update Staff" : "Add Staff"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Stores Modal — API 5 */}
      {showAssignModal && assigningMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl my-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-gray-900">Assign Stores</h3>
              <button onClick={() => setShowAssignModal(false)}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Select stores for <span className="font-bold text-gray-900">{assigningMember.name}</span>
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto mb-5">
              {stores.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No stores available</p>
              ) : stores.map(store => {
                const selected = selectedStoreIds.includes(store._id);
                const isOnline = store.isActive && store.isAvailable;
                return (
                  <label key={store._id}
                    className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition"
                    style={{
                      backgroundColor: selected ? COLORS.infoBg : "white",
                      borderColor: selected ? COLORS.infoBorder : "#e5e7eb",
                    }}>
                    <input type="checkbox" checked={selected} onChange={() => toggleStoreSelection(store._id)}
                      className="rounded" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{store.name}</p>
                      <p className="text-xs text-gray-500">{store.address?.city}</p>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: isOnline ? COLORS.successBg : COLORS.errorBg,
                        color: isOnline ? COLORS.success : COLORS.error,
                      }}>
                      {isOnline ? "Online" : "Offline"}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowAssignModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={() => void handleAssignStores()} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
                style={{ backgroundColor: COLORS.primary }}>
                {saving ? "Assigning..." : `Assign ${selectedStoreIds.length} Store${selectedStoreIds.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
