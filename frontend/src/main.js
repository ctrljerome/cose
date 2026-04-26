import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import router from '@/router'
import App from './App.vue'
import './assets/globals.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Toast, {
  position: 'top-center',
  timeout: 4000,
  closeOnClick: true,
  pauseOnHover: true,
  toastClassName: 'suffrage-toast',
  bodyClassName: 'suffrage-toast-body',
})

// Listen for expired session event dispatched by axios interceptor
window.addEventListener('auth:expired', () => {
  router.push('/login')
})

app.mount('#app')
