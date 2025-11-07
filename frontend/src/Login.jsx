import React, { useState } from "react";
import { Eye, EyeOff, User, Lock, LogIn, Shield, X } from "lucide-react";
import { authAPI } from "./api/apiService";

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await authAPI.login(username, password);
      if (response.success === true) {
        onLoginSuccess({ username, token: response.token });
      } else {
        setError("Invalid username or password.");
      }
    } catch (error) {
      console.error("Login error:", error);
      // Extract error message from the error object
      const errorMessage = error.message || "Invalid username or password.";

      // Check if the error message contains specific backend error details
      if (errorMessage.includes("Invalid password")) {
        setError("Incorrect password. Please try again.");
      } else if (errorMessage.includes("User not found")) {
        setError("User not found. Please check your email/username.");
      } else if (errorMessage.includes("401")) {
        setError("Invalid username or password.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#062e69] to-slate-800 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Enhanced animated background elements with custom color */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#062e69]/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#062e69]/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#062e69]/10 rounded-full blur-2xl animate-ping"></div>
        <div className="absolute top-1/4 right-1/4 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl animate-pulse delay-500"></div>
        <div className="absolute bottom-1/4 left-1/4 w-56 h-56 bg-[#062e69]/10 rounded-full blur-2xl animate-pulse delay-700"></div>
      </div>

      {/* Floating particles with custom color */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-1 h-1 rounded-full animate-pulse ${
              i % 3 === 0
                ? "bg-[#062e69]/30"
                : i % 3 === 1
                ? "bg-blue-400/20"
                : "bg-white/10"
            }`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Geometric shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-20 left-20 w-2 h-2 bg-[#062e69]/20 rotate-45 animate-spin"
          style={{ animationDuration: "20s" }}
        ></div>
        <div
          className="absolute bottom-32 right-32 w-3 h-3 bg-blue-400/15 rotate-45 animate-spin"
          style={{ animationDuration: "15s" }}
        ></div>
        <div
          className="absolute top-1/3 right-20 w-1 h-1 bg-white/20 rotate-45 animate-spin"
          style={{ animationDuration: "25s" }}
        ></div>
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo and Title */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="flex justify-center items-center mb-8">
            <div className="relative group">
              {/* Enhanced glow effect with custom color */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#062e69]/30 via-blue-500/20 to-[#062e69]/30 rounded-full blur-3xl scale-110 group-hover:scale-130 transition-transform duration-700 animate-pulse"></div>
              <img
                src="./logo.png"
                alt="Matterhorn Logo"
                className="relative w-80 h-auto drop-shadow-2xl transform group-hover:scale-110 transition-transform duration-500 filter brightness-110"
              />
            </div>
          </div>
          <h1 className="text-3xl font-light text-white mb-4 bg-gradient-to-r from-white via-blue-100 to-[#062e69] bg-clip-text text-transparent">
            AI Assistants
            <br />
            Ontologics / Matterhorn
          </h1>
        </div>

        {/* Login Form */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-[#062e69]/25 via-blue-500/15 to-[#062e69]/25 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-700 animate-pulse"></div>

          <div className="relative bg-white/95 backdrop-blur-md border border-[#062e69]/30 rounded-2xl p-8 shadow-xl shadow-[#062e69]/10">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-[#062e69] mb-2">
                Login to Continue
              </h2>
              <div className="w-12 h-0.5 bg-gradient-to-r from-[#062e69] to-blue-400 mx-auto rounded-full"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[#062e69] text-xs font-bold block tracking-wider uppercase flex items-center space-x-1">
                  <User className="w-3 h-3" />
                  <span>Username / Email</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User
                      className={`h-4 w-4 transition-colors duration-300 ${
                        username ? "text-[#062e69]" : "text-[#062e69]/60"
                      }`}
                    />
                  </div>
                  <input
                    type="email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-[#062e69]/20 rounded-lg text-[#062e69] placeholder-[#062e69]/40 focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20 transition-all duration-300 text-sm font-medium"
                    required
                  />
                  {username && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <div className="w-1.5 h-1.5 bg-[#062e69] rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[#062e69] text-xs font-bold block tracking-wider uppercase flex items-center space-x-1">
                  <Lock className="w-3 h-3" />
                  <span>Password</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock
                      className={`h-4 w-4 transition-colors duration-300 ${
                        password ? "text-[#062e69]" : "text-[#062e69]/60"
                      }`}
                    />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-3 bg-white border border-[#062e69]/20 rounded-lg text-[#062e69] placeholder-[#062e69]/40 focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20 transition-all duration-300 text-sm font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#062e
                    text-[#062e69]/60 hover:text-[#062e69] transition-colors duration-300"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                      <X className="w-1.5 h-1.5 text-white" />
                    </div>
                    <p className="text-red-700 text-xs font-medium">{error}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 rounded-lg font-bold text-sm transition-all duration-300 transform hover:scale-[1.01] flex items-center justify-center space-x-2 relative overflow-hidden ${
                  isLoading
                    ? "bg-[#062e69]/70 cursor-not-allowed"
                    : "bg-[#062e69] hover:bg-[#062e69]/90 hover:shadow-lg hover:shadow-[#062e69]/25"
                } text-white disabled:transform-none`}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Access Platform</span>
                  </>
                )}
              </button>

              <div className="text-center pt-3 border-t border-[#062e69]/10">
                <p className="text-[#062e69]/60 text-xs font-medium flex items-center justify-center space-x-1">
                  <Shield className="w-2.5 h-2.5" />
                  <span>Secured with enterprise-grade encryption</span>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
