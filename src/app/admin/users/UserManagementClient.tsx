"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, X, Save, Loader2 } from "lucide-react";
import type { UserWithRoles, Role } from "@/lib/db-types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UserManagementClientProps {
  initialUsers: UserWithRoles[];
  roles: Role[];
}

const createEmptyFormState = () => ({
  username: "",
  email: "",
  name: "",
  password: "",
  role_ids: [] as number[],
  is_active: true,
});

const allowedRoles = new Set([
  "admin",
  "super user",  // Use lowercase for case-insensitive matching
  "fi",
  "eg",
  "ca",
  "hu",
  "marine",
  "ac",
  "en",
  "li",
]);

export default function UserManagementClient({ initialUsers, roles }: UserManagementClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState(createEmptyFormState());

  const resetForm = () => setFormData(createEmptyFormState());

  const handleCreate = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create user");
      }

      const newUser = await response.json();
      setUsers([newUser, ...users]);
      setShowCreateForm(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (userId: number) => {
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update user");
      }

      const updatedUser = await response.json();
      setUsers(users.map(u => u.id === userId ? updatedUser : u));
      setEditingUser(null);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete user");
      }

      setUsers(users.filter(u => u.id !== userId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (user: UserWithRoles) => {
    setEditingUser(user.id);
    setFormData({
      username: user.username,
      email: user.email,
      name: user.name,
      password: "",
      role_ids: user.roles.map(r => r.id),
      is_active: user.is_active,
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setShowCreateForm(false);
    resetForm();
  };

  const toggleRole = (roleId: number) => {
    setFormData(prev => ({
      ...prev,
      role_ids: prev.role_ids.includes(roleId)
        ? prev.role_ids.filter(id => id !== roleId)
        : [...prev.role_ids, roleId],
    }));
  };

  return (
    <div className="space-y-6 text-white">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">User Directory</h1>
          <p className="text-white/70">
            Provision, audit, and retire access for Kuwait Re portals.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            resetForm();
            setShowCreateForm(true);
          }}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          <Plus className="h-4 w-4" />
          Add user
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {showCreateForm && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Create a new administrator</h2>
              <p className="text-sm text-white/70">Set credentials and assign roles.</p>
            </div>
            <button onClick={cancelEdit} className="text-white/70 transition hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              {[
                { label: "Username", key: "username", type: "text" },
                { label: "Email", key: "email", type: "email" },
                { label: "Full name", key: "name", type: "text" },
                { label: "Password", key: "password", type: "password" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-xs uppercase tracking-wide text-white/60">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={(formData[field.key as keyof typeof formData] as string) || ''}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <label className="text-xs uppercase tracking-wide text-white/60">Assign roles</label>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="space-y-3 text-sm">
                  {roles
                    .filter((role) => allowedRoles.has(role.name.toLowerCase()))
                    .sort((a, b) => {
                      // Sort: admin first, then Super User, then business roles
                      if (a.name.toLowerCase() === 'admin') return -1;
                      if (b.name.toLowerCase() === 'admin') return 1;
                      if (a.name.toLowerCase() === 'super user') return -1;
                      if (b.name.toLowerCase() === 'super user') return 1;
                      return a.name.localeCompare(b.name);
                    })
                    .map((role) => (
                    <label key={role.id} className="flex items-start gap-3 cursor-pointer hover:bg-white/5 p-2 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.role_ids.includes(role.id)}
                        onChange={() => toggleRole(role.id)}
                        className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent text-white focus:ring-white/40 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="font-semibold text-white text-sm">
                          {role.description || role.name}
                        </span>
                        <span className="text-xs uppercase tracking-wide text-white/40 mt-0.5">
                          {role.name}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gray-700 to-gray-800 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:scale-[1.01] hover:from-gray-600 hover:to-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Create user
              </button>
            </div>
          </div>
        </div>
      )}

      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-[0.3em] text-white/60">
            User Accounts
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-b hover:bg-muted/30">
                    {editingUser === user.id ? (
                      <TableCell colSpan={4}>
                        <div className="space-y-5 p-4">
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-2">
                              <label className="block text-xs font-medium uppercase tracking-wide text-white/70">
                                Username
                              </label>
                              <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
                                placeholder="Enter username"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="block text-xs font-medium uppercase tracking-wide text-white/70">
                                Email
                              </label>
                              <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
                                placeholder="Enter email"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="block text-xs font-medium uppercase tracking-wide text-white/70">
                                Full Name
                              </label>
                              <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
                                placeholder="Enter full name"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-xs font-medium uppercase tracking-wide text-white/70">
                              New Password (optional)
                            </label>
                            <input
                              type="password"
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                              className="w-full max-w-md rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
                              placeholder="Leave empty to keep current password"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-xs font-medium uppercase tracking-wide text-white/70">
                              Roles
                            </label>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {roles
                                .filter((role) => allowedRoles.has(role.name.toLowerCase()))
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((role) => (
                                  <label
                                    key={role.id}
                                    className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 transition hover:bg-white/10"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={formData.role_ids.includes(role.id)}
                                      onChange={() => toggleRole(role.id)}
                                      className="h-4 w-4 rounded border-white/30 bg-transparent text-white focus:ring-white/40"
                                    />
                                    <div className="flex flex-col leading-tight">
                                      <span className="text-sm font-medium text-white">
                                        {role.description || role.name}
                                      </span>
                                      <span className="text-[11px] uppercase tracking-wide text-white/50">
                                        {role.name}
                                      </span>
                                    </div>
                                  </label>
                                ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={formData.is_active}
                              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                              className="h-4 w-4 rounded border-white/30 bg-transparent text-white focus:ring-white/40"
                            />
                            <label className="text-sm font-medium text-white/80">
                              Active
                            </label>
                          </div>
                          <div className="flex flex-wrap gap-3 pt-2">
                            <button
                              onClick={() => handleUpdate(user.id)}
                              disabled={loading}
                              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-gray-700 to-gray-800 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:scale-[1.01] hover:from-gray-600 hover:to-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
                            >
                              <X className="h-4 w-4" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      </TableCell>
                    ) : (
                      <>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-white">@{user.username}</span>
                            <span className="text-sm text-white/80">{user.name}</span>
                            <span className="text-xs text-white/60">{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {user.roles.map((role) => (
                              <span
                                key={role.id}
                                className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/80"
                              >
                                {role.name}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              user.is_active
                                ? "bg-emerald-400/20 text-emerald-200"
                                : "bg-red-400/20 text-red-200"
                            }`}
                          >
                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          <div className="flex gap-3">
                            <button
                              onClick={() => startEdit(user)}
                              className="text-white/80 transition hover:text-white"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="text-red-300 transition hover:text-red-100"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

