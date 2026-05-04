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
.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #e6edf3;
  margin-bottom: 1.5rem;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 600px;
}

.card {
  background: linear-gradient(145deg, rgba(30, 35, 50, 0.6) 0%, rgba(20, 25, 38, 0.8) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 1.25rem;
}

.card h2 {
  margin-bottom: 1.25rem;
  color: #e6edf3;
  font-size: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #8b949e;
  font-size: 0.9rem;
  cursor: pointer;
}

.form-hint {
  font-size: 0.8rem;
  color: #6e7681;
  margin-top: 0.25rem;
}

.checkbox {
  margin-right: 0.5rem;
  width: 16px;
  height: 16px;
  accent-color: #58a6ff;
}

.select {
  width: 100%;
  padding: 0.625rem 0.875rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-size: 0.875rem;
  color: #e6edf3;
  cursor: pointer;
  transition: all 0.2s;
}

.select:focus {
  outline: none;
  border-color: rgba(24, 144, 255, 0.5);
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
}

.select option {
  background: #1c2128;
  color: #e6edf3;
}

.radio-group {
  display: flex;
  gap: 1.5rem;
}

.radio-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #c9d1d9;
  font-size: 0.9rem;
}

.radio {
  margin-right: 0.5rem;
  width: 16px;
  height: 16px;
  accent-color: #58a6ff;
}

.btn {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #1f6feb 0%, #388bfd 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(31, 111, 235, 0.25);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(31, 111, 235, 0.35);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.06);
  color: #c9d1d9;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-left: 0.75rem;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #e6edf3;
}

.actions {
  display: flex;
  justify-content: flex-end;
}
</style>