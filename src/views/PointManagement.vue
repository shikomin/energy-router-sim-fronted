<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { type Point, type DeviceType, type PropertyDef } from '@/api';

const devices = ref<string[]>(['PCS_ACDC', 'BMS', 'DCDC_1', 'DCDC_2', 'MPPT']);
const selectedDevice = ref<string>('');
const points = ref<Point[]>([]);
const deviceTypes = ref<DeviceType[]>([]);
const loading = ref(false);
const error = ref('');
const showModal = ref(false);
const modalMode = ref<'add' | 'edit'>('add');
const currentPoint = ref<Point>({
 id: '',
 ptId: '',
 ptName: '',
 deviceLocalNum: '',
 signalType: 'yc',
 modelType: 1,
 linkedProp: ''
});
const showSendModal = ref(false);
const sendValue = ref<string>('');
const currentSendPoint = ref<Point | null>(null);
const sendLoading = ref(false);
const signalTypes = [
 { value: 'yc', label: '遥测' },
 { value: 'yx', label: '遥信' },
 { value: 'yk', label: '遥控' },
 { value: 'yt', label: '遥调' }
];
const modelTypeLabels: Record<number, string> = {
 1: '属性',
 2: '事件',
 3: '操作'
};
const deviceIcons: Record<string, string> = {
 'PCS_ACDC': '⚡',
 'BMS': '🔋',
 'DCDC_1': '🔌',
 'DCDC_2': '🔌',
 'MPPT': '☀️'
};
const deviceNames: Record<string, string> = {
 'PCS_ACDC': 'PCS(交直流)',
 'BMS': '储能管理',
 'DCDC_1': 'DCDC转换器1',
 'DCDC_2': 'DCDC转换器2',
 'MPPT': '光伏MPPT'
};
const deviceTypeMap: Record<string, string> = {
 'PCS_ACDC': 'PCS',
 'BMS': 'BMS',
 'DCDC_1': 'DCDC',
 'DCDC_2': 'DCDC',
 'MPPT': 'MPPT'
};
const deviceLocalNumMap: Record<string, string> = {
 'PCS_ACDC': '19',
 'BMS': '',
 'DCDC_1': '12',
 'DCDC_2': '1',
 'MPPT': '13'
};
const availableProps = computed(() => {
 if (!selectedDevice.value) return [];
 const deviceType = deviceTypeMap[selectedDevice.value];
 const typeDef = deviceTypes.value.find(t => t.type === deviceType);
 if (!typeDef) return [];

 const props: PropertyDef[] = [];
 const signalType = currentPoint.value.signalType;

 switch (signalType) {
 case 'yc':
   props.push(...(typeDef.properties.telemetry || []));
   break;
 case 'yx':
   props.push(...(typeDef.properties.telesignal || []));
   break;
 case 'yk':
   props.push(...(typeDef.properties.telecontrol || []));
   break;
 case 'yt':
   props.push(...(typeDef.properties.teleadjust || []));
   break;
 }
 return props;
});
const getSignalTypeLabel = (type: string) => {
 const found = signalTypes.find(s => s.value === type);
 return found?.label || type;
};
const getLinkedPropName = (linkedProp: string) => {
 if (!linkedProp) return '-';
 const prop = availableProps.value.find(p => p.key === linkedProp);
 return prop?.name || linkedProp;
};
const selectDevice = async (deviceKey: string) => {
 selectedDevice.value = deviceKey;
 const deviceLocalNum = deviceLocalNumMap[deviceKey];
 if (deviceLocalNum) {
 await loadPointsByDevice(deviceLocalNum);
 }
};
const loadDeviceTypes = async () => {
 try {
 const response = await fetch('/api-dev/device-types');
 if (response.ok) {
 const apiResponse = await response.json();
 deviceTypes.value = apiResponse.data || [];
 }
 } catch (e) {
 console.error('Failed to load device types', e);
 }
};
const loadPointsByDevice = async (deviceLocalNum: string) => {
 loading.value = true;
 error.value = '';
 try {
 const response = await fetch(`/api-dev/points/device/${deviceLocalNum}`);
 if (!response.ok)
 throw new Error('加载点位失败');
 points.value = await response.json();
 }
 catch (e) {
 error.value = '加载点位失败';
 console.error(e);
 }
 finally {
 loading.value = false;
 }
};
const openAddModal = () => {
 modalMode.value = 'add';
 currentPoint.value = {
 id: '',
 ptId: '',
 ptName: '',
 deviceLocalNum: selectedDevice.value,
 signalType: 'yc',
 modelType: 1,
 linkedProp: ''
 };
 showModal.value = true;
};
const openEditModal = (point: Point) => {
 modalMode.value = 'edit';
 currentPoint.value = { ...point, linkedProp: point.linkedProp || '' };
 showModal.value = true;
};
const closeModal = () => {
 showModal.value = false;
 currentPoint.value = {
 id: '',
 ptId: '',
 ptName: '',
 deviceLocalNum: selectedDevice.value,
 signalType: 'yc',
 modelType: 1,
 linkedProp: ''
 };
};
const validatePoint = (): string | null => {
 if (!currentPoint.value.ptId?.trim()) {
 return '点位ID不能为空';
 }
 if (!currentPoint.value.ptName?.trim()) {
 return '点位名称不能为空';
 }
 if (!currentPoint.value.deviceLocalNum?.trim()) {
 return '关联设备本地编号不能为空';
 }
 if (!currentPoint.value.signalType?.trim()) {
 return '信号类型不能为空';
 }
 return null;
};
const savePoint = async () => {
 const validationError = validatePoint();
 if (validationError) {
 error.value = validationError;
 return;
 }
 currentPoint.value.modelType = deriveModelType(currentPoint.value.signalType);
 try {
 if (modalMode.value === 'add') {
 const response = await fetch('/api-dev/points', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(currentPoint.value)
 });
 if (!response.ok) {
 const data = await response.json();
 throw new Error(data || '添加点位失败');
 }
 }
 else {
 const response = await fetch(`/api-dev/points/${currentPoint.value.id}`, {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(currentPoint.value)
 });
 if (!response.ok) {
 const data = await response.json();
 throw new Error(data || '更新点位失败');
 }
 }
 await loadPointsByDevice(selectedDevice.value);
 closeModal();
 error.value = '';
 }
 catch (e: any) {
 error.value = e.message || (modalMode.value === 'add' ? '添加点位失败' : '更新点位失败');
 console.error(e);
 }
};
const deletePoint = async (id: string) => {
 if (!confirm('确定要删除该点位吗？'))
 return;
 try {
 const response = await fetch(`/api-dev/points/${id}`, {
 method: 'DELETE'
 });
 if (!response.ok)
 throw new Error('删除点位失败');
 await loadPointsByDevice(selectedDevice.value);
 }
 catch (e: any) {
 error.value = e.message || '删除点位失败';
 console.error(e);
 }
};
const openSendModal = (point: Point) => {
 currentSendPoint.value = point;
 sendValue.value = '';
 showSendModal.value = true;
};
const closeSendModal = () => {
 showSendModal.value = false;
 currentSendPoint.value = null;
 sendValue.value = '';
};
const sendPointValue = async () => {
 if (!currentSendPoint.value || sendValue.value.trim() === '') {
 error.value = '请输入有效的发送值';
 return;
 }
 sendLoading.value = true;
 error.value = '';
 try {
 const response = await fetch('/api-dev/points/send', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 point: currentSendPoint.value,
 value: sendValue.value.trim()
 })
 });
 if (!response.ok) {
 const data = await response.json();
 throw new Error(data.error || '发送失败');
 }
 closeSendModal();
 }
 catch (e: any) {
 error.value = e.message || '发送失败';
 console.error(e);
 }
 finally {
 sendLoading.value = false;
 }
};
const deriveModelType = (signalType: string): number => {
 switch (signalType) {
 case 'yc': return 1;
 case 'yx': return 2;
 case 'yk':
 case 'yt': return 3;
 default: return 1;
 }
};
const filteredPoints = computed(() => {
 return points.value;
});
watch(() => currentPoint.value.signalType, () => {
 currentPoint.value.linkedProp = '';
});
onMounted(async () => {
 await loadDeviceTypes();
});
</script>

