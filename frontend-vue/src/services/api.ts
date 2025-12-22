import axios from 'axios'

const BASE_URL = import.meta.env.PROD ? '' : '/api'

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const message = error.response.data?.detail || 
                     error.response.data?.error || 
                     `Error ${error.response.status}`
      return Promise.reject(new Error(message))
    }
    return Promise.reject(error)
  }
)

export const api = {
  async get<T>(url: string): Promise<T> {
    const response = await axiosInstance.get<T>(url)
    return response.data
  },

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await axiosInstance.post<T>(url, data)
    return response.data
  }
}

export default axiosInstance
