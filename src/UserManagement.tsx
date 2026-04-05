import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  type Edge,
  type Node,
} from "@xyflow/react";
import DataGrid, { type Column } from "./components/common/DataGrid";
import "@xyflow/react/dist/style.css";

import {
  fetchTenantUsers,
  createTenantUser,
  updateTenantUser,
  deactivateTenantUser,
  deleteTenantUser,
  fetchTenantRoles,
  createTenantRole,
  updateTenantRole,
  deleteTenantRole,
  assignRoleToUser,
  removeRoleFromUser,
  fetchUserRoles,
  fetchTenantResources,
  createTenantResource,
  deleteTenantResource,
  fetchRolePermissions,
  grantPermission,
  revokePermission,
  fetchResourcePermissions,
  addCustomActionToResource,
  fetchRoleInheritance,
  addRoleInheritance,
  removeRoleInheritance,
  fetchUserEffectiveAccess,
  reactivateTenantUser,
} from "./api";

// ─── Constants ────────────────────────────────────────────────────────────────

const RESOURCE_TYPES = [
  {
    value: "page",
    label: "Page / Route",
    icon: "fa-file-alt",
    actions: ["view"],
    hint: "A route or screen in the app",
  },
  {
    value: "button",
    label: "Action Button",
    icon: "fa-hand-pointer",
    actions: ["view", "execute"],
    hint: "A clickable button or action",
  },
  {
    value: "table",
    label: "Data Table",
    icon: "fa-table",
    actions: ["view", "create", "edit", "delete"],
    hint: "A data grid or list",
  },
  {
    value: "column",
    label: "Table Column",
    icon: "fa-columns",
    actions: ["view"],
    hint: "A specific column inside a table",
  },
  {
    value: "form",
    label: "Form",
    icon: "fa-wpforms",
    actions: ["view", "execute"],
    hint: "A form the user submits",
  },
  {
    value: "api",
    label: "API Endpoint",
    icon: "fa-plug",
    actions: ["view", "execute"],
    hint: "A backend endpoint",
  },
  {
    value: "workflow",
    label: "Workflow Action",
    icon: "fa-project-diagram",
    actions: ["view", "execute"],
    hint: "A process or workflow step",
  },
  {
    value: "component",
    label: "UI Component",
    icon: "fa-layer-group",
    actions: ["view"],
    hint: "A section, card, or panel",
  },
] as const;

type ResourceType = (typeof RESOURCE_TYPES)[number]["value"];

// 🟢 DYNAMIC ACTION METADATA GENERATOR
const ACTION_META: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  view: { color: "#16a34a", bg: "#dcfce7", label: "View" },
  execute: { color: "#2563eb", bg: "#dbeafe", label: "Execute" },
  create: { color: "#0891b2", bg: "#cffafe", label: "Create" },
  edit: { color: "#d97706", bg: "#fef3c7", label: "Edit" },
  delete: { color: "#dc2626", bg: "#fee2e2", label: "Delete" },
};

const getActionMeta = (action: string) => {
  if (ACTION_META[action]) return ACTION_META[action];

  const customColors = [
    { color: "#8b5cf6", bg: "#ede9fe" },
    { color: "#ec4899", bg: "#fce7f3" },
    { color: "#14b8a6", bg: "#ccfbf1" },
    { color: "#f59e0b", bg: "#fef3c7" },
    { color: "#6366f1", bg: "#e0e7ff" },
    { color: "#059669", bg: "#d1fae5" },
    { color: "#e11d48", bg: "#ffe4e6" },
  ];
  const hash = action
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const theme = customColors[hash % customColors.length];

  return {
    color: theme.color,
    bg: theme.bg,
    label: action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
  };
};

function actionsFor(type: string) {
  return RESOURCE_TYPES.find((r) => r.value === type)?.actions ?? ["view"];
}

function getDynamicActions(resource: any): string[] {
  if (
    resource.actions &&
    Array.isArray(resource.actions) &&
    resource.actions.length > 0
  ) {
    return resource.actions.map((a: any) => a.action_name || a.name);
  }
  return [...actionsFor(resource.resource_type)];
}

const isSystemResource = (res: any) => {
  return (
    res.is_system === true ||
    res.resource_type?.toLowerCase() === "system" ||
    res.resource_key?.toLowerCase().startsWith("system:") ||
    res.resource_key?.toLowerCase().startsWith("system_")
  );
};

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

const Badge = ({
  label,
  color,
  bg,
  onRemove,
}: {
  label: string;
  color: string;
  bg: string;
  onRemove?: () => void;
}) => (
  <span
    style={{ color, background: bg, border: `1px solid ${color}33` }}
    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
  >
    {label}
    {onRemove && (
      <button
        onClick={onRemove}
        className="ml-0.5 hover:opacity-60 transition-opacity"
      >
        <i className="fas fa-times text-[9px]" />
      </button>
    )}
  </span>
);

const ActionBadge = ({ action }: { action: string }) => {
  const m = getActionMeta(action);
  return <Badge label={m.label} color={m.color} bg={m.bg} />;
};

const Pill = ({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${active ? "bg-brand-500 text-white shadow-md" : "text-neutral-500 hover:text-ink-primary hover:bg-canvas-subtle"}`}
  >
    {children}
  </button>
);

const Toggle = ({
  checked,
  onChange,
  actionKey,
  isInherited,
}: {
  checked: boolean;
  onChange: () => void;
  actionKey: string;
  isInherited?: boolean;
}) => {
  const m = getActionMeta(actionKey);
  const visuallyChecked = checked || isInherited;

  return (
    <label className="flex flex-col items-center gap-1 cursor-pointer select-none group relative">
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={onChange}
        />
        <div
          className={`block w-9 h-5 rounded-full transition-colors duration-200 ${isInherited && !checked ? "opacity-50" : ""}`}
          style={{ background: visuallyChecked ? m.color : "#d1d5db" }}
        />
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${visuallyChecked ? "translate-x-4" : ""} flex items-center justify-center`}
        >
          {isInherited && (
            <i
              className="fas fa-shield-alt text-[8px]"
              style={{ color: m.color }}
            />
          )}
        </div>
      </div>
      <span
        className="text-[9px] font-black uppercase tracking-wider text-center max-w-[60px] leading-tight"
        style={{ color: visuallyChecked ? m.color : "#9ca3af" }}
      >
        {m.label}
      </span>
      {isInherited && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-neutral-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity">
          Inherited access
        </div>
      )}
    </label>
  );
};

const Spinner = () => (
  <i className="fas fa-circle-notch fa-spin text-brand-500" />
);

