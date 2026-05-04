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
.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #e6edf3;
  margin-bottom: 1.5rem;
}

.loading {
  padding: 2rem;
  text-align: center;
  color: #6e7681;
}

.home-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.card {
  background: linear-gradient(145deg, rgba(30, 35, 50, 0.6) 0%, rgba(20, 25, 38, 0.8) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 1.25rem;
}

.card h2 {
  margin-bottom: 1rem;
  color: #e6edf3;
  font-size: 1rem;
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
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.info-item .label {
  font-size: 0.8rem;
  color: #6e7681;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.info-item .value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #e6edf3;
}

.features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.feature-item {
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  text-align: center;
  transition: all 0.2s;
}

.feature-item:hover {
  border-color: rgba(255, 255, 255, 0.12);
}

.feature-item h3 {
  margin-bottom: 0.5rem;
  color: #58a6ff;
  font-size: 0.95rem;
}

.feature-item p {
  font-size: 0.85rem;
  color: #6e7681;
}
</style>
