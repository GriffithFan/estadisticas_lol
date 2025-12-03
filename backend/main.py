"""
League of Legends Statistics App - Main Server
===============================================
Servidor principal FastAPI para la aplicación de estadísticas de LoL
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import os

from backend.riot_client import riot_client
from backend.services.ddragon import ddragon
from backend.services.recommendations import recommendation_service
from backend.config import settings

# Crear aplicación FastAPI
app = FastAPI(
    title="LoL Statistics App",
    description="Aplicación para estadísticas de League of Legends con recomendaciones",
    version="1.0.0"
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


@app.get("/api/ranked/{puuid}")
async def get_ranked_by_puuid(
    puuid: str,
    region: str = Query("la1", description="Región del servidor")
):
    """Obtiene información de ranked por PUUID"""
    # Primero obtener el summoner ID
    summoner_result = await riot_client.get_summoner_by_puuid(puuid, region)
    if not summoner_result.get("success"):
        raise HTTPException(status_code=404, detail="Invocador no encontrado")
    
    summoner_id = summoner_result["data"].get("id")
    
    # Obtener entradas de liga
    league_result = await riot_client.get_league_entries_by_summoner(summoner_id, region)
    if not league_result.get("success"):
        return []
    
    return league_result["data"]


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
    matches_data = []
    for match_id in matches_result["data"][:10]:
        match_detail = await riot_client.get_match_details(match_id, routing)
        if match_detail.get("success"):
            matches_data.append(match_detail["data"])
    
    if not matches_data:
        return {"recommendations": {
            "strengths": ["Continúa jugando para más análisis"],
            "improvements": [],
            "playstyle_tips": [],
            "champion_recommendations": []
        }}
    
    # Generar recomendaciones
    recommendations = await recommendation_service.analyze_player_performance(
        puuid, matches_data
    )
    
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
    matches = []
    for match_id in match_ids[:10]:  # Limitar a 10 para no exceder rate limits
        match_result = await riot_client.get_match_by_id(match_id, routing)
        if match_result.get("success"):
            matches.append(match_result["data"])
    
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
    live_result = await riot_client.get_current_game(puuid, region)
    
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
    matches = []
    for match_id in match_ids[:15]:  # Limitar para evitar rate limits
        match_result = await riot_client.get_match_by_id(match_id, routing)
        if match_result.get("success"):
            matches.append(match_result["data"])
    
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
    # Verificar si está en partida
    live_result = await riot_client.get_current_game(puuid, region)
    
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
    
    if match_ids_result.get("success"):
        for match_id in match_ids_result["data"][:5]:
            match_result = await riot_client.get_match_by_id(match_id, routing)
            if match_result.get("success"):
                matches.append(match_result["data"])
    
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


# ==================== RUTAS DE RUNAS ====================

@app.get("/api/ddragon/runes")
async def get_runes():
    """Obtiene las runas del juego"""
    runes = await ddragon.get_runes()
    return runes


# ==================== INICIAR SERVIDOR ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
