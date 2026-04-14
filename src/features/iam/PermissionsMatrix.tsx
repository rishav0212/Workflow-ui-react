// src/features/iam/PermissionsMatrix.tsx
import React, { useState } from "react";
import {
  grantPermission,
  revokePermission,
  fetchResourcePermissions,
  fetchRolePermissions,
} from "./api";
import { EmptyState, SearchInput, Spinner, Toggle } from "./IamShared";
import {
  getDynamicActions,
  ORDERED_TYPES,
  RESOURCE_TYPES,
} from "./iam-constants";

interface PermissionsMatrixProps {
  roles: any[];
  resources: any[];
  loading: boolean;
  initialRoleId?: string | null;
  getEffectiveRoles: (startRoles: string[]) => string[];
  onNotify: (msg: string, type: "success" | "error" | "info") => void;
}

export default function PermissionsMatrix({
  roles,
  resources,
  loading,
  initialRoleId,
  getEffectiveRoles,
  onNotify,
}: PermissionsMatrixProps) {
  const [matrixMode, setMatrixMode] = useState<"byRole" | "byResource">(
    "byRole",
  );
  const [matrixRole, setMatrixRole] = useState<string | null>(
    initialRoleId ?? null,
  );
  const [matrixResource, setMatrixResource] = useState<string | null>(null);
  const [rolePolicies, setRolePolicies] = useState<any[]>([]);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [resourceSearch, setResourceSearch] = useState("");

  const loadByRole = async (roleId: string) => {
    setMatrixRole(roleId);
    setMatrixLoading(true);
    try {
      const effective = getEffectiveRoles([roleId]);
      const arrays = await Promise.all(
        effective.map((r) => fetchRolePermissions(r)),
      );
      setRolePolicies(arrays.flat());
    } catch {
      onNotify("Failed to load permissions", "error");
    } finally {
      setMatrixLoading(false);
    }
  };

  const loadByResource = async (resourceKey: string) => {
    setMatrixResource(resourceKey);
    setMatrixLoading(true);
    try {
      const policies = await fetchResourcePermissions(resourceKey);
      setRolePolicies(policies);
    } catch {
      onNotify("Failed to load resource permissions", "error");
    } finally {
      setMatrixLoading(false);
    }
  };

  const hasPerm = (roleId: string, resourceKey: string, action: string) =>
    rolePolicies.some(
      (p) => p[0] === roleId && p[2] === resourceKey && p[3] === action,
    );

  const hasInheritedPerm = (
    roleId: string,
    resourceKey: string,
    action: string,
  ) => {
    const effective = getEffectiveRoles([roleId]).filter((r) => r !== roleId);
    return effective.some((effRoleId) =>
      rolePolicies.some(
        (p) => p[0] === effRoleId && p[2] === resourceKey && p[3] === action,
      ),
    );
  };

  const togglePerm = async (
    roleId: string,
    resourceKey: string,
    action: string,
    hasDirect: boolean,
  ) => {
    if (!roleId || !resourceKey) return;
    const k = `${roleId}:${resourceKey}:${action}`;
    if (toggling.has(k)) return;
    setToggling((prev) => new Set(prev).add(k));
    try {
      if (hasDirect) {
        await revokePermission({ roleId, resourceKey, action });
        setRolePolicies((prev) =>
          prev.filter(
            (p) =>
              !(p[0] === roleId && p[2] === resourceKey && p[3] === action),
          ),
        );
      } else {
        await grantPermission({ roleId, resourceKey, action });
        setRolePolicies((prev) => [
          ...prev,
          [roleId, "tenant", resourceKey, action],
        ]);
      }
    } catch {
      onNotify("Failed to update permission", "error");
    } finally {
      setToggling((prev) => {
        const s = new Set(prev);
        s.delete(k);
        return s;
      });
    }
  };

  const filteredResources = resources.filter((r) =>
    `${r.resource_key} ${r.display_name ?? ""}`
      .toLowerCase()
      .includes(resourceSearch.toLowerCase()),
  );

  const byType = filteredResources.reduce<Record<string, any[]>>((acc, r) => {
    (acc[r.resource_type] ??= []).push(r);
    return acc;
  }, {});

  const typesToRender = Array.from(
    new Set([...ORDERED_TYPES, ...Object.keys(byType)]),
  ).filter((t) => byType[t]?.length);

  return (
    <div className="flex-1 flex flex-col overflow-hidden m-4">
      <div className="flex items-center justify-center mb-4 flex-shrink-0">
        <div className="bg-canvas-subtle p-1 rounded-xl border border-canvas-subtle flex shadow-inner">
          <button
            onClick={() => setMatrixMode("byRole")}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${matrixMode === "byRole" ? "bg-white text-brand-600 shadow-soft" : "text-neutral-500 hover:text-ink-primary"}`}
          >
            <i className="fas fa-id-badge mr-2" /> Group by Role
          </button>
          <button
            onClick={() => setMatrixMode("byResource")}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${matrixMode === "byResource" ? "bg-white text-brand-600 shadow-soft" : "text-neutral-500 hover:text-ink-primary"}`}
          >
            <i className="fas fa-layer-group mr-2" /> Group by Resource
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Selector sidebar */}
        <div className="w-96 bg-surface border border-canvas-subtle rounded-2xl shadow-soft flex flex-col overflow-hidden flex-shrink-0">
          <div className="px-4 py-3 border-b border-canvas-subtle bg-canvas/40 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
              Select {matrixMode === "byRole" ? "Role" : "Resource"}
            </p>
            {matrixMode === "byResource" && (
              <SearchInput
                value={resourceSearch}
                onChange={setResourceSearch}
                placeholder="Filter..."
              />
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading && (
              <div className="flex justify-center pt-8">
                <Spinner />
              </div>
            )}
            {matrixMode === "byRole" &&
              roles.map((r) => (
                <button
                  key={r.role_id}
                  onClick={() => loadByRole(r.role_id)}
                  className={`w-full text-left px-3 py-3 rounded-xl mb-1 transition-all border ${matrixRole === r.role_id ? "bg-brand-50 border-brand-200" : "border-transparent hover:bg-canvas-subtle"}`}
                >
                  <div
                    className={`font-bold text-sm ${matrixRole === r.role_id ? "text-brand-700" : "text-ink-primary"}`}
                  >
                    {r.role_name}
                  </div>
                  <div className="text-xs text-neutral-400 font-mono mt-0.5">
                    {r.role_id}
                  </div>
                </button>
              ))}
            {matrixMode === "byResource" &&
              filteredResources.map((res) => (
                <button
                  key={res.resource_key}
                  onClick={() => loadByResource(res.resource_key)}
                  className={`w-full text-left px-3 py-3 rounded-xl mb-1 transition-all border ${matrixResource === res.resource_key ? "bg-brand-50 border-brand-200" : "border-transparent hover:bg-canvas-subtle"}`}
                >
                  <div
                    className={`font-bold text-sm truncate ${matrixResource === res.resource_key ? "text-brand-700" : "text-ink-primary"}`}
                  >
                    {res.display_name || res.resource_key}
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono mt-0.5 truncate">
                    {res.resource_key}
                  </div>
                </button>
              ))}
          </div>
        </div>

        {/* Permissions panel */}
        <div className="flex-1 bg-surface border border-canvas-subtle rounded-2xl shadow-soft flex flex-col overflow-hidden min-w-0">
          <div className="px-5 py-3 border-b border-canvas-subtle bg-canvas/40 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                Permissions Manager
              </p>
              {matrixLoading && <Spinner />}
            </div>
          </div>

          {matrixMode === "byRole" && !matrixRole && (
            <EmptyState
              icon="fa-hand-pointer"
              title="Select a role"
              sub="Then toggle permissions for resources"
            />
          )}
          {matrixMode === "byResource" && !matrixResource && (
            <EmptyState
              icon="fa-hand-pointer"
              title="Select a resource"
              sub="Then assign it to roles"
            />
          )}

          {matrixMode === "byRole" && matrixRole && (
            <div className="flex-1 overflow-y-auto">
              {typesToRender.map((type) => {
                const typeInfo = RESOURCE_TYPES.find(
                  (r) => r.value === type,
                ) || { icon: "fa-cube", label: type };
                return (
                  <div key={type}>
                    <div className="px-5 py-2 bg-canvas-subtle/70 border-y border-canvas-subtle sticky top-0 z-10 flex items-center gap-2">
                      <i
                        className={`fas ${typeInfo.icon} text-xs text-neutral-500`}
                      />
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                        {typeInfo.label}
                      </span>
                    </div>
                    {byType[type].map((res) => {
                      const actions = getDynamicActions(res);
                      return (
                        <div
                          key={res.resource_key}
                          className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-3.5 border-b border-canvas-subtle hover:bg-canvas-subtle/20"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-ink-primary truncate">
                              {res.display_name || res.resource_key}
                            </div>
                            <code className="text-xs text-neutral-400 font-mono">
                              {res.resource_key}
                            </code>
                          </div>
                          <div className="flex items-center flex-wrap gap-x-6 gap-y-3 flex-shrink-0 justify-start sm:justify-end">
                            {actions.map((action) => {
                              const hasDirect = hasPerm(
                                matrixRole,
                                res.resource_key,
                                action,
                              );
                              const isInherit = hasInheritedPerm(
                                matrixRole,
                                res.resource_key,
                                action,
                              );
                              return (
                                <div
                                  key={action}
                                  className={
                                    toggling.has(
                                      `${matrixRole}:${res.resource_key}:${action}`,
                                    )
                                      ? "opacity-40 pointer-events-none"
                                      : ""
                                  }
                                >
                                  <Toggle
                                    checked={hasDirect}
                                    isInherited={isInherit}
                                    onChange={() =>
                                      togglePerm(
                                        matrixRole,
                                        res.resource_key,
                                        action,
                                        hasDirect,
                                      )
                                    }
                                    actionKey={action}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {matrixMode === "byResource" && matrixResource && (
            <div className="flex-1 overflow-y-auto">
              {(() => {
                const selectedRes = resources.find(
                  (r) => r.resource_key === matrixResource,
                );
                const actions = selectedRes
                  ? getDynamicActions(selectedRes)
                  : [];
                return roles.map((role) => (
                  <div
                    key={role.role_id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 border-b border-canvas-subtle hover:bg-canvas-subtle/20"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-shield-alt" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-ink-primary">
                          {role.role_name}
                        </div>
                        <code className="text-xs text-neutral-400 font-mono bg-canvas-subtle px-1.5 py-0.5 rounded">
                          {role.role_id}
                        </code>
                      </div>
                    </div>
                    <div className="flex items-center gap-x-6 gap-y-3 flex-wrap justify-start sm:justify-end flex-shrink-0 bg-white p-2 border border-canvas-subtle rounded-xl shadow-sm">
                      {actions.map((action) => {
                        const hasDirect = hasPerm(
                          role.role_id,
                          matrixResource,
                          action,
                        );
                        const isInherit = hasInheritedPerm(
                          role.role_id,
                          matrixResource,
                          action,
                        );
                        return (
                          <div
                            key={action}
                            className={
                              toggling.has(
                                `${role.role_id}:${matrixResource}:${action}`,
                              )
                                ? "opacity-40 pointer-events-none"
                                : ""
                            }
                          >
                            <Toggle
                              checked={hasDirect}
                              isInherited={isInherit}
                              onChange={() =>
                                togglePerm(
                                  role.role_id,
                                  matrixResource,
                                  action,
                                  hasDirect,
                                )
                              }
                              actionKey={action}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
