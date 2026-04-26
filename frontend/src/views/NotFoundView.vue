<template>
  <div class="nf-root">
    <p class="nf-code">404</p>
    <h1 class="nf-title">Page Not Found</h1>
    <p class="nf-body">The page you're looking for doesn't exist or you don't have permission to access it.</p>
    <button class="nf-btn" @click="$router.push('/login')">RETURN TO LOGIN</button>
  </div>
</template>

<style scoped>
.nf-root {
  min-height: 100vh; background: var(--ink);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 20px; text-align: center; padding: 24px;
}
.nf-code  { font-family: var(--font-mono); font-size: 80px; color: rgba(196,169,106,0.12); letter-spacing: 8px; font-weight: 700; line-height: 1; }
.nf-title { font-family: var(--font-display); font-size: 2rem; color: var(--cream); font-style: italic; }
.nf-body  { font-family: var(--font-body); color: var(--mist); max-width: 360px; line-height: 1.7; }
.nf-btn {
  background: transparent; border: 1px solid rgba(196,169,106,0.3);
  color: var(--gold); padding: 12px 32px; cursor: pointer; margin-top: 8px;
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 3px; transition: all 0.2s;
}
.nf-btn:hover { background: rgba(196,169,106,0.06); }
</style>
