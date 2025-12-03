# Documentación Técnica

Referencia detallada de cada archivo del proyecto, su propósito y estructura interna.

---

## Backend

### `backend/config.py`

Módulo de configuración centralizada. Utiliza Pydantic Settings para gestión de variables de entorno con validación de tipos.

#### Clase `Settings`

| Atributo | Tipo | Descripción |
|----------|------|-------------|
| `riot_api_key` | str | Token de autenticación para Riot API |
| `default_region` | str | Región de plataforma por defecto |
| `default_routing` | str | Cluster regional para endpoints v5 |
| `riot_api_base` | str | Dominio base de Riot API |
| `ddragon_base` | str | URL base de Data Dragon CDN |
| `platform_regions` | dict | Mapeo región -> cluster (americas, europe, asia, sea) |
| `region_names` | dict | Nombres legibles de cada región |

La configuración se carga automáticamente desde `.env` usando `python-dotenv`.

---

### `backend/riot_client.py`

Cliente HTTP asíncrono para comunicación con Riot Games API. Implementa todos los endpoints necesarios con manejo de errores estandarizado.

#### Clase `RiotAPIClient`

**Métodos privados:**

| Método | Descripción |
|--------|-------------|
| `_get_platform_url(region)` | Genera URL para endpoints de plataforma (v4) |
| `_get_regional_url(routing)` | Genera URL para endpoints regionales (v5) |
| `_request(url, params)` | Ejecuta petición GET con manejo de errores HTTP |

**Endpoints Account-V1:**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `get_account_by_riot_id` | `/riot/account/v1/accounts/by-riot-id/{name}/{tag}` | Busca cuenta por Riot ID |
| `get_account_by_puuid` | `/riot/account/v1/accounts/by-puuid/{puuid}` | Obtiene cuenta por PUUID |

**Endpoints Summoner-V4:**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `get_summoner_by_puuid` | `/lol/summoner/v4/summoners/by-puuid/{puuid}` | Datos de invocador |
| `get_summoner_by_id` | `/lol/summoner/v4/summoners/{id}` | Datos por Summoner ID |

**Endpoints Match-V5:**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `get_match_ids_by_puuid` | `/lol/match/v5/matches/by-puuid/{puuid}/ids` | Lista de IDs de partidas |
| `get_match_by_id` | `/lol/match/v5/matches/{matchId}` | Detalles completos de partida |
| `get_match_timeline` | `/lol/match/v5/matches/{matchId}/timeline` | Timeline de eventos |

**Endpoints Spectator-V5:**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `get_current_game` | `/lol/spectator/v5/active-games/by-summoner/{puuid}` | Partida en vivo |
| `get_featured_games` | `/lol/spectator/v5/featured-games` | Partidas destacadas |

**Endpoints League-V4:**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `get_league_entries_by_summoner` | `/lol/league/v4/entries/by-summoner/{id}` | Rankings del jugador |
| `get_challenger_league` | `/lol/league/v4/challengerleagues/by-queue/{queue}` | Liga Challenger |
| `get_grandmaster_league` | `/lol/league/v4/grandmasterleagues/by-queue/{queue}` | Liga Grandmaster |
| `get_master_league` | `/lol/league/v4/masterleagues/by-queue/{queue}` | Liga Master |

**Endpoints Champion-Mastery-V4:**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `get_champion_mastery` | `/lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}` | Todas las maestrías |
| `get_champion_mastery_top` | `.../by-puuid/{puuid}/top` | Top N maestrías |
| `get_mastery_score` | `/lol/champion-mastery/v4/scores/by-puuid/{puuid}` | Puntaje total |

---

### `backend/main.py`

Servidor FastAPI principal. Define todos los endpoints REST y sirve archivos estáticos del frontend.

#### Configuración

```python
app = FastAPI(title="LoL Statistics App", version="1.0.0")
```

- CORS habilitado para desarrollo
- Archivos estáticos montados en `/static`
- Página principal servida en `/`

#### Grupos de Endpoints

