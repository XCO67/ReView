"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Plus, Trash2, X, Save, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Role } from "@/lib/db-types";

interface RoleManagementClientProps {
  initialRoles: Role[];
}

export default function RoleManagementClient({ initialRoles }: RoleManagementClientProps) {
  const router = useRouter();
  const [roles, setRoles] = useState(initialRoles);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setError("Role name is required");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create role");
      }

      const newRole = await response.json();
      setRoles([...roles, newRole]);
      setShowCreateForm(false);
      setFormData({ name: "", description: "" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create role");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (roleId: number) => {
    if (!confirm("Are you sure you want to delete this role? This will remove it from all users.")) return;

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/roles/${roleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete role");
      }

      setRoles(roles.filter(r => r.id !== roleId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-white">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Role Directory</h1>
          <p className="text-white/70">Shape access policies and operational guardrails.</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          <Plus className="h-4 w-4" />
          New role
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
              <h2 className="text-xl font-semibold">Create new role</h2>
              <p className="text-sm text-white/70">Provide a clear name and describe its scope.</p>
            </div>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-white/70 transition hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-white/60">Role name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Compliance Lead"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-white/60">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the role's permissions and access level"
                rows={4}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gray-700 to-gray-800 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:scale-[1.01] hover:from-gray-600 hover:to-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Create role
            </button>
          </div>
        </div>
      )}

      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-[0.3em] text-white/60">
            Current Roles
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id} className="border-b hover:bg-muted/30">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-white/10 p-2 text-white">
                          <Shield className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-base font-semibold text-white">
                            {role.description || role.name}
                          </span>
                          <span className="text-xs uppercase tracking-wide text-white/40">
                            {role.name}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-white/70">
                      <span className="text-sm text-white/70">
                        {role.description ? role.description : "No description provided"}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-white/60">
                      {new Date(role.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      <button
                        onClick={() => handleDelete(role.id)}
                        className="text-red-300 transition hover:text-red-100"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </TableCell>
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

