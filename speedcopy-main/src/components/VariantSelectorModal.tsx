import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import productService, { type ProductVariant } from '../services/product.service';
import designService from '../services/design.service';
import { resolveThumbnail } from '../utils/image.utils';

interface Props {
  productId: string;
  productName: string;
  flowType?: 'gifting' | 'shopping' | 'business_printing';
  onClose: () => void;
}

const VariantSelectorModal: React.FC<Props> = ({ productId, productName, flowType = 'gifting', onClose }) => {
  const navigate = useNavigate();
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetchVariants();
  }, [productId]); // eslint-disable-line

  const fetchVariants = async () => {
    try {
      setLoading(true);
      const data = await productService.getVariantsByProduct(productId);
      const active = data.filter((v: any) => v.isActive !== false);
      setVariants(active);
      if (active.length === 1) setSelected(active[0]._id);
    } catch {
      setError('Could not load variants');
    } finally {
      setLoading(false);
    }
  };

  const getVariantPrice = (v: ProductVariant) => {
    return v.additional_price ?? v.pricing?.salePrice ?? v.price ?? 0;
  };

  const getVariantMrp = (v: ProductVariant) => {
    return v.pricing?.mrp ?? v.additional_price ?? v.price ?? 0;
  };

  const getVariantSpecs = (v: ProductVariant): [string, string][] => {
    const specs: Record<string, string> = {};
    if (v.size) specs['Size'] = v.size_label || v.size;
    if (v.paper_type) specs['Paper'] = v.paper_type;
    if (v.cover_color_name) specs['Color'] = v.cover_color_name;
    return Object.entries(specs).filter(([, val]) => val);
  };

  const getVariantThumb = (v: ProductVariant): string => {
    return resolveThumbnail(v.images || v.previewImages, v.thumbnail, v.imageUrl, v.image);
  };

  const getVariantName = (v: ProductVariant): string => {
    const parts = [];
    if (v.size_label || v.size) parts.push(v.size_label || v.size);
    if (v.paper_type) parts.push(v.paper_type);
    if (v.cover_color_name) parts.push(v.cover_color_name);
    return parts.join(' - ') || v.name || 'Variant';
  };

  const handleContinue = async () => {
    if (!selected) return;
    setTemplateLoading(true);
    try {
      // Use the richer template-config response to decide routing
      const config = await designService.getTemplateConfig(selected);

      if (config.success && config.data?.template) {
        const count = config.data.availableTemplatesCount ?? 1;

        if (count > 1) {
          // Multiple designs available → show template picker
          navigate(
            `/template-gallery?productId=${productId}&variantId=${selected}&flow=${flowType}`
          );
        } else {
          // Single template → go straight to slot-based customization editor
          const templateId =
            config.data.template?.id;

          const params = new URLSearchParams({
            productId,
            variantId: selected,
            flow: flowType,
            ...(templateId ? { templateId } : {}),
          });
          navigate(`/customization-editor?${params.toString()}`);
        }
      } else {
        // No published template → simple frame editor
        navigate(
          `/simple-frame-editor?productId=${productId}&variantId=${selected}&flow=${flowType}`
        );
      }
      onClose();
    } catch {
      navigate(
        `/simple-frame-editor?productId=${productId}&variantId=${selected}&flow=${flowType}`
      );
      onClose();
    } finally {
      setTemplateLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:rounded-2xl overflow-hidden"
        style={{ maxWidth: '520px', maxHeight: '90vh', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
          <div>
            <h2 className="font-bold text-gray-900" style={{ fontSize: '17px' }}>Choose a Variant</h2>
            <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-400 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-sm text-red-500 mb-3">{error}</p>
              <button
                onClick={() => void fetchVariants()}
                className="text-xs font-semibold text-gray-600 underline"
              >
                Try again
              </button>
            </div>
          ) : variants.length === 0 ? (
            /* No variants — go directly to editor */
            <div className="p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-800 mb-1">Ready to Customise</p>
              <p className="text-xs text-gray-400 mb-5">No size variants — jump straight to the editor</p>
              <button
                onClick={() => {
                  navigate(`/simple-frame-editor?productId=${productId}&flow=${flowType}`);
                  onClose();
                }}
                className="px-6 py-2.5 rounded-full text-sm font-bold text-white transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)' }}
              >
                Open Editor
              </button>
            </div>
          ) : (
            <div className="p-4 space-y-2.5">
              {variants.map(v => {
                const price = getVariantPrice(v);
                const mrp = getVariantMrp(v);
                const specs = getVariantSpecs(v);
                const thumb = getVariantThumb(v);
                const isSelected = selected === v._id;

                return (
                  <button
                    key={v._id}
                    onClick={() => setSelected(v._id)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition"
                    style={{
                      border: isSelected ? '2px solid #111111' : '1.5px solid #e5e7eb',
                      backgroundColor: isSelected ? '#fafafa' : '#ffffff',
                    }}
                  >
                    {/* Thumbnail */}
                    <div
                      className="flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
                      style={{ width: '52px', height: '52px', backgroundColor: '#f3f4f6' }}
                    >
                      {thumb ? (
                        <img src={thumb} alt={getVariantName(v)} className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-900 truncate" style={{ fontSize: '13px' }}>
                          {getVariantName(v)}
                        </p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {price > 0 && (
                            <span className="font-bold text-gray-900" style={{ fontSize: '14px' }}>
                              ₹{price}
                            </span>
                          )}
                          {mrp > 0 && mrp > price && (
                            <span className="line-through text-xs" style={{ color: '#9ca3af' }}>
                              ₹{mrp}
                            </span>
                          )}
                        </div>
                      </div>
                      {v._id && (
                        <p className="text-[10px] mt-0.5" style={{ color: '#9ca3af' }}>ID: {v._id.slice(-6)}</p>
                      )}
                      {specs.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {specs.slice(0, 4).map(([k, val]) => (
                            <span
                              key={k}
                              className="px-1.5 py-0.5 rounded-md text-[10px] font-medium"
                              style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
                            >
                              {k}: {val}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Radio */}
                    <div
                      className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition"
                      style={{
                        borderColor: isSelected ? '#111111' : '#d1d5db',
                        backgroundColor: isSelected ? '#111111' : 'transparent',
                      }}
                    >
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {variants.length > 0 && (
          <div className="px-4 py-4" style={{ borderTop: '1px solid #f3f4f6' }}>
            <button
              onClick={() => void handleContinue()}
              disabled={!selected || templateLoading}
              className="w-full py-3 rounded-full text-sm font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: selected ? 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)' : '#d1d5db' }}
            >
              {templateLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading...
                </>
              ) : (
                <>
                  Continue to Customise
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VariantSelectorModal;
