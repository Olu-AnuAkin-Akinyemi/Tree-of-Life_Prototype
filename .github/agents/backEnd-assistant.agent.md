---
argument-hint: "worker/**"
name: backEnd-assistant
model: Claude Sonnet 4.5 (copilot)
tools: ['edit/createFile', 'edit/createDirectory', 'edit/editFiles', 'search/fileSearch', 'search/readFile', 'search/codebase', 'search/searchResults', 'usages', 'problems', 'testFailure', 'openSimpleBrowser', 'fetch', 'githubRepo', 'extensions']
description: Tactical backend patterns for CloudFlare Workers + D1 + KV + R2. Clean Code (Commander/Messenger/Scribe) + DDD. Vanilla JS + JSDoc.
---

# CloudFlare Backend Agent

**Quick Reference for Edge Backend Development**

---

## Architecture Quick Reference

### Project Structure

```
worker/
├── src/
│   ├── index.js                 # Entry (Commander)
│   ├── router.js
│   ├── container.js             # DI container
│   ├── domain/                  # Entities, Value Objects, Events
│   ├── application/             # Commands, Queries, Services
│   ├── infrastructure/          # Repositories, Cache, Storage
│   ├── interfaces/              # Controllers, Middleware, DTOs
│   └── shared/                  # Errors, Utils
├── migrations/
└── wrangler.toml
```

### Commander/Messenger/Scribe Pattern

| Role | Responsibility | Location |
|------|----------------|----------|
| **Commander** | Orchestrates, delegates, returns | `application/commands/handlers/` |
| **Messenger** | Events, inter-component comms | `infrastructure/messaging/` |
| **Scribe** | Data persistence, retrieval | `infrastructure/repositories/` |

---

## Core Patterns

### Entry Point

```javascript
// worker/src/index.js

/**
 * @typedef {Object} Env
 * @property {D1Database} DB
 * @property {KVNamespace} CACHE
 * @property {R2Bucket} UPLOADS
 * @property {string} JWT_SECRET
 */

import { Router } from './router.js'
import { createContainer } from './container.js'

export default {
  /**
   * @param {Request} request
   * @param {Env} env
   * @param {ExecutionContext} ctx
   * @returns {Promise<Response>}
   */
  async fetch(request, env, ctx) {
    const container = createContainer(env)
    const router = new Router(container)
    
    try {
      return await router.handle(request)
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Internal Error' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      })
    }
  }
}
```

### DI Container

```javascript
// worker/src/container.js

/**
 * @param {Env} env
 * @returns {Object}
 */
function createContainer(env) {
  const eventBus = new EventBus()
  const cache = new KVCacheService(env.CACHE)
  const storage = new R2StorageService(env.UPLOADS)
  
  const userRepo = new CachedUserRepository(
    new D1UserRepository(env.DB),
    cache
  )
  
  return {
    eventBus,
    cache,
    storage,
    userRepo,
    auth: new AuthService(env.JWT_SECRET, userRepo),
    commands: {
      createUser: new CreateUserHandler(userRepo, eventBus)
    },
    queries: {
      getUser: new GetUserHandler(userRepo)
    }
  }
}

export { createContainer }
```

---

## Domain Layer

### Entity

```javascript
// worker/src/domain/entities/User.js

/**
 * @typedef {Object} UserProps
 * @property {UserId} id
 * @property {Email} email
 * @property {string} username
 * @property {Date} createdAt
 */

class User {
  /** @param {UserProps} props */
  constructor(props) {
    Object.assign(this, props)
  }

  /**
   * @param {{email: Email, username: string}} params
   * @returns {User}
   */
  static create({ email, username }) {
    if (!username || username.length < 2) {
      throw new ValidationError('Username must be >= 2 chars')
    }
    return new User({
      id: UserId.generate(),
      email,
      username,
      createdAt: new Date()
    })
  }

  /** @param {UserProps} props */
  static reconstitute(props) {
    return new User(props)
  }

  toJSON() {
    return {
      id: this.id.value,
      email: this.email.value,
      username: this.username,
      createdAt: this.createdAt.toISOString()
    }
  }
}

export { User }
```

### Value Object

```javascript
// worker/src/domain/value-objects/Email.js

class Email {
  /** @param {string} value */
  constructor(value) {
    this.value = value
    Object.freeze(this)
  }

  /**
   * @param {string} value
   * @returns {Email}
   */
  static create(value) {
    const normalized = value.toLowerCase().trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new ValidationError(`Invalid email: ${value}`)
    }
    return new Email(normalized)
  }

  /** @param {Email} other */
  equals(other) {
    return other instanceof Email && this.value === other.value
  }
}

export { Email }
```

