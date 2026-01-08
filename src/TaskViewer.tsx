import { useEffect, useState, useCallback, useMemo, memo, useRef } from "react";
import {
  useNavigate,
  useParams,
  useSearchParams,
  useOutletContext,
} from "react-router-dom";
import "formiojs/dist/formio.full.min.css";
import "bootstrap/dist/css/bootstrap.min.css";
// @ts-ignore
import { Form } from "@formio/react";
import api, {
  fetchTaskRender,
  fetchFormSchema,
  submitTask,
  fetchProcessHistory,
  fetchSubmissionData,
  claimTask,
  parseApiError,
} from "./api";
import SubmissionModal from "./SubmissionModal";
import { FORM_IO_API_URL } from "./config";

// --- INTERFACE FOR OUTLET CONTEXT ---
interface GlobalContext {
  refreshTasks: () => void;
  addNotification: (msg: string, type: "success" | "error" | "info") => void;
}

const fixUrls = (components: any[]) => {
  if (!components) return;
  components.forEach((comp: any) => {
    if (
      comp.type === "select" &&
      comp.dataSrc === "resource" &&
      comp.data?.resource
    ) {
      comp.dataSrc = "url";
      comp.data.url = `${FORM_IO_API_URL}/form/${comp.data.resource}/submission`;
      comp.authenticate = true;
      if (!comp.data) comp.data = {};
      comp.data.authenticate = true;
      delete comp.data.resource;
    }
    if (comp.components) fixUrls(comp.components);
    if (comp.columns)
      comp.columns.forEach((col: any) => fixUrls(col.components));
  });
};

// ... (Keep existing Types: ActionButton, HistoryEvent) ...
interface ActionButton {
  label: string;
  action: string;
  targetForm: string;
  icon: string;
  color: string;
  variables?: Record<string, any>;
}

interface HistoryEvent {
  taskId: string;
  taskName: string;
  status: string;
  startTime: string;
  endTime?: string;
  formKey?: string;
  formSubmissionId?: string;
}

