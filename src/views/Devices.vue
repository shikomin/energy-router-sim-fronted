<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { deviceApi, deviceTypeApi, type Device, type DeviceType } from '@/api'

const devices = ref<Device[]>([])
const deviceTypes = ref<DeviceType[]>([])
const loading = ref(false)
const error = ref('')
const showModal = ref(false)
const modalMode = ref<'add' | 'edit'>('add')
const currentDevice = ref<Device>({
  id: '',
  name: '',
  type: '',
  ip: '',
  port: 502,
  communicationType: 'Modbus-TCP',
  slaveId: 1,
  deviceLocalNum: ''
})

const loadDevices = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await deviceApi.getAll()
    devices.value = response.data || []
  } catch (e) {
    error.value = '加载设备列表失败'
    console.error(e)
  } finally {
    loading.value = false
  }
}

const loadDeviceTypes = async () => {
  try {
    const response = await deviceTypeApi.getAll()
    deviceTypes.value = response.data || []
  } catch (e) {
    console.error('加载设备类型失败', e)
  }
}

const openAddModal = () => {
  modalMode.value = 'add'
  currentDevice.value = {
    id: '',
    name: '',
    type: '',
    ip: '',
    port: 502,
    communicationType: 'Modbus-TCP',
    slaveId: 1,
    deviceLocalNum: ''
  }
  showModal.value = true
}

const openEditModal = (device: Device) => {
  modalMode.value = 'edit'
  currentDevice.value = { ...device }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  currentDevice.value = {
    id: '',
    name: '',
    type: '',
    ip: '',
    port: 502,
    communicationType: 'Modbus-TCP',
    slaveId: 1,
    deviceLocalNum: ''
  }
}

const saveDevice = async () => {
  if (!currentDevice.value.id.trim()) {
    error.value = '请输入设备ID'
    return
  }
  if (!currentDevice.value.name.trim()) {
    error.value = '请输入设备名称'
    return
  }
  if (!currentDevice.value.type) {
    error.value = '请选择设备类型'
    return
  }

  try {
    if (modalMode.value === 'add') {
      await deviceApi.create(currentDevice.value)
    } else {
      await deviceApi.update(currentDevice.value.id, currentDevice.value)
    }
    await loadDevices()
    closeModal()
  } catch (e: any) {
    const msg = e?.response?.data?.message || (modalMode.value === 'add' ? '添加设备失败' : '更新设备失败')
    error.value = msg
    console.error(e)
  }
}

const deleteDevice = async (id: string) => {
  if (!confirm('确定要删除该设备吗？')) return
  try {
    await deviceApi.delete(id)
    await loadDevices()
  } catch (e: any) {
    const msg = e?.response?.data?.message || '删除设备失败'
    error.value = msg
    console.error(e)
  }
}

const getDeviceTypeName = (type: string): string => {
  const deviceType = deviceTypes.value.find(dt => dt.type === type)
  return deviceType?.name || type
}

const getDeviceCategory = (type: string): string => {
  const deviceType = deviceTypes.value.find(dt => dt.type === type)
  return deviceType?.category || ''
}

onMounted(async () => {
  await loadDevices()
  await loadDeviceTypes()
})
</script>

