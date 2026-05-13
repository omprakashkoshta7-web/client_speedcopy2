import apiClient from './api.service';
import { API_CONFIG } from '../config/api.config';

// Backend notification model fields
export interface Notification {
  _id: string;
  userId?: string;
  audienceRoles?: string[];
  type: 'email' | 'sms' | 'push' | 'in_app';
  title: string;
  message: string;
  category: 'orders' | 'rewards' | 'system' | 'support' | 'account' | 'promotions';
  isRead: boolean;
  metadata?: any;
  actionUrl?: string;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSummary {
  unreadCount: number;
  totalCount: number;
  byCategory?: Record<string, number>;
}

export interface GetNotificationsParams {
  isRead?: boolean;
  page?: number;
  limit?: number;
}

class NotificationService {
  // Get all notifications with pagination and filters
  async getNotifications(params?: GetNotificationsParams) {
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.NOTIFICATIONS.GET_ALL, { params });
    return response.data;
  }

  // Get notifications summary (unread count, etc)
  async getSummary() {
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.NOTIFICATIONS.GET_SUMMARY);
    return response.data;
  }

  // Mark single notification as read
  async markAsRead(id: string) {
    const response = await apiClient.patch(API_CONFIG.ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
    return response.data;
  }

  // Mark all notifications as read
  async markAllAsRead() {
    const response = await apiClient.patch(API_CONFIG.ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
    return response.data;
  }
}

export default new NotificationService();
