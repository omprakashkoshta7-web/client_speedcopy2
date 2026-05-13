import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Palette, Type, Layout, Layers, ShoppingCart, Upload, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const CardEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [selectedColor, setSelectedColor] = useState('#111111');
  const [selectedLayout, setSelectedLayout] = useState('horizontal');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imagePosition, setImagePosition] = useState<'left' | 'right' | 'background' | 'logo' | 'custom'>('logo');
  const [logoSize, setLogoSize] = useState<number>(32); // Size in pixels (default 32px = w-8)
  const [logoPosition, setLogoPosition] = useState({ x: 50, y: 50 }); // Position in percentage
  const [isDragging, setIsDragging] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const readyFileInputRef = useRef<HTMLInputElement>(null);

  // Load product image from URL param on mount
  useEffect(() => {
    const productImage = searchParams.get('productImage');
    if (productImage) {
      setUploadedImage(decodeURIComponent(productImage));
      setImagePosition('background');
      // Auto-select "match" template when product image is passed
      setSelectedTemplate('match');
    }
  }, []); // eslint-disable-line
  const [cardText, setCardText] = useState({
    name: 'John Doe',
    title: 'CEO & Founder',
    phone: '+91 98765 43210',
    email: 'john@company.com',
    website: 'www.company.com',
    address: '123 Business Street, Mumbai',
  });

  const templates = [
    {
      id: 'match',
      name: 'Match Selected Card',
      bgColor: 'transparent',
      textColor: '#ffffff',
      preview: 'Use your selected product card as background'
    },
    { 
      id: 'modern', 
      name: 'Modern', 
      bgColor: '#3b82f6', 
      textColor: '#ffffff',
      preview: 'Modern professional design with blue gradient'
    },
    { 
      id: 'classic', 
      name: 'Classic', 
      bgColor: '#1f2937', 
      textColor: '#ffffff',
      preview: 'Traditional dark elegant design'
    },
    { 
      id: 'minimal', 
      name: 'Minimal', 
      bgColor: '#ffffff', 
      textColor: '#111111',
      preview: 'Clean white minimalist design'
    },
    { 
      id: 'bold', 
      name: 'Bold', 
      bgColor: '#dc2626', 
      textColor: '#ffffff',
      preview: 'Eye-catching red bold design'
    },
    { 
      id: 'elegant', 
      name: 'Elegant', 
      bgColor: '#8b5cf6', 
      textColor: '#ffffff',
      preview: 'Sophisticated purple design'
    },
    { 
      id: 'gradient', 
      name: 'Gradient', 
      bgColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
      textColor: '#ffffff',
      preview: 'Vibrant gradient design'
    },
  ];

  const colorSchemes = [
    { id: 'black', color: '#111111', name: 'Black' },
    { id: 'blue', color: '#3b82f6', name: 'Blue' },
    { id: 'red', color: '#dc2626', name: 'Red' },
    { id: 'green', color: '#16a34a', name: 'Green' },
    { id: 'purple', color: '#8b5cf6', name: 'Purple' },
    { id: 'orange', color: '#ea580c', name: 'Orange' },
    { id: 'pink', color: '#ec4899', name: 'Pink' },
    { id: 'teal', color: '#14b8a6', name: 'Teal' },
  ];

  const layouts = [
    { id: 'horizontal', name: 'Horizontal', desc: 'Classic left-to-right layout' },
    { id: 'vertical', name: 'Vertical', desc: 'Top-to-bottom layout' },
    { id: 'centered', name: 'Centered', desc: 'Center-aligned layout' },
    { id: 'split', name: 'Split', desc: 'Two-column layout' },
  ];

  const currentTemplate = templates.find(t => t.id === selectedTemplate) || templates[0];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPG, PNG, SVG, etc.)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-uploaded
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
  };

  const handleSave = () => {
    const designData = {
      template: selectedTemplate,
      color: selectedColor,
      layout: selectedLayout,
      text: cardText,
      uploadedImage: uploadedImage || null,
      imagePosition,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem('businessCardDesign', JSON.stringify(designData));
    alert('✅ Card design saved successfully!');
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    const designData = {
      template: selectedTemplate,
      color: selectedColor,
      layout: selectedLayout,
      text: cardText,
      uploadedImage: uploadedImage || null,
      imagePosition,
      logoSize,
      logoPosition,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem('businessCardDesign', JSON.stringify(designData));
    navigate('/business-card-checkout', { state: { cardDesign: designData } });
  };

  // Handle logo drag on card
  const handleLogoDragStart = (e: React.MouseEvent) => {
    if (imagePosition !== 'custom') return;
    setIsDragging(true);
    e.preventDefault();
  };

  const handleLogoDrag = (e: React.MouseEvent) => {
    if (!isDragging || !cardRef.current) return;
    
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Clamp values between 0 and 100
    setLogoPosition({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    });
  };

  const handleLogoDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleLogoDrag as any);
      window.addEventListener('mouseup', handleLogoDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleLogoDrag as any);
        window.removeEventListener('mouseup', handleLogoDragEnd);
      };
    }
  }, [isDragging]); // eslint-disable-line

  // Handle ready-to-print file upload
  const handleReadyFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const file = files[0]; // Take first file only for card
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload PDF, PNG, or JPG files only.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      
      if (file.type.startsWith('image/')) {
        setUploadedImage(dataUrl);
        setImagePosition('background');
        setSelectedTemplate('match');
        alert('✅ Ready-to-print card design uploaded! You can now add to cart.');
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

    e.target.value = '';
    setShowUploadModal(false);
  };

  return (
    <div style={{ backgroundColor: '#f5f5f5', height: '100vh', overflow: 'hidden' }}>
      <Navbar />

      {/* Upload Ready Design Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowUploadModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Upload Ready-to-Print Card</h3>
            <p className="text-sm text-gray-600 mb-4">
              Have a print-ready business card design? Upload it here.
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
                Choose File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition"
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <div className="h-6 w-px bg-gray-300" />
            <h1 className="font-bold text-gray-900 text-xl">Card Editor</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-full font-semibold text-sm hover:bg-blue-600 transition"
            >
              <Upload size={16} />
              Upload Ready Card
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-full font-semibold text-sm hover:bg-gray-50 transition"
            >
              <Save size={16} />
              Save Design
            </button>
            <button
              onClick={handleAddToCart}
              className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-full font-semibold text-sm hover:bg-gray-800 transition"
            >
              <ShoppingCart size={16} />
              Add to Cart
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4" style={{ height: 'calc(100vh - 73px)', overflow: 'hidden' }}>
        <div className="grid grid-cols-12 gap-6 h-full">
          {/* Left Sidebar - Tools */}
          <div className="col-span-3 space-y-4 h-full overflow-y-auto pr-2"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db #f3f4f6' }}>
            {/* Upload Image */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Upload size={18} className="text-gray-700" />
                <h3 className="font-bold text-gray-900">Upload Image</h3>
              </div>

              {uploadedImage ? (
                <div className="space-y-3">
                  {/* Preview */}
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50" style={{ height: '100px' }}>
                    <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-contain p-2" />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  {/* Position selector */}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">Image Position</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['logo', 'left', 'right', 'background'] as const).map(pos => (
                        <button
                          key={pos}
                          onClick={() => setImagePosition(pos)}
                          className="py-1.5 px-2 rounded-lg text-xs font-semibold capitalize transition"
                          style={{
                            backgroundColor: imagePosition === pos ? '#111111' : '#f3f4f6',
                            color: imagePosition === pos ? '#ffffff' : '#374151',
                          }}
                        >
                          {pos}
                        </button>
                      ))}
                      <button
                        onClick={() => setImagePosition('custom')}
                        className="py-1.5 px-2 rounded-lg text-xs font-semibold capitalize transition col-span-2"
                        style={{
                          backgroundColor: imagePosition === 'custom' ? '#111111' : '#f3f4f6',
                          color: imagePosition === 'custom' ? '#ffffff' : '#374151',
                        }}
                      >
                        Custom (Drag on Card)
                      </button>
                    </div>
                  </div>
                  {/* Logo Size Adjuster - Only show when position is Logo, Left, Right, or Custom */}
                  {(imagePosition === 'logo' || imagePosition === 'left' || imagePosition === 'right' || imagePosition === 'custom') && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-600">Logo Size</p>
                        <span className="text-xs font-bold text-gray-900">{logoSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="16"
                        max="128"
                        step="4"
                        value={logoSize}
                        onChange={(e) => setLogoSize(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Small</span>
                        <span>Large</span>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 rounded-xl border border-dashed border-gray-300 text-xs font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700 transition"
                  >
                    Replace Image
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center gap-2 hover:border-gray-400 hover:bg-gray-50 transition"
                >
                  <Upload size={24} className="text-gray-400" />
                  <span className="text-sm font-semibold text-gray-600">Click to upload</span>
                  <span className="text-xs text-gray-400">PNG, JPG, SVG supported</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
            {/* Templates */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Layers size={18} className="text-gray-700" />
                <h3 className="font-bold text-gray-900">Templates</h3>
              </div>
              <div className="space-y-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`w-full p-3 rounded-xl border-2 transition text-left ${
                      selectedTemplate === template.id
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Mini Card Preview */}
                      <div
                        className="w-16 h-10 rounded-lg flex items-center justify-center text-xs font-bold relative overflow-hidden flex-shrink-0"
                        style={{
                          background: template.id === 'match' && uploadedImage
                            ? 'transparent'
                            : template.bgColor,
                          color: template.textColor,
                        }}
                      >
                        {template.id === 'match' && uploadedImage ? (
                          <>
                            <img src={uploadedImage} alt="match" className="absolute inset-0 w-full h-full object-cover" />
                            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)' }} />
                            <span className="relative z-10 text-white text-[5px] font-bold text-center px-0.5">Match Card</span>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex flex-col justify-between p-1">
                            <div className="text-[6px] font-bold">{cardText.name.split(' ')[0]}</div>
                            <div className="text-[4px] opacity-70">{cardText.title.substring(0, 10)}</div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{template.name}</p>
                        <p className="text-xs text-gray-500">{template.preview}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Palette size={18} className="text-gray-700" />
                <h3 className="font-bold text-gray-900">Colors</h3>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {colorSchemes.map((scheme) => (
                  <button
                    key={scheme.id}
                    onClick={() => setSelectedColor(scheme.color)}
                    className={`w-full aspect-square rounded-lg border-2 transition ${
                      selectedColor === scheme.color
                        ? 'border-gray-900 scale-105'
                        : 'border-gray-200 hover:scale-105'
                    }`}
                    style={{ backgroundColor: scheme.color }}
                    title={scheme.name}
                  />
                ))}
              </div>
            </div>

            {/* Layouts */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Layout size={18} className="text-gray-700" />
                <h3 className="font-bold text-gray-900">Layout</h3>
              </div>
              <div className="space-y-2">
                {layouts.map((layout) => (
                  <button
                    key={layout.id}
                    onClick={() => setSelectedLayout(layout.id)}
                    className={`w-full p-3 rounded-xl border-2 transition text-left ${
                      selectedLayout === layout.id
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900 mb-1">{layout.name}</p>
                    <p className="text-xs text-gray-500">{layout.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Center - Canvas */}
          <div className="col-span-6 h-full overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db #f3f4f6' }}>
            <div className="bg-white rounded-2xl p-8 border border-gray-200 h-full">
              <div className="flex items-center justify-center h-full">
                {/* Business Card Preview */}
                <div
                  ref={cardRef}
                  className="rounded-2xl shadow-2xl p-8 relative overflow-hidden"
                  style={{
                    width: '500px',
                    height: '300px',
                    background: selectedTemplate === 'match' && uploadedImage
                      ? 'transparent'
                      : currentTemplate.bgColor,
                    color: currentTemplate.textColor,
                  }}
                >
                  {/* Match Selected Card — full product image as background */}
                  {selectedTemplate === 'match' && uploadedImage && (
                    <div
                      className="absolute inset-0 z-0"
                      style={{
                        backgroundImage: `url(${uploadedImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: 1,
                      }}
                    />
                  )}
                  {/* Semi-transparent overlay for text readability on match template */}
                  {selectedTemplate === 'match' && uploadedImage && (
                    <div className="absolute inset-0 z-0" style={{ background: 'rgba(0,0,0,0.35)' }} />
                  )}

                  {/* Background image overlay (non-match templates) */}
                  {uploadedImage && imagePosition === 'background' && selectedTemplate !== 'match' && (
                    <div
                      className="absolute inset-0 z-0"
                      style={{
                        backgroundImage: `url(${uploadedImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: 0.25,
                      }}
                    />
                  )}

                  {/* Layout: Horizontal */}
                  {selectedLayout === 'horizontal' && (
                    <div className="h-full flex flex-col justify-between relative z-10">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="font-bold text-3xl mb-2">{cardText.name}</h2>
                          <p className="text-lg opacity-80">{cardText.title}</p>
                        </div>
                        {uploadedImage && imagePosition === 'logo' && (
                          <img 
                            src={uploadedImage} 
                            alt="Logo" 
                            className="object-contain rounded flex-shrink-0" 
                            style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
                          />
                        )}
                        {uploadedImage && imagePosition === 'right' && (
                          <img 
                            src={uploadedImage} 
                            alt="Card image" 
                            className="object-cover rounded-lg flex-shrink-0" 
                            style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
                          />
                        )}
                      </div>
                      <div className="flex items-end justify-between">
                        <div className="space-y-1 text-sm opacity-90">
                          <p>{cardText.phone}</p>
                          <p>{cardText.email}</p>
                          <p>{cardText.website}</p>
                          {cardText.address && <p className="text-xs mt-2 opacity-75">{cardText.address}</p>}
                        </div>
                        {uploadedImage && imagePosition === 'left' && (
                          <img 
                            src={uploadedImage} 
                            alt="Card image" 
                            className="object-cover rounded-lg flex-shrink-0" 
                            style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Layout: Vertical */}
                  {selectedLayout === 'vertical' && (
                    <div className="h-full flex flex-col items-center justify-center text-center relative z-10">
                      {uploadedImage && (imagePosition === 'logo' || imagePosition === 'left') && (
                        <img 
                          src={uploadedImage} 
                          alt="Logo" 
                          className="object-contain rounded-lg mb-3" 
                          style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
                        />
                      )}
                      <h2 className="font-bold text-3xl mb-2">{cardText.name}</h2>
                      <p className="text-lg opacity-80 mb-4">{cardText.title}</p>
                      <div className="space-y-1 text-sm opacity-90">
                        <p>{cardText.phone}</p>
                        <p>{cardText.email}</p>
                        <p>{cardText.website}</p>
                        {cardText.address && <p className="text-xs mt-2 opacity-75">{cardText.address}</p>}
                      </div>
                    </div>
                  )}

                  {/* Layout: Centered */}
                  {selectedLayout === 'centered' && (
                    <div className="h-full flex items-center justify-center relative z-10">
                      <div className="text-center">
                        {uploadedImage && imagePosition === 'logo' && (
                          <img 
                            src={uploadedImage} 
                            alt="Logo" 
                            className="object-contain rounded-lg mx-auto mb-3" 
                            style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
                          />
                        )}
                        <h2 className="font-bold text-4xl mb-3">{cardText.name}</h2>
                        <p className="text-xl opacity-80 mb-6">{cardText.title}</p>
                        <div className="space-y-2 text-sm opacity-90">
                          <p>{cardText.phone}</p>
                          <p>{cardText.email}</p>
                          {cardText.address && <p className="text-xs mt-2 opacity-75">{cardText.address}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Layout: Split */}
                  {selectedLayout === 'split' && (
                    <div className="h-full grid grid-cols-2 gap-8 relative z-10">
                      <div className="flex flex-col justify-center">
                        {uploadedImage && imagePosition === 'logo' && (
                          <img 
                            src={uploadedImage} 
                            alt="Logo" 
                            className="object-contain rounded mb-3" 
                            style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
                          />
                        )}
                        <h2 className="font-bold text-2xl mb-2">{cardText.name}</h2>
                        <p className="text-base opacity-80">{cardText.title}</p>
                      </div>
                      <div className="flex flex-col justify-center">
                        {uploadedImage && (imagePosition === 'right' || imagePosition === 'left') ? (
                          <img 
                            src={uploadedImage} 
                            alt="Card image" 
                            className="object-cover rounded-lg mb-2" 
                            style={{ width: '100%', height: `${logoSize * 2}px` }}
                          />
                        ) : (
                          <div className="space-y-1 text-sm opacity-90">
                            <p>{cardText.phone}</p>
                            <p>{cardText.email}</p>
                            <p>{cardText.website}</p>
                            <p className="text-xs mt-2">{cardText.address}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Decorative Element */}
                  <div
                    className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full opacity-10 z-0"
                    style={{ backgroundColor: currentTemplate.textColor }}
                  />

                  {/* Draggable Custom Logo */}
                  {uploadedImage && imagePosition === 'custom' && (
                    <img
                      src={uploadedImage}
                      alt="Draggable Logo"
                      className="absolute object-contain rounded cursor-move z-20"
                      style={{
                        width: `${logoSize}px`,
                        height: `${logoSize}px`,
                        left: `${logoPosition.x}%`,
                        top: `${logoPosition.y}%`,
                        transform: 'translate(-50%, -50%)',
                        userSelect: 'none',
                      }}
                      onMouseDown={handleLogoDragStart}
                      draggable={false}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Text Editor */}
          <div className="col-span-3 h-full overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db #f3f4f6' }}>
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Type size={18} className="text-gray-700" />
                <h3 className="font-bold text-gray-900">Edit Text</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={cardText.name}
                    onChange={(e) => setCardText({ ...cardText, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-gray-900 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={cardText.title}
                    onChange={(e) => setCardText({ ...cardText, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-gray-900 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={cardText.phone}
                    onChange={(e) => setCardText({ ...cardText, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-gray-900 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={cardText.email}
                    onChange={(e) => setCardText({ ...cardText, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-gray-900 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Website</label>
                  <input
                    type="url"
                    value={cardText.website}
                    onChange={(e) => setCardText({ ...cardText, website: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-gray-900 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Address</label>
                  <textarea
                    value={cardText.address}
                    onChange={(e) => setCardText({ ...cardText, address: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-gray-900 transition resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardEditorPage;
