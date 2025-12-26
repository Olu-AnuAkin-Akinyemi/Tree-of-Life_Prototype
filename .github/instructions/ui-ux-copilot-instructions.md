---
applyTo: "client/**"
name: ui-ux-patterns
description: Comprehensive UX/UI patterns covering accessibility (WCAG, ARIA), responsive design, user flows, animation principles, form design, and educational app UX. Focuses on creating intuitive, inclusive interfaces that delight users.
---

# UI/UX Patterns

**Version**: 1.0  
**Focus**: Accessibility, user experience, and interface design  
**Purpose**: Build interfaces that work for everyone

---

## Philosophy: Design for Humans

Good UX is:
1. **Accessible**: Works for all abilities
2. **Intuitive**: Doesn't require explanation
3. **Forgiving**: Easy to recover from mistakes
4. **Delightful**: Pleasant to use

**Bad UX**:
- Requires instructions
- Frustrates users
- Excludes people with disabilities
- Feels janky or broken

**Good UX**:
- Guides users naturally
- Anticipates needs
- Works for everyone
- Feels polished

---

## Part 1: Accessibility Fundamentals (WCAG)

### The Four Principles: POUR

**1. Perceivable**
- All users can perceive the content
- Text alternatives for images
- Captions for video/audio
- Sufficient color contrast

**2. Operable**
- All users can operate the interface
- Keyboard accessible
- Enough time to interact
- No seizure-inducing content

**3. Understandable**
- All users can understand content and interface
- Readable text
- Predictable behavior
- Input assistance

**4. Robust**
- Works with assistive technologies
- Valid HTML
- Proper ARIA attributes
- Future-compatible

### WCAG Conformance Levels

- **Level A**: Minimum (must have)
- **Level AA**: Mid-range (target for most sites) ⭐
- **Level AAA**: Highest (gold standard)

**Aim for AA** - it's achievable and covers most users' needs.

---

## Part 2: Semantic HTML

### Use the Right Element

```html
<!-- ❌ Bad: Divs for everything -->
<div class="header">
  <div class="nav">
    <div onclick="navigate()">Home</div>
    <div onclick="navigate()">About</div>
  </div>
</div>
<div class="main">
  <div class="article">Content here</div>
</div>

<!-- ✅ Good: Semantic elements -->
<header>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
  </nav>
</header>
<main>
  <article>Content here</article>
</main>
```

### Common Semantic Elements

```html
<header>     <!-- Page/section header -->
<nav>        <!-- Navigation links -->
<main>       <!-- Main content (one per page) -->
<article>    <!-- Self-contained content -->
<section>    <!-- Thematic grouping -->
<aside>      <!-- Sidebar/tangential content -->
<footer>     <!-- Page/section footer -->
<figure>     <!-- Image with caption -->
<figcaption> <!-- Caption for figure -->
<time>       <!-- Dates and times -->
```

**Why it matters**: Screen readers announce these elements, helping users navigate.

---

## Part 3: Color Contrast

### WCAG Requirements

**Text contrast ratios**:
- **Normal text** (< 24px): 4.5:1 (AA), 7:1 (AAA)
- **Large text** (≥ 24px or ≥ 19px bold): 3:1 (AA), 4.5:1 (AAA)
- **UI components**: 3:1 (AA)

### Checking Contrast

```css
/* ❌ Bad: Low contrast */
.text {
  color: #888;           /* Gray */
  background: #FFF;      /* White */
  /* Ratio: 2.8:1 - Fails AA */
}

/* ✅ Good: High contrast */
.text {
  color: #333;           /* Dark gray */
  background: #FFF;      /* White */
  /* Ratio: 12.6:1 - Passes AAA */
}
```

**Tools**:
- Chrome DevTools: Inspect element → Accessibility panel
- Online: https://webaim.org/resources/contrastchecker/
- Figma plugin: Stark

### Color-Blind Friendly Design

**Don't rely on color alone**:

