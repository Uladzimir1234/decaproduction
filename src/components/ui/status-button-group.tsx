import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StatusButtonGroupProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  size?: "sm" | "default";
}

export function StatusButtonGroup({ 
  value, 
  onChange, 
  options, 
  disabled = false,
  size = "default"
}: StatusButtonGroupProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = value === option.value;
        const isComplete = option.value === 'complete' || option.value === 'available';
        const isPartial = option.value === 'partial' || option.value === 'ordered';
        const isNotStarted = option.value === 'not_started' || option.value === 'not_ordered';
        
        return (
          <Button
            key={option.value}
            type="button"
            variant={isActive ? "default" : "outline"}
            size={size === "sm" ? "sm" : "default"}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "transition-all",
              isActive && isComplete && "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600",
              isActive && isPartial && "bg-amber-500 hover:bg-amber-600 text-white border-amber-500",
              isActive && isNotStarted && "bg-destructive hover:bg-destructive/90 text-destructive-foreground border-destructive",
              !isActive && "hover:bg-muted"
            )}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}

export const orderingStatusOptions = [
  { value: 'not_ordered', label: 'Not Ordered' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'available', label: 'Available' },
];

export const manufacturingStatusOptions = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'partial', label: 'Partial' },
  { value: 'complete', label: 'Complete' },
];
