import { useEffect, useState, useRef } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useSearchParams,
  Outlet,
  NavLink,
} from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import api from "./api";
import TaskList from "./TaskList";
import TaskViewer from "./TaskViewer";
import LoginScreen from "./LoginScreen";
import Dashboard from "./Dashboard";
import "./App.css";
// Admin Imports
import AdminDashboard from "./AdminDashboard";
import ProcessManager from "./ProcessManager";
import ProcessViewer from "./ProcessViewer";
import InstanceManager from "./InstanceManager";
import TaskSupervision from "./TaskSupervision";
import InstanceInspector from "./InstanceInspector";
import ProcessGroups from "./ProcessGroups";
import AdminAnalytics from "./AdminAnalytics";
import JobManager from "./JobManager";
import DmnViewer from "./DmnViewer";

interface User {
  username: string;
  email: string;
  authorities: Array<{ authority: string }>;
}
export interface NotificationItem {
  id: number;
  message: string;
  type: "success" | "error" | "info";
  timestamp: string;
}

const timeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const GlobalNav = () => (
  <div className="nav-sidebar">
    <div className="w-12 h-12 bg-gradient-to-br from-brand-600 to-brand-800 rounded-xl flex items-center justify-center text-white text-xl shadow-lifted mb-8 ring-1 ring-white/10">
      <i className="fas fa-layer-group"></i>
    </div>
    <div className="flex-1 flex flex-col gap-4 w-full px-3 items-center">
      <NavIcon to="/dashboard" icon="fas fa-chart-pie" label="Dashboard" />
      <NavIcon to="/" icon="fas fa-inbox" label="Inbox" />
    </div>
    <div className="pb-4">
      <button className="nav-item">
        <i className="fas fa-cog"></i>
      </button>
    </div>
  </div>
);

const NavIcon = ({ to, icon, label }: any) => (
  <NavLink
    to={to}
    className={({ isActive }) => `nav-item group ${isActive ? "active" : ""}`}
  >
    <i className={icon}></i>
    <span className="absolute left-14 bg-ink-primary text-white text-xs font-bold px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-50 shadow-premium border border-ink-secondary/20 pointer-events-none transform translate-x-2 group-hover:translate-x-0">
      {label}
    </span>
  </NavLink>
);

