import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import designService, { type PublishedTemplateSummary } from '../services/design.service';
import { normalizeImageUrl } from '../utils/image.utils';

const TemplateGalleryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const productId = searchParams.get('productId') || '';
  const variantId = searchParams.get('variantId') || '';
  const flow = (searchParams.get('flow') || 'gifting') as 'gifting' | 'business_printing' | 'shopping';

  const [templates, setTemplates] = useState<PublishedTemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'premium' | 'free'>('all');

  useEffect(() => {
    if (!variantId) return;
    setLoading(true);
    designService.getTemplatesByVariant(variantId)
      .then(res => {
        if (res.success && res.data) {
          setTemplates(res.data.templates || []);
        } else {
          setTemplates([]);
        }
      })
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, [variantId]);

  const filtered = templates.filter(t => {
    if (filter === 'premium') return t.isPremium;
    if (filter === 'free') return !t.isPremium;
    return true;
  });

  const handleSelectTemplate = (templateId: string) => {
    setSelected(templateId);
  };

  const handleContinue = () => {
    if (!selected) return;
    navigate(
      `/customization-editor?productId=${productId}&variantId=${variantId}&templateId=${selected}&flow=${flow}`
    );
  };

  const handleBlankCanvas = () => {
    navigate(
      `/simple-frame-editor?productId=${productId}&variantId=${variantId}&flow=${flow}`
    );
  };

  const handleBack = () => navigate(-1);

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleBack}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white transition"
            style={{ border: '1.5px solid #e5e7eb' }}
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="font-bold text-gray-900" style={{ fontSize: '22px' }}>Choose a Template</h1>
            <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
              Pick a design to start with, or begin with a blank canvas
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6">
          {(['all', 'free', 'premium'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-full text-sm font-semibold transition capitalize"
              style={{
                backgroundColor: filter === f ? '#111111' : '#ffffff',
                color: filter === f ? '#ffffff' : '#374151',
                border: filter === f ? 'none' : '1px solid #e5e7eb',
              }}
            >
              {f === 'all' ? 'All Templates' : f === 'premium' ? '⭐ Premium' : 'Free'}
            </button>
          ))}
        </div>

        {/* Blank Canvas Card — always first */}
        <div className="mb-6">
          <button
            onClick={handleBlankCanvas}
            className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl hover:shadow-md transition text-left"
            style={{ border: '1.5px dashed #d1d5db' }}
          >
            <div
              className="flex-shrink-0 rounded-xl flex items-center justify-center"
              style={{ width: '72px', height: '72px', backgroundColor: '#f9fafb', border: '1.5px dashed #e5e7eb' }}
            >
              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-gray-900" style={{ fontSize: '14px' }}>Start from Scratch</p>
              <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                Upload your own photo and add text freely
              </p>
            </div>
            <div className="ml-auto">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="h-44 bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-600 mb-1">No templates yet</p>
            <p className="text-xs text-gray-400 mb-5">Start with a blank canvas instead</p>
            <button
              onClick={handleBlankCanvas}
              className="px-6 py-2.5 rounded-full text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)' }}
            >
              Start from Scratch
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(t => {
              const isSelected = selected === t._id;
              return (
                <button
                  key={t._id}
                  onClick={() => handleSelectTemplate(t._id)}
                  className="bg-white rounded-2xl overflow-hidden text-left transition hover:shadow-md group"
                  style={{
                    border: isSelected ? '2px solid #111111' : '1.5px solid #f3f4f6',
                    boxShadow: isSelected ? '0 0 0 3px rgba(17,17,17,0.08)' : undefined,
                  }}
                >
                  {/* Preview Image */}
                  <div className="relative overflow-hidden" style={{ height: '160px', backgroundColor: '#f9fafb' }}>
                    {t.previewImage || t.thumbnail ? (
                      <img
                        src={normalizeImageUrl(t.previewImage || t.thumbnail)}
                        alt={t.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}

                    {/* Premium badge */}
                    {t.isPremium && (
                      <div
                        className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}
                      >
                        ⭐ Premium
                      </div>
                    )}

                    {/* Selected checkmark */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="font-semibold text-gray-900 truncate" style={{ fontSize: '12px' }}>
                      {t.name}
                    </p>
                    {t.dimensions?.width && t.dimensions?.height && (
                      <p className="text-[10px] mt-0.5" style={{ color: '#9ca3af' }}>
                        {t.dimensions.width} × {t.dimensions.height} {t.dimensions.unit || 'px'}
                      </p>
                    )}
                    {t.tags && t.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {t.tags.slice(0, 2).map(tag => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                            style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Sticky bottom CTA when template selected */}
        {selected && (
          <div
            className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-white"
            style={{ borderTop: '1px solid #f3f4f6', boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}
          >
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-gray-700">
                Template selected — ready to customise
              </p>
              <button
                onClick={handleContinue}
                className="px-6 py-2.5 rounded-full text-sm font-bold text-white flex items-center gap-2 hover:opacity-90 transition"
                style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)' }}
              >
                Open Editor
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Bottom padding when CTA is visible */}
        {selected && <div className="h-20" />}
      </div>
    </div>
  );
};

export default TemplateGalleryPage;
