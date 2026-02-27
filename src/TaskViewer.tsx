import { useEffect, useState, useCallback, useMemo, memo, useRef } from "react";
import {
  useNavigate,
  useParams,
  useSearchParams,
  useOutletContext,
  useLocation,
} from "react-router-dom";
import "formiojs/dist/formio.full.min.css";
import "bootstrap/dist/css/bootstrap.min.css";
// @ts-ignore
import { Form } from "@formio/react";
import api, {
  fetchTaskRender,
  fetchFormSchema,
  submitTask,
  claimTask,
  parseApiError,
} from "./api";
import SubmissionModal from "./SubmissionModal";
import { FORM_IO_API_URL } from "./config";
import type { HistoryEvent } from "./types";
import HistoryTimeline from "./components/process/HistoryTimeline";
import ProcessDiagram from "./components/process/ProcessDiagram";

// --- INTERFACE FOR OUTLET CONTEXT ---
interface GlobalContext {
  refreshTasks: () => void;
  addNotification: (msg: string, type: "success" | "error" | "info") => void;
}

const TABS = [
  { id: "form", label: "Details", icon: "far fa-file-alt" },
  { id: "history", label: "History", icon: "fas fa-history" },
  { id: "path", label: "Path", icon: "fas fa-map-signs" },
] as const;

type TabId = (typeof TABS)[number]["id"];
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

interface ActionButton {
  label: string;
  action: string;
  targetForm: string;
  icon: string;
  color: string;
  variables?: Record<string, any>;
}