**Datos Estáticos (`/api/ddragon/*`):**
- `/version` - Versión de Data Dragon
- `/champions` - Diccionario de campeones
- `/spells` - Hechizos de invocador
- `/items` - Items del juego
- `/runes` - Runas reforjadas

**Jugador (`/api/*`):**
- `/account/{name}/{tag}` - Búsqueda por Riot ID
- `/summoner/{puuid}` - Datos de invocador
- `/ranked/{puuid}` - Entradas de liga
- `/mastery/{puuid}` - Maestrías de campeones
- `/matches/{puuid}` - IDs de partidas

**Partidas:**
- `/match/{match_id}` - Detalles de partida
- `/match/{match_id}/details` - Partida con análisis
- `/live/{summoner_id}` - Partida en vivo

**Rankings:**
- `/league/challenger` - Ladder Challenger
- `/league/grandmaster` - Ladder Grandmaster
- `/league/master` - Ladder Master

**Endpoints Legacy:**
Mantienen compatibilidad con versiones anteriores:
- `/api/player/search`
- `/api/player/{puuid}/ranked`
- `/api/player/{puuid}/matches`

---

### `backend/services/ddragon.py`

Servicio para obtención de datos estáticos desde Data Dragon CDN de Riot.

#### Clase `DataDragonService`

**Caché interno:**
Los datos se almacenan en memoria después de la primera petición para evitar llamadas redundantes.

| Atributo | Tipo | Descripción |
|----------|------|-------------|
| `_version` | str | Versión del parche actual |
| `_champions` | dict | Datos de campeones |
| `_items` | dict | Datos de items |
| `_summoner_spells` | dict | Hechizos de invocador |
| `_runes` | list | Runas reforjadas |

**Métodos:**

| Método | Retorno | Descripción |
|--------|---------|-------------|
| `get_latest_version()` | str | Obtiene versión más reciente |
| `get_champions(lang)` | dict | Diccionario de campeones |
| `get_champion_by_id(id, lang)` | dict | Campeón por ID numérico |
| `get_items(lang)` | dict | Diccionario de items |
| `get_summoner_spells(lang)` | dict | Hechizos de invocador |
| `get_runes(lang)` | list | Lista de árboles de runas |

**Generadores de URL:**

| Método | Descripción |
|--------|-------------|
| `get_champion_image_url(name)` | URL de splash art |
| `get_champion_square_url(name, version)` | URL de icono cuadrado |
| `get_profile_icon_url(id, version)` | URL de icono de perfil |

---

### `backend/services/recommendations.py`

Motor de análisis estadístico para generar métricas a partir del historial de partidas.

#### Clase `RecommendationService`

**Método `analyze_matches(matches, puuid)`**

Procesa una lista de partidas y extrae estadísticas agregadas.

Retorna diccionario con:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `total_matches` | int | Partidas analizadas |
| `wins` | int | Victorias |
| `losses` | int | Derrotas |
| `champions_played` | Counter | Frecuencia por campeón |
| `roles_played` | Counter | Frecuencia por rol |
| `avg_kills` | float | Promedio de kills |
| `avg_deaths` | float | Promedio de muertes |
| `avg_assists` | float | Promedio de asistencias |
| `avg_cs` | float | Promedio de CS |
| `avg_vision_score` | float | Promedio de visión |
| `champion_stats` | dict | Estadísticas por campeón |
| `kda_ratio` | float | Ratio KDA global |

**Método `get_champion_recommendations(stats)`**

Genera lista de campeones recomendados basado en:
- Winrate superior al 50%
- Mínimo de 3 partidas jugadas
- KDA promedio positivo

**Método `analyze_player_performance(puuid, matches)`**

Análisis completo que combina estadísticas con recomendaciones de mejora.

---

## Frontend

### `frontend/index.html`

Estructura HTML principal de la aplicación. Diseño single-page con secciones intercambiables.

#### Estructura DOM

