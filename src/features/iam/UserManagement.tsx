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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r, res] = await Promise.all([
        fetchTenantUsers(),
        fetchTenantRoles(),
        fetchTenantResources(),
      ]);

      // Map role names onto users for the DataGrid "Roles" column
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

      // Fetch inheritance map in parallel
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
    } catch {
      addNotification("Failed to load IAM data", "error");
    } finally {
      setLoading(false);
    }
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

  // ─── Render ─────────────────────────────────────────────────────────────

  const tabs: [IamTab, string, string][] = [
    ["users", "Users", "fa-users"],
    ["roles", "Roles", "fa-id-badge"],
    ["resources", "Resources", "fa-layer-group"],
    ["matrix", "Permissions", "fa-th"],
    ["audit", "Access View", "fa-eye"],
  ];

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
            {tabs.map(([t, label, icon]) => (
              <Pill key={t} active={tab === t} onClick={() => setTab(t)}>
                <i className={`fas ${icon} mr-1.5`} /> {label}
              </Pill>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      {tab === "users" && (
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
      )}

      {tab === "roles" && (
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
      )}

      {tab === "resources" && (
        <ResourcesTab
          resources={resources}
          loading={loading}
          saving={saving}
          setSaving={setSaving}
          onReload={load}
          onNotify={addNotification}
        />
      )}

      {tab === "matrix" && (
        <PermissionsMatrix
          roles={roles}
          resources={resources}
          loading={loading}
          initialRoleId={pendingRoleId}
          getEffectiveRoles={getEffectiveRoles}
          onNotify={addNotification}
        />
      )}

      {tab === "audit" && (
        <AuditView
          users={users}
          roles={roles}
          resources={resources}
          loading={loading}
          initialUserId={pendingUserId}
          onNotify={addNotification}
        />
      )}
    </div>
  );
}
