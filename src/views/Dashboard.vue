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
const currentSimulationTime = ref(0)
const currentSystemState = ref('')
const currentSubState = ref('')
const currentWeather = ref<{condition: string, irradiance: number, ambientTemp: number} | null>(null)

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
  for (const [deviceId, runtime] of deviceRuntimes.value) {
    const device = devices.value.find(d => d.id === deviceId)
    if (device && device.type === 'BMS') {
      const soc = (runtime.telemetry?.totalSOC as number ?? 0)
      return soc.toFixed(1)
    }
  }
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
  if (data.simulationTime !== undefined) {
    currentSimulationTime.value = data.simulationTime*1000
  }
  if (data.systemState) {
    currentSystemState.value = data.systemState
  }
  if (data.subState) {
    currentSubState.value = data.subState
  }
  if (data.weather) {
    currentWeather.value = data.weather
  }
}

const getDeviceStatusText = (deviceId: string): string => {
  const runtime = deviceRuntimes.value.get(deviceId)
  if (!runtime) return '离线'
  const hasPowerData = Object.entries(runtime.telemetry || {}).some(
    ([key, value]) => key.toLowerCase().includes('power') && (value as number) !== 0
  )
  return hasPowerData ? '运行中' : '待机'
}

const getDeviceStatusClass = (deviceId: string): string => {
  const runtime = deviceRuntimes.value.get(deviceId)
  if (!runtime) return 'status-offline'
  const hasPowerData = Object.entries(runtime.telemetry || {}).some(
    ([key, value]) => key.toLowerCase().includes('power') && (value as number) !== 0
  )
  return hasPowerData ? 'status-running' : 'status-standby'
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
      <div class="stat-card power">
        <div class="stat-icon power-icon">⚡</div>
        <div class="stat-content">
          <div class="stat-value">{{ totalActivePower }}</div>
          <div class="stat-label">总负载功率 (kW)</div>
        </div>
      </div>
      <div class="stat-card sun">
        <div class="stat-icon sun-icon">☀️</div>
        <div class="stat-content">
          <div class="stat-value">{{ totalGeneration }}</div>
          <div class="stat-label">光伏发电 (kW)</div>
        </div>
      </div>
      <div class="stat-card grid">
        <div class="stat-icon grid-icon">🔌</div>
        <div class="stat-content">
          <div :class="['stat-value', parseFloat(totalGridPower) > 0 ? 'text-danger' : parseFloat(totalGridPower) < 0 ? 'text-success' : '']">
            {{ totalGridPower }}
          </div>
          <div class="stat-label">电网功率 (kW)</div>
        </div>
      </div>
      <div class="stat-card battery">
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
            class="btn btn-start"
            @click="startSimulation"
          >
            启动
          </button>
          <button
            v-else
            class="btn btn-stop"
            @click="stopSimulation"
          >
            停止
          </button>
          <button
            class="btn btn-step"
            @click="stepSimulation"
            :disabled="simulatorStatus?.running"
          >
            单步
          </button>
          <button
            class="btn btn-reset"
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
            <span class="status-value">{{ formatTime(currentSimulationTime) }}</span>
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
              <span class="info-value">{{ getTelemetryValue(device.id, 'totalSOC', '%', 1) }}</span>
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
            <template v-if="device.type === 'BUS'">
              <div class="info-row" v-if="device.busType === 'AC'">
                <span class="info-label">电压:</span>
                <span class="info-value">{{ getTelemetryValue(device.id, 'voltage', 'V', 1) }}</span>
              </div>
              <div class="info-row" v-if="device.busType === 'AC'">
                <span class="info-label">电流:</span>
                <span class="info-value">{{ getTelemetryValue(device.id, 'current', 'A', 1) }}</span>
              </div>
              <div class="info-row" v-if="device.busType === 'AC'">
                <span class="info-label">有功功率:</span>
                <span class="info-value">{{ getTelemetryValue(device.id, 'activePower', 'kW', 10) }}</span>
              </div>
              <div class="info-row" v-if="device.busType === 'DC'">
                <span class="info-label">电压:</span>
                <span class="info-value">{{ getTelemetryValue(device.id, 'voltage', 'V', 1) }}</span>
              </div>
              <div class="info-row" v-if="device.busType === 'DC'">
                <span class="info-label">电流:</span>
                <span class="info-value">{{ getTelemetryValue(device.id, 'current', 'A', 1) }}</span>
              </div>
              <div class="info-row" v-if="device.busType === 'DC'">
                <span class="info-label">功率:</span>
                <span class="info-value">{{ getTelemetryValue(device.id, 'activePower', 'kW', 10) }}</span>
              </div>
            </template>
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
  padding: 1.5rem;
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0e17 0%, #1a1f2e 50%, #0d1117 100%);
}

.page-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: #e6edf3;
  margin-bottom: 1.5rem;
  letter-spacing: -0.02em;
}

