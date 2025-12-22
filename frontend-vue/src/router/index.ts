import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue')
  },
  {
    path: '/summoner/:region/:gameName/:tagLine',
    name: 'summoner',
    component: () => import('@/views/SummonerView.vue'),
    props: true
  },
  {
    path: '/champions',
    name: 'champions',
    component: () => import('@/views/ChampionsView.vue')
  },
  {
    path: '/champion/:championId',
    name: 'champion-detail',
    component: () => import('@/views/ChampionDetailView.vue'),
    props: true
  },
  {
    path: '/tierlist',
    name: 'tierlist',
    component: () => import('@/views/TierListView.vue')
  },
  {
    path: '/ranking',
    name: 'ranking',
    component: () => import('@/views/RankingView.vue')
  },
  {
    path: '/multisearch',
    name: 'multisearch',
    component: () => import('@/views/MultiSearchView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
