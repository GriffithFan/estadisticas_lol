<script setup lang="ts">
import { useRouter } from 'vue-router'
import SearchForm from '@/components/common/SearchForm.vue'

const router = useRouter()

const handleSearch = (region: string, gameName: string, tagLine: string) => {
  router.push(`/summoner/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`)
}
</script>

<template>
  <div class="home">
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="hero-content">
        <span class="patch-badge">PATCH 25.S1</span>
        <h1 class="hero-title">LoL Stats</h1>
        <p class="hero-subtitle">Estadisticas de jugadores y campeones</p>

        <SearchForm 
          class="hero-search"
          @search="handleSearch"
        />

        <p class="hero-hint">Nombre#TAG</p>
      </div>
    </section>

    <section class="features">
      <div class="feature">
        <div class="feature-number">01</div>
        <h3>Perfil</h3>
        <p>Busca cualquier invocador por region</p>
      </div>
      <div class="feature">
        <div class="feature-number">02</div>
        <h3>Historial</h3>
        <p>Partidas recientes con estadisticas</p>
      </div>
      <div class="feature">
        <div class="feature-number">03</div>
        <h3>Tier List</h3>
        <p>Campeones meta por rol</p>
      </div>
      <div class="feature">
        <div class="feature-number">04</div>
        <h3>Multi-Search</h3>
        <p>Analiza a tu equipo en champ select</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.hero {
  position: relative;
  min-height: 50vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-3xl) var(--spacing-lg);
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(ellipse at 50% 0%, rgba(10, 200, 185, 0.08) 0%, transparent 50%),
    linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 480px;
  width: 100%;
}

.patch-badge {
  display: inline-block;
  background: var(--bg-tertiary);
  color: var(--gold-200);
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-sm);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 1.5px;
  margin-bottom: var(--spacing-xl);
  border: 1px solid var(--gold-400);
}

.hero-title {
  font-size: clamp(2.5rem, 8vw, 4rem);
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
  letter-spacing: -2px;
  line-height: 1;
}

.hero-subtitle {
  color: var(--text-tertiary);
  font-size: 1rem;
  margin-bottom: var(--spacing-2xl);
  font-weight: 400;
}

.hero-search {
  margin-bottom: var(--spacing-md);
}

.hero-hint {
  color: var(--text-disabled);
  font-size: 0.75rem;
}

.features {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--border-primary);
  border-top: 1px solid var(--border-primary);
  border-bottom: 1px solid var(--border-primary);
}

.feature {
  background: var(--bg-secondary);
  padding: var(--spacing-xl);
  text-align: center;
  transition: background var(--transition-normal);
}

.feature:hover {
  background: var(--bg-tertiary);
}

.feature-number {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--blue-primary);
  letter-spacing: 2px;
  margin-bottom: var(--spacing-sm);
}

.feature h3 {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.feature p {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  line-height: 1.4;
}

@media (max-width: 900px) {
  .features {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .hero {
    min-height: 45vh;
    padding: var(--spacing-2xl) var(--spacing-md);
  }
  
  .features {
    grid-template-columns: 1fr;
  }
  
  .feature {
    padding: var(--spacing-lg);
  }
}
</style>
