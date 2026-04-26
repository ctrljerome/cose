import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authAPI } from '@/utils/api'

export const useAuthStore = defineStore('auth', () => {
  const user    = ref(null)
  const loading = ref(true)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin         = computed(() => ['admin', 'superadmin'].includes(user.value?.role))

  async function bootstrap() {
    try {
      const { data } = await authAPI.getMe()
      user.value = data.user
    } catch {
      user.value = null
    } finally {
      loading.value = false
    }
  }

  async function login(email, password) {
    const { data } = await authAPI.login(email, password)
    user.value = data.user
    return data
  }

  async function logout() {
    try { await authAPI.logout() } catch {}
    user.value = null
    window.location.href = '/login'
  }

  function updateUser(updates) {
    if (user.value) user.value = { ...user.value, ...updates }
  }

  function clearUser() {
    user.value = null
  }

  return { user, loading, isAuthenticated, isAdmin, bootstrap, login, logout, updateUser, clearUser }
})
