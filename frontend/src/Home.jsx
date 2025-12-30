import {
  React,
  useNavigate,
  useState,
  useRef,
  useEffect,
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
  DownloadCloud,
  TrendingUp,
  AlertTriangle,
  Info,
  Globe,
  Copy,
  MessageCircle,
  FileSymlink,
  ToastContainer,
  TimesheetForm,
  TimesheetEntries,
  useHomeLogic,
  notificationHelper,
  languages,
  formatFileSize,
  TimesheetOptions,
  Document,
  Page,
  pdfjs,
  pdfjsLib,
  renderAsync,
  loadNotoCJK,
  previewCJKPdf,
  docxPdf,
  Packer,
  Paragraph,
  TextRun,
  PDFDocument,
  rgb,
  Shield,
  FileWarning,
  Type,
  Zap,
  Settings,
} from "./Imports.jsx";
import {
  jurisdictions,
  jurisdictionPrompts,
  legendData,
  pdfOptions,
  fileTypeOptions,
} from "./StaticData.jsx";
import UseStates from "./UseStates.jsx";
import { translationRecords } from "./utils/translationRecords.js";
import History from "./History.jsx";
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
// import AdminPanel from "./Profile.jsx";

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
    setTranslationJobs,
    jobStatuses,
    setJobStatuses,
    evaluationData,
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
    chatResponse,
    setChatResponse,
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
    handleDownloadAll,
    fetchEvaluation,
    refreshEvaluations,
    extractLanguagesFromPrompt,
    LANGUAGE_MAPPING,
    isPotentiallyCJK,
    handleFileConversion,
    showDeltaModal,
    selectedDeltaData,
    loadingDelta,
    handleViewDelta,
    closeDeltaModal,
    fetchDeltaData,
    correctedFileId,
    translationAPI,
  } = useHomeLogic();
  const {
    numPages,
    setNumPages,
    pageNumber,
    setPageNumber,
    selectedJobForPreview,
    setSelectedJobForPreview,
    previewingFile,
    setPreviewingFile,
    showEvaluationDetails,
    setShowEvaluationDetails,
    previewUrl,
    setPreviewUrl,
    currentPreviewFileType,
    setCurrentPreviewFileType,
    useCJKMode,
    setUseCJKMode,
    showJurisdictionDropdown,
    setShowJurisdictionDropdown,
    docxPreviewRef,
    selectedJurisdiction,
    setSelectedJurisdiction,
    showPromptSection,
    setShowPromptSection,
    showOptionsSection,
    setShowOptionsSection,
    showFileSelector,
    setShowFileSelector,
    convertingToPdf,
    setConvertingToPdf,
    hoveredItem,
    setHoveredItem,
    selectedTargetFileType,
    setSelectedTargetFileType,
    showFileTypeDropdown,
    setShowFileTypeDropdown,
    isExpanded,
    setIsExpanded,
  } = UseStates();
  const navigate = useNavigate();

  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [jobToCancel, setJobToCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const translate_url = import.meta.env.VITE_TRANSLATION_API_URL;

  const { records, loading } = translationRecords(translate_url);

  const isSuperAdmin =
    user?.user?.role_name === "SuperAdmin" || user?.role_name === "SuperAdmin";
  const isOrgAdmin =
    user?.user?.role_name === "OrgAdmin" || user?.role_name === "OrgAdmin";
  const isUser = user?.user?.role_name === "User" || user?.role_name === "User";

  useEffect(() => {
    setShowFileSelector(translationJobs.length > 0);
  }, [translationJobs]);

  useEffect(() => {
    const loadPreviewFile = async () => {
      if (
        selectedJobForPreview &&
        jobStatuses[selectedJobForPreview]?.status === "COMPLETED"
      ) {
        const jobStatus = jobStatuses[selectedJobForPreview];
        const selectedJob = translationJobs.find(
          (job) => job.job_id === selectedJobForPreview
        );
        if (jobStatus.download_id && selectedJob) {
          try {
            const mightBeCJK = isPotentiallyCJK(
              selectedJob.filename,
              selectedJob.target_language
            );
            const response = await fetch(
              `${import.meta.env.VITE_TRANSLATION_API_URL}/download/${
                jobStatus.download_id
              }`,
              {
                method: "GET",
              }
            );
            if (response.ok) {
              const contentType = response.headers.get("content-type");
              if (contentType && contentType.includes("application/pdf")) {
                if (mightBeCJK) {
                  await loadNotoCJK();
                  await previewCJKPdf(
                    jobStatus.download_id,
                    setPreviewUrl,
                    setCurrentPreviewFileType,
                    setUseCJKMode,
                    setShowPreview
                  );
                  setPreviewingFile(null);
                } else {
                  const blob = await response.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  setPreviewingFile({
                    file: blobUrl,
                    type: "pdf",
                    jobId: selectedJobForPreview,
                  });
                  setUseCJKMode(false);
                  setPreviewUrl(null);
                  setCurrentPreviewFileType(null);
                }
              } else if (
                contentType &&
                contentType.includes(
                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                )
              ) {
                const blob = await response.blob();
                setPreviewingFile({
                  file: blob,
                  type: "docx",
                  jobId: selectedJobForPreview,
                });
                setUseCJKMode(false);
                setPreviewUrl(null);
                setCurrentPreviewFileType(null);
              }
            }
          } catch (error) {
            console.error("Error loading preview file:", error);
            setPreviewingFile(null);
            setPreviewUrl(null);
            setCurrentPreviewFileType(null);
            setUseCJKMode(false);
          }
        }
      }
    };
    loadPreviewFile();
  }, [selectedJobForPreview, jobStatuses, translationJobs]);

  useEffect(() => {
    if (
      previewingFile?.file &&
      previewingFile.type === "docx" &&
      docxPreviewRef.current
    ) {
      docxPreviewRef.current.innerHTML = "";
      renderAsync(previewingFile.file, docxPreviewRef.current, undefined, {
        className: "docx-wrapper",
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
        fontMapping: {
          SimSun: 'SimSun, "MS Mincho", "Yu Gothic", "Malgun Gothic", serif',
          "MS Mincho": 'SimSun, "MS Mincho", "Yu Gothic", serif',
          "Noto Sans CJK":
            "Noto Sans CJK SC, Noto Sans CJK TC, Noto Sans CJK JP, Noto Sans CJK KR, sans-serif",
          "Arial Unicode MS":
            'Arial Unicode MS, "Yu Gothic", "Malgun Gothic", sans-serif',
          "Malgun Gothic": 'Malgun Gothic, "Yu Gothic", sans-serif',
        },
      }).catch((error) => {
        console.error("Error rendering DOCX:", error);
        docxPreviewRef.current.innerHTML =
          '<p class="text-red-500 p-4">Error loading document preview</p>';
      });
    }
  }, [previewingFile]);

  const previewWidth = showDeltaModal ? "30vw" : "50vw";

  const canShowPreview =
    showPreview &&
    (correctedFileId ||
      (selectedJobForPreview &&
        jobStatuses[selectedJobForPreview]?.status === "COMPLETED"));

  useEffect(() => {
    if (showDeltaModal && correctedFileId) {
      // Force preview panel open
      setShowPreview(true);

      // Mark preview as "external corrected file"
      setSelectedJobForPreview(null);

      // Trigger preview load manually
      (async () => {
        try {
          const response = await fetch(
            `${
              import.meta.env.VITE_TRANSLATION_API_URL
            }/download/${correctedFileId}`,
            { method: "GET" }
          );

          if (!response.ok) return;

          const contentType = response.headers.get("content-type");

          if (contentType?.includes("pdf")) {
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            setPreviewingFile({
              file: blobUrl,
              type: "pdf",
              jobId: null,
            });

            setUseCJKMode(false);
            setPreviewUrl(null);
            setCurrentPreviewFileType("application/pdf");
          }
        } catch (err) {
          console.error("Corrected preview load failed:", err);
        }
      })();
    }
  }, [showDeltaModal, correctedFileId]);

  const examplePrompt = selectedJurisdiction
    ? jurisdictionPrompts.get(selectedJurisdiction)
    : "Please select a jurisdiction to see the appropriate example patent translation prompt.";

  const handleClosePreview = () => {
    setShowPreview(false);
    setPageNumber(1);
    setSelectedJobForPreview(null);
    if (
      previewingFile?.file &&
      typeof previewingFile.file === "string" &&
      previewingFile.file.startsWith("blob:")
    ) {
      URL.revokeObjectURL(previewingFile.file);
    }
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewingFile(null);
    setPreviewUrl(null);
    setCurrentPreviewFileType(null);
    setUseCJKMode(false);
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  const toggleEvaluationDetails = (jobId) => {
    setShowEvaluationDetails((prev) => ({
      ...prev,
      [jobId]: !prev[jobId],
    }));
  };

  const groupJobsByFilename = () => {
    const grouped = {};
    translationJobs.forEach((job) => {
      if (!grouped[job.filename]) {
        grouped[job.filename] = [];
      }
      grouped[job.filename].push(job);
    });
    return grouped;
  };

  const groupedJobs = groupJobsByFilename();

  const detectMultiLanguageMode = () => {
    if (uploadedFiles.length === 1 && query.trim()) {
      const extractedLanguages = extractLanguagesFromPrompt(query);
      return extractedLanguages.length > 1;
    }
    return false;
  };

  const convertDocxToPdf = async (docxBlob, filename) => {
    setConvertingToPdf(true);

    try {
      const arrayBuffer = await docxBlob.arrayBuffer();
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 800]);
      const { width, height } = page.getSize();

      page.drawText("Converted from DOCX to PDF", {
        x: 50,
        y: height - 50,
        size: 15,
        color: rgb(0, 0, 0),
      });

      page.drawText(`Original filename: ${filename}`, {
        x: 50,
        y: height - 80,
        size: 12,
        color: rgb(0, 0, 0),
      });

      page.drawText("Note: This is a placeholder PDF conversion.", {
        x: 50,
        y: height - 110,
        size: 10,
        color: rgb(0.5, 0.5, 0.5),
      });

      page.drawText(
        "Full DOCX to PDF conversion requires server-side processing.",
        {
          x: 50,
          y: height - 130,
          size: 10,
          color: rgb(0.5, 0.5, 0.5),
        }
      );

      const pdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
      const pdfFilename = filename.replace(/\.docx?$/i, ".pdf");

      setConvertingToPdf(false);
      return { blob: pdfBlob, filename: pdfFilename };
    } catch (error) {
      console.error("Error converting DOCX to PDF:", error);
      setConvertingToPdf(false);
      throw error;
    }
  };

  const base64ToBlob = (base64, mimeType) => {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: mimeType });
  };

  const convertDocxToTextBasedPdf = async (docxBlob, filename) => {
    setConvertingToPdf(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 800]);
      const { width, height } = page.getSize();
      const text = await docxBlob.text();
      page.drawText(`Converted: ${filename}`, {
        x: 50,
        y: height - 50,
        size: 15,
        color: rgb(0, 0, 0),
      });
      page.drawText("DOCX content preview (basic conversion):", {
        x: 50,
        y: height - 80,
        size: 12,
        color: rgb(0, 0, 0),
      });
      page.drawText("This is a basic PDF conversion.", {
        x: 50,
        y: height - 110,
        size: 10,
        color: rgb(0, 0, 0),
      });
      page.drawText(
        "For full formatting preservation, consider server-side conversion.",
        {
          x: 50,
          y: height - 130,
          size: 10,
          color: rgb(0.5, 0.5, 0.5),
        }
      );
      const pdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
      const pdfFilename = filename.replace(/\.docx?$/i, "_converted.pdf");
      setConvertingToPdf(false);
      return { blob: pdfBlob, filename: pdfFilename };
    } catch (error) {
      console.error("Error converting DOCX to PDF:", error);
      setConvertingToPdf(false);
      throw error;
    }
  };

  const isMultiLanguageMode = detectMultiLanguageMode();
  // Always show delete button; filename uses truncation to prevent layout overflow

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
      case "COMPLETED":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "PROCESSING":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case "FAILED":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "COMPLETED":
        return "text-green-600 bg-green-50 border-green-200";
      case "PROCESSING":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "FAILED":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
    }
  };

  const hasProcessingJobs = () =>
    Object.values(jobStatuses || {}).some((j) => j?.status === "PROCESSING");

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (accuracy >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    if (accuracy >= 40) return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  useEffect(() => {
    console.log("Translation Jobs:", translationJobs);
    console.log("Job Statuses:", jobStatuses);
    console.log("Evaluation Data:", evaluationData);
  }, [translationJobs, jobStatuses, evaluationData]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasProcessingJobs()) {
        e.preventDefault();
        e.returnValue =
          "Your translation is still processing. Refreshing or closing the window may result in a failed translation.";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [jobStatuses]);

  const handleCancelClick = (job) => {
    setJobToCancel(job);
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    if (!jobToCancel || isCancelling) return;

    setIsCancelling(true);
    
    try {
      const result = await translationAPI.cancelTranslation(jobToCancel.job_id);
      toast.success(`Translation cancelled: ${jobToCancel.filename}`);
      
      // Close modal immediately
      setShowCancelModal(false);
      setJobToCancel(null);
      
      // Update job status locally without reloading
      setJobStatuses((prev) => ({
        ...prev,
        [jobToCancel.job_id]: {
          ...prev[jobToCancel.job_id],
          status: "CANCELLED",
        },
      }));
      
    } catch (error) {
      toast.error(`Failed to cancel: ${error.message}`);
    } finally {
      setIsCancelling(false);
      setShowCancelModal(false);
      setJobToCancel(null);
    }
  };

  const handleCancelModalClose = () => {
    if (isCancelling) return; // Prevent closing while cancelling
    setShowCancelModal(false);
    setJobToCancel(null);
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-900 via-[#062e69] to-slate-800 flex relative overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${
          isDragOver
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="w-full h-full bg-[#062e69]/20 backdrop-blur-md flex items-center justify-center">
          <div className="bg-white/80 w-[50%] h-[50%] backdrop-blur-xl rounded-3xl p-12 border-4 border-dashed border-[#062e69]/70 shadow-2xl flex items-center justify-center">
            <div className="text-[#062e69] text-center">
              <Upload className="w-16 h-16 mx-auto mb-4" />
              <p className="text-2xl font-semibold">
                Drop files here to upload
              </p>
              <p className="text-sm mt-2 opacity-70">
                {selectedButton === "Translation"
                  ? "Supported formats: PDF, DOCX, PPTX"
                  : selectedButton === "File_Converter"
                  ? "Supported formats: PDF, DOC, DOCX"
                  : "Release to upload your files"}
              </p>
            </div>
          </div>
        </div>
        s
      </div>
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
      {notificationHelper.isSupported() &&
        notificationPermission !== "granted" && (
          <div className="fixed top-4 right-4 z-50">
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
      {notificationHelper.isSupported() && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-md text-sm ${
              notificationPermission === "granted"
                ? "bg-green-100 text-green-800"
                : notificationPermission === "denied"
                ? "bg-red-100 text-red-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
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
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#062e69]/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#062e69]/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#062e69]/10 rounded-full blur-2xl animate-ping"></div>
      </div>
      <History
        user={user}
        records={records}
        loading={loading}
        onLogout={onLogout}
        onToggle={setIsHistoryOpen}
      />
      <div
        className="transition-all duration-300 max-h-screen overflow-y-auto p-6"
        style={{
          width: canShowPreview
            ? isHistoryOpen
              ? `calc(100vw - 320px - ${previewWidth})`
              : previewWidth
            : isHistoryOpen
            ? "calc(100vw - 320px)"
            : "100vw",
          marginLeft: isHistoryOpen ? "320px" : "0",
        }}
      >
        <div
          className={`relative z-10 w-full mx-auto transition-all duration-300 ${
            canShowPreview ? "max-w-3xl" : "max-w-5xl"
          }`}
        >
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
          <div className="mb-4 animate-slide-up delay-200">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#062e69]/25 to-white/20 rounded-2xl blur-xl group-hover:blur-2xl"></div>
              <div
                className={`relative bg-white/95 backdrop-blur-xl border rounded-2xl p-4 flex items-center space-x-4 transition-all duration-300 ${
                  isDragOver
                    ? "border-[#062e69]/70 bg-white shadow-xl"
                    : "border-[#062e69]/30 hover:border-[#062e69]/50 shadow-lg"
                }`}
                // onDragOver={handleDragOver}
                // onDragLeave={handleDragLeave}
                // onDrop={handleDrop}
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
                  placeholder={
                    selectedButton === "Translation"
                      ? "Translate to Chinese, German, French, English | Drag & Drop your file for translation"
                      : selectedButton === "File_Converter"
                      ? "Convert file to Word/PDF... | Drag & Drop your file for conversion"
                      : "Case related questions..."
                  }
                  className="flex-1 bg-transparent text-[#062e69] placeholder-[#062e69]/50 focus:outline-none text-lg font-medium"
                />
                {selectedButton === "Translation" && (
                  <div className="relative flex mr-1">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setShowLanguageDropdown(!showLanguageDropdown)
                        }
                        className="p-2 text-[#062e69]/70 hover:text-[#062e69] transition-colors duration-200 hover:bg-[#062e69]/10 rounded-lg flex items-center space-x-1"
                        title="Select Language"
                      >
                        <Languages className="w-5 h-5" />
                        {selectedLanguage ? (
                          <span className="text-sm font-medium max-w-20 truncate">
                            {selectedLanguage.split(" ")[0]}
                          </span>
                        ) : (
                          <span className="text-sm text-[#062e69]/50">
                            Language
                          </span>
                        )}
                      </button>
                      {showLanguageDropdown && (
                        <div className="absolute bottom-full right-0 mb-2 w-48 bg-white/95 backdrop-blur-xl border border-[#062e69]/30 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto">
                          <div className="p-2">
                            <div className="text-[#062e69] font-medium text-sm mb-2 px-2">
                              Select Language
                            </div>
                            {languages.map((language) => (
                              <button
                                key={language}
                                onClick={() => {
                                  handleLanguageSelect(language);
                                  setShowLanguageDropdown(false);
                                }}
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
                  </div>
                )}
                {selectedButton === "File_Converter" && (
                  <div className="relative flex mr-1">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setShowFileTypeDropdown(!showFileTypeDropdown)
                        }
                        className="p-2 text-[#062e69]/70 hover:text-[#062e69] transition-colors duration-200 hover:bg-[#062e69]/10 rounded-lg flex items-center space-x-1"
                        title="Select Target File Type"
                      >
                        <FileText className="w-5 h-5" />
                        {selectedTargetFileType ? (
                          <span className="text-sm font-medium max-w-20 truncate">
                            {fileTypeOptions.File_Converter.find(
                              (ft) => ft.value === selectedTargetFileType
                            )?.label || "File Type"}
                          </span>
                        ) : (
                          <span className="text-sm text-[#062e69]/50">
                            Target Format
                          </span>
                        )}
                      </button>
                      {showFileTypeDropdown && (
                        <div className="absolute bottom-full right-0 mb-2 w-48 bg-white/95 backdrop-blur-xl border border-[#062e69]/30 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto">
                          <div className="p-2">
                            <div className="text-[#062e69] font-medium text-sm mb-2 px-2">
                              Select Target Format
                            </div>
                            {["pdf", "docx"].map((format) => (
                              <button
                                key={format}
                                onClick={() => {
                                  console.log(
                                    "Setting target file type to:",
                                    format
                                  );
                                  setSelectedTargetFileType(format);
                                  setShowFileTypeDropdown(false);
                                  console.log(
                                    "After setting - selectedTargetFileType:",
                                    format
                                  );
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                                  selectedTargetFileType === format
                                    ? "bg-[#062e69] text-white"
                                    : "text-[#062e69] hover:bg-[#062e69]/10"
                                }`}
                              >
                                {format.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  multiple={!isMultiLanguageMode}
                  accept={
                    selectedButton === "Translation"
                      ? ".pdf,.docx,.pptx"
                      : selectedButton === "File_Converter"
                      ? ".pdf,.doc,.docx"
                      : ".pdf,.doc,.docx,.txt,.xls,.xlsx"
                  }
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 m-0 p-2 text-[#062e69]/70 hover:text-[#062e69] transition-colors duration-200 hover:bg-[#062e69]/10 rounded-lg"
                  title={
                    selectedButton === "Translation"
                      ? "Upload files (PDF, DOCX, PPTX only)"
                      : selectedButton === "File_Converter"
                      ? "Upload files (PDF, DOC, DOCX only)"
                      : "Upload files"
                  }
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  onClick={
                    selectedButton === "File_Converter"
                      ? () => handleFileConversion(selectedTargetFileType)
                      : handleSubmit
                  }
                  disabled={
                    isTranslating ||
                    (selectedButton === "File_Converter" &&
                      (!uploadedFiles.length || !selectedTargetFileType))
                  }
                  className="ml-2 flex-shrink-0 bg-gradient-to-r from-[#062e69] to-[#062e69]/80 hover:from-[#062e69]/90 hover:to-[#062e69] text-white px-3 py-2 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-[#062e69]/25 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : selectedButton === "Translation" ? (
                    <>
                      <span>Translate</span>
                    </>
                  ) : selectedButton === "File_Converter" ? (
                    <>
                      <span>
                        Convert to {selectedTargetFileType?.toUpperCase()}
                      </span>
                      <FileSymlink className="w-5 h-5" />
                    </>
                  ) : (
                    <>
                      <span>Ask</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          {selectedButton === "Translation" && isMultiLanguageMode && (
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg animate-slide-up">
              <div className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900">
                    🌍 Multi-Language Mode Active
                  </p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Your file will be translated to multiple languages based on
                    your prompt
                  </p>
                </div>
              </div>
            </div>
          )}
          {selectedButton === "Translation" && (
            <div className="mt-2 mb-4 text-xs text-white/70 text-center bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <div
                className="flex items-center justify-between mb-1 cursor-pointer"
                onClick={() => setShowOptionsSection((prev) => !prev)}
              >
                <div className="flex items-center space-x-2">
                  <Languages className="w-4 h-4" />
                  <strong>Translation Options</strong>
                </div>
                <span className="select-none">
                  {showOptionsSection ? "−" : "+"}
                </span>
              </div>
              {showOptionsSection && (
                <div className="space-y-1 text-left">
                  <p>
                    📋 <strong>Single Language:</strong> Select language
                    dropdown OR type "Translate to Spanish"
                  </p>
                  <p>
                    🌐 <strong>Multiple Languages:</strong> Upload 1 file + type
                    "Translate to German, French, and Spanish"
                  </p>
                  <p>
                    📚 <strong>Multiple Files:</strong> Upload multiple files +
                    select one language
                  </p>
                </div>
              )}
            </div>
          )}
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
          {uploadedFiles.length > 0 && (
            <div className="mb-8 animate-slide-up delay-300">
              <div className="bg-white/90 backdrop-blur-xl border border-[#062e69]/30 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[#062e69] font-medium text-sm flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>Uploaded Files ({uploadedFiles.length})</span>
                    {isMultiLanguageMode && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full border border-blue-300">
                        Multi-language mode
                      </span>
                    )}
                  </h3>
                  <button
                    onClick={async () => {
                      try {
                        // Clear cancelled jobs from backend
                        await translationAPI.clearCancelledJobs();
                        
                        // Clear uploaded files from frontend
                        setUploadedFiles([]);
                        
                        // Remove cancelled jobs from UI by filtering them out
                        const filteredJobs = translationJobs.filter(
                          job => jobStatuses[job.job_id]?.status !== "CANCELLED"
                        );
                        setTranslationJobs(filteredJobs);
                        
                        // Update job statuses to remove cancelled ones
                        const filteredStatuses = { ...jobStatuses };
                        Object.keys(filteredStatuses).forEach(jobId => {
                          if (filteredStatuses[jobId]?.status === "CANCELLED") {
                            delete filteredStatuses[jobId];
                          }
                        });
                        setJobStatuses(filteredStatuses);
                        
                        toast.success("All files and cancelled jobs cleared");
                      } catch (error) {
                        console.error("Error clearing:", error);
                        toast.error("Failed to clear cancelled jobs");
                      }
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
                        className="p-1 text-[#062e69]/60 hover:text-red-500 transition-colors duration-200 opacity-0 group-hover:opacity-100 flex-shrink-0"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {translationJobs.length > 0 && (
            <div className="mb-8 animate-slide-up delay-500">
              <div className="bg-white/90 backdrop-blur-xl border border-[#062e69]/30 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#062e69] flex items-center space-x-2">
                    <Languages className="w-5 h-5" />
                    <span>Translation Jobs</span>
                    <span className="text-sm font-normal text-[#062e69]/60">
                      ({translationJobs.length} total,{" "}
                      {Object.keys(groupedJobs).length} file
                      {Object.keys(groupedJobs).length > 1 ? "s" : ""})
                    </span>
                  </h3>
                  <button
                    onClick={handleDownloadAll}
                    className="flex items-center space-x-2 bg-[#062e69] text-white px-4 py-2 rounded-lg hover:bg-[#062e69]/90 transition-colors text-sm"
                  >
                    <DownloadCloud className="w-4 h-4" />
                    <span>Download All Completed</span>
                  </button>
                </div>
                <div className="space-y-4">
                  {Object.entries(groupedJobs).map(([filename, jobs]) => (
                    <div
                      key={filename}
                      className="border border-[#062e69]/20 rounded-xl p-4 bg-[#062e69]/5"
                    >
                      <div className="flex items-center space-x-2 mb-3">
                        {getFileIcon(filename, "")}
                        <h4 className="font-semibold text-[#062e69]">
                          {filename}
                        </h4>
                        <span className="text-xs text-[#062e69]/60">
                          ({jobs.length} translation{jobs.length > 1 ? "s" : ""}{" "}
                          - {jobs.map((j) => j.target_language).join(", ")})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {jobs.map((job) => {
                          const status = jobStatuses[job.job_id];
                          const evaluation = evaluationData[job.job_id];
                          return (
                            <div
                              key={job.job_id}
                              className="bg-white rounded-lg p-3 border border-[#062e69]/10 hover:bg-[#062e69]/5 transition-all duration-200"
                            >
                              {/* Show large cancel button for PROCESSING/QUEUED jobs */}
                              {(status?.status === "PROCESSING" ||
                                status?.status === "QUEUED") && (
                                <div className="mb-3 pb-3 border-b border-[#062e69]/10">
                                  <button
                                    onClick={() => handleCancelClick(job)}
                                    className="w-full px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 border border-red-200 hover:border-red-300"
                                  >
                                    <X className="w-5 h-5" />
                                    <span>Cancel Translation</span>
                                  </button>
                                </div>
                              )}

                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 flex-wrap">
                                      <span className="text-[#062e69] font-medium text-sm">
                                        {job.target_language.toUpperCase()}
                                      </span>
                                      {evaluation &&
                                        evaluation.combined_accuracy !==
                                          undefined && (
                                          <div
                                            className={`px-2 py-0.5 rounded-full text-xs font-medium border flex items-center space-x-1 ${getAccuracyColor(
                                              evaluation.combined_accuracy
                                            )}`}
                                          >
                                            <TrendingUp className="w-3 h-3" />
                                            <span>
                                              {evaluation.combined_accuracy}%
                                              accuracy
                                            </span>
                                          </div>
                                        )}
                                    </div>
                                    {status?.updated_at && (
                                      <div className="text-xs text-[#062e69]/50 mt-0.5">
                                        {new Date(
                                          status.updated_at
                                        ).toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div
                                    className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center space-x-1 ${getStatusColor(
                                      status?.status || "PENDING"
                                    )}`}
                                  >
                                    {getStatusIcon(status?.status || "PENDING")}
                                    <span>{status?.status || "PENDING"}</span>
                                  </div>
                                  {evaluation &&
                                    status?.status === "COMPLETED" && (
                                      <button
                                        onClick={() =>
                                          toggleEvaluationDetails(job.job_id)
                                        }
                                        className="p-1.5 text-[#062e69]/70 hover:text-[#062e69] hover:bg-[#062e69]/10 rounded-lg transition-colors"
                                        title="View Evaluation Details"
                                      >
                                        <Info className="w-4 h-4" />
                                      </button>
                                    )}
                                  {status?.status === "COMPLETED" && (
                                    <button
                                      onClick={() => {
                                        setSelectedJobForPreview(job.job_id);
                                        setShowPreview(true);
                                      }}
                                      className="p-1.5 text-[#062e69]/70 hover:text-[#062e69] hover:bg-[#062e69]/10 rounded-lg transition-colors"
                                      title="Preview"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  )}
                                  {status?.status === "COMPLETED" && (
                                    <button
                                      onClick={() => handleDownload(job.job_id)}
                                      className="p-1.5 text-[#062e69]/70 hover:text-[#062e69] hover:bg-[#062e69]/10 rounded-lg transition-colors"
                                      title="Download"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              {evaluation &&
                                showEvaluationDetails[job.job_id] && (
                                  <div className="mt-3 pt-3 border-t border-[#062e69]/10">
                                    <div className="space-y-2 text-sm">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[#062e69]/70">
                                          Source Language:
                                        </span>
                                        <span className="font-medium text-[#062e69]">
                                          {evaluation.source_language || "N/A"}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-[#062e69]/70">
                                          Evaluation Method:
                                        </span>
                                        <span className="font-medium text-[#062e69] text-xs">
                                          {evaluation.evaluation_method ||
                                            "N/A"}
                                        </span>
                                      </div>
                                      {evaluation.detailed_analysis && (
                                        <>
                                          {evaluation.detailed_analysis
                                            .strengths &&
                                            evaluation.detailed_analysis
                                              .strengths.length > 0 && (
                                              <div className="mt-2">
                                                <div className="text-[#062e69]/70 font-medium mb-1 flex items-center space-x-1">
                                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                                  <span>Strengths:</span>
                                                </div>
                                                <ul className="list-disc list-inside text-[#062e69]/80 space-y-0.5 ml-4">
                                                  {evaluation.detailed_analysis.strengths.map(
                                                    (strength, idx) => (
                                                      <li
                                                        key={idx}
                                                        className="text-xs"
                                                      >
                                                        {strength}
                                                      </li>
                                                    )
                                                  )}
                                                </ul>
                                              </div>
                                            )}
                                          {evaluation.detailed_analysis
                                            .improvement_areas &&
                                            evaluation.detailed_analysis
                                              .improvement_areas.length > 0 && (
                                              <div className="mt-2">
                                                <div className="text-[#062e69]/70 font-medium mb-1 flex items-center space-x-1">
                                                  <AlertTriangle className="w-3 h-3 text-yellow-500" />
                                                  <span>
                                                    Areas for Improvement:
                                                  </span>
                                                </div>
                                                <ul className="list-disc list-inside text-[#062e69]/80 space-y-0.5 ml-4">
                                                  {evaluation.detailed_analysis.improvement_areas.map(
                                                    (area, idx) => (
                                                      <li
                                                        key={idx}
                                                        className="text-xs"
                                                      >
                                                        {area}
                                                      </li>
                                                    )
                                                  )}
                                                </ul>
                                              </div>
                                            )}
                                          {evaluation.detailed_analysis
                                            .overall_assessment && (
                                            <div className="mt-2">
                                              <div className="text-[#062e69]/70 font-medium mb-1">
                                                Overall Assessment:
                                              </div>
                                              <p className="text-[#062e69]/80 text-xs bg-[#062e69]/5 p-2 rounded">
                                                {
                                                  evaluation.detailed_analysis
                                                    .overall_assessment
                                                }
                                              </p>
                                            </div>
                                          )}
                                        </>
                                      )}
                                      {evaluation.error && (
                                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                                          <strong>Evaluation Error:</strong>{" "}
                                          {evaluation.error}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
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
              onClick={() => handleButtonClick("File_Converter")}
              className={`group backdrop-blur-xl border font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-[#062e69]/25 px-6 py-3 rounded-xl ${
                selectedButton === "File_Converter"
                  ? "bg-blue-900 text-white border-[#062e69] shadow-lg"
                  : "bg-white/90 border-[#062e69]/30 hover:border-[#062e69]/50 text-[#062e69]"
              }`}
            >
              File Converter
            </button>
          </div>
          {chatResponse && (
            <div className="mt-8 animate-slide-up delay-500">
              <div className="bg-white/90 backdrop-blur-xl border border-blue-300 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-[#062e69]">
                      Chat Response
                    </h3>
                  </div>
                  <button
                    onClick={() => setChatResponse(null)}
                    className="p-1 text-[#062e69]/60 hover:text-[#062e69] transition-colors rounded-lg hover:bg-[#062e69]/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-[#062e69]/70 mb-2 block">
                      Your Message:
                    </label>
                    <p className="text-[#062e69] bg-[#062e69]/5 rounded-lg p-3 border border-[#062e69]/10">
                      {chatResponse.query}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#062e69]/70 mb-2 block">
                      Response (
                      {chatResponse.source_language || "Auto-detected"}):
                    </label>
                    <p className="text-[#062e69] bg-blue-50 rounded-lg p-3 border border-blue-200 font-medium whitespace-pre-wrap">
                      {chatResponse.response}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
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
                      Translated Text (
                      {textTranslationResult.target_language ||
                        selectedLanguage}
                      ):
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
          {showTimesheet && (
            <div className="mt-8 animate-fade-in">
              <TimesheetOptions
                user={user}
                onClose={() => {
                  setShowTimesheet(false);
                }}
              />
            </div>
          )}
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
      {/* {showPreview && (  */}
      {canShowPreview && (
        <div
          className={`fixed top-0 h-full ${
            showDeltaModal
              ? "right-[35vw] w-[35vw] bg-white/5 backdrop-blur-sm border-l border-white/10"
              : "right-0 w-[50vw]"
          } p-2 overflow-y-auto z-40`}
        >
          <div className="h-full bg-white/95 backdrop-blur-xl border border-[#062e69]/30 rounded-2xl shadow-lg flex flex-col overflow-y-auto max-h-screen">
            {/* Header Section */}
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleClosePreview}
                  className="p-1 text-[#062e69]/60 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                  title="Close Preview"
                >
                  <X className="w-4 h-4" />
                </button>
                <h3 className="text-lg font-semibold text-[#062e69]">
                  {correctedFileId
                    ? "Previewing corrected output:"
                    : "Select file to preview:"}
                </h3>

                {/* {translationJobs.length > 0 && ( */}
                {translationJobs.length > 0 && !correctedFileId && (
                  <div className="">
                    <select
                      value={selectedJobForPreview || ""}
                      onChange={(e) => setSelectedJobForPreview(e.target.value)}
                      className="p-2 border border-[#062e69]/30 rounded-lg bg-white text-[#062e69] focus:outline-none focus:border-[#062e69]/50"
                    >
                      <option value="">Choose a file...</option>
                      {translationJobs
                        .filter(
                          (job) =>
                            jobStatuses[job.job_id]?.status === "COMPLETED"
                        )
                        .map((job) => {
                          const evaluation = evaluationData[job.job_id];
                          return (
                            <option key={job.job_id} value={job.job_id}>
                              {job.filename} -{" "}
                              {job.target_language.toUpperCase()}
                              {evaluation?.combined_accuracy !== undefined
                                ? ` (${evaluation.combined_accuracy}% accuracy)`
                                : ""}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                )}
                {useCJKMode && (
                  <div className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full border border-blue-300">
                    🌏 CJK Mode
                  </div>
                )}
              </div>
              <button
                onClick={handleClosePreview}
                className="p-1 text-[#062e69]/60 hover:text-[#062e69] transition-colors rounded-lg hover:bg-[#062e69]/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* NEW: Delta Quality Report Button */}
            {selectedJobForPreview &&
              jobStatuses[selectedJobForPreview]?.delta_id && (
                <div className="px-4 pb-2">
                  <button
                    onClick={() => handleViewDelta(selectedJobForPreview)}
                    className="w-full bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
                  >
                    {/* <Shield className="w-4 h-4" /> */}
                    <span>View Delta Reasoning Report </span>
                  </button>
                </div>
              )}

            {/* Preview Content */}
            <div className="flex-1 p-0 overflow-y-auto">
              {useCJKMode &&
              previewUrl &&
              currentPreviewFileType === "application/pdf" ? (
                <iframe
                  src={previewUrl}
                  title="PDF Preview"
                  className="w-full h-full border-0 rounded-lg shadow-lg"
                  style={{ minHeight: "600px" }}
                />
              ) : previewingFile && previewingFile.type === "pdf" ? (
                <div className="flex flex-col items-center">
                  <Document
                    options={pdfOptions}
                    file={previewingFile.file}
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
                          The translated file is still available for download
                          below.
                        </p>
                      </div>
                    }
                    onLoadError={(error) => {
                      console.error("PDF load error:", error);
                    }}
                  >
                    <Page
                      pageNumber={pageNumber}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="shadow-lg"
                      width={Math.min(window.innerWidth * 0.4, 800)}
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
              ) : previewingFile && previewingFile.type === "docx" ? (
                <div
                  ref={docxPreviewRef}
                  className="docx-preview-container bg-white p-1 pt-0 pb-0 rounded-lg shadow-inner"
                  style={{
                    minHeight: "500px",
                    maxWidth: "100%",
                    overflow: "auto",
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
                      {translationJobs.length > 0
                        ? "Select a completed file to preview"
                        : "No files available for preview"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Download Button Footer */}
            <div className="p-1 border-t border-[#062e69]/10">
              <div className="fixed bottom-14 right-5 z-50 flex items-center gap-3">
                {hoveredItem && (
                  <div className="p-2 w-64 bg-gray-900 text-white rounded-lg shadow-2xl animate-fadeIn mt-[30%]">
                    {/* <p className="text-xs leading-relaxed"> */}
                    {/* {
                  legendData.find((item) => item.id === hoveredItem)
                    ?.description
                } */}
                    {/* </p> */}
                  </div>
                )}
              </div>
              <center>
                <button
                  onClick={() => {
                    if (correctedFileId) {
                      translationAPI
                        .download(correctedFileId)
                        .then(async (res) => {
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "corrected_file";
                          a.click();
                          URL.revokeObjectURL(url);
                        });
                    } else if (selectedJobForPreview) {
                      handleDownload(selectedJobForPreview);
                    }
                  }}
                  disabled={
                    !correctedFileId &&
                    (!selectedJobForPreview ||
                      !jobStatuses[selectedJobForPreview]?.download_id)
                  }
                  className="w-full bg-gradient-to-r from-[#062e69] to-[#062e69]/80 hover:from-[#062e69]/90 hover:to-[#062e69] text-white px-4 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-100 hover:shadow-lg hover:shadow-[#062e69]/25 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {selectedJobForPreview
                      ? `Download ${
                          translationJobs.find(
                            (j) => j.job_id === selectedJobForPreview
                          )?.filename || "File"
                        }`
                      : "Select file to download"}
                  </span>
                </button>
              </center>
            </div>
          </div>
        </div>
      )}

      {/* Delta Quality Report Modal */}
      {showDeltaModal && selectedDeltaData && (
        <div className="fixed right-0 top-0 h-full w-[35vw] p-2 bg-white/5 backdrop-blur-sm border-l border-white/10 overflow-y-auto z-50">
          <div className="h-full bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-2 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="w-6 h-6 ml-2" />
                <h2 className="text-xl font-bold">Delta Reasoning Report</h2>
              </div>
              <button
                onClick={closeDeltaModal}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-mono text-sm bg-white p-4 leading-relaxed overflow-x-auto">
                {selectedDeltaData.raw}
              </pre>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={closeDeltaModal}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
              >
                Close
              </button>

              <button
                onClick={() => {
                  const blob = new Blob([selectedDeltaData.raw], {
                    type: "text/plain",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download =
                    selectedDeltaData.filename || "delta_reasoning_report.txt";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download TXT Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            // Close modal when clicking outside, but not while cancelling
            if (e.target === e.currentTarget && !isCancelling) {
              handleCancelModalClose();
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-slide-up">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white">
                  Cancel Translation?
                </h3>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to cancel the translation for:
              </p>
              <p className="text-[#062e69] font-semibold mb-4">
                {jobToCancel?.filename}
              </p>
              <p className="text-sm text-gray-600 mb-6">
                This action cannot be undone. The translation progress will be lost.
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={handleCancelModalClose}
                  disabled={isCancelling}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                    isCancelling
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  No, Keep It
                </button>
                <button
                  onClick={handleCancelConfirm}
                  disabled={isCancelling}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
                    isCancelling
                      ? "bg-red-300 cursor-not-allowed"
                      : "bg-red-500 hover:bg-red-600"
                  } text-white`}
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4" />
                      <span>Yes, Cancel</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
