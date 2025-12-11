import {
  React,
  useState,
  useEffect,
  Loader,
  Edit2,
  Trash2,
  X,
  Check,
  Search,
  Filter,
} from "./Imports";
import { adminAPI } from "./api/apiService";

const UsersTable = ({ roles = [], orgs = [], refreshTrigger }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.listUsers();
      const list = Array.isArray(res) ? res : res?.data || res?.users || [];
      setUsers(list);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [refreshTrigger]);

  const startEdit = (user) => {
    setEditingUser(user);
    setEditData({
      username: user.username || "",
      email: user.email || "",
      name: user.name || "",
      role_id: user.role_id || "",
      org_id: user.org_id || "",
      is_active: user.is_active ?? true,
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditData({});
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditData((p) => ({
      ...p,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    if (!editData.username || editData.username.length < 3)
      return alert("Username must be >=3 chars");
    if (!editData.email) return alert("Email required");

    setSaving(true);
    try {
      const payload = {
        username: editData.username,
        email: editData.email,
        name: editData.name,
        role_id: editData.role_id ? parseInt(editData.role_id) : undefined,
        org_id: editData.org_id ? parseInt(editData.org_id) : undefined,
        is_active: editData.is_active,
      };
      await adminAPI.updateUser(editingUser.id, payload);
      await fetchUsers();
      cancelEdit();
      alert("User updated successfully");
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Delete user ${user.username}?`)) return;
    try {
      await adminAPI.deleteUser(user.id);
      await fetchUsers();
      alert("User deleted successfully");
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to delete user");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-6">
      <div className="w-full max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            User Management
          </h1>
          <p className="text-slate-600">
            Manage user accounts, roles, and permissions
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by username, email, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center">
            <Loader className="w-8 h-8 animate-spin text-blue-600 mb-3" />
            <span className="text-slate-600">Loading users...</span>
          </div>
        ) : (
          <>
            {/* User List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="divide-y divide-slate-200">
                {filteredUsers.length === 0 ? (
                  <div className="p-12 flex flex-col items-center justify-center">
                    <Filter className="w-12 h-12 mb-3 text-slate-300" />
                    <p className="text-lg font-medium text-slate-600">
                      No users found
                    </p>
                    <p className="text-sm text-slate-400">
                      Try adjusting your search criteria
                    </p>
                  </div>
                ) : (
                  filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      className="p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-4">
                        {/* Left: User Avatar & Info */}
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                            {u.username?.charAt(0).toUpperCase()}
                          </div>

                          <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-3">
                            {/* Username & ID */}
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800 truncate">
                                {u.username}
                              </div>
                              <div className="text-xs text-slate-500">
                                ID: #{u.id}
                              </div>
                            </div>

                            {/* Name & Email */}
                            <div className="min-w-0">
                              <div className="text-sm text-slate-700 truncate">
                                {u.name || "-"}
                              </div>
                              <div className="text-xs text-slate-500 truncate">
                                {u.email || "-"}
                              </div>
                            </div>

                            {/* Role & Org */}
                            <div className="min-w-0">
                              <div className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium mb-1">
                                {u.role_name || "No role"}
                              </div>
                              <div className="text-xs text-slate-600 truncate">
                                {u.org_name || "No org"}
                              </div>
                            </div>

                            {/* Status */}
                            <div className="min-w-0">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                  u.is_active
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {u.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => startEdit(u)}
                            className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4 md:mr-1.5" />
                            <span className="hidden md:inline">Edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            className="inline-flex items-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 md:mr-1.5" />
                            <span className="hidden md:inline">Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {filteredUsers.length > 0 && (
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600">
                    Showing{" "}
                    <span className="font-medium text-slate-900">
                      {filteredUsers.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-slate-900">
                      {users.length}
                    </span>{" "}
                    users
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Edit Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Edit User</h2>
                  <p className="text-sm text-blue-100 mt-1">
                    Update user information and permissions
                  </p>
                </div>
                <button
                  onClick={cancelEdit}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="username"
                      value={editData.username}
                      onChange={handleEditChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter username"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={editData.email}
                      onChange={handleEditChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter email"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Full Name
                    </label>
                    <input
                      name="name"
                      value={editData.name}
                      onChange={handleEditChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Role
                    </label>
                    <select
                      name="role_id"
                      value={editData.role_id}
                      onChange={handleEditChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select role</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.role_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Organization
                    </label>
                    <select
                      name="org_id"
                      value={editData.org_id}
                      onChange={handleEditChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select organization</option>
                      {orgs.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center space-x-3 cursor-pointer p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={editData.is_active}
                        onChange={handleEditChange}
                        className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700">
                        Account is active
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 px-6 py-4 rounded-b-2xl flex justify-end space-x-3">
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
                >
                  {saving ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersTable;