```html
<!-- ❌ Bad: Color only -->
<span style="color: red;">Error</span>
<span style="color: green;">Success</span>

<!-- ✅ Good: Color + icon + text -->
<span class="error">
  <svg>❌</svg>
  Error: Invalid email
</span>
<span class="success">
  <svg>✅</svg>
  Success!
</span>
```

---

## Part 4: Keyboard Accessibility

### Tab Order

All interactive elements must be keyboard accessible:
- Links (`<a>`)
- Buttons (`<button>`)
- Form inputs
- Custom controls (with `tabindex`)

```html
<!-- ❌ Bad: Div with onClick -->
<div onclick="handleClick()">Click me</div>
<!-- Not keyboard accessible! -->

<!-- ✅ Good: Button -->
<button onclick="handleClick()">Click me</button>
<!-- Focusable with Tab, activated with Enter/Space -->
```

### Tab Index Rules

```html
<!-- tabindex="0": In natural tab order -->
<div tabindex="0" role="button">Custom button</div>

<!-- tabindex="-1": Programmatically focusable only -->
<div tabindex="-1">Focus with JS only</div>

<!-- ❌ tabindex="1+": Avoid! Breaks natural order -->
<button tabindex="5">Don't do this</button>
```

**Best practice**: Use `tabindex="0"` only for custom interactive elements. Native elements already have proper tab order.

### Focus Indicators

```css
/* ❌ Bad: Removing outline */
button:focus {
  outline: none; /* Never do this without replacement! */
}

/* ✅ Good: Custom focus style */
*:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
}

/* Skip link for keyboard users */
.skip-link {
  position: absolute;
  top: -100px;
  left: 0;
  padding: 1rem;
  background: var(--color-primary);
  color: white;
  text-decoration: none;
}

.skip-link:focus {
  top: 0;
}
```

### Focus Trapping in Modals

```javascript
/**
 * Trap focus within modal for keyboard users.
 * @param {HTMLElement} element
 */
function trapFocus(element) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  
  const firstFocusable = focusableElements[0]
  const lastFocusable = focusableElements[focusableElements.length - 1]
  
  element.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return
    
    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        e.preventDefault()
        lastFocusable.focus()
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        e.preventDefault()
        firstFocusable.focus()
      }
    }
  })
  
  // Focus first element
  firstFocusable.focus()
}
```

---

## Part 5: ARIA (Accessible Rich Internet Applications)

### When to Use ARIA

**First rule of ARIA**: Don't use ARIA if you can use native HTML.

```html
<!-- ❌ Bad: ARIA on div -->
<div role="button" tabindex="0">Click me</div>

<!-- ✅ Good: Native button -->
<button>Click me</button>
```

**Use ARIA when**:
- Building custom components
- Adding dynamic states
- Providing extra context

### Common ARIA Attributes

```html
<!-- Role: Defines element type -->
<div role="alert">Error message</div>
<div role="navigation">...</div>

<!-- States: Current state -->
<button aria-pressed="true">Bold</button>
<div aria-expanded="false">Collapsed menu</div>
<input aria-invalid="true" />

<!-- Properties: Characteristics -->
<button aria-label="Close dialog">✕</button>
<img aria-hidden="true" /> <!-- Decorative image -->
<div aria-live="polite">Updated content</div>
```

### Live Regions

Announce dynamic content to screen readers:

```html
<!-- Polite: Waits for user to finish -->
<div aria-live="polite">
  <p>3 new messages</p>
</div>

<!-- Assertive: Interrupts immediately (use sparingly!) -->
<div aria-live="assertive" role="alert">
  <p>Error: Connection lost!</p>
</div>
```

### Form Labels

```html
<!-- ❌ Bad: No label association -->
<label>Email</label>
<input type="email" />

<!-- ✅ Good: Explicit association -->
<label for="email">Email</label>
<input type="email" id="email" />

<!-- ✅ Also good: Implicit association -->
<label>
  Email
  <input type="email" />
</label>

<!-- ✅ ARIA when label isn't visible -->
<input 
  type="search" 
  aria-label="Search products"
  placeholder="Search..."
/>
```

