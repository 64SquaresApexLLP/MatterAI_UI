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
  Languages,
} from "lucide-react";
import TimesheetForm from "./TimesheetForm";
import TimesheetEntries from "./TimesheetEntries";
import { queryAPI, authAPI } from "./api/apiService.js";

const Home = ({ user, onLogout }) => {
  const [query, setQuery] = useState("");
  const [selectedButton, setSelectedButton] = useState(null); // Track selected button
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const [showTimesheet, setShowTimesheet] = useState(false);
  const [showEntries, setShowEntries] = useState(false);
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

  const handleButtonClick = (buttonName) => {
    if (selectedButton === buttonName) {
      setSelectedButton(null);
    } else {
      setSelectedButton(buttonName);
    }

    // Close timesheet form when selecting other buttons
    if (buttonName !== "Timesheet" && showTimesheet) {
      setShowTimesheet(false);
    }

    // Close entries view when selecting other buttons
    if (buttonName !== "Entries" && showEntries) {
      setShowEntries(false);
    }

    // Show timesheet form when Timesheet is selected
    if (buttonName === "Timesheet") {
      setShowTimesheet(true);
      setShowEntries(false);
    } else {
      setShowTimesheet(false);
    }

    // Show entries view when Entries is selected
    if (buttonName === "Entries") {
      setShowEntries(true);
      setShowTimesheet(false);
    } else if (buttonName !== "Entries") {
      setShowEntries(false);
    }

    // Close language dropdown when other buttons are selected
    if (buttonName !== "Translation") {
      setShowLanguageDropdown(false);
    }
  };

  const handleLanguageSelect = (language) => {
    setSelectedLanguage(language);
    setShowLanguageDropdown(false);
  };

  const handleSubmit = async () => {
    if (query.trim()) {
      try {
        const queryData = {
          query: query.trim(),
          selected_button: selectedButton,
          selected_language: selectedLanguage,
          uploaded_files: uploadedFiles,
        };

        console.log("Submitting query:", queryData);
        const response = await queryAPI.search(queryData);

        if (response.success) {
          console.log("Query response:", response);
          // Handle successful response - you can show results in UI
          alert(`Query processed successfully! ${response.message}`);
        } else {
          console.error("Query failed:", response.message);
          alert(`Query failed: ${response.message}`);
        }
      } catch (error) {
        console.error("Query error:", error);
        alert(`Query error: ${error.message}`);
      }
    }
  };

  const handleFileUpload = async (files) => {
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

    // Upload files to backend
    try {
      const uploadPromises = validFiles.map((file) =>
        queryAPI.uploadFile(file)
      );
      const uploadResults = await Promise.all(uploadPromises);

      const successfulUploads = uploadResults
        .filter((result) => result.success)
        .map((result) => result.file);

      setUploadedFiles((prev) => [...prev, ...successfulUploads]);

      if (successfulUploads.length > 0) {
        console.log(`Successfully uploaded ${successfulUploads.length} files`);
      }

      const failedUploads = uploadResults.filter((result) => !result.success);
      if (failedUploads.length > 0) {
        console.error("Some files failed to upload:", failedUploads);
        alert(`${failedUploads.length} files failed to upload`);
      }
    } catch (error) {
      console.error("File upload error:", error);
      alert(`File upload failed: ${error.message}`);
    }
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
                placeholder="Case related questions or Translate something here..."
                className="flex-1 bg-transparent text-[#062e69] placeholder-[#062e69]/50 focus:outline-none text-lg font-medium"
              />

              {/* Language Selection Button - Only show when Translation is selected */}
              {selectedButton === "Translation" && (
                <div className="relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setShowLanguageDropdown(!showLanguageDropdown)
                    }
                    className="flex-shrink-0 p-2 text-[#062e69]/70 hover:text-[#062e69] transition-colors duration-200 hover:bg-[#062e69]/10 rounded-lg flex items-center space-x-1"
                    title="Select Language"
                  >
                    <Languages className="w-5 h-5" />
                    {selectedLanguage && (
                      <span className="text-sm font-medium max-w-20 truncate">
                        {selectedLanguage.split("/")[0]}
                      </span>
                    )}
                  </button>

                  {/* Language Dropdown */}
                  {showLanguageDropdown && (
                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-white/95 backdrop-blur-xl border border-[#062e69]/30 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto">
                      <div className="p-2">
                        <div className="text-[#062e69] font-medium text-sm mb-2 px-2">
                          Select Language
                        </div>
                        {languages.map((language) => (
                          <button
                            key={language}
                            onClick={() => handleLanguageSelect(language)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                              selectedLanguage === language
                                ? "bg-[#062e69] text-white"
                                : "text-[#062e69] hover:bg-[#062e69]/10"
                            }`}
                          >
                            {language}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

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
          <button
            onClick={() => handleButtonClick("Translation")}
            className={`group relative backdrop-blur-xl border font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-[#062e69]/25 px-6 py-3 rounded-xl ${
              selectedButton === "Translation"
                ? "bg-blue-900 text-white border-[#062e69] shadow-lg"
                : "bg-white/90 border-[#062e69]/30 hover:border-[#062e69]/50 text-[#062e69]"
            }`}
          >
            Translation
          </button>

          {/* Timesheet Button */}
          <button
            onClick={() => handleButtonClick("Timesheet")}
            className={`group backdrop-blur-xl border font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-[#062e69]/25 px-6 py-3 rounded-xl ${
              selectedButton === "Timesheet"
                ? "bg-blue-900 text-white border-[#062e69] shadow-lg"
                : "bg-white/90 border-[#062e69]/30 hover:border-[#062e69]/50 text-[#062e69]"
            }`}
          >
            Timesheet
          </button>

          {/* Matters Button */}
          <button
            onClick={() => handleButtonClick("Matters")}
            className={`group backdrop-blur-xl border font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-[#062e69]/25 px-6 py-3 rounded-xl ${
              selectedButton === "Matters"
                ? "bg-blue-900 text-white border-[#062e69] shadow-lg"
                : "bg-white/90 border-[#062e69]/30 hover:border-[#062e69]/50 text-[#062e69]"
            }`}
          >
            Matters
          </button>

          {/* Entries Button */}
          <button
            onClick={() => handleButtonClick("Entries")}
            className={`group backdrop-blur-xl border font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-[#062e69]/25 px-6 py-3 rounded-xl ${
              selectedButton === "Entries"
                ? "bg-blue-900 text-white border-[#062e69] shadow-lg"
                : "bg-white/90 border-[#062e69]/30 hover:border-[#062e69]/50 text-[#062e69]"
            }`}
          >
            Entries
          </button>
        </div>

        {/* Timesheet Form */}
        {showTimesheet && (
          <div className="mt-8 animate-fade-in">
            <TimesheetForm
              onClose={() => {
                setShowTimesheet(false);
                setSelectedButton(null);
              }}
            />
          </div>
        )}

        {/* Timesheet Entries */}
        {showEntries && (
          <div className="mt-8 animate-fade-in">
            <TimesheetEntries
              onClose={() => {
                setShowEntries(false);
                setSelectedButton(null);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
