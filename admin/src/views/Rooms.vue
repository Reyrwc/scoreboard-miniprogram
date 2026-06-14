<template>
  <div class="rooms-page">
    <h2 style="margin-bottom: 20px">房间管理</h2>

    <!-- 搜索筛选栏 -->
    <el-card style="margin-bottom: 16px">
      <el-row :gutter="16" align="middle">
        <el-col :span="6">
          <el-input
            v-model="keyword"
            placeholder="搜索房间名"
            clearable
            @keyup.enter="loadRooms"
          />
        </el-col>
        <el-col :span="4">
          <el-select v-model="statusFilter" placeholder="状态筛选" clearable>
            <el-option label="全部" value="all" />
            <el-option label="进行中" value="active" />
            <el-option label="已解散" value="dissolved" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="loadRooms">搜索</el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 房间列表 -->
    <el-card>
      <el-table :data="rooms" v-loading="loading" stripe>
        <el-table-column prop="name" label="房间名" width="180" />
        <el-table-column prop="_id" label="房间 ID" min-width="200" show-overflow-tooltip />
        <el-table-column label="玩家数" width="80" align="center">
          <template #default="{ row }">
            {{ (row.allPlayers || row.players || []).length }}
          </template>
        </el-table-column>
        <el-table-column prop="currentRound" label="当前局数" width="90" align="center" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '进行中' : '已解散' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center">
          <template #default="{ row }">
            <el-button size="small" @click="showDetail(row)">详情</el-button>
            <el-button
              v-if="row.status === 'active'"
              type="danger"
              size="small"
              @click="handleDissolve(row)"
            >解散</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top: 16px; justify-content: flex-end"
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="loadRooms"
      />
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="房间详情" width="700px">
      <template v-if="detailRoom">
        <el-descriptions :column="2" border style="margin-bottom: 16px">
          <el-descriptions-item label="房间名">{{ detailRoom.room.name }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="detailRoom.room.status === 'active' ? 'success' : 'info'" size="small">
              {{ detailRoom.room.status === 'active' ? '进行中' : '已解散' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="房间 ID" :span="2">{{ detailRoom.room._id }}</el-descriptions-item>
          <el-descriptions-item label="当前局数">{{ detailRoom.room.currentRound }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(detailRoom.room.createdAt) }}</el-descriptions-item>
        </el-descriptions>

        <!-- 玩家列表 -->
        <h4 style="margin-bottom: 8px">玩家</h4>
        <el-table :data="(detailRoom.room.allPlayers || detailRoom.room.players || [])" size="small" style="margin-bottom: 16px">
          <el-table-column label="头像" width="60">
            <template #default="{ row }">
              <el-avatar :src="row.avatarUrl" :size="30" />
            </template>
          </el-table-column>
          <el-table-column prop="nickname" label="昵称" />
          <el-table-column prop="openid" label="OpenID" show-overflow-tooltip />
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.active ? 'success' : 'info'" size="small">
                {{ row.active ? '在线' : '已退出' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>

        <!-- 记分记录 -->
        <h4 style="margin-bottom: 8px">记分记录（最近 100 条）</h4>
        <el-table :data="detailRoom.scores" size="small" max-height="300">
          <el-table-column prop="roundNum" label="局" width="50" />
          <el-table-column prop="fromNickname" label="记分人" width="100" />
          <el-table-column prop="toNickname" label="被记分人" width="100" />
          <el-table-column prop="amount" label="分数" width="70" />
          <el-table-column prop="note" label="备注" />
          <el-table-column label="时间" width="160">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
        </el-table>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getRooms, getRoomDetail, dissolveRoom } from '../api/admin.js'

const rooms = ref([])
const loading = ref(false)
const keyword = ref('')
const statusFilter = ref('all')
const page = ref(1)
const pageSize = 20
const total = ref(0)

const detailVisible = ref(false)
const detailRoom = ref(null)

async function loadRooms() {
  loading.value = true
  try {
    const params = {
      page: page.value,
      pageSize,
      keyword: keyword.value || undefined,
      status: statusFilter.value || undefined
    }
    const data = await getRooms(params)
    rooms.value = data.list
    total.value = data.total
  } catch (err) {
    ElMessage.error(err.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function showDetail(room) {
  try {
    const data = await getRoomDetail(room._id)
    detailRoom.value = data
    detailVisible.value = true
  } catch (err) {
    ElMessage.error(err.message || '加载详情失败')
  }
}

async function handleDissolve(room) {
  try {
    await ElMessageBox.confirm(
      `确定要强制解散房间「${room.name}」吗？解散后将生成结算记录，不可恢复。`,
      '强制解散',
      { confirmButtonText: '确认解散', cancelButtonText: '取消', type: 'warning' }
    )
    await dissolveRoom(room._id)
    ElMessage.success('解散成功')
    loadRooms()
  } catch (err) {
    if (err !== 'cancel') ElMessage.error(err.message || '解散失败')
  }
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(loadRooms)
</script>
