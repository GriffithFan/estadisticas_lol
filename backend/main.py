"""
League of Legends Statistics App - Main Server
===============================================
Servidor principal FastAPI para la aplicación de estadísticas de LoL
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Tuple
from contextlib import asynccontextmanager
import asyncio
import os
from collections import defaultdict
from datetime import datetime, timezone

from backend.riot_client import riot_client
from backend.services.ddragon import ddragon
from backend.services.recommendations import recommendation_service
from backend.services.champion_builds import (
    get_champion_build, 
    get_default_build_for_class,
    get_keystone_info,
    get_secondary_tree_name
)
from backend.config import settings

# Crear aplicación FastAPI con lifespan

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await riot_client.aclose()


app = FastAPI(
    title="LoL Statistics App",
    description="Aplicación para estadísticas de League of Legends con recomendaciones",
    version="1.0.0",
    lifespan=lifespan
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar archivos estáticos
frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(frontend_path):
    app.mount("/static", StaticFiles(directory=frontend_path), name="static")


async def fetch_match_details(match_ids: List[str], routing: str, concurrency: int = 5) -> List[dict]:
    """Obtiene detalles de partidas en paralelo con control de tasa"""
    if not match_ids:
        return []
    semaphore = asyncio.Semaphore(concurrency)
    match_map: Dict[str, dict] = {}

    async def fetch_single(match_id: str) -> None:
        attempts = 0
        delay = 1
        while attempts < 3:
            async with semaphore:
                response = await riot_client.get_match_by_id(match_id, routing)
            if response.get("success"):
                match_map[match_id] = response["data"]
                return
            if response.get("status_code") == 429 and attempts < 2:
                await asyncio.sleep(delay)
                delay *= 2
                attempts += 1
                continue
            return

    await asyncio.gather(*(fetch_single(mid) for mid in match_ids))
    return [match_map[mid] for mid in match_ids if mid in match_map]


# Cache simple en memoria para ranked (TTL en segundos)
RANKED_CACHE: Dict[tuple, dict] = {}
RANKED_CACHE_TTL = 600


def get_cached_ranked(puuid: str, region: str) -> Optional[List[dict]]:
    key = (puuid, region)
    entry = RANKED_CACHE.get(key)
    if not entry:
        return None
    if (datetime.now(timezone.utc) - entry["ts"]).total_seconds() > RANKED_CACHE_TTL:
        RANKED_CACHE.pop(key, None)
        return None
    return entry.get("data")


def set_cached_ranked(puuid: str, region: str, data: List[dict]) -> None:
    key = (puuid, region)
    RANKED_CACHE[key] = {"data": data, "ts": datetime.now(timezone.utc)}


async def fetch_ranked_entries(puuid: str, region: str) -> List[dict]:
    """Obtiene las entradas de ranked para un jugador con reintentos ante 429"""
    cached = get_cached_ranked(puuid, region)

    async def with_retry(fn, *args, retries: int = 3, base_delay: float = 0.6):
        attempt = 0
        while attempt < retries:
            result = await fn(*args)
            if result.get("success"):
                return result
            status = result.get("status_code")
            if status == 429 and attempt < retries - 1:
                await asyncio.sleep(base_delay * (2 ** attempt))
                attempt += 1
                continue
            return result

    # Usar el nuevo endpoint por PUUID directamente (no necesita summoner_id)
    league_result = await with_retry(riot_client.get_league_entries_by_puuid, puuid, region)
    if league_result.get("success"):
        set_cached_ranked(puuid, region, league_result["data"])
        return league_result["data"]
    # Si falló pero hay cache reciente, devolverla para no dejar al usuario sin elo
    if cached:
        return cached
    return []


TIER_ORDER = {
    "IRON": 1,
    "BRONZE": 2,
    "SILVER": 3,
    "GOLD": 4,
    "PLATINUM": 5,
    "EMERALD": 6,
    "DIAMOND": 7,
    "MASTER": 8,
    "GRANDMASTER": 9,
    "CHALLENGER": 10
}


DIVISION_ORDER = {"IV": 1, "III": 2, "II": 3, "I": 4}


def resolve_rank_value(entry: dict) -> int:
    tier_value = TIER_ORDER.get(entry.get("tier", ""), 0) * 1000
    division_value = DIVISION_ORDER.get(entry.get("rank", ""), 0) * 10
    lp = entry.get("leaguePoints", 0)
    return tier_value + division_value + lp


async def compute_ranked_summary(puuid: str, region: str) -> Dict[str, dict]:
    entries = await fetch_ranked_entries(puuid, region)
    total_wins = sum(e.get("wins", 0) for e in entries)
    total_losses = sum(e.get("losses", 0) for e in entries)
    best_entry = max(entries, key=resolve_rank_value, default=None)
    return {
        "entries": entries,
        "best_queue": best_entry,
        "overall": {
            "wins": total_wins,
            "losses": total_losses
        }
    }


async def compute_champion_stats_summary(
    puuid: str,
    region: str,
    match_limit: int = 500,
    season_year: Optional[int] = None
) -> Tuple[List[dict], List[str]]:
    routing = riot_client.get_routing_for_region(region)
    season_start_ts = get_season_start_timestamp(season_year)
    match_ids = await collect_season_match_ids(
        puuid,
        routing,
        match_limit,
        season_start_ts
    )
    if not match_ids:
        return [], []
    matches = await fetch_match_details(match_ids, routing)
    champ_stats: Dict[int, dict] = {}

    for match in matches:
        info = match.get("info", {})
        participants = info.get("participants", [])
        player = next((p for p in participants if p.get("puuid") == puuid), None)
        if not player:
            continue
        champ_id = int(player.get("championId", 0))
        stats = champ_stats.setdefault(
            champ_id,
            {
                "games": 0,
                "wins": 0,
                "kills": 0,
                "deaths": 0,
                "assists": 0,
                "cs": 0,
                "duration": 0,
                "damage": 0,
                "gold": 0,
                "vision": 0,
                "items": defaultdict(int),
                "spells": defaultdict(int),
                "keystones": defaultdict(int)
            }
        )

        stats["games"] += 1
        if player.get("win"):
            stats["wins"] += 1
        stats["kills"] += player.get("kills", 0)
        stats["deaths"] += player.get("deaths", 0)
        stats["assists"] += player.get("assists", 0)
        stats["cs"] += player.get("totalMinionsKilled", 0) + player.get("neutralMinionsKilled", 0)
        stats["duration"] += info.get("gameDuration", 0)
        stats["damage"] += player.get("totalDamageDealtToChampions", 0)
        stats["gold"] += player.get("goldEarned", 0)
        stats["vision"] += player.get("visionScore", 0)

        built_items = [player.get(f"item{i}") for i in range(6)]
        for item_id in built_items:
            if item_id and item_id != 0:
                stats["items"][int(item_id)] += 1

        spells = [player.get("summoner1Id"), player.get("summoner2Id")]
        if all(spells):
            spells.sort()
            key = f"{spells[0]}-{spells[1]}"
            stats["spells"][key] += 1

        keystone = (
            player.get("perks", {})
            .get("styles", [{}])[0]
            .get("selections", [{}])[0]
            .get("perk")
        )
        if keystone:
            stats["keystones"][int(keystone)] += 1

    summary = []
    for champ_id, data in champ_stats.items():
        summary.append({
            "championId": champ_id,
            "games": data["games"],
            "wins": data["wins"],
            "kills": data["kills"],
            "deaths": data["deaths"],
            "assists": data["assists"],
            "cs": data["cs"],
            "duration": data["duration"],
            "damage": data["damage"],
            "gold": data["gold"],
            "vision": data["vision"],
            "items": sorted(
                ( {"id": item_id, "count": count} for item_id, count in data["items"].items() ),
                key=lambda x: x["count"],
                reverse=True
            )[:6],
            "spells": sorted(
                (
                    {"ids": [int(pair.split("-")[0]), int(pair.split("-")[1])], "count": count}
                    for pair, count in data["spells"].items()
                ),
                key=lambda x: x["count"],
                reverse=True
            )[:2],
            "keystones": sorted(
                ( {"id": perk_id, "count": count} for perk_id, count in data["keystones"].items() ),
                key=lambda x: x["count"],
                reverse=True
            )[:2]
        })

    summary.sort(key=lambda c: c["games"], reverse=True)
    return summary, match_ids


async def fetch_leaderboard_profiles(entries: List[dict], region: str, concurrency: int = 10) -> Dict[str, dict]:
    """
    Obtiene informacion de perfil enriquecida para jugadores del ranking.
    Incluye nivel, icono y Riot ID real.
    """
    semaphore = asyncio.Semaphore(concurrency)
    results: Dict[str, dict] = {}
    routing = riot_client.get_routing_for_region(region)

    async def fetch_single(entry: dict) -> None:
        summoner_id = entry.get("summonerId")
        if not summoner_id:
            return
        async with semaphore:
            # Obtener datos del summoner (incluye PUUID, nivel, icono)
            profile = await riot_client.get_summoner_by_id(summoner_id, region)
            if not profile.get("success"):
                return
            
            summoner_data = profile["data"]
            puuid = summoner_data.get("puuid")
            
            # Obtener Riot ID real desde el PUUID
            riot_id_name = None
            riot_id_tag = None
            if puuid:
                account = await riot_client.get_account_by_puuid(puuid, routing)
                if account.get("success"):
                    riot_id_name = account["data"].get("gameName")
                    riot_id_tag = account["data"].get("tagLine")
            
            results[summoner_id] = {
                "profileIconId": summoner_data.get("profileIconId"),
                "summonerLevel": summoner_data.get("summonerLevel"),
                "puuid": puuid,
                "gameName": riot_id_name,
                "tagLine": riot_id_tag,
                "name": f"{riot_id_name}#{riot_id_tag}" if riot_id_name else None
            }

    await asyncio.gather(*(fetch_single(entry) for entry in entries))
    return results


def get_season_start_timestamp(season_year: Optional[int] = None) -> int:
    year = season_year or datetime.now(timezone.utc).year
    start = datetime(year, 1, 1, tzinfo=timezone.utc)
    return int(start.timestamp())


async def collect_season_match_ids(
    puuid: str,
    routing: str,
    match_limit: int,
    start_timestamp: Optional[int]
) -> List[str]:
    if match_limit <= 0:
        return []
    match_ids: List[str] = []
    batch_size = 100
    start = 0

    while len(match_ids) < match_limit:
        count = min(batch_size, match_limit - len(match_ids))
        result = await riot_client.get_match_ids_by_puuid(
            puuid,
            routing,
            start,
            count,
            start_time=start_timestamp
        )
        if not result.get("success"):
            break
        ids = result.get("data", [])
        if not ids:
            break
        match_ids.extend(ids)
        if len(ids) < count:
            break
        start += count

    return match_ids


# ==================== RUTAS PRINCIPALES ====================

@app.get("/")
async def root():
    """Sirve la página principal"""
    index_path = os.path.join(frontend_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "LoL Statistics API", "status": "running"}


@app.get("/api/health")
async def health_check():
    """Verificación de salud del servidor"""
    return {"status": "healthy", "api_key_configured": bool(settings.riot_api_key)}


# ==================== RUTAS DE CONFIGURACIÓN ====================

@app.get("/api/regions")
async def get_regions():
    """Obtiene la lista de regiones disponibles"""
    return {
        "regions": [
            {"id": key, "name": value} 
            for key, value in settings.region_names.items()
        ]
    }


@app.get("/api/ddragon/version")
async def get_ddragon_version():
    """Obtiene la versión actual de Data Dragon"""
    version = await ddragon.get_latest_version()
    return {"version": version}


@app.get("/api/ddragon/champions")
async def get_champions():
    """Obtiene la lista de todos los campeones"""
    champions = await ddragon.get_champions()
    return champions


@app.get("/api/ddragon/spells")
async def get_summoner_spells():
    """Obtiene los hechizos de invocador"""
    spells = await ddragon.get_summoner_spells()
    return spells


@app.get("/api/ddragon/items")
async def get_items():
    """Obtiene los items del juego"""
    items = await ddragon.get_items()
    return items


# ==================== RUTAS DE CUENTA Y JUGADOR ====================

@app.get("/api/account/{game_name}/{tag_line}")
async def get_account_by_riot_id(
    game_name: str,
    tag_line: str,
    region: str = Query("la1", description="Región del servidor")
):
    """Busca una cuenta por Riot ID (gameName#tagLine)"""
    routing = riot_client.get_routing_for_region(region)
    
    account_result = await riot_client.get_account_by_riot_id(game_name, tag_line, routing)
    if not account_result.get("success"):
        raise HTTPException(
            status_code=account_result.get("status_code", 404),
            detail=account_result.get("error", "Cuenta no encontrada")
        )
    
    return account_result["data"]


@app.get("/api/summoner/{puuid}")
async def get_summoner_by_puuid(
    puuid: str,
    region: str = Query("la1", description="Región del servidor")
):
    """Obtiene datos del invocador por PUUID"""
    summoner_result = await riot_client.get_summoner_by_puuid(puuid, region)
    if not summoner_result.get("success"):
        raise HTTPException(
            status_code=summoner_result.get("status_code", 404),
            detail=summoner_result.get("error", "Invocador no encontrado")
        )
    
    return summoner_result["data"]


@app.get("/api/summoner/by-id/{summoner_id}")
async def get_summoner_by_id_route(
    summoner_id: str,
    region: str = Query("la1", description="Región del servidor")
):
    """Obtiene datos del invocador por Summoner ID cifrado"""
    summoner_result = await riot_client.get_summoner_by_id(summoner_id, region)
    if not summoner_result.get("success"):
        raise HTTPException(
            status_code=summoner_result.get("status_code", 404),
            detail=summoner_result.get("error", "Invocador no encontrado")
        )

    return summoner_result["data"]


@app.get("/api/ranked/{puuid}")
async def get_ranked_by_puuid(
    puuid: str,
    region: str = Query("la1", description="Región del servidor")
):
    """Obtiene información de ranked por PUUID"""
    return await fetch_ranked_entries(puuid, region)


@app.get("/api/profile/summary/{puuid}")
async def get_profile_summary(
    puuid: str,
    region: str = Query("la1", description="Región del servidor"),
    season_year: Optional[int] = Query(
        None,
        description="Año de la temporada a consultar",
        ge=2014,
        le=2100
    )
):
    """Combina resumen de ranked y estadísticas de campeones"""
    ranked_summary = await compute_ranked_summary(puuid, region)
    champion_stats, season_match_ids = await compute_champion_stats_summary(
        puuid,
        region,
        season_year=season_year
    )
    return {
        "ranked": ranked_summary,
        "champions": champion_stats,
        "matches": season_match_ids
    }


@app.get("/api/mastery/{puuid}")
async def get_mastery_by_puuid(
    puuid: str,
    region: str = Query("la1", description="Región del servidor"),
    count: int = Query(10, description="Cantidad de maestrías")
):
    """Obtiene maestrías de campeones por PUUID"""
    mastery_result = await riot_client.get_champion_mastery_top(puuid, count, region)
    if not mastery_result.get("success"):
        return []
    
    return mastery_result["data"]


@app.get("/api/matches/{puuid}")
async def get_matches_by_puuid(
    puuid: str,
    region: str = Query("la1", description="Región del servidor"),
    start: int = Query(0, description="Índice inicial"),
    count: int = Query(20, description="Cantidad de partidas")
):
    """Obtiene IDs de partidas por PUUID"""
    routing = riot_client.get_routing_for_region(region)
    
    matches_result = await riot_client.get_match_ids_by_puuid(puuid, routing, start, count)
    if not matches_result.get("success"):
        return []
    
    return matches_result["data"]


@app.get("/api/live/{summoner_id}")
async def get_live_game(
    summoner_id: str,
    region: str = Query("la1", description="Región del servidor")
):
    """Obtiene información de partida en vivo"""
    live_result = await riot_client.get_current_game(summoner_id, region)
    if not live_result.get("success"):
        raise HTTPException(status_code=404, detail="No hay partida en curso")
    
    return live_result["data"]


@app.get("/api/recommendations/{puuid}")
async def get_recommendations(
    puuid: str,
    region: str = Query("la1", description="Región del servidor")
):
    """Obtiene recomendaciones basadas en el historial"""
    routing = riot_client.get_routing_for_region(region)
    
    # Obtener historial de partidas
    matches_result = await riot_client.get_match_ids_by_puuid(puuid, routing, 0, 20)
    if not matches_result.get("success") or not matches_result["data"]:
        return {"recommendations": {
            "strengths": ["Juega más partidas para obtener análisis"],
            "improvements": ["Necesitamos más datos para darte recomendaciones"],
            "playstyle_tips": ["Continúa jugando y volveremos a analizar"],
            "champion_recommendations": ["Explora diferentes campeones"]
        }}
    
    # Obtener detalles de partidas
    match_ids = matches_result["data"][:10]
    matches_data = await fetch_match_details(match_ids, routing)
    
    if not matches_data:
        return {"recommendations": {
            "strengths": ["Continúa jugando para más análisis"],
            "improvements": [],
            "playstyle_tips": [],
            "champion_recommendations": []
        }}
    
    # Generar recomendaciones
    stats = recommendation_service.analyze_matches(matches_data, puuid)
    recommendations = recommendation_service.generate_recommendations(stats)
    
    return {"recommendations": recommendations}


@app.get("/api/leaderboard/{tier}")
async def get_leaderboard(
    tier: str,
    region: str = Query("la1", description="Región del servidor")
):
    """Obtiene el leaderboard de un tier específico"""
    tier_lower = tier.lower()
    
    if tier_lower == "challenger":
        result = await riot_client.get_challenger_league(region)
    elif tier_lower == "grandmaster":
        result = await riot_client.get_grandmaster_league(region)
    elif tier_lower == "master":
        result = await riot_client.get_master_league(region)
    else:
        raise HTTPException(status_code=400, detail="Tier no válido")
    
    if not result.get("success"):
        raise HTTPException(status_code=404, detail="No se pudo obtener el ranking")
    
    return result["data"]


# ==================== RUTAS LEGACY (mantener compatibilidad) ====================

@app.get("/api/player/search")
async def search_player(
    game_name: str = Query(..., description="Nombre del jugador"),
    tag_line: str = Query(..., description="Tag del jugador (ej: LAN)"),
    region: str = Query("la1", description="Región del servidor")
):
    """
    Busca un jugador por Riot ID (gameName#tagLine)
    """
    routing = riot_client.get_routing_for_region(region)
    
    # Obtener cuenta por Riot ID
    account_result = await riot_client.get_account_by_riot_id(game_name, tag_line, routing)
    if not account_result.get("success"):
        raise HTTPException(
            status_code=account_result.get("status_code", 404),
            detail=account_result.get("error", "Jugador no encontrado")
        )
    
    account_data = account_result["data"]
    puuid = account_data.get("puuid")
    
    # Obtener datos del invocador
    summoner_result = await riot_client.get_summoner_by_puuid(puuid, region)
    if not summoner_result.get("success"):
        raise HTTPException(
            status_code=summoner_result.get("status_code", 404),
            detail=summoner_result.get("error", "Invocador no encontrado")
        )
    
    summoner_data = summoner_result["data"]
    version = await ddragon.get_latest_version()
    
    return {
        "account": account_data,
        "summoner": summoner_data,
        "profile_icon_url": ddragon.get_profile_icon_url(
            summoner_data.get("profileIconId", 1), 
            version
        ),
        "region": region
    }


@app.get("/api/player/{puuid}/ranked")
async def get_player_ranked(
    puuid: str,
    region: str = Query("la1", description="Región del servidor")
):
    """Obtiene la información de ranked de un jugador"""
    # Primero obtener el summoner ID
    summoner_result = await riot_client.get_summoner_by_puuid(puuid, region)
    if not summoner_result.get("success"):
        raise HTTPException(status_code=404, detail="Invocador no encontrado")
    
    summoner_id = summoner_result["data"].get("id")
    
    # Obtener entradas de liga
    league_result = await riot_client.get_league_entries_by_summoner(summoner_id, region)
    if not league_result.get("success"):
        return {"ranked": []}
    
    return {"ranked": league_result["data"]}


@app.get("/api/player/{puuid}/mastery")
async def get_player_mastery(
    puuid: str,
    region: str = Query("la1", description="Región del servidor"),
    count: int = Query(10, description="Cantidad de maestrías a obtener")
):
    """Obtiene las maestrías de campeones de un jugador"""
    mastery_result = await riot_client.get_champion_mastery_top(puuid, count, region)
    if not mastery_result.get("success"):
        return {"masteries": []}
    
    # Enriquecer con datos de campeones
    masteries = mastery_result["data"]
    champions = await ddragon.get_champions()
    version = await ddragon.get_latest_version()
    
    enriched_masteries = []
    for mastery in masteries:
        champion_id = mastery.get("championId")
        champion_data = await ddragon.get_champion_by_id(champion_id)
        
        if champion_data:
            mastery["championName"] = champion_data.get("name", "Desconocido")
            mastery["championImage"] = ddragon.get_champion_square_url(
                champion_data.get("id", ""), 
                version
            )
        
        enriched_masteries.append(mastery)
    
    return {"masteries": enriched_masteries}


# ==================== RUTAS DE PARTIDAS ====================

@app.get("/api/player/{puuid}/matches")
async def get_player_matches(
    puuid: str,
    region: str = Query("la1", description="Región del servidor"),
    start: int = Query(0, description="Índice de inicio"),
    count: int = Query(20, description="Cantidad de partidas"),
    queue: Optional[int] = Query(None, description="Tipo de cola (420=Solo/Duo, 440=Flex)")
):
    """Obtiene el historial de partidas de un jugador"""
    routing = riot_client.get_routing_for_region(region)
    
    # Obtener IDs de partidas
    match_ids_result = await riot_client.get_match_ids_by_puuid(
        puuid, routing, start, count, queue
    )
    if not match_ids_result.get("success"):
        return {"matches": [], "match_ids": []}
    
    match_ids = match_ids_result["data"]
    
    # Obtener detalles de cada partida
    matches = await fetch_match_details(match_ids[:10], routing)
    
    return {
        "matches": matches,
        "match_ids": match_ids,
        "total_fetched": len(matches)
    }


@app.get("/api/match/{match_id}")
async def get_match_details(
    match_id: str,
    region: str = Query("la1", description="Región del servidor")
):
    """Obtiene los detalles completos de una partida"""
    routing = riot_client.get_routing_for_region(region)
    
    match_result = await riot_client.get_match_by_id(match_id, routing)
    if not match_result.get("success"):
        raise HTTPException(
            status_code=match_result.get("status_code", 404),
            detail=match_result.get("error", "Partida no encontrada")
        )
    
    # Devolver directamente los datos de la partida (metadata + info)
    return match_result["data"]


@app.get("/api/match/{match_id}/timeline")
async def get_match_timeline(
    match_id: str,
    region: str = Query("la1", description="Región del servidor")
):
    """Obtiene la línea de tiempo de una partida"""
    routing = riot_client.get_routing_for_region(region)
    
    timeline_result = await riot_client.get_match_timeline(match_id, routing)
    if not timeline_result.get("success"):
        raise HTTPException(
            status_code=timeline_result.get("status_code", 404),
            detail=timeline_result.get("error", "Timeline no encontrada")
        )
    
    return {"timeline": timeline_result["data"]}


# ==================== RUTAS DE PARTIDA EN VIVO ====================

@app.get("/api/player/{puuid}/live")
async def get_live_game(
    puuid: str,
    region: str = Query("la1", description="Región del servidor")
):
    """Obtiene información de la partida en vivo si el jugador está en una"""
    summoner_result = await riot_client.get_summoner_by_puuid(puuid, region)
    if not summoner_result.get("success"):
        raise HTTPException(status_code=404, detail="Invocador no encontrado")
    summoner_id = summoner_result["data"].get("id")
    live_result = await riot_client.get_current_game(summoner_id, region)
    
    if not live_result.get("success"):
        if live_result.get("status_code") == 404:
            return {"in_game": False, "message": "El jugador no está en partida"}
        raise HTTPException(
            status_code=live_result.get("status_code", 500),
            detail=live_result.get("error", "Error al obtener partida en vivo")
        )
    
    game_data = live_result["data"]
    version = await ddragon.get_latest_version()
    
    # Enriquecer participantes con datos de campeones
    for participant in game_data.get("participants", []):
        champion_id = participant.get("championId")
        champion_data = await ddragon.get_champion_by_id(champion_id)
        
        if champion_data:
            participant["championName"] = champion_data.get("name", "Desconocido")
            participant["championImage"] = ddragon.get_champion_square_url(
                champion_data.get("id", ""), 
                version
            )
    
    return {
        "in_game": True,
        "game": game_data
    }


@app.get("/api/featured-games")
async def get_featured_games(
    region: str = Query("la1", description="Región del servidor")
):
    """Obtiene las partidas destacadas de la región"""
    featured_result = await riot_client.get_featured_games(region)
    
    if not featured_result.get("success"):
        return {"games": []}
    
    return {"games": featured_result["data"]}


# ==================== RUTAS DE RECOMENDACIONES ====================

@app.get("/api/player/{puuid}/stats")
async def get_player_stats(
    puuid: str,
    region: str = Query("la1", description="Región del servidor"),
    count: int = Query(20, description="Cantidad de partidas a analizar")
):
    """Obtiene estadísticas analizadas del jugador"""
    routing = riot_client.get_routing_for_region(region)
    
    # Obtener historial de partidas
    match_ids_result = await riot_client.get_match_ids_by_puuid(
        puuid, routing, 0, count
    )
    if not match_ids_result.get("success"):
        return {"stats": {}, "recommendations": {}}
    
    match_ids = match_ids_result["data"]
    
    # Obtener detalles de partidas
    matches = await fetch_match_details(match_ids[:15], routing)
    
    # Analizar partidas
    stats = recommendation_service.analyze_matches(matches, puuid)
    
    # Generar recomendaciones
    recommendations = recommendation_service.generate_recommendations(stats)
    
    return {
        "stats": stats,
        "recommendations": recommendations
    }


@app.get("/api/player/{puuid}/live-recommendations")
async def get_live_recommendations(
    puuid: str,
    region: str = Query("la1", description="Región del servidor")
):
    """Obtiene recomendaciones para la partida en curso"""
    # Obtener Summoner ID y verificar si está en partida
    summoner_result = await riot_client.get_summoner_by_puuid(puuid, region)
    if not summoner_result.get("success"):
        return {
            "in_game": False,
            "message": "Invocador no encontrado",
            "recommendations": {}
        }
    summoner_id = summoner_result["data"].get("id")
    live_result = await riot_client.get_current_game(summoner_id, region)
    
    if not live_result.get("success"):
        return {
            "in_game": False,
            "message": "El jugador no está en partida",
            "recommendations": {}
        }
    
    game_data = live_result["data"]
    routing = riot_client.get_routing_for_region(region)
    
    # Obtener historial reciente para contexto
    match_ids_result = await riot_client.get_match_ids_by_puuid(puuid, routing, 0, 10)
    matches = []
    
    if match_ids_result.get("success") and match_ids_result["data"]:
        matches = await fetch_match_details(match_ids_result["data"][:5], routing)
    
    # Analizar y generar recomendaciones
    stats = recommendation_service.analyze_matches(matches, puuid)
    recommendations = recommendation_service.generate_recommendations(stats, game_data)
    
    return {
        "in_game": True,
        "game": game_data,
        "recommendations": recommendations
    }


# ==================== RUTAS DE ESTADO ====================

@app.get("/api/status")
async def get_platform_status(
    region: str = Query("la1", description="Región del servidor")
):
    """Obtiene el estado de la plataforma de LoL"""
    status_result = await riot_client.get_platform_status(region)
    
    if not status_result.get("success"):
        return {"status": "unknown", "error": status_result.get("error")}
    
    return {"status": status_result["data"]}


# ==================== RUTAS DE LEADERBOARDS ====================

@app.get("/api/leaderboard/challenger")
async def get_challenger_leaderboard(
    region: str = Query("la1", description="Región del servidor"),
    queue: str = Query("RANKED_SOLO_5x5", description="Tipo de cola")
):
    """Obtiene el leaderboard de Challenger"""
    result = await riot_client.get_challenger_league(queue, region)
    
    if not result.get("success"):
        return {"league": None, "error": result.get("error")}
    
    return {"league": result["data"]}


@app.get("/api/leaderboard/grandmaster")
async def get_grandmaster_leaderboard(
    region: str = Query("la1", description="Región del servidor"),
    queue: str = Query("RANKED_SOLO_5x5", description="Tipo de cola")
):
    """Obtiene el leaderboard de Grandmaster"""
    result = await riot_client.get_grandmaster_league(queue, region)
    
    if not result.get("success"):
        return {"league": None, "error": result.get("error")}
    
    return {"league": result["data"]}


@app.get("/api/leaderboard/master")
async def get_master_leaderboard(
    region: str = Query("la1", description="Región del servidor"),
    queue: str = Query("RANKED_SOLO_5x5", description="Tipo de cola")
):
    """Obtiene el leaderboard de Master"""
    result = await riot_client.get_master_league(queue, region)
    
    if not result.get("success"):
        return {"league": None, "error": result.get("error")}
    
    return {"league": result["data"]}


# ==================== RUTAS DE LEAGUE (para ranking section) ====================

@app.get("/api/league/challenger")
async def get_league_challenger(
    region: str = Query("la1", description="Región del servidor"),
    queue: str = Query("RANKED_SOLO_5x5", description="Tipo de cola")
):
    """Obtiene la liga Challenger directamente"""
    result = await riot_client.get_challenger_league(queue, region)
    
    if not result.get("success"):
        raise HTTPException(status_code=404, detail="No se pudo obtener la liga Challenger")
    
    return result["data"]


@app.get("/api/league/grandmaster")
async def get_league_grandmaster(
    region: str = Query("la1", description="Región del servidor"),
    queue: str = Query("RANKED_SOLO_5x5", description="Tipo de cola")
):
    """Obtiene la liga Grandmaster directamente"""
    result = await riot_client.get_grandmaster_league(queue, region)
    
    if not result.get("success"):
        raise HTTPException(status_code=404, detail="No se pudo obtener la liga Grandmaster")
    
    return result["data"]


@app.get("/api/league/master")
async def get_league_master(
    region: str = Query("la1", description="Región del servidor"),
    queue: str = Query("RANKED_SOLO_5x5", description="Tipo de cola")
):
    """Obtiene la liga Master directamente"""
    result = await riot_client.get_master_league(queue, region)
    
    if not result.get("success"):
        raise HTTPException(status_code=404, detail="No se pudo obtener la liga Master")
    
    return result["data"]


@app.get("/api/ranking/top")
async def get_ranking_top(
    region: str = Query("la1", description="Región del servidor"),
    queue: str = Query("RANKED_SOLO_5x5", description="Tipo de cola"),
    limit: int = Query(100, ge=1, le=200, description="Cantidad de jugadores a retornar")
):
    """Obtiene ranking enriquecido con información de perfil"""
    challenger_result = await riot_client.get_challenger_league(queue, region)
    grandmaster_result = await riot_client.get_grandmaster_league(queue, region)
    version = await ddragon.get_latest_version()

    if not challenger_result.get("success"):
        raise HTTPException(status_code=404, detail="No se pudo obtener Challenger")
    if not grandmaster_result.get("success"):
        raise HTTPException(status_code=404, detail="No se pudo obtener Grandmaster")

    challenger_entries = challenger_result["data"].get("entries", [])
    grandmaster_entries = grandmaster_result["data"].get("entries", [])
    for entry in challenger_entries:
        entry["tier"] = challenger_result["data"].get("tier", "CHALLENGER")
    for entry in grandmaster_entries:
        entry["tier"] = grandmaster_result["data"].get("tier", "GRANDMASTER")

    combined = challenger_entries + grandmaster_entries
    combined.sort(key=lambda e: e.get("leaguePoints", 0), reverse=True)
    top_entries = combined[:limit]

    profile_map = await fetch_leaderboard_profiles(top_entries, region)

    min_challenger_lp = min((e.get("leaguePoints", 0) for e in challenger_entries), default=0)
    min_grandmaster_lp = min((e.get("leaguePoints", 0) for e in grandmaster_entries), default=0)

    players = []
    for idx, entry in enumerate(top_entries):
        profile = profile_map.get(entry.get("summonerId")) or {}
        profile_icon_id = profile.get("profileIconId")
        summoner_level = profile.get("summonerLevel")
        
        # Priorizar Riot ID real, luego summonerName del entry
        display_name = profile.get("name") or entry.get("summonerName") or f"Jugador {idx + 1}"
        
        icon_url = ddragon.get_profile_icon_url(profile_icon_id or 29, version)
        
        wins = entry.get("wins", 0)
        losses = entry.get("losses", 0)
        total_games = wins + losses
        
        players.append({
            "position": idx + 1,
            "tier": entry.get("tier"),
            "rank": entry.get("rank"),
            "leaguePoints": entry.get("leaguePoints", 0),
            "wins": wins,
            "losses": losses,
            "totalGames": total_games,
            "summonerId": entry.get("summonerId"),
            "summonerName": entry.get("summonerName"),
            "displayName": display_name,
            "profileIconId": profile_icon_id,
            "profileIconUrl": icon_url,
            "summonerLevel": summoner_level
        })

    return {
        "players": players,
        "cutoffs": {
            "challenger": min_challenger_lp,
            "grandmaster": min_grandmaster_lp
        }
    }


# ==================== RUTAS DE RUNAS ====================

@app.get("/api/ddragon/runes")
async def get_runes():
    """Obtiene las runas del juego"""
    runes = await ddragon.get_runes()
    return runes


# ==================== RUTAS DE BUILDS ====================

@app.get("/api/champion/build/{champion_name}")
async def get_champion_build_data(
    champion_name: str,
    role: Optional[str] = Query(None, description="Rol del campeon (MID, TOP, JUNGLE, BOTTOM, UTILITY)")
):
    """
    Obtiene datos de build recomendada para un campeon.
    Incluye runas, items y estadisticas de uso.
    """
    # Intentar obtener build especifica
    build = get_champion_build(champion_name, role)
    
    if not build:
        # Obtener datos del campeon para determinar su clase
        champions = await ddragon.get_champions()
        champ_data = champions.get(champion_name)
        
        if champ_data:
            tags = champ_data.get("tags", ["Fighter"])
            primary_class = tags[0] if tags else "Fighter"
            build = get_default_build_for_class(primary_class, role)
    
    if not build:
        raise HTTPException(status_code=404, detail="No se encontraron datos de build")
    
    # Enriquecer con datos de keystone
    keystone_info = get_keystone_info(build.get("keystone", 0))
    secondary_tree = get_secondary_tree_name(build.get("secondary_tree", 0))
    
    return {
        "champion": champion_name,
        "role": role,
        "keystone": keystone_info,
        "secondary_tree": secondary_tree,
        "summoners": build.get("summoners", [4, 14]),
        "core_items": build.get("core_items", []),
        "boots": build.get("boots"),
        "situational": build.get("situational", []),
        "stats": {
            "winrate": build.get("winrate", 50.0),
            "pickrate": build.get("pickrate", 5.0),
            "games": build.get("games", 10000)
        }
    }


# ==================== INICIAR SERVIDOR ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
