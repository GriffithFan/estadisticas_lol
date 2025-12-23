import { useQuery } from '@tanstack/vue-query'
import { api } from '@/services/api'

interface Champion {
  id: string
  key: string
  name: string
  title: string
  tags: string[]
  image: {
    full: string
  }
}

interface TierListChampion {
  championId: string
  championName: string
  tier: string
  winRate: number
  pickRate: number
  banRate: number
  role: string
}

export function useChampions() {
  return useQuery({
    queryKey: ['champions'],
    queryFn: async (): Promise<Record<string, Champion>> => {
      return api.get<Record<string, Champion>>('/ddragon/champions')
    },
    staleTime: 1000 * 60 * 60 * 24 // 24 horas - datos estáticos
  })
}

export function useChampion(championId: string) {
  return useQuery({
    queryKey: ['champion', championId],
    queryFn: async () => {
      return api.get(`/ddragon/champion/${championId}`)
    },
    enabled: !!championId,
    staleTime: 1000 * 60 * 60 * 24
  })
}

export function useTierList(role?: string) {
  return useQuery({
    queryKey: ['tierlist', role],
    queryFn: async (): Promise<TierListChampion[]> => {
      const url = role ? `/tierlist?role=${role}` : '/tierlist'
      return api.get<TierListChampion[]>(url)
    },
    staleTime: 1000 * 60 * 30 // 30 minutos
  })
}

export function useRanking(tier: string = 'challenger', region: string = 'la1') {
  return useQuery({
    queryKey: ['ranking', tier, region],
    queryFn: async () => {
      return api.get(`/ranking/${tier}?region=${region}`)
    },
    staleTime: 1000 * 60 * 5 // 5 minutos
  })
}
