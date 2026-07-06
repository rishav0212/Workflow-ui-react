import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import type { ToolJetAppResponse, ToolJetAppVersion } from '../../api/tooljetAdmin';
import { fetchAppVersions, getAdminPreviewTicket } from '../../api/tooljetAdmin';
import { API_BASE_URL } from '../../config';

interface AppPreviewPanelProps {
    /** The app to preview. Pass null to hide the panel. */
    app: ToolJetAppResponse | null;
    onClose: () => void;
}

/**
 * Slide-over preview panel for the App Manager.
 * Opens from the right and embeds a ToolJet app in an iframe.
 * Lets admins select any version (including unreleased drafts) before loading.
 * The currently released version is clearly labelled in the dropdown.
 * Security: requires module:tooljet_apps — manage (enforced by the BFF backend).
 */
export default function AppPreviewPanel({ app, onClose }: AppPreviewPanelProps) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [versions, setVersions] = useState<ToolJetAppVersion[]>([]);
    const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
    const [selectedVersionId, setSelectedVersionId] = useState<string>(searchParams.get('previewVersion') || '');
    const [isLoadingVersions, setIsLoadingVersions] = useState(false);
    const [iframeUrl, setIframeUrl] = useState<string | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    // ── Load versions when the panel opens ──────────────────────────────────
    useEffect(() => {
        if (!app) {
            setVersions([]);
            setCurrentVersionId(null);
            setSelectedVersionId('');
            setIframeUrl(null);
            setPreviewError(null);
            return;
        }
        setIframeUrl(null);
        setPreviewError(null);
        
        // Read version from URL if present, otherwise default to empty string
        const urlVersion = searchParams.get('previewVersion') || '';
        setSelectedVersionId(urlVersion);
        setIsLoadingVersions(true);

        fetchAppVersions(app.tooljetAppUuid)
            .then(({ versions: v, currentVersionId: cvId }) => {
                setVersions(v);
                setCurrentVersionId(cvId);
            })
            .catch((err) => {
                console.error('Failed to fetch versions:', err);
                const msg =
                    err.response?.data?.error ||
                    'Could not load versions. Ensure your BFF service account has Builder access in ToolJet.';
                toast.error(msg, { duration: 5000 });
                setVersions([]);
                setCurrentVersionId(null);
            })
            .finally(() => setIsLoadingVersions(false));
    }, [app?.tooljetAppUuid]);

    // Update URL when version changes
    const updateSelectedVersion = (versionId: string) => {
        setSelectedVersionId(versionId);
        setSearchParams(prev => {
            if (versionId) prev.set('previewVersion', versionId);
            else prev.delete('previewVersion');
            return prev;
        });
        setIframeUrl(null);
        setPreviewError(null);
    };

    // ── Generate ticket and build iframe URL ─────────────────────────────────
    const handleOpenPreview = useCallback(async () => {
        if (!app) return;
        setIsLoadingPreview(true);
        setPreviewError(null);
        setIframeUrl(null);
        try {
            const actualVersionName = selectedVersionId 
                ? versions.find(v => v.id === selectedVersionId)?.name 
                : undefined;

            const { iframeUrl: rawPath } = await getAdminPreviewTicket(
                app.tooljetAppUuid,
                actualVersionName,
            );
            const base = API_BASE_URL.replace(/\/$/, '');
            setIframeUrl(`${base}${rawPath}`);
        } catch (err: any) {
            const msg =
                err.response?.data?.error ||
                err.message ||
                'Failed to generate preview ticket.';
            setPreviewError(msg);
            toast.error(msg);
        } finally {
            setIsLoadingPreview(false);
        }
    }, [app, selectedVersionId]);

    // ── Close on backdrop click ───────────────────────────────────────────────
    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === overlayRef.current) onClose();
    };

    // ── Close on Escape key ───────────────────────────────────────────────────
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); },
        [onClose],
    );
    useEffect(() => {
        if (app) document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [app, handleKeyDown]);

    // ── Helper: label for selected version ───────────────────────────────────
    const selectedVersionName = selectedVersionId
        ? (versions.find(v => v.id === selectedVersionId)?.name ?? selectedVersionId)
        : 'Published (Latest)';

    const isReleased = (id: string) => id === currentVersionId;

    if (!app) return null;

    return (
        <>
            {/* ── Backdrop (same pattern as AppFormModal) ── */}
            <div
                ref={overlayRef}
                onClick={handleOverlayClick}
                className="fixed inset-0 z-40 bg-neutral-900/40 backdrop-blur-sm"
            />

            {/* ── Slide-over panel ── */}
            <div
                className="fixed inset-0 z-50 flex flex-col bg-surface animate-fadeIn"
                role="dialog"
                aria-modal="true"
                aria-label={`Preview ${app.displayName}`}
            >
                {/* ─── Header (matches AppFormModal header style) ─── */}
                <div className="px-6 py-5 border-b border-canvas-subtle flex items-center gap-4 bg-white shrink-0">
                    {/* App icon badge */}
                    <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0">
                        <i className={`${app.icon || 'fas fa-window-maximize'} text-lg`}></i>
                    </div>

                    {/* Title */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-ink-primary truncate">
                                {app.displayName}
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200 uppercase tracking-wider shrink-0">
                                Admin Preview
                            </span>
                        </div>
                        <p className="text-xs text-neutral-400 font-mono mt-0.5 truncate">
                            {app.tooljetAppUuid}
                        </p>
                    </div>

                    {/* ── Version selector ── */}
                    <div className="flex items-center gap-2 shrink-0">
                        <label className="text-xs font-semibold text-ink-secondary whitespace-nowrap">
                            Version:
                        </label>

                        {isLoadingVersions ? (
                            <div className="h-9 px-3 rounded-xl border border-canvas-active bg-canvas flex items-center gap-2 text-xs text-ink-tertiary">
                                <i className="fas fa-circle-notch fa-spin text-brand-500"></i>
                                Loading…
                            </div>
                        ) : (
                            <select
                                value={selectedVersionId}
                                onChange={e => updateSelectedVersion(e.target.value)}
                                className="h-9 pl-3 pr-8 rounded-xl border border-canvas-active bg-canvas-subtle text-sm text-ink-primary font-medium focus:outline-none focus:border-brand-500/30 focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer appearance-none min-w-[200px] max-w-[280px]"
                            >
                                {/* "Published" option always maps to no versionId (BFF loads the released version) */}
                                <option value="">
                                    📦 Published (Latest){currentVersionId ? '' : ' — none released yet'}
                                </option>
                                {versions.map(v => (
                                    <option key={v.id} value={v.id}>
                                        {isReleased(v.id) ? '✅ ' : '🔧 '}{v.name}{isReleased(v.id) ? ' (Released)' : ''}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* ── Open Preview button ── */}
                    <button
                        onClick={handleOpenPreview}
                        disabled={isLoadingPreview || isLoadingVersions}
                        className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md hover:shadow-violet-500/30 transition-all inline-flex items-center gap-2 text-sm shrink-0"
                    >
                        {isLoadingPreview ? (
                            <><i className="fas fa-circle-notch fa-spin"></i> Loading…</>
                        ) : iframeUrl ? (
                            <><i className="fas fa-redo"></i> Reload</>
                        ) : (
                            <><i className="fas fa-play"></i> Open Preview</>
                        )}
                    </button>

                    {/* ── Close button ── */}
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:bg-canvas hover:text-ink-primary transition-colors shrink-0"
                        title="Close (Esc)"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* ── Security notice banner ── */}
                <div className="flex items-center gap-3 px-6 py-2.5 bg-amber-50 border-b border-amber-100 shrink-0">
                    <i className="fas fa-shield-alt text-amber-500 text-sm shrink-0"></i>
                    <p className="text-xs text-amber-700 font-medium leading-relaxed">
                        <strong>Admin Preview Mode</strong> — Bypasses user visibility conditions.
                        Draft versions require your BFF service account to have <strong>Builder or Admin</strong> access in ToolJet.
                    </p>
                </div>

                {/* ── Body ── */}
                <div className="flex-1 relative overflow-hidden bg-canvas">

                    {/* ── Empty / ready state ── */}
                    {!iframeUrl && !isLoadingPreview && !previewError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-8">
                            <div className="w-20 h-20 rounded-3xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-300 mb-2">
                                <i className="fas fa-eye text-4xl"></i>
                            </div>
                            <h3 className="text-lg font-bold text-ink-primary">Ready to Preview</h3>
                            <p className="text-sm text-ink-tertiary max-w-sm leading-relaxed">
                                Select a version below or leave on <strong>Published</strong>, then click{' '}
                                <strong>Open Preview</strong>.
                            </p>

                            {/* ── Version quick-select chips ── */}
                            {!isLoadingVersions && (
                                <div className="flex flex-wrap items-center justify-center gap-2 mt-2 max-w-lg">
                                    {/* "Published" chip */}
                                    <button
                                        onClick={() => updateSelectedVersion('')}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                            !selectedVersionId
                                                ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                                                : 'bg-surface border-canvas-active text-ink-secondary hover:border-violet-300 hover:text-violet-600'
                                        }`}
                                    >
                                        <i className="fas fa-box text-[10px]"></i> Published
                                    </button>

                                    {versions.slice(0, 10).map(v => (
                                        <button
                                            key={v.id}
                                            onClick={() => updateSelectedVersion(v.id)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                                selectedVersionId === v.id
                                                    ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                                                    : 'bg-surface border-canvas-active text-ink-secondary hover:border-violet-300 hover:text-violet-600'
                                            }`}
                                        >
                                            {isReleased(v.id) ? (
                                                <i className="fas fa-check-circle text-[10px]"></i>
                                            ) : (
                                                <i className="fas fa-code-branch text-[10px]"></i>
                                            )}
                                            {v.name}
                                            {isReleased(v.id) && (
                                                <span className={`ml-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                    selectedVersionId === v.id
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-green-100 text-green-700'
                                                }`}>
                                                    Released
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Loading spinner (matches project style) ── */}
                    {isLoadingPreview && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                            <i className="fas fa-circle-notch fa-spin text-3xl text-brand-500"></i>
                            <div className="text-center">
                                <p className="font-bold text-ink-primary">Establishing Preview Session</p>
                                <p className="text-sm text-ink-tertiary mt-1">Loading {selectedVersionName}…</p>
                            </div>
                        </div>
                    )}

                    {/* ── Error state ── */}
                    {previewError && !isLoadingPreview && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-status-error/10 flex items-center justify-center text-status-error">
                                <i className="fas fa-exclamation-triangle text-2xl"></i>
                            </div>
                            <div>
                                <p className="font-bold text-ink-primary mb-1">Preview Failed</p>
                                <p className="text-sm text-status-error max-w-md">{previewError}</p>
                            </div>
                            <button
                                onClick={handleOpenPreview}
                                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-brand-500/30 transition-all inline-flex items-center gap-2"
                            >
                                <i className="fas fa-redo"></i> Retry
                            </button>
                        </div>
                    )}

                    {/* ── The iframe ── */}
                    {iframeUrl && !isLoadingPreview && (
                        <iframe
                            key={iframeUrl}
                            src={iframeUrl}
                            className="w-full h-full border-none"
                            title={`Preview: ${app.displayName} — ${selectedVersionName}`}
                            allow="camera; microphone; geolocation; clipboard-write"
                        />
                    )}
                </div>
            </div>
        </>
    );
}
