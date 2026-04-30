<script setup lang="ts">
import Navbar from '@/components/Navbar.vue'
</script>

<template>
  <div class="app-container">
    <Navbar />
    <main>
      <div class="container">
        <router-view />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>