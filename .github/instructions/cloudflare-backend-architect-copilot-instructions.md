---
applyTo: "worker/**"
name: cloudflare-backend-architect
description: Deep technical guide for building backends with CloudFlare Workers, D1 (SQL), KV (NoSQL), R2 (storage), and hybrid database strategies. Covers edge computing patterns, data modeling, performance optimization, and cost management for globally-distributed serverless applications.
---
# CloudFlare Backend Architect — Instructions

**Version**: 1.0  
**Focus**: CloudFlare Workers + D1 + KV + R2 + Durable Objects  
**Code Style**: Vanilla JavaScript + JSDoc  
**Architecture**: Clean Code (Commander/Messenger/Scribe) + Domain-Driven Design  

---

## Table of Contents

1. [Core Philosophy](#core-philosophy)
2. [Project Structure](#project-structure)
3. [Clean Code Architecture](#clean-code-architecture)
4. [Domain-Driven Design Patterns](#domain-driven-design-patterns)
5. [CloudFlare Workers Deep Dive](#cloudflare-workers-deep-dive)
6. [D1 — SQL at the Edge](#d1--sql-at-the-edge)
7. [KV — NoSQL Key-Value Store](#kv--nosql-key-value-store)
8. [R2 — Object Storage](#r2--object-storage)
9. [Hybrid Database Strategy](#hybrid-database-strategy)
10. [Advanced Patterns](#advanced-patterns)
11. [Cost Optimization](#cost-optimization)
12. [Testing & Development](#testing--development)

---

## Core Philosophy

### Edge-First Backend Architecture

**Traditional Backend (AWS Lambda, Google Cloud Functions)**:
- Code runs in specific regions (us-east-1, eu-west-1)
- Cold starts: 1-5 seconds
- Latency: 200-500ms for users far from region

**CloudFlare Workers (Edge)**:
- Code runs in 300+ data centers worldwide
- Cold starts: <1ms (V8 isolates, not containers)
- Latency: <50ms globally (code executes near user)

**The Edge Paradigm Shift**: Don't ask "which region?" Ask "how do I design for global execution?"

### V8 Isolates vs Containers

V8 isolates are lightweight JavaScript contexts that share the same process, unlike containers. This means microsecond startup times versus seconds, and memory usage in megabytes versus hundreds of megabytes.

**Constraints to remember**:
- 10ms CPU time (free tier), 50ms (paid)
- 128MB memory limit
- No Node.js built-ins (`fs`, `net`, `child_process`)
- Must use Web Standard APIs

---

## Project Structure

```
worker/
├── src/
│   ├── index.js                 # Entry point (Commander)
│   ├── router.js                # Route definitions
│   │
│   ├── domain/                  # Domain Layer (DDD)
│   │   ├── entities/
│   │   │   ├── User.js
│   │   │   ├── Lesson.js
│   │   │   └── Progress.js
│   │   ├── value-objects/
│   │   │   ├── Email.js
│   │   │   ├── UserId.js
│   │   │   └── LessonId.js
│   │   └── events/
│   │       ├── UserCreated.js
│   │       └── LessonCompleted.js
│   │
│   ├── application/             # Application Layer (Use Cases)
│   │   ├── commands/            # Write operations (Commander)
│   │   │   ├── CreateUserCommand.js
│   │   │   ├── CompleteLessonCommand.js
│   │   │   └── handlers/
│   │   │       ├── CreateUserHandler.js
│   │   │       └── CompleteLessonHandler.js
│   │   ├── queries/             # Read operations
│   │   │   ├── GetUserQuery.js
│   │   │   ├── GetProgressQuery.js
│   │   │   └── handlers/
│   │   │       ├── GetUserHandler.js
│   │   │       └── GetProgressHandler.js
│   │   └── services/            # Application services
│   │       ├── AuthService.js
│   │       └── ProgressService.js
│   │
│   ├── infrastructure/          # Infrastructure Layer
│   │   ├── repositories/        # Data access (Scribe)
│   │   │   ├── D1UserRepository.js
│   │   │   ├── D1LessonRepository.js
│   │   │   └── D1ProgressRepository.js
│   │   ├── cache/               # KV caching layer
│   │   │   ├── KVCacheService.js
│   │   │   └── CachedUserRepository.js
│   │   ├── storage/             # R2 file storage
│   │   │   └── R2StorageService.js
│   │   └── messaging/           # Event dispatching (Messenger)
│   │       ├── EventBus.js
│   │       └── EventDispatcher.js
│   │
│   ├── interfaces/              # Interface Layer (HTTP handlers)
│   │   ├── http/
│   │   │   ├── controllers/
│   │   │   │   ├── UserController.js
│   │   │   │   ├── LessonController.js
│   │   │   │   └── AuthController.js
│   │   │   ├── middleware/
│   │   │   │   ├── authMiddleware.js
│   │   │   │   ├── corsMiddleware.js
│   │   │   │   └── rateLimitMiddleware.js
│   │   │   └── responses/
│   │   │       ├── ApiResponse.js
│   │   │       └── ErrorResponse.js
│   │   └── dtos/
│   │       ├── UserDTO.js
│   │       └── ProgressDTO.js
│   │
│   └── shared/                  # Shared utilities
│       ├── errors/
│       │   ├── DomainError.js
│       │   ├── NotFoundError.js
│       │   └── ValidationError.js
│       └── utils/
│           ├── uuid.js
│           └── date.js
│
├── migrations/                  # D1 migrations
│   ├── 0001_initial_schema.sql
│   └── 0002_add_indexes.sql
│
├── wrangler.toml               # CloudFlare configuration
├── package.json
└── README.md
```

---

## Clean Code Architecture

### Commander, Messenger, Scribe Pattern

This pattern enforces single responsibility and clear separation of concerns.

#### Commander (Orchestration)

The Commander receives requests, coordinates operations, and returns responses. It does NOT contain business logic or data access.

```javascript
// worker/src/application/commands/handlers/CreateUserHandler.js

/**
 * @typedef {import('../../domain/entities/User').User} User
 * @typedef {import('../../infrastructure/repositories/D1UserRepository').D1UserRepository} UserRepository
 * @typedef {import('../../infrastructure/messaging/EventBus').EventBus} EventBus
 */

/**
 * Command handler for creating users (Commander role)
 * Orchestrates the user creation flow without containing business logic
 */
class CreateUserHandler {
  /**
   * @param {UserRepository} userRepository
   * @param {EventBus} eventBus
   */
  constructor(userRepository, eventBus) {
    this.userRepository = userRepository
    this.eventBus = eventBus
  }

  /**
   * Execute the create user command
   * @param {CreateUserCommand} command
   * @returns {Promise<User>}
   */
  async execute(command) {
    // 1. Validate (delegate to domain)
    const email = Email.create(command.email)
    
    // 2. Check existence (delegate to repository)
    const existing = await this.userRepository.findByEmail(email)
    if (existing) {
      throw new ValidationError('User already exists')
    }
    
    // 3. Create entity (domain logic)
    const user = User.create({
      email,
      username: command.username
    })
    
    // 4. Persist (delegate to scribe)
    await this.userRepository.save(user)
    
    // 5. Publish event (delegate to messenger)
    await this.eventBus.publish(new UserCreatedEvent(user))
    
    return user
  }
}

export { CreateUserHandler }
```

#### Messenger (Communication)

The Messenger handles all inter-component communication, event dispatching, and notifications.

```javascript
// worker/src/infrastructure/messaging/EventBus.js

/**
 * @typedef {Object} DomainEvent
 * @property {string} type - Event type identifier
 * @property {Object} payload - Event data
 * @property {string} timestamp - ISO timestamp
 */

/**
 * @typedef {function(DomainEvent): Promise<void>} EventHandler
 */

/**
 * Event bus for domain event dispatching (Messenger role)
 * Handles all inter-component communication
 */
class EventBus {
  constructor() {
    /** @type {Map<string, EventHandler[]>} */
    this.handlers = new Map()
  }

  /**
   * Subscribe to an event type
   * @param {string} eventType
   * @param {EventHandler} handler
   */
  subscribe(eventType, handler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, [])
    }
    this.handlers.get(eventType).push(handler)
  }

  /**
   * Publish an event to all subscribers
   * @param {DomainEvent} event
   * @returns {Promise<void>}
   */
  async publish(event) {
    const handlers = this.handlers.get(event.type) || []
    
    await Promise.all(
      handlers.map(handler => handler(event))
    )
  }
}

export { EventBus }
```

#### Scribe (Data Persistence)

The Scribe handles all data access, storage, and retrieval. It abstracts the underlying storage mechanism.

```javascript
// worker/src/infrastructure/repositories/D1UserRepository.js

/**
 * @typedef {import('../../domain/entities/User').User} User
 * @typedef {import('../../domain/value-objects/Email').Email} Email
 * @typedef {import('../../domain/value-objects/UserId').UserId} UserId
 */

/**
 * @typedef {Object} UserRow
 * @property {number} id
 * @property {string} email
 * @property {string} username
 * @property {string} created_at
 */

/**
 * D1 repository for User entity (Scribe role)
 * Handles all user data persistence
 */
class D1UserRepository {
  /**
   * @param {D1Database} db - D1 database binding
   */
  constructor(db) {
    this.db = db
  }

  /**
   * Find user by ID
   * @param {UserId} userId
   * @returns {Promise<User|null>}
   */
  async findById(userId) {
    const row = await this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId.value)
      .first()

    return row ? this.toDomain(row) : null
  }

  /**
   * Find user by email
   * @param {Email} email
   * @returns {Promise<User|null>}
   */
  async findByEmail(email) {
    const row = await this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email.value)
      .first()

    return row ? this.toDomain(row) : null
  }

  /**
   * Save user to database
   * @param {User} user
   * @returns {Promise<void>}
   */
  async save(user) {
    await this.db
      .prepare(`
        INSERT INTO users (id, email, username, created_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          email = excluded.email,
          username = excluded.username
      `)
      .bind(
        user.id.value,
        user.email.value,
        user.username,
        user.createdAt.toISOString()
      )
      .run()
  }

  /**
   * Map database row to domain entity
   * @private
   * @param {UserRow} row
   * @returns {User}
   */
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

---

## Domain-Driven Design Patterns

### Entities

Entities have identity and lifecycle. They contain business logic and validation.

```javascript
// worker/src/domain/entities/User.js

/**
 * @typedef {import('../value-objects/UserId').UserId} UserId
 * @typedef {import('../value-objects/Email').Email} Email
 */

/**
 * @typedef {Object} UserProps
 * @property {UserId} id
 * @property {Email} email
 * @property {string} username
 * @property {Date} createdAt
 */

/**
 * User entity - represents a user in the domain
 * Contains identity, state, and business logic
 */
class User {
  /**
   * @private
   * @param {UserProps} props
   */
  constructor(props) {
    this.id = props.id
    this.email = props.email
    this.username = props.username
    this.createdAt = props.createdAt
  }

  /**
   * Create a new user (factory method)
   * @param {Object} params
   * @param {Email} params.email
   * @param {string} params.username
   * @returns {User}
   */
  static create({ email, username }) {
    if (!username || username.length < 2) {
      throw new ValidationError('Username must be at least 2 characters')
    }

    return new User({
      id: UserId.generate(),
      email,
      username,
      createdAt: new Date()
    })
  }

  /**
   * Reconstitute user from persistence
   * @param {UserProps} props
   * @returns {User}
   */
  static reconstitute(props) {
    return new User(props)
  }

  /**
   * Update email address
   * @param {Email} newEmail
   * @returns {User}
   */
  updateEmail(newEmail) {
    return new User({
      ...this,
      email: newEmail
    })
  }

  /**
   * Convert to plain object for serialization
   * @returns {Object}
   */
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

### Value Objects

Value objects are immutable and compared by value, not identity.

```javascript
// worker/src/domain/value-objects/Email.js

/**
 * Email value object
 * Immutable, validated email address
 */
class Email {
  /**
   * @private
   * @param {string} value
   */
  constructor(value) {
    this.value = value
    Object.freeze(this)
  }

  /**
   * Create and validate email
   * @param {string} value
   * @returns {Email}
   * @throws {ValidationError}
   */
  static create(value) {
    const normalized = value.toLowerCase().trim()
    
    if (!Email.isValid(normalized)) {
      throw new ValidationError(`Invalid email: ${value}`)
    }

    return new Email(normalized)
  }

  /**
   * Validate email format
   * @param {string} value
   * @returns {boolean}
   */
  static isValid(value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }

  /**
   * Check equality with another email
   * @param {Email} other
   * @returns {boolean}
   */
  equals(other) {
    return other instanceof Email && this.value === other.value
  }

  /**
   * @returns {string}
   */
  toString() {
    return this.value
  }
}

export { Email }
```

```javascript
// worker/src/domain/value-objects/UserId.js

/**
 * UserId value object
 * Unique identifier for users
 */
class UserId {
  /**
   * @private
   * @param {string} value
   */
  constructor(value) {
    this.value = value
    Object.freeze(this)
  }

  /**
   * Generate new UserId
   * @returns {UserId}
   */
  static generate() {
    return new UserId(crypto.randomUUID())
  }

  /**
   * Create from existing value
   * @param {string|number} value
   * @returns {UserId}
   */
  static fromValue(value) {
    return new UserId(String(value))
  }

  /**
   * Check equality
   * @param {UserId} other
   * @returns {boolean}
   */
  equals(other) {
    return other instanceof UserId && this.value === other.value
  }

  /**
   * @returns {string}
   */
  toString() {
    return this.value
  }
}

export { UserId }
```

### Domain Events

Events represent something that happened in the domain.

```javascript
// worker/src/domain/events/UserCreated.js

/**
 * @typedef {import('../entities/User').User} User
 */

/**
 * Domain event: User was created
 */
class UserCreatedEvent {
  /** @type {string} */
  type = 'user.created'

  /**
   * @param {User} user
   */
  constructor(user) {
    this.payload = {
      userId: user.id.value,
      email: user.email.value,
      username: user.username
    }
    this.timestamp = new Date().toISOString()
    Object.freeze(this)
  }
}

export { UserCreatedEvent }
```

### Repository Interface

Define contracts for data access.

```javascript
// worker/src/domain/repositories/IUserRepository.js

/**
 * @typedef {import('../entities/User').User} User
 * @typedef {import('../value-objects/Email').Email} Email
 * @typedef {import('../value-objects/UserId').UserId} UserId
 */

/**
 * @interface IUserRepository
 * Repository contract for User entity
 */

/**
 * @function findById
 * @param {UserId} id
 * @returns {Promise<User|null>}
 */

/**
 * @function findByEmail
 * @param {Email} email
 * @returns {Promise<User|null>}
 */

/**
 * @function save
 * @param {User} user
 * @returns {Promise<void>}
 */

/**
 * @function delete
 * @param {UserId} id
 * @returns {Promise<void>}
 */
```

---

## CloudFlare Workers Deep Dive

### Entry Point Setup

```javascript
// worker/src/index.js

/**
 * @typedef {Object} Env
 * @property {D1Database} DB - D1 database binding
 * @property {KVNamespace} CACHE - KV namespace binding
 * @property {R2Bucket} UPLOADS - R2 bucket binding
 * @property {string} JWT_SECRET - JWT signing secret
 */

import { Router } from './router.js'
import { createContainer } from './container.js'

export default {
  /**
   * Main fetch handler
   * @param {Request} request
   * @param {Env} env
   * @param {ExecutionContext} ctx
   * @returns {Promise<Response>}
   */
  async fetch(request, env, ctx) {
    // Create dependency injection container
    const container = createContainer(env)
    
    // Create router with container
    const router = new Router(container)
    
    try {
      return await router.handle(request)
    } catch (error) {
      console.error('Unhandled error:', error)
      return new Response(
        JSON.stringify({ error: 'Internal Server Error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
}
```

### Dependency Injection Container

```javascript
// worker/src/container.js

/**
 * @typedef {import('./index').Env} Env
 */

import { D1UserRepository } from './infrastructure/repositories/D1UserRepository.js'
import { D1LessonRepository } from './infrastructure/repositories/D1LessonRepository.js'
import { KVCacheService } from './infrastructure/cache/KVCacheService.js'
import { CachedUserRepository } from './infrastructure/cache/CachedUserRepository.js'
import { R2StorageService } from './infrastructure/storage/R2StorageService.js'
import { EventBus } from './infrastructure/messaging/EventBus.js'
import { AuthService } from './application/services/AuthService.js'
import { CreateUserHandler } from './application/commands/handlers/CreateUserHandler.js'
import { GetUserHandler } from './application/queries/handlers/GetUserHandler.js'

/**
 * Create dependency injection container
 * @param {Env} env
 * @returns {Object}
 */
function createContainer(env) {
  // Infrastructure
  const eventBus = new EventBus()
  const cacheService = new KVCacheService(env.CACHE)
  const storageService = new R2StorageService(env.UPLOADS)
  
  // Repositories
  const userRepository = new D1UserRepository(env.DB)
  const cachedUserRepository = new CachedUserRepository(userRepository, cacheService)
  const lessonRepository = new D1LessonRepository(env.DB)
  
  // Services
  const authService = new AuthService(env.JWT_SECRET, cachedUserRepository)
  
  // Command handlers
  const createUserHandler = new CreateUserHandler(cachedUserRepository, eventBus)
  
  // Query handlers
  const getUserHandler = new GetUserHandler(cachedUserRepository)
  
  return {
    // Infrastructure
    eventBus,
    cacheService,
    storageService,
    
    // Repositories
    userRepository: cachedUserRepository,
    lessonRepository,
    
    // Services
    authService,
    
    // Handlers
    commands: {
      createUser: createUserHandler
    },
    queries: {
      getUser: getUserHandler
    }
  }
}

export { createContainer }
```

### Router Implementation

```javascript
// worker/src/router.js

import { UserController } from './interfaces/http/controllers/UserController.js'
import { AuthController } from './interfaces/http/controllers/AuthController.js'
import { authMiddleware } from './interfaces/http/middleware/authMiddleware.js'
import { corsMiddleware } from './interfaces/http/middleware/corsMiddleware.js'

/**
 * @typedef {Object} Route
 * @property {string} method - HTTP method
 * @property {RegExp} pattern - URL pattern
 * @property {function} handler - Route handler
 * @property {boolean} [auth] - Requires authentication
 */

/**
 * Router for handling HTTP requests
 */
class Router {
  /**
   * @param {Object} container - DI container
   */
  constructor(container) {
    this.container = container
    this.userController = new UserController(container)
    this.authController = new AuthController(container)
    
    /** @type {Route[]} */
    this.routes = [
      // Auth routes (public)
      { method: 'POST', pattern: /^\/api\/auth\/register$/, handler: this.authController.register.bind(this.authController) },
      { method: 'POST', pattern: /^\/api\/auth\/login$/, handler: this.authController.login.bind(this.authController) },
      
      // User routes (protected)
      { method: 'GET', pattern: /^\/api\/users\/me$/, handler: this.userController.getCurrentUser.bind(this.userController), auth: true },
      { method: 'GET', pattern: /^\/api\/users\/([^/]+)$/, handler: this.userController.getUser.bind(this.userController), auth: true },
      { method: 'PUT', pattern: /^\/api\/users\/([^/]+)$/, handler: this.userController.updateUser.bind(this.userController), auth: true }
    ]
  }

  /**
   * Handle incoming request
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async handle(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return corsMiddleware.preflight()
    }

    const url = new URL(request.url)
    const method = request.method

    // Find matching route
    for (const route of this.routes) {
      if (route.method !== method) continue
      
      const match = url.pathname.match(route.pattern)
      if (!match) continue

      // Extract params from regex groups
      const params = match.slice(1)

      // Check authentication
      if (route.auth) {
        const authResult = await authMiddleware(request, this.container.authService)
        if (authResult instanceof Response) {
          return corsMiddleware.wrap(authResult)
        }
        request.user = authResult
      }

      // Execute handler
      const response = await route.handler(request, ...params)
      return corsMiddleware.wrap(response)
    }

    return corsMiddleware.wrap(
      new Response(JSON.stringify({ error: 'Not Found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    )
  }
}

export { Router }
```

### Environment Bindings Configuration

```toml
# wrangler.toml

name = "my-worker"
main = "src/index.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "production-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

[[kv_namespaces]]
binding = "CACHE"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

[[r2_buckets]]
binding = "UPLOADS"
bucket_name = "user-uploads"

[vars]
JWT_SECRET = "your-secret-here"

# Development overrides
[env.dev]
name = "my-worker-dev"

[[env.dev.d1_databases]]
binding = "DB"
database_name = "dev-db"
database_id = "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
```

---

## D1 — SQL at the Edge

### Architecture Overview

D1 is built on SQLite with global distribution. There's a primary instance as the single source of truth (handles writes), and read replicas are automatically created near high-traffic regions. Consistency is eventual, with replicas syncing within 60 seconds.

### When to Use D1

**Good for**: User accounts, profiles, authentication, content management (posts, products, lessons), structured data with relationships (JOINs), read-heavy workloads (10:1 read/write ratio), per-user/per-tenant databases

**Bad for**: Write-heavy workloads (>100k writes/day per DB), single large databases (>10GB), real-time data requiring strong consistency, analytics/time-series data

### Schema Design

```sql
-- migrations/0001_initial_schema.sql

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  track TEXT NOT NULL,
  difficulty INTEGER DEFAULT 1,
  content_key TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Progress table (user-lesson relationship)
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

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson ON progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lessons_track ON lessons(track);
```

### Repository Implementation

```javascript
// worker/src/infrastructure/repositories/D1ProgressRepository.js

/**
 * @typedef {Object} ProgressRow
 * @property {string} user_id
 * @property {string} lesson_id
 * @property {number} completed
 * @property {number} score
 * @property {string|null} completed_at
 */

/**
 * @typedef {Object} ProgressWithLesson
 * @property {string} lessonId
 * @property {string} title
 * @property {number} score
 * @property {string|null} completedAt
 */

/**
 * D1 repository for Progress entity
 */
class D1ProgressRepository {
  /**
   * @param {D1Database} db
   */
  constructor(db) {
    this.db = db
  }

  /**
   * Get all progress for a user
   * @param {string} userId
   * @returns {Promise<ProgressWithLesson[]>}
   */
  async findByUserId(userId) {
    const result = await this.db
      .prepare(`
        SELECT 
          p.lesson_id,
          p.score,
          p.completed_at,
          l.title
        FROM progress p
        JOIN lessons l ON p.lesson_id = l.id
        WHERE p.user_id = ? AND p.completed = 1
        ORDER BY p.completed_at DESC
      `)
      .bind(userId)
      .all()

    return result.results.map(row => ({
      lessonId: row.lesson_id,
      title: row.title,
      score: row.score,
      completedAt: row.completed_at
    }))
  }

  /**
   * Check if lesson is completed
   * @param {string} userId
   * @param {string} lessonId
   * @returns {Promise<boolean>}
   */
  async isCompleted(userId, lessonId) {
    const row = await this.db
      .prepare('SELECT completed FROM progress WHERE user_id = ? AND lesson_id = ?')
      .bind(userId, lessonId)
      .first()

    return row?.completed === 1
  }

  /**
   * Mark lesson as completed
   * @param {string} userId
   * @param {string} lessonId
   * @param {number} score
   * @returns {Promise<void>}
   */
  async markCompleted(userId, lessonId, score) {
    await this.db
      .prepare(`
        INSERT INTO progress (user_id, lesson_id, completed, score, completed_at)
        VALUES (?, ?, 1, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, lesson_id) DO UPDATE SET
          completed = 1,
          score = excluded.score,
          completed_at = CURRENT_TIMESTAMP
      `)
      .bind(userId, lessonId, score)
      .run()
  }

  /**
   * Get completion statistics for a user
   * @param {string} userId
   * @returns {Promise<{total: number, completed: number, averageScore: number}>}
   */
  async getStats(userId) {
    const result = await this.db
      .prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed,
          AVG(CASE WHEN completed = 1 THEN score ELSE NULL END) as avg_score
        FROM progress
        WHERE user_id = ?
      `)
      .bind(userId)
      .first()

    return {
      total: result.total || 0,
      completed: result.completed || 0,
      averageScore: result.avg_score || 0
    }
  }
}

export { D1ProgressRepository }
```

### Batch Queries

```javascript
/**
 * Fetch multiple related datasets in single round-trip
 * @param {string} userId
 * @param {Env} env
 * @returns {Promise<{user: Object, progress: Object[], stats: Object}>}
 */
async function getUserDashboard(userId, env) {
  const [userResult, progressResult, statsResult] = await env.DB.batch([
    env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId),
    env.DB.prepare(`
      SELECT p.*, l.title FROM progress p
      JOIN lessons l ON p.lesson_id = l.id
      WHERE p.user_id = ? AND p.completed = 1
      ORDER BY p.completed_at DESC
      LIMIT 10
    `).bind(userId),
    env.DB.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed
      FROM progress WHERE user_id = ?
    `).bind(userId)
  ])

  return {
    user: userResult.results[0],
    progress: progressResult.results,
    stats: statsResult.results[0]
  }
}
```

### Pagination Pattern

```javascript
/**
 * Paginated query helper
 * @param {D1Database} db
 * @param {string} query - SQL query with LIMIT ? OFFSET ?
 * @param {any[]} params - Query parameters (before pagination)
 * @param {number} page - Page number (1-indexed)
 * @param {number} pageSize - Items per page
 * @returns {Promise<{data: any[], pagination: Object}>}
 */
async function paginate(db, query, params, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize
  
  // Get total count
  const countQuery = query.replace(/SELECT .* FROM/, 'SELECT COUNT(*) as count FROM')
                          .replace(/ORDER BY.*$/, '')
                          .replace(/LIMIT.*$/, '')
  
  const [dataResult, countResult] = await db.batch([
    db.prepare(query).bind(...params, pageSize, offset),
    db.prepare(countQuery).bind(...params)
  ])

  const total = countResult.results[0]?.count || 0
  const totalPages = Math.ceil(total / pageSize)

  return {
    data: dataResult.results,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }
}
```

---

## KV — NoSQL Key-Value Store

### Characteristics

KV is eventually consistent, with writes propagating globally in under 60 seconds. Reads are ultra-fast (500µs - 10ms for hot keys). There's a write limit of 1 write/second per unique key. Frequently accessed keys are cached at the edge, with cache hits under 1ms.

### When to Use KV

**Good for**: Session storage (auth tokens, user sessions), configuration data (feature flags, API keys), caching API responses, rate limiting counters, redirect mappings

**Bad for**: Frequently updated data (>1 write/sec/key), data requiring transactions, large values (>25MB limit, but <1MB recommended), strong consistency requirements

### Cache Service Implementation

```javascript
// worker/src/infrastructure/cache/KVCacheService.js

/**
 * @typedef {Object} CacheOptions
 * @property {number} [ttl] - Time to live in seconds
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * KV-based cache service
 */
class KVCacheService {
  /**
   * @param {KVNamespace} kv
   */
  constructor(kv) {
    this.kv = kv
  }

  /**
   * Get value from cache
   * @template T
   * @param {string} key
   * @returns {Promise<T|null>}
   */
  async get(key) {
    const value = await this.kv.get(key, 'json')
    return value
  }

  /**
   * Get value with metadata
   * @template T
   * @param {string} key
   * @returns {Promise<{value: T|null, metadata: Object|null}>}
   */
  async getWithMetadata(key) {
    const result = await this.kv.getWithMetadata(key, 'json')
    return {
      value: result.value,
      metadata: result.metadata
    }
  }

  /**
   * Set value in cache
   * @template T
   * @param {string} key
   * @param {T} value
   * @param {CacheOptions} [options]
   * @returns {Promise<void>}
   */
  async set(key, value, options = {}) {
    const kvOptions = {}
    
    if (options.ttl) {
      kvOptions.expirationTtl = options.ttl
    }
    
    if (options.metadata) {
      kvOptions.metadata = options.metadata
    }

    await this.kv.put(key, JSON.stringify(value), kvOptions)
  }

  /**
   * Delete value from cache
   * @param {string} key
   * @returns {Promise<void>}
   */
  async delete(key) {
    await this.kv.delete(key)
  }

  /**
   * Delete multiple keys by prefix
   * @param {string} prefix
   * @returns {Promise<number>} Number of deleted keys
   */
  async deleteByPrefix(prefix) {
    const list = await this.kv.list({ prefix })
    
    await Promise.all(
      list.keys.map(key => this.kv.delete(key.name))
    )
    
    return list.keys.length
  }
}

export { KVCacheService }
```

### Cached Repository Pattern

```javascript
// worker/src/infrastructure/cache/CachedUserRepository.js

/**
 * @typedef {import('../../domain/entities/User').User} User
 * @typedef {import('../repositories/D1UserRepository').D1UserRepository} D1UserRepository
 * @typedef {import('./KVCacheService').KVCacheService} KVCacheService
 */

const CACHE_TTL = 300 // 5 minutes

/**
 * Cached user repository (decorator pattern)
 * Wraps D1 repository with KV caching layer
 */
class CachedUserRepository {
  /**
   * @param {D1UserRepository} repository
   * @param {KVCacheService} cache
   */
  constructor(repository, cache) {
    this.repository = repository
    this.cache = cache
  }

  /**
   * Get cache key for user
   * @private
   * @param {string} id
   * @returns {string}
   */
  getCacheKey(id) {
    return `user:${id}`
  }

  /**
   * Find user by ID with caching
   * @param {UserId} userId
   * @returns {Promise<User|null>}
   */
  async findById(userId) {
    const cacheKey = this.getCacheKey(userId.value)
    
    // 1. Check cache
    const cached = await this.cache.get(cacheKey)
    if (cached) {
      return User.reconstitute(cached)
    }
    
    // 2. Query D1
    const user = await this.repository.findById(userId)
    if (!user) return null
    
    // 3. Cache result
    await this.cache.set(cacheKey, user.toJSON(), { ttl: CACHE_TTL })
    
    return user
  }

  /**
   * Find user by email
   * @param {Email} email
   * @returns {Promise<User|null>}
   */
  async findByEmail(email) {
    // Email lookups bypass cache (less frequent)
    return this.repository.findByEmail(email)
  }

  /**
   * Save user and invalidate cache
   * @param {User} user
   * @returns {Promise<void>}
   */
  async save(user) {
    // 1. Save to D1
    await this.repository.save(user)
    
    // 2. Invalidate cache
    await this.cache.delete(this.getCacheKey(user.id.value))
  }

  /**
   * Delete user and invalidate cache
   * @param {UserId} userId
   * @returns {Promise<void>}
   */
  async delete(userId) {
    await this.repository.delete(userId)
    await this.cache.delete(this.getCacheKey(userId.value))
  }
}

export { CachedUserRepository }
```

### Session Management

```javascript
// worker/src/infrastructure/cache/SessionManager.js

const SESSION_TTL = 7 * 24 * 60 * 60 // 7 days

/**
 * @typedef {Object} SessionData
 * @property {string} userId
 * @property {string} email
 * @property {number} exp - Expiration timestamp
 */

/**
 * Session manager using KV
 */
class SessionManager {
  /**
   * @param {KVNamespace} kv
   */
  constructor(kv) {
    this.kv = kv
  }

  /**
   * Create new session
   * @param {string} userId
   * @param {string} email
   * @returns {Promise<string>} Session ID
   */
  async create(userId, email) {
    const sessionId = crypto.randomUUID()
    
    /** @type {SessionData} */
    const sessionData = {
      userId,
      email,
      exp: Date.now() + SESSION_TTL * 1000
    }

    await this.kv.put(
      `session:${sessionId}`,
      JSON.stringify(sessionData),
      { expirationTtl: SESSION_TTL }
    )

    return sessionId
  }

  /**
   * Validate and get session
   * @param {string} sessionId
   * @returns {Promise<SessionData|null>}
   */
  async validate(sessionId) {
    const data = await this.kv.get(`session:${sessionId}`, 'json')
    
    if (!data) return null
    if (data.exp < Date.now()) {
      await this.destroy(sessionId)
      return null
    }
    
    return data
  }

  /**
   * Destroy session
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  async destroy(sessionId) {
    await this.kv.delete(`session:${sessionId}`)
  }

  /**
   * Destroy all sessions for user
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async destroyAllForUser(userId) {
    // Note: This requires listing keys, which has limits
    // For production, consider storing session IDs in D1
    const list = await this.kv.list({ prefix: 'session:' })
    
    for (const key of list.keys) {
      const session = await this.kv.get(key.name, 'json')
      if (session?.userId === userId) {
        await this.kv.delete(key.name)
      }
    }
  }
}

export { SessionManager }
```

### Rate Limiting

```javascript
// worker/src/interfaces/http/middleware/rateLimitMiddleware.js

/**
 * @typedef {Object} RateLimitConfig
 * @property {number} maxRequests - Maximum requests allowed
 * @property {number} windowSeconds - Time window in seconds
 */

/**
 * Rate limiter using KV
 */
class RateLimiter {
  /**
   * @param {KVNamespace} kv
   * @param {RateLimitConfig} config
   */
  constructor(kv, config) {
    this.kv = kv
    this.maxRequests = config.maxRequests
    this.windowSeconds = config.windowSeconds
  }

  /**
   * Check if request is allowed
   * @param {string} identifier - IP address or user ID
   * @returns {Promise<{allowed: boolean, remaining: number, resetAt: number}>}
   */
  async check(identifier) {
    const key = `ratelimit:${identifier}`
    const now = Date.now()
    
    const data = await this.kv.get(key, 'json')
    
    if (!data) {
      // First request in window
      await this.kv.put(key, JSON.stringify({
        count: 1,
        resetAt: now + this.windowSeconds * 1000
      }), { expirationTtl: this.windowSeconds })
      
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt: now + this.windowSeconds * 1000
      }
    }
    
    if (now > data.resetAt) {
      // Window expired, reset
      await this.kv.put(key, JSON.stringify({
        count: 1,
        resetAt: now + this.windowSeconds * 1000
      }), { expirationTtl: this.windowSeconds })
      
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt: now + this.windowSeconds * 1000
      }
    }
    
    if (data.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: data.resetAt
      }
    }
    
    // Increment counter
    await this.kv.put(key, JSON.stringify({
      count: data.count + 1,
      resetAt: data.resetAt
    }), { expirationTtl: Math.ceil((data.resetAt - now) / 1000) })
    
    return {
      allowed: true,
      remaining: this.maxRequests - data.count - 1,
      resetAt: data.resetAt
    }
  }
}

/**
 * Rate limit middleware factory
 * @param {KVNamespace} kv
 * @param {RateLimitConfig} config
 * @returns {function(Request): Promise<Response|null>}
 */
function createRateLimitMiddleware(kv, config) {
  const limiter = new RateLimiter(kv, config)
  
  return async (request) => {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
    const result = await limiter.check(ip)
    
    if (!result.allowed) {
      return new Response(JSON.stringify({
        error: 'Too Many Requests',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetAt),
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000))
        }
      })
    }
    
    return null // Continue to handler
  }
}

export { RateLimiter, createRateLimitMiddleware }
```

---

## R2 — Object Storage

### Use Cases

R2 is ideal for user-uploaded files (avatars, documents), static assets (images, videos, PDFs), database backups, and large content (lesson materials, course videos).

### Benefits Over S3

R2 has no egress fees (free data transfer out), global distribution (cached at edge), and an S3-compatible API for easy migration.

### Storage Service Implementation

```javascript
// worker/src/infrastructure/storage/R2StorageService.js

/**
 * @typedef {Object} UploadResult
 * @property {string} key - Storage key
 * @property {string} url - Public URL
 * @property {number} size - File size in bytes
 */

/**
 * @typedef {Object} FileMetadata
 * @property {string} contentType
 * @property {string} uploadedBy
 * @property {string} originalName
 * @property {string} uploadedAt
 */

/**
 * R2 storage service
 */
class R2StorageService {
  /**
   * @param {R2Bucket} bucket
   * @param {string} [publicUrl] - Public URL prefix
   */
  constructor(bucket, publicUrl = '') {
    this.bucket = bucket
    this.publicUrl = publicUrl
  }

  /**
   * Upload file
   * @param {ReadableStream|ArrayBuffer|string} data
   * @param {string} key
   * @param {Object} options
   * @param {string} options.contentType
   * @param {string} [options.uploadedBy]
   * @param {string} [options.originalName]
   * @returns {Promise<UploadResult>}
   */
  async upload(data, key, options) {
    /** @type {FileMetadata} */
    const metadata = {
      contentType: options.contentType,
      uploadedBy: options.uploadedBy || 'unknown',
      originalName: options.originalName || key,
      uploadedAt: new Date().toISOString()
    }

    const object = await this.bucket.put(key, data, {
      httpMetadata: {
        contentType: options.contentType
      },
      customMetadata: metadata
    })

    return {
      key,
      url: `${this.publicUrl}/${key}`,
      size: object.size
    }
  }

  /**
   * Upload from form data
   * @param {File} file
   * @param {string} [directory]
   * @param {string} [uploadedBy]
   * @returns {Promise<UploadResult>}
   */
  async uploadFile(file, directory = 'uploads', uploadedBy) {
    const key = `${directory}/${crypto.randomUUID()}-${file.name}`
    
    return this.upload(file.stream(), key, {
      contentType: file.type,
      uploadedBy,
      originalName: file.name
    })
  }

  /**
   * Get file
   * @param {string} key
   * @returns {Promise<{body: ReadableStream, metadata: FileMetadata}|null>}
   */
  async get(key) {
    const object = await this.bucket.get(key)
    
    if (!object) return null

    return {
      body: object.body,
      metadata: {
        contentType: object.httpMetadata?.contentType || 'application/octet-stream',
        ...object.customMetadata
      }
    }
  }

  /**
   * Delete file
   * @param {string} key
   * @returns {Promise<void>}
   */
  async delete(key) {
    await this.bucket.delete(key)
  }

  /**
   * List files with prefix
   * @param {string} prefix
   * @param {number} [limit]
   * @returns {Promise<{key: string, size: number, uploaded: Date}[]>}
   */
  async list(prefix, limit = 100) {
    const listed = await this.bucket.list({ prefix, limit })
    
    return listed.objects.map(obj => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded
    }))
  }

  /**
   * Create presigned URL for direct upload
   * Note: Requires Workers Pro plan
   * @param {string} key
   * @param {number} expiresIn - Seconds until expiration
   * @returns {Promise<string>}
   */
  async createUploadUrl(key, expiresIn = 3600) {
    // Implementation depends on your setup
    // May require separate signing service
    throw new Error('Not implemented')
  }
}

export { R2StorageService }
```

### File Upload Controller

```javascript
// worker/src/interfaces/http/controllers/UploadController.js

/**
 * Controller for file uploads
 */
class UploadController {
  /**
   * @param {Object} container
   */
  constructor(container) {
    this.storageService = container.storageService
    this.cacheService = container.cacheService
  }

  /**
   * Handle file upload
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async upload(request) {
    try {
      const formData = await request.formData()
      const file = formData.get('file')
      
      if (!file || !(file instanceof File)) {
        return new Response(JSON.stringify({ error: 'No file provided' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        return new Response(JSON.stringify({ error: 'Invalid file type' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: 'File too large' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      const result = await this.storageService.uploadFile(
        file,
        'uploads',
        request.user?.id
      )

      return new Response(JSON.stringify(result), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('Upload error:', error)
      return new Response(JSON.stringify({ error: 'Upload failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  /**
   * Serve file with caching
   * @param {Request} request
   * @param {string} key
   * @returns {Promise<Response>}
   */
  async serve(request, key) {
    const file = await this.storageService.get(key)
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(file.body, {
      headers: {
        'Content-Type': file.metadata.contentType,
        'Cache-Control': 'public, max-age=31536000',
        'ETag': `"${key}"`
      }
    })
  }
}

export { UploadController }
```

---

## Hybrid Database Strategy

### Decision Framework

| Data Type | Primary Storage | Cache Layer | Why |
|-----------|-----------------|-------------|-----|
| User accounts | D1 | KV (session) | Structured, relational |
| User progress | D1 | KV (current state) | Queryable, needs JOIN |
| Auth tokens | KV | — | Fast access, TTL support |
| Content (HTML/Markdown) | R2 | KV (metadata in D1) | Large, static |
| Configuration | KV | — | Read-heavy, global |
| Analytics | Analytics Engine | — | Time-series, aggregations |

### Multi-Tier Content Fetching

```javascript
/**
 * Get lesson with multi-tier caching
 * @param {string} lessonId
 * @param {Env} env
 * @returns {Promise<{metadata: Object, content: string}>}
 */
async function getLessonWithContent(lessonId, env) {
  const cacheService = new KVCacheService(env.CACHE)
  const cacheKey = `lesson:full:${lessonId}`
  
  // 1. Try KV cache (fastest)
  const cached = await cacheService.get(cacheKey)
  if (cached) {
    return cached
  }
  
  // 2. Get metadata from D1
  const metadata = await env.DB
    .prepare('SELECT * FROM lessons WHERE id = ?')
    .bind(lessonId)
    .first()
  
  if (!metadata) {
    return null
  }
  
  // 3. Fetch content from R2
  const contentObject = await env.UPLOADS.get(`lessons/${lessonId}/content.html`)
  const content = contentObject ? await contentObject.text() : ''
  
  const result = { metadata, content }
  
  // 4. Cache combined result (1 hour TTL)
  await cacheService.set(cacheKey, result, { ttl: 3600 })
  
  return result
}
```

### Write-Through Cache Pattern

```javascript
/**
 * Update user with cache invalidation
 * @param {string} userId
 * @param {Object} updates
 * @param {Env} env
 * @returns {Promise<void>}
 */
async function updateUser(userId, updates, env) {
  // 1. Update D1 (source of truth)
  await env.DB
    .prepare(`
      UPDATE users 
      SET email = COALESCE(?, email),
          username = COALESCE(?, username),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .bind(updates.email, updates.username, userId)
    .run()
  
  // 2. Invalidate KV cache
  await env.CACHE.delete(`user:${userId}`)
  
  // Next read will fetch fresh data from D1 and re-cache
}
```

### Optimistic UI Pattern

```javascript
/**
 * Like post with optimistic update
 * @param {string} postId
 * @param {string} userId
 * @param {Env} env
 * @returns {Promise<{success: boolean, likes: number}>}
 */
async function likePost(postId, userId, env) {
  const likesKey = `post:${postId}:likes`
  
  // 1. Optimistically update KV (instant feedback)
  const currentLikes = await env.CACHE.get(likesKey, 'text')
  const newLikes = (parseInt(currentLikes) || 0) + 1
  await env.CACHE.put(likesKey, String(newLikes))
  
  // 2. Persist to D1 (eventual consistency OK for likes)
  try {
    await env.DB
      .prepare(`
        INSERT INTO likes (post_id, user_id, created_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `)
      .bind(postId, userId)
      .run()
    
    return { success: true, likes: newLikes }
  } catch (error) {
    // Rollback KV on D1 failure
    await env.CACHE.put(likesKey, String(newLikes - 1))
    throw error
  }
}
```

---

## Advanced Patterns

### Authentication Service

```javascript
// worker/src/application/services/AuthService.js

/**
 * @typedef {Object} TokenPayload
 * @property {string} sub - User ID
 * @property {string} email
 * @property {number} iat - Issued at
 * @property {number} exp - Expiration
 */

/**
 * Authentication service
 */
class AuthService {
  /**
   * @param {string} secret - JWT secret
   * @param {CachedUserRepository} userRepository
   */
  constructor(secret, userRepository) {
    this.secret = secret
    this.userRepository = userRepository
    this.encoder = new TextEncoder()
  }

  /**
   * Generate JWT token
   * @param {User} user
   * @returns {Promise<string>}
   */
  async generateToken(user) {
    const header = { alg: 'HS256', typ: 'JWT' }
    
    /** @type {TokenPayload} */
    const payload = {
      sub: user.id.value,
      email: user.email.value,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    }

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header))
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload))
    
    const signature = await this.sign(`${encodedHeader}.${encodedPayload}`)
    
    return `${encodedHeader}.${encodedPayload}.${signature}`
  }

  /**
   * Verify JWT token
   * @param {string} token
   * @returns {Promise<TokenPayload|null>}
   */
  async verifyToken(token) {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) return null

      const [encodedHeader, encodedPayload, signature] = parts
      
      // Verify signature
      const expectedSignature = await this.sign(`${encodedHeader}.${encodedPayload}`)
      if (signature !== expectedSignature) return null

      // Decode payload
      const payload = JSON.parse(this.base64UrlDecode(encodedPayload))
      
      // Check expiration
      if (payload.exp < Math.floor(Date.now() / 1000)) return null

      return payload
    } catch {
      return null
    }
  }

  /**
   * Hash password using Web Crypto
   * @param {string} password
   * @returns {Promise<string>}
   */
  async hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      this.encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    )
    
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    )
    
    const hashArray = new Uint8Array(derivedBits)
    const combined = new Uint8Array(salt.length + hashArray.length)
    combined.set(salt)
    combined.set(hashArray, salt.length)
    
    return this.arrayBufferToBase64(combined)
  }

  /**
   * Verify password
   * @param {string} password
   * @param {string} hash
   * @returns {Promise<boolean>}
   */
  async verifyPassword(password, hash) {
    const combined = this.base64ToArrayBuffer(hash)
    const salt = combined.slice(0, 16)
    const storedHash = combined.slice(16)
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      this.encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    )
    
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    )
    
    const derivedArray = new Uint8Array(derivedBits)
    
    return this.timingSafeEqual(derivedArray, storedHash)
  }

  /**
   * @private
   */
  async sign(data) {
    const key = await crypto.subtle.importKey(
      'raw',
      this.encoder.encode(this.secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signature = await crypto.subtle.sign('HMAC', key, this.encoder.encode(data))
    return this.base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)))
  }

  /**
   * @private
   */
  base64UrlEncode(str) {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  /**
   * @private
   */
  base64UrlDecode(str) {
    const padded = str + '==='.slice(0, (4 - str.length % 4) % 4)
    return atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  }

  /**
   * @private
   */
  arrayBufferToBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
  }

  /**
   * @private
   */
  base64ToArrayBuffer(base64) {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  /**
   * @private
   */
  timingSafeEqual(a, b) {
    if (a.length !== b.length) return false
    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i]
    }
    return result === 0
  }
}

