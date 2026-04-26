<template>
  <div class="admin-root">
    <!-- Mobile topbar -->
    <header class="topbar">
      <div class="topbar-brand">
        <p class="topbar-logo">CHCCI-COSE</p>
        <p class="topbar-sub">Admin Console</p>
      </div>
      <button class="burger" @click="sideOpen = !sideOpen" aria-label="Menu">
        <span /><span /><span />
      </button>
    </header>

    <!-- Sidebar overlay on mobile -->
    <div v-if="sideOpen" class="overlay" @click="sideOpen = false" />

    <!-- Sidebar -->
    <aside class="sidebar" :class="{ open: sideOpen }">
      <div class="side-top">
        <div class="logo">
          <p class="logo-mark">CHCCI-COSE</p>
          <p class="logo-school">Concepcion Holy Cross College Inc.</p>
          <p class="logo-role">COSE ADMIN CONSOLE</p>
        </div>
        <div class="side-rule" />
        <nav class="nav">
          <router-link v-for="item in navItems" :key="item.path"
            :to="item.path"
            :exact-active-class="item.exact ? 'nav-active' : ''"
            :active-class="!item.exact ? 'nav-active' : ''"
            class="nav-item" @click="sideOpen = false">
            {{ item.label }}
          </router-link>
        </nav>
      </div>
      <div class="side-bottom">
        <p class="side-email">{{ auth.user?.email }}</p>
        <p class="side-role">{{ auth.user?.role?.toUpperCase() }}</p>
        <button class="logout-btn" @click="auth.logout()">LOG OUT</button>
      </div>
    </aside>

    <!-- Content area -->
    <main class="content">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()
const sideOpen = ref(false)
const navItems = [
  { path: '/admin',            label: 'OVERVIEW',   exact: true  },
  { path: '/admin/elections',  label: 'ELECTIONS',  exact: false },
  { path: '/admin/candidates', label: 'CANDIDATES', exact: false },
  { path: '/admin/users',      label: 'VOTERS',     exact: false },
  { path: '/admin/audit',      label: 'AUDIT LOG',  exact: false },
]
</script>

<style scoped>
.admin-root { min-height: 100vh; background: var(--ink); display: flex; }

/* ── Topbar (mobile only) ── */
.topbar {
  display: none;
  position: fixed; top: 0; left: 0; right: 0; z-index: 200;
  background: var(--ink-deep); border-bottom: var(--border-dim);
  padding: 0 16px; height: 52px;
  align-items: center; justify-content: space-between;
}
.topbar-logo { font-family: var(--font-mono); font-size: 13px; letter-spacing: 4px; color: var(--gold); font-weight: 600; }
.topbar-sub  { font-family: var(--font-mono); font-size: 9px; color: var(--stone); letter-spacing: 1px; margin-top: 2px; }
.burger { background: transparent; border: var(--border-dim); padding: 6px 8px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
.burger span { display: block; width: 18px; height: 1.5px; background: var(--gold); transition: all 0.2s; }

/* ── Overlay ── */
.overlay { display: none; position: fixed; inset: 0; z-index: 150; background: rgba(0,0,0,0.6); }

/* ── Sidebar ── */
.sidebar {
  width: 220px; flex-shrink: 0;
  background: var(--ink-deep); border-right: var(--border-dim);
  display: flex; flex-direction: column; justify-content: space-between;
  position: sticky; top: 0; height: 100vh; overflow-y: auto; z-index: 100;
}
.side-top { display: flex; flex-direction: column; padding: 32px 0; }
.logo { padding: 0 24px 24px; }
.logo-mark   { font-family: var(--font-mono); font-size: 13px; letter-spacing: 5px; color: var(--gold); font-weight: 600; }
.logo-school { font-family: var(--font-mono); font-size: 9px; letter-spacing: 1px; color: var(--gold); opacity: 0.5; margin-top: 4px; }
.logo-role   { font-family: var(--font-mono); font-size: 9px; letter-spacing: 3px; color: var(--stone); margin-top: 2px; }
.side-rule   { height: 1px; background: rgba(196,169,106,0.1); margin-bottom: 16px; }

.nav { display: flex; flex-direction: column; }
.nav-item { display: block; padding: 12px 24px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 2px; text-decoration: none; color: var(--stone); border-left: 2px solid transparent; transition: all 0.2s; text-transform: uppercase; }
.nav-item:hover  { color: var(--gold); }
.nav-active      { color: var(--gold) !important; background: rgba(196,169,106,0.08); border-left-color: var(--gold) !important; }

.side-bottom { padding: 24px; border-top: var(--border-dim); display: flex; flex-direction: column; gap: 8px; }
.side-email  { font-family: var(--font-mono); font-size: 10px; color: var(--stone); word-break: break-all; }
.side-role   { font-family: var(--font-mono); font-size: 9px; letter-spacing: 2px; color: var(--gold); opacity: 0.6; }
.logout-btn  { background: transparent; border: var(--border-dim); color: var(--stone); padding: 8px 12px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px; cursor: pointer; transition: all 0.2s; margin-top: 4px; }
.logout-btn:hover { color: var(--gold); border-color: rgba(196,169,106,0.3); }

.content { flex: 1; overflow-y: auto; padding: clamp(20px, 3vw, 40px); min-width: 0; }

/* ── Tablet / Mobile ── */
@media (max-width: 900px) {
  .admin-root  { flex-direction: column; padding-top: 52px; }
  .topbar      { display: flex; }
  .overlay     { display: block; }
  .sidebar {
    position: fixed; top: 52px; left: 0; bottom: 0;
    transform: translateX(-100%); transition: transform 0.28s var(--ease-out);
    width: min(280px, 85vw); height: calc(100vh - 52px);
  }
  .sidebar.open { transform: translateX(0); box-shadow: 4px 0 24px rgba(0,0,0,0.5); }
  .content { padding: clamp(16px, 3vw, 28px); }
}
@media (max-width: 480px) {
  .content { padding: 14px 12px; }
}
</style>
