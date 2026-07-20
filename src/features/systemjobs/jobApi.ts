import api from "../../api";

export const fetchAdminTimers = async () => {
  const res = await api.get('/api/admin/jobs/timers');
  return res.data;
};

export const fetchAdminDeadLetters = async () => {
  const res = await api.get('/api/admin/jobs/deadletter');
  return res.data;
};

export const fetchAdminActiveJobs = async () => {
  const res = await api.get('/api/admin/jobs/active');
  return res.data;
};

export const retryAdminDeadLetter = async (id: string) => {
  const res = await api.post(`/api/admin/jobs/deadletter/${id}/retry`);
  return res.data;
};

export const fetchJobs = async (
  type: "timer" | "executable" | "deadletter" | "suspended",
) => {
  // Route to the new highly secure custom API endpoints!
  if (type === "deadletter") {
    return (await fetchAdminDeadLetters()).data;
  }
  if (type === "timer") {
    return (await fetchAdminTimers()).data;
  }
  if (type === "executable") {
    return (await fetchAdminActiveJobs()).data;
  }

  // Fallback for suspended
  const res = await api.get(
    `/process-api/management/jobs?type=${type}&size=100000`,
  );
  return res.data.data;
};

export const retryJob = async (jobId: string) => {
  // Use our secure retry endpoint
  return await retryAdminDeadLetter(jobId);
};

export const deleteJob = async (jobId: string) => {
  return await api.delete(`/process-api/management/jobs/${jobId}`);
};
