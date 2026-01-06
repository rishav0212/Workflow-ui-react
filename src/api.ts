import axios from "axios";
import type { Task } from "./types";

const API_URL = "http://localhost:8080";
export const FORM_API = "http://localhost:8080/api/forms";

// --- 1. CREATE AXIOS INSTANCE ---
const api = axios.create({
  baseURL: API_URL,
});

// --- 2. THE JWT INTERCEPTOR (The Guard) ---
// This automatically grabs the token from storage and adds it to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("jwt_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- 3. THE 401 INTERCEPTOR (Auto Logout) ---
// If the server says "Token Expired", this logs the user out immediately
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

// --- 4. EXPORTED API FUNCTIONS ---

// Fetch the Task & Main Config
export const fetchTaskRender = async (taskId: string) => {
  const res = await api.get(`/api/workflow/tasks/${taskId}/render`);
  return res.data;
};

// Fetch a Sub-Form Schema (for the Modal)
export const fetchFormSchema = async (formPath: string) => {
  const res = await api.get(`/api/forms/${formPath}`); // Proxied through Spring Boot
  return res.data;
};

// Submit the Final Data to Spring Boot
export const submitTask = async (taskId: string, payload: any) => {
  return await api.post(`/api/workflow/tasks/${taskId}/submit`, payload);
};

export const fetchProcessHistory = async (processInstanceId: string) => {
  const res = await api.get(
    `/api/workflow/process/${processInstanceId}/history`
  );
  return res.data;
};

// Fetch Submission Data (The "Filled Form")
export const fetchSubmissionData = async (
  formKey: string,
  submissionId: string
) => {
  const res = await api.get(`/api/forms/${formKey}/submission/${submissionId}`);
  return res.data;
};

// Fetch Tasks for the Sidebar
export const fetchTasks = async (assignee: string): Promise<Task[]> => {
  // Use the flowable process-api directly
  const res = await api.get(
    `/process-api/runtime/tasks?assignee=${assignee}&size=1000`
  );
  return res.data.data;
};
const myRoles = ["rates-team", "management"];

export const fetchGroupTasks = async (
  userRoles: string[] = myRoles
): Promise<Task[]> => {
  const groupsString = userRoles.join(",");

  // Note: Standard Flowable simple GET might not support 'unassigned=true' combined easily without POST query.
  // Simple Fix: Fetch them, then filter in JavaScript before returning.
  const res = await api.get(
    `/process-api/runtime/tasks?candidateGroups=${groupsString}&size=1000`
  );

  // Filter: Only return tasks where assignee is NULL
  return res.data.data.filter((t: any) => !t.assignee);
};
// Fetch Task Context (Details about formKey and businessKey)
export const getTaskContext = async (taskId: string) => {
  const taskRes = await api.get(`/process-api/runtime/tasks/${taskId}`);
  let { formKey, businessKey, processInstanceId } = taskRes.data;

  if (!businessKey && processInstanceId) {
    try {
      const procRes = await api.get(
        `/process-api/runtime/process-instances/${processInstanceId}`
      );
      businessKey = procRes.data.businessKey;
    } catch (err) {
      console.warn("Could not fetch process instance details");
    }
  }

  if (!formKey) throw new Error("Task is missing formKey.");

  return {
    formKey,
    submissionId: businessKey,
    taskName: taskRes.data.name,
  };
};

// Complete Task (Direct Flowable API)
export const completeTask = async (taskId: string, variables: any[]) => {
  return api.post(`/process-api/runtime/tasks/${taskId}`, {
    action: "complete",
    variables: variables,
  });
};

export const saveSubmission = async (businessKey: string, data: any) => {
  return api.put(`/api/submissions/${businessKey}`, data);
};

