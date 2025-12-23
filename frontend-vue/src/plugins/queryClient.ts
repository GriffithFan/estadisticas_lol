import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import type { App } from 'vue'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      gcTime: 1000 * 60 * 30, // 30 minutos (antes cacheTime)
      retry: 2,
      refetchOnWindowFocus: false
    }
  }
})

export function setupVueQuery(app: App) {
  app.use(VueQueryPlugin, { queryClient })
}
