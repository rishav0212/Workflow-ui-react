import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchAllSystemTasks,
  fetchHistoricTasks,
  reassignTask,
  bulkReassignTasks,
} from "./api";
import DataTable, { type Column } from "./components/common/DataTable";

export default function TaskSupervision() {
  // Updated state to handle pagination data
  const [tasks, setTasks] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);

  // Controls
  const [viewMode, setViewMode] = useState<"active" | "completed">("active");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Search and Sort Params
  const [queryParams, setQueryParams] = useState({
    search: "",
    sort: "createTime",
    order: "desc" as "asc" | "desc",
  });

  // 🟢 Enhanced Logic: Load Tasks with Pagination/Search/Sort
  const loadTasks = () => {
    setLoading(true);

    // Construct Flowable-compatible parameters
    const params = {
      start: currentPage * pageSize,
      size: pageSize,
      sort: viewMode === "active" ? queryParams.sort : "endTime",
      order: queryParams.order,
      // Backend expects % for partial matches
      nameLike: queryParams.search ? `%${queryParams.search}%` : undefined,
    };

    const apiCall =
      viewMode === "active"
        ? fetchAllSystemTasks(params)
        : fetchHistoricTasks(params);

    apiCall
      .then((res: any) => {
        // Flowable returns { data: [], total: X, size: Y, start: Z }
        setTasks(res.data || []);
        setTotalItems(res.total || 0);
      })
      .catch((err) => console.error("Failed to load tasks:", err))
      .finally(() => setLoading(false));
  };

  // Reload when any control changes
  useEffect(() => {
    loadTasks();
  }, [viewMode, currentPage, queryParams]);

  // Reset page when switching modes or searching
  const handleModeChange = (mode: "active" | "completed") => {
    setViewMode(mode);
    setCurrentPage(0);
    setSelectedIds(new Set());
  };

  const handleBulkReassign = async (ids: string[]) => {
    const newUser = prompt(
      `Enter username to reassign ${ids.length} tasks to:`
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
        <div>
          <div className="font-bold text-ink-primary leading-tight">
            {task.name}
          </div>
          <div className="text-[10px] text-ink-tertiary font-mono mt-0.5">
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
          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
            task.assignee
              ? "bg-brand-50 text-brand-700 border border-brand-100"
              : "bg-status-warning/10 text-status-warning border border-status-warning/20"
          }`}
        >
          {task.assignee || "Unassigned"}
        </span>
      ),
    },
    {
      header: viewMode === "active" ? "Created" : "Completed",
      key: viewMode === "active" ? "createTime" : "endTime",
      sortable: true,
      render: (task) => (
        <span className="text-ink-tertiary font-medium">
          {new Date(task.endTime || task.createTime).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (task) => (
        <div className="flex gap-4 justify-end items-center">
          <Link
            to={`/admin/inspect/${task.processInstanceId}`}
            className="text-[10px] font-black uppercase text-accent-600 hover:text-accent-700 tracking-widest flex items-center gap-1.5"
          >
            <i className="fas fa-fingerprint"></i> Path
          </Link>
          {viewMode === "active" && (
            <button
              onClick={() => {
                const newUser = prompt("Enter username:", task.assignee || "");
                if (newUser) reassignTask(task.id, newUser).then(loadTasks);
              }}
              className="text-[10px] font-black uppercase text-brand-600 hover:underline"
            >
              Reassign
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-canvas p-8">
      <DataTable
        title="Global Task Supervision"
        description="High-level orchestration of all system activities."
        data={tasks}
        columns={columns}
        loading={loading}
        // 🟢 Pagination Props
        totalItems={totalItems}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        // 🟢 Search & Sort Props
        onParamsChange={(newParams) => {
          setCurrentPage(0); // Reset to page 1 on search/sort
          setQueryParams((prev) => ({
            ...prev,
            ...newParams,
            // Ensure order is strictly cast to the expected literal type
            order: newParams.order as "asc" | "desc",
          }));
        }}
        // 🟢 Selection Props
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActions={[
          {
            label: "Bulk Reassign",
            icon: "fas fa-user-edit",
            onClick: handleBulkReassign,
          },
        ]}
        // 🟢 Filter Logic
        filterElement={
          <div className="flex bg-canvas-subtle p-1 rounded-xl border border-canvas-active shadow-inner">
            {(["active", "completed"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
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
