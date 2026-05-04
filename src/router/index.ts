import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue')
  },
  {
    path: '/devices',
    name: 'Devices',
    component: () => import('@/views/Devices.vue')
  },
  {
    path: '/topology',
    name: 'Topology',
    component: () => import('@/views/Topology.vue')
  },
  {
    path: '/points',
    name: 'Points',
    component: () => import('@/views/PointManagement.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
