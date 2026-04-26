import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach CSRF token to mutating requests
api.interceptors.request.use((config) => {
  const csrf = getCookie('csrf-token')
  if (csrf && ['post', 'put', 'delete', 'patch'].includes(config.method)) {
    config.headers['X-CSRF-Token'] = csrf
  }
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      if (!window.location.pathname.includes('/login') &&
          !window.location.pathname.includes('/verify-otp')) {
        window.dispatchEvent(new CustomEvent('auth:expired'))
      }
    }
    return Promise.reject(err)
  }
)

function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
}

export const authAPI = {
  login:           (email, password) => api.post('/auth/login', { email, password }),
  logout:          ()                => api.post('/auth/logout'),
  getMe:           ()                => api.get('/auth/me'),
  changePassword:  (currentPassword, newPassword) => api.post('/auth/change-password', { currentPassword, newPassword }),
  logSuspicious:   (event, details)  => api.post('/auth/log-suspicious', { event, details }),
}

export const electionsAPI = {
  getActive:           () => api.get('/elections/active'),
  getPublished:        () => api.get('/elections/published'),
  getPublishedResults: (id) => api.get(`/elections/${id}/results`),
  getById:             (id) => api.get(`/elections/${id}`),
}

export const candidatesAPI = {
  getByElection: (electionId) => api.get(`/candidates/election/${electionId}`),
  create:        (data)       => api.post('/candidates', data),
  remove:        (id)         => api.delete(`/candidates/${id}`),
  uploadPhoto:   (id, photoUrl) => api.put(`/candidates/${id}/photo`, { photoUrl }, {
    // Override default timeout for large base64 payloads
    timeout: 30000,
  }),
}

export const votesAPI = {
  getToken: (electionId) => api.get(`/votes/token/${electionId}`),
  submit:   (payload)    => api.post('/votes/submit', payload),
  getStatus:(electionId) => api.get(`/votes/status/${electionId}`),
}

export const adminAPI = {
  getStats:         ()           => api.get('/admin/stats'),
  getElections:     ()           => api.get('/admin/elections'),
  createElection:   (data)       => api.post('/admin/elections', data),
  setElectionStatus:(id, status) => api.put(`/admin/elections/${id}/status`, { status }),
  getResults:       (id)         => api.get(`/admin/elections/${id}/results`),
  publishResults:   (id)         => api.post(`/admin/elections/${id}/publish-results`),
  getUsers:         (params)     => api.get('/admin/users', { params }),
  flagUser:         (id, flagged, reason) => api.put(`/admin/users/${id}/flag`, { flagged, reason }),
  getAuditLogs:     (params)     => api.get('/audit/logs', { params }),
  getSecurityAlerts:()           => api.get('/audit/security-alerts'),
}

export default api