---

## Part 6: Images & Alt Text

### Writing Good Alt Text

**Rules**:
1. Describe the content/function, not "image of"
2. Keep it concise (< 125 characters)
3. Don't repeat surrounding text
4. Use `alt=""` for decorative images

```html
<!-- ❌ Bad: Redundant -->
<img src="dog.jpg" alt="Image of a dog" />

<!-- ✅ Good: Descriptive -->
<img src="dog.jpg" alt="Golden retriever playing fetch in park" />

<!-- ✅ Decorative: Empty alt -->
<img src="decorative-line.svg" alt="" />

<!-- ✅ Functional: Describe action -->
<button>
  <img src="print.svg" alt="Print page" />
</button>
```

### Complex Images

```html
<!-- Chart/graph: Provide text alternative -->
<figure>
  <img src="sales-chart.png" alt="Sales increased 25% from Q1 to Q2" />
  <figcaption>
    Detailed breakdown: Q1 $100k, Q2 $125k...
  </figcaption>
</figure>

<!-- Or use aria-describedby -->
<img 
  src="chart.png" 
  alt="Sales chart"
  aria-describedby="chart-details"
/>
<div id="chart-details">
  Sales increased from $100k in Q1 to $125k in Q2...
</div>
```

---

## Part 7: Responsive Design

### Mobile-First Approach

Start with mobile, enhance for larger screens:

```css
/* ✅ Mobile first */
.container {
  padding: 1rem;
  font-size: 16px;
}

/* Tablet */
@media (min-width: 768px) {
  .container {
    padding: 2rem;
    font-size: 18px;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    padding: 3rem;
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

### Touch Targets

**Minimum size**: 44×44 pixels (Apple) or 48×48 pixels (Android)

```css
/* ❌ Bad: Too small for touch */
button {
  padding: 4px 8px;
  font-size: 12px;
}

/* ✅ Good: Comfortable touch target */
button {
  padding: 12px 24px;
  font-size: 16px;
  min-height: 44px;
  min-width: 44px;
}
```

### Responsive Typography

```css
/* Fluid typography */
:root {
  /* Scales from 16px at 320px to 20px at 1200px */
  font-size: clamp(16px, 1rem + 0.5vw, 20px);
}

h1 {
  /* 32px to 48px */
  font-size: clamp(2rem, 1.5rem + 2vw, 3rem);
}
```

---

## Part 8: Form Design

### Clear Labels & Instructions

```html
<!-- ✅ Good: Clear label, helpful hint -->
<div class="form-field">
  <label for="password">
    Password
    <span class="required" aria-label="required">*</span>
  </label>
  <input 
    type="password" 
    id="password"
    aria-describedby="password-hint"
    required
  />
  <p id="password-hint" class="hint">
    Must be at least 8 characters
  </p>
</div>
```

### Error Messages

```html
<!-- ✅ Good: Associated, specific, actionable -->
<div class="form-field">
  <label for="email">Email</label>
  <input 
    type="email" 
    id="email"
    aria-invalid="true"
    aria-describedby="email-error"
  />
  <p id="email-error" class="error" role="alert">
    Please enter a valid email address (example: name@example.com)
  </p>
</div>
```

### Grouped Fields

```html
<!-- Radio buttons -->
<fieldset>
  <legend>Choose your plan</legend>
  <label>
    <input type="radio" name="plan" value="free" />
    Free
  </label>
  <label>
    <input type="radio" name="plan" value="pro" />
    Pro
  </label>
</fieldset>
```

---

## Part 9: Loading & Feedback

### Loading States

```html
<!-- Skeleton loading (better than spinners) -->
<div class="skeleton">
  <div class="skeleton-text"></div>
  <div class="skeleton-text short"></div>
</div>

