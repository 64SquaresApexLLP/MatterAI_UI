import { adminAPI, authAPI } from "./api/apiService.js";
import {
  React,
  useState,
  useEffect,
  Users,
  Building2,
  UserPlus,
  X,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Loader,
  ArrowLeft,
  Shield,
} from "./Imports.jsx";
import UsersTable from "./UsersTable.jsx";

const Profile = ({ currentUser, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  // Independent expansion states
  const [openCreateOrg, setOpenCreateOrg] = useState(false);
  const [openCreateUser, setOpenCreateUser] = useState(false);
  const [openManageUsers, setOpenManageUsers] = useState(false);

  const [roles, setRoles] = useState([]);
  const [orgs, setOrgs] = useState([]);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    name: "",
    role_id: "",
    org_id: "",
  });

  const [orgFormData, setOrgFormData] = useState({
    org_name: "",
    description: "",
    admin_username: "",
    admin_email: "",
    admin_password: "",
    admin_name: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOrgInputChange = (e) => {
    const { name, value } = e.target;
    setOrgFormData((prev) => ({ ...prev, [name]: value }));
  };

  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 5000);
  };

  const handleCreateUser = async () => {
    if (
      !formData.username ||
      !formData.email ||
      !formData.password ||
      !formData.name
    ) {
      showMessage("All fields are required", "error");
      return;
    }

    if (String(formData.username).length < 3) {
      showMessage("Username must be at least 3 characters", "error");
      return;
    }

    if (String(formData.password).length < 6) {
      showMessage("Password must be at least 6 characters", "error");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        name: formData.name,
      };

      if (formData.role_id) payload.role_id = parseInt(formData.role_id);
      if (formData.org_id) payload.org_id = parseInt(formData.org_id);

      const response = await adminAPI.createUser(payload);

      if (response.success) {
        showMessage(`User '${formData.username}' created successfully`, "success");

        setFormData({
          username: "",
          email: "",
          password: "",
          name: "",
          role_id: "",
          org_id: "",
        });
      } else {
        showMessage(response.message || "Failed to create user", "error");
      }
    } catch (error) {
      showMessage(error.message || "Error creating user", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async () => {
    if (
      !orgFormData.org_name ||
      !orgFormData.admin_username ||
      !orgFormData.admin_email ||
      !orgFormData.admin_password ||
      !orgFormData.admin_name
    ) {
      showMessage("All fields are required", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await adminAPI.createOrganization(orgFormData);
      if (response.success) {
        showMessage(
          `Organization '${orgFormData.org_name}' created with OrgAdmin '${orgFormData.admin_username}'`,
          "success"
        );

        setOrgFormData({
          org_name: "",
          description: "",
          admin_username: "",
          admin_email: "",
          admin_password: "",
          admin_name: "",
        });
      } else {
        showMessage(
          response.message || "Failed to create organization",
          "error"
        );
      }
    } catch (error) {
      showMessage(error.message || "Error creating organization", "error");
    } finally {
      setLoading(false);
    }
  };

  const isSuperAdmin = currentUser?.role_name === "SuperAdmin";
  const isOrgAdmin = currentUser?.role_name === "OrgAdmin";

  const availableRoles = isSuperAdmin
    ? roles
    : roles.filter((r) => ["OrgAdmin", "User"].includes(r.role_name));

  useEffect(() => {
    let mounted = true;

    const fetchLists = async () => {
      try {
        const rolesRes = await authAPI.getRoles();
        const orgRes = await authAPI.getOrganizations();

        const rawRoles = rolesRes?.roles || rolesRes?.data || rolesRes || [];
        const rawOrgs = orgRes?.organizations || orgRes?.data || orgRes || [];

        if (!mounted) return;

        // Normalize roles
        const normalizedRoles = Array.isArray(rawRoles)
          ? rawRoles.map((r, idx) => ({
              id: r.id ?? r.role_id ?? r.roleId ?? idx,
              role_name:
                r.role_name ??
                r.name ??
                r.role ??
                r.roleName ??
                String(r.id ?? idx),
              description: r.description ?? "",
            }))
          : [];

        // Normalize orgs
        const normalizedOrgs = Array.isArray(rawOrgs)
          ? rawOrgs.map((o) => ({
              id: o.id ?? o.org_id ?? o.orgId,
              name: o.name ?? o.org_name ?? o.title ?? String(o.id),
            }))
          : [];

        setRoles(normalizedRoles);
        setOrgs(normalizedOrgs);

        if (isOrgAdmin) {
          const curOrgId =
            currentUser?.org_id ||
            currentUser?.organization?.id ||
            currentUser?.organization_id ||
            currentUser?.orgId;

          if (curOrgId) {
            setFormData((prev) => ({ ...prev, org_id: String(curOrgId) }));
          }
        }
      } catch (err) {
        console.error("Failed to load roles/orgs:", err);
      }
    };

    fetchLists();

    return () => {
      mounted = false;
    };
  }, [currentUser]);

  return (
    <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-orange-600 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
                  <p className="text-sm text-gray-500">
                    Manage users and organizations
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  {currentUser?.name}
                </p>
                <p className="text-xs text-blue-600">{currentUser?.role_name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Toast Message */}
        {message && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div
              className={`p-4 rounded-xl flex items-center space-x-3 shadow-lg ${
                messageType === "success"
                  ? "bg-green-50 border-2 border-green-200"
                  : "bg-red-50 border-2 border-red-200"
              }`}
            >
              {messageType === "success" ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600" />
              )}
              <span
                className={`font-medium ${
                  messageType === "success" ? "text-green-800" : "text-red-800"
                }`}
              >
                {message}
              </span>
            </div>
          </div>
        )}

        {/* Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* Create Organization */}
          {isSuperAdmin && (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-300 transition-all">
              <button
                onClick={() => setOpenCreateOrg(!openCreateOrg)}
                className="w-full p-6 flex items-center justify-between group"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                    <Building2 className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Create Organization
                    </h3>
                    <p className="text-sm text-gray-500">
                      Setup new org with admin account
                    </p>
                  </div>
                </div>

                <ChevronDown
                  className={`w-6 h-6 text-gray-400 transition-transform ${
                    openCreateOrg ? "rotate-180" : ""
                  }`}
                />
              </button>

              {openCreateOrg && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="space-y-6 pt-6">
                    {/* Org form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Organization Name *
                        </label>
                        <input
                          type="text"
                          name="org_name"
                          value={orgFormData.org_name}
                          onChange={handleOrgInputChange}
                          placeholder="e.g., Acme Corp"
                          className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Description
                        </label>
                        <input
                          type="text"
                          name="description"
                          value={orgFormData.description}
                          onChange={handleOrgInputChange}
                          placeholder="Optional description"
                          className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl"
                        />
                      </div>
                    </div>

                    {/* Org Admin */}
                    <div className="border-t-2 pt-6">
                      <p className="text-sm font-bold text-gray-900 mb-4 flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-blue-600" />
                        <span>OrgAdmin Account Details</span>
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold mb-2">
                            Username *
                          </label>
                          <input
                            type="text"
                            name="admin_username"
                            value={orgFormData.admin_username}
                            onChange={handleOrgInputChange}
                            className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold mb-2">
                            Email *
                          </label>
                          <input
                            type="email"
                            name="admin_email"
                            value={orgFormData.admin_email}
                            onChange={handleOrgInputChange}
                            className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold mb-2">
                            Password *
                          </label>
                          <input
                            type="password"
                            name="admin_password"
                            value={orgFormData.admin_password}
                            onChange={handleOrgInputChange}
                            className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold mb-2">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            name="admin_name"
                            value={orgFormData.admin_name}
                            onChange={handleOrgInputChange}
                            className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleCreateOrganization}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold"
                    >
                      {loading && <Loader className="w-5 h-5 animate-spin inline-block mr-2" />}
                      Create Organization
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Create User */}
          {(isSuperAdmin || isOrgAdmin) && (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-green-300 transition-all">
              <button
                onClick={() => setOpenCreateUser(!openCreateUser)}
                className="w-full p-6 flex items-center justify-between group"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                    <UserPlus className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Create User</h3>
                    <p className="text-sm text-gray-500">
                      Add new user to the system
                    </p>
                  </div>
                </div>

                <ChevronDown
                  className={`w-6 h-6 text-gray-400 transition-transform ${
                    openCreateUser ? "rotate-180" : ""
                  }`}
                />
              </button>

              {openCreateUser && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="space-y-6 pt-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm mb-2">Username *</label>
                        <input
                          name="username"
                          value={formData.username}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border-2 border-green-200 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-2">Email *</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border-2 border-green-200 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-2">Password *</label>
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border-2 border-green-200 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-2">Full Name *</label>
                        <input
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border-2 border-green-200 rounded-xl"
                        />
                      </div>

                      {/* SuperAdmin-only fields */}
                      {isSuperAdmin && (
                        <>
                          <div>
                            <label className="block text-sm mb-2">Role (Optional)</label>
                            <select
                              name="role_id"
                              value={formData.role_id}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border-2 border-green-200 rounded-xl"
                            >
                              <option value="">Select Role</option>
                              {availableRoles.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.role_name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm mb-2">Organization</label>
                            <select
                              name="org_id"
                              value={formData.org_id}
                              onChange={handleInputChange}
                              disabled={isOrgAdmin}
                              className="w-full px-4 py-3 border-2 border-green-200 rounded-xl"
                            >
                              <option value="">Select Organization</option>
                              {orgs.map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      onClick={handleCreateUser}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-bold"
                    >
                      {loading && <Loader className="w-5 h-5 animate-spin inline-block mr-2" />}
                      Create User
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manage Users */}
          {(isSuperAdmin || isOrgAdmin) && (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-purple-300 transition-all lg:col-span-2">
              <button
                onClick={() => setOpenManageUsers(!openManageUsers)}
                className="w-full p-6 flex items-center justify-between group"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                    <Users className="w-7 h-7 text-white" />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Manage Users
                    </h3>
                    <p className="text-sm text-gray-500">
                      View, edit, and manage existing users
                    </p>
                  </div>
                </div>

                <ChevronDown
                  className={`w-6 h-6 text-gray-400 transition-transform ${
                    openManageUsers ? "rotate-180" : ""
                  }`}
                />
              </button>

              {openManageUsers && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="pt-6">
                    <UsersTable
                      currentUser={currentUser}
                      roles={roles}
                      orgs={orgs}
                      refreshTrigger={openManageUsers}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
