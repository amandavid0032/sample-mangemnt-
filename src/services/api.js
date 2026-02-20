import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API (Login only - no registration)
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me')
};

// Samples API
export const samplesAPI = {
  getAll: (params) => api.get('/samples', { params }),
  getById: (id) => api.get(`/samples/${id}`),
  create: (formData) => api.post('/samples', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  // LAB test submission (FIELD_TESTED → LAB_TESTED)
  submitLabTest: (id, parameters) => api.post(`/samples/${id}/lab-test`, { parameters }),
  // Publish sample (LAB_TESTED → PUBLISHED)
  publish: (id) => api.patch(`/samples/${id}/publish`),
  archive: (id) => api.patch(`/samples/${id}/archive`),
  restore: (id) => api.patch(`/samples/${id}/restore`),
  getStats: () => api.get('/samples/stats'),
  // Get LAB parameters for admin form
  getLabParameters: () => api.get('/parameters', { params: { testLocation: 'LAB' } }),
  // Download PDF report
  downloadPDF: async (id, sampleId) => {
    const response = await api.get(`/samples/${id}/pdf`, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sampleId || 'sample'}-report.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};

// Parameters API
export const parametersAPI = {
  getAll: (includeInactive = false, page = 1, limit = 10) =>
    api.get('/parameters', { params: { includeInactive, page, limit } }),
  getAllForDropdown: () => api.get('/parameters', { params: { all: 'true' } }),
  getById: (id) => api.get(`/parameters/${id}`),
  create: (data) => api.post('/parameters', data),
  update: (id, data) => api.patch(`/parameters/${id}`, data),
  toggle: (id) => api.patch(`/parameters/${id}/toggle`)
};

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (userData) => api.post('/users', userData),
  updateStatus: (id, isActive) => api.patch(`/users/${id}/status`, { isActive })
};

// Public API
export const publicAPI = {
  getSamples: (params) => api.get('/public/samples', { params }),
  getSampleById: (id) => api.get(`/public/samples/${id}`),
  getStats: () => api.get('/public/stats'),
  getMapData: () => api.get('/public/map'),
  getFilters: () => api.get('/public/filters'),
  // Download PDF report (public)
  downloadPDF: async (id, sampleId) => {
    const response = await api.get(`/public/samples/${id}/pdf`, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sampleId || 'sample'}-report.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};

export default api;
