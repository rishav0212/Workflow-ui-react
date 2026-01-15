import axios from "axios";
import type { Task } from "./types";
// 🟢 Import Config
import { API_BASE_URL, FORM_IO_API_URL } from "./config";

// 🟢 Use Variable
const API_URL = API_BASE_URL;
export const FORM_API = FORM_IO_API_URL;

// --- 1. CREATE AXIOS INSTANCE ---
const api = axios.create({
  baseURL: API_URL,
});

// --- 2. THE JWT INTERCEPTOR ---
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("jwt_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- 3. THE 401 INTERCEPTOR ---
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("jwt_token");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

// 🟢 NEW: Error Parsing Helper
// This extracts the "message" field from your Spring Boot GlobalExceptionHandler
export const parseApiError = (error: any): string => {
  if (error.response) {
    // Server responded with a status code (4xx, 5xx)
    const data = error.response.data;

    // Check for your specific JSON structure: { message: "...", error: "...", status: "..." }
    if (data && data.message) {
      return data.message;
    }
    // Fallback for standard Spring errors
    if (data && data.error) {
      return data.error;
    }
  } else if (error.request) {
    // Request made but no response received (Network Error)
    return "Server unreachable. Please check your connection.";
  }
  // Something else happened
  return error.message || "An unexpected error occurred.";
};

// --- 4. EXPORTED API FUNCTIONS ---

export const fetchTaskRender = async (taskId: string) => {
  const res = await api.get(`/api/workflow/tasks/${taskId}/render`);
  return res.data;
};

export const fetchFormSchema = async (formPath: string) => {
  const res = await api.get(`/api/forms/${formPath}`);
  return res.data;
};

export const submitTask = async (taskId: string, payload: any) => {
  return await api.post(`/api/workflow/tasks/${taskId}/submit`, payload);
};

export const fetchProcessHistory = async (processInstanceId: string) => {
  const res = await api.get(
    `/api/workflow/process/${processInstanceId}/history`
  );
  return res.data;
};

export const fetchSubmissionData = async (
  formKey: string,
  submissionId: string
) => {
  const res = await api.get(`/api/forms/${formKey}/submission/${submissionId}`);
  return res.data;
};

export const fetchTasks = async (user: string): Promise<Task[]> => {
  // Using candidateOrAssigned is the standard way to fetch a user's full "Inbox"
  const res = await api.get(
    `/process-api/runtime/tasks?candidateOrAssigned=${user}&size=1000&sort=createTime&order=desc`
  );
  return res.data.data;
};

export const claimTask = async (
  taskId: string,
  userId: string
): Promise<void> => {
  // Use your custom endpoint which handles claims safely
  await api.post(`/api/workflow/claim-task?taskId=${taskId}`, null, {
    headers: { userId },
  });
};

// --- DASHBOARD API ---
export const fetchDashboardStats = async () => {
  const res = await api.get("/api/dashboard/stats");
  return res.data;
};

export const fetchCompletedTasks = async (
  page: number,
  size: number,
  search: string
) => {
  const res = await api.get(`/api/dashboard/completed`, {
    params: { page, size, search },
  });
  return res.data;
};

// --- ADMIN APIs (Kept as is) ---
export const fetchAdminProcesses = async () => {
  const res = await api.get(
    "/process-api/repository/process-definitions?latest=true"
  );
  return res.data.data;
};

export const fetchProcessVersions = async (key: string) => {
  const res = await api.get(
    `/process-api/repository/process-definitions?key=${key}&sort=version&order=desc`
  );
  return res.data.data;
};

export const fetchProcessXml = async (id: string) => {
  const res = await api.get(
    `/process-api/repository/process-definitions/${id}/resourcedata`
  );
  return res.data;
};

export const deployProcess = async (file: File, deploymentName: string) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("deploymentName", deploymentName);

  const res = await api.post("/process-api/repository/deployments", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const fetchProcessInstances = async () => {
  const res = await api.get("/process-api/runtime/process-instances?size=1000");
  return res.data.data;
};

export const terminateProcessInstance = async (id: string) => {
  return await api.delete(`/process-api/runtime/process-instances/${id}`);
};

export const fetchInstanceVariables = async (id: string) => {
  const res = await api.get(
    `/process-api/runtime/process-instances/${id}/variables`
  );
  return res.data;
};

export const updateInstanceVariable = async (
  processId: string,
  varName: string,
  value: any
) => {
  const payload = [
    {
      name: varName,
      value: value,
      type: typeof value === "number" ? "integer" : "string",
    },
  ];
  return await api.put(
    `/process-api/runtime/process-instances/${processId}/variables`,
    payload
  );
};

export const fetchAllSystemTasks = async (params = {}) => {
  const res = await api.get("/process-api/runtime/tasks", {
    params: { size: 10, sort: "createTime", order: "desc", ...params }
  });
  // Returning the whole object so we can access res.data.total
  return res.data; 
};

export const fetchHistoricTasks = async (params = {}) => {
  const res = await api.get("/process-api/history/historic-task-instances", {
    params: { finished: true, size: 10, sort: "endTime", order: "desc", ...params }
  });
  return res.data;
};
export const reassignTask = async (taskId: string, userId: string) => {
  return await api.post(`/process-api/runtime/tasks/${taskId}`, {
    action: "delegate",
    assignee: userId,
  });
};

export const updateTaskDueDate = async (taskId: string, dueDate: string) => {
  return await api.put(`/process-api/runtime/tasks/${taskId}`, {
    dueDate: dueDate,
  });
};

export const fetchSystemStats = async () => {
  const res = await api.get("/api/admin/stats/system-overview");
  return res.data;
};

export const fetchHistoricActivities = async (processInstanceId: string) => {
  const res = await api.get(
    `/process-api/history/historic-activity-instances?processInstanceId=${processInstanceId}&sort=startTime&order=asc`
  );
  return res.data.data;
};

export const fetchHistoricProcessInstances = async (
  finished: boolean = true
) => {
  const res = await api.get(
    `/process-api/history/historic-process-instances?finished=${finished}&size=1000&sort=startTime&order=desc`
  );
  return res.data.data;
};



export const fetchJobs = async (
  type: "timer" | "executable" | "deadletter" | "suspended"
) => {
  const res = await api.get(
    `/process-api/management/jobs?type=${type}&size=1000`
  );
  return res.data.data;
};

export const retryJob = async (jobId: string) => {
  return await api.post(`/process-api/management/jobs/${jobId}`, {
    action: "move",
  });
};

export const deleteJob = async (jobId: string) => {
  return await api.delete(`/process-api/management/jobs/${jobId}`);
};

export const bulkReassignTasks = async (taskIds: string[], userId: string) => {
  return Promise.all(taskIds.map((id) => reassignTask(id, userId)));
};

export const bulkTerminateInstances = async (instanceIds: string[]) => {
  return Promise.all(instanceIds.map((id) => terminateProcessInstance(id)));
};

export const fetchVariableHistory = async (processInstanceId: string) => {
  const res = await api.get(
    `/process-api/history/historic-variable-instances?processInstanceId=${processInstanceId}&sort=variableName`
  );
  return res.data.data;
};

export const suspendProcessDefinition = async (
  id: string,
  suspend: boolean
) => {
  return await api.put(`/process-api/repository/process-definitions/${id}`, {
    action: suspend ? "suspend" : "activate",
    includeProcessInstances: true,
  });
};

export const deleteDeployment = async (deploymentId: string) => {
  return await api.delete(
    `/process-api/repository/deployments/${deploymentId}?cascade=true`
  );
};

export const fireGlobalSignal = async (
  signalName: string,
  variables: any[] = []
) => {
  return await api.post("/process-api/runtime/signals", {
    signalName,
    variables,
  });
};

export const fetchDecisionTables = async () => {
  const res = await api.get("/dmn-api/dmn-repository/decision-tables");
  return res.data.data;
};

export const fetchHistoricActivitiesForDefinition = async (
  definitionId: string
) =>
  (
    await api.get(
      `/process-api/history/historic-activity-instances?processDefinitionId=${definitionId}&size=5000`
    )
  ).data.data;

export const fetchDecisionTableXml = async (id: string) =>
  (await api.get(`/dmn-api/dmn-repository/decision-tables/${id}/resourcedata`))
    .data;

export const migrateProcessInstance = async (
  instanceId: string,
  targetDefinitionId: string
) => {
  return await api.post(
    `/process-api/runtime/process-instances/${instanceId}/migrate`,
    { toProcessDefinitionId: targetDefinitionId }
  );
};
export const updateTaskActions = async (
  processKey: string,
  taskKey: string,
  actionsJson: string
) => {
  return await api.post(
    `/api/admin/add-static-buttons`,
    actionsJson, // Send raw string
    {
      params: {
        processDefinitionKey: processKey,
        taskDefinitionKey: taskKey,
      },
      headers: {
        "Content-Type": "text/plain", // Important: Backend expects String body
      },
    }
  );
};
export const fetchAllForms = async () => {
  // type=form -> Excludes 'resources' (like User, Submission data definitions)
  // limit=1000 -> Overrides default 10 items per page limit
  // select=... -> Optimization: Only fetch fields we need for the dropdown
  const res = await api.get(
    "/api/forms/form?type=form&limit=1000&select=_id,title,path,name,key"
  );

  // Normalize response
  return Array.isArray(res.data) ? res.data : res.data.forms || [];
};
export default api;
