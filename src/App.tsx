// import { useEffect, useState } from "react";
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import axios from "axios";
// import TaskList from "./TaskList";
// import FormioDesigner from "./Formio_designer";
// import TaskViewer from "./TaskViewer";
// import "./App.css";
// import "bootstrap/dist/css/bootstrap.min.css";

// // 1. Define the User Type (Matches your Java AuthController)
// interface User {
//   username: string;
//   email: string;
//   authorities: Array<{ authority: string }>;
// }

// function App() {
//   // 2. Use the strict type instead of <any>
//   const [user, setUser] = useState<User | null>(null);
//   const [loading, setLoading] = useState<boolean>(true);

//   // 3. Check Login Status on Load
//   useEffect(() => {
//     // strict typing for the axios response
//     axios
//       .get<User>("http://localhost:8080/api/auth/me")
//       .then((res) => {
//         setUser(res.data);
//       })
//       .catch(() => {
//         console.log("Not logged in");
//         setUser(null);
//       })
//       .finally(() => setLoading(false));
//   }, []);

//   const handleLogin = () => {
//     window.location.href = "http://localhost:8080/oauth2/authorization/google";
//   };

//   if (loading) return <div className="p-10 text-center">Loading...</div>;

//   if (!user) {
//     return (
//       <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
//         <h1 className="text-3xl font-bold mb-6 text-gray-800">
//           Flowable App Login
//         </h1>
//         <button
//           onClick={handleLogin}
//           className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:bg-blue-700 transition"
//         >
//           Login with Google
//         </button>
//       </div>
//     );
//   }

//   return (
//     <BrowserRouter>
//       <div className="bg-white border-b p-4 flex justify-between items-center">
//         <span className="font-bold text-gray-700">User: {user.username}</span>
//         <button
//           onClick={async () => {
//             await axios.post("http://localhost:8080/logout");
//             window.location.reload();
//           }}
//           className="text-red-500 text-sm hover:underline"
//         >
//           Logout
//         </button>
//       </div>

//       <Routes>
//         <Route path="/" element={<TaskList currentUser={user.username} />} />
//         <Route path="/task/:taskId" element={<TaskViewer />} />
//         <Route path="/formio-designer" element={<FormioDesigner />} />
//       </Routes>
//     </BrowserRouter>
//   );
// }

import { useEffect, useState } from "react";
import axios from "axios";
// @ts-ignore
import { Form } from "react-formio";
import { cn } from "./lib/utils";

// --- Components ---
import { Sidebar } from "./components/layout/Sidebar";
import { SmartToolbar } from "./components/tasks/SmartToolbar";
import { HistoryTimeline } from "./components/tasks/HistoryTimeline";
import TaskActionModal from "./components/tasks/TaskActionModal";
import { Badge } from "./components/ui/Badge";
import { Button } from "./components/ui/Button";
import { Skeleton } from "./components/ui/Skeleton";
import { Search, Filter, Inbox, ArrowLeft, LogIn } from "lucide-react";

