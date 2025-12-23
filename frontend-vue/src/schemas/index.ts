import { z } from 'zod'

// Schemas de validación
export const RiotIdSchema = z.object({
  gameName: z.string().min(1).max(16),
  tagLine: z.string().min(2).max(5)
})

export const SummonerSearchSchema = z.object({
  name: z.string().min(1),
  tag: z.string().min(2).max(5),
  region: z.string().min(2).max(4)
})

export const RankInfoSchema = z.object({
  queueType: z.string(),
  tier: z.string(),
  rank: z.string(),
  leaguePoints: z.number(),
  wins: z.number(),
  losses: z.number()
})

export const SummonerSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  puuid: z.string(),
  name: z.string().optional(),
  gameName: z.string().optional(),
  tagLine: z.string().optional(),
  profileIconId: z.number(),
  summonerLevel: z.number(),
  rankedInfo: z.array(RankInfoSchema).optional()
})

export const ChampionSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  title: z.string(),
  tags: z.array(z.string()),
  image: z.object({
    full: z.string()
  })
})

export const ParticipantSchema = z.object({
  puuid: z.string(),
  summonerName: z.string().optional(),
  riotIdGameName: z.string().optional(),
  championId: z.number(),
  championName: z.string(),
  kills: z.number(),
  deaths: z.number(),
  assists: z.number(),
  win: z.boolean(),
  totalMinionsKilled: z.number(),
  goldEarned: z.number(),
  teamId: z.number()
})

export const MatchSchema = z.object({
  metadata: z.object({
    matchId: z.string(),
    participants: z.array(z.string())
  }),
  info: z.object({
    gameCreation: z.number(),
    gameDuration: z.number(),
    gameMode: z.string(),
    queueId: z.number(),
    participants: z.array(ParticipantSchema)
  })
})

// Types inferidos de los schemas
export type RiotId = z.infer<typeof RiotIdSchema>
export type SummonerSearch = z.infer<typeof SummonerSearchSchema>
export type RankInfo = z.infer<typeof RankInfoSchema>
export type Summoner = z.infer<typeof SummonerSchema>
export type Champion = z.infer<typeof ChampionSchema>
export type Participant = z.infer<typeof ParticipantSchema>
export type Match = z.infer<typeof MatchSchema>

// Validadores
export function validateRiotId(input: string): RiotId | null {
  const parts = input.split('#')
  if (parts.length !== 2) return null
  
  const result = RiotIdSchema.safeParse({
    gameName: parts[0],
    tagLine: parts[1]
  })
  
  return result.success ? result.data : null
}

export function validateSummonerSearch(name: string, tag: string, region: string): SummonerSearch | null {
  const result = SummonerSearchSchema.safeParse({ name, tag, region })
  return result.success ? result.data : null
}
