<template>
  <div class="card">
    <div class="card-top">
      <div class="live-badge">
        <span class="live-dot" />
        <span class="live-text">LIVE</span>
      </div>
      <p class="timer">{{ timeRemaining }}</p>
    </div>
    <p class="card-label">{{ election.academicYear }} · {{ election.semester }} Semester</p>
    <h3 class="card-title">{{ election.title }}</h3>
    <p class="card-desc">{{ election.description }}</p>
    <div class="positions">
      <span v-for="p in displayPositions" :key="p._id" class="pos-tag">{{ p.title }}</span>
      <span v-if="extraCount > 0" class="pos-tag">+{{ extraCount }} more</span>
    </div>
    <button
      class="vote-btn"
      :class="{ voted: hasVoted }"
      :disabled="hasVoted"
      @click="!hasVoted && $emit('vote')"
    >
      {{ hasVoted ? '✓ ALREADY VOTED' : 'CAST YOUR VOTE →' }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  election: { type: Object, required: true },
  hasVoted: { type: Boolean, default: false },
})
defineEmits(['vote'])

const displayPositions = computed(() => props.election.positions?.slice(0, 4) || [])
const extraCount       = computed(() => Math.max(0, (props.election.positions?.length || 0) - 4))

const timeRemaining = computed(() => {
  const end  = new Date(props.election.endDate)
  const diff = end - Date.now()
  if (diff <= 0) return 'ELECTION CLOSED'
  const totalMins = Math.floor(diff / 60000)
  const d = Math.floor(totalMins / 1440)
  const h = Math.floor((totalMins % 1440) / 60)
  const m = totalMins % 60
  if (d > 0) return `${d}d ${h}h remaining`
  if (h > 0) return `${h}h ${m}m remaining`
  return `${m}m remaining`
})
</script>

<style scoped>
.card {
  background: var(--ink-mid); border: var(--border-dim);
  padding: 24px; display: flex; flex-direction: column; gap: 12px;
  transition: border-color 0.2s;
}
.card:hover { border-color: rgba(196,169,106,0.3); }

.card-top { display: flex; justify-content: space-between; align-items: center; }
.live-badge { display: flex; align-items: center; gap: 8px; }
.live-dot {
  width: 8px; height: 8px; border-radius: 50%; background: var(--success);
  box-shadow: 0 0 0 2px rgba(42,138,90,0.3); animation: pulse 2s infinite;
}
.live-text { font-family: var(--font-mono); font-size: 10px; letter-spacing: 3px; color: var(--success); }
.timer { font-family: var(--font-mono); font-size: 11px; color: var(--stone); letter-spacing: 0.5px; }

.card-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px; color: var(--gold); opacity: 0.6; }
.card-title { font-family: var(--font-display); font-size: 1.35rem; color: var(--cream); line-height: 1.3; }
.card-desc  { font-family: var(--font-body); font-size: 0.95rem; color: var(--mist); line-height: 1.5; }

.positions { display: flex; flex-wrap: wrap; gap: 6px; }
.pos-tag {
  font-family: var(--font-mono); font-size: 9px; letter-spacing: 1.5px;
  color: var(--mist); background: rgba(196,169,106,0.06);
  border: 1px solid rgba(196,169,106,0.15); padding: 3px 8px;
}

.vote-btn {
  margin-top: 6px; background: var(--gold); color: var(--ink);
  border: none; padding: 14px 20px;
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 3px;
  font-weight: 600; text-transform: uppercase; cursor: pointer; transition: all 0.2s;
}
.vote-btn:hover:not(:disabled) { background: var(--gold-light); }
.vote-btn.voted { opacity: 0.4; cursor: not-allowed; background: var(--stone); }


@media (max-width: 480px) {
  .card { padding: 16px 14px; gap: 10px; }
  .card-title { font-size: 1.1rem; }
  .vote-btn   { font-size: 10px; padding: 12px; letter-spacing: 2px; }
}

</style>
