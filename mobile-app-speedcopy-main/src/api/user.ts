import api, { API_BASE_URL, getToken } from './client';

export interface UserProfile {
  _id: string;
  userId: string;
  name: string;
  phone: string;
  email?: string;
  avatar: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  preferences: {
    notifications: boolean;
    newsletter: boolean;
    push?: boolean;
    whatsapp?: boolean;
    criticalAlerts?: boolean;
    quietHours?: { start: string; end: string };
  };
  privacyRequests?: {
    dataExportStatus?: string;
    accountDeletionStatus?: string;
  };
}

export interface UserAddress {
  _id: string;
  userId: string;
  label: 'Home' | 'Office' | 'Other';
  fullName: string;
  phone: string;
  houseNo?: string;
  area?: string;
  landmark?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
  location?: { lat: number; lng: number };
}

type Res<T> = { success: boolean; data: T; message?: string };
const AVATAR_UPLOAD_TIMEOUT_MS = 60000;

export interface PrivacyStatus {
  dataExportStatus?: string;
  accountDeletionStatus?: string;
  deleteBlockedWhenOrdersActive?: boolean;
}

export interface WishlistEntry {
  _id?: string;
  productId: string;
  createdAt?: string;
}

export async function getProfile(): Promise<UserProfile> {
  const { data } = await api.get<Res<UserProfile>>('/api/users/profile');
  return data.data;
}

export async function updateProfile(body: Partial<Pick<UserProfile, 'name' | 'phone' | 'email' | 'avatar' | 'dateOfBirth' | 'gender'>>): Promise<UserProfile> {
  const { data } = await api.put<Res<UserProfile>>('/api/users/profile', body);
  return data.data;
}

export async function getAddresses(): Promise<UserAddress[]> {
  const { data } = await api.get<Res<UserAddress[]>>('/api/users/addresses');
  return data.data;
}

export async function addAddress(body: Omit<UserAddress, '_id' | 'userId' | 'country'>): Promise<UserAddress> {
  const { data } = await api.post<Res<UserAddress>>('/api/users/addresses', body);
  return data.data;
}

export async function updateAddress(id: string, body: Partial<UserAddress>): Promise<UserAddress> {
  const { data } = await api.put<Res<UserAddress>>(`/api/users/addresses/${id}`, body);
  return data.data;
}

export async function deleteAddress(id: string): Promise<void> {
  await api.delete(`/api/users/addresses/${id}`);
}

// ─── Notification Preferences ───────────────────────
export interface NotificationPreferences {
  push: boolean;
  whatsapp: boolean;
  criticalAlerts?: boolean;
  quietHours?: { start: string; end: string };
}

export async function updateNotificationPreferences(prefs: NotificationPreferences): Promise<UserProfile> {
  const { data } = await api.patch<Res<UserProfile>>('/api/users/profile/notifications', prefs);
  return data.data;
}

// ─── Account Management ─────────────────────────────
export async function requestDataExport(): Promise<void> {
  await api.post('/api/users/profile/data-export-request');
}

export async function getPrivacyStatus(): Promise<PrivacyStatus> {
  const { data } = await api.get<Res<PrivacyStatus>>('/api/users/profile/privacy-status');
  return data.data;
}

export async function getDataExport(): Promise<any> {
  const response = await api.get<any>('/api/users/profile/data-export');
  return response?.data?.data ?? response?.data;
}

export async function requestAccountDeletion(reason?: string): Promise<{ accountDeletionStatus: string }> {
  const { data } = await api.post<Res<{ accountDeletionStatus: string }>>('/api/users/profile/account-deletion-request', { reason });
  return data.data;
}

export async function confirmAccountDeletion(): Promise<{ accountDeletionStatus: string }> {
  const { data } = await api.post<Res<{ accountDeletionStatus: string }>>('/api/users/profile/account-deletion-confirm');
  return data.data;
}

export async function getWishlist(): Promise<WishlistEntry[]> {
  const { data } = await api.get<Res<WishlistEntry[]>>('/api/users/wishlist');
  return data.data;
}

export async function addWishlistItem(productId: string): Promise<WishlistEntry[]> {
  const { data } = await api.post<Res<WishlistEntry[]>>('/api/users/wishlist', { productId });
  return data.data;
}

export async function removeWishlistItem(productId: string): Promise<void> {
  await api.delete(`/api/users/wishlist/${productId}`);
}

// ─── Avatar Upload ──────────────────────────────────
function inferAvatarMimeType(fileUri: string): string {
  const lower = String(fileUri || '').toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

function xhrUploadAvatar(
  url: string,
  formData: FormData,
  token: string | null,
  timeoutMs: number,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.timeout = timeoutMs;

    xhr.onload = () => {
      let parsed: any = {};
      try {
        parsed = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        // noop
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(parsed);
      } else {
        const msg = parsed?.message || `Avatar upload failed (${xhr.status})`;
        const err: any = new Error(msg);
        err.status = xhr.status;
        err.serverMessage = msg;
        reject(err);
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during avatar upload. Please try again.'));
    };

    xhr.ontimeout = () => {
      const err: any = new Error('Avatar upload timed out. Please try again.');
      err.isTimeout = true;
      reject(err);
    };

    xhr.send(formData);
  });
}

export async function uploadAvatar(fileUri: string): Promise<{ avatar: string }> {
  const token = await getToken();
  const formData = new FormData();
  const filename = (fileUri.split('/').pop() || 'avatar.jpg')
    .replace(/[^\w.\-]/g, '_')
    .replace(/_+/g, '_');
  const type = inferAvatarMimeType(fileUri);

  formData.append('avatar', {
    uri: fileUri,
    name: filename,
    type,
  } as any);

  const response = await xhrUploadAvatar(
    `${API_BASE_URL}/api/users/profile/avatar`,
    formData,
    token,
    AVATAR_UPLOAD_TIMEOUT_MS,
  );
  const payload = response?.data || response;
  return {
    avatar:
      payload?.avatar
      || payload?.url
      || payload?.image
      || payload?.avatarUrl
      || '',
  };
}
