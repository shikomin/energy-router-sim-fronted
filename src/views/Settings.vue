<script setup lang="ts">
import { ref } from 'vue'
// import { post } from '@/api'

const settings = ref({
  autoRefresh: true,
  refreshInterval: 5,
  theme: 'light',
  language: 'zh-CN'
})

const saving = ref(false)
const saved = ref(false)

const refreshIntervals = [
  { value: 3, label: '3秒' },
  { value: 5, label: '5秒' },
  { value: 10, label: '10秒' },
  { value: 30, label: '30秒' }
]

const themes = [
  { value: 'light', label: '亮色主题' },
  { value: 'dark', label: '暗色主题' }
]

const languages = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' }
]

const saveSettings = () => {
  // 后端接口暂未实现，使用本地保存
  saving.value = true
  saved.value = true
  setTimeout(() => {
    saved.value = false
  }, 2000)
  saving.value = false
}
</script>

<template>
  <div>
    <h1 class="page-title">系统设置</h1>
    <div class="settings-content">
      <div class="card">
        <h2>常规设置</h2>
        <div class="form-group">
          <label class="form-label">
            <input
              type="checkbox"
              v-model="settings.autoRefresh"
              class="checkbox"
            />
            自动刷新
          </label>
          <p class="form-hint">启用后将自动刷新数据</p>
        </div>
        <div class="form-group">
          <label class="form-label">刷新间隔</label>
          <select v-model="settings.refreshInterval" class="select">
            <option v-for="option in refreshIntervals" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>
      <div class="card">
        <h2>外观设置</h2>
        <div class="form-group">
          <label class="form-label">主题</label>
          <div class="radio-group">
            <label
              v-for="option in themes"
              :key="option.value"
              class="radio-label"
            >
              <input
                type="radio"
                :value="option.value"
                v-model="settings.theme"
                class="radio"
              />
              {{ option.label }}
            </label>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">语言</label>
          <select v-model="settings.language" class="select">
            <option v-for="option in languages" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>
      <div class="card actions">
        <button class="btn btn-primary" @click="saveSettings" :disabled="saving">
          <span v-if="saving">保存中...</span>
          <span v-else-if="saved">已保存 ✓</span>
          <span v-else>保存设置</span>
        </button>
        <button class="btn btn-secondary">重置默认</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 600px;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card h2 {
  margin-bottom: 1.5rem;
  color: #2c3e50;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #eee;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

.form-hint {
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.25rem;
}

.checkbox {
  margin-right: 0.5rem;
}

.select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  background: white;
  cursor: pointer;
}

.select:focus {
  outline: none;
  border-color: #3498db;
}

.radio-group {
  display: flex;
  gap: 1.5rem;
}

.radio-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.radio {
  margin-right: 0.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2980b9;
}

.btn-primary:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.btn-secondary {
  background: #ecf0f1;
  color: #333;
  margin-left: 0.75rem;
}

.btn-secondary:hover {
  background: #bdc3c7;
}

.actions {
  display: flex;
  justify-content: flex-end;
}
</style>