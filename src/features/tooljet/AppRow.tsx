import React from 'react';
import { ToolJetAppResponse } from '../../api/tooljetAdmin';

interface AppRowProps {
    app: ToolJetAppResponse;
    isFirst: boolean;
    isLast: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onEdit: () => void;
    onDelete: () => void;
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
    isReordering
}: AppRowProps) {
    return (
        <div className="flex items-center gap-4 p-4 hover:bg-canvas-subtle/50 transition-colors group border-b border-canvas-subtle last:border-0">
            {/* Reorder Controls */}
            <div className="flex flex-col gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={onMoveUp}
                    disabled={isFirst || isReordering}
                    className={`p-1 rounded text-xs flex items-center justify-center transition-colors ${
                        isFirst ? 'text-neutral-300 cursor-not-allowed' : 'text-neutral-500 hover:bg-white hover:text-ink-primary hover:shadow-sm'
                    }`}
                    title="Move Up"
                >
                    <i className="fas fa-chevron-up"></i>
                </button>
                <button
                    onClick={onMoveDown}
                    disabled={isLast || isReordering}
                    className={`p-1 rounded text-xs flex items-center justify-center transition-colors ${
                        isLast ? 'text-neutral-300 cursor-not-allowed' : 'text-neutral-500 hover:bg-white hover:text-ink-primary hover:shadow-sm'
                    }`}
                    title="Move Down"
                >
                    <i className="fas fa-chevron-down"></i>
                </button>
            </div>

            {/* Icon Preview */}
            <div className="w-12 h-12 rounded-xl bg-surface border border-canvas-active shadow-sm flex items-center justify-center text-brand-600 shrink-0 relative overflow-hidden group-hover:shadow-md transition-all">
                <div className="absolute inset-0 bg-brand-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <i className={`${app.icon || 'fas fa-window-maximize'} text-xl`}></i>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-ink-primary truncate">{app.displayName}</h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-ink-tertiary font-mono truncate">
                    <i className="fas fa-fingerprint opacity-50"></i>
                    {app.tooljetAppUuid}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
