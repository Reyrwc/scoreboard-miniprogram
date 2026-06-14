<template>
  <div class="users-page">
    <h2 style="margin-bottom: 20px">用户管理</h2>

    <!-- 搜索栏 -->
    <el-card style="margin-bottom: 16px">
      <el-row :gutter="16" align="middle">
        <el-col :span="8">
          <el-input
            v-model="keyword"
            placeholder="搜索昵称或 openid"
            clearable
            @keyup.enter="loadUsers"
          />
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="loadUsers">搜索</el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 用户列表 -->
    <el-card>
      <el-table :data="users" v-loading="loading" stripe>
        <el-table-column label="头像" width="70">
          <template #default="{ row }">
            <el-avatar :src="row.avatarUrl" :size="40" />
          </template>
        </el-table-column>
        <el-table-column prop="nickname" label="昵称" width="140" />
        <el-table-column prop="_id" label="OpenID" min-width="200" show-overflow-tooltip />
        <el-table-column prop="totalGames" label="总场次" width="80" align="center" />
        <el-table-column label="胜率" width="80" align="center">
          <template #default="{ row }">
            {{ row.totalGames > 0 ? Math.round(row.totalWins / row.totalGames * 100) + '%' : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.banned ? 'danger' : 'success'" size="small">
              {{ row.banned ? '已封禁' : '正常' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center">
          <template #default="{ row }">
            <el-button size="small" @click="showDetail(row)">详情</el-button>
            <el-button
              v-if="!row.banned"
              type="danger"
              size="small"
              @click="handleBan(row)"
            >封禁</el-button>
            <el-button
              v-else
              type="success"
              size="small"
              @click="handleUnban(row)"
            >解封</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top: 16px; justify-content: flex-end"
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="loadUsers"
      />
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="用户详情" width="500px">
      <template v-if="detailUser">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="昵称" :span="2">
            <el-avatar :src="detailUser.avatarUrl" :size="24" style="vertical-align: middle; margin-right: 8px" />
            {{ detailUser.nickname }}
          </el-descriptions-item>
          <el-descriptions-item label="OpenID" :span="2">{{ detailUser._id }}</el-descriptions-item>
          <el-descriptions-item label="总场次">{{ detailUser.totalGames }}</el-descriptions-item>
          <el-descriptions-item label="总胜场">{{ detailUser.totalWins }}</el-descriptions-item>
          <el-descriptions-item label="胜率">
            {{ detailUser.totalGames > 0 ? Math.round(detailUser.totalWins / detailUser.totalGames * 100) + '%' : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="净得分">{{ detailUser.totalWinScore - detailUser.totalLoseScore }}</el-descriptions-item>
          <el-descriptions-item label="最高连胜">{{ detailUser.maxStreak }}</el-descriptions-item>
          <el-descriptions-item label="最大单局赢分">{{ detailUser.maxSingleWin }}</el-descriptions-item>
          <el-descriptions-item label="注册时间" :span="2">{{ formatDate(detailUser.createdAt) }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-dialog>

    <!-- 封禁弹窗 -->
    <el-dialog v-model="banVisible" title="封禁用户" width="400px">
      <p style="margin-bottom: 12px">确定要封禁用户 <strong>{{ banTarget?.nickname }}</strong> 吗？</p>
      <el-input v-model="banReason" placeholder="封禁原因（可选）" type="textarea" :rows="2" />
      <template #footer>
        <el-button @click="banVisible = false">取消</el-button>
        <el-button type="danger" :loading="banLoading" @click="confirmBan">确认封禁</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUsers, banUser } from '../api/admin.js'

const users = ref([])
const loading = ref(false)
const keyword = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)

const detailVisible = ref(false)
const detailUser = ref(null)

const banVisible = ref(false)
const banTarget = ref(null)
const banReason = ref('')
const banLoading = ref(false)

async function loadUsers() {
  loading.value = true
  try {
    const data = await getUsers({ page: page.value, pageSize, keyword: keyword.value || undefined })
    users.value = data.list
    total.value = data.total
  } catch (err) {
    ElMessage.error(err.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function showDetail(user) {
  detailUser.value = user
  detailVisible.value = true
}

function handleBan(user) {
  banTarget.value = user
  banReason.value = ''
  banVisible.value = true
}

async function confirmBan() {
  banLoading.value = true
  try {
    await banUser(banTarget.value._id, true, banReason.value)
    ElMessage.success('封禁成功')
    banVisible.value = false
    loadUsers()
  } catch (err) {
    ElMessage.error(err.message || '封禁失败')
  } finally {
    banLoading.value = false
  }
}

async function handleUnban(user) {
  try {
    await ElMessageBox.confirm(`确定要解封用户 ${user.nickname} 吗？`, '确认解封')
    await banUser(user._id, false)
    ElMessage.success('解封成功')
    loadUsers()
  } catch (err) {
    if (err !== 'cancel') ElMessage.error(err.message || '解封失败')
  }
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(loadUsers)
</script>
