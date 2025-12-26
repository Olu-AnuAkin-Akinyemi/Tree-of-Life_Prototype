---
applyTo: "**/" 
name: code-reviewer
description: Code review guidelines focusing on quality, maintainability, and SOLID principles. Covers readability, performance, security, testing, and professional code review practices for JavaScript and web applications.
---

# Code Reviewer

**Version**: 1.0  
**Focus**: Code quality, maintainability, and best practices  
**Purpose**: Review code professionally and improve codebase quality

---

## Philosophy: Code is Read More Than Written

**Code is written once, read many times.**

Good code:
- **Self-documenting**: Clear without comments
- **Maintainable**: Easy to change
- **Testable**: Easy to verify correctness
- **Consistent**: Follows established patterns

Bad code:
- Requires constant clarification
- Breaks when touched
- Hard to test
- Inconsistent patterns

---

## Part 1: Code Review Principles

### The Goal of Code Review

**Primary goals**:
1. **Catch bugs** before production
2. **Ensure maintainability** for future developers
3. **Share knowledge** across team
4. **Enforce standards** and best practices

**Not the goal**:
- Nitpicking personal preferences
- Showing off knowledge
- Blocking progress

### Review Checklist

Before approving:
- [ ] Code works (tested locally if possible)
- [ ] No obvious bugs
- [ ] Follows project conventions
- [ ] Readable and understandable
- [ ] Properly tested
- [ ] No security vulnerabilities
- [ ] Performance acceptable
- [ ] Documentation updated

---

## Part 2: Readability

### 1. Naming

**Variables**: Descriptive nouns
```javascript
// ❌ Bad
const d = new Date()
const x = users.filter(u => u.a)

// ✅ Good
const currentDate = new Date()
const activeUsers = users.filter(user => user.isActive)
```

**Functions**: Verb phrases
```javascript
// ❌ Bad
function user(id) { ... }
function data() { ... }

// ✅ Good
function getUser(id) { ... }
function fetchData() { ... }
```

**Constants**: SCREAMING_SNAKE_CASE
```javascript
// ❌ Bad
const maxretries = 3
const apiurl = 'https://api.example.com'

// ✅ Good
const MAX_RETRIES = 3
const API_URL = 'https://api.example.com'
```

**Booleans**: Question words (is, has, can, should)
```javascript
// ❌ Bad
const loading = true
const admin = false

// ✅ Good
const isLoading = true
const hasPermission = false
const canEdit = true
const shouldRetry = false
```

### 2. Function Length

**Rule**: Functions should do ONE thing well.

```javascript
// ❌ Bad: Too long, does multiple things
function processUserData(user) {
  // Validate (50 lines)
  if (!user) throw new Error('...')
  if (!user.email) throw new Error('...')
  // ... more validation
  
  // Transform (50 lines)
  const normalized = {
    email: user.email.toLowerCase(),
    // ... more transformation
  }
  
  // Save (50 lines)
  const saved = await db.save(normalized)
  // ... more saving logic
  
  // Send email (50 lines)
  await sendEmail(user.email, ...)
  // ... more email logic
  
  return saved
}

// ✅ Good: Split into focused functions
function processUserData(user) {
  validateUser(user)
  const normalized = normalizeUserData(user)
  const saved = await saveUser(normalized)
  await notifyUser(saved)
  return saved
}
```

### 3. Avoid Deep Nesting

```javascript
// ❌ Bad: Deep nesting (hard to read)
function processOrder(order) {
  if (order) {
    if (order.items) {
      if (order.items.length > 0) {
        if (order.status === 'pending') {
          // Process order
        }
      }
    }
  }
}

// ✅ Good: Early returns
function processOrder(order) {
  if (!order) return
  if (!order.items || order.items.length === 0) return
  if (order.status !== 'pending') return
  
  // Process order
}
```

### 4. Comments

**When to comment**:
- Complex algorithms
- Business logic decisions
- TODOs and FIXMEs
- Public API documentation

**When NOT to comment**:
- Obvious code
- What code does (code shows this)

```javascript
// ❌ Bad: Obvious comment
// Set name to user's name
const name = user.name

// Increment counter by 1
counter++

// ✅ Good: Explains WHY
// Use exponential backoff to avoid overwhelming API
const delay = Math.pow(2, retryCount) * 1000

// TODO: Optimize this query (currently O(n²))
for (const user of users) {
  for (const post of posts) { ... }
}
```

---

## Part 3: SOLID Principles

### S - Single Responsibility

Each class/function should have ONE reason to change.

```javascript
// ❌ Bad: User class does too much
class User {
  constructor(name, email) {
    this.name = name
    this.email = email
  }
  
  save() { /* Database logic */ }
  sendEmail() { /* Email logic */ }
  generateReport() { /* Report logic */ }
}

// ✅ Good: Separate responsibilities
class User {
  constructor(name, email) {
    this.name = name
    this.email = email
  }
}

class UserRepository {
  save(user) { /* Database logic */ }
}

class EmailService {
  sendWelcome(user) { /* Email logic */ }
}
```

