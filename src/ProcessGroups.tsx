import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAdminProcesses } from "./api";

export default function ProcessGroups() {
  const [processes, setProcesses] = useState<any[]>([]);

  useEffect(() => {
    fetchAdminProcesses().then(setProcesses);
  }, []);

  return (
    <div className="p-10 bg-canvas min-h-screen">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-serif font-bold text-ink-primary">Process-Wise Operations</h1>
            <p className="text-ink-tertiary mt-2">Manage instances and tasks grouped by their workflow definition.</p>
          </div>
          <Link to="/admin" className="text-xs font-black uppercase tracking-widest text-brand-600 hover:underline">
            <i className="fas fa-arrow-left mr-2"></i> Admin Hub
          </Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {processes.map((proc) => (
            <div key={proc.id} className="bg-surface p-6 rounded-3xl border border-canvas-active shadow-soft hover:shadow-floating transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-500">
                  <i className="fas fa-project-diagram"></i>
                </div>
                <span className="text-[10px] font-black bg-brand-100 text-brand-700 px-2 py-1 rounded">v{proc.version}</span>
              </div>
              
              <h3 className="text-lg font-bold text-ink-primary truncate">{proc.name || proc.key}</h3>
              <p className="text-xs text-ink-tertiary font-mono mt-1">Key: {proc.key}</p>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <Link 
                  to={`/admin/processes/${proc.key}`}
                  className="bg-canvas-subtle text-center py-2.5 rounded-xl text-[11px] font-black uppercase text-ink-secondary hover:bg-canvas-active transition-colors"
                >
                  Blueprint
                </Link>
                <Link 
                  to={`/admin/instances?key=${proc.key}`} // Update InstanceManager to filter by key
                  className="bg-brand-500 text-center py-2.5 rounded-xl text-[11px] font-black uppercase text-white hover:bg-brand-600 shadow-lg shadow-brand-500/20 transition-all"
                >
                  Instances
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}