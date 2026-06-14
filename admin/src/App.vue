<template>
  <div id="app">
    <!-- 登录页不显示布局 -->
    <router-view v-if="route.path === '/login'" />

    <!-- 后台管理布局 -->
    <el-container v-else style="height: 100vh">
      <el-aside width="200px" style="background: #304156">
        <div class="logo">记分板管理</div>
        <el-menu
          :default-active="route.path"
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409eff"
          router
        >
          <el-menu-item index="/dashboard">
            <el-icon><DataAnalysis /></el-icon>
            <span>数据看板</span>
          </el-menu-item>
          <el-menu-item index="/users">
            <el-icon><User /></el-icon>
            <span>用户管理</span>
          </el-menu-item>
          <el-menu-item index="/rooms">
            <el-icon><House /></el-icon>
            <span>房间管理</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-container>
        <el-header style="display: flex; align-items: center; justify-content: flex-end; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.08)">
          <el-button type="danger" text @click="handleLogout">退出登录</el-button>
        </el-header>
        <el-main style="background: #f5f7fa">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { DataAnalysis, User, House } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const handleLogout = () => {
  localStorage.removeItem('admin_token')
  router.push('/login')
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255,255,255,.1);
}
</style>
