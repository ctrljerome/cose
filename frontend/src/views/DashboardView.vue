<template>
  <div class="dash-root">
    <!-- Header -->
    <header class="header">
      <div class="header-left">
        <p class="logo-mark">CHCCI-COSE</p>
        <p class="logo-sub">Commission on Student Election</p>
        <div class="h-divider" />
        <p class="h-sub">Student Election Portal</p>
      </div>
      <div class="header-right">
        <div class="user-chip">
          <span class="online-dot" />
          <span class="user-email">{{ auth.user?.email }}</span>
        </div>
        <button class="logout-btn" @click="auth.logout()">LOG OUT</button>
      </div>
    </header>

    <main class="main">
      <!-- Welcome -->
      <div class="welcome fade-up">
        <p class="welcome-label">WELCOME BACK</p>
        <h1 class="welcome-name">{{ auth.user?.fullName }}</h1>
        <p class="welcome-meta">{{ auth.user?.department }} · Year {{ auth.user?.yearLevel }}</p>
      </div>

      <!-- Voted banner -->
      <transition name="slide">
        <div v-if="auth.user?.hasVoted" class="voted-banner">
          <div class="voted-check">✓</div>
          <div>
            <p class="voted-title">Your vote has been recorded</p>
            <p class="voted-sub">
              Cast on {{ auth.user.votedAt ? formatDate(auth.user.votedAt) : '—' }}.
              Your ballot is anonymous, encrypted, and immutable.
            </p>
          </div>
        </div>
      </transition>

      <!-- Active elections -->
      <section class="section fade-up">
        <div class="section-header">
          <div class="section-line" />
          <h2 class="section-title">ACTIVE ELECTIONS</h2>
          <div class="section-line flex-1" />
        </div>

        <div v-if="loading" class="center-loader">
          <span class="spinner" />
        </div>
        <div v-else-if="elections.length === 0" class="empty">
          <p class="empty-icon">○</p>
          <p class="empty-text">No elections are currently active.</p>
        </div>
        <div v-else class="card-grid">
          <ElectionCard
            v-for="e in elections"
            :key="e._id"
            :election="e"
            :has-voted="auth.user?.hasVoted"
            @vote="router.push(`/vote/${e._id}`)"
          />
        </div>
      </section>

      <!-- Published results -->
      <section v-if="published.length" class="section fade-up">
        <div class="section-header">
          <div class="section-line" />
          <h2 class="section-title">PUBLISHED RESULTS</h2>
          <div class="section-line flex-1" />
        </div>
        <div class="card-grid">
          <div
            v-for="e in published"
            :key="e._id"
            class="result-card"
            @click="router.push('/results')"
          >
            <p class="card-label">RESULTS AVAILABLE</p>
            <h3 class="card-title">{{ e.title }}</h3>
            <p class="card-meta">{{ e.academicYear }} · {{ e.semester }} Semester</p>
            <p class="card-link">VIEW RESULTS →</p>
          </div>
        </div>
      </section>
    </main>

    <footer class="footer">
      <p>All voting actions are encrypted, anonymized, and permanently logged.</p>
      <p>© {{ year }} CHCCI-COSE</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { electionsAPI } from '@/utils/api'
import { useToast } from 'vue-toastification'
import { format } from 'date-fns'
import ElectionCard from '@/components/ballot/ElectionCard.vue'

const auth   = useAuthStore()
const router = useRouter()
const toast  = useToast()

const elections = ref([])
const published = ref([])
const loading   = ref(true)
const year      = new Date().getFullYear()

function formatDate(d) { return format(new Date(d), 'MMMM d, yyyy · h:mm a') }

onMounted(async () => {
  try {
    const [actRes, pubRes] = await Promise.all([
      electionsAPI.getActive(),
      electionsAPI.getPublished(),
    ])
    elections.value = actRes.data.data
    published.value = pubRes.data.data
  } catch { toast.error('Failed to load elections') }
  finally { loading.value = false }
})
</script>

<style scoped>
.dash-root { min-height: 100vh; background: var(--ink); display: flex; flex-direction: column; }