// ... (Keep UI Helpers: StatusBadge, DataField, FormSkeleton, NoFormState, HistorySkeleton) ...
const StatusBadge = memo(
  ({
    type,
    label,
    icon,
  }: {
    type: "success" | "warning" | "error" | "info" | "neutral";
    label: string;
    icon?: string;
  }) => {
    const styles = {
      success: "bg-sage-100 text-sage-800 border-sage-200",
      warning: "bg-brand-100 text-brand-800 border-brand-200",
      error: "bg-status-error/10 text-status-error border-status-error/20",
      info: "bg-status-info/10 text-status-info border-status-info/20",
      neutral: "bg-canvas-subtle text-ink-secondary border-canvas-active",
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[type]}`}
      >
        {icon && <i className={`${icon} text-[10px]`}></i>}
        {label}
      </span>
    );
  }
);

const DataField = memo(
  ({
    label,
    value,
    icon,
  }: {
    label: string;
    value: string | React.ReactNode;
    icon: string;
  }) => (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-ink-tertiary font-semibold mb-0.5">
        {label}
      </span>
      <div className="flex items-center gap-2 text-sm text-ink-primary font-medium">
        <i className={`${icon} text-brand-400 text-xs w-4`}></i>
        <span className="truncate">{value}</span>
      </div>
    </div>
  )
);

const FormSkeleton = memo(() => (
  <div className="space-y-6 animate-pulse p-1">
    {[1, 2, 3].map((i) => (
      <div key={i} className="space-y-2">
        <div className="h-4 bg-canvas-active rounded w-32"></div>
        <div className="h-10 bg-surface-muted rounded-lg border border-canvas-active"></div>
      </div>
    ))}
  </div>
));

const NoFormState = memo(() => (
  <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-canvas-active rounded-xl bg-canvas-subtle/30 m-6">
    <div className="w-16 h-16 bg-canvas-active rounded-full flex items-center justify-center mb-4">
      <i className="fas fa-clipboard-list text-2xl text-ink-tertiary"></i>
    </div>
    <h3 className="text-lg font-serif font-bold text-ink-primary">
      No Details Available
    </h3>
    <p className="text-sm text-ink-secondary max-w-xs mx-auto mt-2">
      This task does not have a specific form attached to it.
    </p>
  </div>
));

const HistorySkeleton = memo(() => (
  <div className="pl-4 border-l-2 border-canvas-active space-y-8 animate-pulse mt-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="relative pl-6">
        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-canvas-active"></div>
        <div className="space-y-2">
          <div className="h-3 bg-canvas-active rounded w-24"></div>
          <div className="h-4 bg-canvas-active rounded w-48"></div>
        </div>
      </div>
    ))}
  </div>
));

// ... (Keep Sub-Components: TaskHeader, ActionToolbar, ClaimTaskOverlay, HistoryTimeline) ...
const TaskHeader = memo(({ taskData }: { taskData: any }) => {
  const isHighPriority = taskData?.priority > 50;

  return (
    <div className="bg-surface p-6 border-b border-canvas-subtle">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-500 shadow-sm border border-brand-100">
            <i className="fas fa-layer-group text-lg"></i>
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-ink-primary leading-tight">
              {taskData?.taskName || "Loading Task..."}
            </h1>
            <p className="text-xs text-ink-tertiary">
              ID:{" "}
              <span className="font-mono">
                {taskData?.id?.substring(0, 8)}...
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isHighPriority && (
            <StatusBadge
              type="error"
              label="High Priority"
              icon="fas fa-flag"
            />
          )}
          {!taskData?.assignee ? (
            <StatusBadge
              type="warning"
              label="Unassigned"
              icon="fas fa-user-clock"
            />
          ) : (
            <StatusBadge
              type="success"
              label="Assigned"
              icon="fas fa-user-check"
            />
          )}
        </div>
      </div>

      {taskData?.description && (
        <div className="bg-canvas-subtle/50 rounded-lg p-3 mb-5 border border-canvas-subtle">
          <p className="text-sm text-ink-secondary leading-relaxed whitespace-pre-wrap">
            {taskData.description}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
        <DataField
          label="Business Key"
          value={taskData?.businessKey || "N/A"}
          icon="fas fa-hashtag"
        />
        <DataField
          label="Process"
          value={taskData?.processDefinitionName || "Unknown"}
          icon="fas fa-project-diagram"
        />
        <DataField
          label="Created"
          value={
            taskData?.createTime
              ? new Date(taskData.createTime).toLocaleDateString()
              : "-"
          }
          icon="far fa-calendar-alt"
        />
        <DataField
          label="Due Date"
          value={
            taskData?.dueDate ? (
              <span
                className={
                  new Date(taskData.dueDate) < new Date()
                    ? "text-status-error font-bold"
                    : ""
                }
              >
                {new Date(taskData.dueDate).toLocaleDateString()}
              </span>
            ) : (
              "No Deadline"
            )
          }
          icon="far fa-clock"
        />
      </div>
    </div>
  );
});

const ActionToolbar = memo(
  ({
    buttons,
    onActionClick,
    disabled,
  }: {
    buttons: ActionButton[];
    onActionClick: (btn: ActionButton) => void;
    disabled: boolean;
  }) => {
    const [showMenu, setShowMenu] = useState(false);
    const primaryLimit = 3;
    const primaryButtons = buttons.slice(0, primaryLimit);
    const secondaryButtons = buttons.slice(primaryLimit);

    const getBtnStyle = (color: string) => {
      const map: Record<string, string> = {
        primary:
          "bg-brand-500 hover:bg-brand-600 text-white shadow-brand-500/20",
        success:
          "bg-status-success hover:bg-opacity-90 text-white shadow-status-success/20",
        warning:
          "bg-status-warning hover:bg-opacity-90 text-white shadow-status-warning/20",
        danger:
          "bg-status-error hover:bg-opacity-90 text-white shadow-status-error/20",
        info: "bg-status-info hover:bg-opacity-90 text-white shadow-status-info/20",
      };
      return map[color] || map.primary;
    };

    if (buttons.length === 0) return null;

    return (
      <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur-sm border-b border-canvas-subtle px-6 py-3 flex items-center justify-between shadow-sm">
        <span className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">
          Available Actions
        </span>
        <div className="flex items-center gap-2">
          {primaryButtons.map((btn, idx) => (
            <button
              key={idx}
              disabled={disabled}
              onClick={() => onActionClick(btn)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${getBtnStyle(
                btn.color
              )}`}
            >
              <i className={btn.icon}></i>
              {btn.label}
            </button>
          ))}
          {secondaryButtons.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                disabled={disabled}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-canvas text-ink-secondary border border-canvas-active hover:bg-canvas-active hover:text-ink-primary transition-colors"
              >
                <i className="fas fa-ellipsis-v"></i>
              </button>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowMenu(false)}
                  ></div>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-surface rounded-xl shadow-floating border border-canvas-subtle overflow-hidden z-40 animate-slideDown">
                    {secondaryButtons.map((btn, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          onActionClick(btn);
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-ink-secondary hover:bg-canvas-subtle hover:text-brand-600 flex items-center gap-3 transition-colors border-b border-canvas-subtle last:border-0"
                      >
                        <i className={`${btn.icon} w-4 text-center`}></i>
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

const ClaimTaskOverlay = memo(
  ({ onClaim, claiming }: { onClaim: () => void; claiming: boolean }) => (
    <div className="absolute inset-0 z-10 bg-surface/60 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-b-xl animate-fadeIn">
      <div className="bg-surface p-8 rounded-2xl shadow-floating border border-canvas-active max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
          <i className="fas fa-lock text-brand-500 text-2xl"></i>
        </div>
        <h3 className="text-xl font-serif font-bold text-ink-primary mb-2">
          Claim Required
        </h3>
        <p className="text-ink-secondary text-sm mb-6">
          You must assign this task to yourself before you can view the form
          details or take action.
        </p>
        <button
          onClick={onClaim}
          disabled={claiming}
          className="w-full py-3 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium shadow-lg hover:shadow-brand-500/25 transition-all duration-200"
        >
          {claiming ? (
            <>
              <i className="fas fa-circle-notch fa-spin mr-2"></i> Claiming...
            </>
          ) : (
            "Assign to Me"
          )}
        </button>
      </div>
    </div>
  )
);

const HistoryTimeline = memo(
  ({
    history,
    onViewEvent,
  }: {
    history: HistoryEvent[];
    onViewEvent: (e: HistoryEvent) => void;
  }) => {
    // 🟢 LATEST ON TOP: Descending order
    const sortedHistory = [...history].sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    const getEventConfig = (event: any) => {
      const type = event.type || "";
      const name = (event.taskName || "").toLowerCase();

      if (type === "startEvent")
        return {
          icon: "fas fa-play",
          label: "START",
          color: "text-sage-500",
          bg: "bg-sage-50",
        };
      if (type === "endEvent")
        return {
          icon: "fas fa-check-double",
          label: "END",
          color: "text-ink-primary",
          bg: "bg-canvas-subtle",
        };
      if (name.includes("email") || type === "serviceTask")
        return {
          icon: "fas fa-envelope",
          label: "EMAIL",
          color: "text-status-info",
          bg: "bg-status-info/10",
        };
      return {
        icon: "fas fa-user",
        label: "TASK",
        color: "text-brand-500",
        bg: "bg-brand-50",
      };
    };

    return (
      <div className="relative px-2 py-4">
        {/* Slimmer vertical line */}
        <div className="absolute top-0 bottom-0 left-[23px] w-[1.5px] bg-canvas-active opacity-50"></div>

        <div className="space-y-4">
          {" "}
          {/* Reduced spacing between cards */}
          {sortedHistory.map((event: any, idx) => {
            const isCompleted = event.status === "COMPLETED";
            const hasData = !!event.formSubmissionId;
            const config = getEventConfig(event);

            return (
              <div key={idx} className="relative pl-12 group animate-slideUp">
                {/* Compact Icon Marker */}
                <div className="absolute left-0 top-2 w-12 h-full flex justify-center">
                  <div
                    className={`z-10 w-7 h-7 rounded-full border-2 bg-white flex items-center justify-center shadow-sm transition-all ${
                      isCompleted
                        ? "border-sage-200"
                        : "border-brand-400 animate-pulse"
                    }`}
                  >
                    <i
                      className={`${config.icon} ${config.color} text-[10px]`}
                    ></i>
                  </div>
                </div>

                {/* Slim Hybrid Card */}
                <div
                  className={`bg-surface border rounded-lg p-3 transition-all duration-200 ${
                    hasData
                      ? "cursor-pointer hover:border-brand-400 hover:shadow-sm"
                      : "border-canvas-subtle"
                  }`}
                  onClick={() => hasData && onViewEvent(event)}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}
                        >
                          {config.label}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase ${
                            isCompleted ? "text-sage-500" : "text-brand-500"
                          }`}
                        >
                          {event.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-ink-primary text-sm truncate">
                        {event.taskName}
                      </h4>
                    </div>

                    {/* Enhanced & Bolder Date/Time */}
                    <div className="text-right whitespace-nowrap">
                      <div className="text-[13px] font-black text-ink-primary font-mono leading-none">
                        {new Date(event.startTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="text-[10px] font-bold text-ink-tertiary mt-1">
                        {new Date(event.startTime).toLocaleDateString(
                          undefined,
                          {
                            day: "numeric",
                            month: "short",
                          }
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Compact Footer (only if data or duration exists) */}
                  {(event.endTime || hasData) && (
                    <div className="mt-2 flex items-center justify-between border-t border-canvas-subtle/50 pt-2">
                      <div className="flex gap-2">
                        {event.endTime && (
                          <span className="text-[10px] text-ink-tertiary flex items-center gap-1 font-medium">
                            <i className="far fa-clock text-[9px]"></i>
                            {Math.round(
                              (new Date(event.endTime).getTime() -
                                new Date(event.startTime).getTime()) /
                                60000
                            )}
                            m
                          </span>
                        )}
                      </div>

                      {hasData && (
                        <span className="text-[10px] font-black text-brand-600 flex items-center gap-1.5 hover:underline">
                          <i className="fas fa-database text-[9px]"></i>
                          VIEW DATA
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function TaskViewer({ currentUser }: { currentUser: string }) {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isSubmitted = useRef(false); // 👈 ADD THIS

  // 🟢 ACCESS GLOBAL CONTEXT (Refresh & Notification)
  const { refreshTasks, addNotification } = useOutletContext<GlobalContext>();

  // State
  const [taskData, setTaskData] = useState<any>(null);
  const [mainFormSchema, setMainFormSchema] = useState<any>(null);
  const [buttons, setButtons] = useState<ActionButton[]>([]);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [selectedFormKey, setSelectedFormKey] = useState("");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState("");

  // Tab State
  const activeTab = (searchParams.get("tab") as "form" | "history") || "form";
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionButton | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  // 🟢 NEW: Memoize submission and options
  const memoizedSubmission = useMemo(() => {
    return { data: taskData?.data };
  }, [taskData]);

  const memoizedOptions = useMemo(() => {
    return { noAlerts: true, readOnly: true };
  }, []);

  // 🟢 Helper to append context to notifications (Memoized)
  const getNotificationContext = useCallback(() => {
    const parts = [];
    if (taskData?.taskName) parts.push(`Task: "${taskData.taskName}"`);
    if (taskData?.businessKey) parts.push(`BK: ${taskData.businessKey}`);
    if (taskId) parts.push(`ID: ${taskId}`);
    return parts.length > 0 ? ` [ ${parts.join(" | ")} ]` : "";
  }, [taskData, taskId]);

  // ... (Keep makeCaseInsensitive, onFormReady, fixUrls) ...
  const makeCaseInsensitive = useCallback((item: any) => {
    if (!item || typeof item !== "object") return item;
    return new Proxy(item, {
      get: (target, prop) => {
        if (prop in target) return target[prop];
        if (typeof prop === "string") {
          const lowerProp = prop.toLowerCase();
          const actualKey = Object.keys(target).find(
            (k) => k.toLowerCase() === lowerProp
          );
          if (actualKey) return target[actualKey];
        }
        return undefined;
      },
    });
  }, []);

  // 🟢 UPDATED: Sync Auto-Selected Value back to React State
  const onFormReady = useCallback(
    (instance: any) => {
      const selectComponents: any[] = [];
      instance.everyComponent((comp: any) => {
        if (comp.component.type === "select") selectComponents.push(comp);
      });

      selectComponents.forEach((comp) => {
        const pollInterval = 100;
        const maxWait = 10000;
        let elapsedTime = 0;

        const intervalId = setInterval(() => {
          elapsedTime += pollInterval;

          if (comp.selectOptions && comp.selectOptions.length > 0) {
            comp.selectOptions = comp.selectOptions.map((opt: any) =>
              makeCaseInsensitive(opt)
            );

            if (comp.selectOptions.length === 1 && !comp.dataValue) {
              const firstOption = comp.selectOptions[0];
              const newValue = firstOption.value;

              // 1. Update Form.io Internal State
              comp.setValue(newValue);
              comp.triggerChange();

              // 🟢 2. Update React State to prevent reset on re-render
              setTaskData((prev: any) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  data: {
                    ...prev.data,
                    [comp.key]: newValue,
                  },
                };
              });
            }
            clearInterval(intervalId);
          }

          if (elapsedTime >= maxWait) clearInterval(intervalId);
        }, pollInterval);
      });
    },
    [makeCaseInsensitive]
  );

  const loadTask = useCallback(async () => {
    if (isSubmitted.current) return;
    try {
      setLoading(true);
      setTaskData(null);
      setMainFormSchema(null);
      setButtons([]);
      setHistory([]);
      setHistoryLoaded(false);
      setHistoryLoading(false);

      const data = await fetchTaskRender(taskId!);

      if (!data || !data.taskId) {
        throw new Error("Task not found");
      }

      setTaskData(data);
      let bpmnButtons = null;

      if (data.data && data.data.externalActions) {
        try {
          const rawVal = data.data.externalActions;
          bpmnButtons =
            typeof rawVal === "string" ? JSON.parse(rawVal) : rawVal;

          setButtons(bpmnButtons);
        } catch (e) {
          console.error("❌ Invalid JSON in externalActions variable", e);
        }
      }

      let schema = data.formSchema;
      if (!schema && data.formKey) {
        schema = await fetchFormSchema(data.formKey);
      }

      if (schema) {
        fixUrls(schema.components);
        setMainFormSchema(schema);

        if (!bpmnButtons) {
          const components = schema.components || [];
          const configComp = components.find(
            (c: any) => c.key === "externalActions"
          );
          if (configComp?.defaultValue) {
            const parsedButtons =
              typeof configComp.defaultValue === "string"
                ? JSON.parse(configComp.defaultValue)
                : configComp.defaultValue;
            setButtons(parsedButtons);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      // 🟢 UPDATED: Improved Error Handling using parseApiError
      const msg = parseApiError(err);
      const ctx = ` [ID: ${taskId}]`; // Cant use getNotificationContext here as taskData might be null

      if (err.response?.status === 404) {
        addNotification(`Task not found or already completed.${ctx}`, "error");
        navigate("/", { replace: true });
      } else {
        addNotification(`Failed to load task: ${msg}${ctx}`, "error");
      }
    } finally {
      setLoading(false);
    }
  }, [taskId, navigate, addNotification]);

  const loadHistory = useCallback(async () => {
    if (!taskData?.processInstanceId) return;
    setHistoryLoading(true);
    try {
      const historyData = await fetchProcessHistory(taskData.processInstanceId);
      setHistory(historyData);
      setHistoryLoaded(true);
    } catch (err: any) {
      console.error(err);
      // 🟢 UPDATED: Parse specific API error
      addNotification(
        `History unavailable: ${parseApiError(err)}${getNotificationContext()}`,
        "error"
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [taskData, getNotificationContext, addNotification]);

  const handleClaim = useCallback(async () => {
    if (!taskId || !taskData) return;
    setClaiming(true);
    try {
      await claimTask(taskId, currentUser);
      await loadTask();
      // 🟢 TRIGGER REFRESH in TaskList (Sidebar)
      refreshTasks();
      addNotification(
        `Task assigned to you successfully.${getNotificationContext()}`,
        "success"
      );
    } catch (err: any) {
      console.error(err);
      // 🟢 UPDATED: Handle 409 Conflict
      const msg = parseApiError(err);
      if (err.response?.status === 409) {
        addNotification(
          `Conflict: This task is already owned by another user.${getNotificationContext()}`,
          "error"
        );
      } else {
        addNotification(
          `Claim failed: ${msg}${getNotificationContext()}`,
          "error"
        );
      }
      navigate("/", { replace: true });
    } finally {
      setClaiming(false);
    }
  }, [
    taskId,
    taskData,
    currentUser,
    loadTask,
    refreshTasks,
    addNotification,
    getNotificationContext,
    navigate,
  ]);

  const handleActionClick = useCallback(async (btn: ActionButton) => {
    setSelectedAction(btn);
    setModalTitle(btn.label);
    setIsReadOnly(false);
    setSelectedFormKey(btn.targetForm);
    setSelectedSubmissionId(""); // Clear for action mode
    setShowModal(true);
  }, []);

  const handleViewHistory = useCallback(
    async (event: HistoryEvent) => {
      if (!event.formSubmissionId) return;

      setModalTitle(`View: ${event.taskName}`);
      setIsReadOnly(true);
      setSelectedAction(null);

      let formKey = event.formKey;
      if (!formKey) {
        const historicTaskData = await fetchTaskRender(event.taskId);
        formKey = historicTaskData?.formKey;
      }

      if (formKey) {
        setSelectedFormKey(formKey);
        setSelectedSubmissionId(event.formSubmissionId);
        setShowModal(true);
      } else {
        addNotification(
          `Form Key not found for history. [Task: ${event.taskName} | ID: ${event.taskId}]`,
          "error"
        );
      }
    },
    [addNotification]
  );

  const onSubFormSubmit = useCallback(
    async (submission: any) => {
      if (isReadOnly || !selectedAction || !taskId) return;
      setSubmitting(true);
      const payload = {
        action: selectedAction.action,
        formData: submission.data,
        submittedFormKey: selectedAction.targetForm,
        variables: selectedAction.variables || {},
      };
      try {
        await submitTask(taskId, payload);
        isSubmitted.current = true; // 🟢 1. NOTIFY USER (Custom Toast)
        addNotification(
          `Task Completed Successfully!${getNotificationContext()}`,
          "success"
        );

        // 🟢 2. TRIGGER REFRESH (Remove task from Sidebar)
        refreshTasks();

        // setShowModal(false);
        navigate("/", { replace: true });
      } catch (err: any) {
        // 🟢 UPDATED: Handle 422 Business Logic Errors (e.g. Email failure)
        const msg = parseApiError(err);
        if (err.response?.status === 422) {
          addNotification(`${msg}${getNotificationContext()}`, "error");
        } else {
          addNotification(
            `Submission failed: ${msg}${getNotificationContext()}`,
            "error"
          );
        }
      } finally {
        setSubmitting(false);
      }
    },
    [
      isReadOnly,
      selectedAction,
      taskId,
      addNotification,
      refreshTasks,
      navigate,
      getNotificationContext,
    ]
  );

  const handleTabChange = (tab: "form" | "history") => {
    setSearchParams({ tab });
    if (tab === "history" && !historyLoaded) {
      loadHistory();
    }
  };

  useEffect(() => {
    if (taskId) loadTask();
  }, [taskId, loadTask]);

  useEffect(() => {
    if (
      activeTab === "history" &&
      taskData?.processInstanceId &&
      !historyLoaded
    ) {
      loadHistory();
    }
  }, [activeTab, taskData, historyLoaded, loadHistory]);

  if (loading) {
    return (
      <div className="h-full w-full bg-canvas flex flex-col gap-6 p-6">
        <div className="h-40 bg-surface rounded-xl border border-canvas-active animate-pulse"></div>
        <div className="flex-1 bg-surface rounded-xl border border-canvas-active p-6">
          <FormSkeleton />
        </div>
      </div>
    );
  }

  const isUnassigned = !taskData?.assignee;

  return (
    <div className="h-full bg-canvas flex flex-col">
      <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6">
        <div className="bg-surface rounded-xl shadow-soft border border-canvas-subtle overflow-hidden flex flex-col min-h-[600px] relative">
          <TaskHeader taskData={taskData} />

          {!isUnassigned && (
            <ActionToolbar
              buttons={buttons}
              onActionClick={handleActionClick}
              disabled={isUnassigned}
            />
          )}

          <div className="px-6 pt-6 pb-2">
            <div className="inline-flex bg-canvas-subtle p-1 rounded-lg border border-canvas-active">
              <button
                onClick={() => handleTabChange("form")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === "form"
                    ? "bg-white text-brand-600 shadow-sm"
                    : "text-ink-tertiary hover:text-ink-secondary"
                }`}
              >
                <i className="far fa-file-alt mr-2"></i> Details
              </button>
              <button
                onClick={() => handleTabChange("history")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === "history"
                    ? "bg-white text-brand-600 shadow-sm"
                    : "text-ink-tertiary hover:text-ink-secondary"
                }`}
              >
                <i className="fas fa-history mr-2"></i> History
              </button>
            </div>
          </div>

          <div className="flex-1 p-6 relative">
            {/* 🟢 CHANGED: We use a wrapper div with display:block/none instead of 
                conditional rendering. This keeps the Form mounted so it doesn't 
                lose the autoselected values when switching tabs. */}
            <div
              style={{
                display: activeTab === "form" ? "block" : "none",
                height: "100%",
              }}
            >
              {/* Claim Overlay (Only visible if unassigned) */}
              {isUnassigned && (
                <ClaimTaskOverlay onClaim={handleClaim} claiming={claiming} />
              )}

              {/* The Form Itself */}
              <div
                className={`transition-opacity duration-300 ${
                  isUnassigned
                    ? "opacity-20 pointer-events-none filter blur-sm"
                    : "opacity-100"
                }`}
              >
                {mainFormSchema ? (
                  <Form
                    src={""}
                    key={taskId}
                    form={mainFormSchema}
                    onFormReady={onFormReady}
                    submission={memoizedSubmission} // Use memoized object
                    options={memoizedOptions} // Use memoized options
                  />
                ) : (
                  <NoFormState />
                )}
              </div>
            </div>

            {activeTab === "history" &&
              (historyLoading ? (
                <HistorySkeleton />
              ) : history.length === 0 ? (
                <div className="text-center py-20 text-ink-tertiary">
                  <i className="far fa-calendar-times text-4xl mb-4 opacity-50"></i>
                  <p>No history events recorded yet.</p>
                </div>
              ) : (
                <HistoryTimeline
                  history={history}
                  onViewEvent={handleViewHistory}
                />
              ))}
          </div>
        </div>
      </div>

      <SubmissionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalTitle}
        formKey={selectedFormKey}
        submissionId={selectedSubmissionId}
        initialData={{ data: taskData?.data }}
        isReadOnly={isReadOnly}
        onSubmit={onSubFormSubmit}
      />
    </div>
  );
}
