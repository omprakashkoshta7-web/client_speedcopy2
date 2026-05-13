import apiClient from './api.service';
import { API_CONFIG } from '../config/api.config';

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  data: {
    phone: string;
    status: string;
    _testOtp?: string;
  };
  _testOtp?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      _id: string;
      name: string;
      email: string;
      phone?: string;
      role: string;
      isActive: boolean;
    };
    token: string;
  };
}

class AuthService {
  private persistAuth(response: AuthResponse) {
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
  }

  async sendPhoneOtp(phone: string): Promise<SendOtpResponse> {
    const response = await apiClient.post<SendOtpResponse>(
      API_CONFIG.ENDPOINTS.AUTH.SEND_PHONE_OTP,
      { phone }
    );

    return response.data;
  }

  async verifyPhoneOtp(phone: string, otp: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API_CONFIG.ENDPOINTS.AUTH.VERIFY_PHONE_OTP,
      { phone, otp }
    );

    this.persistAuth(response.data);
    return response.data;
  }

  // Legacy methods retained for compatibility. User app login should use phone OTP.
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API_CONFIG.ENDPOINTS.AUTH.REGISTER,
      data
    );

    this.persistAuth(response.data);
    return response.data;
  }

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API_CONFIG.ENDPOINTS.AUTH.LOGIN,
      data
    );

    this.persistAuth(response.data);
    return response.data;
  }

  async getMe() {
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.AUTH.ME);
    return response.data;
  }

  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = '/';
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }
}

export default new AuthService();
