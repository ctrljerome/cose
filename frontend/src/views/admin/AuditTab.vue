<template>
  <div class="tab-root fade-up">
    <div>
      <p class="tab-label">FORENSICS</p>
      <h1 class="tab-title">Audit Log</h1>
    </div>

    <!-- Filters -->
    <div class="filters">
      <button
        v-for="cat in categories"
        :key="cat"
        class="filter-btn"
        :class="{ active: filters.category === cat }"
        @click="filters.category = cat"
      >{{ cat || 'ALL' }}</button>
      <div class="filter-divider" />
      <button
        v-for="sev in severities"
        :key="sev"
        class="filter-btn"
        :class="{ active: filters.severity === sev }"
        :style="{ color: filters.severity === sev ? severityColor(sev) : '' }"
        @click="filters.severity = sev"
      >{{ sev || 'ALL SEVERITY' }}</button>
    </div>

    <div v-if="loading" class="center"><span class="spinner" /></div>
    <div v-else class="log-list">
      <div
        v-for="log in logs"
        :key="log._id"
        class="log-row"
        :style="{ borderLeftColor: severityColor(log.severity) }"
      >
        <div style="flex:1">
          <p class="log-action" :style="{ color: severityColor(log.severity) }">
            {{ log.action.replace(/_/g, ' ').toUpperCase() }}
          </p>
          <p class="log-meta">{{ log.userEmail || 'System' }} · {{ log.category }}</p>
        </div>
        <div style="text-align:right">
          <p class="log-sev" :style="{ color: severityColor(log.severity) }">{{ log.severity.toUpperCase() }}</p>
          <p class="log-time">{{ fmtDate(log.timestamp) }}</p>
        </div>
      </div>
      <p v-if="!logs.length" class="empty-msg">NO LOGS FOUND</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { adminAPI } from '@/utils/api'
import { useToast } from 'vue-toastification'
import { format } from 'date-fns'

const toast   = useToast()
const logs    = ref([])
const loading = ref(true)

const filters = ref({ category: '', severity: '' })

const categories = ['', 'auth', 'vote', 'security', 'admin', 'access']
const severities = ['', 'info', 'warning', 'critical']

const sevColors = { info: 'var(--stone)', warning: 'var(--warning)', critical: 'var(--danger)' }
const severityColor = (s) => sevColors[s] || 'var(--stone)'
const fmtDate = (d) => format(new Date(d), 'MMM d, HH:mm:ss')

async function load() {
  loading.value = true
  try {
    const params = { limit: 100 }
    if (filters.value.category) params.category = filters.value.category
    if (filters.value.severity) params.severity = filters.value.severity
    const r = await adminAPI.getAuditLogs(params)
    logs.value = r.data.data
  } catch { toast.error('Failed to load logs') }
  finally { loading.value = false }
}

onMounted(load)
watch(filters, load, { deep: true })
</script>

<style scoped>
.tab-root { display: flex; flex-direction: column; gap: 24px; max-width: 1000px; }
.tab-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 4px; color: var(--gold); opacity: 0.6; margin-bottom: 6px; }
.tab-title { font-family: var(--font-display); font-size: 2.2rem; color: var(--cream); font-weight: 700; }

.filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.filter-btn {
  background: transparent; border: 1px solid rgba(196,169,106,0.15);
  color: var(--stone); padding: 6px 14px; font-family: var(--font-mono);
  font-size: 10px; letter-spacing: 1.5px; cursor: pointer;
  text-transform: uppercase; transition: all 0.2s;
}
.filter-btn.active { border-color: var(--gold); color: var(--gold); }
.filter-divider { width: 1px; height: 24px; background: rgba(196,169,106,0.15); }

.center { display: flex; justify-content: center; padding: 60px; }

.log-list { display: flex; flex-direction: column; gap: 2px; }
.log-row {
  display: flex; align-items: center; gap: 16px;
  padding: 12px 16px; background: var(--ink-mid); border: var(--border-dim);
  border-left: 3px solid var(--stone);
}
.log-action { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1px; }
.log-meta   { font-family: var(--font-mono); font-size: 10px; color: var(--stone); margin-top: 2px; }
.log-sev    { font-family: var(--font-mono); font-size: 10px; letter-spacing: 1px; }
.log-time   { font-family: var(--font-mono); font-size: 10px; color: var(--stone); white-space: nowrap; margin-top: 2px; }

.empty-msg { font-family: var(--font-mono); font-size: 13px; color: var(--stone); text-align: center; padding: 40px; }


@media (max-width: 900px) {
  .filter-row { flex-direction: column; gap: 8px; }
  .log-row { flex-wrap: wrap; gap: 6px; padding: 12px; }
}

</style>
