import { apiRequest } from "./api";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PortalNotification {
  _id: string;
  userId: string;
  audienceRoles: string[];
  type: "email" | "sms" | "push" | "in_app";
  title: string;
  message: string;
  category: "orders" | "rewards" | "system" | "support" | "account" | "promotions" | string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  actionUrl?: string;
  status: "pending" | "sent" | "failed";
  createdAt: string;
  updatedAt: string;
}

export interface NotificationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotificationListResponse {
  notifications: PortalNotification[];
  meta: NotificationMeta;
}

export interface NotificationSummary {
  unread_count: number;
  category_counts: Record<string, number>;
  recent_notifications: Pick<PortalNotification, "_id" | "title" | "message" | "category" | "isRead" | "createdAt">[];
}

export interface NotificationQueryParams {
  isRead?: boolean;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ── Service ───────────────────────────────────────────────────────────────────
export const notificationService = {
  // GET /api/notifications — paginated list with filters
  getList(params: NotificationQueryParams = {}) {
    const q = new URLSearchParams();
    if (params.isRead !== undefined) q.set("isRead", String(params.isRead));
    if (params.category) q.set("category", params.category);
    if (params.search) q.set("search", params.search);
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return apiRequest<{ success: boolean; data: NotificationListResponse }>(
      `/notifications${qs ? `?${qs}` : ""}`
    );
  },

  // GET /api/notifications/summary — unread count + category breakdown
  getSummary() {
    return apiRequest<{ success: boolean; data: NotificationSummary }>(
      "/notifications/summary"
    );
  },

  // PATCH /api/notifications/:id/read — mark single as read
  markRead(id: string) {
    return apiRequest<{ success: boolean; message: string; data: Partial<PortalNotification> }>(
      `/notifications/${id}/read`,
      { method: "PATCH" }
    );
  },

  // PATCH /api/notifications/read-all — mark all as read
  markAllRead() {
    return apiRequest<{ success: boolean; message: string; data: null }>(
      "/notifications/read-all",
      { method: "PATCH" }
    );
  },
};
