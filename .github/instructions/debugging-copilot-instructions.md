---
applyTo: "**/"
name: debugging-assistant
description: Systematic debugging methodology, root cause analysis, performance profiling, and troubleshooting strategies for JavaScript and web applications. Covers VSCode debugging tools, console techniques, and professional debugging workflows.
---

# Debugging Assistant

**Version**: 1.0  
**Focus**: Systematic debugging and troubleshooting  
**Purpose**: Find and fix bugs efficiently using proven methodologies

---

## Philosophy: The Scientific Method of Debugging

Debugging is not guesswork—it's systematic investigation:

1. **Observe** the symptom
2. **Hypothesize** the cause
3. **Test** the hypothesis
4. **Analyze** the results
5. **Repeat** until root cause found

**Bad debugging**: Random code changes hoping something works  
**Good debugging**: Methodical narrowing of possibilities

---

## Part 1: The Debugging Mindset

### Rules of Effective Debugging

1. **Reproduce first**: Can't fix what you can't reproduce
2. **Change one thing at a time**: Multiple changes = unknown which fixed it
3. **Understand before fixing**: Band-aids hide root causes
4. **Read error messages completely**: The answer is usually there
5. **Question assumptions**: "It can't be X" usually means it's X
6. **Take breaks**: Fresh eyes see what tired eyes miss

### Common Anti-Patterns

❌ **Random code changes**: "Let me try this..."  
✅ **Hypothesis-driven changes**: "If X is the problem, then changing Y should..."

❌ **Ignoring errors**: "It mostly works..."  
✅ **Fix all errors**: Errors compound and hide root causes

❌ **Copy-paste solutions**: From Stack Overflow without understanding  
✅ **Understand solutions**: Know why it works

---

## Part 2: VSCode Debugging Tools