<template>
  <div class="devices-page">
    <h1 class="page-title">设备管理</h1>

    <div v-if="error" class="error-message" @click="error = ''">{{ error }}</div>

    <div class="toolbar">
      <button class="btn btn-primary" @click="openAddModal">
        添加设备
      </button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="devices.length === 0" class="empty-message">
      暂无设备，请点击"添加设备"创建
    </div>
    <div v-else class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>设备ID</th>
            <th>设备名称</th>
            <th>设备类型</th>
            <th>类别</th>
            <th>设备本地编号</th>
            <th>通信方式</th>
            <th>IP地址</th>
            <th>端口</th>
            <th>从站ID</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="device in devices" :key="device.id">
            <td>{{ device.id }}</td>
            <td>{{ device.name }}</td>
            <td>{{ getDeviceTypeName(device.type) }}</td>
            <td>{{ getDeviceCategory(device.type) }}</td>
            <td>{{ device.deviceLocalNum || '-' }}</td>
            <td>{{ device.communicationType }}</td>
            <td>{{ device.ip || '-' }}</td>
            <td>{{ device.port || '-' }}</td>
            <td>{{ device.slaveId || '-' }}</td>
            <td>
              <button class="btn btn-small btn-primary" @click="openEditModal(device)">
                编辑
              </button>
              <button class="btn btn-small btn-danger" @click="deleteDevice(device.id)">
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ modalMode === 'add' ? '添加设备' : '编辑设备' }}</h2>
          <button class="modal-close" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">设备ID</label>
            <input
              v-model="currentDevice.id"
              type="text"
              class="input"
              placeholder="请输入设备ID"
              :disabled="modalMode === 'edit'"
            />
            <span class="form-hint">添加时必填，编辑时不可修改</span>
          </div>
          <div class="form-group">
            <label class="form-label">设备名称</label>
            <input
              v-model="currentDevice.name"
              type="text"
              class="input"
              placeholder="请输入设备名称"
            />
          </div>
          <div class="form-group">
            <label class="form-label">设备类型</label>
            <select v-model="currentDevice.type" class="select">
              <option value="">请选择设备类型</option>
              <option v-for="dt in deviceTypes" :key="dt.type" :value="dt.type">
                {{ dt.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">通信方式</label>
            <select v-model="currentDevice.communicationType" class="select">
              <option value="Modbus-TCP">Modbus-TCP</option>
              <option value="Modbus-RTU">Modbus-RTU</option>
            </select>
          </div>
          <div class="form-group" v-if="currentDevice.communicationType === 'Modbus-TCP'">
            <label class="form-label">IP地址</label>
            <input
              v-model="currentDevice.ip"
              type="text"
              class="input"
              placeholder="如: 192.168.1.100"
            />
          </div>
          <div class="form-group">
            <label class="form-label">端口</label>
            <input
              v-model="currentDevice.port"
              type="number"
              class="input"
              placeholder="默认: 502"
            />
          </div>
          <div class="form-group">
            <label class="form-label">从站ID</label>
            <input
              v-model="currentDevice.slaveId"
              type="number"
              class="input"
              min="1"
              max="255"
            />
          </div>
          <div class="form-group">
            <label class="form-label">设备本地编号</label>
            <input
              v-model="currentDevice.deviceLocalNum"
              type="text"
              class="input"
              placeholder="请输入设备本地编号"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="saveDevice">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.devices-page {
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
  cursor: pointer;
}

.toolbar {
  margin-bottom: 1.25rem;
  display: flex;
  gap: 0.75rem;
}

.table-container {
  overflow-x: auto;
  background: linear-gradient(145deg, rgba(30, 35, 50, 0.6) 0%, rgba(20, 25, 38, 0.8) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 1rem;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.data-table th {
  background: rgba(255, 255, 255, 0.02);
  font-weight: 600;
  color: #8b949e;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.data-table tbody tr {
  transition: background-color 0.15s;
}

.data-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.03);
}

.data-table td {
  color: #c9d1d9;
  font-size: 0.875rem;
}

.loading,
.empty-message {
  text-align: center;
  padding: 3rem;
  color: #6e7681;
  background: linear-gradient(145deg, rgba(30, 35, 50, 0.6) 0%, rgba(20, 25, 38, 0.8) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  font-size: 0.9rem;
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

.form-hint {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #6e7681;
}

.input,
.select {
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

.input:focus,
.select:focus {
  outline: none;
  border-color: rgba(24, 144, 255, 0.5);
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
}

.input::placeholder {
  color: #484f58;
}

.input:disabled {
  background-color: rgba(255, 255, 255, 0.02);
  cursor: not-allowed;
  opacity: 0.6;
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
  margin-right: 0.5rem;
}
</style>