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
  // @ts-ignore
} from "bpmn-js-properties-panel";
// @ts-ignore
import FlowableBpmnModdle from "flowable-bpmn-moddle/resources/camunda";
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
} from "../../api";
import ActionEditorModal from "./components/ActionEditorModal";
import DeployCommentModal from "./components/DeployCommentModal";
import FlowablePropertiesProvider from "./components/FlowablePropertiesProvider";
import { LoadingOverlay } from "../../components/common/LoadingOverlay";
import { UnsavedBadge } from "../../components/common/UnsavedBadge";

// ============================================================================
// FLOWABLE PROPERTIES PROVIDER MODULE
// Packages our custom provider into a bpmn-js-compatible module descriptor
// ============================================================================
const FlowablePropertiesProviderModule = {
  __init__: ["flowablePropertiesProvider"],
  flowablePropertiesProvider: ["type", FlowablePropertiesProvider],
};

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
// XML VALIDATION HELPER
// Returns an error message string or null if XML is valid
// ============================================================================
const validateXml = (xml: string): string | null => {
  if (!xml?.trim()) return "XML content is empty";
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const errors = doc.getElementsByTagName("parsererror");
  if (errors.length > 0) {
    const text = errors[0].textContent || "XML parse error";
    // Extract just the first line for a concise message
    return text.split("\n")[0].slice(0, 200);
  }
  return null;
};

/**
 * ProcessViewer is the primary UI container for building, editing, and managing
 * Flowable BPMN processes. It acts as the orchestrator connecting the bpmn-js
 * canvas, the underlying Flowable engine API, and the user interface.
 * 
 * Features:
 * - 100% Flowable native property support (no Camunda bridging)
 * - Three-way view toggle (Read-only diagram, Full Designer, Source XML edit)
 * - Real-time XML synchronization between canvas operations and source code
 * - Process version management with seamless rollback/promotion capabilities
 * 
 * Architecture:
 * - Employs a decoupled 3-state XML model to avoid expensive canvas reloads during sync.
 * - `xmlContent`: Live buffer representing current unsaved state.
 * - `designerXml`: Isolated state that only updates when explicitly loading a new baseline into the canvas.
 */
