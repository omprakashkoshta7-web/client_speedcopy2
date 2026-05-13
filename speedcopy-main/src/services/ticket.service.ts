import apiClient from './api.service';
import { API_CONFIG } from '../config/api.config';

// Backend ticket model fields - exact match
export interface TicketReply {
  _id?: string;
  authorId: string;
  authorRole: 'user' | 'vendor' | 'admin' | 'staff';
  message: string;
  attachments: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Ticket {
  _id: string;
  userId: string;
  orderId?: string;
  subject: string;
  description: string;
  category: 'order_issue' | 'payment_issue' | 'delivery_issue' | 'product_issue' | 'account_issue' | 'other';
  status: TicketStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  createdForRole: 'user' | 'vendor' | 'delivery_partner' | 'staff' | 'admin';
  visibilityScope: 'customer' | 'vendor_internal' | 'delivery_internal' | 'ops_internal';
  replies: TicketReply[];
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketData {
  subject: string;
  description: string;
  category: 'order_issue' | 'payment_issue' | 'delivery_issue' | 'product_issue' | 'account_issue' | 'other';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  orderId?: string;
  attachments?: string[];
}

export interface GetTicketsParams {
  status?: TicketStatus;
  page?: number;
  limit?: number;
}

export interface TicketSummary {
  status_counts: {
    open?: number;
    in_progress?: number;
    resolved?: number;
    closed?: number;
  };
  recent_tickets: Ticket[];
}

export interface HelpCenterCategory {
  id: string;
  title: string;
  description: string;
  cta_text: string;
}

export interface HelpCenter {
  faq_categories: HelpCenterCategory[];
  ticket_issue_types: string[];
  priority_options: string[];
  recent_tickets: Ticket[];
}

class TicketService {
  async uploadAttachments(files: File[]) {
    const formData = new FormData();
    files.forEach((file) => formData.append('attachments', file));

    const response = await apiClient.post(API_CONFIG.ENDPOINTS.TICKETS.UPLOADS, formData, {
      headers: {
        'Content-Type': undefined as unknown as string,
      },
    });
    return response.data;
  }

  // Create a new support ticket
  async createTicket(data: CreateTicketData) {
    const response = await apiClient.post(API_CONFIG.ENDPOINTS.TICKETS.CREATE, data);
    return response.data;
  }

  // Get user's tickets (customers see only their own, admin/staff see all)
  async getMyTickets(params?: GetTicketsParams) {
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.TICKETS.GET_ALL, { params });
    return response.data;
  }

  // Get ticket summary (status counts, recent tickets)
  async getTicketSummary() {
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.TICKETS.GET_SUMMARY);
    return response.data;
  }

  // Get help center articles and FAQs
  async getHelpCenter() {
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.TICKETS.GET_HELP_CENTER);
    return response.data;
  }

  // Get ticket by ID
  async getTicketById(id: string) {
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.TICKETS.GET_BY_ID(id));
    return response.data;
  }

  // Reply to a ticket
  async replyToTicket(id: string, message: string, attachments?: string[]) {
    const response = await apiClient.post(API_CONFIG.ENDPOINTS.TICKETS.REPLY(id), {
      message,
      attachments: attachments || [],
    });
    return response.data;
  }

  // Assign ticket to a staff member (admin/staff only)
  async assignTicket(id: string, assignedTo: string) {
    const response = await apiClient.patch(API_CONFIG.ENDPOINTS.TICKETS.ASSIGN(id), {
      assignedTo,
    });
    return response.data;
  }

  // Update ticket status (admin/staff only)
  async updateTicketStatus(id: string, status: TicketStatus) {
    const response = await apiClient.patch(API_CONFIG.ENDPOINTS.TICKETS.UPDATE_STATUS(id), {
      status,
    });
    return response.data;
  }

  // Escalate a ticket (admin/staff only)
  async escalateTicket(id: string, message?: string) {
    const response = await apiClient.post(API_CONFIG.ENDPOINTS.TICKETS.ESCALATE(id), {
      message: message || 'Ticket escalated internally',
    });
    return response.data;
  }
}

export default new TicketService();
