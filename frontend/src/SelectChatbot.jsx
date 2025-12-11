import React, { useState } from "react";
import { LogOut, User, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Home from "./Home";
import AdminPanel from "./Profile";

const SelectChatbot = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [selectedBot, setSelectedBot] = useState(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const handleBotSelect = (botType) => {
    setSelectedBot(botType);
  };

  if (selectedBot === "matterhorn") {
    return (
      <Home
        user={user}
        onBack={() => setSelectedBot(null)}
        onLogout={onLogout}
      />
    );
  }

  const isSuperAdmin =
    user?.user?.role_name === "SuperAdmin" || user?.role_name === "SuperAdmin";
  const isOrgAdmin =
    user?.user?.role_name === "OrgAdmin" || user?.role_name === "OrgAdmin";
  const isUser = 
    user?.user?.role_name === "User" || user?.role_name === "User";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-orange-600 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="absolute top-4 right-4 z-20">
          <div className="flex items-center space-x-4 bg-white/90 backdrop-blur-xl border border-[#062e69]/30 rounded-xl px-4 py-2 shadow-lg">
            <div className="flex items-center space-x-2 text-[#062e69]">
              <User className="w-4 h-4" />
              <span>{isSuperAdmin ? "Welcome SuperAdmin" : isOrgAdmin ? "Welcome OrgAdmin" : isUser ? "Welcome User" : "Welcome"}</span>
            </div>
            {(isUser) && (
              <button
                onClick={() => navigate("/profile")}
                className="flex items-center space-x-1 text-[#062e69]/70 hover:text-[#062e69] transition-colors duration-200 text-sm font-medium"
                title="Admin Panel"
              >
                <Settings className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            )}

            {(isSuperAdmin || isOrgAdmin) && (
              <button
                onClick={() => navigate("/profile")}
                className="flex items-center space-x-1 text-[#062e69]/70 hover:text-[#062e69] transition-colors duration-200 text-sm font-medium"
                title="Admin Panel"
              >
                <Settings className="w-4 h-4" />
                <span>Edit Profile & User Mgt</span>
              </button>
            )}
            <button
              onClick={onLogout}
              className="flex items-center space-x-1 text-[#062e69]/70 hover:text-[#062e69] transition-colors duration-200 text-sm font-medium"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {showAdminPanel && (
          <AdminPanel
            currentUser={user?.user || user}
            onClose={() => setShowAdminPanel(false)}
          />
        )}

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Choose Your AI Assistant
          </h1>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Ontologics Bot Card */}
          <button
            className="group block w-full text-left"
          >
            <div 
            onClick={() => window.open("http://ontologics-frontend-dev-bucket.s3-website.us-east-2.amazonaws.com/", "")}
            className="bg-blue-800/40 backdrop-blur-sm rounded-2xl p-8 border border-blue-700/50 hover:bg-blue-700/50 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl">
              <div className="text-center">
                {/* Ontologics Logo */}
                <div className="mb-6 flex justify-center">
                  <div className="flex items-center space-x-2">
                    <img
                      src="./logo-2.png"
                      alt="Ontologics Logo"
                      className="relative w-80 h-auto drop-shadow-2xl transform group-hover:scale-100 transition-transform duration-500 filter brightness-110"
                    />
                  </div>
                </div>

                <h3 className="text-2xl font-semibold text-white mb-4">
                  Ontologics AI
                </h3>

                <p className="text-blue-200 mb-6 leading-relaxed">
                  Advanced AI assistant powered for patents and knowledge
                  management.
                </p>

                <div
                  className="bg-orange-400 text-blue-900 px-6 py-3 rounded-full font-semibold group-hover:bg-orange-300 transition-colors duration-300 inline-block"
                >
                  Start Chat
                </div>
              </div>
            </div>
          </button>

          {/* Matterhorn Bot Card */}
          <button
            onClick={() => handleBotSelect("matterhorn")}
            className="group block w-full text-left"
          >
            <div className="bg-blue-800/40 backdrop-blur-sm rounded-2xl p-8 border border-blue-700/50 hover:bg-blue-700/50 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl">
              <div className="text-center">
                {/* Matterhorn Logo */}
                <div className="mb-6 flex justify-center">
                  <div className="flex items-center space-x-3">
                    <div className="text-left">
                      <img
                        src="./logo.png"
                        alt="Matterhorn Logo"
                        className="relative w-80 h-auto drop-shadow-2xl transform group-hover:scale-100 transition-transform duration-500 filter brightness-110"
                      />
                    </div>
                  </div>
                </div>

                <h3 className="text-2xl font-semibold text-white mb-4">
                  Matterhorn AI
                </h3>

                <p className="text-blue-200 mb-6 leading-relaxed">
                  Specialized AI legal assistant designed for back office
                  operations and legal document processing.
                </p>

                <div className="bg-blue-700 text-white px-6 py-3 rounded-full font-semibold group-hover:bg-blue-600 transition-colors duration-300 inline-block">
                  Access Platform
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectChatbot;
