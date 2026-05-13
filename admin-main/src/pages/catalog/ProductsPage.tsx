import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Edit2, Trash2, X, CheckCircle, Package, Download, RefreshCw, Tag, History, Percent, AlertTriangle, ChevronRight, Upload, Layers, LayoutTemplate, Sliders } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getProductCategories, getProducts, createProduct, updateProduct, deleteProduct, patchProductDiscount, bulkDiscountProducts, getProductDiscountHistory, getAdminVariantsByProduct, getTemplateDefinitions } from "../../api/admin";
import { uploadImage } from "../../utils/uploadImage";
import { resolveImageUrl, resolveThumbnail, getAlternateImageUrl, getPlaceholderImage } from "../../utils/imageUtils";

const CS = { border: "1px solid rgba(197,206,255,0.52)", boxShadow: "0 12px 30px rgba(15,23,42,0.08)" };

type Product = {
  id: string;
  name: string;
  category: string;
  categoryId: string;
  basePrice: number;
  unit: string;
  active: boolean;
  vendors: number;
  imageUrl?: string;
  mrp?: number;
  sale_price?: number;
  discount_pct?: number;
  badge?: string;
  flowType?: string;
  // new fields
  description?: string;
  highlights?: string[];
  requiresDesign?: boolean;
  requiresUpload?: boolean;
  designMode?: string;
  slug?: string;
  variantCount?: number;
  templateCount?: number;
};

const BADGE_OPTIONS = ["sale", "new", "trending", "bestseller", "deal"];
const FLOW_TYPES = [
  { value: "printing", label: "Printing" },
  { value: "gifting", label: "Gifting" },
  { value: "shopping", label: "Shopping" },
];
const DESIGN_MODES = [
  { value: "", label: "None" },
  { value: "normal", label: "Normal (Free Design)" },
  { value: "premium", label: "Premium (Template)" },
  { value: "both", label: "Both" },
];

const emptyDiscountForm = {
  mrp: "",
  sale_price: "",
  discount_pct: "",
  badge: "sale",
  note: "",
  mode: "pct" as "pct" | "price",
};

const emptyForm = {
  name: "",
  categoryId: "",
  categoryName: "",
  basePrice: "",
  mrp: "",
  sale_price: "",
  unit: "per piece",
  description: "",
  highlights: "",
  flowType: "gifting",
  imageUrl: "",
  requiresDesign: false,
  requiresUpload: false,
  designMode: "",
  slug: "",
};

const LOCAL_PRODUCT_IMAGE_PREVIEWS_KEY = 'speedcopy_admin_product_image_previews';

