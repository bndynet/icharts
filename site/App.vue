<template>
  <el-container class="app-root">

    <!-- ── Sidebar ───────────────────────────────────────────────── -->
    <el-aside class="app-aside" width="220px">

      <!-- Brand -->
      <div class="aside-brand">
        <el-text type="primary" tag="span" style="font-size:15px;font-weight:700;">
          iCharts
        </el-text>
      </div>

      <!-- Navigation -->
      <el-menu
        mode="vertical"
        :default-active="route.path"
        router
        style="border-right:none;"
      >
        <el-menu-item index="/">
          <el-icon><home-filled /></el-icon>
          <span>Home</span>
        </el-menu-item>
        <el-menu-item index="/charts">
          <el-icon><PieChart /></el-icon>
          <span>Charts</span>
        </el-menu-item>
        <el-menu-item index="/dashboard">
          <el-icon><monitor /></el-icon>
          <span>Dashboard</span>
        </el-menu-item>
      </el-menu>

      <!-- Spacer -->
      <div class="aside-spacer" />

      <!-- Footer -->
      <div class="aside-footer">
        <el-select v-model="theme" size="small" style="width:100%;">
          <el-option label="Light" value="light" />
          <el-option label="Dark" value="dark" />
          <el-option label="Ocean (custom)" value="ocean" />
          <el-option label="Rose (custom)" value="rose" />
        </el-select>
      </div>

    </el-aside>

    <!-- ── Main content ───────────────────────────────────────────── -->
    <el-main class="app-main">
      <router-view />
    </el-main>

  </el-container>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { PieChart, Monitor, HomeFilled } from '@element-plus/icons-vue'
import { appTheme as theme } from './useAppTheme'

const route = useRoute()
</script>

<style scoped>
.app-root {
  height: 100vh;
  overflow: hidden;
}

/* ── Sidebar ─────────────────────────────────────────────────────────────── */
.app-aside {
  border-right: 1px solid var(--el-border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.aside-brand {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
  border-bottom: 1px solid var(--el-border-color-light);
  flex-shrink: 0;
}

.aside-spacer {
  flex: 1;
}

:deep(.el-menu-item) {
  height: 38px;
  line-height: 38px;
  font-size: 13px;
}

.aside-footer {
  padding: 14px 20px;
  border-top: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

/* ── Main content ────────────────────────────────────────────────────────── */
.app-main {
  overflow-y: auto;
  padding: 28px 32px;
}
</style>