```
.app
├── header.header
│   ├── .logo
│   ├── nav.nav (links de navegación)
│   ├── form.header-search
│   └── button#theme-toggle
├── main.main
│   ├── section#hero-section (pantalla inicial)
│   ├── section#profile-section (perfil de jugador)
│   ├── section#champions-section (lista de campeones)
│   ├── section#items-section (catálogo de items)
│   ├── section#ranking-section (leaderboards)
│   ├── section#tierlist-section (tier list)
│   ├── section#multisearch-section (búsqueda múltiple)
│   ├── section#error-section (pantalla de error)
│   └── div#loading (indicador de carga)
├── div.modal#match-modal (modal de detalles)
└── footer.footer
```

#### Secciones Principales

**Hero Section:**
- Formulario de búsqueda principal
- Selector de región
- Accesos rápidos a Tier List, Campeones, Rankings

**Profile Section:**
- Layout de dos columnas (sidebar + contenido)
- Sidebar: estadísticas de campeones, maestría
- Contenido: ranked info, historial de partidas

**Modal:**
- Reutilizado para detalles de partida, campeón, item
- Cierre por click en backdrop, botón X, o tecla Escape

---

### `frontend/css/styles.css`

Hoja de estilos con sistema de diseño basado en variables CSS.

#### Variables de Tema

```css
:root {
    --bg-dark: #0d1117;
    --bg-card: #161b22;
    --bg-hover: #1f2428;
    --border: #30363d;
    --text: #e6edf3;
    --text-secondary: #8b949e;
    --accent: #58a6ff;
    --win: #3fb950;
    --loss: #f85149;
    --gold: #f0a500;
}
```

**Tema Claro (`[data-theme="light"]`):**
- Variables redefinidas con paleta clara
- Activado mediante atributo en `<html>`

#### Secciones de Estilos

| Sección | Líneas aprox. | Descripción |
|---------|---------------|-------------|
| Variables | 1-70 | Definición de colores y valores base |
| Header | 90-180 | Navegación y búsqueda |
| Hero | 200-350 | Pantalla inicial con gradiente |
| Profile | 360-550 | Layout de perfil de jugador |
| Match Cards | 550-700 | Tarjetas de partidas |
| Champions/Items | 700-900 | Grids de campeones e items |
| Ranking | 900-1000 | Tabla de clasificación |
| Modal | 1000-1150 | Ventana modal |
| Tier List | 1150-1300 | Componentes de tier list |
| Multi-Search | 1300-1450 | Búsqueda múltiple |
| Live Game | 1450-1550 | Partida en vivo |
| Responsive | 1600+ | Media queries |

#### Clases Utilitarias

| Clase | Uso |
|-------|-----|
| `.hidden` | Oculta elemento (`display: none`) |
| `.win` | Color de victoria |
| `.loss` | Color de derrota |
| `.gradient-text` | Texto con gradiente |

---

### `frontend/js/app.js`

Lógica de aplicación en JavaScript vanilla (ES6+).

#### Estado Global

```javascript
const state = {
    puuid: null,
    region: 'la1',
    gameName: null,
    tagLine: null,
    summoner: null,
    ddragonVersion: null,
    champions: {},
    spells: {},
    items: {},
    matches: [],
    matchesLoaded: 0,
    championStats: {},
    currentSection: 'hero'
};
```

#### Sistema de Caché

```javascript
const cache = {
    data: new Map(),
    ttl: 5 * 60 * 1000,  // 5 minutos
    set(key, value) { ... },
    get(key) { ... },
    clear() { ... }
};
```

Reduce llamadas redundantes a la API almacenando respuestas en memoria.

#### Funciones Principales

**Inicialización:**

| Función | Descripción |
|---------|-------------|
| `init()` | Carga versión, campeones, spells, items |
| `setupEvents()` | Registra event listeners |
| `initTheme()` | Carga tema desde localStorage |
| `checkUrlParams()` | Procesa parámetros de URL |

**Navegación:**

| Función | Descripción |
|---------|-------------|
| `showSection(name)` | Muestra sección y oculta otras |
| `showLoading(bool)` | Muestra/oculta indicador de carga |
| `showError(msg)` | Muestra pantalla de error |

**Búsqueda y Perfil:**

