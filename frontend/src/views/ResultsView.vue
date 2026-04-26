<template>
  <div class="results-root">
    <header class="header">
      <div class="header-brand">
        <p class="logo-mark">CHCCI-COSE</p>
        <p class="logo-sub">Commission on Student Election</p>
      </div>
      <div class="header-right">
        <button class="back-dash-btn" @click="router.push('/dashboard')">← DASHBOARD</button>
        <button class="logout-btn" @click="auth.logout()">LOG OUT</button>
      </div>
    </header>

    <main class="main">
      <!-- Loading -->
      <div v-if="loading" class="center"><span class="spinner" /></div>

      <!-- No published results -->
      <div v-else-if="!elections.length" class="empty">
        <p class="empty-icon">○</p>
        <p class="empty-title">No Results Published</p>
        <p class="empty-sub">Results will appear here once the election committee publishes them.</p>
      </div>

      <!-- Election list (pick one) -->
      <template v-else-if="!selected">
        <div class="page-header">
          <p class="page-label">OFFICIAL RESULTS</p>
          <h1 class="page-title">Published Elections</h1>
        </div>
        <div class="election-list">
          <div
            v-for="e in elections"
            :key="e._id"
            class="election-card"
            @click="loadResults(e)"
          >
            <div>
              <p class="card-label">{{ e.academicYear }} · {{ e.semester }} Semester</p>
              <h2 class="card-title">{{ e.title }}</h2>
              <p class="card-meta">{{ e.totalVotesCast || 0 }} votes cast</p>
            </div>
            <span class="card-arrow">→</span>
          </div>
        </div>
      </template>

      <!-- Results detail for selected election -->
      <template v-else-if="results">
        <div class="page-header">
          <div>
            <p class="page-label">OFFICIAL RESULTS</p>
            <h1 class="page-title">{{ results.election.title }}</h1>
            <p class="page-meta">{{ results.election.academicYear }} · {{ results.election.semester }} Semester · {{ results.election.totalVotesCast }} votes cast</p>
          </div>
          <button class="back-btn" @click="selected = null; results = null">← BACK</button>
        </div>

        <!-- Per-position results -->
        <div v-for="pos in results.results" :key="pos.positionId" class="position-section">
          <p class="pos-label">{{ pos.positionTitle }}</p>

          <div v-if="!pos.candidates.length" class="no-candidates">No candidates registered.</div>

          <div
            v-for="(c, idx) in pos.candidates"
            :key="c.id"
            class="candidate-row"
            :class="{ winner: idx === 0 && pos.totalVotes > 0 }"
          >
            <!-- Rank -->
            <div class="rank" :class="{ 'rank-winner': idx === 0 && pos.totalVotes > 0 }">
              {{ idx === 0 && pos.totalVotes > 0 ? '★' : idx + 1 }}
            </div>

            <!-- Photo -->
            <div class="cand-photo-wrap">
              <img v-if="c.photoUrl" :src="c.photoUrl" class="cand-photo" :alt="c.fullName" />
              <div v-else class="cand-initials">{{ initials(c.fullName) }}</div>
            </div>

            <!-- Info -->
            <div class="cand-info">
              <p class="cand-name">{{ c.fullName }}</p>
              <p class="cand-dept">{{ c.department }}<span v-if="c.yearLevel"> · Year {{ c.yearLevel }}</span></p>
              <p v-if="c.platform" class="cand-platform">"{{ c.platform }}"</p>
            </div>

            <!-- Vote bar + count -->
            <div class="cand-votes">
              <div class="vote-bar-wrap">
                <div
                  class="vote-bar"
                  :style="{ width: pos.totalVotes ? ((c.voteCount / pos.totalVotes) * 100) + '%' : '0%' }"
                  :class="{ 'bar-winner': idx === 0 && pos.totalVotes > 0 }"
                />
              </div>
              <div class="vote-numbers">
                <span class="vote-count">{{ c.voteCount }}</span>
                <span class="vote-pct">{{ pos.totalVotes ? ((c.voteCount / pos.totalVotes) * 100).toFixed(1) : '0.0' }}%</span>
              </div>
            </div>
          </div>
        </div>

        <p class="official-note">
          ✦ Results officially published by the CHCCI Commission on Student Election (COSE)
        </p>
      </template>

      <!-- Loading results detail -->
      <div v-else class="center"><span class="spinner" /></div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { electionsAPI } from '@/utils/api'
import { useToast } from 'vue-toastification'

const auth      = useAuthStore()
const router    = useRouter()
const toast     = useToast()
const elections = ref([])
const loading   = ref(true)
const selected  = ref(null)
const results   = ref(null)

onMounted(async () => {
  try {
    const r = await electionsAPI.getPublished()
    elections.value = r.data.data
  } catch {
    toast.error('Failed to load results')
  } finally {
    loading.value = false
  }
})

async function loadResults(election) {
  selected.value = election
  results.value  = null
  try {
    const r = await electionsAPI.getPublishedResults(election._id)
    results.value = r.data.data
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to load results')
    selected.value = null
  }
}

function initials(name) {
  return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
}
</script>

<style scoped>
.results-root { min-height: 100vh; background: var(--ink); display: flex; flex-direction: column; }

.header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 40px; border-bottom: var(--border-dim);
  background: rgba(5,8,15,0.8); backdrop-filter: blur(8px);
  position: sticky; top: 0; z-index: 10;
}
.header-brand { display: flex; flex-direction: column; gap: 2px; }
.logo-mark { font-family: var(--font-mono); font-size: 13px; letter-spacing: 5px; color: var(--gold); font-weight: 600; }
.logo-sub  { font-family: var(--font-mono); font-size: 9px; letter-spacing: 2px; color: var(--stone); }
.header-right { display: flex; align-items: center; gap: 12px; }
.back-dash-btn { background: transparent; border: var(--border-dim); color: var(--gold); padding: 8px 16px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px; cursor: pointer; transition: all 0.2s; }
.back-dash-btn:hover { background: rgba(196,169,106,0.06); }
.logout-btn { background: transparent; border: var(--border-dim); color: var(--stone); padding: 8px 16px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px; cursor: pointer; transition: all 0.2s; }
.logout-btn:hover { color: var(--gold); border-color: rgba(196,169,106,0.3); }