.error-message {
  background: linear-gradient(135deg, rgba(255, 77, 79, 0.15) 0%, rgba(255, 77, 79, 0.05) 100%);
  border: 1px solid rgba(255, 77, 79, 0.3);
  color: #ff7875;
  padding: 0.875rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.25rem;
  font-size: 0.9rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  background: linear-gradient(145deg, rgba(30, 35, 50, 0.9) 0%, rgba(20, 25, 38, 0.95) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  backdrop-filter: blur(10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
}

.stat-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.stat-card.power {
  background: linear-gradient(145deg, rgba(255, 184, 77, 0.12) 0%, rgba(255, 184, 77, 0.04) 100%);
}
.stat-card.power .stat-icon { color: #ffb84d; }

.stat-card.sun {
  background: linear-gradient(145deg, rgba(255, 193, 7, 0.12) 0%, rgba(255, 193, 7, 0.04) 100%);
}
.stat-card.sun .stat-icon { color: #ffd666; }

.stat-card.grid {
  background: linear-gradient(145deg, rgba(82, 196, 26, 0.12) 0%, rgba(82, 196, 26, 0.04) 100%);
}
.stat-card.grid .stat-icon { color: #73d13d; }

.stat-card.battery {
  background: linear-gradient(145deg, rgba(24, 144, 255, 0.12) 0%, rgba(24, 144, 255, 0.04) 100%);
}
.stat-card.battery .stat-icon { color: #40a9ff; }

.stat-icon {
  font-size: 2rem;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #e6edf3;
  margin-bottom: 0.25rem;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 0.8rem;
  color: #8b949e;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.control-panel {
  background: linear-gradient(145deg, rgba(30, 35, 50, 0.8) 0%, rgba(20, 25, 38, 0.9) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 1.25rem;
  border-radius: 16px;
  margin-bottom: 1.5rem;
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 1024px) {
  .control-panel {
    grid-template-columns: 1fr;
  }
}

.control-section {
  display: flex;
  flex-direction: column;
}

.control-section h3 {
  font-size: 0.75rem;
  font-weight: 600;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.75rem;
}

.topology-select {
  position: relative;
}

.select {
  width: 100%;
  padding: 0.625rem 1rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #e6edf3;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238b949e' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  padding-right: 2.5rem;
}

.select:focus {
  outline: none;
  border-color: rgba(24, 144, 255, 0.5);
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
}

.select option {
  background: #1c2128;
  color: #e6edf3;
}

.topology-info {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: #6e7681;
  line-height: 1.4;
}

.button-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.btn {
  position: relative;
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.2s;
}

.btn:hover::before {
  opacity: 1;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
}

.btn-start {
  background: linear-gradient(135deg, #238636 0%, #2ea043 100%);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(35, 134, 54, 0.3);
}

.btn-start:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(35, 134, 54, 0.4);
}

.btn-stop {
  background: linear-gradient(135deg, #da3633 0%, #f85149 100%);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(218, 54, 51, 0.3);
}

.btn-stop:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(218, 54, 51, 0.4);
}

.btn-step {
  background: linear-gradient(135deg, #1f6feb 0%, #388bfd 100%);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(31, 111, 235, 0.3);
}

.btn-step:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(31, 111, 235, 0.4);
}

.btn-reset {
  background: linear-gradient(135deg, #6e40c9 0%, #8957e5 100%);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(110, 64, 201, 0.3);
}

.btn-reset:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(110, 64, 201, 0.4);
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.375rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.status-item:last-child {
  border-bottom: none;
}

.status-label {
  font-size: 0.8rem;
  color: #6e7681;
}

.status-value {
  font-size: 0.8rem;
  color: #e6edf3;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.text-success {
  color: #3fb950;
}

.text-secondary {
  color: #6e7681;
}

.text-danger {
  color: #f85149;
}

.devices-section {
  background: linear-gradient(145deg, rgba(30, 35, 50, 0.6) 0%, rgba(20, 25, 38, 0.8) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 1.25rem;
  border-radius: 16px;
}

.devices-section h2 {
  font-size: 1rem;
  font-weight: 600;
  color: #e6edf3;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.devices-section h2::before {
  content: '';
  width: 3px;
  height: 1rem;
  background: linear-gradient(180deg, #58a6ff, #1f6feb);
  border-radius: 2px;
}

.loading,
.empty-message {
  text-align: center;
  padding: 3rem;
  color: #6e7681;
  font-size: 0.9rem;
}

.device-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.device-card {
  background: linear-gradient(145deg, rgba(40, 45, 60, 0.6) 0%, rgba(30, 35, 50, 0.4) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 1rem;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.device-card:hover {
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.device-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.875rem;
  padding-bottom: 0.875rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.device-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: #e6edf3;
}

.device-status {
  font-size: 0.7rem;
  padding: 0.25rem 0.625rem;
  border-radius: 20px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.status-running {
  background: linear-gradient(135deg, rgba(63, 185, 80, 0.2) 0%, rgba(63, 185, 80, 0.1) 100%);
  color: #3fb950;
  border: 1px solid rgba(63, 185, 80, 0.3);
}

.status-standby {
  background: linear-gradient(135deg, rgba(255, 184, 77, 0.2) 0%, rgba(255, 184, 77, 0.1) 100%);
  color: #ffb84d;
  border: 1px solid rgba(255, 184, 77, 0.3);
}

.status-offline {
  background: linear-gradient(135deg, rgba(248, 81, 73, 0.2) 0%, rgba(248, 81, 73, 0.1) 100%);
  color: #f85149;
  border: 1px solid rgba(248, 81, 73, 0.3);
}

.device-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  padding: 0.25rem 0;
}

.info-label {
  color: #6e7681;
}

.info-value {
  color: #c9d1d9;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
</style>