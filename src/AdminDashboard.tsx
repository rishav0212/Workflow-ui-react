import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const adminCards = [
    {
      to: "/admin/processes",
      icon: "fas fa-project-diagram",
      title: "Workflow Explorer",
      desc: "View BPMN diagrams, XML source, and deploy new process versions.",
      color: "text-brand-500",
      bg: "bg-brand-50",
    },
    {
      to: "/admin/instances",
      icon: "fas fa-microchip",
      title: "Instance Manager",
      desc: "Monitor running workflows, inspect/edit variables, and terminate stuck processes.",
      color: "text-status-info",
      bg: "bg-status-info/10",
    },
    {
      to: "/admin/tasks",
      icon: "fas fa-tasks",
      title: "Task Supervision",
      desc: "God-mode view of all system tasks. Reassign work and override deadlines.",
      color: "text-status-warning",
      bg: "bg-status-warning/10",
    },
    {
      to: "/admin/analytics",
      icon: "fas fa-chart-line",
      title: "Analytics",
      desc: "Return to the standard user dashboard for performance metrics.",
      color: "text-sage-600",
      bg: "bg-sage-50",
    },{
  to: "/admin/process-groups",
  icon: "fas fa-layer-group",
  title: "Process Groups",
  desc: "Manage instances and tasks grouped specifically by their workflow definition.",
  color: "text-purple-600",
  bg: "bg-purple-50",
},
    {
      to: "/admin/jobs",
      icon: "fas fa-tools",
      title: "Incident Manager",
      desc: "The Repair Shop: Retry deadletter jobs, fix timers, and manage exceptions.",
      color: "text-status-error",
      bg: "bg-status-error/10",
    },
    {
      to: "/admin/dmn",
      icon: "fas fa-table",
      title: "Business Rules",
      desc: "Inspect DMN Decision Tables and business logic implementations.",
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
  ];

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-canvas p-10">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-serif font-bold text-ink-primary tracking-tight">
            Admin <span className="text-brand-500">Control Center</span>
          </h1>
          <p className="text-ink-tertiary mt-2 font-medium">
            System-wide orchestration and workflow integrity tools.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {adminCards.map((card, idx) => (
            <Link
              key={idx}
              to={card.to}
              className="bg-surface p-8 rounded-3xl border border-canvas-active shadow-soft hover:shadow-floating hover:-translate-y-1 transition-all group"
            >
              <div
                className={`w-14 h-14 ${card.bg} rounded-2xl flex items-center justify-center ${card.color} mb-6 group-hover:scale-110 transition-transform`}
              >
                <i className={`${card.icon} text-2xl`}></i>
              </div>
              <h2 className="text-xl font-bold text-ink-primary mb-2">
                {card.title}
              </h2>
              <p className="text-sm text-ink-tertiary leading-relaxed">
                {card.desc}
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">
                Open Tool <i className="fas fa-arrow-right text-[10px]"></i>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
