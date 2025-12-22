# Tecnologías Pendientes de Implementar

> Proyecto de portfolio - LoL Statistics

## Estado Actual
- [x] Frontend Vue 3 + TypeScript + Vite
- [x] Backend Python FastAPI
- [x] Backend Express TypeScript (alternativo)
- [x] Integración Riot API
- [x] Diseño responsive profesional

---

## Pendientes de Implementar

### 1. Base de Datos - Redis
- [ ] Configurar Redis para caché de datos de Riot API
- [ ] Implementar TTL para datos de invocadores (5-10 min)
- [ ] Cachear datos de campeones/items (24h)
- [ ] Rate limiting con Redis
- [ ] Sesiones de usuario

**Paquetes:**
```bash
# Python
pip install redis aioredis

# Node
npm install ioredis
```

---

### 2. Autenticación - JWT + Refresh Tokens
- [ ] Registro de usuarios (email/password)
- [ ] Login con JWT access token (15 min)
- [ ] Refresh token rotation (7 días)
- [ ] Middleware de autenticación
- [ ] Protección de rutas en Vue Router
- [ ] Almacenamiento seguro de tokens (httpOnly cookies)
- [ ] Logout con invalidación de tokens

**Opcional futuro:**
- [ ] OAuth con Discord (popular en comunidad LoL)
- [ ] Vincular cuenta de Riot Games

**Paquetes:**
```bash
# Python
pip install python-jose[cryptography] passlib[bcrypt]

# Node
npm install jsonwebtoken bcryptjs
```

---

### 3. Testing - Vitest
- [ ] Configurar Vitest en frontend-vue
- [ ] Tests unitarios para composables
- [ ] Tests de componentes con Vue Test Utils
- [ ] Tests de stores Pinia
- [ ] Mocks para API calls
- [ ] Coverage reports

**Paquetes:**
```bash
npm install -D vitest @vue/test-utils happy-dom @vitest/coverage-v8
```

**Configuración vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    coverage: {
      provider: 'v8'
    }
  }
})
```

---

### 4. Deploy - Railway
- [ ] Configurar railway.toml para backend Python
- [ ] Configurar Dockerfile si es necesario
- [ ] Variables de entorno en Railway
- [ ] Base de datos Redis en Railway
- [ ] CI/CD automático desde GitHub
- [ ] Dominio personalizado (opcional)

**Estructura de deploy:**
```
Railway Project
├── Backend Service (Python/FastAPI)
├── Frontend Service (Vite static)
└── Redis Service
```

---

### 5. Tecnologías Adicionales Recomendadas

#### Base de Datos Persistente - PostgreSQL
- [ ] Almacenar usuarios registrados
- [ ] Historial de búsquedas
- [ ] Favoritos de invocadores
- [ ] Estadísticas de uso de la app

**Paquetes:**
```bash
# Python
pip install sqlalchemy asyncpg alembic

# Node
npm install prisma @prisma/client
```

#### Validación de Datos - Zod
- [ ] Validar inputs de formularios
- [ ] Type-safe API responses
- [ ] Schemas compartidos

```bash
npm install zod
```

#### Estado del Servidor - TanStack Query
- [ ] Reemplazar fetch manual por useQuery
- [ ] Caché automático en cliente
- [ ] Refetch automático
- [ ] Estados loading/error consistentes

```bash
npm install @tanstack/vue-query
```

#### Animaciones - Motion
- [ ] Transiciones de página
- [ ] Animaciones de entrada de componentes
- [ ] Micro-interacciones

```bash
npm install @vueuse/motion
```

#### Documentación API - Swagger/OpenAPI
- [ ] Documentar endpoints automáticamente
- [ ] UI interactiva para probar API
- [ ] Ya incluido en FastAPI, solo habilitar

#### Monitoreo - Sentry
- [ ] Tracking de errores en producción
- [ ] Performance monitoring
- [ ] Alertas automáticas

```bash
npm install @sentry/vue
pip install sentry-sdk
```

#### PWA - Progressive Web App
- [ ] Service Worker para offline
- [ ] Instalable en móvil
- [ ] Push notifications (opcional)

```bash
npm install vite-plugin-pwa
```

---

## Prioridad de Implementación

### Fase 1 - Core (Portfolio Ready)
1. Vitest - Tests básicos
2. Redis - Caché de API
3. Railway - Deploy funcional

### Fase 2 - Features
4. PostgreSQL - Persistencia
5. JWT Auth - Usuarios
6. TanStack Query - Mejor UX

### Fase 3 - Polish
7. Sentry - Monitoreo
8. PWA - Mobile experience
9. Animaciones

---

## Comandos Útiles

```bash
# Desarrollo local
cd frontend-vue && npm run dev
cd backend && uvicorn main:app --reload

# Tests
npm run test
npm run coverage

# Build producción
npm run build

# Deploy Railway
railway up
```

---

## Variables de Entorno Necesarias

```env
# API
RIOT_API_KEY=RGAPI-xxx
API_URL=http://localhost:8000

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=tu-secret-muy-seguro
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Sentry (producción)
SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

*Última actualización: 22 de diciembre de 2025*
