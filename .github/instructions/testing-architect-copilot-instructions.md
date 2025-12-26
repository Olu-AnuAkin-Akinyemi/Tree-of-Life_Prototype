---
name: testing-architect
description: Comprehensive testing strategies covering unit tests, integration tests, E2E tests, TDD methodology, test coverage, mocking patterns, and testing tools (Vitest, Jest, Playwright). Focuses on writing maintainable, reliable tests for JavaScript applications.
---

# Testing Architect

**Version**: 1.0  
**Focus**: Comprehensive testing strategies and best practices  
**Purpose**: Build confidence through systematic, maintainable testing

---

## Philosophy: Tests as Documentation

Good tests serve three purposes:

1. **Verify behavior**: Code works as intended
2. **Prevent regressions**: Changes don't break existing features
3. **Document intent**: Tests show how code should be used

**Bad tests**:
- Break when implementation changes (brittle)
- Don't catch real bugs
- Are hard to understand

**Good tests**:
- Test behavior, not implementation
- Catch bugs before production
- Are clear and maintainable

---

## Part 1: Testing Pyramid

### The Pyramid Structure

```
        /\
       /  \      E2E Tests (Few)
      /    \     - Slow, expensive
     /------\    - Full user flows
    /        \   
   /  Integ-  \  Integration Tests (Some)
  /   ration   \ - Medium speed
 /--------------\- Component interactions
/                \
/  Unit  Tests   \ Unit Tests (Many)
/                 \- Fast, focused
/-------------------\- Single functions/modules
```

**Distribution**:
- 70% Unit tests
- 20% Integration tests
- 10% E2E tests

**Why**: Unit tests are fast and pinpoint issues. E2E tests are slow but validate complete flows.

---

## Part 2: Unit Testing

### What to Unit Test

Test **pure functions** and **isolated logic**:

```javascript
// math.js
/**
 * Calculate discount price.
 * @param {number} price - Original price
 * @param {number} discountPercent - Discount percentage (0-100)
 * @returns {number} Discounted price
 */
export function calculateDiscount(price, discountPercent) {
  if (price < 0 || discountPercent < 0 || discountPercent > 100) {
    throw new Error('Invalid input')
  }
  return price * (1 - discountPercent / 100)
}
```

```javascript
// math.test.js
import { describe, it, expect } from 'vitest'
import { calculateDiscount } from './math.js'

describe('calculateDiscount', () => {
  it('calculates 10% discount correctly', () => {
    expect(calculateDiscount(100, 10)).toBe(90)
  })
  
  it('returns original price with 0% discount', () => {
    expect(calculateDiscount(100, 0)).toBe(100)
  })
  
  it('returns 0 with 100% discount', () => {
    expect(calculateDiscount(100, 100)).toBe(0)
  })
  
  it('throws error for negative price', () => {
    expect(() => calculateDiscount(-10, 10)).toThrow('Invalid input')
  })
  
  it('throws error for discount > 100', () => {
    expect(() => calculateDiscount(100, 150)).toThrow('Invalid input')
  })
})
```

### Test Structure: AAA Pattern

**Arrange → Act → Assert**

```javascript
it('updates user profile', () => {
  // Arrange: Set up test data
  const user = { id: 1, name: 'Alice', email: 'alice@example.com' }
  const updates = { name: 'Alice Smith' }
  
  // Act: Execute the function
  const result = updateUserProfile(user, updates)
  
  // Assert: Verify the outcome
  expect(result.name).toBe('Alice Smith')
  expect(result.email).toBe('alice@example.com') // Unchanged
})
```

### Testing Edge Cases

Always test:
- **Happy path**: Normal, expected inputs
- **Edge cases**: Boundary values (0, empty, max)
- **Error cases**: Invalid inputs
- **Null/undefined**: Missing data

```javascript
describe('parseUserInput', () => {
  it('parses valid input', () => {
    expect(parseUserInput('42')).toBe(42)
  })
  
  it('handles empty string', () => {
    expect(parseUserInput('')).toBe(null)
  })
  
  it('handles null', () => {
    expect(parseUserInput(null)).toBe(null)
  })
  
  it('handles non-numeric string', () => {
    expect(parseUserInput('abc')).toBe(null)
  })
  
  it('handles very large numbers', () => {
    expect(parseUserInput('999999999999')).toBe(999999999999)
  })
})
```

