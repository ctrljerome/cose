import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/',                redirect: '/login' },
  { path: '/login',           component: () => import('@/views/LoginView.vue'),          meta: { public: true } },
  { path: '/change-password', component: () => import('@/views/ChangePasswordView.vue'), meta: { auth: true } },
  { path: '/dashboard',       component: () => import('@/views/DashboardView.vue'),      meta: { auth: true } },
  { path: '/vote/:electionId',component: () => import('@/views/BallotView.vue'),         meta: { auth: true } },
  { path: '/results',         component: () => import('@/views/ResultsView.vue'),        meta: { auth: true } },
  {
    path: '/admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { auth: true, admin: true },
    children: [
      { path: '',        component: () => import('@/views/admin/OverviewTab.vue') },
      { path: 'elections',  component: () => import('@/views/admin/ElectionsTab.vue') },
      { path: 'candidates', component: () => import('@/views/admin/CandidatesTab.vue') },
      { path: 'users',      component: () => import('@/views/admin/UsersTab.vue') },
      { path: 'audit',   component: () => import('@/views/admin/AuditTab.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*',  component: () => import('@/views/NotFoundView.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Bootstrap auth on first navigation
  if (auth.loading) await auth.bootstrap()

  const isLoggedIn   = auth.isAuthenticated
  const mustChange   = auth.user?.mustChangePassword

  // Public routes: redirect logged-in users away
  if (to.meta.public && isLoggedIn && !mustChange) {
    return auth.isAdmin ? '/admin' : '/dashboard'
  }

  // Protected routes: require auth
  if (to.meta.auth && !isLoggedIn) return '/login'

  // Admin-only routes
  if (to.meta.admin && !auth.isAdmin) return '/dashboard'

  // Force password change
  if (isLoggedIn && mustChange && to.path !== '/change-password') {
    return '/change-password'
  }
})

export default router
