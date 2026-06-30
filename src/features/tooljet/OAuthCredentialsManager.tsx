import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
    fetchToolJetOauthClients,
    createToolJetOauthClient,
    deleteToolJetOauthClient,
    type ToolJetOauthClientResponse,
    type ToolJetOauthClientCreateResponse
} from '../../api/tooljetAdmin';
import { parseApiError } from '../../api';

export default function OAuthCredentialsManager() {
    const [credentials, setCredentials] = useState<ToolJetOauthClientResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newDescription, setNewDescription] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const [createdCredential, setCreatedCredential] = useState<ToolJetOauthClientCreateResponse | null>(null);

    const loadCredentials = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchToolJetOauthClients();
            setCredentials(data);
        } catch (error) {
            console.error("Failed to load credentials:", error);
            toast.error(parseApiError(error));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCredentials();
    }, [loadCredentials]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const response = await createToolJetOauthClient({ description: newDescription });
            setCreatedCredential(response);
            setIsCreateModalOpen(false);
            setNewDescription('');
            loadCredentials();
            toast.success("Credential generated successfully");
        } catch (error) {
            console.error("Failed to create credential:", error);
            toast.error(parseApiError(error));
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (clientId: string) => {
        if (window.confirm('Are you sure you want to revoke this credential? Any application using it will lose access immediately.')) {
            try {
                await deleteToolJetOauthClient(clientId);
                toast.success("Credential revoked");
                loadCredentials();
            } catch (error) {
                console.error("Failed to delete credential:", error);
                toast.error(parseApiError(error));
            }
        }
    };

    const handleCopySecret = () => {
        if (createdCredential?.clientSecret) {
            navigator.clipboard.writeText(createdCredential.clientSecret);
            toast.success("Client Secret copied to clipboard!");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-ink-primary">API Credentials</h2>
                    <p className="text-sm text-ink-tertiary mt-1">
                        Manage OAuth2 client credentials for server-to-server ToolJet API access.
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2 text-sm"
                >
                    <i className="fas fa-key"></i> Generate Credential
                </button>
            </div>

            <div className="bg-surface rounded-2xl border border-canvas-active overflow-hidden shadow-sm">
                {isLoading ? (
                    <div className="p-8 flex justify-center">
                        <i className="fas fa-circle-notch fa-spin text-2xl text-brand-500"></i>
                    </div>
                ) : credentials.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-neutral-100 text-neutral-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-shield-alt text-2xl"></i>
                        </div>
                        <h3 className="text-lg font-semibold text-ink-primary">No credentials found</h3>
                        <p className="text-ink-tertiary text-sm mt-1 mb-4">
                            Generate a credential to authenticate API requests to ToolJet.
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-canvas-subtle border-b border-canvas-active text-ink-secondary">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Client ID</th>
                                <th className="px-6 py-4 font-semibold">Description</th>
                                <th className="px-6 py-4 font-semibold">Created</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-canvas-subtle">
                            {credentials.map(cred => (
                                <tr key={cred.id} className="hover:bg-canvas-subtle/30 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs text-ink-primary">{cred.clientId}</td>
                                    <td className="px-6 py-4 text-ink-secondary">{cred.description || '-'}</td>
                                    <td className="px-6 py-4 text-ink-tertiary">
                                        {new Date(cred.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(cred.clientId)}
                                            className="text-status-error hover:text-red-700 font-medium transition-colors"
                                        >
                                            Revoke
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)}></div>
                    <div className="relative bg-surface w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-slideUp">
                        <div className="px-6 py-5 border-b border-canvas-subtle">
                            <h3 className="text-lg font-bold text-ink-primary">Generate New Credential</h3>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-ink-primary mb-2">Description</label>
                                <input
                                    type="text"
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    placeholder="e.g. Sync Script Access"
                                    className="w-full px-4 py-2 bg-canvas-subtle border border-canvas-subtle rounded-xl text-sm focus:outline-none focus:border-brand-500/30 focus:ring-2 focus:ring-brand-500/20"
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-sm font-semibold text-ink-secondary hover:bg-canvas"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl shadow-md disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isCreating ? <i className="fas fa-spinner fa-spin"></i> : null}
                                    Generate
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Show Secret Modal */}
            {createdCredential && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"></div>
                    <div className="relative bg-surface w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slideUp border border-brand-500/20">
                        <div className="p-8 text-center border-b border-canvas-subtle bg-gradient-to-b from-brand-50 to-white">
                            <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">
                                <i className="fas fa-check"></i>
                            </div>
                            <h3 className="text-xl font-bold text-ink-primary">Credential Generated!</h3>
                            <p className="text-status-warning text-sm mt-2 font-medium bg-amber-50 py-2 px-4 rounded-lg inline-block border border-amber-200">
                                <i className="fas fa-exclamation-triangle mr-2"></i>
                                Save your Client Secret now. It will not be shown again.
                            </p>
                        </div>
                        <div className="p-8 space-y-5 bg-white">
                            <div>
                                <label className="block text-xs font-bold text-ink-tertiary uppercase tracking-wider mb-2">Client ID</label>
                                <div className="bg-canvas-subtle p-3 rounded-xl font-mono text-sm text-ink-primary border border-canvas-active">
                                    {createdCredential.clientId}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-ink-tertiary uppercase tracking-wider mb-2">Client Secret</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-canvas-subtle p-3 rounded-xl font-mono text-sm text-ink-primary border border-canvas-active overflow-x-auto whitespace-nowrap">
                                        {createdCredential.clientSecret}
                                    </div>
                                    <button
                                        onClick={handleCopySecret}
                                        className="px-4 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-xl font-semibold border border-brand-200 transition-colors flex items-center gap-2"
                                        title="Copy to clipboard"
                                    >
                                        <i className="fas fa-copy"></i> Copy
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-canvas flex justify-end border-t border-canvas-subtle">
                            <button
                                onClick={() => setCreatedCredential(null)}
                                className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-900 text-white font-bold rounded-xl shadow-md transition-colors"
                            >
                                I have saved it securely
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
