<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { topologyApi, deviceApi, type Topology, type Bus, type Device } from '@/api'

const topologies = ref<Topology[]>([])
const devices = ref<Device[]>([])
const selectedTopology = ref<Topology | null>(null)
const loading = ref(false)
const error = ref('')
const showTopologyModal = ref(false)
const showBusModal = ref(false)
const topologyMode = ref<'add' | 'edit'>('add')

const currentTopology = ref<Topology>({
  id: '',
  name: '',
  description: '',
  buses: {},
  devices: {},
  deviceList: []
})

const currentBus = ref<Bus>({
  id: '',
  name: '',
  type: 'AC'
})

const busTypes = [
  { value: 'AC', label: '交流母线' },
  { value: 'DC', label: '直流母线' }
]

const loadTopologies = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await topologyApi.getAll()
    topologies.value = response.data || []
    if (topologies.value.length > 0) {
      selectedTopology.value = topologies.value[0]
    }
  } catch (e) {
    error.value = '加载拓扑列表失败'
    console.error(e)
  } finally {
    loading.value = false
  }
}

const loadDevices = async () => {
  try {
    const response = await deviceApi.getAll()
    devices.value = response.data || []
  } catch (e) {
    console.error('加载设备列表失败', e)
  }
}

const selectTopology = (topology: Topology) => {
  selectedTopology.value = topology
}

const openAddTopologyModal = () => {
  topologyMode.value = 'add'
  currentTopology.value = {
    id: '',
    name: '',
    description: '',
    buses: {},
    devices: {},
    deviceList: []
  }
  showTopologyModal.value = true
}

const openEditTopologyModal = () => {
  if (!selectedTopology.value) return
  topologyMode.value = 'edit'
  currentTopology.value = JSON.parse(JSON.stringify(selectedTopology.value))
  showTopologyModal.value = true
}

const closeTopologyModal = () => {
  showTopologyModal.value = false
}

const saveTopology = async () => {
  try {
    if (topologyMode.value === 'add') {
      await topologyApi.create(currentTopology.value)
    } else {
      await topologyApi.update(currentTopology.value.id, currentTopology.value)
    }
    await loadTopologies()
    closeTopologyModal()
  } catch (e) {
    error.value = topologyMode.value === 'add' ? '创建拓扑失败' : '更新拓扑失败'
    console.error(e)
  }
}

const deleteTopology = async () => {
  if (!selectedTopology.value) return
  if (!confirm('确定要删除该拓扑吗？')) return
  try {
    await topologyApi.delete(selectedTopology.value.id)
    selectedTopology.value = null
    await loadTopologies()
  } catch (e) {
    error.value = '删除拓扑失败'
    console.error(e)
  }
}

const openAddBusModal = () => {
  currentBus.value = {
    id: '',
    name: '',
    type: 'AC'
  }
  showBusModal.value = true
}

const closeBusModal = () => {
  showBusModal.value = false
}

const saveBus = async () => {
  if (!selectedTopology.value) return
  try {
    await topologyApi.addBus(selectedTopology.value.id, currentBus.value)
    await loadTopologies()
    closeBusModal()
  } catch (e) {
    error.value = '添加母线失败'
    console.error(e)
  }
}

const deleteBus = async (busId: string) => {
  if (!selectedTopology.value) return
  if (!confirm('确定要删除该母线吗？')) return
  try {
    await topologyApi.removeBus(selectedTopology.value.id, busId)
    await loadTopologies()
  } catch (e) {
    error.value = '删除母线失败'
    console.error(e)
  }
}

const connectDevice = async (deviceId: string, busId: string) => {
  if (!selectedTopology.value) return
  try {
    await topologyApi.connect(selectedTopology.value.id, deviceId, busId)
    await loadTopologies()
  } catch (e) {
    error.value = '连接设备失败'
    console.error(e)
  }
}

const disconnectDevice = async (deviceId: string, busId: string) => {
  if (!selectedTopology.value) return
  try {
    await topologyApi.disconnect(selectedTopology.value.id, deviceId, busId)
    await loadTopologies()
  } catch (e) {
    error.value = '断开设备失败'
    console.error(e)
  }
}

const getDevicesForBus = computed(() => {
  if (!selectedTopology.value) return []
  const busDevices: Device[] = []
  selectedTopology.value.deviceList.forEach(deviceId => {
    const device = selectedTopology.value!.devices[deviceId]
    if (device) {
      const connections = device.connections || {}
      const isConnected = Object.values(connections).some(
        conn => conn && conn.busId
      )
      if (isConnected) {
        busDevices.push(device)
      }
    }
  })
  return busDevices
})