export const claimTask = async (
  taskId: string,
  userId: string
): Promise<void> => {
  const payload = {
    action: "claim", // The magic keyword
    assignee: userId, // The ID to assign it to
  };

  await api.post(`/process-api/runtime/tasks/${taskId}`, payload);
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

// Updated src/api.ts using Native Flowable REST APIs
export const fetchAdminProcesses = async () => {
  // latest=true gives you the most recent version of each process
  const res = await api.get(
    "/process-api/repository/process-definitions?latest=true"
  );
  return res.data.data; // Flowable REST wraps results in a 'data' array
};

export const fetchProcessVersions = async (key: string) => {
  // Get all versions for a specific key, ordered by version descending
  const res = await api.get(
    `/process-api/repository/process-definitions?key=${key}&sort=version&order=desc`
  );
  return res.data.data;
};

export const fetchProcessXml = async (id: string) => {
  // resourcedata returns the actual BPMN XML string
  const res = await api.get(
    `/process-api/repository/process-definitions/${id}/resourcedata`
  );
  return res.data;
};

// --- src/api.ts ---

/**
 * Deploys a new BPMN process definition to Flowable.
 * Uses the native Flowable REST API.
 */
export const deployProcess = async (file: File, deploymentName: string) => {
  const formData = new FormData();
  // Flowable expects the file in the 'file' field
  formData.append("file", file);
  // Optional: Add a name for the deployment
  formData.append("deploymentName", deploymentName);

  const res = await api.post("/process-api/repository/deployments", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

// --- ADMIN: PROCESS INSTANCE MANAGEMENT ---
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
  // Flowable uses an array of variable objects for updates
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

// --- ADMIN: GLOBAL TASK SUPERVISION ---
export const fetchAllSystemTasks = async () => {
  // No assignee filter returns every task in the system
  const res = await api.get(
    "/process-api/runtime/tasks?size=1000&sort=createTime&order=desc"
  );
  return res.data.data;
};

export const reassignTask = async (taskId: string, userId: string) => {
  return await api.post(`/process-api/runtime/tasks/${taskId}`, {
    action: "delegate", // Or "assign" to change the permanent owner
    assignee: userId,
  });
};

export const updateTaskDueDate = async (taskId: string, dueDate: string) => {
  return await api.put(`/process-api/runtime/tasks/${taskId}`, {
    dueDate: dueDate,
  });
};

// --- ADMIN: SYSTEM-WIDE ANALYTICS ---
export const fetchSystemStats = async () => {
  const res = await api.get("/api/admin/stats/system-overview");
  return res.data;
};

// --- ADMIN: PATH VISUALIZATION ---
export const fetchHistoricActivities = async (processInstanceId: string) => {
  // Returns all steps taken by this specific instance
  const res = await api.get(
    `/process-api/history/historic-activity-instances?processInstanceId=${processInstanceId}&sort=startTime&order=asc`
  );
  return res.data.data;
};

export const fetchProcessInstance = async (processInstanceId: string) => {
  const res = await api.get(
    `/process-api/runtime/process-instances/${processInstanceId}`
  );
  return res.data;
};

// --- ADMIN: HISTORY MANAGEMENT ---

/**
 * Fetches historical process instances (Completed and Terminated).
 */
export const fetchHistoricProcessInstances = async (
  finished: boolean = true
) => {
  const res = await api.get(
    `/process-api/history/historic-process-instances?finished=${finished}&size=1000&sort=startTime&order=desc`
  );
  return res.data.data;
};

/**
 * Fetches historical task instances (Completed).
 */
export const fetchHistoricTasks = async () => {
  const res = await api.get(
    "/process-api/history/historic-task-instances?finished=true&size=1000&sort=endTime&order=desc"
  );
  return res.data.data;
};

// Add these to your existing src/api.ts

// --- JOB & INCIDENT MANAGEMENT ---
export const fetchJobs = async (
  type: "timer" | "executable" | "deadletter" | "suspended"
) => {
  const res = await api.get(
    `/process-api/management/jobs?type=${type}&size=1000`
  );
  return res.data.data;
};

export const moveJobToDeadLetter = async (jobId: string) => {
  return await api.post(`/process-api/management/jobs/${jobId}`, {
    action: "move",
  });
};

export const retryJob = async (jobId: string) => {
  // Moving from deadletter back to executable is effectively a retry
  return await api.post(`/process-api/management/jobs/${jobId}`, {
    action: "move",
  });
};

export const deleteJob = async (jobId: string) => {
  return await api.delete(`/process-api/management/jobs/${jobId}`);
};

// --- BATCH OPERATIONS ---
export const bulkReassignTasks = async (taskIds: string[], userId: string) => {
  // Standard Flowable REST requires individual calls if no custom batch endpoint exists
  return Promise.all(taskIds.map((id) => reassignTask(id, userId)));
};

export const bulkTerminateInstances = async (instanceIds: string[]) => {
  return Promise.all(instanceIds.map((id) => terminateProcessInstance(id)));
};

// --- VARIABLE AUDIT ---
export const fetchVariableHistory = async (processInstanceId: string) => {
  const res = await api.get(
    `/process-api/history/historic-variable-instances?processInstanceId=${processInstanceId}&sort=variableName`
  );
  return res.data.data;
};

// --- GOVERNANCE ---
export const suspendProcessDefinition = async (
  id: string,
  suspend: boolean
) => {
  return await api.put(`/process-api/repository/process-definitions/${id}`, {
    action: suspend ? "suspend" : "activate",
    includeProcessInstances: true, // Also suspends running instances
  });
};

export const deleteDeployment = async (deploymentId: string) => {
  return await api.delete(
    `/process-api/repository/deployments/${deploymentId}?cascade=true`
  );
};

// --- SIGNALS & MESSAGES ---
export const fireGlobalSignal = async (
  signalName: string,
  variables: any[] = []
) => {
  return await api.post("/process-api/runtime/signals", {
    signalName,
    variables,
  });
};

// --- DMN (DECISION TABLES) ---
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

// --- NEW GOD-MODE: GOVERNANCE & DMN ---
export const fetchDecisionTableXml = async (id: string) =>
  (await api.get(`/dmn-api/dmn-repository/decision-tables/${id}/resourcedata`))
    .data;


export const migrateProcessInstance = async (
  instanceId: string,
  targetDefinitionId: string
) => {
  return await api.post(
    `/process-api/runtime/process-instances/${instanceId}/migrate`, // Correct Endpoint
    { toProcessDefinitionId: targetDefinitionId } // Correct Key
  );
};
export default api;
