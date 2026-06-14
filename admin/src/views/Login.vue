<template>
  <div class="login-page">
    <el-card class="login-card" shadow="never">
      <div class="login-header">
        <el-avatar :size="56" style="background: #007aff; margin-bottom: 12px">
          <el-icon :size="28"><Management /></el-icon>
        </el-avatar>
        <h2>记分板管理后台</h2>
        <p class="login-subtitle">请使用管理员账号登录</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="handleLogin"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            size="large"
            clearable
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            style="width: 100%"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Management } from '@element-plus/icons-vue'
import { adminLogin } from '../api/admin.js'

const router = useRouter()
const formRef = ref()
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const data = await adminLogin(form.username, form.password)
    localStorage.setItem('admin_token', data.token)
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } catch (err) {
    ElMessage.error(err.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f2f2f7;
}

.login-card {
  width: 380px;
  border: 1px solid #e5e5ea;
  border-radius: 12px;
}

.login-header {
  text-align: center;
  margin-bottom: 24px;
}

.login-header h2 {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 600;
  color: #1c1c1e;
}

.login-subtitle {
  margin: 0;
  font-size: 13px;
  color: #8e8e93;
}
</style>
