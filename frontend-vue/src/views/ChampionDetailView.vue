<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSummonerStore } from '@/stores/summoner'
import { useDataDragon } from '@/composables/useDataDragon'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const route = useRoute()
const store = useSummonerStore()
const { getChampionSplash, getChampionIcon } = useDataDragon()

const loading = ref(true)
const champion = ref<any>(null)

const championId = computed(() => route.params.id as string)

const fetchChampion = async () => {
  loading.value = true
  try {
    await store.fetchDDragonVersion()
    await store.fetchChampions()
    
    const champ = Object.values(store.champions).find(
      c => c.id === championId.value || c.name === championId.value
    )
    
    if (champ) {
      champion.value = champ
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchChampion()
})
</script>

<template>
  <div class="champion-page">
    <div v-if="loading" class="loading">
      <LoadingSpinner />
    </div>

    <template v-else-if="champion">
      <header class="champion-header">
        <div class="header-bg" :style="{ backgroundImage: `url(${getChampionSplash(champion.id)})` }"></div>
        <div class="header-content">
          <img :src="getChampionIcon(champion.key)" :alt="champion.name" class="champion-icon" />
          <div class="champion-info">
            <h1>{{ champion.name }}</h1>
            <p class="title">{{ champion.title }}</p>
            <div class="tags">
              <span v-for="tag in champion.tags" :key="tag" class="tag">{{ tag }}</span>
            </div>
          </div>
        </div>
      </header>

      <main class="champion-content">
        <section class="section">
          <h2>Descripcion</h2>
          <p class="blurb">{{ champion.blurb }}</p>
        </section>

        <section class="section">
          <h2>Estadisticas Base</h2>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">HP</span>
              <span class="stat-value">{{ champion.stats.hp }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">MP</span>
              <span class="stat-value">{{ champion.stats.mp }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Armor</span>
              <span class="stat-value">{{ champion.stats.armor }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">MR</span>
              <span class="stat-value">{{ champion.stats.spellblock }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">AD</span>
              <span class="stat-value">{{ champion.stats.attackdamage }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">AS</span>
              <span class="stat-value">{{ champion.stats.attackspeed }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Range</span>
              <span class="stat-value">{{ champion.stats.attackrange }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">MS</span>
              <span class="stat-value">{{ champion.stats.movespeed }}</span>
            </div>
          </div>
        </section>
      </main>
    </template>

    <div v-else class="not-found">
      <h2>Campeon no encontrado</h2>
      <router-link to="/champions" class="back-link">Ver todos los campeones</router-link>
    </div>
  </div>
</template>

<style scoped>
.champion-page {
  flex: 1;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
}

.champion-header {
  position: relative;
  padding: var(--spacing-3xl) var(--spacing-lg);
  min-height: 280px;
  display: flex;
  align-items: flex-end;
}

.header-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center top;
  filter: brightness(0.4);
}

.header-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, var(--bg-primary) 0%, transparent 100%);
}

.header-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  gap: var(--spacing-xl);
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}

.champion-icon {
  width: 100px;
  height: 100px;
  border-radius: var(--radius-lg);
  border: 3px solid var(--gold-200);
  flex-shrink: 0;
}

.champion-info h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: var(--spacing-xs);
}

.title {
  color: var(--gold-200);
  font-size: 0.9rem;
  font-style: italic;
  margin-bottom: var(--spacing-md);
}

.tags {
  display: flex;
  gap: var(--spacing-sm);
}

.tag {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
}

.champion-content {
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-lg);
}

.section {
  margin-bottom: var(--spacing-2xl);
}

.section h2 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: var(--spacing-md);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.blurb {
  color: var(--text-secondary);
  line-height: 1.7;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-md);
}

.stat-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.7rem;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--spacing-xs);
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  gap: var(--spacing-md);
}

.back-link {
  color: var(--blue-primary);
}

@media (max-width: 768px) {
  .champion-header {
    padding: var(--spacing-2xl) var(--spacing-md);
    min-height: 200px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-md);
  }

  .champion-icon {
    width: 72px;
    height: 72px;
  }

  .champion-info h1 {
    font-size: 1.5rem;
  }

  .champion-content {
    padding: var(--spacing-lg) var(--spacing-md);
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
