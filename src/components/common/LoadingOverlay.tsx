import React from "react";

/**
 * Props for the LoadingOverlay component.
 */
interface LoadingOverlayProps {
  /** The message to display below the spinner. Default: "Loading..." */
  message?: string;
  /** Whether the overlay is visible. If false, renders nothing. */
  isVisible: boolean;
}

/**
 * A generic full-cover overlay with a spinner and a message.
 * Typically used to block user interaction while data or diagrams load.
 * Note: Must be placed inside a container with `position: relative`.
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = "Loading...",
  isVisible,
}) => {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm transition-opacity duration-300">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center shadow-sm">
          <i className="fas fa-circle-notch fa-spin text-brand-500 text-xl" />
        </div>
        <span className="text-xs font-bold text-ink-muted uppercase tracking-widest">
          {message}
        </span>
      </div>
    </div>
  );
};
