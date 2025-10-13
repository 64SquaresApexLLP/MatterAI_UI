import { useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import { queryAPI } from "./api/apiService.js";

// Translation API Service
const TRANSLATION_API_BASE_URL = import.meta.env.VITE_TRANSLATION_API_URL;

// Language mapping to match backend expectations
const LANGUAGE_MAPPING = {
  "Chinese (Mandarin)": "simplified chinese",
  "Japanese": "japanese",
  "German": "german",
  "French": "french",
  "Spanish": "spanish",
  "Italian": "italian",
  "English": "english",
  "Korean": "korean",
  "Swedish": "swedish",
  "Danish": "danish",
  "Finnish": "finnish",
  "Dutch": "dutch"
};

export const translationAPI = {
  translate: async (file, targetLanguage) => {
    console.log('=== Translation Request Debug ===');
    console.log('File object:', file);
    console.log('File name:', file.name);
    console.log('File type:', file.type);
    console.log('File size:', file.size);
    console.log('Target language:', targetLanguage);

    const formData = new FormData();
    formData.append('file', file.file);
    
    const backendLanguage = LANGUAGE_MAPPING[targetLanguage] || targetLanguage.toLowerCase();
    console.log('Backend language:', backendLanguage);
    formData.append('target_language', backendLanguage);

    const response = await fetch(`${TRANSLATION_API_BASE_URL}/translate`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  },

  translateText: async (text, targetLanguage) => {
    const backendLanguage = LANGUAGE_MAPPING[targetLanguage] || targetLanguage.toLowerCase();
    
    const response = await fetch(`${TRANSLATION_API_BASE_URL}/translate_text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        target_language: backendLanguage
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  },

  download: async (file) => {
    console.log("download file:", file)
    const response = await fetch(`${TRANSLATION_API_BASE_URL}/download/${file}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Download failed');
    }

    return response;
  },

  preview: async (fileId) => {
    const response = await fetch(`${TRANSLATION_API_BASE_URL}/preview/${fileId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Preview failed');
    }

    return await response.json();
  }
};

// Browser Notification Helper
export const notificationHelper = {
  isSupported: () => {
    return "Notification" in window;
  },

  getPermission: () => {
    if (!notificationHelper.isSupported()) return "unsupported";
    return Notification.permission;
  },

  requestPermission: async () => {
    if (!notificationHelper.isSupported()) {
      return "unsupported";
    }

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return "denied";
    }
  },

  show: (title, options = {}) => {
    if (!notificationHelper.isSupported()) {
      console.warn("Notifications not supported");
      return null;
    }

    if (Notification.permission === "granted") {
      const notification = new Notification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        ...options
      });

      setTimeout(() => notification.close(), 5000);

      return notification;
    } else {
      console.warn("Notification permission not granted");
      return null;
    }
  }
};

export const languages = [
  "Chinese (Mandarin)",
  "German",
  "French",
  "Spanish",
  "Italian",
  "Swedish",
  "Danish",
  "Dutch",
  "Finnish",
  "Korean",
  "Japanese",
  "English",
];

export const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const useHomeLogic = () => {
  const [percentage, setPercentage] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedButton, setSelectedButton] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationResult, setTranslationResult] = useState(null);
  const [previewText, setPreviewText] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);
  const [showTimesheet, setShowTimesheet] = useState(false);
  const [showEntries, setShowEntries] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const [textTranslationResult, setTextTranslationResult] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState("default");
  const [previewFile, setPreviewFile] = useState(null);
  const [previewFileType, setPreviewFileType] = useState(null);

  useEffect(() => {
    const randomPercentage = Math.floor(Math.random() * (80 - 60 + 1)) + 60;
    setPercentage(randomPercentage);

    if (notificationHelper.isSupported()) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

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

  const handleRequestNotificationPermission = async () => {
    if (!notificationHelper.isSupported()) {
      toast ? toast.error("Notifications are not supported in this browser") : 
             alert("Notifications are not supported in this browser");
      return;
    }

    const permission = await notificationHelper.requestPermission();
    setNotificationPermission(permission);

    if (permission === "granted") {
      toast ? toast.success("Notifications enabled successfully!") : 
             alert("Notifications enabled successfully!");
      
      notificationHelper.show("Notifications Enabled", {
        body: "You'll be notified when translations are complete",
        tag: "permission-granted"
      });
    } else if (permission === "denied") {
      toast ? toast.error("Notification permission denied. You can enable it in your browser settings.") : 
             alert("Notification permission denied. You can enable it in your browser settings.");
    }
  };
  
  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast ? toast.error("Speech recognition not supported in this browser.") : 
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

  const handleButtonClick = (buttonName) => {
    if (selectedButton === buttonName) {
      setSelectedButton(null);
    } else {
      setSelectedButton(buttonName);
    }

    if (buttonName !== "Timesheet" && showTimesheet) {
      setShowTimesheet(false);
    }

    if (buttonName !== "Entries" && showEntries) {
      setShowEntries(false);
    }

    if (buttonName === "Timesheet") {
      setShowTimesheet(true);
      setShowEntries(false);
    } else {
      setShowTimesheet(false);
    }

    if (buttonName === "Entries") {
      setShowEntries(true);
      setShowTimesheet(false);
    } else if (buttonName !== "Entries") {
      setShowEntries(false);
    }

    if (buttonName !== "Translation") {
      setTranslationResult(null);
      setTextTranslationResult(null);
      setPreviewText("");
      setPreviewFile(null);
      setPreviewFileType(null);
      setShowPreview(false);
      setShowLanguageDropdown(false);
    }
  };

  const handleLanguageSelect = (language) => {
    setSelectedLanguage(language);
    setShowLanguageDropdown(false);
  };

  const handleTranslateFiles = async () => {
    if (selectedButton !== "Translation") {
      const message = "Please select Translation option first";
      toast ? toast.error(message) : alert(message);
      return;
    }

    if (!selectedLanguage) {
      const message = "Please select a target language";
      toast ? toast.error(message) : alert(message);
      return;
    }

    if (uploadedFiles.length === 0) {
      const message = "Please upload files to translate";
      toast ? toast.error(message) : alert(message);
      return;
    }

    const fileToTranslate = uploadedFiles[0];
    
    setIsTranslating(true);
    const translatingToast = toast ? toast.loading("Translating your document...") : null;

    try {
      const result = await translationAPI.translate(fileToTranslate, selectedLanguage);
      
      if (toast) {
        toast.update(translatingToast, {
          render: "Translation completed successfully!",
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
      } else {
        alert("Translation completed successfully!");
      }

      setTranslationResult(result);
      
      // Download the file for preview instead of using preview text
      if (result.file_id) {
        try {
          const response = await translationAPI.download(result.file_id);
          const blob = await response.blob();

          const blobUrl = URL.createObjectURL(blob);
          
          // Determine file type from content-type or original file
          const contentType = response.headers.get('content-type');
          let fileType = null;
          
          if (contentType) {
            if (contentType.includes('application/pdf')) {
              fileType = 'pdf';
            } else if (contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
              fileType = 'docx';
            }
          }
          
          // Fallback to original file extension
          if (!fileType) {
            if (fileToTranslate.name.toLowerCase().endsWith('.pdf')) {
              fileType = 'pdf';
            } else if (fileToTranslate.name.toLowerCase().endsWith('.docx')) {
              fileType = 'docx';
            }
          }
          
          setPreviewFile(blobUrl);
          setPreviewFileType(fileType);
          setShowPreview(true);
          
        } catch (previewError) {
          console.error("Error loading preview:", previewError);
          setShowPreview(true); // Still show the panel with download option
        }
      } else {
        setShowPreview(true);
      }

    } catch (error) {
      console.error("Translation error:", error);
      const errorMessage = `Translation failed: ${error.message}`;
      
      if (toast) {
        toast.update(translatingToast, {
          render: errorMessage,
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const handleTranslateText = async () => {
    if (!selectedLanguage) {
      const message = "Please select a target language";
      toast ? toast.error(message) : alert(message);
      return;
    }
    
    if (!query.trim()) {
      const message = "Please enter text to translate";
      toast ? toast.error(message) : alert(message);
      return;
    }
    
    setIsTranslating(true);
    const translatingToast = toast ? toast.loading("Translating your text...") : null;
    
    try {
      const result = await translationAPI.translateText(query, selectedLanguage);
      
      if (toast) {
        toast.update(translatingToast, {
          render: "Text translation completed successfully!",
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
      } else {
        alert("Text translation completed successfully!");
      }
      
      setTextTranslationResult(result);
    } catch (error) {
      console.error("Text translation error:", error);
      const errorMessage = `Translation failed: ${error.message}`;
      
      if (toast) {
        toast.update(translatingToast, {
          render: errorMessage,
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedButton === "Translation") {
      if (uploadedFiles.length > 0) {
        await handleTranslateFiles();
      } else if (query.trim()) {
        await handleTranslateText();
      } else {
        const message = "Please enter text to translate or upload a file";
        toast ? toast.error(message) : alert(message);
      }
    } else if (query.trim()) {
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
          const message = `Query processed successfully! ${response.message}`;
          toast ? toast.success(message) : alert(message);
        } else {
          console.error("Query failed:", response.message);
          const message = `Query failed: ${response.message}`;
          toast ? toast.error(message) : alert(message);
        }
      } catch (error) {
        console.error("Query error:", error);
        const message = `Query error: ${error.message}`;
        toast ? toast.error(message) : alert(message);
      }
    }
  };

  const handleFileUpload = async (files) => {
    const fileArray = Array.from(files);
    
    if (selectedButton === "Translation") {
      const validFiles = [];
      const invalidFiles = [];

      fileArray.forEach(file => {
        const validTypes = [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        ];
        
        const isValidType = validTypes.includes(file.type) || file.name.match(/\.(pdf|docx|pptx)$/i);

        if (isValidType) {
          const fileObj = {
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            type: file.type,
            file: file
          };
          validFiles.push(fileObj);
        } else {
          invalidFiles.push(file.name);
        }
      });

      if (validFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...validFiles]);
        const message = `${validFiles.length} file(s) uploaded successfully`;
        toast ? toast.success(message) : console.log(message);
      }

      if (invalidFiles.length > 0) {
        const message = `Invalid files (only PDF, DOCX, PPTX allowed): ${invalidFiles.join(', ')}`;
        toast ? toast.error(message) : alert(message);
      }
    } else {
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
          const message = `${failedUploads.length} files failed to upload`;
          toast ? toast.error(message) : alert(message);
        }
      } catch (error) {
        console.error("File upload error:", error);
        const message = `File upload failed: ${error.message}`;
        toast ? toast.error(message) : alert(message);
      }
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
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
    if (translationResult) {
      setTranslationResult(null);
      setPreviewText("");
      setPreviewFile(null);
      setPreviewFileType(null);
      setShowPreview(false);
    }
  };

  const handleDownload = async () => {
    if (!translationResult?.file_id) {
      const message = "No file available for download";
      toast ? toast.error(message) : alert(message);
      return;
    }

    const downloadToast = toast ? toast.loading("Preparing download...") : null;

    try {
      const response = await translationAPI.download(translationResult.file_id);
      const blob = await response.blob();

      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'translated_document';

      const contentType = response.headers.get('content-type');
      let fileExtension = '';

      if (contentType) {
        if (contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
          fileExtension = '.docx';
        } else if (contentType.includes('application/pdf')) {
          fileExtension = '.pdf';
        }
      }

      if (contentDisposition && contentDisposition.includes('filename=')) {
        filename = contentDisposition
          .split('filename=')[1]
          .split(';')[0]
          .replace(/"/g, '');
      }

      filename = filename.endsWith(fileExtension) ? filename : filename + fileExtension;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      if (toast) {
        toast.update(downloadToast, {
          render: "File downloaded successfully!",
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
      } else {
        alert("File downloaded successfully!");
      }

    } catch (error) {
      console.error("Download error:", error);
      const errorMessage = `Download failed: ${error.message}`;
      
      if (toast) {
        toast.update(downloadToast, {
          render: errorMessage,
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
      } else {
        alert(errorMessage);
      }
    }
  };

  return {
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
    previewFile,
    previewFileType,
    handleRequestNotificationPermission,
    toggleListening,
    handleButtonClick,
    handleLanguageSelect,
    handleSubmit,
    handleFileInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeFile,
    handleDownload
  };
};