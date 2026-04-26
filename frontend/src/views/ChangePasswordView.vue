<template>
  <div class="root">
    <div class="bg" />
    <div class="card fade-up">
      <span class="badge">REQUIRED ACTION</span>
      <h2 class="title">Set New Password</h2>
      <p class="sub">You must set a new password before accessing the system. This is a one-time requirement.</p>

      <form @submit.prevent="handleSubmit">

        <!-- Current Password -->
        <div class="field">
          <label class="field-label">CURRENT PASSWORD</label>
          <div class="input-wrap">
            <input
              v-model="form.current"
              :type="show.current ? 'text' : 'password'"
              placeholder="Enter your temporary password"
              class="input"
              required
              autocomplete="current-password"
            />
            <button type="button" class="eye-btn" @click="show.current = !show.current" :title="show.current ? 'Hide' : 'Show'">
              <svg v-if="show.current" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>

        <!-- New Password -->
        <div class="field">
          <label class="field-label">NEW PASSWORD</label>
          <div class="input-wrap">
            <input
              v-model="form.newPwd"
              :type="show.newPwd ? 'text' : 'password'"
              placeholder="Create a strong password"
              class="input"
              required
              autocomplete="new-password"
            />
            <button type="button" class="eye-btn" @click="show.newPwd = !show.newPwd" :title="show.newPwd ? 'Hide' : 'Show'">
              <svg v-if="show.newPwd" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>

        <!-- Confirm Password -->
        <div class="field">
          <label class="field-label">CONFIRM PASSWORD</label>
          <div class="input-wrap">
            <input
              v-model="form.confirm"
              :type="show.confirm ? 'text' : 'password'"
              placeholder="Repeat your new password"
              class="input"
              required
              autocomplete="new-password"
            />
            <button type="button" class="eye-btn" @click="show.confirm = !show.confirm" :title="show.confirm ? 'Hide' : 'Show'">
              <svg v-if="show.confirm" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>

        <!-- Requirements checklist -->
        <div class="req-box">
          <p class="req-title">PASSWORD REQUIREMENTS</p>
          <div v-for="r in requirements" :key="r.id" class="req-row" :class="{ met: r.test(form.newPwd) }">
            <span class="req-icon">{{ r.test(form.newPwd) ? '✓' : '○' }}</span>
            <span>{{ r.label }}</span>
          </div>
          <div v-if="form.confirm" class="req-row" :class="{ met: passwordsMatch, fail: !passwordsMatch }">
            <span class="req-icon">{{ passwordsMatch ? '✓' : '✗' }}</span>
            <span>Passwords match</span>
          </div>
        </div>

        <transition name="slide">
          <div v-if="error" class="error-box">
            <span>!</span><p>{{ error }}</p>
          </div>
        </transition>

        <button
          type="submit"
          class="submit-btn"
          :disabled="loading || !meetsAll || !passwordsMatch"
          :style="{ opacity: (meetsAll && passwordsMatch) ? 1 : 0.4 }"
        >
          {{ loading ? 'UPDATING...' : 'SET PASSWORD & CONTINUE →' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { authAPI } from '@/utils/api'
import { useToast } from 'vue-toastification'

const auth   = useAuthStore()
const router = useRouter()
const toast  = useToast()

const form    = ref({ current: '', newPwd: '', confirm: '' })
const show    = ref({ current: false, newPwd: false, confirm: false })
const loading = ref(false)
const error   = ref('')

const requirements = [
  { id: 'len',     label: 'At least 8 characters',             test: v => v.length >= 8 },
  { id: 'upper',   label: 'Uppercase letter (A–Z)',             test: v => /[A-Z]/.test(v) },
  { id: 'lower',   label: 'Lowercase letter (a–z)',             test: v => /[a-z]/.test(v) },
  { id: 'digit',   label: 'Number (0–9)',                       test: v => /\d/.test(v) },
  { id: 'special', label: 'Special character (@$!%*?&)',        test: v => /[@$!%*?&]/.test(v) },
]

const meetsAll       = computed(() => requirements.every(r => r.test(form.value.newPwd)))
const passwordsMatch = computed(() => form.value.newPwd && form.value.newPwd === form.value.confirm)

async function handleSubmit() {
  if (!meetsAll.value) return (error.value = 'Password does not meet all requirements.')
  if (!passwordsMatch.value) return (error.value = 'Passwords do not match.')
  error.value   = ''
  loading.value = true
  try {
    await authAPI.changePassword(form.value.current, form.value.newPwd)
    toast.success('Password updated. Please log in with your new password.')
    auth.clearUser()
    router.push('/login')
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to change password.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.root {
  min-height: 100vh; background: var(--ink);
  display: flex; align-items: center; justify-content: center;
  padding: 24px; position: relative;
}
.bg {
  position: fixed; inset: 0;
  background: radial-gradient(ellipse at 50% 0%, rgba(196,169,106,0.04) 0%, transparent 60%);
  pointer-events: none;
}
.card {
  background: var(--ink-mid); border: var(--border-mid);
  padding: 48px 40px; max-width: 480px; width: 100%;
  display: flex; flex-direction: column; gap: 20px;
}
.badge {
  display: inline-block; align-self: flex-start;
  font-family: var(--font-mono); font-size: 10px; letter-spacing: 3px;
  color: var(--ink); background: var(--gold); padding: 4px 12px;
}
.title { font-family: var(--font-display); font-size: 2rem; color: var(--cream); font-style: italic; }
.sub { font-family: var(--font-body); font-size: 1rem; color: var(--mist); line-height: 1.6; }

form { display: flex; flex-direction: column; gap: 18px; }
.field { display: flex; flex-direction: column; gap: 8px; }
.field-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 3px; color: var(--gold); opacity: 0.7; }

/* Input + lock button wrapper */
.input-wrap { position: relative; display: flex; align-items: center; }
.input {
  flex: 1;
  background: var(--ink); border: var(--border-mid);
  color: var(--cream); padding: 13px 48px 13px 16px;
  font-family: var(--font-mono); font-size: 14px; outline: none;
  transition: border-color 0.2s; width: 100%;
}
.input:focus { border-color: rgba(196,169,106,0.5); }

.eye-btn {
  position: absolute; right: 0; top: 0; bottom: 0;
  width: 42px; background: transparent; border: none;
  border-left: 1px solid rgba(196,169,106,0.12);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: var(--stone); transition: color 0.2s;
}
.eye-btn:hover { color: var(--gold); }
.eye-btn svg { pointer-events: none; }

.req-box {
  background: rgba(0,0,0,0.3); border: var(--border-dim);
  padding: 16px; display: flex; flex-direction: column; gap: 8px;
}
.req-title { font-family: var(--font-mono); font-size: 10px; letter-spacing: 3px; color: var(--stone); margin-bottom: 4px; }
.req-row {
  display: flex; align-items: center; gap: 10px;
  font-family: var(--font-mono); font-size: 11px; color: var(--stone);
  transition: color 0.2s;
}
.req-row.met  { color: var(--success); }
.req-row.fail { color: var(--danger); }
.req-icon { width: 16px; text-align: center; font-size: 13px; flex-shrink: 0; }

.error-box {
  display: flex; gap: 10px; padding: 14px;
  background: rgba(196,42,42,0.08); border: 1px solid rgba(196,42,42,0.3);
  font-family: var(--font-mono); font-size: 12px; color: #e88888;
}
.submit-btn {
  background: var(--gold); color: var(--ink); border: none; padding: 16px;
  font-family: var(--font-mono); font-size: 12px; font-weight: 600;
  letter-spacing: 3px; text-transform: uppercase; cursor: pointer; transition: all 0.2s;
}
.submit-btn:not(:disabled):hover { background: var(--gold-light); }
.submit-btn:disabled { cursor: not-allowed; }


@media (max-width: 600px) {
  .card { padding: 28px 18px; }
  .title { font-size: 1.6rem; }
}
@media (max-width: 380px) {
  .card { padding: 22px 14px; }
}

</style>
