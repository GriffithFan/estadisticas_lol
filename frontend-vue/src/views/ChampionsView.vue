<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useSummonerStore } from '@/stores/summoner'
import { useDataDragon } from '@/composables/useDataDragon'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const store = useSummonerStore()
const { getChampionIcon } = useDataDragon()

const searchQuery = ref('')
const selectedTag = ref<string | null>(null)
const loading = ref(false)

const tags = ['Fighter', 'Tank', 'Mage', 'Assassin', 'Marksman', 'Support']

const filteredChampions = computed(() => {
  let champions = Object.values(store.champions)

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    champions = champions.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.id.toLowerCase().includes(query)
    )
  }

  if (selectedTag.value) {
    champions = champions.filter(c => c.tags.includes(selectedTag.value!))
  }

  return champions.sort((a, b) => a.name.localeCompare(b.name))
})

const selectTag = (tag: string) => {
  selectedTag.value = selectedTag.value === tag ? null : tag
}

onMounted(async () => {
  loading.value = true
  await store.fetchDDragonVersion()
  await store.fetchChampions()
  loading.value = false
})
</script>

<template>
  <div class="champions-page">
    <header class="page-header">
      <h1>Campeones</h1>
      <span class="count">{{ filteredChampions.length }}</span>
    </header>

    <div class="filters">
      <input 
        v-model="searchQuery"
        type="text" 
        placeholder="Buscar..."
        class="search-input"
      />
      <div class="tags">
        <button 
          v-for="tag in tags" 
          :key="tag"
          class="tag-btn"
          :class="{ active: selectedTag === tag }"
          @click="selectTag(tag)"
        >
          {{ tag }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <LoadingSpinner />
    </div>

    <div v-else-if="filteredChampions.length === 0" class="empty">
      No se encontraron campeones
    </div>

    <div v-else class="champions-grid">
      <router-link 
        v-for="champion in filteredChampions" 
        :key="champion.id"
        :to="`/champion/${champion.id}`"
        class="champion-card"
      >
        <img :src="getChampionIcon(champion.key)" :alt="champion.name" />
        <div class="champion-info">
          <span class="name">{{ champion.name }}</span>
          <span class="role">{{ champion.tags[0] }}</span>
        </div>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.champions-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-lg);
}

.page-header {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
}

.count {
  font-size: 0.85rem;
  color: var(--text-tertiary);
}

.filters {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.search-input {
  max-width: 280px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  color: var(--text-primary);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.search-input:focus {
  outline: none;
  border-color: var(--blue-primary);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.tag-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 500;
  transition: all var(--transition-fast);
}

.tag-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.tag-btn.active {
  background: var(--blue-primary);
  border-color: var(--blue-primary);
  color: var(--bg-primary);
}

.loading,
.empty {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: var(--text-tertiary);
}

.champions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--spacing-md);
}

.champion-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.champion-card:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-secondary);
}

.champion-card img {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.champion-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.name {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role {
  font-size: 0.7rem;
  color: var(--text-tertiary);
}

@media (max-width: 768px) {
  .champions-page {
    padding: var(--spacing-lg) var(--spacing-md);
  }

  .champions-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: var(--spacing-sm);
  }

  .champion-card {
    padding: var(--spacing-sm);
    gap: var(--spacing-sm);
  }

  .champion-card img {
    width: 32px;
    height: 32px;
  }

  .name {
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .champions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
