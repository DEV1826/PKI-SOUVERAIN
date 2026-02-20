import axios from 'axios';

/**
 * Configuration de l'API client pour communiquer avec le backend
 */

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8080/api';

// Instance Axios configurée
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token JWT
apiClient.interceptors.request.use(
  (config: any) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => Promise.reject(error)
);

// Intercepteur pour gérer les erreurs 401 (token expiré)
apiClient.interceptors.response.use(
  (response: any) => response,
  async (error: any) => {
    if (error.response?.status === 401) {
      // Token expiré : redirection vers login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Types de données
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'USER';
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface JwtResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface DashboardData {
  totalUsers: number;
  pendingRequests: number;
  activeCertificates: number;
  revokedCertificates: number;
  caStatus: CAStatus;
}

export interface CAStatus {
  isActive: boolean;
  isInitialized: boolean;
  caName?: string;
  validFrom?: string;
  validUntil?: string;
  daysUntilExpiration?: number;
  subjectDN?: string;
}

/**
 * API Service
 */
export const authService = {
  /**
   * Inscription
   */
  register: async (data: RegisterRequest): Promise<User> => {
    const response = await apiClient.post<User>('/auth/register', data);
    return response.data;
  },

  /**
   * Connexion
   */
  login: async (data: LoginRequest): Promise<JwtResponse> => {
    const response = await apiClient.post<JwtResponse>('/auth/login', data);
    // Stocker les tokens
    localStorage.setItem('accessToken', response.data.accessToken);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    return response.data;
  },

  /**
   * Déconnexion
   */
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  },

  /**
   * Demande de réinitialisation de mot de passe
   */
  forgotPassword: async (email: string): Promise<any> => {
    const response = await apiClient.post<any>('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Réinitialise le mot de passe
   */
  resetPassword: async (token: string, password: string): Promise<any> => {
    const response = await apiClient.post<any>('/auth/reset-password', { token, password });
    return response.data;
  },
};

export interface Certificate {
  id: string;
  serialNumber: string;
  subjectDN: string;
  issuerDN: string;
  status: string;
  notBefore: string;
  notAfter: string;
  certificatePem: string;
}

export const userService = {
  /**
   * Récupérer le profil de l'utilisateur connecté
   */
  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/user/me');
    return response.data;
  },
  /**
   * Récupérer les certificats de l'utilisateur connecté
   */
  getMyCertificates: async (): Promise<Certificate[]> => {
    const response = await apiClient.get<Certificate[]>('/user/certificates');
    return response.data;
  },

  /**
   * Soumettre une nouvelle demande de certificat (multipart form)
   */
  submitCertificateRequest: async (form: FormData): Promise<any> => {
    const response = await apiClient.post('/user/certificate-requests', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  /**
   * Récupérer les demandes de certificats de l'utilisateur
   */
  getMyRequests: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/user/certificate-requests');
    return response.data;
  },

  /**
   * Télécharger un certificat par ID
   */
  downloadCertificate: async (certificateId: string, format: 'pem' | 'crt' = 'pem'): Promise<Blob> => {
    const response = await apiClient.get(`/user/certificates/${certificateId}/download`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data as Blob;
  },
};

export const adminService = {
  /**
   * Récupérer le dashboard admin
   */
  getDashboard: async (): Promise<DashboardData> => {
    const response = await apiClient.get<DashboardData>('/admin/dashboard');
    return response.data;
  },

  /**
   * Initialiser l'AC Racine
   */
  initializeCA: async (): Promise<CAStatus> => {
    const response = await apiClient.post<CAStatus>('/admin/ca/initialize');
    return response.data;
  },

  /**
   * Récupérer le statut de l'AC
   */
  getCAStatus: async (): Promise<CAStatus> => {
    const response = await apiClient.get<CAStatus>('/admin/ca/status');
    return response.data;
  },

  /**
   * Certificate request management (admin)
   */
  getCertificateRequests: async (status?: string, page = 0, size = 20): Promise<{ items: any[]; total: number; page: number; size: number; totalPages: number }> => {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.set('status', status);
    params.set('page', String(page));
    params.set('size', String(size));
    const url = `/admin/certificate-requests?${params.toString()}`;
    const response = await apiClient.get<any>(url);
    return response.data;
  },

  getCertificateRequest: async (id: string): Promise<any> => {
    const response = await apiClient.get<any>(`/admin/certificate-requests/${id}`);
    return response.data;
  },

  downloadRequestDocument: (requestId: string, filename: string): string => {
    // retourne simplement l'URL relative (synchroniquement) — pas de fetch requis
    return `/api/admin/certificate-requests/${requestId}/documents/${encodeURIComponent(filename)}`;
  },

  approveRequest: async (id: string, validityDays = 365): Promise<any> => {
    const response = await apiClient.post(`/admin/certificate-requests/${id}/approve`, null, { params: { validityDays } });
    return response.data;
  },

  rejectRequest: async (id: string, reason?: string): Promise<any> => {
    const response = await apiClient.post(`/admin/certificate-requests/${id}/reject`, null, { params: { reason } });
    return response.data;
  },

  /**
   * User management (admin)
   */
  getUsers: async (page = 0, size = 20): Promise<{ items: any[]; total: number; page: number; size: number; totalPages: number }> => {
    const params = { page: String(page), size: String(size) };
    const response = await apiClient.get<any>(`/admin/users`, { params });
    return response.data;
  },

  deleteUser: async (userId: string): Promise<any> => {
    const response = await apiClient.delete<any>(`/admin/users/${userId}`);
    return response.data;
  },
};