```javascript
// worker/src/domain/value-objects/UserId.js

class UserId {
  constructor(value) {
    this.value = value
    Object.freeze(this)
  }

  static generate() {
    return new UserId(crypto.randomUUID())
  }

  static fromValue(value) {
    return new UserId(String(value))
  }
}

export { UserId }
```

### Domain Event

```javascript
// worker/src/domain/events/UserCreated.js

class UserCreatedEvent {
  type = 'user.created'

  /** @param {User} user */
  constructor(user) {
    this.payload = {
      userId: user.id.value,
      email: user.email.value
    }
    this.timestamp = new Date().toISOString()
    Object.freeze(this)
  }
}

export { UserCreatedEvent }
```

---

## Infrastructure Layer

### D1 Repository (Scribe)

```javascript
// worker/src/infrastructure/repositories/D1UserRepository.js

class D1UserRepository {
  /** @param {D1Database} db */
  constructor(db) {
    this.db = db
  }

  /** @param {UserId} userId */
  async findById(userId) {
    const row = await this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId.value)
      .first()
    return row ? this.toDomain(row) : null
  }

  /** @param {Email} email */
  async findByEmail(email) {
    const row = await this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email.value)
      .first()
    return row ? this.toDomain(row) : null
  }

  /** @param {User} user */
  async save(user) {
    await this.db
      .prepare(`
        INSERT INTO users (id, email, username, created_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          email = excluded.email,
          username = excluded.username
      `)
      .bind(user.id.value, user.email.value, user.username, user.createdAt.toISOString())
      .run()
  }

  /** @private */
  toDomain(row) {
    return User.reconstitute({
      id: UserId.fromValue(row.id),
      email: Email.create(row.email),
      username: row.username,
      createdAt: new Date(row.created_at)
    })
  }
}

export { D1UserRepository }
```

### KV Cache Service

```javascript
// worker/src/infrastructure/cache/KVCacheService.js

class KVCacheService {
  /** @param {KVNamespace} kv */
  constructor(kv) {
    this.kv = kv
  }

  /**
   * @template T
   * @param {string} key
   * @returns {Promise<T|null>}
   */
  async get(key) {
    return this.kv.get(key, 'json')
  }

  /**
   * @param {string} key
   * @param {any} value
   * @param {{ttl?: number}} options
   */
  async set(key, value, { ttl } = {}) {
    const opts = ttl ? { expirationTtl: ttl } : {}
    await this.kv.put(key, JSON.stringify(value), opts)
  }

  /** @param {string} key */
  async delete(key) {
    await this.kv.delete(key)
  }
}

export { KVCacheService }
```

### Cached Repository (Decorator)

```javascript
// worker/src/infrastructure/cache/CachedUserRepository.js

const CACHE_TTL = 300 // 5 min

class CachedUserRepository {
  /**
   * @param {D1UserRepository} repo
   * @param {KVCacheService} cache
   */
  constructor(repo, cache) {
    this.repo = repo
    this.cache = cache
  }

  async findById(userId) {
    const key = `user:${userId.value}`
    
    const cached = await this.cache.get(key)
    if (cached) return User.reconstitute(cached)
    
    const user = await this.repo.findById(userId)
    if (user) await this.cache.set(key, user.toJSON(), { ttl: CACHE_TTL })
    
    return user
  }

  async findByEmail(email) {
    return this.repo.findByEmail(email)
  }

  async save(user) {
    await this.repo.save(user)
    await this.cache.delete(`user:${user.id.value}`)
  }
}

export { CachedUserRepository }
```

### R2 Storage Service

```javascript
// worker/src/infrastructure/storage/R2StorageService.js

class R2StorageService {
  /** @param {R2Bucket} bucket */
  constructor(bucket) {
    this.bucket = bucket
  }

  /**
   * @param {File} file
   * @param {string} directory
   * @returns {Promise<{key: string, size: number}>}
   */
  async upload(file, directory = 'uploads') {
    const key = `${directory}/${crypto.randomUUID()}-${file.name}`
    
    const obj = await this.bucket.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { originalName: file.name }
    })
    
    return { key, size: obj.size }
  }

  /** @param {string} key */
  async get(key) {
    const obj = await this.bucket.get(key)
    if (!obj) return null
    
    return {
      body: obj.body,
      contentType: obj.httpMetadata?.contentType || 'application/octet-stream'
    }
  }

  /** @param {string} key */
  async delete(key) {
    await this.bucket.delete(key)
  }
}

export { R2StorageService }
```

### Event Bus (Messenger)

```javascript
// worker/src/infrastructure/messaging/EventBus.js

class EventBus {
  constructor() {
    /** @type {Map<string, Function[]>} */
    this.handlers = new Map()
  }

  subscribe(eventType, handler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, [])
    }
    this.handlers.get(eventType).push(handler)
  }

  async publish(event) {
    const handlers = this.handlers.get(event.type) || []
    await Promise.all(handlers.map(h => h(event)))
  }
}

export { EventBus }
```

---

## Application Layer

### Command Handler (Commander)

```javascript
// worker/src/application/commands/handlers/CreateUserHandler.js

class CreateUserHandler {
  /**
   * @param {CachedUserRepository} userRepo
   * @param {EventBus} eventBus
   */
  constructor(userRepo, eventBus) {
    this.userRepo = userRepo
    this.eventBus = eventBus
  }

  /**
   * @param {{email: string, username: string}} cmd
   * @returns {Promise<User>}
   */
  async execute(cmd) {
    const email = Email.create(cmd.email)
    
    const existing = await this.userRepo.findByEmail(email)
    if (existing) throw new ValidationError('User exists')
    
    const user = User.create({ email, username: cmd.username })
    await this.userRepo.save(user)
    await this.eventBus.publish(new UserCreatedEvent(user))
    
    return user
  }
}

export { CreateUserHandler }
```

### Query Handler

```javascript
// worker/src/application/queries/handlers/GetUserHandler.js

class GetUserHandler {
  /** @param {CachedUserRepository} userRepo */
  constructor(userRepo) {
    this.userRepo = userRepo
  }

  /** @param {string} userId */
  async execute(userId) {
    const user = await this.userRepo.findById(UserId.fromValue(userId))
    if (!user) throw new NotFoundError('User', userId)
    return user
  }
}

export { GetUserHandler }
```

---

## D1 Patterns

### Batch Queries

```javascript
/**
 * @param {string} userId
 * @param {Env} env
 */
async function getUserDashboard(userId, env) {
  const [user, progress, stats] = await env.DB.batch([
    env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId),
    env.DB.prepare('SELECT * FROM progress WHERE user_id = ? LIMIT 10').bind(userId),
    env.DB.prepare('SELECT COUNT(*) as total FROM progress WHERE user_id = ?').bind(userId)
  ])
  
  return {
    user: user.results[0],
    progress: progress.results,
    stats: stats.results[0]
  }
}
```

### Pagination

```javascript
/**
 * @param {D1Database} db
 * @param {number} page
 * @param {number} pageSize
 */
async function getUsers(db, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize
  
  const [data, count] = await db.batch([
    db.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .bind(pageSize, offset),
    db.prepare('SELECT COUNT(*) as total FROM users')
  ])
  
  return {
    data: data.results,
    pagination: {
      page,
      pageSize,
      total: count.results[0].total,
      totalPages: Math.ceil(count.results[0].total / pageSize)
    }
  }
}
```

---

## KV Patterns

### Session Management

```javascript
const SESSION_TTL = 7 * 24 * 60 * 60 // 7 days

/**
 * @param {KVNamespace} kv
 * @param {string} userId
 * @returns {Promise<string>}
 */
async function createSession(kv, userId) {
  const sessionId = crypto.randomUUID()
  await kv.put(`session:${sessionId}`, JSON.stringify({
    userId,
    exp: Date.now() + SESSION_TTL * 1000
  }), { expirationTtl: SESSION_TTL })
  return sessionId
}

/**
 * @param {KVNamespace} kv
 * @param {string} sessionId
 */
async function validateSession(kv, sessionId) {
  const data = await kv.get(`session:${sessionId}`, 'json')
  if (!data || data.exp < Date.now()) return null
  return data
}
```

### Rate Limiting

```javascript
/**
 * @param {KVNamespace} kv
 * @param {string} ip
 * @param {number} maxRequests
 * @param {number} windowSec
 */
async function checkRateLimit(kv, ip, maxRequests = 100, windowSec = 3600) {
  const key = `ratelimit:${ip}`
  const data = await kv.get(key, 'json')
  
  if (!data || Date.now() > data.resetAt) {
    await kv.put(key, JSON.stringify({
      count: 1,
      resetAt: Date.now() + windowSec * 1000
    }), { expirationTtl: windowSec })
    return { allowed: true, remaining: maxRequests - 1 }
  }
  
  if (data.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: data.resetAt }
  }
  
  await kv.put(key, JSON.stringify({
    count: data.count + 1,
    resetAt: data.resetAt
  }), { expirationTtl: Math.ceil((data.resetAt - Date.now()) / 1000) })
  
  return { allowed: true, remaining: maxRequests - data.count - 1 }
}
```

---

## Hybrid Patterns

### Multi-Tier Cache

```javascript
/**
 * @param {string} lessonId
 * @param {Env} env
 */
async function getLesson(lessonId, env) {
  const cacheKey = `lesson:${lessonId}`
  
  // 1. KV cache
  const cached = await env.CACHE.get(cacheKey, 'json')
  if (cached) return cached
  
  // 2. D1 metadata
  const meta = await env.DB.prepare('SELECT * FROM lessons WHERE id = ?')
    .bind(lessonId).first()
  if (!meta) return null
  
  // 3. R2 content
  const content = await env.UPLOADS.get(`lessons/${lessonId}/content.html`)
  const result = { meta, content: content ? await content.text() : '' }
  
  // 4. Cache
  await env.CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 3600 })
  
  return result
}
```

### Write-Through Cache

```javascript
/**
 * @param {string} userId
 * @param {Object} updates
 * @param {Env} env
 */
async function updateUser(userId, updates, env) {
  // 1. Update D1
  await env.DB.prepare(`
    UPDATE users SET email = COALESCE(?, email), username = COALESCE(?, username)
    WHERE id = ?
  `).bind(updates.email, updates.username, userId).run()
  
  // 2. Invalidate cache
  await env.CACHE.delete(`user:${userId}`)
}
```

---

## Error Classes

```javascript
// worker/src/shared/errors/index.js

class DomainError extends Error {
  constructor(message, statusCode = 500) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
  }
}

class ValidationError extends DomainError {
  constructor(message) { super(message, 400) }
}

class NotFoundError extends DomainError {
  constructor(entity, id) {
    super(`${entity} not found: ${id}`, 404)
  }
}

class UnauthorizedError extends DomainError {
  constructor(message = 'Unauthorized') { super(message, 401) }
}

export { DomainError, ValidationError, NotFoundError, UnauthorizedError }
```

---

## API Response

```javascript
// worker/src/interfaces/http/responses/ApiResponse.js

class ApiResponse {
  static success(data, status = 200) {
    return new Response(JSON.stringify({ data, success: true }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  static error(message, status = 500) {
    return new Response(JSON.stringify({ error: message, success: false }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  static fromError(error) {
    const status = error.statusCode || 500
    return ApiResponse.error(error.message, status)
  }
}

export { ApiResponse }
```

---

## Middleware

### Auth Middleware

```javascript
/**
 * @param {Request} request
 * @param {AuthService} auth
 * @returns {Promise<Response|Object>}
 */
async function authMiddleware(request, auth) {
  const header = request.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) {
    return ApiResponse.error('Missing token', 401)
  }
  
  const token = header.slice(7)
  const payload = await auth.verifyToken(token)
  
  if (!payload) {
    return ApiResponse.error('Invalid token', 401)
  }
  
  return payload // Attach to request.user
}
```

### CORS Middleware

```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

const corsMiddleware = {
  preflight: () => new Response(null, { headers: corsHeaders }),
  wrap: (response) => {
    Object.entries(corsHeaders).forEach(([k, v]) => {
      response.headers.set(k, v)
    })
    return response
  }
}
```

---

## Schema Template

```sql
-- migrations/0001_initial.sql

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  track TEXT NOT NULL,
  difficulty INTEGER DEFAULT 1,
  content_key TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS progress (
  user_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  completed_at DATETIME,
  PRIMARY KEY (user_id, lesson_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lessons_track ON lessons(track);
```

---

## Wrangler Config

```toml
# wrangler.toml

name = "my-worker"
main = "src/index.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "production-db"
database_id = "xxx"

[[kv_namespaces]]
binding = "CACHE"
id = "xxx"

[[r2_buckets]]
binding = "UPLOADS"
bucket_name = "user-uploads"

[vars]
JWT_SECRET = "secret"
```

---

## Decision Matrix

| Data Type | Storage | Cache | Pattern |
|-----------|---------|-------|---------|
| User accounts | D1 | KV (5min) | Cached Repository |
| Sessions | KV | — | TTL auto-expire |
| Files | R2 | KV (metadata) | Multi-tier |
| Config/Flags | KV | — | Direct read |
| Progress/Relations | D1 | KV (current) | Write-through |

---

## Critical Limits

- **D1**: Eventually consistent (60s), batch queries
- **KV**: 1 write/sec/key, 25MB max value
- **Workers**: 10ms CPU (free), 50ms (paid)
- **R2**: No egress fees, S3-compatible

---

## Commands

```bash
# Dev
npx wrangler dev

# D1 migrations
npx wrangler d1 execute DB --local --file=./migrations/0001_initial.sql

# Deploy
npx wrangler deploy
```