---
name: api-design-architect
description: RESTful API design principles, data modeling strategies, endpoint architecture, authentication patterns, and best practices for building scalable, maintainable backend APIs. Covers REST conventions, HTTP methods, status codes, and database schema design.
---

# API Design Architect

**Version**: 1.0  
**Focus**: RESTful API design and data modeling  
**Purpose**: Build well-designed, intuitive, scalable APIs

---

## Philosophy: API as Contract

Your API is a **contract** between frontend and backend:

- **Clear**: Self-documenting endpoints
- **Consistent**: Predictable patterns
- **Versioned**: Backward compatible changes
- **Documented**: Easily understood

**Bad API**: Requires constant clarification  
**Good API**: Frontend developers understand it immediately

---

## Part 1: RESTful Principles

### REST = Representational State Transfer

**Core concepts**:
1. **Resources**: Entities (users, posts, comments)
2. **URIs**: Unique identifiers (`/users/123`)
3. **HTTP Methods**: Actions (GET, POST, PUT, DELETE)
4. **Stateless**: Each request contains all needed info
5. **Representations**: JSON (usually) for data exchange

### Resource Naming

```
✅ Good (nouns, plural)
GET    /users
GET    /users/123
GET    /users/123/posts
POST   /posts
PUT    /posts/456
DELETE /posts/456

❌ Bad (verbs, singular)
GET    /getUser
POST   /createUser
GET    /user/123
POST   /deletePost
```

**Rules**:
- Use **nouns**, not verbs
- Use **plural** form (`/users` not `/user`)
- Use **kebab-case** for multi-word (`/blog-posts`)
- Use **nesting** for relationships (`/users/123/posts`)
- Limit nesting to 2 levels max

---

## Part 2: HTTP Methods

### Standard CRUD Operations

| Method | Action | Idempotent? | Safe? |
|--------|--------|-------------|-------|
| GET | Read | Yes | Yes |
| POST | Create | No | No |
| PUT | Update (full) | Yes | No |
| PATCH | Update (partial) | No | No |
| DELETE | Delete | Yes | No |

**Idempotent**: Multiple identical requests same as single request  
**Safe**: Doesn't modify server state

### GET - Retrieve Resources

```javascript
// List all users
GET /users
Response: 200 OK
{
  "data": [
    { "id": 1, "name": "Alice" },
    { "id": 2, "name": "Bob" }
  ],
  "total": 2,
  "page": 1,
  "perPage": 20
}

// Get single user
GET /users/123
Response: 200 OK
{
  "id": 123,
  "name": "Alice",
  "email": "alice@example.com",
  "createdAt": "2024-01-01T00:00:00Z"
}

// Get user's posts
GET /users/123/posts
Response: 200 OK
{
  "data": [ ... ],
  "total": 5
}
```

### POST - Create Resources

```javascript
// Create user
POST /users
Content-Type: application/json

{
  "name": "Charlie",
  "email": "charlie@example.com"
}

Response: 201 Created
Location: /users/124
{
  "id": 124,
  "name": "Charlie",
  "email": "charlie@example.com",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### PUT - Full Update

```javascript
// Replace entire user resource
PUT /users/123
Content-Type: application/json

{
  "name": "Alice Updated",
  "email": "alice.new@example.com"
}

