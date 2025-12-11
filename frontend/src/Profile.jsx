// import { adminAPI, authAPI } from "./api/apiService";
// import {
//   React,
//   useState,
//   useEffect,
//   Users,
//   Building2,
//   UserPlus,
//   X,
//   ChevronDown,
//   AlertCircle,
//   CheckCircle,
//   Loader,
// } from "./Imports.jsx";
// import UsersTable from "./UsersTable";

// const Profile = ({ currentUser, onClose }) => {
//   const [crudType, setCrudType] = useState("users");

//   const dummyData = {
//     users: [
//       { id: 1, username: "john", email: "john@example.com", role: "User" },
//       { id: 2, username: "alex", email: "alex@example.com", role: "User" },
//     ],
//     orgAdmins: [
//       {
//         id: 10,
//         username: "orgadmin1",
//         email: "oa1@example.com",
//         role: "OrgAdmin",
//       },
//       {
//         id: 11,
//         username: "orgadmin2",
//         email: "oa2@example.com",
//         role: "OrgAdmin",
//       },
//     ],
//   };

//   const handleEdit = (item) => {
//     console.log("Edit clicked:", item);
//     showMessage(`Edit clicked for ${item.username}`, "success");
//   };

//   const handleDelete = (id) => {
//     console.log("Delete clicked:", id);
//     showMessage(`Delete clicked for ID ${id}`, "error");
//   };

//   const [activeTab, setActiveTab] = useState(null); // "createUser" | "createOrg" | "createOrgAdmin"
//   const [loading, setLoading] = useState(false);
//   const [message, setMessage] = useState("");
//   const [messageType, setMessageType] = useState(""); // "success" | "error"

//   // Form states
//   const [formData, setFormData] = useState({
//     username: "",
//     email: "",
//     password: "",
//     name: "",
//     role_id: "",
//     org_id: "",
//   });

//   const [roles, setRoles] = useState([]);
//   const [orgs, setOrgs] = useState([]);

