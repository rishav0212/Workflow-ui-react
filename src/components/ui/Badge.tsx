

import { cn } from "../../lib/utils";

export const Badge = ({
  children,
  className,
  variant = "neutral",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "success" | "warning" | "error" | "neutral";
}) => {
  const styles = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100",
    error: "bg-red-50 text-red-700 border-red-100",
    neutral: "bg-stone-100 text-stone-600 border-stone-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
};