<style>
.skeleton-text {
  height: 1rem;
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
```

### Progress Indicators

```html
<!-- ✅ Good: Accessible progress bar -->
<div 
  role="progressbar"
  aria-valuenow="75"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Upload progress"
>
  <div class="progress-bar" style="width: 75%"></div>
</div>
<p>75% complete</p>
```

### Success/Error Feedback

```html
<!-- Toast notification -->
<div role="alert" aria-live="polite" class="toast success">
  <svg aria-hidden="true">✓</svg>
  Settings saved successfully!
  <button aria-label="Dismiss">×</button>
</div>
```

---

## Part 10: Animation & Motion

### Respect User Preferences

```css
/* Always check prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Subtle, purposeful animations */
@media (prefers-reduced-motion: no-preference) {
  .card {
    transition: transform 0.2s ease-out;
  }
  
  .card:hover {
    transform: translateY(-4px);
  }
}
```

### Animation Principles

**Good animations**:
- **Fast**: < 300ms for most interactions
- **Purposeful**: Guide attention, provide feedback
- **Subtle**: Don't distract from content

```css
/* ✅ Good: Subtle, fast, purposeful */
button {
  transition: background-color 0.15s ease-out;
}

button:hover {
  background-color: var(--color-primary-dark);
}

/* ❌ Bad: Slow, distracting */
button {
  transition: all 1s;
  animation: spin 2s infinite;
}
```

---

## Part 11: Educational App UX

### Learning-Focused Design Patterns

#### 1. **Progress Visualization**

```html
<!-- Show progress clearly -->
<div class="lesson-progress">
  <div class="progress-bar" style="width: 60%"></div>
  <p>6 of 10 questions complete</p>
</div>
```

#### 2. **Immediate Feedback**

```javascript
/**
 * Provide instant feedback on answer selection.
 */
function handleAnswer(isCorrect) {
  if (isCorrect) {
    showFeedback('Correct! Great job!', 'success')
    // Brief delay before next question
    setTimeout(nextQuestion, 1500)
  } else {
    showFeedback('Not quite. Try again!', 'error')
    // Allow retry
  }
}
```

#### 3. **Scaffolded Difficulty**

```javascript
/**
 * Adaptive difficulty based on performance.
 */
function selectNextQuestion(correctCount, totalCount) {
  const accuracy = correctCount / totalCount
  
  if (accuracy > 0.8) {
    return getHardQuestion()
  } else if (accuracy > 0.5) {
    return getMediumQuestion()
  } else {
    return getEasyQuestion()
  }
}
```

#### 4. **Hint System**

```html
<!-- Progressive hints -->
<div class="question">
  <p>What is 7 × 8?</p>
  
  <button onclick="showHint(1)">Hint 1</button>
  <button onclick="showHint(2)">Hint 2</button>
  <button onclick="showAnswer()">Show Answer</button>
</div>

<script>
const hints = {
  1: "Think about 7 × 7 first, then add 7",
  2: "7 × 7 = 49, and 49 + 7 = ?"
}
</script>
```

#### 5. **Achievement System**

```html
<!-- Celebrate milestones -->
<div class="achievement unlocked">
  <svg>🏆</svg>
  <h3>Perfect Score!</h3>
  <p>You got all 10 questions right!</p>
</div>
```

### Learner-Centered Principles

1. **Clear goals**: Tell learners what they'll achieve
2. **Frequent feedback**: Don't make them wait
3. **Low-stakes**: Make it safe to fail
4. **Celebrate success**: Positive reinforcement
5. **Pacing control**: Let learners set their own speed
6. **Multiple modalities**: Text, images, audio

---

## Part 12: Modals & Dialogs

### Accessible Modal

```html
<!-- Modal -->
<div 
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  class="modal"
>
  <div class="modal-content">
    <h2 id="dialog-title">Confirm deletion</h2>
    <p>Are you sure you want to delete this item?</p>
    <div class="modal-actions">
      <button onclick="closeModal()">Cancel</button>
      <button onclick="confirmDelete()">Delete</button>
    </div>
  </div>
</div>

<script>
function openModal() {
  const modal = document.querySelector('.modal')
  modal.style.display = 'block'
  
  // Trap focus
  trapFocus(modal)
  
  // Prevent background scroll
  document.body.style.overflow = 'hidden'
  
  // Close on Escape
  document.addEventListener('keydown', handleEscape)
}

function closeModal() {
  const modal = document.querySelector('.modal')
  modal.style.display = 'none'
  document.body.style.overflow = ''
  document.removeEventListener('keydown', handleEscape)
}

function handleEscape(e) {
  if (e.key === 'Escape') closeModal()
}
</script>
```

---

## Part 13: Typography

### Readability Best Practices

```css
/* ✅ Good: Readable typography */
body {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 16px;          /* Never smaller */
  line-height: 1.6;         /* 1.5-1.8 for body text */
  color: #333;
  background: #fff;
}

p {
  max-width: 65ch;          /* 45-75 characters per line */
  margin-bottom: 1em;
}

h1, h2, h3 {
  line-height: 1.2;         /* Tighter for headings */
  font-weight: 700;
}
```

### Hierarchy

```css
/* Clear visual hierarchy */
h1 {
  font-size: 2.5rem;        /* 40px */
  margin-bottom: 1rem;
}

h2 {
  font-size: 2rem;          /* 32px */
  margin-top: 2rem;
  margin-bottom: 0.75rem;
}

p {
  font-size: 1rem;          /* 16px */
}

small {
  font-size: 0.875rem;      /* 14px */
}
```

---

## Part 14: Testing Accessibility

### Automated Testing Tools

```bash
# Install axe-core for automated testing
npm install @axe-core/cli

# Run accessibility audit
npx axe https://your-site.com
```

### Manual Testing Checklist

**Keyboard navigation**:
- [ ] Tab through entire page
- [ ] All interactive elements reachable
- [ ] Focus indicators visible
- [ ] Modal focus trapped
- [ ] Skip link works

**Screen reader**:
- [ ] Landmarks announced correctly
- [ ] Images have alt text
- [ ] Form labels associated
- [ ] Headings in logical order
- [ ] ARIA live regions work

**Visual**:
- [ ] Zoom to 200% - still usable
- [ ] Color contrast passes AA
- [ ] Doesn't rely on color alone
- [ ] Text is resizable
- [ ] No horizontal scroll at 320px

**Tools to use**:
- **Chrome DevTools**: Lighthouse, Accessibility panel
- **WAVE**: https://wave.webaim.org/
- **axe DevTools**: Browser extension
- **Screen readers**: NVDA (Windows), VoiceOver (Mac)

---

## Critical UX Checklist

### Before Launch
- [ ] All interactive elements keyboard accessible
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] All images have alt text
- [ ] Forms have proper labels
- [ ] Error messages are clear and helpful
- [ ] Loading states provide feedback
- [ ] Mobile touch targets are 44px+
- [ ] Tested with screen reader
- [ ] Works at 200% zoom
- [ ] Respects prefers-reduced-motion

### Educational App Specific
- [ ] Clear learning progression
- [ ] Immediate feedback on answers
- [ ] Progress is visible and saved
- [ ] Hints available when stuck
- [ ] Achievements feel rewarding
- [ ] Content is age-appropriate
- [ ] Reading level matches audience
- [ ] Pace is learner-controlled

---

## Resources

- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **MDN Accessibility**: https://developer.mozilla.org/en-US/docs/Web/Accessibility
- **A11y Project**: https://www.a11yproject.com/
- **WebAIM**: https://webaim.org/
- **Inclusive Components**: https://inclusive-components.design/

---

## Summary

**Accessibility is not optional**: It's a legal requirement and moral imperative.

**Start with semantic HTML**: Use the right elements.

**Keyboard first**: All interactions must work without a mouse.

**ARIA is a last resort**: Use native HTML when possible.

**Test with real users**: Automated tools catch ~30% of issues.

**Design for learning**: Educational apps need special UX care.
