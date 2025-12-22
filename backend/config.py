"""
Configuración de la aplicación
"""
import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


class Settings(BaseSettings):
    """Configuración principal de la aplicación"""
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    
    # Riot API
    riot_api_key: str = os.getenv("RIOT_API_KEY", "RGAPI-b5e1e43c-2e58-43c6-a01a-b446fdea48ee")
    default_region: str = os.getenv("DEFAULT_REGION", "la1")
    default_routing: str = os.getenv("DEFAULT_ROUTING", "americas")
    
    # API URLs
    riot_api_base: str = "api.riotgames.com"
    ddragon_base: str = "https://ddragon.leagueoflegends.com"
    
    # Regiones de plataforma
    platform_regions: dict = {
        "br1": "americas",
        "eun1": "europe",
        "euw1": "europe",
        "jp1": "asia",
        "kr": "asia",
        "la1": "americas",
        "la2": "americas",
        "na1": "americas",
        "oc1": "sea",
        "tr1": "europe",
        "ru": "europe",
        "ph2": "sea",
        "sg2": "sea",
        "th2": "sea",
        "tw2": "sea",
        "vn2": "sea"
    }
    
    # Nombres de regiones para display
    region_names: dict = {
        "br1": "Brasil",
        "eun1": "EU Nordic & East",
        "euw1": "EU West",
        "jp1": "Japón",
        "kr": "Corea",
        "la1": "Latinoamérica Norte",
        "la2": "Latinoamérica Sur",
        "na1": "Norteamérica",
        "oc1": "Oceanía",
        "tr1": "Turquía",
        "ru": "Rusia",
        "ph2": "Filipinas",
        "sg2": "Singapur",
        "th2": "Tailandia",
        "tw2": "Taiwán",
        "vn2": "Vietnam"
    }
    

settings = Settings()
