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
    <div className="flex flex-col h-screen w-screen bg-neutral-900 text-neutral-200 overflow-hidden font-sans">
      {/* Header - Minimal, Dark, Professional */}
      <header className="bg-neutral-950 border-b border-neutral-800 px-4 py-3 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              // Attempt to close tab, fallback to going back if it fails
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                window.close();
              }
            }}
            className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors text-neutral-300 hover:text-white"
            title="Close or Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold text-neutral-100">{fileName}</h1>
            <span className="text-xs text-neutral-500 truncate max-w-xl">{objectKey}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area - Full screen, no borders */}
      <main className="flex-1 overflow-hidden flex justify-center items-center bg-[#2b2b2b]">
        <SecureFileViewer 
          url={fullPreviewUrl}
          fileName={fileName}
          mimeType={detectedMimeType}
          mode="preview"
          className="w-full h-full border-none bg-transparent rounded-none"
        />
      </main>
    </div>
  );
}