---

## Part 3: Mocking & Stubs

### When to Mock

Mock **external dependencies**:
- API calls
- Database queries
- File system operations
- Third-party services
- Current time/date

**Don't mock** internal functions you control—test them directly.

### Mocking API Calls

```javascript
// api.js
/**
 * Fetch user data from API.
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export async function fetchUser(userId) {
  const response = await fetch(`/api/users/${userId}`)
  if (!response.ok) throw new Error('User not found')
  return response.json()
}
```

```javascript
// api.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchUser } from './api.js'

// Mock the global fetch
global.fetch = vi.fn()

describe('fetchUser', () => {
  beforeEach(() => {
    // Reset mock before each test
    fetch.mockReset()
  })
  
  it('fetches user successfully', async () => {
    // Mock successful response
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: '1', name: 'Alice' })
    })
    
    const user = await fetchUser('1')
    
    expect(fetch).toHaveBeenCalledWith('/api/users/1')
    expect(user).toEqual({ id: '1', name: 'Alice' })
  })
  
  it('throws error when user not found', async () => {
    // Mock failed response
    fetch.mockResolvedValue({
      ok: false,
      status: 404
    })
    
    await expect(fetchUser('999')).rejects.toThrow('User not found')
  })
})
```

### Mocking Time

```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('checkExpiration', () => {
  beforeEach(() => {
    // Mock Date to specific time
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'))
  })
  
  afterEach(() => {
    // Restore real timers
    vi.useRealTimers()
  })
  
  it('returns true for expired token', () => {
    const token = { expiresAt: new Date('2023-12-31T12:00:00Z') }
    expect(isTokenExpired(token)).toBe(true)
  })
  
  it('returns false for valid token', () => {
    const token = { expiresAt: new Date('2024-01-02T12:00:00Z') }
    expect(isTokenExpired(token)).toBe(false)
  })
})
```

---

## Part 4: Integration Testing

### What to Integration Test

Test **how components work together**:
- API endpoint + database
- Form submission + validation + storage
- Authentication flow
- Multi-step workflows

```javascript
// integration.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { setupTestDB, cleanupTestDB } from './test-helpers.js'
import { createUser, getUserById } from './db.js'

describe('User database operations', () => {
  let db
  
  beforeAll(async () => {
    // Set up test database
    db = await setupTestDB()
  })
  
  afterAll(async () => {
    // Clean up
    await cleanupTestDB(db)
  })
  
  it('creates and retrieves user', async () => {
    // Create user
    const userId = await createUser(db, {
      name: 'Alice',
      email: 'alice@example.com'
    })
    
    // Retrieve user
    const user = await getUserById(db, userId)
    
    expect(user.name).toBe('Alice')
    expect(user.email).toBe('alice@example.com')
  })
})
```

### Testing API Endpoints

```javascript
// For Astro/CloudFlare Workers
import { describe, it, expect } from 'vitest'

describe('POST /api/users', () => {
  it('creates user with valid data', async () => {
    const response = await fetch('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice',
        email: 'alice@example.com'
      })
    })
    
    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.user.name).toBe('Alice')
  })
  
  it('rejects invalid email', async () => {
    const response = await fetch('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice',
        email: 'invalid-email'
      })
    })
    
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Invalid email')
  })
})
```

---

## Part 5: E2E Testing with Playwright

### Setup Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

```javascript
// playwright.config.js
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true
  }
})
```

### E2E Test Example

```javascript
// e2e/login.test.js
import { test, expect } from '@playwright/test'

test.describe('User login flow', () => {
  test('logs in successfully with valid credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login')
    
    // Fill in form
    await page.fill('input[name="email"]', 'alice@example.com')
    await page.fill('input[name="password"]', 'password123')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    
    // Verify user name appears
    await expect(page.locator('.user-name')).toHaveText('Alice')
  })
  
  test('shows error with invalid credentials', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('input[name="email"]', 'wrong@example.com')
    await page.fill('input[name="password"]', 'wrongpass')
    await page.click('button[type="submit"]')
    
    // Verify error message
    await expect(page.locator('.error-message')).toBeVisible()
    await expect(page.locator('.error-message')).toContainText('Invalid credentials')
  })
})
```

### Testing Interactive Features

