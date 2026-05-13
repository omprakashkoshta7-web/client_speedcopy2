import api from './client';

type Res<T> = { success: boolean; data: T; message?: string };

async function getWithFallback<T>(primaryPath: string, fallbackPath: string, params?: Record<string, any>): Promise<T> {
  try {
    const { data } = await api.get<Res<T>>(primaryPath, params ? { params } : undefined);
    return data.data;
  } catch (error: any) {
    if (error?.response?.status !== 404) throw error;
    const { data } = await api.get<Res<T>>(fallbackPath, params ? { params } : undefined);
    return data.data;
  }
}

async function postWithFallback<T>(primaryPath: string, fallbackPath: string, body?: any, config?: any): Promise<T> {
  try {
    const { data } = await api.post<Res<T>>(primaryPath, body, config);
    return data.data;
  } catch (error: any) {
    if (error?.response?.status !== 404) throw error;
    const { data } = await api.post<Res<T>>(fallbackPath, body, config);
    return data.data;
  }
}

export interface BackendNotification {
  _id: string;
  userId: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
  title: string;
  message: string;
  category: 'orders' | 'rewards' | 'system' | 'support' | 'account' | 'promotions';
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface NotificationSummary {
  unread_count: number;
  category_counts: Record<string, number>;
  recent_notifications: BackendNotification[];
}

export interface BackendTicket {
  _id: string;
  userId: string;
  subject: string;
  description: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: string;
  replies: { authorId: string; authorRole: string; message: string; createdAt: string }[];
  createdAt: string;
  updatedAt?: string;
}

export interface TicketAttachment {
  _id?: string;
  url: string;
  name: string;
  mimeType?: string;
  size?: number;
}

function isRetriableAttachmentError(error: any): boolean {
  const status = error?.response?.status;
  return status === 404 || status === 405 || status === 501 || !status;
}

function inferAttachmentMimeType(fileUri: string): string {
  const lower = String(fileUri || '').toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

const TICKET_ATTACHMENT_PATHS = [
  '/api/tickets/uploads',
  '/api/notifications/tickets/uploads',
  '/api/notifications/tickets/attachments',
  '/api/notifications/tickets/upload',
];

export async function uploadTicketAttachment(fileUri: string): Promise<TicketAttachment> {
  const filename = fileUri.split('/').pop() || `ticket-${Date.now()}.jpg`;
  const mimeType = inferAttachmentMimeType(fileUri);
  let lastError: any;

  for (const path of TICKET_ATTACHMENT_PATHS) {
    const formData = new FormData();
    formData.append('attachments', {
      uri: fileUri,
      name: filename,
      type: mimeType,
    } as any);

    try {
      const { data } = await api.post<Res<any>>(path, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const payload = data?.data;
      const first =
        payload?.attachments?.[0]
        || payload?.attachmentUrl
        || payload?.attachment_url
        || payload?.attachment
        || payload?.file
        || payload?.files?.[0]
        || (Array.isArray(payload) ? payload[0] : null)
        || payload;

      if (!first) {
        throw new Error('Attachment upload returned no file metadata.');
      }

      if (typeof first === 'string') {
        return {
          url: first,
          name: filename,
          mimeType,
        };
      }

      return {
        _id: first._id || first.id || undefined,
        url: first.url || first.fileUrl || first.path || '',
        name: first.name || first.originalName || first.filename || filename,
        mimeType: first.mimeType || first.mimetype || mimeType,
        size: first.size || first.fileSize,
      };
    } catch (error: any) {
      lastError = error;
      if (!isRetriableAttachmentError(error)) break;
    }
  }

  throw lastError || new Error('Attachment upload is unavailable right now.');
}

export async function getNotifications(params?: { isRead?: string; category?: string; page?: number; limit?: number }) {
  const { data } = await api.get<Res<{ notifications: BackendNotification[]; meta: any }>>('/api/notifications', { params });
  return data.data;
}

export async function getNotificationSummary(): Promise<NotificationSummary> {
  const { data } = await api.get<Res<NotificationSummary>>('/api/notifications/summary');
  return data.data;
}

export async function markAllRead(): Promise<void> {
  await api.patch('/api/notifications/read-all');
}

export async function markRead(id: string): Promise<void> {
  await api.patch(`/api/notifications/${id}/read`);
}

export async function createTicket(body: {
  subject: string;
  description: string;
  category?: string;
  priority?: string;
  orderId?: string;
  attachmentUrl?: string;
  attachments?: TicketAttachment[];
}): Promise<BackendTicket> {
  const attachmentUrls = [
    ...(body.attachmentUrl ? [body.attachmentUrl] : []),
    ...((body.attachments || []).map((item) => item?.url).filter(Boolean) as string[]),
  ];

  return postWithFallback<BackendTicket>(
    '/api/tickets',
    '/api/notifications/tickets',
    {
      subject: body.subject,
      description: body.description,
      category: body.category,
      priority: body.priority,
      orderId: body.orderId,
      attachments: Array.from(new Set(attachmentUrls)),
    },
  );
}

export async function getTickets(params?: { status?: string; page?: number; limit?: number }) {
  return getWithFallback<{ tickets: BackendTicket[]; meta: any }>(
    '/api/tickets',
    '/api/notifications/tickets',
    params,
  );
}

export async function getTicket(id: string): Promise<BackendTicket> {
  return getWithFallback<BackendTicket>(
    `/api/tickets/${id}`,
    `/api/notifications/tickets/${id}`,
  );
}

export async function replyToTicket(id: string, message: string): Promise<BackendTicket> {
  return postWithFallback<BackendTicket>(
    `/api/tickets/${id}/reply`,
    `/api/notifications/tickets/${id}/reply`,
    { message },
  );
}

export async function getHelpCenter() {
  const { data } = await api.get<Res<any>>('/api/notifications/help-center');
  return data.data;
}
