import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

const baseURL = '/api-dev'

const service: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000
})

service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
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
  success: boolean
  message: string
  data: T
}

export interface Device {
  id: string
  name: string
  type: string
  ip?: string
  port?: number
  communicationType?: string
  slaveId?: number
  busType?: string
  connections?: Record<string, { busId: string; port: string }>
}

export interface DeviceType {
  type: string
  name: string
  description: string
  category: string
  communicationTypes: string[]
  properties: {
    telemetry: PropertyDef[]
    telesignal: PropertyDef[]
    telecontrol: PropertyDef[]
    teleadjust: PropertyDef[]
  }
}

export interface PropertyDef {
  key: string
  name: string
  unit: string
  default: any
  min?: number
  max?: number
}

export interface DeviceRuntime {
  deviceId: string
  telemetry: Record<string, any>
  telesignal: Record<string, number>
  telecontrol: Record<string, boolean>
  teleadjust: Record<string, any>
}

export interface Bus {
  id: string
  name: string
  type: string
  connectedDevices?: string[]
  parentBusId?: string
}

export interface Topology {
  id: string
  name: string
  description?: string
  buses: Record<string, Bus>
  devices: Record<string, Device>
  deviceList: string[]
}

export interface SimulatorStatus {
  running: boolean
  simulationTime: number
  stepIntervalMs: number
  simulatorConfig: SimulatorConfig
}

export interface SimulatorConfig {
  stepIntervalMs: number
  timeScale: number
  enabled: boolean
}

export const get = <T = unknown>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> => {
  return service.get(url, { params })
}

export const post = <T = unknown>(url: string, data?: unknown): Promise<ApiResponse<T>> => {
  return service.post(url, data)
}

export const put = <T = unknown>(url: string, data?: unknown): Promise<ApiResponse<T>> => {
  return service.put(url, data)
}

export const del = <T = unknown>(url: string): Promise<ApiResponse<T>> => {
  return service.delete(url)
}

export const deviceApi = {
  getAll: () => get<Device[]>('/devices'),
  get: (id: string) => get<Device>(`/devices/${id}`),
  create: (device: Device) => post<Device>('/devices', device),
  update: (id: string, device: Device) => put<Device>(`/devices/${id}`, device),
  delete: (id: string) => del(`/devices/${id}`),
  getRuntime: (id: string) => get<DeviceRuntime>(`/devices/${id}/runtime`),
  getAllRuntime: () => get<DeviceRuntime[]>('/devices/runtime')
}

export const deviceTypeApi = {
  getAll: () => get<DeviceType[]>('/device-types'),
  get: (type: string) => get<DeviceType>(`/device-types/${type}`)
}

export const topologyApi = {
  getAll: () => get<Topology[]>('/topologies'),
  get: (id: string) => get<Topology>(`/topologies/${id}`),
  create: (topology: Topology) => post<Topology>('/topologies', topology),
  update: (id: string, topology: Topology) => put<Topology>(`/topologies/${id}`, topology),
  delete: (id: string) => del(`/topologies/${id}`),
  addBus: (topologyId: string, bus: Bus) => post<Bus>(`/topologies/${topologyId}/buses`, bus),
  removeBus: (topologyId: string, busId: string) => del(`/topologies/${topologyId}/buses/${busId}`),
  connect: (topologyId: string, deviceId: string, busId: string) =>
    post(`/topologies/${topologyId}/connect?deviceId=${deviceId}&busId=${busId}`),
  disconnect: (topologyId: string, deviceId: string, busId: string) =>
    post(`/topologies/${topologyId}/disconnect?deviceId=${deviceId}&busId=${busId}`),
  addDevice: (topologyId: string, device: Device) => post<Device>(`/topologies/${topologyId}/devices`, device),
  removeDevice: (topologyId: string, deviceId: string) => del(`/topologies/${topologyId}/devices/${deviceId}`)
}

export const simulationApi = {
  getStatus: () => get<SimulatorStatus>('/simulation/status'),
  start: () => post('/simulation/start'),
  stop: () => post('/simulation/stop'),
  reset: () => post('/simulation/reset'),
  step: () => post<{ simulationTime: number; running: boolean }>('/simulation/step'),
  getConfig: () => get<SimulatorConfig>('/simulation/config'),
  updateConfig: (config: SimulatorConfig) => put<SimulatorConfig>('/simulation/config', config)
}

export default service