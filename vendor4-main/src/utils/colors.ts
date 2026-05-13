// SpeedCopy Vendor Portal - Consistent Color Scheme
export const COLORS = {
  // Primary Brand Colors
  primary: "#2d3f55",
  primaryHover: "#3a5068",
  primaryLight: "#4a6078",
  
  // Accent Colors
  accent: "#6d5dfc",
  accentLight: "#8b7dff",
  
  // Status Colors
  success: "#10b981",
  successLight: "#34d399",
  successBg: "#ecfdf5",
  successBorder: "#a7f3d0",
  
  warning: "#f59e0b",
  warningLight: "#fbbf24",
  warningBg: "#fffbeb",
  warningBorder: "#fde68a",
  
  error: "#ef4444",
  errorLight: "#f87171",
  errorBg: "#fef2f2",
  errorBorder: "#fecaca",
  
  info: "#3b82f6",
  infoLight: "#60a5fa",
  infoBg: "#eff6ff",
  infoBorder: "#bfdbfe",
  
  // Neutral Colors
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#1f2937",
  gray900: "#111827",
  
  // Background Colors
  background: "#f5f6fa",
  surface: "rgba(255, 255, 255, 0.96)",
  surfaceBorder: "rgba(214, 220, 228, 0.9)",
  
  // Role-based Colors
  owner: {
    bg: "#faf5ff",
    text: "#7c3aed",
    border: "#c4b5fd"
  },
  manager: {
    bg: "#eff6ff",
    text: "#2563eb",
    border: "#bfdbfe"
  },
  staff: {
    bg: "#f0fdf4",
    text: "#16a34a",
    border: "#bbf7d0"
  }
} as const;

// Utility functions for consistent styling
export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
    case 'completed':
    case 'verified':
    case 'approved':
      return {
        bg: COLORS.successBg,
        text: COLORS.success,
        border: COLORS.successBorder
      };
    case 'pending':
    case 'in_progress':
    case 'processing':
      return {
        bg: COLORS.warningBg,
        text: COLORS.warning,
        border: COLORS.warningBorder
      };
    case 'failed':
    case 'rejected':
    case 'error':
      return {
        bg: COLORS.errorBg,
        text: COLORS.error,
        border: COLORS.errorBorder
      };
    default:
      return {
        bg: COLORS.infoBg,
        text: COLORS.info,
        border: COLORS.infoBorder
      };
  }
};

export const getRoleColor = (role: 'Owner' | 'Manager' | 'Staff') => {
  return COLORS[role.toLowerCase() as keyof typeof COLORS] as {
    bg: string;
    text: string;
    border: string;
  };
};