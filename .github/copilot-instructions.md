---
applyTo: "**"
---
name: vanilla-js-architect
description: Clean, modular vanilla JavaScript architecture with JSDoc standards, DDD-inspired layering, and best practices for building maintainable applications without frameworks. Focuses on separation of concerns, pure functions, and professional code organization.
# Project general coding standards

# Vanilla JS Architect

**Version**: 1.0  
**Focus**: Clean vanilla JavaScript architecture without frameworks  
**Purpose**: Build maintainable, professional JavaScript applications with clear separation of concerns


## Naming Conventions
- Use PascalCase for component names, interfaces, and type aliases
- Use camelCase for variables, functions, and methods
- Prefix private class members with underscore (_)
- Use ALL_CAPS for constants

## Error Handling
- Use try/catch blocks for async operations
- Implement proper error boundaries in React components
- Always log errors with contextual information


## Core Principles

### 1. Separation of Concerns

Organize code into distinct layers:

**Core (Pure Logic)**:
- Business logic, algorithms, data transformations
- No DOM, no side effects, no global state
- Fully testable in isolation

**UI (View Layer)**:
- DOM manipulation, rendering, event binding
- Thin layer that delegates to core logic
- Framework-agnostic (easy to migrate)

**App (Orchestration)**:
- Connects core + UI + data
- Handles application flow, routing
- Manages global state (if needed)

**Data (Persistence)**:
- API calls, localStorage, IndexedDB
- Returns promises/async functions
- Easily mockable for testing

### 2. Pure Functions First

```javascript
// ❌ Impure - mutates input, depends on external state
function addToCart(cart, item) {
  cart.items.push(item)  // Mutation!
  cart.total += item.price
  updateCartUI()  // Side effect!
  return cart
}

// ✅ Pure - no mutations, no side effects
function addToCart(cart, item) {
  return {
    ...cart,
    items: [...cart.items, item],
    total: cart.total + item.price
  }
}

// Call pure function, then handle side effects
const newCart = addToCart(currentCart, newItem)
updateCartUI(newCart)
```

### 3. JSDoc for Type Safety

```javascript
/**
 * Calculate total price with discount applied.
 * 
 * @param {number} price - Base price in dollars
 * @param {number} discountPercent - Discount as percentage (0-100)
 * @returns {number} Final price after discount
 * @throws {Error} If discount is negative or > 100
 * 
 * @example
 * calculateDiscountedPrice(100, 20) // 80
 */
export function calculateDiscountedPrice(price, discountPercent) {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error('Discount must be between 0 and 100')
  }
  return price * (1 - discountPercent / 100)
}
```

**JSDoc benefits**:
- Autocomplete in VSCode
- Type checking without TypeScript
- Self-documenting code
- Catches errors early



## File Structure Best Practices

```
project/
  index.html
  css/
    styles.css
  js/
    main.js              # App bootstrap
    app/
      router.js          # Routing (if needed)
      state.js           # Global state management
    core/
      math.js            # Pure math utilities
      validators.js      # Pure validation logic
      formatters.js      # Pure formatting functions
    ui/
      dom.js             # DOM utility functions
      components/
        navbar.js        # Navbar component
        modal.js         # Modal component
    data/
      api.js             # API calls
      storage.js         # localStorage wrapper
    types.js             # JSDoc typedef definitions
  assets/
    images/
    icons/
```

### Layer Dependencies

```
main.js
  ↓
app/ (orchestration)
  ↓         ↓
ui/       data/
  ↓
core/ (pure logic)
```

**Rule**: Layers can only depend on layers below them.
- `core/` has **no dependencies** (fully pure)
- `ui/` can use `core/`, not `app/` or `data/`
- `app/` can use all layers



## Part 1: Core Layer (Pure Logic)

### Example: Math Utilities

