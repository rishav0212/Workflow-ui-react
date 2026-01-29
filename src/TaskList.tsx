import { useEffect, useState, useMemo, useRef, useCallback, memo } from "react";
import { fetchTasks, parseApiError } from "./api";
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
  addNotification: (msg: string, type: "success" | "error" | "info") => void;
}

const timeAgo = (dateStr: string) => {
  if (!dateStr) return "";

  const date = new Date(dateStr);
  const now = new Date();

  // Check if date is valid
  if (isNaN(date.getTime())) return "Invalid Date";

  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  // FIX: Handle future dates (negative diff) caused by clock skew
  if (diff < 0) return "Just now";

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;

  // Optional: Show actual date if older than 7 days
  if (diff > 604800) {
    return date.toLocaleDateString();
  }

  return `${Math.floor(diff / 86400)}d ago`;
};

// 🎨 FIXED: Premium Shimmer Loading Skeleton
const TaskListSkeleton = () => (
  <div className="space-y-3 p-3">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div
        key={i}
        className="relative p-4 bg-white rounded-xl border border-canvas-subtle overflow-hidden shadow-soft"
        style={{
          animationDelay: `${i * 60}ms`,
          opacity: 0,
          animation: "skeletonFade 0.4s ease-out forwards",
        }}
      >
        {/* Shimmer Effect */}
        <div
          className="absolute inset-0"
          style={{
            animation: "shimmer 2.5s infinite",
            background:
              "linear-gradient(90deg, transparent 0%, rgba(168, 85, 166, 0.06) 50%, transparent 100%)",
            transform: "translateX(-100%)",
          }}
        />

        {/* Header Row */}
        <div className="flex justify-between items-center mb-3 relative z-10">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-200 animate-pulse" />
            <div className="h-5 bg-neutral-200 rounded-lg w-2/5 animate-pulse" />
          </div>
          <div className="h-4 bg-neutral-100 rounded-full w-16 animate-pulse" />
        </div>

        {/* Description Row */}
        <div className="flex justify-between items-center pl-4 relative z-10">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-neutral-100 rounded w-4/5 animate-pulse" />
            <div className="h-3.5 bg-neutral-100 rounded w-2/3 animate-pulse" />
          </div>
          <div className="flex gap-2 ml-4">
            <div className="h-5 w-12 bg-accent-50 rounded-md animate-pulse" />
            <div className="h-5 w-10 bg-neutral-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    ))}

    <style>{`
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(200%); }
      }
      @keyframes skeletonFade {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `}</style>
  </div>
);

// 🎨 FIXED: Isolated Input Component with Internal Debounce
const SearchInput = memo(
  ({
    initialValue,
    onSearchChange,
  }: {
    initialValue: string;
    onSearchChange: (val: string) => void;
  }) => {
    const [value, setValue] = useState(initialValue);

    // 1. Sync with parent ONLY if the difference is significant (prevents echo loop)
    useEffect(() => {
      if (initialValue !== value) {
        setValue(initialValue);
      }
    }, [initialValue]);

    // 2. Handle typing immediately (Visual Update)
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
    };

    // 3. Debounce the callback to parent (Logic Update)
    useEffect(() => {
      const handler = setTimeout(() => {
        onSearchChange(value);
      }, 300);

      return () => clearTimeout(handler);
    }, [value, onSearchChange]);

    return (
      <input
        type="text"
        placeholder="Search tasks..."
        value={value}
        onChange={handleChange}
        className="w-full pl-10 pr-20 py-2.5 bg-canvas-subtle border border-canvas-active focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 focus:shadow-brand-sm rounded-xl text-sm text-ink-primary transition-all outline-none placeholder:text-neutral-400 hover:border-neutral-300"
      />
    );
  },
);

