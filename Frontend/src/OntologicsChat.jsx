import {  LogOut,
  User,
} from "lucide-react";

const OntologicsChat = ({ user, onBack, onLogout }) => (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-orange-600 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
            <div className="absolute top-4 left-4 z-20">
        <button className="flex items-center space-x-4 rounded-xl px-4 py-2 text-white" onClick={onBack}>
        ← Back to Chatbot Selection
        </button>
      </div>

      <div className="absolute top-4 right-4 z-20">
        <div className="flex items-center space-x-4 bg-white/90 backdrop-blur-xl border border-[#062e69]/30 rounded-xl px-4 py-2 shadow-lg">
          <div className="flex items-center space-x-2 text-[#062e69]">
            <User className="w-4 h-4" />
            <span className="text-sm font-medium">
              Welcome user
              {/* {user?.name || "User"} */}
            </span>
          </div>
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
            
            <div className="bg-blue-800/40 backdrop-blur-sm rounded-2xl p-8 border border-blue-700/50 text-white text-center">
                <h2 className="text-2xl font-bold mb-4">Ontologics AI Chat</h2>
            </div>
        </div>
    </div>
);

export default OntologicsChat;