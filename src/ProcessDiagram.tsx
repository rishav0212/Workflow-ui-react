import { useEffect, useRef, useState } from "react";
// @ts-ignore
import BpmnViewer from "bpmn-js/lib/NavigatedViewer"; // NavigatedViewer allows zooming/panning
import axios from "axios";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";

const API_URL = "http://localhost:8080/api/workflow";

interface ProcessDiagramProps {
  processInstanceId: string;
}

export default function ProcessDiagram({
  processInstanceId,
}: ProcessDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Initialize BPMN Viewer
    const bpmnViewer = new BpmnViewer({
      container: containerRef.current,
      height: 500, // Fixed height for the diagram area
    });

    setViewer(bpmnViewer);

    // Cleanup on unmount
    return () => bpmnViewer.destroy();
  }, []);

  useEffect(() => {
    if (!viewer || !processInstanceId) return;
    loadDiagram();
  }, [viewer, processInstanceId]);

  const loadDiagram = async () => {
    try {
      // 2. Parallel Fetch: XML + Status Highlights
      const [xmlRes, highlightRes] = await Promise.all([
        axios.get(`${API_URL}/process/${processInstanceId}/xml`),
        axios.get(`${API_URL}/process/${processInstanceId}/highlights`),
      ]);

      const xml = xmlRes.data;
      const { completed, active } = highlightRes.data;

      // 3. Import XML into Viewer
      await viewer.importXML(xml);

      // 4. Color the Nodes
      const canvas = viewer.get("canvas");

      // A. Green for Completed
      completed.forEach((id: string) => {
        try {
          canvas.addMarker(id, "highlight-completed");
        } catch (e) {
          /* Ignore if node missing */
        }
      });

      // B. Blue/Orange for Active
      active.forEach((id: string) => {
        try {
          canvas.addMarker(id, "highlight-active");
        } catch (e) {
          /* Ignore */
        }
      });

      // 5. Fit to Viewport
      canvas.zoom("fit-viewport");
    } catch (err) {
      console.error("Failed to render BPMN", err);
    }
  };

  return (
    <div className="process-diagram-container border rounded bg-white shadow-sm p-2 relative">
      <h3 className="text-sm font-bold text-gray-500 mb-2 absolute top-2 left-4 z-10">
        Process View
      </h3>
      <div ref={containerRef} style={{ width: "100%", height: "500px" }} />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 p-2 rounded shadow text-xs flex gap-3">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-100 border border-green-500 block"></span>
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-blue-100 border border-blue-500 block"></span>
          <span>Current</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-white border border-black block"></span>
          <span>Future / Pending</span>
        </div>
      </div>
    </div>
  );
}
