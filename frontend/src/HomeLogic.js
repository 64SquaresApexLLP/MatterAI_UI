import { useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import { queryAPI } from "./api/apiService.js";

// import UseStates from "./UseStates.jsx";

const TRANSLATION_API_BASE_URL = import.meta.env.VITE_TRANSLATION_API_URL;

// Helper function to get auth token dynamically
const getAuthToken = () => {
  const token = localStorage.getItem("authToken");
  console.log(
    "authToken retrieved:",
    token ? `${token.substring(0, 20)}...` : null
  );
  return token;
};
export const detectCJKLanguage = (filename, targetLanguage) => {
  const cjkLanguages = [
    "chinese",
    "mandarin",
    "cantonese",
    "japanese",
    "korean",
    "zh",
    "ja",
    "ko",
    "cn",
    "jp",
    "kr",
  ];

  if (
    targetLanguage &&
    cjkLanguages.some((lang) => targetLanguage.toLowerCase().includes(lang))
  ) {
    return true;
  }
  const cjkRegex =
    /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/;
  if (cjkRegex.test(filename)) {
    return true;
  }
  return false;
};

const LANGUAGE_MAPPING = {
  "Chinese (Mandarin)": "simplified chinese",
  Japanese: "japanese",
  German: "german",
  French: "french",
  Spanish: "spanish",
  Italian: "italian",
  English: "english",
  Korean: "korean",
  Swedish: "swedish",
  Danish: "danish",
  Finnish: "finnish",
  Dutch: "dutch",
};

const extractLanguagesFromPrompt = (prompt) => {
  if (!prompt || typeof prompt !== "string") {
    return [];
  }

  const lowerPrompt = prompt.toLowerCase();
  const foundLanguages = new Set(); // Use Set to avoid duplicates

  // Create a list of all possible language identifiers (display names + backend names)
  const languageIdentifiers = [];

  Object.entries(LANGUAGE_MAPPING).forEach(([displayName, backendName]) => {
    languageIdentifiers.push({
      displayName,
      backendName,
      searchTerms: [
        displayName.toLowerCase(),
        backendName.toLowerCase(),
        // Add abbreviated forms
        ...displayName.toLowerCase().split(" "),
        ...backendName.toLowerCase().split(" "),
      ].filter((term) => term.length > 2), // Filter out very short terms
    });
  });

  // Step 1: Split the prompt by common delimiters
  // Replace multiple delimiters with a single separator
  const normalizedPrompt = lowerPrompt
    .replace(/\s+and\s+/g, ",") // "chinese and japanese" -> "chinese,japanese"
    .replace(/\s*,\s*/g, ",") // "chinese , japanese" -> "chinese,japanese"
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();

  // Split by comma first, then by space for each segment
  const segments = normalizedPrompt
    .split(",")
    .flatMap((seg) => seg.trim().split(" "));

  // Step 2: Check each segment against all language identifiers
  segments.forEach((segment) => {
    if (!segment || segment.length < 3) return; // Skip very short segments

    languageIdentifiers.forEach(({ displayName, searchTerms }) => {
      // Check if segment matches any search term
      const isMatch = searchTerms.some((term) => {
        // Exact match or segment contains the term as a whole word
        return (
          segment === term || segment.includes(term) || term.includes(segment)
        );
      });

      if (isMatch) {
        foundLanguages.add(displayName);
      }
    });
  });

  // Step 3: Additional check - look for full language names in the original prompt
  // This catches cases where languages might be part of longer phrases
  languageIdentifiers.forEach(({ displayName, searchTerms }) => {
    searchTerms.forEach((term) => {
      // Use word boundary regex to match whole words
      const regex = new RegExp(`\\b${term}\\b`, "i");
      if (regex.test(lowerPrompt)) {
        foundLanguages.add(displayName);
      }
    });
  });

  // Convert Set to Array and return
  return Array.from(foundLanguages);
};

/**
 * Translation API functions
 *
 * Note: Citation Preservation
 * The backend automatically preserves citations in translated documents:
 * - Bracketed citations like [0001], [0002] remain unchanged
 * - U.S. patent/application citations (e.g., "U.S. Non-Provisional Application No. 15/947,182")
 * - All citations are preserved during translation to maintain document integrity
 */
export const translationAPI = {
  translateFileConvoWithPrompt: async (files, prompt) => {
    //console.log('=== Translation File Convo Request Debug ===');
    //console.log('Files:', files);
    //console.log('Files count:', files.length);
    //console.log('Prompt:', prompt);

    const formData = new FormData();

    // Add multiple files to FormData
    files.forEach((file, index) => {
      console.log(`File ${index}:`, file.name, file.type, file.size);
      formData.append("files", file.file);
    });

    // Use the prompt directly as provided
    formData.append("prompt", prompt);

    // Note: Backend handles citation preservation automatically
    // Citations like [0001] and patent references are preserved in translated files
    const response = await fetch(
      `${TRANSLATION_API_BASE_URL}/translate_file_convo`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getAuthToken()}`, // Include JWT token from login
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ detail: "Unknown error" }));
      throw new Error(
        errorData.detail || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  },

  deleteTranslationRecord: async (translationId) => {
    if (!translationId) throw new Error("translationId required");
    const response = await fetch(
      `${TRANSLATION_API_BASE_URL}/translation-records/${translationId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => null);
      throw new Error(errText || `HTTP ${response.status}`);
    }

    // attempt to parse JSON response if present
    const text = await response.text().catch(() => null);
    try {
      return text ? JSON.parse(text) : { success: true };
    } catch (e) {
      return { success: true, message: text };
    }
  },

  translateFileConvo: async (files, targetLanguage) => {
    const backendLanguage =
      LANGUAGE_MAPPING[targetLanguage] || targetLanguage.toLowerCase();
    return translationAPI.translateFileConvoWithPrompt(
      files,
      `Translate to ${backendLanguage}`
    );
  },

  // Cancel a translation job
  cancelTranslation: async (jobId) => {
    if (!jobId) {
      throw new Error("Job ID is required to cancel translation");
    }

    try {
      const response = await fetch(
        `${TRANSLATION_API_BASE_URL}/cancel_translation/${jobId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Failed to cancel translation" }));
        throw new Error(
          errorData.detail || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error cancelling job ${jobId}:`, error);
      throw error;
    }
  },

  // Clear all cancelled job records
  clearCancelledJobs: async () => {
    try {
      const response = await fetch(
        `${TRANSLATION_API_BASE_URL}/clear_cancelled_jobs`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Failed to clear cancelled jobs" }));
        throw new Error(
          errorData.detail || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error clearing cancelled jobs:", error);
      throw error;
    }
  },

  // NEW: Translate multiple files to single language (PARALLEL PROCESSING)
  translateMultipleFilesToSingleLanguage: async (
    files,
    targetLanguage,
    prompt = ""
  ) => {
    console.log("=== Multi-File Translation Request (PARALLEL) ===");
    console.log("Files count:", files.length);
    console.log("Target language:", targetLanguage);
    console.log("Prompt:", prompt);

    if (files.length === 0) {
      throw new Error("No files provided for translation");
    }

    // Backend expects language NAME key (e.g., 'french'), not code ('fr') for bypass
    // Use LANGUAGE_MAPPING to convert display name to backend name
    const backendLanguageName =
      LANGUAGE_MAPPING[targetLanguage] || (targetLanguage || "").toLowerCase();
    console.log(`Backend language name (bypass key): ${backendLanguageName}`);

    console.log(`=== Starting PARALLEL Multi-File Translation ===`);
    console.log(`Total files to translate: ${files.length}`);
    console.log(`Target language: ${targetLanguage} (${backendLanguageName})`);

    // Create all API calls in parallel using Promise.all
    const translationPromises = files.map(async (file, index) => {
      console.log(
        `\n--- Creating parallel request for file ${index + 1}/${
          files.length
        }: ${file.name} ---`
      );

      try {
        console.log(`  [${file.name}] Preparing API call...`);

        // Create FormData for this file
        const formData = new FormData();
        formData.append("files", file.file);

        // Build prompt with target language
        let translationPrompt = `Translate to ${backendLanguageName}`;
        if (prompt.trim()) {
          translationPrompt += `. ${prompt.trim()}`;
        }
        formData.append("prompt", translationPrompt);
        formData.append("target_language", backendLanguageName);
        formData.append("enable_evaluation", "false");

        console.log(`  [${file.name}] Sending parallel API request...`);
        const response = await fetch(
          `${TRANSLATION_API_BASE_URL}/translate_file_convo`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${getAuthToken()}`, // Include JWT token from login
            },
            body: formData,
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Translation failed: ${response.status} - ${errorText}`
          );
        }

        const transformedResult = await response.json();

        console.log(`  ✅ [${file.name}] Translation API call successful`);
        console.log(`  [${file.name}] Jobs returned:`, transformedResult.jobs);

        return {
          file: file.name,
          success: true,
          jobs: transformedResult.jobs || [],
        };
      } catch (error) {
        console.error(`  ❌ [${file.name}] Failed to translate:`, error);
        return {
          file: file.name,
          success: false,
          error: error.message,
        };
      }
    });

    // Execute all API calls in parallel
    console.log(`\n=== Executing ${files.length} parallel API calls ===`);
    const startTime = Date.now();
    const results = await Promise.all(translationPromises);
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`\n=== PARALLEL Translation Complete ===`);
    console.log(
      `All ${files.length} API calls completed in ${duration} seconds (parallel execution)`
    );

    // Aggregate all jobs from successful translations
    const allJobs = [];
    results.forEach((result) => {
      if (result.success && result.jobs) {
        allJobs.push(...result.jobs);
      }
    });

    console.log(`Total jobs created: ${allJobs.length}`);
    console.log(`All jobs:`, allJobs);
    console.log(
      `Results summary:`,
      results.map((r) => ({
        file: r.file,
        success: r.success,
        jobCount: r.jobs?.length || 0,
      }))
    );

    return {
      response: `Translation started in parallel for ${files.length} file(s) to ${targetLanguage}. All jobs are processing simultaneously.`,
      jobs: allJobs,
      results,
      filesCount: files.length,
      parallelExecution: true,
      executionTime: `${duration}s`,
    };
  },

  // NEW: Translate single file to multiple languages (PARALLEL PROCESSING)
  translateFileToMultipleLanguages: async (file, promptOrLanguages) => {
    console.log("=== Multi-Language Translation Request (PARALLEL) ===");
    console.log("File:", file.name);
    console.log("Prompt/Languages:", promptOrLanguages);

    let languages = [];

    // Check if it's an array of languages or a prompt string
    if (Array.isArray(promptOrLanguages)) {
      languages = promptOrLanguages;
    } else if (typeof promptOrLanguages === "string") {
      languages = extractLanguagesFromPrompt(promptOrLanguages);
    }

    if (languages.length === 0) {
      throw new Error(
        "No valid languages found. Please specify languages like 'Translate to German, French, Spanish'"
      );
    }

    console.log("Extracted languages:", languages);

    console.log(`=== Starting PARALLEL Multi-Language Translation ===`);
    console.log(`Total languages to translate: ${languages.length}`);
    console.log(`Languages array:`, languages);

    // Create all API calls in parallel using Promise.all
    const translationPromises = languages.map(async (language, index) => {
      console.log(
        `\n--- Creating parallel request for language ${index + 1}/${
          languages.length
        }: ${language} ---`
      );

      try {
        // Backend bypass expects language NAME (e.g., 'french'), not code ('fr')
        // Use LANGUAGE_MAPPING to convert display name to backend name
        const backendLanguageName =
          LANGUAGE_MAPPING[language] || (language || "").toLowerCase();
        console.log(
          `  [${language}] Backend language name (bypass key): ${backendLanguageName}`
        );
        console.log(`  [${language}] Preparing API call...`);

        // Pass explicit target_language to bypass Llama detection
        const formData = new FormData();
        formData.append("files", file.file);
        formData.append("prompt", `Translate to ${backendLanguageName}`);
        formData.append("target_language", backendLanguageName);
        formData.append("enable_evaluation", "false");

        console.log(`  [${language}] Sending parallel API request...`);
        const response = await fetch(
          `${TRANSLATION_API_BASE_URL}/translate_file_convo`,
          {
            method: "POST",
            body: formData,
            headers: {
              Authorization: `Bearer ${getAuthToken()}`, // Include JWT token from login
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Translation failed: ${response.status} - ${errorText}`
          );
        }

        const transformedResult = await response.json();

        console.log(`  ✅ [${language}] Translation API call successful`);
        console.log(`  [${language}] Jobs returned:`, transformedResult.jobs);

        return {
          language,
          success: true,
          jobs: transformedResult.jobs || [],
        };
      } catch (error) {
        console.error(`  ❌ [${language}] Failed to translate:`, error);
        return {
          language,
          success: false,
          error: error.message,
        };
      }
    });

    // Execute all API calls in parallel
    console.log(`\n=== Executing ${languages.length} parallel API calls ===`);
    const startTime = Date.now();
    const results = await Promise.all(translationPromises);
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`\n=== PARALLEL Translation Complete ===`);
    console.log(
      `All ${languages.length} API calls completed in ${duration} seconds (parallel execution)`
    );

    // Aggregate all jobs from successful translations
    const allJobs = [];
    results.forEach((result) => {
      if (result.success && result.jobs) {
        allJobs.push(...result.jobs);
      }
    });

    console.log(`Total jobs created: ${allJobs.length}`);
    console.log(`All jobs:`, allJobs);
    console.log(
      `Results summary:`,
      results.map((r) => ({
        language: r.language,
        success: r.success,
        jobCount: r.jobs?.length || 0,
      }))
    );

    return {
      response: `Translation started in parallel for ${
        languages.length
      } language(s): ${languages.join(
        ", "
      )}. All jobs are processing simultaneously.`,
      jobs: allJobs,
      results,
      languagesCount: languages.length,
      parallelExecution: true,
      executionTime: `${duration}s`,
    };
  },

  checkStatus: async (jobId) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000000);

    try {
      const response = await fetch(
        `${TRANSLATION_API_BASE_URL}/status/${jobId}`,
        {
          method: "GET",
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Unknown error" }));
        throw new Error(
          errorData.detail || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Request timed out after 30 seconds");
      }
      throw error;
    }
  },

  getEvaluation: async (evaluationId) => {
    const response = await fetch(
      `${TRANSLATION_API_BASE_URL}/evaluation/${evaluationId}`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ detail: "Unknown error" }));
      throw new Error(
        errorData.detail || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return await response.json();
  },

  translateText: async (text, targetLanguage) => {
    const backendLanguage =
      LANGUAGE_MAPPING[targetLanguage] || targetLanguage.toLowerCase();

    const response = await fetch(`${TRANSLATION_API_BASE_URL}/translate_text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text,
        target_language: backendLanguage,
      }),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ detail: "Unknown error" }));
      throw new Error(
        errorData.detail || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return await response.json();
  },

  download: async (downloadId) => {
    console.log("download downloadId:", downloadId);
    const response = await fetch(
      `${TRANSLATION_API_BASE_URL}/download/${downloadId}`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      throw new Error("Download failed");
    }

    return response;
  },

  /**
   * Preview translated file
   * Returns preview text with preserved citations (e.g., [0001], patent references)
   * Citations are automatically preserved by the backend during translation
   */
  preview: async (fileId) => {
    const response = await fetch(
      `${TRANSLATION_API_BASE_URL}/preview/${fileId}`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      throw new Error("Preview failed");
    }

    // Preview text comes directly from backend with citations already preserved
    return await response.json();
  },
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
    console.log("Attempting to show notification:", title);
    console.log("Current permission:", Notification.permission);

    if (!notificationHelper.isSupported()) {
      console.error("Notifications not supported");
      return null;
    }

    if (Notification.permission === "granted") {
      try {
        const notification = new Notification(title, {
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          ...options,
        });

        notification.onclick = () => {
          console.log("Notification clicked");
          window.focus();
        };

        notification.onerror = (error) => {
          console.error("Notification error:", error);
        };

        setTimeout(() => notification.close(), 5000);
        return notification;
      } catch (error) {
        console.error("Failed to create notification:", error);
        return null;
      }
    } else {
      console.warn(
        `Notification permission not granted: ${Notification.permission}`
      );
      return null;
    }
  },
};

export const languages = [
  "Chinese (Mandarin)",
  "German",
  "French",
  // "Spanish",
  // "Italian",
  // "Swedish",
  // "Danish",
  // "Dutch",
  // "Finnish",
  // "Korean",
  // "Japanese",
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
  const [selectedButton, setSelectedButton] = useState("Translation");
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
  const [chatResponse, setChatResponse] = useState(null);
  const [notificationPermission, setNotificationPermission] =
    useState("default");
  const [previewFile, setPreviewFile] = useState(null);
  const [previewFileType, setPreviewFileType] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [selectedTargetFileType, setSelectedTargetFileType] = useState(null);
  const [showFileTypeDropdown, setShowFileTypeDropdown] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const [showDeltaModal, setShowDeltaModal] = useState(false);
  const [selectedDeltaData, setSelectedDeltaData] = useState(null);
  const [loadingDelta, setLoadingDelta] = useState(false);

  const [correctedFileId, setCorrectedFileId] = useState(null);

  useEffect(() => {
    const randomPercentage = Math.floor(Math.random() * (90 - 80 + 1)) + 80;
    setPercentage(randomPercentage);

    if (notificationHelper.isSupported()) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
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

  // FIXED: Enhanced Fetch evaluation data with better error handling
  const fetchEvaluation = async (evaluationId, jobId) => {
    try {
      console.log(
        `Fetching evaluation for job ${jobId}, evaluation ID: ${evaluationId}`
      );
      const evaluation = await translationAPI.getEvaluation(evaluationId);
      console.log(`Evaluation data received for job ${jobId}:`, evaluation);

      setEvaluationData((prev) => ({
        ...prev,
        [jobId]: evaluation,
      }));
      return evaluation;
    } catch (error) {
      console.error(`Evaluation fetch error for ${evaluationId}:`, error);
      setEvaluationData((prev) => ({
        ...prev,
        [jobId]: {
          error: error.message,
          combined_accuracy: null,
        },
      }));
    }
  };

  // FIXED: Enhanced Poll job status with better evaluation handling
  const pollJobStatus = async (jobId, filename) => {
    // Intelligent polling with adaptive intervals
    const maxAttempts = 1000;
    let attempts = 0;
    let pollInterval = 5000;

    const poll = async () => {
      try {
        attempts++;
        console.log(
          `Polling job ${jobId} (attempt ${attempts}/${maxAttempts})`
        );
        const status = await translationAPI.checkStatus(jobId);

        console.log(`Job ${jobId} status:`, status);

        setJobStatuses((prev) => ({
          ...prev,
          [jobId]: status,
        }));

        // Stop polling for terminal states
        if (status.status === "COMPLETED") {
          console.log(`✅ Job ${jobId} completed after ${attempts} attempts!`);

          // FIXED: Fetch evaluation data if available with retry
          if (status.evaluation_id) {
            console.log(`Fetching evaluation for completed job ${jobId}`);
            // Add a small delay to ensure evaluation is ready
            setTimeout(async () => {
              await fetchEvaluation(status.evaluation_id, jobId);
            }, 1000);
          } else {
            console.log(`No evaluation_id found for job ${jobId}`);
          }

          // Show completion notification
          notificationHelper.show("Translation Complete", {
            body: `${filename} has been translated successfully!`,
          });
          return status;
        } else if (status.status === "CANCELLED") {
          console.log(`⚠️ Job ${jobId} was cancelled after ${attempts} attempts`);
          notificationHelper.show("Translation Cancelled", {
            body: `${filename} translation was cancelled.`,
          });
          return status;
        } else if (status.status === "FAILED") {
          console.error(
            `❌ Job ${jobId} failed:`,
            status.error || "Unknown error"
          );
          notificationHelper.show("Translation Failed", {
            body: `${filename} translation failed: ${
              status.error || "Unknown error"
            }`,
          });
          throw new Error(
            `Translation failed for ${filename}: ${
              status.error || "Unknown error"
            }`
          );
        } else if (attempts < maxAttempts) {
          // Adaptive polling interval: gradually increase to reduce server load
          // First 10 attempts: 3 seconds (30 sec total)
          // Next 20 attempts: 5 seconds (100 sec = ~1.5 min more)
          // Next 30 attempts: 10 seconds (300 sec = 5 min more)
          // Remaining: 15 seconds (up to 30 min total)
          if (attempts < 10) {
            pollInterval = 3000; // 3 seconds for first 30 seconds
          } else if (attempts < 30) {
            pollInterval = 5000; // 5 seconds for next ~2 minutes
          } else if (attempts < 60) {
            pollInterval = 10000; // 10 seconds for next 5 minutes
          } else {
            pollInterval = 15000; // 15 seconds for remaining time
          }

          console.log(
            `Job ${jobId} still ${status.status}, checking again in ${
              pollInterval / 1000
            }s`
          );
          setTimeout(poll, pollInterval);
        } else {
          const errorMsg = `Translation timeout for ${filename} after ${attempts} attempts (~${Math.floor(
            (attempts * pollInterval) / 60000
          )} minutes)`;
          console.error(errorMsg);
          notificationHelper.show("Translation Timeout", {
            body: `${filename} is taking too long. Please check status manually or try again.`,
          });
          throw new Error(errorMsg);
        }
      } catch (error) {
        console.error(`Status check error for ${filename}:`, error);
        setJobStatuses((prev) => ({
          ...prev,
          [jobId]: { status: "FAILED", error: error.message },
        }));
      }
    };

    poll();
  };

  // NEW: Manual refresh for evaluations
  const refreshEvaluations = async () => {
    console.log("Refreshing evaluations for all completed jobs...");
    for (const [jobId, status] of Object.entries(jobStatuses)) {
      if (
        status.status === "COMPLETED" &&
        status.evaluation_id &&
        !evaluationData[jobId]
      ) {
        console.log(`Refreshing evaluation for job ${jobId}`);
        await fetchEvaluation(status.evaluation_id, jobId);
      }
    }
  };

  const handleRequestNotificationPermission = async () => {
    console.log("Current permission:", notificationHelper.getPermission());
    console.log(
      "Browser supports notifications:",
      notificationHelper.isSupported()
    );

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
            tag: "permission-granted",
          });
        }, 500);
      } else if (permission === "denied") {
        const message =
          "Notification permission denied. You can enable it in your browser settings.";
        toast ? toast.error(message) : alert(message);
      } else {
        const message = "Notification permission was not granted.";
        toast ? toast.warning(message) : alert(message);
      }
    } catch (error) {
      console.error("Permission request failed:", error);
      const message = "Failed to request notification permission";
      toast ? toast.error(message) : alert(message);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast
        ? toast.error("Speech recognition not supported in this browser.")
        : alert("Speech recognition not supported in this browser.");
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
      const message =
        "Please either select a target language or enter a prompt with the target language";
      toast ? toast.error(message) : alert(message);
      return;
    }

    if (uploadedFiles.length === 0) {
      const message = "Please upload files to translate";
      toast ? toast.error(message) : alert(message);
      return;
    }

    setIsTranslating(true);
    const translatingToast = toast
      ? toast.loading(`Translating ${uploadedFiles.length} file(s)...`)
      : null;

    try {
      let result;

      // NEW LOGIC: Check translation scenario
      const extractedLanguages = query.trim()
        ? extractLanguagesFromPrompt(query)
        : [];
      const isSingleFileMultiLanguage =
        uploadedFiles.length === 1 && extractedLanguages.length > 1;
      const isMultipleFilesSingleLanguage =
        uploadedFiles.length > 1 &&
        (selectedLanguage || (query.trim() && extractedLanguages.length <= 1));

      console.log("=== Translation Decision Debug ===");
      console.log("Query:", query.trim());
      console.log("Extracted Languages:", extractedLanguages);
      console.log("Uploaded Files Count:", uploadedFiles.length);
      console.log("Selected Language:", selectedLanguage);
      console.log("Is Single File Multi-Language?", isSingleFileMultiLanguage);
      console.log(
        "Is Multiple Files Single Language?",
        isMultipleFilesSingleLanguage
      );

      if (isSingleFileMultiLanguage) {
        // Single file, multiple languages - use parallel processing
        console.log(
          "=== Single File Multi-Language Translation (PARALLEL) ==="
        );
        console.log("File:", uploadedFiles[0].name);
        console.log("Languages:", extractedLanguages);

        result = await translationAPI.translateFileToMultipleLanguages(
          uploadedFiles[0],
          query.trim()
        );
      } else if (isMultipleFilesSingleLanguage) {
        // Multiple files, single language - use parallel processing
        console.log(
          "=== Multiple Files Single Language Translation (PARALLEL) ==="
        );
        console.log(
          "Files:",
          uploadedFiles.map((f) => f.name)
        );

        // Determine target language
        let targetLanguage;
        if (selectedLanguage) {
          targetLanguage = selectedLanguage;
        } else if (extractedLanguages.length === 1) {
          targetLanguage = extractedLanguages[0];
        } else {
          // Extract from query if no explicit language selected
          const backendLanguage = query
            .trim()
            .match(/translate\s+to\s+(\w+)/i)?.[1];
          if (backendLanguage) {
            // Find matching language from mapping
            targetLanguage =
              Object.keys(LANGUAGE_MAPPING).find(
                (key) => LANGUAGE_MAPPING[key] === backendLanguage.toLowerCase()
              ) || backendLanguage;
          } else {
            throw new Error(
              "Please select a target language or specify it in the prompt"
            );
          }
        }

        console.log("Target language:", targetLanguage);

        result = await translationAPI.translateMultipleFilesToSingleLanguage(
          uploadedFiles,
          targetLanguage,
          query.trim()
        );
      } else {
        // --- URGENT FIX: Ensure Target Language is explicitly sent to the API ---

        // 1. Determine the Single Target Language
        let targetLanguage = selectedLanguage;
        if (!targetLanguage && extractedLanguages.length === 1) {
          targetLanguage = extractedLanguages[0];
        }

        if (targetLanguage) {
          // Get the backend-safe language name (e.g., "German" -> "german")
          const backendLanguage =
            LANGUAGE_MAPPING[targetLanguage] || targetLanguage.toLowerCase();

          console.log(
            "=== Standard Translation Request - FORCING TARGET LANGUAGE ==="
          );
          console.log("Target Language:", backendLanguage);
          console.log("Number of files:", uploadedFiles.length);

          // 2. Use a robust API call that sends the explicit target_language parameter
          // NOTE: This assumes you use the translateMultipleFilesToSingleLanguage API (which already exists in your code)
          result = await translationAPI.translateMultipleFilesToSingleLanguage(
            uploadedFiles,
            backendLanguage, // Passes 'german' or 'french' as the explicit target_language
            query.trim() // Passes the original prompt
          );
        } else {
          // 3. Fallback: Use conversational prompt only if NO clear target language was found
          console.log(
            "=== Standard Translation Request - CONVERSATIONAL FALLBACK (No clear language) ==="
          );
          console.log("Translation prompt:", query.trim());

          result = await translationAPI.translateFileConvoWithPrompt(
            uploadedFiles,
            query.trim()
          );
        }
      }

      console.log("=== Translation Response ===");
      console.log("Response:", result.response);
      console.log("Number of jobs created:", result.jobs?.length || 0);
      console.log("Jobs:", result.jobs);

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

      // Start polling for each job (only for non-terminal states)
      if (result.jobs && result.jobs.length > 0) {
        result.jobs.forEach(async (job) => {
          // Check current status before starting polling
          try {
            const currentStatus = await translationAPI.checkStatus(job.job_id);
            
            // Only start polling if job is not in a terminal state
            if (
              currentStatus.status !== "COMPLETED" &&
              currentStatus.status !== "FAILED" &&
              currentStatus.status !== "CANCELLED"
            ) {
              console.log(
                `Starting polling for job: ${job.job_id}, File: ${job.filename}, Language: ${job.target_language}`
              );
              pollJobStatus(job.job_id, job.filename);
            } else {
              console.log(
                `Skipping polling for job ${job.job_id} - already in terminal state: ${currentStatus.status}`
              );
              // Update status in state
              setJobStatuses((prev) => ({
                ...prev,
                [job.job_id]: currentStatus,
              }));
            }
          } catch (error) {
            console.error(`Error checking initial status for job ${job.job_id}:`, error);
            // Start polling anyway as fallback
            pollJobStatus(job.job_id, job.filename);
          }
        });
      } else {
        console.warn("No jobs returned from translation API");
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
    if (!query.trim()) {
      const message = "Please enter text to translate";
      toast ? toast.error(message) : alert(message);
      return;
    }

    setIsTranslating(true);
    const translatingToast = toast
      ? toast.loading("Translating your text...")
      : null;

    try {
      let targetLang = selectedLanguage;

      // If no language selected, try to extract from query
      if (!targetLang) {
        const extractedLanguages = extractLanguagesFromPrompt(query);
        if (extractedLanguages.length > 0) {
          targetLang = extractedLanguages[0];
          console.log(`Using language from prompt: ${targetLang}`);
        } else {
          const message =
            "Please select a target language or specify it in your prompt (e.g., 'Translate \"text\" in Dutch')";
          toast ? toast.error(message) : alert(message);
          setIsTranslating(false);
          return;
        }
      }

      // Extract text to translate (remove quotes if present)
      let textToTranslate = query.trim();

      // Try to extract quoted text
      const quotedMatch = query.match(/"([^"]+)"|'([^']+)'/);
      if (quotedMatch) {
        textToTranslate = quotedMatch[1] || quotedMatch[2];
        console.log(`Extracted quoted text: "${textToTranslate}"`);
      } else {
        // Check if query contains translation keywords and extract the text
        const translatePattern = /translate\s+(.+?)\s+(?:in|to)\s+/i;
        const match = query.match(translatePattern);
        if (match) {
          textToTranslate = match[1].replace(/["']/g, "").trim();
          console.log(`Extracted text from pattern: "${textToTranslate}"`);
        }
      }

      // Call the direct text translation endpoint
      const backendLanguage =
        LANGUAGE_MAPPING[targetLang] || targetLang.toLowerCase();

      const response = await fetch(
        `${TRANSLATION_API_BASE_URL}/translate_text`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: textToTranslate,
            target_language: backendLanguage,
            source_language: null, // Auto-detect
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.status}`);
      }

      const result = await response.json();

      if (toast) {
        toast.update(translatingToast, {
          render: result.response || "Text translation completed successfully!",
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
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
    // If Translation button is selected, handle translation workflow
    if (selectedButton === "Translation") {
      // Validation: Check for either files or text, and either language or prompt
      if (uploadedFiles.length === 0 && !query.trim()) {
        const message = "Please enter text to translate or upload files";
        toast ? toast.error(message) : alert(message);
        return;
      }

      if (!selectedLanguage && !query.trim()) {
        const message =
          "Please either select a language or include translation instructions in your prompt";
        toast ? toast.error(message) : alert(message);
        return;
      }

      // If files are uploaded, do file translation
      if (uploadedFiles.length > 0) {
        await handleTranslateFiles();
      }
      // If only text, do text translation
      else if (query.trim()) {
        // Check if language is either selected OR mentioned in the query
        const extractedLanguages = extractLanguagesFromPrompt(query);

        if (!selectedLanguage && extractedLanguages.length === 0) {
          const message =
            "For text-only translation, please select a target language or specify it in your prompt (e.g., 'Translate \"text\" in Dutch')";
          toast ? toast.error(message) : alert(message);
          return;
        }

        await handleTranslateText();
      }
    }
    // For ALL other cases (no button selected or other buttons), use intelligent routing
    else if (query.trim()) {
      // Handle non-translation queries - Let Llama classify the intent
      console.log(
        "No files uploaded, no translation button - routing to intelligent endpoint"
      );
      setIsTranslating(true);
      const processingToast = toast
        ? toast.loading("Processing your request...")
        : null;

      try {
        // Send to translation service without files or explicit language
        // Backend Llama will classify intent: chat, translate_text, or other
        const formData = new FormData();
        formData.append("prompt", query);
        // No files, no target_language - forces Llama intent classification

        const response = await fetch(
          `${TRANSLATION_API_BASE_URL}/translate_file_convo`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${getAuthToken()}`, // Include JWT token from login
            },
            body: formData,
          }
        );

        if (response.ok) {
          const data = await response.json();

          // Check what intent was detected
          console.log("Backend response data:", data);
          console.log("Detected intent:", data.intent);

          if (data.intent === "chat") {
            // Chat response
            const chatReply =
              data.response || data.message || "Response received";

            console.log("Setting chat response state:", {
              query: query,
              response: chatReply,
              intent: "chat",
              source_language: data.source_language || "English",
            });

            setChatResponse({
              query: query,
              response: chatReply,
              intent: "chat",
              source_language: data.source_language || "English",
            });

            console.log("Chat response state set successfully!");

            if (toast) {
              toast.update(processingToast, {
                render: "✅ Response received - Check below for full answer",
                type: "success",
                isLoading: false,
                autoClose: 5000,
              });
            }
          } else if (data.intent === "translate_text") {
            // Text translation response
            setTextTranslationResult(data);

            if (toast) {
              toast.update(processingToast, {
                render: data.message || "Translation complete",
                type: "success",
                isLoading: false,
                autoClose: 3000,
              });
            }
          } else {
            // Unknown intent or error
            const message =
              data.response || data.message || "Request processed";
            if (toast) {
              toast.update(processingToast, {
                render: message,
                type: "info",
                isLoading: false,
                autoClose: 5000,
              });
            } else {
              alert(message);
            }
          }
        } else {
          throw new Error(`Request failed: ${response.status}`);
        }
      } catch (error) {
        console.error("Request error:", error);
        const errorMsg = `Error: ${error.message}`;
        if (toast) {
          toast.update(processingToast, {
            render: errorMsg,
            type: "error",
            isLoading: false,
            autoClose: 5000,
          });
        } else {
          alert(errorMsg);
        }
      } finally {
        setIsTranslating(false);
      }
      return;
    }

    // Fallback for edge cases
    if (query.trim()) {
      try {
        // Last resort: try MatterAI backend (requires auth)
        const queryData = {
          query: query.trim(),
          selected_button: selectedButton,
          selected_language: selectedLanguage,
          uploaded_files: uploadedFiles,
        };

        console.log("Submitting query to MatterAI backend:", queryData);
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
        // toast ? toast.error(message) : alert(message);
      }
    }
  };

  const handleFileUpload = async (files) => {
    const fileArray = Array.from(files);

    if (selectedButton === "File_Converter") {
      const validFiles = fileArray.filter((file) => {
        const validTypes = [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];
        return (
          validTypes.includes(file.type) ||
          file.name.match(/\.(pdf|doc|docx)$/i)
        );
      });

      if (validFiles.length === 0) {
        toast.error("Please upload PDF or Word documents only");
        return;
      }

      const fileObjects = validFiles.map((file) => ({
        id: Date.now() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
      }));

      setUploadedFiles(fileObjects);
      toast.success(`${fileObjects.length} file(s) ready for conversion`);
      return;
    }

    if (selectedButton === "Translation") {
      // For translation mode, ONLY handle files locally - no server upload
      const validFiles = [];
      const invalidFiles = [];

      fileArray.forEach((file) => {
        const validTypes = [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ];

        const isValidType =
          validTypes.includes(file.type) ||
          file.name.match(/\.(pdf|docx|pptx)$/i);

        if (isValidType) {
          const fileObj = {
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            type: file.type,
            file: file,
          };
          validFiles.push(fileObj);
        } else {
          invalidFiles.push(file.name);
        }
      });

      if (validFiles.length > 0) {
        setUploadedFiles((prev) => [...prev, ...validFiles]);
        const message = `${validFiles.length} file(s) ready for translation`;
        toast ? toast.success(message) : console.log(message);
      }

      if (invalidFiles.length > 0) {
        const message = `Invalid files (only PDF, DOCX, PPTX allowed): ${invalidFiles.join(
          ", "
        )}`;
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
        queryAPI.uploadFile(file).catch((error) => {
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
          .filter((file) =>
            failedUploads.some((failed) => failed.fileName === file.name)
          )
          .map((file) => ({
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            type: file.type,
            file: file,
            uploadFailed: true,
          }));

        if (localFiles.length > 0) {
          setUploadedFiles((prev) => [...prev, ...localFiles]);
        }

        const message = `${failedUploads.length} files added locally (server upload failed)`;
        toast ? toast.warning(message) : console.warn(message);
      }
    } catch (error) {
      console.error("File upload error:", error);

      const localFiles = validFiles.map((file) => ({
        id: Date.now() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
        uploadFailed: true,
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
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
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

  const handleDownload = async (jobId, forceDirectDownload = false) => {
    const jobStatus = jobStatuses[jobId];
    if (!jobStatus?.download_id) {
      const message =
        "No download available yet. Please wait for translation to complete.";
      toast ? toast.error(message) : alert(message);
      return;
    }

    // Find the corresponding job to get filename and target language
    const job = translationJobs.find((j) => j.job_id === jobId);
    const isPDF = job?.filename?.toLowerCase().endsWith(".pdf");
    const isCJK = job && detectCJKLanguage(job.filename, job.target_language);

    // For CJK PDFs or forced direct download, skip preview and download directly
    if (forceDirectDownload || (isPDF && isCJK)) {
      console.log(
        `Direct download triggered for ${job?.filename} (CJK: ${isCJK}, Forced: ${forceDirectDownload})`
      );

      const downloadToast = toast
        ? toast.loading("Starting download...")
        : null;

      try {
        const response = await translationAPI.download(jobStatus.download_id);
        const blob = await response.blob();

        const contentDisposition = response.headers.get("content-disposition");
        let filename =
          jobStatus.filename || job?.filename || "translated_document";

        if (contentDisposition && contentDisposition.includes("filename=")) {
          filename = contentDisposition
            .split("filename=")[1]
            .split(";")[0]
            .replace(/"/g, "");
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
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
      return;
    }

    // Original download logic for non-CJK files (with potential preview)
    const downloadToast = toast ? toast.loading("Preparing download...") : null;

    try {
      const response = await translationAPI.download(jobStatus.download_id);
      const blob = await response.blob();

      const contentDisposition = response.headers.get("content-disposition");
      let filename =
        jobStatus.filename || job?.filename || "translated_document";

      if (contentDisposition && contentDisposition.includes("filename=")) {
        filename = contentDisposition
          .split("filename=")[1]
          .split(";")[0]
          .replace(/"/g, "");
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
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

  const handleCorrectedFileDownload = async () => {
    if (!correctedFileId) {
      toast?.error("No corrected file available for download");
      return;
    }

    const downloadToast = toast
      ? toast.loading("Downloading corrected file...")
      : null;

    try {
      const response = await translationAPI.download(correctedFileId);
      const blob = await response.blob();

      const contentDisposition = response.headers.get("content-disposition");
      let filename = "corrected_file";

      if (contentDisposition?.includes("filename=")) {
        filename = contentDisposition
          .split("filename=")[1]
          .split(";")[0]
          .replace(/"/g, "");
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast?.update(downloadToast, {
        render: "Corrected file downloaded",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (error) {
      toast?.update(downloadToast, {
        render: `Download failed: ${error.message}`,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    }
  };

  const handleCorrectedFilePreview = async () => {
    if (!correctedFileId) {
      toast?.error("No corrected file available for preview");
      return;
    }

    try {
      const previewData = await translationAPI.preview(correctedFileId);

      setPreviewContent(previewData); // whatever state you already use
      setShowPreview(true);
    } catch (error) {
      toast?.error(`Preview failed: ${error.message}`);
    }
  };

  const handleDirectDownload = async (jobId) => {
    await handleDownload(jobId, true);
  };

  const handleDownloadAll = async () => {
    const completedJobs = Object.entries(jobStatuses).filter(
      ([jobId, status]) => status.status === "COMPLETED" && status.download_id
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
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  };

  const testCases = [
    "chinese japanese",
    "chinese and japanese",
    "chinese,japanese",
    "chinese , japanese",
    "Translate to German, French, and Spanish",
    "Translate to simplified chinese and japanese",
    "german french spanish italian",
    "Please translate this to Korean and Swedish",
    "chinese",
    "translate to chinese, japanese, korean",
    "german,french,spanish,italian,english",
    "CHINESE JAPANESE GERMAN",
    "Translate document to french and german languages",
    "Translate these file into German and French",
  ];

  // console.log("Testing Enhanced Language Extraction:\n");
  // testCases.forEach(testCase => {
  //   const extracted = extractLanguagesFromPrompt(testCase);
  //   console.log(`Input: "${testCase}"`);
  //   console.log(`Extracted: [${extracted.join(', ')}]`);
  //   console.log(`Count: ${extracted.length}\n`);
  // });

  const containsCJK = (text) => {
    const cjkRegex =
      /[\u2E80-\u2EFF\u2F00-\u2FDF\u3040-\u309F\u30A0-\u30FF\u3100-\u312F\u3200-\u32FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;
    return cjkRegex.test(text);
  };

  const isPotentiallyCJK = (filename, targetLanguage = "") => {
    const cjkLanguages = [
      "chinese",
      "japanese",
      "korean",
      "zh",
      "ja",
      "ko",
      "cn",
      "jp",
      "kr",
      "中文",
      "日本語",
      "한국어",
    ];
    const lowerFilename = filename.toLowerCase();
    const lowerLanguage = targetLanguage.toLowerCase();
    return cjkLanguages.some(
      (lang) =>
        lowerFilename.includes(lang) ||
        lowerLanguage.includes(lang) ||
        containsCJK(filename) ||
        containsCJK(targetLanguage)
    );
  };

  const handleFileConversion = async (selectedTargetFileType) => {
    console.log("=== File Conversion Debug ===");
    console.log("Uploaded files:", uploadedFiles);
    console.log(
      "Selected target type (passed as param):",
      selectedTargetFileType
    );

    if (!uploadedFiles.length) {
      alert("Please upload a file first.");
      return;
    }

    if (!selectedTargetFileType) {
      alert("Please select a target format (PDF or DOCX).");
      return;
    }

    const file = uploadedFiles[0];
    console.log("Converting file:", file.name, "to:", selectedTargetFileType);

    const formData = new FormData();
    formData.append("file", file.file);
    formData.append("target_format", selectedTargetFileType);

    try {
      setIsTranslating(true);
      console.log("Sending conversion request...");

      const response = await fetch(
        import.meta.env.VITE_API_BASE_URL + "/convert_file",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Conversion failed: ${response.status} - ${errorText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download =
        file.name.replace(/\.[^/.]+$/, "") + "." + selectedTargetFileType;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("File converted successfully!");
    } catch (err) {
      console.error("Conversion error:", err);
      toast.error(`Conversion failed: ${err.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  const fetchDeltaData = async (deltaId, jobId) => {
    if (!deltaId) {
      console.error("No delta_id provided");
      return;
    }

    setLoadingDelta(true);
    const loadingToast = toast
      ? toast.loading("Loading Delta report...")
      : null;

    try {
      // Step 1: Fetch metadata (new_delta_id + corrected_file_id)
      const metaResponse = await fetch(
        // `${TRANSLATION_API_BASE_URL}/delta/${deltaId}/with-translations`,
        `${TRANSLATION_API_BASE_URL}/delta/${deltaId}/`,
        { method: "GET" }
      );

      if (!metaResponse.ok) {
        const errorText = await metaResponse.text();
        throw new Error(errorText || `HTTP ${metaResponse.status}`);
      }

      // Try to parse metaResponse as JSON; if backend returned a text file
      // (attachment/plain) treat it as the delta text and show immediately.
      let new_delta_id = null;
      let corrected_file_id = null;
      let rawText = null;

      const contentType = (
        metaResponse.headers.get("content-type") || ""
      ).toLowerCase();
      const contentDisp = (
        metaResponse.headers.get("content-disposition") || ""
      ).toLowerCase();

      if (contentType.includes("application/json")) {
        // Normal case: meta JSON with new_delta_id
        const metaJson = await metaResponse.json();
        new_delta_id = metaJson.new_delta_id;
        corrected_file_id = metaJson.corrected_file_id;

        if (!new_delta_id) {
          throw new Error("new_delta_id not returned from API");
        }

        // Save corrected_file_id for later (download / preview)
        setCorrectedFileId(corrected_file_id);

        // Step 2: Fetch actual delta TXT
        const deltaResponse = await fetch(
          `${TRANSLATION_API_BASE_URL}/delta/${new_delta_id}`,
          { method: "GET" }
        );

        if (!deltaResponse.ok) {
          const errorText = await deltaResponse.text();
          throw new Error(errorText || `HTTP ${deltaResponse.status}`);
        }

        rawText = await deltaResponse.text();

        setSelectedDeltaData({
          raw: rawText,
          deltaId: new_delta_id,
          correctedFileId: corrected_file_id,
        });

        setShowDeltaModal(true);
      } else if (
        contentType.startsWith("text/") ||
        contentDisp.includes("attachment")
      ) {
        // Backend returned the delta text file directly for the meta request.
        rawText = await metaResponse.text();

        setSelectedDeltaData({
          raw: rawText,
          deltaId: deltaId,
          correctedFileId: null,
        });

        setShowDeltaModal(true);
      } else {
        // Fallback: attempt to parse JSON, but if it fails, treat as text
        try {
          const metaJson = await metaResponse.json();
          new_delta_id = metaJson.new_delta_id;
          corrected_file_id = metaJson.corrected_file_id;

          if (!new_delta_id) {
            throw new Error("new_delta_id not returned from API");
          }

          setCorrectedFileId(corrected_file_id);

          const deltaResponse = await fetch(
            `${TRANSLATION_API_BASE_URL}/delta/${new_delta_id}`,
            { method: "GET" }
          );

          if (!deltaResponse.ok) {
            const errorText = await deltaResponse.text();
            throw new Error(errorText || `HTTP ${deltaResponse.status}`);
          }

          rawText = await deltaResponse.text();

          setSelectedDeltaData({
            raw: rawText,
            deltaId: new_delta_id,
            correctedFileId: corrected_file_id,
          });

          setShowDeltaModal(true);
        } catch (err) {
          // If JSON parse failed, read as text and show
          rawText = await metaResponse.text();
          setSelectedDeltaData({
            raw: rawText,
            deltaId: deltaId,
            correctedFileId: null,
          });
          setShowDeltaModal(true);
        }
      }

      toast?.update(loadingToast, {
        render: "Delta reasoning loaded!",
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });

      return rawText;
    } catch (error) {
      console.error("Delta fetch error:", error);

      toast?.update(loadingToast, {
        render: `Delta load failed: ${error.message}`,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setLoadingDelta(false);
    }
  };

  const handleViewDelta = (jobId) => {
    const jobStatus = jobStatuses[jobId];

    if (!jobStatus?.delta_id) {
      const message = "No quality report available for this translation.";
      toast ? toast.warning(message) : alert(message);
      return;
    }

    fetchDeltaData(jobStatus.delta_id, jobId);
  };

  const closeDeltaModal = () => {
    setShowDeltaModal(false);
    setSelectedDeltaData(null);
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
    setTranslationJobs,
    jobStatuses,
    setJobStatuses,
    evaluationData,
    previewText,
    showPreview,
    setShowPreview,
    fileInputRef,
    showTimesheet,
    chatResponse,
    setChatResponse,
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
    detectCJKLanguage,
    fetchEvaluation,
    extractLanguagesFromPrompt,
    LANGUAGE_MAPPING,
    refreshEvaluations,
    isPotentiallyCJK,
    handleFileConversion,
    selectedTargetFileType,
    setSelectedTargetFileType,
    showFileTypeDropdown,
    setShowFileTypeDropdown,
    handleFileConversion,
    isExpanded,
    setIsExpanded,
    showDeltaModal,
    selectedDeltaData,
    loadingDelta,
    handleViewDelta,
    closeDeltaModal,
    fetchDeltaData,
    correctedFileId,
    translationAPI,
  };
};
