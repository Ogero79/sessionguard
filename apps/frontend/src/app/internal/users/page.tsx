"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Search,
  Shield,
  User,
  X,
  Mail,
  Lock,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface ManagedUser {
  id: string;
  email: string;
  displayName: string;
  role: "USER" | "ADMIN";
  createdAt: string;
  updatedAt: string;
}

export default function UserManagementPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Form State
  const [formEmail, setFormEmail] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<"USER" | "ADMIN">("USER");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ManagedUser[]>("/api/user");
      if (res.success && res.data) {
        setUsers(res.data);
      } else {
        setError(res.error || "Failed to load users");
      }
    } catch (err) {
      setError("An unexpected error occurred while loading users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    fetchUsers();
  }, [token, router]);

  // Temporary message dismiss timer
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (!user || user.role !== "ADMIN") {
    return (
      <AppShell>
        <div className="flex h-[60vh] flex-col items-center justify-center text-center">
          <Shield className="h-12 w-12 text-danger-500 mb-4 animate-bounce" />
          <h2 className="text-xl font-bold text-ink-900">Access Denied</h2>
          <p className="text-ink-500 max-w-md mt-2">
            You do not have the required administrative privileges to view this page.
          </p>
        </div>
      </AppShell>
    );
  }

  const handleOpenCreate = () => {
    setModalMode("create");
    setSelectedUserId(null);
    setFormEmail("");
    setFormDisplayName("");
    setFormPassword("");
    setFormRole("USER");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (managedUser: ManagedUser) => {
    setModalMode("edit");
    setSelectedUserId(managedUser.id);
    setFormEmail(managedUser.email);
    setFormDisplayName(managedUser.displayName);
    setFormPassword(""); // blank password means unchanged
    setFormRole(managedUser.role);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitLoading(true);

    // Basic Validation
    if (!formEmail.trim() || !formDisplayName.trim()) {
      setFormError("Email and Display Name are required");
      setSubmitLoading(false);
      return;
    }

    if (modalMode === "create" && !formPassword) {
      setFormError("Password is required for new users");
      setSubmitLoading(false);
      return;
    }

    if (formPassword && formPassword.length < 8) {
      setFormError("Password must be at least 8 characters long");
      setSubmitLoading(false);
      return;
    }

    try {
      const payload: any = {
        email: formEmail.trim(),
        displayName: formDisplayName.trim(),
        role: formRole,
      };
      if (formPassword) {
        payload.password = formPassword;
      }

      let res;
      if (modalMode === "create") {
        res = await api.post<ManagedUser>("/api/user", payload);
      } else {
        res = await api.put<ManagedUser>(`/api/user/${selectedUserId}`, payload);
      }

      if (res.success) {
        setSuccessMsg(
          modalMode === "create"
            ? "User created successfully."
            : "User updated successfully."
        );
        setIsModalOpen(false);
        fetchUsers();
      } else {
        setFormError(res.error || "Failed to save user details");
      }
    } catch (err) {
      setFormError("An error occurred while saving.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    setDeleteLoading(true);
    try {
      const res = await api.delete<null>(`/api/user/${id}`);
      if (res.success) {
        setSuccessMsg("User deleted successfully.");
        setDeleteConfirmId(null);
        fetchUsers();
      } else {
        setError(res.error || "Failed to delete user");
      }
    } catch (err) {
      setError("An error occurred while deleting the user.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filters
  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query)
    );
  });

  const totalUsers = users.length;
  const adminUsers = users.filter((u) => u.role === "ADMIN").length;
  const standardUsers = users.filter((u) => u.role === "USER").length;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 border-b border-surface-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-50 border border-brand-200 rounded-xl">
              <Users className="w-6 h-6 text-brand-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-ink-900">User Management</h1>
              <p className="text-xs text-ink-500 mt-0.5">
                Create, update, and manage administrative roles and user accounts.
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenCreate}
            className="btn-primary self-start sm:self-auto text-xs py-2 px-3.5"
          >
            <UserPlus className="w-4 h-4" /> Add User
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-ink-500 uppercase tracking-wider font-semibold font-medium">Total Users</span>
              <p className="text-2xl font-bold text-ink-900 mt-1">{loading ? "..." : totalUsers}</p>
            </div>
            <div className="p-2 bg-brand-50 text-brand-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="card p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-ink-500 uppercase tracking-wider font-semibold font-medium">Admin Roles</span>
              <p className="text-2xl font-bold text-purple-600 mt-1">{loading ? "..." : adminUsers}</p>
            </div>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <div className="card p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-ink-500 uppercase tracking-wider font-semibold font-medium">Standard Users</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{loading ? "..." : standardUsers}</p>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <User className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Global Notifications */}
        {successMsg && (
          <div className="mb-5 rounded-lg bg-emerald-50 border border-emerald-300 px-4 py-3 text-sm text-emerald-950 flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-lg bg-danger-50 border border-danger-300 px-4 py-3 text-sm text-danger-950 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-danger-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter / Search Bar */}
        <div className="card p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              className="input pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* User Table Card */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-ink-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-2"></div>
              <p className="text-sm">Loading user directory...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16 text-ink-400 italic">
              No users found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-200 text-xs font-semibold uppercase tracking-wider text-ink-500">
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Created At</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 text-[13px]">
                  {filteredUsers.map((u) => {
                    const isSelf = u.id === user.id;
                    const initials = u.displayName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <tr key={u.id} className="hover:bg-surface-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-50 text-brand-700 font-bold text-xs">
                              {initials}
                            </div>
                            <div>
                              <p className="font-semibold text-ink-900 flex items-center gap-1.5">
                                {u.displayName}
                                {isSelf && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-800 font-medium">
                                    You
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-ink-500">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                              u.role === "ADMIN"
                                ? "bg-purple-50 text-purple-700 border-purple-100"
                                : "bg-surface-100 text-ink-700 border-surface-200"
                            }`}
                          >
                            {u.role === "ADMIN" ? (
                              <>
                                <Shield className="w-3.5 h-3.5" /> Admin
                              </>
                            ) : (
                              <>
                                <User className="w-3.5 h-3.5" /> Standard
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-ink-500 font-mono">
                          {new Date(u.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 hover:bg-surface-100 rounded-lg text-ink-500 hover:text-brand-600 transition-colors"
                              title="Edit user details"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(u.id)}
                              disabled={isSelf}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isSelf
                                  ? "text-ink-300 cursor-not-allowed opacity-50"
                                  : "text-ink-500 hover:bg-surface-100 hover:text-danger-600"
                              }`}
                              title={isSelf ? "You cannot delete yourself" : "Delete user"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CREATE & EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-surface-200 w-full max-w-md shadow-lg">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-surface-200 px-5 py-4">
              <h2 className="font-bold text-ink-900 text-[15px]">
                {modalMode === "create" ? "Add New User Account" : "Edit User Account Details"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-ink-400 hover:text-ink-700 rounded-lg hover:bg-surface-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit}>
              <div className="p-5 space-y-4">
                {formError && (
                  <div className="rounded-lg bg-danger-50 border border-danger-200 px-4 py-2.5 text-xs text-danger-700">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="label">Display Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                    <input
                      type="text"
                      className="input pl-10"
                      placeholder="Jane Doe"
                      value={formDisplayName}
                      onChange={(e) => setFormDisplayName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                    <input
                      type="email"
                      className="input pl-10"
                      placeholder="jane@company.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label">
                    {modalMode === "create" ? "Password" : "New Password (optional)"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                    <input
                      type="password"
                      className="input pl-10"
                      placeholder={
                        modalMode === "create"
                          ? "Minimum 8 characters"
                          : "Leave blank to keep unchanged"
                      }
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      required={modalMode === "create"}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Access Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormRole("USER")}
                      className={`flex items-center justify-center gap-2 py-2 px-3 border rounded-lg text-xs font-semibold transition-all ${
                        formRole === "USER"
                          ? "bg-brand-50 border-brand-500 text-brand-700"
                          : "bg-white border-surface-200 text-ink-600 hover:bg-surface-50"
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      Standard User
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormRole("ADMIN")}
                      disabled={modalMode === "edit" && selectedUserId === user.id}
                      className={`flex items-center justify-center gap-2 py-2 px-3 border rounded-lg text-xs font-semibold transition-all ${
                        formRole === "ADMIN"
                          ? "bg-purple-50 border-purple-500 text-purple-700"
                          : "bg-white border-surface-200 text-ink-600 hover:bg-surface-50"
                      } ${
                        modalMode === "edit" && selectedUserId === user.id
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                      title={
                        modalMode === "edit" && selectedUserId === user.id
                          ? "You cannot demote yourself"
                          : ""
                      }
                    >
                      <Shield className="w-3.5 h-3.5" />
                      Administrator
                    </button>
                  </div>
                  {modalMode === "edit" && selectedUserId === user.id && (
                    <p className="text-[10px] text-ink-400 mt-1.5 italic">
                      Note: You cannot modify your own administrative role.
                    </p>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-surface-200 px-5 py-4 bg-surface-50 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="btn-primary py-2 text-xs font-semibold"
                >
                  {submitLoading ? "Saving..." : "Save User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-surface-200 w-full max-w-sm p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-danger-50 text-danger-600 rounded-lg shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-ink-900 text-sm">Delete Account</h3>
                <p className="text-xs text-ink-500 mt-1 leading-relaxed">
                  Are you sure you want to permanently delete this user account? All of their sessions and data will be lost. This action is irreversible.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-5 border-t border-surface-100 pt-4">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleteLoading}
                className="btn-secondary py-1.5 px-3 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(deleteConfirmId)}
                disabled={deleteLoading}
                className="btn-danger py-1.5 px-3 text-xs font-semibold"
              >
                {deleteLoading ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
