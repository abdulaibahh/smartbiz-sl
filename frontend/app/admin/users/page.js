"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/providers/AuthContext";
import { authAPI } from "@/services/api";
import toast from "react-hot-toast";
import { UserPlus, Users, Trash2, Loader2, Shield, UserCog, Lock } from "lucide-react";

function UsersContent() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "cashier"
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await authAPI.getUsers();
      setUsers(res.data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      await authAPI.createUser(form);
      toast.success("User created successfully!");
      setShowModal(false);
      setForm({ name: "", email: "", password: "", role: "cashier" });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      await authAPI.deleteUser(userId);
      toast.success("User deleted!");
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete user");
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "owner": return <Shield size={16} className="text-purple-400" />;
      case "manager": return <Shield size={16} className="text-blue-400" />;
      case "cashier": return <UserCog size={16} className="text-green-400" />;
      default: return <Users size={16} className="text-zinc-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={40} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  // Show access denied for non-owners
  if (!isOwner) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
            <Lock className="text-red-400" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Access Restricted</h1>
            <p className="text-sm text-zinc-500">Only business owners can manage team members</p>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-12 text-center">
          <Lock size={48} className="mx-auto text-zinc-600 mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Access Denied</h2>
          <p className="text-zinc-400">You don't have permission to view or manage users.</p>
          <p className="text-zinc-500 text-sm mt-2">Only the business owner can add or remove team members.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <Users className="text-indigo-400" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">User Management</h1>
            <p className="text-sm text-zinc-500">Manage your business team members</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
        >
          <UserPlus size={20} />
          Add User
        </button>
      </div>

      {/* Users List */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-800/50">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">User</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Role</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Joined</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-zinc-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
                      {u.name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <p className="text-white font-medium">{u.name}</p>
                      <p className="text-sm text-zinc-500">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {getRoleIcon(u.role)}
                    <span className="text-zinc-300 capitalize">{u.role}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-zinc-400">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : "N/A"}
                </td>
                <td className="px-6 py-4 text-right">
                  {u.role !== "owner" && (
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="p-2 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-zinc-600 mb-3" />
            <p className="text-zinc-400">No users yet</p>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">Add New User</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="cashier">Cashier (Limited Access)</option>
                  <option value="manager">Manager (Full Access)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 size={20} className="animate-spin" /> : <UserPlus size={20} />}
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManageUsers() {
  return (
    <ProtectedRoute>
      <UsersContent />
    </ProtectedRoute>
  );
}
