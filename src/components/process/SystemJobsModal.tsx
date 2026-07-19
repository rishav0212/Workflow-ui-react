import React, { useEffect, useState } from "react";
import { fetchAdminTimers, fetchAdminDeadLetters, retryAdminDeadLetter } from "../../api";
import toast from "react-hot-toast";
import DataGrid, { type Column } from "../common/DataGrid";

interface SystemJobsModalProps {
  onClose: () => void;
}

export default function SystemJobsModal({ onClose }: SystemJobsModalProps) {
  const [activeTab, setActiveTab] = useState<"timers" | "deadletters">("timers");
  const [loading, setLoading] = useState(false);
  const [timers, setTimers] = useState<any[]>([]);
  const [deadLetters, setDeadLetters] = useState<any[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "timers") {
        const res = await fetchAdminTimers();
        setTimers(res.data || []);
      } else {
        const res = await fetchAdminDeadLetters();
        setDeadLetters(res.data || []);
      }
    } catch (e: any) {
      toast.error("Failed to fetch jobs: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleRetry = async (id: string) => {
    try {
      setLoading(true);
      await retryAdminDeadLetter(id);
      toast.success("Job moved back to executable queue!");
      loadData();
    } catch (e: any) {
      toast.error("Retry failed: " + e.message);
      setLoading(false);
    }
  };

  const timerColumns: Column<any>[] = [
    { header: "Job ID", key: "id", sortable: true },
    { header: "Process Def ID", key: "processDefinitionId", sortable: true },
    { 
      header: "Due Date", 
      key: "dueDate", 
      sortable: true,
      render: (p) => new Date(p.dueDate).toLocaleString() 
    },
    { header: "Retries", key: "retries" },
  ];

  const deadLetterColumns: Column<any>[] = [
    { header: "Job ID", key: "id", sortable: true },
    { header: "Process Def ID", key: "processDefinitionId" },
    { 
      header: "Exception", 
      key: "exceptionMessage",
      render: (p) => (
        <div className="flex items-center gap-2">
          <span className="text-status-error font-bold truncate max-w-xs" title={p.exceptionMessage}>
            {p.exceptionMessage}
          </span>
          {p.stacktrace && (
            <button 
              onClick={() => setSelectedTrace(p.stacktrace)}
              className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200 hover:bg-red-200"
            >
              View Trace
            </button>
          )}
        </div>
      )
    },
    {
      header: "Actions",
      key: "actions",
      className: "text-right",
      render: (p) => (
        <button
          onClick={() => handleRetry(p.id)}
          className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-brand-600 text-brand-600 hover:bg-brand-600 hover:text-white transition-all"
        >
          Retry
        </button>
      )
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-5xl bg-surface rounded-xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden border border-canvas-subtle">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-canvas-subtle bg-white">
          <div>
            <h3 className="text-lg font-serif font-bold text-ink-primary">
              System Background Jobs
            </h3>
            <p className="text-xs text-ink-tertiary font-medium">
              Monitor upcoming timer schedules and failed jobs.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-canvas-subtle text-ink-tertiary hover:text-ink-primary hover:bg-canvas-active transition-colors"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-canvas-subtle bg-canvas-subtle">
          <button
            onClick={() => setActiveTab("timers")}
            className={`px-6 py-3 text-sm font-bold tracking-wide flex items-center gap-2 ${
              activeTab === "timers"
                ? "bg-white text-brand-600 border-t-2 border-brand-600 shadow-sm"
                : "text-ink-secondary hover:bg-canvas-active"
            }`}
          >
            <i className="fas fa-clock"></i> Upcoming Timers
          </button>
          <button
            onClick={() => setActiveTab("deadletters")}
            className={`px-6 py-3 text-sm font-bold tracking-wide flex items-center gap-2 ${
              activeTab === "deadletters"
                ? "bg-white text-status-error border-t-2 border-status-error shadow-sm"
                : "text-ink-secondary hover:bg-canvas-active"
            }`}
          >
            <i className="fas fa-skull-crossbones"></i> Dead Letters (Failed)
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-canvas">
          <DataGrid
            data={activeTab === "timers" ? timers : deadLetters}
            columns={activeTab === "timers" ? timerColumns : deadLetterColumns}
            loading={loading}
            getRowId={(p) => p.id}
            searchFields={["id", "processDefinitionId", "exceptionMessage"]}
            itemsPerPage={10}
          />
        </div>
      </div>

      {/* Stacktrace Modal */}
      {selectedTrace && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/60" onClick={() => setSelectedTrace(null)}></div>
          <div className="relative w-full max-w-4xl bg-black rounded-lg shadow-2xl flex flex-col max-h-[80vh] border border-neutral-700">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900 rounded-t-lg">
              <h3 className="text-red-400 font-mono text-sm font-bold">Exception Stacktrace</h3>
              <button onClick={() => setSelectedTrace(null)} className="text-neutral-400 hover:text-white">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-4 overflow-auto text-green-400 font-mono text-xs whitespace-pre-wrap">
              {selectedTrace}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
