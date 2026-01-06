// src/JobManager.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchJobs, retryJob, deleteJob } from "./api";

export default function JobManager() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [type, setType] = useState<any>("deadletter");
  const [loading, setLoading] = useState(false);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await fetchJobs(type);
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

  return (
    <div className="min-h-screen bg-canvas p-8">
      <div className="max-w-6xl mx-auto">
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

        <div className="bg-surface rounded-2xl border border-canvas-active overflow-hidden shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="bg-canvas-subtle border-b border-canvas-active">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-ink-tertiary">
                  Job / Exception
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-ink-tertiary">
                  Context
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-ink-tertiary text-center">
                  Retries
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
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-ink-tertiary"
                  >
                    <i className="fas fa-circle-notch fa-spin mr-2"></i>
                    Loading...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-ink-tertiary"
                  >
                    No {type} jobs found.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="hover:bg-canvas-subtle/20 transition-colors"
                  >
                    <td className="px-6 py-4 max-w-md">
                      <div className="font-mono text-[11px] text-ink-secondary mb-1">
                        ID: {job.id}
                      </div>
                      <div
                        className="text-status-error text-xs font-bold truncate"
                        title={job.exceptionMessage}
                      >
                        {job.exceptionMessage ||
                          "No exception details available"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[10px] font-black uppercase text-ink-tertiary">
                        Instance ID
                      </div>
                      <div className="text-xs font-mono">
                        {job.processInstanceId?.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-black ${
                          job.retries === 0
                            ? "bg-status-error/10 text-status-error"
                            : "bg-canvas-active text-ink-secondary"
                        }`}
                      >
                        {job.retries}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-ink-tertiary text-xs">
                      {job.dueDate
                        ? new Date(job.dueDate).toLocaleString()
                        : "Immediate"}
                    </td>
                    <td className="px-6 py-4 text-right flex gap-3 justify-end items-center">
                      {type === "deadletter" && (
                        <button
                          onClick={() => handleRetry(job.id)}
                          className="text-[11px] font-black uppercase text-brand-600 hover:text-brand-700"
                        >
                          Retry
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(job.id)}
                        className="text-[11px] font-black uppercase text-status-error hover:opacity-80"
                      >
                        Delete
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
