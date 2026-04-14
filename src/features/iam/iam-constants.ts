// src/features/iam/iam-constants.ts
// Shared constants and pure helper functions for all IAM components

export const RESOURCE_TYPES = [
  { value: "page",      label: "Page / Route",    icon: "fa-file-alt",       actions: ["view"],                          hint: "A route or screen in the app" },
  { value: "button",    label: "Action Button",   icon: "fa-hand-pointer",   actions: ["view", "execute"],               hint: "A clickable button or action" },
  { value: "table",     label: "Data Table",      icon: "fa-table",          actions: ["view", "create", "edit", "delete"], hint: "A data grid or list" },
  { value: "column",    label: "Table Column",    icon: "fa-columns",        actions: ["view"],                          hint: "A specific column inside a table" },
  { value: "form",      label: "Form",            icon: "fa-wpforms",        actions: ["view", "execute"],               hint: "A form the user submits" },
  { value: "api",       label: "API Endpoint",    icon: "fa-plug",           actions: ["view", "execute"],               hint: "A backend endpoint" },
  { value: "workflow",  label: "Workflow Action", icon: "fa-project-diagram",actions: ["view", "execute"],               hint: "A process or workflow step" },
  { value: "component", label: "UI Component",    icon: "fa-layer-group",    actions: ["view"],                          hint: "A section, card, or panel" },
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number]["value"];

export const ORDERED_TYPES = [
  "page", "button", "table", "column", "form", "api", "workflow", "component",
];

export const ACTION_META: Record<string, { color: string; bg: string; label: string }> = {
  view:    { color: "#16a34a", bg: "#dcfce7", label: "View" },
  execute: { color: "#2563eb", bg: "#dbeafe", label: "Execute" },
  create:  { color: "#0891b2", bg: "#cffafe", label: "Create" },
  edit:    { color: "#d97706", bg: "#fef3c7", label: "Edit" },
  delete:  { color: "#dc2626", bg: "#fee2e2", label: "Delete" },
};

export function getActionMeta(action: string) {
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
  const hash = action.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const theme = customColors[hash % customColors.length];
  return {
    color: theme.color,
    bg: theme.bg,
    label: action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
  };
}

export function actionsFor(type: string): readonly string[] {
  return RESOURCE_TYPES.find((r) => r.value === type)?.actions ?? ["view"];
}

export function getDynamicActions(resource: any): string[] {
  if (resource.actions && Array.isArray(resource.actions) && resource.actions.length > 0) {
    return resource.actions.map((a: any) => a.action_name || a.name);
  }
  return [...actionsFor(resource.resource_type)];
}

export function isSystemResource(res: any): boolean {
  return (
    res.is_system === true ||
    res.resource_type?.toLowerCase() === "system" ||
    res.resource_key?.toLowerCase().startsWith("system:") ||
    res.resource_key?.toLowerCase().startsWith("system_")
  );
}