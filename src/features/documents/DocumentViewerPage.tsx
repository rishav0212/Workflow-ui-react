import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import SecureFileViewer from '../../components/common/SecureFileViewer';
import { API_BASE_URL } from '../../config';

/**
 * DocumentViewerPage
 * 
 * A dedicated, production-ready route for viewing documents stored in GCS.
 * 
 * Expected Route: /documents/preview/*
 * Example URL: /documents/preview/uploads/documents/2026-07-28/Derma-123.jpeg
 * 
 * It extracts the wildcard path ('*') which represents the GCS objectKey,
 * reconstructs the secure backend preview URL, and feeds it to SecureFileViewer.
 */
export default function DocumentViewerPage() {
  const navigate = useNavigate();
  
  // React Router puts the matched wildcard path into the splat ('*') parameter.
  const params = useParams();
  const objectKey = params['*'];

  if (!objectKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-canvas text-ink">
        <div className="p-8 bg-surface border border-canvas-active rounded-xl text-center shadow-sm">
          <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Document Not Found</h2>
          <p className="text-ink-tertiary mb-6">No document path was provided in the URL.</p>
          <button 
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Reconstruct the full backend API preview URL.
  // We use the configured API_BASE_URL from your config.ts file to ensure it works
  // perfectly in both local dev (localhost) and production (Cloud Run).
  const fullPreviewUrl = `${API_BASE_URL}/api/storage/gcs/preview/${objectKey}`;
  
  // Attempt to extract the original filename from the end of the objectKey for display purposes
  const fileName = objectKey.split('/').pop() || 'document.file';

  // Guess the MIME type from the file extension so SecureFileViewer knows if it's an image or PDF
  const getMimeType = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      case 'gif': return 'image/gif';
      case 'webp': return 'image/webp';
      case 'pdf': return 'application/pdf';
      default: return 'application/octet-stream';
    }
  };

  const detectedMimeType = getMimeType(fileName);

  return (
    <div className="flex flex-col min-h-screen bg-canvas">
      {/* Header */}
      <header className="bg-surface border-b border-canvas-active px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-canvas-active rounded-lg transition-colors text-ink-secondary hover:text-ink"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-ink">Document Viewer</h1>
            <span className="text-xs text-ink-tertiary truncate max-w-md">{objectKey}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto p-6 md:p-12 flex justify-center">
        <div className="w-full max-w-5xl bg-surface border border-canvas-active rounded-2xl shadow-sm p-4 h-[calc(100vh-140px)] min-h-[600px] flex flex-col">
          <SecureFileViewer 
            url={fullPreviewUrl}
            fileName={fileName}
            mimeType={detectedMimeType}
            mode="preview"
            className="flex-1 w-full h-full bg-canvas/30 rounded-xl"
          />
        </div>
      </main>
    </div>
  );
}
