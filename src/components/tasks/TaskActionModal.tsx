import { useEffect } from "react";
// @ts-ignore
import { Form } from "react-formio";
import { X } from "lucide-react";

interface TaskActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  formSchema: any;
  submissionData?: any;
  onSubmit: (data: any) => void;
  isReadOnly?: boolean;
}

export default function TaskActionModal({
  isOpen,
  onClose,
  title,
  formSchema,
  submissionData,
  onSubmit,
  isReadOnly = false,
}: TaskActionModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Panel */}
      <div className="relative w-full max-w-3xl bg-surface rounded-xl shadow-floating flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h3 className="text-lg font-bold text-ink-primary font-serif">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-ink-muted hover:text-ink-primary hover:bg-canvas-active rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {formSchema ? (
            <div className="formio-clean-wrapper">
              <Form
                form={formSchema}
                submission={
                  submissionData ? { data: submissionData } : undefined
                }
                readOnly={isReadOnly}
                onSubmit={onSubmit}
                options={{
                  noAlerts: true,
                  buttonSettings: { showCancel: false },
                }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-ink-muted">
              {/* Brand Colored Spinner */}
              <div className="animate-spin h-8 w-8 border-4 border-brand-200 border-t-brand-600 rounded-full mb-3"></div>
              <p>Loading form...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
