import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface TemplateConfig {
  variant: any;
  template: any;
}

interface TemplateConfigLoaderProps {
  variantId: string;
  onLoaded: (config: TemplateConfig) => void;
}

const TemplateConfigLoader: React.FC<TemplateConfigLoaderProps> = ({ variantId, onLoaded }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!variantId) return;
    setLoading(true);
    axios.get(`/api/designs/template-config/${variantId}`)
      .then(res => {
        onLoaded(res.data.data);
      })
      .catch(() => setError('Failed to load template config'))
      .finally(() => setLoading(false));
  }, [variantId, onLoaded]);

  if (loading) return <div>Loading template config...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  return null;
};

export default TemplateConfigLoader;
