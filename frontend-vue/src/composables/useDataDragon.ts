import { useSummonerStore } from '@/stores/summoner'

export function useDataDragon() {
  const store = useSummonerStore()

  const getChampionIcon = (championId: number | string): string => {
    const champ = Object.values(store.champions).find(
      c => c.key === String(championId)
    )
    const champId = champ?.id || 'Aatrox'
    return `https://ddragon.leagueoflegends.com/cdn/${store.ddragonVersion}/img/champion/${champId}.png`
  }

  const getChampionName = (championId: number | string): string => {
    const champ = Object.values(store.champions).find(
      c => c.key === String(championId)
    )
    return champ?.name || 'Desconocido'
  }

  const getItemIcon = (itemId: number): string | null => {
    if (!itemId || itemId === 0) return null
    return `https://ddragon.leagueoflegends.com/cdn/${store.ddragonVersion}/img/item/${itemId}.png`
  }

  const getSpellIcon = (spellId: number): string => {
    // Map spell IDs to spell names
    const spellMap: Record<number, string> = {
      1: 'SummonerBoost',
      3: 'SummonerExhaust',
      4: 'SummonerFlash',
      6: 'SummonerHaste',
      7: 'SummonerHeal',
      11: 'SummonerSmite',
      12: 'SummonerTeleport',
      13: 'SummonerMana',
      14: 'SummonerDot',
      21: 'SummonerBarrier',
      30: 'SummonerPoroRecall',
      31: 'SummonerPoroThrow',
      32: 'SummonerSnowball',
      39: 'SummonerSnowURFSnowball_Mark',
      54: 'Summoner_UltBookPlaceholder',
      55: 'Summoner_UltBookSmitePlaceholder'
    }
    const spellName = spellMap[spellId] || 'SummonerFlash'
    return `https://ddragon.leagueoflegends.com/cdn/${store.ddragonVersion}/img/spell/${spellName}.png`
  }

  const getProfileIcon = (iconId: number): string => {
    return `https://ddragon.leagueoflegends.com/cdn/${store.ddragonVersion}/img/profileicon/${iconId}.png`
  }

  const getRankIcon = (tier: string): string => {
    const tierLower = tier.toLowerCase()
    return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/rank-crest-${tierLower}.png`
  }

  return {
    getChampionIcon,
    getChampionName,
    getItemIcon,
    getSpellIcon,
    getProfileIcon,
    getRankIcon
  }
}
