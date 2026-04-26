<template>
  <div class="ballot-root">
    <!-- Dynamic watermark -->
    <div
      v-if="stage !== 'loading' && stage !== 'confirmed'"
      class="watermark"
      :style="{ left: wm.x + '%', top: wm.y + '%' }"
    >{{ auth.user?.email }} · {{ today }}</div>

    <!-- DevTools warning -->
    <transition name="fade">
      <div v-if="devToolsWarning" class="overlay-root">
        <div class="security-modal">
          <p class="sec-icon">⚠</p>
          <h3 class="sec-title">Developer Tools Detected</h3>
          <p class="sec-text">
            Browser developer tools have been detected. This attempt has been logged
            and flagged for review by the COSE.
          </p>
          <button class="sec-btn" @click="devToolsWarning = false; blurred = false">
            I UNDERSTAND — CLOSE DEVTOOLS AND CONTINUE
          </button>
        </div>
      </div>
    </transition>

    <!-- Tab-away blur -->
    <transition name="fade">
      <div v-if="blurred && !devToolsWarning" class="overlay-root overlay-blur">
        <div class="blur-modal">
          <p class="blur-icon">○</p>
          <p class="blur-title">BALLOT HIDDEN</p>
          <p class="blur-sub">Your ballot is hidden while you are away from this tab.</p>
          <button class="blur-btn" @click="blurred = false">RETURN TO BALLOT</button>
        </div>
      </div>
    </transition>

    <!-- Main content blurred when tab away -->
    <div class="ballot-inner" :class="{ blurred }">
      <!-- Loading -->
      <div v-if="stage === 'loading'" class="center-state">
        <span class="spinner" />
        <p class="loading-text">LOADING BALLOT</p>
      </div>

      <!-- Confirmed -->
      <ConfirmedState v-else-if="stage === 'confirmed'" :receipt="receipt" />

      <!-- Ballot + Review -->
      <template v-else>
        <header class="ballot-header">
          <div>
            <p class="header-label">OFFICIAL BALLOT</p>
            <h1 class="header-title">{{ election?.title }}</h1>
          </div>
          <div class="progress-box">
            <p class="progress-label">{{ completedCount }} of {{ totalPositions }} positions selected</p>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: progress + '%' }" />
            </div>
          </div>
        </header>

        <!-- Ballot step -->
        <BallotStep
          v-if="stage === 'ballot'"
          :positions-with-candidates="positionsWithCandidates"
          :selections="selections"
          :current-index="currentIndex"
          @select="handleSelect"
          @change-position="currentIndex = $event"
          @review="stage = 'review'"
        />

        <!-- Review step -->
        <ReviewStep
          v-else-if="stage === 'review'"
          :positions-with-candidates="positionsWithCandidates"
          :selections="selections"
          :submitting="stage === 'submitting'"
          @back="stage = 'ballot'"
          @submit="handleSubmit"
        />

        <!-- Submitting -->
        <div v-else-if="stage === 'submitting'" class="center-state">
          <span class="spinner" style="width:48px;height:48px;border-width:3px" />
          <p class="loading-text">SEALING YOUR BALLOT...</p>
          <p class="loading-sub">Please do not close this tab</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSecurity } from '@/composables/useSecurity'
import { electionsAPI, candidatesAPI, votesAPI } from '@/utils/api'
import { useToast } from 'vue-toastification'
import { format } from 'date-fns'
import BallotStep    from '@/components/ballot/BallotStep.vue'
import ReviewStep    from '@/components/ballot/ReviewStep.vue'
import ConfirmedState from '@/components/ballot/ConfirmedState.vue'

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()
const toast  = useToast()

const stage      = ref('loading')
const election   = ref(null)
const candidates = ref([])
const selections = ref({})
const votingToken= ref(null)
const receipt    = ref(null)
const currentIndex = ref(0)
const blurred    = ref(false)
const devToolsWarning = ref(false)
const today      = format(new Date(), 'yyyy-MM-dd')

// Watermark randomizer
const wm = ref({ x: 15, y: 20 })
let wmTimer = null

// Security hook
const isVoting = computed(() => ['ballot','review'].includes(stage.value))
useSecurity({
  isVotingPage: isVoting,
  onBlur:       (b) => { blurred.value = b },
  onDevTools:   ()  => { devToolsWarning.value = true; blurred.value = true },
})

onMounted(async () => {
  if (auth.user?.hasVoted) { router.push('/dashboard'); return }
  try {
    // Fetch election and candidates in parallel first
    const [elecRes, candRes] = await Promise.all([
      electionsAPI.getById(route.params.electionId),
      candidatesAPI.getByElection(route.params.electionId),
    ])
    election.value   = elecRes.data.data
    candidates.value = candRes.data.data

    // Fetch voting token separately so we can give a clear error if election isn't active
    let tokenRes
    try {
      tokenRes = await votesAPI.getToken(route.params.electionId)
    } catch (tokenErr) {
      const msg = tokenErr.response?.data?.message || 'Could not get voting token'
      toast.error(msg)
      router.push('/dashboard')
      return
    }

    votingToken.value = tokenRes.data.token
    stage.value       = 'ballot'

    // Randomize watermark every 8s
    wmTimer = setInterval(() => {
      wm.value = { x: 10 + Math.random() * 60, y: 15 + Math.random() * 70 }
    }, 8000)
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to load ballot'
    toast.error(msg)
    router.push('/dashboard')
  }
})

