// src/features/iam/ResourcesTab.tsx
import React, { useState } from "react";
import {
  createTenantResource,
  deleteTenantResource,
  addCustomActionToResource,
} from "./api";
import {
  ActionBadge,
  EmptyState,
  Modal,
  ModalFooter,
  PanelHeader,
  ResourceKeyBuilder,
  SearchInput,
} from "./IamShared";
import {
  actionsFor,
  getDynamicActions,
  isSystemResource,
  RESOURCE_TYPES,
  type ResourceType,
} from "./iam-constants";

interface ResourcesTabProps {
  resources: any[];
  loading: boolean;
  saving: boolean;
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
  onReload: () => void | Promise<void>;
  onNotify: (msg: string, type: "success" | "error" | "info") => void;
}

type ResModal = "createEdit" | "delete" | null;

export default function ResourcesTab({
  resources,
  loading,
  saving,
  setSaving,
  onReload,
  onNotify,
}: ResourcesTabProps) {
  const [modal, setModal] = useState<ResModal>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [resourceSearch, setResourceSearch] = useState("");

  const [resType, setResType] = useState<ResourceType>("button");
  const [resKey, setResKey] = useState("button:");
  const [resDisplay, setResDisplay] = useState("");
  const [resDesc, setResDesc] = useState("");
  const [resActions, setResActions] = useState<
    { name: string; description: string }[]
  >(() =>
    actionsFor("button").map((a) => ({ name: a as string, description: "" })),
  );

  const openCreate = () => {
    setIsEditing(false);
    setResType("button");
    setResKey("button:");
    setResDisplay("");
    setResDesc("");
    setResActions(
      actionsFor("button").map((a) => ({ name: a as string, description: "" })),
    );
    setModal("createEdit");
  };

  const openEdit = (res: any) => {
    setIsEditing(true);
    setResType(res.resource_type);
    setResKey(res.resource_key);
    setResDisplay(res.display_name || "");
    setResDesc(res.description || "");
    setResActions(
      getDynamicActions(res).map((a) => ({ name: a, description: "" })),
    );
    setModal("createEdit");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !isEditing &&
      resources.some(
        (r) => r.resource_key.toLowerCase() === resKey.toLowerCase(),
      )
    ) {
      return onNotify("Resource key already exists.", "error");
    }
    const valid = resActions.filter((a) => a.name.trim() !== "");
    if (valid.length === 0)
      return onNotify("You must define at least one action.", "error");

    setSaving(true);
    try {
      await createTenantResource({
        resourceKey: resKey,
        resourceType: resType,
        displayName: resDisplay,
        description: resDesc,
        actions: valid,
      });
      for (const act of valid) {
        await addCustomActionToResource(resKey, {
          actionName: act.name,
          description: act.description,
        });
      }
      onNotify(
        isEditing ? "Resource updated" : "Resource registered",
        "success",
      );
      setModal(null);
      onReload();
    } catch {
      onNotify("Failed to save resource", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteTenantResource(deleteTarget.resource_key);
      onNotify("Resource deleted", "success");
      setModal(null);
      onReload();
    } catch {
      onNotify("Failed to delete resource", "error");
    } finally {
      setSaving(false);
    }
  };

  const filtered = resources.filter((r) =>
    `${r.resource_key} ${r.display_name ?? ""}`
      .toLowerCase()
      .includes(resourceSearch.toLowerCase()),
  );

  return (
    <>
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
                onClick={openCreate}
                className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-600 transition-colors flex items-center gap-2"
              >
                <i className="fas fa-plus" /> Register Resource
              </button>
            </div>
          }
        />
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <EmptyState icon="fa-layer-group" title="No resources found" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((res) => {
                const typeInfo = RESOURCE_TYPES.find(
                  (rt) => rt.value === res.resource_type,
                );
                const actions = getDynamicActions(res);
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
                        <span className="ml-auto flex items-center gap-1.5 text-neutral-400 bg-canvas-subtle border border-canvas-subtle px-2.5 py-1 rounded-md text-[10px] uppercase font-bold">
                          <i className="fas fa-lock text-xs" /> System
                        </span>
                      ) : (
                        <div className="ml-auto flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(res)}
                            disabled={saving}
                            className="text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 w-7 h-7 rounded-md flex items-center justify-center text-xs transition-colors disabled:opacity-50"
                            title="Edit"
                          >
                            <i className="fas fa-edit" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteTarget(res);
                              setModal("delete");
                            }}
                            disabled={saving}
                            className="text-neutral-500 hover:text-rose-600 hover:bg-rose-50 w-7 h-7 rounded-md flex items-center justify-center text-xs transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <i className="fas fa-trash-alt" />
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
                      {actions.map((act) => (
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

      {modal === "createEdit" && (
        <Modal
          title={isEditing ? "Edit Resource" : "Register a Resource"}
          subtitle={
            isEditing
              ? "Update description or add new supported actions."
              : "Define what needs to be access-controlled."
          }
          onClose={() => setModal(null)}
          footer={
            <ModalFooter
              onCancel={() => setModal(null)}
              saving={saving}
              label={isEditing ? "Save Changes" : "Register"}
              formId="resource-form"
            />
          }
        >
          <form
            id="resource-form"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className={isEditing ? "opacity-60 pointer-events-none" : ""}>
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
                          name: a as string,
                          description: "",
                        })),
                      );
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm font-bold transition-all text-left ${resType === rt.value ? "bg-brand-50 border-brand-300 text-brand-700" : "border-canvas-subtle text-ink-secondary hover:bg-canvas-subtle"}`}
                  >
                    <i
                      className={`fas ${rt.icon} w-4 text-center ${resType === rt.value ? "text-brand-500" : "text-neutral-400"}`}
                    />
                    <span className="text-xs font-bold leading-tight">
                      {rt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <ResourceKeyBuilder
              value={resKey}
              type={resType}
              onChange={setResKey}
              disabled={isEditing}
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
                  className="text-brand-600 hover:text-brand-800 text-[10px] bg-brand-50 px-2 py-1 rounded"
                >
                  <i className="fas fa-plus mr-1" /> Add Custom Action
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
                        const n = [...resActions];
                        n[i].name = e.target.value
                          .toLowerCase()
                          .replace(/\s+/g, "_");
                        setResActions(n);
                      }}
                      className="w-1/3 px-3 py-2 rounded-lg border border-canvas-subtle text-xs font-mono outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <input
                      placeholder="Optional description..."
                      value={act.description}
                      onChange={(e) => {
                        const n = [...resActions];
                        n[i].description = e.target.value;
                        setResActions(n);
                      }}
                      className="flex-1 px-3 py-2 rounded-lg border border-canvas-subtle text-xs outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const n = [...resActions];
                        n.splice(i, 1);
                        setResActions(n);
                      }}
                      className="text-neutral-400 hover:text-rose-500 p-1.5 rounded"
                    >
                      <i className="fas fa-times text-xs" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </Modal>
      )}

      {modal === "delete" && deleteTarget && (
        <Modal
          title="Delete Resource"
          onClose={() => setModal(null)}
          footer={
            <ModalFooter
              onCancel={() => setModal(null)}
              onSubmit={handleDelete}
              saving={saving}
              label="Yes, permanently delete"
              isDanger
            />
          }
        >
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex gap-3 text-rose-800">
            <i className="fas fa-exclamation-triangle mt-0.5 text-rose-500" />
            <p className="text-sm">
              Deleting <strong>{deleteTarget.resource_key}</strong> will remove
              all associated Casbin policies across all roles. This cannot be
              undone.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
