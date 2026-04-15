// src/features/iam/AuditView.tsx
import React, { useEffect, useState } from "react";
import { fetchUserEffectiveAccess } from "./api";
import { ActionBadge, EmptyState, Spinner } from "./IamShared";
import {
  isSystemResource,
  ORDERED_TYPES,
  RESOURCE_TYPES,
} from "./iam-constants";

interface AuditViewProps {
  users: any[];
  roles: any[];
  resources: any[];
  loading: boolean;
  initialUserId?: string | null;
  onNotify: (msg: string, type: "success" | "error" | "info") => void;
}

export default function AuditView({
  users,
  roles,
  resources,
  loading,
  initialUserId,
  onNotify,
}: AuditViewProps) {
  const [auditUser, setAuditUser] = useState<string | null>(
    initialUserId ?? null,
  );
  
  // UPDATE 1: Change 'policies: any[]' to 'permissions: Record<string, boolean>'
  const [auditData, setAuditData] = useState<{
    roles: string[];
    effectiveRoles: string[];
    permissions: Record<string, boolean>; 
  } | null>(null);
  
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    if (!auditUser) {
      setAuditData(null);
      return;
    }
    setAuditLoading(true);
    fetchUserEffectiveAccess(auditUser)
      .then((data: any) =>
        setAuditData({
          roles: data.roles || [],
          effectiveRoles: data.effectiveRoles || [],
          // UPDATE 2: Read from data.permissions instead of data.policies
          permissions: data.permissions || {}, 
        }),
      )
      .catch(() => {
        onNotify("Failed to load effective permissions", "error");
        setAuditData(null);
      })
      .finally(() => setAuditLoading(false));
  }, [auditUser]);

  // UPDATE 3: Parse the flat permissions object (e.g., {"module:users:read": true}) 
  // into the grouped format the UI expects: { "module:users": ["read", "manage"] }
  const auditByResource = Object.keys(auditData?.permissions || {}).reduce<
    Record<string, string[]>
  >((acc, permKey) => {
    // We split by the LAST colon because resource keys themselves contain colons (e.g., "module:users")
    const lastColonIdx = permKey.lastIndexOf(":");
    if (lastColonIdx > 0) {
      const resource = permKey.substring(0, lastColonIdx);
      const action = permKey.substring(lastColonIdx + 1);
      (acc[resource] ??= []).push(action);
    }
    return acc;
  }, {});

  return (
    <div className="flex-1 flex gap-4 overflow-hidden m-4">
      {/* User selector */}
      <div className="w-64 bg-surface border border-canvas-subtle rounded-2xl shadow-soft flex flex-col overflow-hidden flex-shrink-0">
        <div className="px-4 py-3 border-b border-canvas-subtle bg-canvas/40">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
            Select User
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center pt-8">
              <Spinner />
            </div>
          ) : (
            users.map((u) => (
              <button
                key={u.user_id}
                onClick={() => setAuditUser(u.user_id)}
                className={`w-full text-left px-3 py-3 rounded-xl mb-1 transition-all border ${auditUser === u.user_id ? "bg-brand-50 border-brand-200" : "border-transparent hover:bg-canvas-subtle"}`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-black flex-shrink-0">
                    {(u.first_name?.[0] ?? u.email[0]).toUpperCase()}
                  </div>
                  <div>
                    <div
                      className={`font-bold text-sm ${auditUser === u.user_id ? "text-brand-700" : "text-ink-primary"}`}
                    >
                      {u.first_name} {u.last_name}
                    </div>
                    <div className="text-xs text-neutral-400 font-mono truncate max-w-[140px]">
                      {u.user_id}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Permissions panel */}
      <div className="flex-1 bg-surface border border-canvas-subtle rounded-2xl shadow-soft flex flex-col overflow-hidden min-w-0">
        <div className="px-5 py-3 border-b border-canvas-subtle bg-canvas/40 flex-shrink-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
            Effective Permissions
          </p>
        </div>

        {!auditUser && (
          <EmptyState
            icon="fa-user-shield"
            title="Select a user on the left"
            sub="See all their effective permissions derived from assigned and inherited roles"
          />
        )}
        {auditUser && auditLoading && (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        )}

        {auditUser && !auditLoading && auditData && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Roles summary */}
            <div className="bg-canvas-subtle/50 rounded-xl p-4 border border-canvas-subtle">
              <p className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-3">
                Assigned Roles ({auditData.roles.length})
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {auditData.roles.map((rId) => (
                  <span
                    key={rId}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 border border-brand-200 text-brand-700 text-sm font-bold rounded-lg"
                  >
                    <i className="fas fa-shield-alt text-xs" />{" "}
                    {roles.find((r) => r.role_id === rId)?.role_name ?? rId}
                  </span>
                ))}
              </div>

              {auditData.effectiveRoles.filter(
                (r) => !auditData.roles.includes(r),
              ).length > 0 && (
                <>
                  <p className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-3 pt-3 border-t border-canvas-subtle">
                    Inherited Roles (
                    {
                      auditData.effectiveRoles.filter(
                        (r) => !auditData.roles.includes(r),
                      ).length
                    }
                    )
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {auditData.effectiveRoles
                      .filter((r) => !auditData.roles.includes(r))
                      .map((rId) => (
                        <span
                          key={rId}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 border border-neutral-200 text-neutral-600 text-sm font-bold rounded-lg"
                          title="Granted via inheritance"
                        >
                          <i className="fas fa-shield-alt text-xs" />{" "}
                          {roles.find((r) => r.role_id === rId)?.role_name ??
                            rId}
                        </span>
                      ))}
                  </div>
                </>
              )}
            </div>

            {/* Permissions grouped by resource type */}
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-3">
                Effective Permissions ({Object.keys(auditByResource).length}{" "}
                resources)
              </p>
              <div className="space-y-1.5">
                {(() => {
                  const grouped = Object.entries(auditByResource).reduce<
                    Record<string, [string, string[]][]>
                  >((acc, [key, acts]) => {
                    const prefix = key.split(":")[0];
                    const type = ORDERED_TYPES.includes(prefix as any)
                      ? prefix
                      : "other";
                    (acc[type] ??= []).push([key, Array.from(new Set(acts))]);
                    return acc;
                  }, {});
                  
                  return [...ORDERED_TYPES, "other"]
                    .filter((t) => grouped[t]?.length)
                    .map((type) => {
                      const typeInfo = RESOURCE_TYPES.find(
                        (r) => r.value === type,
                      ) || {
                        value: "other",
                        label: "Other",
                        icon: "fa-question-circle",
                      };
                      return (
                        <div
                          key={type}
                          className="rounded-xl border border-canvas-subtle overflow-hidden"
                        >
                          <div className="px-4 py-2 bg-canvas-subtle/70 flex items-center gap-2">
                            <i
                              className={`fas ${typeInfo.icon} text-xs text-neutral-500`}
                            />
                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                              {typeInfo.label}
                            </span>
                          </div>
                          {grouped[type].map(([key, acts]) => (
                            <div
                              key={key}
                              className="flex items-center justify-between px-4 py-3 border-t border-canvas-subtle hover:bg-canvas-subtle/30"
                            >
                              <div>
                                <div className="font-bold text-sm text-ink-primary flex items-center gap-2">
                                  {resources.find((r) => r.resource_key === key)
                                    ?.display_name || key}
                                  {isSystemResource({ resource_key: key }) && (
                                    <i
                                      className="fas fa-lock text-neutral-400 text-xs"
                                      title="System Resource"
                                    />
                                  )}
                                </div>
                                <code className="text-xs text-neutral-400 font-mono">
                                  {key}
                                </code>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap flex-shrink-0 justify-end max-w-sm">
                                {acts.map((a) => (
                                  <ActionBadge key={a} action={a} />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    });
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}