```javascript
// js/core/math.js

/**
 * @typedef {Object} Range
 * @property {number} min - Minimum value
 * @property {number} max - Maximum value
 */

/**
 * Clamp a number between min and max.
 * 
 * @param {number} value - Value to clamp
 * @param {Range} range - Min and max bounds
 * @returns {number} Clamped value
 */
export function clamp(value, { min, max }) {
  return Math.max(min, Math.min(max, value))
}

/**
 * Generate array of numbers in range.
 * 
 * @param {number} start - Start value (inclusive)
 * @param {number} end - End value (exclusive)
 * @param {number} [step=1] - Step size
 * @returns {number[]} Array of numbers
 */
export function range(start, end, step = 1) {
  const result = []
  for (let i = start; i < end; i += step) {
    result.push(i)
  }
  return result
}
```

### Example: Validation Logic

```javascript
// js/core/validators.js

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether input is valid
 * @property {string} [error] - Error message if invalid
 */

/**
 * Validate email format.
 * 
 * @param {string} email - Email to validate
 * @returns {ValidationResult}
 */
export function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' }
  }
  
  if (!regex.test(email)) {
    return { valid: false, error: 'Invalid email format' }
  }
  
  return { valid: true }
}

/**
 * Validate password strength.
 * 
 * @param {string} password - Password to validate
 * @returns {ValidationResult}
 */
export function validatePassword(password) {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' }
  }
  
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)
  
  if (!hasUpper || !hasLower || !hasNumber) {
    return { 
      valid: false, 
      error: 'Password must contain uppercase, lowercase, and number' 
    }
  }
  
  return { valid: true }
}
```



## Part 2: UI Layer (DOM Manipulation)

### DOM Utility Functions

```javascript
// js/ui/dom.js

/**
 * Create element with attributes and children.
 * 
 * @param {string} tag - HTML tag name
 * @param {Object} [attrs={}] - Element attributes
 * @param {(string|HTMLElement)[]} [children=[]] - Child elements
 * @returns {HTMLElement}
 * 
 * @example
 * createElement('button', { class: 'btn', type: 'button' }, ['Click me'])
 */
export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag)
  
  // Set attributes
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'class') {
      el.className = value
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        el.dataset[dataKey] = dataValue
      })
    } else {
      el.setAttribute(key, value)
    }
  })
  
  // Append children
  children.forEach(child => {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child))
    } else {
      el.appendChild(child)
    }
  })
  
  return el
}

/**
 * Query selector with type safety.
 * 
 * @template {HTMLElement} T
 * @param {string} selector - CSS selector
 * @param {HTMLElement} [parent=document] - Parent element
 * @returns {T|null}
 */
export function qs(selector, parent = document) {
  return parent.querySelector(selector)
}

/**
 * Query selector all.
 * 
 * @template {HTMLElement} T
 * @param {string} selector - CSS selector
 * @param {HTMLElement} [parent=document] - Parent element
 * @returns {T[]}
 */
export function qsa(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector))
}

/**
 * Add event listener with automatic cleanup.
 * 
 * @param {HTMLElement} element - Element to attach to
 * @param {string} event - Event name
 * @param {EventListener} handler - Event handler
 * @returns {() => void} Cleanup function
 */
export function on(element, event, handler) {
  element.addEventListener(event, handler)
  return () => element.removeEventListener(event, handler)
}
```

### Component Pattern

```javascript
// js/ui/components/modal.js

import { createElement, qs } from '../dom.js'

/**
 * @typedef {Object} ModalOptions
 * @property {string} title - Modal title
 * @property {string|HTMLElement} content - Modal content
 * @property {() => void} [onClose] - Close callback
 */

/**
 * Create and show modal dialog.
 * 
 * @param {ModalOptions} options
 * @returns {{ element: HTMLElement, close: () => void }}
 */
export function createModal({ title, content, onClose }) {
  const backdrop = createElement('div', { class: 'modal-backdrop' })
  
  const modal = createElement('div', { class: 'modal' }, [
    createElement('div', { class: 'modal-header' }, [
      createElement('h2', {}, [title]),
      createElement('button', { 
        class: 'modal-close',
        'aria-label': 'Close'
      }, ['×'])
    ]),
    createElement('div', { class: 'modal-body' }, [
      typeof content === 'string' ? content : ''
    ])
  ])
  
  if (typeof content !== 'string') {
    qs('.modal-body', modal).appendChild(content)
  }
  
  backdrop.appendChild(modal)
  document.body.appendChild(backdrop)
  
  // Close handlers
  const close = () => {
    backdrop.remove()
    if (onClose) onClose()
  }
  
  qs('.modal-close', modal).addEventListener('click', close)
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close()
  })
  
  // ESC key
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      close()
      document.removeEventListener('keydown', handleEsc)
    }
  }
  document.addEventListener('keydown', handleEsc)
  
  return { element: backdrop, close }
}
```



