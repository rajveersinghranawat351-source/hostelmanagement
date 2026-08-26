const API_BASE = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '') + '/api';

function getAuthHeader() {
  const token = localStorage.getItem('hostel_pg_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Resilient fetch wrapper with timeout, network error handling, and safe JSON extraction
async function safeFetch(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';
    let data = {};
    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch (e) {
        data = { message: 'Failed to parse server response.' };
      }
    } else {
      const text = await res.text().catch(() => '');
      data = { message: text || `HTTP Error ${res.status}` };
    }

    if (!res.ok) {
      const errorMsg = data.message || data.error || `Request failed with status ${res.status}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.alreadyJoined = !!data.alreadyJoined;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection and try again.');
    }
    if (err.message === 'Failed to fetch' || err.message.includes('NetworkError') || err.message.includes('network')) {
      throw new Error('Network connection failed. Please check your connection and try again.');
    }
    throw err;
  }
}

export const api = {
  // Auth
  async login(emailOrMobile, password, role) {
    return safeFetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrMobile, password, role }),
    });
  },

  async register(userData) {
    return safeFetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
  },

  async getMe() {
    return safeFetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
  },

  // Property Lookup
  async lookupPropertyByQR(qrIdentifier) {
    return safeFetch(`${API_BASE}/properties/qr/${encodeURIComponent(qrIdentifier)}`);
  },

  async getOwnerProperty() {
    return safeFetch(`${API_BASE}/properties/mine`, {
      headers: { ...getAuthHeader() },
    });
  },

  async createProperty(propertyData) {
    return safeFetch(`${API_BASE}/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(propertyData),
    });
  },

  async regenerateOwnerQR() {
    return safeFetch(`${API_BASE}/properties/qr/regenerate`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
  },

  async updateOwnerQRStatus(status) {
    return safeFetch(`${API_BASE}/properties/qr/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ status }),
    });
  },

  // Student Endpoints
  async registerStudent(formData) {
    const isFormData = typeof FormData !== 'undefined' && formData instanceof FormData;
    const headers = { ...getAuthHeader() };
    
    // CRITICAL: When submitting FormData, NEVER set Content-Type header manually.
    // The browser automatically sets Content-Type with the unique multipart boundary.
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    return safeFetch(`${API_BASE}/students/register`, {
      method: 'POST',
      headers,
      body: isFormData ? formData : JSON.stringify(formData),
    }, 45000); // 45s timeout for file uploads
  },

  async getStudentMe() {
    return safeFetch(`${API_BASE}/students/me`, {
      headers: { ...getAuthHeader() },
    });
  },

  // Owner Endpoints
  async getOwnerStats() {
    return safeFetch(`${API_BASE}/owner/stats`, {
      headers: { ...getAuthHeader() },
    });
  },

  async getOwnerStudents(filterStatus = '', searchQuery = '') {
    const params = new URLSearchParams();
    if (filterStatus && filterStatus !== 'all') params.append('status', filterStatus);
    if (searchQuery) params.append('q', searchQuery);

    return safeFetch(`${API_BASE}/owner/students?${params.toString()}`, {
      headers: { ...getAuthHeader() },
    });
  },

  async getOwnerStudentProfile(studentId) {
    return safeFetch(`${API_BASE}/owner/students/${studentId}`, {
      headers: { ...getAuthHeader() },
    });
  },

  async updateStudentStatus(studentId, status) {
    return safeFetch(`${API_BASE}/owner/students/${studentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ status }),
    });
  },

  async updateStudentRoom(studentId, roomNumber, bed) {
    return safeFetch(`${API_BASE}/owner/students/${studentId}/room`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ roomNumber, bed }),
    });
  },

  async getOwnerNotifications() {
    return safeFetch(`${API_BASE}/owner/notifications`, {
      headers: { ...getAuthHeader() },
    });
  },

  async markAllNotificationsRead() {
    return safeFetch(`${API_BASE}/owner/notifications/read-all`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
  },

  // Secure Document Fetcher with Blob conversion
  async fetchSecureDocumentBlob(documentUrl) {
    const fullUrl = documentUrl.startsWith('http')
      ? documentUrl
      : (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '') + documentUrl;
    const res = await fetch(fullUrl, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) {
      throw new Error(`Failed to load document (Status: ${res.status})`);
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  // ==========================================
  // PAYMENT & BILLING APIS
  // ==========================================

  // Tenant APIs
  async getTenantFeeStatus() {
    return safeFetch(`${API_BASE}/payments/tenant/fee-status`, {
      headers: { ...getAuthHeader() },
    });
  },

  async getTenantPaymentHistory() {
    return safeFetch(`${API_BASE}/payments/tenant/history`, {
      headers: { ...getAuthHeader() },
    });
  },

  async verifyAndRecordTenantPayment(paymentData) {
    return safeFetch(`${API_BASE}/payments/tenant/verify-and-record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(paymentData),
    });
  },

  // Owner APIs
  async getOwnerPaymentDashboard() {
    return safeFetch(`${API_BASE}/payments/owner/dashboard`, {
      headers: { ...getAuthHeader() },
    });
  },

  async getOwnerPaymentSettings() {
    return safeFetch(`${API_BASE}/payments/owner/settings`, {
      headers: { ...getAuthHeader() },
    });
  },

  async saveOwnerPaymentSettings(settings) {
    return safeFetch(`${API_BASE}/payments/owner/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(settings),
    });
  },

  async getOwnerTenantHistory(studentId) {
    return safeFetch(`${API_BASE}/payments/owner/tenant-history/${studentId}`, {
      headers: { ...getAuthHeader() },
    });
  },

  async updateOwnerTenantFee(studentId, monthlyFee, rentDueDay) {
    return safeFetch(`${API_BASE}/payments/owner/update-tenant-fee`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ studentId, monthlyFee, rentDueDay }),
    });
  },

  async recordOwnerOfflinePayment(paymentData) {
    return safeFetch(`${API_BASE}/payments/owner/record-offline-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(paymentData),
    });
  },
};

