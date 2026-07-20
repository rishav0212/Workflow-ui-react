import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchJobs, retryJob, deleteJob } from "./jobApi";
import { Secure } from "../../components/common/Secure";
import DataGrid, { Column } from "../../components/common/DataGrid";

export default function JobManager() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [type, setType] = useState<any>("deadletter");
  const [loading, setLoading] = useState(false);
  const [selectedStackTrace, setSelectedStackTrace] = useState<string | null>(null);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await fetchJobs(type);
      // Reverse sort according to the date (descending)
      data.sort((a: any, b: any) => {
        const dateA = new Date(a.createTime || a.dueDate || 0).getTime();
        const dateB = new Date(b.createTime || b.dueDate || 0).getTime();
        return dateB - dateA;
      });
      setJobs(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadJobs();
  }, [type]);

  const handleRetry = async (id: string) => {
    if (window.confirm("Retry this job?")) {
      await retryJob(id);
      loadJobs();
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this job permanently?")) {
      await deleteJob(id);
      loadJobs();
    }
  };

  const columns: Column<any>[] = [
    {
      header: "Job / Exception",
      key: "exceptionMessage",
      sortable: true,
      render: (job) => (
        <div className="max-w-md">
          <div className="font-mono text-[11px] text-ink-secondary mb-1 flex items-center gap-2">
            ID: {job.id}
            {job.stacktrace && (
              <button 
                onClick={() => setSelectedStackTrace(job.stacktrace)}
                className="bg-canvas-active hover:bg-canvas-subtle text-ink-primary px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-colors"
              >
                View Logs
              </button>
            )}
          </div>
          <div
            className="text-status-error text-xs font-bold truncate"
            title={job.exceptionMessage}
          >
            {job.exceptionMessage || "No exception details available"}
          </div>
        </div>
      ),
    },
    {
      header: "Context",
      key: "processInstanceId",
      sortable: true,
      render: (job) => (
        <div>
          <div className="text-[10px] font-black uppercase text-ink-tertiary">
            Instance ID
          </div>
          <div className="text-xs font-mono">
            {job.processInstanceId ? `${job.processInstanceId.substring(0, 8)}...` : "N/A"}
          </div>
        </div>
      ),
    },
    {
      header: "Retries",
      key: "retries",
      sortable: true,
      className: "text-center",
      render: (job) => (
        <span
          className={`px-2 py-1 rounded text-xs font-black ${
            job.retries === 0
              ? "bg-status-error/10 text-status-error"
              : "bg-canvas-active text-ink-secondary"
          }`}
        >
          {job.retries}
        </span>
      ),
    },
    {
      header: "Date",
      key: "dueDate",
      sortable: true,
      render: (job) => (
        <span className="text-ink-tertiary text-xs">
          {job.dueDate ? new Date(job.dueDate).toLocaleString() : job.createTime ? new Date(job.createTime).toLocaleString() : "Immediate"}
        </span>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      sortable: false,
      className: "text-right",
      render: (job) => (
        <div className="flex gap-3 justify-end items-center">
          {type === "deadletter" && (
            <Secure resource="module:admin_workflows" action="execute" disableInstead>
              <button
                onClick={() => handleRetry(job.id)}
                className="text-[11px] font-black uppercase text-brand-600 hover:text-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Retry
              </button>
            </Secure>
          )}
          <Secure resource="module:admin_workflows" action="execute" disableInstead>
            <button
              onClick={() => handleDelete(job.id)}
              className="text-[11px] font-black uppercase text-status-error hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete
            </button>
          </Secure>
        </div>
      ),
    },
  ];

  return (
    <Secure 
      resource="module:admin_workflows" 
      action="view" 
      fallback={
        <div className="min-h-screen bg-canvas p-8 flex items-center justify-center">
          <div className="text-center text-ink-tertiary">
            <i className="fas fa-lock text-4xl mb-4 text-status-error/50"></i>
            <h2 className="text-xl font-bold">Access Denied</h2>
            <p className="text-sm mt-2">You do not have permission to view the Job Manager.</p>
            <Link to="/" className="text-brand-600 hover:underline mt-4 inline-block text-sm">Return Home</Link>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-canvas p-8 flex flex-col">
        {/* --- STACKTRACE MODAL --- */}
        {selectedStackTrace && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-surface w-full max-w-4xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col border border-canvas-active overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-canvas-active bg-canvas-subtle">
                <h3 className="font-serif font-bold text-ink-primary flex items-center gap-2">
                  <i className="fas fa-bug text-status-error"></i> Error Stack Trace
                </h3>
                <button 
                  onClick={() => setSelectedStackTrace(null)}
                  className="text-ink-tertiary hover:text-ink-primary transition-colors p-2"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="p-4 overflow-y-auto bg-gray-900 text-gray-300 font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-inner">
                {selectedStackTrace}
              </div>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
          <header className="mb-8 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-serif font-bold text-ink-primary tracking-tight">
                Job & Incident Manager
              </h2>
              <p className="text-xs text-ink-tertiary mt-1 font-medium">
                Repair Shop for failed background processes and timers.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex bg-canvas-subtle p-1 rounded-lg border border-canvas-active shadow-inner">
                {["deadletter", "timer", "executable", "suspended"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
                      type === t
                        ? "bg-white text-brand-600 shadow-sm"
                        : "text-ink-tertiary hover:text-ink-primary"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Link
                to="/admin"
                className="text-sm font-bold text-ink-tertiary hover:text-brand-600 transition-colors"
              >
                <i className="fas fa-arrow-left mr-2"></i> Back
              </Link>
            </div>
          </header>

          <DataGrid
            data={jobs}
            columns={columns}
            loading={loading}
            getRowId={(job) => job.id}
            searchFields={["id", "exceptionMessage", "processInstanceId"]}
          />
        </div>
      </div>
    </Secure>
  );
}
