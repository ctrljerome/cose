<template>
  <div class="login-root">
    <div class="bg-orb bg-orb--left" />
    <div class="bg-orb bg-orb--right" />

    <div class="container">
      <!-- Brand panel — hidden on mobile, shown tablet+ -->
      <div class="brand">
        <div class="seal"><SealIcon /></div>
        <div class="brand-text">
          <p class="brand-label">OFFICIAL BALLOTING SYSTEM</p>
          <h1 class="brand-title">CHCCI<br/>COSE</h1>
          <div class="brand-rule" />
          <p class="brand-school">Concepcion Holy Cross College Inc.</p>
          <p class="brand-sub">Commission on Student Election<br/>E-Voting Portal</p>
        </div>
        <div class="brand-footer">
          <p>Your vote is anonymous, encrypted, and immutable.</p>
          <p>Each ballot is cryptographically sealed upon submission.</p>
        </div>
      </div>

      <!-- Form panel -->
      <div class="form-panel">
        <!-- Mobile-only logo -->
        <div class="mobile-logo">
          <div class="mobile-seal"><SealIcon /></div>
          <div>
            <p class="mobile-title">CHCCI-COSE</p>
            <p class="mobile-sub">Commission on Student Election</p>
          </div>
        </div>

        <div class="form-inner">
          <div class="corner-tl" /><div class="corner-br" />
          <div class="form-header">
            <p class="step-label">AUTHENTICATE</p>
            <h2 class="form-title">Sign In</h2>
            <p class="form-sub">Use your CHCCI institutional email to access the ballot.</p>
          </div>

          <form @submit.prevent="handleSubmit" autocomplete="off">
            <div class="field">
              <label class="field-label">INSTITUTIONAL EMAIL</label>
              <div class="input-wrap" :class="{ focused: focused === 'email' }">
                <span class="input-arrow">▸</span>
                <input v-model="email" type="email" placeholder="yourname@chcci.edu.ph"
                  class="input" required autocomplete="username"
                  @focus="focused = 'email'" @blur="focused = null" />
              </div>
            </div>

            <div class="field">
              <label class="field-label">PASSWORD</label>
              <div class="input-wrap" :class="{ focused: focused === 'password' }">
                <span class="input-arrow">▸</span>
                <input v-model="password" :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••" class="input" required autocomplete="current-password"
                  @focus="focused = 'password'" @blur="focused = null" />
                <button type="button" class="eye-btn" @click="showPassword = !showPassword">
                  <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>

            <transition name="slide">
              <div v-if="error" class="error-box">
                <span class="error-icon">!</span><p>{{ error }}</p>
              </div>
            </transition>

            <button type="submit" class="submit-btn" :disabled="loading">
              <span v-if="loading" class="btn-loading"><span class="spinner spinner--sm" /> AUTHENTICATING</span>
              <span v-else>SIGN IN →</span>
            </button>
          </form>

          <div class="divider" />
          <p class="sec-note">🔒 This session is monitored. Suspicious activity is logged and reviewed.</p>
        </div>
      </div>
    </div>

    <footer class="bottom-bar">
      <p>© {{ year }} CHCCI-COSE · All activity is audited and immutable</p>
      <p>Protected under institutional election policies</p>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import SealIcon from '@/components/shared/SealIcon.vue'

const auth   = useAuthStore()
const router = useRouter()
const email        = ref('')
const password     = ref('')
const showPassword = ref(false)
const loading      = ref(false)
const error        = ref('')
const focused      = ref(null)
const year         = new Date().getFullYear()

async function handleSubmit() {
  error.value = ''; loading.value = true
  try {
    const data = await auth.login(email.value, password.value)
    router.push(data.user?.mustChangePassword ? '/change-password' : auth.isAdmin ? '/admin' : '/dashboard')
  } catch (err) {
    error.value = err.response?.data?.message || 'Login failed. Please try again.'
  } finally { loading.value = false }
}
</script>

<style scoped>
.login-root {
  min-height: 100vh; background: var(--ink);
  display: flex; flex-direction: column; position: relative; overflow: hidden;
}
.bg-orb { position: fixed; border-radius: 50%; pointer-events: none; }
.bg-orb--left  { width: clamp(300px,50vw,600px); height: clamp(300px,50vw,600px); top: -20%; left: -15%; background: radial-gradient(circle, rgba(26,58,106,0.12) 0%, transparent 70%); }
.bg-orb--right { width: clamp(250px,40vw,500px); height: clamp(250px,40vw,500px); bottom: -15%; right: -10%; background: radial-gradient(circle, rgba(196,169,106,0.06) 0%, transparent 70%); }

/* ── Layout ── */
.container {
  flex: 1; display: grid;
  grid-template-columns: 1fr 1fr;
  max-width: 1100px; margin: 0 auto; width: 100%;
  padding: clamp(20px, 4vw, 48px);
  gap: clamp(20px, 4vw, 48px);
  align-items: center;
}

