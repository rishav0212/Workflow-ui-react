import { useEffect, useState, useRef, useCallback } from "react";
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
import { GOOGLE_LOGIN_URL } from "./config";

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

// 🎨 ENHANCED: Sophisticated Sidebar with Warm Dark Theme
const GlobalNav = () => (
  <div className="w-20 bg-gradient-to-b from-neutral-900 via-neutral-800 to-neutral-900 border-r border-neutral-700/30 flex flex-col items-center py-6 z-40 shadow-premium">
    {/* Logo */}
    <div className="w-12 h-12 bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 rounded-xl flex items-center justify-center text-white text-xl shadow-brand-lg mb-8 ring-2 ring-brand-400/20 hover:scale-105 transition-transform cursor-pointer">
      <i className="fas fa-layer-group"></i>
    </div>

    {/* Navigation Icons */}
    <div className="flex-1 flex flex-col gap-3 w-full px-3 items-center">
      <NavIcon to="/dashboard" icon="fas fa-chart-pie" label="Dashboard" />
      <NavIcon to="/" icon="fas fa-inbox" label="Inbox" />
    </div>

    {/* Settings at Bottom */}
    <div className="pb-4">
      <button className="nav-item group">
        <i className="fas fa-cog"></i>
        <span className="absolute left-14 bg-neutral-800 text-white text-xs font-bold px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-50 shadow-floating border border-neutral-700 pointer-events-none transform translate-x-2 group-hover:translate-x-0">
          Settings
        </span>
      </button>
    </div>
  </div>
);

// 🎨 ENHANCED: Refined Navigation Icons
const NavIcon = ({ to, icon, label }: any) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `nav-item group relative w-12 h-12 rounded-xl flex items-center justify-center text-lg transition-all duration-200 ${
        isActive
          ? "bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-brand-lg ring-2 ring-brand-400/30"
          : "text-neutral-400 hover:bg-neutral-700/50 hover:text-neutral-200"
      }`
    }
  >
    <i className={icon}></i>
    <span className="absolute left-14 bg-neutral-800 text-white text-xs font-bold px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-50 shadow-floating border border-neutral-700 pointer-events-none transform translate-x-2 group-hover:translate-x-0">
      {label}
    </span>
  </NavLink>
);