```javascript
test('quiz question flow', async ({ page }) => {
  await page.goto('/quiz/1')
  
  // Select answer
  await page.click('button[data-answer="B"]')
  
  // Verify feedback
  await expect(page.locator('.feedback')).toBeVisible()
  await expect(page.locator('.feedback')).toHaveClass(/correct/)
  
  // Move to next question
  await page.click('button.next-question')
  
  // Verify question changed
  await expect(page.locator('.question-number')).toHaveText('2')
})
```

---

## Part 6: Test-Driven Development (TDD)

### The TDD Cycle

**Red → Green → Refactor**

1. **Red**: Write a failing test
2. **Green**: Write minimal code to pass
3. **Refactor**: Clean up while keeping tests passing

### Example: Building a Calculator

```javascript
// calculator.test.js - Step 1: RED
import { describe, it, expect } from 'vitest'
import { Calculator } from './calculator.js'

describe('Calculator', () => {
  it('adds two numbers', () => {
    const calc = new Calculator()
    expect(calc.add(2, 3)).toBe(5)
  })
})

// Test fails: Calculator doesn't exist yet ❌
```

```javascript
// calculator.js - Step 2: GREEN (minimal implementation)
export class Calculator {
  add(a, b) {
    return a + b
  }
}

// Test passes ✅
```

```javascript
// calculator.test.js - Add more tests
describe('Calculator', () => {
  it('adds two numbers', () => {
    const calc = new Calculator()
    expect(calc.add(2, 3)).toBe(5)
  })
  
  it('subtracts two numbers', () => {
    const calc = new Calculator()
    expect(calc.subtract(5, 3)).toBe(2)
  })
})

// Test fails: subtract doesn't exist ❌
```

```javascript
// calculator.js - Implement subtract
export class Calculator {
  add(a, b) {
    return a + b
  }
  
  subtract(a, b) {
    return a - b
  }
}

// Tests pass ✅
```

### TDD Benefits

- Forces you to think about interface before implementation
- Ensures every feature has test coverage
- Prevents over-engineering (write only what's needed)
- Creates living documentation

---

## Part 7: Test Coverage

### What is Coverage?

**Coverage metrics**:
- **Line coverage**: % of lines executed
- **Branch coverage**: % of if/else branches executed
- **Function coverage**: % of functions called
- **Statement coverage**: % of statements executed

### Measuring Coverage

```bash
# Vitest with coverage
npm install -D @vitest/coverage-v8
npx vitest --coverage
```

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.test.js'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    }
  }
})
```

### Coverage Targets

**Good targets**:
- **80%+ line coverage**: General goal
- **90%+ for critical paths**: Auth, payments, data validation
- **60-70% for UI code**: Hard to test, lower priority

**Don't aim for 100%**:
- Diminishing returns
- Some code is trivial
- Focus on valuable tests

---

## Part 8: Testing Patterns

### Test Data Factories

```javascript
// test-helpers.js
/**
 * Create test user with defaults.
 * @param {Partial<User>} overrides
 * @returns {User}
 */
export function createTestUser(overrides = {}) {
  return {
    id: Math.random().toString(36),
    name: 'Test User',
    email: 'test@example.com',
    createdAt: new Date(),
    ...overrides
  }
}

// Usage in tests
const user = createTestUser({ name: 'Alice' })
```

### Setup/Teardown

```javascript
import { describe, it, beforeEach, afterEach } from 'vitest'

describe('Database tests', () => {
  let db
  
  // Runs before each test
  beforeEach(async () => {
    db = await setupTestDB()
  })
  
  // Runs after each test
  afterEach(async () => {
    await cleanupTestDB(db)
  })
  
  it('test 1', () => {
    // db is fresh
  })
  
  it('test 2', () => {
    // db is fresh again
  })
})
```

### Parameterized Tests

```javascript
describe('parseDate', () => {
  const testCases = [
    { input: '2024-01-01', expected: new Date('2024-01-01') },
    { input: '2024/01/01', expected: new Date('2024-01-01') },
    { input: 'Jan 1, 2024', expected: new Date('2024-01-01') },
    { input: 'invalid', expected: null }
  ]
  
  testCases.forEach(({ input, expected }) => {
    it(`parses "${input}"`, () => {
      expect(parseDate(input)).toEqual(expected)
    })
  })
})
```

---

## Part 9: Testing Best Practices

### ✅ DO

**1. Test behavior, not implementation**
```javascript
// ❌ Bad: Tests implementation
it('calls sortArray function', () => {
  const spy = vi.spyOn(utils, 'sortArray')
  getTopUsers()
  expect(spy).toHaveBeenCalled()
})

