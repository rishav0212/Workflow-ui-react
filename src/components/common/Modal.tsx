import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-2xl' }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className={`relative bg-surface w-full ${maxWidth} rounded-3xl shadow-floating overflow-hidden flex flex-col max-h-[90vh] animate-slideUp`}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-canvas-subtle flex items-center justify-between bg-white">
          <h3 className="text-xl font-bold text-ink-primary">
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:bg-canvas hover:text-ink-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-canvas-subtle bg-canvas-subtle/30 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
