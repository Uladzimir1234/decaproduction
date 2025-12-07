import * as React from "react";
import { cn } from "@/lib/utils";

interface StatusOption {
  value: string;
  label: string;
}

interface StatusPopoverButtonsProps {
  currentValue: string;
  options: StatusOption[];
  onChange: (value: string) => void;
}

export function StatusPopoverButtons({ 
  currentValue, 
  options, 
  onChange 
}: StatusPopoverButtonsProps) {
  const getButtonStyle = (optionValue: string) => {
    const isComplete = optionValue === 'complete' || optionValue === 'available';
    const isPartial = optionValue === 'partial' || optionValue === 'ordered';
    const isNotStarted = optionValue === 'not_started' || optionValue === 'not_ordered';
    const isActive = currentValue === optionValue;
    
    return cn(
      "w-full text-left px-3 py-2 text-sm rounded-md font-medium transition-all",
      isComplete && "bg-emerald-500 text-white hover:bg-emerald-600",
      isPartial && "bg-amber-500 text-white hover:bg-amber-600",
      isNotStarted && "bg-red-500 text-white hover:bg-red-600",
      isActive && "ring-2 ring-offset-1 ring-foreground/20"
    );
  };

  return (
    <div className="flex flex-col gap-1.5 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChange(option.value);
          }}
          className={getButtonStyle(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export const orderingPopoverOptions: StatusOption[] = [
  { value: 'not_ordered', label: 'Not Ordered' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'available', label: 'Available' },
];

export const manufacturingPopoverOptions: StatusOption[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'partial', label: 'Partial' },
  { value: 'complete', label: 'Complete' },
];
