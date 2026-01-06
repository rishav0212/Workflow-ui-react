import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchAllSystemTasks,
  fetchHistoricTasks,
  reassignTask,
  updateTaskDueDate,
  bulkReassignTasks, // 🟢 New API call for batch operations
} from "./api";

export default function TaskSupervision() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"active" | "completed">("active");

  // 🟢 NEW: Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadTasks = () => {
    setLoading(true);
    const apiCall =
      viewMode === "active" ? fetchAllSystemTasks() : fetchHistoricTasks();

    apiCall
      .then(setTasks)
      .catch((err) => console.error("Failed to load system tasks:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Clear selection when switching between Active and Completed
    setSelectedIds(new Set());
    loadTasks();
  }, [viewMode]);

  // 🟢 NEW: Toggle individual selection
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // 🟢 NEW: Select/Deselect all
  const toggleSelectAll = () => {
    if (selectedIds.size === tasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tasks.map((t) => t.id)));
    }
  };

  // 🟢 NEW: Handle Bulk Reassignment
  const handleBulkReassign = async () => {
    const newUser = prompt(
      `Enter username to reassign ${selectedIds.size} tasks to:`
    );
    if (newUser) {
      setLoading(true);
      try {
        await bulkReassignTasks(Array.from(selectedIds), newUser);
        setSelectedIds(new Set());
        loadTasks();
      } catch (err) {
        console.error("Bulk reassignment failed", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleReassign = async (taskId: string, current: string) => {
    const newUser = prompt(
      "Enter username to assign this task to:",
      current || ""
    );
    if (newUser) {
      await reassignTask(taskId, newUser);
      loadTasks();
    }
  };

  const handleDueDate = async (taskId: string, current: string) => {
    const newDate = prompt(
      "Enter new Due Date (YYYY-MM-DD):",
      current?.split("T")[0] || ""
    );
    if (newDate) {
      await updateTaskDueDate(taskId, newDate + "T23:59:59Z");
      loadTasks();
    }
  };

  return (
    <div className="min-h-screen bg-canvas p-8 pb-24">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-serif font-bold text-ink-primary tracking-tight">
            Global Task Supervision
          </h2>
          <p className="text-xs text-ink-tertiary mt-1 font-medium">
            God-mode view of all system tasks. Reassign work and override
            deadlines.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-canvas-subtle p-1 rounded-lg border border-canvas-active shadow-inner">
            <button
              onClick={() => setViewMode("active")}
              className={`px-5 py-2 rounded-md text-xs font-black uppercase tracking-wider transition-all ${
                viewMode === "active"
                  ? "bg-white text-brand-600 shadow-sm"
                  : "text-ink-tertiary hover:text-ink-primary"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setViewMode("completed")}
              className={`px-5 py-2 rounded-md text-xs font-black uppercase tracking-wider transition-all ${
                viewMode === "completed"
                  ? "bg-white text-brand-600 shadow-sm"
                  : "text-ink-tertiary hover:text-ink-primary"
              }`}
            >
              Completed
            </button>
          </div>

          <button
            onClick={loadTasks}
            className="btn-icon bg-surface border border-canvas-active shadow-soft hover:bg-canvas-subtle"
          >
            <i className={`fas fa-sync-alt ${loading ? "fa-spin" : ""}`}></i>
          </button>
        </div>
      </div>

      {/* 🟢 NEW: BULK ACTION BAR (Only shows when tasks are selected) */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-ink-primary text-white px-8 py-4 rounded-2xl shadow-premium flex items-center gap-8 z-50 animate-slideUp border border-white/10">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-white/50 tracking-widest">
              Selection
            </span>
            <span className="text-sm font-bold">
              {selectedIds.size} Tasks Selected
            </span>
          </div>

          <div className="h-8 w-px bg-white/20"></div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleBulkReassign}
              className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
            >
              <i className="fas fa-user-edit"></i> Bulk Reassign
            </button>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-white/60 hover:text-white transition-colors"
              title="Clear Selection"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      <div className="bg-surface rounded-2xl border border-canvas-active overflow-hidden shadow-soft">
        <table className="w-full text-left text-sm">
          <thead className="bg-canvas-subtle border-b border-canvas-active">
            <tr>
              {/* 🟢 NEW: Selection Column */}
              <th className="px-6 py-4 w-12">
                <input
                  type="checkbox"
                  checked={
                    tasks.length > 0 && selectedIds.size === tasks.length
                  }
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded accent-brand-500"
                />
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-ink-tertiary">
                Task Name
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-ink-tertiary">
                Assignee
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-ink-tertiary">
                {viewMode === "active" ? "Created" : "Completed"}
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-ink-tertiary">
                Due Date
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-ink-tertiary text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-canvas-subtle">
            {tasks.length === 0 && !loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-10 text-center text-ink-tertiary"
                >
                  No {viewMode} tasks found.
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr
                  key={task.id}
                  className={`hover:bg-canvas-subtle/20 transition-colors group ${
                    selectedIds.has(task.id) ? "bg-brand-50/50" : ""
                  }`}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(task.id)}
                      onChange={() => toggleSelect(task.id)}
                      className="w-4 h-4 rounded accent-brand-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-ink-primary">
                      {task.name}
                    </div>
                    <div className="text-[10px] text-ink-tertiary font-mono">
                      PID: {task.processInstanceId?.substring(0, 8)}...
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        task.assignee
                          ? "bg-brand-50 text-brand-700 border border-brand-100"
                          : "bg-status-warning/10 text-status-warning border border-status-warning/20"
                      }`}
                    >
                      {task.assignee || "Unassigned"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-ink-tertiary font-medium">
                    {new Date(
                      task.endTime || task.createTime
                    ).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 font-medium">
                    {task.dueDate ? (
                      <span
                        className={
                          new Date(task.dueDate) < new Date() && !task.endTime
                            ? "text-status-error font-bold"
                            : "text-ink-primary"
                        }
                      >
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-ink-tertiary">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right flex gap-3 justify-end items-center">
                    <Link
                      to={`/admin/inspect/${task.processInstanceId}`}
                      className="text-[11px] font-black uppercase text-brand-600 hover:text-brand-700 tracking-wider flex items-center gap-1.5"
                    >
                      <i className="fas fa-eye"></i> Path
                    </Link>

                    {viewMode === "active" && (
                      <>
                        <button
                          onClick={() => handleReassign(task.id, task.assignee)}
                          className="text-[11px] font-black uppercase text-ink-secondary hover:text-brand-600 transition-colors"
                        >
                          Reassign
                        </button>
                        <button
                          onClick={() => handleDueDate(task.id, task.dueDate)}
                          className="text-[11px] font-black uppercase text-ink-tertiary hover:text-ink-primary transition-colors"
                        >
                          Deadline
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
