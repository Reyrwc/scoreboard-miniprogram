<template>
  <div class="dashboard">
    <h2 style="margin-bottom: 20px">数据看板</h2>

    <!-- 指标卡片 -->
    <el-row :gutter="20" style="margin-bottom: 24px">
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-value">{{ stats.totalUsers }}</div>
            <div class="stat-label">总用户数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-value">{{ stats.totalRooms }}</div>
            <div class="stat-label">总房间数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-value">{{ stats.todayActiveRooms }}</div>
            <div class="stat-label">今日活跃房间</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 趋势图 -->
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <template #header>用户增长趋势（近 30 天）</template>
          <div ref="userChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>房间增长趋势（近 30 天）</template>
          <div ref="roomChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { getDashboard } from '../api/admin.js'

const stats = reactive({
  totalUsers: 0,
  totalRooms: 0,
  todayActiveRooms: 0,
  userTrend: [],
  roomTrend: []
})

const userChartRef = ref()
const roomChartRef = ref()
let userChart = null
let roomChart = null

function renderChart(el, data, title) {
  const chart = echarts.init(el)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, bottom: 30, top: 30 },
    xAxis: {
      type: 'category',
      data: data.map(d => d.date.slice(5)),
      axisLabel: { rotate: 45 }
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [{
      name: title,
      type: 'line',
      smooth: true,
      areaStyle: { opacity: 0.3 },
      data: data.map(d => d.count)
    }]
  })
  return chart
}

onMounted(async () => {
  try {
    const data = await getDashboard()
    Object.assign(stats, data)
    await nextTick()
    userChart = renderChart(userChartRef.value, stats.userTrend, '新增用户')
    roomChart = renderChart(roomChartRef.value, stats.roomTrend, '新增房间')

    window.addEventListener('resize', handleResize)
  } catch (err) {
    ElMessage.error(err.message || '加载数据失败')
  }
})

function handleResize() {
  userChart?.resize()
  roomChart?.resize()
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  userChart?.dispose()
  roomChart?.dispose()
})
</script>

<style scoped>
.stat-card {
  text-align: center;
  padding: 10px 0;
}
.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #409eff;
}
.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 8px;
}
</style>
