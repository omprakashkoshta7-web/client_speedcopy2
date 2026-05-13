import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type VendorMetricCardProps = {
  label: string;
  value: string;
  accent: string;
  accentBg?: string;
  note?: string;
  className?: string;
  children?: ReactNode;
  index?: number;
  icon?: LucideIcon;
  badge?: ReactNode;
};

export default function VendorMetricCard({
  label,
  value,
  accent,
  note,
  className = "",
  children,
  index = 1,
  icon: Icon,
}: VendorMetricCardProps) {
  const isPrimary = index === 0;

  if (isPrimary) {
    return (
      <div
        className={`relative rounded-[24px] p-6 overflow-visible h-[160px] flex flex-col ${className}`.trim()}
        style={{
          background: `linear-gradient(135deg, #2d3f55, #1e2d42)`,
          boxShadow: `0 8px 24px rgba(45, 63, 85, 0.25)`,
        }}
      >
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-4">
            {Icon && <Icon size={18} className="text-white/70" />}
            <p className="text-sm font-semibold text-white/90">{label}</p>
          </div>
          <p className="text-4xl font-black text-white leading-none mb-auto">{value}</p>
          {note && <p className="text-xs font-medium text-white/60 mt-2">{note}</p>}
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-[24px] p-6 bg-white overflow-visible h-[160px] flex flex-col ${className}`.trim()}
      style={{ boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)" }}
    >
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
          {Icon && <Icon size={18} style={{ color: accent }} />}
          <p className="text-sm font-semibold text-gray-600">{label}</p>
        </div>
        <p className="text-4xl font-black text-gray-900 leading-none mb-auto">{value}</p>
        {note && <p className="text-xs font-medium text-gray-500 mt-2">{note}</p>}
        {children}
      </div>
    </div>
  );
}
