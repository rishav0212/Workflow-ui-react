import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import BpmnViewer from "bpmn-js";

// 🟢 NEW: Imports for professional XML formatting
// @ts-ignore
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
// @ts-ignore
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

import {
  fetchProcessVersions,
  fetchProcessXml,
  fetchHistoricActivitiesForDefinition,
} from "./api";

export default function ProcessViewer() {
  const { processKey } = useParams();
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [xml, setXml] = useState("");
  const [viewMode, setViewMode] = useState<"diagram" | "xml">("diagram");
  const [selectedElement, setSelectedElement] = useState<any>(null);

  const [showHeatmap, setShowHeatmap] = useState(false);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);

  const viewerRef = useRef<HTMLDivElement>(null);
  const bpmnViewer = useRef<any>(null);

  // 1. Fetch Version History (Original Logic Preserved)
  useEffect(() => {
    if (processKey) {
      fetchProcessVersions(processKey).then((data) => {
        setVersions(data);
        if (data.length > 0) setSelectedId(data[0].id);
      });
    }
  }, [processKey]);

  // 2. Fetch XML for selected version (Original Logic Preserved)
  useEffect(() => {
    if (selectedId) fetchProcessXml(selectedId).then(setXml);
  }, [selectedId]);

  // 3. Diagram Logic & Heatmap (Original Logic Preserved)
  useEffect(() => {
    if (viewMode === "diagram" && xml && viewerRef.current) {
      if (bpmnViewer.current) {
        bpmnViewer.current.destroy();
      }

      bpmnViewer.current = new BpmnViewer({
        container: viewerRef.current,
      });

      bpmnViewer.current.on("element.click", (event: any) => {
        const { element } = event;
        const bo = element.businessObject;
        const props: Record<string, string> = {
          ID: element.id,
          Type: element.type.replace("bpmn:", ""),
          Name: bo.name || "Unnamed",
        };
        if (bo.documentation?.[0]?.text)
          props["Documentation"] = bo.documentation[0].text;
        const attrs = bo.$attrs || {};
        Object.keys(attrs).forEach((key) => {
          const cleanKey = key.includes(":") ? key.split(":")[1] : key;
          const label = cleanKey.replace(/([A-Z])/g, " $1").trim();
          props[label] = attrs[key];
        });
        setSelectedElement(props);
      });

      bpmnViewer.current
        .importXML(xml)
        .then(async () => {
          const canvas = bpmnViewer.current.get("canvas");
          canvas.zoom("fit-viewport");

          if (showHeatmap && selectedId) {
            setLoadingHeatmap(true);
            try {
              const activities = await fetchHistoricActivitiesForDefinition(
                selectedId
              );
              const counts: Record<string, number> = {};
              activities.forEach((act: any) => {
                counts[act.activityId] = (counts[act.activityId] || 0) + 1;
              });

              const maxCount = Math.max(...Object.values(counts));

              Object.entries(counts).forEach(([id, count]) => {
                const intensity = count / maxCount;
                if (intensity > 0.7) {
                  canvas.addMarker(id, "heatmap-high");
                } else if (intensity > 0.3) {
                  canvas.addMarker(id, "heatmap-med");
                }
              });
            } catch (err) {
              console.error("Heatmap failed to load", err);
            } finally {
              setLoadingHeatmap(false);
            }
          }
        })
        .catch(console.error);
    }

    return () => {
      if (bpmnViewer.current) {
        bpmnViewer.current.destroy();
        bpmnViewer.current = null;
      }
    };
  }, [xml, viewMode, showHeatmap, selectedId]);

  const handleZoom = (action: "in" | "out" | "fit") => {
    if (!bpmnViewer.current) return;
    const canvas = bpmnViewer.current.get("canvas");
    if (action === "in") canvas.zoom(canvas.zoom() * 1.2);
    else if (action === "out") canvas.zoom(canvas.zoom() * 0.8);
    else canvas.zoom("fit-viewport");
  };

  const copyXml = () => {
    navigator.clipboard.writeText(xml);
    alert("BPMN XML copied to clipboard!");
  };

  return (
    <div className="h-screen flex flex-col bg-canvas overflow-hidden">
      <header className="bg-surface border-b border-canvas-active p-4 flex justify-between items-center shadow-soft z-10">
        <div className="flex items-center gap-4">
          <Link to="/admin/processes" className="btn-icon">
            <i className="fas fa-arrow-left"></i>
          </Link>
          <h2 className="text-lg font-serif font-bold text-ink-primary">
            Process Inspector:{" "}
            <span className="text-brand-600">{processKey}</span>
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all ${
              showHeatmap
                ? "bg-brand-500 text-white border-brand-600 shadow-lg shadow-brand-500/20"
                : "bg-white text-ink-tertiary border-canvas-active hover:text-brand-600"
            }`}
          >
            {loadingHeatmap ? (
              <i className="fas fa-circle-notch fa-spin"></i>
            ) : (
              <i className="fas fa-fire"></i>
            )}
            {showHeatmap ? "Heatmap On" : "Show Heatmap"}
          </button>

          <div className="flex bg-canvas-subtle p-1 rounded-lg border border-canvas-active shadow-inner">
            <button
              onClick={() => setViewMode("diagram")}
              className={`px-5 py-2 rounded-md text-xs font-black uppercase tracking-wider transition-all ${
                viewMode === "diagram"
                  ? "bg-white text-brand-600 shadow-sm"
                  : "text-ink-tertiary hover:text-ink-primary"
              }`}
            >
              Diagram
            </button>
            <button
              onClick={() => setViewMode("xml")}
              className={`px-5 py-2 rounded-md text-xs font-black uppercase tracking-wider transition-all ${
                viewMode === "xml"
                  ? "bg-white text-brand-600 shadow-sm"
                  : "text-ink-tertiary hover:text-ink-primary"
              }`}
            >
              Source XML
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 bg-surface border-r border-canvas-active overflow-y-auto p-5 flex flex-col gap-3 custom-scrollbar">
          <span className="text-[10px] font-black uppercase text-ink-tertiary tracking-widest mb-1">
            Version History
          </span>
          {versions.map((v, idx) => (
            <button
              key={v.id}
              onClick={() => setSelectedId(v.id)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                selectedId === v.id
                  ? "border-brand-500 bg-brand-50/30"
                  : "border-canvas-subtle hover:bg-canvas-subtle/50"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm">Version {v.version}</span>
                {idx === 0 && (
                  <span className="text-[8px] bg-sage-500 text-white px-1.5 py-0.5 rounded font-black">
                    LATEST
                  </span>
                )}
              </div>
              <p className="text-[10px] text-ink-tertiary mt-1 font-mono opacity-60">
                Deployment: {v.deploymentId?.substring(0, 8)}
              </p>
            </button>
          ))}
        </div>

        {/* Viewport */}
        <div className="flex-1 relative bg-white">
          {viewMode === "diagram" ? (
            <>
              <div ref={viewerRef} className="absolute inset-0" />
              {/* Zoom Controls (Original Logic Preserved) */}
              <div className="absolute bottom-8 left-8 flex flex-col gap-2 bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-floating border border-canvas-active z-20">
                <button
                  onClick={() => handleZoom("in")}
                  className="w-10 h-10 hover:bg-white hover:text-brand-600 rounded-xl flex items-center justify-center text-ink-secondary"
                >
                  <i className="fas fa-plus"></i>
                </button>
                <button
                  onClick={() => handleZoom("out")}
                  className="w-10 h-10 hover:bg-white hover:text-brand-600 rounded-xl flex items-center justify-center text-ink-secondary"
                >
                  <i className="fas fa-minus"></i>
                </button>
                <div className="h-px bg-canvas-active mx-2" />
                <button
                  onClick={() => handleZoom("fit")}
                  className="w-10 h-10 hover:bg-white hover:text-brand-600 rounded-xl flex items-center justify-center text-ink-secondary"
                >
                  <i className="fas fa-expand"></i>
                </button>
              </div>

              {/* Metadata Panel (Original Logic Preserved) */}
              {selectedElement && (
                <div className="absolute top-8 right-8 w-80 bg-surface/95 backdrop-blur-md rounded-2xl shadow-premium border border-canvas-active p-6 animate-slideInRight z-20 max-h-[80vh] overflow-y-auto custom-scrollbar">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-[10px] font-black uppercase text-brand-600 tracking-widest">
                        Metadata Inspector
                      </h3>
                      <p className="text-xs text-ink-tertiary mt-1 font-mono">
                        {selectedElement.ID}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedElement(null)}
                      className="text-ink-tertiary hover:text-ink-primary transition-colors"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                  <div className="space-y-5">
                    {Object.entries(selectedElement).map(([key, value]) => {
                      if (key === "ID") return null;
                      return (
                        <div key={key} className="group">
                          <span className="text-[9px] font-black uppercase text-ink-tertiary tracking-tighter block mb-1 group-hover:text-brand-500 transition-colors">
                            {key}
                          </span>
                          <div className="bg-canvas-subtle/50 p-2.5 rounded-lg border border-transparent group-hover:border-canvas-active transition-all">
                            <p className="text-sm font-bold text-ink-primary break-all leading-tight">
                              {String(value)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* 🟢 CORRECTED XML DISPLAY: Using Syntax Highlighter */
            <div className="absolute inset-0 bg-[#1e1e1e] flex flex-col">
              <div className="bg-[#252526] px-6 py-2 border-b border-white/5 flex justify-between items-center">
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                  BPMN 2.0 XML Schema
                </span>
                <button
                  onClick={copyXml}
                  className="text-xs font-bold text-white/60 hover:text-white transition-colors flex items-center gap-2"
                >
                  <i className="far fa-copy"></i> Copy Source
                </button>
              </div>

              <div className="flex-1 overflow-auto custom-scrollbar">
                <SyntaxHighlighter
                  language="xml"
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    padding: "2rem",
                    fontSize: "13px",
                    background: "transparent",
                  }}
                  showLineNumbers={true}
                  wrapLines={true}
                >
                  {xml}
                </SyntaxHighlighter>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .heatmap-high .djs-visual rect, .heatmap-high .djs-visual circle { 
          fill: #fee2e2 !important; stroke: #ef4444 !important; stroke-width: 4px !important; filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.5));
        }
        .heatmap-med .djs-visual rect, .heatmap-med .djs-visual circle { 
          fill: #fff7ed !important; stroke: #f97316 !important; stroke-width: 3px !important;
        }
        .djs-element.heatmap-high:hover .djs-visual rect { fill: #fecaca !important; }
      `}</style>
    </div>
  );
}