// --- API & Types ---
import {
  fetchTasks,
  fetchTaskView,
  fetchProcessHistory,
  fetchFormSchema,
  submitTask,
} from "./api";
import {
  type User,
  type Task,
  type ActionButton,
  type HistoryEvent,
} from "./types";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Task List
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isListLoading, setIsListLoading] = useState(false);

  // Detail View
  const [taskDetail, setTaskDetail] = useState<{
    task: Task | null;
    schema: any;
    submission: any;
    buttons: ActionButton[];
    history: HistoryEvent[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "history">("details");

  // Modal Action State
  const [modalOpen, setModalOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionButton | null>(null);
  const [modalSchema, setModalSchema] = useState<any>(null);

  // 1. Init (Check Auth)
  useEffect(() => {
    axios
      .get<User>("http://localhost:8080/api/auth/me")
      .then((res) => {
        setUser(res.data);
        loadTasks(res.data.username);
      })
      .catch(() => {
        console.log("User not logged in");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = () => {
    window.location.href = "http://localhost:8080/oauth2/authorization/google";
  };

  const loadTasks = async (username: string) => {
    setIsListLoading(true);
    try {
      const data = await fetchTasks(username);
      setTasks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsListLoading(false);
    }
  };

  // 2. Load Detail
  useEffect(() => {
    if (!selectedTaskId) return;

    const loadDetail = async () => {
      setTaskDetail(null);
      try {
        const view = await fetchTaskView(selectedTaskId);

        // Parse Buttons
        const components = view.schema?.components || [];
        const actionsComp = components.find(
          (c: any) => c.key === "externalActions"
        );
        let parsedButtons: ActionButton[] = [];
        if (actionsComp?.defaultValue) {
          parsedButtons =
            typeof actionsComp.defaultValue === "string"
              ? JSON.parse(actionsComp.defaultValue)
              : actionsComp.defaultValue;
        }

        // Fetch History
        let history = [];
        if (view.task.processInstanceId) {
          history = await fetchProcessHistory(view.task.processInstanceId);
        }

        setTaskDetail({
          task: view.task,
          schema: view.schema,
          submission: { data: view.formData },
          buttons: parsedButtons,
          history,
        });
      } catch (err) {
        console.error(err);
      }
    };
    loadDetail();
  }, [selectedTaskId]);

  // 3. Toolbar Action -> Open Modal
  const handleActionClick = async (btn: ActionButton) => {
    setActiveAction(btn);
    setModalSchema(null);
    setModalOpen(true);

    try {
      const schema = await fetchFormSchema(btn.targetForm);
      setModalSchema(schema);
    } catch (err) {
      alert("Error loading action form.");
      setModalOpen(false);
    }
  };

  // 4. Modal Submit
  const handleModalSubmit = async (submission: any) => {
    if (!selectedTaskId || !activeAction) return;
    const payload = {
      action: activeAction.action,
      formData: submission.data,
      submittedFormKey: activeAction.targetForm,
    };
    try {
      await submitTask(selectedTaskId, payload);
      alert("Task Completed!");
      setModalOpen(false);
      setSelectedTaskId(null);
      if (user) loadTasks(user.username);
    } catch (err) {
      alert("Submission Failed");
    }
  };

  // --- RENDER STATES ---

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-canvas text-ink-muted">
        <div className="animate-spin h-8 w-8 border-4 border-brand-200 border-t-brand-600 rounded-full mr-3"></div>
        Loading Application...
      </div>
    );
  }

  // --- LOGIN SCREEN (Restored) ---
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-canvas">
        <div className="w-full max-w-md bg-surface p-8 rounded-2xl shadow-premium border border-stone-200 text-center">
          <div className="h-12 w-12 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl mx-auto flex items-center justify-center text-white font-bold text-xl shadow-lg mb-6">
            A
          </div>
          <h1 className="text-2xl font-serif font-bold text-ink-primary mb-2">
            Welcome Back
          </h1>
          <p className="text-ink-secondary mb-8">
            Sign in to access your workflow dashboard.
          </p>

          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border border-stone-300 hover:bg-stone-50 text-ink-primary font-medium py-3 px-4 rounded-lg transition-all shadow-sm hover:shadow-md group"
          >
            {/* Google Icon SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>
        <p className="mt-8 text-xs text-ink-muted">
          &copy; 2024 Acme Corp. Secure Workflow System.
        </p>
      </div>
    );
  }

  // --- MAIN APP ---
  return (
    <div className="flex h-screen bg-canvas font-sans text-ink-primary overflow-hidden">
      {/* Sidebar (Warm/Medium) */}
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col md:flex-row md:pl-64 h-full">
        {/* --- LEFT: Task List --- */}
        <div
          className={cn(
            "w-full md:w-96 bg-surface border-r border-stone-200 flex flex-col z-10 transition-transform",
            selectedTaskId ? "hidden md:flex" : "flex"
          )}
        >
          {/* Header */}
          <div className="h-16 px-4 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-surface">
            <h2 className="font-serif font-bold text-ink-primary text-lg">
              Inbox
            </h2>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost">
                <Search className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {isListLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton
                    key={i}
                    className="h-20 w-full rounded-xl bg-stone-100"
                  />
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-ink-muted">
                <Inbox className="w-10 h-10 mb-2 opacity-30" />
                <span className="text-sm">All caught up</span>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className={cn(
                    "p-4 border-b border-stone-50 cursor-pointer hover:bg-canvas-subtle transition-colors relative group",
                    selectedTaskId === task.id &&
                      "bg-brand-50/50 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-brand-600"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        selectedTaskId === task.id
                          ? "text-brand-900"
                          : "text-ink-primary"
                      )}
                    >
                      {task.name}
                    </span>
                    <Badge
                      variant="neutral"
                      className="text-[10px] bg-white border-stone-200"
                    >
                      Active
                    </Badge>
                  </div>
                  <span className="text-xs text-ink-muted">
                    {new Date(task.createTime).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- RIGHT: Task Viewer --- */}
        <div
          className={cn(
            "flex-1 bg-canvas flex flex-col h-full overflow-hidden",
            !selectedTaskId ? "hidden md:flex" : "flex"
          )}
        >
          {!selectedTaskId ? (
            <div className="flex-1 flex items-center justify-center text-ink-muted/50">
              <div className="text-center">
                <Inbox className="w-20 h-20 mx-auto mb-4 opacity-20" />
                <p>Select a task to view details</p>
              </div>
            </div>
          ) : !taskDetail ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin h-10 w-10 border-4 border-brand-200 border-t-brand-600 rounded-full"></div>
            </div>
          ) : (
            <>
              {/* Mobile Back Button */}
              <div className="md:hidden bg-surface px-4 py-2 border-b border-stone-200 flex items-center">
                <button
                  onClick={() => setSelectedTaskId(null)}
                  className="flex items-center text-sm text-ink-secondary"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </button>
              </div>

              {/* Toolbar */}
              <SmartToolbar
                title={taskDetail.task?.name || "Task"}
                subtitle={`ID: ${taskDetail.task?.businessKey || "N/A"}`}
                actions={taskDetail.buttons}
                onAction={handleActionClick}
              />

              {/* Tabs */}
              <div className="px-6 bg-surface border-b border-stone-200 shadow-sm z-10">
                <div className="flex space-x-6">
                  <button
                    onClick={() => setActiveTab("details")}
                    className={cn(
                      "py-3 text-sm font-medium border-b-2 transition-colors",
                      activeTab === "details"
                        ? "border-brand-600 text-brand-700"
                        : "border-transparent text-ink-muted hover:text-ink-primary"
                    )}
                  >
                    Task Form
                  </button>
                  <button
                    onClick={() => setActiveTab("history")}
                    className={cn(
                      "py-3 text-sm font-medium border-b-2 transition-colors",
                      activeTab === "history"
                        ? "border-brand-600 text-brand-700"
                        : "border-transparent text-ink-muted hover:text-ink-primary"
                    )}
                  >
                    Audit Trail
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-canvas">
                <div className="max-w-4xl mx-auto bg-surface rounded-xl shadow-premium border border-stone-200/60 min-h-[500px] p-6">
                  {activeTab === "details" ? (
                    <div className="formio-clean-wrapper">
                      <Form
                        form={taskDetail.schema}
                        submission={taskDetail.submission}
                        options={{ readOnly: true, noAlerts: true }}
                      />
                    </div>
                  ) : (
                    <HistoryTimeline events={taskDetail.history} />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <TaskActionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={activeAction?.label || "Complete Task"}
        formSchema={modalSchema}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
}
