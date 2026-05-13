/**
 * Uploads an image file to the backend gateway and returns the public URL.
 * Endpoint: POST /api/admin/catalog/uploads/images
 *
 * @param file   - The File object to upload
 * @param folder - Storage folder hint, e.g. 'categories' | 'products'
 */
export async function uploadImage(file: File, folder: string = 'general'): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('folder', folder);

  const token = localStorage.getItem('admin_token');
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

  const response = await fetch(`${API_BASE_URL}/admin/catalog/uploads/images`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.message || `Upload failed with status ${response.status}`);
  }

  const data = await response.json();

  const imageUrl: string =
    data?.data?.url ||
    data?.data?.file?.url ||
    data?.data?.files?.[0]?.url ||
    data?.data?.urls?.[0] ||
    data?.url;

  if (!imageUrl) {
    throw new Error('No image URL returned from server');
  }

  // If relative path, prepend product service base URL
  if (imageUrl.startsWith('http')) return imageUrl;
  const productBase = import.meta.env.VITE_PRODUCT_SERVICE_URL || 'http://localhost:4003';
  return `${productBase}${imageUrl}`;
}
