# LoL Statistics

Aplicacion web para consulta y analisis de estadisticas de League of Legends. Consume la API oficial de Riot Games para proporcionar informacion detallada sobre jugadores, partidas, campeones y rankings.

## Novedades v2.0

- Frontend Vue.js 3 con TypeScript
- Backend Express con TypeScript
- Sistema de Routing con Vue Router
- Estado Global con Pinia
- Diseno Responsivo

## Caracteristicas

### Perfil de Jugador
- Búsqueda por Riot ID (Nombre#Tag)
- Información de cuenta y nivel
- Rankings en colas competitivas (Solo/Duo, Flex)
- Maestría de campeones con niveles y puntos
- Estadísticas por campeón jugado (KDA, winrate, CS)

### Historial de Partidas
- Últimas partidas con detalles completos
- Filtrado por tipo de cola
- Información de todos los participantes
- KDA, CS, daño, oro y duración
- Items construidos por partida

### Partida en Vivo
- Detección automática de partida activa
- Información de ambos equipos
- Rangos y winrates de cada jugador
- Hechizos de invocador seleccionados

### Tier List
- Campeones organizados por tier (S, A, B, C, D)
- Filtrado por rol (Top, Jungle, Mid, ADC, Support)
- Basado en datos de pickrate y winrate

### Multi-Search
- Análisis de lobby de partida
- Pegar nombres de múltiples jugadores
- Vista rápida de rangos del equipo

### Sección de Items
- Catálogo completo de items del juego
- Filtrado por categoría (Daño, Armadura, etc.)
- Detalles de estadísticas y recetas
- Árbol de construcción navegable

### Rankings
- Ladder de Challenger, Grandmaster y Master
- Filtrado por región y cola
- LP mínimo para cada tier

## Estructura del Proyecto

```
estadisticas_lol/
  backend/              # Backend Python (FastAPI)
  backend-express/      # Backend Node.js (Express + TypeScript)
  frontend/             # Frontend original (Vanilla JS)
  frontend-vue/         # Frontend Vue.js 3 + TypeScript
  tests/                # Tests
```

## Requisitos

### Para Frontend Vue.js + Backend Express
- Node.js 18+
- npm o yarn

### Para Backend FastAPI (Original)
- Python 3.10+
- API Key de Riot Games (desarrollo o producción)

## Instalación

### Opcion 1: Vue.js + Express (Recomendado)

1. Clonar el repositorio:
```bash
git clone https://github.com/GriffithFan/estadisticas_lol.git
cd estadisticas_lol
```

2. Instalar y ejecutar Backend Express:
```bash
cd backend-express
npm install
npm run dev
```
El backend estará en `http://localhost:3001`

3. En otra terminal, instalar y ejecutar Frontend Vue.js:
```bash
cd frontend-vue
npm install
npm run dev
```
El frontend estará en `http://localhost:3000`

### Opcion 2: Backend FastAPI (Original)

1. Clonar el repositorio:
```bash
git clone https://github.com/GriffithFan/estadisticas_lol.git
cd estadisticas_lol
```

2. Crear entorno virtual:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

3. Instalar dependencias:
```bash
pip install -r requirements.txt
```

4. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env y agregar RIOT_API_KEY
```

5. Ejecutar servidor:
```bash
uvicorn backend.main:app --reload --port 8000
```

6. Abrir en navegador: `http://localhost:8000`

## Pruebas

El proyecto incluye pruebas automatizadas para los endpoints críticos del backend (recomendaciones, partida en vivo y utilidades de Data Dragon). Para ejecutarlas:

```bash
python -m pytest tests -vv
```

Las pruebas mockean las dependencias externas (Riot API y Data Dragon) para ofrecer feedback rápido sin necesidad de llamadas reales.

## Variables de Entorno

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| RIOT_API_KEY | API Key de Riot Games | (requerido) |
| DEFAULT_REGION | Región por defecto | la1 |
| DEFAULT_ROUTING | Routing regional | americas |

## Estructura del Proyecto

```
estadisticas_lol/
├── backend/
│   ├── main.py              # Servidor FastAPI y endpoints
│   ├── config.py            # Configuración y constantes
│   ├── riot_client.py       # Cliente HTTP para Riot API
│   └── services/
│       ├── ddragon.py       # Servicio de Data Dragon
│       └── recommendations.py # Análisis de estadísticas
├── frontend/
│   ├── index.html           # Página principal
│   ├── css/
│   │   └── styles.css       # Estilos de la aplicación
│   └── js/
│       └── app.js           # Lógica del cliente
├── .env                     # Variables de entorno (no commitear)
├── .gitignore
├── requirements.txt
└── README.md
```

## API Endpoints

### Datos Estáticos
- `GET /api/ddragon/version` - Versión actual del juego
- `GET /api/ddragon/champions` - Lista de campeones
- `GET /api/ddragon/spells` - Hechizos de invocador
- `GET /api/ddragon/items` - Items del juego

### Jugador
- `GET /api/account/{name}/{tag}` - Buscar cuenta por Riot ID
- `GET /api/summoner/{puuid}` - Datos del invocador
- `GET /api/ranked/{puuid}` - Rankings del jugador
- `GET /api/mastery/{puuid}` - Maestrías de campeones

### Partidas
- `GET /api/matches/{puuid}` - IDs de partidas recientes
- `GET /api/match/{match_id}` - Detalles de una partida
- `GET /api/live/{summoner_id}` - Partida en vivo

### Rankings
- `GET /api/league/challenger` - Ladder Challenger
- `GET /api/league/grandmaster` - Ladder Grandmaster
- `GET /api/league/master` - Ladder Master

## Tecnologías

**Backend:**
- FastAPI - Framework web asíncrono
- httpx - Cliente HTTP asíncrono
- Pydantic - Validación de datos

**Frontend:**
- Vanilla JavaScript (ES6+)
- CSS3 con variables y grid/flexbox
- Sin dependencias externas

**APIs:**
- Riot Games API (Account, Summoner, Match, League, Spectator, Champion Mastery)
- Data Dragon (datos estáticos de campeones, items, etc.)

## Regiones Soportadas

| Código | Región |
|--------|--------|
| la1 | Latinoamérica Norte |
| la2 | Latinoamérica Sur |
| na1 | Norteamérica |
| euw1 | Europa Oeste |
| eun1 | Europa Norte y Este |
| kr | Corea |
| jp1 | Japón |
| br1 | Brasil |
| oc1 | Oceanía |
| tr1 | Turquía |
| ru | Rusia |

## Licencia

MIT License

## Autor

Griffith_Tech

---

*Este proyecto no está afiliado con Riot Games. League of Legends y Riot Games son marcas registradas de Riot Games, Inc.*
