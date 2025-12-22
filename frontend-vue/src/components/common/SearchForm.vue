<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  compact?: boolean
}>(), {
  compact: false
})

const emit = defineEmits<{
  search: [region: string, gameName: string, tagLine: string]
}>()

const region = ref('la2')
const searchInput = ref('')

const regions = [
  { value: 'la1', label: 'LAN' },
  { value: 'la2', label: 'LAS' },
  { value: 'na1', label: 'NA' },
  { value: 'euw1', label: 'EUW' },
  { value: 'eun1', label: 'EUNE' },
  { value: 'kr', label: 'KR' },
  { value: 'jp1', label: 'JP' },
  { value: 'br1', label: 'BR' },
  { value: 'oc1', label: 'OCE' }
]

const handleSubmit = () => {
  const input = searchInput.value.trim()
  if (!input) return

  let gameName = input
  let tagLine = region.value.toUpperCase()

  if (input.includes('#')) {
    const parts = input.split('#')
    gameName = parts[0].trim()
    tagLine = parts[1]?.trim() || tagLine
  }

  if (gameName) {
    emit('search', region.value, gameName, tagLine)
  }
}
</script>

<template>
  <form 
    class="search-form" 
    :class="{ 'search-form-compact': compact }"
    @submit.prevent="handleSubmit"
  >
    <select v-model="region" class="region-select">
      <option v-for="r in regions" :key="r.value" :value="r.value">
        {{ r.label }}
      </option>
    </select>

    <div class="input-wrapper">
      <input
        v-model="searchInput"
        type="text"
        class="search-input"
        :placeholder="compact ? 'Buscar...' : 'Nombre#TAG'"
        autocomplete="off"
        spellcheck="false"
      />
      <button type="submit" class="search-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </button>
    </div>
  </form>
</template>

<style scoped>
.search-form {
  display: flex;
  gap: 1px;
  background: var(--border-primary);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.region-select {
  appearance: none;
  background: var(--bg-tertiary);
  border: none;
  color: var(--text-primary);
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  min-width: 60px;
  text-align: center;
}

.region-select:focus {
  outline: none;
  background: var(--bg-hover);
}

.input-wrapper {
  display: flex;
  flex: 1;
  background: var(--bg-tertiary);
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-primary);
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: 0.9rem;
  min-width: 0;
}

.search-input::placeholder {
  color: var(--text-disabled);
}

.search-input:focus {
  outline: none;
}

.search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.search-btn:hover {
  color: var(--blue-primary);
  background: var(--bg-hover);
}

/* Compact variant */
.search-form-compact {
  border-radius: var(--radius-sm);
}

.search-form-compact .region-select {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: 0.75rem;
  min-width: 50px;
}

.search-form-compact .search-input {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: 0.8rem;
}

.search-form-compact .search-btn {
  width: 36px;
}

@media (max-width: 480px) {
  .region-select {
    padding: var(--spacing-sm) var(--spacing-md);
    min-width: 50px;
    font-size: 0.75rem;
  }

  .search-input {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: 0.85rem;
  }

  .search-btn {
    width: 40px;
  }
}
</style>
