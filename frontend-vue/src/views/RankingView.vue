<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const loading = ref(true)
const rankings = ref<any[]>([])
const selectedRegion = ref('la2')
const selectedQueue = ref('RANKED_SOLO_5x5')

const regions = [
  { value: 'la1', label: 'LAN' },
  { value: 'la2', label: 'LAS' },
  { value: 'na1', label: 'NA' },
  { value: 'euw1', label: 'EUW' },
  { value: 'kr', label: 'KR' }
]

const queues = [
  { value: 'RANKED_SOLO_5x5', label: 'Solo/Duo' },
  { value: 'RANKED_FLEX_SR', label: 'Flex' }
]

const fetchRankings = async () => {
  loading.value = true
  try {
    const response = await fetch(
      `http://localhost:3001/api/ranking/${selectedRegion.value}/${selectedQueue.value}`
    )
    if (response.ok) {
      rankings.value = await response.json()
    }
  } catch (error) {
    console.error(error)
    // Mock data
    rankings.value = Array.from({ length: 20 }, (_, i) => ({
      summonerName: `Player${i + 1}`,
      tier: 'CHALLENGER',
      rank: 'I',
      leaguePoints: 1000 - i * 30,
      wins: 150 + Math.floor(Math.random() * 50),
      losses: 80 + Math.floor(Math.random() * 30)
    }))
  } finally {
    loading.value = false
  }
}

const getTierColor = (tier: string) => {
  const colors: Record<string, string> = {
    IRON: 'var(--iron)',
    BRONZE: 'var(--bronze)',
    SILVER: 'var(--silver)',
    GOLD: 'var(--gold)',
    PLATINUM: 'var(--platinum)',
    EMERALD: 'var(--emerald)',
    DIAMOND: 'var(--diamond)',
    MASTER: 'var(--master)',
    GRANDMASTER: 'var(--grandmaster)',
    CHALLENGER: 'var(--challenger)'
  }
  return colors[tier] || 'var(--text-secondary)'
}

const getWinRate = (wins: number, losses: number) => {
  const total = wins + losses
  if (total === 0) return 0
  return Math.round((wins / total) * 100)
}

onMounted(() => {
  fetchRankings()
})
</script>

<template>
  <div class="ranking-page">
    <header class="page-header">
      <h1>Ranking</h1>
      
      <div class="filters">
        <select v-model="selectedRegion" class="select" @change="fetchRankings">
          <option v-for="r in regions" :key="r.value" :value="r.value">
            {{ r.label }}
          </option>
        </select>
        
        <select v-model="selectedQueue" class="select" @change="fetchRankings">
          <option v-for="q in queues" :key="q.value" :value="q.value">
            {{ q.label }}
          </option>
        </select>
      </div>
    </header>

    <div v-if="loading" class="loading">
      <LoadingSpinner />
    </div>

    <div v-else class="table-container">
      <table class="ranking-table">
        <thead>
          <tr>
            <th class="col-rank">#</th>
            <th class="col-name">Jugador</th>
            <th class="col-tier">Tier</th>
            <th class="col-lp">LP</th>
            <th class="col-wr hide-mobile">Win Rate</th>
            <th class="col-games hide-mobile">Partidas</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(player, index) in rankings" :key="player.summonerName">
            <td class="col-rank">{{ index + 1 }}</td>
            <td class="col-name">{{ player.summonerName }}</td>
            <td class="col-tier">
              <span :style="{ color: getTierColor(player.tier) }">
                {{ player.tier }} {{ player.rank }}
              </span>
            </td>
            <td class="col-lp">{{ player.leaguePoints }}</td>
            <td class="col-wr hide-mobile" :class="{ 
              'positive': getWinRate(player.wins, player.losses) >= 55,
              'negative': getWinRate(player.wins, player.losses) < 50
            }">
              {{ getWinRate(player.wins, player.losses) }}%
            </td>
            <td class="col-games hide-mobile muted">{{ player.wins + player.losses }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.ranking-page {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-lg);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
}

.filters {
  display: flex;
  gap: var(--spacing-sm);
}

.select {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  color: var(--text-primary);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
}

.loading {
  display: flex;
  justify-content: center;
  padding: var(--spacing-3xl);
}

.table-container {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.ranking-table {
  width: 100%;
  border-collapse: collapse;
}

.ranking-table th {
  background: var(--bg-tertiary);
  padding: var(--spacing-md);
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  text-align: left;
  border-bottom: 1px solid var(--border-primary);
}

.ranking-table td {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-primary);
  font-size: 0.85rem;
}

.ranking-table tbody tr:last-child td {
  border-bottom: none;
}

.ranking-table tbody tr:hover {
  background: var(--bg-hover);
}

.col-rank {
  width: 50px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.col-name {
  font-weight: 500;
}

.col-tier {
  font-weight: 600;
}

.col-lp {
  font-weight: 600;
}

.col-wr.positive {
  color: var(--win);
}

.col-wr.negative {
  color: var(--loss);
}

.muted {
  color: var(--text-tertiary);
}

@media (max-width: 768px) {
  .ranking-page {
    padding: var(--spacing-lg) var(--spacing-md);
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .hide-mobile {
    display: none;
  }

  .ranking-table th,
  .ranking-table td {
    padding: var(--spacing-sm) var(--spacing-md);
  }
}
</style>
