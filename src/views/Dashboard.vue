<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { simulationApi, topologyApi, deviceApi, type Topology, type Device, type SimulatorStatus, type DeviceRuntime } from '@/api'
import { wsManager } from '@/api/wsManager'

const topologies = ref<Topology[]>([])
const selectedTopologyId = ref<string>('')
const devices = ref<Device[]>([])
const deviceRuntimes = ref<Map<string, DeviceRuntime>>(new Map())
const simulatorStatus = ref<SimulatorStatus | null>(null)
const busPowers = ref<Map<string, number>>(new Map())
const busVoltages = ref<Map<string, number>>(new Map())

const loading = ref(false)
const error = ref('')
const wsConnected = ref(false)

let unsubDeviceUpdate: (() => void) | null = null

const selectedTopology = computed(() => {
  return topologies.value.find(t => t.id === selectedTopologyId.value)
})

const totalActivePower = computed(() => {
  let total = 0
  deviceRuntimes.value.forEach((runtime, deviceId) => {
    const device = devices.value.find(d => d.id === deviceId)
    if (device && (device.type === 'AC_LOAD' || device.type === 'DC_LOAD')) {
      const power = (runtime.telemetry?.activePower as number ?? 0) / 10
      total += Math.abs(power)
    }
  })
  return total.toFixed(2)
})

const totalGeneration = computed(() => {
  let total = 0
  deviceRuntimes.value.forEach((runtime, deviceId) => {
    const device = devices.value.find(d => d.id === deviceId)
    if (device && device.type === 'MPPT') {
      for (let i = 1; i <= 4; i++) {
        total += ((runtime.telemetry?.[`pv${i}Power`] as number) ?? 0) / 10
      }
    }
  })
  return total.toFixed(2)
})

const totalGridPower = computed(() => {
  let gridPower = 0
  deviceRuntimes.value.forEach((runtime, deviceId) => {
    const device = devices.value.find(d => d.id === deviceId)
    if (device && device.type === 'METER_PREVENT_BACKFLOW') {
      gridPower = (runtime.telemetry?.instantPower as number ?? 0) / 10
    }
  })
  return gridPower.toFixed(2)
})

const batterySOC = computed(() => {
  deviceRuntimes.value.forEach((runtime, deviceId) => {
    const device = devices.value.find(d => d.id === deviceId)
    if (device && device.type === 'BMS') {
      const soc = (runtime.telemetry?.totalSOC as number ?? 0) / 10
      return soc.toFixed(1)
    }
  })
  return '--'
})

const loadTopologies = async () => {
  try {
    const response = await topologyApi.getAll()
    topologies.value = response.data || []
    if (topologies.value.length > 0 && !selectedTopologyId.value) {
      selectedTopologyId.value = topologies.value[0].id
    }
  } catch (e) {
    error.value = '加载拓扑列表失败'
    console.error(e)
  }
}

const loadDevices = async () => {
  if (!selectedTopologyId.value) return
  try {
    const response = await deviceApi.getAll()
    devices.value = (response.data || []).filter(d => {
      return selectedTopology.value?.deviceList.includes(d.id)
    })
  } catch (e) {
    console.error('加载设备列表失败', e)
  }
}

const loadDeviceRuntimes = async () => {
  try {
    const response = await deviceApi.getAllRuntime()
    const runtimes = response.data || []
    runtimes.forEach((runtime: DeviceRuntime) => {
      deviceRuntimes.value.set(runtime.deviceId, runtime)
    })
  } catch (e) {
    console.error('加载设备状态失败', e)
  }
}

const loadSimulatorStatus = async () => {
  try {
    const response = await simulationApi.getStatus()
    simulatorStatus.value = response.data
  } catch (e) {
    console.error('加载模拟器状态失败', e)
  }
}

const startSimulation = async () => {
  try {
    await simulationApi.start()
    await loadSimulatorStatus()
  } catch (e) {
    error.value = '启动模拟器失败'
    console.error(e)
  }
}

