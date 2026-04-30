import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'

const baseURL = '/api-dev'

const service: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000
})

service.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

service.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data
  },
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export const get = <T = unknown>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> => {
  return service.get(url, { params })
}

export const post = <T = unknown>(url: string, data?: Record<string, unknown>): Promise<ApiResponse<T>> => {
  return service.post(url, data)
}

export const put = <T = unknown>(url: string, data?: Record<string, unknown>): Promise<ApiResponse<T>> => {
  return service.put(url, data)
}

export const del = <T = unknown>(url: string): Promise<ApiResponse<T>> => {
  return service.delete(url)
}

export default service