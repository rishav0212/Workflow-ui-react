import React from 'react';
import type { ToolJetAppResponse } from '../../api/tooljetAdmin';
import { Secure } from '../../components/common/Secure';

interface AppRowProps {
    app: ToolJetAppResponse;
    isFirst: boolean;
    isLast: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onPreview: () => void;
    isReordering: boolean;
}

export default function AppRow({
    app,
    isFirst,
    isLast,
    onMoveUp,
    onMoveDown,
    onEdit,
    onDelete,
    onPreview,
    isReordering
}: AppRowProps) {
    return (
        <div className="flex items-center gap-4 p-4 hover:bg-canvas-subtle/50 transition-colors group border-b border-canvas-subtle last:border-0">
            {/* Reorder Controls */}
            <div className="flex flex-col gap-1 opacity-60 group-hover:opacity-100 transition-opacity pr-2">
                <button
                    onClick={onMoveUp}
                    disabled={isFirst || isReordering}
                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-all border shadow-sm ${
                        isFirst ? 'bg-canvas text-neutral-300 border-transparent shadow-none cursor-not-allowed' : 'bg-surface border-canvas-active text-neutral-500 hover:text-brand-600 hover:border-brand-300 hover:shadow-brand-sm hover:bg-brand-50'
                    }`}
                    title="Move Up"
                >
                    <i className="fas fa-chevron-up text-[10px]"></i>
                </button>
                <button
                    onClick={onMoveDown}
                    disabled={isLast || isReordering}
                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-all border shadow-sm ${
                        isLast ? 'bg-canvas text-neutral-300 border-transparent shadow-none cursor-not-allowed' : 'bg-surface border-canvas-active text-neutral-500 hover:text-brand-600 hover:border-brand-300 hover:shadow-brand-sm hover:bg-brand-50'
                    }`}
                    title="Move Down"
                >
                    <i className="fas fa-chevron-down text-[10px]"></i>
                </button>
            </div>

            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-surface border border-canvas-active shadow-sm flex items-center justify-center text-brand-600 shrink-0 relative overflow-hidden group-hover:shadow-md transition-all">
                <div className="absolute inset-0 bg-brand-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <i className={`${app.icon || 'fas fa-window-maximize'} text-xl`}></i>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-ink-primary truncate">{app.displayName}</h3>
                    {app.visibilityCondition && (
                        <div className="flex items-center justify-center bg-brand-50 text-brand-600 rounded px-1.5 py-0.5 text-[10px] font-bold border border-brand-200" title="Custom Visibility Condition Applied">
                            <i className="fas fa-code mr-1"></i>
                            Secured
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 text-xs text-ink-tertiary font-mono truncate">
                    <i className="fas fa-fingerprint opacity-50"></i>
                    {app.tooljetAppUuid}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Secure resource="module:tooljet_apps" action="preview">
                    <button
                        onClick={onPreview}
                        disabled={isReordering}
                        className="h-9 px-3 rounded-xl flex items-center gap-1.5 text-neutral-500 hover:bg-violet-50 hover:text-violet-600 border border-transparent hover:border-violet-200 hover:shadow-sm transition-all text-xs font-semibold"
                        title="Preview App"
                    >
                        <i className="fas fa-eye text-sm"></i>
                        <span>Preview</span>
                    </button>
                </Secure>
                <button
                    onClick={onEdit}
                    disabled={isReordering}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-500 hover:bg-white hover:text-brand-600 border border-transparent hover:border-canvas-active hover:shadow-sm transition-all"
                    title="Edit Application"
                >
                    <i className="fas fa-pen text-sm"></i>
                </button>
                <button
                    onClick={onDelete}
                    disabled={isReordering}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-500 hover:bg-status-error/10 hover:text-status-error border border-transparent hover:border-status-error/20 transition-all"
                    title="Delete Application"
                >
                    <i className="fas fa-trash-alt text-sm"></i>
                </button>
            </div>
        </div>
    );
}
