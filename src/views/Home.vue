<script setup lang="ts">
import { ref, onMounted } from "vue";
// import { get } from '@/api'

interface SystemInfo {
  version: string;
  status: string;
  uptime: string;
}

const systemInfo = ref<SystemInfo | null>(null);
const loading = ref(true);

onMounted(() => {
  // 后端接口暂未实现，使用模拟数据
  loading.value = true;
  systemInfo.value = {
    version: "1.0.0",
    status: "本地模式",
    uptime: "00:00:00",
  };
  loading.value = false;
});
</script>
<template>
  <div>
    <h1 class="page-title">欢迎来到能量路由器仿真系统</h1>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else class="home-content">
      <div class="card">
        <h2>系统信息</h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">版本号</span>
            <span class="value">{{ systemInfo?.version }}</span>
          </div>
          <div class="info-item">
            <span class="label">系统状态</span>
            <span class="value">{{ systemInfo?.status }}</span>
          </div>
          <div class="info-item">
            <span class="label">运行时间</span>
            <span class="value">{{ systemInfo?.uptime }}</span>
          </div>
        </div>
      </div>
      <div class="card">
        <h2>功能模块</h2>
        <div class="features">
          <div class="feature-item">
            <h3>实时监控</h3>
            <p>实时监测能量路由器运行状态</p>
          </div>
          <div class="feature-item">
            <h3>数据分析</h3>
            <p>深入分析能源消耗数据</p>
          </div>
          <div class="feature-item">
            <h3>智能调度</h3>
            <p>优化能源分配策略</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card h2 {
  margin-bottom: 1rem;
  color: #2c3e50;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.info-item .label {
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 0.25rem;
}

.info-item .value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #2c3e50;
}

.features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.feature-item {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
  text-align: center;
}

.feature-item h3 {
  margin-bottom: 0.5rem;
  color: #3498db;
}

.feature-item p {
  font-size: 0.875rem;
  color: #666;
}

.loading {
  padding: 2rem;
  text-align: center;
  color: #666;
}
</style>
