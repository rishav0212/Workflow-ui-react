import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  fetchProcessXml,
  fetchHistoricActivities,
  fetchTaskMetadata,
  fetchInstanceByKeys,
} from "./api";
import HistoryTimeline, {
  type HistoryEvent,
} from "./components/process/HistoryTimeline";
import ProcessDiagram from "./components/process/ProcessDiagram";

export default function InstanceInspector() {
  const { instanceId: pathInstanceId } = useParams();
  const [searchParams] = useSearchParams();

  // 🟢 Capture params clearly
  const queryInstanceId = searchParams.get("instanceId");
  const queryBusinessKey = searchParams.get("businessKey");
  const queryTaskId = searchParams.get("taskId");
  const queryProcessKey = searchParams.get("processKey");

  const [effectiveId, setEffectiveId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false); // 🟢 Add loading state for resolution

  const [businessHistory, setBusinessHistory] = useState<HistoryEvent[]>([]);
  const [technicalTrace, setTechnicalTrace] = useState<any[]>([]);
  const [xml, setXml] = useState<string | null>(null);

  const [replayIndex, setReplayIndex] = useState<number>(0);
  const [maxSteps, setMaxSteps] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // 🟢 ROBUST RESOLUTION LOGIC
  useEffect(() => {
    let active = true; // Prevents race conditions

    const resolveContext = async () => {
      // 1. Reset ID immediately to clear previous view
      setEffectiveId(null);
      setIsResolving(true);

      try {
        // Priority 1: Direct Instance ID
        const directId = pathInstanceId || queryInstanceId;
        if (directId) {
          if (active) setEffectiveId(directId);
          return;
        }

        // Priority 2: Task ID -> Instance ID
        if (queryTaskId) {
          try {
            const taskData = await fetchTaskMetadata(queryTaskId);
            if (active && taskData && taskData.processInstanceId) {
              setEffectiveId(taskData.processInstanceId);
            }
          } catch (e) {
            console.error("Failed to resolve task", e);
          }
          return;
        }

        // Priority 3: Process Key + Business Key
        if (queryProcessKey && queryBusinessKey) {
          try {
            const id = await fetchInstanceByKeys(
              queryProcessKey,
              queryBusinessKey,
            );
            if (active) {
              if (id) {
                setEffectiveId(id);
              } else {
                console.warn(
                  `No instance found for Process: ${queryProcessKey}, Key: ${queryBusinessKey}`,
                );
              }
            }
          } catch (e) {
            console.error("Failed to resolve keys", e);
          }
          return;
        }

        // Priority 4: Business Key Only
        // (Warning: This might find the wrong process if keys aren't unique across definitions)
        if (queryBusinessKey && !queryProcessKey) {
          try {
            // Pass null for processKey to search globally by Business Key
            const id = await fetchInstanceByKeys("", queryBusinessKey);
            if (active && id) setEffectiveId(id);
          } catch (e) {
            console.error("Failed to resolve business key", e);
          }
        }
      } finally {
        if (active) setIsResolving(false);
      }
    };

    resolveContext();

    return () => {
      active = false; // Cleanup if params change quickly
    };
  }, [
    pathInstanceId,
    queryInstanceId,
    queryTaskId,
    queryBusinessKey,
    queryProcessKey,
  ]);

  // 🟢 2. FETCH DATA (Using effectiveId)
  useEffect(() => {
    const init = async () => {
      if (!effectiveId) return;

      try {
        const rawActivities = await fetchHistoricActivities(effectiveId);

        const sortedTrace = [...rawActivities].sort((a: any, b: any) => {
          const timeA = new Date(a.startTime).getTime();
          const timeB = new Date(b.startTime).getTime();
          if (timeA !== timeB) return timeA - timeB;
          if (
            a.activityType === "sequenceFlow" &&
            b.activityType !== "sequenceFlow"
          )
            return -1;
          if (
            a.activityType !== "sequenceFlow" &&
            b.activityType === "sequenceFlow"
          )
            return 1;
          return 0;
        });

        setTechnicalTrace(sortedTrace);
        setMaxSteps(sortedTrace.length);
        setReplayIndex(sortedTrace.length);

        if (rawActivities.length > 0) {
          const xmlData = await fetchProcessXml(
            rawActivities[0].processDefinitionId,
          );
          setXml(xmlData);
        }
      } catch (e) {
        console.error("Failed to load instance", e);
      }
    };
    init();
  }, [effectiveId]);

  // ... (Keep Auto-Play Logic) ...
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setReplayIndex((prev) => {
          if (prev >= maxSteps) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isPlaying, maxSteps]);

  const handleHistoryLoaded = useCallback((data: HistoryEvent[]) => {
    setBusinessHistory(data);
  }, []);

  return (
    <div className="h-full flex flex-col bg-canvas overflow-hidden font-sans">
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT SIDEBAR */}
        <div className="w-96 bg-surface border-r border-canvas-active flex flex-col z-20 shadow-xl">
          <div className="p-5 border-b border-canvas-active bg-surface-elevated">
            <h3 className="text-[10px] font-black uppercase text-ink-tertiary tracking-widest flex items-center gap-2">
              <i className="fas fa-history"></i> Business Log
            </h3>

            {/* Context Info */}
            <div className="mt-3 flex flex-col gap-1.5 pl-0.5">
              {queryBusinessKey && (
                <div
                  className="text-[10px] text-ink-secondary flex items-center gap-2"
                  title="Business Key"
                >
                  <i className="fas fa-tag w-3 opacity-50"></i>
                  <span className="font-mono truncate">{queryBusinessKey}</span>
                </div>
              )}
              <div
                className="text-[10px] text-ink-tertiary flex items-center gap-2"
                title="Instance ID"
              >
                <i className="fas fa-fingerprint w-3 opacity-50"></i>
                <span className="font-mono truncate opacity-70">
                  {/* 🟢 Show resolving state */}
                  {isResolving ? (
                    <span className="animate-pulse">Resolving...</span>
                  ) : (
                    effectiveId || "No Instance Found"
                  )}
                </span>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-surface/50">
            {effectiveId && (
              <HistoryTimeline
                processInstanceId={effectiveId}
                onDataLoaded={handleHistoryLoaded}
                compact={true}
                highlightTaskId={queryTaskId}
              />
            )}
          </div>
        </div>

        {/* CENTER: Diagram */}
        <div className="flex-1 relative bg-[#FDFDFD] ">
          <ProcessDiagram
            xml={xml}
            trace={technicalTrace}
            history={businessHistory}
            activeStepIndex={replayIndex}
          />

          {/* ... (Keep Right Overlay Stepper exactly as is) ... */}
          <div className="absolute right-10 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-4">
            <div className="h-[400px] w-3 bg-white/50 backdrop-blur rounded-full border border-canvas-active shadow-sm relative group hover:w-4 transition-all duration-200">
              <input
                type="range"
                min="0"
                max={maxSteps}
                value={replayIndex}
                onChange={(e) => {
                  setReplayIndex(Number(e.target.value));
                  setIsPlaying(false);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize z-20 appearance-none"
                style={{ writingMode: "vertical-lr", direction: "rtl" }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 bg-brand-500 rounded-full transition-all duration-100 ease-out"
                style={{ height: `${(replayIndex / maxSteps) * 100}%` }}
              />
              <div
                className="absolute left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-2 border-brand-500 rounded-full shadow-md z-10 pointer-events-none transition-all duration-100 ease-out flex items-center justify-center"
                style={{
                  bottom: `calc(${(replayIndex / maxSteps) * 100}% - 12px)`,
                }}
              >
                <i className="fas fa-sort text-[10px] text-brand-600"></i>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-md shadow-sm border border-canvas-active p-1.5 rounded-lg flex flex-col gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${isPlaying ? "bg-brand-100 text-brand-600" : "hover:bg-brand-50 text-ink-secondary hover:text-brand-600"}`}
                title={isPlaying ? "Pause" : "Auto Play"}
              >
                <i className={`fas ${isPlaying ? "fa-pause" : "fa-play"}`}></i>
              </button>

              <button
                onClick={() => {
                  setReplayIndex(maxSteps);
                  setIsPlaying(false);
                }}
                className="w-8 h-8 flex items-center justify-center hover:bg-brand-50 text-ink-secondary hover:text-brand-600 rounded-md transition-colors"
                title="Jump to End"
              >
                <i className="fas fa-fast-forward"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