const getAvailableDevices = computed(() => {
  if (!selectedTopology.value) return devices.value
  return devices.value.filter(d => !selectedTopology.value?.deviceList.includes(d.id))
})

onMounted(async () => {
  await loadTopologies()
  await loadDevices()
})
</script>

<template>
  <div class="topology-page">
    <h1 class="page-title">拓扑管理</h1>

    <div v-if="error" class="error-message">{{ error }}</div>

    <div class="layout">
      <aside class="sidebar">
        <div class="sidebar-header">
          <h3>拓扑列表</h3>
          <button class="btn btn-small btn-primary" @click="openAddTopologyModal">
            新建
          </button>
        </div>
        <div v-if="loading" class="loading">加载中...</div>
        <ul v-else class="topology-list">
          <li
            v-for="topology in topologies"
            :key="topology.id"
            :class="['topology-item', selectedTopology?.id === topology.id ? 'active' : '']"
            @click="selectTopology(topology)"
          >
            <span class="topology-name">{{ topology.name }}</span>
          </li>
        </ul>
      </aside>

      <main class="main-content">
        <div v-if="!selectedTopology" class="empty-state">
          <p>请从左侧选择一个拓扑，或创建新拓扑</p>
        </div>
        <template v-else>
          <div class="content-header">
            <div>
              <h2>{{ selectedTopology.name }}</h2>
              <p class="topology-description">{{ selectedTopology.description || '无描述' }}</p>
            </div>
            <div class="content-actions">
              <button class="btn btn-primary" @click="openAddBusModal">添加母线</button>
              <button class="btn btn-secondary" @click="openEditTopologyModal">编辑</button>
              <button class="btn btn-danger" @click="deleteTopology">删除</button>
            </div>
          </div>

          <div class="buses-section">
            <h3>母线管理</h3>
            <div v-if="Object.keys(selectedTopology.buses).length === 0" class="empty-message">
              暂无母线
            </div>
            <div v-else class="bus-grid">
              <div
                v-for="(bus, busId) in selectedTopology.buses"
                :key="busId"
                :class="['bus-card', bus.type === 'AC' ? 'bus-ac' : 'bus-dc']"
              >
                <div class="bus-header">
                  <span class="bus-name">{{ bus.name }}</span>
                  <span class="bus-type">{{ bus.type === 'AC' ? '交流' : '直流' }}</span>
                </div>
                <div class="bus-devices">
                  <div
                    v-for="deviceId in bus.connectedDevices"
                    :key="deviceId"
                    class="connected-device"
                  >
                    <span>{{ selectedTopology.devices[deviceId]?.name || deviceId }}</span>
                    <button
                      class="btn btn-small btn-danger"
                      @click="disconnectDevice(deviceId, busId)"
                    >
                      断开
                    </button>
                  </div>
                </div>
                <div class="bus-actions">
                  <select
                    class="select-small"
                    @change="(e) => {
                      const target = e.target as HTMLSelectElement
                      if (target.value) connectDevice(target.value, busId)
                    }"
                  >
                    <option value="">连接设备...</option>
                    <option
                      v-for="device in getAvailableDevices"
                      :key="device.id"
                      :value="device.id"
                    >
                      {{ device.name }}
                    </option>
                  </select>
                  <button class="btn btn-small btn-danger" @click="deleteBus(busId)">
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </main>
    </div>

    <div v-if="showTopologyModal" class="modal-overlay" @click.self="closeTopologyModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ topologyMode === 'add' ? '创建拓扑' : '编辑拓扑' }}</h2>
          <button class="modal-close" @click="closeTopologyModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">拓扑名称</label>
            <input
              v-model="currentTopology.name"
              type="text"
              class="input"
              placeholder="请输入拓扑名称"
            />
          </div>
          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea
              v-model="currentTopology.description"
              class="textarea"
              placeholder="请输入描述"
              rows="3"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeTopologyModal">取消</button>
          <button class="btn btn-primary" @click="saveTopology">保存</button>
        </div>
      </div>
    </div>

    <div v-if="showBusModal" class="modal-overlay" @click.self="closeBusModal">
      <div class="modal">
        <div class="modal-header">
          <h2>添加母线</h2>
          <button class="modal-close" @click="closeBusModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">母线名称</label>
            <input
              v-model="currentBus.name"
              type="text"
              class="input"
              placeholder="请输入母线名称"
            />
          </div>
          <div class="form-group">
            <label class="form-label">母线类型</label>
            <select v-model="currentBus.type" class="select">
              <option v-for="bt in busTypes" :key="bt.value" :value="bt.value">
                {{ bt.label }}
              </option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeBusModal">取消</button>
          <button class="btn btn-primary" @click="saveBus">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.topology-page {
  padding: 1.5rem;
  min-height: calc(100vh - 80px);
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #e6edf3;
  margin-bottom: 1.5rem;
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

.layout {
  display: flex;
  gap: 1rem;
  height: calc(100vh - 180px);
}

.sidebar {
  width: 280px;
  background: linear-gradient(145deg, rgba(30, 35, 50, 0.8) 0%, rgba(20, 25, 38, 0.9) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 1rem;
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.sidebar-header h3 {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.topology-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.topology-item {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 0.5rem;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.topology-item:hover {
  background: rgba(255, 255, 255, 0.04);
}

.topology-item.active {
  background: linear-gradient(135deg, rgba(31, 111, 235, 0.2) 0%, rgba(31, 111, 235, 0.08) 100%);
  border-color: rgba(31, 111, 235, 0.3);
}

.topology-name {
  font-weight: 500;
  color: #e6edf3;
  font-size: 0.9rem;
}

.topology-item.active .topology-name {
  color: #58a6ff;
}

.main-content {
  flex: 1;
  background: linear-gradient(145deg, rgba(30, 35, 50, 0.6) 0%, rgba(20, 25, 38, 0.8) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 1.5rem;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6e7681;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.content-header h2 {
  margin: 0 0 0.5rem 0;
  color: #e6edf3;
  font-size: 1.25rem;
}

.topology-description {
  color: #6e7681;
  margin: 0;
  font-size: 0.875rem;
}

.content-actions {
  display: flex;
  gap: 0.5rem;
}

.buses-section h3 {
  margin-bottom: 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.bus-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

.bus-card {
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 1rem;
  background: rgba(40, 45, 60, 0.4);
  transition: all 0.25s;
}

.bus-card:hover {
  border-color: rgba(255, 255, 255, 0.1);
}

.bus-ac {
  border-left: 3px solid #ffb84d;
}

.bus-dc {
  border-left: 3px solid #40a9ff;
}

.bus-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.bus-name {
  font-weight: 600;
  color: #e6edf3;
}

.bus-type {
  font-size: 0.7rem;
  padding: 0.25rem 0.625rem;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  color: #8b949e;
  font-weight: 600;
}

.bus-devices {
  margin-bottom: 1rem;
  min-height: 40px;
}

.connected-device {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  margin-bottom: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.connected-device span {
  color: #c9d1d9;
  font-size: 0.85rem;
}

.bus-actions {
  display: flex;
  gap: 0.5rem;
}

.loading,
.empty-message {
  text-align: center;
  padding: 2rem;
  color: #6e7681;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal {
  background: linear-gradient(145deg, #1c2128 0%, #161b22 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #e6edf3;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6e7681;
  transition: color 0.2s;
}

.modal-close:hover {
  color: #e6edf3;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #8b949e;
  font-size: 0.85rem;
}

.input,
.select,
.textarea {
  width: 100%;
  padding: 0.625rem 0.875rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-size: 0.875rem;
  box-sizing: border-box;
  color: #e6edf3;
  transition: all 0.2s;
}

.textarea {
  resize: vertical;
}

.input:focus,
.select:focus,
.textarea:focus {
  outline: none;
  border-color: rgba(24, 144, 255, 0.5);
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
}

.input::placeholder {
  color: #484f58;
}

.select-small {
  padding: 0.375rem 0.5rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-size: 0.8rem;
  flex: 1;
  color: #e6edf3;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #1f6feb 0%, #388bfd 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(31, 111, 235, 0.25);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(31, 111, 235, 0.35);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.06);
  color: #c9d1d9;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #e6edf3;
}

.btn-danger {
  background: linear-gradient(135deg, #da3633 0%, #f85149 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(218, 54, 51, 0.25);
}

.btn-danger:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(218, 54, 51, 0.35);
}

.btn-small {
  padding: 0.3rem 0.6rem;
  font-size: 0.75rem;
}
</style>