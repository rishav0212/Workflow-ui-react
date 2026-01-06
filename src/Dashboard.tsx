import { useEffect, useState, useCallback } from "react";
import { fetchDashboardStats, fetchCompletedTasks } from "./api";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
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
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Search Debounce: Triggers the backend OR query (Name + Description)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Load Stats
  useEffect(() => {
    fetchDashboardStats().then(setStats).catch(console.error);
  }, []);

  // Load History Table
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      // The backend now handles the "Name OR Description" logic via this call
      const data = await fetchCompletedTasks(page, 10, debouncedSearch);
      setTasks(data.content || []);
      setTotalPages(data.totalPages || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(0); // Reset to first page on new search
  };

  const clearSearch = () => {
    setSearch("");
    setPage(0);
  };

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
              )
            )}
          </div>
        )}
      </div>

      {/* 3. HISTORY TABLE */}
      {/* 3. HISTORY TABLE */}
      <div className="panel-rounded overflow-hidden bg-surface border border-slate-200 shadow-sm">
        {/* INTEGRATED HEADER: Title + Pagination + Search */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap gap-4 justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800">Recent History</h2>

          <div className="flex items-center gap-4">
            {/* PAGINATION CONTROLS */}
            <div className="flex items-center gap-3 pr-4 border-r border-slate-200">
              <span className="text-xs text-slate-500 font-medium">
                Page {page + 1} of {totalPages || 1}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || loadingHistory}
                  className="px-2 py-1 text-xs font-semibold rounded border border-slate-300 bg-white disabled:opacity-50 hover:bg-slate-50 transition-colors"
                >
                  <i className="fas fa-chevron-left mr-1"></i> Prev
                </button>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1 || loadingHistory}
                  className="px-2 py-1 text-xs font-semibold rounded border border-slate-300 bg-white disabled:opacity-50 hover:bg-slate-50 transition-colors"
                >
                  Next <i className="fas fa-chevron-right ml-1"></i>
                </button>
              </div>
            </div>

            {/* SEARCH INPUT */}
            <div className="relative group">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type="text"
                placeholder="Search name or description..."
                value={search}
                onChange={handleSearchChange}
                className="pl-9 pr-8 py-1.5 input-base w-64 focus:ring-2 focus:ring-brand-400/20"
              />
              {search && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <i className="fas fa-times-circle"></i>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Task Name</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Completed On</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingHistory ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-400">
                    <i className="fas fa-circle-notch fa-spin text-2xl text-orange-400 mb-2"></i>
                    <p>Loading history...</p>
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-400">
                    {debouncedSearch
                      ? `No matches found for "${debouncedSearch}"`
                      : "No records found."}
                  </td>
                </tr>
              ) : (
                tasks.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {t.name}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm truncate max-w-xs">
                      {t.description || (
                        <span className="text-slate-300 italic">
                          No description
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs font-mono">
                      {new Date(t.endTime).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() =>
                          navigate(`/inbox/task/${t.id}?tab=history`)
                        }
                        className="text-orange-600 text-xs font-bold hover:text-orange-700 hover:underline"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