.main { flex: 1; max-width: 860px; margin: 0 auto; width: 100%; padding: 48px 32px; }

.center { display: flex; justify-content: center; padding: 80px; }

.empty { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 80px; text-align: center; }
.empty-icon  { font-size: 48px; color: var(--stone); }
.empty-title { font-family: var(--font-display); font-size: 1.6rem; color: var(--cream); }
.empty-sub   { font-family: var(--font-body); color: var(--mist); }

.page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 36px; }
.page-label  { font-family: var(--font-mono); font-size: 10px; letter-spacing: 4px; color: var(--gold); opacity: 0.6; margin-bottom: 6px; }
.page-title  { font-family: var(--font-display); font-size: 2rem; color: var(--cream); }
.page-meta   { font-family: var(--font-mono); font-size: 11px; color: var(--stone); margin-top: 6px; letter-spacing: 1px; }

.back-btn { background: transparent; border: var(--border-dim); color: var(--gold); padding: 10px 20px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.back-btn:hover { background: rgba(196,169,106,0.06); }

/* Election list */
.election-list { display: flex; flex-direction: column; gap: 12px; }
.election-card {
  display: flex; justify-content: space-between; align-items: center;
  background: var(--ink-mid); border: var(--border-dim);
  padding: 24px 28px; cursor: pointer; transition: all 0.2s;
}
.election-card:hover { border-color: rgba(196,169,106,0.35); background: rgba(196,169,106,0.04); }
.card-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px; color: var(--gold); opacity: 0.6; margin-bottom: 6px; }
.card-title { font-family: var(--font-display); font-size: 1.3rem; color: var(--cream); }
.card-meta  { font-family: var(--font-mono); font-size: 11px; color: var(--stone); margin-top: 4px; }
.card-arrow { font-size: 20px; color: var(--gold); opacity: 0.4; }

/* Position sections */
.position-section { margin-bottom: 40px; }
.pos-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 4px; color: var(--gold); opacity: 0.7; margin-bottom: 12px; text-transform: uppercase; }
.no-candidates { font-family: var(--font-mono); font-size: 11px; color: var(--stone); padding: 16px 0; }

/* Candidate row */
.candidate-row {
  display: flex; align-items: center; gap: 16px;
  padding: 16px 20px; border: var(--border-dim);
  margin-bottom: 6px; transition: all 0.2s;
  background: var(--ink-mid);
}
.candidate-row.winner {
  border-color: rgba(196,169,106,0.4);
  background: rgba(196,169,106,0.05);
}

.rank {
  font-family: var(--font-mono); font-size: 13px; color: var(--stone);
  width: 28px; text-align: center; flex-shrink: 0;
}
.rank-winner { color: var(--gold); font-size: 18px; }

.cand-photo-wrap {
  width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0;
  overflow: hidden; border: 1px solid rgba(196,169,106,0.2);
  background: rgba(196,169,106,0.08);
  display: flex; align-items: center; justify-content: center;
}
.cand-photo    { width: 100%; height: 100%; object-fit: cover; }
.cand-initials { font-family: var(--font-mono); font-size: 14px; color: var(--gold); font-weight: 600; }

.cand-info { flex: 1; min-width: 0; }
.cand-name { font-family: var(--font-display); font-size: 1.1rem; color: var(--cream); }
.cand-dept { font-family: var(--font-mono); font-size: 10px; color: var(--stone); letter-spacing: 1px; margin-top: 2px; }
.cand-platform { font-family: var(--font-body); font-size: 0.85rem; color: var(--mist); font-style: italic; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.cand-votes { display: flex; flex-direction: column; gap: 6px; min-width: 140px; }
.vote-bar-wrap { height: 4px; background: rgba(196,169,106,0.1); border-radius: 2px; overflow: hidden; }
.vote-bar { height: 100%; background: rgba(196,169,106,0.3); border-radius: 2px; transition: width 0.6s ease; }
.bar-winner { background: var(--gold); }
.vote-numbers { display: flex; justify-content: space-between; }
.vote-count { font-family: var(--font-mono); font-size: 16px; color: var(--cream); font-weight: 600; }
.vote-pct   { font-family: var(--font-mono); font-size: 12px; color: var(--stone); }

.official-note {
  margin-top: 48px; padding-top: 24px; border-top: var(--border-dim);
  font-family: var(--font-mono); font-size: 10px; letter-spacing: 1px;
  color: var(--stone); text-align: center;
}


@media (max-width: 900px) {
  .header { padding: 12px 16px; }
  .header-right { gap: 6px; }
  .back-dash-btn, .logout-btn { padding: 6px 10px; font-size: 9px; letter-spacing: 1px; }
  .main { padding: 24px 16px; }
  .page-header { flex-direction: column; gap: 12px; }
  .page-title { font-size: clamp(1.3rem, 3vw, 2rem); }
  .candidate-row { flex-wrap: wrap; gap: 10px; padding: 12px; }
  .cand-votes { min-width: 100%; order: 4; }
  .election-card { padding: 16px; }
}
@media (max-width: 480px) {
  .main { padding: 14px 12px; }
  .cand-photo-wrap { width: 38px; height: 38px; }
  .rank { width: 22px; font-size: 11px; }
  .cand-name { font-size: 1rem; }
}

</style>
