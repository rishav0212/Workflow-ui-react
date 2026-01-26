import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useParams, Link } from "react-router-dom";
// @ts-ignore
import BpmnModeler from "bpmn-js/lib/Modeler";
// @ts-ignore
import BpmnViewer from "bpmn-js/lib/NavigatedViewer";
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
  CamundaPlatformPropertiesProviderModule,
  // @ts-ignore
} from "bpmn-js-properties-panel";
// @ts-ignore
import CamundaBpmnModdle from "camunda-bpmn-moddle/resources/camunda";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import "@bpmn-io/properties-panel/assets/properties-panel.css";

import CodeEditorModule from "react-simple-code-editor";
import { highlight, languages } from "prismjs";
// @ts-ignore
import "prismjs/components/prism-markup.js";
import "prismjs/themes/prism-tomorrow.css";

import {
  fetchProcessVersions,
  fetchProcessXml,
  fetchHistoricActivitiesForDefinition,
  deployProcess,
  parseApiError,
  migrateInstancesToVersion,
} from "./api";
import ActionEditorModal from "./ActionEditorModal";
import FormSelectBuilderModal from "./FormSelectBuilderModal";

// ============================================================================
// TYPES
// ============================================================================
interface ProcessVersion {
  id: string;
  version: number;
  deploymentId: string;
  deploymentName?: string;
  name?: string;
  key?: string;
}

interface SelectedElement {
  ID: string;
  Type: string;
  Name: string;
}

interface EditorState {
  isEditingXml: boolean;
  xmlContent: string;
  originalXml: string;
  unsavedChanges: boolean;
  lastSyncTime: number;
}

interface ActionButton {
  label: string;
  targetForm: string;
  color: "primary" | "success" | "warning" | "danger" | "info";
  icon: string;
  action?: string;
  variables?: Record<string, any>;
}

interface ProcessViewerProps {
  addNotification: (
    message: string,
    type: "success" | "error" | "info",
  ) => void;
}

// ============================================================================
// NAMESPACE CONVERTERS
// ============================================================================
const toCamunda = (xml: string): string => {
  if (!xml) return "";
  return xml
    .replace(/flowable:/g, "camunda:")
    .replace(
      /http:\/\/flowable\.org\/bpmn/g,
      "http://camunda.org/schema/1.0/bpmn",
    );
};

