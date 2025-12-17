import { Home, CheckSquare, Settings, Users, PieChart } from "lucide-react";
import { cn } from "../../lib/utils";


interface SidebarProps {
  user: { username: string; email: string };
}

export const Sidebar = ({ user }: SidebarProps) => {
  const navItems = [
    { label: "Dashboard", icon: Home, active: false },
    { label: "My Tasks", icon: CheckSquare, active: true },
    { label: "Workflow", icon: PieChart, active: false },
    { label: "Team", icon: Users, active: false },
    { label: "Settings", icon: Settings, active: false },
  ];

  return (
    <aside className="hidden md:flex w-64 flex-col bg-stone-900 border-r border-stone-800 text-stone-400 h-screen fixed left-0 top-0">
      <div className="h-16 flex items-center px-6 border-b border-stone-800">
        <div className="h-8 w-8 rounded bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold">
          A
        </div>
        <span className="ml-3 font-semibold text-stone-100 tracking-tight">
          Acme Corp
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-6">
        {navItems.map((item) => (
          <a
            key={item.label}
            href="#"
            className={cn(
              "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
              item.active
                ? "bg-stone-800 text-white shadow-inner"
                : "hover:bg-stone-800 hover:text-white"
            )}
          >
            <item.icon
              className={cn(
                "mr-3 h-5 w-5 flex-shrink-0",
                item.active
                  ? "text-brand-500"
                  : "text-stone-500 group-hover:text-stone-300"
              )}
            />
            {item.label}
          </a>
        ))}
      </nav>

      <div className="p-4 border-t border-stone-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer">
          <div className="h-8 w-8 rounded-full bg-stone-700 border border-stone-600 flex items-center justify-center text-xs text-white">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">
              {user.username}
            </span>
            <span className="text-xs text-stone-500 truncate max-w-[120px]">
              {user.email}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
