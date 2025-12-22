<script setup lang="ts">
import { ref } from 'vue'
import { useSummonerStore } from '@/stores/summoner'
import { useDataDragon } from '@/composables/useDataDragon'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const store = useSummonerStore()
const { getProfileIcon } = useDataDragon()

const region = ref('la2')
const inputText = ref('')
const players = ref<any[]>([])
const loading = ref(false)
const error = ref('')

const regions = [
  { value: 'la1', label: 'LAN' },
  { value: 'la2', label: 'LAS' },
  { value: 'na1', label: 'NA' },
  { value: 'euw1', label: 'EUW' },
  { value: 'kr', label: 'KR' }
]

const parseInput = (text: string) => {
  const lines = text.split('\n').filter(l => l.trim())
  return lines.map(line => {
    const match = line.match(/(.+?)#(\w+)/)
    if (match) {
      return { name: match[1].trim(), tag: match[2].trim() }
    }
    return null
  }).filter(Boolean)
}

const searchPlayers = async () => {
  const parsed = parseInput(inputText.value)
  if (parsed.length === 0) {
    error.value = 'Ingresa al menos un jugador (Nombre#TAG)'
    return
  }

  loading.value = true
  error.value = ''
  players.value = []

  await store.fetchDDragonVersion()

  for (const player of parsed) {
    if (!player) continue
    try {
      const response = await fetch(
        `http://localhost:3001/api/summoner/${region.value}/${encodeURIComponent(player.name)}/${encodeURIComponent(player.tag)}`
      )
      if (response.ok) {
        const data = await response.json()
        players.value.push({
          ...data,
          gameName: player.name,
          tagLine: player.tag,
          found: true
        })
      } else {
        players.value.push({
          gameName: player.name,
          tagLine: player.tag,
          found: false
        })
      }
    } catch {
      players.value.push({
        gameName: player.name,
        tagLine: player.tag,
        found: false
      })
    }
  }

  loading.value = false
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
</script>

<template>
  <div class="multisearch-page">
    <header class="page-header">
      <h1>Multi-Search</h1>
      <p>Analiza multiples jugadores</p>
    </header>

    <div class="search-section">
      <div class="input-group">
        <select v-model="region" class="region-select">
          <option v-for="r in regions" :key="r.value" :value="r.value">
            {{ r.label }}
          </option>
        </select>
        
        <textarea 
          v-model="inputText"
          placeholder="Jugador1#TAG&#10;Jugador2#TAG&#10;Jugador3#TAG"
          class="players-input"
          rows="5"
        ></textarea>
      </div>

      <button 
        class="search-btn"
        :disabled="loading"
        @click="searchPlayers"
      >
        {{ loading ? 'Buscando...' : 'Buscar' }}
      </button>

      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <div v-if="loading" class="loading">
      <LoadingSpinner />
    </div>

    <div v-else-if="players.length > 0" class="results">
      <div 
        v-for="player in players" 
        :key="player.gameName + player.tagLine"
        class="player-card"
        :class="{ 'not-found': !player.found }"
      >
        <template v-if="player.found">
          <img 
            :src="getProfileIcon(player.profileIconId)" 
            :alt="player.gameName"
            class="player-icon"
          />
          <div class="player-info">
            <div class="player-name">
              {{ player.gameName }}<span>#{{ player.tagLine }}</span>
            </div>
            <div class="player-rank" v-if="player.ranked?.length">
              <span :style="{ color: getTierColor(player.ranked[0].tier) }">
                {{ player.ranked[0].tier }} {{ player.ranked[0].rank }}
              </span>
              <span class="lp">{{ player.ranked[0].leaguePoints }} LP</span>
            </div>
            <div class="player-rank unranked" v-else>Sin clasificar</div>
          </div>
          <div class="player-level">Lv. {{ player.summonerLevel }}</div>
        </template>
        <template v-else>
          <div class="not-found-icon">?</div>
          <div class="player-info">
            <div class="player-name">{{ player.gameName }}#{{ player.tagLine }}</div>
            <div class="player-rank error">No encontrado</div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.multisearch-page {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-lg);
}

.page-header {
  margin-bottom: var(--spacing-xl);
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: var(--spacing-xs);
}

.page-header p {
  color: var(--text-tertiary);
  font-size: 0.85rem;
}

.search-section {
  margin-bottom: var(--spacing-xl);
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.region-select {
  width: 100px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  color: var(--text-primary);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
}

.players-input {
  width: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  color: var(--text-primary);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-family: inherit;
  resize: vertical;
  min-height: 120px;
}

.players-input::placeholder {
  color: var(--text-tertiary);
}

.players-input:focus {
  outline: none;
  border-color: var(--blue-primary);
}

.search-btn {
  width: 100%;
  background: linear-gradient(180deg, var(--blue-primary), var(--blue-secondary));
  border: none;
  color: var(--bg-primary);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 600;
  transition: all var(--transition-fast);
}

.search-btn:hover:not(:disabled) {
  filter: brightness(1.1);
}

.search-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: var(--loss);
  font-size: 0.85rem;
  margin-top: var(--spacing-md);
  text-align: center;
}

.loading {
  display: flex;
  justify-content: center;
  padding: var(--spacing-2xl);
}

.results {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.player-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
}

.player-card.not-found {
  opacity: 0.6;
}

.player-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.not-found-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: 1.2rem;
  font-weight: 700;
  flex-shrink: 0;
}

.player-info {
  flex: 1;
  min-width: 0;
}

.player-name {
  font-weight: 600;
  color: var(--text-primary);
}

.player-name span {
  color: var(--text-tertiary);
  font-weight: 400;
}

.player-rank {
  font-size: 0.8rem;
  margin-top: 2px;
}

.player-rank .lp {
  color: var(--text-tertiary);
  margin-left: var(--spacing-xs);
}

.player-rank.unranked {
  color: var(--text-tertiary);
}

.player-rank.error {
  color: var(--loss);
}

.player-level {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

@media (max-width: 480px) {
  .multisearch-page {
    padding: var(--spacing-lg) var(--spacing-md);
  }

  .player-icon,
  .not-found-icon {
    width: 40px;
    height: 40px;
  }
}
</style>
