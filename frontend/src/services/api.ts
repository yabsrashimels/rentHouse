import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

export function resolveMediaUrl(url?: string | null) {
  if (!url || /^(https?:|blob:|data:)/i.test(url)) return url || ''
  if (!url.startsWith('/api/')) return url
  const baseUrl = api.defaults.baseURL || '/api'
  if (baseUrl.startsWith('http')) {
    return `${new URL(baseUrl).origin}${url.startsWith('/') ? url : `/${url}`}`
  }
  return url
}

export function mediaCrossOrigin(url?: string | null) {
  return url?.includes('/images/local/') ? 'use-credentials' as const : undefined
}

// Refresh the HTTP-only session cookie after access-token expiry.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh')) {
      originalRequest._retry = true

      try {
        await axios.post(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true })
        return api(originalRequest)
      } catch {
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default api
