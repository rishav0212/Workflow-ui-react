import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import BpmnViewer from "bpmn-js";
import {
  fetchProcessXml,
  fetchHistoricActivities,
  fetchProcessHistory,
} from "./api";
import SubmissionModal from "./SubmissionModal";

export default function InstanceInspector() {
  const { instanceId } = useParams();
  const [selectedSubmission, setSelectedSubmission] = useState<{
    key: string;
    id: string;
    name: string;
  } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [xml, setXml] = useState("");
  const viewerRef = useRef<HTMLDivElement>(null);
  const bpmnViewer = useRef<any>(null);

  useEffect(() => {
    const init = async () => {
      // 1. Fetch historical steps and full activity path
      const [activities, taskHistory] = await Promise.all([
        fetchHistoricActivities(instanceId!),
        fetchProcessHistory(instanceId!),
      ]);
      setHistory(taskHistory);

      // 2. Fetch XML from the first activity's definition
      if (activities.length > 0) {
        const xmlData = await fetchProcessXml(
          activities[0].processDefinitionId
        );
        setXml(xmlData);
        renderPath(xmlData, activities);
      }
    };
    init();
  }, [instanceId]);

  const renderPath = async (xmlContent: string, activities: any[]) => {
    if (!viewerRef.current) return;

    if (bpmnViewer.current) bpmnViewer.current.destroy();
    bpmnViewer.current = new BpmnViewer({ container: viewerRef.current });

    await bpmnViewer.current.importXML(xmlContent);
    const canvas = bpmnViewer.current.get("canvas");

    // 🟢 Highlight the path
    activities.forEach((act) => {
      // Finished activities = Green
      if (act.endTime) {
        canvas.addMarker(act.activityId, "path-completed");
      } else {
        // Active activities = Orange
        canvas.addMarker(act.activityId, "path-active");
      }
    });

    canvas.zoom("fit-viewport");
  };

  return (
    <div className="h-screen flex flex-col bg-canvas overflow-hidden">
      <header className="bg-surface border-b p-4 flex justify-between items-center shadow-soft z-10">
        <div className="flex items-center gap-4">
          <Link to="/admin/instances" className="btn-icon">
            <i className="fas fa-arrow-left"></i>
          </Link>
          <h2 className="text-lg font-serif font-bold text-ink-primary">
            Live Path Inspector:{" "}
            <span className="text-brand-500">{instanceId}</span>
          </h2>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: Step History with Submission Links */}
        <div className="w-80 bg-surface border-r p-6 overflow-y-auto custom-scrollbar">
          <h3 className="text-[10px] font-black uppercase text-ink-tertiary tracking-widest mb-6">
            Execution Log
          </h3>
          <div className="space-y-6">
            {history.map((step, idx) => (
              <div
                key={idx}
                className="relative pl-6 border-l-2 border-canvas-active"
              >
                <div
                  className={`absolute -left-[7px] top-0 w-3 h-3 rounded-full ${
                    step.endTime ? "bg-sage-500" : "bg-brand-500 animate-pulse"
                  }`}
                ></div>
                <div className="text-sm font-bold text-ink-primary leading-none">
                  {step.taskName}
                </div>
                <div className="text-[10px] text-ink-tertiary mt-1">
                  {new Date(step.startTime).toLocaleString()}
                </div>
                {step.formSubmissionId && (
                  <button
                    onClick={() =>
                      setSelectedSubmission({
                        key: step.formKey,
                        id: step.formSubmissionId,
                        name: step.taskName,
                      })
                    }
                    className="mt-2 text-[10px] font-black text-brand-600 bg-brand-50 px-2 py-1 rounded hover:bg-brand-100 transition-colors"
                  >
                    <i className="fas fa-database mr-1"></i> VIEW SUBMISSION
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Live Diagram */}
        <div className="flex-1 bg-white relative">
          <div ref={viewerRef} className="absolute inset-0" />
          <style>{`
            .path-completed .djs-visual rect, .path-completed .djs-visual circle { 
              fill: #f0fdf4 !important; stroke: #22c55e !important; stroke-width: 3px !important; 
            }
            .path-active .djs-visual rect, .path-active .djs-visual circle { 
              fill: #fff7ed !important; stroke: #f97316 !important; stroke-width: 3px !important; stroke-dasharray: 5 !important;
            }
          `}</style>
        </div>
      </div>

      {/* 🟢 Add the Modal at the bottom of the JSX */}
      <SubmissionModal
        isOpen={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        title={`Data Log: ${selectedSubmission?.name}`}
        formKey={selectedSubmission?.key || ""}
        submissionId={selectedSubmission?.id || ""}
      />
    </div>
  );
}
