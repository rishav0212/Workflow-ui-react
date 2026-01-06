import { useEffect, useState } from "react";
import { fetchSystemStats } from "./api";

export default function AdminAnalytics() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchSystemStats().then(setStats);
  }, []);

  if (!stats) return null;

  return (
    <div className="p-10 bg-canvas min-h-screen">
      <h1 className="text-3xl font-serif font-bold text-ink-primary mb-10">
        System-Wide Analytics
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Active Instances"
          value={stats.activeInstances}
          icon="fas fa-play text-brand-500"
        />
        <StatCard
          title="Open Tasks"
          value={stats.activeTasks}
          icon="fas fa-tasks text-status-info"
        />
        <StatCard
          title="Failed Jobs"
          value={stats.failedJobs}
          icon="fas fa-exclamation-triangle text-status-error"
        />
        <StatCard
          title="Deployed Versions"
          value={stats.totalDefinitions}
          icon="fas fa-layer-group text-sage-600"
        />
      </div>
      {/* Add more charts here using libraries like Recharts if needed */}
    </div>
  );
}

const StatCard = ({ title, value, icon }: any) => (
  <div className="bg-surface p-6 rounded-2xl border border-canvas-active shadow-soft">
    <div className="flex justify-between items-start mb-4">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center bg-canvas-subtle ${
          icon.split(" ")[2]
        }`}
      >
        <i className={icon.split(" ").slice(0, 2).join(" ")}></i>
      </div>
    </div>
    <div className="text-3xl font-black text-ink-primary">{value}</div>
    <div className="text-xs font-bold text-ink-tertiary uppercase mt-1 tracking-wider">
      {title}
    </div>
  </div>
);
