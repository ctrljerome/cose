<template>
  <div class="tab-root fade-up">
    <div class="tab-header">
      <p class="tab-label">DASHBOARD</p>
      <h1 class="tab-title">Election Overview</h1>
    </div>

    <div v-if="loading" class="center"><span class="spinner" /></div>
    <template v-else>
      <div class="stat-grid">
        <div
          v-for="s in statCards"
          :key="s.label"
          class="stat-card"
          :class="{ alert: s.alert }"
        >
          <p class="stat-label">{{ s.label }}</p>
          <p class="stat-value" :style="{ color: s.alert ? 'var(--danger)' : 'var(--cream)' }">{{ s.value }}</p>
          <p class="stat-sub">{{ s.sub }}</p>
        </div>
      </div>

      <div v-if="stats?.recentAlerts?.length" class="alert-section">
        <p class="section-label">RECENT SECURITY ALERTS</p>
        <div class="alert-list">
          <div
            v-for="a in stats.recentAlerts"
            :key="a._id"
            class="alert-row"
            :style="{ borderLeftColor: a.severity === 'critical' ? 'var(--danger)' : 'var(--warning)' }"
          >
            <div style="flex:1">
              <p class="alert-action">{{ a.action.replace(/_/g, ' ').toUpperCase() }}</p>
              <p class="alert-meta">{{ a.userEmail || 'System' }}</p>
            </div>
            <p class="alert-time">{{ fmtDate(a.timestamp) }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminAPI } from '@/utils/api'
import { useToast } from 'vue-toastification'
import { format } from 'date-fns'

const toast   = useToast()
const stats   = ref(null)
const loading = ref(true)

onMounted(async () => {
  try { const r = await adminAPI.getStats(); stats.value = r.data.data }
  catch { toast.error('Failed to load stats') }
  finally { loading.value = false }
})

const statCards = computed(() => [
  { label: 'TOTAL STUDENTS',    value: stats.value?.totalStudents ?? '—',   sub: 'registered voters' },
  { label: 'VOTES CAST',        value: stats.value?.totalVoted ?? '—',      sub: `${stats.value?.turnoutPercent ?? 0}% turnout` },
  { label: 'ELECTIONS',         value: stats.value?.totalElections ?? '—',  sub: 'total elections' },
  { label: 'FLAGGED ACCOUNTS',  value: stats.value?.flaggedUsers ?? '—',    sub: 'require review', alert: stats.value?.flaggedUsers > 0 },
])

const fmtDate = (d) => format(new Date(d), 'MMM d, HH:mm')
</script>

<style scoped>
.tab-root { display: flex; flex-direction: column; gap: 32px; max-width: 1000px; }
.tab-header { margin-bottom: 4px; }
.tab-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 4px; color: var(--gold); opacity: 0.6; margin-bottom: 6px; }
.tab-title { font-family: var(--font-display); font-size: 2.2rem; color: var(--cream); font-weight: 700; }

.center { display: flex; justify-content: center; padding: 60px; }

.stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
.stat-card {
  background: var(--ink-mid); border: var(--border-dim);
  padding: 20px; display: flex; flex-direction: column; gap: 6px;
}
.stat-card.alert { border-color: rgba(196,42,42,0.4); }
.stat-label { font-family: var(--font-mono); font-size: 9px; letter-spacing: 3px; color: var(--stone); }
.stat-value { font-family: var(--font-display); font-size: 2rem; font-weight: 700; }
.stat-sub   { font-family: var(--font-mono); font-size: 10px; color: var(--stone); letter-spacing: 0.5px; }

.alert-section { display: flex; flex-direction: column; gap: 12px; }
.section-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 4px; color: var(--gold); opacity: 0.6; }
.alert-list  { display: flex; flex-direction: column; gap: 2px; }
.alert-row {
  display: flex; align-items: center; gap: 16px;
  padding: 12px 16px; background: var(--ink-mid); border: var(--border-dim);
  border-left: 3px solid var(--stone);
}
.alert-action { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1px; color: var(--cream); }
.alert-meta   { font-family: var(--font-mono); font-size: 10px; color: var(--stone); margin-top: 2px; }
.alert-time   { font-family: var(--font-mono); font-size: 10px; color: var(--stone); white-space: nowrap; }


@media (max-width: 600px) {
  .stat-grid { grid-template-columns: 1fr 1fr; }
  .stat-value { font-size: 1.6rem; }
  .tab-title { font-size: 1.6rem; }
}

</style>
