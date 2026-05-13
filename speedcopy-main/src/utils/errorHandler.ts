/**
 * Centralized Error Handler Utility
 * Provides consistent error message extraction across the application
 */

export interface ApiError {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
    status?: number;
  };
  message?: string;
}

/**
 * Extract error message from various error formats
 */
export function getErrorMessage(error: unknown): string {
  // Handle Error instances
  if (error instanceof Error) {
    return error.message;
  }

  // Handle API errors
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiError;
    
    // Try to get message from response
    if (apiError.response?.data?.message) {
      return apiError.response.data.message;
    }
    
    if (apiError.response?.data?.error) {
      return apiError.response.data.error;
    }
    
    // Fallback to error message
    if (apiError.message) {
      return apiError.message;
    }
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

/**
 * Get HTTP status code from error
 */
export function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiError;
    return apiError.response?.status;
  }
  return undefined;
}

/**
 * Check if error is a specific HTTP status
 */
export function isErrorStatus(error: unknown, status: number): boolean {
  return getErrorStatus(error) === status;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.toLowerCase().includes('network');
  }
  return false;
}

/**
 * Log error in development only
 */
export function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
  }
}

/**
 * Log info in development only
 */
export function logInfo(context: string, message: string, data?: unknown): void {
  if (import.meta.env.DEV) {
    console.log(`[${context}] ${message}`, data || '');
  }
}
