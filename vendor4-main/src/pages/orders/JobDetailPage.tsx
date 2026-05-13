import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, CheckCircle, PlayCircle, ShieldCheck,
  Truck, XCircle, Camera, RefreshCw, Package,
  Clock, X, Upload, Search, Star, Bike
} from "lucide-react";
import LoadingState from "../../components/ui/LoadingState";
import Alert from "../../components/ui/Alert";
import { COLORS } from "../../utils/colors";
import {
  acceptVendorOrder,
  getVendorOrder,
  rejectVendorOrder,
  uploadQcImages,
  uploadQcImagesMultipart,
  markOrderReady,
  startVendorProduction,
  markVendorQcPending,
  handoverComplete,
  getAvailableDeliveryPartners,
  type DeliveryPartner,
} from "../../services/vendor.service";
import type { VendorOrder } from "../../types/vendor";

// Production pipeline steps
const PIPELINE = [
  { status: "assigned_vendor",   label: "Assigned",    color: COLORS.warning },
  { status: "vendor_accepted",   label: "Accepted",    color: COLORS.info },
  { status: "in_production",     label: "Production",  color: "#8b5cf6" },
  { status: "qc_pending",        label: "QC Review",   color: "#f59e0b" },
  { status: "ready_for_pickup",  label: "Ready",       color: COLORS.success },
  { status: "out_for_delivery",  label: "Delivery",    color: COLORS.primary },
  { status: "delivered",         label: "Delivered",   color: COLORS.success },
];

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  assigned_vendor:  { color: COLORS.warning,  bg: COLORS.warningBg,  border: COLORS.warningBorder },
  vendor_accepted:  { color: COLORS.info,     bg: COLORS.infoBg,     border: COLORS.infoBorder },
  in_production:    { color: "#8b5cf6",       bg: "#f5f3ff",         border: "#ddd6fe" },
  qc_pending:       { color: "#f59e0b",       bg: "#fffbeb",         border: "#fde68a" },
  ready_for_pickup: { color: COLORS.success,  bg: COLORS.successBg,  border: COLORS.successBorder },
  out_for_delivery: { color: COLORS.primary,  bg: `${COLORS.primary}18`, border: `${COLORS.primary}40` },
  delivered:        { color: COLORS.success,  bg: COLORS.successBg,  border: COLORS.successBorder },
  cancelled:        { color: COLORS.error,    bg: COLORS.errorBg,    border: COLORS.errorBorder },
};

