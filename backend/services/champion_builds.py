"""
Datos de builds populares para campeones.
Basado en estadisticas agregadas del parche actual.
"""

# Estructura: championKey -> { role -> build_data }
# Los IDs de items y runas son los oficiales de Riot

CHAMPION_BUILDS = {
    # Ejemplo estructura - los datos reales vendrian de una API de terceros o scraping
    "Akali": {
        "MID": {
            "keystone": 8112,  # Electrocute
            "secondary_tree": 8200,  # Sorcery
            "summoners": [4, 14],  # Flash, Ignite
            "core_items": [3152, 3089, 3157],  # Hextech, Rabadon, Zhonya
            "boots": 3020,  # Sorc shoes
            "situational": [3135, 3165, 4645],  # Void, Morello, Shadowflame
            "winrate": 51.2,
            "pickrate": 8.4,
            "games": 45000
        },
        "TOP": {
            "keystone": 8010,  # Conqueror
            "secondary_tree": 8200,
            "summoners": [4, 12],  # Flash, TP
            "core_items": [3152, 3157, 3089],
            "boots": 3020,
            "situational": [3135, 3053, 3026],
            "winrate": 49.8,
            "pickrate": 3.2,
            "games": 18000
        }
    },
    "Ahri": {
        "MID": {
            "keystone": 8112,
            "secondary_tree": 8300,  # Inspiration
            "summoners": [4, 14],
            "core_items": [6655, 3089, 3157],  # Luden, Rabadon, Zhonya
            "boots": 3020,
            "situational": [3135, 3102, 4628],
            "winrate": 52.1,
            "pickrate": 9.8,
            "games": 62000
        }
    },
    "Yasuo": {
        "MID": {
            "keystone": 8008,  # Lethal Tempo
            "secondary_tree": 8400,  # Resolve
            "summoners": [4, 14],
            "core_items": [6672, 3031, 6673],  # Kraken, IE, Shieldbow
            "boots": 3006,  # Berserker
            "situational": [3072, 3139, 6676],
            "winrate": 49.5,
            "pickrate": 11.2,
            "games": 78000
        },
        "TOP": {
            "keystone": 8008,
            "secondary_tree": 8400,
            "summoners": [4, 14],
            "core_items": [6672, 3031, 3053],
            "boots": 3006,
            "situational": [3072, 3026, 6333],
            "winrate": 48.3,
            "pickrate": 4.1,
            "games": 25000
        }
    }
}

# Builds genericas por rol para campeones sin datos especificos
DEFAULT_BUILDS = {
    "Assassin": {
        "MID": {
            "keystone": 8112,  # Electrocute
            "secondary_tree": 8200,
            "summoners": [4, 14],
            "core_items": [3142, 6693, 6676],  # Youmuu, Prowler, Collector
            "boots": 3158,  # Lucidity
            "situational": [3814, 6694, 3156],
            "winrate": 50.0,
            "pickrate": 5.0,
            "games": 10000
        }
    },
    "Fighter": {
        "TOP": {
            "keystone": 8010,  # Conqueror
            "secondary_tree": 8400,
            "summoners": [4, 12],
            "core_items": [3078, 3053, 3071],  # Trinity, Sterak, BC
            "boots": 3111,  # Merc treads
            "situational": [3748, 6333, 3026],
            "winrate": 50.5,
            "pickrate": 6.0,
            "games": 15000
        },
        "JUNGLE": {
            "keystone": 8010,
            "secondary_tree": 8400,
            "summoners": [4, 11],  # Flash, Smite
            "core_items": [6632, 3053, 3071],
            "boots": 3111,
            "situational": [3748, 3193, 3026],
            "winrate": 50.2,
            "pickrate": 5.5,
            "games": 12000
        }
    },
    "Mage": {
        "MID": {
            "keystone": 8229,  # Arcane Comet
            "secondary_tree": 8300,
            "summoners": [4, 12],
            "core_items": [6655, 3089, 3135],  # Luden, Rabadon, Void
            "boots": 3020,
            "situational": [3157, 3165, 4628],
            "winrate": 51.0,
            "pickrate": 7.0,
            "games": 20000
        }
    },
    "Marksman": {
        "BOTTOM": {
            "keystone": 8008,  # Lethal Tempo
            "secondary_tree": 8300,
            "summoners": [4, 7],  # Flash, Heal
            "core_items": [6672, 3031, 3094],  # Kraken, IE, RFC
            "boots": 3006,
            "situational": [3085, 3072, 6676],
            "winrate": 50.8,
            "pickrate": 8.0,
            "games": 25000
        }
    },
    "Support": {
        "UTILITY": {
            "keystone": 8465,  # Guardian
            "secondary_tree": 8300,
            "summoners": [4, 14],
            "core_items": [3853, 3190, 3107],  # Ward item, Locket, Redemption
            "boots": 3158,
            "situational": [3860, 3222, 4401],
            "winrate": 51.5,
            "pickrate": 6.0,
            "games": 18000
        }
    },
    "Tank": {
        "TOP": {
            "keystone": 8437,  # Grasp
            "secondary_tree": 8000,
            "summoners": [4, 12],
            "core_items": [3068, 3075, 3065],  # Sunfire, Thornmail, Spirit
            "boots": 3047,  # Plated
            "situational": [3143, 3742, 3193],
            "winrate": 51.2,
            "pickrate": 5.0,
            "games": 15000
        },
        "JUNGLE": {
            "keystone": 8437,
            "secondary_tree": 8000,
            "summoners": [4, 11],
            "core_items": [6664, 3068, 3075],
            "boots": 3047,
            "situational": [3065, 3742, 3193],
            "winrate": 50.8,
            "pickrate": 4.5,
            "games": 12000
        }
    }
}

