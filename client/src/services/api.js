// API client utility

const BASE_URL = '/api';

function getAuthHeaders(isFormData = false) {
  const token = localStorage.getItem('hr_token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...getAuthHeaders(isFormData),
    ...options.headers
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  auth: {
    login: (username, password) => request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
    getMe: () => request('/auth/me'),
    changePassword: (currentPassword, newPassword) => request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    }),
    resetPassword: (userId, newPassword) => request(`/auth/reset-password/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    })
  },

  // Dashboard
  dashboard: {
    getStats: () => request('/dashboard/stats')
  },

  // Employees
  employees: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/employees${query ? `?${query}` : ''}`);
    },
    getById: (id) => request(`/employees/${id}`),
    create: (data) => request('/employees', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id, data) => request(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id) => request(`/employees/${id}`, {
      method: 'DELETE'
    })
  },

  // Time Logs & Punch Clock
  timelogs: {
    punch: (action, notes = '') => request('/timelogs/punch', {
      method: 'POST',
      body: JSON.stringify({ action, notes })
    }),
    getToday: () => request('/timelogs/today'),
    getMy: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/timelogs/my${query ? `?${query}` : ''}`);
    },
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/timelogs/all${query ? `?${query}` : ''}`);
    },
    getLiveStatus: () => request('/timelogs/live-status'),
    createManual: (data) => request('/timelogs/manual', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    delete: (id) => request(`/timelogs/${id}`, {
      method: 'DELETE'
    })
  },

  // Leaves
  leaves: {
    getMy: () => request('/leaves/my'),
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/leaves/all${query ? `?${query}` : ''}`);
    },
    apply: (data) => request('/leaves/apply', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    review: (id, status, review_notes) => request(`/leaves/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify({ status, review_notes })
    }),
    updateBalance: (employeeId, data) => request(`/leaves/balances/${employeeId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  },

  // Payroll
  payroll: {
    generate: (period_start, period_end) => request('/payroll/generate', {
      method: 'POST',
      body: JSON.stringify({ period_start, period_end })
    }),
    getRuns: () => request('/payroll/runs'),
    getRunById: (id) => request(`/payroll/runs/${id}`),
    updateStatus: (id, status) => request(`/payroll/runs/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    }),
    getMyPayslips: () => request('/payroll/my-payslips'),
    getPayslipById: (id) => request(`/payroll/payslip/${id}`)
  },

  // Documents
  documents: {
    upload: (formData) => request('/documents/upload', {
      method: 'POST',
      body: formData
    }),
    getMy: () => request('/documents/my'),
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/documents/all${query ? `?${query}` : ''}`);
    },
    delete: (id) => request(`/documents/${id}`, {
      method: 'DELETE'
    })
  },

  // Training
  training: {
    getPrograms: () => request('/training/programs'),
    createProgram: (data) => request('/training/programs', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    updateProgram: (id, data) => request(`/training/programs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    deleteProgram: (id) => request(`/training/programs/${id}`, {
      method: 'DELETE'
    }),
    getRecords: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/training/records${query ? `?${query}` : ''}`);
    },
    enroll: (training_id, employee_id) => request('/training/enroll', {
      method: 'POST',
      body: JSON.stringify({ training_id, employee_id })
    }),
    updateRecord: (id, data) => request(`/training/records/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  },

  // Assets
  assets: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/assets${query ? `?${query}` : ''}`);
    },
    getMy: () => request('/assets/my'),
    create: (data) => request('/assets', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id, data) => request(`/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    assign: (id, employee_id, expected_return_date) => request(`/assets/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ employee_id, expected_return_date })
    }),
    returnAsset: (id, condition, notes) => request(`/assets/${id}/return`, {
      method: 'POST',
      body: JSON.stringify({ condition, notes })
    }),
    delete: (id) => request(`/assets/${id}`, {
      method: 'DELETE'
    })
  }
};
