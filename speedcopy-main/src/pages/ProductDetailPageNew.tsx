import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import productService from '../services/product.service';
import orderService from '../services/order.service';
import { normalizeImageList } from '../utils/image.utils';

type ProductVariant = {
  id?: string;
  size?: string;
  size_label?: string;
  paper_type?: string;
  stock?: number;
  additional_price?: number;
};

type ProductRecord = {
  _id?: string;
  id?: string;
  name?: string;
  description?: string;
  images?: string[];
  thumbnail?: string;
  image?: string;
  imageUrl?: string;
  basePrice?: number;
  discountedPrice?: number;
  mrp?: number;
  sale_price?: number;
  stock?: number;
  in_stock?: boolean;
  variants?: ProductVariant[];
  rating?: number;
  reviewCount?: number;
};

const ProductDetailPageNew: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const requestedFlow = searchParams.get('flow') || 'shopping';

  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImg, setActiveImg] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [cartLoading, setCartLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    void fetchProduct();
  }, [id, requestedFlow]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError('');
      const response = requestedFlow === 'gifting'
        ? await productService.getGiftingProductById(id!)
        : requestedFlow === 'shopping'
          ? await productService.getShoppingProductById(id!)
          : await productService.getProductById(id!);
      const payload = (response?.data || response) as ProductRecord;
      setProduct(payload || null);
      setActiveImg(0);
      setSelectedVariantIndex(0);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const normalizedImages = [
    product?.imageUrl,
    product?.thumbnail,
    product?.image,
    ...(Array.isArray(product?.images) ? product!.images : []),
  ].filter(Boolean) as string[];

  const images = normalizedImages.length ? normalizeImageList(normalizedImages) : [
    'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=900&q=80',
  ];

  const variants = Array.isArray(product?.variants) ? product!.variants : [];
  const selectedVariant = variants[selectedVariantIndex] || null;

  const salePrice = product?.sale_price ?? product?.discountedPrice ?? product?.basePrice ?? 0;
  const mrp = product?.mrp ?? product?.basePrice ?? salePrice;
  const unitPrice = salePrice + (selectedVariant?.additional_price || 0);
  const productName = product?.name || 'Product';
  const description = product?.description?.trim() || 'Available in various sizes and page counts to suit all study and work needs.';
  const rating = product?.rating || 0;
  const reviewCount = product?.reviewCount || 0;

  const addToCart = async () => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    if (!product?._id && !id) return;

    try {
      setCartLoading(true);

      const cartData: any = {
        productId: (product?._id || product?.id || id) as string,
        productName,
        flowType: requestedFlow,
        quantity: qty,
        variantId: selectedVariant?.id || String(selectedVariantIndex),
        thumbnail: images[0],
        unitPrice,
        totalPrice: unitPrice * qty,
      };

      await orderService.addToCart(cartData);
      alert('Added to cart!');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to add to cart.');
    } finally {
      setCartLoading(false);
    }
  };

  const nextImage = () => {
    setActiveImg((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setActiveImg((prev) => (prev - 1 + images.length) % images.length);
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="animate-pulse grid lg:grid-cols-2 gap-12">
            <div className="bg-gray-200 rounded-2xl" style={{ height: '500px' }} />
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="h-6 bg-gray-200 rounded w-1/3" />
              <div className="h-12 bg-gray-200 rounded-full mt-6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <p className="text-red-500 mb-4">{error || 'Product not found'}</p>
          <button onClick={() => navigate(-1)} className="px-6 py-3 bg-black text-white rounded-full font-bold">
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* LEFT — Image Carousel */}
          <div className="relative">
            {/* Main Image with Navigation Arrows */}
            <div className="relative bg-white rounded-2xl overflow-hidden" style={{ height: '500px' }}>
              <img
                src={images[activeImg]}
                alt={productName}
                className="w-full h-full object-contain p-8"
              />

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  {/* Left Arrow */}
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-gray-600 hover:bg-gray-700 rounded-full flex items-center justify-center transition shadow-lg"
                    style={{ opacity: 0.8 }}
                  >
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  {/* Right Arrow */}
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-gray-600 hover:bg-gray-700 rounded-full flex items-center justify-center transition shadow-lg"
                    style={{ opacity: 0.8 }}
                  >
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Star Rating */}
            <div className="flex items-center gap-1 mt-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className="w-4 h-4"
                  fill={star <= rating ? '#fbbf24' : 'none'}
                  viewBox="0 0 24 24"
                  stroke="#fbbf24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              ))}
              {reviewCount > 0 && (
                <span className="text-sm text-gray-500 ml-1">({reviewCount})</span>
              )}
            </div>

            {/* Delivery Information */}
            <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200 flex items-center gap-3">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-green-800">
                <strong>Delivery by 6 May, 12:31 PM, Wednesday</strong>
              </p>
            </div>

            {/* Product Description */}
            <div className="mt-6">
              <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
            </div>
          </div>

          {/* RIGHT — Product Details */}
          <div className="pt-2">
            {/* Product Title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-6">{productName}</h1>

            {/* Quantity Selector */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
              <div className="flex items-center gap-3 w-32">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 flex items-center justify-center bg-black text-white rounded hover:bg-gray-800 transition font-bold text-lg"
                >
                  −
                </button>
                <span className="flex-1 text-center text-lg font-semibold">{qty}</span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="w-8 h-8 flex items-center justify-center bg-black text-white rounded hover:bg-gray-800 transition font-bold text-lg"
                >
                  +
                </button>
              </div>
            </div>

            {/* Number of Pages Dropdown */}
            {variants.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Pages:</label>
                <select
                  value={selectedVariantIndex}
                  onChange={(e) => setSelectedVariantIndex(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  {variants.map((variant, index) => (
                    <option key={index} value={index}>
                      {variant.size_label || variant.size || `Option ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Price */}
            <div className="mb-6">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold text-gray-900">₹{unitPrice.toFixed(2)}</span>
                {mrp > unitPrice && (
                  <span className="text-lg line-through text-gray-400">₹{mrp.toFixed(2)}</span>
                )}
              </div>
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={addToCart}
              disabled={cartLoading || !product?.in_stock}
              className="w-full py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cartLoading ? 'Adding...' : !product?.in_stock ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPageNew;