// 🎨 ENHANCED: Refined Status Badges
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
      success:
        "bg-status-success/10 text-status-success border-status-success/20",
      warning: "bg-brand-50 text-brand-700 border-brand-200",
      error: "bg-status-error/10 text-status-error border-status-error/20",
      info: "bg-status-info/10 text-status-info border-status-info/20",
      neutral: "bg-canvas-subtle text-ink-secondary border-canvas-active",
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-soft ${styles[type]}`}
      >
        {icon && <i className={`${icon} text-[10px]`}></i>}
        {label}
      </span>
    );
  },
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
      <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1">
        {label}
      </span>
      <div className="flex items-center gap-2 text-sm text-ink-primary font-medium">
        <i className={`${icon} text-brand-500 text-xs w-4`}></i>
        <span className="truncate">{value}</span>
      </div>
    </div>
  ),
);

// 🎨 ENHANCED: Premium Form Skeleton
const FormSkeleton = memo(() => (
  <div className="space-y-6 p-1">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="space-y-2"
        style={{
          animationDelay: `${i * 100}ms`,
          opacity: 0,
          animation: "fadeIn 0.4s ease-out forwards",
        }}
      >
        <div className="h-4 bg-neutral-200 rounded w-32 animate-pulse"></div>
        <div className="h-10 bg-canvas-subtle rounded-lg border border-canvas-active animate-pulse"></div>
      </div>
    ))}
  </div>
));

// 🎨 ENHANCED: Refined Empty State
const NoFormState = memo(() => (
  <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-canvas-active rounded-xl bg-gradient-to-b from-canvas-subtle/50 to-canvas-subtle/30 m-6">
    <div className="w-16 h-16 bg-canvas-active rounded-2xl flex items-center justify-center mb-4 shadow-soft">
      <i className="fas fa-clipboard-list text-2xl text-neutral-400"></i>
    </div>
    <h3 className="text-lg font-serif font-bold text-ink-primary mb-1">
      No Details Available
    </h3>
    <p className="text-sm text-neutral-500 max-w-xs mx-auto">
      This task does not have a specific form attached to it.
    </p>
  </div>
));

// 🎨 ENHANCED: Premium Task Header
const TaskHeader = memo(({ taskData }: { taskData: any }) => {
  const isHighPriority = taskData?.priority > 50;

  return (
    <div className="bg-white p-6 border-b border-canvas-subtle">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center text-brand-600 shadow-brand-sm border border-brand-200">
            <i className="fas fa-layer-group text-xl"></i>
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-ink-primary leading-tight">
              {taskData?.taskName || "Loading Task..."}
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              ID:{" "}
              <span className="font-mono text-neutral-600">
                {taskData?.taskId || "N/A"}
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
        <div className="bg-canvas-subtle rounded-lg p-4 mb-5 border border-canvas-active">
          <p className="text-sm text-ink-primary leading-relaxed whitespace-pre-wrap">
            {taskData.description}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 pt-2">
        <DataField
          label="Business Key"
          value={taskData?.businessKey || "N/A"}
          icon="fas fa-hashtag"
        />
        <DataField
          label="Process"
          value={taskData?.processName || "Unknown"}
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

// 🎨 ENHANCED: Premium Action Toolbar
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
          "bg-brand-500 hover:bg-brand-600 text-white shadow-brand-md hover:shadow-brand-lg",
        success:
          "bg-status-success hover:bg-opacity-90 text-white shadow-lg hover:shadow-xl",
        warning:
          "bg-status-warning hover:bg-opacity-90 text-white shadow-lg hover:shadow-xl",
        danger:
          "bg-status-error hover:bg-opacity-90 text-white shadow-lg hover:shadow-xl",
        info: "bg-status-info hover:bg-opacity-90 text-white shadow-lg hover:shadow-xl",
      };
      return map[color] || map.primary;
    };

    if (buttons.length === 0) return null;

    return (
      <div className="sticky top-0 z-20 bg-white border-b border-canvas-subtle px-6 py-3 flex items-center justify-between shadow-soft">
        <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
          Available Actions
        </span>
        <div className="flex items-center gap-2">
          {primaryButtons.map((btn, idx) => (
            <button
              key={idx}
              disabled={disabled}
              onClick={() => onActionClick(btn)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${getBtnStyle(
                btn.color,
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
                className="flex items-center justify-center w-9 h-9 rounded-lg bg-canvas-subtle text-neutral-600 border border-canvas-active hover:bg-canvas-active hover:text-ink-primary transition-colors"
              >
                <i className="fas fa-ellipsis-v"></i>
              </button>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowMenu(false)}
                  ></div>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-floating border border-canvas-subtle overflow-hidden z-40 animate-slideDown">
                    {secondaryButtons.map((btn, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          onActionClick(btn);
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-ink-primary hover:bg-canvas-subtle hover:text-brand-600 flex items-center gap-3 transition-colors border-b border-canvas-subtle last:border-0"
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
  },
);

// 🎨 ENHANCED: Premium Claim Overlay
const ClaimTaskOverlay = memo(
  ({ onClaim, claiming }: { onClaim: () => void; claiming: boolean }) => (
    <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-b-xl animate-fadeIn">
      <div className="bg-white p-8 rounded-2xl shadow-floating border border-canvas-subtle max-w-sm w-full text-center">
        <div className="w-20 h-20 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce-slow border border-brand-100">
          <i className="fas fa-lock text-brand-500 text-3xl"></i>
        </div>
        <h3 className="text-xl font-serif font-bold text-ink-primary mb-2">
          Claim Required
        </h3>
        <p className="text-neutral-600 text-sm mb-6 leading-relaxed">
          You must assign this task to yourself before you can view the form
          details or take action.
        </p>
        <button
          onClick={onClaim}
          disabled={claiming}
          className="w-full py-3 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-brand-md hover:shadow-brand-lg transition-all duration-200 disabled:opacity-50"
        >
          {claiming ? (
            <>
              <i className="fas fa-circle-notch fa-spin mr-2"></i> Claiming...
            </>
          ) : (
            <>
              <i className="fas fa-hand-pointer mr-2"></i> Assign to Me
            </>
          )}
        </button>
      </div>
    </div>
  ),
);
// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function TaskViewer({ currentUser }: { currentUser: string }) {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isSubmitted = useRef(false);

  const { refreshTasks, addNotification } = useOutletContext<GlobalContext>();

  // State
  const [taskData, setTaskData] = useState<any>(null);
  const [taskVariables, setTaskVariables] = useState<Record<string, any>>({});
  const [mainFormSchema, setMainFormSchema] = useState<any>(null);
  const [buttons, setButtons] = useState<ActionButton[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [selectedFormKey, setSelectedFormKey] = useState("");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState("");

  // Tab State
  const activeTab = (searchParams.get("tab") as TabId) || "form";

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionButton | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const memoizedSubmission = useMemo(() => {
    return { data: taskData?.data };
  }, [taskData]);

  const memoizedOptions = useMemo(() => {
    return { noAlerts: true, readOnly: true };
  }, []);

  const getNotificationContext = useCallback(() => {
    const parts = [];
    if (taskData?.taskName) parts.push(`Task: "${taskData.taskName}"`);
    if (taskData?.businessKey) parts.push(`BK: ${taskData.businessKey}`);
    if (taskId) parts.push(`ID: ${taskId}`);
    return parts.length > 0 ? ` [ ${parts.join(" | ")} ]` : "";
  }, [taskData, taskId]);

  const makeCaseInsensitive = useCallback((item: any) => {
    if (!item || typeof item !== "object") return item;
    return new Proxy(item, {
      get: (target, prop) => {
        if (prop in target) return target[prop];
        if (typeof prop === "string") {
          const lowerProp = prop.toLowerCase();
          const actualKey = Object.keys(target).find(
            (k) => k.toLowerCase() === lowerProp,
          );
          if (actualKey) return target[actualKey];
        }
        return undefined;
      },
    });
  }, []);

  useEffect(() => {
    if (activeTab === "path" && contentRef.current) {
      // Small timeout to ensure DOM is ready
      setTimeout(() => {
        contentRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [activeTab]);

  const onFormReady = useCallback(
    (instance: any) => {
      const activeIntervals: number[] = [];

      instance.everyComponent((comp: any) => {
        if (comp.component.type === "select") {
          let elapsedTime = 0;
          const pollInterval = 100;
          const maxWait = 8000;

          const intervalId = setInterval(() => {
            elapsedTime += pollInterval;

            if (comp.selectOptions && comp.selectOptions.length > 0) {
              // Deduplicate options
              const uniqueOptionsMap = new Map();
              comp.selectOptions.forEach((opt: any) => {
                if (!opt?.value) return;
                const key =
                  typeof opt.value === "object"
                    ? opt.value.id || opt.value._id || JSON.stringify(opt.value)
                    : String(opt.value);
                if (!uniqueOptionsMap.has(key)) uniqueOptionsMap.set(key, opt);
              });

              const uniqueOptions = Array.from(uniqueOptionsMap.values());

              if (uniqueOptions.length === 1) {
                const newValue = uniqueOptions[0].value;
                const isValueEmpty =
                  !comp.dataValue ||
                  (typeof comp.dataValue === "object" &&
                    Object.keys(comp.dataValue).length === 0);

                if (isValueEmpty) {
                  console.log(
                    `🚀 Auto-filling & Refreshing Logic for: ${comp.key}`,
                  );

                  // 1. Set the value
                  comp.setValue(newValue, { modified: true });

                  // 2. IMPORTANT: Manually trigger the component change
                  comp.triggerChange();

                  // 3. THE MAGIC FIX: Tell the ROOT form to re-run all logic/queries
                  // This ensures dependent fields (like data.selectVal) see the new value.
                  instance.onChange(
                    {
                      data: instance.data,
                      changed: {
                        component: comp.component,
                        instance: comp,
                        value: newValue,
                      },
                    },
                    { forceUpdate: true },
                  );
                }
                clearInterval(intervalId);
              } else if (uniqueOptions.length > 1) {
                clearInterval(intervalId);
              }
            }

            if (elapsedTime >= maxWait) clearInterval(intervalId);
          }, pollInterval);

          activeIntervals.push(intervalId as any);
        }
      });

      // Cleanup intervals if user switches tasks before polling finishes
      return () => {
        activeIntervals.forEach((id) => clearInterval(id));
      };
    },
    [taskId], // Ensure this re-runs every time the taskId changes
  );

  const loadTask = useCallback(async () => {
    if (isSubmitted.current) return;
    try {
      setLoading(true);
      setTaskData(null);
      setMainFormSchema(null);
      setButtons([]);

      const data = await fetchTaskRender(taskId!);

      if (!data || !data.taskId) {
        throw new Error("Task not found");
      }

      setTaskData(data);
      setTaskVariables(data.data || {});
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
            (c: any) => c.key === "externalActions",
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
      const msg = parseApiError(err);
      const ctx = ` [ID: ${taskId}]`;

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

  const handleClaim = useCallback(async () => {
    if (!taskId || !taskData) return;
    setClaiming(true);
    try {
      await claimTask(taskId, currentUser);
      await loadTask();
      refreshTasks();
      addNotification(
        `Task assigned to you successfully.${getNotificationContext()}`,
        "success",
      );
    } catch (err: any) {
      console.error(err);
      const msg = parseApiError(err);
      if (err.response?.status === 409) {
        addNotification(
          `Conflict: This task is already owned by another user.${getNotificationContext()}`,
          "error",
        );
      } else {
        addNotification(
          `Claim failed: ${msg}${getNotificationContext()}`,
          "error",
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
    setSelectedSubmissionId("");
    setShowModal(true);
  }, []);

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
        isSubmitted.current = true;
        addNotification(
          `Task Completed Successfully!${getNotificationContext()}`,
          "success",
        );
        refreshTasks();
        navigate(
          {
            pathname: "/",
            search: location.search,
          },
          { replace: true },
        );
      } catch (err: any) {
        const msg = parseApiError(err);
        if (err.response?.status === 422) {
          addNotification(`${msg}${getNotificationContext()}`, "error");
        } else {
          addNotification(
            `Submission failed: ${msg}${getNotificationContext()}`,
            "error",
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
    ],
  );

  const handleTabChange = (tab: TabId) => {
    setSearchParams({ tab });
  };
  useEffect(() => {
    if (taskId) {
      // 1. Reset the submission lock so new tasks can load
      isSubmitted.current = false;

      setTaskData(null);
      setMainFormSchema(null);
      setButtons([]);

      loadTask();
    }
  }, [taskId, loadTask]);

  if (loading) {
    return (
      <div className="h-full w-full bg-canvas flex flex-col gap-6 p-6">
        <div className="h-40 bg-white rounded-xl border border-canvas-subtle animate-pulse shadow-soft"></div>
        <div className="flex-1 bg-white rounded-xl border border-canvas-subtle p-6 shadow-soft">
          <FormSkeleton />
        </div>
      </div>
    );
  }

  const isUnassigned = !taskData?.assignee;

  return (
    <div className="h-full bg-canvas flex flex-col">
      <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6">
        <div className="bg-white rounded-xl shadow-soft border border-canvas-subtle flex flex-col min-h-[600px] relative">
          <TaskHeader taskData={taskData} />

          {!isUnassigned && (
            <ActionToolbar
              buttons={buttons}
              onActionClick={handleActionClick}
              disabled={isUnassigned}
            />
          )}

          <div className="px-6 pt-6 pb-2">
            <div className="inline-flex bg-canvas-subtle p-1 rounded-lg border border-canvas-active shadow-soft">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as any)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center ${
                    activeTab === tab.id
                      ? "bg-white text-brand-600 shadow-sm"
                      : "text-neutral-600 hover:text-ink-primary"
                  }`}
                >
                  <i className={`${tab.icon} mr-2`}></i> {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div ref={contentRef} className="flex-1 p-8 relative">
            <div
              style={{
                display: activeTab === "form" ? "block" : "none",
                height: "100%",
              }}
            >
              {isUnassigned && (
                <ClaimTaskOverlay onClaim={handleClaim} claiming={claiming} />
              )}

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
                    key={`${taskId}_${activeTab}`}
                    form={mainFormSchema}
                    onFormReady={onFormReady}
                    submission={memoizedSubmission}
                    options={memoizedOptions}
                  />
                ) : (
                  <NoFormState />
                )}
              </div>
            </div>

            {activeTab === "history" && (
              <HistoryTimeline
                processInstanceId={taskData?.processInstanceId}
                // onViewEvent={handleViewHistory}
              />
            )}

            {activeTab === "path" && taskData?.processInstanceId && (
              // 🟢 FIXED: Use 'aspect-video' to auto-adjust height based on width
              // Added 'min-h-[500px]' to prevent it from being too short on small screens
              <div className="w-full aspect-video min-h-[600px] rounded-xl overflow-hidden border border-canvas-subtle shadow-inner bg-[#fafaf9] relative">
                <ProcessDiagram
                  processInstanceId={taskData.processInstanceId}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <SubmissionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalTitle}
        formKey={selectedFormKey}
        submissionId={selectedSubmissionId}
        initialData={{ data: taskVariables }}
        isReadOnly={isReadOnly}
        onSubmit={onSubFormSubmit}
        isSubmitting={submitting}
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