<template>
  <div class="points-management">
    <h1 class="page-title">点位管理</h1>

    <div v-if="error" class="error-message" @click="error = ''">{{ error }}</div>

    <div class="device-grid">
      <div
        v-for="device in devices"
        :key="device"
        class="device-card"
        :class="{ active: selectedDevice === device }"
        @click="selectDevice(device)"
      >
        <div class="device-icon">{{ deviceIcons[device] }}</div>
        <div class="device-name">{{ deviceNames[device] }}</div>
        <div class="device-local-num">{{ deviceLocalNumMap[device] }}</div>
      </div>
    </div>

    <div v-if="selectedDevice" class="points-section">
      <div class="section-header">
        <h2>{{ deviceNames[selectedDevice] }} - 点位列表</h2>
        <button class="btn btn-primary" @click="openAddModal">
          + 添加点位
        </button>
      </div>

      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="filteredPoints.length === 0" class="empty-message">
        该设备暂无点位配置
      </div>
      <div v-else class="table-container">
        <table class="points-table">
          <thead>
            <tr>
              <th>点位ID</th>
              <th>点位名称</th>
              <th>信号类型</th>
              <th>物模型类型</th>
              <th>关联属性</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="point in filteredPoints" :key="point.id">
              <td>{{ point.ptId }}</td>
              <td>{{ point.ptName }}</td>
              <td>{{ getSignalTypeLabel(point.signalType) }}</td>
              <td>{{ modelTypeLabels[point.modelType] }}</td>
              <td>{{ getLinkedPropName(point.linkedProp || '') || '-' }}</td>
              <td>
                <button class="btn btn-small btn-send" @click="openSendModal(point)" v-if="point.signalType === 'yc' || point.signalType === 'yx'">
                  发送
                </button>
                <button class="btn btn-small btn-primary" @click="openEditModal(point)">
                  编辑
                </button>
                <button class="btn btn-small btn-danger" @click="deletePoint(point.id)">
                  删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ modalMode === 'add' ? '添加点位' : '编辑点位' }}</h2>
          <button class="modal-close" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">点位ID</label>
            <input
              v-model="currentPoint.ptId"
              type="text"
              class="input"
              placeholder="请输入点位ID"
              :disabled="modalMode === 'edit'"
            />
            <span class="form-hint">添加时必填，编辑时不可修改</span>
          </div>
          <div class="form-group">
            <label class="form-label">点位名称</label>
            <input
              v-model="currentPoint.ptName"
              type="text"
              class="input"
              placeholder="请输入点位名称"
            />
          </div>
          <div class="form-group">
            <label class="form-label">关联设备本地编号</label>
            <input
              v-model="currentPoint.deviceLocalNum"
              type="text"
              class="input"
              disabled
            />
          </div>
          <div class="form-group">
            <label class="form-label">信号类型</label>
            <select v-model="currentPoint.signalType" class="select">
              <option v-for="type in signalTypes" :key="type.value" :value="type.value">
                {{ type.label }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">物模型类型</label>
            <input
              :value="modelTypeLabels[deriveModelType(currentPoint.signalType)]"
              type="text"
              class="input"
              disabled
            />
            <span class="form-hint">根据信号类型自动推导</span>
          </div>
          <div class="form-group">
            <label class="form-label">关联属性</label>
            <select v-model="currentPoint.linkedProp" class="select">
              <option value="">-- 请选择关联属性(可选) --</option>
              <option v-for="prop in availableProps" :key="prop.key" :value="prop.key">
                {{ prop.name }} ({{ prop.key }})
              </option>
            </select>
            <span class="form-hint">对应设备类型属性中的key，可为空</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="savePoint">保存</button>
        </div>
      </div>
    </div>

    <div v-if="showSendModal" class="modal-overlay" @click.self="closeSendModal">
      <div class="modal">
        <div class="modal-header">
          <h2>发送模拟值</h2>
          <button class="modal-close" @click="closeSendModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="send-info">
            <p><strong>点位ID：</strong>{{ currentSendPoint?.ptId }}</p>
            <p><strong>点位名称：</strong>{{ currentSendPoint?.ptName }}</p>
            <p><strong>信号类型：</strong>{{ currentSendPoint?.signalType === 'yc' ? '遥测' : '遥信' }}</p>
            <p><strong>设备编号：</strong>{{ currentSendPoint?.deviceLocalNum }}</p>
          </div>
          <div class="form-group">
            <label class="form-label">模拟值</label>
            <input
              v-model="sendValue"
              type="text"
              class="input"
              placeholder="请输入要发送的模拟值"
              @keyup.enter="sendPointValue"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeSendModal">取消</button>
          <button class="btn btn-primary" @click="sendPointValue" :disabled="sendLoading">
            {{ sendLoading ? '发送中...' : '发送' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.points-management {
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

.device-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.device-card {
  background: linear-gradient(145deg, rgba(30, 35, 50, 0.8) 0%, rgba(20, 25, 38, 0.9) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.device-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.device-card.active {
  background: linear-gradient(145deg, rgba(31, 111, 235, 0.25) 0%, rgba(31, 111, 235, 0.1) 100%);
  border-color: rgba(31, 111, 235, 0.4);
}

.device-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.device-name {
  font-size: 1rem;
  font-weight: 600;
  color: #e6edf3;
  margin-bottom: 0.25rem;
}

.device-local-num {
  font-size: 0.8rem;
  color: #6e7681;
}

.device-card.active .device-name {
  color: #58a6ff;
}

.points-section {
  background: linear-gradient(145deg, rgba(30, 35, 50, 0.6) 0%, rgba(20, 25, 38, 0.8) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 1.25rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.section-header h2 {
  font-size: 1rem;
  font-weight: 600;
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

.btn-send {
  background: linear-gradient(135deg, #238636 0%, #2ea043 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(35, 134, 54, 0.25);
}

.btn-send:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(35, 134, 54, 0.35);
}

.btn-small {
  padding: 0.3rem 0.6rem;
  font-size: 0.75rem;
  margin-right: 0.5rem;
}

.loading,
.empty-message {
  text-align: center;
  padding: 3rem;
  color: #6e7681;
  font-size: 0.9rem;
}

.table-container {
  overflow-x: auto;
}

.points-table {
  width: 100%;
  border-collapse: collapse;
}

.points-table th,
.points-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.points-table th {
  background: rgba(255, 255, 255, 0.02);
  font-weight: 600;
  color: #8b949e;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.points-table tbody tr {
  transition: background-color 0.15s;
}

.points-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.03);
}

.points-table td {
  color: #c9d1d9;
  font-size: 0.875rem;
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

.send-info {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.send-info p {
  margin: 0.35rem 0;
  color: #c9d1d9;
  font-size: 0.875rem;
}

.send-info strong {
  color: #8b949e;
  margin-right: 0.5rem;
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

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
</style>