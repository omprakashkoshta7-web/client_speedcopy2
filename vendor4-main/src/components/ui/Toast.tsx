import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, Info, X, XCircle } from "lucide-react";
import { COLORS } from "../../utils/colors";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  type: ToastType;
  message: string;
  duration?: number; // milliseconds, default 5000
  onClose: () => void;
}

const TOAST_STYLES: Record<ToastType, { 
  color: string; 
  bg: string; 
  border: string; 
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = {
  success: {
    color: COLORS.success,
    bg: COLORS.successBg,
    border: COLORS.successBorder,
    icon: CheckCircle,
  },
  error: {
    color: COLORS.error,
    bg: COLORS.errorBg,
    border: COLORS.errorBorder,
    icon: XCircle,
  },
  warning: {
    color: COLORS.warning,
    bg: COLORS.warningBg,
    border: COLORS.warningBorder,
    icon: AlertTriangle,
  },
  info: {
    color: COLORS.info,
    bg: COLORS.infoBg,
    border: COLORS.infoBorder,
    icon: Info,
  },
};

export default function Toast({ type, message, duration = 5000, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const style = TOAST_STYLES[type];
  const Icon = style.icon;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300); // Wait for exit animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`toast-notification ${isExiting ? "toast-exit" : "toast-enter"}`}
      style={{
        backgroundColor: style.bg,
        borderColor: style.border,
        color: style.color,
      }}
    >
      <Icon size={18} className="flex-shrink-0" />
      <p className="flex-1 font-semibold text-sm">{message}</p>
      <button
        onClick={handleClose}
        className="flex-shrink-0 hover:opacity-70 transition"
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
}

// Toast Container Component
interface ToastContainerProps {
  toasts: Array<{ id: string; type: ToastType; message: string }>;
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}

// Add styles
const style = document.createElement("style");
style.textContent = `
  .toast-container {
    position: fixed;
    top: 1.5rem;
    right: 1.5rem;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 400px;
    pointer-events: none;
  }
  
  .toast-notification {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-radius: 1rem;
    border: 1px solid;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(10px);
    pointer-events: auto;
    min-width: 300px;
  }
  
  @keyframes toast-slide-in {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes toast-slide-out {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }
  
  .toast-enter {
    animation: toast-slide-in 0.3s ease-out;
  }
  
  .toast-exit {
    animation: toast-slide-out 0.3s ease-in;
  }
  
  @media (max-width: 640px) {
    .toast-container {
      top: 1rem;
      right: 1rem;
      left: 1rem;
      max-width: none;
    }
    
    .toast-notification {
      min-width: auto;
      width: 100%;
    }
  }
`;
document.head.appendChild(style);
