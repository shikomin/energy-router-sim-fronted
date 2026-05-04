<script setup lang="ts">
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();

const navItems = [
  { name: "Dashboard", label: "仪表盘", path: "/" },
  { name: "Devices", label: "设备管理", path: "/devices" },
  { name: "Topology", label: "拓扑管理", path: "/topology" },
  { name: "Points", label: "点位管理", path: "/points" },
];

const isActive = (path: string) => route.path === path;

const navigateTo = (path: string) => {
  router.push(path);
};
</script>

<template>
  <nav>
    <div class="container">
      <div class="nav-brand">
        <span>能量路由器仿真系统</span>
      </div>
      <ul class="nav-list">
        <li v-for="item in navItems" :key="item.name">
          <a
            :class="{ active: isActive(item.path) }"
            @click="navigateTo(item.path)"
          >
            {{ item.label }}
          </a>
        </li>
      </ul>
    </div>
  </nav>
</template>

<style scoped>
nav {
  background: linear-gradient(180deg, rgba(20, 25, 38, 0.95) 0%, rgba(13, 17, 23, 0.9) 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 100;
}

nav .container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1.5rem;
}

.nav-brand {
  font-size: 1.1rem;
  font-weight: 700;
  color: #e6edf3;
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-brand::before {
  content: '';
  width: 8px;
  height: 8px;
  background: linear-gradient(135deg, #58a6ff, #1f6feb);
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(88, 166, 255, 0.5);
}

.nav-list {
  list-style: none;
  display: flex;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
}

.nav-list li a {
  color: #8b949e;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.9rem;
  font-weight: 500;
  position: relative;
}

.nav-list li a:hover {
  color: #e6edf3;
  background: rgba(255, 255, 255, 0.06);
}

.nav-list li a.active {
  color: #e6edf3;
  background: linear-gradient(135deg, rgba(31, 111, 235, 0.25) 0%, rgba(31, 111, 235, 0.1) 100%);
  border: 1px solid rgba(31, 111, 235, 0.3);
}

.nav-list li a.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 2px;
  background: linear-gradient(90deg, #58a6ff, #1f6feb);
  border-radius: 1px;
}
</style>