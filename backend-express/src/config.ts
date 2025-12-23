import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  riotApiKey: process.env.RIOT_API_KEY || 'RGAPI-e3831bd5-e3b4-4d76-aa95-572e727d23ef',
  defaultRegion: process.env.DEFAULT_REGION || 'la1',
  defaultRouting: process.env.DEFAULT_ROUTING || 'americas',
  
  riotApiBase: 'api.riotgames.com',
  ddragonBase: 'https://ddragon.leagueoflegends.com',
  
  platformRegions: {
    br1: 'americas',
    eun1: 'europe',
    euw1: 'europe',
    jp1: 'asia',
    kr: 'asia',
    la1: 'americas',
    la2: 'americas',
    na1: 'americas',
    oc1: 'sea',
    tr1: 'europe',
    ru: 'europe',
    ph2: 'sea',
    sg2: 'sea',
    th2: 'sea',
    tw2: 'sea',
    vn2: 'sea'
  } as Record<string, string>,
  
  regionNames: {
    br1: 'Brasil',
    eun1: 'EU Nordic & East',
    euw1: 'EU West',
    jp1: 'Japón',
    kr: 'Corea',
    la1: 'LAN',
    la2: 'LAS',
    na1: 'NA',
    oc1: 'Oceanía',
    tr1: 'Turquía',
    ru: 'Rusia'
  } as Record<string, string>
};
