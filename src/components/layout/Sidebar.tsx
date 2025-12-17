import {
  Home,
  CheckSquare,
  Settings,
  Users,
  PieChart,
  LogOut,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { type User } from "../../types";

interface SidebarProps {
  user: User | null;
}

export const Sidebar = ({ user }: SidebarProps) => {
  const navItems = [
    { label: "Dashboard", icon: Home, active: false },
    { label: "My Tasks", icon: CheckSquare, active: true },
    { label: "Workflow", icon: PieChart, active: false },
    { label: "Team", icon: Users, active: false },
  ];

  return (
    <aside className="hidden md:flex w-64 flex-col bg-canvas-active border-r border-stone-200 h-screen fixed left-0 top-0 z-20">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-stone-300/50 bg-canvas">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold shadow-sm">
          A
        </div>
        <span className="ml-3 font-serif font-bold text-ink-primary tracking-tight text-lg">
          Acme Corp
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-6">
        {navItems.map((item) => (
          <a
            key={item.label}
            href="#"
            className={cn(
              "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all",
              item.active
                ? "bg-white shadow-sm text-brand-700 ring-1 ring-stone-200"
                : "text-ink-secondary hover:bg-stone-200/50 hover:text-ink-primary"
            )}
          >
            <item.icon
              className={cn(
                "mr-3 h-5 w-5 transition-colors",
                item.active
                  ? "text-brand-600"
                  : "text-ink-muted group-hover:text-ink-secondary"
              )}
            />
            {item.label}
          </a>
        ))}
      </nav>

      {/* Profile Footer */}
      <div className="p-4 border-t border-stone-300/50 bg-canvas">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer group">
          <div className="h-9 w-9 rounded-full bg-stone-200 border border-stone-300 flex items-center justify-center text-xs font-bold text-ink-secondary group-hover:bg-white group-hover:border-brand-300 transition-colors">
            {user?.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium text-ink-primary truncate">
              {user?.username || "Guest"}
            </span>
            <span className="text-xs text-ink-muted truncate">
              {user?.email || "No email"}
            </span>
          </div>
          <LogOut className="w-4 h-4 ml-auto text-ink-muted hover:text-status-error transition-colors" />
        </div>
      </div>
    </aside>
  );
};
