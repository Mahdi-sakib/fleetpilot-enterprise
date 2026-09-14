const TOKEN_KEY = 'fleetpilot_access_token';

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // localStorage unavailable (private mode, etc.) — auth just won't persist across reloads.
  }
}

// A Google OAuth login redirects back with ?access_token=... on the URL —
// pick it up once, then scrub it so it never lingers in the address bar/history.
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  const tokenFromRedirect = params.get('access_token');
  if (tokenFromRedirect) {
    setToken(tokenFromRedirect);
    params.delete('access_token');
    const query = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash);
  }
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let data = null;
    try {
      data = await res.json();
    } catch {
      // non-JSON error body — fall back to statusText below
    }
    const err = new Error(data?.message || res.statusText || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

function makeEntityClient(entityName) {
  return {
    list: (sort = '-created_date', limit = 100) =>
      request(`/entities/${entityName}?sort=${encodeURIComponent(sort)}&limit=${limit}`),
    filter: (query = {}, sort = '-created_date', limit = 500) =>
      request(`/entities/${entityName}/query?sort=${encodeURIComponent(sort)}&limit=${limit}`, {
        method: 'POST',
        body: query,
      }),
    get: (id) => request(`/entities/${entityName}/${id}`),
    create: (data) => request(`/entities/${entityName}`, { method: 'POST', body: data }),
    update: (id, data) => request(`/entities/${entityName}/${id}`, { method: 'PATCH', body: data }),
    delete: (id) => request(`/entities/${entityName}/${id}`, { method: 'DELETE' }),
  };
}

export const api = {
  entities: {
    Vehicle: makeEntityClient('Vehicle'),
    Driver: makeEntityClient('Driver'),
    Trip: makeEntityClient('Trip'),
    FuelLog: makeEntityClient('FuelLog'),
    WorkOrder: makeEntityClient('WorkOrder'),
    DefectReport: makeEntityClient('DefectReport'),
  },
  auth: {
    me: () => request('/auth/me'),
    updateMe: (data) => request('/auth/me', { method: 'PATCH', body: data }),
    loginViaEmailPassword: async (email, password) => {
      const { access_token } = await request('/auth/login', { method: 'POST', body: { email, password } });
      setToken(access_token);
    },
    register: (data) => request('/auth/register', { method: 'POST', body: data }),
    verifyOtp: (data) => request('/auth/verify-otp', { method: 'POST', body: data }),
    resendOtp: (email) => request('/auth/resend-otp', { method: 'POST', body: { email } }),
    resetPasswordRequest: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
    resetPassword: (data) => request('/auth/reset-password', { method: 'POST', body: data }),
    loginWithProvider: (provider, returnTo) => {
      window.location.href = `/api/auth/${provider}/start?returnTo=${encodeURIComponent(returnTo || '/')}`;
    },
    setToken,
    logout: (redirectTo) => {
      setToken(null);
      if (redirectTo) window.location.href = '/login';
    },
    redirectToLogin: (returnTo) => {
      window.location.href = `/login?returnTo=${encodeURIComponent(returnTo || '/')}`;
    },
  },
  app: {
    getPublicSettings: () => request('/app/public-settings'),
  },
  files: {
    uploadPublicFile: async ({ file }) => {
      const form = new FormData();
      form.append('file', file);
      const token = getToken();
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        let data = null;
        try {
          data = await res.json();
        } catch {
          // ignore
        }
        throw new Error(data?.message || 'Upload failed');
      }
      return res.json();
    },
  },
};
