// src/features/iam/IamShared.tsx
// Reusable micro-components used across all IAM tabs.
// Keeping these in one file avoids 8 separate tiny files.

import React, { useEffect, useState } from "react";
import {
  getActionMeta,
  actionsFor,
  type ResourceType,
  RESOURCE_TYPES,
} from "./iam-constants";

// ─── Badge ───────────────────────────────────────────────────────────────────

export const Badge = ({
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

export const ActionBadge = ({ action }: { action: string }) => {
  const m = getActionMeta(action);
  return <Badge label={m.label} color={m.color} bg={m.bg} />;
};

// ─── Pill (tab button) ───────────────────────────────────────────────────────

export const Pill = ({
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

// ─── Toggle (permission checkbox) ────────────────────────────────────────────

export const Toggle = ({
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
          className={`block w-9 h-5 rounded-full transition-colors duration-200 ${
            isInherited && !checked ? "opacity-50" : ""
          }`}
          style={{ background: visuallyChecked ? m.color : "#d1d5db" }}
        />
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
            visuallyChecked ? "translate-x-4" : ""
          } flex items-center justify-center`}
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

// ─── Spinner ─────────────────────────────────────────────────────────────────

export const Spinner = () => (
  <i className="fas fa-circle-notch fa-spin text-brand-500" />
);

// ─── EmptyState ───────────────────────────────────────────────────────────────

export const EmptyState = ({
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

// ─── PanelHeader ─────────────────────────────────────────────────────────────

export const PanelHeader = ({
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

// ─── SearchInput ─────────────────────────────────────────────────────────────

export const SearchInput = ({
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

// ─── Modal ───────────────────────────────────────────────────────────────────

export const Modal = ({
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
      className={`bg-white rounded-2xl shadow-2xl w-full ${
        wide ? "max-w-5xl h-[80vh]" : "max-w-2xl max-h-[90vh]"
      } flex flex-col`}
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

// ─── ModalFooter ─────────────────────────────────────────────────────────────

export const ModalFooter = ({
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
      className={`px-5 py-2 text-white text-sm font-bold rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2 ${
        isDanger
          ? "bg-rose-500 hover:bg-rose-600"
          : "bg-brand-500 hover:bg-brand-600"
      }`}
    >
      {saving && <i className="fas fa-circle-notch fa-spin text-xs" />}
      {saving ? "Saving…" : label}
    </button>
  </div>
);

// ─── MultiRoleSelector ───────────────────────────────────────────────────────

export const MultiRoleSelector = ({
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
              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                checked ? "bg-brand-500 border-brand-500" : "border-neutral-300"
              }`}
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
                title="This user effectively has this role due to inheritance."
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

// ─── ResourceKeyBuilder ──────────────────────────────────────────────────────

export const ResourceKeyBuilder = ({
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
        className={`flex items-center gap-0 rounded-xl overflow-hidden border focus-within:ring-2 focus-within:ring-brand-500 ${
          disabled
            ? "bg-canvas-subtle border-canvas-subtle"
            : "border-canvas-active bg-white"
        }`}
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

// ─── DeleteConfirmModal ───────────────────────────────────────────────────────

export const DeleteConfirmModal = ({
  deleteTarget,
  onClose,
  onConfirm,
  saving,
}: {
  deleteTarget: { type: "user" | "role" | "resource"; item: any };
  onClose: () => void;
  onConfirm: () => void;
  saving: boolean;
}) => {
  const typeName =
    deleteTarget.type.charAt(0).toUpperCase() + deleteTarget.type.slice(1);
  const identifier =
    deleteTarget.item.user_id ??
    deleteTarget.item.role_id ??
    deleteTarget.item.resource_key;

  return (
    <Modal
      title={`Delete ${typeName}`}
      onClose={onClose}
      footer={
        <ModalFooter
          onCancel={onClose}
          onSubmit={onConfirm}
          saving={saving}
          label="Yes, permanently delete"
          isDanger
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
                  You are about to delete user <strong>{identifier}</strong>.
                  They will permanently lose all system access and their
                  assigned roles will be unlinked.
                </>
              )}
              {deleteTarget.type === "role" && (
                <>
                  You are about to delete role{" "}
                  <strong>{deleteTarget.item.role_name}</strong>. Users holding
                  this role will instantly lose its permissions, including
                  inherited ones.
                </>
              )}
              {deleteTarget.type === "resource" && (
                <>
                  You are about to delete resource <strong>{identifier}</strong>
                  . All policies governing this resource across all roles will
                  be permanently deleted.
                </>
              )}
            </p>
          </div>
        </div>
        <div className="bg-canvas-subtle p-3 rounded-lg border border-canvas-subtle">
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">
            Target
          </p>
          <code className="text-sm font-mono text-ink-primary block break-all">
            ID: {identifier}
          </code>
        </div>
      </div>
    </Modal>
  );
};
