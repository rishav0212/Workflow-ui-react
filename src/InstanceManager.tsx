import { useEffect, useState } from "react";
import {
  fetchProcessInstances,
  fetchHistoricProcessInstances,
  terminateProcessInstance,
  fetchInstanceVariables,
  updateInstanceVariable,
  // 🟢 NEW API CALLS
  bulkTerminateInstances,
  fetchVariableHistory,
  fetchProcessVersions,
  migrateProcessInstance,
} from "./api";
import { Link, useSearchParams } from "react-router-dom";

export default function InstanceManager() {
  const [searchParams] = useSearchParams();
  const filterKey = searchParams.get("key");

  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<any>(null);
  const [variables, setVariables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🟢 NEW STATE FOR GOD-MODE FEATURES
  const [viewMode, setViewMode] = useState<"active" | "history">("active");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [inspectorTab, setInspectorTab] = useState<"current" | "audit">(
    "current"
  );
  const [varAudit, setVarAudit] = useState<any[]>([]);
  const [targetVersions, setTargetVersions] = useState<any[]>([]);

  const loadInstances = () => {
    setLoading(true);
    const apiCall =
      viewMode === "active"
        ? fetchProcessInstances()
        : fetchHistoricProcessInstances(true);

    apiCall
      .then((data) => {
        const filtered = filterKey
          ? data.filter((i: any) => i.processDefinitionKey === filterKey)
          : data;
        setInstances(filtered);
      })
      .catch((err) => console.error("Failed to load instances:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setSelectedIds(new Set()); // Clear selection on mode change
    loadInstances();
  }, [filterKey, viewMode]);

  // 🟢 ENHANCED INSPECTOR: Load Variables, History, and Migration Targets
  const handleInspect = async (inst: any) => {
    setSelectedInstance(inst);
    setInspectorTab("current");

    try {
      // 1. 🟢 ROBUST KEY EXTRACTION
      // Active instances don't have 'processDefinitionKey', so we extract it from the ID.
      // Format is usually: "processKey:version:id"
      let defKey = inst.processDefinitionKey;
      if (!defKey && inst.processDefinitionId) {
        defKey = inst.processDefinitionId.split(":")[0];
      }

      console.log("🔍 Inspecting ID:", inst.id);
      console.log("🔑 Resolved Key:", defKey);

      if (!defKey) {
        console.error("❌ Could not determine Process Definition Key");
        return;
      }

      // 2. Fetch Data in Parallel
      const [vars, history, versions] = await Promise.all([
        fetchInstanceVariables(inst.id),
        fetchVariableHistory(inst.id),
        fetchProcessVersions(defKey), // <--- Use the resolved 'defKey' here
      ]);

      setVariables(vars);
      setVarAudit(history);

      // 3. Filter versions (remove the current one)
      const validTargets = versions.filter(
        (v: any) => v.id !== inst.processDefinitionId
      );

      console.log("🎯 Potential Migration Targets:", validTargets);
      setTargetVersions(validTargets);
    } catch (e) {
      console.error("Deep inspection failed", e);
    }
  };
  const handleUpdateVar = async (name: string, currentVal: any) => {
    const newVal = prompt(`Update ${name}:`, currentVal);
    if (newVal !== null && selectedInstance) {
      await updateInstanceVariable(selectedInstance.id, name, newVal);
      const updatedVars = await fetchInstanceVariables(selectedInstance.id);
      setVariables(updatedVars);
    }
  };

  const handleTerminate = async (id: string) => {
    if (window.confirm("Terminate this process instance? Data will be lost.")) {
      await terminateProcessInstance(id);
      loadInstances();
      setSelectedInstance(null);
    }
  };

  // 🟢 BULK ACTION LOGIC
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkTerminate = async () => {
    if (window.confirm(`Terminate ${selectedIds.size} instances?`)) {
      setLoading(true);
      await bulkTerminateInstances(Array.from(selectedIds));
      setSelectedIds(new Set());
      loadInstances();
    }
  };

  // 🟢 MIGRATION LOGIC
  const handleMigrate = async (targetId: string) => {
    if (
      window.confirm(
        "Migrate this instance to the selected version? Existing variables will be preserved."
      )
    ) {
      try {
        await migrateProcessInstance(selectedInstance.id, targetId);
        alert("Instance migrated successfully.");
        loadInstances();
        setSelectedInstance(null);
      } catch (e) {
        alert("Migration failed. Ensure the target version is compatible.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-canvas p-8 flex gap-6">
      <div className="flex-1">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-serif font-bold text-ink-primary">
              {filterKey ? `Instances: ${filterKey}` : "Process Instances"}
            </h2>
            <p className="text-xs text-ink-tertiary mt-1 font-medium">
              Manage live execution, batch terminate, or migrate between
              versions.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-canvas-subtle p-1 rounded-lg border border-canvas-active shadow-inner">
              <button
                onClick={() => setViewMode("active")}
                className={`px-5 py-2 rounded-md text-xs font-black uppercase tracking-wider transition-all ${
                  viewMode === "active"
                    ? "bg-white text-brand-600 shadow-sm"
                    : "text-ink-tertiary"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setViewMode("history")}
                className={`px-5 py-2 rounded-md text-xs font-black uppercase tracking-wider transition-all ${
                  viewMode === "history"
                    ? "bg-white text-brand-600 shadow-sm"
                    : "text-ink-tertiary"
                }`}
              >
                History
              </button>
            </div>
          </div>
        </div>

        {/* 🟢 FLOATING BULK ACTIONS */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-ink-primary text-white px-8 py-4 rounded-2xl shadow-premium flex items-center gap-8 z-50 animate-slideUp border border-white/10">
            <span className="text-sm font-bold uppercase tracking-widest">
              {selectedIds.size} Instances Selected
            </span>
            <button
              onClick={handleBulkTerminate}
              className="bg-status-error text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
            >
              Terminate All
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-white/40 hover:text-white"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        <div className="bg-surface rounded-xl border border-canvas-active overflow-hidden shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="bg-canvas-subtle border-b border-canvas-active">
              <tr>
                <th className="px-6 py-4 w-10">
                  <input
                    type="checkbox"
                    onChange={(e) =>
                      setSelectedIds(
                        e.target.checked
                          ? new Set(instances.map((i) => i.id))
                          : new Set()
                      )
                    }
                    className="accent-brand-500"
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-ink-tertiary">
                  Process Definition
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-ink-tertiary">
                  Status
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-ink-tertiary">
                  Business Key
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-ink-tertiary text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-canvas-subtle">
              {instances.map((inst) => (
                <tr
                  key={inst.id}
                  className={`hover:bg-canvas-subtle/30 transition-colors ${
                    selectedIds.has(inst.id) ? "bg-brand-50/50" : ""
                  }`}
                >
                  <td className="px-6 py-4">
                    {viewMode === "active" && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(inst.id)}
                        onChange={() => toggleSelect(inst.id)}
                        className="accent-brand-500"
                      />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-ink-primary">
                      {inst.processDefinitionName}
                    </div>
                    <div className="text-[10px] font-mono opacity-60">
                      ID: {inst.id.substring(0, 8)}...
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {inst.endTime ? (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                          inst.deleteReason
                            ? "bg-status-error/10 text-status-error border-status-error/20"
                            : "bg-sage-100 text-sage-700 border-sage-200"
                        }`}
                      >
                        {inst.deleteReason ? "Terminated" : "Completed"}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-brand-50 text-brand-600 border border-brand-100">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">
                    {inst.businessKey || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-right flex gap-3 justify-end">
                    <Link
                      to={`/admin/inspect/${inst.id}`}
                      className="text-[11px] font-black uppercase text-brand-600 hover:underline"
                    >
                      Path
                    </Link>
                    <button
                      onClick={() => handleInspect(inst)}
                      className="text-[11px] font-black uppercase text-ink-secondary hover:text-ink-primary"
                    >
                      Inspect
                    </button>
                    {viewMode === "active" && (
                      <button
                        onClick={() => handleTerminate(inst.id)}
                        className="text-[11px] font-black uppercase text-status-error hover:opacity-80"
                      >
                        Terminate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🟢 DEEP INSPECTOR PANEL: Includes History Log & Migration */}
      {selectedInstance && (
        <div className="w-96 bg-surface border border-canvas-active rounded-xl p-6 shadow-premium h-[90vh] sticky top-8 animate-slideInRight flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-bold text-ink-primary">Deep Inspector</h3>
              <p className="text-[10px] text-ink-tertiary font-mono">
                {selectedInstance.id}
              </p>
            </div>
            <button
              onClick={() => setSelectedInstance(null)}
              className="text-ink-tertiary hover:text-ink-primary"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="flex bg-canvas-subtle p-1 rounded-lg mb-6 text-[10px] font-black uppercase">
            <button
              onClick={() => setInspectorTab("current")}
              className={`flex-1 py-2 rounded ${
                inspectorTab === "current"
                  ? "bg-white text-brand-600 shadow-sm"
                  : "text-ink-tertiary"
              }`}
            >
              Current Vars
            </button>
            <button
              onClick={() => setInspectorTab("audit")}
              className={`flex-1 py-2 rounded ${
                inspectorTab === "audit"
                  ? "bg-white text-brand-600 shadow-sm"
                  : "text-ink-tertiary"
              }`}
            >
              History Log
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
            {inspectorTab === "current" ? (
              <>
                {/* 🟢 MIGRATION TOOL SECTION */}

                <div className="p-4 bg-brand-50 rounded-xl border border-brand-100 mb-6">
                  <span className="text-[9px] font-black uppercase text-brand-700 mb-2 block tracking-widest">
                    Migration Tool
                  </span>
                  <p className="text-[10px] text-brand-800/60 mb-3 leading-tight">
                    Move this instance to a different version of the workflow
                    definition.
                  </p>
                  <select
                    onChange={(e) => handleMigrate(e.target.value)}
                    className="w-full bg-white border border-brand-200 rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 ring-brand-500"
                  >
                    <option value="">Select Target Version...</option>
                    {targetVersions.map((v) => (
                      <option key={v.id} value={v.id}>
                        Version {v.version} (ID: {v.id.substring(0, 8)})
                      </option>
                    ))}
                  </select>
                </div>

                {variables.map((v) => (
                  <div
                    key={v.name}
                    className="p-3 bg-canvas-subtle rounded-lg border border-canvas-active group"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black uppercase text-ink-tertiary">
                        {v.name}
                      </span>
                      <button
                        onClick={() => handleUpdateVar(v.name, v.value)}
                        className="text-[10px] font-bold text-brand-600 opacity-0 group-hover:opacity-100"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="text-sm font-mono break-all text-ink-primary">
                      {JSON.stringify(v.value)}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              /* 🟢 VARIABLE AUDIT TRAIL (HISTORY LOG) */
              varAudit.map((h, i) => (
                <div
                  key={i}
                  className="relative pl-6 pb-6 border-l-2 border-canvas-active last:pb-0"
                >
                  <div className="absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-brand-500 shadow-sm"></div>
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-[10px] font-black text-brand-600 uppercase tracking-tighter">
                      {h.variableName}
                    </div>
                    <div className="text-[9px] text-ink-tertiary font-bold">
                      {new Date(h.createTime).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="bg-canvas-subtle p-2 rounded border border-canvas-active text-xs font-mono text-ink-primary">
                    {JSON.stringify(h.value)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
