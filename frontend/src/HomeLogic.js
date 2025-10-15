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

// Helper function to extract languages from prompt
const extractLanguagesFromPrompt = (prompt) => {
  const lowerPrompt = prompt.toLowerCase();
  
  // Pattern 1: "Translate to German, French, and Spanish"
  // Pattern 2: "Translate to German and French"
  // Pattern 3: "German, French, Spanish"
  
  const languages = [];
  
  // Check each language in mapping
  Object.keys(LANGUAGE_MAPPING).forEach(lang => {
    if (lowerPrompt.includes(lang.toLowerCase())) {
      languages.push(lang);
    }
  });
  
  // Also check for backend language names
  Object.values(LANGUAGE_MAPPING).forEach(lang => {
    if (lowerPrompt.includes(lang) && !languages.find(l => LANGUAGE_MAPPING[l] === lang)) {
      // Find the display name for this backend language
      const displayName = Object.keys(LANGUAGE_MAPPING).find(
        key => LANGUAGE_MAPPING[key] === lang
      );
      if (displayName && !languages.includes(displayName)) {
        languages.push(displayName);
      }
    }
  });
  
  return languages;
};

export const translationAPI = {
  translateFileConvoWithPrompt: async (files, prompt) => {
    console.log('=== Translation File Convo Request Debug ===');
    console.log('Files:', files);
    console.log('Files count:', files.length);
    console.log('Prompt:', prompt);

    const formData = new FormData();
    
    // Add multiple files to FormData
    files.forEach((file, index) => {
      console.log(`File ${index}:`, file.name, file.type, file.size);
      formData.append('files', file.file);
    });
    
    // Use the prompt directly as provided
    formData.append('prompt', prompt);

    const response = await fetch(`${TRANSLATION_API_BASE_URL}/translate_file_convo`, {
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

  translateFileConvo: async (files, targetLanguage) => {
    const backendLanguage = LANGUAGE_MAPPING[targetLanguage] || targetLanguage.toLowerCase();
    return translationAPI.translateFileConvoWithPrompt(files, `Translate to ${backendLanguage}`);
  },

  // NEW: Translate single file to multiple languages
  translateFileToMultipleLanguages: async (file, promptOrLanguages) => {
    console.log('=== Multi-Language Translation Request ===');
    console.log('File:', file.name);
    console.log('Prompt/Languages:', promptOrLanguages);

    let languages = [];
    
    // Check if it's an array of languages or a prompt string
    if (Array.isArray(promptOrLanguages)) {
      languages = promptOrLanguages;
    } else if (typeof promptOrLanguages === 'string') {
      languages = extractLanguagesFromPrompt(promptOrLanguages);
    }

    if (languages.length === 0) {
      throw new Error("No valid languages found. Please specify languages like 'Translate to German, French, Spanish'");
    }

    console.log('Extracted languages:', languages);

    // Make separate API calls for each language
    const allJobs = [];
    const results = [];

    for (const language of languages) {
      try {
        const backendLanguage = LANGUAGE_MAPPING[language] || language.toLowerCase();
        console.log(`Translating to ${language} (${backendLanguage})...`);
        
        const result = await translationAPI.translateFileConvoWithPrompt(
          [file], 
          `Translate to ${backendLanguage}`
        );
        
        results.push({
          language,
          success: true,
          jobs: result.jobs || []
        });
        
        allJobs.push(...(result.jobs || []));
      } catch (error) {
        console.error(`Failed to translate to ${language}:`, error);
        results.push({
          language,
          success: false,
          error: error.message
        });
      }
    }

    return {
      response: `Translation started for ${languages.length} language(s): ${languages.join(', ')}`,
      jobs: allJobs,
      results,
      languagesCount: languages.length
    };
  },

  checkStatus: async (jobId) => {
    const response = await fetch(`${TRANSLATION_API_BASE_URL}/status/${jobId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  },

  getEvaluation: async (evaluationId) => {
    const response = await fetch(`${TRANSLATION_API_BASE_URL}/evaluation/${evaluationId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
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

  download: async (downloadId) => {
    console.log("download downloadId:", downloadId)
    const response = await fetch(`${TRANSLATION_API_BASE_URL}/download/${downloadId}`, {
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
    return Notification.permission;
  },

  requestPermission: async () => {
    if (!notificationHelper.isSupported()) {
      throw new Error("Notifications not supported");
    }
    return await Notification.requestPermission();
  },

  show: (title, options = {}) => {
    console.log('Attempting to show notification:', title);
    console.log('Current permission:', Notification.permission);
    
    if (!notificationHelper.isSupported()) {
      console.error("Notifications not supported");
      return null;
    }

    if (Notification.permission === "granted") {
      try {
        const notification = new Notification(title, {
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          ...options
        });

        notification.onclick = () => {
          console.log('Notification clicked');
          window.focus();
        };

        notification.onerror = (error) => {
          console.error('Notification error:', error);
        };

        setTimeout(() => notification.close(), 5000);
        return notification;
      } catch (error) {
        console.error('Failed to create notification:', error);
        return null;
      }
    } else {
      console.warn(`Notification permission not granted: ${Notification.permission}`);
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
  const [translationJobs, setTranslationJobs] = useState([]);
  const [jobStatuses, setJobStatuses] = useState({});
  const [evaluationData, setEvaluationData] = useState({});
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
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    const randomPercentage = Math.floor(Math.random() * (90 - 80 + 1)) + 80;
    setPercentage(randomPercentage);

    if (notificationHelper.isSupported()) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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

  // Fetch evaluation data
  const fetchEvaluation = async (evaluationId, jobId) => {
    try {
      const evaluation = await translationAPI.getEvaluation(evaluationId);
      setEvaluationData(prev => ({
        ...prev,
        [jobId]: evaluation
      }));
      return evaluation;
    } catch (error) {
      console.error(`Evaluation fetch error for ${evaluationId}:`, error);
      setEvaluationData(prev => ({
        ...prev,
        [jobId]: { error: error.message }
      }));
    }
  };

  // Poll job status
  const pollJobStatus = async (jobId, filename) => {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        const status = await translationAPI.checkStatus(jobId);
        
        setJobStatuses(prev => ({
          ...prev,
          [jobId]: status
        }));

        if (status.status === 'COMPLETED') {
          // Fetch evaluation data if available
          if (status.evaluation_id) {
            await fetchEvaluation(status.evaluation_id, jobId);
          }

          // Show completion notification
          notificationHelper.show(
            'Translation Complete', 
            { body: `${filename} has been translated successfully!` }
          );
          return status;
        } else if (status.status === 'FAILED') {
          throw new Error(`Translation failed for ${filename}`);
        } else if (attempts < maxAttempts) {
          // Continue polling
          setTimeout(poll, 5000);
        } else {
          throw new Error(`Translation timeout for ${filename}`);
        }
      } catch (error) {
        console.error(`Status check error for ${filename}:`, error);
        setJobStatuses(prev => ({
          ...prev,
          [jobId]: { status: 'FAILED', error: error.message }
        }));
      }
    };

    poll();
  };

  const handleRequestNotificationPermission = async () => {
    console.log('Current permission:', notificationHelper.getPermission());
    console.log('Browser supports notifications:', notificationHelper.isSupported());

    if (!notificationHelper.isSupported()) {
      const message = "Notifications are not supported in this browser";
      toast ? toast.error(message) : alert(message);
      return;
    }

    try {
      const permission = await notificationHelper.requestPermission();
      setNotificationPermission(permission);

      if (permission === "granted") {
        const message = "Notifications enabled successfully!";
        toast ? toast.success(message) : alert(message);

        // Show test notification
        setTimeout(() => {
          notificationHelper.show("Notifications Enabled", {
            body: "You'll be notified when translations are complete",
            tag: "permission-granted"
          });
        }, 500);

      } else if (permission === "denied") {
        const message = "Notification permission denied. You can enable it in your browser settings.";
        toast ? toast.error(message) : alert(message);
      } else {
        const message = "Notification permission was not granted.";
        toast ? toast.warning(message) : alert(message);
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      const message = "Failed to request notification permission";
      toast ? toast.error(message) : alert(message);
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
      setTranslationJobs([]);
      setJobStatuses({});
      setEvaluationData({});
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

    // Validation: Check if either language is selected OR query has text
    if (!selectedLanguage && !query.trim()) {
      const message = "Please either select a target language or enter a prompt with the target language";
      toast ? toast.error(message) : alert(message);
      return;
    }

    if (uploadedFiles.length === 0) {
      const message = "Please upload files to translate";
      toast ? toast.error(message) : alert(message);
      return;
    }

    setIsTranslating(true);
    const translatingToast = toast ? toast.loading(`Translating ${uploadedFiles.length} file(s)...`) : null;

    try {
      let result;

      // NEW LOGIC: Check if single file + multiple languages in prompt
      const extractedLanguages = query.trim() ? extractLanguagesFromPrompt(query) : [];
      const isSingleFileMultiLanguage = uploadedFiles.length === 1 && extractedLanguages.length > 1;

      if (isSingleFileMultiLanguage) {
        // Single file, multiple languages
        console.log('=== Single File Multi-Language Translation ===');
        console.log('File:', uploadedFiles[0].name);
        console.log('Languages:', extractedLanguages);

        result = await translationAPI.translateFileToMultipleLanguages(
          uploadedFiles[0],
          query.trim()
        );

      } else {
        // Original logic: multiple files or single language
        let translationPrompt;
        if (selectedLanguage) {
          const backendLanguage = LANGUAGE_MAPPING[selectedLanguage] || selectedLanguage.toLowerCase();
          translationPrompt = `Translate to ${backendLanguage}`;
          
          if (query.trim()) {
            translationPrompt += `. ${query.trim()}`;
          }
        } else {
          translationPrompt = query.trim();
        }

        console.log('=== Standard Translation Request ===');
        console.log('Translation prompt:', translationPrompt);
        console.log('Number of files:', uploadedFiles.length);

        result = await translationAPI.translateFileConvoWithPrompt(uploadedFiles, translationPrompt);
      }
      
      console.log('=== Translation Response ===');
      console.log('Response:', result.response);
      console.log('Number of jobs created:', result.jobs?.length || 0);
      console.log('Jobs:', result.jobs);
      
      if (toast) {
        toast.update(translatingToast, {
          render: result.response,
          type: "success",
          isLoading: false,
          autoClose: 5000,
        });
      } else {
        alert(result.response);
      }

      setTranslationResult(result);
      setTranslationJobs(result.jobs || []);
      
      // Start polling for each job
      if (result.jobs && result.jobs.length > 0) {
        result.jobs.forEach(job => {
          console.log(`Starting polling for job: ${job.job_id}, File: ${job.filename}, Language: ${job.target_language}`);
          pollJobStatus(job.job_id, job.filename);
        });
      } else {
        console.warn('No jobs returned from translation API');
      }

      setShowPreview(true);

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
    // Validation: Either language selected or query contains language instruction
    if (!selectedLanguage && !query.trim()) {
      const message = "Please either select a target language or specify it in your text";
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
      if (selectedLanguage) {
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
      } else {
        const message = "For text translation without language selection, please use the file translation option";
        toast ? toast.info(message) : alert(message);
        setIsTranslating(false);
        return;
      }
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
      // Validation: Check for either files or text, and either language or prompt
      if (uploadedFiles.length === 0 && !query.trim()) {
        const message = "Please enter text to translate or upload files";
        toast ? toast.error(message) : alert(message);
        return;
      }

      if (!selectedLanguage && !query.trim()) {
        const message = "Please either select a language or include translation instructions in your prompt";
        toast ? toast.error(message) : alert(message);
        return;
      }

      // If files are uploaded, do file translation
      if (uploadedFiles.length > 0) {
        await handleTranslateFiles();
      } 
      // If only text, do text translation (requires language selection)
      else if (query.trim()) {
        if (!selectedLanguage) {
          const message = "For text-only translation, please select a target language";
          toast ? toast.error(message) : alert(message);
          return;
        }
        await handleTranslateText();
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
      // For translation mode, ONLY handle files locally - no server upload
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
        const message = `${validFiles.length} file(s) ready for translation`;
        toast ? toast.success(message) : console.log(message);
      }

      if (invalidFiles.length > 0) {
        const message = `Invalid files (only PDF, DOCX, PPTX allowed): ${invalidFiles.join(', ')}`;
        toast ? toast.error(message) : alert(message);
      }

      return;
    }

    // For other modes (non-translation), validate files first
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

    if (validFiles.length === 0) {
      const message = "No valid files to upload";
      toast ? toast.error(message) : alert(message);
      return;
    }

    // Upload to server only for non-translation modes
    try {
      const uploadPromises = validFiles.map((file) =>
        queryAPI.uploadFile(file).catch(error => {
          console.error(`Failed to upload ${file.name}:`, error);
          return { success: false, error: error.message, fileName: file.name };
        })
      );
      const uploadResults = await Promise.all(uploadPromises);

      const successfulUploads = uploadResults
        .filter((result) => result.success)
        .map((result) => result.file);

      if (successfulUploads.length > 0) {
        setUploadedFiles((prev) => [...prev, ...successfulUploads]);
        const message = `Successfully uploaded ${successfulUploads.length} files`;
        toast ? toast.success(message) : console.log(message);
      }

      const failedUploads = uploadResults.filter((result) => !result.success);
      if (failedUploads.length > 0) {
        console.error("Some files failed to upload:", failedUploads);
        
        const localFiles = validFiles
          .filter(file => failedUploads.some(failed => failed.fileName === file.name))
          .map(file => ({
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            type: file.type,
            file: file,
            uploadFailed: true
          }));

        if (localFiles.length > 0) {
          setUploadedFiles((prev) => [...prev, ...localFiles]);
        }

        const message = `${failedUploads.length} files added locally (server upload failed)`;
        toast ? toast.warning(message) : console.warn(message);
      }
    } catch (error) {
      console.error("File upload error:", error);
      
      const localFiles = validFiles.map(file => ({
        id: Date.now() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
        uploadFailed: true
      }));

      setUploadedFiles((prev) => [...prev, ...localFiles]);
      
      const message = `Files added locally (server unavailable)`;
      toast ? toast.warning(message) : console.warn(message);
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
      setTranslationJobs([]);
      setJobStatuses({});
      setEvaluationData({});
      setPreviewText("");
      setPreviewFile(null);
      setPreviewFileType(null);
      setShowPreview(false);
    }
  };

  const handleDownload = async (jobId) => {
    const jobStatus = jobStatuses[jobId];
    if (!jobStatus?.download_id) {
      const message = "No download available yet. Please wait for translation to complete.";
      toast ? toast.error(message) : alert(message);
      return;
    }

    const downloadToast = toast ? toast.loading("Preparing download...") : null;

    try {
      const response = await translationAPI.download(jobStatus.download_id);
      const blob = await response.blob();

      const contentDisposition = response.headers.get('content-disposition');
      let filename = jobStatus.filename || 'translated_document';

      if (contentDisposition && contentDisposition.includes('filename=')) {
        filename = contentDisposition
          .split('filename=')[1]
          .split(';')[0]
          .replace(/"/g, '');
      }

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
          render: `${filename} downloaded successfully!`,
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
      } else {
        alert(`${filename} downloaded successfully!`);
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

  const handleDownloadAll = async () => {
    const completedJobs = Object.entries(jobStatuses).filter(
      ([jobId, status]) => status.status === 'COMPLETED' && status.download_id
    );

    if (completedJobs.length === 0) {
      const message = "No completed translations available for download yet.";
      toast ? toast.error(message) : alert(message);
      return;
    }

    // Download each completed file
    for (const [jobId, status] of completedJobs) {
      await handleDownload(jobId);
      // Small delay between downloads to prevent overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 500));
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
    translationJobs,
    jobStatuses,
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
    handleDownload,
    handleDownloadAll,
    fetchEvaluation
  };
};