export default function ProcessViewer({
  addNotification,
}: ProcessViewerProps): ReactNode {
  const Editor = (CodeEditorModule as any).default || CodeEditorModule;
  const { processKey } = useParams<{ processKey: string }>();
  const { tenantId } = useParams<{ tenantId: string }>();

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
  const [showDeployModal, setShowDeployModal] = useState<boolean>(false);

  // ─────────────────────────────────────────────────────────────────────────
  // STATE: Features & Loading
  // ─────────────────────────────────────────────────────────────────────────
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [loadingHeatmap, setLoadingHeatmap] = useState<boolean>(false);
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [isLoadingVersions, setIsLoadingVersions] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // ─────────────────────────────────────────────────────────────────────────
  // STATE: XML Source of Truth
  //
  // Three pieces of XML state:
  //   serverXml    — what the server returned (original, immutable until reload)
  //   xmlContent   — the live editable XML (in XML view) / synced from designer
  //   designerXml  — the XML that was last imported INTO the designer canvas
  //                  (only updated explicitly; drives the designer effect)
  // ─────────────────────────────────────────────────────────────────────────
  const [serverXml, setServerXml] = useState<string>("");
  const [xmlContent, setXmlContent] = useState<string>("");
  const [designerXml, setDesignerXml] = useState<string>(""); // triggers designer re-init
  const [isEditingXml, setIsEditingXml] = useState<boolean>(false);
  const [unsavedChanges, setUnsavedChanges] = useState<boolean>(false);

  // ─────────────────────────────────────────────────────────────────────────
  // REFS: BPMN Instance Management
  // ─────────────────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const propertiesPanelRef = useRef<HTMLDivElement>(null);
  const bpmnInstance = useRef<any>(null);
  const syncTimeoutRef = useRef<any>(null);
  const heatmapLoaded = useRef<boolean>(false);

  // ─────────────────────────────────────────────────────────────────────────
  // CLEANUP: Prevent Memory Leaks
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      if (bpmnInstance.current) {
        try { bpmnInstance.current.destroy(); } catch (e) { /* ignore */ }
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
      .catch((err: any) =>
        addNotification(`Failed to load versions: ${parseApiError(err)}`, "error"),
      )
      .finally(() => setIsLoadingVersions(false));
  }, [processKey, addNotification]);

  // ═════════════════════════════════════════════════════════════════════════
  // EFFECT: Load XML for Selected Version
  // ═════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!selectedId) return;

    fetchProcessXml(selectedId)
      .then((data: string) => {
        if (!data || typeof data !== "string") throw new Error("Invalid XML");

        setServerXml(data);
        setXmlContent(data);
        setDesignerXml(data); // also push into designer
        setIsEditingXml(false);
        setUnsavedChanges(false);
      })
      .catch((err: any) => {
        addNotification(`Failed to load XML: ${parseApiError(err)}`, "error");
        setServerXml("");
        setXmlContent("");
        setDesignerXml("");
      });
  }, [selectedId, addNotification]);

  // ═════════════════════════════════════════════════════════════════════════
  // EFFECT: Extract Related Forms from XML
  // ═════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!xmlContent) { setRelatedForms([]); return; }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, "text/xml");
      if (doc.getElementsByTagName("parsererror").length > 0) return;

      const foundKeys = new Set<string>();
      const allElements = doc.getElementsByTagName("*");
      for (let i = 0; i < allElements.length; i++) {
        const formKey = allElements[i].getAttribute("flowable:formKey");
        if (formKey) foundKeys.add(formKey);
      }

      // Extract from externalActions
      const props = doc.getElementsByTagName("flowable:property");
      for (let i = 0; i < props.length; i++) {
        if (props[i].getAttribute("name") === "externalActions") {
          try {
            const raw = (props[i].getAttribute("value") || "").trim();
            const actions = JSON.parse(raw) as Array<{ targetForm?: string }>;
            if (Array.isArray(actions)) {
              actions.forEach((btn) => { if (btn.targetForm) foundKeys.add(btn.targetForm); });
            }
          } catch { /* ignore parse errors */ }
        }
      }

      setRelatedForms(Array.from(foundKeys).sort());
    } catch { setRelatedForms([]); }
  }, [xmlContent]);

  // ═════════════════════════════════════════════════════════════════════════
  // EFFECT: Initialize & Manage BPMN Instance
  //
  // Depends on `designerXml` — only re-runs when we explicitly want to
  // load new XML into the canvas (not on every live-edit).
  // ═════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (viewMode === "xml" || !designerXml || !containerRef.current) return;

    // Destroy previous instance
    if (bpmnInstance.current) {
      try { bpmnInstance.current.destroy(); } catch { /* ignore */ }
      bpmnInstance.current = null;
    }

    heatmapLoaded.current = false;
    const container = containerRef.current;
    let instance: any = null;
    let isComponentMounted = true;

    const initializeBpmn = async () => {
      try {
        if (!isComponentMounted) return;
        setIsImporting(true);

        if (viewMode === "designer") {
          // ─────────────────────────────────────────────────────────────
          // DESIGNER / MODELER MODE — Pure Flowable, no Camunda
          // ─────────────────────────────────────────────────────────────
          instance = new BpmnModeler({
            container,
            propertiesPanel: { parent: propertiesPanelRef.current },
            additionalModules: [
              BpmnPropertiesPanelModule,
              BpmnPropertiesProviderModule,
              FlowablePropertiesProviderModule,
            ],
            moddleExtensions: {
              flowable: FlowableBpmnModdle,
            },
          });

          // Sync XML from designer → xmlContent on each edit (debounced)
          const syncXmlFromDesigner = async () => {
            if (!isComponentMounted || !instance) return;
            try {
              const { xml: updatedXml } = await instance.saveXML({ format: true });
              if (!isComponentMounted) return;
              setXmlContent(updatedXml);
              setUnsavedChanges(updatedXml !== serverXml);
            } catch (err) {
              console.error("Designer sync error", err);
            }
          };

          const debouncedSync = () => {
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
            syncTimeoutRef.current = setTimeout(syncXmlFromDesigner, 400);
          };

          instance.on("commandStack.changed", debouncedSync);

          // Element selection → show element info
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

          // Import the XML directly — no namespace conversion needed!
          await instance.importXML(designerXml);

          // After import, do an initial sync so xmlContent is fresh
          try {
            const { xml: freshXml } = await instance.saveXML({ format: true });
            if (isComponentMounted) {
              setXmlContent(freshXml);
            }
          } catch { /* ignore */ }

        } else {
          // ─────────────────────────────────────────────────────────────
          // VIEWER MODE — Read-only diagram
          // ─────────────────────────────────────────────────────────────
          instance = new BpmnViewer({ container });
          await instance.importXML(designerXml);
          const canvas: any = instance.get("canvas");
          canvas.zoom("fit-viewport");
        }

        // Custom wheel zoom (no modifier key required)
        const handleWheel = (e: WheelEvent) => {
          if (!e.ctrlKey) {
            e.preventDefault();
            e.stopPropagation();
            if (!instance) return;
            const canvas: any = instance.get("canvas");
            if (!canvas) return;
            const delta = e.deltaY > 0 ? -1 : 1;
            const newScale = Math.max(0.2, Math.min(canvas.zoom() * (1 + delta * 0.12), 5));
            canvas.zoom(newScale, { x: e.clientX, y: e.clientY });
          }
        };

        container.addEventListener("wheel", handleWheel, { passive: false });

        if (isComponentMounted) {
          bpmnInstance.current = instance;
        } else if (instance) {
          instance.destroy();
          return;
        }

        return () => container.removeEventListener("wheel", handleWheel);
      } catch (err) {
        console.error("BPMN init error", err);
        if (isComponentMounted) {
          addNotification(
            `Failed to initialize diagram: ${err instanceof Error ? err.message : String(err)}`,
            "error",
          );
        }
      } finally {
        if (isComponentMounted) setIsImporting(false);
      }
    };

    initializeBpmn();

    return () => {
      isComponentMounted = false;
      if (instance) {
        try { instance.destroy(); } catch { /* ignore */ }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, designerXml, addNotification]);

  // ═════════════════════════════════════════════════════════════════════════
  // EFFECT: Heatmap Overlay (isolated — does NOT recreate modeler)
  // ═════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (viewMode !== "diagram" || !bpmnInstance.current || !selectedId) return;
    if (!showHeatmap) {
      // Clear markers
      if (bpmnInstance.current && !heatmapLoaded.current) return;
      heatmapLoaded.current = false;
      return;
    }

    setLoadingHeatmap(true);
    fetchHistoricActivitiesForDefinition(selectedId)
      .then((activities: any[]) => {
        if (!bpmnInstance.current) return;
        const canvas: any = bpmnInstance.current.get("canvas");
        if (!canvas) return;

        const counts: Record<string, number> = {};
        activities.forEach((act: any) => {
          if (act.activityId) counts[act.activityId] = (counts[act.activityId] || 0) + 1;
        });

        const maxCount = Math.max(...Object.values(counts), 1);
        Object.entries(counts).forEach(([id, count]) => {
          const intensity = count / maxCount;
          if (intensity > 0.7) canvas.addMarker(id, "heatmap-high");
          else if (intensity > 0.3) canvas.addMarker(id, "heatmap-med");
        });

        heatmapLoaded.current = true;
      })
      .catch((err: any) => console.error("Heatmap error", err))
      .finally(() => setLoadingHeatmap(false));
  }, [showHeatmap, viewMode, selectedId]);

  // ═════════════════════════════════════════════════════════════════════════
  // HELPER: Extract Actions from XML
  // ═════════════════════════════════════════════════════════════════════════
  const getActionsFromXml = useCallback(
    (taskId: string): ActionButton[] => {
      if (!xmlContent || !taskId) return [];
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlContent, "text/xml");
        if (doc.getElementsByTagName("parsererror").length > 0) return [];

        // Find the userTask element
        const task = Array.from(doc.getElementsByTagName("*")).find(
          (el) => el.tagName?.endsWith("userTask") && el.getAttribute("id") === taskId,
        );
        if (!task) return [];

        // Look for flowable:property with name="externalActions"
        // The value is stored in the "value" attribute (not text content)
        const props = task.getElementsByTagName("flowable:property");
        for (let i = 0; i < props.length; i++) {
          if (props[i].getAttribute("name") === "externalActions") {
            const raw = props[i].getAttribute("value") || "";
            if (!raw) return [];
            const parsed = JSON.parse(raw) as ActionButton[];
            return Array.isArray(parsed) ? parsed : [];
          }
        }
      } catch (e) {
        console.error("Error parsing actions from XML", e);
      }
      return [];
    },
    [xmlContent],
  );

  // ═════════════════════════════════════════════════════════════════════════
  // HANDLER: Save Actions to Designer (Flowable native)
  // ═════════════════════════════════════════════════════════════════════════
  const handleSaveActions = useCallback(
    async (newActions: ActionButton[]) => {
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
        if (!element) throw new Error("Element not found in registry");

        const jsonString = JSON.stringify(newActions);

        // Build the flowable:Properties > flowable:Property structure
        const newProp = moddle.create("flowable:Property", {
          name: "externalActions",
          value: jsonString,
        });

        const newProperties = moddle.create("flowable:Properties", {
          values: [newProp],
        });

        // Get or create extensionElements
        let extensionElements = element.businessObject.extensionElements;
        if (!extensionElements) {
          extensionElements = moddle.create("bpmn:ExtensionElements", { values: [] });
        }

        // Filter out any existing flowable:Properties that contain externalActions
        const otherExtensions = (extensionElements.values || []).filter(
          (val: any) => !(val.$type === "flowable:Properties"),
        );

        modeling.updateModdleProperties(element, element.businessObject, {
          extensionElements: moddle.create("bpmn:ExtensionElements", {
            values: [...otherExtensions, newProperties],
          }),
        });

        // Sync designer → xmlContent immediately
        try {
          const { xml: updatedXml } = await bpmnInstance.current.saveXML({ format: true });
          setXmlContent(updatedXml);
          setUnsavedChanges(updatedXml !== serverXml);
        } catch { /* ignore */ }

        setCurrentActions(newActions);
        addNotification("✅ Actions updated successfully", "success");
      } catch (err) {
        console.error("Error saving actions", err);
        addNotification(
          `Failed to save actions: ${err instanceof Error ? err.message : "Unknown error"}`,
          "error",
        );
      }
    },
    [selectedElement, addNotification, serverXml],
  );

  // ═════════════════════════════════════════════════════════════════════════
  // HANDLER: Apply XML Editor → Designer Canvas
  // ═════════════════════════════════════════════════════════════════════════
  const handleApplyXmlToDesigner = useCallback(() => {
    const validationError = validateXml(xmlContent);
    if (validationError) {
      addNotification(`❌ Invalid XML: ${validationError}`, "error");
      return;
    }
    setDesignerXml(xmlContent);
    setViewMode("designer");
    addNotification("✅ XML applied to designer", "success");
  }, [xmlContent, addNotification]);

  // ═════════════════════════════════════════════════════════════════════════
  // HANDLER: Deploy Process
  // ═════════════════════════════════════════════════════════════════════════
  const handleDeploy = useCallback(
    async (comment: string) => {
      if (!processKey) {
        addNotification("Process key not available", "error");
        return;
      }

      setShowDeployModal(false);
      setIsDeploying(true);

      try {
        let finalXml = xmlContent;

        // If designer is active, pull the latest from the canvas
        if (viewMode === "designer" && bpmnInstance.current) {
          try {
            const { xml } = await bpmnInstance.current.saveXML({ format: true });
            finalXml = xml;
          } catch (err) {
            throw new Error("Failed to export XML from designer");
          }
        }

        // Validate before deploying
        const validationError = validateXml(finalXml);
        if (validationError) {
          throw new Error(`Invalid XML: ${validationError}`);
        }

        const blob = new Blob([finalXml], { type: "text/xml" });
        const file = new File([blob], `${processKey}.bpmn20.xml`, { type: "text/xml" });

        await deployProcess(file, processKey, comment || "");

        addNotification("✅ Process deployed successfully!", "success");

        // Refresh versions and load new XML
        const data = await fetchProcessVersions(processKey);
        setVersions(data);
        if (data.length > 0) {
          setSelectedId(data[0].id);
          // selectedId effect will reload XML
        }

        setUnsavedChanges(false);
      } catch (e) {
        addNotification(`Deploy Failed: ${parseApiError(e)}`, "error");
      } finally {
        setIsDeploying(false);
      }
    },
    [viewMode, xmlContent, processKey, addNotification],
  );

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
        const file = new File([blob], `${processKey}.bpmn20.xml`, { type: "text/xml" });

        await deployProcess(file, processKey || "unknown", `Promoted v${v.version}`);

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
    if (!targetVersion) { addNotification("Target version not found", "error"); return; }
    if (!window.confirm(`Migrate all instances to v${targetVersion}?`)) return;

    setIsMigrating(true);
    try {
      await migrateInstancesToVersion(processKey, targetVersion);
      addNotification(`✅ ${processKey} instances migrated to v${targetVersion}!`, "success");
    } catch (e) {
      addNotification(`Migration failed: ${parseApiError(e)}`, "error");
    } finally {
      setIsMigrating(false);
    }
  }, [processKey, selectedId, versions, addNotification]);

  // ═════════════════════════════════════════════════════════════════════════
  // HANDLER: Copy XML
  // ═════════════════════════════════════════════════════════════════════════
  const handleCopyXml = useCallback(() => {
    if (!xmlContent) { addNotification("No XML content to copy", "error"); return; }
    navigator.clipboard
      .writeText(xmlContent)
      .then(() => addNotification("✅ XML copied to clipboard!", "success"))
      .catch(() => addNotification("Failed to copy XML", "error"));
  }, [xmlContent, addNotification]);

  // ═════════════════════════════════════════════════════════════════════════
  // HANDLER: Zoom Fit
  // ═════════════════════════════════════════════════════════════════════════
  const handleZoomFit = useCallback(() => {
    if (!bpmnInstance.current) return;
    try {
      const canvas: any = bpmnInstance.current.get("canvas");
      if (canvas) canvas.zoom("fit-viewport");
    } catch { /* ignore */ }
  }, []);

  // ═════════════════════════════════════════════════════════════════════════
  // MEMOIZED: Unsaved changes badge
  // ═════════════════════════════════════════════════════════════════════════
  const hasUnsavedChanges = useMemo(() => unsavedChanges, [unsavedChanges]);

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="h-full flex flex-col bg-canvas overflow-hidden font-sans">
      {/* ── DEPLOY COMMENT MODAL ─────────────────────────────────────────── */}
      <DeployCommentModal
        isOpen={showDeployModal}
        processKey={processKey || ""}
        onConfirm={handleDeploy}
        onCancel={() => setShowDeployModal(false)}
      />

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <header className="bg-surface border-b border-canvas-active p-4 flex justify-between items-center shadow-soft z-30">
        <div className="flex items-center gap-4">
          <Link to={`/${tenantId}/admin/processes`} className="btn-icon" title="Back">
            <i className="fas fa-arrow-left" />
          </Link>
          <h2 className="text-xl font-serif font-bold text-ink-primary tracking-tight">
            Process Inspector:{" "}
            <span className="text-brand-500">{processKey || "Loading..."}</span>
          </h2>
          <UnsavedBadge show={hasUnsavedChanges} />
        </div>

        <div className="flex items-center gap-3">
          {/* MIGRATE */}
          <button
            onClick={handleMigrateInstances}
            disabled={isMigrating || !selectedId || isLoadingVersions}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-soft"
            title="Migrate all instances to selected version"
          >
            {isMigrating ? <i className="fas fa-circle-notch fa-spin" /> : <i className="fas fa-people-carry" />}
            Migrate
          </button>

          {/* VIEW MODE SELECTOR */}
          <div className="flex bg-canvas-subtle p-1 rounded-xl border border-canvas-active shadow-inner">
            {(["diagram", "designer", "xml"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-5 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                  viewMode === mode
                    ? "bg-surface text-brand-500 shadow-lifted"
                    : "text-ink-muted hover:text-ink-primary"
                }`}
                title={mode === "xml" ? "Edit source XML" : mode === "designer" ? "Edit in designer" : "View diagram"}
              >
                {mode === "xml" ? "Source XML" : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* DEPLOY */}
          <button
            onClick={() => setShowDeployModal(true)}
            disabled={isDeploying || !xmlContent}
            className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-brand-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="Deploy changes"
          >
            {isDeploying ? <i className="fas fa-circle-notch fa-spin" /> : <i className="fas fa-cloud-upload-alt" />}
            {isDeploying ? "Deploying..." : "Deploy"}
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
        <div className="w-72 bg-surface border-r border-canvas-active overflow-y-auto p-5 flex flex-col gap-8 custom-scrollbar z-20">
          {/* VERSIONS */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase text-ink-muted tracking-[0.2em]">
                Versions
              </span>
              {isLoadingVersions && (
                <i className="fas fa-spinner fa-spin text-[10px] text-brand-500" />
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
                      setIsEditingXml(false);
                    }}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm text-ink-primary">v{v.version}</span>
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
                        onClick={(e) => { e.stopPropagation(); handlePromoteVersion(v); }}
                        className="w-full py-1.5 bg-brand-50 hover:bg-brand-500 text-brand-600 hover:text-white border border-brand-200 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all mt-2"
                        title={`Promote v${v.version} to live`}
                      >
                        <i className="fas fa-history mr-1.5" /> Promote
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
                    <div className="flex items-center gap-2">
                      <i className="fab fa-wpforms text-brand-500 text-xs" />
                      <span className="text-xs font-bold text-ink-primary truncate">{fKey}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── CENTER: CANVAS ────────────────────────────────────────────── */}
        <div className="flex-1 relative bg-white overflow-hidden flex flex-col">
          {/* DIAGRAM / DESIGNER CANVAS */}
          {viewMode !== "xml" && (
            <>
              {/* Loading overlay during BPMN import */}
              <LoadingOverlay isVisible={isImporting} message="Loading Diagram..." />

              <div ref={containerRef} className="w-full flex-1 diagram-container" />

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
                    title="Toggle activity heatmap"
                  >
                    <i className={`fas fa-fire text-xl ${loadingHeatmap ? "fa-spin" : ""}`} />
                  </button>
                )}
                <button
                  onClick={handleZoomFit}
                  className="w-14 h-14 bg-surface hover:bg-brand-50 text-ink-secondary hover:text-brand-500 rounded-2xl shadow-premium border-2 border-canvas-active flex items-center justify-center transition-all group font-black"
                  title="Fit to viewport"
                >
                  <i className="fas fa-expand text-xl group-active:scale-90 transition-transform" />
                </button>
              </div>
            </>
          )}

          {/* XML EDITOR */}
          {viewMode === "xml" && (
            <div className="absolute inset-0 bg-[#1e1e1e] flex flex-col">
              {/* XML Toolbar */}
              <div className="bg-[#252526] px-6 py-3 border-b border-white/5 flex justify-between items-center z-20">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                    BPMN XML — Flowable 6
                  </span>
                  <button
                    onClick={() => setIsEditingXml(!isEditingXml)}
                    className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md transition-all ${
                      isEditingXml
                        ? "bg-amber-500 text-black shadow-lg"
                        : "bg-white/10 text-white/40 hover:text-white/60"
                    }`}
                    title={isEditingXml ? "Disable edit mode" : "Enable edit mode"}
                  >
                    {isEditingXml ? "✎ Editing" : "Read Only"}
                  </button>

                  {/* Apply to Designer — key new feature */}
                  {isEditingXml && (
                    <button
                      onClick={handleApplyXmlToDesigner}
                      className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md bg-brand-500/80 hover:bg-brand-500 text-white transition-all flex items-center gap-1.5"
                      title="Validate and apply XML to the designer canvas"
                    >
                      <i className="fas fa-magic text-[10px]" />
                      Apply to Designer
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {hasUnsavedChanges && (
                    <span className="text-[10px] text-amber-400 font-bold">
                      ● Unsaved
                    </span>
                  )}
                  <button
                    onClick={handleCopyXml}
                    className="text-xs font-bold text-white/60 hover:text-white flex items-center gap-2 transition-colors"
                    title="Copy XML to clipboard"
                  >
                    <i className="far fa-copy" /> Copy
                  </button>
                </div>
              </div>

              {/* Code Editor */}
              <div className="flex-1 overflow-auto bg-[#1e1e1e]">
                <Editor
                  value={xmlContent}
                  onValueChange={(code: string) => {
                    if (isEditingXml) {
                      setXmlContent(code);
                      setUnsavedChanges(code !== serverXml);
                    }
                  }}
                  highlight={(code: string) => highlight(code, languages.markup, "markup")}
                  padding={24}
                  readOnly={!isEditingXml}
                  className="font-mono text-[13px]"
                  style={{
                    fontFamily: '"Fira Code", monospace',
                    fontSize: 13,
                    backgroundColor: "#1e1e1e",
                    color: isEditingXml ? "#d4d4d4" : "#a1a1aa",
                    minHeight: "100%",
                    width: "100%",
                  }}
                />
              </div>
            </div>
          )}

          {/* PROPERTIES PANEL (Designer Mode) */}
          <div
            className={`w-[380px] border-l border-canvas-active bg-surface overflow-y-auto absolute top-0 right-0 bottom-0 z-30 transition-all duration-300 shadow-premium ${
              viewMode === "designer" ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {/* Task Actions Banner */}
            {selectedElement?.Type === "UserTask" && (
              <div className="p-5 bg-accent-50 border-b border-accent-100">
                <div className="flex items-center gap-2 mb-2">
                  <i className="fas fa-magic text-accent-600 text-sm" />
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
                  <i className="fas fa-edit mr-2" />Configure Actions
                </button>
              </div>
            )}

            {!selectedElement && (
              <div className="p-6 text-center text-ink-muted">
                <i className="fas fa-hand-pointer text-3xl mb-3 opacity-30" />
                <p className="text-xs">Select an element to view properties</p>
              </div>
            )}

            {/* bpmn-js properties panel mount point */}
            <div
              ref={propertiesPanelRef}
              className="properties-panel-container min-h-[400px] pb-20"
            />
          </div>
        </div>
      </div>

      {/* ── MODALS ───────────────────────────────────────────────────────── */}
      {showActionEditor && (
        <ActionEditorModal
          isOpen={showActionEditor}
          onClose={() => setShowActionEditor(false)}
          onSave={handleSaveActions}
          initialActions={currentActions}
          taskName={selectedElement?.Name || "Task"}
        />
      )}

      {/* ── STYLES ───────────────────────────────────────────────────────── */}
      <style>{`
        .diagram-container {
          background-color: #fafaf8;
          background-image: radial-gradient(#eae8e1 1px, transparent 1px);
          background-size: 24px 24px;
          cursor: grab;
        }
        .diagram-container:active { cursor: grabbing; }

        .bjs-powered-by { display: none !important; }

        /* Properties Panel Styling — Flowable brand */
        .bio-properties-panel {
          background: #ffffff !important;
          border: none !important;
          color: #1a1715 !important;
        }
        .bio-properties-panel-header {
          background: #fafaf8 !important;
          border-bottom: 1px solid #eae8e1 !important;
          padding: 20px !important;
        }
        .bio-properties-panel-header-label {
          font-family: 'Crimson Pro', serif !important;
          font-weight: 800 !important;
          font-size: 17px !important;
          color: #e87548 !important;
        }
        .bio-properties-panel-group-header {
          border-top: 1px solid #f5f4f0 !important;
          padding: 12px 18px !important;
          background: #fafaf8 !important;
        }
        .bio-properties-panel-group-header-title {
          font-weight: 700 !important;
          font-size: 13px !important;
          color: #4a443f !important;
          text-transform: uppercase !important;
          letter-spacing: 0.04em !important;
        }
        .bio-properties-panel-input {
          border: 1.5px solid #eae8e1 !important;
          border-radius: 10px !important;
          padding: 9px !important;
          font-size: 13px !important;
          background: #fefefe !important;
        }
        .bio-properties-panel-input:focus {
          border-color: #e87548 !important;
          box-shadow: 0 0 0 3px rgba(232,117,72,0.10) !important;
          outline: none !important;
        }
        .bio-properties-panel-label {
          font-weight: 600 !important;
          font-size: 11px !important;
          color: #736d66 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          margin-bottom: 6px !important;
        }
        .bio-properties-panel-checkbox-input {
          accent-color: #e87548 !important;
        }
        .bio-properties-panel-entry + .bio-properties-panel-entry {
          margin-top: 12px !important;
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
