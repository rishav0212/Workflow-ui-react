import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import BpmnViewer from "bpmn-js";

// 🟢 OPTIMIZED: Only using the lightweight Editor + PrismJS
import CodeEditorModule from "react-simple-code-editor";
import { highlight, languages } from "prismjs";

// @ts-ignore
import "prismjs/components/prism-markup.js";
// @ts-ignore
import "prismjs/themes/prism-tomorrow.css";

import {
  fetchProcessVersions,
  fetchProcessXml,
  fetchHistoricActivitiesForDefinition,
  updateTaskActions,
  deployProcess,
  parseApiError, // 🟢 Ensure this is imported
} from "./api";
import ActionEditorModal from "./ActionEditorModal";
import FormSelectBuilderModal from "./FormSelectBuilderModal";

interface ProcessViewerProps {
  addNotification: (
    message: string,
    type: "success" | "error" | "info"
  ) => void;
}

export default function ProcessViewer({ addNotification }: ProcessViewerProps) {
  // 🟢 SAFE UNWRAP: Fixes "Element type is invalid" Vite error
  const Editor = (CodeEditorModule as any).default || CodeEditorModule;

  const { processKey } = useParams();
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [xml, setXml] = useState("");
  const [viewMode, setViewMode] = useState<"diagram" | "xml">("diagram");
  const [selectedElement, setSelectedElement] = useState<any>(null);

  const [showHeatmap, setShowHeatmap] = useState(false);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);

  // State for Action Editor
  const [showActionEditor, setShowActionEditor] = useState(false);
  const [currentActions, setCurrentActions] = useState<any[]>([]);

  // Related Forms Logic
  const [relatedForms, setRelatedForms] = useState<string[]>([]);
  const [selectedFormForPicker, setSelectedFormForPicker] = useState<
    string | null
  >(null);

  // XML Editing State
  const [isEditingXml, setIsEditingXml] = useState(false);
  const [localXml, setLocalXml] = useState("");

  const viewerRef = useRef<HTMLDivElement>(null);
  const bpmnViewer = useRef<any>(null);

  // 1. Fetch Version History
  useEffect(() => {
    if (processKey) {
      fetchProcessVersions(processKey).then((data) => {
        setVersions(data);
        if (data.length > 0) setSelectedId(data[0].id);
      });
    }
  }, [processKey]);

  // 2. Fetch XML for selected version
  useEffect(() => {
    if (selectedId) {
      fetchProcessXml(selectedId).then((data) => {
        setXml(data);
        setLocalXml(data); // Sync local state
      });
    }
  }, [selectedId]);

  // 3. DEEP PARSE XML for Forms
  useEffect(() => {
    if (xml) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, "text/xml");
        const foundKeys = new Set<string>();

        const allElements = doc.getElementsByTagName("*");
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i];
          const formKey =
            el.getAttribute("flowable:formKey") ||
            el.getAttribute("camunda:formKey");
          if (formKey) foundKeys.add(formKey);
        }

        const props = doc.getElementsByTagName("flowable:property");
        for (let i = 0; i < props.length; i++) {
          const prop = props[i];
          if (prop.getAttribute("name") === "externalActions") {
            const jsonText = prop.textContent;
            if (jsonText) {
              try {
                const cleanText = jsonText
                  .replace("<![CDATA[", "")
                  .replace("]]>", "")
                  .trim();
                const actions = JSON.parse(cleanText);
                if (Array.isArray(actions)) {
                  actions.forEach((btn: any) => {
                    if (btn.targetForm) foundKeys.add(btn.targetForm);
                  });
                }
              } catch (e) {}
            }
          }
        }
        setRelatedForms(Array.from(foundKeys).sort());
      } catch (e) {
        console.error("Error parsing forms from XML", e);
      }
    }
  }, [xml]);

  const getActionsFromXml = (taskId: string) => {
    // 🟢 UPDATED: Look at localXml first if we are editing!
    const sourceXml = isEditingXml && localXml ? localXml : xml;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(sourceXml, "text/xml");

      const task =
        Array.from(doc.getElementsByTagName("userTask")).find(
          (el) => el.getAttribute("id") === taskId
        ) ||
        Array.from(doc.getElementsByTagName("flowable:userTask")).find(
          (el) => el.getAttribute("id") === taskId
        );

      if (!task) return [];

      const props = task.getElementsByTagName("flowable:property");
      for (let i = 0; i < props.length; i++) {
        if (props[i].getAttribute("name") === "externalActions") {
          const jsonText = props[i].textContent;
          if (jsonText) {
            const cleanText = jsonText
              .replace("<![CDATA[", "")
              .replace("]]>", "")
              .trim();
            return JSON.parse(cleanText);
          }
        }
      }
    } catch (e) {
      console.warn(e);
    }
    return [];
  };

  // Diagram Logic
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
    addNotification(
      `BPMN XML for '${processKey}' copied to clipboard!`,
      "success"
    );
  };

  const openActionEditor = () => {
    if (!selectedElement || selectedElement.Type !== "UserTask") return;
    const existingActions = getActionsFromXml(selectedElement.ID);
    setCurrentActions(existingActions);
    setShowActionEditor(true);
  };

  // 🟢 UPDATED: Modifies local XML instead of calling API
  const handleSaveActions = (newActions: any[]) => {
    if (!selectedElement) return;

    // Use existing local draft if available, otherwise start from server XML
    const sourceXml = isEditingXml && localXml ? localXml : xml;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(sourceXml, "text/xml");

      // 1. Find the Task
      // Robust search that ignores namespace prefixes to find the ID
      const allElements = Array.from(doc.getElementsByTagName("*"));
      const task = allElements.find(
        (el) =>
          el.tagName.endsWith("userTask") &&
          el.getAttribute("id") === selectedElement.ID
      );

      if (!task) {
        addNotification(
          `Could not locate task "${selectedElement.ID}" in the XML definition.`,
          "error"
        );
        return;
      }

      // 2. Find or Create <extensionElements>
      let extElem = Array.from(task.children).find((el) =>
        el.tagName.endsWith("extensionElements")
      );

      if (!extElem) {
        // Infer prefix (e.g. bpmn2:)
        const prefix = task.tagName.includes(":")
          ? task.tagName.split(":")[0] + ":"
          : "";
        extElem = doc.createElement(prefix + "extensionElements");
        task.appendChild(extElem);
      }

      // 3. Find or Create <flowable:property name="externalActions">
      const jsonString = JSON.stringify(newActions);
      const props = Array.from(extElem.getElementsByTagName("*")).filter(
        (el) =>
          el.tagName.endsWith("property") &&
          (el.tagName.startsWith("flowable:") ||
            el.getAttribute("xmlns:flowable"))
      );

      let actionProp = props.find(
        (p) => p.getAttribute("name") === "externalActions"
      );

      if (actionProp) {
        // Update existing property
        actionProp.textContent = jsonString;
      } else {
        // Create new property
        actionProp = doc.createElement("flowable:property");
        actionProp.setAttribute("name", "externalActions");
        actionProp.textContent = jsonString;
        extElem.appendChild(actionProp);
      }

      // 4. Save to Local State
      const serializer = new XMLSerializer();
      const updatedXml = serializer.serializeToString(doc);

      setLocalXml(updatedXml);
      setIsEditingXml(true); // Flag as "dirty" so Edit Mode shows changes
      setCurrentActions(newActions);

      const taskName = selectedElement.Name || selectedElement.ID;
      addNotification(
        `Actions updated for task "${taskName}" in local XML! Switch to 'Source XML' to review changes, then click 'Save & Deploy'.`,
        "info"
      );
    } catch (err: any) {
      console.error(err);
      addNotification(
        `Failed to update local XML for task "${selectedElement?.Name}". Error: ${err.message}`,
        "error"
      );
    }
  };

  const handleRedeployXml = async () => {
    const comment = prompt(
      "Enter comments for this update (e.g., 'Hotfix via XML Editor'):"
    );
    if (comment === null) return;

    try {
      const blob = new Blob([localXml], { type: "text/xml" });
      const fileName = `${processKey}.bpmn20.xml`;
      const file = new File([blob], fileName, { type: "text/xml" });

      await deployProcess(file, processKey || "unknown", comment);

      addNotification(
        `Process "${processKey}" redeployed successfully with comment: "${comment}"`,
        "success"
      );
      setIsEditingXml(false);

      const data = await fetchProcessVersions(processKey || "");
      setVersions(data);
      if (data.length > 0) setSelectedId(data[0].id);
    } catch (err) {
      console.error(err);
      // 🟢 UPDATED: Uses parseApiError to show the specific backend validation message
      addNotification(`Deployment failed: ${parseApiError(err)}`, "error");
    }
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
              onClick={() => {
                setViewMode("diagram");
              }}
              className={`px-5 py-2 rounded-md text-xs font-black uppercase tracking-wider transition-all ${
                viewMode === "diagram"
                  ? "bg-white text-brand-600 shadow-sm"
                  : "text-ink-tertiary hover:text-ink-primary"
              }`}
            >
              Diagram
            </button>
            <button
              onClick={() => {
                setViewMode("xml");
                // If we have unsaved edits, make sure we enter edit mode
                if (localXml !== xml && localXml !== "") setIsEditingXml(true);
              }}
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
        <div className="w-72 bg-surface border-r border-canvas-active overflow-y-auto p-5 flex flex-col gap-6 custom-scrollbar">
          <div>
            <span className="text-[10px] font-black uppercase text-ink-tertiary tracking-widest mb-2 block">
              Version History
            </span>
            <div className="space-y-2">
              {versions.map((v, idx) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setSelectedId(v.id);
                    // Reset local edits when switching versions
                    setIsEditingXml(false);
                    setLocalXml("");
                  }}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                    selectedId === v.id
                      ? "border-brand-500 bg-brand-50/30"
                      : "border-canvas-subtle hover:bg-canvas-subtle/50"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm">v{v.version}</span>
                    {idx === 0 && (
                      <span className="text-[8px] bg-sage-500 text-white px-1.5 py-0.5 rounded font-black">
                        LATEST
                      </span>
                    )}
                  </div>
                  {v.deploymentName && (
                    <div
                      className="text-[10px] text-ink-secondary mt-1.5 italic border-l-2 border-brand-200 pl-2 py-0.5 truncate"
                      title={v.deploymentName}
                    >
                      {v.deploymentName}
                    </div>
                  )}
                  <p className="text-[10px] text-ink-tertiary mt-1 font-mono opacity-60">
                    ID: {v.deploymentId?.substring(0, 8)}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {relatedForms.length > 0 && (
            <div className="animate-slideUp">
              <span className="text-[10px] font-black uppercase text-ink-tertiary tracking-widest mb-2 block border-t border-canvas-active pt-4">
                Forms in Workflow
              </span>
              <div className="space-y-2">
                {relatedForms.map((fKey) => (
                  <div
                    key={fKey}
                    className="group bg-white border border-canvas-active rounded-lg p-3 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-brand-50 flex items-center justify-center text-brand-600 border border-brand-100">
                          <i className="fab fa-wpforms text-xs"></i>
                        </div>
                        <span
                          className="text-xs font-bold text-ink-primary truncate max-w-[140px]"
                          title={fKey}
                        >
                          {fKey}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedFormForPicker(fKey)}
                      className="w-full py-1.5 bg-canvas-subtle hover:bg-brand-600 hover:text-white text-ink-secondary border border-canvas-active hover:border-brand-600 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <i className="fas fa-magic"></i> Generate Select
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Viewport */}
        <div className="flex-1 relative bg-white">
          {viewMode === "diagram" ? (
            <>
              <div ref={viewerRef} className="absolute inset-0" />
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

                  {selectedElement.Type === "UserTask" && (
                    <div className="mb-6 p-4 bg-brand-50 border border-brand-200 rounded-xl">
                      <h4 className="text-xs font-bold text-brand-800 mb-2 flex items-center gap-2">
                        <i className="fas fa-bolt"></i> Interactive Actions
                      </h4>
                      <p className="text-[10px] text-brand-600 mb-3 leading-tight opacity-80">
                        Configure the buttons users see on this task.
                      </p>
                      <button
                        onClick={openActionEditor}
                        className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <i className="fas fa-edit"></i> Edit Actions
                      </button>
                    </div>
                  )}

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
            /* 🟢 XML View (Single Optimized Component) */
            <div className="absolute inset-0 bg-[#1e1e1e] flex flex-col">
              <div className="bg-[#252526] px-6 py-2 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                    BPMN 2.0 XML Schema
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      className={`w-8 h-4 rounded-full p-0.5 transition-colors ${
                        isEditingXml ? "bg-brand-500" : "bg-white/20"
                      }`}
                      onClick={() => setIsEditingXml(!isEditingXml)}
                    >
                      <div
                        className={`w-3 h-3 bg-white rounded-full transition-transform ${
                          isEditingXml ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </div>
                    <span className="text-xs text-white/70 font-bold select-none">
                      Edit Mode
                    </span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  {isEditingXml && (
                    <button
                      onClick={handleRedeployXml}
                      className="text-xs font-bold bg-status-success hover:bg-green-600 text-white px-3 py-1.5 rounded-md transition-all flex items-center gap-2 mr-2"
                    >
                      <i className="fas fa-cloud-upload-alt"></i> Save & Deploy
                    </button>
                  )}

                  <button
                    onClick={copyXml}
                    className="text-xs font-bold text-white/60 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <i className="far fa-copy"></i> Copy Source
                  </button>
                </div>
              </div>

              {/* 🟢 SINGLE EDITOR for both Read & Edit Modes */}
              <div className="flex-1 overflow-auto custom-scrollbar relative">
                <div className="w-full h-full bg-[#1e1e1e] overflow-auto">
                  <Editor
                    value={isEditingXml ? localXml : xml}
                    onValueChange={(code: any) =>
                      isEditingXml && setLocalXml(code)
                    }
                    highlight={(code: any) =>
                      highlight(code, languages.markup, "markup")
                    }
                    padding={20}
                    // @ts-ignore
                    readOnly={!isEditingXml}
                    className="font-mono text-[13px]"
                    textareaClassName="focus:outline-none"
                    style={{
                      fontFamily: '"Fira code", "Fira Mono", monospace',
                      fontSize: 13,
                      backgroundColor: "#1e1e1e",
                      color: isEditingXml ? "#d4d4d4" : "#a1a1aa", // Dim text in read-only
                      minHeight: "100%",
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ActionEditorModal
        isOpen={showActionEditor}
        onClose={() => setShowActionEditor(false)}
        onSave={handleSaveActions}
        initialActions={currentActions}
        taskName={selectedElement?.Name || "Task"}
      />
      <FormSelectBuilderModal
        isOpen={!!selectedFormForPicker}
        onClose={() => setSelectedFormForPicker(null)}
        formKey={selectedFormForPicker || ""}
        formName={selectedFormForPicker || "Form"}
      />
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
