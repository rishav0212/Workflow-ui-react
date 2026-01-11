import { useState, useEffect, useMemo } from "react";
import { fetchFormSchema, fetchAllForms } from "./api";
import { toast } from "react-hot-toast";
// @ts-ignore
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
// @ts-ignore
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface FormSelectBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  formKey?: string;
  formName?: string;
}

export default function FormSelectBuilderModal({
  isOpen,
  onClose,
  formKey,
}: FormSelectBuilderModalProps) {
  const [activeTab, setActiveTab] = useState<"build" | "import">("build");
  const [loadingResources, setLoadingResources] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState(false);

  // Data Sources
  const [resources, setResources] = useState<any[]>([]);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [currentSchema, setCurrentSchema] = useState<any>(null);

  // Configuration State (SIMPLIFIED)
  const [config, setConfig] = useState({
    label: "Select Item",
    key: "selectedItem",
    displayField: "",
    filter: "",
  });

  // Import State
  const [jsonToImport, setJsonToImport] = useState("");

  // 1. Fetch All Resources on Open
  useEffect(() => {
    if (isOpen) {
      setLoadingResources(true);
      fetchAllForms()
        .then((forms) => {
          setResources(forms);
          if (formKey) {
            const match = forms.find(
              (f: any) => f.key === formKey || f.path === formKey
            );
            if (match) setSelectedResource(match);
          }
        })
        .catch(() => toast.error("Failed to load list of forms"))
        .finally(() => setLoadingResources(false));
    }
  }, [isOpen, formKey]);

  // 2. Fetch Schema & Auto-Set Defaults
  useEffect(() => {
    if (selectedResource) {
      setLoadingSchema(true);
      fetchFormSchema(selectedResource.key || selectedResource.path)
        .then((schema) => {
          setCurrentSchema(schema);

          // Auto-Generate Label & Key from Form Title
          const safeName = selectedResource.title.replace(/[^a-zA-Z0-9]/g, "");
          setConfig((prev) => ({
            ...prev,
            label: selectedResource.title, // e.g. "Dispatch Order Details"
            key: safeName.charAt(0).toLowerCase() + safeName.slice(1), // e.g. "dispatchOrderDetails"
          }));

          // Auto-Guess Display Field (Looks for 'name', 'title', 'id')
          const components = schema.components || [];
          const guess = components.find(
            (c: any) =>
              c.key.includes("name") ||
              c.key.includes("title") ||
              c.key.includes("id")
          )?.key;

          if (guess) setConfig((prev) => ({ ...prev, displayField: guess }));
        })
        .catch(() => toast.error("Failed to load form schema"))
        .finally(() => setLoadingSchema(false));
    }
  }, [selectedResource]);

  // 3. Generate JSON with HARDCODED STANDARDS
  const generatedJson = useMemo(() => {
    if (!selectedResource) return "";

    // The "Display Field" is crucial. It tells the dropdown what text to show.
    // If we don't pick one, we default to 'id' or the template breaks.
    const fieldToShow = config.displayField || "id";
    const templateStr = `<span>{{ item.data.${fieldToShow} }}</span>`;

    const component = {
      label: config.label,
      key: config.key,
      type: "select",
      widget: "choicesjs", // Hardcoded: Best for searching
      dataSrc: "resource",
      data: {
        resource: selectedResource._id,
        project: selectedResource.owner || "",
      },
      valueProperty: "data", // Hardcoded: Always store full object
      template: templateStr,
      filter: config.filter, // e.g. data.orderId={{data.orderId}}
      limit: 100, // Hardcoded: Reasonable default
      lazyLoad: false, // Hardcoded: Prevent loading issues

      // Standard Boilerplate to ensure it works smoothly
      searchEnabled: true,
      selectThreshold: 0.3,
      readOnlyValue: false,
      indexeddb: { filter: {} },
      id: `gen_${Math.random().toString(36).substr(2, 9)}`,
    };

    return JSON.stringify(component, null, 2);
  }, [selectedResource, config]);

  // 4. Import Logic (Reverse Engineering)
  const handleParseJson = () => {
    try {
      const parsed = JSON.parse(jsonToImport);

      setConfig((prev) => ({
        ...prev,
        label: parsed.label || "Select Item",
        key: parsed.key || "selectedItem",
        filter: parsed.filter || "",
        // We can't easily extract displayField from template string, so we leave it for user to verify
      }));

      if (parsed.data && parsed.data.resource) {
        const foundRes = resources.find((r) => r._id === parsed.data.resource);
        if (foundRes) {
          setSelectedResource(foundRes);
          toast.success(`Matched Resource: ${foundRes.title}`);
        } else {
          // toast.warning("Resource ID from JSON not found in this system.");
        }
      }
      setActiveTab("build");
    } catch (e) {
      toast.error("Invalid JSON");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedJson);
    toast.success("JSON copied!");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink-primary/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface rounded-xl shadow-premium w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-canvas-active">
        {/* Header */}
        <div className="px-6 py-4 border-b border-canvas-active bg-surface-elevated flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 border border-brand-100">
              <i className="fas fa-magic text-lg"></i>
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-ink-primary">
                Select Component Standardizer
              </h3>
              <p className="text-xs text-ink-secondary">
                Generate standard, pre-configured Select components.
              </p>
            </div>
          </div>

          <div className="flex bg-canvas-subtle p-1 rounded-lg border border-canvas-active">
            <button
              onClick={() => setActiveTab("build")}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeTab === "build"
                  ? "bg-white shadow text-brand-600"
                  : "text-ink-tertiary"
              }`}
            >
              Builder
            </button>
            <button
              onClick={() => setActiveTab("import")}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeTab === "import"
                  ? "bg-white shadow text-brand-600"
                  : "text-ink-tertiary"
              }`}
            >
              Import JSON
            </button>
          </div>

          <button
            onClick={onClose}
            className="text-ink-tertiary hover:text-ink-primary w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas-subtle transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* TAB: BUILDER */}
          {activeTab === "build" && (
            <>
              {/* Left Panel: Configuration */}
              <div className="w-[350px] bg-surface border-r border-canvas-active flex flex-col overflow-y-auto custom-scrollbar">
                <div className="p-6 space-y-6">
                  {/* 1. Resource Selection */}
                  <div className="bg-canvas-subtle/50 p-4 rounded-xl border border-canvas-active">
                    <label className="text-[10px] font-black uppercase text-ink-tertiary tracking-widest block mb-2">
                      Target Data Source
                    </label>
                    {loadingResources ? (
                      <div className="text-xs text-ink-tertiary">
                        <i className="fas fa-circle-notch fa-spin mr-2"></i>{" "}
                        Loading forms...
                      </div>
                    ) : (
                      <select
                        value={selectedResource?.key || ""}
                        onChange={(e) => {
                          const found = resources.find(
                            (r) => r.key === e.target.value
                          );
                          setSelectedResource(found);
                        }}
                        className="w-full px-3 py-2.5 bg-white border border-canvas-active rounded-lg text-sm font-medium focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                      >
                        <option value="">-- Select Source --</option>
                        {resources.map((r) => (
                          <option key={r._id} value={r.key}>
                            {r.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {selectedResource && (
                    <div className="space-y-5 animate-slideUp">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-ink-secondary block mb-1.5">
                            Component Label
                          </label>
                          <input
                            type="text"
                            value={config.label}
                            onChange={(e) =>
                              setConfig({ ...config, label: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-canvas-subtle border border-canvas-active rounded-lg text-sm focus:border-brand-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-ink-secondary block mb-1.5">
                            Property Name (Key)
                          </label>
                          <input
                            type="text"
                            value={config.key}
                            onChange={(e) =>
                              setConfig({ ...config, key: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-canvas-subtle border border-canvas-active rounded-lg text-sm font-mono focus:border-brand-500 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-ink-secondary block mb-1.5">
                          Display Field <span className="text-red-500">*</span>
                        </label>
                        {loadingSchema ? (
                          <div className="h-9 w-full bg-canvas-subtle rounded animate-pulse"></div>
                        ) : (
                          <select
                            value={config.displayField}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                displayField: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 bg-canvas-subtle border border-canvas-active rounded-lg text-sm focus:border-brand-500 outline-none"
                          >
                            <option value="">-- Select Field to Show --</option>
                            {currentSchema?.components?.map((c: any) => (
                              <option key={c.key} value={c.key}>
                                {c.label} ({c.key})
                              </option>
                            ))}
                          </select>
                        )}
                        <p className="text-[10px] text-ink-tertiary mt-1">
                          This decides what text appears in the dropdown list.
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-ink-secondary block mb-1.5">
                          Context Filter (Optional)
                        </label>
                        <input
                          type="text"
                          value={config.filter}
                          onChange={(e) =>
                            setConfig({ ...config, filter: e.target.value })
                          }
                          placeholder="data.order_id={{data.order_id}}"
                          className="w-full px-3 py-2 bg-canvas-subtle border border-canvas-active rounded-lg text-sm font-mono focus:border-brand-500 outline-none"
                        />
                      </div>

                      {/* LOCKED SETTINGS NOTICE */}
                      <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-[10px] text-blue-800 space-y-1">
                        <p className="font-bold uppercase tracking-wide">
                          <i className="fas fa-lock mr-1"></i> Standard Settings
                          Applied
                        </p>
                        <ul className="list-disc ml-4 opacity-80">
                          <li>
                            <strong>Lazy Load:</strong> OFF (Data loads
                            immediately)
                          </li>
                          <li>
                            <strong>Storage:</strong> Full Object (data.*)
                          </li>
                          <li>
                            <strong>Limit:</strong> 100 items
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Code */}
              <div className="flex-1 bg-[#1e1e1e] flex flex-col min-w-0">
                <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-white/10">
                  <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">
                    Ready-to-Paste JSON
                  </span>
                  <button
                    onClick={handleCopy}
                    disabled={!selectedResource}
                    className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i className="far fa-copy"></i> Copy Code
                  </button>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar">
                  <SyntaxHighlighter
                    language="json"
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      padding: "1.5rem",
                      fontSize: "12px",
                      lineHeight: "1.5",
                      background: "transparent",
                    }}
                    showLineNumbers={true}
                    wrapLines={true}
                  >
                    {generatedJson ||
                      "// Select a resource to generate standard JSON"}
                  </SyntaxHighlighter>
                </div>
              </div>
            </>
          )}

          {/* TAB: IMPORT */}
          {activeTab === "import" && (
            <div className="flex-1 flex flex-col p-8 max-w-2xl mx-auto w-full">
              <div className="mb-4 text-center">
                <div className="w-12 h-12 bg-canvas-subtle rounded-full flex items-center justify-center mx-auto mb-3 text-ink-tertiary">
                  <i className="fas fa-file-import text-xl"></i>
                </div>
                <h4 className="font-bold text-ink-primary">
                  Edit Existing Component
                </h4>
                <p className="text-sm text-ink-secondary mt-1">
                  Paste the JSON from your existing Form.io select component
                  here.
                </p>
              </div>
              <textarea
                value={jsonToImport}
                onChange={(e) => setJsonToImport(e.target.value)}
                className="flex-1 w-full bg-canvas-subtle border border-canvas-active rounded-xl p-4 font-mono text-xs focus:border-brand-500 outline-none resize-none mb-6 shadow-inner"
                placeholder="Paste JSON here..."
              ></textarea>
              <button
                onClick={handleParseJson}
                disabled={!jsonToImport}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-50"
              >
                Load Settings & Edit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
