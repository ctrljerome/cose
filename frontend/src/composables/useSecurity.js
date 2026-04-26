import { onMounted, onUnmounted, ref } from 'vue'
import { authAPI } from '@/utils/api'

export function useSecurity({ isVotingPage = false, onBlur, onDevTools } = {}) {
  const loggedEvents = new Set()

  async function logEvent(event, details = '') {
    const key = `${event}:${Math.floor(Date.now() / 5000)}`
    if (loggedEvents.has(key)) return
    loggedEvents.add(key)
    try { await authAPI.logSuspicious(event, details) } catch {}
  }

  // ── DevTools detection ────────────────────────────────────
  let devToolsInterval = null
  let debuggerTimer    = null

  function checkDevTools() {
    const open = (window.outerWidth - window.innerWidth) > 160 ||
                 (window.outerHeight - window.innerHeight) > 160
    if (open) {
      logEvent('devtools_opened', 'size_diff')
      onDevTools?.()
    }
  }

  function debuggerTrap() {
    const t = performance.now()
    // eslint-disable-next-line no-debugger
    debugger
    if (performance.now() - t > 100) {
      logEvent('devtools_opened', 'debugger_trap')
      onDevTools?.()
    }
  }

  // ── Keyboard intercepts ───────────────────────────────────
  function handleKeyDown(e) {
    // Print
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault(); logEvent('print_attempted', 'ctrl+p'); return false
    }
    // Copy
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      e.preventDefault(); logEvent('copy_attempt', 'ctrl+c'); return false
    }
    // Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); return false }
    // F12
    if (e.key === 'F12') { e.preventDefault(); logEvent('devtools_opened', 'F12'); return false }
    // Ctrl+Shift+I/J/C
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i','j','c'].includes(e.key.toLowerCase())) {
      e.preventDefault(); logEvent('devtools_opened', `ctrl+shift+${e.key}`); return false
    }
    // View source
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') { e.preventDefault(); return false }
  }

  // ── Visibility / focus ────────────────────────────────────
  function handleVisibility() {
    if (document.hidden) {
      logEvent('tab_switch', 'hidden')
      onBlur?.(true)
    } else {
      onBlur?.(false)
    }
  }
  function handleBlur()  { logEvent('tab_switch', 'blur'); onBlur?.(true) }
  function handleFocus() { onBlur?.(false) }

  // ── Right-click ───────────────────────────────────────────
  function handleContextMenu(e) { e.preventDefault(); logEvent('right_click', e.target.tagName) }

  // ── Drag / select ─────────────────────────────────────────
  function block(e) { e.preventDefault() }

  // ── Print intercept ───────────────────────────────────────
  function handleBeforePrint(e) {
    e.preventDefault?.()
    logEvent('print_attempted', 'beforeprint')
    alert('⚠️ Printing is not permitted during an active voting session.\nThis attempt has been logged.')
    return false
  }

  onMounted(() => {
    if (!isVotingPage) return

    devToolsInterval = setInterval(checkDevTools, 1000)
    debuggerTimer    = setInterval(debuggerTrap, 3000)

    window.addEventListener('keydown',           handleKeyDown,     { capture: true })
    window.addEventListener('beforeprint',       handleBeforePrint)
    window.onbeforeprint = handleBeforePrint

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('blur',               handleBlur)
    window.addEventListener('focus',              handleFocus)
    document.addEventListener('contextmenu',      handleContextMenu)
    document.addEventListener('dragstart',        block)
    document.addEventListener('selectstart',      block)
  })

  onUnmounted(() => {
    clearInterval(devToolsInterval)
    clearInterval(debuggerTimer)
    window.removeEventListener('keydown',           handleKeyDown,    { capture: true })
    window.removeEventListener('beforeprint',       handleBeforePrint)
    document.removeEventListener('visibilitychange', handleVisibility)
    window.removeEventListener('blur',               handleBlur)
    window.removeEventListener('focus',              handleFocus)
    document.removeEventListener('contextmenu',      handleContextMenu)
    document.removeEventListener('dragstart',        block)
    document.removeEventListener('selectstart',      block)
  })

  return { logEvent }
}
