import { useEffect, useState, useCallback } from "react";
import { fetchDashboardStats, fetchCompletedTasks, parseApiError } from "./api";
import { useNavigate } from "react-router-dom";
import DataGrid, { type Column } from "./components/common/DataGrid";

export default function Dashboard({
  addNotification,
}: {
  addNotification: (msg: string, type: "success" | "error" | "info") => void;
}) {
  const navigate = useNavigate();

  // Data State
  const [stats, setStats] = useState<any>({
    active: 0,
    highPriority: 0,
    completed: 0,
    overdue: 0,
    taskDistribution: {},
  });

  // Table State
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [search, setSearch] = useState("");

  // Load Stats
  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch((err) => {
        console.error(err);
        addNotification(
          `Failed to load dashboard stats: ${parseApiError(err)}`,
          "error",
        );
      });
  }, [addNotification]);

  // Load History Table
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await fetchCompletedTasks(0, 100, search);
      setTasks(data.content || []);
    } catch (err: any) {
      console.error(err);
      addNotification(
        `Failed to load task history: ${parseApiError(err)}`,
        "error",
      );
    } finally {
      setLoadingHistory(false);
    }
  }, [search, addNotification]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadHistory();
    }, 500);
    return () => clearTimeout(timer);
  }, [search, loadHistory]);

  const clearSearch = () => {
    setSearch("");
  };

  // Columns for DataGrid
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
            ID: {task.id.substring(0, 8)}...
          </div>
        </div>
      ),
    },
    {
      header: "Description",
      key: "description",
      render: (task) => (
        <p className="text-xs text-ink-secondary leading-relaxed max-w-lg truncate">
          {task.description ? (
            task.description
          ) : (
            <span className="text-ink-muted italic">No description</span>
          )}
        </p>
      ),
    },
    {
      header: "Completed On",
      key: "endTime",
      sortable: true,
      render: (task) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-ink-primary font-semibold">
            {new Date(task.endTime).toLocaleDateString([], {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="text-[11px] text-ink-secondary font-medium">
            {new Date(task.endTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      ),
    },
    {
      header: "Action",
      key: "action",
      className: "text-right",
      render: (task) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/inspect/instance?taskId=${task.id}`);
          }}
          className="px-3 py-1.5 bg-accent-50 text-accent-600 hover:bg-accent-100 font-bold text-[10px] uppercase tracking-wide rounded-lg border border-accent-200 shadow-soft transition-all hover:shadow-lifted"
          title="View Task Details"
        >
          <i className="fas fa-arrow-right mr-1"></i>Details
        </button>
      ),
    },
  ];

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-canvas p-6 md:p-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-ink-primary mb-1">
          Dashboard
        </h1>
        <p className="text-ink-secondary">
          Overview of your current workload and performance.
        </p>
      </div>

      {/* 1. KEY METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Pending"
          value={stats.active}
          icon="fas fa-inbox"
          styleClass="bg-surface border-brand-200"
          iconBg="bg-brand-50 text-brand-600"
        />
        <MetricCard
          label="High Priority"
          value={stats.highPriority}
          icon="fas fa-fire"
          styleClass="bg-surface border-status-error/20"
          iconBg="bg-status-error/10 text-status-error"
        />
        <MetricCard
          label="Overdue"
          value={stats.overdue}
          icon="fas fa-clock"
          styleClass="bg-surface border-status-warning/20"
          iconBg="bg-status-warning/10 text-status-warning"
        />
        <MetricCard
          label="Completed"
          value={stats.completed}
          icon="fas fa-check-circle"
          styleClass="bg-surface border-sage-200"
          iconBg="bg-sage-50 text-sage-600"
        />
      </div>

      {/* 2. TASK CATEGORIES */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-ink-primary mb-4 flex items-center gap-2">
          <i className="fas fa-folder-open text-brand-400"></i> Active
          Categories
        </h2>

        {!stats.taskDistribution ||
        Object.keys(stats.taskDistribution).length === 0 ? (
          <div className="p-8 border-2 border-dashed border-canvas-active rounded-panel text-center text-ink-muted bg-canvas-subtle/50">
            No active tasks found. All caught up!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.taskDistribution).map(
              ([name, count]: any) => (
                <div
                  key={name}
                  onClick={() =>
                    navigate(`/inbox?category=${encodeURIComponent(name)}`)
                  }
                  className="card-interactive group cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-500 flex items-center justify-center text-lg group-hover:bg-brand-500 group-hover:text-white transition-all">
                      <i className="fas fa-tasks"></i>
                    </div>
                    <span className="bg-canvas-subtle text-ink-secondary text-xs font-bold px-2 py-1 rounded-md group-hover:bg-brand-100 group-hover:text-brand-800 transition-colors">
                      {count} Pending
                    </span>
                  </div>
                  <h3 className="font-bold text-ink-primary text-lg mb-1 truncate">
                    {name}
                  </h3>
                  <p className="text-xs text-ink-tertiary flex items-center gap-1">
                    View tasks{" "}
                    <i className="fas fa-arrow-right opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-1"></i>
                  </p>
                </div>
              ),
            )}
          </div>
        )}
      </div>

      {/* 3. HISTORY TABLE - Using DataGrid */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-ink-primary mb-4">
          Recent History
        </h2>
        <DataGrid
          data={tasks}
          columns={columns}
          loading={loadingHistory}
          getRowId={(task) => task.id}
          searchFields={["name", "description"]}
          itemsPerPage={10}
          headerActions={
            <div className="text-sm text-ink-secondary font-medium">
              {tasks.length} completed tasks
            </div>
          }
        />
      </div>
    </div>
  );
}

// Sub-component for Metric Cards
function MetricCard({ label, value, icon, styleClass, iconBg }: any) {
  return (
    <div
      className={`p-5 rounded-panel border shadow-soft flex items-center gap-4 transition-all hover:shadow-lifted ${styleClass}`}
    >
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm ${iconBg}`}
      >
        <i className={icon}></i>
      </div>
      <div>
        <p className="text-2xl font-bold text-ink-primary">{value}</p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-ink-tertiary">
          {label}
        </p>
      </div>
    </div>
  );
}
