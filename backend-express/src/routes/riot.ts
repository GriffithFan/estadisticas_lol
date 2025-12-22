import { Router, Request, Response } from 'express';
import { riotClient } from '../services/riotClient.js';
import { config } from '../config.js';

export const riotRouter = Router();

// Get summoner by Riot ID
riotRouter.get('/summoner/:region/:gameName/:tagLine', async (req: Request, res: Response) => {
  const { region, gameName, tagLine } = req.params;
  const routing = riotClient.getRoutingForRegion(region);

  try {
    // Get account info
    const accountResponse = await riotClient.getAccountByRiotId(gameName, tagLine, routing);
    if (!accountResponse.success) {
      res.status(accountResponse.statusCode || 404).json({ error: accountResponse.error });
      return;
    }

    const account = accountResponse.data;

    // Get summoner info
    const summonerResponse = await riotClient.getSummonerByPuuid(account.puuid, region);
    if (!summonerResponse.success) {
      res.status(summonerResponse.statusCode || 404).json({ error: summonerResponse.error });
      return;
    }

    const summoner = summonerResponse.data;

    res.json({
      puuid: account.puuid,
      gameName: account.gameName,
      tagLine: account.tagLine,
      summonerLevel: summoner.summonerLevel,
      profileIconId: summoner.profileIconId,
      id: summoner.id,
      accountId: summoner.accountId
    });
  } catch (error) {
    console.error('Error fetching summoner:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get ranked info
riotRouter.get('/ranked/:region/:puuid', async (req: Request, res: Response) => {
  const { region, puuid } = req.params;

  try {
    const response = await riotClient.getRankedEntriesByPuuid(puuid, region);
    if (!response.success) {
      res.status(response.statusCode || 404).json({ error: response.error });
      return;
    }

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching ranked info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get matches
riotRouter.get('/matches/:region/:puuid', async (req: Request, res: Response) => {
  const { region, puuid } = req.params;
  const start = parseInt(req.query.start as string) || 0;
  const count = Math.min(parseInt(req.query.count as string) || 10, 20);
  const routing = riotClient.getRoutingForRegion(region);

  try {
    // Get match IDs
    const idsResponse = await riotClient.getMatchIdsByPuuid(puuid, routing, { start, count });
    if (!idsResponse.success || !idsResponse.data) {
      res.status(idsResponse.statusCode || 404).json({ error: idsResponse.error });
      return;
    }

    // Fetch match details in parallel (with concurrency limit)
    const matchIds = idsResponse.data;
    const matches: any[] = [];

    // Process in batches of 5
    for (let i = 0; i < matchIds.length; i += 5) {
      const batch = matchIds.slice(i, i + 5);
      const batchPromises = batch.map(id => riotClient.getMatchById(id, routing));
      const batchResults = await Promise.all(batchPromises);
      
      for (const result of batchResults) {
        if (result.success && result.data) {
          matches.push(result.data);
        }
      }
    }

    res.json({ matches, total: matchIds.length });
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single match
riotRouter.get('/match/:region/:matchId', async (req: Request, res: Response) => {
  const { region, matchId } = req.params;
  const routing = riotClient.getRoutingForRegion(region);

  try {
    const response = await riotClient.getMatchById(matchId, routing);
    if (!response.success) {
      res.status(response.statusCode || 404).json({ error: response.error });
      return;
    }

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching match:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get champion mastery
riotRouter.get('/mastery/:region/:puuid', async (req: Request, res: Response) => {
  const { region, puuid } = req.params;
  const count = parseInt(req.query.count as string) || undefined;

  try {
    const response = await riotClient.getChampionMastery(puuid, region, count);
    if (!response.success) {
      res.status(response.statusCode || 404).json({ error: response.error });
      return;
    }

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching mastery:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get ranking (top players)
riotRouter.get('/ranking/:region', async (req: Request, res: Response) => {
  const { region } = req.params;
  const queue = (req.query.queue as string) || 'RANKED_SOLO_5x5';

  try {
    // Get challenger league
    const challengerResponse = await riotClient.getChallengerLeague(queue, region);
    
    if (!challengerResponse.success || !challengerResponse.data) {
      res.status(challengerResponse.statusCode || 500).json({ error: challengerResponse.error });
      return;
    }

    const entries = challengerResponse.data.entries || [];
    
    // Sort by LP
    const sorted = entries
      .sort((a: any, b: any) => b.leaguePoints - a.leaguePoints)
      .slice(0, 50)
      .map((entry: any, index: number) => ({
        rank: index + 1,
        summonerName: entry.summonerName,
        tier: 'CHALLENGER',
        leaguePoints: entry.leaguePoints,
        wins: entry.wins,
        losses: entry.losses,
        hotStreak: entry.hotStreak
      }));

    res.json({ players: sorted, tier: 'CHALLENGER', queue });
  } catch (error) {
    console.error('Error fetching ranking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get regions
riotRouter.get('/regions', (_req: Request, res: Response) => {
  const regions = Object.entries(config.platformRegions).map(([id, routing]) => ({
    id,
    name: config.regionNames[id] || id.toUpperCase(),
    routing
  }));
  res.json(regions);
});
