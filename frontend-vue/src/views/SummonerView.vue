<script setup lang="ts">
import { onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSummonerStore } from '@/stores/summoner'
import { useDataDragon } from '@/composables/useDataDragon'
import { useFormatters } from '@/composables/useFormatters'
import RankCard from '@/components/summoner/RankCard.vue'
import MatchCard from '@/components/summoner/MatchCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const route = useRoute()
const store = useSummonerStore()
const { getProfileIcon } = useDataDragon()
const { formatWinRate } = useFormatters()

const props = defineProps<{
  region: string
  gameName: string
  tagLine: string
}>()

const fullName = computed(() => `${props.gameName}#${props.tagLine}`)

const loadSummoner = async () => {
  await store.fetchDDragonVersion()
  await store.fetchChampions()
  await store.searchSummoner(props.region, props.gameName, props.tagLine)
}

const loadMore = () => {
  if (store.summoner) {
    store.loadMoreMatches(props.region, store.summoner.puuid)
  }
}

onMounted(() => {
  loadSummoner()
})

watch(
  () => [props.region, props.gameName, props.tagLine],
  () => {
    loadSummoner()
  }
)
</script>

<template>
  <div class="summoner-page">
    <!-- Loading -->
    <div v-if="store.loading" class="state-container">
      <LoadingSpinner />
      <p>Cargando perfil...</p>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="state-container error">
      <div class="error-box">
        <h2>No encontrado</h2>
        <p>{{ store.error }}</p>
      </div>
    </div>

    <!-- Profile -->
    <template v-else-if="store.summoner">
      <header class="profile-header">
        <div class="profile-header-inner">
          <div class="profile-icon">
            <img 
              :src="getProfileIcon(store.summoner.profileIconId)" 
              :alt="store.summoner.gameName"
            />
            <span class="level">{{ store.summoner.summonerLevel }}</span>
          </div>

          <div class="profile-info">
            <h1>
              {{ store.summoner.gameName }}<span class="tag">#{{ store.summoner.tagLine }}</span>
            </h1>
            <span class="region-badge">{{ region.toUpperCase() }}</span>
          </div>
        </div>
      </header>

      <main class="profile-main">
        <aside class="sidebar">
          <RankCard 
            v-if="store.soloQueueRank"
            title="Ranked Solo/Duo"
            :rank="store.soloQueueRank"
          />
          <RankCard 
            v-if="store.flexRank"
            title="Ranked Flex"
            :rank="store.flexRank"
          />
          <div v-if="!store.soloQueueRank && !store.flexRank" class="no-rank">
            Sin clasificar esta temporada
          </div>
        </aside>

        <section class="matches-section">
          <h2 class="section-title">Historial</h2>
          
          <div v-if="store.matches.length === 0" class="no-matches">
            No hay partidas recientes
          </div>
          
          <div v-else class="matches-list">
            <MatchCard 
              v-for="match in store.matches" 
              :key="match.metadata.matchId"
              :match="match"
              :puuid="store.summoner.puuid"
            />
          </div>

          <button 
            v-if="store.matches.length > 0"
            class="load-more"
            @click="loadMore"
          >
            Cargar mas
          </button>
        </section>
      </main>
    </template>
  </div>
</template>

<style scoped>
.summoner-page {
  flex: 1;
  background: var(--bg-primary);
}

.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  gap: var(--spacing-md);
  color: var(--text-secondary);
}

.error-box {
  text-align: center;
  padding: var(--spacing-2xl);
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
}

.error-box h2 {
  color: var(--loss);
  margin-bottom: var(--spacing-sm);
}

.profile-header {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  padding: var(--spacing-xl) var(--spacing-lg);
}

.profile-header-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.profile-icon {
  position: relative;
  flex-shrink: 0;
}

.profile-icon img {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-md);
  border: 2px solid var(--border-secondary);
}

.level {
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid var(--border-primary);
}

.profile-info h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.profile-info .tag {
  color: var(--text-tertiary);
  font-weight: 400;
}

.region-badge {
  display: inline-block;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 0.65rem;
  font-weight: 600;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  letter-spacing: 0.5px;
}

.profile-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-lg);
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--spacing-xl);
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.no-rank {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  text-align: center;
  color: var(--text-tertiary);
  font-size: 0.85rem;
}

.section-title {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-md);
}

.matches-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.no-matches {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-2xl);
  text-align: center;
  color: var(--text-tertiary);
}

.load-more {
  width: 100%;
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  transition: all var(--transition-fast);
}

.load-more:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-secondary);
  color: var(--text-primary);
}

@media (max-width: 900px) {
  .profile-main {
    grid-template-columns: 1fr;
  }

  .sidebar {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }
}

@media (max-width: 600px) {
  .profile-header {
    padding: var(--spacing-lg) var(--spacing-md);
  }

  .profile-header-inner {
    gap: var(--spacing-md);
  }

  .profile-icon img {
    width: 56px;
    height: 56px;
  }

  .profile-info h1 {
    font-size: 1.2rem;
  }

  .profile-main {
    padding: var(--spacing-lg) var(--spacing-md);
  }

  .sidebar {
    grid-template-columns: 1fr;
  }
}
</style>
