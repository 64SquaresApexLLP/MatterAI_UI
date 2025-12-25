import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Menu, X, User, Settings, LogOut, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { translationAPI } from "./HomeLogic";

const formatDate = (iso) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const getStatusColor = (status) => {
  if (status === "COMPLETED") return "text-green-400";
  if (status === "FAILED") return "text-red-400";
  return "text-yellow-400";
};

const resolveUserLabel = (record) => {
  if (record.username) return record.username;
  if (record.user_email) return record.user_email;
  return "You";
};

const History = ({ user, onLogout, records, loading, onToggle }) => {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  const toggle = () => {
    const next = !open;
    setOpen(next);
    onToggle?.(next);
  };

  const isSuperAdmin =
    user?.user?.role_name === "SuperAdmin" || user?.role_name === "SuperAdmin";
  const isOrgAdmin =
    user?.user?.role_name === "OrgAdmin" || user?.role_name === "OrgAdmin";
  const isUser = user?.user?.role_name === "User" || user?.role_name === "User";

  return (
    <>
      {/* Hamburger Button - Fixed position */}
      <button
        onClick={toggle}
        className="fixed top-4 left-4 z-50 p-2 bg-[#1e3a5f] border border-[#2d4a6f] rounded-lg shadow-lg hover:bg-[#244166] transition-colors"
        aria-label="Toggle sidebar"
      >
        {open ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <div className="flex items-center">
            <Menu className="w-5 h-5 text-white" />
            <p className="text-white ml-2 text-sm font-medium whitespace-nowrap">
              Translation History
            </p>
          </div>
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-[#0a1929] to-[#1e3a5f] border-r border-[#2d4a6f] shadow-2xl transition-transform duration-300 ease-in-out z-40 flex flex-col ${
          open ? "translate-x-0 w-80" : "-translate-x-full w-80"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d4a6f]/50 mt-14">
          <h2 className="font-semibold text-white text-lg">
            Translation History
          </h2>
        </div>

        {/* Content - Scrollable middle section */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <p className="p-4 text-sm text-gray-300">Loading translations...</p>
          )}

          {!loading && records.length === 0 && (
            <p className="p-4 text-sm text-gray-300">
              Start translating files to see them here
            </p>
          )}

          {!loading &&
            records.map((item) => (
              <div
                key={item.job_id || item.translation_id || item.translationId || item.id}
                className="w-full px-4 py-3 border-b border-[#2d4a6f]/30 hover:bg-[#244166]/50 transition-colors flex items-center justify-between cursor-pointer"
                onClick={() =>
                  navigate(`/translate/${item.translation_id || item.job_id || item.translationId || item.id}`, {
                    state: { record: item },
                  })
                }
              >
                <div className="flex flex-col gap-1 flex-1">
                  {/* Filename */}
                  <span className="text-sm font-medium text-white truncate">
                    {item.original_filename}
                  </span>

                  {/* Meta */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-300 truncate">
                      {resolveUserLabel(item)} • {formatDate(item.created_at)}
                    </span>

                    <span
                      className={`font-medium ${getStatusColor(
                        item.translation_status
                      )}`}
                    >
                      {item.translation_status}
                    </span>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const ok = window.confirm(
                      "Delete this translation record? This cannot be undone."
                    );
                    if (!ok) return;

                    try {
                      const idToDelete = item.job_id || item.translation_id || item.translationId || item.id;
                      await translationAPI.deleteTranslationRecord(idToDelete);

                      toast.success("Translation record deleted");

                      // reload to refresh records (keeps parent simple)
                      window.location.reload();
                    } catch (err) {
                      console.error("Delete failed:", err);
                      toast.error("Delete failed: " + (err.message || err));
                    }
                  }}
                  className="ml-3 p-2 rounded hover:bg-white/10"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-red-300" />
                </button>
              </div>
            ))}
        </div>

        {/* Footer - User Management Section */}
        <div className="border-t border-[#2d4a6f]/50 bg-[#0a1929]/80 p-4">
          <div className="flex flex-col space-y-3">
            {/* Welcome Message */}
            <div className="flex items-center space-x-2 text-white px-2">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">
                {isSuperAdmin
                  ? "Welcome SuperAdmin"
                  : isOrgAdmin
                  ? "Welcome OrgAdmin"
                  : isUser
                  ? "Welcome User"
                  : "Welcome"}
              </span>
            </div>

            {/* Edit Profile Button */}
            {isUser && (
              <button
                onClick={() => navigate("/profile")}
                className="flex items-center space-x-2 text-white hover:bg-[#244166] transition-colors duration-200 px-2 py-2 rounded-lg"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium">Edit Profile</span>
              </button>
            )}

            {(isSuperAdmin || isOrgAdmin) && (
              <button
                onClick={() => navigate("/profile")}
                className="flex items-center space-x-2 text-white hover:bg-[#244166] transition-colors duration-200 px-2 py-2 rounded-lg"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Edit Profile & User Mgt
                </span>
              </button>
            )}

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 text-red-400 hover:bg-red-900/30 transition-colors duration-200 px-2 py-2 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
        />
      )}
    </>
  );
};
export default History;
