import { useEffect, useState, useMemo } from "react";
import {
  fetchProcessInstances,
  fetchHistoricProcessInstances,
  terminateProcessInstance,
  fetchInstanceVariables,
  updateInstanceVariable,
  bulkTerminateInstances,
  fetchVariableHistory,
  fetchProcessVersions,
  migrateProcessInstance,
  fetchAdminProcesses,
} from "./api";
import { Link, useSearchParams } from "react-router-dom";
import DataGrid, { type Column } from "./components/common/DataGrid";

export default function InstanceManager() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlFilterKey = searchParams.get("key");
  const [instances, setInstances] = useState<any[]>([]);
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<any>(null);
  const [variables, setVariables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"active" | "history">("active");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [inspectorTab, setInspectorTab] = useState<"current" | "audit">(
    "current",
  );
  const [varAudit, setVarAudit] = useState<any[]>([]);
  const [targetVersions, setTargetVersions] = useState<any[]>([]);
  const [filterKey, setFilterKey] = useState(urlFilterKey || "ALL");

  useEffect(() => {
    if (urlFilterKey) setFilterKey(urlFilterKey);
  }, [urlFilterKey]);

  const loadInstances = () => {
    setLoading(true);
    const apiCall =
      viewMode === "active"
        ? fetchProcessInstances()
        : fetchHistoricProcessInstances(true);
    apiCall
      .then(setInstances)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInstances();
    fetchAdminProcesses().then(setDefinitions).catch(console.error);
  }, [viewMode]);

  const uniqueKeys = useMemo(() => {
    const keys = new Set(definitions.map((def) => def.key));
    return Array.from(keys).filter(Boolean).sort();
  }, [definitions]);

  const filteredInstances = useMemo(() => {
    if (filterKey === "ALL") return instances;
    return instances.filter((i) => {
      const instKey =
        i.processDefinitionKey ||
        (i.processDefinitionId ? i.processDefinitionId.split(":")[0] : "");
      return instKey === filterKey;
    });
  }, [instances, filterKey]);

  const handleInspect = async (inst: any) => {
    setSelectedInstance(inst);
    setInspectorTab("current");
    try {
      const defKey =
        inst.processDefinitionKey ||
        (inst.processDefinitionId
          ? inst.processDefinitionId.split(":")[0]
          : "");
      if (!defKey) return;
      const [vars, history, versions] = await Promise.all([
        fetchInstanceVariables(inst.id),
        fetchVariableHistory(inst.id),
        fetchProcessVersions(defKey),
      ]);
      setVariables(vars);
      setVarAudit(history);
      setTargetVersions(
        versions.filter((v: any) => v.id !== inst.processDefinitionId),
      );
    } catch (e) {
      console.error("Deep inspection failed", e);
    }
  };

  const handleTerminate = async (id: string) => {
    if (window.confirm("Terminate this process instance? Data will be lost.")) {
      await terminateProcessInstance(id);
      loadInstances();
      setSelectedInstance(null);
    }
  };

  const handleBulkTerminate = async () => {
    if (window.confirm(`Terminate ${selectedIds.size} instances?`)) {
      setLoading(true);
      await bulkTerminateInstances(Array.from(selectedIds));
      setSelectedIds(new Set());
      loadInstances();
    }
  };

  const handleMigrate = async (targetId: string) => {
    if (window.confirm("Migrate this instance to the selected version?")) {
      try {
        await migrateProcessInstance(selectedInstance.id, targetId);
        alert("Instance migrated successfully.");
        loadInstances();
        setSelectedInstance(null);
      } catch (e) {
        alert("Migration failed.");
      }
    }
  };

  const columns: Column<any>[] = [
    {
      header: "Definition",
      key: "processDefinitionName",
      sortable: true,
      render: (inst) => (
        <div className="space-y-1">
          <div className="font-bold text-xs leading-tight text-ink-primary">
            {inst.processDefinitionName || inst.processDefinitionKey}
          </div>
          <div className="text-[11px] font-mono text-ink-muted bg-canvas-subtle/50 px-2 py-0.5 rounded-md w-fit">
            {inst.id}
          </div>
        </div>
      ),
    },
    {
      header: "Started",
      key: "startTime",
      sortable: true,
      render: (inst) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-ink-primary font-semibold">
            {new Date(inst.startTime).toLocaleDateString([], {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="text-[11px] text-ink-secondary font-medium">
            {new Date(inst.startTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      key: "status",
      render: (inst) =>
        inst.endTime ? (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all ${
              inst.deleteReason
                ? "bg-status-error/15 text-status-error border-status-error/30 shadow-sm"
                : "bg-sage-100/60 text-sage-700 border-sage-200 shadow-sm"
            }`}
          >
            <i
              className={`fas text-[9px] ${inst.deleteReason ? "fa-ban" : "fa-check-circle"}`}
            ></i>
            {inst.deleteReason ? "Terminated" : "Completed"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-brand-50/80 text-brand-600 border border-brand-200 shadow-sm">
            <i className="fas fa-play text-[9px] animate-pulse"></i>
            Active
          </span>
        ),
    },
    {
      header: "Business Key",
      key: "businessKey",
      sortable: true,
      render: (inst) => (
        <span className="font-mono text-xs text-ink-primary bg-canvas-subtle/50 px-2 py-1 rounded-md block w-fit">
          {inst.businessKey ? (
            <>{inst.businessKey}</>
          ) : (
            <span className="text-ink-muted italic">Not set</span>
          )}
        </span>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      className: "text-right",
      render: (inst) => (
        <div
          className="flex justify-end gap-1.5 items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            to={`/admin/inspect/${inst.id}`}
            className="px-3 py-1.5 bg-accent-50 text-accent-600 hover:bg-accent-100 font-bold text-[10px] uppercase tracking-wide rounded-lg border border-accent-200 shadow-soft transition-all hover:shadow-lifted"
            title="View Process Path"
          >
            <i className="fas fa-map-signs mr-1"></i>Path
          </Link>
          <button
            onClick={() => handleInspect(inst)}
            className="px-3 py-1.5 bg-brand-50 border-2 border-brand-200 text-brand-600 hover:bg-brand-100 hover:border-brand-400 rounded-lg text-[10px] font-bold uppercase tracking-wide shadow-soft transition-all hover:shadow-lifted"
            title="Inspect Instance Details"
          >
            <i className="fas fa-microscope mr-1"></i>Inspect
          </button>
          {viewMode === "active" && (
            <button
              onClick={() => handleTerminate(inst.id)}
              className="p-2 text-status-error hover:bg-status-error/15 hover:text-status-error border border-status-error/20 rounded-lg transition-all shadow-soft hover:shadow-lifted hover:border-status-error/40"
              title="Terminate Instance"
            >
              <i className="fas fa-power-off text-xs"></i>
            </button>
          )}
        </div>
      ),
    },
  ];
  return (
    <div className="min-h-screen bg-canvas p-6 flex gap-6 font-sans">
      <div className="flex-1 flex flex-col min-h-0">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-serif font-bold text-ink-primary tracking-tight">
              Instance Manager
            </h2>
            <p className="text-xs text-ink-tertiary mt-0.5 font-medium italic">
              Monitor & manipulate workflow executions.
            </p>
          </div>
          <div className="flex bg-canvas-subtle p-1 rounded-xl border border-canvas-active shadow-soft">
            <button
              onClick={() => setViewMode("active")}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                viewMode === "active"
                  ? "bg-surface text-brand-500 shadow-lifted"
                  : "text-ink-tertiary"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setViewMode("history")}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                viewMode === "history"
                  ? "bg-surface text-brand-500 shadow-lifted"
                  : "text-ink-tertiary"
              }`}
            >
              History
            </button>
          </div>
        </header>

        {selectedIds.size > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-ink-primary text-ink-inverted px-6 py-3.5 rounded-2xl shadow-premium flex items-center gap-8 z-50 animate-slideUp border border-white/10">
            <span className="text-xs font-bold uppercase tracking-widest">
              {selectedIds.size} Selected
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={handleBulkTerminate}
                className="bg-status-error text-white px-4 py-1.5 rounded-card text-[10px] font-black uppercase tracking-widest"
              >
                Terminate
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-white/40 hover:text-white transition-colors"
              >
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>
          </div>
        )}

        {/* 🟢 DataGrid with Filter in Header */}
        <DataGrid
          data={filteredInstances}
          columns={columns}
          loading={loading}
          getRowId={(inst) => inst.id}
          searchFields={["id", "businessKey", "processDefinitionName"]}
          onSelectionChange={setSelectedIds}
          activeRowId={selectedInstance?.id}
          onRowClick={handleInspect}
          headerActions={
            <select
              value={filterKey}
              onChange={(e) => {
                setFilterKey(e.target.value);
                setSearchParams(
                  e.target.value === "ALL" ? {} : { key: e.target.value },
                );
              }}
              className="px-3 py-2 bg-surface border border-canvas-active rounded-lg text-xs text-ink-primary focus:border-brand-300 outline-none cursor-pointer shadow-soft whitespace-nowrap"
            >
              <option value="ALL">All Definitions</option>
              {uniqueKeys.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          }
        />
      </div>

      {/* Deep Inspector Panel */}
      {selectedInstance && (
        <aside className="w-80 bg-surface border border-canvas-active rounded-panel p-5 shadow-premium h-[calc(100vh-4rem)] sticky top-8 animate-slideInRight flex flex-col overflow-hidden">
          <div className="flex justify-between items-start mb-5">
            <div>
              <h3 className="text-base font-serif font-bold text-ink-primary leading-tight">
                Deep Inspector
              </h3>
              <p className="text-[8px] text-ink-tertiary font-mono uppercase mt-1 opacity-60">
                UUID: {selectedInstance.id}
              </p>
            </div>
            <button
              onClick={() => setSelectedInstance(null)}
              className="text-ink-muted hover:text-ink-primary transition-colors"
            >
              <i className="fas fa-times text-xs"></i>
            </button>
          </div>
          <div className="flex bg-canvas-subtle p-0.5 rounded-lg mb-5 border border-canvas-active shadow-inner">
            <button
              onClick={() => setInspectorTab("current")}
              className={`flex-1 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${
                inspectorTab === "current"
                  ? "bg-white text-brand-600 shadow-soft"
                  : "text-ink-muted"
              }`}
            >
              State
            </button>
            <button
              onClick={() => setInspectorTab("audit")}
              className={`flex-1 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${
                inspectorTab === "audit"
                  ? "bg-white text-brand-600 shadow-soft"
                  : "text-ink-muted"
              }`}
            >
              History
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4">
            {inspectorTab === "current" ? (
              <>
                <div className="p-4 bg-accent-50/50 rounded-xl border border-accent-100 mb-2 shadow-accent-sm">
                  <span className="text-[8px] font-black uppercase text-accent-700 block mb-1.5 tracking-widest">
                    Migration Hub
                  </span>
                  <select
                    onChange={(e) => handleMigrate(e.target.value)}
                    className="w-full bg-white border border-accent-200 rounded-md p-1.5 text-[10px] font-bold text-accent-900 outline-none"
                  >
                    <option value="">Target version...</option>
                    {targetVersions.map((v) => (
                      <option key={v.id} value={v.id}>
                        Version {v.version} ({v.id.substring(0, 5)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2.5">
                  <span className="text-[8px] font-black uppercase text-ink-muted px-1 block">
                    Live Variables
                  </span>
                  {variables.map((v) => (
                    <div
                      key={v.name}
                      className="p-3 bg-canvas-subtle rounded-lg border border-canvas-active group hover:border-brand-200"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black text-ink-tertiary uppercase truncate pr-2">
                          {v.name}
                        </span>
                        <button
                          onClick={() => {
                            const newVal = prompt(`Update ${v.name}:`, v.value);
                            if (newVal !== null)
                              updateInstanceVariable(
                                selectedInstance.id,
                                v.name,
                                newVal,
                              ).then(() =>
                                fetchInstanceVariables(
                                  selectedInstance.id,
                                ).then(setVariables),
                              );
                          }}
                          className="text-[8px] font-black text-brand-500 opacity-0 group-hover:opacity-100 uppercase tracking-tighter"
                        >
                          Edit
                        </button>
                      </div>
                      <code className="text-[10px] font-mono text-ink-primary break-all block bg-white/40 p-1 rounded border border-canvas-active/20">
                        {JSON.stringify(v.value)}
                      </code>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-6 pl-1">
                {varAudit.map((h, i) => (
                  <div
                    key={i}
                    className="relative pl-5 border-l border-canvas-active last:pb-0"
                  >
                    <div className="absolute -left-[4.5px] top-0 w-2 h-2 rounded-full bg-accent-500 shadow-sm border border-white"></div>
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-[9px] font-black text-accent-600 uppercase pr-2 truncate">
                        {h.variableName}
                      </div>
                      <div className="text-[8px] text-ink-muted font-bold">
                        {new Date(h.createTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="bg-canvas-subtle p-2 rounded border border-canvas-active text-[10px] font-mono text-ink-secondary leading-tight">
                      {JSON.stringify(h.value)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
