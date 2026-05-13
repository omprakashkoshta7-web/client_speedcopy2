import React from 'react';
import { Link } from 'react-router-dom';
import { type Product } from '../services/product.service';
import { resolveThumbnail, getPlaceholderImage } from '../utils/image.utils';
import { 
  calculateDiscountInfo, 
  formatPriceDisplay, 
  getDealCountdown,
  getDiscountBadgeClasses,
  getPriceComparisonText,
  hasSpecialDeal
} from '../utils/discount.utils';

interface ProductCardProps {
  product: Product;
  showAddToCart?: boolean;
  onAddToCart?: (product: Product) => void;
  className?: string;
  imageClassName?: string;
  showQuickView?: boolean;
  onQuickView?: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  showAddToCart = true,
  onAddToCart,
  className = '',
  imageClassName = '',
  showQuickView = false,
  onQuickView
}) => {
  const discountInfo = calculateDiscountInfo(product);
  const priceDisplay = formatPriceDisplay(discountInfo);
  const dealCountdown = getDealCountdown(product);
  const priceComparisonText = getPriceComparisonText(product);
  const isSpecialDeal = hasSpecialDeal(product);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product);
    }
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onQuickView) {
      onQuickView(product);
    }
  };

  // Determine product link based on flowType
  const getProductLink = () => {
    switch (product.flowType) {
      case 'gifting':
        return `/gifting/${product.slug || product._id}`;
      case 'shopping':
        return `/shopping/${product.slug || product._id}`;
      case 'printing':
        return `/printing/${product.slug || product._id}`;
      default:
        return `/products/${product.slug || product._id}`;
    }
  };

  return (
    <div className={`group relative bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden ${className}`}>
      <Link to={getProductLink()} className="block">
        {/* Product Image Container */}
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          {/* Discount Badge */}
          {discountInfo.badgeText && (
            <div className={getDiscountBadgeClasses(discountInfo.badgeColor)}>
              {discountInfo.badgeText}
            </div>
          )}

          {/* Deal of the Day Special Badge */}
          {product.is_deal_of_day && (
            <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-orange-500 text-white px-2 py-1 text-xs font-bold rounded-md shadow-lg animate-pulse">
              🔥 DEAL
            </div>
          )}

          {/* Product Image */}
          <img
            src={resolveThumbnail(product.images, product.thumbnail, product.image, product.imageUrl)}
            alt={product.name}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${imageClassName}`}
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = getPlaceholderImage();
            }}
          />

          {/* Out of Stock Overlay */}
          {!product.in_stock && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="text-white font-bold text-lg">Out of Stock</span>
            </div>
          )}

          {/* Quick Actions Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex gap-2">
              {showQuickView && (
                <button
                  onClick={handleQuickView}
                  className="bg-white text-gray-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  Quick View
                </button>
              )}
              {showAddToCart && product.in_stock && (
                <button
                  onClick={handleAddToCart}
                  className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Add to Cart
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Product Info */}
        <div className="p-4">
          {/* Product Name */}
          <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {product.name}
          </h3>

          {/* Brand */}
          {product.brand && (
            <p className="text-sm text-gray-500 mb-2">{product.brand}</p>
          )}

          {/* Price Section */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              {/* Current Price */}
              <span className="text-lg font-bold text-gray-900">
                {priceDisplay.currentPrice}
              </span>

              {/* Original Price (Strikethrough) */}
              {priceDisplay.showStrikethrough && priceDisplay.originalPrice && (
                <span className="text-sm text-gray-500 line-through">
                  {priceDisplay.originalPrice}
                </span>
              )}

              {/* Discount Percentage */}
              {discountInfo.hasDiscount && (
                <span className="text-sm font-medium text-green-600">
                  ({discountInfo.discountPct}% off)
                </span>
              )}
            </div>

            {/* Savings Amount */}
            {priceDisplay.formattedSavings && (
              <p className="text-sm text-green-600 font-medium">
                {priceDisplay.formattedSavings}
              </p>
            )}

            {/* Price Comparison Text */}
            {priceComparisonText && (
              <p className="text-xs text-orange-600 font-medium">
                {priceComparisonText}
              </p>
            )}
          </div>

          {/* Deal Countdown */}
          {dealCountdown && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 font-medium text-center">
                ⏰ {dealCountdown}
              </p>
            </div>
          )}

          {/* Special Deal Indicator */}
          {isSpecialDeal && !dealCountdown && (
            <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-sm text-orange-600 font-medium text-center">
                🎉 Special Offer
              </p>
            </div>
          )}

          {/* Product Highlights */}
          {product.highlights && product.highlights.length > 0 && (
            <div className="mb-3">
              <ul className="text-xs text-gray-600 space-y-1">
                {product.highlights.slice(0, 2).map((highlight, index) => (
                  <li key={index} className="flex items-center">
                    <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Free Shipping Badge */}
          {product.free_shipping && (
            <div className="mb-3">
              <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                🚚 Free Shipping
              </span>
            </div>
          )}

          {/* Bulk Pricing Info */}
          {product.bulk_price && product.min_bulk_qty && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-600">
                Bulk: ₹{product.bulk_price} each (Min {product.min_bulk_qty} qty)
              </p>
            </div>
          )}

          {/* Stock Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {product.in_stock ? (
                <span className="flex items-center text-xs text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                  In Stock
                </span>
              ) : (
                <span className="flex items-center text-xs text-red-600">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                  Out of Stock
                </span>
              )}
            </div>

            {/* Product Type Badge */}
            <span className="text-xs text-gray-500 capitalize bg-gray-100 px-2 py-1 rounded-full">
              {product.flowType}
            </span>
          </div>
        </div>
      </Link>

      {/* Bottom Action Bar (Outside Link) */}
      {showAddToCart && (
        <div className="p-4 pt-0">
          <button
            onClick={handleAddToCart}
            disabled={!product.in_stock}
            className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              product.in_stock
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {product.in_stock ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductCard;
