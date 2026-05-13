import { AlertTriangle, CheckCircle, Info, X, XCircle } from "lucide-react";
import { COLORS } from "../../utils/colors";

type AlertType = "success" | "error" | "warning" | "info";

interface AlertProps {
  type: AlertType;
  message: string;
  onClose?: () => void;
  className?: string;
}

const ALERT_STYLES: Record<AlertType, { 
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

export default function Alert({ type, message, onClose, className = "" }: AlertProps) {
  const style = ALERT_STYLES[type];
  const Icon = style.icon;

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm flex items-center gap-3 animate-slide-down ${className}`}
      style={{
        backgroundColor: style.bg,
        borderColor: style.border,
        color: style.color,
      }}
    >
      <Icon size={18} className="flex-shrink-0" />
      <p className="flex-1 font-semibold">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 hover:opacity-70 transition"
          aria-label="Close alert"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

// Animation for slide down
const style = document.createElement("style");
style.textContent = `
  @keyframes slide-down {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-slide-down {
    animation: slide-down 0.3s ease-out;
  }
`;
document.head.appendChild(style);
