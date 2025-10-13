// API Configuration
export const API_BASE_URL = 'http://localhost:8000';
// export const API_BASE_URL = 'http://13.203.251.172/:8000';

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
  VERIFY_TOKEN: '/auth/verify-token',
  
  // Query & Search
  SEARCH: '/query/search',
  UPLOAD_FILE: '/query/upload',
  UPLOAD_MULTIPLE: '/query/upload-multiple',
  DROPDOWN_DATA: '/query/dropdown-data',
  DELETE_FILE: '/query/file',
  
  // Timesheet
  TIMESHEET_ENTRIES: '/timesheet/entries',
  TIMESHEET_ENTRY: '/timesheet/entries',
  DUPLICATE_ENTRY: '/timesheet/entries',
  
  // Files
  FILE_UPLOAD: '/files/upload',
  FILE_UPLOAD_MULTIPLE: '/files/upload-multiple',
  FILE_DOWNLOAD: '/files/download',
  FILE_INFO: '/files/info',
  FILE_LIST: '/files/list',
  FILE_DELETE: '/files',
  
  // Health
  HEALTH: '/health'
};

// HTTP Methods
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE'
};
