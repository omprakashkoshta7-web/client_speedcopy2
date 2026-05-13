import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fabric } from 'fabric';
import { ArrowLeft, Type, Image as ImageIcon, Download, Trash2, Plus, Minus, ChevronLeft, ChevronRight, FilePlus, Upload } from 'lucide-react';
import fileStorageService from '../services/fileStorage.service';

const DocumentEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(100);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [documentSize, setDocumentSize] = useState<'A4' | 'A3' | 'Letter'>('A4');
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  
  // Multi-page state
  const [pages, setPages] = useState<any[]>([{ id: 1, canvasData: null }]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const readyFileInputRef = useRef<HTMLInputElement>(null);
  
  // Text controls
  const [textInput, setTextInput] = useState('Add your text');
  const [fontSize, setFontSize] = useState(24);
  const [fontColor, setFontColor] = useState('#111111');
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('normal');
  const [fontStyle, setFontStyle] = useState<'normal' | 'italic'>('normal');

  // Document size configurations
  const documentSizes = {
    'A4': { width: 794, height: 1123, label: 'A4 (210mm × 297mm)' },
    'A3': { width: 1123, height: 1587, label: 'A3 (297mm × 420mm)' },
    'Letter': { width: 816, height: 1056, label: 'Letter (8.5" × 11")' },
  };

  const currentSize = documentSizes[documentSize];

  // Save current page canvas data before switching
  const saveCurrentPageData = () => {
    if (!canvas) return;
    
    const updatedPages = [...pages];
    updatedPages[currentPageIndex].canvasData = canvas.toJSON();
    setPages(updatedPages);
    console.log(`✅ Page ${currentPageIndex + 1} data saved`);
  };

  // Load page canvas data
  const loadPageData = (pageIndex: number) => {
    if (!canvas || !pages[pageIndex]) return;
    
    const pageData = pages[pageIndex].canvasData;
    
    if (pageData) {
      canvas.loadFromJSON(pageData, () => {
        canvas.renderAll();
        console.log(`✅ Page ${pageIndex + 1} data loaded`);
      });
    } else {
      // Clear canvas for new page
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      canvas.renderAll();
      console.log(`✅ Page ${pageIndex + 1} is blank`);
    }
  };

  // Add new page
  const addNewPage = () => {
    saveCurrentPageData(); // Save current page first
    
    const newPage = {
      id: pages.length + 1,
      canvasData: null,
    };
    
    setPages([...pages, newPage]);
    setCurrentPageIndex(pages.length); // Switch to new page
    console.log(`✅ New page added (Page ${pages.length + 1})`);
  };

  // Navigate to specific page
  const goToPage = (pageIndex: number) => {
    if (pageIndex < 0 || pageIndex >= pages.length) return;
    
    saveCurrentPageData(); // Save current page first
    setCurrentPageIndex(pageIndex);
    console.log(`✅ Navigating to page ${pageIndex + 1}`);
  };

  // Delete current page
  const deleteCurrentPage = () => {
    if (pages.length === 1) {
      alert('Cannot delete the last page');
      return;
    }
    
    const confirmDelete = window.confirm(`Delete Page ${currentPageIndex + 1}?`);
    if (!confirmDelete) return;
    
    const updatedPages = pages.filter((_, idx) => idx !== currentPageIndex);
    setPages(updatedPages);
    
    // Navigate to previous page or first page
    const newPageIndex = currentPageIndex > 0 ? currentPageIndex - 1 : 0;
    setCurrentPageIndex(newPageIndex);
    
    console.log(`✅ Page ${currentPageIndex + 1} deleted`);
  };

  // Image adjustment functions
  const scaleSelectedObject = (factor: number) => {
    if (!canvas || !selectedObject) {
      alert('Please select an object first');
      return;
    }
    
    const currentScaleX = selectedObject.scaleX || 1;
    const currentScaleY = selectedObject.scaleY || 1;
    
    selectedObject.set({
      scaleX: currentScaleX * factor,
      scaleY: currentScaleY * factor,
    });
    
    canvas.renderAll();
    console.log('✅ Object scaled:', factor);
  };

  const moveSelectedObject = (direction: 'up' | 'down' | 'left' | 'right', distance: number = 10) => {
    if (!canvas || !selectedObject) {
      alert('Please select an object first');
      return;
    }
    
    const currentLeft = selectedObject.left || 0;
    const currentTop = selectedObject.top || 0;
    
    switch (direction) {
      case 'up':
        selectedObject.set({ top: currentTop - distance });
        break;
      case 'down':
        selectedObject.set({ top: currentTop + distance });
        break;
      case 'left':
        selectedObject.set({ left: currentLeft - distance });
        break;
      case 'right':
        selectedObject.set({ left: currentLeft + distance });
        break;
    }
    
    canvas.renderAll();
    console.log('✅ Object moved:', direction);
  };

  const centerSelectedObject = () => {
    if (!canvas || !selectedObject) {
      alert('Please select an object first');
      return;
    }
    
    selectedObject.set({
      left: canvas.width! / 2,
      top: canvas.height! / 2,
      originX: 'center',
      originY: 'center',
    });
    
    canvas.renderAll();
    console.log('✅ Object centered');
  };

  // Initialize canvas for document editing
  useEffect(() => {
    const initCanvas = async () => {
      try {
        setLoading(true);
        setError('');

        // Initialize fabric canvas with selected document size
        if (canvasRef.current) {
          const fabricCanvas = new fabric.Canvas(canvasRef.current, {
            width: currentSize.width,
            height: currentSize.height,
            backgroundColor: '#ffffff',
            preserveObjectStacking: true,
          });

          fabricCanvas.selectionColor = 'rgba(255, 106, 61, 0.12)';
          fabricCanvas.selectionBorderColor = '#ff6a3d';
          fabricCanvas.selectionLineWidth = 2;

          // Add event listeners
          fabricCanvas.on('selection:created', (e: any) => {
            console.log('Object selected');
            setSelectedObject(e.selected?.[0] || null);
          });
          fabricCanvas.on('selection:updated', (e: any) => {
            console.log('Selection updated');
            setSelectedObject(e.selected?.[0] || null);
          });
          fabricCanvas.on('selection:cleared', () => {
            console.log('Selection cleared');
            setSelectedObject(null);
          });

          setCanvas(fabricCanvas);
          console.log('✅ Canvas initialized successfully:', fabricCanvas.width, 'x', fabricCanvas.height);
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Error initializing document editor:', err);
        setError(err?.message || 'Failed to load document editor');
        setLoading(false);
      }
    };

    initCanvas();

    return () => {
      if (canvas) {
        canvas.dispose();
      }
    };
  }, [documentSize]); // Re-initialize when document size changes

  // Load page data when currentPageIndex changes
  useEffect(() => {
    if (canvas) {
      loadPageData(currentPageIndex);
    }
  }, [currentPageIndex, canvas]);

  // Add text to canvas
  const addText = () => {
    if (!canvas) {
      console.error('Canvas not initialized');
      return;
    }
    
    if (!textInput.trim()) {
      alert('Please enter some text');
      return;
    }

    console.log('Adding text to canvas:', textInput);

    const text = new fabric.IText(textInput, {
      left: canvas.width! / 2,
      top: canvas.height! / 2,
      originX: 'center',
      originY: 'center',
      fontSize,
      fill: fontColor,
      fontFamily: 'Arial, sans-serif',
      fontWeight,
      fontStyle,
      cornerColor: '#ff6a3d',
      borderColor: '#ff6a3d',
      cornerSize: 10,
      transparentCorners: false,
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    console.log('✅ Text added to canvas successfully');
  };

  // Add image to canvas
  const addImageToCanvas = (src: string) => {
    if (!canvas) {
      console.error('Canvas not initialized');
      return;
    }

    console.log('Adding image to canvas:', src.substring(0, 50));

    fabric.Image.fromURL(
      src,
      (img: any) => {
        if (!img) {
          alert('Failed to load image');
          console.error('Image load failed');
          return;
        }

        console.log('Image loaded:', img.width, 'x', img.height);

        const centerX = canvas.width! / 2;
        const centerY = canvas.height! / 2;

        // Scale image to fit within canvas (max 80% of canvas size)
        const maxWidth = canvas.width! * 0.6;
        const maxHeight = canvas.height! * 0.6;
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);

        img.set({
          left: centerX,
          top: centerY,
          originX: 'center',
          originY: 'center',
          scaleX: scale,
          scaleY: scale,
          cornerColor: '#ff6a3d',
          borderColor: '#ff6a3d',
          cornerSize: 10,
          transparentCorners: false,
        });

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        console.log('✅ Image added to canvas successfully');
      },
      { crossOrigin: 'anonymous' }
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
    if (!canvas) {
      console.error('Canvas not initialized');
      return;
    }
    
    const activeObject = canvas.getActiveObject();
    if (!activeObject) {
      alert('Please select an object to delete');
      return;
    }
    
    canvas.remove(activeObject);
    canvas.discardActiveObject();
    canvas.renderAll();
    console.log('✅ Object deleted');
  };

  // Export as PDF-ready image
  const exportDocument = () => {
    if (!canvas) {
      alert('Canvas not initialized');
      return;
    }
    
    try {
      const dataUrl = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 3, // High quality for printing (3x resolution)
      });
      
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `document-design-${Date.now()}.png`;
      link.click();
      console.log('✅ Document exported successfully');
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export document');
    }
  };

  // Save to print config
  const saveAndContinue = async () => {
    if (!canvas) {
      setError('Canvas not initialized');
      alert('Canvas not ready. Please try again.');
      return;
    }

    try {
      console.log('Saving document design...');
      
      // Save current page data first
      saveCurrentPageData();
      
      // Initialize file storage service
      await fileStorageService.init();
      
      // Generate preview for each page
      const allPagePreviews: string[] = [];
      
      for (let i = 0; i < pages.length; i++) {
        const pageData = i === currentPageIndex ? canvas.toJSON() : pages[i].canvasData;
        
        if (pageData) {
          // Temporarily load page data to generate preview
          const tempCanvas = new fabric.Canvas(null as any, {
            width: currentSize.width,
            height: currentSize.height,
          });
          
          await new Promise<void>((resolve) => {
            tempCanvas.loadFromJSON(pageData, async () => {
              const preview = tempCanvas.toDataURL({
                format: 'jpeg', // Use JPEG instead of PNG for smaller size
                quality: 0.8,   // Reduce quality to save space
                multiplier: 1.5, // Reduce multiplier from 2 to 1.5
              });
              
              // Compress image further if needed
              const compressed = await fileStorageService.compressImage(preview, 1000, 0.7);
              allPagePreviews.push(compressed);
              tempCanvas.dispose();
              resolve();
            });
          });
        } else {
          // Empty page - create blank preview
          const tempCanvas = new fabric.Canvas(null as any, {
            width: currentSize.width,
            height: currentSize.height,
            backgroundColor: '#ffffff',
          });
          const preview = tempCanvas.toDataURL({
            format: 'jpeg',
            quality: 0.8,
            multiplier: 1.5,
          });
          const compressed = await fileStorageService.compressImage(preview, 1000, 0.7);
          allPagePreviews.push(compressed);
          tempCanvas.dispose();
        }
      }

      // Create file objects for each page
      const newFiles = allPagePreviews.map((preview, index) => ({
        id: `design_page_${Date.now()}_${index}`,
        name: `Document Design - ${documentSize} - Page ${index + 1}.jpg`,
        size: preview.length,
        pages: 1,
        uploadedAt: new Date().toISOString(),
        mimetype: 'image/jpeg',
        data: preview,
        isFromEditor: true,
      }));

      // Save files to IndexedDB instead of localStorage
      for (const file of newFiles) {
        await fileStorageService.saveFile(file);
      }

      // Also save complete design data (smaller, so can stay in localStorage)
      const designData = {
        pages: pages.map((page, idx) => ({
          id: page.id,
          canvasData: idx === currentPageIndex ? canvas.toJSON() : page.canvasData,
        })),
        timestamp: Date.now(),
        type: 'document-editor',
        documentSize,
        totalPages: pages.length,
      };
      
      localStorage.setItem('document_editor_design', JSON.stringify(designData));
      console.log(`✅ ${pages.length} page(s) saved to IndexedDB`);
      
      // Navigate back to print config
      alert(`Design saved successfully! ${pages.length} page(s) added to uploaded files.`);
      navigate('/print-config?type=standard');
    } catch (err: any) {
      console.error('Error saving document:', err);
      
      // Check if it's a quota error
      if (err.name === 'QuotaExceededError' || err.message?.includes('quota')) {
        alert('Storage limit reached. Please delete some old designs or reduce image quality.');
      } else {
        setError(err?.message || 'Failed to save document');
        alert('Failed to save design. Please try again.');
      }
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

      // Check file size (warn if > 10MB)
      if (file.size > 10 * 1024 * 1024) {
        const proceed = confirm(`File ${file.name} is large (${(file.size / 1024 / 1024).toFixed(2)}MB). This may cause storage issues. Continue?`);
        if (!proceed) continue;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        
        if (file.type.startsWith('image/')) {
          try {
            // Compress image before loading
            const compressed = await fileStorageService.compressImage(dataUrl, 1200, 0.8);
            
            fabric.Image.fromURL(
              compressed,
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
                
                alert('✅ Ready-to-print document uploaded! You can now save and continue.');
              },
              { crossOrigin: 'anonymous' }
            );
          } catch (error) {
            console.error('Image compression failed:', error);
            alert('Failed to process image. Please try a smaller file.');
          }
        } else if (file.type === 'application/pdf') {
          alert('PDF uploaded successfully! This will be processed during order fulfillment.');
          // Store PDF reference only (not the full data)
          localStorage.setItem('readyPrintFile', JSON.stringify({
            name: file.name,
            type: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString()
          }));
        }
      };
      reader.readAsDataURL(file);
    }

    e.target.value = '';
    setShowUploadModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff6a3d] mx-auto mb-4"></div>
          <p className="text-slate-600 font-semibold">Loading document editor...</p>
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
            <h3 className="text-xl font-bold text-gray-900 mb-4">Upload Ready-to-Print Document</h3>
            <p className="text-sm text-gray-600 mb-4">
              Have a print-ready document? Upload it here to skip the design process.
            </p>
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <p className="text-xs text-blue-800 font-semibold mb-2">Supported Formats:</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• PDF (Recommended for documents)</li>
                <li>• PNG (300 DPI minimum)</li>
                <li>• JPG/JPEG (300 DPI minimum)</li>
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
              <h1 className="text-lg font-bold text-slate-900">Document Editor</h1>
              <p className="text-xs text-slate-500">Design your document for printing</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold text-sm"
            >
              <Upload size={14} />
              Upload Ready Document
            </button>

            {/* Page Navigation */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5 mr-2">
              <button
                onClick={() => goToPage(currentPageIndex - 1)}
                disabled={currentPageIndex === 0}
                className="p-1 hover:bg-white rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-semibold px-2">
                Page {currentPageIndex + 1} / {pages.length}
              </span>
              <button
                onClick={() => goToPage(currentPageIndex + 1)}
                disabled={currentPageIndex === pages.length - 1}
                className="p-1 hover:bg-white rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={addNewPage}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold text-xs"
              title="Add New Page"
            >
              <FilePlus size={14} />
              Add Page
            </button>

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
              onClick={saveAndContinue}
              className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-1.5"
            >
              <Download size={14} />
              Save
            </button>

            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 flex items-center gap-1.5"
            >
              <Upload size={14} />
              Upload Ready Design
            </button>

            <button
              className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition"
              style={{ backgroundColor: '#111111', color: '#ffffff' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Ready for Review
            </button>

            <button
              className="px-4 py-2 rounded-lg text-sm font-medium border transition flex items-center gap-1.5"
              style={{ border: '1.5px solid #e5e7eb', backgroundColor: '#fff', color: '#374151' }}
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              My Designs
              {pages.length > 0 && (
                <span className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {pages.length}
                </span>
              )}
            </button>

            <button
              onClick={exportDocument}
              className="px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600"
            >
              Add To Cart
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left Panel - Tools - Compact */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-3 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Tools</h2>

              {/* Document Size Selector */}
              <div className="border-t pt-3">
                <h3 className="text-xs font-semibold text-slate-600 mb-2">Document Size</h3>
                <div className="space-y-2">
                  {(Object.keys(documentSizes) as Array<keyof typeof documentSizes>).map((size) => (
                    <button
                      key={size}
                      onClick={() => setDocumentSize(size)}
                      className={`w-full px-3 py-2 text-xs font-semibold rounded-lg transition ${
                        documentSize === size
                          ? 'bg-[#ff6a3d] text-white'
                          : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
                      }`}
                    >
                      {documentSizes[size].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Image */}
              <div className="border-t pt-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#ff6a3d] text-white rounded-lg hover:bg-[#f35c2c] transition font-semibold text-xs"
                >
                  <ImageIcon size={12} />
                  Add Image
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
              </div>

              {/* Text Controls */}
              <div className="border-t pt-3">
                <h3 className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                  <Type size={12} />
                  Add Text
                </h3>
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#ff6a3d] mb-2"
                  placeholder="Enter text"
                />
                
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Size</label>
                    <input
                      type="number"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-[#ff6a3d]"
                      min="8"
                      max="72"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Color</label>
                    <input
                      type="color"
                      value={fontColor}
                      onChange={(e) => setFontColor(e.target.value)}
                      className="w-full h-8 border border-gray-200 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    onClick={() => setFontWeight(fontWeight === 'bold' ? 'normal' : 'bold')}
                    className={`px-2 py-1.5 text-xs font-semibold rounded ${
                      fontWeight === 'bold' ? 'bg-[#1e2a43] text-white' : 'bg-gray-100 text-slate-700'
                    }`}
                  >
                    Bold
                  </button>
                  <button
                    onClick={() => setFontStyle(fontStyle === 'italic' ? 'normal' : 'italic')}
                    className={`px-2 py-1.5 text-xs italic rounded ${
                      fontStyle === 'italic' ? 'bg-[#1e2a43] text-white' : 'bg-gray-100 text-slate-700'
                    }`}
                  >
                    Italic
                  </button>
                </div>

                <button
                  onClick={addText}
                  className="w-full px-3 py-2 bg-[#ff6a3d] text-white rounded-lg hover:bg-[#f35c2c] transition font-semibold text-xs"
                >
                  Add Text to Document
                </button>
              </div>

              {/* Object Adjustment Controls */}
              {selectedObject && (
                <div className="border-t pt-3">
                  <h3 className="text-xs font-semibold text-slate-600 mb-2">Adjust Selected Object</h3>
                  
                  {/* Size Controls */}
                  <div className="mb-3">
                    <p className="text-xs text-slate-500 mb-1.5">Size</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => scaleSelectedObject(0.9)}
                        className="px-3 py-2 bg-gray-100 text-slate-700 rounded-lg hover:bg-gray-200 transition text-xs font-semibold"
                      >
                        − Smaller
                      </button>
                      <button
                        onClick={() => scaleSelectedObject(1.1)}
                        className="px-3 py-2 bg-gray-100 text-slate-700 rounded-lg hover:bg-gray-200 transition text-xs font-semibold"
                      >
                        + Larger
                      </button>
                    </div>
                  </div>

                  {/* Position Controls */}
                  <div className="mb-3">
                    <p className="text-xs text-slate-500 mb-1.5">Position</p>
                    <div className="grid grid-cols-3 gap-1">
                      <div></div>
                      <button
                        onClick={() => moveSelectedObject('up')}
                        className="px-2 py-2 bg-gray-100 text-slate-700 rounded-lg hover:bg-gray-200 transition text-xs font-semibold"
                      >
                        ↑
                      </button>
                      <div></div>
                      
                      <button
                        onClick={() => moveSelectedObject('left')}
                        className="px-2 py-2 bg-gray-100 text-slate-700 rounded-lg hover:bg-gray-200 transition text-xs font-semibold"
                      >
                        ←
                      </button>
                      <button
                        onClick={() => centerSelectedObject()}
                        className="px-2 py-2 bg-[#ff6a3d] text-white rounded-lg hover:bg-[#f35c2c] transition text-xs font-semibold"
                      >
                        ●
                      </button>
                      <button
                        onClick={() => moveSelectedObject('right')}
                        className="px-2 py-2 bg-gray-100 text-slate-700 rounded-lg hover:bg-gray-200 transition text-xs font-semibold"
                      >
                        →
                      </button>
                      
                      <div></div>
                      <button
                        onClick={() => moveSelectedObject('down')}
                        className="px-2 py-2 bg-gray-100 text-slate-700 rounded-lg hover:bg-gray-200 transition text-xs font-semibold"
                      >
                        ↓
                      </button>
                      <div></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 text-center">● = Center</p>
                  </div>
                </div>
              )}

              {/* Delete */}
              <button
                onClick={deleteSelected}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition font-semibold text-xs"
              >
                <Trash2 size={12} />
                Delete Selected
              </button>

              {/* Delete Page */}
              {pages.length > 1 && (
                <button
                  onClick={deleteCurrentPage}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold text-xs"
                >
                  <Trash2 size={12} />
                  Delete Page {currentPageIndex + 1}
                </button>
              )}

              {/* Uploaded Images */}
              {uploadedImages.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Uploaded ({uploadedImages.length})</p>
                  <div className="grid grid-cols-2 gap-2">
                    {uploadedImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => addImageToCanvas(img)}
                        className="rounded-lg overflow-hidden border-2 border-gray-200 hover:border-[#ff6a3d] transition"
                      >
                        <img src={img} alt={`upload-${idx}`} className="w-full h-10 object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="border-t pt-3">
                <div className="bg-blue-50 rounded-lg p-2 mb-2">
                  <p className="text-xs text-blue-700">
                    💡 <strong>Tip:</strong> Design your document with images and text. Click "Save & Continue" to proceed with printing.
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-2">
                  <p className="text-xs text-green-700">
                    📄 <strong>Multi-Page:</strong> Click "Add Page" to create multiple pages. Each page is saved separately.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Canvas Area - Compact */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">{currentSize.label}</h3>
                  <p className="text-xs text-slate-500">Page {currentPageIndex + 1} of {pages.length}</p>
                </div>
                <span className="text-xs text-slate-500">Zoom: {zoom}%</span>
              </div>
              <div 
                className="flex items-center justify-center bg-gray-100 rounded-xl p-6 overflow-auto" 
                style={{ minHeight: '700px' }}
              >
                <div
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  <div style={{ 
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}>
                    <canvas ref={canvasRef} />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Add images and text to create your document. Drag to move, use handles to resize.
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Canvas: {currentSize.width} × {currentSize.height}px</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentEditorPage;
