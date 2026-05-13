const CDN_BASE_URL = 'https://cdn-202671058278.asia-east1.run.app';
const UPLOADS_BASE_URL = 'https://uploads-202671058278.asia-east1.run.app';
const GATEWAY_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'https://gateway-202671058278.asia-east1.run.app/api'
).replace(/\/api\/?$/, '');
const PUBLIC_UPLOADS_BASE_URL = GATEWAY_BASE_URL;
const UPLOAD_PROXY_HOSTS = new Set([
  'gateway-202671058278.asia-east1.run.app',
  'commerce-service-202671058278.asia-east1.run.app',
  'commerce-service-202671058278.asia-south2.run.app',
  'cdn-202671058278.asia-east1.run.app',
  'uploads-202671058278.asia-east1.run.app',
]);

type ImageLike =
  | string
  | null
  | undefined
  | {
      url?: string | null;
      image?: string | null;
      imageUrl?: string | null;
      thumbnail?: string | null;
      originalUrl?: string | null;
      processedUrl?: string | null;
      previewImage?: string | null;
      path?: string | null;
    };

export function getImageSource(value: ImageLike): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return (
    value.url ||
    value.imageUrl ||
    value.image ||
    value.thumbnail ||
    value.processedUrl ||
    value.originalUrl ||
    value.previewImage ||
    value.path ||
    ''
  );
}

export function normalizeImageUrl(url: ImageLike): string {
  const raw = getImageSource(url);
  if (!raw) return '';

  const trimmed = raw.trim().replace(/^['"]|['"]$/g, '');
  if (!trimmed) return '';
  
  if (isBrowserLocalUrl(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  
  // Keep full URLs as-is (gateway, external images like unsplash, etc.)
  if (isExternalUrl(trimmed)) {
    return trimmed;
  }

  const path = trimmed.replace(/\\/g, '/');
  if (path.startsWith('/uploads/') || path.startsWith('uploads/')) {
    return joinUrl(GATEWAY_BASE_URL, path);
  }
  
  return joinUrl(GATEWAY_BASE_URL, path);
}

export function resolveImageUrl(
  url?: ImageLike,
  fallback?: ImageLike
): string {
  const normalized = normalizeImageUrl(url || fallback);
  return normalized || '';
}

export function resolveThumbnail(
  images?: ImageLike[],
  thumbnail?: ImageLike,
  image?: ImageLike,
  imageUrl?: ImageLike
): string {
  return resolveImageUrl(
    imageUrl || thumbnail || image || images?.map(getImageSource).find(Boolean)
  );
}

export function getAlternateImageUrl(original: ImageLike, currentUrl?: string): string {
  const raw = getImageSource(original);
  if (!raw) return '';

  const path = extractUploadsPath(raw);
  if (!path) return '';

  const alternates = [
    joinUrl(GATEWAY_BASE_URL, path),
    joinUrl(CDN_BASE_URL, path),
    joinUrl(UPLOADS_BASE_URL, path),
  ];
  return alternates.find((url) => url !== currentUrl) || '';
}

export function normalizeImageList(values: ImageLike[]): string[] {
  return Array.from(
    new Set(values.map(normalizeImageUrl).filter(Boolean))
  );
}

export function getEditorBaseImage(template?: {
  assets?: {
    editorBaseImage?: string;
    overlayImage?: string;
    maskImage?: string;
    mockupSceneImage?: string;
  };
}): string {
  if (!template?.assets) return '';
  return resolveImageUrl(template.assets.editorBaseImage);
}

export function getOverlayImage(template?: {
  assets?: {
    overlayImage?: string;
  };
}): string {
  if (!template?.assets) return '';
  return resolveImageUrl(template.assets.overlayImage);
}

function isBrowserLocalUrl(url: string): boolean {
  return url.startsWith('data:') || url.startsWith('blob:');
}

function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || 
         url.startsWith('https://') || 
         url.startsWith('//');
}

function getUploadProxyUrl(url: string): string | null {
  if (!url.startsWith('http://') && !url.startsWith('https://')) return null;

  try {
    const parsed = new URL(url);
    if (parsed.hostname === new URL(GATEWAY_BASE_URL).hostname) return url;
    if (!UPLOAD_PROXY_HOSTS.has(parsed.hostname)) return null;

    const uploadPath = extractUploadsPath(parsed.pathname);
    if (!uploadPath) return null;

    return joinUrl(PUBLIC_UPLOADS_BASE_URL, uploadPath);
  } catch {
    return null;
  }
}

function extractUploadsPath(value: string): string {
  const normalized = value.trim().replace(/^['"]|['"]$/g, '').replace(/\\/g, '/');
  const uploadIndex = normalized.indexOf('/uploads/');
  if (uploadIndex !== -1) return normalized.slice(uploadIndex);
  if (normalized.startsWith('uploads/')) return `/${normalized}`;
  return '';
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export function getProductImageUrl(url: ImageLike): string {
  if (!url) return '';
  const normalized = normalizeImageUrl(url);
  return normalized || getPlaceholderImage();
}

export function getPlaceholderImage(): string {
  return 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&q=80';
}

export default {
  normalizeImageUrl,
  normalizeImageList,
  resolveImageUrl,
  resolveThumbnail,
  getAlternateImageUrl,
  getEditorBaseImage,
  getOverlayImage,
  getProductImageUrl,
  getPlaceholderImage,
};
