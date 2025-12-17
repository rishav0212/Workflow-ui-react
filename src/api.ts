import axios from "axios";
axios.defaults.withCredentials = true;

const API_URL = "http://localhost:8080"; // src/api.ts
export const FORM_API = "http://localhost:8080/api/forms"; // Node (Data)
export interface ActionButton {
  label: string;
  action: string;
  targetForm: string;
  icon: string;
  color: string;
}
// 1. Fetch the Task & Main Config
export const fetchTaskRender = async (taskId: string) => {
  const res = await axios.get(`${API_URL}/api/workflow/tasks/${taskId}/render`);
  return res.data;
};

// 2. Fetch a Sub-Form Schema (for the Modal)
export const fetchFormSchema = async (formPath: string) => {
  // We call Form.io directly to get the JSON definition
  const res = await axios.get(`${FORM_API}/${formPath}`);
  return res.data;
};

// 3. Submit the Final Data to Spring Boot
export const submitTask = async (taskId: string, payload: any) => {
  return await axios.post(
    `${API_URL}/api/workflow/tasks/${taskId}/submit`,
    payload
  );
};
// Define Types
export interface Task {
  id: string;
  name: string;
  createTime: string;
  formKey?: string;
  businessKey?: string; // This links to your Submission ID
}

export interface Submission {
  id: number;
  type: string;
  data: any; // The JSONB data
}

export const fetchProcessHistory = async (processInstanceId: string) => {
  const res = await axios.get(
    `${API_URL}/api/workflow/process/${processInstanceId}/history`
  );
  return res.data;
};

// 2. Fetch Submission Data (The "Filled Form")
export const fetchSubmissionData = async (
  formKey: string,
  submissionId: string
) => {
  const res = await axios.get(
    `${FORM_API}/${formKey}/submission/${submissionId}`
  );
  return res.data;
};

// 1. Fetch Tasks
export const fetchTasks = async (assignee: string): Promise<Task[]> => {
  const res = await axios.get(
    `${API_URL}/process-api/runtime/tasks?assignee=${assignee}`
  );
  return res.data.data;
};

export const getTaskContext = async (taskId: string) => {
  // 1. Get Task Details (Auth handled by your Axios config or defaults)
  const taskRes = await axios.get(
    `${API_URL}/process-api/runtime/tasks/${taskId}`,
    {
      headers: { Authorization: "Basic " + btoa("admin:test") },
    }
  );

  let { formKey, businessKey, processInstanceId } = taskRes.data;

  // 2. Fallback: If Task has no businessKey, check the Process Instance
  if (!businessKey && processInstanceId) {
    try {
      const procRes = await axios.get(
        `${API_URL}/process-api/runtime/process-instances/${processInstanceId}`,
        { headers: { Authorization: "Basic " + btoa("admin:test") } }
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

// 1. Fetch Task View (HYBRID: Java for Task, Node for Data)
export const fetchTaskView = async (taskId: string) => {
  // A. Get Task Info from JAVA
  const taskRes = await axios.get(
    `${API_URL}/process-api/runtime/tasks/${taskId}`
  );

  let { formKey, businessKey, processInstanceId } = taskRes.data;

  // --- Fix: Fetch BusinessKey from Process if missing ---
  if (!businessKey && processInstanceId) {
    try {
      const procRes = await axios.get(
        `${API_URL}/process-api/runtime/process-instances/${processInstanceId}`
      );
      businessKey = procRes.data.businessKey;
    } catch (err) {
      console.warn("Could not fetch process instance details");
    }
  }

  if (!formKey) throw new Error("Task is missing formKey.");

  // B. Get Form Schema from NODE.JS
  // Form.io URL: GET /<formName>
  const formRes = await axios.get(`${FORM_API}/${formKey}`);

  // C. Get Submission Data from NODE.JS
  // Form.io URL: GET /<formName>/submission/<submissionId>
  let formData = {};
  if (businessKey) {
    try {
      const dataRes = await axios.get(
        `${FORM_API}/${formKey}/submission/${businessKey}`
      );
      formData = dataRes.data.data;
    } catch (err) {
      console.warn("No existing data found in Form Engine");
    }
  }

  return {
    schema: formRes.data, // Form.io returns the full schema object directly
    formData: formData,
    task: taskRes.data,
  };
};

// 2. Complete Task (Updated to accept Variables)
export const completeTask = async (taskId: string, variables: any[]) => {
  return axios.post(`${API_URL}/process-api/runtime/tasks/${taskId}`, {
    action: "complete",
    variables: variables, // Send the array: [{name: "abc", value: 1}, ...]
  });
};
export const saveSubmission = async (businessKey: string, data: any) => {
  // Calls the PUT endpoint in your Java Backend
  return axios.put(`${API_URL}/api/submissions/${businessKey}`, data);
};
export const saveFormSchema = async (formKey: string, fields: any[]) => {
  return axios.post(`${API_URL}/api/forms`, {
    formKey: formKey,
    description: "Created via Custom Builder",
    schemaJson: { fields: fields }, // We wrap the array in an object
  });
};
