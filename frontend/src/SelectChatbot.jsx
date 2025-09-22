import React, { useState } from "react";
import {  LogOut,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import Home from "./Home";
import OntologicsChat from "./OntologicsChat";

const SelectChatbot = ({ user, onLogout }) => {
    const navigate = useNavigate();
    const [selectedBot, setSelectedBot] = useState(null);

    const handleBotSelect = (botType) => {
        setSelectedBot(botType);
    };

    if (selectedBot === 'ontologics') {
        return <OntologicsChat user={user} onBack={() => setSelectedBot(null)} onLogout={onLogout} />
    }
    
    if (selectedBot === 'matterhorn') {
        return <Home user={user} onBack={() => setSelectedBot(null)} onLogout={onLogout} />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-orange-600 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl">
                
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

                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-4">
                        Choose Your AI Assistant
                    </h1>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Ontologics Bot Card */}
                    <button
                        onClick={() => handleBotSelect('ontologics')}
                        className="group block w-full text-left"
                    >
                        <div className="bg-blue-800/40 backdrop-blur-sm rounded-2xl p-8 border border-blue-700/50 hover:bg-blue-700/50 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl">
                            <div className="text-center">
                                {/* Ontologics Logo */}
                                <div className="mb-6 flex justify-center">
                                    <div className="flex items-center space-x-2">
                                        <img src="./logo-2.png" 
                                            alt="Ontologics Logo" 
                                            className="relative w-80 h-auto drop-shadow-2xl transform group-hover:scale-100 transition-transform duration-500 filter brightness-110" 
                                        />
                                    </div>
                                </div>

                                <h3 className="text-2xl font-semibold text-white mb-4">
                                    Ontologics AI
                                </h3>
                                
                                <p className="text-blue-200 mb-6 leading-relaxed">
                                    Advanced AI assistant powered for patents and knowledge management.
                                </p>

                                <div 
                                onClick={() => window.open("https://ontoai.vercel.app", "")}
                                className="bg-orange-400 text-blue-900 px-6 py-3 rounded-full font-semibold group-hover:bg-orange-300 transition-colors duration-300 inline-block">
                                    Start Chat
                                </div>
                            </div>
                        </div>
                    </button>

                    {/* Matterhorn Bot Card */}
                    <button 
                        onClick={() => handleBotSelect('matterhorn')}
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
                                    Matterhorn Legal AI
                                </h3>
                                
                                <p className="text-blue-200 mb-6 leading-relaxed">
                                    Specialized AI legal assistant designed for back office operations and legal document processing.
                                </p>

                                <div className="bg-blue-700 text-white px-6 py-3 rounded-full font-semibold group-hover:bg-blue-600 transition-colors duration-300 inline-block border-2 border-blue-600">
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