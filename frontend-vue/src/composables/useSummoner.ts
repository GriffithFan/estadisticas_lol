import { useQuery } from '@tanstack/vue-query'
import { ref, computed, type Ref } from 'vue'
import { api } from '@/services/api'

interface Summoner {
  puuid: string
  gameName: string
  tagLine: string
  profileIconId: number
  summonerLevel: number
  rankedInfo?: RankInfo[]
}

interface RankInfo {
  queueType: string
  tier: string
  rank: string
  leaguePoints: number
  wins: number
  losses: number
}

interface Match {
  metadata: {
    matchId: string
  }
  info: {
    gameCreation: number
    gameDuration: number
    gameMode: string
    queueId: number
    participants: Participant[]
  }
}

interface Participant {
  puuid: string
  summonerName?: string
  riotIdGameName?: string
  championId: number
  championName: string
  kills: number
  deaths: number
  assists: number
  win: boolean
  totalMinionsKilled: number
  goldEarned: number
  teamId: number
}

export function useSummoner(gameName: Ref<string>, tagLine: Ref<string>, region: Ref<string>) {
  const enabled = computed(() => 
    gameName.value.length > 0 && tagLine.value.length > 0 && region.value.length > 0
  )

  return useQuery({
    queryKey: ['summoner', gameName, tagLine, region],
    queryFn: async (): Promise<Summoner> => {
      return api.get<Summoner>(`/summoner/${gameName.value}/${tagLine.value}?region=${region.value}`)
    },
    enabled
  })
}

export function useMatchHistory(puuid: Ref<string>, region: Ref<string>, count = 10) {
  const enabled = computed(() => puuid.value.length > 0)

  return useQuery({
    queryKey: ['matches', puuid, region, count],
    queryFn: async (): Promise<Match[]> => {
      return api.get<Match[]>(`/matches/${puuid.value}?region=${region.value}&count=${count}`)
    },
    enabled
  })
}

export function useLiveGame(puuid: Ref<string>, region: Ref<string>) {
  const enabled = computed(() => puuid.value.length > 0)

  return useQuery({
    queryKey: ['livegame', puuid, region],
    queryFn: async () => {
      return api.get(`/livegame/${puuid.value}?region=${region.value}`)
    },
    enabled,
    refetchInterval: 30000, // Refetch cada 30 segundos
    retry: false // No reintentar si no hay partida
  })
}
