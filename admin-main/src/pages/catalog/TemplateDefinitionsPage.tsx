import { useState } from "react";
import {
  Plus, Edit2, Trash2, X, CheckCircle, RefreshCw, AlertTriangle,
  Eye, Send, ChevronDown, ChevronUp, Image, Type, Settings2,
  Search, Layers, Upload,
} from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import {
  getTemplateDefinitions, createTemplateDefinition, updateTemplateDefinition,
  publishTemplateDefinition, getAdminVariants
} from "../../api/admin";
import { uploadImage } from "../../utils/uploadImage";

// ─── ImageUploadField ─────────────────────────────────────────────────────────
function ImageUploadField({
  value, folder, onChange,
}: {
  value: string;
  folder: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadImage(file, folder);
      onChange(url);
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {/* Preview thumbnail */}
        {value && (
          <img src={value} alt="preview"
            className="w-10 h-10 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
        )}
        <div className="flex-1 flex items-center gap-2">
          <input
            value={value}
            placeholder="https://cdn.example.com/..."
            onChange={e => onChange(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-gray-900 transition"
          />
          <label className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition flex-shrink-0 ${uploading ? "opacity-50 pointer-events-none border-gray-200 text-gray-400" : "border-gray-300 text-gray-600 hover:border-gray-900 hover:text-gray-900"}`}>
            <Upload size={12} />
            {uploading ? "Uploading..." : "Upload"}
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
          </label>
        </div>
      </div>
      {error && <p className="text-[10px] text-red-500 font-semibold">{error}</p>}
    </div>
  );
}

const CS = { border: "1px solid rgba(197,206,255,0.52)", boxShadow: "0 12px 30px rgba(15,23,42,0.08)" };

// ─── Types ───────────────────────────────────────────────────────────────────

type SlotBehavior = {
  movable: boolean;
  resizable: boolean;
  cropEnabled: boolean;
  zoomEnabled: boolean;
  rotateEnabled: boolean;
};

type SlotGeometry = {
  x: string; y: string; width: string; height: string; shape: string;
};

type ImageConfig = {
  fitMode: string;
  minZoom: string;
  maxZoom: string;
  maxFileSizeMb: string;
};

type TextConfig = {
  maxLength: string;
  minLength: string;
  defaultFont: string;
  defaultFontSize: string;
  defaultColor: string;
};

type SlotForm = {
  slotId: string;
  name: string;
  type: "image" | "text";
  required: boolean;
  geometry: SlotGeometry;
  behavior: SlotBehavior;
  imageConfig: ImageConfig;
  textConfig: TextConfig;
};

type TDForm = {
  variantId: string;
  name: string;
  slug: string;
  version: string;
  editorBaseImage: string;
  overlayImage: string;
  maskImage: string;
  mockupSceneImage: string;
  canvasWidth: string;
  canvasHeight: string;
  canvasDpi: string;
  livePreview: boolean;
  allowFreeDesign: boolean;
  slots: SlotForm[];
};

// ─── Defaults ────────────────────────────────────────────────────────────────

const defaultBehavior: SlotBehavior = {
  movable: true, resizable: false, cropEnabled: true, zoomEnabled: true, rotateEnabled: false,
};

const defaultGeometry: SlotGeometry = { x: "0", y: "0", width: "400", height: "300", shape: "rectangle" };

const defaultImageConfig: ImageConfig = {
  fitMode: "cover", minZoom: "1", maxZoom: "4", maxFileSizeMb: "10",
};

const defaultTextConfig: TextConfig = {
  maxLength: "50", minLength: "1", defaultFont: "Inter",
  defaultFontSize: "28", defaultColor: "#ffffff",
};

const emptySlot = (): SlotForm => ({
  slotId: "", name: "", type: "image", required: true,
  geometry: { ...defaultGeometry },
  behavior: { ...defaultBehavior },
  imageConfig: { ...defaultImageConfig },
  textConfig: { ...defaultTextConfig },
});

const emptyForm = (): TDForm => ({
  variantId: "", name: "", slug: "", version: "1",
  editorBaseImage: "", overlayImage: "", maskImage: "", mockupSceneImage: "",
  canvasWidth: "1200", canvasHeight: "800", canvasDpi: "300",
  livePreview: true, allowFreeDesign: false,
  slots: [emptySlot()],
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugifySlotId(s: string) {
  return s.toLowerCase().replace(/\s+/g, "_").replace(/[^\w]/g, "");
}

function formToPayload(f: TDForm) {
  return {
    variantId: f.variantId,
    name: f.name,
    slug: f.slug || f.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
    version: Number(f.version) || 1,
    assets: {
      editorBaseImage: f.editorBaseImage || undefined,
      overlayImage: f.overlayImage || undefined,
      maskImage: f.maskImage || undefined,
      mockupSceneImage: f.mockupSceneImage || undefined,
    },
    canvas: {
      width: Number(f.canvasWidth) || 1200,
      height: Number(f.canvasHeight) || 800,
      unit: "px",
      dpi: Number(f.canvasDpi) || 300,
    },
    slots: f.slots.map(s => ({
      slotId: s.slotId,
      name: s.name,
      type: s.type,
      required: s.required,
      geometry: {
        x: Number(s.geometry.x),
        y: Number(s.geometry.y),
        width: Number(s.geometry.width),
        height: Number(s.geometry.height),
        shape: s.geometry.shape,
      },
      behavior: s.behavior,
      ...(s.type === "image" ? {
        imageConfig: {
          fitMode: s.imageConfig.fitMode,
          minZoom: Number(s.imageConfig.minZoom),
          maxZoom: Number(s.imageConfig.maxZoom),
          acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
          maxFileSizeMb: Number(s.imageConfig.maxFileSizeMb),
        },
      } : {
        textConfig: {
          maxLength: Number(s.textConfig.maxLength),
          minLength: Number(s.textConfig.minLength),
          defaultFont: s.textConfig.defaultFont,
          defaultFontSize: Number(s.textConfig.defaultFontSize),
          defaultColor: s.textConfig.defaultColor,
          allowedAlignments: ["left", "center", "right"],
        },
      }),
    })),
    previewConfig: { renderer: "sharp", livePreview: f.livePreview },
    rules: { allowFreeDesign: false },
  };
}

function backendToForm(td: any): TDForm {
  const assets = td.assets || {};
  const canvas = td.canvas || {};
  return {
    variantId: td.variantId || td.variant?._id || td.variant?.id || "",
    name: td.name || "",
    slug: td.slug || "",
    version: String(td.version || 1),
    editorBaseImage: assets.editorBaseImage || "",
    overlayImage: assets.overlayImage || "",
    maskImage: assets.maskImage || "",
    mockupSceneImage: assets.mockupSceneImage || "",
    canvasWidth: String(canvas.width || 1200),
    canvasHeight: String(canvas.height || 800),
    canvasDpi: String(canvas.dpi || 300),
    livePreview: td.previewConfig?.livePreview !== false,
    allowFreeDesign: false,
    slots: Array.isArray(td.slots) && td.slots.length > 0
      ? td.slots.map((s: any): SlotForm => ({
          slotId: s.slotId || "",
          name: s.name || "",
          type: s.type === "text" ? "text" : "image",
          required: s.required !== false,
          geometry: {
            x: String(s.geometry?.x ?? 0),
            y: String(s.geometry?.y ?? 0),
            width: String(s.geometry?.width ?? 400),
            height: String(s.geometry?.height ?? 300),
            shape: s.geometry?.shape || "rectangle",
          },
          behavior: {
            movable: s.behavior?.movable !== false,
            resizable: s.behavior?.resizable === true,
            cropEnabled: s.behavior?.cropEnabled !== false,
            zoomEnabled: s.behavior?.zoomEnabled !== false,
            rotateEnabled: s.behavior?.rotateEnabled === true,
          },
          imageConfig: {
            fitMode: s.imageConfig?.fitMode || "cover",
            minZoom: String(s.imageConfig?.minZoom ?? 1),
            maxZoom: String(s.imageConfig?.maxZoom ?? 4),
            maxFileSizeMb: String(s.imageConfig?.maxFileSizeMb ?? 10),
          },
          textConfig: {
            maxLength: String(s.textConfig?.maxLength ?? 50),
            minLength: String(s.textConfig?.minLength ?? 1),
            defaultFont: s.textConfig?.defaultFont || "Inter",
            defaultFontSize: String(s.textConfig?.defaultFontSize ?? 28),
            defaultColor: s.textConfig?.defaultColor || "#ffffff",
          },
        }))
      : [emptySlot()],
  };
}

// ─── SlotEditor sub-component ────────────────────────────────────────────────

function SlotEditor({
  slot, index, total,
  onChange, onRemove, onMoveUp, onMoveDown,
}: {
  slot: SlotForm; index: number; total: number;
  onChange: (s: SlotForm) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [open, setOpen] = useState(true);

  const set = (patch: Partial<SlotForm>) => onChange({ ...slot, ...patch });
  const setGeo = (patch: Partial<SlotGeometry>) => set({ geometry: { ...slot.geometry, ...patch } });
  const setBeh = (patch: Partial<SlotBehavior>) => set({ behavior: { ...slot.behavior, ...patch } });
  const setImg = (patch: Partial<ImageConfig>) => set({ imageConfig: { ...slot.imageConfig, ...patch } });
  const setTxt = (patch: Partial<TextConfig>) => set({ textConfig: { ...slot.textConfig, ...patch } });

  const inputCls = "w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-gray-900 transition";
  const labelCls = "block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1";

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Slot header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        style={{ backgroundColor: open ? "#f8f9ff" : "#fff" }}
        onClick={() => setOpen(o => !o)}
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${slot.type === "image" ? "bg-indigo-100" : "bg-amber-100"}`}>
          {slot.type === "image"
            ? <Image size={13} className="text-indigo-600" />
            : <Type size={13} className="text-amber-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">
            {slot.name || `Slot ${index + 1}`}
            {slot.slotId && <span className="ml-2 text-xs font-mono text-gray-400">#{slot.slotId}</span>}
          </p>
          <p className="text-[10px] text-gray-400 capitalize">{slot.type} slot · {slot.required ? "required" : "optional"}</p>
        </div>
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button disabled={index === 0} onClick={onMoveUp}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition text-gray-400">
            <ChevronUp size={13} />
          </button>
          <button disabled={index === total - 1} onClick={onMoveDown}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition text-gray-400">
            <ChevronDown size={13} />
          </button>
          <button onClick={onRemove} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition">
            <Trash2 size={13} />
          </button>
          {open ? <ChevronUp size={14} className="text-gray-400 ml-1" /> : <ChevronDown size={14} className="text-gray-400 ml-1" />}
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 pt-3 space-y-4 border-t border-gray-100">
          {/* Identity */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Slot ID *</label>
              <input value={slot.slotId} placeholder="e.g. photo_1"
                onChange={e => set({ slotId: slugifySlotId(e.target.value) })}
                className={`${inputCls} font-mono`} />
            </div>
            <div>
              <label className={labelCls}>Display Name *</label>
              <input value={slot.name} placeholder="e.g. Photo 1"
                onChange={e => set({ name: e.target.value, slotId: slot.slotId || slugifySlotId(e.target.value) })}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select value={slot.type} onChange={e => set({ type: e.target.value as "image" | "text" })}
                className={inputCls}>
                <option value="image">Image</option>
                <option value="text">Text</option>
              </select>
            </div>
          </div>

          {/* Geometry */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Geometry (px)</p>
            <div className="grid grid-cols-5 gap-2">
              {(["x", "y", "width", "height"] as const).map(k => (
                <div key={k}>
                  <label className={labelCls}>{k.toUpperCase()}</label>
                  <input type="number" value={slot.geometry[k]}
                    onChange={e => setGeo({ [k]: e.target.value })}
                    className={inputCls} />
                </div>
              ))}
              <div>
                <label className={labelCls}>Shape</label>
                <select value={slot.geometry.shape} onChange={e => setGeo({ shape: e.target.value })} className={inputCls}>
                  <option value="rectangle">Rectangle</option>
                  <option value="circle">Circle</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
          </div>

          {/* Behavior */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Behavior</p>
            <div className="flex flex-wrap gap-3">
              {(Object.keys(slot.behavior) as (keyof SlotBehavior)[]).map(k => (
                <label key={k} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input type="checkbox" checked={slot.behavior[k]}
                    onChange={e => setBeh({ [k]: e.target.checked })}
                    className="rounded" />
                  <span className="text-xs text-gray-600 capitalize">{k.replace(/([A-Z])/g, " $1").trim()}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Type-specific config */}
          {slot.type === "image" ? (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Image Config</p>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className={labelCls}>Fit Mode</label>
                  <select value={slot.imageConfig.fitMode} onChange={e => setImg({ fitMode: e.target.value })} className={inputCls}>
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                    <option value="fill">Fill</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Min Zoom</label>
                  <input type="number" step="0.1" value={slot.imageConfig.minZoom}
                    onChange={e => setImg({ minZoom: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Max Zoom</label>
                  <input type="number" step="0.1" value={slot.imageConfig.maxZoom}
                    onChange={e => setImg({ maxZoom: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Max Size (MB)</label>
                  <input type="number" value={slot.imageConfig.maxFileSizeMb}
                    onChange={e => setImg({ maxFileSizeMb: e.target.value })} className={inputCls} />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Text Config</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelCls}>Min Length</label>
                  <input type="number" value={slot.textConfig.minLength}
                    onChange={e => setTxt({ minLength: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Max Length</label>
                  <input type="number" value={slot.textConfig.maxLength}
                    onChange={e => setTxt({ maxLength: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Font Size (px)</label>
                  <input type="number" value={slot.textConfig.defaultFontSize}
                    onChange={e => setTxt({ defaultFontSize: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Default Font</label>
                  <input value={slot.textConfig.defaultFont} placeholder="Inter"
                    onChange={e => setTxt({ defaultFont: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Default Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={slot.textConfig.defaultColor}
                      onChange={e => setTxt({ defaultColor: e.target.value })}
                      className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                    <input value={slot.textConfig.defaultColor}
                      onChange={e => setTxt({ defaultColor: e.target.value })}
                      className={`${inputCls} font-mono`} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Required toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
            <input type="checkbox" checked={slot.required} onChange={e => set({ required: e.target.checked })} className="rounded" />
            <span className="text-xs font-semibold text-gray-600">Required slot</span>
          </label>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TemplateDefinitionsPage() {
  const [search, setSearch] = useState("");
  const [variantFilter, setVariantFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TDForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [previewTd, setPreviewTd] = useState<any | null>(null);
  const [toast, setToast] = useState({ msg: "", type: "success" as "success" | "error" });

  const { data: tdData, loading, refetch } = useAsync(
    () => getTemplateDefinitions({ limit: 100 }),
    {}, []
  );
  const { data: variantsData } = useAsync(() => getAdminVariants({ limit: 200 }), {}, []);

  const templates: any[] = Array.isArray((tdData as any)?.templateDefinitions)
    ? (tdData as any).templateDefinitions
    : Array.isArray(tdData) ? (tdData as any[]) : [];

  const variants: any[] = Array.isArray((variantsData as any)?.variants)
    ? (variantsData as any).variants
    : Array.isArray(variantsData) ? (variantsData as any[]) : [];

  const filtered = templates.filter(td => {
    const matchSearch = !search ||
      td.name?.toLowerCase().includes(search.toLowerCase());
    const tdVariantId = td.variantId || td.variant?._id || td.variant?.id;
    const matchVariant = variantFilter === "all" || tdVariantId === variantFilter;
    return matchSearch && matchVariant;
  });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(t => ({ ...t, msg: "" })), 3500);
  };

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm());
    setFormError("");
    setSaved(false);
    setShowForm(true);
  };

  const openEdit = (td: any) => {
    setEditId(td._id || td.id);
    setForm(backendToForm(td));
    setFormError("");
    setSaved(false);
    setShowForm(true);
  };

  const validateForm = (): string => {
    if (!form.variantId) return "Variant is required.";
    if (!form.name.trim()) return "Template name is required.";
    for (let i = 0; i < form.slots.length; i++) {
      const s = form.slots[i];
      if (!s.slotId.trim()) return `Slot ${i + 1}: Slot ID is required.`;
      if (!s.name.trim()) return `Slot ${i + 1}: Display name is required.`;
    }
    const ids = form.slots.map(s => s.slotId);
    if (new Set(ids).size !== ids.length) return "Slot IDs must be unique.";
    return "";
  };

  const handleSave = async () => {
    const err = validateForm();
    if (err) { setFormError(err); return; }
    setSaving(true);
    setFormError("");
    try {
      const payload = formToPayload(form);
      if (editId) {
        await updateTemplateDefinition(editId, payload);
        showToast("Template updated.");
      } else {
        await createTemplateDefinition(payload as any);
        showToast("Template created.");
      }
      setSaved(true);
      setTimeout(() => { setShowForm(false); setSaved(false); refetch(); }, 1000);
    } catch (e: any) {
      setFormError(e?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      // No delete endpoint in spec — use update to mark inactive as workaround
      await updateTemplateDefinition(id, { isActive: false });
      showToast("Template deactivated.");
      setDeleteId(null);
      refetch();
    } catch (e: any) {
      showToast(e?.message || "Failed.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handlePublish = async (id: string) => {
    setPublishingId(id);
    try {
      await publishTemplateDefinition(id);
      showToast("Template published as default for this variant.");
      refetch();
    } catch (e: any) {
      showToast(e?.message || "Publish failed.", "error");
    } finally {
      setPublishingId(null);
    }
  };

  // Slot helpers
  const addSlot = () => setForm(f => ({ ...f, slots: [...f.slots, emptySlot()] }));
  const removeSlot = (i: number) => setForm(f => ({ ...f, slots: f.slots.filter((_, idx) => idx !== i) }));
  const updateSlot = (i: number, s: SlotForm) => setForm(f => {
    const slots = [...f.slots]; slots[i] = s; return { ...f, slots };
  });
  const moveSlot = (i: number, dir: -1 | 1) => setForm(f => {
    const slots = [...f.slots];
    const j = i + dir;
    if (j < 0 || j >= slots.length) return f;
    [slots[i], slots[j]] = [slots[j], slots[i]];
    return { ...f, slots };
  });

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition";
  const labelCls = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast.msg && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${toast.type === "success" ? "bg-emerald-600" : "bg-red-500"}`}>
          {toast.type === "success" ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-4">
        {[
          { label: "Total Templates", value: templates.length, dark: true },
          { label: "Published", value: templates.filter(t => t.isPublished || t.status === "published").length, color: "#10b981" },
          { label: "Draft", value: templates.filter(t => !t.isPublished && t.status !== "published").length, color: "#f59e0b" },
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

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..."
            className="w-full pl-8 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none" />
        </div>
        <select value={variantFilter} onChange={e => setVariantFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none">
          <option value="all">All Variants</option>
          {variants.map((v: any) => (
            <option key={v._id || v.id} value={v._id || v.id}>{v.name} ({v.sku})</option>
          ))}
        </select>
        <button onClick={() => refetch()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold hover:border-gray-900 transition">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
        <button onClick={openCreate} className="ml-auto flex items-center gap-1.5 px-4 py-2 text-white text-sm font-bold rounded-xl" style={{ backgroundColor: "#334155" }}>
          <Plus size={14} /> New Template
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl overflow-hidden" style={CS}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(197,206,255,0.3)", backgroundColor: "rgba(248,249,255,0.78)" }}>
                {["Template", "Variant", "Slots", "Canvas", "Status", ""].map((h, idx) => (
                  <th key={h} className={`text-xs font-bold text-gray-400 uppercase tracking-wide px-4 py-3 ${idx === 5 ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((td: any, i: number) => {
                const slotCount = Array.isArray(td.slots) ? td.slots.length : 0;
                const imgSlots = Array.isArray(td.slots) ? td.slots.filter((s: any) => s.type === "image").length : 0;
                const txtSlots = slotCount - imgSlots;
                const isPublished = td.isPublished || td.status === "published";
                const variantName = td.variant?.name || variants.find(v => (v._id || v.id) === td.variantId)?.name || td.variantId || "—";
                return (
                  <tr key={td._id || td.id} className="hover:bg-gray-50 transition" style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(197,206,255,0.2)" : "none" }}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-gray-900">{td.name}</p>
                      <p className="text-xs text-gray-400">v{td.version || 1}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{variantName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {imgSlots > 0 && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">
                            <Image size={9} /> {imgSlots}
                          </span>
                        )}
                        {txtSlots > 0 && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">
                            <Type size={9} /> {txtSlots}
                          </span>
                        )}
                        {slotCount === 0 && <span className="text-xs text-gray-300">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {td.canvas ? `${td.canvas.width}×${td.canvas.height}px` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {isPublished ? (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Published</span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">Draft</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setPreviewTd(td)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition" title="Preview slots">
                          <Eye size={13} />
                        </button>
                        <button onClick={() => openEdit(td)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition" title="Edit">
                          <Edit2 size={13} />
                        </button>
                        {!isPublished && (
                          <button
                            onClick={() => handlePublish(td._id || td.id)}
                            disabled={publishingId === (td._id || td.id)}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition disabled:opacity-50"
                            title="Publish as default"
                          >
                            <Send size={13} />
                          </button>
                        )}
                        <button onClick={() => setDeleteId(td._id || td.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition" title="Deactivate">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={6} className="px-4 py-16 text-center text-sm text-gray-400">
                  {loading ? "Loading..." : "No template definitions yet. Click \"+ New Template\" to create one."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create / Edit Modal ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-indigo-500" />
                <h2 className="text-base font-bold text-gray-900">{editId ? "Edit Template" : "New Template Definition"}</h2>
              </div>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400" /></button>
            </div>

            {saved ? (
              <div className="flex items-center gap-2 p-6 rounded-xl bg-green-50 m-6">
                <CheckCircle size={16} className="text-green-600" />
                <p className="text-sm font-bold text-green-800">Saved successfully.</p>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

                {/* ── Section: Identity ── */}
                <section>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Identity</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className={labelCls}>Template Name *</label>
                      <input value={form.name} placeholder="e.g. Blessed Together 2 Photo"
                        onChange={e => setForm(f => ({
                          ...f,
                          name: e.target.value,
                          slug: f.slug || e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
                        }))}
                        className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Version</label>
                      <input type="number" min="1" value={form.version}
                        onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                        className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Slug *</label>
                    <input value={form.slug} placeholder="e.g. blessed-together-2-photo"
                      onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') }))}
                      className={`${inputCls} font-mono`} />
                  </div>
                  <div className="mt-3">
                    <label className={labelCls}>Variant *</label>
                    <select value={form.variantId} onChange={e => setForm(f => ({ ...f, variantId: e.target.value }))}
                      className={inputCls}>
                      <option value="">Select variant</option>
                      {variants.map((v: any) => (
                        <option key={v._id || v.id} value={v._id || v.id}>
                          {v.name} — {v.sku} {v.price ? `(₹${v.price})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </section>

                {/* ── Section: Canvas ── */}
                <section>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Canvas</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls}>Width (px)</label>
                      <input type="number" value={form.canvasWidth}
                        onChange={e => setForm(f => ({ ...f, canvasWidth: e.target.value }))}
                        className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Height (px)</label>
                      <input type="number" value={form.canvasHeight}
                        onChange={e => setForm(f => ({ ...f, canvasHeight: e.target.value }))}
                        className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>DPI</label>
                      <input type="number" value={form.canvasDpi}
                        onChange={e => setForm(f => ({ ...f, canvasDpi: e.target.value }))}
                        className={inputCls} />
                    </div>
                  </div>
                </section>

                {/* ── Section: Assets ── */}
                <section>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Asset Images</p>
                  <div className="space-y-3">
                    {([
                      { key: "editorBaseImage", label: "Editor Base Image", folder: "templates/base" },
                      { key: "overlayImage", label: "Overlay Image", folder: "templates/overlay" },
                      { key: "maskImage", label: "Mask Image", folder: "templates/mask" },
                      { key: "mockupSceneImage", label: "Mockup Scene Image", folder: "templates/mockup" },
                    ] as { key: keyof TDForm; label: string; folder: string }[]).map(({ key, label, folder }) => (
                      <div key={key}>
                        <label className={labelCls}>{label}</label>
                        <ImageUploadField
                          value={form[key] as string}
                          folder={folder}
                          onChange={url => setForm(f => ({ ...f, [key]: url }))}
                        />
                      </div>
                    ))}
                  </div>
                </section>

                {/* ── Section: Settings ── */}
                <section>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Settings</p>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={form.livePreview}
                        onChange={e => setForm(f => ({ ...f, livePreview: e.target.checked }))} className="rounded" />
                      <span className="text-sm font-semibold text-gray-700">Live Preview</span>
                    </label>
                    <label className="flex items-center gap-2 select-none opacity-60">
                      <input type="checkbox" checked={false} disabled className="rounded" />
                      <span className="text-sm font-semibold text-gray-700">Allow Free Design</span>
                    </label>
                  </div>
                </section>

                {/* ── Section: Slots ── */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Slots <span className="ml-1 text-indigo-500">{form.slots.length}</span>
                    </p>
                    <button onClick={addSlot}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-bold rounded-xl"
                      style={{ backgroundColor: "#6366f1" }}>
                      <Plus size={11} /> Add Slot
                    </button>
                  </div>
                  <div className="space-y-3">
                    {form.slots.map((slot, i) => (
                      <SlotEditor
                        key={i}
                        slot={slot}
                        index={i}
                        total={form.slots.length}
                        onChange={s => updateSlot(i, s)}
                        onRemove={() => removeSlot(i)}
                        onMoveUp={() => moveSlot(i, -1)}
                        onMoveDown={() => moveSlot(i, 1)}
                      />
                    ))}
                    {form.slots.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                        <Settings2 size={24} className="mb-2 opacity-40" />
                        <p className="text-sm">No slots yet. Click "Add Slot" to define editable areas.</p>
                      </div>
                    )}
                  </div>
                </section>

                {formError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                    <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                    <p className="text-xs font-semibold text-red-600">{formError}</p>
                  </div>
                )}
              </div>
            )}

            {/* Modal footer */}
            {!saved && (
              <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl transition disabled:opacity-50"
                  style={{ backgroundColor: "#334155" }}>
                  {saving ? "Saving..." : editId ? "Update Template" : "Create Template"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Slot Preview Modal ──────────────────────────────────────────────── */}
      {previewTd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">{previewTd.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  v{previewTd.version || 1} · {previewTd.canvas ? `${previewTd.canvas.width}×${previewTd.canvas.height}px` : ""}
                </p>
              </div>
              <button onClick={() => setPreviewTd(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
              {Array.isArray(previewTd.slots) && previewTd.slots.length > 0 ? (
                previewTd.slots.map((s: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s.type === "image" ? "bg-indigo-100" : "bg-amber-100"}`}>
                      {s.type === "image" ? <Image size={14} className="text-indigo-600" /> : <Type size={14} className="text-amber-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-900">{s.name}</span>
                        <span className="text-[10px] font-mono text-gray-400">#{s.slotId}</span>
                        {s.required && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-500">required</span>}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {s.geometry && (
                          <span className="text-[10px] text-gray-500 bg-white border border-gray-200 px-1.5 py-0.5 rounded-full">
                            {s.geometry.width}×{s.geometry.height} @ ({s.geometry.x},{s.geometry.y}) · {s.geometry.shape}
                          </span>
                        )}
                        {s.behavior && Object.entries(s.behavior)
                          .filter(([, v]) => v === true)
                          .map(([k]) => (
                            <span key={k} className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full capitalize">
                              {k.replace(/([A-Z])/g, " $1").trim()}
                            </span>
                          ))}
                        {s.type === "text" && s.textConfig && (
                          <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                            {s.textConfig.defaultFont} {s.textConfig.defaultFontSize}px
                          </span>
                        )}
                        {s.type === "image" && s.imageConfig && (
                          <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                            zoom {s.imageConfig.minZoom}–{s.imageConfig.maxZoom}x
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">No slots defined.</p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 flex gap-3">
              <button onClick={() => { setPreviewTd(null); openEdit(previewTd); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                <Edit2 size={13} /> Edit
              </button>
              {!(previewTd.isPublished || previewTd.status === "published") && (
                <button
                  onClick={() => { handlePublish(previewTd._id || previewTd.id); setPreviewTd(null); }}
                  disabled={publishingId === (previewTd._id || previewTd.id)}
                  className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-bold rounded-xl transition disabled:opacity-50"
                  style={{ backgroundColor: "#10b981" }}>
                  <Send size={13} /> Publish
                </button>
              )}
              <button onClick={() => setPreviewTd(null)}
                className="ml-auto px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deactivate confirm ──────────────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-red-50"><Trash2 size={20} className="text-red-500" /></div>
              <div>
                <h2 className="font-bold text-gray-900">Deactivate Template</h2>
                <p className="text-xs text-gray-500">The template will be hidden from the customization flow.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} disabled={deleting}
                className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl bg-red-500 hover:bg-red-600 transition disabled:opacity-50">
                {deleting ? "Deactivating..." : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
