import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchAllSystemTasks,
  fetchHistoricTasks,
  reassignTask,
  bulkReassignTasks,
} from "./api";
import DataGrid, { type Column } from "./components/common/DataGrid";

export default function TaskSupervision() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"active" | "completed">("active");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>({ key: "createTime", direction: "desc" });

  const loadTasks = () => {
    setLoading(true);
    const apiCall =
      viewMode === "active"
        ? fetchAllSystemTasks({ size: 100000 })
        : fetchHistoricTasks({ size: 100000 });

    apiCall
      .then((res: any) => {
        setTasks(res.data || []);
        setSelectedIds(new Set());
      })
      .catch((err) => console.error("Failed to load tasks:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTasks();
  }, [viewMode]);

  const handleModeChange = (mode: "active" | "completed") => {
    setViewMode(mode);
    setSelectedIds(new Set());
  };

  const handleBulkReassign = async (ids: string[]) => {
    const newUser = prompt(
      `Enter username to reassign ${ids.length} tasks to:`,
    );
    if (newUser) {
      setLoading(true);
      try {
        await bulkReassignTasks(ids, newUser);
        setSelectedIds(new Set());
        loadTasks();
      } catch (err) {
        console.error("Bulk reassignment failed", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const columns: Column<any>[] = [
    {
      header: "Task Name",
      key: "name",
      sortable: true,
      render: (task) => (
        <div className="space-y-1">
          <div className="font-bold text-xs leading-tight text-ink-primary">
            {task.name}
          </div>
          <div className="text-[11px] text-ink-tertiary font-mono bg-canvas-subtle/50 px-2 py-0.5 rounded-md w-fit">
            PID: {task.processInstanceId?.substring(0, 8)}...
          </div>
        </div>
      ),
    },
    {
      header: "Assignee",
      key: "assignee",
      sortable: true,
      render: (task) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all ${
            task.assignee
              ? "bg-brand-50/80 text-brand-600 border-brand-200 shadow-sm"
              : "bg-status-warning/15 text-status-warning border-status-warning/30 shadow-sm"
          }`}
        >
          <i
            className={`fas text-[9px] ${task.assignee ? "fa-user-check" : "fa-user-clock"}`}
          ></i>
          {task.assignee || "Unassigned"}
        </span>
      ),
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
          <Link
            to={`/admin/inspect/${task.processInstanceId}`}
            className="px-3 py-1.5 bg-accent-50 text-accent-600 hover:bg-accent-100 font-bold text-[10px] uppercase tracking-wide rounded-lg border border-accent-200 shadow-soft transition-all hover:shadow-lifted"
            title="View Process Path"
          >
            <i className="fas fa-map-signs mr-1"></i>Path
          </Link>
          {viewMode === "active" && (
            <button
              onClick={() => {
                const newUser = prompt("Enter username:", task.assignee || "");
                if (newUser)
                  reassignTask(task.id, newUser).then(() => loadTasks());
              }}
              className="px-3 py-1.5 bg-brand-50 border-2 border-brand-200 text-brand-600 hover:bg-brand-100 hover:border-brand-400 rounded-lg text-[10px] font-bold uppercase tracking-wide shadow-soft transition-all hover:shadow-lifted"
              title="Reassign Task"
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
              className="text-white/40 hover:text-white transition-colors"
            >
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>
        </div>
      )}

      {/* DataGrid with View Mode Filter */}
      <DataGrid
        data={tasks}
        columns={columns}
        loading={loading}
        getRowId={(task) => task.id}
        searchFields={["name", "assignee", "processInstanceId"]}
        onSelectionChange={setSelectedIds}
        headerActions={
          <div className="flex bg-canvas-subtle p-1 rounded-xl border border-canvas-active shadow-inner relative z-30">
            {(["active", "completed"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  viewMode === mode
                    ? "bg-white text-brand-600 shadow-sm"
                    : "text-ink-tertiary"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        }
      />
    </div>
  );
}
