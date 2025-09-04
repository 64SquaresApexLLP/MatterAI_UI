import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  Send,
  Mic,
  Paperclip,
  X,
  FileText,
  File,
  LogOut,
  User,
} from "lucide-react";
import TimesheetForm from "./TimesheetForm";

const Home = ({ user, onLogout }) => {
  const [query, setQuery] = useState("");
  const [expandedSection, setExpandedSection] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const [showTimesheet, setShowTimesheet] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const speechResult = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setQuery((prev) => (prev + " " + speechResult).trim());
          } else {
            interimTranscript += speechResult;
          }
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const languages = [
    "Chinese/Mandarin",
    "French",
    "German",
    "Spanish",
    "Italian",
    "Portuguese",
    "Japanese",
    "Korean",
    "Russian",
    "Arabic",
  ];

  const handleSectionClick = (section) => {
    if (section === "Translation") {
      setExpandedSection(
        expandedSection === "Translation" ? null : "Translation"
      );
    }
  };

  const handleSubmit = () => {
    if (query.trim()) {
      console.log("Query submitted:", query);
      console.log("Files:", uploadedFiles);
      // Handle query submission here
    }
  };

  const handleFileUpload = (files) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter((file) => {
      const validTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];
      return (
        validTypes.includes(file.type) ||
        file.name.match(/\.(pdf|doc|docx|txt|xls|xlsx)$/i)
      );
    });

    const newFiles = validFiles.map((file) => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleFileInputChange = (e) => {
    handleFileUpload(e.target.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const removeFile = (fileId) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (fileName, fileType) => {
    if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      return <FileText className="w-4 h-4 text-red-400" />;
    }
    if (fileType.includes("word") || fileName.match(/\.(doc|docx)$/i)) {
      return <FileText className="w-4 h-4 text-blue-400" />;
    }
    if (fileType.includes("excel") || fileName.match(/\.(xls|xlsx)$/i)) {
      return <FileText className="w-4 h-4 text-green-400" />;
    }
    return <File className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#062e69] to-slate-800 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#062e69]/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#062e69]/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#062e69]/10 rounded-full blur-2xl animate-ping"></div>
      </div>

      {/* Header with user info and logout */}
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

      <div className="relative z-10 w-full max-w-4xl mx-auto">
        {/* Logo and Title */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex justify-center items-center mb-6">
            <div className="flex items-center space-x-2">
              <img src={"./logo.png"} className="w-[20vw]" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-light text-white mb-2 animate-slide-up">
            How can our AI assist you?
          </h1>
        </div>

        {/* Search Form */}
        <div className="mb-8 animate-slide-up delay-200">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#062e69]/25 to-white/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
            <div
              className={`relative bg-white/95 backdrop-blur-xl border rounded-2xl p-4 flex items-center space-x-4 transition-all duration-300 ${
                isDragOver
                  ? "border-[#062e69]/70 bg-white shadow-xl"
                  : "border-[#062e69]/30 hover:border-[#062e69]/50 shadow-lg"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex-shrink-0">
                <div className="w-6 h-6 text-[#062e69]/70">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
                  </svg>
                </div>
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type your Case related search questions here..."
                className="flex-1 bg-transparent text-[#062e69] placeholder-[#062e69]/50 focus:outline-none text-lg font-medium"
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                multiple
                accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0 p-2 text-[#062e69]/70 hover:text-[#062e69] transition-colors duration-200 hover:bg-[#062e69]/10 rounded-lg"
                title="Upload files"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={toggleListening}
                className={`flex-shrink-0 p-2 rounded-lg transition-all duration-200 ${
                  isListening
                    ? "text-red-500 bg-red-500/20 animate-pulse"
                    : "text-[#062e69]/70 hover:text-[#062e69] hover:bg-[#062e69]/10"
                }`}
                title={isListening ? "Stop Listening" : "Start Listening"}
              >
                <Mic className="w-5 h-5" />
              </button>

              <button
                onClick={handleSubmit}
                className="flex-shrink-0 bg-gradient-to-r from-[#062e69] to-[#062e69]/80 hover:from-[#062e69]/90 hover:to-[#062e69] text-white px-6 py-2 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-[#062e69]/25 flex items-center space-x-2"
              >
                <span>Ask</span>
                <Send className="w-4 h-4" />
              </button>
            </div>

            {isDragOver && (
              <div className="absolute inset-0 bg-[#062e69]/10 backdrop-blur-sm rounded-2xl border-2 border-dashed border-[#062e69]/50 flex items-center justify-center z-10">
                <div className="text-[#062e69] font-medium">
                  Drop files here to upload
                </div>
              </div>
            )}
          </div>
        </div>

        {isListening && (
          <div className="flex justify-center mt-2 space-x-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-white rounded-full animate-bounce"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  height: `${8 + i * 4}px`,
                }}
              />
            ))}
          </div>
        )}

        {/* Uploaded Files Display */}
        {uploadedFiles.length > 0 && (
          <div className="mb-8 animate-slide-up delay-300">
            <div className="bg-white/90 backdrop-blur-xl border border-[#062e69]/30 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[#062e69] font-medium text-sm">
                  Uploaded Files ({uploadedFiles.length})
                </h3>
                <button
                  onClick={() => setUploadedFiles([])}
                  className="text-[#062e69]/70 hover:text-[#062e69] text-sm transition-colors duration-200 font-medium"
                >
                  Clear All
                </button>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between bg-[#062e69]/5 rounded-lg p-3 group hover:bg-[#062e69]/10 transition-all duration-200 border border-[#062e69]/10"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {getFileIcon(file.name, file.type)}
                      <div className="flex-1 min-w-0">
                        <div className="text-[#062e69] text-sm truncate font-medium">
                          {file.name}
                        </div>
                        <div className="text-[#062e69]/60 text-xs">
                          {formatFileSize(file.size)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-1 text-[#062e69]/60 hover:text-red-500 transition-colors duration-200 opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 animate-slide-up delay-400">
          {/* Translation Button */}
          <div className="relative">
            <button
              onClick={() => handleSectionClick("Translation")}
              className="group relative bg-white/90 backdrop-blur-xl border border-[#062e69]/30 hover:border-[#062e69]/50 text-[#062e69] px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-[#062e69]/25 flex items-center space-x-2"
            >
              <span>Translation</span>
              {expandedSection === "Translation" ? (
                <ChevronUp className="w-4 h-4 transition-transform duration-200" />
              ) : (
                <ChevronDown className="w-4 h-4 transition-transform duration-200" />
              )}
            </button>

            {/* Expanded Translation Options */}
            {expandedSection === "Translation" && (
              <div className="absolute top-full left-0 mt-4 w-80 bg-white/95 backdrop-blur-xl border border-[#062e69]/30 rounded-2xl p-6 shadow-2xl animate-slide-down z-20">
                <div className="space-y-6">
                  {/* Target Language Selection */}
                  <div>
                    <h3 className="text-[#062e69] font-medium mb-3 flex items-center space-x-2">
                      <span>Target Language Selection</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {languages.map((language) => (
                        <button
                          key={language}
                          onClick={() => setSelectedLanguage(language)}
                          className={`text-sm px-3 py-2 rounded-lg transition-all duration-200 ${
                            selectedLanguage === language
                              ? "bg-[#062e69] text-white shadow-md"
                              : "bg-[#062e69]/10 text-[#062e69] hover:bg-[#062e69]/20"
                          }`}
                        >
                          {language}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Other Options */}
                  <div className="flex space-x-3">
                    <button className="flex-1 bg-[#062e69]/10 hover:bg-[#062e69]/20 text-[#062e69] px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium">
                      Jurisdiction
                    </button>
                    <button className="flex-1 bg-[#062e69]/10 hover:bg-[#062e69]/20 text-[#062e69] px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium">
                      Client Specific Model
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Other Main Buttons */}
          <button
            onClick={() => setShowTimesheet(true)}
            className="group bg-white/90 backdrop-blur-xl border border-[#062e69]/30 
             hover:border-[#062e69]/50 text-[#062e69] px-6 py-3 rounded-xl font-medium 
             transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-[#062e69]/25"
          >
            Timesheet
          </button>

          <button className="group bg-white/90 backdrop-blur-xl border border-[#062e69]/30 hover:border-[#062e69]/50 text-[#062e69] px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-[#062e69]/25">
            Matters
          </button>

          <button className="group bg-white/90 backdrop-blur-xl border border-[#062e69]/30 hover:border-[#062e69]/50 text-[#062e69] px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-[#062e69]/25">
            Entries
          </button>
        </div>

        {showTimesheet && (
          <div className="mt-8 animate-fade-in">
            <TimesheetForm onClose={() => setShowTimesheet(false)} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