const EmptyState = ({
  icon,
  title,
  sub,
}: {
  icon: string;
  title: string;
  sub?: string;
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
    <div className="w-14 h-14 rounded-full bg-canvas-subtle flex items-center justify-center mb-4">
      <i className={`fas ${icon} text-2xl text-neutral-400`} />
    </div>
    <p className="font-bold text-ink-secondary">{title}</p>
    {sub && <p className="text-sm text-neutral-400 mt-1">{sub}</p>}
  </div>
);

const ResourceKeyBuilder = ({
  value,
  type,
  onChange,
  disabled,
}: {
  value: string;
  type: ResourceType;
  onChange: (key: string) => void;
  disabled?: boolean;
}) => {
  const [name, setName] = useState(() => value.replace(`${type}:`, ""));
  const slugify = (s: string) =>
    s
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_:]/g, "");
  const handleChange = (raw: string) => {
    if (disabled) return;
    const slug = slugify(raw);
    setName(slug);
    onChange(`${type}:${slug}`);
  };
  useEffect(() => {
    if (!disabled) onChange(`${type}:${name}`);
  }, [type, disabled]);
  const preview = `${type}:${name || "<name>"}`;

  return (
    <div className={`space-y-2 ${disabled ? "opacity-60" : ""}`}>
      <label className="text-xs font-bold text-ink-secondary uppercase tracking-wide">
        Resource Name
      </label>
      <div
        className={`flex items-center gap-0 rounded-xl overflow-hidden border focus-within:ring-2 focus-within:ring-brand-500 ${disabled ? "bg-canvas-subtle border-canvas-subtle" : "border-canvas-active bg-white"}`}
      >
        <span className="px-3 py-2.5 bg-canvas-subtle text-neutral-500 font-mono text-sm border-r border-canvas-active flex-shrink-0">
          {type}:
        </span>
        <input
          required
          disabled={disabled}
          placeholder="approve_order"
          className="flex-1 px-3 py-2.5 outline-none font-mono text-sm bg-transparent"
          value={name}
          onChange={(e) => handleChange(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs text-neutral-400">Key →</span>
        <code className="text-xs bg-canvas-subtle px-2 py-0.5 rounded font-mono text-brand-600 font-bold">
          {preview}
        </code>
      </div>
    </div>
  );
};

const MultiRoleSelector = ({
  allRoles,
  selected,
  onChange,
  disabledRoleIds = [],
  inheritedRoles = [],
}: {
  allRoles: any[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabledRoleIds?: string[];
  inheritedRoles?: string[];
}) => {
  const toggle = (id: string, isDisabled: boolean) => {
    if (isDisabled) return;
    onChange(
      selected.includes(id)
        ? selected.filter((r) => r !== id)
        : [...selected, id],
    );
  };

  return (
    <div className="border border-canvas-subtle rounded-xl overflow-hidden max-h-52 overflow-y-auto">
      {allRoles.length === 0 && (
        <p className="p-4 text-sm text-neutral-400 italic">
          No valid roles found.
        </p>
      )}
      {allRoles.map((r) => {
        const checked = selected.includes(r.role_id);
        const isInherited = inheritedRoles.includes(r.role_id);
        const isDisabled = disabledRoleIds.includes(r.role_id);

        return (
          <label
            key={r.role_id}
            onClick={() => toggle(r.role_id, isDisabled)}
            className={`flex items-center gap-3 px-4 py-3 transition-colors border-b border-canvas-subtle last:border-0 
              ${isDisabled ? "opacity-50 cursor-not-allowed bg-canvas-subtle" : "cursor-pointer"} 
              ${checked && !isDisabled ? "bg-brand-50" : ""} 
              ${!isDisabled && !checked ? "hover:bg-canvas-subtle" : ""}`}
          >
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? "bg-brand-500 border-brand-500" : "border-neutral-300"}`}
            >
              {checked && <i className="fas fa-check text-white text-[10px]" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-ink-primary truncate">
                {r.role_name}
              </div>
              <div className="text-xs text-neutral-400 font-mono truncate">
                {r.role_id}
              </div>
            </div>
            {isDisabled && (
              <div className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
                <i className="fas fa-exclamation-triangle"></i> Causes Cycle
              </div>
            )}
            {isInherited && !isDisabled && (
              <div
                className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-1 rounded-md border border-brand-200 flex items-center gap-1 cursor-help"
                title="This user effectively has this role due to inheritance from an explicitly assigned role."
              >
                <i className="fas fa-shield-alt"></i> Inherited
              </div>
            )}
          </label>
        );
      })}
    </div>
  );
};

const Modal = ({
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) => (
  <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div
      className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? "max-w-5xl h-[80vh]" : "max-w-2xl max-h-[90vh]"} flex flex-col`}
    >
      <div className="flex items-start justify-between p-6 border-b border-canvas-subtle flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-ink-primary">{title}</h2>
          {subtitle && (
            <p className="text-sm text-neutral-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-700 mt-0.5 ml-4"
        >
          <i className="fas fa-times text-lg" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">{children}</div>
      {footer && (
        <div className="p-6 border-t border-canvas-subtle flex-shrink-0">
          {footer}
        </div>
      )}
    </div>
  </div>
);

const ModalFooter = ({
  onCancel,
  onSubmit,
  saving,
  label,
  formId,
  isDanger = false,
}: {
  onCancel: () => void;
  onSubmit?: () => void;
  saving: boolean;
  label: string;
  formId?: string;
  isDanger?: boolean;
}) => (
  <div className="flex justify-end gap-3">
    <button
      type="button"
      onClick={onCancel}
      className="px-4 py-2 text-sm font-bold text-neutral-500 hover:bg-canvas-subtle rounded-lg transition-colors"
    >
      Cancel
    </button>
    <button
      type={formId ? "submit" : onSubmit ? "button" : "submit"}
      form={formId}
      onClick={formId ? undefined : onSubmit}
      disabled={saving}
      className={`px-5 py-2 text-white text-sm font-bold rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2 ${isDanger ? "bg-rose-500 hover:bg-rose-600" : "bg-brand-500 hover:bg-brand-600"}`}
    >
      {saving && <i className="fas fa-circle-notch fa-spin text-xs" />}{" "}
      {saving ? "Saving…" : label}
    </button>
  </div>
);

const PanelHeader = ({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) => (
  <div className="px-6 py-4 border-b border-canvas-subtle flex items-center justify-between bg-canvas/40 flex-shrink-0">
    <h2 className="text-base font-bold text-ink-primary">{title}</h2>
    {action}
  </div>
);

const SearchInput = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) => (
  <div className="relative">
    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs" />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "Search…"}
      className="pl-8 pr-3 py-2 border border-canvas-subtle rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 bg-canvas-subtle w-52"
    />
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = "users" | "roles" | "resources" | "matrix" | "audit";

const getInitialTab = (): Tab => {
  const params = new URLSearchParams(window.location.search);
  const t = params.get("tab") as Tab;
  return ["users", "roles", "resources", "matrix", "audit"].includes(t)
    ? t
    : "users";
};

export default function UserManagement({
  addNotification,
}: {
  addNotification: (msg: string, type: "success" | "error" | "info") => void;
}) {
  const [tabState, setTabState] = useState<Tab>(getInitialTab);

  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    window.history.pushState({}, "", url);
  }, []);

  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [roleInheritanceMap, setRoleInheritanceMap] = useState<
    Record<string, string[]>
  >({});
  const [loading, setLoading] = useState(true);

  const [matrixRole, setMatrixRole] = useState<string | null>(null);
  const [rolePolicies, setRolePolicies] = useState<any[]>([]);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [resourceSearch, setResourceSearch] = useState("");

  const [auditUser, setAuditUser] = useState<string | null>(null);
  const [auditData, setAuditData] = useState<{
    roles: string[];
    effectiveRoles: string[];
    policies: any[];
  } | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const [modal, setModal] = useState<
    | "user"
    | "role"
    | "resource"
    | "manageRoles"
    | "manageInheritance"
    | "tree"
    | "delete"
    | null
  >(null);

  // Deletion State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "user" | "role" | "resource";
    item: any;
  } | null>(null);

  const [roleTarget, setRoleTarget] = useState<any | null>(null);
  const [userRolesLoading, setUserRolesLoading] = useState(false);
  const [selectedRolesForUser, setSelectedRolesForUser] = useState<string[]>(
    [],
  );

  // Inheritance State
  const [selectedInheritedRoles, setSelectedInheritedRoles] = useState<
    string[]
  >([]);
  const [inheritanceLoading, setInheritanceLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  // 🟢 Edit Modes State
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState(false);

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

  // Resource Form State
  const [isEditingRes, setIsEditingRes] = useState(false);
  const [resType, setResType] = useState<ResourceType>("button");
  const [resKey, setResKey] = useState("button:");
  const [resDisplay, setResDisplay] = useState("");
  const [resDesc, setResDesc] = useState("");
  const [resActions, setResActions] = useState<
    { name: string; description: string }[]
  >(() => actionsFor("button").map((a) => ({ name: a, description: "" })));

  const [userSearch, setUserSearch] = useState("");
  const [roleSearch, setRoleSearch] = useState("");
  const [matrixMode, setMatrixMode] = useState<"byRole" | "byResource">(
    "byRole",
  );
  const [matrixResource, setMatrixResource] = useState<string | null>(null);

  const getEffectiveRoles = useCallback(
    (startRoles: string[]) => {
      const visited = new Set<string>();
      const stack = [...startRoles];
      while (stack.length > 0) {
        const curr = stack.pop()!;
        if (!visited.has(curr)) {
          visited.add(curr);
          const inherits = roleInheritanceMap[curr] || [];
          stack.push(...inherits);
        }
      }
      return Array.from(visited);
    },
    [roleInheritanceMap],
  );

  useEffect(() => {
    if (!matrixResource || matrixMode !== "byResource") return;
    setMatrixLoading(true);
    fetchResourcePermissions(matrixResource)
      .then(setRolePolicies)
      .catch(() =>
        addNotification("Failed to load resource permissions", "error"),
      )
      .finally(() => setMatrixLoading(false));
  }, [matrixResource, matrixMode, addNotification]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r, res] = await Promise.all([
        fetchTenantUsers(),
        fetchTenantRoles(),
        fetchTenantResources(),
      ]);

      // 🟢 O(1) Frontend mapping: Backend now provides the roles array natively
      const usersWithRoles = u.map((user: any) => {
        const roleIds = user.roles || []; // Fallback to empty array if no roles
        const roleNames = roleIds.map((id: string) => {
          const found = r.find((role: any) => role.role_id === id);
          return found ? found.role_name : id;
        });
        return { ...user, rolesStr: roleNames.join(", ") };
      });

      setUsers(usersWithRoles);
      setRoles(r);
      setResources(res);

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
      addNotification("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!matrixRole || matrixMode !== "byRole") {
      setRolePolicies([]);
      return;
    }
    setMatrixLoading(true);

    const effective = getEffectiveRoles([matrixRole]);
    Promise.all(effective.map((r) => fetchRolePermissions(r)))
      .then((arrays) => {
        setRolePolicies(arrays.flat());
      })
      .catch(() => addNotification("Failed to load permissions", "error"))
      .finally(() => setMatrixLoading(false));
  }, [matrixRole, matrixMode, getEffectiveRoles, addNotification]);

  useEffect(() => {
    if (!auditUser) {
      setAuditData(null);
      return;
    }
    setAuditLoading(true);
    fetchUserEffectiveAccess(auditUser)
      .then((data: any) => {
        setAuditData({
          roles: data.roles || [],
          effectiveRoles: data.effectiveRoles || [],
          policies: data.policies || [],
        });
      })
      .catch(() => {
        addNotification("Failed to load effective permissions", "error");
        setAuditData(null);
      })
      .finally(() => setAuditLoading(false));
  }, [auditUser, addNotification]);

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
      addNotification("Failed to update permission", "error");
    } finally {
      setToggling((prev) => {
        const s = new Set(prev);
        s.delete(k);
        return s;
      });
    }
  };

  // 🟢 Modal Openers for Edit Functionality
  const openCreateUser = () => {
    setIsEditingUser(false);
    setUserForm({ userId: "", email: "", firstName: "", lastName: "" });
    setModal("user");
  };

  const openEditUser = (u: any) => {
    setIsEditingUser(true);
    setUserForm({
      userId: u.user_id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
    });
    setModal("user");
  };

  const openCreateRole = () => {
    setIsEditingRole(false);
    setRoleForm({ roleId: "", roleName: "", description: "" });
    setModal("role");
  };

  const openEditRole = (r: any) => {
    setIsEditingRole(true);
    setRoleForm({
      roleId: r.role_id,
      roleName: r.role_name,
      description: r.description || "",
    });
    setModal("role");
  };

  const submitUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate IDs only if we are creating a new user
    if (
      !isEditingUser &&
      users.some(
        (u) => u.user_id.toLowerCase() === userForm.userId.toLowerCase(),
      )
    ) {
      return addNotification("User ID already exists.", "error");
    }

    // Check if email belongs to someone else
    const emailExists = users.some(
      (u) =>
        u.email.toLowerCase() === userForm.email.toLowerCase() &&
        u.user_id !== userForm.userId,
    );
    if (emailExists) return addNotification("Email already exists.", "error");

    setSaving(true);
    try {
      if (isEditingUser) {
        await updateTenantUser(userForm.userId, { ...userForm, metadata: {} });
        addNotification("User updated successfully", "success");
      } else {
        await createTenantUser({ ...userForm, metadata: {} });
        addNotification("User created successfully", "success");
      }
      setModal(null);
      load();
    } catch (err: any) {
      addNotification(
        err?.response?.data?.message || "Failed to save user",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const submitRole = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate IDs only if we are creating a new role
    if (
      !isEditingRole &&
      roles.some(
        (r) => r.role_id.toLowerCase() === roleForm.roleId.toLowerCase(),
      )
    ) {
      return addNotification("Role ID already exists.", "error");
    }

    setSaving(true);
    try {
      if (isEditingRole) {
        await updateTenantRole(roleForm.roleId, roleForm);
        addNotification("Role updated successfully", "success");
      } else {
        await createTenantRole(roleForm);
        addNotification("Role created successfully", "success");
      }
      setModal(null);
      load();
    } catch {
      addNotification("Failed to save role", "error");
    } finally {
      setSaving(false);
    }
  };

  const submitResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !isEditingRes &&
      resources.some(
        (r) => r.resource_key.toLowerCase() === resKey.toLowerCase(),
      )
    )
      return addNotification("Resource key already exists.", "error");
    const validActions = resActions.filter((a) => a.name.trim() !== "");
    if (validActions.length === 0)
      return addNotification(
        "You must define at least one action (e.g., view).",
        "error",
      );

    setSaving(true);
    try {
      await createTenantResource({
        resourceKey: resKey,
        resourceType: resType,
        displayName: resDisplay,
        description: resDesc,
        actions: validActions,
      });
      for (const act of validActions) {
        await addCustomActionToResource(resKey, {
          actionName: act.name,
          description: act.description,
        });
      }
      addNotification(
        isEditingRes ? "Resource updated" : "Resource registered",
        "success",
      );
      setModal(null);
      load();
    } catch {
      addNotification("Failed to save resource", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      if (deleteTarget.type === "user") {
        await deleteTenantUser(deleteTarget.item.user_id);
        addNotification("User deleted", "success");
      } else if (deleteTarget.type === "role") {
        await deleteTenantRole(deleteTarget.item.role_id);
        addNotification("Role deleted", "success");
      } else if (deleteTarget.type === "resource") {
        await deleteTenantResource(deleteTarget.item.resource_key);
        addNotification("Resource deleted", "success");
      }
      setModal(null);
      setDeleteTarget(null);
      load();
    } catch (err) {
      addNotification(`Failed to delete ${deleteTarget.type}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const openCreateResource = () => {
    setIsEditingRes(false);
    setResType("button");
    setResKey("button:");
    setResDisplay("");
    setResDesc("");
    setResActions(
      actionsFor("button").map((a) => ({ name: a, description: "" })),
    );
    setModal("resource");
  };

  const openEditResource = (res: any) => {
    setIsEditingRes(true);
    setResType(res.resource_type);
    setResKey(res.resource_key);
    setResDisplay(res.display_name || "");
    setResDesc(res.description || "");
    const currentActions = getDynamicActions(res).map((a) => ({
      name: a,
      description: "",
    }));
    setResActions(currentActions);
    setModal("resource");
  };

  const openManageRoles = async (user: any) => {
    setRoleTarget(user);
    setModal("manageRoles");
    setUserRolesLoading(true);
    try {
      const r = await fetchUserRoles(user.user_id);
      setSelectedRolesForUser(r);
    } catch {
      setSelectedRolesForUser([]);
    } finally {
      setUserRolesLoading(false);
    }
  };

  const saveUserRoles = async () => {
    if (!roleTarget) return;
    setSaving(true);
    try {
      const current: string[] = await fetchUserRoles(roleTarget.user_id);
      const toAdd = selectedRolesForUser.filter((r) => !current.includes(r));
      const toRemove = current.filter((r) => !selectedRolesForUser.includes(r));
      await Promise.all([
        ...toAdd.map((r) => assignRoleToUser(roleTarget.user_id, r)),
        ...toRemove.map((r) => removeRoleFromUser(roleTarget.user_id, r)),
      ]);
      addNotification("Roles updated", "success");
      setModal(null);
    } catch {
      addNotification("Failed to update roles", "error");
    } finally {
      setSaving(false);
    }
  };

  const openManageInheritance = async (role: any) => {
    setRoleTarget(role);
    setModal("manageInheritance");
    setInheritanceLoading(true);
    try {
      const inherited = await fetchRoleInheritance(role.role_id);
      setSelectedInheritedRoles(inherited);
    } catch {
      setSelectedInheritedRoles([]);
    } finally {
      setInheritanceLoading(false);
    }
  };

  const saveRoleInheritance = async () => {
    if (!roleTarget) return;
    setSaving(true);
    try {
      const current: string[] = await fetchRoleInheritance(roleTarget.role_id);
      const toAdd = selectedInheritedRoles.filter((r) => !current.includes(r));
      const toRemove = current.filter(
        (r) => !selectedInheritedRoles.includes(r),
      );

      await Promise.all([
        ...toAdd.map((r) => addRoleInheritance(roleTarget.role_id, r)),
        ...toRemove.map((r) => removeRoleInheritance(roleTarget.role_id, r)),
      ]);
      addNotification("Role inheritance updated", "success");
      setModal(null);
      load();
    } catch {
      addNotification("Failed to update inheritance", "error");
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    `${u.first_name} ${u.last_name} ${u.email} ${u.user_id}`
      .toLowerCase()
      .includes(userSearch.toLowerCase()),
  );
  const filteredRoles = roles.filter((r) =>
    `${r.role_name} ${r.role_id} ${r.description ?? ""}`
      .toLowerCase()
      .includes(roleSearch.toLowerCase()),
  );
  const filteredResources = resources.filter((r) =>
    `${r.resource_key} ${r.display_name ?? ""}`
      .toLowerCase()
      .includes(resourceSearch.toLowerCase()),
  );
  const byType = filteredResources.reduce<Record<string, any[]>>((acc, r) => {
    (acc[r.resource_type] ??= []).push(r);
    return acc;
  }, {});
  const ORDERED_TYPES = [
    "page",
    "button",
    "table",
    "column",
    "form",
    "api",
    "workflow",
    "component",
  ];
  const availableTypes = Object.keys(byType);
  const typesToRender = Array.from(
    new Set([...ORDERED_TYPES, ...availableTypes]),
  ).filter((t) => byType[t]?.length);

  const auditByResource =
    auditData?.policies.reduce<Record<string, string[]>>((acc, p) => {
      (acc[p[2]] ??= []).push(p[3]);
      return acc;
    }, {}) ?? {};

  const userInheritedRolesForModal =
    modal === "manageRoles" && roleTarget
      ? getEffectiveRoles(selectedRolesForUser).filter(
          (r) => !selectedRolesForUser.includes(r),
        )
      : [];

  const invalidRolesForInheritance =
    modal === "manageInheritance" && roleTarget
      ? roles
          .filter((r) => {
            if (r.role_id === roleTarget.role_id) return true;
            const effectiveOfPotentialChild = getEffectiveRoles([r.role_id]);
            return effectiveOfPotentialChild.includes(roleTarget.role_id);
          })
          .map((r) => r.role_id)
      : [];

  // 🟢 React Flow Setup for the Hierarchical Tree
  const { reactFlowNodes, reactFlowEdges } = useMemo(() => {
    if (modal !== "tree") return { reactFlowNodes: [], reactFlowEdges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Simple Auto-Layout based on Depth
    const nodeDepths: Record<string, number> = {};
    const getDepth = (roleId: string, visited = new Set<string>()): number => {
      if (visited.has(roleId)) return 0; // Prevent infinite loop in layout calculation
      visited.add(roleId);

      const parents = Object.entries(roleInheritanceMap)
        .filter(([_, children]) => children.includes(roleId))
        .map(([parent]) => parent);

      if (parents.length === 0) return 0;
      return Math.max(...parents.map((p) => getDepth(p, new Set(visited)))) + 1;
    };

    // Calculate depths
    roles.forEach((r) => {
      nodeDepths[r.role_id] = getDepth(r.role_id);
    });

    // Group by depth
    const levels: Record<number, string[]> = {};
    Object.entries(nodeDepths).forEach(([roleId, depth]) => {
      (levels[depth] ??= []).push(roleId);
    });

    roles.forEach((r) => {
      const depth = nodeDepths[r.role_id];
      const indexInLevel = levels[depth].indexOf(r.role_id);
      const levelWidth = levels[depth].length;

      // Spacing constraints
      const X_SPACING = 250;
      const Y_SPACING = 150;

      // Center the row
      const xOffset = (indexInLevel - (levelWidth - 1) / 2) * X_SPACING;

      nodes.push({
        id: r.role_id,
        position: { x: xOffset, y: depth * Y_SPACING },
        data: {
          label: (
            <div className="flex flex-col items-center p-2 min-w-[120px]">
              <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-2 shadow-sm border border-brand-200">
                <i className="fas fa-shield-alt text-xs" />
              </div>
              <strong className="text-xs text-ink-primary font-bold">
                {r.role_name}
              </strong>
              <code className="text-[9px] text-neutral-400 mt-1">
                {r.role_id}
              </code>
            </div>
          ),
        },
        type: "default",
        style: {
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
        },
      });

      // Create Edges for Inherited Roles (Children)
      const inherits = roleInheritanceMap[r.role_id] || [];
      inherits.forEach((childId) => {
        edges.push({
          id: `e-${r.role_id}-${childId}`,
          source: r.role_id,
          target: childId,
          animated: true,
          style: { stroke: "#94a3b8", strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#94a3b8",
          },
        });
      });
    });

    return { reactFlowNodes: nodes, reactFlowEdges: edges };
  }, [modal, roles, roleInheritanceMap]);

  // 🟢 DataGrid Columns for Users Tab
  const userColumns: Column<any>[] = [
    {
      header: "User",
      key: "first_name",
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-black flex-shrink-0">
            {(u.first_name?.[0] + u.last_name?.[0] || u.email[0]).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-ink-primary">
              {u.first_name} {u.last_name}
            </div>
            <div className="text-xs text-neutral-400 font-mono">
              {u.user_id}
            </div>
          </div>
        </div>
      ),
    },
    { header: "Email", key: "email", sortable: true },
    {
      header: "Status",
      key: "is_active",
      sortable: true,
      render: (u) =>
        u.is_active ? (
          <Badge label="Active" color="#16a34a" bg="#dcfce7" />
        ) : (
          <Badge label="Inactive" color="#dc2626" bg="#fee2e2" />
        ),
    },
    {
      header: "Roles",
      key: "rolesStr", // 🟢 Map the key to our new searchable string
      sortable: true, // 🟢 Now we can sort by roles!
      render: (u) => (
        <div className="flex flex-col items-start gap-2">
          {/* Display the roles as badges */}
          <div className="flex flex-wrap gap-1">
            {u.rolesStr ? (
              u.rolesStr.split(", ").map((roleName: string) => (
                <span
                  key={roleName}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-canvas-subtle text-neutral-600 font-bold border border-canvas-active"
                >
                  {roleName}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-neutral-400 italic">
                No roles
              </span>
            )}
          </div>

          <button
            onClick={() => openManageRoles(u)}
            className="text-brand-600 hover:text-brand-800 text-[10px] font-bold flex items-center gap-1 bg-brand-50 px-2 py-1 rounded border border-brand-100 transition-colors hover:border-brand-300"
          >
            <i className="fas fa-user-tag" /> Manage Roles
          </button>
        </div>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (u) => (
        <div className="flex items-center justify-end">
          <div className="flex items-center bg-canvas-subtle/50 rounded-lg border border-canvas-subtle p-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => {
                setAuditUser(u.user_id);
                setTab("audit");
              }}
              disabled={saving}
              className="w-8 h-8 rounded flex items-center justify-center text-neutral-500 hover:bg-white hover:text-brand-600 hover:shadow-sm transition-all disabled:opacity-50"
              title="View Effective Permissions"
            >
              <i className="fas fa-eye" />
            </button>

            <button
              onClick={() => openEditUser(u)}
              disabled={saving}
              className="w-8 h-8 rounded flex items-center justify-center text-neutral-500 hover:bg-white hover:text-brand-600 hover:shadow-sm transition-all disabled:opacity-50"
              title="Edit User"
            >
              <i className="fas fa-edit" />
            </button>

            <div className="w-px h-4 bg-neutral-300 mx-1"></div>

            {u.is_active ? (
              <button
                onClick={async () => {
                  if (
                    !window.confirm(
                      "Deactivate this user? They will not be able to log in.",
                    )
                  )
                    return;
                  try {
                    setSaving(true);
                    await deactivateTenantUser(u.user_id);
                    addNotification("User deactivated", "success");
                    await load();
                  } catch {
                    addNotification("Failed to deactivate", "error");
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="w-8 h-8 rounded flex items-center justify-center text-neutral-500 hover:bg-status-warning hover:text-white hover:shadow-sm transition-all disabled:opacity-50"
                title="Deactivate User"
              >
                <i className="fas fa-user-slash" />
              </button>
            ) : (
              <button
                onClick={async () => {
                  try {
                    setSaving(true);
                    await reactivateTenantUser(u.user_id);
                    addNotification("User reactivated", "success");
                    await load();
                  } catch {
                    addNotification("Failed to reactivate", "error");
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="w-8 h-8 rounded flex items-center justify-center text-neutral-500 hover:bg-status-success hover:text-white hover:shadow-sm transition-all disabled:opacity-50"
                title="Reactivate User"
              >
                <i className="fas fa-user-check" />
              </button>
            )}

            <button
              onClick={() => {
                setDeleteTarget({ type: "user", item: u });
                setModal("delete");
              }}
              disabled={saving}
              className="w-8 h-8 rounded flex items-center justify-center text-neutral-500 hover:bg-rose-500 hover:text-white hover:shadow-sm transition-all disabled:opacity-50 ml-1"
              title="Permanently Delete User"
            >
              <i className="fas fa-trash-alt" />
            </button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="h-full flex flex-col bg-canvas overflow-hidden">
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
            {(
              [
                ["users", "Users", "fa-users"],
                ["roles", "Roles", "fa-id-badge"],
                ["resources", "Resources", "fa-layer-group"],
                ["matrix", "Permissions", "fa-th"],
                ["audit", "Access View", "fa-eye"],
              ] as [Tab, string, string][]
            ).map(([t, label, icon]) => (
              <Pill key={t} active={tabState === t} onClick={() => setTab(t)}>
                <i className={`fas ${icon} mr-1.5`} /> {label}
              </Pill>
            ))}
          </div>
        </div>
      </div>

      {/* ── USERS TAB ── */}
      {tabState === "users" && (
        <div className="flex-1 flex flex-col p-4">
          <DataGrid
            data={users}
            columns={userColumns}
            loading={loading}
            getRowId={(u) => u.user_id}
            searchFields={["first_name", "last_name", "email", "user_id"]}
            headerActions={
              <button
                onClick={openCreateUser}
                className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-600 transition-colors flex items-center gap-2"
              >
                <i className="fas fa-plus" /> New User
              </button>
            }
          />
        </div>
      )}

      {/* ── ROLES TAB ── */}
      {tabState === "roles" && (
        <div className="flex-1 flex flex-col overflow-hidden bg-surface m-4 rounded-2xl border border-canvas-subtle shadow-soft">
          <PanelHeader
            title={`Roles (${roles.length})`}
            action={
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setModal("tree")}
                  className="bg-white border border-canvas-subtle text-ink-primary px-4 py-2 rounded-lg text-sm font-bold hover:bg-canvas-subtle transition-colors flex items-center gap-2 mr-2"
                >
                  <i className="fas fa-sitemap text-brand-500" /> View Hierarchy
                </button>
                <SearchInput
                  value={roleSearch}
                  onChange={setRoleSearch}
                  placeholder="Search roles…"
                />
                <button
                  onClick={openCreateRole}
                  className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-600 transition-colors flex items-center gap-2"
                >
                  <i className="fas fa-plus" /> New Role
                </button>
              </div>
            }
          />
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex justify-center py-16">
                <Spinner />
              </div>
            ) : filteredRoles.length === 0 ? (
              <EmptyState
                icon="fa-id-badge"
                title="No roles yet"
                sub="Create a role to start assigning permissions"
              />
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {filteredRoles.map((r) => {
                  const inheritedCount = (roleInheritanceMap[r.role_id] || [])
                    .length;
                  return (
                    <div
                      key={r.role_id}
                      className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-canvas-subtle bg-canvas/20 hover:bg-canvas-subtle/30 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-shield-alt text-sm" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-ink-primary truncate text-sm">
                            {r.role_name}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <code className="text-[10px] font-mono text-neutral-400 bg-canvas-subtle px-1.5 py-0.5 rounded truncate">
                              {r.role_id}
                            </code>
                            {inheritedCount > 0 && (
                              <span
                                className="text-[10px] text-neutral-500 font-bold flex items-center gap-1"
                                title="Inherits from other roles"
                              >
                                <i className="fas fa-link" /> {inheritedCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openManageInheritance(r)}
                          disabled={saving}
                          className="text-neutral-500 hover:text-brand-700 bg-white border border-canvas-subtle hover:border-brand-300 w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Manage Inheritance"
                        >
                          <i className="fas fa-project-diagram" />
                        </button>
                        <button
                          onClick={() => {
                            setMatrixRole(r.role_id);
                            setTab("matrix");
                            setMatrixMode("byRole");
                          }}
                          disabled={saving}
                          className="text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Edit Permissions"
                        >
                          <i className="fas fa-key" />
                        </button>

                        <div className="w-px h-5 bg-canvas-subtle mx-1"></div>

                        <button
                          onClick={() => openEditRole(r)}
                          disabled={saving}
                          className="text-neutral-500 hover:text-brand-600 bg-white border border-canvas-subtle hover:border-brand-300 w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Edit Role"
                        >
                          <i className="fas fa-edit" />
                        </button>

                        <button
                          onClick={() => {
                            setDeleteTarget({ type: "role", item: r });
                            setModal("delete");
                          }}
                          disabled={saving}
                          className="text-neutral-400 hover:text-rose-600 hover:bg-rose-50 w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete Role"
                        >
                          <i className="fas fa-trash-alt" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RESOURCES TAB ── */}
      {tabState === "resources" && (
        <div className="flex-1 flex flex-col overflow-hidden bg-surface m-4 rounded-2xl border border-canvas-subtle shadow-soft">
          <PanelHeader
            title={`Registered Resources (${resources.length})`}
            action={
              <div className="flex items-center gap-3">
                <SearchInput
                  value={resourceSearch}
                  onChange={setResourceSearch}
                  placeholder="Search resources..."
                />
                <button
                  onClick={openCreateResource}
                  className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-600 transition-colors flex items-center gap-2"
                >
                  <i className="fas fa-plus" /> Register Resource
                </button>
              </div>
            }
          />
          <div className="flex-1 overflow-y-auto p-4">
            {filteredResources.length === 0 ? (
              <EmptyState icon="fa-layer-group" title="No resources found" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredResources.map((res) => {
                  const typeInfo = RESOURCE_TYPES.find(
                    (rt) => rt.value === res.resource_type,
                  );
                  const resActions = getDynamicActions(res);
                  const isSystem = isSystemResource(res);
                  return (
                    <div
                      key={res.resource_key}
                      className="bg-canvas-subtle/30 border border-canvas-subtle p-4 rounded-xl hover:border-brand-200 transition-colors flex flex-col h-full group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <i
                          className={`fas ${typeInfo?.icon || "fa-cube"} text-brand-500`}
                        />
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                          {typeInfo?.label || res.resource_type}
                        </span>

                        {isSystem ? (
                          <span className="ml-auto flex items-center gap-1.5 text-neutral-400 bg-canvas-subtle border border-canvas-subtle px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest font-bold">
                            <i className="fas fa-lock text-xs"></i> System
                          </span>
                        ) : (
                          <div className="ml-auto flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditResource(res)}
                              disabled={saving}
                              className="text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 w-7 h-7 rounded-md flex items-center justify-center text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Edit Resource"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTarget({
                                  type: "resource",
                                  item: res,
                                });
                                setModal("delete");
                              }}
                              disabled={saving}
                              className="text-neutral-500 hover:text-rose-600 hover:bg-rose-50 w-7 h-7 rounded-md flex items-center justify-center text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete Resource"
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        )}
                      </div>
                      <h3 className="font-bold text-ink-primary">
                        {res.display_name || res.resource_key}
                      </h3>
                      <code className="text-xs text-brand-600 font-mono bg-brand-50 px-1.5 py-0.5 rounded mt-1 self-start truncate max-w-full">
                        {res.resource_key}
                      </code>
                      {res.description && (
                        <p className="text-sm text-neutral-500 mt-3 mb-4 leading-relaxed flex-1">
                          {res.description}
                        </p>
                      )}
                      <div className="mt-auto pt-3 border-t border-canvas-subtle flex flex-wrap gap-1.5">
                        {resActions.map((act) => (
                          <ActionBadge key={act} action={act} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MATRIX TAB ── */}
      {tabState === "matrix" && (
        <div className="flex-1 flex flex-col overflow-hidden m-4">
          <div className="flex items-center justify-center mb-4 flex-shrink-0">
            <div className="bg-canvas-subtle p-1 rounded-xl border border-canvas-subtle flex shadow-inner">
              <button
                onClick={() => setMatrixMode("byRole")}
                className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${matrixMode === "byRole" ? "bg-white text-brand-600 shadow-soft" : "text-neutral-500 hover:text-ink-primary"}`}
              >
                <i className="fas fa-id-badge mr-2"></i> Group by Role
              </button>
              <button
                onClick={() => setMatrixMode("byResource")}
                className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${matrixMode === "byResource" ? "bg-white text-brand-600 shadow-soft" : "text-neutral-500 hover:text-ink-primary"}`}
              >
                <i className="fas fa-layer-group mr-2"></i> Group by Resource
              </button>
            </div>
          </div>
          <div className="flex-1 flex gap-4 overflow-hidden">
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
                      onClick={() => setMatrixRole(r.role_id)}
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
                      onClick={() => setMatrixResource(res.resource_key)}
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
      )}

      {/* ── AUDIT VIEW ── */}
      {tabState === "audit" && (
        <div className="flex-1 flex gap-4 overflow-hidden m-4">
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
          <div className="flex-1 bg-surface border border-canvas-subtle rounded-2xl shadow-soft flex flex-col overflow-hidden min-w-0">
            <div className="px-5 py-3 border-b border-canvas-subtle bg-canvas/40 flex items-center gap-3 flex-shrink-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                Effective Permissions
              </p>
            </div>
            {!auditUser ? (
              <EmptyState
                icon="fa-user-shield"
                title="Select a user on the left"
                sub="See all their effective permissions derived from assigned and inherited roles"
              />
            ) : auditLoading ? (
              <div className="flex justify-center py-16">
                <Spinner />
              </div>
            ) : auditData ? (
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
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
                              title="Granted indirectly via inheritance"
                            >
                              <i className="fas fa-shield-alt text-xs" />{" "}
                              {roles.find((r) => r.role_id === rId)
                                ?.role_name ?? rId}
                            </span>
                          ))}
                      </div>
                    </>
                  )}
                </div>
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
                        (acc[type] ??= []).push([
                          key,
                          Array.from(new Set(acts)),
                        ]);
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
                                />{" "}
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
                                      {resources.find(
                                        (r) => r.resource_key === key,
                                      )?.display_name || key}
                                      {isSystemResource({
                                        resource_key: key,
                                      }) && (
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
            ) : null}
          </div>
        </div>
      )}

      {/* ════ MODALS ════════════════════════════════════════════════════════ */}

      {modal === "delete" && deleteTarget && (
        <Modal
          title={`Delete ${deleteTarget.type.charAt(0).toUpperCase() + deleteTarget.type.slice(1)}`}
          onClose={() => {
            setModal(null);
            setDeleteTarget(null);
          }}
          footer={
            <ModalFooter
              onCancel={() => {
                setModal(null);
                setDeleteTarget(null);
              }}
              onSubmit={handleDeleteConfirm}
              saving={saving}
              label="Yes, permanently delete"
              isDanger={true}
            />
          }
        >
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex gap-3 text-rose-800">
              <i className="fas fa-exclamation-triangle mt-0.5 text-rose-500" />
              <div>
                <p className="font-bold text-sm mb-1">
                  Warning: This action cannot be undone.
                </p>
                <p className="text-sm">
                  {deleteTarget.type === "user" && (
                    <>
                      You are about to delete the user{" "}
                      <strong>{deleteTarget.item.user_id}</strong>. They will
                      permanently lose all system access and their assigned
                      roles will be unlinked.
                    </>
                  )}
                  {deleteTarget.type === "role" && (
                    <>
                      You are about to delete the role{" "}
                      <strong>{deleteTarget.item.role_name}</strong>. Users
                      holding this role will instantly lose its associated
                      permissions. Any role inheriting from this role will also
                      lose these cascading permissions.
                    </>
                  )}
                  {deleteTarget.type === "resource" && (
                    <>
                      You are about to delete the resource{" "}
                      <strong>{deleteTarget.item.resource_key}</strong>. All
                      policies governing this resource across all roles will be
                      permanently deleted. If this resource still exists in the
                      application code, it will become inaccessible to everyone.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="bg-canvas-subtle p-3 rounded-lg border border-canvas-subtle">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">
                Target Summary
              </p>
              <code className="text-sm font-mono text-ink-primary block break-all">
                ID:{" "}
                {deleteTarget.item.user_id ||
                  deleteTarget.item.role_id ||
                  deleteTarget.item.resource_key}
              </code>
            </div>
          </div>
        </Modal>
      )}

      {/* 🟢 Updated User Modal to handle Edit mode */}
      {modal === "user" && (
        <Modal
          title={isEditingUser ? "Edit User" : "Create New User"}
          onClose={() => setModal(null)}
          footer={
            <ModalFooter
              onCancel={() => setModal(null)}
              saving={saving}
              label={isEditingUser ? "Save Changes" : "Create User"}
              formId="user-form"
            />
          }
        >
          <form id="user-form" onSubmit={submitUser} className="space-y-3">
            <input
              required
              placeholder="User ID"
              disabled={isEditingUser} // Cannot change ID after creation
              className={`w-full border p-3 rounded-xl text-sm ${isEditingUser ? "bg-canvas-subtle border-canvas-subtle text-neutral-500 cursor-not-allowed" : "border-canvas-subtle"}`}
              value={userForm.userId}
              onChange={(e) =>
                setUserForm({
                  ...userForm,
                  userId: e.target.value.replace(/\s+/g, "_"),
                })
              }
            />
            <input
              required
              type="email"
              placeholder="Email"
              className="w-full border border-canvas-subtle p-3 rounded-xl text-sm"
              value={userForm.email}
              onChange={(e) =>
                setUserForm({ ...userForm, email: e.target.value })
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                placeholder="First Name"
                className="border border-canvas-subtle p-3 rounded-xl text-sm"
                value={userForm.firstName}
                onChange={(e) =>
                  setUserForm({ ...userForm, firstName: e.target.value })
                }
              />
              <input
                required
                placeholder="Last Name"
                className="border border-canvas-subtle p-3 rounded-xl text-sm"
                value={userForm.lastName}
                onChange={(e) =>
                  setUserForm({ ...userForm, lastName: e.target.value })
                }
              />
            </div>
          </form>
        </Modal>
      )}

      {/* 🟢 Updated Role Modal to handle Edit mode */}
      {modal === "role" && (
        <Modal
          title={isEditingRole ? "Edit Role" : "Create New Role"}
          onClose={() => setModal(null)}
          footer={
            <ModalFooter
              onCancel={() => setModal(null)}
              saving={saving}
              label={isEditingRole ? "Save Changes" : "Create Role"}
              formId="role-form"
            />
          }
        >
          <form id="role-form" onSubmit={submitRole} className="space-y-3">
            <input
              required
              placeholder="Role ID"
              disabled={isEditingRole} // Cannot change ID after creation
              className={`w-full border p-3 rounded-xl text-sm ${isEditingRole ? "bg-canvas-subtle border-canvas-subtle text-neutral-500 cursor-not-allowed" : "border-canvas-subtle"}`}
              value={roleForm.roleId}
              onChange={(e) =>
                setRoleForm({
                  ...roleForm,
                  roleId: e.target.value.replace(/\s+/g, "_"),
                })
              }
            />
            <input
              required
              placeholder="Display Name"
              className="w-full border border-canvas-subtle p-3 rounded-xl text-sm"
              value={roleForm.roleName}
              onChange={(e) =>
                setRoleForm({ ...roleForm, roleName: e.target.value })
              }
            />
            <textarea
              rows={2}
              placeholder="Description"
              className="w-full border border-canvas-subtle p-3 rounded-xl text-sm"
              value={roleForm.description}
              onChange={(e) =>
                setRoleForm({ ...roleForm, description: e.target.value })
              }
            />
          </form>
        </Modal>
      )}

      {modal === "resource" && (
        <Modal
          title={isEditingRes ? "Edit Resource" : "Register a Resource"}
          subtitle={
            isEditingRes
              ? "Update description or add new supported actions."
              : "Define what needs to be access-controlled."
          }
          onClose={() => setModal(null)}
          footer={
            <ModalFooter
              onCancel={() => setModal(null)}
              saving={saving}
              label={isEditingRes ? "Save Changes" : "Register"}
              formId="resource-form"
            />
          }
        >
          <form
            id="resource-form"
            onSubmit={submitResource}
            className="space-y-4"
          >
            <div
              className={isEditingRes ? "opacity-60 pointer-events-none" : ""}
            >
              <label className="text-xs font-bold text-ink-secondary uppercase tracking-wide block mb-2">
                Resource Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {RESOURCE_TYPES.map((rt) => (
                  <button
                    key={rt.value}
                    type="button"
                    onClick={() => {
                      setResType(rt.value);
                      setResKey(`${rt.value}:`);
                      setResActions(
                        actionsFor(rt.value).map((a) => ({
                          name: a,
                          description: "",
                        })),
                      );
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm font-bold transition-all text-left ${resType === rt.value ? "bg-brand-50 border-brand-300 text-brand-700" : "border-canvas-subtle text-ink-secondary hover:bg-canvas-subtle"}`}
                  >
                    <i
                      className={`fas ${rt.icon} w-4 text-center ${resType === rt.value ? "text-brand-500" : "text-neutral-400"}`}
                    />
                    <div className="text-xs font-bold leading-tight">
                      {rt.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <ResourceKeyBuilder
              value={resKey}
              type={resType}
              onChange={setResKey}
              disabled={isEditingRes}
            />
            <div>
              <label className="text-xs font-bold text-ink-secondary uppercase tracking-wide block mb-2">
                Display Name
              </label>
              <input
                required
                placeholder="e.g. Approve Order Button"
                className="w-full border border-canvas-subtle p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500"
                value={resDisplay}
                onChange={(e) => setResDisplay(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-ink-secondary uppercase tracking-wide block mb-2">
                Description
              </label>
              <textarea
                placeholder="What exactly does this resource control?"
                className="w-full border border-canvas-subtle p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                rows={2}
                value={resDesc}
                onChange={(e) => setResDesc(e.target.value)}
              />
            </div>
            <div className="pt-2 border-t border-canvas-subtle">
              <label className="text-xs font-bold text-ink-secondary uppercase tracking-wide flex items-center justify-between mb-3">
                <span>Supported Actions</span>
                <button
                  type="button"
                  onClick={() =>
                    setResActions([
                      ...resActions,
                      { name: "", description: "" },
                    ])
                  }
                  className="text-brand-600 hover:text-brand-800 text-[10px] bg-brand-50 px-2 py-1 rounded transition-colors"
                >
                  <i className="fas fa-plus mr-1"></i> Add Custom Action
                </button>
              </label>
              <div className="space-y-2 bg-canvas-subtle/30 p-3 rounded-xl border border-canvas-subtle max-h-48 overflow-y-auto">
                {resActions.length === 0 && (
                  <p className="text-xs text-neutral-400 italic text-center py-2">
                    No actions defined.
                  </p>
                )}
                {resActions.map((act, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      required
                      placeholder="e.g. export_pdf"
                      value={act.name}
                      onChange={(e) => {
                        const newActs = [...resActions];
                        newActs[i].name = e.target.value
                          .toLowerCase()
                          .replace(/\s+/g, "_");
                        setResActions(newActs);
                      }}
                      className="w-1/3 px-3 py-2 rounded-lg border border-canvas-subtle text-xs font-mono outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <input
                      placeholder="Optional description..."
                      value={act.description}
                      onChange={(e) => {
                        const newActs = [...resActions];
                        newActs[i].description = e.target.value;
                        setResActions(newActs);
                      }}
                      className="flex-1 px-3 py-2 rounded-lg border border-canvas-subtle text-xs outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newActs = [...resActions];
                        newActs.splice(i, 1);
                        setResActions(newActs);
                      }}
                      className="text-neutral-400 hover:text-rose-500 p-1.5 rounded transition-colors"
                    >
                      <i className="fas fa-times text-xs"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </Modal>
      )}

      {modal === "manageRoles" && roleTarget && (
        <Modal
          title="Manage Roles"
          subtitle={`${roleTarget.first_name} ${roleTarget.last_name}`}
          onClose={() => setModal(null)}
          footer={
            <ModalFooter
              onCancel={() => setModal(null)}
              onSubmit={saveUserRoles}
              saving={saving}
              label="Save Roles"
            />
          }
        >
          {userRolesLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <MultiRoleSelector
              allRoles={roles}
              selected={selectedRolesForUser}
              onChange={setSelectedRolesForUser}
              inheritedRoles={userInheritedRolesForModal}
            />
          )}
        </Modal>
      )}

      {modal === "manageInheritance" && roleTarget && (
        <Modal
          title="Manage Role Inheritance"
          subtitle={`Define which roles the [${roleTarget.role_name}] role inherits.`}
          onClose={() => setModal(null)}
          footer={
            <ModalFooter
              onCancel={() => setModal(null)}
              onSubmit={saveRoleInheritance}
              saving={saving}
              label="Save Inheritance"
            />
          }
        >
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-brand-800 leading-relaxed font-medium">
              Any user with the <strong>{roleTarget.role_name}</strong> role
              will automatically receive all permissions associated with the
              roles you select below.
            </p>
          </div>
          {inheritanceLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <MultiRoleSelector
              allRoles={roles}
              selected={selectedInheritedRoles}
              onChange={setSelectedInheritedRoles}
              disabledRoleIds={invalidRolesForInheritance}
            />
          )}
        </Modal>
      )}

      {/* 🟢 REACT FLOW HIERARCHY TREE */}
      {modal === "tree" && (
        <Modal
          title="Role Inheritance Hierarchy"
          subtitle="A visual map of how roles cascade permissions."
          onClose={() => setModal(null)}
          wide={true}
        >
          <div className="w-full h-full min-h-[500px] border border-canvas-subtle rounded-xl bg-canvas-subtle/20">
            {roles.length === 0 ? (
              <div className="p-8 text-center text-neutral-400">
                No roles defined.
              </div>
            ) : (
              <ReactFlow
                nodes={reactFlowNodes}
                edges={reactFlowEdges}
                fitView
                attributionPosition="bottom-right"
              >
                <Background color="#ccc" gap={16} />
                <Controls />
                <MiniMap
                  zoomable
                  pannable
                  nodeColor="#e2e8f0"
                  maskColor="rgba(0,0,0,0.1)"
                />
              </ReactFlow>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
