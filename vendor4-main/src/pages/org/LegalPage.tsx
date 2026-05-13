import { useEffect, useRef, useState } from "react";
import {
  Shield, CheckCircle, AlertTriangle, Clock,
  Upload, FileText, RefreshCw, ExternalLink
} from "lucide-react";
import LoadingState from "../../components/ui/LoadingState";
import { COLORS } from "../../utils/colors";
import { getLegalDocs, uploadLegalDocs, uploadLegalDocsFormData, getAgreement } from "../../services/vendor.service";

// ─── Types ────────────────────────────────────────────────
interface LegalDocs {
  gstNumber: string | null;
  panNumber: string | null;
  companyRegistrationNumber: string | null;
  legalVerified: boolean;
  legalDocuments: {
    gstCertificate?: string;
    panCard?: string;
    companyRegistrationCertificate?: string;
  };
}

interface Agreement {
  agreementStatus: "accepted" | "pending";
  acceptedAt: string | null;
  termsVersion: string;
}

// ─── Doc Card ─────────────────────────────────────────────
function DocCard({
  title, description, numberValue, fileUrl,
  onNumberChange, onFileChange, uploading, editMode, selectedFile,
}: {
  title: string; description: string;
  numberValue: string; fileUrl?: string;
  onNumberChange: (v: string) => void;
  onFileChange: (file: File) => void;
  uploading: boolean; editMode: boolean;
  selectedFile?: File;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasFile = Boolean(fileUrl);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: hasFile ? COLORS.successBg : "#f1f5f9" }}>
            <FileText size={16} style={{ color: hasFile ? COLORS.success : "#64748b" }} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
          selectedFile ? "bg-blue-50 text-blue-700" : hasFile ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
        }`}>
          {selectedFile ? "Ready to upload" : hasFile ? "Uploaded" : "Pending"}
        </span>
      </div>

      {/* Number field */}
      <div className="mb-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
          {title} Number
        </label>
        <input
          value={numberValue}
          onChange={(e) => onNumberChange(e.target.value)}
          disabled={!editMode}
          placeholder={`Enter ${title} number`}
          className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition ${
            editMode
              ? "bg-white border-gray-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
              : "bg-gray-50 border-gray-100 text-gray-500 cursor-not-allowed"
          }`}
        />
      </div>

      {/* File upload */}
      {editMode && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                // 5MB limit
                if (file.size > 5 * 1024 * 1024) {
                  alert("File too large. Maximum size is 5MB.");
                  e.target.value = "";
                  return;
                }
                onFileChange(file);
              }
            }}
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed text-sm font-semibold transition disabled:opacity-50"
            style={{
              borderColor: selectedFile ? COLORS.info : "#e5e7eb",
              backgroundColor: selectedFile ? COLORS.infoBg : "transparent",
              color: selectedFile ? COLORS.info : "#4b5563",
            }}>
            <Upload size={14} />
            {uploading ? "Uploading..." : selectedFile ? `📄 ${selectedFile.name}` : "Upload Document (PDF/Image, max 5MB)"}
          </button>
        </div>
      )}

      {/* Existing file link */}
      {fileUrl && !editMode && (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs font-semibold mt-2 hover:underline"
          style={{ color: COLORS.info }}
        >
          <ExternalLink size={12} />
          View uploaded document
        </a>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function LegalPage() {
  const [docs, setDocs] = useState<LegalDocs | null>(null);
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Form state
  const [gstNumber, setGstNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [companyRegNumber, setCompanyRegNumber] = useState("");
  const [files, setFiles] = useState<Record<string, File>>({});

  // API 1: GET /api/vendor/org/legal
  // API 3: GET /api/vendor/org/agreement
  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [legalRes, agreementRes] = await Promise.all([
        getLegalDocs(),
        getAgreement(),
      ]);
      const legalData = legalRes.data as LegalDocs;
      setDocs(legalData);
      setGstNumber(legalData.gstNumber || "");
      setPanNumber(legalData.panNumber || "");
      setCompanyRegNumber(legalData.companyRegistrationNumber || "");
      setAgreement(agreementRes.data as Agreement);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load legal documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  // API 2: POST /api/vendor/org/legal — multipart/form-data
  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");

      const hasFiles = Object.keys(files).length > 0;

      if (hasFiles) {
        // Use multipart/form-data when files are selected
        const formData = new FormData();
        if (gstNumber) formData.append("gstNumber", gstNumber);
        if (panNumber) formData.append("panNumber", panNumber);
        if (companyRegNumber) formData.append("companyRegistrationNumber", companyRegNumber);
        if (files.gstCertificate) formData.append("gstCertificate", files.gstCertificate);
        if (files.panCard) formData.append("panCard", files.panCard);
        if (files.companyRegistrationCertificate) formData.append("companyRegistrationCertificate", files.companyRegistrationCertificate);
        const res = await uploadLegalDocsFormData(formData);
        // Update docs immediately from response
        if (res?.data) setDocs(res.data as LegalDocs);
      } else {
        // JSON for numbers-only update
        const res = await uploadLegalDocs({ gstNumber, panNumber, companyRegistrationNumber: companyRegNumber });
        if (res?.data) setDocs(res.data as LegalDocs);
      }

      setEditMode(false);
      setFiles({});
      setMessage("Legal documents submitted for verification");
      setTimeout(() => setMessage(""), 3000);
      void loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit documents");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setGstNumber(docs?.gstNumber || "");
    setPanNumber(docs?.panNumber || "");
    setCompanyRegNumber(docs?.companyRegistrationNumber || "");
    setFiles({});
    setEditMode(false);
    setError("");
  };

  if (loading) return <LoadingState message="Loading legal documents" />;

  const verificationStatus = docs?.legalVerified
    ? { label: "Verified", color: COLORS.success, bg: COLORS.successBg, border: COLORS.successBorder, icon: CheckCircle }
    : { label: "Pending Verification", color: COLORS.warning, bg: COLORS.warningBg, border: COLORS.warningBorder, icon: Clock };

  const StatusIcon = verificationStatus.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: COLORS.primary + "18" }}>
            <Shield size={18} style={{ color: COLORS.primary }} />
          </div>
          <div>
            <p className="text-base font-black text-gray-900">Legal Documents</p>
            <p className="text-xs text-gray-500">GST, PAN, Registration & Agreement</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadData()}
            className="p-2 rounded-xl border border-gray-200 hover:border-gray-900 transition"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>

          {editMode ? (
            <>
              <button onClick={handleCancel}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={() => void handleSave()} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
                style={{ backgroundColor: COLORS.primary }}>
                <Upload size={14} />
                {saving ? "Submitting..." : "Submit Documents"}
              </button>
            </>
          ) : (
            <button onClick={() => setEditMode(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition"
              style={{ backgroundColor: COLORS.primary }}>
              <Upload size={14} /> Update Documents
            </button>
          )}
        </div>
      </div>

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

      {/* Verification Status + Agreement Status */}
      <div className="grid grid-cols-2 gap-4">
        {/* Legal Verification */}
        <div className="rounded-2xl border p-5 bg-white shadow-sm"
          style={{ borderColor: verificationStatus.border, backgroundColor: verificationStatus.bg }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-3"
            style={{ color: verificationStatus.color }}>Legal Verification</p>
          <div className="flex items-center gap-2">
            <StatusIcon size={20} style={{ color: verificationStatus.color }} />
            <p className="text-lg font-black" style={{ color: verificationStatus.color }}>
              {verificationStatus.label}
            </p>
          </div>
          {!docs?.legalVerified && (
            <p className="text-xs mt-2" style={{ color: verificationStatus.color }}>
              Submit all documents to complete verification
            </p>
          )}
        </div>

        {/* Agreement Status — API 3 data */}
        <div className="rounded-2xl border p-5 bg-white shadow-sm"
          style={{
            borderColor: agreement?.agreementStatus === "accepted" ? COLORS.successBorder : COLORS.warningBorder,
            backgroundColor: agreement?.agreementStatus === "accepted" ? COLORS.successBg : COLORS.warningBg,
          }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-3"
            style={{ color: agreement?.agreementStatus === "accepted" ? COLORS.success : COLORS.warning }}>
            Vendor Agreement
          </p>
          <div className="flex items-center gap-2">
            {agreement?.agreementStatus === "accepted"
              ? <CheckCircle size={20} style={{ color: COLORS.success }} />
              : <Clock size={20} style={{ color: COLORS.warning }} />
            }
            <p className="text-lg font-black capitalize"
              style={{ color: agreement?.agreementStatus === "accepted" ? COLORS.success : COLORS.warning }}>
              {agreement?.agreementStatus === "accepted" ? "Accepted" : "Pending"}
            </p>
          </div>
          {agreement?.acceptedAt && (
            <p className="text-xs mt-2" style={{ color: COLORS.success }}>
              Accepted on {new Date(agreement.acceptedAt).toLocaleDateString()}
            </p>
          )}
          {agreement?.termsVersion && (
            <p className="text-xs mt-1 text-gray-500">Terms v{agreement.termsVersion}</p>
          )}
        </div>
      </div>

      {/* Edit mode info */}
      {editMode && (
        <div className="p-3 rounded-xl border flex items-center gap-2"
          style={{ backgroundColor: COLORS.infoBg, borderColor: COLORS.infoBorder }}>
          <Upload size={14} style={{ color: COLORS.info }} />
          <p className="text-xs font-bold" style={{ color: COLORS.info }}>
            Enter document numbers and optionally upload files. Click Submit Documents when done.
          </p>
        </div>
      )}

      {/* Document Cards — API 1 data, API 2 submit */}
      <div className="grid gap-4 md:grid-cols-3">
        <DocCard
          title="GST Certificate"
          description="Goods & Services Tax registration"
          numberValue={gstNumber}
          fileUrl={docs?.legalDocuments?.gstCertificate}
          onNumberChange={setGstNumber}
          onFileChange={(file) => setFiles((prev) => ({ ...prev, gstCertificate: file }))}
          uploading={saving}
          editMode={editMode}
          selectedFile={files.gstCertificate}
        />
        <DocCard
          title="PAN Card"
          description="Permanent Account Number"
          numberValue={panNumber}
          fileUrl={docs?.legalDocuments?.panCard}
          onNumberChange={setPanNumber}
          onFileChange={(file) => setFiles((prev) => ({ ...prev, panCard: file }))}
          uploading={saving}
          editMode={editMode}
          selectedFile={files.panCard}
        />
        <DocCard
          title="Company Registration"
          description="Certificate of Incorporation"
          numberValue={companyRegNumber}
          fileUrl={docs?.legalDocuments?.companyRegistrationCertificate}
          onNumberChange={setCompanyRegNumber}
          onFileChange={(file) => setFiles((prev) => ({ ...prev, companyRegistrationCertificate: file }))}
          uploading={saving}
          editMode={editMode}
          selectedFile={files.companyRegistrationCertificate}
        />
      </div>

      {/* Checklist */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-gray-900 mb-4">Compliance Checklist</p>
        <div className="space-y-3">
          {[
            { label: "GST Number submitted", done: Boolean(docs?.gstNumber) },
            { label: "PAN Number submitted", done: Boolean(docs?.panNumber) },
            { label: "Company Registration submitted", done: Boolean(docs?.companyRegistrationNumber) },
            { label: "GST Certificate uploaded", done: Boolean(docs?.legalDocuments?.gstCertificate) },
            { label: "PAN Card uploaded", done: Boolean(docs?.legalDocuments?.panCard) },
            { label: "Registration Certificate uploaded", done: Boolean(docs?.legalDocuments?.companyRegistrationCertificate) },
            { label: "Legal documents verified by SpeedCopy", done: Boolean(docs?.legalVerified) },
            { label: "Vendor agreement accepted", done: agreement?.agreementStatus === "accepted" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                item.done ? "bg-green-100" : "bg-gray-100"
              }`}>
                {item.done
                  ? <CheckCircle size={12} style={{ color: COLORS.success }} />
                  : <div className="w-2 h-2 rounded-full bg-gray-300" />
                }
              </div>
              <p className={`text-sm ${item.done ? "text-gray-900 font-semibold" : "text-gray-400"}`}>
                {item.label}
              </p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {(() => {
          const total = 8;
          const done = [
            Boolean(docs?.gstNumber), Boolean(docs?.panNumber),
            Boolean(docs?.companyRegistrationNumber),
            Boolean(docs?.legalDocuments?.gstCertificate),
            Boolean(docs?.legalDocuments?.panCard),
            Boolean(docs?.legalDocuments?.companyRegistrationCertificate),
            Boolean(docs?.legalVerified),
            agreement?.agreementStatus === "accepted",
          ].filter(Boolean).length;
          const pct = Math.round((done / total) * 100);
          return (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-600">Completion</p>
                <p className="text-xs font-bold" style={{ color: pct === 100 ? COLORS.success : COLORS.primary }}>
                  {done}/{total} ({pct}%)
                </p>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: pct === 100 ? COLORS.success : COLORS.primary,
                  }}
                />
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
