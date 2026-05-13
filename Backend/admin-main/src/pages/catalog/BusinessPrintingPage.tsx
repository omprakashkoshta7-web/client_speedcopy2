import { useEffect, useState } from "react";
import { Info, Printer, Search, Plus, Edit2, Trash2, X, Check, AlertCircle } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import {
  getBusinessPrintingProducts,
  createBusinessPrintingProduct,
  updateBusinessPrintingProduct,
  deleteBusinessPrintingProduct,
  adminUploadImage,
} from "../../api/admin";
import LoadingState from "../../components/ui/LoadingState";

const BUSINESS_PRINT_TYPES = [
  { id: "business_card", label: "Business Cards" },
  { id: "flyers", label: "Flyers & Leaflets" },
  { id: "brochures", label: "Brochures" },
  { id: "posters", label: "Posters" },
  { id: "letterheads", label: "Letterheads" },
  { id: "custom_stationery", label: "Custom Stationery" },
];

interface FormData {
  name: string;
  businessPrintType: string;
  basePrice: number;
  description: string;
  designMode: string;
  isFeatured: boolean;
  isActive: boolean;
  thumbnail: string;
  images: string[];
}

const emptyForm = (): FormData => ({
  name: "",
  businessPrintType: "business_card",
  basePrice: 0,
  description: "",
  designMode: "both",
  isFeatured: false,
  isActive: true,
  thumbnail: "",
  images: [],
});

