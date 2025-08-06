import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  email?: string;
  relationship_type: string;
  data_owner?: string;
  source: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ContactFormData {
  first_name: string;
  last_name?: string;
  phone_number: string;
  email?: string;
  relationship_type: string;
  data_owner?: string;
  source: string;
  status?: string;
  notes?: string;
}

export interface ImportSource {
  id: string;
  name: string;
  description: string;
  fields: string[];
  supported: boolean;
  requiresAuth?: boolean;
  comingSoon?: boolean;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ContactsResponse {
  contacts: Contact[];
  pagination: PaginationInfo;
}

export interface ImportSummary {
  total: number;
  imported: number;
  duplicates: number;
  errors: number;
}

export interface DuplicateContact {
  existingContact: Contact;
  similarityScore: number;
  matchReasons: string[];
  isExactMatch: boolean;
}

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (username: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data.user;
  },

  updateProfile: async (data: { username?: string; email?: string }) => {
    const response = await api.put('/auth/profile', data);
    return response.data.user;
  },
};

// Contacts API
export const contactsAPI = {
  getContacts: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    relationship_type?: string;
    data_owner?: string;
    source?: string;
    status?: string;
  }): Promise<ContactsResponse> => {
    const response = await api.get('/contacts', { params });
    return response.data;
  },

  getContact: async (id: number): Promise<Contact> => {
    const response = await api.get(`/contacts/${id}`);
    return response.data.contact;
  },

  createContact: async (data: ContactFormData): Promise<Contact> => {
    const response = await api.post('/contacts', data);
    return response.data.contact;
  },

  updateContact: async (id: number, data: ContactFormData): Promise<Contact> => {
    const response = await api.put(`/contacts/${id}`, data);
    return response.data.contact;
  },

  deleteContact: async (id: number): Promise<void> => {
    await api.delete(`/contacts/${id}`);
  },

  getStats: async () => {
    const response = await api.get('/contacts/stats/overview');
    return response.data;
  },
};

// Import API
export const importAPI = {
  getSources: async (): Promise<ImportSource[]> => {
    const response = await api.get('/import/sources');
    return response.data.sources;
  },

  importCSV: async (file: File, fieldMapping: Record<string, string>, options: {
    defaultRelationshipType?: string;
    defaultDataOwner?: string;
  }) => {
    const formData = new FormData();
    formData.append('csvFile', file);
    formData.append('fieldMapping', JSON.stringify(fieldMapping));
    formData.append('defaultRelationshipType', options.defaultRelationshipType || 'Other');
    if (options.defaultDataOwner) {
      formData.append('defaultDataOwner', options.defaultDataOwner);
    }

    const response = await api.post('/import/csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  importRawData: async (rawData: string): Promise<{
    message: string;
    summary: ImportSummary;
    imported: Contact[];
    duplicates: Array<{
      contact: ContactFormData;
      duplicates: DuplicateContact[];
    }>;
  }> => {
    const response = await api.post('/contacts/import/raw', { rawData });
    return response.data;
  },

  importGmail: async (accessToken: string, options: {
    relationshipType?: string;
    dataOwner?: string;
  }) => {
    const response = await api.post('/import/gmail', {
      accessToken,
      relationshipType: options.relationshipType || 'Other',
      dataOwner: options.dataOwner,
    });
    return response.data;
  },

  importZoho: async (accessToken: string, options: {
    relationshipType?: string;
    dataOwner?: string;
  }) => {
    const response = await api.post('/import/zoho', {
      accessToken,
      relationshipType: options.relationshipType || 'Other',
      dataOwner: options.dataOwner,
    });
    return response.data;
  },

  validateImportData: async (contacts: ContactFormData[], source: string) => {
    const response = await api.post('/import/validate', { contacts, source });
    return response.data;
  },
};

// Duplicates API
export const duplicatesAPI = {
  getDuplicateStats: async () => {
    const response = await api.get('/contacts/duplicates/stats');
    return response.data;
  },

  mergeContacts: async (primaryContactId: number, duplicateContactIds: number[]) => {
    const response = await api.post('/contacts/duplicates/merge', {
      primaryContactId,
      duplicateContactIds,
    });
    return response.data;
  },
};

// Health check
export const healthAPI = {
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api; 