const stopSimulation = async () => {
  try {
    await simulationApi.stop()
    await loadSimulatorStatus()
  } catch (e) {
    error.value = '停止模拟器失败'
    console.error(e)
  }
}

const stepSimulation = async () => {
  try {
    await simulationApi.step()
    await loadSimulatorStatus()
    await loadDeviceRuntimes()
  } catch (e) {
    error.value = '单步执行失败'
    console.error(e)
  }
}

const resetSimulation = async () => {
  try {
    await simulationApi.reset()
    await loadSimulatorStatus()
  } catch (e) {
    error.value = '重置模拟器失败'
    console.error(e)
  }
}

const handleDeviceUpdates = (data: Record<string, any>) => {
  if (data.devices) {
    Object.entries(data.devices).forEach(([deviceId, runtime]) => {
      deviceRuntimes.value.set(deviceId, runtime as DeviceRuntime)
    })
  }
  if (data.busPowers) {
    busPowers.value = new Map(Object.entries(data.busPowers))
  }
  if (data.busVoltages) {
    busVoltages.value = new Map(Object.entries(data.busVoltages))
  }
}

const getDeviceStatusText = (deviceId: string): string => {
  const runtime = deviceRuntimes.value.get(deviceId)
  if (!runtime) return '离线'
  const running = runtime.telesignal?.running ?? 0
  return running === 1 ? '运行中' : '待机'
}

const getDeviceStatusClass = (deviceId: string): string => {
  const runtime = deviceRuntimes.value.get(deviceId)
  if (!runtime) return 'status-offline'
  const running = runtime.telesignal?.running ?? 0
  return running === 1 ? 'status-running' : 'status-standby'
}

const getTelemetryValue = (deviceId: string, key: string, unit: string = '', factor: number = 1): string => {
  const runtime = deviceRuntimes.value.get(deviceId)
  if (!runtime) return '--'
  const value = runtime.telemetry?.[key] as number ?? 0
  const formatted = (value / factor).toFixed(2)
  return `${formatted} ${unit}`.trim()
}

const formatTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}

const connectWebSocket = async () => {
  try {
    await wsManager.connect()
    wsConnected.value = wsManager.isConnected()
    unsubDeviceUpdate = wsManager.onDeviceUpdate(handleDeviceUpdates)
  } catch (e) {
    console.error('Failed to connect WebSocket:', e)
    wsConnected.value = false
  }
}

onMounted(async () => {
  loading.value = true
  await loadTopologies()
  await loadDevices()
  await loadSimulatorStatus()
  await loadDeviceRuntimes()
  await connectWebSocket()
  loading.value = false
})

onUnmounted(() => {
  if (unsubDeviceUpdate) {
    unsubDeviceUpdate()
    unsubDeviceUpdate = null
  }
})
</script>

