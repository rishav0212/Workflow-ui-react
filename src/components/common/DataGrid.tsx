import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";

export interface Column<T> {
  header: string;
  key: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataGridProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  getRowId: (item: T) => string;
  searchFields: (keyof T)[];
  itemsPerPage?: number;
  activeRowId?: string;
  onRowClick?: (item: T) => void;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  headerActions?: React.ReactNode;
  dateFilterField?: keyof T;
}

export default function DataGrid<T>({
  data,
  columns,
  loading,
  getRowId,
  searchFields,
  itemsPerPage = 10,
  activeRowId,
  onRowClick,
  onSelectionChange,
  headerActions,
  dateFilterField,
}: DataGridProps<T>) {
  const [inputValue, setInputValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchTerm(value);
      setCurrentPage(1);
    }, 300);
  }, []);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>({ key: "startTime", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
    const emptySet = new Set<string>();
    setSelectedIds(emptySet);
    onSelectionChange?.(emptySet);
  }, [data, onSelectionChange]);

  const processedData = useMemo(() => {
    let filtered = [...data];
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter((i) => {
        // Match against regular text fields
        const matchesFields = searchFields.some((field) => {
          const val = i[field];
          return val && String(val).toLowerCase().includes(lowerTerm);
        });
        if (matchesFields) return true;

        // Also match against the formatted date string (e.g. "Jul 10, 2026")
        if (dateFilterField) {
          const dateVal = i[dateFilterField];
          if (dateVal) {
            const dateStr = new Date(String(dateVal)).toLocaleDateString([], {
              month: "long",  // "July"
              day: "numeric",
              year: "numeric",
            });
            const dateStrShort = new Date(String(dateVal)).toLocaleDateString([], {
              month: "short",  // "Jul"
              day: "numeric",
              year: "numeric",
            });
            if (
              dateStr.toLowerCase().includes(lowerTerm) ||
              dateStrShort.toLowerCase().includes(lowerTerm)
            ) return true;
          }
        }

        return false;
      });
    }

    if (startDate && dateFilterField) {
      const start = new Date(startDate).getTime();
      filtered = filtered.filter((i) => {
        const val = i[dateFilterField];
        if (!val) return false;
        return new Date(String(val)).getTime() >= start;
      });
    }
    if (endDate && dateFilterField) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      const endTs = end.getTime();
      filtered = filtered.filter((i) => {
        const val = i[dateFilterField];
        if (!val) return false;
        return new Date(String(val)).getTime() <= endTs;
      });
    }
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = (a as any)[sortConfig.key] || "";
        const bValue = (b as any)[sortConfig.key] || "";
        if (sortConfig.key === "startTime" || sortConfig.key === "endTime") {
          const dateA = new Date(aValue).getTime();
          const dateB = new Date(bValue).getTime();
          return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
        }
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [data, searchTerm, sortConfig, searchFields, startDate, endDate, dateFilterField]);

  const totalItems = processedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedData = processedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
    onSelectionChange?.(next);
  };

  const toggleSelectAll = (checked: boolean) => {
    const next = checked
      ? new Set(processedData.map(getRowId))
      : new Set<string>();
    setSelectedIds(next);
    onSelectionChange?.(next);
  };

  const clearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setInputValue("");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <i className="fas fa-sort text-neutral-300 ml-1"></i>;
    }
    return sortConfig.direction === "asc" ? (
      <i className="fas fa-sort-up text-brand-500 ml-1"></i>
    ) : (
      <i className="fas fa-sort-down text-brand-500 ml-1"></i>
    );
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 font-sans">
      {/* 🟢 SEARCH & FILTER TOOLBAR - Matching InstanceManager Style */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-4 rounded-xl border border-canvas-subtle shadow-sm">
        {/* Search Input - Left Side */}
        <div className="flex-1 relative">
          <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400"></i>
          <input
            type="text"
            placeholder="Search records..."
            value={inputValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm transition-all"
          />
        </div>

        {/* Date Filter Toggle + Inputs */}
        {dateFilterField && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowDateFilter((v) => !v)}
              title={showDateFilter ? "Hide date filter" : "Filter by date"}
              className={`relative w-9 h-9 flex items-center justify-center rounded-lg border transition-all ${
                showDateFilter || startDate || endDate
                  ? "bg-brand-50 border-brand-300 text-brand-600 shadow-sm"
                  : "bg-white border-neutral-200 text-neutral-500 hover:border-brand-300 hover:text-brand-600"
              }`}
            >
              <i className="fas fa-calendar-alt text-xs" />
              {(startDate || endDate) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-500 rounded-full border border-white" />
              )}
            </button>
            {showDateFilter && (
              <>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm transition-all"
                  title="Start Date"
                />
                <span className="text-neutral-400 text-sm">–</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm transition-all"
                  title="End Date"
                />
                {(startDate || endDate) && (
                  <button
                    onClick={() => { setStartDate(""); setEndDate(""); setCurrentPage(1); }}
                    title="Clear date filter"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-status-error hover:bg-status-error/10 transition-all"
                  >
                    <i className="fas fa-times text-xs" />
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Header Actions - Right Side */}
        {headerActions && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {headerActions}
          </div>
        )}

        {/* Results Counter */}
        <div className="px-4 py-2 bg-canvas-subtle rounded-lg border border-canvas-active flex items-center gap-2 whitespace-nowrap">
          <span className="text-sm font-bold text-ink-primary">
            {totalItems}
          </span>
          <span className="text-xs text-ink-tertiary font-medium">Records</span>
        </div>
      </div>

      {/* 🟢 DATA TABLE - Matching InstanceManager Style */}
      <div className="bg-surface rounded-xl border border-canvas-active overflow-hidden shadow-soft flex flex-col flex-1 min-h-[500px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm">
            <thead className="bg-canvas-subtle border-b border-canvas-active">
              <tr>
                <th className="px-6 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      processedData.length > 0 &&
                      processedData.every((i) => selectedIds.has(getRowId(i)))
                    }
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="accent-brand-500 cursor-pointer"
                  />
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && requestSort(col.key)}
                    className={`px-6 py-4 text-xs font-black uppercase text-ink-tertiary ${
                      col.sortable
                        ? "cursor-pointer hover:bg-neutral-100 select-none"
                        : ""
                    } ${col.className || ""}`}
                  >
                    <div className="flex items-center gap-2">
                      {col.header}
                      {col.sortable && getSortIcon(col.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-canvas-subtle">
              {loading ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-6 py-20 text-center text-ink-tertiary"
                  >
                    <i className="fas fa-circle-notch fa-spin text-2xl mb-2"></i>
                    <p className="text-sm font-medium">Loading data...</p>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-6 py-20 text-center text-ink-tertiary"
                  >
                    <div className="flex flex-col items-center">
                      <i className="fas fa-inbox text-3xl mb-2 opacity-30"></i>
                      <p className="text-sm font-medium">No records found</p>
                      {searchTerm && (
                        <p className="text-xs text-neutral-400 mt-1">
                          Try adjusting your search
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => {
                  const id = getRowId(item);
                  return (
                    <tr
                      key={id}
                      onClick={() => onRowClick?.(item)}
                      className={`hover:bg-canvas-subtle/30 transition-colors cursor-pointer ${
                        selectedIds.has(id) ? "bg-brand-50/50" : ""
                      } ${
                        activeRowId === id
                          ? "bg-brand-50 border-l-4 border-brand-500"
                          : ""
                      }`}
                    >
                      <td
                        className="px-6 py-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(id)}
                          onChange={() => toggleSelect(id)}
                          className="accent-brand-500 cursor-pointer"
                        />
                      </td>
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-6 py-4 ${col.className || ""}`}
                        >
                          <div className="text-sm font-medium text-ink-primary">
                            {col.render
                              ? col.render(item)
                              : (item as any)[col.key]}
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 🟢 PAGINATION FOOTER - Matching InstanceManager Style */}
        {processedData.length > 0 && (
          <div className="px-6 py-4 border-t border-canvas-active flex items-center justify-between bg-white">
            <span className="text-xs text-neutral-500 font-medium">
              Showing{" "}
              <span className="font-bold text-ink-primary">
                {(currentPage - 1) * itemsPerPage + 1}
              </span>{" "}
              to{" "}
              <span className="font-bold text-ink-primary">
                {Math.min(currentPage * itemsPerPage, totalItems)}
              </span>{" "}
              of{" "}
              <span className="font-bold text-ink-primary">{totalItems}</span>{" "}
              results
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <i className="fas fa-chevron-left text-xs"></i>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - currentPage) <= 1,
                )
                .map((p, index, array) => (
                  <div key={p} className="flex items-center">
                    {index > 0 && array[index - 1] !== p - 1 && (
                      <span className="px-2 text-neutral-400 text-xs">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                        currentPage === p
                          ? "bg-brand-500 text-white shadow-brand-sm"
                          : "border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      {p}
                    </button>
                  </div>
                ))}
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <i className="fas fa-chevron-right text-xs"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