.header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 40px; border-bottom: var(--border-dim);
  background: rgba(0,0,0,0.5); backdrop-filter: blur(8px);
  position: sticky; top: 0; z-index: 100;
}
.header-left { display: flex; align-items: center; gap: 16px; }
.logo-mark { font-family: var(--font-mono); font-size: 13px; letter-spacing: 5px; color: var(--gold); font-weight: 600; }
.logo-sub { font-family: var(--font-mono); font-size: 9px; letter-spacing: 2px; color: var(--stone); margin-top: 3px; }
.h-divider { width: 1px; height: 20px; background: rgba(196,169,106,0.2); }
.h-sub { font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px; color: var(--stone); text-transform: uppercase; }
.header-right { display: flex; align-items: center; gap: 16px; }
.user-chip {
  display: flex; align-items: center; gap: 8px;
  background: var(--ink-mid); border: var(--border-dim);
  padding: 6px 14px;
}
.online-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--success); flex-shrink: 0; }
.user-email { font-family: var(--font-mono); font-size: 11px; color: var(--mist); letter-spacing: 0.5px; }
.logout-btn {
  background: transparent; border: var(--border-dim); color: var(--stone);
  padding: 6px 14px; font-family: var(--font-mono); font-size: 10px;
  letter-spacing: 2px; cursor: pointer; text-transform: uppercase; transition: all 0.2s;
}
.logout-btn:hover { color: var(--gold); border-color: rgba(196,169,106,0.3); }

.main { flex: 1; max-width: 1100px; margin: 0 auto; width: 100%; padding: 48px 40px; display: flex; flex-direction: column; gap: 56px; }

.welcome { display: flex; flex-direction: column; gap: 8px; }
.welcome-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 4px; color: var(--gold); opacity: 0.6; }
.welcome-name { font-family: var(--font-display); font-size: clamp(2rem, 4vw, 3.5rem); color: var(--cream); font-weight: 700; }
.welcome-meta { font-family: var(--font-mono); font-size: 12px; color: var(--stone); letter-spacing: 1px; }

.voted-banner {
  display: flex; align-items: center; gap: 20px;
  background: rgba(42,138,90,0.08); border: 1px solid rgba(42,138,90,0.3);
  padding: 20px 24px;
}
.voted-check {
  width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
  background: rgba(42,138,90,0.2); border: 1px solid rgba(42,138,90,0.5);
  display: flex; align-items: center; justify-content: center;
  color: var(--success); font-size: 18px;
}
.voted-title { font-family: var(--font-mono); font-size: 13px; letter-spacing: 1px; color: var(--success); font-weight: 600; }
.voted-sub { font-family: var(--font-body); font-size: 0.95rem; color: var(--mist); margin-top: 4px; }

.section { display: flex; flex-direction: column; gap: 28px; }
.section-header { display: flex; align-items: center; gap: 16px; }
.section-line { height: 1px; width: 40px; background: rgba(196,169,106,0.2); }
.flex-1 { flex: 1; width: auto; }
.section-title { font-family: var(--font-mono); font-size: 11px; letter-spacing: 4px; color: var(--gold); opacity: 0.7; white-space: nowrap; }

.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }

.result-card {
  background: var(--ink-mid); border: var(--border-dim);
  padding: 24px; display: flex; flex-direction: column; gap: 10px;
  cursor: pointer; transition: border-color 0.2s;
}
.result-card:hover { border-color: rgba(196,169,106,0.35); }
.card-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px; color: var(--gold); opacity: 0.6; }
.card-title { font-family: var(--font-display); font-size: 1.3rem; color: var(--cream); }
.card-meta  { font-family: var(--font-mono); font-size: 11px; color: var(--stone); }
.card-link  { font-family: var(--font-mono); font-size: 11px; letter-spacing: 2px; color: var(--gold); margin-top: 4px; }

.center-loader { display: flex; justify-content: center; padding: 48px; }
.empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 56px; }
.empty-icon { font-family: var(--font-mono); font-size: 36px; color: var(--stone); }
.empty-text { font-family: var(--font-mono); font-size: 13px; letter-spacing: 2px; color: var(--stone); }

.footer {
  border-top: var(--border-dim); padding: 20px 40px;
  display: flex; justify-content: space-between;
}
.footer p { font-family: var(--font-mono); font-size: 10px; color: var(--stone); letter-spacing: 0.3px; }


/* ── Responsive ── */
@media (max-width: 900px) {
  .header { padding: 12px 16px; flex-wrap: wrap; gap: 8px; }
  .header-left { flex-wrap: wrap; gap: 8px; }
  .h-divider, .h-sub { display: none; }
  .main { padding: clamp(20px,3vw,32px) 16px; gap: 36px; }
  .welcome-name { font-size: clamp(1.8rem, 5vw, 2.8rem); }
  .card-grid { grid-template-columns: 1fr; }
  .voted-banner { flex-direction: column; gap: 12px; }
  .footer { flex-direction: column; gap: 4px; text-align: center; padding: 14px 16px; }
}
@media (max-width: 600px) {
  .user-email { display: none; }
  .header { padding: 10px 12px; }
  .main { padding: 16px 12px; gap: 28px; }
  .welcome-name { font-size: 1.6rem; }
  .welcome-meta { font-size: 11px; }
}

</style>