function loadLocalProductImagePreviews(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LOCAL_PRODUCT_IMAGE_PREVIEWS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function persistLocalProductImagePreviews(next: Record<string, string>) {
  try {
    localStorage.setItem(LOCAL_PRODUCT_IMAGE_PREVIEWS_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota errors; server URL fallback will still be used.
  }
}

function createPersistentPreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxSize = 320;
      let { width, height } = img;

      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to create preview'));
    };

    img.src = objectUrl;
  });
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [flowFilter, setFlowFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saved, setSaved] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [localSelectedImagePreview, setLocalSelectedImagePreview] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [localProductImagePreviews, setLocalProductImagePreviews] = useState<Record<string, string>>(loadLocalProductImagePreviews);

  // Product detail panel
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailVariants, setDetailVariants] = useState<any[]>([]);
  const [detailTemplates, setDetailTemplates] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Discount modal state
  const [discountProduct, setDiscountProduct] = useState<Product | null>(null);
  const [discountForm, setDiscountForm] = useState(emptyDiscountForm);
  const [discountSaving, setDiscountSaving] = useState(false);
  const [discountError, setDiscountError] = useState("");
  const [discountSuccess, setDiscountSuccess] = useState("");

  // Bulk discount state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({ discount_pct: "", badge: "sale", note: "" });
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState("");

  // Discount history drawer
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState({ msg: "", type: "success" as "success" | "error" });
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(t => ({ ...t, msg: "" })), 3000);
  };

  const { data: categoriesData, refetch: refetchCategories } = useAsync(() => getProductCategories(), null, []);
  const { data: productsData, loading: productsLoading, refetch: refetchProducts } = useAsync(() => getProducts({ limit: 100 }), null, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => { refetchCategories(); refetchProducts(); }, 30000);
    return () => clearInterval(interval);
  }, [refetchCategories, refetchProducts]);

  const categoriesArray = Array.isArray(categoriesData) ? categoriesData : [];

  const categories = useMemo(() => categoriesArray.map((c: any) => ({
    id: c.id ?? c._id ?? c.slug,
    name: c.name,
    flowType: c.flowType,
    count: c.count,
  })), [categoriesData]);

  // Map backend products → local state
  useEffect(() => {
    try {
      let productsArray: any[] = [];
      if (productsData && typeof productsData === 'object') {
        if ('products' in productsData && Array.isArray((productsData as any).products)) {
          productsArray = (productsData as any).products;
        } else if (Array.isArray(productsData)) {
          productsArray = productsData as any[];
        }
      }

      if (productsArray.length > 0) {
        setProducts(productsArray.map((p: any) => {
          const categoryId = p.category?._id || p.category?.id || p.category;
          const categoryObj = categories.find((c: any) => String(c.id) === String(categoryId));
          const productId = String(p.id || p._id);
          return {
            id: productId,
            name: p.name,
            category: categoryObj?.name || p.category?.name || "Unknown",
            categoryId: String(categoryId || ""),
            basePrice: p.basePrice || p.mrp || 0,
            unit: p.unit || "per piece",
            active: p.isActive !== false,
            vendors: 0,
            imageUrl: localProductImagePreviews[productId] || resolveThumbnail(p.images, p.thumbnail, p.image || p.coverImage, p.imageUrl),
            mrp: p.mrp ?? p.basePrice ?? 0,
            sale_price: p.sale_price ?? p.salePrice ?? p.mrp ?? p.basePrice ?? 0,
            discount_pct: p.discount_pct ?? p.discountPct ?? 0,
            badge: p.badge || "",
            flowType: categoryObj?.flowType || p.flowType || "gifting",
            description: p.description || "",
            highlights: p.highlights || [],
            requiresDesign: p.requiresDesign === true,
            requiresUpload: p.requiresUpload === true,
            designMode: p.designMode || p.design_mode || "",
            slug: p.slug || "",
          };
        }));
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error processing products:', error);
      setProducts([]);
    }
  }, [productsData, categories, localProductImagePreviews]);

  const filtered = products.filter(p =>
    (catFilter === "all" || p.category === catFilter) &&
    (flowFilter === "all" || p.flowType === flowFilter) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(true);
    setSaved(false);
    setImagePreview(null);
    setLocalSelectedImagePreview("");
  };

  // Open product detail panel
  const openDetail = async (p: Product) => {
    setDetailProduct(p);
    setDetailVariants([]);
    setDetailTemplates([]);
    setDetailLoading(true);
    try {
      const [varRes, tmplRes] = await Promise.all([
        getAdminVariantsByProduct(p.id).catch(() => null),
        getTemplateDefinitions({ limit: 50 }).catch(() => null),
      ]);
      const vars: any[] = Array.isArray((varRes as any)?.variants) ? (varRes as any).variants
        : Array.isArray(varRes) ? (varRes as any[]) : [];
      const allTmpls: any[] = Array.isArray((tmplRes as any)?.templateDefinitions) ? (tmplRes as any).templateDefinitions
        : Array.isArray(tmplRes) ? (tmplRes as any[]) : [];
      // Filter templates by variants of this product
      const variantIds = new Set(vars.map((v: any) => v._id || v.id));
      const productTmpls = allTmpls.filter((t: any) => variantIds.has(t.variantId));
      setDetailVariants(vars);
      setDetailTemplates(productTmpls);
    } catch { /* silent */ }
    finally { setDetailLoading(false); }
  };

  const openEdit = (p: Product) => {
    const selectedCat = categories.find((c: any) => c.name === p.category);
    setForm({
      name: p.name,
      categoryId: selectedCat?.id || "",
      categoryName: p.category,
      basePrice: String(p.basePrice),
      mrp: String(p.mrp || ""),
      sale_price: String(p.sale_price || ""),
      unit: p.unit,
      description: p.description || "",
      highlights: Array.isArray(p.highlights) ? p.highlights.join("\n") : "",
      flowType: p.flowType || "gifting",
      imageUrl: p.imageUrl || "",
      requiresDesign: p.requiresDesign || false,
      requiresUpload: p.requiresUpload || false,
      designMode: p.designMode || "",
      slug: p.slug || "",
    });
    setEditId(p.id);
    setShowForm(true);
    setSaved(false);
    setImagePreview(p.imageUrl || null);
    setLocalSelectedImagePreview("");
  };

  const save = async () => {
    const missingFields = [
      !form.name.trim() && "Product name",
      !form.categoryId && "Category",
      !form.basePrice && "Base price",
    ].filter(Boolean);

    if (missingFields.length > 0) {
      showToast(`Please fill: ${missingFields.join(", ")}.`, "error");
      return;
    }
    try {
      const highlightsArr = form.highlights
        ? form.highlights.split("\n").map(s => s.trim()).filter(Boolean)
        : [];

      const payload: any = {
        name: form.name,
        category: form.categoryId,
        basePrice: parseFloat(form.basePrice),
        unit: form.unit,
        description: form.description || undefined,
        flowType: form.flowType,
        requiresDesign: form.requiresDesign,
        requiresUpload: form.requiresUpload,
        ...(form.designMode ? { designMode: form.designMode } : {}),
        ...(highlightsArr.length ? { highlights: highlightsArr } : {}),
        ...(form.mrp ? { mrp: parseFloat(form.mrp) } : {}),
        ...(form.sale_price ? { sale_price: parseFloat(form.sale_price) } : {}),
        ...(form.slug ? { slug: `${form.slug}-${crypto.randomUUID?.()?.slice(0,4) || Date.now().toString(36)}` } : {
          slug: `${form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')}-${crypto.randomUUID?.()?.slice(0,4) || Date.now().toString(36)}`,
        }),
        ...(form.imageUrl ? { images: [form.imageUrl], thumbnail: form.imageUrl, imageUrl: form.imageUrl } : {}),
      };
 
      if (Number.isNaN(payload.basePrice)) { showToast("Base price must be a valid number.", "error"); return; }
      const localUploadPreview = localSelectedImagePreview || (imagePreview?.startsWith('data:') ? imagePreview : '');
 
      if (editId) {
        const updated: any = await updateProduct(editId, payload);
        if (localUploadPreview) {
          setLocalProductImagePreviews(prev => {
            const next = { ...prev, [editId]: localUploadPreview };
            persistLocalProductImagePreviews(next);
            return next;
          });
        }
        setProducts(prev => prev.map(p => p.id === editId ? {
          ...p,
          name: updated.name ?? payload.name,
          category: categories.find((c: any) => c.id === payload.category)?.name || form.categoryName,
          basePrice: updated.basePrice ?? payload.basePrice,
          unit: updated.unit ?? payload.unit,
          active: updated.isActive !== false,
          imageUrl: localUploadPreview || resolveThumbnail(updated.images, updated.thumbnail, updated.image, form.imageUrl || updated.imageUrl || p.imageUrl),
          flowType: payload.flowType,
          requiresDesign: payload.requiresDesign,
          designMode: payload.designMode || "",
          description: payload.description || "",
        } : p));
      } else {
        const created: any = await createProduct(payload);
        const productId = String(created.id ?? created._id ?? `P-${Math.random()}`);
        if (localUploadPreview) {
          setLocalProductImagePreviews(prev => {
            const next = { ...prev, [productId]: localUploadPreview };
            persistLocalProductImagePreviews(next);
            return next;
          });
        }
        const newProd: Product = {
          id: productId,
          name: created.name ?? payload.name,
          category: categories.find((c: any) => c.id === payload.category)?.name || form.categoryName,
          categoryId: payload.category,
          basePrice: created.basePrice ?? payload.basePrice,
          unit: created.unit ?? payload.unit ?? 'per piece',
          active: created.isActive !== false,
          vendors: 0,
          imageUrl: localUploadPreview || resolveThumbnail(created.images, created.thumbnail, created.image, form.imageUrl || created.imageUrl),
          flowType: payload.flowType,
          requiresDesign: payload.requiresDesign,
          designMode: payload.designMode || "",
          description: payload.description || "",
        };
        setProducts(prev => [newProd, ...prev]);
      }

      setSaved(true);
      setTimeout(() => {
        setShowForm(false);
        setSaved(false);
        refetchCategories();
        refetchProducts();
      }, 1500);
    } catch (error) {
      console.error('Failed to save product:', error);
      alert(`Error: ${(error as any)?.message || 'Failed to save product'}`);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteProduct(id);
      refetchProducts();
    } catch (error) {
      alert(`Error: ${(error as any)?.message || 'Failed to delete product'}`);
    }
  };

  // ── Discount handlers ──────────────────────────────────────────────────────

  const openDiscount = (p: Product) => {
    setDiscountProduct(p);
    const hasDsc = (p.discount_pct ?? 0) > 0;
    setDiscountForm({
      mrp: String(p.mrp || p.basePrice || ""),
      sale_price: hasDsc ? String(p.sale_price || "") : "",
      discount_pct: hasDsc ? String(p.discount_pct || "") : "",
      badge: p.badge || "sale",
      note: "",
      mode: "pct",
    });
    setDiscountError("");
    setDiscountSuccess("");
  };

  const saveDiscount = async () => {
    if (!discountProduct) return;
    const mrpVal = Number(discountForm.mrp);
    if (!mrpVal || mrpVal <= 0) { setDiscountError("MRP is required and must be > 0."); return; }

    const payload: any = { mrp: mrpVal, note: discountForm.note || undefined };

    if (discountForm.mode === "pct") {
      const pct = Number(discountForm.discount_pct);
      if (isNaN(pct) || pct < 0 || pct > 100) { setDiscountError("Discount % must be between 0 and 100."); return; }
      payload.discount_pct = pct;
    } else {
      const sp = Number(discountForm.sale_price);
      if (isNaN(sp) || sp < 0) { setDiscountError("Sale price must be a valid number."); return; }
      if (sp > mrpVal) { setDiscountError("Sale price cannot exceed MRP."); return; }
      payload.sale_price = sp;
    }

    if (discountForm.badge) payload.badge = discountForm.badge;

    setDiscountSaving(true);
    setDiscountError("");
    try {
      const ft = (discountProduct.flowType || "shop").includes("gift") ? "gifting" : "shop";
      await patchProductDiscount(discountProduct.id, ft, payload);
      setDiscountSuccess("Discount updated successfully.");
      showToast("Discount updated.");
      setTimeout(() => { setDiscountProduct(null); setDiscountSuccess(""); refetchProducts(); }, 1200);
    } catch (err: any) {
      setDiscountError(err?.message || "Failed to update discount.");
    } finally {
      setDiscountSaving(false);
    }
  };

  const clearDiscount = async (p: Product) => {
    if (!window.confirm(`Remove discount from "${p.name}"?`)) return;
    try {
      const ft = (p.flowType || "shop").includes("gift") ? "gifting" : "shop";
      await patchProductDiscount(p.id, ft, { discount_pct: 0, badge: "" });
      showToast("Discount cleared.");
      refetchProducts();
    } catch (err: any) {
      showToast(err?.message || "Failed to clear discount.", "error");
    }
  };

  // ── Bulk discount handlers ──────────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map(p => p.id));
  };

  const saveBulkDiscount = async () => {
    const pct = Number(bulkForm.discount_pct);
    if (isNaN(pct) || pct < 0 || pct > 100) { setBulkError("Discount % must be 0–100."); return; }
    if (selectedIds.length === 0) { setBulkError("Select at least one product."); return; }
    setBulkSaving(true);
    setBulkError("");
    try {
      await bulkDiscountProducts({
        product_ids: selectedIds,
        discount_pct: pct,
        badge: bulkForm.badge || undefined,
        note: bulkForm.note || undefined,
      });
      showToast(`Discount applied to ${selectedIds.length} product(s).`);
      setShowBulkModal(false);
      setSelectedIds([]);
      setBulkForm({ discount_pct: "", badge: "sale", note: "" });
      refetchProducts();
    } catch (err: any) {
      setBulkError(err?.message || "Bulk discount failed.");
    } finally {
      setBulkSaving(false);
    }
  };

  // ── Discount history ────────────────────────────────────────────────────────

  const openHistory = async (p: Product) => {
    setHistoryProduct(p);
    setHistoryData([]);
    setHistoryLoading(true);
    try {
      const res: any = await getProductDiscountHistory(p.id);
      setHistoryData(Array.isArray(res) ? res : res?.discount_history || res?.history || []);
    } catch {
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const exportProducts = () => {
    const csvContent = [
      ['ID', 'Name', 'Category', 'Base Price', 'Unit', 'Active'].join(','),
      ...products.map((p: Product) => [
        p.id,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${(p.category || '').replace(/"/g, '""')}"`,
        p.basePrice,
        `"${(p.unit || '').replace(/"/g, '""')}"`,
        p.active ? 'Yes' : 'No',
      ].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast.msg && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white transition-all ${toast.type === "success" ? "bg-emerald-600" : "bg-red-500"}`}>
          {toast.type === "success" ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
            className="w-full pl-8 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none" />
        </div>
        {/* Flow type filter */}
        <div className="flex gap-1.5">
          {[{ value: "all", label: "All" }, ...FLOW_TYPES].map(ft => (
            <button key={ft.value} onClick={() => setFlowFilter(ft.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition"
              style={{ backgroundColor: flowFilter === ft.value ? "#334155" : "#fff", color: flowFilter === ft.value ? "#fff" : "#64748b", border: `1px solid ${flowFilter === ft.value ? "#334155" : "#e2e8f0"}` }}>
              {ft.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button key="all" onClick={() => setCatFilter("all")}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition"
            style={{ backgroundColor: catFilter === "all" ? "#6366f1" : "#fff", color: catFilter === "all" ? "#fff" : "#64748b", border: `1px solid ${catFilter === "all" ? "#6366f1" : "#e2e8f0"}` }}>
            All Categories
          </button>
          {categories.map((c: any) => (
            <button key={c.id} onClick={() => setCatFilter(c.name)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition"
              style={{ backgroundColor: catFilter === c.name ? "#6366f1" : "#fff", color: catFilter === c.name ? "#fff" : "#64748b", border: `1px solid ${catFilter === c.name ? "#6366f1" : "#e2e8f0"}` }}>
              {c.name}
            </button>
          ))}
        </div>
        <button onClick={openAdd}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 text-white text-sm font-bold rounded-xl"
          style={{ backgroundColor: "#334155" }}>
          <Plus size={14} /> Add Product
        </button>
        {selectedIds.length > 0 && (
          <button onClick={() => { setBulkForm({ discount_pct: "", badge: "sale", note: "" }); setBulkError(""); setShowBulkModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2 text-white text-sm font-bold rounded-xl"
            style={{ backgroundColor: "#6366f1" }}>
            <Percent size={14} /> Bulk Discount ({selectedIds.length})
          </button>
        )}
        <button onClick={exportProducts}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold">
          <Download size={14} /> Export
        </button>
        <button onClick={() => refetchProducts()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold">
          <RefreshCw size={14} className={productsLoading ? "animate-spin" : ""} />
          {productsLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-6">
        {[
          { label: "Total Products", value: products.length, color: "#334155", note: "All categories" },
          { label: "Active", value: products.filter(p => p.active).length, color: "#10b981", note: "Live on platform" },
          { label: "Inactive", value: products.filter(p => !p.active).length, color: "#94a3b8", note: "Hidden from users" },
        ].map((s, idx) => (
          <div key={s.label} className="rounded-xl p-5 flex-1"
            style={idx === 0
              ? { background: "linear-gradient(135deg, #1e293b, #0f172a)", boxShadow: "0 12px 28px rgba(15,23,42,0.3)", position: "relative", overflow: "hidden" }
              : { ...CS, backgroundColor: "#fff" }}>
            {idx === 0 && <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)", backgroundSize: "14px 14px" }} />}
            <div className="relative flex items-start justify-between mb-2">
              <p className={`text-2xl font-black ${idx === 0 ? "text-white" : ""}`} style={idx !== 0 ? { color: s.color } : {}}>{s.value}</p>
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: idx === 0 ? "rgba(255,255,255,0.15)" : `${s.color}18` }}>
                <Package size={12} style={{ color: idx === 0 ? "#fff" : s.color }} />
              </div>
            </div>
            <p className={`relative text-xs font-semibold ${idx === 0 ? "text-white/70" : "text-gray-700"}`}>{s.label}</p>
            <p className={`relative text-xs ${idx === 0 ? "text-white/40" : "text-gray-400"}`}>{s.note}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl overflow-hidden" style={CS}>
        <div className="overflow-x-auto">
          <table className="w-full admin-responsive-table min-w-[800px] lg:min-w-0">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(197,206,255,0.4)", backgroundColor: "rgba(248,249,255,0.78)" }}>
                <th className="px-4 py-2 w-8">
                  <input type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={toggleSelectAll}
                    className="rounded" />
                </th>
                {["Product", "Category / Flow", "Price", "Design Mode", "Status", ""].map(h => (
                  <th key={h} className="text-left text-xs font-bold text-gray-400 uppercase tracking-wide px-4 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((p, i) => (
                <tr key={p.id} className="hover-row"
                  style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(197,206,255,0.2)" : "none" }}>
                  <td className="px-4 py-2.5 w-8">
                    <input type="checkbox"
                      checked={selectedIds.includes(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="rounded" />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                        style={{ backgroundColor: "#f1f5f9" }}>
                        {p.imageUrl
                          ? <img src={resolveImageUrl(p.imageUrl)} alt={p.name} className="w-full h-full object-cover" onError={(e) => {
                            const img = e.currentTarget as HTMLImageElement;
                            const fallback = getAlternateImageUrl(p.imageUrl, img.src);
                            if (fallback && !img.dataset.fallbackTried) {
                              img.dataset.fallbackTried = '1';
                              img.src = fallback;
                              return;
                            }
                            img.src = getPlaceholderImage();
                          }} />
                          : <Package size={14} style={{ color: "#334155" }} />}
                      </div>
                      <div>
                        <button onClick={() => void openDetail(p)} className="text-sm font-bold text-gray-900 hover:text-indigo-600 transition text-left">
                          {p.name}
                        </button>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {p.requiresDesign && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600">Customizable</span>
                          )}
                          {p.designMode && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 capitalize">{p.designMode}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{p.category}</span>
                      <div className="mt-1">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize ${
                          p.flowType === 'gifting' ? 'bg-pink-50 text-pink-600' :
                          p.flowType === 'shopping' ? 'bg-green-50 text-green-600' :
                          'bg-blue-50 text-blue-600'
                        }`}>{p.flowType}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {(p.discount_pct ?? 0) > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-gray-900">₹{p.sale_price}</span>
                          <span className="text-xs text-gray-400 line-through">₹{p.mrp}</span>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 w-fit">{p.discount_pct}% OFF</span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-sm font-bold text-gray-900">₹{p.basePrice}</span>
                        <span className="text-xs text-gray-400 ml-1">{p.unit}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {p.designMode ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 capitalize">{p.designMode}</span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${p.active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                      {p.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => void openDetail(p)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition" title="View details">
                        <Layers size={13} />
                      </button>
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition" title="Edit product">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => openDiscount(p)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition" title="Set discount">
                        <Tag size={13} />
                      </button>                      {(p.discount_pct ?? 0) > 0 && (
                        <button onClick={() => clearDiscount(p)} className="p-1.5 rounded-lg hover:bg-orange-50 text-gray-400 hover:text-orange-500 transition" title="Clear discount">
                          <X size={13} />
                        </button>
                      )}
                      <button onClick={() => openHistory(p)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition" title="Discount history">
                        <History size={13} />
                      </button>
                      <button onClick={() => remove(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition" title="Delete product">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <p className="text-sm font-semibold text-gray-500">
                      {products.length === 0 ? "No products available. Add your first product to get started." : "No products match your search criteria."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="admin-modal-overlay">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-gray-900">{editId ? "Edit Product" : "Add Product"}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Fill in product details — all fields help admin and customers</p>
              </div>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            {saved ? (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-green-50 border border-green-100">
                <CheckCircle size={16} className="text-green-600" />
                <p className="text-sm font-bold text-green-800">Product saved successfully.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* ── Basic Info ── */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Basic Info</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Product Name *</label>
                      <input type="text" placeholder="e.g. Custom Photo Watch"
                        value={form.name}
                        onChange={e => setForm(p => ({ ...p, name: e.target.value, slug: p.slug || e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Flow Type *</label>
                        <select value={form.flowType} onChange={e => setForm(p => ({ ...p, flowType: e.target.value }))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition">
                          {FLOW_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Category *</label>
                        <select value={form.categoryId}
                          onChange={e => { const c = categories.find((c: any) => c.id === e.target.value); setForm(p => ({ ...p, categoryId: e.target.value, categoryName: c?.name || "" })); }}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition">
                          <option value="">Select category</option>
                          {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Description</label>
                      <textarea placeholder="What is this product? Who is it for?" value={form.description}
                        onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition resize-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Highlights (one per line)</label>
                      <textarea placeholder={"Premium quality print\nFast delivery\nCustomizable design"} value={form.highlights}
                        onChange={e => setForm(p => ({ ...p, highlights: e.target.value }))} rows={3}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition resize-none font-mono" />
                    </div>
                  </div>
                </div>
                {/* ── Pricing ── */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Pricing</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Base Price (₹) *</label>
                      <input type="number" placeholder="e.g. 899" value={form.basePrice}
                        onChange={e => setForm(p => ({ ...p, basePrice: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">MRP (₹)</label>
                      <input type="number" placeholder="e.g. 1199" value={form.mrp}
                        onChange={e => setForm(p => ({ ...p, mrp: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Unit</label>
                      <input type="text" placeholder="per piece" value={form.unit}
                        onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
                    </div>
                  </div>
                  {form.mrp && form.basePrice && Number(form.mrp) > Number(form.basePrice) && (
                    <p className="text-xs text-emerald-600 font-semibold mt-1.5">
                      ✓ {Math.round((1 - Number(form.basePrice) / Number(form.mrp)) * 100)}% discount from MRP
                    </p>
                  )}
                </div>
                {/* ── Customization ── */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Customization</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Design Mode</label>
                      <select value={form.designMode} onChange={e => setForm(p => ({ ...p, designMode: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition">
                        {DESIGN_MODES.map(dm => <option key={dm.value} value={dm.value}>{dm.label}</option>)}
                      </select>
                      <p className="text-[10px] text-gray-400 mt-1">Premium = template editor · Normal = free-form · Both = user chooses</p>
                    </div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={form.requiresDesign} onChange={e => setForm(p => ({ ...p, requiresDesign: e.target.checked }))} className="rounded" />
                        <span className="text-sm font-semibold text-gray-700">Requires Design</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={form.requiresUpload} onChange={e => setForm(p => ({ ...p, requiresUpload: e.target.checked }))} className="rounded" />
                        <span className="text-sm font-semibold text-gray-700">Requires Upload</span>
                      </label>
                    </div>
                  </div>
                </div>
                {/* ── Image ── */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Product Image</p>
                  <div className="flex items-center gap-2">
                    {imagePreview && (
                      <img src={resolveImageUrl(imagePreview)} alt="preview" className="w-12 h-12 rounded-xl object-cover border border-gray-200 flex-shrink-0"
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          const fallback = getAlternateImageUrl(imagePreview, img.src);
                          if (fallback && !img.dataset.fallbackTried) {
                            img.dataset.fallbackTried = '1';
                            img.src = fallback;
                            return;
                          }
                          img.src = getPlaceholderImage();
                        }} />
                    )}
                    <div className="flex-1 flex items-center gap-2">
                      <input type="text" placeholder="https://cdn.example.com/..." value={form.imageUrl}
                        onChange={e => { setForm(p => ({ ...p, imageUrl: e.target.value })); setImagePreview(e.target.value || null); }}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-gray-900 transition" />
                      <label className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition flex-shrink-0 ${imageUploading ? "opacity-50 pointer-events-none border-gray-200 text-gray-400" : "border-gray-300 text-gray-600 hover:border-gray-900"}`}>
                        <Upload size={12} />
                        {imageUploading ? "Uploading..." : "Upload"}
                        <input type="file" accept="image/*" className="hidden" disabled={imageUploading}
                          onChange={async e => {
                            const file = e.target.files?.[0]; if (!file) return;
                            const localPreview = URL.createObjectURL(file);
                            setImagePreview(localPreview);
                            setImageUploading(true);
                            try {
                              const persistentPreview = await createPersistentPreview(file).catch(() => "");
                              setLocalSelectedImagePreview(persistentPreview);
                              const url = await uploadImage(file, 'products');
                              setForm(p => ({ ...p, imageUrl: url }));
                            }
                            catch (err: any) { alert(err?.message || "Upload failed"); }
                            finally { setImageUploading(false); e.target.value = ""; }
                          }} />
                      </label>
                    </div>
                  </div>
                  {imagePreview && (
                    <button type="button" onClick={() => {
                      setImagePreview(null);
                      setLocalSelectedImagePreview("");
                      setForm(p => ({ ...p, imageUrl: '' }));
                      if (editId) {
                        setLocalProductImagePreviews(prev => {
                          const next = { ...prev };
                          delete next[editId];
                          persistLocalProductImagePreviews(next);
                          return next;
                        });
                      }
                    }}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold mt-1.5">Remove image</button>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
                  <button onClick={save} disabled={!form.name || !form.categoryId || !form.basePrice}
                    className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl disabled:opacity-40"
                    style={{ backgroundColor: "#334155" }}>Save Product</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── Set Discount Modal ─────────────────────────────────────────────── */}
      {discountProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Set Discount</h2>
                <p className="text-xs text-gray-400 mt-0.5">{discountProduct.name}</p>
              </div>
              <button onClick={() => setDiscountProduct(null)}><X size={18} className="text-gray-400" /></button>
            </div>

            {discountSuccess ? (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-green-50 border border-green-100">
                <CheckCircle size={16} className="text-green-600" />
                <p className="text-sm font-bold text-green-800">{discountSuccess}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mode toggle */}
                <div className="flex rounded-xl overflow-hidden border border-gray-200">
                  {(["pct", "price"] as const).map(m => (
                    <button key={m} onClick={() => setDiscountForm(f => ({ ...f, mode: m }))}
                      className="flex-1 py-2 text-xs font-bold transition"
                      style={{ backgroundColor: discountForm.mode === m ? "#334155" : "#fff", color: discountForm.mode === m ? "#fff" : "#64748b" }}>
                      {m === "pct" ? "MRP + Discount %" : "MRP + Sale Price"}
                    </button>
                  ))}
                </div>

                {/* MRP */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">MRP (₹) *</label>
                  <input type="number" min="0" placeholder="e.g. 1000"
                    value={discountForm.mrp}
                    onChange={e => setDiscountForm(f => ({ ...f, mrp: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
                </div>

                {discountForm.mode === "pct" ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Discount % *</label>
                    <input type="number" min="0" max="100" placeholder="e.g. 15"
                      value={discountForm.discount_pct}
                      onChange={e => setDiscountForm(f => ({ ...f, discount_pct: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
                    {discountForm.mrp && discountForm.discount_pct && (
                      <p className="text-xs text-gray-400 mt-1">
                        Sale price → ₹{Math.round(Number(discountForm.mrp) * (1 - Number(discountForm.discount_pct) / 100))}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Sale Price (₹) *</label>
                    <input type="number" min="0" placeholder="e.g. 850"
                      value={discountForm.sale_price}
                      onChange={e => setDiscountForm(f => ({ ...f, sale_price: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
                    {discountForm.mrp && discountForm.sale_price && Number(discountForm.mrp) > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Discount → {Math.round((1 - Number(discountForm.sale_price) / Number(discountForm.mrp)) * 100)}% OFF
                      </p>
                    )}
                  </div>
                )}

                {/* Badge */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Badge</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {["", ...BADGE_OPTIONS].map(b => (
                      <button key={b || "none"} onClick={() => setDiscountForm(f => ({ ...f, badge: b }))}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition border"
                        style={{
                          backgroundColor: discountForm.badge === b ? "#334155" : "#fff",
                          color: discountForm.badge === b ? "#fff" : "#64748b",
                          borderColor: discountForm.badge === b ? "#334155" : "#e2e8f0",
                        }}>
                        {b || "None"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Note (optional)</label>
                  <input type="text" placeholder="e.g. Summer sale"
                    value={discountForm.note}
                    onChange={e => setDiscountForm(f => ({ ...f, note: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
                </div>

                {discountError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                    <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                    <p className="text-xs font-semibold text-red-600">{discountError}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button onClick={() => setDiscountProduct(null)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                    Cancel
                  </button>
                  <button onClick={saveDiscount} disabled={discountSaving}
                    className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl transition disabled:opacity-50"
                    style={{ backgroundColor: "#334155" }}>
                    {discountSaving ? "Saving..." : "Apply Discount"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Bulk Discount Modal ─────────────────────────────────────────────── */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Bulk Discount</h2>
                <p className="text-xs text-gray-400 mt-0.5">{selectedIds.length} product(s) selected</p>
              </div>
              <button onClick={() => setShowBulkModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Discount % *</label>
                <input type="number" min="0" max="100" placeholder="e.g. 20"
                  value={bulkForm.discount_pct}
                  onChange={e => setBulkForm(f => ({ ...f, discount_pct: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Badge</label>
                <div className="flex gap-1.5 flex-wrap">
                  {["", ...BADGE_OPTIONS].map(b => (
                    <button key={b || "none"} onClick={() => setBulkForm(f => ({ ...f, badge: b }))}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition border"
                      style={{
                        backgroundColor: bulkForm.badge === b ? "#6366f1" : "#fff",
                        color: bulkForm.badge === b ? "#fff" : "#64748b",
                        borderColor: bulkForm.badge === b ? "#6366f1" : "#e2e8f0",
                      }}>
                      {b || "None"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Note (optional)</label>
                <input type="text" placeholder="e.g. Summer sale"
                  value={bulkForm.note}
                  onChange={e => setBulkForm(f => ({ ...f, note: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
              </div>

              {bulkError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                  <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                  <p className="text-xs font-semibold text-red-600">{bulkError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowBulkModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button onClick={saveBulkDiscount} disabled={bulkSaving}
                  className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl transition disabled:opacity-50"
                  style={{ backgroundColor: "#6366f1" }}>
                  {bulkSaving ? "Applying..." : `Apply to ${selectedIds.length}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Discount History Drawer ─────────────────────────────────────────── */}
      {historyProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">Discount History</h2>
                <p className="text-xs text-gray-400 mt-0.5">{historyProduct.name}</p>
              </div>
              <button onClick={() => setHistoryProduct(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4">
              {historyLoading ? (
                <div className="flex items-center justify-center py-10">
                  <RefreshCw size={18} className="animate-spin text-gray-400" />
                </div>
              ) : historyData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <History size={28} className="text-gray-300" />
                  <p className="text-sm text-gray-400">No discount history yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyData.map((h: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <ChevronRight size={12} className="text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-gray-900">
                            {h.discount_pct ?? 0}% OFF
                          </span>
                          {h.mrp && <span className="text-xs text-gray-400">MRP ₹{h.mrp}</span>}
                          {h.sale_price && <span className="text-xs text-gray-500">→ ₹{h.sale_price}</span>}
                          {h.badge && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-500 capitalize">{h.badge}</span>
                          )}
                        </div>
                        {h.note && <p className="text-xs text-gray-400 mt-0.5 italic">"{h.note}"</p>}
                        <div className="flex items-center gap-2 mt-1">
                          {h.changed_by && <span className="text-[10px] text-gray-400">by {h.changed_by}</span>}
                          {h.changed_at && (
                            <span className="text-[10px] text-gray-400">
                              {new Date(h.changed_at).toLocaleDateString()} {new Date(h.changed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Product Detail Panel ─────────────────────────────────────────────── */}
      {detailProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[88vh]">
            {/* Header */}
            <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 flex-shrink-0">
              {detailProduct.imageUrl && (
                <img src={resolveImageUrl(detailProduct.imageUrl)} alt={detailProduct.name}
                  className="w-14 h-14 rounded-xl object-cover border border-gray-200 flex-shrink-0"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    const fallback = getAlternateImageUrl(detailProduct.imageUrl, img.src);
                    if (fallback && !img.dataset.fallbackTried) {
                      img.dataset.fallbackTried = '1';
                      img.src = fallback;
                      return;
                    }
                    img.src = getPlaceholderImage();
                  }} />
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-gray-900 truncate">{detailProduct.name}</h2>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize ${
                    detailProduct.flowType === 'gifting' ? 'bg-pink-50 text-pink-600' :
                    detailProduct.flowType === 'shopping' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                  }`}>{detailProduct.flowType}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{detailProduct.category}</span>
                  {detailProduct.requiresDesign && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600">Customizable</span>
                  )}
                  {detailProduct.designMode && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 capitalize">{detailProduct.designMode} design</span>
                  )}
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${detailProduct.active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                    {detailProduct.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => { setDetailProduct(null); openEdit(detailProduct); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-gray-900 transition">
                  <Edit2 size={12} /> Edit
                </button>
                <button onClick={() => setDetailProduct(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw size={18} className="animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  {/* Pricing */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Base Price", value: `₹${detailProduct.basePrice}` },
                      { label: "MRP", value: detailProduct.mrp ? `₹${detailProduct.mrp}` : "—" },
                      { label: "Discount", value: (detailProduct.discount_pct ?? 0) > 0 ? `${detailProduct.discount_pct}% OFF` : "—" },
                    ].map(item => (
                      <div key={item.label} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">{item.label}</p>
                        <p className="text-sm font-black text-gray-900">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Description */}
                  {detailProduct.description && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Description</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{detailProduct.description}</p>
                    </div>
                  )}

                  {/* Variants */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Sliders size={11} /> Variants ({detailVariants.length})
                      </p>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${detailVariants.length > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {detailVariants.length > 0 ? `${detailVariants.length} variant${detailVariants.length > 1 ? 's' : ''}` : 'No variants yet'}
                      </span>
                    </div>
                    {detailVariants.length > 0 ? (
                      <div className="space-y-2">
                        {detailVariants.map((v: any) => {
                          const specs = v.specifications || {};
                          const specPills = Object.entries(specs).slice(0, 4);
                          return (
                            <div key={v._id || v.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-gray-900">{v.name}</p>
                                  <span className="text-[9px] font-mono text-gray-400">{v.sku}</span>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {specPills.map(([k, val]) => (
                                    <span key={k} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                                      {k}: {String(val)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-black text-gray-900">₹{v.price}</p>
                                {v.mrp && v.mrp > v.price && (
                                  <p className="text-[10px] text-gray-400 line-through">₹{v.mrp}</p>
                                )}
                              </div>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${v.isActive !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                {v.isActive !== false ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                        <Sliders size={16} className="opacity-40" />
                        <p className="text-sm">No variants yet. Go to Variants page to add size/material options.</p>
                      </div>
                    )}
                  </div>

                  {/* Templates */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <LayoutTemplate size={11} /> Templates ({detailTemplates.length})
                      </p>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        detailTemplates.some(t => t.status === 'published') ? 'bg-emerald-50 text-emerald-600' :
                        detailTemplates.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {detailTemplates.some(t => t.status === 'published') ? 'Has Published Template' :
                         detailTemplates.length > 0 ? 'Draft Only' : 'No Templates'}
                      </span>
                    </div>
                    {detailTemplates.length > 0 ? (
                      <div className="space-y-2">
                        {detailTemplates.map((t: any) => {
                          const isPublished = t.status === 'published' || t.isPublished;
                          const slotCount = Array.isArray(t.slots) ? t.slots.length : 0;
                          const imgSlots = Array.isArray(t.slots) ? t.slots.filter((s: any) => s.type === 'image').length : 0;
                          const txtSlots = slotCount - imgSlots;
                          return (
                            <div key={t._id || t.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-gray-900">{t.name}</p>
                                  <span className="text-[9px] text-gray-400">v{t.version || 1}</span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1">
                                  {imgSlots > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">{imgSlots} img</span>}
                                  {txtSlots > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">{txtSlots} text</span>}
                                  {t.canvas && <span className="text-[9px] text-gray-400">{t.canvas.width}×{t.canvas.height}px</span>}
                                </div>
                              </div>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${isPublished ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                {isPublished ? 'Published' : 'Draft'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                        <LayoutTemplate size={16} className="opacity-40" />
                        <p className="text-sm">No templates yet. Go to Templates page to create a customization layout.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 flex gap-3">
              <button onClick={() => setDetailProduct(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
