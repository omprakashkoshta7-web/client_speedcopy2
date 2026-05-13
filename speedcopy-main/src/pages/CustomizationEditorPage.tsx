import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import designService, {
  type TemplateConfig,
  type TemplateConfigResponse,
  type Customization,
} from '../services/design.service';
import productService from '../services/product.service';
import orderService from '../services/order.service';
import { useAuth } from '../context/AuthContext';
import LoginModal from '../components/LoginModal';
import { resolveThumbnail } from '../utils/image.utils';

// ─── Sub-components ──────────────────────────────────────────────────────────
import EditorSidebar from '../components/customization/EditorSidebar';
import EditorPreview from '../components/customization/EditorPreview';
import EditorTopBar from '../components/customization/EditorTopBar';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface SlotState {
  slotId: string;
  type: 'image' | 'text';
  // image
  file?: File;
  previewUrl?: string;
  uploadedAsset?: {
    assetId?: string;
    originalUrl?: string;
    processedUrl?: string;
    width?: number;
    height?: number;
    mimeType?: string;
  };
  transform?: { x: number; y: number; scale: number; rotation: number; zoom: number };
  crop?: { x: number; y: number; width: number; height: number; unit: 'percent' };
  // text
  text?: {
    value: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    color: string;
    alignment: 'left' | 'center' | 'right';
  };
  // upload state
  uploading?: boolean;
  uploadProgress?: number;
  uploadError?: string;
  saved?: boolean; // slot synced to backend
  visible?: boolean; // layer visibility
}

