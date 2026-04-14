import api, { unwrapData } from "../../api";

// ─── USERS ────────────────────────────────────────────────────────

export const fetchTenantUsers = async () =>
  unwrapData(await api.get("/api/tenant/admin/users"));

export const createTenantUser = async (payload: any) =>
  await api.post("/api/tenant/admin/users", payload);

export const updateTenantUser = async (userId: string, payload: any) =>
  await api.put(`/api/tenant/admin/users/${userId}`, payload);

// Calls the dedicated deactivate endpoint defined in UserController
export const deactivateTenantUser = async (userId: string) =>
  await api.put(`/api/tenant/admin/users/${userId}/deactivate`);

// Calls the dedicated reactivate endpoint defined in UserController
export const reactivateTenantUser = async (userId: string) =>
  await api.put(`/api/tenant/admin/users/${userId}/reactivate`);

export const deleteTenantUser = async (userId: string) =>
  await api.delete(`/api/tenant/admin/users/${userId}`);

// ─── USER ROLES & ACCESS ──────────────────────────────────────────

export const fetchUserRoles = async (userId: string): Promise<string[]> =>
  unwrapData(await api.get(`/api/tenant/admin/users/${userId}/roles`));

export const assignRoleToUser = async (userId: string, roleId: string) =>
  await api.post(`/api/tenant/admin/users/${userId}/roles/${roleId}`);

export const removeRoleFromUser = async (userId: string, roleId: string) =>
  await api.delete(`/api/tenant/admin/users/${userId}/roles/${roleId}`);

export const fetchUserEffectiveAccess = async (userId: string) =>
  unwrapData(
    await api.get(`/api/tenant/admin/users/${userId}/effective-access`),
  );

// ─── ROLES ────────────────────────────────────────────────────────

export const fetchTenantRoles = async () =>
  unwrapData(await api.get("/api/tenant/admin/roles"));

export const createTenantRole = async (payload: any) =>
  await api.post("/api/tenant/admin/roles", payload);

export const updateTenantRole = async (roleId: string, payload: any) =>
  await api.put(`/api/tenant/admin/roles/${roleId}`, payload);

export const deleteTenantRole = async (roleId: string) =>
  await api.delete(`/api/tenant/admin/roles/${roleId}`);

// ─── ROLE INHERITANCE ─────────────────────────────────────────────

export const fetchRoleInheritance = async (roleId: string): Promise<string[]> =>
  unwrapData(await api.get(`/api/tenant/admin/roles/${roleId}/inherits`));

export const addRoleInheritance = async (
  roleId: string,
  inheritsRoleId: string,
) =>
  await api.post(
    `/api/tenant/admin/roles/${roleId}/inherits/${inheritsRoleId}`,
  );

export const removeRoleInheritance = async (
  roleId: string,
  inheritsRoleId: string,
) =>
  await api.delete(
    `/api/tenant/admin/roles/${roleId}/inherits/${inheritsRoleId}`,
  );

// ─── ROLE PERMISSIONS ─────────────────────────────────────────────

// Corrected route to match RoleController's @GetMapping("/{roleId}/permissions")
export const fetchRolePermissions = async (roleId: string) =>
  unwrapData(await api.get(`/api/tenant/admin/roles/${roleId}/permissions`));

// ─── RESOURCES ────────────────────────────────────────────────────

export const fetchTenantResources = async () =>
  unwrapData(await api.get("/api/tenant/admin/resources"));

export const createTenantResource = async (payload: any) =>
  await api.post("/api/tenant/admin/resources", payload);

export const deleteTenantResource = async (resourceKey: string) =>
  await api.delete(`/api/tenant/admin/resources/${resourceKey}`);

export const addCustomActionToResource = async (
  resourceKey: string,
  payload: { actionName: string; description: string },
) =>
  await api.post(`/api/tenant/admin/resources/${resourceKey}/actions`, payload);

// Permissions (resource matrix view — accessible to all users)
export const fetchResourcePermissions = async (resourceKey: string) =>
  unwrapData(await api.get(`/api/permissions/resource/${resourceKey}`));

// ─── GRANT / REVOKE (adminin Only) ──────────────────────────────────

export const grantPermission = async (payload: {
  roleId: string;
  resourceKey: string;
  action: string;
}) =>
  await api.post("/api/tenant/admin/permissions/grant", {
    roleId: payload.roleId,
    resource: payload.resourceKey, // backend expects "resource" not "resourceKey"
    action: payload.action,
  });

export const revokePermission = async (payload: {
  roleId: string;
  resourceKey: string;
  action: string;
}) =>
  // The backend PermissionController explicitly defines revoke as a POST method
  // to avoid issues with some HTTP clients stripping the body from DELETE requests.
  await api.post("/api/tenant/admin/permissions/revoke", {
    roleId: payload.roleId,
    resource: payload.resourceKey,
    action: payload.action,
  });

export default api;
