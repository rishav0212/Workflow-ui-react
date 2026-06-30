import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import type { ToolJetAppResponse } from '../../api/tooljetAdmin';
import { 
    fetchAdminToolJetApps, 
    createToolJetApp, 
    updateToolJetApp, 
    deleteToolJetApp,
    reorderToolJetApps
} from '../../api/tooljetAdmin';
import AppRow from './AppRow';
import AppFormModal from './AppFormModal';
import OAuthCredentialsManager from './OAuthCredentialsManager';
import { Secure } from '../../components/common/Secure';

export default function ToolJetAppManager() {
    const [apps, setApps] = useState<ToolJetAppResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isReordering, setIsReordering] = useState(false);
    const [activeTab, setActiveTab] = useState<'apps' | 'credentials'>('apps');
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingApp, setEditingApp] = useState<ToolJetAppResponse | undefined>(undefined);

    const loadApps = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchAdminToolJetApps();
            setApps(data);
        } catch (error) {
            console.error("Failed to load ToolJet apps:", error);
            toast.error("Failed to load applications");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadApps();
    }, [loadApps]);

    const handleAddClick = () => {
        setEditingApp(undefined);
        setIsModalOpen(true);
    };

    const handleEditClick = (app: ToolJetAppResponse) => {
        setEditingApp(app);
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (app: ToolJetAppResponse) => {
        if (window.confirm(`Are you sure you want to delete "${app.displayName}"? This will remove it from the sidebar for all users in your tenant.`)) {
            try {
                await deleteToolJetApp(app.id);
                toast.success(`${app.displayName} deleted`);
                loadApps();
            } catch (error) {
                console.error("Delete failed:", error);
                toast.error("Failed to delete application");
            }
        }
    };

    const handleSaveApp = async (data: any) => {
        try {
            if (editingApp) {
                await updateToolJetApp(editingApp.id, data);
                toast.success("Application updated");
            } else {
                await createToolJetApp(data);
                toast.success("Application registered");
            }
            loadApps(); // Reload to get new sortOrder etc.
        } catch (error: any) {
            console.error("Save failed:", error);
            const msg = error.response?.data?.error || "Failed to save application";
            toast.error(msg);
            throw error; // Let modal stay open
        }
    };

    // Reordering logic
    const handleMove = async (index: number, direction: 'up' | 'down') => {
        if (index < 0 || index >= apps.length) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === apps.length - 1) return;

        const newApps = [...apps];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        
        // Swap locally for immediate UI update
        const temp = newApps[index];
        newApps[index] = newApps[targetIndex];
        newApps[targetIndex] = temp;
        
        setApps(newApps);
        setIsReordering(true);

        try {
            // Send new order to backend
            const orderedIds = newApps.map(a => a.id);
            await reorderToolJetApps(orderedIds);
            toast.success("Order updated");
        } catch (error) {
            console.error("Reorder failed:", error);
            toast.error("Failed to update order");
            loadApps(); // Revert to original order
        } finally {
            setIsReordering(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-canvas p-10">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 flex items-end justify-between">
                    <div>
                        <h1 className="text-4xl font-serif font-bold text-ink-primary tracking-tight">
                            ToolJet <span className="text-violet-600">App Manager</span>
                        </h1>
                        <p className="text-ink-tertiary mt-2 font-medium">
                            Register custom applications to appear in your tenant's sidebar.
                        </p>
                    </div>
                    
                    {activeTab === 'apps' && (
                        <button 
                            onClick={handleAddClick}
                            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg hover:shadow-brand-500/30 transition-all flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            <i className="fas fa-plus"></i>
                            Register App
                        </button>
                    )}
                </header>

                <div className="flex space-x-1 bg-canvas-subtle p-1 rounded-xl mb-8 border border-canvas-active w-max">
                    <button
                        onClick={() => setActiveTab('apps')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                            activeTab === 'apps' 
                                ? 'bg-white text-ink-primary shadow-sm' 
                                : 'text-ink-secondary hover:text-ink-primary hover:bg-white/50'
                        }`}
                    >
                        Applications
                    </button>
                    <button
                        onClick={() => setActiveTab('credentials')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                            activeTab === 'credentials' 
                                ? 'bg-white text-ink-primary shadow-sm' 
                                : 'text-ink-secondary hover:text-ink-primary hover:bg-white/50'
                        }`}
                    >
                        API Credentials
                    </button>
                </div>

                {activeTab === 'apps' ? (
                    <div className="bg-surface rounded-3xl border border-canvas-active shadow-soft overflow-hidden">
                    {isLoading ? (
                        <div className="p-12 flex justify-center">
                            <i className="fas fa-circle-notch fa-spin text-3xl text-brand-500"></i>
                        </div>
                    ) : apps.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="w-20 h-20 bg-violet-50 text-violet-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <i className="fas fa-cubes text-3xl"></i>
                            </div>
                            <h3 className="text-xl font-bold text-ink-primary mb-2">No Applications Registered</h3>
                            <p className="text-ink-tertiary mb-8 max-w-sm mx-auto leading-relaxed">
                                You haven't added any ToolJet applications to your workspace yet. Apps registered here will appear in the main navigation sidebar.
                            </p>
                            <button onClick={handleAddClick} className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg hover:shadow-brand-500/30 transition-all inline-flex items-center gap-2">
                                <i className="fas fa-plus"></i> Add Your First App
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-canvas-subtle">
                            {apps.map((app, index) => (
                                <AppRow
                                    key={app.id}
                                    app={app}
                                    isFirst={index === 0}
                                    isLast={index === apps.length - 1}
                                    onMoveUp={() => handleMove(index, 'up')}
                                    onMoveDown={() => handleMove(index, 'down')}
                                    onEdit={() => handleEditClick(app)}
                                    onDelete={() => handleDeleteClick(app)}
                                    isReordering={isReordering}
                                />
                            ))}
                        </div>
                    )}
                </div>
                ) : (
                    <OAuthCredentialsManager />
                )}
            </div>

            <AppFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                app={editingApp}
                onSave={handleSaveApp}
            />
        </div>
    );
}
