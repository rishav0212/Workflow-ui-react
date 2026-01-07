import { useState, useEffect, useRef } from "react";
// 🟢 Import the API function
import { fetchAllForms } from "./api";

interface ActionVariable {
  key: string;
  value: string | number | boolean;
}

interface ActionButton {
  label: string;
  targetForm: string;
  color: "primary" | "success" | "warning" | "danger" | "info";
  icon: string;
  variables?: Record<string, any>;
}

interface ActionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (actions: ActionButton[]) => void;
  initialActions: ActionButton[];
  taskName: string;
}

// 🟢 INTERNAL COMPONENT: Searchable Dropdown (For Forms)
const SearchableSelect = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  allowCustom = false,
}: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selected = options.find((o: any) => o.value === value);
    if (!isOpen) setSearch(selected ? selected.label : value || "");
  }, [value, options, isOpen]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        const selected = options.find((o: any) => o.value === value);
        if (!allowCustom) setSearch(selected ? selected.label : value || "");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [value, options, allowCustom]);

  const filteredOptions = options.filter(
    (opt: any) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      opt.value.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={containerRef}>
      <label className="text-xs font-bold text-slate-700 mb-1 block">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none text-sm pr-8"
          placeholder={placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
            if (allowCustom) onChange(e.target.value);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearch("");
          }}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <i className={`fas fa-chevron-${isOpen ? "up" : "down"} text-xs`}></i>
        </div>
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
          {filteredOptions.length === 0 && !allowCustom && (
            <div className="p-3 text-xs text-slate-400 text-center">
              No matches found
            </div>
          )}
          {filteredOptions.map((opt: any) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-brand-50 hover:text-brand-700 flex items-center gap-2 ${
                value === opt.value
                  ? "bg-brand-50 text-brand-700 font-bold"
                  : "text-slate-700"
              }`}
            >
              <span className="truncate">{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 🟢 NEW COMPONENT: Icon Grid Picker
const IconGridPicker = ({ label, value, onChange, icons, loading }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      )
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Filter Icons
  const filteredIcons = icons.filter(
    (icon: any) =>
      icon.label.toLowerCase().includes(search.toLowerCase()) ||
      icon.value.includes(search.toLowerCase())
  );

  // Limit visual results for performance
  const displayIcons = filteredIcons.slice(0, 100);

  return (
    <div className="relative" ref={containerRef}>
      <label className="text-xs font-bold text-slate-700 mb-1 block">
        {label}
      </label>

      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-300 hover:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white transition-all text-left"
      >
        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200">
          <i className={value || "fas fa-question"}></i>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-700 truncate">
            {value || "Select Icon"}
          </div>
          <div className="text-[10px] text-slate-400">Click to change</div>
        </div>
        <i className="fas fa-chevron-down text-xs text-slate-400"></i>
      </button>

      {/* Popover Grid */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 w-[300px] sm:w-[400px] animate-fadeIn">
          {/* Search Header */}
          <div className="p-3 border-b border-slate-100 bg-slate-50 rounded-t-xl sticky top-0 z-10">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type="text"
                placeholder="Search icons (e.g. check, user)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                className="w-full pl-8 pr-3 py-2 rounded-md border border-slate-200 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Grid Content */}
          <div className="p-2 max-h-64 overflow-y-auto custom-scrollbar grid grid-cols-5 gap-2">
            {loading && (
              <div className="col-span-5 text-center py-4 text-xs text-slate-400">
                <i className="fas fa-circle-notch fa-spin mr-2"></i> Loading
                library...
              </div>
            )}

            {!loading && displayIcons.length === 0 && (
              <div className="col-span-5 text-center py-8 text-xs text-slate-400">
                No icons found.
              </div>
            )}

            {!loading &&
              displayIcons.map((icon: any) => (
                <button
                  key={icon.value}
                  onClick={() => {
                    onChange(icon.value);
                    setIsOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border transition-all hover:scale-105 ${
                    value === icon.value
                      ? "bg-brand-50 border-brand-500 text-brand-600 ring-1 ring-brand-200"
                      : "bg-white border-slate-100 hover:border-brand-300 hover:shadow-sm text-slate-600"
                  }`}
                  title={icon.label}
                >
                  <i className={`${icon.value} text-lg`}></i>
                </button>
              ))}
          </div>

          {/* Footer Info */}
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 rounded-b-xl text-[10px] text-slate-400 text-center">
            Showing {displayIcons.length} of {filteredIcons.length} matches
          </div>
        </div>
      )}
    </div>
  );
};

