import { API_BASE_URL } from "../config/api";

const AUTH_TOKEN_KEY = "auth_token";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

let _redirecting = false;

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();

  const headers = new Headers(init.headers || {});

  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const fullUrl = `${API_BASE_URL}${path}`;
  console.log(`🌐 API Request: ${init.method || 'GET'} ${fullUrl}`);

  const response = await fetch(fullUrl, {
    ...init,
    headers,
  });

  const payload = await response.json().catch(() => null);

  console.log(`📡 API Response [${response.status}]:`, path, payload);

  if (!response.ok) {
    const message = payload?.message || `HTTP ${response.status}: ${response.statusText}`;
    console.error(`❌ API Error [${response.status}]:`, path, message);

    if (response.status === 401 && !_redirecting) {
      _redirecting = true;
      clearAuthToken();
      localStorage.removeItem("vendor_session");
      setTimeout(() => {
        window.location.href = "/login";
        _redirecting = false;
      }, 100);
    }

    throw new ApiError(message, response.status);
  }

  if (payload == null) {
    console.error("❌ Empty API Response:", path);
    throw new ApiError("Empty or invalid server response", response.status || 500);
  }

  return payload as T;
}