/* ── Brand panel ── */
.brand {
  display: flex; flex-direction: column; gap: clamp(20px, 3vw, 32px);
  padding-right: clamp(20px, 3vw, 40px);
  border-right: var(--border-dim);
  animation: fadeUp 0.8s var(--ease-out) both;
}
.seal { width: clamp(64px, 8vw, 96px); height: clamp(64px, 8vw, 96px); }
.brand-text { display: flex; flex-direction: column; gap: 8px; }
.brand-label { font-family: var(--font-mono); font-size: clamp(9px, 1vw, 11px); letter-spacing: 3px; color: var(--gold); opacity: 0.7; }
.brand-title { font-family: var(--font-display); font-size: clamp(40px, 5.5vw, 72px); font-weight: 900; color: var(--cream); line-height: 1; }
.brand-rule  { width: 40px; height: 2px; background: var(--gold); margin: 6px 0; }
.brand-school { font-family: var(--font-mono); font-size: clamp(9px, 1vw, 11px); color: var(--gold); opacity: 0.7; letter-spacing: 1px; }
.brand-sub   { font-family: var(--font-body); font-size: clamp(0.9rem, 1.2vw, 1.1rem); color: var(--mist); font-style: italic; line-height: 1.6; }
.brand-footer { padding: 14px; border: var(--border-dim); background: rgba(196,169,106,0.02); }
.brand-footer p { font-family: var(--font-mono); font-size: clamp(9px, 1vw, 11px); color: var(--stone); line-height: 1.7; }

/* ── Mobile logo (shown only on mobile) ── */
.mobile-logo { display: none; }

/* ── Form panel ── */
.form-panel { animation: fadeUp 0.8s var(--ease-out) 0.15s both; }
.form-inner {
  display: flex; flex-direction: column; gap: clamp(16px, 2.5vw, 28px);
  padding: clamp(24px, 4vw, 44px);
  background: var(--ink-mid); border: var(--border-mid); position: relative;
}
.corner-tl, .corner-br { position: absolute; width: 18px; height: 18px; border-color: var(--gold); border-style: solid; opacity: 0.4; }
.corner-tl { top: -1px; left: -1px; border-width: 2px 0 0 2px; }
.corner-br { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; }

.form-header { display: flex; flex-direction: column; gap: 6px; }
.step-label  { font-family: var(--font-mono); font-size: 10px; letter-spacing: 3px; color: var(--gold); opacity: 0.6; }
.form-title  { font-family: var(--font-display); font-size: clamp(1.6rem, 3vw, 2.4rem); color: var(--cream); font-style: italic; font-weight: 400; }
.form-sub    { font-size: clamp(0.85rem, 1.2vw, 1rem); color: var(--mist); line-height: 1.6; }

form { display: flex; flex-direction: column; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 7px; }
.field-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 3px; color: var(--gold); opacity: 0.7; }

.input-wrap { display: flex; align-items: center; border: var(--border-mid); background: var(--ink); transition: border-color 0.2s, box-shadow 0.2s; }
.input-wrap.focused { border-color: rgba(196,169,106,0.6); box-shadow: 0 0 0 3px rgba(196,169,106,0.05); }
.input-arrow { padding: 0 10px; color: var(--gold); opacity: 0.4; font-size: 11px; pointer-events: none; flex-shrink: 0; }
.input { flex: 1; background: transparent; border: none; outline: none; color: var(--cream); font-family: var(--font-mono); font-size: clamp(13px, 1.5vw, 14px); padding: 13px 12px 13px 0; }
.input::placeholder { color: var(--stone); font-size: 12px; }
.eye-btn { background: transparent; border: none; border-left: 1px solid rgba(196,169,106,0.12); width: 40px; flex-shrink: 0; align-self: stretch; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--stone); transition: color 0.2s; }
.eye-btn:hover { color: var(--gold); }

.error-box { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; background: rgba(196,42,42,0.08); border: 1px solid rgba(196,42,42,0.3); }
.error-icon { font-family: var(--font-mono); font-size: 13px; color: var(--danger); font-weight: bold; flex-shrink: 0; }
.error-box p { font-family: var(--font-mono); font-size: 11px; color: #e88888; line-height: 1.5; }

.submit-btn { background: var(--gold); color: var(--ink-deep); border: none; padding: clamp(13px, 1.5vw, 16px) 24px; font-family: var(--font-mono); font-size: clamp(11px, 1.2vw, 13px); font-weight: 600; letter-spacing: 3px; cursor: pointer; transition: all 0.2s; width: 100%; }
.submit-btn:hover:not(:disabled) { background: var(--gold-light); }
.submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
.btn-loading { display: flex; align-items: center; justify-content: center; gap: 10px; }

.divider  { height: 1px; background: rgba(196,169,106,0.1); }
.sec-note { font-family: var(--font-mono); font-size: 10px; color: var(--stone); line-height: 1.6; }

.bottom-bar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px; padding: clamp(10px, 1.5vw, 14px) clamp(16px, 3vw, 40px); border-top: var(--border-dim); background: rgba(0,0,0,0.3); }
.bottom-bar p { font-family: var(--font-mono); font-size: clamp(9px, 1vw, 10px); color: var(--stone); }

/* ── Tablet ── */
@media (max-width: 900px) {
  .container { grid-template-columns: 1fr; padding: 24px; max-width: 520px; }
  .brand { display: none; }
  .mobile-logo { display: flex; align-items: center; gap: 14px; margin-bottom: 4px; }
  .mobile-seal { width: 52px; height: 52px; flex-shrink: 0; }
  .mobile-title { font-family: var(--font-mono); font-size: 14px; letter-spacing: 4px; color: var(--gold); font-weight: 600; }
  .mobile-sub   { font-family: var(--font-mono); font-size: 9px; letter-spacing: 1px; color: var(--stone); margin-top: 3px; }
  .bottom-bar { justify-content: center; text-align: center; }
}

/* ── Mobile ── */
@media (max-width: 480px) {
  .container { padding: 16px; }
  .form-inner { padding: 22px 16px; gap: 16px; }
  .bottom-bar { flex-direction: column; gap: 2px; }
}
</style>