// 🎨 ENHANCED: Premium Top Header with Better Visual Hierarchy
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
    <header className="h-16 bg-white border-b border-canvas-subtle flex items-center justify-between px-6 shadow-soft z-30 flex-shrink-0">
      {/* Logo/Brand */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg flex items-center justify-center text-white text-sm shadow-brand-sm">
            <i className="fas fa-layer-group"></i>
          </div>
          <h1 className="text-xl font-bold text-ink-primary tracking-tight font-serif">
            Infinity<span className="text-brand-500">Plus</span>
          </h1>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative w-10 h-10 flex items-center justify-center rounded-full text-neutral-500 hover:text-brand-600 hover:bg-brand-50 transition-all hover:scale-105"
          >
            <i className="far fa-bell text-lg"></i>
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-status-error rounded-full border-2 border-white shadow-sm"></span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifMenu && (
            <div className="absolute top-full right-0 mt-3 min-w-96 bg-white rounded-xl shadow-floating border border-canvas-subtle overflow-hidden z-50 animate-slideDown">
              <div className="px-4 py-3 border-b border-canvas-subtle flex justify-between items-center bg-canvas-subtle">
                <span className="font-bold text-[10px] uppercase text-neutral-600 tracking-widest">
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
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-canvas-subtle rounded-full flex items-center justify-center mx-auto mb-3">
                      <i className="far fa-bell-slash text-neutral-300 text-xl"></i>
                    </div>
                    <p className="text-xs text-neutral-400 font-medium">
                      No recent notifications
                    </p>
                  </div>
                ) : (
                  notifications.map((n: any) => (
                    <div
                      key={n.id}
                      className="p-3 border-b border-canvas-subtle/50 hover:bg-canvas-subtle/50 transition-colors"
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {n.type === "success" && (
                            <div className="w-6 h-6 bg-status-success/10 rounded-full flex items-center justify-center">
                              <i className="fas fa-check text-status-success text-[10px]"></i>
                            </div>
                          )}
                          {n.type === "error" && (
                            <div className="w-6 h-6 bg-status-error/10 rounded-full flex items-center justify-center">
                              <i className="fas fa-times text-status-error text-[10px]"></i>
                            </div>
                          )}
                          {n.type === "info" && (
                            <div className="w-6 h-6 bg-status-info/10 rounded-full flex items-center justify-center">
                              <i className="fas fa-info text-status-info text-[10px]"></i>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-ink-primary leading-snug font-light">
                            {n.message}
                          </p>
                          <p className="text-[10px] text-neutral-500 mt-1 font-medium">
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

        {/* User Section */}
        <div className="flex items-center gap-3 pl-3 border-l border-canvas-subtle">
          <div className="text-right hidden md:block">
            <div className="text-sm font-bold text-ink-primary">
              {user.username}
            </div>
            <div className="text-[10px] text-status-success font-bold uppercase tracking-wider flex items-center justify-end gap-1">
              <span className="w-1.5 h-1.5 bg-status-success rounded-full animate-pulse"></span>
              Online
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-10 h-10 rounded-full bg-canvas-subtle hover:bg-status-error/10 hover:text-status-error flex items-center justify-center transition-all hover:scale-105"
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
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-3">
        <i className="fas fa-circle-notch fa-spin text-brand-500 text-3xl"></i>
        <p className="text-neutral-500 text-sm font-medium">Redirecting...</p>
      </div>
    </div>
  );
}

// 🎨 ENHANCED: Refined Empty State
const NoTaskSelected = () => (
  <div className="flex-1 flex flex-col items-center justify-center h-full bg-gradient-to-b from-canvas/30 to-canvas text-center p-8 animate-fadeIn">
    <div className="w-24 h-24 bg-white rounded-2xl shadow-soft border border-canvas-subtle flex items-center justify-center mb-6">
      <i className="fas fa-inbox text-4xl text-neutral-300"></i>
    </div>
    <h2 className="text-xl font-bold text-ink-primary mb-2">Your Workspace</h2>
    <p className="text-neutral-500 text-sm max-w-sm leading-relaxed">
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
    <div className="flex h-full overflow-hidden bg-canvas">
      {/* LEFT PANE (Task List) */}
      <div className="w-[400px] xl:w-[450px] flex-shrink-0 bg-white border-r border-canvas-subtle flex flex-col z-20 shadow-lifted">
        <TaskList
          currentUser={user.username}
          refreshTrigger={refreshTrigger}
          addNotification={addNotification}
        />
      </div>

      {/* RIGHT PANE (Task Viewer) */}
      <div className="flex-1 min-w-0 bg-canvas relative overflow-y-auto flex flex-col">
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

  const addNotification = useCallback(
    (message: string, type: "success" | "error" | "info") => {
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

      // 🎨 ENHANCED: Premium Toast Notifications
      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? "animate-slideDown" : "opacity-0"
            } max-w-md w-full bg-white shadow-floating rounded-xl pointer-events-auto flex border border-canvas-subtle overflow-hidden`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 pt-0.5">
                  {type === "success" && (
                    <div className="w-8 h-8 bg-status-success/10 rounded-full flex items-center justify-center">
                      <i className="fas fa-check-circle text-status-success text-lg"></i>
                    </div>
                  )}
                  {type === "error" && (
                    <div className="w-8 h-8 bg-status-error/10 rounded-full flex items-center justify-center">
                      <i className="fas fa-times-circle text-status-error text-lg"></i>
                    </div>
                  )}
                  {type === "info" && (
                    <div className="w-8 h-8 bg-status-info/10 rounded-full flex items-center justify-center">
                      <i className="fas fa-info-circle text-status-info text-lg"></i>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink-primary">
                    {type === "success"
                      ? "Success"
                      : type === "error"
                      ? "Error"
                      : "Notification"}
                  </p>
                  <p className="mt-1 text-sm text-neutral-600 leading-relaxed">
                    {message}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-canvas-subtle bg-canvas-subtle/30">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none p-4 flex items-center justify-center text-sm font-medium text-neutral-400 hover:text-ink-primary hover:bg-canvas-subtle focus:outline-none transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        ),
        { duration: 5000 }
      );
    },
    []
  );

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
    window.location.href = GOOGLE_LOGIN_URL;
  };

  const handleLogout = () => {
    localStorage.removeItem("jwt_token");
    window.location.href = "/";
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-canvas-active rounded-full"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-neutral-500 text-sm font-medium">
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
      <div className="flex h-screen bg-canvas overflow-hidden">
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
          <div className="flex-1 overflow-y-auto relative">
            <Routes>
              {/* ADMIN ROUTES */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/processes" element={<ProcessManager />} />
              <Route
                path="/admin/processes/:processKey"
                element={<ProcessViewer addNotification={addNotification}/>}
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
                element={<Dashboard addNotification={addNotification} />}
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