<template>
  <div class="dashboard">
    <h1 class="page-title">仪表盘</h1>

    <div v-if="error" class="error-message">{{ error }}</div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon power-icon">⚡</div>
        <div class="stat-content">
          <div class="stat-value">{{ totalActivePower }}</div>
          <div class="stat-label">总负载功率 (kW)</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon sun-icon">☀️</div>
        <div class="stat-content">
          <div class="stat-value">{{ totalGeneration }}</div>
          <div class="stat-label">光伏发电 (kW)</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon grid-icon">🔌</div>
        <div class="stat-content">
          <div :class="['stat-value', parseFloat(totalGridPower) > 0 ? 'text-danger' : parseFloat(totalGridPower) < 0 ? 'text-success' : '']">
            {{ totalGridPower }}
          </div>
          <div class="stat-label">电网功率 (kW)</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon battery-icon">🔋</div>
        <div class="stat-content">
          <div class="stat-value">{{ batterySOC }}</div>
          <div class="stat-label">电池SOC (%)</div>
        </div>
      </div>
    </div>

    <div class="control-panel">
      <div class="control-section">
        <h3>拓扑选择</h3>
        <select v-model="selectedTopologyId" class="select" @change="loadDevices">
          <option v-for="topology in topologies" :key="topology.id" :value="topology.id">
            {{ topology.name }}
          </option>
        </select>
        <span v-if="selectedTopology" class="topology-info">
          {{ selectedTopology.description || '无描述' }}
        </span>
      </div>

      <div class="control-section">
        <h3>模拟控制</h3>
        <div class="button-group">
          <button
            v-if="!simulatorStatus?.running"
            class="btn btn-success"
            @click="startSimulation"
          >
            启动
          </button>
          <button
            v-else
            class="btn btn-danger"
            @click="stopSimulation"
          >
            停止
          </button>
          <button
            class="btn btn-primary"
            @click="stepSimulation"
            :disabled="simulatorStatus?.running"
          >
            单步
          </button>
          <button
            class="btn btn-warning"
            @click="resetSimulation"
          >
            重置
          </button>
        </div>
      </div>

      <div class="control-section">
        <h3>模拟状态</h3>
        <div class="status-info">
          <div class="status-item">
            <span class="status-label">运行状态:</span>
            <span :class="['status-value', simulatorStatus?.running ? 'text-success' : 'text-secondary']">
              {{ simulatorStatus?.running ? '运行中' : '已停止' }}
            </span>
          </div>
          <div class="status-item">
            <span class="status-label">模拟时间:</span>
            <span class="status-value">{{ formatTime(simulatorStatus?.simulationTime || 0) }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">步进间隔:</span>
            <span class="status-value">{{ simulatorStatus?.stepIntervalMs || 1000 }} ms</span>
          </div>
          <div class="status-item">
            <span class="status-label">实时连接:</span>
            <span :class="['status-value', wsConnected ? 'text-success' : 'text-danger']">
              {{ wsConnected ? '已连接' : '未连接' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="devices-section">
      <h2>设备状态监控</h2>
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="devices.length === 0" class="empty-message">
        暂无可监控设备
      </div>
      <div v-else class="device-grid">
        <div
          v-for="device in devices"
          :key="device.id"
          class="device-card"
        >
          <div class="device-header">
            <span class="device-name">{{ device.name }}</span>
            <span :class="['device-status', getDeviceStatusClass(device.id)]">
              {{ getDeviceStatusText(device.id) }}
            </span>
          </div>
          <div class="device-info">
            <div class="info-row">
              <span class="info-label">类型:</span>
              <span class="info-value">{{ device.type }}</span>
            </div>
            <div class="info-row" v-if="device.type === 'PCS'">
              <span class="info-label">有功:</span>
              <span class="info-value">{{ getTelemetryValue(device.id, 'activePower', 'kW', 10) }}</span>
            </div>
            <div class="info-row" v-if="device.type === 'PCS'">
              <span class="info-label">无功:</span>
              <span class="info-value">{{ getTelemetryValue(device.id, 'reactivePower', 'kVar', 10) }}</span>
            </div>
            <div class="info-row" v-if="device.type === 'PCS'">
              <span class="info-label">频率:</span>
              <span class="info-value">{{ getTelemetryValue(device.id, 'acFrequency', 'Hz', 100) }}</span>
            </div>
            <div class="info-row" v-if="device.type === 'MPPT'">
              <span class="info-label">PV功率:</span>
              <span class="info-value">{{ getTelemetryValue(device.id, 'pv1Power', 'kW', 10) }}</span>
            </div>
            <div class="info-row" v-if="device.type === 'MPPT'">
              <span class="info-label">高压侧:</span>
              <span class="info-value">{{ getTelemetryValue(device.id, 'hvVoltage', 'V', 10) }}</span>
            </div>
            <div class="info-row" v-if="device.type === 'DCDC'">
              <span class="info-label">电池功率:</span>
              <span class="info-value">{{ getTelemetryValue(device.id, 'batteryPower', 'kW', 10) }}</span>
            </div>
            <div class="info-row" v-if="device.type === 'DCDC'">
              <span class="info-label">电池电压:</span>
              <span class="info-value">{{ getTelemetryValue(device.id, 'batteryVoltage', 'V', 10) }}</span>
            </div>
            <div class="info-row" v-if="device.type === 'BMS'">
              <span class="info-label">SOC:</span>
              <span class="info-value">{{ getTelemetryValue(device.id, 'totalSOC', '%', 10) }}</span>
            </div>
            <div class="info-row" v-if="device.type === 'BMS'">
              <span class="info-label">电压:</span>
              <span class="info-value">{{ getTelemetryValue(device.id, 'clusterVoltage', 'V', 10) }}</span>
            </div>
            <div class="info-row" v-if="device.type === 'AC_LOAD' || device.type === 'DC_LOAD'">
              <span class="info-label">有功:</span>
              <span class="info-value">{{ getTelemetryValue(device.id, 'activePower', 'kW', 10) }}</span>
            </div>
            <div class="info-row" v-if="device.type === 'AC_LOAD'">
              <span class="info-label">无功:</span>
              <span class="info-value">{{ getTelemetryValue(device.id, 'reactivePower', 'kVar', 10) }}</span>
            </div>
            <div class="info-row" v-if="device.type === 'METER_PREVENT_BACKFLOW'">
              <span class="info-label">瞬时功率:</span>
              <span class="info-value">{{ getTelemetryValue(device.id, 'instantPower', 'kW', 10) }}</span>
            </div>
            <div class="info-row" v-if="device.type === 'METER_PREVENT_BACKFLOW'">
              <span class="info-label">正向电量:</span>
              <span class="info-value">{{ getTelemetryValue(device.id, 'forwardEnergy', 'kWh', 1) }}</span>
            </div>
            <div class="info-row" v-if="device.ip">
              <span class="info-label">地址:</span>
              <span class="info-value">{{ device.ip }}:{{ device.port }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 1rem;
}

.page-title {
  margin-bottom: 1.5rem;
}

.error-message {
  background-color: #fee;
  color: #c33;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  color: white;
}

.stat-icon {
  font-size: 2.5rem;
  opacity: 0.9;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  opacity: 0.9;
}

.control-panel {
  background: #f5f5f5;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.control-section {
  flex: 1;
  min-width: 250px;
}

.control-section h3 {
  margin-bottom: 1rem;
  color: #333;
}

.topology-info {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #666;
}

.button-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.status-item {
  display: flex;
  gap: 0.5rem;
}

.status-label {
  font-weight: 500;
  color: #666;
}

.status-value {
  color: #333;
}

.text-success {
  color: #52c41a;
}

.text-secondary {
  color: #999;
}

.text-danger {
  color: #ff4d4f;
}

.devices-section {
  background: #fff;
  padding: 1.5rem;
  border-radius: 8px;
}

.devices-section h2 {
  margin-bottom: 1rem;
}

.loading,
.empty-message {
  text-align: center;
  padding: 2rem;
  color: #999;
}

.device-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.device-card {
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 1rem;
}

.device-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #eee;
}

.device-name {
  font-weight: 600;
  font-size: 1rem;
}

.device-status {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.status-running {
  background: #d4edda;
  color: #155724;
}

.status-standby {
  background: #fff3cd;
  color: #856404;
}

.status-offline {
  background: #f8d7da;
  color: #721c24;
}

.device-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.info-label {
  color: #666;
}

.info-value {
  color: #333;
  font-weight: 500;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #1890ff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #40a9ff;
}

.btn-success {
  background-color: #52c41a;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background-color: #73d13d;
}

.btn-danger {
  background-color: #ff4d4f;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #ff7875;
}

.btn-warning {
  background-color: #faad14;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background-color: #ffc53d;
}

.select {
  padding: 0.5rem;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 0.875rem;
  min-width: 200px;
}
</style>