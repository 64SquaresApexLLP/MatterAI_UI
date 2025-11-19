import { API_BASE_URL, API_ENDPOINTS, HTTP_METHODS } from "./config.js";

let authToken = localStorage.getItem("authToken");

if (authToken) {
  console.log(
    "Auth token loaded from localStorage:",
    authToken.substring(0, 20) + "..."
  );
} else {
  console.log("No auth token found in localStorage");
}

export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    localStorage.setItem("authToken", token);
  } else {
    localStorage.removeItem("authToken");
  }
};

export const getAuthToken = () => authToken;

const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
    },
  };

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    console.log("Making API call to:", url);
    console.log("With config:", {
      ...config,
      headers: {
        ...config.headers,
        Authorization: config.headers.Authorization
          ? "Bearer [HIDDEN]"
          : "Not set",
      },
    });

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("API call failed:", response.status, errorData);

      const errorMessage =
        errorData.detail ||
        errorData.message ||
        `HTTP error! status: ${response.status}`;

      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error("API call failed:", error);
    throw error;
  }
};

// Authentication API
export const authAPI = {
  login: async (username, password, organization = null, role = null) => {
    const loginData = { username, password };
    if (organization) {
      loginData.organization = organization;
    }
    if (role) {
      loginData.role = role;
    }

    const response = await apiCall(API_ENDPOINTS.LOGIN, {
      method: HTTP_METHODS.POST,
      body: JSON.stringify(loginData),
    });

    if (response.success && response.token) {
      setAuthToken(response.token);
    }
    return response;
  },

  getOrganizations: async () => {
    return await apiCall(API_ENDPOINTS.ORGANIZATIONS);
  },

  getRoles: async () => {
    return await apiCall(API_ENDPOINTS.ROLES);
  },

  logout: async () => {
    const response = await apiCall(API_ENDPOINTS.LOGOUT, {
      method: HTTP_METHODS.POST,
    });
    setAuthToken(null);
    return response;
  },

  getCurrentUser: async () => {
    return await apiCall(API_ENDPOINTS.ME);
  },

  verifyToken: async () => {
    return await apiCall(API_ENDPOINTS.VERIFY_TOKEN, {
      method: HTTP_METHODS.POST,
    });
  },
};

// Query & Search API
export const queryAPI = {
  search: async (queryData) => {
    return await apiCall(API_ENDPOINTS.SEARCH, {
      method: HTTP_METHODS.POST,
      body: JSON.stringify(queryData),
    });
  },

  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    return await apiCall(API_ENDPOINTS.UPLOAD_FILE, {
      method: HTTP_METHODS.POST,
      headers: {
        // Remove Content-Type to let browser set it with boundary
        Authorization: authToken ? `Bearer ${authToken}` : undefined,
      },
      body: formData,
    });
  },

  uploadMultipleFiles: async (files) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    return await apiCall(API_ENDPOINTS.UPLOAD_MULTIPLE, {
      method: HTTP_METHODS.POST,
      headers: {
        Authorization: authToken ? `Bearer ${authToken}` : undefined,
      },
      body: formData,
    });
  },

  getDropdownData: async () => {
    return await apiCall(API_ENDPOINTS.DROPDOWN_DATA);
  },

  deleteFile: async (fileId) => {
    return await apiCall(`${API_ENDPOINTS.DELETE_FILE}/${fileId}`, {
      method: HTTP_METHODS.DELETE,
    });
  },
};

// Timesheet API
export const timesheetAPI = {
  createEntry: async (entryData) => {
    console.log(
      "Creating timesheet entry with token:",
      authToken ? "Present" : "Missing"
    );
    console.log("Entry data:", entryData);

    return await apiCall(API_ENDPOINTS.TIMESHEET_ENTRIES, {
      method: HTTP_METHODS.POST,
      body: JSON.stringify(entryData),
    });
  },

  getEntries: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        queryParams.append(key, value);
      }
    });

    const endpoint = queryParams.toString()
      ? `${API_ENDPOINTS.TIMESHEET_ENTRIES}?${queryParams}`
      : API_ENDPOINTS.TIMESHEET_ENTRIES;

    return await apiCall(endpoint);
  },

  getEntry: async (entryId) => {
    return await apiCall(`${API_ENDPOINTS.TIMESHEET_ENTRY}/${entryId}`);
  },

  updateEntry: async (entryId, entryData) => {
    return await apiCall(`${API_ENDPOINTS.TIMESHEET_ENTRY}/${entryId}`, {
      method: HTTP_METHODS.PUT,
      body: JSON.stringify(entryData),
    });
  },

  deleteEntry: async (entryId) => {
    return await apiCall(`${API_ENDPOINTS.TIMESHEET_ENTRY}/${entryId}`, {
      method: HTTP_METHODS.DELETE,
    });
  },

  duplicateEntry: async (entryId) => {
    return await apiCall(
      `${API_ENDPOINTS.DUPLICATE_ENTRY}/${entryId}/duplicate`
    );
  },
};

// File Management API
export const fileAPI = {
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    return await apiCall(API_ENDPOINTS.FILE_UPLOAD, {
      method: HTTP_METHODS.POST,
      headers: {
        Authorization: authToken ? `Bearer ${authToken}` : undefined,
      },
      body: formData,
    });
  },

  uploadMultipleFiles: async (files) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    return await apiCall(API_ENDPOINTS.FILE_UPLOAD_MULTIPLE, {
      method: HTTP_METHODS.POST,
      headers: {
        Authorization: authToken ? `Bearer ${authToken}` : undefined,
      },
      body: formData,
    });
  },

  downloadFile: async (fileId) => {
    const url = `${API_BASE_URL}${API_ENDPOINTS.FILE_DOWNLOAD}/${fileId}`;
    window.open(url, "_blank");
  },

  getFileInfo: async (fileId) => {
    return await apiCall(`${API_ENDPOINTS.FILE_INFO}/${fileId}`);
  },

  listFiles: async () => {
    return await apiCall(API_ENDPOINTS.FILE_LIST);
  },

  deleteFile: async (fileId) => {
    return await apiCall(`${API_ENDPOINTS.FILE_DELETE}/${fileId}`, {
      method: HTTP_METHODS.DELETE,
    });
  },
};

// Health check
export const healthAPI = {
  check: async () => {
    return await apiCall(API_ENDPOINTS.HEALTH);
  },
};