## Part 3: Data Layer (API & Storage)

### API Wrapper

```javascript
// js/data/api.js

/**
 * @typedef {Object} RequestOptions
 * @property {'GET'|'POST'|'PUT'|'DELETE'} [method='GET']
 * @property {Object} [body]
 * @property {Object} [headers]
 */

const API_BASE = 'https://api.example.com'

/**
 * Make API request with error handling.
 * 
 * @param {string} endpoint - API endpoint
 * @param {RequestOptions} [options={}]
 * @returns {Promise<any>}
 * @throws {Error} On network or HTTP errors
 */
export async function request(endpoint, options = {}) {
  const { method = 'GET', body, headers = {} } = options
  
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  }
  
  if (body) {
    config.body = JSON.stringify(body)
  }
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('API Error:', error)
    throw error
  }
}

// Convenience methods
export const api = {
  get: (endpoint) => request(endpoint),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' })
}
```

### LocalStorage Wrapper

```javascript
// js/data/storage.js

/**
 * Get item from localStorage with JSON parsing.
 * 
 * @template T
 * @param {string} key - Storage key
 * @param {T} [defaultValue] - Default if key doesn't exist
 * @returns {T|null}
 */
export function getItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error('Storage get error:', error)
    return defaultValue
  }
}

/**
 * Set item in localStorage with JSON serialization.
 * 
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @returns {boolean} Success status
 */
export function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error('Storage set error:', error)
    return false
  }
}

/**
 * Remove item from localStorage.
 * 
 * @param {string} key - Storage key
 */
export function removeItem(key) {
  localStorage.removeItem(key)
}

/**
 * Clear all localStorage.
 */
export function clear() {
  localStorage.clear()
}
```



## Part 4: App Layer (Orchestration)

### State Management

```javascript
// js/app/state.js

/**
 * Simple observable state container.
 * 
 * @template T
 */
export class Store {
  /**
   * @param {T} initialState - Initial state
   */
  constructor(initialState) {
    this._state = initialState
    this._listeners = []
  }
  
  /**
   * Get current state (immutable).
   * 
   * @returns {T}
   */
  getState() {
    return { ...this._state }
  }
  
  /**
   * Update state and notify listeners.
   * 
   * @param {Partial<T>|((state: T) => Partial<T>)} updates
   */
  setState(updates) {
    const newState = typeof updates === 'function' 
      ? updates(this._state)
      : updates
    
    this._state = { ...this._state, ...newState }
    this._notify()
  }
  
  /**
   * Subscribe to state changes.
   * 
   * @param {(state: T) => void} listener - Callback on state change
   * @returns {() => void} Unsubscribe function
   */
  subscribe(listener) {
    this._listeners.push(listener)
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener)
    }
  }
  
  /**
   * Notify all listeners of state change.
   * @private
   */
  _notify() {
    this._listeners.forEach(listener => listener(this.getState()))
  }
}
```

Usage:
```javascript
// js/main.js
import { Store } from './app/state.js'

const store = new Store({
  user: null,
  cart: { items: [], total: 0 },
  loading: false
})

// Subscribe to changes
store.subscribe((state) => {
  console.log('State updated:', state)
  updateUI(state)
})

// Update state
store.setState({ loading: true })
store.setState((state) => ({
  cart: {
    ...state.cart,
    items: [...state.cart.items, newItem]
  }
}))
```

### Simple Router

