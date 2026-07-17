import { useState, useEffect, useRef } from "react";

interface DeployCommentModalProps {
  isOpen: boolean;
  processKey: string;
  onConfirm: (comment: string) => void;
  onCancel: () => void;
}

export default function DeployCommentModal({
  isOpen,
  processKey,
  onConfirm,
  onCancel,
}: DeployCommentModalProps) {
  const [comment, setComment] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setComment("");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm(comment.trim());
    setComment("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
              <i className="fas fa-cloud-upload-alt text-brand-500 text-sm" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Deploy Process</h3>
              <p className="text-xs text-slate-400 font-mono">{processKey}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">
            Deployment Note <span className="text-slate-400 font-normal normal-case">(optional)</span>
          </label>
          <input
            ref={inputRef}
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Fixed approval loop, added email notification..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all bg-slate-50 placeholder:text-slate-300"
          />
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <i className="fas fa-info-circle" />
            This note will appear in the version history.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2.5 rounded-xl text-sm font-black text-white bg-brand-500 hover:bg-brand-600 transition-all shadow-brand-sm flex items-center gap-2"
          >
            <i className="fas fa-rocket text-xs" />
            Deploy Now
          </button>
        </div>
      </div>
    </div>
  );
}
