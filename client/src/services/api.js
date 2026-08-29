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
    }),
    uploadAvatar: (formData) => request('/auth/avatar', {
      method: 'POST',
      body: formData
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
    }),
    uploadAvatar: (id, formData) => request(`/employees/${id}/avatar`, {
      method: 'POST',
      body: formData
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
    deleteRun: (id) => request(`/payroll/runs/${id}`, {
      method: 'DELETE'
    }),
    updateStatus: (id, status) => request(`/payroll/runs/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    }),
    getMyPayslips: () => request('/payroll/my-payslips'),
    getPayslipById: (id) => request(`/payroll/payslip/${id}`),
    getConfig: () => request('/payroll/config'),
    updateConfig: (data) => request('/payroll/config', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    updatePayslip: (id, data) => request(`/payroll/payslips/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
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
  },

  // Teams & Departments
  teams: {
    getAll: () => request('/teams'),
    getById: (id) => request(`/teams/${id}`),
    create: (data) => request('/teams', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id, data) => request(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id) => request(`/teams/${id}`, {
      method: 'DELETE'
    }),
    getDesignations: () => request('/teams/designations/list'),
    createDesignation: (data) => request('/teams/designations/create', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    updateDesignation: (id, data) => request(`/teams/designations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    deleteDesignation: (id) => request(`/teams/designations/${id}`, {
      method: 'DELETE'
    })
  },

  // Clients & Projects
  projects: {
    getAll: () => request('/projects'),
    getById: (id) => request(`/projects/${id}`),
    create: (data) => request('/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id, data) => request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id) => request(`/projects/${id}`, {
      method: 'DELETE'
    }),
    assign: (data) => request('/projects/assign', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    removeAssignment: (id) => request(`/projects/assignment/${id}`, {
      method: 'DELETE'
    }),
    getWorkload: () => request('/projects/workload/overview'),
    getClients: () => request('/projects/clients/list'),
    createClient: (data) => request('/projects/clients/create', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  // Timesheets
  timesheets: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/timesheets${query ? `?${query}` : ''}`);
    },
    submit: (data) => request('/timesheets', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    review: (id, status, review_notes) => request(`/timesheets/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify({ status, review_notes })
    }),
    delete: (id) => request(`/timesheets/${id}`, {
      method: 'DELETE'
    })
  },

  // Performance Reviews
  performance: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/performance${query ? `?${query}` : ''}`);
    },
    create: (data) => request('/performance', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    delete: (id) => request(`/performance/${id}`, {
      method: 'DELETE'
    })
  },

  // Reports
  reports: {
    getSummary: () => request('/reports/summary')
  },

  // Notifications
  notifications: {
    getAll: () => request('/notifications'),
    markAllRead: () => request('/notifications/read-all', {
      method: 'PUT'
    })
  },

  // Audit Logs
  audit: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/audit${query ? `?${query}` : ''}`);
    },
    getSystem: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/audit/system${query ? `?${query}` : ''}`);
    },
    getAuth: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/audit/auth${query ? `?${query}` : ''}`);
    },
    getStats: () => request('/audit/stats')
  }
};
