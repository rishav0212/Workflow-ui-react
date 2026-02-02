import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api"; // Your Axios instance with JWT

const ToolJetViewer = () => {
  const { appId } = useParams();
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  useEffect(() => {
    const initSecureSession = async () => {
      try {
        // Step 1: Exchange JWT for a short-lived ticket
        const response = await api.post(
          `/api/tooljet/embed-ticket?appId=${appId}`,
        );
        // Step 2: Use the ticket URL for the iframe
        // Ensure you point to your Spring Boot Backend (Port 8080)
        setIframeUrl(`http://localhost:8080${response.data.iframeUrl}`);
      } catch (err) {
        console.error("❌ BFF Security Error:", err);
      }
    };

    if (appId) initSecureSession();
  }, [appId]);

  if (!iframeUrl)
    return (
      <div className="p-10 text-center">Establishing Secure Gateway...</div>
    );

  return (
    <div className="w-full h-full">
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
