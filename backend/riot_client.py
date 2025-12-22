"""
Cliente HTTP para la API de Riot Games
"""
import httpx
from typing import Optional, Any
from backend.config import settings


class RiotAPIClient:
    """Cliente para realizar peticiones a la API de Riot Games"""
    
    def __init__(self):
        self.api_key = settings.riot_api_key
        self.headers = {
            "X-Riot-Token": self.api_key,
            "Accept": "application/json"
        }
        self._client = httpx.AsyncClient(
            headers=self.headers.copy(),
            timeout=httpx.Timeout(30.0),
            limits=httpx.Limits(max_connections=40, max_keepalive_connections=20)
        )
    
    def _get_platform_url(self, region: str) -> str:
        """Obtiene la URL base para una región de plataforma"""
        return f"https://{region}.{settings.riot_api_base}"
    
    def _get_regional_url(self, routing: str) -> str:
        """Obtiene la URL base para una región de enrutamiento"""
        return f"https://{routing}.{settings.riot_api_base}"
    
    def get_routing_for_region(self, region: str) -> str:
        """Obtiene el enrutamiento regional para una región de plataforma"""
        return settings.platform_regions.get(region, "americas")
    
    async def _request(self, url: str, params: Optional[dict] = None) -> dict:
        """Realiza una petición GET a la API"""
        try:
            response = await self._client.get(url, params=params)
            response.raise_for_status()
            return {"success": True, "data": response.json()}
        except httpx.HTTPStatusError as e:
            error_messages = {
                400: "Petición inválida",
                401: "API Key no válida",
                403: "Acceso prohibido",
                404: "No encontrado",
                429: "Límite de peticiones excedido",
                500: "Error interno del servidor de Riot",
                503: "Servicio no disponible"
            }
            return {
                "success": False, 
                "error": error_messages.get(e.response.status_code, f"Error HTTP {e.response.status_code}"),
                "status_code": e.response.status_code
            }
        except httpx.RequestError as e:
            return {"success": False, "error": f"Error de conexión: {str(e)}"}

    async def aclose(self) -> None:
        """Cierra el cliente HTTP persistente"""
        await self._client.aclose()
    
    # ==================== ACCOUNT-V1 ====================
    
    async def get_account_by_riot_id(self, game_name: str, tag_line: str, routing: str = "americas") -> dict:
        """
        Obtiene información de cuenta por Riot ID (gameName#tagLine)
        """
        url = f"{self._get_regional_url(routing)}/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"
        return await self._request(url)
    
    async def get_account_by_puuid(self, puuid: str, routing: str = "americas") -> dict:
        """
        Obtiene información de cuenta por PUUID
        """
        url = f"{self._get_regional_url(routing)}/riot/account/v1/accounts/by-puuid/{puuid}"
        return await self._request(url)
    
    # ==================== SUMMONER-V4 ====================
    
    async def get_summoner_by_puuid(self, puuid: str, region: str = "la1") -> dict:
        """
        Obtiene información del invocador por PUUID
        """
        url = f"{self._get_platform_url(region)}/lol/summoner/v4/summoners/by-puuid/{puuid}"
        return await self._request(url)
    
    async def get_summoner_by_id(self, summoner_id: str, region: str = "la1") -> dict:
        """
        Obtiene información del invocador por Summoner ID
        """
        url = f"{self._get_platform_url(region)}/lol/summoner/v4/summoners/{summoner_id}"
        return await self._request(url)
    
    # ==================== MATCH-V5 ====================
    
    async def get_match_ids_by_puuid(
        self, 
        puuid: str, 
        routing: str = "americas",
        start: int = 0,
        count: int = 20,
        queue: Optional[int] = None,
        match_type: Optional[str] = None,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None
    ) -> dict:
        """
        Obtiene lista de IDs de partidas para un jugador
        """
        url = f"{self._get_regional_url(routing)}/lol/match/v5/matches/by-puuid/{puuid}/ids"
        params = {"start": start, "count": count}
        if queue:
            params["queue"] = queue
        if match_type:
            params["type"] = match_type
        if start_time:
            params["startTime"] = start_time
        if end_time:
            params["endTime"] = end_time
        return await self._request(url, params)
    
    async def get_match_by_id(self, match_id: str, routing: str = "americas") -> dict:
        """
        Obtiene detalles completos de una partida
        """
        url = f"{self._get_regional_url(routing)}/lol/match/v5/matches/{match_id}"
        return await self._request(url)
    
    async def get_match_timeline(self, match_id: str, routing: str = "americas") -> dict:
        """
        Obtiene la línea de tiempo de una partida
        """
        url = f"{self._get_regional_url(routing)}/lol/match/v5/matches/{match_id}/timeline"
        return await self._request(url)
    
    # ==================== SPECTATOR-V5 ====================
    
    async def get_current_game(self, summoner_id: str, region: str = "la1") -> dict:
        """
        Obtiene información de la partida actual en vivo (requiere Summoner ID)
        """
        url = f"{self._get_platform_url(region)}/lol/spectator/v5/active-games/by-summoner/{summoner_id}"
        return await self._request(url)
    
    async def get_featured_games(self, region: str = "la1") -> dict:
        """
        Obtiene las partidas destacadas
        """
        url = f"{self._get_platform_url(region)}/lol/spectator/v5/featured-games"
        return await self._request(url)
    
    # ==================== LEAGUE-V4 ====================
    
    async def get_league_entries_by_summoner(self, summoner_id: str, region: str = "la1") -> dict:
        """
        Obtiene las entradas de liga (rangos) de un invocador por Summoner ID
        """
        url = f"{self._get_platform_url(region)}/lol/league/v4/entries/by-summoner/{summoner_id}"
        return await self._request(url)

    async def get_league_entries_by_puuid(self, puuid: str, region: str = "la1") -> dict:
        """
        Obtiene las entradas de liga (rangos) de un invocador por PUUID
        """
        url = f"{self._get_platform_url(region)}/lol/league/v4/entries/by-puuid/{puuid}"
        return await self._request(url)
    
    async def get_challenger_league(self, queue: str = "RANKED_SOLO_5x5", region: str = "la1") -> dict:
        """
        Obtiene la liga Challenger
        """
        url = f"{self._get_platform_url(region)}/lol/league/v4/challengerleagues/by-queue/{queue}"
        return await self._request(url)
    
    async def get_grandmaster_league(self, queue: str = "RANKED_SOLO_5x5", region: str = "la1") -> dict:
        """
        Obtiene la liga Grandmaster
        """
        url = f"{self._get_platform_url(region)}/lol/league/v4/grandmasterleagues/by-queue/{queue}"
        return await self._request(url)
    
    async def get_master_league(self, queue: str = "RANKED_SOLO_5x5", region: str = "la1") -> dict:
        """
        Obtiene la liga Master
        """
        url = f"{self._get_platform_url(region)}/lol/league/v4/masterleagues/by-queue/{queue}"
        return await self._request(url)
    
    # ==================== CHAMPION-MASTERY-V4 ====================
    
    async def get_champion_mastery(self, puuid: str, region: str = "la1") -> dict:
        """
        Obtiene las maestrías de campeones de un jugador
        """
        url = f"{self._get_platform_url(region)}/lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}"
        return await self._request(url)
    
    async def get_champion_mastery_top(self, puuid: str, count: int = 10, region: str = "la1") -> dict:
        """
        Obtiene las mejores maestrías de campeones
        """
        url = f"{self._get_platform_url(region)}/lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}/top"
        return await self._request(url, {"count": count})
    
    async def get_mastery_score(self, puuid: str, region: str = "la1") -> dict:
        """
        Obtiene el puntaje total de maestría
        """
        url = f"{self._get_platform_url(region)}/lol/champion-mastery/v4/scores/by-puuid/{puuid}"
        return await self._request(url)
    
    # ==================== LOL-CHALLENGES-V1 ====================
    
    async def get_player_challenges(self, puuid: str, region: str = "la1") -> dict:
        """
        Obtiene los desafíos de un jugador
        """
        url = f"{self._get_platform_url(region)}/lol/challenges/v1/player-data/{puuid}"
        return await self._request(url)
    
    # ==================== LOL-STATUS-V4 ====================
    
    async def get_platform_status(self, region: str = "la1") -> dict:
        """
        Obtiene el estado de la plataforma
        """
        url = f"{self._get_platform_url(region)}/lol/status/v4/platform-data"
        return await self._request(url)


# Instancia global del cliente
riot_client = RiotAPIClient()
