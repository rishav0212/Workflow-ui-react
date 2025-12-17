// src/types/index.ts
export interface User {
  username: string;
  email: string;
}

export interface Task {
  id: string;
  name: string;
  createTime: string;
  formKey?: string;
  businessKey?: string;
  processInstanceId?: string;
  assignee?: string;
  status?: "active" | "overdue" | "pending";
}

export interface ActionButton {
  label: string;
  action: string;
  targetForm: string; // The form key to load in the modal
  icon: string;
  color: string;
}

export interface HistoryEvent {
  taskId: string;
  taskName: string;
  status: string;
  startTime: string;
  endTime?: string;
  assignee?: string;
}