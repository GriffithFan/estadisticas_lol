import axios from 'axios';
import { config } from '../config.js';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class DDragonService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly cacheTTL = 3600000; // 1 hour
  private version: string | null = null;

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.cacheTTL;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || this.isExpired(entry.timestamp)) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async getVersion(): Promise<string> {
    if (this.version) return this.version;

    const cached = this.getFromCache<string[]>('versions');
    if (cached) {
      this.version = cached[0];
      return this.version;
    }

    try {
      const response = await axios.get<string[]>(`${config.ddragonBase}/api/versions.json`);
      this.setCache('versions', response.data);
      this.version = response.data[0];
      return this.version;
    } catch (error) {
      console.error('Error fetching DDragon version:', error);
      return '14.24.1'; // Fallback version
    }
  }

  async getVersions(): Promise<string[]> {
    const cached = this.getFromCache<string[]>('versions');
    if (cached) return cached;

    try {
      const response = await axios.get<string[]>(`${config.ddragonBase}/api/versions.json`);
      this.setCache('versions', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching versions:', error);
      return ['14.24.1'];
    }
  }

  async getChampions(): Promise<Record<string, any>> {
    const version = await this.getVersion();
    const cacheKey = `champions_${version}`;
    
    const cached = this.getFromCache<Record<string, any>>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(
        `${config.ddragonBase}/cdn/${version}/data/es_MX/champion.json`
      );
      const champions = response.data.data;
      this.setCache(cacheKey, champions);
      return champions;
    } catch (error) {
      console.error('Error fetching champions:', error);
      return {};
    }
  }

  async getChampion(championId: string): Promise<any> {
    const version = await this.getVersion();
    const cacheKey = `champion_${version}_${championId}`;

    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(
        `${config.ddragonBase}/cdn/${version}/data/es_MX/champion/${championId}.json`
      );
      const champion = response.data.data[championId];
      this.setCache(cacheKey, champion);
      return champion;
    } catch (error) {
      console.error(`Error fetching champion ${championId}:`, error);
      return null;
    }
  }

  async getItems(): Promise<Record<string, any>> {
    const version = await this.getVersion();
    const cacheKey = `items_${version}`;

    const cached = this.getFromCache<Record<string, any>>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(
        `${config.ddragonBase}/cdn/${version}/data/es_MX/item.json`
      );
      const items = response.data.data;
      this.setCache(cacheKey, items);
      return items;
    } catch (error) {
      console.error('Error fetching items:', error);
      return {};
    }
  }

  async getSummonerSpells(): Promise<Record<string, any>> {
    const version = await this.getVersion();
    const cacheKey = `spells_${version}`;

    const cached = this.getFromCache<Record<string, any>>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(
        `${config.ddragonBase}/cdn/${version}/data/es_MX/summoner.json`
      );
      const spells = response.data.data;
      this.setCache(cacheKey, spells);
      return spells;
    } catch (error) {
      console.error('Error fetching summoner spells:', error);
      return {};
    }
  }

  async getRunes(): Promise<any[]> {
    const version = await this.getVersion();
    const cacheKey = `runes_${version}`;

    const cached = this.getFromCache<any[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(
        `${config.ddragonBase}/cdn/${version}/data/es_MX/runesReforged.json`
      );
      this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching runes:', error);
      return [];
    }
  }
}

export const ddragonService = new DDragonService();
