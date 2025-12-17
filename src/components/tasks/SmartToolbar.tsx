import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { Button } from "../ui/Button";
import { type ActionButton } from "../../api"; // <--- IMPORT THIS


interface SmartToolbarProps {
  title: string;
  subtitle?: string;
  actions: ActionButton[];
  onAction: (btn: ActionButton) => void;
}

export const SmartToolbar = ({
  title,
  subtitle,
  actions = [],
  onAction,
}: SmartToolbarProps) => {
  // Simple state for the mobile menu instead of Headless UI
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getButtonVariant = (color: string) => {
    if (color === "success") return "primary";
    if (color === "warning") return "secondary";
    return "secondary";
  };

  return (
    <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-stone-200 bg-surface/80 px-6 backdrop-blur-md transition-all">
      {/* Title Context */}
      <div className="flex flex-col">
        {subtitle && (
          <div className="flex items-center gap-2 text-xs font-medium text-ink-muted uppercase tracking-wider">
            <span>{subtitle}</span>
          </div>
        )}
        <h2 className="text-lg font-bold text-ink-primary tracking-tight">
          {title}
        </h2>
      </div>

      {/* Action Area */}
      <div className="flex items-center gap-2 relative">
        {/* Desktop: Show Buttons Directly */}
        <div className="hidden md:flex items-center gap-2">
          {actions.length > 0 ? (
            actions.map((btn, idx) => (
              <Button
                key={idx}
                size="sm"
                variant={getButtonVariant(btn.color) as any}
                onClick={() => onAction(btn)}
                className={
                  btn.color === "success"
                    ? "bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/20 shadow-lg"
                    : ""
                }
              >
                <i className={`${btn.icon || "fa fa-check"} mr-2 text-sm`}></i>
                {btn.label}
              </Button>
            ))
          ) : (
            <span className="text-xs text-ink-muted italic">View Only</span>
          )}
        </div>

        {/* Mobile: Toggle Button */}
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>

        {/* Mobile: Simple Dropdown Menu (No Headless UI needed) */}
        {isMobileMenuOpen && (
          <div className="absolute right-0 top-12 mt-2 w-48 origin-top-right rounded-lg bg-white shadow-floating ring-1 ring-black ring-opacity-5 z-50 p-1 animate-in fade-in zoom-in duration-200">
            {actions.length > 0 ? (
              actions.map((btn, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onAction(btn);
                    setIsMobileMenuOpen(false);
                  }}
                  className="group flex w-full items-center rounded-md px-2 py-2 text-sm text-ink-secondary hover:bg-stone-100 transition-colors"
                >
                  <i className={`${btn.icon} mr-2 text-ink-muted`}></i>
                  {btn.label}
                </button>
              ))
            ) : (
              <div className="p-2 text-xs text-center text-ink-muted">
                No actions available
              </div>
            )}
          </div>
        )}

        {/* Click Overlay to close menu when clicking outside */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </div>
    </div>
  );
};
