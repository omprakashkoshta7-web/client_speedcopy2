import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PDFDocument } from 'pdf-lib';
import Navbar from '../components/Navbar';
import productService from '../services/product.service';
import printingService from '../services/printing.service';
import orderService from '../services/order.service';
import { useAuth } from '../context/AuthContext';
import fileStorageService from '../services/fileStorage.service';

type CounterProps = { value: number; onChange: (v: number) => void };

const Counter: React.FC<CounterProps> = ({ value, onChange }) => (
  <div className="flex items-center gap-3">
    <button onClick={() => onChange(Math.max(1, value - 1))}
      className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-gray-700 transition"
      style={{ backgroundColor: '#111111' }}>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
      </svg>
    </button>
    <span className="font-bold text-gray-900 w-6 text-center" style={{ fontSize: '15px' }}>
      {String(value).padStart(2, '0')}
    </span>
    <button onClick={() => onChange(value + 1)}
      className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-gray-700 transition"
      style={{ backgroundColor: '#111111' }}>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
      </svg>
    </button>
  </div>
);

const PrintConfigPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const printType = searchParams.get('type') || 'standard';
  const productId = searchParams.get('product') || '';

  const [copies, setCopies] = useState(1);
  const [linearSheets, setLinearSheets] = useState(0);
  const [semiLog, setSemiLog] = useState(0);
  const [colorMode, setColorMode] = useState('');
  const [pageSize, setPageSize] = useState('');
  const [printSide, setPrintSide] = useState('');
  const [instructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [bindingType] = useState('');
  const [coverPage, setCoverPage] = useState('');

  const getBackendPrintType = () => {
    const map: Record<string, string> = {
      standard: 'standard_printing',
      'standard-printing': 'standard_printing',
      standard_printing: 'standard_printing',
      'soft-binding': 'soft_binding',
      soft_binding: 'soft_binding',
      'spiral-binding': 'spiral_binding',
      spiral_binding: 'spiral_binding',
      'thesis-binding': 'thesis_binding',
      thesis_binding: 'thesis_binding',
    };
    return map[printType] || 'standard_printing';
  };

  const getBackendColorMode = () => {
    const map: Record<string, 'bw' | 'color' | 'custom'> = {
      'B&W': 'bw',
      bw: 'bw',
      color: 'color',
      Color: 'color',
      Custom: 'custom',
      custom: 'custom',
    };
    return map[colorMode] || 'bw';
  };

  const getBackendPageSize = () => {
    const map: Record<string, 'a4' | 'a3' | 'letter'> = {
      A4: 'a4',
      a4: 'a4',
      A3: 'a3',
      a3: 'a3',
      Letter: 'letter',
      letter: 'letter',
    };
    return map[pageSize] || 'a4';
  };

  const getBackendPrintSide = () => {
    const map: Record<string, 'one_sided' | 'two_sided' | '4in1'> = {
      'one-sided': 'one_sided',
      one_sided: 'one_sided',
      'Single Side': 'one_sided',
      'Two-sided': 'two_sided',
      'Both Sides': 'two_sided',
      two_sided: 'two_sided',
      '4 in 1 (2 front+2 Back)': '4in1',
      '4in1': '4in1',
    };
    return map[printSide] || 'one_sided';
  };

  const getBackendCoverPage = () => {
    const map: Record<string, string> = {
      None: 'transparent_sheet',
      Transparent: 'transparent_sheet',
      Colored: 'blue_cover',
      'Leather-finish': 'print_blue_cover',
    };
    return map[coverPage] || 'transparent_sheet';
  };

  // Pricing configuration
  const pricingConfig = {
    basePrice: {
      'B&W': { 'A4': 2, 'A3': 4 },
      'Color': { 'A4': 5, 'A3': 8 },
      'color': { 'A4': 5, 'A3': 8 },
      'Custom': { 'A4': 3, 'A3': 6 }
    },
    printSideMultiplier: {
      'one-sided': 1,
      'Two-sided': 1.5,
      '4 in 1 (2 front+2 Back)': 0.8
    },
    graphSheetPrice: 3, // per sheet
    processingFee: 5,
    bindingPrice: {
      'None': 0,
      'Soft Binding': 15,
      'Spiral Binding': 25,
      'Thesis Binding': 50
    },
    coverPagePrice: {
      'None': 0,
      'Transparent': 5,
      'Colored': 10,
      'Leather-finish': 20
    }
  };

  // Calculate total price based on selections
  const calculatePrice = () => {
    let total = 0;
    
    // Base printing cost
    if (colorMode && pageSize) {
      const baseRate = pricingConfig.basePrice[colorMode as keyof typeof pricingConfig.basePrice]?.[pageSize as 'A4' | 'A3'] || 0;
      const sideMultiplier = pricingConfig.printSideMultiplier[printSide as keyof typeof pricingConfig.printSideMultiplier] || 1;
      
      // Estimate pages from uploaded files (assuming 1 page per file if not specified)
      const totalPages = uploadedFiles.reduce((sum, file) => sum + (file.pages || 1), 0);
      
      total += baseRate * totalPages * copies * sideMultiplier;
    }
    
    // Graph sheets cost
    if (linearSheets > 0 || semiLog > 0) {
      total += (linearSheets + semiLog) * pricingConfig.graphSheetPrice;
    }
    
    // Binding cost
    if (bindingType) {
      total += pricingConfig.bindingPrice[bindingType as keyof typeof pricingConfig.bindingPrice] || 0;
    }
    
    // Cover page cost
    if (coverPage) {
      total += pricingConfig.coverPagePrice[coverPage as keyof typeof pricingConfig.coverPagePrice] || 0;
    }
    
    // Processing fee
    total += pricingConfig.processingFee;
    
    return total;
  };

  const totalPrice = calculatePrice();

  React.useEffect(() => {
    fetchUploadedFiles();
  }, []);

  // Reload files when page becomes visible (user returns from editor)
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page visible, reloading uploaded files...');
        fetchUploadedFiles();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchUploadedFiles = async () => {
    try {
      // Initialize IndexedDB
      await fileStorageService.init();
      
      // Try to migrate from localStorage if needed
      await fileStorageService.migrateFromLocalStorage();
      
      // Get files from IndexedDB
      const files = await fileStorageService.getAllFiles();
      
      if (files.length > 0) {
        console.log(`✅ Loaded ${files.length} files from IndexedDB`);
        setUploadedFiles(files);
        return;
      }
      
      // If no files in IndexedDB, try API
      try {
        const response = await productService.getUploadedFiles();
        const apiFiles = response.data || [];
        if (apiFiles.length > 0) {
          setUploadedFiles(apiFiles);
          // Save to IndexedDB for offline access
          for (const file of apiFiles) {
            await fileStorageService.saveFile(file);
          }
          return;
        }
      } catch (_apiErr) {
        console.log('API not available, using IndexedDB only');
      }
      
      setUploadedFiles([]);
    } catch (error) {
      console.error('Error fetching files:', error);
      setUploadedFiles([]);
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles: any[] = [];
    const acceptedFiles: File[] = [];
    
    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check file size (warn if > 10MB)
      if (file.size > 10 * 1024 * 1024) {
        const proceed = confirm(`File "${file.name}" is large (${(file.size / 1024 / 1024).toFixed(2)}MB). This may take time to process. Continue?`);
        if (!proceed) continue;
      }
      
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          let pageCount = 1;
          let fileData: any;
          
          // For PDF files, count pages
          if (file.type === 'application/pdf') {
            try {
              const arrayBuffer = e.target?.result as ArrayBuffer;
              console.log(`📄 Processing PDF: ${file.name}, size: ${file.size} bytes`);
              
              const pdfDoc = await PDFDocument.load(arrayBuffer);
              pageCount = pdfDoc.getPageCount();
              
              console.log(`✅ PDF "${file.name}" has ${pageCount} pages`);
              
              // Store PDF as base64 for smaller size
              const base64 = btoa(
                new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
              );
              
              fileData = {
                id: `${Date.now()}_${i}`,
                name: file.name,
                size: file.size,
                pages: pageCount,
                uploadedAt: new Date().toISOString(),
                mimetype: file.type,
                data: `data:application/pdf;base64,${base64}`,
              };
              
              console.log(`📦 File data created:`, { name: fileData.name, pages: fileData.pages, size: fileData.size });
            } catch (err) {
              console.error('❌ PDF processing error:', err);
              console.error('File details:', { name: file.name, type: file.type, size: file.size });
              alert(`Failed to process PDF: ${file.name}. Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
              resolve();
              return;
            }
          } 
          // For image files, compress them
          else if (file.type.startsWith('image/')) {
            try {
              const dataUrl = e.target?.result as string;
              // Compress image to reduce storage
              const compressed = await fileStorageService.compressImage(dataUrl, 1200, 0.8);
              
              fileData = {
                id: `${Date.now()}_${i}`,
                name: file.name,
                size: compressed.length, // Use compressed size
                pages: 1,
                uploadedAt: new Date().toISOString(),
                mimetype: 'image/jpeg', // Convert to JPEG
                data: compressed,
              };
            } catch (err) {
              console.error('Image compression error:', err);
              alert(`Failed to process image: ${file.name}`);
              resolve();
              return;
            }
          }
          // For other files
          else {
            fileData = {
              id: `${Date.now()}_${i}`,
              name: file.name,
              size: file.size,
              pages: 1,
              uploadedAt: new Date().toISOString(),
              mimetype: file.type,
              data: e.target?.result,
            };
          }
          
          newFiles.push(fileData);
          acceptedFiles.push(file);
          resolve();
        };
        
        // Read as appropriate format
        if (file.type === 'application/pdf') {
          reader.readAsArrayBuffer(file);
        } else {
          reader.readAsDataURL(file);
        }
      });
    }

    let filesForState = newFiles;

    try {
      if (acceptedFiles.length > 0) {
        const uploadResponse = await printingService.uploadFiles(acceptedFiles);
        const uploadedFilesFromApi = extractUploadedFiles(uploadResponse);

        filesForState = newFiles.map((localFile, index) => {
          const uploadedFile = uploadedFilesFromApi[index];
          if (!uploadedFile) return localFile;

          return {
            ...localFile,
            originalName: uploadedFile.originalName || localFile.name,
            url: uploadedFile.url || localFile.url,
            publicId: uploadedFile.publicId || localFile.publicId || localFile.id,
            size: uploadedFile.size || localFile.size,
            pages: uploadedFile.pages || localFile.pages,
            mimeType: uploadedFile.mimeType || localFile.mimetype,
            mimetype: uploadedFile.mimeType || localFile.mimetype,
            previewImage: uploadedFile.previewImage || localFile.previewImage,
            thumbnailUrl: uploadedFile.thumbnailUrl || uploadedFile.previewImage || localFile.thumbnailUrl,
            firstPageImage: uploadedFile.firstPageImage || uploadedFile.previewImage || localFile.firstPageImage,
          };
        });
      }
    } catch (err: any) {
      console.log('Backend upload failed, using local storage:', err.message);
    }
    
    // Update state with all processed files
    setUploadedFiles(prev => {
      const updated = [...prev, ...filesForState];
      
      // Log the files being added
      console.log(`📋 Adding ${filesForState.length} files to state:`);
      filesForState.forEach(f => {
        console.log(`  - ${f.name}: ${f.pages} pages`);
      });
      console.log(`📊 Total files after upload: ${updated.length}`);
      console.log(`📊 Total pages: ${updated.reduce((sum, file) => sum + (file.pages || 1), 0)}`);
      
      // Save to IndexedDB instead of localStorage
      (async () => {
        try {
          for (const file of filesForState) {
            await fileStorageService.saveFile(file);
          }
          console.log(`✅ Saved ${filesForState.length} files to IndexedDB`);
        } catch (error) {
          console.error('Failed to save files to IndexedDB:', error);
          alert('Warning: Files may not be saved permanently. Storage limit may be reached.');
        }
      })();
      return updated;
    });
  };

  const handleBrowseClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.txt';
    input.onchange = (e: any) => handleFileSelect(e.target.files);
    input.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDeleteFile = (fileId: string) => {
    setUploadedFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      // Delete from IndexedDB
      fileStorageService.deleteFile(fileId).catch(err => 
        console.error('Failed to delete file from IndexedDB:', err)
      );
      return updated;
    });
  };

  const extractUploadedFiles = (uploadResponse: any) => {
    const candidates = [
      uploadResponse?.data?.files,
      uploadResponse?.data,
      uploadResponse?.files,
      uploadResponse,
    ];

    return candidates.find((candidate) => Array.isArray(candidate)) || [];
  };

  const isInlineFileData = (value?: string) => Boolean(value?.startsWith('data:'));

  const getFileReference = (file: any) => {
    const remoteUrl = !isInlineFileData(file.url) ? file.url : '';
    const publicId = file.publicId || file.id || `${Date.now()}_${file.name || 'document'}`;

    return {
      originalName: file.originalName || file.name || 'document',
      url: remoteUrl || `local://${publicId}`,
      publicId,
      size: file.size || 0,
      pages: file.pages || 1,
      mimeType: file.mimeType || file.mimetype || '',
      previewImage: !isInlineFileData(file.previewImage) ? file.previewImage || '' : '',
      thumbnailUrl: !isInlineFileData(file.thumbnailUrl) ? file.thumbnailUrl || '' : '',
      firstPageImage: !isInlineFileData(file.firstPageImage) ? file.firstPageImage || '' : '',
    };
  };

  const getCartThumbnail = () => {
    const firstFile = uploadedFiles[0];
    const thumbnail = firstFile?.previewImage || firstFile?.thumbnailUrl || firstFile?.url;
    if (thumbnail && !isInlineFileData(thumbnail)) return thumbnail;
    const fileId = firstFile?.publicId || firstFile?.id;
    return fileId ? `local://${fileId}` : undefined;
  };

  const buildConfigPayload = () => {
    const backendPrintType = getBackendPrintType();

    return {
      printType: backendPrintType,
      files: uploadedFiles.map(getFileReference),
      colorMode: getBackendColorMode(),
      pageSize: getBackendPageSize(),
      printSide: getBackendPrintSide(),
      printOutputType: backendPrintType === 'standard_printing' ? 'loose_paper' : undefined,
      coverPage: backendPrintType === 'soft_binding' ? getBackendCoverPage() : undefined,
      bindingCover: backendPrintType === 'thesis_binding' ? 'black_gold' : undefined,
      cdRequired: backendPrintType === 'thesis_binding' ? 'no_need' : undefined,
      copies,
      linearGraphSheets: linearSheets,
      semiLogGraphSheets: semiLog,
      specialInstructions: instructions,
      deliveryMethod: 'delivery' as const,
      servicePackage: 'standard',
    };
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) { navigate('/'); return; }
    
    // Validate required fields
    if (!colorMode || !pageSize || !printSide) {
      setError('Please select all required options (Color, Page Size, and Sides)');
      return;
    }
    
    if (uploadedFiles.length === 0) {
      setError('Please upload at least one file');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const configResponse = await printingService.savePrintConfig(buildConfigPayload());
      const configId = configResponse.data?._id;
      
      // Add to cart with all required fields
      await orderService.addToCart({
        productId: productId || configId || 'print-config',
        productName: `${getPrintTypeLabel()} - ${uploadedFiles.reduce((sum, f) => sum + (f.pages || 1), 0)} pages`,
        flowType: 'printing',
        printConfigId: configId || undefined,
        quantity: copies,
        unitPrice: totalPrice / copies,
        totalPrice: totalPrice,
        thumbnail: getCartThumbnail(),
      });
      navigate('/cart');
    } catch (err: any) {
      console.error('❌ Add to cart error:', err);
      setError(err.response?.data?.message || 'Failed to add to cart. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToPay = async () => {
    setLoading(true);
    setError('');
    try {
      // Create config object with current selections
      const configData = {
        copies,
        colorMode,
        pageSize,
        printSide,
        linearSheets,
        semiLog,
        bindingType,
        coverPage,
        uploadedFiles,
        totalPages: uploadedFiles.reduce((sum, file) => sum + (file.pages || 1), 0),
        instructions,
        printType
      };

      if (isAuthenticated) {
        const configResponse = await printingService.savePrintConfig(buildConfigPayload());
        const apiConfigId = configResponse.data?._id;
        // Fall back to a temp ID if the API didn't return a valid ID
        const configId = apiConfigId || `temp_${Date.now()}`;
        
        // Save config to localStorage for checkout page
        localStorage.setItem(`printConfig_${configId}`, JSON.stringify(configData));
        
        // Go to pickup location first, then checkout
        navigate(`/pickup-location?configId=${configId}&type=${printType}`);
      } else {
        // Not logged in — save config with temporary ID
        const tempConfigId = `temp_${Date.now()}`;
        localStorage.setItem(`printConfig_${tempConfigId}`, JSON.stringify(configData));
        // Go to pickup location first, then checkout
        navigate(`/pickup-location?configId=${tempConfigId}&type=${printType}`);
      }
    } catch {
      // Even if save fails, proceed to checkout with temp config
      const tempConfigId = `temp_${Date.now()}`;
      const configData2 = {
        copies,
        colorMode,
        pageSize,
        printSide,
        linearSheets,
        semiLog,
        bindingType,
        coverPage,
        uploadedFiles,
        totalPages: uploadedFiles.reduce((sum, file) => sum + (file.pages || 1), 0),
        instructions,
        printType
      };
      localStorage.setItem(`printConfig_${tempConfigId}`, JSON.stringify(configData2));
      // Go to pickup location first, then checkout
      navigate(`/pickup-location?configId=${tempConfigId}&type=${printType}`);
    } finally {
      setLoading(false);
    }
  };

  // Get print type label for display
  const getPrintTypeLabel = () => {
    const labels: Record<string, string> = {
      'standard': 'Standard Printing',
      'soft-binding': 'Soft Binding',
      'spiral-binding': 'Spiral Binding',
      'thesis-binding': 'Thesis Binding',
    };
    return labels[printType] || 'Document Printing';
  };

  return (
    <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition mb-5 font-semibold"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex flex-col lg:flex-row gap-6 items-stretch">

          {/* LEFT — PDF Upload Area (image style: plain gray box with upload icon) */}
          <div className="w-full lg:w-[45%] flex flex-col">
            {/* Upload Box */}
            <div
              className="rounded-2xl flex flex-col items-center justify-center cursor-pointer flex-1"
              style={{
                backgroundColor: '#e8e8e8',
                border: '1.5px dashed #c8c8c8',
                minHeight: '300px',
                position: 'relative',
              }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={handleBrowseClick}
            >
              {uploadedFiles.length === 0 ? (
                /* Empty state — upload icon centered */
                <div className="flex flex-col items-center justify-center text-center px-6">
                  <svg width="52" height="52" fill="none" viewBox="0 0 24 24" stroke="#bbbbbb" strokeWidth={1.2} className="mb-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm font-medium" style={{ color: '#bbbbbb' }}>Tap to upload PDF</p>
                </div>
              ) : (
                /* Files uploaded — full cover preview, file list outside below */
                <>
                  {(() => {
                    const firstFile = uploadedFiles[0];
                    const isImage = firstFile?.mimetype?.startsWith('image/');
                    if (isImage && firstFile?.data) {
                      // Apply CSS filter based on selected color mode
                      const imgFilter =
                        colorMode === 'B&W' ? 'grayscale(100%)' :
                        colorMode === 'Custom' ? 'sepia(40%) contrast(1.1)' :
                        'none';
                      return (
                        <img
                          src={firstFile.data}
                          alt={firstFile.name}
                          className="w-full h-full object-cover rounded-2xl"
                          style={{
                            position: 'absolute', top: 0, left: 0,
                            filter: imgFilter,
                            transition: 'filter 0.3s ease',
                          }}
                        />
                      );
                    }
                    // PDF or other — centered icon
                    return (
                      <div className="flex flex-col items-center justify-center text-center px-6">
                        <svg width="56" height="56" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={1.2} className="mb-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="font-bold text-sm" style={{ color: '#ef4444' }}>PDF</p>
                        <p className="text-xs mt-1 font-semibold text-gray-700 max-w-[160px] truncate">{firstFile.name}</p>
                        <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>{firstFile.pages || 1} page{(firstFile.pages || 1) > 1 ? 's' : ''}</p>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            {/* File list + Add More — shown below upload box when files exist */}
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-1.5" onClick={e => e.stopPropagation()}>
                {uploadedFiles.map((file: any) => (
                  <div key={file.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white"
                    style={{ border: '1px solid #e5e7eb' }}>
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: file.mimetype === 'application/pdf' ? '#fef2f2' : '#eff6ff' }}>
                      <svg className="w-3.5 h-3.5" style={{ color: file.mimetype === 'application/pdf' ? '#ef4444' : '#3b82f6' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate" style={{ fontSize: '11px' }}>{file.name}</p>
                      <p style={{ fontSize: '10px', color: '#9ca3af' }}>
                        {file.size ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : 'N/A'} •{' '}
                        <span className="font-bold" style={{ color: '#3b82f6' }}>
                          {file.pages || 1} {file.pages === 1 ? 'page' : 'pages'}
                        </span>
                      </p>
                    </div>
                    <button onClick={() => handleDeleteFile(file.id)}
                      className="flex-shrink-0 p-1 rounded-lg hover:bg-red-50 transition" style={{ color: '#ef4444' }}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleBrowseClick}
                  className="w-full py-2 rounded-xl text-xs font-semibold transition"
                  style={{ backgroundColor: '#111111', color: '#fff' }}
                >
                  + Add More Files
                </button>
                <p className="text-center text-xs font-semibold" style={{ color: '#3b82f6' }}>
                  Total: {uploadedFiles.reduce((sum, f) => sum + (f.pages || 1), 0)} pages
                </p>
              </div>
            )}

            {/* Delivery time bar */}
            <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ backgroundColor: '#e8f5e9', border: '1px solid #c8e6c9' }}>
              <svg className="w-5 h-5 flex-shrink-0" style={{ color: '#2e7d32' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold" style={{ color: '#1b5e20' }}>
                Delivery by {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', weekday: 'long' })}
              </span>
              <svg className="w-4 h-4 ml-auto flex-shrink-0" style={{ color: '#2e7d32' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* RIGHT — Options Card (image style) */}
          <div className="w-full lg:flex-1">
            <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>

              {/* Title */}
              <h2 className="font-bold text-gray-900 mb-4" style={{ fontSize: '22px' }}>
                {getPrintTypeLabel()}
              </h2>

              {/* Color */}
              <div className="mb-3">
                <p className="font-semibold text-gray-700 mb-2" style={{ fontSize: '13px' }}>Color</p>
                <div className="flex gap-2">
                  {['Black & White', 'Color', 'Custom'].map(opt => (
                    <button key={opt}
                      onClick={() => setColorMode(opt === 'Black & White' ? 'B&W' : opt)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition"
                      style={{
                        border: (colorMode === (opt === 'Black & White' ? 'B&W' : opt)) ? '2px solid #111111' : '1.5px solid #e5e7eb',
                        backgroundColor: (colorMode === (opt === 'Black & White' ? 'B&W' : opt)) ? '#111111' : '#f9fafb',
                        color: (colorMode === (opt === 'Black & White' ? 'B&W' : opt)) ? '#ffffff' : '#374151',
                      }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sides */}
              <div className="mb-3">
                <p className="font-semibold text-gray-700 mb-2" style={{ fontSize: '13px' }}>Sides</p>
                <div className="flex gap-2">
                  {[{ label: 'Single Side', val: 'one-sided' }, { label: 'Both Sides', val: 'Two-sided' }].map(opt => (
                    <button key={opt.val}
                      onClick={() => setPrintSide(opt.val)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition"
                      style={{
                        border: printSide === opt.val ? '2px solid #111111' : '1.5px solid #e5e7eb',
                        backgroundColor: printSide === opt.val ? '#111111' : '#f9fafb',
                        color: printSide === opt.val ? '#ffffff' : '#374151',
                      }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page Size */}
              <div className="mb-3">
                <p className="font-semibold text-gray-700 mb-2" style={{ fontSize: '13px' }}>Page Size</p>
                <div className="flex gap-2">
                  {['A4', 'A3'].map(opt => (
                    <button key={opt}
                      onClick={() => setPageSize(opt)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition"
                      style={{
                        border: pageSize === opt ? '2px solid #111111' : '1.5px solid #e5e7eb',
                        backgroundColor: pageSize === opt ? '#111111' : '#f9fafb',
                        color: pageSize === opt ? '#ffffff' : '#374151',
                      }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Copies — below Page Size */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-3"
                style={{ border: '1px solid #e5e7eb', backgroundColor: '#fafafa' }}>
                <span className="font-semibold text-gray-800" style={{ fontSize: '14px' }}>Number of Copies</span>
                <Counter value={copies} onChange={setCopies} />
              </div>

              {/* Add-ons */}
              <div className="mb-3 rounded-xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
                {/* Semi-Log Graph Sheets */}
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <span className="text-sm font-medium text-gray-700">
                    Semi-Log Graph Sheets <span style={{ color: '#9ca3af' }}>(+ ₹{pricingConfig.graphSheetPrice}.00)</span>
                  </span>
                  <button
                    onClick={() => setSemiLog(s => s + 1)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white transition hover:bg-gray-700"
                    style={{ backgroundColor: '#111111' }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
                {/* Linear Graph Sheets */}
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium text-gray-700">
                    Linear Graphs <span style={{ color: '#9ca3af' }}>(+ ₹{pricingConfig.graphSheetPrice}.00)</span>
                  </span>
                  <button
                    onClick={() => setLinearSheets(s => s + 1)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white transition hover:bg-gray-700"
                    style={{ backgroundColor: '#111111' }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Show counts if any add-ons selected */}
              {(semiLog > 0 || linearSheets > 0) && (
                <div className="flex gap-2 mb-3">
                  {semiLog > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      <span className="text-xs font-semibold" style={{ color: '#166534' }}>Semi-Log: {semiLog}</span>
                      <button onClick={() => setSemiLog(0)} className="text-xs" style={{ color: '#ef4444' }}>✕</button>
                    </div>
                  )}
                  {linearSheets > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      <span className="text-xs font-semibold" style={{ color: '#166534' }}>Linear: {linearSheets}</span>
                      <button onClick={() => setLinearSheets(0)} className="text-xs" style={{ color: '#ef4444' }}>✕</button>
                    </div>
                  )}
                </div>
              )}

              {/* Cover Page */}
              <div className="mb-3">
                <p className="font-semibold text-gray-700 mb-2" style={{ fontSize: '13px' }}>Cover Page</p>
                <div className="flex gap-2 flex-wrap">
                  {['None', 'Transparent', 'Colored', 'Leather-finish'].map(opt => (
                    <button key={opt}
                      onClick={() => setCoverPage(opt)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold transition"
                      style={{
                        border: coverPage === opt ? '2px solid #111111' : '1.5px solid #e5e7eb',
                        backgroundColor: coverPage === opt ? '#111111' : '#f9fafb',
                        color: coverPage === opt ? '#ffffff' : '#374151',
                      }}>
                      {opt}{opt !== 'None' ? ` (+₹${pricingConfig.coverPagePrice[opt as keyof typeof pricingConfig.coverPagePrice]})` : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && <p className="text-sm font-medium mb-2 text-center" style={{ color: '#ef4444' }}>{error}</p>}

              {/* Price + Add to Cart */}
              <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid #f3f4f6' }}>
                <span className="font-bold text-gray-900" style={{ fontSize: '20px' }}>
                  ₹{totalPrice.toFixed(2)}
                </span>
                <button
                  onClick={handleAddToCart}
                  disabled={loading}
                  className="px-8 py-3 font-bold rounded-full transition disabled:opacity-60 group"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#111111',
                    border: '2px solid #111111',
                    fontSize: '14px',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#111111'; (e.currentTarget as HTMLButtonElement).style.color = '#ffffff'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ffffff'; (e.currentTarget as HTMLButtonElement).style.color = '#111111'; }}
                >
                  {loading ? 'Saving...' : 'Add to Cart'}
                </button>
              </div>

              {/* Continue to Pay */}
              <button
                onClick={handleContinueToPay}
                disabled={loading}
                className="w-full mt-3 flex items-center justify-center gap-2 py-3 text-white font-bold rounded-full transition disabled:opacity-60 hover:bg-gray-700"
                style={{ backgroundColor: '#111111', fontSize: '14px' }}>
                {loading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <>
                    Continue to Pay
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PrintConfigPage;




