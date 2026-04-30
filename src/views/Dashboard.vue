<script setup lang="ts">
import { ref, onMounted } from "vue";

interface Device {
  id: string;
  name: string;
  icon: string;
  iconBg: string;
  deviceCode: string;
  online: boolean;
  protocol: string;
  accessMode: string;
  gridStatus?: string;
}

const devices = ref<Device[]>([]);
const loading = ref(true);

onMounted(() => {
  loading.value = true;
  devices.value = [
    {
      id: "1",
      name: "PCS (AC/DC)",
      icon: "⚡",
      iconBg: "bg-gradient-to-br from-blue-500 to-blue-600",
      deviceCode: "PCS-001",
      online: true,
      protocol: "IEC 61850",
      accessMode: "TCP/IP",
      gridStatus: "并网"
    },
    {
      id: "2",
      name: "DCDC 转换器",
      icon: "🔌",
      iconBg: "bg-gradient-to-br from-green-500 to-green-600",
      deviceCode: "DCDC-001",
      online: true,
      protocol: "Modbus TCP",
      accessMode: "TCP/IP"
    },
    {
      id: "3",
      name: "DCDC 转换器",
      icon: "🔌",
      iconBg: "bg-gradient-to-br from-green-500 to-green-600",
      deviceCode: "DCDC-002",
      online: false,
      protocol: "Modbus RTU",
      accessMode: "RS-485"
    },
    {
      id: "4",
      name: "MPPT 控制器",
      icon: "☀️",
      iconBg: "bg-gradient-to-br from-orange-500 to-orange-600",
      deviceCode: "MPPT-001",
      online: true,
      protocol: "Modbus TCP",
      accessMode: "TCP/IP"
    },
    {
      id: "5",
      name: "BMS 电池管理",
      icon: "🔋",
      iconBg: "bg-gradient-to-br from-purple-500 to-purple-600",
      deviceCode: "BMS-001",
      online: true,
      protocol: "IEC 61850",
      accessMode: "TCP/IP"
    },
    {
      id: "6",
      name: "防逆流电表",
      icon: "📡",
      iconBg: "bg-gradient-to-br from-red-500 to-red-600",
      deviceCode: "METER-001",
      online: true,
      protocol: "DL/T 645",
      accessMode: "RS-485"
    },
    {
      id: "7",
      name: "计量电表",
      icon: "📊",
      iconBg: "bg-gradient-to-br from-teal-500 to-teal-600",
      deviceCode: "METER-002",
      online: true,
      protocol: "DL/T 645",
      accessMode: "RS-485"
    },
    {
      id: "8",
      name: "除湿机",
      icon: "💨",
      iconBg: "bg-gradient-to-br from-cyan-500 to-cyan-600",
      deviceCode: "DEHUM-001",
      online: true,
      protocol: "Modbus RTU",
      accessMode: "RS-485"
    },
    {
      id: "9",
      name: "液冷机组",
      icon: "❄️",
      iconBg: "bg-gradient-to-br from-indigo-500 to-indigo-600",
      deviceCode: "COOL-001",
      online: true,
      protocol: "BACnet",
      accessMode: "TCP/IP"
    }
  ];
  loading.value = false;
});
</script>

<template>
  <div>
    <h1 class="page-title">设备监控</h1>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else class="devices-container">
      <div
        v-for="device in devices"
        :key="device.id"
        class="device-card"
        :class="{ offline: !device.online }"
      >
        <div class="device-header">
          <div class="device-icon" :class="device.iconBg">
            <span>{{ device.icon }}</span>
          </div>
          <div class="device-status">
            <span :class="['status-dot', device.online ? 'online' : 'offline']"></span>
            <span class="status-text">{{ device.online ? '在线' : '离线' }}</span>
          </div>
        </div>
        
        <h3 class="device-name">{{ device.name }}</h3>
        
        <div v-if="device.gridStatus" class="grid-tag" :class="device.gridStatus === '并网' ? 'grid-connected' : 'grid-disconnected'">
          {{ device.gridStatus }}
        </div>
        
        <div class="device-info">
          <div class="info-item">
            <span class="info-label">设备编号</span>
            <span class="info-value">{{ device.deviceCode }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">接入协议</span>
            <span class="info-value">{{ device.protocol }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">接入方式</span>
            <span class="info-value">{{ device.accessMode }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.devices-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
}

.device-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border: 1px solid #e5e7eb;
}

.device-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: #3498db;
}

.device-card.offline {
  opacity: 0.6;
}

.device-card.offline:hover {
  border-color: #9ca3af;
}

.device-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.device-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.device-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.online {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
}

.status-dot.offline {
  background: #ef4444;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
}

.status-text {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
}

.device-name {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.75rem;
}

.grid-tag {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.grid-tag.grid-connected {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.grid-tag.grid-disconnected {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.device-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: 0.7rem;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 0.875rem;
  color: #374151;
  font-weight: 500;
}

.loading {
  padding: 2rem;
  text-align: center;
  color: #666;
}

@media (max-width: 1200px) {
  .devices-container {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .devices-container {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .devices-container {
    grid-template-columns: 1fr;
  }
}
</style>
