<template>
  <div class="confirmed-root">
    <div class="confirmed-card fade-up">
      <div class="check-anim">✓</div>

      <div class="text-block">
        <p class="badge">VOTE RECORDED</p>
        <h2 class="title">Your Ballot Has Been Cast</h2>
      </div>

      <p class="body">
        Your vote has been anonymized, encrypted, and permanently recorded.
        Thank you for participating in the democratic process.
      </p>

      <div v-if="receipt" class="receipt-box">
        <p class="receipt-label">BALLOT RECEIPT HASH</p>
        <p class="receipt-hash">{{ receipt }}</p>
      </div>

      <button class="return-btn" @click="$router.push('/dashboard')">
        RETURN TO DASHBOARD
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({ receipt: { type: String, default: null } })
</script>

<style scoped>
.confirmed-root {
  min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 24px;
}
.confirmed-card {
  background: var(--ink-mid); border: 1px solid rgba(42,138,90,0.3);
  padding: 56px 40px; max-width: 520px; width: 100%;
  display: flex; flex-direction: column; align-items: center; gap: 24px; text-align: center;
}
.check-anim {
  width: 72px; height: 72px; border-radius: 50%;
  background: rgba(42,138,90,0.15); border: 2px solid rgba(42,138,90,0.5);
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; color: var(--success);
  animation: sealDrop 0.8s var(--ease-out) both;
}
.text-block { display: flex; flex-direction: column; gap: 8px; }
.badge  { font-family: var(--font-mono); font-size: 10px; letter-spacing: 4px; color: var(--success); }
.title  { font-family: var(--font-display); font-size: 2rem; color: var(--cream); font-weight: 700; }
.body   { font-family: var(--font-body); color: var(--mist); font-size: 1rem; line-height: 1.7; }

.receipt-box {
  background: var(--ink); border: var(--border-dim);
  padding: 16px 20px; width: 100%; text-align: left;
}
.receipt-label { font-family: var(--font-mono); font-size: 9px; letter-spacing: 3px; color: var(--stone); margin-bottom: 6px; }
.receipt-hash  { font-family: var(--font-mono); font-size: 11px; color: var(--gold); word-break: break-all; letter-spacing: 0.5px; }

.return-btn {
  background: transparent; border: 1px solid rgba(196,169,106,0.25);
  color: var(--gold); padding: 12px 32px; cursor: pointer; margin-top: 8px;
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 3px; transition: all 0.2s;
}
.return-btn:hover { background: rgba(196,169,106,0.06); border-color: rgba(196,169,106,0.5); }


@media (max-width: 480px) {
  .confirmed-card { padding: 32px 18px; }
  .title { font-size: 1.5rem; }
  .receipt-hash { font-size: 9px; }
}

</style>
