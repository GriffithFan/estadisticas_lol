<script setup lang="ts">
import { computed } from 'vue'
import type { RankedInfo } from '@/types'

const props = defineProps<{
  title: string
  rank: RankedInfo
}>()

const tierData = computed(() => {
  const tiers: Record<string, { color: string; bg: string }> = {
    IRON: { color: '#848484', bg: 'rgba(132, 132, 132, 0.1)' },
    BRONZE: { color: '#a5694f', bg: 'rgba(165, 105, 79, 0.1)' },
    SILVER: { color: '#8ba0ab', bg: 'rgba(139, 160, 171, 0.1)' },
    GOLD: { color: '#cd8837', bg: 'rgba(205, 136, 55, 0.1)' },
    PLATINUM: { color: '#4e9996', bg: 'rgba(78, 153, 150, 0.1)' },
    EMERALD: { color: '#0d9373', bg: 'rgba(13, 147, 115, 0.1)' },
    DIAMOND: { color: '#576bce', bg: 'rgba(87, 107, 206, 0.1)' },
    MASTER: { color: '#9d4dc3', bg: 'rgba(157, 77, 195, 0.1)' },
    GRANDMASTER: { color: '#cd4545', bg: 'rgba(205, 69, 69, 0.1)' },
    CHALLENGER: { color: '#f4c874', bg: 'rgba(244, 200, 116, 0.1)' }
  }
  return tiers[props.rank.tier] || { color: '#848484', bg: 'rgba(132, 132, 132, 0.1)' }
})

const tierImageUrl = computed(() => {
  const tier = props.rank.tier.toLowerCase()
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/${tier}.svg`
})

const winRate = computed(() => {
  const total = props.rank.wins + props.rank.losses
  if (total === 0) return 0
  return Math.round((props.rank.wins / total) * 100)
})

const totalGames = computed(() => props.rank.wins + props.rank.losses)
</script>

<template>
  <div class="rank-card" :style="{ '--tier-color': tierData.color, '--tier-bg': tierData.bg }">
    <div class="rank-header">
      <span>{{ title }}</span>
    </div>

    <div class="rank-content">
      <div class="tier-display">
        <img 
          :src="tierImageUrl" 
          :alt="rank.tier" 
          class="tier-icon"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />
        <div class="tier-info">
          <div class="tier-name">{{ rank.tier }} {{ rank.rank }}</div>
          <div class="tier-lp">{{ rank.leaguePoints }} LP</div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat">
          <span class="stat-value win">{{ rank.wins }}W</span>
        </div>
        <div class="stat">
          <span class="stat-value loss">{{ rank.losses }}L</span>
        </div>
        <div class="stat">
          <span class="stat-value" :class="winRate >= 50 ? 'win' : 'loss'">{{ winRate }}%</span>
        </div>
      </div>

      <div class="winrate-bar">
        <div class="winrate-progress" :style="{ width: winRate + '%' }"></div>
      </div>

      <div class="games-played">{{ totalGames }} partidas</div>
    </div>
  </div>
</template>

<style scoped>
.rank-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.rank-header {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-primary);
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

.rank-content {
  padding: var(--spacing-lg);
}

.tier-display {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.tier-icon {
  width: 56px;
  height: 56px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.tier-info {
  flex: 1;
}

.tier-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--tier-color);
  text-transform: capitalize;
}

.tier-lp {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.stats-grid {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.stat-value {
  font-size: 0.85rem;
  font-weight: 600;
}

.stat-value.win {
  color: var(--win);
}

.stat-value.loss {
  color: var(--loss);
}

.winrate-bar {
  height: 4px;
  background: var(--loss-soft);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: var(--spacing-sm);
}

.winrate-progress {
  height: 100%;
  background: var(--win);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.games-played {
  font-size: 0.7rem;
  color: var(--text-tertiary);
  text-align: center;
}

@media (max-width: 480px) {
  .tier-icon {
    width: 48px;
    height: 48px;
  }

  .tier-name {
    font-size: 1rem;
  }
}
</style>
