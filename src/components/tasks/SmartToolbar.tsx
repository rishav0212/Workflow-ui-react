import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { Button } from "../ui/Button";
import { type ActionButton } from "../../types";

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Helper to style buttons based on config
  const getVariant = (color: string) => {
    if (color === "success") return "primary";
    if (color === "warning") return "secondary";
    return "secondary";
  };

  return (
    <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-stone-200 bg-surface/90 px-6 backdrop-blur-md">
      {/* Left: Title & Context */}
      <div className="flex flex-col justify-center">
        {subtitle && (
          <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-0.5">
            {subtitle}
          </span>
        )}
        <h2 className="text-lg font-bold text-ink-primary leading-none tracking-tight font-serif">
          {title}
        </h2>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 relative">
        {/* DESKTOP: Visible Buttons */}
        <div className="hidden md:flex items-center gap-2">
          {actions.length > 0 ? (
            actions.map((btn, idx) => (
              <Button
                key={idx}
                size="sm"
                variant={getVariant(btn.color) as any}
                onClick={() => onAction(btn)}
                className={
                  btn.color === "success"
                    ? "bg-brand-600 text-white shadow-md shadow-brand-200 hover:bg-brand-700"
                    : ""
                }
              >
                <i className={`${btn.icon || "fa fa-bolt"} mr-2 text-xs`}></i>
                {btn.label}
              </Button>
            ))
          ) : (
            <span className="text-xs text-ink-muted italic bg-canvas-subtle px-2 py-1 rounded border border-stone-200">
              Read Only
            </span>
          )}
        </div>

        {/* MOBILE: Kebab Menu */}
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <MoreVertical className="w-5 h-5 text-ink-secondary" />
          </Button>
        </div>

        {/* MOBILE DROPDOWN (No Headless UI) */}
        {isMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setIsMenuOpen(false)}
            />

            <div className="absolute right-0 top-12 z-50 w-48 origin-top-right rounded-lg bg-surface shadow-floating ring-1 ring-black/5 animate-in fade-in zoom-in duration-150 p-1">
              {actions.length > 0 ? (
                actions.map((btn, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onAction(btn);
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center rounded-md px-3 py-2 text-sm text-ink-secondary hover:bg-canvas-active transition-colors"
                  >
                    <i
                      className={`${
                        btn.icon || "fa fa-bolt"
                      } mr-2 text-ink-muted`}
                    ></i>
                    {btn.label}
                  </button>
                ))
              ) : (
                <div className="p-3 text-xs text-center text-ink-muted">
                  No actions available
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
