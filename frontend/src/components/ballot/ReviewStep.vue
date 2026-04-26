<template>
  <div class="review-root">
    <div class="review-header">
      <p class="review-badge">BALLOT REVIEW</p>
      <h2 class="review-title">Confirm Your Selections</h2>
      <p class="review-sub">
        Review carefully. Once submitted, your vote is
        <strong>permanent and cannot be changed.</strong>
      </p>
    </div>

    <div class="review-list">
      <div
        v-for="pw in positionsWithCandidates"
        :key="pw.position._id"
        class="review-row"
      >
        <div>
          <p class="review-pos">{{ pw.position.title }}</p>
          <p class="review-name">{{ selectedCandidate(pw.position._id)?.fullName }}</p>
          <p class="review-meta">
            {{ selectedCandidate(pw.position._id)?.department }} ·
            Year {{ selectedCandidate(pw.position._id)?.yearLevel }}
          </p>
        </div>
        <div class="review-check">✓</div>
      </div>
    </div>

    <div class="confirm-row">
      <label class="confirm-label">
        <input
          v-model="confirmed"
          type="checkbox"
          style="margin-right:10px;accent-color:var(--gold)"
        />
        I confirm these are my final selections and understand this action is irreversible.
      </label>
    </div>

    <div class="review-actions">
      <button class="back-btn" :disabled="submitting" @click="$emit('back')">
        ← EDIT BALLOT
      </button>
      <button
        class="submit-btn"
        :disabled="!confirmed || submitting"
        :style="{ opacity: confirmed ? 1 : 0.4 }"
        @click="confirmed && !submitting && $emit('submit')"
      >
        <span v-if="submitting" style="display:flex;align-items:center;gap:10px">
          <span class="spinner spinner--sm" /> SEALING BALLOT...
        </span>
        <span v-else>SEAL &amp; SUBMIT BALLOT →</span>
      </button>
    </div>

    <div class="review-warning">
      🔒 Your ballot will be encrypted and anonymized upon submission.
      No one will be able to link your identity to your votes.
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  positionsWithCandidates: Array,
  selections: Object,
  submitting: Boolean,
})
defineEmits(['back', 'submit'])

const confirmed = ref(false)

function selectedCandidate(positionId) {
  const candidateId = props.selections[positionId?.toString()]
  for (const pw of props.positionsWithCandidates) {
    if (pw.position._id?.toString() === positionId?.toString()) {
      return pw.candidates.find(c => c._id?.toString() === candidateId?.toString())
    }
  }
}
</script>

<style scoped>
.review-root {
  display: flex; flex-direction: column; gap: 28px;
  max-width: 680px; margin: 0 auto;
  animation: fadeUp 0.4s var(--ease-out) both;
}
.review-header { display: flex; flex-direction: column; gap: 10px; }
.review-badge  { font-family: var(--font-mono); font-size: 10px; letter-spacing: 4px; color: var(--gold); opacity: 0.6; }
.review-title  { font-family: var(--font-display); font-size: 2.2rem; color: var(--cream); font-weight: 700; }
.review-sub    { font-family: var(--font-body); color: var(--mist); line-height: 1.6; font-size: 1rem; }
.review-sub strong { color: var(--cream); }

.review-list { display: flex; flex-direction: column; gap: 2px; }
.review-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 18px 20px; background: var(--ink-mid); border: var(--border-dim);
}
.review-pos  { font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px; color: var(--gold); opacity: 0.6; margin-bottom: 4px; }
.review-name { font-family: var(--font-display); font-size: 1.2rem; color: var(--cream); }
.review-meta { font-family: var(--font-mono); font-size: 10px; color: var(--stone); margin-top: 2px; }
.review-check {
  width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
  background: rgba(42,138,90,0.15); border: 1px solid rgba(42,138,90,0.4);
  display: flex; align-items: center; justify-content: center;
  color: var(--success); font-size: 14px;
}

.confirm-row { padding: 16px 0; border-top: var(--border-dim); }
.confirm-label {
  font-family: var(--font-body); color: var(--mist); font-size: 0.95rem;
  cursor: pointer; display: flex; align-items: flex-start; gap: 4px; line-height: 1.6;
}

.review-actions { display: flex; gap: 16px; flex-wrap: wrap; }
.back-btn {
  background: transparent; border: 1px solid rgba(196,169,106,0.2);
  color: var(--stone); padding: 14px 24px; cursor: pointer;
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 2px; transition: all 0.2s;
}
.back-btn:hover:not(:disabled) { color: var(--gold); border-color: rgba(196,169,106,0.4); }
.submit-btn {
  flex: 1; background: var(--seal); color: var(--ivory); border: none;
  padding: 14px 24px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 3px; font-weight: 600; transition: all 0.2s;
}
.submit-btn:not(:disabled):hover { background: #a02020; }
.submit-btn:disabled { cursor: not-allowed; }

.review-warning {
  padding: 14px 16px; background: rgba(196,169,106,0.03); border: var(--border-dim);
  font-family: var(--font-mono); font-size: 11px; color: var(--stone); line-height: 1.7; letter-spacing: 0.3px;
}


@media (max-width: 600px) {
  .review-title { font-size: 1.6rem; }
  .review-row   { padding: 12px; }
  .review-actions { flex-direction: column; }
  .submit-btn, .back-btn { width: 100%; text-align: center; justify-content: center; }
}

</style>
