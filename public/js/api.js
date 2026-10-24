/**
 * FC BAZAR API Client
 */
const API = {
  baseUrl: '/api',

  getToken() {
    return localStorage.getItem('fc_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('fc_token', token);
    } else {
      localStorage.removeItem('fc_token');
    }
  },

  getUser() {
    const raw = localStorage.getItem('fc_user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  setUser(user) {
    if (user) {
      localStorage.setItem('fc_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('fc_user');
    }
  },

  async request(endpoint, options = {}) {
    const headers = options.headers || {};
    const token = this.getToken();

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers
    };

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, config);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          // Token expired or invalid
          this.setToken(null);
          this.setUser(null);
          if (window.app && window.app.updateAuthUI) {
            window.app.updateAuthUI();
          }
        }
        throw new Error(data.error || 'Xatolik yuz berdi');
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  // Auth endpoints
  auth: {
    login: (identifier, password) => 
      API.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password })
      }),

    register: (userData) =>
      API.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      }),

    me: () => API.request('/auth/me'),

    updateProfile: (profileData) =>
      API.request('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      }),

    getUser: (userId) => API.request(`/auth/users/${userId}`)
  },

  // Listings endpoints
  listings: {
    getAll: (params = {}) => {
      const q = new URLSearchParams();
      Object.keys(params).forEach(k => {
        if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
          q.append(k, params[k]);
        }
      });
      return API.request(`/listings?${q.toString()}`);
    },

    getById: (id) => API.request(`/listings/${id}`),

    create: (listingData) =>
      API.request('/listings', {
        method: 'POST',
        body: JSON.stringify(listingData)
      }),

    update: (id, updates) =>
      API.request(`/listings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      }),

    delete: (id) =>
      API.request(`/listings/${id}`, {
        method: 'DELETE'
      }),

    uploadImages: (formData) =>
      API.request('/listings/upload', {
        method: 'POST',
        body: formData
      })
  },

  // Deals / Escrow endpoints
  deals: {
    getAll: () => API.request('/deals'),

    getById: (id) => API.request(`/deals/${id}`),

    start: (listingId) =>
      API.request('/deals/start', {
        method: 'POST',
        body: JSON.stringify({ listingId })
      }),

    sendCredentials: (dealId, credentials) =>
      API.request(`/deals/${dealId}/send-credentials`, {
        method: 'POST',
        body: JSON.stringify({ credentials })
      }),

    confirm: (dealId) =>
      API.request(`/deals/${dealId}/confirm`, {
        method: 'POST'
      }),

    dispute: (dealId, reason) =>
      API.request(`/deals/${dealId}/dispute`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      }),

    sendMessage: (dealId, text) =>
      API.request(`/deals/${dealId}/message`, {
        method: 'POST',
        body: JSON.stringify({ text })
      }),

    leaveReview: (dealId, rating, comment) =>
      API.request(`/deals/${dealId}/review`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment })
      })
  },

  // Wallet endpoints
  wallet: {
    topup: (amount, method) =>
      API.request('/wallet/topup', {
        method: 'POST',
        body: JSON.stringify({ amount, method })
      }),

    transfer: (recipient, amount) =>
      API.request('/wallet/transfer', {
        method: 'POST',
        body: JSON.stringify({ recipient, amount })
      }),

    withdraw: (amount, cardNumber, cardHolder) =>
      API.request('/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount, cardNumber, cardHolder })
      }),

    getTransactions: () => API.request('/wallet/transactions')
  },

  // Admin endpoints
  admin: {
    getStats: () => API.request('/admin/stats'),
    getUsers: () => API.request('/admin/users'),
    updateUser: (id, data) =>
      API.request(`/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    resolveDispute: (dealId, decision, reason) =>
      API.request(`/admin/deals/${dealId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ decision, reason })
      })
  }
};