export default function BusinessPrintingPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data: productsData, loading, refetch } = useAsync(
    () => getBusinessPrintingProducts({ limit: 100 }),
    null,
    []
  );

  useEffect(() => {
    try {
      let arr: any[] = [];
      if (productsData && typeof productsData === "object") {
        if ("products" in productsData && Array.isArray((productsData as any).products)) {
          arr = (productsData as any).products;
        } else if (Array.isArray(productsData)) {
          arr = productsData as any[];
        }
      }
      setProducts(
        arr.map((p: any) => ({
          _id: p._id || p.id,
          name: p.name,
          businessPrintType: p.business_print_type || p.businessPrintType || "",
          basePrice: p.base_price || p.basePrice || 0,
          active: p.isActive !== false,
          imageUrl: p.thumbnail || p.images?.[0] || "",
          isFeatured: Boolean(p.is_featured || p.isFeatured),
          designMode: p.design_mode || p.designMode || "both",
          description: p.description || "",
        }))
      );
    } catch (error) {
      console.error("Failed to map business printing products:", error);
      setProducts([]);
    }
  }, [productsData]);

  const filtered = products.filter(
    (product) =>
      (typeFilter === "all" || product.businessPrintType === typeFilter) &&
      product.name.toLowerCase().includes(search.toLowerCase())
  );

  const typeLabel = (id: string) =>
    BUSINESS_PRINT_TYPES.find((type) => type.id === id)?.label || id || "Unknown";

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm());
    setSaveError("");
    setShowModal(true);
  };

  const openEdit = (product: any) => {
    setEditId(product._id);
    setForm({
      name: product.name,
      businessPrintType: product.businessPrintType,
      basePrice: product.basePrice,
      description: product.description || "",
      designMode: product.designMode,
      isFeatured: product.isFeatured,
      isActive: product.active,
      thumbnail: product.imageUrl,
      images: [],
    });
    setSaveError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setSaveError("Product name is required"); return; }
    if (form.basePrice <= 0) { setSaveError("Base price must be greater than 0"); return; }
    setSaving(true);
    setSaveError("");
    try {
      if (editId) {
        await updateBusinessPrintingProduct(editId, {
          name: form.name,
          businessPrintType: form.businessPrintType,
          basePrice: form.basePrice,
          description: form.description,
          designMode: form.designMode,
          isFeatured: form.isFeatured,
          isActive: form.isActive,
          thumbnail: form.thumbnail,
        });
      } else {
        await createBusinessPrintingProduct({
          name: form.name,
          businessPrintType: form.businessPrintType,
          basePrice: form.basePrice,
          description: form.description,
          designMode: form.designMode,
          isFeatured: form.isFeatured,
          isActive: form.isActive,
          thumbnail: form.thumbnail,
          images: form.images.length > 0 ? form.images : (form.thumbnail ? [form.thumbnail] : []),
        });
      }
      setShowModal(false);
      refetch();
    } catch (err: any) {
      setSaveError(err?.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteBusinessPrintingProduct(deleteId);
      setDeleteId(null);
      refetch();
    } catch (err: any) {
      console.error("Delete failed:", err);
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (product: any) => {
    try {
      await updateBusinessPrintingProduct(product._id, { isActive: !product.active });
      refetch();
    } catch (err: any) {
      console.error("Toggle active failed:", err);
    }
  };

  const toggleFeatured = async (product: any) => {
    try {
      await updateBusinessPrintingProduct(product._id, { isFeatured: !product.isFeatured });
      refetch();
    } catch (err: any) {
      console.error("Toggle featured failed:", err);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const result = await adminUploadImage(file);
      if (result.url) {
        setForm((prev) => ({ ...prev, thumbnail: result.url }));
      }
    } catch (err: any) {
      console.error("Image upload failed:", err);
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingState message="Loading business printing catalog" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <div className="flex items-start gap-3">
          <Info size={18} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold">Business Printing Catalog</p>
            <p className="mt-1 text-blue-800">
              Create, edit, and manage business printing products. Products with <strong>businessPrintType</strong> field set will appear in customer-facing business printing pages.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-8 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none"
            />
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {[{ id: "all", label: "All" }, ...BUSINESS_PRINT_TYPES].map((type) => (
              <button
                key={type.id}
                onClick={() => setTypeFilter(type.id)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                style={{
                  backgroundColor: typeFilter === type.id ? "#334155" : "#fff",
                  color: typeFilter === type.id ? "#fff" : "#64748b",
                  border: `1px solid ${typeFilter === type.id ? "#334155" : "#e2e8f0"}`,
                }}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90"
          style={{ backgroundColor: "#334155" }}
        >
          <Plus size={14} />
          Create Product
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: products.length, color: "#334155" },
          { label: "Active", value: products.filter((product) => product.active).length, color: "#10b981" },
          { label: "Featured", value: products.filter((product) => product.isFeatured).length, color: "#f59e0b" },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-black" style={{ color: item.color }}>{item.value}</p>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Product", "Type", "Base Price", "Design Mode", "Featured", "Status", "Actions"].map((heading) => (
                  <th key={heading} className="text-left text-xs font-bold text-gray-400 uppercase tracking-wide px-4 py-3">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((product, index) => (
                  <tr
                    key={product._id}
                    className="hover:bg-gray-50 transition"
                    style={{ borderBottom: index < filtered.length - 1 ? "1px solid #f1f5f9" : "none" }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-100">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Printer size={14} className="text-slate-700" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-400">{product._id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                        {typeLabel(product.businessPrintType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">₹{product.basePrice}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 capitalize">{product.designMode}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleFeatured(product)} className="focus:outline-none">
                        {product.isFeatured ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-600 flex items-center gap-1">
                            <Check size={10} /> Featured
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 hover:text-amber-500 transition">Set featured</span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(product)} className="focus:outline-none">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold transition ${
                          product.active ? "bg-emerald-50 text-emerald-600 hover:bg-red-50 hover:text-red-600" : "bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
                        }`}>
                          {product.active ? "Active" : "Inactive"}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(product)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition"
                          title="Edit product"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteId(product._id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600 transition"
                          title="Delete product"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                    {products.length === 0 ? "No business printing products yet. Click 'Create Product' to add one." : "No products match your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {editId ? "Edit Product" : "Create Product"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Product Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Premium Matte Business Cards"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Business Print Type *</label>
                <select
                  value={form.businessPrintType}
                  onChange={(e) => setForm((p) => ({ ...p, businessPrintType: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                >
                  {BUSINESS_PRINT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Base Price (₹) *</label>
                <input
                  type="number"
                  value={form.basePrice}
                  onChange={(e) => setForm((p) => ({ ...p, basePrice: Math.max(0, Number(e.target.value)) }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="299"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="High-quality matte finish business cards"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Design Mode</label>
                <select
                  value={form.designMode}
                  onChange={(e) => setForm((p) => ({ ...p, designMode: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                >
                  <option value="both">Both (Premium & Normal)</option>
                  <option value="premium">Premium Only</option>
                  <option value="normal">Normal Only</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Thumbnail Image</label>
                <div className="flex items-center gap-3">
                  {form.thumbnail && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                      <img src={form.thumbnail} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <label className="cursor-pointer px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition">
                    {uploadingImage ? "Uploading..." : "Upload Image"}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                  </label>
                  {form.thumbnail && (
                    <button
                      onClick={() => setForm((p) => ({ ...p, thumbnail: "" }))}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => setForm((p) => ({ ...p, isFeatured: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-xs font-medium text-gray-600">Featured</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-xs font-medium text-gray-600">Active</span>
                </label>
              </div>

              {saveError && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 text-red-600 text-xs">
                  <AlertCircle size={14} />
                  {saveError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#334155" }}
              >
                {saving ? "Saving..." : editId ? "Update Product" : "Create Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={20} className="text-red-500" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Delete Product</h2>
                <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}