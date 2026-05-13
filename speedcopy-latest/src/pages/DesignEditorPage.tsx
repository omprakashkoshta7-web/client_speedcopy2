// Design Editor Page - Fixed fabric v7 compatibility and sendObjectToBack method
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fabric } from 'fabric';
import { jsPDF } from 'jspdf';
import {
  ArrowLeft,
  Download,
  Eye,
  FolderOpen,
  ImagePlus,
  LayoutTemplate,
  Minus,
  Palette,
  PenTool,
  Plus,
  Redo2,
  Save,
  Square,
  Trash2,
  Type,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import orderService from '../services/order.service';
import productService from '../services/product.service';
import designService, { type DesignTemplate, type SavedDesign } from '../services/design.service';
import { useAuth } from '../context/AuthContext';
import { API_CONFIG } from '../config/api.config';

type ToolTab = 'images' | 'layouts' | 'text' | 'draw' | 'shapes';

type EditorPage = {
  id: string;
  name: string;
  json: string | null;
  thumbnail: string;
};

type ProductRecord = {
  _id?: string;
  id?: string;
  name?: string;
  thumbnail?: string;
  image?: string;
  images?: string[];
  flowType?: string;
  basePrice?: number;
  discountedPrice?: number;
  mrp?: number;
  sale_price?: number;
  category?: { name?: string; slug?: string } | string;
};

const STORAGE_PREFIX = 'speedcopy_gifting_editor_';

const createPageId = () => `page_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const makePlaceholderThumbnail = (label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="140" viewBox="0 0 240 140">
      <rect width="240" height="140" rx="18" fill="#d8d8d8"/>
      <rect x="24" y="24" width="192" height="92" rx="14" fill="#bebebe"/>
      <text x="120" y="128" fill="#6b7280" font-size="16" font-family="Arial" text-anchor="middle">${label}</text>
    </svg>
  `)}`;

const defaultPages = (): EditorPage[] => [
  { id: createPageId(), name: 'Back cover', json: null, thumbnail: makePlaceholderThumbnail('Back cover') },
  { id: createPageId(), name: 'Front cover', json: null, thumbnail: makePlaceholderThumbnail('Front cover') },
];

// Helper function to normalize image URLs to absolute URLs
const normalizeImageUrl = (url: string): string => {
  if (!url) return '';
  
  // If it's already a data URL or absolute URL, return as-is
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it's a relative URL, prepend the API base URL
  if (url.startsWith('/')) {
    const baseUrl = API_CONFIG.BASE_URL || window.location.origin;
    return `${baseUrl}${url}`;
  }
  
  // For other cases, treat as relative to API base
  const baseUrl = API_CONFIG.BASE_URL || window.location.origin;
  return `${baseUrl}/${url}`;
};

// Helper function to load image with Promise wrapper
const loadImageAsync = (
  url: string,
  options?: any
): Promise<fabric.Image> => {
  return new Promise((resolve, reject) => {
    const normalizedUrl = normalizeImageUrl(url);
    console.log('[loadImageAsync] Loading image from:', normalizedUrl, '(original:', url, ')');
    
    fabric.Image.fromURL(
      normalizedUrl,
      (img: any) => {
        if (!img) {
          console.warn('[loadImageAsync] Failed to load image');
          reject(new Error('Failed to load image'));
        } else {
          console.log('[loadImageAsync] Image loaded successfully:', img.width, 'x', img.height);
          resolve(img);
        }
      },
      { ...options, crossOrigin: 'anonymous' },
      (err: any) => {
        console.error('[loadImageAsync] Image load error:', err);
        reject(err);
      }
    );
  });
};

const DesignEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<ToolTab>('images');
  const [pages, setPages] = useState<EditorPage[]>(() => defaultPages());
  const [activePageId, setActivePageId] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [selectedObjectType, setSelectedObjectType] = useState('');
  const [uploadedAssets, setUploadedAssets] = useState<string[]>([]);
  const [textInput, setTextInput] = useState('Add your memory');
  const [fontSize, setFontSize] = useState(26);
  const [fontColor, setFontColor] = useState('#202020');
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('normal');
  const [fontStyle, setFontStyle] = useState<'normal' | 'italic'>('normal');
  const [brushSize, setBrushSize] = useState(4);
  const [brushColor, setBrushColor] = useState('#ff6a3d');
  const [zoom, setZoom] = useState(100);
  const [quantity, setQuantity] = useState(1);
  const [previewImage, setPreviewImage] = useState('');
  const [hideFooter, setHideFooter] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [premiumTemplates, setPremiumTemplates] = useState<DesignTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [savedDesignId, setSavedDesignId] = useState<string | null>(null);

  const productId = searchParams.get('productId');
  const flow = (searchParams.get('flow') || 'gifting') as 'gifting' | 'shopping' | 'business_printing';
  const designMode = (searchParams.get('designMode') || 'normal') as 'premium' | 'normal';
  const categoryParam = searchParams.get('category') || '';
  const activePage = useMemo(
    () => pages.find((page) => page.id === activePageId) || pages[0] || null,
    [pages, activePageId]
  );
  const salePrice = product?.sale_price ?? product?.discountedPrice ?? product?.basePrice ?? 0;
  const mrp = product?.mrp ?? product?.basePrice ?? salePrice;
  const displayPrice = salePrice || mrp || 0;

  const storageKey = `${STORAGE_PREFIX}${productId || 'draft'}_${designMode}`;

  useEffect(() => {
    void initializeEditor();
    return () => {
      canvas?.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize activePageId when pages are loaded
  useEffect(() => {
    if (pages.length > 0 && !activePageId) {
      console.log('Setting activePageId to:', pages[0].id);
      setActivePageId(pages[0].id);
    }
  }, [pages]);

  // Debug: Log pages whenever they change
  useEffect(() => {
    console.log('Pages updated:', pages);
    console.log('Active page ID:', activePageId);
  }, [pages, activePageId]);

    // Load frames from backend when productId changes
  useEffect(() => {
    if (!productId || !product) return;
    
    const loadFramesFromBackend = async () => {
      try {
        console.log('🎯 [loadFramesFromBackend] Starting - productId:', productId);
        
        // STEP 1: Try to load frames from backend API
        try {
          console.log('📡 [loadFramesFromBackend] Calling designService.loadProductFrames...');
          const frames = await designService.loadProductFrames(productId);
          console.log('✅ [loadFramesFromBackend] Frames loaded from API:', frames);
          
          if (frames && Array.isArray(frames) && frames.length > 0) {
            console.log('✅ [loadFramesFromBackend] Found', frames.length, 'frames from backend');
            
            // Backend returns: { _id, id, name, frameName, canvasJson, thumbnail, image, dimensions }
            const editorPages: EditorPage[] = frames.map((frame: any) => {
              const pageId = frame._id?.toString() || frame.id?.toString() || createPageId();
              const pageName = frame.frameName || frame.name || 'Frame';
              
              // If canvasJson exists, use it; otherwise we'll load the image as frame
              const pageJson = frame.canvasJson ? JSON.stringify(frame.canvasJson) : null;
              
              // Use thumbnail or image URL from backend
              const pageThumbnail = normalizeImageUrl(frame.thumbnail || frame.image || '');
              
              console.log(`  📄 Frame: ${pageName} (${pageId}), has JSON: ${!!pageJson}, thumbnail: ${pageThumbnail.substring(0, 50)}...`);
              
              return {
                id: pageId,
                name: pageName,
                json: pageJson,
                thumbnail: pageThumbnail,
              };
            });
            
            console.log('✅ [loadFramesFromBackend] Setting', editorPages.length, 'pages from backend frames');
            setPages(editorPages);
            
            if (editorPages.length > 0 && !activePageId) {
              console.log('✅ [loadFramesFromBackend] Setting activePageId to:', editorPages[0].id);
              setActivePageId(editorPages[0].id);
            }
            return;
          } else {
            console.log('⚠️ [loadFramesFromBackend] No frames from backend (empty or null)');
          }
        } catch (apiError) {
          console.warn('❌ [loadFramesFromBackend] Backend frames API error:', apiError);
        }
        
        // STEP 2: Fallback - use product images as frames
        console.log('📦 [loadFramesFromBackend] Using fallback - product images as frames');
        
        if (product.images && Array.isArray(product.images) && product.images.length > 0) {
          console.log('✅ [loadFramesFromBackend] Found', product.images.length, 'product images');
          
          const imageFrames: EditorPage[] = product.images.map((imageUrl: string, index: number) => ({
            id: createPageId(),
            name: `Frame ${index + 1}`,
            json: null,
            thumbnail: normalizeImageUrl(imageUrl),
          }));
          
          console.log('✅ [loadFramesFromBackend] Setting', imageFrames.length, 'pages from product images');
          setPages(imageFrames);
          
          if (imageFrames.length > 0 && !activePageId) {
            console.log('✅ [loadFramesFromBackend] Setting activePageId to:', imageFrames[0].id);
            setActivePageId(imageFrames[0].id);
          }
        } else if (product.thumbnail || product.image) {
          // Single image fallback
          console.log('✅ [loadFramesFromBackend] Using single product image as frame');
          const singleFrame: EditorPage[] = [{
            id: createPageId(),
            name: 'Frame 1',
            json: null,
            thumbnail: normalizeImageUrl(product.thumbnail || product.image || ''),
          }];
          
          setPages(singleFrame);
          if (!activePageId) {
            setActivePageId(singleFrame[0].id);
          }
        } else {
          // No images at all - use default placeholder
          console.log('⚠️ [loadFramesFromBackend] No product images found, using default placeholder');
          const defaultPagesData = defaultPages();
          setPages(defaultPagesData);
          if (defaultPagesData.length > 0 && !activePageId) {
            setActivePageId(defaultPagesData[0].id);
          }
        }
      } catch (error) {
        console.error('❌ [loadFramesFromBackend] Error loading frames:', error);
        const defaultPagesData = defaultPages();
        setPages(defaultPagesData);
        if (defaultPagesData.length > 0 && !activePageId) {
          setActivePageId(defaultPagesData[0].id);
        }
      }
    };
    
    loadFramesFromBackend();
  }, [productId, product]); // eslint-disable-line react-hooks/exhaustive-deps

  const initializeEditor = async () => {
    try {
      if (!productId) {
        navigate('/gifting');
        return;
      }

      setLoading(true);
      setError('');

      let productPayload: ProductRecord | null = null;
      try {
        const giftingResponse = await productService.getGiftingProductById(productId);
        productPayload = (giftingResponse?.data || giftingResponse) as ProductRecord;
      } catch {
        const genericResponse = await productService.getProductById(productId);
        productPayload = (genericResponse?.data || genericResponse) as ProductRecord;
      }

      setProduct(productPayload || null);

      const storedDraft = localStorage.getItem(storageKey);
      const parsedDraft = storedDraft ? JSON.parse(storedDraft) : null;
      const initialPages: EditorPage[] = parsedDraft?.pages?.length ? parsedDraft.pages : defaultPages();
      const initialAssets: string[] = Array.isArray(parsedDraft?.uploadedAssets) ? parsedDraft.uploadedAssets : [];
      const initialTemplateId =
        searchParams.get('templateId') || parsedDraft?.selectedTemplateId || null;

      setSelectedTemplateId(initialTemplateId);

      if (canvasRef.current) {
        // Create canvas with initial size - will be adjusted based on frame
        const canvasWidth = 1000;
        const canvasHeight = 1200;
        
        const nextCanvas = new fabric.Canvas(canvasRef.current, {
          width: canvasWidth,
          height: canvasHeight,
          backgroundColor: '#f5f5f5', // Light gray to see content
          preserveObjectStacking: true,
        });

        nextCanvas.selectionColor = 'rgba(255, 106, 61, 0.12)';
        nextCanvas.selectionBorderColor = '#ff6a3d';
        nextCanvas.selectionLineWidth = 1.2;

        nextCanvas.on('selection:created', syncSelectionState);
        nextCanvas.on('selection:updated', syncSelectionState);
        nextCanvas.on('selection:cleared', () => setSelectedObjectType(''));
        nextCanvas.on('object:modified', () => saveCanvasSnapshot(nextCanvas));
        nextCanvas.on('path:created', () => saveCanvasSnapshot(nextCanvas));

        if (nextCanvas.freeDrawingBrush) {
          nextCanvas.freeDrawingBrush.color = brushColor;
          nextCanvas.freeDrawingBrush.width = brushSize;
        }

        setCanvas(nextCanvas);

        if (designMode === 'premium') {
          setTemplatesLoading(true);
          const response = await designService.getPremiumTemplates({
            productId,
            category:
              categoryParam ||
              (typeof productPayload?.category === 'string'
                ? productPayload.category
                : productPayload?.category?.name) ||
              undefined,
          });
          setPremiumTemplates(response.data || []);
          setTemplatesLoading(false);

          if (initialTemplateId) {
            const designResponse = await designService.createFromTemplate({
              productId,
              templateId: initialTemplateId,
              flowType: flow,
            });
            await hydratePremiumDesign(nextCanvas, designResponse.data, initialAssets);
          } else {
            setPages([]);
            setActivePageId('');
            setUploadedAssets(initialAssets);
            seedEmptySpread(nextCanvas);
          }
        } else {
          // Normal mode - always show default pages
          const pagesToUse = initialPages.length > 0 ? initialPages : defaultPages();
          setPages(pagesToUse);
          const activeId = parsedDraft?.activePageId || pagesToUse[0]?.id || '';
          setActivePageId(activeId);
          setUploadedAssets(initialAssets);

          const pageToLoad = pagesToUse[0];
          if (pageToLoad) {
            await loadPageOnCanvas(nextCanvas, pageToLoad);
          } else {
            seedEmptySpread(nextCanvas);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to initialize gifting editor:', err);
      setError(err?.message || 'Failed to load gifting editor');
    } finally {
      setLoading(false);
    }
  };

  const hydratePremiumDesign = async (
    targetCanvas: fabric.Canvas,
    design: SavedDesign,
    assets: string[]
  ) => {
    const pageId = createPageId();
    const pageName = design.name || 'Premium Design';
    const nextPages: EditorPage[] = [
      {
        id: pageId,
        name: pageName,
        json: JSON.stringify(design.canvasJson || {}),
        thumbnail: design.previewImage || makePlaceholderThumbnail(pageName),
      },
    ];

    setSavedDesignId(design._id);
    setPages(nextPages);
    setActivePageId(pageId);
    setUploadedAssets(assets);
    await loadPageOnCanvas(targetCanvas, nextPages[0]);
  };

  const syncSelectionState = () => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    setSelectedObjectType(activeObject?.type || '');
  };

  const seedEmptySpread = (targetCanvas: fabric.Canvas) => {
    targetCanvas.clear();
    targetCanvas.backgroundColor = '#f5f5f5'; // Light gray background to see frame
    
    // Load product image as frame with proper scaling
    if (product?.thumbnail || product?.image) {
      const imageUrl = product.thumbnail || product.image;
      if (imageUrl) {
        loadImageAsync(imageUrl)
          .then((img: any) => {
            if (!img) {
              console.warn('Failed to load frame image');
              targetCanvas.backgroundColor = '#f0f0f0';
              targetCanvas.renderAll();
              return;
            }

            // STEP 1: Canvas size ko frame ke hisaab se set karo
            const maxWidth = 900;
            const scale = maxWidth / img.width;
            
            const newWidth = img.width * scale;
            const newHeight = img.height * scale;
            
            // Update canvas dimensions
            targetCanvas.setDimensions({ width: newWidth, height: newHeight });
            
            targetCanvas.clear();
            targetCanvas.backgroundColor = '#f5f5f5'; // Keep background visible
            
            // STEP 2: Frame ko perfectly fit karo
            img.set({
              left: 0,
              top: 0,
              originX: 'left',
              originY: 'top',
              scaleX: scale,
              scaleY: scale,
              selectable: false,
              evented: false,
              name: 'frame_background', // Add name to identify frame
            });
            
            targetCanvas.add(img);
            targetCanvas.renderAll();
            
            console.log(`[seedEmptySpread] ✅ Frame visible: ${img.width}x${img.height}, scale: ${scale.toFixed(3)}, canvas: ${newWidth}x${newHeight}`);
          })
          .catch((err: any) => {
            console.warn('[seedEmptySpread] Failed to load frame image:', err);
            targetCanvas.backgroundColor = '#f0f0f0';
            targetCanvas.renderAll();
          });
      }
    } else {
      targetCanvas.backgroundColor = '#f0f0f0';
      targetCanvas.renderAll();
    }
  };

  const ensureEmptyPageBase = (targetCanvas: fabric.Canvas) => {
    // Don't add placeholder if background image is set
    if (targetCanvas.backgroundImage) {
      return;
    }
    if (targetCanvas.getObjects().length === 0) {
      seedEmptySpread(targetCanvas);
    }
  };

  const loadPageOnCanvas = async (targetCanvas: fabric.Canvas, page: EditorPage) => {
    console.log('[loadPageOnCanvas] START - Page:', page.id, 'Has JSON:', !!page.json, 'Thumbnail:', page.thumbnail);
    
    if (page.json) {
      await new Promise<void>((resolve) => {
        targetCanvas.loadFromJSON(page.json as any, () => {
          targetCanvas.renderAll();
          console.log('[loadPageOnCanvas] Loaded from JSON');
          resolve();
        });
      });
    } else {
      // Load frame image from page thumbnail (which contains product images)
      const frameUrl = page.thumbnail || product?.thumbnail || product?.image;
      
      console.log('[loadPageOnCanvas] Frame URL:', frameUrl, 'Product:', product?.name);
      
      if (frameUrl) {
        console.log('[loadPageOnCanvas] Starting image load from:', frameUrl);
        
        try {
          // Use Promise-based image loading for proper async handling
          const img = await loadImageAsync(frameUrl);
          
          if (!img || !img.width || !img.height) {
            console.warn('[loadPageOnCanvas] Invalid image, using empty canvas');
            seedEmptySpread(targetCanvas);
          } else {
            console.log('[loadPageOnCanvas] Image loaded successfully:', img.width, 'x', img.height);
            targetCanvas.clear();
            
            // STEP 1: Canvas size ko frame ke hisaab se set karo
            const maxWidth = 900;
            const scale = maxWidth / img.width;
            
            const newWidth = img.width * scale;
            const newHeight = img.height * scale;
            
            // Update canvas dimensions
            targetCanvas.setDimensions({ width: newWidth, height: newHeight });
            
            // Set visible background
            targetCanvas.backgroundColor = '#f5f5f5';
            
            // STEP 2: Frame ko perfectly fit karo
            img.set({
              left: 0,
              top: 0,
              originX: 'left',
              originY: 'top',
              scaleX: scale,
              scaleY: scale,
              selectable: false,
              evented: false,
              name: 'frame_background', // Add name to identify frame
              opacity: 1, // Ensure full opacity
            });
            
            targetCanvas.add(img);
            targetCanvas.renderAll();
            
            console.log(`[loadPageOnCanvas] ✅ Frame loaded and VISIBLE: ${img.width}x${img.height}, scale: ${scale.toFixed(3)}, canvas: ${newWidth}x${newHeight}`);
            console.log('[loadPageOnCanvas] Canvas objects count:', targetCanvas.getObjects().length);
            console.log('[loadPageOnCanvas] Frame object:', img);
          }
        } catch (error) {
          console.error('[loadPageOnCanvas] Error loading frame image:', error);
          // Fall back to empty canvas on error
          seedEmptySpread(targetCanvas);
        }
      } else {
        console.log('[loadPageOnCanvas] No frame URL available, using empty canvas');
        seedEmptySpread(targetCanvas);
      }
    }

    const currentJSON = JSON.stringify(targetCanvas.toJSON());
    setHistory([currentJSON]);
    setHistoryStep(0);
    setSelectedObjectType('');
    updatePageSnapshot(targetCanvas, page.id, false);
    console.log('[loadPageOnCanvas] END - Snapshot updated');
  };

  const updatePageSnapshot = (targetCanvas: fabric.Canvas, pageId: string, pushHistory = true) => {
    const json = JSON.stringify(targetCanvas.toJSON());
    const thumbnail = targetCanvas.toDataURL({
      format: 'png',
      multiplier: 0.2,
      quality: 0.8,
    });

    setPages((prev) =>
      prev.map((page) =>
        page.id === pageId
          ? {
              ...page,
              json,
              thumbnail,
            }
          : page
      )
    );

    if (pushHistory) {
      setHistory((prev) => [...prev.slice(0, historyStep + 1), json]);
      setHistoryStep((prev) => prev + 1);
    }
  };

  // Load page on canvas when activePageId changes (not when pages change)
  useEffect(() => {
    if (!canvas) {
      return; // Silently return if canvas not ready
    }
    
    if (!activePageId) {
      return; // Silently return if no active page
    }
    
    const page = pages.find((entry) => entry.id === activePageId);
    if (!page) {
      console.log('⚠️ [useEffect] Page not found for activePageId:', activePageId);
      return;
    }
    
    console.log('✅ [useEffect] Loading page on canvas:', page.id, page.name);
    void loadPageOnCanvas(canvas, page);
  }, [activePageId, canvas]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        activePageId,
        pages,
        uploadedAssets,
        selectedTemplateId,
      })
    );
  }, [activePageId, pages, selectedTemplateId, storageKey, uploadedAssets]);

  useEffect(() => {
    if (!canvas?.freeDrawingBrush) return;
    canvas.freeDrawingBrush.color = brushColor;
    canvas.freeDrawingBrush.width = brushSize;
  }, [brushColor, brushSize, canvas]);

  const saveCanvasSnapshot = (targetCanvas: fabric.Canvas) => {
    if (!activePageId) return;
    updatePageSnapshot(targetCanvas, activePageId, true);
  };

  const switchPage = async (pageId: string) => {
    if (!canvas || pageId === activePageId) return;
    if (activePageId) {
      updatePageSnapshot(canvas, activePageId, false);
    }
    setActivePageId(pageId);
  };

  const addText = () => {
    if (!canvas || !textInput.trim()) return;

    const text = new fabric.IText(textInput, {
      left: 180,
      top: 180,
      fontSize,
      fill: fontColor,
      fontFamily: 'Georgia',
      fontWeight,
      fontStyle,
      cornerColor: '#ff6a3d',
      borderColor: '#ff6a3d',
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    saveCanvasSnapshot(canvas);
    setActiveTab('text');
  };

  const addShape = (type: 'rectangle' | 'circle' | 'line') => {
    if (!canvas) return;

    let shape: fabric.Object;

    if (type === 'rectangle') {
      shape = new fabric.Rect({
        left: 200,
        top: 200,
        width: 180,
        height: 110,
        fill: 'rgba(255, 106, 61, 0.18)',
        stroke: brushColor,
        strokeWidth: 2,
      });
    } else if (type === 'circle') {
      shape = new fabric.Circle({
        left: 220,
        top: 220,
        radius: 54,
        fill: 'rgba(255, 106, 61, 0.16)',
        stroke: brushColor,
        strokeWidth: 2,
      });
    } else {
      shape = new fabric.Line([220, 220, 420, 310], {
        stroke: brushColor,
        strokeWidth: 4,
      });
    }

    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();
    saveCanvasSnapshot(canvas);
  };

  const toggleDrawingMode = () => {
    if (!canvas) return;
    canvas.isDrawingMode = !canvas.isDrawingMode;
    canvas.renderAll();
    setActiveTab('draw');
  };

  const deleteSelected = () => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    canvas.remove(activeObject);
    canvas.discardActiveObject();
    canvas.renderAll();
    saveCanvasSnapshot(canvas);
  };

  const bringToFront = () => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    canvas.bringToFront(activeObject);
    canvas.renderAll();
    saveCanvasSnapshot(canvas);
  };

  const sendToBack = () => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    canvas.sendToBack(activeObject);
    ensureEmptyPageBase(canvas);
    canvas.renderAll();
    saveCanvasSnapshot(canvas);
  };

  const undo = () => {
    if (!canvas || historyStep <= 0) return;
    const nextStep = historyStep - 1;
    const json = history[nextStep];
    canvas.loadFromJSON(json as any, () => {
      canvas.renderAll();
      setHistoryStep(nextStep);
      updatePageSnapshot(canvas, activePageId, false);
    });
  };

  const redo = () => {
    if (!canvas || historyStep >= history.length - 1) return;
    const nextStep = historyStep + 1;
    const json = history[nextStep];
    canvas.loadFromJSON(json as any, () => {
      canvas.renderAll();
      setHistoryStep(nextStep);
      updatePageSnapshot(canvas, activePageId, false);
    });
  };

  const saveDesign = () => {
    if (!canvas || !activePageId) return;
    updatePageSnapshot(canvas, activePageId, false);
    setSaveMessage('Design saved to this browser');
    window.setTimeout(() => setSaveMessage(''), 2400);
  };

  // Print-Ready Export Functions
  const exportPrintReady = () => {
    if (!canvas) return;
    
    // High-quality export for printing (300 DPI equivalent)
    const printImage = canvas.toDataURL({
      format: 'jpeg',
      quality: 1,
      multiplier: 3, // 3x resolution for print quality
    });
    
    const link = document.createElement('a');
    link.href = printImage;
    link.download = `${product?.name || 'design'}-print-ready.jpg`;
    link.click();
  };

  const exportPDF = () => {
    if (!canvas) return;
    
    try {
      // Photobook dimensions: 8 x 10 inches at 300 DPI
      const pageWidth = 8; // inches
      const pageHeight = 10; // inches
      
      // Get high-quality image
      const imgData = canvas.toDataURL({ format: 'jpeg', quality: 1, multiplier: 1 });
      
      // Create PDF with proper dimensions
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: [pageWidth, pageHeight],
      });
      
      // Add image to PDF (with bleed consideration)
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
      
      // Save PDF
      pdf.save(`${product?.name || 'design'}-print-ready.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const clearCanvas = () => {
    if (!canvas) return;
    if (!window.confirm('Clear all elements from this page?')) return;
    seedEmptySpread(canvas);
    saveCanvasSnapshot(canvas);
  };

  const handleFilesAdded = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const nextAssets: string[] = [];
    for (const file of Array.from(files)) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      nextAssets.push(dataUrl);
    }
    setUploadedAssets((prev) => [...nextAssets, ...prev]);
    setActiveTab('images');
  };

  const addImageToCanvas = (src: string) => {
    if (!canvas) {
      console.error('[addImageToCanvas] Canvas not initialized');
      return;
    }
    
    console.log('[addImageToCanvas] Adding image from:', src.substring(0, 50) + '...');
    
    // For data URLs, don't use crossOrigin; for external URLs, use it
    const options: any = src.startsWith('data:') ? {} : { crossOrigin: 'anonymous' };
    
    fabric.Image.fromURL(
      src,
      (img: any) => {
        if (!img) {
          console.error('[addImageToCanvas] Failed to load image');
          alert('Failed to add image to canvas.');
          return;
        }

        console.log('[addImageToCanvas] Image loaded, dimensions:', img.width, 'x', img.height);
        
        // Get canvas dimensions (frame size)
        const frameWidth = canvas.width!;
        const frameHeight = canvas.height!;
        
        // Calculate center position
        const centerX = frameWidth / 2;
        const centerY = frameHeight / 2;
        
        // Calculate optimal scale to fit image within frame
        // Use 70% of frame size for better visibility
        const maxWidth = frameWidth * 0.7;
        const maxHeight = frameHeight * 0.7;
        
        // Calculate scale based on both width and height
        const scaleX = maxWidth / img.width;
        const scaleY = maxHeight / img.height;
        const scale = Math.min(scaleX, scaleY); // Use smaller scale to fit within bounds
        
        // Set image properties
        img.set({
          left: centerX,
          top: centerY,
          originX: 'center',
          originY: 'center',
          scaleX: scale,
          scaleY: scale,
          cornerColor: '#ff6a3d',
          borderColor: '#ff6a3d',
          cornerSize: 12,
          transparentCorners: false,
          cornerStyle: 'circle',
        });
        
        // Add image to canvas
        canvas.add(img);
        
        // Bring image to front (above the frame)
        canvas.bringToFront(img);
        
        // Select the image
        canvas.setActiveObject(img);
        canvas.renderAll();
        saveCanvasSnapshot(canvas);
        
        console.log('[addImageToCanvas] ✅ Image added successfully');
        console.log('  Position: (', centerX, ',', centerY, ')');
        console.log('  Scale:', scale.toFixed(3));
        console.log('  Frame size:', frameWidth, 'x', frameHeight);
        console.log('  Image size:', (img.width * scale).toFixed(0), 'x', (img.height * scale).toFixed(0));
        console.log('  Total objects:', canvas.getObjects().length);
      },
      options
    );
  };

  const createPage = () => {
    const nextPage: EditorPage = {
      id: createPageId(),
      name: `Page ${pages.length + 1}`,
      json: null,
      thumbnail: makePlaceholderThumbnail(`Page ${pages.length + 1}`),
    };
    setPages((prev) => [...prev, nextPage]);
    setActivePageId(nextPage.id);
  };

  const duplicatePage = () => {
    if (!activePage) return;
    const duplicated: EditorPage = {
      ...activePage,
      id: createPageId(),
      name: `${activePage.name} Copy`,
    };
    setPages((prev) => [...prev, duplicated]);
    setActivePageId(duplicated.id);
  };

  const removeCurrentPage = () => {
    if (pages.length <= 1 || !activePageId) return;
    const nextPages = pages.filter((page) => page.id !== activePageId);
    setPages(nextPages);
    setActivePageId(nextPages[0].id);
  };

  const applyLayout = (layout: 'single' | 'split' | 'two-photo') => {
    if (!canvas) return;
    seedEmptySpread(canvas);

    if (layout === 'single') {
      const frame = new fabric.Rect({
        left: 186,
        top: 136,
        width: 220,
        height: 220,
        fill: 'rgba(255,255,255,0.9)',
        stroke: '#d6d6d6',
        strokeWidth: 1,
      });
      canvas.add(frame);
    }

    if (layout === 'split') {
      const first = new fabric.Rect({
        left: 120,
        top: 110,
        width: 220,
        height: 280,
        fill: 'rgba(255,255,255,0.86)',
        stroke: '#d8d8d8',
        strokeWidth: 1,
      });
      const second = new fabric.Rect({
        left: 620,
        top: 110,
        width: 220,
        height: 280,
        fill: 'rgba(255,255,255,0.22)',
        stroke: '#ededed',
        strokeWidth: 1,
      });
      canvas.add(first, second);
    }

    if (layout === 'two-photo') {
      const first = new fabric.Rect({
        left: 104,
        top: 122,
        width: 170,
        height: 200,
        fill: '#fff',
        stroke: '#d8d8d8',
        strokeWidth: 1,
      });
      const second = new fabric.Rect({
        left: 292,
        top: 164,
        width: 170,
        height: 200,
        fill: '#fff',
        stroke: '#d8d8d8',
        strokeWidth: 1,
      });
      canvas.add(first, second);
    }

    canvas.renderAll();
    saveCanvasSnapshot(canvas);
  };

  const previewCurrentDesign = () => {
    if (!canvas) return;
    setPreviewImage(canvas.toDataURL({ multiplier: 1, format: 'png' }));
    setShowPreview(true);
  };

  const selectPremiumTemplate = async (template: DesignTemplate) => {
    if (!canvas || !productId) return;

    try {
      setTemplatesLoading(true);
      setError('');
      const response = await designService.createFromTemplate({
        productId,
        templateId: template._id,
        flowType: flow,
      });
      setSelectedTemplateId(template._id);
      await hydratePremiumDesign(canvas, response.data, uploadedAssets);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load premium template');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const addToCartWithDesign = async () => {
    // Check if user is logged in
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    if (!canvas || !product) {
      console.error('[addToCartWithDesign] Missing canvas or product');
      setError('Cannot add to cart: Missing canvas or product data');
      return;
    }

    try {
      const productId = (product._id || product.id || searchParams.get('productId') || '').toString();
      const designId = savedDesignId || `editor-${productId}-${Date.now()}`;
      
      console.log('[addToCartWithDesign] Generating preview...');
      
      // Generate compressed preview for cart display
      const designPreview = canvas.toDataURL({
        format: 'jpeg',
        quality: 0.6,
        multiplier: 0.5,
      });

      console.log('[addToCartWithDesign] Preview generated, size:', designPreview.length);
      console.log('[addToCartWithDesign] Adding to cart with data:', {
        productId,
        productName: product.name,
        flowType: flow,
        quantity,
        unitPrice: displayPrice,
      });

      await orderService.addToCart({
        productId,
        productName: product.name || 'Gifting Product',
        flowType: flow,
        quantity,
        unitPrice: displayPrice,
        totalPrice: displayPrice * quantity,
        designId,
        thumbnail: designPreview, // Use compressed preview as thumbnail
        designPreview, // Also send as designPreview for cart display
        designJson: '', // Don't send heavy JSON
        designName: `${product.name || 'Design'} editor`,
        options: {
          source: 'design-editor',
          productPrice: displayPrice,
          productName: product.name || '',
          designMode,
          templateId: selectedTemplateId || undefined,
        },
      });

      console.log('[addToCartWithDesign] Successfully added to cart');
      saveDesign();
      navigate('/cart');
    } catch (err: any) {
      console.error('[addToCartWithDesign] Error:', err);
      console.error('[addToCartWithDesign] Error response:', err?.response);
      console.error('[addToCartWithDesign] Error data:', err?.response?.data);
      
      const errorMessage = err?.response?.data?.message 
        || err?.response?.data?.error?.message
        || err?.message 
        || 'Failed to add design to cart. Please try again.';
      
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
    }
  };

  const renderLeftRail = () => {
    const items: Array<{ key: ToolTab; label: string; icon: React.ReactNode }> = [
      { key: 'images', label: 'Images', icon: <ImagePlus size={16} /> },
      { key: 'layouts', label: 'Layouts', icon: <LayoutTemplate size={16} /> },
      { key: 'text', label: 'Text', icon: <Type size={16} /> },
      { key: 'draw', label: 'Draw', icon: <PenTool size={16} /> },
      { key: 'shapes', label: 'Shapes', icon: <Square size={16} /> },
    ];

    return (
      <div className="w-[74px] shrink-0 border-r border-gray-200 bg-[#fbfbfb]">
        <div className="flex h-full flex-col items-center gap-3 px-2 py-4">
          {items.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`flex w-full flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-[11px] font-semibold transition ${
                  isActive ? 'bg-[#1e2a43] text-white shadow-lg' : 'text-slate-500 hover:bg-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSidePanel = () => {
    if (activeTab === 'images') {
      return (
        <div className="space-y-4">
          <div className="rounded-[28px] border border-[#f1ebe4] bg-white px-5 py-8 text-center shadow-[0_18px_35px_rgba(15,23,42,0.04)]">
            <p className="text-sm text-gray-400">Choose source to</p>
            <h3 className="mt-1 text-[28px] font-semibold text-[#e86f42]">Add photos</h3>
            <div className="mt-6 space-y-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-[#ff6a3d]"
              >
                <Upload size={16} />
                Computer
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-[#ff6a3d]"
              >
                <FolderOpen size={16} />
                Add from your phone
              </button>
            </div>
            <p className="mt-7 text-sm text-gray-400">or</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 text-xl font-medium text-[#555] hover:text-[#ff6a3d]"
            >
              Drag & drop
            </button>
          </div>

          {uploadedAssets.length > 0 && (
            <div className="rounded-[24px] border border-white bg-white p-4 shadow-[0_16px_28px_rgba(15,23,42,0.05)]">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">Saved photos</h4>
                <span className="text-xs text-slate-400">{uploadedAssets.length}</span>
              </div>
              <p className="text-xs text-slate-500 mb-3">Click a photo to add it to the frame center</p>
              <div className="grid grid-cols-2 gap-3">
                {uploadedAssets.map((asset, index) => (
                  <button
                    key={`${asset}-${index}`}
                    onClick={() => {
                      console.log('[Saved photos] Adding image:', asset);
                      addImageToCanvas(asset);
                    }}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-[#fafafa] hover:border-[#ff6a3d] transition group"
                  >
                    <div className="relative">
                      <img src={asset} alt={`Upload ${index + 1}`} className="h-24 w-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                        <span className="text-white text-xs font-semibold opacity-0 group-hover:opacity-100">Add to frame</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'layouts') {
      const layouts = [
        { key: 'single', label: 'Single Highlight' },
        { key: 'split', label: 'Dual Cover Split' },
        { key: 'two-photo', label: 'Photo Story' },
      ] as const;

      return (
        <div className="space-y-4">
          <div className="rounded-[24px] bg-white p-4 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Layouts</h3>
            <div className="space-y-3">
              {layouts.map((layout) => (
                <button
                  key={layout.key}
                  onClick={() => applyLayout(layout.key)}
                  className="w-full rounded-2xl border border-gray-200 bg-[#fafafa] px-4 py-3 text-left text-sm font-medium text-slate-700 hover:border-[#ff6a3d]"
                >
                  {layout.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'text') {
      return (
        <div className="space-y-4">
          <div className="rounded-[24px] bg-white p-4 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Add text</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#ff6a3d]"
                placeholder="Write your title"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Font Size</label>
                  <input
                    type="range"
                    min="14"
                    max="80"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Color</label>
                  <input
                    type="color"
                    value={fontColor}
                    onChange={(e) => setFontColor(e.target.value)}
                    className="h-10 w-full rounded-xl border border-gray-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFontWeight(fontWeight === 'bold' ? 'normal' : 'bold')}
                  className={`rounded-2xl px-3 py-2 text-sm font-semibold ${fontWeight === 'bold' ? 'bg-[#1e2a43] text-white' : 'bg-gray-100 text-slate-700'}`}
                >
                  Bold
                </button>
                <button
                  onClick={() => setFontStyle(fontStyle === 'italic' ? 'normal' : 'italic')}
                  className={`rounded-2xl px-3 py-2 text-sm italic ${fontStyle === 'italic' ? 'bg-[#1e2a43] text-white' : 'bg-gray-100 text-slate-700'}`}
                >
                  Italic
                </button>
              </div>
              <button
                onClick={addText}
                className="w-full rounded-2xl bg-[#ff6a3d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#f35c2c]"
              >
                Add Text
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'draw') {
      return (
        <div className="space-y-4">
          <div className="rounded-[24px] bg-white p-4 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Drawing</h3>
            <div className="space-y-3">
              <button
                onClick={toggleDrawingMode}
                className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold ${
                  canvas?.isDrawingMode ? 'bg-[#1e2a43] text-white' : 'bg-gray-100 text-slate-700'
                }`}
              >
                {canvas?.isDrawingMode ? 'Drawing Mode On' : 'Enable Drawing'}
              </button>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Brush Size</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Brush Color</label>
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200"
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-[24px] bg-white p-4 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Shapes</h3>
          <div className="space-y-3">
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              className="h-10 w-full rounded-xl border border-gray-200"
            />
            <button onClick={() => addShape('rectangle')} className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-slate-700">
              Add Rectangle
            </button>
            <button onClick={() => addShape('circle')} className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-slate-700">
              Add Circle
            </button>
            <button onClick={() => addShape('line')} className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-slate-700">
              Add Line
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f4f1] flex items-center justify-center">
        <p className="text-sm font-semibold text-slate-500">Loading gifting editor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f4f1] flex items-center justify-center p-6">
        <div className="rounded-3xl bg-white p-8 text-center shadow-lg">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 rounded-full bg-[#1e2a43] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (designMode === 'premium' && !selectedTemplateId) {
    return (
      <div className="min-h-screen bg-[#f5f4f1] px-4 py-8 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#ff6a3d]">Premium Design</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">{product?.name || 'Choose a premium template'}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Premium design uses curated layouts instead of the blank canvas. Pick a template to continue.
            </p>
          </div>

          {templatesLoading ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
              <p className="text-sm font-semibold text-slate-500">Loading premium templates...</p>
            </div>
          ) : premiumTemplates.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {premiumTemplates.map((template) => (
                <button
                  key={template._id}
                  onClick={() => void selectPremiumTemplate(template)}
                  className="overflow-hidden rounded-[28px] bg-white text-left shadow-[0_18px_36px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(15,23,42,0.1)]"
                >
                  <div className="aspect-[4/3] bg-[#f1f1ef]">
                    {template.previewImage ? (
                      <img src={template.previewImage} alt={template.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400">
                        Preview unavailable
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-lg font-bold text-slate-900">{template.name}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                      {template.category || categoryParam || 'Premium'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl bg-white p-10 text-center shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
              <p className="text-sm font-semibold text-slate-700">No premium templates are available for this product yet.</p>
              <button
                onClick={() => navigate(-1)}
                className="mt-4 rounded-full bg-[#1e2a43] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Go Back
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#f5f4f1] text-slate-900 overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFilesAdded(e.target.files);
          e.currentTarget.value = '';
        }}
      />

      <header className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm flex-shrink-0">
        <div className="mx-auto flex max-w-[1520px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="rounded-full p-2 text-slate-500 hover:bg-gray-100"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="text-[22px] font-black tracking-tight text-slate-900">SpeedCopy</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Gifting Editor</div>
            </div>
          </div>

          <div className="min-w-0 text-center">
            <div className="truncate text-sm font-semibold text-slate-800">{product?.name || 'Photobook'}</div>
            <div className="text-xs text-slate-400">{saveMessage || 'Last saved: not synced yet'}</div>
            <div className="mt-1 flex items-center justify-center gap-2 text-xs">
              <span className="font-semibold text-[#ff6a3d]">₹{displayPrice.toFixed(2)}</span>
              {mrp > displayPrice && <span className="text-slate-400 line-through">₹{mrp.toFixed(2)}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={undo} disabled={historyStep <= 0} className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40">
              <Undo2 size={14} className="inline mr-1" />
              Undo
            </button>
            <button onClick={redo} disabled={historyStep >= history.length - 1} className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40">
              <Redo2 size={14} className="inline mr-1" />
              Redo
            </button>
            <button onClick={saveDesign} className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-slate-600">
              <Save size={14} className="inline mr-1" />
              Save
            </button>
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Quantity</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <button
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  className="h-8 w-8 rounded-lg bg-gray-100 text-sm font-semibold text-slate-700"
                >
                  -
                </button>
                <span className="min-w-6 text-center text-sm font-semibold text-slate-800">{quantity}</span>
                <button
                  onClick={() => setQuantity((prev) => prev + 1)}
                  className="h-8 w-8 rounded-lg bg-gray-100 text-sm font-semibold text-slate-700"
                >
                  +
                </button>
              </div>
            </div>
            <button onClick={previewCurrentDesign} className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-slate-600">
              <Eye size={14} className="inline mr-1" />
              Preview
            </button>
            <button
              onClick={addToCartWithDesign}
              className="rounded-xl bg-[#ff6a3d] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(255,106,61,0.25)]"
            >
              Add To Cart
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1520px] gap-0 px-0 py-0 flex-1 min-w-0 overflow-hidden">
        {renderLeftRail()}

        <aside className="w-[260px] shrink-0 border-r border-gray-200 bg-[#fffdfa] px-4 py-4 overflow-y-auto">
          {renderSidePanel()}
        </aside>

        <main className="min-w-0 flex-1 bg-[#f4f4f2] px-4 py-4 flex flex-col">
          <div className="rounded-[24px] bg-white/70 p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)] flex-1 flex flex-col">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span>{activePage?.name || 'Page'}</span>
              <span>{zoom}%</span>
            </div>

            <div className="overflow-auto rounded-[20px] border border-[#eceae6] bg-[#efefed] p-4 flex-1 flex items-center justify-center relative group">
              {/* Canvas centered and properly scaled */}
              <div
                className="origin-center transition-transform duration-200"
                style={{ transform: `scale(${zoom / 100})` }}
              >
                <canvas ref={canvasRef} className="block shadow-lg" />
              </div>
              {/* Overlay hint */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg bg-black/10 pointer-events-none">
                <span className="text-white text-xs font-semibold bg-black/50 px-3 py-1.5 rounded-full">Add photos from left panel</span>
              </div>
            </div>
          </div>
        </main>

        <aside className="w-[220px] shrink-0 border-l border-gray-200 bg-white px-3 py-4 overflow-y-auto">
          <div className="rounded-[20px] border border-gray-100 bg-[#fafafa] p-3 shadow-[0_12px_24px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2 mb-3">
              <Palette size={14} className="text-[#ff6a3d]" />
              <h3 className="text-xs font-semibold text-slate-900">Object controls</h3>
            </div>
            <div className="space-y-2">
              <div className="rounded-xl bg-white px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Selection</div>
                <div className="mt-1 text-xs font-medium text-slate-800">{selectedObjectType || 'No layer selected'}</div>
              </div>
              
              {/* Image Adjustment Controls */}
              {selectedObjectType === 'image' && (
                <div className="rounded-xl bg-white px-3 py-2 border border-orange-200">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-orange-600 mb-2">Image Adjustments</div>
                  
                  {/* Scale Controls */}
                  <div className="mb-2">
                    <div className="text-xs text-slate-600 mb-1.5">Scale</div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          const obj = canvas?.getActiveObject();
                          if (obj && canvas) {
                            obj.scaleX = (obj.scaleX || 1) * 0.9;
                            obj.scaleY = (obj.scaleY || 1) * 0.9;
                            canvas.renderAll();
                            saveCanvasSnapshot(canvas);
                          }
                        }}
                        className="flex-1 rounded-lg bg-gray-100 px-2 py-1.5 text-xs font-medium hover:bg-gray-200"
                      >
                        <Minus size={10} className="inline" /> Smaller
                      </button>
                      <button
                        onClick={() => {
                          const obj = canvas?.getActiveObject();
                          if (obj && canvas) {
                            obj.scaleX = (obj.scaleX || 1) * 1.1;
                            obj.scaleY = (obj.scaleY || 1) * 1.1;
                            canvas.renderAll();
                            saveCanvasSnapshot(canvas);
                          }
                        }}
                        className="flex-1 rounded-lg bg-gray-100 px-2 py-1.5 text-xs font-medium hover:bg-gray-200"
                      >
                        <Plus size={10} className="inline" /> Larger
                      </button>
                    </div>
                  </div>
                  
                  {/* Fit to Frame */}
                  <button
                    onClick={() => {
                      const obj = canvas?.getActiveObject() as fabric.Image;
                      if (obj && canvas && obj.width && obj.height) {
                        const frameWidth = canvas.width!;
                        const frameHeight = canvas.height!;
                        const maxWidth = frameWidth * 0.7;
                        const maxHeight = frameHeight * 0.7;
                        const scaleX = maxWidth / obj.width;
                        const scaleY = maxHeight / obj.height;
                        const scale = Math.min(scaleX, scaleY);
                        obj.scaleX = scale;
                        obj.scaleY = scale;
                        obj.left = frameWidth / 2;
                        obj.top = frameHeight / 2;
                        canvas.renderAll();
                        saveCanvasSnapshot(canvas);
                      }
                    }}
                    className="w-full rounded-lg bg-orange-100 px-2 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-200"
                  >
                    Fit to Frame
                  </button>
                </div>
              )}
              
              <button onClick={bringToFront} className="w-full rounded-xl bg-gray-100 px-3 py-2 text-xs font-medium text-slate-700">
                Bring to Front
              </button>
              <button onClick={sendToBack} className="w-full rounded-xl bg-gray-100 px-3 py-2 text-xs font-medium text-slate-700">
                Send to Back
              </button>
              <button onClick={deleteSelected} className="w-full rounded-xl bg-[#fff1ed] px-3 py-2 text-xs font-medium text-[#ff6a3d]">
                <Trash2 size={12} className="inline mr-1" />
                Delete Selected
              </button>
              <button onClick={clearCanvas} className="w-full rounded-xl bg-gray-100 px-3 py-2 text-xs font-medium text-slate-700">
                Clear Page
              </button>
              {/* Download button removed - users must purchase to download */}
              <button onClick={exportPrintReady} className="w-full rounded-xl bg-[#ff6a3d] px-3 py-2 text-xs font-semibold text-white">
                <Download size={12} className="inline mr-1" />
                Print Ready (JPG)
              </button>
              <button onClick={exportPDF} className="w-full rounded-xl bg-[#2d5a3d] px-3 py-2 text-xs font-semibold text-white">
                <Download size={12} className="inline mr-1" />
                Export PDF
              </button>
            </div>
          </div>
        </aside>
      </div>

      {!hideFooter && (
        <footer className="border-t border-gray-200 bg-white px-5 py-4 flex-shrink-0 overflow-x-auto">
          <div className="mx-auto flex max-w-[1520px] items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <button className="rounded-full border border-[#ff6a3d] px-3 py-1.5 font-semibold text-[#ff6a3d]">One page</button>
              <button className="rounded-full border border-gray-200 px-3 py-1.5 font-semibold text-slate-500">All pages</button>
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto">
              {pages && pages.length > 0 ? (
                pages.map((page) => {
                  const isActive = page.id === activePageId;
                  return (
                    <button
                      key={page.id}
                      onClick={() => void switchPage(page.id)}
                      className={`min-w-[150px] rounded-[18px] border p-2 text-left transition ${isActive ? 'border-[#ff6a3d] bg-[#fff7f3]' : 'border-gray-200 bg-[#fafafa]'}`}
                    >
                      <div className="h-[74px] overflow-hidden rounded-xl bg-[#e1e1e1]">
                        <img src={page.thumbnail} alt={page.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="mt-2 text-xs font-medium text-slate-700">{page.name}</div>
                    </button>
                  );
                })
              ) : (
                <div className="text-xs text-slate-400">No pages loaded. Pages: {pages.length}</div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setHideFooter(true)}
                className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-gray-200"
              >
                Hide Frame
              </button>
              <div className="rounded-2xl border border-gray-200 bg-[#fafafa] p-2">
                <button onClick={() => setZoom((prev) => Math.max(60, prev - 10))} className="rounded-xl p-2 text-slate-500 hover:bg-white">
                  <Minus size={14} />
                </button>
                <span className="px-2 text-xs font-semibold text-slate-600">{zoom}%</span>
                <button onClick={() => setZoom((prev) => Math.min(140, prev + 10))} className="rounded-xl p-2 text-slate-500 hover:bg-white">
                  <Plus size={14} />
                </button>
              </div>
              <div className="rounded-[22px] bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                <button onClick={createPage} className="block rounded-xl bg-[#ff6a3d] px-4 py-2.5 text-xs font-semibold text-white">
                  Add Pages
                </button>
                <button onClick={duplicatePage} className="mt-2 block w-full rounded-xl bg-[#fff4ef] px-4 py-2.5 text-xs font-semibold text-[#ff6a3d]">
                  Duplicate
                </button>
                <button onClick={removeCurrentPage} className="mt-2 block w-full rounded-xl bg-gray-100 px-4 py-2.5 text-xs font-semibold text-slate-600">
                  Remove
                </button>
              </div>
            </div>
          </div>
        </footer>
      )}

      {hideFooter && (
        <div className="border-t border-gray-200 bg-white px-5 py-3 flex-shrink-0">
          <button
            onClick={() => setHideFooter(false)}
            className="rounded-xl bg-[#ff6a3d] px-4 py-2 text-xs font-semibold text-white hover:bg-[#f35c2c]"
          >
            Show Frame
          </button>
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-6">
          <div className="w-full max-w-4xl rounded-[28px] bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Preview</h3>
              <button onClick={() => setShowPreview(false)} className="rounded-full p-2 text-slate-500 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-hidden rounded-[24px] bg-[#f3f3f1] p-4">
              <img src={previewImage} alt="Design preview" className="mx-auto max-h-[70vh] rounded-2xl object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignEditorPage;
