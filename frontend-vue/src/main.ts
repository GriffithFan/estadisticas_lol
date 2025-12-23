import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import { setupVueQuery } from './plugins/queryClient'
import App from './App.vue'
import './assets/styles/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
setupVueQuery(app)

app.mount('#app')