export default function ActionEditorModal({
  isOpen,
  onClose,
  onSave,
  initialActions,
  taskName,
}: ActionEditorModalProps) {
  const [actions, setActions] = useState<ActionButton[]>([]);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [editForm, setEditForm] = useState<ActionButton>({
    label: "",
    targetForm: "",
    color: "primary",
    icon: "fas fa-check",
    variables: {},
  });
  const [editVars, setEditVars] = useState<ActionVariable[]>([]);

  const [availableForms, setAvailableForms] = useState<any[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);

  // Icons State
  const [allIcons, setAllIcons] = useState<any[]>([]);
  const [loadingIcons, setLoadingIcons] = useState(false);

  // Fetch Icons from CDN
  const fetchIcons = async () => {
    const cached = localStorage.getItem("cached_fa_icons");
    if (cached) {
      setAllIcons(JSON.parse(cached));
      return;
    }

    setLoadingIcons(true);
    try {
      // Use jsDelivr for reliable JSON delivery
      const res = await fetch(
        "https://cdn.jsdelivr.net/gh/FortAwesome/Font-Awesome@6.5.1/metadata/icons.json"
      );
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();

      const iconsList = Object.keys(data).map((key) => {
        const icon = data[key];
        const prefix = icon.styles?.includes("solid")
          ? "fas"
          : icon.styles?.includes("brands")
          ? "fab"
          : "far";
        return {
          label: icon.label,
          value: `${prefix} fa-${key}`,
        };
      });

      setAllIcons(iconsList);
      localStorage.setItem("cached_fa_icons", JSON.stringify(iconsList));
    } catch (e) {
      console.error("Icon fetch error:", e);
      // Fallback
      setAllIcons([
        { label: "Check", value: "fas fa-check" },
        { label: "Times", value: "fas fa-times" },
        { label: "Edit", value: "fas fa-edit" },
        { label: "Trash", value: "fas fa-trash" },
        { label: "User", value: "fas fa-user" },
      ]);
    } finally {
      setLoadingIcons(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActions(initialActions || []);
      setEditingIndex(-1);

      setLoadingForms(true);
      fetchAllForms()
        .then((forms) => setAvailableForms(forms))
        .catch((err) => console.error("Failed to load forms", err))
        .finally(() => setLoadingForms(false));

      if (allIcons.length === 0) fetchIcons();
    }
  }, [isOpen, initialActions]);

  const handleEdit = (index: number) => {
    const action = actions[index];
    setEditingIndex(index);
    setEditForm({ ...action });
    const vars = action.variables
      ? Object.entries(action.variables).map(([key, value]) => ({
          key,
          value: value as any,
        }))
      : [];
    setEditVars(vars);
  };

  const handleAddNew = () => {
    setEditingIndex(actions.length);
    setEditForm({
      label: "New Action",
      targetForm: "",
      color: "primary",
      icon: "fas fa-check",
      variables: {},
    });
    setEditVars([]);
  };

  const handleDelete = (index: number) => {
    if (window.confirm("Are you sure you want to delete this action?")) {
      const newActions = [...actions];
      newActions.splice(index, 1);
      setActions(newActions);
      if (editingIndex === index) setEditingIndex(-1);
      else if (editingIndex > index) setEditingIndex(editingIndex - 1);
    }
  };

  const saveCurrentAction = () => {
    const variablesObj: Record<string, any> = {};
    editVars.forEach((v) => {
      if (v.key) {
        let val: any = v.value;
        if (val === "true") val = true;
        else if (val === "false") val = false;
        else if (!isNaN(Number(val)) && val !== "") val = Number(val);
        variablesObj[v.key] = val;
      }
    });
    const newAction = { ...editForm, variables: variablesObj };
    const newActions = [...actions];
    if (editingIndex >= actions.length) newActions.push(newAction);
    else newActions[editingIndex] = newAction;
    setActions(newActions);
    setEditingIndex(-1);
  };

  const handleSaveAll = () => {
    onSave(actions);
    onClose();
  };

  if (!isOpen) return null;

  const formOptions = availableForms.map((f) => ({
    label: `${f.title} (${f.path || f.key})`,
    value: f.path || f.key,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Manage Task Actions
            </h2>
            <p className="text-xs text-slate-500">
              Editing for:{" "}
              <span className="font-mono text-brand-600 font-bold">
                {taskName}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: List Actions */}
          <div className="w-1/3 border-r border-slate-100 bg-slate-50 overflow-y-auto p-4 flex flex-col gap-3">
            {actions.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                No actions defined yet.
              </div>
            )}
            {actions.map((act, idx) => (
              <div
                key={idx}
                onClick={() => handleEdit(idx)}
                className={`p-3 rounded-lg border cursor-pointer transition-all relative group ${
                  editingIndex === idx
                    ? "bg-white border-brand-500 shadow-md ring-1 ring-brand-200"
                    : "bg-white border-slate-200 hover:border-brand-300"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <i className={`${act.icon} text-slate-400 text-xs`}></i>
                    <span className="font-bold text-sm text-slate-700">
                      {act.label}
                    </span>
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full bg-${act.color}-500`}
                  ></div>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate pl-5">
                  {act.targetForm || "No form"}
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(idx);
                    }}
                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded transition-colors"
                    title="Delete"
                  >
                    <i className="fas fa-trash-alt text-xs"></i>
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={handleAddNew}
              className="p-3 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-brand-400 hover:text-brand-600 flex items-center justify-center gap-2 font-bold text-sm transition-all mt-2"
            >
              <i className="fas fa-plus"></i> Add New Action
            </button>
          </div>

          {/* RIGHT: Editor Form */}
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            {editingIndex > -1 ? (
              <div className="space-y-6 animate-slideInRight">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                    Edit Action Details
                  </h3>
                  <span className="text-xs font-mono text-slate-300">
                    Index: {editingIndex}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      Label
                    </label>
                    <input
                      type="text"
                      value={editForm.label}
                      onChange={(e) =>
                        setEditForm({ ...editForm, label: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      Color Theme
                    </label>
                    <select
                      value={editForm.color}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          color: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-brand-500 outline-none text-sm bg-white"
                    >
                      <option value="primary">Primary (Blue)</option>
                      <option value="success">Success (Green)</option>
                      <option value="warning">Warning (Orange)</option>
                      <option value="danger">Danger (Red)</option>
                      <option value="info">Info (Light Blue)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* 🟢 NEW: Icon Grid Picker */}
                  <IconGridPicker
                    label={`Icon ${loadingIcons ? "(Loading...)" : ""}`}
                    value={editForm.icon}
                    onChange={(val: string) =>
                      setEditForm({ ...editForm, icon: val })
                    }
                    icons={allIcons}
                    loading={loadingIcons}
                  />

                  {/* Form Dropdown */}
                  <SearchableSelect
                    label={loadingForms ? "Loading Forms..." : "Target Form"}
                    value={editForm.targetForm}
                    onChange={(val: string) =>
                      setEditForm({ ...editForm, targetForm: val })
                    }
                    options={formOptions}
                    placeholder="Search form..."
                    allowCustom={true}
                  />
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-bold text-slate-700">
                      Outcome Variables
                    </label>
                    <button
                      onClick={() =>
                        setEditVars([...editVars, { key: "", value: "" }])
                      }
                      className="text-xs text-brand-600 font-bold hover:underline flex items-center gap-1 bg-brand-50 px-2 py-1 rounded"
                    >
                      <i className="fas fa-plus"></i> Add Variable
                    </button>
                  </div>
                  <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {editVars.length === 0 && (
                      <p className="text-xs text-slate-400 text-center italic py-2">
                        No outcome variables defined.
                      </p>
                    )}
                    {editVars.map((v, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Key"
                          value={v.key}
                          onChange={(e) => {
                            const n = [...editVars];
                            n[i].key = e.target.value;
                            setEditVars(n);
                          }}
                          className="flex-1 px-2 py-1.5 rounded border border-slate-300 text-sm focus:border-brand-500 outline-none"
                        />
                        <span className="text-slate-400 font-bold">=</span>
                        <input
                          type="text"
                          placeholder="Value"
                          value={String(v.value)}
                          onChange={(e) => {
                            const n = [...editVars];
                            n[i].value = e.target.value;
                            setEditVars(n);
                          }}
                          className="flex-1 px-2 py-1.5 rounded border border-slate-300 text-sm focus:border-brand-500 outline-none"
                        />
                        <button
                          onClick={() => {
                            const n = [...editVars];
                            n.splice(i, 1);
                            setEditVars(n);
                          }}
                          className="text-slate-400 hover:text-rose-500 p-1"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={saveCurrentAction}
                    className="w-full py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-check"></i> Apply Changes to List
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <i className="fas fa-mouse-pointer text-4xl mb-3 opacity-50"></i>
                <p className="text-sm font-medium">
                  Select an action on the left to edit it.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <p className="text-xs text-slate-400">
            Changes are saved to a new process version automatically.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAll}
              className="px-6 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-lg hover:shadow-brand-500/30 transition-all flex items-center gap-2"
            >
              <i className="fas fa-cloud-upload-alt"></i> Save & Deploy Workflow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
