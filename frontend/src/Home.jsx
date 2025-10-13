import React, {useState, useRef, useEffect} from "react";
import {
  Send,
  Mic,
  Paperclip,
  X,
  FileText,
  File,
  LogOut,
  User,
  Languages,
  Download,
  Eye,
  Loader2,
  CheckCircle,
  Upload,
  Bell,
  BellOff,
  Clock,
  AlertCircle,
  DownloadCloud
} from "lucide-react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import TimesheetForm from "./TimesheetForm";
import TimesheetEntries from "./TimesheetEntries";
import { 
  useHomeLogic, 
  notificationHelper, 
  languages, 
  formatFileSize 
} from "./HomeLogic";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { renderAsync } from 'docx-preview';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  if (fileType.includes("presentation") || fileName.match(/\.(ppt|pptx)$/i)) {
    return <FileText className="w-4 h-4 text-orange-400" />;
  }
  return <File className="w-4 h-4 text-gray-400" />;
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'PROCESSING':
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case 'FAILED':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Clock className="w-4 h-4 text-yellow-500" />;
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'COMPLETED':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'PROCESSING':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'FAILED':
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  }
};

const Home = ({ user, onBack, onLogout }) => {
  const {
    percentage,
    query,
    setQuery,
    selectedButton,
    selectedLanguage,
    showLanguageDropdown,
    setShowLanguageDropdown,
    uploadedFiles,
    setUploadedFiles,
    isDragOver,
    isTranslating,
    translationResult,
    translationJobs,
    jobStatuses,
    previewText,
    showPreview,
    setShowPreview,
    fileInputRef,
    showTimesheet,
    setShowTimesheet,
    showEntries,
    setShowEntries,
    isListening,
    textTranslationResult,
    setTextTranslationResult,
    notificationPermission,
    handleRequestNotificationPermission,
    previewFile,
    previewFileType, 
    toggleListening,
    handleButtonClick,
    handleLanguageSelect,
    handleSubmit,
    handleFileInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeFile,
    handleDownload,
    handleDownloadAll
  } = useHomeLogic();

  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedJobForPreview, setSelectedJobForPreview] = useState(null);
  const [previewingFile, setPreviewingFile] = useState(null);
  const docxPreviewRef = useRef(null);

  const [showFileSelector, setShowFileSelector] = useState(false);

  useEffect(() => {
  setShowFileSelector(translationJobs.length > 0);
}, [translationJobs]);

  // Handle preview file loading when a job is selected for preview
  useEffect(() => {
    const loadPreviewFile = async () => {
      if (selectedJobForPreview && jobStatuses[selectedJobForPreview]?.status === 'COMPLETED') {
        const jobStatus = jobStatuses[selectedJobForPreview];
        if (jobStatus.download_id) {
          try {
            const response = await fetch(`${import.meta.env.VITE_TRANSLATION_API_URL}/download/${jobStatus.download_id}`, {
              method: 'GET',
            });

            if (response.ok) {
              const blob = await response.blob();
              const contentType = response.headers.get('content-type');
              
              let fileType = null;
              if (contentType) {
                if (contentType.includes('application/pdf')) {
                  fileType = 'pdf';
                } else if (contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
                  fileType = 'docx';
                }
              }

              if (fileType === 'pdf') {
                const blobUrl = URL.createObjectURL(blob);
                setPreviewingFile({ file: blobUrl, type: fileType, jobId: selectedJobForPreview });
              } else {
                setPreviewingFile({ file: blob, type: fileType, jobId: selectedJobForPreview });
              }
            }
          } catch (error) {
            console.error('Error loading preview file:', error);
            setPreviewingFile(null);
          }
        }
      }
    };

    loadPreviewFile();
  }, [selectedJobForPreview, jobStatuses]);

  useEffect(() => {
    if (previewingFile?.file && previewingFile.type === 'docx' && docxPreviewRef.current) {
      // Clear previous content
      docxPreviewRef.current.innerHTML = '';
      
      // Render DOCX preview
      renderAsync(previewingFile.file, docxPreviewRef.current, undefined, {
        className: 'docx-wrapper',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        ignoreLastRenderedPageBreak: true,
        experimental: false,
        trimXmlDeclaration: true,
        useBase64URL: false,
        renderChanges: false,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
      }).catch(error => {
        console.error('Error rendering DOCX:', error);
        docxPreviewRef.current.innerHTML = '<p class="text-red-500 p-4">Error loading document preview</p>';
      });
    }
  }, [previewingFile]);

  const handleClosePreview = () => {
    setShowPreview(false);
    setPageNumber(1);
    setSelectedJobForPreview(null);
    
    if (previewingFile?.file && typeof previewingFile.file === 'string' && previewingFile.file.startsWith('blob:')) {
      URL.revokeObjectURL(previewingFile.file);
    }
    
    setPreviewingFile(null);
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#062e69] to-slate-800 flex relative overflow-hidden">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      {/* Notification Permission Button */}
      {
      notificationHelper.isSupported() && notificationPermission !== "granted" && (
        <div className="fixed top-20 right-4 z-50">
          <button
            onClick={handleRequestNotificationPermission}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
            title="Enable notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="text-sm font-medium">Enable Notifications</span>
          </button>
        </div>
      )}

      {/* Notification Status Indicator */}
      {notificationHelper.isSupported() && (
        <div className="fixed bottom-4 left-4 z-50">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-md text-sm ${
            notificationPermission === "granted" 
              ? "bg-green-100 text-green-800" 
              : notificationPermission === "denied"
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-800"
          }`}>
            {notificationPermission === "granted" ? (
              <>
                <Bell className="w-4 h-4" />
                <span>Notifications enabled</span>
              </>
            ) : notificationPermission === "denied" ? (
              <>
                <BellOff className="w-4 h-4" />
                <span>Notifications blocked</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                <span>Notifications disabled</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#062e69]/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#062e69]/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#062e69]/10 rounded-full blur-2xl animate-ping"></div>
      </div>

      {/* Header with user info and logout */}
      <div className="absolute top-4 left-4 z-20">
        <button 
          className="flex items-center space-x-4 rounded-xl px-4 py-2 text-white hover:bg-white/10 transition-colors" 
          onClick={onBack}
        >
          ← Back to Chatbot Selection
        </button>
      </div>

      <div className="absolute top-4 right-4 z-20">
        <div className="flex items-center space-x-4 bg-white/90 backdrop-blur-xl border border-[#062e69]/30 rounded-xl px-4 py-2 shadow-lg">
          <div className="flex items-center space-x-2 text-[#062e69]">
            <User className="w-4 h-4" />
            <span className="text-sm font-medium">Welcome user</span>
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

      {/* Main Content */}
      <div className={`flex-1 p-6 transition-all duration-300 ${showPreview ? 'pr-2' : ''}`}>
        <div className={`relative z-10 w-full mx-auto transition-all duration-300 ${showPreview ? 'max-w-3xl' : 'max-w-4xl'}`}>
          {/* Logo and Title */}
          <div className="text-center mb-12 animate-fade-in pt-16">
            <div className="flex justify-center items-center mb-6">
              <div className="flex items-center space-x-2">
                <img src={"./logo.png"} className="w-[20vw]" alt="Logo" />
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
                      onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                      className="flex-shrink-0 p-2 text-[#062e69]/70 hover:text-[#062e69] transition-colors duration-200 hover:bg-[#062e69]/10 rounded-lg flex items-center space-x-1"
                      title="Select Language"
                    >
                      <Languages className="w-5 h-5" />
                      {selectedLanguage && (
                        <span className="text-sm font-medium max-w-20 truncate">
                          {selectedLanguage.split(" ")[0]}
                        </span>
                      )}
                      {!selectedLanguage && (
                        <span className="text-sm text-[#062e69]/50">Select</span>
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
                  accept={selectedButton === "Translation" ? ".pdf,.docx,.pptx" : ".pdf,.doc,.docx,.txt,.xls,.xlsx"}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 p-2 text-[#062e69]/70 hover:text-[#062e69] transition-colors duration-200 hover:bg-[#062e69]/10 rounded-lg"
                  title={selectedButton === "Translation" ? "Upload files (PDF, DOCX, PPTX only)" : "Upload files"}
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
                  disabled={isTranslating}
                  className="flex-shrink-0 bg-gradient-to-r from-[#062e69] to-[#062e69]/80 hover:from-[#062e69]/90 hover:to-[#062e69] text-white px-6 py-2 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-[#062e69]/25 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : selectedButton === "Translation" ? (
                    <>
                      <span>Translate</span>
                      <Languages className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Ask</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {isDragOver && (
                <div className="absolute inset-0 bg-[#062e69]/10 backdrop-blur-sm rounded-2xl border-2 border-dashed border-[#062e69]/50 flex items-center justify-center z-10">
                  <div className="text-[#062e69] font-medium flex items-center space-x-2">
                    <Upload className="w-5 h-5" />
                    <span>Drop files here to upload</span>
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
                    onClick={() => {
                      setUploadedFiles([]);
                    }}
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

          {/* Translation Jobs Status Display */}
          {translationJobs.length > 0 && (
            <div className="mb-8 animate-slide-up delay-500">
              <div className="bg-white/90 backdrop-blur-xl border border-[#062e69]/30 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#062e69] flex items-center space-x-2">
                    <Languages className="w-5 h-5" />
                    <span>Translation Jobs ({translationJobs.length})</span>
                  </h3>
                  <button
                    onClick={handleDownloadAll}
                    className="flex items-center space-x-2 bg-[#062e69] text-white px-4 py-2 rounded-lg hover:bg-[#062e69]/90 transition-colors text-sm"
                  >
                    <DownloadCloud className="w-4 h-4" />
                    <span>Download All</span>
                  </button>
                </div>
                
                <div className="space-y-3">
                  {translationJobs.map((job) => {
                    const status = jobStatuses[job.job_id];
                    return (
                      <div
                        key={job.job_id}
                        className="bg-[#062e69]/5 rounded-lg p-4 border border-[#062e69]/10 hover:bg-[#062e69]/10 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            {getFileIcon(job.filename, "")}
                            <div className="flex-1 min-w-0">
                              <div className="text-[#062e69] font-medium text-sm truncate">
                                {job.filename}
                              </div>
                              <div className="text-[#062e69]/60 text-xs">
                                Target: {job.target_language}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            {/* Status */}
                            <div className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center space-x-1 ${getStatusColor(status?.status || 'PENDING')}`}>
                              {getStatusIcon(status?.status || 'PENDING')}
                              <span>{status?.status || 'PENDING'}</span>
                            </div>
                            
                            {/* Preview Button */}
                            {status?.status === 'COMPLETED' && (
                              <button
                                onClick={() => {
                                  setSelectedJobForPreview(job.job_id);
                                  setShowPreview(true);
                                }}
                                className="p-2 text-[#062e69]/70 hover:text-[#062e69] hover:bg-[#062e69]/10 rounded-lg transition-colors"
                                title="Preview"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            
                            {/* Download Button */}
                            {status?.status === 'COMPLETED' && (
                              <button
                                onClick={() => handleDownload(job.job_id)}
                                className="p-2 text-[#062e69]/70 hover:text-[#062e69] hover:bg-[#062e69]/10 rounded-lg transition-colors"
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {status?.updated_at && (
                          <div className="mt-2 text-xs text-[#062e69]/50">
                            Last updated: {new Date(status.updated_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-4 animate-slide-up delay-400">
            <button
              onClick={() => handleButtonClick("Translation")}
              className={`group relative backdrop-blur-xl border font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-[#062e69]/25 px-6 py-3 rounded-xl ${
                selectedButton === "Translation"
                  ? "bg-blue-900 text-white border-[#062e69] shadow-lg"
                  : "bg-white/90 border-[#062e69]/30 hover:border-[#062e69]/50 text-[#062e69]"
              }`}
            >
              <Languages className="w-4 h-4 inline-block mr-2" />
              Translation
            </button>

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

          {/* Text Translation Result */}
          {textTranslationResult && (
            <div className="mt-8 animate-slide-up delay-500">
              <div className="bg-white/90 backdrop-blur-xl border border-[#062e69]/30 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <h3 className="text-lg font-semibold text-[#062e69]">
                      Translation Complete
                    </h3>
                  </div>
                  <button
                    onClick={() => setTextTranslationResult(null)}
                    className="p-1 text-[#062e69]/60 hover:text-[#062e69] transition-colors rounded-lg hover:bg-[#062e69]/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-[#062e69]/70 mb-2 block">
                      Original Text:
                    </label>
                    <p className="text-[#062e69] bg-[#062e69]/5 rounded-lg p-3 border border-[#062e69]/10">
                      {query}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-[#062e69]/70 mb-2 block">
                      Translated Text ({selectedLanguage}):
                    </label>
                    <p className="text-[#062e69] bg-green-50 rounded-lg p-3 border border-green-200 font-medium">
                      {textTranslationResult.translated_text}
                    </p>
                  </div>
                  
                  {textTranslationResult.message && (
                    <div className="text-sm text-green-600 flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>{textTranslationResult.message}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Timesheet Form */}
          {showTimesheet && (
            <div className="mt-8 animate-fade-in">
              <TimesheetForm
                onClose={() => {
                  setShowTimesheet(false);
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
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Preview Panel */}
      {showPreview && (
        <div className="w-1/2 p-2 bg-white/5 backdrop-blur-sm border-l border-white/10 animate-slide-in-right">
          <div className="h-full bg-white/95 backdrop-blur-xl border border-[#062e69]/30 rounded-2xl shadow-lg flex flex-col overflow-y-auto max-h-screen">
            {/* Preview Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#062e69]/10">
              <div className="flex items-center space-x-2">
                <Eye className="w-5 h-5 text-[#062e69]" />
                <h3 className="text-lg font-semibold text-[#062e69]">
                  Translation Preview
                </h3>

                {showFileSelector && translationJobs.length > 1 && (
                  <p className="pl-5 text-lg">Accuracy: {percentage}%</p>
                )}
              </div>
              <button
                onClick={handleClosePreview}
                className="p-1 text-[#062e69]/60 hover:text-[#062e69] transition-colors rounded-lg hover:bg-[#062e69]/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* File Selection */}
            {translationJobs.length > 0 && (
  <div className="p-4 border-b border-[#062e69]/10">
    <label className="text-sm font-medium text-[#062e69]/70 mb-2 block">
      Select file to preview:
    </label>
    <select
      value={selectedJobForPreview || ''}
      onChange={(e) => setSelectedJobForPreview(e.target.value)}
      className="w-full p-2 border border-[#062e69]/30 rounded-lg bg-white text-[#062e69] focus:outline-none focus:border-[#062e69]/50"
    >
      <option value="">Choose a file...</option>
      {translationJobs
        .filter(job => jobStatuses[job.job_id]?.status === 'COMPLETED')
        .map(job => (
          <option key={job.job_id} value={job.job_id}>
            {job.filename}
          </option>
        ))}
    </select>
  </div>
)}

            {/* Preview Content */}
            <div className="flex-1 p-4 overflow-y-auto">
              {previewingFile && previewingFile.type === 'pdf' ? (
                <div className="flex flex-col items-center">
                  <Document
                    file={previewingFile.file} // This will now be a blob URL string
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="w-8 h-8 animate-spin text-[#062e69]" />
                      </div>
                    }
                    error={
                      <div className="text-red-500 p-4 text-center">
                        <p className="mb-2">Error loading PDF preview.</p>
                        <p className="text-sm text-gray-600">
                          The translated file is still available for download below.
                        </p>
                      </div>
                    }
                    onLoadError={(error) => {
                      console.error('PDF load error:', error);
                    }}
                  >
                    <Page
                      pageNumber={pageNumber}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="shadow-lg"
                      width={Math.min(window.innerWidth * 0.4, 800)}
                      onLoadError={(error) => {
                        console.error('PDF page load error:', error);
                      }}
                    />
                  </Document>
                  
                  {numPages && numPages > 1 && (
                    <div className="mt-4 flex items-center gap-4 bg-[#062e69]/10 px-4 py-2 rounded-lg">
                      <button
                        onClick={goToPrevPage}
                        disabled={pageNumber <= 1}
                        className="px-3 py-1 bg-[#062e69] text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-[#062e69] font-medium">
                        Page {pageNumber} of {numPages}
                      </span>
                      <button
                        onClick={goToNextPage}
                        disabled={pageNumber >= numPages}
                        className="px-3 py-1 bg-[#062e69] text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              ) : previewingFile && previewingFile.type === 'docx' ? (
                <div 
                  ref={docxPreviewRef}
                  className="docx-preview-container bg-white p-4 rounded-lg shadow-inner"
                  style={{
                    minHeight: '500px',
                    maxWidth: '100%',
                    overflow: 'auto'
                  }}
                />
              ) : selectedJobForPreview ? (
                <div className="flex items-center justify-center h-full text-[#062e69]/60">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 mx-auto mb-2 opacity-40 animate-spin" />
                    <p className="text-sm">Loading preview...</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-[#062e69]/60">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">
                      {translationJobs.length > 0 ? 'Select a completed file to preview' : 'No files available for preview'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Download Button */}
            <div className="p-4 border-t border-[#062e69]/10">
              <button
                onClick={() => selectedJobForPreview && handleDownload(selectedJobForPreview)}
                disabled={!selectedJobForPreview || !jobStatuses[selectedJobForPreview]?.download_id}
                className="w-full bg-gradient-to-r from-[#062e69] to-[#062e69]/80 hover:from-[#062e69]/90 hover:to-[#062e69] text-white px-4 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-[#062e69]/25 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <Download className="w-4 h-4" />
                <span>
                  {selectedJobForPreview 
                    ? `Download ${translationJobs.find(j => j.job_id === selectedJobForPreview)?.filename || 'File'}`
                    : 'Select file to download'
                  }
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
