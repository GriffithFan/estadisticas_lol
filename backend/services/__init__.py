"""
Servicios de la aplicación
"""
from backend.services.ddragon import ddragon, DataDragonService
from backend.services.recommendations import recommendation_service, RecommendationService

__all__ = [
    "ddragon",
    "DataDragonService",
    "recommendation_service", 
    "RecommendationService"
]
