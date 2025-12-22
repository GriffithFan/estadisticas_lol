"""
Servicio de Data Dragon para obtener datos estáticos del juego
"""
import httpx
from typing import Optional
from backend.config import settings


class DataDragonService:
    """Servicio para obtener datos estáticos de Data Dragon"""
    
    def __init__(self):
        self.base_url = settings.ddragon_base
        self._version: Optional[str] = None
        self._champions: Optional[dict] = None
        self._items: Optional[dict] = None
        self._summoner_spells: Optional[dict] = None
        self._runes: Optional[dict] = None
    
    async def get_latest_version(self) -> str:
        """Obtiene la versión más reciente del juego"""
        if self._version:
            return self._version
        
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/api/versions.json")
            versions = response.json()
            self._version = versions[0]
            return self._version
    
    async def get_champions(self, lang: str = "es_ES") -> dict:
        """Obtiene datos de todos los campeones"""
        if self._champions:
            return self._champions
        
        version = await self.get_latest_version()
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/cdn/{version}/data/{lang}/champion.json"
            )
            data = response.json()
            self._champions = data.get("data", {})
            return self._champions
    
    async def get_champion_by_id(self, champion_id: int, lang: str = "es_ES") -> Optional[dict]:
        """Obtiene datos de un campeón por su ID numérico"""
        champions = await self.get_champions(lang)
        for champion in champions.values():
            if int(champion.get("key", 0)) == champion_id:
                return champion
        return None
    
    async def get_items(self, lang: str = "es_ES") -> dict:
        """Obtiene datos de todos los items"""
        if self._items:
            return self._items
        
        version = await self.get_latest_version()
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/cdn/{version}/data/{lang}/item.json"
            )
            data = response.json()
            self._items = data.get("data", {})
            return self._items
    
    async def get_summoner_spells(self, lang: str = "es_ES") -> dict:
        """Obtiene datos de los hechizos de invocador"""
        if self._summoner_spells:
            return self._summoner_spells
        
        version = await self.get_latest_version()
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/cdn/{version}/data/{lang}/summoner.json"
            )
            data = response.json()
            self._summoner_spells = data.get("data", {})
            return self._summoner_spells
    
    async def get_runes(self, lang: str = "es_ES") -> list:
        """Obtiene datos de las runas"""
        if self._runes:
            return self._runes
        
        version = await self.get_latest_version()
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/cdn/{version}/data/{lang}/runesReforged.json"
            )
            self._runes = response.json()
            return self._runes
    
    def _resolve_version(self, version: Optional[str] = None) -> str:
        """Obtiene la versión a utilizar para recursos estáticos"""
        return version or self._version or "latest"
    
    def get_champion_image_url(self, champion_name: str) -> str:
        """Genera URL de imagen de campeón"""
        return f"{self.base_url}/cdn/img/champion/splash/{champion_name}_0.jpg"
    
    def get_champion_square_url(self, champion_name: str, version: Optional[str] = None) -> str:
        """Genera URL de imagen cuadrada de campeón"""
        resolved_version = self._resolve_version(version)
        return f"{self.base_url}/cdn/{resolved_version}/img/champion/{champion_name}.png"
    
    def get_item_image_url(self, item_id: int, version: Optional[str] = None) -> str:
        """Genera URL de imagen de item"""
        resolved_version = self._resolve_version(version)
        return f"{self.base_url}/cdn/{resolved_version}/img/item/{item_id}.png"
    
    def get_spell_image_url(self, spell_name: str, version: Optional[str] = None) -> str:
        """Genera URL de imagen de hechizo"""
        resolved_version = self._resolve_version(version)
        return f"{self.base_url}/cdn/{resolved_version}/img/spell/{spell_name}.png"
    
    def get_profile_icon_url(self, icon_id: int, version: Optional[str] = None) -> str:
        """Genera URL de imagen de icono de perfil"""
        resolved_version = self._resolve_version(version)
        return f"{self.base_url}/cdn/{resolved_version}/img/profileicon/{icon_id}.png"


# Instancia global del servicio
ddragon = DataDragonService()