onUnmounted(() => clearInterval(wmTimer))

const positionsWithCandidates = computed(() =>
  (election.value?.positions || []).map(pos => ({
    position: pos,
    candidates: candidates.value.filter(c => c.positionId?.toString() === pos._id?.toString()),
  }))
)

const totalPositions  = computed(() => election.value?.positions?.length || 0)
const completedCount  = computed(() => Object.keys(selections.value).length)
const progress        = computed(() => totalPositions.value ? (completedCount.value / totalPositions.value) * 100 : 0)

function handleSelect(positionId, candidateId) {
  selections.value = { ...selections.value, [positionId]: candidateId }
}

async function handleSubmit() {
  stage.value = 'submitting'
  const ballot = Object.entries(selections.value).map(([positionId, candidateId]) => ({ positionId, candidateId }))
  try {
    const { data } = await votesAPI.submit({
      electionId: route.params.electionId,
      votingToken: votingToken.value,
      ballot,
    })
    receipt.value = data.receiptHash
    stage.value   = 'confirmed'
    auth.updateUser({ hasVoted: true, votedAt: new Date().toISOString() })
  } catch (err) {
    toast.error(err.response?.data?.message || 'Vote submission failed')
    stage.value = 'review'
  }
}
</script>

<style scoped>
.ballot-root { min-height: 100vh; background: var(--ink); position: relative; overflow: hidden; }

.watermark {
  position: fixed; font-family: var(--font-mono); font-size: 11px;
  letter-spacing: 2px; color: var(--gold); white-space: nowrap;
  transform: rotate(-35deg); pointer-events: none; z-index: 50;
  transition: all 2s ease; user-select: none; opacity: 0.07;
}

.overlay-root {
  position: fixed; inset: 0; background: rgba(0,0,0,0.95);
  display: flex; align-items: center; justify-content: center;
  z-index: 9000; padding: 24px;
}
.overlay-blur { background: rgba(8,8,16,0.92); }

.security-modal {
  background: rgba(139,26,26,0.15); border: 1px solid rgba(196,42,42,0.4);
  padding: 48px 40px; max-width: 480px; width: 100%;
  display: flex; flex-direction: column; gap: 16px; align-items: center; text-align: center;
}
.sec-icon  { font-size: 40px; margin-bottom: 8px; }
.sec-title { font-family: var(--font-display); font-size: 1.6rem; color: var(--cream); }
.sec-text  { font-family: var(--font-body); color: var(--mist); line-height: 1.7; }
.sec-btn {
  margin-top: 16px; background: var(--danger); color: var(--ivory);
  border: none; padding: 14px 24px; cursor: pointer;
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 2px;
}

.blur-modal { display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; }
.blur-icon  { font-family: var(--font-mono); font-size: 48px; color: rgba(196,169,106,0.3); animation: pulse 2s infinite; }
.blur-title { font-family: var(--font-mono); font-size: 14px; letter-spacing: 5px; color: var(--gold); }
.blur-sub   { font-family: var(--font-body); color: var(--stone); font-size: 0.95rem; }
.blur-btn {
  background: transparent; border: 1px solid rgba(196,169,106,0.3);
  color: var(--gold); padding: 12px 28px; cursor: pointer;
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 3px;
}

.ballot-inner {
  max-width: 900px; margin: 0 auto; padding: 40px 32px;
  transition: filter 0.3s;
}
.ballot-inner.blurred { filter: blur(20px); pointer-events: none; }

.ballot-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding-bottom: 28px; border-bottom: var(--border-dim); margin-bottom: 32px;
  flex-wrap: wrap; gap: 16px;
}
.header-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 4px; color: var(--gold); opacity: 0.6; margin-bottom: 6px; }
.header-title { font-family: var(--font-display); font-size: clamp(1.4rem, 3vw, 2rem); color: var(--cream); }

.progress-box { display: flex; flex-direction: column; gap: 8px; min-width: 200px; }
.progress-label { font-family: var(--font-mono); font-size: 11px; color: var(--stone); text-align: right; }
.progress-track { height: 3px; background: rgba(196,169,106,0.15); border-radius: 2px; overflow: hidden; }
.progress-fill  { height: 100%; background: var(--gold); border-radius: 2px; transition: width 0.4s ease; }

.center-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 400px; gap: 20px;
}
.loading-text { font-family: var(--font-mono); font-size: 13px; letter-spacing: 4px; color: var(--gold); }
.loading-sub  { font-family: var(--font-mono); font-size: 11px; color: var(--stone); letter-spacing: 1px; }

/* Fade transition */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }


@media (max-width: 900px) {
  .ballot-header { flex-direction: column; gap: 10px; padding: 12px 16px; }
  .progress-box  { min-width: unset; width: 100%; }
  .ballot-main   { padding: clamp(16px,3vw,28px) 16px; }
}
@media (max-width: 480px) {
  .ballot-main { padding: 14px 12px; }
}

</style>
