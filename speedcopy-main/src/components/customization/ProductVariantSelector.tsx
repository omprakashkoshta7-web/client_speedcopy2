import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Variant {
  id: string;
  name: string;
  sku: string;
  price: number;
  attributes: Record<string, string>;
}

interface ProductVariantSelectorProps {
  onSelect: (variant: Variant) => void;
}

const ProductVariantSelector: React.FC<ProductVariantSelectorProps> = ({ onSelect }) => {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    axios.get('/api/products/variants')
      .then(res => setVariants(res.data.data || []))
      .catch(() => setError('Failed to load variants'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading variants...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <h2 className="font-bold mb-2">Select Product Variant</h2>
      <ul className="space-y-2">
        {variants.map(variant => (
          <li key={variant.id} className="border p-2 rounded flex justify-between items-center">
            <div>
              <div className="font-semibold">{variant.name}</div>
              <div className="text-xs text-gray-500">SKU: {variant.sku}</div>
              <div className="text-xs text-gray-500">Price: ₹{variant.price}</div>
            </div>
            <button
              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              onClick={() => onSelect(variant)}
            >
              Customize Now
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProductVariantSelector;
