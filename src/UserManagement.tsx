import React, { useState, useEffect, useCallback } from "react";
import {
  fetchTenantUsers,
  createTenantUser,
  deactivateTenantUser,
  fetchTenantRoles,
  createTenantRole,
  assignRoleToUser,
  removeRoleFromUser,
  fetchUserRoles,
  fetchTenantResources,
  createTenantResource,
  fetchRolePermissions,
  grantPermission,
  revokePermission,
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

function actionsFor(type: string) {
  return RESOURCE_TYPES.find((r) => r.value === type)?.actions ?? ["view"];
}

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
  const m = ACTION_META[action] ?? {
    color: "#64748b",
    bg: "#f1f5f9",
    label: action,
  };
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
    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
      active
        ? "bg-brand-500 text-white shadow-md"
        : "text-neutral-500 hover:text-ink-primary hover:bg-canvas-subtle"
    }`}
  >
    {children}
  </button>
);

const Toggle = ({
  checked,
  onChange,
  actionKey,
}: {
  checked: boolean;
  onChange: () => void;
  actionKey: string;
}) => {
  const m = ACTION_META[actionKey] ?? { color: "#6366f1", bg: "#eef2ff" };
  return (
    <label className="flex flex-col items-center gap-1 cursor-pointer select-none">
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={onChange}
        />
        <div
          className="block w-9 h-5 rounded-full transition-colors duration-200"
          style={{ background: checked ? m.color : "#d1d5db" }}
        />
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-4" : ""}`}
        />
      </div>
      <span
        className="text-[9px] font-black uppercase tracking-wider"
        style={{ color: checked ? m.color : "#9ca3af" }}
      >
        {actionKey}
      </span>
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

// ─── Guided Resource Key Builder ──────────────────────────────────────────────

const ResourceKeyBuilder = ({
  value,
  type,
  onChange,
}: {
  value: string;
  type: ResourceType;
  onChange: (key: string) => void;
}) => {
  const [name, setName] = useState(() => value.replace(`${type}:`, ""));

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_:]/g, "");

  const handleChange = (raw: string) => {
    const slug = slugify(raw);
    setName(slug);
    onChange(`${type}:${slug}`);
  };

  // Sync if parent type changes
  useEffect(() => {
    onChange(`${type}:${name}`);
  }, [type]);

  const preview = `${type}:${name || "<name>"}`;

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-ink-secondary uppercase tracking-wide">
        Resource Name
      </label>
      <div className="flex items-center gap-0 rounded-xl overflow-hidden border border-canvas-active focus-within:ring-2 focus-within:ring-brand-500">
        <span className="px-3 py-2.5 bg-canvas-subtle text-neutral-500 font-mono text-sm border-r border-canvas-active flex-shrink-0">
          {type}:
        </span>
        <input
          required
          placeholder="approve_order"
          className="flex-1 px-3 py-2.5 outline-none font-mono text-sm bg-white"
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

// ─── Multi-role checkbox selector ─────────────────────────────────────────────

