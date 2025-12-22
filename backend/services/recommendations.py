"""
Servicio de recomendaciones basado en historial de partidas
"""
from typing import Optional
from collections import Counter, defaultdict


class RecommendationService:
    """Servicio para generar recomendaciones basadas en el historial"""
    
    def __init__(self):
        pass
    
    def analyze_matches(self, matches: list, puuid: str) -> dict:
        """
        Analiza una lista de partidas para extraer estadísticas
        """
        if not matches:
            return {}
        
        stats = {
            "total_matches": len(matches),
            "wins": 0,
            "losses": 0,
            "champions_played": Counter(),
            "roles_played": Counter(),
            "lanes_played": Counter(),
            "avg_kills": 0,
            "avg_deaths": 0,
            "avg_assists": 0,
            "avg_cs": 0,
            "avg_vision_score": 0,
            "avg_damage": 0,
            "avg_gold": 0,
            "avg_game_duration": 0,
            "champion_stats": defaultdict(lambda: {
                "games": 0, "wins": 0, "kills": 0, "deaths": 0, 
                "assists": 0, "cs": 0, "damage": 0
            }),
            "recent_builds": [],
            "best_champions": [],
            "worst_champions": [],
            "preferred_role": None,
            "kda_ratio": 0
        }
        
        total_kills = 0
        total_deaths = 0
        total_assists = 0
        total_cs = 0
        total_vision = 0
        total_damage = 0
        total_gold = 0
        total_duration = 0
        
        for match in matches:
            info = match.get("info", {})
            participants = info.get("participants", [])
            
            # Encontrar al jugador en la partida
            player = None
            for p in participants:
                if p.get("puuid") == puuid:
                    player = p
                    break
            
            if not player:
                continue
            
            # Estadísticas generales
            if player.get("win"):
                stats["wins"] += 1
            else:
                stats["losses"] += 1
            
            champion_name = player.get("championName", "Unknown")
            stats["champions_played"][champion_name] += 1
            
            role = player.get("teamPosition", player.get("role", "UNKNOWN"))
            stats["roles_played"][role] += 1
            
            lane = player.get("lane", "UNKNOWN")
            stats["lanes_played"][lane] += 1
            
            # Estadísticas numéricas
            kills = player.get("kills", 0)
            deaths = player.get("deaths", 0)
            assists = player.get("assists", 0)
            cs = player.get("totalMinionsKilled", 0) + player.get("neutralMinionsKilled", 0)
            vision = player.get("visionScore", 0)
            damage = player.get("totalDamageDealtToChampions", 0)
            gold = player.get("goldEarned", 0)
            duration = info.get("gameDuration", 0)
            
            total_kills += kills
            total_deaths += deaths
            total_assists += assists
            total_cs += cs
            total_vision += vision
            total_damage += damage
            total_gold += gold
            total_duration += duration
            
            # Estadísticas por campeón
            champ_stats = stats["champion_stats"][champion_name]
            champ_stats["games"] += 1
            if player.get("win"):
                champ_stats["wins"] += 1
            champ_stats["kills"] += kills
            champ_stats["deaths"] += deaths
            champ_stats["assists"] += assists
            champ_stats["cs"] += cs
            champ_stats["damage"] += damage
            
            # Guardar builds recientes
            items = []
            for i in range(7):
                item_id = player.get(f"item{i}", 0)
                if item_id > 0:
                    items.append(item_id)
            
            if items:
                stats["recent_builds"].append({
                    "champion": champion_name,
                    "items": items,
                    "win": player.get("win", False)
                })
        
        # Calcular promedios
        n = stats["total_matches"]
        if n > 0:
            stats["avg_kills"] = round(total_kills / n, 1)
            stats["avg_deaths"] = round(total_deaths / n, 1)
            stats["avg_assists"] = round(total_assists / n, 1)
            stats["avg_cs"] = round(total_cs / n, 1)
            stats["avg_vision_score"] = round(total_vision / n, 1)
            stats["avg_damage"] = round(total_damage / n, 0)
            stats["avg_gold"] = round(total_gold / n, 0)
            stats["avg_game_duration"] = round(total_duration / n / 60, 1)  # en minutos
            
            # KDA ratio
            if total_deaths > 0:
                stats["kda_ratio"] = round((total_kills + total_assists) / total_deaths, 2)
            else:
                stats["kda_ratio"] = total_kills + total_assists
        
        # Winrate por campeón
        for champ, data in stats["champion_stats"].items():
            if data["games"] > 0:
                data["winrate"] = round(data["wins"] / data["games"] * 100, 1)
                data["avg_kda"] = round(
                    (data["kills"] + data["assists"]) / max(data["deaths"], 1) / data["games"], 
                    2
                )
        
        # Mejores y peores campeones (mínimo 2 partidas)
        champ_performance = []
        for champ, data in stats["champion_stats"].items():
            if data["games"] >= 2:
                champ_performance.append({
                    "champion": champ,
                    "games": data["games"],
                    "winrate": data.get("winrate", 0),
                    "avg_kda": data.get("avg_kda", 0)
                })
        
        champ_performance.sort(key=lambda x: (x["winrate"], x["avg_kda"]), reverse=True)
        stats["best_champions"] = champ_performance[:5]
        stats["worst_champions"] = champ_performance[-3:] if len(champ_performance) > 3 else []
        
        # Rol preferido
        if stats["roles_played"]:
            stats["preferred_role"] = stats["roles_played"].most_common(1)[0][0]
        
        # Winrate general
        if stats["total_matches"] > 0:
            stats["winrate"] = round(stats["wins"] / stats["total_matches"] * 100, 1)
        
        return stats
    
    def generate_recommendations(self, stats: dict, current_game_info: Optional[dict] = None) -> dict:
        """
        Genera recomendaciones basadas en las estadísticas analizadas
        """
        recommendations = {
            "champion_pool": [],
            "improvement_areas": [],
            "strengths": [],
            "playstyle_tips": [],
            "in_game_tips": []
        }
        
        if not stats:
            return recommendations
        
        # Recomendaciones de pool de campeones
        if stats.get("best_champions"):
            recommendations["champion_pool"] = [
                f"{champ['champion']}: {champ['winrate']}% WR en {champ['games']} partidas"
                for champ in stats["best_champions"][:3]
            ]
        
        # Áreas de mejora
        avg_deaths = stats.get("avg_deaths", 0)
        avg_vision = stats.get("avg_vision_score", 0)
        kda = stats.get("kda_ratio", 0)
        avg_cs = stats.get("avg_cs", 0)
        avg_duration = stats.get("avg_game_duration", 25)
        
        if avg_deaths > 6:
            recommendations["improvement_areas"].append(
                "Muertes altas: Trabaja en tu posicionamiento y mapeo"
            )
        
        if avg_vision < 15:
            recommendations["improvement_areas"].append(
                "Vision baja: Compra mas wards y usa el trinket activamente"
            )
        
        cs_per_min = avg_cs / max(avg_duration, 1)
        if cs_per_min < 6 and stats.get("preferred_role") in ["TOP", "MID", "BOTTOM"]:
            recommendations["improvement_areas"].append(
                "CS bajo: Practica farmeo en modo practica (objetivo: 7+ CS/min)"
            )
        
        # Fortalezas
        if kda >= 3:
            recommendations["strengths"].append(
                f"Excelente KDA: {kda} - Juegas de forma consistente"
            )
        
        winrate = stats.get("winrate", 50)
        if winrate >= 55:
            recommendations["strengths"].append(
                f"Winrate alto: {winrate}% - Sigue asi!"
            )
        
        if avg_vision >= 25:
            recommendations["strengths"].append(
                "Gran control de vision"
            )
        
        # Tips de estilo de juego
        preferred_role = stats.get("preferred_role", "")
        role_tips = {
            "TOP": [
                "Como toplaner, gestiona bien las olas para crear presion",
                "Usa Teleport para impactar otras lineas",
                "Conoce tus matchups y power spikes"
            ],
            "JUNGLE": [
                "Trackea al jungler enemigo constantemente",
                "Controla los tiempos de objetivos (Drake, Herald, Baron)",
                "Identifica que linea tiene mas carry potential"
            ],
            "MID": [
                "Roamea cuando pushees la ola",
                "Wardea para evitar ganks del jungler",
                "Aprovecha tus power spikes para hacer plays"
            ],
            "BOTTOM": [
                "Farmea de forma segura en early game",
                "Coordina con tu support para tradeos",
                "Posicionate bien en teamfights"
            ],
            "UTILITY": [
                "Manten vision constante en objetivos",
                "Protege a tu ADC y carries",
                "Busca engages cuando tengas ventaja numerica"
            ]
        }
        
        if preferred_role in role_tips:
            recommendations["playstyle_tips"] = role_tips[preferred_role]
        
        # Recomendaciones para partida en curso
        if current_game_info:
            recommendations["in_game_tips"] = self._generate_in_game_tips(
                current_game_info, stats
            )
        
        return recommendations
    
    def _generate_in_game_tips(self, game_info: dict, player_stats: dict) -> list:
        """Genera tips específicos para la partida actual"""
        tips = []
        
        participants = game_info.get("participants", [])
        
        # Analizar composición enemiga
        enemy_team = []
        player_team = []
        player_champion = None
        
        for p in participants:
            if p.get("teamId") == 100:  # Simplificado
                player_team.append(p)
            else:
                enemy_team.append(p)
        
        # Tips generales basados en composición
        tips.append("Tips para esta partida:")
        tips.append("- Comunica con tu equipo los objetivos prioritarios")
        tips.append("- Adapta tu build segun la composicion enemiga")
        
        return tips
    
    def get_build_recommendations(self, champion_name: str, role: str, enemy_comp: list = None) -> dict:
        """
        Obtiene recomendaciones de build para un campeón
        (Simplificado - en producción usaría datos de APIs de terceros o ML)
        """
        # Builds genéricos por tipo de campeón
        return {
            "core_items": [],
            "situational_items": [],
            "runes": {},
            "summoner_spells": [],
            "skill_order": "",
            "notes": "Adapta tu build según el estado de la partida"
        }


# Instancia global del servicio
recommendation_service = RecommendationService()