const toFlowable = (xml: string): string => {
  if (!xml) return "";
  return xml
    .replace(/camunda:/g, "flowable:")
    .replace(
      /http:\/\/camunda\.org\/schema\/1\.0\/bpmn/g,
      "http://flowable.org/bpmn",
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ProcessViewer({
  addNotification,
}: ProcessViewerProps): ReactNode {
  const Editor = (CodeEditorModule as any).default || CodeEditorModule;
  const { processKey } = useParams<{ processKey: string }>();

  // ─────────────────────────────────────────────────────────────────────────
  // STATE: Core Process Data
  // ─────────────────────────────────────────────────────────────────────────
  const [versions, setVersions] = useState<ProcessVersion[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [relatedForms, setRelatedForms] = useState<string[]>([]);

  // ─────────────────────────────────────────────────────────────────────────
  // STATE: View & UI
  // ─────────────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"diagram" | "designer" | "xml">(
    "diagram",
  );
  const [selectedElement, setSelectedElement] =
    useState<SelectedElement | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // STATE: Modals & Dialogs
  // ─────────────────────────────────────────────────────────────────────────
  const [showActionEditor, setShowActionEditor] = useState<boolean>(false);
  const [currentActions, setCurrentActions] = useState<ActionButton[]>([]);
  const [selectedFormForPicker, setSelectedFormForPicker] = useState<
    string | null
  >(null);

  // ─────────────────────────────────────────────────────────────────────────
  // STATE: Features & Loading
  // ─────────────────────────────────────────────────────────────────────────
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [loadingHeatmap, setLoadingHeatmap] = useState<boolean>(false);
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [isLoadingVersions, setIsLoadingVersions] = useState<boolean>(false);

  // ─────────────────────────────────────────────────────────────────────────
  // STATE: Editor State Management
  // ─────────────────────────────────────────────────────────────────────────
  const [editorState, setEditorState] = useState<EditorState>({
    isEditingXml: false,
    xmlContent: "",
    originalXml: "",
    unsavedChanges: false,
    lastSyncTime: 0,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // REFS: BPMN Instance Management
  // ─────────────────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const propertiesPanelRef = useRef<HTMLDivElement>(null);
  const bpmnInstance = useRef<any>(null);
  const syncTimeoutRef = useRef<any>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // CLEANUP: Prevent Memory Leaks
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      if (bpmnInstance.current) {
        try {
          bpmnInstance.current.destroy();
        } catch (e) {
          console.error("Error destroying BPMN instance", e);
        }
        bpmnInstance.current = null;
      }
    };
  }, []);

  // ═════════════════════════════════════════════════════════════════════════
  // EFFECT: Load Process Versions
  // ═════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!processKey) return;

    setIsLoadingVersions(true);
    fetchProcessVersions(processKey)
      .then((data: ProcessVersion[]) => {
        if (!Array.isArray(data) || data.length === 0) {
          addNotification("No process versions found", "info");
          setVersions([]);
          setSelectedId("");
          return;
        }
        setVersions(data);
        setSelectedId(data[0].id);
      })
      .catch((err: any) => {
        addNotification(
          `Failed to load versions: ${parseApiError(err)}`,
          "error",
        );
        setVersions([]);
      })
      .finally(() => setIsLoadingVersions(false));
  }, [processKey, addNotification]);

  // ═════════════════════════════════════════════════════════════════════════
  // EFFECT: Load XML for Selected Version
  // ═════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!selectedId) return;

    fetchProcessXml(selectedId)
      .then((data: string) => {
        if (!data || typeof data !== "string") {
          throw new Error("Invalid XML data received");
        }

        setEditorState((prev) => ({
          ...prev,
          originalXml: data,
          xmlContent: data,
          isEditingXml: false,
          unsavedChanges: false,
          lastSyncTime: Date.now(),
        }));
      })
      .catch((err: any) => {
        addNotification(`Failed to load XML: ${parseApiError(err)}`, "error");
        setEditorState((prev) => ({
          ...prev,
          originalXml: "",
          xmlContent: "",
        }));
      });
  }, [selectedId, addNotification]);

  // ═════════════════════════════════════════════════════════════════════════
  // EFFECT: Extract Related Forms from XML
  // ═════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const sourceXml = editorState.xmlContent || editorState.originalXml;
    if (!sourceXml) {
      setRelatedForms([]);
      return;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(sourceXml, "text/xml");

      // Check for XML parse errors
      if (doc.getElementsByTagName("parsererror").length > 0) {
        console.warn("XML parse error detected");
        return;
      }

      const foundKeys = new Set<string>();

      // Extract form keys from attributes
      const allElements = doc.getElementsByTagName("*");
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        const formKey =
          el.getAttribute("flowable:formKey") ||
          el.getAttribute("camunda:formKey");
        if (formKey) foundKeys.add(formKey);
      }

      // Extract form keys from externalActions
      const props = doc.getElementsByTagName("flowable:property");
      for (let i = 0; i < props.length; i++) {
        if (props[i].getAttribute("name") === "externalActions") {
          const jsonText = props[i].textContent;
          if (jsonText) {
            try {
              const cleanText = jsonText
                .replace(/<!\[CDATA\[/g, "")
                .replace(/\]\]>/g, "")
                .trim();
              const actions = JSON.parse(cleanText) as Array<{
                targetForm?: string;
              }>;
              if (Array.isArray(actions)) {
                actions.forEach((btn: any) => {
                  if (btn.targetForm) foundKeys.add(btn.targetForm);
                });
              }
            } catch (e) {
              console.error("Error parsing externalActions", e);
            }
          }
        }
      }

      setRelatedForms(Array.from(foundKeys).sort());
    } catch (e) {
      console.error("Error extracting forms from XML", e);
      setRelatedForms([]);
    }
  }, [editorState.xmlContent, editorState.originalXml]);

  // ═════════════════════════════════════════════════════════════════════════
  // EFFECT: Initialize & Manage BPMN Instance
  // ═════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (
      viewMode === "xml" ||
      !editorState.originalXml ||
      !containerRef.current
    ) {
      return;
    }

    // Cleanup previous instance
    if (bpmnInstance.current) {
      try {
        bpmnInstance.current.destroy();
      } catch (e) {
        console.error("Error destroying previous BPMN instance", e);
      }
      bpmnInstance.current = null;
    }

    const container = containerRef.current;
    let instance: any = null;
    let isComponentMounted = true;

    const initializeBpmn = async () => {
      try {
        if (!isComponentMounted) return;

        if (viewMode === "designer") {
          // ───────────────────────────────────────────────────────────────
          // DESIGNER/MODELER MODE
          // ───────────────────────────────────────────────────────────────
          instance = new BpmnModeler({
            container: container,
            propertiesPanel: { parent: propertiesPanelRef.current },
            additionalModules: [
              BpmnPropertiesPanelModule,
              BpmnPropertiesProviderModule,
              CamundaPlatformPropertiesProviderModule,
            ],
            moddleExtensions: { camunda: CamundaBpmnModdle },
          });

          // Real-time XML sync from designer
          const syncXmlFromDesigner = async () => {
            if (!isComponentMounted || !instance) return;

            try {
              const { xml: updatedXml } = await instance.saveXML({
                format: true,
              });
              const flowableXml = toFlowable(updatedXml);

              if (!isComponentMounted) return;

              setEditorState((prev) => ({
                ...prev,
                xmlContent: flowableXml,
                unsavedChanges: flowableXml !== prev.originalXml,
                lastSyncTime: Date.now(),
              }));
            } catch (err) {
              console.error("Designer sync error", err);
            }
          };

          // Debounce sync to prevent excessive updates
          const debouncedSync = () => {
            if (syncTimeoutRef.current) {
              clearTimeout(syncTimeoutRef.current);
            }
            syncTimeoutRef.current = setTimeout(syncXmlFromDesigner, 500);
          };

          instance.on("commandStack.changed", debouncedSync);

          // Handle element selection
          instance.on("selection.changed", (e: any) => {
            if (!isComponentMounted) return;

            const selection = e.newSelection?.[0];
            if (selection) {
              const bo = selection.businessObject;
              setSelectedElement({
                ID: selection.id,
                Type: selection.type?.replace("bpmn:", "") || "Unknown",
                Name: bo.name || "Unnamed",
              });
            } else {
              setSelectedElement(null);
            }
          });

          // Import XML
          await instance.importXML(toCamunda(editorState.originalXml));
        } else {
          // ───────────────────────────────────────────────────────────────
          // VIEWER MODE (Read-only Diagram)
          // ───────────────────────────────────────────────────────────────
          instance = new BpmnViewer({ container: container });

          await instance.importXML(editorState.originalXml);

          const canvas: any = instance.get("canvas");
          canvas.zoom("fit-viewport");

          // Load heatmap if enabled
          if (showHeatmap && selectedId && isComponentMounted) {
            setLoadingHeatmap(true);
            try {
              const activities =
                await fetchHistoricActivitiesForDefinition(selectedId);

              if (!isComponentMounted) return;

              const counts: Record<string, number> = {};
              activities.forEach((act: any) => {
                if (act.activityId) {
                  counts[act.activityId] = (counts[act.activityId] || 0) + 1;
                }
              });

              const maxCount = Math.max(...Object.values(counts), 1);
              Object.entries(counts).forEach(([id, count]) => {
                const intensity = count / maxCount;
                if (intensity > 0.7) {
                  canvas.addMarker(id, "heatmap-high");
                } else if (intensity > 0.3) {
                  canvas.addMarker(id, "heatmap-med");
                }
              });
            } catch (err) {
              console.error("Failed to load heatmap", err);
            } finally {
              if (isComponentMounted) {
                setLoadingHeatmap(false);
              }
            }
          }
        }

        // Custom wheel zoom handler
        const handleWheel = (e: WheelEvent) => {
          if (!e.ctrlKey) {
            e.preventDefault();
            e.stopPropagation();

            if (!instance) return;

            const canvas: any = instance.get("canvas");
            if (!canvas) return;

            const delta = e.deltaY > 0 ? -1 : 1;
            const currentZoom = canvas.zoom();
            const newScale = currentZoom * (1 + delta * 0.12);
            const boundedScale = Math.max(0.2, Math.min(newScale, 5));

            canvas.zoom(boundedScale, {
              x: e.clientX,
              y: e.clientY,
            });
          }
        };

        container.addEventListener("wheel", handleWheel, { passive: false });

        if (isComponentMounted) {
          bpmnInstance.current = instance;
        } else if (instance) {
          instance.destroy();
        }

        return () => {
          container.removeEventListener("wheel", handleWheel);
        };
      } catch (err) {
        console.error("BPMN initialization error", err);
        if (isComponentMounted) {
          addNotification(
            `Failed to initialize diagram: ${err instanceof Error ? err.message : "Unknown error"}`,
            "error",
          );
        }
      }
    };

    initializeBpmn();

    return () => {
      isComponentMounted = false;
      if (instance) {
        try {
          instance.destroy();
        } catch (e) {
          console.error("Error in cleanup", e);
        }
      }
    };
  }, [
    viewMode,
    editorState.originalXml,
    showHeatmap,
    selectedId,
    addNotification,
  ]);

  // ═════════════════════════════════════════════════════════════════════════
  // HELPER: Extract Actions from XML
  // ═════════════════════════════════════════════════════════════════════════
  const getActionsFromXml = useCallback(
    (taskId: string): ActionButton[] => {
      const sourceXml = editorState.xmlContent || editorState.originalXml;

      if (!sourceXml || !taskId) return [];

      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(sourceXml, "text/xml");

        if (doc.getElementsByTagName("parsererror").length > 0) {
          return [];
        }

        const task = Array.from(doc.getElementsByTagName("*")).find(
          (el) =>
            el.tagName?.endsWith("userTask") &&
            el.getAttribute("id") === taskId,
        );

        if (!task) return [];

        const props = task.getElementsByTagName("flowable:property");

        for (let i = 0; i < props.length; i++) {
          if (props[i].getAttribute("name") === "externalActions") {
            const cleanText = props[i].textContent
              ?.replace(/<!\[CDATA\[/g, "")
              .replace(/\]\]>/g, "")
              .trim();

            if (!cleanText) return [];

            const parsed = JSON.parse(cleanText) as ActionButton[];
            return Array.isArray(parsed) ? parsed : [];
          }
        }
      } catch (e) {
        console.error("Error getting actions from XML", e);
      }

      return [];
    },
    [editorState],
  );

  // ═════════════════════════════════════════════════════════════════════════
  // HANDLER: Save Actions to Designer
  // ═════════════════════════════════════════════════════════════════════════
  const handleSaveActions = useCallback(
    (newActions: ActionButton[]) => {
      if (!selectedElement || !bpmnInstance.current) {
        addNotification("No element selected", "error");
        return;
      }

      try {
        const modeling = bpmnInstance.current.get("modeling");
        const elementRegistry = bpmnInstance.current.get("elementRegistry");
        const moddle = bpmnInstance.current.get("moddle");

        if (!modeling || !elementRegistry || !moddle) {
          throw new Error("Required BPMN services not available");
        }

        const element = elementRegistry.get(selectedElement.ID);
        if (!element) {
          throw new Error("Element not found in registry");
        }

        const jsonString = JSON.stringify(newActions);
        let extensionElements = element.businessObject.extensionElements;

        if (!extensionElements) {
          extensionElements = moddle.create("bpmn:ExtensionElements", {
            values: [],
          });
        }

        const otherValues = (extensionElements.values || []).filter(
          (val: any) =>
            !(
              val.$type === "camunda:Property" && val.name === "externalActions"
            ) &&
            !(
              val.$type === "flowable:Property" &&
              val.name === "externalActions"
            ),
        );

        const newProp = moddle.create("camunda:Property", {
          name: "externalActions",
          value: jsonString,
        });

        modeling.updateModdleProperties(element, element.businessObject, {
          extensionElements: moddle.create("bpmn:ExtensionElements", {
            values: [...otherValues, newProp],
          }),
        });

        setCurrentActions(newActions);
        addNotification("Actions updated successfully", "success");
      } catch (err) {
        console.error("Error saving actions", err);
        addNotification(
          `Failed to save actions: ${err instanceof Error ? err.message : "Unknown error"}`,
          "error",
        );
      }
    },
    [selectedElement, addNotification],
  );

  // ═════════════════════════════════════════════════════════════════════════
  // HANDLER: Deploy Process
  // ═════════════════════════════════════════════════════════════════════════
  const handleDeploy = useCallback(async () => {
    if (!processKey) {
      addNotification("Process key not available", "error");
      return;
    }

    try {
      setIsDeploying(true);

      let finalXml = editorState.xmlContent || editorState.originalXml;

      if (!finalXml) {
        throw new Error("No XML content to deploy");
      }

      if (viewMode === "designer" && bpmnInstance.current) {
        try {
          const { xml } = await bpmnInstance.current.saveXML({ format: true });
          finalXml = toFlowable(xml);
        } catch (err) {
          console.error("Error saving from designer", err);
          throw new Error("Failed to export XML from designer");
        }
      }

      const comment = prompt("Deployment Comment (optional):", "");
      if (comment === null) return; // User cancelled

      const blob = new Blob([finalXml], { type: "text/xml" });
      const file = new File([blob], `${processKey}.bpmn20.xml`, {
        type: "text/xml",
      });

      await deployProcess(file, processKey, comment || "");

      addNotification("✅ Process deployed successfully!", "success");

      // Refresh versions
      const data = await fetchProcessVersions(processKey);
      setVersions(data);
      if (data.length > 0) {
        setSelectedId(data[0].id);
      }

      setEditorState((prev) => ({
        ...prev,
        isEditingXml: false,
        unsavedChanges: false,
      }));
    } catch (e) {
      addNotification(`Deploy Failed: ${parseApiError(e)}`, "error");
    } finally {
      setIsDeploying(false);
    }
  }, [viewMode, editorState, processKey, addNotification]);

  // ═════════════════════════════════════════════════════════════════════════
  // HANDLER: Promote Version
  // ═════════════════════════════════════════════════════════════════════════
  const handlePromoteVersion = useCallback(
    async (v: ProcessVersion) => {
      if (!window.confirm(`Promote version ${v.version} to live?`)) return;

      try {
        const oldXml = await fetchProcessXml(v.id);
        if (!oldXml) throw new Error("Failed to fetch version XML");

        const blob = new Blob([oldXml], { type: "text/xml" });
        const file = new File([blob], `${processKey}.bpmn20.xml`, {
          type: "text/xml",
        });

        await deployProcess(
          file,
          processKey || "unknown",
          `Promoted v${v.version}`,
        );

        addNotification(`✅ Version ${v.version} promoted to live!`, "success");

        const data = await fetchProcessVersions(processKey || "");
        setVersions(data);
        if (data.length > 0) setSelectedId(data[0].id);
      } catch (e) {
        addNotification(`Promotion failed: ${parseApiError(e)}`, "error");
      }
    },
    [processKey, addNotification],
  );

  // ═════════════════════════════════════════════════════════════════════════
  // HANDLER: Migrate Instances
  // ═════════════════════════════════════════════════════════════════════════
  const handleMigrateInstances = useCallback(async () => {
    if (!processKey || !selectedId) {
      addNotification("Process key or version not available", "error");
      return;
    }

    const targetVersion = versions.find((v) => v.id === selectedId)?.version;
    if (!targetVersion) {
      addNotification("Target version not found", "error");
      return;
    }

    if (!window.confirm(`Migrate all instances to v${targetVersion}?`)) return;

    setIsMigrating(true);
    try {
      await migrateInstancesToVersion(processKey, targetVersion);
      addNotification(
        `✅ ${processKey} instances migrated to v${targetVersion}!`,
        "success",
      );
    } catch (e) {
      addNotification(`Migration failed: ${parseApiError(e)}`, "error");
    } finally {
      setIsMigrating(false);
    }
  }, [processKey, selectedId, versions, addNotification]);

  // ═════════════════════════════════════════════════════════════════════════
  // HANDLER: Copy XML to Clipboard
  // ═════════════════════════════════════════════════════════════════════════
  const handleCopyXml = useCallback(() => {
    const xmlContent = editorState.xmlContent || editorState.originalXml;
    if (!xmlContent) {
      addNotification("No XML content to copy", "error");
      return;
    }

    navigator.clipboard
      .writeText(xmlContent)
      .then(() => addNotification("✅ XML copied to clipboard!", "success"))
      .catch(() => addNotification("Failed to copy XML", "error"));
  }, [editorState, addNotification]);

  // ═════════════════════════════════════════════════════════════════════════
  // HANDLER: Zoom Fit
  // ═════════════════════════════════════════════════════════════════════════
  const handleZoomFit = useCallback(() => {
    if (!bpmnInstance.current) return;

    try {
      const canvas: any = bpmnInstance.current.get("canvas");
      if (canvas) {
        canvas.zoom("fit-viewport");
      }
    } catch (e) {
      console.error("Zoom fit error", e);
    }
  }, []);

  // ═════════════════════════════════════════════════════════════════════════
  // MEMOIZED: Check for unsaved changes
  // ═════════════════════════════════════════════════════════════════════════
  const hasUnsavedChanges = useMemo(
    () => editorState.unsavedChanges,
    [editorState.unsavedChanges],
  );

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="h-full flex flex-col bg-canvas overflow-hidden font-sans">
      {/* HEADER */}
      <header className="bg-surface border-b border-canvas-active p-4 flex justify-between items-center shadow-soft z-30">
        <div className="flex items-center gap-4">
          <Link to="/admin/processes" className="btn-icon" title="Back">
            <i className="fas fa-arrow-left"></i>
          </Link>
          <h2 className="text-xl font-serif font-bold text-ink-primary tracking-tight">
            Process Inspector:{" "}
            <span className="text-brand-500">{processKey || "Loading..."}</span>
          </h2>
          {hasUnsavedChanges && (
            <span className="text-xs font-bold uppercase bg-amber-50 text-amber-700 px-2.5 py-1.5 rounded-lg border border-amber-200 flex items-center gap-1.5 animate-pulse shadow-sm">
              <i className="fas fa-exclamation-circle text-[10px]"></i>
              Unsaved Changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* MIGRATE BUTTON */}
          <button
            onClick={handleMigrateInstances}
            disabled={isMigrating || !selectedId || isLoadingVersions}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-soft"
            title="Migrate all instances to selected version"
          >
            {isMigrating ? (
              <i className="fas fa-circle-notch fa-spin"></i>
            ) : (
              <i className="fas fa-people-carry"></i>
            )}
            Migrate
          </button>

          {/* VIEW MODE SELECTOR */}
          <div className="flex bg-canvas-subtle p-1 rounded-xl border border-canvas-active shadow-inner">
            <button
              onClick={() => setViewMode("diagram")}
              className={`px-5 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                viewMode === "diagram"
                  ? "bg-surface text-brand-500 shadow-lifted"
                  : "text-ink-muted hover:text-ink-primary"
              }`}
              title="View diagram"
            >
              Diagram
            </button>
            <button
              onClick={() => setViewMode("designer")}
              className={`px-5 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                viewMode === "designer"
                  ? "bg-surface text-brand-500 shadow-lifted"
                  : "text-ink-muted hover:text-ink-primary"
              }`}
              title="Edit in designer"
            >
              Designer
            </button>
            <button
              onClick={() => setViewMode("xml")}
              className={`px-5 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                viewMode === "xml"
                  ? "bg-surface text-brand-500 shadow-lifted"
                  : "text-ink-muted hover:text-ink-primary"
              }`}
              title="Edit source XML"
            >
              Source XML
            </button>
          </div>

          {/* DEPLOY BUTTON */}
          <button
            onClick={handleDeploy}
            disabled={isDeploying || !editorState.originalXml}
            className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-brand-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="Deploy changes"
          >
            {isDeploying ? (
              <i className="fas fa-circle-notch fa-spin"></i>
            ) : (
              <i className="fas fa-cloud-upload-alt"></i>
            )}
            {isDeploying ? "Deploying..." : "Deploy"}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT SIDEBAR */}
        <div className="w-72 bg-surface border-r border-canvas-active overflow-y-auto p-5 flex flex-col gap-8 custom-scrollbar z-20">
          {/* VERSIONS */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase text-ink-muted tracking-[0.2em]">
                Versions
              </span>
              {isLoadingVersions && (
                <i className="fas fa-spinner fa-spin text-[10px] text-brand-500"></i>
              )}
            </div>

            {versions.length === 0 ? (
              <div className="p-3 bg-canvas-subtle rounded-lg text-[10px] text-ink-tertiary text-center">
                No versions available
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((v, idx) => (
                  <div
                    key={`${v.id}-${idx}`}
                    className={`flex flex-col gap-2 p-3.5 rounded-xl border-2 transition-all bg-white shadow-soft group cursor-pointer ${
                      selectedId === v.id
                        ? "border-brand-500 ring-2 ring-brand-200/50"
                        : "border-canvas-subtle hover:border-brand-300 hover:shadow-lifted"
                    }`}
                    onClick={() => {
                      setSelectedId(v.id);
                      setEditorState((prev) => ({
                        ...prev,
                        isEditingXml: false,
                      }));
                    }}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm text-ink-primary">
                        v{v.version}
                      </span>
                      {idx === 0 && (
                        <span className="text-[9px] bg-accent-500 text-white px-2 py-0.5 rounded font-black shadow-accent-sm">
                          LIVE
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-ink-tertiary truncate opacity-70 italic">
                      {v.deploymentName || "Deployed Workflow"}
                    </div>
                    {idx !== 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePromoteVersion(v);
                        }}
                        className="w-full py-1.5 bg-brand-50 hover:bg-brand-500 text-brand-600 hover:text-white border border-brand-200 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all mt-2"
                        title={`Promote v${v.version} to live`}
                      >
                        <i className="fas fa-history mr-1.5"></i> Promote
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RELATED FORMS */}
          {relatedForms.length > 0 && (
            <div>
              <span className="text-[10px] font-black uppercase text-ink-muted tracking-widest mb-3 block border-t border-canvas-active pt-4">
                Related Forms
              </span>
              <div className="space-y-2">
                {relatedForms.map((fKey) => (
                  <div
                    key={fKey}
                    className="group bg-white border border-canvas-active rounded-lg p-3 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <i className="fab fa-wpforms text-brand-500 text-xs"></i>
                      <span className="text-xs font-bold text-ink-primary truncate">
                        {fKey}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedFormForPicker(fKey)}
                      className="w-full py-1.5 bg-canvas-subtle hover:bg-brand-500 hover:text-white rounded text-[9px] font-black uppercase tracking-widest transition-all"
                      title={`Generate select for ${fKey}`}
                    >
                      Generate Select
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CENTER: BPMN CANVAS */}
        <div className="flex-1 relative bg-white overflow-hidden flex flex-col">
          {/* DIAGRAM/VIEWER */}
          {viewMode !== "xml" && (
            <>
              <div
                ref={containerRef}
                className="w-full flex-1 diagram-container"
              />

              {/* FLOATING CONTROLS */}
              <div className="absolute bottom-10 right-10 flex flex-col gap-3 z-40">
                {viewMode === "diagram" && (
                  <button
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    disabled={loadingHeatmap}
                    className={`w-14 h-14 rounded-2xl border-2 transition-all shadow-premium flex items-center justify-center font-black ${
                      showHeatmap
                        ? "bg-brand-500 text-white border-brand-600"
                        : "bg-surface text-ink-muted border-canvas-active hover:text-brand-500"
                    }`}
                    title="Toggle heatmap"
                  >
                    <i
                      className={`fas fa-fire text-xl ${
                        loadingHeatmap ? "fa-spin" : ""
                      }`}
                    ></i>
                  </button>
                )}
                <button
                  onClick={handleZoomFit}
                  className="w-14 h-14 bg-surface hover:bg-brand-50 text-ink-secondary hover:text-brand-500 rounded-2xl shadow-premium border-2 border-canvas-active flex items-center justify-center transition-all group font-black"
                  title="Fit to viewport"
                >
                  <i className="fas fa-expand text-xl group-active:scale-90 transition-transform"></i>
                </button>
              </div>
            </>
          )}

          {/* XML EDITOR */}
          {viewMode === "xml" && (
            <div className="absolute inset-0 bg-[#1e1e1e] flex flex-col">
              <div className="bg-[#252526] px-6 py-3 border-b border-white/5 flex justify-between items-center z-20">
                <div className="flex items-center gap-6">
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                    BPMN XML Editor
                  </span>
                  <button
                    onClick={() =>
                      setEditorState((prev) => ({
                        ...prev,
                        isEditingXml: !prev.isEditingXml,
                      }))
                    }
                    className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md transition-all ${
                      editorState.isEditingXml
                        ? "bg-amber-500 text-black shadow-lg"
                        : "bg-white/10 text-white/40 hover:text-white/60"
                    }`}
                    title={
                      editorState.isEditingXml
                        ? "Disable edit mode"
                        : "Enable edit mode"
                    }
                  >
                    {editorState.isEditingXml ? "✎ Editing" : "Read Only"}
                  </button>
                </div>
                <button
                  onClick={handleCopyXml}
                  className="text-xs font-bold text-white/60 hover:text-white flex items-center gap-2 transition-colors"
                  title="Copy XML to clipboard"
                >
                  <i className="far fa-copy"></i> Copy
                </button>
              </div>
              <div className="flex-1 overflow-auto bg-[#1e1e1e]">
                <Editor
                  value={editorState.xmlContent || editorState.originalXml}
                  onValueChange={(code: string) => {
                    if (editorState.isEditingXml) {
                      setEditorState((prev) => ({
                        ...prev,
                        xmlContent: code,
                        unsavedChanges: code !== prev.originalXml,
                      }));
                    }
                  }}
                  highlight={(code: string) =>
                    highlight(code, languages.markup, "markup")
                  }
                  padding={24}
                  readOnly={!editorState.isEditingXml}
                  className="font-mono text-[13px]"
                  style={{
                    fontFamily: '"Fira Code", monospace',
                    fontSize: 13,
                    backgroundColor: "#1e1e1e",
                    color: editorState.isEditingXml ? "#d4d4d4" : "#a1a1aa",
                    minHeight: "100%",
                    width: "100%",
                  }}
                />
              </div>
            </div>
          )}

          {/* PROPERTIES PANEL (Designer Mode) */}
          <div
            className={`w-[400px] border-l border-canvas-active bg-surface overflow-y-auto absolute top-0 right-0 bottom-0 z-30 transition-all duration-300 shadow-premium ${
              viewMode === "designer" ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {selectedElement?.Type === "UserTask" && (
              <div className="p-6 bg-accent-50 border-b border-accent-100">
                <div className="flex items-center gap-2 mb-2">
                  <i className="fas fa-magic text-accent-600 text-sm"></i>
                  <span className="text-[11px] font-black uppercase text-accent-700 tracking-[0.1em]">
                    Task Actions
                  </span>
                </div>
                <p className="text-[11px] text-accent-800/60 mb-4 leading-relaxed">
                  Configure user action buttons for this task
                </p>
                <button
                  onClick={() => {
                    setCurrentActions(getActionsFromXml(selectedElement.ID));
                    setShowActionEditor(true);
                  }}
                  className="w-full py-3 bg-accent-500 hover:bg-accent-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-accent-sm"
                  title="Open action editor"
                >
                  <i className="fas fa-edit mr-2"></i>Configure Actions
                </button>
              </div>
            )}
            {!selectedElement && (
              <div className="p-6 text-center text-ink-muted">
                <i className="fas fa-hand-pointer text-3xl mb-3 opacity-30"></i>
                <p className="text-xs">Select an element to view properties</p>
              </div>
            )}
            <div
              ref={propertiesPanelRef}
              className="properties-panel-container min-h-[400px] pb-20"
            />
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showActionEditor && (
        <ActionEditorModal
          isOpen={showActionEditor}
          onClose={() => setShowActionEditor(false)}
          onSave={handleSaveActions}
          initialActions={currentActions}
          taskName={selectedElement?.Name || "Task"}
        />
      )}

      {selectedFormForPicker && (
        <FormSelectBuilderModal
          isOpen={true}
          onClose={() => setSelectedFormForPicker(null)}
          formKey={selectedFormForPicker}
          formName={selectedFormForPicker}
        />
      )}

      <style>{`
        .diagram-container {
          background-color: #fafaf8;
          background-image: radial-gradient(#eae8e1 1px, transparent 1px);
          background-size: 24px 24px;
          cursor: grab;
        }
        .diagram-container:active {
          cursor: grabbing;
        }

        .bjs-powered-by {
          display: none !important;
        }

        /* Properties Panel Styling */
        .bio-properties-panel {
          background: #ffffff !important;
          border: none !important;
          color: #1a1715 !important;
        }
        .bio-properties-panel-header {
          background: #fafaf8 !important;
          border-bottom: 1px solid #eae8e1 !important;
          padding: 24px !important;
        }
        .bio-properties-panel-header-label {
          font-family: 'Crimson Pro', serif !important;
          font-weight: 800 !important;
          font-size: 18px !important;
          color: #e87548 !important;
        }
        .bio-properties-panel-group-header {
          border-top: 1px solid #f5f4f0 !important;
          padding: 14px 20px !important;
        }
        .bio-properties-panel-group-header-title {
          font-weight: 700 !important;
          font-size: 14px !important;
          color: #4a443f !important;
        }
        .bio-properties-panel-input {
          border: 1.5px solid #eae8e1 !important;
          border-radius: 10px !important;
          padding: 10px !important;
          font-size: 14px !important;
          background: #fefefe !important;
        }
        .bio-properties-panel-input:focus {
          border-color: #e87548 !important;
          box-shadow: 0 0 0 3px rgba(232, 117, 72, 0.1) !important;
          outline: none !important;
        }
        .bio-properties-panel-label {
          font-weight: 600 !important;
          font-size: 12px !important;
          color: #736d66 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          margin-bottom: 8px !important;
        }

        /* Hide clutter */
        [data-group-id="group-camunda-platform-job-execution"],
        [data-group-id="group-camunda-platform-external-task"],
        [data-group-id="group-camunda-platform-candidate-starter-configuration"],
        [data-group-id="group-camunda-platform-history-cleanup"] {
          display: none !important;
        }

        /* Heatmap */
        .heatmap-high .djs-visual rect {
          fill: #fee2e2 !important;
          stroke: #ef4444 !important;
          stroke-width: 4px !important;
        }
        .heatmap-med .djs-visual rect {
          fill: #fff7ed !important;
          stroke: #f97316 !important;
          stroke-width: 3px !important;
        }
      `}</style>
    </div>
  );
}
