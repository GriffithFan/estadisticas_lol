// Summoner types
export interface Summoner {
  puuid: string
  gameName: string
  tagLine: string
  summonerLevel: number
  profileIconId: number
  accountId?: string
  id?: string
}

// Ranked types
export interface RankedInfo {
  queueType: 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR' | string
  tier: string
  rank: string
  leaguePoints: number
  wins: number
  losses: number
  hotStreak?: boolean
  veteran?: boolean
  freshBlood?: boolean
  inactive?: boolean
}

// Match types
export interface Match {
  metadata: {
    matchId: string
    participants: string[]
  }
  info: {
    gameCreation: number
    gameDuration: number
    gameMode: string
    gameType: string
    queueId: number
    participants: Participant[]
    teams: Team[]
  }
}

export interface Participant {
  puuid: string
  summonerName: string
  riotIdGameName: string
  riotIdTagline: string
  championId: number
  championName: string
  teamId: number
  win: boolean
  kills: number
  deaths: number
  assists: number
  totalDamageDealtToChampions: number
  totalMinionsKilled: number
  neutralMinionsKilled: number
  visionScore: number
  goldEarned: number
  item0: number
  item1: number
  item2: number
  item3: number
  item4: number
  item5: number
  item6: number
  summoner1Id: number
  summoner2Id: number
  perks: {
    styles: PerkStyle[]
  }
  champLevel: number
}

export interface PerkStyle {
  description: string
  selections: {
    perk: number
    var1: number
    var2: number
    var3: number
  }[]
  style: number
}

export interface Team {
  teamId: number
  win: boolean
  objectives: {
    baron: { kills: number }
    dragon: { kills: number }
    tower: { kills: number }
    champion: { kills: number }
  }
}

// Champion types
export interface Champion {
  id: string
  key: string
  name: string
  title: string
  blurb: string
  tags: string[]
  image: {
    full: string
  }
  stats: ChampionStats
}

export interface ChampionStats {
  hp: number
  hpperlevel: number
  mp: number
  mpperlevel: number
  armor: number
  armorperlevel: number
  spellblock: number
  spellblockperlevel: number
  attackdamage: number
  attackdamageperlevel: number
  attackspeed: number
  attackspeedperlevel: number
}

// Summoner Spell
export interface SummonerSpell {
  id: string
  key: string
  name: string
  description: string
  image: {
    full: string
  }
}

// Item types
export interface Item {
  name: string
  description: string
  gold: {
    base: number
    total: number
    sell: number
  }
  image: {
    full: string
  }
  tags: string[]
}

// Rune types
export interface Rune {
  id: number
  key: string
  name: string
  icon: string
  shortDesc: string
}

export interface RuneTree {
  id: number
  key: string
  name: string
  icon: string
  slots: {
    runes: Rune[]
  }[]
}

// Region types
export interface Region {
  id: string
  name: string
  routing: string
}

export const REGIONS: Region[] = [
  { id: 'la1', name: 'LAN', routing: 'americas' },
  { id: 'la2', name: 'LAS', routing: 'americas' },
  { id: 'na1', name: 'NA', routing: 'americas' },
  { id: 'br1', name: 'BR', routing: 'americas' },
  { id: 'euw1', name: 'EUW', routing: 'europe' },
  { id: 'eun1', name: 'EUNE', routing: 'europe' },
  { id: 'kr', name: 'KR', routing: 'asia' },
  { id: 'jp1', name: 'JP', routing: 'asia' },
  { id: 'oc1', name: 'OCE', routing: 'sea' },
  { id: 'tr1', name: 'TR', routing: 'europe' },
  { id: 'ru', name: 'RU', routing: 'europe' }
]
