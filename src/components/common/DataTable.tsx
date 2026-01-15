import React, { useState, useEffect } from "react";

export interface Column<T> {
  header: string;
  key: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  title: string;
  description?: string;
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  // Pagination
  totalItems: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  // Search & Sort
  onParamsChange: (params: {
    search?: string;
    sort?: string;
    order?: "asc" | "desc";
  }) => void;
  // Selection
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  bulkActions?: {
    label: string;
    icon: string;
    onClick: (ids: string[]) => void;
  }[];
  // Extra UI
  filterElement?: React.ReactNode;
}

export default function DataTable<T extends { id: string }>({
  title,
  description,
  data,
  columns,
  loading,
  totalItems,
  pageSize,
  currentPage,
  onPageChange,
  onParamsChange,
  selectedIds = new Set(),
  onSelectionChange,
  bulkActions,
  filterElement,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    order: "asc" | "desc";
  }>({ key: "createTime", order: "desc" });

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(
      () => onParamsChange({ search, ...sortConfig }),
      500
    );
    return () => clearTimeout(timer);
  }, [search]);

  
  const handleSort = (key: string) => {
    // 1. Explicitly type the 'order' variable
    const order: "asc" | "desc" =
      sortConfig.key === key && sortConfig.order === "desc" ? "asc" : "desc";

    // 2. Now 'newSort' will be inferred as { key: string; order: "asc" | "desc" }
    const newSort = { key, order };

    setSortConfig(newSort);
    onParamsChange({ search, ...newSort });
  };

  const totalPages = Math.ceil(totalItems / pageSize);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header with Search and Theme Colors */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-ink-primary tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-ink-tertiary mt-1 font-medium">
            {description}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {filterElement}
          <div className="relative group">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted group-focus-within:text-brand-500 transition-colors text-xs"></i>
            <input
              type="text"
              placeholder="Search records..."
              className="bg-surface border border-canvas-active rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-accent-200 outline-none w-64 transition-all shadow-soft"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Bulk Action Bar - Using Brand & Inverted Colors */}
      {selectedIds.size > 0 && bulkActions && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-ink-primary text-ink-inverted px-6 py-3 rounded-2xl shadow-premium flex items-center gap-6 z-50 animate-slideUp border border-white/10">
          <span className="text-sm font-bold">{selectedIds.size} Selected</span>
          <div className="flex gap-2">
            {bulkActions.map((action) => (
              <button
                key={action.label}
                onClick={() => action.onClick(Array.from(selectedIds))}
                className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
              >
                <i className={action.icon}></i> {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-surface rounded-panel border border-canvas-active overflow-y-auto shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-canvas-subtle border-b border-canvas-active">
              <tr>
                {onSelectionChange && (
                  <th className="px-6 py-4 w-12">
                    <input
                      type="checkbox"
                      onChange={(e) =>
                        onSelectionChange(
                          e.target.checked
                            ? new Set(data.map((d) => d.id))
                            : new Set()
                        )
                      }
                      checked={
                        data.length > 0 && selectedIds.size === data.length
                      }
                      className="w-4 h-4 rounded accent-brand-500"
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={`px-6 py-4 text-[10px] font-black uppercase text-ink-tertiary tracking-widest ${
                      col.sortable ? "cursor-pointer hover:text-brand-600" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {col.header}
                      {col.sortable && sortConfig.key === col.key && (
                        <i
                          className={`fas fa-sort-amount-${
                            sortConfig.order === "asc" ? "up" : "down"
                          } text-brand-500`}
                        ></i>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-canvas-subtle">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-20 text-center">
                    <i className="fas fa-circle-notch fa-spin text-brand-500 text-xl"></i>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-20 text-center text-ink-muted"
                  >
                    No data found matching your filters.
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-canvas-subtle/30 transition-colors ${
                      selectedIds.has(item.id) ? "bg-brand-50/50" : ""
                    }`}
                  >
                    {onSelectionChange && (
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => {
                            const next = new Set(selectedIds);
                            next.has(item.id)
                              ? next.delete(item.id)
                              : next.add(item.id);
                            onSelectionChange(next);
                          }}
                          className="w-4 h-4 rounded accent-brand-500"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className="px-6 py-4">
                        {col.render ? col.render(item) : (item as any)[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Controls */}
        <div className="px-6 py-4 bg-canvas-subtle/50 border-t border-canvas-active flex justify-between items-center">
          <span className="text-[10px] font-black uppercase text-ink-tertiary tracking-widest">
            Page {currentPage + 1} of {totalPages || 1} — {totalItems} Total
            Records
          </span>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 0}
              onClick={() => onPageChange(currentPage - 1)}
              className="px-4 py-2 rounded-xl border border-canvas-active bg-surface text-[10px] font-black hover:bg-canvas-active disabled:opacity-30 transition-all"
            >
              Previous
            </button>
            <button
              disabled={currentPage >= totalPages - 1}
              onClick={() => onPageChange(currentPage + 1)}
              className="px-4 py-2 rounded-xl border border-canvas-active bg-surface text-[10px] font-black hover:bg-canvas-active disabled:opacity-30 transition-all"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
