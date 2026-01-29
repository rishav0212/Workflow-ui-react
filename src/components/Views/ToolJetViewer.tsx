import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchToolJetUrl } from "../../api";
import { toast } from "react-hot-toast";

const ToolJetViewer = () => {
  const { appId } = useParams(); // We will get the App ID from the URL
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appId) return;

    setLoading(true);
    fetchToolJetUrl(appId)
      .then((url) => {
        setEmbedUrl(url);
      })
      .catch((err) => {
        console.error("Failed to load ToolJet app", err);
        toast.error("Could not load application. Please contact admin.");
      })
      .finally(() => setLoading(false));
  }, [appId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-4">
          <i className="fas fa-circle-notch fa-spin text-brand-500 text-3xl"></i>
          <p className="text-neutral-500 text-sm">
            Securing connection to App...
          </p>
        </div>
      </div>
    );
  }

  if (!embedUrl) return null;

  return (
    <div className="w-full h-full bg-white">
      <iframe
        src={embedUrl}
        className="w-full h-full border-none"
        title="ToolJet Application"
        allow="camera; microphone; geolocation" 
      />
    </div>
  );
};

export default ToolJetViewer;