const MultiRoleSelector = ({
  allRoles,
  selected,
  onChange,
}: {
  allRoles: any[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) => {
  const toggle = (id: string) => {
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
          No roles yet — create roles first.
        </p>
      )}
      {allRoles.map((r) => {
        const checked = selected.includes(r.role_id);
        return (
          <label
            key={r.role_id}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-canvas-subtle last:border-0 ${checked ? "bg-brand-50" : "hover:bg-canvas-subtle"}`}
          >
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? "bg-brand-500 border-brand-500" : "border-neutral-300"}`}
              onClick={() => toggle(r.role_id)}
            >
              {checked && <i className="fas fa-check text-white text-[10px]" />}
            </div>
            <div>
              <div className="font-bold text-sm text-ink-primary">
                {r.role_name}
              </div>
              <div className="text-xs text-neutral-400 font-mono">
                {r.role_id}
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
};

// ─── Modal shell ──────────────────────────────────────────────────────────────

const Modal = ({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) => (
  <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
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
      <div className="p-6 border-t border-canvas-subtle flex-shrink-0">
        {footer}
      </div>
    </div>
  </div>
);

const ModalFooter = ({
  onCancel,
  onSubmit,
  saving,
  label,
}: {
  onCancel: () => void;
  onSubmit?: () => void;
  saving: boolean;
  label: string;
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
      type={onSubmit ? "button" : "submit"}
      onClick={onSubmit}
      disabled={saving}
      className="px-5 py-2 bg-brand-500 text-white text-sm font-bold rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center gap-2"
    >
      {saving && <i className="fas fa-circle-notch fa-spin text-xs" />}
      {saving ? "Saving…" : label}
    </button>
  </div>
);

// ─── Section header inside a tab panel ───────────────────────────────────────

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

// ─── Simple search input ───────────────────────────────────────────────────────

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

type Tab = "users" | "roles" | "matrix" | "audit";

export default function UserManagement({
  addNotification,
}: {
  addNotification: (msg: string, type: "success" | "error" | "info") => void;
}) {
  const [tab, setTab] = useState<Tab>("users");

  // Core data
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Matrix state
  const [matrixRole, setMatrixRole] = useState<string | null>(null);
  const [rolePolicies, setRolePolicies] = useState<any[]>([]);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [resourceSearch, setResourceSearch] = useState("");

  // Audit state
  const [auditUser, setAuditUser] = useState<string | null>(null);
  const [auditData, setAuditData] = useState<{
    roles: string[];
    policies: any[];
  } | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // Modals
  const [modal, setModal] = useState<
    "user" | "role" | "resource" | "manageRoles" | null
  >(null);
  const [roleTarget, setRoleTarget] = useState<any | null>(null);
  const [userRolesLoading, setUserRolesLoading] = useState(false);
  const [selectedRolesForUser, setSelectedRolesForUser] = useState<string[]>(
    [],
  );
  const [saving, setSaving] = useState(false);

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
  const [resType, setResType] = useState<ResourceType>("button");
  const [resKey, setResKey] = useState("button:");
  const [resDisplay, setResDisplay] = useState("");
  const [resDesc, setResDesc] = useState("");

  // Search
  const [userSearch, setUserSearch] = useState("");
  const [roleSearch, setRoleSearch] = useState("");

  // ── Data loading ──────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r, res] = await Promise.all([
        fetchTenantUsers(),
        fetchTenantRoles(),
        fetchTenantResources(),
      ]);
      setUsers(u);
      setRoles(r);
      setResources(res);
    } catch {
      addNotification("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  // Load matrix policies
  useEffect(() => {
    if (!matrixRole) {
      setRolePolicies([]);
      return;
    }
    setMatrixLoading(true);
    fetchRolePermissions(matrixRole)
      .then(setRolePolicies)
      .catch(() => addNotification("Failed to load permissions", "error"))
      .finally(() => setMatrixLoading(false));
  }, [matrixRole]);

  // Load audit data
  useEffect(() => {
    if (!auditUser) {
      setAuditData(null);
      return;
    }
    setAuditLoading(true);
    fetchUserRoles(auditUser)
      .then(async (userRoles: string[]) => {
        // fetch policies for all roles
        const policyArrays = await Promise.all(
          userRoles.map((r) => fetchRolePermissions(r)),
        );
        const allPolicies = policyArrays.flat();
        setAuditData({ roles: userRoles, policies: allPolicies });
      })
      .catch(() => addNotification("Failed to load audit", "error"))
      .finally(() => setAuditLoading(false));
  }, [auditUser]);

  // ── Matrix helpers ────────────────────────────────────────────────────────

  const hasPerm = (key: string, action: string) =>
    rolePolicies.some((p) => p[2] === key && p[3] === action);

  const togglePerm = async (key: string, action: string, has: boolean) => {
    if (!matrixRole) return;
    const k = `${key}:${action}`;
    if (toggling.has(k)) return;
    setToggling((prev) => new Set(prev).add(k));
    try {
      if (has) {
        await revokePermission({
          roleId: matrixRole,
          resourceKey: key,
          action,
        });
        setRolePolicies((prev) =>
          prev.filter((p) => !(p[2] === key && p[3] === action)),
        );
      } else {
        await grantPermission({ roleId: matrixRole, resourceKey: key, action });
        setRolePolicies((prev) => [
          ...prev,
          [matrixRole, "tenant", key, action],
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

  // ── Form submit handlers ──────────────────────────────────────────────────

  const submitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createTenantUser({ ...userForm, metadata: {} });
      addNotification("User created", "success");
      setModal(null);
      setUserForm({ userId: "", email: "", firstName: "", lastName: "" });
      load();
    } catch {
      addNotification("Failed to create user", "error");
    } finally {
      setSaving(false);
    }
  };

  const submitRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createTenantRole(roleForm);
      addNotification("Role created", "success");
      setModal(null);
      setRoleForm({ roleId: "", roleName: "", description: "" });
      load();
    } catch {
      addNotification("Failed to create role", "error");
    } finally {
      setSaving(false);
    }
  };

  const submitResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createTenantResource({
        resourceKey: resKey,
        resourceType: resType,
        displayName: resDisplay,
        description: resDesc,
      });
      addNotification("Resource registered", "success");
      setModal(null);
      setResType("button");
      setResKey("button:");
      setResDisplay("");
      setResDesc("");
      load();
    } catch {
      addNotification("Failed to register resource", "error");
    } finally {
      setSaving(false);
    }
  };

  // Open manage-roles modal
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
      // Get current roles to diff
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

  // ── Derived ───────────────────────────────────────────────────────────────

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

  // Group resources by type for matrix
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

  // For audit: group policies by resource key
  const auditByResource =
    auditData?.policies.reduce<Record<string, string[]>>((acc, p) => {
      (acc[p[2]] ??= []).push(p[3]);
      return acc;
    }, {}) ?? {};

  // selected role info
  const selectedRoleInfo = roles.find((r) => r.role_id === matrixRole);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-canvas overflow-hidden">
      {/* ── Top bar ── */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 flex items-center justify-between border-b border-canvas-subtle bg-surface">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">
            Identity & Access
          </h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            Users, roles, and resource-level permissions
          </p>
        </div>
        <div className="flex bg-canvas-subtle p-1 rounded-xl border border-canvas-subtle">
          {(
            [
              ["users", "Users", "fa-users"],
              ["roles", "Roles", "fa-id-badge"],
              ["matrix", "Permissions", "fa-th"],
              ["audit", "Access View", "fa-eye"],
            ] as [Tab, string, string][]
          ).map(([t, label, icon]) => (
            <Pill key={t} active={tab === t} onClick={() => setTab(t)}>
              <i className={`fas ${icon} mr-1.5`} />
              {label}
            </Pill>
          ))}
        </div>
      </div>

      {/* ── USERS ─────────────────────────────────────────────────────────── */}
      {tab === "users" && (
        <div className="flex-1 flex flex-col overflow-hidden bg-surface m-4 rounded-2xl border border-canvas-subtle shadow-soft">
          <PanelHeader
            title={`Users (${users.length})`}
            action={
              <div className="flex items-center gap-3">
                <SearchInput
                  value={userSearch}
                  onChange={setUserSearch}
                  placeholder="Search users…"
                />
                <button
                  onClick={() => setModal("user")}
                  className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-600 transition-colors flex items-center gap-2"
                >
                  <i className="fas fa-plus" /> New User
                </button>
              </div>
            }
          />
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-16">
                <Spinner />
              </div>
            ) : filteredUsers.length === 0 ? (
              <EmptyState
                icon="fa-users"
                title="No users found"
                sub="Create your first user to get started"
              />
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-canvas-subtle/60 sticky top-0">
                  <tr>
                    {["User", "Email", "Status", "Roles", "Actions"].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-left px-5 py-3 text-xs font-black uppercase tracking-wide text-neutral-500 border-b border-canvas-subtle"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, i) => (
                    <tr
                      key={u.user_id}
                      className={`border-b border-canvas-subtle hover:bg-canvas-subtle/30 transition-colors ${i % 2 === 0 ? "" : "bg-canvas/40"}`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-black flex-shrink-0">
                            {(u.first_name?.[0] ?? u.email[0]).toUpperCase()}
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
                      </td>
                      <td className="px-5 py-3 text-neutral-600">{u.email}</td>
                      <td className="px-5 py-3">
                        {u.is_active ? (
                          <Badge label="Active" color="#16a34a" bg="#dcfce7" />
                        ) : (
                          <Badge
                            label="Inactive"
                            color="#dc2626"
                            bg="#fee2e2"
                          />
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => openManageRoles(u)}
                          className="text-brand-600 hover:text-brand-800 text-xs font-bold flex items-center gap-1"
                        >
                          <i className="fas fa-user-tag" /> Manage Roles
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3 justify-end">
                          <button
                            onClick={() => {
                              setAuditUser(u.user_id);
                              setTab("audit");
                            }}
                            className="text-neutral-500 hover:text-brand-600 text-xs font-bold transition-colors"
                          >
                            <i className="fas fa-eye mr-1" />
                            View Perms
                          </button>
                          {u.is_active && (
                            <button
                              onClick={async () => {
                                if (!window.confirm("Deactivate this user?"))
                                  return;
                                try {
                                  await deactivateTenantUser(u.user_id);
                                  addNotification(
                                    "User deactivated",
                                    "success",
                                  );
                                  load();
                                } catch {
                                  addNotification("Failed", "error");
                                }
                              }}
                              className="text-status-error hover:underline text-xs font-bold"
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── ROLES ─────────────────────────────────────────────────────────── */}
      {tab === "roles" && (
        <div className="flex-1 flex flex-col overflow-hidden bg-surface m-4 rounded-2xl border border-canvas-subtle shadow-soft">
          <PanelHeader
            title={`Roles (${roles.length})`}
            action={
              <div className="flex items-center gap-3">
                <SearchInput
                  value={roleSearch}
                  onChange={setRoleSearch}
                  placeholder="Search roles…"
                />
                <button
                  onClick={() => setModal("role")}
                  className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-600 transition-colors flex items-center gap-2"
                >
                  <i className="fas fa-plus" /> New Role
                </button>
              </div>
            }
          />
          <div className="flex-1 overflow-y-auto">
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
              <div className="p-4 grid grid-cols-1 gap-3">
                {filteredRoles.map((r) => (
                  <div
                    key={r.role_id}
                    className="flex items-center justify-between p-4 rounded-xl border border-canvas-subtle bg-canvas/20 hover:bg-canvas-subtle/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-shield-alt" />
                      </div>
                      <div>
                        <div className="font-bold text-ink-primary">
                          {r.role_name}
                        </div>
                        <code className="text-xs font-mono text-neutral-400 bg-canvas-subtle px-1.5 py-0.5 rounded">
                          {r.role_id}
                        </code>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {r.description && (
                        <span className="text-sm text-neutral-400 max-w-xs truncate">
                          {r.description}
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setMatrixRole(r.role_id);
                          setTab("matrix");
                        }}
                        className="text-brand-600 hover:text-brand-800 text-xs font-bold px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 transition-colors"
                      >
                        <i className="fas fa-key mr-1" />
                        Edit Permissions
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PERMISSION MATRIX ─────────────────────────────────────────────── */}
      {tab === "matrix" && (
        <div className="flex-1 flex gap-4 overflow-hidden m-4">
          {/* Role sidebar */}
          <div className="w-64 bg-surface border border-canvas-subtle rounded-2xl shadow-soft flex flex-col overflow-hidden flex-shrink-0">
            <div className="px-4 py-3 border-b border-canvas-subtle bg-canvas/40">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                Select Role
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="flex justify-center pt-8">
                  <Spinner />
                </div>
              ) : roles.length === 0 ? (
                <p className="p-4 text-xs text-neutral-400 italic">
                  No roles yet.
                </p>
              ) : (
                roles.map((r) => (
                  <button
                    key={r.role_id}
                    onClick={() => setMatrixRole(r.role_id)}
                    className={`w-full text-left px-3 py-3 rounded-xl mb-1 transition-all border ${
                      matrixRole === r.role_id
                        ? "bg-brand-50 border-brand-200"
                        : "border-transparent hover:bg-canvas-subtle"
                    }`}
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
                ))
              )}
            </div>
          </div>

          {/* Matrix panel */}
          <div className="flex-1 bg-surface border border-canvas-subtle rounded-2xl shadow-soft flex flex-col overflow-hidden min-w-0">
            <div className="px-5 py-3 border-b border-canvas-subtle bg-canvas/40 flex items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  Permissions
                  {selectedRoleInfo && (
                    <span className="ml-2 text-brand-600 normal-case tracking-normal font-bold text-sm">
                      — {selectedRoleInfo.role_name}
                    </span>
                  )}
                </p>
                {matrixLoading && <Spinner />}
              </div>
              <div className="flex items-center gap-2">
                <SearchInput
                  value={resourceSearch}
                  onChange={setResourceSearch}
                  placeholder="Filter resources…"
                />
                <button
                  onClick={() => setModal("resource")}
                  className="px-3 py-1.5 bg-canvas-subtle text-ink-primary text-xs font-bold rounded-lg border border-neutral-300 hover:bg-neutral-200 transition-colors whitespace-nowrap"
                >
                  <i className="fas fa-plus mr-1" />
                  Register Resource
                </button>
              </div>
            </div>

            {!matrixRole ? (
              <EmptyState
                icon="fa-hand-pointer"
                title="Select a role on the left"
                sub="Then toggle permissions for each resource"
              />
            ) : filteredResources.length === 0 ? (
              <EmptyState
                icon="fa-layer-group"
                title={
                  resources.length === 0
                    ? "No resources registered"
                    : "No resources match filter"
                }
                sub={
                  resources.length === 0
                    ? "Click Register Resource to add one"
                    : undefined
                }
              />
            ) : (
              <div className="flex-1 overflow-y-auto">
                {ORDERED_TYPES.filter((t) => byType[t]?.length).map((type) => {
                  const typeInfo = RESOURCE_TYPES.find(
                    (r) => r.value === type,
                  )!;
                  return (
                    <div key={type}>
                      <div className="px-5 py-2 bg-canvas-subtle/70 border-y border-canvas-subtle sticky top-0 z-10 flex items-center gap-2">
                        <i
                          className={`fas ${typeInfo.icon} text-xs text-neutral-500`}
                        />
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                          {type}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          ({byType[type].length})
                        </span>
                      </div>
                      {byType[type].map((res) => {
                        const actions = actionsFor(res.resource_type);
                        return (
                          <div
                            key={res.resource_key}
                            className="flex items-center gap-4 px-5 py-3.5 border-b border-canvas-subtle hover:bg-canvas-subtle/20 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm text-ink-primary truncate">
                                {res.display_name || res.resource_key}
                              </div>
                              <code className="text-xs text-neutral-400 font-mono">
                                {res.resource_key}
                              </code>
                            </div>
                            <div className="flex items-center gap-6 flex-shrink-0">
                              {actions.map((action) => {
                                const has = hasPerm(res.resource_key, action);
                                const k = `${res.resource_key}:${action}`;
                                return (
                                  <div
                                    key={action}
                                    className={
                                      toggling.has(k)
                                        ? "opacity-40 pointer-events-none"
                                        : ""
                                    }
                                  >
                                    <Toggle
                                      checked={has}
                                      onChange={() =>
                                        togglePerm(
                                          res.resource_key,
                                          action,
                                          has,
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
          </div>
        </div>
      )}

      {/* ── AUDIT VIEW ────────────────────────────────────────────────────── */}
      {tab === "audit" && (
        <div className="flex-1 flex gap-4 overflow-hidden m-4">
          {/* User sidebar */}
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
                    className={`w-full text-left px-3 py-3 rounded-xl mb-1 transition-all border ${
                      auditUser === u.user_id
                        ? "bg-brand-50 border-brand-200"
                        : "border-transparent hover:bg-canvas-subtle"
                    }`}
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

          {/* Audit panel */}
          <div className="flex-1 bg-surface border border-canvas-subtle rounded-2xl shadow-soft flex flex-col overflow-hidden min-w-0">
            <div className="px-5 py-3 border-b border-canvas-subtle bg-canvas/40 flex items-center gap-3 flex-shrink-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                Effective Permissions
                {auditUser && (
                  <span className="ml-2 text-brand-600 normal-case tracking-normal font-bold text-sm">
                    — {users.find((u) => u.user_id === auditUser)?.first_name}
                  </span>
                )}
              </p>
              {auditLoading && <Spinner />}
              <div className="ml-auto flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-neutral-300" />
                <span className="text-xs text-neutral-400 italic">
                  Read-only view
                </span>
              </div>
            </div>

            {!auditUser ? (
              <EmptyState
                icon="fa-user-shield"
                title="Select a user on the left"
                sub="See all their effective permissions derived from assigned roles"
              />
            ) : auditLoading ? (
              <div className="flex justify-center py-16">
                <Spinner />
              </div>
            ) : auditData ? (
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Roles summary */}
                <div className="bg-canvas-subtle/50 rounded-xl p-4 border border-canvas-subtle">
                  <p className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-3">
                    Assigned Roles ({auditData.roles.length})
                  </p>
                  {auditData.roles.length === 0 ? (
                    <p className="text-sm text-neutral-400 italic">
                      No roles assigned to this user.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {auditData.roles.map((rId) => {
                        const role = roles.find((r) => r.role_id === rId);
                        return (
                          <span
                            key={rId}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 border border-brand-200 text-brand-700 text-sm font-bold rounded-lg"
                          >
                            <i className="fas fa-shield-alt text-xs" />
                            {role?.role_name ?? rId}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Effective permissions */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-3">
                    Effective Permissions ({Object.keys(auditByResource).length}{" "}
                    resources)
                  </p>
                  {Object.keys(auditByResource).length === 0 ? (
                    <div className="text-sm text-neutral-400 italic p-4 bg-canvas-subtle rounded-xl">
                      No permissions. Assign a role with permissions configured
                      in the Permissions tab.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {(() => {
                        // group by resource type prefix
                        const grouped = Object.entries(auditByResource).reduce<
                          Record<string, [string, string[]][]>
                        >((acc, [key, acts]) => {
                          const type = key.split(":")[0] ?? "other";
                          (acc[type] ??= []).push([key, acts]);
                          return acc;
                        }, {});
                        return ORDERED_TYPES.filter(
                          (t) => grouped[t]?.length,
                        ).map((type) => {
                          const typeInfo = RESOURCE_TYPES.find(
                            (r) => r.value === type,
                          );
                          return (
                            <div
                              key={type}
                              className="rounded-xl border border-canvas-subtle overflow-hidden"
                            >
                              <div className="px-4 py-2 bg-canvas-subtle/70 flex items-center gap-2">
                                <i
                                  className={`fas ${typeInfo?.icon ?? "fa-dot-circle"} text-xs text-neutral-500`}
                                />
                                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                                  {type}
                                </span>
                              </div>
                              {grouped[type].map(([key, acts]) => {
                                const res = resources.find(
                                  (r) => r.resource_key === key,
                                );
                                return (
                                  <div
                                    key={key}
                                    className="flex items-center justify-between px-4 py-3 border-t border-canvas-subtle hover:bg-canvas-subtle/30"
                                  >
                                    <div>
                                      <div className="font-bold text-sm text-ink-primary">
                                        {res?.display_name || key}
                                      </div>
                                      <code className="text-xs text-neutral-400 font-mono">
                                        {key}
                                      </code>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      {acts.map((a) => (
                                        <ActionBadge key={a} action={a} />
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ════ MODALS ════════════════════════════════════════════════════════ */}

      {/* Create User */}
      {modal === "user" && (
        <Modal
          title="Create New User"
          onClose={() => setModal(null)}
          footer={
            <ModalFooter
              onCancel={() => setModal(null)}
              saving={saving}
              label="Create User"
            />
          }
        >
          <form id="user-form" onSubmit={submitUser} className="space-y-3">
            <input
              required
              placeholder="User ID  (e.g. john_doe)"
              className="w-full border border-canvas-subtle p-3 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-brand-500"
              value={userForm.userId}
              onChange={(e) =>
                setUserForm({ ...userForm, userId: e.target.value })
              }
            />
            <p className="text-xs text-neutral-400 -mt-2 ml-1">
              Unique identifier used in Casbin policies.
            </p>
            <input
              required
              type="email"
              placeholder="Email address"
              className="w-full border border-canvas-subtle p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500"
              value={userForm.email}
              onChange={(e) =>
                setUserForm({ ...userForm, email: e.target.value })
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                placeholder="First name"
                className="border border-canvas-subtle p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500"
                value={userForm.firstName}
                onChange={(e) =>
                  setUserForm({ ...userForm, firstName: e.target.value })
                }
              />
              <input
                required
                placeholder="Last name"
                className="border border-canvas-subtle p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500"
                value={userForm.lastName}
                onChange={(e) =>
                  setUserForm({ ...userForm, lastName: e.target.value })
                }
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Create Role */}
      {modal === "role" && (
        <Modal
          title="Create New Role"
          subtitle="Roles group permissions — assign roles to users."
          onClose={() => setModal(null)}
          footer={
            <ModalFooter
              onCancel={() => setModal(null)}
              saving={saving}
              label="Create Role"
            />
          }
        >
          <form onSubmit={submitRole} className="space-y-3">
            <div>
              <input
                required
                placeholder="Role ID  (e.g. finance_manager)"
                className="w-full border border-canvas-subtle p-3 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-brand-500"
                value={roleForm.roleId}
                onChange={(e) =>
                  setRoleForm({ ...roleForm, roleId: e.target.value })
                }
              />
              <p className="text-xs text-neutral-400 mt-1 ml-1">
                Use snake_case — this is the Casbin role key.
              </p>
            </div>
            <input
              required
              placeholder="Display name  (e.g. Finance Manager)"
              className="w-full border border-canvas-subtle p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500"
              value={roleForm.roleName}
              onChange={(e) =>
                setRoleForm({ ...roleForm, roleName: e.target.value })
              }
            />
            <textarea
              rows={2}
              placeholder="Description (optional)"
              className="w-full border border-canvas-subtle p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              value={roleForm.description}
              onChange={(e) =>
                setRoleForm({ ...roleForm, description: e.target.value })
              }
            />
          </form>
        </Modal>
      )}

      {/* Register Resource — guided builder */}
      {modal === "resource" && (
        <Modal
          title="Register a Resource"
          subtitle="Define what needs to be access-controlled."
          onClose={() => setModal(null)}
          footer={
            <ModalFooter
              onCancel={() => setModal(null)}
              saving={saving}
              label="Register"
            />
          }
        >
          <form onSubmit={submitResource} className="space-y-4">
            {/* Type picker */}
            <div>
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
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm font-bold transition-all text-left ${
                      resType === rt.value
                        ? "bg-brand-50 border-brand-300 text-brand-700"
                        : "border-canvas-subtle text-ink-secondary hover:bg-canvas-subtle"
                    }`}
                  >
                    <i
                      className={`fas ${rt.icon} w-4 text-center ${resType === rt.value ? "text-brand-500" : "text-neutral-400"}`}
                    />
                    <div>
                      <div className="text-xs font-bold leading-tight">
                        {rt.label}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-neutral-400 mt-2 ml-1">
                <i className="fas fa-info-circle mr-1" />
                {RESOURCE_TYPES.find((r) => r.value === resType)?.hint}
              </p>
            </div>

            {/* Smart key builder */}
            <ResourceKeyBuilder
              value={resKey}
              type={resType}
              onChange={setResKey}
            />

            {/* Display name */}
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

            {/* Actions preview */}
            <div className="bg-canvas-subtle/60 rounded-xl p-3 border border-canvas-subtle">
              <p className="text-xs font-bold text-neutral-500 mb-2">
                This resource will support these actions:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {actionsFor(resType).map((a) => (
                  <ActionBadge key={a} action={a} />
                ))}
              </div>
            </div>

            <textarea
              rows={2}
              placeholder="Where is this used? (optional)"
              className="w-full border border-canvas-subtle p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              value={resDesc}
              onChange={(e) => setResDesc(e.target.value)}
            />
          </form>
        </Modal>
      )}

      {/* Manage User Roles — multi-select */}
      {modal === "manageRoles" && roleTarget && (
        <Modal
          title="Manage Roles"
          subtitle={`${roleTarget.first_name} ${roleTarget.last_name} · ${roleTarget.user_id}`}
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
          <p className="text-xs text-neutral-400">
            Check all roles this user should have. Unchecking removes the role.
          </p>
          {userRolesLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <MultiRoleSelector
              allRoles={roles}
              selected={selectedRolesForUser}
              onChange={setSelectedRolesForUser}
            />
          )}
          {selectedRolesForUser.length > 0 && (
            <div className="bg-brand-50 rounded-xl p-3 border border-brand-100">
              <p className="text-xs font-bold text-brand-700 mb-2">
                Will be assigned:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedRolesForUser.map((rId) => {
                  const r = roles.find((ro) => ro.role_id === rId);
                  return (
                    <Badge
                      key={rId}
                      label={r?.role_name ?? rId}
                      color="#1d4ed8"
                      bg="#dbeafe"
                    />
                  );
                })}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