Response: 200 OK
{
  "id": 123,
  "name": "Alice Updated",
  "email": "alice.new@example.com",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

### PATCH - Partial Update

```javascript
// Update only specified fields
PATCH /users/123
Content-Type: application/json

{
  "email": "alice.newest@example.com"
}

Response: 200 OK
{
  "id": 123,
  "name": "Alice", // Unchanged
  "email": "alice.newest@example.com", // Updated
  "updatedAt": "2024-01-15T11:15:00Z"
}
```

### DELETE - Remove Resource

```javascript
// Delete user
DELETE /users/123

Response: 204 No Content
// Or
Response: 200 OK
{
  "message": "User deleted successfully"
}
```

---

## Part 3: HTTP Status Codes

### Success (2xx)

- **200 OK**: Request succeeded (GET, PUT, PATCH)
- **201 Created**: Resource created (POST)
- **204 No Content**: Success, no response body (DELETE)

### Client Error (4xx)

- **400 Bad Request**: Invalid input
- **401 Unauthorized**: Missing/invalid authentication
- **403 Forbidden**: Authenticated but not authorized
- **404 Not Found**: Resource doesn't exist
- **409 Conflict**: Duplicate resource (email already exists)
- **422 Unprocessable Entity**: Validation failed

### Server Error (5xx)

- **500 Internal Server Error**: Generic server error
- **502 Bad Gateway**: Upstream service failed
- **503 Service Unavailable**: Server overloaded/down

### Error Response Format

```javascript
// Consistent error structure
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters"
      }
    ]
  }
}
```

---

## Part 4: Query Parameters

### Filtering

```javascript
// Filter by status
GET /posts?status=published

// Filter by multiple criteria
GET /posts?status=published&author=123

// Filter by date range
GET /posts?createdAfter=2024-01-01&createdBefore=2024-12-31
```

### Sorting

```javascript
// Sort by created date descending
GET /posts?sort=-createdAt

// Sort by multiple fields
GET /posts?sort=author,createdAt

// Conventions:
// - Prefix with `-` for descending
// - Comma-separated for multiple fields
```

### Pagination

```javascript
// Offset-based pagination
GET /posts?page=2&perPage=20

Response:
{
  "data": [ ... ],
  "pagination": {
    "page": 2,
    "perPage": 20,
    "total": 100,
    "totalPages": 5
  }
}

// Cursor-based pagination (better for large datasets)
GET /posts?cursor=abc123&limit=20

Response:
{
  "data": [ ... ],
  "pagination": {
    "nextCursor": "def456",
    "hasMore": true
  }
}
```

### Field Selection

```javascript
// Return only specified fields
GET /users?fields=id,name,email

Response:
{
  "data": [
    { "id": 1, "name": "Alice", "email": "alice@example.com" }
  ]
}
```

### Searching

```javascript
// Full-text search
GET /posts?q=javascript

// Search specific field
GET /posts?search[title]=javascript
```

---

## Part 5: Data Modeling

### Database Schema Design

#### Users Table

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

#### Posts Table (One-to-Many with Users)

```sql
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_published_at ON posts(published_at);
```

#### Tags Table (Many-to-Many with Posts)

```sql
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE post_tags (
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX idx_post_tags_post_id ON post_tags(post_id);
CREATE INDEX idx_post_tags_tag_id ON post_tags(tag_id);
```

### Relationships

#### One-to-Many

```javascript
// GET /users/123/posts
{
  "id": 123,
  "name": "Alice",
  "posts": [
    { "id": 1, "title": "Post 1" },
    { "id": 2, "title": "Post 2" }
  ]
}

// Or separate endpoint
GET /posts?userId=123
```

#### Many-to-Many

```javascript
// GET /posts/456
{
  "id": 456,
  "title": "My Post",
  "tags": [
    { "id": 1, "name": "javascript" },
    { "id": 2, "name": "tutorial" }
  ]
}

// Add tag to post
POST /posts/456/tags
{
  "tagId": 3
}

// Remove tag from post
DELETE /posts/456/tags/3
```

---

## Part 6: Authentication & Authorization

### Authentication Strategies

#### 1. Session-Based (Cookies)

```javascript
// Login
POST /auth/login
{
  "email": "alice@example.com",
  "password": "secret"
}

Response:
Set-Cookie: sessionId=abc123; HttpOnly; Secure; SameSite=Strict

// Subsequent requests include cookie automatically
GET /users/me
Cookie: sessionId=abc123
```

#### 2. Token-Based (JWT)

```javascript
// Login
POST /auth/login
{
  "email": "alice@example.com",
  "password": "secret"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}

// Subsequent requests include token in header
GET /users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Authorization Patterns

```javascript
// Check ownership
app.get('/posts/:id', async (req, res) => {
  const post = await db.getPost(req.params.id)
  
  if (post.userId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  res.json(post)
})

// Role-based access control
function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}

app.delete('/users/:id', requireRole('admin'), async (req, res) => {
  // Only admins can delete users
})
```

---

## Part 7: API Versioning

### URI Versioning (Recommended)

```javascript
// Version in URL path
GET /v1/users
GET /v2/users

// Easy to understand, clear separation
```

### Header Versioning

```javascript
GET /users
Accept: application/vnd.api+json; version=1

// More RESTful, but harder to test
```

### When to Version

- Breaking changes (removing fields, changing types)
- Major refactors
- Different business logic

**Don't version** for:
- Adding optional fields
- Bug fixes
- Performance improvements

---

## Part 8: Best Practices

### 1. Use Nouns, Not Verbs

```
❌ /getUsers
❌ /createPost
❌ /deleteComment

✅ GET /users
✅ POST /posts
✅ DELETE /comments/123
```

### 2. Consistent Naming

```javascript
// Pick one style and stick with it

// snake_case
{
  "user_id": 123,
  "created_at": "..."
}

// camelCase (recommended for JSON)
{
  "userId": 123,
  "createdAt": "..."
}
```

### 3. Return Created Resource

```javascript
// ❌ Only return ID
POST /users
Response: { "id": 123 }

// ✅ Return full resource
POST /users
Response: {
  "id": 123,
  "name": "Alice",
  "email": "alice@example.com",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### 4. Use HTTP Caching

```javascript
// ETag for conditional requests
GET /posts/123
Response:
ETag: "abc123"
{ ... }

// Client sends ETag on next request
GET /posts/123
If-None-Match: "abc123"

Response: 304 Not Modified (if unchanged)
```

### 5. Rate Limiting

```javascript
// Include rate limit headers
GET /users
Response:
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640000000

// Return 429 when limit exceeded
Response: 429 Too Many Requests
{
  "error": {
    "message": "Rate limit exceeded",
    "retryAfter": 60
  }
}
```

### 6. CORS Headers

```javascript
// Allow cross-origin requests
res.setHeader('Access-Control-Allow-Origin', '*')
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
```

---

## Part 9: API Documentation

### OpenAPI/Swagger

```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0

paths:
  /users:
    get:
      summary: List users
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'
                  
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        email:
          type: string
          format: email
```

### Example Requests

Always include example requests/responses:

```markdown
## Create User

POST /users

**Request:**
```json
{
  "name": "Alice",
  "email": "alice@example.com"
}
```

**Response (201 Created):**
```json
{
  "id": 123,
  "name": "Alice",
  "email": "alice@example.com",
  "createdAt": "2024-01-15T10:00:00Z"
}
```
```

---

## Critical Reminders

1. **Use nouns, not verbs** in endpoints
2. **HTTP methods** express actions (GET, POST, PUT, DELETE)
3. **Status codes** indicate result (200, 201, 400, 404, 500)
4. **Be consistent** with naming, structure, errors
5. **Version breaking changes** (v1, v2)
6. **Document everything** with examples
7. **Think like API consumer** - what's intuitive?

---

## Resources

- **REST API Tutorial**: https://restfulapi.net/
- **HTTP Status Codes**: https://httpstatuses.com/
- **OpenAPI Spec**: https://swagger.io/specification/
- **API Design Guide**: https://cloud.google.com/apis/design