```javascript
// js/app/router.js

/**
 * @typedef {Object} Route
 * @property {string} path - Route path pattern
 * @property {(params: Object) => void} handler - Route handler
 */

export class Router {
  constructor() {
    this.routes = []
    this.currentPath = window.location.pathname
    
    // Handle browser back/forward
    window.addEventListener('popstate', () => this.navigate(window.location.pathname))
  }
  
  /**
   * Register a route.
   * 
   * @param {string} path - Path pattern (e.g., '/users/:id')
   * @param {(params: Object) => void} handler - Route handler
   */
  on(path, handler) {
    this.routes.push({ path, handler })
  }
  
  /**
   * Navigate to path.
   * 
   * @param {string} path - Target path
   * @param {boolean} [pushState=true] - Add to history
   */
  navigate(path, pushState = true) {
    if (pushState) {
      window.history.pushState({}, '', path)
    }
    
    this.currentPath = path
    
    // Find matching route
    for (const route of this.routes) {
      const params = this._match(route.path, path)
      if (params) {
        route.handler(params)
        return
      }
    }
    
    // No match - 404
    this._handle404()
  }
  
  /**
   * Match path against pattern.
   * @private
   */
  _match(pattern, path) {
    const patternParts = pattern.split('/')
    const pathParts = path.split('/')
    
    if (patternParts.length !== pathParts.length) return null
    
    const params = {}
    
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        const paramName = patternParts[i].slice(1)
        params[paramName] = pathParts[i]
      } else if (patternParts[i] !== pathParts[i]) {
        return null
      }
    }
    
    return params
  }
  
  _handle404() {
    console.warn('404: Route not found')
  }
}
```



## Part 5: Best Practices

### 1. Event Delegation

```javascript
// ❌ Attach listener to each button
document.querySelectorAll('.delete-btn').forEach(btn => {
  btn.addEventListener('click', handleDelete)
})

// ✅ Single listener on parent
document.querySelector('.item-list').addEventListener('click', (e) => {
  if (e.target.matches('.delete-btn')) {
    handleDelete(e)
  }
})
```

### 2. Debounce & Throttle

```javascript
/**
 * Debounce function - delay execution until after calls stop.
 * 
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in ms
 * @returns {Function}
 */
export function debounce(fn, delay) {
  let timeoutId
  return function(...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), delay)
  }
}

/**
 * Throttle function - limit execution rate.
 * 
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Min time between calls in ms
 * @returns {Function}
 */
export function throttle(fn, limit) {
  let inThrottle
  return function(...args) {
    if (!inThrottle) {
      fn.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Usage
const searchInput = document.querySelector('#search')
searchInput.addEventListener('input', debounce((e) => {
  search(e.target.value)
}, 300))

const scrollHandler = throttle(() => {
  updateScrollPosition()
}, 100)
window.addEventListener('scroll', scrollHandler)
```

### 3. Error Boundaries

```javascript
/**
 * Wrap async function with error handling.
 * 
 * @param {Function} fn - Async function
 * @param {(error: Error) => void} [onError] - Error handler
 * @returns {Function}
 */
export function withErrorHandling(fn, onError) {
  return async function(...args) {
    try {
      return await fn.apply(this, args)
    } catch (error) {
      console.error('Error:', error)
      if (onError) onError(error)
      else showErrorModal(error.message)
    }
  }
}

// Usage
const loadUsers = withErrorHandling(async () => {
  const users = await api.get('/users')
  renderUsers(users)
}, (error) => {
  showNotification('Failed to load users', 'error')
})
```

### 4. Module Pattern for Encapsulation

```javascript
// js/ui/components/counter.js

/**
 * Counter component (encapsulated state).
 * 
 * @param {HTMLElement} container - Container element
 * @param {number} [initialValue=0] - Initial count
 * @returns {{ increment: Function, decrement: Function, getValue: Function }}
 */
export function createCounter(container, initialValue = 0) {
  // Private state
  let count = initialValue
  
  // Private methods
  const render = () => {
    container.innerHTML = `
      <button class="decrement">-</button>
      <span class="count">${count}</span>
      <button class="increment">+</button>
    `
  }
  
  // Public API
  const increment = () => {
    count++
    render()
  }
  
  const decrement = () => {
    count--
    render()
  }
  
  const getValue = () => count
  
  // Initial render
  render()
  
  // Event listeners
  container.addEventListener('click', (e) => {
    if (e.target.matches('.increment')) increment()
    if (e.target.matches('.decrement')) decrement()
  })
  
  return { increment, decrement, getValue }
}
```



