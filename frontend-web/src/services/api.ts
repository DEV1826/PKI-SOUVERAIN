import axios from 'axios';

/**
 * Configuration de l'API client pour communiquer avec le backend
 */

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8080/api';
const API_BASE_URL_CLEAN = API_BASE_URL.replace(/\/+$/, '');
const isUsableToken = (token: string | null | undefined): token is string =>
  !!token && token !== 'undefined' && token !== 'null' && token.trim().length > 10;

// Instance Axios configurÃ©e
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
    if (isUsableToken(token)) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => Promise.reject(error)
);

// Intercepteur pour gÃ©rer les erreurs 401 (token expirÃ©)
apiClient.interceptors.response.use(
  (response: any) => response,
  async (error: any) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expirÃ© : redirection vers login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      if (!window.location.hash.includes('/login')) {
        window.location.hash = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Types de donnÃ©es
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
    let response: any;
    let lastError: any = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await apiClient.post<any>('/auth/login', data);
        break;
      } catch (err: any) {
        lastError = err;
        const transientNetwork = !err?.response || err?.code === 'ERR_NETWORK' || err?.code === 'ECONNABORTED';
        if (!transientNetwork || attempt === 2) throw err;
        await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
      }
    }

    if (!response) throw lastError || new Error('Connexion impossible');
    const accessToken = response.data?.accessToken || response.data?.token;
    const refreshToken = response.data?.refreshToken || '';

    if (!isUsableToken(accessToken)) {
      throw new Error('Reponse de connexion invalide: token absent');
    }

    // Stocker les tokens
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    else localStorage.removeItem('refreshToken');

    return {
      ...response.data,
      accessToken,
      refreshToken,
    } as JwtResponse;
  },

  /**
   * DÃ©connexion
   */
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.hash = '/login';
  },

  /**
   * Demande de rÃ©initialisation de mot de passe
   */
  forgotPassword: async (email: string): Promise<any> => {
    const response = await apiClient.post<any>('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * RÃ©initialise le mot de passe
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
   * RÃ©cupÃ©rer le profil de l'utilisateur connectÃ©
   */
  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/user/me');
    return response.data;
  },
  /**
   * RÃ©cupÃ©rer les certificats de l'utilisateur connectÃ©
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
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return response.data;
  },

  /**
   * Soumettre un CSR apres validation admin
   */
  submitCsrAfterReview: async (requestId: string, csrText?: string, csrFile?: File): Promise<any> => {
    const form = new FormData();
    if (csrText && csrText.trim()) form.append('csr', csrText.trim());
    if (csrFile) form.append('csrFile', csrFile);
    const response = await apiClient.post(`/user/certificate-requests/${requestId}/submit-csr`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return response.data;
  },

  /**
   * Generer et soumettre une CSR serveur apres validation admin
   */
  generateCsrAfterReview: async (requestId: string, payload: { cn?: string; o?: string; ou?: string; l?: string; st?: string; c?: string; email?: string }): Promise<any> => {
    const response = await apiClient.post(`/user/certificate-requests/${requestId}/generate-csr`, null, { params: payload });
    return response.data;
  },

  /**
   * RÃ©cupÃ©rer les demandes de certificats de l'utilisateur
   */
  getMyRequests: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/user/certificate-requests');
    return response.data;
  },

  /**
   * TÃ©lÃ©charger un certificat par ID
   */
  downloadCertificate: async (
    certificateId: string,
    format: 'pem' | 'crt' | 'p12' = 'pem',
    password?: string
  ): Promise<Blob> => {
    const response = await apiClient.get(`/user/certificates/${certificateId}/download`, {
      params: { format, password },
      responseType: 'blob'
    });
    return response.data as Blob;
  },

  /**
   * Telecharger la CRL (utilisateur)
   */
  downloadCrl: async (): Promise<Blob> => {
    const response = await apiClient.get(`/admin/crl`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};

export const adminService = {
  /**
   * RÃ©cupÃ©rer le dashboard admin
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
   * RÃ©cupÃ©rer le statut de l'AC
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
    // URL backend absolue pour fonctionner en production
    return `${API_BASE_URL_CLEAN}/admin/certificate-requests/${requestId}/documents/${encodeURIComponent(filename)}`;
  },

  approveRequest: async (id: string, validityDays = 365): Promise<any> => {
    const response = await apiClient.post(`/admin/certificate-requests/${id}/approve`, null, { params: { validityDays } });
    return response.data;
  },

  reviewApproveRequest: async (id: string): Promise<any> => {
    const response = await apiClient.post(`/admin/certificate-requests/${id}/review-approve`);
    return response.data;
  },

  rejectRequest: async (id: string, reason?: string): Promise<any> => {
    const response = await apiClient.post(`/admin/certificate-requests/${id}/reject`, null, { params: { reason } });
    return response.data;
  },

  /**
   * CRL / Revocation / CA
   */
  generateCrl: async (): Promise<{ crlPem?: string; crlPath?: string }> => {
    const response = await apiClient.post<{ crlPem?: string; crlPath?: string }>(`/admin/generate-crl`);
    return response.data;
  },

  rotateCrl: async (): Promise<{ crlPem?: string; crlPath?: string }> => {
    const response = await apiClient.post<{ crlPem?: string; crlPath?: string }>(`/admin/rotate-crl`);
    return response.data;
  },

  downloadCrl: async (): Promise<Blob> => {
    const response = await apiClient.get(`/admin/crl`, { responseType: 'blob' });
    return response.data as Blob;
  },

  revokeCertificate: async (certId: string, reason?: string): Promise<any> => {
    const response = await apiClient.post(`/admin/revoke/${certId}`, null, { params: { reason } });
    return response.data;
  },

  generateIntermediateCa: async (name: string, keySize = 4096, validityDays = 3650): Promise<any> => {
    const response = await apiClient.post(`/admin/generate-intermediate-ca`, null, {
      params: { name, keySize, validityDays },
    });
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



