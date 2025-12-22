import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/services/api'
import type { Summoner, RankedInfo, Match, Champion } from '@/types'

export const useSummonerStore = defineStore('summoner', () => {
  // State
  const summoner = ref<Summoner | null>(null)
  const rankedInfo = ref<RankedInfo[]>([])
  const matches = ref<Match[]>([])
  const champions = ref<Record<string, Champion>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)
  const ddragonVersion = ref<string>('14.24.1')

  // Getters
  const soloQueueRank = computed(() => {
    return rankedInfo.value.find(r => r.queueType === 'RANKED_SOLO_5x5')
  })

  const flexRank = computed(() => {
    return rankedInfo.value.find(r => r.queueType === 'RANKED_FLEX_SR')
  })

  // Actions
  async function fetchDDragonVersion() {
    try {
      const versions = await api.get<string[]>('/versions')
      if (versions.length > 0) {
        ddragonVersion.value = versions[0]
      }
    } catch (e) {
      console.error('Error fetching DDragon version:', e)
    }
  }

  async function fetchChampions() {
    try {
      const data = await api.get<{ champions: Record<string, Champion> }>('/champions')
      champions.value = data.champions
    } catch (e) {
      console.error('Error fetching champions:', e)
    }
  }

  async function searchSummoner(region: string, gameName: string, tagLine: string) {
    loading.value = true
    error.value = null

    try {
      const data = await api.get<Summoner>(
        `/summoner/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
      )
      summoner.value = data
      
      // Fetch ranked info
      if (data.puuid) {
        await fetchRankedInfo(region, data.puuid)
        await fetchMatches(region, data.puuid)
      }
    } catch (e: any) {
      error.value = e.message || 'Error al buscar invocador'
      summoner.value = null
    } finally {
      loading.value = false
    }
  }

  async function fetchRankedInfo(region: string, puuid: string) {
    try {
      const data = await api.get<RankedInfo[]>(`/ranked/${region}/${puuid}`)
      rankedInfo.value = data
    } catch (e) {
      console.error('Error fetching ranked info:', e)
      rankedInfo.value = []
    }
  }

  async function fetchMatches(region: string, puuid: string, start = 0, count = 10) {
    try {
      const data = await api.get<{ matches: Match[] }>(
        `/matches/${region}/${puuid}?start=${start}&count=${count}`
      )
      if (start === 0) {
        matches.value = data.matches
      } else {
        matches.value = [...matches.value, ...data.matches]
      }
    } catch (e) {
      console.error('Error fetching matches:', e)
    }
  }

  async function loadMoreMatches(region: string, puuid: string) {
    const start = matches.value.length
    await fetchMatches(region, puuid, start, 10)
  }

  function clearSummoner() {
    summoner.value = null
    rankedInfo.value = []
    matches.value = []
    error.value = null
  }

  return {
    // State
    summoner,
    rankedInfo,
    matches,
    champions,
    loading,
    error,
    ddragonVersion,
    // Getters
    soloQueueRank,
    flexRank,
    // Actions
    fetchDDragonVersion,
    fetchChampions,
    searchSummoner,
    fetchRankedInfo,
    fetchMatches,
    loadMoreMatches,
    clearSummoner
  }
})
