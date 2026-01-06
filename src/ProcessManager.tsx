import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  fetchAdminProcesses,
  deployProcess,
  suspendProcessDefinition, // 🟢 New
  deleteDeployment, // 🟢 New
  fireGlobalSignal, // 🟢 New
} from "./api";

export default function ProcessManager() {
  const [processes, setProcesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProcesses = () => {
    setLoading(true);
    fetchAdminProcesses()
      .then(setProcesses)
      .catch((err) => console.error("Failed to load processes", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProcesses();
  }, []);

  // 🟢 NEW: Handle Suspend/Activate Toggle
  const handleToggleSuspend = async (p: any) => {
    const action = p.suspended ? "Activate" : "Suspend";
    const confirmed = window.confirm(
      `${action} this definition? ${
        !p.suspended
          ? "No new instances can be started while suspended."
          : "This will allow new instances to start again."
      }`
    );

    if (confirmed) {
      try {
        await suspendProcessDefinition(p.id, !p.suspended);
        loadProcesses();
      } catch (err) {
        alert("Action failed. Check engine permissions.");
      }
    }
  };

  // 🟢 NEW: Handle Cascade Deletion
  const handleDelete = async (deploymentId: string, processName: string) => {
    const confirmed = window.confirm(
      `DANGER: Are you sure you want to delete the deployment for "${processName}"?\n\nThis will permanently remove ALL process versions and ALL running/historic instances associated with this deployment.`
    );

    if (confirmed) {
      try {
        await deleteDeployment(deploymentId);
        loadProcesses();
      } catch (err) {
        alert("Delete failed. Some instances may still be locked.");
      }
    }
  };

  // 🟢 NEW: Fire Global Signal
  const handleFireSignal = async () => {
    const signalName = prompt(
      "Enter the BPMN Signal Name to broadcast system-wide:"
    );
    if (signalName) {
      try {
        await fireGlobalSignal(signalName);
        alert(`Signal "${signalName}" broadcast successfully.`);
      } catch (err) {
        alert("Failed to fire signal.");
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".bpmn") && !file.name.endsWith(".bpmn20.xml")) {
      alert("Please upload a valid .bpmn file.");
      return;
    }

    try {
      setDeploying(true);
      await deployProcess(file, file.name.replace(/\.[^/.]+$/, ""));
      alert("Process deployed successfully!");
      loadProcesses();
    } catch (err) {
      console.error("Deployment failed", err);
      alert("Failed to deploy process.");
    } finally {
      setDeploying(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-canvas p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-serif font-bold text-ink-primary tracking-tight">
              Workflow Explorer
            </h2>
            <p className="text-xs text-ink-tertiary mt-1 font-medium">
              Governance & Repository management for BPMN 2.0 definitions.
            </p>
          </div>

          <div className="flex gap-3 items-center">
            {/* 🟢 NEW: Signal Trigger Button */}
            <button
              onClick={handleFireSignal}
              className="flex items-center gap-2 px-5 py-2.5 bg-status-info text-white rounded-xl text-sm font-bold shadow-lg shadow-status-info/20 hover:bg-opacity-90 transition-all"
            >
              <i className="fas fa-broadcast-tower"></i>
              Fire Signal
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".bpmn,.xml"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={deploying || loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-500/20 transition-all disabled:opacity-50"
            >
              {deploying ? (
                <i className="fas fa-circle-notch fa-spin"></i>
              ) : (
                <i className="fas fa-cloud-upload-alt"></i>
              )}
              {deploying ? "Deploying..." : "Deploy"}
            </button>

            <Link
              to="/admin"
              className="btn-icon bg-surface border border-canvas-active"
            >
              <i className="fas fa-times"></i>
            </Link>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-canvas-active overflow-hidden shadow-soft min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-ink-tertiary">
              <i className="fas fa-circle-notch fa-spin text-2xl mr-3"></i>
              <span>Syncing with engine...</span>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-canvas-subtle border-b border-canvas-active">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-ink-tertiary">
                    Process Definition
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-ink-tertiary text-center">
                    Version
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-ink-tertiary">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-ink-tertiary text-right">
                    Repository Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-canvas-subtle">
                {processes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-20 text-center text-ink-tertiary"
                    >
                      No processes found.
                    </td>
                  </tr>
                ) : (
                  processes.map((p) => (
                    <tr
                      key={p.id}
                      className={`hover:bg-canvas-subtle/30 transition-colors group ${
                        p.suspended ? "bg-status-warning/5" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-ink-primary flex items-center gap-2">
                          {p.name || p.key}
                          <span className="font-mono text-[9px] text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-100">
                            {p.key}
                          </span>
                        </div>
                        <div className="text-[10px] text-ink-tertiary font-mono">
                          Deploy ID: {p.deploymentId}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-canvas-active text-ink-secondary px-2 py-1 rounded text-xs font-black">
                          v{p.version}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase ${
                            p.suspended
                              ? "text-status-warning"
                              : "text-status-success"
                          }`}
                        >
                          <i className="fas fa-circle text-[6px]"></i>
                          {p.suspended ? "Suspended" : "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-3  group-hover:opacity-100 transition-opacity">
                          {/* 🟢 NEW: Suspend/Activate Button */}
                          <button
                            onClick={() => handleToggleSuspend(p)}
                            className={`text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${
                              p.suspended
                                ? "border-status-success text-status-success hover:bg-status-success hover:text-white"
                                : "border-status-warning text-status-warning hover:bg-status-warning hover:text-white"
                            }`}
                          >
                            {p.suspended ? "Activate" : "Suspend"}
                          </button>

                          {/* 🟢 NEW: Delete Button */}
                          <button
                            onClick={() =>
                              handleDelete(p.deploymentId, p.name || p.key)
                            }
                            className="text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-status-error text-status-error hover:bg-status-error hover:text-white transition-all"
                          >
                            Delete
                          </button>

                          <Link
                            to={`/admin/processes/${p.key}`}
                            className="text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-brand-600 text-brand-600 hover:bg-brand-600 hover:text-white transition-all"
                          >
                            Inspect
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
