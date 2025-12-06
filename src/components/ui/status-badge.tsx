import { cn } from "@/lib/utils";
import { Check, Clock, Minus, AlertCircle } from "lucide-react";

type StatusType = "not_started" | "partial" | "complete" | "pending";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  showIcon?: boolean;
  className?: string;
}

const statusConfig = {
  not_started: {
    label: "Not Started",
    className: "status-not-started",
    icon: Minus,
  },
  partial: {
    label: "In Progress",
    className: "status-partial",
    icon: Clock,
  },
  complete: {
    label: "Complete",
    className: "status-complete",
    icon: Check,
  },
  pending: {
    label: "Pending",
    className: "bg-info/15 text-info",
    icon: AlertCircle,
  },
};

export function StatusBadge({
  status,
  label,
  showIcon = true,
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={cn("status-badge", config.className, className)}>
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {label || config.label}
    </span>
  );
}
