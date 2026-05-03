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
  slaveId: 1
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
    slaveId: 1
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
    slaveId: 1
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
  cursor: pointer;
}

.toolbar {
  margin-bottom: 1rem;
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.data-table th,
.data-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.data-table th {
  background: #f5f5f5;
  font-weight: 600;
  color: #333;
}

.data-table tbody tr:hover {
  background: #fafafa;
}

.loading,
.empty-message {
  text-align: center;
  padding: 2rem;
  color: #999;
  background: #fff;
  border-radius: 8px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #fff;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999;
}

.modal-close:hover {
  color: #333;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #eee;
}

.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

.form-hint {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #999;
}

.input,
.select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 0.875rem;
  box-sizing: border-box;
}

.input:focus,
.select:focus {
  outline: none;
  border-color: #40a9ff;
}

.input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: #1890ff;
  color: white;
}

.btn-primary:hover {
  background-color: #40a9ff;
}

.btn-secondary {
  background-color: #fff;
  color: #333;
  border: 1px solid #d9d9d9;
}

.btn-secondary:hover {
  color: #40a9ff;
  border-color: #40a9ff;
}

.btn-danger {
  background-color: #ff4d4f;
  color: white;
}

.btn-danger:hover {
  background-color: #ff7875;
}

.btn-small {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  margin-right: 0.5rem;
}
</style>