// ✅ Good: Tests behavior
it('returns users sorted by score', () => {
  const users = getTopUsers()
  expect(users[0].score).toBeGreaterThan(users[1].score)
})
```

**2. Use descriptive test names**
```javascript
// ❌ Bad
it('works', () => {})

// ✅ Good
it('returns empty array when no users exist', () => {})
```

**3. Keep tests isolated**
```javascript
// ❌ Bad: Tests depend on each other
it('creates user', () => {
  userId = createUser() // Sets global
})

it('updates user', () => {
  updateUser(userId) // Depends on previous test
})

// ✅ Good: Each test is independent
it('creates user', () => {
  const userId = createUser()
  expect(userId).toBeDefined()
})

it('updates user', () => {
  const userId = createUser()
  updateUser(userId)
  // ...
})
```

### ❌ DON'T

**1. Don't test third-party libraries**
```javascript
// ❌ Bad: Testing lodash
it('lodash sortBy works', () => {
  const sorted = _.sortBy([3, 1, 2])
  expect(sorted).toEqual([1, 2, 3])
})

// ✅ Good: Test your logic
it('sorts users by name', () => {
  const sorted = sortUsersByName(users)
  expect(sorted[0].name).toBe('Alice')
})
```

**2. Don't make tests too complex**
```javascript
// ❌ Bad: Complex test logic
it('processes complex workflow', () => {
  const users = []
  for (let i = 0; i < 100; i++) {
    if (i % 2 === 0) {
      users.push(createTestUser({ premium: true }))
    }
  }
  // 20 more lines...
})

// ✅ Good: Simple, focused test
it('filters premium users', () => {
  const users = [
    createTestUser({ premium: true }),
    createTestUser({ premium: false })
  ]
  const premium = filterPremiumUsers(users)
  expect(premium).toHaveLength(1)
})
```

**3. Don't test private methods directly**
```javascript
// ❌ Bad: Testing private method
it('_calculateInternalScore works', () => {
  const score = obj._calculateInternalScore()
  // ...
})

// ✅ Good: Test through public API
it('ranks users correctly', () => {
  const ranking = rankUsers(users)
  // _calculateInternalScore is tested indirectly
})
```

---

## Part 10: Tools & Configuration

### Vitest (Recommended for Vite/Astro projects)

```bash
npm install -D vitest
```

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // or 'jsdom' for browser APIs
    setupFiles: './test/setup.js'
  }
})
```

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

### Jest (Alternative)

```bash
npm install -D jest
```

```javascript
// jest.config.js
export default {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ]
}
```

### CloudFlare Workers Testing

```javascript
// worker.test.js
import { describe, it, expect } from 'vitest'

describe('CloudFlare Worker', () => {
  it('handles GET request', async () => {
    const request = new Request('http://localhost/api/users')
    const env = {
      DB: mockD1Database(),
      KV: mockKVNamespace()
    }
    
    const response = await handleRequest(request, env)
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.users).toBeDefined()
  })
})
```

---

## Quick Testing Checklist

Before deploying:

- [ ] All critical paths have unit tests
- [ ] API endpoints have integration tests
- [ ] Happy path has E2E test
- [ ] Error cases are tested
- [ ] Coverage is 80%+
- [ ] Tests run in CI/CD
- [ ] No flaky tests
- [ ] Tests are fast (<1 min)

---

## Resources

- **Vitest**: https://vitest.dev/
- **Playwright**: https://playwright.dev/
- **Testing Library**: https://testing-library.com/
- **Test-Driven Development** (Kent Beck): Classic TDD book

---

## Summary

**Testing pyramid**: Many unit tests, some integration tests, few E2E tests.

**TDD cycle**: Red → Green → Refactor.

**Mock external dependencies**: APIs, databases, time.

**Test behavior**: Not implementation details.

**Aim for 80% coverage**: Focus on valuable tests, not 100%.

**Keep tests simple**: Clear, isolated, and maintainable.
