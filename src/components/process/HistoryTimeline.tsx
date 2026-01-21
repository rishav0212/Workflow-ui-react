import { memo, useEffect, useState } from "react";
import { fetchProcessHistory, fetchTaskRender } from "../../api";
import SubmissionModal from "../../SubmissionModal";

export interface HistoryEvent {
  taskId?: string;
  taskName: string;
  type?: string;
  status?: string;
  startTime: string;
  endTime?: string | null;
  formKey?: string;
  formSubmissionId?: string;
  completedBy?: string;
  submittedFormKey?: string;
}

interface HistoryTimelineProps {
  processInstanceId: string | null | undefined;
  onDataLoaded?: (data: HistoryEvent[]) => void;
  compact?: boolean;
  highlightTaskId?: string | null;
}

const HistoryTimeline = memo(
  ({
    processInstanceId,
    onDataLoaded,
    compact = false,
    highlightTaskId = null,
  }: HistoryTimelineProps) => {
    const [history, setHistory] = useState<HistoryEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modal State
    const [selectedSubmission, setSelectedSubmission] = useState<{
      id: string;
      formKey: string;
      title: string;
    } | null>(null);
    const [viewingLoading, setViewingLoading] = useState(false);
    useEffect(() => {
      if (highlightTaskId && history.length > 0) {
        const targetEvent = history.find((h) => h.taskId === highlightTaskId);

        // Only open if found AND it hasn't been opened yet (check selectedSubmission to prevent loops)
        if (targetEvent && !selectedSubmission) {
          // Reuse your existing view handler
          handleViewEvent(targetEvent);
        }
      }
    }, [history, highlightTaskId]);
    useEffect(() => {
      if (!processInstanceId) return;

      const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
          const data = await fetchProcessHistory(processInstanceId);
          setHistory(data);
          if (onDataLoaded) onDataLoaded(data);
        } catch (err) {
          console.error("Failed to load history", err);
          setError("Failed to load history.");
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }, [processInstanceId]);

    const handleViewEvent = async (event: HistoryEvent) => {
      if (!event.formSubmissionId) return;

      setViewingLoading(true);
      let formKey = event.formKey || event.submittedFormKey;

      if (!formKey && event.taskId) {
        try {
          const taskInfo = await fetchTaskRender(event.taskId);
          formKey = taskInfo?.formKey;
        } catch (e) {
          console.error("Could not resolve form key", e);
        }
      }

      setViewingLoading(false);

      if (formKey) {
        setSelectedSubmission({
          id: event.formSubmissionId,
          formKey: formKey,
          title: `View: ${event.taskName}`,
        });
      } else {
        alert("Could not load form details for this event.");
      }
    };

    const sortedHistory = [...history].sort((a, b) => {
      if (!a.endTime && b.endTime) return -1;
      if (a.endTime && !b.endTime) return 1;
      if (!a.endTime && !b.endTime) {
        return (
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
      }
      return new Date(b.endTime!).getTime() - new Date(a.endTime!).getTime();
    });

    const formatDuration = (start: string, end?: string | null) => {
      if (!end) return null;
      const ms = new Date(end).getTime() - new Date(start).getTime();
      const minutes = Math.floor(ms / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) return `${days}d ${hours % 24}h`;
      if (hours > 0) return `${hours}h ${minutes % 60}m`;
      return `${minutes}m`;
    };

    const getEventConfig = (event: HistoryEvent) => {
      const type = event.type || "";
      const name = (event.taskName || "").toLowerCase();

      if (type === "startEvent")
        return {
          icon: "fas fa-play",
          label: "START",
          color: "text-status-success",
          bg: "bg-status-success/10",
          border: "border-status-success/20",
        };
      if (type === "endEvent")
        return {
          icon: "fas fa-check-double",
          label: "END",
          color: "text-neutral-600",
          bg: "bg-neutral-100",
          border: "border-neutral-200",
        };
      if (name.includes("email") || type === "serviceTask")
        return {
          icon: "fas fa-envelope",
          label: "EMAIL",
          color: "text-status-info",
          bg: "bg-status-info/10",
          border: "border-status-info/20",
        };
      return {
        icon: "fas fa-user",
        label: "TASK",
        color: "text-brand-500",
        bg: "bg-brand-50",
        border: "border-brand-100",
      };
    };

    if (loading) {
      return (
        <div
          className={`space-y-6 ${compact ? "p-2" : "p-4 pl-8"} border-l-2 border-canvas-active ml-2 mt-4`}
        >
          {[1, 2, 3].map((i) => (
            <div key={i} className="relative pl-6 animate-pulse opacity-60">
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-neutral-200"></div>
              <div className="h-16 bg-neutral-100 rounded-xl"></div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-8 text-center text-status-error text-sm">
          <i className="fas fa-exclamation-circle mb-2 text-lg"></i>
          <p>{error}</p>
        </div>
      );
    }

    if (!loading && history.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-center opacity-60">
          <i className="far fa-calendar-times text-2xl mb-2"></i>
          <p className="text-xs font-medium">No events recorded</p>
        </div>
      );
    }

    return (
      <>
        <div className={`relative ${compact ? "px-2 py-2" : "px-4 py-4"}`}>
          <div className="absolute top-0 bottom-0 left-[23px] w-[2px] bg-gradient-to-b from-canvas-active via-canvas-active/50 to-transparent"></div>

          <div className="space-y-4">
            {sortedHistory.map((event, idx) => {
              const isCompleted = !!event.endTime;
              const hasData = !!(event.formSubmissionId || event.formKey);
              const config = getEventConfig(event);
              const duration = formatDuration(event.startTime, event.endTime);

              return (
                <div
                  key={idx}
                  className="relative pl-12 group"
                  style={{
                    animationDelay: `${idx * 50}ms`,
                    animation: "fadeIn 0.4s ease-out forwards",
                    opacity: 0,
                  }}
                >
                  <div className="absolute left-0 top-2 w-12 h-full flex justify-center pointer-events-none">
                    <div
                      className={`z-10 w-8 h-8 rounded-full border-2 bg-white flex items-center justify-center shadow-soft transition-all ${
                        isCompleted
                          ? "border-neutral-200"
                          : "border-brand-400 animate-pulse shadow-brand-sm"
                      }`}
                    >
                      <i
                        className={`${config.icon} ${config.color} text-[10px]`}
                      ></i>
                    </div>
                  </div>

                  <div
                    onClick={() => hasData && handleViewEvent(event)}
                    className={`bg-white border rounded-xl p-3 transition-all duration-200 ${
                      hasData
                        ? "cursor-pointer hover:border-brand-400 hover:shadow-lifted active:scale-[0.99]"
                        : "border-canvas-subtle"
                    } ${viewingLoading ? "opacity-70 pointer-events-none" : ""}`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${config.bg} ${config.color} border ${config.border}`}
                          >
                            {config.label}
                          </span>
                          {!isCompleted && (
                            <span className="text-[9px] font-bold uppercase text-brand-600 animate-pulse">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <h4
                          className={`font-bold text-ink-primary leading-tight truncate ${compact ? "text-xs" : "text-sm"}`}
                        >
                          {event.taskName || "Unnamed Task"}
                        </h4>
                      </div>

                      <div className="text-right whitespace-nowrap">
                        <div className="text-[11px] font-bold text-ink-primary font-mono leading-none">
                          {new Date(
                            event.endTime || event.startTime,
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>

                    {(isCompleted || hasData || event.completedBy) && (
                      <div className="mt-2.5 flex items-center justify-between border-t border-slate-50 pt-2">
                        <div className="flex items-center gap-2">
                          {duration && (
                            <span className="text-[10px] text-neutral-400 flex items-center gap-1 font-medium">
                              <i className="far fa-hourglass text-[9px]"></i>{" "}
                              {duration}
                            </span>
                          )}

                          {/* 👇 CHANGED: Removed '!compact' check so it always shows */}
                          {event.completedBy && (
                            <span className="text-[10px] text-neutral-500 flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                              <i className="fas fa-user-check text-[9px]"></i>{" "}
                              {event.completedBy}
                            </span>
                          )}
                        </div>

                        {hasData && (
                          <span className="text-[9px] font-bold text-brand-600 flex items-center gap-1 hover:underline">
                            DATA <i className="fas fa-arrow-right"></i>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>

        <SubmissionModal
          isOpen={!!selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          title={selectedSubmission?.title || "View Data"}
          formKey={selectedSubmission?.formKey || ""}
          submissionId={selectedSubmission?.id || ""}
          isReadOnly={true}
        />
      </>
    );
  },
);

export default HistoryTimeline;
