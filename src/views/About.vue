<script setup lang="ts">
import { ref } from "vue";

const team = ref([
  { name: "张三", role: "前端开发", avatar: "Z" },
  { name: "李四", role: "后端开发", avatar: "L" },
  { name: "王五", role: "系统架构", avatar: "W" },
  { name: "赵六", role: "测试工程师", avatar: "Z" },
]);

const features = ref([
  "高性能实时数据处理",
  "智能能源调度算法",
  "可视化监控界面",
  "支持多种能量路由器拓扑",
]);
</script>

<template>
  <div>
    <h1 class="page-title">关于我们</h1>
    <div class="about-content">
      <div class="card">
        <h2>项目介绍</h2>
        <p>
          能量路由器仿真系统是一个用于模拟和管理能量路由器运行的综合性平台。
          该系统提供实时监控、数据分析和智能调度功能，帮助用户更好地管理和优化能量路由器能源分配。
        </p>
      </div>
      <div class="card">
        <h2>核心功能</h2>
        <ul class="feature-list">
          <li v-for="(feature, index) in features" :key="index">
            <span class="check-icon">✓</span>
            {{ feature }}
          </li>
        </ul>
      </div>
      <div class="card">
        <h2>开发团队</h2>
        <div class="team-grid">
          <!-- <div v-for="member in team" :key="member.name" class="team-member">
            <div class="avatar">{{ member.avatar }}</div>
            <div class="member-info">
              <div class="name">{{ member.name }}</div>
              <div class="role">{{ member.role }}</div>
            </div>
          </div> -->
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.about-content {
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

.card p {
  line-height: 1.6;
  color: #666;
}

.feature-list {
  list-style: none;
  padding: 0;
}

.feature-list li {
  display: flex;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #eee;
}

.feature-list li:last-child {
  border-bottom: none;
}

.check-icon {
  color: #27ae60;
  margin-right: 0.75rem;
  font-weight: bold;
}

.team-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.team-member {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.member-info {
  text-align: center;
}

.member-info .name {
  font-weight: 600;
  color: #2c3e50;
}

.member-info .role {
  font-size: 0.875rem;
  color: #666;
}
</style>
