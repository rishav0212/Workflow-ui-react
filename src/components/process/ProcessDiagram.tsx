import { useEffect, useRef, memo, useState, useCallback } from "react";
// @ts-ignore: bpmn-js does not have official types
import BpmnViewer from "bpmn-js/lib/NavigatedViewer";
import {
  fetchProcessXml,
  fetchHistoricActivities,
  fetchProcessHistory,
} from "../../api";

// 🟢 Types
export interface ActivityTrace {
  activityId: string;
  activityType: string;
  startTime: string;
  endTime?: string;
  taskId?: string;
  processDefinitionId: string;
  [key: string]: any;
}

export interface HistoryEvent {
  taskId?: string;
  activityId?: string;
  taskName: string;
  [key: string]: any;
}

interface ProcessDiagramProps {
  processInstanceId?: string;
  xml?: string | null;
  trace?: ActivityTrace[];
  history?: HistoryEvent[];
  activeStepIndex?: number;
  onElementClick?: (elementId: string) => void;
}

const ProcessDiagram = memo(
  ({
    processInstanceId,
    xml: propXml,
    trace: propTrace,
    history: propHistory,
    activeStepIndex,
    onElementClick,
  }: ProcessDiagramProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<any>(null);

    // Local State for Self-Fetching
    const [fetchedXml, setFetchedXml] = useState<string | null>(null);
    const [fetchedTrace, setFetchedTrace] = useState<ActivityTrace[]>([]);
    const [fetchedHistory, setFetchedHistory] = useState<HistoryEvent[]>([]);
    const [loading, setLoading] = useState(false);

    // Resolve Data
    const xml = propXml || fetchedXml;
    const trace = propTrace || fetchedTrace;
    const history = propHistory || fetchedHistory;
    const currentIndex =
      activeStepIndex !== undefined ? activeStepIndex : trace?.length || 0;

    // 🟢 HELPER: Apply Business Labels
    const applyBusinessLabels = (
      viewer: any,
      currentHistory: HistoryEvent[],
      currentTrace: ActivityTrace[],
    ) => {
      if (
        !viewer ||
        !currentHistory ||
        !currentTrace ||
        currentHistory.length === 0
      )
        return;

      const elementRegistry = viewer.get("elementRegistry");
      const eventBus = viewer.get("eventBus");
      const changedElements: any[] = [];

      // Map TaskID -> ActivityID
      const taskToActId = new Map<string, string>();
      currentTrace.forEach((r) => {
        if (r.taskId) taskToActId.set(r.taskId, r.activityId);
      });

      currentHistory.forEach((b) => {
        let actId = b.taskId ? taskToActId.get(b.taskId) : null;
        if (!actId && b.activityId) actId = b.activityId;

        if (actId) {
          const element = elementRegistry.get(actId);
          if (element) {
            element.businessObject.name = b.taskName;
            changedElements.push(element);
          }
        }
      });

      if (changedElements.length > 0) {
        eventBus.fire("elements.changed", { elements: changedElements });
      }
    };

    // 🟢 HELPER: Update Highlights
    const updateHighlights = (
      currentTrace: ActivityTrace[],
      stepIndex: number,
    ) => {
      const viewer = viewerRef.current;
      if (!viewer) return;

      const canvas = viewer.get("canvas");
      const elementRegistry = viewer.get("elementRegistry");
      const overlays = viewer.get("overlays");

      overlays.clear();
      const allElements = elementRegistry.getAll();
      allElements.forEach((el: any) => {
        canvas.removeMarker(el.id, "highlight-shape-done");
        canvas.removeMarker(el.id, "highlight-shape-active");
        canvas.removeMarker(el.id, "highlight-arrow-done");
        canvas.removeMarker(el.id, "highlight-arrow-return");
      });

      if (!currentTrace) return;

      const stepsToShow = currentTrace.slice(0, stepIndex);
      const visitedNodes = new Set<string>();
      let stepCounter = 0;

      stepsToShow.forEach((act, index) => {
        const element = elementRegistry.get(act.activityId);
        if (!element) return;

        visitedNodes.add(act.activityId);
        const isLast = index === stepsToShow.length - 1;

        if (act.activityType !== "sequenceFlow") {
          stepCounter++;
          overlays.add(act.activityId, {
            position: { top: -10, right: -10 },
            html: `<div class="diagram-badge ${isLast ? "pulse" : ""}">${stepCounter}</div>`,
          });
        }

        if (act.activityType === "sequenceFlow") {
          const targetId = element.target?.id;
          const isLoop = targetId && visitedNodes.has(targetId) && index > 0;
          canvas.addMarker(
            act.activityId,
            isLoop ? "highlight-arrow-return" : "highlight-arrow-done",
          );
        } else {
          canvas.addMarker(
            act.activityId,
            isLast ? "highlight-shape-active" : "highlight-shape-done",
          );
        }
      });
    };

    // 1. DATA FETCHING
    useEffect(() => {
      if (processInstanceId && !propXml) {
        const loadData = async () => {
          setLoading(true);
          try {
            const [rawActivities, cleanHistory] = await Promise.all([
              fetchHistoricActivities(processInstanceId),
              fetchProcessHistory(processInstanceId),
            ]);

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

            setFetchedTrace(sortedTrace);
            setFetchedHistory(cleanHistory);

            if (rawActivities.length > 0) {
              const definitionId = rawActivities[0].processDefinitionId;
              const xmlData = await fetchProcessXml(definitionId);
              setFetchedXml(xmlData);
            }
          } catch (error) {
            console.error("Failed to load process diagram data", error);
          } finally {
            setLoading(false);
          }
        };
        loadData();
      }
    }, [processInstanceId, propXml]);

    // 2. Initialize Viewer & Import XML
    useEffect(() => {
      if (!xml || !containerRef.current) return;

      let cleanXml = xml;
      try {
        cleanXml = xml.replace(/name="\$\{[^"]+\}"/g, 'name=""');
      } catch (e) {}

      if (viewerRef.current) viewerRef.current.destroy();

      const viewer = new BpmnViewer({
        container: containerRef.current,
        additionalModules: [],
      });
      viewerRef.current = viewer;

      viewer
        .importXML(cleanXml)
        .then(() => {
          const canvas: any = viewer.get("canvas");
          canvas.zoom("fit-viewport");

          // 🟢 CRITICAL: Run updates IMMEDIATELY after import
          if (history && trace) {
            applyBusinessLabels(viewer, history, trace);
            updateHighlights(trace, currentIndex); // Fixes invisible highlights
          }
        })
        .catch((err: any) => console.error("BPMN Import Error", err));

      viewer.on("element.click", (e: any) => {
        if (onElementClick) onElementClick(e.element.id);
      });

      const handleWheel = (e: WheelEvent) => {
        if (!e.ctrlKey) {
          e.preventDefault();
          e.stopPropagation();
          const canvas: any = viewer.get("canvas");
          const zoom = canvas.zoom();
          const delta = e.deltaY > 0 ? -1 : 1;
          const newScale = Math.max(
            0.2,
            Math.min(zoom * (1 + delta * 0.12), 5),
          );
          canvas.zoom(newScale, { x: e.clientX, y: e.clientY });
        }
      };

      const container = containerRef.current!;
      container.addEventListener("wheel", handleWheel, { passive: false });

      return () => {
        container.removeEventListener("wheel", handleWheel);
        viewer.destroy();
        viewerRef.current = null;
      };
    }, [xml]);

    // 3. REACTIVE UPDATES
    useEffect(() => {
      if (viewerRef.current && history.length > 0 && trace.length > 0) {
        applyBusinessLabels(viewerRef.current, history, trace);
      }
    }, [history, trace]);

    useEffect(() => {
      if (viewerRef.current) {
        updateHighlights(trace, currentIndex);
      }
    }, [trace, currentIndex]);

    const handleRecenter = useCallback(() => {
      if (viewerRef.current) {
        viewerRef.current.get("canvas").zoom("fit-viewport");
      }
    }, []);

    if (loading) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-canvas-subtle">
          <div className="flex flex-col items-center gap-3 opacity-60">
            <i className="fas fa-circle-notch fa-spin text-2xl text-brand-500"></i>
            <span className="text-xs font-bold text-ink-tertiary">
              Loading Diagram...
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-full relative group">
        <div
          ref={containerRef}
          className="w-full h-full bg-[#fafaf9] diagram-container outline-none"
        />

        <button
          onClick={handleRecenter}
          className="absolute top-10 right-10 w-12 h-12 bg-white hover:bg-brand-50 text-ink-secondary hover:text-brand-600 rounded-full shadow-floating border border-canvas-active flex items-center justify-center transition-all z-30 group"
          title="Recenter Diagram"
        >
          <i className="fas fa-expand text-lg group-active:scale-90 transition-transform"></i>
        </button>

        <style>{`
        .diagram-container { 
            background-image: radial-gradient(#d6d3d1 1px, transparent 1px); 
            background-size: 20px 20px; 
            cursor: grab;
            padding: 15px;
        }
        .diagram-container:active { cursor: grabbing; }
        
        .djs-container svg { outline: none; cursor: inherit !important; }
        .djs-element { cursor: pointer; }

        /* 🟢 SMOOTH TRANSITIONS for all diagram elements */
        .djs-visual rect, .djs-visual circle, .djs-visual path, .djs-visual polygon {
            transition: stroke 0.4s ease-in-out, fill 0.4s ease-in-out, stroke-width 0.4s ease;
        }

        .highlight-shape-done .djs-visual rect, .highlight-shape-done .djs-visual circle { fill: #ecfccb !important; stroke: #65a30d !important; stroke-width: 2px !important; }
        .highlight-shape-active .djs-visual rect, .highlight-shape-active .djs-visual circle { fill: #ffedd5 !important; stroke: #ea580c !important; stroke-width: 4px !important; filter: drop-shadow(0 0 5px rgba(234,88,12,0.4)); }
        
        .highlight-arrow-done .djs-visual path { stroke: #65a30d !important; stroke-width: 3px !important; }
        .highlight-arrow-return .djs-visual path { stroke: #9333ea !important; stroke-width: 3px !important; stroke-dasharray: 5; }

        .diagram-badge {
          background: #1f2937; color: white; border-radius: 50%; width: 18px; height: 18px;
          display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2); z-index: 100;
        }
        .diagram-badge.pulse { background: #ea580c; transform: scale(1.2); }
        
        .djs-palette, .bjs-powered-by { display: none !important; }
      `}</style>
      </div>
    );
  },
);

export default ProcessDiagram;
