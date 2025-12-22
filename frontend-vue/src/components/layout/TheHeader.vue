<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import SearchForm from '@/components/common/SearchForm.vue'

const router = useRouter()
const themeStore = useThemeStore()
const mobileMenuOpen = ref(false)

const navLinks = [
  { name: 'Tier List', path: '/tierlist' },
  { name: 'Campeones', path: '/champions' },
  { name: 'Ranking', path: '/ranking' },
  { name: 'Multi-Search', path: '/multisearch' }
]

const goHome = () => {
  router.push('/')
  mobileMenuOpen.value = false
}

const handleSearch = (region: string, gameName: string, tagLine: string) => {
  router.push(`/summoner/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`)
}

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
}
</script>

<template>
  <header class="header">
    <div class="header-inner">
      <a href="/" class="logo" @click.prevent="goHome">
        <span class="logo-text">LoL</span><span class="logo-accent">Stats</span>
      </a>

      <nav class="nav" :class="{ 'nav-open': mobileMenuOpen }">
        <router-link 
          v-for="link in navLinks" 
          :key="link.path"
          :to="link.path" 
          class="nav-link"
          @click="mobileMenuOpen = false"
        >
          {{ link.name }}
        </router-link>
      </nav>

      <div class="header-actions">
        <SearchForm 
          class="header-search"
          @search="handleSearch"
          compact
        />

        <button 
          class="theme-btn" 
          @click="themeStore.toggleTheme"
          :title="themeStore.theme === 'dark' ? 'Modo claro' : 'Modo oscuro'"
        >
          <svg v-if="themeStore.theme === 'dark'" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313-12.454z"/>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        </button>

        <button class="mobile-menu-btn" @click="toggleMobileMenu">
          <svg v-if="!mobileMenuOpen" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
  height: 48px;
  display: flex;
  align-items: center;
  gap: var(--spacing-xl);
}

.logo {
  font-size: 1rem;
  font-weight: 700;
  text-decoration: none;
  letter-spacing: -0.5px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.logo-text {
  color: var(--text-primary);
}

.logo-accent {
  color: var(--blue-primary);
}

.nav {
  display: flex;
  gap: var(--spacing-xs);
}

.nav-link {
  color: var(--text-secondary);
  text-decoration: none;
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 500;
  transition: all var(--transition-fast);
}

.nav-link:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.nav-link.router-link-active {
  color: var(--blue-primary);
  background: rgba(10, 200, 185, 0.1);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-left: auto;
}

.header-search {
  width: 280px;
}

.theme-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.theme-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.mobile-menu-btn {
  display: none;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
}

@media (max-width: 900px) {
  .header-search {
    display: none;
  }
}

@media (max-width: 768px) {
  .header-inner {
    padding: 0 var(--spacing-md);
  }

  .nav {
    display: none;
    position: absolute;
    top: 48px;
    left: 0;
    right: 0;
    flex-direction: column;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-primary);
    padding: var(--spacing-sm);
    gap: 0;
  }

  .nav-open {
    display: flex;
  }

  .nav-link {
    padding: var(--spacing-md);
    border-radius: 0;
  }

  .mobile-menu-btn {
    display: flex;
  }
}
</style>
