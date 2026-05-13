import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fabric } from 'fabric';
import { ArrowLeft, Plus, Trash2, Type, Upload } from 'lucide-react';
import productService from '../services/product.service';
import orderService from '../services/order.service';

interface Product {
  _id: string;
  name: string;
  images?: string[];
  thumbnail?: string;
  sale_price?: number;
  discountedPrice?: number;
  basePrice?: number;
}

const SimpleDesignEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [textInput, setTextInput] = useState('Add your text');
  const [fontSize, setFontSize] = useState(24);
  const [textColor, setTextColor] = useState('#000000');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const readyFileInputRef = useRef<HTMLInputElement>(null);

  // Get productId from URL
  const productId = searchParams.get('productId');

  // STEP 1: Initialize canvas and fetch product
  useEffect(() => {
    if (!productId) {
      navigate('/gifting');
      return;
    }

    const initEditor = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch product data
        const response = await productService.getGiftingProductById(productId);
        const productData = (response?.data || response) as any;
        
        // Set product data
        setProduct({
          _id: productData._id || '',
          name: productData.name || 'Product',
          images: productData.images,
          thumbnail: productData.thumbnail,
          sale_price: productData.sale_price,
          discountedPrice: productData.discountedPrice || productData.sale_price,
          basePrice: productData.basePrice || productData.mrp || productData.sale_price
        });

        // Initialize canvas
        if (canvasRef.current) {
          const newCanvas = new fabric.Canvas(canvasRef.current, {
            width: 600,
            height: 400,
            backgroundColor: '#ffffff',
          });

          setCanvas(newCanvas);

          // STEP 2: Load frame image from product (if available)
          const frameUrl = productData.images?.[0] || productData.thumbnail;
          if (frameUrl) {
            console.log('Product has frame image, loading:', frameUrl);
            loadFrameImage(newCanvas, frameUrl);
          } else {
            console.log('No frame image available, using blank canvas');
            // Just render the blank canvas
            newCanvas.renderAll();
          }
        }
      } catch (err: any) {
        console.error('Error initializing editor:', err);
        setError(err?.message || 'Failed to load editor');
      } finally {
        setLoading(false);
      }
    };

    initEditor();
  }, [productId, navigate]);

  // STEP 3: Load frame image as background
  const loadFrameImage = (targetCanvas: fabric.Canvas, imageUrl: string) => {
    // Handle relative URLs - convert to absolute if needed
    let fullImageUrl = imageUrl;
    if (imageUrl && !imageUrl.startsWith('http')) {
      // If it's a relative path, prepend the base URL
      fullImageUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    }

    console.log('Loading frame image from:', fullImageUrl);

    // Use FabricImage.fromURL for fabric v7
    fabric.FabricImage.fromURL(fullImageUrl, { crossOrigin: 'anonymous' })
      .then((img) => {
        if (!img || !img.width || !img.height) {
          console.warn('Invalid image loaded, using default background');
          targetCanvas.backgroundColor = '#ffffff';
          targetCanvas.renderAll();
          return;
        }

        // Scale image to fit canvas
        const canvasWidth = targetCanvas.width || 600;
        const canvasHeight = targetCanvas.height || 400;
        const imgWidth = img.width || 1;
        const imgHeight = img.height || 1;
        
        const scale = Math.min(
          canvasWidth / imgWidth,
          canvasHeight / imgHeight
        );
        img.scale(scale);
        img.set({
          left: (canvasWidth - imgWidth * scale) / 2,
          top: (canvasHeight - imgHeight * scale) / 2,
          selectable: false,
          evented: false,
        });
        
        // Set as background image using the correct method
        targetCanvas.set('backgroundImage', img);
        targetCanvas.renderAll();
      })
      .catch((err) => {
        console.warn('Failed to load frame image:', err, 'URL:', fullImageUrl);
        // Set a clean white background instead
        targetCanvas.backgroundColor = '#ffffff';
        targetCanvas.renderAll();
      });
  };

  // STEP 4: Add text to canvas
  const addText = () => {
    if (!canvas || !textInput.trim()) return;

    const text = new fabric.IText(textInput, {
      left: 150,
      top: 150,
      fontSize,
      fill: textColor,
      fontFamily: 'Arial',
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  // STEP 5: Add image from file upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !canvas) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        fabric.FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' })
          .then((img) => {
            img.scaleToWidth(200);
            img.set({
              left: Math.random() * (canvas.width - 200),
              top: Math.random() * (canvas.height - 200),
            });
            canvas.add(img);
            canvas.renderAll();
          });
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
  };

  // Delete selected object
  const deleteSelected = () => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.remove(activeObject);
      canvas.renderAll();
    }
  };

  // Handle ready-to-print file upload
  const handleReadyFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !canvas) return;

    for (const file of Array.from(files)) {
      // Check file type
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        alert(`File ${file.name} is not a supported format. Please upload PDF, PNG, or JPG files.`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        
        // If it's an image, load it directly to canvas
        if (file.type.startsWith('image/')) {
          fabric.FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' })
            .then((img) => {
              // Scale to fit canvas
              const scale = Math.min(
                (canvas.width || 600) / (img.width || 1),
                (canvas.height || 400) / (img.height || 1)
              );
              img.scale(scale);
              img.set({
                left: 0,
                top: 0,
                selectable: false,
                evented: false,
              });
              
              // Clear canvas and add the ready-to-print design
              canvas.clear();
              canvas.add(img);
              canvas.renderAll();
              
              alert('✅ Ready-to-print design uploaded successfully! You can now proceed to add to cart.');
            });
        } else if (file.type === 'application/pdf') {
          alert('PDF uploaded successfully! This will be processed during order fulfillment.');
          // Store PDF info for later processing
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

    // Reset input
    e.target.value = '';
    setShowUploadModal(false);
  };

  // Add to cart
  const addToCart = async () => {
    if (!canvas || !product) return;

    try {
      const designPreview = canvas.toDataURL({ format: 'png', multiplier: 1 });
      const designJson = JSON.stringify(canvas.toJSON());

      await orderService.addToCart({
        productId: product._id,
        productName: product.name,
        flowType: 'gifting',
        quantity,
        unitPrice: product.sale_price || product.discountedPrice || product.basePrice || 0,
        totalPrice: (product.sale_price || product.discountedPrice || product.basePrice || 0) * quantity,
        designId: `design-${product._id}-${Date.now()}`,
        thumbnail: designPreview,
        designPreview,
        designJson,
        designName: `${product.name} - Custom Design`,
      });

      navigate('/cart');
    } catch (err: any) {
      console.error('Error adding to cart:', err);
      setError(err?.message || 'Failed to add to cart');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-800 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Upload Ready Design Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowUploadModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Upload Ready-to-Print Design</h3>
            <p className="text-sm text-gray-600 mb-4">
              Have a print-ready file? Upload it here to skip the design process and proceed directly to checkout.
            </p>
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <p className="text-xs text-blue-800 font-semibold mb-2">Supported Formats:</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• PDF (Recommended for print)</li>
                <li>• PNG (High resolution, 300 DPI)</li>
                <li>• JPG/JPEG (High resolution, 300 DPI)</li>
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

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Design Editor</h1>
              <p className="text-sm text-gray-600">{product?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
            >
              <Upload size={18} />
              Upload Ready Design
            </button>
            <button
              onClick={addToCart}
              className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Canvas Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-center bg-gray-100 rounded-lg p-4">
                <canvas
                  ref={canvasRef}
                  className="border-2 border-gray-300 rounded"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </div>
            </div>
          </div>

          {/* Tools Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Upload Image */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Upload Photo</h3>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <Upload size={18} />
                Choose Image
              </button>
            </div>

            {/* Add Text */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Add Text</h3>
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Enter text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 text-sm"
              />
              <div className="space-y-2 mb-3">
                <div>
                  <label className="text-xs text-gray-600">Font Size: {fontSize}px</label>
                  <input
                    type="range"
                    min="12"
                    max="72"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Color</label>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-full h-10 rounded border border-gray-300 cursor-pointer"
                  />
                </div>
              </div>
              <button
                onClick={addText}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <Type size={18} />
                Add Text
              </button>
            </div>

            {/* Delete & Quantity */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Actions</h3>
              <button
                onClick={deleteSelected}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 mb-3"
              >
                <Trash2 size={18} />
                Delete Selected
              </button>

              <div>
                <label className="text-xs text-gray-600 block mb-2">Quantity</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    −
                  </button>
                  <span className="flex-1 text-center font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleDesignEditorPage;
