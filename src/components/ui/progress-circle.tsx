import { cn } from "@/lib/utils";

interface ProgressCircleProps {
  value: number;
  size?: "sm" | "md" | "lg" | "xl";
  showValue?: boolean;
  customValue?: string;
  label?: string;
  className?: string;
  colorVariant?: "default" | "success" | "warning" | "danger" | "info" | "gradient" | "gradient-inverse";
}

const sizeMap = {
  sm: { width: 48, stroke: 4, fontSize: "text-[10px]" },
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
  gradient: "",
  "gradient-inverse": "",
};

// Returns HSL color interpolating from red to green based on value (0-100)
const getGradientColor = (value: number, inverse: boolean = false) => {
  const v = inverse ? 100 - value : value;
  // Hue: 0 = red, 120 = green
  const hue = (v / 100) * 120;
  return `hsl(${hue}, 70%, 45%)`;
};

export function ProgressCircle({
  value,
  size = "md",
  showValue = true,
  customValue,
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

  const isGradient = colorVariant === "gradient" || colorVariant === "gradient-inverse";
  const strokeColor = isGradient 
    ? getGradientColor(value, colorVariant === "gradient-inverse")
    : undefined;

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
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
            className={cn(
              "transition-all duration-700 ease-out",
              !isGradient && colorMap[getColorVariant()]
            )}
            style={isGradient ? { stroke: strokeColor } : undefined}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        {(showValue || customValue) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("font-semibold", fontSize)}>
              {customValue || `${Math.round(value)}%`}
            </span>
          </div>
        )}
      </div>
      {label && (
        <span className="text-[10px] text-muted-foreground text-center font-medium leading-tight">
          {label}
        </span>
      )}
    </div>
  );
}
