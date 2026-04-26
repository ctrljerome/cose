<template>
  <router-view v-slot="{ Component }">
    <transition name="page" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<style>
/* Toast overrides */
.suffrage-toast {
  background: #111120 !important;
  border: 1px solid rgba(196,169,106,0.25) !important;
  border-radius: 2px !important;
  color: #e8e4d9 !important;
  font-family: 'IBM Plex Mono', monospace !important;
  font-size: 13px !important;
  letter-spacing: 0.4px !important;
}
.Vue-Toastification__toast--success .suffrage-toast {
  border-color: rgba(42,138,90,0.4) !important;
}
.Vue-Toastification__toast--error .suffrage-toast {
  border-color: rgba(196,42,42,0.4) !important;
}
.Vue-Toastification__progress-bar {
  background: var(--gold) !important;
}
</style>
