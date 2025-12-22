<script setup lang="ts">
import { computed } from 'vue'
import { useDataDragon } from '@/composables/useDataDragon'
import { useFormatters } from '@/composables/useFormatters'
import type { Match } from '@/types'

const props = defineProps<{
  match: Match
  puuid: string
}>()

const { getChampionIcon, getItemIcon, getSummonerSpellIcon } = useDataDragon()
const { formatDuration, formatTimeAgo, formatKDA } = useFormatters()

const participant = computed(() => {
  return props.match.info.participants.find(p => p.puuid === props.puuid)
})

const isWin = computed(() => participant.value?.win ?? false)
const isRemake = computed(() => props.match.info.gameDuration < 300)

const gameResult = computed(() => {
  if (isRemake.value) return 'REMAKE'
  return isWin.value ? 'VICTORY' : 'DEFEAT'
})

const kda = computed(() => {
  const p = participant.value
  if (!p) return '0.0'
  const deaths = p.deaths || 1
  return ((p.kills + p.assists) / deaths).toFixed(1)
})

const csPerMin = computed(() => {
  const p = participant.value
  if (!p) return '0.0'
  const minutes = props.match.info.gameDuration / 60
  const cs = p.totalMinionsKilled + (p.neutralMinionsKilled || 0)
  return (cs / minutes).toFixed(1)
})

const totalCs = computed(() => {
  const p = participant.value
  if (!p) return 0
  return p.totalMinionsKilled + (p.neutralMinionsKilled || 0)
})

const items = computed(() => {
  const p = participant.value
  if (!p) return []
  return [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5].filter(id => id > 0)
})

const queueName = computed(() => {
  const queueId = props.match.info.queueId
  const queues: Record<number, string> = {
    420: 'Ranked Solo',
    440: 'Ranked Flex',
    400: 'Normal',
    430: 'Normal Blind',
    450: 'ARAM',
    900: 'URF',
    1020: 'One for All',
    1700: 'Arena'
  }
  return queues[queueId] || 'Partida'
})
</script>

<template>
  <div 
    v-if="participant"
    class="match-card"
    :class="{ win: isWin && !isRemake, loss: !isWin && !isRemake, remake: isRemake }"
  >
    <div class="result-bar"></div>
    
    <div class="match-content">
      <div class="champion-section">
        <img 
          :src="getChampionIcon(participant.championId)" 
          :alt="participant.championName"
          class="champion-icon"
        />
        <div class="spells">
          <img :src="getSummonerSpellIcon(participant.summoner1Id)" alt="spell" class="spell-icon" />
          <img :src="getSummonerSpellIcon(participant.summoner2Id)" alt="spell" class="spell-icon" />
        </div>
      </div>

      <div class="info-section">
        <div class="result-info">
          <span class="result-text">{{ gameResult }}</span>
          <span class="game-meta">{{ queueName }} · {{ formatDuration(match.info.gameDuration) }}</span>
        </div>
        
        <div class="kda-section">
          <span class="kda-values">
            <span class="kills">{{ participant.kills }}</span>
            <span class="separator">/</span>
            <span class="deaths">{{ participant.deaths }}</span>
            <span class="separator">/</span>
            <span class="assists">{{ participant.assists }}</span>
          </span>
          <span class="kda-ratio">{{ kda }} KDA</span>
        </div>
      </div>

      <div class="stats-section hide-mobile">
        <div class="stat">
          <span class="stat-value">{{ totalCs }}</span>
          <span class="stat-label">CS ({{ csPerMin }}/m)</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ participant.visionScore }}</span>
          <span class="stat-label">Vision</span>
        </div>
      </div>

      <div class="items-section hide-mobile">
        <div class="items-grid">
          <img 
            v-for="(itemId, index) in items" 
            :key="index"
            :src="getItemIcon(itemId)"
            class="item-icon"
          />
        </div>
      </div>

      <div class="time-section">
        <span class="time-ago">{{ formatTimeAgo(match.info.gameEndTimestamp) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.match-card {
  display: flex;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: border-color var(--transition-fast);
}

.match-card:hover {
  border-color: var(--border-secondary);
}

.result-bar {
  width: 4px;
  flex-shrink: 0;
}

.match-card.win .result-bar {
  background: var(--win);
}

.match-card.loss .result-bar {
  background: var(--loss);
}

.match-card.remake .result-bar {
  background: var(--remake);
}

.match-card.win {
  background: linear-gradient(90deg, var(--win-soft) 0%, var(--bg-secondary) 100%);
}

.match-card.loss {
  background: linear-gradient(90deg, var(--loss-soft) 0%, var(--bg-secondary) 100%);
}

.match-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-md) var(--spacing-lg);
}

.champion-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex-shrink: 0;
}

.champion-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
}

.spells {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.spell-icon {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-sm);
}

.info-section {
  min-width: 120px;
}

.result-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.result-text {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.match-card.win .result-text {
  color: var(--win);
}

.match-card.loss .result-text {
  color: var(--loss);
}

.match-card.remake .result-text {
  color: var(--remake);
}

.game-meta {
  font-size: 0.7rem;
  color: var(--text-tertiary);
}

.kda-section {
  margin-top: var(--spacing-xs);
}

.kda-values {
  font-size: 0.9rem;
  font-weight: 600;
}

.kills {
  color: var(--win);
}

.deaths {
  color: var(--loss);
}

.assists {
  color: var(--text-secondary);
}

.separator {
  color: var(--text-disabled);
  margin: 0 2px;
}

.kda-ratio {
  display: block;
  font-size: 0.7rem;
  color: var(--text-tertiary);
  margin-top: 2px;
}

.stats-section {
  display: flex;
  gap: var(--spacing-lg);
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 50px;
}

.stat-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.stat-label {
  font-size: 0.65rem;
  color: var(--text-tertiary);
}

.items-section {
  margin-left: auto;
}

.items-grid {
  display: flex;
  gap: 2px;
}

.item-icon {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
}

.time-section {
  text-align: right;
  min-width: 60px;
}

.time-ago {
  font-size: 0.7rem;
  color: var(--text-tertiary);
}

@media (max-width: 768px) {
  .match-content {
    gap: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .champion-icon {
    width: 40px;
    height: 40px;
  }

  .spell-icon {
    width: 18px;
    height: 18px;
  }

  .hide-mobile {
    display: none !important;
  }

  .info-section {
    flex: 1;
    min-width: 0;
  }

  .time-section {
    min-width: auto;
  }
}
</style>
