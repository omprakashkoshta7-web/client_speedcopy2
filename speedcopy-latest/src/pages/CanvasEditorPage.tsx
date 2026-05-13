import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fabric } from 'fabric';
import { ArrowLeft, Upload, Trash2, Plus, Minus, ChevronDown } from 'lucide-react';
import productService from '../services/product.service';
import orderService from '../services/order.service';
import { useAuth } from '../context/AuthContext';

type ProductRecord = {
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
};

const CanvasEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const readyFileInputRef = useRef<HTMLInputElement>(null);
  
  // New states for quick wins
  const [showTextInput, setShowTextInput] = useState(false);
  const [textValue, setTextValue] = useState('');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [fontSize, setFontSize] = useState(24);
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(0);
  const [saving, setSaving] = useState(false);
  
  // Toolbar states
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  const [activeToolTab, setActiveToolTab] = useState<'shapes' | 'colors' | 'layers' | 'images'>('shapes');
  const [showOptionsPanel, setShowOptionsPanel] = useState(false);

  const productId = searchParams.get('productId');
  const displayPrice = product?.sale_price || product?.discountedPrice || product?.basePrice || 0;

  // Predefined colors for color picker
  const colors = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ff6a3d', '#3b82f6',
    '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
  ];

  // Calculate responsive canvas size
  const getCanvasSize = () => {
    const maxWidth = window.innerWidth < 768 ? window.innerWidth - 40 : 600;
    const maxHeight = window.innerHeight < 768 ? window.innerHeight - 300 : 700;
    return { width: maxWidth, height: maxHeight };
  };

  // Save state to history for undo/redo
  const saveState = () => {
    if (!canvas) return;
    const json = JSON.stringify(canvas.toJSON());
    setHistory(prev => [...prev.slice(0, historyStep + 1), json]);
    setHistoryStep(prev => prev + 1);
  };

  // Undo function
  const undo = () => {
    if (historyStep === 0 || !canvas) return;
    const prevStep = historyStep - 1;
    canvas.loadFromJSON(history[prevStep], () => {
      canvas.renderAll();
      setHistoryStep(prevStep);
    });
  };

  // Redo function
  const redo = () => {
    if (historyStep >= history.length - 1 || !canvas) return;
    const nextStep = historyStep + 1;
    canvas.loadFromJSON(history[nextStep], () => {
      canvas.renderAll();
      setHistoryStep(nextStep);
    });
  };

  // Add text to canvas
  const addTextToCanvas = () => {
    if (!canvas || !textValue.trim()) return;
    
    const text = new fabric.Text(textValue, {
      left: canvas.width! / 2,
      top: canvas.height! / 2,
      fontSize: fontSize,
      fill: selectedColor,
      fontFamily: 'Arial',
      originX: 'center',
      originY: 'center',
    });
    
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    saveState();
    
    setTextValue('');
    setShowTextInput(false);
  };

  // Add shapes
  const addRectangle = () => {
    if (!canvas) return;
    const rect = new fabric.Rect({
      left: canvas.width! / 2 - 50,
      top: canvas.height! / 2 - 50,
      width: 100,
      height: 100,
      fill: selectedColor,
      stroke: '#1e40af',
      strokeWidth: 2,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
    saveState();
  };

  const addCircle = () => {
    if (!canvas) return;
    const circle = new fabric.Circle({
      left: canvas.width! / 2 - 50,
      top: canvas.height! / 2 - 50,
      radius: 50,
      fill: selectedColor,
      stroke: '#059669',
      strokeWidth: 2,
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();
    saveState();
  };

  const addTriangle = () => {
    if (!canvas) return;
    const triangle = new fabric.Triangle({
      left: canvas.width! / 2 - 50,
      top: canvas.height! / 2 - 50,
      width: 100,
      height: 100,
      fill: selectedColor,
      stroke: '#d97706',
      strokeWidth: 2,
    });
    canvas.add(triangle);
    canvas.setActiveObject(triangle);
    canvas.renderAll();
    saveState();
  };

  // Change color of selected object
  const changeColor = (color: string) => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      activeObject.set('fill', color);
      canvas.renderAll();
      saveState();
    }
    setSelectedColor(color);
  };

  // Change font size of selected text
  const changeFontSize = (size: number) => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'text') {
      (activeObject as fabric.Text).set('fontSize', size);
      canvas.renderAll();
      saveState();
    }
    setFontSize(size);
  };

  // Layer order functions
  const bringToFront = () => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.bringToFront(activeObject);
      canvas.renderAll();
      saveState();
    }
  };

  const sendToBack = () => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.sendToBack(activeObject);
      canvas.renderAll();
      saveState();
    }
  };

  // Initialize canvas
  useEffect(() => {
    const initCanvas = async () => {
      try {
        if (!productId) {
          navigate('/gifting');
          return;
        }

        setLoading(true);
        setError('');

        // Fetch product
        const response = await productService.getGiftingProductById(productId);
        const productData = (response?.data || response) as ProductRecord;
        setProduct(productData);

        // Initialize fabric canvas with responsive size
        if (canvasRef.current) {
          const { width, height } = getCanvasSize();
          const fabricCanvas = new fabric.Canvas(canvasRef.current, {
            width,
            height,
            backgroundColor: '#ffffff',
            preserveObjectStacking: true,
          });

          fabricCanvas.selectionColor = 'rgba(255, 106, 61, 0.12)';
          fabricCanvas.selectionBorderColor = '#ff6a3d';
          fabricCanvas.selectionLineWidth = 1.2;

          // Load frame image
          if (productData?.thumbnail || productData?.image) {
            const frameUrl = productData.thumbnail || productData.image;
            fabric.Image.fromURL(
              frameUrl,
              (img: any) => {
                if (img) {
                  const scale = Math.min(
                    fabricCanvas.width! / img.width,
                    fabricCanvas.height! / img.height
                  );

                  img.set({
                    left: 0,
                    top: 0,
                    originX: 'left',
                    originY: 'top',
                    scaleX: scale,
                    scaleY: scale,
                    selectable: false,
                    evented: false,
                  });

                  fabricCanvas.add(img);
                  fabricCanvas.sendToBack(img);
                  fabricCanvas.renderAll();
                  console.log('✅ Frame loaded successfully');
                }
              },
              { crossOrigin: 'anonymous' }
            );
          }

          setCanvas(fabricCanvas);
          
          // Save initial state
          setTimeout(() => {
            const json = JSON.stringify(fabricCanvas.toJSON());
            setHistory([json]);
            setHistoryStep(0);
          }, 500);
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Error initializing canvas:', err);
        setError(err?.message || 'Failed to load editor');
        setLoading(false);
      }
    };

    initCanvas();

    return () => {
      canvas?.dispose();
    };
  }, [productId, navigate]);

  // Track canvas changes for undo/redo
  useEffect(() => {
    if (!canvas) return;
    
    const handleModified = () => saveState();
    
    canvas.on('object:modified', handleModified);
    canvas.on('object:added', handleModified);
    canvas.on('object:removed', handleModified);
    
    return () => {
      canvas.off('object:modified', handleModified);
      canvas.off('object:added', handleModified);
      canvas.off('object:removed', handleModified);
    };
  }, [canvas, historyStep]);

  // Handle window resize for responsive canvas
  useEffect(() => {
    const handleResize = () => {
      if (!canvas) return;
      const { width, height } = getCanvasSize();
      canvas.setDimensions({ width, height });
      canvas.renderAll();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [canvas]);

  // Add image to canvas
  const addImageToCanvas = (src: string) => {
    if (!canvas) return;

    const options: any = src.startsWith('data:') ? {} : { crossOrigin: 'anonymous' };

    fabric.Image.fromURL(
      src,
      (img: any) => {
        if (!img) {
          alert('Failed to load image');
          return;
        }

        const centerX = canvas.width! / 2;
        const centerY = canvas.height! / 2;

        img.set({
          left: centerX,
          top: centerY,
          originX: 'center',
          originY: 'center',
          cornerColor: '#ff6a3d',
          borderColor: '#ff6a3d',
        });

        img.scaleToWidth(300);
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        saveState();
      },
      options
    );
  };

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;

    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setUploadedImages((prev) => [...prev, dataUrl]);
        addImageToCanvas(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  // Delete selected object
  const deleteSelected = () => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.remove(activeObject);
      canvas.renderAll();
      saveState();
    }
  };

  // Handle ready-to-print file upload
  const handleReadyFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !canvas) return;

    for (const file of Array.from(files)) {
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        alert(`File ${file.name} is not supported. Please upload PDF, PNG, or JPG files.`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        
        if (file.type.startsWith('image/')) {
          fabric.Image.fromURL(
            dataUrl,
            (img: any) => {
              if (!img) return;
              
              const scale = Math.min(
                canvas.width! / img.width,
                canvas.height! / img.height
              );
              
              img.set({
                left: 0,
                top: 0,
                scaleX: scale,
                scaleY: scale,
                selectable: false,
                evented: false,
              });
              
              canvas.clear();
              canvas.add(img);
              canvas.renderAll();
              
              alert('✅ Ready-to-print design uploaded! You can now add to cart.');
            },
            { crossOrigin: 'anonymous' }
          );
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

  // Add to cart
  const addToCart = async () => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    if (!canvas || !product) {
      setError('Missing canvas or product data');
      return;
    }

    setSaving(true);
    try {
      const designPreview = canvas.toDataURL({
        format: 'jpeg',
        quality: 0.8,
        multiplier: 1,
      });

      await orderService.addToCart({
        productId: product._id || product.id || productId,
        productName: product.name || 'Canvas Design',
        flowType: 'gifting',
        quantity,
        unitPrice: displayPrice,
        totalPrice: displayPrice * quantity,
        designId: `canvas-${productId}-${Date.now()}`,
        thumbnail: designPreview,
        designPreview,
        designJson: '',
        designName: `${product.name} - Canvas Design`,
        options: {
          source: 'canvas-editor',
          productPrice: displayPrice,
          productName: product.name || '',
        },
      });

      alert('Added to cart successfully!');
      navigate('/cart');
    } catch (err: any) {
      console.error('Error adding to cart:', err);
      setError(err?.message || 'Failed to add to cart');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff6a3d] mx-auto mb-4"></div>
          <p className="text-slate-600 font-semibold">Loading canvas editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md">
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-[#1e2a43] text-white px-6 py-2 rounded-full font-semibold hover:bg-[#151f33]"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Upload Ready Design Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowUploadModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Upload Ready-to-Print Design</h3>
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
            <input
              ref={readyFileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              multiple
              onChange={handleReadyFileUpload}
              className="hidden"
            />
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

      {/* Text Input Modal */}
      {showTextInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Text</h3>
            <input
              type="text"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTextToCanvas()}
              placeholder="Enter your text..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg mb-4 focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowTextInput(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addTextToCanvas}
                disabled={!textValue.trim()}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Text
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header - Compact */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft size={18} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Canvas Editor</h1>
              <p className="text-xs text-slate-500">{product?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold text-sm"
            >
              <Upload size={14} />
              Upload Ready Design
            </button>

            {/* Undo/Redo */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-1 py-1">
              <button
                onClick={undo}
                disabled={historyStep === 0}
                className="p-1.5 hover:bg-white rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
                title="Undo (Ctrl+Z)"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
              <button
                onClick={redo}
                disabled={historyStep >= history.length - 1}
                className="p-1.5 hover:bg-white rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
                title="Redo (Ctrl+Y)"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2 py-1.5">
              <button
                onClick={() => setZoom((prev) => Math.max(50, prev - 10))}
                className="p-1 hover:bg-white rounded transition"
              >
                <Minus size={14} />
              </button>
              <span className="text-xs font-semibold w-10 text-center">{zoom}%</span>
              <button
                onClick={() => setZoom((prev) => Math.min(150, prev + 10))}
                className="p-1 hover:bg-white rounded transition"
              >
                <Plus size={14} />
              </button>
            </div>

            <button
              onClick={addToCart}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#ff6a3d] text-white rounded-lg hover:bg-[#f35c2c] transition font-semibold text-sm disabled:opacity-50"
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                'Add to Cart'
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Main Canvas Area - Full Width */}
        <div className="relative">
          {/* Canvas Container */}
          <div className="bg-white rounded-xl shadow-sm p-4 flex justify-center min-h-[600px]">
            <div className="bg-gray-50 rounded-xl p-3 inline-block">
              <div
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.2s ease',
                }}
              >
                <canvas ref={canvasRef} className="border-2 border-gray-300 rounded-lg" />
              </div>
            </div>
          </div>

          {/* Bottom Toolbar - Compact */}
          <div className="mt-4 bg-white rounded-xl shadow-sm p-3 flex flex-wrap items-center justify-between gap-3">
            {/* Left: Main Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowTextInput(true)}
                className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold text-xs whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Text
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-3 py-2 bg-[#ff6a3d] text-white rounded-lg hover:bg-[#f35c2c] transition font-semibold text-xs whitespace-nowrap"
              >
                <Upload size={14} />
                Photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />

              {/* Shapes Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-semibold text-xs whitespace-nowrap">
                  Shapes
                  <ChevronDown size={14} />
                </button>
                <div className="absolute left-0 mt-0 w-32 bg-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-2 space-y-1">
                  <button
                    onClick={addRectangle}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-xs font-semibold"
                  >
                    Rectangle
                  </button>
                  <button
                    onClick={addCircle}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-xs font-semibold"
                  >
                    Circle
                  </button>
                  <button
                    onClick={addTriangle}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-xs font-semibold"
                  >
                    Triangle
                  </button>
                </div>
              </div>

              {/* Colors Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-semibold text-xs whitespace-nowrap">
                  <div className="w-4 h-4 rounded border" style={{ backgroundColor: selectedColor }}></div>
                  Color
                  <ChevronDown size={14} />
                </button>
                <div className="absolute left-0 mt-0 bg-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-3 grid grid-cols-5 gap-2 w-max">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => changeColor(color)}
                      className="w-6 h-6 rounded border-2 hover:scale-110 transition"
                      style={{
                        backgroundColor: color,
                        borderColor: selectedColor === color ? '#000' : '#e5e7eb'
                      }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={deleteSelected}
                className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition font-semibold text-xs whitespace-nowrap"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>

            {/* Right: Tools Panel Toggle & Options */}
            <div className="flex items-center gap-2">
              {/* Tools Panel Button */}
              <button
                onClick={() => setShowToolsPanel(!showToolsPanel)}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-semibold text-xs whitespace-nowrap"
              >
                {showToolsPanel ? 'Hide' : 'Show'} Tools
                <ChevronDown size={14} className={`transition-transform ${showToolsPanel ? 'rotate-180' : ''}`} />
              </button>

              {/* Options Panel Button */}
              <button
                onClick={() => setShowOptionsPanel(!showOptionsPanel)}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-semibold text-xs whitespace-nowrap"
              >
                {showOptionsPanel ? 'Hide' : 'Show'} Options
                <ChevronDown size={14} className={`transition-transform ${showOptionsPanel ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* Collapsible Tools Panel */}
          {showToolsPanel && (
            <div className="mt-3 bg-white rounded-xl shadow-sm p-4 border border-gray-200">
              {/* Tabs */}
              <div className="flex gap-2 mb-4 border-b">
                {(['shapes', 'colors', 'layers', 'images'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveToolTab(tab)}
                    className={`px-4 py-2 font-semibold text-sm transition-colors ${
                      activeToolTab === tab
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {activeToolTab === 'shapes' && (
                  <>
                    <button
                      onClick={addRectangle}
                      className="p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition flex flex-col items-center gap-2"
                    >
                      <div className="w-8 h-6 rounded" style={{ backgroundColor: selectedColor }}></div>
                      <span className="text-xs font-semibold">Rectangle</span>
                    </button>
                    <button
                      onClick={addCircle}
                      className="p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition flex flex-col items-center gap-2"
                    >
                      <div className="w-6 h-6 rounded-full" style={{ backgroundColor: selectedColor }}></div>
                      <span className="text-xs font-semibold">Circle</span>
                    </button>
                    <button
                      onClick={addTriangle}
                      className="p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition flex flex-col items-center gap-2"
                    >
                      <div
                        style={{
                          width: 0,
                          height: 0,
                          borderLeft: '12px solid transparent',
                          borderRight: '12px solid transparent',
                          borderBottom: `20px solid ${selectedColor}`
                        }}
                      ></div>
                      <span className="text-xs font-semibold">Triangle</span>
                    </button>
                  </>
                )}

                {activeToolTab === 'colors' && (
                  <>
                    {colors.map(color => (
                      <button
                        key={color}
                        onClick={() => changeColor(color)}
                        className="p-3 rounded-lg border-2 hover:scale-105 transition"
                        style={{
                          backgroundColor: color,
                          borderColor: selectedColor === color ? '#000' : '#e5e7eb'
                        }}
                        title={color}
                      />
                    ))}
                  </>
                )}

                {activeToolTab === 'layers' && (
                  <>
                    {canvas?.getActiveObject() ? (
                      <>
                        <button
                          onClick={bringToFront}
                          className="p-3 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition font-semibold text-sm"
                        >
                          ↑ Bring to Front
                        </button>
                        <button
                          onClick={sendToBack}
                          className="p-3 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition font-semibold text-sm"
                        >
                          ↓ Send to Back
                        </button>
                        {canvas?.getActiveObject()?.type === 'text' && (
                          <div className="col-span-2 p-3 bg-gray-100 rounded-lg">
                            <label className="text-xs font-semibold text-gray-700 block mb-2">
                              Font Size: {fontSize}px
                            </label>
                            <input
                              type="range"
                              min="8"
                              max="72"
                              value={fontSize}
                              onChange={(e) => changeFontSize(Number(e.target.value))}
                              className="w-full"
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="col-span-2 text-sm text-gray-500 text-center py-4">
                        Select an object to modify layers
                      </p>
                    )}
                  </>
                )}

                {activeToolTab === 'images' && (
                  <>
                    {uploadedImages.length > 0 ? (
                      uploadedImages.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => addImageToCanvas(img)}
                          className="rounded-lg overflow-hidden border-2 border-gray-200 hover:border-[#ff6a3d] transition"
                        >
                          <img src={img} alt={`upload-${idx}`} className="w-full h-20 object-cover" />
                        </button>
                      ))
                    ) : (
                      <p className="col-span-2 text-sm text-gray-500 text-center py-4">
                        No images uploaded yet
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Collapsible Options Panel */}
          {showOptionsPanel && (
            <div className="mt-3 bg-white rounded-xl shadow-sm p-4 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Quantity */}
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-3">Quantity</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                      className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 transition text-sm font-semibold"
                    >
                      −
                    </button>
                    <span className="flex-1 text-center font-semibold text-lg">{quantity}</span>
                    <button
                      onClick={() => setQuantity((prev) => prev + 1)}
                      className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 transition text-sm font-semibold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Price */}
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-3">Price</label>
                  <div>
                    <p className="text-2xl font-bold text-[#ff6a3d]">₹{displayPrice.toFixed(2)}</p>
                    <p className="text-xs text-slate-600 mt-1">per unit</p>
                  </div>
                </div>

                {/* Total */}
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-3">Total</label>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">₹{(displayPrice * quantity).toFixed(2)}</p>
                    <p className="text-xs text-slate-600 mt-1">{quantity} × ₹{displayPrice.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Helper Text */}
          <p className="text-xs text-slate-500 mt-3 text-center">
            Drag to move objects • Resize handles to scale • Use toolbar for quick actions
          </p>
        </div>
      </div>
    </div>
  );
};

export default CanvasEditorPage;