| Función | Descripción |
|---------|-------------|
| `search(input, region)` | Busca jugador por Riot ID |
| `loadProfile()` | Carga datos completos de perfil |
| `refreshProfile()` | Actualiza perfil actual |
| `renderRankedInfo(data)` | Renderiza tarjetas de ranked |
| `renderMastery(data)` | Renderiza sección de maestría |

**Historial de Partidas:**

| Función | Descripción |
|---------|-------------|
| `loadMatches()` | Carga batch inicial de partidas |
| `loadMoreMatches()` | Carga partidas adicionales |
| `filterMatches()` | Filtra por tipo de cola |
| `renderMatchCard(match)` | Genera HTML de tarjeta |
| `showMatchDetails(matchId)` | Muestra modal con detalles |

**Campeones e Items:**

| Función | Descripción |
|---------|-------------|
| `loadChampionsList()` | Renderiza grid de campeones |
| `filterChampions()` | Filtra por nombre |
| `showChampionModal(id)` | Modal con stats del campeón |
| `loadItemsList()` | Renderiza grid de items |
| `filterItems()` | Filtra por nombre/categoría |
| `showItemModal(id)` | Modal con detalles del item |

**Rankings:**

| Función | Descripción |
|---------|-------------|
| `loadRanking()` | Carga ladder de región/cola |
| `loadTierList()` | Genera tier list de campeones |

**Utilidades:**

| Función | Descripción |
|---------|-------------|
| `api(endpoint, useCache)` | Wrapper para fetch con caché |
| `formatNumber(n)` | Formatea números grandes (1.5K) |
| `timeAgo(timestamp)` | Tiempo relativo (hace 2h) |
| `formatDuration(seconds)` | Formato mm:ss |
| `getChampionIcon(id)` | URL de icono de campeón |
| `getItemIcon(id)` | URL de icono de item |
| `getSpellIcon(id)` | URL de hechizo de invocador |
| `getRankEmblem(tier)` | URL de emblema de rango |

**Tema:**

| Función | Descripción |
|---------|-------------|
| `initTheme()` | Detecta tema guardado o del sistema |
| `toggleTheme()` | Alterna entre claro y oscuro |

---

## Archivos de Configuración

### `.env`

Variables de entorno (no se versiona).

```
RIOT_API_KEY=RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
DEFAULT_REGION=la1
DEFAULT_ROUTING=americas
```

### `.gitignore`

```
.env
__pycache__/
*.pyc
venv/
.vscode/
```

### `requirements.txt`

```
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
httpx>=0.25.0
python-dotenv>=1.0.0
pydantic-settings>=2.0.0
```

---

## Flujo de Datos

### Búsqueda de Jugador

```
Usuario ingresa "Nombre#Tag"
       ↓
Frontend: search() → api('/api/account/{name}/{tag}')
       ↓
Backend: get_account_by_riot_id() → Riot API
       ↓
Backend: get_summoner_by_puuid() → Riot API
       ↓
Frontend: loadProfile() → Renderiza UI
```

### Carga de Partidas

```
loadMatches()
       ↓
api('/api/matches/{puuid}') → Lista de IDs
       ↓
Para cada ID: api('/api/match/{id}')
       ↓
renderMatchCard() → Inserta en DOM
       ↓
calculateChampionStats() → Actualiza sidebar
```

### Partida en Vivo

```
checkLiveGame()
       ↓
api('/api/live/{summonerId}')
       ↓
Si existe: Muestra botón "En Vivo"
       ↓
showLiveGame() → Modal con equipos
```

---

## Convenciones de Código

### Backend (Python)

- Docstrings en todas las funciones públicas
- Type hints en parámetros y retornos
- Async/await para operaciones I/O
- Manejo de errores con HTTPException

### Frontend (JavaScript)

- Funciones flecha para callbacks
- Template literals para HTML dinámico
- Operador opcional (?.) para acceso seguro
- Desestructuración para extracción de datos

### CSS

- Variables CSS para valores reutilizables
- BEM-like naming para componentes
- Mobile-first con media queries
- Transiciones para interactividad
