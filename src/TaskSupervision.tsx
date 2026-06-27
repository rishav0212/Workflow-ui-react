import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  fetchAllSystemTasks,
  fetchHistoricTasks,
  reassignTask,
  bulkReassignTasks,
} from "./api";
import { fetchTenantUsers } from "./features/iam/api";
import DataGrid, { type Column } from "./components/common/DataGrid";
import TenantLink from "./components/common/TenantLink";

/**
 * GLOBAL TASK CACHE
 * Stores the 'active' and 'completed' task lists outside the component lifecycle.
 * This ensures that if the user navigates away (e.g., to inspect a process)
 * and returns, the data is instantly available without a network call.
 */
const TASK_CACHE: {
  active: any[] | null;
  completed: any[] | null;
} = {
  active: null,
  completed: null,
};

export default function TaskSupervision() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"active" | "completed">("active");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Users State
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [tasksToReassign, setTasksToReassign] = useState<string[] | null>(null);
  const [selectedUsersForReassign, setSelectedUsersForReassign] = useState<Set<string>>(new Set());

  // Filter States
  const [taskNameFilter, setTaskNameFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [processFilter, setProcessFilter] = useState("");

  /**
   * Optimized Task Loader
   * @param forceRefresh - If true, bypasses the global cache and fetches fresh data from the API.
   *
   * Logic:
   * 1. Check if data exists in TASK_CACHE for the current viewMode.
   * 2. If cached & !forceRefresh -> Use Cache (Instant Load).
   * 3. Else -> Fetch from API -> Update Cache -> Update State.
   */
  const loadTasks = (forceRefresh = false) => {
    // 1. Check Global Cache
    if (!forceRefresh && TASK_CACHE[viewMode]) {
      setTasks(TASK_CACHE[viewMode] || []);
      setLoading(false);
      return;
    }

    // 2. Fetch from API (Fallback or Forced)
    setLoading(true);
    const apiCall =
      viewMode === "active"
        ? fetchAllSystemTasks({ size: 100000 })
        : fetchHistoricTasks({ size: 100000 });

    apiCall
      .then((res: any) => {
        const data = res.data || [];
        setTasks(data);
        // Update the global cache so subsequent visits are instant
        TASK_CACHE[viewMode] = data;
        setSelectedIds(new Set());
      })
      .catch((err) => console.error("Failed to load tasks:", err))
      .finally(() => setLoading(false));
  };

  /**
   * Effect to trigger load on viewMode change.
   * We rely on the loadTasks internal logic to decide whether to fetch or use cache.
   */
  useEffect(() => {
    loadTasks();
    // Load users if not already loaded
    if (systemUsers.length === 0) {
      fetchTenantUsers().then(setSystemUsers).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  const uniqueAssignees = useMemo(() => {
    const assignees = new Set<string>();
    tasks.forEach((t) => {
      if (t.assignee) assignees.add(t.assignee);
    });
    return Array.from(assignees).sort();
  }, [tasks]);

  const uniqueProcesses = useMemo(() => {
    const processes = new Set<string>();
    tasks.forEach((t) => {
      const pName = t.processDefinitionName || t.processDefinitionId;
      if (pName) processes.add(pName);
    });
    return Array.from(processes).sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesName =
        !taskNameFilter ||
        task.name?.toLowerCase().includes(taskNameFilter.toLowerCase());

      const matchesAssignee =
        !assigneeFilter ||
        (assigneeFilter === "unassigned"
          ? !task.assignee
          : task.assignee === assigneeFilter);

      const pName = task.processDefinitionName || task.processDefinitionId;
      const matchesProcess = !processFilter || pName === processFilter;

      return matchesName && matchesAssignee && matchesProcess;
    });
  }, [tasks, taskNameFilter, assigneeFilter, processFilter]);

  const handleModeChange = (mode: "active" | "completed") => {
    setViewMode(mode);
    setTaskNameFilter("");
    setAssigneeFilter("");
    setProcessFilter("");
    setSelectedIds(new Set());
  };

  /**
   * Manual Refresh Handler
   * Allows the user to force a data update without reloading the page.
   */
  const handleRefresh = () => {
    loadTasks(true);
  };

  const handleBulkReassign = async (ids: string[]) => {
    setTasksToReassign(ids);
  };

  const columns: Column<any>[] = [
    {
      header: "Task Details",
      key: "name",
      sortable: true,
      render: (task) => (
        <div className="space-y-1 max-w-md">
          <div className="font-bold text-sm leading-tight text-ink-primary">
            {task.name}
          </div>
          {task.description && (
            <p className="text-[11px] text-ink-secondary leading-relaxed line-clamp-2 italic">
              {task.description}
            </p>
          )}
        </div>
      ),
    },
    {
      header: "Process",
      key: "processDefinitionName",
      sortable: true,
      render: (task) => (
        <div className="flex flex-col">
          <span className="text-[12px] text-ink-tertiary font-mono">
            {task.processDefinitionId?.split(":")[0]}
          </span>
        </div>
      ),
    },
    {
      header: "Business Context",
      key: "id",
      render: (task) => (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-black text-ink-tertiary tracking-widest">
              Task ID
            </span>
            <code className="text-[10px] text-brand-600 font-mono bg-brand-50/50 px-1.5 py-0.5 rounded border border-brand-100 w-fit">
              {task.id}
            </code>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-black text-ink-tertiary tracking-widest">
              Inst ID
            </span>
            <code className="text-[10px] text-ink-secondary font-mono bg-canvas-subtle/50 px-1.5 py-0.5 rounded w-fit">
              {task.processInstanceId}
            </code>
          </div>
        </div>
      ),
    },
    {
      header: "Assignee",
      key: "assignee",
      sortable: true,
      render: (task) => {
        if (task.assignee) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide border transition-all bg-brand-50/80 text-brand-600 border-brand-200 shadow-sm">
              <i className="fas fa-user-check text-[9px]"></i>
              {task.assignee}
            </span>
          );
        }

        const hasCandidates = (task.candidateGroups?.length > 0) || (task.candidateUsers?.length > 0);

        if (hasCandidates) {
          return (
            <div className="flex flex-col gap-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide border transition-all bg-status-info/15 text-status-info border-status-info/30 shadow-sm w-fit">
                <i className="fas fa-users text-[9px]"></i>
                Shared Task
              </span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {task.candidateGroups?.map((g: string) => (
                  <span key={g} className="text-[9px] bg-canvas-subtle border border-canvas-active text-ink-secondary px-1.5 py-0.5 rounded">
                    <i className="fas fa-users-cog text-[8px] mr-1"></i>{g}
                  </span>
                ))}
                {task.candidateUsers?.map((u: string) => (
                  <span key={u} className="text-[9px] bg-canvas-subtle border border-canvas-active text-ink-secondary px-1.5 py-0.5 rounded">
                    <i className="fas fa-user text-[8px] mr-1"></i>{u}
                  </span>
                ))}
              </div>
            </div>
          );
        }

        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide border transition-all bg-status-warning/15 text-status-warning border-status-warning/30 shadow-sm">
            <i className="fas fa-user-clock text-[9px]"></i>
            Unassigned
          </span>
        );
      },
    },
    {
      header: viewMode === "active" ? "Created" : "Completed",
      key: viewMode === "active" ? "createTime" : "endTime",
      sortable: true,
      render: (task) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-ink-primary font-semibold">
            {new Date(task.endTime || task.createTime).toLocaleDateString([], {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="text-[11px] text-ink-secondary font-medium">
            {new Date(task.endTime || task.createTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      className: "text-right",
      render: (task) => (
        <div
          className="flex justify-end gap-1.5 items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <TenantLink
            to={`/admin/inspect/${task.processInstanceId}`}
            className="px-3 py-1.5 bg-accent-50 text-accent-600 hover:bg-accent-100 font-bold text-[10px] uppercase tracking-wide rounded-lg border border-accent-200 shadow-soft transition-all hover:shadow-lifted"
          >
            <i className="fas fa-map-signs mr-1"></i>Path
          </TenantLink>
          {viewMode === "active" && (
            <button
              onClick={() => setTasksToReassign([task.id])}
              className="px-3 py-1.5 bg-brand-50 border-2 border-brand-200 text-brand-600 hover:bg-brand-100 hover:border-brand-400 rounded-lg text-[10px] font-bold uppercase tracking-wide shadow-soft transition-all hover:shadow-lifted"
            >
              <i className="fas fa-user-edit mr-1"></i>Reassign
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-canvas p-6 flex flex-col">
      <header className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-ink-primary tracking-tight">
          Global Task Supervision
        </h1>
        <p className="text-xs text-ink-tertiary mt-0.5 font-medium italic">
          High-level orchestration of all system activities.
        </p>
      </header>

      {/* Bulk Actions Floating Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-ink-primary text-ink-inverted px-6 py-3.5 rounded-2xl shadow-premium flex items-center gap-8 z-50 animate-slideUp border border-white/10">
          <span className="text-xs font-bold uppercase tracking-widest">
            {selectedIds.size} Selected
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleBulkReassign(Array.from(selectedIds))}
              className="bg-brand-500 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-soft hover:bg-brand-600 transition-all"
            >
              <i className="fas fa-user-edit mr-1"></i>Reassign All
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-white/40 hover:text-white"
            >
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>
        </div>
      )}

      {/* DataGrid with Inline Filters */}
      <DataGrid
        data={filteredTasks}
        columns={columns}
        loading={loading}
        getRowId={(task) => task.id}
        searchFields={[
          "name",
          "assignee",
          "processInstanceId",
          "id",
          "description",
          "processDefinitionName",
        ]}
        dateFilterField={viewMode === "active" ? "createTime" : "endTime"}
        onSelectionChange={setSelectedIds}
        headerActions={
          <div className="flex items-center gap-3">
            {/* REFRESH BUTTON: Moved into DataGrid actions row */}
            <button
              onClick={handleRefresh}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-canvas-active text-ink-secondary hover:text-brand-600 hover:border-brand-200 shadow-soft transition-all"
              title="Force Refresh Data"
            >
              <i
                className={`fas fa-sync-alt text-xs ${loading ? "animate-spin" : ""}`}
              ></i>
            </button>

            {/* Inline Process Filter */}
            <div className="relative w-40">
              <i className="fas fa-project-diagram absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px]"></i>
              <select
                value={processFilter}
                onChange={(e) => setProcessFilter(e.target.value)}
                className="w-full pl-7 pr-8 py-1.5 bg-canvas-subtle/50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-xs transition-all appearance-none cursor-pointer"
              >
                <option value="">All Processes</option>
                {uniqueProcesses.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <i className="fas fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none text-[8px]"></i>
            </div>

            {/* Inline Assignee Filter */}
            <div className="relative w-40">
              <i className="fas fa-user absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px]"></i>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="w-full pl-7 pr-8 py-1.5 bg-canvas-subtle/50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-xs transition-all appearance-none cursor-pointer"
              >
                <option value="">All Assignees</option>
                <option value="unassigned">Unassigned</option>
                {uniqueAssignees.map((user) => (
                  <option key={user} value={user}>
                    {user}
                  </option>
                ))}
              </select>
              <i className="fas fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none text-[8px]"></i>
            </div>

            {/* View Mode Switcher */}
            <div className="flex bg-canvas-subtle p-1 rounded-xl border border-canvas-active shadow-inner">
              {(["active", "completed"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${viewMode === mode
                      ? "bg-white text-brand-600 shadow-sm"
                      : "text-ink-tertiary"
                    }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* Reassign Modal */}
      {tasksToReassign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink-primary/60 backdrop-blur-sm"
            onClick={() => {
              setTasksToReassign(null);
              setSelectedUsersForReassign(new Set());
            }}
          ></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-canvas-subtle flex justify-between items-center bg-canvas-subtle shrink-0">
              <h3 className="text-lg font-serif font-bold text-ink-primary">
                Reassign Task{tasksToReassign.length > 1 ? "s" : ""}
              </h3>
              <button 
                onClick={() => {
                  setTasksToReassign(null);
                  setSelectedUsersForReassign(new Set());
                }} 
                className="text-ink-secondary hover:text-ink-primary transition-colors"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <p className="text-sm text-ink-secondary mb-4">
                Select a user to reassign {tasksToReassign.length} task{tasksToReassign.length > 1 ? "s" : ""} to:
              </p>

              {systemUsers.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">Loading users...</div>
              ) : (
                <div className="rounded-lg border border-canvas-active overflow-hidden">
                  {systemUsers.map((user) => {
                    const userId = user.user_id || user.id;
                    const isSelected = selectedUsersForReassign.has(userId);
                    return (
                      <button
                        key={userId}
                        onClick={() => {
                          const newSet = new Set(selectedUsersForReassign);
                          if (newSet.has(userId)) {
                            newSet.delete(userId);
                          } else {
                            newSet.add(userId);
                          }
                          setSelectedUsersForReassign(newSet);
                        }}
                        className={`w-full text-left px-4 py-3 border-b border-canvas-subtle last:border-b-0 flex items-center gap-3 group transition-colors ${
                          isSelected ? "bg-brand-50 border-l-4 border-l-brand-600" : "hover:bg-canvas-subtle border-l-4 border-l-transparent"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-transform ${
                          isSelected ? "bg-brand-600 text-white scale-105" : "bg-brand-100 text-brand-600 group-hover:scale-105"
                        }`}>
                          <i className="fas fa-user"></i>
                        </div>
                        <div>
                          <div className={`font-bold transition-colors ${
                            isSelected ? "text-brand-800" : "text-ink-primary group-hover:text-brand-700"
                          }`}>
                            {userId}
                          </div>
                          {(user.first_name || user.firstName) && (
                            <div className="text-xs text-ink-secondary">
                              {user.first_name || user.firstName} {user.last_name || user.lastName}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <div className="ml-auto text-brand-600">
                            <i className="fas fa-check-circle text-lg"></i>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-canvas-subtle bg-canvas-subtle flex justify-end gap-3 shrink-0">
              <button
                onClick={() => {
                  setTasksToReassign(null);
                  setSelectedUsersForReassign(new Set());
                }}
                className="px-4 py-2 rounded-lg text-sm font-bold text-ink-secondary hover:bg-neutral-200 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={selectedUsersForReassign.size === 0 || loading}
                onClick={async () => {
                  if (selectedUsersForReassign.size === 0) return;
                  setLoading(true);
                  try {
                    await bulkReassignTasks(tasksToReassign, Array.from(selectedUsersForReassign));
                    setSelectedIds(new Set());
                    setTasksToReassign(null);
                    setSelectedUsersForReassign(new Set());
                    loadTasks(true);
                  } catch (err) {
                    console.error("Reassignment failed", err);
                  } finally {
                    setLoading(false);
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-bold text-white shadow-soft transition-all flex items-center gap-2 ${
                  selectedUsersForReassign.size === 0 || loading
                    ? "bg-neutral-400 cursor-not-allowed opacity-70"
                    : "bg-brand-600 hover:bg-brand-700 hover:shadow-lifted active:scale-95"
                }`}
              >
                {loading ? (
                  <i className="fas fa-circle-notch fa-spin"></i>
                ) : (
                  <i className="fas fa-check"></i>
                )}
                Confirm Reassign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
