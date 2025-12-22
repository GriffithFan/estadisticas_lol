<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSummonerStore } from '@/stores/summoner'
import { useDataDragon } from '@/composables/useDataDragon'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const store = useSummonerStore()
const { getChampionIcon } = useDataDragon()

const loading = ref(true)
const selectedRole = ref('all')
const tierList = ref<any[]>([])

const roles = [
  { id: 'all', name: 'All' },
  { id: 'top', name: 'Top' },
  { id: 'jungle', name: 'Jungle' },
  { id: 'mid', name: 'Mid' },
  { id: 'adc', name: 'ADC' },
  { id: 'support', name: 'Support' }
]

const tiers = ['S+', 'S', 'A', 'B', 'C']

const fetchTierList = async () => {
  loading.value = true
  try {
    await store.fetchDDragonVersion()
    await store.fetchChampions()
    
    const champions = Object.values(store.champions)
    const mockTierList = champions.map((champ, idx) => ({
      championId: champ.key,
      championName: champ.name,
      tier: tiers[idx % tiers.length],
      winRate: (48 + Math.random() * 8).toFixed(1),
      pickRate: (1 + Math.random() * 15).toFixed(1),
      banRate: (Math.random() * 20).toFixed(1),
      games: Math.floor(10000 + Math.random() * 200000),
      role: roles[1 + (idx % 5)].id
    }))
    
    tierList.value = mockTierList.sort((a, b) => {
      const tierOrder = { 'S+': 0, 'S': 1, 'A': 2, 'B': 3, 'C': 4 }
      return tierOrder[a.tier as keyof typeof tierOrder] - tierOrder[b.tier as keyof typeof tierOrder]
    })
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

const filteredTierList = computed(() => {
  if (selectedRole.value === 'all') return tierList.value
  return tierList.value.filter(c => c.role === selectedRole.value)
})

const formatGames = (num: number) => {
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K'
  return num.toString()
}

onMounted(() => {
  fetchTierList()
})
</script>

<template>
  <div class="tierlist-page">
    <header class="page-header">
      <div class="header-content">
        <h1>Tier List</h1>
        <span class="patch">Patch 25.S1</span>
      </div>
      
      <nav class="role-nav">
        <button 
          v-for="role in roles" 
          :key="role.id"
          class="role-btn"
          :class="{ active: selectedRole === role.id }"
          @click="selectedRole = role.id"
        >
          {{ role.name }}
        </button>
      </nav>
    </header>

    <div v-if="loading" class="loading">
      <LoadingSpinner />
    </div>

    <div v-else class="table-container">
      <table class="tier-table">
        <thead>
          <tr>
            <th class="col-rank">#</th>
            <th class="col-champion">Champion</th>
            <th class="col-tier">Tier</th>
            <th class="col-stat">Win %</th>
            <th class="col-stat hide-mobile">Pick %</th>
            <th class="col-stat hide-mobile">Ban %</th>
            <th class="col-stat hide-mobile">Games</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="(champ, index) in filteredTierList.slice(0, 50)" 
            :key="champ.championId"
            @click="$router.push(`/champion/${champ.championName}`)"
          >
            <td class="col-rank">{{ index + 1 }}</td>
            <td class="col-champion">
              <img :src="getChampionIcon(champ.championId)" :alt="champ.championName" />
              <span>{{ champ.championName }}</span>
            </td>
            <td class="col-tier">
              <span class="tier" :class="'tier-' + champ.tier.toLowerCase().replace('+', 'plus')">
                {{ champ.tier }}
              </span>
            </td>
            <td class="col-stat" :class="{ 'positive': parseFloat(champ.winRate) >= 52, 'negative': parseFloat(champ.winRate) < 48 }">
              {{ champ.winRate }}%
            </td>
            <td class="col-stat hide-mobile">{{ champ.pickRate }}%</td>
            <td class="col-stat hide-mobile">{{ champ.banRate }}%</td>
            <td class="col-stat hide-mobile muted">{{ formatGames(champ.games) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.tierlist-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-lg);
}

.page-header {
  margin-bottom: var(--spacing-xl);
}

.header-content {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.header-content h1 {
  font-size: 1.5rem;
  font-weight: 700;
}

.patch {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  background: var(--bg-tertiary);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
}

.role-nav {
  display: flex;
  gap: var(--spacing-xs);
  overflow-x: auto;
  padding-bottom: var(--spacing-xs);
}

.role-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.role-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.role-btn.active {
  background: var(--blue-primary);
  border-color: var(--blue-primary);
  color: var(--bg-primary);
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

.tier-table {
  width: 100%;
  border-collapse: collapse;
}

.tier-table th {
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

.tier-table td {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-primary);
  font-size: 0.85rem;
}

.tier-table tbody tr {
  cursor: pointer;
  transition: background var(--transition-fast);
}

.tier-table tbody tr:hover {
  background: var(--bg-hover);
}

.tier-table tbody tr:last-child td {
  border-bottom: none;
}

.col-rank {
  width: 40px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.col-champion {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.col-champion img {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
}

.col-champion span {
  font-weight: 500;
}

.col-tier {
  width: 60px;
}

.tier {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 24px;
  border-radius: var(--radius-sm);
  font-size: 0.7rem;
  font-weight: 700;
}

.tier-splus {
  background: rgba(255, 112, 67, 0.2);
  color: #ff7043;
}

.tier-s {
  background: rgba(255, 70, 85, 0.2);
  color: #ff4655;
}

.tier-a {
  background: rgba(0, 200, 83, 0.2);
  color: #00c853;
}

.tier-b {
  background: rgba(33, 150, 243, 0.2);
  color: #2196f3;
}

.tier-c {
  background: rgba(158, 158, 158, 0.2);
  color: #9e9e9e;
}

.col-stat {
  width: 80px;
  text-align: right;
}

.col-stat.positive {
  color: var(--win);
}

.col-stat.negative {
  color: var(--loss);
}

.col-stat.muted {
  color: var(--text-tertiary);
}

@media (max-width: 768px) {
  .tierlist-page {
    padding: var(--spacing-lg) var(--spacing-md);
  }

  .hide-mobile {
    display: none;
  }

  .tier-table th,
  .tier-table td {
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .col-champion img {
    width: 28px;
    height: 28px;
  }
}
</style>