const TopHeader = ({
  user,
  onLogout,
  notifications,
  clearNotifications,
}: any) => {
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node))
        setShowNotifMenu(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-surface border-b border-canvas-subtle flex items-center justify-between px-6 shadow-soft z-30 flex-shrink-0">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-ink-primary tracking-tight font-serif">
          Flowable<span className="text-brand-500">Work</span>
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="btn-icon relative"
          >
            <i className="far fa-bell text-lg"></i>
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-status-error rounded-full border-2 border-surface"></span>
            )}
          </button>
          {showNotifMenu && (
            <div className="absolute top-full right-0 mt-3 w-80 bg-surface rounded-xl shadow-premium border border-canvas-subtle overflow-hidden z-50 animate-fadeIn">
              <div className="px-4 py-3 border-b border-canvas-subtle flex justify-between items-center bg-canvas-subtle/50">
                <span className="font-bold text-[10px] uppercase text-ink-tertiary tracking-widest">
                  Notifications
                </span>
                <button
                  onClick={clearNotifications}
                  className="text-xs text-brand-600 font-bold hover:underline"
                >
                  Clear all
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-ink-muted">
                    No recent notifications
                  </div>
                ) : (
                  notifications.map((n: any) => (
                    <div
                      key={n.id}
                      className="p-3 border-b border-canvas-subtle/50 hover:bg-canvas-subtle transition-colors"
                    >
                      <div className="flex gap-3">
                        <div
                          className={`mt-1.5 text-[6px] ${
                            n.type === "success"
                              ? "text-status-success"
                              : n.type === "error"
                              ? "text-status-error"
                              : "text-status-info"
                          }`}
                        >
                          <i className="fas fa-circle"></i>
                        </div>
                        <div>
                          <p className="text-sm text-ink-secondary leading-snug">
                            {n.message}
                          </p>
                          <p className="text-[10px] text-ink-muted mt-1 font-medium">
                            {timeAgo(n.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 pl-4 border-l border-canvas-subtle">
          <div className="text-right hidden md:block">
            <div className="text-sm font-bold text-ink-primary">
              {user.username}
            </div>
            <div className="text-[10px] text-status-success font-bold uppercase tracking-wider">
              Online
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-9 h-9 rounded-full bg-canvas-subtle hover:bg-status-error/10 hover:text-status-error flex items-center justify-center transition-colors"
            title="Logout"
          >
            <i className="fas fa-power-off text-sm"></i>
          </button>
        </div>
      </div>
    </header>
  );
};

function OAuth2RedirectHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      localStorage.setItem("jwt_token", token);
      const redirectPath = localStorage.getItem("redirect_after_login");
      localStorage.removeItem("redirect_after_login");
      window.location.href = redirectPath || "/";
    } else {
      navigate("/");
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-orange-600">
      <i className="fas fa-circle-notch fa-spin text-2xl"></i>
    </div>
  );
}

const NoTaskSelected = () => (
  <div className="flex-1 flex flex-col items-center justify-center h-full bg-slate-50/50 text-center p-8 animate-enter">
    <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mb-6">
      <i className="fas fa-inbox text-3xl text-slate-300"></i>
    </div>
    <h2 className="text-xl font-bold text-slate-800 mb-2">Your Workspace</h2>
    <p className="text-slate-500 text-sm max-w-sm">
      Select a task from the list to view details, process history, and submit
      forms.
    </p>
  </div>
);

// --- COMPONENT: Inbox Layout ---
const InboxLayout = ({
  user,
  refreshTrigger,
  onRefresh,
  addNotification,
}: {
  user: User;
  refreshTrigger: number;
  onRefresh: () => void;
  addNotification: (msg: string, type: "success" | "error" | "info") => void;
}) => {
  return (
    <div className="flex h-full overflow-hidden bg-slate-50">
      {/* LEFT PANE (Task List) */}
      <div className="w-[400px] xl:w-[450px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col z-20 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
        <TaskList
          currentUser={user.username}
          refreshTrigger={refreshTrigger}
          addNotification={addNotification} 
        />
      </div>

      {/* RIGHT PANE (Task Viewer) */}
      <div className="flex-1 min-w-0 bg-slate-50 relative overflow-y-auto flex flex-col">
        <Outlet context={{ refreshTasks: onRefresh, addNotification }} />
      </div>
    </div>
  );
};

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem("app_notifications");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const addNotification = (
    message: string,
    type: "success" | "error" | "info"
  ) => {
    const newItem: NotificationItem = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toISOString(),
    };

    setNotifications((prev) => {
      const updated = [newItem, ...prev].slice(0, 15);
      localStorage.setItem("app_notifications", JSON.stringify(updated));
      return updated;
    });

    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? "animate-enter" : "animate-leave"
          } max-w-md w-full bg-white shadow-xl rounded-xl pointer-events-auto flex border border-slate-100 ring-1 ring-black ring-opacity-5 overflow-hidden`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                {type === "success" && (
                  <i className="fas fa-check-circle text-emerald-500 text-xl"></i>
                )}
                {type === "error" && (
                  <i className="fas fa-times-circle text-rose-500 text-xl"></i>
                )}
                {type === "info" && (
                  <i className="fas fa-info-circle text-blue-500 text-xl"></i>
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-bold text-slate-800">
                  {type === "success"
                    ? "Success"
                    : type === "error"
                    ? "Error"
                    : "Notification"}
                </p>
                <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                  {message}
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-slate-100 bg-slate-50/50">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none p-4 flex items-center justify-center text-sm font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-100 focus:outline-none transition-colors"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      ),
      { duration: 5000 }
    );
  };

  useEffect(() => {
    const token = localStorage.getItem("jwt_token");
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get<User>("/api/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("jwt_token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = () => {
    const currentPath = window.location.pathname + window.location.search;
    if (!currentPath.includes("/oauth2/redirect") && currentPath !== "/") {
      localStorage.setItem("redirect_after_login", currentPath);
    }
    window.location.href = "http://localhost:8080/oauth2/authorization/google";
  };

  const handleLogout = () => {
    localStorage.removeItem("jwt_token");
    window.location.href = "/";
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <i className="fas fa-circle-notch fa-spin text-orange-600 text-3xl"></i>
          <p className="text-slate-400 text-sm font-medium">
            Loading workspace...
          </p>
        </div>
      </div>
    );

  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/oauth2/redirect" element={<OAuth2RedirectHandler />} />
          <Route path="*" element={<LoginScreen onLogin={handleLogin} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Toaster position="top-right" reverseOrder={false} gutter={12} />
        <GlobalNav />
        <div className="flex-1 flex flex-col min-w-0">
          <TopHeader
            user={user}
            onLogout={handleLogout}
            notifications={notifications}
            clearNotifications={() => {
              setNotifications([]);
              localStorage.removeItem("app_notifications");
            }}
          />
          <div className="flex-1 overflow-hidden relative">
            <Routes>
              {/* ADMIN ROUTES */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/processes" element={<ProcessManager />} />
              <Route
                path="/admin/processes/:processKey"
                element={<ProcessViewer />}
              />
              <Route path="/admin/instances" element={<InstanceManager />} />
              <Route path="/admin/tasks" element={<TaskSupervision />} />
              <Route path="/admin/process-groups" element={<ProcessGroups />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route
                path="/admin/inspect/:instanceId"
                element={<InstanceInspector />}
              />
              <Route path="/admin/jobs" element={<JobManager />} />
              <Route path="/admin/dmn" element={<DmnViewer />} />

              {/* USER ROUTES */}
              <Route
                path="/"
                element={
                  <InboxLayout
                    user={user}
                    refreshTrigger={refreshTrigger}
                    onRefresh={() => setRefreshTrigger((prev) => prev + 1)}
                    addNotification={addNotification}
                  />
                }
              >
                <Route index element={<NoTaskSelected />} />
                <Route
                  path="task/:taskId"
                  element={<TaskViewer currentUser={user.username} />}
                />
              </Route>
              <Route
                path="/dashboard"
                element={<Dashboard addNotification={addNotification} />} // 🟢 PASSED DOWN
              />
              <Route
                path="/inbox"
                element={
                  <InboxLayout
                    user={user}
                    refreshTrigger={refreshTrigger}
                    onRefresh={() => setRefreshTrigger((prev) => prev + 1)}
                    addNotification={addNotification}
                  />
                }
              >
                <Route index element={<NoTaskSelected />} />
                <Route
                  path="task/:taskId"
                  element={<TaskViewer currentUser={user.username} />}
                />
              </Route>
              <Route
                path="/oauth2/redirect"
                element={<OAuth2RedirectHandler />}
              />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}
