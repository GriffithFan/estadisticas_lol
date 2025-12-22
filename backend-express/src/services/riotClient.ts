import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config.js';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

class RiotApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'X-Riot-Token': config.riotApiKey,
        'Accept': 'application/json'
      }
    });
  }

  private getPlatformUrl(region: string): string {
    return `https://${region}.${config.riotApiBase}`;
  }

  private getRegionalUrl(routing: string): string {
    return `https://${routing}.${config.riotApiBase}`;
  }

  public getRoutingForRegion(region: string): string {
    return config.platformRegions[region] || 'americas';
  }

  private async request<T>(url: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get<T>(url, { params });
      return { success: true, data: response.data };
    } catch (error) {
      const axiosError = error as AxiosError;
      const statusCode = axiosError.response?.status || 500;
      
      const errorMessages: Record<number, string> = {
        400: 'Invalid request',
        401: 'Invalid API Key',
        403: 'Access forbidden',
        404: 'Not found',
        429: 'Rate limit exceeded',
        500: 'Riot server error',
        503: 'Service unavailable'
      };

      return {
        success: false,
        error: errorMessages[statusCode] || `HTTP Error ${statusCode}`,
        statusCode
      };
    }
  }

  // Account V1
  async getAccountByRiotId(gameName: string, tagLine: string, routing = 'americas'): Promise<ApiResponse> {
    const url = `${this.getRegionalUrl(routing)}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    return this.request(url);
  }

  async getAccountByPuuid(puuid: string, routing = 'americas'): Promise<ApiResponse> {
    const url = `${this.getRegionalUrl(routing)}/riot/account/v1/accounts/by-puuid/${puuid}`;
    return this.request(url);
  }

  // Summoner V4
  async getSummonerByPuuid(puuid: string, region = 'la1'): Promise<ApiResponse> {
    const url = `${this.getPlatformUrl(region)}/lol/summoner/v4/summoners/by-puuid/${puuid}`;
    return this.request(url);
  }

  async getSummonerById(summonerId: string, region = 'la1'): Promise<ApiResponse> {
    const url = `${this.getPlatformUrl(region)}/lol/summoner/v4/summoners/${summonerId}`;
    return this.request(url);
  }

  // Match V5
  async getMatchIdsByPuuid(
    puuid: string,
    routing = 'americas',
    options: { start?: number; count?: number; queue?: number; type?: string } = {}
  ): Promise<ApiResponse<string[]>> {
    const { start = 0, count = 20, queue, type } = options;
    const url = `${this.getRegionalUrl(routing)}/lol/match/v5/matches/by-puuid/${puuid}/ids`;
    const params: Record<string, any> = { start, count };
    if (queue) params.queue = queue;
    if (type) params.type = type;
    return this.request(url, params);
  }

  async getMatchById(matchId: string, routing = 'americas'): Promise<ApiResponse> {
    const url = `${this.getRegionalUrl(routing)}/lol/match/v5/matches/${matchId}`;
    return this.request(url);
  }

  // League V4
  async getRankedEntriesBySummoner(summonerId: string, region = 'la1'): Promise<ApiResponse> {
    const url = `${this.getPlatformUrl(region)}/lol/league/v4/entries/by-summoner/${summonerId}`;
    return this.request(url);
  }

  async getRankedEntriesByPuuid(puuid: string, region = 'la1'): Promise<ApiResponse> {
    const url = `${this.getPlatformUrl(region)}/lol/league/v4/entries/by-puuid/${puuid}`;
    return this.request(url);
  }

  async getChallengerLeague(queue = 'RANKED_SOLO_5x5', region = 'la1'): Promise<ApiResponse> {
    const url = `${this.getPlatformUrl(region)}/lol/league/v4/challengerleagues/by-queue/${queue}`;
    return this.request(url);
  }

  async getGrandmasterLeague(queue = 'RANKED_SOLO_5x5', region = 'la1'): Promise<ApiResponse> {
    const url = `${this.getPlatformUrl(region)}/lol/league/v4/grandmasterleagues/by-queue/${queue}`;
    return this.request(url);
  }

  async getMasterLeague(queue = 'RANKED_SOLO_5x5', region = 'la1'): Promise<ApiResponse> {
    const url = `${this.getPlatformUrl(region)}/lol/league/v4/masterleagues/by-queue/${queue}`;
    return this.request(url);
  }

  // Champion Mastery V4
  async getChampionMastery(puuid: string, region = 'la1', count?: number): Promise<ApiResponse> {
    let url = `${this.getPlatformUrl(region)}/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}`;
    if (count) url += `/top?count=${count}`;
    return this.request(url);
  }
}

export const riotClient = new RiotApiClient();