// ─── Page ────────────────────────────────────────────────────────────────────
const CustomizationEditorPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const productId  = searchParams.get('productId')  ?? '';
  const variantId  = searchParams.get('variantId')  ?? '';
  const templateId = searchParams.get('templateId') ?? undefined;
  const flow       = (searchParams.get('flow') ?? 'gifting') as 'gifting' | 'shopping' | 'business_printing';

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [templateConfig, setTemplateConfig] = useState<TemplateConfigResponse | null>(null);
  const [customization, setCustomization]   = useState<Customization | null>(null);
  const [slotStates, setSlotStates]         = useState<Record<string, SlotState>>({});
  const [activeSlotId, setActiveSlotId]     = useState<string | null>(null);
  const [saving, setSaving]                 = useState(false);
  const [finalizing, setFinalizing]         = useState(false);
  const [previewUrl, setPreviewUrl]         = useState('');
  const [productImage, setProductImage]     = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [addedToCart, setAddedToCart]       = useState(false);
  const [cartError, setCartError]           = useState('');

   // ── 1. Load template config ────────────────────────────────────────────────
   useEffect(() => {
     if (!variantId) {
       setError('Variant ID missing. Please go back and select a variant.');
       setLoading(false);
       return;
     }
     void loadConfig();
   }, [variantId, productId, flow]); // eslint-disable-line

   const loadConfig = async () => {
     try {
       setLoading(true);
       setError('');
       const res = await designService.getTemplateConfig(variantId);
       if (!res.success || !res.data?.template) {
         // No template → redirect to simple frame editor
         navigate(`/simple-frame-editor?productId=${productId}&variantId=${variantId}&flow=${flow}`, { replace: true });
         return;
       }

       // If multiple templates exist and no templateId specified in URL, show template picker
       const availableCount = res.data.availableTemplatesCount ?? 1;
       if (availableCount > 1 && !templateId) {
         navigate(`/template-gallery?productId=${productId}&variantId=${variantId}&flow=${flow}`, { replace: true });
         return;
       }

       const resolvedProductImage = await loadProductImage();
       setProductImage(resolvedProductImage);
       setTemplateConfig(res.data);
       // Init slot states from template slots
       const initial: Record<string, SlotState> = {};
       for (const slot of res.data.template.slots) {
         initial[slot.slotId] = buildDefaultSlotState(slot);
       }
       setSlotStates(initial);
       // Auto-select first slot
       if (res.data.template.slots.length > 0) {
         setActiveSlotId(res.data.template.slots[0].slotId);
       }
     } catch {
       setError('Failed to load template. Please try again.');
     } finally {
       setLoading(false);
     }
   };

  const loadProductImage = async (): Promise<string> => {
    if (!productId) return '';
    try {
      const response =
        flow === 'shopping'
          ? await productService.getShoppingProductById(productId)
          : flow === 'gifting'
            ? await productService.getGiftingProductById(productId)
            : await productService.getProductById(productId);
      const product = (response as any)?.data || response;
      return resolveThumbnail(product?.images, product?.thumbnail, product?.image, product?.imageUrl);
    } catch (err) {
      console.warn('Could not load product image for customization mockup:', err);
      return '';
    }
  };

  const buildDefaultSlotState = (slot: any): SlotState => {
    if (slot.type === 'text') {
      const tc = slot.textConfig ?? {};
      return {
        slotId: slot.slotId,
        type: 'text',
        text: {
          value: '',
          fontFamily: tc.defaultFontFamily ?? 'Roboto',
          fontSize: tc.defaultFontSize ?? 24,
          fontWeight: tc.fontWeight ?? 'normal',
          color: tc.color ?? '#111111',
          alignment: tc.alignment ?? 'center',
        },
      };
    }
    return { slotId: slot.slotId, type: 'image' };
  };

  // ── 2. Create customization session (lazy — on first real edit) ────────────
  const ensureSession = useCallback(async (): Promise<Customization | null> => {
    if (customization) return customization;
    if (!isAuthenticated || !localStorage.getItem('auth_token')) {
      setShowLoginModal(true);
      return null;
    }
    try {
      const res = await designService.createCustomization({
        variantId,
        ...(templateId ? { templateId } : {}),
      });
      const customWithId = { ...res.data, _id: res.data.id || res.data._id };
      setCustomization(customWithId);
      return customWithId;
    } catch (err: any) {
      if (err?.response?.status === 401) {
        const message = String(err?.response?.data?.message || '').toLowerCase();
        const tokenLooksInvalid =
          message.includes('invalid') ||
          message.includes('expired') ||
          message.includes('jwt') ||
          message.includes('no token');

        if (tokenLooksInvalid || !localStorage.getItem('auth_token')) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          setShowLoginModal(true);
          setError('Please login again to continue customization.');
          return null;
        }

        setError('Could not start customization session for this account. Please try again.');
        return null;
      }
      setError('Could not start customization session. Please try again.');
      return null;
    }
  }, [customization, isAuthenticated, variantId, templateId]);

  // ── 3. Upload image for a slot ─────────────────────────────────────────────
  const handleImageUpload = useCallback(async (slotId: string, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setSlotStates(prev => ({
      ...prev,
      [slotId]: {
        ...prev[slotId],
        file,
        previewUrl,
        uploading: true,
        uploadProgress: 0,
        uploadError: undefined,
        saved: false,
      },
    }));
    
    // Auto-select this slot after upload starts
    setActiveSlotId(slotId);

    const session = await ensureSession();
    if (!session) return;

    try {
      const assetRes = await designService.uploadCustomizationAsset(
        session._id || session.id,
        file,
        (pct) => {
          setSlotStates(prev => ({
            ...prev,
            [slotId]: { ...prev[slotId], uploadProgress: pct },
          }));
        }
      );

      const asset = assetRes.data;
      const customizationId = session._id || session.id || session.id;
      
      // Get current transform/crop from slot states
      const transform = { x: 0, y: 0, scale: 1, rotation: 0, zoom: 1 };
      const crop = undefined;

      // Patch slot on backend with crop data
      const updateRes = await designService.updateCustomizationSlot(customizationId, slotId, {
        type: 'image',
        asset: {
          assetId: asset.assetId,
          originalUrl: asset.originalUrl,
          processedUrl: asset.processedUrl,
          mimeType: asset.mimeType,
          width: asset.width,
          height: asset.height,
          sizeBytes: asset.sizeBytes,
        },
        transform,
        crop,
      });

      // Get the updated slot data from backend response
      const updatedSlot = updateRes.data.slots?.find((s: any) => s.slotId === slotId);
      const backendAsset = updatedSlot?.asset;
      
      const imagePreviewUrl = previewUrl; // Use blob URL first (works), server URL as fallback
      setSlotStates(prev => ({
        ...prev,
        [slotId]: {
          ...prev[slotId],
          uploadedAsset: backendAsset || asset,
          previewUrl: imagePreviewUrl,
          uploading: false,
          uploadProgress: 100,
          saved: true,
        },
      }));

      // Update main customization state with backend response
      if (updateRes.data) {
        setCustomization(updateRes.data);
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Upload failed. Please try again.';
      setSlotStates(prev => ({
        ...prev,
        [slotId]: {
          ...prev[slotId],
          uploading: false,
          uploadError: errorMsg,
        },
      }));
    }
  }, [ensureSession]);

   // ── 4. Update transform (zoom/move/rotate) ─────────────────────────────────
   const handleTransformChange = useCallback(async (
     slotId: string,
     transform: SlotState['transform']
   ) => {
     setSlotStates(prev => ({
       ...prev,
       [slotId]: { ...prev[slotId], transform, saved: false },
     }));

     const session = await ensureSession();
     if (!session) return;
     const st = slotStates[slotId];
     if (!st) return;

     try {
       if (st.type === 'text') {
         await designService.updateCustomizationSlot(session._id || session.id, slotId, {
           type: 'text',
           text: st.text,
           transform,
         });
       } else {
         if (!st.uploadedAsset) return;
         await designService.updateCustomizationSlot(session._id || session.id, slotId, {
           type: 'image',
           asset: {
             assetId: st.uploadedAsset.assetId,
             originalUrl: st.uploadedAsset.originalUrl,
           },
           transform,
         });
       }
       setSlotStates(prev => ({ ...prev, [slotId]: { ...prev[slotId], saved: true } }));
     } catch { /* silent — user can retry via save */ }
   }, [ensureSession, slotStates]);

   // ── 5. Update text slot ────────────────────────────────────────────────────
   const handleTextChange = useCallback(async (
     slotId: string,
     text: SlotState['text']
   ) => {
     setSlotStates(prev => ({
       ...prev,
       [slotId]: { ...prev[slotId], text, saved: false },
     }));

     const session = await ensureSession();
     if (!session) return;

     try {
       await designService.updateCustomizationSlot(session._id || session.id, slotId, {
         type: 'text',
         text,
       });
       setSlotStates(prev => ({ ...prev, [slotId]: { ...prev[slotId], saved: true } }));
     } catch { /* silent */ }
   }, [ensureSession]);

  // ── 9. Crop image ──────────────────────────────────────────────────────
  const handleCropChange = useCallback(async (
    slotId: string,
    crop: SlotState['crop']
  ) => {
    setSlotStates(prev => ({
      ...prev,
      [slotId]: { ...prev[slotId], crop, saved: false },
    }));

    const session = await ensureSession();
    if (!session) return;
    const st = slotStates[slotId];

    try {
      await designService.updateCustomizationSlot(session._id || session.id, slotId, {
        type: 'image',
        asset: st?.uploadedAsset ? {
          assetId: st.uploadedAsset.assetId,
          originalUrl: st.uploadedAsset.originalUrl,
          mimeType: st.uploadedAsset.mimeType,
          width: st.uploadedAsset.width,
          height: st.uploadedAsset.height,
        } : undefined,
        transform: st?.transform || { x: 0, y: 0, scale: 1, rotation: 0, zoom: 1 },
        crop: crop ? {
          x: crop.x || 0,
          y: crop.y || 0,
          width: crop.width || 100,
          height: crop.height || 100,
          unit: crop.unit || 'percent',
        } : undefined,
      });
      setSlotStates(prev => ({ ...prev, [slotId]: { ...prev[slotId], saved: true } }));
    } catch { /* silent */ }
  }, [ensureSession, slotStates]);
const handleAddToCart = async () => {
    if (!isAuthenticated) { setShowLoginModal(true); return; }
    const session = await ensureSession();
    if (!session) return;

    setFinalizing(true);
    setCartError('');
    try {
      const customizationId = session._id || session.id;

      // Capture live preview (this works reliably)
      const livePreview = await captureLivePreview();
      
      // Try render preview (may not return URL)
      let serverPreviewUrl = '';
      try {
        const renderRes = await designService.renderCustomizationPreview(customizationId);
        serverPreviewUrl = renderRes.data?.renderedPreview?.url || '';
      } catch (renderErr) {
        console.warn('Render preview failed:', renderErr);
      }

      // Try finalize (may return 500)
      let finalizedData = null;
      try {
        const finalRes = await designService.finalizeCustomization(customizationId);
        if (finalRes.success) {
          finalizedData = finalRes.data;
        }
      } catch (finalizeErr) {
        console.warn('Finalize failed:', finalizeErr);
      }

      const template = templateConfig?.template as TemplateConfig;
      const variant  = templateConfig?.variant;
      console.log('🛒 Variant data:', variant);
      console.log('🛒 Price:', variant?.salePrice, variant?.price);
      const cartFlowType = flow === 'business_printing' ? 'printing' : flow;
      
      // Priority: livePreview > serverPreview > uploadedImage
      const customPreviewUrl = livePreview || serverPreviewUrl || '';

      console.log('[handleAddToCart] Preview:', {
        livePreview: livePreview ? 'CAPTURED' : 'NONE',
        serverPreviewUrl: serverPreviewUrl ? 'SET' : 'EMPTY',
        customPreviewUrl: customPreviewUrl ? 'SET' : 'EMPTY',
      });

// Use uploaded image URL instead of base64 to avoid 413 error
            const uploadedImage = Object.values(slotStates).find(
              (slot) => slot.type === 'image' && slot.uploadedAsset?.originalUrl
            );
            const thumbnailToSend = uploadedImage?.uploadedAsset?.originalUrl || '';

// Add to cart with the CUSTOM design preview matching guide specification
            console.log('🛒 Add to cart - flow:', flow, 'price:', variant?.salePrice ?? variant?.price ?? 0);
            const addToCartPayload = {
              productId,
              productName: variant?.name ?? 'Custom Product',
              flowType: flow,
              variantId,
              variantSnapshot: {
                name: variant?.name ?? 'Custom Variant',
                sku: variant?.sku ?? '',
                attributes: variant?.attributes || {}
              },
              customization: {
                customizationId: customizationId,
                templateId: template?.id || templateId || '',
                templateVersion: template?.version || finalizedData?.templateVersion || 0,
                renderedPreviewUrl: serverPreviewUrl || '',
                printReadyAssetUrl: finalizedData?.printReadyAsset?.url || '',
                slotSummary: Object.fromEntries(
                  Object.values(slotStates).map(slot => [slot.slotId, slot.type])
                ),
                lockedAt: finalizedData?.lockedAt || new Date().toISOString(),
              },
              thumbnail: thumbnailToSend,
              designPreview: customPreviewUrl, // Live mockup preview (with frame + user image)
             quantity: 1,
             unitPrice: variant?.salePrice ?? variant?.price ?? 0,
             totalPrice: variant?.salePrice ?? variant?.price ?? 0,
           };
           await orderService.addToCart(addToCartPayload);

      setAddedToCart(true);
      console.log('✅ Added to cart successfully');
    } catch (err: any) {
      console.error('❌ Add to cart error:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Could not add to cart. Please try again.';
      setCartError(errorMsg);
    } finally {
      setFinalizing(false);
    }
  };

  // ── 11. Render preview ─────────────────────────────────────────────────────
  const handleRenderPreview = useCallback(async () => {
    const session = await ensureSession();
    if (!session) return;
    try {
      setSaving(true);
      const customizationId = session._id || session.id || session.id;
const res = await designService.renderCustomizationPreview(customizationId);
      // Use html2canvas to capture the full mockup with uploaded images
      const livePreview = await captureLivePreview();
      const previewToShow = livePreview || res.data?.renderedPreview?.url || '';
      
      if (previewToShow) {
        setPreviewUrl(previewToShow);
        setShowPreviewModal(true);
      }
    } catch (err) {
      console.error('Preview generation failed:', err);
    } finally {
      setSaving(false);
    }
  }, [ensureSession]);

  // ── 12. Add graphic (placeholder) ──────────────────────────────────────────
  const handleAddGraphic = useCallback((slotId: string, graphicUrl: string) => {
    console.log('Add graphic not implemented:', slotId, graphicUrl);
  }, []);

  // ── 13. Reorder layers (placeholder) ───────────────────────────────────────
  const handleReorderLayers = useCallback((slotId: string, direction: 'up' | 'down') => {
    console.log('Reorder layers not implemented:', slotId, direction);
  }, []);

  // ── 14. Capture live preview via html2canvas ───────────────────────────────
  const captureLivePreview = useCallback(async (): Promise<string> => {
    const container = document.querySelector('[data-customization-preview="true"]') as HTMLElement;
    if (!container) return '';
    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Failed to capture live preview:', err);
      return '';
    }
  }, []);

  // ── 15. Handle preview image error ────────────────────────────────────────
  const handlePreviewImageError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    img.src = 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=900&q=80';
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const template = templateConfig?.template as TemplateConfig | undefined;
  const variant  = templateConfig?.variant;
  const previewTemplate = React.useMemo(() => {
    if (!template) return template;
    const freeTextSlots = Object.values(slotStates)
      .filter(st => st.slotId.startsWith('free_text_') && st.type === 'text')
      .map((st, index) => ({
        slotId: st.slotId,
        name: 'Custom Text',
        type: 'text' as const,
        geometry: {
          x: (template.canvas.width || 600) * 0.18,
          y: (template.canvas.height || 600) * (0.45 + index * 0.1),
          width: (template.canvas.width || 600) * 0.64,
          height: (template.canvas.height || 600) * 0.12,
          shape: 'rectangle' as const,
        },
        behavior: {
          movable: true,
          rotateEnabled: true,
        },
        textConfig: {
          minLength: 0,
          maxLength: 80,
          defaultFontFamily: st.text?.fontFamily || 'Roboto',
          defaultFontSize: st.text?.fontSize || 28,
          minFontSize: 10,
          maxFontSize: 96,
          fontWeight: st.text?.fontWeight || '700',
          color: st.text?.color || '#111111',
          alignment: st.text?.alignment || 'center',
        },
        zIndex: 80 + index,
        required: false,
      }));

    return {
      ...template,
      assets: {
        ...template.assets,
        editorBaseImage: productImage || template.assets?.editorBaseImage,
        mockupSceneImage: template.assets?.mockupSceneImage || productImage,
      },
      slots: [...template.slots, ...freeTextSlots],
    };
  }, [template, productImage, slotStates]);

  const allRequiredFilled = (): boolean => {
    if (!previewTemplate) return false;
    return previewTemplate.slots
      .filter(s => s.required !== false)
      .every(s => {
        const st = slotStates[s.slotId];
        if (!st) return false;
        if (s.type === 'image') return !!(st.uploadedAsset?.assetId || st.previewUrl);
        if (s.type === 'text')  return !!(st.text?.value?.trim());
        return false;
      });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading editor…</p>
        </div>
      </div>
    );
  }

  if (error && !previewTemplate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p className="font-semibold text-gray-800 mb-2">Something went wrong</p>
          <p className="text-sm text-gray-500 mb-5">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-full text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!previewTemplate) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <EditorTopBar
        productName={variant?.name ?? 'Custom Product'}
        onBack={() => navigate(-1)}
        onPreview={handleRenderPreview}
        saving={saving}
        allFilled={allRequiredFilled()}
      />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
{/* Left sidebar — slot controls */}
          <EditorSidebar
            template={previewTemplate}
            slotStates={slotStates}
            activeSlotId={activeSlotId}
            onSlotSelect={setActiveSlotId}
            onImageUpload={handleImageUpload}
            onTransformChange={handleTransformChange}
            onTextChange={handleTextChange}
            onDeleteText={() => {}}
          />

        {/* Center — live preview */}
        <EditorPreview
          template={previewTemplate}
          slotStates={slotStates}
          activeSlotId={activeSlotId}
          onSlotClick={setActiveSlotId}
          onTransformChange={handleTransformChange}
          onCropChange={handleCropChange}
        />
      </div>

      {/* Bottom action bar */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white px-4 py-3 flex items-center gap-3 z-30"
        style={{ borderTop: '1px solid #f3f4f6', boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}
      >
        {cartError && <p className="text-xs text-red-500 flex-1">{cartError}</p>}
        {error && !cartError && <p className="text-xs text-red-500 flex-1">{error}</p>}
        {!cartError && !error && <div className="flex-1" />}

        {addedToCart ? (
          <button
            onClick={() => navigate('/cart')}
            className="px-6 py-3 rounded-full text-sm font-bold text-white flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            View Cart
          </button>
        ) : (
          <>
            <button
              onClick={handleRenderPreview}
              disabled={saving || !allRequiredFilled()}
              className="px-5 py-3 rounded-full text-sm font-bold border transition disabled:opacity-40"
              style={{ borderColor: '#e5e7eb', color: '#374151' }}
            >
              {saving ? 'Generating…' : 'Preview'}
            </button>
            <button
              onClick={() => void handleAddToCart()}
              disabled={finalizing || !allRequiredFilled()}
              className="px-6 py-3 rounded-full text-sm font-bold text-white flex items-center gap-2 disabled:opacity-40 transition"
              style={{ background: allRequiredFilled() ? 'linear-gradient(135deg,#f59e0b,#f97316)' : '#d1d5db' }}
            >
              {finalizing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Adding…
                </>
              ) : (
                <>
                  Add to Cart
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Preview modal */}
      {showPreviewModal && previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden max-w-sm w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="font-bold text-gray-900 text-sm">Design Preview</p>
              <button onClick={() => setShowPreviewModal(false)} className="text-gray-400 text-xl font-bold">×</button>
            </div>
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full max-h-[60vh] object-contain bg-white"
              onError={(event) => {
                void handlePreviewImageError(event);
              }}
            />
            <div className="p-4">
              <button
                onClick={() => { setShowPreviewModal(false); void handleAddToCart(); }}
                disabled={finalizing}
                className="w-full py-3 rounded-full text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}
              >
                {finalizing ? 'Adding to Cart…' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login modal */}
      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} />
      )}
    </div>
  );
};

export default CustomizationEditorPage;