### O - Open/Closed

Open for extension, closed for modification.

```javascript
// ❌ Bad: Must modify function to add new payment types
function processPayment(type, amount) {
  if (type === 'credit_card') {
    // Process credit card
  } else if (type === 'paypal') {
    // Process PayPal
  }
  // Adding new type requires modifying this function
}

// ✅ Good: Extensible without modification
class PaymentProcessor {
  constructor() {
    this.processors = new Map()
  }
  
  register(type, processor) {
    this.processors.set(type, processor)
  }
  
  process(type, amount) {
    const processor = this.processors.get(type)
    return processor.process(amount)
  }
}

// Add new payment types without modifying core code
paymentProcessor.register('credit_card', new CreditCardProcessor())
paymentProcessor.register('paypal', new PayPalProcessor())
```

### L - Liskov Substitution

Subtypes must be substitutable for base types.

```javascript
// ❌ Bad: Square violates expectations of Rectangle
class Rectangle {
  setWidth(w) { this.width = w }
  setHeight(h) { this.height = h }
  getArea() { return this.width * this.height }
}

class Square extends Rectangle {
  setWidth(w) { 
    this.width = w
    this.height = w // Violates Rectangle contract!
  }
}

// ✅ Good: Composition over inheritance
class Rectangle {
  constructor(width, height) {
    this.width = width
    this.height = height
  }
  getArea() { return this.width * this.height }
}

class Square {
  constructor(side) {
    this.side = side
  }
  getArea() { return this.side * this.side }
}
```

### I - Interface Segregation

Clients shouldn't depend on interfaces they don't use.

```javascript
// ❌ Bad: Fat interface
interface Worker {
  work()
  eat()
  sleep()
}

class Robot implements Worker {
  work() { ... }
  eat() { throw new Error('Robots don't eat!') }
  sleep() { throw new Error('Robots don't sleep!') }
}

// ✅ Good: Split interfaces
interface Workable {
  work()
}

interface Eatable {
  eat()
}

class Human implements Workable, Eatable {
  work() { ... }
  eat() { ... }
}

class Robot implements Workable {
  work() { ... }
}
```

### D - Dependency Inversion

Depend on abstractions, not concretions.

```javascript
// ❌ Bad: High-level depends on low-level
class EmailService {
  send(to, subject, body) {
    // Directly uses Gmail API
    const gmail = new GmailAPI()
    gmail.send(to, subject, body)
  }
}

// ✅ Good: Depends on abstraction
class EmailService {
  constructor(emailProvider) {
    this.provider = emailProvider // Abstraction
  }
  
  send(to, subject, body) {
    this.provider.send(to, subject, body)
  }
}

// Can swap providers easily
const gmailService = new EmailService(new GmailProvider())
const sendgridService = new EmailService(new SendGridProvider())
```

---

## Part 4: Common Code Smells

### 1. Magic Numbers

```javascript
// ❌ Bad
if (user.age > 18) { ... }
setTimeout(retry, 5000)

// ✅ Good
const LEGAL_AGE = 18
if (user.age > LEGAL_AGE) { ... }

const RETRY_DELAY_MS = 5000
setTimeout(retry, RETRY_DELAY_MS)
```

### 2. God Objects

```javascript
// ❌ Bad: Does everything
class Application {
  handleRequest() { ... }
  connectDatabase() { ... }
  sendEmail() { ... }
  generateReport() { ... }
  processPayment() { ... }
  // ... 50 more methods
}

// ✅ Good: Focused classes
class Router { handleRequest() { ... } }
class Database { connect() { ... } }
class EmailService { send() { ... } }
```

### 3. Duplicate Code

```javascript
// ❌ Bad: Repeated logic
function calculateDiscountA(price) {
  return price * 0.9
}

function calculateDiscountB(price) {
  return price * 0.9
}

// ✅ Good: DRY (Don't Repeat Yourself)
function calculateDiscount(price, discountPercent) {
  return price * (1 - discountPercent / 100)
}

const priceA = calculateDiscount(100, 10)
const priceB = calculateDiscount(200, 10)
```

### 4. Long Parameter Lists

```javascript
// ❌ Bad: Too many parameters
function createUser(name, email, age, address, phone, company, role) {
  // ...
}

// ✅ Good: Use object parameter
function createUser({ name, email, age, address, phone, company, role }) {
  // Destructure what you need
}

// Or even better: Use a class/type
interface UserParams {
  name: string
  email: string
  age: number
  // ...
}

function createUser(params: UserParams) {
  // ...
}
```

---

## Part 5: Security Review

### Check for Common Vulnerabilities

#### 1. SQL Injection

```javascript
// ❌ Vulnerable
const query = `SELECT * FROM users WHERE id = ${userId}`

// ✅ Safe: Parameterized queries
const query = 'SELECT * FROM users WHERE id = ?'
db.query(query, [userId])
```

