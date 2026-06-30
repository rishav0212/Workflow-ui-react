import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
    fetchToolJetWorkspace,
    updateToolJetWorkspace,
    type ToolJetWorkspaceResponse,
    type ToolJetWorkspaceUpdateRequest
} from '../../api/tooljetAdmin';
import { parseApiError } from '../../api';

export default function ToolJetWorkspaceSettings() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState<ToolJetWorkspaceUpdateRequest>({
        workspaceUuid: '',
        slug: '',
        viewerEmail: '',
        viewerPassword: ''
    });

    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    const loadWorkspace = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchToolJetWorkspace();
            setFormData({
                workspaceUuid: data.workspaceUuid,
                slug: data.slug,
                viewerEmail: data.viewerEmail,
                viewerPassword: '' // Never populate password from backend
            });
            setLastUpdated(data.updatedAt);
        } catch (error) {
            console.error("Failed to load workspace settings:", error);
            toast.error(parseApiError(error));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadWorkspace();
    }, [loadWorkspace]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        try {
            const response = await updateToolJetWorkspace(formData);
            toast.success("Workspace settings updated successfully");
            
            // Clear password field after successful save
            setFormData(prev => ({
                ...prev,
                viewerPassword: ''
            }));
            setLastUpdated(response.updatedAt);
        } catch (error) {
            console.error("Failed to update workspace:", error);
            toast.error(parseApiError(error));
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <i className="fas fa-circle-notch fa-spin text-2xl text-brand-500"></i>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h2 className="text-2xl font-bold text-ink-primary">Workspace Connection</h2>
                <p className="text-sm text-ink-tertiary mt-1">
                    Configure the ToolJet workspace credentials for your tenant. These are used securely by the backend to fetch apps and manage the embedded Iframe.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-canvas-active shadow-sm overflow-hidden">
                <div className="p-6 space-y-6">
                    
                    {/* Two Column Layout for IDs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-ink-primary">
                                Workspace UUID
                            </label>
                            <input
                                type="text"
                                name="workspaceUuid"
                                value={formData.workspaceUuid}
                                onChange={handleChange}
                                placeholder="e.g. 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
                                className="w-full px-4 py-2 bg-canvas-subtle border border-canvas-subtle rounded-xl text-sm focus:outline-none focus:border-brand-500/30 focus:ring-2 focus:ring-brand-500/20 font-mono"
                                required
                            />
                            <p className="text-xs text-ink-tertiary">The unique identifier of the ToolJet workspace.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-ink-primary">
                                Workspace Slug
                            </label>
                            <input
                                type="text"
                                name="slug"
                                value={formData.slug}
                                onChange={handleChange}
                                placeholder="e.g. my-tenant-workspace"
                                className="w-full px-4 py-2 bg-canvas-subtle border border-canvas-subtle rounded-xl text-sm focus:outline-none focus:border-brand-500/30 focus:ring-2 focus:ring-brand-500/20 font-mono"
                                required
                            />
                            <p className="text-xs text-ink-tertiary">The URL-friendly slug used in ToolJet APIs.</p>
                        </div>
                    </div>

                    <hr className="border-canvas-subtle" />

                    {/* Viewer Credentials */}
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold text-ink-primary">Service Account (Viewer)</h3>
                            <p className="text-xs text-ink-tertiary mt-1">
                                Used by the backend to automatically log in and fetch the secure embed ticket for the users.
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-ink-primary">
                                    Viewer Email
                                </label>
                                <input
                                    type="email"
                                    name="viewerEmail"
                                    value={formData.viewerEmail}
                                    onChange={handleChange}
                                    placeholder="e.g. embed@yourtenant.com"
                                    className="w-full px-4 py-2 bg-canvas-subtle border border-canvas-subtle rounded-xl text-sm focus:outline-none focus:border-brand-500/30 focus:ring-2 focus:ring-brand-500/20"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-ink-primary flex justify-between">
                                    <span>Viewer Password</span>
                                    <span className="text-xs text-brand-600 font-normal bg-brand-50 px-2 py-0.5 rounded-full">Optional update</span>
                                </label>
                                <input
                                    type="password"
                                    name="viewerPassword"
                                    value={formData.viewerPassword}
                                    onChange={handleChange}
                                    placeholder="••••••••••••"
                                    className="w-full px-4 py-2 bg-canvas-subtle border border-canvas-subtle rounded-xl text-sm focus:outline-none focus:border-brand-500/30 focus:ring-2 focus:ring-brand-500/20"
                                />
                                <p className="text-xs text-ink-tertiary">
                                    Leave blank to keep the current password.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-canvas flex items-center justify-between border-t border-canvas-subtle">
                    <div className="text-xs text-ink-tertiary">
                        {lastUpdated && (
                            <span>Last updated: {new Date(lastUpdated).toLocaleString()}</span>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                        Save Configuration
                    </button>
                </div>
            </form>
        </div>
    );
}
