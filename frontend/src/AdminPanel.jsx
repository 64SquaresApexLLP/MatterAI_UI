import React, { useState } from "react";
import {
  Users,
  Building2,
  UserPlus,
  X,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Loader,
} from "lucide-react";
import { adminAPI } from "./api/apiService";

const AdminPanel = ({ currentUser, onClose }) => {
  const [activeTab, setActiveTab] = useState(null); // "createUser" | "createOrg" | "createOrgAdmin"
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" | "error"

  // Form states
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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.email || !formData.password || !formData.name) {
      showMessage("All fields are required", "error");
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

      if (currentUser.role_name === "SuperAdmin") {
        if (formData.role_id) payload.role_id = parseInt(formData.role_id);
        if (formData.org_id) payload.org_id = parseInt(formData.org_id);
      }

      const response = await adminAPI.createUser(payload);
      if (response.success) {
        showMessage(`User '${formData.username}' created successfully`, "success");
        setFormData({ username: "", email: "", password: "", name: "", role_id: "", org_id: "" });
        setActiveTab(null);
      } else {
        showMessage(response.message || "Failed to create user", "error");
      }
    } catch (error) {
      showMessage(error.message || "Error creating user", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async (e) => {
    e.preventDefault();
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
        setActiveTab(null);
      } else {
        showMessage(response.message || "Failed to create organization", "error");
      }
    } catch (error) {
      showMessage(error.message || "Error creating organization", "error");
    } finally {
      setLoading(false);
    }
  };

  const isSuperAdmin = currentUser?.role_name === "SuperAdmin";
  const isOrgAdmin = currentUser?.role_name === "OrgAdmin";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#062e69] to-blue-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Admin Panel</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Message */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg flex items-center space-x-3 ${
                messageType === "success"
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              {messageType === "success" ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span
                className={messageType === "success" ? "text-green-700" : "text-red-700"}
              >
                {message}
              </span>
            </div>
          )}

          {/* Tabs/Menu */}
          <div className="space-y-4">
            {/* SuperAdmin Options */}
            {isSuperAdmin && (
              <>
                <button
                  onClick={() =>
                    setActiveTab(activeTab === "createOrg" ? null : "createOrg")
                  }
                  className="w-full p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg hover:shadow-lg transition flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-[#062e69]">
                      Create Organization & OrgAdmin
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 transition ${
                      activeTab === "createOrg" ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {activeTab === "createOrg" && (
                  <form onSubmit={handleCreateOrganization} className="bg-gray-50 p-6 rounded-lg space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#062e69] mb-2">
                          Organization Name *
                        </label>
                        <input
                          type="text"
                          name="org_name"
                          value={orgFormData.org_name}
                          onChange={handleOrgInputChange}
                          placeholder="e.g., Acme Corp"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#062e69] mb-2">
                          Description
                        </label>
                        <input
                          type="text"
                          name="description"
                          value={orgFormData.description}
                          onChange={handleOrgInputChange}
                          placeholder="Optional description"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="border-t-2 border-gray-300 pt-4">
                      <p className="text-sm font-semibold text-[#062e69] mb-4">
                        OrgAdmin Account Details
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-[#062e69] mb-2">
                            Username *
                          </label>
                          <input
                            type="text"
                            name="admin_username"
                            value={orgFormData.admin_username}
                            onChange={handleOrgInputChange}
                            placeholder="e.g., admin"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-[#062e69] mb-2">
                            Email *
                          </label>
                          <input
                            type="email"
                            name="admin_email"
                            value={orgFormData.admin_email}
                            onChange={handleOrgInputChange}
                            placeholder="admin@example.com"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-[#062e69] mb-2">
                            Password *
                          </label>
                          <input
                            type="password"
                            name="admin_password"
                            value={orgFormData.admin_password}
                            onChange={handleOrgInputChange}
                            placeholder="Secure password"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-[#062e69] mb-2">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            name="admin_name"
                            value={orgFormData.admin_name}
                            onChange={handleOrgInputChange}
                            placeholder="e.g., John Doe"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {loading && <Loader className="w-5 h-5 animate-spin" />}
                      <span>Create Organization</span>
                    </button>
                  </form>
                )}
              </>
            )}

            {/* OrgAdmin and SuperAdmin options for creating Users */}
            {(isSuperAdmin || isOrgAdmin) && (
              <button
                onClick={() =>
                  setActiveTab(activeTab === "createUser" ? null : "createUser")
                }
                className="w-full p-4 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-lg hover:shadow-lg transition flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <UserPlus className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-[#062e69]">
                    Create User
                  </span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 transition ${
                    activeTab === "createUser" ? "rotate-180" : ""
                  }`}
                />
              </button>
            )}

            {activeTab === "createUser" && (
              <form onSubmit={handleCreateUser} className="bg-gray-50 p-6 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#062e69] mb-2">
                      Username *
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="e.g., john.doe"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#062e69] mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john@example.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#062e69] mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Secure password"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#062e69] mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., John Doe"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  {isSuperAdmin && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-[#062e69] mb-2">
                          Role ID (Optional)
                        </label>
                        <input
                          type="number"
                          name="role_id"
                          value={formData.role_id}
                          onChange={handleInputChange}
                          placeholder="e.g., 1"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#062e69] mb-2">
                          Organization ID (Optional)
                        </label>
                        <input
                          type="number"
                          name="org_id"
                          value={formData.org_id}
                          onChange={handleInputChange}
                          placeholder="e.g., 1"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {loading && <Loader className="w-5 h-5 animate-spin" />}
                  <span>Create User</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
