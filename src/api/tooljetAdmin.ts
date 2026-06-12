import api, { unwrapData } from "../api";

export interface ToolJetAppResponse {
    id: number;
    tooljetAppUuid: string;
    displayName: string;
    icon: string;
    sortOrder: number;
}

export interface ToolJetAppRequest {
    tooljetAppUuid: string;
    displayName: string;
    icon?: string;
}

export const fetchAdminToolJetApps = async (): Promise<ToolJetAppResponse[]> => {
    const res = await api.get('/api/admin/tooljet-apps');
    return unwrapData(res);
};

export const createToolJetApp = async (data: ToolJetAppRequest): Promise<ToolJetAppResponse> => {
    const res = await api.post('/api/admin/tooljet-apps', data);
    return unwrapData(res);
};

export const updateToolJetApp = async (id: number, data: ToolJetAppRequest): Promise<ToolJetAppResponse> => {
    const res = await api.put(`/api/admin/tooljet-apps/${id}`, data);
    return unwrapData(res);
};

export const deleteToolJetApp = async (id: number): Promise<void> => {
    await api.delete(`/api/admin/tooljet-apps/${id}`);
};

export const reorderToolJetApps = async (orderedIds: number[]): Promise<void> => {
    await api.put('/api/admin/tooljet-apps/reorder', { orderedIds });
};
