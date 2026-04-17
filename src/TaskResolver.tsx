import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchTasksByBusinessKey } from "./api"; // We will add this to api.ts

export default function TaskResolver({
  currentUser,
}: {
  currentUser?: string;
}) {
  const { tenantId, processKey, businessKey } = useParams<{
    tenantId: string;
    processKey: string;
    businessKey: string;
  }>();

  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const resolveTask = async () => {
      try {
        // Query the backend for this specific process and business key
        const tasks = await fetchTasksByBusinessKey(
          processKey!,
          businessKey!,
          currentUser,
        );

        if (!isMounted) return;

        if (tasks && tasks.length > 0) {
          // Task found! Redirect seamlessly directly into the inbox viewer
          // Using { replace: true } prevents them from hitting the "back" button into this resolver
          navigate(`/${tenantId}/inbox/task/${tasks[0].id}`, { replace: true });
        } else {
          setError(`No active task found for Business Key: ${businessKey}`);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to resolve task:", err);
        setError("An error occurred while trying to locate this task.");
      }
    };

    if (processKey && businessKey && tenantId) {
      resolveTask();
    }
  }, [processKey, businessKey, tenantId, currentUser, navigate]);

  // Loading State (Matches your App.tsx loading spinner)
  if (!error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-canvas h-full min-h-[600px] animate-fadeIn">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-soft border border-canvas-subtle">
          <i className="fas fa-circle-notch fa-spin text-brand-500 text-3xl"></i>
        </div>
        <h2 className="text-xl font-bold text-ink-primary mb-2">
          Locating Task...
        </h2>
        <p className="text-sm text-neutral-500 max-w-sm text-center">
          Searching for business key{" "}
          <span className="font-mono text-brand-600 bg-brand-50 px-1 py-0.5 rounded">
            {businessKey}
          </span>
        </p>
      </div>
    );
  }

  // Error State (Matches your empty states)
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-canvas h-full min-h-[600px] animate-fadeIn p-6">
      <div className="bg-white p-8 rounded-2xl shadow-floating border border-status-error/30 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-status-error/10 rounded-full flex items-center justify-center mx-auto mb-5 text-status-error shadow-sm">
          <i className="fas fa-exclamation-circle text-2xl"></i>
        </div>
        <h2 className="text-xl font-bold text-ink-primary mb-2">
          Task Not Found
        </h2>
        <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
          {error} It may have already been completed or assigned to someone
          else.
        </p>
        <button
          onClick={() => navigate(`/${tenantId}/inbox`)}
          className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-xl transition-all shadow-brand-md hover:shadow-brand-lg"
        >
          Return to Inbox
        </button>
      </div>
    </div>
  );
}
