import api, { unwrapData } from "../api";

export interface ToolJetAppResponse {
    id: number;
    tooljetAppUuid: string;
    displayName: string;
    icon: string;
    sortOrder: number;
    visibilityCondition?: string;
}

export interface ToolJetAppRequest {
    tooljetAppUuid: string;
    displayName: string;
    icon?: string;
    visibilityCondition?: string;
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

export interface ToolJetOauthClientResponse {
    id: number;
    clientId: string;
    description?: string;
    createdAt: string;
}

export interface ToolJetOauthClientCreateRequest {
    description?: string;
}

export interface ToolJetOauthClientCreateResponse extends ToolJetOauthClientResponse {
    clientSecret: string;
}

export const fetchToolJetOauthClients = async (): Promise<ToolJetOauthClientResponse[]> => {
    const res = await api.get('/api/admin/tooljet-oauth-clients');
    return unwrapData(res);
};

export const createToolJetOauthClient = async (data: ToolJetOauthClientCreateRequest): Promise<ToolJetOauthClientCreateResponse> => {
    const res = await api.post('/api/admin/tooljet-oauth-clients', data);
    return unwrapData(res);
};

export const deleteToolJetOauthClient = async (clientId: string): Promise<void> => {
    await api.delete(`/api/admin/tooljet-oauth-clients/${clientId}`);
};

export interface ToolJetWorkspaceResponse {
    id: number;
    workspaceUuid: string;
    slug: string;
    viewerEmail: string;
    updatedAt: string;
}

export interface ToolJetWorkspaceUpdateRequest {
    workspaceUuid: string;
    slug: string;
    viewerEmail: string;
    viewerPassword?: string;
}

export const fetchToolJetWorkspace = async (): Promise<ToolJetWorkspaceResponse> => {
    const res = await api.get('/api/admin/tooljet-workspace');
    return unwrapData(res);
};

export const updateToolJetWorkspace = async (data: ToolJetWorkspaceUpdateRequest): Promise<ToolJetWorkspaceResponse> => {
    const res = await api.put('/api/admin/tooljet-workspace', data);
    return unwrapData(res);
};
