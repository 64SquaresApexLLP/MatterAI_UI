import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Download, Loader2, AlertCircle } from "lucide-react";
import { renderAsync } from "docx-preview";

const TranslationViewer = ({ records }) => {
  const { translationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [translationData, setTranslationData] = useState(null);
  const [loadingOriginal, setLoadingOriginal] = useState(false);
  const [loadingTranslated, setLoadingTranslated] = useState(false);
  const [error, setError] = useState(null);
  
  const originalDocxRef = useRef(null);
  const translatedDocxRef = useRef(null);

  // Find translation record from location state or records prop
  useEffect(() => {
    if (location.state?.record) {
      // Use record passed via navigation state
      setTranslationData(location.state.record);
    } else if (records && translationId) {
      // Find record in records prop
      const record = records.find(
        (r) => r.translation_id === translationId
      );
      
      if (record) {
        setTranslationData(record);
      } else {
        setError("Translation record not found");
      }
    } else {
      setError("No translation data available");
    }
  }, [translationId, records, location.state]);

  // Load original document
  useEffect(() => {
    const loadOriginalDocument = async () => {
      if (!translationData?.original_file_s3_url || !originalDocxRef.current) {
        return;
      }

      try {
        setLoadingOriginal(true);
        const response = await fetch(translationData.original_file_s3_url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch original document: ${response.status}`);
        }
        
        const blob = await response.blob();
        
        // Clear previous content
        if (originalDocxRef.current) {
          originalDocxRef.current.innerHTML = "";
        }
        
        await renderAsync(blob, originalDocxRef.current);
      } catch (err) {
        console.error("Error loading original document:", err);
        setError(`Error loading original document: ${err.message}`);
      } finally {
        setLoadingOriginal(false);
      }
    };

    loadOriginalDocument();
  }, [translationData]);

  // Load translated document
  useEffect(() => {
    const loadTranslatedDocument = async () => {
      if (!translationData?.translated_file_s3_url || !translatedDocxRef.current) {
        return;
      }

      try {
        setLoadingTranslated(true);
        const response = await fetch(translationData.translated_file_s3_url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch translated document: ${response.status}`);
        }
        
        const blob = await response.blob();
        
        // Clear previous content
        if (translatedDocxRef.current) {
          translatedDocxRef.current.innerHTML = "";
        }
        
        await renderAsync(blob, translatedDocxRef.current);
      } catch (err) {
        console.error("Error loading translated document:", err);
        setError(`Error loading translated document: ${err.message}`);
      } finally {
        setLoadingTranslated(false);
      }
    };

    loadTranslatedDocument();
  }, [translationData]);

  const handleDownload = (url, filename) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank"; // Open in new tab for large files
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1929] to-[#1e3a5f] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 max-w-md p-6 bg-red-900/20 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <h2 className="text-white text-xl font-semibold">Error</h2>
          <p className="text-gray-300 text-center">
            {error}
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-white text-[#1e3a5f] rounded-lg hover:bg-gray-100 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!translationData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1929] to-[#1e3a5f] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
          <p className="text-white text-lg">Loading translation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1929] to-[#1e3a5f]">
      {/* Header */}
      <div className="bg-[#1e3a5f]/50 border-b border-[#2d4a6f] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-[#244166] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-white">
                {translationData.original_filename}
              </h1>
              <p className="text-sm text-gray-300">
                {translationData.source_language} → {translationData.target_language}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                translationData.translation_status === "COMPLETED"
                  ? "bg-green-500/20 text-green-400"
                  : translationData.translation_status === "FAILED"
                  ? "bg-red-500/20 text-red-400"
                  : "bg-yellow-500/20 text-yellow-400"
              }`}
            >
              {translationData.translation_status}
            </span>
          </div>
        </div>
      </div>

      {/* Content - Side by Side */}
      <div className="w-full mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Original Document */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Original Document
              </h2>
              <button
                onClick={() =>
                  handleDownload(
                    translationData.original_file_s3_url,
                    translationData.original_filename
                  )
                }
                className="flex items-center space-x-2 px-3 py-2 bg-[#244166] hover:bg-[#2d4a6f] text-white rounded-lg transition-colors text-sm"
                disabled={loadingOriginal}
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            </div>
            <div className="bg-white rounded-lg shadow-lg overflow-hidden relative min-h-[600px]">
              {loadingOriginal && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                  <Loader2 className="w-8 h-8 text-[#1e3a5f] animate-spin" />
                </div>
              )}
              <div
                ref={originalDocxRef}
                className="docx-preview-container bg-white p-4"
                style={{
                  minHeight: "600px",
                  maxHeight: "800px",
                  overflow: "auto",
                }}
              />
            </div>
          </div>

          {/* Translated Document */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Translated Document
              </h2>
              <button
                onClick={() =>
                  handleDownload(
                    translationData.translated_file_s3_url,
                    translationData.translated_filename
                  )
                }
                className="flex items-center space-x-2 px-3 py-2 bg-[#244166] hover:bg-[#2d4a6f] text-white rounded-lg transition-colors text-sm"
                disabled={loadingTranslated}
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            </div>
            <div className="bg-white rounded-lg shadow-lg overflow-hidden relative min-h-[600px]">
              {loadingTranslated && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                  <Loader2 className="w-8 h-8 text-[#1e3a5f] animate-spin" />
                </div>
              )}
              <div
                ref={translatedDocxRef}
                className="docx-preview-container bg-white p-4"
                style={{
                  minHeight: "600px",
                  maxHeight: "800px",
                  overflow: "auto",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranslationViewer;