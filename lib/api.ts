import axios from 'axios'
import { jwtDecode } from 'jwt-decode'

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

console.log('API Base URL:', baseURL)

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Estado del refresh
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}> = []

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// Verificar si el token está por expirar (dentro de 5 minutos)
const isTokenExpiringSoon = (token: string): boolean => {
  try {
    const decoded: any = jwtDecode(token)
    const currentTime = Date.now() / 1000
    const bufferTime = 5 * 60 // 5 minutos antes de expirar
    return decoded.exp < currentTime + bufferTime
  } catch {
    return true // Si hay error al decodificar, asumimos que debe refrescarse
  }
}

// Función para refrescar el token
const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  const { data } = await axios.post(
    `${baseURL}/auth/token/refresh/`,
    { refresh: refreshToken }
  )

  // Actualizar tokens en localStorage
  localStorage.setItem('access_token', data.access)
  if (data.refresh) {
    localStorage.setItem('refresh_token', data.refresh)
  }

  return data.access
}

// Request interceptor - REFRESH PROACTIVO
api.interceptors.request.use(
  async (config) => {
    let token = localStorage.getItem('access_token')

    // Si hay token, verificar si está por expirar
    if (token && isTokenExpiringSoon(token)) {
      if (!isRefreshing) {
        isRefreshing = true

        try {
          token = await refreshAccessToken()
          isRefreshing = false
          processQueue(null, token)
        } catch (error) {
          isRefreshing = false
          processQueue(error as Error, null)

          // Limpiar localStorage y redirigir al login
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user')

          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }

          throw error
        }
      } else {
        // Si ya está refrescando, esperar
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            config.headers.Authorization = `Bearer ${token}`
            return config
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }
    }

    // Añadir token al header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - FALLBACK para 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Si recibe 401 y no se ha reintentado
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      if (isRefreshing) {
        // Si ya está refrescando, esperar
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      isRefreshing = true

      try {
        const newToken = await refreshAccessToken()
        isRefreshing = false
        processQueue(null, newToken)

        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        isRefreshing = false
        processQueue(refreshError as Error, null)

        // Limpiar localStorage y redirigir al login
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')

        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }

        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api
