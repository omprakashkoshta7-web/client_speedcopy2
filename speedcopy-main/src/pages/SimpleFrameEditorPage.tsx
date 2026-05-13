import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import productService from '../services/product.service';
import orderService from '../services/order.service';
import designService, { type Customization, type CustomizationAsset } from '../services/design.service';
import { useAuth } from '../context/AuthContext';

// Google Fonts to load
const FONTS = [
  { name: 'Roboto', label: 'Roboto' },
  { name: 'Playfair Display', label: 'Playfair Display' },
  { name: 'Pacifico', label: 'Pacifico' },
  { name: 'Dancing Script', label: 'Dancing Script' },
  { name: 'Montserrat', label: 'Montserrat' },
  { name: 'Lato', label: 'Lato' },
  { name: 'Oswald', label: 'Oswald' },
  { name: 'Lobster', label: 'Lobster' },
  { name: 'Raleway', label: 'Raleway' },
  { name: 'Great Vibes', label: 'Great Vibes' },
];

interface UserText {
  id: string;
  text: string;
  font: string;
  size: number;
  color: string;
  x: number;
  y: number;
  bold: boolean;
  italic: boolean;
}

interface ProductRecord {
  _id?: string;
  id?: string;
  name?: string;
  thumbnail?: string;
  image?: string;
  images?: string[];
  basePrice?: number;
  discountedPrice?: number;
  mrp?: number;
  sale_price?: number;
}

interface UserPhoto {
  id: string;
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
}

interface SavedDesign {
  id: string;
  name: string;
  productId: string;
  productName: string;
  thumbnail: string;       // base64 preview
  photos: UserPhoto[];
  activeImageIndex: number;
  savedAt: string;
}

const SimpleFrameEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ photoId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [userPhotos, setUserPhotos] = useState<UserPhoto[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [showSavedPanel, setShowSavedPanel] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewPreviewImage, setReviewPreviewImage] = useState('');

  // Text layer state
  const [userTexts, setUserTexts] = useState<UserText[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [newTextInput, setNewTextInput] = useState('');
  const [selectedFont, setSelectedFont] = useState('Roboto');
  const [textSize, setTextSize] = useState(24);
  const [textColor, setTextColor] = useState('#111111');
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  const textDragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const readyFileInputRef = useRef<HTMLInputElement>(null);
  const [showAdjustmentControls, setShowAdjustmentControls] = useState(false);
  // Gallery modal — triggered by clicking photo placeholder in frame
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<{ id: string; dataUrl: string }[]>([]);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  const productId = searchParams.get('productId');
  const variantId = searchParams.get('variantId') || undefined;

  // ── Customization (backend) state ─────────────────────────────────────────
  const [customization, setCustomization] = useState<Customization | null>(null);
  const [customizationLoading, setCustomizationLoading] = useState(false);
  const [customizationError, setCustomizationError] = useState('');
  const [customizationAssets, setCustomizationAssets] = useState<CustomizationAsset[]>([]);
  const [assetUploadProgress, setAssetUploadProgress] = useState<number>(0);
  const [assetUploading, setAssetUploading] = useState(false);
  const [finalizingCustomization, setFinalizingCustomization] = useState(false);
  const [customizationFinalized, setCustomizationFinalized] = useState(false);
  const [showCustomizationPanel, setShowCustomizationPanel] = useState(false);
  const [savingToBackend, setSavingToBackend] = useState(false);
  const [backendSaveMsg, setBackendSaveMsg] = useState('');
  const customizationAssetInputRef = useRef<HTMLInputElement>(null);

  const salePrice = product?.sale_price ?? product?.discountedPrice ?? product?.basePrice ?? 0;
  const mrp = product?.mrp ?? product?.basePrice ?? salePrice;
  const displayPrice = salePrice || mrp || 0;

  const selectedPhoto = userPhotos.find(p => p.id === selectedPhotoId) || null;

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    void init();
    loadSavedDesigns();
    loadGoogleFonts();
  }, []); // eslint-disable-line

  // ── Refit photos when gallery modal closes ───────────────────────────────
  useEffect(() => {
    if (showGalleryModal) return;
    if (userPhotos.length === 0) return;
    const timer = setTimeout(async () => {
      const editorW = editorRef.current?.clientWidth;
      const editorH = editorRef.current?.clientHeight;
      if (!editorW || !editorH) return;
      const frameImg = productImages[activeImageIndex] || '';
      const inner = frameImg
        ? await detectFrameInnerBounds(frameImg, editorW, editorH)
        : { x: editorW * 0.18, y: editorH * 0.18, w: editorW * 0.64, h: editorH * 0.64 };
      setUserPhotos(prev => prev.map(p => {
        const scale = Math.max(inner.w / p.width, inner.h / p.height);
        const w = p.width * scale;
        const h = p.height * scale;
        return { ...p, scale, x: inner.x + (inner.w - w) / 2, y: inner.y + (inner.h - h) / 2 };
      }));
    }, 100);
    return () => clearTimeout(timer);
  }, [showGalleryModal]); // eslint-disable-line

  const loadGoogleFonts = () => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${FONTS.map(f => `family=${f.name.replace(/ /g, '+')}:wght@400;700`).join('&')}&display=swap`;
    document.head.appendChild(link);
  };

  // ── Saved Designs (localStorage) ─────────────────────────────────────────
  const STORAGE_KEY = 'speedcopy_saved_designs';

  const loadSavedDesigns = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSavedDesigns(JSON.parse(raw));
    } catch { /* ignore */ }
  };

  const saveDesign = async () => {
    if (!product) return;

    // Generate thumbnail from editor
    let thumbnail = productImages[activeImageIndex] || '';
    try {
      const { default: html2canvas } = await import('html2canvas');
      if (editorRef.current) {
        const canvas = await html2canvas(editorRef.current, { useCORS: true, allowTaint: true, scale: 0.4 });
        const maxW = 400;
        const ratio = Math.min(maxW / canvas.width, 1);
        const resized = document.createElement('canvas');
        resized.width = Math.round(canvas.width * ratio);
        resized.height = Math.round(canvas.height * ratio);
        const ctx = resized.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, 0, resized.width, resized.height);
          thumbnail = resized.toDataURL('image/jpeg', 0.5);
        }
      }
    } catch { /* use product image as fallback */ }

    const design: SavedDesign = {
      id: `design_${Date.now()}`,
      name: `${product.name || 'Design'} - ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
      productId: (product._id || product.id || productId || ''),
      productName: product.name || 'Design',
      thumbnail,
      photos: userPhotos,
      activeImageIndex,
      savedAt: new Date().toISOString(),
    };

    const updated = [design, ...savedDesigns].slice(0, 20); // max 20 designs
    setSavedDesigns(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSaveMsg('Design saved!');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const loadDesign = (design: SavedDesign) => {
    setUserPhotos(design.photos);
    setActiveImageIndex(design.activeImageIndex);
    setSelectedPhotoId(null);
    setShowSavedPanel(false);
  };

  const deleteDesign = (id: string) => {
    const updated = savedDesigns.filter(d => d.id !== id);
    setSavedDesigns(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // ── Customization (backend) functions ─────────────────────────────────────

  /** Create or resume a customization session on the backend.
   *  Backend requires: { variantId: string (required), templateId?: ObjectId }
   *  variantId must be present in the URL — without it the session cannot be created.
   */
  const initCustomization = async () => {
    if (!isAuthenticated || !variantId) return;
    if (customization) return; // already have a session

    setCustomizationLoading(true);
    setCustomizationError('');
    try {
      // Only send what the backend accepts — variantId (required) + optional templateId
      const res = await designService.createCustomization({
        variantId,
      });
      setCustomization(res.data);
      setCustomizationAssets([]);
      console.log('✅ Customization session created:', res.data._id);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Failed to create customization session';
      setCustomizationError(msg);
      console.error('❌ Customization init failed:', e);
    } finally {
      setCustomizationLoading(false);
    }
  };

  /** Save current canvas state to backend */
  const saveCustomizationToBackend = async () => {
    if (!customization) {
      await initCustomization();
      return;
    }
    setSavingToBackend(true);
    setBackendSaveMsg('');
    try {
      // Generate preview image
      let previewImage = productImages[activeImageIndex] || '';
      try {
        const { default: html2canvas } = await import('html2canvas');
        if (editorRef.current) {
          const canvas = await html2canvas(editorRef.current, { useCORS: true, allowTaint: true, scale: 0.5 });
          const maxW = 600;
          const ratio = Math.min(maxW / canvas.width, 1);
          const resized = document.createElement('canvas');
          resized.width = Math.round(canvas.width * ratio);
          resized.height = Math.round(canvas.height * ratio);
          const ctx = resized.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, 0, resized.width, resized.height);
            previewImage = resized.toDataURL('image/jpeg', 0.6);
          }
        }
      } catch { /* use product image */ }

      const canvasState = {
        photos: userPhotos,
        texts: userTexts,
        activeImageIndex,
        productImages,
        savedAt: new Date().toISOString(),
      };

      await designService.updateCustomization(customization._id, {
        canvasJson: canvasState,
        previewImage,
      });

      setBackendSaveMsg('Saved to cloud ✓');
      setTimeout(() => setBackendSaveMsg(''), 2500);
      console.log('✅ Customization saved to backend');
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Save failed';
      setBackendSaveMsg(`Error: ${msg}`);
      console.error('❌ Backend save failed:', e);
    } finally {
      setSavingToBackend(false);
    }
  };

  /** Upload an asset (photo) to the customization on the backend */
  const uploadAssetToBackend = async (file: File) => {
    if (!customization) {
      setCustomizationError('Start a customization session first');
      return;
    }
    setAssetUploading(true);
    setAssetUploadProgress(0);
    try {
      const res = await designService.uploadCustomizationAsset(
        customization._id,
        file,
        (pct) => setAssetUploadProgress(pct)
      );
      const newAsset = res.data;
      setCustomizationAssets(prev => [...prev, newAsset]);
      console.log('✅ Asset uploaded:', newAsset.url);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Upload failed';
      setCustomizationError(msg);
      console.error('❌ Asset upload failed:', e);
    } finally {
      setAssetUploading(false);
      setAssetUploadProgress(0);
    }
  };

  /** Finalize the customization (lock for ordering) */
  const finalizeCustomization = async () => {
    if (!customization) return;
    setFinalizingCustomization(true);
    try {
      // Save latest state first
      await saveCustomizationToBackend();
      // Then finalize
      const res = await designService.finalizeCustomization(customization._id);
      setCustomization(res.data);
      setCustomizationFinalized(true);
      console.log('✅ Customization finalized:', res.data._id);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Finalize failed';
      setCustomizationError(msg);
      console.error('❌ Finalize failed:', e);
    } finally {
      setFinalizingCustomization(false);
    }
  };

  /** Place a backend asset into the editor canvas */
  const placeAssetInEditor = async (assetUrl: string) => {
    const dims = await new Promise<{ w: number; h: number }>((res) => {
      const img = new Image();
      img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => res({ w: 300, h: 300 });
      img.src = assetUrl;
    });

    const editorW = editorRef.current?.clientWidth || 600;
    const editorH = editorRef.current?.clientHeight || 500;
    const frameImg = productImages[activeImageIndex] || '';
    const inner = frameImg
      ? await detectFrameInnerBounds(frameImg, editorW, editorH)
      : { x: editorW * 0.18, y: editorH * 0.18, w: editorW * 0.64, h: editorH * 0.64 };

    const scale = Math.max(inner.w / dims.w, inner.h / dims.h);
    const w = dims.w * scale;
    const h = dims.h * scale;

    const photo: UserPhoto = {
      id: `asset_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      dataUrl: assetUrl,
      x: inner.x + (inner.w - w) / 2,
      y: inner.y + (inner.h - h) / 2,
      width: dims.w,
      height: dims.h,
      scale,
      rotation: 0,
    };

    setUserPhotos(prev => [...prev, photo]);
    setSelectedPhotoId(photo.id);
    setShowCustomizationPanel(false);
  };

  // ── Text layer functions ──────────────────────────────────────────────────
  const addText = () => {
    if (!newTextInput.trim()) return;
    const editorW = editorRef.current?.clientWidth || 600;
    const editorH = editorRef.current?.clientHeight || 500;
    const txt: UserText = {
      id: `text_${Date.now()}`,
      text: newTextInput.trim(),
      font: selectedFont,
      size: textSize,
      color: textColor,
      x: editorW / 2 - 80,
      y: editorH / 2 - 20,
      bold: textBold,
      italic: textItalic,
    };
    setUserTexts(prev => [...prev, txt]);
    setSelectedTextId(txt.id);
    setNewTextInput('');
  };

  const onTextMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedTextId(id);
    setSelectedPhotoId(null);
    const txt = userTexts.find(t => t.id === id);
    if (!txt) return;
    textDragRef.current = { id, startX: e.clientX, startY: e.clientY, origX: txt.x, origY: txt.y };
    const onMove = (ev: MouseEvent) => {
      if (!textDragRef.current) return;
      const dx = ev.clientX - textDragRef.current.startX;
      const dy = ev.clientY - textDragRef.current.startY;
      setUserTexts(prev => prev.map(t =>
        t.id === textDragRef.current!.id
          ? { ...t, x: textDragRef.current!.origX + dx, y: textDragRef.current!.origY + dy }
          : t
      ));
    };
    const onUp = () => {
      textDragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const updateSelectedText = (changes: Partial<UserText>) => {
    if (!selectedTextId) return;
    setUserTexts(prev => prev.map(t => t.id === selectedTextId ? { ...t, ...changes } : t));
  };

  const deleteText = (id: string) => {
    setUserTexts(prev => prev.filter(t => t.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  const selectedText = userTexts.find(t => t.id === selectedTextId) || null;

  // ── Generate Review Preview ──────────────────────────────────────────────
  const generateReviewPreview = async () => {
    let previewImage = productImages[activeImageIndex] || '';
    try {
      const { default: html2canvas } = await import('html2canvas');
      if (editorRef.current) {
        const canvas = await html2canvas(editorRef.current, { useCORS: true, allowTaint: true, scale: 0.4 });
        const maxW = 400;
        const ratio = Math.min(maxW / canvas.width, 1);
        const resized = document.createElement('canvas');
        resized.width = Math.round(canvas.width * ratio);
        resized.height = Math.round(canvas.height * ratio);
        const ctx = resized.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, 0, resized.width, resized.height);
          previewImage = resized.toDataURL('image/jpeg', 0.5);
        }
      }
    } catch { /* use product image */ }
    setReviewPreviewImage(previewImage);
  };

  // ── Submit for Review ─────────────────────────────────────────────────────
  const submitForReview = async () => {
    if (userPhotos.length === 0) {
      alert('Please upload a photo before submitting for review.');
      return;
    }
    setReviewSubmitting(true);
    try {
      // Use the already generated preview image
      const previewImage = reviewPreviewImage || productImages[activeImageIndex] || '';

      // Save review submission to localStorage
      const reviewKey = 'speedcopy_review_submissions';
      const existing = JSON.parse(localStorage.getItem(reviewKey) || '[]');
      const submission = {
        id: `review_${Date.now()}`,
        productId: (product?._id || product?.id || productId || ''),
        productName: product?.name || 'Design',
        previewImage,
        note: reviewNote,
        status: 'pending',
        submittedAt: new Date().toISOString(),
      };
      localStorage.setItem(reviewKey, JSON.stringify([submission, ...existing].slice(0, 50)));

      setReviewSubmitted(true);
      setReviewNote('');
    } catch (e) {
      console.error('Review submission failed:', e);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const init = async () => {
    try {
      if (!productId) { navigate('/gifting'); return; }
      setLoading(true);

      let data: ProductRecord | null = null;
      try {
        const r = await productService.getGiftingProductById(productId);
        data = (r?.data || r) as ProductRecord;
      } catch {
        const r = await productService.getProductById(productId);
        data = (r?.data || r) as ProductRecord;
      }
      setProduct(data || null);

      const imgs: string[] = [];
      if (Array.isArray(data?.images) && data!.images.length > 0) imgs.push(...data!.images);
      else if (data?.thumbnail) imgs.push(data.thumbnail);
      else if (data?.image) imgs.push(data.image);
      setProductImages(imgs);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  // ── Upload photo ──────────────────────────────────────────────────────────
  const handleUpload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    for (const file of Array.from(files)) {
      const dataUrl = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(String(reader.result));
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });

      // Get natural dimensions
      const dims = await new Promise<{ w: number; h: number }>((res) => {
        const img = new Image();
        img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => res({ w: 300, h: 300 });
        img.src = dataUrl;
      });

      const editorW = editorRef.current?.clientWidth || 600;
      const editorH = editorRef.current?.clientHeight || 500;

      // Get the current frame image and detect inner bounds
      const frameImg = productImages[activeImageIndex] || '';
      const inner = frameImg
        ? await detectFrameInnerBounds(frameImg, editorW, editorH)
        : { x: editorW * 0.18, y: editorH * 0.18, w: editorW * 0.64, h: editorH * 0.64 };

      // Scale photo to cover the inner frame area
      const scale = Math.max(inner.w / dims.w, inner.h / dims.h);
      const w = dims.w * scale;
      const h = dims.h * scale;

      const photo: UserPhoto = {
        id: `photo_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        dataUrl,
        x: inner.x + (inner.w - w) / 2,
        y: inner.y + (inner.h - h) / 2,
        width: dims.w,
        height: dims.h,
        scale,
        rotation: 0,
      };

      setUserPhotos(prev => [...prev, photo]);
      setSelectedPhotoId(photo.id);
    }
  };

  // ── Gallery: upload photo and auto-fit to frame ──────────────────────────
  const handleGalleryUpload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const newPhotos: { id: string; dataUrl: string }[] = [];
    for (const file of Array.from(files)) {
      const dataUrl = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(String(reader.result));
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      newPhotos.push({ id: `gal_${Date.now()}_${Math.random().toString(36).slice(2)}`, dataUrl });
    }
    setGalleryPhotos(prev => [...prev, ...newPhotos]);
  };

  // ── Detect inner frame bounds by scanning transparent pixels ────────────
  const detectFrameInnerBounds = (frameImgSrc: string, editorW: number, editorH: number): Promise<{ x: number; y: number; w: number; h: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          // Scale to editor size for accurate pixel mapping
          canvas.width = editorW;
          canvas.height = editorH;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve({ x: editorW * 0.18, y: editorH * 0.18, w: editorW * 0.64, h: editorH * 0.64 }); return; }

          ctx.drawImage(img, 0, 0, editorW, editorH);
          const data = ctx.getImageData(0, 0, editorW, editorH).data;

          // Find the bounding box of transparent/white pixels (inner area)
          // We scan from center outward to find where frame starts
          const cx = Math.floor(editorW / 2);
          const cy = Math.floor(editorH / 2);

          const isInner = (x: number, y: number) => {
            const idx = (y * editorW + x) * 4;
            const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
            // Transparent OR near-white = inner area
            return a < 30 || (r > 220 && g > 220 && b > 220 && a > 200);
          };

          // Scan from center to find edges of inner area
          let left = cx, right = cx, top = cy, bottom = cy;

          // Scan left
          for (let x = cx; x >= 0; x--) { if (!isInner(x, cy)) { left = x + 1; break; } left = 0; }
          // Scan right
          for (let x = cx; x < editorW; x++) { if (!isInner(x, cy)) { right = x - 1; break; } right = editorW - 1; }
          // Scan top
          for (let y = cy; y >= 0; y--) { if (!isInner(cx, y)) { top = y + 1; break; } top = 0; }
          // Scan bottom
          for (let y = cy; y < editorH; y++) { if (!isInner(cx, y)) { bottom = y - 1; break; } bottom = editorH - 1; }

          const w = right - left;
          const h = bottom - top;

          // Sanity check — inner area should be at least 20% of editor
          if (w < editorW * 0.2 || h < editorH * 0.2) {
            resolve({ x: editorW * 0.18, y: editorH * 0.18, w: editorW * 0.64, h: editorH * 0.64 });
          } else {
            resolve({ x: left, y: top, w, h });
          }
        } catch {
          resolve({ x: editorW * 0.18, y: editorH * 0.18, w: editorW * 0.64, h: editorH * 0.64 });
        }
      };
      img.onerror = () => resolve({ x: editorW * 0.18, y: editorH * 0.18, w: editorW * 0.64, h: editorH * 0.64 });
      img.src = frameImgSrc;
    });
  };

  // Place gallery photo into frame — auto-detect inner area and fit
  const placeGalleryPhoto = async (dataUrl: string) => {
    const dims = await new Promise<{ w: number; h: number }>((res) => {
      const img = new Image();
      img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => res({ w: 300, h: 300 });
      img.src = dataUrl;
    });

    const editorW = editorRef.current?.clientWidth || 600;
    const editorH = editorRef.current?.clientHeight || 500;

    // Get the current frame image
    const frameImg = productImages[activeImageIndex] || '';

    // Detect inner frame bounds
    const inner = frameImg
      ? await detectFrameInnerBounds(frameImg, editorW, editorH)
      : { x: editorW * 0.18, y: editorH * 0.18, w: editorW * 0.64, h: editorH * 0.64 };

    // Scale photo to cover the inner frame area
    const scaleX = inner.w / dims.w;
    const scaleY = inner.h / dims.h;
    const scale = Math.max(scaleX, scaleY);

    const w = dims.w * scale;
    const h = dims.h * scale;

    const photo: UserPhoto = {
      id: `photo_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      dataUrl,
      x: inner.x + (inner.w - w) / 2,
      y: inner.y + (inner.h - h) / 2,
      width: dims.w,
      height: dims.h,
      scale,
      rotation: 0,
    };

    setUserPhotos([photo]);
    setSelectedPhotoId(photo.id);
    setShowGalleryModal(false);
  };

  // ── Drag to move ──────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent, photoId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedPhotoId(photoId);
    const photo = userPhotos.find(p => p.id === photoId);
    if (!photo) return;
    dragRef.current = { photoId, startX: e.clientX, startY: e.clientY, origX: photo.x, origY: photo.y };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      setUserPhotos(prev => prev.map(p =>
        p.id === dragRef.current!.photoId
          ? { ...p, x: dragRef.current!.origX + dx, y: dragRef.current!.origY + dy }
          : p
      ));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Scale selected ────────────────────────────────────────────────────────
  const scalePhoto = (factor: number) => {
    if (!selectedPhotoId) return;
    setUserPhotos(prev => prev.map(p =>
      p.id === selectedPhotoId ? { ...p, scale: Math.max(0.05, p.scale * factor) } : p
    ));
  };

  const fitPhoto = () => {
    if (!selectedPhotoId || !editorRef.current) return;
    const editorW = editorRef.current.clientWidth;
    const editorH = editorRef.current.clientHeight;
    setUserPhotos(prev => prev.map(p => {
      if (p.id !== selectedPhotoId) return p;
      const scale = Math.min((editorW * 0.7) / p.width, (editorH * 0.7) / p.height);
      const w = p.width * scale;
      const h = p.height * scale;
      return { ...p, scale, x: (editorW - w) / 2, y: (editorH - h) / 2 };
    }));
  };

  const deletePhoto = (id: string) => {
    setUserPhotos(prev => prev.filter(p => p.id !== id));
    if (selectedPhotoId === id) setSelectedPhotoId(null);
  };

  // ── Add to cart ───────────────────────────────────────────────────────────
  const addToCart = async () => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    if (!product) {
      alert('Product not loaded. Please refresh.');
      return;
    }

    try {
      const pid = (product._id || product.id || productId || '').toString();
      if (!pid) {
        alert('Product ID missing. Please go back and try again.');
        return;
      }

      // Generate composite screenshot (frame + user photo) for cart display
      let designPreview = productImages[activeImageIndex] || '';
      try {
        const { default: html2canvas } = await import('html2canvas');
        if (editorRef.current) {
          const canvas = await html2canvas(editorRef.current, {
            useCORS: true,
            allowTaint: true,
            scale: 0.4,   // low scale to keep size small
          });
          // Resize to max 400px wide
          const maxW = 400;
          const ratio = Math.min(maxW / canvas.width, 1);
          const resized = document.createElement('canvas');
          resized.width = Math.round(canvas.width * ratio);
          resized.height = Math.round(canvas.height * ratio);
          const ctx = resized.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, 0, resized.width, resized.height);
            designPreview = resized.toDataURL('image/jpeg', 0.5); // heavy compression
          }
        }
      } catch {
        // fallback to product image
      }

      const payload = {
        productId: pid,
        productName: product.name || 'Design',
        flowType: 'gifting' as const,
        quantity,
        unitPrice: displayPrice,
        totalPrice: displayPrice * quantity,
        variantId: undefined as undefined,
        designId: `simple-${pid}-${Date.now()}`,
        thumbnail: designPreview,
        designPreview: designPreview,
        designJson: '',
        designName: `${product.name || 'Design'} - Editor`,
        options: { source: 'simple-frame-editor' },
      };

      console.log('🛒 Adding to cart with composite design preview');

      await orderService.addToCart(payload);
      console.log('✅ Added to cart successfully');
      navigate('/cart');
    } catch (e: any) {
      console.error('❌ Add to cart failed:', e);
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Failed to add to cart';
      alert(`Error: ${msg}`);
    }
  };

  // Handle ready-to-print file upload
  const handleReadyFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        alert(`File ${file.name} is not supported. Please upload PDF, PNG, or JPG files.`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        
        if (file.type.startsWith('image/')) {
          // Get natural dimensions
          const dims = await new Promise<{ w: number; h: number }>((res) => {
            const img = new Image();
            img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
            img.onerror = () => res({ w: 300, h: 300 });
            img.src = dataUrl;
          });

          // Add as a user photo that fills the editor
          const editorW = editorRef.current?.clientWidth || 600;
          const editorH = editorRef.current?.clientHeight || 500;
          const scale = Math.min(editorW / dims.w, editorH / dims.h);
          const w = dims.w * scale;
          const h = dims.h * scale;

          const photo: UserPhoto = {
            id: `ready_${Date.now()}`,
            dataUrl,
            x: (editorW - w) / 2,
            y: (editorH - h) / 2,
            width: dims.w,
            height: dims.h,
            scale,
            rotation: 0,
          };

          setUserPhotos([photo]); // Replace all photos with the ready design
          setSelectedPhotoId(photo.id);
          alert('✅ Ready-to-print design uploaded! You can now add to cart.');
        } else if (file.type === 'application/pdf') {
          alert('PDF uploaded successfully! This will be processed during order fulfillment.');
          localStorage.setItem('readyPrintFile', JSON.stringify({
            name: file.name,
            type: file.type,
            size: file.size,
            data: dataUrl
          }));
        }
      };
      reader.readAsDataURL(file);
    }

    e.target.value = '';
    setShowUploadModal(false);
  };

  // ── Loading / Error ───────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto" />
        <p className="mt-4 text-gray-600">Loading editor...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg p-8 text-center shadow-lg max-w-md">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={() => navigate(-1)} className="bg-gray-800 text-white px-6 py-2 rounded-lg">Go Back</button>
      </div>
    </div>
  );

  const activeProductImage = productImages[activeImageIndex] || '';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { void handleUpload(e.target.files); e.currentTarget.value = ''; }} />
      <input ref={readyFileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" multiple className="hidden"
        onChange={handleReadyFileUpload} />
      {/* Asset upload for backend customization */}
      <input
        ref={customizationAssetInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async e => {
          const file = e.target.files?.[0];
          if (file) await uploadAssetToBackend(file);
          e.currentTarget.value = '';
        }}
      />

      {/* Upload Ready Design Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowUploadModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Upload Ready-to-Print Design</h3>
            
            {/* Current Design Preview */}
            {userPhotos.length > 0 && (
              <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-3">📸 Your Current Design Preview:</p>
                <div className="flex justify-center">
                  <div
                    className="relative bg-white shadow-lg rounded-lg overflow-hidden"
                    style={{ width: '300px', height: '250px' }}
                  >
                    {/* User photo - BEHIND frame (z-index 1) */}
                    {userPhotos.map(photo => {
                      const w = photo.width * photo.scale;
                      const h = photo.height * photo.scale;
                      return (
                        <div
                          key={photo.id}
                          style={{
                            position: 'absolute',
                            left: (photo.x / 600) * 300,
                            top: (photo.y / 500) * 250,
                            width: (w / 600) * 300,
                            height: (h / 500) * 250,
                            borderRadius: '4px',
                            overflow: 'hidden',
                            zIndex: 1,
                          }}
                        >
                          <img
                            src={photo.dataUrl}
                            alt="preview"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      );
                    })}
                    {/* Product frame - ON TOP (z-index 10) */}
                    {activeProductImage && (
                      <img
                        src={activeProductImage}
                        alt="preview"
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                        crossOrigin="anonymous"
                        style={{ zIndex: 10 }}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <p className="text-sm text-gray-600 mb-4">
              Have a print-ready file? Upload it here to skip the design process.
            </p>
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <p className="text-xs text-blue-800 font-semibold mb-2">Supported Formats:</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• PDF (Recommended)</li>
                <li>• PNG (300 DPI)</li>
                <li>• JPG/JPEG (300 DPI)</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => readyFileInputRef.current?.click()}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
              >
                Choose Files
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 text-sm">← Back</button>
            <div>
              <h1 className="text-base font-bold text-gray-900">Design Editor</h1>
              <p className="text-xs text-gray-500">{product?.name || 'Product'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-base font-bold text-orange-600">₹{displayPrice.toFixed(2)}</p>
              {mrp > displayPrice && <p className="text-xs text-gray-400 line-through">₹{mrp.toFixed(2)}</p>}
            </div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-7 h-7 rounded bg-white flex items-center justify-center font-bold text-gray-600 text-sm">−</button>
              <span className="w-7 text-center text-sm font-semibold">{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)} className="w-7 h-7 rounded bg-white flex items-center justify-center font-bold text-gray-600 text-sm">+</button>
            </div>
            <button onClick={saveDesign} className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save
              {saveMsg && <span className="text-green-600 text-xs font-semibold">{saveMsg}</span>}
            </button>
            {/* Save to Cloud — backend customization */}
            {isAuthenticated && (
              <button
                onClick={() => void saveCustomizationToBackend()}
                disabled={savingToBackend}
                className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition disabled:opacity-50"
                style={{
                  backgroundColor: customization ? '#eff6ff' : '#f3f4f6',
                  color: customization ? '#2563eb' : '#6b7280',
                  border: customization ? '1.5px solid #bfdbfe' : '1.5px solid #e5e7eb',
                }}
                title={customization ? `Session ID: ${customization._id.slice(-6)}` : 'Save to cloud'}
              >
                {savingToBackend ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                )}
                {backendSaveMsg || (customization ? 'Cloud Saved' : 'Save to Cloud')}
              </button>
            )}
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Ready Design
            </button>
            <button
              onClick={() => { 
                setShowReviewModal(true); 
                setReviewSubmitted(false);
                generateReviewPreview();
              }}
              className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition"
              style={{ backgroundColor: '#111111', color: '#ffffff' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Ready for Review
            </button>
            <button
              onClick={() => setShowSavedPanel(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium border transition flex items-center gap-1.5"
              style={{ border: '1.5px solid #e5e7eb', backgroundColor: '#fff', color: '#374151' }}
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              My Designs
              {savedDesigns.length > 0 && (
                <span className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {savedDesigns.length}
                </span>
              )}
            </button>
            <button onClick={addToCart} className="px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600">Add To Cart</button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Panel */}
        <div className="w-60 bg-white border-r border-gray-200 flex flex-col overflow-y-auto flex-shrink-0">

          {/* Customization Panel Toggle — only show if variantId is present */}
          {isAuthenticated && variantId && (
            <div className="p-3 border-b border-gray-100">
              <button
                onClick={() => {
                  setShowCustomizationPanel(v => !v);
                  if (!customization) void initCustomization();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition"
                style={{
                  backgroundColor: showCustomizationPanel ? '#111111' : '#f3f4f6',
                  color: showCustomizationPanel ? '#ffffff' : '#374151',
                }}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  Customization
                </span>
                {customization && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                    style={{ backgroundColor: customizationFinalized ? '#16a34a' : '#f59e0b', color: '#fff' }}>
                    {customizationFinalized ? 'Final' : 'Active'}
                  </span>
                )}
              </button>

              {/* Customization Panel Body */}
              {showCustomizationPanel && (
                <div className="mt-3 space-y-3">
                  {customizationLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="ml-2 text-xs text-gray-400">Starting session...</span>
                    </div>
                  ) : customizationError ? (
                    <div className="p-2 rounded-lg bg-red-50 border border-red-100">
                      <p className="text-xs text-red-600">{customizationError}</p>
                      <button
                        onClick={() => { setCustomizationError(''); void initCustomization(); }}
                        className="mt-1.5 text-xs font-semibold text-red-600 underline"
                      >Retry</button>
                    </div>
                  ) : customization ? (
                    <>
                      {/* Session info */}
                      <div className="px-2 py-1.5 rounded-lg text-xs" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <p className="font-semibold text-green-700">Session active</p>
                        <p className="text-green-600 font-mono">ID: ...{customization._id.slice(-8)}</p>
                      </div>

                      {/* Upload asset to backend */}
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1.5">Upload to Cloud</p>
                        <button
                          onClick={() => customizationAssetInputRef.current?.click()}
                          disabled={assetUploading}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-50"
                          style={{ border: '1.5px dashed #3b82f6', color: '#3b82f6', backgroundColor: '#eff6ff' }}
                        >
                          {assetUploading ? (
                            <>
                              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              {assetUploadProgress}%
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              Upload Image to Cloud
                            </>
                          )}
                        </button>
                        {assetUploading && (
                          <div className="mt-1.5 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${assetUploadProgress}%`, backgroundColor: '#3b82f6' }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Cloud assets grid */}
                      {customizationAssets.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1.5">
                            Cloud Assets ({customizationAssets.length})
                          </p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {customizationAssets.map((asset, i) => (
                              <button
                                key={asset._id || i}
                                onClick={() => void placeAssetInEditor(asset.url)}
                                className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition group relative"
                                title="Click to place in editor"
                              >
                                <img
                                  src={asset.url}
                                  alt={asset.filename || `Asset ${i + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">Use</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Finalize */}
                      {!customizationFinalized ? (
                        <button
                          onClick={() => void finalizeCustomization()}
                          disabled={finalizingCustomization}
                          className="w-full py-2 rounded-xl text-xs font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                          style={{ backgroundColor: '#111111' }}
                        >
                          {finalizingCustomization ? (
                            <>
                              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Finalizing...
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Finalize Design
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                          <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          <p className="text-xs font-semibold text-green-700">Design finalized!</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => void initCustomization()}
                      className="w-full py-2 rounded-xl text-xs font-semibold text-white transition"
                      style={{ backgroundColor: '#3b82f6' }}
                    >
                      Start Customization Session
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Upload */}
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Add Your Photo</h3>
            <button
              onClick={() => setShowGalleryModal(true)}
              className="w-full flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-orange-300 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition"
            >
              <span className="text-3xl">📁</span>
              <span className="text-sm font-semibold text-orange-600">Upload Image</span>
              <span className="text-xs text-gray-400">JPG, PNG, WEBP</span>
            </button>
          </div>

          {/* Uploaded photos */}
          {userPhotos.length > 0 && (
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Your Photos ({userPhotos.length})</h3>
              
              {/* Toggle Adjustment Controls Button */}
              <button
                onClick={() => setShowAdjustmentControls(!showAdjustmentControls)}
                className={`w-full mb-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 ${
                  showAdjustmentControls 
                    ? 'bg-orange-500 text-white hover:bg-orange-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                {showAdjustmentControls ? 'Hide Adjustment Controls' : 'Show Adjustment Controls'}
              </button>
              
              <div className="grid grid-cols-2 gap-2">
                {userPhotos.map(photo => (
                  <div key={photo.id} className="relative group">
                    <button
                      onClick={() => setSelectedPhotoId(photo.id)}
                      className={`w-full aspect-square rounded-lg overflow-hidden border-2 transition ${selectedPhotoId === photo.id ? 'border-orange-500' : 'border-gray-200 hover:border-orange-300'}`}
                    >
                      <img src={photo.dataUrl} alt="upload" className="w-full h-full object-cover" />
                    </button>
                    <button
                      onClick={() => deletePhoto(photo.id)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center"
                    >×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Adjust controls */}
          {selectedPhoto && showAdjustmentControls && (
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Adjust Photo</h3>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button onClick={() => scalePhoto(0.9)} className="flex-1 py-2 bg-gray-100 rounded-lg text-xs font-medium hover:bg-gray-200">− Smaller</button>
                  <button onClick={() => scalePhoto(1.1)} className="flex-1 py-2 bg-gray-100 rounded-lg text-xs font-medium hover:bg-gray-200">+ Larger</button>
                </div>
                <button onClick={fitPhoto} className="w-full py-2 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium hover:bg-orange-200">⊡ Fit to Center</button>
                <button
                  onClick={async () => {
                    if (!selectedPhotoId || !editorRef.current) return;
                    const editorW = editorRef.current.clientWidth;
                    const editorH = editorRef.current.clientHeight;
                    const frameImg = productImages[activeImageIndex] || '';
                    const inner = frameImg
                      ? await detectFrameInnerBounds(frameImg, editorW, editorH)
                      : { x: editorW * 0.18, y: editorH * 0.18, w: editorW * 0.64, h: editorH * 0.64 };
                    setUserPhotos(prev => prev.map(p => {
                      if (p.id !== selectedPhotoId) return p;
                      const scale = Math.max(inner.w / p.width, inner.h / p.height);
                      const w = p.width * scale;
                      const h = p.height * scale;
                      return { ...p, scale, x: inner.x + (inner.w - w) / 2, y: inner.y + (inner.h - h) / 2 };
                    }));
                  }}
                  className="w-full py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200"
                >🖼️ Fit to Frame</button>
                <button onClick={() => deletePhoto(selectedPhoto.id)} className="w-full py-2 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 flex items-center justify-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Remove
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">Drag photo to reposition</p>
            </div>
          )}

          {/* Text Tool */}
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Add Text</h3>
            <select value={selectedFont} onChange={e => setSelectedFont(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg text-xs border border-gray-200 mb-2 focus:outline-none"
              style={{ fontFamily: selectedFont }}>
              {FONTS.map(f => (
                <option key={f.name} value={f.name} style={{ fontFamily: f.name }}>{f.label}</option>
              ))}
            </select>
            <div className="flex gap-2 mb-2">
              <input type="number" min={8} max={120} value={textSize}
                onChange={e => setTextSize(Number(e.target.value))}
                className="w-16 px-2 py-1.5 rounded-lg text-xs border border-gray-200 focus:outline-none text-center" title="Font size" />
              <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)}
                className="w-9 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5" title="Text color" />
              <button onClick={() => setTextBold(b => !b)}
                className={`w-8 h-8 rounded-lg text-xs font-bold border transition ${textBold ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'}`}>B</button>
              <button onClick={() => setTextItalic(i => !i)}
                className={`w-8 h-8 rounded-lg text-xs italic border transition ${textItalic ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'}`}>I</button>
            </div>
            <div className="flex gap-1.5">
              <input type="text" value={newTextInput} onChange={e => setNewTextInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addText()}
                placeholder="Type text..." style={{ fontFamily: selectedFont }}
                className="flex-1 px-2 py-1.5 rounded-lg text-xs border border-gray-200 focus:outline-none" />
              <button onClick={addText} disabled={!newTextInput.trim()}
                className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 disabled:opacity-40 transition">Add</button>
            </div>
          </div>

          {/* Selected text controls */}
          {selectedText && (
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Edit Text</h3>
              <input type="text" value={selectedText.text}
                onChange={e => updateSelectedText({ text: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg text-xs border border-gray-200 focus:outline-none mb-2"
                style={{ fontFamily: selectedText.font }} />
              <select value={selectedText.font} onChange={e => updateSelectedText({ font: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg text-xs border border-gray-200 mb-2 focus:outline-none"
                style={{ fontFamily: selectedText.font }}>
                {FONTS.map(f => (
                  <option key={f.name} value={f.name} style={{ fontFamily: f.name }}>{f.label}</option>
                ))}
              </select>
              <div className="flex gap-2 mb-2">
                <input type="number" min={8} max={120} value={selectedText.size}
                  onChange={e => updateSelectedText({ size: Number(e.target.value) })}
                  className="w-16 px-2 py-1.5 rounded-lg text-xs border border-gray-200 focus:outline-none text-center" />
                <input type="color" value={selectedText.color}
                  onChange={e => updateSelectedText({ color: e.target.value })}
                  className="w-9 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                <button onClick={() => updateSelectedText({ bold: !selectedText.bold })}
                  className={`w-8 h-8 rounded-lg text-xs font-bold border transition ${selectedText.bold ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'}`}>B</button>
                <button onClick={() => updateSelectedText({ italic: !selectedText.italic })}
                  className={`w-8 h-8 rounded-lg text-xs italic border transition ${selectedText.italic ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'}`}>I</button>
              </div>
              <button onClick={() => deleteText(selectedText.id)}
                className="w-full py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove Text
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="p-4">
            {/* Download button removed - users must purchase to download */}
          </div>
        </div>

        {/* Center — Editor Area */}
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-100 p-6 overflow-auto">
          <p className="text-xs text-gray-500 mb-3">
            {userPhotos.length === 0 ? 'Upload your photo from the left panel' : 'Drag your photo to reposition it'}
          </p>

          {/* Editor container */}
          <div
            ref={editorRef}
            className="relative bg-white shadow-2xl rounded-lg overflow-hidden select-none"
            style={{ width: '600px', height: '500px', cursor: 'default' }}
            onClick={() => {
              setSelectedPhotoId(null);
              setSelectedTextId(null);
            }}
          >
            {/* Product frame — on TOP of user photo (z-index 10), creates the frame effect */}
            {activeProductImage ? (
              <img
                src={activeProductImage}
                alt={product?.name || 'Product'}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                style={{ zIndex: 10 }}
                crossOrigin="anonymous"
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <p className="text-gray-400 text-sm">No product image</p>
              </div>
            )}

            {/* User photos — BEHIND the frame (z-index 1), frame overlays on top */}
            {userPhotos.map(photo => {
              const w = photo.width * photo.scale;
              const h = photo.height * photo.scale;
              const isSelected = selectedPhotoId === photo.id;
              const showBorder = isSelected && showAdjustmentControls;
              
              return (
                <div
                  key={photo.id}
                  onMouseDown={e => onMouseDown(e, photo.id)}
                  onClick={e => { e.stopPropagation(); setSelectedPhotoId(photo.id); }}
                  style={{
                    position: 'absolute',
                    left: photo.x,
                    top: photo.y,
                    width: w,
                    height: h,
                    cursor: 'move',
                    border: showBorder ? '2px solid #ff6a3d' : 'none',
                    boxSizing: 'border-box',
                    zIndex: isSelected ? 2 : 1,  // behind frame (frame is z-index 10)
                  }}
                >
                  <img
                    src={photo.dataUrl}
                    alt="user photo"
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover', 
                      display: 'block',
                      pointerEvents: 'none'
                    }}
                    draggable={false}
                  />
                  {/* Delete button on selected */}
                  {isSelected && (
                    <button
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); deletePhoto(photo.id); }}
                      style={{
                        position: 'absolute', top: -10, right: -10,
                        width: 22, height: 22, borderRadius: '50%',
                        background: '#ef4444', color: '#fff',
                        border: 'none', cursor: 'pointer',
                        fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 20,
                      }}
                    >×</button>
                  )}
                  {/* Corner handles for smooth resizing */}
                  {isSelected && (
                    <>
                      {/* Top-left corner */}
                      <div
                        onMouseDown={e => {
                          e.stopPropagation();
                          const startX = e.clientX;
                          const startY = e.clientY;
                          const origScale = photo.scale;
                          const origX = photo.x;
                          const origY = photo.y;
                          
                          const onMove = (ev: MouseEvent) => {
                            const dx = ev.clientX - startX;
                            const dy = ev.clientY - startY;
                            const delta = Math.max(dx, dy) * 0.005;
                            const newScale = Math.max(0.1, origScale + delta);
                            setUserPhotos(prev => prev.map(p =>
                              p.id === photo.id
                                ? { ...p, scale: newScale, x: origX - (photo.width * (newScale - origScale)) / 2, y: origY - (photo.height * (newScale - origScale)) / 2 }
                                : p
                            ));
                          };
                          const onUp = () => {
                            window.removeEventListener('mousemove', onMove);
                            window.removeEventListener('mouseup', onUp);
                          };
                          window.addEventListener('mousemove', onMove);
                          window.addEventListener('mouseup', onUp);
                        }}
                        style={{
                          position: 'absolute', top: -8, left: -8,
                          width: 16, height: 16, borderRadius: '50%',
                          background: '#ff6a3d', border: '2px solid white',
                          cursor: 'nwse-resize', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                          zIndex: 20,
                        }}
                      />
                      {/* Top-right corner */}
                      <div
                        onMouseDown={e => {
                          e.stopPropagation();
                          const startX = e.clientX;
                          const startY = e.clientY;
                          const origScale = photo.scale;
                          const origX = photo.x;
                          const origY = photo.y;
                          
                          const onMove = (ev: MouseEvent) => {
                            const dx = ev.clientX - startX;
                            const dy = ev.clientY - startY;
                            const delta = Math.max(dx, -dy) * 0.005;
                            const newScale = Math.max(0.1, origScale + delta);
                            setUserPhotos(prev => prev.map(p =>
                              p.id === photo.id
                                ? { ...p, scale: newScale, x: origX - (photo.width * (newScale - origScale)) / 2, y: origY - (photo.height * (newScale - origScale)) / 2 }
                                : p
                            ));
                          };
                          const onUp = () => {
                            window.removeEventListener('mousemove', onMove);
                            window.removeEventListener('mouseup', onUp);
                          };
                          window.addEventListener('mousemove', onMove);
                          window.addEventListener('mouseup', onUp);
                        }}
                        style={{
                          position: 'absolute', top: -8, right: -8,
                          width: 16, height: 16, borderRadius: '50%',
                          background: '#ff6a3d', border: '2px solid white',
                          cursor: 'nesw-resize', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                          zIndex: 20,
                        }}
                      />
                      {/* Bottom-left corner */}
                      <div
                        onMouseDown={e => {
                          e.stopPropagation();
                          const startX = e.clientX;
                          const startY = e.clientY;
                          const origScale = photo.scale;
                          const origX = photo.x;
                          const origY = photo.y;
                          
                          const onMove = (ev: MouseEvent) => {
                            const dx = ev.clientX - startX;
                            const dy = ev.clientY - startY;
                            const delta = Math.max(-dx, dy) * 0.005;
                            const newScale = Math.max(0.1, origScale + delta);
                            setUserPhotos(prev => prev.map(p =>
                              p.id === photo.id
                                ? { ...p, scale: newScale, x: origX - (photo.width * (newScale - origScale)) / 2, y: origY - (photo.height * (newScale - origScale)) / 2 }
                                : p
                            ));
                          };
                          const onUp = () => {
                            window.removeEventListener('mousemove', onMove);
                            window.removeEventListener('mouseup', onUp);
                          };
                          window.addEventListener('mousemove', onMove);
                          window.addEventListener('mouseup', onUp);
                        }}
                        style={{
                          position: 'absolute', bottom: -8, left: -8,
                          width: 16, height: 16, borderRadius: '50%',
                          background: '#ff6a3d', border: '2px solid white',
                          cursor: 'nesw-resize', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                          zIndex: 20,
                        }}
                      />
                      {/* Bottom-right corner */}
                      <div
                        onMouseDown={e => {
                          e.stopPropagation();
                          const startX = e.clientX;
                          const startY = e.clientY;
                          const origScale = photo.scale;
                          const origX = photo.x;
                          const origY = photo.y;
                          
                          const onMove = (ev: MouseEvent) => {
                            const dx = ev.clientX - startX;
                            const dy = ev.clientY - startY;
                            const delta = Math.max(dx, dy) * 0.005;
                            const newScale = Math.max(0.1, origScale + delta);
                            setUserPhotos(prev => prev.map(p =>
                              p.id === photo.id
                                ? { ...p, scale: newScale, x: origX - (photo.width * (newScale - origScale)) / 2, y: origY - (photo.height * (newScale - origScale)) / 2 }
                                : p
                            ));
                          };
                          const onUp = () => {
                            window.removeEventListener('mousemove', onMove);
                            window.removeEventListener('mouseup', onUp);
                          };
                          window.addEventListener('mousemove', onMove);
                          window.addEventListener('mouseup', onUp);
                        }}
                        style={{
                          position: 'absolute', bottom: -8, right: -8,
                          width: 16, height: 16, borderRadius: '50%',
                          background: '#ff6a3d', border: '2px solid white',
                          cursor: 'nwse-resize', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                          zIndex: 20,
                        }}
                      />
                    </>
                  )}
                </div>
              );
            })}

            {/* Text layers — draggable */}
            {userTexts.map(txt => {
              const isSelected = selectedTextId === txt.id;
              return (
                <div
                  key={txt.id}
                  onMouseDown={e => onTextMouseDown(e, txt.id)}
                  onClick={e => { e.stopPropagation(); setSelectedTextId(txt.id); setSelectedPhotoId(null); }}
                  style={{
                    position: 'absolute',
                    left: txt.x,
                    top: txt.y,
                    cursor: 'move',
                    fontFamily: txt.font,
                    fontSize: txt.size,
                    color: txt.color,
                    fontWeight: txt.bold ? 'bold' : 'normal',
                    fontStyle: txt.italic ? 'italic' : 'normal',
                    userSelect: 'none',
                    padding: '2px 4px',
                    border: isSelected ? '1.5px dashed #ff6a3d' : '1.5px dashed transparent',
                    borderRadius: '3px',
                    zIndex: isSelected ? 25 : 15,  // above frame (10)
                    whiteSpace: 'nowrap',
                  }}
                >
                  {txt.text}
                  {isSelected && (
                    <button
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); deleteText(txt.id); }}
                      style={{
                        position: 'absolute', top: -10, right: -10,
                        width: 20, height: 20, borderRadius: '50%',
                        background: '#ef4444', color: '#fff',
                        border: 'none', cursor: 'pointer',
                        fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 20,
                      }}
                    >×</button>
                  )}
                </div>
              );
            })}

            {/* Empty state overlay — click to open gallery */}
            {userPhotos.length === 0 && userTexts.length === 0 && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
                style={{ background: 'rgba(0,0,0,0.04)', zIndex: 20 }}
                onClick={e => { e.stopPropagation(); setShowGalleryModal(true); }}
              >
                <div className="flex flex-col items-center justify-center gap-3 px-8 py-6 rounded-2xl transition hover:bg-black/10"
                  style={{ border: '2.5px dashed rgba(0,0,0,0.18)' }}>
                  <span className="text-5xl">🖼️</span>
                  <p className="text-gray-700 text-sm font-bold">Click to add your photo</p>
                  <p className="text-gray-400 text-xs">Tap here to open gallery</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel — Product Images */}
        {productImages.length > 0 && (
          <div className="w-52 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Product Images</h3>
              <div className="space-y-3">
                {productImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIndex(i)}
                    className={`w-full rounded-xl overflow-hidden border-2 transition ${activeImageIndex === i ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200 hover:border-orange-300'}`}
                  >
                    <div className="aspect-square bg-gray-50">
                      <img
                        src={img}
                        alt={`Design ${i + 1}`}
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                    <div className={`py-1.5 text-xs font-medium text-center ${activeImageIndex === i ? 'bg-orange-500 text-white' : 'text-gray-600'}`}>
                      Design {i + 1}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Gallery Modal ────────────────────────────────────────────────── */}
      {showGalleryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowGalleryModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full overflow-hidden flex flex-col"
            style={{ maxWidth: '700px', maxHeight: '85vh', boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Gallery</h2>
                <p className="text-xs text-gray-400 mt-0.5">Upload a photo and it will be placed directly in the frame</p>
              </div>
              <button
                onClick={() => setShowGalleryModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500 text-lg font-bold"
              >×</button>
            </div>

            {/* Upload button */}
            <div className="px-6 pt-4 pb-3 flex items-center gap-3" style={{ borderBottom: '1px solid #f3f4f6' }}>
              <button
                onClick={() => galleryFileInputRef.current?.click()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition hover:bg-blue-600"
                style={{ backgroundColor: '#3b82f6' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Photo
              </button>
              {galleryPhotos.length > 0 && (
                <span className="text-xs text-gray-400">{galleryPhotos.length} photo{galleryPhotos.length > 1 ? 's' : ''} uploaded</span>
              )}
              <input
                ref={galleryFileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => handleGalleryUpload(e.target.files)}
              />
            </div>

            {/* Photo grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {galleryPhotos.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-16 rounded-2xl cursor-pointer hover:bg-gray-50 transition"
                  style={{ border: '2px dashed #e5e7eb' }}
                  onClick={() => galleryFileInputRef.current?.click()}
                >
                  <span className="text-5xl mb-3">📷</span>
                  <p className="text-gray-600 font-semibold mb-1">No photos yet</p>
                  <p className="text-gray-400 text-sm">Click "Upload Photo" or tap here to add images</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {galleryPhotos.map(photo => (
                    <button
                      key={photo.id}
                      onClick={() => placeGalleryPhoto(photo.dataUrl)}
                      className="relative group aspect-square rounded-xl overflow-hidden hover:ring-4 hover:ring-blue-400 transition"
                      style={{ border: '2px solid #e5e7eb' }}
                      title="Click to place in frame"
                    >
                      <img src={photo.dataUrl} alt="" className="w-full h-full object-cover" />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <div className="bg-white rounded-full px-3 py-1.5 text-xs font-bold text-gray-800 shadow">
                          Use this
                        </div>
                      </div>
                    </button>
                  ))}
                  {/* Add more */}
                  <button
                    onClick={() => galleryFileInputRef.current?.click()}
                    className="aspect-square rounded-xl flex flex-col items-center justify-center hover:bg-gray-100 transition"
                    style={{ border: '2px dashed #d1d5db' }}
                  >
                    <span className="text-2xl mb-1">+</span>
                    <span className="text-xs text-gray-400">Add more</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Saved Designs Panel ─────────────────────────────────────────── */}
      {showSavedPanel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowSavedPanel(false)}
        >
          <div
            className="bg-white rounded-2xl w-full overflow-hidden"
            style={{ maxWidth: '680px', maxHeight: '80vh', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">My Saved Designs</h2>
                <p className="text-xs text-gray-400 mt-0.5">{savedDesigns.length} design{savedDesigns.length !== 1 ? 's' : ''} saved</p>
              </div>
              <button
                onClick={() => setShowSavedPanel(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Designs Grid */}
            <div className="overflow-y-auto p-5" style={{ maxHeight: 'calc(80vh - 80px)' }}>
              {savedDesigns.length === 0 ? (
                <div className="text-center py-16">
                  <span className="text-5xl mb-4 block">🎨</span>
                  <p className="text-gray-500 font-medium mb-1">No saved designs yet</p>
                  <p className="text-gray-400 text-sm">Click "Save" in the editor to save your design</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {savedDesigns.map(design => (
                    <div
                      key={design.id}
                      className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200 hover:border-orange-300 transition group"
                    >
                      <div className="aspect-video bg-gray-100 overflow-hidden">
                        {design.thumbnail ? (
                          <img src={design.thumbnail} alt={design.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">🖼</div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-semibold text-gray-800 text-xs truncate mb-0.5">{design.productName}</p>
                        <p className="text-gray-400 text-xs truncate mb-3">
                          {new Date(design.savedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => loadDesign(design)}
                            className="flex-1 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 transition"
                          >Load</button>
                          <button
                            onClick={() => deleteDesign(design.id)}
                            className="w-8 h-7 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition text-sm"
                          >🗑</button>
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

      {/* ── Ready for Review Modal ───────────────────────────────────────── */}
      {showReviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => { setShowReviewModal(false); setReviewSubmitted(false); }}
        >
          <div
            className="bg-white rounded-2xl w-full overflow-hidden"
            style={{ maxWidth: '480px', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}
            onClick={e => e.stopPropagation()}
          >
            {!reviewSubmitted ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg">Ready for Review</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Submit your design for team review</p>
                  </div>
                  <button onClick={() => setShowReviewModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Body */}
                <div className="p-6">
                  {/* Design preview */}
                  <div className="rounded-xl overflow-hidden border border-gray-200 mb-5" style={{ height: '180px', backgroundColor: '#f9fafb' }}>
                    {reviewPreviewImage ? (
                      <img src={reviewPreviewImage} alt="Design preview" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
                        Generating preview...
                      </div>
                    )}
                  </div>

                  {/* Product info */}
                  <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ backgroundColor: '#f3f4f6' }}>
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{product?.name || 'Design'}</p>
                      <p className="text-xs text-gray-400">₹{displayPrice.toFixed(2)} · Qty: {quantity}</p>
                    </div>
                  </div>

                  {/* Note */}
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Add a note (optional)</label>
                  <textarea
                    value={reviewNote}
                    onChange={e => setReviewNote(e.target.value)}
                    placeholder="Any special instructions or notes for the review team..."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none resize-none mb-5"
                    style={{ border: '1.5px solid #e5e7eb', color: '#374151' }}
                  />

                  {/* Info box */}
                  <div className="flex items-start gap-2 p-3 rounded-xl mb-5" style={{ backgroundColor: '#eff6ff', border: '1px solid #dbeafe' }}>
                    <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Our team will review your design within 24 hours. You'll be notified once it's approved and ready to print.
                    </p>
                  </div>

                  {/* Submit */}
                  <button
                    onClick={submitForReview}
                    disabled={reviewSubmitting}
                    className="w-full py-3 rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#111111', color: '#ffffff' }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {reviewSubmitting ? 'Submitting...' : 'Submit for Review'}
                  </button>
                </div>
              </>
            ) : (
              /* Success State */
              <div className="p-10 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ backgroundColor: '#16a34a', boxShadow: '0 0 0 12px #dcfce7' }}>
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="font-bold text-gray-900 text-xl mb-2">Submitted for Review!</h2>
                <p className="text-sm text-gray-500 mb-1">Your design has been submitted successfully.</p>
                <p className="text-sm text-gray-400 mb-6">Our team will review it within 24 hours.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowReviewModal(false); setReviewSubmitted(false); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ backgroundColor: '#f3f4f6', color: '#374151' }}
                  >
                    Continue Editing
                  </button>
                  <button
                    onClick={() => navigate('/cart')}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                    style={{ backgroundColor: '#111111' }}
                  >
                    Go to Cart
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleFrameEditorPage;
