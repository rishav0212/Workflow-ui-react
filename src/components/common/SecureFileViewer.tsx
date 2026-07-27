import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, File, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';

interface SecureFileViewerProps {
  /** The full URL provided by the backend (e.g. previewUrl or downloadUrl) */
  url: string;
  /** The name of the file to display or use for downloading */
  fileName: string;
  /** The MIME type of the file (e.g., 'image/png', 'application/pdf') */
  mimeType: string;
  /** If true, renders a force-download button instead of an inline preview */
  mode?: 'preview' | 'download';
  /** Optional CSS classes for the container */
  className?: string;
}

/**
 * SecureFileViewer
 * 
 * Safely fetches files that are locked behind JWT authentication.
 * It uses Axios to fetch the binary blob (which attaches the JWT interceptor),
 * and generates a local browser URL to render the image/PDF or trigger a download.
 */
export default function SecureFileViewer({
  url,
  fileName,
  mimeType,
  mode = 'preview',
  className = ''
}: SecureFileViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Determine file category
  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';

  useEffect(() => {
    // Only automatically fetch the blob if we are in preview mode.
    // If it's a download button, we fetch it onClick instead.
    if (mode === 'preview' && url) {
      let isMounted = true;
      setLoading(true);
      setError(null);

      // We manually get the token here just in case the global axios interceptor isn't configured yet.
      const token = localStorage.getItem('jwt_token');
      
      axios.get(url, {
        responseType: 'blob',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
        .then(response => {
          if (isMounted) {
            const objectUrl = URL.createObjectURL(response.data);
            setBlobUrl(objectUrl);
            setLoading(false);
          }
        })
        .catch(err => {
          if (isMounted) {
            console.error("Failed to load secure file:", err);
            setError("Failed to load file.");
            setLoading(false);
          }
        });

      return () => {
        isMounted = false;
        // Cleanup the object URL to prevent memory leaks!
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }
      };
    }
  }, [url, mode]);

  // Handle manual download click
  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('jwt_token');
      const response = await axios.get(url, {
        responseType: 'blob',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      const objectUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Immediately clean up memory after download prompt
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      console.error("Download failed:", err);
      setError("Failed to download file.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Render Logic ----------------

  if (mode === 'download') {
    return (
      <button 
        onClick={handleDownload}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${className}`}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        <span>{loading ? 'Downloading...' : `Download ${fileName}`}</span>
      </button>
    );
  }

  // Preview Mode Renders
  return (
    <div className={`relative bg-surface border border-canvas-active rounded-xl overflow-hidden flex flex-col items-center justify-center min-h-[200px] ${className}`}>
      
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-canvas-subtle/50 backdrop-blur-sm z-10 text-brand-500">
          <Loader2 className="w-8 h-8 animate-spin mb-2" />
          <span className="text-xs font-medium">Loading secure file...</span>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center text-status-error p-4 text-center">
          <AlertCircle className="w-8 h-8 mb-2 opacity-80" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {!loading && !error && blobUrl && (
        <>
          {isImage && (
            <img 
              src={blobUrl} 
              alt={fileName} 
              className="max-w-full max-h-full object-contain"
            />
          )}

          {isPdf && (
            <iframe 
              src={blobUrl} 
              title={fileName}
              className="w-full h-full border-none"
            />
          )}

          {!isImage && !isPdf && (
            <div className="flex flex-col items-center justify-center p-8 text-ink-secondary">
              <File className="w-12 h-12 mb-3 text-neutral-400" />
              <p className="text-sm font-medium mb-1">Preview not available</p>
              <p className="text-xs text-ink-tertiary mb-4">{fileName} ({mimeType})</p>
              <button 
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-canvas border border-canvas-active hover:bg-canvas-active rounded-lg text-sm transition-colors"
              >
                <Download className="w-4 h-4" /> Download Instead
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
