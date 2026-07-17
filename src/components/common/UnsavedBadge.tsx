import React from "react";

/**
 * Props for the UnsavedBadge component.
 */
interface UnsavedBadgeProps {
  /** Whether to show the badge. */
  show: boolean;
  /** Optional custom text, defaults to "Unsaved Changes" */
  text?: string;
}

/**
 * A prominent warning badge that pulses to indicate unsaved work.
 * Ideal for headers or sidebars when form/editor state is dirty.
 */
export const UnsavedBadge: React.FC<UnsavedBadgeProps> = ({
  show,
  text = "Unsaved Changes",
}) => {
  if (!show) return null;

  return (
    <span className="text-xs font-bold uppercase bg-amber-50 text-amber-700 px-2.5 py-1.5 rounded-lg border border-amber-200 flex items-center gap-1.5 animate-pulse shadow-sm">
      <i className="fas fa-exclamation-circle text-[10px]" />
      {text}
    </span>
  );
};
