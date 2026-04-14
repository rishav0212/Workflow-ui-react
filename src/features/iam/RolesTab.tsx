// src/features/iam/RolesTab.tsx
import React, { useMemo, useState } from "react";
import {
  ReactFlow, Background, Controls, MiniMap, MarkerType, type Edge, type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  createTenantRole, updateTenantRole, deleteTenantRole,
  addRoleInheritance, removeRoleInheritance, fetchRoleInheritance,
} from "./api";
import { EmptyState, Modal, ModalFooter, MultiRoleSelector, PanelHeader, SearchInput, Spinner } from "./IamShared";

interface RolesTabProps {
  roles: any[];
  loading: boolean;
  saving: boolean;
  setSaving: (v: boolean) => void;
  roleInheritanceMap: Record<string, string[]>;
  onReload: () => void;
  onEditPermissions: (roleId: string) => void;
  onNotify: (msg: string, type: "success" | "error" | "info") => void;
  getEffectiveRoles: (startRoles: string[]) => string[];
}

type RoleModal = "createEdit" | "manageInheritance" | "delete" | "tree" | null;

export default function RolesTab({
  roles, loading, saving, setSaving, roleInheritanceMap,
  onReload, onEditPermissions, onNotify, getEffectiveRoles,
}: RolesTabProps) {

  const [modal, setModal] = useState<RoleModal>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [roleTarget, setRoleTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [selectedInherited, setSelectedInherited] = useState<string[]>([]);
  const [inheritanceLoading, setInheritanceLoading] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");

  const [form, setForm] = useState({ roleId: "", roleName: "", description: "" });

  const openCreate = () => {
    setIsEditing(false);
    setForm({ roleId: "", roleName: "", description: "" });
    setModal("createEdit");
  };

  const openEdit = (r: any) => {
    setIsEditing(true);
    setForm({ roleId: r.role_id, roleName: r.role_name, description: r.description || "" });
    setModal("createEdit");
  };

  const openInheritance = async (r: any) => {
    setRoleTarget(r);
    setInheritanceLoading(true);
    setModal("manageInheritance");
    try {
      const inherited = await fetchRoleInheritance(r.role_id);
      setSelectedInherited(inherited);
    } catch {
      setSelectedInherited([]);
    } finally {
      setInheritanceLoading(false);
    }
  };

  const closeModal = () => setModal(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing && roles.some((r) => r.role_id.toLowerCase() === form.roleId.toLowerCase())) {
      return onNotify("Role ID already exists.", "error");
    }
    setSaving(true);
    try {
      if (isEditing) {
        await updateTenantRole(form.roleId, { roleName: form.roleName, description: form.description });
        onNotify("Role updated", "success");
      } else {
        await createTenantRole(form);
        onNotify("Role created", "success");
      }
      closeModal();
      onReload();
    } catch {
      onNotify("Failed to save role", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteTenantRole(deleteTarget.role_id);
      onNotify("Role deleted", "success");
      closeModal();
      onReload();
    } catch {
      onNotify("Failed to delete role", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInheritance = async () => {
    if (!roleTarget) return;
    setSaving(true);
    try {
      const current = await fetchRoleInheritance(roleTarget.role_id);
      const toAdd = selectedInherited.filter((r) => !current.includes(r));
      const toRemove = current.filter((r) => !selectedInherited.includes(r));
      await Promise.all([
        ...toAdd.map((r) => addRoleInheritance(roleTarget.role_id, r)),
        ...toRemove.map((r) => removeRoleInheritance(roleTarget.role_id, r)),
      ]);
      onNotify("Role inheritance updated", "success");
      closeModal();
      onReload();
    } catch {
      onNotify("Failed to update inheritance", "error");
    } finally {
      setSaving(false);
    }
  };

  const invalidForInheritance = roleTarget
    ? roles.filter((r) => {
        if (r.role_id === roleTarget.role_id) return true;
        return getEffectiveRoles([r.role_id]).includes(roleTarget.role_id);
      }).map((r) => r.role_id)
    : [];

  const filteredRoles = roles.filter((r) =>
    `${r.role_name} ${r.role_id} ${r.description ?? ""}`.toLowerCase().includes(roleSearch.toLowerCase()),
  );

  // React Flow tree
  const { reactFlowNodes, reactFlowEdges } = useMemo(() => {
    if (modal !== "tree") return { reactFlowNodes: [], reactFlowEdges: [] };
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodeDepths: Record<string, number> = {};

    const getDepth = (roleId: string, visited = new Set<string>()): number => {
      if (visited.has(roleId)) return 0;
      visited.add(roleId);
      const parents = Object.entries(roleInheritanceMap)
        .filter(([, children]) => children.includes(roleId))
        .map(([parent]) => parent);
      if (parents.length === 0) return 0;
      return Math.max(...parents.map((p) => getDepth(p, new Set(visited)))) + 1;
    };

    roles.forEach((r) => { nodeDepths[r.role_id] = getDepth(r.role_id); });

    const levels: Record<number, string[]> = {};
    Object.entries(nodeDepths).forEach(([id, depth]) => { (levels[depth] ??= []).push(id); });

    roles.forEach((r) => {
      const depth = nodeDepths[r.role_id];
      const idx = levels[depth].indexOf(r.role_id);
      const xOffset = (idx - (levels[depth].length - 1) / 2) * 250;
      nodes.push({
        id: r.role_id,
        position: { x: xOffset, y: depth * 150 },
        data: {
          label: (
            <div className="flex flex-col items-center p-2 min-w-[120px]">
              <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-2 border border-brand-200">
                <i className="fas fa-shield-alt text-xs" />
              </div>
              <strong className="text-xs text-ink-primary font-bold">{r.role_name}</strong>
              <code className="text-[9px] text-neutral-400 mt-1">{r.role_id}</code>
            </div>
          ),
        },
        type: "default",
        style: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0/0.1)" },
      });
      (roleInheritanceMap[r.role_id] || []).forEach((childId) => {
        edges.push({
          id: `e-${r.role_id}-${childId}`,
          source: r.role_id, target: childId, animated: true,
          style: { stroke: "#94a3b8", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
        });
      });
    });
    return { reactFlowNodes: nodes, reactFlowEdges: edges };
  }, [modal, roles, roleInheritanceMap]);

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden bg-surface m-4 rounded-2xl border border-canvas-subtle shadow-soft">
        <PanelHeader
          title={`Roles (${roles.length})`}
          action={
            <div className="flex items-center gap-3">
              <button onClick={() => setModal("tree")} className="bg-white border border-canvas-subtle text-ink-primary px-4 py-2 rounded-lg text-sm font-bold hover:bg-canvas-subtle transition-colors flex items-center gap-2 mr-2">
                <i className="fas fa-sitemap text-brand-500" /> View Hierarchy
              </button>
              <SearchInput value={roleSearch} onChange={setRoleSearch} placeholder="Search roles…" />
              <button onClick={openCreate} className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-600 transition-colors flex items-center gap-2">
                <i className="fas fa-plus" /> New Role
              </button>
            </div>
          }
        />
        <div className="flex-1 overflow-y-auto p-4">
          {loading
            ? <div className="flex justify-center py-16"><Spinner /></div>
            : filteredRoles.length === 0
              ? <EmptyState icon="fa-id-badge" title="No roles yet" sub="Create a role to start assigning permissions" />
              : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {filteredRoles.map((r) => {
                    const inheritedCount = (roleInheritanceMap[r.role_id] || []).length;
                    return (
                      <div key={r.role_id} className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-canvas-subtle bg-canvas/20 hover:bg-canvas-subtle/30 transition-colors group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                            <i className="fas fa-shield-alt text-sm" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-ink-primary truncate text-sm">{r.role_name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <code className="text-[10px] font-mono text-neutral-400 bg-canvas-subtle px-1.5 py-0.5 rounded truncate">{r.role_id}</code>
                              {inheritedCount > 0 && <span className="text-[10px] text-neutral-500 font-bold flex items-center gap-1" title="Inherits from other roles"><i className="fas fa-link" /> {inheritedCount}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openInheritance(r)} disabled={saving} className="text-neutral-500 hover:text-brand-700 bg-white border border-canvas-subtle hover:border-brand-300 w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm disabled:opacity-50" title="Manage Inheritance">
                            <i className="fas fa-project-diagram" />
                          </button>
                          <button onClick={() => onEditPermissions(r.role_id)} disabled={saving} className="text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm disabled:opacity-50" title="Edit Permissions">
                            <i className="fas fa-key" />
                          </button>
                          <div className="w-px h-5 bg-canvas-subtle mx-1" />
                          <button onClick={() => openEdit(r)} disabled={saving} className="text-neutral-500 hover:text-brand-600 bg-white border border-canvas-subtle hover:border-brand-300 w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm disabled:opacity-50" title="Edit Role">
                            <i className="fas fa-edit" />
                          </button>
                          <button onClick={() => { setDeleteTarget(r); setModal("delete"); }} disabled={saving} className="text-neutral-400 hover:text-rose-600 hover:bg-rose-50 w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50" title="Delete Role">
                            <i className="fas fa-trash-alt" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
          }
        </div>
      </div>

      {/* Create / Edit */}
      {modal === "createEdit" && (
        <Modal title={isEditing ? "Edit Role" : "Create New Role"} onClose={closeModal}
          footer={<ModalFooter onCancel={closeModal} saving={saving} label={isEditing ? "Save Changes" : "Create Role"} formId="role-form" />}>
          <form id="role-form" onSubmit={handleSubmit} className="space-y-3">
            <input required placeholder="Role ID (lowercase_underscores)" disabled={isEditing}
              className={`w-full border p-3 rounded-xl text-sm ${isEditing ? "bg-canvas-subtle border-canvas-subtle text-neutral-500 cursor-not-allowed" : "border-canvas-subtle"}`}
              value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value.replace(/\s+/g, "_") })} />
            <input required placeholder="Display Name" className="w-full border border-canvas-subtle p-3 rounded-xl text-sm"
              value={form.roleName} onChange={(e) => setForm({ ...form, roleName: e.target.value })} />
            <textarea rows={2} placeholder="Description" className="w-full border border-canvas-subtle p-3 rounded-xl text-sm"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </form>
        </Modal>
      )}

      {/* Manage Inheritance */}
      {modal === "manageInheritance" && roleTarget && (
        <Modal title="Manage Role Inheritance" subtitle={`Define which roles [${roleTarget.role_name}] inherits.`} onClose={closeModal}
          footer={<ModalFooter onCancel={closeModal} onSubmit={handleSaveInheritance} saving={saving} label="Save Inheritance" />}>
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-brand-800 font-medium">Any user with the <strong>{roleTarget.role_name}</strong> role will automatically receive all permissions of the roles selected below.</p>
          </div>
          {inheritanceLoading
            ? <div className="flex justify-center py-8"><Spinner /></div>
            : <MultiRoleSelector allRoles={roles} selected={selectedInherited} onChange={setSelectedInherited} disabledRoleIds={invalidForInheritance} />
          }
        </Modal>
      )}

      {/* Delete */}
      {modal === "delete" && deleteTarget && (
        <Modal title="Delete Role" onClose={closeModal}
          footer={<ModalFooter onCancel={closeModal} onSubmit={handleDelete} saving={saving} label="Yes, permanently delete" isDanger />}>
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex gap-3 text-rose-800">
            <i className="fas fa-exclamation-triangle mt-0.5 text-rose-500" />
            <p className="text-sm">Deleting <strong>{deleteTarget.role_name}</strong> will remove all user assignments and Casbin policies for this role. This cannot be undone.</p>
          </div>
        </Modal>
      )}

      {/* Hierarchy Tree */}
      {modal === "tree" && (
        <Modal title="Role Inheritance Hierarchy" subtitle="A visual map of how roles cascade permissions." onClose={closeModal} wide>
          <div className="w-full h-full min-h-[500px] border border-canvas-subtle rounded-xl bg-canvas-subtle/20">
            {roles.length === 0
              ? <div className="p-8 text-center text-neutral-400">No roles defined.</div>
              : <ReactFlow nodes={reactFlowNodes} edges={reactFlowEdges} fitView attributionPosition="bottom-right">
                  <Background color="#ccc" gap={16} />
                  <Controls />
                  <MiniMap zoomable pannable nodeColor="#e2e8f0" maskColor="rgba(0,0,0,0.1)" />
                </ReactFlow>
            }
          </div>
        </Modal>
      )}
    </>
  );
}