export { AuthService }
```

### Error Handling

```javascript
// worker/src/shared/errors/DomainError.js

/**
 * Base domain error
 */
class DomainError extends Error {
  /**
   * @param {string} message
   * @param {number} [statusCode]
   */
  constructor(message, statusCode = 500) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
  }
}

/**
 * Validation error (400)
 */
class ValidationError extends DomainError {
  constructor(message) {
    super(message, 400)
  }
}

/**
 * Not found error (404)
 */
class NotFoundError extends DomainError {
  constructor(entity, id) {
    super(`${entity} not found: ${id}`, 404)
    this.entity = entity
    this.entityId = id
  }
}

/**
 * Unauthorized error (401)
 */
class UnauthorizedError extends DomainError {
  constructor(message = 'Unauthorized') {
    super(message, 401)
  }
}

/**
 * Forbidden error (403)
 */
class ForbiddenError extends DomainError {
  constructor(message = 'Forbidden') {
    super(message, 403)
  }
}

export { DomainError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError }
```

### API Response Helpers

```javascript
// worker/src/interfaces/http/responses/ApiResponse.js

/**
 * Standard API response builder
 */
class ApiResponse {
  /**
   * Success response
   * @template T
   * @param {T} data
   * @param {number} [status]
   * @returns {Response}
   */
  static success(data, status = 200) {
    return new Response(JSON.stringify({ data, success: true }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  /**
   * Created response
   * @template T
   * @param {T} data
   * @returns {Response}
   */
  static created(data) {
    return ApiResponse.success(data, 201)
  }

  /**
   * No content response
   * @returns {Response}
   */
  static noContent() {
    return new Response(null, { status: 204 })
  }

  /**
   * Error response
   * @param {string} message
   * @param {number} [status]
   * @param {Object} [details]
   * @returns {Response}
   */
  static error(message, status = 500, details = null) {
    const body = { error: message, success: false }
    if (details) body.details = details
    
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  /**
   * Error from DomainError
   * @param {DomainError} error
   * @returns {Response}
   */
  static fromError(error) {
    if (error instanceof DomainError) {
      return ApiResponse.error(error.message, error.statusCode)
    }
    
    console.error('Unhandled error:', error)
    return ApiResponse.error('Internal Server Error', 500)
  }

  /**
   * Paginated response
   * @template T
   * @param {T[]} data
   * @param {Object} pagination
   * @returns {Response}
   */
  static paginated(data, pagination) {
    return new Response(JSON.stringify({
      data,
      pagination,
      success: true
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export { ApiResponse }
```

---

## Cost Optimization

### D1 Pricing

Free tier: 5M reads + 100k writes per day. Paid: $0.001 per 1,000 rows read, $1.00 per 1M rows written. Storage: $0.75 per GB/month.

**Optimization strategies**: Cache reads in KV, batch queries, use indexes to minimize rows scanned.

### KV Pricing

Free tier: 100k reads + 1k writes per day. Paid: $0.50 per 1M reads, $5.00 per 1M writes. Storage: $0.50 per GB/month.

**Optimization strategies**: Set appropriate TTLs, use KV for read-heavy data only, delete stale keys.

### Workers Pricing

Free tier: 100k requests/day. Paid: $5/month for 10M requests + $0.50 per 1M additional.

**Optimization strategies**: Cache responses at CDN level, use Durable Objects for coordination.

---

## Testing & Development

### Local Development

```bash
# Start local dev server
npx wrangler dev

# Use local D1 database
npx wrangler d1 execute my-db --local --file=./migrations/0001_initial_schema.sql

# Run migrations
npx wrangler d1 migrations apply my-db --local
```

### Environment Setup

```bash
# Create D1 database
npx wrangler d1 create production-db

# Create KV namespace
npx wrangler kv:namespace create CACHE

# Create R2 bucket
npx wrangler r2 bucket create user-uploads
```

### Deployment

```bash
# Deploy to production
npx wrangler deploy

# Deploy to staging
npx wrangler deploy --env staging
```

---

## Critical Reminders

1. **D1 is eventually consistent for reads** — Design for 60s propagation delay
2. **KV has 1 write/sec per key limit** — Don't use for frequently updated counters
3. **Workers have 10ms CPU limit (free tier)** — Offload heavy computation
4. **Use bindings, not fetch** — Direct access is faster than HTTP
5. **Batch D1 queries** — Reduce round-trips
6. **Cache aggressively in KV** — D1 queries are slower than KV reads
7. **Monitor costs** — D1 reads/writes add up quickly at scale

---

## Resources

- **CloudFlare Workers**: https://developers.cloudflare.com/workers/
- **D1 Database**: https://developers.cloudflare.com/d1/
- **Workers KV**: https://developers.cloudflare.com/kv/
- **R2 Storage**: https://developers.cloudflare.com/r2/
- **Durable Objects**: https://developers.cloudflare.com/durable-objects/