export default function TaskList({
  currentUser,
  refreshTrigger = 0,
  addNotification,
}: TaskListProps) {
  const navigate = useNavigate();
  const { taskId: activeTaskId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // REMOVED: localSearch state and duplicate useEffect.
  // We now rely on the SearchInput component to handle the typing state.

  const [tooltip, setTooltip] = useState({
    opacity: 0,
    x: 0,
    y: 0,
    text: "",
    isVisible: false,
  });

  const searchQuery = searchParams.get("q") || "";
  const filterPriority = searchParams.get("priority") === "true";
  const filterTaskName = searchParams.get("category") || "all";
  const sortBy = searchParams.get("sort") || "priority";

  const [tasks, setTasks] = useState<ExtendedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Direct handler for search updates (Child handles debounce now)
  const handleSearchChange = useCallback(
    (val: string) => {
      setSearchParams(
        (prev) => {
          if (val) prev.set("q", val);
          else prev.delete("q");
          return prev;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setShowFilterMenu(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("jwt_token");
      if (token) Formio.setToken(token);
      const data = await fetchTasks(currentUser);
      setTasks(data as ExtendedTask[]);
    } catch (err: any) {
      console.error(err);
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
      tasks.map((t) => t.name).filter((n): n is string => !!n),
    );
    return Array.from(names).sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
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
    });

    return filtered.sort((a, b) => {
      if (sortBy === "priority") {
        const prioA = a.priority || 0;
        const prioB = b.priority || 0;
        if (prioB !== prioA) return prioB - prioA;
        return (
          new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
        );
      } else if (sortBy === "newest") {
        return (
          new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
        );
      } else if (sortBy === "oldest") {
        return (
          new Date(a.createTime).getTime() - new Date(b.createTime).getTime()
        );
      } else if (sortBy === "name") {
        return (a.name || "").localeCompare(b.name || "");
      }
      return 0;
    });
  }, [tasks, searchQuery, filterPriority, filterTaskName, sortBy]);

  const activeFiltersCount =
    (filterPriority ? 1 : 0) + (filterTaskName !== "all" ? 1 : 0);
  const hasActiveFilters = activeFiltersCount > 0 || searchQuery.length > 0;

  const getSortLabel = () => {
    switch (sortBy) {
      case "priority":
        return "Priority";
      case "newest":
        return "Newest";
      case "oldest":
        return "Oldest";
      case "name":
        return "A-Z";
      default:
        return "Sort";
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-surface via-canvas/50 to-canvas">
      {/* Header */}
      <div className="px-4 py-3 border-b border-canvas-subtle bg-white shadow-soft sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-serif font-bold text-ink-primary flex items-center gap-2.5">
              <span className="w-1 h-7 bg-gradient-to-b from-brand-400 via-brand-500 to-brand-600 rounded-full shadow-brand-sm"></span>
              Inbox
            </h2>
            <button
              onClick={() => navigate("/dashboard")}
              className="text-xs font-semibold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full hover:bg-brand-100 hover:shadow-brand-sm transition-all hover:scale-105 border border-brand-100"
              title="Go to Dashboard"
            >
              <i className="fas fa-chart-pie mr-1.5"></i>Dashboard
            </button>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={loadData}
              disabled={loading}
              className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all focus:outline-none disabled:opacity-50 hover:scale-105 border border-transparent hover:border-brand-100"
              title="Refresh Tasks"
            >
              <i
                className={`fas fa-sync-alt text-xs ${
                  loading ? "animate-spin" : ""
                }`}
              ></i>
            </button>

            {/* Counter Badge */}
            <span className="text-xs font-bold bg-canvas-subtle px-3 py-1.5 rounded-lg border border-canvas-active flex items-center gap-2 shadow-soft">
              <span className="text-brand-600 font-black text-sm">
                {filteredTasks.length}
              </span>
              <span className="text-neutral-400 font-medium text-[11px]">
                / {tasks.length}
              </span>
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative group mb-2">
          <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-brand-500 text-xs transition-colors"></i>

          <SearchInput
            initialValue={searchQuery}
            onSearchChange={handleSearchChange}
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery && (
              <button
                onClick={() => updateFilter("q", null)}
                className="w-6 h-6 flex items-center justify-center text-neutral-400 hover:text-ink-primary hover:bg-canvas-active rounded-md transition-all hover:scale-110"
              >
                <i className="fas fa-times text-[10px]"></i>
              </button>
            )}
            <div className="w-px h-4 bg-neutral-200"></div>

            {/* Sort Button */}
            <div className="relative" ref={sortRef}>
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className={`px-2.5 h-7 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all border ${
                  showSortMenu
                    ? "bg-accent-50 text-accent-700 shadow-accent-sm border-accent-200"
                    : "text-neutral-600 hover:bg-canvas-active border-transparent hover:border-canvas-active"
                }`}
                title="Sort tasks"
              >
                <i className="fas fa-sort text-[10px]"></i>
                <span className="hidden sm:inline">{getSortLabel()}</span>
              </button>

              {showSortMenu && (
                <div className="absolute top-full right-0 mt-2 w-44 bg-white rounded-xl shadow-floating border border-canvas-subtle p-1.5 z-50 animate-slideDown">
                  {[
                    {
                      value: "priority",
                      icon: "fas fa-fire",
                      label: "Priority",
                    },
                    {
                      value: "newest",
                      icon: "fas fa-clock",
                      label: "Newest First",
                    },
                    {
                      value: "oldest",
                      icon: "fas fa-history",
                      label: "Oldest First",
                    },
                    {
                      value: "name",
                      icon: "fas fa-sort-alpha-down",
                      label: "A-Z",
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        updateFilter("sort", option.value);
                        setShowSortMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all ${
                        sortBy === option.value
                          ? "bg-accent-50 text-accent-700 shadow-accent-sm"
                          : "text-neutral-600 hover:bg-canvas-subtle"
                      }`}
                    >
                      <i
                        className={`${option.icon} text-[10px] w-3.5 text-center`}
                      ></i>
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border relative ${
                showFilterMenu || activeFiltersCount > 0
                  ? "bg-brand-50 text-brand-600 shadow-brand-sm border-brand-200"
                  : "text-neutral-500 hover:bg-canvas-active border-transparent hover:border-canvas-active"
              }`}
            >
              <i className="fas fa-sliders-h text-[10px]"></i>
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center shadow-brand-md ring-2 ring-white">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Filter Dropdown - FIXED: No transparency issues */}
          {showFilterMenu && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-floating border border-canvas-subtle p-3 z-50 animate-slideDown">
              <div className="mb-3">
                <div className="text-[9px] font-bold text-neutral-600 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
                  <i className="fas fa-fire text-status-error text-[8px]"></i>
                  Priority
                </div>
                <label className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-canvas-subtle cursor-pointer transition-all group">
                  <input
                    type="checkbox"
                    checked={filterPriority}
                    onChange={(e) =>
                      updateFilter("priority", e.target.checked ? "true" : null)
                    }
                    className="accent-brand-600 w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium text-ink-primary group-hover:text-brand-600 transition-colors">
                    High Priority Only
                  </span>
                </label>
              </div>
              <div className="border-t border-canvas-subtle my-2"></div>
              <div>
                <div className="text-[9px] font-bold text-neutral-600 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
                  <i className="fas fa-folder text-accent-600 text-[8px]"></i>
                  Category
                </div>
                <div className="max-h-40 overflow-y-auto custom-scrollbar">
                  <button
                    onClick={() => {
                      updateFilter("category", null);
                      setShowFilterMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-all ${
                      filterTaskName === "all"
                        ? "bg-brand-50 text-brand-700 font-bold shadow-soft"
                        : "text-neutral-600 hover:bg-canvas-subtle"
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
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate mb-1 transition-all ${
                        filterTaskName === name
                          ? "bg-brand-50 text-brand-700 font-bold shadow-soft"
                          : "text-neutral-600 hover:bg-canvas-subtle"
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

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 animate-slideDown">
            {filterPriority && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200 shadow-soft hover:shadow-brand-sm transition-all">
                <i className="fas fa-fire text-[8px]"></i>
                High Priority
                <button
                  onClick={() => updateFilter("priority", null)}
                  className="hover:scale-125 transition-transform ml-0.5"
                >
                  <i className="fas fa-times text-[9px]"></i>
                </button>
              </span>
            )}
            {filterTaskName !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-accent-50 text-accent-700 border border-accent-200 shadow-accent-sm hover:shadow-accent-md transition-all max-w-[140px]">
                <i className="fas fa-folder text-[8px]"></i>
                <span className="truncate">{filterTaskName}</span>
                <button
                  onClick={() => updateFilter("category", null)}
                  className="hover:scale-125 transition-transform ml-0.5"
                >
                  <i className="fas fa-times text-[9px]"></i>
                </button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-[10px] font-bold text-neutral-500 hover:text-brand-600 ml-auto px-2.5 py-1 hover:bg-brand-50 rounded-lg transition-all"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Task List Container */}
      <div className="flex-1 overflow-y-auto bg-transparent p-3 custom-scrollbar">
        {loading ? (
          <TaskListSkeleton />
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-28 text-center animate-fadeIn">
            <div className="w-24 h-24 bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200 rounded-2xl flex items-center justify-center mb-5 shadow-soft ring-1 ring-neutral-100">
              <i className="fas fa-inbox text-4xl text-neutral-300"></i>
            </div>
            <h3 className="text-lg font-bold text-ink-primary mb-2">
              No tasks found
            </h3>
            <p className="text-sm text-neutral-500 max-w-xs leading-relaxed">
              {searchQuery || hasActiveFilters
                ? "Try adjusting your filters or search query"
                : "Your inbox is empty. Great work!"}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTasks.map((task, index) => {
              const isActive = task.id === activeTaskId;
              const isHighPriority = (task.priority || 0) > 50;

              return (
                <div
                  key={task.id}
                  onClick={() =>
                    navigate(`/task/${task.id}?${searchParams.toString()}`)
                  }
                  className={`
                    group relative p-3.5 cursor-pointer transition-all duration-200 border rounded-xl
                    hover:scale-[1.01] active:scale-[0.99]
                    ${
                      isActive
                        ? "bg-brand-50 border-brand-400 shadow-brand-md ring-2 ring-brand-200/50"
                        : "bg-white border-canvas-subtle hover:border-brand-300 hover:shadow-lifted"
                    }
                  `}
                  style={{
                    animationDelay: `${index * 35}ms`,
                    animation: "taskFade 0.35s ease-out forwards",
                    opacity: 0,
                  }}
                >
                  {/* Priority Indicator */}
                  {isHighPriority && (
                    <div className="absolute left-0 top-3.5 bottom-3.5 w-1 bg-gradient-to-b from-status-error via-status-warning to-status-error rounded-r-full shadow-sm"></div>
                  )}

                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all ${
                          isActive
                            ? "bg-brand-500 animate-pulse-soft shadow-brand-sm ring-2 ring-brand-200"
                            : "bg-neutral-300"
                        }`}
                      ></div>

                      <h4
                        className={`text-base font-semibold truncate transition-colors ${
                          isActive ? "text-brand-900" : "text-ink-primary"
                        }`}
                      >
                        {task.name}
                      </h4>
                    </div>
                    <span
                      className={`text-xs whitespace-nowrap font-medium transition-colors ${
                        isActive ? "text-brand-700" : "text-neutral-500"
                      }`}
                    >
                      {timeAgo(task.createTime)}
                    </span>
                  </div>

                  <div className="flex justify-between items-end gap-2 pl-5">
                    <div
                      className="flex-1 min-w-0 cursor-help py-1" // Added py-1 to increase hover target area
                      onMouseEnter={(e) => {
                        if (!task.description) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({
                          opacity: 1,
                          x: rect.left,
                          y: rect.bottom + 6, // 6px gap
                          text: task.description,
                          isVisible: true,
                        });
                      }}
                      onMouseLeave={() => {
                        // Only hide opacity, keep position/text stable for the fade-out anim
                        setTooltip((prev) => ({
                          ...prev,
                          opacity: 0,
                          isVisible: false,
                        }));
                      }}
                    >
                      <p className="text-sm text-neutral-600 truncate leading-relaxed">
                        {task.description || (
                          <span className="text-neutral-400 italic">
                            No description
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isHighPriority && (
                        <span className="text-[10px] font-bold text-status-error bg-status-error/10 px-2 py-0.5 rounded-md border border-status-error/20 flex items-center gap-1 shadow-soft">
                          <i className="fas fa-fire text-[8px]"></i>
                          High
                        </span>
                      )}
                      <span className="text-[10px] text-neutral-400 font-mono bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                        #{task.id?.substring(0, 4)}
                      </span>
                    </div>
                  </div>

                  {/* Hover Ring Effect */}
                  <div
                    className={`absolute inset-0 rounded-xl ring-2 ring-inset ring-brand-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${
                      isActive ? "hidden" : ""
                    }`}
                  ></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div
        className="fixed z-[100] max-w-96 pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
        style={{
          top: tooltip.y,
          left: tooltip.x,
          opacity: tooltip.opacity,
          transform:
            tooltip.opacity === 1
              ? "translateY(0) scale(1)"
              : "translateY(4px) scale(0.98)",
        }}
      >
        <div className="relative bg-accent-50/95 backdrop-blur-md rounded-xl shadow-premium border border-accent-100 ring-1 ring-accent-200/50 p-3.5">
          {/* Decorative Left Bar (Plum) */}
          <div className="absolute top-3 bottom-3 left-0 w-[3px] bg-accent-500 rounded-r-full"></div>

          <div className="pl-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-accent-900 font-medium">
              {tooltip.text}
            </p>
          </div>

          {/* Arrow (Color matched to accent-50) */}
          <div className="absolute -top-1.5 left-6 w-3 h-3 bg-accent-50 border-t border-l border-accent-100 rotate-45 transform"></div>
        </div>
      </div>

      <style>{`
        @keyframes taskFade {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