# Mapping de keystones a sus iconos
KEYSTONE_DATA = {
    # Precision
    8005: {"name": "Press the Attack", "icon": "Styles/Precision/PressTheAttack/PressTheAttack.png"},
    8008: {"name": "Lethal Tempo", "icon": "Styles/Precision/LethalTempo/LethalTempoTemp.png"},
    8010: {"name": "Conqueror", "icon": "Styles/Precision/Conqueror/Conqueror.png"},
    8021: {"name": "Fleet Footwork", "icon": "Styles/Precision/FleetFootwork/FleetFootwork.png"},
    
    # Domination
    8112: {"name": "Electrocute", "icon": "Styles/Domination/Electrocute/Electrocute.png"},
    8124: {"name": "Predator", "icon": "Styles/Domination/Predator/Predator.png"},
    8128: {"name": "Dark Harvest", "icon": "Styles/Domination/DarkHarvest/DarkHarvest.png"},
    9923: {"name": "Hail of Blades", "icon": "Styles/Domination/HailOfBlades/HailOfBlades.png"},
    
    # Sorcery
    8214: {"name": "Summon Aery", "icon": "Styles/Sorcery/SummonAery/SummonAery.png"},
    8229: {"name": "Arcane Comet", "icon": "Styles/Sorcery/ArcaneComet/ArcaneComet.png"},
    8230: {"name": "Phase Rush", "icon": "Styles/Sorcery/PhaseRush/PhaseRush.png"},
    
    # Resolve
    8437: {"name": "Grasp of the Undying", "icon": "Styles/Resolve/GraspOfTheUndying/GraspOfTheUndying.png"},
    8439: {"name": "Aftershock", "icon": "Styles/Resolve/VeteranAftershock/VeteranAftershock.png"},
    8465: {"name": "Guardian", "icon": "Styles/Resolve/Guardian/Guardian.png"},
    
    # Inspiration
    8351: {"name": "Glacial Augment", "icon": "Styles/Inspiration/GlacialAugment/GlacialAugment.png"},
    8360: {"name": "Unsealed Spellbook", "icon": "Styles/Inspiration/UnsealedSpellbook/UnsealedSpellbook.png"},
    8369: {"name": "First Strike", "icon": "Styles/Inspiration/FirstStrike/FirstStrike.png"}
}

# Nombres de arboles secundarios
RUNE_TREES = {
    8000: "Precision",
    8100: "Domination", 
    8200: "Sorcery",
    8300: "Inspiration",
    8400: "Resolve"
}


def get_champion_build(champion_name: str, role: str = None) -> dict:
    """
    Obtiene la build recomendada para un campeon.
    Si no hay datos especificos, usa builds genericas por clase.
    """
    # Buscar build especifica del campeon
    if champion_name in CHAMPION_BUILDS:
        builds = CHAMPION_BUILDS[champion_name]
        if role and role in builds:
            return builds[role]
        # Devolver la primera disponible
        return list(builds.values())[0] if builds else None
    
    return None


def get_default_build_for_class(champion_class: str, role: str = None) -> dict:
    """Obtiene build generica por clase de campeon"""
    if champion_class in DEFAULT_BUILDS:
        class_builds = DEFAULT_BUILDS[champion_class]
        if role and role in class_builds:
            return class_builds[role]
        return list(class_builds.values())[0] if class_builds else None
    
    # Fallback a Fighter
    return DEFAULT_BUILDS.get("Fighter", {}).get("TOP")


def get_keystone_info(keystone_id: int) -> dict:
    """Obtiene informacion de una runa keystone"""
    data = KEYSTONE_DATA.get(keystone_id, {})
    if data:
        return {
            "id": keystone_id,
            "name": data["name"],
            "icon": f"https://ddragon.leagueoflegends.com/cdn/img/perk-images/{data['icon']}"
        }
    return None


def get_secondary_tree_name(tree_id: int) -> str:
    """Obtiene el nombre del arbol secundario"""
    return RUNE_TREES.get(tree_id, "Unknown")
