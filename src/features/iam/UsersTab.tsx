// src/features/iam/UsersTab.tsx
import React, { useState } from "react";
import DataGrid, { type Column } from "../../components/common/DataGrid";
import {
  createTenantUser,
  updateTenantUser,
  deactivateTenantUser,
  reactivateTenantUser,
  deleteTenantUser,
  fetchUserRoles,
  assignRoleToUser,
  removeRoleFromUser,
} from "./api";
import {
  Badge,
  Modal,
  ModalFooter,
  MultiRoleSelector,
  Spinner,
} from "./IamShared";
import { Secure } from "../../components/common/Secure";
import { usePermissions } from "../../hooks/PermissionContext"; // 🟢 1. Import permissions hook

interface UsersTabProps {
  users: any[];
  roles: any[];
  loading: boolean;
  saving: boolean;
  setSaving: (v: boolean) => void;
  onReload: () => void;
  onViewAudit: (userId: string) => void;
  onNotify: (msg: string, type: "success" | "error" | "info") => void;
  getEffectiveRoles: (startRoles: string[]) => string[];
}

type UserModal = "createEdit" | "manageRoles" | "delete" | null;

export default function UsersTab({
  users,
  roles,
  loading,
  saving,
  setSaving,
  onReload,
  onViewAudit,
  onNotify,
  getEffectiveRoles,
}: UsersTabProps) {
  const [modal, setModal] = useState<UserModal>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [roleTarget, setRoleTarget] = useState<any>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  // 🟢 2. Check if the current user has permission to MANAGE roles
  const { hasPermission } = usePermissions();
  const canManageRoles = hasPermission("module:access_control", "manage");

  const [form, setForm] = useState({
    userId: "",
    email: "",
    firstName: "",
    lastName: "",
  });

  // ─── Modal openers ──────────────────────────────────────────────────────

  const openCreate = () => {
    setIsEditing(false);
    setForm({ userId: "", email: "", firstName: "", lastName: "" });
    setModal("createEdit");
  };

  const openEdit = (u: any) => {
    setIsEditing(true);
    setForm({
      userId: u.user_id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
    });
    setModal("createEdit");
  };

  const openManageRoles = async (u: any) => {
    setRoleTarget(u);
    setRolesLoading(true);
    setModal("manageRoles");
    try {
      const r = await fetchUserRoles(u.user_id);
      setSelectedRoles(r);
    } catch {
      setSelectedRoles([]);
    } finally {
      setRolesLoading(false);
    }
  };

  const openDelete = (u: any) => {
    setDeleteTarget(u);
    setModal("delete");
  };

  const closeModal = () => setModal(null);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !isEditing &&
      users.some((u) => u.user_id.toLowerCase() === form.userId.toLowerCase())
    ) {
      return onNotify("User ID already exists.", "error");
    }
    const emailTaken = users.some(
      (u) =>
        u.email.toLowerCase() === form.email.toLowerCase() &&
        u.user_id !== form.userId,
    );
    if (emailTaken) return onNotify("Email already taken.", "error");

    setSaving(true);
    try {
      if (isEditing) {
        await updateTenantUser(form.userId, {
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
        });
        onNotify("User updated successfully", "success");
      } else {
        await createTenantUser({ ...form, metadata: {} });
        onNotify("User created successfully", "success");
      }
      closeModal();
      onReload();
    } catch (err: any) {
      onNotify(err?.response?.data?.message || "Failed to save user", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRoles = async () => {
    if (!roleTarget) return;
    setSaving(true);
    try {
      const current = await fetchUserRoles(roleTarget.user_id);
      const toAdd = selectedRoles.filter((r) => !current.includes(r));
      const toRemove = current.filter((r) => !selectedRoles.includes(r));
      await Promise.all([
        ...toAdd.map((r) => assignRoleToUser(roleTarget.user_id, r)),
        ...toRemove.map((r) => removeRoleFromUser(roleTarget.user_id, r)),
      ]);
      onNotify("Roles updated", "success");
      closeModal();
      onReload();
    } catch {
      onNotify("Failed to update roles", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteTenantUser(deleteTarget.user_id);
      onNotify("User deleted", "success");
      closeModal();
      onReload();
    } catch {
      onNotify("Failed to delete user", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (u: any) => {
    if (
      !window.confirm("Deactivate this user? They will not be able to log in.")
    )
      return;
    setSaving(true);
    try {
      await deactivateTenantUser(u.user_id);
      onNotify("User deactivated", "success");
      onReload();
    } catch {
      onNotify("Failed to deactivate", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async (u: any) => {
    setSaving(true);
    try {
      await reactivateTenantUser(u.user_id);
      onNotify("User reactivated", "success");
      onReload();
    } catch {
      onNotify("Failed to reactivate", "error");
    } finally {
      setSaving(false);
    }
  };

  // ─── Derived ────────────────────────────────────────────────────────────

  const inheritedRolesForModal = roleTarget
    ? getEffectiveRoles(selectedRoles).filter((r) => !selectedRoles.includes(r))
    : [];

  // ─── Columns ────────────────────────────────────────────────────────────

  const columns: Column<any>[] = [
    {
      header: "User",
      key: "first_name",
      sortable: true,
      render: (u) => {
        const fName = u?.first_name || "";
        const lName = u?.last_name || "";
        const initials =
          (fName[0] || "") + (lName[0] || "") || u?.email?.[0] || "?";
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-black flex-shrink-0">
              {initials.toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-ink-primary">
                {fName} {lName}
              </div>
              <div className="text-xs text-neutral-400 font-mono">
                {u?.user_id}
              </div>
            </div>
          </div>
        );
      },
    },
    { header: "Email", key: "email", sortable: true },
    {
      header: "Status",
      key: "is_active",
      sortable: true,
      render: (u) =>
        u?.is_active ? (
          <Badge label="Active" color="#16a34a" bg="#dcfce7" />
        ) : (
          <Badge label="Inactive" color="#dc2626" bg="#fee2e2" />
        ),
    },
    {
      header: "Roles",
      key: "rolesStr",
      sortable: true,
      render: (u) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {u?.rolesStr ? (
            u.rolesStr.split(", ").map((roleName: string, idx: number) => (
              <span
                key={idx}
                className="text-[10px] px-1.5 py-0.5 rounded bg-canvas-subtle text-neutral-600 font-bold border border-canvas-active truncate"
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
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (u) => (
        <div className="flex items-center justify-end">
          <div className="flex items-center bg-canvas-subtle/50 rounded-lg border border-canvas-subtle p-1 opacity-100 ">
            {/* 🟢 3. We revert this to 'read' so the button is ALWAYS clickable for users who can view the tab */}
            <Secure resource="module:users" action="read">
              <button
                onClick={() => openManageRoles(u)}
                disabled={saving}
                className="w-8 h-8 rounded flex items-center justify-center text-neutral-500 hover:bg-white hover:text-brand-600 hover:shadow-sm transition-all disabled:opacity-50"
                title={canManageRoles ? "Manage Roles" : "View Roles"}
              >
                <i
                  className={
                    canManageRoles ? "fas fa-user-tag" : "fas fa-user-shield"
                  }
                />
              </button>
            </Secure>

            <div className="w-px h-4 bg-neutral-300 mx-1" />

            <Secure resource="module:access_control" action="read">
              <button
                onClick={() => onViewAudit(u.user_id)}
                disabled={saving}
                className="w-8 h-8 rounded flex items-center justify-center text-neutral-500 hover:bg-white hover:text-brand-600 hover:shadow-sm transition-all disabled:opacity-50"
                title="View Effective Permissions"
              >
                <i className="fas fa-eye" />
              </button>
            </Secure>

            <Secure resource="module:users" action="manage">
              <button
                onClick={() => openEdit(u)}
                disabled={saving}
                className="w-8 h-8 rounded flex items-center justify-center text-neutral-500 hover:bg-white hover:text-brand-600 hover:shadow-sm transition-all disabled:opacity-50"
                title="Edit User"
              >
                <i className="fas fa-edit" />
              </button>
            </Secure>

            <div className="w-px h-4 bg-neutral-300 mx-1" />

            {u?.is_active ? (
              <Secure resource="module:users" action="manage">
                <button
                  onClick={() => handleDeactivate(u)}
                  disabled={saving}
                  className="w-8 h-8 rounded flex items-center justify-center text-neutral-500 hover:bg-status-warning hover:text-white hover:shadow-sm transition-all disabled:opacity-50"
                  title="Deactivate"
                >
                  <i className="fas fa-user-slash" />
                </button>
              </Secure>
            ) : (
              <Secure resource="module:users" action="manage">
                <button
                  onClick={() => handleReactivate(u)}
                  disabled={saving}
                  className="w-8 h-8 rounded flex items-center justify-center text-neutral-500 hover:bg-status-success hover:text-white hover:shadow-sm transition-all disabled:opacity-50"
                  title="Reactivate"
                >
                  <i className="fas fa-user-check" />
                </button>
              </Secure>
            )}

            <Secure resource="module:users" action="delete">
              <button
                onClick={() => openDelete(u)}
                disabled={saving}
                className="w-8 h-8 rounded flex items-center justify-center text-neutral-500 hover:bg-rose-500 hover:text-white hover:shadow-sm transition-all disabled:opacity-50 ml-1"
                title="Delete"
              >
                <i className="fas fa-trash-alt" />
              </button>
            </Secure>
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex-1 min-h-0 p-4">
        <DataGrid
          data={users}
          columns={columns}
          loading={loading}
          getRowId={(u) => u.user_id}
          searchFields={[
            "first_name",
            "last_name",
            "email",
            "user_id",
            "rolesStr",
          ]}
          headerActions={
            <Secure resource="module:users" action="manage">
              <button
                onClick={openCreate}
                className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-600 transition-colors flex items-center gap-2"
              >
                <i className="fas fa-plus" /> New User
              </button>
            </Secure>
          }
        />
      </div>

      {modal === "createEdit" && (
        <Secure resource="module:users" action="manage">
          <Modal
            title={isEditing ? "Edit User" : "Create New User"}
            onClose={closeModal}
            footer={
              <ModalFooter
                onCancel={closeModal}
                saving={saving}
                label={isEditing ? "Save Changes" : "Create User"}
                formId="user-form"
              />
            }
          >
            <form
              id="user-form"
              onSubmit={handleSubmitUser}
              className="space-y-3"
            >
              <input
                required
                placeholder="User ID"
                disabled={isEditing}
                className={`w-full border p-3 rounded-xl text-sm ${isEditing ? "bg-canvas-subtle border-canvas-subtle text-neutral-500 cursor-not-allowed" : "border-canvas-subtle"}`}
                value={form.userId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    userId: e.target.value.replace(/\s+/g, "_"),
                  })
                }
              />
              <input
                required
                type="email"
                placeholder="Email"
                className="w-full border border-canvas-subtle p-3 rounded-xl text-sm"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  placeholder="First Name"
                  className="border border-canvas-subtle p-3 rounded-xl text-sm"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                />
                <input
                  required
                  placeholder="Last Name"
                  className="border border-canvas-subtle p-3 rounded-xl text-sm"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                />
              </div>
            </form>
          </Modal>
        </Secure>
      )}

      {/* 🟢 4. The View/Manage Roles Modal */}
      {modal === "manageRoles" && roleTarget && (
        <Secure resource="module:users" action="read">
          <Modal
            title={canManageRoles ? "Manage Roles" : "View Assigned Roles"}
            subtitle={`${roleTarget.first_name} ${roleTarget.last_name}`}
            onClose={closeModal}
            footer={
              <ModalFooter
                onCancel={closeModal}
                // 🟢 5. Only attach the submit handler and show the Save button if they have permission
                onSubmit={canManageRoles ? handleSaveRoles : undefined}
                saving={saving}
                label={canManageRoles ? "Save Roles" : "Close"}
              />
            }
          >
            {rolesLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              // 🟢 6. Wrap the selector in a div that disables clicks and lowers opacity if they are read-only
              <div
                className={
                  !canManageRoles ? "pointer-events-none opacity-80" : ""
                }
              >
                {!canManageRoles && (
                  <div className="mb-4 p-3 bg-neutral-100 border border-neutral-200 rounded-lg text-xs text-neutral-600 flex items-center gap-2 font-medium">
                    <i className="fas fa-lock text-neutral-400" />
                    You only have permission to view roles, not change them.
                  </div>
                )}
                <MultiRoleSelector
                  allRoles={roles}
                  selected={selectedRoles}
                  onChange={setSelectedRoles}
                  inheritedRoles={inheritedRolesForModal}
                />
              </div>
            )}
          </Modal>
        </Secure>
      )}

      {modal === "delete" && deleteTarget && (
        <Secure resource="module:users" action="delete">
          <Modal
            title="Delete User"
            onClose={closeModal}
            footer={
              <ModalFooter
                onCancel={closeModal}
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
                You are about to permanently delete user{" "}
                <strong>{deleteTarget.user_id}</strong>. This cannot be undone.
              </p>
            </div>
          </Modal>
        </Secure>
      )}
    </>
  );
}
