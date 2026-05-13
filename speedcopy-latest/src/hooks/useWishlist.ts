import { useState, useEffect, useCallback } from 'react';
import wishlistService from '../services/wishlist.service';
import { useAuth } from '../context/AuthContext';

export function useWishlist() {
  const { isAuthenticated } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      // Load from localStorage even when not authenticated
      try {
        const response = await wishlistService.getWishlist();
        setWishlistIds(response.data.map((item) => item.productId));
      } catch (err) {
        console.error('Wishlist fetch error:', err);
      }
      return;
    }
    
    try {
      setLoading(true);
      const response = await wishlistService.getWishlist();
      setWishlistIds(response.data.map((item) => item.productId));
      console.log('✅ Wishlist loaded:', response.data.length, 'items');
    } catch (err) {
      console.error('Wishlist fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const toggleWishlist = useCallback(
    async (productId: string, productType: 'gifting' | 'shopping' | 'printing' | 'business-printing' = 'shopping') => {
      if (!isAuthenticated) {
        console.log('⚠️ User not authenticated, using localStorage');
      }
      
      try {
        const isInWishlist = wishlistIds.includes(productId);
        
        // Optimistic update
        setWishlistIds((prev) =>
          isInWishlist ? prev.filter((id) => id !== productId) : [...prev, productId]
        );
        
        // Make API call with fallback to localStorage
        if (isInWishlist) {
          const response = await wishlistService.removeFromWishlist(productId);
          console.log('✅ Removed from wishlist:', response.message);
          setWishlistIds(response.data.map((item) => item.productId));
        } else {
          const response = await wishlistService.addToWishlist(productId, productType);
          console.log('✅ Added to wishlist:', response.message);
          setWishlistIds(response.data.map((item) => item.productId));
        }
      } catch (err) {
        console.error('Wishlist toggle error:', err);
        // Revert on error
        setWishlistIds((prev) =>
          wishlistIds.includes(productId) 
            ? [...prev, productId] 
            : prev.filter((id) => id !== productId)
        );
      }
    },
    [isAuthenticated, wishlistIds]
  );

  const isWishlisted = useCallback(
    (productId: string) => wishlistIds.includes(productId),
    [wishlistIds]
  );

  return { wishlistIds, loading, toggleWishlist, isWishlisted, refetch: fetchWishlist };
}
