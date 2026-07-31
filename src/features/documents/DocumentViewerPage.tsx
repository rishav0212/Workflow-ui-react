import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import SecureFileViewer from '../../components/common/SecureFileViewer';
import { API_BASE_URL } from '../../config';

/**
 * DocumentViewerPage
 * 
 * A dedicated, production-ready route for viewing documents stored in the backend.
 * 
 * Expected Route: /:tenantId/documents/:documentId/preview
 */
export default function DocumentViewerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const { documentId } = useParams();

  if (!documentId) {
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
  // Now using the /url endpoint to fetch a Signed URL for direct cloud storage access
  const fullPreviewUrl = `${API_BASE_URL}/api/storage/documents/${documentId}/url`;
  
  // State to hold the metadata returned by the backend via SecureFileViewer
  const [fileName, setFileName] = React.useState('Loading...');
  const [detectedMimeType, setDetectedMimeType] = React.useState('application/octet-stream');

  const handleMetadataLoaded = (name: string, mime: string) => {
    setFileName(name);
    setDetectedMimeType(mime);
  };

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
            <span className="text-xs text-neutral-500 truncate max-w-xl">{documentId}</span>
          </div>
        </div>
        
        <div className="flex items-center">
          <SecureFileViewer 
            url={fullPreviewUrl}
            fileName={fileName}
            mimeType={detectedMimeType}
            mode="download"
            onLoadMetadata={handleMetadataLoaded}
          />
        </div>
      </header>

      {/* Main Content Area - Full screen, no borders */}
      <main className="flex-1 overflow-hidden flex justify-center items-center bg-[#2b2b2b]">
        <SecureFileViewer 
          url={fullPreviewUrl}
          fileName={fileName}
          mimeType={detectedMimeType}
          mode="preview"
          onLoadMetadata={handleMetadataLoaded}
          className="w-full h-full border-none bg-transparent rounded-none"
        />
      </main>
    </div>
  );
}
