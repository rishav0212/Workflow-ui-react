import React, { useState, useEffect } from "react";
import {
  fetchTenantUsers,
  createTenantUser,
  deactivateTenantUser,
  fetchTenantRoles,
  createTenantRole,
  assignRoleToUser,
  fetchTenantResources,
  createTenantResource,
  fetchRolePermissions,
  grantPermission,
  revokePermission,
} from "./api";

export default function UserManagement({ addNotification }: any) {
  const [activeTab, setActiveTab] = useState<"users" | "roles" | "access">(
    "users",
  );

  // Data States
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);

  // Access Control States
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [rolePolicies, setRolePolicies] = useState<any[]>([]); // Casbin policies
  const [isMatrixLoading, setIsMatrixLoading] = useState(false);

  // Modals
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);
  const [showAssignRole, setShowAssignRole] = useState<{
    userId: string;
  } | null>(null);

  // Forms
  const [userForm, setUserForm] = useState({
    userId: "",
    email: "",
    firstName: "",
    lastName: "",
  });
  const [roleForm, setRoleForm] = useState({
    roleId: "",
    roleName: "",
    description: "",
  });
  const [assignRoleId, setAssignRoleId] = useState("");

  const loadData = async () => {
    try {
      const [u, r, res] = await Promise.all([
        fetchTenantUsers(),
        fetchTenantRoles(),
        fetchTenantResources(),
      ]);
      setUsers(u);
      setRoles(r);
      setResources(res);
    } catch (error) {
      addNotification("Failed to load IAM data", "error");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch policies when a role is clicked in the Access Matrix
  useEffect(() => {
    if (selectedRole) {
      setIsMatrixLoading(true);
      fetchRolePermissions(selectedRole)
        .then((policies) => setRolePolicies(policies))
        .catch(() => addNotification("Failed to load policies", "error"))
        .finally(() => setIsMatrixLoading(false));
    } else {
      setRolePolicies([]);
    }
  }, [selectedRole]);

  // Handle Form Submissions
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTenantUser({ ...userForm, metadata: {} });
      addNotification("User created successfully", "success");
      setShowAddUser(false);
      setUserForm({ userId: "", email: "", firstName: "", lastName: "" });
      loadData();
    } catch (err) {
      addNotification("Failed to create user", "error");
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTenantRole(roleForm);
      addNotification("Role created successfully", "success");
      setShowAddRole(false);
      setRoleForm({ roleId: "", roleName: "", description: "" });
      loadData();
    } catch (err) {
      addNotification("Failed to create role", "error");
    }
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAssignRole || !assignRoleId) return;
    try {
      await assignRoleToUser(showAssignRole.userId, assignRoleId);
      addNotification("Role assigned successfully", "success");
      setShowAssignRole(null);
      setAssignRoleId("");
    } catch (err) {
      addNotification("Failed to assign role", "error");
    }
  };

  // The Magic Toggle: Instantly updates the Backend Casbin Engine
  const togglePermission = async (
    resourceKey: string,
    action: string,
    currentlyHas: boolean,
  ) => {
    if (!selectedRole) return;
    try {
      if (currentlyHas) {
        await revokePermission({ roleId: selectedRole, resourceKey, action });
        setRolePolicies((prev) =>
          prev.filter((p) => !(p[2] === resourceKey && p[3] === action)),
        );
      } else {
        await grantPermission({ roleId: selectedRole, resourceKey, action });
        setRolePolicies((prev) => [
          ...prev,
          [selectedRole, "tenant", resourceKey, action],
        ]);
      }
      addNotification("Permission updated", "success");
    } catch (err) {
      addNotification("Failed to update permission", "error");
    }
  };

  // Helper to check if a role has a specific permission in our local Casbin policy state
  const hasPermission = (resourceKey: string, action: string) => {
    return rolePolicies.some(
      (policy) => policy[2] === resourceKey && policy[3] === action,
    );
  };

  return (
    <div className="h-full flex flex-col bg-canvas p-8 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-end mb-8 flex-shrink-0">
          <div>
            <h1 className="text-3xl font-serif font-bold text-ink-primary">
              Identity & Access
            </h1>
            <p className="text-ink-tertiary mt-1 font-medium">
              Manage your tenant's security, users, and roles.
            </p>
          </div>
          <div className="flex bg-surface p-1 rounded-xl shadow-sm border border-canvas-subtle">
            {["users", "roles", "access"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                  activeTab === tab
                    ? "bg-brand-500 text-white shadow-md"
                    : "text-neutral-500 hover:text-ink-primary hover:bg-canvas-subtle"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* --- USERS TAB --- */}
        {activeTab === "users" && (
          <div className="flex-1 bg-surface border border-canvas-subtle rounded-2xl shadow-soft flex flex-col overflow-hidden animate-fadeIn">
            <div className="p-6 border-b border-canvas-subtle flex justify-between items-center bg-canvas/30">
              <h2 className="text-lg font-bold text-ink-primary">
                User Directory
              </h2>
              <button
                onClick={() => setShowAddUser(true)}
                className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-600 transition-colors shadow-sm"
              >
                <i className="fas fa-plus mr-2"></i> New User
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-canvas-subtle text-xs uppercase tracking-wider text-neutral-500">
                    <th className="pb-3 font-bold">User</th>
                    <th className="pb-3 font-bold">Email</th>
                    <th className="pb-3 font-bold">Status</th>
                    <th className="pb-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.user_id}
                      className="border-b border-canvas-subtle hover:bg-canvas/50 transition-colors"
                    >
                      <td className="py-4">
                        <div className="font-bold text-ink-primary">
                          {u.first_name} {u.last_name}
                        </div>
                        <div className="text-xs text-neutral-400 font-mono mt-0.5">
                          {u.user_id}
                        </div>
                      </td>
                      <td className="py-4 text-sm text-neutral-600">
                        {u.email}
                      </td>
                      <td className="py-4">
                        {u.is_active ? (
                          <span className="px-2 py-1 bg-status-success/10 text-status-success text-xs font-bold rounded-md">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-status-error/10 text-status-error text-xs font-bold rounded-md">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() =>
                            setShowAssignRole({ userId: u.user_id })
                          }
                          className="text-brand-600 hover:text-brand-800 text-sm font-bold mr-4"
                        >
                          Assign Role
                        </button>
                        <button className="text-status-error hover:text-red-700 text-sm font-bold">
                          Deactivate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- ROLES TAB --- */}
        {activeTab === "roles" && (
          <div className="flex-1 bg-surface border border-canvas-subtle rounded-2xl shadow-soft flex flex-col overflow-hidden animate-fadeIn">
            <div className="p-6 border-b border-canvas-subtle flex justify-between items-center bg-canvas/30">
              <h2 className="text-lg font-bold text-ink-primary">
                Role Definitions
              </h2>
              <button
                onClick={() => setShowAddRole(true)}
                className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-600 transition-colors shadow-sm"
              >
                <i className="fas fa-plus mr-2"></i> New Role
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-canvas-subtle text-xs uppercase tracking-wider text-neutral-500">
                    <th className="pb-3 font-bold">Role Name</th>
                    <th className="pb-3 font-bold">Role ID (Key)</th>
                    <th className="pb-3 font-bold">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((r) => (
                    <tr
                      key={r.role_id}
                      className="border-b border-canvas-subtle hover:bg-canvas/50 transition-colors"
                    >
                      <td className="py-4 font-bold text-ink-primary">
                        {r.role_name}
                      </td>
                      <td className="py-4 text-sm font-mono text-neutral-500">
                        {r.role_id}
                      </td>
                      <td className="py-4 text-sm text-neutral-600 max-w-md truncate">
                        {r.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- ACCESS CONTROL MATRIX --- */}
        {activeTab === "access" && (
          <div className="flex-1 flex gap-6 overflow-hidden animate-fadeIn">
            {/* Roles Sidebar */}
            <div className="w-1/3 bg-surface border border-canvas-subtle rounded-2xl shadow-soft flex flex-col overflow-hidden">
              <div className="p-4 border-b border-canvas-subtle bg-canvas/30">
                <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500">
                  1. Select a Role
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {roles.map((r) => (
                  <button
                    key={r.role_id}
                    onClick={() => setSelectedRole(r.role_id)}
                    className={`w-full text-left p-4 rounded-xl mb-2 transition-all ${
                      selectedRole === r.role_id
                        ? "bg-brand-50 border border-brand-200 shadow-sm"
                        : "hover:bg-canvas-subtle border border-transparent"
                    }`}
                  >
                    <div
                      className={`font-bold ${selectedRole === r.role_id ? "text-brand-700" : "text-ink-primary"}`}
                    >
                      {r.role_name}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      {r.role_id}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Matrix Area */}
            <div className="flex-1 bg-surface border border-canvas-subtle rounded-2xl shadow-soft flex flex-col overflow-hidden relative">
              <div className="p-4 border-b border-canvas-subtle bg-canvas/30 flex justify-between items-center">
                <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500">
                  2. Configure Permissions
                </h2>
                {isMatrixLoading && (
                  <i className="fas fa-circle-notch fa-spin text-brand-500"></i>
                )}
              </div>

              {!selectedRole ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-canvas-subtle rounded-full flex items-center justify-center mb-4 text-neutral-400">
                    <i className="fas fa-hand-pointer text-2xl"></i>
                  </div>
                  <p className="text-neutral-500 font-medium">
                    Select a role from the left to view and edit its
                    permissions.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                  {resources.length === 0 ? (
                    <p className="text-neutral-500 text-sm">
                      No resources registered. Add resources via API.
                    </p>
                  ) : (
                    <div className="grid gap-4">
                      {resources.map((res) => (
                        <div
                          key={res.resource_key}
                          className="flex items-center justify-between p-4 border border-canvas-subtle rounded-xl hover:border-brand-200 transition-colors bg-white"
                        >
                          <div>
                            <div className="font-bold text-ink-primary flex items-center gap-2">
                              {res.display_name}
                              <span className="px-2 py-0.5 bg-canvas-subtle text-[10px] text-neutral-500 rounded uppercase font-bold tracking-wider">
                                {res.resource_type}
                              </span>
                            </div>
                            <div className="text-xs text-neutral-400 font-mono mt-1">
                              {res.resource_key}
                            </div>
                          </div>

                          <div className="flex gap-4">
                            {/* VIEW TOGGLE */}
                            <label className="flex items-center cursor-pointer group">
                              <span className="text-xs font-bold text-neutral-500 mr-2 group-hover:text-ink-primary transition-colors">
                                VIEW
                              </span>
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={hasPermission(
                                    res.resource_key,
                                    "view",
                                  )}
                                  onChange={() =>
                                    togglePermission(
                                      res.resource_key,
                                      "view",
                                      hasPermission(res.resource_key, "view"),
                                    )
                                  }
                                />
                                <div
                                  className={`block w-10 h-6 rounded-full transition-colors ${hasPermission(res.resource_key, "view") ? "bg-status-success" : "bg-neutral-300"}`}
                                ></div>
                                <div
                                  className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${hasPermission(res.resource_key, "view") ? "transform translate-x-4" : ""}`}
                                ></div>
                              </div>
                            </label>

                            {/* EXECUTE TOGGLE */}
                            <label className="flex items-center cursor-pointer group ml-4 pl-4 border-l border-canvas-subtle">
                              <span className="text-xs font-bold text-neutral-500 mr-2 group-hover:text-ink-primary transition-colors">
                                EXECUTE
                              </span>
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={hasPermission(
                                    res.resource_key,
                                    "execute",
                                  )}
                                  onChange={() =>
                                    togglePermission(
                                      res.resource_key,
                                      "execute",
                                      hasPermission(
                                        res.resource_key,
                                        "execute",
                                      ),
                                    )
                                  }
                                />
                                <div
                                  className={`block w-10 h-6 rounded-full transition-colors ${hasPermission(res.resource_key, "execute") ? "bg-brand-500" : "bg-neutral-300"}`}
                                ></div>
                                <div
                                  className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${hasPermission(res.resource_key, "execute") ? "transform translate-x-4" : ""}`}
                                ></div>
                              </div>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODALS (Simplified for brevity, implement as standard absolute overlays) */}
      {showAddUser && (
        <div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center z-50">
          <form
            onSubmit={handleCreateUser}
            className="bg-white p-8 rounded-2xl w-[400px] shadow-floating"
          >
            <h2 className="text-xl font-bold mb-6">Create New User</h2>
            <div className="space-y-4">
              <input
                required
                placeholder="User ID (e.g. jdoe123)"
                className="w-full border border-canvas-subtle p-3 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                value={userForm.userId}
                onChange={(e) =>
                  setUserForm({ ...userForm, userId: e.target.value })
                }
              />
              <input
                required
                type="email"
                placeholder="Email"
                className="w-full border border-canvas-subtle p-3 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                value={userForm.email}
                onChange={(e) =>
                  setUserForm({ ...userForm, email: e.target.value })
                }
              />
              <input
                required
                placeholder="First Name"
                className="w-full border border-canvas-subtle p-3 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                value={userForm.firstName}
                onChange={(e) =>
                  setUserForm({ ...userForm, firstName: e.target.value })
                }
              />
              <input
                required
                placeholder="Last Name"
                className="w-full border border-canvas-subtle p-3 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                value={userForm.lastName}
                onChange={(e) =>
                  setUserForm({ ...userForm, lastName: e.target.value })
                }
              />
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={() => setShowAddUser(false)}
                className="px-5 py-2 text-neutral-500 font-bold hover:bg-canvas-subtle rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-brand-500 text-white font-bold rounded-lg hover:bg-brand-600"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {showAddRole && (
        <div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center z-50">
          <form
            onSubmit={handleCreateRole}
            className="bg-white p-8 rounded-2xl w-[400px] shadow-floating"
          >
            <h2 className="text-xl font-bold mb-6">Create New Role</h2>
            <div className="space-y-4">
              <input
                required
                placeholder="Role ID (e.g. role_manager)"
                className="w-full border border-canvas-subtle p-3 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                value={roleForm.roleId}
                onChange={(e) =>
                  setRoleForm({ ...roleForm, roleId: e.target.value })
                }
              />
              <input
                required
                placeholder="Display Name (e.g. Manager)"
                className="w-full border border-canvas-subtle p-3 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                value={roleForm.roleName}
                onChange={(e) =>
                  setRoleForm({ ...roleForm, roleName: e.target.value })
                }
              />
              <textarea
                placeholder="Description"
                className="w-full border border-canvas-subtle p-3 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                value={roleForm.description}
                onChange={(e) =>
                  setRoleForm({ ...roleForm, description: e.target.value })
                }
              />
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={() => setShowAddRole(false)}
                className="px-5 py-2 text-neutral-500 font-bold hover:bg-canvas-subtle rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-brand-500 text-white font-bold rounded-lg hover:bg-brand-600"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {showAssignRole && (
        <div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center z-50">
          <form
            onSubmit={handleAssignRole}
            className="bg-white p-8 rounded-2xl w-[400px] shadow-floating"
          >
            <h2 className="text-xl font-bold mb-6">Assign Role</h2>
            <p className="text-sm text-neutral-500 mb-4">
              Assigning role to user:{" "}
              <span className="font-bold text-ink-primary">
                {showAssignRole.userId}
              </span>
            </p>
            <select
              required
              value={assignRoleId}
              onChange={(e) => setAssignRoleId(e.target.value)}
              className="w-full border border-canvas-subtle p-3 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none mb-8 bg-white cursor-pointer"
            >
              <option value="" disabled>
                Select a role...
              </option>
              {roles.map((r) => (
                <option key={r.role_id} value={r.role_id}>
                  {r.role_name}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAssignRole(null)}
                className="px-5 py-2 text-neutral-500 font-bold hover:bg-canvas-subtle rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-brand-500 text-white font-bold rounded-lg hover:bg-brand-600"
              >
                Assign
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
