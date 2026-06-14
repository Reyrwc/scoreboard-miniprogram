<template>
  <div class="dashboard">
    <h2 style="margin-bottom: 20px">数据看板</h2>

    <!-- 指标卡片 -->
    <el-row :gutter="16" style="margin-bottom: 24px">
      <el-col :span="4" :xs="12" :sm="8" :md="4">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-value">{{ stats.totalUsers }}</div>
            <div class="stat-label">总用户数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4" :xs="12" :sm="8" :md="4">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-value">{{ stats.totalRooms }}</div>
            <div class="stat-label">总房间数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4" :xs="12" :sm="8" :md="4">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-value accent">{{ stats.todayActiveRooms }}</div>
            <div class="stat-label">今日活跃房间</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4" :xs="12" :sm="8" :md="4">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-value accent">{{ stats.todayActiveUsers }}</div>
            <div class="stat-label">今日活跃人数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4" :xs="12" :sm="8" :md="4">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-value accent">{{ stats.todayScoreCount }}</div>
            <div class="stat-label">今日记分次数</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 活跃时间段热力图 -->
    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :span="24">
        <el-card>
          <template #header>活跃时间段（近 30 天）</template>
          <div ref="heatmapRef" style="height: 260px"></div>
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
  todayActiveUsers: 0,
  todayScoreCount: 0,
  userTrend: [],
  roomTrend: [],
  hourlyHeatmap: []
})

const userChartRef = ref()
const roomChartRef = ref()
const heatmapRef = ref()
let userChart = null
let roomChart = null
let heatmapChart = null

const DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const HOURS = Array.from({ length: 24 }, (_, i) => `${i}:00`)

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

function renderHeatmap(el, data) {
  const chart = echarts.init(el)
  const maxVal = Math.max(...data.map(d => d[2]), 1)

  chart.setOption({
    tooltip: {
      formatter: ({ data: [hour, day, val] }) =>
        `${DAYS[day]} ${hour}:00<br/>记分 <b>${val}</b> 次`
    },
    grid: { left: 50, right: 20, bottom: 30, top: 10 },
    xAxis: {
      type: 'category',
      data: HOURS,
      axisLabel: { interval: 1 }
    },
    yAxis: {
      type: 'category',
      data: DAYS
    },
    visualMap: {
      min: 0,
      max: maxVal,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: { color: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'] }
    },
    series: [{
      type: 'heatmap',
      data,
      emphasis: {
        itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0, 0, 0, 0.3)' }
      }
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
    heatmapChart = renderHeatmap(heatmapRef.value, stats.hourlyHeatmap)

    window.addEventListener('resize', handleResize)
  } catch (err) {
    ElMessage.error(err.message || '加载数据失败')
  }
})

function handleResize() {
  userChart?.resize()
  roomChart?.resize()
  heatmapChart?.resize()
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  userChart?.dispose()
  roomChart?.dispose()
  heatmapChart?.dispose()
})
</script>

<style scoped>
.stat-card {
  text-align: center;
  padding: 10px 0;
}
.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #409eff;
}
.stat-value.accent {
  color: #67c23a;
}
.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 8px;
}
</style>
