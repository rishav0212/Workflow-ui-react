// src/DmnViewer.tsx
import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
// @ts-ignore
import DmnViewerJS from "dmn-js"; // You will need to install dmn-js
import { fetchDecisionTables, fetchDecisionTableXml } from "./api";

export default function DmnViewer() {
  const [tables, setTables] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [xml, setXml] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"visual" | "xml">("visual");

  const dmnContainerRef = useRef<HTMLDivElement>(null);
  const dmnViewerInstance = useRef<any>(null);

  // 1. Load the list of Decision Tables
  useEffect(() => {
    fetchDecisionTables().then(setTables).catch(console.error);
  }, []);

  // 2. Fetch XML when a table is selected
  useEffect(() => {
    if (selectedId) {
      setLoading(true);
      fetchDecisionTableXml(selectedId)
        .then(setXml)
        .finally(() => setLoading(false));
    }
  }, [selectedId]);

  // 3. Initialize and Render dmn-js
  useEffect(() => {
    if (viewMode === "visual" && xml && dmnContainerRef.current) {
      // Cleanup previous instance
      if (dmnViewerInstance.current) {
        dmnViewerInstance.current.destroy();
      }

      // Initialize dmn-js
      dmnViewerInstance.current = new DmnViewerJS({
        container: dmnContainerRef.current,
      });

      dmnViewerInstance.current.importXML(xml, (err: any) => {
        if (err) {
          console.error("Failed to render DMN", err);
        } else {
          // Access the active view (Decision Table) and adjust zoom/view
          const activeView = dmnViewerInstance.current.getActiveView();
          if (activeView.type === "decisionTable") {
            const sheet = dmnViewerInstance.current.get("sheet");
            // Optional: sheet.zoom('fit-viewport');
          }
        }
      });
    }

    return () => {
      if (dmnViewerInstance.current) {
        dmnViewerInstance.current.destroy();
        dmnViewerInstance.current = null;
      }
    };
  }, [xml, viewMode]);

  return (
    <div className="h-screen flex flex-col bg-canvas overflow-hidden">
      {/* Header */}
      <header className="bg-surface border-b border-canvas-active p-4 flex justify-between items-center shadow-soft z-10">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="btn-icon">
            <i className="fas fa-arrow-left"></i>
          </Link>
          <h2 className="text-lg font-serif font-bold text-ink-primary">
            Business Rules <span className="text-brand-600">(DMN)</span>
          </h2>
        </div>

        <div className="flex gap-4">
          <div className="flex bg-canvas-subtle p-1 rounded-lg border border-canvas-active shadow-inner">
            <button
              onClick={() => setViewMode("visual")}
              className={`px-5 py-2 rounded-md text-xs font-black uppercase tracking-wider transition-all ${
                viewMode === "visual"
                  ? "bg-white text-brand-600 shadow-sm"
                  : "text-ink-tertiary"
              }`}
            >
              Visual Table
            </button>
            <button
              onClick={() => setViewMode("xml")}
              className={`px-5 py-2 rounded-md text-xs font-black uppercase tracking-wider transition-all ${
                viewMode === "xml"
                  ? "bg-white text-brand-600 shadow-sm"
                  : "text-ink-tertiary"
              }`}
            >
              XML Source
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: Table Selection */}
        <div className="w-80 bg-surface border-r border-canvas-active overflow-y-auto p-5 flex flex-col gap-3 custom-scrollbar">
          <span className="text-[10px] font-black uppercase text-ink-tertiary tracking-widest mb-1">
            Decision Repository
          </span>
          {tables.length === 0 ? (
            <div className="p-4 text-xs text-ink-tertiary italic">
              No DMN tables found.
            </div>
          ) : (
            tables.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  selectedId === t.id
                    ? "border-brand-500 bg-brand-50/30"
                    : "border-canvas-subtle hover:bg-canvas-subtle/50"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm">{t.name || t.key}</span>
                  <span className="text-[8px] bg-canvas-active px-1.5 py-0.5 rounded font-black">
                    v{t.version}
                  </span>
                </div>
                <p className="text-[10px] text-ink-tertiary mt-1 font-mono opacity-60">
                  Key: {t.key}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Viewport */}
        <div className="flex-1 relative bg-white overflow-hidden">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
              <i className="fas fa-circle-notch fa-spin text-brand-500 text-2xl"></i>
            </div>
          ) : !selectedId ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-ink-tertiary">
              <i className="fas fa-table text-4xl mb-4 opacity-20"></i>
              <p className="text-sm font-medium">
                Select a decision table to inspect rules.
              </p>
            </div>
          ) : viewMode === "visual" ? (
            <div
              ref={dmnContainerRef}
              className="absolute inset-0 dmn-viewer-container"
            />
          ) : (
            <div className="absolute inset-0 bg-[#1e1e1e] flex flex-col">
              <pre className="flex-1 p-8 overflow-auto text-[13px] font-mono text-[#dcdcaa] custom-scrollbar">
                <code>{xml}</code>
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Required CSS for dmn-js styling */}
      <style>{`
        .dmn-viewer-container .dmn-drd-container { background: #fff; }
        .dmn-viewer-container .tjs-table { font-size: 13px; }
        .dmn-viewer-container .tjs-header { background-color: #f8fafc !important; font-weight: bold; }
        .dmn-viewer-container .tjs-cell.input { background-color: #f0f9ff; }
        .dmn-viewer-container .tjs-cell.output { background-color: #f0fdf4; }
      `}</style>
    </div>
  );
}
