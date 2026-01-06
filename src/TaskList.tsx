import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { fetchTasks, parseApiError } from "./api"; // 🟢 Added helper
import { type Task } from "./types";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
// @ts-ignore
import { Formio } from "formiojs";

interface ExtendedTask extends Task {
  priority?: number;
  createTime: string;
  description?: string;
}

interface TaskListProps {
  currentUser: string;
  refreshTrigger?: number;
  addNotification: (msg: string, type: "success" | "error" | "info") => void; // 🟢 Added Prop
}

const timeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const TaskListSkeleton = () => (
  <div className="space-y-2 p-3">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div
        key={i}
        className="p-3 bg-white rounded border border-canvas-subtle animate-pulse"
      >
        <div className="flex justify-between items-center mb-2">
          <div className="h-4 bg-canvas-active rounded w-1/3"></div>
          <div className="h-3 bg-canvas-active rounded w-12"></div>
        </div>
        <div className="h-3 bg-canvas-active rounded w-3/4"></div>
      </div>
    ))}
  </div>
);

export default function TaskList({
  currentUser,
  refreshTrigger = 0,
  addNotification,
}: TaskListProps) {
  const navigate = useNavigate();
  const { taskId: activeTaskId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get("q") || "";
  const filterPriority = searchParams.get("priority") === "true";
  const filterTaskName = searchParams.get("category") || "all";

  const [tasks, setTasks] = useState<ExtendedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setShowFilterMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🟢 Updated Data Loading Logic
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("jwt_token");
      if (token) Formio.setToken(token);
      const data = await fetchTasks(currentUser);
      setTasks(data as ExtendedTask[]);
    } catch (err: any) {
      console.error(err);
      // 🟢 Display Toast on error
      addNotification(`Inbox Error: ${parseApiError(err)}`, "error");
    } finally {
      setLoading(false);
    }
  }, [currentUser, addNotification]);

  useEffect(() => {
    if (currentUser) loadData();
  }, [currentUser, refreshTrigger, loadData]);

  const updateFilter = (key: string, value: string | null) => {
    setSearchParams((prev) => {
      if (value) prev.set(key, value);
      else prev.delete(key);
      return prev;
    });
  };

  const clearAllFilters = () => setSearchParams({});

  const uniqueTaskNames = useMemo(() => {
    const names = new Set(
      tasks.map((t) => t.name).filter((n): n is string => !!n)
    );
    return Array.from(names).sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (searchQuery) {
          const lowerQ = searchQuery.toLowerCase();
          const matchesName = task.name?.toLowerCase().includes(lowerQ);
          const matchesDesc = task.description?.toLowerCase().includes(lowerQ);
          const matchesId = task.id?.includes(lowerQ);

          if (!matchesName && !matchesDesc && !matchesId) return false;
        }

        if (filterPriority && (task.priority || 0) <= 50) return false;
        if (filterTaskName !== "all" && task.name !== filterTaskName)
          return false;

        return true;
      })
      .sort((a, b) => {
        const prioA = a.priority || 0;
        const prioB = b.priority || 0;
        if (prioB !== prioA) return prioB - prioA;
        return (
          new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
        );
      });
  }, [tasks, searchQuery, filterPriority, filterTaskName]);

  const activeFiltersCount =
    (filterPriority ? 1 : 0) + (filterTaskName !== "all" ? 1 : 0);
  const hasActiveFilters = activeFiltersCount > 0 || searchQuery.length > 0;

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="px-4 py-3 border-b border-canvas-subtle bg-surface z-20 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-serif font-bold text-ink-primary">
              Inbox
            </h2>
            <button
              onClick={() => navigate("/dashboard")}
              className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full hover:bg-brand-100 transition-colors"
              title="Go to Dashboard"
            >
              <i className="fas fa-chart-pie mr-1"></i> Dashboard
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="w-6 h-6 flex items-center justify-center text-ink-tertiary hover:text-brand-600 hover:bg-brand-50 rounded-md transition-all focus:outline-none disabled:opacity-50"
              title="Refresh Tasks"
            >
              <i
                className={`fas fa-sync-alt text-xs ${
                  loading ? "animate-spin" : ""
                }`}
              ></i>
            </button>

            <span className="text-xs font-bold bg-canvas-subtle px-2 py-0.5 rounded border border-canvas-active flex items-center gap-1">
              <span className="text-ink-primary">{filteredTasks.length}</span>
              <span className="text-ink-tertiary opacity-60 font-medium">
                / {tasks.length}
              </span>
            </span>
          </div>
        </div>

        <div className="relative group mb-2" ref={filterRef}>
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary text-xs"></i>

          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => updateFilter("q", e.target.value)}
            className="w-full pl-8 pr-16 py-2 bg-canvas-subtle border border-transparent focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 rounded-lg text-sm text-ink-primary transition-all outline-none placeholder:text-ink-tertiary"
          />

          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery && (
              <button
                onClick={() => updateFilter("q", null)}
                className="w-6 h-6 flex items-center justify-center text-ink-tertiary hover:text-ink-primary hover:bg-canvas-active rounded-md"
              >
                <i className="fas fa-times text-[10px]"></i>
              </button>
            )}
            <div className="w-px h-3 bg-ink-tertiary/20 mx-0.5"></div>
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                showFilterMenu || activeFiltersCount > 0
                  ? "bg-brand-100 text-brand-600"
                  : "text-ink-tertiary hover:bg-canvas-active"
              }`}
            >
              <i className="fas fa-sliders-h text-[10px]"></i>
            </button>
          </div>

          {showFilterMenu && (
            <div className="absolute top-full right-0 mt-1 w-64 bg-white rounded-lg shadow-premium border border-canvas-subtle p-2 z-50">
              <div className="mb-2">
                <div className="text-[9px] font-bold text-ink-tertiary uppercase tracking-wider mb-1 px-1">
                  Priority
                </div>
                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-canvas-subtle cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterPriority}
                    onChange={(e) =>
                      updateFilter("priority", e.target.checked ? "true" : null)
                    }
                    className="accent-brand-600"
                  />
                  <span className="text-sm font-medium text-ink-primary">
                    High Priority Only
                  </span>
                </label>
              </div>
              <div className="border-t border-canvas-subtle my-1"></div>
              <div>
                <div className="text-[9px] font-bold text-ink-tertiary uppercase tracking-wider mb-1 px-1">
                  Category
                </div>
                <div className="max-h-40 overflow-y-auto custom-scrollbar">
                  <button
                    onClick={() => {
                      updateFilter("category", null);
                      setShowFilterMenu(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm ${
                      filterTaskName === "all"
                        ? "bg-brand-50 text-brand-700 font-bold"
                        : "text-ink-secondary hover:bg-canvas-subtle"
                    }`}
                  >
                    All Categories
                  </button>
                  {uniqueTaskNames.map((name) => (
                    <button
                      key={name}
                      onClick={() => {
                        updateFilter("category", name);
                        setShowFilterMenu(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm truncate ${
                        filterTaskName === name
                          ? "bg-brand-50 text-brand-700 font-bold"
                          : "text-ink-secondary hover:bg-canvas-subtle"
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5">
            {filterPriority && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-brand-50 text-brand-700 border border-brand-100">
                High Priority{" "}
                <button onClick={() => updateFilter("priority", null)}>
                  <i className="fas fa-times hover:text-brand-900"></i>
                </button>
              </span>
            )}
            {filterTaskName !== "all" && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-sage-50 text-sage-700 border border-sage-100 max-w-[120px]">
                <span className="truncate">{filterTaskName}</span>
                <button onClick={() => updateFilter("category", null)}>
                  <i className="fas fa-times hover:text-sage-900"></i>
                </button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-[10px] font-bold text-ink-tertiary hover:text-brand-600 ml-auto"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto bg-surface p-2 custom-scrollbar">
        {loading ? (
          <TaskListSkeleton />
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-24 text-center opacity-60">
            <i className="fas fa-search text-2xl text-ink-tertiary mb-2"></i>
            <p className="text-sm font-semibold text-ink-secondary">
              No matching tasks
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTasks.map((task) => {
              const isActive = task.id === activeTaskId;
              const isHighPriority = (task.priority || 0) > 50;

              return (
                <div
                  key={task.id}
                  onClick={() =>
                    navigate(`/task/${task.id}?${searchParams.toString()}`)
                  }
                  className={`
                    group relative p-3 cursor-pointer transition-all border rounded-lg
                    ${
                      isActive
                        ? "bg-brand-50 border-brand-500 shadow-sm"
                        : "bg-white border-canvas-subtle hover:border-brand-200 hover:shadow-sm"
                    }
                  `}
                >
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h4
                      className={`text-base font-semibold truncate ${
                        isActive ? "text-brand-900" : "text-ink-primary"
                      }`}
                    >
                      {task.name}
                    </h4>
                    <span
                      className={`text-xs whitespace-nowrap mt-1 ${
                        isActive
                          ? "text-brand-700 font-medium"
                          : "text-ink-tertiary"
                      }`}
                    >
                      {timeAgo(task.createTime)}
                    </span>
                  </div>

                  <div className="flex justify-between items-end gap-2">
                    <p className="text-sm text-ink-secondary truncate flex-1 opacity-90">
                      {task.description || "No description"}
                    </p>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isHighPriority && (
                        <span className="text-[10px] font-bold text-status-error bg-status-error/10 px-1.5 py-0.5 rounded">
                          High
                        </span>
                      )}
                      <span className="text-[10px] text-ink-tertiary font-mono">
                        #{task.id?.substring(0, 4)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
