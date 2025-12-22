import { Router, Request, Response } from 'express';
import { ddragonService } from '../services/ddragon.js';

export const ddragonRouter = Router();

// Get DDragon versions
ddragonRouter.get('/versions', async (_req: Request, res: Response) => {
  try {
    const versions = await ddragonService.getVersions();
    res.json(versions);
  } catch (error) {
    console.error('Error fetching versions:', error);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

// Get current version
ddragonRouter.get('/version', async (_req: Request, res: Response) => {
  try {
    const version = await ddragonService.getVersion();
    res.json({ version });
  } catch (error) {
    console.error('Error fetching version:', error);
    res.status(500).json({ error: 'Failed to fetch version' });
  }
});

// Get all champions
ddragonRouter.get('/champions', async (_req: Request, res: Response) => {
  try {
    const version = await ddragonService.getVersion();
    const champions = await ddragonService.getChampions();
    res.json({ version, champions });
  } catch (error) {
    console.error('Error fetching champions:', error);
    res.status(500).json({ error: 'Failed to fetch champions' });
  }
});

// Get single champion details
ddragonRouter.get('/champion/:championId', async (req: Request, res: Response) => {
  const { championId } = req.params;

  try {
    const champion = await ddragonService.getChampion(championId);
    if (!champion) {
      res.status(404).json({ error: 'Champion not found' });
      return;
    }
    res.json(champion);
  } catch (error) {
    console.error('Error fetching champion:', error);
    res.status(500).json({ error: 'Failed to fetch champion' });
  }
});

// Get champion build (mock data for now)
ddragonRouter.get('/champion/:championId/build', async (req: Request, res: Response) => {
  const { championId } = req.params;

  try {
    const champion = await ddragonService.getChampion(championId);
    if (!champion) {
      res.status(404).json({ error: 'Champion not found' });
      return;
    }

    // Mock build data - in production, this would come from stats APIs
    const build = {
      championId,
      championName: champion.name,
      role: champion.tags[0]?.toLowerCase() || 'unknown',
      runes: {
        keystone: getDefaultKeystone(champion.tags),
        primary: 'Precision',
        secondary: 'Domination'
      },
      items: {
        starter: [1055, 2003],
        core: [3078, 3153, 6333],
        boots: 3111,
        situational: [3026, 3071, 3156]
      },
      spells: ['Flash', 'Teleport'],
      skillOrder: ['Q', 'W', 'E', 'Q', 'Q', 'R'],
      winRate: (48 + Math.random() * 8).toFixed(1),
      pickRate: (2 + Math.random() * 10).toFixed(1)
    };

    res.json(build);
  } catch (error) {
    console.error('Error fetching build:', error);
    res.status(500).json({ error: 'Failed to fetch build' });
  }
});

// Get all items
ddragonRouter.get('/items', async (_req: Request, res: Response) => {
  try {
    const version = await ddragonService.getVersion();
    const items = await ddragonService.getItems();
    res.json({ version, items });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Get summoner spells
ddragonRouter.get('/spells', async (_req: Request, res: Response) => {
  try {
    const version = await ddragonService.getVersion();
    const spells = await ddragonService.getSummonerSpells();
    res.json({ version, spells });
  } catch (error) {
    console.error('Error fetching spells:', error);
    res.status(500).json({ error: 'Failed to fetch spells' });
  }
});

// Get runes
ddragonRouter.get('/runes', async (_req: Request, res: Response) => {
  try {
    const version = await ddragonService.getVersion();
    const runes = await ddragonService.getRunes();
    res.json({ version, runes });
  } catch (error) {
    console.error('Error fetching runes:', error);
    res.status(500).json({ error: 'Failed to fetch runes' });
  }
});

// Helper function for default keystone based on champion tags
function getDefaultKeystone(tags: string[]): string {
  const tag = tags[0]?.toLowerCase() || '';
  
  const keystones: Record<string, string> = {
    fighter: 'Conqueror',
    tank: 'Grasp of the Undying',
    mage: 'Arcane Comet',
    assassin: 'Electrocute',
    marksman: 'Lethal Tempo',
    support: 'Guardian'
  };

  return keystones[tag] || 'Conqueror';
}
