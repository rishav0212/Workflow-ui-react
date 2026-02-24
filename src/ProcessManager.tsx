import { useEffect, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchAdminProcesses,
  deployProcess,
  suspendProcessDefinition,
  deleteDeployment,
  fireGlobalSignal,
  purgeProcessData,
} from "./api";
import DataGrid, { type Column } from "./components/common/DataGrid";
import BatchStartModal from "./components/process/BatchStartModal";

/**
 * GLOBAL CACHE STORAGE
 * Persists process definitions to avoid redundant fetching when navigating
 * between Admin tabs.
 */
const DATA_CACHE: {
  processes: any[] | null;
} = {
  processes: null,
};

export default function ProcessManager() {
  const [processes, setProcesses] = useState<any[]>([]);
  const [batchProcess, setBatchProcess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { tenantId } = useParams<{ tenantId: string }>();
  /**
   * Loads process definitions.
   * Uses global cache if available and not forced.
   */
  const loadProcesses = (forceRefresh = false) => {
    // 1. Check Cache
    if (!forceRefresh && DATA_CACHE.processes) {
      setProcesses(DATA_CACHE.processes);
      setLoading(false);
      return;
    }

    // 2. Fetch from API
    setLoading(true);
    fetchAdminProcesses()
      .then((data) => {
        setProcesses(data);
        DATA_CACHE.processes = data;
      })
      .catch((err) => console.error("Failed to load processes", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProcesses();
  }, []);

  const handlePurge = async (processKey: string) => {
    const confirmed = window.confirm(
      `⚠️ PURGE DATA WARNING ⚠️\n\nThis will delete ALL running and historic instances for "${processKey}".\n\nThe process definition (BPMN) will NOT be deleted.\n\nAre you sure?`,
    );

    if (confirmed) {
      try {
        setLoading(true);
        const res = await purgeProcessData(processKey);
        alert(
          `Purge Complete!\n\nDeleted Active: ${res.deletedActive}\nDeleted History: ${res.deletedHistory}`,
        );
        loadProcesses(true); // Refresh stats
      } catch (err) {
        alert("Purge failed. Check server logs.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    loadProcesses(true);
  };

  const handleToggleSuspend = async (p: any) => {
    const action = p.suspended ? "Activate" : "Suspend";
    const confirmed = window.confirm(
      `${action} this definition? ${
        !p.suspended
          ? "No new instances can be started while suspended."
          : "This will allow new instances to start again."
      }`,
    );

    if (confirmed) {
      try {
        await suspendProcessDefinition(p.id, !p.suspended);
        loadProcesses(true); // Force refresh to update UI
      } catch (err) {
        alert("Action failed. Check engine permissions.");
      }
    }
  };

  const handleDelete = async (deploymentId: string, processName: string) => {
    const confirmed = window.confirm(
      `DANGER: Are you sure you want to delete the deployment for "${processName}"?\n\nThis will permanently remove ALL process versions and ALL running/historic instances associated with this deployment.`,
    );

    if (confirmed) {
      try {
        await deleteDeployment(deploymentId);
        loadProcesses(true); // Force refresh
      } catch (err) {
        alert("Delete failed. Some instances may still be locked.");
      }
    }
  };

  const handleFireSignal = async () => {
    const signalName = prompt(
      "Enter the BPMN Signal Name to broadcast system-wide:",
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

    const comment = prompt(
      "Enter deployment comments (e.g., 'Fixed bug in approval flow'):",
      "",
    );

    if (comment === null) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      setDeploying(true);
      const processName = file.name.replace(/\.[^/.]+$/, "");
      await deployProcess(file, processName, comment);
      alert("Process deployed successfully!");
      loadProcesses(true); // Force refresh
    } catch (err) {
      console.error("Deployment failed", err);
      alert("Failed to deploy process.");
    } finally {
      setDeploying(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const columns: Column<any>[] = [
    {
      header: "Process Definition",
      key: "name",
      sortable: true,
      render: (p) => (
        <div className="flex flex-col gap-1">
          <div className="font-bold text-ink-primary flex items-center gap-2">
            {p.name || p.key}
            <span className="font-mono text-[9px] text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-100">
              {p.key}
            </span>
          </div>
          <div className="text-[10px] text-ink-tertiary font-mono">
            Deploy ID: {p.deploymentId}
          </div>
        </div>
      ),
    },
    {
      header: "Version",
      key: "version",
      sortable: true,
      className: "text-center",
      render: (p) => (
        <span className="bg-canvas-active text-ink-secondary px-2 py-1 rounded text-xs font-black">
          v{p.version}
        </span>
      ),
    },
    {
      header: "Status",
      key: "suspended",
      sortable: true,
      render: (p) => (
        <span
          className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase ${
            p.suspended ? "text-status-warning" : "text-status-success"
          }`}
        >
          <i className="fas fa-circle text-[6px]"></i>
          {p.suspended ? "Suspended" : "Active"}
        </span>
      ),
    },
    {
      header: "Repository Actions",
      key: "actions",
      className: "text-right",
      render: (p) => (
        <div className="flex justify-end gap-3 items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleSuspend(p);
            }}
            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${
              p.suspended
                ? "border-status-success text-status-success hover:bg-status-success hover:text-white"
                : "border-status-warning text-status-warning hover:bg-status-warning hover:text-white"
            }`}
          >
            {p.suspended ? "Activate" : "Suspend"}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setBatchProcess(p.key);
            }}
            className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-800 hover:text-white transition-all flex items-center gap-1.5"
            title="Import Excel/JSON to start multiple instances"
          >
            <i className="fas fa-file-import"></i>
            Batch
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePurge(p.key);
            }}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm"
            title="Purge All Data (Keep Definition)"
          >
            <i className="fas fa-broom text-[10px]"></i>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(p.deploymentId, p.name || p.key);
            }}
            className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-status-error text-status-error hover:bg-status-error hover:text-white transition-all"
          >
            Delete
          </button>

          <Link
            to={`/${tenantId}/admin/processes/${p.key}`}
            className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-brand-600 text-brand-600 hover:bg-brand-600 hover:text-white transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            Inspect
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-canvas p-6 flex flex-col font-sans">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-serif font-bold text-ink-primary tracking-tight">
              Workflow Explorer
            </h2>
            <p className="text-xs text-ink-tertiary mt-0.5 font-medium italic">
              Governance & Repository management for BPMN 2.0 definitions.
            </p>
          </div>

          <div className="flex gap-3 items-center">
            {/* Refresh Button - Kept at page level for consistency */}
            <button
              onClick={handleRefresh}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-canvas-active text-ink-secondary hover:text-brand-600 hover:border-brand-200 shadow-soft transition-all"
              title="Refresh Data"
            >
              <i
                className={`fas fa-sync-alt text-xs ${loading ? "animate-spin" : ""}`}
              ></i>
            </button>

            {/* Navigation Close Button */}
            <Link
              to={`/${tenantId}/admin`}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface border border-canvas-active text-ink-secondary hover:bg-canvas-subtle transition-all"
            >
              <i className="fas fa-times text-sm"></i>
            </Link>
          </div>
        </div>

        <DataGrid
          data={processes}
          columns={columns}
          loading={loading}
          getRowId={(p) => p.id}
          searchFields={["name", "key", "deploymentId"]}
          itemsPerPage={10}
          // 🟢 MOVED: Actions now inside the DataGrid Toolbar
          headerActions={
            <>
              <button
                onClick={handleFireSignal}
                className="flex items-center gap-2 px-4 py-1.5 bg-status-info text-white rounded-lg text-[10px] font-bold shadow-soft hover:bg-opacity-90 transition-all uppercase tracking-wide"
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
                className="flex items-center gap-2 px-4 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-[10px] font-bold shadow-soft transition-all disabled:opacity-50 uppercase tracking-wide"
              >
                {deploying ? (
                  <i className="fas fa-circle-notch fa-spin"></i>
                ) : (
                  <i className="fas fa-cloud-upload-alt"></i>
                )}
                {deploying ? "Deploying..." : "Deploy"}
              </button>
            </>
          }
        />
      </div>
      {batchProcess && (
        <BatchStartModal
          processKey={batchProcess}
          onClose={() => setBatchProcess(null)}
          onSuccess={() => {
            // Optional: Refresh list if needed
            setBatchProcess(null);
          }}
        />
      )}
    </div>
  );
}
