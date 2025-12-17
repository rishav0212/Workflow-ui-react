import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
// @ts-ignore
import { Form } from "react-formio";
import {
  fetchTaskRender,
  fetchFormSchema,
  submitTask,
  fetchProcessHistory,
  fetchSubmissionData,
} from "./api"; // Ensure these are imported from your api.ts
import ProcessDiagram from "./ProcessDiagram";

// --- INTERFACES ---
interface ActionButton {
  label: string;
  action: string;
  targetForm: string;
  icon: string;
  color: string;
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

export default function TaskViewer() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  // Task State
  const [taskData, setTaskData] = useState<any>(null);
  const [buttons, setButtons] = useState<ActionButton[]>([]);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [activeFormSchema, setActiveFormSchema] = useState<any>(null);
  const [activeSubmission, setActiveSubmission] = useState<any>(null); // For viewing data
  const [isReadOnly, setIsReadOnly] = useState(false); // To lock the form

  // Action State
  const [selectedAction, setSelectedAction] = useState<ActionButton | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  // 1. Initial Load
  useEffect(() => {
    if (taskId) loadTask();
  }, [taskId]);

  const loadTask = async () => {
    try {
      const data = await fetchTaskRender(taskId!);
      setTaskData(data);

      // A. Parse Buttons
      const components = data.formSchema?.components || [];
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

      // B. Fetch History (Now that we have processInstanceId!)
      if (data.processInstanceId) {
        const historyData = await fetchProcessHistory(data.processInstanceId);
        setHistory(historyData);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load task.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Action Click (Active Task)
  const handleActionClick = async (btn: ActionButton) => {
    setSelectedAction(btn);
    setModalTitle(btn.label);
    setIsReadOnly(false); // Editable
    setActiveSubmission(null); // No existing data
    setSubmitting(false);
    setActiveFormSchema(null);
    setShowModal(true);

    try {
      const schema = await fetchFormSchema(btn.targetForm);
      setActiveFormSchema(schema);
    } catch (err) {
      alert(`Error loading form: ${btn.targetForm}`);
    }
  };

  // 3. Handle History Click (View Past Data)
  const handleViewHistory = async (event: HistoryEvent) => {
    if (!event.formKey || !event.formSubmissionId) return;

    setModalTitle(`View: ${event.taskName}`);
    setIsReadOnly(true); // Read Only Mode!
    setSelectedAction(null); // Not performing an action
    setActiveFormSchema(null);
    setShowModal(true);

    try {
      // Parallel Fetch: Schema + Data
      const [schema, submission] = await Promise.all([
        fetchFormSchema(event.formKey),
        fetchSubmissionData(event.formKey, event.formSubmissionId),
      ]);

      setActiveFormSchema(schema);
      setActiveSubmission({ data: submission.data }); // Load data into form
    } catch (err) {
      console.error(err);
      alert("Failed to load historical data.");
      setShowModal(false);
    }
  };

  // 4. Handle Submit (Only for Active Actions)
  const onSubFormSubmit = async (submission: any) => {
    if (isReadOnly || !selectedAction || !taskId) return;

    setSubmitting(true);
    const payload = {
      action: selectedAction.action,
      formData: submission.data,
      submittedFormKey: selectedAction.targetForm,
    };

    try {
      await submitTask(taskId, payload);
      alert("Task Completed!");
      setShowModal(false);
      navigate("/");
    } catch (err) {
      alert("Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper
  const getButtonColor = (color: string) => {
    const map: Record<string, string> = {
      primary: "bg-blue-600 hover:bg-blue-700 text-white",
      warning: "bg-yellow-500 hover:bg-yellow-600 text-white",
      success: "bg-green-600 hover:bg-green-700 text-white",
    };
    return map[color] || map.primary;
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row gap-6 p-6">
      {/* --- LEFT: MAIN TASK CARD --- */}
      <div className="flex-1 bg-white shadow-lg rounded-xl overflow-hidden h-fit">
        <div className="bg-slate-800 p-6 text-white">
          <h1 className="text-2xl font-bold">{taskData?.taskName}</h1>
          <p className="text-slate-400 text-sm">Case ID: {taskData?.leadId}</p>
        </div>

        <div className="p-8">
          <p className="text-gray-600 mb-6">{taskData?.description}</p>

          <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">
            Actions
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {buttons.map((btn, idx) => (
              <button
                key={idx}
                onClick={() => handleActionClick(btn)}
                className={`flex items-center justify-center gap-3 py-4 px-6 rounded-lg shadow transition-transform hover:-translate-y-1 ${getButtonColor(
                  btn.color
                )}`}
              >
                <i className={`${btn.icon} text-xl`}></i>
                <span className="font-medium">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* --- RIGHT: HISTORY TIMELINE --- */}
      <div className="w-full md:w-80 bg-white shadow-lg rounded-xl overflow-hidden h-fit">
        <div className="bg-slate-100 p-4 border-b">
          <h3 className="font-bold text-slate-700">Case History</h3>
        </div>
        <div className="p-4 max-h-[80vh] overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-gray-400 text-sm text-center">No history yet.</p>
          ) : (
            <div className="space-y-6 border-l-2 border-slate-200 ml-3 pl-6 relative">
              {history.map((event, idx) => (
                <div key={idx} className="relative">
                  {/* Timeline Dot */}
                  <span
                    className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 border-white ${
                      event.status === "COMPLETED"
                        ? "bg-green-500"
                        : "bg-blue-500"
                    }`}
                  ></span>

                  <p className="text-xs text-gray-400 mb-1">
                    {new Date(event.startTime).toLocaleDateString()}
                  </p>
                  <h4 className="font-bold text-gray-800 text-sm">
                    {event.taskName}
                  </h4>
                  <p className="text-xs text-gray-500">{event.status}</p>

                  {/* View Data Button */}
                  {event.formSubmissionId && (
                    <button
                      onClick={() => handleViewHistory(event)}
                      className="mt-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1 rounded border border-slate-300 transition"
                    >
                      <i className="fa fa-eye mr-1"></i> View Data
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL POPUP (Reusable) --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          ></div>

          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
              <h2 className="text-xl font-bold">{modalTitle}</h2>
              <button onClick={() => setShowModal(false)}>
                <i className="fa fa-times text-xl"></i>
              </button>
            </div>

            <div className="p-6">
              {!activeFormSchema ? (
                <div className="text-center p-10">Loading...</div>
              ) : (
                <Form
                  form={activeFormSchema}
                  submission={activeSubmission} // <--- Inject Data Here
                  readOnly={isReadOnly} // <--- Lock if viewing history
                  onSubmit={onSubFormSubmit}
                  options={{ noAlerts: true }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* {taskData?.processInstanceId && (
        <div className="mt-8 w-full bg-white rounded-xl shadow-lg overflow-hidden">
          <ProcessDiagram processInstanceId={taskData.processInstanceId} />
        </div>
      )} */}
    </div>
  );
}