export default function JobDetailPage() {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const [order, setOrder] = useState<VendorOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // QC upload modal
  const [showQcModal, setShowQcModal] = useState(false);
  const [qcImageUrls, setQcImageUrls] = useState("");
  const [qcNote, setQcNote] = useState("");
  const [qcFiles, setQcFiles] = useState<File[]>([]);
  const [qcUploadMode, setQcUploadMode] = useState<"url" | "file">("file");

  // Handover modal
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [handoverNote, setHandoverNote] = useState("");
  const [handoverRiders, setHandoverRiders] = useState<DeliveryPartner[]>([]);
  const [handoverRidersLoading, setHandoverRidersLoading] = useState(false);
  const [handoverRiderSearch, setHandoverRiderSearch] = useState("");
  const [selectedHandoverRider, setSelectedHandoverRider] = useState<DeliveryPartner | null>(null);

  const openHandoverModal = async () => {
    setShowHandoverModal(true);
    setSelectedHandoverRider(null);
    setHandoverRiderSearch("");
    setHandoverNote("");
    setHandoverRidersLoading(true);
    try {
      const res = await getAvailableDeliveryPartners({ limit: 20 });
      console.log("🚴 Riders API Response:", res);
      const raw = res.data;
      console.log("🚴 Raw data:", raw);
      const list: DeliveryPartner[] = Array.isArray(raw) ? raw
        : Array.isArray((raw as any)?.riders) ? (raw as any).riders
        : Array.isArray((raw as any)?.deliveryPartners) ? (raw as any).deliveryPartners
        : [];
      console.log("🚴 Processed riders list:", list);
      setHandoverRiders(list);
    } catch (err) {
      console.error("❌ Error loading riders:", err);
      setHandoverRiders([]);
    }
    finally { setHandoverRidersLoading(false); }
  };

  const filteredHandoverRiders = handoverRiderSearch.trim()
    ? handoverRiders.filter(r => {
        const name = r.name || "";
        const phone = r.phone || "";
        const s = handoverRiderSearch.toLowerCase();
        return name.toLowerCase().includes(s) || phone.includes(handoverRiderSearch);
      })
    : handoverRiders;

  // API 2: GET /api/vendor/orders/:id
  const loadOrder = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getVendorOrder(id);
      setOrder(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadOrder(); }, [id]);

  const sc = order ? (STATUS_STYLE[order.status] || STATUS_STYLE.assigned_vendor) : STATUS_STYLE.assigned_vendor;

  const pipelineIndex = useMemo(() =>
    PIPELINE.findIndex(p => p.status === order?.status), [order]);

  const canAccept = order?.status === "assigned_vendor";
  const canStartProduction = order?.status === "vendor_accepted";
  const canMarkQc = order?.status === "in_production";
  const canMarkReady = order?.status === "qc_pending";
  const canHandover = order?.status === "ready_for_pickup";
  const isTerminal = ["delivered", "cancelled"].includes(order?.status || "");

  // API 3: POST /api/vendor/orders/:id/accept
  const handleAccept = async () => {
    if (!order) return;
    setBusyAction("accept");
    try {
      const res = await acceptVendorOrder(order._id);
      setOrder(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept order");
    } finally {
      setBusyAction("");
    }
  };

  // API 4: POST /api/vendor/orders/:id/reject
  const handleReject = async () => {
    if (!order || !rejectReason.trim()) return;
    setBusyAction("reject");
    try {
      const res = await rejectVendorOrder(order._id, rejectReason.trim());
      setOrder(res.data);
      setShowRejectModal(false);
      setRejectReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject order");
    } finally {
      setBusyAction("");
    }
  };

  // API 5: POST /api/vendor/orders/:id/status (kept for generic use if needed)
  // Note: production steps use dedicated PATCH endpoints via startVendorProduction / markVendorQcPending

  // API 6: POST /api/vendor/orders/:id/qc-upload
  const handleQcUpload = async () => {
    if (!order) return;
    
    if (qcUploadMode === "file") {
      // File upload mode
      if (qcFiles.length === 0) { 
        setError("Select at least one image file"); 
        return; 
      }
      setBusyAction("qc");
      try {
        const res = await uploadQcImagesMultipart(order._id, qcFiles, qcNote);
        setOrder(res.data);
        setShowQcModal(false);
        setQcFiles([]);
        setQcNote("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload QC images");
      } finally {
        setBusyAction("");
      }
    } else {
      // URL mode (legacy)
      const urls = qcImageUrls.split("\n").map(u => u.trim()).filter(Boolean);
      if (urls.length === 0) { 
        setError("Enter at least one image URL"); 
        return; 
      }
      setBusyAction("qc");
      try {
        const res = await uploadQcImages(order._id, urls, qcNote);
        setOrder(res.data);
        setShowQcModal(false);
        setQcImageUrls("");
        setQcNote("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload QC images");
      } finally {
        setBusyAction("");
      }
    }
  };

  const handleQcFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      setError("Maximum 5 images allowed");
      return;
    }
    setQcFiles(files);
  };

  // API 7: POST /api/vendor/orders/:id/ready
  const handleMarkReady = async () => {
    if (!order) return;
    setBusyAction("ready");
    try {
      const res = await markOrderReady(order._id);
      setOrder(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark ready");
    } finally {
      setBusyAction("");
    }
  };

  if (loading) return <LoadingState message="Loading order details" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">Order Details</h1>
          <p className="text-sm text-gray-500 mt-0.5">View and manage order</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/orders")}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition">
            <ArrowLeft size={16} /> Back
          </button>
          <button onClick={() => void loadOrder()}
            className="p-2 rounded-xl border border-gray-200 hover:border-gray-900 transition">
            <RefreshCw size={14} className="text-gray-500" />
          </button>
        </div>
      </div>

      {error && (
        <Alert type="error" message={error} onClose={() => setError("")} />
      )}

      {/* Order Header */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xl font-black text-gray-900 font-mono">
              {order?.orderNumber || `#${id.slice(-8).toUpperCase()}`}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              {order?.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}
            </p>
          </div>
          <span className="rounded-full border px-3 py-1.5 text-xs font-bold uppercase"
            style={{ backgroundColor: sc.bg, color: sc.color, borderColor: sc.border }}>
            {order?.status?.replace(/_/g, " ")}
          </span>
        </div>

        {/* Pipeline Progress */}
        <div className="mb-5">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {PIPELINE.map((step, i) => {
              const done = i <= pipelineIndex;
              const current = i === pipelineIndex;
              return (
                <div key={step.status} className="flex items-center gap-1 flex-shrink-0">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition"
                      style={{
                        backgroundColor: done ? step.color : "white",
                        borderColor: done ? step.color : "#e5e7eb",
                        color: done ? "white" : "#9ca3af",
                        boxShadow: current ? `0 0 0 3px ${step.color}30` : "none",
                      }}>
                      {i + 1}
                    </div>
                    <p className="text-xs mt-1 font-semibold" style={{ color: done ? step.color : "#9ca3af" }}>
                      {step.label}
                    </p>
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <div className="w-6 h-0.5 mb-4 flex-shrink-0"
                      style={{ backgroundColor: i < pipelineIndex ? COLORS.success : "#e5e7eb" }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Financials */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Total Amount</p>
            <p className="text-xl font-black text-gray-900">₹{order?.total || 0}</p>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Subtotal</p>
            <p className="text-xl font-black text-gray-900">₹{order?.subtotal || 0}</p>
          </div>
        </div>

        {/* Action Buttons */}
        {!isTerminal && (
          <div className="flex flex-wrap gap-2">
            {/* API 3: Accept */}
            {canAccept && (
              <>
                <button onClick={() => setShowRejectModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition"
                  style={{ backgroundColor: COLORS.errorBg, color: COLORS.error }}>
                  <XCircle size={15} /> Reject
                </button>
                <button onClick={() => void handleAccept()} disabled={busyAction === "accept"}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
                  style={{ backgroundColor: COLORS.success }}>
                  <CheckCircle size={15} />
                  {busyAction === "accept" ? "Accepting..." : "Accept Order"}
                </button>
              </>
            )}

            {/* API 5: Start Production — PATCH /start-production */}
            {canStartProduction && (
              <button onClick={async () => {
                setBusyAction("in_production");
                try {
                  const res = await startVendorProduction(order!._id);
                  setOrder(res.data);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to start production");
                } finally { setBusyAction(""); }
              }}
                disabled={busyAction === "in_production"}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
                style={{ backgroundColor: "#8b5cf6" }}>
                <PlayCircle size={15} />
                {busyAction === "in_production" ? "Starting..." : "Start Production"}
              </button>
            )}

            {/* API 6: QC Upload + Mark QC Pending — PATCH /qc-pending */}
            {canMarkQc && (
              <>
                <button onClick={() => setShowQcModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition"
                  style={{ backgroundColor: "#fffbeb", color: "#f59e0b" }}>
                  <Camera size={15} /> Upload QC Images
                </button>
                <button onClick={async () => {
                  setBusyAction("qc_pending");
                  try {
                    const res = await markVendorQcPending(order!._id);
                    setOrder(res.data);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to mark QC pending");
                  } finally { setBusyAction(""); }
                }}
                  disabled={busyAction === "qc_pending"}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
                  style={{ backgroundColor: "#f59e0b" }}>
                  <ShieldCheck size={15} />
                  {busyAction === "qc_pending" ? "Updating..." : "Mark QC Pending"}
                </button>
              </>
            )}

            {/* API 7: Mark Ready */}
            {canMarkReady && (
              <button onClick={() => void handleMarkReady()} disabled={busyAction === "ready"}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
                style={{ backgroundColor: COLORS.success }}>
                <Truck size={15} />
                {busyAction === "ready" ? "Updating..." : "Ready for Pickup"}
              </button>
            )}

            {/* Handover Complete — POST /handover-complete */}
            {canHandover && (
              <button onClick={() => void openHandoverModal()}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition"
                style={{ backgroundColor: COLORS.primary }}>
                <Truck size={15} /> Handover to Rider
              </button>
            )}
          </div>
        )}
      </div>

      {/* Order Items */}
      {order?.items && order.items.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm scroll-card">
          <div className="flex items-center gap-2 mb-4 flex-shrink-0">
            <Package size={16} style={{ color: COLORS.primary }} />
            <h2 className="text-base font-bold text-gray-900">Order Items</h2>
          </div>
          <div className="scroll-card-body space-y-3 pr-1">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                <div>
                  <p className="text-sm font-bold text-gray-900">{item.productName || "Item"}</p>
                  <p className="text-xs text-gray-500">Qty: {item.quantity || 0}</p>
                </div>
              </div>
            ))}
          </div>
          {order.notes && (
            <div className="mt-3 p-3 rounded-xl border border-gray-200 bg-yellow-50 flex-shrink-0">
              <p className="text-xs font-bold text-yellow-700 mb-1">Order Notes</p>
              <p className="text-sm text-yellow-800">{order.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      {order?.timeline && order.timeline.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm scroll-card">
          <div className="flex items-center gap-2 mb-4 flex-shrink-0">
            <Clock size={16} style={{ color: COLORS.info }} />
            <h2 className="text-base font-bold text-gray-900">Order Timeline</h2>
          </div>
          <div className="scroll-card-body space-y-3 pr-1">
            {[...order.timeline].reverse().map((entry, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: COLORS.primary }} />
                <div className="flex-1 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-sm font-bold text-gray-900 capitalize">{entry.status?.replace(/_/g, " ")}</p>
                  {entry.note && <p className="text-xs text-gray-500 mt-0.5">{entry.note}</p>}
                  {entry.timestamp && (
                    <p className="text-xs text-gray-400 mt-1">{new Date(entry.timestamp).toLocaleString()}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reject Modal — API 4 */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl my-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Reject Order</h3>
              <button onClick={() => setShowRejectModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Select Reason *</label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {["Capacity full","Machine unavailable","Material shortage","Staff unavailable","Outside service area","Other"].map(r => (
                  <button key={r} type="button" onClick={() => setRejectReason(r)}
                    className="px-3 py-2 rounded-xl border text-xs font-semibold text-left transition"
                    style={{
                      backgroundColor: rejectReason === r ? `${COLORS.error}12` : "white",
                      borderColor: rejectReason === r ? COLORS.error : "#e5e7eb",
                      color: rejectReason === r ? COLORS.error : "#6b7280",
                    }}>
                    {r}
                  </button>
                ))}
              </div>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="Or type a custom reason..."
                className="w-full h-20 rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-900 transition resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={() => void handleReject()} disabled={!rejectReason.trim() || busyAction === "reject"}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
                style={{ backgroundColor: COLORS.error }}>
                {busyAction === "reject" ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QC Upload Modal — API 6 */}
      {showQcModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl my-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Upload QC Images</h3>
              <button onClick={() => setShowQcModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>

            {/* Upload Mode Tabs */}
            <div className="flex gap-2 mb-4 rounded-xl bg-gray-100 p-1">
              <button
                onClick={() => setQcUploadMode("file")}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                  qcUploadMode === "file"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}>
                📁 File Upload
              </button>
              <button
                onClick={() => setQcUploadMode("url")}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                  qcUploadMode === "url"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}>
                🔗 URL
              </button>
            </div>

            <div className="p-3 rounded-xl border mb-4"
              style={{ backgroundColor: COLORS.infoBg, borderColor: COLORS.infoBorder }}>
              <p className="text-xs font-bold" style={{ color: COLORS.info }}>
                {qcUploadMode === "file" 
                  ? "Upload up to 5 QC images (JPG, PNG, WebP)"
                  : "Upload up to 5 QC images. Enter one URL per line."}
              </p>
            </div>

            <div className="space-y-4 mb-5">
              {/* File Upload Mode */}
              {qcUploadMode === "file" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Select Images *
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleQcFileSelect}
                      className="hidden"
                      id="qc-file-input"
                      disabled={busyAction === "qc"}
                    />
                    <label
                      htmlFor="qc-file-input"
                      className="block w-full p-4 rounded-xl border-2 border-dashed border-gray-300 text-center cursor-pointer hover:border-gray-400 transition"
                      style={{
                        backgroundColor: qcFiles.length > 0 ? `${COLORS.success}10` : "transparent",
                        borderColor: qcFiles.length > 0 ? COLORS.success : undefined,
                      }}>
                      <div className="text-2xl mb-1">📸</div>
                      <p className="text-sm font-semibold text-gray-900">
                        {qcFiles.length > 0 ? `${qcFiles.length} file(s) selected` : "Click to select or drag files"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Max 5 images, up to 10MB each</p>
                    </label>
                  </div>
                  
                  {/* Selected Files Preview */}
                  {qcFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {qcFiles.map((file, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-sm">📄</span>
                            <span className="text-sm font-medium text-gray-900 truncate">{file.name}</span>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              ({(file.size / 1024 / 1024).toFixed(2)}MB)
                            </span>
                          </div>
                          <button
                            onClick={() => setQcFiles(qcFiles.filter((_, idx) => idx !== i))}
                            className="ml-2 p-1 hover:bg-gray-200 rounded transition">
                            <X size={14} className="text-gray-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* URL Mode */}
              {qcUploadMode === "url" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Image URLs (one per line) *
                  </label>
                  <textarea
                    value={qcImageUrls}
                    onChange={e => setQcImageUrls(e.target.value)}
                    placeholder={"https://example.com/qc1.jpg\nhttps://example.com/qc2.jpg"}
                    className="w-full h-28 rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-900 transition resize-none font-mono"
                  />
                </div>
              )}

              {/* QC Note */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  QC Note (optional)
                </label>
                <input
                  value={qcNote}
                  onChange={e => setQcNote(e.target.value)}
                  placeholder="Any notes about quality check..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-gray-900 transition"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowQcModal(false);
                  setQcFiles([]);
                  setQcImageUrls("");
                  setQcNote("");
                }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button
                onClick={() => void handleQcUpload()}
                disabled={
                  (qcUploadMode === "file" && qcFiles.length === 0) ||
                  (qcUploadMode === "url" && !qcImageUrls.trim()) ||
                  busyAction === "qc"
                }
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
                style={{ backgroundColor: "#f59e0b" }}>
                <Upload size={14} />
                {busyAction === "qc" ? "Uploading..." : "Upload QC Images"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handover Complete Modal — POST /handover-complete */}
      {showHandoverModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl my-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Handover to Rider</h3>
              <button onClick={() => setShowHandoverModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>

            {/* Order info */}
            <div className="p-3 rounded-xl border mb-4"
              style={{ backgroundColor: COLORS.infoBg, borderColor: COLORS.infoBorder }}>
              <p className="text-xs font-bold" style={{ color: COLORS.info }}>
                Order: <span className="font-mono">{order?.orderNumber || `#${id.slice(-8).toUpperCase()}`}</span>
              </p>
              <p className="text-xs mt-1" style={{ color: COLORS.info }}>
                Confirm physical handover of package to delivery rider.
              </p>
            </div>

            {/* Rider Search + Dropdown */}
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Select Rider <span className="text-gray-400 font-normal normal-case">(optional)</span>
              </label>
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={handoverRiderSearch} onChange={e => setHandoverRiderSearch(e.target.value)}
                  placeholder="Search by name or phone..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
              </div>

              {handoverRidersLoading ? (
                <div className="text-center py-4 text-xs text-gray-400">Loading riders...</div>
              ) : filteredHandoverRiders.length > 0 ? (
                <div className="max-h-44 overflow-y-auto space-y-1.5 rounded-xl border border-gray-200 p-2">
                  {filteredHandoverRiders.map((rider, idx) => {
                    // Simple comparison: check if this rider is the selected one
                    // Backend returns 'id' not '_id'
                    const isSelected = selectedHandoverRider === rider || 
                                      (selectedHandoverRider && rider && 
                                       ((selectedHandoverRider.id && selectedHandoverRider.id === rider.id) || 
                                        (selectedHandoverRider._id && selectedHandoverRider._id === rider._id) ||
                                        (selectedHandoverRider.phone && selectedHandoverRider.phone === rider.phone)));
                    
                    // Try to get name from any possible field
                    const riderName = rider.name || (rider as any).fullName || (rider as any).riderName || (rider as any).firstName || "";
                    const riderPhone = rider.phone || (rider as any).phoneNumber || (rider as any).mobile || "";
                    const displayName = riderName.trim() || riderPhone || `Rider ${idx + 1}`;
                    
                    return (
                      <button key={`rider-${rider.id || rider._id || idx}`} type="button"
                        onClick={() => {
                          setSelectedHandoverRider(rider);
                        }}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition"
                        style={{
                          backgroundColor: isSelected ? `${COLORS.primary}12` : "transparent",
                          border: `1.5px solid ${isSelected ? COLORS.primary : "transparent"}`,
                        }}>
                        <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                          style={{ borderColor: isSelected ? COLORS.primary : "#d1d5db" }}>
                          {isSelected && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.primary }} />}
                        </div>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: isSelected ? COLORS.primary : "#94a3b8" }}>
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {riderPhone && riderPhone !== displayName && <span className="text-xs text-gray-500">{riderPhone}</span>}
                            {rider.vehicleType && (
                              <span className="text-xs px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 flex items-center gap-1">
                                <Bike size={10} /> {rider.vehicleType}
                              </span>
                            )}
                            {rider.rating != null && (
                              <span className="text-xs text-gray-500 flex items-center gap-0.5">
                                <Star size={10} className="text-yellow-400" /> {Number(rider.rating).toFixed(1)}
                              </span>
                            )}
                            {rider.totalTrips != null && <span className="text-xs text-gray-400">{rider.totalTrips} trips</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-3 text-xs text-gray-400 border border-gray-200 rounded-xl">
                  {handoverRiderSearch ? "No riders match your search" : "No riders available"}
                </div>
              )}
              {selectedHandoverRider && (
                <p className="text-xs mt-2 font-semibold" style={{ color: COLORS.success }}>
                  ✓ Selected: {selectedHandoverRider.name}
                </p>
              )}
            </div>

            {/* Note */}
            <div className="mb-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Note <span className="text-gray-400 font-normal normal-case">(optional)</span>
              </label>
              <textarea value={handoverNote} onChange={e => setHandoverNote(e.target.value)}
                placeholder="Any handover notes..."
                className="w-full h-16 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-gray-900 transition resize-none" />
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowHandoverModal(false); setSelectedHandoverRider(null); setHandoverNote(""); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!order) return;
                  setBusyAction("handover");
                  try {
                    const res = await handoverComplete(order._id, {
                      riderId: selectedHandoverRider?.id || selectedHandoverRider?._id || undefined,
                      note: handoverNote || undefined,
                    });
                    setOrder(res.data);
                    setShowHandoverModal(false);
                    setSelectedHandoverRider(null);
                    setHandoverNote("");
                    // Show success message
                    setError("");
                    setTimeout(() => {
                      setError("✅ Handover completed successfully!");
                      setTimeout(() => setError(""), 3000);
                    }, 100);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to complete handover");
                  } finally {
                    setBusyAction("");
                  }
                }}
                disabled={busyAction === "handover"}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
                style={{ backgroundColor: COLORS.primary }}>
                <Truck size={14} />
                {busyAction === "handover" ? "Confirming..." : "Confirm Handover"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
