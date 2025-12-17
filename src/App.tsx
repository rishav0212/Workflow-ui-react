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

// export default App;

import { useEffect, useState } from "react";
import axios from "axios";
// @ts-ignore
import { Form } from "react-formio";

// --- Components ---
import { Sidebar } from "./components/layout/Sidebar";
import { SmartToolbar } from "./components/tasks/SmartToolbar";
import { HistoryTimeline } from "./components/tasks/HistoryTimeline";
import { Badge } from "./components/ui/Badge";
import { Button } from "./components/ui/Button";
import { Skeleton } from "./components/ui/Skeleton";

// --- Icons & Utils ---
import {
  Search,
  Filter,
  ArrowLeft,
  CheckSquare,
  AlertCircle,
} from "lucide-react";
import { cn } from "./lib/utils";
// --- API Logic ---
import {
  fetchTasks,
  fetchTaskView,
  fetchProcessHistory,
  completeTask,
  type Task,
  type ActionButton,
} from "./api";

// --- Types ---
interface User {
  username: string;
  email: string;
}

interface TaskDetailState {
  task: Task | null;
  schema: any;
  submission: any;
  history: any[];
  buttons: ActionButton[];
  loading: boolean;
}

export default function App() {
  // --- Global State ---
  const [user, setUser] = useState<User | null>(null);
  const [appLoading, setAppLoading] = useState(true);

  // --- Task List State ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // --- Detailed View State ---
  const [activeTab, setActiveTab] = useState<"actions" | "history">("actions");
  const [detail, setDetail] = useState<TaskDetailState>({
    task: null,
    schema: null,
    submission: null,
    history: [],
    buttons: [],
    loading: false,
  });

  // 1. Initial Auth Check
  useEffect(() => {
    axios
      .get<User>("http://localhost:8080/api/auth/me")
      .then((res) => {
        setUser(res.data);
        fetchUserTasks(res.data.username);
      })
      .catch(() => {
        console.log("Not logged in");
        setUser(null);
      })
      .finally(() => setAppLoading(false));
  }, []);

  // 2. Fetch Tasks Helper
  const fetchUserTasks = async (username: string) => {
    setListLoading(true);
    try {
      const data = await fetchTasks(username);
      setTasks(data);
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    } finally {
      setListLoading(false);
    }
  };

  // 3. Load Task Detail (Logic from old TaskViewer)
  useEffect(() => {
    if (!selectedTaskId) return;

    const loadTaskDetail = async () => {
      setDetail((prev) => ({ ...prev, loading: true }));
      try {
        // A. Fetch Task View (Schema + Data + Task Info)
        const viewData = await fetchTaskView(selectedTaskId);

        // B. Parse Actions/Buttons from Schema
        const components = viewData.schema?.components || [];
        const configComp = components.find(
          (c: any) => c.key === "externalActions"
        );
        let parsedButtons: ActionButton[] = [];

        if (configComp?.defaultValue) {
          parsedButtons =
            typeof configComp.defaultValue === "string"
              ? JSON.parse(configComp.defaultValue)
              : configComp.defaultValue;
        }

        // C. Fetch History
        let historyData = [];
        if (viewData.task.processInstanceId) {
          historyData = await fetchProcessHistory(
            viewData.task.processInstanceId
          );
        }

        setDetail({
          task: viewData.task,
          schema: viewData.schema,
          submission: { data: viewData.formData }, // Form.io expects { data: ... }
          history: historyData,
          buttons: parsedButtons,
          loading: false,
        });
      } catch (err) {
        console.error(err);
        alert("Failed to load task details.");
        setDetail((prev) => ({ ...prev, loading: false }));
      }
    };

    loadTaskDetail();
  }, [selectedTaskId]);

  // 4. Handle Task Completion
  const handleAction = async (actionBtn: ActionButton, submissionData: any) => {
    if (!selectedTaskId) return;

    // If form data is needed but not provided yet (clicked from toolbar without submit),
    // you might need a ref to the form. For now, assuming standard buttons or form submission triggers.
    // NOTE: In this design, usually the Form handles the 'submit' event.

    // Construct Payload
    const variables = [
      { name: "action", value: actionBtn.action },
      // Add other form variables if needed
    ];

    // Merge form data if we are inside the form submit handler
    // If you are using external buttons, this requires the Form.io instance reference.
    // For simplicity, we assume the user clicks the "Submit" button inside the form
    // OR we use the SmartToolbar buttons to trigger a complete with the current data state.

    try {
      // Simplified complete call matching your api.ts
      await axios.post(
        `http://localhost:8080/process-api/runtime/tasks/${selectedTaskId}`,
        {
          action: "complete",
          variables: [
            { name: "action", value: actionBtn.action },
            // Map formData to variables if your backend requires it flatten,
            // or send it as a single JSON variable
            { name: "formData", value: JSON.stringify(submissionData) },
          ],
        }
      );

      alert("Task Completed!");
      setSelectedTaskId(null);
      if (user) fetchUserTasks(user.username); // Refresh list
    } catch (err) {
      alert("Submission failed");
      console.error(err);
    }
  };

  // 5. Handle Form.io internal submit
  const onFormSubmit = (submission: any) => {
    // Check if we have a primary action or default
    const primaryAction =
      detail.buttons.find((b) => b.color === "success") || detail.buttons[0];
    if (primaryAction) {
      handleAction(primaryAction, submission.data);
    } else {
      // Fallback for simple forms
      completeTask(selectedTaskId!, []).then(() => {
        alert("Form Submitted");
        setSelectedTaskId(null);
        if (user) fetchUserTasks(user.username);
      });
    }
  };

  // --- Renders ---

  const handleLogin = () => {
    window.location.href = "http://localhost:8080/oauth2/authorization/google";
  };

  if (appLoading)
    return (
      <div className="flex items-center justify-center h-screen text-ink-muted">
        Loading Application...
      </div>
    );

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-canvas">
        <h1 className="text-3xl font-serif font-bold mb-6 text-ink-primary">
          Acme Corp Workflow
        </h1>
        <Button onClick={handleLogin} size="md">
          Login with Google
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-canvas font-sans text-ink-primary">
      {/* 1. Static Sidebar */}
      <Sidebar user={user} />

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col md:flex-row md:pl-64 h-screen overflow-hidden">
        {/* --- LEFT PANEL: Master List --- */}
        <section
          className={cn(
            "flex flex-col border-r border-stone-200 bg-surface w-full md:w-96 transition-all duration-300",
            selectedTaskId ? "hidden md:flex" : "flex"
          )}
        >
          {/* List Header */}
          <div className="h-16 px-4 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-surface z-10">
            <h1 className="font-serif text-lg font-bold text-ink-primary">
              Inbox
            </h1>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost">
                <Search className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto">
            {listLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <div className="p-8 text-center text-ink-muted">
                <CheckSquare className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p>No active tasks. You're all caught up!</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className={cn(
                    "p-4 border-b border-stone-100 cursor-pointer transition-all hover:bg-canvas-subtle group",
                    selectedTaskId === task.id
                      ? "bg-stone-50 border-l-4 border-l-brand-600"
                      : "border-l-4 border-l-transparent"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        selectedTaskId === task.id
                          ? "text-ink-primary"
                          : "text-ink-secondary"
                      )}
                    >
                      {task.name}
                    </span>
                    <Badge variant="neutral">Active</Badge>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-ink-muted">
                      Created: {new Date(task.createTime).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* --- RIGHT PANEL: Detail View --- */}
        <section
          className={cn(
            "flex-1 flex flex-col bg-canvas transition-all duration-300 relative",
            !selectedTaskId ? "hidden md:flex" : "flex"
          )}
        >
          {selectedTaskId && detail.loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-ink-muted flex flex-col items-center">
                <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full mb-4"></div>
                Loading Task...
              </div>
            </div>
          ) : selectedTaskId && detail.task ? (
            <>
              {/* Mobile Only: Back Button */}
              <div className="md:hidden flex items-center px-4 py-2 bg-surface border-b border-stone-200">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTaskId(null)}
                  className="-ml-2"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Button>
              </div>

              {/* Smart Toolbar (Sticky Header) */}
              <SmartToolbar
                title={detail.task.name}
                subtitle={`Case ID: ${detail.task.businessKey || "N/A"}`}
                actions={detail.buttons}
                onAction={(btn) => {
                  // Trigger form submission manually if button clicked from toolbar
                  // This often requires a ref to the Form.io instance to get data
                  // For now, we assume buttons inside the form are used,
                  // or we handle simple actions without data here.
                  const confirm = window.confirm(
                    `Execute action: ${btn.label}?`
                  );
                  if (confirm) handleAction(btn, detail.submission?.data || {});
                }}
              />

              {/* Tabs */}
              <div className="px-6 border-b border-stone-200 bg-surface">
                <div className="flex space-x-8">
                  <button
                    onClick={() => setActiveTab("actions")}
                    className={cn(
                      "py-4 text-sm font-medium border-b-2 transition-colors",
                      activeTab === "actions"
                        ? "border-brand-600 text-brand-700"
                        : "border-transparent text-ink-secondary hover:text-ink-primary"
                    )}
                  >
                    Form & Actions
                  </button>
                  <button
                    onClick={() => setActiveTab("history")}
                    className={cn(
                      "py-4 text-sm font-medium border-b-2 transition-colors",
                      activeTab === "history"
                        ? "border-brand-600 text-brand-700"
                        : "border-transparent text-ink-secondary hover:text-ink-primary"
                    )}
                  >
                    History
                  </button>
                </div>
              </div>

              {/* Tab Content Area */}
              <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-canvas">
                <div className="max-w-4xl mx-auto bg-surface rounded-xl shadow-premium border border-stone-200 p-6 md:p-8 min-h-[500px]">
                  {activeTab === "actions" ? (
                    <div className="formio-clean-wrapper">
                      {/* Replaced TaskForm with Form.io */}
                      {detail.schema ? (
                        <Form
                          form={detail.schema}
                          submission={detail.submission}
                          onSubmit={onFormSubmit}
                          options={{ noAlerts: true }}
                        />
                      ) : (
                        <div className="text-center py-10 text-ink-muted">
                          No form schema available for this task.
                        </div>
                      )}
                    </div>
                  ) : (
                    <HistoryTimeline events={detail.history} />
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-ink-muted flex-col">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                <CheckSquare className="h-8 w-8 text-stone-300" />
              </div>
              <p>Select a task to view details</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
