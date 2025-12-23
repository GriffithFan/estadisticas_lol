"""
Servicio de caché con Redis
"""
import json
import os
from typing import Any, Optional
from functools import wraps
import redis.asyncio as redis
from datetime import timedelta


class RedisCache:
    """Cliente de caché Redis"""
    
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self._client: Optional[redis.Redis] = None
        self._enabled = True
    
    async def connect(self):
        """Conectar a Redis"""
        try:
            self._client = redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            # Test connection
            await self._client.ping()
            print(f"Redis conectado: {self.redis_url}")
        except Exception as e:
            print(f"Redis no disponible: {e}. Funcionando sin caché.")
            self._enabled = False
            self._client = None
    
    async def disconnect(self):
        """Desconectar de Redis"""
        if self._client:
            await self._client.close()
    
    async def get(self, key: str) -> Optional[Any]:
        """Obtener valor de caché"""
        if not self._enabled or not self._client:
            return None
        try:
            data = await self._client.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception:
            return None
    
    async def set(self, key: str, value: Any, ttl_seconds: int = 300):
        """Guardar valor en caché"""
        if not self._enabled or not self._client:
            return
        try:
            await self._client.setex(
                key,
                timedelta(seconds=ttl_seconds),
                json.dumps(value)
            )
        except Exception:
            pass
    
    async def delete(self, key: str):
        """Eliminar valor de caché"""
        if not self._enabled or not self._client:
            return
        try:
            await self._client.delete(key)
        except Exception:
            pass
    
    async def clear_pattern(self, pattern: str):
        """Eliminar claves que coincidan con patrón"""
        if not self._enabled or not self._client:
            return
        try:
            keys = await self._client.keys(pattern)
            if keys:
                await self._client.delete(*keys)
        except Exception:
            pass


# Instancia global
cache = RedisCache()


# TTL predefinidos (en segundos)
class CacheTTL:
    SUMMONER = 300          # 5 minutos
    MATCHES = 300           # 5 minutos
    LIVE_GAME = 30          # 30 segundos
    CHAMPIONS = 86400       # 24 horas
    DDRAGON = 86400         # 24 horas
    TIERLIST = 1800         # 30 minutos
    RANKING = 300           # 5 minutos


def cached(prefix: str, ttl: int = 300):
    """
    Decorador para cachear resultados de funciones async
    
    Uso:
        @cached("summoner", CacheTTL.SUMMONER)
        async def get_summoner(name: str, tag: str):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Construir clave de caché
            key_parts = [prefix] + [str(arg) for arg in args]
            key_parts += [f"{k}={v}" for k, v in sorted(kwargs.items())]
            cache_key = ":".join(key_parts)
            
            # Intentar obtener de caché
            cached_value = await cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Ejecutar función y cachear resultado
            result = await func(*args, **kwargs)
            if result is not None:
                await cache.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator
