import React, { useState, useEffect } from 'react';
import type { ToolJetAppResponse, ToolJetAppRequest } from '../../api/tooljetAdmin';
import IconPickerGrid from './IconPickerGrid';

interface AppFormModalProps {
    app?: ToolJetAppResponse; // If provided, we're editing. If null, creating.
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: ToolJetAppRequest) => Promise<void>;
}

export default function AppFormModal({ app, isOpen, onClose, onSave }: AppFormModalProps) {
    const [formData, setFormData] = useState<ToolJetAppRequest>({
        displayName: '',
        tooljetAppUuid: '',
        icon: 'fas fa-window-maximize',
        visibilityCondition: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    // Reset form when modal opens/closes or app changes
    useEffect(() => {
        if (isOpen) {
            setFormData({
                displayName: app?.displayName || '',
                tooljetAppUuid: app?.tooljetAppUuid || '',
                icon: app?.icon || 'fas fa-window-maximize',
                visibilityCondition: app?.visibilityCondition || ''
            });
        }
    }, [isOpen, app]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(formData);
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={onClose}></div>
            
            {/* Modal */}
            <div className="relative bg-surface w-full max-w-4xl rounded-3xl shadow-floating overflow-hidden flex flex-col max-h-[90vh] animate-slideUp">
                <div className="px-6 py-5 border-b border-canvas-subtle flex items-center justify-between bg-white">
                    <h3 className="text-xl font-bold text-ink-primary">
                        {app ? 'Edit Application' : 'Register New App'}
                    </h3>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:bg-canvas hover:text-ink-primary transition-colors"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* LEFT COLUMN: Text Inputs */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-ink-primary mb-2">
                                    Display Name <span className="text-status-error">*</span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={formData.displayName}
                                    onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                                    placeholder="e.g. Sales Dashboard"
                                    className="w-full px-4 py-3 bg-canvas-subtle border border-canvas-subtle rounded-xl text-sm focus:outline-none focus:border-brand-500/30 focus:ring-2 focus:ring-brand-500/20 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-ink-primary mb-2">
                                    ToolJet App UUID <span className="text-status-error">*</span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={formData.tooljetAppUuid}
                                    onChange={(e) => setFormData({...formData, tooljetAppUuid: e.target.value})}
                                    placeholder="123e4567-e89b-12d3-a456-426614174000"
                                    className="w-full px-4 py-3 bg-canvas-subtle border border-canvas-subtle rounded-xl text-sm font-mono focus:outline-none focus:border-brand-500/30 focus:ring-2 focus:ring-brand-500/20 transition-all"
                                    disabled={!!app} // Usually don't want to change UUID after creation to avoid breaking links
                                />
                                {app && <p className="text-xs text-neutral-400 mt-2"><i className="fas fa-lock mr-1"></i>App UUID cannot be changed after registration.</p>}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Icon Picker */}
                        <div className="bg-canvas-subtle/30 p-6 rounded-2xl border border-canvas-subtle">
                            <label className="block text-sm font-semibold text-ink-primary mb-3">
                                Sidebar Icon
                            </label>
                            <div className="flex items-center gap-4 mb-5">
                                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-brand-600 text-2xl border border-canvas-active shadow-sm shrink-0">
                                    <i className={formData.icon || 'fas fa-window-maximize'}></i>
                                </div>
                                <div className="text-sm text-neutral-500 leading-relaxed">
                                    This icon will visually represent your app in the left navigation sidebar for all users in this tenant.
                                </div>
                            </div>
                            <div className="bg-white p-2 rounded-xl shadow-sm border border-canvas-subtle">
                                <IconPickerGrid 
                                    value={formData.icon || ''}
                                    onChange={(icon) => setFormData({...formData, icon})}
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-semibold text-ink-secondary mb-2 uppercase tracking-wider">
                                Visibility Condition
                            </label>
                            <textarea
                                value={formData.visibilityCondition || ''}
                                onChange={(e) => setFormData({ ...formData, visibilityCondition: e.target.value })}
                                className="w-full bg-canvas-subtle border border-canvas-active rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all font-mono text-sm"
                                placeholder="e.g. permissions['table:order:issue_batch_no']"
                                rows={2}
                            />
                            <p className="mt-2 text-xs text-ink-secondary">
                                Return true to make the app visible. Use the `permissions` map to check resource action evaluations. Leave blank to make visible to everyone.
                            </p>
                        </div>
                    </div>
                </form>

                <div className="px-6 py-4 border-t border-canvas-subtle bg-canvas-subtle/30 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl font-semibold text-sm text-ink-secondary hover:bg-canvas border border-transparent transition-colors"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSaving || !formData.displayName || !formData.tooljetAppUuid}
                        className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md hover:shadow-brand-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                    >
                        {isSaving ? (
                            <><i className="fas fa-circle-notch fa-spin"></i> Saving...</>
                        ) : (
                            <><i className="fas fa-save"></i> Save Application</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
