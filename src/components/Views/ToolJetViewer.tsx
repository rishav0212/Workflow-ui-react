import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api";
import { API_BASE_URL } from "../../config"; // 🟢 Import the base URL

// 🟢 ADDED: Accepts optional appId prop for caching, falls back to useParams so nothing breaks!
const ToolJetViewer = ({ appId: propAppId }: { appId?: string } = {}) => {
  const params = useParams();
  const appId = propAppId || params.appId;

  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initSecureSession = async () => {
      try {
        setError(null);
        // Step 1: Exchange JWT for a short-lived ticket
        const response = await api.post(
          `/api/tooljet/embed-ticket?appId=${appId}`,
        );

        // Step 2: Use the ticket URL for the iframe
        // 🟢 Remove localhost:8080 and use dynamic config
        const cleanBaseUrl = API_BASE_URL.replace(/\/$/, ""); // Remove trailing slash if it exists
        setIframeUrl(`${cleanBaseUrl}${response.data.iframeUrl}`);
      } catch (err: any) {
        console.error("❌ BFF Security Error:", err);
        setError(
          err.response?.data?.message ||
            "Failed to establish secure connection. Please verify your permissions.",
        );
      }
    };

    if (appId) initSecureSession();
  }, [appId]);

  // 🔴 Polished Error State
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-canvas text-center p-8">
        <div className="w-20 h-20 bg-status-error/10 rounded-2xl flex items-center justify-center mb-6 text-status-error shadow-sm">
          <i className="fas fa-shield-alt text-3xl"></i>
        </div>
        <h2 className="text-xl font-bold text-ink-primary mb-2">
          Access Denied
        </h2>
        <p className="text-status-error font-medium max-w-md">{error}</p>
      </div>
    );
  }

  // 🟡 Polished Loading State
  if (!iframeUrl)
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-canvas text-center p-8">
        <div className="relative mb-6">
          <div className="w-16 h-16 border-4 border-canvas-active rounded-full"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <h2 className="text-lg font-bold text-ink-primary mb-1">
          Establishing Secure Gateway
        </h2>
        <p className="text-neutral-500 text-sm">
          Negotiating encrypted session with ToolJet...
        </p>
      </div>
    );

  // 🟢 Success State (The Iframe)
  return (
    <div className="w-full h-full bg-canvas animate-fadeIn">
      <iframe
        src={iframeUrl}
        className="w-full h-full border-none"
        title="Secured ToolJet Instance"
        allow="camera; microphone; geolocation; clipboard-write"
      />
    </div>
  );
};

export default ToolJetViewer;
