import { cn } from "@/lib/utils";

interface ProgressCircleProps {
  value: number;
  size?: "sm" | "md" | "lg" | "xl";
  showValue?: boolean;
  label?: string;
  className?: string;
  colorVariant?: "default" | "success" | "warning" | "danger" | "info";
}

const sizeMap = {
  sm: { width: 60, stroke: 4, fontSize: "text-xs" },
  md: { width: 80, stroke: 5, fontSize: "text-sm" },
  lg: { width: 100, stroke: 6, fontSize: "text-base" },
  xl: { width: 140, stroke: 8, fontSize: "text-xl" },
};

const colorMap = {
  default: "stroke-primary",
  success: "stroke-success",
  warning: "stroke-warning",
  danger: "stroke-destructive",
  info: "stroke-info",
};

export function ProgressCircle({
  value,
  size = "md",
  showValue = true,
  label,
  className,
  colorVariant = "default",
}: ProgressCircleProps) {
  const { width, stroke, fontSize } = sizeMap[size];
  const radius = (width - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const getColorVariant = () => {
    if (colorVariant !== "default") return colorVariant;
    if (value >= 80) return "success";
    if (value >= 40) return "warning";
    return "danger";
  };

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative" style={{ width, height: width }}>
        <svg
          className="transform -rotate-90"
          width={width}
          height={width}
        >
          {/* Background circle */}
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            className="stroke-muted"
            strokeWidth={stroke}
          />
          {/* Progress circle */}
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            className={cn("transition-all duration-700 ease-out", colorMap[getColorVariant()])}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("font-semibold", fontSize)}>
              {Math.round(value)}%
            </span>
          </div>
        )}
      </div>
      {label && (
        <span className="text-xs text-muted-foreground text-center font-medium">
          {label}
        </span>
      )}
    </div>
  );
}