## Part 6: VSCode Setup

### Recommended Extensions

1. **ESLint** - Linting and code quality
2. **Prettier** - Code formatting
3. **JavaScript (ES6) code snippets** - Quick boilerplate
4. **Path Intellisense** - Autocomplete imports
5. **Better Comments** - Color-coded comments

### VSCode Settings (`.vscode/settings.json`)

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "javascript.suggest.autoImports": true,
  "javascript.updateImportsOnFileMove.enabled": "always",
  "files.associations": {
    "*.js": "javascript"
  }
}
```

### JSDoc Type Checking

Enable type checking in VSCode:

```javascript
// Add to top of file
// @ts-check

/**
 * @param {string} name
 * @returns {string}
 */
function greet(name) {
  return name.toUpperCase()  // VSCode shows autocomplete for string methods
}

greet(123)  // VSCode shows error: Argument of type 'number' is not assignable to parameter of type 'string'
```



## Part 7: Testing Strategy

### Unit Testing Pure Functions

```javascript
// js/core/math.test.js (using Vitest or Jest)

import { clamp, range } from './math.js'

describe('clamp', () => {
  test('clamps value within range', () => {
    expect(clamp(5, { min: 0, max: 10 })).toBe(5)
    expect(clamp(-5, { min: 0, max: 10 })).toBe(0)
    expect(clamp(15, { min: 0, max: 10 })).toBe(10)
  })
})

describe('range', () => {
  test('generates array of numbers', () => {
    expect(range(0, 5)).toEqual([0, 1, 2, 3, 4])
    expect(range(0, 10, 2)).toEqual([0, 2, 4, 6, 8])
  })
})
```

### Integration Testing UI Components

```javascript
// js/ui/components/modal.test.js

import { createModal } from './modal.js'

describe('Modal', () => {
  test('creates modal with title and content', () => {
    const { element } = createModal({
      title: 'Test Modal',
      content: 'Hello World'
    })
    
    expect(element.querySelector('h2').textContent).toBe('Test Modal')
    expect(element.querySelector('.modal-body').textContent).toBe('Hello World')
  })
  
  test('closes on backdrop click', () => {
    const onClose = jest.fn()
    const { element, close } = createModal({
      title: 'Test',
      content: 'Test',
      onClose
    })
    
    element.click()  // Click backdrop
    expect(onClose).toHaveBeenCalled()
  })
})
```



## Critical Reminders

1. **Pure functions in core**: No DOM, no side effects, fully testable
2. **JSDoc everything**: Types without TypeScript overhead
3. **Module pattern**: Encapsulate state, expose minimal API
4. **Event delegation**: Better performance, simpler cleanup
5. **Debounce expensive operations**: Search, resize, scroll handlers
6. **Error boundaries**: Wrap async operations
7. **Immutable updates**: Don't mutate objects/arrays directly



<!-- ## Common Pitfalls -->
**Common Pitfalls**:
### 1. Global State Pollution

```javascript
// ❌ Bad - global state
let currentUser = null

// ✅ Good - encapsulated state
const userStore = new Store({ currentUser: null })
```

### 2. Memory Leaks

```javascript
// ❌ Bad - event listener not removed
element.addEventListener('click', handler)

// ✅ Good - cleanup function
const cleanup = on(element, 'click', handler)
// Later: cleanup()
```

### 3. Callback Hell

```javascript
// ❌ Bad - nested callbacks
fetchUser(id, (user) => {
  fetchPosts(user.id, (posts) => {
    fetchComments(posts[0].id, (comments) => {
      render(comments)
    })
  })
})

// ✅ Good - async/await
const user = await fetchUser(id)
const posts = await fetchPosts(user.id)
const comments = await fetchComments(posts[0].id)
render(comments)
```



## Resources

- **MDN Web Docs**: https://developer.mozilla.org/en-US/docs/Web/JavaScript
- **JavaScript.info**: https://javascript.info/
- **Clean Code JavaScript**: https://github.com/ryanmcdermott/clean-code-javascript
- **You Don't Know JS**: https://github.com/getify/You-Dont-Know-JS