//   const [orgFormData, setOrgFormData] = useState({
//     org_name: "",
//     description: "",
//     admin_username: "",
//     admin_email: "",
//     admin_password: "",
//     admin_name: "",
//   });

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   const handleOrgInputChange = (e) => {
//     const { name, value } = e.target;
//     setOrgFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   const showMessage = (msg, type) => {
//     setMessage(msg);
//     setMessageType(type);
//     setTimeout(() => setMessage(""), 5000);
//   };

//   const handleCreateUser = async (e) => {
//     e.preventDefault();
//     // Basic client-side validation to match backend expectations
//     if (
//       !formData.username ||
//       !formData.email ||
//       !formData.password ||
//       !formData.name
//     ) {
//       showMessage("All fields are required", "error");
//       return;
//     }

//     if (String(formData.username).length < 3) {
//       showMessage("Username must be at least 3 characters", "error");
//       return;
//     }

//     if (String(formData.password).length < 6) {
//       showMessage("Password must be at least 6 characters", "error");
//       return;
//     }

//     setLoading(true);
//     try {
//       const payload = {
//         username: formData.username,
//         email: formData.email,
//         password: formData.password,
//         name: formData.name,
//       };

//       // Attach optional IDs if provided (send as integers)
//       if (formData.role_id) payload.role_id = parseInt(formData.role_id);
//       if (formData.org_id) payload.org_id = parseInt(formData.org_id);

//       const response = await adminAPI.createUser(payload);
//       if (response.success) {
//         showMessage(
//           `User '${formData.username}' created successfully`,
//           "success"
//         );
//         setFormData({
//           username: "",
//           email: "",
//           password: "",
//           name: "",
//           role_id: "",
//           org_id: "",
//         });
//         setActiveTab(null);
//       } else {
//         showMessage(response.message || "Failed to create user", "error");
//       }
//     } catch (error) {
//       showMessage(error.message || "Error creating user", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     let mounted = true;
//     const fetchLists = async () => {
//       try {
//         const rolesRes = await authAPI.getRoles();
//         const orgRes = await authAPI.getOrganizations();

//         const rawRoles = rolesRes?.roles || rolesRes?.data || rolesRes || [];
//         const normalizedRoles = Array.isArray(rawRoles)
//           ? rawRoles.map((r, idx) => ({
//               id: r.id ?? r.role_id ?? r.roleId ?? idx,
//               role_name:
//                 r.role_name ??
//                 r.name ??
//                 r.role ??
//                 r.roleName ??
//                 String(r.id ?? idx),
//               description: r.description ?? r.desc ?? "",
//             }))
//           : [];

//         const rawOrgs = orgRes?.organizations || orgRes?.data || orgRes || [];
//         const normalizedOrgs = Array.isArray(rawOrgs)
//           ? rawOrgs.map((o) => ({
//               id: o.id ?? o.org_id ?? o.orgId,
//               name: o.name ?? o.org_name ?? o.title ?? String(o.id),
//             }))
//           : [];

//         if (!mounted) return;
//         setRoles(normalizedRoles);
//         setOrgs(normalizedOrgs);

//         if (currentUser?.role_name === "OrgAdmin") {
//           const curOrgId =
//             currentUser?.org_id ||
//             currentUser?.organization?.id ||
//             currentUser?.organization_id ||
//             currentUser?.orgId;
//           if (curOrgId)
//             setFormData((prev) => ({ ...prev, org_id: String(curOrgId) }));
//         }
//       } catch (err) {
//         console.error("Failed to load roles/orgs:", err);
//       } finally {
//         // no-op
//       }
//     };

//     fetchLists();
//     return () => {
//       mounted = false;
//     };
//   }, [currentUser]);

//   const handleCreateOrganization = async (e) => {
//     e.preventDefault();
//     if (
//       !orgFormData.org_name ||
//       !orgFormData.admin_username ||
//       !orgFormData.admin_email ||
//       !orgFormData.admin_password ||
//       !orgFormData.admin_name
//     ) {
//       showMessage("All fields are required", "error");
//       return;
//     }

//     setLoading(true);
//     try {
//       const response = await adminAPI.createOrganization(orgFormData);
//       if (response.success) {
//         showMessage(
//           `Organization '${orgFormData.org_name}' created with OrgAdmin '${orgFormData.admin_username}'`,
//           "success"
//         );
//         setOrgFormData({
//           org_name: "",
//           description: "",
//           admin_username: "",
//           admin_email: "",
//           admin_password: "",
//           admin_name: "",
//         });
//         setActiveTab(null);
//       } else {
//         showMessage(
//           response.message || "Failed to create organization",
//           "error"
//         );
//       }
//     } catch (error) {
//       showMessage(error.message || "Error creating organization", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const isSuperAdmin = currentUser?.role_name === "SuperAdmin";
//   const isOrgAdmin = currentUser?.role_name === "OrgAdmin";
//   const isUser = currentUser?.role_name === "User";

//   const availableRoles = isSuperAdmin
//     ? roles
//     : roles.filter((r) => ["OrgAdmin", "User"].includes(r.role_name));

//   return (
//     <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
//       <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
//         {/* Header */}
//         <div className="z-50 sticky top-0 bg-gradient-to-r from-[#062e69] to-blue-600 text-white p-6 flex items-center justify-between">
//           <div className="flex items-center space-x-3">
//             <Users className="w-6 h-6" />
//             <h2 className="text-2xl font-bold">Admin Panel</h2>
//           </div>
//           <button
//             onClick={onClose}
//             className="p-2 hover:bg-white/20 rounded-lg transition"
//           >
//             <X className="w-6 h-6" />
//           </button>
//         </div>

//         {/* Content */}
//         <div className="p-6">
//           {/* Message */}
//           {message && (
//             <div
//               className={`mb-6 p-4 rounded-lg flex items-center space-x-3 ${
//                 messageType === "success"
//                   ? "bg-green-50 border border-green-200"
//                   : "bg-red-50 border border-red-200"
//               }`}
//             >
//               {messageType === "success" ? (
//                 <CheckCircle className="w-5 h-5 text-green-600" />
//               ) : (
//                 <AlertCircle className="w-5 h-5 text-red-600" />
//               )}
//               <span
//                 className={
//                   messageType === "success" ? "text-green-700" : "text-red-700"
//                 }
//               >
//                 {message}
//               </span>
//             </div>
//           )}

//           {/* Tabs/Menu */}
//           <div className="space-y-4">
//             {/* SuperAdmin Options */}
//             {isSuperAdmin && (
//               <>
//                 <button
//                   onClick={() =>
//                     setActiveTab(activeTab === "createOrg" ? null : "createOrg")
//                   }
//                   className="w-full p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg hover:shadow-lg transition flex items-center justify-between"
//                 >
//                   <div className="flex items-center space-x-3">
//                     <Building2 className="w-5 h-5 text-blue-600" />
//                     <span className="font-semibold text-[#062e69]">
//                       Create Organization & OrgAdmin
//                     </span>
//                   </div>
//                   <ChevronDown
//                     className={`w-5 h-5 transition ${
//                       activeTab === "createOrg" ? "rotate-180" : ""
//                     }`}
//                   />
//                 </button>

//                 {activeTab === "createOrg" && (
//                   <form
//                     onSubmit={handleCreateOrganization}
//                     className="bg-gray-50 p-6 rounded-lg space-y-4"
//                   >
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                       <div>
//                         <label className="block text-sm font-semibold text-[#062e69] mb-2">
//                           Organization Name *
//                         </label>
//                         <input
//                           type="text"
//                           name="org_name"
//                           value={orgFormData.org_name}
//                           onChange={handleOrgInputChange}
//                           placeholder="e.g., Acme Corp"
//                           className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//                           required
//                         />
//                       </div>
//                       <div>
//                         <label className="block text-sm font-semibold text-[#062e69] mb-2">
//                           Description
//                         </label>
//                         <input
//                           type="text"
//                           name="description"
//                           value={orgFormData.description}
//                           onChange={handleOrgInputChange}
//                           placeholder="Optional description"
//                           className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//                         />
//                       </div>
//                     </div>

//                     <div className="border-t-2 border-gray-300 pt-4">
//                       <p className="text-sm font-semibold text-[#062e69] mb-4">
//                         OrgAdmin Account Details
//                       </p>
//                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                         <div>
//                           <label className="block text-sm font-semibold text-[#062e69] mb-2">
//                             Username *
//                           </label>
//                           <input
//                             type="text"
//                             name="admin_username"
//                             value={orgFormData.admin_username}
//                             onChange={handleOrgInputChange}
//                             placeholder="e.g., admin"
//                             className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             required
//                           />
//                         </div>
//                         <div>
//                           <label className="block text-sm font-semibold text-[#062e69] mb-2">
//                             Email *
//                           </label>
//                           <input
//                             type="email"
//                             name="admin_email"
//                             value={orgFormData.admin_email}
//                             onChange={handleOrgInputChange}
//                             placeholder="admin@example.com"
//                             className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             required
//                           />
//                         </div>
//                         <div>
//                           <label className="block text-sm font-semibold text-[#062e69] mb-2">
//                             Password *
//                           </label>
//                           <input
//                             type="password"
//                             name="admin_password"
//                             value={orgFormData.admin_password}
//                             onChange={handleOrgInputChange}
//                             placeholder="Secure password"
//                             className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             required
//                           />
//                         </div>
//                         <div>
//                           <label className="block text-sm font-semibold text-[#062e69] mb-2">
//                             Full Name *
//                           </label>
//                           <input
//                             type="text"
//                             name="admin_name"
//                             value={orgFormData.admin_name}
//                             onChange={handleOrgInputChange}
//                             placeholder="e.g., John Doe"
//                             className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             required
//                           />
//                         </div>
//                       </div>
//                     </div>

//                     <button
//                       type="submit"
//                       disabled={loading}
//                       className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center space-x-2"
//                     >
//                       {loading && <Loader className="w-5 h-5 animate-spin" />}
//                       <span>Create Organization</span>
//                     </button>
//                   </form>
//                 )}
//               </>
//             )}

//             {/* OrgAdmin and SuperAdmin options for creating Users */}
//             {(isSuperAdmin || isOrgAdmin) && (
//               <button
//                 onClick={() =>
//                   setActiveTab(activeTab === "createUser" ? null : "createUser")
//                 }
//                 className="w-full p-4 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-lg hover:shadow-lg transition flex items-center justify-between"
//               >
//                 <div className="flex items-center space-x-3">
//                   <UserPlus className="w-5 h-5 text-green-600" />
//                   <span className="font-semibold text-[#062e69]">
//                     Create User
//                   </span>
//                 </div>
//                 <ChevronDown
//                   className={`w-5 h-5 transition ${
//                     activeTab === "createUser" ? "rotate-180" : ""
//                   }`}
//                 />
//               </button>
//             )}

//             {(isSuperAdmin || isOrgAdmin) && (
//               <button
//                 onClick={() =>
//                   setActiveTab(
//                     activeTab === "manageUsers" ? null : "manageUsers"
//                   )
//                 }
//                 className="w-full p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg hover:shadow-lg transition flex items-center justify-between"
//               >
//                 <div className="flex items-center space-x-3">
//                   <Users className="w-5 h-5 text-yellow-600" />
//                   <span className="font-semibold text-[#062e69]">
//                     Manage Users
//                   </span>
//                 </div>
//                 <ChevronDown
//                   className={`w-5 h-5 transition ${
//                     activeTab === "manageUsers" ? "rotate-180" : ""
//                   }`}
//                 />
//               </button>
//             )}

//             {activeTab === "createUser" && (
//               <form
//                 onSubmit={handleCreateUser}
//                 className="bg-gray-50 p-6 rounded-lg space-y-4"
//               >
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div>
//                     <label className="block text-sm font-semibold text-[#062e69] mb-2">
//                       Username *
//                     </label>
//                     <input
//                       type="text"
//                       name="username"
//                       value={formData.username}
//                       onChange={handleInputChange}
//                       placeholder="e.g., john.doe"
//                       className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
//                       required
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-semibold text-[#062e69] mb-2">
//                       Email *
//                     </label>
//                     <input
//                       type="email"
//                       name="email"
//                       value={formData.email}
//                       onChange={handleInputChange}
//                       placeholder="john@example.com"
//                       className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
//                       required
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-semibold text-[#062e69] mb-2">
//                       Password *
//                     </label>
//                     <input
//                       type="password"
//                       name="password"
//                       value={formData.password}
//                       onChange={handleInputChange}
//                       placeholder="Secure password"
//                       className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
//                       required
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-semibold text-[#062e69] mb-2">
//                       Full Name *
//                     </label>
//                     <input
//                       type="text"
//                       name="name"
//                       value={formData.name}
//                       onChange={handleInputChange}
//                       placeholder="e.g., John Doe"
//                       className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
//                       required
//                     />
//                   </div>

//                   {isSuperAdmin && (
//                     <>
//                       <div>
//                         <label className="block text-sm font-semibold text-[#062e69] mb-2">
//                           Role (Optional)
//                         </label>
//                         <select
//                           name="role_id"
//                           value={formData.role_id}
//                           onChange={handleInputChange}
//                           className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
//                         >
//                           <option value="">Select Role (optional)</option>
//                           {availableRoles && availableRoles.length > 0 ? (
//                             availableRoles.map((r) => (
//                               <option key={r.id} value={r.id}>
//                                 {r.role_name}
//                               </option>
//                             ))
//                           ) : (
//                             <option disabled>Loading roles...</option>
//                           )}
//                         </select>
//                       </div>
//                       <div>
//                         <label className="block text-sm font-semibold text-[#062e69] mb-2">
//                           Organization (Optional)
//                         </label>
//                         <select
//                           name="org_id"
//                           value={formData.org_id}
//                           onChange={handleInputChange}
//                           disabled={isOrgAdmin}
//                           className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
//                         >
//                           <option value="">
//                             {isOrgAdmin
//                               ? "Organization (assigned)"
//                               : "Select Organization (optional)"}
//                           </option>
//                           {orgs && orgs.length > 0 ? (
//                             orgs.map((o) => (
//                               <option key={o.id} value={o.id}>
//                                 {o.name}
//                               </option>
//                             ))
//                           ) : (
//                             <option disabled>Loading organizations...</option>
//                           )}
//                         </select>
//                       </div>
//                     </>
//                   )}
//                 </div>

//                 <button
//                   type="submit"
//                   disabled={loading}
//                   className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center space-x-2"
//                 >
//                   {loading && <Loader className="w-5 h-5 animate-spin" />}
//                   <span>Create User</span>
//                 </button>
//               </form>
//             )}

//             {activeTab === "manageUsers" && (
//               <div className="bg-gray-50 p-4 rounded-lg space-y-4">
//                 <UsersTable
//                   currentUser={currentUser}
//                   roles={roles}
//                   orgs={orgs}
//                   refreshTrigger={activeTab}
//                 />
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Profile;

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
  const [crudType, setCrudType] = useState("users");
  const [activeTab, setActiveTab] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    name: "",
    role_id: "",
    org_id: "",
  });

  const [roles, setRoles] = useState([]);
  const [orgs, setOrgs] = useState([]);

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
        showMessage(
          `User '${formData.username}' created successfully`,
          "success"
        );
        setFormData({
          username: "",
          email: "",
          password: "",
          name: "",
          role_id: "",
          org_id: "",
        });
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

  useEffect(() => {
    let mounted = true;
    const fetchLists = async () => {
      try {
        const rolesRes = await authAPI.getRoles();
        const orgRes = await authAPI.getOrganizations();

        const rawRoles = rolesRes?.roles || rolesRes?.data || rolesRes || [];
        const normalizedRoles = Array.isArray(rawRoles)
          ? rawRoles.map((r, idx) => ({
              id: r.id ?? r.role_id ?? r.roleId ?? idx,
              role_name:
                r.role_name ??
                r.name ??
                r.role ??
                r.roleName ??
                String(r.id ?? idx),
              description: r.description ?? r.desc ?? "",
            }))
          : [];

        const rawOrgs = orgRes?.organizations || orgRes?.data || orgRes || [];
        const normalizedOrgs = Array.isArray(rawOrgs)
          ? rawOrgs.map((o) => ({
              id: o.id ?? o.org_id ?? o.orgId,
              name: o.name ?? o.org_name ?? o.title ?? String(o.id),
            }))
          : [];

        if (!mounted) return;
        setRoles(normalizedRoles);
        setOrgs(normalizedOrgs);

        if (currentUser?.role_name === "OrgAdmin") {
          const curOrgId =
            currentUser?.org_id ||
            currentUser?.organization?.id ||
            currentUser?.organization_id ||
            currentUser?.orgId;
          if (curOrgId)
            setFormData((prev) => ({ ...prev, org_id: String(curOrgId) }));
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
        setActiveTab(null);
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
  const isUser = currentUser?.role_name === "User";

  const availableRoles = isSuperAdmin
    ? roles
    : roles.filter((r) => ["OrgAdmin", "User"].includes(r.role_name));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  <p className="text-sm text-gray-500">Manage users and organizations</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900">{currentUser?.name}</p>
                <p className="text-xs text-blue-600">{currentUser?.role_name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message Toast */}
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
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
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

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* SuperAdmin: Create Organization */}
          {isSuperAdmin && (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-blue-300 transition-all duration-200">
              <button
                onClick={() =>
                  setActiveTab(activeTab === "createOrg" ? null : "createOrg")
                }
                className="w-full p-6 flex items-center justify-between group"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                    <Building2 className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
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
                    activeTab === "createOrg" ? "rotate-180" : ""
                  }`}
                />
              </button>

              {activeTab === "createOrg" && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="space-y-6 pt-6">
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
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
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
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                      </div>
                    </div>

                    <div className="border-t-2 border-gray-200 pt-6">
                      <p className="text-sm font-bold text-gray-900 mb-4 flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-blue-600" />
                        <span>OrgAdmin Account Details</span>
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Username *
                          </label>
                          <input
                            type="text"
                            name="admin_username"
                            value={orgFormData.admin_username}
                            onChange={handleOrgInputChange}
                            placeholder="e.g., admin"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Email *
                          </label>
                          <input
                            type="email"
                            name="admin_email"
                            value={orgFormData.admin_email}
                            onChange={handleOrgInputChange}
                            placeholder="admin@example.com"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Password *
                          </label>
                          <input
                            type="password"
                            name="admin_password"
                            value={orgFormData.admin_password}
                            onChange={handleOrgInputChange}
                            placeholder="Secure password"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            name="admin_name"
                            value={orgFormData.admin_name}
                            onChange={handleOrgInputChange}
                            placeholder="e.g., John Doe"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleCreateOrganization}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                    >
                      {loading && <Loader className="w-5 h-5 animate-spin" />}
                      <span>Create Organization</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Create User */}
          {(isSuperAdmin || isOrgAdmin) && (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-green-300 transition-all duration-200">
              <button
                onClick={() =>
                  setActiveTab(activeTab === "createUser" ? null : "createUser")
                }
                className="w-full p-6 flex items-center justify-between group"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl group-hover:scale-110 transition-transform">
                    <UserPlus className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-gray-900">
                      Create User
                    </h3>
                    <p className="text-sm text-gray-500">
                      Add new user to the system
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-6 h-6 text-gray-400 transition-transform ${
                    activeTab === "createUser" ? "rotate-180" : ""
                  }`}
                />
              </button>

              {activeTab === "createUser" && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="space-y-6 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Username *
                        </label>
                        <input
                          type="text"
                          name="username"
                          value={formData.username}
                          onChange={handleInputChange}
                          placeholder="e.g., john.doe"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="john@example.com"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Password *
                        </label>
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder="Secure password"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="e.g., John Doe"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                        />
                      </div>

                      {isSuperAdmin && (
                        <>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Role (Optional)
                            </label>
                            <select
                              name="role_id"
                              value={formData.role_id}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                            >
                              <option value="">Select Role (optional)</option>
                              {availableRoles && availableRoles.length > 0 ? (
                                availableRoles.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.role_name}
                                  </option>
                                ))
                              ) : (
                                <option disabled>Loading roles...</option>
                              )}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Organization (Optional)
                            </label>
                            <select
                              name="org_id"
                              value={formData.org_id}
                              onChange={handleInputChange}
                              disabled={isOrgAdmin}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition disabled:bg-gray-50 disabled:cursor-not-allowed"
                            >
                              <option value="">
                                {isOrgAdmin
                                  ? "Organization (assigned)"
                                  : "Select Organization (optional)"}
                              </option>
                              {orgs && orgs.length > 0 ? (
                                orgs.map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.name}
                                  </option>
                                ))
                              ) : (
                                <option disabled>Loading organizations...</option>
                              )}
                            </select>
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      onClick={handleCreateUser}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                    >
                      {loading && <Loader className="w-5 h-5 animate-spin" />}
                      <span>Create User</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manage Users */}
          {(isSuperAdmin || isOrgAdmin) && (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-purple-300 transition-all duration-200 lg:col-span-2">
              <button
                onClick={() =>
                  setActiveTab(activeTab === "manageUsers" ? null : "manageUsers")
                }
                className="w-full p-6 flex items-center justify-between group"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl group-hover:scale-110 transition-transform">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
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
                    activeTab === "manageUsers" ? "rotate-180" : ""
                  }`}
                />
              </button>

              {activeTab === "manageUsers" && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="pt-6">
                    <UsersTable
                      currentUser={currentUser}
                      roles={roles}
                      orgs={orgs}
                      refreshTrigger={activeTab}
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