#### 2. XSS (Cross-Site Scripting)

```javascript
// ❌ Vulnerable
element.innerHTML = userInput

// ✅ Safe: Sanitize or use textContent
element.textContent = userInput
// Or use DOMPurify
element.innerHTML = DOMPurify.sanitize(userInput)
```

#### 3. Authentication

```javascript
// ❌ Bad: Plain text password
const user = { password: 'secret123' }

// ✅ Good: Hashed password
const bcrypt = require('bcrypt')
const hashedPassword = await bcrypt.hash('secret123', 10)
const user = { passwordHash: hashedPassword }
```

#### 4. Authorization

```javascript
// ❌ Bad: No authorization check
app.delete('/users/:id', async (req, res) => {
  await db.deleteUser(req.params.id)
  res.json({ success: true })
})

// ✅ Good: Verify ownership/permissions
app.delete('/users/:id', async (req, res) => {
  const user = await db.getUser(req.params.id)
  
  if (user.id !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  await db.deleteUser(req.params.id)
  res.json({ success: true })
})
```

---

## Part 6: Performance Review

### Check for Performance Issues

#### 1. N+1 Queries

```javascript
// ❌ Bad: N+1 queries
const users = await db.getUsers()
for (const user of users) {
  user.posts = await db.getPosts(user.id) // N queries!
}

// ✅ Good: Single query with JOIN
const users = await db.getUsersWithPosts()
```

#### 2. Unnecessary Re-renders (React)

```javascript
// ❌ Bad: Creates new object every render
function Component() {
  const style = { color: 'red' } // New object!
  return <div style={style}>Hello</div>
}

// ✅ Good: Memoize or move outside
const STYLE = { color: 'red' }

function Component() {
  return <div style={STYLE}>Hello</div>
}
```

#### 3. Large Bundle Sizes

```javascript
// ❌ Bad: Import entire library
import _ from 'lodash'

// ✅ Good: Import only what you need
import debounce from 'lodash/debounce'
```

---

## Part 7: Testing Review

### Check Test Coverage

```javascript
// ❌ Bad: No tests
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0)
}

// ✅ Good: Tested
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0)
}

test('calculateTotal sums item prices', () => {
  const items = [
    { price: 10 },
    { price: 20 },
    { price: 30 }
  ]
  expect(calculateTotal(items)).toBe(60)
})

test('calculateTotal handles empty array', () => {
  expect(calculateTotal([])).toBe(0)
})
```

### Test Quality

Good tests are:
- **Independent**: Don't depend on other tests
- **Fast**: Run quickly
- **Deterministic**: Same result every time
- **Readable**: Clear what's being tested

---

## Part 8: Providing Feedback

### Be Constructive

**❌ Bad feedback**:
> "This code is terrible."

**✅ Good feedback**:
> "This function is doing multiple things. Consider splitting it into `validateUser()` and `saveUser()` for better maintainability."

### Be Specific

**❌ Vague**:
> "This could be better."

**✅ Specific**:
> "This O(n²) loop could be optimized to O(n) by using a Map for lookups instead of repeated `array.find()`."

### Explain Why

**❌ Just criticism**:
> "Don't use `var`."

**✅ Explain reasoning**:
> "Use `const` or `let` instead of `var`. `var` has function scope which can lead to unexpected behavior due to hoisting. `const`/`let` have block scope which is more predictable."

### Prioritize

Use labels:
- **🔴 Critical**: Security, bugs, data loss
- **🟡 Important**: Maintainability, performance
- **🟢 Nice-to-have**: Style, minor improvements

---

## Critical Review Checklist

### Functionality
- [ ] Code works as intended
- [ ] Edge cases handled
- [ ] Error handling present
- [ ] No obvious bugs

### Readability
- [ ] Clear variable/function names
- [ ] Reasonable function length (<50 lines)
- [ ] Minimal nesting (<3 levels)
- [ ] Comments explain WHY, not WHAT

### Maintainability
- [ ] Follows DRY principle
- [ ] Single responsibility
- [ ] Modular and reusable
- [ ] Consistent with codebase style

### Performance
- [ ] No obvious bottlenecks
- [ ] Efficient algorithms
- [ ] No unnecessary re-renders
- [ ] Proper caching where needed

### Security
- [ ] Input validation
- [ ] No SQL injection
- [ ] No XSS vulnerabilities
- [ ] Proper authentication/authorization

### Testing
- [ ] Tests present
- [ ] Tests cover main cases
- [ ] Tests are readable
- [ ] Tests are fast

---

## Resources

- **Clean Code**: https://github.com/ryanmcdermott/clean-code-javascript
- **SOLID Principles**: https://khalilstemmler.com/articles/solid-principles/solid-typescript/
- **Code Review Guide**: https://google.github.io/eng-practices/review/
- **Security Checklist**: https://owasp.org/www-project-web-security-testing-guide/