### Setup Launch Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}",
      "sourceMapPathOverrides": {
        "webpack:///./~/*": "${webspaceFolder}/node_modules/*"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Node",
      "program": "${workspaceFolder}/index.js",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### Breakpoints

**Basic breakpoint**: Click line number gutter

**Conditional breakpoint**: Right-click → Add Conditional Breakpoint
```javascript
// Break only when userId === 123
userId === 123

// Break after 5 iterations
i > 5
```

**Logpoint**: Right-click → Add Logpoint
```javascript
// Log without stopping execution
User: {username}, ID: {userId}
```

### Watch Expressions

Add variables to Watch panel:
```javascript
// Watch complex expressions
users.filter(u => u.active).length
cart.items.reduce((sum, item) => sum + item.price, 0)
```

### Call Stack Navigation

When paused at breakpoint:
1. **Call Stack** panel shows function call chain
2. Click frames to see variables at each level
3. Trace backwards to find where bad data originated

---

## Part 3: Console Debugging Techniques

### Beyond console.log

```javascript
// ❌ Basic (hard to distinguish)
console.log(user)
console.log(cart)

// ✅ Labeled (easy to identify)
console.log('User:', user)
console.log('Cart:', cart)

// ✅ Object shorthand (shows variable names)
console.log({ user, cart, total })

// ✅ Table (for arrays of objects)
console.table(users)

// ✅ Group (organize related logs)
console.group('User Login')
console.log('Username:', username)
console.log('Timestamp:', new Date())
console.groupEnd()

// ✅ Time (measure performance)
console.time('API Call')
await fetchUsers()
console.timeEnd('API Call')

// ✅ Trace (show call stack)
console.trace('How did we get here?')

// ✅ Assert (log only if condition fails)
console.assert(users.length > 0, 'No users found!')
```

### Conditional Logging

```javascript
const DEBUG = true

function debug(...args) {
  if (DEBUG) {
    console.log('[DEBUG]', ...args)
  }
}

// Usage
debug('Processing user:', user.id)
```

### Debugger Statement

```javascript
function processData(data) {
  // Programmatic breakpoint
  debugger
  
  // Execution pauses here when DevTools open
  return data.map(item => item * 2)
}
```

---

## Part 4: Common Bug Categories

### 1. Type Errors

**Symptom**: `Cannot read property 'X' of undefined`

**Common causes**:
```javascript
// Accessing property of undefined/null
const name = user.profile.name // user or profile is undefined

// Array method on non-array
const ids = data.map(item => item.id) // data is not an array

// Function called on wrong type
const result = fn() // fn is not a function
```

**Debugging strategy**:
```javascript
// Add null checks
console.log('user:', user)
console.log('user.profile:', user?.profile)
console.log('user.profile.name:', user?.profile?.name)

// Validate types
console.assert(Array.isArray(data), 'data should be array', data)
console.assert(typeof fn === 'function', 'fn should be function')
```

### 2. Async Timing Issues

**Symptom**: Data is undefined when it should exist

**Common causes**:
```javascript
// Using data before promise resolves
const users = fetchUsers() // Promise, not data!
console.log(users[0]) // undefined

// Race conditions
let count = 0
async function increment() {
  const current = count
  await delay(100)
  count = current + 1 // Overwrites concurrent updates
}
```

**Debugging strategy**:
```javascript
// Log promise states
console.log('Before fetch')
const users = await fetchUsers()
console.log('After fetch:', users)

// Add delays to expose race conditions
await new Promise(resolve => setTimeout(resolve, 1000))

// Use async/await instead of callbacks
// ❌ Callback hell
fetchUsers((users) => {
  fetchPosts(users[0].id, (posts) => {
    // ...
  })
})

// ✅ Async/await
const users = await fetchUsers()
const posts = await fetchPosts(users[0].id)
```

### 3. State Management Issues

**Symptom**: UI doesn't update when data changes

**Common causes**:
```javascript
// Mutating state directly (React/Vue won't detect)
state.users.push(newUser) // Mutation!

// Stale closures
useEffect(() => {
  setInterval(() => {
    console.log(count) // Always logs initial value
  }, 1000)
}, []) // Missing dependency
```

**Debugging strategy**:
```javascript
// Log before/after state changes
console.log('Before:', state.users)
setState({ users: [...state.users, newUser] })
console.log('After:', state.users)

// Check dependencies
useEffect(() => {
  console.log('Effect running, count:', count)
}, [count]) // Include all dependencies
```

### 4. Scope & Closure Issues

**Symptom**: Variable has unexpected value

**Common causes**:
```javascript
// Loop variable closure
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100) // Logs 3, 3, 3
}

// Stale reference
let value = 5
function getValue() {
  return value // Returns value at time of call, not definition
}
value = 10
getValue() // Returns 10, not 5
```

**Debugging strategy**:
```javascript
// Use let/const instead of var
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100) // Logs 0, 1, 2
}

// Log captured values
function createGetter(capturedValue) {
  console.log('Capturing:', capturedValue)
  return () => {
    console.log('Returning:', capturedValue)
    return capturedValue
  }
}
```

---

## Part 5: Performance Debugging

### Identify Performance Bottlenecks

**Chrome DevTools Performance Tab**:

1. Open DevTools → Performance
2. Click Record
3. Perform slow action
4. Stop recording
5. Analyze flame chart

**Look for**:
- Long tasks (yellow bars)
- Layout thrashing (purple bars)
- Long JavaScript execution (orange bars)

### Measure Execution Time

```javascript
/**
 * Measure function execution time.
 */
function measurePerformance(fn, label) {
  const start = performance.now()
  const result = fn()
  const end = performance.now()
  console.log(`${label}: ${(end - start).toFixed(2)}ms`)
  return result
}

// Usage
const result = measurePerformance(
  () => heavyComputation(data),
  'Heavy Computation'
)
```

### Profile Memory Leaks

**Chrome DevTools Memory Tab**:

1. Take heap snapshot
2. Perform action (add/remove items)
3. Take another snapshot
4. Compare snapshots
5. Look for objects not garbage collected

**Common memory leaks**:
```javascript
// ❌ Event listeners not removed
element.addEventListener('click', handler)
// Element removed but listener still references it

// ✅ Remove listeners
element.removeEventListener('click', handler)

// ❌ Timers not cleared
const intervalId = setInterval(update, 1000)
// Component unmounts but interval keeps running

// ✅ Clear timers
clearInterval(intervalId)

// ❌ Circular references
const obj1 = {}
const obj2 = { ref: obj1 }
obj1.ref = obj2 // Circular!
```

---

## Part 6: Network Debugging

### Inspect Network Requests

**Chrome DevTools Network Tab**:

1. Open DevTools → Network
2. Reload page
3. Click request to see details:
   - Headers (request/response)
   - Payload (request body)
   - Response (response body)
   - Timing (waterfall)

### Debug CORS Issues

**Symptom**: `Access to fetch at 'X' from origin 'Y' has been blocked by CORS`

**Solution**:
```javascript
// Server must set headers
res.setHeader('Access-Control-Allow-Origin', '*')
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
```

### Debug API Errors

```javascript
/**
 * Enhanced fetch with detailed error logging.
 */
async function debugFetch(url, options = {}) {
  console.group(`API Request: ${options.method || 'GET'} ${url}`)
  console.log('Options:', options)
  
  try {
    const response = await fetch(url, options)
    
    console.log('Status:', response.status)
    console.log('Headers:', Object.fromEntries(response.headers))
    
    if (!response.ok) {
      const errorBody = await response.text()
      console.error('Error body:', errorBody)
      throw new Error(`HTTP ${response.status}: ${errorBody}`)
    }
    
    const data = await response.json()
    console.log('Response:', data)
    console.groupEnd()
    
    return data
  } catch (error) {
    console.error('Fetch failed:', error)
    console.groupEnd()
    throw error
  }
}
```

---

## Part 7: Debugging Strategies

### Binary Search Debugging

When bug is in large codebase:

1. Comment out half the code
2. If bug persists → problem is in remaining half
3. If bug disappears → problem is in commented half
4. Repeat until isolated

```javascript
// Original (bug somewhere here)
function processData(data) {
  const step1 = transform(data)
  const step2 = filter(step1)
  const step3 = validate(step2)
  const step4 = format(step3)
  return step4
}

// Binary search
function processData(data) {
  const step1 = transform(data)
  console.log('After step1:', step1) // Check intermediate state
  const step2 = filter(step1)
  console.log('After step2:', step2)
  // Continue narrowing...
}
```

### Rubber Duck Debugging

Explain code line-by-line to rubber duck (or colleague):

1. "This function takes a user object..."
2. "It checks if user.email exists..." ← Wait, what if it doesn't?
3. "Oh! Missing null check!"

Often the act of explaining reveals the bug.

### Git Bisect

Find commit that introduced bug:

```bash
# Start bisect
git bisect start

# Mark current commit as bad
git bisect bad

# Mark known good commit
git bisect good abc123

# Git checks out middle commit
# Test if bug exists, then:
git bisect bad  # or git bisect good

# Repeat until git identifies buggy commit
```

---

## Part 8: Debugging Checklist

### Before Asking for Help

- [ ] Read error message completely
- [ ] Search error message online
- [ ] Check console for errors
- [ ] Verify inputs are correct type/format
- [ ] Add console.logs around problem area
- [ ] Try debugger breakpoints
- [ ] Check network tab for API errors
- [ ] Clear browser cache
- [ ] Test in incognito mode
- [ ] Check if problem exists in production
- [ ] Review recent code changes
- [ ] Try reverting recent changes

### Asking Effective Questions

**Bad question**:
> "My code doesn't work, help!"

**Good question**:
> "I'm getting `TypeError: Cannot read property 'name' of undefined` on line 42 of user.js. I've verified that `fetchUser()` returns data in the network tab, and added a console.log right before the error which shows `user` is undefined. The error only happens when clicking the 'Edit Profile' button, not on initial load. Here's the relevant code: [paste code]"

**Include**:
1. Exact error message
2. Steps to reproduce
3. What you've already tried
4. Relevant code (minimal example)
5. Expected vs actual behavior

---

## Part 9: Preventive Debugging

### Defensive Programming

```javascript
// ❌ Assumes data is always valid
function processUser(user) {
  return user.profile.name.toUpperCase()
}

// ✅ Validates data
function processUser(user) {
  if (!user) {
    throw new Error('User is required')
  }
  if (!user.profile) {
    throw new Error('User profile is missing')
  }
  if (typeof user.profile.name !== 'string') {
    throw new Error('User name must be a string')
  }
  return user.profile.name.toUpperCase()
}

// ✅✅ Optional chaining + default
function processUser(user) {
  return user?.profile?.name?.toUpperCase() ?? 'Unknown'
}
```

### Type Checking with JSDoc

```javascript
/**
 * @param {Object} user
 * @param {string} user.email
 * @param {Object} user.profile
 * @param {string} user.profile.name
 */
function processUser(user) {
  // VSCode shows error if types don't match
  return user.profile.name.toUpperCase()
}

// TypeScript alternative
interface User {
  email: string
  profile: {
    name: string
  }
}

function processUser(user: User) {
  return user.profile.name.toUpperCase()
}
```

### Assertions

```javascript
/**
 * Assert condition is true, throw error if not.
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

// Usage
function divide(a, b) {
  assert(typeof a === 'number', 'a must be number')
  assert(typeof b === 'number', 'b must be number')
  assert(b !== 0, 'Cannot divide by zero')
  return a / b
}
```

---

## Part 10: Tools & Extensions

### VSCode Extensions

1. **Error Lens** - Inline error messages
2. **JavaScript Debugger** - Built-in debugger
3. **Console Ninja** - Enhanced console logs in editor
4. **Quokka.js** - Live JavaScript playground
5. **REST Client** - Test APIs from VSCode

### Browser DevTools Extensions

1. **React DevTools** - Debug React components
2. **Vue DevTools** - Debug Vue components
3. **Redux DevTools** - Debug Redux state
4. **Apollo DevTools** - Debug GraphQL queries

### Command Line Tools

```bash
# Node.js debugger
node --inspect index.js
# Then open chrome://inspect

# Trace system calls (Linux)
strace node index.js

# Memory profiling
node --inspect --expose-gc index.js
```

---

## Critical Reminders

1. **Reproduce first** - Can't fix what you can't see
2. **Read errors completely** - The answer is usually there
3. **Change one thing at a time** - Know what fixed it
4. **Use breakpoints** - More effective than console.log
5. **Check assumptions** - "It can't be X" usually means it's X
6. **Take breaks** - Fresh perspective reveals bugs
7. **Document fixes** - Learn from mistakes

---

## Resources

- **Chrome DevTools**: https://developer.chrome.com/docs/devtools/
- **VSCode Debugging**: https://code.visualstudio.com/docs/editor/debugging
- **JavaScript Debugging**: https://javascript.info/debugging-chrome
- **Performance Profiling**: https://web.dev/articles/rendering-performance
