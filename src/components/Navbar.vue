<script setup lang="ts">
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();

const navItems = [
  { name: "Dashboard", label: "仪表盘", path: "/" },
  { name: "Devices", label: "设备管理", path: "/devices" },
  { name: "Topology", label: "拓扑管理", path: "/topology" },
  { name: "Settings", label: "系统设置", path: "/settings" },
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
  background-color: #bfcbd6;
  color: rgb(0, 0, 0);
  padding: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

nav .container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
}

.nav-brand {
  font-size: 1.25rem;
  font-weight: 600;
}

.nav-list {
  list-style: none;
  display: flex;
  gap: 1rem;
  margin: 0;
  padding: 0;
}

.nav-list li a {
  color: rgb(36, 36, 36);
  font-weight: bolder;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: default;
  transition:
    background-color 0.3s,
    color 0.3s;
}

.nav-list li a:hover {
  color: rgb(255, 255, 255);
  background-color: rgba(59, 59, 59, 0.5);
}

.nav-list li a.active {
  color: white;
  background-color: #252525;
}
</style>