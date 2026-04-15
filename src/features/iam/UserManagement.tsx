// src/UserManagement.tsx
// This file is now a thin container. All tab logic lives in src/features/iam/.
// Total lines: ~150 vs original 1400+

import React, { useState, useEffect, useCallback } from "react";
import {
  fetchTenantUsers,
  fetchTenantRoles,
  fetchTenantResources,
  fetchRoleInheritance,
} from "./api";
import { Pill } from "./IamShared";
import UsersTab from "./UsersTab";
import RolesTab from "./RolesTab";
import ResourcesTab from "./ResourcesTab";
import PermissionsMatrix from "./PermissionsMatrix";
import AuditView from "./AuditView";
import { Secure } from "../../components/common/Secure";

export type IamTab = "users" | "roles" | "resources" | "matrix" | "audit";

const getInitialTab = (): IamTab => {
  const params = new URLSearchParams(window.location.search);
  const t = params.get("tab") as IamTab;
  return ["users", "roles", "resources", "matrix", "audit"].includes(t)
    ? t
    : "users";
};

export default function UserManagement({
  addNotification,
}: {
  addNotification: (msg: string, type: "success" | "error" | "info") => void;
}) {
  const [tab, setTabState] = useState<IamTab>(getInitialTab);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [roleInheritanceMap, setRoleInheritanceMap] = useState<
    Record<string, string[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Navigation target for cross-tab jumps (e.g. "View permissions for role X")
  const [pendingRoleId, setPendingRoleId] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const setTab = useCallback((t: IamTab) => {
    setTabState(t);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    window.history.pushState({}, "", url);
  }, []);

  // ─── Load all data ──────────────────────────────────────────────────────

  // ─── Load all data ──────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);

    // 1. Initialize empty arrays
    let u: any[] = [];
    let r: any[] = [];
    let res: any[] = [];

    // 2. Fetch individually so a 403 on one doesn't kill the others
    try {
      u = await fetchTenantUsers();
    } catch (e) {
      /* ignore or log */
    }
    try {
      r = await fetchTenantRoles();
    } catch (e) {
      /* ignore or log */
    }
    try {
      res = await fetchTenantResources();
    } catch (e) {
      /* ignore or log */
    }

    // 3. Map role names onto users for the DataGrid "Roles" column
    const usersWithRoles = u.map((user: any) => {
      const roleIds: string[] = user.roles || [];
      const roleNames = roleIds.map((id) => {
        const found = r.find((role: any) => role.role_id === id);
        return found ? found.role_name : id;
      });
      return { ...user, rolesStr: roleNames.join(", ") };
    });

    setUsers(usersWithRoles);
    setRoles(r);
    setResources(res);

    // 4. Fetch inheritance map in parallel ONLY for the roles we successfully loaded
    if (r.length > 0) {
      const inhMap: Record<string, string[]> = {};
      await Promise.all(
        r.map(async (role: any) => {
          try {
            inhMap[role.role_id] = await fetchRoleInheritance(role.role_id);
          } catch {
            inhMap[role.role_id] = [];
          }
        }),
      );
      setRoleInheritanceMap(inhMap);
    }

    setLoading(false);
  }, [addNotification]);
  useEffect(() => {
    load();
  }, [load]);

  // ─── Effective roles helper (needed by multiple tabs) ──────────────────

  const getEffectiveRoles = useCallback(
    (startRoles: string[]) => {
      const visited = new Set<string>();
      const stack = [...startRoles];
      while (stack.length > 0) {
        const curr = stack.pop()!;
        if (!visited.has(curr)) {
          visited.add(curr);
          (roleInheritanceMap[curr] || []).forEach((r) => stack.push(r));
        }
      }
      return Array.from(visited);
    },
    [roleInheritanceMap],
  );

  // ─── Cross-tab navigation handlers ────────────────────────────────────

  const handleViewAudit = (userId: string) => {
    setPendingUserId(userId);
    setTab("audit");
  };

  const handleEditPermissions = (roleId: string) => {
    setPendingRoleId(roleId);
    setTab("matrix");
  };

  // ─── Shared access-denied fallback ─────────────────────────────────────

  const AccessDeniedFallback = ({ message }: { message: string }) => (
    <div className="flex-1 flex items-center justify-center bg-canvas p-10">
      <div className="text-center">
        <div className="w-16 h-16 bg-status-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-lock text-status-error text-2xl"></i>
        </div>
        <h3 className="text-lg font-bold text-ink-primary mb-2">
          Access Denied
        </h3>
        <p className="text-sm text-ink-secondary">{message}</p>
      </div>
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-canvas">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 flex items-center justify-between border-b border-canvas-subtle bg-surface">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">
            Identity & Access
          </h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            Users, roles, and resource-level permissions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="w-9 h-9 rounded-xl border border-canvas-subtle text-neutral-500 hover:text-brand-600 hover:bg-brand-50 hover:border-brand-200 transition-all flex items-center justify-center bg-white shadow-sm"
            title="Refresh Data"
          >
            <i className={`fas fa-sync-alt ${loading ? "fa-spin" : ""}`} />
          </button>
          <div className="flex bg-canvas-subtle p-1 rounded-xl border border-canvas-subtle shadow-inner">
            {/* Users tab pill — only shown if user has module:users read */}
            <Secure resource="module:users" action="read">
              <Pill active={tab === "users"} onClick={() => setTab("users")}>
                <i className="fas fa-users mr-1.5" /> Users
              </Pill>
            </Secure>

            {/* Roles tab pill — only shown if user has module:access_control read */}
            <Secure resource="module:access_control" action="read">
              <Pill active={tab === "roles"} onClick={() => setTab("roles")}>
                <i className="fas fa-id-badge mr-1.5" /> Roles
              </Pill>
            </Secure>

            {/* Resources tab pill — only shown if user has module:access_control read */}
            <Secure resource="module:access_control" action="read">
              <Pill
                active={tab === "resources"}
                onClick={() => setTab("resources")}
              >
                <i className="fas fa-layer-group mr-1.5" /> Resources
              </Pill>
            </Secure>

            {/* Matrix/Permissions tab pill — only shown if user has module:access_control read */}
            <Secure resource="module:access_control" action="read">
              <Pill active={tab === "matrix"} onClick={() => setTab("matrix")}>
                <i className="fas fa-th mr-1.5" /> Permissions
              </Pill>
            </Secure>

            {/* Audit tab pill — only shown if user has module:access_control read */}
            <Secure resource="module:access_control" action="read">
              <Pill active={tab === "audit"} onClick={() => setTab("audit")}>
                <i className="fas fa-eye mr-1.5" /> Access View
              </Pill>
            </Secure>
          </div>
        </div>
      </div>

      {/* ── Tab content — each gated behind the same resource:action ── */}

      {tab === "users" && (
        <Secure
          resource="module:users"
          action="read"
          fallback={
            <AccessDeniedFallback message="You do not have permission to view users." />
          }
        >
          <UsersTab
            users={users}
            roles={roles}
            loading={loading}
            saving={saving}
            setSaving={setSaving}
            onReload={load}
            onViewAudit={handleViewAudit}
            onNotify={addNotification}
            getEffectiveRoles={getEffectiveRoles}
          />
        </Secure>
      )}

      {tab === "roles" && (
        <Secure
          resource="module:access_control"
          action="read"
          fallback={
            <AccessDeniedFallback message="You do not have permission to view roles." />
          }
        >
          <RolesTab
            roles={roles}
            loading={loading}
            saving={saving}
            setSaving={setSaving}
            roleInheritanceMap={roleInheritanceMap}
            onReload={load}
            onEditPermissions={handleEditPermissions}
            onNotify={addNotification}
            getEffectiveRoles={getEffectiveRoles}
          />
        </Secure>
      )}

      {tab === "resources" && (
        <Secure
          resource="module:access_control"
          action="read"
          fallback={
            <AccessDeniedFallback message="You do not have permission to view resources." />
          }
        >
          <ResourcesTab
            resources={resources}
            loading={loading}
            saving={saving}
            setSaving={setSaving}
            onReload={load}
            onNotify={addNotification}
          />
        </Secure>
      )}

      {tab === "matrix" && (
        <Secure
          resource="module:access_control"
          action="read"
          fallback={
            <AccessDeniedFallback message="You do not have permission to view the permissions matrix." />
          }
        >
          <PermissionsMatrix
            roles={roles}
            resources={resources}
            loading={loading}
            initialRoleId={pendingRoleId}
            getEffectiveRoles={getEffectiveRoles}
            onNotify={addNotification}
          />
        </Secure>
      )}

      {tab === "audit" && (
        <Secure
          resource="module:users"
          action="read"
          fallback={
            <AccessDeniedFallback message="You do not have permission to view access audit data." />
          }
        >
          <AuditView
            users={users}
            roles={roles}
            resources={resources}
            loading={loading}
            initialUserId={pendingUserId}
            onNotify={addNotification}
          />
        </Secure>
      )}
    </div>
  );
}
