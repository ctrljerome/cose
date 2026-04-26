<template>
  <div class="tab-root fade-up">
    <div class="tab-header-row">
      <div>
        <p class="tab-label">MANAGEMENT</p>
        <h1 class="tab-title">Registered Voters</h1>
      </div>
      <button
        class="outline-btn"
        :class="{ active: flaggedOnly }"
        @click="flaggedOnly = !flaggedOnly"
      >{{ flaggedOnly ? 'SHOW ALL' : 'FLAGGED ONLY' }}</button>
    </div>

    <div v-if="loading" class="center"><span class="spinner" /></div>
    <div v-else class="table-wrap">
      <table class="table">
        <thead>
          <tr class="thead">
            <th v-for="h in ['NAME','EMAIL','DEPT','YR','VOTED','RISK','STATUS']" :key="h" class="th">{{ h }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u._id" class="tr">
            <td class="td"><p class="td-name">{{ u.fullName }}</p></td>
            <td class="td td-mono">{{ u.email }}</td>
            <td class="td td-mono">{{ u.department }}</td>
            <td class="td td-mono">{{ u.yearLevel || '—' }}</td>
            <td class="td">
              <span :class="u.hasVoted ? 'voted-yes' : 'voted-no'">{{ u.hasVoted ? '✓ YES' : '— NO' }}</span>
            </td>
            <td class="td">
              <span class="risk-score" :style="{ color: riskColor(u.riskScore) }">{{ u.riskScore }}</span>
            </td>
            <td class="td">
              <span v-if="u.isFlagged" class="badge-flag">FLAGGED</span>
              <span v-else class="badge-ok">OK</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!users.length" class="empty-msg">NO USERS FOUND</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { adminAPI } from '@/utils/api'
import { useToast } from 'vue-toastification'

const toast      = useToast()
const users      = ref([])
const loading    = ref(true)
const flaggedOnly= ref(false)

async function load() {
  loading.value = true
  try {
    const r = await adminAPI.getUsers({ flagged: flaggedOnly.value || undefined })
    users.value = r.data.data
  } catch { toast.error('Failed to load users') }
  finally { loading.value = false }
}

onMounted(load)
watch(flaggedOnly, load)

const riskColor = (score) =>
  score >= 50 ? 'var(--danger)' : score >= 20 ? 'var(--warning)' : 'var(--stone)'
</script>

<style scoped>
.tab-root { display: flex; flex-direction: column; gap: 28px; max-width: 1000px; }
.tab-header-row { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; }
.tab-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 4px; color: var(--gold); opacity: 0.6; margin-bottom: 6px; }
.tab-title { font-family: var(--font-display); font-size: 2.2rem; color: var(--cream); font-weight: 700; }

.outline-btn { background: transparent; border: 1px solid rgba(196,169,106,0.25); color: var(--gold); padding: 10px 20px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px; cursor: pointer; transition: all 0.2s; }
.outline-btn.active { border-color: var(--danger); color: var(--danger); }

.center { display: flex; justify-content: center; padding: 60px; }
.table-wrap { overflow-x: auto; border: var(--border-dim); }
.table { width: 100%; border-collapse: collapse; }
.thead { background: rgba(196,169,106,0.04); }
.th { padding: 12px 16px; text-align: left; font-family: var(--font-mono); font-size: 9px; letter-spacing: 2px; color: var(--stone); border-bottom: var(--border-dim); white-space: nowrap; }
.tr { border-bottom: 1px solid rgba(196,169,106,0.06); }
.td { padding: 13px 16px; vertical-align: middle; }
.td-name { font-family: var(--font-body); color: var(--cream); font-size: 1rem; }
.td-mono { font-family: var(--font-mono); font-size: 11px; color: var(--stone); }

.voted-yes { font-family: var(--font-mono); font-size: 11px; color: var(--success); }
.voted-no  { font-family: var(--font-mono); font-size: 11px; color: var(--stone); }
.risk-score { font-family: var(--font-mono); font-size: 13px; font-weight: 600; }

.badge-flag { font-family: var(--font-mono); font-size: 9px; letter-spacing: 2px; color: var(--danger); border: 1px solid rgba(196,42,42,0.4); padding: 3px 8px; }
.badge-ok   { font-family: var(--font-mono); font-size: 9px; letter-spacing: 2px; color: var(--stone); border: 1px solid rgba(196,169,106,0.15); padding: 3px 8px; }

.empty-msg { font-family: var(--font-mono); font-size: 13px; color: var(--stone); text-align: center; padding: 40px; }


@media (max-width: 900px) {
  .tab-header-row { flex-direction: column; gap: 12px; align-items: flex-start; }
  .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  table { min-width: 520px; }
}

</style>
